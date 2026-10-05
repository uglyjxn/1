'use strict';
/* ============================================================
   Set 2: realistic stone floors (11-20). Same 35 x 58 hall, centre (17, 28.5).
   ============================================================ */
function voro(px, pz, S, seed) {
  const gx = Math.floor(px / S), gz = Math.floor(pz / S); let d1 = 1e9, d2 = 1e9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cz = gz + j, fx = (cx + .15 + h2(cx, cz, seed) * .7) * S, fz = (cz + .15 + h2(cx, cz, seed + 1) * .7) * S, dd = Math.hypot(px - fx, pz - fz);
    if (dd < d1) { d2 = d1; d1 = dd; id = cx * 1000 + cz; } else if (dd < d2) d2 = dd;
  }
  return { id, d1, d2 };
}
function hexv(px, pz, S, seed) {
  const RH = S * .866, j0 = Math.round(pz / RH); let d1 = 1e9, d2 = 1e9, id = 0;
  for (let j = j0 - 1; j <= j0 + 1; j++) {
    const off = (j & 1) ? S / 2 : 0, i0 = Math.round((px - off) / S);
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      const dd = Math.hypot(px - (i * S + off), pz - j * RH);
      if (dd < d1) { d2 = d1; d1 = dd; id = i * 1000 + j; } else if (dd < d2) d2 = dd;
    }
  }
  return { id, d1, d2 };
}
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const CASTLE_ROWS = (() => { const rows = []; for (let r = 0; r < 20; r++) { const b = [0]; let x = 0; while (x < 19) { x += 5 + Math.floor(h2(r, x, 50) * 5); b.push(x); } rows.push(b); } return rows; })();

DESIGNS.push(
  {
    n: 11, group: 2, name: 'Chartres Labyrinth', tag: 'A cathedral labyrinth of pale paths and dark walls in a stone slab checker',
    wallMat: 'stone_bricks', colMat: 'polished_andesite', capMat: 'chiseled_stone_bricks',
    palette: [['Slab A', 'polished_andesite'], ['Slab B', 'smooth_stone'], ['Path', 'calcite'], ['Walls', 'deepslate_tiles'], ['Centre', 'chiseled_stone_bricks'], ['Border', 'deepslate_tiles']],
    concept: 'Modelled on the medieval labyrinth in the nave of Chartres. A round maze of dark deepslate walls and pale calcite paths sits in the middle of a grey slab checker. Walk in from the south and the path winds in and out until it reaches the rosette.',
    steps: ['Lay the 3-block border (deepslate tiles, polished andesite, deepslate tiles).', 'Fill the field with 4x4 slabs of polished andesite and smooth stone in a checker, starting from the inner corner at x 3, z 3.', 'Draw the maze from the centre: the rosette is 3 blocks across, then rings 3 blocks wide, each a 1-block dark wall and a 2-block pale path, out to radius 13.', 'Cut a 3-block gap in every wall ring, alternating between the north and south side (the outer ring opens to the south), so the path doubles back.'],
    swap: 'Use stone bricks for the walls and plain stone for the path if you want it cheaper and greyer.',
    fn(c) {
      const { d, r, mx, mz, ux, uz } = c;
      if (d === 0 || d === 2) return 'deepslate_tiles'; if (d === 1) return 'polished_andesite';
      if (r <= 1.6) return 'chiseled_stone_bricks'; if (r <= 3.2) return r <= 2.4 ? 'polished_andesite' : 'deepslate_tiles';
      if (r <= 13.4) {
        const k = Math.floor((r - 3.2) / 3), p = (r - 3.2) % 3;
        if (p < 1) {
          const tgt = k % 2 === 1 ? Math.PI / 2 : -Math.PI / 2;
          if (Math.abs(angDiff(Math.atan2(uz, ux), tgt)) * r < 1.5) return 'calcite';
          return 'deepslate_tiles';
        }
        return 'calcite';
      }
      return (((mx - 3) >> 2) + ((mz - 3) >> 2)) & 1 ? 'polished_andesite' : 'smooth_stone';
    }
  },
  {
    n: 12, group: 2, name: 'Roman Marble Sectile', tag: 'Squares in diamonds in polished granite, diorite, andesite and calcite',
    wallMat: 'quartz_bricks', colMat: 'quartz_pillar', capMat: 'polished_granite',
    palette: [['Centre', 'polished_granite'], ['Diamond', 'calcite'], ['Corner', 'polished_andesite'], ['Alt centre', 'smooth_quartz'], ['Medallion', 'polished_diorite'], ['Border', 'polished_granite']],
    concept: 'A real Roman pattern called opus sectile: cut marble pieces fitted into repeating geometry. Each 6x6 module is a coloured diamond inside a pale diamond inside a grey square. Neighbouring modules alternate granite red and quartz white, and a round medallion sits at the middle of the hall.',
    steps: ['Lay the border: polished andesite, calcite, polished granite.', 'Start the modules from the inner corner at x 3, z 3. Each is a 6x6 block: grey in the corners, a pale diamond (calcite), and a 2x2 coloured centre.', 'Alternate the centre between polished granite and smooth quartz in a checker.', 'Replace the middle with the round medallion last, since it cuts across the module grid.'],
    swap: 'Plain granite and diorite instead of the polished versions saves a crafting step but looks rougher.',
    fn(c) {
      const { d, r, mx, mz } = c;
      if (d === 0) return 'polished_andesite'; if (d === 1) return 'calcite'; if (d === 2) return 'polished_granite';
      if (r <= 1.6) return 'polished_granite'; if (r <= 3.2) return 'calcite'; if (r <= 4.6) return 'polished_andesite'; if (r <= 6) return 'polished_diorite';
      const lx = (mx - 3) % 6, lz = (mz - 3) % 6, u = Math.abs(lx - 2.5), v = Math.abs(lz - 2.5), par = (Math.floor((mx - 3) / 6) + Math.floor((mz - 3) / 6)) & 1;
      if (u + v <= 1.6) return par ? 'smooth_quartz' : 'polished_granite';
      if (u + v <= 3.6) return 'calcite';
      return 'polished_andesite';
    }
  },
  {
    n: 13, group: 2, name: 'Irregular Flagstone Plaza', tag: 'Hand-cut flagstones in several greys with gravel joints, like a real paved court',
    wallMat: 'stone_bricks', colMat: 'cobblestone', capMat: 'stone_bricks',
    palette: [['Flag A', 'stone'], ['Flag B', 'andesite'], ['Flag C', 'polished_andesite'], ['Flag D', 'smooth_stone'], ['Light flag', 'diorite'], ['Accent', 'tuff'], ['Joints', 'cobbled_deepslate'], ['Border', 'stone_bricks']],
    concept: 'The kind of paving you see in old courtyards: no two slabs the same size or shape. The stones are irregular polygons about 5 blocks across, each in one of five greys, and a single dark line of cobbled deepslate runs between them as shadowed mortar. A straight stone brick border keeps it tidy.',
    steps: ['Build the border first: stone bricks, polished andesite, stone bricks.', 'Divide the field into blobs of 4 to 7 blocks across. A quick way is to place 80 stakes at random roughly 5 blocks apart and fill each block with the stake it is nearest.', 'Give each blob one block type from the list, using the same type for no more than two neighbours in a row.', 'Run the cobbled deepslate joints on every cell that sits about halfway between two stakes.'],
    swap: 'Use only stone, andesite and cobblestone. The joint line can be cobblestone or left out.',
    fn(c) {
      const { d, x, z } = c;
      if (d === 0 || d === 2) return 'stone_bricks'; if (d === 1) return 'polished_andesite';
      const v = voro(x + .5, z + .5, 5.6, 41);
      if (v.d2 - v.d1 < .8) return 'cobbled_deepslate';
      const h = h2(v.id, 0, 43);
      return h < .24 ? 'stone' : h < .46 ? 'andesite' : h < .66 ? 'polished_andesite' : h < .86 ? 'smooth_stone' : h < .94 ? 'diorite' : 'tuff';
    }
  },
  {
    n: 14, group: 2, name: 'Cobblestone Fan Setts', tag: 'Overlapping scale-pattern setts shading from smooth stone to dark deepslate',
    wallMat: 'cobblestone', colMat: 'stone_bricks', capMat: 'stone_bricks',
    palette: [['Ring 1', 'smooth_stone'], ['Ring 2', 'andesite'], ['Ring 3', 'cobblestone'], ['Ring 4', 'cobbled_deepslate'], ['Mossy accent', 'mossy_cobblestone'], ['Border', 'stone_bricks']],
    concept: 'European street paving: small stones are laid in overlapping arcs like fish scales. Each scale is six blocks wide and three high, every second row is shifted by half a scale, and each scale is built from four rings that run from light to dark, which is what makes the arcs show. A few mossy cobblestones are mixed in.',
    steps: ['Build the border: stone bricks, smooth stone, stone bricks.', 'Start the fans at the inner corner (x 3, z 3). Each row is 3 blocks tall; shift every second row 3 blocks sideways.', 'In each fan lay four arcs around a point 1 block above the row: smooth stone, andesite, cobblestone, then cobbled deepslate for the dark outer edge.', 'Swap about one block in eight for mossy cobblestone.'],
    swap: 'Drop the deepslate ring and use cobblestone twice. You lose some detail but save a block type.',
    fn(c) {
      const { d, mx, mz, x, z } = c;
      if (d === 0 || d === 2) return 'stone_bricks'; if (d === 1) return 'smooth_stone';
      const row = Math.floor((mz - 3) / 3), u = ((mx - 3 + (row & 1) * 3) % 6 + 6) % 6 - 2.5, v = (mz - 3) % 3;
      const dist = Math.hypot(u, v + 1.5), ring = Math.floor(dist * .95);
      if (h2(x, z, 61) < .04) return 'mossy_cobblestone';
      return ['smooth_stone', 'andesite', 'cobblestone', 'cobbled_deepslate'][ring % 4];
    }
  },
  {
    n: 15, group: 2, name: 'Terrazzo and Brass', tag: 'Speckled granite and diorite terrazzo in 6x6 bays divided by brass strips',
    wallMat: 'polished_andesite', colMat: 'polished_diorite', capMat: 'gold_block',
    palette: [['Chip A', 'andesite'], ['Chip B', 'diorite'], ['Chip C', 'granite'], ['Chip D', 'stone'], ['Chip E', 'polished_diorite'], ['Brass', 'gold_block'], ['Border', 'polished_andesite'], ['Medallion', 'polished_granite']],
    concept: 'The floor of an old bank or railway station. A terrazzo base is a random speckle of small chips, so no two blocks match, cut into 6x6 bays by thin brass strips. Alternate bays use a warmer mix (more granite) and a cooler mix (more andesite).',
    steps: ['Lay the border: polished andesite, gold, polished andesite.', 'Place the brass strips: every 6th row and column counted from the border, one block wide.', 'Fill each bay with a random mix of the five chip blocks. Use the warm mix (granite and diorite) in bays where the two bay numbers add to an even number and the cool mix (andesite and stone) in the others.', 'Finish with the medallion in the middle, with a granite core and a diorite ring.'],
    swap: 'Gold strips can be yellow concrete or cut copper. They are only 1 block wide, so the cost is small.',
    fn(c) {
      const { d, r, mx, mz, x, z } = c;
      if (d === 0 || d === 2) return 'polished_andesite'; if (d === 1) return 'gold_block';
      if (r <= 2.2) return 'polished_granite'; if (r <= 3.4) return 'polished_diorite'; if (r <= 4.2) return 'gold_block';
      if ((mx - 3) % 6 === 5 || (mz - 3) % 6 === 5) return 'gold_block';
      const bay = Math.floor((mx - 3) / 6) + Math.floor((mz - 3) / 6), h = h2(x, z, 71);
      if (bay & 1) return h < .35 ? 'andesite' : h < .62 ? 'stone' : h < .85 ? 'diorite' : h < .94 ? 'granite' : 'polished_diorite';
      return h < .32 ? 'granite' : h < .58 ? 'diorite' : h < .8 ? 'andesite' : h < .93 ? 'stone' : 'polished_diorite';
    }
  },
  {
    n: 16, group: 2, name: 'Castle Great Hall', tag: 'Staggered ashlar flagstones, a raised stone dais and a red runner',
    wallMat: 'stone_bricks', colMat: 'stone_bricks', capMat: 'cobblestone',
    palette: [['Slab A', 'stone'], ['Slab B', 'andesite'], ['Slab C', 'polished_andesite'], ['Slab D', 'smooth_stone'], ['Slab E', 'cobblestone'], ['Dais', 'polished_andesite'], ['Dais edge', 'stone_bricks'], ['Runner', 'red_carpet']],
    concept: 'A medieval hall. The floor is laid in rows of slabs three blocks high, each 5 to 9 blocks long, with the joints never lining up from one row to the next. A raised dais at the north end is edged in stone brick, and a 5-wide red runner leads to it from the door.',
    steps: ['Build the 2-block stone brick border.', 'Lay rows 3 blocks deep from the north wall. Make each slab 5 to 9 blocks long and change block type with each slab.', 'Raise the dais 1 block: stone brick frame, polished andesite top, 21 blocks wide and 9 deep, with a step of smooth stone at the front.', 'Lay the red carpet runner, 5 wide, from the south door to the dais step.'],
    swap: 'Stone and andesite only for the slabs. The carpet can be any colour for a different household.',
    fn(c) {
      const { d, a, mx, z } = c;
      if (d <= 1) return 'stone_bricks';
      if (z >= 3 && z <= 11 && a <= 10) return (z === 3 || z === 11 || a === 10) ? 'stone_bricks' : 'polished_andesite';
      if (z === 12 && a <= 8) return 'smooth_stone';
      if (a <= 2 && z >= 13 && z <= 55) return 'red_carpet';
      const row = Math.min(19, Math.floor(z / 3)), bd = CASTLE_ROWS[row]; let k = 0; while (k + 1 < bd.length && bd[k + 1] <= mx) k++;
      const h = h2(row, k, 81);
      return h < .28 ? 'stone' : h < .52 ? 'andesite' : h < .72 ? 'polished_andesite' : h < .88 ? 'smooth_stone' : 'cobblestone';
    }
  },
  {
    n: 17, group: 2, name: 'Museum Limestone and Basalt', tag: 'Large pale slabs with fine dark basalt joints and a basalt medallion',
    wallMat: 'calcite', colMat: 'smooth_stone', capMat: 'polished_basalt',
    palette: [['Slab A', 'calcite'], ['Slab B', 'polished_diorite'], ['Slab C', 'smooth_stone'], ['Joints', 'smooth_basalt'], ['Border', 'polished_basalt'], ['Medallion', 'polished_basalt']],
    concept: 'Contemporary and calm. The slabs are 5x5, each in one of three near-white stones, and a single block of dark basalt runs between them as a joint. A black round inlay with a white eye marks the centre. Everything is cool and grey.',
    steps: ['Lay the border: smooth basalt, polished basalt.', 'Draw the joint grid in smooth basalt: one block wide every 6th block, counted from the border.', 'Fill each 5x5 slab with a single block: calcite most often, then polished diorite, then smooth stone.', 'Build the medallion last, a polished basalt disc 9 across with a calcite eye.'],
    swap: 'Quartz block or white concrete works in place of calcite, and stone in place of smooth stone.',
    fn(c) {
      const { d, r, mx, mz } = c;
      if (d === 0) return 'smooth_basalt'; if (d === 1) return 'polished_basalt';
      if (r <= 2) return 'calcite'; if (r <= 4.4) return 'polished_basalt';
      if ((mx - 2) % 6 === 5 || (mz - 2) % 6 === 5) return 'smooth_basalt';
      const h = h2(Math.floor((mx - 2) / 6), Math.floor((mz - 2) / 6), 91);
      return h < .55 ? 'calcite' : h < .82 ? 'polished_diorite' : 'smooth_stone';
    }
  },
  {
    n: 18, group: 2, name: 'Cavern Floor', tag: 'Natural cave rock: tuff, stone, andesite, dripstone and deepslate with gravel and pools',
    wallMat: 'cobbled_deepslate', colMat: 'tuff', capMat: 'dripstone_block',
    palette: [['Rock', 'stone'], ['Rock B', 'andesite'], ['Tuff', 'tuff'], ['Dripstone', 'dripstone_block'], ['Deep', 'cobbled_deepslate'], ['Deep B', 'deepslate'], ['Gravel', 'gravel'], ['Crystal', 'calcite'], ['Pools', 'water']],
    concept: 'No pattern at all, which is the point. Patches of grey stone, tuff and deepslate grow into one another along a slow noise curve, the edges are ragged, and three still pools sit in gravel shores. Rare calcite crystals are scattered on the floor.',
    steps: ['Fill the whole area with stone and the border with ragged cobbled deepslate (2 to 4 blocks deep, uneven).', 'Paint patches of 6 to 12 blocks in tuff and andesite, then patches of deepslate and cobbled deepslate. Keep edges soft by mixing 2 to 3 blocks of the neighbouring stone along each border.', 'Add dripstone blocks in clumps of 3 to 5, and gravel patches of 4 to 6.', 'Dig the three pools, line them with gravel, fill with water. Scatter a few calcite blocks.'],
    swap: 'All of these are quarried. If you are short of tuff, use more andesite.',
    fn(c) {
      const { d, x, z } = c;
      const e = (cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2;
      const p1 = e(10, 14, 5.5, 3.5), p2 = e(25, 30, 4.5, 3), p3 = e(14, 46, 5, 3.5);
      if (p1 <= 1 || p2 <= 1 || p3 <= 1) return 'water'; if (p1 <= 1.6 || p2 <= 1.6 || p3 <= 1.6) return 'gravel';
      const n = vn(x / 6, z / 6, 11), n2 = vn(x / 2.4, z / 2.4, 12), rr = h2(x, z, 13);
      if (d < 2 + vn(x / 3, z / 3, 17) * 3) return rr < .5 ? 'cobbled_deepslate' : 'deepslate';
      if (rr < .008) return 'calcite';
      if (n < .27) return n2 > .5 ? 'deepslate' : 'cobbled_deepslate';
      if (n < .42) return n2 > .55 ? 'tuff' : 'andesite';
      if (n > .74) return n2 > .5 ? 'dripstone_block' : 'tuff';
      if (n > .6) return n2 > .6 ? 'gravel' : 'andesite';
      return rr < .2 ? 'andesite' : 'stone';
    }
  },
  {
    n: 19, group: 2, name: 'Pompeii Black and White', tag: 'A zigzag border and a diamond lattice in black and white stone',
    wallMat: 'smooth_quartz', colMat: 'quartz_pillar', capMat: 'polished_blackstone',
    palette: [['White', 'smooth_quartz'], ['Black', 'polished_blackstone'], ['Grey', 'polished_andesite'], ['Pale', 'calcite'], ['Lines', 'polished_blackstone']],
    concept: 'Taken from Roman house floors. A band of black triangles runs round the hall, then a field of rotated squares in white and grey stone, and a nested black-and-white rosette sits in the middle. It is strict, contrasty and entirely black, white and grey.',
    steps: ['Build the 3-block border: blackstone, quartz, blackstone.', 'Build the 6-block triangle band: triangles 10 blocks wide and 5 tall, pointing in, with the points on the edge midpoints. Fill between them with quartz.', 'Close the band with a blackstone line one block wide.', 'Lay the diamond field at 45 degrees, 4 blocks to a diamond, alternating quartz and polished andesite.', 'Finish with the rosette: black eye, white, black, calcite, black.'],
    swap: 'Black concrete instead of polished blackstone gives a pure black, and white concrete for the quartz.',
    fn(c) {
      const { d, r, mx, mz, x, z } = c;
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'smooth_quartz';
      if (r <= 2) return 'polished_blackstone'; if (r <= 3.2) return 'smooth_quartz'; if (r <= 4.4) return 'polished_blackstone'; if (r <= 5.6) return 'calcite'; if (r <= 6.4) return 'polished_blackstone';
      if (d <= 8) {
        const pos = mz <= mx ? mx : mz, t = d - 3, phase = Math.abs(pos % 10 - 5);
        return t < 5 - phase ? 'polished_blackstone' : 'smooth_quartz';
      }
      if (d === 9) return 'polished_blackstone';
      const i = Math.floor((x + z) / 4), j = Math.floor((x - z + 60) / 4);
      return (i + j) & 1 ? 'smooth_quartz' : 'polished_andesite';
    }
  },
  {
    n: 20, group: 2, name: 'Basalt Column Hexagons', tag: 'Hexagonal basalt columns in four dark tones, like the Giants Causeway',
    wallMat: 'basalt', colMat: 'basalt', capMat: 'polished_basalt',
    palette: [['Top A', 'smooth_basalt'], ['Top B', 'polished_basalt'], ['Top C', 'basalt'], ['Top D', 'blackstone'], ['Cracks', 'polished_blackstone'], ['Accent', 'tuff'], ['Border', 'basalt']],
    concept: 'Natural basalt cools into six-sided columns, and the tops look like a honeycomb of stone. Here every hexagon is seven blocks across, in one of four dark greys, with a thin dark crack between them. A few lighter tuff columns break up the black.',
    steps: ['Build the border: basalt, polished basalt, basalt (3 blocks).', 'Lay the hexagon grid in rows. Each row is 6 blocks apart and every second row is shifted 3.5 blocks sideways.', 'Fill every hexagon in one block type. Try not to put the same tone next to itself.', 'Cut the cracks: every cell halfway between two hexagon centres is polished blackstone.', 'Swap one hexagon in nine for tuff.'],
    swap: 'You can do it all in smooth stone and andesite for a pale version.',
    fn(c) {
      const { d, x, z } = c;
      if (d === 0 || d === 2) return 'basalt'; if (d === 1) return 'polished_basalt';
      const v = hexv(x + .5, z + .5, 7, 101);
      if (v.d2 - v.d1 < .8) return 'polished_blackstone';
      const h = h2(v.id, 3, 103);
      return h < .1 ? 'tuff' : h < .38 ? 'smooth_basalt' : h < .64 ? 'polished_basalt' : h < .84 ? 'basalt' : 'blackstone';
    }
  }
);
