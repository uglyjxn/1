'use strict';
/* ============================================================
   Set 3: Victorian (21-25) and 1920s Art Deco (26-30). Same 35 x 58 hall.
   ============================================================ */
const WEDGE = (c, n) => { const t = Math.atan2(c.uz, c.ux); return Math.floor(((t + Math.PI) / (2 * Math.PI)) * n); };

DESIGNS.push(
  {
    n: 21, group: 3, name: 'Encaustic Tile Hall', tag: 'A Victorian hallway floor of 8x8 star tiles in red, buff, blue and black',
    wallMat: 'bricks', colMat: 'stone_bricks', capMat: 'quartz_block',
    palette: [['Star centre', 'red_terracotta'], ['Buff', 'white_terracotta'], ['Blue', 'blue_terracotta'], ['Yellow', 'yellow_terracotta'], ['Black', 'polished_blackstone'], ['Border', 'polished_blackstone']],
    concept: 'The tiled passage of a Victorian terraced house or town hall, only larger. Each 8x8 tile is a diamond built from five bands (red centre, buff, blue, yellow, then black corners) so that four tiles meeting at a corner make a black lozenge. Six lines of border run round the hall in black, buff, red, buff, blue and buff.',
    steps: ['Lay the six-line border from the wall inwards: polished blackstone, buff, red, buff, blue, buff.', 'Start the tiles at the inner corner (x 6, z 6). Each 8x8 tile is a diamond: 2x2 red in the middle, then rings of buff, blue and yellow, with black in the four corners.', 'Run the tiles to the centre line and mirror them. A cut tile on the centre line is normal in old halls.'],
    swap: 'Plain terracotta and black concrete cost less than the dyed terracotta and blackstone.',
    fn(c) {
      const { d, mx, mz } = c;
      if (d <= 5) return ['polished_blackstone', 'white_terracotta', 'red_terracotta', 'white_terracotta', 'blue_terracotta', 'white_terracotta'][d];
      const u = Math.abs(((mx - 6) % 8) - 3.5), v = Math.abs(((mz - 6) % 8) - 3.5), t = u + v;
      return t <= 1.2 ? 'red_terracotta' : t <= 2.2 ? 'white_terracotta' : t <= 3.2 ? 'blue_terracotta' : t <= 4.2 ? 'yellow_terracotta' : 'polished_blackstone';
    }
  },
  {
    n: 22, group: 3, name: 'Harlequin Hallway', tag: 'Black and white marble diamonds inside red and blue bands, with a tiled rosette',
    wallMat: 'smooth_quartz', colMat: 'quartz_pillar', capMat: 'polished_blackstone',
    palette: [['White', 'smooth_quartz'], ['Black', 'polished_blackstone'], ['Red', 'red_terracotta'], ['Blue', 'blue_terracotta'], ['Rosette', 'yellow_terracotta'], ['Pale', 'calcite']],
    concept: 'The classic Victorian entrance hall: a harlequin of black and white diamonds laid on the diagonal inside a band of red, then blue, with a slim black keyline. In the middle a tiled rosette of five rings breaks up the diamonds.',
    steps: ['Lay the border: black, white, red, red, white, blue, white, black (8 lines).', 'Fill the field with diamonds laid at 45 degrees, each 4 blocks along its side, alternating white and black.', 'Cut the rosette last: red core, yellow, white, blue, black ring, from the middle outward.'],
    swap: 'White concrete and black concrete are the cheapest way to get the same contrast.',
    fn(c) {
      const { d, r, x, z } = c;
      if (d <= 7) return ['polished_blackstone', 'smooth_quartz', 'red_terracotta', 'red_terracotta', 'smooth_quartz', 'blue_terracotta', 'smooth_quartz', 'polished_blackstone'][d];
      if (r <= 1.6) return 'red_terracotta'; if (r <= 3) return 'yellow_terracotta'; if (r <= 4.4) return 'smooth_quartz'; if (r <= 5.8) return 'blue_terracotta'; if (r <= 6.8) return 'polished_blackstone';
      return ((Math.floor((x + z) / 4) + Math.floor((x - z + 60) / 4)) & 1) ? 'smooth_quartz' : 'polished_blackstone';
    }
  },
  {
    n: 23, group: 3, name: 'Octagon and Dot Conservatory', tag: 'Octagonal tiles in buff and red with small black squares at every junction',
    wallMat: 'stone_bricks', colMat: 'stone_bricks', capMat: 'white_terracotta',
    palette: [['Octagon A', 'white_terracotta'], ['Octagon B', 'red_terracotta'], ['Dot', 'polished_blackstone'], ['Medallion', 'blue_terracotta'], ['Border', 'polished_blackstone']],
    concept: 'The most common Victorian floor in the real world, seen in conservatories, porches and corridors. Six-block octagons with the corners clipped, in buff and red like a checker, with a small black square wherever four corners meet.',
    steps: ['Build the border: black, buff, red, buff.', 'Start at the inner corner (x 4, z 4). Each tile is 6x6 with a single block clipped off each corner.', 'Alternate buff and red tiles in a checker.', 'Fill the clipped corners with black: four corners of four tiles make a 2x2 black dot.', 'Finish the medallion over the middle.'],
    swap: 'Sandstone for buff and bricks for red look the same from a distance.',
    fn(c) {
      const { d, r, mx, mz } = c;
      if (d <= 3) return ['polished_blackstone', 'white_terracotta', 'red_terracotta', 'white_terracotta'][d];
      if (r <= 2.2) return 'blue_terracotta'; if (r <= 3.2) return 'polished_blackstone';
      const lx = (mx - 4) % 6, lz = (mz - 4) % 6;
      if ((lx === 0 || lx === 5) && (lz === 0 || lz === 5)) return 'polished_blackstone';
      return (Math.floor((mx - 4) / 6) + Math.floor((mz - 4) / 6)) & 1 ? 'red_terracotta' : 'white_terracotta';
    }
  },
  {
    n: 24, group: 3, name: 'Tumbling Blocks Hall', tag: 'The cube illusion pattern in white, grey and black marble',
    wallMat: 'polished_andesite', colMat: 'polished_blackstone', capMat: 'smooth_quartz',
    palette: [['Top face', 'smooth_quartz'], ['Left face', 'polished_andesite'], ['Right face', 'polished_blackstone'], ['Border', 'polished_blackstone']],
    concept: 'A Victorian optical trick known as tumbling blocks. Each hexagon is split into three diamonds, one white, one grey and one black, so the whole floor reads as a stack of cubes. It is laid in three tones of the same stone family.',
    steps: ['Lay the border: black, white, black.', 'Mark the hexagon grid. Each hexagon is 8 blocks across, rows are 7 blocks apart, every second row is shifted 4 blocks.', 'Split each hexagon from the centre into three equal diamonds: the upper-left diamond is white, the bottom one is grey, the upper-right one is black.', 'Keep every diamond a single block type. The edge of one cube becomes the edge of the next.'],
    swap: 'White concrete, light gray concrete and black concrete give a stronger, flatter version.',
    fn(c) {
      const { d, x, z } = c;
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'smooth_quartz';
      const v = hexv(x + .5, z + .5, 8, 7), t = Math.atan2(v.oz, v.ox);
      const k = Math.floor(((t + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / 3));
      return ['smooth_quartz', 'polished_andesite', 'polished_blackstone'][k];
    }
  },
  {
    n: 25, group: 3, name: 'Versailles Parquet Study', tag: 'Oak and spruce panels framed in dark oak, with a carpet rosette',
    wallMat: 'spruce_planks', colMat: 'stripped_dark_oak_log', capMat: 'dark_oak_planks',
    palette: [['Panel A', 'oak_planks'], ['Panel B', 'spruce_planks'], ['Frame', 'dark_oak_planks'], ['Outer frame', 'stripped_dark_oak_log'], ['Banding', 'birch_planks'], ['Rosette', 'red_carpet']],
    concept: 'Parquet de Versailles, the panelled floor of Victorian libraries, billiard rooms and club houses. Each 6x6 panel is framed in dark oak and filled with diagonal strips, and the strips turn 90 degrees in every second panel. A birch band and a dark oak band wrap the whole floor, and a red carpet rosette sits in the middle.',
    steps: ['Build the outer banding: dark oak, birch, stripped dark oak.', 'Lay a grid of dark oak lines every 6 blocks, starting from x 3, z 3.', 'In each panel run diagonal strips of oak and spruce planks. Turn the diagonal 90 degrees in every second panel.', 'Add the rosette: birch disc, dark oak ring, red carpet core.'],
    swap: 'Oak and birch panels with spruce frames make a lighter drawing room.',
    fn(c) {
      const { d, r, mx, mz } = c;
      if (d === 0) return 'dark_oak_planks'; if (d === 1) return 'birch_planks'; if (d === 2) return 'stripped_dark_oak_log';
      if (r <= 2.2) return 'red_carpet'; if (r <= 3.8) return 'birch_planks'; if (r <= 4.8) return 'dark_oak_planks';
      const lx = (mx - 3) % 6, lz = (mz - 3) % 6;
      if (lx === 0 || lz === 0) return 'dark_oak_planks';
      const par = (Math.floor((mx - 3) / 6) + Math.floor((mz - 3) / 6)) & 1;
      return ((par ? lx + lz : lx - lz + 6) >> 1) & 1 ? 'spruce_planks' : 'oak_planks';
    }
  },
  {
    n: 26, group: 3, name: 'Art Deco Sunburst', tag: 'Two gold and black sunbursts on white marble, framed in black and gold',
    wallMat: 'polished_blackstone', colMat: 'polished_blackstone', capMat: 'gold_block',
    palette: [['Ray A', 'gold_block'], ['Ray B', 'polished_blackstone'], ['Rim', 'smooth_quartz'], ['Field', 'calcite'], ['Hub', 'polished_blackstone'], ['Border', 'gold_block']],
    concept: 'The emblem of the 1920s. Two sunbursts, each 21 blocks across, fan out in alternating gold and black rays with a white rim and a black hub. They sit on a white marble field inside a black and gold border, one in the north half and one in the south, with a nested gold, black and white lozenge in the gap between them.',
    steps: ['Lay the border: black, gold, black, white.', 'Fill the field with calcite.', 'Mark the two centres at (x 17, z 14) and (x 17, z 43). Each sunburst is a circle 10 blocks in radius.', 'Build the lozenge at the centre: it is 18 blocks wide and 9 long, with a gold core, a black ring, a gold line, a white ring and a black outline.', 'Divide each circle into 24 equal rays of 15 degrees, alternating gold and black, with a black hub of 3 blocks radius and a white rim on the outer 1.5 blocks.'],
    swap: 'Yellow concrete in place of gold blocks saves a lot of gold.',
    fn(c) {
      const { d, ux } = c;
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'gold_block'; if (d === 3) return 'smooth_quartz';
      for (const cz of [14.5, 43.5]) {
        const dz = c.z + .5 - cz, r = Math.hypot(ux, dz);
        if (r <= 10) {
          if (r <= 3) return 'polished_blackstone'; if (r >= 8.6) return 'smooth_quartz';
          const w = Math.floor(((Math.atan2(dz, ux) + Math.PI) / (Math.PI * 2)) * 24);
          return w & 1 ? 'polished_blackstone' : 'gold_block';
        }
      }
      const lz = c.uz, q = Math.abs(ux) / 9 + Math.abs(lz) / 4.5;
      if (q <= .22) return 'gold_block'; if (q <= .5) return 'polished_blackstone'; if (q <= .62) return 'gold_block'; if (q <= .78) return 'smooth_quartz'; if (q <= .9) return 'polished_blackstone';
      return 'calcite';
    }
  },
  {
    n: 27, group: 3, name: 'Chevron Foyer', tag: 'Black, white and gold chevrons running the length of the hall',
    wallMat: 'smooth_quartz', colMat: 'polished_blackstone', capMat: 'gold_block',
    palette: [['White band', 'smooth_quartz'], ['Black band', 'polished_blackstone'], ['Gold line', 'gold_block'], ['Border', 'polished_blackstone']],
    concept: 'A strongly directional Art Deco floor. Chevrons point north like arrows, each made of a 3-block black band, a gold line, a 3-block white band and another gold line, repeating every 8 blocks. A narrow black and gold border holds the pattern in.',
    steps: ['Lay the three-line border: black, gold, black.', 'Draw the chevrons from the middle: the point is at x 17, and each arm slopes at one block along for every block back.', 'Make each stripe 3 blocks wide in black or white, with a gold line between every stripe.', 'Keep the chevron lines continuous across the centre line.'],
    swap: 'Black concrete, white concrete and yellow concrete give the same pattern at lower cost.',
    fn(c) {
      const { d, a, uz } = c;
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'gold_block';
      const t = Math.floor(uz + a + 100), m = ((t % 8) + 8) % 8;
      return m < 3 ? 'polished_blackstone' : m === 3 || m === 7 ? 'gold_block' : 'smooth_quartz';
    }
  },
  {
    n: 28, group: 3, name: 'Stepped Ziggurat Lobby', tag: 'Concentric stepped rectangles in black, gold, white and jade',
    wallMat: 'polished_blackstone', colMat: 'polished_andesite', capMat: 'gold_block',
    palette: [['Black', 'polished_blackstone'], ['Gold', 'gold_block'], ['White', 'smooth_quartz'], ['Jade', 'dark_prismarine'], ['Centre', 'polished_andesite']],
    concept: 'Taken from the stepped silhouettes of 1920s skyscrapers. Rectangles nest inside each other, each with clipped corners so the edges step in toward the centre. The bands go black, gold, white, black, jade, white, gold, black, then a grey field in the middle with a gold star.',
    steps: ['Lay the bands from the wall inward: black 2, gold 1, white 2, black 1, jade 2, white 2, gold 1, black 2.', 'At each corner clip the band by a step: cells within a few blocks of the corner take the colour of the next band out. This makes the stepped, chamfered look.', 'Fill the centre with polished andesite and lay a gold eight-point star over the middle.'],
    swap: 'Prismarine or green concrete work instead of dark prismarine for the jade band.',
    fn(c) {
      const { d, r, mx, mz } = c;
      const e = Math.min(d, Math.floor((mx + mz) * .5));
      const bands = [[2, 'polished_blackstone'], [3, 'gold_block'], [5, 'smooth_quartz'], [6, 'polished_blackstone'], [8, 'dark_prismarine'], [10, 'smooth_quartz'], [11, 'gold_block'], [13, 'polished_blackstone']];
      if (r <= 8.5) { const t = Math.atan2(c.uz, c.ux), s = 3.2 + 5.3 * Math.pow(Math.abs(Math.cos(t * 4)), 3); if (r <= s) return r <= 1.6 ? 'polished_blackstone' : 'gold_block'; }
      for (const [lim, m] of bands) if (e < lim) return m;
      return 'polished_andesite';
    }
  },
  {
    n: 29, group: 3, name: 'Gatsby Scallop Ballroom', tag: 'Overlapping gold, black and white scallops, like a Jazz Age ballroom',
    wallMat: 'smooth_quartz', colMat: 'quartz_pillar', capMat: 'gold_block',
    palette: [['Gold eye', 'gold_block'], ['Black', 'polished_blackstone'], ['White', 'smooth_quartz'], ['Grey', 'polished_andesite'], ['Border', 'polished_blackstone']],
    concept: 'Fish-scale and fan motifs were everywhere in the 1920s. Here circles of five rings sit on a diagonal lattice 12 blocks apart. They overlap at the edges and form the scalloped pattern between them. The rings step from a gold eye through black, white and black to grey.',
    steps: ['Lay the border: black, gold, black, white.', 'Mark circle centres at x 17 and every 12 blocks, z 28.5 and every 12 blocks, and a second set offset by 6 blocks both ways.', 'For each cell, find the nearest centre and use its distance: under 1, gold; under 2, black; under 3, white; under 4, black; beyond, grey.'],
    swap: 'You can skip the grey ring and let white run to the edge for a simpler three-colour pattern.',
    fn(c) {
      const { d, ux, uz } = c;
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'gold_block'; if (d === 3) return 'smooth_quartz';
      const q = (v, o) => { const w = v - o; return w - 12 * Math.round(w / 12); };
      const d1 = Math.hypot(q(ux, 0), q(uz, 0)), d2 = Math.hypot(q(ux, 6), q(uz, 6)), k = Math.min(d1, d2);
      return k < 1.1 ? 'gold_block' : k < 2.1 ? 'polished_blackstone' : k < 3.1 ? 'smooth_quartz' : k < 4.1 ? 'polished_blackstone' : 'polished_andesite';
    }
  },
  {
    n: 30, group: 3, name: 'Jade and Gold Lobby', tag: 'Dark prismarine and green terracotta slabs with gold joints and an eight-point star',
    wallMat: 'dark_prismarine', colMat: 'polished_blackstone', capMat: 'gold_block',
    palette: [['Slab A', 'dark_prismarine'], ['Slab B', 'green_terracotta'], ['Joints', 'gold_block'], ['Star', 'smooth_quartz'], ['Star heart', 'polished_blackstone'], ['Border', 'polished_blackstone']],
    concept: 'A skyscraper lobby floor: big slabs of dark green stone with a 1-block gold line between them, like the lobbies of 1930 New York. A white eight-pointed star with a black heart is set in the middle, and a black border with a gold line runs round the edge.',
    steps: ['Lay the border: black, gold, black.', 'Divide the field into 6x6 squares, counted from x 3, z 3, with a gold joint on every 6th line.', 'Fill the squares in a checker of dark prismarine and green terracotta.', 'Cut the star at the centre: eight points, 9 blocks from the centre to a tip, alternating long points and short points, in smooth quartz with a black heart.'],
    swap: 'Green concrete and dark prismarine give a darker lobby; use quartz blocks in place of the star if you want it simpler.',
    fn(c) {
      const { d, r, mx, mz, uz, ux } = c;
      if (d === 0 || d === 2) return 'polished_blackstone'; if (d === 1) return 'gold_block';
      const t = Math.atan2(uz, ux), s = 2.6 + 6.4 * Math.pow(Math.abs(Math.cos(t * 4)), 3);
      if (r <= s) return r <= 1.8 ? 'polished_blackstone' : 'smooth_quartz';
      if ((mx - 3) % 6 === 5 || (mz - 3) % 6 === 5) return 'gold_block';
      return (Math.floor((mx - 3) / 6) + Math.floor((mz - 3) / 6)) & 1 ? 'green_terracotta' : 'dark_prismarine';
    }
  }
);
