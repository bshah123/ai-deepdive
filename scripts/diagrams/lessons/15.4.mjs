// Diagrams for lesson 15.4 (views vs copies). Numbers come from 15.4_experiment.py via 15.4_data.json.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-02-scientific-python/chapter-15-numpy-internals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '15.4_data.json'), 'utf8'));
const mem = Object.fromEntries(D.memory.map((m) => [m.op, m.peak_bytes]));
const fmt = (n) => n.toLocaleString('en-US');

// a = [1 2 3 4 5], int64, 8 bytes per element (values from the experiment's array)
const A = [1, 2, 3, 4, 5];

// ---- 1. View = new header over the same buffer; copy = new buffer -------
{
  const s = new Sketch(880, 400, { title: 'A view reuses the buffer of a; a copy gets a new buffer', seed: 101 });
  s.text(440, 34, 'A view reuses the buffer; a copy gets a new one', { size: 26, weight: 700 });
  s.text(240, 84, 'a[1:4] is a view', { size: 22, weight: 700 });
  s.rect(40, 100, 400, 64, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(240, 126, 'view = a[1:4]', { font: 'mono', size: 16 });
  s.text(240, 150, `shape (${D.slice_1_4.shape}) strides (${D.slice_1_4.strides}) offset ${D.offset_bytes_view_1_4} B`, { font: 'mono', size: 15 });
  s.arrow(240, 164, 156, 246, { color: C.blue });
  A.forEach((v, i) => {
    const x = 60 + i * 64;
    const hi = i >= 1 && i <= 3;
    if (hi) s.rect(x, 250, 64, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    else s.rect(x, 250, 64, 50, { color: C.muted });
    s.text(x + 32, 282, String(v), { font: 'mono', size: 20 });
    s.text(x + 32, 322, `[${i}]`, { font: 'mono', size: 15, color: C.muted });
  });
  s.text(240, 358, 'Writes to view[0] change a[1].', { size: 18 });

  s.text(640, 84, 'a.copy() is a copy', { size: 22, weight: 700 });
  s.rect(440, 100, 400, 64, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(640, 126, 'c = a.copy()', { font: 'mono', size: 16 });
  s.text(640, 150, 'new buffer: 5 elements x 8 bytes', { font: 'mono', size: 15 });
  s.arrow(640, 164, 492, 246, { color: C.amber });
  A.forEach((v, i) => {
    const x = 460 + i * 64;
    s.rect(x, 250, 64, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 32, 282, String(v), { font: 'mono', size: 20 });
    s.text(x + 32, 322, `[${i}]`, { font: 'mono', size: 15, color: C.muted });
  });
  s.text(640, 358, 'Writes to c never reach a.', { size: 18 });
  save('15.4-view-vs-copy.svg', s);
}

// ---- 2. Step slice: same buffer, stride doubled ---------------------------
{
  const s = new Sketch(880, 420, { title: 'a[::2] skips cells by doubling the stride', seed: 102 });
  s.text(440, 34, 'A step slice skips cells by doubling the stride', { size: 26, weight: 700 });
  const xs = [120, 220, 320, 420, 520];
  xs.forEach((x, i) => {
    s.text(x + 50, 160, `byte ${i * 8}`, { font: 'mono', size: 15, color: C.muted });
    const keep = i % 2 === 0;
    if (keep) s.rect(x, 170, 100, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    else s.rect(x, 170, 100, 56, { color: C.muted, dash: '6 8' });
    s.text(x + 50, 205, String(A[i]), { font: 'mono', size: 20, color: keep ? C.ink : C.muted });
  });
  s.text(440, 120, 'buffer a: every cell is 8 bytes apart', { size: 18 });
  [0, 2, 4].forEach((k, j) => {
    const x = xs[k];
    s.arrow(x + 50, 228, x + 50, 300, { color: C.blue });
    s.rect(x, 300, 100, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 50, 332, String(A[k]), { font: 'mono', size: 20 });
  });
  s.note(40, 370, 800, 40, [`s = a[::2]:  shape (3,)  strides (${D.step2_strides})  values ${JSON.stringify(D.step2_values)}`], { size: 17 });
  save('15.4-step-slice.svg', s);
}

// ---- 3. Which indexing returns a view? ------------------------------------
{
  const s = new Sketch(880, 500, { title: 'Which indexing returns a view or a copy', seed: 103 });
  s.text(440, 34, 'Which operations return a view, and which a copy?', { size: 26, weight: 700 });
  s.text(40, 72, 'expression', { size: 18, weight: 700, anchor: 'start' });
  s.text(440, 72, 'result', { size: 18, weight: 700 });
  s.text(580, 72, 'why', { size: 18, weight: 700, anchor: 'start' });
  const rows = [
    ['a[1:4]', 'view', 'basic slice', 'green'],
    ['a[::2]', 'view', 'step slice: stride doubles', 'green'],
    ['x[1]  (2-D)', 'view', 'one integer index: a row', 'green'],
    ['a[2]  (1-D)', 'NumPy scalar', 'one element, not an array', 'blue'],
    ['a[[0, 2, 4]]', 'copy', 'integer array index', 'rose'],
    ['a[a > 2]', 'copy', 'boolean mask', 'rose'],
    ['a.reshape(...)', 'view if possible', 'copy when the layout forbids it', 'amber'],
    ['a.copy(), a.flatten()', 'copy', 'always new memory', 'rose'],
  ];
  const pal = {
    green: [C.green, C.greenSoft], rose: [C.rose, C.roseSoft],
    amber: [C.amber, C.amberSoft], blue: [C.blue, C.blueSoft],
  };
  rows.forEach(([expr, res, why, col], i) => {
    const y = 96 + i * 50;
    s.text(40, y + 24, expr, { font: 'mono', size: 17, anchor: 'start' });
    const [c, f] = pal[col];
    const w = res.length > 14 ? 260 : 200;
    s.rect(440 - w / 2, y + 4, w, 36, { color: c, fill: f, fillStyle: 'solid' });
    s.text(440, y + 27, res, { size: 18, weight: 700 });
    s.text(580, y + 26, why, { size: 17, anchor: 'start' });
    s.line(40, y + 46, 840, y + 46, { color: C.muted, width: 1 });
  });
  save('15.4-indexing-rules.svg', s);
}

// ---- 4. Measured peak bytes per operation ---------------------------------
{
  const s = new Sketch(880, 580, { title: 'Peak bytes allocated per operation, measured', seed: 104 });
  s.text(440, 34, 'Peak bytes allocated per operation (1,000,000 float64)', { size: 26, weight: 700 });
  const items = [
    ['basic slice big[1:-1]', 'view'],
    ['step slice big[::2]', 'view'],
    ['reshape(1000, 1000)', 'view'],
    ['transpose of reshape', 'view'],
    ['ravel() of contiguous', 'view'],
    ['integer array big[idx]', 'copy'],
    ['boolean mask big[mask]', 'copy'],
    ['big.copy()', 'copy'],
    ['flatten()', 'copy'],
    ['reshape(-1) of transposed', 'copy'],
  ];
  const maxBytes = Math.max(...items.map(([k]) => mem[k]));
  const x0 = 330, maxW = 340;
  items.forEach(([label, kind], i) => {
    const y = 80 + i * 40;
    const b = mem[label];
    const w = Math.max(3, (b / maxBytes) * maxW);
    const [c, f] = kind === 'view' ? [C.green, C.greenSoft] : [C.rose, C.roseSoft];
    s.text(40, y + 20, label, { font: 'mono', size: 16, anchor: 'start' });
    s.rect(x0, y + 4, w, 24, { color: c, fill: f, fillStyle: 'solid' });
    s.text(x0 + w + 10, y + 22, `${fmt(b)} B`, { font: 'mono', size: 16, anchor: 'start' });
  });
  s.note(40, 500, 800, 56, ['green: view (shares the buffer of big)', 'rose: copy (new 8 MB or 4 MB buffer)'], { size: 17 });
  save('15.4-memory-bars.svg', s);
}

// ---- 5. The in-place trap --------------------------------------------------
{
  const s = new Sketch(880, 460, { title: 'Four statements, four outcomes for the original array', seed: 105 });
  s.text(440, 34, 'Which statements change the original array?', { size: 26, weight: 700 });
  const rows = [
    { code: ['b = a[mask]', 'b += 10'], vals: D.trap_copy_then_inplace_a, hi: [], note: ['a unchanged;', 'b = [13 14 15] is a copy'], col: 'green' },
    { code: ['c[c > 2] += 10'], vals: D.trap_setitem_a, hi: [2, 3, 4], note: ['written back into c'], col: 'amber' },
    { code: ['w = e[1:4]', 'w *= 2'], vals: D.trap_inplace_view_a, hi: [1, 2, 3], note: ['in place: writes', 'through the view'], col: 'amber' },
    { code: ['v = d[1:4]', 'v = v * 2'], vals: D.trap_rebind_a, hi: [], note: ['rebinding: v is a new', 'array; d is unchanged'], col: 'green' },
  ];
  const pal = { green: [C.green, C.greenSoft], amber: [C.amber, C.amberSoft] };
  rows.forEach((r, i) => {
    const y = 80 + i * 96;
    r.code.forEach((line, j) => s.text(40, y + 26 + j * 24, line, { font: 'mono', size: 17, anchor: 'start' }));
    r.vals.forEach((v, k) => {
      const x = 300 + k * 64;
      if (r.hi.includes(k)) {
        const [c, f] = pal[r.col];
        s.rect(x, y + 10, 60, 50, { color: c, fill: f, fillStyle: 'solid' });
      } else {
        s.rect(x, y + 10, 60, 50, { color: C.muted });
      }
      s.text(x + 30, y + 42, String(v), { font: 'mono', size: 20 });
    });
    r.note.forEach((line, j) => s.text(650, y + 30 + j * 24, line, { size: 17, anchor: 'start' }));
    if (i < rows.length - 1) s.line(40, y + 84, 860, y + 84, { color: C.muted, width: 1 });
  });
  save('15.4-trap.svg', s);
}
console.log('wrote 5 diagrams to', OUT);
