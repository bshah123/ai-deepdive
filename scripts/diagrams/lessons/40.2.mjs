import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-40-context-optimization/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '40.2_data.json'), 'utf8'));
const row = (method, keep) => D.rows[method].find((r) => r.keep_target === keep);
const ex = D.example;

// 1. Two families, same passage
{
  const s = new Sketch(880, 330, { title: 'Token pruning keeps scattered words; sentence selection keeps whole sentences', seed: 401 });
  s.text(440, 40, 'Two ways to shrink one passage', { size: 26, weight: 700 });
  s.rect(40, 66, 390, 230, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(235, 100, 'Token pruning (LLMLingua family)', { size: 20, weight: 700 });
  s.text(235, 134, 'Scores each token and drops', { size: 17 });
  s.text(235, 158, 'the predictable ones.', { size: 17 });
  s.text(235, 200, 'bridge was designed by engineer Ada', { font: 'mono', size: 15 });
  s.text(235, 224, 'who previously harbour', { font: 'mono', size: 15 });
  s.text(235, 262, 'Keeps 9 of 18 tokens; the name Lindqvist is lost.', { size: 17 });
  s.rect(470, 66, 370, 230, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(655, 100, 'Sentence selection (LSA-style)', { size: 20, weight: 700 });
  s.text(655, 134, 'Scores each sentence and keeps', { size: 17 });
  s.text(655, 158, 'the top ones whole.', { size: 17 });
  s.text(655, 200, `kept sentences ${D.lsa_ids_at_half.join(', ')} of ${D.n_sentences}`, { font: 'mono', size: 15 });
  s.text(655, 224, `tokens kept: ${(row('lsa', 0.5).kept_fraction * 100).toFixed(0)}%`, { font: 'mono', size: 15 });
  s.text(655, 262, 'Keeps grammar, but also whole weak sentences.', { size: 17 });
  s.text(440, 318, `Key facts kept at a 50% budget: token pruning ${row('surprisal', 0.5).gold_retained} of ${D.gold_total}, sentences ${row('lsa', 0.5).gold_retained} of ${D.gold_total}`, { size: 17, weight: 700 });
  save('40.2-two-families.svg', s);
}

// 2. Surprisal per token (horizontal bars)
{
  const s = new Sketch(880, 500, { title: 'Bar chart of surprisal in bits for each token of one sentence', seed: 402 });
  s.text(440, 34, 'Surprisal per token: bits = -log2 p(token | previous)', { size: 24, weight: 700 });
  const kept = ex.kept_mask;
  const scale = 36;
  ex.tokens.forEach((t, i) => {
    const y = 70 + i * 22;
    const w = ex.bits[i] * scale;
    s.text(200, y + 5, t, { font: 'mono', size: 15, anchor: 'end' });
    if (kept[i]) s.rect(220, y - 9, w, 17, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    else s.rect(220, y - 9, w, 17, { color: C.muted, fillStyle: 'hachure' });
    s.text(220 + w + 10, y + 5, `${ex.bits[i].toFixed(2)}`, { font: 'mono', size: 15, anchor: 'start' });
  });
  s.note(640, 80, 220, 84, ['solid bar = kept at 50%', 'hatched bar = dropped'], { size: 18 });
  const total = ex.bits.reduce((a, b) => a + b, 0);
  s.text(440, 486, `Total ${total.toFixed(1)} bits over ${ex.tokens.length} tokens; ${(total / ex.tokens.length).toFixed(2)} bits per token on average`, { size: 17 });
  save('40.2-surprisal-bars.svg', s);
}

// 3. Pipeline
{
  const s = new Sketch(880, 250, { title: 'Pipeline of token-level compression', seed: 403 });
  s.text(440, 34, 'Token-level compression, step by step', { size: 26, weight: 700 });
  const xs = [40, 250, 460, 670];
  const boxes = [
    [`Passage`, `${D.doc_tokens} tokens`, `8 sentences`],
    [`Score each token`, `bits from a small LM`, `(toy bigram here)`],
    [`Keep top 50%`, `in each 40-token`, `segment, order kept`],
    [`Compressed prompt`, `${Math.round(D.doc_tokens * 0.5)} tokens`, `sent to the LLM`],
  ];
  const colors = [[C.ink, C.muted], [C.blue, C.blueSoft], [C.amber, C.amberSoft], [C.green, C.greenSoft]];
  boxes.forEach((b, i) => {
    const [stroke, fill] = colors[i];
    s.rect(xs[i], 70, 170, 112, { color: stroke, fill, fillStyle: 'solid' });
    s.text(xs[i] + 85, 100, b[0], { size: 19, weight: 700 });
    s.text(xs[i] + 85, 128, b[1], { size: 16 });
    s.text(xs[i] + 85, 152, b[2], { size: 16 });
    if (i < 3) s.arrow(xs[i] + 176, 126, xs[i + 1] - 6, 126, { color: C.muted });
  });
  s.text(440, 222, 'Same shape as LLMLingua; its scorer is a 7-billion-parameter model.', { size: 17 });
  save('40.2-pipeline.svg', s);
}

// 4. Retention curve (measured)
{
  const s = new Sketch(880, 440, { title: 'Key facts kept versus tokens kept on one passage', seed: 404 });
  s.text(440, 34, 'Key facts kept versus tokens kept (one 160-token passage)', { size: 24, weight: 700 });
  const x0 = 110, w = 530, yb = 350, h = 250;
  const X = (f) => x0 + ((f - 0.1) / 0.8) * w;
  const Y = (v) => yb - (v / D.gold_total) * h;
  for (let v = 0; v <= D.gold_total; v++) {
    s.line(x0, Y(v), x0 + w, Y(v), { color: C.muted, width: 1, dash: '2 6' });
    s.text(x0 - 12, Y(v) + 5, `${v}`, { font: 'mono', size: 15, anchor: 'end' });
  }
  s.line(x0, yb, x0 + w, yb, { color: C.ink, width: 2 });
  s.line(x0, yb, x0, Y(D.gold_total), { color: C.ink, width: 2 });
  for (const f of [0.2, 0.4, 0.6, 0.8]) {
    s.text(X(f), yb + 28, `${f.toFixed(1)}`, { font: 'mono', size: 15 });
  }
  s.text(x0 + w / 2, yb + 62, 'fraction of tokens kept', { size: 18 });
  s.text(50, yb - h / 2, 'key facts kept (of 6)', { size: 18, rotate: -90 });
  const series = [
    ['surprisal', 'token pruning', C.blue, null],
    ['lsa', 'sentence selection', C.green, null],
    ['random', 'random tokens', C.rose, '6 8'],
    ['first', 'first k tokens', C.violet, null],
  ];
  series.forEach(([key, , color, dash], si) => {
    const pts = D.rows[key].map((r) => [X(r.kept_fraction), Y(r.gold_retained)]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < pts.length; i++) {
      s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color, width: 3, dash: dash || undefined });
    }
    pts.forEach(([x, y]) => s.circle(x, y, 10, { color, fill: color, fillStyle: 'solid' }));
    const ly = 130 + si * 44;
    s.line(690, ly, 720, ly, { color, width: 3, dash: dash || undefined });
    s.text(728, ly + 6, series[si][1], { size: 17, anchor: 'start' });
  });
  s.text(690, 330, 'One point per budget.', { size: 17, anchor: 'start' });
  save('40.2-retention.svg', s);
}
console.log('ok');
