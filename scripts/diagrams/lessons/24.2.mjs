import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers come from scripts run in the lesson's experiment (exp.py, d = 4, 64 and 512 as stated).
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-04-transformers-llms/chapter-24-embeddings/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Permutation: without position, "dog" gets the same output in both orders.
{
  const s = new Sketch(880, 340, { title: 'Attention without positions gives the same output for "dog" in both word orders', seed: 201 });
  s.text(440, 34, 'Attention alone cannot tell word order apart', { size: 26, weight: 700 });
  const words = (y, list, label) => {
    s.text(40, y + 26, label, { size: 19, anchor: 'start', color: C.muted });
    list.forEach((w, i) => {
      const hi = w === 'dog';
      s.rect(170 + i * 170, y, 130, 46, { color: hi ? C.amber : C.blue, fill: hi ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(235 + i * 170, y + 30, w, { font: 'mono', size: 18, color: C.ink });
    });
  };
  words(90, ['dog', 'bites', 'man'], 'order A');
  words(170, ['man', 'bites', 'dog'], 'order B');
  s.note(40, 240, 390, 74, ['no position: "dog" output', 'is identical in both orders'], { size: 19 });
  s.note(450, 240, 390, 74, ['with position encodings added:', '"dog" output differs by 0.147'], { size: 19 });
  save('24.2-permutation.svg', s);
}

// 2. Waves: each dimension pair is a sine wave with its own speed (d = 64).
{
  const s = new Sketch(880, 380, { title: 'Sine waves of positions 0 to 60 at four frequencies', seed: 202 });
  s.text(440, 34, 'Each dimension pair is a wave with its own speed', { size: 26, weight: 700 });
  const x0 = 110, x1 = 620, yTop = 90, yBot = 320; // value +1 at yTop, -1 at yBot
  const X = (p) => x0 + (p / 60) * (x1 - x0);
  const Y = (v) => (yTop + yBot) / 2 - v * (yBot - yTop) / 2;
  s.line(x0, Y(0), x1, Y(0), { color: C.muted, width: 1.5, dash: '6 8' });
  s.line(x0, yTop, x0, yBot, { color: C.muted, width: 1.5 });
  [0, 20, 40, 60].forEach((p) => s.text(X(p), yBot + 30, String(p), { size: 17, color: C.muted }));
  s.text((x0 + x1) / 2, yBot + 60, 'position p', { size: 18, color: C.muted });
  s.text(x0 - 14, Y(1) + 6, '+1', { size: 16, anchor: 'end', color: C.muted });
  s.text(x0 - 14, Y(-1) + 6, '-1', { size: 16, anchor: 'end', color: C.muted });
  const curves = [
    { w: 1, color: C.blue, label: 'omega = 1' },
    { w: 0.1, color: C.amber, label: 'omega = 0.1' },
    { w: 0.01, color: C.green, label: 'omega = 0.01' },
    { w: 0.000133, color: C.rose, label: 'omega = 0.00013' },
  ];
  curves.forEach((c) => {
    for (let p = 0; p < 60; p++) {
      s.line(X(p), Y(Math.sin(p * c.w)), X(p + 1), Y(Math.sin((p + 1) * c.w)), { color: c.color, width: 3 });
    }
  });
  curves.forEach((c, i) => {
    const ly = 110 + i * 46;
    s.line(660, ly, 700, ly, { color: c.color, width: 3 });
    s.text(712, ly + 6, c.label, { size: 16, anchor: 'start', color: C.ink, font: 'mono' });
  });
  s.text(660, 300, 'Plotted: sin(p x omega)', { size: 16, anchor: 'start', color: C.muted });
  save('24.2-pe-waves.svg', s);
}

// 3. Hand example: d = 4, positions 0 to 3.
{
  const s = new Sketch(880, 330, { title: 'Four-dimensional encodings for positions 0 to 3', seed: 203 });
  s.text(440, 34, 'Worked example: d = 4, positions 0 to 3', { size: 26, weight: 700 });
  const cols = ['dim 0 sin', 'dim 1 cos', 'dim 2 sin', 'dim 3 cos'];
  const rows = [
    ['0', '0.0000', '1.0000', '0.0000', '1.0000'],
    ['1', '0.8415', '0.5403', '0.0100', '1.0000'],
    ['2', '0.9093', '-0.4161', '0.0200', '0.9998'],
    ['3', '0.1411', '-0.9900', '0.0300', '0.9996'],
  ];
  const cw = 150, ch = 40, x0 = 180, y0 = 80;
  cols.forEach((c, j) => s.text(x0 + 75 + j * cw + (j === 0 ? 0 : 0) + (j * 0), y0 - 14, c, { size: 16, font: 'mono', color: C.muted }));
  // column headers are placed by hand below to keep them aligned with the cells
  rows.forEach((r, i) => {
    const y = y0 + i * ch;
    s.text(120, y + 27, 'pos ' + r[0], { size: 18, font: 'mono', color: C.ink });
    for (let j = 1; j <= 4; j++) {
      const hi = i === 1;
      s.rect(x0 + (j - 1) * cw, y, cw - 6, ch - 6, { color: hi ? C.amber : C.blue, fill: hi ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x0 + (j - 1) * cw + (cw - 6) / 2, y + 26, r[j], { size: 17, font: 'mono', color: C.ink });
    }
  });
  s.note(40, 258, 800, 58, ['dims 0-1 use omega = 1; dims 2-3 use omega = 0.01 (= 10000^(-2/4))'], { size: 19 });
  save('24.2-worked-d4.svg', s);
}

// 4. Rotation: a shift by k adds k x omega to the angle of each pair.
{
  const s = new Sketch(880, 370, { title: 'A shift by k rotates each sine-cosine pair', seed: 204 });
  s.text(440, 34, 'A shift is a rotation of each pair', { size: 26, weight: 700 });
  const cx = 220, cy = 180, R = 110;
  s.circle(cx, cy, 2 * R, { color: C.muted, width: 2 });
  s.line(cx, cy - R - 16, cx, cy + R + 16, { color: C.muted, width: 1.5, dash: '6 8' });
  s.line(cx - R - 16, cy, cx + R + 16, cy, { color: C.muted, width: 1.5, dash: '6 8' });
  const pt = (deg, r = R) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  // angle theta = p x omega, measured from the top, clockwise (pair = (sin theta, cos theta))
  const [px, py] = pt(60);
  const [qx, qy] = pt(100);
  let prev = pt(60, 0.55 * R);
  for (let d = 62; d <= 100; d += 2) {
    const cur = pt(d, 0.55 * R);
    s.line(prev[0], prev[1], cur[0], cur[1], { color: C.amber, width: 3 });
    prev = cur;
  }
  s.circle(px, py, 16, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  s.circle(qx, qy, 16, { color: C.green, fill: C.green, fillStyle: 'solid' });
  s.text(px - 34, py - 14, 'PE(p)', { size: 18, font: 'mono', anchor: 'end', color: C.ink });
  s.text(qx + 30, qy + 6, 'PE(p+k)', { size: 18, font: 'mono', anchor: 'start', color: C.ink });
  s.text(cx, cy + R + 52, 'angle = position x omega', { size: 17, color: C.muted });
  s.note(470, 100, 390, 170, [
    'PE(p) sits at angle p x omega (60 deg here).',
    'A shift by k adds k x omega (40 deg here).',
    'So PE(p+k) = Rot(k x omega) PE(p) for every p.',
    'The dot product then depends on k only.',
  ], { size: 18 });
  save('24.2-rotation.svg', s);
}

// 5. Similarity versus offset k, d = 64, normalised so S(0) = 1.
{
  const s = new Sketch(880, 380, { title: 'Dot product of position encodings against offset k', seed: 205 });
  s.text(440, 34, 'Similarity falls with offset, but not monotonically', { size: 26, weight: 700 });
  const d = 64, n = d / 2;
  const omega = (j) => Math.pow(10000, -(2 * j) / d);
  const S = (k) => {
    let t = 0;
    for (let j = 0; j < n; j++) t += Math.cos(k * omega(j));
    return t / n;
  };
  const x0 = 110, x1 = 820, yTop = 80, yBot = 320;
  const X = (k) => x0 + (k / 128) * (x1 - x0);
  const Y = (v) => yBot - v * (yBot - yTop);
  s.line(x0, yBot, x1, yBot, { color: C.muted, width: 1.5 });
  s.line(x0, yTop, x0, yBot, { color: C.muted, width: 1.5 });
  s.line(x0, Y(0.5), x1, Y(0.5), { color: C.muted, width: 1.5, dash: '6 8' });
  s.text(x0 - 14, Y(0.5) + 6, '0.5', { size: 16, anchor: 'end', color: C.muted });
  s.text(x0 - 14, Y(1) + 6, '1', { size: 16, anchor: 'end', color: C.muted });
  [0, 32, 64, 96, 128].forEach((k) => s.text(X(k), yBot + 30, String(k), { size: 17, color: C.muted }));
  s.text((x0 + x1) / 2, yBot + 62, 'offset k', { size: 18, color: C.muted });
  for (let k = 0; k < 128; k++) {
    s.line(X(k), Y(S(k)), X(k + 1), Y(S(k + 1)), { color: C.blue, width: 3 });
  }
  [[16, C.amber], [32, C.rose]].forEach(([k, c]) => s.circle(X(k), Y(S(k)), 14, { color: c, fill: c, fillStyle: 'solid' }));
  s.text(X(16), Y(S(16)) + 46, 'k=16: 0.605', { size: 17, font: 'mono', anchor: 'middle', color: C.amber });
  s.text(X(32) + 14, Y(S(32)) - 16, 'k=32: 0.611 (higher)', { size: 17, font: 'mono', anchor: 'start', color: C.rose });
  save('24.2-similarity.svg', s);
}
console.log('24.2 diagrams written');
