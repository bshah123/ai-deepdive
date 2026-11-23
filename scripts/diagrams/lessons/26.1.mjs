// Diagrams for 26.1 (the Transformer block). Run: node scripts/diagrams/lessons/26.1.mjs
// Every number comes from scripts/diagrams/lessons/26.1_experiment.py, which writes 26.1_data.json.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-26-transformer-architecture/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const DATA = JSON.parse(readFileSync(join(HERE, '26.1_data.json'), 'utf8'));
const f3 = (v) => v.toFixed(3);
const f1 = (v) => v.toFixed(1);
const millions = (n) => (n / 1e6).toFixed(2) + ' M';

// ---------------------------------------------------------------- 26.1-two-blocks.svg
{
  const s = new Sketch(880, 490, { title: 'Encoder block and decoder block drawn as stacks of sub-layers, with encoder output feeding the decoder cross-attention', seed: 2601 });
  s.text(440, 34, 'Two blocks: the decoder adds a second attention sub-layer', { size: 26, weight: 700 });
  const BW = 200, BH = 34, PITCH = 48, BASE = 440;
  const yOf = (i) => BASE - i * PITCH;
  const kinds = {
    self: { color: C.blue, fill: C.blueSoft },
    cross: { color: C.rose, fill: C.roseSoft },
    ffn: { color: C.green, fill: C.greenSoft },
    norm: { color: C.amber, fill: C.amberSoft },
  };
  // rows bottom to top; each sub-layer is followed by an Add & Norm row
  const column = (cx, rows, side) => {
    rows.forEach(([kind, label], i) => {
      const y = yOf(i);
      if (kind === 'io') { s.text(cx, y + 6, label, { size: 19, weight: 700 }); return; }
      const k = kinds[kind];
      s.rect(cx - BW / 2, y - BH / 2, BW, BH, { color: k.color, fill: k.fill, fillStyle: 'solid' });
      s.text(cx, y + 6, label, { size: 18 });
      if (kind === 'norm') { // residual bypass from the sub-layer input two rows below
        const xL = side === 'left' ? cx - BW / 2 - 26 : cx + BW / 2 + 26;
        const xB = side === 'left' ? cx - BW / 2 : cx + BW / 2;
        s.line(xL, yOf(i - 2), xL, y, { color: C.muted });
        s.arrow(xL, y, xB + (side === 'left' ? -2 : 2), y, { color: C.muted });
      }
    });
  };
  const enc = [['io', 'input x'], ['self', 'Self-attention'], ['norm', 'Add & Norm'], ['ffn', 'Feed-forward'], ['norm', 'Add & Norm'], ['io', 'output']];
  const dec = [['io', 'target y'], ['self', 'Masked self-attention'], ['norm', 'Add & Norm'], ['cross', 'Cross-attention'], ['norm', 'Add & Norm'], ['ffn', 'Feed-forward'], ['norm', 'Add & Norm'], ['io', 'output']];
  s.text(180, 74, 'Encoder block', { size: 22, weight: 700 });
  s.text(700, 74, 'Decoder block', { size: 22, weight: 700 });
  column(180, enc, 'left');
  column(700, dec, 'right');
  // encoder output (memory) feeds the decoder's cross-attention row (index 3)
  s.curveArrow(260, yOf(5), 440, yOf(5) + 30, 600, yOf(3), { color: C.rose });
  s.text(440, yOf(3) + 40, 'memory: keys and values', { size: 17, color: C.rose });
  s.text(440, yOf(3) + 62, 'queries come from the decoder', { size: 17, color: C.rose });
  save('26.1-two-blocks.svg', s);
}

// ---------------------------------------------------------------- 26.1-causal-weights.svg
{
  const s = new Sketch(880, 512, { title: 'Causal mask: 4 by 4 attention weights of head 0 in the decoder self-attention, blocked cells are zero', seed: 2602 });
  s.text(440, 34, 'Causal mask: head 0 weights in the decoder self-attention', { size: 26, weight: 700 });
  const x0 = 300, y0 = 110, cell = 84;
  s.text(x0 + 2 * cell, 90, 'key j (position read)', { size: 18, color: C.muted });
  s.text(x0 - 18, y0 - 10, 'query i', { size: 18, color: C.muted, anchor: 'end' });
  for (let j = 0; j < 4; j++) s.text(x0 + j * cell + cell / 2, y0 + 16, String(j), { size: 18, color: C.muted });
  for (let i = 0; i < 4; i++) {
    s.text(x0 - 22, y0 + i * cell + cell / 2 + 22, String(i), { size: 18, color: C.muted, anchor: 'end' });
    for (let j = 0; j < 4; j++) {
      const x = x0 + j * cell + 2, y = y0 + 26 + i * cell + 2, w = cell - 4;
      if (j > i) {
        s.rect(x, y, w, w, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
        s.text(x + w / 2, y + w / 2 + 6, 'blocked', { size: 16, color: C.ink });
      } else {
        s.rect(x, y, w, w, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
        s.text(x + w / 2, y + w / 2 + 6, f3(DATA.causal_w[i][j]), { size: 19, font: 'mono' });
      }
    }
  }
  s.text(440, 496, 'Each row sums to 1. Blocked cells get exactly 0, so position i reads only positions 0 to i.', { size: 17, color: C.muted });
  save('26.1-causal-weights.svg', s);
}

// ---------------------------------------------------------------- 26.1-leak-test.svg
{
  const s = new Sketch(880, 420, { title: 'Bar chart: how much each output position changes when one input token is changed, encoder versus decoder', seed: 2603 });
  s.text(440, 34, 'Which outputs move when one input token changes?', { size: 26, weight: 700 });
  const panel = (x0, title, vals, changed) => {
    s.text(x0 + 180, 84, title, { size: 20, weight: 700 });
    const base = 320, maxH = 170, vmax = Math.max(...vals), pitch = 70, bw = 44;
    s.line(x0, base, x0 + 360, base, { color: C.muted });
    vals.forEach((v, p) => {
      const x = x0 + 20 + p * pitch, h = (v / vmax) * maxH;
      if (v > 0) s.rect(x, base - h, bw, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(x + bw / 2, base - h - 10 + (v > 0 ? 0 : -6), v > 0 ? f3(v) : '0', { size: 17, font: 'mono' });
      s.text(x + bw / 2, base + 28, 'pos ' + p + (p === changed ? ' *' : ''), { size: 16, color: C.muted });
    });
  };
  panel(30, 'Encoder: change input token 4', DATA.enc_change, 4);
  panel(470, 'Decoder: change target token 3', DATA.dec_change, 3);
  s.text(440, 378, 'Encoder: every position moves (bidirectional). Decoder: positions before the change stay at exactly 0.', { size: 17, color: C.muted });
  s.text(440, 404, '* the changed token. Values are the largest absolute change; the weights are random, so only the pattern matters.', { size: 16, color: C.muted });
  save('26.1-leak-test.svg', s);
}

// ---------------------------------------------------------------- 26.1-param-split.svg
{
  const s = new Sketch(880, 300, { title: 'Parameter counts of one encoder block and one decoder block at d_model 512 and d_ff 2048, split into attention, feed-forward and norms', seed: 2604 });
  s.text(440, 34, 'Where the parameters sit in one block (d_model 512, d_ff 2048)', { size: 25, weight: 700 });
  const x0 = 180, W = 500, total = DATA.params_big.decoder;
  const k = W / total;
  const bar = (y, label, segs, tot) => {
    s.text(x0 - 16, y + 30, label, { size: 19, weight: 700, anchor: 'end' });
    let x = x0;
    segs.forEach(([name, n, color, fill]) => {
      const w = n * k;
      s.rect(x, y, w, 56, { color, fill, fillStyle: 'solid' });
      if (w > 120) s.text(x + w / 2, y + 34, name + ' ' + millions(n), { size: 17 });
      x += w;
    });
    s.text(x + 14, y + 34, 'total ' + millions(tot), { size: 18, font: 'mono', anchor: 'start' });
  };
  const A = DATA.params_big.attn, F = DATA.params_big.ffn, L = DATA.params_big.ln;
  bar(110, 'Encoder', [['attention', A, C.blue, C.blueSoft], ['feed-forward', F, C.green, C.greenSoft], ['norms', L * 2, C.amber, C.amberSoft]], DATA.params_big.encoder);
  bar(200, 'Decoder', [['self', A, C.blue, C.blueSoft], ['cross', A, C.rose, C.roseSoft], ['feed-forward', F, C.green, C.greenSoft], ['norms', L * 3, C.amber, C.amberSoft]], DATA.params_big.decoder);
  s.text(440, 290, 'Feed-forward is two-thirds of the encoder block (2,099,712 of 3,150,336). Norms are under 0.1 percent.', { size: 16, color: C.muted });
  save('26.1-param-split.svg', s);
}

// ---------------------------------------------------------------- 26.1-layernorm.svg
{
  const s = new Sketch(880, 270, { title: 'Four steps of layer normalization applied to the vector 1, 2, 3, 4', seed: 2605 });
  s.text(440, 34, 'Layer norm on one vector: centre, scale, done', { size: 26, weight: 700 });
  const fmt = (arr) => ['[' + arr.slice(0, 2).map((v) => v.toFixed(3)).join(', ') + ',', arr.slice(2).map((v) => v.toFixed(3)).join(', ') + ']'];
  const boxes = [
    ['input', ['x = [1, 2, 3, 4]', 'mean = ' + f1(DATA.ln_mean), 'var = ' + f3(DATA.ln_var)]],
    ['centre', ['subtract the mean', ...fmt(DATA.ln_centred)]],
    ['scale', ['divide by std', 'std = sqrt(var + 1e-5)', '= ' + f3(DATA.ln_std)]],
    ['output', ['gain 1, shift 0', ...fmt(DATA.ln_out)]],
  ];
  boxes.forEach(([name, lines], i) => {
    const x = 30 + i * 220, y = 74, w = 180, h = 150;
    s.rect(x, y, w, h, { color: i === 3 ? C.green : C.blue, fill: i === 3 ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x + w / 2, y + 26, name, { size: 18, weight: 700 });
    lines.forEach((ln, j) => s.text(x + w / 2, y + 60 + j * 26, ln, { size: 16 }));
    if (i < 3) s.arrow(x + w + 6, y + h / 2, x + 220 - 6, y + h / 2, { color: C.muted });
  });
  s.text(440, 256, 'The gain and shift are learned per dimension; here they are the identity so the arithmetic is visible.', { size: 16, color: C.muted });
  save('26.1-layernorm.svg', s);
}
