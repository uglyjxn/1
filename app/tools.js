/* Solarpedia-Hilfsmittel: Register, Glossar, Organigramm, Zeitleiste, Hub. Alle Daten stammen aus tools-data.js (aus den Dossiers erzeugt) und den Artikeln selbst. */
(function () {
  'use strict';
  const T = window.TOOLS, W = window.WIKI;
  if (!T) return;
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const strip = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const fold = s => Search.fold(String(s)).t;
  const Tools = { pages: {}, meta: {} };
  window.Tools = Tools;

  // ---------- Auflösung von Namen zu Artikeln ----------
  let R = null;
  const ALIAS = { 'Proxima': 'Proxima Centauri', 'Gliese 581': 'Gliese 581 d', 'Teegarden': 'Teegarden', 'Ross 128': 'Ross 128', 'Sol': 'Sonnensystem' };
  Tools.resolver = () => R || (R = UserArticles.makeResolver(W.articles));
  Tools.href = name => {
    const r = Tools.resolver().resolve(ALIAS[name] || name);
    return r ? `#/a/${r.id}${r.anchor ? '/' + r.anchor : ''}` : null;
  };
  Tools.link = (name, text, cls = '') => {
    const h = Tools.href(name);
    return h ? `<a class="wl ${cls}" href="${h}">${esc(text || name)}</a>` : esc(text || name);
  };
  Tools.badge = k => `<span class="kbadge ${k === 'e' ? 'e' : 'd'}" title="${k === 'e' ? 'Ergänzung des Autors (Kanon oder Entwurf)' : 'Aus den Dossiers'}">${k === 'e' ? 'Ergänzung' : 'Dossier'}</span>`;

  const S = () => window.__sp;
  function begin(title, opts = {}) {
    const sp = S();
    sp.setCurrent({ type: 'tool' });
    document.title = `${title} – Solarpedia`;
    sp.hideSide();
    $('#nav-tools')?.querySelectorAll('a').forEach(a => a.classList.toggle('cur', a.getAttribute('href') === location.hash.split('?')[0]));
    sp.page.innerHTML = `<div class="tabs"><span class="tab active">${esc(opts.tab || 'Hilfsmittel')}</span><span class="tab-spacer"></span><a class="tab" href="#/tools">Alle Hilfsmittel</a></div><h1 class="firstHeading">${esc(title)}</h1>${opts.sub ? `<div class="subtitle">${opts.sub}</div>` : ''}<div id="tool-body"></div>`;
    return $('#tool-body');
  }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  Tools.begin = begin; Tools.esc = esc; Tools.strip = strip;

  // ---------- Hub ----------
  const TOOLS = [
    ['#/glossar', '📖', 'Glossar', `${T.glossary.length} Begriffe mit Quellenangabe, A–Z und Filter.`],
    ['#/register', '🗂', 'Register', 'Personen, Welten, Firmen, Schiffsklassen, Gesetze, Behörden, Dossiers: sortier- und filterbar.'],
    ['#/organigramm', '🏛', 'Organigramm der Regierung', 'Organe, Ministerien, Ämter, Gerichte und Raumwache auf einen Blick, alles anklickbar.'],
    ['#/karte/stern', '✦', 'Sternkarte', 'Der Nahbereich um Sol mit Entfernungen, Linien und Kolonien.'],
    ['#/karte/sonnensystem', '☉', 'Karte des Sonnensystems', 'Bahnen (logarithmisch), Sperrzone der Sonne und besiedelte Körper.'],
    ['#/karte/handel', '⇄', 'Handelsnetz', 'Alle Linien mit Flottenstärke und Reisezeit auf der Sternkarte.'],
    ['#/karte/toi700d', '◐', 'TOI-700 d', 'Die drei Zonen der gebunden rotierenden Welt.'],
    ['#/konzerne', '⛓', 'Konzernnetz', 'Beteiligungen und Töchter der großen Konzerne, des Kontors und des Bundes.'],
    ['#/zeitleiste', '⏳', 'Zeitleiste', 'Alle Ereignisse der Dossiers und Ergänzungen, filterbar nach Epoche und Quelle.'],
    ['#/diagramme', '▥', 'Diagramme', 'Bevölkerung, Umsätze, Schiffe, Reisezeiten im Vergleich.'],
    ['#/rechner', '🧮', 'Rechner', 'Reisezeit, Beschleunigung, Zeitdilatation, Sperrzonen, Credits.'],
    ['#/kategorien', '🏷', 'Kategorien und A–Z', 'Alle Artikel nach Kategorie und alphabetisch.'],
    ['#/lesezeichen', '★', 'Lesezeichen und Verlauf', 'Gemerkte Artikel und zuletzt gelesene Seiten.'],
    ['#/qualitaet', '✔', 'Qualitätsübersicht', 'Verwaiste Artikel, Statistik, offene Verlinkungen.'],
  ];
  Tools.hubList = TOOLS;
  Tools.pages.tools = () => {
    const b = begin('Hilfsmittel', { sub: 'Register, Karten und Diagramme, die den Überblick über die Artikel erleichtern. Alle Angaben sind aus den Dossiers bzw. den Ergänzungsartikeln abgeleitet.' });
    b.innerHTML = `<div class="cards">${TOOLS.map(([h, ic, t, d]) => `<a class="card" href="${h}"><span class="card-ref">${ic}</span><span class="card-title">${esc(t)}</span><span class="card-desc">${esc(d)}</span></a>`).join('')}</div>`;
  };

  // ---------- Glossar ----------
  function glossaryEntries() {
    const out = T.glossary.map(g => ({ ...g }));
    return out.sort((a, b) => a.term.localeCompare(b.term, 'de'));
  }
  Tools.pages.glossar = () => {
    const b = begin('Glossar', { sub: `${T.glossary.length} Begriffe. Jeder Eintrag nennt seinen Quellartikel; <span class="kbadge d">Dossier</span> = aus den Dossiers, <span class="kbadge e">Ergänzung</span> = vom Autor ergänzt.` });
    const ents = glossaryEntries();
    const letters = [...new Set(ents.map(e => e.term[0].toUpperCase()))];
    b.innerHTML = `<input id="gl-filter" class="filter" type="search" placeholder="Begriff oder Definition filtern …" spellcheck="false">
      <div class="azbar">${letters.map(l => `<a href="#" data-l="${l}">${l}</a>`).join('')}</div>
      <dl class="glossary" id="gl-list">${ents.map(e => `<div class="gl" data-t="${esc(fold(e.term + ' ' + e.def))}" data-l="${esc(e.term[0].toUpperCase())}"><dt id="g-${esc(fold(e.term).replace(/[^a-z0-9]+/g, '-'))}">${esc(e.term)} ${Tools.badge(e.k)}</dt><dd>${esc(e.def)} <span class="src">Quelle: ${Tools.link(e.src)}</span></dd></div>`).join('')}</dl>`;
    const filt = () => { const q = fold($('#gl-filter').value.trim()); $$('.gl').forEach(d => { d.hidden = q && !d.dataset.t.includes(q); }); };
    $('#gl-filter').addEventListener('input', filt);
    $$('.azbar a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const t = $(`.gl[data-l="${a.dataset.l}"]`); if (t) t.scrollIntoView(); }));
  };

  // ---------- Register ----------
  const firstSentence = a => { const p = a.blocks.find(x => x.t === 'p' && !x.formula); let t = p ? strip(p.html) : ''; const m = t.match(/^(.{40,260}?[.!?])(\s|$)/); return m ? m[1] : t.slice(0, 240); };
  const table = (cols, rows, id) => `<div class="tablewrap"><table class="wikitable sortable" ${id ? `id="${id}"` : ''}><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="first"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const filterBox = id => `<input class="filter" data-for="${id}" type="search" placeholder="Filtern …" spellcheck="false">`;

  function wireFilters(root) {
    $$('input.filter[data-for]', root).forEach(inp => {
      const tb = document.getElementById(inp.dataset.for);
      inp.addEventListener('input', () => { const q = fold(inp.value.trim()); $$('tbody tr', tb).forEach(tr => { tr.hidden = q && !fold(tr.textContent).includes(q); }); });
    });
  }

  const REG = {
    personen: ['Personen', () => {
      const rows = T.persons.map(p => [esc(p.name), esc(p.role), Tools.link(p.org), Tools.link(p.src, 'Artikel'), Tools.badge('d')]);
      for (const a of W.articles) if (a.user && /^Person/i.test(a.category || '')) rows.push([Tools.link(a.id, a.title), esc(firstSentence(a)), '–', Tools.link(a.id, 'Artikel'), Tools.badge('e')]);
      rows.sort((x, y) => strip(x[0]).localeCompare(strip(y[0]), 'de'));
      return filterBox('t-per') + table(['Name', 'Rolle', 'Organisation', 'Quelle', 'Herkunft'], rows, 't-per');
    }],
    welten: ['Welten und Orte', () => {
      const cat = new Map(T.catalog.map(c => [c.name, c]));
      const sysName = n => n.replace(/ [a-z]$/, '');
      const sys = new Map(T.systems.map(s => [s.name, s]));
      const rows = T.worlds.map(w => { const c = cat.get(w.name), s = sys.get(sysName(w.name)) || (w.name === 'Proxima b' ? sys.get('Proxima') : null); const ly = c ? c.ly : s ? s.ly : '';
        return [Tools.link(w.name), esc(w.status), `<span data-v="${w.pop || 0}">${esc(w.popText)}</span>`, esc(w.since), `<span data-v="${w.g || 0}">${w.g != null ? String(w.g).replace('.', ',') + ' g' : ''}</span>`, ly ? `<span data-v="${ly}">${String(ly).replace('.', ',')} ly</span>` : '–']; });
      const solar = T.solar.map(s => [Tools.link(s.name), esc(s.kind), `<span data-v="${s.pop || 0}">${esc(s.popText)}</span>`, esc(s.since), '–', '–']);
      return `<h2 class="sec">Bewohnte Welten</h2>` + filterBox('t-w') + table(['Welt', 'Status', 'Einwohner', 'besiedelt seit', 'Schwerkraft', 'Entfernung'], rows, 't-w') + `<h2 class="sec">Sonnensystem</h2>` + table(['Region', 'Art', 'Einwohner', 'seit', '', ''], solar, 't-s') + `<h2 class="sec">Sternsysteme im Nahbereich</h2>` + table(['System', 'Entfernung', 'Status', 'Einwohner', 'Konzern/Verwalter'], T.systems.map(s => [Tools.link(s.name), `<span data-v="${s.ly}">${String(s.ly).replace('.', ',')} ly</span>`, esc(s.status), esc(s.popText), Tools.link(s.owner)]), 't-sy');
    }],
    firmen: ['Firmen', () => {
      const rows = T.companies.map(c => [Tools.link(c.name), esc(c.sector), esc(c.form), esc(c.origin), esc(c.since), `<span data-v="${parseFloat(String(c.staff).replace(/\./g, '').replace(',', '.')) * (/Mio/.test(c.staff) ? 1e6 : /Tsd/.test(c.staff) ? 1e3 : 1) || 0}">${esc(c.staff)}</span>`, `<span data-v="${parseFloat(String(c.revenue).replace(/\./g, '').replace(',', '.')) || 0}">${esc(c.revenue)}</span>`, esc(c.market)]);
      return filterBox('t-f') + table(['Firma', 'Sektor', 'Rechtsform, Sitz', 'Herkunft', 'seit', 'Beschäftigte', 'Umsatz (Mrd. Cr)', 'Marktstellung'], rows, 't-f');
    }],
    schiffe: ['Schiffsklassen', () => filterBoxTable('t-sh', ['Klasse', 'Antrieb', 'Kategorie', 'Länge', 'Crew', 'Kernwert'], T.ships.map(s => [Tools.link(s.name + '-Klasse', s.name) || esc(s.name), esc(s.drive), esc(s.category), `<span data-v="${parseFloat(String(s.length).replace(/\./g, '').replace(',', '.')) || 0}">${esc(s.length)}</span>`, `<span data-v="${parseFloat(String(s.crew).replace(/\./g, '')) || 0}">${esc(s.crew)}</span>`, esc(s.key)]))],
    gesetze: ['Gesetze', () => filterBoxTable('t-g', ['Kürzel', 'Gesetz', 'Teil', 'Stand'], T.laws.map(l => [Tools.link(l.abbr) || esc(l.abbr), esc(l.name), esc(l.part), esc(l.status)]))],
    behoerden: ['Behörden', () => {
      const rows = [];
      for (const m of T.ministries) { rows.push([Tools.link(m.name), 'Ministerium', esc(m.task), '–']); for (const a of m.agencies) rows.push([Tools.link(a.replace(/\s*\(.*$/, '')) , 'Amt/Stelle', esc(a), esc(m.name)]); }
      for (const o of T.organs) rows.push([Tools.link(o.name.replace(/\(.*$/, '').trim()), 'Organ', esc(o.task), esc(o.seat)]);
      return filterBox('t-b') + table(['Name', 'Art', 'Aufgabe / Stelle', 'Zuständig / Sitz'], rows, 't-b');
    }],
    dossiers: ['Dossiers', () => table(['Ref-ID', 'Dossier', 'Seiten', 'Artikel'], W.docs.map(d => [esc(d.ref || '–'), Tools.link(d.id, d.title), d.pages, d.count]))],
    ereignisse: ['Ereignisse', () => `<p>Alle datierten Ereignisse stehen in der <a href="#/zeitleiste">Zeitleiste</a> (filterbar).</p>`],
  };
  function filterBoxTable(id, cols, rows) { return filterBox(id) + table(cols, rows, id); }
  Tools.pages.register = parts => {
    const key = REG[parts[0]] ? parts[0] : 'personen';
    const b = begin('Register', { sub: 'Sortierbar (Klick auf die Spaltenüberschrift) und filterbar.' });
    b.innerHTML = `<div class="subtabs">${Object.entries(REG).map(([k, v]) => `<a class="${k === key ? 'on' : ''}" href="#/register/${k}">${v[0]}</a>`).join('')}</div><h2 class="sec" style="margin-top:.4em">${REG[key][0]}</h2>${REG[key][1]()}`;
    wireFilters(b); S().enhance(b);
  };

  // ---------- Organigramm ----------
  Tools.pages.organigramm = () => {
    const b = begin('Organigramm der Regierung', { sub: 'Staatsorgane, Ministerien, Gerichte und die Raumwache. Quelle: Dossier „Staat, Recht und Wirtschaft“ (Die Solarrepublik), Rechtsbuch, Militär-Dossier; Ergänzungen sind markiert.' });
    const box = (name, sub, cls = '', link) => `<div class="ob ${cls}"><b>${link === false ? esc(name) : Tools.link(link || name, name)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
    const org = n => T.organs.find(o => o.name.startsWith(n)) || {};
    const min = T.ministries.map(m => `<div class="omin"><div class="ob min"><b>${Tools.link(m.name)}</b><small>${esc(m.task)}</small></div><ul>${m.agencies.map(a => `<li>${Tools.link(a.replace(/\s*\(.*$/, ''), a) }</li>`).join('')}${/Justiz/.test(m.name) ? `<li>${Tools.link('Sonderabteilung')} <span class="kbadge e">Ergänzung</span></li>` : ''}${/Sicherheit/.test(m.name) ? `<li>${Tools.link('Amt für Sonderprojekte')}</li>` : ''}</ul></div>`).join('');
    b.innerHTML = `<div class="org">
      <div class="orow">${box('Wahlberechtigte', 'Volksinitiative ab 1 %, Volksbegehren ab 5 %', 'vol', 'Direkte Demokratie')}</div>
      <div class="oarrow">↓ wählt</div>
      <div class="orow">
        ${box('Solarparlament', org('Solarparlament').comp, 'org1')}
        ${box('Rat der Systeme', org('Rat der Systeme').comp, 'org1')}
        ${box('Solarversammlung', 'Parlament plus ebenso viele Delegierte der Gebiete', 'org1', 'Die Solarrepublik')}
      </div>
      <div class="oarrow">↓ wählt Kanzler(in) &nbsp;·&nbsp; Versammlung wählt Präsident(in)</div>
      <div class="orow">
        ${box('Solarpräsident(in)', org('Solarpräsident').comp, 'org2', 'Die Solarrepublik')}
        ${box('Solarkanzler(in) und Kabinett', org('Solarkanzler').comp, 'org2', 'Die Solarrepublik')}
      </div>
      <div class="oarrow">↓ leitet die Ministerien</div>
      <div class="omins">${min}</div>
      <h2 class="sec">Unabhängige Organe und Gerichte</h2>
      <div class="orow">
        ${box('Solares Verfassungsgericht', org('Solares Verfassungsgericht').comp, 'org3', 'Die Solarrepublik')}
        ${box('Solarbank', org('Solarbank').comp, 'org3', 'Die Solarrepublik')}
        ${box('Rechnungshof', org('Rechnungshof').comp, 'org3', 'Die Solarrepublik')}
      </div>
      <div class="oarrow">Gerichtsbarkeit (Rechtsbuch): Ortsgericht → Bezirksgericht → Systemgerichtshof → Solares Oberstes Gericht (Luna)</div>
      <h2 class="sec">Die Solare Raumwache</h2>
      <p class="note">Oberbefehl im Frieden: Ministerium für Sicherheit und Verteidigung; im Verteidigungsfall die Kanzlerin oder der Kanzler. Jeder Einsatz jenseits von Notruf, Rettung und Sperrzonenschutz braucht einen Parlamentsbeschluss.</p>
      <div class="orow">${[['Raumflotte', '60 Bollwerk-Träger mit je 12 Nadeln (41.500)'], ['Fernwache', '25 Schiffe, Patrouille 6–8 Jahre (2.000)'], ['Randhafenschutz', 'Staffeln an Toren und Gateways (18.000)'], ['Objektschutz', 'Wachregimenter (90.000)'], ['Ausbildung, Logistik', 'Akademie, Depots (60.000)'], ['Amt für Sonderprojekte', 'geheime Wissenschaft, < 5.000']].map(([n, s]) => box(n, s, 'org4', n === 'Raumflotte' ? 'Das Militär: Solare Raumwache' : n === 'Fernwache' ? 'Fernwache' : n)).join('')}</div>
    </div>`;
  };

  // ---------- Zeitleiste ----------
  function timelineData() {
    const ev = [];
    const collect = (a, srcLabel) => { for (const bl of a.blocks) if (bl.t === 'table') { const head = bl.head.map(strip).map(x => x.toLowerCase()); const yi = head.findIndex(h => /jahr|zeitpunkt/.test(h)), ei = head.findIndex(h => /ereignis/.test(h)); if (yi < 0 || ei < 0) continue; const si = head.findIndex(h => /status/.test(h)); for (const r of bl.rows) ev.push({ y: strip(r[yi]), html: r[ei], status: si >= 0 ? strip(r[si]) : (a.user ? 'Entwurf' : 'Dossier'), src: a }); } };
    for (const id of T.timelineSources) { const a = W.articles.find(x => x.id === id); if (a) collect(a); }
    const mine = W.articles.find(x => x.id === 'u-zeitleiste-der-solarrepublik'); if (mine) collect(mine);
    const yearOf = s => { const m = s.match(/\d{4}/); if (m) return +m[0]; if (/2000er/.test(s)) return 2005; if (/20(\d)0er/.test(s)) return 2000 + 10 * (+s.match(/20(\d)0er/)[1]); return null; };
    // doppelte Einträge (Jahr + Text) zusammenfassen; Dossier hat Vorrang
    const seen = new Map();
    for (const e of ev) { e.year = yearOf(e.y); const k = e.y + '|' + fold(strip(e.html)).replace(/[^a-z0-9]/g, '').slice(0, 24); const o = seen.get(k); if (!o || strip(e.html).length > strip(o.html).length) seen.set(k, e); }
    return [...seen.values()].filter(e => e.year != null).sort((a, b) => a.year - b.year);
  }
  Tools.timeline = timelineData;
  Tools.pages.zeitleiste = () => {
    const b = begin('Zeitleiste', { sub: 'Alle datierten Ereignisse aus „Zeitleiste der Besiedlung“, „Zeitleiste der Ordnung“ und der Ergänzung „Zeitleiste der Solarrepublik“.' });
    const ev = timelineData();
    const eras = [['Alle', 0, 9999], ['bis 2100', 0, 2100], ['2100–2180 · Ausbau', 2100, 2180], ['2181–2229 · Kolonisation', 2181, 2229], ['ab 2230 · Gegenwart', 2230, 9999]];
    const minY = Math.min(...ev.map(e => e.year)), maxY = Math.max(...ev.map(e => e.year));
    const strip2 = `<svg class="tl-strip" viewBox="0 0 1000 46" preserveAspectRatio="none">${ev.map(e => `<line x1="${(e.year - minY) / (maxY - minY) * 990 + 5}" x2="${(e.year - minY) / (maxY - minY) * 990 + 5}" y1="8" y2="38" class="${/Dossier/.test(e.status) ? 'd' : 'e'}"/>`).join('')}<text x="4" y="46">${minY}</text><text x="996" y="46" text-anchor="end">${maxY}</text></svg>`;
    b.innerHTML = `<div class="tl-controls"><input id="tl-filter" class="filter" type="search" placeholder="Ereignis filtern …"><div class="subtabs" id="tl-eras">${eras.map((e, i) => `<a href="#" data-i="${i}" class="${i === 0 ? 'on' : ''}">${e[0]}</a>`).join('')}</div>
      <label><input type="checkbox" id="tl-d" checked> Dossier</label> <label><input type="checkbox" id="tl-e" checked> Ergänzungen</label> <span class="muted" id="tl-n"></span></div>${strip2}
      <div class="tl" id="tl">${ev.map(e => `<div class="tl-i ${/Dossier/.test(e.status) ? 'd' : 'e'}" data-y="${e.year}" data-t="${esc(fold(e.y + ' ' + strip(e.html)))}"><div class="tl-y">${esc(e.y)}</div><div class="tl-dot"></div><div class="tl-c">${e.html}<small>${esc(e.status)}</small></div></div>`).join('')}</div>`;
    let era = 0;
    const apply = () => { const q = fold($('#tl-filter').value.trim()), d = $('#tl-d').checked, ee = $('#tl-e').checked; let n = 0; $$('.tl-i').forEach(el => { const y = +el.dataset.y; const ok = y >= eras[era][1] && y <= eras[era][2] && (!q || el.dataset.t.includes(q)) && (el.classList.contains('d') ? d : ee); el.hidden = !ok; if (ok) n++; }); $('#tl-n').textContent = n + ' Ereignisse'; };
    $('#tl-filter').addEventListener('input', apply); $('#tl-d').addEventListener('change', apply); $('#tl-e').addEventListener('change', apply);
    $$('#tl-eras a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); era = +a.dataset.i; $$('#tl-eras a').forEach(x => x.classList.toggle('on', x === a)); apply(); }));
    apply();
  };

  // ---------- Route ----------
  Tools.route = parts => {
    const fn = Tools.pages[parts[0]];
    if (!fn) return false;
    fn(parts.slice(1));
    window.scrollTo(0, 0);
    return true;
  };
})();
