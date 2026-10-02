/* Solarpedia – Oberfläche */
(function () {
  'use strict';
  const W = window.WIKI;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const strip = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignorieren */ } },
  };

  // ---------- Daten ----------
  const byId = new Map(W.articles.map(a => [a.id, a]));
  const docRoot = new Map(W.articles.filter(a => a.kind === 'doc').map(a => [a.doc, a]));
  const docInfo = new Map(W.docs.map(d => [d.id, d]));
  Search.init(W.articles);

  // Rückverweise: wer verlinkt auf wen
  const backlinks = new Map();
  (function () {
    const re = /href="#\/a\/([a-z0-9-]+)/g;
    for (const a of W.articles) {
      const seen = new Set();
      const scan = h => { if (!h) return; let m; re.lastIndex = 0; while ((m = re.exec(h))) seen.add(m[1]); };
      for (const b of a.blocks) {
        scan(b.html); scan(b.caption);
        if (b.items) b.items.forEach(scan);
        if (b.rows) b.rows.forEach(r => r.forEach(scan));
        if (b.pairs) b.pairs.forEach(p => scan(p[1]));
        if (b.cells) b.cells.forEach(p => scan(p[1]));
        if (b.parts) b.parts.forEach(scan);
      }
      for (const t of seen) if (t !== a.id) { if (!backlinks.has(t)) backlinks.set(t, new Set()); backlinks.get(t).add(a.id); }
    }
  })();

  const leadText = (a, max = 200) => {
    const b = a.blocks.find(x => x.t === 'p' && !x.formula && strip(x.html).length > 40);
    let t = b ? strip(b.html) : '';
    if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, '') + ' …';
    return t;
  };
  const wordCount = a => a.search.reduce((n, p) => n + (p.text || '').split(/\s+/).length, 0);

  // ---------- Block-Renderer ----------
  const linkBadge = t => t ? `<span class="badge">${esc(t.toLowerCase())}</span>` : '';

  function renderBlocks(a) {
    let out = '', open = false, carry = '';
    const blocks = a.blocks;
    for (let bi = 0; bi < blocks.length; bi++) {
      const b = blocks[bi];
      switch (b.t) {
        case 'h': {
          const lvl = b.level === 3 ? 2 : 3;
          const tag = b.tag || b.badge;
          if (lvl === 2) { if (open) out += '</section>'; out += '<section class="sect">'; open = true; }
          out += `<h${lvl} class="sec${/^§/.test(b.text) ? ' para-h' : ''}" id="${esc(b.id)}"><span class="mw-headline">${esc(b.text)}</span>${linkBadge(tag)}<a class="anchor" href="#/a/${a.id}/${b.id}" title="Link zu diesem Abschnitt">¶</a></h${lvl}>`;
          if (carry) { out += carry; carry = ''; }
          break;
        }
        case 'p': {
          const cls = b.formula ? 'formula' : /^(<[bi]>)?(\(\d{1,2}[a-z]?\)|\d{1,2}\.)\s/.test(b.html) ? 'abs' : '';
          out += `<p${cls ? ` class="${cls}"` : ''}>${b.html}</p>`;
          break;
        }
        case 'ul': out += `<ul>${b.items.map(i => `<li>${i}</li>`).join('')}</ul>`; break;
        case 'caption': out += `<p class="note">${b.html}</p>`; break;
        case 'strip': out += `<div class="strip">${b.parts.map(p => `<span>${p}</span>`).join('')}</div>`; break;
        case 'facts': out += `<dl class="facts">${b.cells.map(([l, v]) => `<div><dt>${esc(l)}</dt><dd>${v}</dd></div>`).join('')}</dl>`; break;
        case 'callout': {
          const warn = /b45309/i.test(b.color || '');
          out += `<div class="callout ${warn ? 'warn' : 'info'}"><div class="callout-title">${esc(b.kind.charAt(0) + b.kind.slice(1).toLowerCase())}</div><div>${b.html}</div></div>`;
          break;
        }
        case 'infobox': {
          const html = `<aside class="infobox${b.narrow ? ' narrow' : ''}">${b.img ? `<img class="zoomable" src="${esc(b.img)}" alt="">` : ''}<table>${b.pairs.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${v}</td></tr>`).join('')}</table></aside>`;
          if (blocks[bi + 1] && blocks[bi + 1].t === 'h' && !open) carry = html; else out += html;
          break;
        }
        case 'figure': {
          const nx = blocks[bi + 1];
          const cls = b.ar > 1.9 ? ' wide' : (nx && !/^(p|ul|h|infobox)$/.test(nx.t)) || !nx ? ' block' : '';
          const html = `<figure class="thumb${cls}">${b.img ? `<img class="zoomable" src="${esc(b.img)}" alt="${esc(strip(b.caption))}" loading="lazy">` : ''}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ''}</figure>`;
          if (blocks[bi + 1] && blocks[bi + 1].t === 'h' && !open && !carry) carry = html; else out += html;
          break;
        }
        case 'table': {
          const head = b.head.some(h => h) ? `<thead><tr>${b.head.map(h => `<th>${h}</th>`).join('')}</tr></thead>` : '';
          out += `<div class="tablewrap"><table class="wikitable">${head}<tbody>${b.rows.map(r => `<tr>${r.map((c, i) => i === 0 && /^<b>/.test(c) ? `<th scope="row">${c}</th>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
          break;
        }
        default: break;
      }
    }
    if (open) out += '</section>';
    return out + carry;
  }

  // ---------- Inhaltsverzeichnis ----------
  function buildToc(a) {
    const items = a.toc.filter(t => t.level >= 3);
    if (!items.length) return '';
    const top = Math.min(...items.map(t => t.level));
    let n1 = 0, n2 = 0, html = `<ul class="toc"><li class="toc-top"><a href="#top" data-top>(Anfang)</a></li>`;
    for (const t of items) {
      const d = t.level - top;
      const topLvl = d === 0 || n1 === 0;
      if (topLvl) { n1++; n2 = 0; } else n2++;
      html += `<li class="d${topLvl ? 0 : 1}"><a href="#/a/${a.id}/${t.id}" data-id="${esc(t.id)}"><span class="num">${topLvl ? n1 : n1 + '.' + n2}</span> ${esc(t.text)}</a></li>`;
    }
    return html + '</ul>';
  }

  let spy = null;
  function setupSpy() {
    if (spy) spy.disconnect();
    const links = new Map($$('#toc a[data-id]').map(a => [a.dataset.id, a]));
    if (!links.size) return;
    const hs = $$('#page .sec');
    const visible = new Set();
    spy = new IntersectionObserver(entries => {
      for (const e of entries) { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); }
      let cur = null;
      for (const h of hs) { if (visible.has(h.id)) { cur = h.id; break; } }
      if (!cur) { const above = hs.filter(h => h.getBoundingClientRect().top < 120); cur = above.length ? above[above.length - 1].id : null; }
      links.forEach((l, id) => l.classList.toggle('active', id === cur));
      const act = links.get(cur); if (act) act.scrollIntoView({ block: 'nearest' });
    }, { rootMargin: '-70px 0px -70% 0px' });
    hs.forEach(h => spy.observe(h));
  }

  // ---------- Seiten ----------
  const page = $('#page');
  let current = { type: 'home' };

  function crumbs(a) {
    const parts = [];
    const chain = [];
    let p = a.parent && byId.get(a.parent);
    while (p && p.kind !== 'doc') { chain.unshift(p); p = p.parent && byId.get(p.parent); }
    if (chain.length) { const root = docRoot.get(a.doc); parts.push(`<a href="#/a/${root.id}">${esc(root.title)}</a>`); }
    for (const c of chain) parts.push(`<a href="#/a/${c.id}">${esc(c.title)}</a>`);
    return parts.length ? `<div class="crumbs">${parts.join(' <span>›</span> ')}</div>` : '';
  }

  function childList(a) {
    if (!a.children.length) return '';
    const items = a.children.map(id => byId.get(id)).filter(Boolean);
    const intro = a.kind === 'doc' ? 'Inhalt dieses Dossiers' : a.kind === 'part' ? 'Inhalt dieses Teils' : 'Inhalt dieses Gesetzes';
    return `<h2 class="sec" id="inhalt"><span class="mw-headline">${intro}</span></h2><ul class="children">${items.map(c => {
      const sub = c.children.length ? `<span class="count">${c.children.length} Unterartikel</span>` : '';
      const lead = leadText(c, 170);
      return `<li><a class="child-title" href="#/a/${c.id}">${esc(c.title)}</a>${sub}${lead ? `<div class="child-lead">${esc(lead)}</div>` : ''}</li>`;
    }).join('')}</ul>`;
  }

  function siblingNav(a) {
    const parent = a.parent && byId.get(a.parent);
    if (!parent) return '';
    const sibs = parent.children;
    const i = sibs.indexOf(a.id);
    const prev = i > 0 ? byId.get(sibs[i - 1]) : null, next = i < sibs.length - 1 ? byId.get(sibs[i + 1]) : null;
    if (!prev && !next) return '';
    return `<nav class="sibnav">${prev ? `<a class="prev" href="#/a/${prev.id}"><small>← Vorheriger Artikel</small>${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="next" href="#/a/${next.id}"><small>Nächster Artikel →</small>${esc(next.title)}</a>` : '<span></span>'}</nav>`;
  }

  function renderArticle(a, anchor, hl) {
    current = { type: 'article', a };
    const root = docRoot.get(a.doc);
    const subtitle = a.user && a.kind !== 'doc' ? `Eigener Artikel · <a href="#/a/${root.id}">Eigene Artikel</a>` : a.kind === 'doc'
      ? (docInfo.get(a.id) ? docInfo.get(a.id).subtitle.split('|').map(s => s.trim()).filter(Boolean).join(' · ') : '')
      : `Aus dem Dossier <a href="#/a/${root.id}">${esc(root.title)}</a>${a.ref && a.ref !== 'Rechtsbuch' ? ` (Ref.-ID ${esc(a.ref)})` : ''}`;
    const kindLabel = { doc: 'Dossier', part: 'Teil', article: a.law && !a.title.includes(':') && /\(/.test(a.title) ? 'Gesetz' : '' }[a.kind];
    const related = [...(backlinks.get(a.id) || [])].map(id => byId.get(id)).filter(Boolean).sort((x, y) => x.title.localeCompare(y.title, 'de'));
    const hasBody = a.blocks.length > 0;
    page.innerHTML = `
      <div class="tabs"><span class="tab active">Artikel</span><span class="tab-spacer"></span><a class="tab" href="#" data-act="bookmark" id="bm-btn" title="Artikel merken">${isBookmarked(a.id) ? '★ Gemerkt' : '☆ Merken'}</a><a class="tab" href="#" data-act="cite" title="Zitierweise kopieren">Zitieren</a><a class="tab" href="#" data-act="fs-" title="Schrift kleiner">A−</a><a class="tab" href="#" data-act="fs+" title="Schrift größer">A+</a>${a.pdf ? `<a class="tab" href="#" data-act="pdf" title="Das Original-Dossier als PDF öffnen">PDF öffnen ↗</a>` : ''}</div>
      ${crumbs(a)}
      <h1 id="top" class="firstHeading">${esc(a.title)}</h1>
      <div class="subtitle">${a.category ? `<span class="chip">${esc(a.user ? a.category : a.category.charAt(0) + a.category.slice(1).toLowerCase())}</span> ` : ''}${kindLabel ? `<span class="chip alt">${kindLabel}</span> ` : ''}${a.edited ? '<span class="chip warn" title="Dieser Artikel wurde nachträglich bearbeitet">Bearbeitet</span> ' : ''}${subtitle}</div>
      ${hl && hl.length ? `<div class="hl-note">Suchbegriffe hervorgehoben: <b>${esc(hl.join(', '))}</b> <button data-act="clear-hl">Hervorhebung entfernen</button></div>` : ''}
      <div id="content" class="content">
        ${renderBlocks(a)}
        ${!hasBody && !a.children.length ? '<p class="note">Dieser Abschnitt enthält nur eine Überschrift.</p>' : ''}
        ${childList(a)}
      </div>
      ${siblingNav(a)}
      <details class="netbox" id="netbox" data-id="${a.id}"><summary>Verknüpfungsnetz dieses Artikels</summary><div id="net"></div></details>
      ${related.length ? `<section class="related"><h2 class="sec"><span class="mw-headline">Verweise auf diesen Artikel</span></h2><ul class="cols">${related.slice(0, 60).map(r => `<li><a href="#/a/${r.id}">${esc(r.title)}</a></li>`).join('')}</ul></section>` : ''}
      <div class="catlinks"><b>Dossier:</b> <a href="#/a/${root.id}">${esc(root.title)}</a>${a.ref && a.ref !== 'Rechtsbuch' ? ` · <span>${esc(a.ref)}</span>` : ''} · <span>${wordCount(a).toLocaleString('de-DE')} Wörter</span></div>`;
    document.title = `${a.title} – Solarpedia`;
    const toc = buildToc(a);
    $('#toc-portlet').hidden = !toc;
    $('#toc').innerHTML = toc;
    $('#tools-portlet').hidden = false;
    $('#pdf-link').parentElement.hidden = !a.pdf;
    if (hl && hl.length) applyHighlight($('#content'), hl);
    setupSpy();
    enhanceTables(page);
    addVisited(a);
    afterRender(anchor, hl && hl.length);
  }

  function renderNotFound(id) {
    current = { type: 'nf' };
    page.innerHTML = `<h1 class="firstHeading">Seite nicht gefunden</h1><p>Der Artikel „${esc(id)}“ existiert nicht. Probiere die <a href="#/index">Artikelübersicht</a> oder die Suche.</p>`;
    $('#toc-portlet').hidden = true; $('#tools-portlet').hidden = true;
  }

  function addVisited(a) {
    const v = store.get('visited', []).filter(id => id !== a.id);
    v.unshift(a.id);
    store.set('visited', v.slice(0, 60));
  }

  function renderHome() {
    current = { type: 'home' };
    document.title = 'Solarpedia';
    const day = Math.floor(Date.now() / 864e5);
    const pool = W.articles.filter(a => a.kind === 'article' && a.blocks.filter(b => b.t === 'p').length >= 3 && !a.law);
    const feat = pool[day % pool.length];
    const featImg = feat.blocks.find(b => (b.t === 'figure' && b.img) || (b.t === 'infobox' && b.img));
    const visited = store.get('visited', []).map(id => byId.get(id)).filter(Boolean).slice(0, 8);
    const nArt = W.articles.length;
    const nWords = W.articles.reduce((n, a) => n + wordCount(a), 0);
    page.innerHTML = `
      <div class="hero">
        <div class="hero-sun" aria-hidden="true">☉</div>
        <h1>Willkommen bei <b>Solar</b>pedia</h1>
        <p>Das Nachschlagewerk zur Solarrepublik – <b>${nArt.toLocaleString('de-DE')}</b> Artikel aus <b>${W.docs.length}</b> Dossiers, mit Querverweisen, Volltextsuche und dem vollständigen Solaren Rechtsbuch.</p>
        <form id="hero-search" autocomplete="off"><input type="search" placeholder="Wonach suchst du? z. B. Wellenantrieb, Saumland, Sperrzone …" aria-label="Suche"><button type="submit">Suchen</button></form>
        <div class="hero-links"><a href="#/random">Zufälliger Artikel</a> · <a href="#/index">Alle Artikel</a> · <a href="#/a/setting-zusammenfassung-2235">Kurzüberblick lesen</a> · <a href="#/tools">Hilfsmittel</a></div>
      </div>
      <div class="home-grid">
        <section class="box feat">
          <h2>Artikel des Tages</h2>
          <div class="feat-body">
            ${featImg ? `<img src="${esc(featImg.img)}" alt="">` : ''}
            <div><h3><a href="#/a/${feat.id}">${esc(feat.title)}</a></h3><p>${esc(leadText(feat, 340))}</p><p><a href="#/a/${feat.id}">Weiterlesen …</a></p></div>
          </div>
        </section>
        <section class="box">
          <h2>Zuletzt gelesen</h2>
          ${visited.length ? `<ul class="plain">${visited.map(v => `<li><a href="#/a/${v.id}">${esc(v.title)}</a></li>`).join('')}</ul>` : '<p class="muted">Noch nichts gelesen – wähle unten ein Dossier.</p>'}
        </section>
      </div>
      ${window.Tools ? `<h2 class="sec home-h"><span class="mw-headline">Hilfsmittel</span></h2><div class="toolrow">${Tools.hubList.slice(0, 10).map(t => `<a href="${t[0]}"><span>${t[1]}</span>${t[2]}</a>`).join('')}</div>` : ''}
      <h2 class="sec home-h"><span class="mw-headline">Die Dossiers</span></h2>
      <div class="cards">${W.docs.map(d => `
        <a class="card" href="#/a/${d.id}">
          <span class="card-ref">${esc(d.ref === 'Eigene' ? 'Eigene Artikel' : d.ref && d.ref !== 'Rechtsbuch' ? d.ref : d.id.startsWith('setting') ? 'Überblick' : 'Gesetzbuch')}</span>
          <span class="card-title">${esc(d.title)}</span>
          <span class="card-desc">${esc(d.desc)}</span>
          <span class="card-meta">${d.count} Artikel · ${d.pages} Seiten</span>
        </a>`).join('')}</div>
      <p class="muted center">Insgesamt ${(Math.round(nWords / 1000)).toLocaleString('de-DE')} Tsd. Wörter.</p>`;
    $('#toc-portlet').hidden = true; $('#tools-portlet').hidden = true;
    $('#hero-search').addEventListener('submit', e => { e.preventDefault(); const q = $('input', e.target).value.trim(); if (q) go('#/search/' + encodeURIComponent(q)); });
    afterRender();
  }

  function renderIndex() {
    current = { type: 'index' };
    document.title = 'Alle Artikel – Solarpedia';
    const li = a => `<li data-t="${esc(Search.fold(a.title).t)}"><a href="#/a/${a.id}">${esc(a.title)}</a>${a.children.length ? `<ul>${a.children.map(id => byId.get(id)).filter(Boolean).map(li).join('')}</ul>` : ''}</li>`;
    page.innerHTML = `
      <h1 class="firstHeading">Alle Artikel</h1>
      <div class="subtitle">${W.articles.length} Artikel in ${W.docs.length} Dossiers</div>
      <input id="index-filter" class="filter" type="search" placeholder="Artikelliste filtern …" spellcheck="false">
      <div id="index-list">${W.docs.map(d => {
        const r = byId.get(d.id);
        return `<details class="idx-doc" open><summary><a href="#/a/${r.id}">${esc(r.title)}</a> <span class="count">${d.count} Artikel</span></summary><ul>${r.children.map(id => byId.get(id)).filter(Boolean).map(li).join('')}</ul></details>`;
      }).join('')}</div>`;
    $('#toc-portlet').hidden = true; $('#tools-portlet').hidden = true;
    $('#index-filter').addEventListener('input', e => {
      const q = Search.fold(e.target.value.trim()).t;
      $$('#index-list li').forEach(li => { li.hidden = false; });
      if (q) {
        const items = $$('#index-list li');
        for (const li of items) { const own = li.dataset.t.includes(q); li._own = own; }
        for (const li of items) { const any = li._own || $$('li', li).some(x => x._own); li.hidden = !any; }
        $$('#index-list details').forEach(d => { d.open = true; d.hidden = !$$('li:not([hidden])', d).length; });
      } else $$('#index-list details').forEach(d => { d.hidden = false; });
    });
    afterRender();
  }

  const PAGE = 25;
  function renderSearch(q, shown = PAGE) {
    current = { type: 'search', q };
    document.title = `Suche: ${q} – Solarpedia`;
    const t0 = performance.now();
    const { terms, results, partial, corrections } = Search.search(q);
    const ms = Math.round(performance.now() - t0);
    const list = results.slice(0, shown);
    page.innerHTML = `
      <h1 class="firstHeading">Suchergebnisse</h1>
      <form id="page-search" class="page-search" autocomplete="off"><input type="search" value="${esc(q)}" aria-label="Suche"><button type="submit">Suchen</button></form>
      <div class="subtitle">${results.length ? `<b>${results.length}</b> Artikel für „${esc(q)}“ gefunden (${ms} ms)${partial ? ' – <b>Teiltreffer</b>: nicht alle Suchwörter kommen gemeinsam vor' : ''}` : `Keine Treffer für „${esc(q)}“`}</div>
      ${corrections && corrections.length ? `<div class="didyou">Meintest du: ${corrections.map(c => `<a href="#/search/${encodeURIComponent(q.replace(new RegExp(c.from, 'i'), c.to))}">${esc(c.to)}</a>`).join(', ')}?</div>` : ''}
      ${!results.length ? '<p>Tipps: Kürzere Wortteile versuchen (die Suche findet auch Teilwörter), Umlaute sind egal, mehrere Wörter werden mit UND verknüpft.</p>' : ''}
      <ol class="results">${list.map(r => {
        const a = r.a, root = docRoot.get(a.doc);
        const href = `#/a/${a.id}${r.anchor ? '/' + r.anchor : ''}`;
        return `<li><div class="res-title"><a href="${href}" data-hl="${esc(q)}">${esc(a.title)}</a>${r.sectionTitle ? ` <span class="res-sec">› ${esc(r.sectionTitle)}</span>` : ''}</div><div class="res-snip">${r.snippet}</div><div class="res-meta">${esc(root.title)}${a.kind !== 'doc' && a.parent !== root.id && byId.get(a.parent) ? ' › ' + esc(byId.get(a.parent).title) : ''}</div></li>`;
      }).join('')}</ol>
      ${results.length > shown ? `<button class="more" id="more">Weitere ${Math.min(PAGE, results.length - shown)} Ergebnisse anzeigen</button>` : ''}`;
    $('#toc-portlet').hidden = true; $('#tools-portlet').hidden = true;
    $('#page-search').addEventListener('submit', e => { e.preventDefault(); const v = $('input', e.target).value.trim(); if (v) go('#/search/' + encodeURIComponent(v)); });
    const more = $('#more');
    if (more) more.addEventListener('click', () => { const y = window.scrollY; renderSearch(q, shown + PAGE); window.scrollTo(0, y); });
    $('#search-input').value = q;
    afterRender();
  }

  // ---------- Hervorhebung ----------
  function applyHighlight(root, hl) {
    const ts = hl;
    if (!ts.length) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.nodeValue.trim() && !n.parentElement.closest('mark, script, style') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const html = Search.highlightHtml(n.nodeValue, ts);
      if (html.includes('<mark>')) { const span = document.createElement('span'); span.innerHTML = html; n.replaceWith(...span.childNodes); }
    }
  }

  // ---------- Router ----------
  let linkNav = false, pendingHl = null;
  const scrollPos = new Map();

  function parse() {
    const h = location.hash.replace(/^#/, '') || '/';
    const parts = h.split('/').filter(Boolean);
    return parts;
  }

  function route() {
    const parts = parse();
    closeSuggest();
    document.body.classList.remove('sidebar-open');
    const hl = pendingHl; pendingHl = null;
    if (!parts.length) return renderHome();
    if (parts[0] === 'a' && parts[1]) {
      const a = byId.get(parts[1]);
      return a ? renderArticle(a, parts[2], hl ? Search.hlTerms(hl) : null) : renderNotFound(parts[1]);
    }
    if (parts[0] === 'index') return renderIndex();
    if (parts[0] === 'search') return renderSearch(decodeURIComponent(parts.slice(1).join('/')));
    if (parts[0] === 'random') {
      const pool = W.articles.filter(a => a.kind === 'article' && a.blocks.length > 2);
      const a = pool[Math.floor(Math.random() * pool.length)];
      return location.replace('#/a/' + a.id);
    }
    if (parts.length && window.Tools && Tools.route(parts)) return;
    return renderHome();
  }

  function afterRender(anchor, hasHl) {
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) { el.scrollIntoView(); flash(el); return; }
    }
    if (hasHl) { const m = $('#content mark'); if (m) { m.scrollIntoView({ block: 'center' }); return; } }
    if (!linkNav && scrollPos.has(location.hash)) window.scrollTo(0, scrollPos.get(location.hash));
    else window.scrollTo(0, 0);
    linkNav = false;
  }
  function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  function go(hash) { linkNav = true; location.hash = hash; }

  window.addEventListener('hashchange', route);
  let st;
  window.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => scrollPos.set(location.hash, window.scrollY), 120); }, { passive: true });

  // Klicks auf interne Links
  document.addEventListener('click', e => {
    const act = e.target.closest('[data-act]');
    if (act) {
      e.preventDefault();
      if (act.dataset.act === 'pdf') openPdf();
      if (act.dataset.act === 'bookmark' && current.a) { toggleBookmark(current.a.id); act.textContent = isBookmarked(current.a.id) ? '★ Gemerkt' : '☆ Merken'; }
      if (act.dataset.act === 'cite' && current.a) cite(current.a, act);
      if (act.dataset.act === 'fs+' || act.dataset.act === 'fs-') setFont(act.dataset.act === 'fs+' ? 1 : -1);
      if (act.dataset.act === 'clear-hl') { const n = $('.hl-note'); if (n) n.remove(); $$('#content mark').forEach(m => m.replaceWith(document.createTextNode(m.textContent))); $('#content').normalize(); }
      return;
    }
    const img = e.target.closest('img.zoomable');
    if (img) return lightbox(img.src);
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href === '#top' || a.hasAttribute('data-top')) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (href.startsWith('#/')) {
      linkNav = true;
      if (a.dataset.hl) pendingHl = a.dataset.hl;
      // gleicher Hash (z. B. erneuter Klick auf ¶)? trotzdem scrollen
      if (href === location.hash) { e.preventDefault(); route(); }
    } else if (/^https?:/.test(href)) { /* wird von Electron extern geöffnet */ }
  });

  // ---------- Suche (Kopfzeile) ----------
  const input = $('#search-input'), sug = $('#suggest');
  let sugItems = [], sugIdx = -1;
  function closeSuggest() { sug.hidden = true; sugIdx = -1; }
  function showSuggest() {
    const q = input.value.trim();
    if (!q) return closeSuggest();
    sugItems = Search.suggest(q, 8);
    const ts = Search.hlTerms(q);
    sug.innerHTML = sugItems.map((s, i) => `<li role="option" data-i="${i}"><a href="#/a/${s.a.id}${s.anchor ? '/' + s.anchor : ''}" tabindex="-1"><span class="s-title">${Search.highlightHtml(s.label, ts)}</span><span class="s-sub">${s.anchor ? esc(s.a.title) : esc(docRoot.get(s.a.doc).title)}</span></a></li>`).join('')
      + `<li class="s-full" data-full><a href="#/search/${encodeURIComponent(q)}" tabindex="-1">🔍 Volltextsuche nach „${esc(q)}“</a></li>`;
    sug.hidden = false; sugIdx = -1;
  }
  input.addEventListener('input', showSuggest);
  input.addEventListener('focus', () => { if (input.value.trim()) showSuggest(); });
  input.addEventListener('keydown', e => {
    const lis = $$('#suggest li');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (sug.hidden) return showSuggest();
      sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length;
      lis.forEach((l, i) => l.classList.toggle('sel', i === sugIdx));
    } else if (e.key === 'Escape') { closeSuggest(); input.blur(); }
  });
  $('#search-form').addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const sel = $('#suggest li.sel a');
    closeSuggest();
    if (sel) { const href = sel.getAttribute('href'); if (href.startsWith('#/search/')) pendingHl = null; else pendingHl = q; go(href); }
    else { go('#/search/' + encodeURIComponent(q)); }
    input.blur();
  });
  sug.addEventListener('mousedown', e => { const a = e.target.closest('a'); if (a) { e.preventDefault(); if (!a.getAttribute('href').startsWith('#/search/')) pendingHl = input.value.trim(); go(a.getAttribute('href')); closeSuggest(); input.blur(); } });
  document.addEventListener('mousedown', e => { if (!e.target.closest('#search-form')) closeSuggest(); });

  // ---------- Werkzeuge ----------
  function openPdf() {
    const a = current.a; if (!a || !a.pdf) return;
    if (window.desktop) window.desktop.openPdf(a.pdf); else window.open('pdf/' + encodeURIComponent(a.pdf), '_blank');
  }
  $('#pdf-link').addEventListener('click', e => { e.preventDefault(); openPdf(); });
  $('#print-link').addEventListener('click', e => { e.preventDefault(); window.print(); });
  $('#find-link').addEventListener('click', e => { e.preventDefault(); openFind(); });
  $('#back-btn').addEventListener('click', () => history.back());
  $('#fwd-btn').addEventListener('click', () => history.forward());
  $('#menu-btn').addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  $('#scrim').addEventListener('click', () => document.body.classList.remove('sidebar-open'));

  // ---------- Suchen auf der Seite ----------
  const fb = $('#findbar'), fi = $('#find-input');
  function openFind() { fb.hidden = false; const sel = String(window.getSelection() || '').trim(); if (sel) fi.value = sel; fi.focus(); fi.select(); }
  function closeFind() { fb.hidden = true; window.getSelection().removeAllRanges(); }
  const doFind = back => { if (fi.value) window.find(fi.value, false, back, true, false, false, false); };
  fi.addEventListener('input', () => { window.getSelection().removeAllRanges(); doFind(false); fi.focus(); });
  fi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doFind(e.shiftKey); fi.focus(); } if (e.key === 'Escape') closeFind(); });
  $('#find-next').addEventListener('click', () => { doFind(false); fi.focus(); });
  $('#find-prev').addEventListener('click', () => { doFind(true); fi.focus(); });
  $('#find-close').addEventListener('click', closeFind);

  // ---------- Lightbox ----------
  function lightbox(src) {
    const d = document.createElement('div');
    d.className = 'lightbox';
    d.innerHTML = `<img src="${esc(src)}" alt="">`;
    d.addEventListener('click', () => d.remove());
    document.body.appendChild(d);
  }

  // ---------- Tastatur ----------
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); openFind(); }
    else if (e.key === '/' && !typing) { e.preventDefault(); input.focus(); input.select(); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); history.back(); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); history.forward(); }
    else if (e.key === 'Escape') { const lb = $('.lightbox'); if (lb) lb.remove(); else if (!fb.hidden) closeFind(); }
  });
  window.addEventListener('mouseup', e => { if (e.button === 3) history.back(); if (e.button === 4) history.forward(); });


  // ---------- Lesezeichen, Zitat, Schrift ----------
  function isBookmarked(id) { return store.get('bookmarks', []).includes(id); }
  function toggleBookmark(id) { let b = store.get('bookmarks', []); b = b.includes(id) ? b.filter(x => x !== id) : [id, ...b]; store.set('bookmarks', b); }
  function cite(a, el) {
    const root = docRoot.get(a.doc);
    const t = `„${a.title}“. In: Solarpedia, Dossier „${root.title}“${a.ref && a.ref !== 'Rechtsbuch' ? ' (Ref.-ID ' + a.ref + ')' : ''}. #/a/${a.id}`;
    try { navigator.clipboard.writeText(t); el.textContent = 'Kopiert ✓'; setTimeout(() => { el.textContent = 'Zitieren'; }, 1500); } catch { prompt('Zitat', t); }
  }
  function setFont(d) { const v = Math.max(12, Math.min(20, (store.get('fs', 14.5)) + d * 1)); store.set('fs', v); document.body.style.fontSize = v + 'px'; }
  document.body.style.fontSize = store.get('fs', 14.5) + 'px';

  // ---------- Tabellen: sortieren und filtern ----------
  function numOf(t) {
    t = t.replace(/[≈\s]/g, '').replace(/−/g, '-');
    const m = t.match(/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|^-?\d+(?:,\d+)?/);
    if (!m) return null;
    let v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    if (/^\d[\d.,]*(Mrd|Bio)/.test(t)) v *= /Bio/.test(t) ? 1e12 : 1e9; else if (/^\d[\d.,]*Mio/.test(t)) v *= 1e6; else if (/^\d[\d.,]*Tsd/.test(t)) v *= 1e3;
    return v;
  }
  function enhanceTables(root) {
    $$('table.wikitable', root).forEach(tb => {
      if (tb.dataset.enh || !tb.tHead || !tb.tBodies[0]) return;
      tb.dataset.enh = '1';
      const body = tb.tBodies[0], heads = [...tb.tHead.rows[0].cells];
      let dir = 1, col = -1;
      heads.forEach((th, i) => {
        th.classList.add('sortable-h'); th.title = 'Klicken zum Sortieren';
        th.addEventListener('click', () => {
          dir = col === i ? -dir : 1; col = i;
          heads.forEach(h => h.classList.remove('asc', 'desc')); th.classList.add(dir === 1 ? 'asc' : 'desc');
          const key = tr => { const c = tr.cells[i]; if (!c) return ['', null]; const dv = c.querySelector('[data-v]'); const txt = c.textContent.trim(); return [txt, dv ? +dv.dataset.v : numOf(txt)]; };
          const rows = [...body.rows].map(r => ({ r, k: key(r) }));
          const numeric = rows.every(x => x.k[1] != null || x.k[0] === '' || x.k[0] === '–');
          rows.sort((a, b) => (numeric ? ((a.k[1] ?? -Infinity) - (b.k[1] ?? -Infinity)) : a.k[0].localeCompare(b.k[0], 'de', { numeric: true })) * dir);
          rows.forEach(x => body.appendChild(x.r));
        });
      });
      const wrap = tb.closest('.tablewrap');
      if (wrap && body.rows.length >= 10 && !(wrap.previousElementSibling && wrap.previousElementSibling.matches('input.filter'))) {
        const inp = document.createElement('input'); inp.type = 'search'; inp.className = 'filter tfilter'; inp.placeholder = `Tabelle filtern (${body.rows.length} Zeilen) …`;
        inp.addEventListener('input', () => { const q = Search.fold(inp.value.trim()).t; [...body.rows].forEach(r => { r.hidden = q && !Search.fold(r.textContent).t.includes(q); }); });
        wrap.parentNode.insertBefore(inp, wrap);
      }
    });
  }

  // ---------- Vorschau beim Überfahren von Links ----------
  const pv = document.createElement('div'); pv.id = 'preview'; pv.hidden = true; document.body.appendChild(pv);
  let pvTimer = null;
  function previewFor(id, anchor) {
    const a = byId.get(id); if (!a) return '';
    const img = (a.blocks.find(b => (b.t === 'infobox' || b.t === 'figure') && b.img) || {}).img;
    let t = ''; const sec = anchor && a.toc.find(x => x.id === anchor);
    if (sec) { const i = a.blocks.findIndex(b => b.t === 'h' && b.id === anchor); const p = a.blocks.slice(i + 1).find(b => b.t === 'p'); t = p ? strip(p.html) : ''; } else t = leadText(a, 400);
    if (t.length > 300) t = t.slice(0, 300).replace(/\s+\S*$/, '') + ' …';
    const root = docRoot.get(a.doc);
    return `${img ? `<img src="${esc(img)}" alt="">` : ''}<div class="pv-b"><b>${esc(sec ? sec.text + ' · ' + a.title : a.title)}</b><small>${esc(root ? root.title : '')}${a.category ? ' · ' + esc(a.category) : ''}</small><p>${esc(t)}</p></div>`;
  }
  document.addEventListener('mouseover', e => {
    const l = e.target.closest('#page a[href^="#/a/"], #toolpage a[href^="#/a/"]');
    clearTimeout(pvTimer);
    if (!l) { pv.hidden = true; return; }
    pvTimer = setTimeout(() => {
      const m = l.getAttribute('href').match(/^#\/a\/([a-z0-9-]+)(?:\/([^?]+))?/); if (!m) return;
      const html = previewFor(m[1], m[2]); if (!html) return;
      pv.innerHTML = html; pv.hidden = false;
      const r = l.getBoundingClientRect(); const w = 340;
      pv.style.left = Math.max(8, Math.min(window.innerWidth - w - 12, r.left)) + 'px';
      const below = r.bottom + 10; const h = pv.offsetHeight;
      pv.style.top = (below + h > window.innerHeight ? Math.max(8, r.top - h - 10) : below) + 'px';
    }, 380);
  });
  document.addEventListener('scroll', () => { pv.hidden = true; }, { passive: true });
  document.addEventListener('click', () => { pv.hidden = true; });

  // ---------- Verknüpfungsnetz ----------
  const outLinks = new Map();
  (function () { const re = /href="#\/a\/([a-z0-9-]+)/g; for (const a of W.articles) { const set = new Set(); const scan = h => { if (!h) return; let m; re.lastIndex = 0; while ((m = re.exec(h))) set.add(m[1]); }; for (const b of a.blocks) { scan(b.html); scan(b.caption); (b.items || []).forEach(scan); (b.rows || []).forEach(r => r.forEach(scan)); (b.pairs || []).forEach(p => scan(p[1])); (b.cells || []).forEach(p => scan(p[1])); (b.parts || []).forEach(scan); } set.delete(a.id); outLinks.set(a.id, [...set].filter(x => byId.has(x))); } })();
  function renderNet(id) {
    const a = byId.get(id), outs = (outLinks.get(id) || []).slice(0, 14), ins = [...(backlinks.get(id) || [])].filter(x => byId.has(x)).slice(0, 14);
    const Wd = 900, Ht = Math.max(240, Math.max(outs.length, ins.length) * 26 + 40), cx = Wd / 2, cy = Ht / 2;
    const node = (x, y, t, anchor, id2) => `<a href="#/a/${id2}"><text x="${x}" y="${y + 4}" text-anchor="${anchor}" class="nl">${esc(t.length > 34 ? t.slice(0, 33) + '…' : t)}</text></a>`;
    let svg = `<svg viewBox="0 0 ${Wd} ${Ht}" class="net">`;
    const place = (arr, side) => arr.map((x, i) => { const y = 24 + (Ht - 48) * (arr.length === 1 ? 0.5 : i / (arr.length - 1)); const nx = side < 0 ? 270 : Wd - 270; svg += `<path d="M ${cx} ${cy} C ${cx + side * 90} ${cy}, ${nx - side * 90} ${y}, ${nx} ${y}" class="ne ${side < 0 ? 'in' : 'out'}"/>`; return node(side < 0 ? nx - 8 : nx + 8, y, byId.get(x).title, side < 0 ? 'end' : 'start', x); });
    const L = place(ins, -1), Rr = place(outs, 1);
    svg += L.join('') + Rr.join('') + `<rect x="${cx - 110}" y="${cy - 18}" width="220" height="36" rx="8" class="nc"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" class="nct">${esc(a.title.length > 28 ? a.title.slice(0, 27) + '…' : a.title)}</text>`;
    svg += `<text x="20" y="14" class="nh">verlinken hierher (${(backlinks.get(id) || new Set()).size})</text><text x="${Wd - 20}" y="14" text-anchor="end" class="nh">verlinkt wird auf (${(outLinks.get(id) || []).length})</text></svg>`;
    return svg;
  }
  document.addEventListener('toggle', e => { const d = e.target; if (d.id === 'netbox' && d.open && !$('#net', d).firstChild) $('#net', d).innerHTML = renderNet(d.dataset.id); }, true);

  window.__sp = { W, byId, docRoot, page, esc, strip, store, afterRender, go, leadText, backlinks, outLinks, enhance: enhanceTables, isBookmarked, toggleBookmark,
    setCurrent: v => { current = v; }, hideSide: () => { $('#toc-portlet').hidden = true; $('#tools-portlet').hidden = true; } };

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  route();
})();
