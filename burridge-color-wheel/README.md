# The New Burridge Goof-Proof Color Wheel

Electron desktop simulation of the printed wheel: ten hue wedges, black hub with the spinning diamond
(1 dominant, 2 focal point, 3 and 4 spice), the four "bright and clean" sections with the "cross the line" arrows,
and the six paint-sketch examples.

```
npm install
npm start
```

- Click a wedge, a sketch, or drag the diamond to choose the dominant color; focal and spice colors follow
  (rule verified against all six printed examples).
- Shift-click a wedge to pick a mix partner; the mixer says whether the mix stays bright or crosses the line.
- Colors are in `palette.js`, sampled pixel by pixel from a scan of the wheel. Geometry constants at the top of
  `app.js` were measured from the same scan. `assets/` holds the logo and sketch thumbnails cropped from it.
