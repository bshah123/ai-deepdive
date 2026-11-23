// Diagrams for Lesson 44.1 (LlamaIndex core). Run: node scripts/diagrams/lessons/44.1.mjs
// Numbers come from scripts/diagrams/lessons/44.1_data.json (written by 44.1_data.py) and the
// worked example in the lesson (NumPy, vocabulary of six words).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-44-llamaindex/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '44.1_data.json'), 'utf8'));
// NodeRelationship enum values as printed by llama-index-core 0.14.26 (SOURCE=1, PREVIOUS=2, NEXT=3)
const REL = { 1: 'SOURCE', 2: 'PREVIOUS', 3: 'NEXT' };

// 1. Pipeline: documents -> nodes -> index -> retriever -> top-k nodes
{
  const s = new Sketch(880, 300, { title: 'Pipeline from documents to retrieved nodes', seed: 4411 });
  s.text(440, 40, 'From files to retrieved nodes', { size: 26, weight: 700 });
  const boxes = [
    ['Documents', `${Object.keys(D.nodes_per_doc_size40).length} files`, C.blue, C.blueSoft],
    ['Nodes', `${D.n_nodes_size40} chunks`, C.green, C.greenSoft],
    ['Index', `${D.embedding_matrix_shape[0]} x ${D.embedding_matrix_shape[1]} vectors`, C.violet, C.violet],
    ['Retriever', 'top-3 nodes', C.amber, C.amberSoft],
  ];
  const xs = [40, 232, 424, 616];
  boxes.forEach(([name, sub, col, soft], i) => {
    s.rect(xs[i], 100, 170, 84, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(xs[i] + 85, 134, name, { size: 22, weight: 700 });
    s.text(xs[i] + 85, 164, sub, { size: 15, font: 'mono' });
  });
  for (let i = 0; i < 3; i++) s.arrow(xs[i] + 176, 142, xs[i + 1] - 6, 142, { color: C.muted });
  const notes = [
    ['Document: text + metadata', 'one per source file'],
    ['Node: a chunk + id + links', 'word windows that overlap'],
    ['Index: one vector per node', 'the vectors are stored, not the text'],
    ['Retriever: scores every node', 'keeps the k best'],
  ];
  notes.forEach(([a, b], i) => {
    s.text(xs[i] + 85, 222, [a, b], { size: 15, color: C.muted });
  });
  s.text(440, 282, 'Retrieval only: no answer is generated in this lesson (Lesson 44.2 covers that).', { size: 16, color: C.muted });
  save('44.1-pipeline.svg', s);
}

// 2. Chunking: four overlapping windows over the 112-word kettle manual
{
  const s = new Sketch(880, 330, { title: 'Four overlapping chunks over one document', seed: 4412 });
  s.text(440, 36, 'One document, four overlapping nodes', { size: 26, weight: 700 });
  const k = 7;             // px per word
  const x0 = 60;
  const words = D.words_per_doc.kettle_manual;   // 112
  const counts = D.node_word_counts_size40.slice(0, 4); // 36, 36, 36, 34
  const step = 26;          // 36 text words per node minus 10 overlap
  s.text(x0, 78, `${words} words in the document. Chunk size 40 = 36 text words + 4 metadata tokens.`, { size: 16, color: C.muted, anchor: 'start' });
  counts.forEach((n, i) => {
    const y = 100 + i * 44;
    const start = i * step;
    s.rect(x0 + start * k, y, n * k, 30, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x0 + start * k + 8, y + 21, `node ${i}: ${n} words`, { size: 15, font: 'mono', anchor: 'start' });
    if (i < counts.length - 1) {
      s.rect(x0 + (start + step) * k, y + 34, 10 * k, 8, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
    }
  });
  s.text(x0 + 27 * k, 282, 'amber = 10-word overlap with the next node', { size: 16, color: C.amber });
  s.text(440, 316, 'Each node starts 26 words after the last one (36 - 10).', { size: 16, color: C.muted });
  save('44.1-chunking.svg', s);
}

// 3. Node anatomy, from the real llama-index-core object
{
  const a = D.anatomy;
  const s = new Sketch(880, 330, { title: 'Anatomy of one node', seed: 4413 });
  s.text(440, 36, 'What one node carries', { size: 26, weight: 700 });
  s.rect(40, 70, 480, 220, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(60, 104, `Node  ${a.node_id}`, { size: 19, font: 'mono', anchor: 'start', weight: 700 });
  s.text(60, 140, [
    `ref_doc_id: ${a.ref_doc_id}`,
    `metadata:   ${JSON.stringify(a.metadata)}`,
    `text:       "${a.text_preview.trim().slice(0, 30)}..."`,
    `relations:  ${a.relationships.map((v) => REL[v]).join(', ')}`,
  ], { size: 15, font: 'mono', anchor: 'start', color: C.ink });
  s.rect(600, 70, 240, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(720, 106, `Document ${a.ref_doc_id}`, { size: 16, font: 'mono' });
  s.rect(600, 230, 240, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(720, 266, a.next_node_id, { size: 16, font: 'mono' });
  s.arrow(520, 110, 596, 100, { color: C.muted });
  s.text(560, 86, 'SOURCE', { size: 15, font: 'mono', color: C.muted });
  s.arrow(520, 230, 596, 260, { color: C.muted });
  s.text(560, 236, 'NEXT', { size: 15, font: 'mono', color: C.muted });
  s.text(440, 318, 'PREVIOUS is the same idea in the other direction; the first node has none.', { size: 16, color: C.muted });
  save('44.1-node-anatomy.svg', s);
}

// 4. Worked example: query and three chunks over a six-word vocabulary (matches the NumPy block)
{
  const s = new Sketch(880, 360, { title: 'Worked example: dot products and cosines', seed: 4414 });
  s.text(440, 36, 'Worked example: score three chunks against one query', { size: 25, weight: 700 });
  const vocab = ['water', 'litre', 'lid', 'cord', 'boil', 'base'];
  const rows = [
    ['query', [1, 1, 0, 0, 0, 0], '', ''],
    ['chunk 0', [1, 1, 0, 0, 0, 0], '2', '1.00'],
    ['chunk 1', [1, 0, 1, 0, 0, 0], '1', '0.50'],
    ['chunk 2', [0, 0, 0, 1, 0, 0], '0', '0.00'],
  ];
  const cw = 64, x0 = 170, y0 = 110, rh = 44;
  vocab.forEach((w, j) => s.text(x0 + j * cw + cw / 2, y0 - 14, w, { size: 15, font: 'mono' }));
  s.text(x0 + 6 * cw + 80, y0 - 14, 'dot', { size: 16, weight: 700 });
  s.text(x0 + 6 * cw + 200, y0 - 14, 'cosine', { size: 16, weight: 700 });
  rows.forEach(([label, vec, dot, cos], i) => {
    const y = y0 + i * rh;
    s.text(x0 - 14, y + 27, label, { size: 16, anchor: 'end', font: 'mono' });
    vec.forEach((v, j) => {
      const on = v === 1;
      s.rect(x0 + j * cw + 4, y + 4, cw - 8, rh - 8, { color: on ? C.blue : C.muted, fill: on ? C.blueSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x0 + j * cw + cw / 2, y + 27, String(v), { size: 16, font: 'mono' });
    });
    if (dot !== '') {
      s.text(x0 + 6 * cw + 80, y + 27, dot, { size: 18, weight: 700 });
      s.text(x0 + 6 * cw + 200, y + 27, cos, { size: 18, weight: 700, color: i === 1 ? C.amber : C.ink });
    }
  });
  s.text(440, 318, 'cosine = dot / (length of chunk x length of query). Lengths: sqrt(2), sqrt(2), 1, sqrt(2).', { size: 16, color: C.muted });
  save('44.1-worked-example.svg', s);
}

// 5. Chunk-size sweep on the three-document corpus
{
  const sw = D.sweep;
  const sizes = ['20', '40', '80', '160'];
  const s = new Sketch(880, 400, { title: 'Chunk size against whole-answer containment', seed: 4415 });
  s.text(440, 36, 'Chunk size decides whether an answer survives splitting', { size: 24, weight: 700 });
  const base = 290, maxH = 190;
  s.line(90, base, 800, base, { color: C.muted });
  sizes.forEach((z, i) => {
    const cx = 170 + i * 200;
    const v = sw[z].answer_inside_some_node;
    const h = (v / sw[z].n_questions) * maxH;
    s.rect(cx - 45, base - h, 90, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, `${v} / ${sw[z].n_questions}`, { size: 19, weight: 700 });
    s.text(cx, base + 30, `${z} words`, { size: 17 });
    s.text(cx, base + 54, `${sw[z].n_nodes} nodes`, { size: 15, font: 'mono', color: C.muted });
  });
  s.text(440, 384, 'Bars: questions whose answer sentence sits wholly inside one node. Top-2 retrieval never missed one.', { size: 15, color: C.muted });
  save('44.1-chunk-sweep.svg', s);
}
