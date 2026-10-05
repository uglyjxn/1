'use strict';
/* ============================================================
   Ten floor designs for one 35 x 58 hall.
   x 0..34 west->east, z 0..57 north->south. Centre of the hall is (17, 28.5).
   Each design is a function from a cell (distance from edge d, offset a/b, radius r) to a block.
   ============================================================ */
const ANG8 = (c, w) => { const t = Math.atan2(c.uz, c.ux), k = Math.round(t / (Math.PI / 4)); return Math.abs(t - k * Math.PI / 4) * c.r < w; };

const DESIGNS = [
  {
    n: 1, name: 'Royal Checkerboard', tag: 'Black and white checker, gold inlay lines and a lapis-and-gold medallion',
    wallMat: 'quartz_bricks', colMat: 'quartz_pillar', capMat: 'gold_block',
    palette: [['Light square', 'smooth_quartz'], ['Dark square', 'polished_deepslate'], ['Inlay', 'gold_block'], ['Border', 'polished_blackstone'], ['Medallion', 'lapis_block']],
    concept: 'The classic palace hall. A three-wide border of blackstone and gold frames a checkerboard that reverses inside the central medallion. A gold ellipse ties the room together.',
    steps: ['Lay the border first: blackstone, gold, blackstone, working in from the walls.', 'Mark the centre at x 17, between z 28 and 29, and build the medallion from the middle outward.', 'Fill the checker from the medallion outward so the pattern stays aligned, then trace the gold ellipse (14 blocks across, 24 along).'],
    swap: 'Swap gold blocks for yellow concrete or cut copper for a cheaper build.',
    fn(c) {
      const { d, r, a, b, x, z } = c, odd = (x + z) & 1, chk = odd ? 'smooth_quartz' : 'polished_deepslate', inv = odd ? 'polished_deepslate' : 'smooth_quartz';
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'gold_block';
      if (r <= 1.6) return 'lapis_block'; if (r <= 3.2) return 'gold_block'; if (r <= 4.2) return 'smooth_quartz';
      if (r <= 5.2) return 'polished_blackstone'; if (r <= 6.2) return 'gold_block'; if (r <= 7.6) return inv;
      if (Math.abs(a * a / 196 + b * b / 576 - 1) < .075) return 'gold_block';
      return chk;
    }
  },
  {
    n: 2, name: 'Deepslate Compass Rose', tag: 'A four-point compass in quartz over tiled deepslate, with glowing ring markers',
    wallMat: 'deepslate_bricks', colMat: 'polished_deepslate', capMat: 'gold_block',
    palette: [['Field A', 'polished_deepslate'], ['Field B', 'deepslate_tiles'], ['Rose', 'smooth_quartz'], ['North point', 'red_concrete'], ['Centre', 'gold_block'], ['Marker lights', 'sea_lantern'], ['Border', 'polished_blackstone']],
    concept: 'A long tapering compass rose runs the length of the hall, north tip in red. A ring of gold and eight sea lanterns circles the centre and gives a soft glow at night.',
    steps: ['Build the border (blackstone, quartz, blackstone).', 'Lay the field in 2x2 squares of polished deepslate and deepslate tiles.', 'Place the N-S point first (23 blocks each way, widest 7 at the centre), then the E-W points (14 blocks), then the four short diagonals.', 'Finish with the gold ring at radius 9 to 10 and swap the eight cells on the diagonals for sea lanterns.'],
    swap: 'Use smooth stone for the rose and cobbled deepslate for the field to cut cost.',
    fn(c) {
      const { d, a, b, r, mx, mz } = c;
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'smooth_quartz';
      if (r <= 2.2) return r <= 1 ? 'redstone_block' : 'gold_block';
      if (b <= 23 && a <= (23 - b) / 23 * 3.4) return c.uz < 0 ? 'red_concrete' : 'smooth_quartz';
      if (a <= 14 && b <= (14 - a) / 14 * 3) return 'smooth_quartz';
      const p = Math.abs(a - b) / Math.SQRT2, q = (a + b) / Math.SQRT2;
      if (q <= 12.5 && p <= (12.5 - q) / 12.5 * 2.2) return 'polished_andesite';
      if (r >= 9.2 && r <= 10.3) return ANG8(c, .7) ? 'sea_lantern' : 'gold_block';
      return (((mx >> 1) + (mz >> 1)) & 1) ? 'polished_deepslate' : 'deepslate_tiles';
    }
  },
  {
    n: 3, name: 'Desert Palace Mosaic', tag: 'Terracotta carpet runner with diamonds, sandstone lattice and a layered border',
    wallMat: 'smooth_sandstone', colMat: 'cut_sandstone', capMat: 'orange_terracotta',
    palette: [['Field', 'smooth_sandstone'], ['Lattice', 'cut_sandstone'], ['Orange', 'orange_terracotta'], ['Red', 'red_terracotta'], ['Yellow', 'yellow_terracotta'], ['White', 'white_terracotta'], ['Blue', 'blue_terracotta']],
    concept: 'A woven-rug look in baked colours. The runner repeats a red, yellow and white diamond every 8 blocks and ends in a round medallion at the centre. Diagonal lattice lines cross the sandstone on either side.',
    steps: ['Build the five-layer border: orange, yellow, red, white, blue terracotta.', 'Lay the sandstone field, then the diagonal lattice (every 8 blocks both ways) with orange where lines cross.', 'Place the runner: 13 wide, with an orange outer edge and a blue inner edge, then repeat the 9x8 diamond tile along it.', 'Finish with the central medallion, six blocks across rings.'],
    swap: 'Use smooth red sandstone and plain terracotta if you do not want the dyed variants.',
    fn(c) {
      const { d, a, r, mx, mz } = c;
      if (d <= 3) return ['orange_terracotta', 'yellow_terracotta', 'red_terracotta', 'white_terracotta'][d]; if (d === 4) return 'blue_terracotta';
      if (r <= 1.6) return 'blue_terracotta'; if (r <= 3.2) return 'yellow_terracotta'; if (r <= 4.8) return 'red_terracotta'; if (r <= 6.2) return 'white_terracotta'; if (r <= 7.2) return 'orange_terracotta';
      if (a <= 6) {
        if (a === 6) return 'orange_terracotta'; if (a === 5) return 'blue_terracotta';
        const t = a + Math.abs(mz % 8 - 3.5);
        return t <= 2.4 ? 'red_terracotta' : t <= 3.6 ? 'yellow_terracotta' : t <= 5.4 ? 'white_terracotta' : 'orange_terracotta';
      }
      const l1 = (mx + mz) % 8 === 0, l2 = (((mx - mz) % 8) + 8) % 8 === 0;
      return l1 && l2 ? 'orange_terracotta' : (l1 || l2) ? 'cut_sandstone' : 'smooth_sandstone';
    }
  },
  {
    n: 4, name: 'Cherry and Bamboo Tatami', tag: 'Woven bamboo mats, a cherry veranda and a red sun disc',
    wallMat: 'stripped_dark_oak_log', colMat: 'dark_oak_log', capMat: 'dark_oak_planks',
    palette: [['Mat A', 'bamboo_planks'], ['Mat B', 'bamboo_mosaic'], ['Veranda', 'cherry_planks'], ['Frame', 'dark_oak_planks'], ['Sun', 'red_concrete'], ['Disc', 'white_concrete']],
    concept: 'Quiet and warm. The mats are 4x2 and turn a quarter every module, the way tatami are laid, and a cherry veranda two blocks wide surrounds them. A red sun on white sits at the centre.',
    steps: ['Build the frame: dark oak, cherry, dark oak, then two more cherry rows.', 'Start the mats from the inner corner at x 6, z 6. Each 4x4 module holds two mats; turn every other module 90 degrees.', 'Alternate bamboo planks and bamboo mosaic mat by mat.', 'Add the centre disc last: red core, white ring, cherry ring, dark oak outline.'],
    swap: 'Birch planks and stripped birch work as the mats if bamboo is hard to get.',
    fn(c) {
      const { d, r, mx: x, mz: z } = c;
      if (d === 0 || d === 2 || d === 5) return 'dark_oak_planks'; if (d <= 4) return 'cherry_planks';
      if (r <= 2.2) return 'red_concrete'; if (r <= 4.4) return 'white_concrete'; if (r <= 5.4) return 'cherry_planks'; if (r <= 6.2) return 'dark_oak_planks';
      const bx = Math.floor((x - 6) / 4), bz = Math.floor((z - 6) / 4), o = (bx + bz) & 1, lx = ((x - 6) % 4 + 4) % 4, lz = ((z - 6) % 4 + 4) % 4;
      return (((o ? lx >> 1 : lz >> 1) + bx + bz) & 1) ? 'bamboo_mosaic' : 'bamboo_planks';
    }
  },
  {
    n: 5, name: 'Crimson Basilica', tag: 'Red nether brick nave, blackstone aisles and glowing shroomlight',
    wallMat: 'polished_blackstone_bricks', colMat: 'polished_blackstone', capMat: 'crimson_planks',
    palette: [['Nave', 'red_nether_bricks'], ['Aisles A', 'polished_blackstone_bricks'], ['Aisles B', 'nether_bricks'], ['Trim', 'crimson_planks'], ['Gilding', 'gilded_blackstone'], ['Light', 'shroomlight']],
    concept: 'A dark church floor with a seven-wide blood-red nave. Shroomlights are set flush into the nave edge every 8 blocks, and a gilded rose with a glowing eye marks the crossing.',
    steps: ['Lay the three-wide border (blackstone, crimson, blackstone).', 'Fill the aisles with 2x2 squares of blackstone bricks and nether bricks.', 'Run the nave 7 wide through the centre with a crimson trim on both edges and a nether-brick spine.', 'Set the shroomlights, then the gilded rose with a one-block shroomlight centre.'],
    swap: 'Replace gilded blackstone with polished blackstone and gold blocks only at the rose.',
    fn(c) {
      const { d, a, b, r, mx, mz } = c;
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'crimson_planks';
      if (r <= 1.2) return 'shroomlight'; if (r <= 2.6) return 'crimson_planks'; if (r <= 4.2) return 'gilded_blackstone'; if (r <= 5.2) return 'polished_blackstone';
      if (a <= 3) { if (a === 3) return 'crimson_planks'; if (a === 2 && Math.floor(b) % 8 === 4) return 'shroomlight'; return a === 0 ? 'nether_bricks' : 'red_nether_bricks'; }
      if (a === 14 || a === 15) return 'crimson_planks';
      return (((mx >> 1) + (mz >> 1)) & 1) ? 'polished_blackstone_bricks' : 'nether_bricks';
    }
  },
  {
    n: 6, name: 'Manor Parquet', tag: 'Dark oak and spruce basketweave with a red carpet runner',
    wallMat: 'spruce_planks', colMat: 'stripped_dark_oak_log', capMat: 'dark_oak_planks',
    palette: [['Strip A', 'dark_oak_planks'], ['Strip B', 'spruce_planks'], ['Frame', 'birch_planks'], ['Inner frame', 'stripped_dark_oak_log'], ['Carpet', 'red_carpet'], ['Carpet edge', 'yellow_carpet']],
    concept: 'A study or ballroom floor. Strips of dark oak and spruce run in blocks of four, turning 90 degrees on every square, with a birch frame and a carpet runner that opens into a round rug.',
    steps: ['Lay the frame: dark oak, birch, stripped dark oak.', 'Fill the field in 4x4 squares. In each square run the planks along x or z, alternating by square, and alternate the two woods strip by strip.', 'Add the 5-wide red carpet runner with yellow carpet edges, then the round rug in the middle.'],
    swap: 'Use oak and birch planks for a lighter hall; the pattern stays the same.',
    fn(c) {
      const { d, a, r, mx: x, mz: z } = c;
      if (d === 0) return 'dark_oak_planks'; if (d === 1) return 'birch_planks'; if (d === 2) return 'stripped_dark_oak_log';
      if (r <= 2.2) return 'red_carpet'; if (r <= 3.4) return 'yellow_carpet'; if (r <= 5) return 'birch_planks'; if (r <= 6) return 'dark_oak_planks';
      if (a <= 2) return 'red_carpet'; if (a === 3) return 'yellow_carpet';
      const p = ((x >> 2) + (z >> 2)) & 1, s = p ? (z & 3) : (x & 3);
      return (s & 1) ? 'spruce_planks' : 'dark_oak_planks';
    }
  },
  {
    n: 7, name: 'Overgrown Ruins', tag: 'Cracked stone brick with moss, grass patches and two shallow ponds',
    wallMat: 'mossy_stone_bricks', colMat: 'mossy_stone_bricks', capMat: 'moss_block',
    palette: [['Floor', 'stone_bricks'], ['Cracked', 'cracked_stone_bricks'], ['Mossy', 'mossy_stone_bricks'], ['Rubble', 'cobblestone'], ['Moss', 'moss_block'], ['Grass', 'grass_block'], ['Water', 'water']],
    concept: 'A temple that nature has taken back. The border is intact, the middle is broken up with noise-driven moss, rubble, dirt and grass, a stone path survives down the centre, and two ponds sit where the roof fell in.',
    steps: ['Lay the whole floor in stone bricks first, with an intact 3-wide border.', 'Scatter mossy, cracked and cobblestone blocks by eye in drifts of 3 to 6, thinner toward the middle path.', 'Dig the two ponds one block down, rim with moss, then fill with water and place lily pads.', 'Patch grass and dirt in the loose areas and add moss carpet if you want it overgrown.'],
    swap: 'Everything here is cheap. For more weathering, add vines and moss carpet on top.',
    fn(c) {
      const { d, a, mx: x, z } = c;
      if (d <= 1) return 'stone_bricks'; if (d === 2) return 'polished_andesite';
      const e1 = ((x - 9) / 5) ** 2 + ((z - 14) / 3.5) ** 2, e2 = ((x - 26) / 4.5) ** 2 + ((z - 43) / 3) ** 2;
      if (e1 <= 1 || e2 <= 1) return 'water'; if (e1 <= 1.5 || e2 <= 1.5) return 'moss_block';
      const n = vn(x / 5, z / 5, 1), n2 = vn(x / 2.2, z / 2.2, 7), rr = h2(x, z, 3);
      if (a <= 1 && n < .75) return rr < .1 ? 'cracked_stone_bricks' : 'stone_bricks';
      if (n > .66) return n2 > .55 ? 'grass_block' : rr < .6 ? 'moss_block' : 'dirt';
      if (n > .5) return rr < .5 ? 'mossy_stone_bricks' : rr < .8 ? 'cobblestone' : 'moss_block';
      return rr < .14 ? 'cracked_stone_bricks' : rr < .24 ? 'mossy_stone_bricks' : 'stone_bricks';
    }
  },
  {
    n: 8, name: 'Prismarine Tide', tag: 'Rolling prismarine waves, sea lantern studs and a gold heart',
    wallMat: 'prismarine_bricks', colMat: 'dark_prismarine', capMat: 'sea_lantern',
    palette: [['Wave A', 'prismarine'], ['Wave B', 'prismarine_bricks'], ['Wave C', 'dark_prismarine'], ['Lights', 'sea_lantern'], ['Heart', 'gold_block'], ['Spray', 'light_blue_concrete']],
    concept: 'A seabed. Bands of prismarine roll across the hall in a sine curve, light-blue flecks scatter like spray, and sea lanterns are set into the border every fourth block. A gold block sits in the middle of a lantern ring.',
    steps: ['Lay the dark prismarine border with sea lanterns in the third row, every 4 blocks.', 'Draw the wave bands: each band is 2 to 3 blocks wide and follows z = k + 3 sin(0.5 * distance from the centre line).', 'Dot in light blue concrete randomly, roughly 3 in every 100 blocks.', 'Build the lantern ring and gold heart at the centre.'],
    swap: 'Swap sea lanterns for glowstone if the ocean theme is not needed.',
    fn(c) {
      const { d, a, r, x, z, mz } = c;
      if (d === 0) return 'dark_prismarine'; if (d === 1) return 'prismarine_bricks'; if (d === 2) return (c.mx + c.mz) % 4 === 0 ? 'sea_lantern' : 'dark_prismarine';
      if (r <= 1.3) return 'gold_block'; if (r <= 2.6) return 'sea_lantern'; if (r <= 4.2) return 'dark_prismarine'; if (r <= 5.2) return 'prismarine_bricks';
      if (h2(c.mx, z, 5) < .03) return 'light_blue_concrete';
      const v = mz + 3.2 * Math.sin(a * .5), i = ((Math.floor(v / 2.5) % 4) + 4) % 4;
      return ['prismarine', 'prismarine_bricks', 'dark_prismarine', 'prismarine_bricks'][i];
    }
  },
  {
    n: 9, name: 'Purpur End Cathedral', tag: 'End stone and purpur grid, obsidian starfield and amethyst corners',
    wallMat: 'purpur_block', colMat: 'purpur_pillar', capMat: 'amethyst_block',
    palette: [['Field', 'end_stone_bricks'], ['Grid', 'purpur_block'], ['Crossings', 'purpur_pillar'], ['Void', 'obsidian'], ['Rim', 'crying_obsidian'], ['Crystal', 'amethyst_block'], ['Lights', 'sea_lantern']],
    concept: 'Cold and ceremonial. A purpur grid cuts the pale end-stone field into 6x6 panels. In the middle is a round obsidian disc ringed with crying obsidian and eight lanterns around an amethyst heart, and each corner holds a small amethyst shrine.',
    steps: ['Build the border: obsidian, purpur pillar, crying obsidian, then a purpur strip.', 'Lay the end stone brick field and cut the purpur grid every 6 blocks from the centre lines, with pillars at every crossing.', 'Add the four 5x5 corner shrines: pillar frame, obsidian floor, amethyst in the middle.', 'Build the central disc: obsidian, a crying obsidian rim at radius 8, and the lantern ring at radius 6 to 7.'],
    swap: 'Crying obsidian is only used in two rings; plain obsidian is fine if you are short.',
    fn(c) {
      const { d, a, b, r } = c, cx = Math.min(c.x, GW - 1 - c.x), cz = Math.min(c.z, GD - 1 - c.z);
      if (d === 0) return 'obsidian'; if (d === 1) return 'purpur_pillar'; if (d === 2) return 'crying_obsidian'; if (d === 3) return 'purpur_block';
      if (cx >= 5 && cx <= 9 && cz >= 5 && cz <= 9) return (cx === 7 && cz === 7) ? 'amethyst_block' : (cx === 5 || cx === 9 || cz === 5 || cz === 9) ? 'purpur_pillar' : 'obsidian';
      if (r <= 2.2) return 'amethyst_block';
      if (r <= 9) { if (r >= 8.2) return 'crying_obsidian'; if (r >= 6 && r <= 7.2) return ANG8(c, .75) ? 'sea_lantern' : 'amethyst_block'; return 'obsidian'; }
      const ia = a, ib = Math.floor(b);
      if (ia % 6 === 0 && ib % 6 === 0) return 'purpur_pillar';
      return (ia % 6 === 0 || ib % 6 === 0) ? 'purpur_block' : 'end_stone_bricks';
    }
  },
  {
    n: 10, name: 'Copper Patina Gradient', tag: 'Copper that weathers from bright to teal along the length of the hall',
    wallMat: 'cut_copper', colMat: 'copper_block', capMat: 'copper_bulb',
    palette: [['Stage 1', 'cut_copper'], ['Stage 2', 'exposed_cut_copper'], ['Stage 3', 'weathered_cut_copper'], ['Stage 4', 'oxidized_cut_copper'], ['Grate lines', 'copper_grate'], ['Lights', 'copper_bulb'], ['Border', 'polished_deepslate']],
    concept: 'One continuous oxidation gradient, fresh at the north door and fully teal at the south. Noise breaks the transitions so there is no hard line, copper grates run lengthwise every 6 blocks, and lit copper bulbs are set flush into the floor as a grid. A deepslate gear-ring marks the centre.',
    steps: ['Lay a deepslate and copper border.', 'Lay the four copper stages along z: roughly 0 to 14, 14 to 28, 28 to 43 and 43 to 57. Randomise the first 3 to 5 blocks of each transition.', 'Set a copper grate line at every 6th block from the centre line, and a lit bulb at every 8th block along z where lines cross.', 'Finish with the central gear: deepslate disc, iron ring, bulb in the middle.'],
    swap: 'Use waxed copper so the stages stay put. Unwaxed copper will keep weathering on its own over time.',
    fn(c) {
      const { d, a, b, r, mx: x, z } = c;
      if (d === 0) return 'polished_deepslate'; if (d === 1) return 'copper_block';
      if (r <= 1.5) return 'copper_bulb'; if (r <= 4.2) return 'polished_deepslate'; if (r <= 5.2) return 'iron_block';
      if (a % 6 === 3) return 'copper_grate';
      if (a % 6 === 0 && Math.floor(b) % 8 === 4) return 'copper_bulb';
      const v = z + (vn(x / 3, z / 3, 9) - .5) * 10;
      return v < 14 ? 'cut_copper' : v < 28 ? 'exposed_cut_copper' : v < 43 ? 'weathered_cut_copper' : 'oxidized_cut_copper';
    }
  }
];
