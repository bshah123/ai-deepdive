import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-08-agents/chapter-49-agent-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const N = JSON.parse(readFileSync(join(HERE, '49.3_numbers.json'), 'utf8'));
const f3 = (v) => v.toFixed(3);

// 1. Worked example: what 1-hop retrieval returns for Alice
{
  const s = new Sketch(880, 360, { title: 'Alice fact graph: four facts returned by 1-hop retrieval, one of them the gold answer', seed: 4901 });
  s.text(440, 34, 'Alice: what 1-hop retrieval returns', { size: 24, weight: 700 });
  s.rect(85, 168, 130, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(150, 196, 'Alice', { font: 'mono', size: 17 });
  s.rect(355, 88, 130, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(420, 116, 'Bob', { font: 'mono', size: 17 });
  s.rect(355, 168, 130, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(420, 196, 'Mumbai', { font: 'mono', size: 17 });
  s.rect(355, 248, 130, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(420, 276, 'Laptop', { font: 'mono', size: 17 });
  s.rect(635, 88, 130, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(700, 116, 'Phone', { font: 'mono', size: 17 });
  s.rect(85, 300, 130, 44, { color: C.muted, fill: C.muted, fillStyle: 'hachure' });
  s.text(150, 328, 'Delhi', { font: 'mono', size: 17 });
  s.arrow(215, 190, 355, 190, { color: C.blue });
  s.text(285, 178, 'lives_in t5', { font: 'mono', size: 15 });
  s.arrow(215, 178, 355, 118, { color: C.blue });
  s.text(200, 150, 'friend_of t3', { font: 'mono', size: 15, anchor: 'end' });
  s.arrow(215, 204, 355, 262, { color: C.blue });
  s.text(270, 252, 'likes t2', { font: 'mono', size: 15 });
  s.arrow(485, 110, 635, 110, { color: C.amber, width: 3 });
  s.text(560, 96, 'likes t4', { font: 'mono', size: 15 });
  s.arrow(150, 212, 150, 300, { color: C.muted, dash: '6 8' });
  s.text(165, 268, 'superseded t1', { font: 'mono', size: 15, anchor: 'start', color: C.muted });
  s.note(560, 250, 290, 84, [
    `returned: ${N.worked.returned_1hop_supersede} facts`,
    `gold hits: ${N.worked.gold_hits}, precision ${f3(N.worked.precision_1hop)}`,
    'solid blue = returned; amber = gold',
  ], { size: 17 });
  save('49.3-worked-graph.svg', s);
}

// 2. Supersession timeline for one user
{
  const s = new Sketch(880, 280, { title: 'Timeline of lives_in facts: append-only keeps Delhi in context, supersession hides it', seed: 4902 });
  s.text(440, 34, 'lives_in for Alice, by turn', { size: 24, weight: 700 });
  const x = (t) => 120 + (t - 1) * 160;
  s.text(110, 116, 'Delhi', { font: 'mono', size: 17, anchor: 'end' });
  s.rect(x(1), 98, x(5) - x(1), 32, { color: C.muted, fill: C.roseSoft, fillStyle: 'solid', dash: '6 8' });
  s.text(x(3), 120, 'stored, not live', { font: 'mono', size: 15, color: C.ink });
  s.text(110, 176, 'Mumbai', { font: 'mono', size: 17, anchor: 'end' });
  s.rect(x(5), 158, 80, 32, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  for (let t = 1; t <= 5; t++) s.text(x(t), 222, `t${t}`, { font: 'mono', size: 16, color: C.muted });
  s.note(40, 240, 800, 34, [
    `synthetic run: stale city in context for ${N.supersession.stale_in_context_append_only} of ${N.supersession.moved_users} moved users (append-only), ${N.supersession.stale_in_context_supersede} (supersede)`,
  ], { size: 16 });
  save('49.3-supersede-timeline.svg', s);
}

// 3. Retrieval: recall and precision by hop depth and budget
{
  const s = new Sketch(880, 400, { title: 'Recall and precision of friend-likes retrieval by hop depth, with and without a 20-fact budget', seed: 4903 });
  s.text(440, 34, 'Friends’ likes: recall and precision', { size: 24, weight: 700 });
  const base = 310, H = 190;
  const panels = [
    { label: 'budget: none', x0: 30, budgets: 'none' },
    { label: 'budget: 20 facts', x0: 460, budgets: '20' },
  ];
  for (const p of panels) {
    s.text(p.x0 + 195, 76, p.label, { size: 18, weight: 700 });
    s.line(p.x0, base, p.x0 + 390, base, { color: C.muted });
    [0, 1, 2].forEach((h, gi) => {
      const key = `hops${h}_budget${p.budgets}`;
      const r = N.retrieval[key];
      const cx = p.x0 + 65 + gi * 135;
      const bars = [[r.recall, C.blue, C.blueSoft, cx - 42], [r.precision, C.amber, C.amberSoft, cx + 6]];
      for (const [v, col, soft, bx] of bars) {
        if (v > 0) s.rect(bx, base - v * H, 36, v * H, { color: col, fill: soft, fillStyle: 'solid' });
        s.text(bx + 18, base - v * H - 10, f3(v), { font: 'mono', size: 15 });
      }
      s.text(cx, base + 26, `hops ${h}`, { size: 17 });
    });
  }
  s.rect(250, 360, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(276, 376, 'recall', { size: 17, anchor: 'start' });
  s.rect(380, 360, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(406, 376, 'precision', { size: 17, anchor: 'start' });
  s.text(440, 396, '60 users, 714 gold facts; budget keeps the first 20 facts in hop order', { size: 15, color: C.muted });
  save('49.3-retrieval-bars.svg', s);
}

// 4. Entity resolution: recall and precision by string-similarity threshold
{
  const s = new Sketch(880, 380, { title: 'Entity resolution: recall and precision by similarity threshold on synthetic name pairs', seed: 4904 });
  s.text(440, 34, 'Name matching: recall vs precision by threshold', { size: 24, weight: 700 });
  const base = 290, H = 200;
  const ts = ['1.0', '0.9', '0.8', '0.7', '0.6'];
  ts.forEach((t, i) => {
    const r = N.resolution[t];
    const cx = 150 + i * 140;
    const bars = [[r.recall, C.blue, C.blueSoft, cx - 44], [r.precision, C.amber, C.amberSoft, cx + 4]];
    for (const [v, col, soft, bx] of bars) {
      if (v > 0) s.rect(bx, base - v * H, 40, v * H, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(bx + 20, base - v * H - 10, f3(v), { font: 'mono', size: 15 });
    }
    s.text(cx, 320, `t = ${t}`, { font: 'mono', size: 16 });
    s.text(cx, 344, `FP ${r.false_merges_hard}`, { font: 'mono', size: 15, color: C.muted });
  });
  s.line(90, base, 790, base, { color: C.muted });
  s.rect(250, 362, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(276, 378, 'recall', { size: 17, anchor: 'start' });
  s.rect(380, 362, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(406, 378, 'precision', { size: 17, anchor: 'start' });
  save('49.3-resolution-bars.svg', s);
}
