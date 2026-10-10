// The ten wedges of the New Burridge Goof-Proof Color Wheel, clockwise from
// the top. Hex values were sampled pixel-by-pixel from a scan of the printed wheel.
window.PALETTE = [
  { name: 'Red',          hex: '#ED1B3B' },
  { name: 'Red-Yellow',   hex: '#FBA71B' },
  { name: 'Yellow',       hex: '#FFE801' },
  { name: 'Green-Yellow', hex: '#4DB849' },
  { name: 'Green',        hex: '#009A63' },
  { name: 'Blue-Green',   hex: '#0092AB' },
  { name: 'Blue',         hex: '#0178BB' },
  { name: 'Purple-Blue',  hex: '#005DA4' },
  { name: 'Purple',       hex: '#5C2E92' },
  { name: 'Purple-Red',   hex: '#C7168D' }
];
window.WHEEL_COLORS = { disc: '#241F1F', header: '#58585B', red: '#ED1B3B' };
// The six paint sketches printed under the wheel: dominant, focal point, spice, spice.
window.EXAMPLES = [
  ['Purple', 'Green-Yellow', 'Red-Yellow', 'Blue-Green'],
  ['Green-Yellow', 'Purple', 'Red', 'Blue'],
  ['Purple-Blue', 'Yellow', 'Red', 'Green'],
  ['Green', 'Purple-Red', 'Red-Yellow', 'Purple-Blue'],
  ['Red', 'Blue-Green', 'Green-Yellow', 'Purple-Blue'],
  ['Yellow', 'Purple-Blue', 'Purple-Red', 'Blue-Green']
];
