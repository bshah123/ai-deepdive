// Diagrams for 25.3 (causal masking and autoregressive decoding). Run: node scripts/diagrams/lessons/25.3.mjs
// Every number below is printed by the code blocks in the lesson (worked example, leak test, decode loop).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-25-attention/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const fillRect = (s, x, y, w, h, fill) => s.raw(`<rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill:${fill}"/>`);

const TOK = ['the', 'cat', 'sat', 'down'];

// ---------------------------------------------------------------- who sees whom
{
  const s = new Sketch(880, 330, { title: 'Without a mask the token sat reads all four tokens including the future token down; with a causal mask it reads only the, cat and itself', seed: 2531 });
  s.text(440, 34, 'What may "sat" read while predicting the next token?', { size: 26, weight: 700 });
  for (const [off, causal] of [[0, false], [440, true]]) {
    s.text(off + 220, 72, causal ? 'causal mask (GPT-style decoder)' : 'no mask (BERT-style encoder)', { size: 20, color: causal ? C.green : C.rose, weight: 700 });
    s.rect(off + 157, 92, 126, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(off + 220, 118, 'new "sat"', { size: 19 });
    TOK.forEach((t, i) => {
      const x = off + 42 + i * 92;
      const future = i === 3;
      const hidden = causal && future;
      s.rect(x, 216, 78, 40, hidden ? { color: C.muted, dash: '6 6' } : { color: future ? C.rose : C.ink, fill: future ? C.roseSoft : C.amberSoft, fillStyle: 'solid' });
      s.text(x + 39, 242, t, { font: 'mono', size: 16, color: hidden ? C.muted : C.ink });
      if (!hidden) s.arrow(x + 39, 212, off + 190 + i * 20, 137, { color: future ? C.rose : C.muted, width: future ? 2.4 : 1.4 });
    });
    s.text(off + 220, 292, causal ? 'the future is hidden: it has to predict' : 'it can copy the answer ("down")', { size: 19, color: causal ? C.green : C.rose });
  }
  s.line(440, 60, 440, 300, { color: C.muted, width: 1, dash: '4 6' });
  save('25.3-who-sees-whom.svg', s);
}

// ---------------------------------------------------------------- mask pipeline (worked example)
{
  const s = new Sketch(880, 430, { title: 'Worked example: a 4 by 4 score matrix, the same matrix with every entry above the diagonal set to minus infinity, and the softmax weights, which are lower triangular with rows summing to 1', seed: 2532 });
  s.text(440, 34, 'The causal mask on the worked example', { size: 26, weight: 700 });
  const S = [[2, 1, 0, 3], [1, 0, 2, 1], [0, 1, 2, 4], [1, 1, 1, 1]];
  const W = [['1.000', '0', '0', '0'], ['0.731', '0.269', '0', '0'], ['0.090', '0.245', '0.665', '0'], ['0.250', '0.250', '0.250', '0.250']];
  const cell = 56, top = 120;
  const xs = [70, 328, 586];
  const heads = ['1. scaled scores', '2. future set to −∞', '3. softmax of each row'];
  xs.forEach((x0, g) => {
    s.text(x0 + 2 * cell, 72, heads[g], { size: 21, weight: 700, color: [C.ink, C.rose, C.green][g] });
    TOK.forEach((t, c) => s.text(x0 + c * cell + cell / 2, top - 10, t, { font: 'mono', size: 15, color: C.muted }));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const fut = c > r;
      if (g === 1 && fut) fillRect(s, x0 + c * cell, top + r * cell, cell, cell, C.roseSoft);
      if (g === 2 && !fut) fillRect(s, x0 + c * cell, top + r * cell, cell, cell, C.greenSoft);
    }
    s.grid(x0, top, 4, 4, cell, { color: C.ink });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const fut = c > r;
      const cx = x0 + c * cell + cell / 2, cy = top + r * cell + 34;
      if (g === 0) s.text(cx, cy, String(S[r][c]), { font: 'mono', size: 17, color: fut ? C.rose : C.ink });
      if (g === 1) s.text(cx, cy, fut ? '−∞' : String(S[r][c]), { font: 'mono', size: 17, color: fut ? C.rose : C.ink });
      if (g === 2) s.text(cx, cy, W[r][c], { font: 'mono', size: 15, color: fut ? C.muted : C.ink });
    }
  });
  TOK.forEach((t, r) => s.text(62, top + r * cell + 34, t, { font: 'mono', size: 15, anchor: 'end', color: C.muted }));
  s.arrow(298, top + 2 * cell, 323, top + 2 * cell, { color: C.muted });
  s.arrow(556, top + 2 * cell, 581, top + 2 * cell, { color: C.muted });
  s.text(182, 382, ['row = the token asking,', 'column = the token it reads'], { size: 18, color: C.muted });
  s.text(440, 382, ['e^(−∞) = 0, so these', 'entries get zero weight'], { size: 18, color: C.rose });
  s.text(698, 382, ['every row still sums to 1;', '"the" can only read itself'], { size: 18, color: C.green });
  save('25.3-mask-pipeline.svg', s);
}

// ---------------------------------------------------------------- leak test (measured)
{
  const s = new Sketch(880, 350, { title: 'Measured change in each of six output rows after replacing only token 6: without a mask all six rows change (0.533, 0.159, 0.200, 0.626, 0.529, 0.389); with the causal mask rows 1 to 5 change by exactly 0 and row 6 by 0.389', seed: 2533 });
  s.text(440, 34, 'Replace token 6 only. Which outputs move?', { size: 26, weight: 700 });
  const data = [['no mask', [0.533, 0.159, 0.2, 0.626, 0.529, 0.389], C.rose], ['causal mask', [0, 0, 0, 0, 0, 0.389], C.green]];
  data.forEach(([name, vals, col], p) => {
    const x0 = 70 + p * 430, base = 268;
    s.text(x0 + 160, 74, name, { size: 21, weight: 700, color: col });
    s.line(x0 - 10, base, x0 + 330, base, { color: C.muted, width: 1.2 });
    vals.forEach((v, i) => {
      const x = x0 + i * 54, h = v * 240;
      const last = i === 5;
      if (v > 0) s.rect(x, base - h, 36, h, { color: last ? C.amber : col, fill: last ? C.amber : col });
      s.text(x + 18, base - h - 8, v === 0 ? '0' : v.toFixed(3), { font: 'mono', size: 15, color: v === 0 ? C.green : C.ink });
      s.text(x + 18, base + 22, String(i + 1), { font: 'mono', size: 16, color: last ? C.amber : C.muted });
    });
    s.text(x0 + 160, base + 52, 'output row (largest change in that row)', { size: 17, color: C.muted });
  });
  save('25.3-leak-test.svg', s);
}

// ---------------------------------------------------------------- teacher forcing
{
  const s = new Sketch(880, 360, { title: 'Training: the inputs the, cat, sat, down go through the masked decoder once and produce four predictions, scored against the targets cat, sat, down and full stop, which are the inputs shifted by one', seed: 2534 });
  s.text(440, 34, 'Training: one forward pass, one prediction per position', { size: 26, weight: 700 });
  const inp = TOK, tgt = ['cat', 'sat', 'down', '.'];
  s.rect(70, 158, 460, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(300, 186, 'decoder (causal mask inside)', { size: 20 });
  inp.forEach((t, i) => {
    const x = 70 + i * 120;
    s.rect(x, 258, 100, 42, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 50, 285, t, { font: 'mono', size: 17 });
    s.arrow(x + 50, 254, x + 50, 207, { color: C.muted });
    s.rect(x, 66, 100, 42, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + 50, 93, tgt[i], { font: 'mono', size: 17 });
    s.arrow(x + 50, 154, x + 50, 113, { color: C.green });
  });
  s.text(548, 93, 'targets', { size: 20, anchor: 'start', color: C.green, weight: 700 });
  s.text(548, 285, 'inputs', { size: 20, anchor: 'start', weight: 700 });
  s.note(632, 136, 214, 92, ['target i is input i+1:', 'the same sentence,', 'shifted by one'], { size: 19 });
  s.text(440, 336, 'without the mask, position i could read input i+1, which is exactly its target', { size: 18, color: C.rose });
  save('25.3-teacher-forcing.svg', s);
}

// ---------------------------------------------------------------- decode loop
{
  const s = new Sketch(880, 420, { title: 'Decoding loop: tokens so far go through the model, the last row of logits gives one new token, which is appended and fed back. Steps 1, 4 and 5 of the demo run are shown', seed: 2535 });
  s.text(440, 34, 'Generation: predict one token, append it, repeat', { size: 26, weight: 700 });
  const boxes = [[40, 150, 'tokens so far', C.ink, C.amberSoft], [240, 100, 'model', C.blue, C.blueSoft], [390, 190, 'logits, last row only', C.violet, C.blueSoft], [630, 130, 'pick a token', C.green, C.greenSoft]];
  boxes.forEach(([x, w, label, col, fill], i) => {
    s.rect(x, 70, w, 46, { color: col, fill, fillStyle: 'solid' });
    s.text(x + w / 2, 99, label, { size: 19 });
    if (i < 3) s.arrow(x + w + 5, 93, boxes[i + 1][0] - 6, 93, { color: C.muted });
  });
  s.curveArrow(695, 121, 420, 215, 118, 123, { color: C.amber, width: 2 });
  s.text(410, 186, 'append it and go again', { size: 19, color: C.amber });
  const run = [['step 1', ['the', 'cat'], 'cat'], ['step 4', ['the', 'cat', 'cat', 'cat', 'cat'], 'mat'], ['step 5', ['the', 'cat', 'cat', 'cat', 'cat', 'mat'], '.']];
  run.forEach(([label, ctx, next], r) => {
    const y = 232 + r * 56;
    s.text(40, y + 24, label, { size: 19, anchor: 'start', color: C.muted });
    ctx.forEach((t, i) => {
      s.rect(120 + i * 62, y, 54, 34, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid', width: 1.2 });
      s.text(147 + i * 62, y + 23, t, { font: 'mono', size: 15 });
    });
    const xn = 120 + ctx.length * 62 + 44;
    s.arrow(120 + ctx.length * 62 - 2, y + 17, xn - 6, y + 17, { color: C.muted, head: 8 });
    s.rect(xn, y, 54, 34, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.6 });
    s.text(xn + 27, y + 23, next, { font: 'mono', size: 15 });
  });
  s.note(640, 244, 204, 112, ['the stand-in model', 'has random weights,', 'so the text is', 'nonsense'], { size: 19 });
  save('25.3-decode-loop.svg', s);
}

// ---------------------------------------------------------------- recompute vs reuse
{
  const s = new Sketch(880, 380, { title: 'As the sequence grows from 3 to 4 to 5 tokens, the earlier rows of the attention pattern are identical and only the last row is new. In the demo run the full recompute processed 27 rows where only 7 were distinct', seed: 2536 });
  s.text(440, 34, 'Old rows never change, so recomputing them is waste', { size: 26, weight: 700 });
  const cell = 26, top = 96;
  [[3, 50], [4, 172], [5, 320]].forEach(([n, x0]) => {
    for (let r = 0; r < n; r++) for (let c = 0; c <= r; c++) fillRect(s, x0 + c * cell, top + r * cell, cell, cell, r === n - 1 ? C.amberSoft : C.blueSoft);
    s.grid(x0, top, n, n, cell, { color: C.ink, width: 1.2 });
    s.text(x0 + (n * cell) / 2, top + n * cell + 26, `${n} tokens`, { size: 18, color: C.muted });
  });
  s.arrow(134, 136, 166, 136, { color: C.muted, head: 8 });
  s.arrow(282, 148, 314, 148, { color: C.muted, head: 8 });
  fillRect(s, 50, 278, 22, 22, C.blueSoft);
  s.rect(50, 278, 22, 22, { color: C.ink, width: 1 });
  s.text(82, 295, 'same numbers as the step before', { size: 18, anchor: 'start' });
  fillRect(s, 50, 312, 22, 22, C.amberSoft);
  s.rect(50, 312, 22, 22, { color: C.ink, width: 1 });
  s.text(82, 329, 'new row: the only real work', { size: 18, anchor: 'start' });
  s.text(50, 362, 'blank cells: masked (future)', { size: 17, anchor: 'start', color: C.muted });

  s.text(690, 86, 'demo run: 2-token prompt, 6 steps', { size: 19, weight: 700 });
  s.text(540, 124, 'rows computed by the loop', { size: 18, anchor: 'start', color: C.rose });
  s.rect(540, 134, 270, 30, { color: C.rose, fill: C.rose });
  s.text(820, 156, '27', { font: 'mono', size: 18, anchor: 'start' });
  s.text(540, 204, 'distinct rows', { size: 18, anchor: 'start', color: C.green });
  s.rect(540, 214, 70, 30, { color: C.green, fill: C.green });
  s.text(620, 236, '7', { font: 'mono', size: 18, anchor: 'start' });
  s.note(540, 276, 300, 76, ['n tokens: n(n+1)/2 rows vs n', 'n = 1000: 500,500 vs 1,000'], { size: 19 });
  save('25.3-recompute-vs-reuse.svg', s);
}
