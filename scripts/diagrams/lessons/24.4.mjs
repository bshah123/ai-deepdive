import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-24-embeddings/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// All numbers below are printed by scripts/diagrams/lessons/24.4_data.py.

// 1. Where the bias enters the attention computation
{
  const s = new Sketch(880, 260, { title: 'Flow of ALiBi: bias added to scores before the causal mask and softmax', seed: 2401 });
  s.text(440, 40, 'ALiBi adds a distance penalty to the scores', { size: 26, weight: 700 });
  const boxes = [
    ['scores', 'q.k / sqrt(d)', C.blue, C.blueSoft],
    ['add bias', '- m (i - j)', C.amber, C.amberSoft],
    ['causal mask', 'j>i: -inf', C.rose, C.roseSoft],
    ['softmax', 'over keys j', C.green, C.greenSoft],
    ['weights', 'sum to 1', C.blue, C.blueSoft],
  ];
  boxes.forEach(([name, formula, color, fill], k) => {
    const x = 30 + k * 170;
    s.rect(x, 90, 140, 64, { color, fill, fillStyle: 'solid' });
    s.text(x + 70, 116, name, { size: 19, weight: 700 });
    s.text(x + 70, 142, formula, { font: 'mono', size: 15 });
    if (k < boxes.length - 1) s.arrow(x + 142, 122, x + 168, 122, { color: C.muted });
  });
  s.note(150, 190, 580, 50, ['The bias is a number added to each score, not to the token embeddings.'], { size: 19 });
  save('24.4-score-flow.svg', s);
}

// 2. The bias matrix for L = 5, m = 0.5
{
  const s = new Sketch(880, 480, { title: 'Causal ALiBi bias matrix for five tokens and slope 0.5', seed: 2402 });
  s.text(440, 40, 'The bias matrix for five tokens, m = 0.5', { size: 26, weight: 700 });
  const L = 5, cell = 64, x0 = 250, y0 = 100, m = 0.5;
  for (let j = 0; j < L; j++) s.text(x0 + j * cell + cell / 2, y0 - 14, `j=${j}`, { font: 'mono', size: 16 });
  s.text(x0 - 26, y0 - 14, 'i \\ j', { font: 'mono', size: 15, anchor: 'end' });
  for (let i = 0; i < L; i++) {
    s.text(x0 - 20, y0 + i * cell + cell / 2 + 6, `i=${i}`, { font: 'mono', size: 16, anchor: 'end' });
    for (let j = 0; j < L; j++) {
      const x = x0 + j * cell, y = y0 + i * cell;
      let fill, label;
      if (j > i) { fill = C.roseSoft; label = '-inf'; }
      else { fill = i === 4 ? C.amberSoft : C.greenSoft; label = j === i ? '0' : (-m * (i - j)).toFixed(1); }
      s.rect(x, y, cell, cell, { color: C.muted, fill, fillStyle: 'solid' });
      s.text(x + cell / 2, y + cell / 2 + 6, label, { font: 'mono', size: 16 });
    }
  }
  s.note(612, 120, 250, 150, ['Row i is the query,', 'column j is the key.', 'Each step back costs', 'm = 0.5 in the score.'], { size: 19 });
  s.text(612, 320, 'Amber: row of the query at position 4', { size: 17, anchor: 'start', color: C.muted });
  s.text(612, 346, 'Rose: future keys, removed by the mask', { size: 17, anchor: 'start', color: C.muted });
  s.text(440, 440, 'Only the bias depends on i - j. The matrix is the same for any sequence length.', { size: 18, color: C.muted });
  save('24.4-bias-matrix.svg', s);
}

// 3. Worked example: query 4, zero content scores
{
  const s = new Sketch(880, 410, { title: 'Softmax weights for the last query with zero content scores', seed: 2403 });
  s.text(440, 40, 'Worked example: the last query, zero content scores', { size: 26, weight: 700 });
  const w = [0.058, 0.0956, 0.1577, 0.26, 0.4287];
  const bias = ['-2.0', '-1.5', '-1.0', '-0.5', '0.0'];
  const base = 290;
  w.forEach((v, j) => {
    const cx = 150 + j * 160, h = v * 400;
    s.rect(cx - 50, base - h, 100, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, v.toFixed(3), { font: 'mono', size: 17 });
    s.text(cx, base + 30, j === 4 ? 'j=4 (self)' : `j=${j}`, { size: 19, weight: 700 });
    s.text(cx, base + 56, `bias ${bias[j]}`, { font: 'mono', size: 15, color: C.muted });
  });
  s.line(70, base, 830, base, { color: C.ink, width: 2 });
  s.note(40, 60, 330, 64, ['exp(bias) = 0.135, 0.223, 0.368,', '0.607, 1.000; sum = 2.333'], { size: 18 });
  s.text(440, 392, 'Each weight is exp(bias) divided by the sum; rounded to three decimals.', { size: 18, color: C.muted });
  save('24.4-worked-weights.svg', s);
}

// 4. Head slopes and effective windows (uniform content)
{
  const s = new Sketch(880, 500, { title: 'Head slopes and the distance holding 90 percent of the weight', seed: 2404 });
  s.text(440, 40, 'Each head has its own slope, so its own window', { size: 26, weight: 700 });
  const heads = [
    ['1/2', 4], ['1/4', 9], ['1/8', 18], ['1/16', 36],
    ['1/32', 73], ['1/64', 147], ['1/128', 294], ['1/256', 589],
  ];
  const scale = 0.815, x0 = 250;
  heads.forEach(([m, d90], k) => {
    const y = 112 + k * 40;
    s.text(40, y + 6, `head ${k + 1}   m = ${m}`, { font: 'mono', size: 16, anchor: 'start' });
    const w = d90 * scale;
    s.rect(x0, y - 13, w, 26, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x0 + w + 12, y + 6, `D90 = ${d90}`, { font: 'mono', size: 16, anchor: 'start' });
  });
  s.text(440, 440, 'D90: the smallest distance D such that 90 percent of the weight lies on distances 0..D.', { size: 17, color: C.muted });
  s.text(440, 466, 'Uniform content, infinite causal context. Steep heads look only a few tokens back.', { size: 17, color: C.muted });
  save('24.4-head-windows.svg', s);
}

// 5. Training length versus test length
{
  const s = new Sketch(880, 420, { title: 'Distances seen in training versus at test time', seed: 2405 });
  s.text(440, 40, 'Distances seen in training and at test time', { size: 26, weight: 700 });
  const x0 = 60, span = 760 / 2047;
  const xTrain = x0 + 1023 * span;
  s.rect(x0, 90, xTrain - x0, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.rect(xTrain, 90, x0 + 2047 * span - xTrain, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text((x0 + xTrain) / 2, 122, 'seen in training: 0..1023', { size: 18 });
  s.text((xTrain + x0 + 2047 * span) / 2, 122, 'new at test: 1024..2047', { size: 18 });
  [[x0, '0'], [xTrain, '1023'], [x0 + 2047 * span, '2047']].forEach(([x, t]) =>
    s.text(x, 168, t, { font: 'mono', size: 15 }));
  const cols = [60, 170, 330, 520, 700];
  const head = ['head', 'm', 'bias at 1023', 'bias at 2047', 'log10 w at 2047'];
  head.forEach((t, k) => s.text(cols[k], 232, t, { font: 'mono', size: 15, weight: 700, anchor: 'start' }));
  const rows = [
    ['1', '1/2', '-511.5', '-1023.5', '-444.5'],
    ['4', '1/16', '-63.9', '-127.9', '-55.6'],
    ['8', '1/256', '-4.0', '-8.0', '-3.5'],
  ];
  rows.forEach((r, i) => r.forEach((t, k) => s.text(cols[k], 264 + i * 32, t, { font: 'mono', size: 15, anchor: 'start' })));
  s.text(440, 370, 'Log10 w is the log of the weight relative to the nearest key, before normalisation.', { size: 17, color: C.muted });
  s.text(440, 396, 'Reasoning, not a measurement: the flat head sees new bias values beyond 1023 but tiny weights.', { size: 17, color: C.muted });
  save('24.4-train-test-axis.svg', s);
}
