# The New Burridge Goof-Proof Color Wheel

Electron desktop simulation of the printed poster: ten hue wedges, the black hub with the spinning diamond
(1 dominant, 2 focal point, 3 and 4 spice), the four "bright and clean" sections with the "cross the line" arrows,
the six paint sketches, and the full printed text.

```
npm install
npm start
```

- Click a wedge or a sketch, or drag the diamond, to choose the dominant color; focal and spice colors follow.
  The rule reproduces all six printed examples.

## Where the numbers come from
Everything was measured from a scan of the printed wheel, not eyeballed:
- `palette.js`: wedge colors sampled pixel by pixel.
- `app.js`: each of the ten wedge outlines was fitted separately to the scan at sub-pixel precision (the printed wedges
  deviate from a perfect 36-degree grid by up to about 1 degree), plus the hub (radius 147 px, about 3 px off the wheel's
  axis, as printed), the kite-shaped diamond and the outer ring (radius 363.6 px). Rendering the app at the scan's scale
  and comparing wedge pixels gives 1.8% rms error (of full scale); the scan's wedge fills are perfectly flat, so the colors are exact.
- `assets/`: logo, sketch thumbnails, ring logo and barcode cropped from the scan.
- `fonts/`: Jost (OFL), a Futura-style face standing in for the print's Futura, and PT Sans Narrow standing in for the body font.

## Known differences
- Fonts are look-alikes, not the printer's Futura / Myriad.
