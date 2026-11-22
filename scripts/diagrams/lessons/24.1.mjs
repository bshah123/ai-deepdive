import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-24-embeddings/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from exp-24.1.py (NumPy, seed 0 for the gradient check).

{ // 1. A lookup is a one-hot row times the table. V=4, d=2 worked example.
  const s = new Sketch(880, 340, { title: 'A one-hot row times the embedding table selects one row', seed: 2401 });
  s.text(440, 40, 'A lookup is a one-hot row times the table', { size: 26, weight: 700 });
  // one-hot vector for "cat" (id 1)
  const oh = [0, 1, 0, 0];
  oh.forEach((v, i) => {
    s.rect(60 + i * 44, 130, 44, 44, { color: C.blue, fill: v ? C.blueSoft : undefined, fillStyle: 'solid' });
    s.text(82 + i * 44, 160, String(v), { font: 'mono', size: 18 });
  });
  s.text(138, 112, 'one-hot("cat")', { size: 17, color: C.muted });
  s.text(265, 162, '×', { size: 30 });
  // table E, 4 rows x 2 columns
  const E = [[1, 0], [0, 1], [1, 1], [2, -1]];
  const labels = ['the', 'cat', 'sat', '<eos>'];
  E.forEach((row, r) => {
    row.forEach((v, c) => {
      const hi = r === 1;
      s.rect(290 + c * 70, 90 + r * 44, 70, 44, { color: C.muted, fill: hi ? C.blueSoft : undefined, fillStyle: 'solid' });
      s.text(325 + c * 70, 118 + r * 44, String(v), { font: 'mono', size: 18, color: hi ? C.blue : C.ink });
    });
    s.text(446, 118 + r * 44, labels[r], { font: 'mono', size: 17, anchor: 'start', color: C.muted });
  });
  s.text(600, 162, '=', { size: 30 });
  // result: row 1 of E
  [0, 1].forEach((v, c) => {
    s.rect(640 + c * 70, 130, 70, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(675 + c * 70, 158, String(v), { font: 'mono', size: 18 });
  });
  s.text(440, 304, 'Multiplying by a one-hot row selects one row of E: the lookup.', { size: 19 });
  s.text(440, 330, 'Real models do the selection directly, without the multiply.', { size: 17, color: C.muted });
  save('24.1-lookup.svg', s);
}

{ // 2. Untied versus tied input and output matrices.
  const s = new Sketch(880, 330, { title: 'Untied and tied input and output embedding matrices', seed: 2402 });
  s.text(60, 50, 'Untied', { size: 22, weight: 700, anchor: 'start' });
  s.rect(60, 66, 170, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(145, 100, 'E_in  (V × d)', { font: 'mono', size: 17 });
  s.arrow(236, 94, 296, 94, { color: C.muted });
  s.rect(300, 66, 280, 56, { color: C.muted, fill: undefined });
  s.text(440, 100, 'transformer layers', { size: 19 });
  s.arrow(586, 94, 646, 94, { color: C.muted });
  s.rect(650, 66, 170, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(735, 100, 'W_out  (V × d)', { font: 'mono', size: 17 });
  s.text(440, 150, 'two separate V × d matrices', { size: 18, color: C.muted });

  s.text(60, 200, 'Tied', { size: 22, weight: 700, anchor: 'start' });
  s.rect(60, 216, 170, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(145, 250, 'E  (V × d)', { font: 'mono', size: 17 });
  s.arrow(236, 244, 296, 244, { color: C.muted });
  s.rect(300, 216, 280, 56, { color: C.muted, fill: undefined });
  s.text(440, 250, 'transformer layers', { size: 19 });
  s.arrow(586, 244, 646, 244, { color: C.muted });
  s.rect(650, 216, 170, 56, { color: C.green, dash: '6 8' });
  s.text(735, 250, 'same E', { font: 'mono', size: 17 });
  s.text(440, 300, 'one V × d tensor, read at both ends: V·d parameters saved', { size: 19 });
  save('24.1-tying.svg', s);
}

{ // 3. Worked example: tied logits and softmax probabilities.
  const s = new Sketch(880, 360, { title: 'Tied logits and softmax probabilities for four tokens', seed: 2403 });
  s.text(440, 36, 'Tied head: logits = E·h, then softmax', { size: 24, weight: 700 });
  const words = ['the', 'cat', 'sat', '<eos>'];
  const logits = [1, 2, 3, 0];
  const probs = [0.0871, 0.2369, 0.6439, 0.0321];
  s.text(208, 64, 'logits  E·h', { size: 19, color: C.muted });
  s.text(648, 64, 'probabilities', { size: 19, color: C.muted });
  s.line(40, 290, 380, 290, { color: C.muted });
  s.line(480, 290, 840, 290, { color: C.muted });
  logits.forEach((v, i) => {
    const x = 60 + i * 80, h = v * 60;
    if (h > 0) s.rect(x, 290 - h, 56, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 28, 290 - h - 10, String(v), { font: 'mono', size: 17 });
    s.text(x + 28, 316, words[i], { font: 'mono', size: 15, color: C.muted });
  });
  probs.forEach((p, i) => {
    const x = 500 + i * 80, h = p * 300;
    s.rect(x, 290 - h, 56, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 28, 290 - h - 10, p.toFixed(3), { font: 'mono', size: 17 });
    s.text(x + 28, 316, words[i], { font: 'mono', size: 15, color: C.muted });
  });
  s.arrow(396, 200, 468, 200, { color: C.muted });
  s.text(432, 186, 'softmax', { size: 18, color: C.muted });
  s.text(440, 346, 'h = [1, 2]; if "sat" is the target, the loss is −ln 0.644 = 0.440 nats.', { size: 17, color: C.muted });
  save('24.1-logits.svg', s);
}

{ // 4. Gradient rows: output path touches every row, input path touches one.
  const s = new Sketch(880, 380, { title: 'Gradient rows touched by the two paths', seed: 2404 });
  s.text(440, 36, 'Where the gradient of the tied table lands', { size: 24, weight: 700 });
  s.text(190, 78, 'output path (softmax head)', { size: 18, color: C.muted });
  s.text(640, 78, 'input path (lookup)', { size: 18, color: C.muted });
  for (let r = 0; r < 6; r++) {
    const y = 100 + r * 38;
    s.text(60, y + 22, `v${r}`, { font: 'mono', size: 17, anchor: 'end', color: C.muted });
    s.rect(80, y, 220, 28, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(460, y + 22, `v${r}`, { font: 'mono', size: 17, anchor: 'end', color: C.muted });
    if (r === 2) s.rect(480, y, 220, 28, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    else s.rect(480, y, 220, 28, { color: C.muted, dash: '6 8' });
  }
  s.text(190, 340, '6 of 6 rows nonzero: dense', { size: 19 });
  s.text(590, 340, '1 of 6 rows nonzero (token 2): sparse', { size: 19 });
  s.text(440, 368, 'Sum the two, then both paths are checked against finite differences.', { size: 17, color: C.muted });
  save('24.1-gradient-paths.svg', s);
}

{ // 5. Embedding parameter count and fp32 memory for three vocabulary sizes at d = 768.
  const s = new Sketch(880, 380, { title: 'Embedding parameters for three vocabulary sizes', seed: 2405 });
  s.text(440, 36, 'Embedding parameters V·d at d = 768', { size: 24, weight: 700 });
  const rows = [
    { V: '32,000', m: 24.6, mb: 98.3 },
    { V: '50,257', m: 38.6, mb: 154.4 },
    { V: '128,000', m: 98.3, mb: 393.2 },
  ];
  s.line(60, 270, 820, 270, { color: C.muted });
  rows.forEach((r, i) => {
    const x = 170 + i * 240, h = r.m * 2.2;
    s.rect(x, 270 - h, 130, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 65, 270 - h - 12, `${r.m} M params`, { font: 'mono', size: 17 });
    s.text(x + 65, 300, `V = ${r.V}`, { font: 'mono', size: 17, color: C.muted });
    s.text(x + 65, 324 - 4 + 0, `${r.mb} MB fp32`, { font: 'mono', size: 15, color: C.muted });
  });
  s.text(440, 352, 'Tying removes one of these matrices from the model.', { size: 18, color: C.muted });
  save('24.1-memory.svg', s);
}
