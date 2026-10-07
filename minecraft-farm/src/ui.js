'use strict';
const M = buildFarm();
const $ = (s, r) => (r || document).querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stacks = n => { const s = Math.floor(n / 64), r = n % 64; return n.toLocaleString('en-US') + (s ? '  ·  ' + s + '×64' + (r ? '+' + r : '') : ''); };
function swatch(key, px) { const c = document.createElement('canvas'); c.width = c.height = 16; if (px) c.style.width = c.style.height = px + 'px'; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(tex(key, 0), 0, 0); return c; }

/* ---------- constants used in the text and the checks ---------- */
const MOBS = [
  { n: 'Zombie', w: .6, h: 1.95 }, { n: 'Spider', w: 1.4, h: .9 }, { n: 'Cave spider', w: .7, h: .5 }
];
const EYE = 7.62, HEAD = 4.95, REACH = 3.0, HREACH = Math.sqrt(REACH * REACH - (EYE - HEAD) ** 2);

/* ---------- header and how-it-works ---------- */
$('#facts').innerHTML = [
  ['4', 'Spawner slots, one per chamber'], ['13 blocks', 'From each spawner to your stand (limit 16)'], ['0.5 – 1.95', 'Mob heights that fit, cave spider to zombie'],
  ['37 × 37 × 11', 'Footprint and height in blocks'], ['By hand', 'You kill. Nothing damages the mobs.'], ['Automatic', 'Hoppers sort drops into a chest']
].map(a => '<div class="fact"><b>' + a[0] + '</b><span>' + a[1] + '</span></div>').join('');
$('#flow').innerHTML = [
  ['Spawn', 'Each spawner hangs in the middle of a dark 9 × 9 octagonal room with a water floor. Mobs spawn in the water or in the air above it.'],
  ['Wash', 'Floor water runs into a 3 × 3 drop shaft. Mobs fall one block into a 3-wide channel and are carried 13 blocks to the middle.'],
  ['Gather', 'All four channels end in one pit. Their water meets in the centre and pushes mobs together under your stand.'],
  ['Kill and collect', 'You stand on a one-block pedestal over the pit and hit down through the open hatch. Drops land on a 3 × 3 hopper floor and end up in a chest.']
].map(a => '<li><b>' + a[0] + '</b><span>' + a[1] + '</span></li>').join('');

/* ---------- 3D view ---------- */
const v3 = { maxY: 9, cutX: false, cutZ: false };
const tb3 = $('#tb3d'), iso = $('#iso');
const render3 = () => drawIso(iso, M, { maxY: v3.maxY, cutX: v3.cutX ? 18 : undefined, cutZ: v3.cutZ ? 18 : undefined });
const presets = [['All roofs', 11], ['Roofs off', 9], ['Walkway level', 6], ['Underground', 5], ['Mob level', 4]];
const seg = el('div', 'seg'); presets.forEach(([t, y]) => { const b = el('button', '', t); b.type = 'button'; b.dataset.y = y; b.setAttribute('aria-pressed', String(v3.maxY === y)); b.onclick = () => { v3.maxY = y; sync(); render3(); }; seg.appendChild(b); });
const sl = el('div', 'slider', '<label for="cy">Show up to layer</label><input id="cy" type="range" min="1" max="11" step="1" value="' + v3.maxY + '"><b id="cyv">' + (v3.maxY - 1) + '</b>');
const mkTog = (t, k) => { const b = el('button', 'tog', t); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.onclick = () => { v3[k] = !v3[k]; b.setAttribute('aria-pressed', String(v3[k])); render3(); }; return b; };
tb3.append(seg, sl, mkTog('Cut away east half', 'cutX'), mkTog('Cut away south half', 'cutZ'));
function sync() { $('#cy').value = v3.maxY; $('#cyv').textContent = v3.maxY - 1; seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.y === v3.maxY))); }
$('#cy').oninput = e => { v3.maxY = +e.target.value; sync(); render3(); };
render3();
$('#legend3d').innerHTML = '<span>Labels: S1 to S4 are the spawner slots, YOU is the stand.</span>';
['stone_bricks', 'smooth_stone', 'polished_andesite', 'glass', 'water', 'hopper', 'chest', 'spawner', 'cobblestone', 'redstone_lamp'].forEach(k => { const s = el('span'); s.appendChild(swatch(k)); s.appendChild(document.createTextNode(BL[k].name)); $('#legend3d').appendChild(s); });

/* ---------- layers ---------- */
const LAYERS = [
  ['Basement floor', 'A solid block of stone bricks, 9 × 9, under the kill room. Nothing else is on this layer.'],
  ['Loot chests', 'A large chest at x 18–19, z 19. The hopper above drops into its left half; both halves share 54 slots.'],
  ['Pit floor, hoppers and channel floors', 'The 3 × 3 hopper floor sits in the pit. Facing, from the top-left of the plan: row 1 → east, ↓ south, west ←; row 2 → east, ↓ south, west ←; row 3 → east, DOWN (into the chest), west ←. Channel floors are polished andesite, 5 wide.'],
  ['Mob level: water', 'Each channel is 3 wide with a row of 3 source blocks (white dots) at each end. They flow to the pit, where the four flows meet and push mobs to the middle. Arrows show flow direction.'],
  ['Headroom', 'One block of air above the water. Channel walls and pit walls are two blocks high. The 3 × 3 drop shafts come down through this layer as falling water.'],
  ['Walkway plate and chamber floors', 'Ground level. Chamber floors have a 3 × 3 hole in the middle. The kill room has a pedestal in the middle and a one-block bridge to the south; the other seven cells of the 3 × 3 hatch stay open.'],
  ['Chamber water, booth, corridors', 'Chamber floors carry a layer of flowing water with four source blocks at the edge midpoints. The booth and corridors start here. Step up on the stone brick step to reach each plug.'],
  ['Spawners', 'The four spawners sit in the middle of each chamber. This is also the height of the cobblestone plugs, the booth windows and the door.'],
  ['Stalactites and upper windows', 'Each spawner hangs from two stone bricks under the roof. Only chamber walls, the corridor walls and the booth windows are on this layer.'],
  ['Corridor and booth roof', 'Roof of the booth and corridors, with four redstone lamps over the hatch. Chamber roofs are one layer higher.'],
  ['Chamber roofs', 'A flat stone brick roof on each 11 × 11 chamber. Nothing else.']
];
const ly = $('#ly'), plan = $('#plan'); let lyGrid = false, pinfo;
const drawL = () => { const y = +ly.value; $('#lyv').textContent = y; pinfo = drawLayer(plan, M, y, { grid: lyGrid }); const t = $('#laytext'); t.innerHTML = ''; t.appendChild(el('div', 'card', '<h3>Layer ' + y + '</h3><b>' + esc(LAYERS[y][0]) + '</b><p style="margin-top:6px">' + esc(LAYERS[y][1]) + '</p>')); const c = {}; for (let z = 0; z < FD; z++) for (let x = 0; x < FW; x++) { const b = M.v[y][z][x]; if (b && !BL[b.m].virtual) c[b.m] = (c[b.m] || 0) + 1; } const ent = Object.entries(c).sort((a, b) => b[1] - a[1]); const card = el('div', 'card', '<h3>Blocks on this layer</h3>'); const g = el('div', 'mats'); ent.forEach(([k, n]) => { const r = el('div', 'mat'); r.style.gridTemplateColumns = '18px minmax(0,1fr) 70px'; r.appendChild(swatch(k, 18)); r.appendChild(el('span', '', esc(BL[k].name))); r.appendChild(el('span', 'n', String(n))); g.appendChild(r); }); card.appendChild(g); if (!ent.length) card.appendChild(el('p', 'small', 'Empty.')); t.appendChild(card); };
ly.oninput = drawL; $('#lyg').onclick = e => { lyGrid = !lyGrid; e.currentTarget.setAttribute('aria-pressed', String(lyGrid)); drawL(); };
plan.addEventListener('mousemove', e => { const r = plan.getBoundingClientRect(), s = plan.width / r.width, x = Math.floor(((e.clientX - r.left) * s - pinfo.mg) / pinfo.c), z = Math.floor(((e.clientY - r.top) * s - pinfo.mg) / pinfo.c), y = +ly.value; const b = M.get(x, y, z); $('#ro').textContent = (x >= 0 && z >= 0 && x < FW && z < FD) ? 'x ' + x + ', y ' + y + ', z ' + z + '  ·  ' + (b ? BL[b.m].name + (b.src ? ' (source)' : b.m === 'water' ? ' (flowing)' : '') : 'air') : ''; });
drawL();

/* ---------- section ---------- */
let ax = 'x'; const secC = $('#sec'), slr = $('#sl');
const drawS = () => { $('#slv').textContent = slr.value; drawSection(secC, M, ax, +slr.value); };
slr.oninput = drawS;
document.querySelectorAll('#axseg button').forEach(b => b.onclick = () => { ax = b.dataset.ax; document.querySelectorAll('#axseg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); drawS(); });
drawS();

/* ---------- fit table ---------- */
const FIT = [
  ['Spawn chamber', '9 wide (octagon), 4 high', MOBS.map(() => 'ok')],
  ['Drop shaft', '3 × 3, open', MOBS.map(() => 'ok')],
  ['Transport channel', '3 wide, 2 high (1 water + 1 air)', MOBS.map(m => m.h <= 2 && m.w <= 3 ? 'ok' : 'bad')],
  ['Kill pit', '7 × 7, 2 high', MOBS.map(m => m.h <= 2 ? 'ok' : 'bad')],
  ['Hatch cells above the pit', '1 × 1, 2.05 blocks above the heads', ['no', 'no', 'no']]
];
$('#fitt').innerHTML = '<thead><tr><th>Passage</th><th>Free space</th>' + MOBS.map(m => '<th>' + m.n + '<br><span style="text-transform:none;letter-spacing:0">' + m.w + ' × ' + m.h + '</span></th>').join('') + '</tr></thead><tbody>' +
  FIT.map(r => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td>' + r[2].map(v => '<td class="' + (v === 'ok' ? 'ok' : v === 'no' ? 'warn' : 'bad') + '">' + (v === 'ok' ? 'Fits' : v === 'no' ? 'Cannot get through (by design)' : 'Does not fit') + '</td>').join('') + '</tr>').join('') + '</tbody>';

function drawA() {
  const cv = $('#dgA'), s = 84, mg = 36; cv.width = 3 * s + mg * 2; cv.height = 2 * s + mg * 2 + 56; const g = cv.getContext('2d');
  g.fillStyle = '#12171b'; g.fillRect(0, 0, cv.width, cv.height);
  const X = x => mg + x * s, Y = y => mg + (2 - y) * s + 8;
  g.fillStyle = '#4b4f55'; g.fillRect(X(-.4), Y(0), s * 3.8, s * .4); g.fillRect(X(-.4), Y(2.4), s * 3.8, s * .4); g.fillRect(X(-.4), Y(2.4), s * .4, s * 2.8); g.fillRect(X(3), Y(2.4), s * .4, s * 2.8);
  g.fillStyle = 'rgba(61,115,224,.7)'; g.fillRect(X(0), Y(.8), 3 * s, .8 * s);
  g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.45)'; g.strokeRect(X(0), Y(2), 3 * s, 2 * s); g.setLineDash([]);
  const place = [[.45, MOBS[0], '#5b8f4a'], [1.55, MOBS[1], '#6a4a4a'], [2.6, MOBS[2], '#8a4a6a']];
  g.font = '600 12px "IBM Plex Sans", sans-serif'; g.textAlign = 'center';
  place.forEach(([cx, m, col]) => { g.fillStyle = col; g.fillRect(X(cx - m.w / 2), Y(m.h), m.w * s, m.h * s); g.strokeStyle = 'rgba(255,255,255,.7)'; g.strokeRect(X(cx - m.w / 2), Y(m.h), m.w * s, m.h * s); g.fillStyle = '#fff'; g.fillText(m.n, X(cx), Y(0) + 34); g.fillStyle = '#9fb0b8'; g.fillText(m.w + ' \u00d7 ' + m.h, X(cx), Y(0) + 49); });
  g.fillStyle = '#c8d2d6'; g.textAlign = 'left'; g.font = '600 12px "IBM Plex Sans", sans-serif';
  g.fillText('Channel: 3 wide, 2 high (dashed).', 10, cv.height - 26); g.fillText('The zombie leaves 0.05 spare at the top.', 10, cv.height - 9);
}
function drawB() {
  const cv = $('#dgB'), s = 54, W = 8, H = 9.6; cv.width = W * s; cv.height = H * s; const g = cv.getContext('2d');
  g.fillStyle = '#12171b'; g.fillRect(0, 0, cv.width, cv.height);
  const X = x => (x + W / 2) * s, Y = y => cv.height - (y - 2) * s - 10;
  g.fillStyle = '#4b4f55'; g.fillRect(0, Y(3), cv.width, s);
  g.fillStyle = 'rgba(61,115,224,.55)'; g.fillRect(0, Y(3.5), cv.width, .5 * s);
  g.fillStyle = '#7a7d82'; g.fillRect(0, Y(6), X(-1.5), s); g.fillRect(X(1.5), Y(6), cv.width - X(1.5), s); g.fillRect(X(-.5), Y(6), s, s);
  g.fillStyle = '#2aa3b0'; g.fillRect(X(-.3), Y(7.8), .6 * s, 1.8 * s); g.fillStyle = '#ffe08a'; g.fillRect(X(-.3), Y(7.8), .6 * s, .3 * s);
  g.setLineDash([6, 5]); g.strokeStyle = '#ffd24a'; g.lineWidth = 1.5; g.beginPath(); g.arc(X(0), Y(EYE), REACH * s, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(X(0), Y(EYE), 3.5, 0, 7); g.fill();
  const z = MOBS[0], sp = MOBS[1];
  g.fillStyle = '#5b8f4a'; g.fillRect(X(1 - z.w / 2), Y(3 + z.h), z.w * s, z.h * s); g.fillRect(X(-1 - z.w / 2), Y(3 + z.h), z.w * s, z.h * s);
  g.fillStyle = '#6a4a4a'; g.fillRect(X(2.0), Y(3 + sp.h), sp.w * s * .9, sp.h * s);
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(X(-.5), Y(3 + z.h), s, z.h * s);
  g.font = '600 11px "IBM Plex Sans", sans-serif'; g.fillStyle = '#c8d2d6'; g.textAlign = 'center';
  g.fillText('open', X(1), Y(5.4)); g.fillText('open', X(-1), Y(5.4)); g.fillStyle = '#12171b'; g.fillText('stand', X(0), Y(5.4));
  g.fillStyle = '#c8d2d6'; g.fillText('hit zone', X(1), Y(3) + 16); g.fillText('hit zone', X(-1), Y(3) + 16); g.fillText('under the pedestal: out of reach', X(0), Y(2) + 8);
  g.textAlign = 'left'; g.fillStyle = '#ffd24a'; g.fillText('Dashed circle: 3.0 blocks of reach from the eyes', 10, 18);
  g.fillStyle = '#c8d2d6'; g.fillText('Eyes ' + EYE.toFixed(2) + ', zombie head ' + HEAD.toFixed(2) + ': gap ' + (EYE - HEAD).toFixed(2), 10, 36);
  g.fillText('Spare reach sideways at head height: ' + HREACH.toFixed(2) + ' blocks', 10, 54);
}
drawA(); drawB();

/* ---------- build order ---------- */
const STEPS = [
  'Pick a flat square 37 × 37. Layer 5 (the walkway plate) is ground level. Layers 0–4 are dug down below it, layers 6–10 stand above it.',
  'Layers 0–2: the 9 × 9 basement block, the polished andesite pit floor, and the 5-wide channel floors running out to each chamber.',
  'Place the nine hoppers in the 3 × 3 square, facing as listed on layer 2, then the large chest under the bottom-middle and bottom-right cells. Drop an item on a corner hopper to test that it ends up in the chest.',
  'Layers 3–4: pit walls, channel walls (two high) and the four openings into the pit. Keep everything dark. No torches in the pit, channels or chambers.',
  'Layer 5: chamber floors with their 3 × 3 holes, corridor plates, the pit ceiling with pedestal and bridge, and the 7 open hatch cells.',
  'Chambers: walls up to layer 9, the corner fill that makes each room an octagon, the roof on layer 10, and the two-block stalactite.',
  'Booth and corridors: walls, glass windows, the roof, the four lamps (switch them off while farming) and the door.',
  'Water. Place the 40 source blocks: 4 in each chamber floor, and 2 rows of 3 in each channel. The pit has no sources of its own; the channels fill it.',
  'Put the cobblestone plugs in the chamber doors. Put the spawners in last: stand in the chamber, look up at the underside of the stalactite and place each spawner there.',
  'Change a spawner’s mob with a spawn egg if you need to. Stand on the pedestal (sneak) and watch the pit fill.'
];
STEPS.forEach(t => $('#steps').appendChild(el('li', '', esc(t))));
const counts = M.counts(), mx = counts[0][1]; const mg = $('#mats');
counts.forEach(([k, n]) => { const r = el('div', 'mat'); r.appendChild(swatch(k, 18)); r.appendChild(el('span', '', esc(BL[k].name + (k === 'water' ? ' (source blocks)' : '')))); r.appendChild(el('div', 'bar', '<i style="width:' + Math.max(2, n / mx * 100) + '%"></i>')); r.appendChild(el('span', 'n', stacks(n))); mg.appendChild(r); });
$('#matn').textContent = 'Plus 4 mob spawners, which you supply. Counts are computed from the same model as the pictures. The 9 hoppers need 45 iron ingots.';

/* ---------- using it ---------- */
const L = $('#usel'), R = $('#user');
L.appendChild(el('div', 'card', '<h3>Killing</h3><ul class="plain"><li>Stand on the pedestal and hold <b>sneak</b>. The hatch around you is open and a step off the pedestal is a three-block drop into the mobs.</li><li>Your eyes are ' + EYE.toFixed(2) + ' above the pit floor and a zombie’s head is ' + HEAD.toFixed(2) + '. That leaves ' + HREACH.toFixed(2) + ' blocks of sideways reach at head height, which covers all seven open cells.</li><li>The cell under the pedestal and the cell under the bridge are out of reach. Mobs that gather there are not wasted: they move into the open cells as you kill.</li><li>Mobs below cannot get to you. The hatch is 2 blocks above their heads, the cells are 1 × 1 (a spider is 1.4 wide), and a cave spider cannot jump two blocks.</li><li>XP orbs fly to you through the open cells.</li></ul>'));
L.appendChild(el('div', 'card', '<h3>Loot</h3><ul class="plain"><li>Drops fall into the pit water above the 3 × 3 hoppers, which pull them in and pass them down to the chest.</li><li>If a few items settle outside the hoppers, add a ring of hoppers around the 3 × 3 or widen it to 5 × 5.</li><li>The chest holds 54 slots. To double it, put a hopper under the large chest and a second chest under that.</li></ul>'));
R.appendChild(el('div', 'card', '<h3>Spawner reference (Java)</h3><table><tbody><tr><td>Activates when a player is within</td><td>16 blocks</td></tr><tr><td>Delay between attempts</td><td>10 – 40 seconds</td></tr><tr><td>Mobs per attempt</td><td>up to 4</td></tr><tr><td>Spawn area</td><td>±4 blocks sideways, ±1 up and down</td></tr><tr><td>Stops spawning at</td><td>6 of the same mob within 4 blocks</td></tr><tr><td>Distance, spawner to stand</td><td>13 blocks horizontal, about 1.5 vertical</td></tr></tbody></table><p class="small" style="margin-top:8px">The most one spawner can produce is about 575 mobs an hour. To pause the farm, walk more than 16 blocks away.</p>'));
R.appendChild(el('div', 'callout', '<b>I could not test this in the game.</b><ul class="plain" style="margin-top:6px"><li><b>Light.</b> Hostile mobs from a normal spawner need darkness. Keep the pit, channels and chambers at light level 0. The lamps in the booth roof can leak light down the hatch, so keep them off while farming.</li><li><b>Spiders.</b> Spiders and cave spiders climb walls. The roofs stop them leaving, but some may hang on chamber walls instead of washing out. If a spawner stalls, kill them by hand.</li><li><b>Headroom.</b> The channel is exactly 2 blocks high for a 1.95 zombie. If zombies jam, raise the channel roof by one block.</li><li><b>Reach.</b> Attack ranges changed between versions. If a zombie below ever hits you, raise the pedestal by a half slab.</li><li><b>Pile-up.</b> More than about 24 mobs in one spot take cramming damage and die without drops. Kill regularly or pause the farm.</li></ul>'));
