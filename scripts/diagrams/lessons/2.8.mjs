// Lesson 2.8 diagrams. Numbers come from the four code blocks in 2.8-garbage-collection.md
// (CPython 3.12.13), copied by hand: b1 refcount 3 and gc.collect() 2 and 3; b3 generation counts;
// b4 peak live 200000 (gc disabled) and 762 (gc enabled).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Refcount frees a chain at once; a cycle keeps its own count above zero.
{
  const s = new Sketch(880, 360, { title: 'A chain is freed when its names go; a two-object cycle keeps both counts above zero', seed: 801 });
  s.text(440, 34, 'Refcount frees a chain; it cannot free a cycle', { size: 26, weight: 700 });
  s.text(230, 84, 'chain: a -> b', { size: 20, weight: 700 });
  s.rect(70, 110, 100, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 142, 'a', { font: 'mono', size: 18 });
  s.rect(250, 110, 100, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(300, 142, 'b', { font: 'mono', size: 18 });
  s.arrow(170, 135, 248, 135, { color: C.muted });
  s.text(230, 206, 'del a: count(a) = 0, freed', { size: 17 });
  s.text(230, 234, 'then count(b) = 0, freed', { size: 17 });

  s.text(650, 84, 'cycle: x <-> y', { size: 20, weight: 700 });
  s.rect(500, 110, 100, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(550, 142, 'x', { font: 'mono', size: 18 });
  s.rect(700, 110, 100, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(750, 142, 'y', { font: 'mono', size: 18 });
  s.arrow(602, 127, 698, 127, { color: C.muted });
  s.arrow(698, 149, 602, 149, { color: C.muted });
  s.text(650, 206, 'after del x, y: count(x) = 1', { size: 17 });
  s.text(650, 234, 'count(y) = 1, neither is zero', { size: 17 });

  s.note(150, 268, 580, 56, ['only the cyclic GC (gc.collect) can free the pair'], { size: 19 });
  save('2.8-refcount-vs-cycle.svg', s);
}

// 2. Three generations: new containers enter gen0; survivors are promoted.
{
  const s = new Sketch(880, 330, { title: 'The cyclic GC keeps three lists of container objects, youngest first', seed: 802 });
  s.text(440, 34, 'Three generations, youngest first', { size: 26, weight: 700 });
  s.text(170, 84, 'new container', { size: 18 });
  s.arrow(170, 96, 170, 118, { color: C.muted });
  s.rect(60, 120, 220, 112, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(170, 152, 'gen0 (young)', { size: 20, weight: 700 });
  s.text(170, 184, ['collect when allocations', 'minus deallocations > 700'], { size: 16 });
  s.rect(330, 120, 220, 112, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 152, 'gen1', { size: 20, weight: 700 });
  s.text(440, 184, ['examined when gen0 has run', 'more than 10 times (threshold1)'], { size: 16 });
  s.rect(600, 120, 220, 112, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(710, 152, 'gen2 (oldest)', { size: 20, weight: 700 });
  s.text(710, 184, ['collected least often,', 'a full pass'], { size: 16 });

  s.arrow(284, 176, 326, 176, { color: C.muted });
  s.text(305, 166, 'survive', { size: 15 });
  s.arrow(554, 176, 596, 176, { color: C.muted });
  s.text(575, 166, 'survive', { size: 15 });
  s.note(120, 262, 640, 46, ['default thresholds on 3.12: (700, 10, 10)'], { size: 19 });
  save('2.8-generations.svg', s);
}

// 3. Collections triggered while N lists stay alive (measured).
{
  const s = new Sketch(880, 370, { title: 'Collections while N containers stay alive (CPython 3.12)', seed: 803 });
  s.text(440, 34, 'Collections while N containers stay alive', { size: 26, weight: 700 });
  const k = 180 / 260;       // px per collection, tallest bar 260
  const base = 300;
  s.line(110, base, 800, base, { color: C.muted });
  s.text(74, 205, 'collections', { size: 17, rotate: -90 });
  s.rect(120, 92, 16, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(144, 106, 'gen0', { size: 16, anchor: 'start' });
  s.rect(200, 92, 16, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(224, 106, 'gen1', { size: 16, anchor: 'start' });
  s.rect(280, 92, 16, 16, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(304, 106, 'gen2', { size: 16, anchor: 'start' });
  const groups = [
    { x0: 170, label: '7,000 lists', v: [9, 0, 0] },
    { x0: 400, label: '70,000 lists', v: [91, 8, 0] },
    { x0: 630, label: '200,000 lists', v: [260, 23, 2] },
  ];
  const cols = [[C.blue, C.blueSoft], [C.amber, C.amberSoft], [C.green, C.greenSoft]];
  for (const g of groups) {
    g.v.forEach((n, i) => {
      const x = g.x0 + i * 50, h = n * k;
      if (h > 0) s.rect(x, base - h, 40, h, { color: cols[i][0], fill: cols[i][1], fillStyle: 'solid' });
      s.text(x + 20, base - h - 8, String(n), { size: 16 });
    });
    s.text(g.x0 + 70, 332, g.label, { size: 17 });
  }
  s.text(440, 362, 'Counts from gc.callbacks; the same program prints these on every run', { size: 17 });
  save('2.8-collections.svg', s);
}

// 4. Bounded memory: the same 100,000 cycles with the cyclic GC off and on.
{
  const s = new Sketch(880, 360, { title: 'Live objects after 100,000 two-object cycles, GC off vs on', seed: 804 });
  s.text(440, 34, 'Live objects after 100,000 two-object cycles', { size: 26, weight: 700 });
  const base = 290, k = 200 / 200000;
  s.line(120, base, 760, base, { color: C.muted });
  s.rect(200, base - 200000 * k, 140, 200000 * k, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(270, base - 200000 * k - 10, '200,000 live', { size: 18 });
  s.rect(520, base - 762 * k, 140, Math.max(762 * k, 1), { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(590, base - 8, 'peak 762', { size: 18 });
  s.text(270, 326, 'gc.disable(): all cycles kept', { size: 17 });
  s.text(590, 326, 'gc enabled: peak live', { size: 17 });
  s.text(440, 352, 'Same program. Only the cyclic collector differs.', { size: 17 });
  save('2.8-bounded-memory.svg', s);
}
