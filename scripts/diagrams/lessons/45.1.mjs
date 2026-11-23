import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-45-semantic-kernel/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from 45.1-experiment.py (45.1-data.json) and 45.1-sk-check.py (real semantic-kernel 1.36.0 output).
const data = JSON.parse(readFileSync(join(HERE, '45.1-data.json'), 'utf8'));

// 1. The plugin call loop: six steps, two of which involve the model.
{
  const s = new Sketch(880, 370, { title: 'Six steps of one plugin call: register, send schemas, model replies, kernel checks arguments, method runs, result returns to the model', seed: 4501 });
  s.text(440, 34, 'How one plugin call travels', { size: 26, weight: 700 });
  const box = (x, y, title, sub, fill, color) => {
    s.rect(x, y, 230, 84, { color, fill, fillStyle: 'solid' });
    s.text(x + 115, y + 32, title, { size: 19, weight: 700 });
    s.text(x + 115, y + 62, sub, { font: 'mono', size: 15 });
  };
  box(30, 70, '1 Register methods', "add_plugin(obj, 'math')", C.blueSoft, C.blue);
  box(325, 70, '2 Send schemas to model', 'name, params, types', C.amberSoft, C.amber);
  box(620, 70, '3 Model replies', 'function + JSON args', C.amberSoft, C.amber);
  box(620, 210, '4 Kernel checks args', "coerce '5' -> 5.0", C.blueSoft, C.blue);
  box(325, 210, '5 Your method runs', 'return num1 + num2', C.blueSoft, C.blue);
  box(30, 210, '6 Result to model', 'str(8.0) -> "8.0"', C.amberSoft, C.amber);
  s.arrow(262, 112, 323, 112, { color: C.muted });
  s.arrow(557, 112, 618, 112, { color: C.muted });
  s.arrow(735, 156, 735, 208, { color: C.muted });
  s.arrow(618, 252, 557, 252, { color: C.muted });
  s.arrow(323, 252, 262, 252, { color: C.muted });
  s.text(440, 348, 'Amber steps involve the language model. Blue steps are ordinary Python.', { size: 18 });
  save('45.1-plugin-call-loop.svg', s);
}

// 2. Signature to kernel metadata (real SK 1.36.0 output: math-add, float, required, descriptions).
{
  const s = new Sketch(880, 380, { title: 'A Python signature becomes the function description the model reads', seed: 4502 });
  s.text(440, 34, 'What the kernel reads from your signature', { size: 26, weight: 700 });
  s.rect(20, 70, 480, 250, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid' });
  const code = [
    [120, 'class MathPlugin:'],
    [158, '    def add('],
    [196, '        num1: Annotated[float, "first number"],'],
    [234, '        num2: Annotated[float, "second number"]'],
    [272, '    ) -> float'],
  ];
  for (const [y, t] of code) s.text(36, y, t, { font: 'mono', size: 15, anchor: 'start' });
  s.text(540, 120, "plugin 'math' is given to add_plugin", { size: 17, color: C.muted, anchor: 'start' });
  s.text(540, 158, `name: ${data.add_schema.name}`, { size: 19, color: C.green, anchor: 'start', weight: 700 });
  s.text(540, 196, 'num1: float, required, "first number"', { size: 18, color: C.blue, anchor: 'start' });
  s.text(540, 234, 'num2: float, required, "second number"', { size: 18, color: C.blue, anchor: 'start' });
  s.text(540, 272, 'returns: float', { size: 18, color: C.violet, anchor: 'start' });
  s.arrow(150, 158, 530, 158, { color: C.green });
  s.arrow(470, 196, 530, 196, { color: C.blue });
  s.arrow(470, 234, 530, 234, { color: C.blue });
  s.arrow(170, 272, 530, 272, { color: C.violet });
  s.text(440, 344, 'Annotations give the JSON types; the Annotated string becomes the parameter description.', { size: 17 });
  s.text(440, 368, 'The divide method has the same shape but no parameter descriptions.', { size: 17 });
  save('45.1-signature-to-metadata.svg', s);
}

// 3. One call, value by value, plus the two error branches.
{
  const s = new Sketch(880, 350, { title: 'One call traced value by value, with two error branches', seed: 4503 });
  s.text(440, 34, 'One call, value by value', { size: 26, weight: 700 });
  const card = (x, title, lines, fill, color) => {
    s.rect(x, 64, 182, 130, { color, fill, fillStyle: 'solid' });
    s.text(x + 91, 92, title, { size: 17, weight: 700 });
    lines.forEach((l, i) => s.text(x + 91, 124 + i * 28, l, { font: 'mono', size: 16 }));
  };
  card(22, 'Model reply (text)', ['{"num1": "5",', '"num2": "3"}'], C.amberSoft, C.amber);
  card(240, 'After coercion', ["'5' -> 5.0", "'3' -> 3.0"], C.blueSoft, C.blue);
  card(458, 'Method returns', ['5.0 + 3.0', '= 8.0'], C.blueSoft, C.blue);
  card(676, 'Back to the model', ['str(8.0)', '"8.0"'], C.amberSoft, C.amber);
  s.arrow(206, 128, 237, 128, { color: C.muted });
  s.arrow(424, 128, 455, 128, { color: C.muted });
  s.arrow(642, 128, 673, 128, { color: C.muted });
  s.text(440, 236, 'Errors surface as exceptions, not as text the model reads:', { size: 18 });
  s.rect(30, 256, 415, 66, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(237, 284, `missing num2 -> ${'ValueError'}`, { size: 18, weight: 700 });
  s.text(237, 308, data.errors.missing_argument.replace('math-add: ', ''), { font: 'mono', size: 14 });
  s.rect(465, 256, 385, 66, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(657, 284, 'num2 = 0 -> ZeroDivisionError', { size: 18, weight: 700 });
  s.text(657, 308, `"${data.errors.divide_by_zero}"`, { font: 'mono', size: 15 });
  save('45.1-one-call-trace.svg', s);
}

// 4. Measured schema size grows linearly with the number of functions.
{
  const s = new Sketch(880, 400, { title: 'Bar chart: schema size in characters for 1, 2, 4, 8 and 16 functions', seed: 4504 });
  s.text(440, 34, 'Schema size grows in a straight line', { size: 26, weight: 700 });
  s.text(40, 72, 'characters of schema JSON', { size: 17, anchor: 'start', color: C.muted });
  const counts = Object.keys(data.schema_chars_by_function_count);
  const values = counts.map((k) => data.schema_chars_by_function_count[k]);
  const max = Math.max(...values);
  const base = 298, scale = 210 / max;
  s.line(60, base, 820, base, { color: C.muted });
  counts.forEach((k, i) => {
    const cx = 150 + i * 140, h = values[i] * scale;
    s.rect(cx - 40, base - h, 80, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, String(values[i]), { font: 'mono', size: 16 });
    s.text(cx, base + 28, k === '1' ? '1 function' : `${k} functions`, { size: 17 });
  });
  s.text(440, 362, `About ${Math.round(values[values.length - 1] / 16)} characters per function, measured with the mini kernel.`, { size: 17 });
  s.text(440, 386, 'Real providers encode schemas differently; the linear growth is what matters.', { size: 17 });
  save('45.1-schema-size.svg', s);
}
