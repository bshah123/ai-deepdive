// Diagrams for Lesson 41.1 (HyDE). Run: node scripts/diagrams/lessons/41.1.mjs
// Numbers come from scripts/diagrams/lessons/41.1_data.py (writes 41.1_data.json; run it first).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-41-advanced-rag/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const d = JSON.parse(readFileSync(join(HERE, '41.1_data.json'), 'utf8'));
const rows = d.rows; // [rank_query, rank_hyde, cos_query, cos_hyde] per query

// 1. Pipeline: query -> hypothetical document -> vector -> nearest real passages
{
  const s = new Sketch(880, 250, { title: 'HyDE pipeline: the query is replaced by an embedded hypothetical answer', seed: 411 });
  s.text(440, 34, 'HyDE: search with an answer, not the question', { size: 26, weight: 700 });
  const boxes = [
    ['short query', ['question as typed'], C.rose, C.roseSoft],
    ['LM writes', ['a fake answer'], C.amber, C.amberSoft],
    ['hypothetical', ['document'], C.amber, C.amberSoft],
    ['encoder', ['text to vector'], C.violet, C.blueSoft],
    ['answer vector', ['compared with'], C.green, C.greenSoft],
    ['nearest real', ['passages'], C.green, C.greenSoft],
  ];
  boxes.forEach(([a, b, col, fill], i) => {
    const x = 24 + i * 144;
    s.rect(x, 74, 108, 64, { color: col, fill, fillStyle: 'solid' });
    s.text(x + 54, 98, a, { size: 16 });
    s.text(x + 54, 120, b[0], { size: 15, color: C.muted });
    if (i < boxes.length - 1) s.arrow(x + 112, 106, x + 140, 106, { color: C.muted });
  });
  s.text(222, 62, 'stub here', { size: 15, color: C.muted });
  s.text(440, 190, 'The generated text is discarded after embedding; only its vector is searched.', { size: 19 });
  save('41.1-pipeline.svg', s);
}

// Bar chart helper: grouped bars per query (query-only vs HyDE)
function groupedBars(name, seed, title, pick, maxVal, scale, ticks, fmt, base) {
  const s = new Sketch(880, 372, { title, seed });
  s.text(440, 34, title, { size: 24, weight: 700 });
  // legend
  s.rect(600, 50, 14, 14, { color: C.muted, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(622, 62, 'query only', { size: 17, anchor: 'start' });
  s.rect(730, 50, 14, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(752, 62, 'HyDE', { size: 17, anchor: 'start' });
  // axis
  const y0 = 290;
  s.line(90, y0, 840, y0, { color: C.ink });
  s.line(90, y0, 90, y0 - maxVal * scale - 10, { color: C.ink });
  for (const t of ticks) {
    const y = y0 - t * scale;
    s.text(76, y + 5, fmt(t), { font: 'mono', size: 15, anchor: 'end' });
    s.line(90, y, 96, y, { color: C.ink });
  }
  rows.forEach((r, i) => {
    const gx = 150 + i * 120;
    const [vq, vh] = pick(r);
    const hq = vq * scale, hh = vh * scale;
    s.rect(gx - 48, y0 - hq, 44, hq, { color: C.muted, fill: C.amberSoft, fillStyle: 'solid' });
    s.rect(gx + 4, y0 - hh, 44, hh, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(gx - 26, y0 - hq - 10, fmt(vq), { font: 'mono', size: 15 });
    s.text(gx + 26, y0 - hh - 10, fmt(vh), { font: 'mono', size: 15 });
    s.text(gx, y0 + 30, 'q' + i, { size: 17 });
  });
  s.text(440, 352, base, { size: 17, color: C.muted });
  return s;
}

// 2. Ranks of the best relevant passage (lower is better)
{
  const s = groupedBars('41.1-ranks.svg', 412, 'Rank of best relevant passage (lower is better)',
    (r) => [r[0], r[1]], 9, 22, [0, 3, 6, 9], (v) => String(v),
    'Six queries, 12-passage toy corpus. Query 4 query-only rank is a tie (zero-score query).');
  save('41.1-ranks.svg', s);
}

// 3. Cosine similarity of the best relevant passage
{
  const s = groupedBars('41.1-cosine.svg', 413, 'Cosine with the best relevant passage',
    (r) => [r[2], r[3]], 1, 200, [0, 0.5, 1], (v) => v.toFixed(3),
    'Cosine of the query vector and of the hypothetical vector with that passage.');
  save('41.1-cosine.svg', s);
}
