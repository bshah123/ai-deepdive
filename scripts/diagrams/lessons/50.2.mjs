import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-08-agents/chapter-50-multi-agent-systems/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers copied from the experiment run (block1_contract_net, block2_vote, block3_quorum).

// 1. Contract net: three phases for N = 4 contractors (costs 7, 4, 9, 5).
{
  const s = new Sketch(880, 330, { title: 'Contract net: announce, bid and award for four contractors, 12 messages', seed: 501 });
  s.text(440, 34, 'Contract net for one task, N = 4 contractors', { size: 26, weight: 700 });
  const cols = [
    { x: 40, head: '1  Announce', lines: ['manager sends cfp', 'to each contractor', '', '4 messages'] },
    { x: 320, head: '2  Bid', lines: ['each contractor replies', 'propose with its cost', 'A 7   B 4   C 9   D 5', '4 messages'] },
    { x: 600, head: '3  Award', lines: ['lowest bid (B) gets accept', 'A, C, D get reject', '', '4 messages'] },
  ];
  for (const c of cols) {
    s.rect(c.x, 70, 240, 200, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(c.x + 120, 104, c.head, { size: 22, weight: 700 });
    c.lines.forEach((l, i) => s.text(c.x + 120, 140 + i * 30, l, { size: 17, font: i === 3 ? 'mono' : 'hand', color: i === 3 ? C.ink : C.muted }));
  }
  s.arrow(284, 170, 316, 170, { color: C.muted, head: 12 });
  s.arrow(564, 170, 596, 170, { color: C.muted, head: 12 });
  s.text(440, 300, 'total = 4 + 4 + 4 = 12 = 3N', { font: 'mono', size: 22, weight: 700 });
  save('50.2-contract-net.svg', s);
}

// 2. Messages per round: contract net versus all-to-all broadcast.
{
  const s = new Sketch(880, 380, { title: 'Bar chart: messages per round for contract net and all-to-all, n = 4, 8, 16', seed: 502 });
  s.text(440, 34, 'Messages per round as the group grows', { size: 26, weight: 700 });
  const base = 320, k = 0.9;               // 240 messages -> 216 px
  s.line(90, base, 820, base, { color: C.muted });
  const data = [
    { n: 4, cnp: 12, a2a: 12 },
    { n: 8, cnp: 24, a2a: 56 },
    { n: 16, cnp: 48, a2a: 240 },
  ];
  data.forEach((d, i) => {
    const cx = 230 + i * 240;
    const h1 = d.cnp * k, h2 = d.a2a * k;
    s.rect(cx - 70, base - h1, 60, h1, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 10, base - h2, 60, h2, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx - 40, base - h1 - 10, String(d.cnp), { font: 'mono', size: 17 });
    s.text(cx + 40, base - h2 - 10, String(d.a2a), { font: 'mono', size: 17 });
    s.text(cx, 352, `n = ${d.n}`, { size: 20 });
  });
  s.note(90, 60, 280, 60, ['blue: contract net, 3N', 'amber: all-to-all, n(n-1)'], { size: 17 });
  save('50.2-message-growth.svg', s);
}

// 3. Majority vote: independent versus correlated errors, p = 0.7 per agent, binary answer.
{
  const s = new Sketch(880, 400, { title: 'Bar chart: majority-vote accuracy, independent and correlated panels', seed: 503 });
  s.text(440, 34, 'Majority vote accuracy, p = 0.7 per agent', { size: 26, weight: 700 });
  const base = 340, k = 240;               // accuracy 1.0 -> 240 px
  s.line(100, base, 820, base, { color: C.muted });
  s.text(80, base + 5, '0', { font: 'mono', size: 16, anchor: 'end' });
  s.text(80, base - k + 5, '1', { font: 'mono', size: 16, anchor: 'end' });
  const ceil = 0.91;                       // 0.3 * 0.7 + 0.7
  s.line(100, base - ceil * k, 820, base - ceil * k, { color: C.rose, dash: '6 8' });
  s.text(100, base - ceil * k + 24, 'correlated ceiling 0.91', { size: 16, anchor: 'start', color: C.rose });
  const rows = [
    { k: 1, ind: 0.700, cor: 0.700 },
    { k: 3, ind: 0.784, cor: 0.759 },
    { k: 9, ind: 0.901, cor: 0.841 },
    { k: 31, ind: 0.990, cor: 0.903 },
  ];
  rows.forEach((r, i) => {
    const cx = 190 + i * 170;
    const h1 = r.ind * k, h2 = r.cor * k;
    s.rect(cx - 56, base - h1, 50, h1, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 6, base - h2, 50, h2, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx - 31, base - 14, r.ind.toFixed(2), { font: 'mono', size: 15 });
    s.text(cx + 31, base - 14, r.cor.toFixed(2), { font: 'mono', size: 15 });
    s.text(cx, base + 30, `k = ${r.k}`, { size: 19 });
  });
  s.note(100, 56, 300, 56, ['blue: independent votes', 'amber: 30% shared error draw'], { size: 17 });
  save('50.2-vote-accuracy.svg', s);
}

// 4. Byzantine quorum sizes: filled circles = quorum needed, n = 3..9.
{
  const s = new Sketch(880, 400, { title: 'Quorum sizes for Byzantine agreement, n from 3 to 9', seed: 504 });
  s.text(440, 34, 'Byzantine quorum: n nodes, quorum q, tolerates f = floor((n-1)/3)', { size: 24, weight: 700 });
  const rows = [
    [3, 0, 2], [4, 1, 3], [5, 1, 4], [6, 1, 4], [7, 2, 5], [8, 2, 6], [9, 2, 6],
  ];
  rows.forEach(([n, f, q], i) => {
    const y = 84 + i * 42;
    s.text(40, y + 6, `n = ${n}`, { font: 'mono', size: 17, anchor: 'start' });
    for (let j = 0; j < n; j++) {
      const cx = 130 + j * 34;
      if (j < q) s.circle(cx, y, 24, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      else s.circle(cx, y, 24, { color: C.muted });
    }
    s.text(560, y + 6, `f = ${f}, quorum q = ${q}`, { font: 'mono', size: 17, anchor: 'start' });
  });
  s.text(440, 372, 'filled circles = quorum size; n = 5 buys no extra tolerance over n = 4', { size: 18, color: C.muted });
  save('50.2-quorum-sizes.svg', s);
}
