import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-05-information-retrieval/chapter-35-vector-search/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from ivfpq.py (main block, seed 0) and hand.py; see the lesson.

// 1. PQ split: 128 bytes become 8 bytes
{
  const s = new Sketch(880, 320, { title: 'A 32-dimensional float32 vector is split into 8 sub-vectors; each becomes one byte', seed: 101 });
  s.text(440, 34, 'One vector, 128 bytes in, 8 bytes out', { size: 26, weight: 700 });
  for (let i = 0; i < 8; i++) {
    const cx = 90 + i * 100;
    s.rect(cx - 45, 60, 90, 54, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, 84, `dims ${i * 4 + 1}-${i * 4 + 4}`, { font: 'mono', size: 15 });
    s.text(cx, 104, '16 bytes', { font: 'mono', size: 15, color: C.muted });
    s.arrow(cx, 120, cx, 165, { color: C.muted });
    s.rect(cx - 26, 170, 52, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx, 196, '1 byte', { font: 'mono', size: 15 });
  }
  s.text(440, 248, '8 codes × 1 byte = 8 bytes per vector, 16× smaller than 128 bytes', { size: 20, weight: 700 });
  s.note(40, 268, 800, 40, ['The codebook (256 centres per sub-space) is shared by all vectors and stored once.'], { size: 17 });
  save('35.2-pq-split.svg', s);
}

// 2. IVF probing flow for one query (measured on query 0)
{
  const s = new Sketch(880, 340, { title: 'IVF probing: a query scans only the vectors in its nearest cells', seed: 102 });
  s.text(440, 34, 'One query under IVF-PQ with nprobe = 4', { size: 26, weight: 700 });
  const boxes = [
    ['5,000 vectors', 'split into 32 cells', 'sizes 1 to 205'],
    ['probe the 4 cells', 'nearest the query:', '177, 170, 144, 144'],
    ['635 candidates', 'each read 8 table', 'entries, 5,080 reads'],
    ['top-10 returned', 'query 0: 2 of its 10', 'true neighbours found'],
  ];
  boxes.forEach((lines, i) => {
    const x = 30 + i * 215;
    const hot = i === 1 || i === 2;
    s.rect(x, 100, 190, 120, { color: hot ? C.amber : C.blue, fill: hot ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x + 95, 132, lines, { size: 18 });
    if (i < 3) s.arrow(x + 190, 160, x + 215, 160, { color: C.muted });
  });
  s.note(40, 260, 800, 56, ['The boxes show the steps, not a map of the cells. Sizes and counts are measured.', 'Exact search would scan all 5,000 vectors for the same query.'], { size: 17 });
  save('35.2-ivf-probe.svg', s);
}

// 3. ADC table, worked by hand
{
  const s = new Sketch(880, 360, { title: 'Asymmetric distance computation: a 2×2 table and two lookups', seed: 103 });
  s.text(440, 34, 'ADC: build one table per query, then add table lookups', { size: 26, weight: 700 });
  s.text(260, 84, 'codeword 0', { size: 18, weight: 700 });
  s.text(380, 84, 'codeword 1', { size: 18, weight: 700 });
  const cells = [[1.0, 5.0], [8.0, 5.0]];
  const used = [[false, true], [false, true]];
  cells.forEach((row, r) => {
    const y = 100 + r * 70;
    s.text(120, y + 40, `sub-space ${r + 1}`, { size: 18 });
    row.forEach((v, c) => {
      const x = 200 + c * 120;
      s.rect(x, y, 120, 56, { color: used[r][c] ? C.amber : C.blue, fill: used[r][c] ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
      s.text(x + 60, y + 36, v.toFixed(1), { font: 'mono', size: 20, weight: 700 });
    });
  });
  s.text(200, 262, 'shaded: the entries that code (1, 1) reads', { size: 17, color: C.muted, anchor: 'start' });
  s.note(540, 96, 300, 200, [
    'stored vector x codes to (1, 1)',
    'ADC = 5.0 + 5.0 = 10.0',
    'exact squared distance = 8.5',
    'reconstruction error = 2.5',
  ], { size: 19 });
  s.text(440, 330, 'Per vector: m table reads and adds, instead of d multiplications.', { size: 19, weight: 700 });
  save('35.2-adc-table.svg', s);
}

// 4. Recall against nprobe (measured)
{
  const s = new Sketch(880, 360, { title: 'Recall@10 against nprobe, two error sources', seed: 104 });
  s.text(440, 34, 'Recall@10 rises with nprobe; PQ error keeps it lower', { size: 26, weight: 700 });
  const rows = [
    [1, 0.189, 0.196, 168],
    [2, 0.303, 0.334, 339],
    [4, 0.416, 0.503, 673],
    [8, 0.523, 0.703, 1342],
    [16, 0.592, 0.918, 2672],
  ];
  const yOf = (v) => 300 - v * 220;
  [0, 0.5, 1].forEach((v) => {
    s.line(110, yOf(v), 830, yOf(v), { color: C.muted, dash: '6 8', width: 1 });
    s.text(96, yOf(v) + 6, v.toFixed(1), { font: 'mono', size: 15, anchor: 'end' });
  });
  rows.forEach(([np, rec, orc, scanned], i) => {
    const x0 = 110 + i * 144;
    s.rect(x0 + 30, yOf(rec), 46, 300 - yOf(rec), { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(x0 + 80, yOf(orc), 46, 300 - yOf(orc), { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x0 + 53, yOf(rec) - 8, rec.toFixed(2), { font: 'mono', size: 15 });
    s.text(x0 + 103, yOf(orc) - 8, orc.toFixed(2), { font: 'mono', size: 15 });
    s.text(x0 + 72, 322, `nprobe = ${np}`, { size: 17 });
    s.text(x0 + 72, 344, `${scanned} scanned`, { font: 'mono', size: 15, color: C.muted });
  });
  s.rect(110, 62, 18, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(136, 75, 'PQ distances (the index)', { size: 17, anchor: 'start' });
  s.rect(400, 62, 18, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(426, 75, 'exact distances inside the same cells', { size: 17, anchor: 'start' });
  save('35.2-recall-nprobe.svg', s);
}
