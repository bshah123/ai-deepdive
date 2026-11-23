// Diagrams for Lesson 39.3 (late interaction, ColBERT). Run: node scripts/diagrams/lessons/39.3.mjs
// Every number comes from scripts/diagrams/lessons/39.3_data.json, written by 39.3_experiment.py.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-39-reranking/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '39.3_data.json'), 'utf8'));
const save = (name, s) => { writeFileSync(join(OUT, name), s.toString()); console.log('wrote', name); };
const f2 = (n) => n.toFixed(2);
const sci = (n) => n.toExponential(1).replace('e+', 'e');

// ---------------------------------------------------------------- 1. one vector vs one vector per token
{
  const c = D.cost;
  const s = new Sketch(880, 330, { title: 'A bi-encoder stores one 128-number vector per passage. ColBERT stores one 128-number vector per token.', seed: 3931 });
  s.text(440, 34, 'What each index stores for one passage', { size: 26, weight: 700 });

  // left: bi-encoder, one vector
  s.text(190, 80, 'Bi-encoder', { size: 22, weight: 700, color: C.blue });
  s.rect(140, 100, 100, 150, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(190, 180, ['1 vector', '128 numbers'], { size: 17 });
  s.text(190, 280, `${c.bytes_biencoder_fp32} bytes (fp32)`, { size: 17, font: 'mono' });

  // right: ColBERT, one vector per token
  s.text(600, 80, 'ColBERT', { size: 22, weight: 700, color: C.amber });
  s.grid(470, 100, 8, 12, 16, { color: C.amber, width: 1.4 });
  s.text(470 + 6 * 16, 100 + 4 * 16 + 4, '…', { size: 26, color: C.ink });
  s.text(600, 280, `${c.Ld} tokens × 128 numbers = ${c.bytes_doc_fp32.toLocaleString('en-US')} bytes (fp32)`, { size: 17, font: 'mono' });
  s.text(600, 306, `each row is one token's vector; the query has ${c.Lq} rows too`, { size: 17, color: C.muted });

  s.arrow(330, 175, 445, 175, { color: C.muted });
  save('39.3-one-vector-vs-tokens.svg', s);
}

// ---------------------------------------------------------------- 2. worked MaxSim matrix
{
  const W = D.worked;
  const s = new Sketch(880, 420, { title: 'A 3 by 4 matrix of dot products. The largest entry in each row is highlighted and the three are summed to 2.76.', seed: 3932 });
  s.text(440, 34, 'MaxSim, worked: best document token for each query token', { size: 25, weight: 700 });

  const x0 = 250, y0 = 96, cell = 84;
  const dlab = ['d1', 'd2', 'd3', 'd4'];
  const qlab = ['q1', 'q2', 'q3'];
  dlab.forEach((t, j) => s.text(x0 + j * cell + cell / 2, y0 - 14, t, { size: 20, font: 'mono', color: C.muted }));
  s.text(x0 + 4 * cell + 60, y0 - 14, 'row max', { size: 17, color: C.muted });
  for (let i = 0; i < 3; i++) {
    const y = y0 + i * cell;
    s.text(x0 - 36, y + cell / 2 + 6, qlab[i], { size: 20, font: 'mono', color: C.muted });
    for (let j = 0; j < 4; j++) {
      const best = W.argmax[i] === j;
      const x = x0 + j * cell;
      if (best) s.rect(x + 3, y + 3, cell - 6, cell - 6, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.6 });
      else s.rect(x + 3, y + 3, cell - 6, cell - 6, { color: C.muted, width: 1 });
      s.text(x + cell / 2, y + cell / 2 + 6, f2(W.S[i][j]), { size: 20, font: 'mono', color: best ? C.ink : C.muted, weight: best ? 700 : 400 });
    }
    s.text(x0 + 4 * cell + 80, y + cell / 2 + 6, f2(W.rowmax[i]), { size: 20, font: 'mono', weight: 700 });
  }
  const total = W.rowmax.map(f2).join(' + ');
  s.text(440, 396, `score = ${total} = ${W.score.toFixed(2)}`, { size: 22, font: 'mono', weight: 700 });
  save('39.3-maxsim-worked.svg', s);
}

// ---------------------------------------------------------------- 3. dilution chart
{
  const dil = D.dilution;
  const Ls = Object.keys(dil);
  const s = new Sketch(880, 420, { title: 'Bar chart: MaxSim stays at 1.00 for passage lengths 4 to 256 tokens, while mean-pooled vectors fall from 1.00 to 0.64.', seed: 3933 });
  s.text(440, 34, 'Which passage wins? Synthetic test, 400 trials per length', { size: 25, weight: 700 });
  const base = 330, top = 90, scale = base - top; // accuracy 1.0 -> top
  const yOf = (a) => base - a * scale;
  s.line(120, base, 690, base, { color: C.ink, width: 1.4 });
  s.line(120, yOf(0.5), 690, yOf(0.5), { color: C.muted, dash: '6 8', width: 1 });
  s.text(696, yOf(0.5) + 6, 'chance', { size: 16, anchor: 'start', color: C.muted });
  for (const a of [0, 0.5, 1]) s.text(104, yOf(a) + 6, a.toFixed(1), { size: 16, anchor: 'end', color: C.muted, font: 'mono' });
  Ls.forEach((L, k) => {
    const gx = 150 + k * 135;
    const mx = dil[L].maxsim, mp = dil[L].meanpool;
    s.rect(gx, yOf(mx), 56, mx * scale, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(gx + 66, yOf(mp), 56, mp * scale, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(gx + 28, yOf(mx) - 10, mx.toFixed(2), { size: 17, font: 'mono' });
    s.text(gx + 94, yOf(mp) - 10, mp.toFixed(2), { size: 17, font: 'mono' });
    s.text(gx + 61, base + 30, `L = ${L}`, { size: 19 });
  });
  s.rect(712, 96, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(738, 112, ['MaxSim', '(token level)'], { size: 17, anchor: 'start' });
  s.rect(712, 150, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(738, 166, ['mean-pooled', 'single vector'], { size: 17, anchor: 'start' });
  s.text(440, 396, 'L = tokens per passage. Synthetic concept vectors, not a real corpus.', { size: 17, color: C.muted });
  save('39.3-dilution.svg', s);
}

// ---------------------------------------------------------------- 4. cost per query, log scale
{
  const c = D.cost;
  const rows = [
    ['Cross-encoder, every doc', c.cross_all, C.rose, C.roseSoft],
    ['MaxSim, brute force', c.maxsim_all, C.amber, C.amberSoft],
    ['Bi-encoder, query + dots', c.bienc_all, C.blue, C.blueSoft],
  ];
  const s = new Sketch(880, 340, { title: 'Floating-point operations per query over one million documents, on a log scale: cross-encoder about 2.9e16, MaxSim about 8.2e11, bi-encoder about 7.3e9.', seed: 3934 });
  s.text(440, 34, `FLOPs per query, N = ${c.N.toLocaleString('en-US')} documents`, { size: 25, weight: 700 });
  const x0 = 330, x1 = 790, lo = 8, hi = 17;
  const xOf = (v) => x0 + ((Math.log10(v) - lo) / (hi - lo)) * (x1 - x0);
  for (let e = 9; e <= 17; e += 2) {
    s.line(xOf(10 ** e), 80, xOf(10 ** e), 270, { color: C.muted, width: 0.6, dash: '2 10' });
    s.text(xOf(10 ** e), 292, `1e${e}`, { size: 16, font: 'mono', color: C.muted });
  }
  rows.forEach(([label, v, col, soft], i) => {
    const y = 96 + i * 62;
    s.text(x0 - 16, y + 22, label, { size: 19, anchor: 'end' });
    s.rect(x0, y, xOf(v) - x0, 40, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(xOf(v) + 12, y + 26, sci(v), { size: 18, font: 'mono', anchor: 'start', weight: 700 });
  });
  s.text(440, 325, 'log scale: each gridline is 100 times the one before it', { size: 17, color: C.muted });
  save('39.3-cost-per-query.svg', s);
}
