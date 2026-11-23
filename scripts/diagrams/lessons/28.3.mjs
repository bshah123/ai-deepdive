// Diagrams for Lesson 28.3 (SFT, RLHF with PPO, DPO). Run: node scripts/diagrams/lessons/28.3.mjs
// Every number is read from scripts/diagrams/lessons/28.3_data.json (written by 28.3_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-28-llm-training/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '28.3_data.json'), 'utf8'));
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};
const f2 = (v) => v.toFixed(2);

// ------------------------------------------------------------ 1. two routes
{
  const s = new Sketch(880, 400, { title: 'Two routes from preference pairs to a tuned policy: RLHF with PPO and DPO', seed: 2831 });
  s.text(440, 34, 'Two routes from the same preference pairs', { size: 26, weight: 700 });
  // SFT row
  s.rect(40, 62, 170, 56, { color: C.muted, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(125, 86, 'demonstrations', { size: 18 });
  s.text(125, 108, '(prompt, good answer)', { size: 15, color: C.muted });
  s.arrow(212, 90, 262, 90, { color: C.ink });
  s.rect(262, 62, 170, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(347, 86, 'SFT model', { size: 20, weight: 700 });
  s.text(347, 108, 'π_ref (frozen anchor)', { size: 16, color: C.muted });
  s.note(490, 60, 350, 62, ['step 1: supervised fine-tuning', 'cross-entropy on demonstrations'], { size: 18, rotate: 0.6 });
  // pairs box spanning both routes
  s.rect(40, 170, 150, 170, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 228, 'preference', { size: 19, weight: 700 });
  s.text(115, 252, 'pairs', { size: 19, weight: 700 });
  s.text(115, 292, '(x, y_w, y_l)', { size: 16, font: 'mono' });
  // Route A: PPO
  s.text(230, 160, 'route A: RLHF', { size: 19, weight: 700, color: C.amber, anchor: 'start' });
  s.arrow(190, 196, 230, 196, { color: C.muted });
  s.rect(230, 176, 170, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(315, 205, 'reward model', { size: 18 });
  s.arrow(400, 198, 440, 198, { color: C.muted });
  s.rect(440, 176, 230, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(555, 205, 'PPO: maximise r − β·KL', { size: 18 });
  s.arrow(670, 198, 700, 198, { color: C.muted });
  s.rect(700, 176, 140, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(770, 205, 'π_RLHF', { size: 19, weight: 700 });
  // Route B: DPO
  s.text(230, 296, 'route B: DPO', { size: 19, weight: 700, color: C.violet, anchor: 'start' });
  s.arrow(190, 326, 230, 326, { color: C.muted });
  s.rect(230, 306, 170, 44, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(315, 335, 'DPO loss', { size: 18 });
  s.arrow(400, 328, 440, 328, { color: C.muted });
  s.rect(440, 306, 230, 44, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(555, 335, 'no reward model, no sampling', { size: 17 });
  s.arrow(670, 328, 700, 328, { color: C.muted });
  s.rect(700, 306, 140, 44, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(770, 335, 'π_DPO', { size: 19, weight: 700 });
  // anchor link
  s.line(347, 118, 347, 150, { color: C.muted, dash: '6 8' });
  s.text(372, 146, 'π_ref in the KL term and in the DPO ratio', { size: 15, color: C.muted, anchor: 'start' });
  s.text(440, 384, 'Both routes need π_ref and the same pairs; only route A needs a sampled reward model loop.', { size: 16, color: C.muted });
  save('28.3-routes.svg', s);
}

// ------------------------------------------------------------ 2. Bradley-Terry
{
  const s = new Sketch(880, 360, { title: 'Bradley-Terry: probability that the chosen response wins, as a function of the reward gap', seed: 2832 });
  s.text(440, 34, 'Bradley-Terry: how a reward gap becomes a probability', { size: 25, weight: 700 });
  const X = (g) => 100 + ((g + 2) / 5) * 460;   // gap -2 .. 3 across x 100..560
  const Y = (p) => 300 - p * 220;               // probability 0 .. 1
  s.line(100, 300, 570, 300, { color: C.ink, width: 1.6 });
  s.line(100, 80, 100, 300, { color: C.ink, width: 1.6 });
  s.text(X(-2), 326, '−2', { size: 17, color: C.muted });
  s.text(X(0), 326, '0', { size: 17, color: C.muted });
  s.text(X(2), 326, '2', { size: 17, color: C.muted });
  s.text(335, 352, 'reward gap  r(chosen) − r(rejected)', { size: 18, color: C.muted });
  s.text(74, Y(1) + 5, '1', { size: 17, color: C.muted });
  s.text(60, Y(0.5) + 5, '0.5', { size: 17, color: C.muted });
  s.text(74, Y(0) + 5, '0', { size: 17, color: C.muted });
  // sigmoid curve as a polyline
  const pts = [];
  for (let g = -2; g <= 3.0001; g += 0.05) {
    pts.push([X(g), Y(1 / (1 + Math.exp(-g)))]);
  }
  for (let i = 1; i < pts.length; i++) {
    s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color: C.blue, width: 3 });
  }
  // the four worked points, numbers from the experiment
  const gaps = [0.0, 0.5, 1.0, 2.0];
  gaps.forEach((g, i) => {
    const b = D.bt_examples[i];
    s.circle(X(g), Y(b.p), 26, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(X(g), Y(b.p) + 6, String(i + 1), { size: 18, weight: 700 });
  });
  // numbered table, outside the plot
  s.text(620, 96, 'point   gap   P(win)   loss', { size: 17, font: 'mono', color: C.muted, anchor: 'start' });
  gaps.forEach((g, i) => {
    const b = D.bt_examples[i];
    const row = `  ${i + 1}     ${g.toFixed(1)}    ${b.p.toFixed(2)}     ${b.loss.toFixed(2)}`;
    s.text(620, 130 + i * 34, row, { size: 18, font: 'mono', anchor: 'start' });
  });
  s.note(600, 276, 260, 56, ['loss = −log P', 'gap 0 is a coin flip'], { size: 18, rotate: -1 });
  save('28.3-bradley-terry.svg', s);
}

// ------------------------------------------------------------ 3. policies
{
  const s = new Sketch(880, 400, { title: 'Reference policy, true RLHF optimum and DPO-learned policy over five responses', seed: 2833 });
  s.text(440, 34, 'Five responses, three policies', { size: 26, weight: 700 });
  // legend
  s.rect(230, 52, 22, 16, { color: C.muted, fill: C.muted, fillStyle: 'hachure' });
  s.text(260, 66, 'π_ref (SFT)', { size: 17, anchor: 'start' });
  s.rect(400, 52, 22, 16, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(430, 66, 'π* (true RLHF optimum)', { size: 17, anchor: 'start' });
  s.rect(640, 52, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(670, 66, 'π_DPO (learned)', { size: 17, anchor: 'start' });
  const base = 330, scale = 220 / 0.6; // value 0.6 -> 220 px
  s.line(90, base, 850, base, { color: C.ink, width: 1.5 });
  const groups = [
    { x: 160, name: 'y0', r: 0.2 }, { x: 310, name: 'y1', r: 0.9 }, { x: 460, name: 'y2', r: 1.5 },
    { x: 610, name: 'y3', r: -1.0 }, { x: 760, name: 'y4', r: 0.0 },
  ];
  groups.forEach((g, i) => {
    const vals = [
      { v: D.pi_ref[i], o: { color: C.muted, fill: C.muted, fillStyle: 'hachure' } },
      { v: D.pi_star[i], o: { color: C.green, fill: C.greenSoft, fillStyle: 'solid' } },
      { v: D.pi_dpo[i], o: { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' } },
    ];
    vals.forEach((b, k) => {
      const bx = g.x - 46 + k * 38, h = b.v * scale;
      s.rect(bx, base - h, 32, Math.max(h, 1.5), b.o);
      s.text(bx + 16, base - h - 8, f2(b.v), { size: 14, font: 'mono' });
    });
    s.text(g.x, base + 30, `${g.name}  r = ${g.r.toFixed(1)}`, { size: 18, font: 'mono' });
  });
  s.text(440, 380, 'Higher reward and the reference both matter: y2 has the highest reward, so π* moves mass to it.', { size: 16, color: C.muted });
  save('28.3-policies.svg', s);
}

// ------------------------------------------------------------ 4. PPO clip
{
  const s = new Sketch(880, 370, { title: 'PPO clipped surrogate for positive and negative advantage, epsilon 0.2', seed: 2834 });
  s.text(440, 34, 'The clipped surrogate: a flat region removes the incentive to move far', { size: 24, weight: 700 });
  const EPSILON = 0.2;
  const panels = [
    { x0: 60, key: 'L_pos', title: 'advantage A > 0', flatAt: 1 + EPSILON, flatSide: 'right', flatText: 'flat above 1.2' },
    { x0: 500, key: 'L_neg', title: 'advantage A < 0', flatAt: 1 - EPSILON, flatSide: 'left', flatText: 'flat below 0.8' },
  ];
  const ys = (L) => 215 - L * 60;   // L in [-2, 2]
  panels.forEach((p) => {
    const X = (rho) => p.x0 + ((rho - 0.4) / 1.4) * 340; // rho 0.4 .. 1.8
    s.text(p.x0 + 170, 66, p.title, { size: 21, weight: 700 });
    s.line(p.x0, 215, p.x0 + 340, 215, { color: C.muted, width: 1.2 });
    s.line(p.x0, 75, p.x0, 355, { color: C.muted, width: 1.2 });
    [0.8, 1.2].forEach((b) => s.line(X(b), 78, X(b), 352, { color: C.rose, dash: '6 8', width: 1.6 }));
    s.text(X(0.8), 370, '0.8', { size: 16, color: C.rose });
    s.text(X(1.2), 370, '1.2', { size: 16, color: C.rose });
    s.text(X(1.0), 370, '1', { size: 16, color: C.muted });
    s.text(p.x0 + 170, 396, 'ratio ρ = π_new / π_old', { size: 16, color: C.muted });
    const rho = D.ppo_clip_curve.rho, L = D.ppo_clip_curve[p.key];
    for (let i = 1; i < rho.length; i++) {
      s.line(X(rho[i - 1]), ys(L[i - 1]), X(rho[i]), ys(L[i]), { color: C.blue, width: 3 });
    }
    const flatX = p.flatSide === 'right' ? X(1.5) : X(0.6);
    s.text(flatX, ys(L[p.flatSide === 'right' ? 22 : 4]) + (p.flatSide === 'right' ? -20 : 40), p.flatText, { size: 17, color: C.amber });
  });
  save('28.3-ppo-clip.svg', s);
}
