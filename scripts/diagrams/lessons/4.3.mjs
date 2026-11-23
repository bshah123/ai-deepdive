// Diagrams for 4.3 (Timsort). Run: node scripts/diagrams/lessons/4.3.mjs
// Every number comes from scripts/diagrams/lessons/4.3_experiment.py (writes 4.3_data.json).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-04-lists/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '4.3_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');

// 1. Natural runs of the worked example, padded to length 4 and sorted
{
  const s = new Sketch(880, 330, { title: 'The 12-number worked example split into three runs of length 4, each sorted', seed: 4301 });
  s.text(440, 36, 'Three runs of length 4', { size: 26, weight: 700 });
  const input = D.worked_example_input;
  const sortedRuns = [[1, 5, 6, 8], [2, 3, 4, 9], [0, 7, 10, 11]];
  const groups = [
    { label: 'run 1: 3 natural, 1 added', color: C.blue, soft: C.blueSoft },
    { label: 'run 2: 2 natural, 2 added', color: C.amber, soft: C.amberSoft },
    { label: 'run 3: 2 natural, 2 added', color: C.green, soft: C.greenSoft },
  ];
  s.text(68, 66, 'input, 12 numbers', { size: 18, anchor: 'start', color: C.muted });
  input.forEach((v, i) => {
    const g = Math.floor(i / 4);
    const x = 68 + i * 62;
    s.rect(x, 76, 56, 44, { color: groups[g].color, fill: groups[g].soft, fillStyle: 'solid' });
    s.text(x + 28, 105, String(v), { font: 'mono', size: 18 });
  });
  groups.forEach((g, k) => {
    s.text(68 + k * 248 + 121, 150, g.label, { size: 18 });
  });
  s.text(68, 210, 'each run sorted in place', { size: 18, anchor: 'start', color: C.muted });
  sortedRuns.flat().forEach((v, i) => {
    const g = Math.floor(i / 4);
    const x = 68 + i * 62;
    s.rect(x, 220, 56, 44, { color: groups[g].color, fill: groups[g].soft, fillStyle: 'solid' });
    s.text(x + 28, 249, String(v), { font: 'mono', size: 18 });
  });
  s.text(440, 304, 'Stable binary insertion adds the missing items; each run is then sorted.', { size: 18, color: C.muted });
  save('4.3-runs.svg', s);
}

// 2. Stack view of the merges (values from the event log)
{
  const s = new Sketch(880, 300, { title: 'The stack of pending runs after each step: runs of 4 merge into 8, then 8 and 4 merge into 12', seed: 4302 });
  s.text(440, 36, 'Merges happen as runs are pushed', { size: 26, weight: 700 });
  const steps = [
    { head: '1. push run 1', bars: [{ len: 4, label: 'run 1' }] },
    { head: '2. push run 2, merge top two', bars: [{ len: 8, label: 'merged' }] },
    { head: '3. push run 3', bars: [{ len: 4, label: 'run 3' }, { len: 8, label: 'merged' }] },
    { head: '4. end: merge the rest', bars: [{ len: 12, label: 'all' }] },
  ];
  steps.forEach((st, k) => {
    const cx = 110 + k * 220;
    s.text(cx, 96, st.head, { size: 19, weight: 700 });
    st.bars.forEach((b, j) => {
      const top = st.bars.length === 2 ? (j === 0 ? 118 : 160) : 150;
      const w = 18 * b.len;
      s.rect(cx - w / 2, top, w, 34, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(cx, top + 23, String(b.len), { size: 18, font: 'mono' });
    });
    if (k < 3) s.arrow(cx + 100, 200, cx + 120, 200, { color: C.muted });
  });
  s.text(440, 262, 'In step 3, run 3 is the top of the stack, above the merged run of 8.', { size: 18, color: C.muted });
  save('4.3-merge-order.svg', s);
}

// 3. Stability: equal grades keep their input order
{
  const s = new Sketch(880, 345, { title: 'Records sorted by grade: records with equal grades keep their input order', seed: 4303 });
  s.text(440, 36, 'Equal keys keep their input order', { size: 26, weight: 700 });
  s.text(170, 72, 'input order', { size: 19, color: C.muted });
  s.text(710, 72, 'after sorting by grade', { size: 19, color: C.muted });
  const people = [['Asha', 3], ['Ben', 1], ['Chen', 3], ['Dara', 2], ['Eli', 1]];
  const out = D.stability_example;
  const colour = { Asha: C.amber, Chen: C.amber, Ben: C.blue, Eli: C.blue, Dara: C.green };
  const soft = { Asha: C.amberSoft, Chen: C.amberSoft, Ben: C.blueSoft, Eli: C.blueSoft, Dara: C.greenSoft };
  const grade = Object.fromEntries(people);
  people.forEach(([name, g], i) => {
    const y = 96 + i * 40;
    s.rect(70, y, 200, 32, { color: colour[name], fill: soft[name], fillStyle: 'solid' });
    s.text(170, y + 23, `${name}   grade ${g}`, { font: 'mono', size: 16 });
  });
  out.forEach((name, j) => {
    const y = 96 + j * 40;
    s.rect(610, y, 200, 34, { color: colour[name], fill: soft[name], fillStyle: 'solid' });
    s.text(710, y + 23, `${name}   grade ${grade[name]}`, { font: 'mono', size: 16 });
    const i = people.findIndex(([n]) => n === name);
    s.arrow(272, 96 + i * 40 + 16, 606, y + 16, { color: colour[name], width: 2 });
  });
  s.text(440, 326, 'Ben stays before Eli (both grade 1); Asha stays before Chen (both grade 3).', { size: 18, color: C.muted });
  save('4.3-stability.svg', s);
}

// 4. Comparisons on 1024 items: CPython list.sort vs teaching version
{
  const rows = [
    ['random', D.cpython_comparisons.random, D.teaching_comparisons.random],
    ['8 sorted blocks', D.cpython_comparisons['8 sorted blocks'], D.teaching_comparisons['8 sorted blocks']],
    ['sorted + 10 swaps', D.cpython_comparisons['sorted + 10 swaps'], D.teaching_comparisons['sorted + 10 swaps']],
    ['sorted', D.cpython_comparisons.sorted, D.teaching_comparisons.sorted],
    ['reversed', D.cpython_comparisons.reversed, D.teaching_comparisons.reversed],
    ['all equal', D.cpython_comparisons['all equal'], D.teaching_comparisons['all equal']],
  ];
  const s = new Sketch(880, 440, { title: 'Comparisons made on 1024 items for six input shapes, CPython list.sort and the teaching version', seed: 4304 });
  s.text(440, 36, 'Comparisons on 1024 items', { size: 26, weight: 700 });
  const x0 = 250, k = 500 / D.n_log2_n; // px per comparison, scaled so n log2 n fills 500 px
  s.rect(x0, 62, 18, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(x0 + 26, 75, 'CPython list.sort', { size: 17, anchor: 'start' });
  s.rect(x0 + 230, 62, 18, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(x0 + 256, 75, 'teaching version (lesson code)', { size: 17, anchor: 'start' });
  rows.forEach(([name, real, teach], i) => {
    const top = 100 + i * 56;
    s.text(40, top + 20, name, { size: 18, anchor: 'start' });
    s.rect(x0, top, real * k, 20, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
    s.text(x0 + real * k + 8, top + 16, fmt(real), { font: 'mono', size: 15, anchor: 'start' });
    s.rect(x0, top + 24, teach * k, 20, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
    s.text(x0 + teach * k + 8, top + 40, fmt(teach), { font: 'mono', size: 15, anchor: 'start' });
  });
  const xl = x0 + D.lg_n_factorial * k, xn = x0 + D.n_log2_n * k;
  s.line(xl, 90, xl, 425, { color: C.rose, dash: '6 8' });
  s.line(xn, 90, xn, 425, { color: C.muted, dash: '6 8' });
  s.text(xl - 8, 440, `lg(n!) = ${fmt(D.lg_n_factorial)}`, { size: 17, anchor: 'end', color: C.rose });
  s.text(xn + 8, 440, `n log2 n = ${fmt(D.n_log2_n)}`, { size: 17, anchor: 'start', color: C.muted });
  save('4.3-comparisons.svg', s);
}

// 5. Peak temporary memory during sort, n = 100,000
{
  const peak = D.peak_sort_bytes;
  const rows = [
    ['random', peak.random],
    ['8 sorted blocks', peak['8 sorted blocks']],
    ['sorted', peak.sorted],
    ['reversed', peak.reversed],
  ];
  const s = new Sketch(880, 300, { title: 'Peak temporary memory during list.sort for 100,000 items: about half the pointer array for random data, none for sorted data', seed: 4305 });
  s.text(440, 36, 'Peak temporary memory during list.sort', { size: 26, weight: 700 });
  const x0 = 230, k = 560 / D.pointer_array_bytes;
  const xr = x0 + D.pointer_array_bytes * k;
  s.line(xr, 70, xr, 255, { color: C.rose, dash: '6 8' });
  s.text(xr - 6, 62, `list's pointer array: ${fmt(D.pointer_array_bytes)} bytes`, { size: 17, color: C.rose, anchor: 'end' });
  rows.forEach(([name, bytes], i) => {
    const top = 100 + i * 46;
    s.text(40, top + 20, name, { size: 18, anchor: 'start' });
    if (bytes > 0) s.rect(x0, top, bytes * k, 26, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
    else s.line(x0, top + 13, x0 + 4, top + 13, { color: C.blue, width: 4 });
    s.text(x0 + bytes * k + 10, top + 19, `${fmt(bytes)} bytes`, { font: 'mono', size: 15, anchor: 'start' });
  });
  save('4.3-memory.svg', s);
}
