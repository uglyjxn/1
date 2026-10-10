(() => {
  const P = window.PALETTE, C = window.WHEEL_COLORS, EX = window.EXAMPLES, N = P.length, STEP = 360 / N, NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('wheel');
  // Geometry measured from the printed wheel (units = scan pixels, centre at 0,0).
  const DISC = 147, D_OUT = 271, DIAMOND = 131, OUTER_RING = 364;
  const wrap = i => ((i % N) + N) % N;
  const wedgeAt = deg => wrap(Math.round(deg / STEP));
  const rad = d => d * Math.PI / 180;
  const pt = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];
  const names = P.map(h => h.name);

  // Four sections; Red and Blue-Green sit on the section lines.
  const SECTIONS = [[0, 1, 2], [2, 3, 4, 5], [5, 6, 7], [7, 8, 9, 0]];
  const sameSection = (a, b) => SECTIONS.some(s => s.includes(a) && s.includes(b));

  let angle = 8 * STEP, mixHue = 5, ratio = 0.5, showMarks = false;

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

  function wedgePoints(i) {
    const w = y => 40.5 + (y - 149) * 0.2377;   // half width at distance y from the centre
    const local = [[-w(135), 135], [w(135), 135], [w(D_OUT), D_OUT], [-w(D_OUT), D_OUT]];
    const a = rad(i * STEP), s = Math.sin(a), c = Math.cos(a);
    return local.map(([x, y]) => `${(x * c + y * s).toFixed(2)},${(x * s - y * c).toFixed(2)}`).join(' ');
  }

  function arc(r, a1, a2) {           // a2 > a1 clockwise, a2 < a1 counter-clockwise
    const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2);
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} ${a2 > a1 ? 1 : 0} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }

  let defs, spinner, badges = [];
  function ringText(id, a1, a2, r, str, size, fill, textLength) {
    el('path', { id, d: arc(r, a1, a2), fill: 'none' }, defs);
    const t = el('text', { 'font-size': size, fill, class: 'it' });
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
    const R = 319;
    dim(R, 358.5, 331, 'start'); dim(R, 301, 271.5, 'end');            // top-left
    dim(R, 1.5, 29);          dim(R, 61, 88.5);                         // top-right
    dim(R, 91.5, 119);        dim(R, 151, 178.5, 'end');                // bottom-right (arrow at tick end only)
    dim(R, 268.5, 241);       dim(R, 211, 181.5, 'start');              // bottom-left
    ringText('t-tl', 301, 331, 313, 'Bright and Clean Mixes', 14.5, '#111');
    ringText('t-tr', 29, 61, 313, 'Bright and Clean Mixes', 14.5, '#111');
    ringText('t-br', 151, 119, 325, 'Bright and Clean Mixes', 14.5, '#111');
    ringText('t-bl', 241, 211, 325, 'Bright and Clean Mixes', 14.5, '#111');
    // "cross the line" arrows at the bottom, plus section ticks
    dim(R - 6, 178, 206); dim(R - 6, 182, 154);
    ringText('t-cross', 206, 154, 342, 'Cross the Line • Dull Mixes', 14.5, '#111');
    tick(R - 9, R + 12, 0); tick(R - 9, R + 4, 180);
    [270, 90].forEach(a => { const s = a === 270 ? -1 : 1; el('line', { x1: s * 175, y1: -2, x2: s * (OUTER_RING - 2), y2: -2, stroke: '#8a8a8a', 'stroke-width': 1.6 }); });
    ringText('t-title', -40, 40, 333, 'ROBERT BURRIDGE GOOF-PROOF COLOR WHEEL™', 20, C.red, 456);

    // wedges + hue names
    P.forEach((h, i) => {
      el('polygon', { points: wedgePoints(i), fill: h.hex, class: 'wedge', 'data-i': i });
      const a = i * STEP, [x, y] = pt(290, a), flip = a > 90 && a < 270;
      el('text', { 'font-size': 14.5, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        transform: `translate(${x},${y}) rotate(${flip ? a + 180 : a})`, fill: '#111' }, svg, h.name.toUpperCase());
    });

    // black hub + spinning diamond
    el('circle', { r: DISC, fill: C.disc });
    spinner = el('g', { id: 'spinner' });
    const D = DIAMOND;
    el('polygon', { points: `0,${-D} ${D},0 0,${D} ${-D},0`, fill: '#fff' }, spinner);
    const tx = (x, y, s, size) => el('text', { x, y, 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#111' }, spinner, s);
    tx(0, -92, '1', 22); tx(0, -71, 'DOMINANT', 13.5); tx(0, -58, 'COLOR', 13.5);
    tx(0, 114, '2', 22); tx(0, 80, 'FOCAL POINT', 13.5); tx(0, 93, 'COLOR', 13.5);
    tx(-100, 42, '3', 22); tx(-65, 35, 'SPICE', 13.5); tx(-65, 48, 'COLOR', 13.5);
    tx(102, 42, '4', 22); tx(70, 35, 'SPICE', 13.5); tx(70, 48, 'COLOR', 13.5);

    badges = [1, 2, 3, 4].map(n => {
      const g = el('g'); el('circle', { r: 13, fill: '#fff', stroke: '#111', 'stroke-width': 1.5 }, g);
      el('text', { 'text-anchor': 'middle', y: 6, 'font-size': 17, fill: '#111' }, g, n); return g;
    });
  }

  function dots(label, value, color) {
    const d = document.createElement('div'); d.className = 'ln';
    d.innerHTML = `<span>${color ? `<i class="sw" style="background:${color}"></i>` : ''}${label}</span><u></u><span>${value}</span>`;
    return d;
  }

  function update() {
    spinner.style.transform = `rotate(${angle}deg)`;
    const r = roles();
    badges.forEach((g, k) => {
      const [x, y] = pt(D_OUT - 30, r[k] * STEP);
      g.setAttribute('transform', `translate(${x},${y})`); g.style.display = showMarks ? '' : 'none';
    });
    const pk = document.getElementById('picked'); pk.innerHTML = '';
    ['Dominant', 'Focal point', 'Spice', 'Spice'].forEach((l, k) => {
      const row = dots(l, names[r[k]], P[r[k]].hex); row.style.cursor = 'pointer'; row.title = P[r[k]].hex;
      row.onclick = () => copy(P[r[k]].hex); pk.appendChild(row);
    });
    document.querySelectorAll('.ex .card').forEach((c, i) => {
      const e = EX[i], same = e[0] === names[r[0]];
      c.classList.toggle('on', same);
    });
    mixUpdate(r[0]);
  }

  // Subtractive-style paint mix: weighted geometric mean per channel (approximation).
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const paintMix = (a, b, t) => { const x = rgb(a), y = rgb(b);
    return hex(x.map((v, i) => Math.pow(v + 12, 1 - t) * Math.pow(y[i] + 12, t) - 12)); };

  function mixUpdate(a) {
    const b = mixHue, m = paintMix(P[a].hex, P[b].hex, ratio);
    document.getElementById('mA').style.background = P[a].hex;
    document.getElementById('mB').style.background = P[b].hex;
    document.getElementById('mR').style.background = m;
    document.getElementById('mixlabel').textContent = `${names[a]} + ${names[b]}`;
    const bright = a === b || sameSection(a, b), v = document.getElementById('verdict');
    v.textContent = bright ? 'Bright and clean mix' : 'Crossed the line: dull mix';
    v.style.color = bright ? '#009A63' : '#C7168D';
    document.getElementById('mixhex').textContent = `${m} · ${Math.round((1 - ratio) * 100)}% / ${Math.round(ratio * 100)}%`;
  }

  function spinTo(i, extra = 0) {
    const d = ((i * STEP - angle) % 360 + 540) % 360 - 180;
    angle += d + extra; update();
  }
  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    const t = document.getElementById('toast'); t.textContent = 'Copied ' + text; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1200);
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
    if (Math.hypot(px, py) <= DISC) {
      grab = pointerAngle(e) - angle; spinner.classList.add('drag');
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });
  svg.addEventListener('pointermove', e => { if (grab !== null) { angle = pointerAngle(e) - grab; update(); } });
  const release = () => { if (grab === null) return; grab = null; spinner.classList.remove('drag'); spinTo(wedgeAt(angle)); };
  svg.addEventListener('pointerup', release); svg.addEventListener('pointercancel', release);
  svg.addEventListener('click', e => {
    const i = e.target.dataset && e.target.dataset.i; if (i === undefined) return;
    if (e.shiftKey) { mixHue = +i; update(); } else spinTo(+i);
  });
  document.getElementById('ratio').addEventListener('input', e => { ratio = e.target.value / 100; mixUpdate(roles()[0]); });
  document.getElementById('marks').addEventListener('change', e => { showMarks = e.target.checked; update(); });
  document.getElementById('spin').addEventListener('click', () => spinTo(Math.floor(Math.random() * N), 720));

  window.__wheel = { roles: () => roles().map(i => names[i]), angle: () => angle };
  build(); update();
})();
