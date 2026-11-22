import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers come from 22.2_experiment.py, which writes 22.2_data.json next to this file.
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-22-traditional-nlp/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '22.2_data.json'), 'utf8'));
const f3 = (x) => x.toFixed(3);

// 1. Skip-gram versus CBOW: same window, opposite direction of prediction
{
  const s = new Sketch(880, 380, { title: 'Skip-gram and CBOW with the same window, in opposite directions', seed: 201 });
  s.text(215, 36, 'Skip-gram: centre word predicts each context word', { size: 19, weight: 700 });
  s.text(655, 36, 'CBOW: context words predict the centre word', { size: 19, weight: 700 });
  s.line(440, 56, 440, 330, { color: C.muted, dash: '6 8' });
  // skip-gram: one input, several outputs
  s.rect(180, 80, 90, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(225, 106, 'sat', { font: 'mono', size: 18 });
  const ctx = ['the', 'cat', 'on', 'the'];
  const xs = [70, 165, 285, 380];
  ctx.forEach((w, i) => {
    s.arrow(225, 122, xs[i], 234, { color: C.muted });
    s.rect(xs[i] - 38, 240, 76, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(xs[i], 266, w, { font: 'mono', size: 18 });
  });
  s.text(215, 322, 'Window 2 around "sat" in "the cat sat on the":', { size: 17 });
  s.text(215, 346, 'four pairs, one per context word', { size: 17 });
  // CBOW: several inputs, one output
  const cx = [520, 600, 690, 770];
  cx.forEach((x, i) => {
    s.rect(x - 35, 80, 70, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x, 106, ctx[i], { font: 'mono', size: 18 });
    s.arrow(x, 122, 655, 184, { color: C.muted });
  });
  s.rect(585, 186, 140, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(655, 212, 'average', { size: 19 });
  s.arrow(655, 228, 655, 246, { color: C.muted });
  s.rect(615, 250, 80, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(655, 276, 'sat', { font: 'mono', size: 18 });
  s.text(655, 322, 'One example: four context words', { size: 17 });
  s.text(655, 346, 'are averaged and scored against "sat"', { size: 17 });
  save('22.2-architectures.svg', s);
}

// 2. One negative-sampling update in 2-d, with the numbers from the experiment
{
  const h = D.hand;
  const s = new Sketch(880, 420, { title: 'One negative-sampling update, two dimensions, learning rate 0.1', seed: 202 });
  s.text(440, 34, 'One update, in two dimensions', { size: 24, weight: 700 });
  const ox = 230, oy = 320, S = 180;
  const P = (v) => [ox + v[0] * S, oy - v[1] * S];
  s.line(40, oy, 420, oy, { color: C.muted, width: 1.5 });
  s.line(ox, 80, ox, 360, { color: C.muted, width: 1.5 });
  const [vx, vy] = P(h.v), [px, py] = P(h.u_pos), [nx, ny] = P(h.u_neg);
  s.arrow(ox, oy, vx, vy, { color: C.ink, width: 3 });
  s.text(vx + 22, vy + 6, 'v (centre)', { size: 19, anchor: 'start', color: C.ink });
  s.arrow(ox, oy, px, py, { color: C.green, width: 3 });
  s.text(px - 4, py - 14, 'u+ (true context)', { size: 19, color: C.green });
  s.arrow(ox, oy, nx, ny, { color: C.rose, width: 3 });
  s.text(nx - 6, ny + 28, 'u- (noise word)', { size: 19, color: C.rose });
  s.text(60, 380, `v.u+ = ${h.s_pos.toFixed(2)}  (acute angle: score up)`, { size: 17, anchor: 'start' });
  s.text(60, 404, `v.u- = ${h.s_neg.toFixed(2)}  (obtuse angle: score down)`, { size: 17, anchor: 'start' });
  // numbers
  s.note(470, 70, 380, 300, [
    'Step by step (values from the experiment):',
    `1. score: s+ = ${h.s_pos.toFixed(3)}, s- = ${h.s_neg.toFixed(3)}`,
    `2. sigmoid: ${f3(h.sig_pos)} and ${f3(h.sig_neg)}`,
    `3. loss: ${f3(h.loss_pos)} + ${f3(h.loss_neg)}`,
    `4. gradient g+ = ${h.g_pos.toFixed(3)}, g- = ${h.g_neg.toFixed(3)}`,
    `5. grad v = (${h.grad_v.map((x) => x.toFixed(3)).join(', ')})`,
    `6. after the step: s+ = ${h.s_pos_new.toFixed(3)} (up)`,
    `    s- = ${h.s_neg_new.toFixed(3)} (down)`,
  ], { size: 18 });
  save('22.2-sgns-update.svg', s);
}

// 3. Noise distribution: unigram versus count^(3/4)
{
  const ne = D.noise_example;
  const s = new Sketch(880, 380, { title: 'Noise distribution: unigram versus count to the power 3/4', seed: 203 });
  s.text(440, 34, 'Sampling a noise word: unigram versus count^(3/4)', { size: 24, weight: 700 });
  const base = 318, H = 176;
  s.line(90, base, 800, base, { color: C.muted, width: 1.5 });
  s.rect(40, 70, 26, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(74, 85, 'unigram: count / total', { size: 18, anchor: 'start' });
  s.rect(420, 70, 26, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(454, 85, 'count^(3/4), normalised', { size: 18, anchor: 'start' });
  const names = ['word A (count 100)', 'word B (count 10)', 'word C (count 1)'];
  const groups = [220, 440, 660];
  names.forEach((nm, i) => {
    const u = ne.unigram[i], p = ne.power34[i];
    const hu = u * H, hp = p * H;
    s.rect(groups[i] - 56, base - hu, 52, hu, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(groups[i] + 4, base - hp, 52, hp, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(groups[i] - 30, base - hu - 8, u.toFixed(3), { size: 17 });
    s.text(groups[i] + 30, base - hp - 8, p.toFixed(3), { size: 17 });
    s.text(groups[i], base + 30, nm, { size: 18 });
  });
  const ratio = ne.power34[2] / ne.unigram[2];
  s.text(440, 356, `the rare word is drawn ${ratio.toFixed(1)} times as often, not 1.0 times`, { size: 17 });
  save('22.2-noise-distribution.svg', s);
}

// 4. Measured cosine(cat, car) over five seeds and two learning rates
{
  const s = new Sketch(880, 440, { title: 'cosine similarity of cat and car over five seeds', seed: 204 });
  s.text(440, 34, 'cos(cat, car) over five seeds (each dot is one run)', { size: 24, weight: 700 });
  const X = (c) => 300 + ((c - 0.5) / 0.5) * 520;
  const rows = [
    ['SGNS, lr 0.05', D.seeds.sg.cat_car, C.blue, 0],
    ['SGNS, lr 0.025', D.sensitivity_cat_car.sg_lr0_025 ?? D.sensitivity_cat_car['sg_lr0.025'], C.blue, 1],
    ['CBOW, lr 0.05', D.seeds.cbow.cat_car, C.amber, 2],
    ['CBOW, lr 0.025', D.sensitivity_cat_car['cbow_lr0.025'], C.amber, 3],
  ];
  const y0 = 120, dy = 62;
  s.line(X(0.5), y0 - 30, X(0.5), y0 + 3 * dy + 30, { color: C.muted, dash: '6 8' });
  rows.forEach(([label, vals, col, i]) => {
    const y = y0 + i * dy;
    s.text(20, y + 6, label, { size: 18, anchor: 'start' });
    s.line(X(0.5), y, X(1.0), y, { color: C.muted, width: 1 });
    vals.forEach((v, k) => s.circle(X(v), y + (k % 2 ? -7 : 7), 14, { color: col, fill: col, fillStyle: 'solid' }));
  });
  const ay = y0 + 3 * dy + 40;
  s.line(X(0.5), ay, X(1.0), ay, { color: C.muted });
  [0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach((t) => {
    s.line(X(t), ay, X(t), ay + 6, { color: C.muted });
    s.text(X(t), ay + 28, t.toFixed(1), { size: 16 });
  });
  s.text(440, ay + 58, 'Lower cosine = the two words point in different directions.', { size: 17 });
  s.text(440, ay + 82, 'Halving the learning rate removes the separation: a fragile result.', { size: 17 });
  save('22.2-cosine-seeds.svg', s);
}
console.log('ok');
