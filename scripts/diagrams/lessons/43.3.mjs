import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-43-langchain-lcel/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from the run of the lesson's mini tracer (simulated seconds).
// root total 1.170 s; self times: answer_chain 0.004, retrieve 0.350, prompt 0.003, ChatModel 0.812, parse 0.001; tokens 396.
const TOTAL = 1.170;

// 1. The run tree: one run per step, nested under the root run. The bad value is highlighted.
{
  const s = new Sketch(880, 300, { title: 'A run tree: a root chain run with four child runs; the retrieve child returned an empty list', seed: 4311 });
  s.text(440, 34, 'One run per step, nested under the root run', { size: 24, weight: 700 });
  s.rect(340, 60, 200, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 82, 'answer_chain', { font: 'mono', size: 16, weight: 700 });
  s.text(440, 104, 'run_type: chain', { font: 'mono', size: 15 });
  const kids = [
    { x: 30,  name: 'retrieve',   type: 'retriever', fill: C.roseSoft,  color: C.rose },
    { x: 245, name: 'prompt',     type: 'prompt',    fill: C.greenSoft, color: C.green },
    { x: 460, name: 'ChatModel',  type: 'llm',       fill: C.greenSoft, color: C.green },
    { x: 675, name: 'parse',      type: 'parser',    fill: C.greenSoft, color: C.green },
  ];
  for (const k of kids) {
    const cx = k.x + 88;
    s.line(440, 112, cx, 170, { color: C.muted });
    s.rect(k.x, 170, 176, 58, { color: k.color, fill: k.fill, fillStyle: 'solid' });
    s.text(cx, 196, k.name, { font: 'mono', size: 16, weight: 700 });
    s.text(cx, 218, k.type, { font: 'mono', size: 15 });
  }
  s.text(118, 256, 'outputs: []', { font: 'mono', size: 16, color: C.rose, weight: 700 });
  s.text(440, 290, 'Read the tree top-down; the first wrong output is the suspect.', { size: 19 });
  save('43.3-run-tree.svg', s);
}

// 2. Timeline of one trace: bar positions from the simulated clock (0.004 glue, then each step).
{
  const s = new Sketch(880, 290, { title: 'Timeline of one trace: retrieve, prompt and model run in sequence over 1.170 seconds', seed: 4312 });
  s.text(440, 34, 'One trace on a clock: the model call takes most of the time', { size: 24, weight: 700 });
  const x0 = 200, W = 640, sc = W / TOTAL;
  const X = (t) => x0 + t * sc;
  const rows = [
    { name: 'answer_chain', from: 0,     to: TOTAL, fill: C.blueSoft,  color: C.blue,  label: '1.170 s total' },
    { name: 'retrieve',     from: 0.004, to: 0.354, fill: C.amberSoft, color: C.amber, label: '0.350 s' },
    { name: 'prompt',       from: 0.354, to: 0.357, fill: C.greenSoft, color: C.green, label: '0.003 s', after: true },
    { name: 'ChatModel',    from: 0.357, to: 1.169, fill: C.roseSoft,  color: C.rose,  label: '0.812 s · 396 tokens' },
    { name: 'parse',        from: 1.169, to: 1.170, fill: C.greenSoft, color: C.green, label: '0.001 s', after: true },
  ];
  rows.forEach((r, i) => {
    const y = 70 + i * 36;
    s.text(40, y + 17, r.name, { font: 'mono', size: 16, anchor: 'start' });
    const bw = Math.max(X(r.to) - X(r.from), 2);
    s.rect(X(r.from), y, bw, 24, { color: r.color, fill: r.fill, fillStyle: 'solid' });
    if (r.after) s.text(X(r.to) - 6, y + 17, r.label, { font: 'mono', size: 15, anchor: 'end' });
    else s.text(X(r.from) + bw / 2, y + 17, r.label, { font: 'mono', size: 15 });
  });
  s.line(x0, 252, x0 + W, 252, { color: C.muted });
  for (const t of [0, 0.5, 1.0]) {
    s.line(X(t), 248, X(t), 256, { color: C.muted });
    s.text(X(t), 276, `${t.toFixed(1)} s`, { font: 'mono', size: 15 });
  }
  save('43.3-timeline.svg', s);
}

// 3. Self time: time inside a run but not in its children, as a share of the root total.
{
  const s = new Sketch(880, 290, { title: 'Self time of each run as a share of the 1.170-second root total', seed: 4313 });
  s.text(440, 34, 'Self time: where the time is spent, not counting children', { size: 24, weight: 700 });
  const rows = [
    { name: 'ChatModel',    self: 0.812, fill: C.roseSoft,  color: C.rose },
    { name: 'retrieve',     self: 0.350, fill: C.amberSoft, color: C.amber },
    { name: 'answer_chain', self: 0.004, fill: C.blueSoft,  color: C.blue },
    { name: 'prompt',       self: 0.003, fill: C.greenSoft, color: C.green },
    { name: 'parse',        self: 0.001, fill: C.greenSoft, color: C.green },
  ];
  const x0 = 210, maxW = 500;
  rows.forEach((r, i) => {
    const y = 70 + i * 40;
    const share = r.self / TOTAL;
    const bw = Math.max(share * maxW, 2);
    s.text(40, y + 19, r.name, { font: 'mono', size: 16, anchor: 'start' });
    s.rect(x0, y, bw, 26, { color: r.color, fill: r.fill, fillStyle: 'solid' });
    s.text(x0 + bw + 12, y + 19, `${r.self.toFixed(3)} s · ${(share * 100).toFixed(1)}%`, { font: 'mono', size: 15, anchor: 'start' });
  });
  s.text(440, 278, 'Self time sums to the root total: 0.812 + 0.350 + 0.004 + 0.003 + 0.001 = 1.170 s', { size: 18 });
  save('43.3-self-time.svg', s);
}

// 4. Good run and bad run side by side: the first wrong value is the retrieve output.
{
  const s = new Sketch(880, 316, { title: 'Good and bad runs compared row by row; the bad retrieve output starts the chain of wrong values', seed: 4314 });
  s.text(440, 34, 'Find the first wrong value, not the last one', { size: 24, weight: 700 });
  s.text(350, 74, 'good run', { size: 21, weight: 700 });
  s.text(680, 74, 'bad run', { size: 21, weight: 700 });
  const rows = [
    { label: 'retrieve output', good: "['LCEL pipes runnables with |.']", bad: '[]', fg: C.green, fb: C.roseSoft, cb: C.rose },
    { label: 'prompt context',  good: 'Context: 1 passage',                bad: 'Context: []', fg: C.greenSoft, fb: C.roseSoft, cb: C.rose },
    { label: 'final answer',    good: 'Use the | operator.',               bad: 'Use the | operator.', fg: C.blueSoft, fb: C.blueSoft, cb: C.blue },
  ];
  rows.forEach((r, i) => {
    const y = 96 + i * 56;
    s.text(40, y + 26, r.label, { size: 18, anchor: 'start' });
    s.rect(200, y, 300, 40, { color: C.green, fill: r.fg, fillStyle: 'solid' });
    s.text(350, y + 26, r.good, { font: 'mono', size: 15 });
    s.rect(530, y, 300, 40, { color: r.cb, fill: r.fb, fillStyle: 'solid' });
    s.text(680, y + 26, r.bad, { font: 'mono', size: 15 });
  });
  s.text(440, 276, 'The final answer matches in both runs, so only the middle rows show the fault.', { size: 18 });
  s.text(440, 302, 'Fix the retrieve step first; the prompt and the model are downstream.', { size: 18 });
  save('43.3-good-vs-bad.svg', s);
}
