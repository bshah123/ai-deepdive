import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-05-information-retrieval/chapter-33-search-engines/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from 33.2_experiment.py (run once; output in 33.2_numbers.json)
const D = JSON.parse(readFileSync(join(HERE, '33.2_numbers.json'), 'utf8'));
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);

// 1. One term's contribution, followed through d1 ("cat cat dog bird")
{
  const s = new Sketch(880, 330, { title: 'Score of document d1 for the query cat dog, step by step', seed: 3301 });
  s.text(440, 34, 'One query term, one document, four steps', { size: 26, weight: 700 });
  const y = 86, h = 64;
  s.rect(40, y, 180, h, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(130, y + 28, 'count f = 2', { font: 'mono', size: 16 });
  s.text(130, y + 50, 'cat in d1', { size: 16, color: C.muted });
  s.arrow(222, y + 32, 276, y + 32, { color: C.muted });
  s.text(249, y - 6, 'saturate, length', { size: 15, color: C.muted });
  s.rect(280, y, 180, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(370, y + 28, 'tf part = ' + f3(D.parts.d1.cat / D.idf.cat), { font: 'mono', size: 16 });
  s.text(370, y + 50, 'bounded by 2.2', { size: 16, color: C.muted });
  s.arrow(462, y + 32, 516, y + 32, { color: C.muted });
  s.text(489, y - 6, '× IDF', { size: 15, color: C.muted });
  s.rect(520, y, 180, h, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(610, y + 28, 'weight = ' + f3(D.parts.d1.cat), { font: 'mono', size: 16 });
  s.text(610, y + 50, 'cat contributes', { size: 16, color: C.muted });
  s.arrow(702, y + 32, 752, y + 32, { color: C.muted });
  s.text(727, y - 6, '+ dog', { size: 15, color: C.muted });
  s.rect(756, y - 0, 100, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(806, y + 28, f3(D.scores.d1), { font: 'mono', size: 16, weight: 700 });
  s.text(806, y + 50, 'score d1', { size: 16, color: C.muted });
  s.text(440, 205, 'IDF(cat) = log(1 + (N − n + 0.5)/(n + 0.5)) = log(1 + 2.5/2.5) = ' + f3(D.idf.cat) + ', where N = 4 and n = 2', { size: 17 });
  s.text(440, 240, 'dog adds ' + f3(D.parts.d1.dog) + ' (f = 1 gives tf part 1.000), so d1 = ' + f3(D.parts.d1.cat) + ' + ' + f3(D.parts.d1.dog) + ' = ' + f3(D.scores.d1), { size: 17 });
  s.text(440, 290, 'Each query term adds one contribution. The score is their sum.', { size: 18, color: C.muted });
  save('33.2-term-weight-steps.svg', s);
}

// 2. Saturation: linear term frequency versus BM25 tf part (grouped bars, f = 1..10)
{
  const s = new Sketch(880, 430, { title: 'Bar chart: linear term frequency against the BM25 tf part for f = 1 to 10', seed: 3302 });
  s.text(440, 34, 'Linear counting never stops; BM25 saturates at k1 + 1', { size: 26, weight: 700 });
  s.rect(90, 58, 22, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(150, 72, 'linear: score ∝ f', { size: 17, anchor: 'start' });
  s.rect(360, 58, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(420, 72, 'BM25 tf part (k1 = 1.2, average length)', { size: 17, anchor: 'start' });
  const base = 350, sc = 26, x0 = 80, gw = 72;
  s.line(x0, base, x0 + 10 * gw, base, { color: C.muted });
  const ceil = base - (1.2 + 1) * sc;
  s.line(x0, ceil, x0 + 10 * gw, ceil, { color: C.rose, dash: '6 8' });
  s.text(x0 + 4, ceil - 18, 'ceiling k1 + 1 = 2.2', { size: 16, color: C.rose, anchor: 'start' });
  for (let i = 1; i <= 10; i++) {
    const cx = x0 + (i - 0.5) * gw;
    const lin = i * sc;
    s.rect(cx - 28, base - lin, 26, lin, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx - 15, base - lin - 8, String(i), { size: 15, color: C.muted });
    const bm = D.sat[i].bm25 * sc;
    s.rect(cx + 2, base - bm, 26, bm, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx + 2 + 13, base + 22, f2(D.sat[i].bm25), { font: 'mono', size: 15, color: C.blue });
    s.text(cx, base + 46, 'f = ' + i, { size: 16, color: C.ink });
  }
  s.text(440, 412, 'Blue numbers under the axis are the BM25 tf part; amber bar tops are the raw count f.', { size: 17, color: C.muted });
  save('33.2-saturation.svg', s);
}

// 3. Length normalisation grid: tf part for f = 2 across b and |D|/avgdl
{
  const s = new Sketch(880, 340, { title: 'Grid of BM25 tf part for f = 2 across b and document length ratio', seed: 3303 });
  s.text(440, 34, 'Same count f = 2, different document lengths', { size: 26, weight: 700 });
  const cols = ['0.5', '1.0', '2.0'], colLbl = ['short (0.5)', 'average (1)', 'long (2)'];
  const rows = ['0.0', '0.75', '1.0'];
  cols.forEach((c, i) => s.text(335 + i * 160, 104, colLbl[i], { size: 17, color: C.ink }));
  s.text(190, 104, '|D| / avgdl →', { size: 15, color: C.muted });
  rows.forEach((b, j) => {
    const y = 140 + j * 62;
    s.text(190, y + 30, 'b = ' + b, { font: 'mono', size: 17 });
    cols.forEach((c, i) => {
      const v = D.len_tab[b][c];
      const hi = b === '0.75';
      s.rect(260 + i * 160, y, 150, 50, { color: hi ? C.amber : C.blue, fill: hi ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(335 + i * 160, y + 32, f3(v), { font: 'mono', size: 20, weight: 700 });
    });
  });
  s.text(440, 325, 'b = 0 ignores length; b = 0.75 gives +16% for the short document and −22% for the long one.', { size: 17, color: C.muted });
  save('33.2-length-grid.svg', s);
}

// 4. IDF: Robertson–Sparck Jones form versus the Lucene form, N = 1000
{
  const s = new Sketch(880, 420, { title: 'Two IDF formulas against the fraction of documents containing a term', seed: 3304 });
  s.text(440, 34, 'The classic IDF goes negative; the Lucene form stays positive', { size: 26, weight: 700 });
  const X = (frac) => 110 + frac * 700;
  const top = 60, bot = 360, vmax = 7;
  const Y = (v) => top + ((vmax - v) / (2 * vmax)) * (bot - top);
  s.line(110, top, 110, bot, { color: C.muted });
  s.line(110, Y(0), 810, Y(0), { color: C.muted, dash: '6 8' });
  s.text(96, Y(0) + 6, '0', { size: 16, anchor: 'end' });
  s.text(96, Y(6) + 6, '6', { size: 16, anchor: 'end' });
  s.text(96, Y(-6) + 6, '−6', { size: 16, anchor: 'end' });
  [0, 0.5, 1].forEach((t) => s.text(X(t), bot + 26, t === 0 ? '0' : t === 1 ? '1' : '0.5', { size: 16 }));
  s.text(460, bot + 56, 'n / N, the fraction of documents that contain the term', { size: 17, color: C.muted });
  const pts = D.idf_rows.map((r) => [X(r.n / 1000), r]);
  const series = [['rsj', C.rose], ['lucene', C.green]];
  for (const [key, col] of series) {
    for (let k = 1; k < pts.length; k++) {
      s.line(pts[k - 1][0], Y(pts[k - 1][1][key]), pts[k][0], Y(pts[k][1][key]), { color: col, width: 3 });
    }
    for (const [x, r] of pts) s.circle(x, Y(r[key]), 9, { color: col, fill: col, fillStyle: 'solid' });
  }
  s.rect(560, 64, 22, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(592, 78, 'RSJ: log((N − n + 0.5)/(n + 0.5))', { size: 17, anchor: 'start' });
  s.rect(560, 94, 22, 16, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(592, 108, 'Lucene: log(1 + (N − n + 0.5)/(n + 0.5))', { size: 17, anchor: 'start' });
  s.text(560, Y(-3) + 6, 'RSJ below zero once n > N/2', { size: 17, color: C.rose, anchor: 'start' });
  save('33.2-idf-forms.svg', s);
}
console.log('wrote 33.2 diagrams');
