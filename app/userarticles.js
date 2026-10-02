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
    const variants = t => { const o = new Set([t, t.replace(/\s*\([^)]*\)/g, ''), t.replace(/^\d+\.\s+/, '')]); for (const x of [...o]) for (const part of x.split(/:\s+|\s+[–|]\s+/)) if (part.length >= 3) o.add(part.trim()); return [...o]; };
    for (const a of articles) for (const v of variants(a.title)) add(v, a);
    for (const a of articles) {
      for (const t of a.toc || []) if (t.level >= 3 && !/^§/.test(t.text)) for (const v of variants(t.text)) add(v, a, t.id);
    }
    const resolve = ref => {
      ref = ref.replace(/&amp;/g, '&');
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
        while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i].trim().replace(/\[\[[^\]]*\]\]/g, m => m.replace(/\|/g, '\u0001')).replace(/^\||\|$/g, '').split('|').map(c => c.trim().replace(/\u0001/g, '|'))); i++; }
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


  // ---------- Bearbeitungen bestehender Artikel ----------
  const textFields = b => {
    const f = [];
    const add = (get, set) => f.push([get, set]);
    if (b.html != null) add(() => b.html, v => { b.html = v; });
    if (b.caption) add(() => b.caption, v => { b.caption = v; });
    if (b.items) b.items.forEach((_, i) => add(() => b.items[i], v => { b.items[i] = v; }));
    if (b.head) b.head.forEach((_, i) => add(() => b.head[i], v => { b.head[i] = v; }));
    if (b.rows) b.rows.forEach((r, y) => r.forEach((_, x) => add(() => b.rows[y][x], v => { b.rows[y][x] = v; })));
    if (b.pairs) b.pairs.forEach((_, i) => add(() => b.pairs[i][1], v => { b.pairs[i][1] = v; }));
    if (b.cells) b.cells.forEach((_, i) => add(() => b.cells[i][1], v => { b.cells[i][1] = v; }));
    if (b.parts) b.parts.forEach((_, i) => add(() => b.parts[i], v => { b.parts[i] = v; }));
    return f;
  };
  const stripAnchors = h => h.replace(/<a [^>]*>|<\/a>/g, '');

  function replaceInHtml(html, find, repl) {
    const f = esc(find); let n = 0, out = '', pos = 0, idx;
    while ((idx = html.indexOf(f, pos)) !== -1) {
      // nur im sichtbaren Text, nicht innerhalb eines Tags
      const before = html.slice(0, idx);
      if (before.lastIndexOf('<') > before.lastIndexOf('>')) { out += html.slice(pos, idx + f.length); pos = idx + f.length; continue; }
      const inAnchor = (before.match(/<a /g) || []).length > (before.match(/<\/a>/g) || []).length;
      out += html.slice(pos, idx) + (inAnchor ? stripAnchors(repl) : repl); pos = idx + f.length; n++;
    }
    return { html: out + html.slice(pos), n };
  }

  const headIdx = (blocks, heading) => {
    const k = fold(heading);
    let i = blocks.findIndex(b => b.t === 'h' && fold(b.text) === k);
    if (i < 0) i = blocks.findIndex(b => b.t === 'h' && (fold(b.text).includes(k) || b.id === heading));
    return i;
  };
  const sectionEnd = (blocks, i) => { const lvl = blocks[i].level; let j = i + 1; while (j < blocks.length && !(blocks[j].t === 'h' && blocks[j].level <= lvl)) j++; return j; };

  function reindex(a) {
    const seen = new Set(); a.toc = []; a.search = [];
    for (const b of a.blocks) {
      if (b.t === 'h') { let id = b.id && !seen.has(b.id) ? b.id : slug(b.text.replace(/^§\s*/, 'p')); while (seen.has(id)) id += '-2'; seen.add(id); b.id = id; a.toc.push({ id, level: b.level, text: b.text }); a.search.push({ h: id, text: b.text }); }
      else if (b.t === 'p' || b.t === 'callout') a.search.push({ text: strip(b.html) });
      else if (b.t === 'ul') a.search.push({ text: b.items.map(strip).join(' • ') });
      else if (b.t === 'table') a.search.push({ text: [b.head.map(strip).join(' | '), ...b.rows.map(r => r.map(strip).join(' | '))].join(' \n ') });
      else if (b.t === 'infobox') a.search.push({ text: b.pairs.map(([l, v]) => l + ': ' + strip(v)).join('; ') });
      else if (b.t === 'facts') a.search.push({ text: b.cells.map(([l, v]) => l + ': ' + strip(v)).join('; ') });
      else if (b.t === 'figure' || b.t === 'caption') a.search.push({ text: strip(b.caption || b.html || '') });
      else if (b.t === 'strip') a.search.push({ text: b.parts.map(strip).join(' · ') });
    }
  }

  // ops: replace_text{find,replace} | append{content,heading?} | replace_section{heading,content} | delete_section{heading}
  function applyEdits(a, ops, R) {
    const report = [], broken = [];
    for (const op of ops) {
      try {
        if (op.op === 'replace_text') {
          const pr = parse(a.id, op.replace, R); broken.push(...pr.broken);
          const repl = pr.article.blocks.filter(b => b.t === 'p').map(b => b.html).join(' ') || esc(op.replace);
          let n = 0;
          for (const b of a.blocks) {
            if (b.t === 'h') { const t = op.find; if (b.text.includes(t)) { b.text = b.text.split(t).join(strip(repl)); n++; } continue; }
            for (const [get, set] of textFields(b)) { const r = replaceInHtml(get(), op.find, repl); if (r.n) { set(r.html); n += r.n; } }
          }
          report.push({ ok: n > 0, op: op.op, msg: n ? `${n}× ersetzt` : `Text "${op.find}" nicht gefunden (muss exakt dem sichtbaren Text entsprechen, ohne [[ ]])` });
        } else if (op.op === 'append' || op.op === 'replace_section') {
          const pr = parse(a.id, op.content, R); broken.push(...pr.broken);
          const nb = pr.article.blocks;
          if (op.op === 'append' && !op.heading) { a.blocks.push(...nb); report.push({ ok: true, op: op.op, msg: `${nb.length} Block/Blöcke am Ende angehängt` }); }
          else {
            const i = headIdx(a.blocks, op.heading || '');
            if (i < 0) { report.push({ ok: false, op: op.op, msg: `Überschrift "${op.heading}" nicht gefunden. Verfügbar: ${a.blocks.filter(b => b.t === 'h').map(b => b.text).join('; ')}` }); continue; }
            const e = sectionEnd(a.blocks, i);
            if (op.op === 'append') a.blocks.splice(e, 0, ...nb); else a.blocks.splice(i + 1, e - i - 1, ...nb);
            report.push({ ok: true, op: op.op, msg: `Abschnitt "${a.blocks[i].text}": ${nb.length} Block/Blöcke ${op.op === 'append' ? 'angehängt' : 'ersetzt'}` });
          }
        } else if (op.op === 'delete_section') {
          const i = headIdx(a.blocks, op.heading || '');
          if (i < 0) { report.push({ ok: false, op: op.op, msg: `Überschrift "${op.heading}" nicht gefunden` }); continue; }
          const e = sectionEnd(a.blocks, i); const name = a.blocks[i].text; a.blocks.splice(i, e - i);
          report.push({ ok: true, op: op.op, msg: `Abschnitt "${name}" gelöscht` });
        } else report.push({ ok: false, op: op.op, msg: 'Unbekannte Operation' });
      } catch (err) { report.push({ ok: false, op: op.op, msg: String(err) }); }
    }
    reindex(a); a.edited = true;
    return { report, broken: [...new Set(broken)] };
  }

  // Alle eigenen Artikel (Liste {id, md}) in das Wiki einbauen
  function merge(W, list, edits = []) {
    if (!list.length && !edits.length) return { broken: {} };
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
    if (list.length) W.articles.push(root);
    const wc = a => a.search.reduce((n, s) => n + (s.text || '').split(/\s+/).length, 0);
    if (list.length) W.docs.push({ id: ROOT_ID, title: root.title, subtitle: root.subtitle, ref: 'Eigene', pdf: '', pages: 0, desc: 'Ergänzende Artikel, die nicht aus den Dossiers stammen.', count: list.length + 1 });
    const R2 = makeResolver(W.articles);
    const byId = new Map(W.articles.map(a => [a.id, a]));
    const editReport = {};
    for (const e of edits) {
      const orig = byId.get(e.id);
      if (!orig) continue;
      const a = JSON.parse(JSON.stringify(orig));
      W.articles[W.articles.indexOf(orig)] = a; byId.set(e.id, a);
      const r = applyEdits(a, e.ops, R2);
      if (r.broken.length) broken[e.id] = (broken[e.id] || []).concat(r.broken);
      editReport[e.id] = r.report;
    }
    return { broken };
  }

  const api = { parse, merge, makeResolver, applyEdits, slug, ROOT_ID };
  root.UserArticles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
