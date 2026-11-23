// Diagrams for lesson 26.3 (FFN: standard MLP, GELU, SwiGLU).
// Run: node scripts/diagrams/lessons/26.3.mjs
// Every number comes from scripts/diagrams/lessons/26.3_data.json, written by 26.3_experiment.py.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-26-transformer-architecture/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '26.3_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');
const r4 = (v) => v.toFixed(4);

// ---------------------------------------------------------------- 26.3-ffn-shapes.svg
{
  const s = new Sketch(880, 260, { title: 'One token through the standard feed-forward network: 512 up to 2048 through W1, a non-linearity, then 2048 down to 512 through W2', seed: 2631 });
  s.text(440, 40, 'One token through the standard FFN', { size: 26, weight: 700 });
  const boxes = [
    { x: 24, w: 100, top: 'x', sub: '1 × 512', fill: C.blueSoft, col: C.ink },
    { x: 154, w: 130, top: 'W1', sub: '512 × 2048', fill: C.greenSoft, col: C.green },
    { x: 314, w: 100, top: 'h', sub: '1 × 2048', fill: C.blueSoft, col: C.ink },
    { x: 444, w: 120, top: 'GELU', sub: 'or ReLU', fill: C.amberSoft, col: C.amber },
    { x: 594, w: 130, top: 'W2', sub: '2048 × 512', fill: C.greenSoft, col: C.green },
    { x: 754, w: 100, top: 'y', sub: '1 × 512', fill: C.blueSoft, col: C.ink },
  ];
  for (const b of boxes) {
    s.rect(b.x, 100, b.w, 70, { color: b.col, fill: b.fill, fillStyle: 'solid' });
    s.text(b.x + b.w / 2, 127, b.top, { size: 22, weight: 700 });
    s.text(b.x + b.w / 2, 155, b.sub, { font: 'mono', size: 15, color: C.muted });
  }
  const gaps = [[124, 154], [284, 314], [414, 444], [564, 594], [724, 754]];
  for (const [a, b] of gaps) s.arrow(a + 4, 135, b - 4, 135, { color: C.muted, head: 8 });
  s.text(224, 192, 'd_ff = 2048 = 4 × 512', { font: 'mono', size: 15, color: C.muted });
  s.text(440, 226, 'The same weights run on every token. Tokens do not mix inside the FFN.', { size: 19, color: C.muted });
  save('26.3-ffn-shapes.svg', s);
}

// ---------------------------------------------------------------- 26.3-activations.svg
{
  const s = new Sketch(880, 380, { title: 'Plot of ReLU, GELU and SiLU over x from -3 to 3; GELU dips to -0.17 near x = -0.75', seed: 2632 });
  s.text(440, 40, 'Activation functions', { size: 26, weight: 700 });
  const X = (x) => 110 + (x + 3) * 80;      // x in [-3, 3] maps to px [110, 590]
  const Y = (v) => 300 - v * 70;            // value 0 at y = 300, value 3 at y = 90
  s.line(110, 300, 590, 300, { color: C.muted, width: 1.4 });
  s.line(110, 80, 110, 330, { color: C.muted, width: 1.4 });
  for (let t = -3; t <= 3; t++) {
    s.line(X(t), 296, X(t), 304, { color: C.muted, width: 1.2 });
    s.text(X(t), 326, String(t), { font: 'mono', size: 15, color: C.muted });
  }
  const path = (ys) => {
    const pts = D.curves.x.map((x, i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(ys[i]).toFixed(1)}`);
    return pts.join(' ');
  };
  const curve = (ys, col) => s.raw(`<path d="${path(ys)}" style="stroke:${col};fill:none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`);
  curve(D.curves.relu, C.rose);
  curve(D.curves.silu, C.green);
  curve(D.curves.gelu, C.blue);
  // GELU minimum
  s.circle(X(D.gelu_min.x), Y(D.gelu_min.y), 12, { color: C.blue, width: 1.8 });
  s.text(X(D.gelu_min.x), 352, `GELU min ${D.gelu_min.y.toFixed(2)} at x ≈ ${D.gelu_min.x.toFixed(2)}`, { size: 17, color: C.blue });
  // legend
  const leg = [['ReLU: max(0, x)', C.rose], ['GELU: x Φ(x)', C.blue], ['SiLU: x σ(x)', C.green]];
  leg.forEach(([label, col], i) => {
    const y = 120 + i * 44;
    s.line(640, y, 684, y, { color: col, width: 3.2 });
    s.text(694, y + 6, label, { font: 'mono', size: 17, anchor: 'start' });
  });
  s.text(640, 260, ['Both GELU and SiLU dip below', 'zero for negative x, then approach', 'the identity for large positive x.'], { size: 18, anchor: 'start', color: C.muted });
  save('26.3-activations.svg', s);
}

// ---------------------------------------------------------------- 26.3-swiglu-example.svg
{
  const e = D.example;
  const v = (a) => '[' + a.map((t) => t.toFixed(4).replace(/\.?0+$/, '') || '0').join(', ') + ']';
  const s = new Sketch(880, 420, { title: 'SwiGLU on a worked example: x through two projections, SiLU on the gate, element-wise product, hidden state', seed: 2633 });
  s.text(440, 36, 'SwiGLU on the worked example (d = 2, d_ff = 3)', { size: 26, weight: 700 });
  s.rect(30, 170, 120, 60, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(90, 196, 'x', { size: 22, weight: 700 });
  s.text(90, 220, '[1, 2]', { font: 'mono', size: 15, color: C.muted });
  s.arrow(150, 192, 198, 125, { color: C.muted, head: 8 });
  s.arrow(150, 212, 198, 275, { color: C.muted, head: 8 });
  s.rect(200, 100, 140, 50, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(270, 131, 'x W_up', { font: 'mono', size: 16 });
  s.arrow(340, 125, 378, 125, { color: C.muted, head: 8 });
  s.rect(380, 100, 200, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(480, 131, 'up = ' + v(e.up), { font: 'mono', size: 16 });
  s.rect(200, 250, 140, 50, { color: C.muted, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(270, 281, 'x W_gate', { font: 'mono', size: 16 });
  s.arrow(340, 275, 378, 275, { color: C.muted, head: 8 });
  s.rect(380, 250, 200, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(480, 281, 'gate = ' + v(e.gate), { font: 'mono', size: 16 });
  s.arrow(480, 300, 480, 320, { color: C.muted, head: 8 });
  s.rect(380, 320, 200, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(480, 342, 'SiLU(gate)', { size: 19, weight: 700 });
  s.text(480, 368, v(e.silu_gate), { font: 'mono', size: 15 });
  s.arrow(580, 350, 634, 244, { color: C.muted, head: 8 });
  s.arrow(580, 125, 620, 176, { color: C.muted, head: 8 });
  s.circle(640, 200, 44, { color: C.ink, fill: C.note, fillStyle: 'solid' });
  s.text(640, 209, '×', { size: 28, weight: 700 });
  s.arrow(664, 200, 692, 200, { color: C.muted, head: 8 });
  s.rect(694, 150, 170, 100, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(779, 180, 'h (hidden)', { size: 18, weight: 700 });
  s.text(779, 206, v(e.h_swiglu).split(', ').slice(0, 2).join(', ') + ',', { font: 'mono', size: 15 });
  s.text(779, 228, v(e.h_swiglu).split(', ').slice(2).join(', '), { font: 'mono', size: 15 });
  s.text(440, 404, 'Output = h W_down = ' + v(e.y_swiglu), { font: 'mono', size: 18 });
  save('26.3-swiglu-example.svg', s);
}

// ---------------------------------------------------------------- 26.3-param-budget.svg
{
  const p = D.params.find((r) => r.d === 512);
  const s = new Sketch(880, 310, { title: 'Weights per FFN at d_model = 512: standard 2,097,152; SwiGLU at the same width 3,145,728; SwiGLU at width 1365 2,096,640', seed: 2634 });
  s.text(440, 36, 'Weights in one FFN at d_model = 512 (biases ignored)', { size: 24, weight: 700 });
  const scale = 330 / p.swi;   // the longest bar fills 330 px
  const bars = [
    { label: 'standard, d_ff = 2048', w: p.std, ratio: '1.0000x', col: C.blue, soft: C.blueSoft },
    { label: 'SwiGLU, d_ff = 2048', w: p.swi, ratio: `${p.swi_ratio.toFixed(2)}x`, col: C.rose, soft: C.roseSoft },
    { label: `SwiGLU, d_ff = ${p.dff_round}`, w: p.swi_match, ratio: `${p.match_ratio.toFixed(5)}x`, col: C.green, soft: C.greenSoft },
  ];
  bars.forEach((b, i) => {
    const y = 90 + i * 62;
    s.text(40, y + 28, b.label, { size: 18, anchor: 'start' });
    s.rect(300, y, b.w * scale, 44, { color: b.col, fill: b.soft, fillStyle: 'solid' });
    s.text(300 + b.w * scale + 12, y + 28, `${fmt(b.w)}  (${b.ratio})`, { font: 'mono', size: 16, anchor: 'start' });
  });
  s.text(440, 296, 'Same d_ff costs 1.5x; a width of 8d/3 restores the standard count.', { size: 19, color: C.muted });
  save('26.3-param-budget.svg', s);
}
console.log('wrote 26.3 diagrams');
