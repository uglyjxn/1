'use strict';
const M = buildStorage();
const $ = (s, r) => (r || document).querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => Math.round(n).toLocaleString('en-US');
const stacks = n => { const s = Math.floor(n / 64), r = n % 64; return nf(n) + (s ? '  ·  ' + nf(s) + '×64' + (r ? '+' + r : '') : ''); };
function swatch(key, px) { const c = document.createElement('canvas'); c.width = c.height = 16; if (px) c.style.width = c.style.height = px + 'px'; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(tex(key, 0), 0, 0); return c; }

/* ---------- counts ---------- */
const C = Object.fromEntries(M.counts());
const PODS_TOTAL = LEVELS * AISLES * PODS;
const destBlocks = C.chest || 0, copperBlocks = C.copper_chest || 0, barrels = C.barrel || 0;
const destSlots = destBlocks * 27, destDoubles = destBlocks / 2;
const allSlots = (destBlocks + copperBlocks + barrels) * 27;

$('#facts').innerHTML = [
  [nf(destSlots), 'Sorted storage slots (' + nf(destDoubles) + ' double chests)'], [nf(destSlots * 64), 'Items if every slot holds a 64-stack'],
  [String(PODS_TOTAL), 'Pods, each with one golem and nine sorting chests'], ['5 levels', 'Aisles 1 wide, 2 high, 3 blocks apart'],
  [nf(allSlots), 'Slots including inputs and barrels'], ['0 redstone', 'Sorting is done by the golems alone']
].map(a => '<div class="fact"><b>' + a[0] + '</b><span>' + a[1] + '</span></div>').join('');

/* ---------- rules ---------- */
const RULES = [
  ['Takes items from', 'Copper chests only. Visits up to 10 in a row, spends 3 s on each, takes up to 16 of the first item, idles 7 s if the chest is empty.', 'ok', 'Every pod gets its own copper input chests.'],
  ['Puts items into', 'Chests and trapped chests that are empty or already contain that item. Barrels and shulker boxes are ignored.', 'ok', 'Chests are pre-filled with one sample of their item. Barrels are used for manual storage beside the golem.'],
  ['Chests tried per item', 'Up to 10 (some sources say it remembers 9).', 'unc', 'Nine destination chests per pod, so every chest is tried.'],
  ['Search area', '±32 blocks sideways, ±8 blocks up and down around the golem (a 65 × 17 × 65 box).', 'unc', 'The whole room is inside one golem’s search area. Pods are kept apart by walls and gates so the golem cannot path into another pod.'],
  ['Vertical reach', 'Chests on its own level and one above or one below. The wiki says up to two below.', 'unc', 'Chests are stacked exactly three high: one level below, same level, one above.'],
  ['Size', '0.49 blocks wide (reduced in snapshot 25w37a so it fits tight spaces).', 'ok', 'A 1-block-wide aisle is enough.'],
  ['Doors', 'One source says it opens wooden and copper doors. Fence gates are not mentioned anywhere.', 'unc', 'Pods are closed with fence gates (1.5 blocks high). Test that the golem cannot cross one.'],
  ['Oxidation', 'An unwaxed golem oxidises and turns into a statue. Waxing stops it.', 'ok', 'Wax every golem.'],
  ['Unloaded chunks', 'Sorting stops while the chunk is not loaded.', 'ok', 'The room is 3 chunks wide. Stay in it or keep it loaded.']
];
$('#rulest').innerHTML = '<thead><tr><th>Rule</th><th>What the sources say</th><th>Confidence</th><th>What the room does about it</th></tr></thead><tbody>' + RULES.map(r => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td class="' + (r[2] === 'ok' ? 'ok' : 'warn') + '">' + (r[2] === 'ok' ? 'Agreed' : 'Uncertain') + '</td><td>' + r[3] + '</td></tr>').join('') + '</tbody>';
$('#srcs').innerHTML = 'Sources: <a href="https://minecraft.wiki/w/Copper_Golem">Minecraft Wiki, Copper Golem</a>; <a href="https://x.com/NovaWostra/status/1940340058869133660">search area test by Nova Wostra</a>; <a href="https://www.4netplayers.com/en/blog/minecraft/minecraft-kupfergolem-item-sortierung-ohne-redstone/">4netplayers sorting guide</a>; <a href="https://pixeltwelve.com/articles/minecraft-storage-item-sorting-guide-hoppers-copper-golems">pixeltwelve storage guide</a>; <a href="https://www.sportskeeda.com/minecraft/minecraft-bedrock-1-21-100-23-beta-preview-patch-notes-copper-golem-copper-chests">Sportskeeda patch notes</a>. I could not open the wiki directly from here, so the figures are from search summaries of those pages.';

/* ---------- 3D view ---------- */
const v3 = { minY: 0, maxY: 16, cutX: true, cutZ: false };
const iso = $('#iso'), tb3 = $('#tb3d');
const render3 = () => drawIso(iso, M, { minY: v3.minY, maxY: v3.maxY, cutX: v3.cutX ? 21 : undefined, cutZ: v3.cutZ ? 16 : undefined });
const pre = [['Whole room', 0, 16]].concat([0, 1, 2, 3, 4].map(k => ['Level ' + (k + 1), PITCH * k, PITCH * k + 4]));
const seg = el('div', 'seg'); pre.forEach(([t, a, b], i) => { const bt = el('button', '', t); bt.type = 'button'; bt.setAttribute('aria-pressed', String(i === 0)); bt.onclick = () => { v3.minY = a; v3.maxY = b; seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === bt))); render3(); }; seg.appendChild(bt); });
const mkTog = (t, k) => { const b = el('button', 'tog', t); b.type = 'button'; b.setAttribute('aria-pressed', String(v3[k])); b.onclick = () => { v3[k] = !v3[k]; b.setAttribute('aria-pressed', String(v3[k])); render3(); }; return b; };
tb3.append(seg, mkTog('Cut away east half', 'cutX'), mkTog('Cut away south half', 'cutZ'));
render3();
['copper_chest', 'chest', 'barrel', 'fence_gate', 'ladder', 'sea_lantern', 'smooth_stone', 'stone'].forEach(k => { const s = el('span'); s.appendChild(swatch(k)); s.appendChild(document.createTextNode(BL[k].name)); $('#legend3d').appendChild(s); });
$('#legend3d').appendChild(el('span', '', 'Orange pillars are the copper golems.'));

/* ---------- pod diagrams ---------- */
const PX = podX(0), PZ = 3, PY = 1;      // aisle 1, pod 1, level 1 as the sample pod
function drawA() {
  const cv = $('#dgA'), s = 62, mg = 14, W = 6 * s + 2 * mg, H = 3 * s + 2 * mg; cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#12171b'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) for (let r = 0; r < 3; r++) {
    const x = PX - 1 + i, z = PZ + r, b = M.get(x, PY, z), px = mg + i * s, py = mg + r * s;
    g.fillStyle = '#1b242b'; g.fillRect(px, py, s, s);
    if (b) { g.drawImage(tex(b.m, (i + r) & 3), px, py, s, s); }
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.strokeRect(px + .5, py + .5, s - 1, s - 1);
  }
  g.font = '700 12px "IBM Plex Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lab = (i, r, w, t, c) => { const cx = mg + (i + w / 2) * s, cy = mg + (r + .5) * s; g.lineWidth = 3.5; g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,12,16,.92)'; t.split('\n').forEach((tt, k, a) => { g.strokeText(tt, cx, cy + (k - (a.length - 1) / 2) * 14); g.fillStyle = c || '#fff'; g.fillText(tt, cx, cy + (k - (a.length - 1) / 2) * 14); }); };
  lab(1, 0, 2, 'INPUT\ncopper + 4 barrels'); lab(3, 0, 2, 'D1 ×3'); lab(1, 2, 2, 'D2 ×3'); lab(3, 2, 2, 'D3 ×3');
  lab(0, 1, 1, 'GATE'); lab(5, 1, 1, 'GATE'); lab(1.5, 1, 1, 'golem', '#ffb27a'); lab(2.5, 1, 2, 'aisle 4 cells', '#9fb0b8');
}
function drawB() {
  const cv = $('#dgB'), s = 72, mg = 16, W = 3 * s + 2 * mg + 250, H = 5 * s + 2 * mg + 20; cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#12171b'; g.fillRect(0, 0, W, H);
  const X = i => mg + i * s, Y = r => mg + r * s;        // r 0 = ceiling slab ... 4 = floor slab under the next level
  const draw = (i, r, key) => g.drawImage(tex(key, (i + r) & 3), X(i), Y(r), s, s);
  for (let i = 0; i < 3; i++) draw(i, 0, 'smooth_stone');                       // ceiling slab (b+3)
  const rows = [['barrel', 'chest'], ['copper_chest', 'chest'], ['barrel', 'chest']];   // top, middle, bottom (b+2, b+1, b)
  rows.forEach((rw, r) => { draw(0, r + 1, rw[0]); draw(2, r + 1, rw[1]); });
  draw(1, 3, 'smooth_stone');                                                    // aisle floor
  draw(0, 4, 'stone'); draw(1, 4, 'smooth_stone'); draw(2, 4, 'stone');
  g.fillStyle = '#17222a'; g.fillRect(X(1), Y(1), s, 2 * s);
  g.fillStyle = '#e08a4f'; const gw = .49 * s, gh = .98 * s; g.fillRect(X(1) + (s - gw) / 2, Y(3) - gh, gw, gh); g.fillStyle = '#7a3a1a'; g.fillRect(X(1) + (s - gw) / 2 + 4, Y(3) - gh + 8, 5, 5); g.fillRect(X(1) + (s + gw) / 2 - 9, Y(3) - gh + 8, 5, 5);
  g.strokeStyle = '#ffd24a'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.strokeRect(X(0) - 2, Y(1) - 2, 3 * s + 4, 3 * s + 4); g.setLineDash([]);
  g.font = '600 12px "IBM Plex Sans", sans-serif'; g.fillStyle = '#c8d2d6'; g.textAlign = 'left';
  const tx = X(3) + 14; g.fillText('slab = ceiling of this level', tx, Y(0) + 20);
  g.fillStyle = '#ffd24a'; g.fillText('+1 row: one above the golem', tx, Y(1) + 20); g.fillText('0 row: same level as the golem', tx, Y(2) + 20); g.fillText('−1 row: one below the golem', tx, Y(3) + 20);
  g.fillStyle = '#c8d2d6'; g.fillText('floor slab = ceiling of the', tx, Y(4) + 14); g.fillText('level below', tx, Y(4) + 30);
  g.fillText('Aisle: 1 wide, 2 high', X(0) + 4, H - 6);
}
drawA(); drawB();
$('#podtext').appendChild(el('div', 'card', '<h3>Per pod</h3><table><tbody><tr><td>Destination chests</td><td>9 doubles = 486 slots</td></tr><tr><td>Input</td><td>1 double copper chest = 54 slots</td></tr><tr><td>Barrels (manual)</td><td>4 = 108 slots</td></tr><tr><td>Golems</td><td>1, waxed</td></tr><tr><td>Gates</td><td>1 (the pod has one gate in front of it)</td></tr><tr><td>Item frames</td><td>9, one on each destination chest</td></tr></tbody></table>'));
$('#podtext2').appendChild(el('div', 'card', '<h3>Why it is built like this</h3><ul class="plain"><li><b>Nine destinations.</b> The golem tries about ten chests per item. With nine, it always tries every chest in the pod, so an item with a home always finds it.</li><li><b>Sealed pod.</b> The golem searches the whole room, but it can only walk to chests it can path to. Gates and the solid ends stop it leaving, so it never sees another pod’s chests.</li><li><b>Three high.</b> The golem reaches one level up and one level down, so the three-row stack is the most it can use. A fourth row would be unreachable.</li><li><b>Barrels.</b> The golem ignores them, so they hold whatever you do not want sorted.</li></ul>'));

/* ---------- layers ---------- */
const lyInfo = y => {
  if (y === 15) return ['Roof slab', 'Smooth stone roof with five sea lanterns in the hall. Nothing else.'];
  const k = Math.floor(y / 3), r = y % 3, lvl = 'Level ' + (k + 1);
  if (r === 0) return [lvl + ', floor slab and bottom row', 'Smooth stone under the aisles and the hall. The chest columns on this layer are the −1 row: bottom barrels of each input stack and the lowest destination chests. The hall has two ladder holes.'];
  if (r === 1) return [lvl + ', golem walking level and middle row', 'The golem walks on this layer. The aisles are the open strips, closed by fence gates every five cells. The middle chest row holds the copper input chests (orange), the other destinations, and a sea lantern in each divider wall. Orange pillars mark the golems.'];
  return [lvl + ', aisle headroom and top row', 'The top chest row (+1 row): top barrels of each input stack and the highest destination chests. The aisle is open above the gates, but a golem cannot climb over them.'];
};
const ly = $('#ly'), plan = $('#plan'); let lyGrid = false, pinfo;
const drawL = () => { const y = +ly.value; $('#lyv').textContent = y; pinfo = drawLayer(plan, M, y, { grid: lyGrid }); const t = $('#laytext'); t.innerHTML = ''; const i = lyInfo(y); t.appendChild(el('div', 'card', '<h3>Layer ' + y + '</h3><b>' + esc(i[0]) + '</b><p style="margin-top:6px">' + esc(i[1]) + '</p>')); const c = {}; for (let z = 0; z < FD; z++) for (let x = 0; x < FW; x++) { const b = M.v[y][z][x]; if (b && !BL[b.m].virtual) c[b.m] = (c[b.m] || 0) + 1; } const ent = Object.entries(c).sort((a, b) => b[1] - a[1]); const card = el('div', 'card', '<h3>Blocks on this layer</h3>'); const g = el('div', 'mats'); ent.forEach(([k, n]) => { const r = el('div', 'mat'); r.style.gridTemplateColumns = '18px minmax(0,1fr) 70px'; r.appendChild(swatch(k, 18)); r.appendChild(el('span', '', esc(BL[k].name))); r.appendChild(el('span', 'n', nf(n))); g.appendChild(r); }); card.appendChild(g); t.appendChild(card); };
ly.oninput = drawL; $('#lyg').onclick = e => { lyGrid = !lyGrid; e.currentTarget.setAttribute('aria-pressed', String(lyGrid)); drawL(); };
plan.addEventListener('mousemove', e => { const r = plan.getBoundingClientRect(), s = plan.width / r.width, x = Math.floor(((e.clientX - r.left) * s - pinfo.mg) / pinfo.c), z = Math.floor(((e.clientY - r.top) * s - pinfo.mg) / pinfo.c), y = +ly.value; const b = M.get(x, y, z); $('#ro').textContent = (x >= 0 && z >= 0 && x < FW && z < FD) ? 'x ' + x + ', y ' + y + ', z ' + z + '  ·  ' + (b ? BL[b.m].name : 'air') : ''; });
drawL();

/* ---------- section ---------- */
let ax = 'x'; const secC = $('#sec'), slr = $('#sl'); const memo = { x: 6, z: 4 };
const drawS = () => { $('#slv').textContent = slr.value; memo[ax] = +slr.value; drawSection(secC, M, ax, +slr.value); };
slr.oninput = drawS;
document.querySelectorAll('#axseg button').forEach(b => b.onclick = () => { ax = b.dataset.ax; document.querySelectorAll('#axseg button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); slr.max = ax === 'x' ? FW - 1 : FD - 1; slr.value = memo[ax]; drawS(); });
drawS();

/* ---------- capacity ---------- */
const rowsCap = [
  ['Levels', LEVELS + ' (3 blocks apart, 15 high in total)'], ['Aisles per level', String(AISLES)], ['Pods per aisle', String(PODS)], ['Pods and golems', nf(PODS_TOTAL)],
  ['Destination chest blocks', nf(destBlocks) + ' (' + nf(destDoubles) + ' double chests)'], ['Destination slots', nf(destSlots)],
  ['Input copper chest blocks', nf(copperBlocks) + ' (' + nf(copperBlocks * 27) + ' slots)'], ['Barrels', nf(barrels) + ' (' + nf(barrels * 27) + ' slots)'],
  ['Items in destinations, 64-stacks', nf(destSlots * 64)], ['Items, 16-stacks', nf(destSlots * 16)], ['Items, unstackables', nf(destSlots)],
  ['Distinct item types supported', nf(PODS_TOTAL * 9) + ' chests, each primed with one or more types']
];
$('#capt').innerHTML = '<tbody>' + rowsCap.map(r => '<tr><td>' + r[0] + '</td><td class="mono">' + r[1] + '</td></tr>').join('') + '</tbody>';
const counts = M.counts(), mx = counts[0][1], mg = $('#mats');
counts.forEach(([k, n]) => { const r = el('div', 'mat'); r.appendChild(swatch(k, 18)); r.appendChild(el('span', '', esc(BL[k].name))); r.appendChild(el('div', 'bar', '<i style="width:' + Math.max(2, n / mx * 100) + '%"></i>')); r.appendChild(el('span', 'n', stacks(n))); mg.appendChild(r); });
$('#matn').innerHTML = 'Also per pod: 1 copper block and 1 carved pumpkin to make the golem, 1 honeycomb to wax it, 9 item frames. For ' + PODS_TOTAL + ' pods that is ' + nf(PODS_TOTAL) + ' copper blocks, ' + nf(PODS_TOTAL) + ' pumpkins, ' + nf(PODS_TOTAL) + ' honeycombs and ' + nf(PODS_TOTAL * 9) + ' item frames. Chests are counted as single blocks. Build the room in stages: the pods work one at a time.';

/* ---------- build and tests ---------- */
['Clear a 40 × 34 × 15 volume. Put floor slabs at layers 0, 3, 6, 9 and 12 across the whole footprint, and the roof slab at layer 15.',
 'Hall (x 0–2): leave layers b+1 and b+2 open on each level. Cut a ladder hole at both ends (z 0 and z 33) through each floor slab and run ladders from layer 1 to 14. Put the five sea lanterns in each ceiling slab.',
 'Fill x 3–39 solid on layers b+1 and b+2, then carve the 11 aisles: x 3 to 37, one cell wide, centred on z 1, 4, 7 … 31. Leave x 38 and 39, and z 33, solid.',
 'Do one pod completely and test it (right). A pod is aisle cells x 4–7, with the gate at x 3 and the next gate at x 8.',
 'Inside the pod: left column, first double: copper chests in the middle row, barrels above and below. Left column, second double and all of the right column: normal chests, three high.',
 'Make the golem: a copper block in the middle row of the left input cell, a carved pumpkin on top. Per the wiki the block becomes a copper chest and the pumpkin becomes the golem. Wax it, then finish the top row of the input stack.',
 'Prime each destination chest with one sample of its item, put an item frame showing it on the front, and put a sign or frame on the input stack for the category.',
 'Repeat the pod 6 more times along the aisle, then copy the aisle across and up. You do not have to build all 385 pods at once.'
].forEach(t => $('#steps').appendChild(el('li', '', esc(t))));
$('#testcol').appendChild(el('div', 'callout', '<b>Test one pod before building the rest.</b><ul class="plain" style="margin-top:6px"><li><b>Gate.</b> Open the gate and let the golem out, then close it. Does it stay in? If it walks through, replace the gates with solid blocks and a trapdoor you flip by hand.</li><li><b>Reach.</b> Put one item in the top row, the middle row and the bottom row. Does the golem fill all three rows? If not, drop the bottom row.</li><li><b>Chest count.</b> Make 9 destinations, then 10, then 12. Note where an item with a home stops being found.</li><li><b>Neighbours.</b> Build two pods side by side. Does one golem ever walk to the other pod’s chests?</li><li><b>Unknown item.</b> Drop an item no chest holds. The golem should keep it and retry every 7 s. If that jams the pod, add one empty chest at the far end as a catch-all.</li><li><b>Throughput.</b> Time 64 items through one golem. One golem per pod means a full stack takes a few trips.</li></ul>'));
