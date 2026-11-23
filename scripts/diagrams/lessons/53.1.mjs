import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-09-production-ai/chapter-53-serving-metrics/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from 53.1_data.py (run it first: python3 scripts/diagrams/lessons/53.1_data.py)
const D = JSON.parse(readFileSync(join(HERE, '53.1_data.json'), 'utf8'));

// 1. One request timeline (hand-worked numbers, reproduced by the lesson code)
{
  const s = new Sketch(880, 310, { title: 'Timeline of one request: TTFT 0.42 s, then 99 gaps of 21.0 ms, end-to-end 2.50 s', seed: 531 });
  const X = (t) => 60 + 300 * t; // 300 px per second
  s.text(440, 34, 'One request, from arrival to last token', { size: 24, weight: 700 });
  // TTFT: wait + prefill
  s.text(X(0.21), 112, 'TTFT 0.42 s', { size: 18, weight: 700, color: C.amber });
  s.rect(X(0), 124, X(0.42) - X(0), 34, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(X(0.21), 146, 'wait + prefill', { size: 15 });
  // decode: 99 gaps
  const dStart = X(D.hand.ttft_s), dEnd = X(D.hand.e2e_s);
  s.rect(dStart, 124, dEnd - dStart, 34, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text((dStart + dEnd) / 2, 146, 'decode: one token per gap', { size: 15 });
  s.text((dStart + dEnd) / 2, 112, `99 gaps × ${D.hand.mean_itl_ms.toFixed(1)} ms = ${(D.hand.e2e_s - D.hand.ttft_s).toFixed(2)} s`,
    { size: 18, weight: 700, color: C.blue });
  // end-to-end bracket
  s.arrow(X(0), 188, X(D.hand.e2e_s), 188, { color: C.ink });
  s.text((X(0) + X(D.hand.e2e_s)) / 2, 178, `end-to-end (E2E) latency = ${D.hand.e2e_s.toFixed(2)} s`, { size: 18, weight: 700 });
  // time axis
  s.line(X(0), 236, X(2.5), 236, { color: C.muted });
  for (const t of [0, 0.5, 1, 1.5, 2, 2.5]) {
    s.line(X(t), 236, X(t), 242, { color: C.muted });
    s.text(X(t), 262, `${t.toFixed(1)} s`, { size: 15, color: C.muted });
  }
  s.text(X(0), 292, 'arrival: the request is submitted', { size: 16, anchor: 'start' });
  save('53.1-request-timeline.svg', s);
}

// 2. Batch-size trade-off: system tokens/s vs per-user tokens/s
{
  const s = new Sketch(880, 360, { title: 'Bar charts over batch sizes 1 to 64: system tokens per second and per-user tokens per second', seed: 532 });
  s.text(440, 34, 'Batching trades per-user speed for system throughput', { size: 24, weight: 700 });
  const rows = D.batch;
  const panel = (x0, label, key, fmt, color, soft) => {
    s.text(x0 + 180, 72, label, { size: 18, weight: 700 });
    const base = 300, maxH = 190;
    const max = Math.max(...rows.map((r) => r[key]));
    rows.forEach((r, i) => {
      const h = (r[key] / max) * maxH;
      const x = x0 + i * 52;
      s.rect(x, base - h, 36, h, { color, fill: soft, fillStyle: 'solid' });
      s.text(x + 18, base - h - 10, fmt(r[key]), { size: 15 });
      s.text(x + 18, base + 24, `B=${r.B}`, { size: 15, color: C.muted });
    });
    s.line(x0, base, x0 + 6 * 52 + 44, base, { color: C.muted });
  };
  panel(40, 'system tokens/s (all users)', 'system_tps', (v) => Math.round(v).toString(), C.blue, C.blueSoft);
  panel(460, 'tokens/s per user', 'per_seq_tps', (v) => v.toFixed(1), C.amber, C.amberSoft);
  s.text(440, 344, `Model: ITL = ${D.model.T0} ms + ${D.model.C_SEQ} ms × B (assumed constants)`, { size: 16, color: C.muted });
  save('53.1-batch-tradeoff.svg', s);
}

// 3. Gaps between tokens for one simulated request
{
  const s = new Sketch(880, 350, { title: 'Gap between consecutive tokens for one simulated request, gap by gap', seed: 533 });
  const series = D.stall.series;
  const med = D.stall.median_ms;
  const mx = Math.max(...series);
  const nBad = series.filter((v) => v > 1.5 * med).length;
  s.text(440, 34, 'One request: most gaps are 19 ms, a few are over 100 ms', { size: 24, weight: 700 });
  const x0 = 80, x1 = 720, base = 290, H = 200, ymax = 240;
  const Y = (v) => base - (v / ymax) * H;
  for (const v of [0, 100, 200]) {
    s.line(x0 - 6, Y(v), x0, Y(v), { color: C.muted });
    s.text(x0 - 12, Y(v) + 5, `${v}`, { size: 15, color: C.muted, anchor: 'end' });
  }
  s.text(x0, 72, 'gap (ms)', { size: 16, color: C.muted, anchor: 'start' });
  s.line(x0, base, x1, base, { color: C.muted });
  // normal gaps: one band up to 1.5 x median; spikes: one rose bar per gap above that
  s.rect(x0, Y(1.5 * med), x1 - x0, Y(0) - Y(1.5 * med), { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  const pitch = (x1 - x0) / series.length;
  series.forEach((v, i) => {
    if (v <= 1.5 * med) return;
    s.rect(x0 + i * pitch, Y(v), Math.max(5, pitch * 1.4), Y(0) - Y(v),
      { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  });
  s.line(x0, Y(med), x1, Y(med), { color: C.ink, dash: '6 8' });
  s.text(x1 + 12, Y(med) + 5, `median ${med.toFixed(1)} ms`, { size: 15, anchor: 'start' });
  const idx = series.indexOf(mx);
  const ax = Math.min(Math.max(x0 + idx * pitch, x0 + 90), x1 - 90);
  s.text(ax, Y(mx) - 12, `max ${mx.toFixed(1)} ms`, { size: 16, weight: 700, color: C.rose });
  s.text((x0 + x1) / 2, 318, `gap number 1 to ${series.length}`, { size: 15, color: C.muted });
  s.text(440, 340, `rose: gap above 1.5 × median (${nBad} of ${series.length} gaps)`, { size: 16 });
  save('53.1-stall-gaps.svg', s);
}
