// Volltextsuche (ohne Abhängigkeiten): diakritik-unempfindlich, Teilwort-Treffer, Gewichtung nach Titel/Überschrift/Text.
(function () {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Kleinschreibung + Umlaute/Akzente entfernen; map[i] = Index im Originaltext
  function fold(s) {
    let t = '';
    const map = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      const n = c === 'ß' ? 'ss' : c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      for (const ch of n) { t += ch; map.push(i); }
    }
    return { t, map };
  }
  const foldT = s => fold(s).t;
  const terms = q => [...new Set(foldT(q).split(/[^a-z0-9⊕°§%.\-]+/).map(x => x.replace(/^[.\-]+|[.\-]+$/g, '')).filter(Boolean))];

  let index = [];

  function init(articles) {
    index = articles.map(a => {
      const secs = [];
      let cur = { anchor: '', heading: '', text: '' };
      for (const p of a.search) {
        if (p.h !== undefined) { secs.push(cur); cur = { anchor: p.h, heading: p.text, text: '' }; }
        else cur.text += (cur.text ? ' ' : '') + p.text;
      }
      secs.push(cur);
      for (const s of secs) s.n = foldT(s.heading + ' \n ' + s.text);
      return {
        a,
        nTitle: foldT(a.title),
        nHeads: foldT(a.toc.map(t => t.text).join(' \n ')),
        nMeta: foldT(a.docTitle + ' ' + (a.category || '')),
        secs,
        body: secs.map(s => s.n).join(' \n '),
      };
    });
  }

  function count(hay, needle, cap) {
    let n = 0, i = -1;
    while (n < cap && (i = hay.indexOf(needle, i + 1)) !== -1) n++;
    return n;
  }

  // Treffer im Originaltext markieren
  function highlightHtml(text, ts) {
    if (!ts.length) return esc(text);
    const { t, map } = fold(text);
    const ranges = [];
    for (const term of ts) {
      let i = -1;
      while ((i = t.indexOf(term, i + 1)) !== -1) ranges.push([map[i], map[i + term.length - 1] + 1]);
    }
    if (!ranges.length) return esc(text);
    ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const merged = [];
    for (const r of ranges) {
      const l = merged[merged.length - 1];
      if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else merged.push([...r]);
    }
    let out = '', pos = 0;
    for (const [s, e] of merged) { out += esc(text.slice(pos, s)) + '<mark>' + esc(text.slice(s, e)) + '</mark>'; pos = e; }
    return out + esc(text.slice(pos));
  }

  function snippet(text, ts) {
    const { t, map } = fold(text);
    let first = -1;
    for (const term of ts) { const i = t.indexOf(term); if (i !== -1 && (first === -1 || i < first)) first = i; }
    if (first === -1) first = 0;
    const o = map[first] || 0;
    let s = Math.max(0, o - 90), e = Math.min(text.length, o + 190);
    if (s > 0) { const sp = text.indexOf(' ', s); if (sp !== -1 && sp < o) s = sp + 1; }
    if (e < text.length) { const sp = text.lastIndexOf(' ', e); if (sp > o) e = sp; }
    return (s > 0 ? '… ' : '') + highlightHtml(text.slice(s, e), ts) + (e < text.length ? ' …' : '');
  }

  function search(q) {
    const ts = terms(q);
    if (!ts.length) return { terms: ts, results: [] };
    const phrase = foldT(q).trim();
    const results = [];
    for (const it of index) {
      let score = 0, ok = true, inTitle = 0;
      for (const term of ts) {
        const inT = it.nTitle.includes(term), inH = it.nHeads.includes(term);
        const c = count(it.body, term, 15);
        if (!inT && !inH && !c && !it.nMeta.includes(term)) { ok = false; break; }
        if (inT) { inTitle++; score += (' ' + it.nTitle).includes(' ' + term) ? 120 : 80; }
        if (inH) score += 40;
        score += c * 3;
      }
      if (!ok) continue;
      if (inTitle === ts.length) score += 100;
      if (ts.length > 1 && it.nTitle.includes(phrase)) score += 150;
      if (it.nTitle === phrase) score += 300;
      // beste Passage
      let best = null, bs = -1;
      for (const s of it.secs) {
        let sc = 0, present = 0;
        for (const term of ts) { const c = count(s.n, term, 5); if (c) { present++; sc += c; } }
        if (ts.length > 1 && s.n.includes(phrase)) sc += 8;
        sc += present * 10;
        if (s.anchor && ts.some(term => foldT(s.heading).includes(term))) sc += 6;
        if (sc > bs) { bs = sc; best = s; }
      }
      if (bs > 0) score += Math.min(bs, 40);
      results.push({ a: it.a, score, sec: best });
    }
    results.sort((x, y) => y.score - x.score || x.a.title.localeCompare(y.a.title, 'de'));
    for (const r of results) {
      const s = r.sec;
      r.anchor = s && s.anchor ? s.anchor : '';
      r.sectionTitle = s && s.anchor ? s.heading : '';
      r.snippet = s ? snippet(s.text || s.heading, ts) : '';
    }
    return { terms: ts, results };
  }

  // Schnellvorschläge: nur Titel und Überschriften
  function suggest(q, max = 8) {
    const ts = terms(q);
    if (!ts.length) return [];
    const out = [];
    for (const it of index) {
      const a = it.a;
      const allIn = h => ts.every(t => h.includes(t));
      if (allIn(it.nTitle)) {
        const nt = it.nTitle;
        const s = nt === ts.join(' ') ? 300 : nt.startsWith(ts[0]) ? 200 : (' ' + nt).includes(' ' + ts[0]) ? 150 : 100;
        out.push({ a, anchor: '', label: a.title, score: s - (a.kind === 'article' ? 0 : 5) });
      }
      for (const t of a.toc) {
        if (t.level < 3 || /^§/.test(t.text) && ts.length === 0) continue;
        const nt = foldT(t.text);
        if (allIn(nt) && !(allIn(it.nTitle))) {
          const s = nt === ts.join(' ') ? 180 : nt.startsWith(ts[0]) ? 120 : (' ' + nt).includes(' ' + ts[0]) ? 90 : 50;
          out.push({ a, anchor: t.id, label: t.text, score: s });
        }
      }
    }
    out.sort((x, y) => y.score - x.score || x.label.length - y.label.length);
    // je Ziel nur einmal
    const seen = new Set(), res = [];
    for (const o of out) { const k = o.a.id + '#' + o.anchor; if (!seen.has(k)) { seen.add(k); res.push(o); } if (res.length >= max) break; }
    return res;
  }

  window.Search = { init, search, suggest, highlightHtml, fold, terms };
})();
