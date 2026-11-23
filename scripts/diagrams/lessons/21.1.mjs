// Diagrams for Lesson 21.1 (Perceptrons & MLPs from scratch). Run: node scripts/diagrams/lessons/21.1.mjs
// Numbers: the XOR hand weights and hidden activations are from the lesson's own code;
// the loss curve and the hidden-width sweep are from scripts/diagrams/lessons/21.1_data.py (21.1_data.json).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-21-neural-networks/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '21.1_data.json'), 'utf8'));

// 1. one perceptron
{
  const s = new Sketch(880, 340, { title: 'A perceptron: weighted sum, then a step', seed: 101 });
  s.text(440, 40, 'One perceptron', { size: 26, weight: 700 });
  s.circle(110, 120, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 127, 'x1', { font: 'mono', size: 20 });
  s.circle(110, 250, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(110, 257, 'x2', { font: 'mono', size: 20 });
  s.arrow(140, 124, 330, 172, { color: C.muted });
  s.text(222, 130, 'w1', { font: 'mono', size: 20, color: C.muted });
  s.arrow(140, 246, 330, 198, { color: C.muted });
  s.text(222, 236, 'w2', { font: 'mono', size: 20, color: C.muted });
  s.rect(330, 140, 140, 90, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(400, 191, ['z = w·x + b'], { font: 'mono', size: 18 });
  s.arrow(470, 185, 560, 185, { color: C.muted });
  s.rect(560, 150, 140, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(630, 191, 'step(z)', { font: 'mono', size: 20 });
  s.arrow(700, 185, 770, 185, { color: C.muted });
  s.text(810, 193, 'y', { font: 'mono', size: 26, weight: 700 });
  s.text(630, 262, ['y = 1 if z >= 0, else 0'], { size: 18 });
  s.text(440, 318, 'Learned: w1, w2, b. Fixed: the step.', { size: 18, color: C.muted });
  save('21.1-perceptron.svg', s);
}

// 2. XOR: input space vs hidden space
{
  const s = new Sketch(880, 400, { title: 'XOR points in input space and in hidden space', seed: 102 });
  const k = 150;
  const P = (ox, oy, a, b) => [ox + a * k, oy - b * k];
  const dot = (ox, oy, a, b, label) => {
    const [x, y] = P(ox, oy, a, b);
    const col = label === 1 ? C.amber : C.blue;
    const soft = label === 1 ? C.amberSoft : C.blueSoft;
    s.circle(x, y, 40, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x, y + 7, String(label), { font: 'mono', size: 20, weight: 700 });
  };
  // left panel: input space
  s.text(240, 45, 'Input space (x1, x2)', { size: 22, weight: 700 });
  s.line(120, 300, 340, 300, { color: C.muted });
  s.line(150, 330, 150, 120, { color: C.muted });
  dot(150, 300, 0, 0, 0); dot(150, 300, 0, 1, 1);
  dot(150, 300, 1, 0, 1); dot(150, 300, 1, 1, 0);
  s.text(345, 306, 'x1', { font: 'mono', size: 18, color: C.muted });
  s.text(150, 118, 'x2', { font: 'mono', size: 18, color: C.muted });
  // middle: the hidden layer
  s.arrow(375, 215, 530, 215, { color: C.muted });
  s.text(452, 190, ['two hidden', 'units'], { size: 18 });
  // right panel: hidden space
  s.text(700, 45, 'Hidden space (h1, h2)', { size: 22, weight: 700 });
  s.line(590, 300, 800, 300, { color: C.muted });
  s.line(620, 330, 620, 120, { color: C.muted });
  dot(620, 300, 0, 0, 0); dot(620, 300, 1, 0, 1); dot(620, 300, 1, 1, 0);
  s.line(...P(620, 300, 0.5, 0), ...P(620, 300, 1.3, 0.8), { color: C.ink, dash: '6 8' });
  s.text(770, 340, ['(0,1) and (1,0)', 'both land here'], { size: 17, color: C.muted });
  s.text(700, 215, 'separating line', { size: 18, color: C.ink });
  s.text(440, 382, 'In hidden space one straight line separates the two classes.', { size: 18, color: C.muted });
  save('21.1-xor-spaces.svg', s);
}

// 3. the hand-built XOR network
{
  const s = new Sketch(880, 400, { title: 'Hand-built XOR network', seed: 103 });
  s.text(265, 60, 'every input-to-hidden weight = +1', { size: 18, color: C.muted });
  s.circle(120, 130, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 137, 'x1', { font: 'mono', size: 20 });
  s.circle(120, 270, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 277, 'x2', { font: 'mono', size: 20 });
  s.rect(380, 95, 110, 70, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(435, 122, ['h1 = OR', 'b = -0.5'], { font: 'mono', size: 18 });
  s.rect(380, 235, 110, 70, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(435, 262, ['h2 = AND', 'b = -1.5'], { font: 'mono', size: 18 });
  s.arrow(150, 130, 380, 130, { color: C.muted });
  s.arrow(150, 270, 380, 270, { color: C.muted });
  s.arrow(150, 130, 380, 270, { color: C.muted });
  s.arrow(150, 270, 380, 130, { color: C.muted });
  s.rect(700, 165, 110, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(755, 192, ['y = step', 'b = -0.5'], { font: 'mono', size: 18 });
  s.arrow(490, 130, 700, 185, { color: C.muted });
  s.text(600, 135, '+1', { font: 'mono', size: 22, weight: 700 });
  s.arrow(490, 270, 700, 215, { color: C.muted });
  s.text(600, 265, '-1', { font: 'mono', size: 22, weight: 700 });
  s.note(190, 330, 500, 50, ['y = h1 AND NOT h2  =  XOR'], { size: 20 });
  save('21.1-xor-network.svg', s);
}

// 4. training loss, seed 0, log scale
{
  const s = new Sketch(880, 380, { title: 'Training loss for one MLP run on XOR', seed: 104 });
  s.text(440, 40, 'Training loss, seed 0 (log scale)', { size: 24, weight: 700 });
  const x0 = 110, x1 = 800, y0 = 300, y1 = 70;             // plot box
  const ex = (e) => x0 + (e / 5000) * (x1 - x0);
  const ly = (L) => y0 - ((Math.log10(L) + 3) / 2.477) * (y0 - y1); // 1e-3 at bottom, 0.3 at top
  s.line(x0, y0, x1, y0, { color: C.muted });
  s.line(x0, y1, x0, y0, { color: C.muted });
  for (const L of [0.3, 0.1, 0.03, 0.01, 0.001]) {
    s.text(x0 - 12, ly(L) + 5, String(L), { font: 'mono', size: 16, anchor: 'end', color: C.muted });
  }
  for (const e of [0, 1000, 2000, 3000, 4000, 5000]) {
    s.text(ex(e), y0 + 26, String(e), { font: 'mono', size: 16, color: C.muted });
  }
  s.text(455, y0 + 56, 'epoch (full-batch gradient descent)', { size: 18, color: C.muted });
  const pts = data.curve.map(([e, L]) => [ex(e), ly(L)]);
  for (let i = 1; i < pts.length; i++) {
    s.line(...pts[i - 1], ...pts[i], { color: C.blue, width: 3 });
  }
  const marks = [[1, 'epoch 1: 0.1715'], [1000, 'epoch 1000: 0.1237'], [2000, 'epoch 2000: 0.1093'], [5000, 'epoch 5000: 0.0050']];
  const byEpoch = Object.fromEntries(data.curve);
  for (const [e, txt] of marks) {
    const L = byEpoch[e];
    s.circle(ex(e), ly(L), 12, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  }
  s.text(ex(1) + 30, ly(0.1715) - 14, 'epoch 1: 0.1715', { size: 17, anchor: 'start' });
  s.text(ex(1000) + 4, ly(0.1237) - 26, 'epoch 1000: 0.1237', { size: 17, anchor: 'start' });
  s.text(ex(2000) - 6, ly(0.1093) + 34, 'epoch 2000: 0.1093', { size: 17, anchor: 'start' });
  s.text(ex(5000) - 12, ly(0.0050) + 34, 'epoch 5000: 0.0050', { size: 17, anchor: 'end' });
  save('21.1-training-loss.svg', s);
}
