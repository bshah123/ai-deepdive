import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-20-math-for-ml/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below comes from 20.5_experiment.py (writes 20.5_data.json).
const D = JSON.parse(readFileSync(join(HERE, '20.5_data.json'), 'utf8'));
const f3 = (v) => Number(v).toFixed(3);
const f1 = (v) => Number(v).toFixed(1);

// Draws a 2x2 matrix with brackets; ox = left edge of the block, oy = top row.
function mat(s, ox, oy, M, color) {
  const bot = oy + 140;
  for (const bx of [ox - 10, ox + 150]) {
    const dir = bx < ox ? 1 : -1;
    s.line(bx, oy, bx, bot, { color: C.ink, width: 2 });
    s.line(bx, oy, bx + 8 * dir, oy, { color: C.ink, width: 2 });
    s.line(bx, bot, bx + 8 * dir, bot, { color: C.ink, width: 2 });
  }
  const cols = [ox + 35, ox + 105], rows = [oy + 35, oy + 105];
  rows.forEach((ry, i) => cols.forEach((cx, j) => s.text(cx, ry + 8, f1(M[i][j]), { font: 'mono', size: 22, color })));
}

// Polyline through points [[x, y], ...] as a raw SVG path.
const path = (s, pts, color, dash = '') =>
  s.raw(`<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);

// 1. Symmetrisation: A = sym + skew, and the skew part contributes 0 to x^T A x.
{
  const s = new Sketch(880, 330, { title: 'A equals its symmetric part plus its skew part; the skew part gives 0 for x = (3, 1)', seed: 501 });
  s.text(440, 34, 'Only the symmetric part of A changes x^T A x', { size: 26, weight: 700 });
  mat(s, 90, 90, D.A_raw, C.amber);
  mat(s, 330, 90, D.A_sym, C.blue);
  mat(s, 570, 90, D.A_skew, C.rose);
  s.text(285, 172, '=', { size: 30, color: C.muted });
  s.text(525, 172, '+', { size: 30, color: C.muted });
  s.text(160, 262, 'A, not symmetric', { size: 18, color: C.muted });
  s.text(400, 262, 'symmetric part (A + Aᵀ)/2', { size: 18, color: C.muted });
  s.text(640, 262, 'skew part (A − Aᵀ)/2', { size: 18, color: C.muted });
  s.text(440, 310, `For x = (3, 1): xᵀ(skew)x = ${f1(D.xKx)}, so xᵀAx = xᵀ(sym)x = ${f1(D.xAx_raw)}`, { size: 20 });
  save('20.5-symmetrize.svg', s);
}

// 2. Cholesky trap: np.linalg.cholesky reads only the lower triangle.
{
  const s = new Sketch(880, 300, { title: 'np.linalg.cholesky accepts a non-symmetric matrix; x^T B x is negative', seed: 502 });
  s.text(440, 34, 'The Cholesky check misses a non-symmetric input', { size: 26, weight: 700 });
  const boxes = [
    { x: 30, color: C.rose, fill: C.roseSoft, lines: ["B (not symmetric)", "[ 1   10 ]", "[ 0    1 ]", "the 10 is never read"] },
    { x: 315, color: C.amber, fill: C.amberSoft, lines: ["cholesky(B) returns", "L = [1 0; 0 1]", "no error raised", "lower triangle only"] },
    { x: 600, color: C.rose, fill: C.roseSoft, lines: ["x = (1, −1)", `xᵀBx = ${f1(D.xBx_counter)} < 0`, "so B is not PD,", "the check says True"] },
  ];
  for (const b of boxes) {
    s.rect(b.x, 80, 240, 170, { color: b.color, fill: b.fill, fillStyle: 'solid' });
    b.lines.forEach((ln, i) => s.text(b.x + 120, 118 + i * 34, ln, { size: i === 0 ? 19 : 16, font: i === 0 ? "hand" : "mono", weight: i === 0 ? 700 : 400 }));
  }
  s.arrow(272, 165, 312, 165, { color: C.muted });
  s.arrow(557, 165, 597, 165, { color: C.muted });
  s.text(440, 282, 'Rule: check symmetry first, then Cholesky (see the fixed code in the lesson).', { size: 18, color: C.muted });
  save('20.5-cholesky-trap.svg', s);
}

// 3. Definiteness by level sets: ellipses (definite) versus hyperbolas (indefinite).
{
  const s = new Sketch(880, 360, { title: 'Level sets of x^T A x: ellipses for the definite matrix, hyperbolas for the saddle', seed: 503 });
  s.text(440, 34, 'Level sets tell definiteness at a glance', { size: 26, weight: 700 });
  s.text(220, 72, 'Positive definite: a bowl', { size: 21, weight: 700, color: C.blue });
  s.text(660, 72, 'Indefinite: a saddle', { size: 21, weight: 700, color: C.rose });
  // Bowl: A = S with eigenvalues 6 (v1) and 1 (v2). Level c: 6 u^2 + 1 w^2 = c.
  const SC = 52, bx = 220, by = 205;
  const [v1x, v1y] = D.v1, [v2x, v2y] = D.v2, [l1, l2] = D.eigs_desc;
  for (const c of D.bowl_levels) {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const t = (2 * Math.PI * i) / 120;
      const u = Math.sqrt(c / l1) * Math.cos(t), w = Math.sqrt(c / l2) * Math.sin(t);
      pts.push([bx + SC * (u * v1x + w * v2x), by - SC * (u * v1y + w * v2y)]);
    }
    path(s, pts, C.blue);
  }
  s.line(bx - 125 * v1x, by + 125 * v1y, bx + 125 * v1x, by - 125 * v1y, { color: C.muted, dash: '6 8', width: 1.5 });
  s.line(bx - 125 * v2x, by + 125 * v2y, bx + 125 * v2x, by - 125 * v2y, { color: C.muted, dash: '6 8', width: 1.5 });
  s.text(bx + 135 * v1x, by - 135 * v1y + 6, `λ = ${f1(l1)}`, { size: 17, color: C.muted });
  s.text(bx + 135 * v2x, by - 135 * v2y + 6, `λ = ${f1(l2)}`, { size: 17, color: C.muted });
  // Saddle: diag(2, -3). Level c: 2 x^2 - 3 y^2 = c.
  const sx = 660;
  for (const c of [1, 2]) {
    const L = [], R = [];
    for (let i = 0; i <= 120; i++) {
      const y = -1.5 + (3 * i) / 120;
      const x = Math.sqrt((c + 3 * y * y) / 2);
      L.push([sx - SC * x, by - SC * y]); R.push([sx + SC * x, by - SC * y]);
    }
    path(s, L, C.blue); path(s, R, C.blue);
  }
  for (const c of [-1, -2]) {
    const U = [], Dn = [];
    for (let i = 0; i <= 120; i++) {
      const x = -1.8 + (3.6 * i) / 120;
      const y = Math.sqrt((2 * x * x - c) / 3);
      U.push([sx + SC * x, by - SC * y]); Dn.push([sx + SC * x, by + SC * y]);
    }
    path(s, U, C.amber); path(s, Dn, C.amber);
  }
  s.line(sx - 130, by, sx + 130, by, { color: C.muted, dash: '6 8', width: 1.5 });
  s.line(sx, by - 105, sx, by + 105, { color: C.muted, dash: '6 8', width: 1.5 });
  s.text(sx + 150, by + 6, 'λ = 2', { size: 17, color: C.muted, anchor: 'start' });
  s.text(sx + 8, by - 100, "λ = −3", { size: 17, color: C.muted, anchor: 'start' });
  s.text(440, 340, 'Blue: f = c > 0 (c = 1, 2, 4 on the bowl; c = 1, 2 on the saddle). Amber: f = −1, −2.', { size: 17, color: C.muted });
  save('20.5-level-sets.svg', s);
}

// 4. Rayleigh quotient range: sampled values stay inside [lambda_min, lambda_max].
{
  const s = new Sketch(880, 300, { title: 'Rayleigh quotient of random unit vectors lies between the eigenvalues 1 and 6', seed: 504 });
  s.text(440, 34, 'Random directions never leave [λ_min, λ_max]', { size: 26, weight: 700 });
  const px = (v) => 60 + v * (760 / 7);
  s.line(60, 235, 820, 235, { color: C.ink, width: 2 });
  for (let v = 0; v <= 7; v++) {
    s.line(px(v), 235, px(v), 241, { color: C.ink, width: 2 });
    s.text(px(v), 262, String(v), { size: 18, font: 'mono' });
  }
  D.rq_samples_for_hist.forEach((r, i) => {
    s.circle(px(r), 170 + 12 * Math.sin(i * 2.399), 6, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  });
  for (const [v, label, col, anc] of [[1, "λ_min = 1", C.green, "start"], [D.RQ_x, "R(x) = 3.5 at x = (3, 1)", C.amber, "middle"], [6, "λ_max = 6", C.green, "end"]]) {
    s.line(px(v), 118, px(v), 235, { color: col, dash: "6 8", width: 1.5 });
    s.text(px(v) + (anc === "start" ? 6 : anc === "end" ? -6 : 0), 108, label, { size: 18, color: col, anchor: anc });
  }
  s.text(440, 290, `400 of ${D.n_samples.toLocaleString('en-US')} random unit vectors (seed 20). Min ${f3(D.rq_min_sampled)}, max ${f3(D.rq_max_sampled)}, mean ${f3(D.rq_mean_sampled)}.`, { size: 17, color: C.muted });
  save('20.5-rayleigh-range.svg', s);
}

// 5. PCA: variance of the projection Xv as the direction rotates peaks at the principal eigenvector.
{
  const s = new Sketch(880, 380, { title: "Variance of Xv over unit directions peaks at lambda_max of the covariance", seed: 505 });
  s.text(440, 34, 'Projected variance peaks along the principal eigenvector', { size: 26, weight: 700 });
  const X = (th) => 110 + (th / Math.PI) * 680;
  const Y = (v) => 300 - v * 60;
  s.line(110, 300, 790, 300, { color: C.ink, width: 2 });
  s.line(110, 60, 110, 300, { color: C.ink, width: 2 });
  for (const v of [0, 1, 2, 3, 4]) s.text(96, Y(v) + 6, String(v), { size: 18, font: 'mono', anchor: 'end' });
  for (const [th, lab] of [[0, '0'], [Math.PI / 2, 'π/2'], [Math.PI, 'π']]) s.text(X(th), 326, lab, { size: 18, font: 'mono' });
  s.text(450, 352, 'angle θ of the unit vector v = (cos θ, sin θ), radians', { size: 18, color: C.muted });
  s.text(52, 180, 'Var(Xv)', { size: 18, color: C.muted, rotate: -90 });
  s.line(X(D.pca_theta_v1), 60, X(D.pca_theta_v1), 300, { color: C.amber, dash: '6 8', width: 1.5 });
  s.text(X(D.pca_theta_v1) + 8, 74, `v1 at θ = ${f3(D.pca_theta_v1)}`, { size: 18, color: C.amber, anchor: 'start' });
  s.line(110, Y(D.pca_lambda_max), 790, Y(D.pca_lambda_max), { color: C.green, dash: '6 8', width: 1.5 });
  s.text(700, Y(D.pca_lambda_max) - 10, `λ_max = ${f3(D.pca_lambda_max)}`, { size: 18, color: C.green });
  const pts = D.pca_angles.map((th, i) => [X(th), Y(D.pca_var[i])]);
  path(s, pts, C.blue);
  s.text(440, 372, "91 angles, 2° apart; 500 centred points (seed 7)", { size: 17, color: C.muted });
  save('20.5-pca-variance.svg', s);
}

console.log('wrote 5 diagrams to', OUT);
