// Diagrams for 26.2 (LayerNorm, RMSNorm, Pre-LN vs Post-LN).
// Run: node scripts/diagrams/lessons/26.2.mjs
// Every number comes from scripts/diagrams/lessons/26.2_data.py (run it to reprint them).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-26-transformer-architecture/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 26.2-norm-axes.svg
{
  const s = new Sketch(880, 320, { title: 'Two grids of 4 tokens by 4 features: LayerNorm averages across one row (one token), BatchNorm averages down one column (one feature across the batch)', seed: 2621 });
  s.text(440, 34, 'Which numbers does each norm average over?', { size: 26, weight: 700 });
  const panel = (x0, hiKind, hi, title, caption, col, soft) => {
    s.text(x0 + 107, 66, title, { size: 22, weight: 700, color: col });
    for (let c = 0; c < 4; c++) s.text(x0 + 23 + c * 56, 88, `f${c + 1}`, { font: 'mono', size: 15, color: C.muted });
    for (let r = 0; r < 4; r++) {
      s.text(x0 - 22, 92 + r * 46 + 22, `t${r + 1}`, { font: 'mono', size: 15, color: C.muted });
      for (let c = 0; c < 4; c++) {
        const hit = hiKind === 'row' ? r === hi : c === hi;
        s.rect(x0 + c * 56, 98 + r * 46, 46, 36, hit
          ? { color: col, fill: soft, fillStyle: 'solid' }
          : { color: C.muted, width: 1.4 });
      }
    }
    s.text(x0 + 107, 300, caption, { size: 19, color: col });
  };
  panel(110, 'row', 1, 'LayerNorm (this lesson)', 'mean and variance over the features of one token', C.blue, C.blueSoft);
  panel(570, 'col', 2, 'BatchNorm (for contrast)', 'mean and variance over the batch, one feature', C.amber, C.amberSoft);
  save('26.2-norm-axes.svg', s);
}

// ---------------------------------------------------------------- 26.2-worked-numbers.svg
{
  const s = new Sketch(880, 360, { title: 'Worked example on x = [1, 2, 3, 6]: LayerNorm gives [-1.069, -0.535, 0, 1.604] and RMSNorm gives [0.283, 0.566, 0.849, 1.697]', seed: 2622 });
  s.text(440, 32, 'One vector, two norms, four steps each', { size: 26, weight: 700 });
  const col = (x0, head, steps, out, color, soft) => {
    s.text(x0 + 190, 70, head, { size: 23, weight: 700, color });
    steps.forEach((t, i) => {
      const y = 86 + i * 64;
      s.rect(x0, y, 380, 42, { color, fill: soft, fillStyle: 'solid' });
      s.text(x0 + 190, y + 27, t, { font: 'mono', size: 15 });
      if (i < steps.length - 1) s.arrow(x0 + 190, y + 44, x0 + 190, y + 62, { color: C.muted, head: 7 });
    });
    s.text(x0 + 190, 352, out, { size: 19, color: C.muted });
  };
  col(40, 'LayerNorm', [
    'mean = 3;  x − mean = [−2, −1, 0, 3]',
    'variance = 3.5;  std = 1.871',
    'divide: [−1.069, −0.535, 0, 1.604]',
    'output: mean 0, variance 1',
  ], 'centres, then rescales', C.blue, C.blueSoft);
  col(460, 'RMSNorm', [
    'mean square = (1+4+9+36)/4 = 12.5',
    'root mean square = 3.536',
    'divide: [0.283, 0.566, 0.849, 1.697]',
    'output: mean not removed; RMS 1',
  ], 'rescales only', C.amber, C.amberSoft);
  save('26.2-worked-numbers.svg', s);
}

// ---------------------------------------------------------------- 26.2-prenorm-postnorm.svg
{
  const s = new Sketch(880, 300, { title: 'Two residual sublayers: Post-LN applies LayerNorm after the residual add, Pre-LN applies it to the sublayer input so the identity path stays clean', seed: 2623 });
  s.text(40, 36, 'Post-LN:  y = LN(x + F(x))', { size: 24, weight: 700, anchor: 'start', color: C.rose });
  s.line(70, 90, 70, 72, { color: C.muted }); s.line(70, 72, 340, 72, { color: C.muted }); s.arrow(340, 72, 340, 84, { color: C.muted, head: 7 });
  s.rect(30, 90, 60, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' }); s.text(60, 116, 'x', { size: 22, weight: 700 });
  s.arrow(92, 110, 134, 110, { color: C.muted, head: 7 });
  s.rect(138, 90, 130, 40, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' }); s.text(203, 116, 'sublayer F', { font: 'mono', size: 16 });
  s.arrow(270, 110, 312, 110, { color: C.muted, head: 7 });
  s.circle(340, 110, 52, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' }); s.text(340, 117, '+', { size: 26, weight: 700 });
  s.arrow(368, 110, 400, 110, { color: C.muted, head: 7 });
  s.rect(404, 90, 130, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' }); s.text(469, 116, 'LayerNorm', { font: 'mono', size: 16 });
  s.arrow(538, 110, 572, 110, { color: C.muted, head: 7 });
  s.rect(576, 90, 60, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' }); s.text(606, 116, 'y', { size: 22, weight: 700 });

  s.text(40, 196, 'Pre-LN:  y = x + F(LN(x))', { size: 24, weight: 700, anchor: 'start', color: C.blue });
  s.line(70, 240, 70, 222, { color: C.muted }); s.line(70, 222, 480, 222, { color: C.muted }); s.arrow(480, 222, 480, 230, { color: C.muted, head: 7 });
  s.rect(30, 240, 60, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' }); s.text(60, 266, 'x', { size: 22, weight: 700 });
  s.arrow(92, 260, 134, 260, { color: C.muted, head: 7 });
  s.rect(138, 240, 130, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' }); s.text(203, 266, 'LayerNorm', { font: 'mono', size: 16 });
  s.arrow(270, 260, 302, 260, { color: C.muted, head: 7 });
  s.rect(306, 240, 130, 40, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' }); s.text(371, 266, 'sublayer F', { font: 'mono', size: 16 });
  s.arrow(438, 260, 448, 260, { color: C.muted, head: 7 });
  s.circle(480, 260, 52, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' }); s.text(480, 267, '+', { size: 26, weight: 700 });
  s.arrow(508, 260, 540, 260, { color: C.muted, head: 7 });
  s.rect(544, 240, 60, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' }); s.text(574, 266, 'y', { size: 22, weight: 700 });
  s.text(440, 296, 'The top path is the residual stream: + adds the sublayer output back to it', { size: 18, color: C.muted });
  save('26.2-prenorm-postnorm.svg', s);
}

// ---------------------------------------------------------------- 26.2-depth-rms.svg
{
  const s = new Sketch(880, 340, { title: 'Line chart: root mean square of the residual stream per token against layer depth. Pre-LN rises from 1.007 to 3.833 over 24 blocks; Post-LN stays at 1.000', seed: 2624 });
  s.text(440, 34, 'Residual-stream scale with depth (24 blocks, random init)', { size: 25, weight: 700 });
  const X = (l) => 110 + 28.75 * l;
  const Y = (v) => 290 - 50 * v;
  s.line(110, 290, 800, 290, { color: C.ink, width: 1.5 });
  s.line(110, 90, 110, 290, { color: C.ink, width: 1.5 });
  for (let v = 0; v <= 4; v++) s.text(92, Y(v) + 6, `${v}`, { font: 'mono', size: 16, anchor: 'end', color: C.muted });
  for (const l of [0, 8, 16, 24]) s.text(X(l), 316, l === 24 ? '24 (out)' : `${l}`, { font: 'mono', size: 16, color: C.muted });
  s.text(440, 336, 'block index', { size: 18, color: C.muted });
  s.text(44, 190, 'RMS per token', { size: 18, color: C.muted, rotate: -90 });

  const pre = [[0, 1.007], [1, 1.255], [2, 1.398], [4, 1.744], [8, 2.535], [12, 2.945], [16, 3.357], [20, 3.573], [23, 3.741], [24, 3.833]];
  for (let i = 0; i < pre.length - 1; i++) s.line(X(pre[i][0]), Y(pre[i][1]), X(pre[i + 1][0]), Y(pre[i + 1][1]), { color: C.rose, width: 3 });
  for (const [l, v] of pre) s.circle(X(l), Y(v), 10, { color: C.rose, fill: C.rose, fillStyle: 'solid' });
  s.text(X(24) - 6, Y(3.833) - 16, '3.833', { font: 'mono', size: 16, color: C.rose, anchor: 'end' });
  s.text(X(0) + 12, Y(1.0) + 30, '1.007 at input, both', { font: 'mono', size: 16, color: C.rose, anchor: 'start' });

  s.line(X(0), Y(1.0), X(24), Y(1.0), { color: C.blue, width: 3 });
  for (const l of [0, 4, 8, 12, 16, 20, 24]) s.circle(X(l), Y(1.0), 10, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  s.text(X(12) + 40, Y(1.0) + 30, 'Post-LN: 1.000 after every block', { size: 18, color: C.blue });

  s.line(610, 170, 646, 170, { color: C.rose, width: 3 }); s.text(654, 176, 'Pre-LN', { size: 20, anchor: 'start', color: C.rose });
  s.line(610, 205, 646, 205, { color: C.blue, width: 3 }); s.text(654, 211, 'Post-LN', { size: 20, anchor: 'start', color: C.blue });
  save('26.2-depth-rms.svg', s);
}

// ---------------------------------------------------------------- 26.2-depth-grad.svg
{
  const s = new Sketch(880, 350, { title: 'Grouped bars: gradient norm with respect to each block input, for Pre-LN and Post-LN at selected depths; Pre-LN is 27.3 at block 0 and 8.3 at block 23', seed: 2625 });
  s.text(440, 34, 'Gradient norm at each block input (seed 0, 24 blocks)', { size: 25, weight: 700 });
  s.rect(560, 60, 22, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' }); s.text(590, 76, 'Pre-LN', { size: 20, anchor: 'start', color: C.rose });
  s.rect(700, 60, 22, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' }); s.text(730, 76, 'Post-LN', { size: 20, anchor: 'start', color: C.blue });
  const layers = [0, 4, 8, 12, 16, 20, 23];
  const pre = [27.278, 14.909, 11.626, 10.294, 9.417, 8.819, 8.283];
  const post = [8.912, 8.442, 11.909, 11.024, 12.240, 11.411, 8.484];
  const base = 300, k = 8;
  s.line(100, base, 800, base, { color: C.ink, width: 1.5 });
  layers.forEach((l, i) => {
    const gx = 150 + i * 105;
    const hp = pre[i] * k, hq = post[i] * k;
    s.rect(gx - 38, base - hp, 34, hp, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.rect(gx + 4, base - hq, 34, hq, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(gx - 21, base - hp - 10, pre[i].toFixed(1), { font: 'mono', size: 15, color: C.rose });
    s.text(gx + 21, base - hq - 10, post[i].toFixed(1), { font: 'mono', size: 15, color: C.blue });
    s.text(gx, 328, `block ${l}`, { font: 'mono', size: 16, color: C.muted });
  });
  s.text(440, 348, 'bar height ∝ norm of dL/d(block input) divided by √n', { size: 18, color: C.muted });
  save('26.2-depth-grad.svg', s);
}
