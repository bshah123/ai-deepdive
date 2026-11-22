// Diagrams for 21.3 (optimizers). Run: node scripts/diagrams/lessons/21.3.mjs
// Every number comes from scripts/diagrams/lessons/21.3_data.json (written by 21.3_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-21-neural-networks/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '21.3_data.json'), 'utf8'));
const NAMES = ['SGD', 'Momentum', 'RMSprop', 'AdamW'];
const COL = { SGD: C.muted, Momentum: C.amber, RMSprop: C.green, AdamW: C.blue };
const SOFT = { SGD: C.muted, Momentum: C.amberSoft, RMSprop: C.greenSoft, AdamW: C.blueSoft };
const f3 = (x) => x.toFixed(3);

// ---------------------------------------------------------------- 21.3-update-rules.svg
{
  const s = new Sketch(880, 390, { title: 'Four update rules side by side: what each keeps between steps and the update it applies', seed: 2101 });
  s.text(440, 34, 'Same gradient g, four memories', { size: 26, weight: 700 });
  const rows = {
    SGD: { keeps: 'keeps: nothing', lines: ['w -= lr * g'] },
    Momentum: { keeps: 'keeps: v (velocity)', lines: ['v = mu*v + g', 'w -= lr * v'] },
    RMSprop: { keeps: 'keeps: s (avg of g^2)', lines: ['s = a*s + (1-a)*g^2', 'w -= lr*g/sqrt(s)'] },
    AdamW: { keeps: 'keeps: m, v, step t', lines: ['w *= 1 - lr*wd', 'm, v = EMAs of g, g^2', 'w -= lr*m^/sqrt(v^)'] },
  };
  NAMES.forEach((n, i) => {
    const x0 = 24 + i * 212, w = 196;
    s.rect(x0, 66, w, 46, { color: COL[n], fill: SOFT[n], fillStyle: 'solid' });
    s.text(x0 + w / 2, 97, n, { size: 24, weight: 700 });
    s.text(x0 + w / 2, 150, rows[n].keeps, { size: 17 });
    rows[n].lines.forEach((ln, k) => s.text(x0 + w / 2, 196 + k * 34, ln, { font: 'mono', size: 15 }));
  });
  s.text(440, 330, 'm^ and v^ are bias-corrected: divided by (1 - beta1^t) and (1 - beta2^t).', { size: 18, color: C.muted });
  s.text(440, 364, 'AdamW shrinks w first, then takes an Adam step; the decay never passes through the gradient.', { size: 18, color: C.muted });
  save('21.3-update-rules.svg', s);
}

// ---------------------------------------------------------------- 21.3-first-step.svg
{
  const h = data.hand;
  const disp = NAMES.map((n) => ({ n, d: 2.0 - h[n][0], w1: h[n][0] }));
  const s = new Sketch(880, 320, { title: 'Bar chart of how far each optimizer moves w on the first step, starting from w = 2 with lr 0.1', seed: 2102 });
  s.text(440, 34, 'One step on f(w) = w^2, starting at w = 2', { size: 26, weight: 700 });
  const X0 = 190, K = 400; // px per unit of distance
  disp.forEach((r, i) => {
    const y = 86 + i * 56;
    s.text(40, y + 16, r.n, { size: 22, weight: 700, anchor: 'start', color: COL[r.n] });
    s.rect(X0, y, r.d * K, 32, { color: COL[r.n], fill: SOFT[r.n], fillStyle: 'solid' });
    s.text(X0 + r.d * K + 14, y + 22, `moved ${f3(r.d)}  ->  w = ${f3(r.w1)}`, { font: 'mono', size: 16, anchor: 'start' });
  });
  s.text(440, 306, 'Momentum equals SGD on step 1 (its velocity starts at g). AdamW = 0.002 decay + 0.100 step.', { size: 17, color: C.muted });
  save('21.3-first-step.svg', s);
}

// ---------------------------------------------------------------- 21.3-quadratic-steps.svg
{
  const q = data.quad;
  const s = new Sketch(880, 410, { title: 'Steps to reach loss below 1e-8 on an ill-conditioned quadratic, for each optimizer at its best learning rate', seed: 2103 });
  s.text(440, 34, 'Steps to converge on an ill-conditioned bowl', { size: 26, weight: 700 });
  const BASE = 320, SCALE = 200 / 900; // 900 steps = 200 px
  const groups = [['axis', 'valley aligned with the axes', 70], ['rotated', 'same bowl, rotated 45 degrees', 480]];
  for (const [key, label, gx] of groups) {
    s.text(gx + 175, 62, label, { size: 20, weight: 700 });
    NAMES.forEach((n, i) => {
      const r = q[key][n];
      const bx = gx + i * 92, bw = 62;
      const hgt = r.steps * SCALE;
      s.rect(bx, BASE - hgt, bw, hgt, { color: COL[n], fill: SOFT[n], fillStyle: 'solid' });
      s.text(bx + bw / 2, BASE - hgt - 10, String(r.steps), { font: 'mono', size: 15 });
      s.text(bx + bw / 2, BASE + 26, n, { size: 16, weight: 700 });
      s.text(bx + bw / 2, BASE + 48, `lr ${r.best_lr.toPrecision(2)}`, { font: 'mono', size: 15 });
    });
  }
  s.line(60, BASE, 830, BASE, { color: C.ink, width: 2 });
  s.text(440, 398, 'Start (1, 0.37); curvature 1 and 100; lr grid 1e-4 to 10. Single start point, so read the pattern, not the exact count.', { size: 16, color: C.muted });
  save('21.3-quadratic-steps.svg', s);
}

// ---------------------------------------------------------------- 21.3-lr-sensitivity.svg
{
  const L = data.logistic;
  const lrs = L.lrs, idx = lrs.map((_, i) => i);
  const X = (lr) => 120 + (Math.log10(lr) + 4) / 4 * 520;           // 1e-4 .. 1 across 520 px
  const Y = (loss) => 340 - (Math.log10(loss) + 0.5229) / 3.0 * 280; // log loss, 0.3 .. 300
  const s = new Sketch(880, 440, { title: 'Final training loss after 3 epochs as a function of learning rate, for four optimizers, on log-log axes', seed: 2104 });
  s.text(440, 34, 'How sensitive is each optimizer to its learning rate?', { size: 26, weight: 700 });
  // axes and ticks
  s.line(120, 60, 120, 340, { color: C.ink, width: 2 });
  s.line(120, 340, 640, 340, { color: C.ink, width: 2 });
  for (const v of [-4, -3, -2, -1, 0]) {
    const x = X(10 ** v);
    s.line(x, 340, x, 346, { color: C.ink });
    s.text(x, 366, `1e${v}`, { font: 'mono', size: 15 });
  }
  for (const v of [0.5, 1, 3, 10, 30, 100]) {
    const y = Y(v);
    s.line(114, y, 120, y, { color: C.ink });
    s.line(120, y, 640, y, { color: C.muted, width: 1, dash: '4 8' });
    s.text(104, y + 5, String(v), { font: 'mono', size: 15, anchor: 'end' });
  }
  s.text(380, 390, 'learning rate (log scale)', { size: 19 });
  s.text(126, 78, 'loss after 3 epochs (log scale)', { size: 17, anchor: 'start' });
  // a loss of 0.5 marks the region a run can use in this toy problem
  NAMES.forEach((n) => {
    const r = L.results[n].budget_mean;
    let prev = null;
    idx.forEach((i) => {
      const v = r[i];
      if (!Number.isFinite(v)) { prev = null; return; }
      const p = [X(lrs[i]), Y(v)];
      if (prev) s.line(prev[0], prev[1], p[0], p[1], { color: COL[n], width: 2.5 });
      s.circle(p[0], p[1], 9, { color: COL[n], fill: COL[n], fillStyle: 'solid' });
      prev = p;
    });
  });
  // legend
  NAMES.forEach((n, i) => {
    const y = 120 + i * 46;
    s.line(680, y, 712, y, { color: COL[n], width: 3 });
    s.circle(696, y, 9, { color: COL[n], fill: COL[n], fillStyle: 'solid' });
    s.text(724, y + 6, n, { size: 20, weight: 700, anchor: 'start', color: COL[n] });
  });
  s.text(680, 320, `init loss ${f3(L.init_loss)}`, { font: 'mono', size: 15, anchor: 'start' });
  s.text(440, 420, 'Mean of 3 seeds, 63 minibatches of 32 per epoch. Only the learning rate varies within each line.', { size: 16, color: C.muted });
  save('21.3-lr-sensitivity.svg', s);
}
console.log('wrote 4 SVGs to', OUT);
