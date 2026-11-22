import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-02-scientific-python/chapter-18-autograd/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers come from scripts/diagrams/lessons/18.3_experiment.py (torch 2.15.0), section A and C.

{ // 1. One custom node in the graph
  const s = new Sketch(880, 330, { title: 'A custom Function is one node in the graph', seed: 1831 });
  s.text(440, 34, 'One custom node in the graph', { size: 24, weight: 700 });
  s.text(440, 66, 'Forward runs left to right; backward runs right to left.', { size: 18, color: C.muted });
  s.rect(40, 110, 120, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(100, 140, 'x', { font: 'mono', size: 20, weight: 700 });
  s.text(100, 166, 'leaf tensor', { size: 16 });
  s.rect(250, 100, 220, 90, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(360, 137, 'RoundSTE', { font: 'mono', size: 18, weight: 700 });
  s.text(360, 166, 'forward: round(x)', { size: 17 });
  s.rect(530, 110, 120, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(590, 140, 'y', { font: 'mono', size: 20, weight: 700 });
  s.text(590, 166, 'round(x)', { size: 16 });
  s.rect(710, 110, 130, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(775, 140, 'loss', { font: 'mono', size: 18, weight: 700 });
  s.text(775, 166, 'y.sum()', { font: 'mono', size: 15 });
  s.arrow(160, 145, 250, 145, { color: C.blue });
  s.arrow(470, 145, 530, 145, { color: C.blue });
  s.arrow(650, 145, 710, 145, { color: C.blue });
  s.note(250, 215, 220, 40, ['ctx keeps x for backward'], { size: 17 });
  s.line(775, 180, 775, 290, { color: C.amber, dash: '6 8' });
  s.line(775, 290, 100, 290, { color: C.amber, dash: '6 8' });
  s.arrow(100, 290, 100, 184, { color: C.amber });
  s.text(440, 272, 'backward(ctx, grad_out): grad_out = 1 in, grad_input out', { size: 17, color: C.amber });
  s.text(440, 318, 'The returned grad_input is the gradient for x. Here it is the identity.', { size: 18, color: C.muted });
  save('18.3-custom-node.svg', s);
}

{ // 2. Forward is a staircase; straight-through pretends it is a ramp
  const s = new Sketch(880, 360, { title: 'Staircase forward, ramp backward (straight-through)', seed: 1832 });
  s.text(440, 34, 'Forward is a staircase; straight-through acts like a ramp', { size: 24, weight: 700 });
  const X = (x) => 340 + x * 110; // x = 0 at px 340
  const Y = (y) => 220 - y * 40;  // y = 0 at py 220
  s.line(100, 220, 690, 220, { color: C.muted });
  s.line(340, 320, 340, 90, { color: C.muted });
  s.text(690, 244, 'x', { font: 'mono', size: 18, anchor: 'end' });
  s.text(352, 96, 'round(x)', { font: 'mono', size: 16, anchor: 'start' });
  for (let k = -1; k <= 2; k++) {
    s.line(X(k - 0.5), Y(k), X(k + 0.5), Y(k), { color: C.ink, width: 3 });
  }
  s.line(X(-1.5), Y(-1.5), X(2.5), Y(2.5), { color: C.amber, dash: '6 8', width: 3 });
  const pts = [[0.4, 0], [1.6, 2], [2.5, 2], [-0.7, -1]];
  for (const [x, y] of pts) s.circle(X(x), Y(y), 12, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(X(0.4) - 4, Y(0) + 30, '0.4 -> 0', { font: 'mono', size: 15, anchor: 'start' });
  s.text(X(1.6) - 14, Y(2) - 16, '1.6 -> 2', { font: 'mono', size: 15, anchor: 'end' });
  s.text(X(2.5) + 10, Y(2) + 26, '2.5 -> 2', { font: 'mono', size: 15, anchor: 'start' });
  s.text(X(-0.7) - 4, Y(-1) + 34, '-0.7 -> -1', { font: 'mono', size: 15, anchor: 'end' });
  s.note(722, 110, 150, 150, ['True slope: 0', 'between jumps.', 'STE backward:', 'slope 1 (dashed).'], { size: 18 });
  s.text(440, 330, 'Each step is flat, so the true gradient is 0 almost everywhere.', { size: 18, color: C.muted });
  s.text(440, 352, 'Blue dots: the four inputs used in the worked example.', { size: 18, color: C.muted });
  save('18.3-ste-staircase.svg', s);
}

{ // 3. Measured gradients for the four inputs under three backward rules
  const s = new Sketch(880, 350, { title: 'Gradient of each input under three backward rules', seed: 1833 });
  s.text(440, 34, 'Same forward, three backward rules, four inputs', { size: 24, weight: 700 });
  const legend = [
    [120, C.rose, C.roseSoft, 'torch.round (true)'],
    [370, C.blue, C.blueSoft, 'STE: identity'],
    [580, C.green, C.greenSoft, 'clipped STE: |x| <= 1'],
  ];
  for (const [lx, col, soft, label] of legend) {
    s.rect(lx, 56, 18, 18, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(lx + 26, 71, label, { size: 17, anchor: 'start' });
  }
  const BASE = 290, UNIT = 160;
  s.line(120, BASE, 800, BASE, { color: C.muted });
  s.text(104, BASE + 6, '0', { font: 'mono', size: 16, anchor: 'end' });
  s.text(104, BASE - UNIT + 6, '1', { font: 'mono', size: 16, anchor: 'end' });
  s.line(120, BASE - UNIT, 800, BASE - UNIT, { color: C.muted, dash: '4 8' });
  const groups = [
    ['x = 0.4', 210, [0, 1, 1]],
    ['x = 1.6', 360, [0, 1, 0]],
    ['x = 2.5', 510, [0, 1, 0]],
    ['x = -0.7', 660, [0, 1, 1]],
  ];
  const rules = [
    [C.rose, C.roseSoft, 0],
    [C.blue, C.blueSoft, 1],
    [C.green, C.greenSoft, 2],
  ];
  for (const [label, cx, vals] of groups) {
    rules.forEach(([col, soft, idx], j) => {
      const bx = cx - 50 + j * 50;
      // values: index 0 = true autograd, 1 = STE, 2 = clipped STE
      const v = idx === 0 ? 0 : idx === 1 ? 1 : vals[2];
      if (v > 0) s.rect(bx - 18, BASE - UNIT * v, 36, UNIT * v, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(bx, v > 0 ? BASE - UNIT * v - 10 : BASE - 10, String(v), { font: 'mono', size: 17 });
    });
    s.text(cx, 322, label, { font: 'mono', size: 16 });
  }
  s.text(440, 344, 'Values are x.grad after one backward; the true gradient of round is 0 at these points.', { size: 16, color: C.muted });
  save('18.3-gradient-rules.svg', s);
}

{ // 4. Hooks run before accumulation; values from experiment C
  const s = new Sketch(880, 340, { title: 'Hook edits the gradient before it reaches .grad', seed: 1834 });
  s.text(440, 34, 'A hook edits the gradient before it reaches .grad', { size: 24, weight: 700 });
  s.rect(50, 70, 220, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(160, 96, 'graph gives g = 1', { size: 18 });
  s.text(160, 118, 'from y.sum()', { size: 16 });
  s.arrow(270, 100, 310, 100, { color: C.muted });
  s.rect(310, 70, 230, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(425, 96, 'hook(g): return g * 0.5', { font: 'mono', size: 15 });
  s.text(425, 118, 'runs before accumulation', { size: 16 });
  s.arrow(540, 100, 580, 100, { color: C.muted });
  s.rect(580, 70, 250, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(705, 96, 'x.grad += 0.5', { font: 'mono', size: 17 });
  s.text(705, 118, 'adds to the old value', { size: 16 });
  const boxes = [
    [60, ['after backward 1', 'x.grad = 0.5']],
    [340, ['after backward 2', 'x.grad = 1.0', '(0.5 + 0.5, no zero_())']],
    [620, ['zero_(), then backward', 'x.grad = 0.5']],
  ];
  for (const [bx, lines] of boxes) {
    s.rect(bx, 180, 220, 110, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(bx + 110, 212, lines[0], { size: 18, weight: 700 });
    s.text(bx + 110, 240, lines[1], { font: 'mono', size: 17 });
    if (lines[2]) s.text(bx + 110, 266, lines[2], { size: 15 });
  }
  s.arrow(280, 235, 340, 235, { color: C.muted });
  s.arrow(560, 235, 620, 235, { color: C.muted });
  s.text(440, 326, 'x.grad accumulates across backward calls unless you clear it.', { size: 18, color: C.muted });
  save('18.3-hook-accumulation.svg', s);
}

console.log('wrote 18.3 diagrams');
