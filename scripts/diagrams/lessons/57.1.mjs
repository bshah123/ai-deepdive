import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-57-evaluation-benchmarks/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below is read from the experiment's output (57.1_experiment.py writes this file).
const D = JSON.parse(readFileSync(join(HERE, '57.1_data.json'), 'utf8'));
const f2 = (x) => x.toFixed(2);

// 1. The triad: three checks, one per edge of the pipeline triangle.
{
  const s = new Sketch(880, 400, { title: 'RAG triad: query, retrieved context and answer, with one check on each edge', seed: 5701 });
  s.text(440, 40, 'Three checks, one per edge', { size: 26, weight: 700 });
  // edges first, boxes on top so the lines end at the box borders
  s.line(230, 282, 400, 148, { color: C.blue, width: 2.4 });
  s.line(480, 148, 680, 282, { color: C.green, width: 2.4 });
  s.line(260, 310, 620, 310, { color: C.amber, width: 2.4 });
  s.rect(60, 282, 200, 56, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(160, 316, 'Query', { size: 22, weight: 700 });
  s.rect(340, 92, 200, 56, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 126, 'Retrieved context', { size: 22, weight: 700 });
  s.rect(620, 282, 200, 56, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(720, 316, 'Answer', { size: 22, weight: 700 });
  s.text(250, 196, ['Context relevance', 'query vs context'], { size: 19, anchor: 'end', color: C.blue });
  s.text(600, 186, ['Groundedness', 'context vs answer'], { size: 19, anchor: 'start', color: C.green });
  s.text(440, 368, 'Answer relevance: query vs answer', { size: 19, color: C.amber });
  save('57.1-rag-triad.svg', s);
}

// 2. Worked example: claim-by-claim groundedness for case B.
{
  const s = new Sketch(880, 400, { title: 'Groundedness of case B, one claim at a time', seed: 5702 });
  s.text(440, 40, 'Groundedness, claim by claim (case B)', { size: 26, weight: 700 });
  s.text(40, 90, 'Claims in the answer', { size: 18, anchor: 'start', color: C.muted });
  s.text(480, 90, 'Best matching chunk', { size: 18, anchor: 'start', color: C.muted });
  const rows = D.claimsB;
  const ys = [110, 230];
  let supported = 0;
  rows.forEach(([claim, sup], i) => {
    const ok = sup >= 0.8;
    if (ok) supported += 1;
    const y = ys[i];
    s.rect(40, y, 380, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(230, y + 42, claim, { size: 18 });
    s.arrow(430, y + 35, 470, y + 35, { color: C.muted });
    s.rect(480, y, 360, 70, { color: ok ? C.green : C.rose, fill: ok ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(660, y + 30, `covers ${f2(sup)} of its terms`, { size: 19, weight: 700 });
    s.text(660, y + 56, ok ? 'supported (at least 0.80)' : 'not supported (below 0.80)', { size: 17 });
  });
  s.text(440, 350, `F = supported / claims = ${supported} / ${rows.length} = ${f2(supported / rows.length)}`, { size: 24, font: 'mono' });
  save('57.1-claim-check.svg', s);
}

// 3. Five cases, three metrics: which check catches which failure.
{
  const s = new Sketch(880, 440, { title: 'Five test cases scored on the three metrics', seed: 5703 });
  s.text(440, 36, 'Five cases, three scores', { size: 26, weight: 700 });
  s.line(30, 98, 850, 98, { color: C.muted, width: 1.2 });
  const cols = { name: 40, F: 320, CR: 410, AR: 500, why: 580 };
  s.text(cols.name, 84, 'case', { size: 18, anchor: 'start', color: C.muted });
  s.text(cols.F, 84, 'F', { size: 18, color: C.muted });
  s.text(cols.CR, 84, 'CR', { size: 18, color: C.muted });
  s.text(cols.AR, 84, 'AR', { size: 18, color: C.muted });
  s.text(cols.why, 84, 'what the scores show', { size: 18, anchor: 'start', color: C.muted });
  const why = {
    'A grounded and on topic': 'all checks pass',
    'B one invented date': 'the 2016 claim is not in the context',
    'C grounded, off topic': 'true, but does not answer when',
    'D right answer, wrong context': 'answer came from memory, not context',
    'E near miss paraphrase': 'claim shares half its terms with context',
  };
  const names = Object.keys(D.cases);
  names.forEach((name, i) => {
    const y = 128 + i * 60;
    const r = D.cases[name];
      s.text(cols.name, y + 4, name, { size: 19, anchor: 'start' });
    s.text(cols.F, y + 4, f2(r.F), { size: 20, font: 'mono' });
    s.text(cols.CR, y + 4, f2(r.CR), { size: 20, font: 'mono' });
    s.text(cols.AR, y + 4, f2(r.AR), { size: 20, font: 'mono' });
    s.text(cols.why, y + 4, why[name], { size: 16, anchor: 'start', color: C.muted });
  });
  s.text(440, 420, 'F: groundedness. CR: context relevance. AR: answer relevance. All values are from the lexical stub, not an LLM judge.', { size: 16, color: C.muted });
  save('57.1-five-cases.svg', s);
}

// 4. Threshold sensitivity for case E: one claim, support 0.50.
{
  const s = new Sketch(880, 280, { title: 'Where a claim sits on the support scale and the threshold theta', seed: 5704 });
  s.text(440, 36, 'The threshold decides the verdict', { size: 26, weight: 700 });
  const X = (v) => 80 + 720 * v;
  s.line(X(0), 150, X(1), 150, { color: C.ink, width: 2 });
  [0, 0.5, 0.8, 1.0].forEach((v) => {
    s.line(X(v), 144, X(v), 156, { color: C.ink, width: 2 });
    s.text(X(v), 178, v.toFixed(1), { size: 17, font: 'mono' });
  });
  const sup = D.supportE;
  s.circle(X(sup), 150, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(X(sup), 110, `claim support ${f2(sup)}`, { size: 19, color: C.blue, weight: 700 });
  [[0.5, 'θ = 0.5: F = ' + f2(D.sweepE['0.5'])], [0.8, 'θ = 0.8: F = ' + f2(D.sweepE['0.8'])], [1.0, 'θ = 1.0: F = ' + f2(D.sweepE['1.0'])]]
    .forEach(([v, label]) => {
      s.line(X(v), 188, X(v), 210, { color: C.rose, width: 1.6, dash: '5 5' });
      s.text(X(v), 240, label, { size: 18, color: C.rose });
    });
  s.text(440, 268, 'supported when support is at least theta', { size: 17, color: C.muted });
  save('57.1-threshold.svg', s);
}
