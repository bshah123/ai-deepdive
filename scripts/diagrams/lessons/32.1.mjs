// Diagrams for 32.1 (quantization foundations).
// Run: node scripts/diagrams/lessons/32.1.mjs
// Every number comes from scripts/diagrams/lessons/32.1_data.json (written by 32.1_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-32-llm-optimization/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const d = JSON.parse(readFileSync(join(HERE, '32.1_data.json'), 'utf8'));

const big = (v) => (v >= 1e5 ? v.toExponential(2) : String(v));

// ---------------------------------------------------------------- 32.1-formats.svg
{
  const s = new Sketch(880, 425, { title: 'Bit layout of FP32, FP16 and BF16: one sign bit, exponent bits and mantissa bits, drawn to one scale', seed: 3201 });
  s.text(440, 34, 'Where the bits go in three float formats', { size: 26, weight: 700 });
  const X0 = 150;
  const PX = 680 / 32;                       // 21.25 px per bit, same scale for every row
  const rows = [
    { name: 'FP32', y: 80,  e: 8, m: 23, stats: `max ${big(d.fp32.max)}, eps ${d.fp32.eps.toExponential(1)}` },
    { name: 'FP16', y: 190, e: 5, m: 10, stats: `max ${big(d.fp16.max)}, eps ${d.fp16.eps.toExponential(1)}` },
    { name: 'BF16', y: 300, e: 8, m: 7,  stats: `max ${big(d.bf16.max)}, eps ${d.bf16.eps.toExponential(1)}` },
  ];
  for (const r of rows) {
    s.text(X0 - 20, r.y + 31, r.name, { size: 22, weight: 700, anchor: 'end' });
    let x = X0;
    const segs = [
      [1, C.rose, C.roseSoft, '1'],
      [r.e, C.blue, C.blueSoft, `exponent ${r.e}`],
      [r.m, C.amber, C.amberSoft, `mantissa ${r.m}`],
    ];
    for (const [n, col, soft, lab] of segs) {
      const w = n * PX;
      s.rect(x, r.y, w, 50, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + w / 2, r.y + 31, lab, { size: n > 1 ? 16 : 18, weight: 700 });
      x += w;
    }
    s.text(X0, r.y + 80, r.stats, { font: 'mono', size: 18, anchor: 'start' });
  }
  s.text(440, 414, 'Sign bit (red), exponent (blue), mantissa (amber). Eps is the gap between 1 and the next float.', { size: 16, color: C.muted });
  save('32.1-formats.svg', s);
}

// ---------------------------------------------------------------- 32.1-affine-map.svg
{
  const s = new Sketch(880, 410, { title: 'Affine quantization of five values onto 16 integer codes: real values on the top line, codes on the bottom line', seed: 3202 });
  s.text(440, 34, 'Five real values, sixteen 4-bit codes', { size: 26, weight: 700 });
  const { min: lo, max: hi, scale: sc, zero_point: z, x: xs, codes } = d.worked;
  const X0 = 80, X1 = 800;
  const k = (X1 - X0) / (hi - lo);                     // pixels per real unit
  const xr = (v) => X0 + (v - lo) * k;                 // real value -> x pixel
  const xc = (c) => xr(sc * (c - z));                  // code -> x pixel (its real value)

  // real-value line and dots
  s.line(X0 - 20, 150, X1 + 20, 150, { color: C.muted });
  xs.forEach((v, i) => {
    s.circle(xr(v), 150, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(xr(v), v === 0 ? 92 : 118, v.toFixed(1), { font: 'mono', size: 17 });
  });

  // code line and ticks
  s.line(X0 - 20, 250, X1 + 20, 250, { color: C.muted });
  for (let c = 0; c <= 15; c++) {
    s.line(xc(c), 250, xc(c), 260, { color: C.muted });
    s.text(xc(c), 288, String(c), { font: 'mono', size: 15, color: C.muted });
  }
  // circle the codes actually used by the five values
  for (const c of new Set(codes)) s.circle(xc(c), 288, 32, { color: C.rose });

  // arrows from each real value to its code
  xs.forEach((v, i) => {
    s.arrow(xr(v), 166, xc(codes[i]), 236, { color: C.muted, head: 7 });
  });

  s.text(440, 340, `zero is exact: 0.0 becomes code ${z}, and back to 0.0`, { size: 19, color: C.rose });
  s.note(60, 355, 760, 46, [`scale s = (2.3 - (-1.5)) / 15 = ${sc.toFixed(4)}   zero-point z = ${z}   code = round(x / s) + z`], { size: 18 });
  save('32.1-affine-map.svg', s);
}

// ---------------------------------------------------------------- 32.1-outlier.svg
{
  const s = new Sketch(880, 330, { title: 'One outlier value of 60 makes the INT8 grid step about nine times larger and leaves the bulk of values few codes', seed: 3203 });
  s.text(440, 34, 'One outlier value of 60 coarsens the whole grid', { size: 26, weight: 700 });
  const o = d.outlier;
  const stepA = o.no_outlier.step, stepB = o.one_outlier_60.step;
  const codesA = o.no_outlier.bulk_levels_used, codesB = o.one_outlier_60.bulk_levels_used;

  s.text(60, 84, 'grid step size (smaller is finer)', { size: 20, weight: 700, anchor: 'start' });
  const kS = 1100;                                  // px per unit step
  s.text(60, 128, 'no outlier', { size: 18, anchor: 'start', color: C.muted });
  s.rect(60, 136, stepA * kS, 30, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(60 + stepA * kS + 12, 158, stepA.toFixed(3), { font: 'mono', size: 17, anchor: 'start' });
  s.text(60, 208, 'with outlier 60', { size: 18, anchor: 'start', color: C.muted });
  s.rect(60, 216, stepB * kS, 30, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(60 + stepB * kS + 12, 238, stepB.toFixed(3), { font: 'mono', size: 17, anchor: 'start' });

  s.text(480, 84, 'codes used by the 4,095 normal values', { size: 20, weight: 700, anchor: 'start' });
  s.text(480, 84 + 22, '(out of 256 possible INT8 codes)', { size: 17, color: C.muted, anchor: 'start' });
  const kC = 0.9;
  s.text(480, 128, 'no outlier', { size: 18, anchor: 'start', color: C.muted });
  s.rect(480, 136, codesA * kC, 30, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(480 + codesA * kC + 12, 158, String(codesA), { font: 'mono', size: 17, anchor: 'start' });
  s.text(480, 208, 'with outlier 60', { size: 18, anchor: 'start', color: C.muted });
  s.rect(480, 216, codesB * kC, 30, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(480 + codesB * kC + 12, 238, String(codesB), { font: 'mono', size: 17, anchor: 'start' });

  const ratio = (stepB / stepA).toFixed(1);
  const fewer = (codesA / codesB).toFixed(1);
  s.text(440, 300, `step ${ratio}x larger; bulk uses ${fewer}x fewer codes`, { size: 20, color: C.ink });
  save('32.1-outlier.svg', s);
}

// ---------------------------------------------------------------- 32.1-granularity.svg
{
  const s = new Sketch(880, 400, { title: 'Relative output error of y = Wx for per-tensor, per-channel and per-group scales at INT8 and INT4', seed: 3204 });
  s.text(440, 34, 'Finer scale groups cut the output error', { size: 26, weight: 700 });
  const g = d.granularity;
  const cats = [
    ['per-tensor', '1 scale'],
    ['per-channel', '256 scales'],
    ['per-group-128', '1,024 scales'],
  ];
  const base = 320, k = 8.0;                        // px per percent
  s.line(110, base, 770, base, { color: C.muted });
  cats.forEach(([key, sub], i) => {
    const cx = 210 + i * 240;
    [['8', C.blue, C.blueSoft], ['4', C.amber, C.amberSoft]].forEach(([b, col, soft], j) => {
      const v = 100 * g[b][key].output_rel_err;
      const h = v * k;
      const x = cx - 62 + j * 70;
      s.rect(x, base - h, 56, h, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + 28, base - h - 12, v.toFixed(v < 1 ? 2 : 1) + '%', { font: 'mono', size: 17 });
    });
    s.text(cx, base + 32, key, { size: 19, weight: 700 });
    s.text(cx, base + 58, sub, { size: 17, color: C.muted });
  });
  s.rect(600, 92, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(628, 108, 'INT8', { size: 18, anchor: 'start' });
  s.rect(700, 92, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(728, 108, 'INT4', { size: 18, anchor: 'start' });
  save('32.1-granularity.svg', s);
}

// ---------------------------------------------------------------- 32.1-bits.svg
{
  const s = new Sketch(880, 370, { title: 'Weight memory of a 7-billion-parameter model at four storage formats', seed: 3205 });
  s.text(440, 34, 'Weight memory of a 7-billion-parameter model', { size: 26, weight: 700 });
  const gb = d.gb_7b_model;
  const rows = [
    ['FP16, 16 bits', gb.fp16, C.blue, C.blueSoft],
    ['INT8, 8 bits', gb.int8, C.blue, C.blueSoft],
    ['INT4, 4 bits', gb.int4, C.amber, C.amberSoft],
    [`INT4 + group scales, ${d.bits_per_weight.int4_group128.toFixed(2)} bits`, gb.int4_group128, C.green, C.greenSoft],
  ];
  const k = 30;                                     // px per GB
  rows.forEach(([label, v, col, soft], i) => {
    const y = 80 + i * 62;
    s.text(60, y + 24, label, { size: 19, anchor: 'start' });
    s.rect(300, y, v * k, 36, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(300 + v * k + 12, y + 25, v.toFixed(2) + ' GB', { font: 'mono', size: 17, anchor: 'start' });
  });
  s.text(440, 345, 'bytes = weights x bits / 8; 1 GB = 1e9 bytes; activations and the KV cache are not counted', { size: 16, color: C.muted });
  save('32.1-bits.svg', s);
}

console.log('wrote 32.1-formats.svg, 32.1-affine-map.svg, 32.1-outlier.svg, 32.1-granularity.svg, 32.1-bits.svg');
