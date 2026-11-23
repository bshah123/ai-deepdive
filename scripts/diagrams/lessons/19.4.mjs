import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-19-ml-foundations/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '19.4_data.json'), 'utf8'));
const fmt = (v, d = 3) => Number(v).toFixed(d);

// ---- 1. intuition: histogram of sample means (one bar per integer count k)
{
  const h = D.hist;
  const tailMass = h.ks.reduce((acc, k, i) => acc + ((k <= 40 || k >= 60) ? h.counts[i] : 0), 0);
  if (Math.abs(tailMass / h.trials - h.emp_two) > 1e-9) throw new Error('tail mass mismatch');
  const s = new Sketch(880, 440, { title: 'Histogram of 50,000 sample means, n = 100 fair coin flips', seed: 401 });
  s.text(440, 34, 'Sample means of 100 fair coin flips pile up near 0.5', { size: 24, weight: 700 });
  const x0 = 80, cw = 760 / h.ks.length, base = 350, maxH = 250;
  const scale = maxH / Math.max(...h.counts);
  const xOf = (k) => x0 + (k - h.ks[0]) * cw;
  h.ks.forEach((k, i) => {
    const bh = h.counts[i] * scale;
    const tail = k <= 40 || k >= 60;
    s.rect(xOf(k) + 1, base - bh, cw - 2, Math.max(bh, 1), tail
      ? { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' }
      : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  });
  s.line(x0, base, x0 + 760, base, { color: C.muted });
  s.line(xOf(50) + cw / 2, 80, xOf(50) + cw / 2, base, { color: C.ink, dash: '6 8' });
  s.text(xOf(50) + cw / 2, 74, 'mean 0.5', { size: 16, font: 'mono' });
  [20, 40, 60, 80].forEach((k) => s.text(xOf(k) + cw / 2, base + 26, fmt(k / 100, 1), { size: 16, font: 'mono' }));
  s.text(440, base + 56, 'sample mean  X̄ = (number of heads) / 100', { size: 17 });
  s.note(590, 96, 260, 84, [
    `rose tails: |X̄ − 0.5| ≥ 0.1`,
    `measured: ${fmt(h.emp_two, 4)} (exact ${fmt(h.exact_two, 4)})`,
    `Chebyshev ${fmt(h.cheb, 2)}, Hoeffding ${fmt(h.hoeff, 3)}`,
  ], { size: 16 });
  save('19.4-tail-intuition.svg', s);
}

// ---- 2. worked example: four bounds vs exact tail on a log scale
{
  const e = D.example;
  const rows = [
    ['Markov', e.markov, C.amber, C.amberSoft, e.ratio_markov],
    ['Chebyshev', e.cheb, C.blue, C.blueSoft, e.ratio_cheb],
    ['Hoeffding (one-sided)', e.hoeff, C.violet, C.violet, e.ratio_hoeff],
    ['Exact binomial', e.exact, C.green, C.greenSoft, 1],
  ];
  const s = new Sketch(880, 430, { title: 'Four bounds on P(X ≥ 20) for X ~ Binomial(100, 0.1)', seed: 402 });
  s.text(440, 34, 'P(X ≥ 20), X ~ Binomial(100, 0.1): four answers', { size: 24, weight: 700 });
  const xL = 250, decades = 3, pxDec = 140;
  const xOf = (v) => xL + (Math.log10(v) + decades) * pxDec;
  [1e-3, 1e-2, 1e-1, 1].forEach((v) => {
    s.line(xOf(v), 372, xOf(v), 380, { color: C.muted });
    s.text(xOf(v), 404, v === 1 ? '1' : v.toExponential(0), { size: 16, font: 'mono' });
  });
  rows.forEach(([name, v, col, soft], i) => {
    const y = 110 + i * 72;
    s.text(xL - 16, y + 22, name, { size: 18, anchor: 'end' });
    s.rect(xL, y, xOf(v) - xL, 40, { color: col, fill: soft, fillStyle: 'solid' });
    const ratio = rows[i][4] === 1 ? 'exact' : `${fmt(rows[i][4], 0)}× exact`;
    s.text(xOf(v) + 10, y + 26, `${v < 0.01 ? v.toExponential(2) : fmt(v, 4)}  (${ratio})`, { size: 17, anchor: 'start', font: 'mono' });
  });
  s.text(xL + 240, 420, 'probability, log scale', { size: 16 });
  save('19.4-worked-bounds.svg', s);
}

// ---- 3. sweep: bounds versus n on a log scale
{
  const rows = D.sweep.rows.filter((r) => r.n <= 500);
  const x0 = 110, xW = 700, yTop = 100, yH = 300, lo = -12;
  const xOf = (n) => x0 + (n / 500) * xW;
  const yOf = (v) => yTop + yH - ((Math.log10(Math.max(v, 1e-14)) - lo) / (0 - lo)) * yH;
  const line = (key) => rows.map((r) => `${fmt(xOf(r.n), 1)},${fmt(yOf(r[key]), 1)}`).join(' ');
  const s = new Sketch(880, 480, { title: 'Hoeffding and Chebyshev bounds versus n, with the exact tail', seed: 403 });
  s.text(440, 34, 'Tail bound against n: p = 0.1, ε = 0.1, one-sided', { size: 24, weight: 700 });
  for (let e = 0; e >= -12; e -= 2) {
    const y = yOf(10 ** e);
    s.line(x0, y, x0 + xW, y, { color: C.muted, dash: '4 6' });
    s.text(x0 - 12, y + 6, `1e${e}`, { size: 15, font: 'mono', anchor: 'end' });
  }
  [0, 100, 200, 300, 400, 500].forEach((n) => s.text(xOf(n), yTop + yH + 28, String(n), { size: 16, font: 'mono' }));
  s.text(x0 + xW / 2, yTop + yH + 58, 'sample size n', { size: 17 });
  const cross = D.sweep.cross;
  s.line(xOf(cross), yTop, xOf(cross), yTop + yH, { color: C.ink, dash: '6 8' });
  s.raw(`<polyline points="${line('markov')}" fill="none" stroke="${C.amber}" stroke-width="3" stroke-dasharray="8 6"/>`);
  s.raw(`<polyline points="${line('cheb')}" fill="none" stroke="${C.blue}" stroke-width="3.5"/>`);
  s.raw(`<polyline points="${line('hoeff')}" fill="none" stroke="${C.violet}" stroke-width="3.5"/>`);
  s.raw(`<polyline points="${line('exact')}" fill="none" stroke="${C.green}" stroke-width="3.5"/>`);
  s.text(xOf(cross) + 8, 278, `n = ${cross}: Hoeffding drops below Chebyshev`, { size: 16, anchor: 'start' });
  s.text(150, 80, 'Markov: 0.5 (flat)', { size: 16, anchor: 'start', color: C.amber });
  s.text(290, 80, 'Chebyshev: 9/n', { size: 16, anchor: 'start', color: C.blue });
  s.text(400, 80, 'Hoeffding: e^(−0.02 n)', { size: 16, anchor: 'start', color: C.violet });
  s.text(560, 80, 'exact: e^(−0.044 n)', { size: 16, anchor: 'start', color: C.green });
  save('19.4-bound-sweep.svg', s);
}

// ---- 4. proof chain: each inequality needs something more and buys a faster decay
{
  const sz = D.sizes;
  const s = new Sketch(880, 340, { title: 'Four inequalities, what each needs and what it buys', seed: 404 });
  s.text(440, 34, 'Each step needs more, and buys a faster tail decay', { size: 24, weight: 700 });
  const boxes = [
    ['Markov', ['needs X ≥ 0 and E[X]', 'tail ≤ E[X] / a', 'no decay in n']],
    ['Chebyshev', ['Markov on (X − μ)²', 'needs variance σ²', 'tail ≤ σ² / (n ε²)']],
    ['Hoeffding', ['needs bounded range [a, b]', 'Chernoff + Hoeffding lemma', 'tail ≤ 2 e^(−2 n ε²)']],
    ['Union bound', ['needs finite class H', 'sum over all h in H', 'tail ≤ 2|H| e^(−2 n ε²)']],
  ];
  const bw = 178, gap = 44;
  boxes.forEach(([title, lines], i) => {
    const x = 20 + i * (bw + gap);
    const col = [C.amber, C.blue, C.violet, C.green][i];
    const soft = [C.amberSoft, C.blueSoft, C.violet, C.greenSoft][i];
    s.rect(x, 80, bw, 168, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + bw / 2, 112, title, { size: 22, weight: 700 });
    s.text(x + bw / 2, 150, lines, { size: 15 });
    if (i < 3) s.arrow(x + bw + 6, 164, x + bw + gap - 6, 164, { color: C.muted });
  });
  s.text(440, 284, `ERM check, |H| = ${sz.H}, ε = ${sz.eps}, δ = ${sz.delta}: n ≥ ${sz.union}`, { size: 19 });
  s.text(440, 314, `(Hoeffding alone, one fixed hypothesis: n ≥ ${sz.hoeff})`, { size: 16 });
  save('19.4-proof-chain.svg', s);
}

console.log('wrote 4 SVGs for 19.4');
