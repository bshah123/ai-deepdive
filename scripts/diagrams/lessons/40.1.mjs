// Diagrams for 40.1 (lost in the middle, attention dilution).
// Run: node scripts/diagrams/lessons/40.1.mjs
// Numbers: scripts/diagrams/lessons/40.1_data.py (run it to reprint them). The bias-curve values
// are toy-model outputs (assumed positional bias), not measurements of any real LLM.
// The paper values are from Liu et al. (2023), GPT-3.5-Turbo (16K) row, multi-document QA.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-40-context-optimization/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 40.1-dilution-intuition.svg
{
  const s = new Sketch(880, 350, { title: 'Three stacked bars: the gold document share of the softmax weight falls from 0.668 at 10 distractors to 0.167 at 100 and 0.020 at 1000', seed: 4011 });
  s.text(440, 34, 'One relevant chunk among n distractors', { size: 26, weight: 700 });
  const rows = [
    { n: 10, gold: '0.668', rest: '10 × 0.033 each', goldW: 0.6676, label: 'gold 0.668' },
    { n: 100, gold: '0.167', rest: '100 × 0.0083 each', goldW: 0.1673, label: 'gold 0.167' },
    { n: 1000, gold: '0.020', rest: '1000 × 0.00098 each', goldW: 0.0197, label: 'gold 0.020' },
  ];
  const W = 500, X0 = 190;
  rows.forEach((r, i) => {
    const y = 84 + i * 84;
    s.text(170, y + 31, `n = ${r.n}`, { font: 'mono', size: 20, anchor: 'end' });
    const gw = r.goldW * W;
    s.rect(X0, y, gw, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.rect(X0 + gw, y, W - gw, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(X0 + gw + (W - gw) / 2, y + 31, r.rest, { size: 17 });
    s.text(X0 + W + 12, y + 31, r.label, { font: 'mono', size: 18, anchor: 'start' });
  });
  s.text(440, 326, 'gold share = e^3 / (e^3 + n); each distractor gets e^0 / (e^3 + n)', { size: 19, color: C.muted });
  save('40.1-dilution-intuition.svg', s);
}

// ---------------------------------------------------------------- 40.1-dilution-curve.svg
{
  const s = new Sketch(880, 370, { title: 'Gold attention share falls as the number of distractors grows on a log axis; simulated points sit on the same curve', seed: 4012 });
  s.text(440, 34, 'Softmax dilution: gold share against n', { size: 26, weight: 700 });
  const X = (n) => 110 + Math.log10(n) * 230;
  const Y = (v) => 290 - v * 220;
  s.line(110, 290, 800, 290, { color: C.ink, width: 2 });
  s.line(110, 70, 110, 290, { color: C.ink, width: 2 });
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
    s.text(96, Y(v) + 6, v.toFixed(2), { font: 'mono', size: 15, anchor: 'end', color: C.muted });
    s.line(110, Y(v), 800, Y(v), { color: C.muted, width: 1, dash: '4 6' });
  });
  [1, 10, 100, 1000].forEach((n) => s.text(X(n), 314, String(n), { font: 'mono', size: 16 }));
  s.text(455, 350, 'number of distractor chunks n (log scale)', { size: 19, color: C.muted });
  s.text(40, 180, 'gold share', { size: 18, color: C.muted, rotate: -90 });
  // exact curve: distractor scores all 0, gold score 3
  const g = Math.exp(3);
  let prev = null;
  for (let i = 0; i <= 80; i++) {
    const n = 10 ** (3 * i / 80);
    const v = g / (g + n);
    const p = [X(n), Y(v)];
    if (prev) s.line(prev[0], prev[1], p[0], p[1], { color: C.green, width: 3 });
    prev = p;
  }
  // simulated (random Gaussian keys, d = 64), from block1_dilution.py
  [[1, 0.934], [10, 0.570], [100, 0.110], [1000, 0.012]].forEach(([n, v]) => {
    s.circle(X(n), Y(v), 13, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  });
  s.text(560, 120, 'green line: distractor score 0 (exact)', { size: 18, color: C.green, anchor: 'start' });
  s.text(560, 148, 'amber dots: random keys, simulated', { size: 18, color: C.amber, anchor: 'start' });
  save('40.1-dilution-curve.svg', s);
}

// ---------------------------------------------------------------- 40.1-paper-positions.svg
{
  const s = new Sketch(880, 380, { title: 'Grouped bars: accuracy is lowest when the answer document sits in the middle, for 10, 20 and 30 documents', seed: 4013 });
  s.text(440, 34, 'Accuracy by where the answer document sits', { size: 26, weight: 700 });
  const kinds = [['first', C.green, C.greenSoft], ['middle', C.rose, C.roseSoft], ['last', C.blue, C.blueSoft]];
  kinds.forEach(([name, col, soft], i) => {
    const x = 300 + i * 170;
    s.rect(x - 9, 56, 18, 18, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 16, 71, name, { size: 19, anchor: 'start' });
  });
  const Y = (v) => 310 - v * 2.2;
  s.line(160, 310, 760, 310, { color: C.ink, width: 2 });
  s.line(160, 90, 160, 310, { color: C.ink, width: 2 });
  [0, 50, 100].forEach((v) => s.text(148, Y(v) + 6, String(v), { font: 'mono', size: 15, anchor: 'end', color: C.muted }));
  s.text(96, 200, 'accuracy (%)', { size: 18, color: C.muted, rotate: -90 });
  // GPT-3.5-Turbo (16K) from Liu et al. (2023), multi-document QA: [first, middle, last]
  const data = [[10, [76.9, 61.0, 62.5]], [20, [75.7, 54.1, 63.1]], [30, [73.4, 50.9, 63.7]]];
  data.forEach(([k, vals], gi) => {
    const c = 260 + gi * 240;
    vals.forEach((v, i) => {
      const x = c - 92 + i * 64;
      const [, col, soft] = kinds[i];
      s.rect(x, Y(v), 56, 310 - Y(v), { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + 28, Y(v) - 10, v.toFixed(1), { font: 'mono', size: 15 });
    });
    s.text(c, 346, `${k} documents`, { size: 19 });
  });
  s.text(440, 374, 'GPT-3.5-Turbo (16K), Liu et al. 2023: single runs, no error bars', { size: 17, color: C.muted });
  save('40.1-paper-positions.svg', s);
}

// ---------------------------------------------------------------- 40.1-positional-bias.svg
{
  const s = new Sketch(880, 370, { title: 'Toy model, 20 documents: attention share on the gold document by position, with and without an assumed U-shaped positional bias', seed: 4014 });
  s.text(440, 34, 'Toy model: where the gold document sits (n = 20)', { size: 25, weight: 700 });
  const X = (p) => 130 + p * (620 / 19);
  const Y = (v) => 300 - v * 340;
  s.line(130, 300, 760, 300, { color: C.ink, width: 2 });
  s.line(130, 80, 130, 300, { color: C.ink, width: 2 });
  [0, 0.2, 0.4, 0.6].forEach((v) => {
    s.text(118, Y(v) + 6, v.toFixed(1), { font: 'mono', size: 15, anchor: 'end', color: C.muted });
    s.line(130, Y(v), 760, Y(v), { color: C.muted, width: 1, dash: '4 6' });
  });
  s.text(40, 190, 'attention share', { size: 18, color: C.muted, rotate: -90 });
  // toy outputs from 40.1_data.py part 2
  const flat = Array(20).fill(0.405);
  const bias = [0.619, 0.542, 0.471, 0.412, 0.364, 0.325, 0.297, 0.276, 0.263, 0.256, 0.256, 0.263, 0.276, 0.297, 0.325, 0.363, 0.412, 0.472, 0.543, 0.621];
  const draw = (arr, col, dash) => {
    arr.forEach((v, p) => {
      if (p > 0) s.line(X(p - 1), Y(arr[p - 1]), X(p), Y(v), { color: col, width: 3, dash });
    });
    arr.forEach((v, p) => s.circle(X(p), Y(v), 9, { color: col, fill: col, fillStyle: 'solid' }));
  };
  draw(flat, C.muted, '6 8');
  draw(bias, C.rose);
  s.text(X(0), 326, 'first', { size: 18 });
  s.text(X(9.5), 326, 'middle', { size: 18 });
  s.text(X(19), 326, 'last', { size: 18 });
  s.text(445, 356, 'document position in the prompt', { size: 18, color: C.muted });
  s.text(330, 122, 'grey dashed: no positional bias', { size: 17, color: C.muted, anchor: 'start' });
  s.text(330, 150, 'red: U-shaped bias (assumed, strength 1.5)', { size: 17, color: C.rose, anchor: 'start' });
  save('40.1-positional-bias.svg', s);
}
