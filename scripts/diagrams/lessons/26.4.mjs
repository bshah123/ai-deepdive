import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-26-transformer-architecture/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// every number below comes from 26.4_experiment.py (run once; output in 26.4_data.json)
const D = JSON.parse(readFileSync(join(HERE, '26.4_data.json'), 'utf8'));
const f3 = (v) => v.toFixed(3);
const pct = (v) => (100 * v).toFixed(1) + '%';

// 1. One MoE layer: router picks 2 of 8 experts
{
  const s = new Sketch(880, 380, { title: 'One mixture-of-experts layer: a router picks 2 of 8 experts for each token', seed: 101 });
  s.text(440, 34, 'One MoE layer: the router picks 2 of 8 experts', { size: 24, weight: 700 });
  s.rect(40, 64, 120, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(100, 92, 'token x', { font: 'mono', size: 17 });
  s.arrow(160, 86, 220, 86, { color: C.muted });
  s.rect(220, 64, 240, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(340, 92, 'router: top-2 of 8', { font: 'mono', size: 17 });
  const active = new Set([1, 3]);
  for (let i = 0; i < 8; i++) {
    const x = 330 + i * 62;
    s.arrow(340, 108, x + 27, 160, { color: active.has(i) ? C.blue : C.muted });
    if (active.has(i)) s.rect(x, 160, 54, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    else s.rect(x, 160, 54, 50, { color: C.muted, dash: '6 8' });
    s.text(x + 27, 191, 'E' + i, { font: 'mono', size: 17 });
  }
  s.arrow(419, 212, 400, 268, { color: C.blue });
  s.arrow(543, 212, 480, 268, { color: C.blue });
  s.rect(280, 270, 260, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(410, 298, 'weighted sum of 2 outputs', { size: 18 });
  s.arrow(410, 314, 410, 334, { color: C.muted });
  s.text(410, 356, 'output y, same shape as x', { size: 19 });
  s.note(40, 240, 210, 84, ['dense FFN: one', 'expert, every token'], { size: 18 });
  s.note(600, 250, 260, 84, ['2 of 8 run: 25% of', 'expert weights active'], { size: 18 });
  save('26.4-moe-layer.svg', s);
}

// 2. Worked example: gate scores -> top-2 softmax -> weighted sum
{
  const s = new Sketch(880, 440, { title: 'Worked top-2 example: four gate scores, two experts selected, weighted output', seed: 102 });
  const A = D.A;
  const base = 330, scale = 80;
  s.text(200, 70, '1. gate scores s = Gx', { size: 21, weight: 700 });
  A.logits.forEach((v, i) => {
    const h = v * scale, x = 80 + i * 60, sel = A.top2.includes(i);
    s.rect(x, base - h, 40, h, { color: sel ? C.blue : C.green, fill: sel ? C.blueSoft : C.greenSoft, fillStyle: 'solid' });
    s.text(x + 20, base - h - 12, v.toFixed(1), { font: 'mono', size: 17 });
    s.text(x + 20, 358, 'E' + i, { font: 'mono', size: 17 });
  });
  s.line(60, base, 320, base, { color: C.ink });
  s.arrow(330, 200, 400, 200, { color: C.muted });
  s.text(540, 70, '2. softmax of top-2', { size: 21, weight: 700 });
  A.top2.forEach((e, j) => {
    const w = A.w_softmax2[j], h = w * 200, x = 440 + j * 80;
    s.rect(x, base - h, 50, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 25, base - h - 12, w.toFixed(3), { font: 'mono', size: 17 });
    s.text(x + 25, 358, 'E' + e, { font: 'mono', size: 17 });
  });
  s.line(420, base, 600, base, { color: C.ink });
  s.arrow(610, 200, 660, 200, { color: C.muted });
  s.text(770, 70, '3. weighted sum', { size: 21, weight: 700 });
  const [w0, w1] = A.w_softmax2;
  const [o0, o1] = A.expert_out_top2;
  s.text(770, 150, [
    `${f3(w0)} x [${o0.join(', ')}]`,
    `+ ${f3(w1)} x [${o1.join(', ')}]`,
    `= [${A.y.map((v) => v.toFixed(3)).join(', ')}]`,
  ], { font: 'mono', size: 18 });
  s.note(40, 390, 800, 30, [`probability on the top-2 before renormalising: ${f3(A.mass_top2)}`], { size: 17 });
  save('26.4-worked-top2.svg', s);
}

// 3. Skewed router: loads per expert against capacity
{
  const s = new Sketch(880, 420, { title: 'Expert loads under a skewed router with capacity factor 1.0', seed: 103 });
  const L = D.B.skewed.loads;
  const cap = D.B.skewed.drops['1.0'].cap;
  const base = 320, k = 230 / 2200;
  s.text(440, 34, 'Expert loads under a skewed router, capacity factor 1.0', { size: 24, weight: 700 });
  L.forEach((load, i) => {
    const x = 80 + i * 95, kept = Math.min(load, cap), over = Math.max(0, load - cap);
    s.rect(x, base - kept * k, 56, kept * k, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    if (over > 0) s.rect(x, base - load * k, 56, over * k, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(x + 28, base - load * k - 10, String(load), { font: 'mono', size: 16 });
    s.text(x + 28, 354, 'E' + i, { font: 'mono', size: 17 });
  });
  s.line(60, base, 830, base, { color: C.ink });
  s.line(60, base - cap * k, 830, base - cap * k, { color: C.ink, dash: '6 8' });
  s.note(40, 372, 800, 30, [`dashed line = capacity ${cap}; rose = dropped; ${D.B.skewed.drops['1.0'].dropped} of ${D.B_meta.assignments} dropped (${pct(D.B.skewed.drops['1.0'].frac)})`], { size: 16 });
  save('26.4-skew-loads.svg', s);
}

// 4. Dropped fraction versus capacity factor, balanced vs skewed
{
  const s = new Sketch(880, 420, { title: 'Dropped share of assignments against capacity factor', seed: 104 });
  const cfs = ['1.0', '1.25', '1.5', '2.0'];
  const base = 310, k = 7; // px per percentage point
  s.text(440, 34, 'Dropped assignments against capacity factor', { size: 24, weight: 700 });
  s.rect(560, 56, 18, 18, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(586, 71, 'balanced router', { anchor: 'start', size: 18 });
  s.rect(560, 84, 18, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(586, 99, 'skewed router', { anchor: 'start', size: 18 });
  cfs.forEach((cf, g) => {
    const xc = 200 + g * 180;
    [['balanced', C.green, C.greenSoft, xc - 50], ['skewed', C.rose, C.roseSoft, xc + 6]].forEach(([name, col, fill, x]) => {
      const v = 100 * D.B[name].drops[cf].frac, h = v * k;
      if (h > 0) s.rect(x, base - h, 44, h, { color: col, fill, fillStyle: 'solid' });
      s.text(x + 22, base - h - 10, v.toFixed(1) + '%', { font: 'mono', size: 16 });
    });
    s.text(xc, 344, 'cf = ' + cf, { size: 18 });
  });
  s.line(60, base, 830, base, { color: C.ink });
  s.note(40, 372, 800, 30, ['cf = capacity factor; capacity = cf x k x T / E (toy router, 4096 tokens)'], { size: 16 });
  save('26.4-drop-vs-capacity.svg', s);
}

// 5. Expert parallelism: 8 experts on 4 devices, all-to-all dispatch
{
  const s = new Sketch(880, 400, { title: 'Expert parallelism: 8 experts spread over 4 devices, with all-to-all traffic', seed: 105 });
  s.text(440, 34, 'Expert parallelism: 8 experts on 4 devices', { size: 24, weight: 700 });
  const hot = new Set([2, 5]);
  for (let d = 0; d < 4; d++) {
    const x0 = 40 + d * 208;
    s.rect(x0, 70, 186, 190, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x0 + 93, 96, `device ${d}`, { size: 19, weight: 700 });
    [2 * d, 2 * d + 1].forEach((e, j) => {
      const x = x0 + 18 + j * 84;
      s.rect(x, 140, 66, 44, hot.has(e) ? { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' } : { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
      s.text(x + 33, 168, 'E' + e, { font: 'mono', size: 17 });
    });
  }
  s.rect(58, 206, 130, 34, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(123, 228, 'token x', { font: 'mono', size: 17 });
  s.arrow(188, 223, 299, 186, { color: C.rose });
  s.arrow(188, 223, 591, 186, { color: C.rose });
  s.note(40, 290, 800, 84, [
    `balanced router: ${pct(D.D.balanced.cross_frac)} of token-expert pairs cross devices`,
    `busiest device: ${D.D.balanced.recv_max_over_mean.toFixed(2)}x mean; skewed: ${pct(D.D.skewed.cross_frac)} cross, ${D.D.skewed.recv_max_over_mean.toFixed(2)}x mean`,
  ], { size: 19 });
  save('26.4-expert-parallel.svg', s);
}
console.log('wrote 26.4 diagrams to', OUT);
