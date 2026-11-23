import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-05-information-retrieval/chapter-35-vector-search/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// All numbers below come from the experiment in the lesson (NumPy, seed 0, 20,000 vectors, 200 queries).

// 1. Scatter-gather: each shard returns its own top-k; the coordinator merges.
{
  const s = new Sketch(880, 430, { title: 'Scatter-gather over four shards', seed: 401 });
  s.text(440, 34, 'Scatter-gather over four shards', { size: 24, weight: 700 });
  s.rect(40, 150, 140, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 186, 'query', { font: 'mono', size: 18 });
  for (let i = 0; i < 4; i++) {
    const y = 62 + i * 62;
    s.rect(260, y, 230, 48, { color: C.muted, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(375, y + 30, `shard ${i}: local top-10`, { font: 'mono', size: 16 });
    s.arrow(180, 180, 260, y + 24, { color: C.muted });
    s.arrow(490, y + 24, 590, 200, { color: C.muted });
  }
  s.rect(590, 150, 250, 100, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(715, 186, 'merge 40 candidates', { font: 'mono', size: 17 });
  s.text(715, 218, 'keep the best 10', { font: 'mono', size: 17 });
  s.note(40, 332, 800, 80, [
    'Each shard returns 10: merged result = global exact top-10 for 200 of 200 queries.',
    'Each shard returns only 3: merged result is correct for 47 of 200 queries.',
  ], { size: 19 });
  save('35.4-scatter-gather.svg', s);
}

// 2. Filter strategies: results returned out of 10, by filter selectivity.
{
  const s = new Sketch(880, 450, { title: 'Results returned by three filter strategies', seed: 402 });
  s.text(440, 34, 'Results returned out of 10, by filter strategy', { size: 24, weight: 700 });
  const legend = [['post-filter', C.rose, C.roseSoft], ['overfetch', C.amber, C.amberSoft], ['in-scan', C.green, C.greenSoft]];
  legend.forEach(([name, col, soft], i) => {
    const x = 170 + i * 220;
    s.rect(x, 62, 26, 18, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 36, 77, name, { size: 18, font: 'mono', anchor: 'start' });
  });
  const Y0 = 360, U = 24;
  s.line(120, Y0, 800, Y0, { color: C.muted });
  s.line(120, Y0, 120, Y0 - 10 * U - 10, { color: C.muted });
  s.text(104, Y0 - 10 * U + 6, '10', { size: 17, font: 'mono', anchor: 'end' });
  s.text(104, Y0 + 6, '0', { size: 17, font: 'mono', anchor: 'end' });
  const groups = [
    { label: 'match 50%', v: [4.95, 9.34, 10.00] },
    { label: 'match 10%', v: [0.96, 8.80, 10.00] },
    { label: 'match 1%', v: [0.12, 8.54, 9.53] },
  ];
  const cols = [[C.rose, C.roseSoft], [C.amber, C.amberSoft], [C.green, C.greenSoft]];
  groups.forEach((g, gi) => {
    const gx = 230 + gi * 230;
    g.v.forEach((val, j) => {
      const cx = gx + (j - 1) * 60;
      const h = val * U;
      s.rect(cx - 24, Y0 - h, 48, h, { color: cols[j][0], fill: cols[j][1], fillStyle: 'solid' });
      s.text(cx, Y0 - h - 10, val.toFixed(2), { size: 16, font: 'mono' });
    });
    s.text(gx, Y0 + 36, g.label, { size: 20, weight: 700 });
  });
  s.text(440, 428, 'Mean over 200 queries. The full bar height (10) is the number requested.', { size: 17, color: C.muted });
  save('35.4-filter-strategies.svg', s);
}

// 3. Memory per vector precision (10M vectors, 768 dimensions).
{
  const s = new Sketch(880, 410, { title: 'Memory for 10M vectors of 768 dimensions', seed: 403 });
  s.text(440, 34, 'Raw vector memory: 10M vectors × 768 dimensions', { size: 24, weight: 700 });
  const data = [['float32', 30.72, C.blue, C.blueSoft], ['float16', 15.36, C.blue, C.blueSoft], ['int8', 7.68, C.green, C.greenSoft], ['1-bit', 0.96, C.green, C.greenSoft]];
  const base = 282, k = 6.2;
  data.forEach(([name, gb, col, soft], i) => {
    const x = 130 + i * 180, h = gb * k;
    s.rect(x, base - h, 100, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 50, base - h - 12, `${gb.toFixed(2)} GB`, { size: 18, font: 'mono' });
    s.text(x + 50, base + 34, name, { size: 19, font: 'mono' });
  });
  s.line(100, base, 860, base, { color: C.muted });
  s.note(120, 344, 640, 36, ['int8 keeps 0.970 of the top-10 neighbours on our test set; 1-bit not measured.'], { size: 17 });
  save('35.4-memory-precision.svg', s);
}

// 4. Tombstoned deletes: live results out of 10 when the index is not rebuilt.
{
  const s = new Sketch(880, 330, { title: 'Live results left after tombstone deletes', seed: 404 });
  s.text(440, 34, 'Live results out of 10 after tombstone deletes', { size: 24, weight: 700 });
  const rows = [['0% deleted', 10.0], ['30% deleted', 6.9], ['60% deleted', 3.72]];
  const x0 = 220, U = 48;
  rows.forEach(([label, v], i) => {
    const y = 90 + i * 70;
    s.text(200, y + 24, label, { size: 19, font: 'mono', anchor: 'end' });
    s.rect(x0, y, 10 * U, 40, { color: C.muted, dash: '6 8' });
    s.rect(x0, y, v * U, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x0 + 10 * U + 14, y + 26, v.toFixed(2), { size: 18, font: 'mono', anchor: 'start' });
  });
  s.text(440, 300, 'Mean over 200 queries. Dashed outline: the 10 results requested.', { size: 17, color: C.muted });
  save('35.4-tombstone-live.svg', s);
}
