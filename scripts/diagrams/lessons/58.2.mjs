import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-58-synthetic-data-distillation/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers come from scripts/diagrams/lessons/58.2_experiment.py (run once, saved to 58.2_data.json).
const D = JSON.parse(readFileSync(join(HERE, '58.2_data.json'), 'utf8'));
const f = (v, d) => v.toFixed(d);

// 1. Two regimes: white box versus black box
{
  const s = new Sketch(880, 360, { title: 'White-box versus black-box distillation', seed: 5801 });
  s.text(440, 34, 'Two ways to learn from a teacher', { size: 26, weight: 700 });
  s.rect(30, 60, 410, 270, { color: C.muted });
  s.rect(460, 60, 410, 270, { color: C.muted });
  s.text(235, 96, 'White box: logits visible', { size: 21, weight: 700 });
  s.text(665, 96, 'Black box: text only', { size: 21, weight: 700 });

  s.rect(60, 120, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(135, 151, 'teacher', { font: 'mono', size: 16 });
  s.arrow(212, 145, 262, 145, { color: C.muted });
  s.rect(262, 120, 176, 50, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(350, 151, 'all probabilities', { font: 'mono', size: 14 });
  s.arrow(350, 172, 350, 212, { color: C.muted });
  s.rect(250, 215, 200, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(350, 246, 'student', { font: 'mono', size: 16 });
  s.text(245, 296, ['Loss compares the whole distribution:', 'every class counts, not just the top one'], { size: 17 });

  s.rect(490, 120, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(565, 151, 'teacher', { font: 'mono', size: 16 });
  s.arrow(642, 145, 672, 145, { color: C.muted });
  s.rect(675, 120, 150, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(750, 151, 'one sample', { font: 'mono', size: 15 });
  s.arrow(750, 172, 750, 212, { color: C.muted });
  s.rect(670, 215, 160, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(750, 246, 'student', { font: 'mono', size: 16 });
  s.text(665, 296, ['Target is one-hot text: the other', 'probabilities are never seen'], { size: 17 });
  save('58.2-two-regimes.svg', s);
}

// 2. Temperature: bars for the worked example
{
  const s = new Sketch(880, 400, { title: 'Softmax with temperature', seed: 5802 });
  s.text(440, 34, 'Dividing the logits by T flattens the distribution', { size: 24, weight: 700 });
  s.text(440, 66, 'logits z = [2.0, 1.0, 0.1] for classes A, B, C', { size: 18, color: C.muted });
  const cols = [C.blue, C.amber, C.green], soft = [C.blueSoft, C.amberSoft, C.greenSoft];
  const base = 330, scale = 240;
  s.line(90, base, 800, base, { color: C.muted });
  ['1', '2', '4'].forEach((T, g) => {
    const cx = 185 + g * 255;
    const p = D.worked[`${T}.0`];
    p.forEach((v, i) => {
      const x = cx - 75 + i * 75, h = v * scale;
      s.rect(x - 28, base - h, 56, h, { color: cols[i], fill: soft[i], fillStyle: 'solid' });
      s.text(x, base - h - 10, f(v, 3), { font: 'mono', size: 15 });
      s.text(x, base + 22, 'ABC'[i], { size: 19, weight: 700 });
    });
    s.text(cx, base + 60, `T = ${T}`, { size: 22, weight: 700 });
  });
  save('58.2-temperature.svg', s);
}

// 3. Loss pipeline
{
  const s = new Sketch(880, 420, { title: 'Distillation loss pipeline', seed: 5803 });
  s.text(440, 34, 'Loss = alpha · T² · KL(soft) + (1 − alpha) · CE(hard)', { size: 24, weight: 700 });
  s.rect(40, 90, 180, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(130, 118, 'teacher (frozen)', { font: 'mono', size: 15 });
  s.arrow(220, 112, 260, 112, { color: C.muted });
  s.rect(262, 90, 80, 44, { color: C.muted });
  s.text(302, 118, 'z_t', { font: 'mono', size: 16 });
  s.arrow(342, 112, 382, 112, { color: C.muted });
  s.rect(384, 90, 190, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(479, 118, 'softmax(z_t / T)', { font: 'mono', size: 15 });

  s.rect(40, 230, 180, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(130, 258, 'student', { font: 'mono', size: 16 });
  s.arrow(220, 252, 260, 252, { color: C.muted });
  s.rect(262, 230, 80, 44, { color: C.muted });
  s.text(302, 258, 'z_s', { font: 'mono', size: 16 });
  s.arrow(342, 252, 382, 252, { color: C.muted });
  s.rect(384, 230, 190, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(479, 258, 'softmax(z_s / T)', { font: 'mono', size: 15 });

  s.arrow(574, 112, 610, 170, { color: C.muted });
  s.arrow(574, 252, 610, 214, { color: C.muted });
  s.rect(612, 168, 230, 48, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(727, 198, 'KL(p_t^T ‖ p_s^T)', { font: 'mono', size: 15 });

  s.arrow(302, 276, 302, 352, { color: C.muted });
  s.arrow(302, 352, 382, 352, { color: C.muted });
  s.rect(384, 330, 190, 44, { color: C.violet });
  s.text(479, 358, 'CE(z_s, y)  at T = 1', { font: 'mono', size: 15 });

  s.arrow(727, 218, 727, 300, { color: C.muted });
  s.rect(612, 300, 230, 48, { color: C.ink });
  s.text(727, 330, 'total loss', { size: 20, weight: 700 });
  s.arrow(576, 352, 612, 340, { color: C.muted });
  s.note(40, 300, 230, 56, ['weight: alpha on KL,', '(1 − alpha) on the labels'], { size: 17 });
  s.text(440, 396, 'the T² factor keeps the soft term’s gradient size fixed (next section)', { size: 16, color: C.muted });
  save('58.2-loss-pipeline.svg', s);
}

// 4. Gradient size against T
{
  const s = new Sketch(880, 400, { title: 'Gradient size against T', seed: 5804 });
  s.text(440, 34, 'Gradient of the soft term, relative to T = 1', { size: 24, weight: 700 });
  s.rect(120, 66, 22, 22, { color: C.muted, fill: C.muted, fillStyle: 'solid' });
  s.text(152, 84, 'no T² factor', { size: 18, anchor: 'start' });
  s.rect(320, 66, 22, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(352, 84, 'with T² factor', { size: 18, anchor: 'start' });
  const base = 320, scale = 150;
  s.line(100, base, 820, base, { color: C.muted });
  const Ts = ['1', '2', '4', '8', '16', '32'];
  Ts.forEach((T, i) => {
    const cx = 150 + i * 125;
    const [raw, t2] = D.scaling[`${T}.0`];
    const lab = (v) => (v < 0.1 ? f(v, 3) : f(v, 2));
    const hr = raw * scale, ht = t2 * scale;
    s.rect(cx - 50, base - hr, 40, Math.max(hr, 1), { color: C.muted, fill: C.muted, fillStyle: 'solid' });
    s.text(cx - 30, base - hr - 10, lab(raw), { font: 'mono', size: 14 });
    s.rect(cx + 10, base - ht, 40, ht, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx + 30, base - ht - 10, f(t2, 2), { font: 'mono', size: 14 });
    s.text(cx, base + 30, `T = ${T}`, { size: 20, weight: 700 });
  });
  s.text(440, 384, 'Random logits, batch of 200. Without T², the raw gradient falls like 1/T²; with T², it levels off near 1.25.', { size: 16, color: C.muted });
  save('58.2-grad-scaling.svg', s);
}

// 5. Results: dot plot with standard deviation whiskers
{
  const s = new Sketch(880, 420, { title: 'Student accuracy by method and data size', seed: 5805 });
  s.text(440, 34, 'Student test accuracy, from scratch and with distillation', { size: 24, weight: 700 });
  const y = (a) => 360 - ((a - 0.5) / 0.35) * 260;
  s.line(110, y(0.5), 110, y(0.85), { color: C.muted });
  s.line(110, y(0.5), 820, y(0.5), { color: C.muted });
  [0.5, 0.6, 0.7, 0.8].forEach((a) => {
    s.line(110, y(a), 820, y(a), { color: C.muted, dash: '4 8', width: 1 });
    s.text(96, y(a) + 6, f(a, 1), { font: 'mono', size: 15, anchor: 'end' });
  });
  s.text(60, 230, 'accuracy', { size: 18, rotate: -90 });
  const cfg = [['hard', C.muted, 'hard labels only', -80], ['kd_T2', C.blue, 'KD, T = 2', 0], ['kd_T4', C.green, 'KD, T = 4', 80]];
  const groups = [['30', 215], ['100', 470], ['300', 725]];
  groups.forEach(([N, gx]) => {
    cfg.forEach(([key, col, , dx]) => {
      const [m, sd] = D.grid[N][key].acc;
      const x = gx + dx;
      s.line(x, y(m - sd), x, y(m + sd), { color: col, width: 2 });
      s.circle(x, y(m), 16, { color: col, fill: col, fillStyle: 'solid' });
      s.text(x + 12, y(m) - 12, f(m, 3), { font: 'mono', size: 15, anchor: 'start' });
    });
    s.text(gx, 392, `N = ${N} examples`, { size: 20, weight: 700 });
  });
  cfg.forEach(([, col, label], i) => {
    s.circle(160 + i * 220, 96, 16, { color: col, fill: col, fillStyle: 'solid' });
    s.text(184 + i * 220, 102, label, { size: 18, anchor: 'start' });
  });
  s.text(440, 60, 'Points: mean over 5 seeds; whiskers: ± 1 std. The axis starts at 0.50.', { size: 17, color: C.muted });
  save('58.2-results.svg', s);
}
console.log('wrote 58.2 diagrams');
