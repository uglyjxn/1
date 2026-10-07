# Mob Spawner Farm

Three-spawner farm for Minecraft Java 26.2 with a manual kill gallery and one shared loot chest. Open `index.html`.

- Spawn chambers: three 9x9 octagonal rooms (N, W, E), spawner hanging on a stalactite, water floor, 3x3 drop shaft.
- Transport: 3-wide, 2-high water channels (fits zombie 0.6x1.95, spider 1.4x0.9, cave spider 0.7x0.5). Water stops at the pen; mobs step up out of it.
- Pen + gallery: a dry carpeted pen, a 1-wide trench, a low cobblestone wall, and the cell you stand in 2.5 blocks from the pen edge. Mobs cannot reach you; you hit them over the wall.
- Loot: hopper rows in the pen and the trench feed one large chest.

The page has a 3D view with height and cut controls, a layer-by-layer plan, cross-sections, a mob clearance and reach check, build order and material list, all generated from one voxel model in `src/model.js`.

`node build.mjs` rebuilds `index.html` from `src/`. Not tested in the game: see the notes on the page.
