import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers printed on these diagrams come from scripts/diagrams/lessons/4.5_data.py (CPython 3.12.13, arm64 macOS; one run, best of 3)
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-04-lists/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. list.pop(0): the tail is memmoved one slot left
{
  const s = new Sketch(880, 320, { title: 'list.pop(0) shifts every remaining pointer one slot left', seed: 451 });
  s.text(440, 34, 'list.pop(0) moves every remaining pointer one slot left', { size: 24, weight: 700 });
  s.text(40, 108, 'before', { size: 20, anchor: 'start' });
  s.text(40, 232, 'after', { size: 20, anchor: 'start' });
  const before = [1, 2, 3, 4];
  before.forEach((v, i) => {
    const x = 200 + i * 100;
    s.rect(x, 80, 90, 44, { color: i === 0 ? C.rose : C.blue, fill: i === 0 ? C.roseSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x + 45, 80 + 22 + 7, String(v), { font: 'mono', size: 20, weight: 700 });
  });
  [2, 3, 4].forEach((v, i) => {
    const x = 200 + i * 100;
    s.rect(x, 200, 90, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 45, 200 + 22 + 7, String(v), { font: 'mono', size: 20, weight: 700 });
  });
  s.rect(500, 200, 90, 44, { color: C.muted, dash: '6 8' });
  for (let i = 1; i <= 3; i++) {
    s.arrow(200 + i * 100 + 45, 128, 200 + (i - 1) * 100 + 45, 194, { color: C.rose, width: 3 });
  }
  s.text(245, 68, 'pop(0) returns 1', { size: 18, color: C.rose });
  s.note(600, 186, 250, 70, ['3 pointers moved', 'pop from the end: 0'], { size: 19 });
  s.text(440, 300, 'the list stays one contiguous array, so the shift is unavoidable', { size: 18, color: C.muted });
  save('4.5-list-shift.svg', s);
}

// 2. collections.deque: linked blocks, popleft moves an index
{
  const s = new Sketch(880, 340, { title: 'A deque is a chain of blocks; popleft advances an index', seed: 452 });
  s.text(440, 34, 'A deque is a chain of blocks; popleft moves an index', { size: 24, weight: 700 });
  const blocks = [
    { x: 60, vals: [null, 2, 3, 4], label: 'block A' },
    { x: 330, vals: [5, 6, 7, 8], label: 'block B' },
    { x: 600, vals: [9, null, null, null], label: 'block C' },
  ];
  blocks.forEach((b, bi) => {
    s.text(b.x + 112, 104, b.label, { font: 'mono', size: 17, color: C.muted });
    b.vals.forEach((v, i) => {
      const x = b.x + i * 56;
      if (v === null) {
        s.rect(x, 120, 52, 48, { color: C.muted, dash: '6 8' });
      } else {
        s.rect(x, 120, 52, 48, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
        s.text(x + 26, 120 + 24 + 7, String(v), { font: 'mono', size: 20, weight: 700 });
      }
    });
    if (bi < 2) s.arrow(b.x + 224 + 3, 144, b.x + 224 + 24, 144, { color: C.muted });
  });
  s.arrow(60 + 56 + 26, 262, 60 + 56 + 26, 172, { color: C.rose, width: 3 });
  s.text(60 + 56 + 26, 292, 'leftindex: popleft reads here', { size: 18, color: C.rose });
  s.arrow(600 + 26, 262, 600 + 26, 172, { color: C.blue, width: 3 });
  s.text(600 + 26, 292, 'rightindex: append writes here', { size: 18, color: C.blue });
  s.text(440, 320, 'the removed 1 leaves an empty slot; no pointer moves', { size: 18, color: C.muted });
  save('4.5-deque-blocks.svg', s);
}

// 3. Draining a queue from the front: measured times, log scale
{
  const s = new Sketch(880, 440, { title: 'Measured drain time versus queue length, log scale', seed: 453 });
  s.text(440, 34, 'Draining n items from the front: time per run (log scale)', { size: 24, weight: 700 });
  const yOf = (sec) => 370 - (Math.log10(sec) + 6) * 40; // 1e-6 s at y=370, 10 s at y=90
  const ticks = [[1e-6, '1 µs'], [1e-5, '10 µs'], [1e-4, '100 µs'], [1e-3, '1 ms'], [1e-2, '10 ms'], [1e-1, '100 ms'], [1, '1 s'], [10, '10 s']];
  ticks.forEach(([v, lab]) => {
    const y = yOf(v);
    s.line(130, y, 800, y, { color: C.muted, width: 1, dash: '4 8' });
    s.text(118, y + 6, lab, { font: 'mono', size: 15, anchor: 'end', color: C.muted });
  });
  const xs = [160, 300, 440, 580, 720];
  const ns = ['1,000', '3,000', '10,000', '30,000', '100,000'];
  xs.forEach((x, i) => s.text(x, 398, ns[i], { font: 'mono', size: 16, color: C.muted }));
  s.text(440, 426, 'n (items drained)', { size: 18, color: C.muted });
  const listSec = [9.558e-5, 6.712e-4, 7.147e-3, 9.066e-2, 1.1150];
  const dequeSec = [1.629e-5, 5.058e-5, 1.703e-4, 4.940e-4, 1.6459e-3];
  const listLab = ['96 µs', '671 µs', '7.1 ms', '91 ms', '1.12 s'];
  const dequeLab = ['16 µs', '51 µs', '170 µs', '494 µs', '1.65 ms'];
  for (let i = 0; i < 4; i++) {
    s.line(xs[i], yOf(listSec[i]), xs[i + 1], yOf(listSec[i + 1]), { color: C.rose, width: 3 });
    s.line(xs[i], yOf(dequeSec[i]), xs[i + 1], yOf(dequeSec[i + 1]), { color: C.blue, width: 3 });
  }
  xs.forEach((x, i) => {
    s.circle(x, yOf(listSec[i]), 12, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.circle(x, yOf(dequeSec[i]), 12, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x, yOf(listSec[i]) - 16, listLab[i], { font: 'mono', size: 15, color: C.rose });
    s.text(x, yOf(dequeSec[i]) + 30, dequeLab[i], { font: 'mono', size: 15, color: C.blue });
  });
  s.rect(560, 58, 14, 14, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(582, 72, 'list.pop(0)', { font: 'mono', size: 17, anchor: 'start' });
  s.rect(700, 58, 14, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(722, 72, 'deque.popleft()', { font: 'mono', size: 17, anchor: 'start' });
  save('4.5-drain-times.svg', s);
}

// 4. Indexing in the middle costs a block walk on a deque
{
  const s = new Sketch(880, 260, { title: 'Index access: list[mid] versus deque[mid] and deque[0]', seed: 454 });
  s.text(440, 34, 'Indexing: a deque is fast at the ends, slow in the middle', { size: 24, weight: 700 });
  const rows = [
    { y: 84, label: 'list[50000]', ns: 30.1, txt: '30 ns', col: C.blue, soft: C.blueSoft },
    { y: 144, label: 'deque[0]', ns: 33.4, txt: '33 ns', col: C.green, soft: C.greenSoft },
    { y: 204, label: 'deque[50000]', ns: 4296, txt: '4,296 ns', col: C.rose, soft: C.roseSoft },
  ];
  rows.forEach((r) => {
    s.text(40, r.y + 22, r.label, { font: 'mono', size: 19, anchor: 'start' });
    const w = Math.max(r.ns * 0.1, 3);
    s.rect(250, r.y, w, 36, { color: r.col, fill: r.soft, fillStyle: 'solid' });
    s.text(250 + w + 12, r.y + 22, r.txt, { font: 'mono', size: 18, anchor: 'start', color: r.col });
  });
  save('4.5-index-cost.svg', s);
}
