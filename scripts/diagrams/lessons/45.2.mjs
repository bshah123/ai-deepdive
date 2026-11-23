import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-45-semantic-kernel/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. The loop: model, decision, kernel, history.
{
  const s = new Sketch(880, 340, { title: 'Flow: chat history and schemas go to the model; a tool call is invoked by the kernel and its result is added to the history; the loop repeats until the model answers in text', seed: 4521 });
  s.text(440, 30, 'The automatic function-calling loop', { size: 24, weight: 700 });
  s.rect(40, 110, 200, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(140, 134, 'chat history', { size: 18 });
  s.text(140, 156, '+ JSON schemas', { size: 18 });
  s.rect(300, 110, 160, 60, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(380, 146, 'model (LLM)', { size: 18 });
  s.rect(300, 220, 160, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(380, 256, 'text or call?', { size: 18 });
  s.rect(40, 220, 200, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(140, 256, 'final answer', { size: 18 });
  s.rect(560, 220, 280, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(700, 242, 'validate arguments,', { size: 18 });
  s.text(700, 264, 'invoke plugin function', { size: 18 });
  s.rect(560, 110, 280, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(700, 146, 'result added to history', { size: 18 });
  s.arrow(240, 140, 300, 140, { color: C.muted });
  s.arrow(380, 170, 380, 220, { color: C.muted });
  s.text(394, 200, 'reply', { size: 16, anchor: 'start', color: C.muted });
  s.arrow(300, 250, 240, 250, { color: C.muted });
  s.text(270, 240, 'text', { size: 16, color: C.muted });
  s.arrow(460, 250, 560, 250, { color: C.muted });
  s.text(510, 240, 'call', { size: 16, color: C.muted });
  s.arrow(700, 220, 700, 170, { color: C.muted });
  s.line(700, 110, 700, 80, { color: C.muted });
  s.line(700, 80, 140, 80, { color: C.muted });
  s.arrow(140, 80, 140, 110, { color: C.muted });
  s.text(440, 70, 'repeat until the model answers in text', { size: 16, color: C.muted });
  s.note(40, 292, 800, 36, ['The kernel runs the code. A limit on iterations stops a model that never answers.'], { size: 17 });
  save('45.2-function-loop.svg', s);
}

// 2. Signature to schema.
{
  const s = new Sketch(880, 420, { title: 'A Python function with type hints and a docstring is turned into a JSON schema with a name, a description, typed parameters and a required list', seed: 4522 });
  s.text(440, 30, 'A Python signature becomes the JSON the model reads', { size: 24, weight: 700 });
  s.rect(160, 62, 560, 90, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(190, 94, 'def calculate_sum(a: int, b: int) -> int:', { font: 'mono', size: 16, anchor: 'start' });
  s.text(228, 118, '"""Adds two integers."""', { font: 'mono', size: 16, anchor: 'start' });
  s.text(228, 142, 'return a + b', { font: 'mono', size: 16, anchor: 'start' });
  s.arrow(440, 152, 440, 188, { color: C.muted });
  s.text(456, 174, 'to_schema()', { size: 16, anchor: 'start', color: C.muted });
  s.rect(200, 190, 480, 180, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  const json = [
    [230, '{'],
    [249, '"name": "calculate_sum",'],
    [249, '"description": "Adds two integers.",'],
    [249, '"parameters": {"type": "object",'],
    [268, '"properties": {"a": {"type": "integer"},'],
    [268, '"b": {"type": "integer"}},'],
    [249, '"required": ["a", "b"]}}'],
  ];
  json.forEach(([x, line], i) => s.text(x, 216 + i * 22, line, { font: 'mono', size: 16, anchor: 'start' }));
  s.note(60, 380, 760, 34, ['Only names, descriptions and parameter types are sent. The return type is not.'], { size: 17 });
  save('45.2-signature-to-schema.svg', s);
}

// 3. One run, five model calls.
{
  const s = new Sketch(880, 340, { title: 'Five model calls in one run: greet succeeds, the calculate_sum call with a string fails and is retried, then save_to_file runs and the model answers', seed: 4523 });
  s.text(440, 30, 'One run: five model calls, one error recovered', { size: 24, weight: 700 });
  const boxes = [
    { fill: C.greenSoft, col: C.green, lines: ['step 1', 'greet', 'name="Alice"', 'returns', '"Hello, Alice!"'] },
    { fill: C.roseSoft, col: C.rose, lines: ['step 2', 'calculate_sum', 'a="5"', 'error:', 'a must be', 'int, got str'] },
    { fill: C.greenSoft, col: C.green, lines: ['step 3', 'calculate_sum', 'a=5, b=7', 'returns', '12'] },
    { fill: C.greenSoft, col: C.green, lines: ['step 4', 'save_to_file', 'returns', 'saved to', 'result.json'] },
    { fill: C.blueSoft, col: C.blue, lines: ['step 5', 'final answer', 'to the user'] },
  ];
  boxes.forEach((b, i) => {
    const x = 30 + i * 170;
    s.rect(x, 70, 150, 170, { color: b.col, fill: b.fill, fillStyle: 'solid' });
    b.lines.forEach((t, j) => s.text(x + 75, 100 + j * 24, t, { size: 16, weight: j === 0 ? 700 : 400 }));
    if (i < boxes.length - 1) s.arrow(x + 154, 155, x + 166, 155, { color: C.muted });
  });
  s.text(440, 282, 'Characters sent per model call: 704, 865, 1059, 1224, 1451', { size: 18 });
  s.text(440, 308, 'Each call re-sends the whole history, so every call is larger than the last.', { size: 17, color: C.muted });
  save('45.2-run-trace.svg', s);
}

// 4. Growth of total characters sent versus number of calls.
{
  const s = new Sketch(880, 370, { title: 'Bar chart: total characters sent to the model for runs of 5, 10, 20 and 40 model calls: 4,910; 13,920; 44,340; 154,980', seed: 4524 });
  s.text(440, 30, 'Total characters sent grow faster than the number of calls', { size: 24, weight: 700 });
  s.text(440, 62, 'Each call re-sends the whole history, so the total grows faster than linearly.', { size: 17, color: C.muted });
  s.line(120, 320, 800, 320, { color: C.muted });
  const data = [[5, 4910], [10, 13920], [20, 44340], [40, 154980]];
  const k = 210 / 154980;
  data.forEach(([n, v], i) => {
    const cx = 200 + i * 160;
    const h = v * k;
    s.rect(cx - 55, 320 - h, 110, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, 320 - h - 12, v.toLocaleString('en-US'), { size: 17 });
    s.text(cx, 346, `${n} calls`, { size: 17 });
  });
  save('45.2-history-growth.svg', s);
}
console.log('ok');
