import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-08-agents/chapter-50-multi-agent-systems/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// every number below comes from 50.3_experiment.py (written to 50.3_data.json)
const D = JSON.parse(readFileSync(join(HERE, '50.3_data.json'), 'utf8'));
const P = D.patterns, G = D.group_chat;
const fmt = (n) => n.toLocaleString('en-US');

// 1. sequential crew
{
  const s = new Sketch(880, 300, { title: 'Three agents in a row; each receives the previous output', seed: 501 });
  s.text(440, 34, 'Sequential crew: each task gets the previous output', { size: 24, weight: 700 });
  const boxes = [
    ['Researcher', 40, C.blue, C.blueSoft, ['prompt 55 words', 'reply 120 words']],
    ['Analyst', 340, C.amber, C.amberSoft, ['prompt 175 words', 'reply 90 words']],
    ['Writer', 640, C.green, C.greenSoft, ['prompt 145 words', 'reply 150 words']],
  ];
  for (const [name, x, col, soft, lines] of boxes) {
    s.rect(x, 80, 200, 100, { color: col, fill: soft, fillStyle: "solid" });
    s.text(x + 100, 116, name, { size: 24, weight: 700 });
    s.text(x + 100, 146, lines, { size: 16, font: 'mono' });
  }
  s.arrow(242, 120, 338, 120, { color: C.muted });
  s.arrow(542, 120, 638, 120, { color: C.muted });
  s.text(290, 108, '120 words', { size: 15, font: 'mono' });
  s.text(590, 108, '90 words', { size: 15, font: 'mono' });
  s.note(40, 220, 800, 62, [
    "Default: each task receives only the previous task's output.",
    'Writer with context=[researcher, analyst]: prompt 265 words.',
  ], { size: 19 });
  save('50.3-sequential-crew.svg', s);
}

// 2. hierarchical manager
{
  const s = new Sketch(880, 340, { title: 'A manager plans, assigns and reviews', seed: 502 });
  s.text(440, 34, 'Hierarchical process: a manager plans and reviews', { size: 24, weight: 700 });
  s.rect(90, 56, 700, 58, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(440, 92, 'Manager (an LLM or a manager agent)', { size: 22, weight: 700 });
  const workers = [['Researcher', 60, C.blue, C.blueSoft], ['Analyst', 340, C.amber, C.amberSoft], ['Writer', 620, C.green, C.greenSoft]];
  for (const [name, x, col, soft] of workers) {
    s.rect(x, 226, 200, 60, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 100, 262, name, { size: 22, weight: 700 });
    s.arrow(x + 100, 118, x + 100, 224, { color: C.ink });
    s.arrow(x + 140, 224, x + 140, 118, { color: C.amber });
  }
  s.text(154, 176, 'assign', { size: 17, anchor: 'end' });
  s.text(236, 176, 'review', { size: 17, anchor: 'start', color: C.amber });
  s.text(440, 320, `${P.hierarchical.calls} calls: 1 plan, 3 work, 3 review`, { size: 20 });
  save('50.3-hierarchy.svg', s);
}

// 3. group chat structure
{
  const s = new Sketch(880, 330, { title: 'Group chat: one shared history re-sent every turn', seed: 503 });
  s.text(440, 34, 'Group chat: one shared history, re-sent every turn', { size: 24, weight: 700 });
  s.rect(120, 60, 640, 130, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(440, 98, [
    'message 1: Researcher (60 words)',
    'message 2: Analyst (60 words)',
    'message 3: Writer (60 words)',
    '... every earlier message, every turn',
  ], { size: 19 });
  const who = [['Researcher', 160, C.blue, C.blueSoft], ['Analyst', 380, C.amber, C.amberSoft], ['Writer', 600, C.green, C.greenSoft]];
  for (const [name, x, col, soft] of who) {
    s.rect(x, 236, 160, 50, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 80, 268, name, { size: 21, weight: 700 });
  }
  s.arrow(440, 192, 440, 234, { color: C.ink });
  s.arrow(470, 234, 470, 194, { color: C.green });
  s.text(440, 312, 'the next speaker reads all of it, then appends its reply', { size: 19 });
  save('50.3-group-chat.svg', s);
}

// 4. group chat growth (line chart)
{
  const s = new Sketch(880, 380, { title: 'Total prompt words grow quadratically with chat length', seed: 504 });
  s.text(440, 34, 'Total prompt words vs. chat length', { size: 24, weight: 700 });
  const Ts = [4, 8, 12, 16, 20, 25];
  const X = (T) => 110 + ((T - 4) / 21) * 690;
  const Y = (v) => 330 - (v / 40000) * 250;
  s.line(90, 330, 820, 330, { color: C.muted });
  s.line(90, 330, 90, 70, { color: C.muted });
  for (const v of [0, 10000, 20000, 30000, 40000]) {
    s.line(86, Y(v), 90, Y(v), { color: C.muted });
    s.text(80, Y(v) + 6, fmt(v), { size: 16, anchor: 'end' });
  }
  for (const T of Ts) s.text(X(T), 354, String(T), { size: 17 });
  s.text(455, 380, 'messages in the chat', { size: 18 });
  const series = [['round_robin', C.blue], ['selector', C.amber]];
  for (const [key, col] of series) {
    const pts = Ts.map((T) => [X(T), Y(G[String(T)][key].prompt_words)]);
    for (let i = 1; i < pts.length; i++) s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color: col, width: 3 });
    for (const [x, y] of pts) s.circle(x, y, 9, { color: col, fill: col, fillStyle: 'solid' });
  }
  s.line(120, 104, 150, 104, { color: C.blue, width: 3 });
  s.text(160, 110, 'round robin: one model call per turn', { size: 17, anchor: 'start' });
  s.line(120, 134, 150, 134, { color: C.amber, width: 3 });
  s.text(160, 140, 'selector: two calls per turn', { size: 17, anchor: 'start' });
  s.text(120, 180, `8 messages: ${fmt(G['8'].round_robin.prompt_words)} (round robin) vs ${fmt(G['8'].selector.prompt_words)} (selector)`, { size: 17, anchor: 'start' });
  s.text(120, 206, `25 messages: ${fmt(G['25'].round_robin.prompt_words)} vs ${fmt(G['25'].selector.prompt_words)}`, { size: 17, anchor: 'start' });
  save('50.3-group-chat-growth.svg', s);
}

// 5. pattern cost bars
{
  const s = new Sketch(880, 330, { title: 'Prompt words per task by pattern', seed: 505 });
  s.text(440, 34, 'Prompt words per task, by pattern', { size: 24, weight: 700 });
  const rows = [
    ['single agent', P.single_agent, C.muted, C.muted],
    ['sequential, default', P.sequential_default, C.blue, C.blueSoft],
    ['sequential, all context', P.sequential_all_context, C.blue, C.blueSoft],
    ['hierarchical', P.hierarchical, C.rose, C.roseSoft],
  ];
  const scale = 380 / P.hierarchical.prompt_words;
  rows.forEach(([name, v, col, soft], i) => {
    const y = 90 + i * 60;
    const len = v.prompt_words * scale;
    s.text(290, y + 7, name, { size: 19, anchor: 'end' });
    s.rect(300, y - 18, len, 36, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(300 + len + 12, y + 7, `${v.prompt_words} words, ${v.calls} calls`, { size: 18, anchor: 'start' });
  });
  s.text(440, 312, "Counts only: no reply quality is measured here.", { size: 18 });
  save('50.3-pattern-cost.svg', s);
}
console.log('wrote 5 SVGs for 50.3');
