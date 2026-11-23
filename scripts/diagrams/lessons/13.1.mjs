import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-13-modules-packages-environments/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers come from one run of 13.1_experiment.py (see the lesson for the machine).
const D = JSON.parse(readFileSync(join(HERE, '13.1_data.json'), 'utf8'));

// 1. The import flow: cache check, then search, create, store, run.
{
  const s = new Sketch(880, 520, { title: 'Flowchart of import x: cache check, then find, create, store and run the module body', seed: 1301 });
  s.text(440, 34, 'What import x does, in order', { size: 26, weight: 700 });

  s.rect(250, 70, 220, 46, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(360, 100, 'import x', { font: 'mono', size: 18 });
  s.arrow(360, 116, 360, 140, { color: C.muted });

  s.rect(250, 140, 220, 46, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(360, 170, 'x in sys.modules?', { font: 'mono', size: 17 });
  s.arrow(470, 163, 540, 163, { color: C.green });
  s.text(505, 152, 'yes', { size: 17, color: C.green });
  s.rect(540, 140, 300, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(690, 170, 'return the cached object', { size: 19 });

  s.arrow(360, 186, 360, 210, { color: C.muted });
  s.text(378, 203, 'no', { size: 17, color: C.muted });
  s.rect(250, 210, 220, 46, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(360, 240, '1. find: ask the finders', { size: 19 });

  s.arrow(360, 256, 360, 280, { color: C.muted });
  s.rect(250, 280, 220, 46, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(360, 310, '2. create, then store', { size: 19 });

  s.arrow(360, 326, 360, 350, { color: C.muted });
  s.rect(250, 350, 220, 46, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(360, 380, '3. run the module body', { size: 19 });

  s.arrow(360, 396, 360, 420, { color: C.muted });
  s.rect(250, 420, 220, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(360, 450, '4. return the module', { size: 19 });

  s.arrow(470, 373, 540, 373, { color: C.rose });
  s.text(505, 362, 'raises', { size: 17, color: C.rose });
  s.rect(540, 350, 300, 46, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(690, 380, 'delete the entry, re-raise', { size: 19 });

  s.note(560, 210, 290, 100, ['Step 2 stores the module before step 3', 'runs its code, so a circular', 'import sees a half-built module.'], { size: 17 });
  s.text(440, 500, 'Steps 1 to 4 run only on a cache miss.', { size: 17, color: C.muted });
  save('13.1-import-flow.svg', s);
}

// 2. Search order: sys.path is searched top to bottom; the first match wins.
{
  const s = new Sketch(880, 320, { title: 'Three sys.path entries; the first one that holds helper_mod.py wins', seed: 1302 });
  s.text(440, 34, 'First match on sys.path wins', { size: 26, weight: 700 });
  s.text(60, 92, 'sys.path[0]', { font: 'mono', size: 17, anchor: 'start' });
  s.rect(200, 70, 380, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(390, 100, 'dir_a/  has helper_mod.py: stop', { size: 19 });
  s.text(60, 172, 'sys.path[1]', { font: 'mono', size: 17, anchor: 'start' });
  s.rect(200, 150, 380, 50, { color: C.muted, dash: '6 8' });
  s.text(390, 180, 'dir_b/  never reached', { size: 19, color: C.muted });
  s.text(60, 252, 'sys.path[2]', { font: 'mono', size: 17, anchor: 'start' });
  s.rect(200, 230, 380, 50, { color: C.muted, dash: '6 8' });
  s.text(390, 260, 'stdlib directory  never reached', { size: 19, color: C.muted });
  s.note(620, 120, 230, 130, ['Same name in two folders?', 'Reordering sys.path', 'changes the winner.'], { size: 18 });
  save('13.1-search-order.svg', s);
}

// 3. Trace of three imports of one module, from the experiment.
{
  const s = new Sketch(880, 330, { title: 'Table of finder calls, body runs and identity over three imports', seed: 1303 });
  s.text(440, 34, 'Three imports of the same module', { size: 26, weight: 700 });
  const cols = [340, 560, 780];
  s.text(cols[0], 84, 'import #1', { size: 19, weight: 700 });
  s.text(cols[1], 84, 'import #2', { size: 19, weight: 700 });
  s.text(cols[2], 84, 'import #3', { size: 19, weight: 700 });
  const rows = [
    ['finder searches', D.finder_calls, C.amber, C.amberSoft],
    ['body runs', D.body_runs, C.blue, C.blueSoft],
  ];
  rows.forEach(([label, vals, col, soft], r) => {
    const y = 110 + r * 70;
    s.text(60, y + 28, label, { size: 19, anchor: 'start' });
    vals.forEach((v, i) => {
      s.rect(cols[i] - 80, y, 160, 50, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(cols[i], y + 32, String(v), { font: 'mono', size: 24, weight: 700 });
    });
  });
  const y3 = 250;
  s.text(60, y3 + 28, 'same object', { size: 19, anchor: 'start' });
  [0, 1, 2].forEach((i) => {
    s.rect(cols[i] - 80, y3, 160, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cols[i], y3 + 32, D.same_object ? 'yes' : 'no', { size: 22, weight: 700 });
  });
  save('13.1-trace.svg', s);
}

// 4. Cold import versus cache hit, log scale (one run; machine-dependent).
{
  const s = new Sketch(880, 330, { title: 'Bar chart on a log scale: a fresh import takes about 750 times longer than a cache hit', seed: 1304 });
  s.text(440, 34, 'Cold import versus cache hit (log scale)', { size: 26, weight: 700 });
  const x0 = 300, span = 480, lo = 100; // axis from 100 ns to 1 ms: 4 decades
  const pos = (ns) => x0 + (Math.log10(ns / lo) / 4) * span;
  const cold = D.cold_median_us * 1000, hot = D.hot_median_ns;
  s.text(60, 120, 'first import', { size: 20, anchor: 'start' });
  s.text(60, 146, '(fresh file)', { size: 17, anchor: 'start', color: C.muted });
  s.rect(x0, 98, pos(cold) - x0, 46, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(pos(cold) + 12, 128, `${Math.round(D.cold_median_us)} µs`, { font: 'mono', size: 19, anchor: 'start' });
  s.text(60, 220, 'cache hit', { size: 20, anchor: 'start' });
  s.text(60, 246, '(sys.modules)', { size: 17, anchor: 'start', color: C.muted });
  s.rect(x0, 198, Math.max(pos(hot) - x0, 4), 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(pos(hot) + 12, 228, `${Math.round(hot)} ns`, { font: 'mono', size: 19, anchor: 'start' });
  s.line(x0, 280, x0 + span, 280, { color: C.ink });
  [[100, '100 ns'], [1000, '1 µs'], [10000, '10 µs'], [100000, '100 µs'], [1000000, '1 ms']].forEach(([ns, lab]) => {
    s.line(pos(ns), 280, pos(ns), 288, { color: C.ink });
    s.text(pos(ns), 312, lab, { font: 'mono', size: 16, color: C.muted });
  });
  save('13.1-timing.svg', s);
}

console.log('wrote 13.1 diagrams to', OUT);
