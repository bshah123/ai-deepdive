// Diagrams for 20.4 (condition number, sensitivity, stability).
// Run: node scripts/diagrams/lessons/20.4.mjs
// Every number comes from scripts/diagrams/lessons/20.4_data.json (written by 20.4_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-20-math-for-ml/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '20.4_data.json'), 'utf8'));
const pct = (v, d) => (v * 100).toFixed(d) + '%';

// ---------------------------------------------------------------- 20.4-parallel-lines.svg
{
  const s = new Sketch(880, 380, { title: 'Two nearly parallel lines in the plane. Shifting the right-hand side by 0.0001 moves their crossing point from (2, 3) to (2.2001, 2.8).', seed: 2001 });
  s.text(440, 30, 'Two almost identical lines: where do they cross?', { size: 24, weight: 700 });
  const X = (x) => 120 + 55 * x, Y = (y) => 320 - 52 * y;
  s.line(X(0), Y(0), X(4.2), Y(0), { color: C.muted, width: 2 });
  s.line(X(0), Y(0), X(0), Y(5.2), { color: C.muted, width: 2 });
  s.text(X(4.2), Y(0) + 26, 'x1', { size: 17, color: C.muted });
  s.text(X(0) - 18, Y(5.2), 'x2', { size: 17, color: C.muted });
  // row 1: x1 + x2 = b1 ; row 2: x1 + 1.001 x2 = b2 (solid = original, dashed = perturbed)
  const b1 = D.b[0], b2 = D.b[1];
  const L1 = (bb) => (x) => bb - x;
  const L2 = (bb) => (x) => (bb - x) / 1.001;
  const seg = (f, o) => s.line(X(0.2), Y(f(0.2)), X(3.8), Y(f(3.8)), o);
  seg(L1(b1), { color: C.blue, width: 3 });
  seg(L2(b2), { color: C.green, width: 3 });
  const p1 = D.b[0] + D.db[0], p2 = D.b[1] + D.db[1];
  seg(L1(p1), { color: C.rose, width: 2, dash: '8 8' });
  seg(L2(p2), { color: C.rose, width: 2, dash: '8 8' });
  s.circle(X(2), Y(3), 12, { color: C.ink, fill: C.amber, fillStyle: 'solid' });
  s.text(X(2) - 20, Y(3) + 34, `(${D.x_true[0].toFixed(0)}, ${D.x_true[1].toFixed(0)})`, { font: 'mono', size: 16, anchor: 'end' });
  s.circle(X(D.x_noisy[0]), Y(D.x_noisy[1]), 12, { color: C.ink, fill: C.rose, fillStyle: 'solid' });
  s.text(X(D.x_noisy[0]) + 22, Y(D.x_noisy[1]) - 22, `(${D.x_noisy[0].toFixed(4)}, ${D.x_noisy[1].toFixed(1)})`, { font: 'mono', size: 16, anchor: 'start' });
  s.note(420, 90, 420, 130, [
    `row 1: x1 + x2 = ${b1}   (blue)`,
    `row 2: x1 + 1.001 x2 = ${b2}  (green)`,
    'slopes differ by 0.1%, so the lines',
    'are almost the same line.',
  ], { size: 18 });
  s.note(420, 245, 420, 100, [
    `input error  ||db||/||b|| = ${pct(D.rel_b, 4)}`,
    `output error ||dx||/||x|| = ${pct(D.rel_x, 2)}`,
    `ratio ${Math.round(D.amp_A)}  vs  kappa = ${D.kappa_A.toFixed(0)}`,
  ], { size: 18 });
  save('20.4-parallel-lines.svg', s);
}

// ---------------------------------------------------------------- 20.4-ellipse.svg
{
  const s = new Sketch(880, 380, { title: 'The unit circle mapped by a rotation (stays a circle) and by the ill-conditioned matrix A (becomes a near-line segment of half-length 2.0005).', seed: 2002 });
  s.text(440, 30, 'What a matrix does to a circle of unit inputs', { size: 24, weight: 700 });
  const k = 60, cy = 178;
  // panel 1: input
  s.text(130, 76, 'input: unit circle', { size: 18, weight: 700 });
  s.circle(130, cy, 2 * k, { color: C.muted, fillStyle: 'solid' });
  // panel 2: rotation R -> still a circle
  s.text(440, 76, 'rotation R: kappa = 1', { size: 18, weight: 700, color: C.green });
  s.circle(440, cy, 2 * k, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  // panel 3: A -> segment along (1,1), half-length sigma_1 * k
  s.text(740, 76, `A: kappa = ${Math.round(D.kappa_A)}`, { size: 18, weight: 700, color: C.rose });
  const half = D.sigma[0] * k, d = half / Math.SQRT2;
  s.line(740 - d, cy + d, 740 + d, cy - d, { color: C.rose, width: 5 });
  s.circle(740, cy, 8, { color: C.ink, fill: C.rose, fillStyle: 'solid' });
  s.note(40, 290, 800, 52, [
    `the image of the circle is an ellipse with semi-axes sigma_1 = ${D.sigma[0].toFixed(4)} and sigma_2 = ${D.sigma[1].toFixed(4)}`,
    'the short axis is ~4000 times shorter, so the ellipse collapses to a line',
  ], { size: 17 });
  s.text(440, 366, 'circle sizes drawn at one scale: rotation 1, A 2.0005 along (1,1)', { size: 15, color: C.muted });
  save('20.4-ellipse.svg', s);
}

// ---------------------------------------------------------------- 20.4-precision.svg
{
  const s = new Sketch(880, 440, { title: 'Log-log chart: measured relative error of a linear solve against condition number, in float64 and float32, with dashed kappa times machine epsilon bounds.', seed: 2003 });
  s.text(440, 30, 'Measured solve error against condition number', { size: 24, weight: 700 });
  const x0 = 130, dx = 700 / 12, y0 = 380, dy = 320 / 18; // x: log10 kappa 0..12, y: log10 error -17..1
  const PX = (lk) => x0 + lk * dx, PY = (le) => y0 - (le + 17) * dy;
  // grid and axes
  for (let e = -16; e <= 0; e += 2) {
    s.line(x0, PY(e), PX(12), PY(e), { color: C.muted, width: 1, dash: '2 6' });
    s.text(x0 - 12, PY(e) + 5, `1e${e}`, { font: 'mono', size: 14, anchor: 'end', color: C.muted });
  }
  for (let k = 0; k <= 12; k += 2) {
    s.text(PX(k), y0 + 24, k === 0 ? '1' : `1e${k}`, { font: 'mono', size: 14, color: C.muted });
  }
  s.line(x0, PY(-17), x0, PY(1), { color: C.ink, width: 2 });
  s.line(x0, y0, PX(12), y0, { color: C.ink, width: 2 });
  s.text(PX(6), y0 + 52, 'condition number kappa (log scale)', { size: 17 });
  s.text(60, 210, 'relative error', { size: 17, rotate: -90 });
  // bounds: kappa * eps, clipped to the plot
  const e64 = 2.220446e-16, e32 = 1.1920929e-7;
  const lb64 = Math.log10(e64), lb32 = Math.log10(e32);
  s.line(PX(0), PY(lb64), PX(12), PY(12 + lb64), { color: C.blue, width: 2, dash: '10 8' });
  const xTop = 1 - lb32; // where kappa*eps32 reaches 1
  s.line(PX(0), PY(lb32), PX(xTop), PY(1), { color: C.amber, width: 2, dash: '10 8' });
  // measured points
  for (const r of D.sweep) {
    const lk = Math.log10(r.kappa);
    s.circle(PX(lk), PY(Math.log10(r.err64_median)), 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.circle(PX(lk), PY(Math.log10(r.err32_median)), 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  }
  // legend
  s.circle(160, 100, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(180, 106, 'float64 measured (median of 20)', { size: 16, anchor: 'start' });
  s.circle(160, 128, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(180, 134, 'float32 measured (median of 20)', { size: 16, anchor: 'start' });
  s.line(560, 100, 600, 100, { color: C.blue, width: 2, dash: '10 8' });
  s.text(610, 106, 'kappa x 2.2e-16 (float64)', { size: 16, anchor: 'start' });
  s.line(560, 128, 600, 128, { color: C.amber, width: 2, dash: '10 8' });
  s.text(610, 134, 'kappa x 1.2e-7 (float32)', { size: 16, anchor: 'start' });
  s.note(470, 300, 330, 60, [
    `float32, kappa = 1e8: error ${D.sweep[4].err32_median.toFixed(2)}`,
    `float64, kappa = 1e12: error ${D.sweep[6].err64_median.toExponential(1)}`,
  ], { size: 17 });
  save('20.4-precision.svg', s);
}

// ---------------------------------------------------------------- 20.4-gd-iterations.svg
{
  const s = new Sketch(880, 380, { title: 'Bar chart on a log scale: steps for gradient descent to shrink the iterate by 1e-6, for kappa = 1, 10, 100, 1000.', seed: 2004 });
  s.text(440, 30, 'Gradient descent steps grow with kappa', { size: 24, weight: 700 });
  const base = 320, dec = 62;      // y = base - dec * log10(steps)
  const PY = (v) => base - dec * Math.log10(v);
  for (const v of [1, 10, 100, 1000, 10000]) {
    s.line(120, PY(v), 820, PY(v), { color: C.muted, width: 1, dash: '2 6' });
    s.text(108, PY(v) + 5, String(v), { font: 'mono', size: 15, anchor: 'end', color: C.muted });
  }
  s.line(120, PY(1), 120, PY(10000) - 10, { color: C.ink, width: 2 });
  s.text(60, 200, 'steps (log)', { size: 17, rotate: -90 });
  const cols = [
    { k: 1, c: C.green, f: C.greenSoft },
    { k: 10, c: C.blue, f: C.blueSoft },
    { k: 100, c: C.amber, f: C.amberSoft },
    { k: 1000, c: C.rose, f: C.roseSoft },
  ];
  D.gd.forEach((g, i) => {
    const cx = 220 + i * 180, n = g.iters_measured;
    const top = PY(n);
    s.rect(cx - 45, top, 90, base - top, { color: cols[i].c, fill: cols[i].f, fillStyle: 'solid' });
    s.text(cx, top - 12, `${n}`, { font: 'mono', size: 17, weight: 700 });
    s.text(cx, base + 28, `kappa = ${g.kappa}`, { size: 18, weight: 700 });
  });
  s.text(440, 372, 'step size alpha = 2/(1 + kappa); each step shrinks every error component by (kappa-1)/(kappa+1)', { size: 15, color: C.muted });
  save('20.4-gd-iterations.svg', s);
}

// ---------------------------------------------------------------- 20.4-normal-equations.svg
{
  const s = new Sketch(880, 360, { title: 'Chain of condition numbers: forming X transpose X squares kappa, and adding ridge lambda I pulls it back down.', seed: 2005 });
  s.text(440, 30, 'Forming X^T X squares the condition number', { size: 24, weight: 700 });
  const bw = 230, bh = 84;
  const box = (x, y, lines, c, f) => {
    s.rect(x, y, bw, bh, { color: c, fill: f, fillStyle: 'solid' });
    s.text(x + bw / 2, y + 36, lines, { font: 'mono', size: 17 });
  };
  box(30, 80, ['kappa(X)', `${D.kappa_X.toFixed(1)}`], C.muted, C.blueSoft);
  box(325, 80, ['kappa(X^T X)', `${D.kappa_XtX.toExponential(2)}`], C.rose, C.roseSoft);
  box(620, 80, ['kappa(X^T X + 0.01 I)', `${Math.round(D.ridge[0].kappa_ridge)}`], C.green, C.greenSoft);
  box(325, 230, ['kappa(X^T X + 1 I)', `${D.ridge[1].kappa_ridge.toFixed(1)}`], C.green, C.greenSoft);
  s.arrow(260, 122, 325, 122, { color: C.muted, head: 9 });
  s.text(292, 110, 'square', { size: 16 });
  s.arrow(555, 122, 620, 122, { color: C.muted, head: 9 });
  s.text(588, 110, '+0.01 I', { size: 16 });
  s.arrow(440, 164, 440, 230, { color: C.muted, head: 9 });
  s.text(480, 200, '+1 I', { size: 16 });
  s.note(30, 240, 240, 90, ['X has two nearly', 'collinear columns'], { size: 17 });
  s.text(440, 350, 'valid because X^T X is symmetric positive semidefinite: singular values equal eigenvalues', { size: 15, color: C.muted });
  save('20.4-normal-equations.svg', s);
}
console.log('wrote 20.4 diagrams');
