// Diagrams for Lesson 31.2 (QLoRA: NF4, double quantization, paged optimizers).
// Run: node scripts/diagrams/lessons/31.2.mjs
// Every number comes from scripts/diagrams/lessons/31.2_experiment.py (writes 31.2_data.json).
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-31-fine-tuning/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '31.2_data.json'), 'utf8'));
const f2 = (x) => x.toFixed(2);

// 1. Where the 16 NF4 levels sit versus the 15 uniform levels
{
  const s = new Sketch(880, 340, { title: 'NF4 levels cluster near zero; uniform levels are evenly spaced', seed: 311 });
  s.text(440, 34, 'Where the 16 levels sit', { size: 26, weight: 700 });
  const X0 = 440, SC = 330, base = 230, k = D.top_sigma;
  // Standard normal density, drawn on the normalised axis (the largest level sits at k standard deviations)
  for (let i = -22; i <= 22; i++) {
    const u = (i / 22) * 1.08;
    const h = (Math.exp(-0.5 * (u * k) ** 2) * k / Math.sqrt(2 * Math.PI)) * 150;
    s.rect(X0 + u * SC - 7, base - h, 14, h, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid', width: 1.2 });
  }
  s.line(X0 - 1.12 * SC, base, X0 + 1.12 * SC, base, { color: C.ink });
  D.levels.forEach((v) => s.circle(X0 + v * SC, 268, 13, { color: C.blue, fill: C.blue, fillStyle: 'solid' }));
  D.uniform.forEach((v) => s.circle(X0 + v * SC, 306, 13, { color: C.amber, fill: C.amber, fillStyle: 'solid' }));
  s.text(24, 274, 'NF4', { size: 19, anchor: 'start', color: C.blue, weight: 700 });
  s.text(24, 312, 'uniform', { size: 19, anchor: 'start', color: C.amber, weight: 700 });
  s.text(X0 + 330, 92, 'density of N(0,1)', { size: 18, anchor: 'end', color: C.muted });
  s.text(X0 - SC, base + 26, '-1', { size: 16, color: C.muted });
  s.text(X0, base + 26, '0', { size: 16, color: C.muted });
  s.text(X0 + SC, base + 26, '+1', { size: 16, color: C.muted });
  save('31.2-nf4-levels.svg', s);
}

// 2. Block quantization of the worked example
{
  const s = new Sketch(880, 330, { title: 'Four weights become a scale and four 4-bit codes', seed: 313 });
  s.text(440, 34, 'One block of four weights, step by step', { size: 26, weight: 700 });
  const w = D.worked;
  const cols = [236, 386, 536, 686];
  const rows = [96, 180, 264];
  const boxW = 136, boxH = 52;
  const rowLabels = ['weight', 'divide by scale', 'nearest level'];
  rowLabels.forEach((t, r) => s.text(24, rows[r] + 6, t, { size: 17, anchor: 'start', color: C.muted }));
  cols.forEach((cx, i) => {
    s.rect(cx - boxW / 2, rows[0] - boxH / 2, boxW, boxH, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, rows[0] + 7, `w = ${w.w[i].toFixed(2)}`, { font: 'mono', size: 18 });
    s.rect(cx - boxW / 2, rows[1] - boxH / 2, boxW, boxH, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, rows[1] + 7, w.normalised[i].toFixed(3), { font: 'mono', size: 18 });
    s.rect(cx - boxW / 2, rows[2] - boxH / 2, boxW, boxH, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx, rows[2] - 2, `code ${w.codes[i]}`, { font: 'mono', size: 17 });
    s.text(cx, rows[2] + 17, `= ${w.level[i].toFixed(4)}`, { font: 'mono', size: 15 });
    s.arrow(cx, rows[0] + boxH / 2 + 4, cx, rows[1] - boxH / 2 - 4, { color: C.muted });
    s.arrow(cx, rows[1] + boxH / 2 + 4, cx, rows[2] - boxH / 2 - 4, { color: C.muted });
  });
  s.text(440, 318, `absmax = ${w.absmax.toFixed(2)} is the scale of this block`, { size: 19, color: C.ink });
  save('31.2-block-quantize.svg', s);
}

// 3. Bits per parameter and the 65B memory they imply
{
  const s = new Sketch(880, 300, { title: 'Bits per parameter with and without double quantization', seed: 317 });
  s.text(440, 34, 'Bits per parameter, and the 65B weight memory', { size: 26, weight: 700 });
  const X = 60, per = 34; // px per bit
  const bars = [
    { y: 92, label: 'BF16 (16-bit floats)', solid: 16, extra: 0, note: `${Math.round(D.mem.bf16)} GB`, color: C.muted, soft: C.roseSoft },
    { y: 172, label: 'NF4 + 32-bit scale per 64 weights', solid: 4, extra: 0.5, note: `${D.mem.plain.toFixed(1)} GB`, color: C.blue, soft: C.blueSoft },
    { y: 252, label: 'NF4 + double quantization', solid: 4, extra: D.bits.dq - 4, note: `${D.mem.dq.toFixed(1)} GB`, color: C.green, soft: C.greenSoft },
  ];
  for (const b of bars) {
    s.text(X, b.y - 14, `${b.label}: ${(b.solid + b.extra).toFixed(3)} bits`, { size: 18, anchor: 'start' });
    s.rect(X, b.y, b.solid * per, 36, { color: b.color, fill: b.soft, fillStyle: 'solid' });
    if (b.extra > 0) s.rect(X + b.solid * per, b.y, Math.max(b.extra * per, 6), 36, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
    s.text(X + (b.solid + b.extra) * per + 14, b.y + 24, b.note, { size: 18, anchor: 'start', font: 'mono' });
  }
  s.text(440, 296, `double quantization saves ${D.bits.saving.toFixed(3)} bits per parameter`, { size: 19, color: C.ink });
  save('31.2-bits-budget.svg', s);
}

// 4. Measured SQNR for uniform 4-bit versus NF4
{
  const s = new Sketch(880, 390, { title: 'Signal-to-quantization-noise ratio, uniform 4-bit versus NF4', seed: 319 });
  s.text(440, 34, 'Reconstruction quality (SQNR, higher is better)', { size: 26, weight: 700 });
  const base = 318, px = 10;
  s.line(90, base, 830, base, { color: C.ink });
  [0, 10, 20].forEach((v) => {
    s.text(70, base - v * px + 6, String(v), { size: 16, anchor: 'end', color: C.muted });
    if (v) s.line(90, base - v * px, 830, base - v * px, { color: C.muted, width: 0.8, dash: '4 8' });
  });
  s.text(40, 170, 'dB', { size: 16, color: C.muted });
  const names = { gaussian: 'Gaussian', laplace: 'Laplace' };
  D.sqnr.forEach((r, g) => {
    const cx = 190 + g * 190;
    const u = r.uniform, n = r.nf4;
    s.rect(cx - 66, base - u * px, 60, u * px, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.rect(cx + 6, base - n * px, 60, n * px, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx - 36, base - u * px - 10, f2(u), { size: 16, font: 'mono' });
    s.text(cx + 36, base - n * px - 10, f2(n), { size: 16, font: 'mono' });
    s.text(cx, 346, names[r.data], { size: 19, weight: 700 });
    s.text(cx, 370, `block ${r.block}`, { size: 17, color: C.muted });
  });
  s.rect(90, 62, 22, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(120, 77, 'uniform 4-bit', { size: 18, anchor: 'start' });
  s.rect(300, 62, 22, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(330, 77, 'NF4', { size: 18, anchor: 'start' });
  save('31.2-sqnr-bars.svg', s);
}

// 5. One QLoRA linear layer: frozen 4-bit base plus a trainable low-rank path
{
  const s = new Sketch(880, 400, { title: 'QLoRA linear layer dataflow', seed: 323 });
  s.text(440, 34, 'One QLoRA linear layer', { size: 26, weight: 700 });
  s.rect(40, 150, 120, 56, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(100, 185, 'input x', { font: 'mono', size: 17 });
  s.rect(230, 92, 230, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(345, 118, 'W: NF4, frozen', { font: 'mono', size: 17 });
  s.text(345, 140, 'dequantised to BF16', { size: 16 });
  s.rect(520, 92, 120, 60, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(580, 128, 'matmul', { font: 'mono', size: 17 });
  s.circle(700, 180, 40, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(700, 188, '+', { size: 30, weight: 700 });
  s.rect(230, 262, 150, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(305, 286, 'A: r x d_in', { font: 'mono', size: 17 });
  s.text(305, 306, 'trainable', { size: 16 });
  s.rect(440, 262, 150, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(515, 286, 'B: d_out x r', { font: 'mono', size: 17 });
  s.text(515, 306, 'trainable, starts at 0', { size: 16 });
  s.arrow(160, 178, 230, 122, { color: C.muted });
  s.arrow(160, 178, 230, 290, { color: C.muted });
  s.arrow(460, 122, 520, 122, { color: C.muted });
  s.arrow(640, 122, 690, 160, { color: C.muted });
  s.arrow(380, 290, 440, 290, { color: C.muted });
  s.arrow(590, 290, 705, 222, { color: C.muted });
  s.arrow(740, 180, 830, 180, { color: C.ink });
  s.text(790, 170, 'y', { size: 24, weight: 700 });
  s.note(40, 340, 800, 44, ['gradients flow only into A and B; the 4-bit W is never updated'], { size: 19 });
  save('31.2-qlora-layer.svg', s);
}
console.log('31.2 diagrams written to', OUT);
