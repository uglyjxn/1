/* TOI-700 d: Bandkarte (Draufsicht auf den Ring) mit Gelände-, Höhen-, Niederschlags-, Temperatur- und Vegetationskarte.
   Datenmodell: toi-terrain.js (kartografische Setzung, kalibriert auf die Flächenangaben des Hauptberichts 2235). */
(function () {
  'use strict';
  const T = window.ToiTerrain, Tools = window.Tools;
  if (!T || !Tools) return;
  const esc = Tools.esc, D = Math.PI / 180, RM = T.RHOMAX;
  const fmt = (v, d = 0) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const MODES = [['gelaende', 'Gelände'], ['hoehe', 'Höhenkarte'], ['regen', 'Niederschlag'], ['temp', 'Temperatur'], ['veg', 'Vegetation']];
  let cache = null, token = 0;

  // ---------- Farben ----------
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const ramp = (stops, v) => { if (v <= stops[0][0]) return stops[0][1]; for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const a = stops[i - 1], b = stops[i]; return lerp(a[1], b[1], (v - a[0]) / (b[0] - a[0])); } return stops[stops.length - 1][1]; };
  const HYPSO = [[0, [88, 140, 92]], [150, [124, 170, 98]], [350, [186, 196, 112]], [650, [222, 198, 112]], [1000, [208, 160, 98]], [1500, [176, 124, 88]], [2000, [150, 112, 96]], [2500, [200, 192, 190]], [3000, [245, 245, 248]]];
  const BATHY = [[0, [158, 206, 232]], [200, [124, 182, 222]], [700, [92, 152, 205]], [1300, [56, 106, 172]], [2000, [30, 66, 128]]];
  const RAIN = [[0, [250, 244, 226]], [100, [236, 226, 190]], [300, [190, 214, 170]], [700, [120, 188, 190]], [1200, [70, 140, 200]], [1800, [36, 80, 168]], [2300, [26, 40, 110]]];
  const TEMP = [[-40, [92, 70, 160]], [-25, [70, 110, 200]], [-8, [140, 190, 235]], [3, [226, 240, 236]], [12, [250, 232, 150]], [22, [245, 170, 90]], [34, [220, 90, 60]], [45, [150, 30, 40]]];
  const ICEC = [[100, [238, 244, 250]], [350, [222, 232, 244]], [650, [200, 214, 232]]];
  const VEG = { 1: [196, 152, 106], 2: [92, 124, 84], 3: [74, 86, 112], 4: [118, 86, 84], 5: [146, 134, 122], 6: [150, 172, 150] };
  const VEGN = { 1: 'Hitzesteppe, Krusten, Matten (Sonnenseite)', 2: 'Schirmwald (55–68°)', 3: 'Dämmerwald (68–85°)', 4: 'Randwald (85–95°)', 5: 'Fels, Gebirge oberhalb der Baumgrenze', 6: 'Moose, Flechten, Eisalgen (Eisrand)' };

  function render(g, mode, canvas) {
    const N = g.N, ctx = canvas.getContext('2d'), img = ctx.createImageData(N, N), px = img.data;
    const pixM = (RM * T.D * T.RP / ((N - 1) / 2)) * 1000, EX = 70; // Pixelgröße in m, Überhöhung
    const lx = -0.62, ly = 0.62, lz = 0.48; // Licht von links oben
    const zz = g.z, kind = g.kind;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, kd = kind[k], o = k * 4;
      if (!kd) { px[o + 3] = 0; continue; }
      const zl = zz[k - (i > 0 ? 1 : 0)], zr = zz[k + (i < N - 1 ? 1 : 0)], zu = zz[k - (j > 0 ? N : 0)], zd = zz[k + (j < N - 1 ? N : 0)];
      const dzx = (zr - zl) / (2 * pixM), dzy = (zd - zu) / (2 * pixM); // y wächst nach unten
      const mg = Math.hypot(dzx, dzy), cmp = 1 / (1 + EX * mg * 0.18), nx = -dzx * EX * cmp, ny = dzy * EX * cmp, nz = 1, nl = Math.hypot(nx, ny, nz);
      let sh = (nx * lx + ny * ly + nz * lz) / nl; sh = Math.max(0, sh) / lz; // 1 = ebenes Land
      let c, shw = kd === 2 || kd === 4 ? 0.25 : 1;
      const z = zz[k];
      const tex = 0.94 + 0.12 * T.fbm(i * 0.09, j * 0.09, 1.7, 3, 91);
      if (mode === 'hoehe') {
        if (kd === 2) c = ramp(BATHY, Math.floor(-z / 300) * 300 + 150); else if (kd === 4) c = [150, 200, 230]; else if (kd === 5) c = [236, 220, 214]; else if (kd === 3) c = ramp(ICEC, z); else c = ramp(HYPSO, z);
        if (kd === 1 && Math.abs(z - Math.round(z / 250) * 250) < 9 * Math.max(0.5, 1 + Math.hypot(dzx, dzy) * 400)) c = lerp(c, [120, 80, 60], 0.45);
      } else if (mode === 'regen') { c = kd === 2 ? [120, 160, 200] : ramp(RAIN, g.rain[k]); if (kd === 3) c = lerp(c, [255, 255, 255], 0.5); shw = 0.35; }
      else if (mode === 'temp') { c = ramp(TEMP, g.temp[k]); shw = 0.35; }
      else if (mode === 'veg') {
        if (kd === 2) c = [150, 190, 220]; else if (kd === 4) c = [120, 170, 210]; else if (kd === 3) c = [236, 242, 248]; else if (kd === 5) c = [236, 226, 216]; else c = VEG[T.vegClass(g, k)] || [120, 120, 120];
        shw = 0.5;
      } else { // Gelände (natürliche Farben)
        if (kd === 2) { c = lerp(ramp(BATHY, Math.floor(-z / 300) * 300 + 150), ramp(BATHY, -z), 0.35); }
        else if (kd === 4) c = [118, 188, 196];
        else if (kd === 5) c = [232, 224, 214];
        else if (kd === 3) c = ramp(ICEC, z);
        else {
          const v = T.vegClass(g, k); c = VEG[v];
          if (v === 1) c = lerp(c, [150, 108, 80], Math.min(1, Math.max(0, (z - 300) / 900)));
          if (v === 5) c = lerp(lerp(c, [112, 102, 98], Math.min(1, Math.max(0, (z - 700) / 1500))), [240, 240, 244], Math.min(1, Math.max(0, (z - 2200) / 300)));
          if (v === 6) c = lerp(c, VEG[5], 0.2);
          c = lerp(c, [c[0] * tex, c[1] * tex, c[2] * tex], 1);
        }
      }
      const f = 1 + (sh - 1) * 0.9 * shw, f2 = kd === 3 ? 0.6 : 1, ff = 1 + (f - 1) * f2;
      px[o] = Math.max(0, Math.min(255, c[0] * ff)); px[o + 1] = Math.max(0, Math.min(255, c[1] * ff)); px[o + 2] = Math.max(0, Math.min(255, c[2] * ff)); px[o + 3] = 255;
    }
    // Küstenlinie
    const water = k => kind[k] === 2 || kind[k] === 4;
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) { const k = j * N + i; if (!kind[k]) continue; const wv = water(k); if (water(k + 1) !== wv || water(k + N) !== wv || (kind[k] === 3) !== (kind[k + 1] === 3) || (kind[k] === 3) !== (kind[k + N] === 3)) { const o = k * 4, t = wv || kind[k] === 3 ? 0.0 : 0.25; if (mode === 'gelaende' || mode === 'hoehe') { px[o] = px[o] * (0.7 - t); px[o + 1] = px[o + 1] * (0.74 - t); px[o + 2] = px[o + 2] * (0.8 - t * 0.3); } } }
    ctx.putImageData(img, 0, 0);
    // Flüsse
    if (mode !== 'temp') {
      ctx.lineCap = 'round'; ctx.strokeStyle = mode === 'regen' ? 'rgba(255,255,255,.55)' : 'rgba(64,126,190,.95)';
      const thr = 40, down = g.down, acc = g.acc;
      for (let k = 0; k < N * N; k++) { if (kind[k] !== 1 || g.rho[k] < 48 || g.rain[k] < 380) continue; const a = acc[k]; if (a < thr) continue; const d = down[k]; if (d < 0) continue; if (kind[d] === 3) continue; ctx.lineWidth = Math.min(4.2, 0.55 + 0.5 * Math.log(a / thr) * 0.55); ctx.beginPath(); ctx.moveTo(k % N + 0.5, ((k / N) | 0) + 0.5); ctx.lineTo(d % N + 0.5, ((d / N) | 0) + 0.5); ctx.stroke(); }
    }
  }

  function cloudLayer(g, canvas) {
    const N = g.N, ctx = canvas.getContext('2d'), img = ctx.createImageData(N, N), px = img.data;
    for (let k = 0; k < N * N; k++) { if (!g.kind[k]) continue; const r = g.rho[k], b = g.beta[k] * D; const band = Math.exp(-Math.pow((r - 59.5) / 5.2, 2)); if (band < 0.03) continue; const n = T.fbm(Math.cos(b) * Math.sin(r * D) * 6 + 30, Math.sin(b) * Math.sin(r * D) * 6, Math.cos(r * D) * 6, 5, 211) * 0.5 + 0.5; const a = Math.max(0, Math.min(1, (band * (0.45 + 0.9 * n) - 0.18) * 1.15)); const o = k * 4; px[o] = 244; px[o + 1] = 246; px[o + 2] = 250; px[o + 3] = a * 215; }
    ctx.putImageData(img, 0, 0);
  }

  // ---------- Overlay ----------
  function overlay(g, st, feat) {
    const N = g.N, c = (N - 1) / 2, S = N / 880; // Schriftgrößen relativ
    const xy = (rho, beta) => [c + rho / RM * c * Math.cos(beta * D), c - rho / RM * c * Math.sin(beta * D)];
    const P = (rho, beta) => xy(rho, beta).map(v => v.toFixed(1)).join(',');
    const arc = (rho, b1, b2) => { const n = Math.max(8, Math.abs(b2 - b1) / 3 | 0); const pts = []; for (let i = 0; i <= n; i++) pts.push(P(rho, b1 + (b2 - b1) * i / n)); return 'M' + pts.join(' L'); };
    let id = 0;
    const arcLabel = (txt, rho, b0, span, cls) => { const top = Math.sin(b0 * D) > 0, a1 = top ? b0 + span / 2 : b0 - span / 2, a2 = top ? b0 - span / 2 : b0 + span / 2, pid = 'al' + (++id); return `<path id="${pid}" d="${arc(rho, a1, a2)}" fill="none"/><text class="${cls}"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">${esc(txt)}</textPath></text>`; };
    const txt = (t, rho, beta, cls, dy = 0) => { const [x, y] = xy(rho, beta); return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="middle" class="${cls}">${esc(t)}</text>`; };
    const out = { grid: '', zones: '', names: '', sites: '', wind: '', frame: '' };
    // Gradnetz
    for (let r = 10; r <= 110; r += 10) out.grid += `<circle cx="${c}" cy="${c}" r="${r / RM * c}" class="gr"/><text x="${(c + r / RM * c * Math.cos(45 * D)).toFixed(1)}" y="${(c - r / RM * c * Math.sin(45 * D) - 2).toFixed(1)}" class="grl">${r}°</text>`;
    for (let b = 0; b < 360; b += 30) { const [x, y] = xy(RM, b); out.grid += `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="gr"/>`; const [tx, ty] = xy(RM + 3.6, b); out.grid += `<text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle" class="grl big">${b}°</text>`; }
    // Zonengrenzen
    out.zones = [[55, 'z1'], [95, 'z1']].map(([r, cl]) => `<circle cx="${c}" cy="${c}" r="${r / RM * c}" class="${cl}"/>`).join('') + [83, 97].map(r => `<circle cx="${c}" cy="${c}" r="${r / RM * c}" class="zt"/>`).join('')
      + arcLabel('55° · innerer Ringrand', 55, 300, 50, 'zl1') + arcLabel('95° · äußerer Ringrand', 95, 300, 50, 'zl1');
    // Namen
    const nm = T.NAMES; let n = '';
    st.seaC.forEach((s, i) => { if (s) n += `<text x="${s[0].toFixed(1)}" y="${s[1].toFixed(1)}" text-anchor="middle" class="nsea">${esc(nm.seas[i]).toUpperCase().split('').join(' ')}</text>`; });
    n += arcLabel('SCHIRMGEBIRGE', 57.6, feat.innerB, 60, 'nmt') + arcLabel('RANDGEBIRGE', 91.5, feat.outerB, 50, 'nmt');
    n += arcLabel('Schirmwald', 63, feat.w1, 38, 'nfo') + arcLabel('Dämmerwald', 77, feat.w2, 44, 'nfo') + arcLabel('Randwald', 87, feat.w3, 38, 'nfo');
    n += arcLabel('Eisrand · Schmelzwasser, Eisalgen', 101, 270, 80, 'nice') + arcLabel('EISSCHILD DER SCHATTENSEITE', 113, 90, 90, 'nice');
    n += txt('HITZESTEPPE', 22, 90, 'nste') + txt('Substellarpunkt', 0, 0, 'nste2', 24);
    if (st.panC) n += `<text x="${st.panC[0].toFixed(1)}" y="${st.panC[1].toFixed(1)}" text-anchor="middle" class="npan">Salzpfannen</text>`;
    st.rivers.forEach((rv, i) => { n += `<path id="rv${i}" d="${rv.d}" fill="none"/><text class="nriv"><textPath href="#rv${i}" startOffset="50%" text-anchor="middle">${esc(nm.rivers[i])}</textPath></text>`; });
    out.names = n;
    // Orte
    const mk = (p, col, lab, dx, dy, tip, link) => { const m = `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${5.5 * S}" fill="${col}" stroke="#101418" stroke-width="2"/><text x="${(p[0] + dx).toFixed(1)}" y="${(p[1] + dy).toFixed(1)}" class="nsite">${esc(lab)}</text><title>${esc(tip)}</title>`; return link ? `<a href="${link}">${m}</a>` : `<g>${m}</g>`; };
    out.sites = mk(xy(0, 0), '#f0b84a', 'Zenit-2', 10, -10, 'Sonnensonde Zenit-2 (≈ 2°): +41 °C, 1,09 bar, Feuchte 24 %, Wind 11 m/s; Stern fast im Zenit', '#/a/toi-700-d-2234-die-befunde-der-sonden')
      + mk(st.basis, '#ff6b6b', 'Meridian-Basis', 10, 4, 'Meridian-Basis: Forschungsstation (≈ 120 Personen) am inneren Ringrand; Lage im Entwurf', '#/a/toi-700-d-2234-folgen-fur-recht-markt-und-das-ratsel')
      + mk(st.saum, '#fff', 'Saum-1', 10, 4, 'Sonde Saum-1 (Band, ≈ 80°): +7 °C, 1,06 bar, O₂ 20,3 %, Feuchte 72 %, Wind 4 m/s, Stern ≈ 6° über dem Horizont; Landung im Bewuchs. Lage im Entwurf', '#/a/toi-700-d-2234-die-befunde-der-sonden');
    // Zirkulation
    const arrow = (r1, r2, b, col, dash) => { const [x1, y1] = xy(r1, b), [x2, y2] = xy(r2, b); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="${1.8 * S}" ${dash ? 'stroke-dasharray="8 6"' : ''} marker-end="url(#ah${col === '#5db1ff' ? 'b' : 'o'})"/>`; };
    let w = '';
    for (let b = 15; b < 360; b += 30) { w += arrow(112, 70, b + 5, '#5db1ff', false); w += arrow(32, 52, b - 5, '#ff9d3a', true); w += arrow(70, 112, b - 10, '#ff9d3a', true); }
    w += arcLabel('Bodenwind aus der Kälte (feucht, erwärmt sich)', 105, 200, 70, 'nwind b') + arcLabel('Wolkenwall · Dauerregen ≈ 1.800 mm/Jahr', 59.5, 225, 70, 'nwind w') + arcLabel('Höhenwind zur Nacht', 88, 135, 60, 'nwind o');
    out.wind = w;
    // Rahmen: Maßstab, Titel
    const kmPer = (RM * D * T.RP) / c; // km je Pixel (radial)
    const bar = 1000, pxBar = bar / kmPer;
    out.frame = `<g transform="translate(${(18 * S).toFixed(0)},${(N - 54 * S).toFixed(0)})"><rect x="-8" y="-20" width="${Math.max(pxBar + 80, 250).toFixed(0)}" height="${(54 * S).toFixed(0)}" rx="5" class="cart"/><line x1="0" y1="8" x2="${pxBar.toFixed(1)}" y2="8" stroke="#e8e8e8" stroke-width="3"/><line x1="0" y1="2" x2="0" y2="14" stroke="#e8e8e8" stroke-width="2"/><line x1="${pxBar.toFixed(1)}" y1="2" x2="${pxBar.toFixed(1)}" y2="14" stroke="#e8e8e8" stroke-width="2"/><text x="${(pxBar + 10).toFixed(1)}" y="12" class="cs">1.000 km</text><text x="0" y="-4" class="cs">Maßstab nur radial (azimutal längentreu)</text></g>`
      + `<g transform="translate(${(N - 20 * S).toFixed(0)},${(34 * S).toFixed(0)})"><text x="0" y="0" text-anchor="end" class="ct">TOI-700 d</text><text x="0" y="${(16 * S).toFixed(0)}" text-anchor="end" class="cs">Das Band · Entwurf der Kartografie</text></g>`;
    return out;
  }

  function features(g) {
    const N = g.N, c = (N - 1) / 2;
    const xy = (rho, beta) => [c + rho / RM * c * Math.cos(beta * D), c - rho / RM * c * Math.sin(beta * D)];
    const idx = (rho, beta) => { const [x, y] = xy(rho, beta); return Math.round(y) * N + Math.round(x); };
    const peakB = (r1, r2) => { let best = 0, bz = -1e9; for (let b = 0; b < 360; b += 3) { let s = 0; for (let r = r1; r <= r2; r += 1) s += Math.max(0, g.z[idx(r, b)]); if (s > bz) { bz = s; best = b; } } return best; };
    const landB = (r, win) => { let best = 0, bs = -1; for (let b = 0; b < 360; b += 2) { let s = 0; for (let d = -win / 2; d <= win / 2; d += 2) for (let rr = r - 3; rr <= r + 3; rr += 3) { const k = idx(rr, b + d); if (g.kind[k] === 1 && T.vegClass(g, k) >= 2 && T.vegClass(g, k) !== 5) s++; } if (s > bs) { bs = s; best = b; } } return best; };
    const f = { innerB: peakB(55, 60), outerB: peakB(89, 94) };
    f.w1 = landB(63, 40); f.w2 = landB(77, 44); f.w3 = landB(87, 38);
    // Orte: Meridian-Basis auf niedrigem Land am inneren Ringrand, Saum-1 im Wald bei ≈ 80°
    let bb = null, bd = 1e9; for (let b = 0; b < 360; b += 1) { const k = idx(57, b), d = Math.abs(T.wrap(b - 95)); if (g.kind[k] === 1 && g.z[k] < 700 && d < bd) { bd = d; bb = b; } }
    let sb = null; bd = 1e9; for (let b = 0; b < 360; b += 1) { const k = idx(80, b), d = Math.abs(T.wrap(b - 195)); if (g.kind[k] === 1 && T.vegClass(g, k) >= 2 && T.vegClass(g, k) !== 5 && d < bd) { bd = d; sb = b; } }
    f.basisB = bb == null ? 70 : bb; f.saumB = sb == null ? 195 : sb;
    return f;
  }

  function derive(g, f) {
    const N = g.N, c = (N - 1) / 2;
    const xy = (rho, beta) => [c + rho / RM * c * Math.cos(beta * D), c - rho / RM * c * Math.sin(beta * D)];
    const s = T.stats(g), o = { stats: s, seaC: [null, null, null], rivers: [], panC: null };
    // Mittelpunkte der Randmeere
    const lab = new Int32Array(N * N); const comps = [];
    for (let k0 = 0; k0 < N * N; k0++) if (g.kind[k0] === 2 && g.rho[k0] >= 50 && !lab[k0]) { const id = comps.length + 1; let sx = 0, sy = 0, n = 0; const st = [k0]; lab[k0] = id; while (st.length) { const k = st.pop(); sx += k % N; sy += (k / N) | 0; n++; const i = k % N, j = (k / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + dx, b = j + dy; if (a < 0 || b < 0 || a >= N || b >= N) continue; const q = b * N + a; if (g.kind[q] === 2 && !lab[q]) { lab[q] = id; st.push(q); } } } comps.push({ n, x: sx / n, y: sy / n }); }
    comps.sort((a, b) => b.n - a.n);
    comps.slice(0, 3).forEach(cm => { const bt = (Math.atan2(c - cm.y, cm.x - c) / D + 360) % 360; let bi = 0, bd = 1e9; T.P.basins.forEach((k, i) => { const d = Math.abs(T.wrap(bt - k.b)); if (d < bd) { bd = d; bi = i; } }); o.seaC[bi] = [cm.x, cm.y + 4]; });
    // Salzpfannen
    let px = 0, py = 0, pn = 0; for (let k = 0; k < N * N; k++) if (g.kind[k] === 5 && g.rho[k] < 55 && g.rho[k] > 18) { px += k % N; py += (k / N) | 0; pn++; } if (pn) o.panC = [px / pn, py / pn];
    // größte Flüsse (Mündung ins Meer, flussaufwärts verfolgt)
    const mouths = []; for (let k = 0; k < N * N; k++) if (g.kind[k] === 1 && g.down[k] >= 0 && g.kind[g.down[k]] === 2 && g.acc[k] > 400) mouths.push(k);
    mouths.sort((a, b) => g.acc[b] - g.acc[a]);
    const picked = [];
    for (const m of mouths) { if (picked.length >= 3) break; const [mx, my] = [m % N, (m / N) | 0]; if (picked.some(p => Math.hypot(p.x - mx, p.y - my) < N * 0.2)) continue;
      const path = [m]; let k = m; for (let s2 = 0; s2 < 140; s2++) { const i = k % N, j = (k / N) | 0; let best = -1, ba = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const a = i + dx, b = j + dy; if (a < 0 || b < 0 || a >= N || b >= N) continue; const q = b * N + a; if (g.down[q] === k && g.acc[q] > ba && g.kind[q] === 1) { ba = g.acc[q]; best = q; } } if (best < 0) break; path.push(best); k = best; }
      if (path.length > 40) picked.push({ x: mx, y: my, path }); }
    o.rivers = picked.map(p => { const pts = p.path.slice(Math.floor(p.path.length * 0.15), Math.floor(p.path.length * 0.85)); let ds = pts.filter((_, i) => i % 3 === 0).map(k => (k % N + 0.5).toFixed(1) + ',' + (((k / N) | 0) + 0.5).toFixed(1)); if (ds.length > 1 && +ds[0].split(',')[0] > +ds[ds.length - 1].split(',')[0]) ds.reverse(); return { d: 'M' + ds.join(' L') }; });
    o.basis = xy(57, f.basisB); o.saum = xy(80, f.saumB);
    return o;
  }

  // ---------- Profil ----------
  function profile(g, beta) {
    const N = g.N, c = (N - 1) / 2, W = 960, H = 300, mx = 46, my = 20, pw = W - mx - 20, ph = H - my - 36;
    const zs = [], ts = [], rs = [];
    for (let r = 0; r <= RM; r += 0.5) { const x = Math.round(c + r / RM * c * Math.cos(beta * D)), y = Math.round(c - r / RM * c * Math.sin(beta * D)), k = y * N + x; zs.push([r, g.z[k], g.kind[k]]); ts.push([r, g.temp[k]]); rs.push([r, g.rain[k]]); }
    const zmin = -2000, zmax = 2800, X = r => mx + r / RM * pw, Y = z => my + ph - (z - zmin) / (zmax - zmin) * ph;
    const area = `M${X(0)},${Y(0)} ` + zs.map(([r, z]) => `L${X(r).toFixed(1)},${Y(z).toFixed(1)}`).join(' ') + ` L${X(RM)},${Y(0)} Z`;
    const rainY = v => my + ph - v / 2000 * ph, tl = zs.map(([r, z, kd]) => kd === 2 || kd === 4 ? `<rect x="${X(r) - 1.8}" y="${Y(0)}" width="3.6" height="${Y(Math.min(0, z)) - Y(0)}" fill="#3c78b4" opacity=".75"/>` : '').join('');
    const grid = [-2000, -1000, 0, 1000, 2000].map(z => `<line x1="${mx}" x2="${mx + pw}" y1="${Y(z)}" y2="${Y(z)}" stroke="#333c47"/><text x="${mx - 6}" y="${Y(z) + 4}" text-anchor="end" class="grl">${z} m</text>`).join('') + [0, 30, 55, 95, 120].map(r => `<line x1="${X(r)}" x2="${X(r)}" y1="${my}" y2="${my + ph}" stroke="#333c47" ${r === 55 || r === 95 ? 'stroke-dasharray="4 4"' : ''}/><text x="${X(r)}" y="${H - 14}" text-anchor="middle" class="grl">${r}°</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="map prof" style="max-height:none">${grid}${tl}<path d="${area}" fill="#6a5a4a" fill-opacity=".85" stroke="#cdb28d"/><polyline fill="none" stroke="#6ec6ff" stroke-width="2" points="${rs.map(([r, v]) => X(r).toFixed(1) + ',' + rainY(v).toFixed(1)).join(' ')}"/><polyline fill="none" stroke="#ff9d3a" stroke-width="2" points="${ts.map(([r, t]) => X(r).toFixed(1) + ',' + (my + ph - (t + 45) / 100 * ph).toFixed(1)).join(' ')}"/><text x="${mx + 6}" y="${my + 12}" class="grl" fill="#6ec6ff">― Niederschlag (0–2.000 mm/Jahr)</text><text x="${mx + 6}" y="${my + 26}" class="grl" fill="#ff9d3a">― Temperatur (−45 … +55 °C)</text><text x="${W - 20}" y="${H - 2}" text-anchor="end" class="grl">Winkelabstand zum Substellarpunkt ρ →</text></svg>`;
  }

  // ---------- Legenden ----------
  const swatch = (c, t) => `<span><i style="background:rgb(${c.map(Math.round).join(',')})"></i>${t}</span>`;
  function legend(mode) {
    if (mode === 'hoehe') return [[0, 'bis 150 m'], [350, 'bis 350 m'], [650, 'bis 650 m'], [1000, 'bis 1.000 m'], [1500, 'bis 1.500 m'], [2000, 'bis 2.000 m'], [2500, 'über 2.200 m']].map(([z, t]) => swatch(ramp(HYPSO, z), t)).join('') + [[0, 'Meer 0–200 m tief'], [700, 'bis 700 m'], [1300, 'bis 1.300 m'], [2000, 'tiefer']].map(([z, t]) => swatch(ramp(BATHY, z), t)).join('') + swatch([230, 238, 248], 'Eisschild (Oberfläche)') + swatch([236, 220, 214], 'Salzpfanne') + '<span>Höhenlinien alle 250 m · Höhen über dem Spiegel der Randmeere</span>';
    if (mode === 'regen') return [0, 100, 300, 700, 1200, 1800, 2300].map(v => swatch(ramp(RAIN, v), v + ' mm/Jahr')).join('');
    if (mode === 'temp') return [-40, -25, -8, 3, 12, 22, 34, 45].map(v => swatch(ramp(TEMP, v), (v > 0 ? '+' : '') + v + ' °C')).join('') + '<span>Jahresmittel am Boden, mit Höhenabnahme 5 K/km</span>';
    if (mode === 'veg') return Object.keys(VEGN).map(k => swatch(VEG[k], VEGN[k])).join('') + swatch([236, 242, 248], 'Eis') + swatch([120, 170, 210], 'Meer, See') + swatch([236, 226, 216], 'Salzpfanne');
    return Object.keys(VEGN).map(k => swatch(VEG[k], VEGN[k])).join('') + swatch([104, 160, 200], 'Meer, See') + swatch([225, 236, 246], 'Eisschild') + swatch([232, 224, 214], 'Salzpfanne') + '<span>Pflanzen sind dunkel (schwarz bis violett), weil sie das rötliche Licht des Sterns breit aufnehmen</span>';
  }

  // ---------- Seite ----------
  function page(tabs, parts) {
    const mode = MODES.some(m => m[0] === parts[0]) ? parts[0] : 'gelaende';
    const b = Tools.begin('TOI-700 d: Bandkarte', { tab: 'Karte', sub: 'Draufsicht auf das Band (Azimutalprojektion, Mitte = Substellarpunkt, Rand = 120°). Zonen, Flächen, Temperaturen, Feuchte, Regenmenge am Wolkenwall und Landeplätze folgen dem Hauptbericht vom 24. August 2235. Form, Höhen, Namen und Lage von Meeren, Gebirgen und Flüssen sind eine kartografische Setzung (Entwurf), kalibriert auf die Flächenangaben des Berichts.' });
    b.innerHTML = tabs + `<div class="subtabs">${MODES.map(([k, n]) => `<a class="${k === mode ? 'on' : ''}" href="#/karte/toi700b/${k}">${n}</a>`).join('')}</div>
      <div class="subtabs" id="blyr"><label><input type="checkbox" data-l="grid"> Gradnetz</label> <label><input type="checkbox" data-l="zones" checked> Zonengrenzen</label> <label><input type="checkbox" data-l="names" checked> Namen</label> <label><input type="checkbox" data-l="sites" checked> Orte</label> <label><input type="checkbox" data-l="cloud"> Wolkenwall</label> <label><input type="checkbox" data-l="wind"> Zirkulation</label></div>
      <div id="bstat" class="muted" style="margin:4px 0">Karte wird berechnet …</div>
      <div class="mapbox bandwrap"><canvas id="bandc"></canvas><canvas id="bandcl" hidden></canvas><svg id="bando" class="map bandov"></svg></div>
      <div class="legend2" id="bleg">${legend(mode)}</div><div id="bextra"></div>`;
    const my = ++token;
    const draw = g => {
      if (my !== token) return;
      const cv = document.getElementById('bandc'); if (!cv) return;
      cv.width = cv.height = g.N; render(g, mode, cv);
      const cl = document.getElementById('bandcl'); cl.width = cl.height = g.N; cloudLayer(g, cl);
      const f = features(g), d = derive(g, f), ov = overlay(g, d, f), svg = document.getElementById('bando');
      svg.setAttribute('viewBox', `0 0 ${g.N} ${g.N}`);
      const S = g.N / 880;
      svg.innerHTML = `<defs><marker id="ahb" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#5db1ff"/></marker><marker id="aho" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#ff9d3a"/></marker></defs>
        <g data-g="grid" style="display:none">${ov.grid}</g><g data-g="zones">${ov.zones}</g><g data-g="wind" style="display:none">${ov.wind}</g><g data-g="names">${ov.names}</g><g data-g="sites">${ov.sites}</g>${ov.frame}<circle cx="${(g.N - 1) / 2}" cy="${(g.N - 1) / 2}" r="${(g.N - 1) / 2 - 0.5}" fill="none" stroke="#9aa7b4" stroke-width="2"/>`;
      svg.style.setProperty('--S', S);
      const apply = () => document.querySelectorAll('#blyr input').forEach(i => { if (i.dataset.l === 'cloud') { cl.hidden = !i.checked; return; } const gg = svg.querySelector(`[data-g="${i.dataset.l}"]`); if (gg) gg.style.display = i.checked ? '' : 'none'; });
      document.querySelectorAll('#blyr input').forEach(i => i.addEventListener('change', apply)); apply();
      const s = d.stats, F = (v, k = 1) => fmt(v, k);
      document.getElementById('bstat').textContent = `Modell: ${g.N} × ${g.N} Punkte, ca. ${fmt(RM * D * T.RP * 2 / g.N, 0)} km je Punkt.`;
      document.getElementById('bextra').innerHTML = `
        <h2 class="sec">Das Band in Zahlen (Modell, Mio. km²)</h2>
        <div class="tablewrap"><table class="wikitable"><thead><tr><th>Größe</th><th>Modell</th><th>Hauptbericht 2235</th></tr></thead><tbody>
          <tr><td>Ring (55–95°)</td><td>${F(s.ring, 0)}</td><td>≈ 193</td></tr>
          <tr><td>davon Land</td><td>${F(s.land, 0)}</td><td>≈ 61</td></tr>
          <tr><td>davon Wald</td><td>${F(s.forest, 0)} (${F(s.forest / s.land * 100, 0)} % des Landes)</td><td>≈ 45 (etwa drei Viertel)</td></tr>
          <tr><td>davon Wasser</td><td>${F(s.sea + s.lake, 0)}</td><td>≈ 132</td></tr>
          <tr><td>Randmeere: ${T.NAMES.seas.join(', ')}</td><td>${s.seas.map(v => F(v, 0)).join(' / ')} je</td><td>27 bis 38 je</td></tr>
          <tr><td>Seenplatten und Flussseen</td><td>${F(s.lake, 0)}</td><td>Rest des Wassers</td></tr>
          <tr><td>Sonnenseite (0–55°)</td><td>${F(s.sun, 0)}, davon Land ${F(s.sunLand, 0)}</td><td>≈ 123, Land ≈ 108 (Rest: Salzpfannen)</td></tr>
          <tr><td>höchster Punkt des Bandes</td><td>≈ ${fmt(Math.round(s.peak / 10) * 10)} m (${F(s.peakAt[0], 0)}°, Azimut ${F(s.peakAt[1], 0)}°)</td><td>nicht angegeben</td></tr>
          <tr><td>tiefster Meeresboden</td><td>≈ ${fmt(Math.round(s.deep / 10) * 10)} m</td><td>nicht angegeben</td></tr></tbody></table></div>
        <h2 class="sec">Höhenprofil durch das Band</h2>
        <p class="note">Schnitt vom Substellarpunkt (links) über das Band zur Schattenseite. Azimut: <input id="pb" type="range" min="0" max="359" value="${Math.round(f.basisB)}" style="vertical-align:middle;width:260px"> <b id="pbv">${Math.round(f.basisB)}°</b></p>
        <div class="mapbox" id="pbox">${profile(g, f.basisB)}</div>
        <h2 class="sec">Klima des Bandes in Kürze</h2>
        <p>Am Substellarpunkt steigt heiße Luft auf und strömt in der Höhe zur Nacht; auf der kalten Schattenseite sinkt sie ab und fließt am Boden zurück zur Sonne. Auf dem Weg über das Band nimmt die kalte, trockene Bodenluft Wasser von Meeren und Seen auf und wird warm. Dort, wo sie auf die aufsteigende heiße Luft trifft (55–65°), steigt sie auf, kühlt ab, und der Wasserdampf kondensiert: Der Wolkenwall bringt Dauerregen von ≈ 1.800 mm im Jahr. Die ganze Erklärung steht im Artikel <a href="#/a/u-toi-700-d-welt">TOI-700 d (Welt)</a> im Abschnitt „Klima“.</p>
        <p class="note">Namen sind Arbeitsnamen der Kartografie (nach Mitgliedern der Meridian-Expedition). Nacht-3 (≈ 150°) liegt außerhalb des Kartenausschnitts. Weitere Karten: <a href="#/karte/toi700o">Weltkarte (Oberfläche)</a>, <a href="#/karte/toi700d">Zonenansicht</a>, <a href="#/karte/toi700">Systemkarte</a>.</p>`;
      const pb = document.getElementById('pb'); if (pb) pb.addEventListener('input', () => { document.getElementById('pbv').textContent = pb.value + '°'; document.getElementById('pbox').innerHTML = profile(g, +pb.value); });
      window.__sp.enhance(b);
    };
    if (cache) { draw(cache); return; }
    setTimeout(() => { if (my !== token) return; const g = T.build(840); cache = g; draw(g); }, 30);
  }

  window.ToiBand = { page };
})();
