// Diagrams for 8.1 (LEGB scope and cell objects).
// Run: node scripts/diagrams/lessons/8.1.mjs
// Every number comes from scripts/diagrams/lessons/8.1_experiment.py (run it to reprint them; Python 3.12.13).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-08-scope-closures-decorators/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 8.1-legb-search.svg
// A1: name found in E ("enclosing"); the search stops there, G and B are never reached.
{
  const s = new Sketch(880, 400, { title: 'Name lookup order: local, enclosing, global, built-in. The example lookup of name stops at the enclosing scope, which holds name = enclosing.', seed: 811 });
  s.text(440, 34, 'Where does inner() find name?', { size: 26, weight: 700 });
  const rows = [
    { tag: 'L  local', what: 'bound in inner()', res: 'miss', hit: false },
    { tag: 'E  enclosing', what: "outer() binds name = 'enclosing'", res: "HIT: 'enclosing'", hit: true },
    { tag: 'G  global', what: "module binds name = 'global'", res: 'not reached', hit: false },
    { tag: 'B  built-in', what: 'print, len, ...', res: 'not reached', hit: false },
  ];
  rows.forEach((r, i) => {
    const y = 70 + i * 70;
    if (r.hit) s.rect(60, y, 520, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    else s.rect(60, y, 520, 52, { color: C.muted });
    s.text(80, y + 22, r.tag, { font: 'mono', size: 16, weight: r.hit ? 700 : 400, anchor: 'start' });
    s.text(80, y + 41, r.what, { font: 'mono', size: 15, color: C.muted, anchor: 'start' });
    s.text(620, y + 32, r.res, { font: 'mono', size: 16, weight: r.hit ? 700 : 400, color: r.hit ? C.green : C.muted, anchor: 'start' });
  });
  s.arrow(36, 96, 36, 318, { color: C.ink, head: 9 });
  s.text(20, 206, 'searched first', { size: 17, color: C.muted, rotate: -90 });
  s.text(440, 374, 'The search stops at the first scope that binds the name.', { size: 19 });
  save('8.1-legb-search.svg', s);
}

// ---------------------------------------------------------------- 8.1-compile-time.svg
// B1: read-only use falls through to global, prints 1; assignment in the body makes g local, UnboundLocalError.
{
  const s = new Sketch(880, 360, { title: 'Left: a read-only g resolves to the global g and prints 1. Right: an assignment to g in the same body makes g local, so reading it first raises UnboundLocalError.', seed: 812 });
  s.text(440, 34, 'One assignment changes where a name is looked up', { size: 25, weight: 700 });
  const panels = [
    { cx: 220, head: 'only read in f()', lines: ['g = 1          # module', 'def f():', '    print(g)'], where: 'g is not bound in f,', where2: 'so the search reaches global', res: 'prints 1', col: C.green, soft: C.greenSoft },
    { cx: 660, head: 'g assigned in f()', lines: ['g = 1          # module', 'def f():', '    print(g)', '    g = 2'], where: 'g is bound in f, so the', where2: 'local slot is used: still empty', res: 'UnboundLocalError', col: C.rose, soft: C.roseSoft },
  ];
  for (const p of panels) {
    s.text(p.cx, 76, p.head, { size: 22, weight: 700 });
    s.rect(p.cx - 190, 90, 380, 104 + (p.lines.length - 3) * 26, { color: C.muted });
    p.lines.forEach((ln, i) => s.text(p.cx - 176, 116 + i * 26, ln, { font: 'mono', size: 16, anchor: 'start' }));
    const yW = 90 + 104 + (p.lines.length - 3) * 26 + 34;
    s.text(p.cx, yW, p.where, { size: 18, color: C.muted });
    s.text(p.cx, yW + 24, p.where2, { size: 18, color: C.muted });
    s.rect(p.cx - 120, yW + 42, 240, 46, { color: p.col, fill: p.soft, fillStyle: 'solid' });
    s.text(p.cx, yW + 72, p.res, { font: 'mono', size: 18, weight: 700 });
  }
  s.line(440, 70, 440, 350, { color: C.muted, width: 1, dash: '6 8' });
  save('8.1-compile-time.svg', s);
}

// ---------------------------------------------------------------- 8.1-cell.svg
// D2/D3: cell_contents is 0 when the closure is made and 2 after counter() runs twice.
{
  const s = new Sketch(880, 390, { title: 'A closure keeps a cell, not the frame: the frame of make_counter() is freed on return, but the cell and the closure keep the variable alive. cell_contents is 2 after two calls.', seed: 813 });
  s.text(440, 34, 'The cell outlives the frame', { size: 26, weight: 700 });
  // frame (freed on return)
  s.rect(40, 80, 230, 190, { color: C.muted, dash: '6 8' });
  s.text(155, 108, 'make_counter() frame', { size: 18, weight: 700, color: C.muted });
  s.rect(62, 130, 170, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(147, 157, 'count', { font: 'mono', size: 17 });
  s.text(155, 214, 'freed on return', { size: 16, color: C.muted });
  // cell
  s.rect(380, 120, 180, 110, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(470, 150, 'cell', { font: 'mono', size: 19, weight: 700 });
  s.text(470, 180, 'cell_contents = 2', { font: 'mono', size: 15 });
  s.text(470, 206, '(0 when made)', { size: 16, color: C.muted });
  // closure
  s.rect(660, 100, 190, 150, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(755, 132, 'counter', { font: 'mono', size: 18, weight: 700 });
  s.text(755, 162, '__closure__[0]', { font: 'mono', size: 15 });
  s.text(755, 218, 'holds the cell', { size: 16, color: C.muted });
  // links
  s.arrow(232, 152, 378, 152, { color: C.muted, head: 8, dash: '6 6' });
  s.text(326, 184, ['dropped', 'on return'], { size: 16, color: C.muted });
  s.arrow(658, 175, 562, 175, { color: C.green, head: 9 });
  s.text(610, 200, 'kept alive', { size: 16, color: C.green });
  s.text(440, 300, 'typedef struct { PyObject_HEAD; PyObject *ob_ref; } PyCellObject;', { font: 'mono', size: 16 });
  s.text(440, 340, 'A cell is a one-slot box: ob_ref holds the value.', { size: 19 });
  s.text(440, 368, 'Source: CPython Include/cpython/cellobject.h', { size: 16, color: C.muted });
  save('8.1-cell.svg', s);
}

// ---------------------------------------------------------------- 8.1-late-binding.svg
// E1-E5: [2, 2, 2] (shared cell), [0, 1, 2] (default argument), [0, 1, 2] (factory).
{
  const s = new Sketch(880, 400, { title: 'Three ways a loop of lambdas can capture i: one shared cell gives 2 2 2; a default argument or a factory call gives 0 1 2.', seed: 814 });
  s.text(440, 34, 'Closures in a loop: what each lambda reads', { size: 25, weight: 700 });
  const panels = [
    { cx: 150, head: 'shared cell', out: '[2, 2, 2]', col: C.rose, cap: ['all three read one cell,', 'which holds 2 when called'] },
    { cx: 440, head: 'default argument', out: '[0, 1, 2]', col: C.green, cap: ['lambda i=i copies the value', 'when each lambda is made'] },
    { cx: 730, head: 'factory function', out: '[0, 1, 2]', col: C.green, cap: ['each call of make_fn()', 'creates a new cell'] },
  ];
  panels.forEach((p, k) => {
    s.text(p.cx, 76, p.head, { size: 21, weight: 700 });
    [-65, 0, 65].forEach((dx, i) => {
      s.rect(p.cx + dx - 30, 92, 60, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(p.cx + dx, 120, `f${i}`, { font: 'mono', size: 16 });
    });
    if (k === 0) {
      s.rect(p.cx - 95, 200, 190, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
      s.text(p.cx, 231, 'cell i = 2', { font: 'mono', size: 17 });
      [-65, 0, 65].forEach((dx) => s.arrow(p.cx + dx, 138, p.cx + dx * 0.4, 198, { color: C.muted, head: 7 }));
    } else {
      [-65, 0, 65].forEach((dx, i) => {
        s.rect(p.cx + dx - 30, 200, 60, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
        s.text(p.cx + dx, 231, k === 1 ? `${i}` : `i=${i}`, { font: 'mono', size: 17 });
        s.arrow(p.cx + dx, 138, p.cx + dx, 198, { color: C.muted, head: 7 });
      });
    }
    s.text(p.cx, 296, p.out, { font: 'mono', size: 20, weight: 700, color: p.col });
    s.text(p.cx, 332, p.cap[0], { size: 16, color: C.muted });
    s.text(p.cx, 354, p.cap[1], { size: 16, color: C.muted });
  });
  s.line(295, 60, 295, 370, { color: C.muted, width: 1, dash: '6 8' });
  s.line(585, 60, 585, 370, { color: C.muted, width: 1, dash: '6 8' });
  save('8.1-late-binding.svg', s);
}
