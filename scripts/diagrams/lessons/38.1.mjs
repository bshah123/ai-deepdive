import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-38-document-ingestion/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below is read from the output of 38.1_experiment.py (38.1_data.json).
const R = JSON.parse(readFileSync(join(HERE, '38.1_data.json'), 'utf8'));
const A = R.A_reading_order;
const G = R.A_geometry_pt;
const B = R.B_table_columns;
const f2 = (v) => v.toFixed(2);
const adj = (producer, method) => A[producer][method][0];

// ---- 1. Parsing pipeline with the OCR branch ----
{
  const s = new Sketch(880, 300, { title: 'Parsing pipeline: PDF to glyphs, lines, reading order, tables, Markdown; scanned pages branch to OCR', seed: 101 });
  s.text(440, 34, 'From PDF bytes to structured text', { size: 24, weight: 700 });
  const names = ['PDF file', 'glyphs at (x, y)', 'lines', 'reading order', 'tables', 'Markdown or JSON'];
  names.forEach((n, i) => {
    const x = 25 + i * 142;
    s.rect(x, 80, 120, 56, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 60, 114, n, { size: 16 });
    if (i < names.length - 1) s.arrow(x + 120, 108, x + 142, 108, { color: C.muted });
  });
  s.arrow(250, 136, 318, 200, { color: C.amber });
  s.text(238, 178, 'no text layer', { size: 16, anchor: 'end', color: C.amber });
  s.rect(309, 200, 120, 52, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(369, 232, 'OCR', { size: 18, weight: 700 });
  s.arrow(369, 200, 369, 139, { color: C.muted });
  s.note(470, 196, 380, 60, ['Measured: a scanned page', `gave ${R.C_scan_text_chars} characters, no error`], { size: 17 });
  save('38.1-pipeline.svg', s);
}

// ---- 2. Stream order follows the producer, not the reader ----
{
  const s = new Sketch(880, 400, { title: 'Stream order for two producers: column-major and row-major drawing of the same two-column page', seed: 102 });
  s.text(440, 34, 'Same page, two drawing orders', { size: 24, weight: 700 });
  s.text(210, 74, 'column-major producer', { size: 19, weight: 700 });
  s.text(650, 74, 'row-major producer', { size: 19, weight: 700 });
  const cell = (x, y, label, step, left) => {
    const col = left ? C.blue : C.amber;
    const soft = left ? C.blueSoft : C.amberSoft;
    s.rect(x, y, 150, 50, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + 75, y + 22, label, { font: 'mono', size: 16 });
    s.text(x + 75, y + 42, `step ${step}`, { size: 15, color: C.muted });
  };
  const rows = [0, 1, 2, 3].map((r) => 100 + r * 56);
  // column-major: all of the left column first, then the right column
  rows.forEach((y, r) => {
    cell(60, y, `L${r + 1}`, r + 1, true);
    cell(240, y, `R${r + 1}`, r + 5, false);
  });
  // row-major: left and right line of each row in turn
  rows.forEach((y, r) => {
    cell(480, y, `L${r + 1}`, 2 * r + 1, true);
    cell(660, y, `R${r + 1}`, 2 * r + 2, false);
  });
  s.text(210, 346, `stream order L1 ... R4: adjacency ${f2(adj('column-major', 'stream order'))}`, { size: 17 });
  s.text(650, 346, `stream order L1, R1, L2 ...: adjacency ${f2(adj('row-major', 'stream order'))}`, { size: 17 });
  s.text(440, 378, 'Adjacency = share of consecutive pairs that are consecutive in reading order.', { size: 15, color: C.muted });
  save('38.1-stream-order.svg', s);
}

// ---- 3. XY-cut sweep: the window of working minimum gaps ----
{
  const sweep = A['column-major'].xy_cut_sweep;
  const keys = Object.keys(sweep);
  const s = new Sketch(880, 500, { title: 'Bar chart: XY-cut reading-order accuracy against the minimum gap parameter', seed: 103 });
  s.text(440, 34, 'XY-cut works only inside a window of minimum gaps', { size: 24, weight: 700 });
  const base = 350;
  const top = 150;
  const scale = base - top;
  s.line(100, base, 870, base, { color: C.ink });
  keys.forEach((k, i) => {
    const v = sweep[k];
    const x = 116 + i * 70;
    const h = v * scale;
    const good = v > 0.5;
    s.rect(x, base - h, 46, Math.max(h, 2), {
      color: good ? C.blue : C.amber,
      fill: good ? C.blueSoft : C.amberSoft,
      fillStyle: 'solid',
    });
    s.text(x + 23, base - h - 10, f2(v), { size: 15 });
    s.text(x + 23, base + 26, k, { size: 17, font: 'mono' });
  });
  s.text(440, 406, 'minimum gap between boxes before a cut (pt)', { size: 18 });
  s.text(440, 100, `works from ${keys[2]} to ${keys[8]} pt`, { size: 18, weight: 700, color: C.blue });
  s.note(40, 428, 380, 60, [`line gap: ${G.line_gap_min} pt`, 'below it, every row is cut'], { size: 16 });
  s.note(460, 428, 380, 60, [`title bridge limit: ${G.title_bridge_limit} pt`, 'above it, the title hides the column gap'], { size: 16 });
  save('38.1-xycut-sweep.svg', s);
}

// ---- 4. Table column recovery by anchor edge ----
{
  const rows = [
    ['left edge (x0)', B.unruled.anchor_x0],
    ['centre (xc)', B.unruled.anchor_center],
    ['right edge (x1)', B.unruled.anchor_x1],
    ['ruled lines (vertical rules)', B.ruled.ruled_pairwise],
  ];
  const s = new Sketch(880, 400, { title: 'Pairwise F1 for four ways of assigning table fragments to columns', seed: 104 });
  s.text(440, 34, 'Column recovery depends on the anchor edge', { size: 24, weight: 700 });
  rows.forEach(([label, m], i) => {
    const y = 84 + i * 72;
    s.text(40, y + 22, label, { size: 18, anchor: 'start' });
    const w = m.f1 * 420;
    const solid = i === 3;
    s.rect(360, y, Math.max(w, 2), 36, {
      color: solid ? C.green : C.blue,
      fill: solid ? C.greenSoft : C.blueSoft,
      fillStyle: 'solid',
    });
    s.text(360 + w + 14, y + 22, f2(m.f1), { size: 18, weight: 700, anchor: 'start' });
    const detail = i < 3 ? `recall ${f2(m.recall)}, ${m.clusters_found} clusters` : `recall ${f2(m.recall)}, 4 columns from rules`;
    s.text(360, y + 54, detail, { size: 15, color: C.muted, anchor: 'start' });
  });
  s.text(440, 378, `Unruled table, ${B.unruled.fragments} fragments, ${B.unruled.pairs} pairs; F1 = harmonic mean of precision and recall.`, { size: 15, color: C.muted });
  save('38.1-table-anchors.svg', s);
}
