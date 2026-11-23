import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-09-production-ai/chapter-54-model-serving/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '54.3_data.json'), 'utf8'));

// 1. Weight memory budget: bars from the experiment, one per quantization level
{
  const s = new Sketch(880, 330, { title: 'Weight memory of an 8.03B model at three precisions', seed: 301 });
  s.text(440, 34, 'Weight memory, 8.03B parameters', { size: 26, weight: 700 });
  const rows = [['F16', D.weights.F16.GB, C.rose], ['Q8_0', D.weights.Q8_0.GB, C.amber], ['Q4_K_M', D.weights.Q4_K_M.GB, C.green]];
  rows.forEach(([name, gb, col], i) => {
    const y = 80 + i * 70;
    s.text(120, y + 26, name, { font: 'mono', size: 18, anchor: 'end' });
    const w = gb * 30;
    s.rect(140, y, w, 40, { color: col, fill: col, fillStyle: 'solid' });
    s.text(140 + w + 12, y + 27, `${gb.toFixed(2)} GB`, { font: 'mono', size: 17, anchor: 'start' });
  });
  s.text(440, 300, 'bits per weight: 16.0 · 8.5 · 4.9   (llama.cpp table, Llama-3.1-8B)', { size: 17, color: C.muted });
  save('54.3-weight-budget.svg', s);
}

// 2. Worked int4 grid for four weights
{
  const s = new Sketch(880, 330, { title: 'Symmetric int4 quantization of four weights', seed: 302 });
  s.text(440, 34, 'Symmetric int4: four weights on a 16-level grid', { size: 26, weight: 700 });
  const t = D.toy;
  const cols = [150, 340, 530, 720];
  t.w.forEach((w, i) => {
    const x = cols[i];
    s.rect(x - 60, 70, 120, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x, 98, `w = ${w.toFixed(2)}`, { font: 'mono', size: 17 });
    s.arrow(x, 116, x, 150, { color: C.muted });
    s.rect(x - 60, 150, 120, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x, 178, `code ${t.codes[i]}`, { font: 'mono', size: 17 });
    s.arrow(x, 196, x, 230, { color: C.muted });
    s.rect(x - 60, 230, 120, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x, 258, `${t.deq[i].toFixed(3)}`, { font: 'mono', size: 17 });
  });
  s.text(40, 98, 'float', { size: 18, anchor: 'start', color: C.muted });
  s.text(40, 178, 'int4', { size: 18, anchor: 'start', color: C.muted });
  s.text(40, 258, 'back', { size: 18, anchor: 'start', color: C.muted });
  save('54.3-int4-grid.svg', s);
}

// 3. Serving path: client, REST server, model file, runner, memory
{
  const s = new Sketch(880, 300, { title: 'Path of one request through a local model server', seed: 303 });
  s.text(440, 34, 'One request, end to end', { size: 26, weight: 700 });
  const boxes = [
    ['client', 60, C.blue, C.blueSoft],
    ['REST :11434', 240, C.violet, C.violet],
    ['GGUF file', 440, C.amber, C.amberSoft],
    ['runner', 640, C.green, C.greenSoft],
  ];
  boxes.forEach(([label, x, col, fill], i) => {
    s.rect(x, 90, 150, 56, { color: col, fill, fillStyle: 'solid' });
    s.text(x + 75, 124, label, { font: 'mono', size: 16 });
    if (i < boxes.length - 1) s.arrow(x + 150, 118, boxes[i + 1][1], 118, { color: C.muted });
  });
  s.rect(640, 190, 200, 70, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(740, 218, 'weights + KV cache', { font: 'mono', size: 16 });
  s.text(740, 242, 'in RAM', { font: 'mono', size: 16 });
  s.arrow(715, 146, 715, 190, { color: C.muted });
  s.text(440, 290, 'the model file is read once; the KV cache grows with each token', { size: 18, color: C.muted });
  save('54.3-serving-path.svg', s);
}

// 4. Decode upper bound at an assumed bandwidth
{
  const s = new Sketch(880, 330, { title: 'Upper bound on tokens per second, batch 1', seed: 304 });
  s.text(440, 34, 'Decode upper bound, batch 1', { size: 26, weight: 700 });
  s.text(440, 62, `assumed ${D.assumed_bandwidth_GBps} GB/s memory bandwidth; each token reads all weights once`, { size: 17, color: C.muted });
  const rows = [['F16', D.decode_upper_bound_tok_s.F16, C.rose], ['Q8_0', D.decode_upper_bound_tok_s.Q8_0, C.amber], ['Q4_K_M', D.decode_upper_bound_tok_s.Q4_K_M, C.green]];
  rows.forEach(([name, v, col], i) => {
    const y = 100 + i * 66;
    s.text(120, y + 26, name, { font: 'mono', size: 18, anchor: 'end' });
    const w = v * 16;
    s.rect(140, y, w, 40, { color: col, fill: col, fillStyle: 'solid' });
    s.text(140 + w + 12, y + 27, `${v.toFixed(1)} tok/s`, { font: 'mono', size: 17, anchor: 'start' });
  });
  s.text(440, 310, 'reasoning, not measured: the real rate depends on the hardware', { size: 17, color: C.muted });
  save('54.3-decode-bound.svg', s);
}

// 5. KV cache growth against weights
{
  const s = new Sketch(880, 352, { title: 'KV cache size against context length', seed: 305 });
  s.text(440, 34, 'KV cache grows with context', { size: 26, weight: 700 });
  const ctxs = [['2048', D.kv_GiB['2048']], ['8192', D.kv_GiB['8192']], ['32768', D.kv_GiB['32768']]];
  ctxs.forEach(([k, v], i) => {
    const y = 90 + i * 60;
    s.text(120, y + 26, `${k} tok`, { font: 'mono', size: 17, anchor: 'end' });
    const w = v * 60;
    s.rect(140, y, w, 40, { color: C.violet, fill: C.violet, fillStyle: 'solid' });
    s.text(140 + w + 12, y + 27, `${v.toFixed(2)} GiB`, { font: 'mono', size: 17, anchor: 'start' });
  });
  const wy = 90 + 3 * 60;
  s.text(120, wy + 26, 'weights', { font: 'mono', size: 17, anchor: 'end' });
  s.rect(140, wy, D.weights.Q4_K_M.GiB * 60, 40, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
  s.text(140 + D.weights.Q4_K_M.GiB * 60 + 12, wy + 27, `${D.weights.Q4_K_M.GiB.toFixed(2)} GiB`, { font: 'mono', size: 17, anchor: 'start' });
  s.text(440, 340, `fp16 cache, ${D.kv_per_token_bytes / 1024} KiB per token (illustrative shape)`, { size: 16, color: C.muted });
  save('54.3-kv-growth.svg', s);
}
