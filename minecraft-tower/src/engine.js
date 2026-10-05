'use strict';
/* ============================================================
   Hall floors: block data, textures, floor model, renderers
   Grid: x = west->east (0..34), z = north->south (0..57)
   Heights are in blocks above the floor slab (floor pitch = 7)
   ============================================================ */
const GW = 35, GD = 58, PITCH = 7;

/* ---------- block dictionary ---------- */
const BL = {};
function d(key, col, pat, o) {
  BL[key] = Object.assign({
    key, col, pat: pat || 'n',
    name: key.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join(' ')
  }, o || {});
}
// stone & mineral
d('stone', '#7d7d7d', 'r'); d('smooth_stone', '#a0a0a0', 'n'); d('stone_bricks', '#7a7a7a', 'b');
d('mossy_stone_bricks', '#6f7b62', 'b'); d('cobblestone', '#7b7b7b', 'r'); d('polished_andesite', '#868786', 'n');
d('polished_diorite', '#c4c4c4', 'n'); d('smooth_quartz', '#ece7de', 'n'); d('quartz_bricks', '#e8e2d8', 'b');
d('quartz_pillar', '#ebe6dd', 'l'); d('chiseled_quartz_block', '#e9e4da', 'c'); d('quartz_slab', '#ece7de', 'n');
d('polished_deepslate', '#484849', 't'); d('deepslate_tiles', '#363637', 't'); d('deepslate_bricks', '#474748', 'b');
d('cobbled_deepslate', '#4f4f52', 'r'); d('polished_blackstone', '#353139', 'n'); d('polished_blackstone_bricks', '#302c34', 'b');
d('gilded_blackstone', '#3a3139', 'o', { speck: '#f0cc4a' }); d('tuff', '#6c6d63', 'r'); d('tuff_bricks', '#6b6c62', 'b');
d('polished_tuff', '#727368', 'n'); d('calcite', '#dfe0dc', 'n'); d('smooth_basalt', '#48484d', 'n');
d('obsidian', '#14111f', 'n'); d('crying_obsidian', '#2a0d55', 'o', { speck: '#8a3fe0', glow: true });
d('amethyst_block', '#8561c4', 'r'); d('purpur_block', '#a77ca7', 'c'); d('purpur_pillar', '#ac80ac', 'l');
d('end_stone_bricks', '#dfe2ab', 'b'); d('bricks', '#965548', 'b'); d('mud_bricks', '#8a674d', 'b');
d('smooth_sandstone', '#dfd3a1', 'n'); d('sand', '#dbd0a0', 'r'); d('prismarine_bricks', '#63ab9b', 'b');
d('prismarine', '#63a895', 'r'); d('dark_prismarine', '#355f4d', 'r');
d('sea_lantern', '#c5e5da', 'e', { glow: true }); d('glowstone', '#f0c060', 'e', { glow: true });
d('shroomlight', '#f29a45', 'e', { glow: true }); d('redstone_lamp', '#f5c46f', 'e', { glow: true });
d('copper_bulb', '#d9a074', 'e', { glow: true }); d('redstone_block', '#ab1b0a', 'n');
d('iron_block', '#dcdcdc', 'n'); d('gold_block', '#f6d03c', 'n'); d('diamond_block', '#63dbd5', 'n');
d('emerald_block', '#2bd668', 'n'); d('lapis_block', '#1f43a0', 'r');
d('copper_block', '#c26e4e', 'n'); d('cut_copper', '#c06c50', 't'); d('exposed_cut_copper', '#a37b64', 't');
d('weathered_cut_copper', '#6d936b', 't'); d('oxidized_cut_copper', '#52a386', 't'); d('copper_grate', '#c06c4f', 't');
d('oxidized_copper', '#52a386', 'n');
// concrete & terracotta
d('white_concrete', '#cfd5d6', 'n'); d('light_gray_concrete', '#9d9d97', 'n'); d('gray_concrete', '#373a3e', 'n');
d('black_concrete', '#080a0f', 'n'); d('yellow_concrete', '#f1af15', 'n'); d('blue_concrete', '#2c2f8f', 'n');
d('red_concrete', '#8e2121', 'n'); d('orange_concrete', '#e06101', 'n'); d('lime_concrete', '#5ea918', 'n');
d('purple_concrete', '#64209c', 'n'); d('light_blue_concrete', '#2389c6', 'n');
d('terracotta', '#985f45', 'n'); d('white_terracotta', '#d1b2a1', 'n'); d('orange_terracotta', '#a25427', 'n');
d('red_terracotta', '#8f3d2e', 'n'); d('yellow_terracotta', '#ba8524', 'n'); d('green_terracotta', '#4c532a', 'n');
d('brown_terracotta', '#4d3324', 'n'); d('cyan_terracotta', '#575b5b', 'n');
// wood
d('oak_planks', '#a2834f', 'p'); d('spruce_planks', '#7a5a35', 'p'); d('birch_planks', '#c5b27a', 'p');
d('dark_oak_planks', '#432b14', 'p'); d('cherry_planks', '#e2b2ac', 'p'); d('bamboo_planks', '#c1ad50', 'p');
d('pale_oak_planks', '#e4dbd3', 'p'); d('crimson_planks', '#6a3345', 'p'); d('warped_planks', '#2b6a63', 'p');
d('spruce_slab', '#7a5a35', 'p'); d('dark_oak_slab', '#432b14', 'p'); d('cherry_slab', '#e2b2ac', 'p');
d('birch_slab', '#c5b27a', 'p'); d('oak_slab', '#a2834f', 'p'); d('pale_oak_slab', '#e4dbd3', 'p');
d('stripped_spruce_log', '#73583a', 'l'); d('stripped_dark_oak_log', '#4a3720', 'l'); d('stripped_birch_log', '#c5b07a', 'l');
d('stripped_cherry_log', '#d59e98', 'l'); d('stripped_pale_oak_log', '#e8dfd7', 'l'); d('stripped_oak_log', '#b29155', 'l');
d('oak_log', '#6c5434', 'l'); d('dark_oak_log', '#3d2d1b', 'l'); d('cherry_log', '#4b2c3c', 'l');
d('spruce_log', '#3a2a18', 'l'); d('pale_oak_log', '#5b4e4e', 'l'); d('birch_log', '#d8d5c9', 'l');
d('bookshelf', '#6d5534', 's'); d('chiseled_bookshelf', '#6f5a38', 's'); d('lectern', '#a4824c', 'p');
d('crafting_table', '#8c6234', 'p'); d('barrel', '#7d5b2d', 'p'); d('composter', '#6b4f27', 'p'); d('loom', '#a08a5b', 'p');
// nature
d('grass_block', '#7aa84d', 'r'); d('dirt', '#866043', 'r'); d('dirt_path', '#957a47', 'r'); d('farmland', '#5a3b22', 'f');
d('moss_block', '#5a6e2d', 'r'); d('pale_moss_block', '#8a9a86', 'r'); d('azalea_leaves', '#5c7b2e', 'k');
d('flowering_azalea_leaves', '#6c7f3e', 'k', { speck: '#e58ac0' }); d('oak_leaves', '#4a8a2c', 'k');
d('cherry_leaves', '#e9a9c7', 'k'); d('pale_oak_leaves', '#7b8f76', 'k'); d('spruce_leaves', '#3a5c3a', 'k');
d('hay_block', '#b6960f', 'h'); d('melon', '#8aa028', 'n'); d('pumpkin', '#c27619', 'n');
d('water', '#3d73e0', 'w', { alpha: 0.88 }); d('lava', '#e5600c', 'w', { glow: true });
d('bee_nest', '#c8a24f', 'n'); d('packed_ice', '#8db3f9', 'n'); d('blue_ice', '#74a8fd', 'n'); d('snow_block', '#f8fefe', 'n');
d('lily_pad', '#2c7a2e', 'k'); d('wheat', '#d6c35c', 'h'); d('carrots', '#e58a1b', 'r'); d('potatoes', '#bd9f5c', 'r');
d('beetroots', '#a82d3a', 'r'); d('poppy', '#d3301f', 'r'); d('azure_bluet', '#e7ece8', 'r'); d('cornflower', '#4a6fdc', 'r');
d('dandelion', '#f2d12a', 'r'); d('pink_petals', '#f3a6cf', 'r'); d('allium', '#b86bd6', 'r');
// glass & misc
d('glass', '#b6dcea', 'g'); d('tinted_glass', '#2e2438', 'g'); d('light_blue_stained_glass', '#6fb2e6', 'g');
d('purple_stained_glass', '#8a50c4', 'g'); d('white_stained_glass', '#f2f4f4', 'g');
d('iron_bars', '#9aa0a4', 'i'); d('nether_portal', '#7d2fd0', 'w', { alpha: 0.78, glow: true });
d('furnace', '#737373', 'n'); d('blast_furnace', '#5d5d60', 'n'); d('smoker', '#6a5f55', 'n');
d('smithing_table', '#3a3f4a', 'p'); d('anvil', '#3c3c3c', 'n'); d('grindstone', '#8d8d8d', 'n'); d('cauldron', '#2f2f32', 'n');
d('brewing_stand', '#a59a8a', 'n'); d('enchanting_table', '#7b1e2b', 'o', { speck: '#7ff0e0' }); d('beacon', '#6be0d8', 'e', { glow: true });
d('campfire', '#d8742a', 'e', { glow: true }); d('hopper', '#404045', 'n'); d('rail', '#8a7a5a', 'n'); d('target', '#e9a39a', 'c');
d('piston', '#9b8b66', 'n'); d('observer', '#6c6c6c', 'r'); d('creaking_heart', '#6d5c57', 'o', { speck: '#e0802a' });
d('resin_bricks', '#d65c1a', 'b'); d('resin_block', '#e06a20', 'n');
d('blue_terracotta', '#4a3b5b', 'n'); d('cut_sandstone', '#dccf9c', 'c'); d('chiseled_stone_bricks', '#7a7a7a', 'c');
d('cracked_stone_bricks', '#767676', 'b'); d('nether_bricks', '#2d1518', 'b'); d('red_nether_bricks', '#450709', 'b');
d('bamboo_mosaic', '#bba454', 'c'); d('magma_block', '#8d3b13', 'e', { glow: true });
// wool & carpet
const WOOLS = {
  white: '#e9ecec', red: '#a12722', blue: '#35399d', light_blue: '#3ab3da', yellow: '#f8c627', green: '#546d1b',
  lime: '#70b919', magenta: '#bd44b3', pink: '#ed8dac', orange: '#f07613', gray: '#3e4447', black: '#141519',
  brown: '#724728', purple: '#7b2fbe', cyan: '#158991', light_gray: '#8e8e86'
};
for (const c in WOOLS) { d(c + '_wool', WOOLS[c], 'n'); d(c + '_carpet', WOOLS[c], 'n'); }
d('void', '#0b0e12', 'v', { virtual: true, name: 'Open void (no floor)' });

/* ---------- procedural 16x16 textures ---------- */
const texCache = {};
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbk(rgb, k) { return 'rgb(' + [0, 1, 2].map(i => Math.max(0, Math.min(255, rgb[i] * k)) | 0).join(',') + ')'; }
const BOOKS = ['#7a2a2a', '#2a5a7a', '#3a6a2a', '#9a7a2a', '#5a3a7a', '#2a2a2a', '#7a4a2a'];

function tex(key, v) {
  v = (v | 0) & 3;
  const id = key + '#' + v;
  if (texCache[id]) return texCache[id];
  const b = BL[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const g = cv.getContext('2d');
  const R = rng(hash(key) + v * 7919);
  const base = hex(b.col);
  const amp = { n: .07, r: .17, p: .09, l: .08, b: .08, t: .07, e: .07, k: .12, w: .05, s: .05, f: .12, h: .09, o: .08, c: .06, v: .05 }[b.pat] || .08;
  if (b.pat === 'g') {
    g.fillStyle = 'rgba(' + base.join(',') + ',0.30)'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = 'rgba(' + base.map(c => Math.min(255, c + 40)).join(',') + ',0.95)';
    g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
    for (let i = 3; i < 11; i++) { if ((i + v) % 5 < 3) g.fillRect(i, 11 - i + 2, 1, 1); }
    return texCache[id] = cv;
  }
  if (b.pat === 'i') {
    g.fillStyle = 'rgba(' + base.join(',') + ',0.9)';
    g.fillRect(7, 0, 2, 16); g.fillRect(0, 7, 16, 2);
    return texCache[id] = cv;
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let k = 1 + (R() - .5) * 2 * amp;
    switch (b.pat) {
      case 'b': { const row = y >> 2; if ((y & 3) === 3 || ((x + (row & 1 ? 4 : 0)) & 7) === 7) k *= .72; break; }
      case 'p': { if ((y & 3) === 3) k *= .8; if (x === ((y >> 2) * 5 + v * 3) % 16) k *= .82; break; }
      case 'l': { if ((x & 3) === 0) k *= .87; if ((x & 7) === 4) k *= 1.05; break; }
      case 't': { if (x === 7 || x === 15 || y === 7 || y === 15) k *= .8; break; }
      case 'c': { if (((x >> 2) + (y >> 2)) & 1) k *= .9; break; }
      case 'e': { if (x >= 3 && x <= 12 && y >= 3 && y <= 12) k *= 1.12; if (x === 0 || y === 0 || x === 15 || y === 15) k *= .8; break; }
      case 'k': { const r = R(); if (r < .28) k *= .55; else if (r < .45) k *= 1.15; break; }
      case 'w': { if (((x + (y >> 2) * 5) & 7) < 3) k *= 1.12; else k *= .96; break; }
      case 'f': { if ((y & 3) === 0) k *= .7; break; }
      case 'h': { if ((y & 3) === 0) k *= .85; if (x > 5 && x < 10) k *= 1.06; break; }
      case 'v': { if (((x + y) & 3) === 0) k *= 1.6; break; }
      case 's': {
        if (y === 0 || y === 7 || y === 8 || y === 15) { g.fillStyle = rgbk(hex('#a2834f'), .8 + R() * .15); g.fillRect(x, y, 1, 1); continue; }
        const bk = hex(BOOKS[((x >> 1) + (y >> 3) * 3 + v) % BOOKS.length]);
        g.fillStyle = rgbk(bk, .85 + R() * .3); g.fillRect(x, y, 1, 1); continue;
      }
      case 'o': { if (R() < .1) { g.fillStyle = b.speck || '#fff'; g.fillRect(x, y, 1, 1); continue; } break; }
    }
    g.fillStyle = rgbk(base, k); g.fillRect(x, y, 1, 1);
    if (b.pat === 'k' && b.speck && R() < .06) { g.fillStyle = b.speck; g.fillRect(x, y, 1, 1); }
  }
  return texCache[id] = cv;
}
function isGlass(key) { return BL[key].pat === 'g'; }

/* ---------- floor model ---------- */
function h2(x, z, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1274126177) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vn(x, z, s) {
  const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = h2(x0, z0, s), b = h2(x0 + 1, z0, s), c = h2(x0, z0 + 1, s), d = h2(x0 + 1, z0 + 1, s);
  return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz;
}
class Floor {
  constructor(def) {
    Object.assign(this, def);
    this.c = [];
    for (let z = 0; z < GD; z++) { const r = []; for (let x = 0; x < GW; x++) r.push({ f: null, b: [] }); this.c.push(r); }
  }
  at(x, z) { return (x >= 0 && x < GW && z >= 0 && z < GD) ? this.c[z][x] : null; }
  // fn gets cell info: x,z, ux/uz (offset from hall centre), a/b (abs offsets), r (radius), d (distance from the nearest edge)
  gen(fn) {
    for (let z = 0; z < GD; z++) for (let x = 0; x < GW; x++) {
      const ux = x - 17, uz = z - 28.5;
      this.c[z][x].f = fn({ x, z, mx: Math.min(x, GW - 1 - x), mz: Math.min(z, GD - 1 - z), ux, uz, a: Math.abs(ux), b: Math.abs(uz), r: Math.hypot(ux, uz), d: Math.min(x, GW - 1 - x, z, GD - 1 - z) });
    }
    this.dress();
  }
  prop(x, z, m, y1, y0, o) { const c = this.at(x, z); if (c) c.b.push(Object.assign({ m, y0: y0 || 0, y1 }, o || {})); }
  // hall dressing, only shown in the in-game view: back walls and two rows of columns
  dress() {
    const w = this.wallMat || 'stone_bricks', col = this.colMat || 'quartz_pillar';
    for (let x = 0; x < GW; x++) this.prop(x, 0, w, 6, 0, { wall: true, ctx: true });
    for (let z = 1; z < GD; z++) this.prop(0, z, w, 6, 0, { wall: true, ctx: true });
    for (const z of [4, 13, 22, 35, 44, 53]) for (const x of [3, 31]) {
      this.prop(x, z, col, 6, 0, { ctx: true });
      this.prop(x, z, this.capMat || col, 6.5, 6, { ctx: true });
    }
  }
  symmetry() {
    let lr = true, fb = true;
    for (let z = 0; z < GD; z++) for (let x = 0; x < GW; x++) {
      const f = this.c[z][x].f;
      if (f !== this.c[z][GW - 1 - x].f) lr = false;
      if (f !== this.c[GD - 1 - z][x].f) fb = false;
    }
    return { lr, fb };
  }
}
function countBlocks(f) {
  const m = {};
  for (let z = 0; z < GD; z++) for (let x = 0; x < GW; x++) { const k = f.c[z][x].f; m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

/* ---------- plan renderer ---------- */
function drawPlan(cv, f, o) {
  o = o || {};
  const c = 16, m = 26;
  cv.width = GW * c + m + 8; cv.height = GD * c + m + 8;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#12171b'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#8f9ca3'; g.font = '10px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let x = 0; x < GW; x += 5) g.fillText(x, m + x * c + c / 2, 12);
  g.textAlign = 'right';
  for (let z = 0; z < GD; z += 5) g.fillText(z, m - 5, m + z * c + c / 2);
  for (let z = 0; z < GD; z++) for (let x = 0; x < GW; x++) {
    const k = f.c[z][x].f, bl = BL[k], px = m + x * c, py = m + z * c, v = (x * 7 + z * 13) % 4;
    if (bl.alpha) { g.drawImage(tex('stone', v), px, py); g.globalAlpha = bl.alpha; }
    g.drawImage(tex(k, v), px, py); g.globalAlpha = 1;
  }
  if (o.grid) {
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= GW; x += 5) { g.moveTo(m + x * c + .5, m); g.lineTo(m + x * c + .5, m + GD * c); }
    for (let z = 0; z <= GD; z += 5) { g.moveTo(m, m + z * c + .5); g.lineTo(m + GW * c, m + z * c + .5); }
    g.stroke();
  }
  if (o.axes) {
    g.strokeStyle = '#ffd24a'; g.lineWidth = 1.5; g.setLineDash([6, 4]); g.beginPath();
    g.moveTo(m + 17.5 * c, m); g.lineTo(m + 17.5 * c, m + GD * c);
    g.moveTo(m, m + 29 * c); g.lineTo(m + GW * c, m + 29 * c); g.stroke(); g.setLineDash([]);
  }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.strokeRect(m - .5, m - .5, GW * c + 1, GD * c + 1);
  g.fillStyle = '#c8d2d6'; g.font = '700 10px "JetBrains Mono", monospace'; g.textAlign = 'left'; g.fillText('N↑', 2, 12);
  return { c, m };
}
function drawThumb(cv, f, c) {
  cv.width = GW * c; cv.height = GD * c;
  const g = cv.getContext('2d');
  for (let z = 0; z < GD; z++) for (let x = 0; x < GW; x++) {
    const bl = BL[f.c[z][x].f]; g.fillStyle = bl.col; g.fillRect(x * c, z * c, c, c);
    if ((x * 7 + z * 13) % 3 === 0) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(x * c, z * c, c, c); }
  }
}

/* ---------- isometric renderer ---------- */
function drawIso(cv, f, o) {
  o = o || {};
  const night = !!o.night, walls = o.walls || 0, cols = !!o.cols;
  const tw = 24, th = 12, hh = 12, mg = 16, maxH = 8;
  cv.width = (GW + GD) * tw / 2 + 2 * mg;
  cv.height = (GW + GD) * th / 2 + maxH * hh + 2 * mg + 8;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const grd = g.createLinearGradient(0, 0, 0, cv.height);
  if (night) { grd.addColorStop(0, '#05070d'); grd.addColorStop(1, '#0d1220'); } else { grd.addColorStop(0, '#1c2730'); grd.addColorStop(1, '#101519'); }
  g.fillStyle = grd; g.fillRect(0, 0, cv.width, cv.height);
  const ox = GD * tw / 2 + mg, oy = mg + maxH * hh;
  const P = (x, z, y) => [ox + (x - z) * tw / 2, oy + (x + z) * th / 2 - y * hh];
  const glows = [];
  const poly = (pts, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); };
  const top = (x, z, y, key, v, alpha) => {
    const p = P(x, z, y); g.save(); g.globalAlpha = alpha || 1;
    g.setTransform(tw / 2 / 16, th / 2 / 16, -tw / 2 / 16, th / 2 / 16, p[0], p[1]);
    g.drawImage(tex(key, v), 0, 0, 16.7, 16.7); g.restore();
  };
  const south = (x, z, yA, yB, key, v) => {
    const p = P(x, z + 1, yB); g.save();
    g.setTransform(tw / 2 / 16, th / 2 / 16, 0, hh * (yB - yA) / 16, p[0], p[1]);
    g.drawImage(tex(key, v), 0, 0, 16.7, 16.7); g.restore();
    poly([P(x, z + 1, yB), P(x + 1, z + 1, yB), P(x + 1, z + 1, yA), P(x, z + 1, yA)], 'rgba(0,0,0,.2)');
  };
  const east = (x, z, yA, yB, key, v) => {
    const p = P(x + 1, z, yB); g.save();
    g.setTransform(-tw / 2 / 16, th / 2 / 16, 0, hh * (yB - yA) / 16, p[0], p[1]);
    g.drawImage(tex(key, v), 0, 0, 16.7, 16.7); g.restore();
    poly([P(x + 1, z, yB), P(x + 1, z + 1, yB), P(x + 1, z + 1, yA), P(x + 1, z, yA)], 'rgba(0,0,0,.38)');
  };
  for (let s = 0; s <= GW + GD - 2; s++) {
    for (let x = Math.max(0, s - GD + 1); x <= Math.min(GW - 1, s); x++) {
      const z = s - x, cell = f.c[z][x], v = (x * 7 + z * 13) % 4, bl = BL[cell.f];
      if (bl.alpha) { top(x, z, -.6, 'stone', v, 1); top(x, z, -.12, cell.f, v, bl.alpha); } else top(x, z, 0, cell.f, v, 1);
      if (bl.glow) glows.push([x, z, 0, bl.col]);
      for (const b of cell.b) {
        let y1 = b.y1;
        if (b.wall) { if (!walls) continue; y1 = Math.min(y1, walls); } else if (b.ctx && !cols) continue;
        const k = BL[b.m];
        for (let l = Math.floor(b.y0 + 1e-6); l < y1 - 1e-6; l++) {
          const yA = Math.max(b.y0, l), yB = Math.min(y1, l + 1);
          south(x, z, yA, yB, b.m, v); east(x, z, yA, yB, b.m, v);
        }
        top(x, z, y1, b.m, v, 1);
        if (k.glow) glows.push([x, z, y1, k.col]);
      }
    }
  }
  if (night) { g.fillStyle = 'rgba(5,8,24,.55)'; g.fillRect(0, 0, cv.width, cv.height); }
  g.globalCompositeOperation = 'lighter';
  for (const [x, z, y, col] of glows) {
    const p = P(x + .5, z + .5, y), r = night ? 40 : 14, a = night ? .55 : .1;
    const rg = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r), cc = hex(col);
    rg.addColorStop(0, 'rgba(' + cc.join(',') + ',' + a + ')'); rg.addColorStop(1, 'rgba(' + cc.join(',') + ',0)');
    g.fillStyle = rg; g.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
  }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#c8d2d6'; g.font = '700 11px "JetBrains Mono", monospace'; g.textAlign = 'left';
  const nw = P(0, 0, 0), ne = P(GW, 0, 0), sw = P(0, GD, 0), se = P(GW, GD, 0);
  g.fillText('NW', nw[0] - 10, nw[1] - 80); g.fillText('NE', ne[0] + 6, ne[1] - 2);
  g.fillText('SW', sw[0] - 22, sw[1] + 4); g.fillText('SE', se[0] - 8, se[1] + 14);
}
