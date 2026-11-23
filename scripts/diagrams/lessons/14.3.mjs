import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-14-type-systems/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from scripts/diagrams/lessons/14.3_data.json (run 14.3_experiment.py).
const data = JSON.parse(
  (await import('node:fs')).readFileSync(join(dirname(fileURLToPath(import.meta.url)), '14.3_data.json'), 'utf8'),
);

{ // 1. one compiled validator, many calls
  const s = new Sketch(880, 340, { title: 'Class definition compiles a schema once; each call runs the compiled validator', seed: 301 });
  s.text(440, 30, 'Compile once, validate many', { size: 26, weight: 700 });
  s.rect(300, 50, 280, 60, { color: C.violet, fill: C.violet, fillStyle: 'solid' });
  s.text(440, 86, 'class Reading(BaseModel)', { font: 'mono', size: 16, color: C.ink });
  s.arrow(440, 112, 440, 186, { color: C.muted });
  s.text(462, 152, 'built once', { size: 18, anchor: 'start', color: C.muted });
  s.rect(300, 186, 280, 84, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 220, 'SchemaValidator', { font: 'mono', size: 17 });
  s.text(440, 250, 'compiled Rust core', { size: 17 });
  s.rect(40, 200, 200, 56, { color: C.blue });
  s.text(140, 234, 'input dict', { font: 'mono', size: 16 });
  s.arrow(242, 228, 296, 228, { color: C.muted });
  s.rect(640, 124, 200, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(740, 158, 'Reading object', { size: 18 });
  s.rect(640, 250, 200, 64, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(740, 278, 'ValidationError', { size: 18 });
  s.text(740, 302, 'every bad field listed', { size: 16 });
  s.arrow(584, 218, 636, 152, { color: C.green });
  s.arrow(584, 246, 636, 278, { color: C.rose });
  save('14.3-pipeline.svg', s);
}

{ // 2. three bad fields, one pass
  const s = new Sketch(880, 350, { title: 'One invalid record yields three entries in one ValidationError', seed: 302 });
  s.text(440, 30, 'One record, three errors, one pass', { size: 26, weight: 700 });
  s.rect(40, 60, 330, 240, { color: C.muted });
  s.text(60, 100, "'sensor_id': 'X-1'", { font: 'mono', size: 16, anchor: 'start' });
  s.text(60, 150, "'temperature_c': 'hot'", { font: 'mono', size: 16, anchor: 'start' });
  s.text(60, 200, "'count': 0", { font: 'mono', size: 16, anchor: 'start' });
  s.text(60, 262, 'input dict (3 bad fields)', { size: 16, anchor: 'start', color: C.muted });
  const rows = [
    ['sensor_id [string_pattern_mismatch]', ["String should match pattern '^S-\\d{3}$'"]],
    ['temperature_c [float_parsing]', ['Input should be a valid number, unable', 'to parse string as a number']],
    ['count [greater_than]', ['Input should be greater than 0']],
  ];
  rows.forEach(([head, body], i) => {
    const top = 62 + i * 96;
    const h = body.length === 2 ? 84 : 66;
    s.rect(440, top, 400, h, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(460, top + 24, head, { font: 'mono', size: 15, anchor: 'start' });
    body.forEach((line, j) => s.text(460, top + 48 + j * 20, line, { size: 16, anchor: 'start' }));
    const y = [110, 160, 210][i];
    s.arrow(374, y, 436, top + h / 2, { color: C.muted });
  });
  save('14.3-errors.svg', s);
}

{ // 3. lax vs strict coercion, int field, from measured results
  const s = new Sketch(880, 350, { title: 'Lax and strict int validation for six inputs', seed: 303 });
  s.text(440, 30, 'Lax versus strict for an int field', { size: 26, weight: 700 });
  const cols = { input: 60, lax: 420, strict: 640 };
  s.rect(40, 54, 800, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(cols.input, 80, 'input (Python value)', { size: 17, anchor: 'start', weight: 700 });
  s.text(cols.lax, 80, 'lax mode', { size: 17, anchor: 'start', weight: 700 });
  s.text(cols.strict, 80, 'strict mode', { size: 17, anchor: 'start', weight: 700 });
  const rowsData = [
    ['1 (int)', 'ok → 1', 'ok → 1'],
    ["'1' (str)", 'ok → 1', 'int_type'],
    ['1.0 (float)', 'ok → 1', 'int_type'],
    ['1.5 (float)', 'int_from_float', 'int_type'],
    ["' 7 ' (str)", 'ok → 7', 'int_type'],
    ["'abc' (str)", 'int_parsing', 'int_type'],
  ];
  rowsData.forEach(([input, lax, strict], i) => {
    const y = 124 + i * 36;
    s.line(40, y - 22, 840, y - 22, { color: C.muted, width: 0.8 });
    s.text(cols.input, y, input, { font: 'mono', size: 16, anchor: 'start' });
    s.text(cols.lax, y, lax, { size: 17, anchor: 'start', color: lax.startsWith('ok') ? C.green : C.rose });
    s.text(cols.strict, y, strict, { size: 17, anchor: 'start', color: strict.startsWith('ok') ? C.green : C.rose });
  });
  s.text(440, 336, 'Results from 14.3_data.json; Pydantic 2.14.4.', { size: 15, color: C.muted });
  save('14.3-coercion.svg', s);
}

{ // 4. measured cost per record
  const b = data.bench;
  const s = new Sketch(880, 330, { title: 'Microseconds per record for three validation paths', seed: 304 });
  s.text(440, 30, 'Cost per valid record (microseconds)', { size: 26, weight: 700 });
  const items = [
    ['hand-written Python', b.handwritten_python.us_per_record, C.green, C.greenSoft],
    ['Pydantic, dict input', b.pydantic_model_validate_dict.us_per_record, C.blue, C.blueSoft],
    ['Pydantic, JSON string', b.pydantic_model_validate_json.us_per_record, C.blue, C.blueSoft],
  ];
  const scale = 290; // px per microsecond
  items.forEach(([label, us, col, soft], i) => {
    const y = 80 + i * 70;
    s.text(40, y + 26, label, { size: 18, anchor: 'start' });
    const w = us * scale;
    s.rect(300, y, w, 44, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(300 + w + 12, y + 28, `${us.toFixed(2)} µs`, { font: 'mono', size: 16, anchor: 'start' });
  });
  s.text(440, 300, `${data.bench_records.toLocaleString('en-US')} records, median of 5 runs; machine-dependent`, { size: 16, color: C.muted });
  save('14.3-bench.svg', s);
}
console.log('ok');
