import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Every number below is read from 7.4_data.json, written by 7.4_experiment.py.
const HERE = dirname(fileURLToPath(import.meta.url));
const D = JSON.parse(readFileSync(join(HERE, '7.4_data.json'), 'utf8'));

const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-07-functions-call-stack/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

const LIMIT = D.default_limit;
const byLimit = Object.fromEntries(D.limit_sweep.map((r) => [r.limit, r.max_n]));
const boundary = D.helper_boundary_max_n;          // deepest rec(n) that fits, behind 4 harness frames
const recFrames = boundary + 1;                     // rec(n) holds n + 1 frames
const harness = ['<module>', 'max_ok()', '<lambda>', 'via_helper()'];

// 1. The frame tower: where the 1000 goes (Block 2).
{
  const s = new Sketch(880, 500, { title: 'The frame tower at the recursion limit', seed: 741 });
  s.text(440, 36, 'The frame tower at the recursion limit', { size: 26, weight: 700 });
  const x = 110, w = 300, top = 100, rh = 190, fh = 40;
  const baseTop = top + rh;
  // recursive frames, collapsed into one tall box
  s.rect(x, top, w, rh, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(x + w / 2, top + 50, 'rec(' + boundary + ')', { font: 'mono', size: 18 });
  s.text(x + w / 2, top + 96, '...  ' + recFrames + ' frames  ...', { size: 20, color: C.muted });
  s.text(x + w / 2, top + 142, 'rec(0)', { font: 'mono', size: 18 });
  // harness frames, bottom (module) to top (via_helper)
  harness.slice().reverse().forEach((name, i) => {
    const y = baseTop + i * fh;
    s.rect(x, y, w, fh, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + w / 2, y + 27, name, { font: 'mono', size: 18 });
  });
  // the limit line
  s.line(x - 40, top, x + w + 40, top, { color: C.rose, dash: '6 8' });
  s.text(x - 40, top - 12, 'limit = ' + LIMIT + ' frames', { size: 19, anchor: 'start', color: C.rose });
  s.note(500, 120, 330, 150, [
    'Count from the top:',
    recFrames + ' recursive frames',
    '+ ' + harness.length + ' harness frames',
    '= ' + (recFrames + harness.length) + ' = the limit',
  ], { size: 20 });
  s.note(500, 300, 330, 120, [
    'One more call, rec(' + (boundary + 1) + '),',
    'needs a frame above the limit:',
    'RecursionError.',
  ], { size: 20 });
  s.text(440, 470, 'Amber: frames outside the recursion. Blue: the recursive calls.', { size: 17, color: C.muted });
  save('7.4-limit-tower.svg', s);
}

// 2. Extra frames cost one level each (Block 1).
{
  const s = new Sketch(880, 440, { title: 'Deepest successful recursion for extra wrapper frames', seed: 742 });
  s.text(440, 36, 'Deepest successful recursion, with k wrapper frames', { size: 25, weight: 700 });
  const base = 370, scale = 0.27, bw = 96;
  const xs = [150, 330, 510, 690];
  s.line(90, base, 800, base, { color: C.ink });
  s.line(90, base - LIMIT * scale, 800, base - LIMIT * scale, { color: C.rose, dash: '6 8' });
  s.text(800, base - LIMIT * scale - 10, 'limit ' + LIMIT, { size: 18, anchor: 'end', color: C.rose });
  D.wrapper_sweep.forEach((r, i) => {
    const h = r.max_n * scale, x = xs[i];
    s.rect(x - bw / 2, base - h, bw, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x, base - h + 34, String(r.max_n), { size: 20, weight: 700 });
    s.text(x, base + 28, 'k = ' + r.k, { font: 'mono', size: 18 });
  });
  s.text(440, base + 62, 'k extra wrapper frames already on the stack', { size: 19, color: C.muted });
  save('7.4-wrapper-bars.svg', s);
}

// 3. Peak memory grows with depth (Block 5, rough).
{
  const s = new Sketch(880, 400, { title: 'Peak memory against recursion depth', seed: 743 });
  s.text(440, 36, 'Peak resident memory against recursion depth', { size: 25, weight: 700 });
  const base = 320, scale = 6; // px per MiB
  const keys = ['0', '10000', '100000'];
  const labels = ['0 frames', '10,000 frames', '100,000 frames'];
  s.line(90, base, 800, base, { color: C.ink });
  keys.forEach((k, i) => {
    const mib = D.rss_bytes[k] / 1048576;
    const h = mib * scale, x = 200 + i * 220;
    s.rect(x - 60, base - h, 120, h, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x, base - h - 12, mib.toFixed(1) + ' MiB', { size: 19, weight: 700 });
    s.text(x, base + 30, labels[i], { size: 19 });
  });
  s.text(440, 375, 'Measured on one machine (CPython ' + D.python_version + '); about ' + D.bytes_per_frame_est + ' bytes per frame.', { size: 17, color: C.muted });
  save('7.4-rss-bars.svg', s);
}

// 4. Recursive sum against a loop (Block 6).
{
  const s = new Sketch(880, 480, { title: 'Recursive sum against a loop', seed: 744 });
  s.text(440, 36, 'The same sum, two shapes', { size: 26, weight: 700 });
  // left: recursion, a tower up to the ceiling
  const lx = 80, lw = 300, ceil = 110, bottom = 420;
  s.line(lx - 20, ceil, lx + lw + 20, ceil, { color: C.rose, dash: '6 8' });
  s.text(lx + lw / 2, ceil - 14, 'limit = ' + LIMIT + ' frames', { size: 19, color: C.rose });
  for (let i = 0; i < 6; i++) {
    const y = bottom - (i + 1) * 46;
    s.rect(lx, y, lw, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(lx + lw / 2, y + 27, 'total(xs, ' + (i + 1) + ')', { font: 'mono', size: 17 });
  }
  s.text(lx + lw / 2, 134, '...', { size: 24 });
  s.text(lx + lw / 2, bottom + 34, 'recursive: fails near ' + LIMIT + ' items', { size: 20, weight: 700 });
  // right: loop, one frame
  const rx = 480, rw = 300;
  s.rect(rx, 240, rw, 80, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(rx + rw / 2, 275, 'for x in xs:  total += x', { font: 'mono', size: 18 });
  s.text(rx + rw / 2, 350, '1 frame, whatever the length', { size: 20 });
  s.text(rx + rw / 2, bottom + 34, 'loop: 1,000,000 items ' + (D.loop_sum_1e6_ok ? 'correct' : 'WRONG'), { size: 20, weight: 700 });
  save('7.4-recursive-vs-loop.svg', s);
}

// 5. Explicit-stack DFS trace on a five-node tree (Block 7).
{
  const s = new Sketch(880, 440, { title: 'Explicit-stack DFS on a five-node tree', seed: 745 });
  s.text(440, 36, 'Explicit-stack DFS on a five-node tree', { size: 26, weight: 700 });
  const pos = { 0: [180, 110], 1: [100, 200], 2: [260, 200], 3: [40, 300], 4: [160, 300] };
  const edges = [[0, 1], [0, 2], [1, 3], [1, 4]];
  edges.forEach(([a, b]) => s.line(pos[a][0], pos[a][1] + 20, pos[b][0], pos[b][1] - 20, { color: C.muted }));
  Object.entries(pos).forEach(([n, [x, y]]) => {
    s.circle(x, y, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x, y + 7, n, { font: 'mono', size: 20 });
  });
  s.text(40, 380, 'pop order: ' + D.dfs_trace_order.join(', '), { size: 20, anchor: 'start', weight: 700 });
  s.text(450, 90, ['pop      stack after pushing children'], { size: 19, anchor: 'start', color: C.muted });
  D.dfs_trace.forEach((t, i) => {
    const y = 130 + i * 50;
    s.rect(450, y - 30, 380, 40, { color: i % 2 ? C.amber : C.blue, fill: i % 2 ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(470, y - 2, 'pop ' + t.popped, { font: 'mono', size: 18, anchor: 'start' });
    s.text(620, y - 2, '[' + t.stack_after.join(', ') + ']', { font: 'mono', size: 18, anchor: 'start' });
  });
  save('7.4-dfs-trace.svg', s);
}
