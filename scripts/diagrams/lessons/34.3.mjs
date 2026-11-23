// Diagrams for Lesson 34.3 (Matryoshka embeddings). Run: node scripts/diagrams/lessons/34.3.mjs
// Numbers: 34.3_results.json (from 34.3_data.py, 5 seeds) and the hand example in the lesson (4-d dot products).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'content/part-05-information-retrieval/chapter-34-dense-embeddings/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- 1. one vector, several prefixes
{
  const s = new Sketch(880, 300, { title: 'One 32-dimensional vector used at three prefix sizes', seed: 3401 });
  s.text(440, 34, 'One vector, three usable sizes', { size: 26, weight: 700 });
  const x0 = 200, cw = 20, h = 36;
  const rows = [
    { y: 70, m: 32, label: 'm = 32 (full)' },
    { y: 140, m: 8, label: 'm = 8' },
    { y: 210, m: 2, label: 'm = 2' },
  ];
  for (const r of rows) {
    s.text(40, r.y + 24, r.label, { size: 19, anchor: 'start', weight: 700 });
    for (let i = 0; i < 32; i++) {
      const x = x0 + i * cw;
      if (i < r.m) s.rect(x, r.y, cw, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.2 });
      else s.rect(x, r.y, cw, h, { color: C.muted, dash: '6 8', width: 1.2 });
    }
  }
  s.text(440, 276, 'The filled cells are the prefix. Every row is the same vector, cut shorter.', { size: 18, color: C.muted });
  save('34.3-nested-prefix.svg', s);
}

// ---------------------------------------------------------------- 2. MRL training: one loss per prefix
{
  const s = new Sketch(880, 360, { title: 'MRL training: one loss per prefix, summed', seed: 3402 });
  s.text(440, 34, 'MRL training: one loss per prefix, summed', { size: 26, weight: 700 });
  s.rect(40, 150, 150, 70, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 180, 'encoder', { size: 21, weight: 700 });
  s.text(115, 204, 'e = W x', { size: 19, font: 'mono' });
  const rowsY = [100, 185, 270];
  const labels = [['first 2 dims', 'head V2', 'loss 2'], ['first 8 dims', 'head V8', 'loss 8'], ['all 32 dims', 'head V32', 'loss 32']];
  rowsY.forEach((y, i) => {
    const [pre, head, loss] = labels[i];
    s.arrow(190, 185, 230, y + 25, { color: C.muted, width: 1.5, head: 9 });
    s.rect(230, y, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(305, y + 31, pre, { size: 18 });
    s.arrow(380, y + 25, 430, y + 25, { color: C.muted, width: 1.5, head: 9 });
    s.rect(430, y, 130, 50, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(495, y + 31, head, { size: 18 });
    s.arrow(560, y + 25, 610, y + 25, { color: C.muted, width: 1.5, head: 9 });
    s.rect(610, y, 110, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(665, y + 31, loss, { size: 18 });
    s.arrow(720, y + 25, 752, 205, { color: C.muted, width: 1.5, head: 9 });
  });
  s.rect(752, 175, 110, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(807, 200, 'sum of', { size: 18 });
  s.text(807, 222, 'losses', { size: 18 });
  s.text(440, 344, 'Gradients from every loss reach the same first coordinates of W.', { size: 18, color: C.muted });
  save('34.3-training-heads.svg', s);
}

// ---------------------------------------------------------------- 3. the hand example: ranking flips with prefix size
// Data: lesson 34.3, hand example. q = (1,1,1,1); a = (0,0,3,3); b = (2,1,-1,-1); unnormalised dot product on the prefix.
const q = [1, 1, 1, 1], a = [0, 0, 3, 3], b = [2, 1, -1, -1];
const dot = (u, v, m) => u.slice(0, m).reduce((t, x, i) => t + x * v[i], 0);
{
  const s = new Sketch(880, 380, { title: 'Ranking of two documents changes with prefix size', seed: 3403 });
  s.text(440, 34, 'Same query, same documents, different winner', { size: 26, weight: 700 });
  s.text(40, 80, 'query  q = (1, 1, 1, 1)', { font: 'mono', size: 18, anchor: 'start' });
  s.text(40, 110, 'doc a   = (0, 0, 3, 3)', { font: 'mono', size: 18, anchor: 'start' });
  s.text(40, 140, 'doc b   = (2, 1, -1, -1)', { font: 'mono', size: 18, anchor: 'start' });
  const cols = { m: 120, a: 400, b: 580, win: 760 };
  s.text(cols.m, 196, 'prefix m', { size: 18, weight: 700 });
  s.text(cols.a, 196, 'score a', { size: 18, weight: 700 });
  s.text(cols.b, 196, 'score b', { size: 18, weight: 700 });
  s.text(cols.win, 196, 'winner', { size: 18, weight: 700 });
  s.line(40, 208, 840, 208, { color: C.muted, width: 1.2 });
  const winners = [];
  [1, 2, 3, 4].forEach((m, i) => {
    const y = 240 + i * 36;
    const sa = dot(q, a, m), sb = dot(q, b, m);
    const win = sa > sb ? 'a' : 'b';
    winners.push({ m, sa, sb, win });
    s.text(cols.m, y, String(m), { size: 19, font: 'mono' });
    s.text(cols.a, y, String(sa), { size: 19, font: 'mono' });
    s.text(cols.b, y, String(sb), { size: 19, font: 'mono' });
    s.rect(cols.win - 40, y - 24, 80, 32, { color: win === 'a' ? C.blue : C.amber, fill: win === 'a' ? C.blueSoft : C.amberSoft, fillStyle: 'solid' });
    s.text(cols.win, y, win, { size: 19, font: 'mono', weight: 700 });
  });
  s.text(440, 366, 'The winner changes between m = 2 and m = 3, and the full vector gives a.', { size: 18, color: C.muted });
  save('34.3-worked-flip.svg', s);
  console.log(JSON.stringify(winners));
}

// ---------------------------------------------------------------- 4. measured: P@10 vs prefix size (5 seeds)
{
  const data = JSON.parse(readFileSync(join(HERE, '34.3_results.json'), 'utf8'));
  const dims = data.eval_dims.map(String);
  const series = [
    ['MRL (one model)', 'MRL', C.blue, 0],
    ['standard, truncated', 'standard, truncated', C.rose, 0],
    ['PCA of standard', 'PCA of standard', C.green, 0],
    ['independent per size', 'independent per size', C.violet, 0],
    ['raw input prefix', 'raw input prefix', C.muted, 0],
  ];
  const s = new Sketch(880, 470, { title: 'P@10 by prefix size, five seeds', seed: 3404 });
  s.text(440, 34, 'Retrieval quality at each prefix size', { size: 26, weight: 700 });
  const X0 = 120, X1 = 600, Y0 = 400, Y1 = 80; // plot box
  const xOf = (i) => X0 + 60 + i * ((X1 - X0 - 120) / (dims.length - 1));
  const yOf = (v) => Y0 - v * (Y0 - Y1);
  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    s.line(X0, yOf(g), X1, yOf(g), { color: C.muted, width: 0.8, dash: '4 6' });
    s.text(X0 - 12, yOf(g) + 6, g.toFixed(2), { size: 16, anchor: 'end', font: 'mono', color: C.muted });
  }
  s.line(X0, Y0, X1, Y0, { color: C.ink, width: 1.4 });
  s.line(X0, Y0, X0, Y1, { color: C.ink, width: 1.4 });
  dims.forEach((d, i) => s.text(xOf(i), Y0 + 28, `m = ${d}`, { size: 17, font: 'mono' }));
  s.text(X0 - 80, 240, 'P@10', { size: 18, rotate: -90 });
  s.line(X0, yOf(0.1), X1, yOf(0.1), { color: C.muted, width: 1.2, dash: '2 5' });
  s.text(X1 - 4, yOf(0.1) - 6, 'chance 0.10', { size: 15, anchor: 'end', color: C.muted });
  // legend on the right
  series.forEach(([label, key, color], k) => {
    const ly = 130 + k * 46;
    s.line(640, ly, 672, ly, { color, width: 3 });
    s.text(682, ly + 6, label, { size: 18, anchor: 'start' });
    const pts = dims.map((d, i) => [xOf(i), yOf(data.results[key][d][0])]);
    pts.slice(1).forEach(([x2, y2], i) => s.line(pts[i][0], pts[i][1], x2, y2, { color, width: 2.6 }));
    pts.forEach(([x, y]) => s.circle(x, y, 9, { color, fill: color, fillStyle: 'solid' }));
  });
  s.text(640, 370, 'At m = 8 and above all methods are near 1.0,', { size: 17, anchor: 'start', color: C.muted });
  s.text(640, 392, 'so the gaps are at m = 2 and m = 4.', { size: 17, anchor: 'start', color: C.muted });
  save('34.3-prefix-quality.svg', s);
}
