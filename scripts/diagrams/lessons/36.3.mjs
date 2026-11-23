// Diagrams for 36.3 (production hybrid search).
// Run: node scripts/diagrams/lessons/36.3.mjs
// Every number below is copied from the output of scripts/diagrams/lessons/36.3_experiment.py (run it to reprint them).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-05-information-retrieval/chapter-36-hybrid-search/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 36.3-pipeline.svg
{
  const s = new Sketch(880, 330, { title: 'Hybrid pipeline: a query goes to a BM25 index and a dense IVF index, the two ranked lists are fused with RRF, then a metadata filter keeps the top 10', seed: 3601 });
  s.text(440, 40, 'Hybrid pipeline: two retrievers, one fusion, then a filter', { size: 24, weight: 700 });

  s.rect(24, 150, 120, 60, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(84, 172, ['query', 'SKU + 1 word'], { size: 17 });
  s.arrow(144, 170, 186, 115, { color: C.muted, head: 7 });
  s.arrow(144, 190, 186, 245, { color: C.muted, head: 7 });

  s.rect(186, 80, 180, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(276, 110, ['BM25 index', 'top 100, score > 0'], { size: 17 });
  s.rect(186, 210, 180, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(276, 240, ['IVF dense index', '8 of 64 cells, top 100'], { size: 17 });

  s.arrow(366, 115, 400, 168, { color: C.muted, head: 7 });
  s.arrow(366, 245, 400, 192, { color: C.muted, head: 7 });
  s.rect(400, 150, 150, 60, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(475, 172, ['RRF, k = 60', 'sum of 1/(k + rank)'], { size: 17 });

  s.arrow(550, 180, 580, 180, { color: C.muted, head: 7 });
  s.rect(580, 150, 120, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(640, 172, ['metadata', 'filter'], { size: 17 });

  s.arrow(700, 180, 730, 180, { color: C.muted, head: 7 });
  s.rect(730, 150, 120, 60, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(790, 186, 'top 10', { size: 19, weight: 700 });

  s.text(440, 300, 'Each stage is measured in the lesson: the two retrievers, the fusion weight, the nprobe setting and the filter.', { size: 17, color: C.muted });
  save('36.3-pipeline.svg', s);
}

// ---------------------------------------------------------------- 36.3-worked-example.svg
{
  const s = new Sketch(880, 396, { title: 'Worked example: five fused documents, each with its BM25 rank, dense rank and RRF score', seed: 3602 });
  s.text(440, 36, 'One identifier query through fusion', { size: 24, weight: 700 });
  s.text(440, 62, "query ['SKU01789', 'c39w5'], target doc 1789", { size: 17, color: C.muted, font: 'mono' });
  s.text(150, 100, 'doc', { size: 17, weight: 700 });
  s.text(340, 100, 'BM25 rank', { size: 17, weight: 700 });
  s.text(510, 100, 'dense rank', { size: 17, weight: 700 });
  s.text(690, 100, 'RRF score', { size: 17, weight: 700 });

  s.rect(40, 112, 800, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  const rows = [
    ['1789 (target)', '1', '2', '0.03252'],
    ['2989', '3', '4', '0.03150'],
    ['2589', '5', '5', '0.03077'],
    ['1189', '4', '10', '0.02991'],
    ['239', '2', '16', '0.02929'],
  ];
  rows.forEach((r, i) => {
    const y = 138 + i * 48;
    s.text(150, y, r[0], { size: 19, font: 'mono' });
    s.text(340, y, r[1], { size: 19, font: 'mono' });
    s.text(510, y, r[2], { size: 19, font: 'mono' });
    s.text(690, y, r[3], { size: 19, font: 'mono' });
  });
  s.text(440, 378, 'Target: 1/(60+1) + 1/(60+2) = 0.03252. Doc 239 has the second-best BM25 rank but scores lower, because its dense rank is 16.', { size: 17, color: C.muted });
  save('36.3-worked-example.svg', s);
}

// ---------------------------------------------------------------- 36.3-systems.svg
{
  const s = new Sketch(880, 392, { title: 'nDCG at 10 for six retrieval systems, split by topic and identifier queries, 100 of each', seed: 3603 });
  s.text(440, 36, 'nDCG@10 by system and query type', { size: 24, weight: 700 });
  s.rect(250, 56, 16, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(274, 70, 'topic query', { size: 17, anchor: 'start' });
  s.rect(440, 56, 16, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(464, 70, 'identifier query', { size: 17, anchor: 'start' });

  const x0 = 250, scale = 540;
  const data = [
    ['BM25 (lexical)', 0.816, 0.987],
    ['dense, exact cosine', 0.959, 0.274],
    ['hybrid, BM25 + exact dense', 0.985, 0.658],
    ['hybrid, BM25 + IVF nprobe 8', 0.985, 0.691],
  ];
  data.forEach(([name, t, id], i) => {
    const y = 110 + i * 60;
    s.text(24, y + 24, name, { size: 17, anchor: 'start' });
    s.rect(x0, y, t * scale, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x0 + t * scale + 8, y + 17, t.toFixed(3), { size: 15, font: 'mono', anchor: 'start' });
    s.rect(x0, y + 26, id * scale, 22, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x0 + id * scale + 8, y + 43, id.toFixed(3), { size: 15, font: 'mono', anchor: 'start' });
  });
  s.text(440, 376, 'Random ranking scores 0.015 (topic) and 0.000 (identifier). Dense retrieval is the weak half for identifiers.', { size: 17, color: C.muted });
  save('36.3-systems.svg', s);
}

// ---------------------------------------------------------------- 36.3-fusion-weight.svg
{
  const s = new Sketch(880, 380, { title: 'Held-out nDCG@10 against the BM25 weight in weighted RRF, with BM25 alone as a dashed reference', seed: 3604 });
  s.text(440, 36, 'Weighted RRF on held-out queries', { size: 24, weight: 700 });
  const xs = [140, 240, 340, 440, 540, 640, 740];
  const W = ['0.5', '1', '2', '3', '5', '10', '20'];
  const py = (v) => 320 - ((v - 0.3) / 0.7) * 230;
  [0.4, 0.6, 0.8, 1.0].forEach((v) => {
    s.line(110, py(v), 800, py(v), { color: C.muted, width: 1, dash: '4 8' });
    s.text(96, py(v) + 6, v.toFixed(1), { size: 15, font: 'mono', anchor: 'end' });
  });
  s.line(110, 90, 110, 320, { color: C.ink, width: 2 });
  s.line(110, 320, 800, 320, { color: C.ink, width: 2 });
  W.forEach((w, i) => s.text(xs[i], 345, `w=${w}`, { size: 15, font: 'mono' }));

  s.line(110, py(0.9), 800, py(0.9), { color: C.muted, width: 2, dash: '6 8' });
  s.text(118, py(0.9) - 8, 'BM25 alone, all = 0.900', { size: 15, anchor: 'start' });

  const series = [
    ['topic', [0.973, 0.977, 0.977, 0.977, 0.977, 0.977, 0.977], C.blue],
    ['identifier', [0.398, 0.607, 0.684, 0.698, 0.738, 0.841, 0.899], C.amber],
    ['all', [0.685, 0.792, 0.831, 0.838, 0.858, 0.909, 0.938], C.violet],
  ];
  series.forEach(([name, vals, col], k) => {
    for (let i = 0; i < vals.length - 1; i++) {
      s.line(xs[i], py(vals[i]), xs[i + 1], py(vals[i + 1]), { color: col, width: 3 });
    }
    vals.forEach((v, i) => s.circle(xs[i], py(v), 10, { color: col, fill: col, fillStyle: 'solid' }));
    s.line(120 + k * 230, 70, 150 + k * 230, 70, { color: col, width: 3 });
    s.text(158 + k * 230, 76, name, { size: 17, anchor: 'start' });
  });
  s.text(440, 368, 'Weights tuned on the other half of the queries (50 topic, 50 identifier held out here).', { size: 17, color: C.muted });
  save('36.3-fusion-weight.svg', s);
}

// ---------------------------------------------------------------- 36.3-nprobe.svg
{
  const s = new Sketch(880, 400, { title: 'Recall at 100 of IVF against exact dense search, plotted against the share of the corpus scanned, for nprobe 1 to 32', seed: 3605 });  // height 400 below
  s.text(440, 36, 'How much of the corpus must the ANN scan?', { size: 24, weight: 700 });
  const px = (f) => 110 + (f / 50) * 690;   // f = percent scanned, 0 to 50
  const py = (r) => 320 - r * 230;           // r = recall@100, 0 to 1
  [0, 0.5, 1.0].forEach((r) => {
    s.line(110, py(r), 800, py(r), { color: C.muted, width: 1, dash: '4 8' });
    s.text(96, py(r) + 6, r.toFixed(1), { size: 15, font: 'mono', anchor: 'end' });
  });
  [0, 10, 20, 30, 40, 50].forEach((f) => s.text(px(f), 345, `${f}%`, { size: 15, font: 'mono' }));
  s.line(110, 90, 110, 320, { color: C.ink, width: 2 });
  s.line(110, 320, 800, 320, { color: C.ink, width: 2 });
  s.text(455, 368, 'vectors scanned, as a share of 3000 documents', { size: 17, color: C.muted });

  const pts = [[1, 1.9, 0.416, 0.850], [2, 3.5, 0.599, 0.851], [4, 6.6, 0.791, 0.840],
                [8, 12.9, 0.925, 0.838], [16, 25.1, 0.980, 0.828], [32, 49.9, 0.997, 0.821]];
  pts.forEach(([np, f, r]) => {
    s.circle(px(f), py(r), 12, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    if (np === 32) s.text(px(f) - 16, py(r) + 26, `nprobe ${np}`, { size: 15, font: 'mono', anchor: 'end' });
    else s.text(px(f) + 16, py(r) + 26, `nprobe ${np}`, { size: 15, font: 'mono', anchor: 'start' });
  });
  s.text(440, 392, 'Hybrid nDCG@10 at nprobe 1, 2, 4, 8, 16, 32: 0.850, 0.851, 0.840, 0.838, 0.828, 0.821.', { size: 17, color: C.muted });
  save('36.3-nprobe.svg', s);
}

// ---------------------------------------------------------------- 36.3-filter.svg
{
  const s = new Sketch(880, 300, { title: 'Filter strategies: how many of 10 results each returns for a filter that keeps 10 percent of documents', seed: 3606 });
  s.text(440, 36, 'Results returned out of 10 under a 10% filter', { size: 24, weight: 700 });
  const x0 = 300, scale = 50;   // 10 results = 500 px
  s.line(x0 + 10 * scale, 70, x0 + 10 * scale, 270, { color: C.muted, width: 1, dash: '4 8' });
  s.text(x0 + 10 * scale, 62, '10', { size: 15, font: 'mono' });
  const rows = [
    ['post-filter, candidates 10', 1.23, '0% full 10 | nDCG 0.288', C.rose, C.roseSoft],
    ['post-filter, candidates 100', 9.04, '55% full 10 | nDCG 0.902', C.amber, C.amberSoft],
    ['pre-filter, candidates 100', 10.0, '100% full 10 | nDCG 0.908', C.green, C.greenSoft],
  ];
  rows.forEach(([name, v, detail, col, soft], i) => {
    const y = 100 + i * 66;
    s.text(24, y + 14, name, { size: 17, anchor: 'start' });
    s.text(24, y + 38, detail, { size: 15, font: 'mono', anchor: 'start', color: C.muted });
    s.rect(x0, y, v * scale, 36, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x0 + v * scale + 8, y + 25, v.toFixed(2), { size: 17, font: 'mono', anchor: 'start' });
  });
  save('36.3-filter.svg', s);
}
