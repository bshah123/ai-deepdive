// Diagrams for Lesson 21.2 (activation functions). Run: node scripts/diagrams/lessons/21.2.mjs
// Every number comes from 21.2_data.json, written by 21.2_experiment.py (run once with the lesson venv).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-21-neural-networks/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '21.2_data.json'), 'utf8'));
const save = (name, s) => { writeFileSync(join(OUT, name), s.toString()); console.log('wrote', name); };
const f2 = (v) => v.toFixed(2);
const f3 = (v) => v.toFixed(3);
const f4 = (v) => v.toFixed(4);

// ---------------------------------------------------------------- 1. three curves
{
  const s = new Sketch(880, 400, { title: 'ReLU, GELU and SiLU plotted for x from -3 to 3, with values at x = -1 and x = 1', seed: 2101 });
  s.text(440, 36, 'Three activation curves', { size: 26, weight: 700 });
  const X = (x) => 120 + ((x + 3) / 6) * 700;
  const Y = (y) => 330 - ((y + 1) / 3.5) * 270;
  // axes at x = 0 and y = 0
  s.line(120, Y(0), 820, Y(0), { color: C.muted, width: 1.5 });
  s.line(X(0), 60, X(0), 330, { color: C.muted, width: 1.5 });
  for (const t of [-3, -2, -1, 1, 2, 3]) s.text(X(t), 352, String(t), { font: 'mono', size: 16, color: C.muted });
  const series = [
    ['relu', C.blue, 'ReLU'],
    ['gelu', C.amber, 'GELU'],
    ['silu', C.green, 'SiLU'],
  ];
  for (const [key, col, label] of series) {
    const xs = D.curves.x, ys = D.curves[key];
    for (let i = 0; i < xs.length - 1; i++) {
      s.line(X(xs[i]), Y(ys[i]), X(xs[i + 1]), Y(ys[i + 1]), { color: col, width: 3.5 });
    }
  }
  // legend, upper left (curves are near zero there)
  series.forEach(([, col, label], i) => {
    const yy = 80 + i * 30;
    s.line(140, yy, 170, yy, { color: col, width: 3.5 });
    s.text(180, yy + 6, label, { size: 18, anchor: 'start' });
  });
  // values at x = 1 (note sits in the empty lower right)
  const w = D.worked;
  s.note(560, 262, 290, 60, [`At x = 1: ReLU ${f3(w.relu[1])}`, `GELU ${f3(w.gelu[1])}, SiLU ${f3(w.silu[1])}`], { size: 18 });
  s.text(440, 380, `At x = -1: ReLU ${f3(w.relu[0])}, GELU ${f3(w.gelu[0])}, SiLU ${f3(w.silu[0])}`, { size: 18, color: C.muted });
  save('21.2-curves.svg', s);
}

// ---------------------------------------------------------------- 2. largest slope of each function
{
  const s = new Sketch(880, 370, { title: 'Largest slope of sigmoid, tanh, ReLU, GELU and SiLU: sigmoid tops out at 0.25', seed: 2102 });
  s.text(440, 34, 'Largest slope of each function', { size: 26, weight: 700 });
  const base = 300, unit = 190;
  const bars = [
    ['sigmoid', D.max_derivative.sigmoid.value, C.rose, C.roseSoft, f2(D.max_derivative.sigmoid.value)],
    ['tanh', D.max_derivative.tanh.value, C.blue, C.blueSoft, f2(D.max_derivative.tanh.value)],
    ['ReLU', 1, C.green, C.greenSoft, '1.00 (x > 0)'],
    ['GELU', D.max_derivative.GELU.value, C.amber, C.amberSoft, f2(D.max_derivative.GELU.value)],
    ['SiLU', D.max_derivative.SiLU.value, C.violet, C.violetSoft ?? C.blueSoft, f2(D.max_derivative.SiLU.value)],
  ];
  // reference line at slope 1
  s.line(110, base - unit, 830, base - unit, { color: C.muted, dash: '6 8', width: 1.5 });
  bars.forEach(([name, v, col, soft, label], i) => {
    const cx = 160 + i * 160, h = v * unit, w = 96;
    s.rect(cx - w / 2, base - h, w, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(cx, base - h - 14, label, { size: 19, weight: 700 });
    s.text(cx, base + 30, name, { font: 'mono', size: 18 });
  });
  s.line(110, base, 830, base, { color: C.ink, width: 1.5 });
  s.text(440, 356, 'Dashed line: slope 1. A chain of n layers multiplies n slopes together.', { size: 18, color: C.muted });
  save('21.2-slopes.svg', s);
}

// ---------------------------------------------------------------- 3. gradient ratio at depth 32, five seeds
{
  const s = new Sketch(880, 380, { title: 'Gradient ratio at depth 32 over five seeds, log scale: sigmoid is near 1e-17 to 1e-21, the others are near 1', seed: 2103 });
  s.text(440, 34, 'Gradient ratio at depth 32, five seeds', { size: 26, weight: 700 });
  const X = (v) => 180 + ((Math.log10(v) + 22) / 24) * 640;
  const rows = [
    ['sigmoid, Xavier', 'sigmoid/xavier', C.rose],
    ['sigmoid, He', 'sigmoid/he', C.rose],
    ['tanh, Xavier', 'tanh/xavier', C.blue],
    ['ReLU, He', 'ReLU/he', C.green],
    ['GELU, He', 'GELU/he', C.amber],
  ];
  const yRow = (i) => 120 + i * 52;
  // decade gridlines
  for (const e of [-20, -15, -10, -5, 0]) {
    const x = X(10 ** e);
    s.line(x, 92, x, 330, { color: C.muted, dash: '4 6', width: 1 });
    s.text(x, 352, e === 0 ? '1' : `1e${e}`, { font: 'mono', size: 16, color: C.muted });
  }
  rows.forEach(([label, key, col], i) => {
    s.text(40, yRow(i) + 6, label, { size: 18, anchor: 'start' });
    s.line(180, yRow(i), 820, yRow(i), { color: C.muted, width: 0.8 });
    for (const v of D.seed_spread_depth32[key]) {
      s.circle(X(v), yRow(i), 14, { color: col, fill: col, fillStyle: 'solid' });
    }
  });
  s.text(440, 374, 'Each dot is one seed. Ratio = gradient norm at the first hidden layer / at the output layer.', { size: 16, color: C.muted });
  save('21.2-depth.svg', s);
}

// ---------------------------------------------------------------- 4. SwiGLU for one token
{
  const s = new Sketch(880, 400, { title: 'SwiGLU for one token: a SiLU-activated gate multiplies a linear branch', seed: 2104 });
  const sw = D.swiglu;
  const r = (v) => v.map((z) => f3(z)).join(', ');
  s.text(440, 30, 'SwiGLU for one token', { size: 26, weight: 700 });
  s.rect(340, 50, 200, 44, { color: C.ink, width: 1.4 });
  s.text(440, 78, 'x = [1, 0]', { font: 'mono', size: 18 });
  s.arrow(400, 94, 200, 130, { color: C.muted, head: 12 });
  s.arrow(480, 94, 680, 130, { color: C.muted, head: 12 });
  // gate branch
  s.rect(40, 130, 300, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(190, 158, 'gate = SiLU(x @ W)', { size: 19 });
  s.text(190, 186, `[${sw.gate[0].map(f3).join(', ')}]`, { font: 'mono', size: 16 });
  // value branch
  s.rect(580, 130, 260, 70, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(710, 158, 'value = x @ V', { size: 19 });
  s.text(710, 186, `[${sw.xV[0].map(f3).join(', ')}]`, { font: 'mono', size: 16 });
  // product
  s.arrow(190, 200, 326, 252, { color: C.muted, head: 12 });
  s.arrow(710, 200, 554, 252, { color: C.muted, head: 12 });
  s.rect(300, 220, 280, 70, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 248, 'hidden = gate * value', { size: 18 });
  s.text(440, 276, `[${sw.hidden[0].map(f3).join(', ')}]`, { font: 'mono', size: 16 });
  s.arrow(440, 290, 440, 326, { color: C.muted, head: 12 });
  s.rect(280, 326, 320, 46, { color: C.ink, width: 1.4 });
  s.text(440, 355, `output = [${sw.out[0].map(f3).join(', ')}]`, { font: 'mono', size: 16 });
  save('21.2-swiglu.svg', s);
}
