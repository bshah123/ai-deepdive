import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-03-ml-nlp/chapter-20-math-for-ml/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Dot product: multiply position by position, then add. Numbers from exp.py.
{
  const s = new Sketch(880, 320, { title: 'Dot product of a = (1,2,3) and b = (4,-5,6): products 4, -10, 18, sum 12', seed: 201 });
  s.text(440, 34, 'Dot product: multiply position by position, then add', { size: 26, weight: 700 });
  const cols = [260, 400, 540];
  cols.forEach((cx, i) => s.text(cx, 84, `i = ${i + 1}`, { size: 20, color: C.muted }));
  const rows = [
    { y: 130, label: 'a', vals: ['1', '2', '3'], color: C.blue, fill: C.blueSoft },
    { y: 200, label: 'b', vals: ['4', '-5', '6'], color: C.amber, fill: C.amberSoft },
    { y: 270, label: 'a·b', vals: ['4', '-10', '18'], color: C.green, fill: C.greenSoft },
  ];
  for (const r of rows) {
    s.text(150, r.y + 7, r.label, { font: 'mono', size: 20, color: r.color });
    cols.forEach((cx, i) => {
      s.rect(cx - 50, r.y - 22, 100, 44, { color: r.color, fill: r.fill, fillStyle: 'solid' });
      s.text(cx, r.y + 7, r.vals[i], { font: 'mono', size: 20 });
    });
  }
  s.text(190, 232, '×', { size: 26, color: C.muted });
  s.arrow(590, 270, 648, 270, { color: C.muted });
  s.rect(650, 248, 180, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(740, 277, 'sum = 12', { font: 'mono', size: 20, weight: 700 });
  s.text(440, 318, 'Swapping a and b gives the same 12: the dot product is symmetric.', { size: 19, color: C.muted });
  save('20.1-dot-product.svg', s);
}

// 2. Projection of x = (3,3) onto the line through u = (2,1). Numbers from exp.py.
{
  const s = new Sketch(880, 320, { title: 'Projection of x=(3,3) onto u=(2,1): p=(3.6,1.8), residual (-0.6,1.2) perpendicular to u', seed: 202 });
  const X = (x) => 90 + 55 * x, Y = (y) => 280 - 55 * y;
  s.line(90, 280, 400, 280, { color: C.muted, width: 1 });
  s.line(90, 280, 90, 40, { color: C.muted, width: 1 });
  s.line(90, 280, X(4.6), Y(2.3), { color: C.muted, dash: '6 8' });
  s.text(352, 170, 'line through u', { size: 18, color: C.muted, anchor: 'start' });
  s.arrow(90, 280, X(2), Y(1), { color: C.blue, width: 3 });
  s.arrow(90, 280, X(3), Y(3), { color: C.amber, width: 3 });
  s.arrow(90, 280, X(3.6), Y(1.8), { color: C.green, width: 3 });
  s.arrow(X(3.6), Y(1.8), X(3), Y(3), { color: C.rose, width: 3, dash: '6 6' });
  // right-angle marker at p
  s.line(276.4, 186.8, 270.6, 175.2, { color: C.muted, width: 2 });
  s.line(270.6, 175.2, 282.2, 169.4, { color: C.muted, width: 2 });
  s.text(150, 270, 'u', { font: 'mono', size: 22, color: C.blue, weight: 700 });
  s.text(262, 100, 'x = (3, 3)', { font: 'mono', size: 19, color: C.amber, anchor: 'start' });
  s.text(300, 206, 'p = 1.8u = (3.6, 1.8)', { font: 'mono', size: 17, color: C.green, anchor: 'start' });
  s.text(298, 138, 'r = x - p', { font: 'mono', size: 18, color: C.rose, anchor: 'start' });
  s.note(560, 80, 300, 200, [
    'x·u = 6 + 3 = 9',
    'u·u = 4 + 1 = 5',
    't = x·u / u·u = 1.8',
    'p = t·u = (3.6, 1.8)',
    'r = x - p = (-0.6, 1.2)',
    'r·u = -1.2 + 1.2 = 0',
    '|x|² = 18 = |p|² + |r|²',
  ], { size: 18 });
  save('20.1-projection.svg', s);
}

// 3. Closest point: distance from x to s·u for several s; minimum at s = 1.8. Numbers from exp.py.
{
  const s = new Sketch(880, 320, { title: 'Distance from x to s u for several s, smallest at s = 1.8', seed: 203 });
  s.text(440, 34, 'Distance from x to s·u is smallest at the projection', { size: 26, weight: 700 });
  const base = 240, k = 36;
  const data = [[0, 4.2426], [0.5, 3.2016], [1.0, 2.2361], [1.5, 1.5], [1.8, 1.3416], [2.0, 1.4142], [2.5, 2.0616]];
  s.line(90, base, 820, base, { color: C.muted, width: 1.5 });
  data.forEach(([sv, d], i) => {
    const cx = 150 + i * 105, top = base - k * d, best = sv === 1.8;
    s.rect(cx - 30, top, 60, base - top, { color: best ? C.green : C.blue, fill: best ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(cx, top - 10, d.toFixed(2), { font: 'mono', size: 18, weight: best ? 700 : 400 });
    s.text(cx, base + 26, `s = ${sv}`, { font: 'mono', size: 17, color: best ? C.green : C.muted });
  });
  s.text(462, 300, 'Bars: ||x - s·u||. The minimum is the residual, |r| = 1.34.', { size: 19, color: C.muted });
  save('20.1-closest-point.svg', s);
}

// 4. Cosine similarity of 2-D word vectors. Numbers from exp.py.
{
  const s = new Sketch(880, 320, { title: 'Cosine similarity: angle between cat, dog and car vectors', seed: 204 });
  s.text(440, 34, 'Cosine similarity compares direction, not length', { size: 26, weight: 700 });
  const X = (x) => 100 + 50 * x, Y = (y) => 290 - 50 * y;
  s.arrow(100, 290, X(4), Y(1), { color: C.amber, width: 3 });
  s.arrow(100, 290, X(3), Y(2), { color: C.blue, width: 3 });
  s.arrow(100, 290, X(1), Y(4), { color: C.rose, width: 3 });
  s.text(X(4) + 12, Y(1) + 6, 'cat (4, 1)', { font: 'mono', size: 18, color: C.amber, anchor: 'start' });
  s.text(X(3) + 12, Y(2) - 8, 'dog (3, 2)', { font: 'mono', size: 18, color: C.blue, anchor: 'start' });
  s.text(X(1) + 14, Y(4) + 4, 'car (1, 4)', { font: 'mono', size: 18, color: C.rose, anchor: 'start' });
  s.note(470, 90, 380, 190, [
    'cos θ = a·b / (|a| |b|)',
    'cat·dog = 14, |cat||dog| = 14.87',
    'cos(cat, dog) = 0.942',
    'cos(dog, car) = 0.740',
    'cos(cat, car) = 0.471',
    'cos(cat, 10·cat) = 1.000',
  ], { size: 19 });
  s.text(440, 312, 'Scaling a vector changes its length, not its cosine.', { size: 19, color: C.muted });
  save('20.1-cosine.svg', s);
}

// 5. Least squares: the residual is orthogonal to each column of X. Numbers from exp.py.
{
  const s = new Sketch(880, 350, { title: 'Least-squares residual is orthogonal to both columns of X', seed: 205 });
  s.text(440, 34, 'Least squares: the residual is perpendicular to each column', { size: 26, weight: 700 });
  const xs = [160, 290, 420, 550, 680];
  const hdr = ['1', 'x', 'y', 'fit', 'resid'];
  hdr.forEach((h, i) => s.text(xs[i], 84, h, { font: 'mono', size: 20, weight: 700, color: i === 4 ? C.rose : C.ink }));
  s.line(90, 98, 790, 98, { color: C.muted, width: 1.5 });
  const rows = [
    ['1', '0', '1', '0.9', '0.1'],
    ['1', '1', '2', '1.8', '0.2'],
    ['1', '2', '2', '2.7', '-0.7'],
    ['1', '3', '4', '3.6', '0.4'],
  ];
  rows.forEach((r, j) => r.forEach((v, i) => s.text(xs[i], 132 + j * 38, v, { font: 'mono', size: 20, color: i === 4 ? C.rose : C.ink })));
  s.line(90, 292, 790, 292, { color: C.muted, width: 1 });
  s.text(xs[0] - 30, 322, '1ᵀr = 0', { font: 'mono', size: 20, color: C.green, anchor: 'start' });
  s.text(xs[1] + 20, 322, 'xᵀr = 0', { font: 'mono', size: 20, color: C.green, anchor: 'start' });
  s.text(640, 322, 'exact up to rounding', { size: 19, color: C.muted, anchor: 'start' });
  save('20.1-least-squares.svg', s);
}
console.log('ok');
