import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-42-graph-rag/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Pipeline stages
{
  const s = new Sketch(880, 300, { title: 'Hybrid retrieval pipeline: six stages from query to prompt', seed: 101 });
  s.text(440, 34, 'The hybrid pipeline, stage by stage', { size: 26, weight: 700 });
  const labels = [['query', 'text'], ['embed', 'query'], ['vector', 'seeds'], ['expand', '1-2 hops'], ['cut to', 'budget'], ['prompt', 'to the LLM']];
  const fills = [C.blueSoft, C.blueSoft, C.amberSoft, C.greenSoft, C.greenSoft, C.blueSoft];
  const colors = [C.blue, C.blue, C.amber, C.green, C.green, C.blue];
  const w = 118, gap = 26, x0 = 21;
  labels.forEach(([a, b], i) => {
    const x = x0 + i * (w + gap);
    s.rect(x, 100, w, 76, { color: colors[i], fill: fills[i], fillStyle: 'solid' });
    s.text(x + w / 2, 130, a, { size: 19, weight: 700 });
    s.text(x + w / 2, 156, b, { size: 17 });
    if (i < labels.length - 1) s.arrow(x + w + 3, 138, x + w + gap - 3, 138, { color: C.muted });
  });
  s.note(120, 220, 300, 56, ['k = 3 seeds by cosine', 'ANN index would replace the scan'], { size: 18 });
  s.note(470, 220, 300, 56, ['hop limit 2: keeps fan-out bounded', 'order by (hop, -similarity)'], { size: 18 });
  save('42.3-pipeline.svg', s);
}

// 2. Toy graph worked example
{
  const s = new Sketch(880, 400, { title: 'Seven-node toy graph coloured by hop level from two vector seeds', seed: 102 });
  s.text(440, 34, 'Toy graph: seeds, hops and a distractor', { size: 26, weight: 700 });
  const N = {
    A: { x: 230, y: 140, sim: 0.95, fill: C.amberSoft, col: C.amber },
    E: { x: 620, y: 140, sim: 0.88, fill: C.amberSoft, col: C.amber },
    B: { x: 370, y: 140, sim: 0.20, fill: C.blueSoft, col: C.blue },
    C: { x: 510, y: 140, sim: 0.05, fill: C.greenSoft, col: C.green },
    D: { x: 110, y: 260, sim: 0.10, fill: C.blueSoft, col: C.blue },
    F: { x: 620, y: 260, sim: 0.15, fill: C.blueSoft, col: C.blue },
    G: { x: 790, y: 260, sim: 0.30, fill: C.roseSoft, col: C.rose },
  };
  const edges = [['A', 'B'], ['A', 'D'], ['E', 'F'], ['B', 'C']];
  for (const [u, v] of edges) s.line(N[u].x, N[u].y, N[v].x, N[v].y, { color: C.ink, width: 2 });
  for (const [k, n] of Object.entries(N)) {
    s.circle(n.x, n.y, 74, { color: n.col, fill: n.fill, fillStyle: 'solid' });
    s.text(n.x, n.y - 2, k, { size: 24, weight: 700 });
    s.text(n.x, n.y + 22, `${n.sim.toFixed(2)}`, { size: 16, font: 'mono' });
  }
  s.text(790, 330, 'no edges: not reachable', { size: 17, color: C.muted });
  s.note(40, 350, 800, 36, ['budget 6: hybrid keeps C (hop 2); vector top-6 drops it'], { size: 19 });
  save('42.3-toy-graph.svg', s);
}

// 3. Recall at equal budget (measured by experiment.py)
{
  const s = new Sketch(880, 400, { title: 'Gold recall at equal context budgets on a synthetic graph', seed: 103 });
  s.text(440, 34, 'Gold recall by context budget (synthetic graph, 500 questions)', { size: 23, weight: 700 });
  const budgets = [5, 10, 20, 40];
  const series = [
    { name: 'vector only', color: C.muted, fill: '#9ca3af', vals: [4.0, 7.2, 14.2, 21.6] },
    { name: 'hybrid, 1 hop', color: C.blue, fill: C.blue, vals: [3.4, 8.6, 13.2, 13.6] },
    { name: 'hybrid, 2 hops', color: C.green, fill: C.green, vals: [3.4, 8.6, 14.4, 43.0] },
    { name: 'random graph, 2 hops', color: C.rose, fill: C.rose, vals: [0.8, 1.6, 3.0, 12.8] },
  ];
  // legend
  series.forEach((sr, i) => {
    const lx = 120 + i * 180;
    s.rect(lx, 60, 18, 18, { color: sr.color, fill: sr.fill, fillStyle: 'solid' });
    s.text(lx + 26, 74, sr.name, { size: 17, anchor: 'start' });
  });
  const base = 330, top = 120, maxV = 50;
  const yOf = (v) => base - (v / maxV) * (base - top);
  for (let t = 0; t <= 50; t += 10) {
    s.line(110, yOf(t), 840, yOf(t), { color: C.muted, width: 1, dash: t === 0 ? undefined : '4 8' });
    s.text(96, yOf(t) + 6, `${t}%`, { size: 15, font: 'mono', anchor: 'end', color: C.muted });
  }
  const groupW = 730 / budgets.length;
  budgets.forEach((b, gi) => {
    const gx = 130 + gi * groupW + (groupW - 4 * 32 - 3 * 6) / 2;
    series.forEach((sr, si) => {
      const x = gx + si * 38, v = sr.vals[gi], y = yOf(v);
      s.rect(x, y, 32, base - y, { color: sr.color, fill: sr.fill, fillStyle: 'solid' });
      s.text(x + 16, y - 8, v.toFixed(1), { size: 14, font: 'mono' });
    });
    s.text(130 + gi * groupW + groupW / 2, 360, `budget ${b}`, { size: 18 });
  });
  s.text(440, 392, 'Same number of retrieved nodes for every bar. Half-width of 95% CI is at most 4.4 points.', { size: 15, color: C.muted });
  save('42.3-recall-budget.svg', s);
}

// 4. Fan-out per hop (measured by experiment.py)
{
  const s = new Sketch(880, 360, { title: 'Mean number of new nodes per hop from three seeds', seed: 104 });
  s.text(440, 34, 'Fan-out: new nodes per hop from 3 seeds', { size: 26, weight: 700 });
  const bars = [['hop 0 (seeds)', 3.0, C.amber, C.amberSoft], ['hop 1', 19.1, C.blue, C.blueSoft], ['hop 2', 65.6, C.green, C.greenSoft]];
  const base = 290, top = 90, maxV = 70;
  const yOf = (v) => base - (v / maxV) * (base - top);
  bars.forEach(([name, v, col, fill], i) => {
    const x = 170 + i * 220, y = yOf(v);
    s.rect(x, y, 130, base - y, { color: col, fill, fillStyle: 'solid' });
    s.text(x + 65, y - 10, v.toFixed(1), { size: 20, font: 'mono', weight: 700 });
    s.text(x + 65, 320, name, { size: 19 });
  });
  s.line(120, base, 840, base, { color: C.ink, width: 2 });
  s.note(60, 110, 280, 62, ['400 entities in total', 'hops 0-2 cover about 22%'], { size: 18 });
  s.text(440, 352, 'Mean degree 6.96. Each hop multiplies the frontier, so the cap and the budget do the work.', { size: 15, color: C.muted });
  save('42.3-fanout.svg', s);
}
