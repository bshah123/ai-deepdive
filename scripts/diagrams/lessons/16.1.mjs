// Diagrams for Lesson 16.1 (pandas BlockManager). Run: node scripts/diagrams/lessons/16.1.mjs
// Numbers come from the lesson's code blocks (toy block manager and pandas 3.1.1 inspection).
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

// colour per dtype family
const KIND = {
  int: { c: C.blue, f: C.blueSoft },
  flt: { c: C.green, f: C.greenSoft },
  str: { c: C.amber, f: C.amberSoft },
};

// one filled cell with centred mono text
const cell = (s, x, y, w, h, t, k, o = {}) => {
  s.rect(x, y, w, h, { color: k.c, fill: k.f, fillStyle: 'solid', width: 1.4, roughness: 0.8, ...o });
  s.text(x + w / 2, y + h / 2 + 6, t, { font: 'mono', size: 15 });
};

// ---------------------------------------------------------------- blocks
{
  const s = new Sketch(880, 490, { title: 'A DataFrame with five columns stored as three blocks, with the blknos and blklocs lookup arrays', seed: 1611 });
  s.text(440, 30, 'Five columns, three blocks', { size: 27, weight: 700 });
  const cols = [
    ['a', 'int64', 'int', ['1', '2', '3']],
    ['b', 'float64', 'flt', ['1.5', '2.5', '3.5']],
    ['c', 'int64', 'int', ['10', '20', '30']],
    ['d', 'float64', 'flt', ['0.1', '0.2', '0.3']],
    ['s', 'str', 'str', ['x', 'yy', 'zzz']],
  ];
  const X0 = 190;
  const CW = 108;
  s.text(24, 100, 'what you see:', { size: 21, color: C.muted, anchor: 'start' });
  s.text(24, 122, 'the DataFrame', { size: 21, color: C.muted, anchor: 'start' });
  cols.forEach(([n, dt, k, vals], i) => {
    const x = X0 + i * CW;
    const kk = KIND[k];
    s.text(x + 46, 62, n, { font: 'mono', size: 18, weight: 700, color: kk.c });
    s.text(x + 46, 82, dt, { size: 18, color: C.muted });
    vals.forEach((v, r) => cell(s, x, 92 + r * 32, 92, 30, v, kk));
  });
  // lookup arrays
  s.text(24, 232, 'blknos', { font: 'mono', size: 16, anchor: 'start' });
  s.text(24, 262, 'blklocs', { font: 'mono', size: 16, anchor: 'start' });
  const bn = [0, 1, 0, 1, 2];
  const bl = [0, 0, 1, 1, 0];
  cols.forEach(([, , k], i) => {
    const x = X0 + i * CW + 46;
    s.text(x, 232, String(bn[i]), { font: 'mono', size: 18, weight: 700, color: KIND[k].c });
    s.text(x, 262, String(bl[i]), { font: 'mono', size: 18, weight: 700, color: KIND[k].c });
  });
  s.text(X0 + 5 * CW + 6, 232, '← which block', { size: 19, color: C.muted, anchor: 'start' });
  s.text(X0 + 5 * CW + 6, 262, '← which row in it', { size: 19, color: C.muted, anchor: 'start' });
  s.line(24, 284, 856, 284, { color: C.muted, width: 1, dash: '5 7' });

  // the blocks
  const blocks = [
    { x: 40, t: 'block 0 · int64', sh: 'shape (2, 3)', k: 'int', rows: [['a', ['1', '2', '3']], ['c', ['10', '20', '30']]] },
    { x: 330, t: 'block 1 · float64', sh: 'shape (2, 3)', k: 'flt', rows: [['b', ['1.5', '2.5', '3.5']], ['d', ['0.1', '0.2', '0.3']]] },
  ];
  blocks.forEach((b) => {
    s.text(b.x + 120, 314, b.t, { size: 22, weight: 700, color: KIND[b.k].c });
    s.text(b.x + 120, 336, b.sh, { font: 'mono', size: 14, color: C.muted });
    b.rows.forEach(([n, vals], r) => {
      s.text(b.x + 14, 372 + r * 34, n, { font: 'mono', size: 16, color: KIND[b.k].c });
      vals.forEach((v, j) => cell(s, b.x + 32 + j * 78, 350 + r * 34, 72, 30, v, KIND[b.k]));
    });
  });
  // extension block
  const ex = 620;
  s.text(ex + 110, 314, 'block 2 · str', { size: 22, weight: 700, color: C.amber });
  s.text(ex + 110, 336, 'ExtensionBlock, 1-D', { font: 'mono', size: 14, color: C.muted });
  s.text(ex + 14, 372, 's', { font: 'mono', size: 16, color: C.amber });
  ['x', 'yy', 'zzz'].forEach((v, j) => cell(s, ex + 32 + j * 70, 350, 64, 30, v, KIND.str));
  s.text(ex + 110, 404, 'an Arrow string array,', { size: 18, color: C.muted });
  s.text(ex + 110, 424, 'not stacked with the others', { size: 18, color: C.muted });
  s.note(40, 432, 520, 38, 'column c = blocks[blknos[2]][blklocs[2]] = block 0, row 1', { size: 19, rotate: 0 });
  save('16.1-blocks.svg', s);
}

// ---------------------------------------------------------------- memory order
{
  const s = new Sketch(880, 340, { title: 'Memory layout of an int64 block: a column is one contiguous run, a row hops by the row length', seed: 1612 });
  s.text(440, 30, 'Inside block 0: one flat run of bytes', { size: 26, weight: 700 });
  const X = 70;
  const W = 120;
  const labels = ['a₀', 'a₁', 'a₂', 'c₀', 'c₁', 'c₂'];
  const vals = ['1', '2', '3', '10', '20', '30'];
  labels.forEach((l, i) => {
    const isC = i >= 3;
    const hi = i === 0 || i === 3;
    s.rect(X + i * W, 100, W - 6, 62, {
      color: hi ? C.amber : isC ? C.green : C.blue,
      fill: hi ? C.amberSoft : isC ? C.greenSoft : C.blueSoft,
      fillStyle: 'solid',
      width: hi ? 2.4 : 1.4,
      roughness: 0.8,
    });
    s.text(X + i * W + (W - 6) / 2, 128, l, { size: 22 });
    s.text(X + i * W + (W - 6) / 2, 152, vals[i], { font: 'mono', size: 16 });
    s.text(X + i * W + 4, 182, `${i * 8}`, { font: 'mono', size: 13, color: C.muted, anchor: 'start' });
  });
  s.text(X - 8, 182, 'byte offset', { size: 17, color: C.muted, anchor: 'end' });
  // contiguous bracket under column c
  s.line(X + 3 * W, 204, X + 6 * W - 8, 204, { color: C.green, width: 2.2 });
  s.line(X + 3 * W, 196, X + 3 * W, 204, { color: C.green, width: 2.2 });
  s.line(X + 6 * W - 8, 196, X + 6 * W - 8, 204, { color: C.green, width: 2.2 });
  s.text(X + 4.5 * W - 4, 232, 'column c: 3 neighbours, stride 8 B', { size: 22, color: C.green });
  // jump arc over row 0
  s.curveArrow(X + 0.5 * W, 94, X + 2 * W, 62, X + 3.5 * W - 4, 94, { color: C.amber, width: 2, head: 11 });
  s.text(X + 2 * W - 4, 54, 'row 0 of the frame: a₀ then c₀, a jump of 24 B', { size: 20, color: C.amber });
  s.note(40, 262, 800, 62, ['3 rows → the jump is 3 × 8 = 24 bytes. With 1,000,000 rows the same hop is 8,000,000 bytes:', 'on typical hardware a row read touches one cache line per column; a column read streams.'], { size: 20, rotate: 0 });
  save('16.1-memory-order.svg', s);
}

// ---------------------------------------------------------------- fragmentation
{
  const s = new Sketch(880, 360, { title: 'One hundred and fifty inserts leave 154 blocks; copy merges them into 3 and copies 3,720 bytes', seed: 1613 });
  s.text(220, 30, 'after 151 inserts', { size: 26, weight: 700 });
  s.text(220, 54, '154 blocks', { font: 'mono', size: 16, color: C.rose });
  // 3 original blocks + e + 150 thin green slabs, drawn as 20 slabs and an ellipsis
  const x0 = 24;
  const slab = (x, w, k) => s.rect(x, 90, w, 120, { color: k.c, fill: k.f, fillStyle: 'solid', width: 1.2, roughness: 0.7 });
  slab(x0, 28, KIND.int);
  slab(x0 + 32, 28, KIND.flt);
  slab(x0 + 64, 28, KIND.str);
  slab(x0 + 96, 14, KIND.int);
  for (let i = 0; i < 9; i++) slab(x0 + 114 + i * 14, 10, KIND.flt);
  s.text(x0 + 250, 156, '…', { size: 34 });
  for (let i = 0; i < 4; i++) slab(x0 + 266 + i * 14, 10, KIND.flt);
  s.text(x0 + 135, 238, 'one 1-row block per', { size: 20, color: C.muted });
  s.text(x0 + 135, 260, 'df["f0"] = …, df["f1"] = …', { font: 'mono', size: 14, color: C.muted });
  s.text(x0 + 135, 290, 'inserting copies no old data', { size: 20, color: C.green });
  // arrow
  s.arrow(396, 150, 520, 150, { color: C.amber, width: 2.4 });
  s.text(458, 124, 'df.copy()', { font: 'mono', size: 17, color: C.amber });
  s.text(458, 182, 'copies 3,720 B', { size: 20, color: C.amber });
  // consolidated
  s.text(710, 30, 'after copy()', { size: 26, weight: 700 });
  s.text(710, 54, '3 blocks', { font: 'mono', size: 16, color: C.green });
  s.rect(540, 90, 60, 120, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
  s.text(570, 150, 'int64', { size: 16 });
  s.text(570, 170, '(3, 3)', { font: 'mono', size: 12, color: C.muted });
  s.rect(610, 90, 190, 120, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
  s.text(705, 145, 'float64', { size: 22 });
  s.text(705, 170, '(152, 3)', { font: 'mono', size: 14, color: C.muted });
  s.rect(810, 90, 50, 120, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
  s.text(835, 150, 'str', { size: 16 });
  s.text(835, 170, '(3,)', { font: 'mono', size: 12, color: C.muted });
  s.text(710, 238, 'one block per dtype again', { size: 20, color: C.muted });
  s.note(24, 304, 830, 44, 'pandas 3.1.1 warns (PerformanceWarning) once a frame holds more than 100 blocks; pd.concat(axis=1) builds all columns in one pass.', { size: 18, rotate: 0 });
  save('16.1-fragmentation.svg', s);
}

// ---------------------------------------------------------------- copy on write
{
  const s = new Sketch(880, 430, { title: 'Copy-on-Write: selecting a column shares memory; the first write copies only what is written', seed: 1614 });
  const panel = (x, title, sub) => {
    s.text(x + 135, 30, title, { size: 22, weight: 700 });
    s.text(x + 135, 52, sub, { font: 'mono', size: 14, color: C.muted });
  };
  const row = (x, y, vals, k, label, o = {}) => {
    s.text(x - 8, y + 21, label, { font: 'mono', size: 14, color: k.c, anchor: 'end' });
    vals.forEach((v, j) => cell(s, x + j * 56, y, 50, 28, v, k, o));
  };
  // panel 1
  panel(10, '① s = df["a"]', 'no copy');
  s.text(30, 92, 'old block', { size: 18, color: C.muted, anchor: 'start' });
  row(60, 100, ['1', '2', '3'], KIND.int, 'a');
  row(60, 134, ['4', '5', '6'], KIND.int, 'b');
  s.arrow(130, 232, 130, 132, { color: C.amber, width: 2 });
  s.arrow(190, 232, 190, 132, { color: C.amber, width: 2 });
  s.rect(88, 232, 76, 30, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid', width: 1.2, roughness: 0.8 });
  s.text(126, 253, 'df', { font: 'mono', size: 15 });
  s.rect(156, 232, 76, 30, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid', width: 1.2, roughness: 0.8 });
  s.text(194, 253, 's', { font: 'mono', size: 15 });
  s.text(140, 292, 'both read the same', { size: 20, color: C.amber });
  s.text(140, 314, 'memory: shares = True', { size: 20, color: C.amber });
  s.line(290, 40, 290, 410, { color: C.muted, width: 1, dash: '5 7' });
  // panel 2
  panel(300, '② s.iloc[0] = 99', 'write to the view');
  s.text(320, 92, 'old block (untouched)', { size: 18, color: C.muted, anchor: 'start' });
  row(350, 100, ['1', '2', '3'], KIND.int, 'a');
  row(350, 134, ['4', '5', '6'], KIND.int, 'b');
  s.arrow(380, 232, 380, 132, { color: C.amber, width: 2 });
  s.text(380, 252, 'df', { font: 'mono', size: 15 });
  s.text(380, 276, "df['a'] = [1, 2, 3]", { font: 'mono', size: 13 });
  row(470, 200, ['99', '2', '3'], KIND.flt, 's');
  s.text(530, 252, 's', { font: 'mono', size: 15 });
  s.text(530, 276, 's = [99, 2, 3]', { font: 'mono', size: 13 });
  s.text(435, 322, 'only column a was copied,', { size: 20, color: C.green });
  s.text(435, 344, 'into s; df never changes', { size: 20, color: C.green });
  s.line(580, 40, 580, 410, { color: C.muted, width: 1, dash: '5 7' });
  // panel 3
  panel(590, '③ df.iloc[0, 0] = 99', 'write to the parent, s alive');
  s.text(610, 92, 'old block (s still reads it)', { size: 18, color: C.muted, anchor: 'start' });
  row(640, 100, ['1', '2', '3'], KIND.int, 'a');
  row(640, 134, ['4', '5', '6'], KIND.int, 'b');
  s.arrow(790, 206, 700, 164, { color: C.amber, width: 2 });
  s.text(838, 238, 'df: b', { font: 'mono', size: 14 });
  s.text(838, 258, "(still the old", { size: 17, color: C.muted });
  s.text(838, 276, 'memory)', { size: 17, color: C.muted });
  row(660, 200, ['99', '2', '3'], KIND.flt, 'a');
  s.text(720, 252, 'df: a (new 1×3 block)', { size: 18, color: C.green });
  s.arrow(682, 232, 682, 250, { color: C.green, width: 0.1, head: 0.1 });
  s.text(735, 322, 'block split: a copied,', { size: 20, color: C.green });
  s.text(735, 344, 'b left where it was', { size: 20, color: C.green });
  s.note(10, 372, 860, 44, 'Each array keeps weak references to every block sharing it (BlockValuesRefs); a write copies only if another live block shares the data.', { size: 17, rotate: 0 });
  save('16.1-cow.svg', s);
}
