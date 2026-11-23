import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-05-information-retrieval/chapter-35-vector-search/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Worked example: five stored vectors and one query (numbers from the hand-example code block).
{
  const s = new Sketch(880, 400, { title: 'Five stored 2D vectors and a query, with squared distances', seed: 101 });
  s.text(440, 34, 'Five stored 2D vectors and one query', { size: 24, weight: 700 });
  const X0 = 90, Y0 = 350, U = 36;
  const P = (x, y) => [X0 + x * U, Y0 - y * U];
  s.line(80, Y0, 330, Y0, { color: C.muted });
  s.line(X0, 360, X0, 50, { color: C.muted });
  const pts = [
    { n: 'a', x: 0, y: 0, lx: 104, ly: 336, top: true },
    { n: 'e', x: 2, y: 1, lx: 180, ly: 300, top: true },
    { n: 'c', x: 1, y: 2, lx: 144, ly: 262, top: false },
    { n: 'b', x: 3, y: 4, lx: 218, ly: 204, top: false },
    { n: 'd', x: 6, y: 8, lx: 326, ly: 58, top: false },
  ];
  for (const p of pts) {
    const [px, py] = P(p.x, p.y);
    s.circle(px, py, 13, { color: p.top ? C.green : C.muted, fill: p.top ? C.greenSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(p.lx, p.ly, `${p.n} (${p.x}, ${p.y})`, { size: 17, font: 'mono', color: p.top ? C.green : C.ink });
  }
  const [qx, qy] = P(1, 0);
  s.circle(qx, qy, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(qx, qy + 38, 'query (1, 0)', { size: 17, font: 'mono', color: C.amber });
  s.text(480, 92, 'point', { size: 18, font: 'mono', anchor: 'start', color: C.muted });
  s.text(560, 92, 'coords', { size: 18, font: 'mono', anchor: 'start', color: C.muted });
  s.text(690, 92, 'squared distance', { size: 18, font: 'mono', anchor: 'start', color: C.muted });
  const rows = [['a', '(0, 0)', '1', true], ['e', '(2, 1)', '2', true], ['c', '(1, 2)', '4', false], ['b', '(3, 4)', '20', false], ['d', '(6, 8)', '89', false]];
  rows.forEach(([n, c, d, top], i) => {
    const st = { size: 18, font: 'mono', anchor: 'start', color: top ? C.green : C.ink, weight: top ? 700 : 400 };
    s.text(480, 134 + i * 40, n, st);
    s.text(560, 134 + i * 40, c, st);
    s.text(690, 134 + i * 40, d, st);
  });
  s.text(480, 352, 'Keep the two smallest: a and e.', { size: 19, anchor: 'start', color: C.ink });
  s.text(480, 380, 'Squared distance gives the same ranking as distance.', { size: 17, anchor: 'start', color: C.muted });
  save('35.1-worked-example.svg', s);
}

// 2. Schematic: one-cell probe misses a neighbour across a cell boundary (hand-placed, not measured).
{
  const s = new Sketch(880, 390, { title: 'Probing one cell misses a neighbour across the boundary', seed: 102 });
  s.text(440, 34, 'Probing one cell misses a neighbour across the boundary', { size: 22, weight: 700 });
  s.rect(60, 70, 500, 270, { color: C.muted });
  s.line(310, 70, 310, 340, { color: C.ink, dash: '6 8' });
  s.line(60, 200, 560, 200, { color: C.ink, dash: '6 8' });
  s.text(185, 104, 'cell A', { size: 18, color: C.muted });
  s.text(435, 104, 'cell B', { size: 18, color: C.muted });
  s.text(185, 318, 'cell C', { size: 18, color: C.muted });
  s.text(435, 318, 'cell D', { size: 18, color: C.muted });
  const dots = [[120, 130], [230, 160], [150, 180], [260, 95], [200, 118], [360, 100], [470, 150], [400, 190], [520, 110], [430, 240],
    [110, 240], [240, 250], [160, 300], [270, 300], [360, 250], [480, 300], [400, 320], [520, 250]];
  for (const [x, y] of dots) s.circle(x, y, 9, { color: C.muted, fill: C.muted, fillStyle: 'solid' });
  for (const [cx, cy] of [[185, 135], [435, 135], [185, 275], [435, 275]]) {
    s.circle(cx, cy, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  }
  s.circle(322, 128, 13, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });   // true nearest neighbour, in cell B
  s.circle(298, 120, 51, { color: C.rose, dash: '4 6' });                               // query's search radius
  s.circle(298, 120, 14, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });      // query
  s.arrow(286, 124, 206, 132, { color: C.muted });                                      // nearest centroid is A
  s.note(600, 90, 250, 150, ['nprobe = 1 scans cell A only.', 'It returns the closest point in A.', 'The true neighbour (green) is in B,', 'so this query misses it.'], { size: 18 });
  s.note(600, 262, 250, 90, ['nprobe = 2 also scans cell B,', 'and the neighbour is found.'], { size: 18 });
  s.text(440, 374, 'Schematic: points and boundaries are hand-placed, not measured.', { size: 17, color: C.muted });
  save('35.1-cell-boundary.svg', s);
}

// 3. Measured recall-versus-scan curves (numbers from the lesson code, noise 1.5 and noise 2.0).
{
  const s = new Sketch(880, 420, { title: 'Recall@10 against the fraction of the database scanned', seed: 103 });
  s.text(440, 34, 'Scanning more of the database buys recall', { size: 24, weight: 700 });
  const X = (p) => 110 + p * (490 / 32);      // p = percent scanned, 0..32
  const Y = (r) => 340 - (r - 0.3) * (260 / 0.7); // r = recall, 0.3..1.0
  s.line(110, 340, 600, 340, { color: C.muted });
  s.line(110, 80, 110, 340, { color: C.muted });
  for (const p of [0, 10, 20, 30]) s.text(X(p), 366, `${p}%`, { size: 16, color: C.muted });
  for (const r of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) s.text(96, Y(r) + 6, r.toFixed(1), { size: 16, anchor: 'end', color: C.muted });
  s.text(355, 400, 'vectors scanned per query (% of the 20,000 in the database)', { size: 18 });
  s.text(38, 210, 'recall@10', { size: 18, rotate: -90 });
  const blue = [[1.30, 0.705], [2.00, 0.848], [3.63, 0.892], [7.22, 0.934], [14.78, 0.963], [29.71, 0.984]];
  const amber = [[1.23, 0.343], [2.13, 0.439], [3.94, 0.538], [7.60, 0.647], [14.96, 0.757], [30.11, 0.892]];
  const curve = (pts, color) => {
    pts.forEach(([p, r], i) => {
      if (i > 0) s.line(X(pts[i - 1][0]), Y(pts[i - 1][1]), X(p), Y(r), { color, width: 3 });
    });
    pts.forEach(([p, r]) => s.circle(X(p), Y(r), 10, { color, fill: color, fillStyle: 'solid' }));
  };
  curve(amber, C.amber);
  curve(blue, C.blue);
  blue.forEach(([p, r], i) => s.text(X(p), Y(r) - 16, String([1, 2, 4, 8, 16, 32][i]), { size: 16, color: C.blue, weight: 700 }));
  s.circle(390, 262, 12, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
  s.text(412, 268, 'noise 1.5 (main run); labels = nprobe', { size: 17, anchor: 'start' });
  s.circle(390, 296, 12, { color: C.amber, fill: C.amber, fillStyle: 'solid' });
  s.text(412, 302, 'noise 2.0 (harder data)', { size: 17, anchor: 'start' });
  save('35.1-recall-curve.svg', s);
}

// 4. Decision flow (reasoning, not measured).
{
  const s = new Sketch(880, 400, { title: 'Choosing between exact and approximate search', seed: 104 });
  s.text(440, 34, 'Choosing between exact and approximate search', { size: 24, weight: 700 });
  s.rect(220, 50, 440, 60, { color: C.ink });
  s.text(440, 86, 'Must every answer be exact?', { size: 19 });
  s.arrow(660, 80, 716, 80, { color: C.muted });
  s.text(688, 72, 'yes', { size: 16, color: C.muted });
  s.rect(720, 50, 140, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(790, 78, 'Flat search', { size: 18 });
  s.text(790, 100, '(exact)', { size: 18 });
  s.arrow(440, 112, 440, 166, { color: C.muted });
  s.text(472, 146, 'no', { size: 16, color: C.muted });
  s.rect(220, 170, 440, 60, { color: C.ink });
  s.text(440, 206, 'Does one full scan fit the latency budget?', { size: 19 });
  s.line(660, 200, 790, 200, { color: C.muted });
  s.arrow(790, 200, 790, 114, { color: C.muted });
  s.text(725, 192, 'yes', { size: 16, color: C.muted });
  s.arrow(440, 232, 440, 282, { color: C.muted });
  s.text(472, 264, 'no', { size: 16, color: C.muted });
  s.rect(220, 285, 440, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 321, 'ANN index: approximate, faster per query', { size: 19 });
  s.text(440, 374, 'Then measure recall@k on your own queries, against flat results, to set the knob.', { size: 17, color: C.muted });
  save('35.1-decision.svg', s);
}
