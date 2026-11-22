import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-03-numbers-strings-booleans/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number and output below comes from scripts/diagrams/lessons/3.4_data.py (run on Python 3.12.13, numpy 2.5.5).

// 1. bool is a subclass of int; True and False are shared objects
{
  const s = new Sketch(880, 400, { title: 'bool is a subclass of int; True and False are single shared objects', seed: 401 });
  s.text(440, 34, 'bool is an int, and True and False are shared', { size: 26, weight: 700 });
  s.rect(60, 70, 200, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(160, 98, 'object', { font: 'mono', size: 19 });
  s.rect(60, 160, 200, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(160, 188, 'int', { font: 'mono', size: 19 });
  s.rect(60, 250, 200, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(160, 278, 'bool', { font: 'mono', size: 19 });
  s.arrow(160, 248, 160, 208, { color: C.muted });
  s.arrow(160, 158, 160, 118, { color: C.muted });
  s.text(178, 232, 'subclass of', { size: 16, color: C.muted, anchor: 'start' });
  s.text(178, 142, 'subclass of', { size: 16, color: C.muted, anchor: 'start' });
  s.text(560, 72, 'calls return shared objects', { size: 19, color: C.muted });
  s.rect(400, 90, 170, 44, { color: C.ink, fillStyle: 'hachure' });
  s.text(485, 118, 'bool(7)', { font: 'mono', size: 18 });
  s.arrow(574, 112, 636, 112, { color: C.muted });
  s.rect(640, 90, 170, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(725, 118, 'True', { font: 'mono', size: 20 });
  s.text(605, 168, 'same object', { size: 16, color: C.muted });
  s.rect(400, 180, 170, 44, { color: C.ink, fillStyle: 'hachure' });
  s.text(485, 208, 'bool(0)', { font: 'mono', size: 18 });
  s.arrow(574, 202, 636, 202, { color: C.muted });
  s.rect(640, 180, 170, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(725, 208, 'False', { font: 'mono', size: 20 });
  s.note(400, 262, 440, 110, ['True + True == 2: arithmetic works', 'class MyBool(bool): TypeError', 'bool(7) is True: one object, reused'], { size: 18 });
  save('3.4-bool-is-int.svg', s);
}

// 2. Decision order inside bool(x)
{
  const s = new Sketch(880, 400, { title: 'Decision order for bool(x): __bool__, then __len__, then True', seed: 402 });
  s.text(440, 34, 'Where bool(x) gets its answer', { size: 26, weight: 700 });
  s.rect(40, 70, 170, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(125, 98, 'bool(x)', { font: 'mono', size: 18 });
  s.arrow(210, 92, 256, 92, { color: C.muted });
  s.rect(260, 70, 320, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(420, 98, 'x defines __bool__?', { size: 19 });
  s.arrow(580, 92, 616, 92, { color: C.muted });
  s.text(598, 84, 'yes', { size: 16, color: C.muted });
  s.rect(620, 70, 220, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(730, 98, 'return __bool__()', { font: 'mono', size: 17 });
  s.arrow(420, 114, 420, 156, { color: C.muted });
  s.text(438, 140, 'no', { size: 16, color: C.muted, anchor: 'start' });
  s.rect(260, 160, 320, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(420, 188, 'x defines __len__?', { size: 19 });
  s.arrow(580, 182, 616, 182, { color: C.muted });
  s.text(598, 174, 'yes', { size: 16, color: C.muted });
  s.rect(620, 160, 220, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(730, 188, 'return len(x) != 0', { font: 'mono', size: 17 });
  s.arrow(420, 204, 420, 246, { color: C.muted });
  s.text(438, 230, 'no', { size: 16, color: C.muted, anchor: 'start' });
  s.rect(260, 250, 320, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(420, 278, 'return True', { font: 'mono', size: 18 });
  s.note(60, 318, 760, 66, ['A __bool__ that returns 0 instead of False raises TypeError.', 'A class with neither method is always true.'], { size: 18 });
  save('3.4-bool-protocol.svg', s);
}

// 3. Which values are false (and the surprising truthy ones)
{
  const s = new Sketch(880, 430, { title: 'The fifteen falsy built-in values, and seven surprising truthy ones', seed: 403 });
  s.text(440, 34, 'Few values are false; the surprises are truthy', { size: 24, weight: 700 });
  s.text(255, 84, 'bool(x) is False: 15 values', { size: 19, weight: 700, color: C.blue });
  s.text(605, 84, 'bool(x) is True, but it looks empty or zero', { size: 17, weight: 700, color: C.rose });
  const falsy = ['0', '0.0', '-0.0', '0j', "''", '[]', '()', '{}', 'set()', 'range(0)', 'None', 'False', 'Decimal(0)', 'Fraction(0)', "b''"];
  falsy.forEach((item, i) => {
    const x = 40 + (i % 3) * 150, y = 110 + Math.floor(i / 3) * 44;
    s.rect(x, y, 130, 34, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 65, y + 23, item, { font: 'mono', size: 16 });
  });
  const truthy = ['nan', "'0'", "' '", "'False'", '[0]', '[None]', 'range(1)'];
  truthy.forEach((item, i) => {
    const x = 520 + (i % 2) * 170, y = 110 + Math.floor(i / 2) * 44;
    s.rect(x, y, 150, 34, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(x + 75, y + 23, item, { font: 'mono', size: 16 });
  });
  s.note(60, 340, 760, 70, ['nan is not zero; "False" and "0" are non-empty strings;', '[0] and [None] are lists with one item, so they are true.'], { size: 18 });
  save('3.4-truth-table.svg', s);
}

// 4. and / or return an operand
{
  const s = new Sketch(880, 440, { title: 'and and or return one of their operands; not returns a bool', seed: 404 });
  s.text(440, 34, 'and / or return an operand, not a forced bool', { size: 24, weight: 700 });
  const rows = [
    ["'' or 'guest'", "'' is false: move on", "'guest'"],
    ["'Ada' or 'guest'", "'Ada' is true: stop", "'Ada'"],
    ["0 and 'x'", "0 is false: stop", '0'],
    ['not []', 'always makes a bool', 'True'],
  ];
  rows.forEach(([expr, step, result], i) => {
    const c = 110 + i * 70;
    s.text(40, c + 7, expr, { font: 'mono', size: 19, anchor: 'start' });
    s.arrow(246, c, 286, c, { color: C.muted });
    s.rect(290, c - 28, 250, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(415, c + 6, step, { size: 18 });
    s.arrow(544, c, 580, c, { color: C.muted });
    s.rect(584, c - 28, 240, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(704, c + 8, result, { font: 'mono', size: 22 });
  });
  s.note(100, 365, 680, 60, ['and and or return one of their operands. not always returns a bool.', 'Short-circuit: in False and f(), f is never called (0 calls measured).'], { size: 18 });
  save('3.4-and-or.svg', s);
}

// 5. == True versus truth testing
{
  const s = new Sketch(880, 445, { title: 'x == True disagrees with bool(x) for five of seven values', seed: 405 });
  s.text(440, 34, 'x == True and bool(x) disagree', { size: 26, weight: 700 });
  const cols = { x: 130, b: 330, eq: 540, is: 740 };
  s.text(cols.x, 88, 'x', { size: 19, weight: 700 });
  s.text(cols.b, 88, 'bool(x)', { size: 19, weight: 700 });
  s.text(cols.eq, 88, 'x == True', { size: 19, weight: 700 });
  s.text(cols.is, 88, 'x is True', { size: 19, weight: 700 });
  s.line(60, 104, 820, 104, { color: C.muted, width: 1.2 });
  const data = [
    ['0', false, false, false, false],
    ['1', true, true, false, false],
    ['2', true, false, false, true],
    ['-1', true, false, false, true],
    ['0.5', true, false, false, true],
    ["'a'", true, false, false, true],
    ['[1]', true, false, false, true],
  ];
  data.forEach(([v, b, eq, is, mismatch], i) => {
    const cy = 150 + i * 44;
    s.text(cols.x, cy + 6, v, { font: 'mono', size: 19 });
    s.text(cols.b, cy + 6, b ? 'True' : 'False', { font: 'mono', size: 19 });
    if (mismatch) s.rect(cols.eq - 60, cy - 18, 120, 36, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(cols.eq, cy + 6, eq ? 'True' : 'False', { font: 'mono', size: 19 });
    s.text(cols.is, cy + 6, is ? 'True' : 'False', { font: 'mono', size: 19 });
  });
  save('3.4-eq-vs-truth.svg', s);
}
