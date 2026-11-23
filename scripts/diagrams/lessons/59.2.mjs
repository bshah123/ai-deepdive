import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-59-reasoning-models/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// every number below comes from 59.2_experiment.py (output in 59.2_data.json)
const d = JSON.parse(readFileSync(join(HERE, '59.2_data.json'), 'utf8'));

{ // 1. one chain versus pruned tree search
  const s = new Sketch(880, 330, { title: 'A single chain fails at one bad step; tree search drops bad branches', seed: 101 });
  s.text(440, 40, 'Same steps, two ways to search', { size: 26, weight: 700 });
  s.text(215, 84, 'One chain', { size: 20, weight: 700 });
  [true, true, false, true].forEach((good, i) => {
    const x = 40 + i * 100;
    s.rect(x, 110, 84, 44, { color: good ? C.green : C.rose, fill: good ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(x + 42, 138, `step ${i + 1}`, { font: 'mono', size: 15 });
    if (i < 3) s.arrow(x + 86, 132, x + 98, 132, { color: C.muted });
  });
  s.text(215, 196, ['Step 3 is wrong, so the answer is wrong.', 'Later steps cannot undo it.'], { size: 17 });

  s.text(655, 84, 'Tree search', { size: 20, weight: 700 });
  s.rect(610, 100, 90, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(655, 124, 'start', { font: 'mono', size: 15 });
  const level1 = [['a', 520, false], ['b', 610, true], ['c', 700, false], ['d', 790, true]];
  for (const [name, cx, keep] of level1) {
    s.line(655, 136, cx, 170, { color: keep ? C.muted : C.rose, dash: keep ? undefined : '6 8' });
    if (keep) {
      s.rect(cx - 30, 170, 60, 34, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
      s.text(cx, 193, name, { font: 'mono', size: 16 });
    } else {
      s.rect(cx - 30, 170, 60, 34, { color: C.rose, dash: '6 8' });
      s.text(cx, 193, name, { font: 'mono', size: 16, color: C.muted });
    }
  }
  for (const [parent, kids] of [[610, [580, 640]], [790, [760, 820]]]) {
    kids.forEach((cx, j) => {
      s.line(parent, 204, cx, 250, { color: C.muted });
      s.rect(cx - 25, 250, 50, 34, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
      s.text(cx, 273, `${parent === 610 ? 'b' : 'd'}${j + 1}`, { font: 'mono', size: 15 });
    });
  }
  s.text(655, 316, 'dashed branches are pruned', { size: 17 });
  save('59.2-chain-vs-tree.svg', s);
}

{ // 2. outcome reward versus process reward
  const s = new Sketch(880, 300, { title: 'Outcome reward scores the final answer; process reward scores each step', seed: 102 });
  s.text(440, 40, 'Outcome reward or process reward?', { size: 26, weight: 700 });
  [0, 1, 2, 3].forEach((i) => {
    const x = 60 + i * 140;
    s.rect(x, 96, 110, 48, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 55, 126, `step ${i + 1}`, { font: 'mono', size: 17 });
    s.arrow(x + 112, 120, x + 138, 120, { color: C.muted });
    s.note(x + 10, 184, 90, 36, ['score'], { size: 17 });
  });
  s.rect(660, 96, 150, 48, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(735, 126, 'answer', { font: 'mono', size: 17 });
  s.arrow(592, 120, 658, 120, { color: C.muted });
  s.note(660, 184, 150, 36, ['one score'], { size: 17 });
  s.text(440, 262, 'Outcome reward: one signal for the whole chain. Process reward: one per step.', { size: 17 });
  save('59.2-orm-vs-prm.svg', s);
}

{ // 3. the four phases of the MCTS loop used in the lesson
  const s = new Sketch(880, 340, { title: 'Four-phase loop: select, expand, score, back up, then repeat', seed: 103 });
  s.text(440, 40, 'One MCTS iteration', { size: 26, weight: 700 });
  const box = (x, y, title, body, color, fill) => {
    s.rect(x, y, 240, 70, { color, fill, fillStyle: 'solid' });
    s.text(x + 120, y + 30, title, { size: 22, weight: 700 });
    s.text(x + 120, y + 56, body, { size: 16 });
  };
  box(60, 100, '1. Select', 'walk down by UCB1 to a free slot', C.blue, C.blueSoft);
  box(520, 100, '2. Expand', 'add one child: one generator call', C.amber, C.amberSoft);
  box(520, 230, '3. Score', 'the PRM rates the new step', C.green, C.greenSoft);
  box(60, 230, '4. Back up', 'add path score to every ancestor', C.violet, C.blueSoft);
  s.arrow(300, 135, 520, 135, { color: C.muted });
  s.arrow(640, 170, 640, 230, { color: C.muted });
  s.arrow(520, 265, 300, 265, { color: C.muted });
  s.arrow(180, 230, 180, 170, { color: C.muted });
  s.text(410, 205, 'repeat until budget is spent', { size: 18 });
  save('59.2-mcts-loop.svg', s);
}

{ // 4. UCB1 worked example, numbers from the experiment
  const s = new Sketch(880, 350, { title: 'Bar chart of UCB1 scores for four children, split into mean and bonus', seed: 104 });
  s.text(440, 40, 'UCB1 at one node: which child to expand next', { size: 24, weight: 700 });
  s.text(440, 66, 'solid = mean reward, hatched = exploration bonus', { size: 16 });
  const base = 270, scale = 70;
  const names = ['A', 'B', 'C', 'D'];
  names.forEach((name, i) => {
    const cx = [200, 360, 520, 680][i];
    const u = d.ucb[name];
    const mh = u.mean * scale, bh = (u.ucb - u.mean) * scale;
    s.rect(cx - 50, base - mh, 100, mh, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx - 50, base - mh - bh, 100, bh, { color: C.amber, fill: C.amberSoft });
    s.text(cx, base - u.ucb * scale - 10, `UCB ${u.ucb.toFixed(3)}`, { size: 17, weight: 700 });
    s.text(cx, 294, `child ${name}`, { size: 18, weight: 700 });
    s.text(cx, 318, `n=${u.visits}, mean ${u.mean.toFixed(3)}`, { font: 'mono', size: 15 });
  });
  s.line(120, base, 760, base, { color: C.muted });
  save('59.2-ucb-example.svg', s);
}

{ // 5. measured success rates: budget panel and noise panel
  const s = new Sketch(880, 400, { title: 'Bar chart of simulated success rates by compute budget and verifier noise', seed: 105 });
  s.text(440, 40, 'Simulation: success rate against compute and verifier noise', { size: 22, weight: 700 });
  const strats = [['ORM best-of-N', 'ORM best-of-N', C.amber, C.amberSoft], ['PRM beam', 'PRM beam', C.blue, C.blueSoft], ['PRM MCTS', 'PRM MCTS', C.green, C.greenSoft]];
  const legendX = [150, 390, 580];
  strats.forEach(([label, key, color, fill], i) => {
    s.rect(legendX[i], 88, 16, 16, { color, fill, fillStyle: 'solid' });
    s.text(legendX[i] + 24, 101, label, { size: 17, anchor: 'start' });
  });
  const base = 340, top = 180;   // p = 1 sits at y = top
  const y = (p) => base - (base - top) * p;
  const bars = (cx, p, se, color, fill, i) => {
    const x = cx - 35 + i * 24;
    s.rect(x, y(p), 22, base - y(p), { color, fill, fillStyle: 'solid' });
    s.line(x + 11, y(p - se), x + 11, y(p + se), { color: C.ink, width: 1.5 });
  };
  s.text(230, 132, 'Budget at sigma = 0.5', { size: 18, weight: 700 });
  s.line(50, base, 420, base, { color: C.muted });
  [16, 32, 64, 128].forEach((b, g) => {
    const cx = 85 + g * 85;
    strats.forEach(([label, key, color, fill], i) => {
      const m = d.main[key][String(b)];
      bars(cx, m.p, m.se, color, fill, i);
    });
    s.text(cx + 12, 362, `B=${b}`, { font: 'mono', size: 15 });
  });
  s.text(230, 388, 'generator calls B', { size: 17 });

  s.text(655, 132, 'Noise at B = 64', { size: 18, weight: 700 });
  s.line(455, base, 850, base, { color: C.muted });
  ['0.25', '0.5', '1.0', '2.0'].forEach((sigKey, g) => {
    const cx = 510 + g * 90;
    strats.forEach(([name, , color, fill], i) => {
      const p = d.sweep_b64[name][sigKey];
      bars(cx, p, Math.sqrt((p * (1 - p)) / 400), color, fill, i);
    });
    s.text(cx + 12, 362, sigKey, { font: 'mono', size: 15 });
  });
  s.text(655, 388, 'verifier noise sigma', { size: 17 });
  save('59.2-accuracy-vs-compute.svg', s);
}
console.log('59.2 diagrams written');
