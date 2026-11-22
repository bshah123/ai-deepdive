import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers in these sketches come from the experiment run for lesson 17.3
// (torch 2.15.0, CPU). Storage addresses are never shown; buffers are named S and W.
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-02-scientific-python/chapter-17-pytorch-fundamentals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

const cell = (s, x, y, val, o = {}) => {
  const { color = C.blue, fill = C.blueSoft } = o;
  s.rect(x, y, 60, 44, { color, fill, fillStyle: 'solid' });
  s.text(x + 30, y + 29, String(val), { font: 'mono', size: 18 });
};

// 1. Out-of-place allocates a second buffer; in-place rewrites the first.
{
  const s = new Sketch(880, 320, { title: 'Out-of-place allocates a new buffer; in-place overwrites the old one', seed: 301 });
  s.text(440, 34, 'Out-of-place vs in-place', { size: 26, weight: 700 });
  s.text(212, 80, 'y = x + 1  (out-of-place)', { size: 20, weight: 700 });
  s.text(40, 132, 'x', { font: 'mono', size: 18, anchor: 'start' });
  [1, 2, 3].forEach((v, i) => cell(s, 110 + 66 * i, 110, v));
  s.arrow(212, 162, 212, 196, { color: C.muted });
  s.text(40, 222, 'y', { font: 'mono', size: 18, anchor: 'start' });
  [2, 3, 4].forEach((v, i) => cell(s, 110 + 66 * i, 200, v, { color: C.green, fill: C.greenSoft }));
  s.text(212, 270, 'new buffer: a second block of memory', { size: 18 });

  s.line(440, 74, 440, 292, { color: C.muted, dash: '6 8' });

  s.text(636, 80, 'x.add_(1)  (in-place)', { size: 20, weight: 700 });
  s.text(510, 132, 'x', { font: 'mono', size: 18, anchor: 'end' });
  [1, 2, 3].forEach((v, i) => cell(s, 540 + 66 * i, 110, v));
  s.arrow(636, 162, 636, 196, { color: C.muted });
  s.text(650, 184, 'x.add_(1)', { font: 'mono', size: 17, anchor: 'start' });
  s.text(510, 222, 'x', { font: 'mono', size: 18, anchor: 'end' });
  [2, 3, 4].forEach((v, i) => cell(s, 540 + 66 * i, 200, v));
  s.text(636, 270, 'same buffer, new values; nothing is rebound', { size: 18 });
  save('17.3-storage-before-after.svg', s);
}

// 2. Names point at buffers; a view points into a buffer at an offset; clone copies.
{
  const s = new Sketch(880, 340, { title: 'Names point at buffers; views point into them', seed: 302 });
  s.text(440, 34, 'Names point at buffers; views point into them', { size: 26, weight: 700 });
  s.text(40, 178, 'buffer S', { font: 'hand', size: 20, anchor: 'start' });
  const vals = [0, 10, 20, 30, 40, 50];
  vals.forEach((v, i) => {
    const hi = i >= 2 && i <= 4;
    cell(s, 170 + 66 * i, 150, v, { color: hi ? C.amber : C.blue, fill: hi ? C.amberSoft : C.blueSoft });
  });
  s.rect(296, 142, 204, 60, { color: C.amber, dash: '6 8' });
  s.text(398, 128, 'v = base[2:5]', { size: 19 });
  s.text(398, 222, 'x, z and base name buffer S', { size: 18 });
  s.text(40, 298, 'buffer W', { font: 'hand', size: 20, anchor: 'start' });
  vals.forEach((v, i) => cell(s, 170 + 66 * i, 270, v, { color: C.green, fill: C.greenSoft }));
  s.text(582, 292, 'w = base.clone()', { size: 19, anchor: 'start' });
  save('17.3-aliases.svg', s);
}

// 3. The version counter counts in-place writes; out-of-place results start at 0.
{
  const s = new Sketch(880, 290, { title: 'The version counter counts in-place writes', seed: 303 });
  s.text(440, 34, 'The version counter counts in-place writes', { size: 26, weight: 700 });
  const steps = [
    { lines: ['t = tensor(...)'], ver: 0 },
    { lines: ['t.add_(1)'], ver: 1 },
    { lines: ['t.mul_(2)'], ver: 2 },
    { lines: ['v = t[1:]', 'v.add_(1)'], ver: 3 },
  ];
  steps.forEach((st, i) => {
    const x = 40 + 220 * i;
    s.rect(x, 80, 170, 100, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    st.lines.forEach((l, j) => s.text(x + 85, 110 + 20 * j, l, { font: 'mono', size: 16 }));
    s.text(x + 85, 164, `version ${st.ver}`, { size: 22, weight: 700 });
    if (i < steps.length - 1) s.arrow(x + 176, 130, x + 214, 130, { color: C.muted });
  });
  s.note(40, 206, 620, 60, ['t and v share one counter, so the write through v', 'makes t read version 3 too'], { size: 18 });
  save('17.3-version-counter.svg', s);
}

// 4. Autograd: a saved output versus a constant factor.
{
  const s = new Sketch(880, 410, { title: 'Autograd saves what backward needs', seed: 304 });
  s.text(440, 34, 'Autograd saves what backward needs', { size: 26, weight: 700 });
  s.text(230, 86, 'sigmoid, then mul_', { size: 21, weight: 700 });
  s.text(650, 86, 'x * 2, then mul_(3)', { size: 21, weight: 700 });
  const col = (cx, rows) => rows.forEach(([label, y, color, fill]) => {
    s.rect(cx - 110, y, 220, 44, { color, fill, fillStyle: 'solid' });
    s.text(cx, y + 28, label, { font: 'mono', size: 17 });
  });
  const arrowsDown = (cx, ys) => ys.forEach(y => s.arrow(cx, y, cx, y + 26, { color: C.muted }));
  // left column
  col(230, [
    ['x', 110, C.blue, C.blueSoft],
    ['y = sigmoid(x)', 186, C.amber, C.amberSoft],
    ['y.mul_(2)', 262, C.rose, C.roseSoft],
    ['RuntimeError', 338, C.rose, C.roseSoft],
  ]);
  arrowsDown(230, [154, 230, 306]);
  s.text(360, 214, 'saved for backward', { size: 17, anchor: 'start' });
  s.text(360, 290, 'version 0 to 1', { size: 17, anchor: 'start' });
  // right column
  col(650, [
    ['x', 110, C.blue, C.blueSoft],
    ['y = x * 2', 186, C.green, C.greenSoft],
    ['y.mul_(3)', 262, C.green, C.greenSoft],
    ['grad = [6, 6]', 338, C.green, C.greenSoft],
  ]);
  arrowsDown(650, [154, 230, 306]);
  s.text(780, 214, 'constant only', { size: 17, anchor: 'start' });
  s.text(780, 290, 'constant only', { size: 17, anchor: 'start' });
  save('17.3-autograd-saved.svg', s);
}

// 5. Peak growth after 10 steps, measured on 32 MiB buffers.
{
  const s = new Sketch(880, 370, { title: 'Memory growth after 10 steps', seed: 305 });
  s.text(440, 34, 'Memory growth after 10 steps (32 MiB buffers)', { size: 26, weight: 700 });
  const base = 290, scale = 200 / 288;
  const bars = [
    { x: 180, mb: 32, color: C.blue, fill: C.blueSoft, label: '+32 MiB', cat: ['no_grad,', 'out-of-place'] },
    { x: 380, mb: 0, color: C.green, fill: C.greenSoft, label: '+0 MiB', cat: ['no_grad,', 'in-place'] },
    { x: 580, mb: 288, color: C.rose, fill: C.roseSoft, label: '+288 MiB', cat: ['autograd on,', 'out-of-place'] },
  ];
  s.line(120, base, 760, base, { color: C.muted });
  bars.forEach(b => {
    const h = b.mb * scale;
    if (h > 0) s.rect(b.x, base - h, 140, h, { color: b.color, fill: b.fill, fillStyle: 'solid' });
    s.text(b.x + 70, base - h - 10, b.label, { size: 19, weight: 700 });
    s.text(b.x + 70, 318, b.cat[0], { size: 17 });
    s.text(b.x + 70, 340, b.cat[1], { size: 17 });
  });
  save('17.3-rss-bars.svg', s);
}
console.log('wrote 17.3 diagrams to', OUT);
