import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-07-frameworks/chapter-48-agent-architectures/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below comes from 48.3_experiment.py (run it to regenerate 48.3_data.json).
const D = JSON.parse(readFileSync(join(HERE, '48.3_data.json'), 'utf8'));
const bar = (s, x, v, base, H, color, soft) => {
  const h = v * H;
  s.rect(x - 24, base - h, 48, h, { color, fill: soft, fillStyle: 'solid' });
  s.text(x, base - h - 12, v.toFixed(3), { size: 15, font: 'mono' });
};

// 1. The loop: generator, evaluator, memory, output.
{
  const s = new Sketch(880, 370, { title: 'Evaluator-optimizer loop with a reflection memory', seed: 201 });
  s.text(440, 34, 'The loop: attempt, judge, reflect, retry', { size: 24, weight: 700 });
  s.rect(40, 120, 180, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(130, 156, 'generator', { size: 19 });
  s.rect(290, 120, 180, 60, { color: C.violet, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(380, 156, 'judge', { size: 19 });
  s.rect(540, 120, 140, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(610, 156, 'accept?', { size: 19 });
  s.rect(725, 120, 120, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(785, 156, 'output', { size: 19 });
  s.arrow(220, 150, 290, 150, { color: C.muted });
  s.arrow(470, 150, 540, 150, { color: C.muted });
  s.arrow(680, 150, 725, 150, { color: C.muted });
  s.text(702, 140, 'yes', { size: 16 });
  s.arrow(610, 180, 610, 235, { color: C.muted });
  s.text(628, 212, 'no', { size: 16, anchor: 'start' });
  s.rect(540, 235, 180, 60, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(630, 271, 'reflection note', { size: 19 });
  s.arrow(540, 265, 470, 265, { color: C.muted });
  s.rect(290, 235, 180, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(380, 271, 'memory', { size: 19 });
  s.line(290, 265, 130, 265, { color: C.muted });
  s.arrow(130, 265, 130, 182, { color: C.muted });
  s.text(130, 316, 'note read by the next attempt', { size: 16, anchor: 'start' });
  s.text(440, 352, 'stop at the first accepted answer, or after K attempts', { size: 18, color: C.muted });
  save('48.3-loop.svg', s);
}

// 2. One hundred attempts, split by correctness and by the judge's verdict.
{
  const w = D.worked;
  const nCorrect = Math.round(100 * 0.4), nWrong = 100 - nCorrect;
  const nAccCorrect = Math.round(nCorrect * 0.9), nRejCorrect = nCorrect - nAccCorrect;
  const nAccWrong = Math.round(nWrong * 0.2), nRejWrong = nWrong - nAccWrong;
  const s = new Sketch(880, 400, { title: 'One hundred attempts, sorted by truth and by the judge', seed: 202 });
  s.text(440, 34, 'One hundred attempts, sorted by truth and by the judge', { size: 24, weight: 700 });
  const cell = 26, gap = 4, x0 = 60, y0 = 80;
  const kinds = [
    [nAccCorrect, C.green, C.greenSoft, 'solid'],
    [nRejCorrect, C.green, C.greenSoft, 'hachure'],
    [nAccWrong, C.rose, C.roseSoft, 'solid'],
    [nRejWrong, C.muted, C.blueSoft, 'solid'],
  ];
  let idx = 0;
  for (const [count, color, soft, style] of kinds) {
    for (let k = 0; k < count; k++, idx++) {
      const r = Math.floor(idx / 10), c = idx % 10;
      s.rect(x0 + c * (cell + gap), y0 + r * (cell + gap), cell, cell, { color, fill: soft, fillStyle: style });
    }
  }
  const lx = 430;
  s.text(lx, 96, `${nCorrect} correct attempts: 0.4 of all`, { size: 19, anchor: 'start' });
  s.text(lx, 130, `${nAccCorrect} accepted: 0.4 x t = ${w.p_t.toFixed(2)}`, { size: 19, anchor: 'start', color: C.green });
  s.text(lx, 164, `${nRejCorrect} rejected by mistake`, { size: 19, anchor: 'start', color: C.muted });
  s.text(lx, 216, `${nWrong} wrong attempts: 0.6 of all`, { size: 19, anchor: 'start' });
  s.text(lx, 250, `${nAccWrong} accepted: 0.6 x f = ${w.one_minus_p_f.toFixed(2)}`, { size: 19, anchor: 'start', color: C.rose });
  s.text(lx, 284, `${nRejWrong} rejected, retry`, { size: 19, anchor: 'start', color: C.muted });
  s.text(lx, 336, `precision of accepted answers = ${w.p_t.toFixed(2)} / ${w.a.toFixed(2)} = ${w.precision.toFixed(2)}`, { size: 19, anchor: 'start', weight: 700 });
  save('48.3-hundred-attempts.svg', s);
}

// 3. More attempts with a leaky judge (f = 0.2): accuracy rises, accepted errors rise too.
{
  const rows = D.grid['0.2'];
  const s = new Sketch(880, 400, { title: 'Accuracy and accepted errors versus attempts K, judge f = 0.2', seed: 203 });
  s.text(440, 34, 'More attempts, leaky judge (f = 0.2)', { size: 24, weight: 700 });
  s.rect(560, 62, 22, 16, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(590, 76, 'output correct', { size: 17, anchor: 'start' });
  s.rect(730, 62, 22, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(760, 76, 'accepted, wrong', { size: 17, anchor: 'start' });
  const base = 270, H = 190;
  s.line(70, base, 840, base, { color: C.muted });
  rows.forEach((x, i) => {
    const cx = 130 + i * 160;
    bar(s, cx - 28, x.an_c, base, H, C.green, C.greenSoft);
    bar(s, cx + 28, x.an_w, base, H, C.rose, C.roseSoft);
    s.text(cx, base + 30, `K = ${x.K}`, { size: 18 });
  });
  s.note(100, 344, 680, 40, [`output accuracy cannot exceed precision ${D.worked.precision.toFixed(2)} for f = 0.2`], { size: 17 });
  save('48.3-retry-sweep.svg', s);
}

// 4. Reflection memory versus plain retry, K = 3 (assumed p1 = 0.7).
{
  const s = new Sketch(880, 400, { title: 'Reflection memory at K = 3 under assumed p1 = 0.7', seed: 204 });
  s.text(440, 34, 'Reflection memory at K = 3 (assumed p1 = 0.7)', { size: 24, weight: 700 });
  s.rect(560, 62, 22, 16, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(590, 76, 'output correct', { size: 17, anchor: 'start' });
  s.rect(730, 62, 22, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(760, 76, 'accepted, wrong', { size: 17, anchor: 'start' });
  const base = 270, H = 190;
  s.line(70, base, 840, base, { color: C.muted });
  const labels = ['no memory (r = 0)', 'useful half the time (r = 0.5)', 'always useful (r = 1)'];
  D.reflexion.forEach((x, i) => {
    const cx = 170 + i * 270;
    bar(s, cx - 28, x.out_correct, base, H, C.green, C.greenSoft);
    bar(s, cx + 28, x.accepted_wrong, base, H, C.rose, C.roseSoft);
    s.text(cx, base + 30, labels[i], { size: 17 });
  });
  s.note(100, 344, 680, 40, ['r = probability a reflection note helps; p1 = assumed success after a useful note'], { size: 17 });
  save('48.3-reflexion.svg', s);
}
