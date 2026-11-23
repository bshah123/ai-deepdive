// Diagrams for 19.1 (ML problem formulation & empirical risk).
// Run: node scripts/diagrams/lessons/19.1.mjs
// Every number comes from scripts/diagrams/lessons/19.1_data.json (written by 19.1_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-19-ml-foundations/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '19.1_data.json'), 'utf8'));

// ---------------------------------------------------------------- 19.1-pipeline.svg
{
  const s = new Sketch(880, 280, { title: 'Four pieces of a supervised problem: a sample, a hypothesis class, a loss and an average, followed by an argmin over the class', seed: 1901 });
  s.text(440, 34, 'From data to a chosen model', { size: 26, weight: 700 });
  const boxes = [
    { x: 30, c: C.blue, fill: C.blueSoft, l1: 'Sample S', l2: 'n pairs (x, y)' },
    { x: 245, c: C.amber, fill: C.amberSoft, l1: 'Hypothesis class H', l2: 'h_w(x) = w * x' },
    { x: 460, c: C.green, fill: C.greenSoft, l1: 'Loss', l2: '(h(x) - y)^2' },
    { x: 675, c: C.violet, fill: C.blueSoft, l1: 'Average', l2: 'R_S(h) = mean loss' },
  ];
  for (const b of boxes) {
    s.rect(b.x, 70, 180, 100, { color: b.c, fill: b.fill, fillStyle: 'solid' });
    s.text(b.x + 90, 112, b.l1, { size: 18, weight: 700 });
    s.text(b.x + 90, 146, b.l2, { font: 'mono', size: 15 });
  }
  s.arrow(214, 120, 241, 120, { color: C.muted, head: 8 });
  s.arrow(429, 120, 456, 120, { color: C.muted, head: 8 });
  s.arrow(644, 120, 671, 120, { color: C.muted, head: 8 });
  s.note(30, 190, 825, 66, [
    'Only S is observed. The true risk R(h) averages the loss over all of D, so it is unknown.',
    'ERM outputs h_S = argmin over H of R_S(h), the hypothesis with the lowest empirical risk.',
  ], { size: 17 });
  save('19.1-pipeline.svg', s);
}

// ---------------------------------------------------------------- 19.1-worked-example.svg
{
  const s = new Sketch(880, 390, { title: 'Four data points, the best line through the origin h(x) = 1.3x, and the four residuals drawn as dashed vertical segments', seed: 1902 });
  s.text(440, 34, 'Four points, one slope, one best fit', { size: 26, weight: 700 });
  // axes: px = 110 + 100 x, py = 310 - 40 y
  s.line(110, 310, 620, 310, { color: C.muted, width: 2 });
  s.line(110, 310, 110, 60, { color: C.muted, width: 2 });
  [1, 2, 3, 4].forEach((x) => s.text(110 + 100 * x, 334, String(x), { size: 16 }));
  [1, 2, 3, 4, 5, 6].forEach((y) => s.text(96, 310 - 40 * y + 5, String(y), { size: 16, anchor: 'end' }));
  // fitted line h(x) = w* x, w* = data.w_star
  const w = data.w_star;
  s.line(110 + 100 * 0.6, 310 - 40 * w * 0.6, 110 + 100 * 4.6, 310 - 40 * w * 4.6, { color: C.green, width: 3 });
  s.text(290, 96, 'fitted line h(x) = 1.3 x', { size: 18, anchor: 'start', color: C.green, weight: 700 });
  // residuals: prediction minus target, drawn from the point to the line
  const xs = data.x, ys = data.y, res = data.residuals_w_star;
  xs.forEach((x, i) => {
    const px = 110 + 100 * x, py = 310 - 40 * ys[i], pl = 310 - 40 * w * x;
    s.line(px, py, px, pl, { color: C.rose, width: 2, dash: '5 5' });
    const mid = (py + pl) / 2;
    const r = res[i];
    const label = (r >= 0 ? '+' : '') + r.toFixed(1);
    // labels go on the side of the segment away from the fitted line
    if (r < 0) s.text(px - 12, mid + 5, label, { size: 17, anchor: 'end', color: C.rose });
    else s.text(px + 13, mid + 5, label, { size: 17, anchor: 'start', color: C.rose });
  });
  xs.forEach((x, i) => s.circle(110 + 100 * x, 310 - 40 * ys[i], 12, { color: C.blue, fill: C.blue, fillStyle: 'solid' }));
  s.note(640, 90, 210, 200, [
    'Squared residuals',
    '0.49 + 0.16',
    '+ 1.21 + 1.44',
    '= 3.30',
    'R_S = 3.30 / 4',
    '= 0.825',
  ], { size: 18 });
  s.text(440, 372, 'Dots: data. Green: fitted line. Dashed: residual, prediction minus target.', { size: 17 });
  save('19.1-worked-example.svg', s);
}

// ---------------------------------------------------------------- 19.1-risk-curve.svg
{
  const s = new Sketch(880, 390, { title: 'Empirical risk of h_w(x) = w x on four points as a function of the slope w, a parabola with its minimum at w = 1.3', seed: 1903 });
  s.text(440, 34, 'Empirical risk as a function of the slope w', { size: 26, weight: 700 });
  const px = (w) => 110 + (w - 0.6) * (690 / 1.4);   // w in [0.6, 2.0]
  const py = (r) => 330 - 52 * r;                    // risk in [0, 5]
  s.line(110, 330, 800, 330, { color: C.muted, width: 2 });
  s.line(110, 330, 110, 70, { color: C.muted, width: 2 });
  [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0].forEach((w) => s.text(px(w), 354, w.toFixed(1), { size: 16 }));
  [0, 1, 2, 3, 4, 5].forEach((r) => s.text(96, py(r) + 5, String(r), { size: 16, anchor: 'end' }));
  const pts = data.curve_w.map((w, i) => [w, data.curve_risk[i]]).filter(([w]) => w >= 0.6 - 1e-9 && w <= 2.0 + 1e-9);
  for (let i = 1; i < pts.length; i++) {
    s.line(px(pts[i - 1][0]), py(pts[i - 1][1]), px(pts[i][0]), py(pts[i][1]), { color: C.blue, width: 3 });
  }
  const marks = [
    [1.0, data.risk_w1, 'w = 1: R_S = 1.5', 14, -14, 'start'],
    [1.5, data.risk_w1_5, 'w = 1.5: R_S = 1.125', 30, 42, 'start'],
    [data.w_star, data.risk_w_star, 'w* = 1.3: R_S = 0.825', -16, 30, 'end'],
  ];
  for (const [w, r, label, dx, dy, anchor] of marks) {
    s.circle(px(w), py(r), 12, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
    s.text(px(w) + dx, py(r) + dy, label, { size: 17, anchor });
  }
  s.text(120, 62, 'R_S(w)', { size: 18, anchor: 'start' });
  s.text(455, 380, 'w (slope of h_w(x) = w x)', { size: 18 });
  save('19.1-risk-curve.svg', s);
}

// ---------------------------------------------------------------- 19.1-sweep.svg
{
  const s = new Sketch(880, 440, { title: 'Log-scale chart: training risk falls as polynomial degree rises, true risk is U-shaped and rises steeply from degree 6, against a dashed noise floor of 0.09', seed: 1904 });
  s.text(440, 34, 'Training risk falls; true risk is U-shaped', { size: 26, weight: 700 });
  const px = (d) => 130 + (d - 1) * 60;
  const py = (L) => 380 - (L + 2) * (330 / 10.5); // L = log10(risk), range [-2, 8.5]
  s.line(120, 380, 800, 380, { color: C.muted, width: 2 });
  s.line(120, 380, 120, 50, { color: C.muted, width: 2 });
  const labels = ['0.1', '1', '10', '100', '1e3', '1e4', '1e5', '1e6', '1e7', '1e8'];
  labels.forEach((t, k) => s.text(108, py(k - 1) + 5, t, { size: 15, anchor: 'end', font: 'mono' }));
  for (let d = 1; d <= 12; d++) s.text(px(d), 402, String(d), { size: 15 });
  s.text(460, 428, 'polynomial degree d', { size: 18 });
  s.text(52, 215, 'mean squared error (log scale)', { size: 17, rotate: -90 });
  const fy = py(Math.log10(data.bayes_floor));
  s.line(120, fy, 800, fy, { color: C.muted, width: 2, dash: '6 8' });
  s.text(790, fy - 8, 'noise floor 0.09', { size: 15, anchor: 'end', color: C.muted });
  const series = (vals, color) => {
    for (let i = 1; i < vals.length; i++) {
      s.line(px(i), py(Math.log10(vals[i - 1])), px(i + 1), py(Math.log10(vals[i])), { color, width: 3 });
    }
    vals.forEach((v, i) => s.circle(px(i + 1), py(Math.log10(v)), 8, { color, fill: color, fillStyle: 'solid' }));
  };
  series(data.mean_train, C.green);
  series(data.mean_true, C.rose);
  s.line(540, 70, 580, 70, { color: C.green, width: 3 });
  s.text(592, 76, 'training risk (mean)', { size: 17, anchor: 'start' });
  s.line(540, 98, 580, 98, { color: C.rose, width: 3 });
  s.text(592, 104, 'true risk (mean)', { size: 17, anchor: 'start' });
  save('19.1-sweep.svg', s);
}

console.log('wrote 19.1-pipeline.svg, 19.1-worked-example.svg, 19.1-risk-curve.svg, 19.1-sweep.svg');
