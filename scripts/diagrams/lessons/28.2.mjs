import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-28-llm-training/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// every number below is read from 28.2_data.json, written by 28.2_experiment.py
const D = JSON.parse(readFileSync(join(HERE, '28.2_data.json'), 'utf8'));
const MB = D.memory_breakdown_gb;
const COLLECTIVE = D.elements_per_collective_per_rank;   // elements one rank sends per collective

// ---------------------------------------------------------------- 1. memory per GPU
{
  const s = new Sketch(880, 470, { title: 'Stacked bars of model-state memory per GPU for four ZeRO settings', seed: 201 });
  s.text(440, 34, 'Model-state memory per GPU: 7.5B parameters, Adam, 64 GPUs', { size: 24, weight: 700 });
  const names = ['DDP', 'ZeRO-1', 'ZeRO-2', 'ZeRO-3'];
  const base = 360, scale = 240 / D.memory_gb_7p5B_nd64.DDP; // tallest bar (DDP) is 240 px
  names.forEach((n, i) => {
    const cx = 170 + i * 180, w = 110;
    const parts = [
      ['optimizer', MB[n].optimizer, C.amberSoft, C.amber],
      ['grads', MB[n].grads, C.roseSoft, C.rose],
      ['weights', MB[n].weights, C.blueSoft, C.blue],
    ];
    let y = base;
    for (const [, gb, fill, color] of parts) {
      const h = gb * scale;
      if (h > 0.5) s.rect(cx - w / 2, y - h, w, h, { color, fill, fillStyle: 'solid' });
      y -= h;
    }
    const total = parts.reduce((a, p) => a + p[1], 0);
    s.text(cx, y - 12, `${total.toFixed(1)} GB`, { size: 20, weight: 700 });
    s.text(cx, base + 30, n, { size: 20 });
  });
  s.line(60, base, 820, base, { color: C.muted });
  s.note(40, 420, 800, 34, ['weights = fp16 copy, grads = fp16, optimizer = fp32 weights + momentum + variance'], { size: 17 });
  s.text(700, 60, 'blue: weights   rose: grads   amber: optimizer', { size: 17, color: C.muted, anchor: 'end' });
  save('28.2-memory-per-gpu.svg', s);
}

// ---------------------------------------------------------------- 2. DDP: replicas + all-reduce
{
  const s = new Sketch(880, 340, { title: 'Four GPUs each hold a full copy and average their gradients', seed: 202 });
  s.text(440, 34, 'DDP: full copy on every GPU, gradients averaged', { size: 24, weight: 700 });
  for (let r = 0; r < 4; r++) {
    const x = 40 + r * 215;
    s.rect(x, 62, 180, 74, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 90, 92, `GPU ${r}: all weights`, { size: 18 });
    s.text(x + 90, 118, 'all Adam state', { size: 18 });
    s.arrow(x + 90, 150, x + 90, 186, { color: C.muted });
    s.rect(x + 30, 190, 120, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 90, 216, `micro-batch ${r}`, { size: 17 });
  }
  s.rect(40, 258, 800, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 287, 'all-reduce: every GPU receives (g0 + g1 + g2 + g3) / 4', { size: 21 });
  s.text(440, 326, `each GPU then applies the same Adam step; ${2 * COLLECTIVE} elements sent per GPU`, { size: 17, color: C.muted });
  save('28.2-ddp-allreduce.svg', s);
}

// ---------------------------------------------------------------- 3. ZeRO-3 step on one GPU
{
  const s = new Sketch(880, 300, { title: 'One ZeRO-3 training step on one GPU, in five stages', seed: 203 });
  s.text(440, 34, 'ZeRO-3 step on one GPU: which memory is held when', { size: 24, weight: 700 });
  const boxes = [
    { lines: ['own 1/4 of', 'weights'], fill: C.blueSoft, color: C.blue },
    { lines: ['all-gather', 'weights'], fill: C.amberSoft, color: C.amber },
    { lines: ['forward', 'pass'], fill: C.greenSoft, color: C.green },
    { lines: ['all-gather again,', 'backward pass'], fill: C.amberSoft, color: C.amber },
    { lines: ['reduce-scatter', 'grads, Adam'], fill: C.greenSoft, color: C.green },
  ];
  boxes.forEach((b, i) => {
    const x = 20 + i * 176;
    s.rect(x, 90, 150, 84, { color: b.color, fill: b.fill, fillStyle: 'solid' });
    s.text(x + 75, 126, b.lines, { size: 19 });
    if (i < 4) s.arrow(x + 152, 132, x + 174, 132, { color: C.muted });
  });
  const send = `${COLLECTIVE} elements sent`;
  s.text(20 + 176 * 1 + 75, 210, `${send}`, { size: 17, color: C.muted });
  s.text(20 + 176 * 3 + 75, 210, `${send}`, { size: 17, color: C.muted });
  s.text(20 + 176 * 4 + 75, 210, `${send}`, { size: 17, color: C.muted });
  s.note(20, 240, 840, 46, [`three collectives per step = 3 x (3/4) x Psi = ${3 * COLLECTIVE} elements per GPU`], { size: 19 });
  save('28.2-zero3-step.svg', s);
}

// ---------------------------------------------------------------- 4. communication per step
{
  const s = new Sketch(880, 330, { title: 'Elements sent per GPU per step: DDP, ZeRO-2, ZeRO-3, drawn as one bar per collective', seed: 204 });
  s.text(440, 34, 'Elements sent per GPU per training step (one segment per collective)', { size: 22, weight: 700 });
  const rows = [
    ['DDP', '', 'reduce-scatter', 'all-gather'],
    ['ZeRO-2', '', 'reduce-scatter', 'all-gather'],
    ['ZeRO-3', '', 'all-gather', 'all-gather', 'reduce-scatter'],
  ];
  const x0 = 170, unit = 480 / (3 * COLLECTIVE);
  rows.forEach(([name, , ...ops], i) => {
    const y = 80 + i * 78;
    s.text(x0 - 20, y + 30, name, { size: 20, anchor: 'end', weight: 700 });
    let x = x0;
    ops.forEach((op, j) => {
      const w = COLLECTIVE * unit;
      const color = op === 'reduce-scatter' ? C.rose : C.blue;
      const fill = op === 'reduce-scatter' ? C.roseSoft : C.blueSoft;
      s.rect(x, y, w, 40, { color, fill, fillStyle: 'solid' });
      s.text(x + w / 2, y + 26, `${COLLECTIVE}`, { size: 16, font: 'mono' });
      x += w;
    });
    const total = ops.length * COLLECTIVE;
    s.text(x + 12, y + 26, `${total} = ${(total / D.psi_toy).toFixed(2)} x Psi`, { size: 17, anchor: 'start' });
  });
  s.note(40, 280, 800, 36, [`ZeRO-3 / DDP = ${(D.comm_ratio_zero3_over_ddp).toFixed(2)}: one extra all-gather, because weights are re-fetched`], { size: 17 });
  save('28.2-comm-per-step.svg', s);
}

// ---------------------------------------------------------------- 5. GPipe Gantt chart
{
  const g = D.gantt_K4_M4;
  const K = 4;
  const idle = D.pipeline_K4['4'].simulated_idle_fraction;
  const span = D.pipeline_K4['4'].makespan;
  const s = new Sketch(880, 400, { title: 'GPipe schedule with 4 stages and 4 micro-batches, time on the x-axis', seed: 205 });
  s.text(440, 34, `GPipe: 4 stages, 4 micro-batches (idle = ${(idle * 100).toFixed(1)}%)`, { size: 24, weight: 700 });
  const x0 = 120, u = 34, top = 70, rowH = 56;
  for (let st = 0; st < K; st++) {
    const y = top + st * rowH;
    s.text(x0 - 14, y + 26, `stage ${st}`, { size: 17, anchor: 'end' });
  }
  g.filter((t) => t.kind === 'F' || t.kind === 'B').forEach((t) => {
    const x = x0 + t.start * u, w = (t.end - t.start) * u, y = top + t.stage * rowH;
    const isF = t.kind === 'F';
    s.rect(x + 1, y, w - 2, 40, { color: isF ? C.blue : C.amber, fill: isF ? C.blueSoft : C.amberSoft, fillStyle: 'solid' });
    s.text(x + w / 2, y + 26, `${t.kind}${t.micro}`, { size: 15, font: 'mono' });
  });
  const axisY = top + K * rowH + 6;
  s.line(x0, axisY, x0 + span * u, axisY, { color: C.muted });
  for (let t = 0; t <= span; t += 5) {
    s.line(x0 + t * u, axisY, x0 + t * u, axisY + 6, { color: C.muted });
    s.text(x0 + t * u, axisY + 26, `${t}`, { size: 15, font: 'mono', color: C.muted });
  }
  s.text(x0 + span * u / 2, axisY + 52, 'time units (forward = 1, backward = 2)', { size: 17, color: C.muted });
  s.text(40, 386, 'F = forward, B = backward; blank space is idle time (the bubble)', { size: 17, anchor: 'start' });
  save('28.2-gpipe-gantt.svg', s);
}

console.log('wrote 28.2 diagrams');
