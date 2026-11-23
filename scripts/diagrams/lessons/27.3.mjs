// Diagrams for 27.3 (logit sampling). Run: node scripts/diagrams/lessons/27.3.mjs
// Every number comes from scripts/diagrams/lessons/27.3_experiment.py, which writes 27.3_data.json.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-27-gpt-decoder-llms/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '27.3_data.json'), 'utf8'));
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);

// 1. Worked example: logits -> probabilities, with the top-p and min-p cuts
{
  const s = new Sketch(880, 432, { title: 'Bar chart of five token probabilities with the min-p cut-off line', seed: 2701 });
  s.text(440, 34, 'Logits become probabilities, then get cut', { size: 26, weight: 700 });
  s.text(440, 66, `top-p 0.9 keeps the first 3 (cumulative ${f3(D.probs[0] + D.probs[1] + D.probs[2])}); min-p 0.1 keeps p >= ${f3(0.1 * D.probs[0])}`, { size: 17, color: C.muted });
  const base = 310, scale = 280;
  const cut = base - 0.1 * D.probs[0] * scale;
  const xs = [150, 290, 430, 570, 710];
  D.tokens.forEach((tok, i) => {
    const p = D.probs[i];
    const h = p * scale;
    const kept = p >= 0.1 * D.probs[0];
    s.rect(xs[i] - 35, base - h, 70, h, { color: kept ? C.blue : C.muted, fill: kept ? C.blueSoft : C.muted, fillStyle: 'solid' });
    s.text(xs[i], base + 54, `p = ${f3(p)}`, { font: "mono", size: 16 });
    s.text(xs[i], base + 30, tok, { size: 22 });
    s.text(xs[i], base + 80, `z = ${D.logits[i].toFixed(1)}`, { font: 'mono', size: 16, color: C.muted });
  });
  s.line(60, cut, 745, cut, { color: C.rose, dash: '6 8', width: 2 });
  s.text(762, cut - 4, ['min-p cut', f3(0.1 * D.probs[0])], { font: 'mono', size: 16, anchor: 'start', color: C.rose });
  s.line(60, base, 820, base, { color: C.ink, width: 1.5 });
  s.text(440, 418, 'Blue bars pass the min-p cut; grey bars fall below it. Logits (z) are shown under each token.', { size: 17, color: C.muted });
  save('27.3-worked-probs.svg', s);
}

// 2. Temperature: same logits, three temperatures
{
  const s = new Sketch(880, 370, { title: 'Three bar groups showing the same logits at temperatures 0.5, 1 and 2', seed: 2702 });
  s.text(440, 34, 'Temperature divides the logits before softmax', { size: 26, weight: 700 });
  const groups = [['0.5', 150], ['1.0', 440], ['2.0', 730]];
  const base = 262, scale = 200;
  groups.forEach(([T, cx]) => {
    const g = D.temps[T];
    g.probs.forEach((p, i) => {
      const x = cx + (i - 2) * 46;
      const h = p * scale;
      const top = i === 0;
      s.rect(x - 16, base - h, 32, h, { color: top ? C.amber : C.blue, fill: top ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x, base - h - 10, f2(p), { font: 'mono', size: 15 });
    });
    s.line(cx - 110, base, cx + 110, base, { color: C.ink, width: 1.2 });
    s.text(cx, base + 30, `T = ${T}`, { size: 22, weight: 700 });
    s.text(cx, base + 56, `entropy ${f2(g.entropy_bits)} bits`, { font: 'mono', size: 16, color: C.muted });
  });
  s.text(440, 352, 'Bars left to right: the, a, cat, dog, zebra. Amber = most likely token.', { size: 17, color: C.muted });
  save('27.3-temperature.svg', s);
}

// 3. Fixed K versus adaptive cut: a peaked and a flat distribution
{
  const s = new Sketch(880, 585, { title: 'Peaked and flat distributions with which tokens each rule keeps', seed: 2703 });
  s.text(440, 34, 'A fixed K keeps the same count whatever the shape', { size: 26, weight: 700 });
  s.text(440, 64, 'Filled square = kept by that rule. Bars use the same vertical scale in both panels.', { size: 17, color: C.muted });
  const rules = [['top_k_3', 'top-k 3'], ['top_p_0_9', 'top-p 0.9'], ['min_p_0_1', 'min-p 0.1']];
  const panel = (label, key, baseY, cx0, dx, bw, probs, ruleX, titleY) => {
    s.text(40, titleY, label, { size: 20, weight: 700, anchor: 'start' });
    probs.forEach((p, i) => {
      const cx = cx0 + i * dx;
      const h = p * 170;
      const kept = D.trunc[key].top_p_0_9.kept_idx.includes(i);
      s.rect(cx - bw / 2, baseY - h, bw, h, { color: kept ? C.blue : C.muted, fill: kept ? C.blueSoft : C.muted, fillStyle: 'solid' });
      s.text(cx, baseY - h - 8, f2(p), { font: 'mono', size: 14 });
      rules.forEach(([rk], r) => {
        const on = D.trunc[key][rk].kept_idx.includes(i);
        const yy = baseY + 22 + r * 24;
        s.rect(cx - 8, yy - 8, 16, 16, { color: C.green, fill: on ? C.green : C.greenSoft, fillStyle: 'solid', width: 1.2 });
      });
    });
    s.line(cx0 - dx / 2, baseY, cx0 + (probs.length - 0.5) * dx, baseY, { color: C.ink, width: 1.2 });
    rules.forEach(([rk, name], r) => {
      s.text(40, baseY + 29 + r * 24, name, { font: 'mono', size: 16, anchor: 'start' });
      const t = D.trunc[key][rk];
      s.text(ruleX, baseY + 29 + r * 24, `kept ${t.kept}, mass ${f3(t.kept_mass)}`, { font: 'mono', size: 16, anchor: 'start' });
    });
  };
  panel('peaked: logits 3, 2, 1, 0, -1', 'peaked', 250, 200, 90, 56, D.probs, 600, 100);
  panel('flat: ten logits from 1.0 down to 0.55', "flat", 460, 200, 44, 32, D.flat_probs, 630, 385);
  s.text(440, 565, 'Top-k ignores the shape. Top-p and min-p adapt to it.', { size: 19 });
  save('27.3-peaked-vs-flat.svg', s);
}

// 4. The pipeline: what each stage does to the example
{
  const s = new Sketch(880, 300, { title: 'Pipeline of sampling filters applied in sequence', seed: 2704 });
  s.text(440, 34, 'Filters run in sequence, renormalizing after each one', { size: 26, weight: 700 });
  const boxes = [
    [['logits', 'z'], ['5 scores']],
    [['softmax', 'z / T'], ['5 probs,', 'sum 1']],
    [['top-k', 'k = 3'], ['3 kept,', `sum ${f3(D.probs[0] + D.probs[1] + D.probs[2])}`]],
    [['top-p', 'p = 0.9'], ['2 kept,', 'on renorm. input']],
    [['min-p', 'base = 0.1'], ['2 kept,', 'unchanged']],
    [['sample', 'renorm.'], [`P = ${f3(D.pipeline_final[0])},`, f3(D.pipeline_final[1])]],
  ];
  boxes.forEach(([title, notes], i) => {
    const cx = 90 + i * 140;
    s.rect(cx - 62, 90, 124, 66, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, 116, title, { size: 18, weight: 700 });
    s.text(cx, 200, notes, { font: 'mono', size: 14, color: C.muted });
    if (i < boxes.length - 1) s.arrow(cx + 62, 123, cx + 78, 123, { color: C.muted });
  });
  s.note(40, 232, 800, 52, ['Order matters: top-p run on the original distribution would keep 3 tokens, not 2.'], { size: 19 });
  save('27.3-pipeline.svg', s);
}
console.log('wrote 27.3 diagrams');
