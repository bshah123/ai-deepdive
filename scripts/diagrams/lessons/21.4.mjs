// Diagrams for Lesson 21.4 (perceptron learning algorithm, Novikoff bound). Run: node scripts/diagrams/lessons/21.4.mjs
// Every number comes from 21.4_data.json, written by 21.4_experiment.py (run once with the lesson venv).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-21-neural-networks/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '21.4_data.json'), 'utf8'));
const save = (name, s) => { writeFileSync(join(OUT, name), s.toString()); console.log('wrote', name); };
const fmtW = (w) => `(${w.map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(2))).join(', ')})`;

// ---------------------------------------------------------------- 1. the hand-traced run, one panel per weight vector
{
  const W = D.worked;
  const states = [{ w: [0, 0, 0], trig: -1, cap: 'start' }];
  for (const t of W.trace) states.push({ w: t.w_after, trig: t.point, cap: `update ${t.update}: point ${t.point + 1}` });
  const s = new Sketch(880, 340, { title: 'Five boundaries during the worked example, one per weight vector', seed: 2101 });
  s.text(440, 34, 'Each mistake moves the boundary', { size: 24, weight: 700 });
  const P = 150, GAP = 16, X0 = 33, Y0 = 70;
  const at = (x, y, i) => [X0 + i * (P + GAP) + ((x + 2) / 4) * P, Y0 + ((2 - y) / 4) * P];
  states.forEach((st, i) => {
    const px = X0 + i * (P + GAP);
    s.rect(px, Y0, P, P, { color: C.muted, width: 1.2 });
    const [a, b, c] = st.w;
    if (a !== 0 || b !== 0) {                              // boundary a*x1 + b*x2 + c = 0, clipped to [-2, 2]^2
      const hits = [];
      if (Math.abs(b) > 1e-9) for (const X of [-2, 2]) { const Y = -(a * X + c) / b; if (Math.abs(Y) <= 2 + 1e-9) hits.push([X, Y]); }
      if (Math.abs(a) > 1e-9) for (const Y of [-2, 2]) { const X = -(b * Y + c) / a; if (Math.abs(X) <= 2 + 1e-9) hits.push([X, Y]); }
      const uniq = [];
      for (const h of hits) if (!uniq.some((u) => Math.abs(u[0] - h[0]) < 1e-9 && Math.abs(u[1] - h[1]) < 1e-9)) uniq.push(h);
      if (uniq.length >= 2) {
        const p = at(uniq[0][0], uniq[0][1], i), q = at(uniq[1][0], uniq[1][1], i);
        s.line(p[0], p[1], q[0], q[1], { color: C.ink, width: 2.5 });
      }
    }
    if (st.trig >= 0) { const [rx, ry] = at(W.points[st.trig][0], W.points[st.trig][1], i); s.circle(rx, ry, 30, { color: C.amber, width: 3 }); }
    W.points.forEach((p, j) => {
      const [cx, cy] = at(p[0], p[1], i);
      s.circle(cx, cy, 16, { color: W.labels[j] > 0 ? C.blue : C.rose, fill: W.labels[j] > 0 ? C.blue : C.rose, fillStyle: 'solid' });
    });
    s.text(px + P / 2, Y0 + P + 26, st.cap, { size: 16 });
    s.text(px + P / 2, Y0 + P + 50, `w = ${fmtW(st.w)}`, { size: 16, font: 'mono' });
  });
  s.text(440, 318, 'Blue = label +1, rose = label −1; the ring marks the point that triggered the update.', { size: 16 });
  save('21.4-pla-trace.svg', s);
}

// ---------------------------------------------------------------- 2. geometry of one update
{
  const s = new Sketch(880, 400, { title: 'One perceptron update seen against the unit separator w*', seed: 2102 });
  const ox = 170, oy = 310;
  const P = (X, Y) => [ox + X, oy - Y];
  s.text(440, 34, 'One update: the projection on w* grows, the norm barely does', { size: 23, weight: 700 });
  const [ax, ay] = P(300, 0);
  s.arrow(ox, oy, ax, ay, { color: C.violet, width: 2 });
  s.text(500, 332, 'w* (unit separator)', { size: 18, color: C.violet, anchor: 'start' });
  const [t1x, t1y] = P(140, 90);                         // w(k-1)
  s.arrow(ox, oy, t1x, t1y, { color: C.blue, width: 3 });
  s.text(t1x - 10, t1y - 12, 'w(k-1)', { size: 18, color: C.blue, anchor: 'end' });
  const [t2x, t2y] = P(200, -20);                        // w(k) = w(k-1) + y x
  s.arrow(t1x, t1y, t2x, t2y, { color: C.green, width: 3 });
  s.text(392, 258, 'y x (the update)', { size: 17, color: C.green, anchor: 'start' });
  s.text(392, 280, 'length ≤ R', { size: 17, color: C.green, anchor: 'start' });
  s.arrow(ox, oy, t2x, t2y, { color: C.ink, width: 3 });
  s.text(t2x + 12, t2y + 22, 'w(k)', { size: 18, anchor: 'start' });
  s.line(t1x, t1y, t1x, 365, { color: C.muted, dash: '6 8' });
  s.line(t2x, t2y, t2x, 365, { color: C.muted, dash: '6 8' });
  s.line(t1x, 365, t2x, 365, { color: C.amber, width: 5 });
  s.text((t1x + t2x) / 2, 392, 'projection on w* grows by ≥ γ', { size: 18 });
  s.note(540, 90, 310, 135, [
    'Update only on a mistake:',
    'y(w(k-1)·x) ≤ 0, so the cross term is ≤ 0.',
    'Norm: |w(k)|² ≤ |w(k-1)|² + R².',
    'Projection: w(k)·w* ≥ w(k-1)·w* + γ.',
  ], { size: 17 });
  save('21.4-update-geometry.svg', s);
}

// ---------------------------------------------------------------- 3. measured updates against the bound (log-log)
{
  const rows = D.random.rows;
  const s = new Sketch(880, 400, { title: 'Measured update counts against Novikoff bound on 300 random datasets', seed: 2103 });
  s.text(440, 34, 'Measured updates sit far below the Novikoff bound', { size: 24, weight: 700 });
  const bmin = Math.min(...rows.map((r) => r.bound_star)), bmax = Math.max(...rows.map((r) => r.bound_star));
  const umin = Math.min(...rows.map((r) => r.updates)), umax = Math.max(...rows.map((r) => r.updates));
  const lo = 10 ** Math.floor(Math.log10(Math.min(bmin, umin)));
  const hi = 10 ** Math.ceil(Math.log10(Math.max(bmax, umax)));
  const PX0 = 120, PX1 = 820, PY0 = 70, PY1 = 320;
  const lg = (v) => (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo));
  const X = (v) => PX0 + lg(v) * (PX1 - PX0);
  const Y = (v) => PY1 - lg(v) * (PY1 - PY0);
  s.line(PX0, PY1, PX1, PY1, { color: C.ink });
  s.line(PX0, PY0, PX0, PY1, { color: C.ink });
  s.line(X(lo), Y(lo), X(hi), Y(hi), { color: C.amber, dash: '8 8', width: 2 });
  for (let p = Math.log10(lo); p <= Math.log10(hi) + 1e-9; p++) {
    const v = 10 ** p;
    s.text(X(v), PY1 + 24, `10^${p}`, { size: 16, font: 'mono' });
    s.text(PX0 - 12, Y(v) + 6, `10^${p}`, { size: 16, font: 'mono', anchor: 'end' });
  }
  for (const r of rows) s.circle(X(r.bound_star), Y(r.updates), 8, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  s.text(X(hi) - 6, Y(hi) + 40, 'updates = bound', { size: 17, color: C.amber, anchor: 'end' });
  s.text((PX0 + PX1) / 2, 370, 'Novikoff bound (R/γ*)² (log scale)', { size: 19 });
  s.text(40, (PY0 + PY1) / 2, 'PLA updates (log scale)', { size: 19, rotate: -90 });
  const ratios = rows.map((r) => r.updates / r.bound_star).sort((a, b) => a - b);
  const med = ratios[Math.floor(ratios.length / 2)];
  s.note(PX0 + 20, PY0 + 12, 330, 70, [
    `${rows.length} random separable datasets, 0 violations`,
    `median updates / bound = ${med.toFixed(3)}`,
  ], { size: 17 });
  save('21.4-bound-vs-actual.svg', s);
}

// ---------------------------------------------------------------- 4. separable versus non-separable epochs
{
  const sep = D.separable.mistakes_per_epoch;
  const xor = D.nonseparable.xor_mistakes_per_epoch;
  const s = new Sketch(880, 350, { title: 'Mistakes per epoch: separable data reaches zero, XOR never does', seed: 2104 });
  s.text(440, 34, 'Mistakes per epoch: zero is reached only for separable data', { size: 23, weight: 700 });
  const base = 270, unit = 40;
  s.text(210, 72, 'Separable: worked example', { size: 20, weight: 700 });
  s.line(60, base, 360, base, { color: C.ink });
  sep.forEach((m, i) => {
    const left = 90 + i * 90, h = m * unit;
    if (h > 0) s.rect(left, base - h, 60, h, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(left + 30, base - h - 10, String(m), { size: 18, font: 'mono' });
    s.text(left + 30, base + 26, `epoch ${i + 1}`, { size: 16 });
  });
  s.text(640, 72, 'Non-separable: XOR, 20 epochs', { size: 20, weight: 700 });
  s.line(440, base, 840, base, { color: C.ink });
  const pts = xor.map((m, i) => [452 + i * 19 + 6, base - m * unit]);
  pts.forEach((p, i) => { if (i > 0) s.line(pts[i - 1][0], pts[i - 1][1], p[0], p[1], { color: C.rose, width: 2.5 }); });
  pts.forEach((p, i) => {
    s.circle(p[0], p[1], 8, { color: C.rose, fill: C.rose, fillStyle: 'solid' });
    if (i === 0 || i % 5 === 4) s.text(p[0], base + 26, String(i + 1), { size: 16 });
  });
  s.text(pts[0][0] + 14, pts[0][1] - 14, String(xor[0]), { size: 18, font: 'mono', anchor: 'start' });
  s.text(640, 318, 'epochs 1 to 20 (labels every 5); every epoch has 4 mistakes', { size: 16 });
  s.text(210, 318, 'a zero epoch stops the loop', { size: 16 });
  save('21.4-nonseparable.svg', s);
}

// ---------------------------------------------------------------- print the values the text uses
const rows = D.random.rows;
console.log('check: rows', rows.length, 'violations', D.random.violations_star,
  'ratio median', D.random.ratio_updates_over_bound.median.toFixed(4),
  'max', D.random.ratio_updates_over_bound.max.toFixed(4));
