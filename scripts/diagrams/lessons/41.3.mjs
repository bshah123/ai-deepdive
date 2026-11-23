// Diagrams for 41.3 (Corrective RAG: evaluator, three actions, strip filter, results).
// Run: node scripts/diagrams/lessons/41.3.mjs
// Numbers come from the 12-query toy run in the lesson (keyword-coverage stand-in evaluator,
// not the paper's T5 evaluator). Values are copied from that run's printed output.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-06-rag/chapter-41-advanced-rag/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// ---------------------------------------------------------------- 41.3-crag-pipeline.svg
{
  const s = new Sketch(880, 380, { title: 'CRAG pipeline: retrieve top-3 documents, score each with an evaluator, then route to Correct (refine internal), Ambiguous (both sources) or Incorrect (web search, refine)', seed: 4101 });
  s.text(440, 34, 'Corrective RAG: score, then route', { size: 26, weight: 700 });

  s.rect(20, 160, 130, 54, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(85, 193, 'query', { font: 'mono', size: 18 });
  s.arrow(150, 187, 190, 187, { color: C.muted, head: 7 });

  s.rect(190, 150, 150, 74, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(265, 181, 'top-3 docs', { size: 18 });
  s.text(265, 205, '(TF-IDF)', { size: 16, color: C.muted });
  s.arrow(340, 187, 370, 187, { color: C.muted, head: 7 });

  s.rect(370, 134, 200, 106, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(470, 166, 'evaluator scores', { size: 18 });
  s.text(470, 190, 'each document', { size: 18 });
  s.text(470, 220, 'upper 0.5, lower −0.5', { font: 'mono', size: 14, color: C.muted });

  const branches = [
    { y: 70, label: 'Correct: refine internal', col: C.green, soft: C.greenSoft, from: [570, 170] },
    { y: 160, label: 'Ambiguous: both sources', col: C.amber, soft: C.amberSoft, from: [570, 187] },
    { y: 250, label: 'Incorrect: web search, refine', col: C.rose, soft: C.roseSoft, from: [570, 204] },
  ];
  for (const b of branches) {
    s.arrow(b.from[0], b.from[1], 600, b.y + 27, { color: C.muted, head: 7 });
    s.rect(600, b.y, 262, 54, { color: b.col, fill: b.soft, fillStyle: 'solid' });
    s.text(731, b.y + 33, b.label, { size: 18 });
  }
  s.text(440, 352, 'Whichever branch runs, the surviving strips become the generator’s context.', { size: 18, color: C.muted });
  save('41.3-crag-pipeline.svg', s);
}

// ---------------------------------------------------------------- 41.3-threshold-line.svg
{
  const s = new Sketch(880, 330, { title: 'Score line from minus one to one with lower threshold at minus 0.5 and upper at 0.5; points for the toy run show which action each document triggers', seed: 4102 });
  s.text(440, 34, 'Three zones on the evaluator score', { size: 26, weight: 700 });
  const X = (v) => 60 + (v + 1) * 380; // -1 -> 60, +1 -> 820
  s.rect(X(-1), 120, X(-0.5) - X(-1), 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.rect(X(-0.5), 120, X(0.5) - X(-0.5), 40, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.rect(X(0.5), 120, X(1) - X(0.5), 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text((X(-1) + X(-0.5)) / 2, 146, 'Incorrect', { size: 18 });
  s.text((X(-0.5) + X(0.5)) / 2, 146, 'Ambiguous', { size: 18 });
  s.text((X(0.5) + X(1)) / 2, 146, 'Correct', { size: 18 });
  for (const v of [-0.5, 0.5]) {
    s.line(X(v), 102, X(v), 176, { color: C.ink, width: 2, dash: '6 6' });
  }
  s.text(X(-0.5), 96, 'lower −0.5', { font: 'mono', size: 15 });
  s.text(X(0.5), 96, 'upper 0.5', { font: 'mono', size: 15 });
  s.line(X(-1), 176, X(1), 176, { color: C.muted, width: 1.5 });
  s.text(X(-1), 200, '−1', { font: 'mono', size: 16, color: C.muted });
  s.text(X(0), 200, '0', { font: 'mono', size: 16, color: C.muted });
  s.text(X(1), 200, '+1', { font: 'mono', size: 16, color: C.muted });

  const pts = [
    [1.00, 'Q1', 'Correct'], [0.67, 'Q4', 'Correct'], [0.50, 'Q2', 'Ambiguous'],
    [-0.20, 'Q10', 'Ambiguous'], [-0.50, 'Q12', 'Ambiguous'], [-1.00, 'Q9', 'Incorrect'],
  ];
  for (const [v, q, act] of pts) {
    const x = X(v);
    s.circle(x, 250, 14, { color: C.ink, fill: C.ink, fillStyle: 'solid' });
    s.text(x, 226, v.toFixed(2), { font: 'mono', size: 16 });
    s.text(x, 282, q, { size: 18, color: C.muted });
  }
  s.text(440, 318, 'A score equal to a threshold is not above upper or below lower, so it falls in Ambiguous.', { size: 17, color: C.muted });
  save('41.3-threshold-line.svg', s);
}

// ---------------------------------------------------------------- 41.3-strip-filter.svg
{
  const s = new Sketch(880, 330, { title: 'Strip filter on Q2: strip scores 0.00, -0.50 and -1.00 with keep-if-at-least-0 rule; the gold answer strip scores -0.50 and is dropped', seed: 4103 });
  s.text(440, 34, 'Knowledge refinement drops the answer strip', { size: 26, weight: 700 });
  s.text(300, 66, 'strip (one sentence)', { size: 17, color: C.muted });
  s.text(640, 66, 'score', { size: 17, color: C.muted });
  s.text(790, 66, 'filter (keep ≥ 0)', { size: 17, color: C.muted });
  const rows = [
    ['The Tarn engine burns liquid oxygen and kerosene.', '0.00', true, false],
    ['Its thrust is rated at 900 kilonewtons.', '−0.50', false, true],
    ['Engineers replaced its injector in 2033.', '−1.00', false, false],
  ];
  rows.forEach(([txt, sc, keep, gold], i) => {
    const y = 84 + i * 76;
    s.rect(40, y, 520, 52, { color: C.ink, fill: keep ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(300, y + 32, txt, { size: 17 });
    s.text(640, y + 32, sc, { font: 'mono', size: 18 });
    s.rect(725, y + 10, 130, 32, { color: keep ? C.green : C.rose, fill: keep ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(790, y + 32, keep ? 'keep' : 'drop', { size: 18, weight: 700 });
    if (gold) s.text(440, y + 70, '↑ gold answer, lost', { size: 17, color: C.rose, weight: 700 });
  });
  s.text(440, 318, 'It refers back to “the Tarn engine”, so it shares only one query term with the question.', { size: 17, color: C.muted });
  save('41.3-strip-filter.svg', s);
}

// ---------------------------------------------------------------- 41.3-results-bars.svg
{
  const s = new Sketch(880, 390, { title: 'Bar chart of strips passed to the generator per query: plain RAG 9.00, CRAG-sim 1.25, 1.58 and 1.25; gold answers kept 7 of 10 versus 8 of 10', seed: 4104 });
  s.text(440, 34, 'Context size and gold answers kept', { size: 26, weight: 700 });
  s.text(440, 62, 'strips passed to the generator, mean per query (12 queries)', { size: 18, color: C.muted });
  const bars = [
    { name: 'plain RAG', v: 9.00, rec: '7 / 10', col: C.rose, soft: C.roseSoft },
    { name: 'upper 0.5, lower −0.5', v: 1.25, rec: '8 / 10', col: C.blue, soft: C.blueSoft },
    { name: 'upper 1.0, lower −0.5', v: 1.58, rec: '8 / 10', col: C.blue, soft: C.blueSoft },
    { name: 'upper 0.5, lower 0.0', v: 1.25, rec: '8 / 10', col: C.blue, soft: C.blueSoft },
  ];
  const base = 300, scale = 200 / 9;
  s.line(60, base, 820, base, { color: C.muted, width: 1.5 });
  bars.forEach((b, i) => {
    const cx = 150 + i * 200, h = b.v * scale;
    s.rect(cx - 55, base - h, 110, h, { color: b.col, fill: b.soft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, b.v.toFixed(2), { font: 'mono', size: 18, weight: 700 });
    s.text(cx, 326, b.name, { size: 17 });
    s.text(cx, 352, 'gold kept ' + b.rec, { size: 17, color: C.muted });
  });
  s.text(440, 380, 'Toy run with a keyword stand-in evaluator, not the paper’s benchmark.', { size: 16, color: C.muted });
  save('41.3-results-bars.svg', s);
}
