// Diagrams for 28.1 (Chinchilla scaling laws & compute budgets).
// Run: node scripts/diagrams/lessons/28.1.mjs
// Every number comes from scripts/diagrams/lessons/28.1_data.py (writes 28.1_data.json, read below).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-28-llm-training/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '28.1_data.json'), 'utf8'));

const sci = (x) => x.toExponential(2).replace('e+', 'e');
const bn = (x) => `${(x / 1e9).toFixed(1)}B`;

// ---------------------------------------------------------------- 28.1-budget.svg
{
  const s = new Sketch(880, 270, { title: 'Compute equals six times parameters times tokens, with worked numbers for Gopher and Chinchilla', seed: 2811 });
  s.text(440, 34, 'Training compute: C ≈ 6 × N × D', { size: 26, weight: 700 });
  const box = (x, w, head, body, col, soft) => {
    s.rect(x, 62, w, 80, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + w / 2, 92, head, { size: 19, weight: 700, color: col });
    s.text(x + w / 2, 124, body, { font: 'mono', size: 14 });
  };
  box(40, 220, 'N: parameters', 'weights in the model', C.blue, C.blueSoft);
  s.text(288, 107, '×', { size: 30, weight: 700 });
  box(310, 220, 'D: tokens', 'training text, seen once', C.green, C.greenSoft);
  s.text(560, 107, '× 6', { size: 26, weight: 700 });
  box(610, 230, 'C: FLOPs', 'floating-point ops', C.amber, C.amberSoft);
  s.text(440, 186, '6 = 2 for the forward pass + 4 for the backward pass, per parameter per token', { size: 18, color: C.muted });
  s.note(40, 206, 380, 52, [`Chinchilla: 70B × 1.4T × 6 = ${sci(D.Chinchilla.C)}`], { size: 18 });
  s.note(460, 206, 380, 52, [`Gopher: 280B × 300B × 6 = ${sci(D.Gopher.C)}`], { size: 18 });
  save('28.1-budget.svg', s);
}

// ---------------------------------------------------------------- 28.1-isoflop.svg
{
  const s = new Sketch(880, 380, { title: 'Loss against model size at a fixed compute budget: each curve has a valley, at 1.8B parameters for 1e21 FLOPs and 14.6B for 1e23 FLOPs', seed: 2812 });
  s.text(440, 34, 'Fixed budget, varying model size: a valley in the loss', { size: 26, weight: 700 });
  const X0 = 110, X1 = 820, Y0 = 80, Y1 = 310; // plot box
  const lx = (n) => X0 + ((Math.log10(n) - 8) / 3) * (X1 - X0); // N from 1e8 to 1e11
  const ly = (L) => Y1 - ((L - 1.9) / 1.1) * (Y1 - Y0);        // loss from 1.9 to 3.0
  s.line(X0, Y1, X1, Y1, { color: C.muted });
  s.line(X0, Y0, X0, Y1, { color: C.muted });
  for (const e of [8, 9, 10, 11]) {
    s.line(lx(10 ** e), Y1, lx(10 ** e), Y1 + 6, { color: C.muted });
    s.text(lx(10 ** e), Y1 + 28, `1e${e}`, { font: 'mono', size: 16, color: C.muted });
  }
  for (const L of [2.0, 2.5, 3.0]) {
    s.text(X0 - 14, ly(L) + 6, L.toFixed(1), { font: 'mono', size: 16, color: C.muted, anchor: 'end' });
  }
  s.text((X0 + X1) / 2, Y1 + 56, 'parameters N (log scale)', { size: 19 });
  s.text(40, 200, 'loss', { size: 19, rotate: -90 });
  const curve = (Cb, col) => {
    const pts = [];
    for (let k = 0; k <= 80; k++) {
      const N = 10 ** (8 + (3 * k) / 80);
      const Dt = Cb / (6 * N);
      const L = D.consts.E + D.consts.A / N ** D.consts.alpha + D.consts.B / Dt ** D.consts.beta;
      pts.push([lx(N), ly(L)]);
    }
    for (let k = 1; k < pts.length; k++) s.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], { color: col, width: 2.6 });
    return pts;
  };
  const curve21 = curve(1e21, C.blue);
  const curve23 = curve(1e23, C.amber);
  const mark = (Cb, Nopt, col, label, lx0, ly0) => {
    const L = D.consts.E + D.consts.A / Nopt ** D.consts.alpha + D.consts.B / (Cb / (6 * Nopt)) ** D.consts.beta;
    s.circle(lx(Nopt), ly(L), 16, { color: col, fill: col, fillStyle: 'solid' });
    s.text(lx0, ly0, label, { size: 18, color: col, weight: 700 });
  };
  mark(1e21, D.iso.closed_N, C.blue, `1e21 FLOPs: best N ≈ ${bn(D.iso.closed_N)}`, 200, 110);
  mark(1e23, 1.46e10, C.amber, `1e23 FLOPs: best N ≈ ${bn(1.46e10)}`, 560, 122);
  save('28.1-isoflop.svg', s);
}

// ---------------------------------------------------------------- 28.1-gopher-chinchilla.svg
{
  const g = D.Gopher, c = D.Chinchilla;
  const s = new Sketch(880, 290, { title: 'Gopher (280B parameters, 300B tokens) against Chinchilla (70B parameters, 1.4T tokens) at a similar compute budget', seed: 2813 });
  s.text(440, 34, 'Same budget, different split', { size: 26, weight: 700 });
  const SCALE_P = 260 / 280e9, SCALE_T = 260 / 1.4e12, X = 250;
  const row = (y, name, run, loss) => {
    s.text(40, y + 22, name, { size: 21, weight: 700 });
    s.rect(X, y, run.N * SCALE_P, 26, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(X + run.N * SCALE_P + 10, y + 19, `${(run.N / 1e9).toFixed(0)}B params`, { font: 'mono', size: 16, anchor: 'start' });
    s.rect(X, y + 36, run.D * SCALE_T, 26, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(X + run.D * SCALE_T + 10, y + 55, `${(run.D / 1e9).toFixed(0)}B tokens`, { font: 'mono', size: 16, anchor: 'start' });
    s.text(720, y + 40, `loss ${loss.toFixed(2)}`, { font: 'mono', size: 18, weight: 700 });
  };
  row(80, 'Gopher', g, g.loss);
  row(170, 'Chinchilla', c, c.loss);
  s.text(40, 262, `Compute ratio Chinchilla / Gopher = ${D.compute_ratio.toFixed(2)}. Loss is predicted by Eq. 10, not measured here.`, { size: 17, color: C.muted, anchor: 'start' });
  save('28.1-gopher-chinchilla.svg', s);
}

// ---------------------------------------------------------------- 28.1-frontier.svg
{
  const s = new Sketch(880, 380, { title: 'Log-log plot of optimal parameter count against compute: Kaplan slope 0.73 against Chinchilla slope 0.46, through the same point', seed: 2814 });
  s.text(440, 34, 'How the optimal model size grows with compute', { size: 26, weight: 700 });
  const X0 = 110, X1 = 820, Y0 = 80, Y1 = 310;
  const lx = (C_) => X0 + ((Math.log10(C_) - 20) / 6) * (X1 - X0); // FLOPs 1e20..1e26
  const ly = (N) => Y1 - ((Math.log10(N) - 8) / 5) * (Y1 - Y0);    // params 1e8..1e13
  s.line(X0, Y1, X1, Y1, { color: C.muted });
  s.line(X0, Y0, X0, Y1, { color: C.muted });
  for (const e of [20, 21, 22, 23, 24, 25, 26]) {
    s.line(lx(10 ** e), Y1, lx(10 ** e), Y1 + 6, { color: C.muted });
    s.text(lx(10 ** e), Y1 + 28, `1e${e}`, { font: 'mono', size: 15, color: C.muted });
  }
  for (const e of [8, 9, 10, 11, 12, 13]) {
    s.text(X0 - 12, ly(10 ** e) + 5, `1e${e}`, { font: 'mono', size: 15, color: C.muted, anchor: 'end' });
  }
  s.text((X0 + X1) / 2, Y1 + 58, 'training compute C, FLOPs (log)', { size: 19 });
  s.text(40, 200, 'parameters N', { size: 19, rotate: -90 });
  const anchorC = 5.76e23, anchorN = 67e9;
  const path = (slope, col, dash) => {
    const pts = [];
    for (let k = 0; k <= 60; k++) {
      const e = 20 + (6 * k) / 60;
      const N = anchorN * (10 ** e / anchorC) ** slope;
      pts.push([lx(10 ** e), ly(N)]);
    }
    for (let k = 1; k < pts.length; k++) s.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], { color: col, width: 2.6, dash });
  };
  path(0.73, C.rose, '10 8');
  path(0.46, C.blue, null);
  s.circle(lx(anchorC), ly(anchorN), 16, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
  s.text(lx(anchorC) - 14, ly(anchorN) - 22, 'Table 3: 67B at 5.76e23', { size: 17, color: C.ink, anchor: 'end' });
  s.text(lx(10 ** 20.2), ly(10 ** 12.9), 'Kaplan slope 0.73 (dashed)', { size: 18, color: C.rose, anchor: 'start' });
  s.text(lx(10 ** 23.6), ly(10 ** 9.2), 'Chinchilla slope 0.46 (Table 2)', { size: 18, color: C.blue, anchor: 'start' });
  save('28.1-frontier.svg', s);
}
