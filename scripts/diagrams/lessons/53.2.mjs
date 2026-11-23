import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-09-production-ai/chapter-53-serving-metrics/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from 53.2_data.py (regenerate: python3 scripts/diagrams/lessons/53.2_data.py --json scripts/diagrams/lessons/53.2_data.json)
const D = JSON.parse(readFileSync(join(HERE, '53.2_data.json'), 'utf8'));

// 1. The worked example: four requests (2, 6, 2, 4 tokens) on two slots, step time 1
{
  const s = new Sketch(880, 490, { title: 'Four requests on two slots. Static batching holds finished slots idle; continuous batching refills them.', seed: 2201 });
  s.text(440, 34, 'Same four requests, two slots', { size: 24, weight: 700 });
  s.text(440, 60, 'blue: generating a token     amber: slot held but idle', { size: 16, color: C.muted });
  const X = (t) => 190 + 58 * t;
  const bar = (y, a, b, kind) => {
    const live = kind === 'live';
    s.rect(X(a), y, X(b) - X(a), 26, {
      color: live ? C.blue : C.amber, fill: live ? C.blueSoft : C.amberSoft, fillStyle: 'solid',
    });
  };
  const staticRows = [
    ['r1 (2 tokens)', [[0, 2, 'live'], [2, 6, 'idle']]],
    ['r2 (6 tokens)', [[0, 6, 'live']]],
    ['r3 (2 tokens)', [[6, 8, 'live'], [8, 10, 'idle']]],
    ['r4 (4 tokens)', [[6, 10, 'live']]],
  ];
  const contRows = [
    ['r1 (2 tokens)', [[0, 2, 'live']]],
    ['r2 (6 tokens)', [[0, 6, 'live']]],
    ['r3 (2 tokens)', [[2, 4, 'live']]],
    ['r4 (4 tokens)', [[4, 8, 'live']]],
  ];
  const panel = (title, rows, y0) => {
    s.text(40, y0, title, { size: 19, weight: 700, anchor: 'start' });
    rows.forEach(([label, segs], i) => {
      const y = y0 + 16 + i * 36;
      s.text(36, y + 13, label, { size: 16, font: 'mono', anchor: 'start' });
      for (const [a, b, kind] of segs) bar(y, a, b, kind);
    });
  };
  panel('static batching: makespan 10 steps, slot use 14 of 20 = 70%', staticRows, 96);
  panel('continuous batching: makespan 8 steps, slot use 14 of 16 = 87.5%', contRows, 270);
  for (let t = 0; t <= 10; t++) {
    s.line(X(t), 104, X(t), 252, { color: C.muted, width: 1, dash: '4 8' });
    s.line(X(t), 278, X(t), 422, { color: C.muted, width: 1, dash: '4 8' });
    s.text(X(t), 446, String(t), { size: 15, color: C.muted });
  }
  s.line(X(0), 428, X(10), 428, { color: C.muted });
  s.text(440, 476, 'decode step (every live request emits one token per step)', { size: 17 });
  save('53.2-static-vs-continuous.svg', s);
}

// 2. The scheduler loop, once per decode iteration
{
  const s = new Sketch(880, 380, { title: 'Continuous batching loop: admit, decode one token for each running request, evict the finished ones', seed: 2202 });
  s.text(440, 34, 'The scheduler runs once per decode iteration', { size: 24, weight: 700 });
  const box = (x, y, w, h, label, color, fill) => {
    s.rect(x, y, w, h, { color, fill, fillStyle: 'solid' });
    s.text(x + w / 2, y + h / 2 + 6, label, { size: 18 });
  };
  box(40, 100, 180, 60, 'waiting queue', C.muted, C.roseSoft);
  box(262, 100, 220, 60, 'admit into free slots', C.blue, C.blueSoft);
  box(562, 100, 280, 60, 'one decode step: +1 token each', C.violet, C.blueSoft);
  box(562, 220, 280, 60, 'finished? (out_len reached)', C.amber, C.amberSoft);
  box(262, 220, 220, 60, 'return to client, free slot', C.green, C.greenSoft);
  s.arrow(220, 130, 262, 130, { color: C.ink });
  s.arrow(482, 130, 562, 130, { color: C.ink });
  s.arrow(702, 160, 702, 220, { color: C.ink });
  s.arrow(562, 250, 482, 250, { color: C.ink });
  s.text(522, 240, 'yes', { size: 17, color: C.green });
  s.arrow(372, 220, 372, 160, { color: C.green });
  s.text(382, 196, 'slot is free: admit next', { size: 16, anchor: 'start', color: C.green });
  // 'no' path: stays in the batch, back to the decode step
  s.line(842, 250, 862, 250, { color: C.amber });
  s.line(862, 250, 862, 130, { color: C.amber });
  s.arrow(862, 130, 842, 130, { color: C.amber });
  s.text(700, 312, 'no: stays in the batch, decodes again next step', { size: 17, color: C.amber });
  s.text(440, 360, 'The batch is re-decided every iteration, not once per batch of requests.', { size: 17, color: C.muted });
  save('53.2-scheduler-loop.svg', s);
}

// 3. Offline throughput by batch size, from the simulation
{
  const s = new Sketch(880, 450, { title: 'Offline throughput by batch size: static and continuous batching', seed: 2203 });
  s.text(440, 34, 'Offline throughput: tokens per time unit', { size: 24, weight: 700 });
  s.rect(250, 58, 22, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(282, 72, 'static batching', { size: 17, anchor: 'start' });
  s.rect(440, 58, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(472, 72, 'continuous batching', { size: 17, anchor: 'start' });
  const base = 350, scale = 260 / 14; // 14 tokens per unit = 260 px
  ['1', '2', '4', '8', '16', '32'].forEach((b, i) => {
    const ss = D.offline[b].static.tok_per_unit, sc = D.offline[b].continuous.tok_per_unit;
    const x0 = 110 + i * 125, hs = ss * scale, hc = sc * scale;
    s.rect(x0, base - hs, 44, hs, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x0 + 22, base - hs - 10, ss.toFixed(1), { size: 16 });
    s.rect(x0 + 50, base - hc, 44, hc, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x0 + 72, base - hc - 10, sc.toFixed(1), { size: 16, weight: 700 });
    s.text(x0 + 47, base + 30, `B = ${b}`, { size: 17 });
  });
  s.line(90, base, 830, base, { color: C.muted });
  const r1 = D.offline['1'].continuous.tok_per_unit / D.offline['1'].static.tok_per_unit;
  const r32 = D.offline['32'].continuous.tok_per_unit / D.offline['32'].static.tok_per_unit;
  s.text(440, 432, `continuous / static: ${r1.toFixed(1)}x at B = 1, ${r32.toFixed(1)}x at B = 32 (400 requests, one seed)`, { size: 17 });
  save('53.2-offline-throughput.svg', s);
}

// 4. Online latency at one arrival rate, batch size 8
{
  const s = new Sketch(880, 460, { title: 'Online latency at fixed arrival rate, batch size 8: static versus continuous batching', seed: 2204 });
  s.text(440, 34, 'Online serving at a fixed arrival rate (B = 8)', { size: 24, weight: 700 });
  s.rect(250, 58, 22, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(282, 72, 'static batching', { size: 17, anchor: 'start' });
  s.rect(440, 58, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(472, 72, 'continuous batching', { size: 17, anchor: 'start' });
  const on = D.online;
  const base = 370, maxV = Math.max(on.static.p95_lat, on.continuous.p95_lat);
  const scale = 260 / maxV;
  [['p50 latency', 'p50_lat'], ['p95 latency', 'p95_lat'], ['mean time to first token', 'mean_ttft']].forEach(([label, key], i) => {
    const x0 = 130 + i * 250;
    const vs = on.static[key], vc = on.continuous[key];
    s.rect(x0, base - vs * scale, 60, vs * scale, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x0 + 30, base - vs * scale - 10, vs.toFixed(0), { size: 16 });
    s.rect(x0 + 74, base - vc * scale, 60, Math.max(vc * scale, 1), { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x0 + 104, base - vc * scale - 10, vc < 10 ? vc.toFixed(1) : vc.toFixed(0), { size: 16, weight: 700 });
    s.text(x0 + 67, base + 30, label, { size: 17 });
  });
  s.line(100, base, 800, base, { color: C.muted });
  s.text(440, 445, 'time units; both policies complete the same work (1.43 tokens per unit); one seed', { size: 17 });
  save('53.2-online-latency.svg', s);
}
