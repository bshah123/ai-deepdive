import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-08-agents/chapter-49-agent-memory/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '49.1_numbers.json'), 'utf8'));
const pct = (x) => `${Math.round(x * 100)}%`;
const k = (x) => `${(x / 1000).toFixed(1)}k`;

// 1. Toy sliding window: which messages are visible at each turn (budget 16 words)
{
  const toy = D.toy;
  const s = new Sketch(880, 400, { title: 'Table: for each turn, which of five messages fit a 16-word window', seed: 4901 });
  s.text(440, 34, 'Sliding window, 16-word budget', { size: 26, weight: 700 });
  const x0 = 160, cw = 112, ch = 46, y0 = 100;
  toy.message_lengths.forEach((n, i) => s.text(x0 + i * cw + cw / 2, 84, `msg ${i + 1} (${n} w)`, { font: 'mono', size: 15, color: C.muted }));
  s.text(x0 + 5 * cw + 50, 84, 'window', { font: 'mono', size: 15, color: C.muted });
  toy.rows.forEach((row, r) => {
    const y = y0 + r * ch;
    s.text(120, y + 28, `turn ${row.turn}`, { font: 'mono', size: 16, anchor: 'end' });
    toy.message_lengths.forEach((n, i) => {
      const msg = i + 1;
      if (msg > row.turn) return;
      const kept = row.kept_messages.includes(msg);
      const x = x0 + i * cw + 6;
      if (kept) {
        s.rect(x, y + 6, cw - 12, ch - 12, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
        s.text(x + (cw - 12) / 2, y + 30, `${n} w`, { font: 'mono', size: 16 });
      } else {
        s.text(x + (cw - 12) / 2, y + 30, 'dropped', { font: 'mono', size: 16, color: C.muted });
      }
    });
    s.text(x0 + 5 * cw + 50, y + 30, `${row.window_words} / 16`, { font: 'mono', size: 16, weight: 700 });
  });
  s.note(40, 345, 800, 40, ['green = in the window the model sees; dropped = older than the budget allows'], { size: 18 });
  save('49.1-toy-window.svg', s);
}

// 2. Rolling-summary memory layout and the fold loop
{
  const s = new Sketch(880, 380, { title: 'Memory layout: summary, recent raw messages, and the fold step', seed: 4902 });
  s.text(440, 34, 'Rolling summary memory', { size: 26, weight: 700 });
  s.rect(40, 90, 220, 110, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(150, 128, 'summary', { size: 22, weight: 700 });
  s.text(150, 160, ['at most 80 words', 'replaces old turns'], { size: 17, color: C.muted });
  s.rect(300, 90, 330, 110, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(465, 128, 'recent raw messages', { size: 22, weight: 700 });
  s.text(465, 160, ['at most 240 words, verbatim'], { size: 17, color: C.muted });
  s.rect(670, 90, 170, 110, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(755, 128, 'new turn', { size: 22, weight: 700 });
  s.text(755, 160, ['appended on the right'], { size: 17, color: C.muted });
  s.arrow(670, 145, 632, 145, { color: C.muted });
  s.rect(300, 262, 330, 80, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(465, 296, 'summariser (an LLM call)', { size: 20, weight: 700 });
  s.text(465, 324, 'rewrites oldest turns into the summary', { size: 17 });
  s.arrow(330, 200, 330, 258, { color: C.muted });
  s.text(340, 236, 'oldest message', { size: 17, anchor: 'start', color: C.muted });
  s.arrow(300, 302, 150, 204, { color: C.muted });
  s.text(190, 280, 'write back', { size: 17, anchor: 'start', color: C.muted });
  save('49.1-memory-layout.svg', s);
}

// 3. Context size per turn, one conversation (seed 49), three strategies
{
  const m = D.main_seed_49;
  const W = 880, H = 400;
  const s = new Sketch(W, H, { title: 'Line chart: prompt size per turn for three strategies', seed: 4903 });
  s.text(440, 34, 'Prompt size per turn (one conversation)', { size: 26, weight: 700 });
  const L = 120, R = 820, T = 70, B = 330, VMAX = 3200;
  const px = (t) => L + ((t - 1) / 79) * (R - L);
  const py = (v) => B - (v / VMAX) * (B - T);
  [0, 800, 1600, 2400, 3200].forEach((v) => {
    s.text(L - 12, py(v) + 6, `${v}`, { font: 'mono', size: 15, anchor: 'end', color: C.muted });
  });
  s.line(L, T, L, B, { color: C.muted });
  s.line(L, B, R, B, { color: C.muted });
  [1, 20, 40, 60, 80].forEach((t) => s.text(px(t), B + 28, `${t}`, { font: 'mono', size: 15, color: C.muted }));
  s.text((L + R) / 2, B + 56, 'turn', { size: 18 });
  const series = (arr, color) => {
    for (let i = 1; i < arr.length; i++) s.line(px(i), py(arr[i - 1]), px(i + 1), py(arr[i]), { color, width: 3 });
  };
  series(m.full_sizes, C.rose);
  series(m.sliding_sizes, C.blue);
  series(m.rolling_sizes, C.green);
  s.line(L, py(400), R, py(400), { color: C.amber, dash: '6 8', width: 2 });
  s.text(R, py(400) - 10, 'budget 400', { font: 'mono', size: 15, anchor: 'end', color: C.amber });
  const lg = [[C.rose, `full history (${k(m.full_sizes[79])} at turn 80)`], [C.blue, 'sliding window'], [C.green, 'rolling summary']];
  lg.forEach(([c, label], i) => {
    s.line(160, 96 + i * 26, 196, 96 + i * 26, { color: c, width: 3 });
    s.text(206, 102 + i * 26, label, { size: 17, anchor: 'start' });
  });
  save('49.1-context-per-turn.svg', s);
}

// 4. Cost versus recall, 60 conversations (means)
{
  const sw = D.sliding_window, sweep = D.rolling_sweep;
  const pts = [
    { label: 'sliding window (400)', x: sw.total_input_mean, y: sw.recall.mean, c: C.blue, f: C.blueSoft },
    { label: 'rolling, keep 0.5', x: sweep['0.5'].total_input_mean, y: sweep['0.5'].recall.mean, c: C.green, f: C.greenSoft },
    { label: 'rolling, keep 0.75', x: sweep['0.75'].total_input_mean, y: sweep['0.75'].recall.mean, c: C.green, f: C.greenSoft },
    { label: 'rolling, keep 0.9', x: sweep['0.9'].total_input_mean, y: sweep['0.9'].recall.mean, c: C.green, f: C.greenSoft },
  ];
  const s = new Sketch(880, 400, { title: 'Scatter: total input tokens against recall of planted facts', seed: 4904 });
  s.text(440, 34, 'Cost against recall (60 conversations)', { size: 26, weight: 700 });
  const L = 120, R = 800, T = 70, B = 330, XMAX = 50000, YMAX = 0.2;
  const px = (v) => L + (v / XMAX) * (R - L);
  const py = (v) => B - (v / YMAX) * (B - T);
  [0, 0.05, 0.1, 0.15, 0.2].forEach((v) => s.text(L - 12, py(v) + 6, pct(v), { font: 'mono', size: 15, anchor: 'end', color: C.muted }));
  [0, 10000, 20000, 30000, 40000, 50000].forEach((v) => s.text(px(v), B + 28, k(v), { font: 'mono', size: 15, color: C.muted }));
  s.line(L, T, L, B, { color: C.muted });
  s.line(L, B, R, B, { color: C.muted });
  s.text((L + R) / 2, B + 60, 'total prompt tokens over 80 turns', { size: 18 });
  s.text(60, (T + B) / 2, 'recall', { size: 18, rotate: -90 });
  pts.forEach((p) => {
    s.circle(px(p.x), py(p.y), 16, { color: p.c, fill: p.f, fillStyle: 'solid' });
  });
  s.text(px(pts[0].x) + 18, py(pts[0].y) - 12, pts[0].label, { size: 17, anchor: 'start' });
  s.text(px(pts[1].x) - 18, py(pts[1].y) + 36, pts[1].label, { size: 17, anchor: 'end' });
  s.text(px(pts[2].x) + 18, py(pts[2].y) + 34, pts[2].label, { size: 17, anchor: 'start' });
  s.text(px(pts[3].x) + 18, py(pts[3].y) + 6, pts[3].label, { size: 17, anchor: 'start' });
  s.note(150, 84, 340, 80, ['Full history is off this chart:', `${k(D.full_history.total_input_mean)} tokens, and over budget by turn ${D.full_history.overflow_turns.mean.toFixed(1)}`], { size: 17 });
  save('49.1-cost-recall.svg', s);
}

// 5. Survival of a fact under repeated lead-keep summarisation
{
  const a = D.survival_keep_0_5, b = D.survival_keep_0_75;
  const s = new Sketch(880, 400, { title: 'Line chart: fraction of a fact surviving k summarisation rounds', seed: 4905 });
  s.text(440, 34, 'Survival of a fact after k rounds', { size: 26, weight: 700 });
  const L = 120, R = 800, T = 70, B = 330;
  const px = (r) => L + (r / 6) * (R - L);
  const py = (v) => B - v * (B - T);
  [0, 0.25, 0.5, 0.75, 1].forEach((v) => s.text(L - 12, py(v) + 6, v.toFixed(2), { font: 'mono', size: 15, anchor: 'end', color: C.muted }));
  [0, 1, 2, 3, 4, 5, 6].forEach((r) => s.text(px(r), B + 28, `${r}`, { font: 'mono', size: 15, color: C.muted }));
  s.line(L, T, L, B, { color: C.muted });
  s.line(L, B, R, B, { color: C.muted });
  s.text((L + R) / 2, B + 60, 'summarisation rounds k', { size: 18 });
  s.text(60, (T + B) / 2, 'survival', { size: 18, rotate: -90 });
  const draw = (rows, color, fill) => {
    for (let i = 1; i < rows.length; i++) {
      s.line(px(rows[i - 1].rounds), py(rows[i - 1].analytic_keep_pow_k), px(rows[i].rounds), py(rows[i].analytic_keep_pow_k), { color, dash: '6 8', width: 2 });
    }
    rows.forEach((r) => s.circle(px(r.rounds), py(r.measured), 13, { color, fill, fillStyle: 'solid' }));
  };
  draw(a, C.blue, C.blueSoft);
  draw(b, C.amber, C.amberSoft);
  s.note(560, 84, 270, 96, ['dots: measured (exact count)', 'dashed: keep^k', 'keep 0.5 blue, keep 0.75 amber'], { size: 17 });
  save('49.1-survival.svg', s);
}
console.log('wrote 49.1 diagrams');
