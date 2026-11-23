import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-30-huggingface/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from scripts/diagrams/lessons/30.2_data.json, dumped from the NumPy experiment run.
const N = JSON.parse(readFileSync(join(HERE, '30.2_data.json'), 'utf8'));
const V = N.vocab;

// 1. One step of the generation loop
{
  const s = new Sketch(880, 330, { title: 'Flow of one generation step: forward, processors, pick, append, stop check, loop', seed: 301 });
  s.text(440, 34, 'One step of the generation loop', { size: 24, weight: 700 });
  const row1 = 80, row2 = 210, h = 60;
  s.rect(30, row1, 150, h, { color: C.muted });
  s.text(105, row1 + 26, 'prompt ids', { size: 18 });
  s.text(105, row1 + 48, '[the]', { font: 'mono', size: 16 });
  s.rect(220, row1, 170, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(305, row1 + 26, 'model forward', { size: 18 });
  s.text(305, row1 + 48, 'logits, one per token', { size: 15 });
  s.rect(430, row1, 190, h, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(525, row1 + 26, 'logits processors', { size: 18 });
  s.text(525, row1 + 48, 'temperature, top-k, top-p', { size: 15 });
  s.rect(660, row1, 190, h, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(755, row1 + 26, 'pick a token', { size: 18 });
  s.text(755, row1 + 48, 'argmax or sample', { size: 15 });
  s.arrow(180, row1 + 30, 220, row1 + 30, { color: C.muted });
  s.arrow(390, row1 + 30, 430, row1 + 30, { color: C.muted });
  s.arrow(620, row1 + 30, 660, row1 + 30, { color: C.muted });
  s.arrow(755, row1 + h, 755, row2, { color: C.muted });
  s.rect(660, row2, 190, h, { color: C.ink });
  s.text(755, row2 + 26, 'append to ids', { size: 18 });
  s.text(755, row2 + 48, 'one token longer', { size: 15 });
  s.arrow(660, row2 + 30, 390, row2 + 30, { color: C.muted });
  s.rect(220, row2, 170, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(305, row2 + 26, 'stop check', { size: 18 });
  s.text(305, row2 + 48, 'EOS? length? string?', { size: 15 });
  s.arrow(305, row2, 305, row1 + h, { color: C.amber });
  s.text(316, 176, 'no: next step', { size: 16, anchor: 'start', color: C.amber });
  s.arrow(220, row2 + 30, 180, row2 + 30, { color: C.green });
  s.text(200, row2 + 22, 'yes', { size: 16, color: C.green });
  s.rect(30, row2, 150, h, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(105, row2 + 26, 'decode text', { size: 18 });
  s.text(105, row2 + 48, 'return output', { size: 15 });
  s.text(440, 310, 'Each new token costs one full forward pass of the model.', { size: 19 });
  save('30.2-generation-loop.svg', s);
}

// 2. Temperature reshapes the same logits
{
  const s = new Sketch(880, 370, { title: 'Temperature applied to one logit row', seed: 302 });
  s.text(440, 34, 'Temperature reshapes the same logits', { size: 24, weight: 700 });
  const panels = [['T = 0.5', N.p_T05], ['T = 1.0', N.p_T1], ['T = 2.0', N.p_T2]];
  panels.forEach(([head, probs], k) => {
    const x0 = 20 + k * 280;
    s.text(x0 + 140, 74, head, { size: 20, weight: 700 });
    V.forEach((tok, i) => {
      const y = 110 + i * 34;
      s.text(x0 + 8, y + 4, tok, { font: 'mono', size: 16, anchor: 'start' });
      const len = probs[i] * (130 / 0.7);
      if (len > 0.5) s.rect(x0 + 92, y - 10, len, 20, { color: C.blue, fill: C.blue });
      s.text(x0 + 92 + len + 6, y + 5, probs[i].toFixed(3), { font: 'mono', size: 15, anchor: 'start' });
    });
  });
  s.text(440, 345, 'T below 1 sharpens toward the top token; T above 1 flattens toward uniform.', { size: 19 });
  save('30.2-temperature.svg', s);
}

// 3. Top-k and top-p cut the sorted distribution
{
  const s = new Sketch(880, 370, { title: 'Top-k and top-p keep different tokens', seed: 303 });
  s.text(440, 34, 'Top-k and top-p cut the same sorted distribution', { size: 24, weight: 700 });
  const order = V.map((t, i) => [t, N.p_T1[i]]).sort((a, b) => b[1] - a[1]);
  const base = 250, scale = 340;
  order.forEach(([tok, p], j) => {
    const cx = 160 + j * 100;
    const keepK = j < 3;
    const keepP = j < 2;
    const hgt = p * scale;
    if (keepK) s.rect(cx - 28, base - hgt, 56, hgt, { color: C.blue, fill: C.blue });
    else s.rect(cx - 28, base - hgt, 56, hgt, { color: C.muted });
    s.text(cx, base - hgt - 10, p.toFixed(3), { font: 'mono', size: 16 });
    s.text(cx, base + 28, tok, { font: 'mono', size: 17 });
  });
  s.line(60, base, 820, base, { color: C.ink });
  s.line(110, 300, 410, 300, { color: C.blue, width: 2.4 });
  s.text(430, 305, 'top-k = 3 keeps the 3 largest', { size: 18, anchor: 'start', color: C.blue });
  s.line(110, 334, 310, 334, { color: C.amber, width: 2.4 });
  s.text(330, 339, 'top-p = 0.7 keeps 2 (0.476 + 0.289 = 0.765)', { size: 18, anchor: 'start', color: C.amber });
  s.text(440, 362, 'Grey bars are removed; kept bars are renormalised to sum to 1.', { size: 17, color: C.muted });
  save('30.2-top-k-top-p.svg', s);
}

// 4. Three stopping rules on three traces
{
  const s = new Sketch(880, 400, { title: 'Stopping rules on three traces', seed: 304 });
  s.text(440, 34, 'Three stopping rules, three traces', { size: 24, weight: 700 });
  const rows = [
    ['greedy, max_new_tokens=8', N.seq_greedy],
    ['greedy, stop string (sat, on)', N.seq_stop],
    ['sampling T=1, seed 0', N.seq_eos],
  ];
  rows.forEach(([name, [text, reason]], r) => {
    const y = 80 + r * 105;
    s.text(30, y - 12, name, { font: 'mono', size: 16, anchor: 'start' });
    const toks = text.split(' ');
    toks.forEach((tok, j) => {
      const x = 30 + j * 84;
      if (j === 0) s.rect(x, y, 76, 40, { color: C.muted });
      else s.rect(x, y, 76, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(x + 38, y + 26, tok, { font: 'mono', size: 16 });
    });
    s.text(30, y + 62, `stopped by: ${reason}`, { size: 18, anchor: 'start', color: C.amber });
  });
  s.text(440, 380, 'Grey box = prompt token. Blue = generated token. Stop checks run after each append.', { size: 17, color: C.muted });
  save('30.2-stopping.svg', s);
}

// 5. Greedy versus beam search on a two-step tree
{
  const s = new Sketch(880, 400, { title: 'Greedy versus beam search on a hand-built tree', seed: 305 });
  s.text(440, 34, 'Greedy takes the best first step; beam keeps two paths', { size: 24, weight: 700 });
  s.raw('<g transform="translate(0 40)">');
  const t = N.tree;
  const node = (cx, cy, label, fillColor) => {
    if (fillColor) s.rect(cx - 36, cy - 17, 72, 34, { color: fillColor.c, fill: fillColor.f, fillStyle: 'solid' });
    else s.rect(cx - 36, cy - 17, 72, 34, { color: C.ink });
    s.text(cx, cy + 6, label, { font: 'mono', size: 17 });
  };
  node(110, 180, 'root');
  node(300, 100, 'A', { c: C.amber, f: C.amberSoft });
  node(300, 260, 'B', { c: C.green, f: C.greenSoft });
  node(500, 40, 'a1', { c: C.amber, f: C.amberSoft });
  node(500, 140, 'a2');
  node(500, 220, 'b1', { c: C.green, f: C.greenSoft });
  node(500, 300, 'b2');
  s.arrow(146, 172, 264, 108, { color: C.amber, width: 2.6 });
  s.arrow(146, 188, 264, 252, { color: C.green, width: 2.6 });
  s.arrow(336, 96, 464, 44, { color: C.amber, width: 2.6 });
  s.arrow(336, 104, 464, 136, { color: C.muted });
  s.arrow(336, 256, 464, 224, { color: C.green, width: 2.6 });
  s.arrow(336, 264, 464, 296, { color: C.muted });
  s.text(205, 128, `${t.A}`, { font: 'mono', size: 16 });
  s.text(205, 236, `${t.B}`, { font: 'mono', size: 16 });
  s.text(400, 62, `${t.a1}`, { font: 'mono', size: 16 });
  s.text(400, 150, `${t.a2}`, { font: 'mono', size: 16 });
  s.text(400, 214, `${t.b1}`, { font: 'mono', size: 16 });
  s.text(400, 298, `${t.b2}`, { font: 'mono', size: 16 });
  const pa1 = t.A * t.a1, pa2 = t.A * t.a2, pb1 = t.B * t.b1, pb2 = t.B * t.b2;
  s.text(560, 46, `p = ${pa1.toFixed(4)}`, { font: 'mono', size: 16, anchor: 'start' });
  s.text(560, 146, `p = ${pa2.toFixed(4)}`, { font: 'mono', size: 16, anchor: 'start' });
  s.text(560, 226, `p = ${pb1.toFixed(4)}`, { font: 'mono', size: 16, anchor: 'start', color: C.green });
  s.text(560, 306, `p = ${pb2.toFixed(4)}`, { font: 'mono', size: 16, anchor: 'start' });
  s.text(440, 344, 'Amber: greedy path (0.275). Green: beam width 2 keeps b1 (0.4275) and a1 (tie with a2).', { size: 17 });
  s.raw('</g>');
  save('30.2-beam-tree.svg', s);
}
console.log('wrote 30.2 diagrams');
