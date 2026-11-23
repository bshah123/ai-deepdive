// Lesson 9.4 (itertools). Every number comes from the experiment run in the lesson's scratchpad:
// lazy pulls 5; permutations pulled 10 of 10 before the first next(); counts for n=10, r=3;
// tracemalloc peak 52,208 B (list) vs 248 B (stream); groupby on 'AAABBCAA' vs sorted.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-09-iterators-generators/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Lazy pulls: islice takes five values from an infinite source
{
  const s = new Sketch(880, 330, { title: 'islice takes five values from an infinite count; the rest are never computed', seed: 9401 });
  s.text(440, 34, 'islice stops the infinite count after five values', { size: 24, weight: 700 });
  s.text(40, 84, 'count(1, 2) yields:', { size: 18, anchor: 'start', color: C.muted });
  [1, 3, 5, 7, 9].forEach((v, i) => {
    const x = 40 + i * 86;
    s.rect(x, 96, 76, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 38, 126, String(v), { font: 'mono', size: 18, weight: 700 });
  });
  [11, 13, 15].forEach((v, i) => {
    const x = 500 + i * 86;
    s.rect(x, 96, 76, 46, { color: C.muted, dash: '6 8' });
    s.text(x + 38, 126, String(v), { font: 'mono', size: 18, color: C.muted });
  });
  s.text(40 + 2 * 86 + 38, 172, 'pulled: 5 values', { size: 18, color: C.blue });
  s.text(580, 172, 'never computed', { size: 18, color: C.muted });
  s.rect(40, 220, 260, 46, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(170, 249, 'islice(source, 5)', { font: 'mono', size: 17 });
  s.arrow(300, 243, 368, 243, { color: C.muted });
  s.rect(368, 220, 472, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(604, 249, 'list(...) -> [1, 3, 5, 7, 9]', { font: 'mono', size: 17 });
  s.text(440, 304, 'The source is infinite, but the program only asks it for five values.', { size: 18, color: C.muted });
  save('9.4-lazy-pulls.svg', s);
}

// 2. Counts for n = 10 items, r = 3 picks
{
  const s = new Sketch(880, 420, { title: 'Tuples yielded for 10 items and r = 3: product 1000, permutations 720, combinations with replacement 220, combinations 120', seed: 9402 });
  s.text(440, 34, 'Ten items, picks of three: how many tuples each iterator yields', { size: 24, weight: 700 });
  const bars = [
    { n: 1000, name: ['product(repeat=3)'], f: 'n^r = 10^3', col: C.rose, soft: C.roseSoft },
    { n: 720, name: ['permutations'], f: 'n!/(n-r)! = 720', col: C.blue, soft: C.blueSoft },
    { n: 220, name: ['comb. with replacement'], f: 'C(n+r-1, r) = 220', col: C.green, soft: C.greenSoft },
    { n: 120, name: ['combinations'], f: 'C(n, r) = 120', col: C.amber, soft: C.amberSoft },
  ];
  const base = 310, scale = 0.24;
  s.line(60, base, 820, base, { color: C.muted });
  bars.forEach((b, i) => {
    const cx = 150 + i * 200, h = b.n * scale, w = 110;
    s.rect(cx - w / 2, base - h, w, h, { color: b.col, fill: b.soft, fillStyle: 'solid' });
    s.text(cx, base - h - 14, String(b.n), { font: 'mono', size: 19, weight: 700 });
    s.text(cx, base + 26, b.name, { size: 16 });
    s.text(cx, base + 52, b.f, { font: 'mono', size: 15, color: C.muted });
  });
  s.text(440, 404, 'Each count is checked against math.perm and math.comb in the code.', { size: 16, color: C.muted });
  save('9.4-counts.svg', s);
}

// 3. Input consumed eagerly, output lazy
{
  const s = new Sketch(880, 330, { title: 'permutations reads its whole input when called; the tuples come out one at a time', seed: 9403 });
  s.text(440, 34, 'Input is read at call time; output is lazy', { size: 24, weight: 700 });
  for (let i = 0; i < 10; i++) {
    const x = 40 + i * 48;
    s.rect(x, 62, 40, 34, { color: C.ink });
    s.text(x + 20, 85, String(i), { font: 'mono', size: 16 });
  }
  s.text(40, 118, 'source: a generator of 0..9', { size: 15, anchor: 'start', color: C.muted });
  s.arrow(260, 104, 260, 140, { color: C.muted });
  s.text(276, 126, 'permutations(src, 3) runs: 10 of 10 pulled', { size: 17, anchor: 'start', color: C.rose });
  s.rect(40, 150, 472, 52, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(276, 176, 'pool = tuple(src): all 10 values held', { font: 'mono', size: 16 });
  s.text(276, 194, 'memory grows with n, not with n^3', { size: 16, color: C.muted });
  s.arrow(512, 176, 580, 176, { color: C.muted });
  s.rect(580, 130, 260, 150, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(710, 160, 'next() calls:', { size: 17, weight: 700 });
  s.text(710, 190, ['next() -> (0, 1, 2)', 'next() -> (0, 1, 3)', 'next() -> (0, 1, 4)'], { font: 'mono', size: 15 });
  s.text(710, 258, '720 tuples in total', { size: 17, color: C.muted });
  s.text(40, 318, 'Output is lazy; the input is not. The docs describe the eager input, and the count was measured.', { size: 16, anchor: 'start', color: C.muted });
  save('9.4-eager-input.svg', s);
}

// 4. Memory: list vs streaming
{
  const s = new Sketch(880, 260, { title: 'Peak traced memory: list of 720 tuples 52,208 bytes versus streaming 248 bytes', seed: 9404 });
  s.text(440, 34, 'Peak memory for permutations(range(10), 3)', { size: 24, weight: 700 });
  s.text(40, 110, 'list(...)', { font: 'mono', size: 18, anchor: 'start' });
  s.rect(200, 84, 600, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(500, 74, '52,208 bytes', { font: 'mono', size: 18, weight: 700, anchor: 'start' });
  s.text(40, 200, 'for loop', { font: 'mono', size: 18, anchor: 'start' });
  s.rect(200, 176, Math.max(3, 600 * 248 / 52208), 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(220, 166, '248 bytes', { font: 'mono', size: 18, weight: 700, anchor: 'start' });
  s.text(440, 246, 'Bar lengths are to scale: the streaming bar is 2.8 px wide. Numbers are from CPython 3.12.', { size: 16, color: C.muted });
  save('9.4-memory.svg', s);
}

// 5. groupby merges only adjacent equal keys
{
  const s = new Sketch(880, 300, { title: 'groupby on AAABBCAA gives four groups; sorted input gives three', seed: 9405 });
  s.text(440, 34, 'groupby merges only neighbouring equal keys', { size: 24, weight: 700 });
  const x0 = 180, cw = 56;
  const row = (y, word, groups, label) => {
    s.text(40, y + 28, label, { size: 18, anchor: 'start', color: C.muted });
    [...word].forEach((ch, i) => {
      s.rect(x0 + i * cw, y, cw - 8, 46, { color: C.ink });
      s.text(x0 + i * cw + (cw - 8) / 2, y + 30, ch, { font: 'mono', size: 19, weight: 700 });
    });
    groups.forEach(([start, len, key, col]) => {
      const gx = x0 + start * cw - 6, gw = len * cw - 2;
      s.rect(gx, y - 10, gw, 66, { color: col, dash: '6 8', width: 2 });
      s.text(gx + gw / 2, y + 74, `${key} x${len}`, { font: 'mono', size: 16, color: col });
    });
  };
  row(78, 'AAABBCAA', [[0, 3, 'A', C.blue], [3, 2, 'B', C.amber], [5, 1, 'C', C.green], [6, 2, 'A', C.blue]], 'unsorted');
  row(186, 'AAAAABBC', [[0, 5, 'A', C.blue], [5, 2, 'B', C.amber], [7, 1, 'C', C.green]], 'sorted');
  s.text(440, 292, 'Unsorted: 4 groups, the A appears twice. Sorted: 3 groups, one per letter.', { size: 16, color: C.muted });
  save('9.4-groupby.svg', s);
}
console.log('wrote 9.4 diagrams');
