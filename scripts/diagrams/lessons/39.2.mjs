// Diagrams for Lesson 39.2 (cross-encoders). Run: node scripts/diagrams/lessons/39.2.mjs
// Every number comes from scripts/diagrams/lessons/39.2_data.json, written by 39.2_data.py.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-39-reranking/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '39.2_data.json'), 'utf8'));
const save = (name, s) => { writeFileSync(join(OUT, name), s.toString()); console.log('wrote', name); };
const fmt = (n) => n.toLocaleString('en-US');

// ---------------------------------------------------------------- 1. two architectures
{
  const s = new Sketch(880, 420, { title: 'Bi-encoder: query and document encoded separately, compared by a dot product. Cross-encoder: query and document read together in one transformer and scored once.', seed: 3901 });
  s.text(440, 34, 'Two ways to score one query-document pair', { size: 26, weight: 700 });

  s.rect(20, 60, 410, 300, { color: C.muted, width: 1.2 });
  s.text(225, 92, 'Bi-encoder: encode separately', { size: 21, weight: 700, color: C.blue });
  // query tower
  s.rect(50, 118, 120, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 143, 'query', { font: 'mono', size: 17 });
  s.arrow(110, 158, 110, 190, { color: C.muted, head: 9 });
  s.rect(50, 190, 120, 40, { color: C.ink, width: 1.4 });
  s.text(110, 215, 'encoder', { size: 19 });
  s.arrow(110, 230, 110, 260, { color: C.muted, head: 9 });
  s.rect(50, 260, 120, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 284, 'q vector', { font: 'mono', size: 16 });
  // document tower
  s.rect(250, 118, 120, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(310, 143, 'document', { font: 'mono', size: 17 });
  s.arrow(310, 158, 310, 190, { color: C.muted, head: 9 });
  s.rect(250, 190, 120, 40, { color: C.ink, width: 1.4 });
  s.text(310, 215, 'encoder', { size: 19 });
  s.arrow(310, 230, 310, 260, { color: C.muted, head: 9 });
  s.rect(250, 260, 120, 36, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(310, 284, 'd vector', { font: 'mono', size: 16 });
  // score
  s.arrow(110, 296, 200, 318, { color: C.muted, head: 9 });
  s.arrow(310, 296, 260, 318, { color: C.muted, head: 9 });
  s.rect(120, 318, 220, 32, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(230, 340, 'score = q · d', { font: 'mono', size: 18 });

  s.rect(450, 60, 410, 300, { color: C.muted, width: 1.2 });
  s.text(655, 92, 'Cross-encoder: read the pair together', { size: 21, weight: 700, color: C.amber });
  const tok = (x, w, label, col, fill) => {
    s.rect(x, 118, w, 36, { color: col, fill, fillStyle: 'solid', width: 1.3 });
    s.text(x + w / 2, 142, label, { font: 'mono', size: 16 });
  };
  tok(466, 60, '[CLS]', C.violet, undefined);
  tok(534, 80, 'query', C.blue, C.blueSoft);
  tok(622, 50, '[SEP]', C.muted, undefined);
  tok(680, 90, 'document', C.green, C.greenSoft);
  tok(778, 50, '[SEP]', C.muted, undefined);
  s.arrow(655, 160, 655, 190, { color: C.muted, head: 9 });
  s.rect(470, 190, 340, 60, { color: C.ink, width: 1.4 });
  s.text(640, 214, ['transformer layers:', 'every token attends to every token'], { size: 18 });
  s.arrow(655, 250, 655, 282, { color: C.muted, head: 9 });
  s.rect(550, 282, 210, 32, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(655, 304, 'score from [CLS]', { font: 'mono', size: 17 });

  s.text(440, 396, 'Bi-encoder: document vectors are computed once, offline. Cross-encoder: the whole pair runs through the model for every query.', { size: 17, color: C.muted });
  save('39.2-architectures.svg', s);
}

// ---------------------------------------------------------------- 2. toy joint attention
{
  const A = D.attention;
  const s = new Sketch(880, 420, { title: 'Toy attention weights: three query tokens (rows) against four document tokens (columns). Cells with weight 0.2 or more are shaded.', seed: 3902 });
  s.text(440, 34, 'Joint attention: every query token reads every document token', { size: 24, weight: 700 });
  const x0 = 250, y0 = 118, cw = 110, ch = 54;
  A.doc_cols.forEach((w, j) => s.text(x0 + j * cw + cw / 2, 104, w, { font: 'mono', size: 17 }));
  s.text(x0 + 4 * cw + 55, 104, 'sum', { size: 17, color: C.muted, weight: 700 });
  A.query_rows.forEach((w, i) => {
    const y = y0 + i * ch;
    s.text(x0 - 14, y + ch / 2 + 6, w, { font: 'mono', size: 17, anchor: 'end', color: C.blue });
    A.doc_cols.forEach((_, j) => {
      const v = A.query_to_doc_weights[i][j];
      const hi = v >= 0.2;
      s.rect(x0 + j * cw + 2, y + 2, cw - 4, ch - 4, { color: hi ? C.blue : C.muted, fill: hi ? C.blueSoft : undefined, fillStyle: 'solid', width: 1.1 });
      s.text(x0 + j * cw + cw / 2, y + ch / 2 + 6, v.toFixed(2), { font: 'mono', size: 18, weight: hi ? 700 : 400 });
    });
    s.text(x0 + 4 * cw + 55, y + ch / 2 + 6, A.query_to_doc_mass_per_row[i].toFixed(2), { font: 'mono', size: 18, color: C.muted });
  });
  s.note(40, 300, 800, 84, [
    'Same word, same vector: "capital" in the query finds "capital" in the document.',
    'Overlap, not meaning: "france" finds no match to "paris" in this toy.',
  ], { size: 19 });
  save('39.2-joint-attention.svg', s);
}

// ---------------------------------------------------------------- 3. three score heads
{
  const M = D.monot5_style, S = D.single_logit_softmax_bug;
  const s = new Sketch(880, 400, { title: 'Three ways a cross-encoder turns a pair into a score: BERT-style single logit, MonoT5 two-token softmax, BGE single raw logit.', seed: 3903 });
  s.text(440, 34, 'Where the score comes from: three heads', { size: 25, weight: 700 });
  const cols = [
    { x: 20, title: 'BERT re-ranker (2019)', col: C.blue, fill: C.blueSoft },
    { x: 300, title: 'MonoT5 (2020)', col: C.violet, fill: C.roseSoft },
    { x: 590, title: 'BGE-reranker (model card)', col: C.green, fill: C.greenSoft },
  ];
  cols.forEach((c) => {
    s.rect(c.x, 60, 270, 300, { color: c.col, width: 1.3 });
    s.text(c.x + 135, 88, c.title, { size: 20, weight: 700, color: c.col });
  });
  const box = (x, y, w, h, lines, c, f, size = 17, font) => {
    s.rect(x, y, w, h, { color: c, fill: f, fillStyle: 'solid', width: 1.2 });
    s.text(x + w / 2, y + h / 2 + 6, lines, { size, font });
  };
  const arr = (x, y1, y2) => s.arrow(x, y1, x, y2, { color: C.muted, head: 8 });
  // column 1
  box(40, 110, 230, 40, '[CLS] q [SEP] d [SEP]', C.ink, undefined, 16, 'mono');
  arr(155, 150, 170); box(40, 170, 230, 40, 'final [CLS] vector', C.ink);
  arr(155, 210, 230); box(40, 230, 230, 40, 'one linear layer', C.ink);
  arr(155, 270, 290); box(40, 290, 230, 44, 'score s (trained as a probability)', C.blue, C.blueSoft, 15);
  // column 2
  box(320, 110, 230, 50, ['Query: q Document: d', 'Relevant:'], C.ink, undefined, 15, 'mono');
  arr(435, 160, 170); box(320, 170, 230, 40, 'T5 decoder, one step', C.ink);
  arr(435, 210, 226);
  s.text(435, 246, [`logit "true" = ${M.logit_true[0].toFixed(1)}`, `logit "false" = ${M.logit_false[0].toFixed(1)}`], { font: 'mono', size: 15 });
  arr(435, 262, 276); box(320, 276, 230, 50, ['softmax over 2 tokens', `p(true) = ${M.p_true[0].toFixed(3)}`], C.violet, C.roseSoft, 16, 'mono');
  // column 3
  box(610, 110, 230, 40, 'tokenized pair', C.ink);
  arr(725, 150, 170); box(610, 170, 230, 40, 'logits.view(-1)', C.ink, undefined, 17, 'mono');
  arr(725, 210, 230); box(610, 230, 230, 40, 'one raw logit z', C.ink);
  arr(725, 270, 290);
  box(610, 290, 230, 44, `z = 3.2 (no range)`, C.green, C.greenSoft, 16, 'mono');
  s.text(725, 352, `softmax over 1 value = ${S.softmax_over_dim1[0].toFixed(1)} (bug)`, { size: 16, color: C.rose, weight: 700 });
  s.text(440, 384, 'Score meaning depends on the head. Compare scores only inside one head and one query.', { size: 17, color: C.muted });
  save('39.2-score-heads.svg', s);
}

// ---------------------------------------------------------------- 4. cost bars
{
  const c = D.cost;
  const s = new Sketch(880, 380, { title: 'Tokens pushed through the transformer per query with 1,000 documents: bi-encoder 8, two-stage 13,108, full cross-encoder 131,000.', seed: 3904 });
  s.text(440, 34, 'Work per query, 1,000 candidate documents', { size: 25, weight: 700 });
  const x0 = 290, scale = 480 / c.cross_full_tokens_per_query;
  const rows = [
    { y: 92, label: ['bi-encoder', '(online part)'], n: c.bi_online_tokens_per_query, col: C.blue, fill: C.blueSoft },
    { y: 178, label: ['two-stage: bi top-100', '+ cross on 100'], n: c.two_stage_tokens_per_query, col: C.amber, fill: C.amberSoft },
    { y: 264, label: ['cross-encoder,', 'all 1,000 documents'], n: c.cross_full_tokens_per_query, col: C.violet, fill: C.roseSoft },
  ];
  rows.forEach((r) => {
    s.text(20, r.y + 20, r.label, { size: 18, anchor: 'start' });
    const w = Math.max(r.n * scale, 3);
    s.rect(x0, r.y, w, 44, { color: r.col, fill: r.n * scale >= 3 ? r.fill : undefined, fillStyle: 'solid', width: 1.8 });
    s.text(x0 + w + 14, r.y + 28, fmt(r.n), { font: 'mono', size: 20, anchor: 'start', weight: 700 });
  });
  s.text(440, 344, `Assumed: 8-token query, 120-token documents, 3 special tokens. Attention cost ignored. Offline: ${fmt(c.bi_offline_tokens_corpus)} tokens to index the corpus, once.`, { size: 16, color: C.muted });
  save('39.2-cost.svg', s);
}

// ---------------------------------------------------------------- 5. truncation budget
{
  const T = D.truncation;
  const s = new Sketch(880, 400, { title: 'Input budget of 512 tokens. The 700-token document keeps its first 501 tokens, so the answer at tokens 600 to 607 is cut.', seed: 3905 });
  s.text(440, 34, 'Truncation: the answer can fall outside the window', { size: 25, weight: 700 });
  const x0 = 40, W = 800;
  // row 1: model input, 512 tokens
  s.text(x0, 96, `model input: ${T.max_len} tokens`, { size: 18, anchor: 'start', weight: 700 });
  const sc1 = W / T.max_len;
  const pre = (1 + T.query_tokens + 1) * sc1;
  const docW = T.doc_tokens_kept * sc1;
  s.rect(x0, 108, pre, 40, { color: C.ink, fill: C.muted, fillStyle: 'solid', width: 1.2 });
  s.rect(x0 + pre, 108, docW, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.2 });
  s.rect(x0 + pre + docW, 108, W - pre - docW, 40, { color: C.ink, width: 1.2 });
  s.text(x0 + pre + docW / 2, 134, `${T.doc_tokens_kept} document tokens kept`, { size: 18 });
  s.text(x0, 166, `grey: [CLS] + query + [SEP] = ${1 + T.query_tokens + 1} tokens; the last [SEP] closes the pair`, { size: 16, color: C.muted, anchor: 'start' });

  // row 2: full document, own scale
  s.text(x0, 214, `full document: ${T.doc_tokens_total} tokens (own scale)`, { size: 18, anchor: 'start', weight: 700 });
  const sc2 = W / T.doc_tokens_total;
  const yb = 226;
  const kx = x0 + T.doc_tokens_kept * sc2;
  const rs = x0 + T.relevant_span[0] * sc2, re = x0 + T.relevant_span[1] * sc2;
  s.rect(x0, yb, kx - x0, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.2 });
  s.rect(kx, yb, x0 + W - kx, 40, { color: C.ink, width: 1.2, dash: '6 8' });
  s.rect(rs, yb, re - rs, 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', width: 1.8 });
  s.line(kx, yb - 8, kx, yb + 52, { color: C.ink, width: 1.6, dash: '4 6' });
  s.text(kx - 10, 300, `cut at token ${T.doc_tokens_kept}`, { size: 17, anchor: 'end' });
  s.text(x0 + W, 308, ['dropped: tokens 501-699', 'answer sits at tokens 600-607'], { size: 18, anchor: 'end', color: C.rose });
  s.text(x0 + 2, 302, 'kept: 0-500', { size: 17, anchor: 'start', color: C.green });

  s.text(440, 372, `Budget: ${T.max_len} - (${T.query_tokens} query + ${T.special_tokens} special) = ${T.doc_tokens_kept} document tokens.`, { size: 18 });
  save('39.2-truncation.svg', s);
}
