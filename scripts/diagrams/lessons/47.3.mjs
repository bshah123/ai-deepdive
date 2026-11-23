import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-07-frameworks/chapter-47-tool-calling/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers come from scripts/diagrams/lessons/47.3_experiment.py (seed 47) and 47.3_threads.py.

// 1. Timeline: sequential, parallel, dependent.
{
  const s = new Sketch(880, 575, { title: 'Three timelines for three tool calls: sequential 3.4 s, parallel 1.4 s, dependent 2.5 s', seed: 4731 });
  s.text(440, 34, 'Same three calls, three schedules', { size: 26, weight: 700 });
  const X = (t) => 260 + 110 * t;
  const lane = (y, name, t0, t1, kind) => {
    const col = { w: [C.blue, C.blueSoft], f: [C.amber, C.amberSoft], h: [C.green, C.greenSoft] }[kind];
    s.text(40, y + 6, name, { font: 'mono', size: 16, anchor: 'start' });
    s.rect(X(t0), y - 13, X(t1) - X(t0), 26, { color: col[0], fill: col[1], fillStyle: 'solid' });
    s.text((X(t0) + X(t1)) / 2, y + 6, `${(t1 - t0).toFixed(1)} s`, { size: 16 });
  };
  s.text(40, 84, 'Sequential: 3.4 s', { size: 20, weight: 700, anchor: 'start' });
  lane(112, 'get_weather', 0, 0.9, 'w');
  lane(148, 'search_flights', 0.9, 2.3, 'f');
  lane(184, 'search_hotels', 2.3, 3.4, 'h');
  s.text(40, 238, 'Parallel: 1.4 s (independent calls)', { size: 20, weight: 700, anchor: 'start' });
  lane(266, 'get_weather', 0, 0.9, 'w');
  lane(302, 'search_flights', 0, 1.4, 'f');
  lane(338, 'search_hotels', 0, 1.1, 'h');
  s.text(40, 392, 'Dependent: 2.5 s (hotels wait for flights)', { size: 20, weight: 700, anchor: 'start' });
  lane(420, 'get_weather', 0, 0.9, 'w');
  lane(456, 'search_flights', 0, 1.4, 'f');
  lane(492, 'search_hotels', 1.4, 2.5, 'h');
  s.line(X(0), 520, X(3.4), 520, { color: C.muted });
  for (const t of [0, 1, 2, 3]) {
    s.line(X(t), 515, X(t), 525, { color: C.muted });
    s.text(X(t), 552, `${t} s`, { size: 16, color: C.muted });
  }
  save('47.3-timelines.svg', s);
}

// 2. Message shape: one user message for all results.
{
  const s = new Sketch(880, 420, { title: 'Correct: all tool_result blocks in one user message; wrong: one message per result', seed: 4732 });
  s.text(440, 34, 'Where the results go decides whether Claude keeps calling in parallel', { size: 22, weight: 700 });
  s.text(235, 66, 'Correct', { size: 20, weight: 700, color: C.green });
  s.text(665, 66, 'Wrong', { size: 20, weight: 700, color: C.rose });
  const asst = (x) => {
    s.rect(x, 80, 390, 130, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 195, 104, 'assistant: 3 tool_use blocks', { size: 18 });
    ['toolu_1  get_weather', 'toolu_2  search_flights', 'toolu_3  search_hotels'].forEach((t, i) => {
      s.text(x + 195, 134 + i * 28, t, { font: 'mono', size: 15 });
    });
  };
  asst(40);
  asst(470);
  s.arrow(235, 212, 235, 236, { color: C.muted });
  s.rect(40, 240, 390, 150, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(235, 264, 'user: 3 tool_result blocks', { size: 18 });
  ['tool_result  toolu_1', 'tool_result  toolu_2', 'tool_result  toolu_3'].forEach((t, i) => {
    s.text(235, 296 + i * 30, t, { font: 'mono', size: 15 });
  });
  s.arrow(665, 212, 665, 236, { color: C.muted });
  [0, 1, 2].forEach((i) => {
    s.rect(470, 240 + i * 50, 390, 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(665, 265 + i * 50, `user: tool_result toolu_${i + 1}`, { font: 'mono', size: 15 });
  });
  s.text(440, 404, 'Separate user messages teach the model to call one tool at a time.', { size: 17, color: C.muted });
  save('47.3-message-shape.svg', s);
}

// 3. Mask at one step: raw vs masked probabilities.
{
  const rows = [
    ['London', 0.790, 0.963, true],
    ['"}', 0.031, 0, false],
    ['}', 0.016, 0, false],
    [': "', 0.014, 0, false],
    ['don', 0.012, 0, false],
    ['8', 0.010, 0, false],
    ['", ', 0.009, 0, false],
    ['7', 0.009, 0, false],
  ];
  const s = new Sketch(880, 480, { title: 'Mask at the state after the opening quote: London keeps most of the probability', seed: 4733 });
  s.text(440, 34, 'One decoding step after {"city": "', { size: 24, weight: 700 });
  s.rect(40, 62, 22, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(72, 74, 'raw model probability', { size: 17, anchor: 'start' });
  s.rect(300, 62, 22, 14, { color: C.green, fill: C.green, fillStyle: 'solid' });
  s.text(332, 74, 'after the mask (renormalised)', { size: 17, anchor: 'start' });
  const X0 = 240, K = 470;
  rows.forEach(([tok, raw, masked, ok], i) => {
    const y = 128 + i * 40;
    s.text(214, y + 6, tok === 'London' ? "'London'" : `'${tok}'`, { font: 'mono', size: 16, anchor: 'end' });
    s.rect(X0, y - 14, raw * K, 13, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    if (masked > 0) s.rect(X0, y + 1, masked * K, 13, { color: C.green, fill: C.green, fillStyle: 'solid' });
    const endX = X0 + Math.max(raw, masked) * K + 12;
    const label = ok ? `0.790 → 0.963 (allowed)` : `raw ${raw.toFixed(3)} → masked 0 (blocked)`;
    s.text(endX, y + 4, label, { size: 15, anchor: 'start', color: ok ? C.ink : C.muted });
  });
  s.note(40, 430, 800, 36, ['Legal tokens hold 0.820 of the raw mass. Renormalising gives London 0.790 / 0.820 = 0.963.'], { size: 17 });
  save('47.3-mask-step.svg', s);
}

// 4. Validity: unconstrained vs constrained.
{
  const cats = ['valid JSON, schema-correct', 'city = London', 'exact intended string'];
  const un = [39.1, 39.1, 39.1];
  const co = [100.0, 97.2, 96.4];
  const s = new Sketch(880, 420, { title: 'Grouped bars: unconstrained vs constrained decoding on 2,000 samples each', seed: 4734 });
  s.text(440, 34, '2,000 samples per setting, 14-token cap', { size: 24, weight: 700 });
  s.rect(560, 58, 20, 14, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(588, 70, 'unconstrained', { size: 16, anchor: 'start' });
  s.rect(720, 58, 20, 14, { color: C.green, fill: C.green, fillStyle: 'solid' });
  s.text(748, 70, 'constrained', { size: 16, anchor: 'start' });
  const base = 320, K = 2.2;
  s.line(60, base, 830, base, { color: C.muted });
  cats.forEach((c, i) => {
    const cx = 210 + i * 240;
    const hu = un[i] * K, hc = co[i] * K;
    s.rect(cx - 62, base - hu, 60, hu, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.rect(cx + 2, base - hc, 60, hc, { color: C.green, fill: C.green, fillStyle: 'solid' });
    s.text(cx - 32, base - hu - 10, `${un[i].toFixed(1)}%`, { size: 16 });
    s.text(cx + 32, base - hc - 10, `${co[i].toFixed(1)}%`, { size: 16 });
    s.text(cx, base + 30, c, { size: 17 });
  });
  s.note(40, 378, 800, 30, ['Constrained, 5-token cap: 0.0% finished, so no output is complete.'], { size: 16 });
  save('47.3-validity.svg', s);
}

// 5. Dead ends: prefix-only mask versus live-state mask.
{
  const s = new Sketch(880, 330, { title: 'A prefix-only mask can walk into a state with no legal next token', seed: 4735 });
  s.text(440, 34, 'The dead end: a legal prefix that no token can continue', { size: 24, weight: 700 });
  s.rect(40, 92, 220, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(150, 120, '{"city"', { font: 'mono', size: 17 });
  s.arrow(260, 114, 340, 114, { color: C.muted });
  s.text(300, 100, ': ', { font: 'mono', size: 16, color: C.muted });
  s.rect(340, 92, 300, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(490, 120, '{"city": ', { font: 'mono', size: 17 });
  s.text(490, 160, 'dead end: no token starts with "', { size: 16, color: C.rose });
  s.rect(40, 200, 300, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(190, 228, '{"city": "Lon', { font: 'mono', size: 17 });
  s.arrow(340, 222, 420, 222, { color: C.muted });
  s.text(380, 208, 'don', { font: 'mono', size: 16, color: C.muted });
  s.rect(420, 200, 320, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(580, 228, '{"city": "London', { font: 'mono', size: 17 });
  s.note(40, 262, 800, 44, ['Reachable dead ends: prefix-only mask 1 (2 without "don"); live-state mask 0 (0).'], { size: 17 });
  save('47.3-dead-end.svg', s);
}
