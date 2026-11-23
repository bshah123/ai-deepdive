// Diagrams for 32.2 (AWQ, GPTQ, SmoothQuant).
// Run: node scripts/diagrams/lessons/32.2.mjs
// Numbers come from scripts/diagrams/lessons/32.2_data.py (run it to reprint them; its output is in the lesson).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-32-llm-optimization/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// seed 0 values from 32.2_data.py output
const MEAN_ABS_OUT = [18.7, 19.9, 15.9]; // mean |x| of channels 5, 40, 97
const MEAN_ABS_TYP = 0.88;               // median channel
const MAX_OUT = [89.7, 74.6, 59.5];      // max |x| of the outlier channels
const MAX_MED = 3.38;                    // median channel max |x|
const SWEEP = [0.0964, 0.0696, 0.0552, 0.0469, 0.0461, 0.0531, 0.0682, 0.0891, 0.1118, 0.1390, 0.1615]; // AWQ calibration error, alpha = 0, 0.1, ..., 1
// 5 seeds, held-out tokens: mean +/- population std
const RES = { rtn: [0.0972, 0.0015], gptq: [0.0946, 0.0018], awq: [0.0466, 0.0011], naive: [0.0516, 0.0034], sq: [0.0153, 0.0013] };

// ---------------------------------------------------------------- 32.2-outliers.svg
{
  const s = new Sketch(880, 330, { title: 'Bar chart: three input channels have mean absolute activation near 19, a typical channel has 0.88', seed: 3221 });
  s.text(440, 34, 'A few input channels carry most of the activation size', { size: 26, weight: 700 });
  const base = 270, k = 10; // 10 px per unit of mean |x|
  s.line(90, base, 680, base, { color: C.muted });
  const bars = [[120, MEAN_ABS_OUT[0], 'ch 5', C.rose, C.roseSoft], [240, MEAN_ABS_OUT[1], 'ch 40', C.rose, C.roseSoft],
                [360, MEAN_ABS_OUT[2], 'ch 97', C.rose, C.roseSoft], [520, MEAN_ABS_TYP, 'typical', C.blue, C.blueSoft]];
  for (const [cx, v, label, col, soft] of bars) {
    const h = Math.max(v * k, 3);
    s.rect(cx - 42, base - h, 84, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, v.toFixed(1), { font: 'mono', size: 17 });
    s.text(cx, base + 28, label, { size: 20 });
  }
  s.text(60, 150, 'mean |x|', { size: 18, color: C.muted, rotate: -90 });
  s.note(700, 120, 160, 140, ['max |x| on the', 'outlier channels:', '90, 75, 60', 'median channel:', '3.4'], { size: 18 });
  s.text(440, 318, 'mean over 256 calibration tokens, seed 0', { size: 18, color: C.muted });
  save('32.2-outliers.svg', s);
}

// ---------------------------------------------------------------- 32.2-awq-alpha.svg
{
  const s = new Sketch(880, 350, { title: 'Line chart: calibration output error against the AWQ scale exponent alpha; minimum at alpha 0.4', seed: 3222 });
  s.text(440, 34, 'AWQ: choose the scale exponent alpha on calibration data', { size: 26, weight: 700 });
  const X = (a) => 110 + a * 670, Y = (e) => 290 - (e / 0.17) * 220;
  s.line(110, 290, 780, 290, { color: C.muted });
  s.line(110, 70, 110, 290, { color: C.muted });
  for (const e of [0.05, 0.10, 0.15]) {
    s.text(96, Y(e) + 6, e.toFixed(2), { font: 'mono', size: 16, anchor: 'end', color: C.muted });
  }
  for (const a of [0, 0.5, 1]) s.text(X(a), 316, a.toFixed(1), { font: 'mono', size: 17, color: C.muted });
  s.text(445, 340, 'alpha: 0 = no scaling, 1 = most aggressive', { size: 19, color: C.muted });
  s.line(110, Y(SWEEP[0]), 780, Y(SWEEP[0]), { color: C.rose, dash: '6 8' });
  s.text(300, Y(SWEEP[0]) - 12, 'plain RTN (alpha = 0): 0.096', { size: 18, color: C.rose });
  for (let i = 0; i < SWEEP.length - 1; i++) {
    s.line(X(i / 10), Y(SWEEP[i]), X((i + 1) / 10), Y(SWEEP[i + 1]), { color: C.blue, width: 3 });
  }
  SWEEP.forEach((e, i) => s.circle(X(i / 10), Y(e), 10, { color: C.blue, fill: C.blue, fillStyle: 'solid' }));
  s.note(470, 96, 250, 56, ['best alpha = 0.4: error 0.046', 'about half of plain RTN'], { size: 18 });
  s.arrow(470, 120, X(0.4) + 14, Y(0.0461) - 10, { color: C.muted, head: 7 });
  s.text(40, 180, 'error', { size: 18, color: C.muted, rotate: -90 });
  save('32.2-awq-alpha.svg', s);
}

// ---------------------------------------------------------------- 32.2-gptq-order.svg
{
  const s = new Sketch(880, 340, { title: 'GPTQ-style procedure: input rows 1 and 2 are quantized, row 3 is being quantized, rows 4 to 6 absorb its error', seed: 3223 });
  s.text(440, 34, 'GPTQ-style: quantize one input row, push its error to the open rows', { size: 25, weight: 700 });
  const rows = [['row 1', 'quantized', C.green, C.greenSoft], ['row 2', 'quantized', C.green, C.greenSoft],
                ['row 3', 'quantizing now', C.amber, C.amberSoft], ['row 4', 'full precision, open', C.blue, C.blueSoft],
                ['row 5', 'full precision, open', C.blue, C.blueSoft], ['row 6', 'full precision, open', C.blue, C.blueSoft]];
  rows.forEach(([name, state, col, soft], i) => {
    const y = 74 + i * 40;
    s.rect(110, y, 310, 34, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(128, y + 23, name, { font: 'mono', size: 17, anchor: 'start' });
    s.text(400, y + 23, state, { size: 19, anchor: 'end' });
  });
  s.line(100, 74 + 3 * 40 - 3, 100, 74 + 6 * 40 - 6, { color: C.violet, width: 4 });
  s.text(78, 74 + 4.5 * 40, 'open', { size: 18, color: C.violet, rotate: -90 });
  s.arrow(430, 74 + 2 * 40 + 17, 500, 74 + 2 * 40 + 17, { color: C.amber, head: 8 });
  s.note(510, 82, 340, 160, ['row j: e = (w_j - q_j) / U[j,j]', 'open row k > j:', 'w_k = w_k - U[j,k] * e', '', 'U: Cholesky factor of the', 'inverse Hessian (from inputs)'], { size: 18 });
  save('32.2-gptq-order.svg', s);
}

// ---------------------------------------------------------------- 32.2-smoothquant.svg
{
  const s = new Sketch(880, 330, { title: 'SmoothQuant, channel 5: dividing activations by s and multiplying weight row 5 by s makes both maxima 3.36', seed: 3224 });
  s.text(440, 34, 'SmoothQuant moves channel 5 difficulty into the weights', { size: 26, weight: 700 });
  const box = (x, y, w, h, title, val, col, soft) => {
    s.rect(x, y, w, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + w / 2, y + 32, title, { size: 20 });
    s.text(x + w / 2, y + 62, val, { font: 'mono', size: 19, weight: 700 });
  };
  box(40, 80, 280, 84, 'activations X, channel 5', 'max |x| = 89.75', C.rose, C.roseSoft);
  box(560, 80, 280, 84, 'activations X′, channel 5', 'max |x| = 3.36', C.green, C.greenSoft);
  s.arrow(322, 122, 556, 122, { color: C.muted, head: 9 });
  s.text(440, 112, 'divide by s = 26.7', { font: 'mono', size: 17, color: C.muted });
  box(40, 200, 280, 84, 'weight row 5, W', 'max |w| = 0.126', C.rose, C.roseSoft);
  box(560, 200, 280, 84, 'weight row 5, W′', 'max |w| = 3.36', C.green, C.greenSoft);
  s.arrow(322, 242, 556, 242, { color: C.muted, head: 9 });
  s.text(440, 232, 'multiply by s = 26.7', { font: 'mono', size: 17, color: C.muted });
  s.text(440, 318, 'alpha = 0.5: both maxima end at sqrt(89.75 x 0.126) = 3.36', { size: 19, color: C.muted });
  save('32.2-smoothquant.svg', s);
}

// ---------------------------------------------------------------- 32.2-results.svg
{
  const s = new Sketch(880, 430, { title: 'Bars: held-out relative output error. W4: RTN 0.097, GPTQ-style 0.095, AWQ-style 0.047. W8A8: naive 0.052, SmoothQuant alpha 0.5 0.015', seed: 3225 });
  s.text(440, 34, 'Held-out output error, mean over 5 seeds (lower is better)', { size: 25, weight: 700 });
  const base = 340, k = 200 / 0.11;
  s.line(70, base, 830, base, { color: C.muted });
  const bar = (cx, [m, sd], label, col, soft) => {
    const h = m * k;
    s.rect(cx - 48, base - h, 96, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(cx, base - h - 26, m.toFixed(3), { font: 'mono', size: 17 });
    s.text(cx, base - h - 8, `± ${sd.toFixed(3)}`, { font: 'mono', size: 15, color: C.muted });
    s.text(cx, base + 30, label[0], { size: 18 });
    s.text(cx, base + 52, label[1], { size: 18, color: C.muted });
  };
  s.text(290, 96, '4-bit weights (W4)', { size: 21, weight: 700 });
  s.text(700, 96, '8-bit weights and activations (W8A8)', { size: 21, weight: 700 });
  bar(150, RES.rtn, ['RTN', 'no calibration'], C.rose, C.roseSoft);
  bar(290, RES.gptq, ['GPTQ-style', 'Hessian'], C.amber, C.amberSoft);
  bar(430, RES.awq, ['AWQ-style', 'scale, alpha 0.4'], C.green, C.greenSoft);
  bar(610, RES.naive, ['naive W8A8', 'per-tensor INT8'], C.rose, C.roseSoft);
  bar(750, RES.sq, ['SmoothQuant', 'alpha 0.5'], C.green, C.greenSoft);
  s.text(440, 418, 'Different precisions: compare within a group, not across groups.', { size: 18, color: C.muted });
  save('32.2-results.svg', s);
}
