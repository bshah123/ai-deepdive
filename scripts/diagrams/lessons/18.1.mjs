// Diagrams for Lesson 18.1 (reverse-mode AD and a tape). Run: node scripts/diagrams/lessons/18.1.mjs
// Numbers come from the two NumPy blocks in the lesson (run once with the project venv).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-02-scientific-python/chapter-18-autograd/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- graph: values and gradients
{
  const s = new Sketch(880, 380, { title: 'Graph for f = (x*y + y)^2 at x = 2, y = 4: forward values and backward gradients', seed: 1801 });
  s.text(440, 34, 'One graph, two passes: values forward, gradients back', { size: 24, weight: 700 });
  s.text(375, 60, 'df/da = 24', { font: 'mono', size: 16, color: C.rose });
  const box = (x, y, w, t) => {
    s.rect(x, y, w, 54, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + w / 2, y + 33, t, { font: 'mono', size: 17 });
  };
  box(40, 70, 150, 'x = 2');
  box(40, 250, 150, 'y = 4');
  box(290, 70, 170, 'a = x*y = 8');
  box(480, 160, 170, 'b = a+y = 12');
  box(700, 160, 150, 'f = b*b = 144');
  // forward arrows (values)
  s.arrow(190, 97, 290, 97, { color: C.muted });
  s.arrow(190, 277, 350, 124, { color: C.muted });
  s.arrow(410, 124, 520, 160, { color: C.muted });
  s.arrow(190, 277, 500, 214, { color: C.muted });
  s.arrow(650, 187, 700, 187, { color: C.muted });
  // backward gradients (adjoints)
  s.text(115, 146, 'df/dx = 96', { font: 'mono', size: 16, color: C.rose });
  s.text(565, 236, 'df/db = 24', { font: 'mono', size: 16, color: C.rose });
  s.text(775, 236, 'df/df = 1', { font: 'mono', size: 16, color: C.rose });
  s.text(115, 336, 'df/dy = 72', { font: 'mono', size: 16, color: C.rose });
  s.text(440, 340, 'y feeds a and b: 24 via b + 48 via a = 72', { size: 19, color: C.rose });
  s.text(440, 372, 'ink = forward value    rose = gradient of f with respect to that node', { size: 17, color: C.muted });
  save('18.1-graph.svg', s);
}

// ---------------------------------------------------------------- tape: append forward, read backward
{
  const s = new Sketch(880, 340, { title: 'The tape: forward appends one record per primitive, backward reads them last to first', seed: 1802 });
  s.text(440, 34, 'The tape: append forward, read backward', { size: 24, weight: 700 });
  s.text(40, 66, 'forward pass: one record per operation, in order', { size: 18, anchor: 'start', color: C.muted });
  const recs = [
    { x: 40, top: ['step 1: mul', 'a = x*y = 8'], back: ['grad_x += grad_a*y = 96', 'grad_y += grad_a*x = 48'] },
    { x: 320, top: ['step 2: add', 'b = a+y = 12'], back: ['grad_a += grad_b = 24', 'grad_y += grad_b = 24'] },
    { x: 600, top: ['step 3: mul', 'f = b*b = 144'], back: ['grad_b += 2*b*grad_f', '= 2*12*1 = 24'] },
  ];
  for (const r of recs) {
    s.rect(r.x, 84, 240, 74, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(r.x + 120, 110, r.top[0], { font: 'mono', size: 16 });
    s.text(r.x + 120, 142, r.top[1], { font: 'mono', size: 17 });
    s.text(r.x + 120, 186, r.back[0], { font: 'mono', size: 15, color: C.rose });
    s.text(r.x + 120, 210, r.back[1], { font: 'mono', size: 15, color: C.rose });
  }
  s.arrow(280, 121, 320, 121, { color: C.ink });
  s.arrow(560, 121, 600, 121, { color: C.ink });
  s.arrow(820, 262, 60, 262, { color: C.rose });
  s.text(440, 300, 'backward pass: read the records last to first, apply each VJP rule', { size: 19, color: C.rose });
  save('18.1-tape.svg', s);
}

// ---------------------------------------------------------------- passes: forward mode vs reverse mode counts
{
  const s = new Sketch(880, 400, { title: 'Primitive rule evaluations for one full gradient: forward mode grows with n, reverse mode does not', seed: 1803 });
  s.text(440, 34, 'Rule evaluations for one full gradient', { size: 24, weight: 700 });
  const data = [[1, 3, 3], [4, 12, 3], [16, 48, 3], [64, 192, 3], [256, 768, 3]]; // from block 2 output
  const base = 320, scale = 220 / 768;
  s.line(90, base, 800, base, { color: C.muted });
  data.forEach(([n, fwd, rev], i) => {
    const cx = 150 + i * 150;
    const hf = fwd * scale, hr = rev * scale;
    s.rect(cx - 52, base - hf, 46, hf, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.rect(cx + 6, base - hr, 46, hr, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx - 29, base - hf - 10, String(fwd), { font: 'mono', size: 16 });
    s.text(cx + 29, base - hr - 10, String(rev), { font: 'mono', size: 16 });
    s.text(cx, base + 30, `n = ${n}`, { font: 'mono', size: 17 });
  });
  s.rect(120, 362, 22, 22, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(152, 379, 'forward mode: one sweep per input', { size: 18, anchor: 'start' });
  s.rect(470, 362, 22, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(502, 379, 'reverse mode: one sweep, scalar output', { size: 18, anchor: 'start' });
  save('18.1-passes.svg', s);
}

// ---------------------------------------------------------------- unbroadcast: sum the gradient back to the bias shape
{
  const s = new Sketch(880, 290, { title: 'Summing a broadcast gradient back to the bias shape (3,)', seed: 1804 });
  s.text(440, 34, 'A bias of shape (3,) was broadcast to (2, 3)', { size: 24, weight: 700 });
  s.text(200, 84, 'upstream gradient g, shape (2, 3)', { size: 18 });
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      const x = 70 + j * 80, y = 100 + i * 60;
      s.rect(x, y, 70, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(x + 35, y + 32, '1', { font: 'mono', size: 18 });
    }
  }
  s.arrow(330, 135, 450, 135, { color: C.muted });
  s.text(390, 120, 'sum over axis 0', { size: 17 });
  s.text(560, 92, 'grad for bias, shape (3,)', { size: 18 });
  for (let j = 0; j < 3; j++) {
    const x = 480 + j * 80;
    s.rect(x, 110, 70, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + 35, 142, '2', { font: 'mono', size: 18 });
  }
  s.text(440, 240, 'Without the sum, bias.grad + g silently has shape (2, 3).', { size: 19, color: C.rose });
  save('18.1-unbroadcast.svg', s);
}
