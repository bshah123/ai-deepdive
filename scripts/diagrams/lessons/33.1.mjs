import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-05-information-retrieval/chapter-33-search-engines/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below is read from the output of 33.1_experiment.py.
const D = JSON.parse(readFileSync(join(HERE, '33.1_data.json'), 'utf8'));

// 1. Forward index vs inverted index
{
  const s = new Sketch(880, 320, { title: 'Four documents read forward, then the same postings read by term', seed: 301 });
  s.text(440, 36, 'Same four documents, two directions', { size: 26, weight: 700 });
  s.text(220, 84, 'Forward: document to terms', { size: 20, weight: 700, color: C.muted });
  s.text(660, 84, 'Inverted: term to postings', { size: 20, weight: 700 });
  const docs = [['doc 0', 'the cat sat'], ['doc 1', 'the dog sat down'], ['doc 2', 'a cat and a dog'], ['doc 3', 'the bird flew']];
  docs.forEach(([lab, txt], k) => {
    const y = 120 + k * 46;
    s.rect(40, y - 18, 96, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(88, y + 6, lab, { font: 'mono', size: 16 });
    s.text(156, y + 6, txt, { font: 'mono', size: 16, anchor: 'start' });
  });
  s.arrow(420, 176, 468, 176, { color: C.muted });
  s.text(444, 162, 'invert', { size: 16 });
  const terms = [['the', '[0, 1, 3]'], ['cat', '[0, 2]'], ['sat', '[0, 1]'], ['dog', '[1, 2]']];
  terms.forEach(([t, p], k) => {
    const y = 120 + k * 46;
    s.rect(500, y - 18, 90, 36, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(545, y + 6, t, { font: 'mono', size: 16 });
    s.arrow(598, y, 628, y, { color: C.muted });
    s.text(640, y + 6, p, { font: 'mono', size: 16, anchor: 'start' });
  });
  s.text(440, 300, 'Four of the nine terms are shown. A one-term query reads one row on the right.', { size: 17, color: C.muted });
  save('33.1-forward-vs-inverted.svg', s);
}

// 2. Two-pointer AND trace
{
  const s = new Sketch(880, 330, { title: 'Two-pointer intersection of cat [0, 2] and dog [1, 2]', seed: 302 });
  s.text(440, 36, 'Two-pointer AND: cat AND dog', { size: 24, weight: 700 });
  const p = D.block1_index.cat.map((x) => x[0]);
  const q = D.block1_index.dog.map((x) => x[0]);
  const steps = [
    { i: 0, j: 0, cap: '0 < 1: advance cat' },
    { i: 1, j: 0, cap: '2 > 1: advance dog' },
    { i: 1, j: 1, cap: '2 = 2: output 2' },
  ];
  steps.forEach((st, k) => {
    const x0 = 40 + k * 290;
    s.text(x0 + 130, 92, `step ${k + 1}`, { size: 18, weight: 700 });
    p.forEach((v, c) => {
      const hi = c === st.i;
      s.rect(x0 + 60 + c * 70, 110, 60, 40, { color: C.ink, fill: hi ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x0 + 90 + c * 70, 136, String(v), { font: 'mono', size: 18 });
    });
    s.text(x0 + 8, 136, 'cat', { size: 16, anchor: 'start' });
    q.forEach((v, c) => {
      const hi = c === st.j;
      s.rect(x0 + 60 + c * 70, 170, 60, 40, { color: C.ink, fill: hi ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x0 + 90 + c * 70, 196, String(v), { font: 'mono', size: 18 });
    });
    s.text(x0 + 8, 196, 'dog', { size: 16, anchor: 'start' });
    s.text(x0 + 130, 242, st.cap, { size: 18 });
  });
  s.text(440, 300, `Result [${D.block1_intersections[0].result.join(', ')}] after ${D.block1_intersections[0].comparisons} comparisons. Each step moves one pointer.`, { size: 17, color: C.muted });
  save('33.1-and-trace.svg', s);
}

// 3. VByte bit layout
{
  const s = new Sketch(880, 300, { title: 'VByte layout of 4 and 1000', seed: 303 });
  s.text(440, 36, 'VByte: 7 data bits per byte, one flag bit', { size: 24, weight: 700 });
  s.text(440, 66, 'Amber flag bit: 1 = another byte follows, 0 = last byte', { size: 17, color: C.muted });
  const drawByte = (x, y, bits) => {
    [...bits].forEach((b, k) => {
      s.rect(x + k * 28, y, 28, 36, { color: C.ink, fill: k === 0 ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x + k * 28 + 14, y + 24, b, { font: 'mono', size: 18 });
    });
  };
  const e4 = D.vbyte_examples['4'];
  const e1k = D.vbyte_examples['1000'];
  s.text(40, 123, '4 =', { size: 20, anchor: 'start' });
  drawByte(120, 100, e4[0]);
  s.text(372, 124, '4 < 128, so one byte', { size: 18, anchor: 'start' });
  s.text(40, 233, '1000 =', { size: 20, anchor: 'start' });
  drawByte(120, 210, e1k[0]);
  drawByte(372, 210, e1k[1]);
  s.text(232, 268, 'more bytes follow', { size: 16 });
  s.text(484, 268, 'last byte', { size: 16 });
  s.text(440, 296, '1000 = 7 x 128 + 104: high group 0000111, low group 1101000', { size: 17, color: C.muted });
  save('33.1-vbyte-bits.svg', s);
}

// 4. Bytes per posting, log scale
{
  const s = new Sketch(880, 340, { title: 'Bytes per posting by document frequency, log scale', seed: 304 });
  s.text(440, 36, 'Bytes per posting, by how common the term is', { size: 24, weight: 700 });
  const yOf = (v) => 290 - (Math.log10(v) + 0.301) * 80;
  [1, 10, 100].forEach((v) => {
    s.line(110, yOf(v), 800, yOf(v), { color: C.muted, dash: '4 6', width: 1 });
    s.text(100, yOf(v) + 5, String(v), { anchor: 'end', size: 16, font: 'mono' });
  });
  const order = ['df>=1000', '100-999', '10-99', '1-9'];
  const gx = [200, 380, 560, 740];
  order.forEach((k, g) => {
    const r = D.buckets[k];
    const bars = [[r.vbyte, C.blue, C.blueSoft, gx[g] - 45], [r.bitmap, C.amber, C.amberSoft, gx[g] + 5]];
    bars.forEach(([v, col, soft, x]) => {
      s.rect(x, yOf(v), 40, 290 - yOf(v), { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + 20, yOf(v) - 8, v.toFixed(1), { size: 15, font: 'mono' });
    });
    s.text(gx[g], 318, k, { size: 17 });
  });
  s.line(120, yOf(4), 800, yOf(4), { color: C.rose, dash: '6 8', width: 2 });
  s.text(120, yOf(4) - 8, 'raw 32-bit ids: 4', { size: 16, color: C.rose, anchor: 'start' });
  s.rect(300, 62, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(326, 77, 'VByte of d-gaps', { size: 16, anchor: 'start' });
  s.rect(300, 86, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(326, 101, 'uncompressed bitmap', { size: 16, anchor: 'start' });
  save('33.1-bytes-per-posting.svg', s);
}

// 5. Merge vs skip-pointer comparisons
{
  const s = new Sketch(880, 340, { title: 'Comparisons for merge and skip-pointer AND, four pairs', seed: 305 });
  s.text(440, 36, 'Comparisons: merge vs skip pointers', { size: 24, weight: 700 });
  const yOf = (v) => 290 - v * (210 / 6100);
  const gx = [200, 380, 560, 740];
  D.skip_rows.forEach((r, g) => {
    const bars = [[r.merge, C.amber, C.amberSoft, gx[g] - 45], [r.skip, C.blue, C.blueSoft, gx[g] + 5]];
    bars.forEach(([v, col, soft, x]) => {
      s.rect(x, yOf(v), 40, 290 - yOf(v), { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + 20, yOf(v) - 8, String(v), { size: 15, font: 'mono' });
    });
    s.text(gx[g], 312, `${r.short} vs ${r.long}`, { size: 17 });
  });
  s.rect(640, 62, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(666, 77, 'merge (two-pointer)', { size: 16, anchor: 'start' });
  s.rect(640, 86, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(666, 101, 'skip pointers', { size: 16, anchor: 'start' });
  save('33.1-skip-comparisons.svg', s);
}
console.log('wrote 5 SVGs for 33.1');
