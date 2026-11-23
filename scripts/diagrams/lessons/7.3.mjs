import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-07-functions-call-stack/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '7.3_data.json'), 'utf8')); // every number comes from 7.3_experiment.py

// 1. One function object, two names; a lambda is the same kind of object.
{
  const s = new Sketch(880, 330, { title: 'A function is an object. Two names point to one object; a lambda is another object with the name <lambda>', seed: 301 });
  s.text(440, 34, 'A function is an object', { size: 26, weight: 700 });
  s.rect(40, 80, 120, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(100, 106, 'square', { font: 'mono', size: 18 });
  s.rect(40, 140, 120, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(100, 166, 'alias', { font: 'mono', size: 18 });
  s.rect(300, 70, 330, 110, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(465, 100, 'function object', { size: 21, weight: 700 });
  s.text(465, 132, `__name__ = '${D.name_def}'`, { font: 'mono', size: 16 });
  s.text(465, 158, `type: ${D.type_of_def}`, { font: 'mono', size: 16 });
  s.arrow(160, 100, 300, 105, { color: C.muted });
  s.arrow(160, 160, 300, 150, { color: C.muted });
  s.rect(40, 230, 240, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(160, 258, 'lambda x: x * x', { font: 'mono', size: 17 });
  s.arrow(280, 252, 300, 262, { color: C.muted });
  s.rect(300, 225, 330, 80, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(465, 250, 'function object', { size: 21, weight: 700 });
  s.text(465, 284, `__name__ = '${D.name_lambda}'`, { font: 'mono', size: 16 });
  s.note(680, 70, 170, 90, ['no name', 'in the source,', 'so Python', 'shows <lambda>'], { size: 17 });
  save('7.3-function-object.svg', s);
}

// 2. A closure: the returned function keeps its captured variable in a cell.
{
  const s = new Sketch(880, 300, { title: 'A closure keeps the captured variable alive after its factory returns', seed: 302 });
  s.text(440, 34, 'A closure keeps its variable in a cell', { size: 26, weight: 700 });
  s.rect(40, 115, 170, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(125, 146, 'double', { font: 'mono', size: 18 });
  s.rect(300, 95, 290, 110, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(445, 125, 'multiplier_function', { size: 21, weight: 700 });
  s.text(445, 160, 'body: x * multiplier', { font: 'mono', size: 16 });
  s.text(445, 186, 'free variable: multiplier', { font: 'mono', size: 15, color: C.muted });
  s.rect(660, 105, 180, 90, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(750, 132, 'cell', { size: 20, weight: 700 });
  s.text(750, 166, `multiplier = ${D.closure_cell_value}`, { font: 'mono', size: 17 });
  s.arrow(210, 140, 300, 140, { color: C.muted });
  s.arrow(590, 150, 660, 150, { color: C.muted });
  s.text(625, 140, '__closure__', { font: 'mono', size: 14, color: C.muted });
  s.text(440, 250, `double(5) reads the cell: 5 * ${D.closure_cell_value} = ${D.double_5}`, { size: 21 });
  save('7.3-closure.svg', s);
}

// 3. Late binding: the lambdas share one cell; default arguments give each its own value.
{
  const s = new Sketch(880, 360, { title: 'Late binding: three lambdas share one variable, then each gets its own value', seed: 303 });
  s.text(440, 34, 'Late binding and the default-argument fix', { size: 26, weight: 700 });
  s.text(220, 82, 'lambda: i   (shared cell)', { size: 19, weight: 700 });
  s.text(660, 82, 'lambda i=i: i   (own copy)', { size: 19, weight: 700 });
  const rowsA = [110, 160, 210];
  for (const y of rowsA) {
    s.rect(40, y, 130, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(105, y + 23, 'lambda', { font: 'mono', size: 15 });
    s.arrow(170, y + 18, 280, 160, { color: C.muted });
  }
  s.rect(280, 125, 130, 70, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(345, 155, 'i = 2', { font: 'mono', size: 18 });
  s.text(345, 180, 'after the loop', { size: 15, color: C.muted });
  s.text(220, 280, `output: ${JSON.stringify(D.late_binding_result)}`, { size: 20 });
  const rowsB = [110, 160, 210];
  const vals = [0, 1, 2];
  rowsB.forEach((y, k) => {
    s.rect(480, y, 130, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(545, y + 23, 'lambda', { font: 'mono', size: 15 });
    s.arrow(610, y + 18, 680, y + 18, { color: C.muted });
    s.rect(680, y - 4, 150, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(755, y + 23, `i = ${vals[k]}`, { font: 'mono', size: 17 });
  });
  s.text(660, 280, `output: ${JSON.stringify(D.default_arg_fix_result)}`, { size: 20 });
  save('7.3-late-binding.svg', s);
}

// 4. map returns an iterator: the second pass finds it empty, and no new calls happen.
{
  const s = new Sketch(880, 280, { title: 'map returns an iterator that can be consumed once', seed: 304 });
  s.text(440, 34, 'map() is an iterator: one pass, then empty', { size: 26, weight: 700 });
  s.rect(40, 100, 250, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(165, 128, 'data = [1, 2, 3, 4, 5]', { font: 'mono', size: 16 });
  s.text(165, 150, 'a list, reusable', { size: 15, color: C.muted });
  s.arrow(290, 130, 335, 130, { color: C.muted });
  s.rect(335, 100, 170, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(420, 128, 'map object', { font: 'mono', size: 16 });
  s.text(420, 150, 'square applied lazily', { size: 15, color: C.muted });
  s.arrow(505, 125, 560, 100, { color: C.muted });
  s.arrow(505, 135, 560, 185, { color: C.muted });
  s.rect(560, 72, 290, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(705, 96, `pass 1: ${JSON.stringify(D.map_pass_1)}`, { font: 'mono', size: 15 });
  s.text(705, 116, `square calls so far: ${D.calls_after_pass_1}`, { size: 16 });
  s.rect(560, 162, 290, 56, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(705, 186, `pass 2: ${JSON.stringify(D.map_pass_2)}`, { font: 'mono', size: 15 });
  s.text(705, 206, `square calls so far: ${D.calls_after_pass_2}`, { size: 16 });
  s.text(440, 258, 'The second list() gets nothing and the function is not called again.', { size: 19 });
  save('7.3-map-once.svg', s);
}

// 5. sorted(key=...) calls the key once per element; comparisons are a separate count.
{
  const s = new Sketch(880, 280, { title: 'Bars: key function calls versus comparisons while sorting 8 values', seed: 305 });
  s.text(440, 34, 'The key runs once per element, not once per comparison', { size: 25, weight: 700 });
  const scale = 28;
  s.text(40, 118, 'key function calls', { size: 20, anchor: 'start' });
  s.rect(260, 92, D.sort_key_calls * scale, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(260 + D.sort_key_calls * scale + 14, 122, `${D.sort_key_calls}`, { font: 'mono', size: 20, anchor: 'start', weight: 700 });
  s.text(40, 208, 'comparisons (<)', { size: 20, anchor: 'start' });
  s.rect(260, 182, D.sort_comparisons * scale, 46, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(260 + D.sort_comparisons * scale + 14, 212, `${D.sort_comparisons}`, { font: 'mono', size: 20, anchor: 'start', weight: 700 });
  s.text(440, 264, `n = ${D.sort_n} values, fixed input, CPython ${D.python} Timsort`, { size: 18, color: C.muted });
  save('7.3-sort-key-calls.svg', s);
}
console.log('wrote 5 diagrams to', OUT);
