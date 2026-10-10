# Burridge Goof-Proof Color Wheel

Electron desktop simulation of the New Burridge Goof-Proof Color Wheel: ten hue wedges, the black hub with the
spinning diamond (1 dominant, 2 focal point, 3 and 4 spice), and the "bright and clean" vs. "cross the line" mixing sections.

```
cd burridge-color-wheel
npm install
npm start
```

- Click a wedge or drag the diamond to choose the dominant color; focal and spice colors follow.
- Shift-click a wedge to pick a mix partner; the mixer says whether the mix stays bright or crosses the line.
- Wedge colors are in `palette.js`, sampled from a scan of the printed wheel.
