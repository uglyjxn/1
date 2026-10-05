'use strict';
const FL = DESIGNS.map(def => { const f = new Floor(def); f.gen(def.fn); f.counts = countBlocks(f); f.sym = f.symmetry(); return f; });
const $ = (s, r) => (r || document).querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stacks = n => { const s = Math.floor(n / 64), r = n % 64; return n.toLocaleString('en-US') + (s ? '  ·  ' + s + '×64' + (r ? '+' + r : '') : ''); };
function swatch(key, px) {
  const c = document.createElement('canvas'); c.width = c.height = 16; if (px) c.style.width = c.style.height = px + 'px';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(tex(key, 0), 0, 0); return c;
}

const kinds = FL.map(f => f.counts.length);
$('#facts').innerHTML = [
  ['35 \u00d7 58', 'Blocks per floor'], ['2,030', 'Blocks to fill, about 32 stacks'], [String(FL.length), 'Designs, each with its own palette'], [Math.min(...kinds) + '\u2013' + Math.max(...kinds), 'Block types per design']
].map(a => '<div class="fact"><b>' + a[0] + '</b><span>' + a[1] + '</span></div>').join('');

/* ---------- gallery ---------- */
const gal = $('#gallery');
const GROUPS = { 1: 'Set 1: decorative patterns', 2: 'Set 2: realistic stone', 3: 'Set 3: Victorian and 1920s' };
let lastGroup = 0;
FL.forEach(f => {
  const g = f.group || 1;
  if (g !== lastGroup) { lastGroup = g; const h = el('li', 'ghead', esc(GROUPS[g])); gal.appendChild(h); }
  const li = el('li'), b = el('button'); b.type = 'button'; b.dataset.n = f.n;
  b.innerHTML = '<canvas></canvas><span class="gh"><span class="num">' + f.n + '</span><span class="nm">' + esc(f.name) + '</span></span>';
  drawThumb($('canvas', b), f, 5);
  b.onclick = () => select(f.n, true);
  li.appendChild(b); gal.appendChild(li);
});

/* ---------- detail ---------- */
let cur = 0, view = { grid: false, axes: false, walls: 3, cols: true, night: false };
function select(n, scroll) {
  cur = n; const f = FL[n - 1];
  history.replaceState(null, '', '#f' + n);
  gal.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(+b.dataset.n === n)));
  const d = $('#detail'); d.innerHTML = '';
  d.appendChild(el('div', 'fh', '<span class="fnum">' + String(n).padStart(2, '0') + '</span><h2>' + esc(f.name) + '</h2><p class="tagline">' + esc(f.tag) + '</p>'));
  const cols = el('div', 'cols'), cl = el('div', 'col'), cr = el('div', 'col');
  const tg = (label, key) => { const b = el('button', 'tog', label); b.type = 'button'; b.setAttribute('aria-pressed', String(view[key])); b.onclick = () => { view[key] = !view[key]; b.setAttribute('aria-pressed', String(view[key])); renderViews(); }; return b; };
  // plan
  const planBox = el('div'); planBox.appendChild(el('h3', '', 'Floor plan, top-down (north is up)'));
  const tb = el('div', 'toolbar'); tb.appendChild(tg('5-block grid', 'grid')); tb.appendChild(tg('Centre axes', 'axes')); planBox.appendChild(tb);
  const ps = el('div', 'stage'), pc = el('canvas'); ps.appendChild(pc); planBox.appendChild(ps);
  const ro = el('div', 'readout', 'Hover the plan for coordinates and the block.'); planBox.appendChild(ro);
  planBox.appendChild(el('div', 'legend', '<span>Ruler numbers are x (top) and z (left). Dashed lines mark the centre at x 17 and between z 28 and 29.</span>'));
  cl.appendChild(planBox);
  // in-game
  const isoBox = el('div'); isoBox.appendChild(el('h3', '', 'In-game view'));
  const tb2 = el('div', 'toolbar');
  const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Hall walls');
  [[0, 'No walls'], [3, 'Low walls'], [6, 'Full walls']].forEach(([c, t]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(view.walls === c)); b.onclick = () => { view.walls = c; seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderViews(); }; seg.appendChild(b); });
  tb2.appendChild(seg); tb2.appendChild(tg('Columns', 'cols')); tb2.appendChild(tg('Night lighting', 'night'));
  isoBox.appendChild(tb2);
  const is = el('div', 'stage'), ic = el('canvas'); is.appendChild(ic); isoBox.appendChild(is);
  isoBox.appendChild(el('p', 'small', 'Isometric, viewed from the south-east. Walls and columns are context only and are not part of the floor.'));
  // palette
  const palBox = el('div'); palBox.appendChild(el('h3', '', 'Block palette'));
  const pg = el('div', 'palette');
  f.palette.forEach(([role, key]) => {
    const b = BL[key], c = el('div', 'pal'); c.appendChild(swatch(key));
    c.appendChild(el('div', '', '<div class="role">' + esc(role) + '</div><div class="bn">' + esc(b.name) + '</div><div class="bid">minecraft:' + key + '</div>'));
    pg.appendChild(c);
  });
  palBox.appendChild(pg);
  // guide
  const gb = el('div'); gb.appendChild(el('h3', '', 'Build guide'));
  const ol = el('ol', 'notes'); f.steps.forEach(t => ol.appendChild(el('li', '', esc(t)))); gb.appendChild(ol);
  gb.appendChild(el('p', 'small', '<b>Cheaper option.</b> ' + esc(f.swap)));
  const sy = f.sym;
  gb.appendChild(el('p', 'small', 'Mirror symmetry: ' + (sy.lr ? 'left to right' : 'not left to right') + ', ' + (sy.fb ? 'front to back' : 'not front to back') + '. ' + (sy.lr && sy.fb ? 'Build one quarter and mirror it twice (WorldEdit //flip).' : sy.lr ? 'Build half the hall and mirror it across x 17.' : 'Build it in one pass; use the grid view to keep your place.')));
  // materials
  const mb = el('div'); mb.appendChild(el('h3', '', 'Material list'));
  const mg = el('div', 'mats'), mx = f.counts[0][1];
  f.counts.forEach(([k, n]) => {
    const r = el('div', 'mat'); r.appendChild(swatch(k, 18));
    r.appendChild(el('span', '', esc(BL[k].name)));
    r.appendChild(el('div', 'bar', '<i style="width:' + Math.max(2, n / mx * 100) + '%"></i>'));
    r.appendChild(el('span', 'n', stacks(n))); mg.appendChild(r);
  });
  mb.appendChild(mg);
  mb.appendChild(el('p', 'small', 'Counts are surface blocks only, 2,030 in total, counted from the plan on the left. Quantities shown as stacks of 64.'));
  cr.append(el('p', 'concept', esc(f.concept)), isoBox, palBox, gb, mb);
  cols.append(cl, cr); d.appendChild(cols);
  let pinfo;
  const renderViews = () => { pinfo = drawPlan(pc, f, { grid: view.grid, axes: view.axes }); drawIso(ic, f, { walls: view.walls, cols: view.cols, night: view.night }); };
  renderViews();
  pc.addEventListener('mousemove', e => {
    const r = pc.getBoundingClientRect(), s = pc.width / r.width;
    const x = Math.floor(((e.clientX - r.left) * s - pinfo.m) / pinfo.c), z = Math.floor(((e.clientY - r.top) * s - pinfo.m) / pinfo.c), c = f.at(x, z);
    ro.textContent = c ? 'x ' + x + ', z ' + z + '  ·  ' + BL[c.f].name : 'Hover the plan for coordinates and the block.';
  });
  pc.addEventListener('mouseleave', () => { ro.textContent = 'Hover the plan for coordinates and the block.'; });
  if (scroll) d.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const m = /^#f(\d+)$/.exec(location.hash);
select(m && +m[1] >= 1 && +m[1] <= FL.length ? +m[1] : 1, false);
