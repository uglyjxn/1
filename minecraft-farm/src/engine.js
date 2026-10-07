'use strict';
/* ============================================================
   Spawner farm: blocks, textures, voxel model, renderers.
   x west->east, z north->south, y up. One voxel = one block.
   ============================================================ */
const FW = 37, FD = 25, FH = 13;

const BL = {};
function d(key, name, col, pat, o) { BL[key] = Object.assign({ key, name, col, pat: pat || 'n' }, o || {}); }
d('stone_bricks', 'Stone Bricks', '#7a7a7a', 'b');
d('smooth_stone', 'Smooth Stone', '#a0a0a0', 'n');
d('polished_andesite', 'Polished Andesite', '#868786', 'n');
d('cobblestone', 'Cobblestone', '#7b7b7b', 'r');
d('glass', 'Glass', '#b6dcea', 'g');
d('water', 'Water', '#3d73e0', 'w', { alpha: 0.78 });
d('hopper', 'Hopper', '#43434a', 'hp');
d('chest', 'Chest', '#a06a2c', 'ch');
d('spawner', 'Mob Spawner', '#16232c', 'sp', { glow: true, gcol: '#6fd0ff' });
d('sea_lantern', 'Sea Lantern', '#c5e5da', 'e', { glow: true, gcol: '#bfe8e0' });
d('cobblestone_wall', 'Cobblestone Wall', '#7b7b7b', 'r');
d('gray_carpet', 'Gray Carpet', '#3e4447', 'n');
d('oak_door', 'Oak Door', '#8b6b3a', 'p');
d('player', 'You', '#2aa3b0', 'n', { virtual: true });

const texCache = {};
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbk(rgb, k) { return 'rgb(' + [0, 1, 2].map(i => Math.max(0, Math.min(255, rgb[i] * k)) | 0).join(',') + ')'; }
function tex(key, v) {
  v = (v | 0) & 3; const id = key + '#' + v; if (texCache[id]) return texCache[id];
  const b = BL[key], cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const g = cv.getContext('2d'), R = rng(hash(key) + v * 7919), base = hex(b.col);
  const amp = { n: .07, r: .17, p: .09, b: .08, e: .07, w: .05, hp: .05, ch: .07, sp: .05 }[b.pat] || .08;
  if (b.pat === 'g') {
    g.fillStyle = 'rgba(' + base.join(',') + ',0.30)'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = 'rgba(' + base.map(c => Math.min(255, c + 40)).join(',') + ',0.95)';
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    for (let i = 3; i < 11; i++) if ((i + v) % 5 < 3) g.fillRect(i, 13 - i, 1, 1);
    return texCache[id] = cv;
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let k = 1 + (R() - .5) * 2 * amp, col = base;
    switch (b.pat) {
      case 'b': { const row = y >> 2; if ((y & 3) === 3 || ((x + (row & 1 ? 4 : 0)) & 7) === 7) k *= .72; break; }
      case 'p': if ((y & 3) === 3) k *= .8; break;
      case 'e': { if (x >= 3 && x <= 12 && y >= 3 && y <= 12) k *= 1.12; if (x === 0 || y === 0 || x === 15 || y === 15) k *= .8; break; }
      case 'w': if (((x + (y >> 2) * 5) & 7) < 3) k *= 1.12; else k *= .96; break;
      case 'hp': { const edge = x < 2 || y < 2 || x > 13 || y > 13, bowl = x >= 4 && x <= 11 && y >= 4 && y <= 11, hole = x >= 6 && x <= 9 && y >= 6 && y <= 9; k *= hole ? .35 : bowl ? .7 : edge ? 1.25 : 1; break; }
      case 'ch': { if (x < 1 || y < 1 || x > 14 || y > 14) k *= .7; if (x >= 7 && x <= 8 && y >= 6 && y <= 9) { col = [220, 220, 215]; k = 1; } break; }
      case 'sp': { const cage = (x % 5 === 0 || y % 5 === 0); if (cage) { col = hex('#4a86a8'); k = .9 + R() * .25; } else if ((x * 7 + y * 3) % 11 === 0) { col = hex('#2f8fd0'); k = 1; } break; }
    }
    g.fillStyle = rgbk(col, k); g.fillRect(x, y, 1, 1);
  }
  return texCache[id] = cv;
}

/* ---------- voxel model ---------- */
class Model {
  constructor() {
    this.v = []; for (let y = 0; y < FH; y++) { const pl = []; for (let z = 0; z < FD; z++) pl.push(new Array(FW).fill(null)); this.v.push(pl); }
    this.notes = []; this.arrows = [];
  }
  inb(x, y, z) { return x >= 0 && x < FW && y >= 0 && y < FH && z >= 0 && z < FD; }
  get(x, y, z) { return this.inb(x, y, z) ? this.v[y][z][x] : null; }
  set(x, y, z, m, o) { if (this.inb(x, y, z)) this.v[y][z][x] = Object.assign({ m }, o || {}); }
  fill(x0, y0, z0, x1, y1, z1, m, o) { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, y, z, m, o); }
  clear(x0, y0, z0, x1, y1, z1) { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.inb(x, y, z)) this.v[y][z][x] = null; }
  note(y, x, z, t, o) { this.notes.push(Object.assign({ y, x, z, t }, o || {})); }
  arrow(y, x, z, dx, dz) { this.arrows.push({ y, x, z, dx, dz }); }
  counts() {
    const m = {};
    for (let y = 0; y < FH; y++) for (let z = 0; z < FD; z++) for (let x = 0; x < FW; x++) {
      const b = this.v[y][z][x]; if (!b || BL[b.m].virtual) continue;
      if (b.m === 'water' && !b.src) continue;
      m[b.m] = (m[b.m] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }
}

/* ---------- isometric renderer ---------- */
function drawIso(cv, M, o) {
  o = o || {};
  const maxY = o.maxY === undefined ? FH : o.maxY, cutX = o.cutX === undefined ? FW : o.cutX, cutZ = o.cutZ === undefined ? FD : o.cutZ;
  const tw = 32, th = 16, hh = 16, mg = 16;
  cv.width = (FW + FD) * tw / 2 + 2 * mg; cv.height = (FW + FD) * th / 2 + FH * hh + 2 * mg + 8;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const grd = g.createLinearGradient(0, 0, 0, cv.height); grd.addColorStop(0, '#1c2730'); grd.addColorStop(1, '#101519');
  g.fillStyle = grd; g.fillRect(0, 0, cv.width, cv.height);
  const ox = FD * tw / 2 + mg, oy = mg + FH * hh;
  const P = (x, z, y) => [ox + (x - z) * tw / 2, oy + (x + z) * th / 2 - y * hh];
  const vis = (x, y, z) => { const b = M.get(x, y, z); return b && y < maxY && x <= cutX && z <= cutZ ? b : null; };
  const opq = (x, y, z) => { const b = vis(x, y, z); return !!b && !BL[b.m].alpha && (b.h === undefined || b.h >= 1); };
  const poly = (pts, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); };
  const top = (x, z, y, key, v, a) => { const p = P(x, z, y); g.save(); g.globalAlpha = a; g.setTransform(tw / 2 / 16, th / 2 / 16, -tw / 2 / 16, th / 2 / 16, p[0], p[1]); g.drawImage(tex(key, v), 0, 0, 16.7, 16.7); g.restore(); };
  const south = (x, z, yA, yB, key, v, a) => { const p = P(x, z + 1, yB); g.save(); g.globalAlpha = a; g.setTransform(tw / 2 / 16, th / 2 / 16, 0, hh * (yB - yA) / 16, p[0], p[1]); g.drawImage(tex(key, v), 0, 0, 16.7, 16.7); g.restore(); poly([P(x, z + 1, yB), P(x + 1, z + 1, yB), P(x + 1, z + 1, yA), P(x, z + 1, yA)], 'rgba(0,0,0,' + .2 * a + ')'); };
  const east = (x, z, yA, yB, key, v, a) => { const p = P(x + 1, z, yB); g.save(); g.globalAlpha = a; g.setTransform(-tw / 2 / 16, th / 2 / 16, 0, hh * (yB - yA) / 16, p[0], p[1]); g.drawImage(tex(key, v), 0, 0, 16.7, 16.7); g.restore(); poly([P(x + 1, z, yB), P(x + 1, z + 1, yB), P(x + 1, z + 1, yA), P(x + 1, z, yA)], 'rgba(0,0,0,' + .38 * a + ')'); };
  const glows = [], marks = [];
  for (let s = 0; s <= FW + FD - 2; s++) for (let x = Math.max(0, s - FD + 1); x <= Math.min(FW - 1, s); x++) {
    const z = s - x; if (x > cutX || z > cutZ) continue;
    for (let y = 0; y < Math.min(FH, maxY); y++) {
      const b = M.v[y][z][x]; if (!b) continue;
      const bl = BL[b.m], h = b.h === undefined ? 1 : b.h, a = bl.alpha || 1, v = (x * 7 + z * 13 + y * 5) & 3, yt = y + h;
      const same = (xx, yy, zz) => { const n = vis(xx, yy, zz); return n && n.m === b.m; };
      if (!(opq(x, y + 1, z) && h >= 1) && !(bl.alpha && same(x, y + 1, z) && h >= 1)) top(x, z, yt, b.m, v, a);
      if (!opq(x, y, z + 1) && !(bl.alpha && same(x, y, z + 1))) south(x, z, y, yt, b.m, v, a);
      if (!opq(x + 1, y, z) && !(bl.alpha && same(x + 1, y, z))) east(x, z, y, yt, b.m, v, a);
      if (bl.glow && b.m === 'spawner') glows.push([x, z, y + .5, bl.gcol]);
      if (b.m === 'spawner' || b.m === 'player') marks.push([x, z, y + h, b.m]);
    }
  }
  g.globalCompositeOperation = 'lighter';
  for (const [x, z, y, col] of glows) { const p = P(x + .5, z + .5, y), r = 34, rg = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r), cc = hex(col); rg.addColorStop(0, 'rgba(' + cc.join(',') + ',.45)'); rg.addColorStop(1, 'rgba(' + cc.join(',') + ',0)'); g.fillStyle = rg; g.fillRect(p[0] - r, p[1] - r, r * 2, r * 2); }
  g.globalCompositeOperation = 'source-over';
  g.font = '700 11px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let n = 0;
  for (const [x, z, y, m] of marks) {
    const p = P(x + .5, z + .5, y + .2); const t = m === 'spawner' ? 'S' + (++n) : 'YOU';
    if (m === 'player' && Math.round(y) !== 8) continue;
    g.lineWidth = 3.5; g.strokeStyle = 'rgba(8,12,16,.95)'; g.strokeText(t, p[0], p[1] - 14); g.fillStyle = m === 'spawner' ? '#8fe0ff' : '#ffe08a'; g.fillText(t, p[0], p[1] - 14);
  }
}

/* ---------- layer plan renderer ---------- */
function drawLayer(cv, M, y, o) {
  o = o || {}; const c = 16, mg = 26;
  cv.width = FW * c + mg + 8; cv.height = FD * c + mg + 8;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#12171b'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#8f9ca3'; g.font = '10px "JetBrains Mono", monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
  for (let x = 0; x < FW; x += 4) g.fillText(x, mg + x * c + c / 2, 12);
  g.textAlign = 'right'; for (let z = 0; z < FD; z += 4) g.fillText(z, mg - 5, mg + z * c + c / 2);
  for (let z = 0; z < FD; z++) for (let x = 0; x < FW; x++) {
    const px = mg + x * c, py = mg + z * c, b = M.v[y][z][x], v = (x * 7 + z * 13 + y * 5) & 3;
    if (b) {
      const bl = BL[b.m];
      if (bl.alpha) { const u = y > 0 ? M.v[y - 1][z][x] : null; if (u && !BL[u.m].alpha) { g.globalAlpha = .45; g.drawImage(tex(u.m, v), px, py); g.globalAlpha = 1; } else { g.fillStyle = '#1d2a33'; g.fillRect(px, py, c, c); } g.globalAlpha = (b.h !== undefined && b.h < .6) ? .6 : .85; g.drawImage(tex(b.m, v), px, py); g.globalAlpha = 1; if (b.src) { g.fillStyle = '#fff'; g.fillRect(px + 6, py + 6, 4, 4); } }
      else { g.drawImage(tex(b.m, v), px, py); }
      if (b.m === 'spawner') { g.strokeStyle = '#8fe0ff'; g.lineWidth = 2; g.strokeRect(px + 1, py + 1, c - 2, c - 2); }
    } else {
      const u = y > 0 ? M.v[y - 1][z][x] : null;
      if (u) { g.globalAlpha = .28; g.drawImage(tex(u.m, v), px, py); g.globalAlpha = 1; }
    }
  }
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; g.strokeRect(mg - .5, mg - .5, FW * c + 1, FD * c + 1);
  if (o.grid) { g.strokeStyle = 'rgba(255,255,255,.18)'; g.beginPath(); for (let x = 0; x <= FW; x += 4) { g.moveTo(mg + x * c + .5, mg); g.lineTo(mg + x * c + .5, mg + FD * c); } for (let z = 0; z <= FD; z += 4) { g.moveTo(mg, mg + z * c + .5); g.lineTo(mg + FW * c, mg + z * c + .5); } g.stroke(); }
  for (const a of M.arrows) if (a.y === y) {
    const cx = mg + (a.x + .5) * c, cy = mg + (a.z + .5) * c, L = 6, ang = Math.atan2(a.dz, a.dx);
    g.save(); g.translate(cx, cy); g.rotate(ang); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L - 2, 0); g.stroke(); g.beginPath(); g.moveTo(L + 2, 0); g.lineTo(L - 4, -4); g.lineTo(L - 4, 4); g.closePath(); g.fill(); g.restore();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const n of M.notes) if (n.y === y) {
    const s = n.s || 11, lines = n.t.split('\n'); g.font = '600 ' + s + 'px "IBM Plex Sans", system-ui, sans-serif';
    lines.forEach((t, i) => { const px = mg + (n.x + .5) * c, py = mg + (n.z + .5) * c + (i - (lines.length - 1) / 2) * (s + 1); g.lineWidth = 3.5; g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,12,16,.95)'; g.strokeText(t, px, py); g.fillStyle = '#fff'; g.fillText(t, px, py); });
  }
  g.fillStyle = '#c8d2d6'; g.font = '700 10px "JetBrains Mono", monospace'; g.textAlign = 'left'; g.fillText('N↑', 2, 12);
  return { c, mg };
}

/* ---------- cross-section renderer ---------- */
function drawSection(cv, M, axis, k) {
  const c = 16, mg = 26, W = (axis === 'x' ? FD : FW);
  cv.width = W * c + mg + 8; cv.height = FH * c + mg + 8;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#12171b'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#8f9ca3'; g.font = '10px "JetBrains Mono", monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
  for (let i = 0; i < W; i += 4) g.fillText(i, mg + i * c + c / 2, 12);
  g.textAlign = 'right'; for (let y = 0; y < FH; y++) g.fillText(y, mg - 5, mg + (FH - 1 - y) * c + c / 2);
  for (let y = 0; y < FH; y++) for (let i = 0; i < W; i++) {
    const b = axis === 'x' ? M.v[y][i][k] : M.v[y][k][i], px = mg + i * c, py = mg + (FH - 1 - y) * c, v = (i * 7 + y * 5) & 3;
    g.fillStyle = (y >= 5 ? '#17222a' : '#141a1f'); g.fillRect(px, py, c, c);
    if (!b) continue; const bl = BL[b.m];
    g.globalAlpha = bl.alpha ? (b.h !== undefined && b.h < .6 ? .55 : .8) : 1;
    const h = b.h === undefined ? 1 : b.h;
    if (h < 1) { g.save(); g.beginPath(); g.rect(px, py + c * (1 - h), c, c * h); g.clip(); g.drawImage(tex(b.m, v), px, py); g.restore(); } else g.drawImage(tex(b.m, v), px, py);
    g.globalAlpha = 1;
    if (b.m === 'spawner') { g.strokeStyle = '#8fe0ff'; g.lineWidth = 2; g.strokeRect(px + 1, py + 1, c - 2, c - 2); }
  }
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.strokeRect(mg - .5, mg - .5, W * c + 1, FH * c + 1);
  return { c, mg };
}
