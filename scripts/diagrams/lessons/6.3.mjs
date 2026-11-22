import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-06-dictionaries-hash-tables/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Probe sequences, using the same recurrences as the lesson's code.
const linear = (home, size, n) => Array.from({ length: n }, (_, k) => (home + k) % size);
const triangular = (home, size, n) => {
  const out = [];
  let off = 0;
  for (let k = 0; k < n; k++) { out.push((home + off) % size); off += k + 1; }
  return out;
};
const cpython = (h, mask, n) => {
  const out = [h & mask];
  let perturb = h;
  let i = h & mask;
  for (let k = 1; k < n; k++) {
    perturb = Math.floor(perturb / 32);
    i = (i * 5 + perturb + 1) & mask;
    out.push(i);
  }
  return out;
};

// 1. Probe orders for one home slot.
{
  const s = new Sketch(880, 410, { title: 'Probe orders for home slot 5', seed: 601 });
  s.text(440, 40, 'Same home slot 5, three probe orders', { size: 26, weight: 700 });
  s.text(440, 80, 'number above a slot = visit order; blue = home slot', { size: 19, color: C.muted });
  const rows = [['linear', linear(5, 8, 8)], ['triangular', triangular(5, 8, 8)], ['CPython 3.12', cpython(5, 7, 8)]];
  rows.forEach(([label, seq], r) => {
    const y = 130 + r * 100;
    s.text(40, y + 30, label, { anchor: 'start', size: 22 });
    for (let slot = 0; slot < 8; slot++) {
      const x = 200 + slot * 78;
      const k = seq.indexOf(slot) + 1;
      const home = slot === 5;
      s.rect(x, y, 70, 46, { color: home ? C.blue : C.ink, fill: home ? C.blueSoft : undefined, fillStyle: 'solid' });
      s.text(x + 35, y + 30, String(slot), { font: 'mono', size: 20 });
      s.text(x + 35, y - 12, String(k), { size: 20, color: C.muted, weight: 700 });
    }
  });
  save('6.3-probe-orders.svg', s);
}

// 2. Naive delete versus tombstone, for the search for key 11.
{
  const s = new Sketch(880, 580, { title: 'Search for key 11 after deleting key 2', seed: 602 });
  s.text(440, 40, 'Search for key 11 after deleting key 2', { size: 26, weight: 700 });
  const X = (i) => 60 + i * 78;
  const W = 62;
  const row = (y, label, cells) => {
    s.text(60, y + 100, label, { anchor: 'start', size: 21 });
    for (let i = 0; i < 10; i++) {
      const c = cells[i];
      const soft = c === 'key1' ? C.blueSoft : c === 'key11' ? C.greenSoft : c === 'tomb' ? C.roseSoft : undefined;
      s.rect(X(i), y, W, 50, { color: c ? C.ink : C.muted, fill: soft, fillStyle: 'solid', dash: c ? undefined : '6 8' });
      const text = { key1: '1', key11: '11', tomb: 'tomb' }[c];
      if (text) s.text(X(i) + 31, y + 33, text, { font: 'mono', size: 20 });
      s.text(X(i) + 31, y + 70, String(i), { font: 'mono', size: 16, color: C.muted });
    }
  };
  const top = new Array(10).fill(null); top[1] = 'key1'; top[3] = 'key11';
  const bot = new Array(10).fill(null); bot[1] = 'key1'; bot[2] = 'tomb'; bot[3] = 'key11';
  row(150, 'naive delete: slot 2 set to empty', top);
  row(330, 'tombstone: slot 2 marked deleted', bot);
  // top: probe 1 -> 2, then stop at the empty slot
  s.curveArrow(X(1) + 31, 146, (X(1) + X(2)) / 2 + 31, 108, X(2) + 31, 146, { color: C.rose });
  s.text(X(2) + 31, 104, 'empty: stop', { size: 18, color: C.rose });
  // bottom: probe 1 -> 2 -> 3, found at slot 3
  s.curveArrow(X(1) + 31, 326, (X(1) + X(2)) / 2 + 31, 288, X(2) + 31, 326, { color: C.blue });
  s.curveArrow(X(2) + 31, 326, (X(2) + X(3)) / 2 + 31, 288, X(3) + 31, 326, { color: C.blue });
  s.text(X(3) + 31, 284, 'found', { size: 18, color: C.green, weight: 700 });
  s.note(180, 468, 520, 96, [
    'churn test: 512 live keys, 1,000 delete and insert steps',
    'naive delete: 102 live keys become unreachable',
    'tombstones: 0 unreachable, 2 rebuilds',
  ], { size: 19 });
  save('6.3-delete-bug.svg', s);
}

// 3. Reachable slots from home 0, triangular probing.
{
  const s = new Sketch(880, 440, { title: 'Reachable slots from home 0', seed: 603 });
  s.text(440, 40, 'Which slots a triangular probe from slot 0 can reach', { size: 26, weight: 700 });
  const X = (i) => 60 + i * 78;
  const draw = (size, y, label) => {
    const first = new Map();
    triangular(0, size, 40).forEach((slot, k) => { if (!first.has(slot)) first.set(slot, k + 1); });
    s.text(60, y - 46, label, { anchor: 'start', size: 21 });
    for (let i = 0; i < size; i++) {
      const hit = first.has(i);
      s.rect(X(i), y, 62, 50, { color: hit ? C.blue : C.muted, fill: hit ? C.blueSoft : undefined, fillStyle: 'solid', dash: hit ? undefined : '6 8' });
      s.text(X(i) + 31, y + 70, String(i), { font: 'mono', size: 16, color: C.muted });
      if (hit) s.text(X(i) + 31, y - 10, `#${first.get(i)}`, { size: 19, color: C.muted, weight: 700 });
    }
  };
  draw(10, 130, 'size 10 (old lesson): 6 of 10 reachable');
  draw(8, 270, 'size 8 (power of two): 8 of 8 reachable');
  s.note(60, 362, 620, 64, [
    'A seventh key with home slot 0 finds no reachable free slot,',
    "so the old lesson's insert loop never ends.",
  ], { size: 19 });
  save('6.3-reachable-slots.svg', s);
}

// 4. Measured unsuccessful-search probes, log scale. Values copied from the measurement run
//    printed in the lesson (standard library script, m = 16384, 4 tables x 20000 misses).
{
  const s = new Sketch(880, 440, { title: 'Probes per unsuccessful search', seed: 604 });
  s.text(440, 40, 'Probes per unsuccessful search, measured', { size: 26, weight: 700 });
  const y0 = 370;
  const per = 140;                       // pixels per decade on the log axis
  const Y = (v) => y0 - per * Math.log10(v);
  const legend = [['linear', C.rose, C.roseSoft], ['triangular', C.amber, C.amberSoft], ['CPython', C.blue, C.blueSoft], ['uniform formula', C.muted, undefined]];
  legend.forEach(([label, col, soft], i) => {
    const x = 120 + i * 180;
    s.rect(x, 62, 18, 18, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 28, 78, label, { anchor: 'start', size: 19 });
  });
  [1, 10, 100].forEach((v) => {
    s.line(110, Y(v), 840, Y(v), { color: C.muted, width: 1, dash: '4 8' });
    s.text(96, Y(v) + 6, String(v), { font: 'mono', size: 17, anchor: 'end', color: C.muted });
  });
  s.text(40, 230, 'probes (log scale)', { size: 19, rotate: -90 });
  const loads = ['0.25', '0.5', '0.75', '0.9'];
  const data = {
    linear: [1.39, 2.48, 8.42, 44.56],
    triangular: [1.37, 2.15, 4.63, 12.00],
    cpython: [1.33, 2.00, 4.00, 10.27],
    uniform: [1.33, 2.00, 4.00, 10.00],
  };
  const style = { linear: [C.rose, C.roseSoft], triangular: [C.amber, C.amberSoft], cpython: [C.blue, C.blueSoft], uniform: [C.muted, undefined] };
  loads.forEach((a, g) => {
    const xg = 210 + g * 170;
    ['linear', 'triangular', 'cpython', 'uniform'].forEach((name, j) => {
      const v = data[name][g];
      const x = xg - 66 + j * 36;
      const [col, soft] = style[name];
      s.rect(x, Y(v), 30, y0 - Y(v), { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + 15, Y(v) - 8, v < 10 ? v.toFixed(2) : v.toFixed(1), { font: 'mono', size: 13 });
    });
    s.text(xg, 400, `load ${a}`, { size: 20 });
  });
  s.line(110, y0, 840, y0, { color: C.ink });
  s.text(440, 428, 'm = 16,384 slots; each bar averages 4 tables of 20,000 misses', { size: 17, color: C.muted });
  save('6.3-probe-cost.svg', s);
}
