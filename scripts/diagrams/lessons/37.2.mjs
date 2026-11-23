import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-37-rag-fundamentals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below is read from 37.2_data.json, written by 37.2_experiment.py.
const D = JSON.parse(readFileSync(join(HERE, '37.2_data.json'), 'utf8'));
const row = (size, overlap) => D.sweep.find((r) => r.size === size && r.overlap === overlap);
const f2 = (x) => x.toFixed(2);

// 1. Lifecycle: offline index, online retrieval, generation
{
  const s = new Sketch(880, 410, { title: 'RAG lifecycle: documents are loaded, chunked, embedded and indexed once; each question is embedded, matched against the index, and the top chunks go into a prompt for the LLM', seed: 371 });
  s.text(440, 34, 'The lifecycle: index once, answer many questions', { size: 26, weight: 700 });
  s.text(40, 74, 'OFFLINE, once per corpus', { size: 16, anchor: 'start', color: C.muted, weight: 700 });
  const boxes1 = [['1 Load', 60], ['2 Chunk', 260], ['3 Embed', 460], ['4 Index', 660]];
  boxes1.forEach(([t, x], i) => {
    s.rect(x, 84, 160, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 80, 116, t, { font: 'mono', size: 18 });
    if (i < 3) s.arrow(x + 160, 110, x + 200, 110, { color: C.muted });
  });
  s.text(40, 186, 'ONLINE, once per question', { size: 16, anchor: 'start', color: C.muted, weight: 700 });
  const boxes2 = [['Question', 260], ['Embed query', 460], ['Top-k search', 660]];
  s.note(40, 200, 190, 62, ['same embedder', 'for docs and queries'], { size: 16 });
  boxes2.forEach(([t, x], i) => {
    s.rect(x, 204, 160, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + 80, 236, t, { font: 'mono', size: 18 });
    if (i < 2) s.arrow(x + 160, 230, x + 200, 230, { color: C.muted });
  });
  s.arrow(740, 136, 740, 204, { color: C.muted, dash: '6 8' });
  s.text(756, 176, 'reads', { size: 16, color: C.muted, anchor: 'start' });
  s.text(40, 296, 'GENERATION, once per question', { size: 16, anchor: 'start', color: C.muted, weight: 700 });
  const boxes3 = [['Prompt', 260], ['LLM call', 460], ['Answer [n]', 660]];
  s.note(40, 310, 190, 62, ['not run in', 'this lesson'], { size: 16 });
  boxes3.forEach(([t, x], i) => {
    s.rect(x, 314, 160, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 80, 346, t, { font: 'mono', size: 18 });
    if (i < 2) s.arrow(x + 160, 340, x + 200, 340, { color: C.muted });
  });
  s.arrow(740, 256, 380, 314, { color: C.muted });
  s.text(440, 396, 'top-k chunks + question become the prompt', { size: 17, color: C.muted });
  save('37.2-lifecycle.svg', s);
}

// 2. Chunking cut: the gold answer "10 days" is split across two chunks of 16 words
{
  const leave = D.leave_chunks_16;
  const s = new Sketch(880, 300, { title: 'Two consecutive 16-word chunks of the leave policy; the phrase 10 days is split between them, so neither chunk contains it', seed: 372 });
  s.text(440, 34, 'A fixed-size cut can split the answer', { size: 26, weight: 700 });
  s.rect(40, 70, 600, 84, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(60, 100, 'chunk 1: Full-time staff accrue 1.5 days of annual leave', { font: 'mono', size: 16, anchor: 'start' });
  s.text(60, 130, 'per completed month. Unused leave up to 10', { font: 'mono', size: 16, anchor: 'start' });
  s.rect(40, 180, 600, 84, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(60, 210, 'chunk 2: days carries over to the next calendar year.', { font: 'mono', size: 16, anchor: 'start' });
  s.text(60, 240, 'Leave requests must be approved by a line', { font: 'mono', size: 16, anchor: 'start' });
  s.note(670, 70, 190, 194, ['gold answer:', '"10 days"', '', 'chunk 1 ends with "10";', 'chunk 2 starts with "days".', 'Index contains no chunk', 'with the full answer.'], { size: 16 });
  s.text(440, 290, `Words per chunk: 16. Chunks in the corpus at this size: ${D.default_chunks}.`, { size: 16, color: C.muted });
  save('37.2-chunk-cut.svg', s);
}

// 3. Retrieval ranking for one question
{
  const hits = D.example_hits;
  const s = new Sketch(880, 300, { title: `Top-3 chunks for the question "${D.example_query}" with cosine scores; the answer chunk is rank 2, not rank 1`, seed: 373 });
  s.text(440, 34, 'Retrieval ranks by score; the answer can sit at rank 2', { size: 26, weight: 700 });
  s.text(40, 72, `Question: ${D.example_query}`, { size: 17, anchor: 'start', color: C.muted });
  const scale = 480;
  hits.forEach((h, i) => {
    const y = 110 + i * 56;
    const label = h.text.split(' ').slice(0, 4).join(' ') + ' ...';
    s.text(40, y + 24, `rank ${i + 1}  "${label}"`, { font: 'mono', size: 15, anchor: 'start' });
    const w = h.score * scale;
    const col = h.has_gold ? C.green : C.blue;
    const soft = h.has_gold ? C.greenSoft : C.blueSoft;
    s.rect(400, y, w, 36, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(400 + w + 12, y + 24, `${h.score.toFixed(3)}${h.has_gold ? '  contains "' + D.example_gold + '"' : ''}`, { size: 16, anchor: 'start' });
  });
  s.text(440, 282, 'Scores are cosines between TF-IDF vectors (a toy embedding, see the text).', { size: 16, color: C.muted });
  save('37.2-retrieval-rank.svg', s);
}

// 4. Sweep: what the index can return, by chunk size
{
  const sizes = [[4, 'size 4'], [8, '8'], [16, '16'], [32, '32'], [64, '64'], [1000000, 'whole doc']];
  const s = new Sketch(880, 400, { title: 'Grouped bars: fraction of 14 questions whose answer is in some chunk, and in the top 3 chunks, for chunk sizes 4 to whole documents', seed: 374 });
  s.text(440, 34, 'Chunk size decides what retrieval can ever return', { size: 24, weight: 700 });
  const base = 330, top = 110, H = base - top;
  for (const v of [0, 0.5]) {
    const y = base - v * H;
    s.line(120, y, 800, y, { color: C.muted, width: 1, dash: v === 0 ? undefined : '4 6' });
    s.text(100, y + 6, v.toFixed(1), { size: 16, anchor: 'end', color: C.muted });
  }
  sizes.forEach(([size, label], i) => {
    const r = row(size, 0);
    const cx = 170 + i * 120;
    const h1 = r.answer_in_index * H, h3 = r.answer_at_k * H;
    s.rect(cx - 40, base - h1, 36, h1, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 4, base - h3, 36, h3, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx - 22, base - h1 - 8, f2(r.answer_in_index), { size: 15 });
    s.text(cx + 22, base - h3 - 8, f2(r.answer_at_k), { size: 15 });
    s.text(cx, base + 28, label, { size: 17 });
  });
  s.text(440, 372, 'chunk size in words, overlap 0', { size: 17, color: C.muted });
  s.text(100, top + 6, '1.0', { size: 16, anchor: 'end', color: C.muted });
  const lx = 420, ly = 70;
  s.rect(lx, ly - 12, 16, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(lx + 24, ly + 2, 'answer in some chunk', { size: 16, anchor: 'start' });
  s.rect(lx + 220, ly - 12, 16, 16, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(lx + 244, ly + 2, 'answer in top 3', { size: 16, anchor: 'start' });
  save('37.2-sweep.svg', s);
}
