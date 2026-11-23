// Diagrams for Lesson 16.1 (pandas BlockManager). Run: node scripts/diagrams/lessons/16.1.mjs
// Every number below was measured with pandas 3.1.1 / NumPy 2.5.5 (experiment in the lesson's
// "Run locally" blocks and the NumPy check in the lesson). Nothing here is drawn from memory.
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

const KIND = {
  int: { c: C.blue, f: C.blueSoft },
  flt: { c: C.green, f: C.greenSoft },
  str: { c: C.amber, f: C.amberSoft },
};
const cell = (s, x, y, w, h, t, k) => {
  s.rect(x, y, w, h, { color: k.c, fill: k.f, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
  s.text(x + w / 2, y + h / 2 + 6, t, { font: 'mono', size: 15 });
};

// ---------------------------------------------------------------- 1. columns -> blocks
{
  const s = new Sketch(880, 500, { title: 'Five DataFrame columns grouped into three blocks by dtype, with the blknos and blklocs lookup arrays', seed: 1611 });
  s.text(440, 34, 'Five columns, three blocks', { size: 26, weight: 700 });
  const cols = [
    ['a', 'int64', 'int', ['1', '2', '3']],
    ['b', 'float64', 'flt', ['1.5', '2.5', '3.5']],
    ['c', 'int64', 'int', ['10', '20', '30']],
    ['d', 'float64', 'flt', ['0.1', '0.2', '0.3']],
    ['s', 'str', 'str', ['x', 'yy', 'zzz']],
  ];
  const X0 = 190;
  const CW = 108;
  s.text(24, 96, 'the frame', { size: 20, color: C.muted, anchor: 'start' });
  cols.forEach(([n, dt, k, vals], i) => {
    const x = X0 + i * CW;
    s.text(x + 46, 70, n, { font: 'mono', size: 18, weight: 700, color: KIND[k].c });
    s.text(x + 46, 90, dt, { size: 17, color: C.muted });
    vals.forEach((v, r) => cell(s, x, 102 + r * 32, 92, 30, v, KIND[k]));
  });
  const bn = [0, 1, 0, 1, 2];
  const bl = [0, 0, 1, 1, 0];
  s.text(24, 250, 'blknos', { font: 'mono', size: 16, anchor: 'start' });
  s.text(24, 280, 'blklocs', { font: 'mono', size: 16, anchor: 'start' });
  cols.forEach(([, , k], i) => {
    const x = X0 + i * CW + 46;
    s.text(x, 250, String(bn[i]), { font: 'mono', size: 18, weight: 700, color: KIND[k].c });
    s.text(x, 280, String(bl[i]), { font: 'mono', size: 18, weight: 700, color: KIND[k].c });
  });
  s.line(24, 300, 856, 300, { color: C.muted, width: 1, dash: '5 7' });

  const blocks = [
    { x: 40, t: 'block 0 · int64', sh: 'NumpyBlock, shape (2, 3)', k: 'int', rows: [['a', ['1', '2', '3']], ['c', ['10', '20', '30']]] },
    { x: 330, t: 'block 1 · float64', sh: 'NumpyBlock, shape (2, 3)', k: 'flt', rows: [['b', ['1.5', '2.5', '3.5']], ['d', ['0.1', '0.2', '0.3']]] },
  ];
  blocks.forEach((b) => {
    s.text(b.x + 130, 330, b.t, { size: 22, weight: 700, color: KIND[b.k].c });
    s.text(b.x + 130, 352, b.sh, { font: 'mono', size: 14, color: C.muted });
    b.rows.forEach(([n, vals], r) => {
      s.text(b.x + 14, 388 + r * 34, n, { font: 'mono', size: 16, color: KIND[b.k].c });
      vals.forEach((v, j) => cell(s, b.x + 32 + j * 78, 366 + r * 34, 72, 30, v, KIND[b.k]));
    });
  });
  const ex = 620;
  s.text(ex + 118, 330, 'block 2 · str', { size: 22, weight: 700, color: C.amber });
  s.text(ex + 118, 352, 'ExtensionBlock, shape (1, 3)', { font: 'mono', size: 14, color: C.muted });
  s.text(ex + 14, 388, 's', { font: 'mono', size: 16, color: C.amber });
  ['x', 'yy', 'zzz'].forEach((v, j) => cell(s, ex + 32 + j * 70, 366, 64, 30, v, KIND.str));
  s.note(40, 446, 800, 34, 'column c: blocks[blknos[2]][blklocs[2]] = block 0, row 1', { size: 18, rotate: 0 });
  save('16.1-blocks.svg', s);
}

// ---------------------------------------------------------------- 2. bytes inside block 0
{
  const s = new Sketch(880, 330, { title: 'Block 0 is one 2 by 3 int64 array: 48 bytes, strides (24, 8); a column is a contiguous run', seed: 1612 });
  s.text(440, 34, 'Inside block 0: one flat run of 48 bytes', { size: 26, weight: 700 });
  const X = 100;
  const W = 120;
  const labels = ['a₀', 'a₁', 'a₂', 'c₀', 'c₁', 'c₂'];
  const vals = ['1', '2', '3', '10', '20', '30'];
  labels.forEach((l, i) => {
    const isC = i >= 3;
    s.rect(X + i * W, 100, W - 6, 62, {
      color: isC ? C.green : C.blue,
      fill: isC ? C.greenSoft : C.blueSoft,
      fillStyle: 'solid',
      width: 1.4,
      roughness: 0.8,
    });
    s.text(X + i * W + (W - 6) / 2, 128, l, { size: 22 });
    s.text(X + i * W + (W - 6) / 2, 152, vals[i], { font: 'mono', size: 16 });
    s.text(X + i * W + 4, 182, `${i * 8}`, { font: 'mono', size: 15, color: C.muted, anchor: 'start' });
  });
  s.text(X - 10, 182, 'byte offset', { size: 17, color: C.muted, anchor: 'end' });
  s.line(X, 206, X + 3 * W - 6, 206, { color: C.blue, width: 2.2 });
  s.text(X + 1.5 * W - 3, 232, 'column a: stride 8 B', { size: 20, color: C.blue });
  s.line(X + 3 * W, 206, X + 6 * W - 6, 206, { color: C.green, width: 2.2 });
  s.text(X + 4.5 * W - 3, 232, 'column c: stride 8 B', { size: 20, color: C.green });
  s.curveArrow(X + 0.5 * W, 94, X + 2.5 * W, 70, X + 3.5 * W - 4, 94, { color: C.amber, width: 2, head: 11 });
  s.text(X + 2 * W, 60, 'block stride 24 B: a₀ to c₀', { size: 19, color: C.amber });
  s.note(40, 262, 800, 54, ['With 100,000 rows one int64 column is 800,000 bytes.', 'Next row of a column: 8 B. Next column of the block: 24 B.'], { size: 19, rotate: 0 });
  save('16.1-layout.svg', s);
}

// ---------------------------------------------------------------- 3. fragmentation bars
{
  const s = new Sketch(880, 400, { title: 'Bar chart of block count after n column inserts and after copy; threshold 100 marked', seed: 1613 });
  s.text(440, 34, 'Each column insert adds a block; copy() merges them', { size: 25, weight: 700 });
  const base = 330;
  const k = 1.6; // px per block
  const thr = base - 100 * k;
  const bars = [
    { x: 110, v: 10, lab: '10 inserts', k: 'ok' },
    { x: 230, v: 50, lab: '50 inserts', k: 'ok' },
    { x: 350, v: 100, lab: '100 inserts', k: 'ok' },
    { x: 470, v: 101, lab: '101 inserts', k: 'warn' },
    { x: 590, v: 150, lab: '150 inserts', k: 'warn' },
    { x: 730, v: 1, lab: 'copy()', k: 'fix' },
  ];
  s.line(70, base, 820, base, { color: C.muted, width: 1.4 });
  s.line(70, thr, 820, thr, { color: C.rose, width: 1.6, dash: '8 7' });
  s.text(74, thr - 10, 'warning fires above 100 blocks', { size: 17, color: C.rose, anchor: 'start' });
  bars.forEach((b) => {
    const kk = b.k === 'warn' ? { c: C.rose, f: C.roseSoft } : b.k === 'fix' ? { c: C.green, f: C.greenSoft } : { c: C.blue, f: C.blueSoft };
    const h = Math.max(b.v * k, 4);
    s.rect(b.x, base - h, 80, h, { color: kk.c, fill: kk.f, fillStyle: 'solid', width: 1.4, roughness: 0.6 });
    s.text(b.x + 40, base - h - 10, `${b.v} block${b.v === 1 ? '' : 's'}`, { font: 'mono', size: 15, color: kk.c });
    s.text(b.x + 40, base + 28, b.lab, { font: 'mono', size: 15 });
  });
  s.text(440, 380, 'blocks counted: non-extension blocks only (str column excluded)', { size: 17, color: C.muted });
  save('16.1-fragmentation.svg', s);
}

// ---------------------------------------------------------------- 4. copy-on-write vs _mgr
{
  const s = new Sketch(880, 330, { title: 'Two writes to df[a]: a derived object is a copy, a direct write to the block is not', seed: 1614 });
  s.text(440, 34, 'Two writes to column "a", two outcomes', { size: 26, weight: 700 });
  const row = (y, code1, code2, result, k) => {
    s.rect(30, y, 370, 84, { color: k.c, fill: k.f, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
    s.text(215, y + 36, code1, { font: 'mono', size: 15 });
    s.text(215, y + 62, code2, { font: 'mono', size: 15 });
    s.arrow(410, y + 42, 466, y + 42, { color: C.muted, width: 2 });
    s.rect(470, y, 380, 84, { color: k.c, fill: k.f, fillStyle: 'solid', width: 1.6, roughness: 0.8 });
    s.text(660, y + 36, result[0], { font: 'mono', size: 15 });
    s.text(660, y + 62, result[1], { size: 19, color: k.c });
  };
  row(74, "x = df['a']", 'x.iloc[0] = 99', ["df['a'][0] is still 1", 'x behaves as a copy'], { c: C.green, f: C.greenSoft });
  row(186, "df._mgr.blocks[0]", '  .values[0, 0] = 98', ["df['a'][0] is now 98", 'writes the array under df'], { c: C.rose, f: C.roseSoft });
  s.text(440, 300, 'Top: the public API. Bottom: a private attribute, outside copy-on-write.', { size: 17, color: C.muted });
  save('16.1-cow.svg', s);
}
