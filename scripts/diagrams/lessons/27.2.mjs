import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-27-gpt-decoder-llms/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// every number below is read from 27.2_data.json, written by 27.2_experiment.py
const D = JSON.parse(readFileSync(join(HERE, '27.2_data.json'), 'utf8'));
const P = D.prompt.length;
const N = D.generated.length;
const NCOL = P + N - 1; // positions that ever get K and V computed (0 .. 10)

// 1. the loop
{
  const s = new Sketch(880, 300, { title: 'Generation loop: model, logits, argmax, append, repeat', seed: 2701 });
  s.text(440, 34, 'The generation loop', { size: 26, weight: 700 });
  const boxes = [
    [30, 'tokens so far', D.prompt.join(' ')],
    [240, 'model', 'one forward pass'],
    [450, 'logits', '16 scores'],
    [660, 'argmax', 'pick the best id'],
  ];
  for (const [x, label, sub] of boxes) {
    s.rect(x, 78, 170, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 85, 106, label, { size: 19 });
    s.text(x + 85, 134, sub, { size: 15, font: 'mono' });
  }
  s.arrow(204, 113, 236, 113, { color: C.muted });
  s.arrow(414, 113, 446, 113, { color: C.muted });
  s.arrow(624, 113, 656, 113, { color: C.muted });
  s.line(745, 152, 745, 208, { color: C.amber });
  s.line(745, 208, 115, 208, { color: C.amber });
  s.arrow(115, 208, 115, 154, { color: C.amber });
  s.text(440, 236, 'append the chosen id to the sequence, then run the model again', { size: 17 });
  s.text(440, 272, `generated ids: ${D.generated.join(', ')}`, { size: 19, font: 'mono' });
  save('27.2-generation-loop.svg', s);
}

// 2. which positions get K and V computed: recompute every step vs cache
{
  const s = new Sketch(880, 340, { title: 'Positions computed per step, recompute versus cache', seed: 2702 });
  s.text(440, 34, 'Which positions get K and V computed at each step', { size: 24, weight: 700 });
  const cell = 20;
  const panels = [
    { x0: 70, label: 'Recompute the whole sequence', steps: D.steps_recompute, total: D.steps_recompute.reduce((a, b) => a + b.length, 0) },
    { x0: 520, label: 'Cache: compute each position once', steps: D.steps_cached, total: D.steps_cached.reduce((a, b) => a + b.length, 0) },
  ];
  for (const { x0, label, steps, total } of panels) {
    s.text(x0 + (NCOL * cell) / 2, 76, label, { size: 20, weight: 700 });
    for (let c = 0; c < NCOL; c++) s.text(x0 + c * cell + cell / 2, 108, String(c), { size: 15, font: 'mono' });
    steps.forEach((positions, r) => {
      const y = 118 + r * cell;
      s.text(x0 - 12, y + 14, `step ${r + 1}`, { size: 15, font: 'mono', anchor: 'end' });
      for (let c = 0; c < NCOL; c++) {
        const x = x0 + c * cell;
        if (positions.includes(c)) s.rect(x + 1, y + 1, cell - 3, cell - 3, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
        else s.rect(x + 1, y + 1, cell - 3, cell - 3, { color: C.muted, width: 1 });
      }
    });
    s.text(x0 + (NCOL * cell) / 2, 318, `${total} position passes in total`, { size: 19 });
  }
  save('27.2-recompute-vs-cache.svg', s);
}

// 3. measured cost against number of generated tokens
{
  const s = new Sketch(880, 390, { title: 'Bar chart: position passes for recompute and cache', seed: 2703 });
  s.text(440, 34, 'Work per generation, measured (prompt of 4 tokens)', { size: 24, weight: 700 });
  const base = 300;
  const k = 0.1; // px per position pass: 2272 passes -> 227 px
  s.line(110, base, 850, base, { color: C.ink });
  s.line(110, base, 110, 80, { color: C.ink });
  s.rect(120, 56, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(150, 70, 'recompute', { size: 17, anchor: 'start' });
  s.rect(290, 56, 22, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(320, 70, 'cache', { size: 17, anchor: 'start' });
  D.table.forEach((row, i) => {
    const cx = 150 + i * 160;
    const hR = Math.max(2, row.rec_passes * k);
    const hC = Math.max(2, row.cache_passes * k);
    s.rect(cx - 36, base - hR, 34, hR, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 2, base - hC, 34, hC, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx - 19, base - hR - 10, String(row.rec_passes), { size: 17, font: 'mono' });
    s.text(cx + 19, base - hC - 10, String(row.cache_passes), { size: 17, font: 'mono' });
    s.text(cx, base + 26, `N = ${row.n}`, { size: 17, font: 'mono' });
  });
  s.text(440, 366, 'N = number of generated tokens; bars are linear in passes', { size: 17 });
  save('27.2-cost-scaling.svg', s);
}

// 4. what the cache holds
{
  const s = new Sketch(880, 350, { title: 'KV cache layout after generation', seed: 2704 });
  s.text(440, 34, `What the cache holds after ${D.cache_T} positions`, { size: 24, weight: 700 });
  s.text(440, 64, 'one row per position; each row holds 2 heads x 8 values', { size: 18 });
  const rowH = 16;
  const top = 84;
  const boxes = [[60, 'K', 'layer 1'], [220, 'V', 'layer 1'], [400, 'K', 'layer 2'], [560, 'V', 'layer 2']];
  for (const [x, kv, layer] of boxes) {
    s.rect(x, top, 120, D.cache_T * rowH, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    for (let i = 1; i < D.cache_T; i++) s.line(x, top + i * rowH, x + 120, top + i * rowH, { color: C.muted, width: 1 });
    s.rect(x, top + (D.cache_T - 1) * rowH, 120, rowH, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 60, top + D.cache_T * rowH + 28, `${kv}, ${layer}`, { size: 19 });
  }
  s.text(700, top + (D.cache_T - 1) * rowH + 12, 'newest row', { size: 17, anchor: 'start', color: C.amber });
  const perMatrix = (D.cache_bytes / 4).toLocaleString('en-US');
  s.text(440, 320, `each matrix: ${D.cache_T} x 2 x 8 values x 8 bytes = ${perMatrix} bytes; four matrices: ${D.cache_bytes.toLocaleString('en-US')} bytes`, { size: 16, font: 'mono' });
  save('27.2-cache-layout.svg', s);
}

// 5. cache size per sequence for three head layouts
{
  const s = new Sketch(880, 350, { title: 'KV cache per sequence by number of KV heads', seed: 2705 });
  s.text(440, 34, 'KV cache per 4096-token sequence (hypothetical config)', { size: 22, weight: 700 });
  const base = 280;
  s.line(90, base, 800, base, { color: C.ink });
  D.kv.forEach((row, i) => {
    const cx = 180 + i * 250;
    const h = row.gib_4096 * 100; // 100 px per GiB
    s.rect(cx - 70, base - h, 140, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, `${row.gib_4096.toFixed(4)} GiB`, { size: 17, font: 'mono' });
    s.text(cx, base + 26, row.name, { size: 17 });
    s.text(cx, base + 48, `${row.bytes_per_token.toLocaleString('en-US')} bytes per token`, { size: 15, font: 'mono' });
  });
  save('27.2-kv-per-sequence.svg', s);
}
