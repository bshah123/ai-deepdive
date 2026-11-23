// Diagrams for 19.2 (loss functions: MSE, cross-entropy, KL divergence).
// Run: node scripts/diagrams/lessons/19.2.mjs
// Every number comes from scripts/diagrams/lessons/19.2_data.json (written by 19.2_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-19-ml-foundations/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '19.2_data.json'), 'utf8'));

const f = (v, d) => v.toFixed(d);

// ---------------------------------------------------------------- 19.2-three-losses.svg
{
  const s = new Sketch(880, 370, {
    title: 'Three columns: regression with MSE, binary classification with BCE, multi-class classification with cross-entropy; each shows what the model outputs, the target, and the loss formula',
    seed: 1901,
  });
  s.text(440, 34, 'Choose the loss by what the model outputs', { size: 26, weight: 700 });

  const cols = [
    { head: 'Regression', color: C.blue, soft: C.blueSoft, predicts: ['a number yhat'], target: ['a real number y'], loss: ['MSE = mean (y - yhat)^2'] },
    { head: 'Binary', color: C.amber, soft: C.amberSoft, predicts: ['p = sigmoid(z), in (0, 1)'], target: ['y in {0, 1}'], loss: ['BCE = -[y ln p', '+ (1-y) ln(1-p)]'] },
    { head: 'Multi-class', color: C.green, soft: C.greenSoft, predicts: ['K probabilities', '(softmax of K logits)'], target: ['one true class k'], loss: ['CE = -ln p_k'] },
  ];
  cols.forEach((c, i) => {
    const x0 = 24 + i * 284;
    const cx = x0 + 134;
    s.rect(x0, 72, 268, 276, { color: C.muted, width: 1.4 });
    s.rect(x0 + 20, 88, 228, 40, { color: c.color, fill: c.soft, fillStyle: 'solid' });
    s.text(cx, 116, c.head, { size: 21, weight: 700 });
    s.text(cx, 158, 'model outputs', { size: 16, color: C.muted });
    s.text(cx, 182, c.predicts, { size: 16, font: 'mono' });
    s.text(cx, 220, 'target', { size: 16, color: C.muted });
    s.text(cx, 244, c.target, { size: 16, font: 'mono' });
    s.text(cx, 280, 'loss', { size: 16, color: C.muted });
    s.text(cx, 304, c.loss, { size: 16, font: 'mono', weight: 700 });
  });
  save('19.2-three-losses.svg', s);
}

// ---------------------------------------------------------------- 19.2-worked-example.svg
{
  const ex = data.example;
  const s = new Sketch(880, 330, {
    title: 'Table of four predictions with the squared error and the cross-entropy term for each, and the mean of each column',
    seed: 1902,
  });
  s.text(440, 34, 'Four predictions, two losses', { size: 26, weight: 700 });

  const cols = { pt: 120, y: 250, p: 360, se: 520, ce: 735 };
  s.text(cols.pt, 84, 'point', { size: 17, color: C.muted });
  s.text(cols.y, 84, 'y', { size: 17, color: C.muted });
  s.text(cols.p, 84, 'p', { size: 17, color: C.muted });
  s.text(cols.se, 84, '(y - p)^2', { size: 17, color: C.muted, font: 'mono' });
  s.text(cols.ce, 84, 'BCE term', { size: 17, color: C.muted, font: 'mono' });
  s.line(60, 98, 820, 98, { color: C.muted, width: 1.2 });

  const rowY = [130, 172, 214, 256];
  for (let i = 0; i < 4; i++) {
    const hi = i === 3;
    const col = hi ? { color: C.rose, fill: C.roseSoft } : null;
    if (col) s.rect(60, rowY[i] - 22, 760, 36, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(cols.pt, rowY[i], `${i + 1}`, { size: 19, font: 'mono' });
    s.text(cols.y, rowY[i], `${ex.y[i]}`, { size: 19, font: 'mono' });
    s.text(cols.p, rowY[i], f(ex.p[i], 1), { size: 19, font: 'mono' });
    s.text(cols.se, rowY[i], f(ex.sq_err[i], 2), { size: 19, font: 'mono' });
    s.text(cols.ce, rowY[i], f(ex.bce_terms[i], 6), { size: 19, font: 'mono' });
  }
  s.line(60, 282, 820, 282, { color: C.muted, width: 1.2 });
  s.text(cols.pt, 312, 'mean', { size: 20, weight: 700 });
  s.text(cols.se, 312, `MSE = ${f(ex.mse, 4)}`, { size: 19, font: 'mono', weight: 700, color: C.blue });
  s.text(cols.ce, 312, `BCE = ${f(ex.bce, 4)}`, { size: 19, font: 'mono', weight: 700, color: C.amber });
  save('19.2-worked-example.svg', s);
}

// ---------------------------------------------------------------- 19.2-loss-curves.svg
{
  const cv = data.curves;
  const s = new Sketch(880, 370, {
    title: 'Line plot for a true label y = 1 against predicted probability p from 0.05 to 1: cross-entropy rises steeply as p falls, squared error stays below 0.9',
    seed: 1903,
  });
  s.text(440, 34, 'The same wrong answer, two losses (true y = 1)', { size: 26, weight: 700 });

  const X0 = 100, X1 = 520, Y0 = 310, Y1 = 70; // plot box in px: x for p in [0.05, 1], y for value in [0, 3]
  const px = (p) => X0 + ((p - 0.05) / 0.95) * (X1 - X0);
  const py = (v) => Y0 - (v / 3.0) * (Y0 - Y1);

  // axes and ticks
  s.line(X0, Y0, X1, Y0, { color: C.ink, width: 1.6 });
  s.line(X0, Y0, X0, Y1, { color: C.ink, width: 1.6 });
  for (const v of [0, 1, 2, 3]) {
    s.line(X0 - 6, py(v), X0, py(v), { color: C.ink, width: 1.2 });
    s.text(X0 - 14, py(v) + 6, `${v}`, { size: 16, font: 'mono', anchor: 'end' });
  }
  for (const p of [0.05, 0.5, 1.0]) {
    s.text(px(p), Y0 + 26, p.toFixed(2), { size: 16, font: 'mono' });
  }
  s.text((X0 + X1) / 2, Y0 + 56, 'predicted probability p', { size: 18 });
  s.text(24, (Y0 + Y1) / 2, 'loss', { size: 18, rotate: -90 });

  // curves as plain SVG paths (many points; rough strokes would jitter)
  const pts = cv.p.map((p, i) => [p, i]).filter(([p]) => p >= 0.05);
  const path = (vals) =>
    pts.map(([p, i], k) => `${k === 0 ? 'M' : 'L'}${f(px(p), 1)},${f(py(vals[i]), 1)}`).join(' ');
  s.raw(`<path d="${path(cv.ce)}" style="stroke:${C.blue};fill:none" stroke-width="3" stroke-linejoin="round"/>`);
  s.raw(`<path d="${path(cv.mse)}" style="stroke:${C.amber};fill:none" stroke-width="3" stroke-linejoin="round"/>`);
  s.text(px(0.2), py(1.9), 'CE', { size: 20, weight: 700, color: C.blue });
  s.text(px(0.42), py(0.55), 'MSE', { size: 20, weight: 700, color: C.amber });

  // side note with the three measured points
  const at = (p) => cv.p.findIndex((q) => Math.abs(q - p) < 1e-9);
  const rowsTxt = [0.05, 0.5, 0.95].map((p) => {
    const i = at(p);
    return `p = ${p.toFixed(2)}:  CE ${f(cv.ce[i], 2)}   MSE ${f(cv.mse[i], 3)}`;
  });
  s.note(560, 96, 300, 170, ['Read the same prediction', ...rowsTxt, 'CE grows without bound', 'as p approaches 0.'], { size: 18 });
  save('19.2-loss-curves.svg', s);
}

// ---------------------------------------------------------------- 19.2-gradients.svg
{
  const rows = data.sigmoid_grads;
  const s = new Sketch(880, 400, {
    title: 'Horizontal bars of the gradient magnitude with respect to the logit for CE and MSE at five logit values; the MSE bar is much shorter when the prediction is confidently wrong',
    seed: 1904,
  });
  s.text(440, 34, 'Gradient size when the prediction is wrong (true y = 1)', { size: 25, weight: 700 });
  s.rect(40, 62, 18, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(66, 74, 'CE: |dCE/dz| = |p - 1|', { size: 17, anchor: 'start' });
  s.rect(340, 62, 18, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(366, 74, 'MSE: |dMSE/dz|', { size: 17, anchor: 'start' });

  const BX = 150, SCALE = 380; // 1.0 of gradient = 380 px
  rows.forEach((r, i) => {
    const y = 124 + i * 56;
    s.text(40, y + 14, `z = ${r.z.toFixed(0)}`, { size: 18, font: 'mono', anchor: 'start' });
    s.text(40, y + 38, `p = ${r.p.toFixed(3)}`, { size: 15, font: 'mono', anchor: 'start', color: C.muted });
    const wCE = Math.abs(r.g_ce) * SCALE;
    const wM = Math.abs(r.g_mse) * SCALE;
    s.rect(BX, y, wCE, 20, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(BX + wCE + 10, y + 16, f(Math.abs(r.g_ce), 3), { size: 17, font: 'mono', anchor: 'start' });
    s.rect(BX, y + 26, wM, 20, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(BX + wM + 10, y + 42, f(Math.abs(r.g_mse), 3), { size: 17, font: 'mono', anchor: 'start' });
  });

  const r0 = rows[0];
  s.note(640, 240, 220, 120, [`At z = ${r0.z}, the CE`, `gradient is ${f(r0.ratio, 0)} times`, 'the MSE gradient.'], { size: 19 });
  save('19.2-gradients.svg', s);
}

// ---------------------------------------------------------------- 19.2-kl-identity.svg
{
  const kl = data.kl;
  const s = new Sketch(880, 330, {
    title: 'Stacked bar: cross-entropy H(P,Q) equals entropy H(P) plus KL(P||Q); the KL part is a small amber slice on top of the blue entropy part',
    seed: 1905,
  });
  s.text(440, 34, 'Cross-entropy = entropy + KL divergence (nats)', { size: 25, weight: 700 });

  const X0 = 60, S = 560; // px per nat
  const wH = kl.H_P * S;
  const wK = kl.kl_pq * S;

  s.text(X0, 92, 'H(P): entropy of P, the floor no code can beat', { size: 18, anchor: 'start' });
  s.rect(X0, 104, wH, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(X0 + wH / 2, 131, f(kl.H_P, 4), { size: 19, font: 'mono' });

  s.text(X0, 186, 'H(P,Q) = H(P) + KL(P||Q): cross-entropy of Q, given P', { size: 18, anchor: 'start' });
  s.rect(X0, 198, wH, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.rect(X0 + wH, 198, wK, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(X0 + wH / 2, 225, f(kl.H_P, 4), { size: 19, font: 'mono' });
  s.arrow(X0 + wH + wK / 2, 170, X0 + wH + wK / 2, 196, { color: C.amber, head: 8 });
  s.text(X0 + wH + wK / 2 + 6, 168, `KL = ${f(kl.kl_pq, 4)}`, { size: 19, font: 'mono', color: C.amber, anchor: 'start' });
  s.text(X0 + wH + wK + 12, 225, f(kl.H_PQ, 4), { size: 19, font: 'mono', anchor: 'start' });

  s.note(60, 262, 760, 56, [`KL(Q||P) = ${f(kl.kl_qp, 4)} is a different number: KL is not symmetric.`], { size: 19 });
  save('19.2-kl-identity.svg', s);
}
