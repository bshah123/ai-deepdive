import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-06-dictionaries-hash-tables/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Growth model of CPython 3.12 dictobject.c: usable = 2*slots/3 (floored);
// on an insert into a full table, new slots = smallest power of two >= 3*used, minimum 8.
const newSlots = (used) => { let s = 8; while (s < 3 * used) s *= 2; return s; };
const epochs = [];                       // {slots, start, end} = inserts served by one table
{
  let slots = 8, used = 0, usable = 5, start = 1;
  for (let n = 1; n <= 1000; n++) {
    if (used === usable) {
      epochs.push({ slots, start, end: n - 1 });
      slots = newSlots(used); usable = Math.floor(2 * slots / 3); start = n;
    }
    used++;
  }
  epochs.push({ slots, start, end: 1000 });
}
// Must equal the resize points measured with sys.getsizeof (6.4 experiment, CPython 3.12.13)
const measured = [6, 11, 22, 43, 86, 171, 342, 683];
const modelled = epochs.slice(1).map((e) => e.start);
if (JSON.stringify(modelled.slice(0, measured.length)) !== JSON.stringify(measured)) throw new Error('model != measured');

// 1. Load factor sawtooth, log-scaled x axis
{
  const W = 880, H = 340, X = (n) => 110 + Math.log10(n) / 3 * 730, Y = (l) => 280 - l / 0.8 * 220;
  const s = new Sketch(W, H, { title: 'Load factor of a Python dict against the number of inserts: it climbs to about two thirds, then a resize drops it to about one third', seed: 641 });
  s.text(440, 30, 'Load factor = entries / slots: climbs to 2/3, then a resize drops it', { size: 20, weight: 700 });
  s.line(110, 280, 840, 280, { color: C.ink });
  s.line(110, 60, 110, 280, { color: C.ink });
  for (const [n, lab] of [[1, '1'], [10, '10'], [100, '100'], [1000, '1000']]) {
    s.line(X(n), 280, X(n), 286, { color: C.ink });
    s.text(X(n), 306, lab, { font: 'mono', size: 16 });
  }
  s.text(440, 334, 'inserts so far (log scale)', { size: 17, color: C.muted });
  for (const [l, lab] of [[0, '0'], [1 / 3, '1/3'], [2 / 3, '2/3']]) s.text(96, Y(l) + 6, lab, { font: 'mono', size: 15, anchor: 'end' });
  s.line(110, Y(2 / 3), 840, Y(2 / 3), { color: C.muted, dash: '6 8' });
  s.text(118, Y(2 / 3) - 10, 'usable limit 2/3', { size: 16, anchor: 'start', color: C.muted });
  epochs.forEach((e, k) => {
    s.line(X(e.start), Y(e.start / e.slots), X(e.end), Y(e.end / e.slots), { color: C.blue, width: 3 });
    if (k > 0) {
      const prev = epochs[k - 1];
      s.line(X(e.start), Y(prev.end / prev.slots), X(e.start), Y(e.start / e.slots), { color: C.rose, dash: '4 6' });
      s.text(X(e.start), 80, String(e.start), { font: 'mono', size: 15, color: C.rose });
    }
  });
  save('6.4-resize-sawtooth.svg', s);
}

// 2. Worked example: the 6th insert into an 8-slot table
{
  const s = new Sketch(880, 330, { title: 'The sixth insert: the 8-slot table is full at 5 entries, so it is replaced by a 16-slot table holding 6 entries', seed: 642 });
  s.text(440, 34, 'The 6th insert into a dict with 8 slots', { size: 24, weight: 700 });
  s.text(190, 74, 'before: 8 slots, 5 used', { size: 19 });
  for (let i = 0; i < 8; i++) {
    if (i < 5) s.rect(30 + i * 40, 90, 40, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    else s.rect(30 + i * 40, 90, 40, 40, { color: C.muted });
    s.text(50 + i * 40, 158, String(i), { font: 'mono', size: 15, color: C.muted });
  }
  s.text(190, 190, 'usable = 5: no room for a 6th', { size: 17, color: C.rose });
  s.arrow(372, 110, 470, 110, { color: C.ink });
  s.text(421, 96, 'resize', { size: 18, color: C.amber });
  s.text(660, 74, 'after: 16 slots, 6 used', { size: 19 });
  for (let i = 0; i < 16; i++) {
    const row = Math.floor(i / 8), col = i % 8;
    const filled = i < 6;
    s.rect(500 + col * 40, 90 + row * 48, 40, 40, filled ? { color: C.green, fill: C.greenSoft, fillStyle: 'solid' } : { color: C.muted });
  }
  s.text(660, 236, 'filled cells are illustrative: real slots depend on hashes', { size: 15, color: C.muted });
  s.note(120, 250, 640, 70, ['new slots: smallest power of 2 >= 3 x 5 = 15, so 16', 'usable = 2 x 16 / 3, rounded down = 10; load = 6 / 16 = 0.375'], { size: 18 });
  save('6.4-worked-insert.svg', s);
}

// 3. Copy cost: entries moved by resizes per insert (measured in the 6.4 experiment)
{
  const data = [['1,000', 1356, 1000], ['10,000', 10912, 10000], ['100,000', 174750, 100000], ['1,000,000', 1398087, 1000000]];
  const s = new Sketch(880, 330, { title: 'Entries copied by resizes, divided by the number of inserts: between 1.09 and 1.75 for four runs, below 2 in every case', seed: 643 });
  s.text(440, 34, 'Entries moved by resizes, per insert (measured)', { size: 22, weight: 700 });
  const base = 280, scale = 100;              // 1 unit = 100 px; bound = 2
  s.line(100, base, 800, base, { color: C.ink });
  s.line(100, base - 2 * scale, 800, base - 2 * scale, { color: C.rose, dash: '6 8' });
  s.text(800, base - 2 * scale - 12, 'bound 2 (geometric series)', { size: 17, anchor: 'end', color: C.rose });
  data.forEach(([lab, moved, n], i) => {
    const v = moved / n, cx = 200 + i * 160, top = base - v * scale;
    s.rect(cx - 45, top, 90, v * scale, { color: C.blue });
    s.text(cx, top - 10, v.toFixed(2), { font: 'mono', size: 18 });
    s.text(cx, 314, 'N = ' + lab, { font: 'mono', size: 15, color: C.muted });
  });
  save('6.4-copy-ratio.svg', s);
}

// 4. Deleting does not shrink; churn with few live keys does
{
  const bars = [['36952 B', 36952, '1000 keys', 'inserted'], ['36952 B', 36952, '3 keys', 'deleted 997'], ['36952 B', 36952, '403 keys', 're-inserted 400'], ['352 B', 352, '3 keys', 'churned 963']];
  const s = new Sketch(880, 340, { title: 'sys.getsizeof of a dict: unchanged after deleting 997 keys, and falls from 36952 to 352 bytes after churn with 3 keys live', seed: 644 });
  s.text(440, 34, 'sys.getsizeof(dict) after each step (bytes, measured)', { size: 22, weight: 700 });
  const base = 270, scale = 200 / 36952;
  s.line(90, base, 800, base, { color: C.ink });
  bars.forEach(([val, v, l1, l2], i) => {
    const cx = 170 + i * 180, h = Math.max(v * scale, 2);
    s.rect(cx - 55, base - h, 110, h, { color: i === 3 ? C.green : C.blue, fill: i === 3 ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, val, { font: 'mono', size: 18 });
    s.text(cx, 300, l1, { size: 17 });
    s.text(cx, 322, l2, { size: 15, color: C.muted });
  });
  save('6.4-shrink.svg', s);
}
console.log('6.4 diagrams written; epochs:', JSON.stringify(epochs.map((e) => [e.slots, e.start, e.end])));
