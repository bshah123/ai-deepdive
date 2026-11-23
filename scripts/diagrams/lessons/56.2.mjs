import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-09-production-ai/chapter-56-observability-cost/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. One request as a trace tree on a time axis (numbers: block1.py, "one request")
{
  const s = new Sketch(880, 340, { title: 'Gantt-style trace: answer_question contains retrieve and two model calls, drawn on a time axis', seed: 5601 });
  s.text(440, 34, 'A trace is a tree of timed steps', { size: 26, weight: 700 });
  const x0 = 250, k = 540 / 1209.1;             // px per ms
  const rows = [
    { y: 80,  name: 'answer_question', start: 0,     dur: 1209.1, color: C.blue,  soft: C.blueSoft,  label: '1209.1 ms total, 3 children' },
    { y: 130, name: 'retrieve',        start: 0,     dur: 35.0,   color: C.amber, soft: C.amberSoft, label: '35.0 ms' },
    { y: 180, name: 'llm:small-model', start: 35.0,  dur: 79.5,   color: C.green, soft: C.greenSoft, label: '79.5 ms · in 271 · out 2 · $0.000139' },
    { y: 230, name: 'llm:large-model', start: 114.5, dur: 1094.6, color: C.rose,  soft: C.roseSoft,  label: '1094.6 ms · in 273 · out 70 · $0.001869' },
  ];
  for (const r of rows) {
    const bx = x0 + r.start * k, bw = r.dur * k;
    s.text(40, r.y + 22, r.name, { font: 'mono', size: 17, anchor: 'start' });
    s.rect(bx, r.y, bw, 34, { color: r.color, fill: r.soft, fillStyle: 'solid' });
    if (r.y === 230) s.text(bx + 12, r.y + 23, r.label, { font: 'mono', size: 16, anchor: 'start' });
    else if (r.y === 80) s.text(bx + 12, r.y + 23, r.label, { font: 'mono', size: 16, anchor: 'start' });
    else s.text(bx + bw + 10, r.y + 23, r.label, { font: 'mono', size: 16, anchor: 'start' });
  }
  s.line(x0, 290, 790, 290, { color: C.muted });
  for (const t of [0, 400, 800, 1200]) {
    s.line(x0 + t * k, 290, x0 + t * k, 298, { color: C.muted });
    s.text(x0 + t * k, 318, `${t} ms`, { size: 17, color: C.muted });
  }
  save('56.2-trace-tree.svg', s);
}

// 2. Export path: batching, not blocking (numbers: block1.py, "observations" line)
{
  const s = new Sketch(880, 330, { title: 'Four boxes in a row: app code, buffer, POST, backend, with 800 observations batched into 16 POSTs', seed: 5602 });
  s.text(440, 34, 'Observations leave the app in batches', { size: 26, weight: 700 });
  const boxes = [
    { x: 30,  t: 'app code',  b: 'observe() ends' },
    { x: 250, t: 'buffer',    b: 'fills to 50' },
    { x: 470, t: 'POST',      b: 'one per batch' },
    { x: 690, t: 'backend',   b: 're-links by' , b2: 'parent_id' },
  ];
  boxes.forEach((b, i) => {
    s.rect(b.x, 90, 160, 90, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(b.x + 80, 124, b.t, { size: 22, weight: 700 });
    s.text(b.x + 80, 152, b.b, { size: 17 });
    if (b.b2) s.text(b.x + 80, 172, b.b2, { size: 17 });
    if (i < 3) s.arrow(b.x + 162, 135, boxes[i + 1].x - 2, 135, { color: C.muted });
  });
  s.note(110, 214, 660, 80, ['200 requests × 4 observations = 800 observations', 'batch of 50: 16 POST calls. Unbatched: 800 POST calls.'], { size: 19 });
  s.text(440, 318, 'The request code only appends to a list; it never waits for the network.', { size: 18, color: C.muted });
  save('56.2-export-batches.svg', s);
}

// 3. Latency per step (numbers: block1.py, step table)
{
  const s = new Sketch(880, 400, { title: 'Horizontal bars: p50 and p95 latency for four steps; the large model dominates', seed: 5603 });
  s.text(440, 34, 'Latency per step over 200 requests', { size: 26, weight: 700 });
  s.rect(560, 60, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(586, 76, 'p50', { size: 18, anchor: 'start' });
  s.rect(640, 60, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(666, 76, 'p95', { size: 18, anchor: 'start' });
  const x0 = 250, k = 1 / 3;   // 1 px per 3 ms
  const data = [
    { name: 'answer_question', p50: 1162.2, p95: 1424.2, y: 130 },
    { name: 'retrieve',        p50: 35.0,   p95: 35.0,   y: 200 },
    { name: 'llm:small-model', p50: 79.7,   p95: 81.7,   y: 270 },
    { name: 'llm:large-model', p50: 1049.5, p95: 1309.8, y: 340 },
  ];
  for (const d of data) {
    s.text(40, d.y + 10, d.name, { font: 'mono', size: 17, anchor: 'start' });
    const w50 = d.p50 * k, w95 = d.p95 * k;
    s.rect(x0, d.y - 22, w50, 20, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x0 + w50 + 8, d.y - 6, d.p50.toFixed(1), { size: 18, anchor: 'start' });
    s.rect(x0, d.y + 2, w95, 20, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x0 + w95 + 8, d.y + 18, d.p95.toFixed(1), { size: 18, anchor: 'start' });
  }
  s.text(440, 392, 'Cost share: small model 7.1%, large model 92.9%, retrieve and root 0%.', { size: 18, color: C.muted });
  save('56.2-latency-bars.svg', s);
}

// 4. Sampling: head-based vs per-observation (numbers: block2.py)
{
  const s = new Sketch(880, 330, { title: 'Two bars: fraction of complete traces kept under head-based and per-observation sampling', seed: 5604 });
  s.text(440, 34, 'Sampling per trace keeps whole trees', { size: 26, weight: 700 });
  const k = 5;   // px per percent
  const rows = [
    { y: 110, label: 'head-based: one coin flip per trace', pct: 49.8, color: C.green, soft: C.greenSoft, note: 'expected 50.0%' },
    { y: 230, label: 'per-observation: one coin flip each', pct: 5.8, color: C.rose, soft: C.roseSoft, note: 'expected 0.5⁴ = 6.25%' },
  ];
  for (const r of rows) {
    s.text(40, r.y - 18, r.label, { size: 19, anchor: 'start' });
    s.rect(40, r.y, r.pct * k, 40, { color: r.color, fill: r.soft, fillStyle: 'solid' });
    s.text(40 + r.pct * k + 12, r.y + 27, `${r.pct.toFixed(1)}%  (${r.note})`, { size: 18, anchor: 'start', font: 'mono' });
  }
  s.note(120, 280, 640, 40, ['Both keep 50% of decisions; only one keeps whole trees.'], { size: 19 });
  save('56.2-sampling.svg', s);
}

// 5. Three tools, one contract (no numbers)
{
  const s = new Sketch(880, 372, { title: 'Your app emits one trace tree; three products consume it in different ways', seed: 5605 });
  s.text(440, 34, 'One instrumented app, three consumers', { size: 26, weight: 700 });
  s.rect(230, 62, 420, 60, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 98, 'your app: timed steps, model name, token counts', { size: 19 });
  const cols = [
    { x: 40,  t: 'Langfuse',   l: ['SDK sends traces and', 'observations (span,', 'generation, event)'] },
    { x: 310, t: 'Phoenix',    l: ['OpenTelemetry (OTLP)', 'spans, OpenInference', 'conventions', 'open-source product'] },
    { x: 580, t: 'Arize AX',   l: ['managed commercial', 'platform; Phoenix is', 'its open-source', 'sibling product'] },
  ];
  for (const c of cols) {
    s.arrow(440, 122, c.x + 130, 190, { color: C.muted });
    s.rect(c.x, 190, 260, 140, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(c.x + 130, 222, c.t, { size: 22, weight: 700 });
    c.l.forEach((line, i) => s.text(c.x + 130, 250 + i * 24, line, { size: 16 }));
  }
  s.text(440, 352, 'The shared part is the tree and the token counts; the product choice is about hosting and tooling.', { size: 17, color: C.muted });
  save('56.2-three-tools.svg', s);
}
