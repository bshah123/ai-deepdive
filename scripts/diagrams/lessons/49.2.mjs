import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-08-agents/chapter-49-agent-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const N = JSON.parse(readFileSync(join(HERE, '49.2_numbers.json'), 'utf8'));
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);

// 1. Write and read paths through one vector store
{
  const s = new Sketch(880, 300, { title: 'Write path and read path through a vector store', seed: 401 });
  s.text(440, 34, 'One store, two paths', { size: 26, weight: 700 });
  s.text(40, 74, 'write', { size: 18, anchor: 'start', color: C.muted });
  const w = [['turn', C.blue, C.blueSoft], ['extract', C.blue, C.blueSoft], ['embed', C.violet, C.violet], ['store row', C.green, C.greenSoft]];
  let x = 40;
  w.forEach(([t, col, fill], i) => {
    const bw = 150;
    s.rect(x, 84, bw, 44, { color: col, fill, fillStyle: 'solid' });
    s.text(x + bw / 2, 112, t, { font: 'mono', size: 17 });
    if (i < w.length - 1) s.arrow(x + bw + 4, 106, x + bw + 36, 106, { color: C.muted });
    x += bw + 40;
  });
  s.text(40, 170, 'read', { size: 18, anchor: 'start', color: C.muted });
  const r = [['query', C.amber, C.amberSoft], ['embed', C.violet, C.violet], ['top-k search', C.green, C.greenSoft], ['prompt', C.blue, C.blueSoft]];
  x = 40;
  r.forEach(([t, col, fill], i) => {
    const bw = 170;
    s.rect(x, 184, bw, 44, { color: col, fill, fillStyle: 'solid' });
    s.text(x + bw / 2, 212, t, { font: 'mono', size: 17 });
    if (i < r.length - 1) s.arrow(x + bw + 4, 206, x + bw + 36, 206, { color: C.muted });
    x += bw + 40;
  });
  s.note(40, 240, 800, 46, ['episodic rows carry a timestamp; semantic rows do not. Both use the same index.'], { size: 19 });
  save('49.2-two-paths.svg', s);
}

// 2. Worked cosine example (numbers from the experiment, worked3d)
{
  const W = N.worked3d;
  const s = new Sketch(880, 330, { title: 'Worked cosine similarity in three dimensions', seed: 402 });
  s.text(440, 34, 'Cosine by hand, 3 dimensions', { size: 26, weight: 700 });
  s.text(40, 72, `query q = [1, 2, 0],  |q| = ${f3(W.norm_q)}`, { font: 'mono', size: 18, anchor: 'start' });
  const cols = [60, 250, 440, 600, 740];
  ['memory', 'vector m', 'q·m', '|m|', 'cos'].forEach((h, i) => s.text(cols[i], 118, h, { size: 19, anchor: 'start', weight: 700 }));
  const rows = [['m1', '[2, 1, 0]', 'm1'], ['m2', '[0, 1, 2]', 'm2'], ['m3', '[1, 2, 0.5]', 'm3']];
  const vec = { m1: '[2, 1, 0]', m2: '[0, 1, 2]', m3: '[1, 2, 0.5]' };
  rows.forEach(([name], i) => {
    const y = 150 + i * 52;
    if (name === 'm3') s.rect(40, y - 26, 800, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cols[0], y, name, { font: 'mono', size: 19, anchor: 'start' });
    s.text(cols[1], y, vec[name], { font: 'mono', size: 19, anchor: 'start' });
    s.text(cols[2], y, f2(W.dots[name]).replace(/\.00$/, ''), { font: 'mono', size: 19, anchor: 'start' });
    s.text(cols[3], y, f3(W.norms[name]), { font: 'mono', size: 19, anchor: 'start' });
    s.text(cols[4], y, f3(W.cos[name]), { font: 'mono', size: 19, anchor: 'start', weight: 700 });
  });
  s.note(40, 284, 800, 40, ['cos = (q·m) / (|q| |m|). Rank: m3 > m1 > m2.'], { size: 19 });
  save('49.2-worked-cosine.svg', s);
}

// 3. Park-style score: min-max normalised components, equal weights
{
  const rows = N.scoring.all;
  const mm = (k) => {
    const v = rows.map((r) => r[k]); const lo = Math.min(...v); const hi = Math.max(...v);
    return Object.fromEntries(rows.map((r) => [r.id, hi > lo ? (r[k] - lo) / (hi - lo) : 0]));
  };
  const R = mm('rec'), I = mm('imp'), V = mm('rel');
  const pick = ['F1', 'E2', 'E8'];
  for (const r of rows) {
    const c = R[r.id] + I[r.id] + V[r.id];
    if (Math.abs(c - r.comb) > 1e-2) throw new Error(`score mismatch for ${r.id}: ${c} vs ${r.comb}`);
  }
  const s = new Sketch(880, 330, { title: 'Combined retrieval score: recency, importance and relevance stacked', seed: 403 });
  s.text(440, 34, 'Why timeless facts outrank the deadline', { size: 26, weight: 700 });
  const x0 = 230, unit = 230;
  s.text(x0, 66, 'recency', { size: 17, anchor: 'start', color: C.blue, weight: 700 });
  s.text(x0 + 110, 66, 'importance', { size: 17, anchor: 'start', color: C.amber, weight: 700 });
  s.text(x0 + 260, 66, 'relevance', { size: 17, anchor: 'start', color: C.green, weight: 700 });
  pick.forEach((id, i) => {
    const y = 96 + i * 62;
    const kind = id.startsWith('F') ? 'fact' : 'episode';
    s.text(40, y + 22, `${id} (${kind})`, { font: 'mono', size: 18, anchor: 'start' });
    let x = x0;
    const segs = [[R[id], C.blue, C.blueSoft], [I[id], C.amber, C.amberSoft], [V[id], C.green, C.greenSoft]];
    for (const [v, col, fill] of segs) {
      const w = v * unit;
      if (w > 0.5) s.rect(x, y, w, 36, { color: col, fill, fillStyle: 'solid' });
      x += w;
    }
    const total = R[id] + I[id] + V[id];
    s.text(x + 14, y + 24, f2(total), { font: 'mono', size: 18, anchor: 'start', weight: 700 });
  });
  s.note(40, 264, 800, 56, ['E2 (report deadline) has relevance 0.577, normalised to 1.0,',
    'but four facts with zero relevance score 2.00 and rank above it.'], { size: 18 });
  save('49.2-score-rerank.svg', s);
}

// 4. Write path: cosine values of same-fact and different-fact pairs against thresholds
{
  const s = new Sketch(880, 300, { title: 'Dedup threshold on cosine: same-fact and different-fact pairs', seed: 404 });
  s.text(440, 34, 'Where one threshold fails', { size: 26, weight: 700 });
  const X = (c) => 80 + c * 720;
  const ay = 180;
  s.line(X(0), ay, X(1), ay, { color: C.muted });
  for (let t = 0; t <= 1.0001; t += 0.2) {
    s.line(X(t), ay - 6, X(t), ay + 6, { color: C.muted });
    s.text(X(t), ay + 30, f2(t), { font: 'mono', size: 16 });
  }
  const placed = { 1: [], 0: [] };
  for (const p of [...N.dedup_pairs].sort((a, b) => a.cos - b.cos)) {
    const col = p.same ? C.blue : C.rose;
    const base = p.same ? 128 : 226;
    const near = placed[p.same].filter((c) => Math.abs(c - p.cos) < 0.03).length;
    placed[p.same].push(p.cos);
    const y = base + (near % 2 === 0 ? 0 : (p.same ? -22 : 22));
    s.circle(X(p.cos), y, 12, { color: col, fill: p.same ? C.blueSoft : C.roseSoft, fillStyle: 'solid' });
  }
  const t = 0.4;
  s.line(X(t), 96, X(t), ay, { color: C.amber, dash: '6 8' });
  const sw = N.threshold_sweep.find((z) => Math.abs(z.threshold - t) < 1e-9);
  s.text(X(t) + 10, 92, `t = ${t}: ${sw.merged_correct} merged right, ${sw.merged_wrong} wrong, ${sw.missed} missed`, { size: 17, anchor: 'start', color: C.amber });
  s.note(40, 246, 800, 40, ['blue above: same fact. rose below: different fact. The two groups overlap near 0.33 to 0.34.'], { size: 18 });
  save('49.2-dedup-threshold.svg', s);
}

// 5. Recall by query group
{
  const s = new Sketch(880, 350, { title: 'Recall at 1 and at 3 for lexical and paraphrase queries', seed: 405 });
  s.text(440, 34, 'Lexical overlap versus paraphrase', { size: 26, weight: 700 });
  const base = 250, H = 160;
  const groups = [['lexical', N.recall.lexical, 120], ['paraphrase', N.recall.paraphrase, 470]];
  for (const [name, g, gx] of groups) {
    const bars = [['recall@1', g.recall_at_1, C.blue], ['recall@3', g.recall_at_3, C.green]];
    bars.forEach(([lab, v, col], i) => {
      const bx = gx + i * 130, h = v * H;
      if (h > 0) s.rect(bx, base - h, 90, h, { color: col, fill: col, fillStyle: 'hachure' });
      s.text(bx + 45, base - h - 12, `${Math.round(v * g.n)}/${g.n}`, { font: 'mono', size: 18, weight: 700 });
      s.text(bx + 45, base + 28, lab, { size: 17 });
    });
    s.text(gx + 115, base + 62, name, { size: 22, weight: 700 });
  }
  s.line(90, base, 800, base, { color: C.muted });
  save('49.2-recall-groups.svg', s);
}
console.log('49.2 diagrams written');
