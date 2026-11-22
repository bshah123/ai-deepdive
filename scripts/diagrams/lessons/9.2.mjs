import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-09-iterators-generators/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below are from scripts/diagrams/lessons/9.2_experiment.py (CPython 3.12.13).

// 1. Lifecycle: GEN_CREATED -> GEN_SUSPENDED -> GEN_CLOSED
{
  const s = new Sketch(880, 330, { title: 'Generator lifecycle: created, suspended, closed', seed: 901 });
  s.text(440, 34, 'One generator, three states', { size: 24, weight: 700 });
  s.rect(40, 150, 230, 96, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(155, 184, ['GEN_CREATED', 'after count_up_to(3)'], { size: 17, font: 'mono' });
  s.rect(325, 150, 230, 96, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 178, ["GEN_SUSPENDED", "paused at a yield", "next() resumes it"], { size: 17, font: "mono" });
  s.rect(610, 150, 230, 96, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(725, 184, ['GEN_CLOSED', 'gi_frame is None'], { size: 17, font: 'mono' });
  s.arrow(272, 198, 322, 198, { color: C.ink });
  s.text(297, 182, 'next()', { size: 16 });
  s.arrow(558, 198, 606, 198, { color: C.ink });
  s.text(582, 182, 'end', { size: 16 });
  s.text(440, 296, 'Calling count_up_to(3) only builds the object. The body runs at the first next().', { size: 17, color: C.muted });
  save('9.2-lifecycle.svg', s);
}

// 2. Frame: ordinary call versus generator
{
  const s = new Sketch(880, 340, { title: 'A suspended generator keeps its frame alive', seed: 902 });
  s.text(440, 34, 'A suspended generator keeps its frame alive', { size: 24, weight: 700 });
  s.rect(40, 70, 380, 240, { color: C.muted, width: 1.2, dash: '6 8' });
  s.text(230, 102, 'Ordinary function call', { size: 20, weight: 700 });
  s.rect(70, 116, 320, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(230, 143, 'frame made: count = 0', { font: 'mono', size: 16 });
  s.arrow(230, 162, 230, 184, { color: C.muted });
  s.rect(70, 186, 320, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(230, 213, 'function returns', { font: 'mono', size: 16 });
  s.arrow(230, 232, 230, 254, { color: C.muted });
  s.rect(70, 256, 320, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(230, 283, 'frame freed, locals gone', { font: 'mono', size: 16 });

  s.rect(460, 70, 380, 240, { color: C.muted, width: 1.2, dash: '6 8' });
  s.text(650, 102, 'Generator', { size: 20, weight: 700 });
  s.rect(480, 116, 320, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(640, 143, 'next #1: yield 0 (count=0)', { font: 'mono', size: 15 });
  s.arrow(640, 162, 640, 184, { color: C.muted });
  s.text(652, 178, 'same frame', { anchor: 'start', size: 15, color: C.muted });
  s.rect(480, 186, 320, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(640, 213, 'next #2: yield 1 (count=1)', { font: 'mono', size: 15 });
  s.arrow(640, 232, 640, 254, { color: C.muted });
  s.text(652, 248, 'same frame', { anchor: 'start', size: 15, color: C.muted });
  s.rect(480, 256, 320, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(640, 283, 'next #3: yield 2 (count=2)', { font: 'mono', size: 15 });

  s.text(440, 330, 'Left: the frame is freed on return. Right: the same frame survives between next() calls.', { size: 17, color: C.muted });
  save('9.2-frame.svg', s);
}

// 3. Lazy pipeline: event order, one item in flight
{
  const s = new Sketch(880, 330, { title: 'Lazy pipeline event order', seed: 903 });
  s.text(440, 34, 'Lazy pipeline: one item in flight at a time', { size: 24, weight: 700 });
  for (let i = 0; i < 9; i++) s.text(220 + i * 74, 80, String(i + 1), { size: 17, color: C.muted });
  s.text(40, 80, 'step', { anchor: 'start', size: 16, color: C.muted });
  const lanes = [
    { name: 'source(3)', y: 150, color: C.blue, soft: C.blueSoft, cells: [[0, 'yields 0'], [3, 'yields 1'], [6, 'yields 2']] },
    { name: 'square', y: 210, color: C.amber, soft: C.amberSoft, cells: [[1, 'gets 0'], [4, 'gets 1'], [7, 'gets 2']] },
    { name: 'consumer', y: 270, color: C.green, soft: C.greenSoft, cells: [[2, 'gets 0'], [5, 'gets 1'], [8, 'gets 4']] },
  ];
  for (const lane of lanes) {
    s.text(40, lane.y + 6, lane.name, { anchor: 'start', size: 18, weight: 700 });
    for (const [col, label] of lane.cells) {
      const cx = 220 + col * 74;
      s.rect(cx - 35, lane.y - 20, 70, 40, { color: lane.color, fill: lane.soft, fillStyle: 'solid' });
      s.text(cx, lane.y + 6, label, { size: 15, font: 'mono' });
    }
  }
  s.text(440, 318, 'Each value crosses all three stages before the next value is read from source.', { size: 17, color: C.muted });
  save('9.2-pipeline.svg', s);
}

// 4. Peak memory: list versus generator (tracemalloc, measured)
{
  const H = 430, base = 350, maxH = 230;
  const s = new Sketch(880, H, { title: 'Peak memory: list versus generator', seed: 904 });
  s.text(440, 34, 'Peak memory of sum() over N squares', { size: 24, weight: 700 });
  s.rect(90, 60, 18, 18, { color: C.amber, fill: C.amber, fillStyle: 'hachure' });
  s.text(116, 74, 'list: sum([x*x for x in range(N)])', { anchor: 'start', size: 16 });
  s.rect(90, 88, 18, 18, { color: C.green, fill: C.green, fillStyle: 'hachure' });
  s.text(116, 102, 'generator: sum(x*x for x in range(N))', { anchor: 'start', size: 16 });
  const data = [
    { n: 'N = 1,000', cx: 230, list: 40328, gen: 464, lt: '40,328 B', gt: '464 B' },
    { n: 'N = 100,000', cx: 470, list: 4000456, gen: 464, lt: '4,000,456 B', gt: '464 B' },
    { n: 'N = 1,000,000', cx: 710, list: 40448200, gen: 464, lt: '40,448,200 B', gt: '464 B' },
  ];
  const k = maxH / 40448200;
  s.line(90, base, 800, base, { color: C.ink });
  for (const d of data) {
    const hl = Math.max(d.list * k, 2);
    const hg = Math.max(d.gen * k, 2);
    s.rect(d.cx - 84, base - hl, 80, hl, { color: C.amber, fill: C.amber, fillStyle: 'hachure' });
    s.rect(d.cx + 4, base - hg, 80, hg, { color: C.green, fill: C.green, fillStyle: 'hachure' });
    s.text(d.cx - 44, base - hl - 12, d.lt, { size: 16 });
    s.text(d.cx + 44, base - hg - 12, d.gt, { size: 16 });
    s.text(d.cx, 384, d.n, { size: 18, weight: 700 });
  }
  s.text(440, 418, 'One linear scale. Bars under 2 px are drawn at 2 px; the labels carry the values.', { size: 16, color: C.muted });
  save('9.2-memory.svg', s);
}
