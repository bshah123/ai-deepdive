import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-59-reasoning-models/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below comes from 59.1_data.json, written by 59.1_experiment.py.
const D = JSON.parse(readFileSync(join(HERE, '59.1_data.json'), 'utf8'));

// 1. Direct answer versus written steps.
{
  const s = new Sketch(880, 320, { title: 'Direct answer versus chain of thought as two flows', seed: 591 });
  s.text(440, 36, 'Same question, two ways to spend tokens', { size: 26, weight: 700 });

  // Row 1: direct
  s.text(60, 104, 'direct', { size: 20, anchor: 'start', color: C.muted });
  s.rect(60, 116, 150, 58, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(135, 151, 'question', { size: 19 });
  s.arrow(210, 145, 330, 145, { color: C.ink });
  s.rect(330, 116, 290, 58, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(475, 143, 'one forward pass', { size: 19 });
  s.text(475, 165, 'at most 2 maps in sequence', { size: 16, color: C.muted });
  s.arrow(620, 145, 690, 145, { color: C.ink });
  s.rect(690, 116, 130, 58, { color: C.ink, fillStyle: 'solid', fill: C.amberSoft });
  s.text(755, 151, 'answer', { size: 19 });

  // Row 2: chain of thought
  s.text(60, 232, 'chain of thought', { size: 20, anchor: 'start', color: C.muted });
  s.rect(60, 244, 130, 50, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(125, 274, 'question', { size: 18 });
  const xs = [230, 350, 470, 590];
  const labels = ['state 1', 'state 2', 'state 3', '...'];
  let prevX = 190;
  xs.forEach((x, i) => {
    s.arrow(prevX, 269, x - 4, 269, { color: C.ink });
    s.rect(x, 244, 92, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + 46, 274, labels[i], { size: 17 });
    prevX = x + 92;
  });
  s.arrow(prevX, 269, 712, 269, { color: C.ink });
  s.rect(712, 244, 110, 50, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(767, 274, 'answer', { size: 18 });
  s.text(440, 312, 'each written state is one more sequential step the model can build on', { size: 17, color: C.muted });
  save('59.1-direct-vs-cot.svg', s);
}

// 2. Accuracy versus chain length (measured, toy model).
{
  const s = new Sketch(880, 360, { title: 'Accuracy falls with chain length for a fixed-depth answerer; chain of thought holds', seed: 592 });
  s.text(440, 34, 'Accuracy versus number of maps in the chain (toy model)', { size: 24, weight: 700 });
  const x0 = 120, x1 = 790, yTop = 140, yBot = 300;
  const nMin = 1, nMax = 32;
  const px = (n) => x0 + ((n - nMin) / (nMax - nMin)) * (x1 - x0);
  const py = (a) => yBot - a * (yBot - yTop);

  // Axes and ticks
  s.line(x0, yBot, x1, yBot, { color: C.muted });
  s.line(x0, yTop, x0, yBot, { color: C.muted });
  [0, 0.5, 1].forEach((a) => {
    s.line(x0 - 6, py(a), x0, py(a), { color: C.muted });
    s.text(x0 - 12, py(a) + 6, a.toFixed(1), { size: 16, anchor: 'end', font: 'mono', color: C.muted });
  });
  [1, 8, 16, 24, 32].forEach((n) => {
    s.text(px(n), yBot + 26, String(n), { size: 16, font: 'mono', color: C.muted });
  });
  s.text((x0 + x1) / 2, yBot + 54, 'chain length n (maps applied in sequence)', { size: 17, color: C.muted });

  const series = (key, color) => {
    const pts = D.e1.map((r) => [px(r.n), py(r[key])]);
    for (let i = 1; i < pts.length; i++) s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color, width: 3 });
    pts.forEach(([x, y]) => s.circle(x, y, 9, { color, fill: color, fillStyle: 'solid' }));
  };
  // Chance reference
  s.line(x0, py(D.chance), x1, py(D.chance), { color: C.muted, dash: '6 8' });
  s.text(x1 - 4, py(D.chance) - 8, 'chance 1/7', { size: 16, anchor: 'end', color: C.muted });
  series('cot_ideal', C.green);
  series('cot_noisy', C.amber);
  series('direct', C.rose);

  // Legend
  s.text(470, 72, 'chain of thought, ideal', { size: 17, anchor: 'start', color: C.green });
  s.text(470, 94, 'chain of thought, 2% error per step', { size: 17, anchor: 'start', color: C.amber });
  s.text(470, 116, 'direct, 2 maps in one pass', { size: 17, anchor: 'start', color: C.rose });
  save('59.1-serial-depth.svg', s);
}

// 3. Self-consistency: vote over k samples.
{
  const q = D.e2.q_single;
  const ks = Object.keys(D.e2.vote).map(Number);
  const s = new Sketch(880, 360, { title: 'Majority vote over k sampled chains raises accuracy above one chain', seed: 593 });
  s.text(440, 34, 'Plurality vote over k chains, each right with probability 0.35', { size: 24, weight: 700 });
  const base = 300, top = 90, scale = base - top;
  const x0 = 120, x1 = 660;
  s.line(x0, base, x1, base, { color: C.muted });
  const slot = (x1 - x0) / ks.length;
  ks.forEach((k, i) => {
    const acc = D.e2.vote[String(k)];
    const cx = x0 + slot * (i + 0.5);
    const h = acc * scale;
    s.rect(cx - 36, base - h, 72, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 10, acc.toFixed(2), { size: 17, font: 'mono' });
    s.text(cx, base + 28, `k = ${k}`, { size: 17, font: 'mono', color: C.muted });
  });
  const yq = base - q * scale;
  s.line(x0, yq, x1 + 10, yq, { color: C.rose, dash: '6 8', width: 2.5 });
  s.text(x1 + 20, yq - 4, ['one chain', `${q.toFixed(2)}`], { size: 17, anchor: 'start', color: C.rose });
  s.note(690, 92, 170, 100,['errors assumed', 'independent, so this', 'is an upper bound'], { size: 16 });
  save('59.1-self-consistency.svg', s);
}

// 4. System 1 versus System 2 as a mapping onto computation.
{
  const s = new Sketch(880, 330, { title: 'System 1 and System 2 as fixed versus growing computation per answer', seed: 594 });
  s.text(440, 34, 'Two modes, one difference: how much sequential work an answer gets', { size: 24, weight: 700 });
  s.rect(40, 70, 390, 190, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(235, 110, 'System 1: fast, intuitive', { size: 22, weight: 700 });
  s.text(235, 150, ['one forward pass', 'fixed compute per token', 'answer emitted at once'], { size: 19 });
  s.rect(450, 70, 390, 190, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(645, 110, 'System 2: slow, deliberate', { size: 22, weight: 700 });
  s.text(645, 150, ['tokens written as steps', 'each step reads the last', 'compute grows with length'], { size: 19 });
  s.text(440, 300, 'a metaphor for models: more tokens means more sequential computation', { size: 17, color: C.muted });
  save('59.1-system-analogy.svg', s);
}
console.log('wrote 59.1 diagrams');
