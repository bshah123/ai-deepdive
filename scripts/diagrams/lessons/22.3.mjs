import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-22-traditional-nlp/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below is read from the JSON written by the experiment script.
const DATA = join(HERE, '22.3_data.json');
execFileSync(process.env.LESSON_PY || 'python3', [join(HERE, '22.3_experiment.py'), '--json', DATA], { stdio: 'ignore' });
const d = JSON.parse(readFileSync(DATA, 'utf8'));

// 1. Window co-occurrence counts
{
  const s = new Sketch(880, 360, { title: 'Grid of window co-occurrence counts for four words', seed: 221 });
  s.text(440, 36, 'Window counts: rows are words, columns are context words', { size: 24, weight: 700 });
  const { rows, cols, values } = d.cooc_grid;
  const cx = (j) => 300 + 90 * j;
  const ry = (i) => 150 + 55 * i;
  cols.forEach((c, j) => s.text(cx(j), 110, c, { font: 'mono', size: 17 }));
  rows.forEach((r, i) => {
    s.text(170, ry(i) + 6, r, { font: 'mono', size: 18, weight: 700 });
    values[i].forEach((v, j) => {
      if (v > 0) {
        s.rect(cx(j) - 40, ry(i) - 20, 80, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
        s.text(cx(j), ry(i) + 6, v.toFixed(1), { font: 'mono', size: 18, weight: 700 });
      } else {
        s.text(cx(j), ry(i) + 6, '0', { font: 'mono', size: 18, color: C.muted });
      }
    });
  });
  save('22.3-cooc-grid.svg', s);
}

// 2. GloVe weighting function
{
  const s = new Sketch(880, 340, { title: 'GloVe weighting function f(x) at six counts', seed: 222 });
  s.text(440, 36, 'GloVe weight f(x) = min((x / 100)^0.75, 1)', { size: 24, weight: 700 });
  const xs = [1, 5, 10, 50, 100, 500];
  const base = 290;
  const scale = 180;
  s.line(90, 110, 820, 110, { color: C.amber, dash: '6 8' });
  s.text(110, 100, 'cap: f = 1 for x >= 100', { size: 18, anchor: 'start', color: C.amber });
  xs.forEach((x, i) => {
    const cxp = 130 + 130 * i;
    const f = d.f_curve[String(x)];
    const h = f * scale;
    s.rect(cxp - 35, base - h, 70, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cxp, base - h - 12, f.toFixed(3), { font: 'mono', size: 17 });
    s.text(cxp, base + 30, `x=${x}`, { font: 'mono', size: 17 });
  });
  s.line(90, base, 820, base, { color: C.muted });
  save('22.3-weight-f.svg', s);
}

// 3. FastText units of an out-of-vocabulary word
{
  const units = d.oov_grams; // [unit, in_index]
  const nFound = units.filter((u) => u[1]).length;
  const nTotal = units.length;
  const s = new Sketch(880, 412, { title: 'Character n-gram units of an unseen word', seed: 223 });
  s.text(440, 36, `The ${nTotal} units of <walkers>: ${nFound} are in the training index`, { size: 24, weight: 700 });
  const groups = [[9, 'whole word'], [3, 'n = 3'], [4, 'n = 4'], [5, 'n = 5'], [6, 'n = 6']];
  const rowsY = [110, 168, 226, 284, 342];
  groups.forEach(([len, label], r) => {
    const y = rowsY[r];
    s.text(40, y - 26, label, { size: 17, anchor: 'start', color: C.muted });
    units.filter(([g]) => g.length === len).forEach(([g, found], k) => {
      const x = 40 + 112 * k;
      s.rect(x, y - 18, 104, 36, {
        color: found ? C.green : C.rose,
        fill: found ? C.greenSoft : C.roseSoft,
        fillStyle: 'solid',
      });
      s.text(x + 52, y + 6, g, { font: 'mono', size: 17 });
    });
  });
  s.rect(40, 380, 26, 18, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(76, 395, `in the index (${nFound})`, { size: 17, anchor: 'start' });
  s.rect(300, 380, 26, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(336, 395, `not in the index (${nTotal - nFound})`, { size: 17, anchor: 'start' });
  save('22.3-ngram-units.svg', s);
}

// 4. Cosine of the OOV vector to known words
{
  const s = new Sketch(880, 400, { title: 'Cosine of the out-of-vocabulary vector to known words', seed: 224 });
  s.text(440, 36, `Cosine of "${d.oov.word}" to known words (mean-centred)`, { size: 24, weight: 700 });
  const y0 = 220;
  const k = 150;
  const names = ['walker', 'walked', 'walks', 'car', 'king'];
  const xs = [150, 300, 450, 600, 750];
  s.line(90, y0, 820, y0, { color: C.muted });
  s.text(60, y0 - 10, '0', { font: 'mono', size: 17, color: C.muted });
  names.forEach((name, i) => {
    const cx = xs[i];
    const v = d.oov_cos_centred[name];
    const h = Math.abs(v) * k;
    const top = v >= 0 ? y0 - h : y0;
    const color = v >= 0 ? C.green : C.rose;
    const fill = v >= 0 ? C.greenSoft : C.roseSoft;
    s.rect(cx - 45, top, 90, Math.max(h, 2), { color, fill, fillStyle: 'solid' });
    if (v >= 0) s.text(cx, top - 10, v.toFixed(3), { font: 'mono', size: 17 });
    else s.text(cx, y0 + h + 22, v.toFixed(3), { font: 'mono', size: 17 });
    s.text(cx, 336, name, { font: 'mono', size: 18, weight: 700 });
    s.text(cx, 362, `${d.oov_shared[name]} shared`, { font: 'mono', size: 16, color: C.muted });
  });
  save('22.3-oov-cosine.svg', s);
}
