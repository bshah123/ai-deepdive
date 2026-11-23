// Diagrams for 58.1 (Self-Instruct and Evol-Instruct mechanics, stub teacher).
// Run: node scripts/diagrams/lessons/58.1.mjs
// Every number comes from scripts/diagrams/lessons/58.1_data.json (written by 58.1_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-58-synthetic-data-distillation/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const d = JSON.parse(readFileSync(join(HERE, '58.1_data.json'), 'utf8'));

// ---------------------------------------------------------------- 58.1-selfinstruct-loop.svg
{
  const s = new Sketch(880, 300, { title: 'The Self-Instruct loop: sample demonstrations, the teacher writes a candidate, filters decide whether it joins the pool, and accepted items become demonstrations for the next prompt', seed: 101 });
  s.text(440, 40, 'The Self-Instruct loop', { size: 26, weight: 700 });

  s.rect(30, 90, 170, 64, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 115, [`seed pool`, `${d.seed_tasks} tasks`], { size: 18 });
  s.arrow(200, 122, 232, 122, { color: C.muted });

  s.rect(232, 90, 180, 64, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(322, 115, [`sample ${d.demos} demos`, `${d.from_human} seed + ${d.demos - d.from_human} machine`], { size: 18 });
  s.arrow(412, 122, 444, 122, { color: C.muted });

  s.rect(444, 90, 170, 64, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(529, 115, ['teacher writes', 'one candidate'], { size: 18 });
  s.arrow(614, 122, 646, 122, { color: C.muted });

  s.rect(646, 90, 204, 64, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(748, 115, ['filter: keyword,', `length, ROUGE-L < ${d.threshold}`], { size: 18 });

  s.arrow(748, 154, 748, 200, { color: C.muted });
  s.text(760, 183, 'accepted', { size: 17, anchor: 'start', color: C.muted });

  s.rect(646, 200, 204, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(748, 226, ['machine pool', 'grows each round'], { size: 17 });

  s.line(646, 228, 340, 228, { color: C.muted });
  s.arrow(340, 228, 340, 156, { color: C.muted });
  s.text(470, 252, 'next prompt samples from here', { size: 17, color: C.muted });

  s.note(30, 200, 290, 64, ['Rejected candidates are dropped.', 'Only accepted ones re-enter the pool.'], { size: 17 });
  save('58.1-selfinstruct-loop.svg', s);
}

// ---------------------------------------------------------------- 58.1-funnel.svg
{
  const f = d.funnel;
  const s = new Sketch(880, 330, { title: `Filter funnel: ${f.proposed} proposals, ${f.accepted} accepted at ROUGE-L threshold ${d.threshold}`, seed: 102 });
  s.text(440, 40, `${f.proposed} proposals, ${f.accepted} accepted`, { size: 26, weight: 700 });
  const k = 0.56; // px per proposal
  const rows = [
    ['proposed', f.proposed, C.blue, C.blueSoft],
    ['keyword filter', f.rejected_keyword, C.amber, C.amberSoft],
    ['ROUGE-L filter', f.rejected_rouge, C.rose, C.roseSoft],
    ['accepted', f.accepted, C.green, C.greenSoft],
  ];
  rows.forEach(([label, n, col, soft], i) => {
    const cy = 105 + i * 56;
    s.text(40, cy + 7, label, { size: 19, anchor: 'start' });
    const w = Math.max(n * k, 4);
    s.rect(260, cy - 18, w, 36, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(260 + w + 12, cy + 7, `${n}`, { size: 19, anchor: 'start', weight: 700 });
  });
  s.text(40, 316, 'bar length is proportional to count', { size: 16, anchor: 'start', color: C.muted });
  save('58.1-funnel.svg', s);
}

// ---------------------------------------------------------------- 58.1-threshold.svg
{
  const rows = d.sweep;
  const maxN = Math.max(...rows.map((r) => r.accepted));
  const s = new Sketch(880, 385, { title: 'Accepted pool size and distinct words for ROUGE-L thresholds from 0.5 to 0.9', seed: 103 });
  s.text(440, 40, 'Stricter filter, smaller pool, same vocabulary', { size: 26, weight: 700 });
  const base = 290;
  s.line(110, base, 800, base, { color: C.muted });
  rows.forEach((r, i) => {
    const cx = 170 + i * 130;
    const h = (r.accepted / maxN) * 200;
    if (h > 0) s.rect(cx - 35, base - h, 70, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 10, `${r.accepted}`, { size: 19, weight: 700 });
    s.text(cx, 318, `${r.threshold.toFixed(1)}`, { size: 19 });
    s.text(cx, 346, `${r.distinct_words} words`, { size: 17, color: C.muted });
  });
  s.text(40, 318, 'threshold', { size: 16, anchor: 'start', color: C.muted });
  s.text(40, 346, 'distinct', { size: 16, anchor: 'start', color: C.muted });
  save('58.1-threshold.svg', s);
}

// ---------------------------------------------------------------- 58.1-evol-depth.svg
{
  const dep = d.evol_depth;
  const lost = d.evol_eliminated_per_round;
  const s = new Sketch(880, 350, { title: 'Evol-Instruct survivors by evolution depth, with eliminations between depths', seed: 104 });
  s.text(440, 40, `Evol-Instruct: ${dep[0].survivors} seeds, ${lost.length} rounds`, { size: 26, weight: 700 });
  const base = 270, maxN = dep[0].survivors;
  const cx = (i) => 150 + i * 150;
  s.line(90, base, 800, base, { color: C.muted });
  dep.forEach((r, i) => {
    const h = (r.survivors / maxN) * 190;
    s.rect(cx(i) - 45, base - h, 90, h, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx(i), base - h - 10, `${r.survivors}`, { size: 20, weight: 700 });
    s.text(cx(i), 298, `depth ${r.depth ?? i}`, { size: 18 });
    s.text(cx(i), 322, `${r.mean_words.toFixed(1)} words`, { size: 17, color: C.muted });
    if (i > 0) s.text((cx(i - 1) + cx(i)) / 2, 180, lost[i - 1] ? `−${lost[i - 1]}` : 'none', { size: 19, color: C.rose, weight: 700 });
  });
  s.text(440, 348, 'red: lineages dropped by the elimination step in that round', { size: 16, color: C.muted });
  save('58.1-evol-depth.svg', s);
}

// ---------------------------------------------------------------- 58.1-collapse.svg
{
  const K = d.collapse_K, G = d.collapse_gens;
  const pure = d.collapse['pure self-training'].support;
  const anch = d.collapse['anchored (half real)'].support;
  const s = new Sketch(880, 380, { title: `Categories with nonzero probability over generations, of ${K}: pure self-training against half real data`, seed: 105 });
  s.text(440, 40, 'Tails vanish under self-training', { size: 26, weight: 700 });
  const X = (g) => 110 + (g / G) * 690;
  const Y = (v) => 320 - (v / K) * 230;
  s.line(110, 320, 800, 320, { color: C.muted });
  s.line(110, 90, 110, 320, { color: C.muted });
  for (const v of [0, 25, 50]) s.text(95, Y(v) + 6, `${v}`, { size: 16, anchor: 'end', color: C.muted });
  for (const g of [0, 10, 20, 30]) s.text(X(g), 346, `${g}`, { size: 16, color: C.muted });
  s.text(455, 372, 'generation', { size: 18, color: C.muted });
  s.text(48, 205, 'categories kept', { size: 16, color: C.muted, rotate: -90 });
  const plot = (series, col) => {
    for (let g = 0; g < G; g++) s.line(X(g), Y(series[g]), X(g + 1), Y(series[g + 1]), { color: col, width: 2.6 });
    for (const g of [0, 10, 20, 30]) s.circle(X(g), Y(series[g]), 9, { color: col, fill: col, fillStyle: 'solid' });
  };
  plot(anch, C.blue);
  plot(pure, C.rose);
  s.line(150, 258, 180, 258, { color: C.rose, width: 2.6 });
  s.text(190, 264, 'pure self-training', { size: 18, anchor: 'start' });
  s.line(150, 288, 180, 288, { color: C.blue, width: 2.6 });
  s.text(190, 294, 'half real data each generation', { size: 18, anchor: 'start' });
  save('58.1-collapse.svg', s);
}

console.log('wrote 5 SVGs for 58.1');
