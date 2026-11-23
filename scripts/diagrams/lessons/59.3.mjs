import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-59-reasoning-models/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '59.3_data.json'), 'utf8'));

// 1. R1 pipeline: five stages, R1-Zero as a dashed shortcut
{
  const s = new Sketch(880, 330, { title: 'DeepSeek-R1 training pipeline with the R1-Zero shortcut', seed: 5901 });
  s.text(440, 40, 'DeepSeek-R1 pipeline (solid) and R1-Zero (dashed)', { size: 24, weight: 700 });
  const labels = [['DeepSeek-V3', 'base model'], ['Cold-start', 'SFT (CoT data)'], ['Reasoning RL', 'GRPO, rule rewards'],
    ['Rejection', 'sampling + SFT'], ['Final RL', 'rules + preference']];
  const fills = [C.blueSoft, C.amberSoft, C.greenSoft, C.amberSoft, C.greenSoft];
  const cols = [C.blue, C.amber, C.green, C.amber, C.green];
  const xs = [30, 200, 370, 540, 710];
  xs.forEach((x, i) => {
    s.rect(x, 90, 140, 80, { color: cols[i], fill: fills[i], fillStyle: 'solid' });
    s.text(x + 70, 122, labels[i][0], { size: 18, weight: 700 });
    s.text(x + 70, 148, labels[i][1], { size: 15, font: 'mono' });
    if (i < 4) s.arrow(x + 142, 130, xs[i + 1] - 4, 130, { color: C.muted });
  });
  // R1-Zero: base straight to reasoning RL, skipping SFT stages
  s.curveArrow(100, 178, 440, 250, 440, 178, { color: C.rose, dash: '6 8' });
  s.text(270, 270, 'R1-Zero: RL straight on the base model (no cold-start SFT)', { size: 17, color: C.rose });
  s.note(40, 290, 800, 30, ['Stages 2 and 4 are supervised fine-tuning (SFT) on text; stages 3 and 5 are reinforcement learning (RL).'], { size: 15 });
  save('59.3-r1-pipeline.svg', s);
}

// 2. GRPO group advantages, worked example [1, 0, 0, 1]
{
  const s = new Sketch(880, 360, { title: 'GRPO advantages from one group of four answers', seed: 5902 });
  s.text(440, 36, 'GRPO: four answers to one prompt, scored against their own group', { size: 23, weight: 700 });
  const rewards = [1, 0, 0, 1];
  const ex = D.worked_groups['[1, 0, 0, 1]'];
  rewards.forEach((r, i) => {
    const y = 80 + i * 58;
    s.rect(40, y, 270, 44, { color: r ? C.green : C.rose, fill: r ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(175, y + 28, `answer ${i + 1}   reward ${r}`, { font: 'mono', size: 16 });
  });
  s.arrow(316, 190, 368, 190, { color: C.muted });
  s.rect(372, 130, 180, 120, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(462, 162, `mean = ${ex.mean.toFixed(2)}`, { font: 'mono', size: 17 });
  s.text(462, 192, `std  = ${ex.std.toFixed(2)}`, { font: 'mono', size: 17 });
  s.text(462, 226, 'no critic network', { size: 16, color: C.muted });
  s.arrow(556, 190, 604, 190, { color: C.muted });
  ex.advantages.forEach((a, i) => {
    const y = 80 + i * 58;
    const pos = a > 0;
    s.rect(608, y, 232, 44, { color: pos ? C.green : C.rose, fill: pos ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(724, y + 28, `A${i + 1} = ${a > 0 ? '+' : ''}${a.toFixed(1)}`, { font: 'mono', size: 17 });
  });
  s.note(40, 318, 800, 34, ['A = (reward - group mean) / group std. Equal rewards give std = 0; a small epsilon keeps the division finite.'], { size: 16 });
  save('59.3-grpo-group.svg', s);
}

// 3. PPO versus GRPO: where the baseline comes from
{
  const s = new Sketch(880, 300, { title: 'PPO and GRPO baseline sources compared', seed: 5903 });
  s.text(440, 34, 'Where the baseline comes from: PPO versus GRPO', { size: 23, weight: 700 });
  const row = (y, label, steps, hi, col, fill) => {
    s.text(40, y - 12, label, { size: 17, weight: 700, anchor: 'start' });
    steps.forEach((t, i) => {
      const x = 40 + i * 172;
      const on = i === hi;
      s.rect(x, y + 6, 150, 56, { color: on ? col : C.muted, fill: on ? fill : C.blueSoft, fillStyle: 'solid' });
      s.text(x + 75, y + 30, t[0], { size: 16, weight: 700 });
      s.text(x + 75, y + 52, t[1], { size: 14, font: 'mono' });
      if (i < steps.length - 1) s.arrow(x + 152, y + 34, x + 170, y + 34, { color: C.muted });
    });
  };
  row(92, 'PPO: needs a learned value model', [['Prompt', 'question'], ['Policy', 'one answer'], ['Reward', 'score'], ['Value model', 'V(state)'], ['Advantage', 'update']], 3, C.amber, C.amberSoft);
  row(200, 'GRPO: the group is the baseline', [['Prompt', 'question'], ['Policy', 'G answers'], ['Rewards', 'G scores'], ['Group stats', 'mean, std'], ['Advantage', 'update']], 3, C.green, C.greenSoft);
  s.text(440, 280, 'Both then apply the clipped ratio update; GRPO adds a KL penalty to the reference model.', { size: 16, color: C.muted });
  save('59.3-ppo-vs-grpo.svg', s);
}

// 4. Estimator spread from the experiment
{
  const s = new Sketch(880, 420, { title: 'Spread of three gradient estimators, from the experiment', seed: 5904 });
  s.text(440, 36, 'Standard deviation of one 8-sample gradient estimate', { size: 23, weight: 700 });
  const methods = [['no_baseline', 'no baseline', C.blue, C.blueSoft], ['mean_baseline', 'group mean', C.green, C.greenSoft], ['grpo', 'GRPO (mean, std)', C.amber, C.amberSoft]];
  const base = 300, scale = 1000; // px per unit of standard deviation
  s.line(90, base, 820, base, { color: C.muted });
  const qs = ['0.1', '0.5', '0.9'];
  qs.forEach((q, gi) => {
    const cx = 230 + gi * 240;
    methods.forEach(([key, , col, fill], mi) => {
      const v = D.results[q][key].std;
      const h = v * scale;
      const x = cx - 57 + mi * 38;
      s.rect(x, base - h, 30, h, { color: col, fill, fillStyle: 'solid' });
      s.text(x + 15, base - h - 10, v.toFixed(3), { font: 'mono', size: 15 });
    });
    s.text(cx, base + 30, `q = ${q}`, { size: 19, weight: 700 });
    s.text(cx, base + 54, `all-equal groups: ${Math.round(D.results[q].p_all_equal_group * 100)}%`, { size: 15, color: C.muted });
  });
  methods.forEach(([, label, col, fill], i) => {
    s.rect(120 + i * 230, 62, 18, 18, { color: col, fill, fillStyle: 'solid' });
    s.text(146 + i * 230, 76, label, { size: 17, anchor: 'start' });
  });
  s.note(40, 384, 800, 30, [`Exact gradient q(1-q): 0.090, 0.250, 0.090. GRPO means: ${D.results['0.1'].grpo.mean.toFixed(3)}, ${D.results['0.5'].grpo.mean.toFixed(3)}, ${D.results['0.9'].grpo.mean.toFixed(3)}.`], { size: 15 });
  save('59.3-estimator-spread.svg', s);
}

// 5. What OpenAI disclosed about o1
{
  const s = new Sketch(880, 360, { title: 'What OpenAI discloses about o1', seed: 5905 });
  s.text(440, 36, 'What OpenAI disclosed about o1 (September 2024 post)', { size: 23, weight: 700 });
  const cols = [
    ['Shown to the user', C.green, C.greenSoft, ['final answer', 'model-written summary', 'of the chain of thought']],
    ['Hidden by design', C.rose, C.roseSoft, ['raw chain of thought', '(the reasoning text)']],
    ['Not disclosed', C.amber, C.amberSoft, ['architecture', 'parameter count', 'RL algorithm', 'reward-model design', 'reasoning-token count']],
  ];
  cols.forEach(([title, col, fill, items], i) => {
    const x = 40 + i * 290;
    s.text(x + 130, 88, title, { size: 19, weight: 700 });
    s.rect(x, 104, 260, 206, { color: col, fill, fillStyle: 'solid' });
    items.forEach((t, j) => s.text(x + 130, 146 + j * 36, t, { size: 17, font: 'mono' }));
  });
  s.note(40, 326, 800, 26, ['Public statement only: the post does not describe how the reasoning is produced.'], { size: 16 });
  save('59.3-o1-disclosure.svg', s);
}
console.log('ok');
