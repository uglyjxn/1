# Hall Floor Designs

Twenty floor designs for one big Minecraft hall (ten decorative, ten realistic stone), each 35 blocks wide (west-east) by 58 blocks long (north-south), 2,030 surface blocks.

Open `index.html` in a browser. For each design it shows a textured top-down plan (with grid and centre axes), an isometric in-game view (walls, columns, night lighting), the block palette with `minecraft:` ids, a build guide and a computed material list.

Set 1: Royal Checkerboard, Deepslate Compass Rose, Desert Palace Mosaic, Cherry and Bamboo Tatami, Crimson Basilica, Manor Parquet, Overgrown Ruins, Prismarine Tide, Purpur End Cathedral, Copper Patina Gradient.

Set 2 (realistic stone): Chartres Labyrinth, Roman Marble Sectile, Irregular Flagstone Plaza, Cobblestone Fan Setts, Terrazzo and Brass, Castle Great Hall, Museum Limestone and Basalt, Cavern Floor, Pompeii Black and White, Basalt Column Hexagons.

Each floor is generated from a small function in `src/floors.js`, so the plan, thumbnails and block counts always match. The hall centre is x 17, between z 28 and 29.

- `src/engine.js` block dictionary, 16x16 procedural textures, renderers
- `src/floors.js`, `src/floors2.js` the two sets of ten designs (palette, copy, pattern function)
- `src/ui.js`, `src/template.html` page
- `node build.mjs` rebuilds `index.html`
