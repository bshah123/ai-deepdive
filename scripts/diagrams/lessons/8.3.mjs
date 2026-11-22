// Lesson 8.3 diagrams. Numbers come from scripts/diagrams/lessons/8.3_experiment.py
// (Python 3.12.13): fib wrapper calls 15, 177, 1973 for n = 5, 10, 15; add(2, 3) returns 5;
// plain wrapper: __name__ 'wrapper', __doc__ None, no __wrapped__, signature (*args, **kwargs);
// wraps: __name__ 'add_wrapped', __doc__ 'Return a plus b.', __wrapped__ set, signature (a, b).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-08-scope-closures-decorators/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. @logged is one reassignment; the wrapper keeps the original in a closure cell.
{
  const s = new Sketch(880, 330, { title: 'The name add now points at a wrapper that holds the original function in a closure cell', seed: 831 });
  s.text(440, 34, '@logged is one reassignment: add = logged(add)', { size: 26, weight: 700 });
  s.rect(40, 130, 150, 50, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(115, 162, 'add', { font: 'mono', size: 19 });
  s.arrow(192, 155, 296, 155, { color: C.muted });
  s.text(244, 140, 'now points to', { size: 16 });
  s.rect(300, 100, 280, 120, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 128, 'wrapper(*args, **kwargs)', { font: 'mono', size: 16 });
  s.rect(330, 150, 220, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 182, 'closure cell: func', { font: 'mono', size: 16 });
  s.arrow(552, 176, 648, 156, { color: C.muted });
  s.rect(650, 130, 190, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(745, 162, 'add(a, b)', { font: 'mono', size: 18 });
  s.text(745, 206, 'the original, kept alive', { size: 16 });
  s.note(60, 248, 760, 52, ['the cell still refers to the original, so the wrapper can call it'], { size: 18 });
  save('8.3-rewrite.svg', s);
}

// 2. One call travels through the wrapper and comes back the same way.
{
  const s = new Sketch(880, 300, { title: 'A call to the decorated add goes through the wrapper and the result returns the same way', seed: 832 });
  s.text(440, 34, 'One call, two functions: add(2, 3) returns 5', { size: 26, weight: 700 });
  s.rect(30, 100, 130, 60, { color: C.muted, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(95, 136, 'caller', { size: 20 });
  s.rect(290, 96, 200, 100, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(390, 128, ['wrapper', 'prints the call'], { size: 19 });
  s.rect(630, 96, 200, 100, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(730, 128, ['add(a, b)', 'return a + b'], { font: 'mono', size: 16 });
  s.arrow(162, 124, 288, 124, { color: C.muted });
  s.text(225, 112, '1  add(2, 3)', { size: 16 });
  s.arrow(492, 124, 628, 124, { color: C.muted });
  s.text(560, 112, '2  func(2, 3)', { size: 16 });
  s.arrow(628, 176, 492, 176, { color: C.muted });
  s.text(560, 200, '3  returns 5', { size: 16 });
  s.arrow(288, 176, 164, 176, { color: C.muted });
  s.text(225, 200, '4  returns 5', { size: 16 });
  s.text(440, 262, 'the wrapper sees the arguments and the result, and can change either', { size: 18 });
  save('8.3-call-path.svg', s);
}

// 3. Stacking: @outer @inner def greet() is outer(inner(greet)); the print order is the onion order.
{
  const s = new Sketch(880, 320, { title: 'Stacked decorators nest like an onion: the outer wrapper runs first and last', seed: 833 });
  s.text(440, 34, 'Stacking: @outer @inner def greet()', { size: 26, weight: 700 });
  s.rect(40, 70, 540, 200, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(62, 98, 'outer', { size: 18, weight: 700, anchor: 'start' });
  s.rect(110, 120, 400, 130, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(132, 148, 'inner', { size: 18, weight: 700, anchor: 'start' });
  s.rect(200, 175, 220, 48, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(310, 205, 'greet()', { font: 'mono', size: 19 });
  s.note(640, 80, 200, 200, ['printed order', '1  outer: in', '2  inner: in', '3  greet body', '4  inner: out', '5  outer: out'], { size: 17 });
  s.text(440, 302, 'the call enters at the outermost wrapper and leaves through it last', { size: 17 });
  save('8.3-stacking.svg', s);
}

// 4. Measured: wrapper calls of naive recursive fib under a call-counting decorator.
{
  const s = new Sketch(880, 340, { title: 'Bar chart of wrapper calls for naive fib at n = 5, 10, 15', seed: 834 });
  s.text(440, 34, 'Naive fib: every recursive call passes through the decorator', { size: 26, weight: 700 });
  s.text(440, 66, 'wrapper calls = 2F(n+1) - 1, where F is the Fibonacci sequence', { size: 17 });
  const base = 290, scale = 170 / 1973;
  const bars = [['fib(5)', 15, 220], ['fib(10)', 177, 440], ['fib(15)', 1973, 660]];
  for (const [label, v, cx] of bars) {
    const h = Math.max(v * scale, 2);
    s.rect(cx - 55, base - h, 110, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, String(v), { size: 20, weight: 700 });
    s.text(cx, base + 26, label, { font: 'mono', size: 17 });
  }
  s.line(150, base, 730, base, { color: C.muted });
  save('8.3-fib-calls.svg', s);
}

// 5. What a plain wrapper reports about the function, versus functools.wraps.
{
  const s = new Sketch(880, 336, { title: 'Metadata of a plain wrapper versus a functools.wraps wrapper', seed: 835 });
  s.text(440, 34, 'What the decorated function reports about itself', { size: 26, weight: 700 });
  s.rect(40, 70, 400, 226, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(240, 104, 'plain wrapper', { size: 22, weight: 700 });
  ["__name__     'wrapper'", '__doc__      None', '__wrapped__  missing', 'signature    (*args, **kwargs)'].forEach((t, i) => s.text(70, 150 + i * 36, t, { font: 'mono', size: 17, anchor: 'start' }));
  s.rect(440, 70, 400, 226, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(640, 104, 'with functools.wraps', { size: 22, weight: 700 });
  ["__name__     'add_wrapped'", "__doc__      'Return a plus b.'", '__wrapped__  the original', 'signature    (a, b)'].forEach((t, i) => s.text(470, 150 + i * 36, t, { font: 'mono', size: 17, anchor: 'start' }));
  s.text(440, 322, 'Same result when called; only the reported metadata differs', { size: 18 });
  save('8.3-metadata.svg', s);
}
