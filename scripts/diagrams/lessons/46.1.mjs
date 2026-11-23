import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-07-frameworks/chapter-46-dspy/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from the code block in lesson 46.1 (run with plain Python 3.12).
// Prompt word counts: Predict 0/1/2/4 demos = 14/26/37/60; ChainOfThought 0 demos = 15.

{ // 1. signature -> prompt -> LM -> parsed fields
  const s = new Sketch(880, 340, { title: 'A signature is rendered into a prompt, then the output is parsed back into fields', seed: 4601 });
  s.text(440, 36, 'From signature to fields', { size: 26, weight: 700 });
  s.rect(40, 72, 250, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(165, 106, 'question -> answer', { font: 'mono', size: 18 });
  s.arrow(296, 100, 332, 100, { color: C.muted });
  s.rect(332, 72, 196, 56, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(430, 106, 'LM call', { size: 22 });
  s.arrow(534, 100, 566, 100, { color: C.muted });
  s.rect(566, 72, 274, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(703, 106, 'parse output fields', { size: 22 });
  s.note(40, 168, 400, 124, ['The prompt the LM sees:', 'Question: What is the capital of France?', 'Output fields: answer'], { size: 19 });
  s.note(470, 168, 370, 124, ['The completion, parsed:', 'Answer: Paris', "pred.answer == 'Paris'"], { size: 19 });
  s.text(440, 322, 'The programmer writes only the signature. Rendering and parsing are the framework’s job.', { size: 18 });
  save('46.1-signature-pipeline.svg', s);
}

{ // 2. Predict as a callable with parameters
  const s = new Sketch(880, 350, { title: 'Predict is a callable object that holds a signature, a model and demonstrations', seed: 4602 });
  s.text(440, 36, 'Predict: a callable with parameters', { size: 26, weight: 700 });
  s.rect(220, 70, 440, 220, { color: C.ink, fillStyle: 'solid', fill: 'none' });
  s.text(440, 102, 'Predict', { size: 24, weight: 700 });
  s.rect(250, 118, 380, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 144, 'signature: question -> answer', { font: 'mono', size: 16 });
  s.rect(250, 174, 380, 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 200, 'lm: any callable from prompt to text', { size: 19 });
  s.rect(250, 230, 380, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 256, 'demos: [ ] (filled in by an optimizer)', { size: 19 });
  s.arrow(40, 160, 218, 160, { color: C.muted });
  s.text(129, 136, 'question=...', { font: 'mono', size: 16 });
  s.arrow(662, 160, 840, 160, { color: C.muted });
  s.text(751, 136, 'answer', { size: 20 });
  s.text(440, 326, 'Calling it renders the prompt, calls lm once, then parses the output fields.', { size: 18 });
  save('46.1-predict-module.svg', s);
}

{ // 3. ChainOfThought adds one output field
  const s = new Sketch(880, 340, { title: 'ChainOfThought adds one output field before the answer', seed: 4603 });
  s.text(440, 36, 'ChainOfThought adds one output field', { size: 26, weight: 700 });
  s.text(40, 112, 'Predict', { size: 22, weight: 700, anchor: 'start' });
  s.rect(190, 88, 150, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(265, 117, 'question', { font: 'mono', size: 17 });
  s.arrow(340, 111, 590, 111, { color: C.muted });
  s.rect(590, 88, 150, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(665, 117, 'answer', { font: 'mono', size: 17 });
  s.text(40, 230, 'ChainOfThought', { size: 22, weight: 700, anchor: 'start' });
  s.rect(190, 206, 150, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(265, 235, 'question', { font: 'mono', size: 17 });
  s.arrow(340, 229, 380, 229, { color: C.muted });
  s.rect(380, 206, 180, 46, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(470, 235, 'reasoning', { font: 'mono', size: 17 });
  s.arrow(560, 229, 590, 229, { color: C.muted });
  s.rect(590, 206, 150, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(665, 235, 'answer', { font: 'mono', size: 17 });
  s.note(190, 276, 560, 56, ['The rationale is a real output field: the LM writes it before the answer.'], { size: 18 });
  save('46.1-chain-of-thought.svg', s);
}

{ // 4. program graph with LM call counts
  const s = new Sketch(880, 330, { title: 'A two-step program makes two LM calls per question', seed: 4604 });
  s.text(440, 36, 'A program is a graph of modules', { size: 26, weight: 700 });
  s.rect(30, 125, 120, 90, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(90, 178, 'question', { font: 'mono', size: 16 });
  s.arrow(150, 170, 190, 170, { color: C.muted });
  s.rect(190, 125, 200, 90, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(290, 152, 'Predict', { size: 22, weight: 700 });
  s.text(290, 176, 'LM call 1', { size: 18 });
  s.text(290, 200, 'out: search_query', { font: 'mono', size: 15 });
  s.arrow(390, 170, 430, 170, { color: C.muted });
  s.rect(430, 125, 130, 90, { color: C.muted, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(495, 158, 'corpus', { size: 20 });
  s.text(495, 182, 'lookup', { size: 20 });
  s.text(495, 206, 'no LM call', { size: 16 });
  s.arrow(560, 170, 600, 170, { color: C.muted });
  s.rect(600, 125, 250, 90, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(725, 152, 'ChainOfThought', { size: 22, weight: 700 });
  s.text(725, 176, 'LM call 2', { size: 18 });
  s.text(725, 200, 'out: reasoning, answer', { font: 'mono', size: 15 });
  s.text(440, 280, 'The program is ordinary Python: its code decides which modules run, and in what order.', { size: 19 });
  save('46.1-program-graph.svg', s);
}

{ // 5. measured prompt size vs demonstrations
  const s = new Sketch(880, 410, { title: 'Prompt size grows with each demonstration', seed: 4605 });
  s.text(440, 36, 'Prompt size grows with each demonstration', { size: 26, weight: 700 });
  const data = [
    { cx: 150, words: 14, label: 'Predict, 0 demos', ink: C.blue, soft: C.blueSoft },
    { cx: 290, words: 26, label: 'Predict, 1 demo', ink: C.blue, soft: C.blueSoft },
    { cx: 430, words: 37, label: 'Predict, 2 demos', ink: C.blue, soft: C.blueSoft },
    { cx: 570, words: 60, label: 'Predict, 4 demos', ink: C.blue, soft: C.blueSoft },
    { cx: 765, words: 15, label: 'ChainOfThought, 0 demos', ink: C.amber, soft: C.amberSoft },
  ];
  const base = 300, k = 3.5;
  s.line(90, base, 840, base, { color: C.ink, width: 2 });
  for (const d of data) {
    const h = d.words * k;
    s.rect(d.cx - 45, base - h, 90, h, { color: d.ink, fill: d.soft, fillStyle: 'solid' });
    s.text(d.cx, base - h - 12, String(d.words), { font: 'mono', size: 18, weight: 700 });
    s.text(d.cx, base + 26, d.label, { size: 16 });
  }
  s.text(440, 368, 'Whitespace-separated words in the rendered prompt (our renderer, not DSPy’s).', { size: 17 });
  s.text(440, 392, 'Each demonstration adds 11 to 12 words here.', { size: 17 });
  save('46.1-prompt-size.svg', s);
}
console.log('wrote 46.1 diagrams');
