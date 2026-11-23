import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-05-information-retrieval/chapter-33-search-engines/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers from scratchpad experiment (engine.py, toy.py, benchmark.py, one run).
// Toy corpus: doc lengths 9, 16, 7; N = 3; df(quick) = df(brown) = df(fox) = 2; idf = 0.4700.

{ // 1. scanning every document versus walking postings
  const s = new Sketch(880, 350, { title: 'Scanning every document compared with walking the postings lists', seed: 331 });
  s.text(440, 40, 'Two ways to find documents for "quick brown fox"', { size: 24, weight: 700 });
  s.line(440, 66, 440, 300, { color: C.muted, dash: '6 8' });
  s.text(225, 92, 'Scan every document', { size: 20, weight: 700, color: C.rose });
  [['doc 0  (9 tokens)', 0], ['doc 1  (16 tokens)', 1], ['doc 2  (7 tokens)', 2]].forEach(([label, i]) => {
    const y = 112 + i * 52;
    s.rect(70, y, 310, 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(225, y + 26, label, { font: 'mono', size: 16 });
  });
  s.text(225, 290, 'every token is compared with every term', { size: 17, color: C.muted });
  s.text(660, 92, 'Walk the postings of the query terms', { size: 20, weight: 700, color: C.blue });
  ['quick', 'brown', 'fox'].forEach((term, i) => {
    const y = 112 + i * 52;
    s.rect(490, y, 96, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(538, y + 26, term, { font: 'mono', size: 16 });
    s.arrow(590, y + 20, 618, y + 20, { color: C.muted });
    s.rect(622, y, 210, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(727, y + 26, '(0,1)  (1,2)', { font: 'mono', size: 16 });
  });
  s.text(660, 290, 'only entries that match: 6 in total', { size: 17, color: C.muted });
  s.text(440, 334, 'Toy corpus: 96 token comparisons (32 tokens x 3 terms) against 6 postings entries', { size: 17 });
  save('33.3-scan-vs-postings.svg', s);
}

{ // 2. the index for the toy corpus
  const s = new Sketch(880, 340, { title: 'Inverted index for the toy corpus: term, document frequency, postings', seed: 332 });
  s.text(440, 40, 'The inverted index for the three toy documents', { size: 24, weight: 700 });
  s.text(110, 80, 'term', { size: 18, weight: 700, color: C.muted });
  s.text(245, 80, 'df', { size: 18, weight: 700, color: C.muted });
  s.text(470, 80, 'postings: (doc_id, tf)', { size: 18, weight: 700, color: C.muted });
  const rows = [
    ['quick', '2', [['(0, 1)'], ['(1, 2)']], true],
    ['fox', '2', [['(0, 1)'], ['(1, 2)']], true],
    ['sleeps', '1', [['(2, 1)']], false],
    ['sun', '1', [['(2, 1)']], false],
  ];
  rows.forEach(([term, df, posts, hit], r) => {
    const y = 110 + r * 52;
    s.rect(50, y, 120, 40, { color: hit ? C.amber : C.muted, fill: hit ? C.amberSoft : undefined, fillStyle: 'solid' });
    s.text(110, y + 26, term, { font: 'mono', size: 16 });
    s.arrow(176, y + 20, 206, y + 20, { color: C.muted });
    s.text(245, y + 26, df, { font: 'mono', size: 18 });
    posts.forEach(([p], j) => {
      const x = 340 + j * 110;
      s.rect(x, y, 96, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(x + 48, y + 26, p, { font: 'mono', size: 16 });
    });
  });
  s.note(650, 120, 190, 120, ['df is the length', 'of the postings', 'list: len(postings)'], { size: 19 });
  s.text(440, 318, 'Amber rows are the query terms; a query reads only those lists.', { size: 18, color: C.muted });
  save('33.3-index-layout.svg', s);
}

{ // 3. the accumulator, then top-k
  const s = new Sketch(880, 460, { title: 'Score accumulator for the query quick brown fox, filled one term at a time', seed: 333 });
  s.text(440, 40, 'Accumulate per document, then keep the top k', { size: 24, weight: 700 });
  s.rect(40, 66, 360, 44, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(220, 94, 'query: quick brown fox', { font: 'mono', size: 17 });
  s.text(400, 158, 'doc 0', { size: 18, weight: 700, color: C.muted });
  s.text(500, 158, 'doc 1', { size: 18, weight: 700, color: C.muted });
  s.text(600, 158, 'doc 2', { size: 18, weight: 700, color: C.muted });
  const steps = [['after quick', ['0.5056', '0.5785', '0']], ['after brown', ['1.0111', '1.1569', '0']], ['after fox', ['1.5167', '1.7354', '0']]];
  steps.forEach(([label, vals], r) => {
    const y = 210 + r * 52;
    s.text(330, y + 6, label, { size: 18, anchor: 'end' });
    vals.forEach((v, c) => {
      const x = 400 + c * 100;
      if (c < 2) s.rect(x - 40, y - 20, 80, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      else s.rect(x - 40, y - 20, 80, 40, { color: C.muted });
      s.text(x, y + 6, v, { font: 'mono', size: 16 });
    });
  });
  s.text(440, 362, 'doc 2 never appears in a postings list for these terms, so it never enters the accumulator', { size: 17, color: C.muted });
  s.note(180, 384, 520, 56, ['heapq.nlargest(2, accumulator): doc 1 = 1.7354, doc 0 = 1.5167'], { size: 20 });
  save('33.3-accumulator.svg', s);
}

{ // 4. measured work per query, log scale
  const s = new Sketch(880, 410, { title: 'Log-scale bar chart of measured work per query for three corpus sizes', seed: 334 });
  s.text(440, 40, 'Work per query on the synthetic corpus (log scale)', { size: 24, weight: 700 });
  const base = 330, unit = 30;
  s.line(120, 80, 120, base, { color: C.muted });
  s.line(120, base, 800, base, { color: C.muted });
  [0, 2, 4, 6, 8].forEach((e) => {
    const y = base - e * unit;
    s.line(114, y, 120, y, { color: C.muted });
    s.text(100, y + 6, `10^${e}`, { font: 'mono', size: 15, anchor: 'end', color: C.muted });
  });
  const groups = [
    ['N = 1,000', 260, 5.5174, 1.4713, '329,133', '30'],
    ['N = 10,000', 470, 6.5260, 2.4744, '3.36M', '298'],
    ['N = 50,000', 680, 7.2284, 3.1759, '16.9M', '1,499'],
  ];
  groups.forEach(([label, cx, naiveLog, postLog, naiveTxt, postTxt]) => {
    const hN = naiveLog * unit, hP = postLog * unit;
    s.rect(cx - 62, base - hN, 56, hN, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.rect(cx + 6, base - hP, 56, hP, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx - 34, base - hN - 10, naiveTxt, { font: 'mono', size: 15 });
    s.text(cx + 34, base - hP - 10, postTxt, { font: 'mono', size: 15 });
    s.text(cx, base + 34, label, { size: 19 });
  });
  s.rect(150, 80, 18, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(178, 96, 'token comparisons (naive scan)', { size: 17, anchor: 'start' });
  s.rect(150, 108, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(178, 124, 'postings entries touched (index)', { size: 17, anchor: 'start' });
  s.text(440, 396, 'Counts are exact for each run; they do not depend on the machine.', { size: 17, color: C.muted });
  save('33.3-work-chart.svg', s);
}
