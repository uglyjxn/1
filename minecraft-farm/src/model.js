'use strict';
/* ============================================================
   The farm. Centre of the kill room is (18, 18). Four spawn chambers (N, E, S, W)
   sit 13 blocks from the centre, each joined to it by a water channel.

   y 0-1  basement + loot chests          y 5    walkway plate / chamber floors
   y 2    pit floor, channel floors       y 6-9  chambers, kill booth, corridors
   y 3-4  water + headroom (mob level)    y 10   chamber roofs
   ============================================================ */
const C = 18;
const SPAWNERS = [[18, 7, 5], [31, 7, 18], [18, 7, 31], [5, 7, 18]];   // x, y, z

function buildFarm() {
  const M = new Model();
  const SB = 'stone_bricks', SS = 'smooth_stone', PA = 'polished_andesite';
  const ring = (x0, z0, x1, z1, y0, y1, m) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (x === x0 || x === x1 || z === z0 || z === z1) M.set(x, y, z, m); };

  /* ---------- kill room (centre) ---------- */
  M.fill(14, 0, 14, 22, 1, 22, SB);                 // basement block
  M.fill(14, 2, 14, 22, 2, 22, PA);                 // pit floor
  ring(14, 14, 22, 22, 3, 4, SB);                   // pit walls (2 high)
  M.fill(14, 5, 14, 22, 5, 22, SS);                 // walkway plate = booth floor
  ring(14, 14, 22, 22, 6, 8, SB);                   // booth walls
  M.fill(14, 9, 14, 22, 9, 22, SB);                 // booth roof
  for (const [x, z] of [[16, 16], [20, 16], [16, 20], [20, 20]]) M.set(x, 9, z, 'redstone_lamp');
  // pit water: fed from the four channels, flows towards the middle
  M.fill(15, 3, 15, 21, 3, 21, 'water', { h: .5 });
  // hopper floor 3 x 3 + chest
  M.fill(17, 2, 17, 19, 2, 19, 'hopper');
  M.set(18, 1, 19, 'chest'); M.set(19, 1, 19, 'chest');
  // hatch: pedestal in the middle, bridge to the south, the other 7 cells stay open
  M.clear(17, 5, 17, 19, 5, 19);
  M.set(18, 5, 18, SS); M.set(18, 5, 19, SS);
  M.set(18, 6, 18, 'player', { h: 1 }); M.set(18, 7, 18, 'player', { h: 1 });
  // pit and booth openings for the four channels
  M.clear(17, 3, 14, 19, 4, 14); M.clear(17, 3, 22, 19, 4, 22); M.clear(14, 3, 17, 14, 4, 19); M.clear(22, 3, 17, 22, 4, 19);
  M.clear(17, 6, 14, 19, 8, 14); M.clear(17, 6, 22, 19, 8, 22); M.clear(14, 6, 17, 14, 8, 19); M.clear(22, 6, 17, 22, 8, 19);
  // booth windows (glass, 2 high) and the entrance door on the east wall
  for (const o of [-3, -2, 2, 3]) {
    M.fill(C + o, 7, 14, C + o, 8, 14, 'glass'); M.fill(C + o, 7, 22, C + o, 8, 22, 'glass');
    M.fill(14, 7, C + o, 14, 8, C + o, 'glass'); M.fill(22, 7, C + o, 22, 8, C + o, 'glass');
  }
  M.clear(22, 6, 21, 22, 8, 21); M.set(22, 6, 21, 'oak_door'); M.set(22, 7, 21, 'oak_door'); M.set(22, 8, 21, SB);

  /* ---------- spawn chambers ---------- */
  const DIRS = {
    N: (u, v) => [18 + u, 5 + v], S: (u, v) => [18 - u, 31 - v],
    W: (u, v) => [5 + v, 18 - u], E: (u, v) => [31 - v, 18 + u]
  };
  const dxz = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };   // direction towards the pit
  for (const name of ['N', 'E', 'S', 'W']) {
    const f = DIRS[name], P = (u, v, y, m, o) => { const [x, z] = f(u, v); M.set(x, y, z, m, o); };
    const C0 = (u, v, y0, y1, m, o) => { for (let y = y0; y <= y1; y++) P(u, v, y, m, o); };
    for (let u = -5; u <= 5; u++) for (let v = -5; v <= 5; v++) {
      const edge = Math.abs(u) === 5 || Math.abs(v) === 5, hole = Math.abs(u) <= 1 && Math.abs(v) <= 1;
      if (!hole) P(u, v, 5, SB);                                   // floor plate
      P(u, v, 10, SB);                                             // roof
      if (edge) C0(u, v, 6, 9, SB);                                // outer wall
      else if (Math.abs(u) + Math.abs(v) > 6) C0(u, v, 6, 9, SB);  // corner fill: makes the room an octagon
      else {
        const src = (Math.abs(u) === 4 && v === 0) || (u === 0 && Math.abs(v) === 4);
        if (!hole || true) P(u, v, 6, 'water', { h: .6, src });    // floor water (4 source blocks, rest flows)
      }
    }
    // 3 x 3 drop shaft: falling water through the floor plate down to the channel
    for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) { P(u, v, 5, 'water', { h: 1 }); P(u, v, 4, 'water', { h: 1 }); }
    // spawner hangs on a two-block stalactite
    P(0, 0, 9, SB); P(0, 0, 8, SB); P(0, 0, 7, 'spawner');
    // access plug (two cobblestone, remove to enter) and the step in front of it
    P(0, 5, 7, 'cobblestone'); P(0, 5, 8, 'cobblestone'); P(0, 6, 6, SS);
    // channel: floor y2 (5 wide), walls y3-4, water y3 (3 wide), sources at both ends
    for (let v = -1; v <= 9; v++) {
      for (let u = -2; u <= 2; u++) P(u, v, 2, PA);
      if (v <= 8) { P(-2, v, 3, SB); P(2, v, 3, SB); P(-2, v, 4, SB); P(2, v, 4, SB); }
      for (let u = -1; u <= 1; u++) P(u, v, 3, 'water', { h: .8, src: v === -1 || v === 6 });
      if (v === -1) for (let u = -2; u <= 2; u++) { P(u, v, 3, u === -2 || u === 2 ? SB : 'water', u === -2 || u === 2 ? undefined : { h: .8, src: true }); }
    }
    // cap the channel start
    for (let u = -2; u <= 2; u++) { P(u, -2, 2, PA); P(u, -2, 3, SB); P(u, -2, 4, SB); }
    // corridor above the arm: plate, walls, roof
    for (let v = 6; v <= 8; v++) {
      for (let u = -2; u <= 2; u++) { P(u, v, 5, SS); P(u, v, 9, SB); }
      for (const u of [-2, 2]) C0(u, v, 6, 8, SB);
    }
    // flow arrows (plan view)
    const [dx, dz] = dxz[name];
    for (let v = -1; v <= 12; v += 2) { const [x, z] = f(0, v); M.arrow(3, x, z, dx, dz); }
    for (const [u, v] of [[-3, 0], [3, 0], [0, -3], [-2, -2], [2, -2], [-3, 2], [3, 2], [-2, 3], [2, 3]]) {
      const [x, z] = f(u, v), [x2, z2] = f(0, 0); M.arrow(6, x, z, Math.sign(x2 - x), Math.sign(z2 - z));
    }
    const [lx, lz] = f(0, 0);
    M.note(7, lx, lz, 'Spawner', { s: 10 });
    const [px, pz] = f(0, 5); M.note(7, px, pz, 'Plug', { s: 9 });
    const [sx, sz] = f(0, 6); M.note(6, sx, sz, 'Step', { s: 9 });
    const [hx, hz] = f(0, -4); M.note(6, hx, hz, 'Source', { s: 9 });
  }
  // pit flow arrows: every channel pushes towards the middle
  for (const [x, z, dx, dz] of [[18, 16, 0, 1], [18, 20, 0, -1], [16, 18, 1, 0], [20, 18, -1, 0], [17, 15, 0, 1], [19, 15, 0, 1], [17, 21, 0, -1], [19, 21, 0, -1], [15, 17, 1, 0], [15, 19, 1, 0], [21, 17, -1, 0], [21, 19, -1, 0]]) M.arrow(3, x, z, dx, dz);

  /* ---------- labels ---------- */
  M.note(1, 18.5, 19, 'Large chest', { s: 10 });
  M.note(2, 18, 18, 'Hoppers\n3 x 3', { s: 10 });
  M.note(3, 18, 18, 'Pit water', { s: 10 });
  M.note(5, 18, 17, 'Hatch', { s: 10 }); M.note(5, 18, 18, 'Stand', { s: 9 }); M.note(5, 18, 19, 'Bridge', { s: 9 });
  M.note(6, 18, 16, 'Booth', { s: 11 }); M.note(7, 18, 20, 'Booth', { s: 11 }); M.note(6, 22, 21, 'Door', { s: 9 });
  M.note(9, 18, 18, 'Roof + lamps', { s: 10 });
  return M;
}
