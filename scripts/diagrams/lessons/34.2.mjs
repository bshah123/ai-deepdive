import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-05-information-retrieval/chapter-34-dense-embeddings/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from scripts/diagrams/lessons/34.2 experiment run (block1 and block2 outputs).

// 1. One batch is a grid of comparisons: diagonal = positives, everything else = negatives.
{
  const s = new Sketch(880, 360, { title: 'A batch of four query-document pairs as a 4 by 4 grid; diagonal cells are positives', seed: 341 });
  s.text(440, 36, 'One batch = a grid of comparisons', { size: 26, weight: 700 });
  const B = 4, cell = 56, x0 = 250, y0 = 110;
  for (let j = 0; j < B; j++) s.text(x0 + cell * j + cell / 2, y0 - 14, `d${j + 1}`, { size: 19 });
  for (let i = 0; i < B; i++) s.text(x0 - 14, y0 + cell * i + cell / 2 + 7, `q${i + 1}`, { size: 19, anchor: 'end' });
  for (let i = 0; i < B; i++) {
    for (let j = 0; j < B; j++) {
      const diag = i === j;
      const x = x0 + cell * j, y = y0 + cell * i;
      s.rect(x, y, cell, cell, { color: diag ? C.green : C.muted, fill: diag ? C.greenSoft : undefined, fillStyle: 'solid', width: diag ? 1.6 : 1.0 });
      s.text(x + cell / 2, y + cell / 2 + 9, diag ? '+' : '−', { size: 26, font: 'mono', color: diag ? C.green : C.muted });
    }
  }
  const pairs = (b) => b * (b - 1);
  s.text(540, 150, [
    'Row i: query i vs all docs',
    'Target of row i: doc i (+)',
    'Softmax per row, then −log p(+)',
  ], { size: 20, anchor: 'start' });
  s.text(540, 240, [
    `Negatives per query: B − 1 = ${B - 1}`,
    `Negatives per batch: B(B − 1) = ${pairs(B)}`,
    `B = 64 → ${pairs(64)} negatives per batch`,
    `B = 256 → ${pairs(256)} negatives per batch`,
  ], { size: 20, anchor: 'start' });
  save('34.2-batch-grid.svg', s);
}

// 2. Worked example, one query: similarity -> divide by tau -> exp -> softmax -> loss.
{
  const sims = [0.8, 0.1, -0.2];
  const tau = 0.1;
  const logits = sims.map((v) => v / tau);
  const ex = logits.map((v) => Math.exp(v));
  const sum = ex.reduce((a, b) => a + b, 0);
  const p = ex.map((v) => v / sum);
  const loss = -Math.log(p[0]);
  const steps = [
    { title: '1  similarity', lines: sims.map((v) => v.toFixed(1)) },
    { title: '2  ÷ τ = 0.1', lines: logits.map((v) => v.toFixed(0)) },
    { title: '3  exp', lines: ex.map((v) => v.toFixed(3)) },
    { title: '4  softmax', lines: p.map((v) => v.toFixed(5)) },
    { title: '5  −log p(+)', lines: [loss.toFixed(5)] },
  ];
  const s = new Sketch(880, 330, { title: 'Worked example: similarities to softmax to loss for one query', seed: 342 });
  s.text(440, 36, 'Worked example: one query, one positive, two negatives', { size: 24, weight: 700 });
  steps.forEach((st, k) => {
    const x = 30 + k * 170, y = 110, w = 140, h = 130;
    s.text(x + w / 2, y - 14, st.title, { size: 20 });
    s.rect(x, y, w, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + w / 2, y + 30, st.lines, { font: 'mono', size: 16 });
    if (k < steps.length - 1) s.arrow(x + w + 6, y + h / 2, x + 170 - 6, y + h / 2, { color: C.muted });
  });
  s.text(440, 290, 'p(+) is the first softmax entry; the other two entries are the negatives.', { size: 20 });
  save('34.2-worked-example.svg', s);
}

// 3 and 4. Bar charts with standard deviations over 5 seeds.
function barChart(file, seed, title, labels, means, sds, best, caption) {
  const s = new Sketch(880, 350, { title, seed });
  s.text(440, 36, title, { size: 24, weight: 700 });
  const left = 120, right = 820, base = 270, top = 80, vmax = 0.8;
  const y = (v) => base - (v / vmax) * (base - top);
  for (const g of [0.2, 0.4, 0.6, 0.8]) {
    s.line(left, y(g), right, y(g), { color: C.muted, width: 0.6 });
    s.text(left - 14, y(g) + 6, g.toFixed(1), { size: 17, anchor: 'end', color: C.muted });
  }
  s.line(left, base, right, base, { color: C.ink, width: 1.4 });
  s.text(62, 175, 'Recall@1', { size: 20, rotate: -90 });
  const slot = (right - left) / labels.length, bw = 80;
  labels.forEach((lab, k) => {
    const cx = left + slot * (k + 0.5), m = means[k], d = sds[k], hi = k === best;
    s.rect(cx - bw / 2, y(m), bw, base - y(m), { color: hi ? C.green : C.blue, fill: hi ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.line(cx, y(m - d), cx, y(m + d), { color: C.ink, width: 1.2 });
    s.line(cx - 8, y(m + d), cx + 8, y(m + d), { color: C.ink, width: 1.2 });
    s.line(cx - 8, y(m - d), cx + 8, y(m - d), { color: C.ink, width: 1.2 });
    s.text(cx, y(m + d) - 12, m.toFixed(3), { size: 19 });
    s.text(cx, base + 30, lab, { size: 19, font: 'mono' });
  });
  s.text(440, 336, caption, { size: 19, color: C.muted });
  save(file, s);
}

barChart(
  '34.2-temperature.svg', 343,
  'Temperature: recall@1 at batch size 64',
  ['τ=0.5', 'τ=0.2', 'τ=0.1', 'τ=0.05', 'τ=0.02'],
  [0.529, 0.618, 0.609, 0.596, 0.532],
  [0.019, 0.005, 0.009, 0.011, 0.022],
  1,
  'Mean ± sd over 5 seeds; 1000 held-out pairs; 400 steps; learning rate 0.5; chance = 0.001',
);

barChart(
  '34.2-batch-size.svg', 344,
  'Batch size: recall@1 at τ = 0.05',
  ['B=4', 'B=16', 'B=64', 'B=256'],
  [0.204, 0.486, 0.596, 0.614],
  [0.020, 0.012, 0.011, 0.006],
  -1,
  'Mean ± sd over 5 seeds; 1000 held-out pairs; 400 steps; learning rate 0.5; chance = 0.001',
);

// 5. Duplicate documents: the loss has a floor of log 2 for a perfect encoder.
{
  const s = new Sketch(880, 340, { title: 'Two identical documents in one batch: the loss cannot go below log 2', seed: 345 });
  s.text(440, 36, 'Duplicate documents create false negatives', { size: 24, weight: 700 });
  const cell = 90, x0 = 170, y0 = 100;
  s.text(x0 + cell / 2, y0 - 14, 'doc 1', { size: 19 });
  s.text(x0 + cell * 1.5, y0 - 14, 'doc 2', { size: 19 });
  s.text(x0 - 14, y0 + cell / 2 + 7, 'q1', { size: 19, anchor: 'end' });
  s.text(x0 - 14, y0 + cell * 1.5 + 7, 'q2', { size: 19, anchor: 'end' });
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const diag = i === j;
      const x = x0 + cell * j, y = y0 + cell * i;
      s.rect(x, y, cell, cell, { color: diag ? C.green : C.rose, fill: diag ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
      s.text(x + cell / 2, y + cell / 2 + 9, '0.5', { size: 26, font: 'mono' });
    }
  }
  s.text(x0 + cell, y0 + 2 * cell + 26, 'green = positive, rose = negative for the loss', { size: 17, color: C.muted });
  s.text(480, 120, [
    'Doc 2 has the same text as doc 1,',
    'so any encoder gives both the same vector.',
    'Row 1: p(doc 1) = 0.5, so loss = −log 0.5',
    `Loss = log 2 = ${Math.log(2).toFixed(3)} for any τ`,
  ], { size: 20, anchor: 'start' });
  save('34.2-duplicate-trap.svg', s);
}
