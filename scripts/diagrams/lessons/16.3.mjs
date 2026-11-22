// Diagrams for Lesson 16.3 (pandas memory: categoricals, downcasting, chunking).
// Numbers come from the lesson's own code blocks, run with pandas 3.1.1 and NumPy 2.5.5.
// Run: node scripts/diagrams/lessons/16.3.mjs
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

// colour per storage family
const KIND = {
  obj: { c: C.rose, f: C.roseSoft },   // object / pointer-heavy
  str: { c: C.amber, f: C.amberSoft }, // string labels
  cat: { c: C.green, f: C.greenSoft }, // the winning representation
  num: { c: C.blue, f: C.blueSoft },   // numeric codes and values
};

// one filled cell with centred mono text
const cell = (s, x, y, w, h, t, k) => {
  s.rect(x, y, w, h, { color: k.c, fill: k.f, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
  s.text(x + w / 2, y + h / 2 + 6, t, { font: 'mono', size: 15 });
};

// ---------------------------------------------------------------- layout
// Source: lesson block 2 (np.unique) and block 3 (categories table bytes = 58).
{
  const s = new Sketch(880, 390, { title: 'A categorical column: eight labels stored as one table of four labels plus one code per row', seed: 16301 });
  s.text(440, 34, 'One label table, one small code per row', { size: 26, weight: 700 });
  s.text(40, 74, 'object column: every row repeats its label', { size: 18, color: C.muted, anchor: 'start' });
  const vals = ['Chennai', 'Chennai', 'Kolkata', 'Delhi', 'Kolkata', 'Mumbai', 'Chennai', 'Delhi'];
  vals.forEach((v, i) => cell(s, 40 + i * 100, 88, 96, 34, v, KIND.str));
  s.text(40, 152, 'categorical: one int8 code per row, 1 byte each', { size: 18, color: C.muted, anchor: 'start' });
  const codes = [0, 0, 2, 1, 2, 3, 0, 1];
  codes.forEach((c, i) => cell(s, 40 + i * 100, 166, 96, 34, String(c), KIND.num));
  s.text(440, 236, 'each code is a position in the table below', { size: 18, color: C.muted });
  s.text(40, 258, 'categories table: each label stored once', { size: 18, color: C.muted, anchor: 'start' });
  const cats = ['Chennai', 'Delhi', 'Kolkata', 'Mumbai'];
  cats.forEach((n, i) => cell(s, 40 + i * 190, 272, 170, 34, `${i}  ${n}`, KIND.cat));
  s.text(40, 352, 'for 1,000,000 rows: 1,000,000 bytes of codes plus a 58-byte table', { size: 18, anchor: 'start' });
  save('16.3-category-layout.svg', s);
}

// ---------------------------------------------------------------- city memory
// Source: lesson block 3, one million city names, memory_usage(deep=True).
{
  const s = new Sketch(880, 290, { title: 'Bar chart of one million city names: 55.3 MB as object, 14.3 MB as str, 1.0 MB as category', seed: 16302 });
  s.text(440, 34, 'One million city names, by column dtype', { size: 26, weight: 700 });
  const rows = [
    ['object', 55.251604, KIND.obj],
    ['str (pandas 3 default)', 14.251604, KIND.str],
    ['category', 1.000190, KIND.cat],
  ];
  const X = 260;
  const SCALE = 9.5; // px per MB
  rows.forEach(([name, mb, k], i) => {
    const y = 84 + i * 62;
    const w = Math.max(mb * SCALE, 4);
    s.text(X - 16, y + 24, name, { size: 18, anchor: 'end' });
    s.rect(X, y, w, 36, { color: k.c, fill: k.f, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
    s.text(X + w + 12, y + 25, `${mb.toFixed(1)} MB`, { size: 20, weight: 700, anchor: 'start' });
  });
  s.text(440, 262, 'memory_usage(deep=True), pandas 3.1.1', { size: 16, color: C.muted });
  save('16.3-city-memory.svg', s);
}

// ---------------------------------------------------------------- downcasting
// Source: lesson block 6, pd.to_numeric(downcast=...) on one million rows.
{
  const s = new Sketch(880, 390, { title: 'Bytes per column before and after downcasting one million rows', seed: 16303 });
  s.text(440, 34, 'Same rows, smaller types', { size: 26, weight: 700 });
  const rows = [
    ['order_id', 'int64', 8.000132, 'int32', 4.000132],
    ['items', 'int64', 8.000132, 'int8', 1.000132],
    ['price', 'float64', 8.000132, 'float32', 4.000132],
  ];
  const X = 230;
  const SCALE = 56; // px per MB
  rows.forEach(([name, from, before, to, after], i) => {
    const y0 = 80 + i * 100;
    s.text(40, y0 + 26, name, { font: 'mono', size: 18, weight: 700, anchor: 'start' });
    s.rect(X, y0, before * SCALE, 30, { color: KIND.num.c, fill: KIND.num.f, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
    s.text(X + before * SCALE + 12, y0 + 23, `${from}  ${before.toFixed(1)} MB`, { size: 18, anchor: 'start' });
    s.rect(X, y0 + 40, after * SCALE, 30, { color: KIND.cat.c, fill: KIND.cat.f, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
    s.text(X + after * SCALE + 12, y0 + 63, `${to}  ${after.toFixed(1)} MB`, { size: 18, anchor: 'start' });
  });
  s.text(440, 368, 'blue: before, green: after. memory_usage() values, index included.', { size: 16, color: C.muted });
  save('16.3-downcast.svg', s);
}

// ---------------------------------------------------------------- chunk peak
// Source: lesson block 9, tracemalloc peaks while reading the same 1,000,000-row CSV.
{
  const s = new Sketch(880, 340, { title: 'Traced peak memory for four ways to read the same one-million-row CSV', seed: 16304 });
  s.text(440, 34, 'Peak memory while reading one million rows', { size: 26, weight: 700 });
  const rows = [
    ['plain read', 32.3, KIND.obj],
    ['typed read', 13.2, KIND.num],
    ['chunks + concat', 32.1, KIND.obj],
    ['chunked sum', 3.5, KIND.cat],
  ];
  const X = 240;
  const SCALE = 14.5; // px per MB
  rows.forEach(([name, mb, k], i) => {
    const y = 80 + i * 56;
    const w = mb * SCALE;
    s.text(X - 16, y + 24, name, { size: 18, anchor: 'end' });
    s.rect(X, y, w, 36, { color: k.c, fill: k.f, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
    s.text(X + w + 12, y + 25, `${mb.toFixed(1)} MB`, { size: 20, weight: 700, anchor: 'start' });
  });
  s.text(440, 316, 'Approximate: tracemalloc counts Python and NumPy allocations. Chunks are 100,000 rows.', { size: 16, color: C.muted });
  save('16.3-chunk-peak.svg', s);
}
