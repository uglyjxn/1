/* TOI-700 d: prozedurales Geländemodell des Bandes (kartografische Setzung).
   Vorgaben aus dem Hauptbericht 2235: Ring 55–95° (≈ 193 Mio. km², Land ≈ 61, Wasser ≈ 132, drei Randmeere zu je 27–38 Mio. km²),
   Wälder ≈ 3/4 des Ringlandes, Sonnenseite ≈ 123 Mio. km² (eisfreies Land ≈ 108), Schattenseite mit Eisschild 40–900 m.
   Alles Weitere (Form, Lage, Höhen, Namen) ist eine deterministische Erfindung, die diese Zahlen einhält. */
(function (root) {
  'use strict';
  const D = Math.PI / 180;
  const RHOMAX = 120;                 // Kartenausschnitt: Winkelabstand zum Substellarpunkt bis 120°
  const RP = 1.07 * 6371;             // Planetenradius in km (1,07 R⊕)
  const AREA = 4 * Math.PI * RP * RP; // ≈ 5,84e8 km²
  const SEED = 7;

  // ---------- Rauschen ----------
  function hash3(ix, iy, iz, s) { let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 2147483629) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vnoise(x, y, z, s) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const a = (i, j, k) => hash3(ix + i, iy + j, iz + k, s);
    const x00 = a(0, 0, 0) + (a(1, 0, 0) - a(0, 0, 0)) * ux, x10 = a(0, 1, 0) + (a(1, 1, 0) - a(0, 1, 0)) * ux;
    const x01 = a(0, 0, 1) + (a(1, 0, 1) - a(0, 0, 1)) * ux, x11 = a(0, 1, 1) + (a(1, 1, 1) - a(0, 1, 1)) * ux;
    const y0 = x00 + (x10 - x00) * uy, y1 = x01 + (x11 - x01) * uy;
    return (y0 + (y1 - y0) * uz) * 2 - 1;
  }
  function fbm(x, y, z, oct, s) { let v = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { v += a * vnoise(x, y, z, s + i * 17); n += a; x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; } return v / n; }
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const wrap = d => { d = ((d + 180) % 360 + 360) % 360 - 180; return d; };

  // ---------- Gestaltung ----------
  // Parameter (kalibriert mit tools/toi-stats.mjs)
  const P = {
    seaLevel: -355.66,        // Verschiebung der Höhen in m (Kalibrierung Wasseranteil im Ring)
    basins: [ { b: 32, r: 81, sb: 28, sr: 10.5 }, { b: 152, r: 79, sb: 29, sr: 11 }, { b: 272, r: 82, sb: 25.3, sr: 10 } ],
    iceEdge: 96,
    pan: -59.18,           // Schwelle Salzpfannen (Sonnenseite): Höhen darunter
    lakeT: -0.1377,        // Schwelle Seenplatten (Rauschen)
    lakeZ: 380,         // Seen nur in tieferem Land (m)
    treeline: 814.6,      // Höhe (m), ab der kein Wald mehr wächst
  };

  // Höhe über dem Meeresspiegel der Randmeere in m (Land positiv, Meeresboden negativ); Eis separat
  function terrain(rho, beta) {
    const r = rho * D, b = beta * D, sr = Math.sin(r);
    const px = sr * Math.cos(b), py = sr * Math.sin(b), pz = Math.cos(r);
    const wx = fbm(px * 1.7 + 5, py * 1.7, pz * 1.7, 3, SEED + 1), wy = fbm(px * 1.7, py * 1.7 + 9, pz * 1.7, 3, SEED + 2), wz = fbm(px * 1.7, py * 1.7, pz * 1.7 + 13, 3, SEED + 3);
    const qx = px + 0.30 * wx, qy = py + 0.30 * wy, qz = pz + 0.30 * wz;
    const cont = fbm(qx * 2.1, qy * 2.1, qz * 2.1, 5, SEED + 4);
    const det = fbm(qx * 7, qy * 7, qz * 7, 4, SEED + 5);
    const rid = 1 - Math.abs(fbm(qx * 3.4, qy * 3.4, qz * 3.4, 4, SEED + 6)) * 2.2;
    // Grundniveau
    let z = rho < 55 ? 330 + 260 * cont + 110 * det : 230 + 420 * cont + 180 * det;
    // Schirmgebirge (innerer Ringrand, 52–63°) mit Pässen
    const rr = 57.5 + 4 * fbm(px * 1.2 + 3, py * 1.2, pz * 1.2, 2, SEED + 7);
    const gap = sstep(-0.15, 0.35, fbm(px * 2.6 + 1, py * 2.6 + 4, pz * 2.6, 3, SEED + 8));
    z += 2300 * Math.exp(-Math.pow((rho - rr) / 4.2, 2)) * (0.35 + 0.65 * gap) * (0.45 + 0.55 * Math.max(0, rid));
    // Randgebirge (äußerer Ringrand, 88–94°) und Moränenwall
    const mask2 = sstep(-0.2, 0.3, fbm(px * 2.2 + 7, py * 2.2, pz * 2.2 + 2, 3, SEED + 9));
    z += 1500 * Math.exp(-Math.pow((rho - 91.5) / 3.2, 2)) * (0.3 + 0.7 * mask2) * (0.4 + 0.6 * Math.max(0, rid));
    // Becken der drei Randmeere (Küstenlinie durch Rauschen verzerrt, steile Hänge, flacher Grund)
    const bwn1 = fbm(qx * 3.3 + 50, qy * 3.3, qz * 3.3, 4, SEED + 20), bwn2 = fbm(qx * 3.3, qy * 3.3 + 70, qz * 3.3, 4, SEED + 21);
    let basin = 0;
    for (const k of P.basins) { const db = wrap(beta + 17 * bwn2 - k.b); basin += Math.exp(-(db * db) / (k.sb * k.sb) - Math.pow((rho + 7 * bwn1 - k.r) / k.sr, 2)); }
    z -= 1900 * sstep(0.1, 0.55, Math.min(1.15, basin)) * (1 + 0.12 * det);
    // Landbrücken zwischen den Meeren (Landengen), je ≈ 15° breit
    for (const bb of [92, 212, 332]) { const dbb = wrap(beta + 6 * bwn2 - bb); z += 950 * Math.exp(-(dbb * dbb) / 64) * sstep(60, 70, rho) * (1 - sstep(92, 97, rho)) * (0.7 + 0.5 * (det + 1) / 2); }
    // Sonnenseite: flache Becken (Salzpfannen) im Trockengebiet
    if (rho < 58) z -= 230 * sstep(0.35, 0.8, fbm(qx * 3.1 + 20, qy * 3.1, qz * 3.1, 4, SEED + 10)) * (1 - sstep(48, 58, rho));
    return z + P.seaLevel;
  }
  // Eisrand unregelmäßig (Gletscherzungen)
  function iceEdge(beta) { const b = beta * D; return P.iceEdge + 5.5 * fbm(Math.cos(b) * 1.8 + 3, Math.sin(b) * 1.8, 0.5, 3, SEED + 11) + 2.5 * fbm(Math.cos(b) * 7, Math.sin(b) * 7, 2.5, 3, SEED + 12); }
  function iceSurface(rho, bed) { const t = 40 + 860 * sstep(0, 85, rho - 95); return Math.max(bed, 120) + t; }

  // ---------- Klima (Näherungsprofile, kartografische Setzung; 1.800 mm/Jahr am inneren Ring aus dem Hauptbericht) ----------
  function tempAt(rho, z) {
    const pts = [[0, 45], [30, 36], [55, 20], [80, 7], [95, -5], [110, -18], [150, -34], [180, -40]];
    let t = pts[pts.length - 1][1];
    for (let i = 1; i < pts.length; i++) if (rho <= pts[i][0]) { const a = pts[i - 1], c = pts[i], f = (rho - a[0]) / (c[0] - a[0]); t = a[1] + (c[1] - a[1]) * f; break; }
    return t - 5.0 * Math.max(0, z) / 1000;
  }
  function rainAt(rho, z, n) {
    const pts = [[0, 30], [25, 60], [45, 220], [53, 900], [58, 1800], [64, 1750], [72, 1250], [85, 650], [95, 420], [110, 170], [140, 80], [180, 40]];
    let p = pts[pts.length - 1][1];
    for (let i = 1; i < pts.length; i++) if (rho <= pts[i][0]) { const a = pts[i - 1], c = pts[i], f = (rho - a[0]) / (c[0] - a[0]); p = a[1] + (c[1] - a[1]) * f; break; }
    const oro = rho > 50 && rho < 100 ? 1 + 0.00018 * Math.max(0, z) : 1;
    return p * oro * (1 + 0.22 * n);
  }

  // ---------- Gitter ----------
  // N×N-Pixel, Azimutalprojektion (längentreu in radialer Richtung), Mitte = Substellarpunkt, Rand = RHOMAX
  function build(N, opts) {
    opts = opts || {};
    const n2 = N * N, c = (N - 1) / 2;
    const z = new Float32Array(n2), rho = new Float32Array(n2), beta = new Float32Array(n2);
    const kind = new Uint8Array(n2); // 0 außerhalb, 1 Land, 2 Meer, 3 Eis, 4 See, 5 Salzpfanne
    const rain = new Float32Array(n2), temp = new Float32Array(n2), w = new Float32Array(n2);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, dx = (i - c) / c, dy = (c - j) / c, rr = Math.hypot(dx, dy) * RHOMAX;
      if (rr > RHOMAX) { kind[k] = 0; continue; }
      const bt = (Math.atan2(dy, dx) / D + 360) % 360;
      rho[k] = rr; beta[k] = bt; w[k] = rr < 1e-6 ? 1 : Math.sin(rr * D) / (rr * D);
      let h = terrain(rr, bt);
      const ie = iceEdge(bt);
      if (rr > ie) { kind[k] = 3; z[k] = iceSurface(rr, h) + 40 * fbm(Math.cos(bt * D) * 3, Math.sin(bt * D) * 3, rr / 18, 3, SEED + 13); }
      else { z[k] = h; kind[k] = rr < 55 ? (h < P.pan ? 5 : 1) : (h < 0 ? 2 : 1); }
      const nn = fbm(Math.cos(bt * D) * 2.5 + 8, Math.sin(bt * D) * 2.5, rr / 25, 3, SEED + 14);
      rain[k] = rainAt(rr, Math.max(0, z[k]), nn); temp[k] = tempAt(rr, kind[k] === 3 ? 0 : Math.max(0, z[k]));
    }
    const out = { N, z, rho, beta, kind, rain, temp, w };
    if (!opts.noFlow) flow(out);
    return out;
  }

  function lakeNoise(rho, beta) { const r = rho * D, b = beta * D, sr = Math.sin(r); return fbm(sr * Math.cos(b) * 22 + 40, sr * Math.sin(b) * 22, Math.cos(r) * 22, 3, SEED + 15); }

  // Priority-Flood (Barnes) mit epsilon: füllt Senken, liefert Abflussrichtung und Einzugsmenge (regengewichtet)
  function flow(g) {
    const { N, z, kind, rain, rho } = g, n2 = N * N, eps = 0.02;
    const filled = new Float32Array(n2).fill(-1e9), down = new Int32Array(n2).fill(-1), seen = new Uint8Array(n2), order = new Int32Array(n2);
    let hn = 0; const hk = new Float64Array(n2 + 8), hv = new Int32Array(n2 + 8);
    const push = (k, v) => { let i = hn++; hk[i] = k; hv[i] = v; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= hk[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; } };
    const pop = () => { const v = hv[0]; hn--; if (hn > 0) { hk[0] = hk[hn]; hv[0] = hv[hn]; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < hn && hk[l] < hk[m]) m = l; if (r < hn && hk[r] < hk[m]) m = r; if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]; i = m; } } return v; };
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (let k = 0; k < n2; k++) {
      if (kind[k] === 0 || kind[k] === 3) continue;
      let sink = kind[k] === 2;
      if (!sink) { const i = k % N, j = (k / N) | 0; for (const [dx, dy] of dirs) { const a = i + dx, b = j + dy; if (a < 0 || b < 0 || a >= N || b >= N || kind[b * N + a] === 0) { sink = true; break; } } }
      if (sink) { filled[k] = z[k]; seen[k] = 1; push(z[k], k); }
    }
    let cnt = 0;
    while (hn) {
      const k = pop(); order[cnt++] = k; const i = k % N, j = (k / N) | 0;
      for (const [dx, dy] of dirs) { const a = i + dx, b = j + dy; if (a < 0 || b < 0 || a >= N || b >= N) continue; const q = b * N + a; if (seen[q] || kind[q] === 0 || kind[q] === 3) continue; seen[q] = 1; filled[q] = Math.max(z[q], filled[k] + eps); down[q] = k; push(filled[q], q); }
    }
    const acc = new Float32Array(n2);
    for (let t = 0; t < cnt; t++) { const k = order[t]; if (kind[k] === 1 || kind[k] === 4 || kind[k] === 5) { let r = rain[k] / 1800; if (rho[k] > 90 && rho[k] < 104) r += 0.9; acc[k] += r; } }
    // Schmelzwasser: Landzellen am Eisrand erhalten zusätzlichen Zufluss
    for (let k = 0; k < n2; k++) if (kind[k] === 1) { const i = k % N, j = (k / N) | 0; for (const [dx, dy] of dirs) { const a = i + dx, b = j + dy; if (a >= 0 && b >= 0 && a < N && b < N && kind[b * N + a] === 3) { acc[k] += 2.2; break; } } }
    for (let t = cnt - 1; t >= 0; t--) { const k = order[t]; if (down[k] >= 0) acc[down[k]] += acc[k]; }
    // Seen und Salzpfannen: Landzellen, die beim Füllen deutlich angehoben wurden
    for (let k = 0; k < n2; k++) if (kind[k] === 1 && rho[k] >= 55) { if (filled[k] - z[k] > 12 || (z[k] < P.lakeZ && lakeNoise(rho[k], g.beta[k]) > P.lakeT)) kind[k] = 4; }
    g.filled = filled; g.down = down; g.acc = acc;
  }

  // ---------- Vegetation ----------
  // 0 keine, 1 Sonnenseite (Hitzesteppe/Krusten), 2 Schirmwald, 3 Dämmerwald, 4 Randwald, 5 Fels/Gebirge, 6 Eisrandvegetation (Moos, Flechten, Eisalgen)
  function vegClass(g, k) {
    const kd = g.kind[k], r = g.rho[k];
    if (kd === 2 || kd === 3 || kd === 4 || kd === 5 || kd === 0) return 0;
    if (r < 55) return 1;
    if (g.z[k] > P.treeline) return 5;
    if (r < 68) return 2; if (r < 85) return 3; if (r < 95) return 4; return 6;
  }


  // ---------- Kennzahlen und Namen ----------
  // Arbeitsnamen der Kartografie (Entwurf): benannt nach Mitgliedern der Meridian-Expedition 2235
  const NAMES = { seas: ['Nakamura-Meer', 'Peixoto-Meer', 'Lindahl-Meer'], rivers: ['Qureshi-Fluss', 'Reyes-Fluss', 'Okoye-Fluss'], inner: 'Schirmgebirge', outer: 'Randgebirge', steppe: 'Hitzesteppe', pans: 'Salzpfannen' };
  function stats(g) {
    const { N, kind, rho, beta, w, z } = g, c = (N - 1) / 2, A = Math.pow(RHOMAX * D * RP / c, 2) / 1e6;
    const o = { ring: 0, sea: 0, lake: 0, land: 0, forest: 0, rock: 0, sun: 0, sunLand: 0, pan: 0, ice: 0, seas: [0, 0, 0], peak: -1e9, peakAt: null, deep: 1e9 };
    const lab = new Int32Array(N * N); let L = 0; const comps = [];
    for (let s = 0; s < N * N; s++) if (kind[s] === 2 && rho[s] >= 50 && !lab[s]) {
      L++; let area = 0, sx = 0, sy = 0, cnt = 0; const st = [s]; lab[s] = L;
      while (st.length) { const k = st.pop(); area += A * w[k]; sx += k % N; sy += (k / N) | 0; cnt++; const i = k % N, j = (k / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + dx, b = j + dy; if (a < 0 || b < 0 || a >= N || b >= N) continue; const q = b * N + a; if (kind[q] === 2 && !lab[q]) { lab[q] = L; st.push(q); } } }
      comps.push({ area, x: sx / cnt, y: sy / cnt });
    }
    comps.sort((p, q) => q.area - p.area);
    for (const cm of comps.slice(0, 3)) { const bt = (Math.atan2(c - cm.y, cm.x - c) / D + 360) % 360; let bi = 0, bd = 1e9; P.basins.forEach((k, i) => { const d = Math.abs(wrap(bt - k.b)); if (d < bd) { bd = d; bi = i; } }); o.seas[bi] = cm.area; }
    for (let k = 0; k < N * N; k++) {
      const kd = kind[k]; if (!kd) continue; const a = A * w[k], r = rho[k];
      if (r >= 55 && r < 95) { o.ring += a; if (kd === 2) o.sea += a; else if (kd === 4) o.lake += a; else { o.land += a; const v = vegClass(g, k); if (v === 5) o.rock += a; else o.forest += a; } if (z[k] > o.peak && kd !== 3) { o.peak = z[k]; o.peakAt = [r, beta[k]]; } if (kd === 2 && z[k] < o.deep) o.deep = z[k]; }
      else if (r < 55) { o.sun += a; if (kd === 5) o.pan += a; else o.sunLand += a; if (z[k] > o.peak) { o.peak = z[k]; o.peakAt = [r, beta[k]]; } }
      else if (kd === 3) o.ice += a;
    }
    return o;
  }

  const api = { stats, NAMES, lakeNoise, RHOMAX, RP, AREA, P, build, terrain, tempAt, rainAt, vegClass, fbm, sstep, iceEdge, wrap, D };
  root.ToiTerrain = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
