import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-02-scientific-python/chapter-15-numpy-internals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// one boxed value, centred; o = { color, fill, fillStyle, dash, textColor }
const cell = (s, x, y, w, h, val, o = {}) => {
  s.rect(x, y, w, h, { color: o.color ?? C.ink, fill: o.fill, fillStyle: o.fillStyle, dash: o.dash });
  s.text(x + w / 2, y + h / 2 + 7, val, { font: 'mono', size: 20, color: o.textColor ?? C.ink });
};
const solidBlue = { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' };
const solidGreen = { color: C.green, fill: C.greenSoft, fillStyle: 'solid' };
const solidAmber = { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' };
const solidRose = { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' };
const ghost = { color: C.muted, textColor: C.muted, dash: '6 8' };

// 1. Rule: shapes are lined up from the right
{
  const s = new Sketch(880, 340, { title: 'Shapes lined up from the right: a (2, 3) and b (3,) give (2, 3)', seed: 1521 });
  s.text(440, 40, 'Line the shapes up from the right', { size: 26, weight: 700 });
  s.text(450, 78, 'dim 0', { font: 'mono', size: 16, color: C.muted });
  s.text(570, 78, 'dim 1', { font: 'mono', size: 16, color: C.muted });
  s.text(60, 128, 'a  (2, 3)', { font: 'mono', size: 18, anchor: 'start' });
  cell(s, 400, 100, 100, 44, '2', solidBlue);
  cell(s, 520, 100, 100, 44, '3', solidBlue);
  s.text(60, 208, 'b  (3,)', { font: 'mono', size: 18, anchor: 'start' });
  cell(s, 400, 180, 100, 44, '(1)', ghost);
  cell(s, 520, 180, 100, 44, '3', solidGreen);
  s.text(660, 128, 'dim 1: 3 = 3, equal', { size: 18, anchor: 'start' });
  s.text(660, 208, 'b has no dim 0, so it acts as 1', { size: 18, anchor: 'start' });
  s.arrow(450, 226, 450, 256, { color: C.amber });
  s.arrow(570, 226, 570, 256, { color: C.muted });
  s.text(60, 290, 'result  (2, 3)', { font: 'mono', size: 18, anchor: 'start' });
  cell(s, 400, 260, 100, 44, '2', solidAmber);
  cell(s, 520, 260, 100, 44, '3', solidAmber);
  s.text(440, 326, 'Rule: compare from the right. Each pair must be equal, or one of them must be 1.', { size: 17 });
  save('15.2-rules.svg', s);
}

// 2. Worked example: a + b, row b reused for both rows of a
{
  const s = new Sketch(880, 340, { title: 'a plus b: element (i, j) is a[i, j] + b[j]', seed: 1522 });
  s.text(440, 40, 'Row b is reused for both rows of a', { size: 26, weight: 700 });
  const row = (x, y, vals, o) => vals.forEach((v, j) => cell(s, x + 62 * j, y, 58, 50, String(v), o));
  row(60, 100, [1, 2, 3], solidBlue);
  row(60, 160, [4, 5, 6], solidBlue);
  s.text(290, 172, '+', { size: 34, weight: 700 });
  row(330, 100, [10, 20, 30], solidGreen);
  row(330, 160, [10, 20, 30], ghost);
  s.text(556, 172, '=', { size: 34, weight: 700 });
  row(600, 100, [11, 22, 33], solidAmber);
  row(600, 160, [14, 25, 36], solidAmber);
  s.text(151, 236, 'a: shape (2, 3)', { font: 'mono', size: 18 });
  s.text(421, 236, 'b: shape (3,)', { font: 'mono', size: 18 });
  s.text(691, 236, 'result: shape (2, 3)', { font: 'mono', size: 18 });
  s.text(440, 282, 'Dashed row: the same values seen again for row 1. NumPy does not copy them.', { size: 18, color: C.muted });
  s.text(440, 318, 'Each result entry is a[i, j] + b[j]: the column index j picks one entry of b.', { size: 18 });
  save('15.2-worked-add.svg', s);
}

// 3. Outer sum: (3, 1) column and (1, 4) row make a (3, 4) table
{
  const s = new Sketch(880, 400, { title: 'Outer sum of a (3, 1) and b (1, 4) gives a (3, 4) table', seed: 1523 });
  s.text(440, 40, 'A column plus a row makes a 3 by 4 table', { size: 26, weight: 700 });
  s.text(372, 122, 'b  (1, 4)', { font: 'mono', size: 18, anchor: 'end' });
  [10, 20, 30, 40].forEach((v, j) => cell(s, 390 + 64 * j, 96, 60, 44, String(v), solidGreen));
  s.text(300, 150, 'a  (3, 1)', { font: 'mono', size: 18 });
  [1, 2, 3].forEach((v, i) => cell(s, 270, 160 + 58 * i, 60, 52, String(v), solidBlue));
  [1, 2, 3].forEach((av, i) =>
    [10, 20, 30, 40].forEach((bv, j) => {
      const hit = i === 2 && j === 1;
      cell(s, 390 + 64 * j, 160 + 58 * i, 60, 52, String(av + bv), hit ? solidRose : solidAmber);
    }));
  s.text(660, 232, 'entry (i, j) = a[i] + b[j]', { size: 20, anchor: 'start' });
  s.text(660, 280, 'highlighted: 3 + 20 = 23', { size: 18, anchor: 'start', color: C.rose });
  s.text(440, 366, 'Shapes (3, 1) and (1, 4) meet in a (3, 4) result: 12 entries.', { size: 18 });
  save('15.2-outer.svg', s);
}

// 4. Silent bug: (4,) - (4, 1) gives a (4, 4) table of 16 errors
{
  const s = new Sketch(880, 400, { title: 'Same numbers, two shapes: mean squared error 0.25 versus 2.25', seed: 1524 });
  s.text(440, 40, 'Same numbers, two shapes, two answers', { size: 26, weight: 700 });
  s.line(440, 80, 440, 350, { color: C.muted, dash: '6 8' });
  // left: intended
  s.text(210, 92, 'intended: y (4,) - y_hat (4,)', { size: 19, weight: 700 });
  [0, 1, 2, 3].forEach((k) => cell(s, 59 + 78 * k, 120, 68, 50, '0.25', solidGreen));
  s.text(210, 204, '4 squared errors', { size: 18 });
  s.text(210, 244, 'mean = 1.00 / 4 = 0.25', { size: 20, weight: 700 });
  // right: bug
  s.text(640, 92, 'bug: y (4,) - y_hat (4, 1)', { size: 19, weight: 700 });
  const sq = [
    [0.25, 0.25, 2.25, 6.25],
    [0.25, 0.25, 2.25, 6.25],
    [6.25, 2.25, 0.25, 0.25],
    [6.25, 2.25, 0.25, 0.25],
  ];
  sq.forEach((r, i) => r.forEach((v, j) => cell(s, 500 + 64 * j, 110 + 46 * i, 60, 40, v.toFixed(2), solidRose)));
  s.text(640, 318, 'sum = 36.00, over 16 entries: 2.25', { size: 19, weight: 700 });
  s.text(440, 372, 'No error is raised: (4,) becomes (4, 4) and every pair is compared.', { size: 18 });
  save('15.2-silent-bug.svg', s);
}

// 5. Stride 0: one row of bytes serves every row of the view
{
  const s = new Sketch(880, 420, { title: 'A broadcast view reuses the same 24 bytes for every row', seed: 1525 });
  s.text(40, 80, 'b in memory: 24 bytes', { size: 20, weight: 700, anchor: 'start' });
  [['1.0'], ['2.0'], ['3.0']].forEach(([v], k) => cell(s, 40 + 96 * k, 94, 96, 48, v, solidGreen));
  s.text(40, 166, 'strides (8,): the next value is 8 bytes along', { size: 17, anchor: 'start' });
  s.text(40, 206, 'np.broadcast_to(b, (1000, 3))', { size: 20, weight: 700, anchor: 'start' });
  const viewRow = (y, label) => {
    s.text(40, y + 26, label, { font: 'mono', size: 16, anchor: 'start' });
    ['1.0', '2.0', '3.0'].forEach((v, k) => cell(s, 136 + 96 * k, y, 96, 40, v, solidBlue));
  };
  viewRow(222, 'row 0');
  viewRow(274, 'row 1');
  s.text(184, 340, '...', { size: 22 });
  viewRow(354, 'row 999');
  s.curveArrow(436, 242, 520, 170, 332, 118, { color: C.amber });
  s.text(540, 240, 'reading the view', { size: 20, weight: 700, anchor: 'start' });
  s.text(540, 272, 'shape (1000, 3)', { font: 'mono', size: 18, anchor: 'start' });
  s.text(540, 302, 'strides (0, 8): a row step is 0 bytes', { size: 17, anchor: 'start' });
  s.text(540, 332, 'nbytes reports 24000, the view size,', { size: 17, anchor: 'start' });
  s.text(540, 360, 'but it refers to the same 24 bytes.', { size: 17, anchor: 'start' });
  save('15.2-stride-view.svg', s);
}
