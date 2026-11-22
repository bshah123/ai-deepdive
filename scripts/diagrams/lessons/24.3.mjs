// Diagrams for Lesson 24.3 (RoPE). Run: node scripts/diagrams/lessons/24.3.mjs
// Numbers: the lesson's NumPy code (theta = 30 degrees hand example, d = 64 frequencies,
// adjacent vs half-split pairing scores). Values quoted below were printed by that code.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-04-transformers-llms/chapter-24-embeddings/diagrams');
mkdirSync(OUT, { recursive: true });
const nb = (t) => t.replace(/ /g, ' ');
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- 1. relative angle
// Three panels: query at position m rotated by m*theta, key at position n rotated by n*theta.
// The gap between the two arrows is (m-n)*theta. theta = 30 degrees. Score = cos(gap).
{
  const s = new Sketch(880, 330, { title: 'Rotating q and k: only the angle between them matters', seed: 2401 });
  s.text(440, 40, 'Same gap, same score', { size: 26, weight: 700 });
  const panels = [
    { cx: 160, m: 3, n: 0, qa: 90, ka: 0, score: '0.000' },
    { cx: 440, m: 5, n: 2, qa: 150, ka: 60, score: '0.000' },
    { cx: 720, m: 4, n: 3, qa: 120, ka: 90, score: '0.866' },
  ];
  const cy = 190, r = 95;
  for (const p of panels) {
    s.circle(p.cx, cy, 2 * r, { color: C.muted, width: 1, dash: '6 8' });
    s.line(p.cx - r - 10, cy, p.cx + r + 10, cy, { color: C.muted, width: 0.8 });
    s.line(p.cx, cy - r - 10, p.cx, cy + r + 10, { color: C.muted, width: 0.8 });
    const rad = (a) => (a * Math.PI) / 180;
    const qx = p.cx + r * Math.cos(rad(p.qa)), qy = cy - r * Math.sin(rad(p.qa));
    const kx = p.cx + r * Math.cos(rad(p.ka)), ky = cy - r * Math.sin(rad(p.ka));
    s.arrow(p.cx, cy, qx, qy, { color: C.blue, width: 2.6, head: 14 });
    s.arrow(p.cx, cy, kx, ky, { color: C.rose, width: 2.6, head: 14 });
    s.text(qx + (p.qa > 90 ? -18 : 18), qy - 12, `q @ ${p.m}`, { size: 20, color: C.blue, anchor: p.qa > 90 ? 'end' : 'start' });
    s.text(kx + 14, ky + 26, `k @ ${p.n}`, { size: 20, color: C.rose, anchor: 'start' });
    s.text(p.cx, 330 - 26, nb(`score ${p.score}`), { font: 'mono', size: 20, weight: 700 });
  }
  s.text(160, 66, nb('gap 90°'), { font: 'mono', size: 18, color: C.muted });
  s.text(440, 66, nb('gap 90°'), { font: 'mono', size: 18, color: C.muted });
  s.text(720, 66, nb('gap 30°'), { font: 'mono', size: 18, color: C.muted });
  save('24.3-relative-angle.svg', s);
}

// ---------------------------------------------------------------- 2. frequency spectrum
// d = 64, theta_i = 10000^(-2i/d), wavelength = 2*pi/theta_i positions (log scale).
{
  const d = 64;
  const pts = [];
  for (let i = 0; i < d / 2; i++) {
    const theta = Math.pow(10000, (-2 * i) / d);
    pts.push({ i, wl: (2 * Math.PI) / theta });
  }
  const s = new Sketch(880, 400, { title: 'Wavelength of each rotation pair, log scale, d = 64', seed: 2402 });
  s.text(440, 36, 'Each pair of dimensions turns at its own speed', { size: 25, weight: 700 });
  const x0 = 130, x1 = 830, y0 = 320, y1 = 80; // y0 = 1 position, y1 = 10^5 positions
  const yOf = (wl) => y0 - (Math.log10(wl) / 5) * (y0 - y1);
  const xOf = (i) => x0 + (i / 31) * (x1 - x0);
  for (const e of [0, 1, 2, 3, 4, 5]) {
    const y = yOf(Math.pow(10, e));
    s.line(x0, y, x1, y, { color: C.muted, width: 0.6 });
    s.text(x0 - 14, y + 7, `10${sup(e)}`, { size: 18, anchor: 'end', color: C.muted, font: 'mono' });
  }
  s.line(x0, y0, x1, y0, { color: C.ink, width: 1.4 });
  s.line(x0, y0, x0, y1, { color: C.ink, width: 1.4 });
  for (const i of [0, 8, 16, 24, 31]) s.text(xOf(i), y0 + 30, String(i), { size: 18, color: C.muted, font: 'mono' });
  s.text((x0 + x1) / 2, y0 + 62, 'pair index i (dimensions 2i and 2i+1)', { size: 20, color: C.muted });
  s.text(60, (y0 + y1) / 2, 'wavelength (positions)', { size: 20, color: C.muted, rotate: -90 });
  // reference line at 1000 positions
  s.line(x0, yOf(1000), x1, yOf(1000), { color: C.rose, width: 1.4, dash: '8 8' });
  s.text(x1 - 6, yOf(1000) - 10, '1,000 positions', { size: 18, anchor: 'end', color: C.rose });
  for (let k = 1; k < pts.length; k++) {
    s.line(xOf(pts[k - 1].i), yOf(pts[k - 1].wl), xOf(pts[k].i), yOf(pts[k].wl), { color: C.blue, width: 2 });
  }
  for (const p of pts) s.circle(xOf(p.i), yOf(p.wl), 7, { color: C.blue, fill: C.blue, fillStyle: 'solid', width: 1 });
  s.text(xOf(0) + 30, yOf(pts[0].wl) + 34, '6.3', { size: 20, anchor: 'start', font: 'mono', color: C.ink });
  s.text(xOf(31) - 10, yOf(pts[31].wl) - 14, '47,117', { size: 20, anchor: 'end', font: 'mono', color: C.ink });
  save('24.3-frequencies.svg', s);
}

function sup(e) {
  return ['⁰', '¹', '²', '³', '⁴', '⁵'][e];
}

// ---------------------------------------------------------------- 3. where RoPE sits
{
  const s = new Sketch(880, 360, { title: 'RoPE is applied to Q and K after the projections, not to V', seed: 2403 });
  s.text(440, 34, 'Where RoPE sits inside attention', { size: 26, weight: 700 });
  const box = (x, y, w, h, label, color, soft, font = 'hand') => {
    s.rect(x, y, w, h, { color, fill: soft, fillStyle: 'solid', width: 1.6 });
    s.text(x + w / 2, y + h / 2 + 7, label, { size: 21, font, color: C.ink });
  };
  // row 1: Q path
  box(30, 80, 90, 44, 'X', C.ink, '#ffffff00');
  box(160, 80, 120, 44, 'W_Q', C.muted, C.blueSoft, 'mono');
  box(320, 80, 90, 44, 'Q', C.blue, C.blueSoft, 'mono');
  box(450, 80, 130, 44, 'RoPE(m)', C.rose, C.roseSoft, 'mono');
  box(620, 80, 110, 44, 'Q_rot', C.rose, C.roseSoft, 'mono');
  // row 2: K path
  box(160, 160, 120, 44, 'W_K', C.muted, C.blueSoft, 'mono');
  box(320, 160, 90, 44, 'K', C.blue, C.blueSoft, 'mono');
  box(450, 160, 130, 44, 'RoPE(n)', C.rose, C.roseSoft, 'mono');
  box(620, 160, 110, 44, 'K_rot', C.rose, C.roseSoft, 'mono');
  // row 3: V path, no rotation
  box(160, 260, 120, 44, 'W_V', C.muted, C.blueSoft, 'mono');
  box(320, 260, 90, 44, 'V', C.blue, C.blueSoft, 'mono');
  s.text(495, 272, 'no rotation', { size: 18, color: C.muted });
  // X fan-out
  s.arrow(120, 102, 160, 102, { color: C.muted });
  s.arrow(120, 110, 160, 182, { color: C.muted });
  s.arrow(120, 120, 160, 282, { color: C.muted });
  s.arrow(280, 102, 320, 102, { color: C.muted });
  s.arrow(280, 182, 320, 182, { color: C.muted });
  s.arrow(280, 282, 320, 282, { color: C.muted });
  s.arrow(410, 102, 450, 102, { color: C.muted });
  s.arrow(410, 182, 450, 182, { color: C.muted });
  s.arrow(580, 102, 620, 102, { color: C.muted });
  s.arrow(580, 182, 620, 182, { color: C.muted });
  // scores and output
  s.rect(560, 232, 300, 72, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.6 });
  s.text(710, 262, nb('softmax(Q_rot K_rotᵀ / √d_k)'), { font: 'mono', size: 17 });
  s.text(710, 290, 'then × V', { size: 20 });
  s.arrow(728, 102, 760, 232, { color: C.muted });
  s.arrow(728, 182, 740, 232, { color: C.muted });
  s.arrow(410, 282, 560, 282, { color: C.muted, dash: '6 6' });
  s.text(40, 330, 'Rotation angles depend only on the token position, never on the content of the vector.', { size: 20, anchor: 'start', color: C.muted });
  save('24.3-rope-in-attention.svg', s);
}

// ---------------------------------------------------------------- 4. two pairings
// Same 8 cells, two groupings. Scores printed by the lesson code: adjacent -1.30211533;
// half-split applied to permuted q, k -1.30211533 (identical); half-split applied to raw q, k -2.690428.
{
  const s = new Sketch(880, 380, { title: 'Two pairings of the same 8 dimensions', seed: 2404 });
  s.text(440, 34, 'Two ways to choose which dimensions form a pair', { size: 25, weight: 700 });
  const cell = 70, x0 = 130;
  const row = (y, label, pairs, colorOf) => {
    s.text(40, y - 12, label, { size: 21, anchor: 'start', color: C.muted, weight: 700 });
    for (let d = 0; d < 8; d++) {
      s.rect(x0 + d * cell, y, cell, 48, { color: C.ink, width: 1.2, fill: colorOf(d), fillStyle: 'solid' });
      s.text(x0 + d * cell + cell / 2, y + 32, String(d), { size: 20, font: 'mono' });
    }
    for (const [a, b, i] of pairs) {
      const xa = x0 + a * cell + cell / 2, xb = x0 + b * cell + cell / 2;
      s.curveArrow(xa, y + 60, (xa + xb) / 2, y + 96, xb, y + 60, { color: C.blue, width: 1.8, head: 9 });
      s.text((xa + xb) / 2, y + 114, `θ${sub(i)}`, { size: 18, font: 'mono', color: C.blue });
    }
  };
  const adj = [[0, 1, 0], [2, 3, 1], [4, 5, 2], [6, 7, 3]];
  const half = [[0, 4, 0], [1, 5, 1], [2, 6, 2], [3, 7, 3]];
  row(64, 'adjacent', adj, () => C.blueSoft);
  row(220, 'half-split', half, () => C.amberSoft);
  s.text(440, 364, nb('apply the same convention to q and k: same score'), { size: 20, color: C.muted });
  save('24.3-two-pairings.svg', s);
}

function sub(i) {
  return ['₀', '₁', '₂', '₃'][i];
}
