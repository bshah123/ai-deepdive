import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-19-ml-foundations/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below is read from 19.6_data.json, written by 19.6_experiment.py.
const D = JSON.parse(readFileSync(join(HERE, '19.6_data.json'), 'utf8'));
const f2 = (v) => v.toFixed(2);
const f3 = (v) => v.toFixed(3);

// Plot helper: maps data coordinates to the box (L, R, T, B) and draws axes with ticks.
function axes(s, box, xr, yr, xt, yt, fmtY = (v) => String(v), xLabel, yLabel) {
  const { L, R, T, B } = box;
  const px = (v) => L + ((v - xr[0]) / (xr[1] - xr[0])) * (R - L);
  const py = (v) => B - ((v - yr[0]) / (yr[1] - yr[0])) * (B - T);
  s.raw(`<line x1="${L}" y1="${B}" x2="${R}" y2="${B}" stroke="${C.ink}" stroke-width="2"/>`);
  s.raw(`<line x1="${L}" y1="${T}" x2="${L}" y2="${B}" stroke="${C.ink}" stroke-width="2"/>`);
  for (const v of xt) {
    s.raw(`<line x1="${px(v)}" y1="${B}" x2="${px(v)}" y2="${B + 6}" stroke="${C.ink}" stroke-width="2"/>`);
    s.text(px(v), B + 26, String(v), { font: 'mono', size: 16, color: C.muted });
  }
  for (const v of yt) {
    s.raw(`<line x1="${L - 6}" y1="${py(v)}" x2="${L}" y2="${py(v)}" stroke="${C.ink}" stroke-width="2"/>`);
    s.text(L - 12, py(v) + 6, fmtY(v), { font: 'mono', size: 16, color: C.muted, anchor: 'end' });
  }
  if (xLabel) s.text((L + R) / 2, B + 58, xLabel, { size: 20 });
  if (yLabel) s.text(L - 62, (T + B) / 2, yLabel, { size: 20, rotate: -90 });
  return { px, py };
}

function poly(pts, color, dash) {
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>`;
}

// ---------- 1. Structure: inference and training as one picture ----------
{
  const s = new Sketch(880, 300, { title: 'Pipeline: input, energy for each candidate, argmin', seed: 101 });
  s.text(440, 34, 'Inference picks the candidate with the lowest energy', { size: 24, weight: 700 });
  s.rect(40, 110, 150, 64, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 148, 'input x', { font: 'mono', size: 18 });
  s.rect(250, 110, 220, 64, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(360, 140, 'energy E(x, y)', { font: 'mono', size: 18 });
  s.text(360, 162, 'one number per candidate y', { size: 16, color: C.muted });
  s.rect(530, 110, 150, 64, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(605, 148, 'argmin over y', { font: 'mono', size: 18 });
  s.rect(730, 110, 120, 64, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(790, 148, 'y*', { font: 'mono', size: 20, weight: 700 });
  s.arrow(190, 142, 250, 142, { color: C.muted });
  s.arrow(470, 142, 530, 142, { color: C.muted });
  s.arrow(680, 142, 730, 142, { color: C.muted });
  s.note(40, 206, 400, 66, ['No softmax and no normalising sum Z', 'are needed to rank the candidates.'], { size: 18 });
  s.note(470, 206, 380, 66, ['Training shapes the energy surface:', 'lower E for the true y, raise it for the others.'], { size: 18 });
  save('19.6-pipeline.svg', s);
}

// ---------- 2. Worked example: energies -> Gibbs probabilities ----------
{
  const h = D.hand;
  const s = new Sketch(880, 400, { title: 'Three candidates: energies, exp(-E), probabilities', seed: 102 });
  s.text(440, 34, 'One input, three candidates: from energy to probability', { size: 24, weight: 700 });
  const cx = [330, 530, 730];
  const labels = ['y = 0', 'y = 1', 'y = 2'];
  for (let k = 0; k < 3; k++) {
    const isArg = k === h.argmin;
    s.rect(cx[k] - 75, 62, 150, 56, {
      color: isArg ? C.green : C.blue,
      fill: isArg ? C.greenSoft : C.blueSoft,
      fillStyle: 'solid',
    });
    s.text(cx[k], 86, `${labels[k]}   w = ${h.prototypes[k]}`, { font: 'mono', size: 17 });
    s.text(cx[k], 108, isArg ? 'lowest energy' : 'higher energy', { size: 16, color: C.muted });
  }
  const rows = [
    ['energy E', 190, h.E.map((v) => f2(v))],
    ['exp(-E)', 240, h.exp_neg_E.map((v) => f2(v))],
    ['p(y|x)', 290, h.p.map((v) => f2(v))],
  ];
  for (const [name, y, vals] of rows) {
    s.text(60, y + 7, name, { size: 20 });
    for (let k = 0; k < 3; k++) s.text(cx[k], y + 7, vals[k], { font: 'mono', size: 22, weight: 700 });
  }
  // bars for p(y|x): width proportional to probability
  for (let k = 0; k < 3; k++) {
    s.rect(cx[k] - 80, 318, 160 * h.p[k], 14, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  }
  s.text(440, 368, `Z = sum of exp(-E) = ${f3(h.Z)}, so p = exp(-E) / Z`, { size: 20 });
  save('19.6-inference.svg', s);
}

// ---------- 3. Loss shapes against the contrast energy ----------
{
  const s = new Sketch(880, 440, { title: 'Margin loss and NLL against the contrast energy', seed: 103 });
  s.text(440, 34, 'Two losses for one contrast candidate (target energy fixed at 0)', { size: 24, weight: 700 });
  s.text(560, 70, 'margin: zero beyond m', { size: 18, color: C.rose });
  s.text(560, 94, 'NLL: never exactly zero', { size: 18, color: C.blue });
  const box = { L: 110, R: 820, T: 110, B: 360 };
  const xr = [-1, 3];
  const yr = [0, 2.2];
  const { px, py } = axes(s, box, xr, yr, [-1, 0, 1, 2, 3], [0, 0.5, 1, 1.5, 2], (v) => v.toFixed(1),
    'contrast energy E_neg (lower = more confusable)', 'loss');
  const e = D.loss_shapes.e_neg;
  const mar = D.loss_shapes.margin;
  const nll = D.loss_shapes.nll;
  s.raw(poly(e.map((v, i) => [px(v), py(mar[i])]), C.rose));
  s.raw(poly(e.map((v, i) => [px(v), py(nll[i])]), C.blue));
  s.line(px(D.loss_shapes.m), box.T, px(D.loss_shapes.m), box.B, { color: C.muted, dash: '6 8' });
  s.text(px(D.loss_shapes.m) + 8, box.T + 18, `m = ${D.loss_shapes.m}`, { font: 'mono', size: 16, color: C.muted, anchor: 'start' });
  const i0 = e.findIndex((v) => Math.abs(v) < 1e-9);
  s.circle(px(0), py(nll[i0]), 12, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  s.text(px(0) - 14, py(nll[i0]) + 28, `log 2 = ${f3(nll[i0])}`, { font: 'mono', size: 16, anchor: 'end' });
  save('19.6-loss-shapes.svg', s);
}

// ---------- 4. Collapse: positive-only training versus margin ----------
{
  const s = new Sketch(880, 440, { title: 'Collapse without negatives', seed: 104 });
  s.text(440, 34, 'Mean true-class energy over training epochs (log scale)', { size: 24, weight: 700 });
  s.text(560, 70, `positive loss only: collapses to ${D.collapse.positive_only.E_true.at(-1).toExponential(1)}`, { size: 18, color: C.rose });
  s.text(560, 94, 'margin with negatives: energy stays', { size: 18, color: C.blue });
  const box = { L: 120, R: 820, T: 110, B: 360 };
  const pos = D.collapse.positive_only;
  const mar = D.collapse.margin;
  const xr = [1, 30];
  const yr = [-14, 1];
  const { px, py } = axes(s, box, xr, yr, [1, 10, 20, 30], [-12, -8, -4, 0],
    (v) => `1e${v}`, 'epoch', 'log10 E_true');
  const lp = pos.E_true.map((v) => Math.log10(v));
  const lm = mar.E_true.map((v) => Math.log10(v));
  s.raw(poly(pos.epoch.map((ep, i) => [px(ep), py(Math.max(lp[i], yr[0]))]), C.rose));
  s.raw(poly(mar.epoch.map((ep, i) => [px(ep), py(lm[i])]), C.blue));
  const last = pos.E_true.length - 1;
  s.text(px(30) - 10, py(lm[last]) - 14, `epoch 30: ${mar.E_true[last].toFixed(2)}`, { font: 'mono', size: 16, anchor: 'end', color: C.blue });
  save('19.6-collapse.svg', s);
}

// ---------- 5. Training curves on the prototype model ----------
{
  const s = new Sketch(880, 440, { title: 'Test accuracy during training', seed: 105 });
  s.text(440, 34, 'Test accuracy, prototype energy, 3000 test points', { size: 24, weight: 700 });
  s.text(560, 70, `NLL (exact Z): final ${f3(D.proto.nll.final_test.acc)}`, { size: 18, color: C.blue });
  s.text(560, 94, `margin (m = 1): final ${f3(D.proto.margin.final_test.acc)}`, { size: 18, color: C.rose });
  const box = { L: 110, R: 820, T: 110, B: 360 };
  const xr = [1, 60];
  const yr = [0.7, 0.95];
  const { px, py } = axes(s, box, xr, yr, [1, 20, 40, 60], [0.7, 0.8, 0.9], (v) => v.toFixed(2),
    'epoch', 'test accuracy');
  const cn = D.proto.nll.curve;
  const cm = D.proto.margin.curve;
  s.raw(poly(cn.epoch.map((ep, i) => [px(ep), py(cn.test_acc[i])]), C.blue));
  s.raw(poly(cm.epoch.map((ep, i) => [px(ep), py(cm.test_acc[i])]), C.rose, '10 8'));
  s.text(110, 84, 'SE per accuracy about 0.005 (n = 3000, one seed)', { size: 17, color: C.muted, anchor: 'start' });
  save('19.6-training.svg', s);
}

console.log('wrote 19.6 diagrams to', OUT);
