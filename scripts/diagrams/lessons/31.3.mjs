// Diagrams for 31.3 (PEFT implementation & multi-LoRA serving).
// Run: node scripts/diagrams/lessons/31.3.mjs
// Every number comes from scripts/diagrams/lessons/31.3_data.json (written by 31.3_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-31-fine-tuning/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '31.3_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');
const fmtVec = (v) => v.map((z) => (Number.isInteger(z) ? String(z) : z.toFixed(2))).join(', ');

// Box with a title line and an optional mono sub-line, centred in (x, y, w, h).
function box(s, x, y, w, h, title, sub, o) {
  s.rect(x, y, w, h, { color: o.color, fill: o.fill, fillStyle: 'solid' });
  const cx = x + w / 2, cy = y + h / 2;
  if (sub) {
    s.text(cx, cy - 2, title, { size: o.size ?? 16, weight: 700 });
    s.text(cx, cy + 20, sub, { font: 'mono', size: 15 });
  } else {
    s.text(cx, cy + 6, title, { size: o.size ?? 16, weight: 700 });
  }
}

// ---------------------------------------------------------------- 31.3-forward-paths.svg
{
  const s = new Sketch(880, 380, { title: 'Worked example of one LoRA layer: a frozen path and a trained low-rank path are summed, giving y = [9, 4, 21, 16]', seed: 3101 });
  s.text(440, 34, 'One LoRA layer on a worked example (d = 4, r = 2, scale s = 2)', { size: 24, weight: 700 });

  // top: frozen path
  s.text(181, 92, 'frozen path (no gradient)', { size: 15, anchor: 'start', color: C.muted });
  box(s, 181, 100, 110, 60, 'W₀ (frozen)', null, { color: C.blue, fill: C.blueSoft });
  box(s, 317, 100, 120, 60, 'base = W₀x', fmtVec(D.hand.base), { color: C.blue, fill: C.blueSoft });
  s.arrow(291, 130, 317, 130, { color: C.muted, head: 8 });

  // input
  box(s, 45, 220, 110, 70, 'x', fmtVec([1, 2, 3, 4]), { color: C.ink, fill: C.amberSoft, size: 18 });
  s.arrow(100, 218, 176, 160, { color: C.muted, head: 8 });

  // bottom: trained low-rank path
  s.text(181, 208, 'LoRA path (trained): A and B are the only trainable matrices', { size: 15, anchor: 'start', color: C.amber });
  box(s, 181, 220, 110, 70, 'A (2×4)', 'trained', { color: C.amber, fill: C.amberSoft });
  box(s, 317, 220, 110, 70, 'down = Ax', fmtVec(D.hand.down), { color: C.amber, fill: C.amberSoft });
  box(s, 453, 220, 110, 70, 'B (4×2)', 'trained', { color: C.amber, fill: C.amberSoft });
  box(s, 589, 220, 110, 70, 'up = B·down', fmtVec(D.hand.up), { color: C.amber, fill: C.amberSoft, size: 15 });
  box(s, 725, 220, 110, 70, 'delta = s·up', fmtVec(D.hand.delta), { color: C.amber, fill: C.amberSoft, size: 15 });
  s.arrow(155, 255, 181, 255, { color: C.muted, head: 8 });
  s.arrow(291, 255, 317, 255, { color: C.muted, head: 8 });
  s.arrow(427, 255, 453, 255, { color: C.muted, head: 8 });
  s.arrow(563, 255, 589, 255, { color: C.muted, head: 8 });
  s.arrow(699, 255, 725, 255, { color: C.muted, head: 8 });

  // sum
  s.arrow(437, 130, 757, 130, { color: C.muted, head: 8 });
  s.circle(780, 130, 44, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(780, 139, '+', { size: 30, weight: 700 });
  s.arrow(780, 220, 780, 153, { color: C.muted, head: 8 });

  s.text(440, 338, `y = base + delta = [1, 4, 9, 16] + [8, 0, 12, 0] = [${fmtVec(D.hand.y)}]`, { size: 22, weight: 700, color: C.green });
  save('31.3-forward-paths.svg', s);
}

// ---------------------------------------------------------------- 31.3-param-count.svg
{
  const p = D.params.find((q) => q.d === 4096);
  const r = 8, d = 4096;
  const s = new Sketch(880, 470, { title: 'A 4096 by 4096 weight matrix next to the two thin matrices of its rank-8 LoRA update, drawn to scale in one direction only', seed: 3102 });
  s.text(440, 34, `Trainable parameters for one ${d} × ${d} layer at rank r = ${r}`, { size: 24, weight: 700 });

  s.text(230, 92, 'full update: W', { size: 18, weight: 700 });
  s.rect(80, 110, 300, 300, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(230, 440, `${fmt(p.full)} numbers`, { size: 19 });

  s.text(600, 92, 'LoRA update: B·A', { size: 18, weight: 700 });
  s.rect(440, 110, 320, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(600, 150, `A: ${r} × ${d} = ${fmt(r * d)}`, { size: 18 });
  s.rect(440, 180, 14, 230, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(470, 300, [`B: ${d} × ${r}`, `= ${fmt(d * r)}`], { size: 18, anchor: 'start' });

  s.note(560, 250, 280, 130, [
    `LoRA total: ${fmt(p.lora_r8)}`,
    `${(p.ratio * 100).toFixed(2)}% of ${fmt(p.full)}`,
    'Same ratio per token, too:',
    'r(1/d_in + 1/d_out)',
  ], { size: 18 });

  s.text(440, 462 - 10, `d = 768: ${fmt(D.params[0].lora_r8)} of ${fmt(D.params[0].full)} = ${(D.params[0].ratio * 100).toFixed(2)}%`, { size: 17, color: C.muted });
  save('31.3-param-count.svg', s);
}

// ---------------------------------------------------------------- 31.3-batched-serving.svg
{
  const ids = [0, 2, 1, 0, 2, 2];
  const col = [C.amber, C.green, C.rose];
  const soft = [C.amberSoft, C.greenSoft, C.roseSoft];
  const s = new Sketch(880, 400, { title: 'Six tokens from different requests share one base matmul and each picks its own adapter; the grid marks the adapter used per token', seed: 3103 });
  s.text(440, 34, 'One base matrix, six tokens, three adapters', { size: 24, weight: 700 });

  const x0 = 260, y0 = 120, cw = 110, rh = 34;
  for (let c = 0; c < 3; c++) s.text(x0 + cw * c + cw / 2, 106, `adapter ${c}`, { size: 16 });
  for (let t = 0; t < 6; t++) s.text(x0 - 16, y0 + rh * t + 22, `t${t}`, { font: 'mono', size: 15, anchor: 'end' });
  for (let c = 0; c <= 3; c++) s.line(x0 + cw * c, y0, x0 + cw * c, y0 + rh * 6, { color: C.muted, width: 1.5 });
  for (let t = 0; t <= 6; t++) s.line(x0, y0 + rh * t, x0 + cw * 3, y0 + rh * t, { color: C.muted, width: 1.5 });
  ids.forEach((k, t) => {
    s.rect(x0 + cw * k + 8, y0 + rh * t + 6, cw - 16, rh - 12, { color: col[k], fill: soft[k], fillStyle: 'solid' });
  });

  s.note(640, 120, 220, 190, [
    'Base W₀: one copy,',
    'one matmul for all six rows.',
    'Delta: each row uses only',
    'the adapter it is marked with.',
    `Tokens per adapter: ${D.serving.tokens_per_adapter.join(', ')}`,
  ], { size: 17 });

  s.text(440, 362, `largest error vs one request at a time: ${D.serving.max_err_batched_vs_ref.toExponential(1)} (float64)`, { size: 20, weight: 700, color: C.green });
  save('31.3-batched-serving.svg', s);
}

// ---------------------------------------------------------------- 31.3-memory.svg
{
  const rows = D.memory_gib.filter((m) => [1, 2, 4, 8, 16].includes(m.k));
  const top = 110, base = 350, maxV = 64, scale = (base - top) / maxV;
  const s = new Sketch(880, 430, { title: 'Bar chart: K merged model copies grow linearly in memory, while one shared base with K small adapters stays near one copy', seed: 3104 });
  s.text(440, 34, 'Memory for K tasks: merged copies versus one shared base', { size: 24, weight: 700 });
  s.rect(90, 66, 20, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(118, 80, 'K merged copies', { size: 17, anchor: 'start' });
  s.rect(340, 66, 20, 16, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(368, 80, 'one base + K adapters', { size: 17, anchor: 'start' });

  s.line(80, base, 720, base, { color: C.ink, width: 2 });
  rows.forEach((m, i) => {
    const cx = 150 + i * 130;
    const hM = m.merged * scale, hU = m.unmerged * scale;
    s.rect(cx - 56, base - hM, 52, hM, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.rect(cx + 4, base - hU, 52, hU, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx - 30, base - hM - 8, `${m.merged.toFixed(0)}`, { size: 16, font: 'mono' });
    s.text(cx + 30, base - hU - 8, `${m.unmerged.toFixed(2)}`, { size: 16, font: 'mono' });
    s.text(cx, base + 30, `K = ${m.k}`, { size: 18, weight: 700 });
  });
  s.text(440, 414, 'GiB, attention projections only, fp16. Hypothetical 32-layer, width-4096 model (arithmetic only). Adapters on q and v, r = 8: 8 MiB each.', { size: 15, color: C.muted });
  save('31.3-memory.svg', s);
}
console.log('wrote 4 SVGs to', OUT);
