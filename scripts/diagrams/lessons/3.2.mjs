// Diagrams for lesson 3.2 (floats). Every number is copied from one run of scripts/diagrams/lessons/3.2_data.py.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-03-numbers-strings-booleans/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Bit layouts of four formats, drawn to scale: one cell per bit.
{
  const s = new Sketch(880, 430, { title: 'Bit layouts of float64, float32, float16 and bfloat16, drawn to scale', seed: 301 });
  s.text(440, 34, 'Four formats, one layout', { size: 26, weight: 700 });
  s.rect(180, 50, 14, 14, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(202, 64, 'sign', { size: 16, anchor: 'start' });
  s.rect(270, 50, 14, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(292, 64, 'exponent', { size: 16, anchor: 'start' });
  s.rect(390, 50, 14, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(412, 64, 'fraction (significand)', { size: 16, anchor: 'start' });
  const rows = [
    { name: 'float64', exp: 11, frac: 52, y: 96, cap: 'gap at 1.0 = 2.2e-16   largest = 1.8e308' },
    { name: 'float32', exp: 8, frac: 23, y: 180, cap: 'gap at 1.0 = 1.2e-7    largest = 3.4e38' },
    { name: 'float16', exp: 5, frac: 10, y: 264, cap: 'gap at 1.0 = 9.8e-4    largest = 65504' },
    { name: 'bfloat16', exp: 8, frac: 7, y: 348, cap: 'gap at 1.0 = 7.8e-3    largest = 3.4e38' },
  ];
  const cw = 10; // px per bit, so widths are to scale
  for (const r of rows) {
    s.text(40, r.y + 22, r.name, { size: 20, anchor: 'start', weight: 700 });
    let x = 180;
    const seg = (n, color, soft) => {
      for (let i = 0; i < n; i++) { s.rect(x, r.y, cw, 34, { color, fill: soft, fillStyle: 'solid', width: 1 }); x += cw; }
    };
    seg(1, C.rose, C.roseSoft);
    seg(r.exp, C.amber, C.amberSoft);
    seg(r.frac, C.blue, C.blueSoft);
    s.text(180, r.y + 62, r.cap, { size: 15, anchor: 'start', font: 'mono' });
  }
  save('3.2-bit-layouts.svg', s);
}

// 2. 0.1 + 0.2: the exact sum lies halfway between two floats; the tie goes to the even neighbour.
{
  const s = new Sketch(880, 300, { title: 'The exact sum of the stored 0.1 and 0.2 sits halfway between two floats', seed: 302 });
  s.text(440, 34, 'The exact sum lands halfway between two floats', { size: 24, weight: 700 });
  const y = 170, xl = 160, xm = 440, xr = 720;
  s.line(90, y, 790, y, { color: C.muted, width: 2 });
  for (const x of [xl, xm, xr]) s.line(x, y - 8, x, y + 8, { color: C.ink, width: 2 });
  s.text(xl, y - 60, 'float 0.3 (stored)', { size: 19 });
  s.text(xl, y - 36, '0.29999999999999998890', { font: 'mono', size: 15 });
  s.text(xm, y - 60, '0.1 + 0.2, exact', { size: 19 });
  s.text(xm, y - 36, '0.30000000000000001665', { font: 'mono', size: 15 });
  s.text(xr, y - 60, 'next float up', { size: 19 });
  s.text(xr, y - 36, '0.30000000000000004441', { font: 'mono', size: 15 });
  s.circle(xm, y, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.circle(xr, y, 22, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(xl, y + 44, 'last bit 1 (odd): loses', { size: 17 });
  s.text(xr, y + 44, 'last bit 0 (even): wins', { size: 17 });
  s.text(xm, y + 44, '2.8e-17 from each neighbour', { size: 17 });
  s.text(xm, y + 84, 'a tie rounds to the even neighbour', { size: 19, weight: 700 });
  save('3.2-tie.svg', s);
}

// 3. Absorption: 1.0 is far below half a gap near 1e20; it is exactly half a gap near 2^24 in float32.
{
  const s = new Sketch(880, 400, { title: 'Adding 1.0 is lost near 1e20 and is a tie near 2^24 in float32', seed: 303 });
  s.text(440, 34, 'Adding 1.0 can change nothing', { size: 26, weight: 700 });
  s.text(120, 84, 'float64 near 1e20: gap between neighbours = 16384', { size: 19, anchor: 'start' });
  const y1 = 150;
  s.line(100, y1, 780, y1, { color: C.muted, width: 2 });
  s.circle(120, y1, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.circle(760, y1, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.circle(440, y1, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(120, y1 - 26, '1e20', { font: 'mono', size: 16 });
  s.text(760, y1 - 26, '1e20 + 16384', { font: 'mono', size: 16 });
  s.text(440, y1 - 26, '1e20 + 8192', { font: 'mono', size: 16 });
  s.text(440, y1 + 34, 'the midpoint sits 8192 from each float', { size: 16 });
  s.text(440, y1 + 62, '1e20 + 1.0 rounds back to 1e20', { size: 19, weight: 700 });

  const y2 = 330;
  s.text(120, y2 - 80, 'float32 near 2^24: gap between neighbours = 2', { size: 19, anchor: 'start' });
  s.line(100, y2, 780, y2, { color: C.muted, width: 2 });
  s.circle(120, y2, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.circle(760, y2, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.circle(440, y2, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(120, y2 - 26, '2^24', { font: 'mono', size: 16 });
  s.text(760, y2 - 26, '2^24 + 2', { font: 'mono', size: 16 });
  s.text(440, y2 - 26, '2^24 + 1', { font: 'mono', size: 16 });
  s.text(440, y2 + 36, '2^24 + 1 is the exact midpoint: tie goes to 2^24 (even)', { size: 17 });
  s.text(440, y2 + 62, 'float32 2^24 + 1 == 2^24: True', { size: 19, weight: 700 });
  save('3.2-absorption.svg', s);
}

// 4. Error of summing 0.1 one million times, log scale, against the decimal target 100000.
//    Values from 3.2_data.py. fsum returns exactly 100000.0, so it has no bar.
{
  const s = new Sketch(880, 400, { title: 'Error after summing 0.1 one million times, log scale', seed: 304 });
  s.text(440, 34, 'Summing 0.1 one million times: error by method', { size: 24, weight: 700 });
  const x0 = 300, k = 35, base = -12;
  const X = (e) => x0 + (e - base) * k;
  const rows = [
    { name: 'float32, loop', val: 'error 958.34', err: 958.34375, c: C.rose, soft: C.roseSoft },
    { name: 'float32, np.sum', val: 'error 0.0078125', err: 0.0078125, c: C.amber, soft: C.amberSoft },
    { name: 'float64, loop', val: 'error 1.33e-6', err: 1.3328826753422618e-6, c: C.rose, soft: C.roseSoft },
    { name: 'float64, np.sum', val: 'error 2.9e-11', err: 2.9103830456733704e-11, c: C.green, soft: C.greenSoft },
    { name: 'math.fsum', val: 'error 0.0 (exact)', err: null, c: C.green, soft: C.greenSoft },
  ];
  rows.forEach((r, i) => {
    const y = 96 + i * 56;
    s.text(40, y, r.name, { size: 20, anchor: 'start', weight: 700 });
    s.text(40, y + 22, r.val, { font: 'mono', size: 15, anchor: 'start' });
    if (r.err !== null) {
      const L = X(Math.log10(r.err)) - x0;
      s.rect(x0, y - 16, L, 32, { color: r.c, fill: r.soft, fillStyle: 'solid' });
    } else {
      s.text(x0, y + 6, 'no bar: fsum rounds to the exact sum', { size: 17, anchor: 'start' });
    }
  });
  s.line(x0, 370, X(3), 370, { color: C.muted, width: 2 });
  for (const e of [-12, -9, -6, -3, 0, 3]) {
    s.line(X(e), 370, X(e), 378, { color: C.muted, width: 2 });
    s.text(X(e), 400, e === 0 ? '1' : `1e${e}`, { font: 'mono', size: 15 });
  }
  save('3.2-accumulation.svg', s);
}

// 5. Cancellation: sqrt(x+1) - sqrt(x) at x = 1e15. Both square roots are correct to half an ulp;
//    their difference keeps only the rounding noise.
{
  const s = new Sketch(880, 360, { title: 'Catastrophic cancellation in sqrt(x+1) - sqrt(x) at x = 1e15', seed: 305 });
  s.text(440, 34, 'Subtracting two nearly equal numbers', { size: 26, weight: 700 });
  s.text(110, 84, 'sqrt(1e15 + 1)  =  31622776.60168381', { font: 'mono', size: 22, anchor: 'start' });
  s.text(110, 118, 'sqrt(1e15)      =  31622776.60168379', { font: 'mono', size: 22, anchor: 'start' });
  s.text(110, 150, 'each root is off by up to half an ulp = 1.86e-9', { size: 17, anchor: 'start' });
  s.rect(110, 172, 660, 2, { color: C.ink, fill: C.ink, fillStyle: 'solid', width: 2 });
  s.text(110, 216, 'naive difference   1.862645e-08', { font: 'mono', size: 20, anchor: 'start', color: C.rose });
  s.text(560, 216, 'error 17.8%', { size: 19, anchor: 'start', color: C.rose });
  s.text(110, 254, 'true value         1.581139e-08', { font: 'mono', size: 20, anchor: 'start', color: C.green });
  s.text(560, 254, '1 / (sqrt(x+1) + sqrt(x))', { size: 19, anchor: 'start', color: C.green });
  s.text(110, 300, 'rewritten form: relative error 3.8e-18, about one bit', { size: 18, anchor: 'start' });
  save('3.2-cancellation.svg', s);
}
