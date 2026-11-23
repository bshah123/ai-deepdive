import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-32-llm-optimization/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// every number below is read from the experiment's output, never typed in
const D = JSON.parse(readFileSync(join(HERE, '32.3_data.json'), 'utf8'));
const f = (v, d) => v.toFixed(d);

// ---------- 1. GGUF file layout (bytes to scale, offsets from the writer)
{
  const g = D.gguf;
  const total = g.file_bytes;
  const X0 = 40, W = 800, k = W / total;
  const px = (b) => X0 + b * k;
  const s = new Sketch(880, 400, { title: 'Byte map of the tiny GGUF file: header, metadata, tensor infos, aligned tensor data', seed: 301 });
  s.text(440, 34, 'One GGUF file, byte by byte (768 bytes)', { size: 26, weight: 700 });
  const seg = (a, b, color, soft) => s.rect(px(a), 92, px(b) - px(a), 52, { color, fill: soft, fillStyle: 'solid' });
  seg(0, 24, C.violet, C.violet);
  seg(24, 24 + g.kv_bytes, C.blue, C.blueSoft);
  seg(24 + g.kv_bytes, g.p_end, C.amber, C.amberSoft);
  seg(g.p_end, g.data_start, C.rose, C.roseSoft);
  seg(g.data_start, g.data_start + 256, C.green, C.greenSoft);
  seg(g.data_start + 256, g.data_start + 256 + 72, C.green, C.greenSoft);
  seg(g.data_start + 328, total, C.rose, C.roseSoft);
  const tick = (b, label) => s.text(px(b), 80, label, { size: 15, font: 'mono' });
  tick(0, '0'); tick(24, '24'); tick(g.data_start, String(g.data_start)); tick(g.data_start + 256, String(g.data_start + 256)); tick(g.data_start + 328, String(g.data_start + 328));
  s.text(px(24 + g.kv_bytes / 2), 124, 'metadata 261 B', { size: 18 });
  s.text(px(g.p_end - 56), 124, 'infos', { size: 16 });
  s.text(px(g.data_start + 128), 124, 'norm (F32)  256 B', { size: 16 });
  s.text(px(g.data_start + 292), 124, 'Q4_0 72 B', { size: 15 });
  const rows = [
    [C.violet, 'header, 24 B: magic "GGUF", version 3, tensor_count 2, metadata_kv_count 6'],
    [C.blue, 'metadata, 261 B: six key-value pairs, e.g. general.architecture = "llama"'],
    [C.amber, 'tensor infos, 113 B: name, n_dimensions, dimensions, ggml type, offset'],
    [C.rose, `padding: zeros to a multiple of general.alignment = 32 (data starts at ${g.data_start})`],
    [C.green, 'tensor data: attn_norm F32 at offset 0; attn_q Q4_0 at offset 256 (72 B)'],
  ];
  rows.forEach(([c, t], i) => {
    const y = 178 + i * 40;
    s.rect(60, y - 12, 18, 18, { color: c, fill: c, fillStyle: 'solid' });
    s.text(92, y + 2, t, { size: 17, anchor: 'start' });
  });
  s.text(440, 384, 'absolute byte = data_start + offset, so attn_q starts at 416 + 256 = 672', { size: 17, color: C.muted });
  save('32.3-gguf-layout.svg', s);
}

// ---------- 2. bits per weight and the 7B arithmetic
{
  const b = D.bits_per_weight;
  const sz = D.size_7B_GB_decimal;
  const rowsData = [
    ['F32', b.F32, sz.F32, C.muted],
    ['F16', b.F16, sz.F16, C.blue],
    ['Q8_0', b.Q8_0, sz.Q8_0, C.amber],
    ['Q4_0', b.Q4_0, sz.Q4_0, C.green],
  ];
  const s = new Sketch(880, 350, { title: 'Bits per weight for four formats, with the size of a 7 billion weight model', seed: 302 });
  s.text(440, 34, 'Bits per weight, and what 7 billion weights cost', { size: 26, weight: 700 });
  const X = 190, scale = 9.5; // 32 bits -> 304 px
  rowsData.forEach(([name, bits, gb, c], i) => {
    const y = 90 + i * 56;
    s.text(150, y + 6, name, { size: 20, font: 'mono', anchor: 'end' });
    s.rect(X, y - 16, bits * scale, 34, { color: c, fill: c, fillStyle: 'solid' });
    s.text(X + bits * scale + 12, y + 4, `${f(bits, 1)} bits  ->  ${f(gb, 2)} GB`, { size: 18, anchor: 'start' });
  });
  s.note(40, 276, 800, 62, [`Q4_0 block: 18 bytes for 32 weights = 4.5 bits/weight.`, 'Arithmetic only: 7e9 x bits / 8 bytes, decimal GB; real files differ.'], { size: 17 });
  save('32.3-bits-per-weight.svg', s);
}

// ---------- 3. one Q4_0 block, worked by hand
{
  const w = D.worked_block;
  const s = new Sketch(880, 390, { title: 'One Q4_0 block of 32 weights: scale, levels, and reconstruction for the first 8 values', seed: 303 });
  s.text(440, 34, 'One Q4_0 block, first 8 of 32 weights', { size: 26, weight: 700 });
  const cw = 84, x0 = 200;
  const labels = ['weight w', 'level q', 'rebuilt (q-8)d'];
  const ys = [92, 150, 208];
  labels.forEach((t, r) => s.text(40, ys[r] + 22, t, { size: 18, anchor: 'start' }));
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * cw;
    const q = w.levels_0_to_15_in_element_order[i];
    const cells = [f(w.input[i], 2), String(q), f(w.dequant_first_8[i] + 0, 3)];
    const colors = [C.blue, C.amber, C.green];
    const softs = [C.blueSoft, C.amberSoft, C.greenSoft];
    for (let r = 0; r < 3; r++) {
      s.rect(x + 4, ys[r], cw - 8, 44, { color: colors[r], fill: softs[r], fillStyle: 'solid' });
      s.text(x + cw / 2, ys[r] + 28, cells[r], { size: 18, font: 'mono' });
    }
  }
  s.arrow(440, 262, 440, 280, { color: C.muted });
  s.note(40, 286, 800, 90, [
    `Scale: largest |w| is ${f(w.signed_max, 2)} (element ${w.argmax_abs_index}). d = ${f(w.signed_max, 2)} / -8 = ${f(w.d_fp32, 5)}, stored as FP16 ${f(w.d_fp16, 5)}.`,
    'Level: q = min(15, trunc(w / d + 8.5)).  Rebuilt: w′ = (q - 8) x d.',
    `Whole block: RMSE ${f(w.rmse, 3)}, largest error ${f(w.max_abs_error, 3)}.`,
  ], { size: 17 });
  save('32.3-worked-block.svg', s);
}

// ---------- 4. measured error: relative RMSE by scheme and weight distribution
{
  const e = D.error;
  const schemes = [
    ['Q8_0, block 32', 'Q8_0 (block 32)', C.green, C.greenSoft],
    ['Q4_0, block 32', 'Q4_0 (block 32)', C.blue, C.blueSoft],
    ['4-bit, block 256', '4-bit, block 256', C.amber, C.amberSoft],
    ['4-bit, whole tensor', '4-bit, one block (whole tensor)', C.rose, C.roseSoft],
  ];
  const s = new Sketch(880, 470, { title: 'Relative RMSE of four quantizers on Gaussian and on outlier-heavy weights', seed: 304 });
  s.text(440, 34, 'Error as a fraction of the weight spread (lower is better)', { size: 26, weight: 700 });
  schemes.forEach(([name, , c, soft], i) => {
    const x = 60 + i * 210;
    s.rect(x, 62, 18, 18, { color: c, fill: soft, fillStyle: 'solid' });
    s.text(x + 26, 76, name, { size: 16, anchor: 'start' });
  });
  const base = 370, scale = 260 / 0.878;
  const groups = [['gaussian', 'Gaussian weights', 80], ['outliers', 'weights with 0.1% outliers (x20)', 470]];
  for (const [key, label, gx] of groups) {
    schemes.forEach(([, k, c, soft], i) => {
      const v = e[key][k].rel_rmse;
      const h = v * scale;
      const x = gx + i * 84;
      s.rect(x, base - h, 64, h, { color: c, fill: soft, fillStyle: 'solid' });
      s.text(x + 32, base - h - 10, f(v, 3), { size: 16, font: 'mono' });
    });
    s.text(gx + 168, base + 34, label, { size: 18 });
  }
  s.line(60, base, 830, base, { color: C.ink, width: 1.5 });
  s.note(40, 424, 800, 36, [`n = ${D.error_setup.n_weights} weights per distribution, seed ${D.error_setup.seed}; RMSE divided by the standard deviation.`], { size: 16 });
  save('32.3-error-bars.svg', s);
}

// ---------- 5. dot product on quantized blocks (llama.cpp CPU path)
{
  const d = D.dot;
  const blockTerm = d.first_block_sumi * d.first_block_d_w * d.first_block_d_a;
  const s = new Sketch(880, 400, { title: 'Dot product on quantized blocks: integer sum per block, then two scales', seed: 305 });
  s.text(440, 34, 'Dot product on quantized blocks', { size: 26, weight: 700 });
  s.rect(40, 80, 230, 110, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(155, 110, 'weight block', { size: 18 });
  s.text(155, 140, 'Q4_0: 32 four-bit levels + scale d_w', { size: 15 });
  s.rect(325, 80, 230, 110, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 110, 'activation block', { size: 18 });
  s.text(440, 140, 'Q8_0: 32 int8 + scale d_a', { size: 15 });
  s.arrow(271, 135, 323, 135, { color: C.muted });
  s.rect(610, 80, 230, 110, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(725, 110, `sumi = ${d.first_block_sumi}`, { size: 20, font: 'mono' });
  s.text(725, 140, 'exact integer sum', { size: 15 });
  s.arrow(556, 135, 608, 135, { color: C.muted });
  s.text(440, 232, `block contribution = sumi x d_w x d_a = ${f(blockTerm, 4)}`, { size: 20, font: 'mono' });
  s.text(440, 262, `128 blocks summed in float: ${f(d.blockwise_int_path, 6)}`, { size: 19 });
  s.note(40, 290, 800, 96, [
    `Dequantize then float dot gives ${f(d.dequantize_then_float_dot, 6)} (gap ${d.abs_gap_blockwise_vs_dequant.toExponential(1)}).`,
    `Exact float64 dot of the original weights: ${f(d.exact_fp64_dot, 5)}. The gap is quantization error, one draw.`,
  ], { size: 17 });
  save('32.3-dot-kernel.svg', s);
}

console.log('wrote 32.3 diagrams to', OUT);
