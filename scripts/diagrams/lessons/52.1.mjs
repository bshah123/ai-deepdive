import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-09-production-ai/chapter-52-agent-case-studies/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers below are copied from the local experiment run (CPython 3.12.13 stdlib; see the lesson's details block).

// 1. The loop
{
  const s = new Sketch(880, 340, { title: 'Agent loop: model proposes a tool call, the tool layer runs it, the observation returns to the context', seed: 521 });
  s.text(440, 34, 'The agent loop: one tool call per step', { size: 26, weight: 700 });
  s.rect(40, 80, 190, 90, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(135, 112, 'Model', { size: 22, weight: 700 });
  s.text(135, 140, ['proposes one', 'tool call'], { size: 17 });
  s.rect(345, 80, 190, 90, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 112, 'Tool layer', { size: 22, weight: 700 });
  s.text(440, 140, ['validates, truncates'], { size: 17 });
  s.rect(650, 80, 190, 90, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(745, 112, 'Repository', { size: 22, weight: 700 });
  s.text(745, 140, ['files and tests'], { size: 17 });
  s.arrow(230, 125, 345, 125, { color: C.ink });
  s.arrow(535, 125, 650, 125, { color: C.ink });
  s.line(745, 170, 745, 215, { color: C.muted });
  s.line(745, 215, 135, 215, { color: C.muted });
  s.arrow(135, 215, 135, 170, { color: C.muted });
  s.text(440, 244, 'observation goes back into the context, which grows every step', { size: 18, color: C.muted });
  s.note(40, 272, 800, 46, ['stop when every test passes, or when the step budget runs out'], { size: 19 });
  save('52.1-agent-loop.svg', s);
}

// 2. Tool interface: each tool with its guard
{
  const s = new Sketch(880, 360, { title: 'Four tools, each with a limit on what the model sees', seed: 522 });
  s.text(440, 34, 'Four tools, each with a guard', { size: 26, weight: 700 });
  s.text(135, 70, 'tool', { size: 18, weight: 700 });
  s.text(390, 70, 'what it returns', { size: 18, weight: 700 });
  s.text(695, 70, 'the guard', { size: 18, weight: 700 });
  const rows = [
    ['view(path, start)', 'at most 100 lines per call', 'long files need several calls'],
    ['search(term)', 'matching lines with file and line', 'over 50 hits: a count, not the hits'],
    ['edit(path, old, new)', 'applied only if old occurs once', 'compile() rejects bad syntax first'],
    ['run_tests()', 'PASS or FAIL per test, plus totals', 'the stop condition: all pass'],
  ];
  rows.forEach(([tool, ret, guard], i) => {
    const y = 88 + i * 66;
    s.rect(40, y, 190, 54, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(135, y + 33, tool, { font: 'mono', size: 15 });
    s.rect(245, y, 290, 54, { color: C.muted, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(390, y + 33, ret, { size: 17 });
    s.rect(550, y, 290, 54, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(695, y + 33, guard, { size: 17 });
  });
  save('52.1-tool-interface.svg', s);
}

// 3. Context cost: whole file vs first 100-line window (tokens ~ chars/4)
{
  const s = new Sketch(880, 430, { title: 'Bar chart: tokens for a whole-file view versus a 100-line window, six stdlib files', seed: 523 });
  s.text(440, 34, 'Context cost: whole file versus one 100-line window', { size: 24, weight: 700 });
  s.rect(230, 58, 18, 18, { color: C.blue, fill: C.blueSoft });
  s.text(300, 72, 'whole file', { size: 18, anchor: 'start' });
  s.rect(420, 58, 18, 18, { color: C.green, fill: C.greenSoft });
  s.text(490, 72, 'first 100 lines', { size: 18, anchor: 'start' });
  const data = [
    ['json/decoder', 3131, 780], ['json/encoder', 4019, 752], ['json/scanner', 608, 608],
    ['argparse', 25289, 898], ['dataclasses', 15521, 706], ['pathlib', 12763, 808],
  ];
  const base = 340, scale = 230 / 25289, x0 = 70, gw = 135;
  s.line(x0, base, x0 + 6 * gw, base, { color: C.ink });
  data.forEach(([name, whole, win], i) => {
    const gx = x0 + i * gw + 25;
    const hW = whole * scale, hV = win * scale;
    s.rect(gx, base - hW, 42, hW, { color: C.blue, fill: C.blueSoft });
    s.text(gx + 21, base - hW - 8, String(whole), { size: 15, font: 'mono' });
    s.rect(gx + 50, base - hV, 42, hV, { color: C.green, fill: C.greenSoft });
    s.text(gx + 71, base - hV - 8, String(win), { size: 15, font: 'mono' });
    s.text(gx + 46, base + 26, name, { size: 15, font: 'mono' });
  });
  s.note(560, 384, 290, 36, ['six files: 61,332 vs 4,554 (13.5x)'], { size: 17 });
  save('52.1-context-cost.svg', s);
}

// 4. Edit ambiguity: share of substantive lines that occur more than once in their file
{
  const s = new Sketch(880, 400, { title: 'Horizontal bars: share of substantive lines that are not unique within their file', seed: 524 });
  s.text(440, 34, 'Exact-replace risk: lines that occur more than once', { size: 24, weight: 700 });
  const rows = [
    ['json/decoder', 0.279], ['json/encoder', 0.270], ['json/scanner', 0.000],
    ['argparse', 0.221], ['dataclasses', 0.145], ['pathlib', 0.220], ['all six files', 0.206],
  ];
  const x0 = 240, maxW = 540, scale = maxW / 0.30;
  rows.forEach(([name, f], i) => {
    const y = 80 + i * 44;
    s.text(225, y + 17, name, { size: 16, font: 'mono', anchor: 'end' });
    const w = f * scale;
    if (w > 0) s.rect(x0, y, w, 26, { color: i === 6 ? C.rose : C.amber, fill: i === 6 ? C.roseSoft : C.amberSoft });
    s.text(x0 + w + 10, y + 19, f.toFixed(3), { size: 16, font: 'mono', anchor: 'start' });
  });
  s.text(440, 390, 'substantive = stripped length of 12 or more; 4,760 lines, 981 non-unique', { size: 16, color: C.muted });
  save('52.1-edit-ambiguity.svg', s);
}

// 5. Attempt budget
{
  const s = new Sketch(880, 380, { title: 'Bar chart: probability of at least one correct attempt for B = 1, 2, 4, 8 with p = 0.3', seed: 525 });
  s.text(440, 34, 'Attempt budget under an independence assumption', { size: 24, weight: 700 });
  const base = 310, H = 220;
  s.line(120, base, 760, base, { color: C.ink });
  [[0, '0'], [0.5, '0.5']].forEach(([v, lab]) => {
    const y = base - v * H;
    s.text(100, y + 6, lab, { size: 16, font: 'mono', anchor: 'end' });
    s.line(120, y, 760, y, { color: C.muted, dash: '4 8', width: 1 });
  });
  const data = [[1, 0.300], [2, 0.510], [4, 0.760], [8, 0.942]];
  data.forEach(([B, v], i) => {
    const cx = 200 + i * 160;
    s.rect(cx - 45, base - v * H, 90, v * H, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(cx, base - v * H - 10, v.toFixed(3), { size: 17, font: 'mono' });
    s.text(cx, base + 30, `B = ${B}`, { size: 18 });
  });
  s.text(440, 362, 'Assumes attempts are independent. Real attempts are correlated, so the true gain is smaller.', { size: 16, color: C.muted });
  save('52.1-attempt-budget.svg', s);
}
console.log('ok');
