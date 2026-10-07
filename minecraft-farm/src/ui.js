'use strict';
const M = buildFarm();
const $ = (s, r) => (r || document).querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stacks = n => { const s = Math.floor(n / 64), r = n % 64; return n.toLocaleString('en-US') + (s ? '  ·  ' + s + '×64' + (r ? '+' + r : '') : ''); };
function swatch(key, px) { const c = document.createElement('canvas'); c.width = c.height = 16; if (px) c.style.width = c.style.height = px + 'px'; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(tex(key, 0), 0, 0); return c; }

/* ---------- the numbers behind the gallery ---------- */
const MOBS = [{ n: 'Zombie', w: .6, h: 1.95 }, { n: 'Spider', w: 1.4, h: .9 }, { n: 'Cave spider', w: .7, h: .5 }];
const EYE = 1.62, REACH = 3.0, D = 2.5;                    // eye height, sword reach, distance from your centre to the pen edge
const youReach = m => Math.sqrt(REACH * REACH - Math.max(0, EYE - m.h) ** 2);      // sideways reach to the hitbox edge
const biteReach = m => Math.sqrt((2 * m.w) ** 2 + .6);                              // centre-to-centre melee reach of the mob
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const stand = [18.5, 6, 18.5];
const sdist = SPAWNERS.map(s => dist([s[0] + .5, s[1] + .5, s[2] + .5], stand));

/* ---------- header and flow ---------- */
$('#facts').innerHTML = [
  ['3', 'Spawner slots, one per chamber'], [Math.min(...sdist).toFixed(1) + ' – ' + Math.max(...sdist).toFixed(1), 'Blocks from each spawner to your stand (limit 16)'], ['0.5 – 1.95', 'Mob heights that work, cave spider to zombie'],
  ['37 × 25 × 13', 'Footprint and height in blocks'], ['By hand', 'You kill. Nothing damages the mobs.'], ['1 chest', 'All drops end up in one large chest']
].map(a => '<div class="fact"><b>' + a[0] + '</b><span>' + a[1] + '</span></div>').join('');
$('#flow').innerHTML = [
  ['Spawn', 'Each spawner hangs in the middle of a dark 9 × 9 octagonal room with a water floor. Mobs spawn in the water or fall into it.'],
  ['Wash', 'Floor water runs into a 3 × 3 drop shaft. Mobs fall one block into a 3-wide channel and are carried to the pen.'],
  ['Queue', 'The pen is dry. Mobs step up one block out of the channel, see you, and walk to the front edge. A trench and a low wall stop them there.'],
  ['Kill and collect', 'You stand 2.5 blocks back and hit over the wall. Drops land on a hopper row in the pen and in the trench, and every hopper leads to the same chest.']
].map(a => '<li><b>' + a[0] + '</b><span>' + a[1] + '</span></li>').join('');

/* ---------- 3D view ---------- */
const v3 = { maxY: 10, cutX: false, cutZ: false };
const tb3 = $('#tb3d'), iso = $('#iso');
const render3 = () => drawIso(iso, M, { maxY: v3.maxY, cutX: v3.cutX ? 18 : undefined, cutZ: v3.cutZ ? 16 : undefined });
const presets = [['All roofs', 13], ['Roofs off', 10], ['Ground level', 8], ['Underground', 7], ['Mob level', 6]];
const seg = el('div', 'seg'); presets.forEach(([t, y]) => { const b = el('button', '', t); b.type = 'button'; b.dataset.y = y; b.setAttribute('aria-pressed', String(v3.maxY === y)); b.onclick = () => { v3.maxY = y; sync(); render3(); }; seg.appendChild(b); });
const sl = el('div', 'slider', '<label for="cy">Show up to layer</label><input id="cy" type="range" min="1" max="13" step="1" value="' + v3.maxY + '"><b id="cyv">' + (v3.maxY - 1) + '</b>');
const mkTog = (t, k) => { const b = el('button', 'tog', t); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.onclick = () => { v3[k] = !v3[k]; b.setAttribute('aria-pressed', String(v3[k])); render3(); }; return b; };
tb3.append(seg, sl, mkTog('Cut away east half', 'cutX'), mkTog('Cut away gallery half', 'cutZ'));
function sync() { $('#cy').value = v3.maxY; $('#cyv').textContent = v3.maxY - 1; seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.y === v3.maxY))); }
$('#cy').oninput = e => { v3.maxY = +e.target.value; sync(); render3(); };
render3();
$('#legend3d').innerHTML = '<span>Labels: S1 to S3 are the spawner slots, YOU is where you stand.</span>';
['stone_bricks', 'smooth_stone', 'polished_andesite', 'water', 'hopper', 'chest', 'spawner', 'cobblestone', 'cobblestone_wall', 'gray_carpet', 'sea_lantern'].forEach(k => { const s = el('span'); s.appendChild(swatch(k)); s.appendChild(document.createTextNode(BL[k].name)); $('#legend3d').appendChild(s); });

/* ---------- layers ---------- */
const LAYERS = [
  ['Base', 'Solid stone bricks under the pen and gallery. Nothing else is on this layer.'],
  ['Base', 'Solid stone bricks. Nothing else is on this layer.'],
  ['Base', 'Solid stone bricks. Nothing else is on this layer.'],
  ['Chest and trench hoppers', 'A large chest at x 18–19, z 15. The trench hoppers run along z 16. Facing: x 15–17 → east, x 18 → north (into the chest), x 19–21 ← west.'],
  ['Collectors and channel floors', 'Collector hoppers under the pen front row, along z 15. Facing: x 15–17 → east, x 18 ↓ DOWN (into the chest), x 19–21 ← west. Channel floors are polished andesite, 5 wide. The trench is open here.'],
  ['Channel water, pen floor, gallery floor', 'Each channel is 3 wide with a row of source blocks (white dots) at each end, so the water reaches the pen. The pen floor top is one block above the channel floor: mobs step up. The front row of the pen is hoppers that face down into the collectors. The trench is 1 wide. The gallery floor and the overhang over the trench are smooth stone.'],
  ['Headroom, carpet, wall', 'One block of air above channel water. Gray carpet covers the pen so nothing can spawn there. The cobblestone wall sits on the overhang. The marked cell is where you stand. The side walls of the room have a break at the trench.'],
  ['Ground level', 'Chamber floors have a 3 × 3 hole in the middle. The pen and gallery rooms are dug 2 blocks below this.'],
  ['Chamber floor water', 'Each chamber floor carries a layer of flowing water with four source blocks at the edge midpoints. Arrows point towards the drop shaft.'],
  ['Spawners', 'One spawner in the middle of each chamber, hanging from a stalactite. Also the cobblestone plugs in the chamber side walls.'],
  ['Pen roof and stalactites', 'Stone brick roof over the pen and gallery with two sea lanterns at the far end. Chamber walls and stalactites continue.'],
  ['Chamber upper walls', 'Upper walls of the chambers and the tops of the stalactites.'],
  ['Chamber roofs', 'A flat stone brick roof on each 11 × 11 chamber.']
];
const ly = $('#ly'), plan = $('#plan'); let lyGrid = false, pinfo;
const drawL = () => { const y = +ly.value; $('#lyv').textContent = y; pinfo = drawLayer(plan, M, y, { grid: lyGrid }); const t = $('#laytext'); t.innerHTML = ''; t.appendChild(el('div', 'card', '<h3>Layer ' + y + '</h3><b>' + esc(LAYERS[y][0]) + '</b><p style="margin-top:6px">' + esc(LAYERS[y][1]) + '</p>')); const c = {}; for (let z = 0; z < FD; z++) for (let x = 0; x < FW; x++) { const b = M.v[y][z][x]; if (b && !BL[b.m].virtual) c[b.m] = (c[b.m] || 0) + 1; } const ent = Object.entries(c).sort((a, b) => b[1] - a[1]); const card = el('div', 'card', '<h3>Blocks on this layer</h3>'); const g = el('div', 'mats'); ent.forEach(([k, n]) => { const r = el('div', 'mat'); r.style.gridTemplateColumns = '18px minmax(0,1fr) 70px'; r.appendChild(swatch(k, 18)); r.appendChild(el('span', '', esc(BL[k].name))); r.appendChild(el('span', 'n', String(n))); g.appendChild(r); }); card.appendChild(g); if (!ent.length) card.appendChild(el('p', 'small', 'Empty.')); t.appendChild(card); };
ly.oninput = drawL; $('#lyg').onclick = e => { lyGrid = !lyGrid; e.currentTarget.setAttribute('aria-pressed', String(lyGrid)); drawL(); };
plan.addEventListener('mousemove', e => { const r = plan.getBoundingClientRect(), s = plan.width / r.width, x = Math.floor(((e.clientX - r.left) * s - pinfo.mg) / pinfo.c), z = Math.floor(((e.clientY - r.top) * s - pinfo.mg) / pinfo.c), y = +ly.value; const b = M.get(x, y, z); $('#ro').textContent = (x >= 0 && z >= 0 && x < FW && z < FD) ? 'x ' + x + ', y ' + y + ', z ' + z + '  ·  ' + (b ? BL[b.m].name + (b.src ? ' (source)' : b.m === 'water' ? ' (flowing)' : '') : 'air') : ''; });
drawL();

/* ---------- section ---------- */
let ax = 'x'; const secC = $('#sec'), slr = $('#sl');
const drawS = () => { $('#slv').textContent = slr.value; drawSection(secC, M, ax, +slr.value); };
slr.max = FW - 1; slr.value = 18; slr.oninput = drawS;
document.querySelectorAll('#axseg button').forEach(b => b.onclick = () => { ax = b.dataset.ax; document.querySelectorAll('#axseg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); slr.max = ax === 'x' ? FW - 1 : FD - 1; slr.value = ax === 'x' ? 18 : 18; drawS(); });
drawS();

/* ---------- fit and reach tables ---------- */
const FIT = [
  ['Spawn chamber', '9 wide (octagon), 4 high', ['ok', 'ok', 'ok']],
  ['Drop shaft', '3 × 3, open', ['ok', 'ok', 'ok']],
  ['Channel', '3 wide, 2 high (1 water + 1 air)', MOBS.map(m => m.h <= 2 && m.w <= 3 ? 'ok' : 'bad')],
  ['Pen entrance', '3 wide, 3 high, 1-block step up', ['ok', 'ok', 'ok']],
  ['Pen', '9 × 4, 4 high', ['ok', 'ok', 'ok']],
  ['Trench, open part', '1 wide, 2 deep', ['fall', 'no', 'fall']],
  ['Gallery', 'Behind a wall and a trench', ['no', 'no', 'no']]
];
$('#fitt').innerHTML = '<thead><tr><th>Passage</th><th>Free space</th>' + MOBS.map(m => '<th>' + m.n + '<br><span style="text-transform:none;letter-spacing:0">' + m.w + ' × ' + m.h + '</span></th>').join('') + '</tr></thead><tbody>' +
  FIT.map(r => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td>' + r[2].map(v => '<td class="' + (v === 'ok' ? 'ok' : v === 'bad' ? 'bad' : 'warn') + '">' + ({ ok: 'Fits', bad: 'Does not fit', no: 'Cannot get in (by design)', fall: 'Falls in, stays on the hoppers' })[v] + '</td>').join('') + '</tr>').join('') + '</tbody>';
$('#reach').innerHTML = '<thead><tr><th>Mob at the pen edge</th><th>You can hit out to</th><th>You need</th><th>Its bite reaches</th><th>Its distance to you</th><th>Safety margin</th></tr></thead><tbody>' +
  MOBS.map(m => { const yr = youReach(m), br = biteReach(m), cc = D + m.w / 2, mm = cc - br; return '<tr><td><b>' + m.n + '</b></td><td>' + yr.toFixed(2) + '</td><td class="ok">' + D.toFixed(2) + '</td><td>' + br.toFixed(2) + '</td><td>' + cc.toFixed(2) + '</td><td class="' + (mm >= .25 ? 'ok' : 'warn') + '">' + mm.toFixed(2) + '</td></tr>'; }).join('') + '</tbody>';
$('#reachn').textContent = 'All distances are in blocks, measured sideways. Your eyes are 1.62 above your feet, your sword reaches 3.0, and a mob bites at about √((2 × width)² + 0.6) between centres. The spider is the tight one: it reaches almost as far as you do, so stay on the marked cell and do not lean over the wall.';

function drawA() {
  const cv = $('#dgA'), s = 84, mg = 36; cv.width = 3 * s + mg * 2; cv.height = 2 * s + mg * 2 + 56; const g = cv.getContext('2d');
  g.fillStyle = '#12171b'; g.fillRect(0, 0, cv.width, cv.height);
  const X = x => mg + x * s, Y = y => mg + (2 - y) * s + 8;
  g.fillStyle = '#4b4f55'; g.fillRect(X(-.4), Y(0), s * 3.8, s * .4); g.fillRect(X(-.4), Y(2.4), s * 3.8, s * .4); g.fillRect(X(-.4), Y(2.4), s * .4, s * 2.8); g.fillRect(X(3), Y(2.4), s * .4, s * 2.8);
  g.fillStyle = 'rgba(61,115,224,.7)'; g.fillRect(X(0), Y(.8), 3 * s, .8 * s);
  g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.45)'; g.strokeRect(X(0), Y(2), 3 * s, 2 * s); g.setLineDash([]);
  const place = [[.45, MOBS[0], '#5b8f4a'], [1.55, MOBS[1], '#6a4a4a'], [2.6, MOBS[2], '#8a4a6a']];
  g.font = '600 12px "IBM Plex Sans", sans-serif'; g.textAlign = 'center';
  place.forEach(([cx, m, col]) => { g.fillStyle = col; g.fillRect(X(cx - m.w / 2), Y(m.h), m.w * s, m.h * s); g.strokeStyle = 'rgba(255,255,255,.7)'; g.strokeRect(X(cx - m.w / 2), Y(m.h), m.w * s, m.h * s); g.fillStyle = '#fff'; g.fillText(m.n, X(cx), Y(0) + 34); g.fillStyle = '#9fb0b8'; g.fillText(m.w + ' × ' + m.h, X(cx), Y(0) + 49); });
  g.fillStyle = '#c8d2d6'; g.textAlign = 'left'; g.fillText('Channel: 3 wide, 2 high (dashed).', 10, cv.height - 26); g.fillText('The zombie leaves 0.05 spare at the top.', 10, cv.height - 9);
}
function drawB() {
  const cv = $('#dgB'), s = 62, x0 = -3.6, W = 8.4, H = 7.7; cv.width = W * s; cv.height = H * s; const g = cv.getContext('2d');
  g.fillStyle = '#12171b'; g.fillRect(0, 0, cv.width, cv.height);
  const X = x => (x - x0) * s, Y = y => cv.height - (y + 2.9) * s;       // y = 0 is the floor top of the pen and the gallery
  const blk = (xa, xb, ya, yb, c) => { g.fillStyle = c; g.fillRect(X(xa), Y(yb), (xb - xa) * s, (yb - ya) * s); };
  blk(x0, 0, -2.9, 0, '#6d7075');                       // pen floor and base
  blk(0, 1, -2.9, -2, '#6d7075'); blk(0, 1, -2, -1.8, '#2f2f34');   // trench floor with hoppers
  blk(1, 4.8, -2.9, -2, '#6d7075');                     // base under the gallery
  blk(1, 4.8, -1, 0, '#8c8f94');                        // cantilever + gallery floor
  blk(1, 2, 0, 1.5, '#7b7b7b');                         // wall (collision 1.5)
  g.setLineDash([3, 3]); g.strokeStyle = 'rgba(255,255,255,.35)'; g.strokeRect(X(1), Y(1), s, s); g.setLineDash([]);   // outline height 1.0
  // player
  const px = 2.5; g.fillStyle = '#2aa3b0'; g.fillRect(X(px - .3), Y(1.8), .6 * s, 1.8 * s); g.fillStyle = '#ffe08a'; g.fillRect(X(px - .3), Y(1.8), .6 * s, .3 * s);
  g.setLineDash([6, 5]); g.strokeStyle = '#ffd24a'; g.lineWidth = 1.5; g.beginPath(); g.arc(X(px), Y(EYE), REACH * s, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(X(px), Y(EYE), 3.5, 0, 7); g.fill();
  // mobs: cave spider at the edge, spider and zombie queued behind it
  const [z, sp, cs] = MOBS, mob = (x1, m, col) => { g.fillStyle = col; g.fillRect(X(x1 - m.w), Y(m.h), m.w * s, m.h * s); g.strokeStyle = 'rgba(255,255,255,.6)'; g.strokeRect(X(x1 - m.w), Y(m.h), m.w * s, m.h * s); };
  mob(0, cs, '#8a4a6a'); mob(-.8, z, '#5b8f4a'); mob(-1.6, sp, '#6a4a4a');
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(0), Y(-.35)); g.lineTo(X(px), Y(-.35)); g.stroke();
  g.font = '600 11px "IBM Plex Sans", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('2.5 to the pen edge', X(px / 2 + 0), Y(-.35) - 6);
  g.fillStyle = '#c8d2d6'; g.fillText('pen floor', X(-2.2), Y(-1)); g.fillText('trench', X(.5), Y(-.6)); g.fillText('wall', X(1.5), Y(.75) + 4); g.fillText('you', X(px), Y(0) + 15);
  g.fillText('hoppers', X(.5), Y(-2.2) + 14);
  g.textAlign = 'left'; g.fillStyle = '#ffd24a'; g.fillText('Dashed circle: 3.0 blocks of sword reach from the eyes', 10, 18);
  g.fillStyle = '#c8d2d6'; g.fillText('Dotted box on the wall: its outline stops at 1.0, so your eye line passes over it.', 10, 36);
}
drawA(); drawB();

/* ---------- build order ---------- */
const STEPS = [
  'Pick a flat area 37 × 25. Layer 7 (the chamber floor plates) is ground level. Layers 0–6 are dug down below it, layers 8–12 stand above it. The pen and gallery rooms are dug two blocks below ground.',
  'Layers 0–4: the base block under the pen and gallery, the large chest, the 7 trench hoppers, the 7 collector hoppers (facing as listed on layers 3 and 4) and the channel floors. Drop an item on a hopper at each end to check it reaches the chest.',
  'Layer 5: pen floor, the front row of 7 hoppers facing down, the 1-wide trench, the overhang and the gallery floor.',
  'Layers 6–10: pen and gallery walls with the break at the trench, the carpet, the cobblestone wall, the roof, and the two sea lanterns at the far end. Put the door and its two steps in.',
  'Chambers: floors with 3 × 3 holes, walls up to layer 11, the corner fill that makes each room an octagon, the roof on layer 12, the two-block stalactite and the cobblestone plug in the side wall.',
  'Channels: floors, walls, and the openings in the pen walls. The channel floor must stay one block lower than the pen floor so mobs have to step up and the water stops at the pen.',
  'Water. Place the 30 source blocks: 4 in each chamber floor, and 2 rows of 3 in each channel. Check the water reaches the pen wall and no further.',
  'Spawners last: stand in the chamber, look up at the underside of the stalactite and place the spawner. Seal the plug behind you.',
  'Test with a baby zombie or a spawn egg before you trust it: stand on the marked cell and hit over the wall. If a hit does not register, swap the cobblestone wall for a fence.',
  'Light stays at the far end only. Check with F3 that the chambers and channels read light level 0.'
];
STEPS.forEach(t => $('#steps').appendChild(el('li', '', esc(t))));
const counts = M.counts(), mx = counts[0][1], mg = $('#mats');
counts.forEach(([k, n]) => { const r = el('div', 'mat'); r.appendChild(swatch(k, 18)); r.appendChild(el('span', '', esc(BL[k].name + (k === 'water' ? ' (source blocks)' : '')))); r.appendChild(el('div', 'bar', '<i style="width:' + Math.max(2, n / mx * 100) + '%"></i>')); r.appendChild(el('span', 'n', stacks(n))); mg.appendChild(r); });
$('#matn').textContent = 'Plus 3 mob spawners, which you supply. Counts are computed from the same model as the pictures. The ' + (counts.find(c => c[0] === 'hopper') || [0, 0])[1] + ' hoppers need ' + 5 * (counts.find(c => c[0] === 'hopper') || [0, 0])[1] + ' iron ingots.';

/* ---------- using it ---------- */
const L = $('#usel'), R = $('#user');
L.appendChild(el('div', 'card', '<h3>Killing</h3><ul class="plain"><li>Stand on the marked cell, the first one behind the wall. Walk along the 9-wide gallery to follow the crowd.</li><li>Mobs walk to the front edge of the pen because it is the closest they can get to you. They line up in front of the wall; the ones behind push forward as you kill.</li><li>Hit over the wall. The wall stops mobs (collision 1.5), but its outline is only 1.0 high, so your eye line passes over it.</li><li>Mobs that get pushed into the 1-wide trench fall two blocks onto the hoppers. They are still within reach from your cell, so kill them too.</li><li>Nothing can bite you from where they stand. The spider, which has the longest bite, still falls short by ' + (D + .7 - biteReach(MOBS[1])).toFixed(2) + ' blocks.</li><li>XP orbs fly to you over the wall.</li></ul>'));
L.appendChild(el('div', 'card', '<h3>Loot</h3><ul class="plain"><li>Items from a mob killed at the pen edge drop onto the front row of hoppers. Items from the trench drop onto the trench hoppers. Both rows lead into the same large chest.</li><li>The chest holds 54 slots. To double it, put a hopper under the large chest and a second chest under that.</li><li>If a few items settle in the second row of the pen, extend the hopper row there.</li></ul>'));
R.appendChild(el('div', 'card', '<h3>Spawner reference (Java)</h3><table><tbody><tr><td>Activates when a player is within</td><td>16 blocks</td></tr><tr><td>Delay between attempts</td><td>10 – 40 seconds</td></tr><tr><td>Mobs per attempt</td><td>up to 4</td></tr><tr><td>Spawn area</td><td>±4 blocks sideways, ±1 up and down</td></tr><tr><td>Stops spawning at</td><td>6 of the same mob within 4 blocks</td></tr><tr><td>Spawner to your stand</td><td>' + sdist.map(r => r.toFixed(1)).join(', ') + ' blocks</td></tr></tbody></table><p class="small" style="margin-top:8px">One spawner can make about 575 mobs an hour at most. To pause the farm, walk more than 16 blocks away.</p>'));
R.appendChild(el('div', 'callout', '<b>I could not test this in the game.</b><ul class="plain" style="margin-top:6px"><li><b>No windows.</b> Glass and iron bars stop your sword, and chains leave gaps (0.81 wide) a zombie walks through. That is why this uses distance, a trench and a wall instead.</li><li><b>The margins are small.</b> The spider can reach about as far as you can. If you get bitten, stand one block further back, or widen the trench by one block and move the wall and the cell with it.</li><li><b>Reach changes between versions.</b> Check on day one with a baby zombie. If you cannot hit over the wall, use a fence in its place.</li><li><b>Light.</b> Spawners need dark rooms. The lanterns sit at the far end, so by my count the light is gone before the chambers. Check with F3 anyway.</li><li><b>Spiders.</b> They climb. The pen walls and roof hold them in, and the side walls are broken at the trench so they cannot walk along them to you.</li><li><b>Pile-up.</b> More than about 24 mobs in one spot take cramming damage and die without drops. Kill regularly or pause the farm.</li></ul>'));
