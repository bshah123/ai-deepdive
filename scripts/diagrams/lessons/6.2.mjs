// Diagrams for Lesson 6.2 (compact dict layout). Run: node scripts/diagrams/lessons/6.2.mjs
// Every number comes from scripts/diagrams/lessons/6.2_data.json, written by 6.2_experiment.py
// (CPython 3.12, 64-bit; the experiment reads dict internals with ctypes and checks them against sys.getsizeof).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-06-dictionaries-hash-tables/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};
const D = JSON.parse(readFileSync(join(HERE, '6.2_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');
const byDk = (dk) => D.transitions.find((t) => t.dk_size === dk);

// ---------------------------------------------------------------- 1. worked example: index + entries
{
  const W = D.worked;
  const s = new Sketch(880, 430, { title: 'Index table of 8 one-byte slots pointing into a list of four entries in insertion order', seed: 6201 });
  s.text(440, 34, 'Four keys in a size-8 table: the index points into a dense list', { size: 24, weight: 700 });
  s.text(60, 100, 'index table: 8 slots, 1 byte each', { size: 18, anchor: 'start', color: C.muted });
  s.text(520, 100, 'entries, in insertion order', { size: 18, anchor: 'start', color: C.muted });

  W.index.forEach((v, k) => {
    const top = 116 + 34 * k;
    const used = v >= 0;
    s.rect(60, top, 140, 30, used ? { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' } : { color: C.muted });
    s.text(72, top + 21, `slot ${k}`, { font: 'mono', size: 16, anchor: 'start' });
    s.text(188, top + 21, `${v}`, { font: 'mono', size: 16, anchor: 'end' });
  });

  const cols = [[520, 580], [580, 675], [675, 770], [770, 850]];
  ['entry', 'hash', 'key', 'value'].forEach((h, c) =>
    s.text((cols[c][0] + cols[c][1]) / 2, 136, h, { font: 'mono', size: 14, color: C.muted }));
  W.entries.forEach((e, n) => {
    const top = 146 + 40 * n;
    s.rect(520, top, 330, 34, { color: C.muted });
    cols.slice(1).forEach(([x]) => s.line(x, top, x, top + 34, { color: C.muted, width: 1 }));
    const vals = [`e${n}`, `${e.hash}`, e.key, e.value];
    vals.forEach((v, c) => s.text((cols[c][0] + cols[c][1]) / 2, top + 23, v, { font: 'mono', size: 17 }));
  });

  W.index.forEach((v, k) => {
    if (v < 0) return;
    const y0 = 116 + 34 * k + 15;
    const y1 = 146 + 40 * v + 17;
    s.arrow(200, y0, 520, y1, { color: C.blue, width: 1.8 });
  });

  s.note(520, 330, 330, 84, ['index: 1 byte per slot, -1 = empty', `entries: ${D.n1000.int.entry_bytes} bytes each (int keys, measured)`], { size: 17 });
  save('6.2-worked-index.svg', s);
}

// ---------------------------------------------------------------- 2. index width rule
{
  const s = new Sketch(880, 350, { title: 'Table of table sizes, index width and largest stored index, showing where the index width steps up', seed: 6202 });
  s.text(440, 34, 'The index width steps up as the table grows', { size: 24, weight: 700 });
  const cols = [[60, 200], [200, 400], [400, 600], [600, 850]];
  ['table size', 'index width', 'largest index', 'signed check'].forEach((h, c) =>
    s.text((cols[c][0] + cols[c][1]) / 2, 96, h, { size: 18, weight: 700 }));
  const limit = { 1: 127, 2: 32767, 4: 2147483647 };
  const bits = { 1: 'int8', 2: 'int16', 4: 'int32' };
  [128, 256, 32768, 65536].forEach((dk, r) => {
    const t = byDk(dk);
    const top = 110 + 46 * r;
    const changed = dk === 256 || dk === 65536;
    const largest = t.capacity - 1;
    if (changed) s.rect(60, top, 790, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    else s.rect(60, top, 790, 40, { color: C.muted });
    const mid = (c) => (cols[c][0] + cols[c][1]) / 2;
    s.text(mid(0), top + 26, `${dk} slots`, { size: 18 });
    s.text(mid(1), top + 26, `${t.index_width} byte${t.index_width > 1 ? 's' : ''} (${bits[t.index_width]})`, { size: 18 });
    s.text(mid(2), top + 26, `${largest}`, { size: 18 });
    s.text(mid(3), top + 26, `${largest} <= ${fmt(limit[t.index_width])} (max)`, { size: 16 });
  });
  s.text(440, 322, 'Rule (my reasoning, checked against the measured widths): the index is signed and must hold 0 to capacity-1, plus -1 and -2.', { size: 16, color: C.muted });
  save('6.2-index-width.svg', s);
}

// ---------------------------------------------------------------- 3. deletion leaves holes
{
  const del = D.deletion;
  const s = new Sketch(880, 360, { title: 'Three strips: entries before deletes, after 999 deletes (holes), and after copy() which compacts', seed: 6203 });
  s.text(440, 34, 'Deleting leaves holes; the size stays until a copy', { size: 24, weight: 700 });
  const panels = [
    { x: 40, head: 'before the deletes', n: 12, kind: 'live', lines: [`len ${del.before.len}`, `entry slots used ${del.before.nentries}`, `${fmt(del.before.getsizeof)} bytes`] },
    { x: 330, head: 'after 999 deletes', n: 12, kind: 'holes', lines: [`len ${del.after_deletes.len}`, `entry slots used ${del.after_deletes.nentries}`, `${del.after_deletes.holes} holes`, `${fmt(del.after_deletes.getsizeof)} bytes`] },
    { x: 620, head: 'after d.copy()', n: 10, kind: 'copy', lines: [`len ${del.copy.len}`, `entry slots used ${del.copy.nentries}`, `${fmt(del.copy.getsizeof)} bytes`] },
  ];
  for (const p of panels) {
    s.text(p.x + 120, 96, p.head, { size: 20, weight: 700 });
    for (let i = 0; i < p.n; i++) {
      const x = p.x + 6 + 18 * i;
      let live = false;
      if (p.kind === 'live') live = true;
      if (p.kind === 'holes') live = i === p.n - 1;
      if (p.kind === 'copy') live = i < 2;
      if (live) s.rect(x, 116, 18, 34, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      else if (p.kind === 'holes') s.rect(x, 116, 18, 34, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
      else s.rect(x, 116, 18, 34, { color: C.muted });
    }
    p.lines.forEach((l, i) => s.text(p.x + 6, 186 + 26 * i, l, { size: 17, anchor: 'start' }));
  }
  const key = (x, fill, color, label) => {
    s.rect(x, 318, 18, 18, { color, fill, fillStyle: 'solid' });
    s.text(x + 28, 333, label, { size: 17, anchor: 'start' });
  };
  key(60, C.blueSoft, C.blue, 'live entry');
  key(230, C.roseSoft, C.rose, 'hole (deleted entry, still allocated)');
  key(560, undefined, C.muted, 'allocated, unused');
  save('6.2-deletion-holes.svg', s);
}

// ---------------------------------------------------------------- 4. where the bytes go
{
  const s = new Sketch(880, 330, { title: 'Stacked bars: index table, used entries and spare entry slots for str and int keys', seed: 6204 });
  s.text(440, 34, 'Where the bytes go in a 1000-entry dict', { size: 24, weight: 700 });
  const scale = 600 / D.n1000.int.getsizeof;
  const x0 = 60;
  const rows = [['str keys', D.n1000.str, 110], ['int keys', D.n1000.int, 205]];
  for (const [name, d, top] of rows) {
    const index = d.index_total;
    const used = d.nentries * d.entry_bytes;
    const spare = (d.capacity - d.nentries) * d.entry_bytes;
    let x = x0;
    const seg = (bytes, fill, color) => {
      const w = bytes * scale;
      s.rect(x, top, w, 56, { color, fill, fillStyle: 'solid' });
      s.text(x + w / 2, top + 34, fmt(bytes), { font: 'mono', size: 16 });
      x += w;
    };
    s.text(x0, top - 14, `${name}: ${fmt(d.getsizeof)} bytes in total`, { size: 20, weight: 700, anchor: 'start' });
    seg(index, C.blueSoft, C.blue);
    seg(used, C.greenSoft, C.green);
    seg(spare, C.amberSoft, C.amber);
  }
  const key = (x, fill, color, label) => {
    s.rect(x, 290, 18, 18, { color, fill, fillStyle: 'solid' });
    s.text(x + 28, 305, label, { size: 17, anchor: 'start' });
  };
  key(60, C.blueSoft, C.blue, `index table (${fmt(D.n1000.str.index_total)} bytes, both)`);
  key(330, C.greenSoft, C.green, `used entries (${fmt(D.n1000.str.nentries)} entries)`);
  key(600, C.amberSoft, C.amber, 'spare slots, allocated, empty');
  save('6.2-bytes-breakdown.svg', s);
}
