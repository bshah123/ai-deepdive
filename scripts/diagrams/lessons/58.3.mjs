// Diagrams for 58.3 (data filtering, MinHash LSH de-duplication, quality classifiers).
// Run: node scripts/diagrams/lessons/58.3.mjs
// Every number comes from scripts/diagrams/lessons/58.3_data.json (written by 58.3_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-58-synthetic-data-distillation/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '58.3_data.json'), 'utf8'));
const toy = data.toy;
const tm = data.toy_minhash;

// ---------------------------------------------------------------- 58.3-pipeline.svg
{
  const s = new Sketch(880, 230, { title: 'Five curation stages in a row, each one receiving the output of the previous stage', seed: 5801 });
  s.text(440, 34, 'Five curation stages, run in order', { size: 26, weight: 700 });
  const boxes = [
    ['raw crawl', null, 'web pages'],
    ['exact dedup', null, 'identical docs'],
    ['near dedup', '(MinHash LSH)', 'Jaccard ≥ 0.5'],
    ['rule filters', null, 'length, symbols'],
    ['quality', 'classifier', 'reference-like'],
  ];
  const colors = [C.muted, C.blue, C.green, C.amber, C.violet];
  const fills = [C.blueSoft, C.blueSoft, C.greenSoft, C.amberSoft, C.violetSoft ?? C.blueSoft];
  boxes.forEach(([l1, l2, cap], i) => {
    const x = 30 + i * 172;
    s.rect(x, 80, 132, 64, { color: colors[i], fill: fills[i], fillStyle: 'solid' });
    if (l2) {
      s.text(x + 66, 106, l1, { size: 18, weight: 700 });
      s.text(x + 66, 127, l2, { size: 15 });
    } else {
      s.text(x + 66, 118, l1, { size: 18, weight: 700 });
    }
    s.text(x + 66, 170, cap, { size: 15, color: C.muted });
    if (i < boxes.length - 1) s.arrow(x + 136, 112, x + 168, 112, { color: C.muted, head: 9 });
  });
  s.text(440, 212, 'Cheap steps first: each stage sees fewer documents than the one before it.', { size: 17, color: C.muted });
  save('58.3-pipeline.svg', s);
}

// ---------------------------------------------------------------- 58.3-jaccard-toy.svg
{
  const sa = new Set(toy.shingles_a), sb = new Set(toy.shingles_b);
  const both = toy.shingles_a.filter((x) => sb.has(x));
  const onlyA = toy.shingles_a.filter((x) => !sb.has(x));
  const onlyB = toy.shingles_b.filter((x) => !sa.has(x));
  const s = new Sketch(880, 340, { title: 'Two sentences as sets of word 3-grams, and their Jaccard similarity', seed: 5802 });
  s.text(440, 34, 'Two sentences as sets of 3-word shingles', { size: 26, weight: 700 });
  s.text(440, 74, 'A: "the cat sat on the mat"', { font: 'mono', size: 19 });
  s.text(440, 102, 'B: "the cat sat on the red mat"', { font: 'mono', size: 19 });
  const cols = [
    ['only in A', onlyA, C.rose, C.roseSoft, 40],
    ['in both', both, C.green, C.greenSoft, 315],
    ['only in B', onlyB, C.blue, C.blueSoft, 590],
  ];
  cols.forEach(([head, items, col, fill, x]) => {
    s.rect(x, 135, 250, 130, { color: col, fill, fillStyle: 'solid' });
    s.text(x + 125, 164, `${head}: ${items.length}`, { size: 19, weight: 700 });
    items.forEach((it, k) => s.text(x + 125, 196 + k * 24, it, { font: 'mono', size: 16 }));
  });
  s.text(440, 305, `J = |A ∩ B| / |A ∪ B| = ${toy.inter} / ${toy.union} = ${toy.jaccard}`, { size: 25, weight: 700 });
  save('58.3-jaccard-toy.svg', s);
}

// ---------------------------------------------------------------- 58.3-minhash-toy.svg
{
  const s = new Sketch(880, 420, { title: 'Hash table of six shingles under three hash functions, with the minimum over each set highlighted', seed: 5803 });
  s.text(440, 34, 'MinHash: the minimum hash value over each set', { size: 26, weight: 700 });
  const cols = [
    { x: 40, w: 290, head: 'shingle' }, { x: 330, w: 90, head: 'h1' }, { x: 420, w: 90, head: 'h2' },
    { x: 510, w: 90, head: 'h3' }, { x: 600, w: 80, head: 'in A' }, { x: 680, w: 80, head: 'in B' },
  ];
  const inA = tm.union.map((x) => toy.shingles_a.includes(x));
  const inB = tm.union.map((x) => toy.shingles_b.includes(x));
  // min over each set, per hash function: which row attains it
  const minRow = (setFlags, f) => {
    let best = -1;
    tm.union.forEach((_, r) => { if (setFlags[r] && (best < 0 || tm.hash_table[r][f] < tm.hash_table[best][f])) best = r; });
    return best;
  };
  cols.forEach((c) => s.text(c.x + c.w / 2, 82, c.head, { font: 'mono', size: 17, weight: 700 }));
  tm.union.forEach((sh, r) => {
    const y = 96 + r * 34;
    s.rect(40, y, 290, 34, { color: C.muted, width: 1 });
    s.text(52, y + 23, sh, { font: 'mono', size: 16, anchor: 'start' });
    for (let f = 0; f < 3; f++) {
      const isA = minRow(inA, f) === r, isB = minRow(inB, f) === r;
      const cx = 330 + f * 90;
      if (isA && isB) s.rect(cx, y, 90, 34, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
      else if (isA) s.rect(cx, y, 90, 34, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      else if (isB) s.rect(cx, y, 90, 34, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
      else s.rect(cx, y, 90, 34, { color: C.muted, width: 1 });
      s.text(cx + 45, y + 23, String(tm.hash_table[r][f]), { font: 'mono', size: 17 });
    }
    s.rect(600, y, 80, 34, { color: C.muted, width: 1 });
    s.text(640, y + 23, inA[r] ? 'x' : '-', { font: 'mono', size: 17 });
    s.rect(680, y, 80, 34, { color: C.muted, width: 1 });
    s.text(720, y + 23, inB[r] ? 'x' : '-', { font: 'mono', size: 17 });
  });
  s.text(440, 334, `signature A = [${tm.sig_a.join(', ')}]     signature B = [${tm.sig_b.join(', ')}]`, { font: 'mono', size: 21, weight: 700 });
  s.text(440, 366, `Positions that agree: ${tm.agree} of 3, so the estimate is ${(tm.agree / 3).toFixed(2)}; the true Jaccard is ${toy.jaccard}.`, { size: 19 });
  s.text(440, 398, 'Blue = minimum over A, amber = minimum over B, green = both. Hash h(x) = (a·x + b) mod 11.', { size: 16, color: C.muted });
  save('58.3-minhash-toy.svg', s);
}

// ---------------------------------------------------------------- 58.3-s-curve.svg
{
  const s = new Sketch(880, 430, { title: 'Probability that a pair becomes a candidate as a function of Jaccard similarity, theory and measured points', seed: 5804 });
  const X0 = 120, X1 = 800, Y0 = 370, Y1 = 70;
  const px = (v) => X0 + (X1 - X0) * v, py = (p) => Y0 - (Y0 - Y1) * p;
  s.text(440, 34, 'Chance a pair becomes a candidate, by Jaccard similarity', { size: 26, weight: 700 });
  s.line(X0, Y0, X1, Y0, { color: C.ink, width: 2 });
  s.line(X0, Y0, X0, Y1, { color: C.ink, width: 2 });
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => {
    s.line(px(v), Y0, px(v), Y0 + 6, { color: C.ink });
    s.text(px(v), Y0 + 26, v.toFixed(2), { font: 'mono', size: 15 });
  });
  [0, 0.5, 1].forEach((p) => {
    s.line(X0 - 6, py(p), X0, py(p), { color: C.ink });
    s.text(X0 - 14, py(p) + 5, p.toFixed(1), { font: 'mono', size: 15, anchor: 'end' });
  });
  s.text(460, 414, 'Jaccard similarity s of the two documents', { size: 18 });
  s.text(40, 220, 'P(candidate pair)', { size: 18, rotate: -90 });
  // policy threshold
  s.line(px(0.5), Y1, px(0.5), Y0, { color: C.rose, width: 1.5, dash: '6 8' });
  const curve = (b, r, color, width) => {
    const N = 120;
    for (let k = 0; k < N; k++) {
      const s0 = k / N, s1 = (k + 1) / N;
      const p0 = 1 - (1 - s0 ** r) ** b, p1 = 1 - (1 - s1 ** r) ** b;
      s.line(px(s0), py(p0), px(s1), py(p1), { color, width });
    }
  };
  curve(16, 8, C.amber, 2.5);
  curve(32, 4, C.blue, 3.5);
  data.s_curve_32_4.forEach((bin) => {
    if (bin.pairs === 0 || bin.candidate_rate === null) return;
    const mid = (bin.lo + bin.hi) / 2;
    s.circle(px(mid), py(bin.candidate_rate), 13, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  });
  // legend, lower right (empty region)
  const lx = 560, ly = 250;
  s.line(lx, ly, lx + 26, ly, { color: C.blue, width: 3.5 });
  s.text(lx + 36, ly + 6, '(32, 4) theory, threshold ≈ 0.42', { size: 16, anchor: 'start' });
  s.circle(lx + 13, ly + 30, 13, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(lx + 36, ly + 36, '(32, 4) measured, 1,850 docs', { size: 16, anchor: 'start' });
  s.line(lx, ly + 60, lx + 26, ly + 60, { color: C.amber, width: 2.5 });
  s.text(lx + 36, ly + 66, '(16, 8) theory, threshold ≈ 0.71', { size: 16, anchor: 'start' });
  s.line(lx, ly + 90, lx + 26, ly + 90, { color: C.rose, width: 1.5, dash: '6 8' });
  s.text(lx + 36, ly + 96, 'policy: J ≥ 0.5 (duplicate rule)', { size: 16, anchor: 'start' });
  save('58.3-s-curve.svg', s);
}

// ---------------------------------------------------------------- 58.3-lsh-sweep.svg
{
  const rows = data.lsh_sweep;
  const s = new Sketch(880, 390, { title: 'Verified precision and recall for four LSH band layouts with 128 hash functions', seed: 5805 });
  s.text(440, 34, 'Band layouts: precision and recall after verification', { size: 26, weight: 700 });
  const Y0 = 310, Y1 = 120, H = Y0 - Y1;
  s.line(90, Y0, 820, Y0, { color: C.ink, width: 2 });
  s.rect(560, 58, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(586, 73, 'precision', { size: 17, anchor: 'start' });
  s.rect(560, 84, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(586, 99, 'recall', { size: 17, anchor: 'start' });
  rows.forEach((row, i) => {
    const cx = 180 + i * 180;
    const hp = H * row.verified_precision, hr = H * row.verified_recall;
    s.rect(cx - 56, Y0 - hp, 48, hp, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 8, Y0 - hr, 48, hr, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx - 32, Y0 - hp - 8, row.verified_precision.toFixed(2), { font: 'mono', size: 15 });
    s.text(cx + 32, Y0 - hr - 8, row.verified_recall.toFixed(2), { font: 'mono', size: 15 });
    s.text(cx, 338, `b = ${row.b}, r = ${row.r}`, { size: 18, weight: 700 });
    s.text(cx, 360, `threshold ≈ ${row.threshold_approx.toFixed(3)}`, { size: 15, color: C.muted });
    s.text(cx, 380, `${row.verified.toLocaleString('en-US')} pairs kept`, { size: 15, color: C.muted });
  });
  save('58.3-lsh-sweep.svg', s);
}
console.log('wrote 58.3 diagrams');
