import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-02-scientific-python/chapter-15-numpy-internals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// One memory cell: a filled box with a centred label.
function cell(s, x, y, w, h, label, o = {}) {
  s.rect(x, y, w, h, { color: o.color || C.blue, fill: o.fill || C.blueSoft, fillStyle: 'solid' });
  if (label !== undefined) s.text(x + w / 2, y + h / 2 + 7, label, { font: 'mono', size: o.size || 20, color: o.tc || C.ink });
}

// Diagram 1: the same 2x3 array in C order and Fortran order.
{
  const s = new Sketch(880, 410, { title: 'Two grids of the same six values, with their byte order in memory for C and Fortran layouts', seed: 1501 });
  const panel = (y0, heading, buffer) => {
    s.text(60, y0 + 20, heading, { size: 22, weight: 700, anchor: 'start' });
    [[1, 2, 3], [4, 5, 6]].forEach((row, r) => row.forEach((v, c) => cell(s, 60 + c * 80, y0 + 40 + r * 44, 80, 44, String(v))));
    s.text(360, y0 + 36, 'buffer:', { size: 18, anchor: 'start', color: C.muted });
    buffer.forEach((v, k) => {
      cell(s, 360 + k * 72, y0 + 40, 72, 44, String(v), { color: C.amber, fill: C.amberSoft });
      s.text(360 + k * 72 + 36, y0 + 110, String(k * 4), { font: 'mono', size: 15, color: C.muted });
    });
  };
  panel(0, 'C order (row-major)', [1, 2, 3, 4, 5, 6]);
  panel(220, 'Fortran order (column-major)', [1, 4, 2, 5, 3, 6]);
  s.text(440, 396, 'Same six values. Only the order of the bytes in memory differs.', { size: 19, color: C.ink });
  save('15.1-c-vs-fortran-order.svg', s);
}

// Diagram 2: one buffer, two index maps (arr and arr.T).
{
  const s = new Sketch(880, 340, { title: 'One buffer read with two sets of strides, both landing on byte 20', seed: 1502 });
  s.text(440, 34, 'One buffer, two index maps', { size: 26, weight: 700 });
  s.text(60, 80, 'byte offset of each value', { size: 17, anchor: 'start', color: C.muted });
  [1, 2, 3, 4, 5, 6].forEach((v, k) => {
    const hit = k === 5;
    cell(s, 60 + k * 130, 120, 130, 46, String(v), hit
      ? { color: C.rose, fill: C.roseSoft, size: 22 }
      : { size: 22 });
    s.text(60 + k * 130 + 65, 110, String(k * 4), { font: 'mono', size: 16, color: C.muted });
  });
  s.rect(60, 200, 380, 100, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(250, 228, 'arr: strides (12, 4)', { font: 'mono', size: 19, weight: 700 });
  s.text(250, 254, 'element [1, 2]', { font: 'mono', size: 17 });
  s.text(250, 280, '1·12 + 2·4 = 20  → value 6', { font: 'mono', size: 17 });
  s.rect(480, 200, 380, 100, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(670, 228, 'arr.T: strides (4, 12)', { font: 'mono', size: 19, weight: 700 });
  s.text(670, 254, 'element [2, 1]', { font: 'mono', size: 17 });
  s.text(670, 280, '2·4 + 1·12 = 20  → value 6', { font: 'mono', size: 17 });
  s.text(440, 330, 'Transposing rewrites the strides. The bytes stay where they are.', { size: 21 });
  save('15.1-strides-offset.svg', s);
}

// Diagram 3: cache-line picture for row and column walks of a 1000 x 1000 float64 array.
{
  const s = new Sketch(880, 390, { title: 'Walking one row versus one column of a C-order float64 matrix', seed: 1503 });
  s.text(440, 34, 'Walking a row versus a column (C-order, float64)', { size: 24, weight: 700 });
  // left: row walk
  s.text(230, 84, 'row walk: a[0, j]', { size: 20, weight: 700 });
  s.text(230, 108, 'step: 8 bytes', { font: 'mono', size: 17, color: C.muted });
  for (let k = 0; k < 8; k++) cell(s, 54 + k * 44, 124, 44, 36, undefined, { color: C.blue, fill: C.blueSoft });
  s.text(230, 186, 'one 64-byte cache line: all 8 values used', { size: 17 });
  s.text(230, 318, '125 lines for 1000 values', { size: 20, weight: 700 });
  s.text(230, 344, 'loaded / useful bytes = 1.0x', { size: 19 });
  // right: column walk
  s.text(650, 84, 'column walk: a[i, 0]', { size: 20, weight: 700 });
  s.text(650, 108, 'step: 8000 bytes', { font: 'mono', size: 17, color: C.muted });
  [124, 176, 228].forEach((y) => {
    for (let k = 0; k < 8; k++) {
      if (k === 0) cell(s, 470, y, 44, 36, undefined, { color: C.rose, fill: C.roseSoft });
      else cell(s, 470 + k * 44, y, 44, 36, undefined, { color: C.muted, fill: undefined });
    }
  });
  s.text(650, 288, 'three of the 1000 lines shown', { size: 17, color: C.muted });
  s.text(650, 318, '1000 lines for 1000 values', { size: 20, weight: 700 });
  s.text(650, 344, 'loaded / useful bytes = 8.0x', { size: 19 });
  s.text(440, 372, 'Assumes 64-byte cache lines and a 64-byte-aligned base. Real speed depends on hardware.', { size: 16, color: C.muted });
  save('15.1-cache-lines.svg', s);
}

// Diagram 4: which operations are views and which are copies.
{
  const s = new Sketch(880, 450, { title: 'View or copy? Whether the result shares memory with a', seed: 1504 });
  s.text(440, 34, 'View or copy?', { size: 26, weight: 700 });
  s.text(440, 62, 'a is a 2×3 C-order int32 array. Each row asks np.shares_memory(a, result).', { size: 17, color: C.muted });
  const rows = [
    ['a.T', true],
    ['a.reshape(-1)', true],
    ["a.T.ravel(order='A')", true],
    ['a.T.reshape(-1)', false],
    ['a.T.copy()', false],
    ['np.asfortranarray(a)', false],
  ];
  rows.forEach(([expr, view], i) => {
    const cy = 120 + i * 50;
    s.text(60, cy + 7, expr, { font: 'mono', size: 19, anchor: 'start' });
    const c = view ? C.green : C.rose;
    const f = view ? C.greenSoft : C.roseSoft;
    s.rect(560, cy - 17, 260, 34, { color: c, fill: f, fillStyle: 'solid' });
    s.text(690, cy + 7, view ? 'view: shares memory' : 'copy: new buffer', { font: 'mono', size: 17 });
  });
  s.text(440, 430, 'A view needs strides that can describe the result. Otherwise NumPy must copy.', { size: 19 });
  save('15.1-view-or-copy.svg', s);
}
