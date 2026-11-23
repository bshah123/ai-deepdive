import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-07-frameworks/chapter-47-tool-calling/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers in this file come from scripts/diagrams/lessons/47.2_experiment.py (seed 47).

// 1. The loop: model call, branch, dispatch, feed the result back.
{
  const s = new Sketch(880, 300, { title: 'Loop: model call, then either a final answer or a tool run that feeds back into the messages', seed: 201 });
  s.text(440, 34, 'The loop runs until the model stops asking for tools', { size: 24, weight: 700 });
  s.rect(40, 110, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 141, 'messages', { font: 'mono', size: 16 });
  s.arrow(190, 135, 230, 135, { color: C.muted });
  s.rect(230, 110, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(305, 141, 'model call', { size: 19 });
  s.arrow(380, 135, 420, 135, { color: C.muted });
  s.rect(420, 110, 130, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(485, 141, 'tool call?', { size: 19 });
  s.arrow(550, 135, 640, 135, { color: C.muted });
  s.text(595, 124, 'no', { size: 18, color: C.muted });
  s.rect(640, 110, 200, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(740, 141, 'return final text', { size: 19 });
  s.arrow(485, 160, 485, 200, { color: C.muted });
  s.text(505, 186, 'yes', { size: 18, color: C.muted, anchor: 'start' });
  s.rect(380, 200, 230, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(495, 231, 'dispatch: parse, validate, run', { size: 18 });
  s.line(380, 225, 115, 225, { color: C.muted });
  s.arrow(115, 225, 115, 162, { color: C.muted });
  s.text(247, 214, 'tool_result appended', { size: 17, color: C.muted });
  s.note(640, 190, 200, 80, ['max_steps stops', 'endless loops'], { size: 17 });
  s.text(440, 282, 'Each pass: one model call, then zero or more tool runs.', { size: 17, color: C.muted });
  save('47.2-loop.svg', s);
}

// 2. Three stages between the model's string and the function call.
{
  const s = new Sketch(880, 320, { title: 'From the argument string to a checked call', seed: 202 });
  s.text(440, 34, 'Three stages between the model and the function', { size: 24, weight: 700 });
  s.text(300, 84, 'json.loads', { size: 17, color: C.muted });
  s.text(590, 84, 'validate', { size: 17, color: C.muted });
  s.rect(30, 100, 250, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(155, 136, '{"unit": "celsius"}', { font: 'mono', size: 16 });
  s.arrow(285, 130, 315, 130, { color: C.muted });
  s.rect(320, 100, 250, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(445, 136, "{'unit': 'celsius'}", { font: 'mono', size: 16 });
  s.arrow(575, 130, 605, 130, { color: C.muted });
  s.rect(610, 100, 240, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(730, 136, 'get_weather(**args)', { font: 'mono', size: 16 });
  s.text(155, 190, 'str: what the model wrote', { size: 17, color: C.muted });
  s.text(445, 190, 'dict: a Python object', { size: 17, color: C.muted });
  s.text(730, 190, 'checked call: runs', { size: 17, color: C.muted });
  s.line(300, 165, 300, 222, { color: C.rose, dash: '6 8' });
  s.note(190, 222, 220, 60, ['bad JSON: is_error', 'no code has run'], { size: 15 });
  s.line(590, 165, 590, 222, { color: C.rose, dash: '6 8' });
  s.note(480, 222, 220, 60, ['wrong key or type:', 'is_error, no call'], { size: 15 });
  s.text(440, 306, 'Strings in, checked values out; nothing runs until every check passes.', { size: 17, color: C.muted });
  save('47.2-arg-stages.svg', s);
}

// 3. Seven raw model outputs and what the dispatcher does with each (from the experiment).
{
  const rows = [
    ['valid', 'ran', '28 degrees celsius', true],
    ['malformed JSON', 'is_error', 'Expecting property name enclosed in double quotes', false],
    ['wrong type', 'is_error', "'unit' must be str, got int", false],
    ['missing argument', 'is_error', "missing required argument 'unit'", false],
    ['enum violation', 'is_error', "'unit' must be one of ['celsius', 'fahrenheit']", false],
    ['tool raises', 'is_error', "tool error: no data for 'Atlantis'", false],
    ['unknown tool', 'is_error', "unknown tool 'get_wether'", false],
  ];
  const s = new Sketch(880, 410, { title: 'Seven raw model outputs and their outcomes', seed: 203 });
  s.text(440, 34, 'Seven bad outputs, one outcome each', { size: 24, weight: 700 });
  s.text(40, 70, 'case', { size: 16, color: C.muted, anchor: 'start' });
  s.text(260, 70, 'outcome', { size: 16, color: C.muted });
  s.text(400, 70, 'what the model sees', { size: 16, color: C.muted, anchor: 'start' });
  s.line(40, 80, 840, 80, { color: C.muted, width: 1 });
  rows.forEach(([label, outcome, msg, ok], i) => {
    const y = 100 + i * 42;
    s.text(40, y + 6, label, { font: 'mono', size: 16, anchor: 'start' });
    const col = ok ? C.green : C.rose;
    const soft = ok ? C.greenSoft : C.roseSoft;
    s.rect(260, y - 14, 124, 30, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(315, y + 6, outcome, { size: 16 });
    s.text(400, y + 6, msg, { size: 16, anchor: 'start' });
  });
  s.text(440, 395, 'Only the valid call executes. Every failure returns text to the model instead of crashing.', { size: 16, color: C.muted });
  save('47.2-outcomes.svg', s);
}

// 4. Success rate per episode: naive vs validated with retries (Monte Carlo, 20,000 episodes).
{
  const p = [0.05, 0.20, 0.40];
  const naive = [0.854, 0.513, 0.209];
  const valid = [0.987, 0.949, 0.898];
  const base = 330, top = 90, scale = 200; // y = base - v * scale
  const s = new Sketch(880, 400, { title: 'Bar chart: episode success under two dispatch policies', seed: 204 });
  s.text(440, 30, 'Feedback turns crashes into retries', { size: 24, weight: 700 });
  s.rect(120, 52, 16, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(144, 66, 'naive: first bad call ends the run', { size: 17, anchor: 'start' });
  s.rect(470, 52, 16, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(494, 66, 'validated, retries (R = 0.7 assumed)', { size: 17, anchor: 'start' });
  for (const v of [0, 0.5, 1.0]) {
    const y = base - v * scale;
    s.text(96, y + 6, v.toFixed(1), { font: 'mono', size: 15, anchor: 'end' });
    if (v > 0 && v < 1) s.line(110, y, 820, y, { color: C.muted, width: 1, dash: '6 8' });
  }
  s.line(110, top, 110, base, { color: C.ink });
  s.line(110, base, 820, base, { color: C.ink });
  p.forEach((pv, i) => {
    const gx = 250 + i * 220;
    const hN = naive[i] * scale, hV = valid[i] * scale;
    s.rect(gx - 75, base - hN, 70, hN, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.rect(gx + 5, base - hV, 70, hV, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(gx - 40, base - hN - 10, naive[i].toFixed(3), { font: 'mono', size: 15 });
    s.text(gx + 40, base - hV - 10, valid[i].toFixed(3), { font: 'mono', size: 15 });
    s.text(gx, 362, `p = ${pv.toFixed(2)}`, { size: 18 });
  });
  s.text(440, 392, 'Monte Carlo, 20,000 episodes of 3 tool calls each, seed 47. Retry success is an assumption.', { size: 15, color: C.muted });
  save('47.2-policy-chart.svg', s);
}
