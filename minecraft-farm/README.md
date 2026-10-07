# Mob Spawner Farm

Four-spawner farm for Minecraft Java 26.2 with a manual kill room and automatic loot collection. Open `index.html`.

- Spawn chambers: four 9x9 octagonal rooms (N, E, S, W), spawner hanging on a stalactite, water floor, 3x3 drop shaft.
- Transport: 3-wide, 2-high water channels (fits zombie 0.6x1.95, spider 1.4x0.9, cave spider 0.7x0.5).
- Kill room: pit under a booth. You stand on a pedestal over a 3x3 hatch and hit down; mobs cannot reach you.
- Loot: 3x3 hopper floor under the pit feeds a large chest.

The page shows a 3D view with height and cut controls, a layer-by-layer plan, cross-sections, a mob clearance check, build order and material list, all generated from one voxel model in `src/model.js`.

`node build.mjs` rebuilds `index.html` from `src/`. Not tested in the game.
