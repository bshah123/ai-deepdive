// Diagrams for Lesson 15.3 (Universal functions). Run: node scripts/diagrams/lessons/15.3.mjs
// Every number comes from 15.3_data.json, written by 15.3_experiment.py (run once with the lesson venv).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-02-scientific-python/chapter-15-numpy-internals/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '15.3_data.json'), 'utf8'));
const save = (name, s) => { writeFileSync(join(OUT, name), s.toString()); console.log('wrote', name); };
const T = D.timings;

// seconds -> short label: microseconds below 1 ms, milliseconds above
const fmtT = (sec) => {
  const us = sec * 1e6;
  if (us >= 1000) { const ms = us / 1000; return `${ms.toFixed(ms < 10 ? 2 : 1)} ms`; }
  return `${us.toFixed(us < 10 ? 2 : 0)} µs`;
};

// ---------------------------------------------------------------- 1. who runs the loop
{
  const s = new Sketch(880, 345, { title: 'A Python loop runs the interpreter once per element; a ufunc call runs one C loop', seed: 1531 });
  s.text(440, 40, 'Who runs the loop?', { size: 26, weight: 700 });

  s.text(230, 92, 'Python loop', { size: 22, weight: 700, color: C.amber });
  const labels = ['i=0', 'i=1', 'i=2', '…', 'i=n-1'];
  labels.forEach((lab, k) => {
    const x = 40 + k * 76;
    s.rect(x, 110, 62, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + 31, 136, lab, { font: 'mono', size: 15 });
    if (k < labels.length - 1) s.arrow(x + 62, 130, x + 76, 130, { color: C.muted, head: 8 });
  });
  s.text(230, 178, 'repeated once per element', { size: 18, color: C.muted });
  s.note(40, 250, 380, 56, ['1,000,000 elements:', `${fmtT(T['1000000'].python_loop_s)} measured here`], { size: 19 });

  s.text(660, 92, 'ufunc: np.add(a, b)', { size: 22, weight: 700, color: C.blue });
  s.rect(480, 110, 360, 40, { color: C.ink, width: 1.2 });
  s.text(660, 136, 'one Python call', { font: 'mono', size: 17 });
  s.arrow(660, 150, 660, 178, { color: C.muted, head: 10 });
  s.rect(480, 180, 360, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(660, 206, 'compiled C loop over the buffer', { size: 18 });
  s.note(480, 250, 360, 56, ['1,000,000 elements:', `${fmtT(T['1000000'].ufunc_s)} measured here`], { size: 19 });

  s.text(440, 330, 'Same result and dtype; the difference is how many times Python runs.', { size: 19, color: C.muted });
  save('15.3-loop-vs-ufunc.svg', s);
}

// ---------------------------------------------------------------- 2. the dispatch pipeline
{
  const s = new Sketch(880, 250, { title: 'Ufunc call: pick a loop from dtypes, broadcast the shapes, allocate, run the inner loop', seed: 1532 });
  s.text(440, 40, 'What np.add(a, b) does, in order', { size: 26, weight: 700 });
  const steps = [
    ['inputs', 'a: int32', 'b: int32'],
    ['type lookup', 'first match in', "types: 'ii->i'"],
    ['broadcast', 'both (5,)', 'result (5,)'],
    ['allocate out', 'int32', '5 elements'],
    ['inner loop', '1+6=7, 2+7=9', '... 5+10=15'],
  ];
  steps.forEach((st, k) => {
    const x = 60 + k * 160;
    s.rect(x, 100, 120, 110, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 60, 130, st[0], { size: 19, weight: 700 });
    s.text(x + 60, 158, st[1], { size: 17 });
    s.text(x + 60, 182, st[2], { size: 17 });
    if (k < steps.length - 1) s.arrow(x + 124, 155, x + 156, 155, { color: C.muted, head: 9 });
  });
  s.text(440, 240, 'Values never choose the loop; only the dtypes do.', { size: 19, color: C.muted });
  save('15.3-dispatch.svg', s);
}

// ---------------------------------------------------------------- 3. result dtype table
{
  const s = new Sketch(880, 345, { title: 'The result dtype follows from the input dtypes, not from the values', seed: 1533 });
  s.text(440, 40, 'Same operator family, different loop', { size: 26, weight: 700 });
  const cols = [40, 330, 560, 720];
  ['call', 'input dtypes', 'result dtype', 'value'].forEach((h, i) =>
    s.text(cols[i], 90, h, { size: 19, weight: 700, anchor: 'start', color: C.muted }));
  const R = D.type_resolution;
  const err = D.int8_plus_1000.error.split(':')[0];
  const rows = [
    ['np.add(a, b)', 'int32, int32', R['int32 + int32'].result_dtype, '[3]'],
    ['np.divide(a, b)', 'int32, int32', R['int32 / int32'].result_dtype, '[0.5]'],
    ['np.add(a, b)', 'int32, float64', R['int32 + float64'].result_dtype, '[3.]'],
    ['np.add(a, 1000)', 'int8 array, Python int', 'error', err],
  ];
  rows.forEach((r, i) => {
    const y = 140 + i * 50;
    if (i === 1) s.rect(30, y - 28, 820, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cols[0], y, r[0], { font: 'mono', size: 17, anchor: 'start' });
    s.text(cols[1], y, r[1], { size: 18, anchor: 'start' });
    s.text(cols[2], y, r[2], { font: 'mono', size: 17, anchor: 'start' });
    s.text(cols[3], y, r[3], { font: 'mono', size: 17, anchor: 'start' });
    if (i < rows.length - 1) s.line(30, y + 22, 850, y + 22, { color: C.muted, width: 0.8, dash: '6 8' });
  });
  s.text(440, 330, 'The highlighted row is the one that looks like a bug and is not.', { size: 19, color: C.muted });
  save('15.3-type-resolution.svg', s);
}

// ---------------------------------------------------------------- 4. silent int32 wrap
{
  const s = new Sketch(880, 262, { title: 'int32 multiplication keeps only the low 32 bits of the exact product', seed: 1534 });
  s.text(440, 40, 'int32 wraps silently', { size: 26, weight: 700 });
  const lo = -(2 ** 31), hi = 2 ** 31 - 1, X0 = 60, W = 760;
  const xOf = (v) => X0 + ((v - lo) / (hi - lo)) * W;
  s.rect(X0, 110, W, 36, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(X0, 170, '-2,147,483,648', { font: 'mono', size: 16, anchor: 'start' });
  s.text(X0 + W, 170, '2,147,483,647', { font: 'mono', size: 16, anchor: 'end' });
  const xs = xOf(D.overflow.int32_result);
  s.line(xs, 100, xs, 146, { color: C.amber, width: 2.5 });
  s.text(xs, 92, `stored: ${D.overflow.int32_result.toLocaleString('en-US')}`, { size: 19, color: C.amber, weight: 700 });
  s.note(60, 186, 760, 64, [
    `exact: 100,000 × 100,000 = ${D.overflow.exact.toLocaleString('en-US')}, outside the int32 range`,
    `stored: ${D.overflow.exact.toLocaleString('en-US')} − 2 × 2^32 = ${D.overflow.int32_result.toLocaleString('en-US')}; no error`,
  ], { size: 18 });
  save('15.3-overflow.svg', s);
}

// ---------------------------------------------------------------- 5. measured timing, log scale
{
  const s = new Sketch(880, 345, { title: 'Measured time per call on a log scale: Python loop versus np.add at three sizes', seed: 1535 });
  s.text(440, 40, 'Loop versus ufunc, measured here', { size: 26, weight: 700 });
  const X0 = 230, W = 520;                       // log axis: 0.1 µs at X0, 100 ms at X0 + W
  const xOf = (us) => X0 + ((Math.log10(us) + 1) / 6) * W;
  s.rect(30, 62, 14, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(52, 75, 'Python loop', { size: 17, anchor: 'start' });
  s.rect(190, 62, 14, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(212, 75, 'ufunc np.add', { size: 17, anchor: 'start' });
  s.text(850, 75, 'loop ÷ ufunc', { size: 16, anchor: 'end', color: C.muted });

  const rows = [['n = 10', T['10']], ['n = 1,000', T['1000']], ['n = 1,000,000', T['1000000']]];
  rows.forEach(([lab, t], i) => {
    const y0 = 100 + i * 62;
    s.text(40, y0 + 30, lab, { size: 19, anchor: 'start' });
    const bars = [[t.python_loop_s, C.amber, C.amberSoft, y0], [t.ufunc_s, C.blue, C.blueSoft, y0 + 26]];
    bars.forEach(([sec, col, soft, y]) => {
      const us = sec * 1e6;
      s.rect(X0, y, xOf(us) - X0, 22, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(xOf(us) + 8, y + 17, fmtT(sec), { font: 'mono', size: 16, anchor: 'start' });
    });
    const r = t.ratio_loop_over_ufunc;
    s.text(850, y0 + 30, `${r >= 10 ? r.toFixed(0) : r.toFixed(1)}×`, { size: 19, weight: 700, anchor: 'end' });
  });

  s.line(X0, 286, X0 + W, 286, { color: C.muted, width: 1 });
  [[0.1, '0.1 µs'], [1, '1 µs'], [10, '10 µs'], [100, '100 µs'], [1e3, '1 ms'], [1e4, '10 ms'], [1e5, '100 ms']].forEach(([us, lab]) => {
    s.line(xOf(us), 286, xOf(us), 292, { color: C.muted, width: 1 });
    s.text(xOf(us), 314, lab, { font: 'mono', size: 15, color: C.muted });
  });
  s.text(440, 340, 'Median of 5 repeats on one arm64 Mac, NumPy 2.5.5; other machines will differ.', { size: 17, color: C.muted });
  save('15.3-timing.svg', s);
}
