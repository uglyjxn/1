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
    const fn = { stern: starMap, sonnensystem: solarMap, handel: tradeMap, toi700: toiSystem, toi700d: toiMap, toi700o: toiSurface }[which] || starMap;
    fn(parts[1]);
  };
  const mapTabs = which => `<div class="subtabs">${[['stern', 'Sternkarte'], ['handel', 'Handelsnetz'], ['sonnensystem', 'Sonnensystem'], ['toi700', 'TOI-700-System'], ['toi700o', 'TOI-700 d: Oberfläche'], ['toi700d', 'TOI-700 d: Zonen']].map(([k, n]) => `<a class="${k === which ? 'on' : ''}" href="#/karte/${k}">${n}</a>`).join('')}</div>`;

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


  // ---------- TOI-700-System (Draufsicht, linearer Maßstab) ----------
  function toiSystem() {
    const b = Tools.begin('Karte des TOI-700-Systems', { tab: 'Karte', sub: 'Draufsicht, Bahnradien maßstäblich (linear in AE); die Winkelpositionen und Planetengrößen sind schematisch. Quelle: Dossier „TOI-700 d“, Abschnitt „Das System“. Mit „abgeleitet“ markierte Werte sind aus den Dossierwerten gerechnet.' });
    const star = { m: 0.42, teff: '≈ 3.480 K', cls: 'M2-Zwerg', ly: 101.4, hz: [0.145, 0.26], dS: 0.87, dA: 0.163 };
    const Lum = star.dS * star.dA * star.dA;                     // L/L☉, aus Einstrahlung und Bahn von d
    const S = a => Lum / (a * a);
    const P = [
      { id: 'b', a: 0.068, d: 10.0, note: 'Glutwelt, keine Nutzung', cls: 'vm', ang: 215, href: 'u-toi-700-b-welt', ang0: 0 },
      { id: 'c', a: 0.093, d: 16.1, note: 'Gasreicher Mini-Neptun, keine Nutzung', cls: 'vm', ang: 320, href: 'u-toi-700-c-welt' },
      { id: 'e', a: 0.134, d: 27.8, note: 'K2 · Einstrahlung 1,27 · 0,9 g · Fernziel-Welt des Kontors', cls: 'kz', ang: 100, href: 'u-toi-700-e-welt' },
      { id: 'd', a: 0.163, d: 37.4, note: 'K1 (wird neu bewertet) · Einstrahlung 0,87 · atembar und belebt', cls: 'terr', ang: 20, href: 'u-toi-700-d-welt' },
    ];
    const cx = 500, cy = 430, sc = 1250;
    const hz = `<circle cx="${cx}" cy="${cy}" r="${(star.hz[0] + star.hz[1]) / 2 * sc}" fill="none" stroke="rgba(63,176,166,.16)" stroke-width="${(star.hz[1] - star.hz[0]) * sc}"/><text x="${cx}" y="${cy - star.hz[1] * sc - 8}" text-anchor="middle" class="zl" style="fill:#3fb0a6">Habitable Zone 0,145 – 0,26 AE</text>`;
    const orbs = P.map(p => `<circle cx="${cx}" cy="${cy}" r="${p.a * sc}" class="orb"/>`).join('');
    const pls = P.map(p => { const a = p.ang * Math.PI / 180, x = cx + Math.cos(a) * p.a * sc, y = cy + Math.sin(a) * p.a * sc, r = p.id === 'c' ? 13 : p.id === 'b' ? 8 : 10;
      return `<a href="#/a/${p.href}"><circle cx="${x}" cy="${y}" r="${r}" class="sn ${p.cls}"/><text x="${x}" y="${y - r - 6}" text-anchor="middle" class="sl">TOI-700 ${p.id}</text><text x="${x}" y="${y + r + 14}" text-anchor="middle" class="sd">${fmt(p.a.toFixed(3))} AE · ${fmt(p.d)} d</text><title>TOI-700 ${p.id}: ${p.note}</title></a>`; }).join('');
    const scale = `<line x1="${cx - 0.1 * sc}" y1="${cy + 0.3 * sc + 20}" x2="${cx}" y2="${cy + 0.3 * sc + 20}" stroke="#8f9ba7" stroke-width="2"/><text x="${cx - 0.05 * sc}" y="${cy + 0.3 * sc + 38}" text-anchor="middle" class="sd">0,1 AE (≈ 15 Mio. km)</text>`;
    const row = p => `<tr><td><a href="#/a/${p.href}"><b>TOI-700 ${p.id}</b></a></td><td>${fmt(p.a.toFixed(3))} AE</td><td>${fmt(p.d)} d</td><td>${fmt(S(p.a).toFixed(2))}${p.id === 'd' ? ' (Dossier 0,87)' : p.id === 'e' ? ' (Dossier 1,27)' : ''}</td><td>${p.id === 'e' ? 'laut Dossier-Text ja; der Bahnradius 0,134 AE liegt aber knapp innerhalb der angegebenen Grenze 0,145 AE' : p.a >= star.hz[0] && p.a <= star.hz[1] ? 'ja' : 'nein (zu heiß)'}</td><td>${esc(p.note)}</td></tr>`;
    b.innerHTML = mapTabs('toi700') + `<div class="mapbox"><svg viewBox="0 0 1000 880" class="map">${hz}${orbs}<circle cx="${cx}" cy="${cy}" r="9" class="sn sol"/><text x="${cx}" y="${cy + 24}" text-anchor="middle" class="sl">TOI-700 (M2)</text>${pls}${scale}</svg></div>
      <div class="legend2"><span><i class="sn terr"></i>d: atembar im Ring, belebt</span><span><i class="sn kz"></i>e: Fernziel-Welt</span><span><i class="sn vm"></i>b, c: ohne Nutzen</span><span>Klick auf einen Planeten öffnet den Artikel</span></div>
      <h2 class="sec">Die vier Planeten</h2>
      <div class="tablewrap"><table class="wikitable"><thead><tr><th>Planet</th><th>Bahnradius</th><th>Umlauf</th><th>Einstrahlung (Erde = 1, abgeleitet)</th><th>Habitable Zone</th><th>Einordnung (Dossier)</th></tr></thead><tbody>${P.slice().reverse().reverse().map(row).join('')}</tbody></table></div>
      <h2 class="sec">Der Stern</h2>
      <div class="tablewrap"><table class="wikitable"><tbody>
        <tr><th>Typ</th><td>${star.cls}, Teff ${star.teff}, ruhig (eine der niedrigsten Flare-Raten aller M-Zwerge im Katalog)</td></tr>
        <tr><th>Masse</th><td>≈ 0,42 M☉</td></tr>
        <tr><th>Entfernung</th><td>101,4 Lichtjahre (Sternbild Dorado)</td></tr>
        <tr><th>Leuchtkraft (abgeleitet)</th><td>≈ ${fmt(Lum.toFixed(3))} L☉ (aus Einstrahlung 0,87 bei 0,163 AE)</td></tr>
        <tr><th>Sternzone (abgeleitet)</th><td>≈ ${fmt((0.93 * Math.cbrt(star.m)).toFixed(2))} AE (Näherung R ∝ M<sup>1/3</sup> mit 0,93 AE für Sol): alle vier Planeten liegen darin, der Zugang ist wie bei Merkur und Venus subluminal.</td></tr>
        <tr><th>Bahnen (Kontrolle)</th><td>Die Umlaufzeiten aller vier Planeten passen zu 0,42 M☉ (3. Keplersches Gesetz, abgeleitet).</td></tr>
        <tr><th>Hinweis zu e</th><td>Das Dossier zählt e zur habitablen Zone, nennt aber die Grenzen 0,145 – 0,26 AE (Abbildung 1) und für e 0,134 AE; e liegt demnach am heißen Rand oder knapp außerhalb („heißer Bruder von d“).</td></tr>
        <tr><th>Maßstab</th><td>Das gesamte System (äußerster Planet bei 0,163 AE) läge weit innerhalb der Merkurbahn (0,387 AE).</td></tr>
      </tbody></table></div>
      <p class="note">Weitere Karte: <a href="#/karte/toi700d">TOI-700 d: Zonen der gebunden rotierenden Welt</a>. Artikel: <a href="#/a/u-toi-700-system">TOI-700 (System)</a>.</p>`;
    window.__sp.enhance(b);
  }


  // ---------- TOI-700 d: Oberflächenkarte (flächentreue Mollweide-Projektion, Substellarpunkt in der Mitte) ----------
  function toiSurface() {
    const b = Tools.begin('TOI-700 d: Oberflächenkarte', { tab: 'Karte', sub: 'Flächentreue Weltkarte (Mollweide) mit dem Substellarpunkt in der Mitte; gebunden rotierende Welt, daher gibt es keine Längen- und Breitengrade im irdischen Sinn: Die Zonen sind Kreise um den Substellarpunkt. Zonen, Flächen und Winkel: Hauptbericht des Teams vom 24. August 2235 (Abb. 5 im Dossier ist überholt). Lage und Form der Randmeere und Landsektoren sind schematisch; das Dossier nennt nur Flächen.' });
    const D = Math.PI / 180, W0 = 1000, Rm = W0 / (4 * Math.SQRT2), cx = 500, cy = 270;
    const moll = (lon, lat) => { // Grad -> Pixel
      const phi = lat * D; let t = phi;
      if (Math.abs(lat) < 89.999) for (let i = 0; i < 30; i++) { const f = 2 * t + Math.sin(2 * t) - Math.PI * Math.sin(phi), d = 2 + 2 * Math.cos(2 * t); if (Math.abs(d) < 1e-9) break; t -= f / d; } else t = Math.sign(lat) * Math.PI / 2;
      return [cx + (2 * Math.SQRT2 / Math.PI) * Rm * lon * D * Math.cos(t), cy - Math.SQRT2 * Rm * Math.sin(t)];
    };
    const f1 = v => v.toFixed(1);
    const pt = (lon, lat) => { const [x, y] = moll(lon, lat); return f1(x) + ',' + f1(y); };
    // Region „Winkelabstand zum Substellarpunkt < rho“
    const region = rho => {
      const c = Math.cos(rho * D), right = [];
      for (let lat = 90; lat >= -90; lat -= 1) {
        const cl = Math.cos(lat * D); let lm;
        if (cl < 1e-9) lm = c <= 0 ? 180 : null; else { const q = c / cl; lm = q >= 1 ? null : q <= -1 ? 180 : Math.acos(q) / D; }
        if (lm !== null) right.push([lat, lm]);
      }
      return 'M' + right.map(([la, lm]) => pt(lm, la)).concat(right.slice().reverse().map(([la, lm]) => pt(-lm, la))).join(' L') + ' Z';
    };
    const polar = (rho, beta) => { const r = rho * D, be = beta * D; return [Math.atan2(Math.sin(r) * Math.cos(be), Math.cos(r)) / D, Math.asin(Math.sin(r) * Math.sin(be)) / D]; };
    const pp = (rho, beta) => pt(...polar(rho, beta));
    const sector = (r1, r2, b1, b2, n = 24) => { const a = [], z = []; for (let i = 0; i <= n; i++) { const be = b1 + (b2 - b1) * i / n; a.push(pp(r2, be)); z.push(pp(r1, be)); } return 'M' + a.concat(z.reverse()).join(' L') + ' Z'; };
    const bands = [[180, 'ice2'], [110, 'ice1'], [95, 'r3'], [85, 'r2'], [68, 'r1'], [55, 'sun']];
    const base = bands.map(([r, c]) => `<path d="${region(r)}" class="zb ${c}" style="stroke:none"/>`).join('');
    const outline = `<path d="${region(180)}" fill="none" stroke="#3a4552" stroke-width="1.5"/>`;
    // Randmeere (je 27–38 Mio. km²): drei Sektoren des Rings, dazwischen Land
    const sea = [30, 150, 270].map((c0, i) => `<path d="${sector(60, 88, c0 - 29, c0 + 29)}" fill="#2a6ea6" stroke="#8fc3ec" stroke-width="1" opacity=".95"><title>Randmeer ${i + 1}: 27 bis 38 Mio. km² (Lage schematisch)</title></path>`).join('');
    const lakes = [[20, 82, 90], [18, 66, 120], [16, 74, 210], [14, 80, 330], [20, 64, 330], [15, 86, 90]].map(([rad, rho, be]) => { const [lo, la] = polar(rho, be), [x, y] = moll(lo, la); return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${rad / 2.2}" ry="${rad / 3.4}" fill="#2a6ea6" opacity=".9"/>`; }).join('');
    const grid = [30, 60, 90, 120, 150].map(r => `<path d="${region(r)}" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-dasharray="2 4"/>`).join('');
    const gl = [30, 60, 90, 120, 150].map(r => { const [x, y] = moll(r, 0); return `<text x="${f1(x + 3)}" y="${f1(y - 2)}" class="rl">${r}°</text>`; }).join('');
    const marks = `<path d="${region(55)}" fill="none" stroke="#fff" stroke-dasharray="4 4" opacity=".7"/><path d="${region(95)}" fill="none" stroke="#fff" stroke-dasharray="4 4" opacity=".7"/>`
      + `<path d="${region(83)}" fill="none" stroke="#f0b84a" stroke-opacity=".6" stroke-dasharray="1 3"/><path d="${region(97)}" fill="none" stroke="#f0b84a" stroke-opacity=".6" stroke-dasharray="1 3"/>`
      + `<path d="${region(65)}" fill="none" stroke="#bfe3ff" stroke-opacity=".55" stroke-width="2" stroke-dasharray="7 3"/>`;
    const cloud = `<path d="${region(12)}" fill="none" stroke="#e8e8e8" stroke-opacity=".5" stroke-dasharray="2 2"/>`;
    const sites = [
      { k: 'sub', n: 'Substellarpunkt (Stern im Zenit)', at: moll(0, 0), c: '#f0b84a', r: 8, lab: 'Substellarpunkt', dy: 20, href: null },
      { k: 'z2', n: 'Sonde Zenit-2 (Sonnenseite, ≈ 2°): +41 °C, 1,09 bar, Feuchte 24 %, Wind 11 m/s', at: moll(...polar(2, 0)), c: '#fff', r: 4, lab: 'Zenit-2', dy: -10, href: 'Die Befunde der Sonden', dx: 34 },
      { k: 'mb', n: 'Meridian-Basis (Forschungsstation, ≈ 120 Personen) am inneren Ringrand', at: moll(...polar(58, 75)), c: '#ff6b6b', r: 6, lab: 'Meridian-Basis', dy: -11, href: 'Folgen für Recht, Markt und das Rätsel' },
      { k: 's1', n: 'Sonde Saum-1 (Band, ≈ 80°): +7 °C, 1,06 bar, O₂ 20,3 %, Feuchte 72 %, Wind 4 m/s', at: moll(...polar(80, 195)), c: '#fff', r: 4, lab: 'Saum-1', dy: -9, href: 'Die Befunde der Sonden' },
      { k: 'n3', n: 'Sonde Nacht-3 (Schattenseite, ≈ 150°): −34 °C, 1,03 bar, Radar: Eis ≥ 40 m', at: moll(150, 0), c: '#fff', r: 4, lab: 'Nacht-3', dy: -9, href: 'Die Befunde der Sonden', anchor: 'end' },
      { k: 'anti', n: 'Antistellarpunkt (Mitte der Schattenseite) liegt am linken und rechten Kartenrand', at: moll(-179, 0), c: '#9ab', r: 3, lab: '', dy: 0, href: null },
    ];
    const siteSvg = sites.map(s0 => { const [x, y] = s0.at; const inner = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${s0.r}" fill="${s0.c}" stroke="#0e1318" stroke-width="2"/>${s0.lab ? `<text x="${f1(x + (s0.dx || 0))}" y="${f1(y + s0.dy)}" text-anchor="${s0.anchor || 'middle'}" class="sl" style="font-size:12px;paint-order:stroke;stroke:#0e1318;stroke-width:3px">${s0.lab}</text>` : ''}<title>${esc(s0.n)}</title>`; return s0.href ? svgLink(s0.href, inner) : `<g>${inner}</g>`; }).join('');
    const zl = [[0, 0, 'Sonnenseite'], ...[[75, 'Ring'] ]].length; // Platzhalter vermeiden
    const lbl = (txt, lon, lat, cls = 'sd') => { const [x, y] = moll(lon, lat); return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" class="${cls}" style="font-size:12px;fill:#fff;paint-order:stroke;stroke:#0e1318;stroke-width:3px">${txt}</text>`; };
    const labels = lbl('Sonnenseite (0–55°)', 0, 22) + lbl('Hitzesteppe, Krusten', 0, 14) + lbl('Ring: Wälder, Seen, Randmeere (55–95°)', 0, -78) + lbl('Schattenseite (ab 95°): Eisschild', 142, 38) + lbl('Schattenseite', -142, 38) + lbl('Randmeer', polar(75, 30)[0], polar(75, 30)[1]) + lbl('Randmeer', polar(75, 150)[0], polar(75, 150)[1]) + lbl('Randmeer', polar(75, 270)[0], polar(75, 270)[1]);
    const rows = [['sun', 'Sonnenseite', '0–55°', '≈ 123 Mio. km² (21 %)', 'bis +45 °C · Hitzesteppe, Krusten, Salzpfannen · eisfreies Land ≈ 108 Mio. km² · ≈ 22 Pflanzenarten'],
      ['r1', 'Innerer Ring: Schirmwald', '55–68°', '', 'Bäume bis 40 m, große flache Blätter · ≈ 38 Arten · Wolkenwall 55–65° mit Dauerregen (≈ 1.800 mm/Jahr)'],
      ['r2', 'Mittlerer Ring: Dämmerwald', '68–85°', '', 'dichtester Wald, 25–55 m · ≈ 62 Arten, größte Vielfalt'],
      ['r3', 'Äußerer Ring: Randwald', '85–95°', '', '3–8 m, Fangblätter zum Horizont · ≈ 18 Arten · zur Eiskante Moose und Flechten'],
      ['ice1', 'Eisrand', '95–110°', '', 'Eisalgen und Mikrobenmatten im Schmelzwasser'],
      ['ice2', 'Schattenseite', 'ab 110°', '≈ 267 Mio. km² (46 %)', 'bis −40 °C · Eisschild 40–900 m · kein sichtbares Leben, Seen unter dem Eis vermutet']];
    b.innerHTML = mapTabs('toi700o') + `
      <div class="subtabs" id="lyr"><label><input type="checkbox" data-l="grid" checked> Winkelnetz</label> <label><input type="checkbox" data-l="marks" checked> Zonengrenzen</label> <label><input type="checkbox" data-l="water" checked> Meere &amp; Seen</label> <label><input type="checkbox" data-l="sites" checked> Orte</label> <label><input type="checkbox" data-l="fund"> Anteil des Fernziel-Fonds</label></div>
      <div class="mapbox"><svg viewBox="0 0 1000 560" class="map"><defs><pattern id="fh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#ffd166" stroke-width="2.2"/></pattern></defs>
        ${base}<g data-g="grid">${grid}${gl}</g><g data-g="fund"><path d="${region(95)} ${region(55)}" fill="url(#fh)" fill-rule="evenodd" opacity=".7"><title>Ringland: ≈ 56 von 61 Mio. km² (92 %) gehören dem Fernziel-Fonds</title></path></g><g data-g="water">${sea}${lakes}</g>
        <g data-g="marks">${marks}${cloud}</g>${outline}${labels}<g data-g="sites">${siteSvg}</g></svg></div>
      <div class="legend2"><span><i class="zsw sun"></i>Sonnenseite</span><span><i class="zsw r1"></i>Schirmwald</span><span><i class="zsw r2"></i>Dämmerwald</span><span><i class="zsw r3"></i>Randwald</span><span><i class="zsw ice1"></i>Eisrand</span><span><i class="zsw ice2"></i>Schattenseite</span><span><i style="background:#2a6ea6"></i>Randmeere &amp; Seen</span><span>weiß gestrichelt: 55° / 95° · gelb gepunktet: Wanderung der Dämmerungslinie ±7° (Bahnexzentrizität e ≈ 0,11) · hellblau: Wolkenwall · klein in der Mitte: Wolkenwirbel um den Substellarpunkt</span></div>
      <h2 class="sec">Zonen im Überblick</h2>
      <div class="tablewrap"><table class="wikitable"><thead><tr><th>Zone</th><th>Winkel</th><th>Fläche</th><th>Merkmale (Hauptbericht 2235)</th></tr></thead><tbody>${rows.map(r => `<tr><td><i class="zsw ${r[0]}"></i> <b>${esc(r[1])}</b></td><td>${r[2]}</td><td>${r[3]}</td><td>${esc(r[4])}</td></tr>`).join('')}</tbody></table></div>
      <h2 class="sec">Land, Wasser und Besitz</h2>
      <div class="tablewrap"><table class="wikitable"><thead><tr><th>Gebiet</th><th>Land</th><th>Wasser</th><th>Fernziel-Fonds (Land)</th></tr></thead><tbody>
        <tr><td><b>Ring (55–95°)</b></td><td>≈ 61 Mio. km² (Wälder ≈ 45 Mio. km², etwa drei Viertel)</td><td>≈ 132 Mio. km², drei Randmeere zu je 27–38 Mio. km²</td><td>≈ 56 Mio. km² (92 %)</td></tr>
        <tr><td><b>Sonnenseite</b></td><td>≈ 108 Mio. km² eisfrei</td><td>–</td><td>≈ 64 Mio. km² (59 %)</td></tr>
        <tr><td><b>Schattenseite</b></td><td>Eisschild (40–900 m)</td><td>gebunden als Eis</td><td>–</td></tr></tbody></table></div>
      <p class="note">Flächen: Gesamtfläche ≈ 5,84 · 10⁸ km². Wind am Boden zur Sonne, in der Höhe zur Nacht. Luft im Ring: O₂ 20,3 %, 1,06 bar. Die Meridian-Basis (≈ 120 Personen) ist die einzige zugelassene Station; Moratorium bis 2240 (${Tools.link('Planetenschutz und Recht')}). Siehe auch ${Tools.link('Der Bericht des Teams (Hauptbericht, 24. August 2235)', 'Hauptbericht')}, <a href="#/a/u-toi-700-d-welt">TOI-700 d (Welt)</a>, <a href="#/karte/toi700d">Zonenansicht</a>, <a href="#/karte/toi700">Systemkarte</a>.</p>`;
    const apply = () => { document.querySelectorAll('#lyr input').forEach(i => { const g = b.querySelector(`[data-g="${i.dataset.l}"]`); if (g) g.style.display = i.checked ? '' : 'none'; }); };
    document.querySelectorAll('#lyr input').forEach(i => i.addEventListener('change', apply));
    apply();
    window.__sp.enhance(b);
  }

  // ---------- TOI-700 d ----------
  function toiMap() {
    const b = Tools.begin('TOI-700 d: Zonen', { tab: 'Karte', sub: 'Gebunden rotierende Welt: Der Planet zeigt dem Stern immer dieselbe Seite. Ansicht vom Substellarpunkt (Mitte = Stern im Zenit); Radius ∝ Winkel. Quelle: Hauptbericht des Teams vom 24. August 2235.' });
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
