// Lesson 47.1 diagrams. Numbers come from the experiment run for this lesson
// (JSON Schema validator vs jsonschema 4.26.0, 1000-sample constrained decoding
// simulation with seeds 7 and 11). Fixed seeds keep the SVGs byte-identical.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-07-frameworks/chapter-47-tool-calling/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Where the schema sits in the tool-calling loop
{
  const s = new Sketch(880, 330, { title: 'Tool call loop: the schema checks the model output before code runs', seed: 101 });
  s.text(440, 36, 'The schema sits between the model and your code', { size: 26, weight: 700 });
  s.rect(40, 80, 230, 100, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(155, 115, ['Tool definition', 'name, description,', 'input_schema (JSON Schema)'], { size: 17 });
  s.arrow(272, 130, 318, 130, { color: C.muted });
  s.rect(322, 80, 230, 100, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(437, 115, ['Model writes a call:', 'name + input object', 'as JSON text'], { size: 17 });
  s.arrow(554, 130, 600, 130, { color: C.muted });
  s.rect(604, 80, 236, 100, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(722, 115, ['Host validates input', 'against input_schema', 'before anything runs'], { size: 17 });
  s.arrow(722, 184, 722, 240, { color: C.green });
  s.text(738, 218, 'valid', { size: 17, anchor: 'start', color: C.green });
  s.rect(604, 244, 236, 64, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(722, 282, 'run the function', { size: 18 });
  s.arrow(640, 186, 437, 242, { color: C.rose, dash: '6 8' });
  s.text(470, 212, 'invalid', { size: 17, anchor: 'end', color: C.rose });
  s.rect(322, 244, 230, 64, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(437, 282, 'return errors, retry', { size: 18 });
  save('47.1-tool-loop.svg', s);
}

// 2. Validation grid: seven of the ten candidate outputs (values from the experiment)
{
  const s = new Sketch(880, 440, { title: 'Validation results for seven candidate outputs', seed: 102 });
  s.text(440, 34, 'Which rules does each candidate break?', { size: 26, weight: 700 });
  const cols = [{ x: 330, h: 'required' }, { x: 440, h: 'enum' }, { x: 550, h: 'minimum' }, { x: 660, h: 'integer' }, { x: 790, h: 'result' }];
  s.text(70, 76, 'candidate (days field)', { size: 17, anchor: 'start', color: C.muted });
  for (const c of cols) s.text(c.x, 76, c.h, { size: 17, color: C.muted });
  s.line(40, 88, 840, 88, { color: C.muted, width: 1.2 });
  const rows = [
    ['c1  days = 3', ['pass', 'pass', 'pass', 'pass'], 'OK'],
    ['c2  days omitted', ['pass', 'pass', '-', '-'], 'OK'],
    ['c7  days = 3.0', ['pass', 'pass', 'pass', 'pass'], 'OK'],
    ['c4  unit = kelvin', ['pass', 'fail', '-', '-'], 'ERR'],
    ['c6  days = 0', ['pass', 'pass', 'fail', 'pass'], 'ERR'],
    ['c8  days = 2.5', ['pass', 'pass', 'pass', 'fail'], 'ERR'],
    ['c9  days = true', ['pass', 'pass', '-', 'fail'], 'ERR'],
  ];
  rows.forEach(([label, marks, res], i) => {
    const y = 124 + i * 40;
    s.text(70, y, label, { size: 18, anchor: 'start', font: 'mono' });
    marks.forEach((m, j) => {
      const color = m === 'fail' ? C.rose : m === 'pass' ? C.green : C.muted;
      s.text(cols[j].x, y, m, { size: 17, color });
    });
    const ok = res === 'OK';
    s.rect(745, y - 22, 92, 30, { color: ok ? C.green : C.rose, fill: ok ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(791, y, res, { size: 17, color: ok ? C.green : C.rose });
  });
  s.note(40, 392, 800, 34, ['all 10 candidates: 3 accepted, jsonschema agrees on every one'], { size: 17 });
  save('47.1-validation-grid.svg', s);
}

// 3. Strict-mode violations per schema (counts from the experiment)
{
  const s = new Sketch(880, 360, { title: 'Strict-mode violations per schema', seed: 103 });
  s.text(440, 34, 'Strict-mode rule violations, by schema', { size: 26, weight: 700 });
  const data = [['TOOL', 1], ['STRICT_TOOL', 0], ['NO_ADDL', 1], ['NESTED', 3]];
  const base = 290, unit = 70, x0 = 150, gap = 170;
  s.line(110, base, 800, base, { color: C.ink, width: 1.6 });
  data.forEach(([name, v], i) => {
    const x = x0 + i * gap;
    const h = v * unit;
    if (h > 0) s.rect(x - 40, base - h, 80, h, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(x, base - h - 12, String(v), { size: 22, weight: 700 });
    s.text(x, base + 28, name, { size: 17, font: 'mono' });
  });
  s.text(440, 340, 'rules: every object sets additionalProperties false and lists every property in required', { size: 16, color: C.muted });
  save('47.1-strict-violations.svg', s);
}

// 4. Masking: one decoding step after the prefix {"unit": "
{
  const s = new Sketch(880, 300, { title: 'One decoding step with a schema mask', seed: 104 });
  s.text(440, 34, 'One decoding step after the prefix  {"unit": "', { size: 26, weight: 700 });
  const chips = ['{', '"', 'a', 'c', 'f', 'z', '3', ':', ' ', 'e', 'x', '}'];
  const ok = new Set(['c', 'f']);
  chips.forEach((t, i) => {
    const x = 40 + i * 70;
    const allowed = ok.has(t);
    if (allowed) s.rect(x, 80, 58, 52, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    else s.rect(x, 80, 58, 52, { color: C.muted, width: 1.2, dash: '6 8' });
    s.text(x + 29, 114, t, { size: 22, font: 'mono', color: allowed ? C.ink : C.muted });
  });
  s.text(440, 176, 'shown: 12 of the 42 tokens. Allowed next: c and f (2 of 42).', { size: 19 });
  s.note(40, 206, 800, 70, ['masked tokens get logit -infinity before sampling;', 'the model still chooses, but only among c and f'], { size: 18 });
  save('47.1-mask-step.svg', s);
}

// 5. Validity under two decoders (1000 samples each) and the output distribution
{
  const s = new Sketch(880, 380, { title: 'Validity: unconstrained vs schema-masked sampling', seed: 105 });
  s.text(440, 34, 'Simulated decoders, 1000 samples each', { size: 26, weight: 700 });
  s.text(220, 78, 'valid outputs out of 1000', { size: 18, color: C.muted });
  const base = 300, scale = 0.16; // 1000 -> 160 px, same scale in both panels
  s.line(60, base, 380, base, { color: C.ink, width: 1.6 });
  const bars = [['no mask', 0, C.rose], ['no mask, +3 bonus', 0, C.rose], ['schema mask', 1000, C.green]];
  bars.forEach(([name, v, col], i) => {
    const x = 110 + i * 100;
    const h = Math.max(v * scale, 2);
    s.rect(x - 32, base - h, 64, h, { color: col, fill: col === C.green ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(x, base - h - 10, String(v), { size: 18, weight: 700 });
    s.text(x, base + 26, name, { size: 15, anchor: 'middle' });
  });
  s.text(560, 78, 'schema-masked outputs, count per string', { size: 18, color: C.muted });
  const counts = [['c,1', 187], ['c,2', 165], ['c,3', 187], ['f,1', 149], ['f,2', 179], ['f,3', 133]];
  const b2 = 300, sc2 = 0.16;
  s.line(470, b2, 860, b2, { color: C.ink, width: 1.6 });
  counts.forEach(([name, v], i) => {
    const x = 500 + i * 60;
    const h = v * sc2;
    s.rect(x - 20, b2 - h, 40, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x, b2 - h - 10, String(v), { size: 16 });
    s.text(x, b2 + 26, name, { size: 15, font: 'mono' });
  });
  s.text(440, 362, 'the mask fixes the shape; which string is chosen still depends on the model', { size: 16, color: C.muted });
  save('47.1-validity-bars.svg', s);
}
