'use strict';
/* ============================================================
   Copper golem storage room, 40 x 34 x 15 (+ roof slab).
   x 0-39 west to east, z 0-33 north to south, y 0-14 up (y 15 is the roof slab).

   5 levels, 3 blocks apart. Level k starts at b = 3k:
     y b      floor slab under the aisle; bottom chest row beside it   (golem reaches: 1 below)
     y b+1    aisle cell the golem stands in; middle chest row          (same level)
     y b+2    aisle headroom; top chest row                             (1 above)
     y b+3    next level's floor slab = this level's ceiling

   x 0-2    hall (3 wide, whole length), ladders at both ends
   x 3-38   11 aisles side by side, each 3 wide (chest column, aisle, chest column)
   Each aisle is cut into 7 pods of 4 cells by closed fence gates (x 3, 8, ... 33).
   ============================================================ */
const LEVELS = 5, PITCH = 3, AISLES = 11, PODS = 7;
const podX = p => 4 + 5 * p;            // first aisle cell of pod p
const gateX = p => 3 + 5 * p;           // gate in front of pod p

function buildStorage() {
  const M = new Model(), ST = 'stone', SS = 'smooth_stone';
  for (let k = 0; k < LEVELS; k++) {
    const b = PITCH * k;
    M.fill(0, b, 0, 39, b, 33, SS);                         // floor slab
    M.fill(3, b + 1, 0, 39, b + 2, 33, ST);                 // solid block for the aisle area, carved below
    for (let j = 0; j < AISLES; j++) {
      const z0 = 3 * j, za = z0 + 1;
      M.clear(3, b + 1, za, 37, b + 2, za);                 // aisle, 2 high
      for (let p = 0; p < PODS; p++) {
        const xs = podX(p), gx = gateX(p);
        M.set(gx, b + 1, za, 'fence_gate');
        M.set(gx, b + 1, z0, 'sea_lantern');                // light in the divider column
        // left column (z0): input stack + 3 spare barrels, then the first 3 destination chests
        for (let dx = 0; dx < 2; dx++) {
          M.set(xs + dx, b + 1, z0, 'copper_chest');
          M.set(xs + dx, b, z0, 'barrel'); M.set(xs + dx, b + 2, z0, 'barrel');
        }
        for (let y = b; y <= b + 2; y++) for (let dx = 2; dx < 4; dx++) M.set(xs + dx, y, z0, 'chest');
        // right column (z0 + 2): 6 destination chests
        for (let y = b; y <= b + 2; y++) for (let dx = 0; dx < 4; dx++) M.set(xs + dx, y, z0 + 2, 'chest');
        M.set(xs, b + 1, za, 'golem', { h: .98 });
      }
    }
    // hall: ladders at both ends, holes through the floor slabs
    for (const z of [0, 33]) { M.clear(0, b, z, 0, b, z); for (let y = b; y <= b + 2; y++) M.set(0, y, z, 'ladder'); }
    for (const z of [4, 10, 16, 22, 28]) M.set(1, b + 3 > 15 ? 15 : b + 3, z, 'sea_lantern');
  }
  M.fill(0, 15, 0, 39, 15, 33, SS);                        // roof slab
  for (const z of [4, 10, 16, 22, 28]) M.set(1, 15, z, 'sea_lantern');
  M.clear(0, 0, 33, 0, 0, 33); M.set(0, 0, 33, SS); M.clear(0, 0, 0, 0, 0, 0); M.set(0, 0, 0, SS);   // ground floor stays closed
  M.set(0, 1, 16, 'door'); M.set(0, 2, 16, 'door');
  // labels for the plans
  for (let k = 0; k < LEVELS; k++) {
    const y = PITCH * k + 1;
    M.note(y, 1, 16.5, 'Hall', { s: 12 });
    M.note(y, 0, 1, 'Ladder', { s: 8 }); M.note(y, 0, 32, 'Ladder', { s: 8 });
    M.note(y, 2.5, 1, 'Gate', { s: 8 });
    M.note(y, podX(0) + 1.5, 2, 'Pod 1', { s: 9 }); M.note(y, podX(1) + 1.5, 2, 'Pod 2', { s: 9 });
    M.note(y, gateX(1), 17.5, 'Gate', { s: 8 });
  }
  M.note(1, 0, 16.5, 'Entrance', { s: 9 });
  return M;
}
