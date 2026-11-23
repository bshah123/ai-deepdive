// Diagrams for Lesson 16.5 (buffer protocol, memoryview). Run: node scripts/diagrams/lessons/16.5.mjs
// Numbers come from scripts/diagrams/lessons/16.5_experiment.py (output in 16.5_data.txt): E7 for the bars.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-02-scientific-python/chapter-16-pandas/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- 1. copy versus view
{
  const s = new Sketch(880, 360, { title: 'Two ways to take a slice of a 16 MiB buffer: a copy allocates 16 MiB, a view allocates a header', seed: 1651 });
  s.text(440, 34, 'Copy or view: what the same 16 MiB costs', { size: 24, weight: 700 });
  s.line(440, 70, 440, 330, { color: C.muted, width: 1.2, dash: '6 8' });

  s.text(230, 92, 'copy: bytes(src)', { size: 20, weight: 700, color: C.rose });
  s.rect(60, 110, 340, 50, { color: C.ink, width: 1.4 });
  s.text(230, 141, 'src: 16 MiB, owned by bytearray', { font: 'mono', size: 16 });
  s.arrow(230, 166, 230, 222, { color: C.muted, width: 1.6, head: 10 });
  s.rect(60, 230, 340, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', width: 1.4 });
  s.text(230, 261, 'new block: 16 MiB', { font: 'mono', size: 16 });
  s.text(230, 312, 'peak +16.00 MiB, retained 16.00 MiB', { size: 17, color: C.rose });

  s.text(650, 92, 'view: memoryview(src)', { size: 20, weight: 700, color: C.blue });
  s.rect(500, 110, 340, 50, { color: C.ink, width: 1.4 });
  s.text(670, 141, 'src: 16 MiB, owned by bytearray', { font: 'mono', size: 16 });
  s.rect(500, 230, 160, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
  s.text(580, 261, 'header', { font: 'mono', size: 16 });
  s.arrow(580, 228, 580, 166, { color: C.blue, width: 1.6, head: 10 });
  s.text(690, 262, 'points at the same bytes', { size: 17, color: C.blue, anchor: 'start' });
  s.text(650, 312, 'peak +0.00 MiB, retained 0.00 MiB', { size: 17, color: C.blue });
  save('16.5-copy-vs-view.svg', s);
}

// ---------------------------------------------------------------- 2. one buffer, four readers
{
  const s = new Sketch(880, 420, { title: 'One exported buffer: the exporter owns the bytes, the Py_buffer struct describes them, consumers read them in place', seed: 1652 });
  s.text(440, 34, 'One block of bytes, several readers', { size: 24, weight: 700 });

  s.rect(40, 80, 200, 110, { color: C.ink, width: 1.4 });
  s.text(140, 116, 'bytearray', { font: 'mono', size: 18, weight: 700 });
  s.text(140, 148, ['exporter: owns', 'the memory'], { size: 17, color: C.muted });

  s.rect(300, 60, 280, 250, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.4 });
  s.text(440, 90, 'Py_buffer (C struct)', { size: 19, weight: 700, color: C.amber });
  const fields = ['buf    -> start of bytes', 'obj    -> exporter (+1 ref)', 'len    = 8', 'itemsize = 1', "format = 'B'", 'ndim   = 1', 'shape  = (8,)', 'strides = (1,)', 'readonly = 0'];
  fields.forEach((f, i) => s.text(316, 124 + i * 21, f, { font: 'mono', size: 15, anchor: 'start' }));

  s.rect(640, 80, 200, 110, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
  s.text(740, 116, 'memoryview', { font: 'mono', size: 18, weight: 700 });
  s.text(740, 148, ['or np.frombuffer,', 'reads the same bytes'], { size: 17, color: C.muted });

  for (let i = 0; i < 8; i++) {
    s.rect(300 + i * 35, 350, 35, 40, { color: C.ink, width: 1.2 });
    s.text(317 + i * 35, 376, String(i), { font: 'mono', size: 16 });
  }
  s.text(440, 412, 'one block, 8 bytes, never copied', { size: 17, color: C.muted });

  s.arrow(140, 192, 296, 352, { color: C.muted, width: 1.6, head: 10 });
  s.arrow(440, 312, 440, 346, { color: C.amber, width: 1.6, head: 10 });
  s.arrow(740, 192, 586, 352, { color: C.muted, width: 1.6, head: 10 });
  save('16.5-one-buffer.svg', s);
}

// ---------------------------------------------------------------- 3. strided view
{
  const s = new Sketch(880, 350, { title: 'A stride-2 view of ten bytes: the view steps over every second byte, no copy', seed: 1653 });
  s.text(440, 34, 'Strided slice m[::2]: a view that skips bytes', { size: 24, weight: 700 });
  s.text(130, 120, 'source', { size: 17, color: C.muted, anchor: 'end' });
  s.text(130, 262, 'view', { size: 17, color: C.muted, anchor: 'end' });
  for (let i = 0; i < 10; i++) {
    const even = i % 2 === 0;
    s.rect(140 + 60 * i, 90, 60, 50, { color: even ? C.blue : C.ink, fill: even ? C.blueSoft : undefined, fillStyle: 'solid', width: 1.4 });
    s.text(170 + 60 * i, 122, String(i), { font: 'mono', size: 18, color: even ? C.blue : C.muted });
  }
  for (let j = 0; j < 5; j++) {
    const cx = 170 + 120 * j;
    s.arrow(cx, 146, cx, 226, { color: C.blue, width: 1.6, head: 10 });
    s.rect(cx - 30, 230, 60, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
    s.text(cx, 262, String(2 * j), { font: 'mono', size: 18 });
  }
  s.text(440, 312, 'shape (5,), strides (2,), c_contiguous False: each step jumps 2 bytes', { size: 17, color: C.muted });
  save('16.5-strided.svg', s);
}

// ---------------------------------------------------------------- 4. measured peak allocation
{
  const rows = [
    ['memoryview(src)', 0.0, 'view'],
    ['memoryview(src)[1024:]', 0.0, 'view'],
    ['np.frombuffer(src, uint8)', 0.0, 'view'],
    ['bytes(src)', 16.0, 'copy'],
    ['src[:]', 16.0, 'copy'],
    ['np.array(memoryview(src))', 16.0, 'copy'],
  ];
  const s = new Sketch(880, 470, { title: 'Peak traced allocation for six operations on a 16 MiB source, measured with tracemalloc', seed: 1654 });
  s.text(440, 34, 'Peak allocation per operation (16 MiB source)', { size: 24, weight: 700 });
  s.text(440, 66, 'measured with tracemalloc, CPython 3.12, one run', { size: 17, color: C.muted });
  const x0 = 360, scale = 400 / 16;
  rows.forEach(([label, mib, kind], i) => {
    const y = 120 + i * 60;
    const color = kind === 'copy' ? C.rose : C.blue;
    const fill = kind === 'copy' ? C.roseSoft : C.blueSoft;
    s.text(340, y + 6, label, { font: 'mono', size: 16, anchor: 'end' });
    const w = Math.max(mib * scale, 3);
    s.rect(x0, y - 16, w, 32, { color, fill, fillStyle: 'solid', width: 1.4 });
    s.text(x0 + w + 12, y + 6, `${mib.toFixed(2)} MiB`, { font: 'mono', size: 16, anchor: 'start', color });
  });
  s.rect(60, 448, 22, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', width: 1.4 });
  s.text(92, 462, 'copy: new bytes', { size: 17, anchor: 'start' });
  s.rect(300, 448, 22, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
  s.text(332, 462, 'view: no new data', { size: 17, anchor: 'start' });
  save('16.5-allocation.svg', s);
}
