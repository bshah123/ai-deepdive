import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-11-python-data-model/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. One syntax, one special method. Values from experiment A (Vector example).
{
  const s = new Sketch(880, 340, { title: 'Three syntaxes map to three special methods', seed: 1101 });
  s.text(440, 36, 'Each syntax calls a method on the type', { size: 24, weight: 700 });
  const rows = [
    ['v[1:]', '__getitem__(v, slice)', '[2.0, 3.0]'],
    ['len(v)', '__len__(v)', '3'],
    ['v(2.0)', '__call__(v, 2.0)', 'Vector([2.0, 4.0, 6.0])'],
  ];
  rows.forEach(([syntax, method, result], i) => {
    const y = 96 + i * 66;
    s.rect(30, y, 170, 44, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(115, y + 29, syntax, { font: 'mono', size: 18 });
    s.arrow(200, y + 22, 286, y + 22, { color: C.muted });
    s.rect(290, y, 240, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(410, y + 29, method, { font: 'mono', size: 15 });
    s.arrow(530, y + 22, 574, y + 22, { color: C.muted });
    s.text(586, y + 29, result, { font: 'mono', size: 15, anchor: 'start' });
  });
  s.text(440, 300, 'x[...] calls type(x).__getitem__(x, ...). The class defines the behaviour.', { size: 18 });
  save('11.1-dispatch.svg', s);
}

// 2. Iteration fallback: only __getitem__ defined. Values from experiment C.
{
  const s = new Sketch(880, 330, { title: 'for and list() fall back to __getitem__', seed: 1102 });
  s.text(440, 36, 'With only __getitem__, Python asks for 0, 1, 2, ... until IndexError', { size: 22, weight: 700 });
  const calls = [['__getitem__(0)', 'returns 0'], ['__getitem__(1)', 'returns 10'], ['__getitem__(2)', 'returns 20'], ['__getitem__(3)', 'raises IndexError']];
  calls.forEach(([call, outcome], i) => {
    const x = 60 + i * 190;
    const last = i === 3;
    s.rect(x, 90, 160, 54, { color: last ? C.rose : C.blue, fill: last ? C.roseSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x + 80, 124, call, { font: 'mono', size: 15 });
    s.text(x + 80, 176, outcome, { size: 18, color: last ? C.rose : C.ink });
    if (i < 3) s.arrow(x + 164, 117, x + 186, 117, { color: C.muted });
  });
  s.text(440, 250, 'The for loop stops at the IndexError, so the list is:', { size: 19 });
  s.rect(290, 268, 300, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 298, 'list(Trace(3)) = [0, 10, 20]', { font: 'mono', size: 16 });
  save('11.1-iter-fallback.svg', s);
}

// 3. len() return values. Values from experiment B (CPython 3.12).
{
  const s = new Sketch(880, 430, { title: 'What len() accepts from __len__', seed: 1103 });
  s.text(440, 36, 'len() accepts a non-negative integer and nothing else', { size: 24, weight: 700 });
  s.text(70, 84, '__len__ returns', { size: 18, weight: 700, anchor: 'start' });
  s.text(300, 84, 'len() gives', { size: 18, weight: 700, anchor: 'start' });
  s.text(480, 84, 'outcome', { size: 18, weight: 700, anchor: 'start' });
  const rows = [
    ['3', '3', 'accepted', true],
    ['0', '0', 'accepted', true],
    ['True', '1', 'accepted (bool is an int)', true],
    ['3.0', '-', 'TypeError', false],
    ['-1', '-', 'ValueError', false],
    ['None', '-', 'TypeError', false],
    ["'3'", '-', 'TypeError', false],
  ];
  rows.forEach(([ret, got, outcome, ok], i) => {
    const y = 130 + i * 40;
    s.rect(50, y - 22, 780, 36, { color: ok ? C.green : C.rose, fill: ok ? C.greenSoft : C.roseSoft, fillStyle: 'solid', width: 1 });
    s.text(70, y + 4, ret, { font: 'mono', size: 17, anchor: 'start' });
    s.text(300, y + 4, got, { font: 'mono', size: 17, anchor: 'start' });
    s.text(480, y + 4, outcome, { size: 18, anchor: 'start' });
  });
  s.text(440, 402, 'Docs require an integer >= 0. Exception types observed on CPython 3.12.', { size: 17 });
  save('11.1-len-returns.svg', s);
}

// 4. Special-method lookup skips the instance dict. Values from experiment E.
{
  const s = new Sketch(880, 360, { title: 'Special methods are looked up on the type', seed: 1104 });
  s.text(440, 36, 'The instance attribute is ignored by len()', { size: 24, weight: 700 });
  s.rect(60, 70, 300, 120, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(210, 102, 'instance dict of b', { size: 19 });
  s.text(210, 150, '__len__ = lambda: 99', { font: 'mono', size: 16 });
  s.rect(520, 70, 300, 120, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(670, 102, 'class Box (the type)', { size: 19 });
  s.text(670, 150, 'def __len__: return 3', { font: 'mono', size: 16 });
  s.rect(60, 262, 300, 44, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(210, 290, 'b.__len__()  ->  99', { font: 'mono', size: 16 });
  s.arrow(210, 258, 210, 196, { color: C.muted });
  s.rect(520, 262, 300, 44, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(670, 290, 'len(b)  ->  3', { font: 'mono', size: 16 });
  s.arrow(670, 258, 670, 196, { color: C.muted });
  s.text(440, 340, 'Explicit attribute access sees the instance; the implicit call goes to the type.', { size: 17 });
  save('11.1-instance-shadow.svg', s);
}
