/* Eigene Artikel: Markdown -> Artikel-Struktur der Solarpedia (läuft in der App und im MCP-Server). */
(function (root) {
  'use strict';
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').trim();
  const slug = s => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
  const strip = h => h.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const ROOT_ID = 'eigene-artikel';

  // Namensverzeichnis für [[Titel]] und automatische Verlinkung
  function makeResolver(articles) {
    const byId = new Map(articles.map(a => [a.id, a]));
    const byName = new Map();
    const add = (name, a, anchor) => { const k = fold(name); if (k.length >= 3 && !byName.has(k)) byName.set(k, { id: a.id, anchor: anchor || '' }); };
    for (const a of articles) {
      add(a.title, a); add(a.title.replace(/\s*\([^)]*\)/g, ''), a);
      for (const t of a.toc || []) if (t.level >= 3 && !/^§/.test(t.text)) add(t.text.replace(/\s*\([^)]*\)/g, ''), a, t.id);
    }
    const resolve = ref => {
      const [r, anchor] = ref.split('#');
      if (byId.has(r.trim())) return { id: r.trim(), anchor: anchor || '' };
      const hit = byName.get(fold(r));
      return hit ? { id: hit.id, anchor: anchor || hit.anchor } : null;
    };
    const titles = articles.filter(a => a.kind !== 'part' && a.title.length >= 5 && !/^\d/.test(a.title) && !/:/.test(a.title))
      .map(a => ({ re: a.title.replace(/\s*\([^)]*\)/g, ''), id: a.id })).filter(t => t.re.length >= 5)
      .sort((x, y) => y.re.length - x.re.length);
    let autoRe = null;
    if (titles.length) autoRe = new RegExp('(?<![\\p{L}\\p{N}-])(' + titles.map(t => t.re.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
    const idByTitle = new Map(titles.map(t => [t.re, t.id]));
    return { resolve, autoRe, idByTitle, byId };
  }

  function parse(id, md, R) {
    const lines = md.replace(/\r/g, '').split('\n');
    let title = id, category = '', i = 0;
    while (i < lines.length && !lines[i].trim()) i++;
    if (/^#\s+/.test(lines[i] || '')) { title = lines[i].replace(/^#\s+/, '').trim(); i++; }
    const broken = [], links = new Set();
    let used = new Set();
    const inline = (src, selfId) => {
      let h = esc(src);
      h = h.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, ref, text) => {
        const r = R.resolve(ref);
        if (!r) { broken.push(ref.trim()); return `<span class="redlink" title="Artikel existiert (noch) nicht">${text || ref}</span>`; }
        links.add(r.id);
        return `<a class="wl" href="#/a/${r.id}${r.anchor ? '/' + r.anchor : ''}">${text || (R.byId.get(r.id) ? ref.replace(/#.*$/, '') : ref)}</a>`;
      });
      h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
      // automatische Verlinkung bekannter Artikeltitel (erstes Vorkommen je Abschnitt)
      if (R.autoRe) h = h.split(/(<a [^>]*>.*?<\/a>|<span[^>]*>.*?<\/span>|<[^>]+>)/).map(seg => seg.startsWith('<') ? seg : seg.replace(R.autoRe, (m, t) => {
        const tid = R.idByTitle.get(t); if (!tid || tid === selfId || used.has(tid)) return m;
        used.add(tid); links.add(tid); return `<a class="wl" href="#/a/${tid}">${m}</a>`;
      })).join('');
      return h;
    };
    const blocks = [];
    let para = [];
    const flush = () => { if (para.length) { blocks.push({ t: 'p', html: inline(para.join(' '), id) }); para = []; } };
    for (; i < lines.length; i++) {
      const ln = lines[i], t = ln.trim();
      let m;
      if (!t) { flush(); continue; }
      if (/^Kategorie:\s*/i.test(t) && !blocks.length && !para.length) { category = t.replace(/^Kategorie:\s*/i, ''); continue; }
      if ((m = t.match(/^(#{2,3})\s+(.*)$/))) { flush(); used = new Set(); blocks.push({ t: 'h', level: m[1].length + 1, text: m[2].trim() }); continue; }
      if (/^[-*•]\s+/.test(t)) {
        flush(); const items = [];
        while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) { items.push(inline(lines[i].replace(/^\s*[-*•]\s+/, ''), id)); i++; }
        i--; blocks.push({ t: 'ul', items }); continue;
      }
      if (t.startsWith('|')) {
        flush(); const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())); i++; }
        i--;
        const sep = rows.length > 1 && rows[1].every(c => /^:?-{2,}:?$/.test(c));
        const head = (sep ? rows[0] : rows[0].map(() => '')).map(c => inline(c, id));
        const body = rows.slice(sep ? 2 : 0).map(r => r.map(c => inline(c, id)));
        blocks.push({ t: 'table', head, rows: body.map(r => r.map((c, k) => (k === 0 && c && !/^<b>/.test(c) ? `<b>${c}</b>` : c))) }); continue;
      }
      if (/^>\s?/.test(t)) {
        flush(); const q = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        i--; blocks.push({ t: 'callout', kind: 'HINWEIS', color: '#0f766e', html: inline(q.join(' '), id) }); continue;
      }
      para.push(t);
    }
    flush();
    const seen = new Set(), toc = [], search = [];
    for (const b of blocks) {
      if (b.t === 'h') { let hid = slug(b.text); while (seen.has(hid)) hid += '-2'; seen.add(hid); b.id = hid; toc.push({ id: hid, level: b.level, text: b.text }); search.push({ h: hid, text: b.text }); }
      else if (b.t === 'p') search.push({ text: strip(b.html) });
      else if (b.t === 'ul') search.push({ text: b.items.map(strip).join(' • ') });
      else if (b.t === 'table') search.push({ text: [b.head.map(strip).join(' | '), ...b.rows.map(r => r.map(strip).join(' | '))].join(' \n ') });
      else if (b.t === 'callout') search.push({ text: strip(b.html) });
    }
    return { broken: [...new Set(broken)], links: [...links], article: { id, title, kind: 'article', doc: ROOT_ID, docTitle: 'Eigene Artikel', ref: '', pdf: '', parent: ROOT_ID, category, user: true, blocks, children: [], toc, search } };
  }

  // Alle eigenen Artikel (Liste {id, md}) in das Wiki einbauen
  function merge(W, list) {
    if (!list.length) return { broken: {} };
    const baseArticles = W.articles.slice();
    const root = { id: ROOT_ID, title: 'Eigene Artikel', kind: 'doc', doc: ROOT_ID, docTitle: 'Eigene Artikel', ref: 'Eigene', subtitle: 'Von Claude oder dir verfasste Artikel', pdf: '', blocks: [{ t: 'p', html: 'Diese Artikel wurden nicht aus den Dossiers übernommen, sondern ergänzend verfasst. Sie sind mit den Dossier-Artikeln verlinkt.' }], children: [], toc: [], search: [{ text: 'Eigene Artikel' }], user: true };
    const first = list.map(x => { const t = (x.md.match(/^#\s+(.*)$/m) || [, x.id])[1].trim(); const toc = [...x.md.matchAll(/^#{2,3}\s+(.*)$/gm)].map(m => ({ id: slug(m[1]), level: 3, text: m[1].trim() })); return { id: x.id, title: t, kind: 'article', toc }; });
    const R = makeResolver(baseArticles.concat(first));
    const broken = {};
    for (const x of list) {
      const p = parse(x.id, x.md, R);
      if (p.broken.length) broken[x.id] = p.broken;
      root.children.push(p.article.id);
      W.articles.push(p.article);
    }
    W.articles.push(root);
    const wc = a => a.search.reduce((n, s) => n + (s.text || '').split(/\s+/).length, 0);
    W.docs.push({ id: ROOT_ID, title: root.title, subtitle: root.subtitle, ref: 'Eigene', pdf: '', pages: 0, desc: 'Ergänzende Artikel, die nicht aus den Dossiers stammen.', count: list.length + 1 });
    return { broken };
  }

  const api = { parse, merge, makeResolver, slug, ROOT_ID };
  root.UserArticles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
