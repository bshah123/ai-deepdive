import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-29-llm-inference/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below is read from the experiment output (29.1_experiment.py).
const D = JSON.parse(readFileSync(join(HERE, '29.1_data.json'), 'utf8'));
const f1 = (x) => x.toFixed(1);

// 1. The per-token size is a product of six factors.
{
  const s = new Sketch(880, 340, { title: 'Per-token KV cache size as a product of factors', seed: 2901 });
  s.text(440, 36, 'Per-token KV size: a product of six factors', { size: 26, weight: 700 });
  const boxes = [
    ['2', 'K and V'], ['32', 'layers L'], ['32', 'KV heads H'], ['128', 'head dim d'], ['2', 'bytes per value'],
  ];
  const ops = ['×', '×', '×', '×'];
  let x = 30;
  boxes.forEach(([num, label], i) => {
    const w = 120;
    s.rect(x, 80, w, 96, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + w / 2, 124, num, { size: 34, weight: 700 });
    s.text(x + w / 2, 156, label, { size: 16, color: C.muted });
    if (i < ops.length) s.text(x + w + 13, 132, ops[i], { size: 30 });
    x += w + 26;
  });
  s.arrow(440, 184, 440, 220, { color: C.muted });
  s.rect(230, 228, 420, 62, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 269, `${Math.round(D.mha_per_token_KiB)} KiB = ${D.mha_per_token_bytes.toLocaleString('en-US')} bytes per token`, { size: 22, weight: 700 });
  s.text(440, 318, `× 4,096 tokens = ${f1(D.mha_seq4096_GiB)} GiB per sequence`, { size: 20, color: C.muted });
  save('29.1-per-token-factors.svg', s);
}

// 2. Toy worked example: three tokens, 64 bytes each.
{
  const s = new Sketch(880, 330, { title: 'Toy example: three tokens, 64 bytes each', seed: 2902 });
  s.text(440, 36, 'Toy model: L = 2, H = 2, d = 4, T = 3, fp16', { size: 26, weight: 700 });
  const xs = [60, 330, 600];
  xs.forEach((x, i) => {
    s.rect(x, 74, 220, 112, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 110, 106, `token ${i + 1}`, { size: 22, weight: 700 });
    s.text(x + 110, 150, `${D.toy_per_token} bytes`, { size: 28, font: 'mono' });
    s.text(x + 110, 176, 'K and V, all layers and heads', { size: 15, color: C.muted });
  });
  s.text(295, 136, '+', { size: 34 });
  s.text(565, 136, '+', { size: 34 });
  s.text(440, 240, `per token: 2 (K, V) × 2 layers × 2 heads × 4 dims × 2 bytes = ${D.toy_per_token} bytes`, { size: 17, color: C.muted });
  s.rect(250, 262, 380, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 296, `3 tokens: ${D.toy_bytes} bytes (${D.toy_elements} values)`, { size: 22, weight: 700 });
  save('29.1-toy-example.svg', s);
}

// 3. Per-sequence KV size grows linearly in T; weights are a fixed line.
{
  const s = new Sketch(880, 410, { title: 'Per-sequence KV cache size against context length', seed: 2903 });
  s.text(440, 34, 'KV cache per sequence grows linearly with context', { size: 26, weight: 700 });
  const base = 330, k = 16.25; // px per GiB; 16 GiB reaches y = 70
  const Ts = D.sweep_T;
  const labels = ['512', '1,024', '2,048', '4,096', '8,192', '16,384', '32,768'];
  s.line(120, base, 860, base, { color: C.muted, width: 2 });
  Ts.forEach((T, i) => {
    const gx = 160 + i * 110;
    const mh = D.sweep_mha_GiB[i] * k, gh = D.sweep_gqa8_GiB[i] * k;
    s.rect(gx - 40, base - mh, 36, mh, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(gx + 4, base - gh, 36, gh, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(gx - 22, base - mh - 8, `${D.sweep_mha_GiB[i]}`, { size: 15 });
    s.text(gx, base + 26, labels[i], { size: 16, font: 'mono' });
  });
  const wy = base - D.weights_GiB * k;
  s.line(120, wy, 860, wy, { color: C.rose, width: 2, dash: '6 8' });
  s.text(128, wy - 10, `weights: ${f1(D.weights_GiB)} GiB (6.7B params, fp16)`, { size: 16, anchor: 'start', color: C.rose });
  s.text(60, base + 26, 'T', { size: 16, color: C.muted });
  s.rect(150, 384, 26, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(184, 398, '32 KV heads (MHA), GiB', { size: 16, anchor: 'start' });
  s.rect(470, 384, 26, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(504, 398, '8 KV heads (GQA), GiB', { size: 16, anchor: 'start' });
  save('29.1-growth-chart.svg', s);
}

// 4. Bytes read per decode step: weights once, KV once per sequence.
{
  const s = new Sketch(880, 360, { title: 'Bytes read per decode step at 4,096 tokens', seed: 2904 });
  s.text(440, 34, 'Bytes read per decode step (4,096 tokens, MHA)', { size: 26, weight: 700 });
  s.rect(170, 62, 26, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(204, 76, 'weights, read once per step', { size: 16, anchor: 'start' });
  s.rect(470, 62, 26, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(504, 76, 'KV cache, read for every sequence', { size: 16, anchor: 'start' });
  const wGB = D.weights_GiB * 1073741824 / 1e9;
  const kvGB = D.mha_seq4096_GiB * 1073741824 / 1e9;
  const scale = 420 / (D.decode_rows_T4096_MHA[2].step_GB); // px per GB
  D.decode_rows_T4096_MHA.forEach((r, i) => {
    const y = 110 + i * 56;
    s.text(150, y + 23, `batch ${r.batch}`, { size: 19, anchor: 'end' });
    const wpx = wGB * scale, kpx = (r.step_GB - wGB) * scale;
    s.rect(170, y, wpx, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(170 + wpx, y, kpx, 36, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(170 + wpx + kpx + 14, y + 24, `${f1(r.step_GB)} GB · ${Math.round(r.tok_per_s)} tok/s`, { size: 18, anchor: 'start' });
  });
  s.note(120, 282, 640, 46, [`Ceiling at this context: ${Math.round(D.ceiling_MHA_T4096_tok_s)} tok/s, whatever the batch size`], { size: 19 });
  s.text(440, 348, `Ceiling = 2,039 GB/s ÷ ${f1(kvGB)} GB of KV per sequence (weights amortise over the batch; KV does not)`, { size: 15, color: C.muted });
  save('29.1-bytes-per-step.svg', s);
}
console.log('ok');
