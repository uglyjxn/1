// Erzeugt app/data/tools-data.js: strukturierte Daten für Register, Karten, Diagramme und Rechner.
// Quelle ist ausschließlich app/data/articles.js (also die Dossiers) plus tools/curated.mjs (von Hand kuratierte Angaben mit Quellenverweis).
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { CURATED } from './curated.mjs';

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync('app/data/articles.js', 'utf8'), ctx);
const W = ctx.window.WIKI;
const byId = new Map(W.articles.map(a => [a.id, a]));
const st = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const num = s => { const m = String(s).replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
const tables = id => (byId.get(id) || { blocks: [] }).blocks.filter(b => b.t === 'table');
const need = id => { if (!byId.has(id)) throw new Error('Artikel fehlt: ' + id); return byId.get(id); };

const D = {};

// --- Welten (Bewohnte Welten, Überblick) ---
const popMul = s => { const n = num(s); if (n == null) return null; return /Mrd/.test(s) ? n * 1e9 : /Mio/.test(s) ? n * 1e6 : /Tsd/.test(s) ? n * 1e3 : n; };
need('bewohnte-welten-2234-uberblick');
D.worlds = tables('bewohnte-welten-2234-uberblick')[0].rows.map(r => ({ name: st(r[0]), status: st(r[1]), pop: popMul(st(r[2])), popText: st(r[2]), since: st(r[3]), g: num(st(r[4])) }));

// --- Sternsysteme (Nahbereich) + Entfernungsmatrix + Linien ---
const near = tables('sternkarte-koloniewelten-2234-nahbereich')[0];
D.systems = near.rows.map(r => ({ name: st(r[0]), ly: num(st(r[1])), status: st(r[2]), popText: st(r[3]), owner: st(r[4]) }));
const mat = tables('handelslinien-2234-das-liniennetz')[0];
const names = mat.rows.map(r => st(r[0]));
D.matrix = { names, ly: mat.rows.map(r => r.slice(1).map(c => { const m = st(c).match(/([\d,]+) ly/); return m ? num(m[1]) : 0; })), days: mat.rows.map(r => r.slice(1).map(c => { const m = st(c).match(/(\d+) d/); return m ? +m[1] : 0; })) };
D.lines = tables('handelslinien-2234-das-liniennetz')[1].rows.map(r => {
  const [a, b] = st(r[1]).split(/\s+[–-]\s+/);
  return { id: st(r[0]).split(' ')[0], name: st(r[0]).replace(/^\S+\s/, ''), from: a, to: b, ly: num(st(r[2])), days: st(r[3]), freight: st(r[4]), mtOut: num(st(r[4]).split('/')[0]), mtBack: num(st(r[4]).split('/')[1]), goods: st(r[5]) };
});

// --- Kolonialwelten-Katalog ---
D.catalog = tables('sternkarte-koloniewelten-2234-katalog-aller-koloniewelten')[0].rows.map(r => ({ name: st(r[0]), ly: num(st(r[1])), stufe: st(r[2]), mass: st(r[3]), radius: st(r[4]), flux: st(r[5]), trip: st(r[6]), access: st(r[7]), basis: st(r[8]) }));

// --- Sonnensystem: Besiedlung ---
D.solar = tables('sonnensystem-2234-besiedlung-im-uberblick')[0].rows.map(r => ({ name: st(r[0]), kind: st(r[1]), pop: popMul(st(r[2])), popText: st(r[2]), since: st(r[3]), task: st(r[4]) }));
// Bahnradien aus den Faktenblättern der Dossiers (Bahn = ... AE)
D.orbits = [];
for (const b of need('bewohnte-welten-2234-sol-system').blocks) if (b.t === 'h') D._cur = b.text; else if (b.t === 'facts') { const bahn = b.cells.find(c => c[0] === 'Bahn'); if (bahn) { const m = st(bahn[1]).match(/([\d.,]+) AE/); D.orbits.push({ name: D._cur, au: m ? num(m[1]) : null, text: st(bahn[1]) }); } }
delete D._cur;

// --- Firmen ---
const sect = need('firmenverzeichnis-2234-verzeichnis-nach-sektoren');
D.companies = []; let cur = '';
for (const b of sect.blocks) { if (b.t === 'h') cur = b.text; else if (b.t === 'table') for (const r of b.rows) {
  if (r.length >= 7) D.companies.push({ name: st(r[0]), sector: cur, form: st(r[1]), origin: st(r[2]), since: st(r[3]), staff: st(r[4]), revenue: st(r[5]), market: st(r[6]) });
  else if (r.length >= 4) D.companies.push({ name: st(r[0]), sector: cur, form: st(r[1]), origin: st(r[2] || ''), since: '', staff: '', revenue: '', market: st(r[r.length - 1]) });
} }
D.monopoles = tables('firmenverzeichnis-2234-monopole-und-marktmacht')[0].rows.map(r => ({ field: st(r[0]), holder: st(r[1]), note: st(r[2]) }));

// --- Schiffsklassen ---
D.ships = tables('schiffsklassen-2234-gesamtubersicht-der-34-klassen')[0].rows.map(r => ({ name: st(r[0]), drive: st(r[1]), category: st(r[2]).replace(/^■\s*/, ''), length: st(r[3]), crew: st(r[4]), key: st(r[5]) }));

// --- Gesetze ---
D.laws = tables('solares-rechtsbuch-2234-anhang-a-verzeichnis-der-gesetze')[0].rows.map(r => ({ abbr: st(r[0]), name: st(r[1]), part: st(r[2]), status: st(r[3]) }));

// --- Staat: Organe und Ministerien ---
const staat = tables('staat-recht-wirtschaft-2234-die-solarrepublik');
D.organs = staat[0].rows.map(r => ({ name: st(r[0]), comp: st(r[1]), task: st(r[2]), seat: st(r[3]) }));
const fix = t => t.replace(/(Justiz|Soziales|Bildung)und/g, '$1 und');
D.ministries = staat[2].rows.map(r => ({ name: fix(st(r[0])), task: st(r[1]), agencies: st(r[2]).split(';').map(x => x.trim()).filter(Boolean) }));

// --- Zeitleisten ---
D.timelineSources = ['sonnensystem-2234-zeitleiste-der-besiedlung', 'staat-recht-wirtschaft-2234-zeitleiste-der-ordnung'];

// --- Sternkarte: klassische MDS aus der Entfernungsmatrix, Rest radial ---
function mds(dist, dims = 2) {
  const n = dist.length; const D2 = dist.map(r => r.map(v => v * v));
  const rm = D2.map(r => r.reduce((a, b) => a + b, 0) / n), tm = rm.reduce((a, b) => a + b, 0) / n;
  const B = D2.map((r, i) => r.map((v, j) => -0.5 * (v - rm[i] - rm[j] + tm)));
  const out = Array.from({ length: n }, () => []);
  let M = B.map(r => r.slice());
  for (let d = 0; d < dims; d++) {
    let v = Array.from({ length: n }, (_, i) => Math.sin(i + 1 + d));
    for (let it = 0; it < 500; it++) { const w = M.map(r => r.reduce((a, x, j) => a + x * v[j], 0)); const nrm = Math.hypot(...w) || 1; v = w.map(x => x / nrm); }
    const lam = M.map(r => r.reduce((a, x, j) => a + x * v[j], 0)).reduce((a, x, i) => a + x * v[i], 0);
    const s = Math.sqrt(Math.max(lam, 0));
    v.forEach((x, i) => out[i].push(x * s));
    M = M.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j]));
  }
  return out;
}
// Sol in den Ursprung
const P = mds(D.matrix.ly);
const sol = P[names.indexOf('Sol')];
D.starmap = { core: names.map((n, i) => ({ name: n, x: +(P[i][0] - sol[0]).toFixed(2), y: +(P[i][1] - sol[1]).toFixed(2) })) };
// Stress: mittlere Abweichung zwischen echter und projizierter Entfernung
let err = 0, cnt = 0;
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) { const p = Math.hypot(D.starmap.core[i].x - D.starmap.core[j].x, D.starmap.core[i].y - D.starmap.core[j].y); err += Math.abs(p - D.matrix.ly[i][j]) / D.matrix.ly[i][j]; cnt++; }
D.starmap.meanError = +(err / cnt).toFixed(3);
// weitere Systeme: nur die Entfernung zu Sol ist bekannt; Richtung wird in freie Sektoren gelegt
const used = D.starmap.core.filter(c => c.name !== 'Sol').map(c => Math.atan2(c.y, c.x));
const extra = D.systems.filter(s => !names.includes(s.name) && s.ly);
extra.sort((a, b) => a.ly - b.ly);
const free = []; for (let k = 0; k < 24; k++) free.push(-Math.PI + (k + 0.5) * (2 * Math.PI / 24));
const far = free.map(a => ({ a, d: Math.min(...used.map(u => Math.abs(Math.atan2(Math.sin(a - u), Math.cos(a - u))))) })).sort((x, y) => y.d - x.d).slice(0, extra.length * 1).map(x => x.a).sort((p, q) => p - q);
D.starmap.extra = extra.map((s, i) => { const a = far[i % far.length]; return { name: s.name, ly: s.ly, angle: +a.toFixed(3) }; });

// --- kuratierte Daten (mit Quellenangabe) ---
D.persons = CURATED.persons; D.glossary = CURATED.glossary; D.ownership = CURATED.ownership; D.constants = CURATED.constants; D.bodies = CURATED.bodies; 

fs.writeFileSync('app/data/tools-data.js', 'window.TOOLS=' + JSON.stringify(D) + ';\n');
console.log(Object.entries(D).map(([k, v]) => k + ':' + (Array.isArray(v) ? v.length : typeof v)).join(' '));
console.log('MDS mittlere Abweichung', D.starmap.meanError);
