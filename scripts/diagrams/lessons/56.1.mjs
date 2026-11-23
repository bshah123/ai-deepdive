// Diagrams for Lesson 56.1 (LLM tracing with OpenTelemetry).
// Run: node scripts/diagrams/lessons/56.1.mjs
// Every number comes from scripts/diagrams/lessons/56.1_data.json, written by 56.1_data.py.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'content/part-09-production-ai/chapter-56-observability-cost/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => writeFileSync(join(OUT, name), sk.toString());
const D = JSON.parse(readFileSync(join(HERE, '56.1_data.json'), 'utf8'));
const byName = (n) => D.spans.find((s) => s.name === n);
const llm = byName('llm_call');
const root = byName('chat_request');
const [VERSION, , , FLAGS] = D.header.split('-');

// 1. Anatomy of one span (the first llm_call span of the run).
{
  const s = new Sketch(880, 400, { title: 'One span record with name, IDs, timing, attributes and status', seed: 561 });
  s.text(440, 40, 'One span is one record', { size: 26, weight: 700 });
  s.rect(60, 64, 760, 318, { color: C.muted });
  s.rect(60, 64, 760, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 97, `${llm.name}`, { size: 24, font: 'mono', weight: 700 });
  const rows = [
    ['trace_id', llm.trace_id, 150],
    ['span_id', llm.span_id, 180],
    ['parent_id', llm.parent_id, 210],
    ['time', `${llm.start_ms} ms -> ${llm.end_ms} ms`, 240],
  ];
  for (const [k, v, y] of rows) {
    s.text(90, y, k, { font: 'mono', size: 17, anchor: 'start', color: C.muted });
    s.text(300, y, v, { font: 'mono', size: 17, anchor: 'start' });
  }
  s.text(90, 276, 'attributes', { font: 'mono', size: 17, anchor: 'start', color: C.muted });
  const attrs = Object.entries(llm.attributes).filter(([k]) => k.startsWith('gen_ai'));
  attrs.forEach(([k, v], i) => s.text(300, 276 + i * 26, `${k} = ${v}`, { font: 'mono', size: 17, anchor: 'start' }));
  s.text(90, 364, 'status', { font: 'mono', size: 17, anchor: 'start', color: C.muted });
  s.text(300, 364, llm.status, { font: 'mono', size: 17, anchor: 'start', color: C.green });
  save('56.1-span-anatomy.svg', s);
}

// 2. Waterfall of the whole trace, drawn to scale.
{
  const s = new Sketch(880, 430, { title: 'Waterfall of one chat request, drawn to scale', seed: 562 });
  const x0 = 290, W = 560, k = W / D.total_ms;
  s.text(440, 40, 'One request as a waterfall', { size: 26, weight: 700 });
  s.text(40, 80, 'span', { size: 18, anchor: 'start', color: C.muted });
  s.text(262, 80, 'duration', { size: 18, anchor: 'end', color: C.muted });
  for (const ms of [0, 1000, 2000]) {
    s.line(x0 + ms * k, 88, x0 + ms * k, 322, { color: C.muted, dash: '6 8', width: 1 });
    s.text(x0 + ms * k, 344, ms === 0 ? '0' : `${ms} ms`, { size: 16, font: 'mono', color: C.muted });
  }
  const ordered = [root, ...D.spans.filter((sp) => sp !== root).sort((a, b) => a.start_ms - b.start_ms)];
  ordered.forEach((sp, i) => {
    const top = 96 + i * 40, cy = top + 13;
    const depth = sp.parent_id === null ? 0 : 1;
    const err = sp.status !== 'OK';
    const col = sp.name === 'chat_request' ? C.amber : err ? C.rose : sp.name === 'llm_call' ? C.blue : C.green;
    const soft = sp.name === 'chat_request' ? C.amberSoft : err ? C.roseSoft : sp.name === 'llm_call' ? C.blueSoft : C.greenSoft;
    s.text(40 + depth * 22, cy + 6, sp.name, { size: 18, anchor: 'start', font: 'hand' });
    s.text(262, cy + 6, `${sp.end_ms - sp.start_ms} ms`, { size: 16, anchor: 'end', font: 'mono' });
    s.rect(x0 + sp.start_ms * k, top, Math.max((sp.end_ms - sp.start_ms) * k, 3), 26, { color: col, fill: soft, fillStyle: 'solid' });
  });
  s.note(470, 362, 370, 56, [`LLM calls: ${D.llm_ms} of ${D.total_ms} ms = ${Math.round(D.llm_share * 100)}%`, 'tool_call timed out; the request went on'], { size: 18 });
  save('56.1-waterfall.svg', s);
}

// 3. Context crosses a service boundary in one header.
{
  const s = new Sketch(880, 370, { title: 'traceparent header carries the span context between services', seed: 563 });
  s.text(440, 40, 'Context crosses services in one header', { size: 26, weight: 700 });
  s.rect(40, 84, 250, 84, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(165, 118, 'gateway', { size: 22, weight: 700 });
  s.text(165, 146, 'chat_request span', { font: 'mono', size: 15 });
  s.rect(590, 84, 250, 84, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(715, 118, 'retrieval service', { size: 22, weight: 700 });
  s.text(715, 146, 'vector_search span', { font: 'mono', size: 15 });
  s.arrow(296, 126, 582, 126, { color: C.ink });
  s.text(440, 112, 'one HTTP header', { size: 18, color: C.muted });
  s.text(440, 196, `traceparent: ${D.header}`, { font: 'mono', size: 15 });
  const cells = [
    [40, 120, VERSION, 'version', 'fixed for version 00'],
    [180, 300, 'trace-id', '32 hex chars, not all zero', ''],
    [500, 200, 'parent-id', '16 hex chars, not all zero', ''],
    [720, 120, FLAGS, 'flags', 'bit 0 = sampled'],
  ];
  for (const [x, w, big, label, note] of cells) {
    s.rect(x, 232, w, 52, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + w / 2, 264, big, { font: 'mono', size: 17, weight: 700 });
    s.text(x + w / 2, 312, label, { size: 18 });
    if (note) s.text(x + w / 2, 336, note, { size: 16, color: C.muted });
  }
  save('56.1-propagation.svg', s);
}

// 4. Head sampling: the root decides once, children follow the flag.
{
  const s = new Sketch(880, 400, { title: 'Head sampling: the root decides, children follow', seed: 564 });
  s.text(440, 40, 'Head sampling: the root decides once', { size: 26, weight: 700 });
  const boxes = [[40, 'gateway (root)', 'draws from trace ID'], [330, 'retrieval', 'reads the flag'], [620, 'LLM service', 'reads the flag']];
  for (const [x, a, b] of boxes) {
    s.rect(x, 70, 220, 74, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 110, 104, a, { size: 21, weight: 700 });
    s.text(x + 110, 130, b, { size: 16, color: C.muted });
  }
  s.arrow(262, 107, 326, 107, { color: C.ink });
  s.arrow(552, 107, 616, 107, { color: C.ink });
  s.text(294, 92, 'flag 01', { font: 'mono', size: 14 });
  s.text(584, 92, 'flag 01', { font: 'mono', size: 14 });
  const frac = D.sample_kept / D.sample_total;
  const x0 = 210, W = 560;
  s.text(40, 200, 'all roots', { size: 20, anchor: 'start' });
  s.rect(x0, 180, W, 34, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(x0 + W / 2, 204, `${D.sample_total.toLocaleString('en-US')} root traces`, { size: 18 });
  s.text(40, 262, 'kept', { size: 20, anchor: 'start' });
  s.rect(x0, 242, Math.max(W * frac, 3), 34, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(x0 + W * frac + 14, 266, `${D.sample_kept} kept (${(frac * 100).toFixed(1)}%)`, { size: 18, anchor: 'start' });
  s.text(440, 340, `sampler: TraceIdRatioBased(${D.sample_ratio}), wrapped in ParentBased`, { font: 'mono', size: 15, color: C.muted });
  s.text(440, 368, 'the decision is made at span start, before any error is known', { size: 18 });
  save('56.1-sampling.svg', s);
}
console.log('wrote 4 SVGs to', OUT);
