import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-03-ml-nlp/chapter-22-traditional-nlp/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below are copied from the output of the lesson's experiment runs (see 22.1 lesson text).

// 1. Bigrams as sliding windows over "the cat sat on the mat"
{
  const s = new Sketch(880, 340, { title: 'The six tokens of the example sentence, with the five bigram windows listed below them', seed: 221 });
  s.text(440, 34, 'Bigrams: every window of two adjacent tokens', { size: 24, weight: 700 });
  const toks = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
  toks.forEach((t, i) => {
    const x = 40 + i * 124;
    s.rect(x, 56, 110, 44, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 55, 84, t, { font: 'mono', size: 18 });
  });
  for (let i = 0; i < 5; i++) {
    const x0 = 40 + i * 124;
    const x1 = 40 + (i + 1) * 124 + 110;
    const y = 128 + i * 38;
    s.rect(x0, y, x1 - x0, 28, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text((x0 + x1) / 2, y + 20, `${toks[i]} ${toks[i + 1]}`, { font: 'mono', size: 17 });
  }
  s.note(620, 150, 220, 34, ['6 tokens give 5 windows'], { size: 18 });
  save('22.1-ngrams.svg', s);
}

// 2. IDF bars: idf = ln(N / df), N = 4 documents
{
  const s = new Sketch(880, 360, { title: 'Bar chart of inverse document frequency for four words: a word in every document has idf zero', seed: 222 });
  s.text(440, 34, 'IDF: a word in every document gets weight zero', { size: 24, weight: 700 });
  const base = 280, k = 130;
  const bars = [
    { w: 'the', df: 4, idf: 0.0 },
    { w: 'cat', df: 2, idf: 0.6931 },
    { w: 'stock', df: 2, idf: 0.6931 },
    { w: 'mat', df: 1, idf: 1.3863 },
  ];
  s.line(80, base, 800, base, { color: C.muted, width: 2 });
  bars.forEach((b, i) => {
    const cx = 170 + i * 180;
    const h = b.idf * k;
    if (h > 0) s.rect(cx - 45, base - h, 90, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 14, `idf ${b.idf.toFixed(3)}`, { font: 'mono', size: 17 });
    s.text(cx, base + 30, b.w, { font: 'mono', size: 20, weight: 700 });
    s.text(cx, base + 56, `df = ${b.df} of 4`, { size: 17, color: C.muted });
  });
  s.note(60, 66, 230, 64, ['idf = ln(N / df)', 'N = 4 documents'], { size: 18 });
  save('22.1-idf-bars.svg', s);
}

// 3. Cosine ignores length: a toy two-term vector and the same vector doubled
{
  const s = new Sketch(880, 340, { title: 'Two vectors in the same direction, one twice as long: cosine is 1, distance is not 0', seed: 223 });
  s.text(440, 34, 'Cosine compares direction, not length', { size: 24, weight: 700 });
  const ox = 120, oy = 300, k = 45;
  s.arrow(ox, oy, 400, oy, { color: C.muted });
  s.arrow(ox, oy, ox, 110, { color: C.muted });
  s.text(400, 328, 'cat', { size: 18, color: C.muted });
  s.text(ox - 26, 112, 'fish', { size: 18, color: C.muted });
  const a = [1, 2], b = [2, 4];
  s.arrow(ox, oy, ox + a[0] * k, oy - a[1] * k, { color: C.blue, width: 3 });
  s.arrow(ox, oy, ox + b[0] * k, oy - b[1] * k, { color: C.amber, width: 3 });
  s.text(ox + a[0] * k + 16, oy - a[1] * k + 22, 'A: (1, 2)', { size: 18, color: C.blue, anchor: 'start' });
  s.text(ox + b[0] * k + 16, oy - b[1] * k + 6, 'B = 2A: (2, 4)', { size: 18, color: C.amber, anchor: 'start' });
  s.line(ox + a[0] * k, oy - a[1] * k, ox + b[0] * k, oy - b[1] * k, { color: C.rose, dash: '6 8', width: 2 });
  s.note(540, 150, 300, 110, ['cosine(A, B) = 1.000', 'same direction', 'Euclidean distance = 2.236'], { size: 19 });
  save('22.1-scale.svg', s);
}

// 4. Cosine similarity matrix (tf-idf, textbook idf)
{
  const s = new Sketch(880, 420, { title: 'Four by four matrix of cosine similarities between the example documents', seed: 224 });
  s.text(440, 34, 'Cosine similarity between the four documents', { size: 24, weight: 700 });
  const names = ['d1 cat sat', 'd2 cat ate', 'd3 stock fell', 'd4 stock rose'];
  const M = [
    [1.0, 0.092, 0.0, 0.0],
    [0.092, 1.0, 0.0, 0.0],
    [0.0, 0.0, 1.0, 0.342],
    [0.0, 0.0, 0.342, 1.0],
  ];
  names.forEach((n, j) => s.text(260 + j * 130 + 60, 88, n.split(' ')[0], { font: 'mono', size: 18, weight: 700 }));
  names.forEach((n, i) => {
    s.text(40, 110 + i * 60 + 30, n, { font: 'mono', size: 16, anchor: 'start' });
    M[i].forEach((v, j) => {
      const hot = v > 0.3 || i === j;
      s.rect(260 + j * 130, 110 + i * 60, 120, 50, { color: C.ink, fill: hot ? C.greenSoft : C.amberSoft, fillStyle: 'solid' });
      s.text(260 + j * 130 + 60, 110 + i * 60 + 33, v.toFixed(3), { font: 'mono', size: 20 });
    });
  });
  s.note(40, 362, 800, 44, ['d1 and d2 share only "cat": 0.092. "the" has idf 0, so it adds nothing.'], { size: 18 });
  save('22.1-cosine-matrix.svg', s);
}

// 5. Query ranking bars: query "cat fish"
{
  const s = new Sketch(880, 330, { title: 'Bar chart of cosine scores between the query cat fish and each document', seed: 225 });
  s.text(440, 34, 'Query "cat fish": cosine score for each document', { size: 24, weight: 700 });
  const rows = [['d2', 0.7454], ['d1', 0.124], ['d3', 0.0], ['d4', 0.0]];
  const x0 = 120, k = 600;
  rows.forEach(([name, v], i) => {
    const y = 80 + i * 60;
    s.text(x0 - 20, y + 22, name, { font: 'mono', size: 20, weight: 700, anchor: 'end' });
    const w = v * k;
    if (w > 0) s.rect(x0, y, w, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    else s.line(x0, y + 18, x0 + 2, y + 18, { color: C.muted, width: 3 });
    s.text(x0 + w + 14, y + 24, v.toFixed(3), { font: 'mono', size: 19, anchor: 'start' });
  });
  s.line(x0, 60, x0, 300, { color: C.muted, width: 2 });
  save('22.1-query-rank.svg', s);
}

console.log('wrote 22.1 diagrams');
