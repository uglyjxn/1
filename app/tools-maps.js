/* Karten und Diagramme (SVG). Datengrundlage: window.TOOLS, abgeleitet aus den Dossiers. */
(function () {
  'use strict';
  const T = window.TOOLS, Tools = window.Tools;
  if (!T || !Tools) return;
  const esc = Tools.esc;
  const svgLink = (name, inner, cls = '') => { const h = Tools.href(name); return h ? `<a href="${h}" class="${cls}">${inner}</a>` : `<g class="${cls}">${inner}</g>`; };
  const popNum = t => { const m = String(t).replace(/\./g, '').replace(',', '.').match(/[\d.]+/); if (!m) return 0; const v = parseFloat(m[0]); return /Mrd/.test(t) ? v * 1e9 : /Mio/.test(t) ? v * 1e6 : /Tsd/.test(t) ? v * 1e3 : v; };
  const fmt = n => String(n).replace('.', ',');
  const statusClass = s => /Konzernkolonie/.test(s) ? 'kon' : /Konzession/.test(s) ? 'kz' : /Vermessung/.test(s) ? 'vm' : 'terr';

  // ---------- Sternkarte ----------
  function starNodes() {
    const core = T.starmap.core.map(c => { const s = T.systems.find(x => x.name === c.name); return { name: c.name, x: c.x, y: -c.y, ly: c.name === 'Sol' ? 0 : (s ? s.ly : Math.hypot(c.x, c.y)), status: c.name === 'Sol' ? 'Sol' : (s ? s.status : 'Territorium'), pop: s ? popNum(s.popText) : 8.4e9, owner: s ? s.owner : '' }; });
    const names = new Set(core.map(c => c.name));
    const extra = T.starmap.extra.map(e => { const s = T.systems.find(x => x.name === e.name); return { name: e.name, x: Math.cos(e.angle) * e.ly, y: Math.sin(e.angle) * e.ly, ly: e.ly, status: s.status, pop: popNum(s.popText), owner: s.owner, extra: true }; });
    return core.concat(extra.filter(e => !names.has(e.name)));
  }
  Tools.pages.karte = parts => {
    const which = parts[0] || 'stern';
    const fn = { stern: starMap, sonnensystem: solarMap, handel: tradeMap, toi700d: toiMap }[which] || starMap;
    fn(parts[1]);
  };
  const mapTabs = which => `<div class="subtabs">${[['stern', 'Sternkarte'], ['handel', 'Handelsnetz'], ['sonnensystem', 'Sonnensystem'], ['toi700d', 'TOI-700 d']].map(([k, n]) => `<a class="${k === which ? 'on' : ''}" href="#/karte/${k}">${n}</a>`).join('')}</div>`;

  function starMap(mode) {
    const full = mode === 'voll';
    const b = Tools.begin('Sternkarte', { tab: 'Karte', sub: 'Schematische Projektion: Die sieben Systeme mit bekannter Entfernungsmatrix sind aus ihren gegenseitigen Entfernungen berechnet (klassische MDS, mittlere Abweichung ' + Math.round(T.starmap.meanError * 100) + ' %); für die übrigen Systeme ist nur die Entfernung zu Sol bekannt, die Richtung ist frei gewählt. Quellen: Handelslinien (Entfernungen), Sternkarte und Koloniewelten (Nahbereich).' });
    const nodes = starNodes().filter(n => full || n.ly <= 21);
    const maxLy = full ? 50 : 21, R = 400, sc = R / maxLy, cx = 500, cy = 440;
    const rings = (full ? [10, 20, 30, 40, 50] : [5, 10, 15, 20]).map(r => `<circle cx="${cx}" cy="${cy}" r="${r * sc}" class="ring"/><text x="${cx + r * sc + 4}" y="${cy - 3}" class="rl">${r} ly</text>`).join('');
    const spokes = nodes.filter(n => n.name !== 'Sol').map(n => `<line x1="${cx}" y1="${cy}" x2="${cx + n.x * sc}" y2="${cy + n.y * sc}" class="spoke"/>`).join('');
    const rad = p => Math.max(7, Math.min(26, 5 + Math.sqrt(p / 1e6) * 1.3));
    const dots = nodes.map(n => { const x = cx + n.x * sc, y = cy + n.y * sc, r = n.name === 'Sol' ? 12 : rad(n.pop); const cls = n.name === 'Sol' ? 'sol' : statusClass(n.status);
      return svgLink(n.name, `<circle cx="${x}" cy="${y}" r="${r}" class="sn ${cls}"/><text x="${x}" y="${y - r - 5}" text-anchor="middle" class="sl">${esc(n.name)}</text><text x="${x}" y="${y + r + 13}" text-anchor="middle" class="sd">${n.name === 'Sol' ? '' : fmt(n.ly) + ' ly'}</text><title>${esc(n.name)}${n.ly ? ' · ' + fmt(n.ly) + ' ly' : ''} · ${esc(n.status)}${n.owner ? ' · ' + esc(n.owner) : ''}</title>`); }).join('');
    b.innerHTML = mapTabs('stern') + `<div class="subtabs"><a class="${full ? '' : 'on'}" href="#/karte/stern">Nahbereich (≤ 21 ly)</a><a class="${full ? 'on' : ''}" href="#/karte/stern/voll">Ganzer Nahbereich (≤ 50 ly)</a></div>
      <div class="mapbox"><svg viewBox="0 0 1000 880" class="map">${rings}${spokes}${dots}</svg></div>
      <div class="legend2"><span><i class="sn terr"></i>Territorium</span><span><i class="sn kz"></i>Konzessionskolonie</span><span><i class="sn kon"></i>Konzernkolonie</span><span><i class="sn vm"></i>in Vermessung</span><span>Kreisgröße ∝ Einwohner</span></div>
      <p class="note">Die Karte ist kein Sternenatlas: Winkel und Höhe (z) sind nur für die Kernsysteme als Projektion aus der Entfernungstabelle zu verstehen. Weitere Daten: <a href="#/register/welten">Register Welten und Orte</a>.</p>`;
  }

  function tradeMap() {
    const b = Tools.begin('Handelsnetz', { tab: 'Karte', sub: 'Die zwölf Linien des Handelsdossiers auf der Projektion der sechs Nachbarsysteme. Linienbreite ∝ Fracht (Mt/Jahr, hin + zurück; Setzungen). Quelle: Handel und Handelslinien, „Das Liniennetz“.' });
    const core = T.starmap.core, pos = n => core.find(c => c.name === n), sc = 36, cx = 480, cy = 330;
    const P = n => { const c = pos(n); return c ? [cx + c.x * sc, cy - c.y * sc] : null; };
    const maxMt = Math.max(...T.lines.map(l => (l.mtOut || 0) + (l.mtBack || 0)));
    const lines = T.lines.map(l => { const a = P(l.from), z = P(l.to); if (!a || !z) return ''; const w = 1.5 + 12 * ((l.mtOut || 0) + (l.mtBack || 0)) / maxMt; const mx = (a[0] + z[0]) / 2, my = (a[1] + z[1]) / 2; const sol = l.from === 'Sol';
      return svgLink('Das Liniennetz', `<line x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}" class="tl ${sol ? 'sol' : 'nb'}" style="stroke-width:${w}px"/><text x="${mx}" y="${my - 6}" text-anchor="middle" class="ll">${esc(l.id)}</text><title>${esc(l.id + ' ' + l.name + ': ' + l.from + ' – ' + l.to + ', ' + fmt(l.ly) + ' ly, 20c/100c: ' + l.days + ', Fracht ' + l.freight + ' Mt/Jahr, Güter: ' + l.goods)}</title>`); }).join('');
    const nodes = core.map(c => { const [x, y] = P(c.name); return svgLink(c.name, `<circle cx="${x}" cy="${y}" r="${c.name === 'Sol' ? 13 : 10}" class="sn ${c.name === 'Sol' ? 'sol' : 'terr'}"/><text x="${x}" y="${y - 16}" text-anchor="middle" class="sl">${esc(c.name)}</text>`); }).join('');
    b.innerHTML = mapTabs('handel') + `<div class="mapbox"><svg viewBox="0 0 1000 640" class="map">${lines}${nodes}</svg></div>
      <div class="legend2"><span><i class="ln sol"></i>Sol-Linien (L1–L6)</span><span><i class="ln nb"></i>Verbindungen zwischen Nachbarsystemen (N1–N6)</span></div>
      <h2 class="sec">Die Linien im Einzelnen</h2>
      <input class="filter" data-for="t-l" type="search" placeholder="Filtern …"><div class="tablewrap"><table class="wikitable sortable" id="t-l"><thead><tr><th>Linie</th><th>Strecke</th><th>Länge (ly)</th><th>20c / 100c</th><th>Fracht Mt/Jahr hin / zurück</th><th>Güter</th></tr></thead><tbody>${T.lines.map(l => `<tr><td><b>${esc(l.id)}</b> ${esc(l.name)}</td><td>${Tools.link(l.from)} – ${Tools.link(l.to)}</td><td><span data-v="${l.ly}">${fmt(l.ly)}</span></td><td>${esc(l.days)}</td><td><span data-v="${(l.mtOut || 0) + (l.mtBack || 0)}">${esc(l.freight)}</span></td><td>${esc(l.goods)}</td></tr>`).join('')}</tbody></table></div>`;
    document.querySelectorAll('input.filter[data-for]').forEach(inp => inp.addEventListener('input', () => { const q = Search.fold(inp.value.trim()).t; document.querySelectorAll('#' + inp.dataset.for + ' tbody tr').forEach(tr => { tr.hidden = q && !Search.fold(tr.textContent).t.includes(q); }); }));
    window.__sp.enhance(b);
  }

  // ---------- Sonnensystem (logarithmisch) ----------
  function solarMap() {
    const b = Tools.begin('Karte des Sonnensystems', { tab: 'Karte', sub: 'Bahnradien logarithmisch. Merkur bis Mars: Bahnradien aus „Bewohnte Welten“; äußere Planeten und Ceres: astronomische Standardwerte (Dossiers nennen sie nicht). Die Winkelpositionen sind schematisch. Blasenfläche ∝ Einwohner (Besiedlung im Überblick).' });
    const cx = 500, cy = 430, r = au => 150 * Math.log10(au / 0.25) + 40;
    const bodies = T.bodies.map(x => { const o = T.orbits.find(q => q.name && q.name.startsWith(x.name)); return { ...x, au: o && o.au ? o.au : x.au, std: o && o.au ? false : x.std }; });
    const pop = { Erde: 8.4e9, Mars: 68e6, Venus: 7.5e6, Merkur: 1.6e6, Ceres: 30e6, Jupiter: 5.8e6, Saturn: 1.6e6, Neptun: 60e3, Pluto: 40e3, Uranus: 0 };
    const link = { Erde: 'Erde, Mond und Erdorbit', Mars: 'Mars', Venus: 'Venus', Merkur: 'Merkur', Ceres: 'Asteroidengürtel und Trojaner: Ressourcenstationen', Jupiter: 'Jupiter-System', Saturn: 'Saturn-System', Uranus: 'Uranus, Neptun und Triton', Neptun: 'Uranus, Neptun und Triton', Pluto: 'Kuipergürtel und Pluto' };
    const note = { Ceres: 'Gürtel & Trojaner · 30 Mio.', Jupiter: 'Kallisto, Ganymed · 5,8 Mio.', Saturn: 'Titan · 1,6 Mio.', Erde: 'mit Luna 47 Mio. und Orbit 38 Mio.', Neptun: 'mit Uranus, Triton · 60 Tsd.', Pluto: 'Kuipergürtel · 40 Tsd.' };
    const ang = { Merkur: -30, Venus: 200, Erde: 60, Mars: 300, Ceres: 150, Jupiter: 20, Saturn: 235, Uranus: 100, Neptun: 330, Pluto: 190 };
    const orbits = bodies.map(x => `<circle cx="${cx}" cy="${cy}" r="${r(x.au)}" class="orb"/>`).join('');
    const zone = `<circle cx="${cx}" cy="${cy}" r="${r(0.93)}" class="zone"/><text x="${cx}" y="${cy - r(0.93) - 6}" text-anchor="middle" class="zl">Stellare Sperrzone ≈ 0,93 AE</text>`;
    const belt = `<circle cx="${cx}" cy="${cy}" r="${(r(2.2) + r(3.3)) / 2}" class="belt" style="stroke-width:${r(3.3) - r(2.2)}px"/>`;
    const pl = bodies.map(x => { const a = ang[x.name] * Math.PI / 180, rr = r(x.au), px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr, rad = x.name === 'Erde' ? 14 : Math.max(5, Math.min(13, 4 + Math.sqrt((pop[x.name] || 0) / 1e6))); const nt = note[x.name] || '';
      return svgLink(link[x.name], `<circle cx="${px}" cy="${py}" r="${rad}" class="sn ${pop[x.name] ? 'terr' : 'vm'}"/><text x="${px}" y="${py - rad - 4}" text-anchor="middle" class="sl">${x.name}</text><text x="${px}" y="${py + rad + 12}" text-anchor="middle" class="sd">${fmt(x.au)} AE${x.std ? '*' : ''}${nt ? ' · ' + esc(nt) : ''}</text><title>${x.name}: ${fmt(x.au)} AE${x.std ? ' (Standardwert)' : ' (Dossier)'}${nt ? ' · ' + nt : ''}</title>`); }).join('');
    b.innerHTML = mapTabs('sonnensystem') + `<div class="mapbox"><svg viewBox="0 0 1000 880" class="map"><circle cx="${cx}" cy="${cy}" r="9" class="sn sol"/>${belt}${orbits}${zone}${pl}</svg></div><p class="note">* astronomischer Standardwert. Die Dossier-Zeitleiste nennt zudem Ganymed (seit 2147), Kallisto (2131), Titan (2166) als besiedelte Monde.</p>`;
  }

  // ---------- TOI-700 d ----------
  function toiMap() {
    const b = Tools.begin('TOI-700 d', { tab: 'Karte', sub: 'Gebunden rotierende Welt: Der Planet zeigt dem Stern immer dieselbe Seite. Ansicht vom Substellarpunkt (Mitte = Stern im Zenit); Radius ∝ Winkel. Quelle: Hauptbericht des Teams vom 24. August 2235.' });
    const bands = [
      { n: 'Sonnenseite', a: 0, z: 55, c: 'sun', t: 'bis +45 °C · Hitzesteppe, Krusten, Salzpfannen · 21 % der Fläche', link: 'Der Bericht des Teams (Hauptbericht, 24. August 2235)' },
      { n: 'Innerer Ring · Schirmwald', a: 55, z: 68, c: 'r1', t: '≈ 38 Arten' },
      { n: 'Mittlerer Ring · Dämmerwald', a: 68, z: 85, c: 'r2', t: '≈ 62 Arten, größte Vielfalt' },
      { n: 'Äußerer Ring · Randwald', a: 85, z: 95, c: 'r3', t: '≈ 18 Arten' },
      { n: 'Eisrand', a: 95, z: 110, c: 'ice1', t: 'Eisalgen, Mikrobenmatten' },
      { n: 'Schattenseite', a: 110, z: 180, c: 'ice2', t: 'bis −40 °C · Eisschild 40–900 m · 46 % der Fläche' },
    ];
    const cx = 380, cy = 380, k = 340 / 180;
    const rings = bands.slice().reverse().map(x => `<circle cx="${cx}" cy="${cy}" r="${x.z * k}" class="zb ${x.c}"/>`).join('');
    const marks = [55, 95].map(a => `<circle cx="${cx}" cy="${cy}" r="${a * k}" class="zm"/><text x="${cx + a * k + 4}" y="${cy - 4}" class="rl">${a}°</text>`).join('');
    b.innerHTML = mapTabs('toi700d') + `<div class="toi"><svg viewBox="0 0 760 760" class="map">${rings}${marks}<circle cx="${cx}" cy="${cy}" r="7" class="sn sol"/><text x="${cx}" y="${cy - 14}" text-anchor="middle" class="sl">Stern im Zenit</text></svg>
      <div class="toil"><h3 style="margin-top:0">Zonen</h3><table class="wikitable"><thead><tr><th>Zone</th><th>Winkel</th><th>Merkmale</th></tr></thead><tbody>${bands.map(x => `<tr><td><i class="zsw ${x.c}"></i> <b>${esc(x.n)}</b></td><td>${x.a}–${x.z}°</td><td>${esc(x.t)}</td></tr>`).join('')}</tbody></table>
      <p class="note">Ring (55–95°): −5 bis +20 °C, Wälder, Seen, drei Randmeere; Land ≈ 61 Mio. km², Wasser ≈ 132 Mio. km². Luft im Ring: O₂ 20,3 %, 1,06 bar, atembar. Siehe ${Tools.link('Der Bericht des Teams (Hauptbericht, 24. August 2235)', 'Hauptbericht')} und ${Tools.link('TOI-700 d')}.</p></div></div>`;
  }

  // ---------- Konzernnetz ----------
  Tools.pages.konzerne = () => {
    const b = Tools.begin('Konzernnetz', { tab: 'Diagramm', sub: 'Beteiligungen und Töchter. Quellen: Firmenporträts der Dossiers („Teil II: Firmenprofile“) und „Monopole und Marktmacht“; Prozentwerte wie dort genannt.' });
    const owners = [...new Set(T.ownership.map(o => o.owner))];
    const subs = [];
    for (const o of owners) for (const e of T.ownership.filter(x => x.owner === o)) if (!subs.includes(e.sub)) subs.push(e.sub);
    const rowH = 30, H = Math.max(owners.length * 70, subs.length * rowH) + 40, ox = 230, sx = 640, W = 1000;
    const oy = i => 40 + i * ((H - 60) / Math.max(1, owners.length - 1)), sy = i => 30 + i * rowH;
    const colors = ['#e0a040', '#7fa8ff', '#3fb0a6', '#c58bd6', '#e07a7a', '#8bc58b', '#d0c070'];
    const edges = T.ownership.map(e => { const i = owners.indexOf(e.owner), j = subs.indexOf(e.sub), c = colors[i % colors.length]; return `<path d="M ${ox} ${oy(i)} C ${ox + 150} ${oy(i)}, ${sx - 150} ${sy(j)}, ${sx} ${sy(j)}" class="oe" style="stroke:${c}"/><text x="${(ox + sx) / 2 + (j % 3 - 1) * 28}" y="${(oy(i) + sy(j)) / 2 - 3}" class="ol" fill="${c}">${esc(e.w.replace(/ \(.*/, ''))}</text>`; }).join('');
    const on = owners.map((o, i) => svgLink(o, `<rect x="20" y="${oy(i) - 17}" width="210" height="34" rx="7" class="on" style="stroke:${colors[i % colors.length]}"/><text x="125" y="${oy(i) + 5}" text-anchor="middle" class="onl">${esc(o)}</text>`)).join('');
    const sn = subs.map((s, j) => svgLink(s, `<rect x="${sx}" y="${sy(j) - 12}" width="${W - sx - 10}" height="24" rx="6" class="sb"/><text x="${sx + 10}" y="${sy(j) + 4}" class="sbl">${esc(s)}</text>`)).join('');
    b.innerHTML = `<div class="mapbox"><svg viewBox="0 0 ${W} ${H}" class="map conz">${edges}${on}${sn}</svg></div>
      <p class="note">Gemeinsam gehalten: Werftbund (je 50 % Ostpfad und Grundstein), Ghawwas (Ceres-Kontor 15 %, Bund 25 %). „Tochter“ bedeutet vollständig im Konzern geführt, ohne genannten Anteil.</p>
      <h2 class="sec">Monopole und Marktstellung</h2>
      <input class="filter" data-for="t-m" type="search" placeholder="Filtern …"><div class="tablewrap"><table class="wikitable sortable" id="t-m"><thead><tr><th>Bereich</th><th>Anbieter / Anteil</th><th>Einordnung</th></tr></thead><tbody>${T.monopoles.map(m => `<tr><td>${esc(m.field)}</td><td>${esc(m.holder)}</td><td>${esc(m.note)}</td></tr>`).join('')}</tbody></table></div>`;
    b.querySelectorAll('input.filter[data-for]').forEach(inp => inp.addEventListener('input', () => { const q = Search.fold(inp.value.trim()).t; b.querySelectorAll('#' + inp.dataset.for + ' tbody tr').forEach(tr => { tr.hidden = q && !Search.fold(tr.textContent).t.includes(q); }); }));
    window.__sp.enhance(b);
  };
})();
