/* Diagramme, Rechner, Kategorien, Lesezeichen, Qualitätsübersicht. */
(function () {
  'use strict';
  const T = window.TOOLS, Tools = window.Tools, W = window.WIKI;
  if (!T || !Tools) return;
  const esc = Tools.esc, strip = Tools.strip;
  const fmt = (n, d = 2) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: d });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const num = s => { const m = String(s).replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 0; };
  const mult = s => /Mrd/.test(s) ? 1e9 : /Mio/.test(s) ? 1e6 : /Tsd/.test(s) ? 1e3 : 1;

  // ---------- Diagramme ----------
  function bars(items, { log = false, unit = '', max } = {}) {
    const vals = items.map(i => i.v).filter(v => v > 0);
    const mx = max || Math.max(...vals), mn = Math.min(...vals);
    const w = v => v <= 0 ? 0 : log ? Math.max(2, 100 * (Math.log10(v) - Math.log10(mn / 3)) / (Math.log10(mx) - Math.log10(mn / 3))) : Math.max(1, 100 * v / mx);
    return `<div class="bars">${items.map(i => `<div class="bar ${i.cls || ''}"><span class="bl">${i.label}</span><span class="bt"><i style="width:${w(i.v)}%"></i></span><span class="bv">${esc(i.txt != null ? i.txt : fmt(i.v) + unit)}</span></div>`).join('')}</div>`;
  }
  Tools.pages.diagramme = () => {
    const b = Tools.begin('Diagramme', { tab: 'Diagramm', sub: 'Vergleichsdiagramme, direkt aus den Tabellen der Dossiers berechnet. Klick auf einen Namen öffnet den Artikel.' });
    const worlds = T.worlds.filter(w => w.pop).sort((a, b2) => b2.pop - a.pop).map(w => ({ label: Tools.link(w.name), v: w.pop, txt: w.popText, cls: /atembar/.test(w.status) ? 'g' : /terraform/.test(w.status) ? 'y' : '' }));
    const rev = T.companies.map(c => ({ c, v: num(c.revenue) })).filter(x => x.v > 0).sort((a, b2) => b2.v - a.v).slice(0, 20).map(x => ({ label: Tools.link(x.c.name), v: x.v, txt: fmt(x.v, 1) + ' Mrd. Cr' }));
    const staff = T.companies.map(c => ({ c, v: num(c.staff) * mult(c.staff) })).filter(x => x.v > 0).sort((a, b2) => b2.v - a.v).slice(0, 20).map(x => ({ label: Tools.link(x.c.name), v: x.v, txt: x.c.staff }));
    const ships = T.ships.map(s => ({ label: Tools.link(s.name + '-Klasse', s.name) , v: num(s.length) * (/km/.test(s.length) ? 1000 : 1), txt: s.length, cls: s.drive.replace(/[^A-Za-z]/g, '').toLowerCase().slice(0, 4) })).sort((a, b2) => b2.v - a.v);
    const sol = T.matrix.names.indexOf('Sol');
    const trips = T.matrix.names.map((n, i) => ({ n, i })).filter(x => x.i !== sol).map(x => ({ label: Tools.link(x.n), v: T.matrix.days[sol][x.i], txt: `${T.matrix.days[sol][x.i]} d (Karawane 20c) · ${Math.round(T.matrix.days[sol][x.i] / 5)} d (Windhund 100c) · ${fmt(T.matrix.ly[sol][x.i], 1)} ly` })).sort((a, b2) => a.v - b2.v);
    const solar = T.solar.filter(s => s.pop).sort((a, b2) => b2.pop - a.pop).map(s => ({ label: Tools.link(s.name), v: s.pop, txt: s.popText }));
    const freight = T.lines.map(l => ({ label: `<b>${esc(l.id)}</b> ${esc(l.from)} – ${esc(l.to)}`, v: (l.mtOut || 0) + (l.mtBack || 0), txt: l.freight + ' Mt/Jahr', cls: l.from === 'Sol' ? 'g' : 'y' })).sort((a, b2) => b2.v - a.v);
    const sec = (t, src, html) => `<section class="chart"><h2 class="sec">${t}</h2><p class="note">Quelle: ${src}</p>${html}</section>`;
    b.innerHTML =
      sec('Einwohner der bewohnten Welten (logarithmische Skala)', Tools.link('Bewohnte Welten und kolonisierbare Planeten', 'Bewohnte Welten, Überblick') + ' · grün = atembare Luft, gelb = terraformbar', bars(worlds, { log: true })) +
      sec('Reisezeit ab Sol zu den Nachbarsystemen', Tools.link('Das Liniennetz'), bars(trips)) +
      sec('Fracht je Linie (Mt/Jahr, hin + zurück)', Tools.link('Das Liniennetz') + ' · grün = Sol-Linien, gelb = Verbindungen der Nachbarsysteme', bars(freight)) +
      sec('Umsatz der 20 größten Firmen (Mrd. Cr)', Tools.link('Verzeichnis nach Sektoren'), bars(rev)) +
      sec('Beschäftigte der 20 größten Firmen', Tools.link('Verzeichnis nach Sektoren'), bars(staff, { log: false })) +
      sec('Besiedlung des Sonnensystems (Einwohner, logarithmisch)', Tools.link('Besiedlung im Überblick'), bars(solar, { log: true })) +
      sec('Länge der 34 Schiffsklassen', Tools.link('Gesamtübersicht der 34 Klassen'), bars(ships, { log: true }));
  };

  // ---------- Rechner ----------
  const C = T.constants;
  Tools.pages.rechner = () => {
    const b = Tools.begin('Rechner', { tab: 'Rechner', sub: 'Berechnungen mit den Konstanten und Regeln der Dossiers (Sperrzonenformel, FTL-Faktoren, Standardstrecke Erde–Mond) und realer Physik.' });
    const sysOpts = T.matrix.names.filter(n => n !== 'Sol').map((n, i) => `<option value="${T.matrix.ly[T.matrix.names.indexOf('Sol')][T.matrix.names.indexOf(n)]}">${n} (${fmt(T.matrix.ly[T.matrix.names.indexOf('Sol')][T.matrix.names.indexOf(n)], 1)} ly)</option>`).join('') + T.systems.filter(s => !T.matrix.names.includes(s.name) && s.ly).map(s => `<option value="${s.ly}">${s.name} (${fmt(s.ly, 1)} ly)</option>`).join('') + `<option value="101.4">TOI-700 d (101,4 ly)</option>`;
    b.innerHTML = `<div class="calc-grid">
      <section class="calc"><h3>Reisezeit (FTL)</h3>
        <label>Ziel <select id="c1-sel"><option value="">eigene Entfernung</option>${sysOpts}</select></label>
        <label>Entfernung (ly) <input id="c1-d" type="number" step="any" value="4.2"></label>
        <label>Geschwindigkeit <select id="c1-v"><option value="20">Karawane 20c</option><option value="40">Landnahme 40c</option><option value="100" selected>Windhund 100c</option><option value="120">Meridian 120c (Prototyp)</option></select></label>
        <div class="res" id="c1-r"></div><p class="note">Reiner FTL-Flug, ohne Anflug und Abfertigung (wie im Dossier „Das Liniennetz“). Bei Sol–Proxima: 77 d bei 20c.</p></section>
      <section class="calc"><h3>Beschleunigung (Umkehrflug)</h3>
        <label>Strecke <input id="c2-d" type="number" step="any" value="384400"> <select id="c2-u"><option value="1">km</option><option value="149597870.7">AE</option></select></label>
        <label>Beschleunigung (g) <input id="c2-a" type="number" step="any" value="1.3"></label>
        <div class="res" id="c2-r"></div><p class="note">Halbe Strecke beschleunigen, halbe bremsen (Umdrehung in der Mitte). Voreinstellung = Standardstrecke Erde–Mond: ≈ 3 h bei 1,3 g (Dossier).</p></section>
      <section class="calc"><h3>Zeitdilatation (Sublicht)</h3>
        <label>Geschwindigkeit (Anteil von c) <input id="c3-v" type="number" step="any" value="0.5" min="0" max="0.9999"></label>
        <label>Dauer im System (Jahre) <input id="c3-t" type="number" step="any" value="10"></label>
        <div class="res" id="c3-r"></div><p class="note">γ = 1/√(1−v²/c²). Pionen-Antrieb: typisch 0,03–0,08c, Konstruktionsmaximum 0,5c, Rekord 0,8c.</p></section>
      <section class="calc"><h3>Sperrzonenradius</h3>
        <label>Masse (M⊕) <input id="c4-m" type="number" step="any" value="1"> <select id="c4-sel"><option value="">eigene</option><option value="1">Erde</option><option value="0.0123">Mond</option><option value="0.055">Merkur</option><option value="0.107">Mars</option><option value="0.815">Venus</option><option value="317.8">Jupiter</option></select></label>
        <div class="res" id="c4-r"></div><p class="note">R = R₀ · (Mp / M⊕)^(1/3) mit R₀ = 2 Mio. km (Dossier „Grundlagen der Sperrzonen“). Die Sonne: ≈ 0,93 AE nach § 3 SperrZG.</p></section>
      <section class="calc"><h3>Entfernungen und Lichtlaufzeit</h3>
        <label>Wert <input id="c5-v" type="number" step="any" value="1"> <select id="c5-u"><option value="1">km</option><option value="149597870.7" selected>AE</option><option value="9460730472580.8">ly</option></select></label>
        <div class="res" id="c5-r"></div></section>
      <section class="calc"><h3>Credits</h3>
        <label>Betrag (Cr) <input id="c6-v" type="number" step="any" value="3000"></label>
        <div class="res" id="c6-r"></div><p class="note">Kaufkraft-Richtwert des Autors: 1 Cr ≈ 0,5 € (Preise wie im heutigen Europa bei ≈ 80.000 Cr je Kopf). Passage: 3.000–15.000 Cr.</p></section>
    </div>`;
    const v = id => parseFloat($(id).value) || 0, set = (id, h) => { $(id).innerHTML = h; };
    const t = s => s < 3600 ? fmt(s / 60, 1) + ' min' : s < 86400 * 2 ? fmt(s / 3600, 2) + ' h' : s < 86400 * 400 ? fmt(s / 86400, 1) + ' Tage' : fmt(s / 86400 / C.year_d, 2) + ' Jahre';
    const c1 = () => { const d = v('#c1-d'), f = v('#c1-v'); const days = d * C.year_d / f; set('#c1-r', `<b>${fmt(days, 1)} Tage</b> (${fmt(days / C.year_d, 2)} Jahre)`); };
    $('#c1-sel').addEventListener('change', e => { if (e.target.value) $('#c1-d').value = e.target.value; c1(); }); $('#c1-d').addEventListener('input', c1); $('#c1-v').addEventListener('change', c1); c1();
    const c2 = () => { const d = v('#c2-d') * parseFloat($('#c2-u').value) * 1000, a = v('#c2-a') * C.g; if (!d || !a) return set('#c2-r', ''); const tt = 2 * Math.sqrt(d / a), vm = a * tt / 2; set('#c2-r', `Flugzeit <b>${t(tt)}</b><br>Spitzengeschwindigkeit ${fmt(vm / 1000, 1)} km/s (${fmt(vm / 1000 / C.c_kms * 100, 3)} % c)`); };
    ['#c2-d', '#c2-a'].forEach(i => $(i).addEventListener('input', c2)); $('#c2-u').addEventListener('change', c2); c2();
    const c3 = () => { const b2 = v('#c3-v'); if (b2 <= 0 || b2 >= 1) return set('#c3-r', 'Wert zwischen 0 und 1'); const g = 1 / Math.sqrt(1 - b2 * b2); set('#c3-r', `γ = <b>${fmt(g, 4)}</b><br>Bordzeit: ${fmt(v('#c3-t') / g, 2)} Jahre bei ${fmt(v('#c3-t'), 2)} Jahren Systemzeit`); };
    ['#c3-v', '#c3-t'].forEach(i => $(i).addEventListener('input', c3)); c3();
    const c4 = () => { const r = C.zoneR0_km * Math.cbrt(v('#c4-m')); set('#c4-r', `Radius <b>${fmt(r / 1e6, 3)} Mio. km</b> (${fmt(r / C.au_km, 4)} AE; ${fmt(r / 384400, 1)} Monddistanzen)`); };
    $('#c4-sel').addEventListener('change', e => { if (e.target.value) $('#c4-m').value = e.target.value; c4(); }); $('#c4-m').addEventListener('input', c4); c4();
    const c5 = () => { const km = v('#c5-v') * parseFloat($('#c5-u').value); set('#c5-r', `${fmt(km, 0)} km<br>${fmt(km / C.au_km, 4)} AE · ${fmt(km / C.ly_km, 6)} ly<br>Licht braucht ${t(km / C.c_kms)}`); };
    $('#c5-v').addEventListener('input', c5); $('#c5-u').addEventListener('change', c5); c5();
    const c6 = () => set('#c6-r', `≈ <b>${fmt(v('#c6-v') * C.credit_eur, 0)} €</b> Kaufkraft`); $('#c6-v').addEventListener('input', c6); c6();
  };

  // ---------- Kategorien und A–Z ----------
  function catOf(a) { if (a.user) return (a.category || 'Eigene Artikel').split('·')[0].trim() || 'Eigene Artikel'; return null; }
  Tools.pages.kategorien = parts => {
    const b = Tools.begin('Kategorien und A–Z', { tab: 'Verzeichnis' });
    const cats = new Map();
    for (const a of W.articles) { if (a.kind === 'doc') continue; const c = catOf(a) || 'Dossier: ' + (W.docs.find(d => d.id === (W.articles.find(x => x.kind === 'doc' && x.doc === a.doc) || {}).id) || { title: a.docTitle }).title; if (!cats.has(c)) cats.set(c, []); cats.get(c).push(a); }
    const own = [...cats.keys()].filter(c => !c.startsWith('Dossier:')).sort(), dos = [...cats.keys()].filter(c => c.startsWith('Dossier:')).sort();
    const sel = parts[0] === 'az' ? null : parts[0] ? decodeURIComponent(parts[0]) : null;
    const nav = `<div class="subtabs"><a class="${!sel ? 'on' : ''}" href="#/kategorien">Alle Kategorien</a><a class="${parts[0] === 'az' ? 'on' : ''}" href="#/kategorien/az">A–Z</a></div>`;
    if (parts[0] === 'az') {
      const list = W.articles.filter(a => a.kind !== 'part').sort((x, y) => x.title.localeCompare(y.title, 'de'));
      const letters = [...new Set(list.map(a => a.title.replace(/^[^A-Za-zÄÖÜäöü0-9]+/, '')[0].toUpperCase()))];
      b.innerHTML = nav + `<div class="azbar">${letters.map(l => `<a href="#" data-l="${l}">${l}</a>`).join('')}</div><ul class="azlist">${list.map(a => `<li data-l="${esc(a.title.replace(/^[^A-Za-zÄÖÜäöü0-9]+/, '')[0].toUpperCase())}"><a href="#/a/${a.id}">${esc(a.title)}</a> <small>${esc(a.docTitle)}</small></li>`).join('')}</ul>`;
      $$('.azbar a', b).forEach(a => a.addEventListener('click', e => { e.preventDefault(); const t = $(`.azlist li[data-l="${a.dataset.l}"]`); if (t) t.scrollIntoView(); }));
      return;
    }
    if (sel && cats.has(sel)) { b.innerHTML = nav + `<h2 class="sec">${esc(sel)} <span class="count">${cats.get(sel).length} Artikel</span></h2><ul class="azlist">${cats.get(sel).sort((x, y) => x.title.localeCompare(y.title, 'de')).map(a => `<li><a href="#/a/${a.id}">${esc(a.title)}</a></li>`).join('')}</ul>`; return; }
    const li = c => `<li><a href="#/kategorien/${encodeURIComponent(c)}">${esc(c.replace(/^Dossier: /, ''))}</a> <span class="count">${cats.get(c).length}</span></li>`;
    b.innerHTML = nav + `<h2 class="sec">Ergänzungsartikel nach Kategorie</h2><ul class="catlist">${own.map(li).join('')}</ul><h2 class="sec">Artikel nach Dossier</h2><ul class="catlist">${dos.map(li).join('')}</ul>`;
  };

  // ---------- Lesezeichen und Verlauf ----------
  Tools.pages.lesezeichen = () => {
    const sp = window.__sp, b = Tools.begin('Lesezeichen und Verlauf', { tab: 'Persönlich', sub: 'Wird nur auf diesem Rechner gespeichert.' });
    const bm = sp.store.get('bookmarks', []).filter(id => sp.byId.has(id)), vis = sp.store.get('visited', []).filter(id => sp.byId.has(id));
    const item = (id, rm) => `<li><a href="#/a/${id}">${esc(sp.byId.get(id).title)}</a> <small>${esc(sp.byId.get(id).docTitle)}</small>${rm ? ` <a href="#" class="rm" data-id="${id}" title="entfernen">✕</a>` : ''}</li>`;
    b.innerHTML = `<h2 class="sec">★ Lesezeichen (${bm.length})</h2>${bm.length ? `<ul class="azlist">${bm.map(id => item(id, true)).join('')}</ul>` : '<p class="muted">Noch keine Lesezeichen. Auf jeder Artikelseite gibt es oben „☆ Merken“.</p>'}
      <h2 class="sec">Zuletzt gelesen (${vis.length})</h2>${vis.length ? `<ul class="azlist">${vis.map(id => item(id, false)).join('')}</ul><p><a href="#" id="clr">Verlauf löschen</a></p>` : '<p class="muted">Noch nichts gelesen.</p>'}`;
    $$('.rm', b).forEach(a => a.addEventListener('click', e => { e.preventDefault(); sp.toggleBookmark(a.dataset.id); Tools.pages.lesezeichen(); }));
    const c = $('#clr', b); if (c) c.addEventListener('click', e => { e.preventDefault(); sp.store.set('visited', []); Tools.pages.lesezeichen(); });
  };

  // ---------- Qualitätsübersicht ----------
  Tools.pages.qualitaet = () => {
    const sp = window.__sp, b = Tools.begin('Qualitätsübersicht', { tab: 'Verzeichnis', sub: 'Hilft, schwach vernetzte Artikel und offene Verlinkungen zu finden.' });
    const arts = W.articles.filter(a => a.kind === 'article');
    const words = a => a.search.reduce((n, s) => n + (s.text || '').split(/\s+/).length, 0);
    const orphans = arts.filter(a => !(sp.backlinks.get(a.id) || new Set()).size);
    const noOut = arts.filter(a => !(sp.outLinks.get(a.id) || []).length && words(a) > 60);
    const top = arts.slice().sort((x, y) => (sp.backlinks.get(y.id) || new Set()).size - (sp.backlinks.get(x.id) || new Set()).size).slice(0, 15);
    const long = arts.slice().sort((x, y) => words(y) - words(x)).slice(0, 10);
    const list = a => `<li><a href="#/a/${a.id}">${esc(a.title)}</a> <small>${esc(a.docTitle)}</small></li>`;
    const broken = window.__userBroken || {};
    const total = W.articles.reduce((n, a) => n + words(a), 0);
    b.innerHTML = `<div class="cards stat"><div class="card"><span class="card-ref">Artikel</span><span class="card-title">${W.articles.length}</span></div><div class="card"><span class="card-ref">Wörter</span><span class="card-title">${fmt(total, 0)}</span></div><div class="card"><span class="card-ref">Verlinkte Artikel</span><span class="card-title">${arts.length - orphans.length} / ${arts.length}</span></div><div class="card"><span class="card-ref">Glossar-Begriffe</span><span class="card-title">${T.glossary.length}</span></div></div>
      <h2 class="sec">Am meisten verlinkt</h2><ul class="azlist cols2">${top.map(a => `<li><a href="#/a/${a.id}">${esc(a.title)}</a> <span class="count">${(sp.backlinks.get(a.id) || new Set()).size}</span></li>`).join('')}</ul>
      <h2 class="sec">Längste Artikel</h2><ul class="azlist cols2">${long.map(a => `<li><a href="#/a/${a.id}">${esc(a.title)}</a> <span class="count">${fmt(words(a), 0)} Wörter</span></li>`).join('')}</ul>
      <h2 class="sec">Verwaiste Artikel (nichts verlinkt hierher) – ${orphans.length}</h2><ul class="azlist cols2">${orphans.slice(0, 150).map(list).join('')}</ul>
      <h2 class="sec">Artikel ohne ausgehende Links – ${noOut.length}</h2><ul class="azlist cols2">${noOut.slice(0, 100).map(list).join('')}</ul>
      <h2 class="sec">Nicht auflösbare Links in Ergänzungsartikeln</h2>${Object.keys(broken).length ? `<ul class="azlist">${Object.entries(broken).map(([id, l]) => `<li><a href="#/a/${id}">${esc(id)}</a>: ${esc(l.join(', '))}</li>`).join('')}</ul>` : '<p class="muted">Keine.</p>'}`;
  };
})();
