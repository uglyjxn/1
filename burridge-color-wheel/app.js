(() => {
  const P = window.PALETTE, C = window.WHEEL_COLORS, EX = window.EXAMPLES, N = P.length, STEP = 360 / N, NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('wheel');
  // Geometry measured from the printed wheel (units = scan pixels, centre at 0,0).
  const DISC = 147, D_OUT = 273.5, OUTER_RING = 363.6, HUB = [1.16, 2.75];  // hub sits ~3px off the wheel's axis in the print
  // kite-shaped diamond (relative to the hub centre): top, right, bottom, left
  const KITE = [[0.7, -136.1], [129.9, 40.9], [0.7, 134.4], [-128.6, 40.9]];
  const wrap = i => ((i % N) + N) % N;
  const wedgeAt = deg => wrap(Math.round(deg / STEP));
  const rad = d => d * Math.PI / 180;
  const pt = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];
  const names = P.map(h => h.name);

  let angle = 8 * STEP;

  const el = (name, attrs = {}, parent = svg, text) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    parent.appendChild(e); return e;
  };

  // [dominant, focal, spice 3 (left point), spice 4 (right point)]
  function roles() {
    return [wedgeAt(angle), wedgeAt(angle + 180), wedgeAt(angle - 90 - 0.001), wedgeAt(angle + 90 + 0.001)];
  }

  // Each wedge outline fitted separately to the scan (corners relative to the wheel centre; the
  // inner corners lie under the hub). The printed wedges deviate from a perfect 36-degree grid by up to ~1 degree.
  const WEDGES = [[[-38.05, -136.19], [40.36, -132.64], [71.46, -272.46], [-72.27, -272.36]], [[45.86, -133.42], [109.28, -86.84], [218.56, -177.89], [101.99, -262.65]], [[114.68, -79.8], [143.34, -5.89], [281.8, -15.0], [237.24, -152.13]], [[143.86, 3.7], [117.07, 78.2], [237.16, 153.86], [282.31, 16.94]], [[111.73, 85.34], [49.11, 132.31], [101.81, 264.34], [218.45, 179.64]], [[40.42, 134.56], [-37.42, 135.28], [-72.52, 273.79], [71.46, 274.16]], [[-49.43, 130.61], [-112.1, 84.84], [-219.52, 179.72], [-103.13, 264.22]], [[-117.43, 77.73], [-142.12, 3.45], [-282.84, 16.92], [-238.41, 153.61]], [[-134.04, -5.26], [-114.79, -79.23], [-238.32, -152.08], [-282.76, -15.38]], [[-109.48, -86.34], [-46.57, -132.7], [-102.99, -262.67], [-219.36, -178.15]]];
  const wedgePoints = i => WEDGES[i].map(p => p.join(',')).join(' ');

  function arc(r, a1, a2) {           // a2 > a1 clockwise, a2 < a1 counter-clockwise
    const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2);
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} ${a2 > a1 ? 1 : 0} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }

  let defs, spinner;
  function ringText(id, a1, a2, r, str, size, fill, textLength, upright) {
    el('path', { id, d: arc(r, a1, a2), fill: 'none' }, defs);
    const t = el('text', { 'font-size': size, fill, class: upright ? '' : 'it' });
    const tp = el('textPath', { href: '#' + id, startOffset: '50%', 'text-anchor': 'middle' }, t, str);
    if (textLength) { tp.setAttribute('textLength', textLength); tp.setAttribute('lengthAdjust', 'spacing'); }
  }
  const dim = (r, a1, a2, markerEnds) => {
    const p = el('path', { d: arc(r, a1, a2), fill: 'none', stroke: '#111', 'stroke-width': 0.9 });
    if (markerEnds !== 'start') p.setAttribute('marker-end', 'url(#ah)');
    if (markerEnds !== 'end') p.setAttribute('marker-start', 'url(#ah)');
  };
  const tick = (r1, r2, a, color = '#111', w = 0.9) => {
    const [x1, y1] = pt(r1, a), [x2, y2] = pt(r2, a);
    el('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': w });
  };

  function build() {
    svg.innerHTML = '';
    defs = el('defs');
    const mk = el('marker', { id: 'ah', viewBox: '0 0 10 8', refX: 9, refY: 4, markerWidth: 9, markerHeight: 7, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M0,0 L10,4 L0,8 L3,4Z', fill: '#111' }, mk);

    el('circle', { r: OUTER_RING, fill: 'none', stroke: '#111', 'stroke-width': 0.9 });

    // section dimension lines (line - text - line), text 15.5 deg either side of 45/135/225/315
    const R = 318;
    dim(R, 358.5, 331, 'start'); dim(R, 301, 271.5, 'end');            // top-left
    dim(R, 1.5, 29);          dim(R, 61, 88.5);                         // top-right
    dim(R, 91.5, 119);        dim(R, 151, 178.5, 'end');                // bottom-right (arrow at tick end only)
    dim(R, 268.5, 241);       dim(R, 211, 181.5, 'start');              // bottom-left
    ringText('t-tl', 301, 331, 312.2, 'Bright and Clean Mixes', 14.5, '#111');
    ringText('t-tr', 29, 61, 312.2, 'Bright and Clean Mixes', 14.5, '#111');
    ringText('t-br', 151, 119, 323.6, 'Bright and Clean Mixes', 14.5, '#111');
    ringText('t-bl', 241, 211, 323.2, 'Bright and Clean Mixes', 14.5, '#111');
    // "cross the line" arrows at the bottom, plus section ticks
    dim(R - 6, 178, 206); dim(R - 6, 182, 154);
    ringText('t-cross', 206, 154, 342, 'Cross the Line • Dull Mixes', 14.5, '#111');
    tick(R - 9, R + 12, 0); tick(R - 9, R + 4, 180);
    [[-363.4, -176.4], [176.4, 329.6]].forEach(([x1, x2]) => el('line', { x1, y1: 0.45, x2, y2: 0.45, stroke: '#6e6e6e', 'stroke-width': 1.3 }));
    // maker's mark and web address along the right edge
    el('image', { href: 'assets/edge-logo.png', x: 322, y: -29, width: 36, height: 30 });
    ringText('t-url', 111, 89.2, 347, 'Robert Burridge.com', 11.5, '#111', 0, true);
    ringText('t-title', -40, 40, 333, 'ROBERT BURRIDGE GOOF-PROOF COLOR WHEEL™', 20, C.red, 456);

    // wedges + hue names
    P.forEach((h, i) => {
      el('polygon', { points: wedgePoints(i), fill: h.hex, class: 'wedge', 'data-i': i });
      const a = i * STEP, [x, y] = pt(290, a), flip = a > 90 && a < 270;
      el('text', { 'font-size': 14.5, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        transform: `translate(${x},${y}) rotate(${flip ? a + 180 : a})`, fill: '#111' }, svg, h.name.toUpperCase());
    });

    // black hub + spinning diamond
    const hub = el('g', { transform: `translate(${HUB[0]},${HUB[1]})` });
    el('circle', { r: DISC, fill: C.disc }, hub);
    spinner = el('g', { id: 'spinner' }, hub);
    el('polygon', { points: KITE.map(p => p.join(',')).join(' '), fill: '#fff' }, spinner);
    const tx = (x, y, s, size) => el('text', { x, y, 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#111' }, spinner, s);
    tx(0, -92, '1', 22); tx(0, -71, 'DOMINANT', 13.5); tx(0, -58, 'COLOR', 13.5);
    tx(0, 114, '2', 22); tx(0, 80, 'FOCAL POINT', 13.5); tx(0, 93, 'COLOR', 13.5);
    tx(-100, 42, '3', 22); tx(-65, 35, 'SPICE', 13.5); tx(-65, 48, 'COLOR', 13.5);
    tx(102, 42, '4', 22); tx(70, 35, 'SPICE', 13.5); tx(70, 48, 'COLOR', 13.5);

  }

  function dots(label, value) {
    const d = document.createElement('div'); d.className = 'ln';
    d.innerHTML = `<span>${label}</span><u></u><span>${value}</span>`;
    return d;
  }

  function update() {
    spinner.style.transform = `rotate(${angle}deg)`;
    const dom = names[roles()[0]];
    document.querySelectorAll('.ex .card').forEach((c, i) => c.classList.toggle('on', EX[i][0] === dom));
  }

  function spinTo(i, extra = 0) {
    const d = ((i * STEP - angle) % 360 + 540) % 360 - 180;
    angle += d + extra; update();
  }
  // examples
  const exBox = document.getElementById('examples');
  EX.forEach((e, i) => {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = `<img src="assets/sketch${i + 1}.png" alt="Paint sketch ${i + 1}">`;
    ['Dominant', 'Focal', 'Spice', 'Spice'].forEach((l, k) => c.appendChild(dots(l, e[k])));
    c.onclick = () => spinTo(names.indexOf(e[0])); exBox.appendChild(c);
  });

  const pointerAngle = e => {
    const r = svg.getBoundingClientRect();
    return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
  };
  let grab = null;
  svg.addEventListener('pointerdown', e => {
    const r = svg.getBoundingClientRect(), k = 760 / r.width;
    const px = (e.clientX - r.left - r.width / 2) * k, py = (e.clientY - r.top - r.height / 2) * k;
    if (Math.hypot(px - HUB[0], py - HUB[1]) <= DISC) {
      grab = pointerAngle(e) - angle; spinner.classList.add('drag');
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });
  svg.addEventListener('pointermove', e => { if (grab !== null) { angle = pointerAngle(e) - grab; update(); } });
  const release = () => { if (grab === null) return; grab = null; spinner.classList.remove('drag'); spinTo(wedgeAt(angle)); };
  svg.addEventListener('pointerup', release); svg.addEventListener('pointercancel', release);
  svg.addEventListener('click', e => {
    const i = e.target.dataset && e.target.dataset.i; if (i === undefined) return;
    spinTo(+i);
  });

  window.__wheel = { roles: () => roles().map(i => names[i]), angle: () => angle };
  build(); update();
})();
