// Diagrams for Lesson 3.1 (Integers & arbitrary precision). Run: node scripts/diagrams/lessons/3.1.mjs
// Numbers come from scripts/diagrams/lessons/3.1_data.py and from the lesson's own code blocks
// (CPython 3.12, 64-bit: refcount 8 bytes, type pointer 8, lv_tag 8, then 4-byte digits).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-03-numbers-strings-booleans/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- memory layout of two ints
{
  const s = new Sketch(880, 414, { title: 'Memory layout of the Python ints 10 to the 12 and 2 to the 100: refcount, type, lv_tag, then 30-bit digits', seed: 3101 });
  const W8 = 112; // pixels for 8 bytes
  const W4 = 56; // pixels for 4 bytes
  const X0 = 40;
  const row = (y, title, tag, tagNote, digits, total, formula) => {
    s.text(X0, y - 14, title, { size: 26, weight: 700, anchor: 'start' });
    let x = X0;
    const cell = (w, top, bottom, fill, color) => {
      s.rect(x, y, w, 52, { color, fill, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
      s.text(x + w / 2, y + 22, top, { font: 'mono', size: 14 });
      if (bottom) s.text(x + w / 2, y + 42, bottom, { size: 17, color: C.muted });
      x += w;
    };
    cell(W8, 'refcount', '8 bytes', C.blueSoft, C.blue);
    cell(W8, 'type', '8 bytes', C.blueSoft, C.blue);
    cell(W8, `lv_tag = ${tag}`, tagNote, C.amberSoft, C.amber);
    digits.forEach((d, i) => cell(String(d).length > 5 ? 96 : W4, String(d), `d${i}`, C.greenSoft, C.green));
    s.text(x + 14, y + 33, `${total} bytes`, { size: 22, anchor: 'start', color: C.muted });
    s.text(X0, y + 82, formula, { size: 21, anchor: 'start', color: C.ink });
  };
  row(62, '10**12', 16, '2 digits, sign 0', [346361856, 931], 32, ['d0 = 346,361,856,  d1 = 931', 'value = 931 · 2^30 + 346,361,856 = 1,000,000,000,000']);
  row(226, '2**100', 32, '4 digits, sign 0', [0, 0, 0, 1024], 40, ['d0 = d1 = d2 = 0,  d3 = 1024', 'value = 1024 · 2^90 = 2^10 · 2^90 = 2^100']);
  s.line(40, 350, 840, 350, { color: C.muted, width: 1, dash: '6 7' });
  s.text(440, 380, 'lv_tag = (number of digits) × 8 + sign code   (sign code: 0 positive, 1 zero, 2 negative)', { size: 21, color: C.amber });
  s.text(440, 404, 'digit i is worth d_i · 2^(30·i); digit 0 comes first in memory', { size: 19, color: C.muted });
  save('3.1-layout.svg', s);
}

// ---------------------------------------------------------------- size staircase vs int64
{
  const s = new Sketch(880, 400, { title: 'getsizeof of a Python int grows by 4 bytes per 30 bits; a C int64 stays at 8 bytes but wraps at 63 bits', seed: 3102 });
  const X0 = 100;
  const Y0 = 330;
  const px = 5.2; // pixels per bit
  const py = 6.2; // pixels per byte
  const bx = (b) => X0 + b * px;
  const by = (v) => Y0 - v * py;
  s.line(X0, Y0, X0 + 130 * px + 20, Y0, { color: C.ink });
  s.line(X0, Y0, X0, by(50), { color: C.ink });
  [0, 10, 20, 30, 40].forEach((v) => {
    s.line(X0 - 5, by(v), X0, by(v), { color: C.ink, width: 1 });
    s.text(X0 - 10, by(v) + 5, String(v), { font: 'mono', size: 13, anchor: 'end', color: C.muted });
  });
  [0, 30, 60, 90, 120].forEach((b) => {
    s.line(bx(b), Y0, bx(b), Y0 + 6, { color: C.ink, width: 1 });
    s.text(bx(b), Y0 + 24, String(b), { font: 'mono', size: 13, color: C.muted });
  });
  s.text(X0 + 65 * px, Y0 + 52, 'bit length of the number', { size: 20, color: C.muted });
  s.text(40, by(24), 'bytes', { size: 20, color: C.muted, rotate: -90 });
  // staircase: (from bit, bytes)
  const steps = [[0, 28], [31, 32], [61, 36], [91, 40], [121, 44]];
  steps.forEach(([b, v], i) => {
    const end = i + 1 < steps.length ? steps[i + 1][0] : 130;
    s.line(bx(b), by(v), bx(end), by(v), { color: C.blue, width: 2.6, roughness: 0.7 });
    if (i + 1 < steps.length) s.line(bx(end), by(v), bx(end), by(steps[i + 1][1]), { color: C.blue, width: 2.6, roughness: 0.7 });
    s.text(bx((b + end) / 2), by(v) - 10, `${v} B`, { font: 'mono', size: 14, color: C.blue });
  });
  s.text(bx(65), by(50), 'Python int: 24 bytes + 4 per digit (30 bits each)', { size: 22, color: C.blue });
  // int64 line
  s.line(bx(0), by(8), bx(63), by(8), { color: C.rose, width: 2.6, roughness: 0.7 });
  s.text(bx(31), by(8) + 22, 'C int64: always 8 B', { size: 20, color: C.rose });
  s.text(bx(63) + 8, by(8) - 4, '✗', { size: 26, color: C.rose, anchor: 'start' });
  s.text(bx(63) + 30, by(8) + 4, 'next value wraps to negative', { size: 18, color: C.rose, anchor: 'start' });
  s.text(bx(63) + 30, by(8) + 24, '(2^63 needs 64 bits)', { size: 18, color: C.rose, anchor: 'start' });
  save('3.1-size-steps.svg', s);
}

// ---------------------------------------------------------------- schoolbook multiplication
{
  const s = new Sketch(880, 420, { title: 'Schoolbook multiplication of two 3-digit numbers: 9 digit products, grouped by weight', seed: 3103 });
  const X0 = 150;
  const Y0 = 96;
  const cw = 100;
  const ch = 58;
  const fills = [C.blueSoft, C.greenSoft, C.amberSoft, C.roseSoft, C.blueSoft];
  const cols = ['b0', 'b1', 'b2'];
  cols.forEach((c, j) => s.text(X0 + j * cw + cw / 2, Y0 - 14, c, { font: 'mono', size: 17, color: C.muted }));
  for (let i = 0; i < 3; i++) {
    s.text(X0 - 14, Y0 + i * ch + 36, `a${i}`, { font: 'mono', size: 17, color: C.muted, anchor: 'end' });
    for (let j = 0; j < 3; j++) {
      const w = i + j;
      s.rect(X0 + j * cw, Y0 + i * ch, cw, ch, { color: C.ink, fill: fills[w], fillStyle: 'solid', width: 1.3, roughness: 0.8 });
      s.text(X0 + j * cw + cw / 2, Y0 + i * ch + 26, `a${i}·b${j}`, { font: 'mono', size: 16 });
      s.text(X0 + j * cw + cw / 2, Y0 + i * ch + 46, `× 2^${30 * w}`, { size: 17, color: C.muted });
    }
  }
  s.text(X0 + 150, 52, 'every cell is one 30-bit × 30-bit product', { size: 21, color: C.ink });
  // right: explanation
  s.note(520, 70, 330, 128, [
    'Cells with the same colour have the',
    'same weight 2^(30·(i+j)): add them,',
    'keep the low 30 bits as that output',
    'digit, carry the rest upward.',
  ], { size: 20, rotate: 1 });
  s.text(520, 236, 'digit products counted by the lesson code:', { size: 21, anchor: 'start', color: C.ink });
  [['3 × 3 digits', '9'], ['6 × 6 digits', '36'], ['30 × 30 digits', '900']].forEach(([a, b], k) => {
    s.text(540, 270 + k * 28, a, { font: 'mono', size: 15, anchor: 'start' });
    s.text(720, 270 + k * 28, `→ ${b} products`, { font: 'mono', size: 15, anchor: 'start', color: C.green });
  });
  s.text(440, 380, 'double the digits, quadruple the work. CPython switches to Karatsuba only when both numbers', { size: 20, color: C.muted });
  s.text(440, 402, 'have more than 70 digits (about 2100 bits, 633 decimal digits).', { size: 20, color: C.muted });
  save('3.1-schoolbook.svg', s);
}
