import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-28-llm-training/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// every number below is read from the experiment's output file
const D = JSON.parse(readFileSync(join(HERE, '28.4_data.json'), 'utf8'));

const box = (s, cx, cy, label, color, fill, w = 160, h = 44) => {
  s.rect(cx - w / 2, cy - h / 2, w, h, { color, fill, fillStyle: 'solid' });
  s.text(cx, cy + 6, label, { size: 18 });
};

// 1. PPO vs GRPO: where the baseline comes from
{
  const s = new Sketch(880, 410, { title: 'PPO needs a value network; GRPO uses the group of samples instead', seed: 401 });
  s.text(440, 34, 'Where the baseline comes from', { size: 26, weight: 700 });
  s.text(70, 74, 'PPO', { size: 22, weight: 700, anchor: 'start', color: C.blue });
  const xs = [150, 350, 550, 750];
  box(s, xs[0], 110, 'prompt', C.muted, C.blueSoft);
  box(s, xs[1], 110, 'policy π', C.blue, C.blueSoft);
  box(s, xs[2], 110, 'response o', C.blue, C.blueSoft);
  box(s, xs[3], 110, 'reward r', C.blue, C.blueSoft);
  for (let i = 0; i < 3; i++) s.arrow(xs[i] + 82, 110, xs[i + 1] - 82, 110, { color: C.muted });
  box(s, 550, 192, 'critic V(s)', C.amber, C.amberSoft);
  s.arrow(550, 132, 550, 170, { color: C.amber, dash: '6 8' });
  s.text(550, 232, 'a second network, as large as π, trained too', { size: 16, color: C.muted });

  s.text(70, 282, 'GRPO', { size: 22, weight: 700, anchor: 'start', color: C.green });
  box(s, xs[0], 320, 'prompt', C.muted, C.greenSoft);
  box(s, xs[1], 320, 'policy π', C.green, C.greenSoft);
  box(s, xs[2], 320, 'G = 16 samples', C.green, C.greenSoft);
  box(s, xs[3], 320, 'rewards r_1..r_G', C.green, C.greenSoft, 180);
  for (let i = 0; i < 2; i++) s.arrow(xs[i] + 82, 320, xs[i + 1] - 82, 320, { color: C.muted });
  s.arrow(xs[2] + 82, 320, xs[3] - 92, 320, { color: C.muted });
  s.note(560, 364, 300, 34, ['group mean and std = baseline'], { size: 17 });
  s.arrow(750, 342, 750, 362, { color: C.green });
  save('28.4-ppo-vs-grpo.svg', s);
}

// 2. Worked example: one prompt, four answers, binary rewards
{
  const { rewards, adv_pop } = D.worked;
  const s = new Sketch(880, 330, { title: 'Group of four answers: rewards become advantages', seed: 402 });
  s.text(440, 34, 'One prompt, four sampled answers', { size: 26, weight: 700 });
  const xs = [150, 310, 470, 630];
  rewards.forEach((r, i) => box(s, xs[i], 92, `r = ${r}`, C.blue, C.blueSoft, 120, 44));
  s.line(90, 205, 690, 205, { color: C.muted, width: 1.4 });
  s.text(80, 210, '0', { size: 16, anchor: 'end', color: C.muted });
  adv_pop.forEach((a0, i) => {
    const a = Math.round(a0 * 100) / 100;   // eps = 1e-4 gives 0.9998; show two decimals
    const h = Math.abs(a) * 60;
    const y = a > 0 ? 205 - h : 205;
    s.rect(xs[i] - 40, y, 80, h, { color: a > 0 ? C.green : C.rose, fill: a > 0 ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(xs[i], a > 0 ? y - 12 : y + h + 26, `${a > 0 ? '+' : '−'}${Math.abs(a).toFixed(2)}`, { size: 20, weight: 700 });
  });
  s.text(150, 292, 'advantage Â_i', { size: 17, color: C.muted });
  s.note(730, 110, 130, 130, ['mean 0.5', 'std 0.5', 'Â = (r − 0.5) / 0.5'], { size: 16 });
  save('28.4-group-advantage.svg', s);
}

// 3. Std division: total |advantage| per question vs number correct
{
  const rows = D.std_weight;
  const s = new Sketch(880, 400, { title: 'Total absolute advantage per question, G = 8', seed: 403 });
  s.text(440, 30, 'Total |advantage| per question, G = 8', { size: 26, weight: 700 });
  const X = (k) => 130 + k * 85;
  const Y = (v) => 340 - v * 30;
  s.line(120, 340, 820, 340, { color: C.muted, width: 1.4 });
  s.line(120, 80, 120, 340, { color: C.muted, width: 1.4 });
  [0, 2, 4, 6, 8].forEach((v) => s.text(106, Y(v) + 6, String(v), { size: 16, anchor: 'end', color: C.muted }));
  rows.forEach((r) => s.text(X(r.k), 366, String(r.k), { size: 16, color: C.muted }));
  s.text(475, 392, 'number of correct answers out of 8', { size: 17, color: C.muted });
  s.text(40, 210, 'sum |Â|', { size: 17, color: C.muted, rotate: -90 });
  const plot = (key, color) => {
    rows.forEach((r, i) => {
      if (i > 0) s.line(X(rows[i - 1].k), Y(rows[i - 1][key]), X(r.k), Y(r[key]), { color, width: 3 });
    });
    rows.forEach((r) => s.circle(X(r.k), Y(r[key]), 11, { color, fill: color, fillStyle: 'solid' }));
  };
  plot('sum_abs_mean', C.blue);
  plot('sum_abs_grpo', C.amber);
  s.line(130, 66, 160, 66, { color: C.blue, width: 3 });
  s.text(170, 72, 'mean-only baseline', { size: 17, anchor: 'start' });
  s.line(360, 66, 390, 66, { color: C.amber, width: 3 });
  s.text(400, 72, 'GRPO (mean and std)', { size: 17, anchor: 'start' });
  save('28.4-std-weight.svg', s);
}

// 4. Learning-rate sweep on the toy problem
{
  const lrs = D.train.lr_grid;
  const series = D.train.step50_by_lr;
  const s = new Sketch(880, 400, { title: 'Toy accuracy after 50 steps by learning rate', seed: 404 });
  s.text(440, 30, 'Accuracy after 50 steps, by learning rate (toy)', { size: 26, weight: 700 });
  const X = (i) => 130 + i * 110;
  const Y = (v) => 340 - v * 240;
  s.line(120, 340, 820, 340, { color: C.muted, width: 1.4 });
  s.line(120, 100, 120, 340, { color: C.muted, width: 1.4 });
  [0, 0.5, 1].forEach((v) => s.text(106, Y(v) + 6, v.toFixed(1), { size: 16, anchor: 'end', color: C.muted }));
  lrs.forEach((lr, i) => s.text(X(i), 366, String(lr), { size: 16, color: C.muted }));
  s.text(475, 392, 'learning rate (same for all methods)', { size: 17, color: C.muted });
  const plot = (key, color) => {
    const v = series[key];
    v.forEach((y, i) => {
      if (i > 0) s.line(X(i - 1), Y(v[i - 1]), X(i), Y(y), { color, width: 3 });
    });
    v.forEach((y, i) => s.circle(X(i), Y(y), 11, { color, fill: color, fillStyle: 'solid' }));
  };
  plot('reinforce', C.muted);
  plot('mean', C.rose);
  plot('grpo', C.green);
  s.line(130, 66, 160, 66, { color: C.muted, width: 3 });
  s.text(170, 72, 'no baseline', { size: 17, anchor: 'start' });
  s.line(300, 66, 330, 66, { color: C.rose, width: 3 });
  s.text(340, 72, 'mean baseline', { size: 17, anchor: 'start' });
  s.line(490, 66, 520, 66, { color: C.green, width: 3 });
  s.text(530, 72, 'GRPO (mean and std)', { size: 17, anchor: 'start' });
  save('28.4-lr-sweep.svg', s);
}
