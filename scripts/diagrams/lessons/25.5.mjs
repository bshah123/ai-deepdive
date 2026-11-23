// Diagrams for 25.5 (Multi-Head Latent Attention). Run: node scripts/diagrams/lessons/25.5.mjs
// Every number comes from scripts/diagrams/lessons/25.5_data.py.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-25-attention/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const box = (s, x, y, w, h, label, color, fill, o = {}) => {
  s.rect(x, y, w, h, { color, fill, fillStyle: 'solid', ...(o.dash ? { dash: o.dash } : {}) });
  s.text(x + w / 2, y + h / 2 + 6, label, { font: 'mono', size: o.size ?? 16 });
};

// ---------------------------------------------------------------- 25.5-cache-per-token.svg
{
  const s = new Sketch(880, 330, { title: 'Numbers cached per token per layer for MHA, GQA, MLA and MQA at the DeepSeek-V2 shape, on a log scale', seed: 2551 });
  s.text(440, 34, 'What each token leaves in the cache, per layer', { size: 26, weight: 700 });
  const rows = [
    ['MHA, 128 KV heads', 32768, '32,768', '120 GiB', C.rose],
    ['GQA, 8 KV heads', 2048, '2,048', '7.5 GiB', C.amber],
    ['MLA', 576, '576', '2.11 GiB', C.green],
    ['MQA, 1 KV head', 256, '256', '0.94 GiB', C.blue],
  ];
  const x0 = 220, px = 34; // px per doubling, axis starts at 64 = 2^6
  rows.forEach(([name, v, label, gib, color], i) => {
    const y = 70 + i * 50, w = (Math.log2(v) - 6) * px;
    s.text(x0 - 14, y + 24, name, { size: 20, anchor: 'end' });
    s.rect(x0, y, w, 32, { color, fill: color });
    s.text(x0 + w + 12, y + 23, label, { font: 'mono', size: 16, anchor: 'start', weight: 700 });
    s.text(x0 + w + 12 + label.length * 10 + 14, y + 23, gib, { size: 19, anchor: 'start', color: C.muted });
  });
  s.line(x0, 268, x0 + 9 * px + 10, 268, { color: C.muted, width: 1.5 });
  [[64, 6], [256, 8], [1024, 10], [4096, 12], [16384, 14]].forEach(([t, e]) => {
    const x = x0 + (e - 6) * px;
    s.line(x, 264, x, 274, { color: C.muted, width: 1.5 });
    s.text(x, 293, t.toLocaleString('en-US'), { font: 'mono', size: 15, color: C.muted });
  });
  s.text(x0 + 4.5 * px, 316, 'numbers per token per layer (log scale)', { size: 18, color: C.muted });
  s.note(660, 196, 190, 92, ['grey: all 60 layers,', '32,768 tokens,', '2 bytes a number'], { size: 18 });
  save('25.5-cache-per-token.svg', s);
}

// ---------------------------------------------------------------- 25.5-mla-idea.svg
{
  const s = new Sketch(880, 400, { title: 'Standard attention caches a wide key and a wide value per token; MLA caches one narrow latent and rebuilds keys and values from it', seed: 2552 });
  s.text(440, 34, 'Cache the recipe, not the dish', { size: 26, weight: 700 });

  s.text(30, 76, 'Standard attention: cache every key and value', { size: 21, anchor: 'start', weight: 700 });
  box(s, 30, 112, 110, 46, 'h_t', C.ink, C.blueSoft);
  s.arrow(144, 128, 316, 108, { color: C.muted });
  s.arrow(144, 142, 316, 164, { color: C.muted });
  s.text(226, 104, 'W_K', { font: 'mono', size: 15, color: C.muted });
  s.text(226, 176, 'W_V', { font: 'mono', size: 15, color: C.muted });
  box(s, 320, 88, 300, 40, 'keys, all heads', C.rose, C.roseSoft);
  box(s, 320, 144, 300, 40, 'values, all heads', C.rose, C.roseSoft);
  s.text(645, 128, ['cached:', '2 · n_h · d_h numbers'], { size: 19, anchor: 'start', color: C.rose });

  s.line(30, 212, 850, 212, { color: C.muted, width: 1, dash: '4 6' });

  s.text(30, 248, 'MLA: cache one small latent', { size: 21, anchor: 'start', weight: 700 });
  box(s, 30, 292, 110, 46, 'h_t', C.ink, C.blueSoft);
  s.arrow(144, 315, 246, 315, { color: C.muted });
  s.text(195, 304, 'W_DKV', { font: 'mono', size: 15, color: C.muted });
  box(s, 250, 292, 70, 46, 'c_t', C.green, C.greenSoft);
  s.text(285, 364, ['cached:', 'd_c numbers'], { size: 19, color: C.green });
  s.arrow(324, 306, 496, 286, { color: C.muted });
  s.arrow(324, 324, 496, 344, { color: C.muted });
  s.text(408, 280, 'W_UK', { font: 'mono', size: 15, color: C.muted });
  s.text(408, 356, 'W_UV', { font: 'mono', size: 15, color: C.muted });
  box(s, 500, 266, 300, 40, 'keys, all heads', C.muted, 'none', { dash: '6 6' });
  box(s, 500, 324, 300, 40, 'values, all heads', C.muted, 'none', { dash: '6 6' });
  s.text(650, 388, 'rebuilt on demand, or never built at all', { size: 18, color: C.muted });
  save('25.5-mla-idea.svg', s);
}

// ---------------------------------------------------------------- 25.5-worked-example.svg
{
  const s = new Sketch(880, 420, { title: 'Worked example: rebuilding the keys and folding W_UK into the query give the same scores 4, 2, 3 and the same output', seed: 2553 });
  s.text(440, 34, 'Two routes to the same scores', { size: 26, weight: 700 });

  s.text(95, 80, 'cached latents', { size: 19, color: C.green, weight: 700 });
  ['c1 = [2, 0]', 'c2 = [0, 2]', 'c3 = [1, 1]'].forEach((t, i) => box(s, 30, 94 + i * 46, 130, 38, t, C.green, C.greenSoft, { size: 15 }));

  s.text(340, 80, 'route 1: rebuild the keys', { size: 19, color: C.rose, weight: 700 });
  s.rect(215, 94, 250, 104, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  ['k1 = [2, 0, 2,  2]', 'k2 = [0, 2, 2, -2]', 'k3 = [1, 1, 2,  0]'].forEach((t, i) => s.text(340, 122 + i * 28, t, { font: 'mono', size: 15 }));
  s.arrow(164, 146, 211, 146, { color: C.muted });
  s.arrow(469, 146, 586, 146, { color: C.muted });
  s.text(527, 136, 'dot with q', { size: 17, color: C.muted });
  box(s, 590, 124, 250, 44, 'K q  = [4, 2, 3]', C.ink, C.amberSoft);

  s.text(715, 212, 'identical', { size: 20, color: C.green, weight: 700 });

  s.text(340, 240, 'route 2: fold W_UK into the query', { size: 19, color: C.green, weight: 700 });
  box(s, 215, 254, 250, 44, "q' = W_UK^T q = [2, 1]", C.green, C.greenSoft, { size: 15 });
  s.arrow(469, 276, 586, 276, { color: C.muted });
  s.text(527, 266, 'dot with c', { size: 17, color: C.muted });
  box(s, 590, 254, 250, 44, "C q' = [4, 2, 3]", C.ink, C.amberSoft);
  s.text(340, 320, 'keys never built: 2 numbers instead of 12', { size: 17, color: C.muted });

  s.text(30, 356, 'then, on either route: divide by 2, softmax, mix', { size: 19, anchor: 'start', weight: 700 });
  box(s, 30, 368, 262, 40, 'w = [0.506, 0.186, 0.307]', C.blue, C.blueSoft, { size: 15 });
  s.arrow(296, 388, 334, 388, { color: C.muted });
  box(s, 338, 368, 200, 40, 'mix c = [1.32, 0.68]', C.green, C.greenSoft, { size: 15 });
  s.arrow(542, 388, 580, 388, { color: C.muted });
  box(s, 584, 368, 266, 40, 'out = [1.32, 0.68, 2, 1.36]', C.violet, 'none', { size: 15 });
  s.text(717, 356, 'W_UV, applied once', { size: 17, color: C.muted });
  save('25.5-worked-example.svg', s);
}

// ---------------------------------------------------------------- 25.5-low-rank.svg
{
  const s = new Sketch(880, 320, { title: 'Singular values of the 100 by 64 key matrix: eight are large (41.0 down to 12.5), the ninth onward are zero to rounding error', seed: 2554 });
  s.text(440, 34, 'The keys only ever fill 8 directions', { size: 26, weight: 700 });
  const sv = [41.0, 35.7, 31.6, 27.8, 26.3, 19.6, 16.9, 12.5];
  const x0 = 70, step = 56, base = 250;
  sv.forEach((v, i) => {
    const h = v * 4;
    s.rect(x0 + i * step, base - h, 38, h, { color: C.green, fill: C.green });
    s.text(x0 + i * step + 19, base - h - 8, v.toFixed(1), { font: 'mono', size: 15 });
    s.text(x0 + i * step + 19, base + 22, String(i + 1), { font: 'mono', size: 15, color: C.muted });
  });
  s.line(x0 - 14, base, 660, base, { color: C.muted, width: 1.5 });
  s.text(585, base - 12, '9 … 64:  below 1e-14', { size: 19, color: C.rose });
  s.text(585, base + 22, '9 … 64', { font: 'mono', size: 15, color: C.muted });
  s.text(330, 302, 'singular value number', { size: 18, color: C.muted });
  s.note(668, 78, 186, 104, ['key matrix:', '100 tokens × 64,', 'rank 8 = d_c'], { size: 19 });
  save('25.5-low-rank.svg', s);
}

// ---------------------------------------------------------------- 25.5-rope-problem.svg
{
  const s = new Sketch(880, 350, { title: 'Without positions the up-projection W_UK merges with the query once; with RoPE on the keys a rotation that depends on the distance t minus j sits between them, so each cached token needs its own latent query', seed: 2555 });
  s.text(440, 34, 'Why RoPE breaks the shortcut', { size: 26, weight: 700 });

  s.text(30, 78, 'No positions: W_UK slides into the query', { size: 21, anchor: 'start', weight: 700 });
  s.text(30, 126, 'score =', { size: 20, anchor: 'start' });
  box(s, 110, 98, 80, 44, 'q_t^T', C.blue, C.blueSoft);
  box(s, 200, 98, 100, 44, 'W_UK', C.blue, C.blueSoft);
  box(s, 322, 98, 70, 44, 'c_j', C.green, C.greenSoft);
  s.line(110, 152, 300, 152, { color: C.green, width: 2.5 });
  s.text(205, 174, 'computed once', { size: 18, color: C.green });
  s.text(430, 116, 'one latent query for every token:', { size: 19, anchor: 'start', color: C.green });
  s.text(430, 142, '[2, 1]', { font: 'mono', size: 16, anchor: 'start', weight: 700 });

  s.line(30, 196, 850, 196, { color: C.muted, width: 1, dash: '4 6' });

  s.text(30, 230, 'RoPE on the keys: a rotation is stuck in the middle', { size: 21, anchor: 'start', weight: 700 });
  s.text(30, 280, 'score =', { size: 20, anchor: 'start' });
  box(s, 110, 252, 80, 44, 'q_t^T', C.blue, C.blueSoft);
  box(s, 200, 252, 100, 44, 'R(j-t)', C.rose, C.roseSoft);
  box(s, 310, 252, 100, 44, 'W_UK', C.blue, C.blueSoft);
  box(s, 432, 252, 70, 44, 'c_j', C.green, C.greenSoft);
  s.text(250, 322, 'changes with j', { size: 18, color: C.rose });
  s.text(560, 226, 'latent query needed:', { size: 19, anchor: 'start', color: C.rose });
  ['t - j = 3   [0.04, 1.11]', 't - j = 2   [0.60, 1.89]', 't - j = 1   [1.55, 1.83]'].forEach((t, i) =>
    s.text(560, 254 + i * 26, t, { font: 'mono', size: 15, anchor: 'start' }));
  save('25.5-rope-problem.svg', s);
}

// ---------------------------------------------------------------- 25.5-full-mla.svg
{
  const s = new Sketch(880, 420, { title: 'Full MLA data flow with DeepSeek-V2 sizes: the hidden state (5120) is projected to a cached latent of 512 numbers and a cached positional key of 64; queries go through a 1536-wide latent; the score is a content part plus a positional part', seed: 2556 });
  s.text(440, 34, 'MLA in DeepSeek-V2, with its real sizes', { size: 26, weight: 700 });

  s.rect(30, 190, 120, 56, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(90, 214, 'h_t', { font: 'mono', size: 16 });
  s.text(90, 236, '5120', { font: 'mono', size: 15, color: C.muted });

  // cache
  s.rect(212, 64, 166, 162, { color: C.green, dash: '6 6' });
  box(s, 230, 78, 130, 46, 'c_KV  512', C.green, C.greenSoft);
  box(s, 230, 164, 130, 46, 'k_R  64', C.green, C.greenSoft);
  s.text(295, 248, 'cached: 512 + 64 = 576', { size: 18, color: C.green, weight: 700 });
  s.arrow(152, 198, 227, 106, { color: C.muted });
  s.text(150, 146, 'W_DKV', { font: 'mono', size: 14, color: C.muted });
  s.arrow(152, 212, 227, 190, { color: C.muted });
  s.text(180, 232, 'W_KR', { font: 'mono', size: 14, color: C.muted });
  s.arrow(152, 236, 227, 318, { color: C.muted });
  s.text(152, 290, 'W_DQ', { font: 'mono', size: 14, color: C.muted });

  // key / value side
  box(s, 480, 62, 160, 36, 'v_C  128 x 128', C.amber, C.amberSoft, { size: 15 });
  box(s, 480, 108, 160, 36, 'k_C  128 x 128', C.amber, C.amberSoft, { size: 15 });
  s.arrow(363, 92, 476, 80, { color: C.muted });
  s.text(420, 74, 'W_UV', { font: 'mono', size: 14, color: C.muted });
  s.arrow(363, 110, 476, 126, { color: C.muted });
  s.text(420, 140, 'W_UK', { font: 'mono', size: 14, color: C.muted });
  s.text(392, 178, 'RoPE; one per token, shared by all heads', { size: 16, color: C.muted, anchor: 'start' });
  s.arrow(363, 192, 666, 204, { color: C.muted });

  // query side
  box(s, 230, 298, 130, 46, 'c_Q  1536', C.blue, C.blueSoft);
  box(s, 480, 276, 160, 36, 'q_C  128 x 128', C.blue, C.blueSoft, { size: 15 });
  box(s, 480, 336, 160, 36, 'q_R  128 x 64', C.blue, C.blueSoft, { size: 15 });
  s.arrow(363, 312, 476, 296, { color: C.muted });
  s.text(420, 290, 'W_UQ', { font: 'mono', size: 14, color: C.muted });
  s.arrow(363, 330, 476, 352, { color: C.muted });
  s.text(420, 366, 'W_QR, RoPE', { font: 'mono', size: 14, color: C.muted });
  s.text(295, 370, 'not cached', { size: 17, color: C.muted });

  // score and output
  s.rect(670, 170, 190, 92, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(765, 196, 'q_C·k_C + q_R·k_R', { font: 'mono', size: 15 });
  s.text(765, 222, 'divide by √(128+64)', { size: 17 });
  s.text(765, 246, 'softmax → weights', { size: 17 });
  s.arrow(643, 128, 690, 166, { color: C.muted });
  s.arrow(643, 294, 690, 266, { color: C.muted });
  s.arrow(643, 352, 740, 266, { color: C.muted });
  box(s, 690, 58, 170, 44, 'mix v_C, W_O', C.violet, 'none', { size: 15 });
  s.arrow(643, 80, 686, 80, { color: C.muted });
  s.arrow(790, 166, 790, 106, { color: C.violet });
  s.text(765, 400, 'the two absorptions still apply to the content parts', { size: 16, color: C.muted, anchor: 'end' });
  save('25.5-full-mla.svg', s);
}
