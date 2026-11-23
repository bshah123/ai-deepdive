import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-19-ml-foundations/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below is read from the experiment output (scripts/diagrams/lessons/19.5_data.json).
const D = JSON.parse(readFileSync(join(HERE, '19.5_data.json'), 'utf8'));

// ---------- 1. The PAC guarantee as a pipeline ----------
{
  const s = new Sketch(880, 260, { title: 'PAC guarantee: an unknown distribution produces n samples, ERM picks a hypothesis, and with probability at least 1 minus delta its error is at most epsilon', seed: 191 });
  s.text(440, 40, 'Where the randomness lives', { size: 26, weight: 700 });
  s.rect(40, 90, 190, 80, { color: C.muted, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(135, 124, ['unknown distribution', 'D over inputs'], { size: 19 });
  s.arrow(232, 130, 292, 130, { color: C.ink });
  s.text(262, 116, 'n draws', { size: 17, color: C.muted });
  s.rect(292, 90, 190, 80, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(387, 124, ['training set S', 'i.i.d. from D'], { size: 19 });
  s.arrow(484, 130, 544, 130, { color: C.ink });
  s.text(514, 116, 'ERM', { size: 17, color: C.muted });
  s.rect(544, 90, 190, 80, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(639, 124, ['output h', 'fewest errors on S'], { size: 19 });
  s.note(120, 196, 640, 44, ['P( true error of h at most epsilon ) is at least 1 minus delta'], { size: 19 });
  save('19.5-pac-pipeline.svg', s);
}

// ---------- 2. Shattering: 3 points versus 4 XOR points ----------
{
  const s = new Sketch(880, 400, { title: 'Left: three points, one line realizes one labeling. Right: four XOR points, the diagonal labeling cannot be split by any line.', seed: 192 });
  const P = (x0, y0, S) => (u, v) => [x0 + u * S, y0 - v * S];
  const dot = (p, sign) => s.circle(p[0], p[1], 18, { color: sign > 0 ? C.blue : C.rose, fill: sign > 0 ? C.blue : C.rose, fillStyle: 'solid' });
  const lab = (p, sign, dx, dy) => s.text(p[0] + dx, p[1] + dy, sign > 0 ? '+1' : '-1', { size: 17, anchor: 'start', color: sign > 0 ? C.blue : C.rose });

  // Left panel: three points and a separating line for one labeling
  const L = P(110, 260, 150);
  const a = L(0, 1), b = L(1, 0), c = L(0, 0);
  s.text(180, 60, `3 points: ${D.lines_3pts.realized} of ${D.lines_3pts.total} labelings`, { size: 20, weight: 700 });
  s.line(...L(-0.25, 0.75), ...L(1.1, -0.6), { color: C.muted, dash: '6 8' });
  dot(a, 1); lab(a, 1, 14, 6);
  dot(b, 1); lab(b, 1, 14, 6);
  dot(c, -1); lab(c, -1, 14, 6);
  s.text(180, 370, 'a line separates this labeling', { size: 17, color: C.muted });

  // Right panel: the four XOR points, one failing labeling
  const R = P(520, 260, 150);
  const p00 = R(0, 0), p11 = R(1, 1), p01 = R(0, 1), p10 = R(1, 0);
  s.text(580, 60, `4 XOR points: ${D.lines_4xor.realized} of ${D.lines_4xor.total} labelings`, { size: 20, weight: 700 });
  dot(p00, 1); lab(p00, 1, 14, 6);
  dot(p11, 1); lab(p11, 1, 14, 6);
  dot(p01, -1); lab(p01, -1, 14, 6);
  dot(p10, -1); lab(p10, -1, 14, 6);
  s.text(580, 370, 'no line splits the + diagonal from the - diagonal', { size: 17, color: C.muted });

  save('19.5-shatter.svg', s);
}

// ---------- 3. Finite classes: samples grow with log |H| ----------
{
  const s = new Sketch(880, 420, { title: 'Bar chart of required sample sizes for hypothesis classes of size 2 to the 10, 2 to the 20, 2 to the 40 and 2 to the 64, at epsilon 0.05 and delta 0.01', seed: 193 });
  s.text(440, 40, 'Samples needed for epsilon = 0.05, delta = 0.01', { size: 24, weight: 700 });
  const base = 330, scale = 230 / 9932;
  const bars = D.finite_class_eps005_delta001;
  bars.forEach((row, i) => {
    const x = 120 + i * 180, h = row.n * scale;
    s.rect(x, base - h, 110, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 55, base - h - 12, String(row.n), { size: 20, weight: 700 });
    s.text(x + 55, base + 30, `|H| = 2^${row.log2_H}`, { size: 18, font: 'mono' });
  });
  s.line(90, base, 800, base, { color: C.ink, width: 1.5 });
  s.text(440, 395, 'each extra bit of log2 |H| adds about 139 samples (ln 2 / (2 epsilon^2))', { size: 17, color: C.muted });
  save('19.5-finite-bars.svg', s);
}

// ---------- 4. Sauer-Shelah: 2^n versus the polynomial growth, d = 4 ----------
{
  const s = new Sketch(880, 420, { title: 'Grouped bars for n from 1 to 10: 2 to the n labelings versus the Sauer-Shelah sum for VC dimension 4. The two curves split at n = 5.', seed: 194 });
  s.text(440, 40, 'Labelings of n points by rectangles (VC dimension 4)', { size: 24, weight: 700 });
  const base = 330, scale = 250 / 1024;
  // legend
  s.rect(170, 62, 22, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(200, 76, '2^n (no limit)', { size: 17, anchor: 'start' });
  s.rect(400, 62, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(430, 76, 'Sauer-Shelah sum', { size: 17, anchor: 'start' });
  s.circle(640, 70, 9, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
  s.text(660, 76, 'max over random sets', { size: 17, anchor: 'start' });
  for (let n = 1; n <= 10; n++) {
    const row = D.sauer_d4[String(n)];
    const x = 80 + (n - 1) * 80;
    const h1 = row.two_pow_n * scale, h2 = row.sauer_sum * scale;
    s.rect(x, base - h1, 30, h1, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.rect(x + 34, base - h2, 30, h2, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    if (n <= 8) {
      const m = D.rect_growth_random_lower[String(n)];
      s.circle(x + 34 + 15, base - m * scale, 9, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
    }
    s.text(x + 32, base + 26, `n=${n}`, { size: 16 });
  }
  s.line(70, base, 830, base, { color: C.ink, width: 1.5 });
  s.text(440, 395, `at n = 10: ${D.sauer_d4['10'].two_pow_n} versus ${D.sauer_d4['10'].sauer_sum} labelings`, { size: 18, color: C.muted });
  save('19.5-growth.svg', s);
}
