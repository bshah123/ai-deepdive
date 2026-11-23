import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-44-llamaindex/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below come from scripts/diagrams/lessons/44.2_experiment.py (run once; output in the lesson).

// 1. Query engine = retriever + response synthesizer
{
  const s = new Sketch(880, 260, { title: 'A query engine is a retriever followed by a response synthesizer', seed: 4401 });
  s.text(440, 34, 'A query engine = retriever + response synthesizer', { size: 24, weight: 700 });
  s.rect(40, 100, 130, 60, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(105, 137, 'Question', { size: 20 });
  s.rect(220, 80, 430, 100, { color: C.muted, dash: '6 8' });
  s.text(435, 72, 'query engine', { size: 17, color: C.muted });
  s.rect(240, 100, 170, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(325, 127, 'Retriever', { size: 20, weight: 700 });
  s.text(325, 150, 'top-k chunks by cosine', { size: 15, color: C.muted });
  s.rect(450, 100, 180, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(540, 127, 'Synthesizer', { size: 20, weight: 700 });
  s.text(540, 150, 'k chunks into an LLM answer', { size: 15, color: C.muted });
  s.rect(700, 100, 140, 60, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(770, 137, 'Answer', { size: 20 });
  s.arrow(170, 130, 238, 130, { color: C.muted });
  s.arrow(412, 130, 448, 130, { color: C.muted });
  s.arrow(632, 130, 698, 130, { color: C.muted });
  s.note(220, 200, 620, 44, ['k = 6 chunks in the synthesis demo; the LLM is called once or more per chunk, depending on the mode'], { size: 16 });
  save('44.2-query-engine.svg', s);
}

// 2. Packing: six retrieved chunks, 103 words, one prompt holds 78
{
  const words = [20, 12, 17, 17, 18, 19];   // chunks 0,5,4,2,1,3 in retrieval order
  const ids = [0, 5, 4, 2, 1, 3];
  const K = 7, G = 6, X0 = 60;
  const s = new Sketch(880, 300, { title: 'Compact packing of six chunks into two prompts', seed: 4402 });
  s.text(440, 34, 'Six chunks, 103 words; one prompt holds 78 words of context', { size: 22, weight: 700 });
  s.text(40, 84, 'retrieved', { size: 16, color: C.muted, anchor: 'start' });
  let x = X0;
  words.forEach((w, i) => {
    const bw = w * K;
    s.rect(x, 96, bw, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + bw / 2, 124, `c${ids[i]} · ${w}w`, { size: 15, font: 'mono' });
    x += bw + G;
  });
  s.text(40, 178, 'packed', { size: 16, color: C.muted, anchor: 'start' });
  const p1 = X0, p1w = 66 * K + 3 * G;
  s.rect(p1, 190, p1w, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(p1 + p1w / 2, 218, 'prompt 1: 66 words', { size: 17, font: 'mono' });
  const p2 = p1 + p1w + 20, p2w = 37 * K + G;
  s.rect(p2, 190, p2w, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(p2 + p2w / 2, 218, 'prompt 2: 37', { size: 17, font: 'mono' });
  s.rect(X0, 254, 78 * K, 30, { color: C.rose, dash: '6 8' });
  s.text(X0 + 78 * K + 14, 275, 'budget: 78 words of context', { size: 16, color: C.rose, anchor: 'start' });
  save('44.2-packing.svg', s);
}

// 3. Refine trace: one call per chunk, each answer replaces the last
{
  const ids = [0, 5, 4, 2, 1, 3];
  const s = new Sketch(880, 330, { title: 'Refine: six calls in sequence, each prompt holds one chunk', seed: 4403 });
  s.text(440, 34, 'Refine: one LLM call per chunk, in order', { size: 24, weight: 700 });
  const W = 118, G = 14, X0 = 40;
  ids.forEach((id, i) => {
    const x = X0 + i * (W + G);
    s.rect(x, 62, W, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + W / 2, 93, `chunk ${id}`, { size: 18, font: 'mono' });
    s.rect(x, 140, W, 78, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x + W / 2, 166, `call ${i + 1}`, { size: 18, weight: 700 });
    s.text(x + W / 2, 192, i === 0 ? 'QA prompt' : 'REFINE prompt', { size: 15, color: C.muted });
    s.arrow(x + W / 2, 114, x + W / 2, 136, { color: C.muted });
    if (i < ids.length - 1) s.arrow(x + W + 1, 165, x + W + G - 1, 165, { color: C.ink });
  });
  s.text(40, 254, 'answer after call 1 is passed into call 2 as "existing answer", and so on', { size: 17, anchor: 'start' });
  s.note(40, 268, 800, 50, ['final answer = output of call 6 (stub copies chunk 3); earlier calls are overwritten'], { size: 17 });
  save('44.2-refine-trace.svg', s);
}

// 4. Calls and longest prompt per synthesis mode (k = 6 chunks, window 120 words)
{
  const modes = ['refine', 'compact', 'accumulate', 'compact_accumulate', 'tree_summarize', 'simple_summarize'];
  const calls = [6, 2, 6, 2, 3, 1];
  const longest = [51, 83, 37, 83, 82, 119];
  const s = new Sketch(880, 380, { title: 'LLM calls and longest prompt per response mode', seed: 4404 });
  s.text(440, 34, 'Calls per query, and the longest prompt, for six response modes', { size: 22, weight: 700 });
  s.text(270, 72, 'LLM calls', { size: 18, weight: 700, anchor: 'start' });
  s.text(600, 72, 'longest prompt, words (window 120)', { size: 18, weight: 700, anchor: 'start' });
  modes.forEach((m, i) => {
    const y = 96 + i * 46;
    s.text(245, y + 22, m, { size: 17, font: 'mono', anchor: 'end' });
    const cw = calls[i] * 45;
    s.rect(270, y, cw, 30, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(270 + cw + 12, y + 22, String(calls[i]), { size: 17, anchor: 'start' });
    const pw = longest[i] * 1.8;
    s.rect(600, y, pw, 30, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(600 + pw + 10, y + 22, String(longest[i]), { size: 17, anchor: 'start' });
  });
  s.line(816, 84, 816, 352, { color: C.rose, dash: '6 8' });
  s.text(816, 372, 'window = 120 words', { size: 15, color: C.rose });
  save('44.2-synth-calls.svg', s);
}

// 5. Chat turn: condense, retrieve on the standalone question, synthesize
{
  const s = new Sketch(880, 290, { title: 'One chat turn with history: condense, retrieve, synthesize', seed: 4405 });
  s.text(440, 34, 'One chat turn with history', { size: 24, weight: 700 });
  const W = 170, G = 40, Y = 90, H = 80;
  const boxes = [
    { lines: ['follow-up', '+ last user turn'], c: C.blue, f: C.blueSoft },
    { lines: ['LLM call 1', 'condense to a', 'standalone question'], c: C.rose, f: C.roseSoft },
    { lines: ['retriever', 'top-2 on the', 'standalone question'], c: C.blue, f: C.blueSoft },
    { lines: ['LLM call 2', 'compact synthesis'], c: C.green, f: C.greenSoft },
  ];
  boxes.forEach((b, i) => {
    const x = 40 + i * (W + G);
    s.rect(x, Y, W, H, { color: b.c, fill: b.f, fillStyle: 'solid' });
    b.lines.forEach((l, j) => s.text(x + W / 2, Y + 30 + j * 22 - (b.lines.length - 1) * 11 + 6, l, { size: 16, weight: j === 0 ? 700 : 400 }));
    if (i < boxes.length - 1) s.arrow(x + W + 4, Y + H / 2, x + W + G - 4, Y + H / 2, { color: C.ink });
  });
  s.note(40, 200, 400, 66, ['without history: no condense call,', 'so 1 LLM call per turn (first turn)'], { size: 17 });
  s.note(460, 200, 380, 66, ['4 follow-ups: recall@2 = 2/4 raw', 'and 2/4 condensed (stub condense)'], { size: 17 });
  save('44.2-chat-turn.svg', s);
}
