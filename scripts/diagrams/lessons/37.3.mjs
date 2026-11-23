import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-37-rag-fundamentals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '37.3_data.json'), 'utf8')); // every number comes from the experiment

// 1. Pipeline: chunk, index, retrieve, gate, prompt, generate, answer
{
  const s = new Sketch(880, 370, { title: 'RAG pipeline: chunk, index, retrieve, gate, prompt, generate, cite', seed: 301 });
  s.text(440, 36, 'The pipeline this lesson builds', { size: 26, weight: 700 });
  const W = 186;
  const box = (x, y, title, lines, color, soft) => {
    s.rect(x, y, W, 96, { color, fill: soft, fillStyle: 'solid' });
    s.text(x + W / 2, y + 30, title, { size: 18, weight: 700 });
    s.text(x + W / 2, y + 56, lines, { size: 15, font: 'mono' });
  };
  box(24, 80, 'Chunk', ['8 docs, 40-word', 'chunks, overlap 10'], C.blue, C.blueSoft);
  box(236, 80, 'Index', ['inverted index', 'BM25 k1=1.2 b=0.75'], C.blue, C.blueSoft);
  box(448, 80, 'Retrieve', ['top 3 chunks', 'by BM25 score'], C.violet, C.violet);
  box(660, 80, 'Gate', ['top score >= 4.0?', 'no: abstain'], C.rose, C.roseSoft);
  s.arrow(210, 128, 236, 128, { color: C.muted });
  s.arrow(422, 128, 448, 128, { color: C.muted });
  s.arrow(634, 128, 660, 128, { color: C.muted });
  box(660, 230, 'Prompt', ['[1] [2] [3] sources', 'plus the question'], C.green, C.greenSoft);
  box(448, 230, 'Generate', ['extractive stand-in', '(LLM in practice)'], C.amber, C.amberSoft);
  box(236, 230, 'Answer', ['sentence + [n] cite', 'check cite exists'], C.green, C.greenSoft);
  s.arrow(753, 176, 753, 230, { color: C.muted });
  s.arrow(660, 278, 634, 278, { color: C.muted });
  s.arrow(448, 278, 422, 278, { color: C.muted });
  s.note(24, 230, 186, 96, ['Pure Python here:', 'stdlib only, no model', 'weights, no API keys'], { size: 16 });
  s.text(440, 360, 'Only the generator is a stand-in. Retrieval and the abstain rule are the real code.', { size: 16, color: C.muted });
  save('37.3-pipeline.svg', s);
}

// 2. Inverted index: term -> postings (document, term frequency) for whole documents
{
  const names = ['Leave', 'Expense', 'Remote', 'Security', 'Travel', 'Parental', 'Office', 'Learning'];
  const titles = ['Leave policy', 'Expense claims', 'Remote work', 'Account security', 'Business travel', 'Parental leave', 'Office access', 'Learning budget'];
  const terms = ['annual', 'leave', 'days', 'badge', 'budget', 'learning'];
  const s = new Sketch(880, 440, { title: 'Inverted index: each term lists the documents that contain it, with counts', seed: 302 });
  s.text(440, 34, 'Inverted index for whole documents', { size: 26, weight: 700 });
  const x0 = 236, cw = 80, y0 = 80, rh = 44;
  s.text(40, y0 + 20, 'term', { size: 16, weight: 700, anchor: 'start' });
  s.text(204, y0 + 20, 'idf', { size: 16, weight: 700, anchor: 'end' });
  names.forEach((n, j) => s.text(x0 + j * cw + cw / 2, y0 + 20, n, { size: 16, weight: 700 }));
  terms.forEach((t, i) => {
    const y = y0 + 40 + i * rh;
    s.text(40, y + 24, t, { size: 18, font: 'mono', anchor: 'start' });
    s.text(204, y + 24, D.idf_whole[t].toFixed(2), { size: 16, font: 'mono', anchor: 'end' });
    titles.forEach((title, j) => {
      const hit = D.postings_whole[t].find(([name]) => name === title);
      const cx = x0 + j * cw + cw / 2;
      if (hit) {
        s.rect(cx - 28, y + 4, 56, 34, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
        s.text(cx, y + 27, String(hit[1]), { size: 18, font: 'mono' });
      } else {
        s.line(cx - 6, y + 21, cx + 6, y + 21, { color: C.muted, width: 1.5 });
      }
    });
  });
  s.text(440, 412, 'Cell = term frequency in that document. Dash = absent. idf = ln(1 + (N - df + 0.5)/(df + 0.5)), N = 8.', { size: 15, color: C.muted });
  save('37.3-postings.svg', s);
}

// 3. BM25 contributions per term for the top three chunks of the leave question (stacked bars)
{
  const s = new Sketch(880, 340, { title: 'Per-term BM25 contributions for the top three chunks of the leave question', seed: 303 });
  s.text(440, 34, 'Where the score comes from: "annual leave" question', { size: 25, weight: 700 });
  const scale = 66, x0 = 230;
  const colours = { annual: [C.blue, C.blueSoft], leave: [C.amber, C.amberSoft], month: [C.green, C.greenSoft], budget: [C.violet, C.violet] };
  D.q0_contrib.forEach((row, i) => {
    const y = 84 + i * 76;
    s.text(40, y + 26, row.chunk, { size: 18, weight: 700, anchor: 'start' });
    let x = x0;
    Object.entries(row.terms).forEach(([term, v]) => {
      const w = v.contribution * scale;
      const [col, soft] = colours[term] ?? [C.ink, C.blueSoft];
      s.rect(x, y, w, 40, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + w / 2, y + 26, `${term} ${v.contribution.toFixed(3)}`, { size: 15, font: 'mono' });
      x += w;
    });
    s.text(x + 12, y + 26, `= ${row.score.toFixed(3)}`, { size: 18, weight: 700, anchor: 'start' });
  });
  s.text(440, 318, 'Bar length = contribution to the chunk score, rounded to 3 places. Higher score ranks first.', { size: 15, color: C.muted });
  save('37.3-bm25-contrib.svg', s);
}

// 4. Chunk-size sweep: does the gold answer survive chunking, and does it reach the top 3?
{
  const s = new Sketch(880, 450, { title: 'Chunk size sweep on eight queries: whole answers kept, and hits in top three', seed: 304 });
  s.text(440, 34, 'Chunk size changes what can be retrieved', { size: 26, weight: 700 });
  const base = 330, unit = 26;
  s.line(90, base, 800, base, { color: C.muted, width: 2 });
  s.rect(40, 62, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(66, 78, 'gold answer kept whole in some chunk (of 8)', { size: 15, anchor: 'start' });
  s.rect(40, 90, 18, 18, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(66, 106, 'gold answer in top 3 by BM25 (of 8)', { size: 15, anchor: 'start' });
  D.sweep.forEach((r, i) => {
    const cx = 170 + i * 150;
    const h1 = r.gold_in_some_chunk * unit, h3 = r.hit_at_3 * unit;
    s.rect(cx - 46, base - h1, 40, h1, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 6, base - h3, 40, h3, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx - 26, base - h1 - 8, String(r.gold_in_some_chunk), { size: 16, font: 'mono' });
    s.text(cx + 26, base - h3 - 8, String(r.hit_at_3), { size: 16, font: 'mono' });
    const label = r.size === 'whole' ? 'whole doc' : `${r.size} words`;
    s.text(cx, base + 26, label, { size: 17, weight: 700 });
    s.text(cx, base + 50, `${r.chunks} chunks, ${r.words_per_chunk} w each`, { size: 15, color: C.muted });
    s.text(cx, base + 72, `top-3 context: ${Math.round(r.context_words_mean_top3)} words`, { size: 15, color: C.muted });
  });
  s.text(440, 428, 'Overlap is about a quarter of the chunk (2 of 10 words at size 10). The whole-document row has no overlap.', { size: 15, color: C.muted });
  save('37.3-chunk-sweep.svg', s);
}

// 5. Abstention: top BM25 score by outcome, with the gate at 4.0
{
  const a = D.abstain;
  const hits = D.per_query.filter(p => p.bm25_hit3).map(p => p.bm25_top1_score);
  const misses = D.per_query.filter(p => !p.bm25_hit3).map(p => p.bm25_top1_score);
  const ooc = a.ooc.map(o => o.top1_score);
  const tau = 4.0, maxV = 11, xA = 300, xB = 840;
  const x = v => xA + (v / maxV) * (xB - xA);
  const s = new Sketch(880, 380, { title: 'Top BM25 score by outcome, with the abstention gate at 4.0', seed: 305 });
  s.text(440, 34, 'The abstention gate needs a score gap', { size: 26, weight: 700 });
  s.line(x(tau), 70, x(tau), 320, { color: C.rose, width: 2, dash: '6 8' });
  s.text(x(tau), 62, 'gate 4.0', { size: 16, color: C.rose });
  const rows = [
    [115, `out of corpus (${ooc.length})`, ooc, C.muted, C.muted],
    [195, `wrong or missed (${misses.length})`, misses, C.rose, C.roseSoft],
    [275, `correct hits (${hits.length})`, hits, C.green, C.greenSoft],
  ];
  rows.forEach(([y, label, vals, col, soft]) => {
    s.text(40, y + 6, label, { size: 17, anchor: 'start' });
    vals.forEach(v => s.circle(x(v), y, 18, { color: col, fill: soft, fillStyle: 'solid' }));
  });
  s.line(xA, 320, xB, 320, { color: C.muted, width: 2 });
  for (let v = 0; v <= 10; v += 2) {
    s.line(x(v), 320, x(v), 328, { color: C.muted, width: 2 });
    s.text(x(v), 352, String(v), { size: 16, font: 'mono' });
  }
  s.text(440, 374, 'BM25 score of the top-ranked chunk. Gate between the miss range and the correct range.', { size: 15, color: C.muted });
  save('37.3-abstain.svg', s);
}
console.log('wrote 37.3 diagrams');
