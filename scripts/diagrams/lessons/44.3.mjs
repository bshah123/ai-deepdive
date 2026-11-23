import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-44-llamaindex/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '44.3_data.json'), 'utf8'));

// 1. How SubQuestionQueryEngine works
{
  const s = new Sketch(880, 350, { title: 'SubQuestionQueryEngine: generator, sub-questions, engines, synthesizer', seed: 101 });
  s.text(440, 36, 'How SubQuestionQueryEngine works', { size: 26, weight: 700 });
  s.rect(30, 130, 150, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(105, 172, 'User query', { size: 17 });
  s.arrow(180, 165, 210, 165, { color: C.muted });
  s.rect(210, 120, 170, 90, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(295, 150, 'Question generator', { size: 16 });
  s.text(295, 172, 'LLM writes JSON', { size: 15 });
  s.text(295, 194, 'sub_question, tool_name', { size: 15 });
  s.arrow(380, 150, 430, 96, { color: C.muted });
  s.arrow(380, 180, 430, 196, { color: C.muted });
  s.rect(430, 68, 190, 56, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(525, 92, 'sub-question 1', { size: 16 });
  s.text(525, 116, 'Acme Corp revenue', { size: 15 });
  s.rect(430, 168, 190, 56, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(525, 192, 'sub-question 2', { size: 16 });
  s.text(525, 216, 'Borealis Ltd revenue', { size: 15 });
  s.arrow(620, 96, 670, 96, { color: C.muted });
  s.arrow(620, 196, 670, 196, { color: C.muted });
  s.rect(670, 68, 150, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(745, 92, 'engine 1: top-k', { size: 16 });
  s.text(745, 116, 'retrieve + answer', { size: 15 });
  s.rect(670, 168, 150, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(745, 192, 'engine 2: top-k', { size: 16 });
  s.text(745, 216, 'retrieve + answer', { size: 15 });
  s.line(820, 96, 835, 96, { color: C.muted });
  s.line(820, 196, 835, 196, { color: C.muted });
  s.line(835, 96, 835, 196, { color: C.muted });
  s.arrow(835, 196, 835, 262, { color: C.muted });
  s.rect(480, 262, 355, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(657, 293, 'Synthesizer (LLM call)', { size: 17 });
  s.arrow(480, 288, 350, 288, { color: C.muted });
  s.rect(60, 262, 290, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(205, 293, 'final answer', { size: 17 });
  s.text(440, 335, 'N sub-questions cost N + 2 LLM calls: one to write them, one per sub-answer, one to synthesize.', { size: 17 });
  save('44.3-subquestion-flow.svg', s);
}

// 2. Compound retrieval recall
{
  const s = new Sketch(880, 420, { title: 'Recall of needed chunks: single query vs sub-questions', seed: 102 });
  s.text(440, 36, 'Recall of the needed chunks, 6 compound queries', { size: 26, weight: 700 });
  const base = 340, scale = 180;
  s.line(120, base, 800, base, { color: C.muted });
  s.rect(120, 62, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(146, 77, 'single query, top-k', { size: 17, anchor: 'start' });
  s.rect(400, 62, 18, 18, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(426, 77, 'sub-questions, top-k each', { size: 17, anchor: 'start' });
  const groups = [
    { label: 'budget 2 chunks', cx: 270, s: 'single_2', d: 'decomp_2' },
    { label: 'budget 4 chunks', cx: 630, s: 'single_4', d: 'decomp_4' },
  ];
  for (const g of groups) {
    const vs = D.recall_mean[g.s], vd = D.recall_mean[g.d];
    const hs = vs * scale, hd = vd * scale;
    s.rect(g.cx - 100, base - hs, 90, hs, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(g.cx - 55, base - hs - 12, vs.toFixed(2), { size: 18, weight: 700 });
    s.rect(g.cx + 10, base - hd, 90, hd, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(g.cx + 55, base - hd - 12, vd.toFixed(2), { size: 18, weight: 700 });
    s.text(g.cx, base + 30, g.label, { size: 18 });
    const fs = Math.round(D.full_hit_rate[g.s] * 6), fd = Math.round(D.full_hit_rate[g.d] * 6);
    s.text(g.cx, base + 56, `both chunks found: ${fs}/6 single, ${fd}/6 sub-questions`, { size: 16, color: C.muted });
  }
  save('44.3-compound-recall.svg', s);
}

// 3. Router decision table for one query
{
  const r = D.router.find((x) => x.query === 'Which plants does Borealis Ltd run?');
  const names = Object.keys(D.tools_clear);
  const s = new Sketch(880, 380, { title: 'Router: word overlap per tool, clear vs vague descriptions', seed: 103 });
  s.text(440, 36, 'One query, two sets of tool descriptions', { size: 26, weight: 700 });
  s.text(440, 70, 'Query: Which plants does Borealis Ltd run?', { size: 18 });
  s.text(60, 116, 'tool', { size: 17, weight: 700, anchor: 'start' });
  s.text(520, 116, 'clear overlap', { size: 17, weight: 700 });
  s.text(740, 116, 'vague overlap', { size: 17, weight: 700 });
  names.forEach((name, i) => {
    const y = 130 + i * 50;
    s.text(60, y + 25, name, { size: 17, font: 'mono', anchor: 'start' });
    const cc = name === r.clear, cv = name === r.vague;
    if (cc) s.rect(440, y, 160, 38, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    if (cv) s.rect(660, y, 160, 38, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(520, y + 25, String(r.clear_scores[name]), { size: 18, weight: 700 });
    s.text(740, y + 25, String(r.vague_scores[name]), { size: 18, weight: 700 });
  });
  const allTie = Object.values(r.vague_scores).every((v) => v === r.vague_scores[r.vague]);
  s.text(440, 352, allTie
    ? `Vague scores all tie, so the first tool listed (${r.vague}) wins. Green: chosen (clear); rose: chosen (vague).`
    : `Green: chosen with clear descriptions. Rose: chosen with vague descriptions.`, { size: 17 });
  save('44.3-router-choice.svg', s);
}

// 4. Router accuracy
{
  const s = new Sketch(880, 390, { title: 'Router accuracy with clear vs vague descriptions', seed: 104 });
  s.text(440, 36, 'Router accuracy on 12 labelled queries', { size: 26, weight: 700 });
  const base = 300, scale = 210;
  s.line(180, base, 700, base, { color: C.muted });
  const nC = D.router.filter((x) => x.clear_ok).length, nV = D.router.filter((x) => x.vague_ok).length;
  const bars = [
    { label: 'clear descriptions', v: D.router_accuracy.clear, n: nC, cx: 300, color: C.green, soft: C.greenSoft },
    { label: 'vague descriptions', v: D.router_accuracy.vague, n: nV, cx: 580, color: C.rose, soft: C.roseSoft },
  ];
  for (const b of bars) {
    const h = b.v * scale;
    s.rect(b.cx - 65, base - h, 130, h, { color: b.color, fill: b.soft, fillStyle: 'solid' });
    s.text(b.cx, base - h - 14, `${b.v.toFixed(2)} (${b.n}/12)`, { size: 18, weight: 700 });
    s.text(b.cx, base + 32, b.label, { size: 18 });
  }
  const wrongV = D.router.filter((x) => !x.vague_ok);
  const allRev = wrongV.every((x) => x.vague === 'revenue_tool');
  s.text(440, 362, allRev
    ? `All ${wrongV.length} vague errors go to revenue_tool, the first tool listed: a tie, not a judgment.`
    : `${wrongV.length} vague errors; see the router records in 44.3_data.json.`, { size: 17 });
  save('44.3-router-accuracy.svg', s);
}
