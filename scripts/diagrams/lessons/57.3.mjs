import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers come from 57.3_experiment.py (run it first; it writes 57.3_data.json).
const HERE = dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(readFileSync(join(HERE, '57.3_data.json'), 'utf8'));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-57-evaluation-benchmarks/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const fmt = (x, d = 2) => x.toFixed(d);
const fmtInt = (x) => Math.round(x).toLocaleString('en-US');

// 1. Multiple-choice pipeline ----------------------------------------------
{
  const s = new Sketch(880, 250, { title: 'Pipeline from one multiple-choice item to an accuracy', seed: 5701 });
  s.text(440, 36, 'One multiple-choice item becomes one number', { size: 26, weight: 700 });
  const boxes = [
    ['Question with', 'four options A-D'],
    ['Model scores', 'each letter; take max'],
    ['Compare with', 'the answer key: 1 or 0'],
    [`Mean over`, `${fmtInt(D.mmlu_n)} items`],
  ];
  boxes.forEach(([a, b], i) => {
    const x = 30 + i * 220;
    const fill = i === 3 ? C.greenSoft : C.blueSoft;
    s.rect(x, 80, 180, 74, { color: i === 3 ? C.green : C.blue, fill, fillStyle: 'solid' });
    s.text(x + 90, 110, a, { size: 18 });
    s.text(x + 90, 136, b, { size: 18 });
    if (i < 3) s.arrow(x + 186, 117, x + 214, 117, { color: C.muted });
  });
  s.note(30, 180, 820, 52, [`Guessing at random scores 1 in 4 = ${fmt(25, 0)}%, so 25% is the floor, not 0%.`], { size: 19 });
  save('57.3-mc-pipeline.svg', s);
}

// 2. Interval half-width against number of items ---------------------------
{
  const s = new Sketch(880, 400, { title: 'Half-width of a 95% interval against the number of items', seed: 5702 });
  const X0 = 120, X1 = 480, Y0 = 330, Y1 = 80; // plot box
  const lx = (n) => X0 + ((Math.log10(n) - 2) / (Math.log10(14079) - 2)) * (X1 - X0);
  const ly = (pct) => Y0 - (pct / 9) * (Y0 - Y1);
  s.text(440, 34, 'How many items does an accuracy need?', { size: 26, weight: 700 });
  s.line(X0, Y0, X1 + 10, Y0, { color: C.ink });
  s.line(X0, Y0, X0, Y1 - 10, { color: C.ink });
  for (const pct of [0, 3, 6, 9]) {
    s.line(X0 - 6, ly(pct), X0, ly(pct), { color: C.ink });
    s.text(X0 - 14, ly(pct) + 6, `${pct}`, { size: 16, anchor: 'end', font: 'mono', color: C.muted });
  }
  s.text(X0 - 60, Y1 - 24, 'points', { size: 16, color: C.muted });
  for (const n of [100, 1000, 14079]) {
    s.text(lx(n), Y0 + 26, fmtInt(n), { size: 16, font: 'mono', color: C.muted });
  }
  s.text((X0 + X1) / 2, Y0 + 56, 'items n (log scale)', { size: 17, color: C.muted });
  // curve from the experiment (accuracy 0.60)
  const pts = D.curve.map(([n, hw]) => [lx(n), ly(hw * 100)]);
  for (let i = 1; i < pts.length; i++) {
    s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color: C.blue, width: 2.6, roughness: 0.4, bowing: 0 });
  }
  const marks = [
    [164, 'HumanEval-sized: ±' + fmt(D.hw_humaneval_60 * 100, 1)],
    [1000, 'GSM8K-sized: ±' + fmt(D.hw_gsm_60 * 100, 1)],
    [14079, 'MMLU-sized: ±'],
  ];
  for (const [n, label] of marks) {
    const hw = D.curve.find(([m]) => m === n)[1] * 100;
    const text = label.endsWith('±') ? label + fmt(hw, 1) : label;
    s.circle(lx(n), ly(hw), 12, { color: C.rose, fill: C.rose, fillStyle: 'solid' });
    s.text(lx(n) + 14, ly(hw) - 14, text, { size: 17, anchor: 'start' });
  }
  s.note(540, 70, 320, 170, [
    'Accuracy 0.60 throughout.',
    'A 3-point gap (0.60 vs 0.63) at',
    `80% power needs ${fmtInt(Math.ceil(D.n_per_group_60_vs_63))} items per model.`,
    'At n = 1,000 the power is',
    `${fmt(D.power_at_n1000, 2)}: a coin flip, not a test.`,
  ], { size: 17 });
  save('57.3-ci-vs-n.svg', s);
}

// 3. pass@k on one HumanEval problem ----------------------------------------
{
  const s = new Sketch(880, 320, { title: 'pass@k with 10 samples of which 3 pass', seed: 5703 });
  s.text(440, 34, 'pass@k: 10 samples, 3 pass the unit tests', { size: 26, weight: 700 });
  const pass = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0]; // cells: 1 = pass (3 total)
  pass.forEach((v, i) => {
    const r = Math.floor(i / 5), c = i % 5;
    const x = 50 + c * 86, y = 80 + r * 96;
    s.rect(x, y, 74, 70, { color: v ? C.green : C.rose, fill: v ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(x + 37, y + 42, v ? 'pass' : 'fail', { size: 18 });
  });
  s.text(260, 290, `pass@1 = 3/10 = ${fmt(D.pass1_n10_c3, 3)}`, { size: 19, font: 'mono' });
  s.note(500, 70, 350, 220, [
    'Draw k = 5 of the 10 samples.',
    'Chance that the 5 include a pass:',
    '1 - C(7,5)/C(10,5)',
    `= 1 - 21/252 = ${fmt(D.pass5_n10_c3, 3)}`,
    `Naive 1 - 0.7^5 = ${fmt(D.naive5_n10_c3, 3)} (biased)`,
    `Monte Carlo: ${fmt(D.mc_pass5_n10_c3, 3)}`,
  ], { size: 18 });
  save('57.3-passk-grid.svg', s);
}

// 4. Elo expected score curve -----------------------------------------------
{
  const s = new Sketch(880, 360, { title: 'Expected score against rating difference', seed: 5704 });
  const X0 = 120, X1 = 800, Y0 = 300, Y1 = 80;
  const lx = (d) => X0 + ((d + 400) / 800) * (X1 - X0);
  const ly = (e) => Y0 - e * (Y0 - Y1);
  s.text(440, 34, 'Elo: expected score from a rating gap', { size: 26, weight: 700 });
  s.line(X0, Y0, X1 + 10, Y0, { color: C.ink });
  s.line(X0, Y0, X0, Y1 - 10, { color: C.ink });
  for (const e of [0, 0.5, 1]) {
    s.line(X0 - 6, ly(e), X0, ly(e), { color: C.ink });
    s.text(X0 - 14, ly(e) + 6, fmt(e, 1), { size: 16, anchor: 'end', font: 'mono', color: C.muted });
  }
  for (const d of [-400, 0, 400]) {
    s.text(lx(d), Y0 + 26, (d > 0 ? '+' : '') + d, { size: 16, font: 'mono', color: C.muted });
  }
  s.text((X0 + X1) / 2, Y0 + 56, 'rating of A minus rating of B (Elo points)', { size: 17, color: C.muted });
  const E = (d) => 1 / (1 + 10 ** (-d / 400));
  for (let d = -400; d < 400; d += 10) {
    s.line(lx(d), ly(E(d)), lx(d + 10), ly(E(d + 10)), { color: C.blue, width: 2.6, roughness: 0.3, bowing: 0 });
  }
  const worked = [[100, D.elo_E_diff100], [400, D.elo_E_diff400]];
  for (const [d, e] of worked) {
    s.line(lx(d), ly(e), lx(d), Y0, { color: C.muted, dash: '6 8' });
    s.line(X0, ly(e), lx(d), ly(e), { color: C.muted, dash: '6 8' });
    s.circle(lx(d), ly(e), 12, { color: C.rose, fill: C.rose, fillStyle: 'solid' });
  }
  s.text(lx(100) + 16, ly(D.elo_E_diff100) + 6, `+100: ${fmt(D.elo_E_diff100, 2)}`, { size: 18, anchor: 'start' });
  s.text(lx(400) - 14, ly(D.elo_E_diff400) - 14, `+400: ${fmt(D.elo_E_diff400, 2)}`, { size: 18, anchor: 'end' });
  s.note(560, 190, 280, 72, [`1 Bradley-Terry log-odds unit`, `= ${fmt(D.bt_scale, 1)} Elo points`], { size: 18 });
  save('57.3-elo-curve.svg', s);
}

// 5. Elo order sensitivity against Bradley-Terry -------------------------------
{
  const s = new Sketch(880, 330, { title: 'Sequential Elo ratings across shuffled battle orders', seed: 5705 });
  const X0 = 90, X1 = 800, LO = -150, HI = 250;
  const lx = (v) => X0 + ((v - LO) / (HI - LO)) * (X1 - X0);
  s.text(440, 34, 'Same 800 battles, 200 orderings', { size: 26, weight: 700 });
  const yAxis = 260;
  s.line(X0, yAxis, X1, yAxis, { color: C.ink });
  for (const v of [-100, 0, 100, 200]) {
    s.line(lx(v), yAxis, lx(v), yAxis + 6, { color: C.ink });
    s.text(lx(v), yAxis + 26, (v > 0 ? '+' : '') + v, { size: 16, font: 'mono', color: C.muted });
  }
  D.elo_shuffled_top.forEach((v, i) => {
    const jitter = 140 + 40 * Math.sin(i * 2.399);
    s.circle(lx(v), jitter, 9, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.2 });
  });
  // true strength (centred) as dashed guide
  const truth = D.true_elo_centered[3];
  s.line(lx(truth), 90, lx(truth), yAxis, { color: C.green, dash: '6 8', width: 2 });
  s.text(lx(truth) + 8, 84, `true ${fmt(truth, 0)}`, { size: 17, anchor: 'start', color: C.green });
  // Bradley-Terry point and interval
  const [lo, hi] = D.bt_top_ci95;
  s.line(lx(lo), 210, lx(hi), 210, { color: C.rose, width: 4 });
  s.circle(lx(D.bt_top_point), 210, 16, { color: C.rose, fill: C.rose, fillStyle: 'solid' });
  s.text(lx(hi) + 12, 214, `Bradley-Terry ${fmt(D.bt_top_point, 0)} [${fmt(lo, 0)}, ${fmt(hi, 0)}]`, { size: 17, anchor: 'start', color: C.rose });
  s.text(440, 310, 'One dot per Elo run (200 shuffled orders). Top model, centred on the four-model mean', { size: 16, color: C.muted });
  save('57.3-elo-order.svg', s);
}
console.log('wrote 57.3 diagrams');
