import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-07-frameworks/chapter-46-dspy/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '46.2_data.json'), 'utf8'));

// 1. Signature anatomy
{
  const s = new Sketch(880, 440, { title: 'A signature: docstring, input and output fields, rendered prompt', seed: 4621 });
  s.text(440, 40, 'A signature is a contract', { size: 26, weight: 700 });
  s.note(40, 64, 340, 110, ['Docstring = instructions:', '"Given the fields question,', 'produce the fields answer."'], { size: 18 });
  s.note(430, 64, 410, 110, ['Inputs: the caller fills them.', 'Outputs: the model fills them.', 'The reply is parsed back into fields.'], { size: 18 });
  s.rect(40, 210, 190, 54, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(135, 243, 'question (input)', { font: 'mono', size: 16 });
  s.rect(260, 210, 190, 54, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(355, 243, 'answer (output)', { font: 'mono', size: 16 });
  s.text(135, 292, 'caller fills', { size: 18, color: C.muted });
  s.text(355, 292, 'model fills', { size: 18, color: C.muted });
  s.arrow(225, 306, 225, 336, { color: C.muted });
  s.rect(40, 342, 800, 46, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 371, '[[ ## question ## ]]  ...  [[ ## answer ## ]]', { font: 'mono', size: 16 });
  s.text(440, 418, 'the module renders one prompt string from this', { size: 18, color: C.muted });
  save('46.2-signature-anatomy.svg', s);
}

// 2. Predict flow
{
  const s = new Sketch(880, 260, { title: 'Predict: render, call the LM, parse, return fields', seed: 4622 });
  s.text(440, 40, 'Predict: render, call, parse', { size: 26, weight: 700 });
  const boxes = [
    { x: 30, fill: C.blueSoft, color: C.blue, lines: ['render', 'prompt'], under: 'signature + input' },
    { x: 245, fill: C.roseSoft, color: C.violet, lines: ['call', 'the LM'], under: 'stub or real model' },
    { x: 460, fill: C.amberSoft, color: C.amber, lines: ['parse', 'markers'], under: 'one marker per field' },
    { x: 675, fill: C.greenSoft, color: C.green, lines: ['result', '{answer: 51}'], under: 'named fields' },
  ];
  for (const b of boxes) {
    s.rect(b.x, 90, 170, 90, { color: b.color, fill: b.fill, fillStyle: 'solid' });
    s.text(b.x + 85, 122, b.lines[0], { size: 20, weight: 700 });
    s.text(b.x + 85, 150, b.lines[1], { size: 18, font: b.lines[1].startsWith('{') ? 'mono' : 'hand' });
    s.text(b.x + 85, 214, b.under, { size: 16, color: C.muted });
  }
  s.arrow(200, 135, 245, 135, { color: C.ink });
  s.arrow(415, 135, 460, 135, { color: C.ink });
  s.arrow(630, 135, 675, 135, { color: C.ink });
  save('46.2-predict-flow.svg', s);
}

// 3. Parse success with and without one retry (simulated; values from 46.2_data.json)
{
  const s = new Sketch(880, 420, { title: 'Simulated parse success', seed: 4623 });
  s.text(440, 34, 'Simulated parse success, 2000 calls per setting', { size: 24, weight: 700 });
  s.rect(130, 52, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(160, 68, 'one try', { size: 18, anchor: 'start' });
  s.rect(300, 52, 22, 16, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(330, 68, 'one try + 1 retry', { size: 18, anchor: 'start' });
  const base = 340, top = 110, scale = base - top;
  s.line(130, base, 780, base, { color: C.ink });
  data.sim.forEach((row, i) => {
    const gx = 230 + i * 220;
    const bars = [
      { x: gx - 66, v: row.one_try, color: C.blue, fill: C.blueSoft },
      { x: gx + 6, v: row.one_try_plus_retry, color: C.green, fill: C.greenSoft },
    ];
    for (const b of bars) {
      const h = b.v * scale;
      s.rect(b.x, base - h, 60, h, { color: b.color, fill: b.fill, fillStyle: 'solid' });
      s.text(b.x + 30, base - h - 10, b.v.toFixed(2), { size: 16, font: 'mono' });
    }
    s.text(gx, base + 36, `p = ${row.p}`, { size: 20 });
  });
  save('46.2-parse-retry.svg', s);
}

// 4. ChainOfThought extends the signature
{
  const s = new Sketch(880, 310, { title: 'ChainOfThought prepends one output field', seed: 4624 });
  s.text(440, 40, 'ChainOfThought prepends one output field', { size: 26, weight: 700 });
  s.text(40, 130, 'Predict', { size: 22, anchor: 'start' });
  s.text(40, 230, 'ChainOfThought', { size: 22, anchor: 'start' });
  s.rect(300, 102, 160, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(380, 133, 'question', { size: 18, font: 'mono' });
  s.rect(490, 102, 160, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(570, 133, 'answer', { size: 18, font: 'mono' });
  s.arrow(460, 127, 490, 127, { color: C.muted });
  s.rect(300, 202, 160, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(380, 233, 'question', { size: 18, font: 'mono' });
  s.rect(490, 202, 180, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(580, 233, 'reasoning', { size: 18, font: 'mono' });
  s.rect(690, 202, 160, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(770, 233, 'answer', { size: 18, font: 'mono' });
  s.arrow(460, 227, 490, 227, { color: C.muted });
  s.arrow(670, 227, 690, 227, { color: C.muted });
  s.text(580, 284, 'new field, first among the outputs; inputs unchanged', { size: 18, color: C.amber });
  save('46.2-cot-extension.svg', s);
}

// 5. Module tree and named_predictors paths
{
  const s = new Sketch(880, 440, { title: 'Module tree and predictor paths', seed: 4625 });
  s.text(440, 34, 'named_predictors() walks the module tree', { size: 26, weight: 700 });
  s.rect(330, 60, 220, 52, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(440, 92, 'Pipeline', { size: 24, weight: 700 });
  s.line(440, 112, 210, 170, { color: C.muted });
  s.line(440, 112, 650, 170, { color: C.muted });
  s.rect(60, 170, 300, 100, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(210, 205, 'draft', { size: 24, weight: 700 });
  s.text(210, 234, 'Predict', { size: 18 });
  s.text(210, 260, 'question -> draft', { size: 16, font: 'mono' });
  s.rect(500, 170, 300, 100, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(650, 205, 'solve', { size: 24, weight: 700 });
  s.text(650, 234, 'ChainOfThought', { size: 18 });
  s.text(650, 260, 'attribute: predict', { size: 16, font: 'mono' });
  s.line(650, 270, 650, 300, { color: C.muted });
  s.rect(500, 300, 300, 100, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(650, 330, 'solve.predict', { size: 18, font: 'mono' });
  s.text(650, 357, 'inputs: question, draft', { size: 15, font: 'mono' });
  s.text(650, 381, 'outputs: reasoning, answer', { size: 15, font: 'mono' });
  save('46.2-module-tree.svg', s);
}
