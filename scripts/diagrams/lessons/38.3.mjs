import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-38-document-ingestion/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Hierarchy: one parent section, its children, the index and the parent_id link.
{
  const s = new Sketch(880, 360, { title: 'One section stored as a parent, split into children that are indexed', seed: 101 });
  s.text(440, 34, 'One section, two granularities', { size: 26, weight: 700 });
  s.rect(40, 110, 240, 140, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(160, 150, 'Section 1 (parent)', { size: 20, weight: 700 });
  s.text(160, 180, '152 words, stored whole', { size: 17 });
  s.text(160, 208, 'returned to the LLM', { size: 17 });
  const ys = [78, 148, 218, 288];
  ys.forEach((y, i) => {
    s.rect(380, y, 220, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(490, y + 29, `child ${i + 1}: <= 48 words`, { size: 17, font: 'mono' });
    s.arrow(280, 180, 380, y + 23, { color: C.muted });
  });
  s.rect(670, 120, 180, 120, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(760, 162, 'vector index', { size: 20, weight: 700 });
  s.text(760, 192, 'children only', { size: 17 });
  s.text(760, 218, 'embedded', { size: 17 });
  ys.forEach((y) => s.arrow(600, y + 23, 670, 180, { color: C.muted }));
  s.text(440, 348, 'each child stores parent_id; a hit on a child returns its parent', { size: 18, color: C.muted });
  save('38.3-hierarchy.svg', s);
}

// 2. Worked example: query q = [3, 4]; cosines from lesson_code / toy run.
{
  const s = new Sketch(880, 340, { title: 'Ranking children by cosine and counting distinct parents', seed: 102 });
  s.text(440, 34, 'Walk the ranked children until k distinct parents', { size: 25, weight: 700 });
  s.text(40, 78, 'query q = [3, 4]', { size: 20, font: 'mono', anchor: 'start' });
  const rows = [
    ['c1', 'P1', '1.00', 1.0],
    ['c2', 'P1', '0.96', 0.96],
    ['c3', 'P2', '0.80', 0.8],
  ];
  rows.forEach(([c, p, cos, v], i) => {
    const y = 130 + i * 62;
    s.rect(40, y - 22, 110, 44, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(95, y + 6, c, { size: 19, font: 'mono' });
    s.text(180, y + 6, `parent ${p}`, { size: 19, font: 'mono', anchor: 'start' });
    s.text(330, y + 6, `cos ${cos}`, { size: 19, font: 'mono', anchor: 'start' });
    s.rect(470, y - 14, 320 * v, 28, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  });
  s.note(40, 282, 780, 46, ['k = 2 children give 1 distinct parent (P1); k = 3 children give 2 (P1, P2)'], { size: 19 });
  save('38.3-cosine-walk.svg', s);
}

// 3. Boundary cut: a 12-word fact crosses the edge of a 32-word fixed window.
{
  const s = new Sketch(880, 300, { title: 'A fixed-size window cuts a fact in two', seed: 103 });
  s.text(440, 34, 'Fixed windows cut facts; sentence-packed children do not', { size: 24, weight: 700 });
  const x0 = 40, k = 12.5;
  s.rect(x0, 110, 32 * k, 60, { color: C.muted });
  s.rect(x0 + 32 * k, 110, 32 * k, 60, { color: C.muted });
  s.rect(x0 + 26 * k, 120, 12 * k, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(x0 + 16 * k, 190, 'window 1 (words 0-31)', { size: 18 });
  s.text(x0 + 48 * k, 190, 'window 2 (words 32-63)', { size: 18 });
  s.text(x0 + 32 * k, 96, 'fact: 12 words, words 26-37', { size: 18, color: C.amber });
  s.note(40, 222, 800, 56, ['neither window holds the whole fact; measured: 66.2% of facts sit inside one 32-word window'], { size: 19 });
  save('38.3-boundary-cut.svg', s);
}

// 4. Trade-off: recall@3 against words returned for k = 3 (means over 5 corpora, 48 queries each).
{
  const s = new Sketch(880, 420, { title: 'Recall against context size for four chunking configurations', seed: 104 });
  s.text(440, 34, 'More recall costs more words per answer', { size: 25, weight: 700 });
  const X = (w) => 110 + w * 1.38, Y = (r) => 360 - r * 260;
  s.line(110, 360, 800, 360, { color: C.ink });
  s.line(110, 100, 110, 360, { color: C.ink });
  [0, 100, 200, 300, 400, 500].forEach((w) => s.text(X(w), 388, String(w), { size: 17, color: C.muted }));
  [0, 0.25, 0.5, 0.75, 1].forEach((r) => s.text(92, Y(r) + 6, r.toFixed(2), { size: 17, color: C.muted, anchor: 'end' }));
  s.text(455, 418, 'words returned for top-3 (mean)', { size: 18 });
  s.text(40, 230, 'recall@3', { size: 18, rotate: -90 });
  const pts = [
    ['flat 32 words', 96, 0.271, C.muted, 'start'],
    ['flat 128 words', 374, 0.442, C.muted, 'start'],
    ['child, no parent', 118, 0.375, C.muted, 'end'],
    ['child -> parent', 455, 0.733, C.blue, 'end'],
  ];
  pts.forEach(([label, w, r, col, anc]) => {
    s.circle(X(w), Y(r), 16, { color: col, fill: col, fillStyle: 'solid' });
    if (label === 'flat 32 words') s.text(X(w) + 18, Y(r) + 30, `${label}: ${r.toFixed(3)}`, { size: 17, anchor: 'start', color: col });
    else s.text(X(w) + (anc === 'start' ? 16 : -16), Y(r) - 14, `${label}: ${r.toFixed(3)}`, { size: 17, anchor: anc, color: col });
  });
  save('38.3-tradeoff.svg', s);
}
console.log('ok');
