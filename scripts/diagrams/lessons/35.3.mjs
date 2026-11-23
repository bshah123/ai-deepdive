import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-05-information-retrieval/chapter-35-vector-search/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from 35.3_experiment.py (run once; writes 35.3_data.json).
const D = JSON.parse(readFileSync(join(HERE, '35.3_data.json'), 'utf8'));

// 1. Layers: fewer nodes per layer going up, one entry point at the top.
{
  const s = new Sketch(880, 470, { title: 'HNSW layers: node counts per layer', seed: 301 });
  s.text(440, 34, 'Each layer keeps a random subset of the layer below', { size: 24, weight: 700 });
  const counts = [...D.layer_sizes_2000].reverse(); // top first
  const N = D.N;
  counts.forEach((n, i) => {
    const lc = counts.length - 1 - i;
    const y = 104 + i * 70;
    s.rect(40, y - 26, 180, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(130, y + 4, `layer ${lc}`, { font: 'mono', size: 18 });
    const dots = Math.min(n, 40);
    for (let k = 0; k < dots; k++) {
      const x = 270 + k * 8;
      s.circle(x, y, 7, { color: lc === 0 ? C.muted : C.blue, fill: lc === 0 ? C.muted : C.blue, fillStyle: 'solid' });
    }
    const pct = ((n / N) * 100).toFixed(1);
    s.text(800, y + 6, `${n} node${n === 1 ? '' : 's'} (${pct}%)`, { size: 19, anchor: 'end' });
  });
  s.text(440, 446, 'Search starts at the single entry point on the top layer and moves down.', { size: 18, color: C.muted });
  save('35.3-layers.svg', s);
}

// 2. One greedy hop on a layer (illustrative positions, no measured numbers).
{
  const s = new Sketch(880, 360, { title: 'Greedy search on one layer', seed: 302 });
  s.text(440, 34, 'Greedy search: hop to the neighbour nearest the query', { size: 24, weight: 700 });
  const P = {
    A: [110, 270], B: [250, 170], C: [280, 300], D: [380, 110], E: [480, 230],
    F: [560, 300], G: [640, 170], H: [400, 320],
  };
  const edges = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'E'], ['C', 'H'], ['D', 'G'], ['E', 'F'], ['E', 'G'], ['F', 'G'], ['H', 'F']];
  for (const [a, b] of edges) s.line(...P[a], ...P[b], { color: C.muted, width: 1.4 });
  const path = [['A', 'C'], ['C', 'E'], ['E', 'G']];
  for (const [a, b] of path) s.arrow(...P[a], ...P[b], { color: C.blue, width: 3.2 });
  for (const [k, [x, y]] of Object.entries(P)) {
    const onPath = ['A', 'C', 'E', 'G'].includes(k);
    s.circle(x, y, 26, { color: onPath ? C.blue : C.ink, fill: onPath ? C.blueSoft : undefined, fillStyle: 'solid' });
    s.text(x, y + 6, k, { font: 'mono', size: 17 });
  }
  s.circle(760, 70, 24, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(760, 76, 'q', { font: 'mono', size: 18 });
  s.arrow(745, 88, 672, 150, { color: C.amber, dash: '6 8' });
  s.note(90, 56, 230, 60, ['entry point', 'from the layer above'], { size: 18 });
  s.arrow(150, 118, 112, 244, { color: C.muted, width: 1.4 });
  s.text(440, 352, 'Each hop goes to a neighbour closer to q. Stop when no neighbour is closer.', { size: 18, color: C.muted });
  save('35.3-greedy-hop.svg', s);
}

// 3. Recall against cost, measured sweep over ef.
{
  const s = new Sketch(880, 470, { title: 'Recall@10 against distance calls per query', seed: 303 });
  s.text(440, 34, 'Raising ef buys recall with distance calls', { size: 24, weight: 700 });
  const x0 = 130, x1 = 800, yTop = 90, yBot = 400; // x: 0..1000 calls; y: recall 1.0 (top) .. 0.7 (bottom)
  const X = (v) => x0 + (v / 1000) * (x1 - x0);
  const Y = (r) => yBot - ((r - 0.7) / 0.3) * (yBot - yTop);
  s.line(x0, yBot, x1, yBot, { color: C.ink, width: 2 });
  s.line(x0, yBot, x0, yTop, { color: C.ink, width: 2 });
  for (const v of [0, 250, 500, 750, 1000]) {
    s.line(X(v), yBot, X(v), yBot + 8, { color: C.ink });
    s.text(X(v), yBot + 32, String(v), { size: 17, color: C.muted });
  }
  for (const r of [0.7, 0.8, 0.9, 1.0]) {
    s.line(x0 - 8, Y(r), x0, Y(r), { color: C.ink });
    s.text(x0 - 16, Y(r) + 6, r.toFixed(1), { size: 17, color: C.muted, anchor: 'end' });
  }
  s.text(465, yBot + 66, 'distance calls per query', { size: 19 });
  s.text(60, 250, 'recall@10', { size: 19, rotate: -90 });
  const pts = D.sweep.map((r) => [X(r.dist), Y(r.recall), r]);
  for (let i = 1; i < pts.length; i++) s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color: C.blue, width: 2.2 });
  // label placement per point, chosen by hand so no label sits on the line or past the edge
  const place = [[18, 26, 'start'], [18, 26, 'start'], [-18, -16, 'end'], [-8, 40, 'start'], [8, 40, 'end']];
  pts.forEach(([px, py, r], i) => {
    s.circle(px, py, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    const [dx, dy, anc] = place[i];
    s.text(px + dx, py + dy, `ef=${r.ef} (${r.recall.toFixed(3)}, ${r.dist.toFixed(0)})`, { size: 16, anchor: anc });
  });
  s.note(560, 300, 270, 66, [`brute force: ${D.N} calls,`, 'recall 1.0 (off this scale)'], { size: 18 });
  save('35.3-recall-cost.svg', s);
}

// 4. Neighbour selection: matched ef, three graph seeds (dot plot, axis starts at 0.90).
{
  const s = new Sketch(880, 400, { title: 'Neighbour selection: recall at ef=40', seed: 304 });
  s.text(440, 34, 'Neighbour selection: same ef, three graph seeds', { size: 24, weight: 700 });
  const yTop = 90, yBot = 320;
  const Y = (r) => yBot - ((r - 0.90) / 0.10) * (yBot - yTop);
  s.line(120, yBot, 760, yBot, { color: C.ink, width: 2 });
  s.line(120, yBot, 120, yTop, { color: C.ink, width: 2 });
  for (const r of [0.90, 0.92, 0.94, 0.96, 0.98, 1.0]) {
    s.line(112, Y(r), 120, Y(r), { color: C.ink });
    s.text(104, Y(r) + 6, r.toFixed(2), { size: 17, color: C.muted, anchor: 'end' });
  }
  s.text(60, 200, 'recall@10', { size: 19, rotate: -90 });
  const groups = [
    ['heuristic', 'heuristic', 300, C.green, C.greenSoft],
    ['simple', 'simple top-M', 600, C.amber, C.amberSoft],
  ];
  for (const [key, label, x, col, soft] of groups) {
    const g = D.selection_ef40[key];
    g.recall.forEach((r, i) => s.circle(x - 40 + i * 40, Y(r), 22, { color: col, fill: soft, fillStyle: 'solid' }));
    const dMin = Math.min(...g.dist).toFixed(0), dMax = Math.max(...g.dist).toFixed(0);
    s.text(x, yBot + 36, label, { size: 22, weight: 700 });
    s.text(x, yBot + 66, `${dMin} to ${dMax} distance calls`, { size: 18, color: C.muted });
  }
  s.note(440, 110, 340, 60, ['Same ef = 40 for both. The heuristic', 'spends about 10% more distance calls.'], { size: 17 });
  save('35.3-selection.svg', s);
}
