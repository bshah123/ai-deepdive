import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-57-evaluation-benchmarks/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from 57.2_experiment.py (run it first): 57.2_data.json
const D = JSON.parse(readFileSync(join(HERE, '57.2_data.json'), 'utf8'));

{
  const s = new Sketch(880, 250, { title: 'G-Eval-style scoring pipeline', seed: 5701 });
  s.text(440, 40, 'The score is a probability-weighted average of score tokens', { size: 22, weight: 700 });
  const labels = [['Task and', 'criteria'], ['Model writes', 'eval steps'], ['Model fills', 'score form'],
    ['Probability of', 'each score'], ['Sum of', 'p(s) times s']];
  const xs = [30, 202, 375, 547, 720];
  labels.forEach(([a, b], i) => {
    const hot = i >= 3;
    s.rect(xs[i], 80, 130, 64, { color: hot ? C.amber : C.blue, fill: hot ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(xs[i] + 65, 106, [a, b], { size: 17 });
    if (i < 4) s.arrow(xs[i] + 134, 112, xs[i + 1] - 4, 112, { color: C.muted });
  });
  s.note(60, 168, 760, 52, ['Amber boxes need the probabilities. A judge API that returns only text gives a hard score.'], { size: 18 });
  save('57.2-judge-pipeline.svg', s);
}

{
  const p = D.worked.p, E = D.worked.expected, argmax = D.worked.argmax;
  const s = new Sketch(880, 340, { title: "Judge's probabilities over score tokens", seed: 5702 });
  s.text(440, 36, "The judge's probability for each score token", { size: 24, weight: 700 });
  const base = 300, k = 400;
  p.forEach((pi, i) => {
    const cx = 150 + i * 120, h = pi * k;
    s.rect(cx - 30, base - h, 60, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 10, pi.toFixed(2), { font: 'mono', size: 16 });
    s.text(cx, base + 28, String(i + 1), { size: 20, weight: 700 });
  });
  s.line(40, base, 640, base, { color: C.muted });
  const ex = 150 + (E - 1) * 120;
  s.line(ex, 92, ex, base + 4, { color: C.rose, dash: '6 8', width: 2 });
  s.text(ex + 8, 84, `expected = ${E.toFixed(2)}`, { size: 19, color: C.rose, anchor: 'start' });
  s.note(690, 120, 170, 96, [`Argmax (hard) = ${argmax}`, `Weighted = ${E.toFixed(2)}`], { size: 18 });
  save('57.2-weighted-score.svg', s);
}

{
  const s = new Sketch(880, 300, { title: 'Swap test decision table', seed: 5703 });
  s.text(440, 36, 'Swap test: keep a verdict only if both orders agree', { size: 24, weight: 700 });
  s.text(290, 80, 'call 1: A first', { size: 18 });
  s.text(590, 80, 'call 2: B first', { size: 18 });
  s.text(785, 80, 'verdict', { size: 18 });
  const rows = [
    { y: 130, label: 'consistent', c1: 'judge picks slot 1 (A)', c2: 'judge picks slot 2 (A)', v: 'A wins', col: C.green, soft: C.greenSoft },
    { y: 215, label: 'position flip', c1: 'judge picks slot 1 (A)', c2: 'judge picks slot 1 (B)', v: 'tie', col: C.amber, soft: C.amberSoft },
  ];
  rows.forEach((r) => {
    s.text(40, r.y + 6, r.label, { size: 18, anchor: 'start' });
    s.rect(190, r.y - 30, 200, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(290, r.y + 5, r.c1, { size: 17 });
    s.rect(490, r.y - 30, 200, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(590, r.y + 5, r.c2, { size: 17 });
    s.rect(720, r.y - 30, 130, 52, { color: r.col, fill: r.soft, fillStyle: 'solid' });
    s.text(785, r.y + 6, r.v, { size: 20, weight: 700 });
  });
  const b0 = D.bias[0], b1 = D.bias[2];
  s.text(440, 282, `Simulated tie rate: ${b0.tie_rate.toFixed(3)} at beta 0.0, ${b1.tie_rate.toFixed(3)} at beta 1.0`, { size: 18 });
  save('57.2-swap-test.svg', s);
}

{
  const s = new Sketch(880, 400, { title: 'Position bias in a simulated pairwise judge', seed: 5704 });
  s.text(440, 36, 'Slot-1 preference grows with beta; swapping removes some verdicts', { size: 22, weight: 700 });
  const series = [['slot-1 pick', 'slot1_pref_rate', C.rose, C.roseSoft],
    ['consistent', 'consistency', C.amber, C.amberSoft],
    ['naive accuracy', 'naive_acc', C.blue, C.blueSoft],
    ['accuracy on decided', 'swap_acc_decided', C.green, C.greenSoft]];
  series.forEach(([name, , col, soft], j) => {
    const x = 60 + j * 200;
    s.rect(x, 62, 16, 16, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 24, 76, name, { size: 17, anchor: 'start' });
  });
  const base = 340, k = 240;
  D.bias.forEach((r, g) => {
    const gx = 150 + g * 290;
    series.forEach(([, key, col, soft], j) => {
      const v = r[key], h = v * k, bx = gx - 104 + j * 54;
      s.rect(bx, base - h, 46, h, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(bx + 23, base - h - 8, v.toFixed(3), { font: 'mono', size: 15 });
    });
    s.text(gx, base + 34, `beta = ${r.beta.toFixed(1)}`, { size: 20, weight: 700 });
  });
  s.line(40, base, 840, base, { color: C.muted });
  save('57.2-position-bias.svg', s);
}
