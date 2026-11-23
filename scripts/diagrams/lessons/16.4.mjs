// Diagrams for Lesson 16.4 (free-threaded Python). Run: node scripts/diagrams/lessons/16.4.mjs
// Numbers come from the lesson's demo (lesson_demo.py) run on python3.13t (GIL off, and
// PYTHON_GIL=1 on the same binary) and on the standard CPython 3.13 build, on one Apple-silicon Mac.
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

// ---------------------------------------------------------------- 1. scaling
{
  const s = new Sketch(880, 410, { title: 'Speed-up of 1, 2 and 4 CPU-bound threads, with the GIL on and off', seed: 1641 });
  s.text(440, 34, 'Speed-up with the same work per thread', { size: 26, weight: 700 });
  const y0 = 330, unit = 55;
  s.line(120, y0, 120, y0 - 4 * unit - 10, { color: C.muted });
  s.line(120, y0, 800, y0, { color: C.muted });
  for (let v = 0; v <= 4; v++) s.text(104, y0 - v * unit + 6, `${v}x`, { font: 'mono', size: 15, anchor: 'end', color: C.muted });
  s.line(120, y0 - 4 * unit, 800, y0 - 4 * unit, { color: C.muted, dash: '6 8' });
  s.text(790, y0 - 4 * unit - 12, 'ideal 4x', { size: 17, anchor: 'end', color: C.muted });
  // [label, free-threaded speed-up, GIL-on speed-up] from the demo run
  const groups = [['1 task', 1.0, 1.0], ['2 tasks', 2.01, 1.0], ['4 tasks', 3.07, 1.0]];
  groups.forEach(([label, free, gil], i) => {
    const cx = 230 + i * 220;
    const hf = free * unit, hg = gil * unit;
    s.rect(cx - 88, y0 - hg, 80, hg, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.rect(cx + 8, y0 - hf, 80, hf, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx - 48, y0 - hg - 10, `${gil.toFixed(2)}x`, { font: 'mono', size: 17, color: C.amber });
    s.text(cx + 48, y0 - hf - 10, `${free.toFixed(2)}x`, { font: 'mono', size: 17, color: C.blue });
    s.text(cx, y0 + 32, label, { size: 20 });
  });
  s.rect(150, 58, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(178, 73, 'free-threaded build (GIL off)', { size: 17, anchor: 'start' });
  s.rect(470, 58, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(498, 73, 'same binary, PYTHON_GIL=1', { size: 17, anchor: 'start' });
  s.text(440, 392, 'Each task: 2,000,000 loop iterations. One run per bar. 10-core Mac, 4 performance cores.', { size: 15, color: C.muted });
  save('16.4-scaling.svg', s);
}

// ---------------------------------------------------------------- 2. lost updates
{
  const s = new Sketch(880, 270, { title: 'Final value of a shared counter after four threads add 800,000 in total, five runs each build', seed: 1642 });
  s.text(440, 34, 'One shared counter, 800,000 increments in total', { size: 25, weight: 700 });
  const x0 = 230, scale = 520 / 800000;
  const X = (v) => x0 + v * scale;
  s.line(X(800000), 66, X(800000), 200, { color: C.muted, dash: '6 8' });
  s.text(X(800000), 222, 'expected 800,000', { size: 17, color: C.muted });
  // free-threaded: counted range across five runs, then the lost part
  s.text(x0, 84, 'counted in 5 runs: 348,362 to 360,927', { size: 17, anchor: 'start' });
  s.rect(x0, 94, X(348362) - x0, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.rect(X(348362), 94, X(360927) - X(348362), 36, { color: C.blue, width: 1.4 });
  s.rect(X(360927), 94, X(800000) - X(360927), 36, { color: C.rose, fillStyle: 'hachure' });
  s.text(x0 - 16, 118, 'no GIL', { size: 19, anchor: 'end' });
  s.text(X(580000), 152, 'lost: 55 to 56 percent of increments', { size: 17, color: C.rose });
  // GIL on: all five runs exact
  s.text(x0 - 16, 186, 'GIL on', { size: 19, anchor: 'end' });
  s.rect(x0, 166, X(800000) - x0, 36, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(x0 + 260, 190, '800,000 in all five runs', { size: 17 });
  s.text(440, 254, 'Same binary: python3.13t with and without PYTHON_GIL=1.', { size: 15, color: C.muted });
  save('16.4-lost-updates.svg', s);
}

// ---------------------------------------------------------------- 3. biased refcount
{
  const s = new Sketch(880, 420, { title: 'Biased reference counting: owner updates a local count, other threads update a shared count', seed: 1643 });
  s.text(440, 34, 'Biased reference counting, in one picture', { size: 26, weight: 700 });
  s.text(240, 80, 'one object, header fields (simplified)', { size: 18, color: C.muted });
  s.rect(60, 92, 360, 224, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid', width: 1.4 });
  s.text(78, 128, 'ob_tid', { font: 'mono', size: 17, weight: 700, anchor: 'start' });
  s.text(78, 150, 'owner thread id (set at creation)', { size: 16, anchor: 'start' });
  s.rect(78, 166, 324, 62, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(90, 192, 'ob_ref_local', { font: 'mono', size: 17, weight: 700, anchor: 'start' });
  s.text(90, 214, 'owner only: plain add', { size: 16, anchor: 'start' });
  s.rect(78, 240, 324, 62, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(90, 266, 'ob_ref_shared', { font: 'mono', size: 17, weight: 700, anchor: 'start' });
  s.text(90, 288, 'every other thread: atomic add', { size: 16, anchor: 'start' });
  s.rect(560, 92, 280, 62, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(700, 120, 'owner thread (made it)', { size: 18 });
  s.text(700, 142, 'no lock, no atomic', { size: 16, color: C.muted });
  s.rect(560, 250, 280, 62, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(700, 278, 'any other thread', { size: 18 });
  s.text(700, 300, 'atomic, slower under contention', { size: 16, color: C.muted });
  s.arrow(560, 124, 420, 186, { color: C.green });
  s.arrow(560, 282, 420, 270, { color: C.rose });
  s.text(480, 118, 'non-atomic', { size: 16, color: C.green });
  s.note(60, 344, 780, 60, ['When the shared count goes negative, the object is queued so its owner can merge the counts.'], { size: 17 });
  save('16.4-biased-refcount.svg', s);
}

// ---------------------------------------------------------------- 4. refcount cost
{
  const s = new Sketch(880, 390, { title: 'Time for 3 million reference updates per thread, owned versus shared objects, four threads', seed: 1644 });
  s.text(440, 34, 'Owned versus shared: 4 threads, 3 million reference updates each', { size: 25, weight: 700 });
  const y0 = 300, unit = 170; // px per second
  s.line(150, y0, 150, y0 - 1.1 * unit, { color: C.muted });
  s.line(150, y0, 800, y0, { color: C.muted });
  [0, 0.5, 1.0].forEach((v) => s.text(138, y0 - v * unit + 6, `${v} s`, { font: 'mono', size: 15, anchor: 'end', color: C.muted }));
  const groups = [['free-threaded (GIL off)', 0.042, 1.038, 280], ['GIL on (same binary)', 0.098, 0.181, 600]];
  groups.forEach(([label, own, shr, cx]) => {
    s.rect(cx - 88, y0 - own * unit, 80, own * unit, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 8, y0 - shr * unit, 80, shr * unit, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(cx - 48, y0 - own * unit - 10, `${own.toFixed(3)} s`, { font: 'mono', size: 16, color: C.blue });
    s.text(cx + 48, y0 - shr * unit - 10, `${shr.toFixed(3)} s`, { font: 'mono', size: 16, color: C.rose });
    s.text(cx, y0 + 32, label, { size: 19 });
  });
  s.rect(150, 58, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(178, 73, 'owned: each thread made its object', { size: 17, anchor: 'start' });
  s.rect(470, 58, 18, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(498, 73, 'shared: one object made by main', { size: 17, anchor: 'start' });
  s.text(440, 374, 'Best of three runs. The shared object is touched by all four workers.', { size: 15, color: C.muted });
  save('16.4-refcount-cost.svg', s);
}

// ---------------------------------------------------------------- 5. rollout
{
  const s = new Sketch(880, 300, { title: 'Status of the free-threaded build from PEP 703 and PEP 779', seed: 1645 });
  s.text(440, 34, 'From experiment to possible default', { size: 26, weight: 700 });
  const items = [
    ['24 Oct 2023', ['PEP 703 accepted.', 'Build flag removes', 'the GIL, with a gradual', 'rollout required.']],
    ['CPython 3.13', ['Experimental build,', 'python3.13t. Not the', 'default. GIL can be', 'turned back on.']],
    ['16 Jun 2025', ['PEP 779 accepted.', 'Phase II: supported', 'but optional, for', 'Python 3.14.']],
    ['Phase III', ['Not decided by', 'PEP 779. Making it', 'the default needs', 'a future PEP.']],
  ];
  items.forEach(([date, lines], i) => {
    const x = 30 + i * 210;
    s.text(x + 95, 92, date, { font: 'mono', size: 17, weight: 700 });
    s.note(x, 110, 190, 150, lines, { size: 16 });
  });
  s.text(440, 282, 'Phase II and III are the PEP 779 plan. Check the release notes for the status of your version.', { size: 15, color: C.muted });
  save('16.4-rollout.svg', s);
}
