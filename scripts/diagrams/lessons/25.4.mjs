// Diagrams for lesson 25.4 (FlashAttention). Numbers come from the lesson's own code blocks
// (worked example, tile counts, working-set size) and, where labelled, from the cited papers.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-25-attention/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// A soft-filled box with centred lines of text.
const box = (s, x, y, w, h, lines, color, soft, o = {}) => {
  const { size = 16, font = 'hand', weight } = o;
  const arr = Array.isArray(lines) ? lines : [lines];
  s.rect(x, y, w, h, { color, fill: soft, fillStyle: 'solid' });
  const lh = size * 1.1;
  const y0 = y + h / 2 - ((arr.length - 1) * lh) / 2 + size * 0.34;
  s.text(x + w / 2, y0, arr, { size, font, weight });
};

// 1. Standard attention: three round trips between HBM and SRAM
{
  const s = new Sketch(880, 400, { title: 'Standard attention reads and writes the N by N score and weight matrices to slow GPU memory three times', seed: 2541 });
  s.text(440, 36, 'Standard attention: three round trips to slow memory', { size: 26, weight: 700 });

  s.rect(30, 62, 300, 318, { color: C.muted });
  s.text(180, 90, 'HBM: main GPU memory', { size: 21, weight: 700 });
  s.text(180, 112, '40–80 GB · 1.5–2.0 TB/s', { size: 16, color: C.muted });
  box(s, 50, 128, 58, 40, 'Q', C.blue, C.blueSoft, { size: 19 });
  box(s, 118, 128, 58, 40, 'K', C.blue, C.blueSoft, { size: 19 });
  box(s, 186, 128, 58, 40, 'V', C.blue, C.blueSoft, { size: 19 });
  box(s, 254, 128, 58, 40, 'O', C.blue, C.blueSoft, { size: 19 });
  box(s, 50, 186, 262, 80, ['S: scores', 'N × N numbers'], C.rose, C.roseSoft, { size: 19 });
  box(s, 50, 282, 262, 80, ['P: weights', 'N × N numbers'], C.rose, C.roseSoft, { size: 19 });

  s.rect(660, 120, 190, 250, { color: C.green });
  s.text(755, 170, 'SRAM: on-chip', { size: 21, weight: 700 });
  s.text(755, 196, '192 KB per SM', { size: 16, color: C.muted });
  s.text(755, 218, 'about 19 TB/s', { size: 16, color: C.muted });
  s.text(755, 280, ['the arithmetic', 'happens here'], { size: 19, color: C.green });

  const lanes = [
    [150, 1, '1   read Q, K', C.blue],
    [190, -1, 'write S  (N × N)', C.rose],
    [232, 1, '2   read S  (N × N)', C.rose],
    [272, -1, 'write P  (N × N)', C.rose],
    [314, 1, '3   read P  (N × N)  and V', C.rose],
    [354, -1, 'write O', C.blue],
  ];
  for (const [y, dir, label, color] of lanes) {
    if (dir > 0) s.arrow(345, y, 645, y, { color });
    else s.arrow(645, y, 345, y, { color });
    s.text(495, y - 9, label, { size: 17, color });
  }
  save('25.4-three-round-trips.svg', s);
}

// 2. Tiling: one tile at a time in SRAM
{
  const s = new Sketch(880, 440, { title: 'FlashAttention sweeps the score matrix one 128 by 128 tile at a time; only the current tile and its row state live in fast memory', seed: 2542 });
  s.text(440, 36, 'FlashAttention: one tile of the score matrix at a time', { size: 26, weight: 700 });

  const gx = 110, gy = 112, cell = 34;
  s.text(gx + 4 * cell, 78, 'keys and values: 8 blocks of 128', { size: 18 });
  s.arrow(gx + 4.5 * cell, 86, gx + 4.5 * cell, 108, { color: C.blue, head: 8 });
  s.text(52, gy + 4 * cell, 'queries: 8 blocks of 128', { size: 18, rotate: -90 });
  s.arrow(78, gy + 2.5 * cell, 104, gy + 2.5 * cell, { color: C.amber, head: 8 });
  s.grid(gx, gy, 8, 8, cell, { hiRow: 2, hiColor: C.amber, color: C.muted, dash: '6 6' });
  s.rect(gx + 4 * cell, gy + 2 * cell, cell, cell, { color: C.rose, fill: C.rose, fillStyle: 'solid', width: 2 });
  s.text(gx + 4 * cell, 412, 'the full 1,024 × 1,024 matrix is never stored', { size: 18, color: C.muted });

  s.curveArrow(gx + 5 * cell + 4, gy + 2.4 * cell, 410, 150, 452, 176, { color: C.rose });

  s.rect(440, 100, 412, 216, { color: C.green });
  s.text(646, 128, 'in SRAM while this tile is computed', { size: 20, weight: 700 });
  box(s, 456, 142, 120, 56, ['Q block', '128 × 64'], C.amber, C.amberSoft);
  box(s, 586, 142, 120, 56, ['K block', '128 × 64'], C.blue, C.blueSoft);
  box(s, 716, 142, 120, 56, ['V block', '128 × 64'], C.blue, C.blueSoft);
  box(s, 456, 210, 160, 56, ['score tile', '128 × 128'], C.rose, C.roseSoft);
  box(s, 628, 210, 208, 56, ['per row: m, l, acc', '128 × (1 + 1 + 64)'], C.green, C.greenSoft);
  s.text(646, 298, '49,408 numbers = 96.5 KiB in float16', { size: 18 });

  s.note(456, 338, 380, 84, ['after the last tile of the row:', 'O block = acc / l, written once'], { size: 20 });
  save('25.4-tiling.svg', s);
}

// 3. Online softmax worked example
{
  const s = new Sketch(880, 400, { title: 'Online softmax on scores 2, 0, 1, 3 in two blocks: state after block 1 is m=2, l=1.135; after block 2 m=3, l=1.553; output 9.244, 7.195', seed: 2543 });
  s.text(440, 36, 'Online softmax, two keys at a time', { size: 26, weight: 700 });

  s.text(40, 108, 'scaled scores', { size: 20, anchor: 'start' });
  const cells = [[230, '2'], [300, '0'], [440, '1'], [510, '3']];
  for (const [x, v] of cells) box(s, x, 80, 70, 44, v, C.blue, C.blueSoft, { size: 20, font: 'mono' });
  s.text(300, 70, 'block 1', { size: 18, color: C.muted });
  s.text(510, 70, 'block 2', { size: 18, color: C.muted });

  s.arrow(290, 128, 190, 172, { color: C.muted });
  s.arrow(520, 128, 520, 172, { color: C.muted });

  box(s, 40, 178, 270, 124, ['after block 1', 'm = 2', 'l = 1.135', 'acc = [10, 1.353]'], C.blue, C.blueSoft, { size: 17, font: 'mono' });
  s.arrow(318, 240, 382, 240, { color: C.amber, width: 2 });
  s.text(350, 224, '× 0.368', { size: 18, color: C.amber, weight: 700 });
  s.text(350, 266, 'e^(2 − 3)', { size: 16, color: C.amber });
  box(s, 390, 178, 290, 124, ['after block 2', 'm = 3', 'l = 1.553', 'acc = [14.355, 11.175]'], C.blue, C.blueSoft, { size: 17, font: 'mono' });
  s.arrow(688, 240, 732, 240, { color: C.green, width: 2 });
  s.text(710, 224, '÷ l', { size: 18, color: C.green, weight: 700 });
  box(s, 740, 178, 112, 124, ['output', '[9.244,', ' 7.195]'], C.green, C.greenSoft, { size: 17, font: 'mono' });

  s.note(190, 326, 500, 52, ['softmax over all four scores at once: [9.244, 7.195] too'], { size: 20 });
  save('25.4-online-softmax.svg', s);
}

// 4. Reported numbers from the FlashAttention paper, Figure 2 (left)
{
  const s = new Sketch(880, 370, { title: 'Reported in the FlashAttention paper for GPT-2 medium: 66.6 versus 75.2 GFLOPs, 40.3 versus 4.4 GB of HBM reads and writes, 41.7 versus 7.3 ms', seed: 2544 });
  s.text(440, 36, 'More arithmetic, far less memory traffic, faster', { size: 26, weight: 700 });
  s.text(440, 62, 'GPT-2 medium, forward + backward, N = 1,024, A100 GPU. Reported by Dao et al. (2022), Figure 2.', { size: 16, color: C.muted });

  const panels = [
    [160, 'GFLOPs', 66.6, 75.2],
    [440, 'HBM read/write (GB)', 40.3, 4.4],
    [720, 'runtime (ms)', 41.7, 7.3],
  ];
  const base = 286, maxH = 160, bw = 72;
  for (const [cx, label, a, b] of panels) {
    const top = Math.max(a, b);
    const ha = (a / top) * maxH, hb = (b / top) * maxH;
    s.rect(cx - bw - 8, base - ha, bw, ha, { color: C.rose, fill: C.rose });
    s.rect(cx + 8, base - hb, bw, hb, { color: C.green, fill: C.green });
    s.text(cx - bw / 2 - 8, base - ha - 8, String(a), { size: 18, font: 'mono' });
    s.text(cx + bw / 2 + 8, base - hb - 8, String(b), { size: 18, font: 'mono' });
    s.line(cx - 110, base, cx + 110, base, { color: C.muted });
    s.text(cx - bw / 2 - 8, base + 20, 'standard', { size: 16, color: C.rose });
    s.text(cx + bw / 2 + 8, base + 20, 'Flash', { size: 16, color: C.green });
    s.text(cx, base + 52, label, { size: 20, weight: 700 });
  }
  save('25.4-reported-numbers.svg', s);
}

// 5. Causal mask: which tiles are computed
{
  const s = new Sketch(880, 390, { title: 'With a causal mask on an 8 by 8 grid of tiles, 28 tiles below the diagonal are computed normally, 8 on the diagonal are masked inside, 28 above are skipped', seed: 2545 });
  s.text(440, 36, 'Causal mask: skip the tiles that lie in the future', { size: 26, weight: 700 });

  const gx = 100, gy = 96, cell = 33;
  s.text(gx + 4 * cell, 82, 'key blocks', { size: 18 });
  s.text(62, gy + 4 * cell, 'query blocks', { size: 18, rotate: -90 });
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const x = gx + j * cell, y = gy + i * cell;
      if (j < i) s.rect(x, y, cell, cell, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1 });
      else if (j === i) s.rect(x, y, cell, cell, { color: C.amber, fill: C.amber, fillStyle: 'solid', width: 1 });
      else s.rect(x, y, cell, cell, { color: C.muted, width: 0.8, dash: '4 5' });
    }
  }

  const lx = 430;
  s.rect(lx, 100, 30, 30, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(lx + 44, 122, '28 tiles in the past: computed, no mask', { size: 19, anchor: 'start' });
  s.rect(lx, 150, 30, 30, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
  s.text(lx + 44, 172, '8 tiles on the diagonal: masked inside', { size: 19, anchor: 'start' });
  s.rect(lx, 200, 30, 30, { color: C.muted, width: 0.8, dash: '4 5' });
  s.text(lx + 44, 222, '28 tiles in the future: skipped', { size: 19, anchor: 'start' });

  s.note(lx + 10, 266, 360, 84, ['36 of 64 tiles computed', '64 / 36 = 1.78 times less work'], { size: 21 });
  save('25.4-causal-tiles.svg', s);
}

// 6. Versions 1, 2, 3
{
  const s = new Sketch(880, 410, { title: 'FlashAttention 2022 introduced tiling, online softmax and recomputation; FlashAttention-2 2023 improved parallelism; FlashAttention-3 2024 targets Hopper GPUs with asynchrony and FP8', seed: 2546 });
  s.text(440, 36, 'Three versions, one algorithm', { size: 26, weight: 700 });

  const cols = [
    [28, C.blue, C.blueSoft, 'FlashAttention · 2022', 'the algorithm',
      ['tiles that fit in SRAM', 'online softmax', 'backward pass recomputes', 'the tiles: nothing N × N stored'],
      ['extra memory linear in N', '25–40% of peak FLOPs/s']],
    [310, C.amber, C.amberSoft, 'FlashAttention-2 · 2023', 'better use of the A100',
      ['fewer non-matmul operations', 'row blocks run in parallel', 'work split between warps', ''],
      ['about 2× faster than v1', '50–73% of peak FLOPs/s']],
    [592, C.green, C.greenSoft, 'FlashAttention-3 · 2024', 'built for Hopper (H100)',
      ['data moves overlap compute', 'matmul and softmax interleaved', 'optional FP8, quantized', 'block by block'],
      ['1.5–2.0× speedup on H100', 'FP16: up to 75% of peak']],
  ];
  for (const [x, color, soft, head, sub, lines, results] of cols) {
    s.rect(x, 60, 260, 288, { color, fill: soft, fillStyle: 'solid' });
    s.text(x + 130, 90, head, { size: 21, weight: 700 });
    s.text(x + 130, 114, sub, { size: 17, color: C.muted });
    s.line(x + 20, 126, x + 240, 126, { color, width: 1 });
    s.text(x + 18, 154, lines, { size: 17, anchor: 'start' });
    s.line(x + 20, 244, x + 240, 244, { color, width: 1, dash: '5 6' });
    s.text(x + 130, 276, 'reported', { size: 15, color: C.muted });
    s.text(x + 130, 302, results, { size: 18, weight: 700 });
  }
  s.arrow(290, 204, 308, 204, { color: C.muted, head: 8 });
  s.arrow(572, 204, 590, 204, { color: C.muted, head: 8 });
  s.text(440, 384, 'v1, v2 and FP16 v3 are exact: the same output as ordinary attention, up to rounding', { size: 19 });
  save('25.4-versions.svg', s);
}
