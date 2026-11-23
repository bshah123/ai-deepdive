// Diagrams for 27.1 (NanoGPT from scratch). Run: node scripts/diagrams/lessons/27.1.mjs
// Every number comes from scripts/diagrams/lessons/27.1_experiment.py, which writes 27.1_data.json.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-27-gpt-decoder-llms/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const DATA = JSON.parse(readFileSync(join(HERE, '27.1_data.json'), 'utf8'));
const f3 = (v) => v.toFixed(3);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const fmtInt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------------------------------------------------------------- 27.1-pipeline.svg
{
  const s = new Sketch(880, 470, { title: 'Pipeline of the NanoGPT forward pass: token ids to embeddings, two blocks, final layer norm, then logits through the tied embedding matrix', seed: 2701 });
  s.text(440, 34, 'The forward pass, top to bottom', { size: 26, weight: 700 });
  const X = 60, W = 400;
  const box = (y, h, label, sub, color, fill) => {
    s.rect(X, y, W, h, { color, fill, fillStyle: 'solid' });
    s.text(X + W / 2, y + (sub ? 24 : h / 2 + 6), label, { size: 19, weight: 700 });
    if (sub) s.text(X + W / 2, y + 46, sub, { size: 16, font: 'mono', color: C.muted });
  };
  box(56, 56, 'token ids', '(1, 16): 16 characters as integers', C.blue, C.blueSoft);
  s.arrow(X + W / 2, 112, X + W / 2, 128, { color: C.muted });
  box(128, 56, 'token + position embedding', 'wte[ids] + wpe[0:16] -> (1, 16, 32)', C.blue, C.blueSoft);
  s.arrow(X + W / 2, 184, X + W / 2, 198, { color: C.muted });
  // block container
  s.rect(X - 20, 198, W + 40, 142, { color: C.violet, fill: 'none', fillStyle: 'hachure' });
  s.text(X + W / 2, 218, 'Block, repeated 2 times', { size: 19, weight: 700 });
  s.rect(X, 230, W, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(X + W / 2, 255, 'LayerNorm, causal attention, add', { size: 16 });
  s.rect(X, 280, W, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(X + W / 2, 305, 'LayerNorm, MLP 32 to 128 to 32, add', { size: 16 });
  s.arrow(X + W / 2, 340, X + W / 2, 352, { color: C.muted });
  box(352, 44, 'final LayerNorm', null, C.blue, C.blueSoft);
  s.arrow(X + W / 2, 396, X + W / 2, 410, { color: C.muted });
  box(410, 44, 'logits = x times wte transposed', null, C.rose, C.roseSoft);
  // right-hand notes: the numbers this lesson's model uses
  s.note(520, 100, 320, 120, ['Sizes in this model:', '28 symbols (vocab), 16 positions,', 'width 32, 4 heads of 8 dims, 2 blocks'], { size: 18 });
  s.note(520, 250, 320, 130, ['Weight tying: the matrix wte', 'maps ids to vectors at the input', 'and vectors back to 28 scores at', 'the output.'], { size: 18 });
  s.text(520, 420, `${DATA.params_tiny_actual.toLocaleString('en-US')} parameters (counted)`, { size: 18, color: C.muted, anchor: 'start' });
  save('27.1-pipeline.svg', s);
}

// ---------------------------------------------------------------- 27.1-residual-block.svg
{
  const s = new Sketch(880, 330, { title: 'One pre-LN block: the input x is carried around each sub-layer by a skip connection and added back', seed: 2702 });
  s.text(440, 34, 'One block: a skip connection around each sub-layer', { size: 26, weight: 700 });
  const Y = 190;
  s.circle(60, Y, 46, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(60, Y + 8, 'x', { size: 24, weight: 700 });
  s.rect(120, Y - 24, 110, 48, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(175, Y + 6, 'LayerNorm', { size: 17 });
  s.rect(262, Y - 26, 130, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(327, Y + 6, 'attention', { size: 18 });
  s.circle(430, Y, 36, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(430, Y + 8, '+', { size: 26, weight: 700 });
  s.rect(490, Y - 24, 110, 48, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(545, Y + 6, 'LayerNorm', { size: 17 });
  s.rect(622, Y - 26, 110, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(677, Y + 6, 'MLP', { size: 18 });
  s.circle(790, Y, 36, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(790, Y + 8, '+', { size: 26, weight: 700 });
  s.arrow(106, Y, 120, Y, { color: C.muted });
  s.arrow(230, Y, 262, Y, { color: C.muted });
  s.arrow(392, Y, 412, Y, { color: C.muted });
  s.arrow(448, Y, 490, Y, { color: C.muted });
  s.arrow(600, Y, 622, Y, { color: C.muted });
  s.arrow(732, Y, 754, Y, { color: C.muted });
  // top skip: x to the first +
  s.line(60, Y - 46, 60, 110, { color: C.blue });
  s.line(60, 110, 430, 110, { color: C.blue });
  s.arrow(430, 110, 430, Y - 36, { color: C.blue });
  s.text(245, 98, 'skip: add x back', { size: 17, color: C.blue });
  // bottom skip: output of the first + to the second +
  s.line(430, Y + 36, 430, 290, { color: C.amber });
  s.line(430, 290, 790, 290, { color: C.amber });
  s.arrow(790, 290, 790, Y + 36, { color: C.amber });
  s.text(610, 280, 'skip: carry x + attention forward', { size: 17, color: C.amber });
  s.arrow(826, Y, 852, Y, { color: C.muted });
  s.text(838, Y - 14, 'out', { size: 18, anchor: 'middle' });
  save('27.1-residual-block.svg', s);
}

// ---------------------------------------------------------------- 27.1-causal-weights.svg
{
  const s = new Sketch(880, 480, { title: '4 by 4 causal attention weights for block 0, head 0; the cells above the diagonal are zero', seed: 2703 });
  s.text(440, 34, 'Causal mask: who may each position read?', { size: 26, weight: 700 });
  const x0 = 250, y0 = 96, cell = 74, A = DATA.att_head0_block0_4x4;
  s.text(x0 + 2 * cell, 82, 'key j (position being read)', { size: 18, color: C.muted });
  s.text(x0 - 20, y0 - 8, 'query i', { size: 18, color: C.muted, anchor: 'end' });
  for (let j = 0; j < 4; j++) s.text(x0 + j * cell + cell / 2, y0 + 18, String(j), { size: 18, color: C.muted });
  for (let i = 0; i < 4; i++) {
    s.text(x0 - 22, y0 + 30 + i * cell + cell / 2 + 6, String(i), { size: 18, color: C.muted, anchor: 'end' });
    for (let j = 0; j < 4; j++) {
      const x = x0 + j * cell + 3, y = y0 + 30 + i * cell + 3, w = cell - 6;
      if (j > i) {
        s.rect(x, y, w, w, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', dash: '6 6' });
        s.text(x + w / 2, y + w / 2 + 6, '0', { size: 20, font: 'mono', color: C.rose });
      } else {
        s.rect(x, y, w, w, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
        s.text(x + w / 2, y + w / 2 + 6, f3(A[i][j]), { size: 18, font: 'mono' });
      }
    }
  }
  s.note(600, 150, 250, 150, ['Row 1 has two live keys,', 'row 3 has four.', 'Each live row sums to 1.', 'Row sums here: 1.000 each.'], { size: 18 });
  s.text(440, 452, 'Random weights, so the values only show the mechanism, not learned behaviour.', { size: 17, color: C.muted });
  save('27.1-causal-weights.svg', s);
}

// ---------------------------------------------------------------- 27.1-leakage.svg
{
  const s = new Sketch(880, 450, { title: 'Bar chart: change in logits at each position after changing the token at position 10, with and without the causal mask', seed: 2704 });
  s.text(440, 34, 'Which outputs move when token 10 changes?', { size: 26, weight: 700 });
  const on = DATA.leak.mask_on, off = DATA.leak.mask_off;
  const x0 = 110, base = 360, scale = 240 / 0.55, grp = 46, bw = 15;
  s.line(x0 - 10, base, x0 + 16 * grp, base, { color: C.muted });
  s.text(x0 - 16, base - 0.5 * scale + 6, '0.5', { size: 16, color: C.muted, anchor: 'end' });
  s.line(x0 - 10, base - 0.5 * scale, x0 + 16 * grp, base - 0.5 * scale, { color: C.muted, dash: '4 8' });
  for (let i = 0; i < 16; i++) {
    const gx = x0 + i * grp + 8;
    const hOn = on[i] * scale, hOff = off[i] * scale;
    if (hOn > 0) s.rect(gx, base - hOn, bw, hOn, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(gx + bw + 2, base - hOff, bw, hOff, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(gx + bw, base + 22, String(i), { size: 16, color: C.muted });
  }
  s.text(x0 + 10 * grp + 8 - 4, base - 0.494 * scale - 14, `${f3(on[10])}`, { size: 16, font: 'mono', color: C.blue });
  s.text(x0 + 16 * grp / 2, base + 54, 'position in the sequence', { size: 17, color: C.muted });
  s.note(110, 58, 250, 58, ['blue: causal mask on', 'amber: mask removed'], { size: 17 });
  s.text(440, 428, 'Zero bars before position 10 are exact zeros, not rounding.', { size: 17, color: C.muted });
  save('27.1-leakage.svg', s);
}

// ---------------------------------------------------------------- 27.1-init-loss.svg
{
  const s = new Sketch(880, 330, { title: 'Initial cross-entropy loss at two weight scales compared with the uniform guess ln 28', seed: 2705 });
  s.text(440, 34, 'Starting loss: near the uniform guess, or far above it', { size: 26, weight: 700 });
  const x0 = 260, scale = 440 / 12;   // px per nat; 0 to 12 nats across 440 px
  const rows = [
    ['std 0.02', DATA.init_losses['0.02'], C.green, C.greenSoft],
    ['std 1.0', DATA.init_losses['1.0'], C.rose, C.roseSoft],
  ];
  rows.forEach(([label, vals, col, soft], i) => {
    const y = 110 + i * 80, m = mean(vals), w = m * scale;
    s.text(x0 - 16, y + 24, label, { size: 19, anchor: 'end' });
    s.rect(x0, y, w, 46, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x0 + w + 12, y + 16, `mean ${m.toFixed(2)} nats`, { size: 17, anchor: 'start' });
    s.text(x0 + w + 12, y + 38, `range ${Math.min(...vals).toFixed(2)} to ${Math.max(...vals).toFixed(2)}`, { size: 16, anchor: 'start', color: C.muted });
  });
  const lnV = DATA.ln_V, xl = x0 + lnV * scale;
  s.line(xl, 96, xl, 262, { color: C.ink, dash: '6 6' });
  s.text(xl, 286, `ln 28 = ${lnV.toFixed(2)} (uniform guess)`, { size: 17 });
  save('27.1-init-loss.svg', s);
}
console.log('wrote 27.1 diagrams to', OUT);
