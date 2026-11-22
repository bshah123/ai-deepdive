// Diagrams for lesson 2.9. Numbers are the outputs of the lesson's code blocks (CPython 3.12.13)
// and of scripts/diagrams/lessons/2.9_experiment.py (gc_refs walk-through). Re-run both if they change.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Two objects, names gone, each still referenced by the other.
{
  const s = new Sketch(880, 300, { title: 'Two Node objects point at each other after both names are deleted', seed: 901 });
  s.text(440, 40, 'Dropping the names does not drop the objects', { size: 24, weight: 700 });
  s.text(225, 96, 'del a', { size: 18, color: C.rose });
  s.text(655, 96, 'del b', { size: 18, color: C.rose });
  s.rect(150, 116, 150, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(225, 150, 'Node a', { font: 'mono', size: 18 });
  s.text(225, 166, 'refcount 1', { font: 'mono', size: 15, color: C.muted });
  s.rect(580, 116, 150, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(655, 150, 'Node b', { font: 'mono', size: 18 });
  s.text(655, 166, 'refcount 1', { font: 'mono', size: 15, color: C.muted });
  s.arrow(302, 134, 578, 134, { color: C.ink });
  s.text(440, 124, 'a.other', { font: 'mono', size: 16 });
  s.arrow(578, 160, 302, 160, { color: C.ink });
  s.text(440, 184, 'b.other', { font: 'mono', size: 16 });
  s.note(170, 220, 540, 56, ['still alive: each has one reference,', 'and it comes from its partner'], { size: 18 });
  save('2.9-cycle-after-del.svg', s);
}

// 2. Worked example: gc_refs = refcount - internal references (numbers from experiment section 3).
{
  const s = new Sketch(880, 340, { title: 'gc_refs worked example for the two-node cycle', seed: 902 });
  s.text(440, 40, 'Same cycle, two moments: what the collector sees', { size: 24, weight: 700 });
  s.rect(40, 70, 380, 170, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(230, 104, 'while names a and b exist', { size: 20, weight: 700 });
  s.text(70, 146, ['refcount   = 2   (name + partner)', 'internal   = 1   (partner)', 'gc_refs    = 1   > 0: reachable'], { font: 'mono', size: 17, anchor: 'start' });
  s.rect(460, 70, 380, 170, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(650, 104, 'after del a and del b', { size: 20, weight: 700 });
  s.text(490, 146, ['refcount   = 1   (partner only)', 'internal   = 1   (partner)', 'gc_refs    = 0   unreachable'], { font: 'mono', size: 17, anchor: 'start' });
  s.arrow(425, 150, 455, 150, { color: C.muted });
  s.text(440, 278, 'gc.collect() frees both objects when gc_refs is 0 for every member', { size: 18, color: C.ink });
  save('2.9-gc-refs-worked.svg', s);
}

// 3. Strong back-pointer makes a cycle; a weakref back-pointer does not (experiment section 4).
{
  const s = new Sketch(880, 340, { title: 'A strong parent pointer makes a cycle, a weakref does not', seed: 903 });
  s.text(440, 40, 'Strong parent pointer vs weakref parent pointer', { size: 24, weight: 700 });
  s.text(230, 92, 'strong back-pointer', { size: 20, weight: 700, color: C.rose });
  s.rect(100, 120, 130, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(165, 152, 'root', { font: 'mono', size: 18 });
  s.rect(300, 120, 130, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(365, 152, 'leaf', { font: 'mono', size: 18 });
  s.arrow(232, 136, 298, 136, { color: C.ink });
  s.text(265, 124, 'children', { size: 15 });
  s.arrow(298, 160, 232, 160, { color: C.rose });
  s.text(265, 184, 'parent', { size: 15, color: C.rose });
  s.note(60, 230, 380, 70, ['both counts stay above 0 after del,', 'so only gc.collect() can free them'], { size: 18 });
  s.text(650, 92, 'weakref back-pointer', { size: 20, weight: 700, color: C.green });
  s.rect(500, 120, 130, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(565, 152, 'root', { font: 'mono', size: 18 });
  s.rect(700, 120, 130, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(765, 152, 'leaf', { font: 'mono', size: 18 });
  s.arrow(632, 136, 698, 136, { color: C.ink });
  s.text(665, 124, 'children', { size: 15 });
  s.arrow(698, 160, 632, 160, { color: C.muted, dash: '6 8' });
  s.text(665, 184, 'weakref', { size: 15, color: C.muted });
  s.note(480, 230, 360, 70, ['del root: freed at once, leaf.parent is None,', 'gc.collect() returned 0'], { size: 18 });
  save('2.9-strong-vs-weakref.svg', s);
}

// 4. Bytes still held after 10,000 pairs (experiment section 6, tracemalloc).
{
  const s = new Sketch(880, 340, { title: 'Bytes held after 10,000 pairs, by GC setting', seed: 904 });
  s.text(440, 40, 'Memory still held after 10,000 pairs are dropped', { size: 24, weight: 700 });
  const base = 292, scale = 200 / 1600104; // px per byte; tallest bar is 200 px
  const bars = [
    { x: 150, v: 104, label: '104 B', name: ['acyclic pairs', 'gc off'], color: C.green, soft: C.greenSoft },
    { x: 390, v: 1600104, label: '1,600,104 B', name: ['cycles', 'gc off'], color: C.rose, soft: C.roseSoft },
    { x: 630, v: 31944, label: '31,944 B', name: ['cycles', 'gc on'], color: C.blue, soft: C.blueSoft },
  ];
  for (const b of bars) {
    const h = Math.max(b.v * scale, 2);
    s.rect(b.x, base - h, 140, h, { color: b.color, fill: b.soft, fillStyle: 'solid' });
    s.text(b.x + 70, base - h - 12, b.label, { font: 'mono', size: 16 });
    s.text(b.x + 70, base + 26, b.name, { size: 16 });
  }
  s.line(120, base, 780, base, { color: C.muted });
  save('2.9-held-bytes.svg', s);
}
