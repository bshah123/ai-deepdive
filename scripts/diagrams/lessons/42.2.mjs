import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-42-graph-rag/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers are copied from the output of the lesson's visible code (lesson_code run, numpy 2.5.5).
const BLUE = { c: C.blue, fill: C.blueSoft }, AMB = { c: C.amber, fill: C.amberSoft };
const GRN = { c: C.green, fill: C.greenSoft }, ROSE = { c: C.rose, fill: C.roseSoft };

// Node-link drawer: pos = [[x, y], ...] relative to (ox, oy); fills = one colour per node.
function drawGraph(s, ox, oy, pos, edges, fills) {
  for (const [u, v] of edges) {
    s.line(ox + pos[u][0], oy + pos[u][1], ox + pos[v][0], oy + pos[v][1], { color: C.muted, width: 2 });
  }
  pos.forEach(([x, y], i) => {
    s.circle(ox + x, oy + y, 36, { color: fills[i].c, fill: fills[i].fill, fillStyle: 'solid' });
    s.text(ox + x, oy + y + 6, String(i), { font: 'mono', size: 18, color: C.ink });
  });
}

// 1. Two triangles joined by one bridge: Q for three partitions
{
  const s = new Sketch(880, 300, { title: 'Modularity of three partitions of two triangles joined by a bridge', seed: 201 });
  const pos = [[-70, -30], [-95, 25], [-45, 25], [45, 25], [95, 25], [70, -30]];
  const E = [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5], [2, 3]];
  const panels = [
    { cx: 150, t: 'two triangles', q: 'Q = 0.3571', f: [BLUE, BLUE, BLUE, AMB, AMB, AMB] },
    { cx: 440, t: 'one community', q: 'Q = 0.0', f: [BLUE, BLUE, BLUE, BLUE, BLUE, BLUE] },
    { cx: 730, t: 'six singletons', q: 'Q = -0.1735', f: [BLUE, AMB, GRN, ROSE, BLUE, AMB] },
  ];
  for (const p of panels) {
    s.text(p.cx, 60, p.t, { size: 24, weight: 700 });
    s.text(p.cx, 92, p.q, { size: 22, font: 'mono' });
    drawGraph(s, p.cx, 190, pos, E, p.f);
  }
  s.text(440, 270, 'Modularity rewards edges that stay inside a group more than chance predicts', { size: 18 });
  save('42.2-two-triangles.svg', s);
}

// 2. The counterexample: one greedy move leaves community 0 in two pieces
{
  const s = new Sketch(880, 330, { title: 'One local move disconnects community 0', seed: 202 });
  const pos = [[-110, 0], [-55, 0], [0, 0], [45, -35], [-45, -35], [0, -70]];
  const E = [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5]];
  const before = [BLUE, BLUE, BLUE, BLUE, AMB, BLUE];
  const after = [BLUE, BLUE, AMB, BLUE, AMB, BLUE];
  s.text(230, 60, 'start', { size: 24, weight: 700 });
  s.text(230, 92, 'Q = -0.0556', { size: 22, font: 'mono' });
  s.text(650, 60, 'after one move', { size: 24, weight: 700 });
  s.text(650, 92, 'Q = -0.0139', { size: 22, font: 'mono' });
  drawGraph(s, 262, 215, pos, E, before);
  drawGraph(s, 682, 215, pos, E, after);
  s.arrow(340, 190, 540, 190, { color: C.ink });
  s.text(440, 168, 'move node 2', { size: 18 });
  s.text(230, 282, 'community 0 = {0,1,2,3,5}: one connected piece', { size: 17 });
  s.text(650, 282, 'community 0 = {0,1,3,5}: pieces {0,1} and {3,5}', { size: 17 });
  save('42.2-counterexample.svg', s);
}

// 3. Leiden's three phases
{
  const s = new Sketch(880, 380, { title: 'The three phases of one Leiden iteration', seed: 203 });
  const boxes = [
    { x: 30, t: '1  local moving', l: ['move each node to the', 'neighbour community that', 'raises Q'] },
    { x: 315, t: '2  refinement', l: ['inside each community P,', 'start from singletons; merge', 'only well-connected pieces'] },
    { x: 600, t: '3  aggregation', l: ['each refined piece becomes', 'one node; repeat on the', 'smaller graph'] },
  ];
  for (const b of boxes) {
    s.rect(b.x, 120, 250, 110, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(b.x + 125, 148, b.t, { size: 22, weight: 700 });
    b.l.forEach((line, k) => s.text(b.x + 125, 176 + k * 24, line, { size: 16 }));
  }
  s.arrow(282, 175, 313, 175, { color: C.ink });
  s.arrow(567, 175, 598, 175, { color: C.ink });
  s.line(725, 230, 725, 292, { color: C.muted, width: 2 });
  s.line(725, 292, 155, 292, { color: C.muted, width: 2 });
  s.arrow(155, 292, 155, 234, { color: C.muted });
  s.text(440, 318, 'repeat until no node moves', { size: 18 });
  s.text(440, 356, 'Louvain stops at step 1 and aggregates the unrefined partition P instead.', { size: 17 });
  save('42.2-leiden-phases.svg', s);
}

// 4. GraphRAG pipeline: indexing (offline) and querying (per question)
{
  const s = new Sketch(880, 330, { title: 'GraphRAG pipeline', seed: 204 });
  s.text(40, 60, 'Indexing (offline, once per corpus)', { size: 20, weight: 700, anchor: 'start' });
  const top = [['text chunks', 'source documents'], ['LLM extracts', 'entities and links'],
               ['entity graph', 'nodes and edges'], ['Leiden hierarchy', 'communities per level'],
               ['summaries', 'one per community']];
  top.forEach(([a, b], i) => {
    const x = 40 + i * 170;
    s.rect(x, 80, 150, 64, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 75, 106, a, { size: 17 });
    s.text(x + 75, 130, b, { size: 14 });
    if (i < 4) s.arrow(x + 150, 112, x + 170, 112, { color: C.ink });
  });
  s.text(40, 200, 'Querying (per global question)', { size: 20, weight: 700, anchor: 'start' });
  const bot = [['question about the corpus', 'e.g. main themes'], ['map', 'one partial answer per summary'],
               ['reduce', 'combine partial answers']];
  bot.forEach(([a, b], i) => {
    const x = 40 + i * 280;
    s.rect(x, 232, 250, 64, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + 125, 258, a, { size: 17 });
    s.text(x + 125, 282, b, { size: 14 });
    if (i < 2) s.arrow(x + 250, 264, x + 280, 264, { color: C.ink });
  });
  s.arrow(795, 150, 520, 232, { color: C.muted });
  save('42.2-graphrag-pipeline.svg', s);
}
