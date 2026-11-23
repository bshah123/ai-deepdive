// Diagrams for lesson 51.1 (LangGraph core). Numbers come from the runs in the lesson:
// triage refund -> state after classify: route "billing", log 1 entry; 2 supersteps.
// fan-out a+b -> join: a and b share superstep 1; n = 2.
// two nodes write x in one step without a reducer -> InvalidUpdateError (langgraph 1.2.24).
// x written in two steps: 0 -> 1 -> 10 (last write wins).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-08-agents/chapter-51-langgraph/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. The triage graph: nodes, normal edges, one conditional edge.
{
  const s = new Sketch(880, 330, { title: 'Triage graph: START to classify, a conditional edge to billing or tech, both then to END', seed: 5101 });
  s.text(440, 34, 'Triage graph: one shared state, three nodes', { size: 26, weight: 700 });
  s.circle(70, 165, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(70, 171, 'START', { font: 'mono', size: 15 });
  s.rect(170, 140, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(245, 171, 'classify', { font: 'mono', size: 17 });
  s.arrow(105, 165, 170, 165, { color: C.ink });
  s.rect(440, 70, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(515, 101, 'billing', { font: 'mono', size: 17 });
  s.rect(440, 230, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(515, 261, 'tech', { font: 'mono', size: 17 });
  s.arrow(320, 152, 440, 95, { color: C.amber });
  s.text(360, 100, "'billing'", { size: 19, color: C.amber });
  s.arrow(320, 178, 440, 235, { color: C.amber });
  s.text(360, 222, "'tech'", { size: 19, color: C.amber });
  s.arrow(590, 95, 762, 142, { color: C.ink });
  s.arrow(590, 255, 762, 190, { color: C.ink });
  s.circle(800, 165, 70, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(800, 171, 'END', { font: 'mono', size: 15 });
  s.text(440, 316, "After classify, the router reads state['route'] and picks one branch.", { size: 18 });
  save('51.1-triage-graph.svg', s);
}

// 2. One step: partial update merged into state, per key.
{
  const s = new Sketch(880, 510, { title: 'State before, the partial update a node returns, and the state after the reducer merges it', seed: 5102 });
  s.text(440, 34, 'One node: it returns a partial update, and the state merges it', { size: 24, weight: 700 });
  s.rect(60, 62, 480, 110, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(300, 90, 'state before classify', { size: 18 });
  s.text(300, 118, 'question: "I want a refund for my invoice"', { font: 'mono', size: 16 });
  s.text(300, 142, 'route: (unset)', { font: 'mono', size: 16 });
  s.text(300, 164, 'log: []', { font: 'mono', size: 16 });
  s.arrow(300, 180, 300, 216, { color: C.muted });
  s.text(320, 203, 'classify returns', { size: 18, anchor: 'start', color: C.muted });
  s.rect(60, 220, 480, 100, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(300, 244, 'partial update (only the keys it wrote)', { size: 18 });
  s.text(300, 270, 'route: "billing"', { font: 'mono', size: 16 });
  s.text(300, 294, 'log: ["classify -> billing"]', { font: 'mono', size: 16 });
  s.arrow(300, 322, 300, 356, { color: C.muted });
  s.text(320, 344, 'reducers merge each key', { size: 18, anchor: 'start', color: C.muted });
  s.rect(60, 360, 480, 130, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(300, 388, 'state after classify', { size: 18 });
  s.text(300, 414, 'question: "I want a refund for my invoice"', { font: 'mono', size: 16 });
  s.text(300, 438, 'route: "billing"', { font: 'mono', size: 16 });
  s.text(300, 462, 'log: ["classify -> billing"]', { font: 'mono', size: 16 });
  s.note(585, 220, 270, 100, ['route has no reducer,', 'so the new value overwrites the old'], { size: 18 });
  s.note(585, 375, 270, 110, ['log has operator.add,', 'so the list is appended, not replaced'], { size: 18 });
  save('51.1-state-merge.svg', s);
}

// 3. Fan-out: a and b run in the same superstep.
{
  const s = new Sketch(880, 330, { title: 'Fan-out: nodes a and b both start from START and run in superstep 1; join runs in superstep 2', seed: 5103 });
  s.text(440, 34, 'Fan-out: nodes with the same input share a superstep', { size: 25, weight: 700 });
  s.line(440, 66, 440, 262, { color: C.muted, dash: '6 8' });
  s.text(270, 84, 'superstep 1', { size: 21, color: C.muted });
  s.text(620, 84, 'superstep 2', { size: 21, color: C.muted });
  s.circle(70, 160, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(70, 166, 'START', { font: 'mono', size: 15 });
  s.rect(170, 110, 200, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(270, 141, 'a: log += "a ran"', { font: 'mono', size: 15 });
  s.rect(170, 200, 200, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(270, 231, 'b: log += "b ran"', { font: 'mono', size: 15 });
  s.arrow(96, 150, 170, 135, { color: C.ink });
  s.arrow(96, 170, 170, 225, { color: C.ink });
  s.rect(520, 150, 200, 50, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(620, 181, 'join: n = len(log)', { font: 'mono', size: 15 });
  s.arrow(370, 135, 520, 168, { color: C.ink });
  s.arrow(370, 225, 520, 182, { color: C.ink });
  s.circle(800, 175, 60, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(800, 181, 'END', { font: 'mono', size: 15 });
  s.arrow(720, 175, 770, 175, { color: C.ink });
  s.note(150, 270, 580, 50, ['Both writes to log are applied when superstep 1 ends.'], { size: 18 });
  save('51.1-supersteps.svg', s);
}

// 4. Same key, same step (error) versus reducer (merge).
{
  const s = new Sketch(880, 320, { title: 'Two nodes write one key: without a reducer the step fails; with operator.add the lists merge', seed: 5104 });
  s.line(440, 60, 440, 236, { color: C.muted, dash: '6 8' });
  s.text(230, 70, 'No reducer: error', { size: 22, weight: 700, color: C.rose });
  s.rect(50, 96, 140, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 127, 'a: x = 1', { font: 'mono', size: 15 });
  s.rect(50, 176, 140, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 207, 'b: x = 2', { font: 'mono', size: 15 });
  s.arrow(190, 121, 262, 150, { color: C.rose });
  s.arrow(190, 201, 262, 170, { color: C.rose });
  s.rect(262, 120, 160, 80, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(342, 152, 'two writes to x', { size: 18 });
  s.text(342, 178, 'in one step', { size: 18 });
  s.text(230, 246, "At key 'x': Can receive only one value per step.", { size: 16 });
  s.text(665, 70, 'Reducer operator.add: append', { size: 22, weight: 700, color: C.green });
  s.rect(490, 96, 130, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(555, 127, 'a: ["a ran"]', { font: 'mono', size: 15 });
  s.rect(490, 176, 130, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(555, 207, 'b: ["b ran"]', { font: 'mono', size: 15 });
  s.arrow(620, 121, 660, 146, { color: C.green });
  s.arrow(620, 201, 660, 176, { color: C.green });
  s.rect(660, 120, 200, 80, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(760, 152, 'log = old + a + b', { font: 'mono', size: 15 });
  s.text(760, 178, '["a ran", "b ran"]', { font: 'mono', size: 15 });
  s.text(665, 246, 'log starts as [], so the result has two entries', { size: 16 });
  s.text(440, 296, 'Writes in different steps never conflict: x goes 0 -> 1 -> 10, last write wins.', { size: 18 });
  save('51.1-same-key.svg', s);
}
