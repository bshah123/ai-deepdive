import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-03-ml-nlp/chapter-20-math-for-ml/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from scratchpad experiment 20.2/exp.py and exp2.py (NumPy run, seed 0 for the data matrix).

// 1. Eigenvectors of A = [[4,1],[2,3]]: A only stretches v1 and v2.
{
  const s = new Sketch(880, 340, { title: 'Eigenvectors of A are only stretched by A; a generic vector is turned', seed: 201 });
  const ox = 300, oy = 200, k = 26;
  const P = (x, y) => [ox + x * k, oy - y * k];
  const arr = (x, y, o) => { const [X, Y] = P(x, y); s.arrow(ox, oy, X, Y, o); };
  s.text(440, 30, 'Eigenvectors: A only stretches them', { size: 26, weight: 700 });
  s.line(40, oy, 600, oy, { color: C.muted, width: 1 });
  s.line(ox, 60, ox, 320, { color: C.muted, width: 1 });
  arr(1, 0, { color: C.muted, dash: '6 8' });
  arr(4, 2, { color: C.rose, width: 2.4 });
  s.text(418, 150, 'A x = (4, 2)', { size: 19, anchor: 'start', color: C.rose });
  s.text(40, 230, 'x = (1, 0)', { size: 17, anchor: 'start', color: C.muted });
  arr(1, 1, { color: C.blue, width: 2 });
  arr(5, 5, { color: C.blue, width: 2.6 });
  s.text(446, 62, 'A v1 = 5 v1', { size: 19, anchor: 'start', color: C.blue });
  arr(1, -2, { color: C.green, width: 2 });
  arr(2, -4, { color: C.green, width: 2.6 });
  s.text(368, 318, 'A v2 = 2 v2', { size: 19, anchor: 'start', color: C.green });
  s.note(630, 92, 220, 176, ['v1 = (1, 1): eigenvalue 5', 'v2 = (1, -2): eigenvalue 2', 'A x turns x; A v1 and A v2', 'only scale their own direction'], { size: 18 });
  save('20.2-eigen-stretch.svg', s);
}

// 2. SVD of A = [[4,1],[2,3]]: unit circle -> ellipse. Singular values 5.1167 and 1.9544.
{
  const s = new Sketch(880, 470, { title: 'A maps the unit circle to an ellipse whose axes are sigma1 u1 and sigma2 u2', seed: 301 });
  const A = [[4, 1], [2, 3]];
  const r = 36, Lcx = 210, Rcx = 640, cy = 240;
  const apply = (x, y) => [A[0][0] * x + A[0][1] * y, A[1][0] * x + A[1][1] * y];
  s.text(440, 30, 'Any 2x2 matrix maps the unit circle to an ellipse', { size: 25, weight: 700 });
  // left: unit circle with right singular vectors v1, v2
  s.circle(Lcx, cy, 2 * r, { color: C.ink });
  const v1 = [-0.8507, -0.5257], v2 = [-0.5257, 0.8507];
  s.arrow(Lcx, cy, Lcx + r * v1[0], cy - r * v1[1], { color: C.blue, width: 2.2 });
  s.arrow(Lcx, cy, Lcx + r * v2[0], cy - r * v2[1], { color: C.green, width: 2.2 });
  s.text(Lcx - 46, cy - r * v1[1] + 22, 'v1', { size: 22, color: C.blue });
  s.text(Lcx - 40, cy - r * v2[1] - 10, 'v2', { size: 22, color: C.green });
  s.text(Lcx, 360, ['input: unit circle', 'and right singular vectors v1, v2'], { size: 18, color: C.muted });
  // middle arrow labelled with A
  s.arrow(290, cy, 420, cy, { color: C.muted, width: 2 });
  s.text(355, cy - 14, 'apply A', { size: 20, color: C.muted });
  // right: image of the circle, sampled from A itself
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const t = (2 * Math.PI * i) / 120;
    const [x, y] = apply(Math.cos(t), Math.sin(t));
    pts.push([Rcx + r * x, cy - r * y]);
  }
  s.raw(`<path d="M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')}" fill="none" style="stroke:${C.ink}" stroke-width="2"/>`);
  // sigma_i u_i = A v_i (numbers from numpy: s1 = 5.1167, s2 = 1.9544)
  const u1 = [-0.7678, -0.6407], u2 = [-0.6407, 0.7678];
  s.arrow(Rcx, cy, Rcx + r * 5.1167 * u1[0], cy - r * 5.1167 * u1[1], { color: C.blue, width: 2.2 });
  s.arrow(Rcx, cy, Rcx + r * 1.9544 * u2[0], cy - r * 1.9544 * u2[1], { color: C.green, width: 2.2 });
  s.text(Rcx + r * 5.1167 * u1[0] - 64, cy - r * 5.1167 * u1[1] + 8, 's1 u1', { size: 22, color: C.blue });
  s.text(Rcx + r * 1.9544 * u2[0] + 4, cy - r * 1.9544 * u2[1] + 40, 's2 u2', { size: 22, color: C.green });
  s.text(Rcx, 420, ['output: ellipse, semi-axes s1 = 5.12 and s2 = 1.95'], { size: 18, color: C.muted });
  s.text(440, 452, 'A = U S Vt  with s1 = 5.1167, s2 = 1.9544 (the singular values)', { size: 19 });
  save('20.2-svd-ellipse.svg', s);
}

// 3. Singular values of a noisy rank-3 data matrix (200 x 20, seed 0): elbow after k = 3.
{
  const vals = [86.5034, 52.3235, 44.0194, 1.7431, 1.7145, 1.6629, 1.5722, 1.5269, 1.4682, 1.4482];
  const s = new Sketch(880, 380, { title: 'Singular values of a rank-3 signal plus noise: three large values, then a floor', seed: 401 });
  const base = 320, scale = 2.8;
  s.text(400, 30, 'Singular values: three large values, then a flat floor', { size: 25, weight: 700 });
  s.line(60, base, 640, base, { color: C.muted, width: 1 });
  vals.forEach((v, i) => {
    const x = 80 + i * 56, h = v * scale;
    const col = i < 3 ? C.blue : C.amber;
    const fill = i < 3 ? C.blueSoft : C.amberSoft;
    s.rect(x, base - h, 40, h, { color: col, fill, fillStyle: 'solid', width: 1.6 });
    s.text(x + 20, base - h - 8, v.toFixed(1), { size: 16, font: 'mono' });
    s.text(x + 20, base + 26, String(i + 1), { size: 18 });
  });
  s.text(350, base + 56, 'index k of the singular value', { size: 18, color: C.muted });
  s.line(236, 110, 236, base, { color: C.muted, dash: '6 8', width: 1.2 });
  s.text(150, 62, 'signal: 3 values', { size: 19, anchor: 'start', color: C.blue });
  s.text(250, 268, 'noise floor: all values <= 1.75', { size: 19, anchor: 'start', color: C.amber });
  s.note(676, 90, 186, 170, ['relative rank-k error', 'k=1: 62%', 'k=2: 40%', 'k=3: 5.2%', 'k=4: 4.9%'], { size: 18 });
  save('20.2-singular-spectrum.svg', s);
}

// 4. PCA by SVD: the pipeline.
{
  const s = new Sketch(880, 300, { title: 'PCA with SVD: centre the data, factor it, keep the top components', seed: 501 });
  s.text(440, 30, 'PCA with SVD: centre, factor, keep the top rows', { size: 25, weight: 700 });
  const boxes = [
    ['X: 200 samples', 'x 20 features', C.blue, C.blueSoft],
    ['centre the columns', 'Xc = X - mean', C.amber, C.amberSoft],
    ['SVD: Xc = U S Vt', 'rows of Vt = directions', C.green, C.greenSoft],
    ['keep k = 3', 'Z = Xc V3 is 200 x 3', C.rose, C.roseSoft],
  ];
  boxes.forEach(([a, b, col, fill], i) => {
    const x = 30 + i * 215;
    s.rect(x, 90, 180, 110, { color: col, fill, fillStyle: 'solid', width: 1.6 });
    s.text(x + 90, 130, a, { size: 19 });
    s.text(x + 90, 162, b, { size: 17, color: C.muted });
    if (i < 3) s.arrow(x + 186, 145, x + 213, 145, { color: C.muted, width: 2, head: 10 });
  });
  s.text(440, 236, 'variance of component i is s_i^2 / (n-1)', { size: 20 });
  s.text(440, 268, 'shares of variance: 61.4%, 22.5%, 15.9%, together 99.7%', { size: 20 });
  save('20.2-pca-pipeline.svg', s);
}
console.log('wrote 20.2 diagrams');
