import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-02-scientific-python/chapter-18-autograd/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers printed by the lesson's code block (run once, output recorded in the lesson).
const GRAPH = { a: 4, b: 2, c: 1, d: 1, e: 1 }; // gradients after backward on e = relu(a*b + a), a=2, b=3
const TRACE_ORDER = ['e', 'd', 'c', 'b', 'a'];   // reversed topological order
const STEP_H = [1e-1, 1e-3, 1e-5, 1e-7, 1e-9, 1e-11];
const STEP_ERR = [1.0e-2, 1.0e-6, 1.4e-10, 3.9e-9, 5.7e-7, 2.3e-5]; // |err dx| of central differences

// 1. Graph with forward values and gradients
{
  const s = new Sketch(880, 330, { title: 'Computation graph for e = relu(a*b + a) with forward values and gradients', seed: 181 });
  const box = (x, y, label) => {
    s.rect(x, y, 170, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 85, y + 31, label, { font: 'mono', size: 18 });
  };
  box(40, 110, 'a = 2');
  box(40, 250, 'b = 3');
  box(290, 180, 'c = a*b = 6');
  box(540, 110, 'd = c + a = 8');
  box(540, 250, 'e = relu(d) = 8');
  s.arrow(210, 135, 288, 196, { color: C.muted });
  s.arrow(210, 275, 288, 214, { color: C.muted });
  s.arrow(460, 205, 538, 138, { color: C.muted });
  s.arrow(625, 162, 625, 246, { color: C.muted });
  s.curveArrow(125, 110, 330, 40, 538, 120, { color: C.muted });
  s.text(331, 66, 'a, directly: +1', { font: 'mono', size: 16, color: C.rose });
  s.text(125, 184, `grad a = ${GRAPH.a} = 1 + 3`, { font: 'mono', size: 18, weight: 700, color: C.rose });
  s.text(125, 322, `grad b = ${GRAPH.b}`, { font: 'mono', size: 18, weight: 700, color: C.rose });
  s.text(375, 252, `grad c = ${GRAPH.c}`, { font: 'mono', size: 18, weight: 700, color: C.rose });
  s.text(724, 141, `grad d = ${GRAPH.d}`, { font: 'mono', size: 18, weight: 700, color: C.rose, anchor: 'start' });
  s.text(724, 281, `grad e = ${GRAPH.e}`, { font: 'mono', size: 18, weight: 700, color: C.rose, anchor: 'start' });
  save('18.2-graph.svg', s);
}

// 2. Backward visit order and the gradients it writes
{
  const s = new Sketch(880, 290, { title: 'Backward pass visiting nodes in reverse topological order and the gradients each visit writes', seed: 182 });
  s.text(440, 34, 'Backward visits e, d, c, b, a in that order', { size: 22, weight: 700 });
  const notes = [
    ['d.grad = 1'],
    ['c.grad = 1', 'a.grad = 1'],
    ['a.grad = 4', 'b.grad = 2'],
    ['b is a leaf:', 'nothing to push'],
    ['a is a leaf:', 'nothing to push'],
  ];
  const xs = [50, 228, 406, 584, 762];
  TRACE_ORDER.forEach((name, i) => {
    const x = xs[i];
    s.rect(x, 70, 68, 50, { color: C.violet, fill: C.violetSoft, fillStyle: 'solid' });
    s.text(x + 34, 101, name, { font: 'mono', size: 22, weight: 700 });
    notes[i].forEach((line, j) => {
      s.text(x + 34, 150 + j * 26, line, { font: 'mono', size: 16, color: i < 3 ? C.rose : C.muted, anchor: 'middle' });
    });
    if (i < TRACE_ORDER.length - 1) s.arrow(x + 72, 95, xs[i + 1] - 4, 95, { color: C.muted });
  });
  s.note(240, 220, 600, 46, ['a.grad goes 0 -> 1 (from d) -> 4 (from c). Contributions add.'], { size: 18 });
  save('18.2-backward-trace.svg', s);
}

// 3. Re-running backward on the same graph
{
  const s = new Sketch(880, 300, { title: 'Two backward passes on the same graph: the second pass adds to gradients left from the first', seed: 183 });
  s.text(440, 34, 'Same graph, backward called twice', { size: 22, weight: 700 });
  s.rect(60, 70, 330, 170, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(225, 104, 'Pass 1', { size: 22, weight: 700 });
  s.text(225, 140, 'a.grad = 0 + 1 + 3 = 4', { font: 'mono', size: 17 });
  s.text(225, 172, 'c.grad = 1', { font: 'mono', size: 17 });
  s.text(225, 212, 'correct: dy/da = 4', { font: 'mono', size: 17, color: C.green });
  s.rect(490, 70, 330, 170, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(655, 104, 'Pass 2 (no zeroing)', { size: 22, weight: 700 });
  s.text(655, 140, 'a.grad = 4 + 1 + 3 x 2 = 11', { font: 'mono', size: 17 });
  s.text(655, 172, 'c.grad = 1 + 1 = 2', { font: 'mono', size: 17 });
  s.text(655, 212, 'doubling would give 8', { font: 'mono', size: 17, color: C.rose });
  save('18.2-accumulate-trap.svg', s);
}

// 4. Step size for central differences
{
  const s = new Sketch(880, 400, { title: 'Error of central finite differences for dL/dx versus step size h, on a log scale', seed: 184 });
  s.text(440, 34, 'Error of the central difference for df/dx, by step size h', { size: 22, weight: 700 });
  const base = 330, perDecade = 22; // y = base - (log10(err) + 12) * perDecade ; floor at 1e-12
  const yOf = (v) => base - (Math.log10(v) + 12) * perDecade;
  for (const p of [-2, -4, -6, -8, -10, -12]) {
    const y = base - (p + 12) * perDecade;
    s.line(120, y, 820, y, { color: C.muted, width: 1, dash: '4 6' });
    s.text(104, y + 6, `1e${p}`, { font: 'mono', size: 16, anchor: 'end' });
  }
  s.text(60, 80, '|error|', { font: 'mono', size: 16, anchor: 'start' });
  STEP_H.forEach((h, i) => {
    const x = 170 + i * 110;
    const top = yOf(STEP_ERR[i]);
    const best = STEP_H[i] === 1e-5;
    s.rect(x - 30, top, 60, base - top, { color: best ? C.green : C.blue, fill: best ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x, top - 10, STEP_ERR[i].toExponential(1), { font: 'mono', size: 16, color: best ? C.green : C.ink });
    s.text(x, base + 30, `h=${h.toExponential(0)}`, { font: 'mono', size: 16 });
  });
  s.text(440, 380, 'shorter bars are more accurate; the smallest error is at h = 1e-5', { size: 18, color: C.muted });
  save('18.2-step-size.svg', s);
}
console.log('ok');
