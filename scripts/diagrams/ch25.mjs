// Diagrams for Chapter 25 (Attention). Run: node scripts/diagrams/ch25.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from './sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'content/part-04-transformers-llms/chapter-25-attention/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- 25.1 soft lookup
{
  const s = new Sketch(880, 340, { title: 'Hard dictionary lookup versus soft attention lookup', seed: 101 });
  // left: python dict
  s.text(210, 34, 'Python dict: hard lookup', { size: 26, weight: 700 });
  s.rect(30, 140, 80, 44, { color: C.blue });
  s.text(70, 169, '"cat"', { font: 'mono', size: 16, color: C.blue });
  s.text(70, 128, 'query', { size: 19, color: C.blue });
  const keys = ['"cat"', '"dog"', '"fox"'];
  const vals = ['1.0', '2.0', '3.0'];
  keys.forEach((k, i) => {
    const y = 80 + i * 60;
    const hit = i === 0;
    s.rect(190, y, 76, 40, { color: hit ? C.green : C.muted });
    s.text(228, y + 26, k, { font: 'mono', size: 15, color: hit ? C.ink : C.muted });
    s.rect(316, y, 60, 40, { color: hit ? C.green : C.muted, fill: hit ? C.greenSoft : undefined, fillStyle: 'solid' });
    s.text(346, y + 26, vals[i], { font: 'mono', size: 15, color: hit ? C.ink : C.muted });
    s.arrow(268, y + 20, 312, y + 20, { color: hit ? C.green : C.muted, width: hit ? 2 : 1, head: 8 });
  });
  s.arrow(112, 158, 186, 104, { color: C.green, width: 2.2 });
  s.text(150, 112, 'match!', { size: 19, color: C.green, rotate: -30 });
  s.text(228, 66, 'keys', { size: 19, color: C.muted });
  s.text(346, 66, 'values', { size: 19, color: C.muted });
  s.text(210, 290, ['exact match →', 'exactly ONE value'], { size: 22 });

  s.line(440, 40, 440, 310, { color: C.muted, width: 1.2, dash: '6 8' });

  // right: attention
  s.text(665, 34, 'Attention: soft lookup', { size: 26, weight: 700 });
  s.rect(470, 140, 54, 44, { color: C.blue });
  s.text(497, 169, 'q', { font: 'mono', size: 18, color: C.blue });
  s.text(497, 128, 'query', { size: 19, color: C.blue });
  const w = [0.665, 0.09, 0.245];
  w.forEach((wi, i) => {
    const y = 80 + i * 60;
    const th = 1 + wi * 7;
    s.rect(596, y, 50, 40, { color: C.ink });
    s.text(621, y + 27, `k${i + 1}`, { font: 'mono', size: 16 });
    s.text(679, y + 27, wi.toFixed(3), { size: 19, color: C.amber, weight: 700 });
    s.rect(712, y, 50, 40, { color: C.violet });
    s.text(737, y + 27, `v${i + 1}`, { font: 'mono', size: 16, color: C.violet });
    s.arrow(526, 162, 592, y + 20, { color: C.amber, width: th, head: 9 });
    s.arrow(764, y + 20, 806, 162, { color: C.amber, width: th, head: 9 });
  });
  s.text(679, 66, 'weight', { size: 19, color: C.amber });
  s.circle(838, 162, 58, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(838, 169, 'blend', { size: 20 });
  s.text(665, 290, ['every key matches a little →', 'a weighted blend of ALL values'], { size: 22 });
  save('25.1-soft-lookup.svg', s);
}

// ---------------------------------------------------------------- 25.1 worked pipeline
{
  const s = new Sketch(880, 330, { title: 'The four steps of attention on the worked example', seed: 202 });
  const heads = ['① score', '② scale', '③ softmax', '④ mix'];
  const xs = [30, 250, 470, 700];
  heads.forEach((h, i) => s.text(xs[i] + 70, 36, h, { size: 26, weight: 700 }));
  s.text(100, 62, 'q · kᵢ', { size: 20, color: C.muted });
  s.text(320, 62, '÷ √dₖ = ÷ 2', { size: 20, color: C.muted });
  s.text(540, 62, 'e^s / Σ e^s', { size: 20, color: C.muted });
  s.text(770, 62, 'Σ weightᵢ · vᵢ', { size: 20, color: C.muted });

  const scores = [4, 0, 2];
  const scaled = [2, 0, 1];
  const wts = [0.665, 0.09, 0.245];
  scores.forEach((v, i) => {
    const y = 88 + i * 58;
    s.text(48, y + 27, `k${i + 1}`, { font: 'mono', size: 14, color: C.muted, anchor: 'start' });
    s.rect(80, y, 70, 40, { color: C.blue });
    s.text(115, y + 27, String(v), { font: 'mono', size: 18 });
    s.rect(300, y, 70, 40, { color: C.blue });
    s.text(335, y + 27, String(scaled[i]), { font: 'mono', size: 18 });
    // bars
    const bw = Math.max(4, wts[i] * 180);
    s.rect(486, y + 6, bw, 28, { color: C.amber, fill: C.amber });
    s.text(486 + bw + 8, y + 27, wts[i].toFixed(3), { font: 'mono', size: 15, anchor: 'start' });
  });
  s.arrow(165, 165, 285, 165, { color: C.muted });
  s.arrow(385, 165, 470, 165, { color: C.muted });
  s.arrow(680, 165, 718, 165, { color: C.muted });
  s.rect(722, 132, 140, 66, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(792, 172, '[7.876, 2.124]', { font: 'mono', size: 15 });
  s.text(792, 222, ['mostly v₁,', 'a bit of v₃'], { size: 20, color: C.green });
  s.text(560, 268, 'sums to 1', { size: 20, color: C.amber });
  s.note(40, 262, 360, 52, 'key 1 matched best → it gets ⅔ of the attention', { size: 20 });
  save('25.1-worked-pipeline.svg', s);
}

// ---------------------------------------------------------------- 25.1 matrix shapes
{
  const s = new Sketch(880, 330, { title: 'Shapes in softmax of Q K transpose over root d_k, times V', seed: 303 });
  const cell = 24;
  const top = 105;
  const mat = (x, rows, cols, name, shape, color, o = {}) => {
    const y = top + (4 * cell - rows * cell) / 2;
    s.grid(x, y, rows, cols, cell, { color, ...o });
    s.text(x + (cols * cell) / 2, y - 14, name, { size: 26, weight: 700, color });
    s.text(x + (cols * cell) / 2, y + rows * cell + 28, shape, { size: 19, color: C.muted });
  };
  const op = (x, t) => s.text(x, top + 2 * cell + 9, t, { size: 30 });
  mat(20, 4, 3, 'Q', 'n × dₖ', C.blue);
  op(108, '·');
  mat(124, 3, 5, 'Kᵀ', 'dₖ × m', C.ink);
  op(262, '=');
  mat(280, 4, 5, 'scores', 'n × m', C.ink, { hiRow: 1 });
  s.arrow(410, top + 48, 466, top + 48, { color: C.amber });
  s.text(438, top + 22, 'softmax', { size: 19, color: C.amber });
  mat(476, 4, 5, 'weights', 'n × m', C.amber, { hiRow: 1 });
  op(612, '·');
  mat(628, 5, 3, 'V', 'm × dᵥ', C.violet);
  op(714, '=');
  mat(736, 4, 3, 'out', 'n × dᵥ', C.green, { hiRow: 1, hiColor: C.green });
  s.note(250, 262, 390, 56, ['row i = query i: softmax runs along each row,', 'so every row of weights sums to 1'], { size: 19, rotate: 1 });
  s.curveArrow(612, 262, 640, 236, 598, 190, { color: C.amber, width: 1.4, head: 9 });
  save('25.1-matrix-shapes.svg', s);
}

// ---------------------------------------------------------------- 25.1 self-attention
{
  const s = new Sketch(880, 360, { title: 'Self-attention: Q, K and V are three projections of the same input X', seed: 404 });
  s.grid(30, 70, 5, 4, 26, { color: C.ink });
  s.text(82, 52, 'X', { size: 28, weight: 700 });
  s.text(82, 228, ['n tokens ×', 'd_model'], { size: 19, color: C.muted });
  const rows = [
    { y: 60, name: 'Q', w: '× W_Q', c: C.blue, role: 'what I look for' },
    { y: 140, name: 'K', w: '× W_K', c: C.ink, role: 'what I offer' },
    { y: 220, name: 'V', w: '× W_V', c: C.violet, role: 'what I hand over' },
  ];
  rows.forEach((r) => {
    s.arrow(140, 135, 290, r.y + 22, { color: r.c, width: 2 });
    const lab = { Q: [196, 92], K: [232, 178], V: [186, 232] }[r.name];
    s.text(lab[0], lab[1], r.w, { size: 20, color: r.c });
    s.rect(296, r.y, 60, 44, { color: r.c });
    s.text(326, r.y + 30, r.name, { font: 'mono', size: 20, color: r.c });
    s.text(366, r.y + 28, r.role, { size: 19, color: C.muted, anchor: 'start' });
  });
  s.arrow(528, 82, 586, 112, { color: C.ink });
  s.arrow(528, 162, 586, 140, { color: C.ink });
  s.rect(590, 98, 150, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(665, 124, 'softmax(QKᵀ/√dₖ)', { size: 18 });
  s.text(665, 146, 'weights', { size: 17, color: C.amber });
  s.arrow(665, 156, 665, 220, { color: C.amber });
  s.arrow(528, 242, 642, 242, { color: C.violet });
  s.circle(665, 242, 40, { color: C.amber });
  s.text(665, 249, '·', { size: 34 });
  s.arrow(687, 242, 766, 242, { color: C.green, width: 2.2 });
  s.rect(770, 220, 90, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(815, 248, 'output', { size: 20 });
  s.note(30, 288, 600, 56, ['Why three matrices? With one W, the scores XW(XW)ᵀ are symmetric:', 'token i would rate token j exactly as j rates i.'], { size: 19 });
  save('25.1-self-attention.svg', s);
}

// ---------------------------------------------------------------- 25.1 why scale
// Data: scripts/diagrams/ch25_scaling_data.py (avg sorted weights, 2000 trials, 16 keys, d_k = 512)
{
  const data = {
    unscaled: [0.946, 0.049, 0.005, 0.001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    scaled: [0.246, 0.148, 0.11, 0.088, 0.073, 0.061, 0.052, 0.045, 0.038, 0.033, 0.028, 0.024, 0.02, 0.016, 0.012, 0.008],
  };
  const s = new Sketch(880, 360, { title: 'Attention weights over 16 keys with and without dividing by root d_k, d_k = 512', seed: 505 });
  const chart = (x0, title, vals, color, note) => {
    const base = 270;
    const H = 190;
    s.text(x0 + 180, 34, title, { size: 25, weight: 700, color });
    s.line(x0, base, x0 + 360, base, { color: C.ink });
    s.line(x0, base, x0, base - H - 10, { color: C.ink });
    s.text(x0 - 8, base - H + 6, '1.0', { font: 'mono', size: 12, anchor: 'end', color: C.muted });
    s.text(x0 - 8, base + 4, '0', { font: 'mono', size: 12, anchor: 'end', color: C.muted });
    vals.forEach((v, i) => {
      const h = Math.max(1.5, v * H);
      s.rect(x0 + 8 + i * 22, base - h, 16, h, { color, fill: color, width: 1, roughness: 0.9, hachureGap: 4 });
    });
    s.text(x0 + 180, base + 30, 'keys, sorted by weight', { size: 18, color: C.muted });
    s.note(x0 + 90, 70, 260, 76, note, { size: 19, rotate: x0 > 400 ? 1.5 : -1.5 });
  };
  chart(50, 'without ÷√dₖ', data.unscaled, C.rose, ['one key takes ~95%', '→ softmax is almost one-hot', '→ gradient ≈ 0']);
  chart(490, 'with ÷√dₖ', data.scaled, C.blue, ['weights stay spread out', '→ gradients keep flowing', '→ W_Q, W_K keep learning']);
  s.text(440, 340, 'average over 2000 random trials · 16 keys · dₖ = 512', { size: 18, color: C.muted });
  save('25.1-why-scale.svg', s);
}

// ---------------------------------------------------------------- 25.1 n^2 memory
{
  const s = new Sketch(880, 300, { title: 'Attention weight matrix memory grows with the square of sequence length', seed: 606 });
  const items = [
    { n: '2,048', side: 12, mem: '16 MiB' },
    { n: '8,192', side: 48, mem: '256 MiB' },
    { n: '32,768', side: 192, mem: '4 GiB' },
  ];
  const xs = [90, 270, 520];
  const base = 250;
  items.forEach((it, i) => {
    const x = xs[i];
    s.rect(x, base - it.side, it.side, it.side, { color: i === 2 ? C.rose : C.amber, fill: i === 2 ? C.rose : C.amber, hachureGap: 7 });
    s.text(x + it.side / 2, base + 26, `n = ${it.n}`, { size: 20 });
    s.text(x + it.side / 2, base - it.side - 12, it.mem, { size: 22, weight: 700 });
  });
  s.text(40, 34, 'one n × n weight matrix (float32, one head, one sequence)', { size: 22, anchor: 'start' });
  s.note(735, 90, 135, 110, ['4× the tokens', '→ 16× the', 'memory'], { size: 21, rotate: 2 });
  save('25.1-n2-memory.svg', s);
}
