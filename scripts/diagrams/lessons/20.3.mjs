// Diagrams for 20.3 (gradients, Jacobians, Hessians, Taylor series).
// Run: node scripts/diagrams/lessons/20.3.mjs
// Every number comes from scripts/diagrams/lessons/20.3_data.json (written by 20.3_experiment.py),
// or from the block outputs printed in the lesson (gradient (2, 4); Jacobian [[2, 4], [2, 1]]; F(1, 2) = (5, 2)).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-20-math-for-ml/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '20.3_data.json'), 'utf8'));

// ---------------------------------------------------------------- 20.3-gradient-contour.svg
{
  const s = new Sketch(880, 360, { title: 'Level curves of w0^2 + w1^2 as concentric circles; at the point (1, 2) the gradient arrow (2, 4) points outward, perpendicular to the circle through that point', seed: 2001 });
  s.text(440, 34, 'The gradient points uphill, perpendicular to level curves', { size: 25, weight: 700 });
  const cx = 250, cy = 205, u = 42;
  // level curves f = 1, 5, 10 (radius = sqrt(f) in units)
  for (const f of [1, 5, 10]) {
    const r = Math.sqrt(f) * u;
    s.circle(cx, cy, 2 * r, { color: C.muted, width: 1.5 });
    s.text(cx - r * 0.707 - 6, cy + r * 0.707 + 16, `f = ${f}`, { anchor: 'end', size: 17, color: C.muted });
  }
  s.line(cx - 150, cy, cx + 150, cy, { color: C.muted, dash: '4 6', width: 1 });
  s.line(cx, cy - 150, cx, cy + 150, { color: C.muted, dash: '4 6', width: 1 });
  const px = cx + 1 * u, py = cy - 2 * u;               // point (1, 2)
  s.circle(px, py, 12, { color: C.ink, fill: C.ink, fillStyle: 'solid' });
  s.text(px - 16, py - 14, '(1, 2)', { anchor: 'end', size: 18, font: 'mono' });
  s.arrow(px, py, px + 24, py - 48, { color: C.rose, width: 3, head: 14 });   // grad f = (2, 4), scaled
  s.text(px + 34, py - 36, 'grad f = (2, 4)', { anchor: 'start', size: 19, color: C.rose, font: 'mono' });
  s.arrow(px, py, px - 24, py + 48, { color: C.blue, width: 3, head: 14 });   // -grad f, descent
  s.text(px - 34, py + 62, '-grad f', { anchor: 'end', size: 19, color: C.blue, font: 'mono' });

  s.note(540, 92, 300, 210, [
    'f(w) = w0^2 + w1^2',
    'at (1, 2):  f = 5',
    'df/dw0 = 2 w0 = 2',
    'df/dw1 = 2 w1 = 4',
    'grad f = (2, 4)',
    'uphill: follow +grad f',
  ], { size: 19 });
  save('20.3-gradient-contour.svg', s);
}

// ---------------------------------------------------------------- 20.3-jacobian-shape.svg
{
  const s = new Sketch(880, 360, { title: 'A map from two inputs to two outputs, and its 2 by 2 Jacobian matrix of partial derivatives at (1, 2)', seed: 2002 });
  s.text(440, 34, 'The Jacobian: rows are outputs, columns are inputs', { size: 25, weight: 700 });
  s.rect(40, 80, 170, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(125, 122, 'x = (1, 2)', { font: 'mono', size: 19 });
  s.arrow(210, 115, 296, 115, { color: C.muted, head: 9 });
  s.rect(300, 66, 230, 98, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(415, 98, ['F(x) = (x0^2 + x1^2,', '          x0 * x1)'], { font: 'mono', size: 17 });
  s.text(415, 146, 'a map R^2 to R^2', { size: 18, color: C.muted });
  s.arrow(530, 115, 606, 115, { color: C.muted, head: 9 });
  s.rect(610, 80, 220, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(720, 122, 'F(1, 2) = (5, 2)', { font: 'mono', size: 19 });

  // matrix J at (1, 2), entries from the lesson's code output
  const x0 = 560, y0 = 200, cw = 96, ch = 58;
  s.text(x0 + cw / 2, y0 - 12, 'd/dx0', { size: 18, color: C.muted });
  s.text(x0 + cw * 1.5, y0 - 12, 'd/dx1', { size: 18, color: C.muted });
  s.text(x0 - 12, y0 + ch / 2 + 6, 'dF0', { anchor: 'end', size: 18, color: C.muted });
  s.text(x0 - 12, y0 + ch * 1.5 + 6, 'dF1', { anchor: 'end', size: 18, color: C.muted });
  const J = [[2, 4], [2, 1]];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    s.rect(x0 + c * cw, y0 + r * ch, cw, ch, { color: C.ink, width: 1.5 });
    s.text(x0 + c * cw + cw / 2, y0 + r * ch + ch / 2 + 8, String(J[r][c]), { font: 'mono', size: 26, weight: 700, color: C.blue });
  }
  s.text(x0 + cw, y0 + 2 * ch + 34, 'J at (1, 2)', { size: 20, color: C.ink });

  s.note(40, 200, 420, 130, [
    'J[i, j] = dF_i / dx_j',
    'shape: outputs x inputs (2 x 2 here)',
    'chain rule: grad(h o F) = J^T grad h',
  ], { size: 19 });
  save('20.3-jacobian-shape.svg', s);
}

// ---------------------------------------------------------------- 20.3-hessian-signs.svg
{
  const names = ['x^2 + y^2', 'x^2 - y^2', '-x^2 - y^2'];
  const s = new Sketch(880, 360, { title: 'Three quadratics with their Hessians and eigenvalue signs: positive, mixed and negative', seed: 2003 });
  s.text(440, 34, 'Eigenvalue signs of the Hessian classify a critical point', { size: 25, weight: 700 });
  const cols = [
    { color: C.green, fill: C.greenSoft, verdict: 'bowl: local minimum' },
    { color: C.amber, fill: C.amberSoft, verdict: 'saddle point' },
    { color: C.rose, fill: C.roseSoft, verdict: 'dome: local maximum' },
  ];
  names.forEach((name, i) => {
    const card = data.cards[name];
    const x = 40 + i * 290, y = 80, w = 250, h = 240;
    const eigs = card.eigs;
    const kind = eigs.every((e) => e > 0) ? 0 : eigs.every((e) => e < 0) ? 2 : 1;
    s.rect(x, y, w, h, { color: cols[kind].color, fill: cols[kind].fill, fillStyle: 'solid' });
    s.text(x + w / 2, y + 36, `f = ${name}`, { font: 'mono', size: 19, weight: 700 });
    const H = card.hess;
    s.text(x + w / 2, y + 92, [`H = [ ${H[0][0]}  ${H[0][1]} ]`, `    [ ${H[1][0]}  ${H[1][1]} ]`], { font: 'mono', size: 19 });
    s.text(x + w / 2, y + 160, `eigenvalues: ${eigs.map((e) => e.toFixed(0)).join(', ')}`, { font: 'mono', size: 17 });
    s.text(x + w / 2, y + 205, cols[kind].verdict, { size: 22, weight: 700 });
  });
  s.text(440, 348, 'All three Hessians are diagonal, so their eigenvalues are the diagonal entries.', { size: 18, color: C.muted });
  save('20.3-hessian-signs.svg', s);
}

// ---------------------------------------------------------------- 20.3-logistic-taylor.svg
{
  const d = data;
  const X = (t) => 100 + ((t + 2.5) / 5) * 700;
  const Y = (v) => 330 - ((v + 0.6) / 3.6) * 270;
  const s = new Sketch(880, 400, { title: 'Loss along one line with its first- and second-order Taylor approximations at w = 0', seed: 2004 });
  s.text(440, 34, 'Taylor models of the loss along one line', { size: 25, weight: 700 });
  s.arrow(90, Y(0), 815, Y(0), { color: C.muted, head: 9 });
  s.arrow(X(0), 330, X(0), 52, { color: C.muted, head: 9 });
  s.text(822, Y(0) + 6, 't', { size: 20, color: C.muted, anchor: 'start' });
  s.text(X(0) + 10, 66, 'loss', { size: 18, color: C.muted, anchor: 'start' });
  for (const t of [-2, -1, 1, 2]) s.text(X(t), Y(0) + 44, String(t), { size: 17, font: 'mono', color: C.muted });

  const poly = (arr, ys) => arr.map((t, i) => `${X(t).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(' ');
  const ts = d.curve_t;
  s.raw(`<polyline points="${poly(ts, d.curve_true)}" fill="none" stroke="${C.blue}" stroke-width="3.5" stroke-linejoin="round"/>`);
  s.raw(`<polyline points="${poly(ts, d.curve_second)}" fill="none" stroke="${C.green}" stroke-width="2.5" stroke-linejoin="round"/>`);
  s.raw(`<polyline points="${poly(ts, d.curve_first)}" fill="none" stroke="${C.amber}" stroke-width="2.5" stroke-dasharray="9 7" stroke-linejoin="round"/>`);
  for (const t of [1, 2]) {
    const p = d.taylor_points[t.toFixed(1)];
    s.circle(X(t), Y(p.true), 11, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  }

  s.text(120, 90, 'blue: true loss', { anchor: 'start', size: 19, color: C.blue });
  s.text(120, 118, 'green: second order', { anchor: 'start', size: 19, color: C.green });
  s.text(120, 146, 'amber dashed: first order', { anchor: 'start', size: 19, color: C.amber });
  const p1 = d.taylor_points['1.0'], p2 = d.taylor_points['2.0'];
  s.text(440, 368, `at t = 2: true ${p2.true.toFixed(4)}, first ${p2.first.toFixed(4)}, second ${p2.second.toFixed(4)}`, { size: 18, color: C.ink });
  s.text(440, 392, `at t = 1: error of second order ${p1.err2.toFixed(4)}`, { size: 18, color: C.muted });
  save('20.3-logistic-taylor.svg', s);
}

// ---------------------------------------------------------------- 20.3-h-sweep.svg
{
  const s = new Sketch(880, 400, { title: 'Accuracy digits of two finite-difference formulas against step size h', seed: 2005 });
  s.text(440, 34, 'Finite differences: the step size h trades two errors', { size: 25, weight: 700 });
  const base = 300, unit = 15;
  s.arrow(44, base, 840, base, { color: C.muted, head: 8 });
  // legend
  s.rect(560, 62, 22, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(592, 76, 'forward difference', { anchor: 'start', size: 18 });
  s.rect(560, 90, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(592, 104, 'central difference', { anchor: 'start', size: 18 });
  d_sweep(s, data.h_sweep, base, unit);
  s.text(60, 352, 'bar height = accurate digits, -log10(error); taller is better', { anchor: 'start', size: 18, color: C.ink });
  s.text(60, 380, 'large h: truncation error; tiny h: round-off error (about 1e-16 relative)', { anchor: 'start', size: 18, color: C.muted });
  save('20.3-h-sweep.svg', s);
}

function d_sweep(s, sweep, base, unit) {
  sweep.forEach((r, i) => {
    const gx = 64 + i * 56;
    const dF = Math.max(0, -Math.log10(r.forward_err));
    const dC = Math.max(0, -Math.log10(r.central_err));
    s.rect(gx, base - dF * unit, 22, dF * unit, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.rect(gx + 24, base - dC * unit, 22, dC * unit, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(gx + 23, base + 22, `1e-${String(i + 1).padStart(2, '0')}`, { font: 'mono', size: 15, color: C.muted });
  });
}
