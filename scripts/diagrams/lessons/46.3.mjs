import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-07-frameworks/chapter-46-dspy/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below is copied from the output of the lesson's two code blocks (block1.py, block2.py).

// 1. The optimizer fills slots; the code does not change.
{
  const s = new Sketch(880, 300, { title: 'A program with empty slots goes into an optimizer and comes out with filled slots', seed: 4601 });
  s.text(440, 40, 'The optimizer fills slots; the code stays the same', { size: 26, weight: 700 });
  s.note(40, 80, 280, 150, ['Program (code, fixed)', 'predictor: classify', '  instruction: (none)', '  demos: []'], { size: 18 });
  s.arrow(330, 155, 385, 155, { color: C.muted });
  s.rect(390, 110, 150, 90, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(465, 140, ['Optimizer', '+ trainset', '+ metric'], { size: 18 });
  s.arrow(550, 155, 600, 155, { color: C.muted });
  s.note(610, 80, 230, 150, ['Compiled program', 'instruction: "Classify..."', 'demos: 4 traces'], { size: 18 });
  s.text(440, 262, 'Same forward code. Only the state the optimizer wrote changes.', { size: 19, color: C.muted });
  save('46.3-optimizer-compiles.svg', s);
}

// 2. BootstrapFewShot keeps only the teacher traces that pass the metric.
{
  const s = new Sketch(880, 330, { title: 'Bootstrapping: pass or fail for each training example, stop at 4 passes', seed: 4602 });
  s.text(440, 36, 'Bootstrapping keeps only traces that pass the metric', { size: 26, weight: 700 });
  s.note(40, 60, 360, 60, ['Teacher program, exact-match metric', 'verdict per training example 0 to 6'], { size: 17 });
  const verdicts = ['pass', 'pass', 'pass', 'fail', 'fail', 'fail', 'pass']; // block1.py output
  verdicts.forEach((v, i) => {
    const x = 42 + i * 116;
    const ok = v === 'pass';
    s.rect(x, 160, 100, 72, { color: ok ? C.green : C.rose, fill: ok ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(x + 50, 188, 'ex ' + i, { size: 18, font: 'mono' });
    s.text(x + 50, 216, v, { size: 18, weight: 700 });
  });
  s.text(440, 275, 'Demos kept: examples 0, 1, 2 and 6 (4 passes, so the loop stops)', { size: 21, weight: 700 });
  s.text(440, 306, '3 failed traces are discarded: examples 3, 4 and 5', { size: 18, color: C.muted });
  save('46.3-bootstrap-loop.svg', s);
}

// 3. Three stages of a MIPROv2-style optimizer.
{
  const s = new Sketch(880, 340, { title: 'Three stages of a MIPROv2-style optimizer', seed: 4603 });
  s.text(440, 36, 'Three stages of a MIPROv2-style optimizer', { size: 26, weight: 700 });
  const boxes = [
    [40, '1  Bootstrap demos', ['run the teacher on trainset', 'keep passing traces as demos'], C.blue, C.blueSoft],
    [330, '2  Propose instructions', ['draft from program code,', 'data summary and demos'], C.amber, C.amberSoft],
    [620, '3  Search combinations', ['each trial: one instruction', 'and one demo set per module'], C.green, C.greenSoft],
  ];
  for (const [x, head, lines, col, soft] of boxes) {
    s.rect(x, 62, 220, 104, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 110, 92, head, { size: 20, weight: 700 });
    s.text(x + 110, 120, lines[0], { size: 16 });
    s.text(x + 110, 144, lines[1], { size: 16 });
  }
  s.arrow(262, 114, 328, 114, { color: C.muted });
  s.arrow(552, 114, 618, 114, { color: C.muted });
  s.grid(40, 200, 3, 4, 40, { color: C.ink });
  s.text(290, 228, '12 candidate programs: 3 instructions x 4 demo sets', { size: 20, weight: 700, anchor: 'start' });
  s.text(290, 258, 'Each trial scores one candidate on a minibatch of examples.', { size: 18, color: C.muted, anchor: 'start' });
  s.text(290, 284, 'The current best is re-checked on a full validation set.', { size: 18, color: C.muted, anchor: 'start' });
  save('46.3-mipro-stages.svg', s);
}

// 4. Minibatch score vs test accuracy, run 0 (first run, not chosen for the picture).
{
  const s = new Sketch(880, 460, { title: 'Run 0: minibatch score against test accuracy for 12 candidates', seed: 4604 });
  const X0 = 130, X1 = 600, Y0 = 330, Y1 = 90;
  const px = (x) => X0 + ((x - 0.5) / 0.4) * (X1 - X0);
  const py = (y) => Y0 - ((y - 0.6) / 0.3) * (Y0 - Y1);
  s.text(440, 36, 'Run 0: minibatch score against test accuracy, 12 candidates', { size: 24, weight: 700 });
  s.line(X0, Y0, X1, Y0, { color: C.muted });
  s.line(X0, Y0, X0, Y1, { color: C.muted });
  for (const x of [0.5, 0.6, 0.7, 0.8, 0.9]) {
    s.line(px(x), Y0, px(x), Y0 + 6, { color: C.muted });
    s.text(px(x), Y0 + 28, x.toFixed(1), { size: 16, font: 'mono' });
  }
  for (const y of [0.6, 0.7, 0.8, 0.9]) {
    s.text(X0 - 14, py(y) + 5, y.toFixed(1), { size: 16, font: 'mono', anchor: 'end' });
  }
  s.text((X0 + X1) / 2, Y0 + 58, 'minibatch score (35 validation examples)', { size: 18 });
  s.text(62, (Y0 + Y1) / 2, 'test accuracy (300 held-out)', { size: 18, rotate: -90 });
  // [minibatch, test] for the 12 candidates in run 0 (block2.py output); candidate 9 = rule A, candidate 6 = rule B.
  const pts = [[0.857, 0.837], [0.829, 0.837], [0.829, 0.797], [0.771, 0.813], [0.743, 0.69], [0.714, 0.75],
               [0.686, 0.723], [0.686, 0.683], [0.686, 0.78], [0.657, 0.62], [0.629, 0.637], [0.571, 0.72]];
  pts.forEach(([mx, tx], i) => {
    const col = i === 0 ? C.amber : i === 1 ? C.green : C.blue;
    const soft = i === 0 ? C.amberSoft : i === 1 ? C.greenSoft : C.blueSoft;
    s.circle(px(mx), py(tx), 14, { color: col, fill: soft, fillStyle: 'solid' });
  });
  s.circle(640, 120, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(664, 126, 'rule A winner: candidate 9', { size: 18, anchor: 'start' });
  s.circle(640, 152, 14, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(664, 158, 'rule B winner: candidate 6', { size: 18, anchor: 'start' });
  s.text(440, 432, 'Scatter is the minibatch noise: sd about 0.08 at 35 items. Points are not selected.', { size: 17, color: C.muted });
  save('46.3-minibatch-scatter.svg', s);
}

// 5. Mean test accuracy over 500 runs, four selection rules.
{
  const s = new Sketch(880, 430, { title: 'Mean test accuracy over 500 runs', seed: 4605 });
  const base = 310, scale = 250;
  s.text(440, 36, 'Mean test accuracy over 500 runs (bars start at zero)', { size: 24, weight: 700 });
  const bars = [
    [110, 0.741, ['average', 'candidate'], C.rose, C.roseSoft],
    [290, 0.812, ['rule A:', 'best minibatch'], C.amber, C.amberSoft],
    [470, 0.835, ['rule B:', 'top 3, then', 'confirm set'], C.green, C.greenSoft],
    [650, 0.837, ['oracle:', 'best on test'], C.blue, C.blueSoft],
  ];
  for (const [x, v, labels, col, soft] of bars) {
    const h = v * scale;
    s.rect(x, base - h, 120, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 60, base - h - 12, v.toFixed(3), { size: 20, weight: 700 });
    s.text(x + 60, base + 26, labels, { size: 17 });
  }
  s.line(70, base, 830, base, { color: C.ink });
  s.text(440, 404, 'Rule A loses 0.025 to the oracle; rule B loses 0.002 (oracle is not attainable).', { size: 18, color: C.muted });
  save('46.3-selection-rules.svg', s);
}
