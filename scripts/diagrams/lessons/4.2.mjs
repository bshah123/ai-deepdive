// Diagrams for Lesson 4.2 (list comprehensions). Run: node scripts/diagrams/lessons/4.2.mjs
// Numbers: 4.2_data.json (written by 4.2_data.py on Python 3.12.13: bytecode op lists, LIST_APPEND oparg,
// per-call timings at n = 1,000,000). The worked example (n = 4) and the stack picture (x = 2) are the lesson's own code.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-04-lists/diagrams');
mkdirSync(OUT, { recursive: true });
const data = JSON.parse(readFileSync(join(HERE, '4.2_data.json'), 'utf8'));
const NOLIG = `<g style="font-variant-ligatures:none;font-feature-settings:'liga' 0,'calt' 0">`;
const save = (name, sk) => {
  sk.out.unshift(NOLIG);
  sk.out.push('</g>');
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- anatomy
{
  const s = new Sketch(880, 300, { title: 'A list comprehension has an expression, a for clause and an optional if clause', seed: 4201 });
  s.text(440, 40, 'One comprehension, three parts', { size: 26, weight: 700 });
  s.rect(50, 80, 230, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(165, 113, 'x * x', { font: 'mono', size: 22 });
  s.rect(320, 80, 260, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(450, 113, 'for x in range(n)', { font: 'mono', size: 22 });
  s.rect(620, 80, 220, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(730, 113, 'if x % 2 == 0', { font: 'mono', size: 22 });
  s.text(165, 170, ['expression: what each kept', 'item becomes'], { size: 18, color: C.muted });
  s.text(450, 170, ['loop: one pass per item', 'of the input'], { size: 18, color: C.muted });
  s.text(730, 170, ['filter: keep the item only', 'when this is True'], { size: 18, color: C.muted });
  s.arrow(280, 106, 318, 106, { color: C.muted, head: 9 });
  s.arrow(580, 106, 618, 106, { color: C.muted, head: 9 });
  s.note(40, 226, 800, 52, ['read left to right: for each item, test the if, then emit the expression'], { size: 20 });
  save('4.2-anatomy.svg', s);
}

// ---------------------------------------------------------------- per element
{
  const loopOps = data.loop_body_loop;
  const compOps = data.loop_body_comp;
  const loopHot = new Set(['LOAD_ATTR', 'CALL', 'POP_TOP']);
  const compHot = new Set(['LIST_APPEND']);
  const s = new Sketch(880, 480, { title: 'Bytecode executed per element: an explicit append loop runs 8 operations, the comprehension 5', seed: 4202 });
  s.text(440, 36, 'Bytecode run for each element', { size: 26, weight: 700 });
  s.text(230, 80, `for loop: ${data.ops_per_element_loop} steps`, { size: 22, weight: 700, color: C.amber });
  s.text(650, 80, `comprehension: ${data.ops_per_element_comp} steps`, { size: 22, weight: 700, color: C.green });
  const pitch = 40;
  loopOps.forEach((op, i) => {
    const y = 100 + i * pitch;
    const hot = loopHot.has(op);
    s.rect(50, y, 360, 30, { color: hot ? C.rose : C.muted, fill: hot ? C.roseSoft : undefined, fillStyle: 'solid' });
    s.text(230, y + 21, op, { font: 'mono', size: 16 });
  });
  compOps.forEach((op, i) => {
    const y = 100 + i * pitch;
    const hot = compHot.has(op);
    s.rect(470, y, 360, 30, { color: hot ? C.green : C.muted, fill: hot ? C.greenSoft : undefined, fillStyle: 'solid' });
    s.text(650, y + 21, op, { font: 'mono', size: 16 });
  });
  s.note(470, 340, 370, 92, ['Rose: the method call', '(LOAD_ATTR, CALL, POP_TOP)', 'Green: the single LIST_APPEND'], { size: 18 });
  s.text(440, 462, 'Counts from dis on Python 3.12, per loop iteration', { size: 16, color: C.muted });
  save('4.2-per-element.svg', s);
}

// ---------------------------------------------------------------- stack
{
  const s = new Sketch(880, 380, { title: 'LIST_APPEND 2 pops the value and appends it to the list, which stays two slots down the stack', seed: 4203 });
  s.text(440, 36, 'LIST_APPEND 2 on the value stack (x = 2)', { size: 26, weight: 700 });
  const cell = (x, y, label, color, fill) => {
    s.rect(x, y, 230, 50, { color, fill, fillStyle: 'solid' });
    s.text(x + 115, y + 32, label, { font: 'mono', size: 18 });
  };
  // before: list, iterator, value (top)
  s.text(165, 84, 'before', { size: 22, weight: 700 });
  cell(50, 250, 'list [0, 1]', C.blue, C.blueSoft);
  cell(50, 196, 'range_iterator', C.muted, undefined);
  cell(50, 142, 'value 4', C.green, C.greenSoft);
  s.text(165, 330, 'the stack grows upward', { size: 17, color: C.muted });
  s.arrow(290, 167, 470, 167, { color: C.muted, head: 12 });
  s.text(380, 150, 'pop', { size: 18 });
  // after
  s.text(600, 84, 'after', { size: 22, weight: 700 });
  cell(520, 250, 'list [0, 1, 4]', C.blue, C.blueSoft);
  cell(520, 196, 'range_iterator', C.muted, undefined);
  s.text(660, 330, 'the list stays under the iterator', { size: 17, color: C.muted });
  s.text(660, 150, 'value 4 is gone', { size: 18, color: C.muted });
  save('4.2-stack.svg', s);
}

// ---------------------------------------------------------------- worked trace
{
  const s = new Sketch(880, 300, { title: 'Four passes over range(4): x, x times x, and the list after each pass', seed: 4204 });
  s.text(440, 36, 'Worked trace: [x * x for x in range(4)]', { size: 26, weight: 700 });
  const rows = [
    { x: 0, sq: 0, list: '[0]' },
    { x: 1, sq: 1, list: '[0, 1]' },
    { x: 2, sq: 4, list: '[0, 1, 4]' },
    { x: 3, sq: 9, list: '[0, 1, 4, 9]' },
  ];
  rows.forEach((r, i) => {
    const x0 = 50 + i * 210;
    s.text(x0 + 90, 88, `pass ${i + 1}`, { size: 20, weight: 700 });
    s.rect(x0, 104, 180, 120, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x0 + 90, 140, `x = ${r.x}`, { font: 'mono', size: 18 });
    s.text(x0 + 90, 170, `x * x = ${r.sq}`, { font: 'mono', size: 18 });
    s.text(x0 + 90, 204, r.list, { font: 'mono', size: 18, weight: 700 });
    if (i < 3) s.arrow(x0 + 186, 164, x0 + 204, 164, { color: C.muted, head: 8 });
  });
  s.note(120, 246, 640, 40, ['each pass appends one value; the final list is returned'], { size: 19 });
  save('4.2-worked-trace.svg', s);
}

// ---------------------------------------------------------------- timing
{
  const t = data.timing_us['1000000'];
  const bars = [
    ['map(lambda) ', t.map_lambda, C.rose, C.roseSoft],
    ['for loop', t.loop, C.blue, C.blueSoft],
    ['for loop, append hoisted', t.loop_hoisted, C.amber, C.amberSoft],
    ['comprehension', t.comp, C.green, C.greenSoft],
  ];
  const s = new Sketch(880, 400, { title: 'Time per call for four ways to square 1,000,000 numbers, Python 3.12, one machine', seed: 4205 });
  s.text(440, 36, 'Time per call, n = 1,000,000 (ms)', { size: 26, weight: 700 });
  const scale = 500 / 60; // px per ms, longest bar 57 ms
  bars.forEach(([label, us, color, fill], i) => {
    const y = 80 + i * 68;
    const ms = us / 1000;
    s.text(40, y + 26, label, { size: 20, anchor: 'start' });
    s.rect(270, y, ms * scale, 42, { color, fill, fillStyle: 'solid' });
    s.text(270 + ms * scale + 14, y + 27, `${ms.toFixed(1)} ms`, { font: 'mono', size: 18, anchor: 'start' });
  });
  s.note(40, 358, 800, 34, ['Machine-specific: rerun 4.2_data.py to see your own numbers'], { size: 18 });
  save('4.2-timing.svg', s);
}
