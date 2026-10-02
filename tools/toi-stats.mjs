// Prüft das Geländemodell von TOI-700 d gegen die Flächenangaben des Hauptberichts (Mio. km²).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const T = require('../app/toi-terrain.js');
const N = +process.argv[2] || 500;
const g = T.build(N);
const c = (N - 1) / 2, A = Math.pow(T.RHOMAX * T.D * T.RP / c, 2) / 1e6; // Mio. km² je Pixel (ohne w)
const acc = { ring: 0, ringWater: 0, ringSea: 0, ringLake: 0, ringLand: 0, sun: 0, sunLand: 0, sunPan: 0, forest: 0, ice: 0, tot: 0 };
for (let k = 0; k < N * N; k++) {
  const kd = g.kind[k]; if (!kd) continue; const a = A * g.w[k], r = g.rho[k]; acc.tot += a;
  if (r >= 55 && r < 95) { acc.ring += a; if (kd === 2) { acc.ringSea += a; acc.ringWater += a; } else if (kd === 4) { acc.ringLake += a; acc.ringWater += a; } else if (kd === 1 || kd === 5) { acc.ringLand += a; if (kd === 1 && [2, 3, 4, 6].includes(T.vegClass(g, k))) acc.forest += a; } }
  else if (r < 55) { acc.sun += a; if (kd === 5 || kd === 4 || kd === 2) acc.sunPan += a; else acc.sunLand += a; }
  else if (kd === 3) acc.ice += a;
}
// zusammenhängende Randmeere
const lab = new Int32Array(N * N), areas = []; let L = 0;
for (let s = 0; s < N * N; s++) if (g.kind[s] === 2 && g.rho[s] >= 50 && !lab[s]) { L++; let area = 0; const st = [s]; lab[s] = L; while (st.length) { const k = st.pop(); area += A * g.w[k]; const i = k % N, j = (k / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + dx, b = j + dy; if (a < 0 || b < 0 || a >= N || b >= N) continue; const q = b * N + a; if (g.kind[q] === 2 && !lab[q]) { lab[q] = L; st.push(q); } } } areas.push(area); }
areas.sort((x, y) => y - x);
const f = x => x.toFixed(1);
console.log(`Ring ${f(acc.ring)} (Soll 193) | Wasser ${f(acc.ringWater)} (132) = ${f(acc.ringWater / acc.ring * 100)} % (68,4) | Meere ${f(acc.ringSea)} Seen ${f(acc.ringLake)} | Land ${f(acc.ringLand)} (61) | Wald ${f(acc.forest)} = ${f(acc.forest / acc.ringLand * 100)} % (75)`);
console.log(`Sonnenseite ${f(acc.sun)} (123) Land ${f(acc.sunLand)} (108) Pfannen/Wasser ${f(acc.sunPan)} (15) | Eis im Ausschnitt ${f(acc.ice)} | gesamt ${f(acc.tot)}`);
console.log('Wasserflächen im Ring (>3 Mio.):', areas.filter(a => a > 3).map(f).join(', '));
