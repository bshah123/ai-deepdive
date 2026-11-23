// Diagrams for 25.2 (multi-head, multi-query, grouped-query attention).
// Run: node scripts/diagrams/lessons/25.2.mjs
// Every number comes from scripts/diagrams/lessons/25.2_data.py (run it to reprint them).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-25-attention/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 25.2-split-heads.svg
{
  const s = new Sketch(880, 350, { title: 'Multi-head attention: project X into Q, K and V, split each into 4 heads of 2 dimensions, run attention in every head, concatenate, and multiply by W_O', seed: 2521 });
  s.text(440, 32, 'Multi-head attention: split, attend, concatenate', { size: 26, weight: 700 });

  s.rect(24, 150, 80, 64, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(64, 189, 'X', { size: 24, weight: 700 });
  s.text(64, 240, 'n × 8', { font: 'mono', size: 15, color: C.muted });

  const proj = [['Q = X W_Q', C.blue, C.blueSoft], ['K = X W_K', C.green, C.greenSoft], ['V = X W_V', C.amber, C.amberSoft]];
  proj.forEach(([label, col, soft], i) => {
    const y = 96 + i * 64;
    s.arrow(108, 182, 140, y + 22, { color: C.muted, head: 7 });
    s.rect(144, y, 112, 44, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(200, y + 27, label, { font: 'mono', size: 15 });
  });

  s.arrow(260, 182, 300, 182, { color: C.muted, head: 7 });
  s.text(451, 64, 'h = 4 heads, each 8 / 4 = 2 dims wide', { size: 19, color: C.muted });
  for (let i = 0; i < 4; i++) {
    const y = 78 + i * 58;
    s.rect(306, y, 290, 44, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(451, y + 27, `head ${i + 1}: attention(Q${i + 1}, K${i + 1}, V${i + 1})`, { font: 'mono', size: 15 });
    s.arrow(600, y + 22, 640, 170 + i * 8, { color: C.muted, head: 7 });
  }
  s.text(451, 326, 'each head: its own n × n weights, an n × 2 output', { size: 19, color: C.violet });

  s.rect(644, 128, 96, 108, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(692, 178, 'concat', { size: 22, weight: 700 });
  s.text(692, 204, 'n × 8', { font: 'mono', size: 15 });
  s.arrow(744, 182, 776, 182, { color: C.muted, head: 7 });
  s.rect(780, 150, 78, 64, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(819, 189, '× W_O', { font: 'mono', size: 16 });
  s.text(819, 240, 'n × 8', { font: 'mono', size: 15, color: C.muted });
  save('25.2-split-heads.svg', s);
}

// ---------------------------------------------------------------- 25.2-worked-two-heads.svg
{
  const s = new Sketch(880, 356, { title: 'Worked example: one 4-dimensional head gives weights 0.333, 0.333, 0.333; head A gives 0.768, 0.045, 0.187 and head B gives 0.045, 0.768, 0.187', seed: 2522 });
  s.text(440, 32, 'Same query, same keys: one head versus two', { size: 26, weight: 700 });
  const panels = [
    { cx: 150, head: 'one head', sub: 'all 4 dims', w: [0.333, 0.333, 0.333], sc: 'scores 4, 4, 4', out: 'out [5, 5, 5, 5]', col: C.rose },
    { cx: 440, head: 'head A', sub: 'dims 1 and 2', w: [0.768, 0.045, 0.187], sc: 'scores 4, 0, 2', out: 'out [8.613, 1.387]', col: C.blue },
    { cx: 730, head: 'head B', sub: 'dims 3 and 4', w: [0.045, 0.768, 0.187], sc: 'scores 0, 4, 2', out: 'out [1.387, 8.613]', col: C.amber },
  ];
  for (const p of panels) {
    s.text(p.cx, 70, p.head, { size: 23, weight: 700, color: p.col });
    s.text(p.cx, 92, p.sub, { size: 17, color: C.muted });
    s.line(p.cx - 120, 250, p.cx + 120, 250, { color: C.muted, width: 1.5 });
    p.w.forEach((w, i) => {
      const x = p.cx - 105 + i * 80, hgt = Math.max(150 * w, 4);
      s.rect(x, 250 - hgt, 50, hgt, { color: p.col, fill: p.col });
      s.text(x + 25, 250 - hgt - 8, w.toFixed(3), { font: 'mono', size: 15 });
      s.text(x + 25, 272, `k${i + 1}`, { font: 'mono', size: 16, color: C.muted });
    });
    s.text(p.cx, 304, p.sc, { font: 'mono', size: 16 });
    s.text(p.cx, 330, p.out, { font: 'mono', size: 16, weight: 700 });
  }
  s.line(295, 56, 295, 336, { color: C.muted, width: 1, dash: '6 8' });
  s.line(585, 56, 585, 336, { color: C.muted, width: 1, dash: '6 8' });
  save('25.2-worked-two-heads.svg', s);
}

// ---------------------------------------------------------------- 25.2-sharing.svg
{
  const s = new Sketch(880, 410, { title: 'Eight query heads in three layouts: multi-head has 8 key/value heads, grouped-query has 2 shared by 4 query heads each, multi-query has 1 shared by all 8', seed: 2523 });
  const panels = [
    { cx: 150, name: 'Multi-head', sub: '8 query heads, 8 KV heads', kv: 8, col: C.rose, soft: C.roseSoft, foot: 'stores 8 K and 8 V heads' },
    { cx: 440, name: 'Grouped-query', sub: '8 query heads, 2 KV heads', kv: 2, col: C.green, soft: C.greenSoft, foot: 'stores 2 K and 2 V heads' },
    { cx: 730, name: 'Multi-query', sub: '8 query heads, 1 KV head', kv: 1, col: C.amber, soft: C.amberSoft, foot: 'stores 1 K and 1 V head' },
  ];
  const rowY = (i) => 92 + i * 34;
  for (const p of panels) {
    s.text(p.cx, 36, p.name, { size: 25, weight: 700, color: p.col });
    s.text(p.cx, 62, p.sub, { size: 17, color: C.muted });
    const g = 8 / p.kv;
    for (let j = 0; j < p.kv; j++) {
      const yc = rowY(j * g + (g - 1) / 2) + 12;
      const bh = p.kv === 8 ? 24 : 44;
      s.rect(p.cx + 36, yc - bh / 2, 78, bh, { color: p.col, fill: p.soft, fillStyle: 'solid' });
      s.text(p.cx + 75, yc + 5, `K${j + 1} V${j + 1}`, { font: 'mono', size: 15 });
      for (let m = 0; m < g; m++) {
        const i = j * g + m;
        s.arrow(p.cx - 46, rowY(i) + 12, p.cx + 30, p.kv === 8 ? yc : yc + (m - (g - 1) / 2) * (36 / g), { color: C.muted, width: 1.4, head: 6 });
      }
    }
    for (let i = 0; i < 8; i++) {
      s.rect(p.cx - 112, rowY(i), 62, 24, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(p.cx - 81, rowY(i) + 17, `Q${i + 1}`, { font: 'mono', size: 15 });
    }
    s.text(p.cx, 392, p.foot, { size: 19, weight: 700, color: p.col });
  }
  s.line(295, 24, 295, 396, { color: C.muted, width: 1, dash: '6 8' });
  s.line(585, 24, 585, 396, { color: C.muted, width: 1, dash: '6 8' });
  save('25.2-sharing.svg', s);
}

// ---------------------------------------------------------------- 25.2-expand-shapes.svg
{
  const s = new Sketch(880, 330, { title: 'Two cached key heads are each repeated four times to line up with eight query heads; the result is eight score matrices of shape n by n', seed: 2524 });
  s.text(440, 32, 'Two cached heads serve eight query heads', { size: 26, weight: 700 });
  const y0 = 96, step = 18;
  const strip = (x, i, col, soft) => s.rect(x, y0 + i * step, 130, 13, { color: col, fill: soft, fillStyle: 'solid', width: 1.4 });
  s.text(105, 76, 'K in the cache', { size: 19, weight: 700, color: C.green });
  s.text(375, 76, 'K as used', { size: 19, weight: 700 });
  s.text(585, 76, 'Q', { size: 19, weight: 700, color: C.blue });
  const groups = [[C.green, C.greenSoft], [C.amber, C.amberSoft]];
  groups.forEach(([col, soft], j) => {
    const yc = y0 + (j * 4 + 1.5) * step;
    s.rect(40, yc, 130, 13, { color: col, fill: soft, fillStyle: 'solid', width: 1.4 });
    for (let m = 0; m < 4; m++) {
      const i = j * 4 + m;
      s.line(176, yc + 6, 304, y0 + i * step + 6, { color: col, width: 1.2 });
      strip(310, i, col, soft);
    }
  });
  for (let i = 0; i < 8; i++) {
    strip(520, i, C.blue, C.blueSoft);
    s.line(446, y0 + i * step + 6, 514, y0 + i * step + 6, { color: C.muted, width: 1, dash: '4 5' });
  }
  s.text(105, 262, '(2, n, d_head)', { font: 'mono', size: 15 });
  s.text(375, 262, '(8, n, d_head)', { font: 'mono', size: 15 });
  s.text(585, 262, '(8, n, d_head)', { font: 'mono', size: 15 });
  s.arrow(658, 165, 698, 165, { color: C.muted, head: 7 });
  s.rect(704, 132, 152, 66, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(780, 160, 'scores', { size: 21, weight: 700 });
  s.text(780, 184, '(8, n, n)', { font: 'mono', size: 15 });
  s.text(440, 304, 'Only the left column is stored. The copies last for one step.', { size: 20, color: C.muted });
  save('25.2-expand-shapes.svg', s);
}

// ---------------------------------------------------------------- 25.2-cache-bars.svg
{
  const s = new Sketch(880, 384, { title: 'Key-value cache for one 32,768-token sequence with the Mistral 7B shape: 16 GiB with 32 KV heads, 8, 4, 2, 1 and 0.5 GiB with 16, 8, 4, 2 and 1 KV heads', seed: 2525 });
  s.text(440, 32, 'KV cache for one 32,768-token sequence', { size: 26, weight: 700 });
  s.text(440, 58, 'Mistral 7B shape: 32 layers, 32 query heads, d_head = 128, 16-bit floats', { size: 18, color: C.muted });
  const rows = [
    ['32 (multi-head)', 16, 512, C.rose],
    ['16', 8, 256, C.blue],
    ['8 (as released)', 4, 128, C.green],
    ['4', 2, 64, C.blue],
    ['2', 1, 32, C.blue],
    ['1 (multi-query)', 0.5, 16, C.amber],
  ];
  s.text(215, 88, 'KV heads', { size: 18, anchor: 'end', color: C.muted });
  rows.forEach(([label, gib, kib, col], i) => {
    const y = 100 + i * 40, w = gib * 25;
    s.text(215, y + 20, label, { size: 19, anchor: 'end', weight: i === 2 ? 700 : 400 });
    s.rect(230, y, w, 26, { color: col, fill: col });
    s.text(230 + w + 12, y + 19, `${gib} GiB  (${kib} KiB per token)`, { size: 18, anchor: 'start' });
  });
  s.text(440, 362, 'bytes = 2 × layers × KV heads × d_head × bytes per number × tokens', { size: 19, color: C.muted });
  save('25.2-cache-bars.svg', s);
}
