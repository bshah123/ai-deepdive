import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below is read from the experiment output (2.10_experiment.py -> 2.10_data.json).
const D = JSON.parse(readFileSync(join(HERE, '2.10_data.json'), 'utf8'));
const int = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const bytes = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} MB` : `${int(n)} B`);

// 1. Two situations that look alike
{
  const s = new Sketch(880, 320, { title: 'Reachable growth versus an unreachable cycle', seed: 201 });
  s.text(440, 34, 'Two situations that look alike', { size: 26, weight: 700 });
  s.line(440, 70, 440, 300, { color: C.muted, dash: '6 8' });

  s.text(220, 80, 'Still reachable', { size: 22, weight: 700, color: C.amber });
  s.rect(110, 100, 220, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(220, 128, 'CACHE  (global dict)', { font: 'mono', size: 16 });
  for (let i = 0; i < 5; i++) {
    const x = 60 + i * 70;
    s.arrow(220, 146, x + 28, 206, { color: C.muted });
    s.rect(x, 210, 56, 36, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 28, 233, '1 KiB', { font: 'mono', size: 15 });
  }
  s.text(220, 282, 'gc.collect() cannot free these', { size: 20, color: C.muted });

  s.text(660, 80, 'Unreachable cycle', { size: 22, weight: 700, color: C.green });
  s.rect(560, 110, 80, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(600, 138, 'a', { font: 'mono', size: 18 });
  s.rect(700, 110, 80, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(740, 138, 'b', { font: 'mono', size: 18 });
  s.arrow(640, 128, 698, 128, { color: C.blue });
  s.curveArrow(700, 160, 670, 204, 642, 160, { color: C.blue });
  s.text(660, 232, 'names deleted: each refcount stays 1', { size: 18, color: C.rose });
  s.text(660, 282, 'gc.collect() frees both', { size: 20, color: C.muted });
  save('2.10-three-leaks.svg', s);
}

// 2. Held bytes, to scale
{
  const s = new Sketch(880, 340, { title: 'Bar chart of bytes held by acyclic and cyclic garbage', seed: 202 });
  s.text(440, 36, `Held memory, ${int(D.A_N_pairs)} pairs of Node objects`, { size: 24, weight: 700 });
  s.text(440, 64, 'bars to scale; the two small values are under one pixel', { size: 17, color: C.muted });
  const base = 290, maxH = 160, maxV = D.A_cyclic_held_before_collect;
  const bars = [
    ['acyclic pairs (refcount frees them)', D.A_acyclic_held, C.green],
    ['cyclic pairs, before gc.collect()', D.A_cyclic_held_before_collect, C.rose],
    ['cyclic pairs, after gc.collect()', D.A_cyclic_held_after_collect, C.blue],
  ];
  bars.forEach(([label, v, col], i) => {
    const x = 120 + i * 260, h = Math.max(2, (v / maxV) * maxH);
    s.rect(x, base - h, 160, h, { color: col, fill: col === C.rose ? C.roseSoft : C.greenSoft, fillStyle: 'solid' });
    s.text(x + 80, base - h - 14, bytes(v), { size: 18, weight: 700 });
    s.text(x + 80, base + 26, label, { size: 17 });
  });
  s.line(80, base, 800, base, { color: C.ink });
  save('2.10-cycle-bytes.svg', s);
}

// 3. What the generation-0 counter does
{
  const s = new Sketch(880, 250, { title: 'Flow of gc counts around one explicit collection', seed: 203 });
  s.text(440, 34, 'The generation-0 counter', { size: 26, weight: 700 });
  const boxes = [
    ['make_pairs(10)', 'cyclic'],
    ['gc.get_count()', `= (${D.B_count_after_10_pairs.join(', ')})`],
    ['gc.collect()', `returns ${D.B_collect_return_10_pairs}`],
    ['gc.get_count()', `= (${D.B_count_after_collect.join(', ')})`],
  ];
  boxes.forEach(([a, b], i) => {
    const x = 30 + i * 210;
    s.rect(x, 80, 170, 96, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 85, 116, a, { font: 'mono', size: 16 });
    s.text(x + 85, 148, b, { font: 'mono', size: 16 });
    if (i < 3) s.arrow(x + 176, 128, x + 204, 128, { color: C.muted });
  });
  s.text(440, 218, 'count0 = allocations minus deallocations of tracked containers since the last collection', { size: 17, color: C.muted });
  save('2.10-gc-counts.svg', s);
}

// 4. Strong versus weak back-pointer
{
  const s = new Sketch(880, 300, { title: 'Strong and weak parent back-pointers compared', seed: 204 });
  s.line(440, 60, 440, 280, { color: C.muted, dash: '6 8' });
  s.text(220, 78, 'Strong back-pointer', { size: 22, weight: 700, color: C.rose });
  s.rect(120, 110, 90, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(165, 138, 'parent', { font: 'mono', size: 16 });
  s.rect(250, 110, 90, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(295, 138, 'child', { font: 'mono', size: 16 });
  s.arrow(212, 132, 248, 132, { color: C.rose });
  s.curveArrow(295, 158, 210, 202, 165, 158, { color: C.rose });
  s.text(220, 232, `${int(D.C_N_families ?? D.A_N_pairs)} families: ${int(D.C_strong_backref_held_before)} B held`, { size: 19 });
  s.text(220, 262, 'after gc.collect(): about 0 B', { size: 19, color: C.muted });

  s.text(660, 78, 'Weak back-pointer', { size: 22, weight: 700, color: C.green });
  s.rect(560, 110, 90, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(605, 138, 'parent', { font: 'mono', size: 16 });
  s.rect(690, 110, 90, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(735, 138, 'child', { font: 'mono', size: 16 });
  s.arrow(652, 132, 688, 132, { color: C.green });
  s.curveArrow(735, 158, 650, 202, 605, 158, { color: C.green });
  s.text(660, 232, `${int(D.C_N_families ?? D.A_N_pairs)} families: ${int(D.C_weak_backref_held)} B held`, { size: 19 });
  s.text(660, 262, 'freed by reference counting, no gc needed', { size: 19, color: C.muted });
  save('2.10-weakref-backptr.svg', s);
}

// 5. Unbounded versus bounded cache
{
  const s = new Sketch(880, 380, { title: 'Memory held by an unbounded dict versus lru_cache', seed: 205 });
  s.text(440, 34, 'Memory held after gc.collect(), by requests handled', { size: 24, weight: 700 });
  s.text(300, 76, 'unbounded dict', { size: 18, color: C.rose });
  s.text(560, 76, `lru_cache(maxsize=${D.F_bounded_cache_len}): flat`, { size: 18, color: C.green });
  const base = 320, top = 200, maxV = D.F_unbounded_held['8000'];
  const xs = [150, 330, 510, 690];
  const y = (v) => base - (v / maxV) * top;
  const unb = D.F_checkpoints.map((n) => D.F_unbounded_held[String(n)]);
  const bnd = D.F_checkpoints.map((n) => D.F_bounded_held[String(n)]);
  s.line(120, base, 760, base, { color: C.ink });
  s.text(110, base + 5, '0', { size: 16, anchor: 'end', color: C.muted });
  s.text(110, base - top + 5, bytes(maxV), { size: 16, anchor: 'end', color: C.muted });
  xs.forEach((x, i) => {
    s.line(x, y(unb[i]), i < 3 ? xs[i + 1] : x, i < 3 ? y(unb[i + 1]) : y(unb[i]), { color: C.rose, width: 3 });
  });
  xs.forEach((x, i) => {
    if (i < 3) s.line(x, y(bnd[i]), xs[i + 1], y(bnd[i + 1]), { color: C.green, width: 3 });
  });
  xs.forEach((x, i) => {
    s.circle(x, y(unb[i]), 10, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(x, y(unb[i]) - 16, bytes(unb[i]), { size: 16, color: C.rose });
    s.circle(x, y(bnd[i]), 10, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x, base + 28, `${int(D.F_checkpoints[i])}`, { size: 17 });
  });
  s.text(440, 364, 'requests, each with a new key; the bounded cache holds 256 results', { size: 17, color: C.muted });
  save('2.10-unbounded-vs-bounded.svg', s);
}
