'use strict';
/* ============================================================
   Three spawn chambers (N, W, E) feed one pen by water. The pen is dry. South of the pen is the gallery:
   a one-block trench, a low wall, and the cell you stand in, 2.5 blocks back from the pen edge.

   y 0-3  base, chest, trench hoppers          y 7     ground / chamber floors
   y 4    channel floors, pen collector row    y 8-11  chambers
   y 5    channel water, pen floor, gallery    y 6-9   pen and gallery rooms
   y 6    channel headroom, carpet, wall       y 10    pen roof     y 12  chamber roofs
   ============================================================ */
const SPAWNERS = [[18, 9, 5], [5, 9, 13], [31, 9, 13]];   // x, y, z

function buildFarm() {
  const M = new Model();
  const SB = 'stone_bricks', SS = 'smooth_stone', PA = 'polished_andesite';

  /* ---------- pen + gallery block (x 13-23, z 11-22) ---------- */
  M.fill(13, 0, 11, 23, 3, 22, SB);                       // base
  M.fill(13, 4, 11, 23, 4, 22, SB);                       // under the pen and gallery
  M.fill(13, 5, 11, 23, 5, 15, PA);                       // pen floor (top at 6.0)
  M.fill(13, 5, 18, 23, 5, 22, SS);                       // gallery floor
  M.fill(13, 5, 17, 23, 5, 17, SS);                       // cantilever over the trench + wall cell
  // trench: z 16, open down to the hoppers at y 3
  M.clear(14, 4, 16, 22, 5, 16);
  M.clear(14, 4, 17, 22, 4, 17);                          // 1 block of air under the cantilever
  // walls and roof
  for (let y = 6; y <= 9; y++) {
    for (let z = 11; z <= 22; z++) { M.set(13, y, z, SB); M.set(23, y, z, SB); }
    for (let x = 13; x <= 23; x++) { M.set(x, y, 11, SB); M.set(x, y, 22, SB); }
  }
  M.fill(13, 10, 11, 23, 10, 22, SB);
  M.clear(13, 6, 16, 13, 9, 17); M.clear(23, 6, 16, 23, 9, 17);   // break in the side walls so spiders cannot walk along them
  // lights at the far (south) end only
  M.set(16, 10, 21, 'sea_lantern'); M.set(20, 10, 21, 'sea_lantern');
  // pen carpet (nothing can spawn on it)
  M.fill(14, 6, 12, 22, 6, 15, 'gray_carpet', { h: .06 });
  // hopper front row, collectors, chest, trench hoppers
  M.fill(15, 5, 15, 21, 5, 15, 'hopper'); M.clear(15, 6, 15, 21, 6, 15);
  M.fill(15, 4, 15, 21, 4, 15, 'hopper');
  M.set(18, 3, 15, 'chest'); M.set(19, 3, 15, 'chest');
  M.fill(15, 3, 16, 21, 3, 16, 'hopper');
  // sill wall
  M.fill(14, 6, 17, 22, 6, 17, 'cobblestone_wall');
  // stand + door + steps
  M.set(18, 6, 18, 'player'); M.set(18, 7, 18, 'player');
  M.set(18, 6, 22, 'oak_door'); M.set(18, 7, 22, 'oak_door'); M.set(18, 8, 22, SB); M.set(18, 9, 22, SB);
  M.set(18, 5, 23, SS); M.set(18, 6, 24, SS);
  // channel openings in the pen walls
  M.clear(17, 5, 11, 19, 7, 11); M.clear(13, 5, 12, 13, 7, 14); M.clear(23, 5, 12, 23, 7, 14);

  /* ---------- spawn chambers ---------- */
  const DIRS = {
    N: { f: (u, v) => [18 + u, 5 + v], pen: 6, d: [0, 1] },
    W: { f: (u, v) => [5 + v, 13 - u], pen: 8, d: [1, 0] },
    E: { f: (u, v) => [31 - v, 13 + u], pen: 8, d: [-1, 0] }
  };
  for (const name of ['N', 'W', 'E']) {
    const { f, pen, d } = DIRS[name], P = (u, v, y, m, o) => { const [x, z] = f(u, v); M.set(x, y, z, m, o); };
    const C0 = (u, v, y0, y1, m, o) => { for (let y = y0; y <= y1; y++) P(u, v, y, m, o); };
    for (let u = -5; u <= 5; u++) for (let v = -5; v <= 5; v++) {
      const edge = Math.abs(u) === 5 || Math.abs(v) === 5, hole = Math.abs(u) <= 1 && Math.abs(v) <= 1;
      if (!hole) P(u, v, 7, SB);
      P(u, v, 12, SB);
      if (edge) C0(u, v, 8, 11, SB);
      else if (Math.abs(u) + Math.abs(v) > 6) C0(u, v, 8, 11, SB);
      else P(u, v, 8, 'water', { h: .6, src: (Math.abs(u) === 4 && v === 0) || (u === 0 && Math.abs(v) === 4) });
    }
    for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) { P(u, v, 7, 'water', { h: 1 }); P(u, v, 6, 'water', { h: 1 }); }
    P(0, 0, 11, SB); P(0, 0, 10, SB); P(0, 0, 9, 'spawner');
    P(5, 0, 9, 'cobblestone'); P(5, 0, 10, 'cobblestone'); P(6, 0, 8, SS);     // plug in the side wall + step
    // channel: floor y4, walls y5-6, water y5, sources at v=-1 and v=5
    for (let v = -1; v <= pen; v++) {
      for (let u = -2; u <= 2; u++) P(u, v, 4, PA);
      if (v < pen) for (const u of [-2, 2]) { P(u, v, 5, SB); P(u, v, 6, SB); }
      for (let u = -1; u <= 1; u++) P(u, v, 5, 'water', { h: .8, src: v === -1 || v === 5 });
    }
    for (let u = -2; u <= 2; u++) { P(u, -2, 4, PA); P(u, -2, 5, SB); P(u, -2, 6, SB); }
    for (let v = 6; v < pen; v++) for (let u = -2; u <= 2; u++) P(u, v, 7, SS);   // arm roof
    // arrows + labels
    const [dx, dz] = d;
    for (let v = -1; v <= pen; v += 2) { const [x, z] = f(0, v); M.arrow(5, x, z, dx, dz); }
    for (const [u, v] of [[-3, 0], [3, 0], [0, -3], [-2, -2], [2, -2], [-3, 2], [3, 2], [-2, 3], [2, 3]]) {
      const [x, z] = f(u, v), [x2, z2] = f(0, 0); M.arrow(8, x, z, Math.sign(x2 - x), Math.sign(z2 - z));
    }
    const [lx, lz] = f(0, 0); M.note(9, lx, lz, 'Spawner', { s: 10 });
    const [px, pz] = f(5, 0); M.note(9, px, pz, 'Plug', { s: 9 });
    const [sx, sz] = f(6, 0); M.note(8, sx, sz, 'Step', { s: 9 });
    const [hx, hz] = f(0, -4); M.note(8, hx, hz, 'Source', { s: 9 });
  }
  // arrows in the pen: mobs walk, so these show only where the channels end
  M.note(5, 18, 9, 'Channel N', { s: 9 });

  /* ---------- labels ---------- */
  M.note(3, 18.5, 15, 'Large chest', { s: 10 }); M.note(4, 18, 15, 'Collectors', { s: 10 });
  M.note(3, 18, 16, 'Trench hoppers', { s: 9 });
  M.note(5, 18, 13, 'Pen floor', { s: 11 }); M.note(5, 18, 15, 'Hoppers', { s: 10 });
  M.note(5, 18, 17, 'Overhang', { s: 9 }); M.note(5, 18, 20, 'Gallery', { s: 11 });
  M.note(6, 18, 13, 'Pen', { s: 11 }); M.note(6, 18, 16, 'Trench', { s: 10 }); M.note(6, 18, 17, 'Wall', { s: 10 }); M.note(6, 18, 20, 'Gallery', { s: 11 });
  M.note(6, 18, 22, 'Door', { s: 9 });
  M.note(10, 18, 16, 'Roof + lanterns', { s: 10 });
  return M;
}
