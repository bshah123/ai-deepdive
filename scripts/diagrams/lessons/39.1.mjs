// Diagrams for lesson 39.1. Numbers are copied from the lesson's own runs:
//  - worked example (2-d hand vectors): mean vector 0.707, 0.707; cosine 0.949; interaction 4 and 2.
//  - toy experiment (200 queries, 47 candidates each): bi-encoder P@1 0.135, recall@20 1.000,
//    two-stage P@1 1.000, interaction-on-all P@1 1.000, pair passes 47 vs 20, exact-tie group 7.
//  - cost arithmetic: 10,000 sentences -> 49,995,000 pairs vs 10,000 encodings; N = 1,000,000 and k = 100.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-39-reranking/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Two architectures: encode apart vs read together
{
  const s = new Sketch(880, 400, { title: 'Bi-encoder encodes query and document apart; cross-encoder reads them together', seed: 101 });
  s.text(440, 34, 'Two ways to score one query-document pair', { size: 26, weight: 700 });
  s.line(440, 60, 440, 380, { color: C.muted, dash: '6 8' });
  // left: bi-encoder
  s.text(220, 86, 'Bi-encoder: encode apart', { size: 22, weight: 700, color: C.blue });
  s.rect(40, 120, 120, 44, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(100, 148, 'query', { font: 'mono', size: 17 });
  s.rect(40, 240, 120, 44, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(100, 268, 'document', { font: 'mono', size: 17 });
  s.rect(200, 120, 110, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(255, 148, 'encoder', { size: 19 });
  s.rect(200, 240, 110, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(255, 268, 'encoder', { size: 19 });
  s.arrow(160, 142, 200, 142, { color: C.muted });
  s.arrow(160, 262, 200, 262, { color: C.muted });
  s.rect(345, 120, 80, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(385, 148, 'q', { font: 'mono', size: 19 });
  s.rect(345, 240, 80, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(385, 268, 'd', { font: 'mono', size: 19 });
  s.arrow(310, 142, 345, 142, { color: C.muted });
  s.arrow(310, 262, 345, 262, { color: C.muted });
  s.arrow(385, 166, 385, 230, { color: C.muted });
  s.text(372, 209, 'score = q·d', { font: 'mono', size: 16, anchor: 'end' });
  s.note(40, 318, 390, 62, ['d can be computed once, offline', 'per query: 1 pass + N dot products'], { size: 18 });
  // right: cross-encoder
  s.text(660, 86, 'Cross-encoder: read together', { size: 22, weight: 700, color: C.violet });
  s.rect(480, 120, 360, 44, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(660, 148, 'query  [SEP]  document', { font: 'mono', size: 17 });
  s.rect(560, 200, 200, 44, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(660, 228, 'one encoder', { size: 19 });
  s.arrow(660, 166, 660, 196, { color: C.muted });
  s.rect(560, 272, 200, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(660, 300, 'relevance score', { size: 19 });
  s.arrow(660, 246, 660, 268, { color: C.muted });
  s.note(480, 318, 360, 62, ['one forward pass per pair:', 'query tokens attend to document tokens'], { size: 18 });
  save('39.1-two-architectures.svg', s);
}

// 2. Cost per query, log scale
{
  const s = new Sketch(880, 330, { title: 'Model passes per query on a million-document corpus, log scale', seed: 102 });
  s.text(440, 34, 'Model passes per query, N = 1,000,000 documents', { size: 26, weight: 700 });
  const bar = (y, passes, label, color, fill) => {
    const w = Math.max(8, 60 * Math.log10(passes));
    s.text(40, y + 4, label, { size: 19, anchor: 'start' });
    s.rect(300, y - 18, w, 36, { color, fill, fillStyle: 'solid' });
    s.text(300 + w + 12, y + 5, passes === 1 ? '1 pass' : passes.toLocaleString('en-US') + ' passes', { font: 'mono', size: 16, anchor: 'start' });
  };
  bar(100, 1000000, 'cross-encoder, all docs', C.violet, C.roseSoft);
  bar(170, 100, 'two-stage, top k = 100', C.green, C.greenSoft);
  bar(240, 1, 'bi-encoder: 1 query pass', C.blue, C.blueSoft);
  s.text(300, 282, 'plus 1,000,000 dot products of dimension 768 (about 7.7e8 multiply-adds)', { size: 17, anchor: 'start', color: C.muted });
  s.text(40, 318, 'bar length: log10 scale, each 60 px is a factor of 10', { size: 16, anchor: 'start', color: C.muted });
  save('39.1-cost-per-query.svg', s);
}

// 3. Worked example: mean pooling cannot tell the two sentences apart
{
  const s = new Sketch(880, 370, { title: 'Mean pooling gives identical vectors for two sentences with different word order', seed: 103 });
  s.text(440, 34, 'Same words, different order', { size: 26, weight: 700 });
  s.rect(40, 70, 270, 50, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(175, 101, 'dog bites man', { font: 'mono', size: 19 });
  s.rect(570, 70, 270, 50, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(705, 101, 'man bites dog', { font: 'mono', size: 19 });
  s.rect(270, 170, 340, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 196, 'mean vector (0.707, 0.707)', { font: 'mono', size: 17 });
  s.text(440, 218, 'cosine with query = 0.949 for both', { size: 18 });
  s.arrow(175, 124, 330, 166, { color: C.muted });
  s.arrow(705, 124, 550, 166, { color: C.muted });
  s.text(440, 282, 'query: "dog bites"', { font: 'mono', size: 18, color: C.muted });
  s.note(40, 300, 380, 56, ['interaction scorer: "dog bites" in order?', 'yes, so the score is 4'], { size: 18 });
  s.note(460, 300, 380, 56, ['interaction scorer: "dog bites" in order?', 'no, so the score is 2'], { size: 18 });
  save('39.1-order-blind.svg', s);
}

// 4. Two-stage pipeline with the toy numbers
{
  const s = new Sketch(880, 340, { title: 'Two-stage pipeline: bi-encoder keeps 20 of 47 candidates, cross-scorer ranks them', seed: 104 });
  s.text(440, 34, 'Retrieve wide, then re-rank narrow', { size: 26, weight: 700 });
  s.rect(40, 90, 170, 74, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(125, 118, '47 candidates', { size: 20 });
  s.text(125, 144, 'for one query', { size: 18, color: C.muted });
  s.arrow(210, 127, 260, 127, { color: C.muted });
  s.rect(260, 90, 230, 74, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(375, 118, 'stage 1: bi-encoder', { size: 20 });
  s.text(375, 144, 'keep top 20; recall@20 = 1.000', { size: 17, color: C.muted });
  s.arrow(490, 127, 540, 127, { color: C.muted });
  s.rect(540, 90, 230, 74, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(655, 118, 'stage 2: cross-scorer', { size: 20 });
  s.text(655, 144, '20 pair passes; P@1 = 1.000', { size: 17, color: C.muted });
  s.note(40, 218, 800, 84, ['one-stage alternative: 47 pair passes, P@1 = 1.000 on the same toy data.', 'Stage 2 cost grows with k, not with the corpus size.'], { size: 18 });
  save('39.1-two-stage.svg', s);
}

// 5. Measured P@1 on the toy experiment
{
  const s = new Sketch(880, 320, { title: 'Precision at 1 on the toy experiment, by method', seed: 105 });
  s.text(440, 34, 'Precision at 1 on 200 toy queries', { size: 26, weight: 700 });
  const row = (y, label, v, color, fill) => {
    s.text(40, y + 6, label, { size: 19, anchor: 'start' });
    s.rect(330, y - 20, 420 * v, 40, { color, fill, fillStyle: 'solid' });
    s.text(330 + 420 * v + 12, y + 6, v.toFixed(3), { font: 'mono', size: 18, anchor: 'start' });
  };
  row(110, 'bi-encoder only', 0.135, C.blue, C.blueSoft);
  row(180, 'two-stage (top 20)', 1.0, C.green, C.greenSoft);
  row(250, 'cross-scorer, all 47', 1.0, C.violet, C.roseSoft);
  s.line(330 + 420 / 7, 80, 330 + 420 / 7, 280, { color: C.amber, dash: '6 8' });
  s.text(330 + 420 / 7, 300, 'random pick in the 7-way tie: 0.143', { size: 16, color: C.muted });
  save('39.1-toy-results.svg', s);
}
