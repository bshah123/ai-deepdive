// Diagrams for Lesson 4.6 (Timsort & Powersort). Run: node scripts/diagrams/lessons/4.6.mjs
// Every number is read from scripts/diagrams/lessons/4.6_data.json, written by 4.6_data.py.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-04-lists/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '4.6_data.json'), 'utf8'));
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------------------------------------------------------------- natural runs
{
  const s = new Sketch(880, 330, { title: 'The 16-element example split into natural runs, then with descending runs reversed', seed: 4601 });
  const xs = (i) => 40 + i * 50;
  const vals = D.example;
  const runs = D.example_runs;
  s.text(440, 34, 'Natural runs of the 16-element example', { size: 26, weight: 700 });

  // Row 1: as given, runs shaded by kind
  s.text(40, 88, 'as given', { size: 17, anchor: 'start', color: C.muted });
  runs.forEach((r) => {
    const x0 = xs(r.start) - 5;
    const w = (r.len - 1) * 50 + 54;
    s.rect(x0, 96, w, 76, {
      color: r.kind === 'asc' ? C.blue : C.amber,
      fill: r.kind === 'asc' ? C.blueSoft : C.amberSoft,
      fillStyle: 'solid',
      width: 1.2,
      roughness: 0.8,
    });
  });
  vals.forEach((v, i) => {
    s.rect(xs(i), 110, 44, 44, { color: C.ink, width: 1.2, roughness: 0.8, fill: C.note, fillStyle: 'solid' });
    s.text(xs(i) + 22, 139, String(v), { font: 'mono', size: 17 });
  });
  runs.forEach((r) => {
    const cx = xs(r.start) + ((r.len - 1) * 50 + 44) / 2;
    s.text(cx, 192, `${r.kind === 'asc' ? 'ascending' : 'descending'} ${r.len}`, { size: 16, color: r.kind === 'asc' ? C.blue : C.amber });
  });

  // Row 2: descending runs reversed in place
  const reversed = vals.slice();
  runs.forEach((r) => {
    if (r.kind === 'desc') {
      const seg = vals.slice(r.start, r.start + r.len).reverse();
      seg.forEach((v, k) => (reversed[r.start + k] = v));
    }
  });
  s.text(40, 246, 'after reversing the descending runs', { size: 17, anchor: 'start', color: C.muted });
  reversed.forEach((v, i) => {
    s.rect(xs(i), 262, 44, 44, { color: C.ink, width: 1.2, roughness: 0.8, fill: C.note, fillStyle: 'solid' });
    s.text(xs(i) + 22, 291, String(v), { font: 'mono', size: 17 });
  });
  save('4.6-natural-runs.svg', s);
}

// ---------------------------------------------------------------- comparison counts
{
  const s = new Sketch(880, 430, { title: 'Comparisons made by sorted() on seven input shapes, n = 10,000', seed: 4602 });
  s.text(440, 34, 'Comparisons made by sorted(), n = 10,000', { size: 26, weight: 700 });
  const x0 = 300;
  const maxW = 470;
  const scale = maxW / D.n_log2_n;
  const label = {
    random: 'random',
    ascending: 'ascending',
    descending: 'descending',
    nearly_sorted_100_swaps: 'nearly sorted',
    eight_ascending_runs: '8 ascending runs',
    two_interleaved_runs: '2 interleaved runs',
    two_disjoint_runs: '2 disjoint runs',
  };
  // reference row: n log2 n as a dashed outline, not a line through the labels
  s.text(x0 - 16, 109, 'n·log2(n)', { size: 17, anchor: 'end', color: C.rose });
  s.rect(x0, 90, D.n_log2_n * scale, 26, { color: C.rose, fillStyle: 'hachure', width: 1.2, roughness: 0.8, dash: '6 6' });
  s.text(x0 + D.n_log2_n * scale + 10, 109, fmt(D.n_log2_n), { font: 'mono', size: 16, anchor: 'start', color: C.rose });
  D.inputs.forEach((row, k) => {
    const y = 140 + k * 40;
    const w = Math.max(3, row.comparisons * scale);
    s.text(x0 - 16, y + 19, label[row.input], { size: 17, anchor: 'end' });
    s.rect(x0, y, w, 26, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
    s.text(x0 + w + 10, y + 19, fmt(row.comparisons), { font: 'mono', size: 16, anchor: 'start' });
  });
  s.text(440, 420, `Python ${D.python}. Counts are from one run; comparisons, not seconds.`, { size: 15, color: C.muted });
  save('4.6-comparisons.svg', s);
}

// ---------------------------------------------------------------- two-run merge cost at n = 100,000
{
  const big = D.scaling.find((r) => r.n === 100000);
  const detect = big.n - 1;
  const disjointMerge = big.disjoint - detect;
  const interMerge = big.interleaved - detect;
  const total = big.interleaved;
  const s = new Sketch(880, 372, { title: 'Two sorted runs of 50,000: merge cost with disjoint and with interleaved values', seed: 4603 });
  s.text(440, 34, 'Two runs of 50,000 each: where the comparisons go', { size: 26, weight: 700 });
  const x0 = 40;
  const W = 800;
  const k = W / total;
  const row = (y, label, parts) => {
    s.text(x0, y - 12, label, { size: 17, anchor: 'start' });
    let x = x0;
    parts.forEach((p) => {
      const w = Math.max(0.6, p.v * k);
      s.rect(x, y, w, 44, { color: p.color, fill: p.fill, fillStyle: 'solid', width: 1.2, roughness: 0.6 });
      x += w;
    });
    return x;
  };
  const yA = 100;
  row(yA, `disjoint: runs of 50,000 apart`, [
    { v: detect, color: C.blue, fill: C.blueSoft },
    { v: disjointMerge, color: C.green, fill: C.greenSoft },
  ]);
  s.text(x0, yA + 66, `run detection ${fmt(detect)} + merge ${disjointMerge} = ${fmt(big.disjoint)}`, { font: 'mono', size: 16, anchor: 'start' });
  const yB = 222;
  row(yB, `interleaved: values alternate`, [
    { v: detect, color: C.blue, fill: C.blueSoft },
    { v: interMerge, color: C.rose, fill: C.roseSoft },
  ]);
  s.text(x0, yB + 66, `run detection ${fmt(detect)} + merge ${fmt(interMerge)} = ${fmt(big.interleaved)}`, { font: 'mono', size: 16, anchor: 'start' });
  s.text(x0, 322, `The green merge part (${disjointMerge} comparisons) is too narrow to draw at this scale.`, { size: 16, anchor: 'start', color: C.green });
  s.text(x0, 352,`n = 1,000: ${fmt(D.scaling[0].disjoint - 999)} vs ${fmt(D.scaling[0].interleaved - 999)}.  n = 10,000: ${fmt(D.scaling[1].disjoint - 9999)} vs ${fmt(D.scaling[1].interleaved - 9999)}.`, { size: 16, anchor: 'start', color: C.muted });
  save('4.6-merge-cost.svg', s);
}

// ---------------------------------------------------------------- galloping probe chains
{
  const s = new Sketch(880, 350, { title: 'Probe sequence of exponential search for keys 5 and 700 in 0..999', seed: 4604 });
  s.text(440, 34, 'Exponential probes, then bisection, on 0..999', { size: 26, weight: 700 });
  const g = D.gallop;
  const chain = (y, label, probes, key, answer) => {
    s.text(30, y - 12, label, { size: 17, anchor: 'start' });
    probes.forEach((p, i) => {
      const less = p < key; // a[p] == p in this array
      const x = 30 + i * 42;
      s.rect(x, y, 38, 36, {
        color: less ? C.green : C.amber,
        fill: less ? C.greenSoft : C.amberSoft,
        fillStyle: 'solid',
        width: 1.3,
        roughness: 0.8,
      });
      s.text(x + 19, y + 24, String(p), { font: 'mono', size: 15 });
    });
    s.text(30, y + 58, `answer: index ${answer}, after ${probes.length} probes`, { size: 16, anchor: 'start', color: C.muted });
  };
  chain(110, 'key 5', g.key5.probes, 5, g.key5.index);
  chain(200, 'key 700', g.key700.probes, 700, g.key700.index);
  s.text(440, 300, `Plain binary search: ${g.key5.bisect_probes} probes for either key.`, { size: 17 });
  s.text(440, 326, 'green: a[p] < key, search moves right    amber: a[p] ≥ key, search moves left', { size: 15, color: C.muted });
  save('4.6-gallop-probes.svg', s);
}
