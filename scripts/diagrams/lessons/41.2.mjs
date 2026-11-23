import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-41-advanced-rag/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from scripts/diagrams/lessons/41.2_experiment.py (its output is in the lesson).
const D = JSON.parse(readFileSync(join(HERE, '41.2_data.json'), 'utf8'));

// 1. Control flow: gate, retrieve, generate per passage, critique and select.
{
  const s = new Sketch(880, 270, { title: 'Self-RAG control flow: gate, retrieve, generate, critique and select', seed: 411 });
  const bw = 180, bh = 74, y = 60, xs = [20, 240, 460, 680];
  const box = (x, fill, color, title, sub) => {
    s.rect(x, y, bw, bh, { color, fill, fillStyle: 'solid' });
    s.text(x + bw / 2, y + 30, title, { size: 20, weight: 700 });
    s.text(x + bw / 2, y + 56, sub, { size: 16, font: 'mono' });
  };
  box(xs[0], C.blueSoft, C.blue, 'Retrieve gate', 'P(Retrieve) > t ?');
  box(xs[1], C.greenSoft, C.green, 'Retrieve top-K', 'search the corpus');
  box(xs[2], C.amberSoft, C.amber, 'Generate segments', 'one per passage');
  box(xs[3], C.roseSoft, C.rose, 'Critique & select', 'gen + S, keep max');
  for (let i = 0; i < 3; i++) s.arrow(xs[i] + bw + 4, y + bh / 2, xs[i + 1] - 4, y + bh / 2, { color: C.muted });
  s.text((xs[0] + bw + xs[1]) / 2, y + bh / 2 - 12, 'yes', { size: 16 });
  s.rect(xs[0], 190, bw, 50, { color: C.muted, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(xs[0] + bw / 2, 221, 'answer directly', { size: 19 });
  s.arrow(xs[0] + bw / 2, y + bh + 4, xs[0] + bw / 2, 186, { color: C.muted });
  s.text(xs[0] + bw / 2 + 22, 160, 'no', { size: 16, anchor: 'start' });
  s.arrow(xs[3] + bw / 2, y + bh + 4, xs[3] + bw / 2, 186, { color: C.muted });
  s.rect(xs[3], 190, bw, 50, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(xs[3] + bw / 2, 221, 'chosen answer', { size: 19 });
  s.text(440, 30, 'Self-RAG control flow', { size: 22, weight: 700 });
  save('41.2-control-flow.svg', s);
}

// 2. Stub retrieve probabilities against a threshold.
{
  const t = 0.2, base = 270, top = 90, scale = base - top;
  const s = new Sketch(880, 380, { title: 'Bar chart of stub retrieve probabilities per query with a threshold line at 0.2', seed: 412 });
  s.text(440, 34, 'Retrieve gate: stub P(Retrieve) per query', { size: 24, weight: 700 });
  const lab = { q0: ['q0', 'reactor temp'], q1: ['q1', 'plant schedule'], q2: ['q2', 'haiku'], q3: ['q3', '17 x 3'], q4: ['q4', 'basalt colour'] };
  s.line(90, base, 740, base, { color: C.muted });
  const yT = base - t * scale;
  s.line(90, yT, 740, yT, { color: C.rose, dash: '6 8' });
  s.text(748, yT + 6, 't = 0.2', { size: 16, anchor: 'start', color: C.rose });
  Object.keys(D.queries).forEach((q, i) => {
    const p = D.p_retrieve[q], cx = 155 + i * 130, h = p * scale, fire = p > t;
    s.rect(cx - 32, base - h, 64, h, { color: fire ? C.blue : C.amber, fill: fire ? C.blueSoft : C.amberSoft, fillStyle: 'solid' });
    s.text(cx, base + 20, [lab[q][0], lab[q][1], `P = ${p.toFixed(2)}`], { size: 15, font: 'mono' });
  });
  s.text(440, 364, 'blue: above threshold, retrieve. amber: below, answer without retrieval.', { size: 16 });
  save('41.2-gate.svg', s);
}

// 3. Score decomposition for the three candidate segments.
const unit = 150, x0 = 40;
const segColors = [[C.amber, C.amberSoft], [C.blue, C.blueSoft], [C.green, C.greenSoft], [C.rose, C.roseSoft]];
function stackedRow(s, y0, name, gen, parts, total, labelExtra, labelSize = 16) {
  s.text(x0, y0 - 12, name, { size: 18, weight: 700, anchor: 'start' });
  let x = x0;
  [gen, ...parts].forEach((v, k) => {
    const w = v * unit;
    if (w > 0) s.rect(x, y0, w, 36, { color: segColors[k][0], fill: segColors[k][1], fillStyle: 'solid' });
    x += w;
  });
  s.text(x + 14, y0 + 24, `total ${total.toFixed(3)}`, { size: 18, weight: 700, anchor: 'start' });
  s.text(x0, y0 + 62, labelExtra, { size: labelSize, font: 'mono', anchor: 'start' });
}
{
  const s = new Sketch(880, 400, { title: 'Stacked bars of generation and critique terms for three candidate segments', seed: 413 });
  s.text(440, 34, 'Candidate scores: gen + rel + sup + 0.5 x use', { size: 24, weight: 700 });
  const ids = Object.keys(D.cands);
  ids.forEach((id, i) => {
    const c = D.cands[id], [sRel, sSup, sUse] = D.parts[id];
    const rel = sRel * D.weights.rel, sup = sSup * D.weights.sup, use = sUse * D.weights.use;
    const total = c.gen + rel + sup + use;
    const y0 = 90 + i * 105;
    stackedRow(s, y0, id, c.gen, [rel, sup, use], total,
      `gen ${c.gen.toFixed(3)} + rel ${rel.toFixed(3)} + sup ${sup.toFixed(3)} + use ${use.toFixed(3)}`);
  });
  s.text(440, 388, 'gen: segment probability (stub). rel, sup, use: normalised critique probabilities, weighted 1.0, 1.0, 0.5.', { size: 15 });
  save('41.2-candidates.svg', s);
}

// 4. Critic error: the same candidate C with a confidently wrong critic, against A.
{
  const s = new Sketch(880, 300, { title: 'Confidently wrong critic on candidate C flips the selection over candidate A', seed: 414 });
  s.text(440, 34, 'A critic error changes the choice', { size: 24, weight: 700 });
  const aTotal = D.totals['A d0 correct'];
  const xA = x0 + aTotal * unit;
  s.line(xA, 72, xA, 262, { color: C.ink, dash: '6 8' });
  s.text(xA, 62, `A selected: ${aTotal.toFixed(3)}`, { size: 16 });
  const cId = 'C d2 ungrounded';
  const cgen = D.cands[cId].gen;
  const [r1, s1, u1] = D.parts[cId];
  const [r2, s2, u2] = D.parts_wrong[cId];
  const rows = [
    [110, 'C, critic as measured', cgen, [r1, s1, u1 * D.weights.use], D.totals[cId], `gen ${cgen.toFixed(3)}  rel ${r1.toFixed(3)}  sup ${s1.toFixed(3)}  use ${(u1 * D.weights.use).toFixed(3)}`],
    [215, 'C, critic confidently wrong', cgen, [r2, s2, u2 * D.weights.use], D.totals_wrong[cId], `gen ${cgen.toFixed(3)}  rel ${r2.toFixed(3)}  sup ${s2.toFixed(3)}  use ${(u2 * D.weights.use).toFixed(3)}`],
  ];
  rows.forEach(([y0, name, g, parts, total, lbl]) => stackedRow(s, y0, name, g, parts, total, lbl, 15));
  save('41.2-critic-error.svg', s);
}
