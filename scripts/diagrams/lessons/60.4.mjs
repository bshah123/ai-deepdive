import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-60-multimodal/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '60.4_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');

// 1. Forward noising: signal fades, noise grows (values from 60.4_data.json, schedule T = 1000)
{
  const s = new Sketch(880, 390, { title: 'Bars showing signal and noise coefficients at five timesteps of the forward process', seed: 411 });
  s.text(440, 34, 'Forward noising: signal fades, noise grows', { size: 24, weight: 700 });
  s.text(440, 70, 'x_t = sqrt(abar_t) x0 + sqrt(1 - abar_t) eps', { font: 'mono', size: 18 });
  const ts = ['0', '250', '500', '750', '999'];
  const base = 300, H = 160;
  ts.forEach((t, i) => {
    const cx = 150 + i * 145;
    const sig = D.schedule[t].signal, noi = D.schedule[t].noise;
    s.text(cx, 118, `t = ${t}`, { size: 19, weight: 700 });
    s.rect(cx - 40, base - sig * H, 30, sig * H, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 10, base - noi * H, 30, noi * H, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(cx - 25, base + 26, sig.toFixed(3), { font: 'mono', size: 15 });
    s.text(cx + 25, base + 26, noi.toFixed(3), { font: 'mono', size: 15 });
  });
  s.line(90, base, 800, base, { color: C.muted });
  s.rect(200, 350, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(230, 364, 'signal sqrt(abar_t)', { size: 17, anchor: 'start' });
  s.rect(470, 350, 22, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(500, 364, 'noise sqrt(1 - abar_t)', { size: 17, anchor: 'start' });
  save('60.4-forward-noise.svg', s);
}

// 2. Latent compression: pixels to a small latent
{
  const s = new Sketch(880, 300, { title: 'A 512 by 512 RGB image becomes a 64 by 64 by 4 latent', seed: 412 });
  s.text(440, 34, 'Latent diffusion: denoise a small code, not pixels', { size: 24, weight: 700 });
  s.rect(60, 70, 230, 200, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(175, 170, '512 x 512 x 3', { font: 'mono', size: 19 });
  s.text(175, 200, `${fmt(D.compress_image.pixel_values)} numbers`, { size: 18 });
  s.arrow(305, 170, 430, 170, { color: C.muted });
  s.text(368, 156, 'encoder', { size: 17 });
  s.rect(490, 110, 120, 120, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.rect(482, 102, 120, 120, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.rect(474, 94, 120, 120, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(534, 160, '64 x 64 x 4', { font: 'mono', size: 17 });
  s.text(534, 260, `${fmt(D.compress_image.latent_values)} numbers`, { size: 17 });
  s.note(640, 100, 210, 110, ['48 times fewer', 'numbers per image'], { size: 20 });
  save('60.4-compress.svg', s);
}

// 3. Patchify: latent grid to tokens
{
  const s = new Sketch(880, 420, { title: 'A latent is cut into patches, and each patch becomes one token', seed: 413 });
  s.text(440, 34, 'Patchify: cut the latent into tokens', { size: 24, weight: 700 });
  s.grid(60, 70, 8, 8, 28, { color: C.muted });
  s.rect(60, 70, 56, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(174, 320, "8 x 8 of the 32 x 32 tokens", { size: 16 });
  s.arrow(370, 190, 430, 190, { color: C.muted });
  [['tok 1'], ['tok 2'], ['tok 3'], ['...']].forEach(([label], i) => {
    const x = 450 + i * 98;
    s.rect(x, 160, 84, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 42, 191, label, { font: 'mono', size: 16 });
  });
  s.text(640, 250, 'each token = 2 x 2 x 4 = 16 numbers', { size: 18 });
  s.text(440, 372, 'T = (I / p)^2 = (64 / 2)^2 = 1024 tokens', { font: 'mono', size: 19 });
  s.text(440, 402, 'video: spacetime patches (pt, ph, pw) give (T / pt)(H / ph)(W / pw)', { size: 16 });
  save('60.4-patchify.svg', s);
}

// 4. Attention pairs by token count (values from 60.4_data.json)
{
  const s = new Sketch(880, 440, { title: 'Bar chart of attention pair counts for five token configurations', seed: 414 });
  s.text(440, 34, 'Attention cost grows with the square of the tokens', { size: 24, weight: 700 });
  const items = [
    ['image', '256 tokens', D.attention_pairs.image_latent64_p4],
    ['image', '1024 tokens', D.attention_pairs.image_latent64_p2],
    ['video', '512 tokens', D.attention_pairs.video_p2x2x2],
    ['video', '1024 tokens', D.attention_pairs.video_p1x2x2],
    ['video', '2048 tokens', D.attention_pairs.video_T16_p2x2x2],
  ];
  const base = 340, maxH = 240, max = D.attention_pairs.video_T16_p2x2x2.pairs;
  s.line(70, base, 810, base, { color: C.muted });
  items.forEach(([kind, n, it], i) => {
    const cx = 140 + i * 160;
    const h = (it.pairs / max) * maxH;
    const col = kind === 'image' ? C.blue : C.violet;
    const soft = kind === 'image' ? C.blueSoft : C.roseSoft;
    s.rect(cx - 50, base - h, 100, Math.max(h, 2), { color: col, fill: soft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, fmt(it.pairs), { font: 'mono', size: 15 });
    s.text(cx, base + 26, [kind, n], { size: 16 });
  });
  s.text(440, 418, 'pairs = tokens^2: video at 1024 tokens costs the same as image at 1024 tokens', { size: 16 });
  save('60.4-token-cost.svg', s);
}

// 5. adaLN-Zero DiT block
{
  const s = new Sketch(880, 470, { title: 'DiT block with adaLN-Zero: gates start at zero', seed: 415 });
  s.text(440, 34, 'DiT block with adaLN-Zero conditioning', { size: 24, weight: 700 });
  const row = (y, items) => items.forEach(([label, x, hi], i) => {
    s.rect(x, y, 150, 56, hi ? { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' } : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 75, y + 35, label, { size: 17 });
    if (i < items.length - 1) s.arrow(x + 150, y + 28, x + 180, y + 28, { color: C.muted });
  });
  row(72, [['tokens x', 30], ['LN, scale, shift', 210], ['Attention', 390], ['x gate a1, + x', 570, true]]);
  s.line(645, 128, 645, 152, { color: C.muted });
  s.line(645, 152, 105, 152, { color: C.muted });
  s.arrow(105, 152, 105, 176, { color: C.muted });
  row(176, [['tokens h', 30], ['LN, scale, shift', 210], ['MLP', 390], ['x gate a2, + h', 570, true]]);
  s.rect(30, 290, 200, 50, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(130, 320, 'c = timestep + class', { size: 17 });
  s.arrow(232, 315, 290, 315, { color: C.muted });
  s.rect(292, 290, 330, 50, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(457, 320, 'SiLU, Linear -> 6 vectors (shift, scale, gate) x 2', { size: 17 });
  s.note(440, 380, 780, 70, ['Zero-init the last Linear: every gate a = 0,', 'so each block returns its input unchanged at step 0.'], { size: 17 });
  save('60.4-adaln-zero.svg', s);
}
console.log('wrote 5 SVGs');
