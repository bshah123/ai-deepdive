import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers printed on these diagrams come from scripts/diagrams/lessons/4.4_data.py (CPython 3.12, 64-bit)
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-04-lists/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. A slice is a new list whose pointers reference the same objects
{
  const s = new Sketch(880, 380, { title: 'a[1:5:2] is a new list of pointers to the same int objects', seed: 401 });
  s.text(440, 34, 'A slice is a new list pointing at the same objects', { size: 24, weight: 700 });
  const xs = [160, 280, 400, 520, 640, 760];
  const vals = [10, 20, 30, 40, 50, 60];
  s.text(40, 94, 'a', { size: 22, weight: 700, anchor: 'start' });
  s.text(40, 228, 'objects', { size: 18, anchor: 'start' });
  s.text(40, 320, 'b', { size: 22, weight: 700, anchor: 'start' });
  xs.forEach((x, i) => {
    s.rect(x - 40, 74, 80, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x, 74 + 20 + 6, `[${i}]`, { font: 'mono', size: 16 });
    s.rect(x - 40, 200, 80, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x, 200 + 22 + 7, String(vals[i]), { font: 'mono', size: 20 });
    s.arrow(x, 114, x, 200, { color: C.muted });
  });
  [1, 3].forEach((i, k) => {
    const x = xs[i];
    s.rect(x - 40, 300, 80, 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(x, 300 + 20 + 6, `b[${k}]`, { font: 'mono', size: 16 });
    s.arrow(x, 300, x, 246, { color: C.rose, width: 3 });
  });
  s.note(600, 290, 260, 64, ['same objects, new pointers', 'no int was copied'], { size: 19 });
  save('4.4-shares-objects.svg', s);
}

// 2. Shallow vs deep copy after one mutation: letters name objects
{
  const s = new Sketch(880, 420, { title: 'Shallow and deep copies of a nested list after one mutation', seed: 402 });
  s.text(440, 34, 'Letters name objects: same letter, same object', { size: 24, weight: 700 });
  const fill = { A: [C.blue, C.blueSoft], B: [C.amber, C.amberSoft], C: [C.green, C.greenSoft], "A'": [C.rose, C.roseSoft], "B'": [C.rose, C.roseSoft] };
  const rows = [
    { label: 'n', y: 84, cells: ['A', 'B', 'C'] },
    { label: 'shallow', y: 154, cells: ['A', 'B'] },
    { label: 'deep', y: 224, cells: ["A'", "B'"] },
  ];
  rows.forEach((r) => {
    s.text(40, r.y + 20 + 7, r.label, { size: 20, anchor: 'start' });
    r.cells.forEach((k, i) => {
      const [col, soft] = fill[k];
      s.rect(170 + i * 102, r.y, 90, 40, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(215 + i * 102, r.y + 20 + 7, k, { font: 'mono', size: 20, weight: 700 });
    });
  });
  s.text(690, 66, 'objects', { size: 20 });
  const objs = [
    ['A', 'A = [1, 2, 99]', 84], ['B', 'B = [3]', 144], ['C', 'C = [7]', 204],
    ["A'", "A' = [1, 2]", 274], ["B'", "B' = [3]", 334],
  ];
  objs.forEach(([k, txt, y]) => {
    const [col, soft] = fill[k];
    s.rect(540, y, 300, 44, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(690, y + 22 + 7, txt, { font: 'mono', size: 20 });
  });
  s.text(440, 404, 'shallow shares A and B with n; deep owns its own copies', { size: 18 });
  save('4.4-shallow-deep.svg', s);
}

// 3. Measured bytes retained by each operation (tracemalloc, 1 MB = 10^6 bytes)
{
  const s = new Sketch(880, 360, { title: 'Bar chart of bytes retained by copies and iterators', seed: 403 });
  s.text(440, 34, 'Bytes retained by each operation (tracemalloc)', { size: 24, weight: 700 });
  s.line(330, 66, 330, 318, { color: C.muted });
  const rows = [
    ['slice big[:], 1e6 items', 8.000112],
    ['shallow copy, 1e5 rows', 0.800112],
    ['deepcopy, 1e5 rows', 9.601104],
    ['list(range(1e6))', 39.991888],
  ];
  rows.forEach(([label, mb], i) => {
    const y = 96 + i * 56;
    const w = mb * 11;
    const rose = i === 2;
    s.text(310, y + 6, label, { size: 18, anchor: 'end' });
    s.rect(330, y - 16, w, 32, { color: rose ? C.rose : C.blue, fill: rose ? C.roseSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(330 + w + 12, y + 6, `${mb.toFixed(1)} MB`, { size: 18, anchor: 'start' });
  });
  const y5 = 96 + 4 * 56;
  s.text(310, y5 + 6, 'islice(count(), 1e6)', { size: 18, anchor: 'end' });
  s.line(330, y5, 338, y5, { color: C.green, width: 4 });
  s.text(346, y5 + 6, 'under 1 KB', { size: 18, anchor: 'start' });
  save('4.4-copy-cost.svg', s);
}

// 4. islice pulls: the source is only asked for the items it needs
{
  const s = new Sketch(880, 300, { title: 'islice(source, 3, 6) pulls six items and yields three', seed: 404 });
  s.text(440, 34, 'islice(source, 3, 6) pulls six items to yield three', { size: 24, weight: 700 });
  s.text(40, 138, 'source', { size: 20, anchor: 'start' });
  for (let i = 0; i < 9; i++) {
    const x = 150 + i * 80;
    if (i < 6) {
      const skipped = i < 3;
      const [col, soft] = skipped ? [C.amber, C.amberSoft] : [C.green, C.greenSoft];
      s.rect(x, 110, 64, 56, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + 32, 110 + 28 + 8, String(i), { font: 'mono', size: 22 });
      s.text(x + 32, 196, skipped ? 'skipped' : 'yielded', { size: 17 });
    } else {
      s.rect(x, 110, 64, 56, { color: C.muted, dash: '6 8' });
      s.text(x + 32, 110 + 28 + 8, String(i), { font: 'mono', size: 22, color: C.muted });
      s.text(x + 32, 196, 'not pulled', { size: 17, color: C.muted });
    }
  }
  s.text(440, 262, 'islice stops asking the source after index stop - 1 = 5', { size: 18 });
  save('4.4-islice-pulls.svg', s);
}

// 5. groupby merges adjacent runs only
{
  const s = new Sketch(880, 310, { title: 'groupby on an unsorted and a sorted string', seed: 405 });
  s.text(440, 34, 'groupby merges adjacent equal keys only', { size: 24, weight: 700 });
  const pal = [[C.blue, C.blueSoft], [C.amber, C.amberSoft], [C.green, C.greenSoft], [C.rose, C.roseSoft]];
  const row = (y, word, runs, label, result) => {
    s.text(40, y + 22 + 7, label, { size: 20, anchor: 'start' });
    [...word].forEach((ch, i) => {
      const [col, soft] = pal[runs[i] % pal.length];
      s.rect(200 + i * 60, y, 52, 44, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(226 + i * 60, y + 22 + 7, ch, { font: 'mono', size: 22, weight: 700 });
    });
    s.text(200, y + 74, result, { size: 18, anchor: 'start' });
  };
  row(76, 'aabbaca', [0, 0, 1, 1, 2, 3, 4], 's', 'groupby(s): (a,2) (b,2) (a,1) (c,1) (a,1), 5 groups');
  row(196, 'aaaabbc', [0, 0, 0, 0, 1, 1, 2], 'sorted(s)', 'groupby(sorted(s)): (a,4) (b,2) (c,1), 3 groups');
  save('4.4-groupby-runs.svg', s);
}
