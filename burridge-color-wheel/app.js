(() => {
  const P = window.PALETTE, C = window.WHEEL_COLORS, N = P.length, STEP = 360 / N, NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('wheel');
  const D_OUT = 255, DISC = 137, HALF_GAP = 7, HALF_ANG = STEP / 2;
  const wrap = i => ((i % N) + N) % N;
  const wedgeAt = deg => wrap(Math.round(deg / STEP));
  const rad = d => d * Math.PI / 180;
  const pt = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];

  // Four 90-degree sections (Red and Blue-Green sit on the section lines).
  const SECTIONS = [[0, 1, 2], [2, 3, 4, 5], [5, 6, 7], [7, 8, 9, 0]];
  const sameSection = (a, b) => SECTIONS.some(s => s.includes(a) && s.includes(b));

  let angle = 8 * STEP, mixHue = 5, ratio = 0.5, dragging = false;

  const el = (name, attrs = {}, parent = svg, text) => {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    parent.appendChild(e); return e;
  };

  function roles() {
    const dom = wedgeAt(angle), foc = wedgeAt(angle + 180);
    // spice 3 = left point (-90deg), 4 = right point (+90deg); ties at a wedge border
    // resolve the way the printed examples do: clockwise point up, counter-clockwise down.
    const s3 = wedgeAt(angle - 90 - 0.001), s4 = wedgeAt(angle + 90 + 0.001);
    return [dom, foc, s3, s4];
  }

  function wedgePoints(i) {
    const w = y => y * Math.tan(rad(HALF_ANG)) - HALF_GAP / Math.cos(rad(HALF_ANG));
    const local = [[-w(100), 100], [w(100), 100], [w(D_OUT), D_OUT], [-w(D_OUT), D_OUT]];
    const a = rad(i * STEP), s = Math.sin(a), c = Math.cos(a);
    return local.map(([x, y]) => [x * c + y * s, x * s - y * c].map(v => v.toFixed(2))).map(p => p.join(',')).join(' ');
  }

  function arc(r, a1, a2, ccw) {
    const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2);
    const span = ccw ? a1 - a2 : a2 - a1, large = ((span % 360) + 360) % 360 > 180 ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large} ${ccw ? 0 : 1} ${x2},${y2}`;
  }
  function curved(id, d, content, size, fill, spacing) {
    el('path', { id, d, fill: 'none' }, defs);
    const t = el('text', { 'font-size': size, fill, 'letter-spacing': spacing || 0 });
    const tp = el('textPath', { href: '#' + id, startOffset: '50%', 'text-anchor': 'middle' }, t);
    content.forEach(([s, f]) => el('tspan', f ? { fill: f } : {}, tp, s));
  }

  let defs, spinner, badges = [];
  function build() {
    svg.innerHTML = '';
    defs = el('defs');
    // ring texts and section arrows
    curved('t-title', arc(345, 292, 68), [['ROBERT BURRIDGE GOOF-PROOF ', C.red], ['COLOR WHEEL', '#111'], ['™', '#111']], 25, '#111', 1.2);
    curved('t-tl', arc(313, 276, 352), [['Bright and Clean Mixes']], 17, '#111');
    curved('t-tr', arc(313, 8, 84), [['Bright and Clean Mixes']], 17, '#111');
    curved('t-br', arc(327, 172, 96, true), [['Bright and Clean Mixes']], 17, '#111');
    curved('t-bl', arc(327, 264, 188, true), [['Bright and Clean Mixes']], 17, '#111');
    curved('t-cross', arc(330, 214, 146, true), [['Cross the Line • Dull Mixes']], 17, '#111');
    el('path', { d: arc(300, 144, 216), fill: 'none', stroke: '#111', 'stroke-width': 1 });
    [144, 216].forEach(a => { const [x, y] = pt(300, a); el('circle', { cx: x, cy: y, r: 2.4, fill: '#111' }); });
    el('path', { d: arc(300, 266, 274), fill: 'none', stroke: '#111', 'stroke-width': 1 }); // 9 o'clock section line

    // wedges + hue names
    P.forEach((h, i) => {
      el('polygon', { points: wedgePoints(i), fill: h.hex, class: 'wedge', 'data-i': i });
      const a = i * STEP, [x, y] = pt(D_OUT + 26, a), flip = a > 90 && a < 270;
      el('text', { x: 0, y: 0, 'font-size': 17, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        transform: `translate(${x},${y}) rotate(${flip ? a + 180 : a})`, fill: '#111' }, svg, h.name.toUpperCase());
    });

    // centre disc + spinning diamond
    el('circle', { r: DISC, fill: C.disc });
    spinner = el('g', { id: 'spinner' });
    el('polygon', { points: '0,-122 122,0 0,122 -122,0', fill: '#fff' }, spinner);
    el('text', { x: 0, y: -62, 'font-size': 14, 'text-anchor': 'middle', fill: '#111' }, spinner, 'DOMINANT');
    el('text', { x: 0, y: -47, 'font-size': 14, 'text-anchor': 'middle', fill: '#111' }, spinner, 'COLOR');
    el('text', { x: 0, y: -75, 'font-size': 24, 'text-anchor': 'middle', fill: '#111' }, spinner, '1');
    el('text', { x: 0, y: 70, 'font-size': 14, 'text-anchor': 'middle', fill: '#111' }, spinner, 'FOCAL POINT');
    el('text', { x: 0, y: 85, 'font-size': 14, 'text-anchor': 'middle', fill: '#111' }, spinner, 'COLOR');
    el('text', { x: 0, y: 112, 'font-size': 24, 'text-anchor': 'middle', fill: '#111' }, spinner, '2');
    [[-1, '3'], [1, '4']].forEach(([s, n]) => {
      el('text', { x: s * 78, y: 8, 'font-size': 24, 'text-anchor': 'middle', fill: '#111' }, spinner, n);
      el('text', { x: s * 43, y: 4, 'font-size': 13, 'text-anchor': 'middle', fill: '#111' }, spinner, 'SPICE');
      el('text', { x: s * 43, y: 18, 'font-size': 13, 'text-anchor': 'middle', fill: '#111' }, spinner, 'COLOR');
    });
    // number badges on the four chosen wedges
    badges = [1, 2, 3, 4].map(n => {
      const g = el('g'); el('circle', { r: 13, fill: '#fff', stroke: '#111', 'stroke-width': 1.5 }, g);
      el('text', { 'text-anchor': 'middle', y: 6, 'font-size': 17, fill: '#111' }, g, n); return g;
    });
  }

  function update() {
    spinner.style.transform = `rotate(${angle}deg)`;
    const r = roles();
    badges.forEach((g, k) => { const [x, y] = pt(D_OUT - 28, r[k] * STEP); g.setAttribute('transform', `translate(${x},${y})`); });
    const pk = document.getElementById('picked'); pk.innerHTML = '';
    const labels = ['Dominant', 'Focal point', 'Spice', 'Spice'];
    r.forEach((i, k) => {
      const d = document.createElement('div'); d.className = 'row';
      d.innerHTML = `<i style="background:${P[i].hex}"><em>${k + 1}</em></i><b>${labels[k]}</b><span>${P[i].name}</span>`;
      d.title = P[i].hex; d.onclick = () => copy(P[i].hex); pk.appendChild(d);
    });
    mixUpdate(r[0]);
  }

  // Subtractive-style paint mix: weighted geometric mean per channel.
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const paintMix = (a, b, t) => { const x = rgb(a), y = rgb(b);
    return hex(x.map((v, i) => Math.pow(v + 12, 1 - t) * Math.pow(y[i] + 12, t) - 12)); };

  function mixUpdate(a) {
    const b = mixHue, m = paintMix(P[a].hex, P[b].hex, ratio);
    document.getElementById('mA').style.background = P[a].hex;
    document.getElementById('mB').style.background = P[b].hex;
    document.getElementById('mR').style.background = m;
    document.getElementById('mixlabel').textContent = `${P[a].name} + ${P[b].name}`;
    const bright = a === b || sameSection(a, b);
    const v = document.getElementById('verdict');
    v.textContent = bright ? 'Bright and clean mix' : 'Crossed the line: dull mix';
    v.style.color = bright ? '#009A63' : '#C7168D';
    document.getElementById('mixhex').textContent = `${m} · ${Math.round((1 - ratio) * 100)}% / ${Math.round(ratio * 100)}%`;
  }

  function spinTo(i) {
    const target = i * STEP; let d = ((target - angle) % 360 + 540) % 360 - 180;
    angle += d; update();
  }
  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    const t = document.getElementById('toast'); t.textContent = 'Copied ' + text; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1200);
  }

  const pointerAngle = e => {
    const r = svg.getBoundingClientRect(), s = r.width / 800;
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    return Math.atan2(x, -y) * 180 / Math.PI;
  };
  let grab = null;
  svg.addEventListener('pointerdown', e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left - r.width / 2) * 800 / r.width, py = (e.clientY - r.top - r.height / 2) * 800 / r.height;
    if (Math.hypot(px, py) <= DISC) {
      grab = pointerAngle(e) - angle; dragging = true; spinner.classList.add('drag'); svg.setPointerCapture(e.pointerId);
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
  document.getElementById('spin').addEventListener('click', () => {
    const target = Math.floor(Math.random() * N) * STEP, d = ((target - angle) % 360 + 360) % 360;
    angle += 720 + d; update();
  });

  build(); update();
})();
