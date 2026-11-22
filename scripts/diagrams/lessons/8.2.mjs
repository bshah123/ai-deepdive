import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers below come from scripts/diagrams/lessons/8.2_experiment.py (CPython 3.12.13).
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-08-scope-closures-decorators/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. What a closure holds: function -> __closure__ tuple -> cell -> value
{
  const s = new Sketch(880, 330, { title: 'A closure holds a tuple of cells; each cell holds one variable', seed: 201 });
  s.text(440, 40, 'What a closure holds', { size: 26, weight: 700 });
  s.rect(40, 100, 300, 150, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(190, 136, 'inner_function', { size: 22, weight: 700 });
  s.text(190, 176, ['__code__.co_freevars', "  = ('text',)"], { font: 'mono', size: 16 });
  s.text(190, 222, '__closure__ = (cell,)', { font: 'mono', size: 16 });
  s.arrow(340, 175, 480, 175, { color: C.muted });
  s.text(410, 162, '[0]', { font: 'mono', size: 16, color: C.muted });
  s.rect(480, 120, 360, 110, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(660, 152, 'cell', { size: 22, weight: 700 });
  s.text(660, 190, "cell_contents = 'Hello, World!'", { font: 'mono', size: 15 });
  s.note(40, 268, 390, 48, ["outer.co_cellvars = ('text',)"], { size: 18 });
  s.arrow(430, 292, 600, 232, { color: C.muted });
  s.text(720, 282, 'the outer frame owns the cell', { size: 18, color: C.muted });
  save('8.2-cell-structure.svg', s);
}

// 2. Two closures share one cell: a counter and its reader
{
  const s = new Sketch(880, 300, { title: 'Two closures share one cell; the value lives in the cell', seed: 202 });
  s.text(440, 40, 'Two closures, one cell', { size: 26, weight: 700 });
  s.rect(40, 90, 220, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(150, 122, 'increment()', { font: 'mono', size: 18 });
  s.rect(40, 180, 220, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(150, 212, 'read()', { font: 'mono', size: 18 });
  s.arrow(262, 116, 400, 150, { color: C.muted });
  s.arrow(262, 206, 400, 180, { color: C.muted });
  s.rect(400, 110, 230, 110, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(515, 142, 'cell: count', { size: 20, weight: 700 });
  s.text(515, 182, 'cell_contents = 2', { font: 'mono', size: 17 });
  s.note(670, 90, 200, 150, ['before any call: 0', 'after 2 calls: 2', 'read() returns 2'], { size: 19 });
  s.text(440, 270, 'same cell object: True', { font: 'mono', size: 17, color: C.muted });
  save('8.2-shared-cell.svg', s);
}

// 3. Late binding in a loop, and the default-argument fix
{
  const s = new Sketch(880, 500, { title: 'Three lambdas in a loop share one cell and all return 2', seed: 203 });
  s.text(440, 36, 'Late binding: the trap, then the fix', { size: 26, weight: 700 });
  s.text(60, 80, 'fs = [lambda: i for i in range(3)]', { font: 'mono', size: 16, anchor: 'start' });
  for (let k = 0; k < 3; k++) {
    const x = 120 + k * 200;
    s.rect(x, 100, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 75, 131, `lambda ${k}`, { font: 'mono', size: 17 });
    s.arrow(x + 75, 150, 440, 250, { color: C.muted });
  }
  s.rect(320, 250, 240, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 285, 'one cell: i = 2', { font: 'mono', size: 18 });
  s.text(440, 340, '[f() for f in fs] = [2, 2, 2]', { font: 'mono', size: 19, color: C.rose });
  s.line(40, 370, 840, 370, { color: C.muted, dash: '6 8' });
  s.text(60, 404, 'fix: bind i as a default argument', { size: 20, weight: 700, anchor: 'start' });
  for (let k = 0; k < 3; k++) {
    const x = 120 + k * 200;
    s.rect(x, 424, 150, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + 75, 455, `i = ${k}`, { font: 'mono', size: 17 });
  }
  s.text(740, 455, '[0, 1, 2]', { font: 'mono', size: 19, color: C.green });
  save('8.2-late-binding.svg', s);
}

// 4. Retention: a closure keeps its whole cell alive
{
  const s = new Sketch(880, 330, { title: 'A closure that uses one field keeps the whole object alive', seed: 204 });
  s.text(440, 38, 'What the closure keeps alive', { size: 26, weight: 700 });
  s.text(220, 88, 'leaky: closure reads blob.data[0]', { size: 19, weight: 700 });
  s.rect(40, 110, 200, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(140, 144, 'first()', { font: 'mono', size: 18 });
  s.arrow(240, 138, 380, 138, { color: C.muted });
  s.rect(380, 110, 150, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(455, 144, 'cell: blob', { font: 'mono', size: 16 });
  s.arrow(530, 138, 620, 138, { color: C.muted });
  s.rect(620, 110, 220, 56, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(730, 144, 'Blob alive: True', { font: 'mono', size: 17 });

  s.text(220, 218, 'fixed: closure reads first_value', { size: 19, weight: 700 });
  s.rect(40, 240, 200, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(140, 274, 'first()', { font: 'mono', size: 18 });
  s.arrow(240, 268, 380, 268, { color: C.muted });
  s.rect(380, 240, 150, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(455, 274, 'cell: 0', { font: 'mono', size: 16 });
  s.rect(620, 240, 220, 56, { color: C.muted, dash: '6 8' });
  s.text(730, 274, 'Blob alive: False', { font: 'mono', size: 17 });
  s.text(440, 318, 'CPython frees the blob when make_first_fixed() returns.', { size: 18, color: C.muted });
  save('8.2-retention.svg', s);
}
