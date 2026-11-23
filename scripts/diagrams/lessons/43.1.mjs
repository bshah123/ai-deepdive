import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-43-langchain-lcel/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Each step returns a value; the next step receives exactly that value.
{
  const s = new Sketch(880, 300, { title: 'Four pipeline steps, each passing its output to the next, with the prompt value type highlighted', seed: 4301 });
  s.text(440, 34, 'Each step returns a value; the next step receives it', { size: 24, weight: 700 });
  const y = 84, h = 76, w = 180;
  const steps = [
    { x: 30,  fill: C.blueSoft,  color: C.blue,  lines: ['input dict', "{'input_text': ...}"] },
    { x: 240, fill: C.amberSoft, color: C.amber, lines: ['PromptTemplate', 'StringPromptValue'] },
    { x: 450, fill: C.roseSoft,  color: C.rose,  lines: ['RunnableLambda', 'gets a PromptValue'] },
    { x: 660, fill: C.greenSoft, color: C.green, lines: ['StrOutputParser', 'returns str'] },
  ];
  for (const st of steps) {
    s.rect(st.x, y, w, h, { color: st.color, fill: st.fill, fillStyle: 'solid' });
    s.text(st.x + w / 2, y + 32, st.lines[0], { size: 18, weight: 700 });
    s.text(st.x + w / 2, y + 58, st.lines[1], { font: 'mono', size: 15 });
  }
  for (let i = 0; i < 3; i++) s.arrow(steps[i].x + w + 4, y + h / 2, steps[i + 1].x - 4, y + h / 2, { color: C.muted });
  s.note(300, 196, 440, 56, ["Without .to_string(), the function sees the wrapper:", "text='Process this input: Hello, LangChain!'"], { size: 17 });
  s.text(440, 282, 'Fix: call pv.to_string() in the function, so it receives plain text', { size: 19 });
  save('43.1-data-types.svg', s);
}

// 2. RunnableLambda passes the whole input as one argument.
{
  const s = new Sketch(880, 300, { title: 'A two-argument function given one dict raises TypeError', seed: 4302 });
  s.text(440, 34, 'RunnableLambda passes the whole input as one argument', { size: 24, weight: 700 });
  s.rect(40, 100, 280, 64, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(180, 139, "invoke({'a': 5, 'b': 3})", { font: 'mono', size: 16 });
  s.arrow(325, 132, 435, 132, { color: C.muted });
  s.text(380, 118, 'one value', { size: 17, color: C.muted });
  s.rect(440, 100, 400, 64, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(640, 139, 'add_numbers(a, b)', { font: 'mono', size: 16 });
  s.text(440, 205, "TypeError: missing 1 required positional argument: 'b'", { font: 'mono', size: 16, color: C.rose });
  s.text(440, 258, "Fix: RunnableLambda(lambda d: add_numbers(d['a'], d['b']))  returns 8", { size: 19 });
  save('43.1-input-shape.svg', s);
}

// 3. RunnableParallel fans the same input out to branches and merges a dict.
{
  const s = new Sketch(880, 300, { title: 'RunnableParallel fan-out: one input, two branches, one dict', seed: 4303 });
  s.text(440, 34, 'RunnableParallel: one input, several branches, one dict out', { size: 24, weight: 700 });
  s.rect(40, 115, 170, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(125, 151, "'abc'", { font: 'mono', size: 18 });
  s.rect(290, 70, 250, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(415, 106, 'upper = str.upper', { font: 'mono', size: 16 });
  s.rect(290, 170, 250, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(415, 206, 'length = len', { font: 'mono', size: 16 });
  s.arrow(210, 145, 288, 100, { color: C.muted });
  s.arrow(210, 145, 288, 200, { color: C.muted });
  s.rect(600, 115, 240, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(720, 152, ["{'upper': 'ABC',", "'length': 3}"], { font: 'mono', size: 16 });
  s.arrow(542, 100, 598, 135, { color: C.muted });
  s.arrow(542, 200, 598, 165, { color: C.muted });
  s.text(440, 262, 'Both branches get the same input. Their keys become the output keys.', { size: 19 });
  save('43.1-parallel-fanout.svg', s);
}

// 4. batch keeps input order.
{
  const s = new Sketch(880, 290, { title: 'batch returns one output per input, in input order', seed: 4304 });
  s.text(440, 34, 'batch: outputs come back in input order', { size: 24, weight: 700 });
  s.text(440, 88, 'lambda x: x * 2, applied to each input', { font: 'mono', size: 16, color: C.muted });
  const rows = [[130, '3', '6'], [180, '1', '2'], [230, '2', '4']];
  for (const [yc, inp, out] of rows) {
    s.rect(60, yc - 22, 120, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(120, yc + 6, inp, { font: 'mono', size: 18 });
    s.arrow(184, yc, 694, yc, { color: C.muted });
    s.rect(700, yc - 22, 120, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(760, yc + 6, out, { font: 'mono', size: 18 });
  }
  s.text(440, 275, 'Inputs 3, 1, 2 give outputs 6, 2, 4: the list keeps the input order.', { size: 19 });
  save('43.1-batch-order.svg', s);
}

// 5. What the | operator does, in two cases.
{
  const s = new Sketch(880, 310, { title: 'What the pipe operator builds: a RunnableSequence in both cases', seed: 4305 });
  s.text(440, 34, 'What the | operator builds', { size: 24, weight: 700 });
  const col = [20, 240, 460, 680], w = 180, hB = 56;
  s.text(20, 80, 'Case 1: a runnable on the left', { size: 18, weight: 700, anchor: 'start' });
  const rA = 125;
  s.rect(col[0], rA - hB / 2, w, hB, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(col[0] + w / 2, rA + 6, 'a | b', { font: 'mono', size: 16 });
  s.rect(col[1], rA - hB / 2, w, hB, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(col[1] + w / 2, rA + 6, 'a.__or__(b)', { font: 'mono', size: 15 });
  s.rect(col[2], rA - hB / 2, w, hB, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(col[2] + w / 2, rA + 2, ['RunnableSequence', '(a, coerce(b))'], { font: 'mono', size: 15 });
  s.arrow(col[0] + w + 4, rA, col[1] - 4, rA, { color: C.muted });
  s.arrow(col[1] + w + 4, rA, col[2] - 4, rA, { color: C.muted });
  s.text(20, 196, 'Case 2: a dict literal on the left', { size: 18, weight: 700, anchor: 'start' });
  const rB = 245;
  s.rect(col[0], rB - hB / 2, w, hB, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(col[0] + w / 2, rB + 6, "{'k': f} | b", { font: 'mono', size: 15 });
  s.rect(col[1], rB - hB / 2, w, hB, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(col[1] + w / 2, rB + 2, ['dict.__or__', 'NotImplemented'], { font: 'mono', size: 14 });
  s.rect(col[2], rB - hB / 2, w, hB, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(col[2] + w / 2, rB + 6, 'b.__ror__(dict)', { font: 'mono', size: 14 });
  s.rect(col[3], rB - hB / 2, w, hB, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(col[3] + w / 2, rB + 2, ['RunnableSequence', '(coerce(dict), b)'], { font: 'mono', size: 14 });
  s.arrow(col[0] + w + 4, rB, col[1] - 4, rB, { color: C.muted });
  s.arrow(col[1] + w + 4, rB, col[2] - 4, rB, { color: C.muted });
  s.arrow(col[2] + w + 4, rB, col[3] - 4, rB, { color: C.muted });
  s.text(440, 300, 'Each | builds a new object; nothing runs until invoke() is called.', { size: 18 });
  save('43.1-pipe-operator.svg', s);
}
