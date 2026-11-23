import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-05-information-retrieval/chapter-36-hybrid-search/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from scripts/diagrams/lessons/36.1_experiment.py (run once; output in 36.1_data.json)
const D = JSON.parse(readFileSync(join(HERE, '36.1_data.json'), 'utf8'));
const Q = Object.fromEntries(D.queries.map((q) => [q.id, q]));
const K1 = 1.2; // matches K1 in the experiment script

// 1. Two ways to decide that a document matches
{
  const s = new Sketch(880, 340, { title: 'Lexical matching uses shared tokens; dense matching compares vectors', seed: 3601 });
  s.text(440, 34, 'Two ways to decide that a document matches', { size: 26, weight: 700 });
  const bmScore = Q.B.bm25[3].toFixed(2);
  s.text(40, 92, 'Lexical (BM25)', { anchor: 'start', size: 20, weight: 700, color: C.blue });
  const row1 = [
    [40, 170, ['query', '"error E4471"'], C.blue, C.blueSoft],
    [250, 190, ['tokens', 'error, e4471'], C.blue, C.blueSoft],
    [480, 190, ['inverted index', 'e4471 → doc 3'], C.blue, C.blueSoft],
    [710, 130, ['score', bmScore], C.blue, C.blueSoft],
  ];
  row1.forEach(([x, w, lines, col, fill]) => {
    s.rect(x, 106, w, 56, { color: col, fill, fillStyle: 'solid' });
    s.text(x + w / 2, 130, lines, { size: 16 });
  });
  [[210, 250], [440, 480], [670, 710]].forEach(([a, b]) => s.arrow(a + 4, 134, b - 4, 134, { color: C.muted }));

  s.text(40, 214, 'Dense (vectors and cosine)', { anchor: 'start', size: 20, weight: 700, color: C.green });
  const row2 = [
    [40, 170, ['query', 'text'], C.green, C.greenSoft],
    [250, 190, ['embedding', 'k numbers'], C.green, C.greenSoft],
    [480, 190, ['document vectors', 'precomputed'], C.green, C.greenSoft],
    [710, 130, ['cosine', 'angle'], C.green, C.greenSoft],
  ];
  row2.forEach(([x, w, lines, col, fill]) => {
    s.rect(x, 228, w, 56, { color: col, fill, fillStyle: 'solid' });
    s.text(x + w / 2, 252, lines, { size: 16 });
  });
  [[210, 250], [440, 480], [670, 710]].forEach(([a, b]) => s.arrow(a + 4, 256, b - 4, 256, { color: C.muted }));

  s.note(40, 300, 800, 26, ['BM25 scores only tokens that appear in both query and document; cosine scores any pair of vectors.'], { size: 17 });
  save('36.1-two-ways-to-match.svg', s);
}

// 2. Query A: same query, two scorers, per-document scores
{
  const s = new Sketch(880, 460, { title: 'Scores for one query under BM25 and under the dense stand-in', seed: 3602 });
  const qa = Q.A;
  s.text(440, 34, 'Query A: "avoid losing traction in icy weather"', { size: 24, weight: 700 });
  s.text(330, 84, 'BM25 score', { size: 19, weight: 700, color: C.blue });
  s.text(680, 84, 'LSA cosine (dense stand-in)', { size: 19, weight: 700, color: C.amber });
  const docs = [2, 6, 10, 7, 1];
  const y0 = 110, step = 56, bh = 28;
  const SB = 50, ZB = 330, SL = 150, ZL = 640;
  s.line(ZB, y0 - 10, ZB, y0 + docs.length * step - 14, { color: C.muted, dash: '6 8' });
  s.line(ZL, y0 - 10, ZL, y0 + docs.length * step - 14, { color: C.muted, dash: '6 8' });
  docs.forEach((d, i) => {
    const y = y0 + i * step;
    const rel = qa.rel.includes(d);
    s.text(40, y + 19, `doc ${d}${rel ? '  relevant' : ''}`, { anchor: 'start', size: 18, color: rel ? C.green : C.ink, weight: rel ? 700 : 400 });
    const b = qa.bm25[d];
    if (b > 0) s.rect(ZB, y, b * SB, bh, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(ZB + Math.max(b, 0) * SB + 10, y + 20, b.toFixed(2), { anchor: 'start', size: 17, font: 'mono' });
    const l = qa.lsa[d];
    if (l >= 0) s.rect(ZL, y, l * SL, bh, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    else s.rect(ZL + l * SL, y, -l * SL, bh, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    const lx = l >= 0 ? ZL + l * SL + 10 : ZL + 10;
    s.text(lx, y + 20, (l >= 0 ? '+' : '') + l.toFixed(2), { anchor: 'start', size: 17, font: 'mono' });
  });
  s.note(40, y0 + docs.length * step + 4, 800, 56, ['Zero BM25 means no query word appears in the document.', 'Relevance labels were written by hand before scoring.'], { size: 17 });
  save('36.1-query-a-scores.svg', s);
}

// 3. Rank grid across all queries
{
  const s = new Sketch(880, 500, { title: 'Rank of the best relevant document per query, BM25 and LSA', seed: 3603 });
  s.text(440, 34, 'Rank of the best relevant document, per query', { size: 24, weight: 700 });
  s.text(60, 80, 'query', { anchor: 'start', size: 18, weight: 700 });
  s.text(515, 80, 'BM25', { size: 18, weight: 700, color: C.blue });
  s.text(645, 80, `LSA (k=${D.k_dims})`, { size: 18, weight: 700, color: C.amber });
  const cell = (rank) => (rank === 1 ? [C.green, C.greenSoft] : rank <= 3 ? [C.amber, C.amberSoft] : [C.rose, C.roseSoft]);
  D.queries.forEach((q, i) => {
    const y = 100 + i * 32;
    s.text(60, y + 19, `${q.id}  ${q.query}`, { anchor: 'start', size: 16, font: 'mono' });
    [[470, q.rank_bm25], [600, q.rank_lsa]].forEach(([x, r]) => {
      const [col, fill] = cell(r);
      s.rect(x, y, 90, 26, { color: col, fill, fillStyle: 'solid' });
      s.text(x + 45, y + 19, String(r), { size: 18, weight: 700 });
    });
  });
  const yEnd = 100 + D.queries.length * 32 + 14;
  s.line(60, yEnd - 6, 820, yEnd - 6, { color: C.muted });
  s.text(60, yEnd + 22, `MRR  BM25 ${D.mrr_bm25.toFixed(2)}   LSA ${D.mrr_lsa.toFixed(2)}`, { anchor: 'start', size: 19, weight: 700 });
  s.text(60, yEnd + 50, 'Rank 1 = relevant document first. Green 1, amber 2 to 3, rose 4 or more. Ties count against the document.', { anchor: 'start', size: 15, color: C.muted });
  save('36.1-rank-grid.svg', s);
}

// 4. BM25 term-frequency saturation (formula, |d| = avgdl, b = 0.75)
{
  const s = new Sketch(880, 440, { title: 'BM25 term contribution saturates as term frequency grows', seed: 3604 });
  s.text(440, 34, 'BM25 contribution of one term saturates as its count grows', { size: 24, weight: 700 });
  const X0 = 110, Y0 = 380, SX = 50, SY = 120;
  const f = (tf) => tf * (K1 + 1) / (tf + K1);
  s.line(X0, Y0, X0 + 12 * SX + 20, Y0, { color: C.ink });
  s.line(X0, Y0, X0, Y0 - 2.6 * SY, { color: C.ink });
  for (let t = 0; t <= 12; t += 2) s.text(X0 + t * SX, Y0 + 26, String(t), { size: 16, font: 'mono' });
  for (const v of [0, 1, 2]) s.text(X0 - 14, Y0 - v * SY + 6, v.toFixed(0), { size: 16, font: 'mono', anchor: 'end' });
  s.text(X0 + 6 * SX, Y0 + 56, 'term frequency tf in the document', { size: 18, color: C.muted });
  s.text(X0 + 8, 92, 'contribution', { size: 17, color: C.muted, anchor: 'start' });
  s.line(X0, Y0 - (K1 + 1) * SY, X0 + 12 * SX, Y0 - (K1 + 1) * SY, { color: C.muted, dash: '6 8' });
  s.text(X0 + 12 * SX - 6, Y0 - (K1 + 1) * SY - 10, `limit k1+1 = ${(K1 + 1).toFixed(1)}`, { size: 16, color: C.muted, anchor: 'end' });
  for (let i = 0; i < 120; i++) {
    const t1 = i * 0.1, t2 = (i + 1) * 0.1;
    s.line(X0 + t1 * SX, Y0 - f(t1) * SY, X0 + t2 * SX, Y0 - f(t2) * SY, { color: C.blue, width: 3 });
  }
  [1, 2, 5, 10].forEach((t) => {
    s.circle(X0 + t * SX, Y0 - f(t) * SY, 12, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(X0 + t * SX + 14, Y0 - f(t) * SY + 28, `tf=${t}: ${f(t).toFixed(2)}`, { anchor: 'start', size: 16, font: 'mono' });
  });
  save('36.1-bm25-saturation.svg', s);
}
