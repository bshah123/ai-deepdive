import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-07-frameworks/chapter-48-agent-architectures/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below comes from 48.2_experiment.py (run it to regenerate 48.2_data.json).
const D = JSON.parse(readFileSync(join(HERE, '48.2_data.json'), 'utf8'));

// 1. Task tree: the decomposition for the three-company question.
{
  const s = new Sketch(880, 360, { title: 'Task tree: one root question, three growth sub-goals, six lookups', seed: 101 });
  s.text(440, 30, 'Decompose the question into a tree', { size: 24, weight: 700 });
  s.rect(270, 50, 340, 46, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 80, 'Which company grew revenue fastest?', { size: 18 });
  const cols = [['Acme', 170], ['Bolt', 440], ['Cobalt', 710]];
  for (const [name, cx] of cols) {
    s.arrow(440, 96, cx, 136, { color: C.muted });
    s.rect(cx - 100, 136, 200, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, 164, `${name}: growth`, { size: 18 });
    for (const [dx, lab] of [[-55, 'rev 2023'], [55, 'rev 2024']]) {
      s.arrow(cx, 180, cx + dx, 236, { color: C.muted });
      s.rect(cx + dx - 50, 236, 100, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
      s.text(cx + dx, 262, lab, { size: 16, font: 'mono' });
    }
  }
  s.note(250, 296, 380, 52, ['leaves: 6 lookups, no dependencies', 'then: 3 growths, 1 pick, 1 answer'], { size: 18 });
  save('48.2-task-tree.svg', s);
}

// 2. Sequential rounds versus dependency waves, from the executed plan.
{
  const s = new Sketch(880, 330, { title: 'Eleven calls run one per round, or four waves', seed: 102 });
  s.text(440, 30, 'Same eleven steps, two schedules', { size: 24, weight: 700 });
  s.text(40, 66, `plan-and-solve, one call at a time: ${D.seq_rounds} rounds`, { size: 19, anchor: 'start' });
  for (let i = 0; i < D.n_steps; i++) {
    const x = 40 + i * 74;
    s.rect(x, 76, 66, 44, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 33, 104, `s${i + 1}`, { size: 16, font: 'mono' });
  }
  s.text(40, 176, `dependency waves, parallel inside a round: ${D.wave_rounds} rounds`, { size: 19, anchor: 'start' });
  const groups = [[40, D.waves[0], 3], [330, D.waves[1], 3], [620, D.waves[2], 1], [720, D.waves[3], 1]];
  groups.forEach(([gx, ids, perRow], g) => {
    const rows = Math.ceil(ids.length / perRow);
    ids.forEach((id, k) => {
      const col = k % perRow, row = Math.floor(k / perRow);
      const x = gx + col * 84, y = 190 + row * 46;
      s.rect(x, y, 76, 38, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
      s.text(x + 38, y + 25, id, { size: 16, font: 'mono' });
    });
    const w = perRow * 84 - 8;
    s.text(gx + w / 2, 300, `round ${g + 1}`, { size: 17 });
  });
  save('48.2-rounds.svg', s);
}

// 3. Error compounding: measured-by-simulation success probabilities.
{
  const s = new Sketch(880, 340, { title: 'Chance that every step succeeds, assumed per-step 0.95', seed: 103 });
  s.text(440, 30, 'Errors compound along a flat plan', { size: 24, weight: 700 });
  const base = 262, top = 70, H = base - top;
  s.line(80, base, 840, base, { color: C.muted });
  const bars = [
    [D.flat_analytic['6'], '6 steps,\nno checks', C.rose, C.roseSoft],
    [D.flat_analytic['12'], '12 steps,\nno checks', C.rose, C.roseSoft],
    [D.flat_analytic['24'], '24 steps,\nno checks', C.rose, C.roseSoft],
    [D.ckpt_analytic, '2 blocks of 3,\neach retried', C.green, C.greenSoft],
  ];
  bars.forEach(([v, label, col, soft], i) => {
    const cx = 160 + i * 200, h = v * H;
    s.rect(cx - 65, base - h, 130, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(cx, base - h - 14, v.toFixed(3), { size: 22, weight: 700 });
    s.text(cx, base + 26, label.split('\n'), { size: 17 });
  });
  save('48.2-error-bars.svg', s);
}

// 4. Where planning sits in an agent loop.
{
  const s = new Sketch(880, 300, { title: 'Plan-and-solve control flow', seed: 104 });
  s.text(440, 34, 'Plan first, execute the graph, replan only on failure', { size: 22, weight: 700 });
  const boxes = [
    ['Planner', 'one LLM call', C.violet, C.blueSoft],
    ['Plan', 'steps + needs', C.blue, C.blueSoft],
    ['Executor', 'runs ready steps', C.green, C.greenSoft],
    ['Answer', 'written from results', C.amber, C.amberSoft],
  ];
  boxes.forEach(([t, sub, col, soft], i) => {
    const x = 40 + i * 210;
    s.rect(x, 90, 170, 80, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 85, 122, t, { size: 22, weight: 700 });
    s.text(x + 85, 150, sub, { size: 16 });
    if (i < 3) s.arrow(x + 170, 130, x + 210, 130, { color: C.muted });
  });
  s.line(545, 170, 545, 226, { color: C.rose, dash: '6 8' });
  s.line(545, 226, 125, 226, { color: C.rose, dash: '6 8' });
  s.arrow(125, 226, 125, 172, { color: C.rose });
  s.text(335, 256, 'only if a step fails: replan', { size: 17, color: C.rose });
  save('48.2-plan-flow.svg', s);
}
