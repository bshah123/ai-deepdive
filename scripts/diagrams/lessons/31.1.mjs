import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-31-fine-tuning/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// every number below is read from the experiment output (31.1_experiment.py -> 31.1_data.json)
const D = JSON.parse(readFileSync(join(HERE, '31.1_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');
const sci = (v) => (v >= 0.01 ? v.toPrecision(2) : v.toExponential(1));

// ---------------------------------------------------------------- 1. forward pass
{
  const s = new Sketch(880, 340, { title: 'LoRA forward pass: frozen W0 path plus a low-rank A then B path, added together', seed: 311 });
  s.text(440, 34, 'The forward pass', { size: 26, weight: 700 });
  s.rect(30, 150, 110, 50, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(85, 181, 'x  (d_in)', { font: 'mono', size: 16 });
  s.rect(190, 70, 180, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(280, 101, 'W0  (frozen)', { font: 'mono', size: 16 });
  s.rect(190, 230, 180, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(280, 261, 'A  (r × d_in)', { font: 'mono', size: 16 });
  s.rect(420, 230, 180, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(510, 261, 'B  (d_out × r)', { font: 'mono', size: 16 });
  s.arrow(140, 166, 190, 100, { color: C.muted });
  s.arrow(140, 184, 190, 250, { color: C.muted });
  s.arrow(370, 255, 420, 255, { color: C.muted });
  s.text(280, 150, 'no gradient', { size: 16, color: C.muted });
  s.text(510, 304, 'scale by s = alpha / r', { size: 17, color: C.muted });
  s.circle(655, 175, 50, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(655, 185, '+', { size: 30, weight: 700 });
  s.arrow(370, 95, 616, 158, { color: C.muted });
  s.arrow(600, 255, 640, 214, { color: C.muted });
  s.arrow(705, 175, 790, 175, { color: C.ink });
  s.text(825, 182, 'y', { size: 28, weight: 700 });
  s.text(440, 322, 'y = W0 x + s · B (A x)', { font: 'mono', size: 19, weight: 700 });
  save('31.1-forward.svg', s);
}

// ---------------------------------------------------------------- 2. hand example
{
  const h = D.hand;
  const s = new Sketch(880, 330, { title: 'Hand-sized LoRA example: x = [1, 1] flows through W0 and the low-rank path to y = [5, -5]', seed: 312 });
  s.text(440, 34, 'One input, computed by hand', { size: 26, weight: 700 });
  s.rect(30, 150, 120, 50, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(90, 181, 'x = [1, 1]', { font: 'mono', size: 16 });
  s.rect(230, 66, 230, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(345, 97, `W0 x = [${h.W0x.join(', ')}]`, { font: 'mono', size: 16 });
  s.rect(230, 230, 230, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(345, 261, `A x = [${h.Ax.join(', ')}]`, { font: 'mono', size: 16 });
  s.rect(500, 230, 230, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(615, 261, `B (A x) = [${h.BAx.join(', ')}]`, { font: 'mono', size: 16 });
  s.arrow(150, 170, 230, 96, { color: C.muted });
  s.arrow(150, 180, 230, 255, { color: C.muted });
  s.arrow(460, 91, 690, 150, { color: C.muted });
  s.arrow(730, 255, 790, 212, { color: C.muted });
  s.text(748, 290, `× s = ${h.s}`, { font: 'mono', size: 17, color: C.muted, anchor: 'start' });
  s.rect(690, 150, 170, 50, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(775, 181, `y = [${h.y.join(', ')}]`, { font: 'mono', size: 17, weight: 700 });
  s.text(440, 318, `scaled update s · B (A x) = [${h.scaled_delta.join(', ')}];  [2, 1] + [3, -6] = [5, -5]`, { font: 'mono', size: 16, color: C.muted });
  save('31.1-hand-example.svg', s);
}

// ---------------------------------------------------------------- 3. init gradients
{
  const s = new Sketch(880, 270, { title: 'At initialisation B is zero: the gradient reaches B but not A; after one step A starts to learn', seed: 313 });
  s.text(440, 34, 'Why B starts at zero', { size: 26, weight: 700 });
  s.rect(30, 70, 400, 170, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(230, 108, 'Step 0: B = 0', { size: 22, weight: 700 });
  s.text(230, 146, 'ΔW = B · A = 0 (model = pretrained)', { font: 'mono', size: 15 });
  s.text(230, 180, `‖∂L/∂B‖ = ${D.init_grad_norm_B.toFixed(2)}  (non-zero: B moves)`, { font: 'mono', size: 15 });
  s.text(230, 214, `‖∂L/∂A‖ = ${D.init_grad_norm_A.toFixed(1)}  (exactly zero: A is frozen)`, { font: 'mono', size: 15 });
  s.rect(450, 70, 400, 170, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(650, 108, 'Step 1 onward: B ≠ 0', { size: 22, weight: 700 });
  s.text(650, 146, 'ΔW = B · A ≠ 0 (update now active)', { font: 'mono', size: 15 });
  s.text(650, 180, '∂L/∂A = s · Bᵀ · ∂L/∂y · xᵀ ≠ 0', { font: 'mono', size: 15 });
  s.text(650, 214, 'A now gets a gradient and moves', { size: 17 });
  s.arrow(432, 155, 448, 155, { color: C.ink });
  s.text(440, 262, 'Both matrices start learning in the order B first, then A.', { size: 17, color: C.muted });
  save('31.1-init-gradients.svg', s);
}

// ---------------------------------------------------------------- 4. parameter counts
{
  const row = D.params.find((p) => p.d_in === 4096 && p.r === 8);
  const bars = [
    { label: 'full update', value: row.full, pct: null, color: C.blue, soft: C.blueSoft },
    ...[8, 16, 64].map((rr) => {
      const p = D.params.find((q) => q.d_in === 4096 && q.r === rr);
      return { label: `LoRA r = ${rr}`, value: p.lora, pct: p.pct, color: C.amber, soft: C.amberSoft };
    }),
  ];
  const s = new Sketch(880, 400, { title: 'Trainable parameters for one 4096 by 4096 layer: full update versus LoRA at three ranks', seed: 314 });
  s.text(440, 34, 'Trainable parameters, one 4096 × 4096 layer', { size: 26, weight: 700 });
  const base = 300, maxH = 220;
  bars.forEach((b, i) => {
    const cx = 170 + i * 200;
    const h = Math.max((b.value / row.full) * maxH, 1.5);
    s.rect(cx - 55, base - h, 110, h, { color: b.color, fill: b.soft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, fmt(b.value), { font: 'mono', size: 16, weight: 700 });
    s.text(cx, base + 30, b.label, { size: 18 });
    if (b.pct !== null) s.text(cx, base + 56, `${b.pct.toFixed(3)}% of full`, { size: 16, color: C.muted });
  });
  s.line(100, base, 800, base, { color: C.ink });
  s.text(440, 382, 'Linear scale: the LoRA bars are small on purpose. Counts are r × (d_in + d_out).', { size: 16, color: C.muted });
  save('31.1-params.svg', s);
}

// ---------------------------------------------------------------- 5. rank versus floor (log scale)
{
  const rows = D.sweep.filter((r) => [1, 2, 4, 8, 16, 32].includes(r.r));
  const top = 110, bottom = 380, lo = -7, hi = 0;   // log10 range shown: 1e-7 .. 1
  const yOf = (v) => bottom - ((Math.log10(v) - lo) / (hi - lo)) * (bottom - top);
  const s = new Sketch(880, 460, { title: 'Unexplained update energy versus rank: trained LoRA against the best rank-r approximation (log scale)', seed: 315 });
  s.text(440, 34, 'How much of the target update rank r leaves out', { size: 26, weight: 700 });
  s.rect(120, 58, 26, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(154, 73, 'LoRA, trained (rank r)', { size: 16, anchor: 'start' });
  s.rect(420, 58, 26, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(454, 73, 'best rank r (truncated SVD)', { size: 16, anchor: 'start' });
  for (const e of [0, -2, -4, -6]) {
    const y = yOf(10 ** e);
    s.line(130, y, 830, y, { color: C.muted, dash: '4 6', width: 1 });
    s.text(118, y + 5, e === 0 ? '1' : `1e${e}`, { font: 'mono', size: 15, anchor: 'end' });
  }
  rows.forEach((r, i) => {
    const cx = 215 + i * 115;
    const yl = yOf(r.lora_error), yf = yOf(r.svd_floor);
    s.rect(cx - 42, yl, 40, bottom - yl, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.rect(cx + 2, yf, 40, bottom - yf, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx - 22, yl - 8, sci(r.lora_error), { font: 'mono', size: 13 });
    s.text(cx + 22, yf - 8, sci(r.svd_floor), { font: 'mono', size: 13 });
    s.text(cx, bottom + 28, `r = ${r.r}`, { font: 'mono', size: 16 });
  });
  s.line(130, bottom, 830, bottom, { color: C.ink });
  s.text(440, 448, `Error = ‖ΔW − ΔW*‖²_F / ‖ΔW*‖²_F. At r = 64 the trained error is ${D.sweep[6].lora_error.toExponential(1)} (below the axis).`, { size: 16, color: C.muted });
  save('31.1-rank-floor.svg', s);
}
