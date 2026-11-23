// Diagrams for Lesson 36.2 (Reciprocal Rank Fusion & score normalization).
// Run: node scripts/diagrams/lessons/36.2.mjs
// Numbers come from scripts/diagrams/lessons/36.2_experiment.py (writes 36.2_data.json).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-05-information-retrieval/chapter-36-hybrid-search/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '36.2_data.json'), 'utf8'));
const save = (name, s) => {
  writeFileSync(join(OUT, name), s.toString());
  console.log('wrote', name);
};
const f2 = (v) => v.toFixed(2);
const f3 = (v) => v.toFixed(3);
const f4 = (v) => v.toFixed(4);
const f5 = (v) => v.toFixed(5);
const K = 60;
const ORDER = ['A', 'B', 'C', 'D'];

// ---------------------------------------------------------------- 1. scale problem
{
  const s = new Sketch(880, 420, { title: 'Two score scales: lexical scores span about 9 points, dense scores about 0.4', seed: 3601 });
  s.text(440, 36, 'Same four documents, two score scales', { size: 26, weight: 700 });
  const lexVals = ORDER.map((d) => D.hand.lex[d]);
  const denVals = ORDER.map((d) => D.hand.dense[d]);
  const bar = (y, letter, v, color, soft, scale) => {
    s.text(120, y + 16, letter, { font: 'mono', size: 18, anchor: 'end' });
    s.rect(140, y, v * scale, 22, { color, fill: soft, fillStyle: 'solid' });
    s.text(140 + v * scale + 10, y + 16, f2(v), { font: 'mono', size: 16, anchor: 'start', color: C.muted });
  };
  s.text(40, 78, 'lexical (BM25-like)', { size: 20, anchor: 'start', weight: 700, color: C.blue });
  ORDER.forEach((d, i) => bar(92 + i * 34, d, lexVals[i], C.blue, C.blueSoft, 12));
  s.text(40, 248, 'dense (cosine-like)', { size: 20, anchor: 'start', weight: 700, color: C.amber });
  ORDER.forEach((d, i) => bar(262 + i * 34, d, denVals[i], C.amber, C.amberSoft, 12));
  const lexRange = Math.max(...lexVals) - Math.min(...lexVals);
  const denRange = Math.max(...denVals) - Math.min(...denVals);
  s.note(520, 96, 330, 110, [
    `lexical spread: ${f2(lexRange)} points`,
    `dense spread: ${f2(denRange)} points`,
    'same bar scale on both groups',
  ], { size: 19 });
  s.note(520, 236, 330, 150, [
    `raw sum, c = 1:   ${D.hand.raw_rank.join(' ')}`,
    'RRF, min-max:     A C B D',
    'raw sum, c = 0.05: A C B D',
    'Scaling lexical by 0.05 changes only the raw sum.',
  ], { size: 17 });
  save('36.2-scale-problem.svg', s);
}

// ---------------------------------------------------------------- 2. RRF worked table
{
  const lexRank = { A: 1, B: 2, C: 3, D: 4 };
  const denRank = { A: 2, B: 4, C: 1, D: 3 };
  const rows = ['A', 'C', 'B', 'D'];
  const s = new Sketch(880, 372, { title: 'RRF worked example: ranks, per-list contributions and totals', seed: 3602 });
  s.text(440, 34, 'RRF with k = 60: each list adds 1 / (60 + rank)', { size: 24, weight: 700 });
  const cols = { doc: 110, lr: 260, dr: 380, lc: 540, dc: 690, tot: 820 };
  const heads = [['doc', 'doc'], ['lr', 'lexical rank'], ['dr', 'dense rank'], ['lc', '1 / (60 + lex)'], ['dc', '1 / (60 + dense)'], ['tot', 'RRF score']];
  heads.forEach(([k, t]) => s.text(cols[k], 84, t, { size: 17, weight: 700, color: C.muted }));
  s.line(40, 98, 860, 98, { color: C.muted, width: 1.2 });
  rows.forEach((d, i) => {
    const y = 140 + i * 46;
    const lc = 1 / (K + lexRank[d]);
    const dc = 1 / (K + denRank[d]);
    const total = lc + dc;
    if (d === rows[0]) s.rect(772, y - 22, 98, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cols.doc, y + 6, d, { font: 'mono', size: 20 });
    s.text(cols.lr, y + 6, String(lexRank[d]), { font: 'mono', size: 20 });
    s.text(cols.dr, y + 6, String(denRank[d]), { font: 'mono', size: 20 });
    s.text(cols.lc, y + 6, f5(lc), { font: 'mono', size: 18 });
    s.text(cols.dc, y + 6, f5(dc), { font: 'mono', size: 18 });
    s.text(cols.tot, y + 6, f5(total), { font: 'mono', size: 18, weight: 700 });
  });
  s.note(40, 302, 820, 52, [
    `Order A, C, B, D. Rank 1 in one list contributes 1/61 = ${f4(1 / 61)}.`,
  ], { size: 19 });
  save('36.2-rrf-table.svg', s);
}

// ---------------------------------------------------------------- 3. min-max number lines
{
  const s = new Sketch(880, 380, { title: 'Min-max maps each list onto [0, 1] using its own min and max', seed: 3603 });
  s.text(440, 34, 'Min-max: each list is stretched to [0, 1]', { size: 24, weight: 700 });
  const lo = Math.min(...Object.values(D.hand.lex));
  const hi = Math.max(...Object.values(D.hand.lex));
  const x0 = 230, W = 600;
  const xr = (v) => x0 + ((v - lo) / (hi - lo)) * W;
  const xn = (v) => x0 + v * W;
  // raw lexical axis
  s.text(40, 124, 'raw lexical', { size: 19, anchor: 'start', weight: 700, color: C.blue });
  s.line(x0, 120, x0 + W, 120, { color: C.ink, width: 1.6 });
  for (const d of ORDER) {
    const v = D.hand.lex[d];
    s.circle(xr(v), 120, 14, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
    s.text(xr(v), 96, `${d} ${f2(v)}`, { font: 'mono', size: 16, color: C.muted });
  }
  s.text(x0, 150, `min ${f2(lo)}`, { size: 16, color: C.muted, anchor: 'start' });
  s.text(x0 + W, 150, `max ${f2(hi)}`, { size: 16, color: C.muted, anchor: 'end' });
  s.arrow(440, 166, 440, 200, { color: C.muted, width: 1.6, head: 10 });
  s.text(456, 188, 'x - min over (max - min)', { size: 18, anchor: 'start', color: C.muted });
  // normalized axis
  s.text(40, 264, 'in [0, 1]', { size: 19, anchor: 'start', weight: 700, color: C.green });
  s.line(x0, 260, x0 + W, 260, { color: C.ink, width: 1.6 });
  const lexN = { A: 1, B: (D.hand.lex.B - lo) / (hi - lo), C: (D.hand.lex.C - lo) / (hi - lo), D: 0 };
  for (const d of ORDER) {
    const v = lexN[d];
    s.circle(xn(v), 260, 14, { color: C.green, fill: C.green, fillStyle: 'solid' });
    s.text(xn(v), 236, `${d} ${f3(v)}`, { font: 'mono', size: 16, color: C.muted });
  }
  s.text(x0, 292, '0', { size: 16, color: C.muted, anchor: 'start' });
  s.text(x0 + W, 292, '1', { size: 16, color: C.muted, anchor: 'end' });
  s.note(40, 326, 800, 40, [`Max always maps to 1 and min to 0, whatever the scale.`], { size: 18 });
  save('36.2-minmax.svg', s);
}

// ---------------------------------------------------------------- 4. effect of k
{
  const s = new Sketch(880, 360, { title: 'Effect of k on the contribution of rank 1 and rank 10', seed: 3604 });
  s.text(440, 34, 'How much does rank 10 count against rank 1?', { size: 24, weight: 700 });
  const rows = [0, 10, 60];
  const maxW = 380;
  rows.forEach((k, i) => {
    const y = 80 + i * 75;
    const r1 = 1 / (k + 1);
    const r10 = 1 / (k + 10);
    s.text(40, y + 22, `k = ${k}`, { font: 'mono', size: 20, anchor: 'start', weight: 700 });
    s.text(160, y + 10, 'rank 1', { size: 17, anchor: 'start', color: C.muted });
    s.rect(240, y - 6, maxW, 26, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(240 + maxW + 10, y + 12, r1.toFixed(r1 < 0.1 ? 4 : 3), { font: 'mono', size: 17, anchor: 'start' });
    s.text(160, y + 46, 'rank 10', { size: 17, anchor: 'start', color: C.muted });
    s.rect(240, y + 30, maxW * (r10 / r1), 26, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(240 + maxW * (r10 / r1) + 10, y + 48, r10.toFixed(r10 < 0.1 ? 4 : 3), { font: 'mono', size: 17, anchor: 'start' });
  });
  s.note(40, 318, 800, 36, ['Bars are scaled so each rank 1 is full width. Smaller k makes rank 1 dominate.'], { size: 17 });
  save('36.2-rrf-k.svg', s);
}

// ---------------------------------------------------------------- 5. simulation results
{
  const s = new Sketch(880, 440, { title: 'Simulated retrieval: mean nDCG@10 by method, and raw sum under rescaling', seed: 3605 });
  s.text(440, 34, 'Simulated queries: mean nDCG@10 (error bars: one standard error)', { size: 22, weight: 700 });
  const base = 330, top = 110, vmax = 0.3;
  const yv = (v) => base - (v / vmax) * (base - top);
  // left panel
  s.text(230, 78, 'method, lexical scale c = 1', { size: 17, color: C.muted });
  s.line(50, base, 420, base, { color: C.ink, width: 1.4 });
  const names = [['lexical only', 'lexical'], ['dense only', 'dense'], ['raw sum', 'raw sum'], ['min-max a=0.5', 'min-max'], ['RRF k=60', 'RRF']];
  names.forEach(([key, label], i) => {
    const m = D.sim[key].mean, se = D.sim[key].se;
    const cx = 85 + i * 78;
    const col = key.startsWith('RRF') ? C.green : key.startsWith('min') ? C.amber : C.blue;
    const soft = key.startsWith('RRF') ? C.greenSoft : key.startsWith('min') ? C.amberSoft : C.blueSoft;
    s.rect(cx - 24, yv(m), 48, base - yv(m), { color: col, fill: soft, fillStyle: 'solid' });
    s.line(cx, yv(m - se), cx, yv(m + se), { color: C.ink, width: 1.4 });
    s.line(cx - 6, yv(m + se), cx + 6, yv(m + se), { color: C.ink, width: 1.4 });
    s.line(cx - 6, yv(m - se), cx + 6, yv(m - se), { color: C.ink, width: 1.4 });
    s.text(cx, yv(m + se) - 10, f3(m), { font: 'mono', size: 15 });
    s.text(cx, base + 26, label, { size: 17, color: C.ink });
  });
  // right panel
  s.text(620, 78, 'raw sum vs lexical scale c', { size: 17, color: C.muted });
  s.line(500, base, 740, base, { color: C.ink, width: 1.4 });
  const cs = ['0.1', '1.0', '10.0'];
  cs.forEach((c, i) => {
    const m = D.scale[c]['raw sum'];
    const cx = 540 + i * 80;
    s.rect(cx - 24, yv(m), 48, base - yv(m), { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, yv(m) - 10, f3(m), { font: 'mono', size: 15 });
    s.text(cx, base + 26, `c = ${Number(c)}`, { size: 17 });
  });
  const rrfM = D.scale['1.0']['RRF k=60'];
  const mmM = D.scale['1.0']['min-max a=0.5'];
  s.line(500, yv(rrfM), 740, yv(rrfM), { color: C.green, width: 2, dash: '8 7' });
  s.text(748, yv(rrfM) + 6, `RRF ${f3(rrfM)}`, { font: 'mono', size: 15, anchor: 'start', color: C.green });
  s.line(500, yv(mmM), 740, yv(mmM), { color: C.amber, width: 2, dash: '8 7' });
  s.text(748, yv(mmM) + 22, `min-max ${f3(mmM)}`, { font: 'mono', size: 15, anchor: 'start', color: C.amber });
  s.note(40, 396, 800, 30, [`Rescaling lexical moves only the raw sum. RRF and min-max stay fixed.`], { size: 17 });
  save('36.2-simulation.svg', s);
}
