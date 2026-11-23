import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-37-rag-fundamentals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below comes from 37.1_experiment.py (writes 37.1_data.json).
const D = JSON.parse(readFileSync(join(HERE, '37.1_data.json'), 'utf8'));
const f2 = (x) => x.toFixed(2);

// 1. Vector search returns chunks; RAG also writes the answer.
{
  const s = new Sketch(880, 330, { title: 'Vector search output versus the full RAG pipeline', seed: 371 });
  s.text(440, 34, 'Vector search stops at the chunks; RAG writes the answer', { size: 24, weight: 700 });
  s.text(530, 84, 'vector search', { size: 18, color: C.amber });
  s.rect(40, 96, 150, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 130, 'question', { size: 20 });
  s.arrow(190, 124, 230, 124, { color: C.muted });
  s.rect(230, 96, 150, 56, { color: C.muted });
  s.text(305, 130, 'embed', { size: 20 });
  s.arrow(380, 124, 420, 124, { color: C.muted });
  s.rect(420, 96, 220, 56, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(530, 130, 'top-k chunks + scores', { size: 19 });
  s.text(400, 228, 'RAG adds', { size: 18, anchor: 'end', color: C.green });
  s.arrow(530, 152, 530, 200, { color: C.muted });
  s.rect(420, 200, 220, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(530, 234, 'prompt with [1] [2] [3]', { size: 18 });
  s.arrow(640, 228, 680, 228, { color: C.muted });
  s.rect(680, 200, 160, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(760, 234, 'LLM writes answer', { size: 18 });
  s.note(40, 272, 800, 46, ['RAG rules: cite [1]-[3] for each claim; abstain when no chunk supports the answer.'], { size: 18 });
  save('37.1-pipeline.svg', s);
}

// 2. Cosine scores for one question, one sentence per chunk (from the experiment).
{
  const s = new Sketch(880, 370, { title: 'Cosine scores of one query against eight chunks', seed: 372 });
  s.text(440, 34, 'Cosine scores for one question, one sentence per chunk', { size: 24, weight: 700 });
  s.text(440, 62, `query: "${D.example_query}"`, { size: 18, color: C.muted });
  const base = 300, scale = 200, pitch = 95, bw = 56, x0 = 90;
  s.line(70, base, 830, base, { color: C.muted });
  const top3 = new Set(D.per_answerable_query.find((r) => r.q === D.example_query).top3);
  D.example_scores.forEach((v, i) => {
    const x = x0 + i * pitch, cx = x + bw / 2, h = scale * v;
    const gold = i === D.example_gold;
    if (h < 1) {
      s.line(x, base, x + bw, base, { color: C.muted, width: 3 });
      s.text(cx, base - 12, '0.00', { size: 18, color: C.muted });
    } else {
      const col = gold ? C.green : C.blue, fill = gold ? C.greenSoft : (top3.has(i) ? C.blueSoft : null);
      s.rect(x, base - h, bw, h, fill ? { color: col, fill, fillStyle: 'solid' } : { color: C.muted });
      s.text(cx, base - h - 12, f2(v), { size: 18 });
    }
    s.text(cx, 328, `${i + 1}`, { size: 18 });
  });
  s.text(440, 356, 'green = gold chunk; blue = other top-3; outline = not retrieved', { size: 17, color: C.muted });
  save('37.1-top-k.svg', s);
}

// 3. Evidence recall for chunk size and overlap.
{
  const s = new Sketch(880, 380, { title: 'Gold sentence inside a top-3 chunk for different chunk sizes', seed: 373 });
  s.text(440, 34, 'Gold sentence fully inside a top-3 chunk, out of 10 questions', { size: 24, weight: 700 });
  s.text(440, 62, 'sentences are 12 to 16 words; a 10-word chunk can never hold one', { size: 18, color: C.muted });
  const base = 290, scale = 20, pitch = 130, bw = 88, x0 = 80;
  s.line(60, base, 840, base, { color: C.muted });
  D.chunking.forEach((r, i) => {
    const x = x0 + i * pitch, cx = x + bw / 2, h = scale * r.evidence_at_3;
    const label = r.n_chunks === 1 ? 'one chunk' : `${r.size} / ${r.overlap}`;
    if (h < 1) {
      s.line(x, base, x + bw, base, { color: C.rose, width: 3 });
    } else {
      const full = r.evidence_at_3 === r.n;
      const col = full ? C.green : C.blue, fill = full ? C.greenSoft : C.blueSoft;
      s.rect(x, base - h, bw, h, { color: col, fill, fillStyle: 'solid' });
    }
    s.text(cx, base - Math.max(h, 2) - 12, `${r.evidence_at_3}/${r.n}`, { size: 19 });
    s.text(cx, 320, label, { size: 18 });
    s.text(cx, 344, `${Math.round(r.prompt_words_top3)} words`, { size: 16, color: C.muted });
  });
  s.text(440, 370, 'labels: chunk size / overlap in words; prompt words = the top-3 chunks', { size: 16, color: C.muted });
  save('37.1-chunking.svg', s);
}

// 4. Top-1 scores: answerable versus unanswerable questions, with a threshold.
{
  const s = new Sketch(880, 330, { title: 'Top-1 score for answerable and unanswerable questions', seed: 374 });
  s.text(440, 34, 'Top-1 score: answerable versus unanswerable questions', { size: 24, weight: 700 });
  const X = (v) => 80 + v * 900;
  const ay = 180;
  s.line(X(0), ay, X(0.8), ay, { color: C.muted });
  [0, 0.2, 0.4, 0.6, 0.8].forEach((t) => {
    s.line(X(t), ay, X(t), ay + 8, { color: C.muted });
    s.text(X(t), ay + 30, t.toFixed(1), { size: 17, color: C.muted });
  });
  s.text(X(0.4), ay + 60, 'cosine score of the top-1 chunk', { size: 18, color: C.muted });
  D.top1_answerable.forEach((v) => s.circle(X(v), ay, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' }));
  for (let i = 0; i < D.top1_unanswerable.length; i++) {
    s.circle(X(0), ay - 26 - i * 0, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  }
  s.text(X(0) + 16, 110, `unanswerable (${D.n_unanswerable}): all at 0.00`, { size: 18, anchor: 'start', color: C.rose });
  s.text(X(0.4), 125, `answerable (${D.n_answerable})`, { size: 18, color: C.blue });
  s.line(X(0.2), 140, X(0.2), 230, { color: C.amber, dash: '6 8' });
  s.text(X(0.2) + 10, 150, 'threshold 0.2', { size: 18, anchor: 'start', color: C.amber });
  s.note(40, 262, 800, 50, ['A top-k search always returns k hits; only a score rule can say "no answer".'], { size: 18 });
  save('37.1-abstain.svg', s);
}
