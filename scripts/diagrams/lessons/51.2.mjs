import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-08-agents/chapter-51-langgraph/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below comes from the experiment run for lesson 51.2 (langgraph 1.2.24).

// 1. Router anatomy: node -> node -> route function -> key -> path map -> next node
{
  const s = new Sketch(880, 350, { title: 'write and critic nodes, then a route function that either loops back to write or ends', seed: 201 });
  s.text(440, 34, 'A path function returns a key; the path map turns it into a node', { size: 24, weight: 700 });
  s.rect(40, 150, 130, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(105, 185, 'write', { size: 22 });
  s.arrow(170, 178, 250, 178, { color: C.muted });
  s.rect(250, 150, 130, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(315, 185, 'critic', { size: 22 });
  s.arrow(380, 178, 460, 178, { color: C.muted });
  s.rect(460, 150, 180, 56, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(550, 185, 'route(state)', { font: 'mono', size: 16 });
  s.rect(730, 60, 110, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(785, 92, 'END', { size: 22 });
  s.arrow(630, 152, 730, 98, { color: C.muted });
  s.text(610, 112, 'done, give_up', { anchor: 'end', size: 18 });
  s.curveArrow(550, 206, 550, 300, 105, 206, { color: C.rose });
  s.text(300, 268, 'revise', { size: 20 });
  s.text(440, 326, "path_map = {'done': END, 'give_up': END, 'revise': 'write'}", { font: 'mono', size: 16 });
  save('51.2-router-anatomy.svg', s);
}

// 2. Six steps of the worked example, state after each node
{
  const s = new Sketch(880, 340, { title: 'Six steps: write and critic alternate three times, then the route ends the run', seed: 202 });
  s.text(440, 34, 'The worked example: state after each step', { size: 26, weight: 700 });
  const steps = [
    ['write', 'attempts=1', 'blue'], ['critic', 'score=0.3', 'amber'],
    ['write', 'attempts=2', 'blue'], ['critic', 'score=0.55', 'amber'],
    ['write', 'attempts=3', 'blue'], ['critic', 'score=0.9', 'amber'],
  ];
  steps.forEach(([name, st, col], i) => {
    const x = 30 + 120 * i;
    const color = col === 'blue' ? C.blue : C.amber;
    const fill = col === 'blue' ? C.blueSoft : C.amberSoft;
    s.text(x + 50, 98, `step ${i + 1}`, { size: 15, color: C.muted });
    s.rect(x, 110, 100, 80, { color, fill, fillStyle: 'solid' });
    s.text(x + 50, 142, name, { size: 20 });
    s.text(x + 50, 170, st, { size: 16 });
    s.arrow(x + 100, 150, x + 120, 150, { color: C.muted });
  });
  s.rect(750, 110, 100, 80, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(800, 142, 'END', { size: 22 });
  s.text(800, 170, 'score 0.9', { size: 16 });
  s.note(40, 230, 800, 70, ['Scores 0.3 and 0.55 are below the 0.8 threshold, so they route back to write.', 'Score 0.9 passes, so the route returns done and the run ends. Attempts never reach the limit of 5.'], { size: 19 });
  save('51.2-loop-supersteps.svg', s);
}

// 3. Recursion limit: node executions before GraphRecursionError, per limit
{
  const s = new Sketch(880, 460, { title: 'Bar chart: stacked node executions a and b for limits 5, 10 and 25', seed: 203 });
  s.text(440, 34, 'An unconditional cycle stops at exactly the recursion limit', { size: 24, weight: 700 });
  const base = 340, k = 9;
  const groups = [
    { L: 5, a: 3, b: 2, cx: 240 },
    { L: 10, a: 5, b: 5, cx: 440 },
    { L: 25, a: 13, b: 12, cx: 640 },
  ];
  s.line(60, base, 820, base, { color: C.muted });
  groups.forEach(({ L, a, b, cx }) => {
    s.rect(cx - 45, base - a * k, 90, a * k, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - (a * k) / 2 + 6, `a=${a}`, { size: 16 });
    s.rect(cx - 45, base - (a + b) * k, 90, b * k, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, base - (a * k) - (b * k) / 2 + 6, `b=${b}`, { size: 15 });
    s.text(cx, base - (a + b) * k - 14, `total ${a + b}`, { size: 18, weight: 700 });
    s.text(cx, base + 34, `limit ${L}`, { size: 19 });
  });
  s.rect(60, 402, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(92, 416, 'a: executions of node a', { size: 16, anchor: 'start' });
  s.rect(400, 402, 22, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(432, 416, 'b: executions of node b', { size: 16, anchor: 'start' });
  s.text(440, 446, 'One node execution counts as one step, and the error fires after exactly L steps.', { size: 17 });
  save('51.2-recursion-limit.svg', s);
}

// 4. Subgraph boundary: parent state, wrapper node, child state
{
  const s = new Sketch(880, 390, { title: 'Parent graph holds a wrapper node; the child graph has its own state and nodes', seed: 204 });
  s.text(440, 34, 'A subgraph has its own state; the wrapper node maps keys across', { size: 24, weight: 700 });
  s.rect(30, 70, 640, 270, { color: C.ink, fill: 'none', fillStyle: 'solid', dash: '6 8' });
  s.text(60, 100, 'parent graph  state: topic, report, log', { size: 18, anchor: 'start' });
  s.rect(60, 150, 160, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(140, 186, 'run_child()', { font: 'mono', size: 16 });
  s.arrow(220, 165, 300, 165, { color: C.muted });
  s.text(260, 150, 'question', { size: 15 });
  s.arrow(300, 196, 220, 196, { color: C.muted });
  s.text(260, 222, 'report', { size: 15 });
  s.rect(300, 120, 330, 150, { color: C.amber, dash: '6 8', fill: 'none', fillStyle: 'solid' });
  s.text(465, 148, 'child graph  state: question, answer, steps', { size: 16 });
  s.rect(320, 180, 120, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(380, 214, 'retrieve', { size: 18 });
  s.arrow(440, 208, 480, 208, { color: C.muted });
  s.rect(480, 180, 120, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(540, 214, 'summarise', { size: 18 });
  s.text(440, 368, 'The child steps list never reaches the parent: the wrapper returns only report and log.', { size: 17 });
  save('51.2-subgraph-boundary.svg', s);
}
