// Diagrams for 30.3 (Trainer, Accelerate, streaming).
// Run: node scripts/diagrams/lessons/30.3.mjs
// Every number comes from scripts/diagrams/lessons/30.3_data.json (written by 30.3_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-30-huggingface/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '30.3_data.json'), 'utf8'));
const f = (v, d = 1) => Number(v).toFixed(d);
const fmtVec = (v) => '[' + v.map((x) => f(x, 3)).join(', ') + ']';

// ---------------------------------------------------------------- 30.3-stream-pipeline.svg
{
  const s = new Sketch(880, 270, { title: 'Streamed pipeline: source, lazy map, batch, train step; the training step pulls one batch at a time', seed: 301 });
  s.text(440, 34, 'A streamed dataset is pulled one batch at a time', { size: 24, weight: 700 });
  const boxes = [
    [40, '3 shards', '5 examples each', C.blue, C.blueSoft],
    [270, 'tokenize', 'lazy map', C.violet, C.blueSoft],
    [480, 'batch(2)', '8 batches in all', C.amber, C.amberSoft],
    [680, 'train step', 'forward + backward', C.green, C.greenSoft],
  ];
  for (const [x, a, b, col, soft] of boxes) {
    s.rect(x, 80, 170, 60, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 85, 106, a, { font: 'mono', size: 16 });
    s.text(x + 85, 128, b, { size: 15 });
  }
  s.arrow(210, 110, 270, 110, { color: C.muted });
  s.arrow(440, 110, 480, 110, { color: C.muted });
  s.arrow(650, 110, 680, 110, { color: C.muted });
  s.arrow(760, 152, 560, 152, { color: C.rose, dash: '6 8' });
  s.text(660, 172, 'next() asks the previous stage for one batch', { size: 16, color: C.rose });
  s.note(40, 196, 800, 60, [
    `After the first batch: ${data.lazy_first_batch.source_read} read, ${data.lazy_first_batch.map_calls} tokenized.`,
    `Full pass: ${data.lazy_total.source_read} read, ${data.lazy_total.map_calls} tokenized, ${data.lazy_total.batches} batches (last has ${data.lazy_total.last_batch_size}).`,
  ], { size: 18 });
  save('30.3-stream-pipeline.svg', s);
}

// ---------------------------------------------------------------- 30.3-shuffle-buffer.svg
{
  const s = new Sketch(880, 380, { title: 'Mean displacement of shuffled order by shuffle-buffer size, N = 1000', seed: 302 });
  s.text(440, 34, 'Shuffle buffer size controls how far examples move', { size: 24, weight: 700 });
  const base = 300, k = 0.6;
  s.line(100, base, 780, base, { color: C.muted });
  const bars = [['1', 170], ['10', 350], ['100', 530], ['1000', 710]];
  bars.forEach(([b, x], i) => {
    const v = data.shuffle[b].mean_displacement;
    const h = v * k;
    if (h > 0) s.rect(x - 55, base - h, 110, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x, base - h - 12, f(v), { font: 'mono', size: 18 });
    s.text(x, base + 28, `buffer ${b}`, { size: 18 });
    void i;
  });
  const ref = base - data.shuffle_uniform_reference * k;
  s.line(120, ref, 780, ref, { color: C.rose, dash: '6 8' });
  s.text(130, ref - 10, `uniform shuffle: N/3 = ${f(data.shuffle_uniform_reference, 0)}`, { size: 17, color: C.rose, anchor: 'start' });
  s.text(40, 200, 'mean displacement', { size: 17, color: C.muted, rotate: -90 });
  s.text(440, 362, 'Buffer 1 keeps the source order; buffer 1000 = N is a full shuffle.', { size: 18 });
  save('30.3-shuffle-buffer.svg', s);
}

// ---------------------------------------------------------------- 30.3-grad-accum.svg
{
  const s = new Sketch(880, 370, { title: 'Four micro-batches of 8 accumulate to the gradient of one batch of 32', seed: 303 });
  s.text(440, 34, 'Four micro-batches of 8 give the gradient of one batch of 32', { size: 24, weight: 700 });
  const xs = [60, 250, 440, 630];
  const targets = [350, 400, 480, 530];
  xs.forEach((x, i) => {
    s.rect(x, 74, 150, 80, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 75, 104, `micro-batch ${i + 1}`, { font: 'mono', size: 15 });
    s.text(x + 75, 130, '8 examples', { size: 17 });
    s.arrow(x + 75, 156, targets[i], 212, { color: C.muted });
  });
  s.rect(290, 212, 300, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 246, 'sum, then divide by 4', { font: 'mono', size: 17 });
  s.arrow(440, 270, 440, 300, { color: C.muted });
  s.text(440, 326, `= gradient on all 32 examples: ${fmtVec(data.accum.g_full)}`, { size: 19 });
  s.text(440, 354, `Forgetting the division by 4 makes the gradient ${f(data.accum.naive_over_full_ratio, 1)}x too large.`, { size: 17, color: C.rose });
  save('30.3-grad-accum.svg', s);
}

// ---------------------------------------------------------------- 30.3-sharding.svg
{
  const s = new Sketch(880, 310, { title: 'Two processes, batch 5 each, 9 samples: the last slot is filled from the start', seed: 304 });
  s.text(440, 34, '9 samples, 2 processes, batch 5 each: one step takes 10 slots', { size: 24, weight: 700 });
  const rows = [
    { y: 86, label: 'process 0', items: data.sharding.process_0[0] },
    { y: 166, label: 'process 1', items: data.sharding.process_1[0] },
  ];
  for (const row of rows) {
    s.text(40, row.y + 31, row.label, { size: 20, anchor: 'start' });
    row.items.forEach((id, i) => {
      const x = 190 + i * 120;
      const dup = data.sharding.duplicated_ids.includes(id) && row.label === 'process 1';
      s.rect(x, row.y, 100, 50, { color: dup ? C.rose : C.blue, fill: dup ? C.roseSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x + 50, row.y + 31, String(id), { font: 'mono', size: 20 });
      if (dup) s.text(x + 50, row.y + 72, 'duplicate', { size: 17, color: C.rose });
    });
  }
  s.text(440, 282, `gather_for_metrics: ${data.sharding.gathered_before_dedup} items in, ${data.sharding.after_gather_for_metrics} out (the duplicate is dropped)`, { size: 19 });
  save('30.3-sharding.svg', s);
}

console.log('wrote 30.3 diagrams to', OUT);
