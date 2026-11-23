import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-43-langchain-lcel/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers come from the lesson's experiment run (langchain-core 0.3.86, one machine).

// 1. Fan-out: one input, one call per branch, one dict out. Output values from the visible example.
{
  const s = new Sketch(880, 370, { title: 'RunnableParallel fan-out diagram', seed: 4301 });
  s.text(440, 40, 'One input, one call per branch, one dict out', { size: 24, weight: 700 });
  s.rect(40, 135, 150, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 172, 'input', { size: 20 });
  const branches = [['upper()', 85], ['len()', 165], ['split()', 245]];
  for (const [label, y] of branches) {
    s.rect(290, y, 200, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(390, y + 31, label, { font: 'mono', size: 17 });
    s.arrow(190, 165, 290, y + 25, { color: C.muted });
  }
  s.rect(600, 85, 250, 170, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(725, 118, "'upper': str", { font: 'mono', size: 16 });
  s.text(725, 160, "'length': 30", { font: 'mono', size: 16 });
  s.text(725, 202, "'words': list", { font: 'mono', size: 16 });
  for (const [, y] of branches) {
    s.arrow(490, y + 25, 600, 170, { color: C.muted });
  }
  s.text(440, 340, 'Branches cannot read each other: each one sees only the input.', { size: 18, color: C.rose });
  save('43.2-fan-out.svg', s);
}

// 2. Timeline: measured wall time for three 0.3 s branches (one-decimal values).
{
  const s = new Sketch(880, 420, { title: 'Timeline of five ways to run three 0.3 second branches', seed: 4302 });
  s.text(440, 40, 'Wall time for three 0.3 s branches', { size: 24, weight: 700 });
  const x0 = 250, perS = 560;
  const rows = [
    { label: 'sequential invoke()', y: 100, mode: 'seq', color: C.blue, fill: C.blueSoft, total: '0.9 s' },
    { label: 'RunnableParallel.invoke', y: 160, mode: 'par', color: C.green, fill: C.greenSoft, total: '0.3 s' },
    { label: 'ainvoke, asyncio.sleep', y: 220, mode: 'par', color: C.green, fill: C.greenSoft, total: '0.3 s' },
    { label: 'ainvoke, ordinary funcs', y: 280, mode: 'par', color: C.green, fill: C.greenSoft, total: '0.3 s' },
    { label: 'ainvoke, blocking async', y: 340, mode: 'seq', color: C.rose, fill: C.roseSoft, total: '0.9 s' },
  ];
  for (const r of rows) {
    s.text(40, r.y + 6, r.label, { size: 17, anchor: 'start' });
    if (r.mode === 'seq') {
      ['b0', 'b1', 'b2'].forEach((b, i) => {
        s.rect(x0 + i * 0.3 * perS, r.y - 18, 0.3 * perS, 36, { color: r.color, fill: r.fill, fillStyle: 'solid' });
        s.text(x0 + i * 0.3 * perS + 0.15 * perS, r.y + 6, b, { font: 'mono', size: 15 });
      });
    } else {
      s.rect(x0, r.y - 18, 0.3 * perS, 36, { color: r.color, fill: r.fill, fillStyle: 'solid' });
      s.text(x0 + 0.15 * perS, r.y + 6, 'b0 | b1 | b2', { font: 'mono', size: 15 });
    }
    s.text(780, r.y + 6, r.total, { font: 'mono', size: 15, anchor: 'start' });
  }
  s.line(x0, 382, x0 + 0.9 * perS, 382, { color: C.muted });
  [[0, '0 s'], [0.3, '0.3 s'], [0.6, '0.6 s'], [0.9, '0.9 s']].forEach(([t, lab]) => {
    s.line(x0 + t * perS, 378, x0 + t * perS, 386, { color: C.muted });
    s.text(x0 + t * perS, 406, lab, { font: 'mono', size: 15 });
  });
  save('43.2-timeline.svg', s);
}

// 3. Stream lanes: chunk arrival times from the measured stream run (approximate).
{
  const s = new Sketch(880, 380, { title: 'Stream chunks in arrival order, one lane per branch', seed: 4303 });
  s.text(440, 40, 'Stream chunks arrive per branch, in arrival order', { size: 24, weight: 700 });
  const X = (t) => 150 + t * 1000;
  const lanes = { fast: 120, tokens: 200, slow: 280 };
  s.text(40, lanes.fast + 6, 'fast', { size: 18, anchor: 'start' });
  s.text(40, lanes.tokens + 6, 'tokens', { size: 18, anchor: 'start' });
  s.text(40, lanes.slow + 6, 'slow', { size: 18, anchor: 'start' });
  for (const y of Object.values(lanes)) s.line(X(0), y, X(0.6), y, { color: C.muted, dash: '6 8' });
  const events = [
    ['fast', 0.05, '"fast"', C.green],
    ['tokens', 0.11, '"Retr"', C.blue],
    ['tokens', 0.21, '"ieval"', C.blue],
    ['tokens', 0.31, '" is"', C.blue],
    ['slow', 0.36, '"slow"', C.amber],
    ['tokens', 0.42, '" fast"', C.blue],
    ['tokens', 0.52, '"."', C.blue],
  ];
  for (const [lane, t, label, color] of events) {
    s.circle(X(t), lanes[lane], 14, { color, fill: color, fillStyle: 'solid' });
    s.text(X(t), lanes[lane] - 20, label, { font: 'mono', size: 16 });
  }
  s.line(X(0), 330, X(0.6), 330, { color: C.muted });
  [0, 0.2, 0.4, 0.6].forEach((t) => {
    s.line(X(t), 326, X(t), 334, { color: C.muted });
    s.text(X(t), 358, `${t} s`, { font: 'mono', size: 15 });
  });
  save('43.2-stream-lanes.svg', s);
}

// 4. Batch chart: measured wall time for n inputs, max_concurrency = 4, 0.2 s per call.
{
  const s = new Sketch(880, 420, { title: 'Bar chart of batch and abatch wall time against number of inputs', seed: 4304 });
  s.text(440, 40, 'Wall time vs number of inputs (max_concurrency = 4)', { size: 24, weight: 700 });
  const base = 330, k = 350; // px per second
  const Y = (v) => base - v * k;
  [0, 0.2, 0.4, 0.6].forEach((v) => {
    s.line(120, Y(v), 790, Y(v), { color: C.muted, dash: '6 8' });
    s.text(108, Y(v) + 5, `${v} s`, { font: 'mono', size: 15, anchor: 'end' });
  });
  const data = [
    { n: 1, batch: 0.21, abatch: 0.20 },
    { n: 2, batch: 0.21, abatch: 0.20 },
    { n: 4, batch: 0.21, abatch: 0.20 },
    { n: 8, batch: 0.41, abatch: 0.40 },
    { n: 12, batch: 0.62, abatch: 0.61 },
  ];
  data.forEach((d, i) => {
    const cx = 200 + i * 140;
    const bx = cx - 48, ax = cx + 4;
    s.rect(bx, Y(d.batch), 44, d.batch * k, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(ax, Y(d.abatch), 44, d.abatch * k, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(bx + 22, Y(d.batch) - 10, d.batch.toFixed(2), { font: 'mono', size: 15 });
    s.text(ax + 22, Y(d.abatch) - 10, d.abatch.toFixed(2), { font: 'mono', size: 15 });
    s.text(cx, base + 28, `n = ${d.n}`, { size: 18 });
  });
  s.line(120, base, 790, base, { color: C.ink });
  s.text(440, 395, 'number of inputs (one call each, 0.2 s per call)', { size: 18 });
  s.rect(130, 62, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(158, 77, 'batch (threads)', { size: 16, anchor: 'start' });
  s.rect(330, 62, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(358, 77, 'abatch (asyncio)', { size: 16, anchor: 'start' });
  save('43.2-batch-chart.svg', s);
}
