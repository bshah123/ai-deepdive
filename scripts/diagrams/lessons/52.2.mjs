import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-09-production-ai/chapter-52-agent-case-studies/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers copied from the experiment run (exp.py): coverage = share of 6 facts reported for the right pilot,
// by pages opened (budget). Precision values are 0.00 to 1.00 as printed.
const BUDGETS = [3, 6, 9, 12, 18, 24];
const COV = {
  'one-shot':    [0, 0, 0, 0, 1 / 6, 1 / 6],
  'loop':        [1 / 6, 0.5, 0.5, 0.5, 0.5, 0.5],
  'loop+verify': [1 / 6, 0.5, 4 / 6, 4 / 6, 1, 1],
};

// 1. Architecture: the pipeline with a rejection loop back to search.
{
  const s = new Sketch(880, 360, { title: 'Research agent pipeline with a verifier that sends rejected claims back to search', seed: 521 });
  s.text(440, 34, 'Plan, search, verify, write', { size: 26, weight: 700 });
  const boxes = [
    [30, 'Planner', ['6 sub-questions,', 'one query each']],
    [200, 'Search loop', ['best unread page', 'per open gap']],
    [370, 'Evidence', ['claim + page id']],
    [540, 'Verifier', ['entity and value', 'in the cited page?']],
    [710, 'Writer', ['one sentence per', 'claim, with a cite']],
  ];
  for (const [x, name, lines] of boxes) {
    const fill = name === 'Verifier' ? C.greenSoft : C.blueSoft;
    const col = name === 'Verifier' ? C.green : C.blue;
    s.rect(x, 80, 140, 92, { color: col, fill, fillStyle: 'solid' });
    s.text(x + 70, 110, name, { size: 20, weight: 700 });
    s.text(x + 70, 140, lines, { size: 16 });
  }
  for (const x of [170, 340, 510, 680]) s.arrow(x + 4, 126, x + 26, 126, { color: C.muted });
  // rejected claims go back to the search loop
  s.line(610, 172, 610, 228, { color: C.rose, width: 2 });
  s.line(610, 228, 270, 228, { color: C.rose, width: 2 });
  s.arrow(270, 228, 270, 176, { color: C.rose });
  s.text(440, 254, 'rejected: the gap stays open and the next page is read', { size: 17, color: C.rose });
  s.note(40, 290, 800, 46, ['Each sentence in the report points to one page id. Nothing reaches the writer unless the verifier accepts it.'], { size: 18 });
  save('52.2-architecture.svg', s);
}

// 2. Trace: how the verifier changes which pages get read (budget 9 for both).
{
  const s = new Sketch(880, 430, { title: 'Trace of two strategies on the same six sub-questions, budget of nine pages', seed: 522 });
  s.text(440, 34, 'Same budget, different reads', { size: 26, weight: 700 });
  const left = [
    [1, 'capacity', 'Halden-capacity', true],
    [2, 'cost', 'Varna-cost', true],
    [3, 'cycles', 'Osko-cycles', true],
    [4, 'service', 'Halden-service', true],
    [5, 'risk', 'Ilse-risk', true],
    [6, 'commission', 'Halden-commission', true],
  ];
  const right = [
    [1, 'capacity', 'Halden-capacity', true],
    [2, 'cost', 'Varna-cost', false],
    [3, 'cycles', 'Osko-cycles', false],
    [4, 'service', 'Halden-service', true],
    [5, 'risk', 'Ilse-risk', false],
    [6, 'commission', 'Halden-commission', true],
    [7, 'cost', 'Osko-cost', false],
    [8, 'cycles', 'Brenn-cycles', false],
    [9, 'risk', 'Halden-risk', true],
  ];
  const panel = (x0, title, rows, bad) => {
    s.rect(x0, 70, 400, 320, { color: C.muted, fill: C.blueSoft, fillStyle: 'solid', dash: '6 8' });
    s.text(x0 + 200, 100, title, { size: 19, weight: 700 });
    s.text(x0 + 30, 130, 'page', { size: 16, color: C.muted });
    s.text(x0 + 70, 130, 'sub-question', { size: 16, color: C.muted, anchor: 'start' });
    s.text(x0 + 185, 130, 'page opened', { size: 16, color: C.muted, anchor: 'start' });
    s.text(x0 + 385, 130, 'accepted', { size: 16, color: C.muted, anchor: 'end' });
    rows.forEach(([n, attr, doc, ok], i) => {
      const y = 158 + i * 28;
      s.text(x0 + 40, y, String(n), { size: 16, font: 'mono' });
      s.text(x0 + 70, y, attr, { size: 16, font: 'mono', anchor: 'start' });
      s.text(x0 + 185, y, doc, { size: 15, font: 'mono', anchor: 'start', color: doc.startsWith('Halden') ? C.green : C.rose });
      s.text(x0 + 385, y, ok ? 'yes' : 'no', { size: 16, font: 'mono', anchor: 'end', color: ok ? C.green : C.rose, weight: 700 });
    });
  };
  panel(30, 'loop, no verify: 3 of 6 right', left, false);
  panel(450, 'loop+verify: 4 of 6 right at 9 pages', right, true);
  s.text(440, 414, 'Green page ids are the right pilot (Halden); red are look-alike pilots.', { size: 16, color: C.muted });
  save('52.2-trace.svg', s);
}

// 3. Coverage against pages opened, one line per strategy.
{
  const s = new Sketch(880, 420, { title: 'Coverage of six facts against pages opened, three strategies', seed: 523 });
  s.text(440, 34, 'Coverage rises with pages, but only verification keeps precision at 1.00', { size: 22, weight: 700 });
  const x0 = 110, x1 = 760, y0 = 340, y1 = 90;
  const X = (b) => x0 + ((b - 3) / (24 - 3)) * (x1 - x0);
  const Y = (c) => y0 - c * (y0 - y1);
  s.line(x0, y0, x1 + 10, y0, { color: C.ink, width: 1.5 });
  s.line(x0, y0, x0, y1 - 10, { color: C.ink, width: 1.5 });
  for (const c of [0, 0.5, 1]) {
    s.line(x0 - 6, Y(c), x0, Y(c), { color: C.ink });
    s.text(x0 - 14, Y(c) + 6, c.toFixed(1), { size: 16, anchor: 'end', font: 'mono' });
  }
  BUDGETS.forEach((b) => s.text(X(b), y0 + 26, String(b), { size: 16, font: 'mono' }));
  s.text((x0 + x1) / 2, y0 + 56, 'pages opened (budget)', { size: 18 });
  const series = [
    ['one-shot', C.muted, '6 2 3'],
    ['loop', C.amber, null],
    ['loop+verify', C.green, null],
  ];
  series.forEach(([name, col, dash], k) => {
    const pts = BUDGETS.map((b, i) => [X(b), Y(COV[name][i])]);
    for (let i = 1; i < pts.length; i++) {
      s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color: col, width: 3, dash: dash || undefined });
    }
    pts.forEach(([x, y]) => s.circle(x, y, 9, { color: col, fill: col, fillStyle: 'solid' }));
    const ly = 122 + k * 26;
    s.line(140, ly - 6, 176, ly - 6, { color: col, width: 3, dash: dash || undefined });
    s.text(186, ly, name, { size: 17, anchor: 'start' });
  });
  save('52.2-coverage.svg', s);
}
