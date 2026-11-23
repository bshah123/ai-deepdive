// Diagrams for 19.3 (bias-variance, overfitting, ridge and lasso).
// Run: node scripts/diagrams/lessons/19.3.mjs
// Every number comes from scripts/diagrams/lessons/19.3_data.json (written by 19.3_experiment.py).
// Panel D is an illustration of geometry, not measured data; it is labelled as such.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-03-ml-nlp/chapter-19-ml-foundations/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '19.3_data.json'), 'utf8'));

const f3 = (v) => v.toFixed(3);
// polyline through [x, y] points, as raw SVG
const poly = (pts, color, width = 3, dash = '') =>
  `<path d="M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const dot = (x, y, r, color) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}"/>`;

// ---------------------------------------------------------------- 19.3-fits.svg
{
  const s = new Sketch(880, 400, { title: 'Eight fitted curves from eight training sets for polynomial degrees 1, 5 and 15, against the true sine curve', seed: 1931 });
  s.text(440, 34, 'Same recipe, eight training sets: the fits move with the data', { size: 24, weight: 700 });
  const xs = data.fits.x;
  const all = [...Object.values(data.fits.degrees).flat(2), ...xs.map((x) => Math.sin(2 * Math.PI * x))];
  const ymax = Math.ceil(Math.max(...all.map(Math.abs)) * 2) / 2;
  const panels = [
    { d: '1', x0: 40, col: C.blue, label: 'degree 1: underfit' },
    { d: '5', x0: 320, col: C.amber, label: 'degree 5: balanced' },
    { d: '15', x0: 600, col: C.rose, label: 'degree 15: overfit' },
  ];
  const PW = 240, top = 110, ph = 190;
  for (const p of panels) {
    const X = (x) => p.x0 + x * PW;
    const Y = (y) => top + ph / 2 - (y / ymax) * (ph / 2);
    s.raw(`<rect x="${p.x0}" y="${top}" width="${PW}" height="${ph}" fill="none" stroke="${C.muted}" stroke-width="1.5"/>`);
    s.raw(poly([[p.x0, Y(0)], [p.x0 + PW, Y(0)]], C.muted, 1));
    s.raw(poly(xs.map((x, i) => [X(x), Y(Math.sin(2 * Math.PI * x))]), C.ink, 2.5, '7 6'));
    for (const curve of data.fits.degrees[p.d]) {
      s.raw(poly(xs.map((x, i) => [X(x), Y(curve[i])]), p.col, 2.2));
    }
    s.text(p.x0 + PW / 2, top - 14, p.label, { size: 20, weight: 700 });
    const e = data.degrees[p.d].expected;
    s.text(p.x0 + PW / 2, top + ph + 30, `expected error ${f3(e)}`, { font: 'mono', size: 16 });
  }
  s.text(440, 375, 'dashed black: the true curve sin(2 pi x); coloured: 8 fits, each from 100 random points with label noise 0.3', { size: 17, color: C.muted });
  save('19.3-fits.svg', s);
}

// ---------------------------------------------------------------- 19.3-error-vs-degree.svg
{
  const s = new Sketch(880, 440, { title: 'Expected squared error against polynomial degree on a log scale: total error has its minimum at degree 5, variance grows steadily', seed: 1932 });
  s.text(440, 34, 'Error against model complexity (no penalty)', { size: 24, weight: 700 });
  const X = (d) => 120 + ((d - 1) / 14) * 680;
  const Y = (v) => 360 - ((Math.log10(v) + 3) / 4) * 280;   // log scale, 0.001 .. 10
  for (const v of [0.001, 0.01, 0.1, 1, 10]) {
    s.raw(poly([[120, Y(v)], [800, Y(v)]], C.muted, 1, '3 7'));
    s.text(105, Y(v) + 6, String(v), { anchor: 'end', font: 'mono', size: 16 });
  }
  for (let d = 1; d <= 15; d += 2) s.text(X(d), 388, String(d), { font: 'mono', size: 16 });
  s.text(460, 420, 'polynomial degree', { size: 20 });
  s.text(40, 210, 'expected squared error (log)', { size: 18, rotate: -90 });
  const deg = Array.from({ length: 15 }, (_, i) => String(i + 1));
  const series = (key) => deg.map((d) => [X(Number(d)), Y(data.degrees[d][key])]);
  s.raw(poly([[X(1), Y(data.sigma ** 2)], [X(15), Y(data.sigma ** 2)]], C.green, 2.5, '10 8'));
  s.raw(poly(series('variance'), C.amber, 3));
  s.raw(poly(series('expected'), C.ink, 4));
  for (const [x, y] of series('expected')) s.raw(dot(x, y, 4, C.ink));
  s.raw(poly([[X(5), 70], [X(5), 360]], C.muted, 1.5, '6 6'));
  s.text(X(5) + 8, 250, 'minimum at degree 5', { size: 17, anchor: 'start' });
  // legend
  s.raw(poly([[130, 80], [170, 80]], C.ink, 4)); s.text(180, 86, 'total error', { size: 17, anchor: 'start' });
  s.raw(poly([[130, 110], [170, 110]], C.amber, 3)); s.text(180, 116, 'variance', { size: 17, anchor: 'start' });
  s.raw(poly([[130, 140], [170, 140]], C.green, 2.5, '10 8')); s.text(180, 146, 'noise sigma^2 = 0.09', { size: 17, anchor: 'start' });
    save('19.3-error-vs-degree.svg', s);
}

// ---------------------------------------------------------------- 19.3-ridge-lambda.svg
{
  const s = new Sketch(880, 400, { title: 'Expected error against ridge strength at polynomial degree 12: a U shape in log lambda, with the minimum at lambda equal to 1', seed: 1933 });
  s.text(440, 34, 'Ridge strength at degree 12', { size: 24, weight: 700 });
  const keys = Object.keys(data.ridge).filter((k) => Number(k) > 0).sort((a, b) => Number(a) - Number(b));
  const X = (lam) => 120 + ((Math.log10(lam) + 6) / 8) * 680;
  const Y = (v) => 330 - (v / 0.6) * 260;
  for (const v of [0, 0.2, 0.4, 0.6]) {
    s.raw(poly([[120, Y(v)], [800, Y(v)]], C.muted, 1, '3 7'));
    s.text(105, Y(v) + 6, v.toFixed(1), { anchor: 'end', font: 'mono', size: 16 });
  }
  for (let e = -6; e <= 2; e += 2) s.text(X(10 ** e), 358, `1e${e}`, { font: 'mono', size: 16 });
  s.text(460, 390, 'ridge penalty lambda (log scale)', { size: 20 });
  s.text(40, 200, 'expected squared error', { size: 18, rotate: -90 });
  const pts = keys.map((k) => [X(Number(k)), Y(data.ridge[k].expected), Number(k)]);
  s.raw(poly([[120, Y(0.09)], [800, Y(0.09)]], C.green, 2.5, '10 8'));
  s.raw(poly(keys.map((k) => [X(Number(k)), Y(data.ridge[k].variance)]), C.amber, 3));
  s.raw(poly(pts.map(([x, y]) => [x, y]), C.ink, 4));
  for (const [x, y] of pts) s.raw(dot(x, y, 5, C.ink));
  const best = pts.reduce((a, b) => (b[1] > a[1] ? b : a));
  s.text(best[0], best[1] - 22, `best lambda = 1: ${f3(data.ridge['1.0'].expected)}`, { size: 17, weight: 700 });
  s.text(120, 60, 'no penalty (lambda = 0): expected error 0.520, off this scale', { size: 17, anchor: 'start', color: C.muted });
  s.raw(poly([[560, 78], [600, 78]], C.amber, 3)); s.text(610, 84, 'variance', { size: 17, anchor: 'start' });
  save('19.3-ridge-lambda.svg', s);
}

// ---------------------------------------------------------------- 19.3-l1-l2-geometry.svg (illustrative)
{
  const s = new Sketch(880, 370, { title: 'Ridge constraint is a circle and lasso constraint is a diamond; the lasso solution lands on an axis at a corner. Illustrative geometry.', seed: 1934 });
  s.text(440, 34, 'Where the penalty first touches the loss', { size: 24, weight: 700 });
  const S = 110, what = [1.5, 0.3]; // OLS point, in units of the constraint radius (illustrative)
  const panel = (x0, shape) => {
    const y0 = 170;
    const P = (w1, w2) => [x0 + w1 * S, y0 - w2 * S];
    const [ox, oy] = P(...what);
    // contact point = projection of OLS point onto the constraint set
    let contact;
    if (shape === 'circle') {
      const n = Math.hypot(...what); contact = [what[0] / n, what[1] / n];
    } else {
      contact = [1, 0]; // OLS point is nearest to the vertex (1, 0)
    }
    const dist = Math.hypot(what[0] - contact[0], what[1] - contact[1]);
    s.raw(`<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${(dist * S).toFixed(1)}" fill="none" stroke="${C.muted}" stroke-width="1.5" stroke-dasharray="4 6"/>`);
    s.raw(`<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${(dist * S * 1.3).toFixed(1)}" fill="none" stroke="${C.muted}" stroke-width="1.2" stroke-dasharray="4 6"/>`);
    s.raw(poly([[x0 - S - 20, y0], [x0 + S + 20, y0]], C.muted, 1.2));
    s.raw(poly([[x0, y0 - S - 20], [x0, y0 + S + 2]], C.muted, 1.2));
    if (shape === 'circle') s.raw(`<circle cx="${x0}" cy="${y0}" r="${S}" fill="${C.blueSoft}" fill-opacity="0.5" stroke="${C.blue}" stroke-width="3"/>`);
    else s.raw(poly([[x0 + S, y0], [x0, y0 - S], [x0 - S, y0], [x0, y0 + S], [x0 + S, y0]], C.amber, 3));
    s.raw(dot(ox, oy, 5, C.ink));
    const [cx, cy] = P(...contact);
    s.raw(dot(cx, cy, 7, C.green));
    return { ox, oy, cx, cy };
  };
  panel(200, 'circle');
  panel(620, 'diamond');
  s.text(200, 294, 'ridge (L2): w1^2 + w2^2 <= t', { font: 'mono', size: 17 });
  s.text(620, 294, 'lasso (L1): |w1| + |w2| <= t', { font: 'mono', size: 17 });
  s.text(200, 322, 'contact: both coefficients nonzero', { size: 19, color: C.blue });
  s.text(620, 322, 'contact: w2 = 0 (a corner on an axis)', { size: 19, color: C.amber });
  s.text(440, 352, 'black dot: OLS solution; green dot: first contact; dashed rings: loss contours (circular, as for an orthonormal design)', { size: 15, color: C.muted });
  save('19.3-l1-l2-geometry.svg', s);
}

// ---------------------------------------------------------------- 19.3-coefs.svg
{
  const s = new Sketch(880, 420, { title: 'Coefficients of one run: true values, ridge and lasso for the first six of twenty features', seed: 1935 });
  s.text(440, 34, 'One run, first six of 20 coefficients', { size: 24, weight: 700 });
  const sp = data.sparse, r0 = sp.run0;
  const truth = sp.w_true.slice(0, 6);
  const ridge = r0.ridge.slice(0, 6), lasso = r0.lasso.slice(0, 6);
  const ZERO = 220, K = 60;
  s.raw(poly([[60, ZERO], [820, ZERO]], C.muted, 1.5));
  s.raw(poly([[60, ZERO - 2.5 * K], [60, ZERO + 2.5 * K]], C.muted, 1));
  s.text(40, ZERO + 6, '0', { anchor: 'end', font: 'mono', size: 16 });
  s.text(40, ZERO - 2 * K, '2', { anchor: 'end', font: 'mono', size: 16 });
  s.text(40, ZERO + 2 * K, '-2', { anchor: 'end', font: 'mono', size: 16 });
  const bars = [
    { v: truth, col: C.ink, fill: C.muted, dx: -44 },
    { v: ridge, col: C.blue, fill: C.blueSoft, dx: 0 },
    { v: lasso, col: C.amber, fill: C.amberSoft, dx: 44 },
  ];
  for (let i = 0; i < 6; i++) {
    const cx = 130 + i * 130;
    for (const b of bars) {
      const v = b.v[i], x = cx + b.dx - 14, h = Math.abs(v) * K;
      const y = v >= 0 ? ZERO - h : ZERO;
      if (h > 0.5) s.rect(x, y, 28, h, { color: b.col, fill: b.fill, fillStyle: 'solid' });
      const ly = v >= 0 ? ZERO - h - 8 : ZERO + h + 18;
      s.text(cx + b.dx, ly, v.toFixed(2), { font: 'mono', size: 12 });
    }
    s.text(cx, 388, `w${i + 1}`, { font: 'mono', size: 18 });
  }
  s.text(440, 412, 'grey: true value; blue: ridge (alpha by 5-fold CV); amber: lasso (alpha by 5-fold CV); one run of 100 repeats', { size: 15, color: C.muted });
  save('19.3-coefs.svg', s);
}
console.log('wrote 5 diagrams');
