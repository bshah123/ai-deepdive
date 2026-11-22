// Diagrams for 5.2 (tuple packing, unpacking, star unpacking, pattern matching).
// Run: node scripts/diagrams/lessons/5.2.mjs
// Every number comes from scripts/diagrams/lessons/5.2_data.py (run it to reprint them; CPython 3.12).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-05-tuples/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 5.2-pack-unpack.svg
{
  const s = new Sketch(880, 370, { title: 'Packing: the values 10 and 20 become one tuple object, which the name t refers to. Unpacking: x, y = t gives x the value 10 and y the value 20.', seed: 5201 });
  s.text(440, 34, 'Packing puts values in one object; unpacking spreads it out', { size: 24, weight: 700 });

  // the two values
  s.rect(40, 96, 110, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(95, 126, '10', { font: 'mono', size: 19 });
  s.rect(40, 164, 110, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(95, 194, '20', { font: 'mono', size: 19 });
  s.text(95, 232, 'two values', { size: 18, color: C.muted });

  // the tuple object
  s.arrow(150, 119, 330, 130, { color: C.muted, head: 9 });
  s.arrow(150, 187, 330, 158, { color: C.muted, head: 9 });
  s.rect(330, 110, 230, 66, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(445, 147, '(10, 20)', { font: 'mono', size: 19 });
  s.text(445, 98, 'one tuple object', { size: 18, color: C.muted });

  // the name t
  s.arrow(560, 143, 640, 143, { color: C.muted, head: 9 });
  s.rect(650, 120, 90, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(695, 150, 't', { font: 'mono', size: 19 });

  // unpacking: x, y = t
  s.arrow(400, 176, 425, 248, { color: C.muted, head: 9, dash: '6 8' });
  s.arrow(490, 176, 555, 248, { color: C.muted, head: 9, dash: '6 8' });
  s.text(340, 284, 'x, y = t', { font: 'mono', size: 17, anchor: 'end' });
  s.rect(370, 250, 110, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(425, 280, 'x = 10', { font: 'mono', size: 18 });
  s.rect(500, 250, 110, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(555, 280, 'y = 20', { font: 'mono', size: 18 });

  s.note(40, 318, 800, 40, ['The comma builds the tuple. Parentheses are optional, except for the empty tuple ().'], { size: 19 });
  save('5.2-pack-unpack.svg', s);
}

// ---------------------------------------------------------------- 5.2-swap-bytecode.svg
{
  // numbers: 5.2_data.py, CPython 3.12 dis output: temp_swap 6 ops, tuple_swap 4 ops, no BUILD_TUPLE in either statement
  const s = new Sketch(880, 340, { title: 'Bytecode of a swap. A temporary variable needs six instructions; a tuple swap needs four, and builds no tuple.', seed: 5202 });
  s.text(440, 34, 'Swapping a and b: the same job, fewer instructions', { size: 24, weight: 700 });

  const row = (y, label, ops, note) => {
    s.text(40, y + 28, label, { size: 21, weight: 700, anchor: 'start' });
    ops.forEach((op, i) => {
      const load = op.startsWith('LOAD');
      const x = 230 + i * 104;
      s.rect(x, y, 96, 52, { color: load ? C.blue : C.amber, fill: load ? C.blueSoft : C.amberSoft, fillStyle: 'solid' });
      s.text(x + 48, y + 33, op, { font: 'mono', size: 15 });
    });
    s.text(230, y + 84, note, { size: 19, anchor: 'start', color: C.ink });
  };

  row(90, 'temp variable', ['LOAD_FAST', 'STORE_FAST', 'LOAD_FAST', 'STORE_FAST', 'LOAD_FAST', 'STORE_FAST'],
    '6 instructions: tmp = a; a = b; b = tmp');
  row(200, 'tuple swap', ['LOAD_FAST', 'LOAD_FAST', 'STORE_FAST', 'STORE_FAST'],
    '4 instructions: a, b = b, a (no tuple built)');

  s.note(40, 296, 800, 36, ['Blue = load a value, amber = store into a name. CPython 3.12 disassembly.'], { size: 18 });
  save('5.2-swap-bytecode.svg', s);
}

// ---------------------------------------------------------------- 5.2-star-split.svg
{
  const s = new Sketch(880, 320, { title: 'first, *middle, last = range(6): first takes 0, middle takes the list [1, 2, 3, 4], last takes 5.', seed: 5203 });
  s.text(440, 34, 'first, *middle, last = range(6)', { size: 24, weight: 700, font: 'mono' });

  const vals = [0, 1, 2, 3, 4, 5];
  vals.forEach((v, i) => {
    const x = 140 + i * 100;
    const col = i === 0 ? C.blue : i === 5 ? C.green : C.amber;
    const soft = i === 0 ? C.blueSoft : i === 5 ? C.greenSoft : C.amberSoft;
    s.rect(x, 74, 100, 48, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 50, 104, String(v), { font: 'mono', size: 20 });
  });

  s.arrow(190, 128, 190, 180, { color: C.blue, head: 9 });
  s.arrow(390, 128, 390, 180, { color: C.amber, head: 9 });
  s.arrow(690, 128, 690, 180, { color: C.green, head: 9 });

  s.rect(110, 180, 160, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(190, 211, 'first = 0', { font: 'mono', size: 18 });
  s.rect(300, 180, 280, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 211, 'middle = [1, 2, 3, 4]', { font: 'mono', size: 18 });
  s.rect(610, 180, 160, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(690, 211, 'last = 5', { font: 'mono', size: 18 });

  s.note(40, 254, 800, 44, ['The starred name always gets a list, even when it gets zero or one items.'], { size: 19 });
  save('5.2-star-split.svg', s);
}

// ---------------------------------------------------------------- 5.2-match-order.svg
{
  const s = new Sketch(880, 340, { title: 'Case order: the input (5, 0) falls through a literal case to the x-axis case. With the sequence case first, the input (0, 0) stops there and the origin case is never reached.', seed: 5204 });
  s.text(440, 34, 'First match wins: the order of case blocks matters', { size: 24, weight: 700 });

  s.text(40, 76, 'A: literal (0, 0) first', { size: 20, weight: 700, anchor: 'start' });
  s.rect(40, 88, 200, 52, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(140, 119, 'case (0, 0)', { font: 'mono', size: 17 });
  s.arrow(240, 114, 292, 114, { color: C.muted, head: 9 });
  s.text(266, 104, 'no', { size: 18 });
  s.rect(292, 88, 200, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(392, 119, 'case (x, 0)', { font: 'mono', size: 17 });
  s.arrow(492, 114, 544, 114, { color: C.muted, head: 9 });
  s.text(518, 104, 'yes', { size: 18 });
  s.rect(544, 88, 296, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(692, 119, '"x-axis at 5"', { font: 'mono', size: 17 });

  s.text(40, 222, 'B: sequence case (x, y) first', { size: 20, weight: 700, anchor: 'start' });
  s.rect(40, 234, 200, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(140, 265, 'case (x, y)', { font: 'mono', size: 17 });
  s.arrow(240, 260, 292, 260, { color: C.muted, head: 9 });
  s.text(266, 250, 'yes', { size: 18 });
  s.rect(292, 234, 200, 52, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', dash: '6 8' });
  s.text(392, 265, 'case (0, 0)', { font: 'mono', size: 17 });
  s.text(392, 306, 'never reached', { size: 18, color: C.rose });
  s.arrow(492, 260, 544, 260, { color: C.muted, head: 9 });
  s.rect(544, 234, 296, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(692, 265, '"generic"', { font: 'mono', size: 17 });

  save('5.2-match-order.svg', s);
}
