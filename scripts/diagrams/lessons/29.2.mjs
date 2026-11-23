import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-04-transformers-llms/chapter-29-llm-inference/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below is read from the experiment's output (29.2_experiment.py -> 29.2_data.json)
const D = JSON.parse(readFileSync(join(HERE, '29.2_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');

// 1. One request in a static slab versus pages
{
  const { static_slots: S, len: L, paged_pages: P, paged_waste: W } = D.example_request;
  const s = new Sketch(880, 322, { title: `A ${L}-token request in one slab of ${S} slots versus ${P} pages of 16 slots`, seed: 201 });
  const X0 = 60, BW = 760, Y1 = 92, Y2 = 222, BH = 44;
  s.text(X0, 70, `Static: one slab sized for the longest request (${fmt(S)} slots)`, { size: 20, anchor: 'start' });
  const usedW = (BW * L) / S;
  s.rect(X0, Y1, usedW, BH, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.rect(X0 + usedW, Y1, BW - usedW, BH, { color: C.muted, fill: C.muted });
  s.text(X0, Y1 + BH + 28, `${L} tokens used`, { size: 18, anchor: 'start', color: C.blue });
  s.text(X0 + BW, Y1 + BH + 28, `${fmt(S - L)} slots reserved and empty`, { size: 18, anchor: 'end', color: C.muted });

  s.text(X0, 200, `Paged: ${P} pages of 16 slots, each taken when needed`, { size: 20, anchor: 'start' });
  const pw = BW / P;
  const lastUsed = L - (P - 1) * 16;
  for (let i = 0; i < P; i++) {
    const x = X0 + i * pw;
    if (i < P - 1) {
      s.rect(x + 2, Y2, pw - 4, BH, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    } else {
      const w = ((pw - 4) * lastUsed) / 16;
      s.rect(x + 2, Y2, w, BH, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.rect(x + 2 + w, Y2, pw - 4 - w, BH, { color: C.muted, fill: C.muted });
    }
  }
  s.text(X0, Y2 + BH + 28, `${P - 1} full pages + one page holding ${lastUsed} tokens`, { size: 18, anchor: 'start', color: C.blue });
  s.text(X0 + BW, Y2 + BH + 28, `${W} empty slots, all in the last page`, { size: 18, anchor: 'end', color: C.muted });
  save('29.2-reserve-vs-pages.svg', s);
}

// 2. Block table: logical pages of two sequences mapped onto a scattered pool
{
  const { table_A: TA, table_B: TB, owner, free, pool_blocks: N } = D.toy;
  const s = new Sketch(880, 340, { title: `Two sequences whose logical pages map to scattered physical blocks in an 8-block pool`, seed: 202 });
  const cx = (i) => 100 + i * 92;
  const logical = [
    { seq: 'A', k: 0, phys: TA[0], tok: 'tok 0–3', color: C.blue, soft: C.blueSoft },
    { seq: 'B', k: 0, phys: TB[0], tok: 'tok 0–3', color: C.green, soft: C.greenSoft },
    { seq: 'A', k: 1, phys: TA[1], tok: 'tok 4–7', color: C.blue, soft: C.blueSoft },
    { seq: 'B', k: 1, phys: TB[1], tok: 'tok 4–5', color: C.green, soft: C.greenSoft },
    { seq: 'A', k: 2, phys: TA[2], tok: 'tok 8–9', color: C.blue, soft: C.blueSoft },
  ];
  for (const l of logical) {
    s.rect(cx(l.phys) - 40, 70, 80, 56, { color: l.color, fill: l.soft, fillStyle: 'solid' });
    s.text(cx(l.phys), 94, [`${l.seq}${l.k}`, l.tok], { size: 16, font: 'mono' });
    s.arrow(cx(l.phys), 130, cx(l.phys), 194, { color: C.muted });
  }
  for (let i = 0; i < N; i++) {
    const o = owner[String(i)];
    const x = cx(i) - 40;
    if (o === 'A') s.rect(x, 200, 80, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    else if (o === 'B') s.rect(x, 200, 80, 60, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    else s.rect(x, 200, 80, 60, { color: C.muted, dash: '6 8' });
    s.text(cx(i), 238, String(i), { size: 20, font: 'mono', weight: 700 });
    s.text(cx(i), 286, o || 'free', { size: 16, color: o === 'A' ? C.blue : o === 'B' ? C.green : C.muted });
  }
  s.text(60, 326, `A's block table: [${TA.join(', ')}]   B's block table: [${TB.join(', ')}]   free: ${free.join(', ')}`, { size: 17, anchor: 'start', color: C.ink });
  save('29.2-block-table.svg', s);
}

// 3. Parallel sampling with copy-on-write: four outputs, one prompt
{
  const F = D.fork;
  const tables = Object.values(F.child_tables);
  const shared = new Set(tables[0].filter((b) => tables.every((t) => t.includes(b))));
  const s = new Sketch(880, 470, { title: `Four outputs of one prompt: which physical pages each logical page uses`, seed: 203 });
  s.text(60, 34, `Physical page id for each logical page (4 outputs, page size 16)`, { size: 20, anchor: 'start' });
  const X0 = 190, CW = 60, GAP = 4;
  const colX = (j) => X0 + j * (CW + GAP) + CW / 2;
  for (let j = 0; j < 10; j++) s.text(colX(j), 74, `p${j}`, { size: 16, font: 'mono', color: C.muted });
  Object.entries(F.child_tables).forEach(([name, t], r) => {
    const y = 92 + r * 56;
    s.text(20, y + 24, `output ${name.slice(1)}`, { size: 18, anchor: 'start' });
    t.forEach((b, j) => {
      const isShared = shared.has(b);
      s.rect(colX(j) - CW / 2, y, CW, 44, isShared
        ? { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' }
        : { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
      s.text(colX(j), y + 29, String(b), { size: 18, font: 'mono', weight: 700 });
    });
  });
  const yb = 92 + 4 * 56 + 20;
  s.rect(60, yb, 28, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(100, yb + 17, `shared by all ${tables.length} outputs (read only)`, { size: 17, anchor: 'start' });
  s.rect(420, yb, 28, 22, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(458, yb + 17, 'private copy or new page', { size: 17, anchor: 'start' });
  s.note(60, yb + 46, 760, 66, [
    `Pages in use: ${F.pages_shared} with a shared prompt, ${F.pages_separate} with four separate copies.`,
    'Page p6 is partly filled: a sharing output copies it before writing, except the last owner.',
  ], { size: 18 });
  save('29.2-copy-on-write.svg', s);
}

// 4. How many requests fit: static reservation versus paged allocation
{
  const A = D.admission;
  const s = new Sketch(880, 344, { title: `Requests admitted and share of capacity holding tokens, static versus paged`, seed: 204 });
  const base = 270, maxH = 170;
  const panel = (x0, title, bars, maxV, fmtV) => {
    s.text(x0, 60, title, { size: 20, anchor: 'start' });
    bars.forEach((b, i) => {
      const h = (b.v / maxV) * maxH;
      const x = x0 + 40 + i * 180;
      s.rect(x, base - h, 120, h, { color: b.color, fill: b.soft, fillStyle: 'solid' });
      s.text(x + 60, base - h - 12, fmtV(b.v), { size: 22, weight: 700 });
      s.text(x + 60, base + 30, b.label, { size: 18 });
    });
    s.line(x0, base, x0 + 380, base, { color: C.muted });
  };
  panel(40, 'Requests admitted at once', [
    { v: A.static_admit, label: 'static slab', color: C.amber, soft: C.amberSoft },
    { v: A.paged16_admit, label: 'paged, 16/page', color: C.blue, soft: C.blueSoft },
  ], A.paged16_admit, (v) => String(v));
  panel(460, 'Share of KV capacity holding tokens', [
    { v: A.static_util, label: 'static slab', color: C.amber, soft: C.amberSoft },
    { v: A.paged16_util, label: 'paged, 16/page', color: C.blue, soft: C.blueSoft },
  ], 1, (v) => `${(v * 100).toFixed(1)}%`);
  s.text(440, 326, `Workload: 1,000 requests of 32–2,048 tokens; capacity ${fmt(A.capacity)} slots`, { size: 16, color: C.muted });
  save('29.2-admission.svg', s);
}
