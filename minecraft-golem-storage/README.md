# Copper golem storage room (40 x 34 x 15)

Technical design only: five levels of 1-wide aisles, 3-high chest stacks on both sides, sealed pods
(9 sorting chests + 1 copper input + 4 barrels + 1 waxed golem), ladders and sea lanterns.

- Build: `node build.mjs [dir]` writes `index.html` and an artifact fragment into `dir`.
- Source: `src/engine.js` (voxel renderer), `src/model.js` (the room), `src/ui.js`, `src/template.html`.
- Golem rules come from web search summaries (wiki not directly reachable) and are marked Agreed / Uncertain on the page.
  Test one pod in game before building all 385.
