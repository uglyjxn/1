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
    vocab = new Map(); present.clear();
    for (const it of index) { const seen = new Set(); for (const w of (it.nTitle + ' ' + it.nHeads + ' ' + it.body).split(/[^a-z0-9]+/)) if (w.length >= 4 && !seen.has(w)) { seen.add(w); vocab.set(w, (vocab.get(w) || 0) + 1); } }
  }

  // ---------- Wortschatz, Wortformen, Tippfehler, Synonyme ----------
  let vocab = new Map();
  const SYN = { ftl: ['uberlicht', 'wellenantrieb'], uberlicht: ['ftl'], mond: ['luna', 'erdmond'], erdmond: ['luna'], mars: ['ares'], ares: ['mars'], firma: ['konzern', 'unternehmen'], konzern: ['firma', 'unternehmen'], kontor: ['ceres-kontor'], bps: ['planetenschutz'], quantentunnel: ['q-reihe', 'tunnel'], antimaterie: ['pellet'], atomkraft: ['fusion'], geheimdienst: ['sonderabteilung', 'sonderprojekte'], geheimpolizei: ['sonderabteilung'], polizei: ['sonderabteilung', 'raumwache'], armee: ['raumwache'], militar: ['raumwache'], regierung: ['kanzler', 'ministerium'], gesetz: ['recht'], geld: ['credit', 'cr'], wahrung: ['credit'], schiff: ['liner', 'raumschiff'], fahrstuhl: ['lift', 'aufzug'], planetenschutz: ['bps'] };
  const dist = (a, b, max) => {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let rowMin = i;
      for (let j = 1; j <= b.length; j++) { const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); cur.push(v); if (v < rowMin) rowMin = v; }
      if (rowMin > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  };
  const present = new Map();
  const inCorpus = t => { if (present.has(t)) return present.get(t); const r = index.some(it => it.body.includes(t) || it.nTitle.includes(t)); present.set(t, r); return r; };
  function fuzzy(t) {
    const max = t.length <= 7 ? 1 : 2, out = [];
    for (const [w, df] of vocab) { if (w.length < 4) continue; const d = dist(t, w, max); if (d <= max) out.push([d, -df, w]); }
    return out.sort((x, y) => x[0] - y[0] || x[1] - y[1]).slice(0, 3).map(x => x[2]);
  }
  const ENDS = ['ungen', 'ung', 'ern', 'en', 'er', 'es', 'e', 'n', 's'];
  function expandTerm(t) {
    const v = new Set([t]);
    if (/\s/.test(t)) return [t];                       // Phrase: unverändert
    if (SYN[t]) SYN[t].forEach(x => v.add(x));
    for (const e of ENDS) if (t.length - e.length >= 4 && t.endsWith(e)) v.add(t.slice(0, -e.length));
    if (t.length >= 4 && !inCorpus(t)) for (const w of fuzzy(t)) v.add(w);
    return [...v];
  }
  // Suchwort-Zerlegung: "Phrase in Anführungszeichen" bleibt zusammen
  function parseQuery(q) {
    const out = []; const re = /"([^"]+)"|(\S+)/g; let m;
    while ((m = re.exec(q))) { const raw = m[1] || m[2]; const f = foldT(raw).replace(/[^a-z0-9⊕°§%.\- ]+/g, ' ').replace(/\s+/g, ' ').trim(); if (f && !out.includes(f)) out.push(f.replace(/^[.\-]+|[.\-]+$/g, '')); }
    return out.filter(Boolean);
  }
  const groups = q => parseQuery(q).map(t => ({ t, v: expandTerm(t) }));
  const hlTerms = q => [...new Set(groups(q).flatMap(g => g.v))];

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
    const gs = groups(q);
    if (!gs.length) return { terms: [], results: [], corrections: [] };
    const ts = [...new Set(gs.flatMap(g => g.v))];
    const phrase = foldT(q).trim();
    // Korrekturvorschläge: Suchwort kommt nirgends vor, aber ähnliche Wörter
    const corrections = gs.filter(g => g.t.length >= 4 && !/\s/.test(g.t) && !inCorpus(g.t)).map(g => ({ from: g.t, to: fuzzy(g.t)[0] })).filter(c => c.to);
    const run = (need) => {
      const res = [];
      for (const it of index) {
        let score = 0, matched = 0, inTitle = 0;
        for (const g of gs) {
          const inT = g.v.some(x => it.nTitle.includes(x)), inH = g.v.some(x => it.nHeads.includes(x));
          const c = g.v.reduce((n, x) => n + count(it.body, x, 15), 0);
          if (!inT && !inH && !c && !g.v.some(x => it.nMeta.includes(x))) continue;
          matched++;
          if (inT) { inTitle++; score += g.v.some(x => (' ' + it.nTitle).includes(' ' + x)) ? 120 : 80; }
          if (inH) score += 40;
          score += c * 3;
        }
        if (matched < need) continue;
        score += matched * 30;
        if (inTitle === gs.length) score += 100;
        if (gs.length > 1 && it.nTitle.includes(phrase)) score += 150;
        if (it.nTitle === phrase) score += 300;
        let best = null, bs = -1;
        for (const s of it.secs) {
          let sc = 0, present2 = 0;
          for (const g of gs) { const c = g.v.reduce((n, x) => n + count(s.n, x, 5), 0); if (c) { present2++; sc += c; } }
          if (gs.length > 1 && s.n.includes(phrase)) sc += 8;
          sc += present2 * 10;
          if (s.anchor && ts.some(term => foldT(s.heading).includes(term))) sc += 6;
          if (sc > bs) { bs = sc; best = s; }
        }
        if (bs > 0) score += Math.min(bs, 40);
        res.push({ a: it.a, score, sec: best, matched });
      }
      return res;
    };
    let results = run(gs.length), partial = false;
    if (!results.length && gs.length > 1) { results = run(Math.max(1, Math.ceil(gs.length / 2))); partial = true; }
    results.sort((x, y) => y.score - x.score || x.a.title.localeCompare(y.a.title, 'de'));
    for (const r of results) {
      const s = r.sec;
      r.anchor = s && s.anchor ? s.anchor : '';
      r.sectionTitle = s && s.anchor ? s.heading : '';
      r.snippet = s ? snippet(s.text || s.heading, ts) : '';
    }
    return { terms: ts, results, partial, corrections, groups: gs.length };
  }

  // Schnellvorschläge: nur Titel und Überschriften
  function suggest(q, max = 8) {
    const gs = groups(q);
    if (!gs.length) return [];
    const ts = gs.map(g => g.t);
    const out = [];
    for (const it of index) {
      const a = it.a;
      const allIn = h => gs.every(g => g.v.some(x => h.includes(x)));
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

  window.Search = { init, search, suggest, highlightHtml, fold, terms: hlTerms, hlTerms };
})();
