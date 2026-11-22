// Diagrams for lesson 3.5 (small int cache). Every number is copied from the run of scripts/diagrams/lessons/3.5_data.py (CPython 3.12.13).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-03-numbers-strings-booleans/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Which values are shared at run time: the number line from -10 to 299.
{
  const s = new Sketch(880, 260, { title: 'Number line from -10 to 299: values -5 to 256 are shared, the rest are new objects each time', seed: 501 });
  s.text(440, 34, 'Which values are shared at run time?', { size: 24, weight: 700 });
  const x = (v) => 60 + (v + 10) * (760 / 310); // -10 maps to x=60, 299 maps to x=820
  s.rect(x(-10), 110, x(-5) - x(-10), 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.rect(x(-5), 110, x(256 + 1) - x(-5), 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.rect(x(257), 110, x(300) - x(257), 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text((x(-5) + x(257)) / 2, 138, '262 values shared, -5 to 256', { size: 18, weight: 700 });
  s.text((x(-10) + x(-5)) / 2 - 2, 98, ['5 new'], { size: 16 });
  s.text((x(257) + x(300)) / 2 + 4, 98, ['43 new'], { size: 16 });
  for (const v of [-5, 100, 256, 299]) {
    const px = x(v) + (v === 299 ? -6 : 0);
    s.line(px, 154, px, 164, { color: C.muted });
    s.text(px, 186, String(v), { font: 'mono', size: 16, color: C.muted });
  }
  s.text(440, 230, 'int(str(v)) is int(str(v)) is True only inside the blue band. The rose values make a new object each call.', { size: 17, color: C.ink });
  save('3.5-number-line.svg', s);
}

// 2. Literal constants: one compile() call shares its constants, two compile() calls do not.
{
  const s = new Sketch(880, 330, { title: 'Two functions in one file share the constant 300; two separate compile calls do not', seed: 502 });
  s.text(440, 34, 'Where the constant 300 lives', { size: 24, weight: 700 });
  s.rect(40, 62, 390, 170, { color: C.muted, fillStyle: 'solid', fill: C.blueSoft, width: 1 });
  s.text(235, 90, 'one file, one compile()', { size: 18, weight: 700 });
  s.text(235, 122, ['def f(): return 300', 'def g(): return 300'], { font: 'mono', size: 16 });
  s.arrow(235, 150, 235, 196, { color: C.blue });
  s.rect(145, 198, 180, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(235, 226, '300 (one object)', { font: 'mono', size: 16 });
  s.text(235, 275, 'f() is g()  ->  True', { font: 'mono', size: 18, weight: 700 });

  s.rect(450, 62, 390, 170, { color: C.muted, fillStyle: 'solid', fill: C.amberSoft, width: 1 });
  s.text(645, 90, 'two compile() calls', { size: 18, weight: 700 });
  s.text(645, 122, ['same source text, compiled twice'], { font: 'mono', size: 16 });
  s.rect(470, 150, 150, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(545, 178, '300  (object 1)', { font: 'mono', size: 15 });
  s.rect(640, 150, 150, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(715, 178, '300  (object 2)', { font: 'mono', size: 15 });
  s.text(645, 275, 'k1() is k2()  ->  False', { font: 'mono', size: 18, weight: 700 });
  save('3.5-same-file.svg', s);
}

// 3. Memory: one million int objects, measured with tracemalloc (bytes; 12 px per MB).
{
  const s = new Sketch(880, 270, { title: 'Memory of a list of one million ints: cached values versus distinct values', seed: 503 });
  s.text(440, 34, 'A list of 1,000,000 ints', { size: 24, weight: 700 });
  const k = 12; // px per MB
  s.text(40, 118, ['256 distinct values,', 'all cached'], { size: 18, anchor: 'start' });
  s.rect(260, 96, 8.4487 * k, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(260 + 8.4487 * k + 12, 120, '8.4 MB', { size: 20, anchor: 'start', weight: 700 });
  s.text(40, 214, ['1,000,000 distinct values,', 'all new objects'], { size: 18, anchor: 'start' });
  s.rect(260, 192, 8.4487 * k, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.rect(260 + 8.4487 * k, 192, 28 * k, 36, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(260 + (8.4487 + 28) * k + 12, 216, '36.4 MB', { size: 20, anchor: 'start', weight: 700 });
  s.text(260 + 8.4487 * k + 14 * k, 252, '+28 MB = 1,000,000 x 28 bytes of int objects', { size: 17, color: C.ink });
  save('3.5-memory.svg', s);
}

// 4. Time for a + 1 with a result that is cached (256) and one that is not (1001). Medians, ns per operation.
{
  const s = new Sketch(880, 250, { title: 'Time per a + 1: 9.8 ns when the result is cached, 17.4 ns when it is new', seed: 504 });
  s.text(440, 34, 'Time per a + 1 (one machine)', { size: 24, weight: 700 });
  const k = 20; // px per ns
  s.text(40, 100, ['a = 255, result 256', '(cached)'], { size: 18, anchor: 'start' });
  s.rect(330, 80, 9.82 * k, 36, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(330 + 9.82 * k + 12, 104, '9.8 ns', { size: 20, anchor: 'start', weight: 700 });
  s.text(40, 176, ['a = 1000, result 1001', '(new object)'], { size: 18, anchor: 'start' });
  s.rect(330, 156, 17.38 * k, 36, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(330 + 17.38 * k + 12, 180, '17.4 ns', { size: 20, anchor: 'start', weight: 700 });
  s.text(440, 232, 'Absolute times depend on the machine. The ratio, about 1.8x, is the point.', { size: 17, color: C.muted });
  save('3.5-timing.svg', s);
}
