import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-12-exceptions-debugging/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '12.3_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');

// Guard: the hand-drawn tree below must match the recorded call order.
const calls = D.fib3.events.filter((e) => e[1] === 'call').map((e) => e[2]);
if (calls.join(',') !== '3,2,1,0,1') throw new Error('fib(3) call order changed: ' + calls.join(','));

// 1. Two hooks on one event stream
{
  const s = new Sketch(880, 360, { title: 'The interpreter emits events; cProfile and sys.settrace each take a different subset', seed: 1201 });
  s.text(440, 34, 'One event stream, two hooks', { size: 26, weight: 700 });
  s.rect(280, 56, 320, 50, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 88, 'bytecode runs; the interpreter emits events', { size: 17 });
  s.arrow(370, 108, 190, 170, { color: C.muted });
  s.arrow(510, 108, 690, 170, { color: C.muted });
  s.rect(40, 170, 320, 140, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(200, 200, 'cProfile', { size: 24, weight: 700 });
  s.text(200, 234, 'receives: call, return', { size: 17 });
  s.text(200, 262, 'keeps: call counts, times', { size: 17 });
  s.text(200, 290, `cost: about ${D.overhead_fib22.cProfile.multiplier}x here`, { size: 17 });
  s.rect(520, 170, 320, 140, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(680, 200, 'sys.settrace', { size: 24, weight: 700 });
  s.text(680, 234, 'receives: call, line, return', { size: 17 });
  s.text(680, 262, 'keeps: whatever your function writes', { size: 17 });
  s.text(680, 290, 'cost: grows with what it does', { size: 17 });
  s.text(440, 338, 'Both see calls. Only sys.settrace sees every line.', { size: 19 });
  save('12.3-hooks.svg', s);
}

// 2. Call tree of fib(3), numbered in call order
{
  const s = new Sketch(880, 380, { title: 'Call tree of fib(3) with the order in which the five calls start', seed: 1202 });
  s.text(440, 34, 'fib(3): five calls, numbered in start order', { size: 26, weight: 700 });
  const node = (x, y, label, ret, hot) =>
    s.rect(x - 60, y - 28, 120, 56, hot
      ? { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' }
      : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  const put = (x, y, label, ret, hot) => {
    node(x, y, label, ret, hot);
    s.text(x, y - 4, label, { font: 'mono', size: 16 });
    s.text(x, y + 18, `returns ${ret}`, { size: 16 });
  };
  s.line(440, 128, 270, 172, { color: C.muted });
  s.line(440, 128, 610, 172, { color: C.muted });
  s.line(270, 228, 170, 282, { color: C.muted });
  s.line(270, 228, 370, 282, { color: C.muted });
  put(440, 100, 'fib(3) #1', 2, false);
  put(270, 200, 'fib(2) #2', 1, false);
  put(610, 200, 'fib(1) #5', 1, true);
  put(170, 310, 'fib(1) #3', 1, true);
  put(370, 310, 'fib(0) #4', 0, false);
  s.note(640, 290, 200, 70, ['fib(1) runs twice:', 'the same work twice'], { size: 17 });
  s.text(440, 364, `Events: ${D.fib3.calls} call + 10 line + ${D.fib3.calls} return = 20`, { size: 19 });
  save('12.3-fib3-tree.svg', s);
}

// 3. Call counts of naive recursion (measured by cProfile)
{
  const s = new Sketch(880, 380, { title: 'Naive recursive fib: call counts for n = 5 to 25', seed: 1203 });
  s.text(440, 34, 'Naive fib(n): calls grow about 1.618x per step', { size: 26, weight: 700 });
  const base = 310, maxH = 230, max = Math.max(...D.calls_table.map((r) => r.naive_calls));
  s.line(60, base, 820, base, { color: C.muted });
  D.calls_table.forEach((r, i) => {
    const cx = 160 + i * 140, h = (r.naive_calls / max) * maxH;
    s.rect(cx - 35, base - Math.max(h, 2), 70, Math.max(h, 2), { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, fmt(r.naive_calls), { font: 'mono', size: 16 });
    s.text(cx, base + 30, `n = ${r.n}`, { size: 18 });
  });
  s.text(440, 364, 'Linear scale. The loop version makes 1 call for every n.', { size: 18 });
  save('12.3-call-counts.svg', s);
}

// 4. Overhead on fib(22), measured
{
  const s = new Sketch(880, 360, { title: 'Runtime multiplier of profiling and tracing on fib(22)', seed: 1204 });
  s.text(440, 34, 'Overhead on fib(22): a multiplier of the no-hook run', { size: 26, weight: 700 });
  const rows = [
    ['no hook', D.overhead_fib22.none, C.muted, C.greenSoft],
    ['cProfile', D.overhead_fib22.cProfile, C.green, C.greenSoft],
    ['settrace, call events only', D.overhead_fib22['settrace, call events only'], C.amber, C.amberSoft],
    ['settrace, call+line+return', D.overhead_fib22['settrace, call+line+return'], C.amber, C.amberSoft],
  ];
  rows.forEach(([label, o], i) => {
    const y = 100 + i * 60;
    s.text(40, y + 6, label, { size: 20, anchor: 'start' });
    const w = o.multiplier * 30;
    s.rect(320, y - 18, w, 36, { color: o.color ?? C.ink, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(320 + w + 12, y + 6, `${o.multiplier}x  (${(o.seconds * 1000).toFixed(1)} ms)`, { size: 18, anchor: 'start' });
  });
  s.text(440, 318, `Full tracer: ${fmt(D.event_counts_fib22.call)} call, ${fmt(D.event_counts_fib22.line)} line, ${fmt(D.event_counts_fib22.return)} return events`, { size: 17 });
  s.text(440, 344, 'One machine, best of 5 runs. Ratios shift between runs; event counts do not.', { size: 17 });
  save('12.3-overhead.svg', s);
}
console.log('ok');
