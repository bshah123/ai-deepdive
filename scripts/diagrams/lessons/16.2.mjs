// Diagrams for Lesson 16.2 (Apache Arrow & columnar formats). Run: node scripts/diagrams/lessons/16.2.mjs
// Numbers come from scripts/diagrams/lessons/16.2_experiment.py (output in 16.2_data.txt), except the
// layout sketch, which is schematic and uses the 4-row example printed as E8 in that output.
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

// ---------------------------------------------------------------- 1. two layouts of one column
// E8: values ["ann", "bob", None, "cy"]; validity byte 11 (slots 0..3 = 1,1,0,1); offsets [0,3,6,6,8]; data "annbobcy"
{
  const s = new Sketch(880, 440, { title: 'The same four string values stored as pandas objects and as an Arrow string array', seed: 1621 });
  s.text(440, 36, 'The same four values, two memory layouts', { size: 24, weight: 700 });
  s.line(440, 60, 440, 420, { color: C.muted, width: 1.2, dash: '6 8' });

  // left: pandas object column
  s.text(225, 84, 'pandas object column', { size: 20, weight: 700, color: C.amber });
  const rows = [130, 190, 250, 310]; // centres of the pointer slots
  rows.forEach((cy, i) => {
    s.rect(60, cy - 20, 120, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.4 });
    s.text(120, cy + 6, `slot ${i}`, { font: 'mono', size: 16 });
  });
  const objs = [
    ['ann', 120], ['None', 200], ['bob', 280], ['cy', 360],
  ];
  objs.forEach(([label, cy]) => {
    s.rect(250, cy - 20, 160, 40, { color: C.ink, width: 1.4 });
    s.text(330, cy + 6, label === 'None' ? 'None' : `'${label}'`, { font: 'mono', size: 17 });
  });
  s.arrow(180, 130, 250, 120, { color: C.muted, width: 1.4, head: 9 });
  s.arrow(180, 190, 250, 280, { color: C.muted, width: 1.4, head: 9 });
  s.arrow(180, 250, 250, 200, { color: C.muted, width: 1.4, head: 9 });
  s.arrow(180, 310, 250, 360, { color: C.muted, width: 1.4, head: 9 });
  s.text(225, 404, ['each value is a separate', 'Python object; the column holds pointers'], { size: 16, color: C.muted });

  // right: Arrow string array, three contiguous buffers
  s.text(660, 84, 'Arrow string array', { size: 20, weight: 700, color: C.blue });
  s.text(560, 124, 'validity bits (1 = valid)', { size: 17, color: C.muted, anchor: 'start' });
  [1, 1, 0, 1].forEach((v, i) => {
    const isNull = v === 0;
    s.rect(560 + i * 70, 132, 70, 40, { color: isNull ? C.rose : C.blue, fill: isNull ? C.roseSoft : C.blueSoft, fillStyle: 'solid', width: 1.4 });
    s.text(595 + i * 70, 158, String(v), { font: 'mono', size: 18 });
  });
  s.text(560, 206, 'offsets (int32, length + 1)', { size: 17, color: C.muted, anchor: 'start' });
  [0, 3, 6, 6, 8].forEach((o, i) => {
    s.rect(560 + i * 56, 214, 56, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
    s.text(588 + i * 56, 240, String(o), { font: 'mono', size: 17 });
  });
  s.text(560, 288, 'data bytes (one block)', { size: 17, color: C.muted, anchor: 'start' });
  'annbobcy'.split('').forEach((ch, i) => {
    s.rect(560 + i * 35, 296, 35, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
    s.text(577 + i * 35, 322, ch, { font: 'mono', size: 18 });
  });
  s.text(560, 376, ['slot 2 is null: its bit is 0, and its', 'offsets repeat (6, 6), so it has no bytes'], { size: 16, color: C.muted, anchor: 'start' });
  save('16.2-layout.svg', s);
}

// ---------------------------------------------------------------- 2. the missing-value trap
// E3: [2**53 + 1, None]; pandas -> float64 9007199254740992 (not exact); Arrow int64 keeps 9007199254740993, null_count 1
{
  const s = new Sketch(880, 320, { title: 'Int64 values with one missing entry: pandas float64 rounds 2^53+1, Arrow keeps it exact', seed: 1622 });
  s.text(440, 36, 'One missing value in an integer column', { size: 24, weight: 700 });
  s.text(40, 112, 'pandas', { size: 20, weight: 700, color: C.amber, anchor: 'start' });
  s.rect(240, 84, 260, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.4 });
  s.text(370, 118, '9007199254740992.0', { font: 'mono', size: 18 });
  s.text(520, 118, 'float64: off by one', { size: 19, color: C.rose, anchor: 'start', weight: 700 });

  s.text(40, 222, 'Arrow', { size: 20, weight: 700, color: C.blue, anchor: 'start' });
  s.rect(240, 194, 260, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
  s.text(370, 228, '9007199254740993', { font: 'mono', size: 18 });
  s.text(520, 228, 'int64: exact, null is a 0 bit', { size: 19, color: C.green, anchor: 'start', weight: 700 });

  s.text(440, 290, 'input: [2**53 + 1, None] = [9007199254740993, null]', { size: 18, color: C.muted });
  save('16.2-null-int.svg', s);
}

// ---------------------------------------------------------------- 3. string memory bars
// E4, N = 200,000 values, 1,000 distinct labels of 9 characters (deep bytes in MB)
{
  const bars = [
    ['pandas object (Python str)', 11.600132, C.amber, C.amberSoft],
    ['pandas 3 default str (Arrow)', 3.400132, C.blue, C.blueSoft],
    ['Arrow large_string', 3.4, C.blue, C.blueSoft],
    ['Arrow string (32-bit offsets)', 2.6, C.green, C.greenSoft],
  ];
  const s = new Sketch(880, 330, { title: 'Memory of a 200,000-value string column by layout, in MB', seed: 1623 });
  s.text(440, 36, 'Memory for 200,000 string values', { size: 24, weight: 700 });
  bars.forEach(([label, mb, col, fill], i) => {
    const y = 100 + i * 58;
    s.text(40, y + 7, label, { size: 18, anchor: 'start' });
    const w = mb * 34;
    s.rect(330, y - 18, w, 36, { color: col, fill, fillStyle: 'solid', width: 1.4 });
    s.text(330 + w + 12, y + 7, `${mb.toFixed(1)} MB`, { size: 18, anchor: 'start', font: 'mono' });
  });
  s.text(440, 318, '1,000 distinct labels of 9 characters, from the experiment (deep bytes)', { size: 16, color: C.muted });
  save('16.2-string-memory.svg', s);
}

// ---------------------------------------------------------------- 4. file sizes
// E5, 1,000,000 rows: id int64, value float64, label string (1,000 distinct)
{
  const bars = [
    ['CSV text file', 36.16, C.rose, C.roseSoft],
    ['Parquet file (compressed)', 13.81, C.green, C.greenSoft],
    ['Arrow IPC file (uncompressed)', 33.00, C.blue, C.blueSoft],
    ['in memory (Arrow or pandas)', 33.00, C.blue, C.blueSoft],
  ];
  const s = new Sketch(880, 340, { title: 'File size of a 1,000,000-row table by format, in MB', seed: 1624 });
  s.text(440, 36, 'One million rows, four formats', { size: 24, weight: 700 });
  bars.forEach(([label, mb, col, fill], i) => {
    const y = 100 + i * 58;
    s.text(40, y + 7, label, { size: 18, anchor: 'start' });
    const w = mb * 11;
    s.rect(330, y - 18, w, 36, { color: col, fill, fillStyle: 'solid', width: 1.4 });
    s.text(330 + w + 12, y + 7, `${mb.toFixed(2)} MB`, { size: 18, anchor: 'start', font: 'mono' });
  });
  s.text(440, 328, 'Parquet is smaller than CSV: it is columnar and compressed. Our IPC file has no compression.', { size: 16, color: C.muted });
  save('16.2-file-size.svg', s);
}

// ---------------------------------------------------------------- 5. copying read vs memory map
// E6: copying read allocates 33,000,320 bytes from Arrow's pool; memory-mapped read allocates 0 bytes
{
  const s = new Sketch(880, 380, { title: 'A copying read and a memory-mapped read of the same Arrow file', seed: 1625 });
  s.text(440, 36, 'Copying read vs memory-mapped read', { size: 24, weight: 700 });

  s.text(40, 112, 'copying read', { size: 20, weight: 700, color: C.amber, anchor: 'start' });
  s.rect(260, 84, 180, 70, { color: C.ink, width: 1.4 });
  s.text(350, 126, 'file on disk', { size: 19 });
  s.arrow(440, 119, 530, 119, { color: C.muted, width: 1.6, head: 10 });
  s.text(485, 104, 'copy', { size: 17, color: C.muted });
  s.rect(530, 84, 300, 70, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.4 });
  s.text(680, 114, 'Arrow pool buffers', { size: 19 });
  s.text(680, 138, '33,000,320 bytes allocated', { font: 'mono', size: 16 });

  s.text(40, 252, 'memory-mapped', { size: 20, weight: 700, color: C.green, anchor: 'start' });
  s.rect(260, 224, 180, 70, { color: C.ink, width: 1.4 });
  s.text(350, 266, 'file on disk', { size: 19 });
  s.arrow(440, 259, 530, 259, { color: C.muted, width: 1.6, head: 10, dash: '6 6' });
  s.text(485, 244, 'map', { size: 17, color: C.muted });
  s.rect(530, 224, 300, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.4 });
  s.text(680, 254, 'same pages, no copy', { size: 19 });
  s.text(680, 278, '0 bytes allocated', { font: 'mono', size: 16 });

  s.text(440, 340, 'the array points into the file, so the file must not be rewritten while it is mapped', { size: 17, color: C.muted });
  save('16.2-mmap.svg', s);
}
