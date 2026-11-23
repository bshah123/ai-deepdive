import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-29-llm-inference/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from 29.3_experiment.py (run it first to refresh 29.3_data.json).
const D = JSON.parse(readFileSync(join(HERE, '29.3_data.json'), 'utf8'));

// 1. Autoregressive vs speculative: calls per token
{
  const s = new Sketch(880, 320, { title: 'Four tokens: four target calls versus one', seed: 291 });
  s.text(440, 34, 'Four tokens: four target calls versus one', { size: 24, weight: 700 });
  s.text(40, 112, 'autoregressive', { size: 20, anchor: 'start' });
  [180, 320, 460, 600].forEach((x) => {
    s.rect(x, 88, 120, 48, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 60, 108, 'target call', { size: 17 });
    s.text(x + 60, 128, '1 token', { size: 17 });
  });
  s.text(40, 232, 'speculative', { size: 20, anchor: 'start' });
  [180, 270, 360, 450].forEach((x) => {
    s.rect(x, 210, 80, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 40, 237, 'draft', { size: 17 });
  });
  s.arrow(532, 232, 596, 232, { color: C.muted });
  s.rect(600, 210, 250, 48, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(725, 230, 'target call', { size: 17 });
  s.text(725, 250, 'emits 4 tokens', { size: 17 });
  s.text(440, 300, 'draft: the cat sat on  →  target keeps "the cat sat", replaces "on" with "a"', { size: 17 });
  save('29.3-timeline.svg', s);
}

// 2. Accept rule: bars of p and q, with acceptance probabilities
{
  const s = new Sketch(880, 380, { title: 'Target p and draft q over five tokens', seed: 292 });
  s.text(440, 34, 'Target p and draft q over five tokens', { size: 24, weight: 700 });
  const base = 290, scale = 400;
  s.rect(560, 52, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(586, 67, 'target p', { size: 17, anchor: 'start' });
  s.rect(700, 52, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(726, 67, 'draft q', { size: 17, anchor: 'start' });
  s.line(90, base, 820, base, { color: C.muted });
  const fmt = (a) => {
    if (Math.abs(a - 1) < 1e-9) return '1';
    if (Math.abs(a - 1 / 3) < 1e-6) return '1/3';
    if (Math.abs(a - 2 / 3) < 1e-6) return '2/3';
    return a.toFixed(2);
  };
  D.p.forEach((pv, i) => {
    const cx = 200 + i * 145;
    const qv = D.q[i];
    const hp = pv * scale, hq = qv * scale;
    s.rect(cx - 46, base - hp, 40, hp, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 6, base - hq, 40, hq, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx - 26, base - hp - 8, pv.toFixed(2), { size: 15 });
    s.text(cx + 26, base - hq - 8, qv.toFixed(2), { size: 15 });
    s.text(cx, 318, `token ${i}`, { size: 18 });
    s.rect(cx - 56, 336, 112, 32, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx, 358, `accept ${fmt(D.accept_prob[i])}`, { size: 16 });
  });
  s.text(40, 358, 'accept', { size: 16, anchor: 'start' });
  save('29.3-accept-rule.svg', s);
}

// 3. Expected tokens per round versus gamma
{
  const s = new Sketch(880, 420, { title: 'Expected tokens per round', seed: 293 });
  s.text(440, 34, 'Expected tokens per target call', { size: 24, weight: 700 });
  const x0 = 110, y0 = 340, yTop = 70;
  const yOf = (e) => y0 - (e - 1) * ((y0 - yTop) / 6);
  const gammas = [1, 2, 4, 8];
  const xs = [150, 290, 430, 570];
  for (let e = 1; e <= 7; e++) {
    s.text(x0 - 14, yOf(e) + 6, String(e), { size: 17, anchor: 'end' });
    if (e > 1) s.line(x0, yOf(e), 620, yOf(e), { color: C.muted, width: 0.8, dash: '4 8' });
  }
  s.line(x0, yTop, x0, y0, { color: C.ink });
  s.line(x0, y0, 620, y0, { color: C.ink });
  gammas.forEach((g, i) => s.text(xs[i], 368, `γ = ${g}`, { size: 17 }));
  s.text(365, 400, 'draft tokens per round (γ)', { size: 17 });
  s.text(40, 205, 'tokens per call', { size: 17, rotate: -90 });
  const series = [
    ['0.5', C.muted],
    ['0.7', C.blue],
    ['0.8', C.green],
    ['0.9', C.rose],
  ];
  series.forEach(([a, col], k) => {
    const pts = gammas.map((g, i) => [xs[i], yOf(D.E[a][String(g)])]);
    for (let i = 1; i < pts.length; i++) {
      s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color: col, width: 2.6 });
    }
    pts.forEach(([x, y]) => s.circle(x, y, 9, { color: col, fill: col, fillStyle: 'solid' }));
    s.line(650, 110 + k * 40, 678, 110 + k * 40, { color: col, width: 2.6 });
    s.text(690, 116 + k * 40, `α = ${a}`, { size: 18, anchor: 'start' });
  });
  save('29.3-tokens-per-call.svg', s);
}

// 4. Medusa-style heads and the accepted run from the worked context
{
  const ex = D.tree_example;
  const s = new Sketch(880, 340, { title: 'Head guesses against the target chain', seed: 294 });
  s.text(440, 34, `Context token ${ex.context}: heads versus the target`, { size: 24, weight: 700 });
  const cols = [330, 470, 610, 750];
  const heads = ['base (exact)', 'head 1', 'head 2', 'head 3'];
  heads.forEach((h, i) => s.text(cols[i], 84, h, { size: 17 }));
  const rowY = { top: 132, second: 202, target: 272 };
  s.text(40, rowY.top + 6, 'top choice', { size: 18, anchor: 'start' });
  s.text(40, rowY.second + 6, 'second choice', { size: 18, anchor: 'start' });
  s.text(40, rowY.target + 6, "target's token", { size: 18, anchor: 'start' });
  const chain = ex.chain; // chain[0] is the base token, chain[k] is head k's target
  const tops = ex.tops;   // tops[k-1] = [top1, top2] of head k
  const cell = (x, y, value, col, soft, matched) => {
    s.rect(x - 60, y - 24, 120, 48, { color: col, fill: soft, fillStyle: 'solid', width: matched ? 2.8 : 1.6 });
    s.text(x, y + 7, String(value), { font: 'mono', size: 20 });
  };
  cell(cols[0], rowY.top, chain[0], C.ink, C.blueSoft, false);
  cell(cols[0], rowY.second, '–', C.muted, C.blueSoft, false);
  cell(cols[0], rowY.target, chain[0], C.ink, C.blueSoft, false);
  for (let k = 1; k <= 3; k++) {
    const x = cols[k];
    const [t1, t2] = tops[k - 1];
    const hit1 = t1 === chain[k], hit2 = t2 === chain[k];
    cell(x, rowY.top, t1, C.blue, hit1 && !hit2 ? C.greenSoft : C.blueSoft, hit1 && !hit2);
    cell(x, rowY.second, t2, C.blue, hit2 ? C.greenSoft : C.blueSoft, hit2);
    cell(x, rowY.target, chain[k], C.ink, C.blueSoft, false);
  }
  s.text(440, 326, `accepted run: 3 guesses, then 1 bonus token from the target (emitted ${ex.emitted})`, { size: 17 });
  save('29.3-medusa-heads.svg', s);
}
