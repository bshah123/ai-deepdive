// Diagrams for 10.2 (MRO and C3 linearization).
// Run: node scripts/diagrams/lessons/10.2.mjs
// Every number comes from scripts/diagrams/lessons/10.2_data.py (run it to reprint them).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-10-oop/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 10.2-diamond.svg
{
  const s = new Sketch(880, 380, { title: 'Diamond inheritance: D inherits from B and C, which both inherit from A; the MRO lists D, B, C, A, object', seed: 1021 });
  s.text(440, 34, 'Diamond: the shape of the hierarchy', { size: 26, weight: 700 });
  // classes (arrows point from child up to parent)
  s.rect(150, 74, 120, 50, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(210, 106, 'A', { font: 'mono', size: 20 });
  s.rect(50, 196, 120, 50, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(110, 228, 'B', { font: 'mono', size: 20 });
  s.rect(250, 196, 120, 50, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(310, 228, 'C', { font: 'mono', size: 20 });
  s.rect(150, 300, 120, 50, { color: C.ink, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(210, 332, 'D', { font: 'mono', size: 20 });
  s.arrow(110, 196, 170, 124, { color: C.muted, head: 9 });
  s.arrow(310, 196, 250, 124, { color: C.muted, head: 9 });
  s.arrow(170, 300, 110, 246, { color: C.muted, head: 9 });
  s.arrow(250, 300, 310, 246, { color: C.muted, head: 9 });
  // the MRO, top to bottom
  s.text(640, 84, 'D.__mro__', { font: 'mono', size: 18, color: C.muted });
  const order = ['D', 'B', 'C', 'A', 'object'];
  const fills = [C.roseSoft, C.greenSoft, C.amberSoft, C.blueSoft, C.blueSoft];
  order.forEach((name, i) => {
    const y = 104 + i * 52;
    s.rect(560, y, 170, 40, { color: C.ink, fill: fills[i], fillStyle: 'solid' });
    s.text(645, y + 26, name, { font: 'mono', size: 19 });
    if (i < order.length - 1) s.arrow(645, y + 40, 645, y + 52, { color: C.muted, head: 7 });
  });
  s.text(440, 372, 'Arrows point from child to parent. Search runs top to bottom on the right.', { size: 18, color: C.muted });
  save('10.2-diamond.svg', s);
}

// ---------------------------------------------------------------- 10.2-dfs-vs-c3.svg
{
  const s = new Sketch(880, 330, { title: 'Same bases, two search orders: depth-first puts A before C, C3 puts C before A', seed: 1022 });
  s.text(440, 34, 'Two orders for the same class D', { size: 26, weight: 700 });
  const names = ['D', 'B', 'A', 'object', 'C'];
  const c3names = ['D', 'B', 'C', 'A', 'object'];
  s.text(40, 90, 'naive depth-first', { size: 19, color: C.muted, anchor: 'start' });
  names.forEach((n, i) => {
    const x = 40 + i * 130;
    const bad = n === 'A';
    s.rect(x, 102, 110, 44, { color: C.ink, fill: bad ? C.roseSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x + 55, 130, n, { font: 'mono', size: 19 });
  });
  s.text(40, 212, 'C3 (Python)', { size: 19, color: C.muted, anchor: 'start' });
  c3names.forEach((n, i) => {
    const x = 40 + i * 130;
    const good = n === 'C';
    s.rect(x, 224, 110, 44, { color: C.ink, fill: good ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x + 55, 252, n, { font: 'mono', size: 19 });
  });
  s.note(700, 92, 150, 60, ['naive: A.show', 'C is skipped'], { size: 18 });
  s.note(700, 214, 150, 60, ['C3: C.show', 'A comes last'], { size: 18 });
  s.text(440, 312, 'Naive order visits A before C, because A is the first base of B.', { size: 18, color: C.muted });
  save('10.2-dfs-vs-c3.svg', s);
}

// ---------------------------------------------------------------- 10.2-c3-merge.svg
{
  const s = new Sketch(880, 370, { title: 'C3 merge for D(B, C) in four steps: take the first head that is in no tail', seed: 1023 });
  s.text(440, 34, 'C3 merge for class D(B, C)', { size: 26, weight: 700 });
  const steps = [
    { title: 'step 1', lists: ['B A object', 'C A object', 'B C'], take: 'take B', col: C.greenSoft },
    { title: 'step 2', lists: ['A object', 'C A object', 'C'], take: 'take C', col: C.greenSoft, note: 'A is blocked: in a tail' },
    { title: 'step 3', lists: ['A object', 'A object'], take: 'take A', col: C.greenSoft },
    { title: 'step 4', lists: ['object', 'object'], take: 'take object', col: C.greenSoft },
  ];
  steps.forEach((st, i) => {
    const x = 30 + i * 212;
    s.rect(x, 62, 200, 252, { color: C.muted, width: 1.2 });
    s.text(x + 100, 96, st.title, { size: 21, weight: 700 });
    s.text(x + 100, 124, 'lists', { size: 17, color: C.muted });
    st.lists.forEach((l, j) => s.text(x + 100, 150 + j * 26, l, { font: 'mono', size: 15 }));
    s.rect(x + 30, 240, 140, 40, { color: C.ink, fill: st.col, fillStyle: 'solid' });
    s.text(x + 100, 266, st.take, { font: 'mono', size: 16 });
    if (st.note) s.text(x + 100, 302, st.note, { size: 17, color: C.rose });
  });
  s.text(440, 348, 'Result: D + [B, C, A, object] = D, B, C, A, object', { font: 'mono', size: 18 });
  save('10.2-c3-merge.svg', s);
}

// ---------------------------------------------------------------- 10.2-inconsistent.svg
{
  const s = new Sketch(880, 320, { title: 'Inconsistent bases: X(A, B) asks for A before B, but B subclasses A so its MRO needs B before A', seed: 1024 });
  s.text(440, 34, 'Why class X(A, B) is rejected', { size: 26, weight: 700 });
  s.rect(50, 90, 310, 100, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(205, 122, 'Rule 1: keep the bases order', { size: 19, weight: 700 });
  s.text(205, 160, 'X lists A before B', { font: 'mono', size: 18 });
  s.rect(520, 90, 310, 100, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(675, 122, 'Rule 2: keep each base MRO', { size: 19, weight: 700 });
  s.text(675, 160, 'B(A) has B before A', { font: 'mono', size: 18 });
  s.line(360, 140, 520, 140, { color: C.rose, width: 2.4, dash: '6 8' });
  s.text(440, 128, 'clash', { size: 22, color: C.rose, weight: 700 });
  s.note(190, 226, 500, 66, ['no order can satisfy both rules,', 'so CPython raises TypeError'], { size: 19 });
  save('10.2-inconsistent.svg', s);
}

// ---------------------------------------------------------------- 10.2-random-counts.svg
{
  const s = new Sketch(880, 344, { title: 'Bar chart of 500 random hierarchies: C3 matches CPython in all 315 accepted cases; naive depth-first disagrees in 293', seed: 1025 });
  s.text(440, 34, '500 random hierarchies, checked against CPython', { size: 26, weight: 700 });
  const rows = [
    ['attempts', 500, C.muted, C.blueSoft, '500'],
    ['accepted by CPython', 315, C.blue, C.blueSoft, '315'],
    ['rejected by CPython and C3', 185, C.rose, C.roseSoft, '185'],
    ['C3 result = __mro__', 315, C.green, C.greenSoft, '315 of 315'],
    ['naive DFS differs from C3', 293, C.amber, C.amberSoft, '293 of 315'],
  ];
  rows.forEach(([label, n, col, soft, val], i) => {
    const y = 70 + i * 46;
    s.text(40, y + 25, label, { size: 18, anchor: 'start' });
    s.rect(330, y, n, 34, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(330 + n + 12, y + 24, val, { font: 'mono', size: 17, anchor: 'start' });
  });
  s.text(440, 326, 'Random class bases drawn from earlier accepted classes; seed 10.', { size: 17, color: C.muted });
  save('10.2-random-counts.svg', s);
}
