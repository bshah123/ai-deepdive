// Diagrams for Lesson 5.3 (namedtuple vs typing.NamedTuple vs dataclass).
// Run: node scripts/diagrams/lessons/5.3.mjs
// Every number below comes from the experiment run for this lesson (Python 3.12.13,
// tracemalloc over 10,000 instances; the two int fields share one int object).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-05-tuples/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 1. where the fields live
{
  const s = new Sketch(880, 380, { title: 'Memory layout of namedtuple, dataclass and slots dataclass instances', seed: 5301 });
  s.text(440, 34, 'Where the fields live', { size: 26, weight: 700 });

  // namedtuple / NamedTuple: one object, fields in slots, no __dict__
  s.text(160, 84, 'namedtuple, NamedTuple', { size: 20, weight: 700, color: C.blue });
  s.rect(50, 100, 220, 190, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(160, 132, 'tuple object', { size: 17 });
  s.rect(75, 150, 170, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(160, 176, 'x  ->  1', { font: 'mono', size: 17 });
  s.rect(75, 200, 170, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(160, 226, 'y  ->  2', { font: 'mono', size: 17 });
  s.text(160, 268, 'no __dict__', { size: 17, color: C.muted });
  s.text(160, 318, '104.5 bytes', { size: 22, weight: 700 });

  // dataclass: object header plus a separate __dict__ holding the fields
  s.text(440, 84, 'dataclass, frozen dataclass', { size: 20, weight: 700, color: C.rose });
  s.rect(310, 100, 260, 110, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(440, 132, 'object header', { size: 17 });
  s.text(440, 176, 'pointer to __dict__', { size: 17 });
  s.arrow(440, 212, 440, 240, { color: C.ink });
  s.rect(310, 242, 260, 92, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(440, 272, '__dict__', { size: 17, color: C.muted });
  s.text(440, 304, "{'x': 1, 'y': 2}", { font: 'mono', size: 17 });
  s.text(440, 358, '120.8 bytes', { size: 22, weight: 700 });

  // slots dataclass: fields in slots, no __dict__
  s.text(720, 84, 'slots dataclass', { size: 20, weight: 700, color: C.green });
  s.rect(600, 100, 240, 190, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(720, 132, 'object', { size: 17 });
  s.rect(625, 150, 190, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(720, 176, 'x  ->  1', { font: 'mono', size: 17 });
  s.rect(625, 200, 190, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(720, 226, 'y  ->  2', { font: 'mono', size: 17 });
  s.text(720, 268, 'no __dict__', { size: 17, color: C.muted });
  s.text(720, 318, '88.5 bytes', { size: 22, weight: 700 });

  save('5.3-memory-layout.svg', s);
}

// ---------------------------------------------------------------- 2. bytes per instance
{
  const s = new Sketch(880, 410, { title: 'Bar chart of bytes per instance: slots dataclass is smallest, plain dataclass is largest', seed: 5302 });
  s.text(440, 34, 'Bytes per instance (two int fields)', { size: 26, weight: 700 });
  const rows = [
    ['plain tuple', 96.4, C.muted, C.note],
    ['namedtuple, NamedTuple', 104.5, C.blue, C.blueSoft],
    ['dataclass, frozen dataclass', 120.8, C.rose, C.roseSoft],
    ['slots dataclass, frozen slots', 88.5, C.green, C.greenSoft],
  ];
  const k = 4.2;                  // pixels per byte
  rows.forEach(([label, bytes, color, soft], i) => {
    const yc = 115 + i * 66;
    s.text(40, yc + 7, label, { size: 20, anchor: 'start' });
    const w = bytes * k;
    s.rect(270, yc - 24, w, 48, { color, fill: soft, fillStyle: 'solid' });
    s.text(270 + w - 12, yc + 7, `${bytes.toFixed(1)} B`, { font: 'mono', size: 18, anchor: 'end', weight: 700 });
  });
  s.text(40, 385, 'tracemalloc, Python 3.12.13, 10,000 instances; exact numbers vary by build.', { size: 17, color: C.muted, anchor: 'start' });
  save('5.3-bytes.svg', s);
}

// ---------------------------------------------------------------- 3. what a mutation raises
{
  const s = new Sketch(880, 500, { title: 'Table: the same attempt to change x on four types, with the exception each raises', seed: 5303 });
  s.text(440, 34, 'Same attempt, four types', { size: 26, weight: 700 });
  s.text(40, 84, 'type', { size: 18, weight: 700, anchor: 'start' });
  s.text(250, 84, 'attempt', { size: 18, weight: 700, anchor: 'start' });
  s.text(400, 84, 'what happens', { size: 18, weight: 700, anchor: 'start' });
  s.line(40, 98, 840, 98, { color: C.ink, width: 1.4 });
  const rows = [
    ['namedtuple', 'p.x = 10', ['AttributeError', "can't set attribute"], C.blue],
    ['namedtuple', 'p[0] = 10', ['TypeError', "'Point' object does not support item assignment"], C.blue],
    ['dataclass', 'p.x = 10', ['no error: p is now Point(x=10, y=2)'], C.rose],
    ['frozen dataclass', 'p.x = 10', ['FrozenInstanceError', "cannot assign to field 'x'"], C.green],
  ];
  rows.forEach(([type, attempt, lines, color], i) => {
    const yc = 150 + i * 78;
    s.text(40, yc, type, { size: 19, weight: 700, anchor: 'start', color });
    s.text(250, yc, attempt, { font: 'mono', size: 17, anchor: 'start' });
    s.text(400, yc - 10, lines, { font: 'mono', size: 15, anchor: 'start' });
    if (i < rows.length - 1) s.line(40, yc + 36, 840, yc + 36, { color: C.muted, width: 1, dash: '4 8' });
  });
  s.note(40, 440, 800, 46, ['FrozenInstanceError is a subclass of AttributeError, so except AttributeError catches it.'], { size: 17 });
  save('5.3-mutation.svg', s);
}

// ---------------------------------------------------------------- 4. feature grid
{
  const s = new Sketch(880, 430, { title: 'Grid of features for four record types: yes or no per cell', seed: 5304 });
  s.text(440, 34, 'What each type gives you', { size: 26, weight: 700 });
  const cols = [[470, ['namedtuple']], [580, ['NamedTuple']], [690, ['dataclass']], [800, ['frozen', 'dataclass']]];
  cols.forEach(([x, lines]) => s.text(x, 84, lines, { size: 18, weight: 700 }));
  s.line(40, 110, 850, 110, { color: C.ink, width: 1.4 });
  const feats = [
    ['unpack, index, == a tuple', ['yes', 'yes', 'no', 'no']],
    ['assign a field after creation', ['no', 'no', 'yes', 'no']],
    ['hashable (usable as dict key)', ['yes', 'yes', 'no', 'yes']],
    ['type annotations kept', ['no', 'yes', 'yes', 'yes']],
    ['default values for fields', ['yes', 'yes', 'yes', 'yes']],
  ];
  feats.forEach(([label, vals], r) => {
    const y = 152 + r * 52;
    s.text(40, y + 6, label, { size: 19, anchor: 'start' });
    vals.forEach((v, c) => {
      const x = cols[c][0];
      s.text(x, y + 6, v, { size: 19, weight: 700, color: v === 'yes' ? C.green : C.rose });
    });
  });
  s.line(40, 420, 850, 420, { color: C.muted, width: 1, dash: '4 8' });
  s.text(40, 452, 'Checked on Python 3.12.13 (experiment for this lesson), not copied from a table.', { size: 16, color: C.muted, anchor: 'start' });
  save('5.3-features.svg', s);
}

// ---------------------------------------------------------------- 5. decision flow
{
  const s = new Sketch(880, 480, { title: 'Decision flow: tuple behaviour, then annotations or immutability, then choose a type', seed: 5305 });
  s.text(440, 34, 'Which one to use', { size: 26, weight: 700 });
  // Q1
  s.rect(230, 60, 420, 80, { color: C.ink, fill: C.note, fillStyle: 'solid' });
  s.text(440, 92, ['Must it act like a tuple?', '(unpack, index, == a tuple)'], { size: 19 });
  // Q2 (left)
  s.arrow(340, 140, 240, 200, { color: C.muted });
  s.text(280, 160, 'yes', { size: 17, color: C.muted });
  s.rect(90, 200, 300, 80, { color: C.ink, fill: C.note, fillStyle: 'solid' });
  s.text(240, 232, ['Want type annotations that', 'mypy or pyright check?'], { size: 18 });
  s.arrow(200, 280, 150, 330, { color: C.muted });
  s.text(160, 306, 'yes', { size: 17, color: C.muted });
  s.arrow(280, 280, 330, 330, { color: C.muted });
  s.text(322, 306, 'no', { size: 17, color: C.muted });
  s.rect(60, 330, 180, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(150, 366, 'typing.NamedTuple', { font: 'mono', size: 16 });
  s.rect(250, 330, 160, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(330, 366, 'namedtuple', { font: 'mono', size: 16 });
  // Q3 (right)
  s.arrow(540, 140, 640, 200, { color: C.muted });
  s.text(600, 160, 'no', { size: 17, color: C.muted });
  s.rect(500, 200, 360, 80, { color: C.ink, fill: C.note, fillStyle: 'solid' });
  s.text(680, 232, ['Must instances be immutable', 'and hashable?'], { size: 18 });
  s.arrow(640, 280, 600, 330, { color: C.muted });
  s.text(606, 306, 'yes', { size: 17, color: C.muted });
  s.arrow(720, 280, 770, 330, { color: C.muted });
  s.text(752, 306, 'no', { size: 17, color: C.muted });
  s.rect(512, 330, 176, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(600, 366, 'frozen dataclass', { font: 'mono', size: 16 });
  s.rect(700, 330, 140, 60, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(770, 366, 'dataclass', { font: 'mono', size: 16 });
  s.note(40, 410, 800, 56, ['Any dataclass: add slots=True to drop its __dict__ (88.5 vs 120.8 bytes).'], { size: 17 });
  save('5.3-decide.svg', s);
}
