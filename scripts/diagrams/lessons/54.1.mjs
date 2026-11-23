import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers below come from content/.../54.1 experiment run (scratchpad exp.py, output reproduced in the lesson).
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-09-production-ai/chapter-54-model-serving/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Request path through the server
{
  const s = new Sketch(880, 250, { title: 'Path of one request: client, HTTP API server, engine core with scheduler, GPU worker', seed: 541 });
  s.text(440, 34, 'The path of one request', { size: 24, weight: 700 });
  const boxes = [
    [20, 170, ['POST', '/v1/completions'], C.blue, C.blueSoft],
    [230, 170, ['HTTP API server', 'OpenAI-style'], C.amber, C.amberSoft],
    [440, 200, ['Engine core', 'queue + scheduler'], C.green, C.greenSoft],
    [690, 170, ['GPU worker', 'model + KV blocks'], C.rose, C.roseSoft],
  ];
  for (const [x, w, lines, col, soft] of boxes) {
    s.rect(x, 80, w, 100, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + w / 2, 124, lines[0], { size: 19, weight: 700 });
    s.text(x + w / 2, 152, lines[1], { size: 17 });
  }
  s.arrow(190, 130, 230, 130, { color: C.muted });
  s.arrow(400, 130, 440, 130, { color: C.muted });
  s.arrow(640, 130, 690, 130, { color: C.muted });
  s.text(440, 222, 'One worker process per accelerator. Each step fills a token budget.', { size: 17 });
  save('54.1-serving-path.svg', s);
}

// 2. Block table: logical blocks of one request mapped to scattered physical blocks
{
  const s = new Sketch(880, 350, { title: 'Request A: three logical blocks mapped to physical blocks 7, 2 and 9 of a 10-block pool', seed: 542 });
  s.text(440, 34, 'Block table: logical blocks, scattered physical blocks', { size: 24, weight: 700 });
  const logical = [
    [40, 'L0 → P7', 'tokens 0–15, full'],
    [320, 'L1 → P2', 'tokens 16–31, full'],
    [600, 'L2 → P9', 'tokens 32–39, 8 used'],
  ];
  for (const [x, l1, l2] of logical) {
    s.rect(x, 62, 240, 74, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 120, 94, l1, { size: 20, weight: 700 });
    s.text(x + 120, 122, l2, { size: 17 });
  }
  s.text(440, 178, 'Physical KV blocks in GPU memory (ids 0–9)', { size: 19 });
  const used = [7, 2, 9];
  for (let i = 0; i < 10; i++) {
    const x = 40 + 80 * i;
    if (used.includes(i)) {
      s.rect(x, 196, 80, 60, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
      s.text(x + 40, 232, 'req A', { size: 16 });
    } else {
      s.rect(x, 196, 80, 60, { color: C.muted });
    }
    s.text(x + 40, 282, String(i), { font: 'mono', size: 17 });
  }
  s.text(440, 322, 'Blocks need not be adjacent. Each logical block holds 16 tokens; the last may be partly full.', { size: 17 });
  save('54.1-block-table.svg', s);
}

// 3. Measured utilisation (simulation)
{
  const s = new Sketch(880, 370, { title: 'Bar chart: KV memory utilisation 0.22 versus 0.98; decode slot utilisation 0.60 versus 0.95', seed: 543 });
  s.text(440, 34, 'Simulation results (not GPU measurements)', { size: 24, weight: 700 });
  const scale = 480, x0 = 260;
  s.text(40, 84, 'KV memory: stored tokens / reserved token slots', { size: 19, weight: 700, anchor: 'start' });
  const bar = (y, v, label, col, soft) => {
    s.text(40, y + 22, label, { size: 17, anchor: 'start' });
    s.rect(x0, y, v * scale, 34, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x0 + v * scale + 12, y + 23, v.toFixed(2), { size: 18, anchor: 'start', weight: 700 });
  };
  bar(100, 0.219, 'reserve max length', C.amber, C.amberSoft);
  bar(150, 0.983, 'allocate per block', C.blue, C.blueSoft);
  s.text(40, 236, 'Decode slots: busy slot-steps / all slot-steps (4 slots, 64 requests)', { size: 19, weight: 700, anchor: 'start' });
  bar(252, 0.600, 'static batching', C.rose, C.roseSoft);
  bar(302, 0.946, 'continuous batching', C.green, C.greenSoft);
  s.text(440, 360, 'All bars share one scale: full width = 1.00. Assumptions are in the text.', { size: 17 });
  save('54.1-kv-utilization.svg', s);
}

// 4. Batching timelines: 6 requests with 3, 8, 2, 5, 4, 6 output tokens on 3 slots
{
  const s = new Sketch(880, 385, { title: 'Static and continuous batching timelines for six requests on three slots', seed: 544 });
  s.text(440, 34, 'Static vs continuous batching, 6 requests, 3 slots', { size: 24, weight: 700 });
  const colours = [[C.blue, C.blueSoft], [C.amber, C.amberSoft], [C.green, C.greenSoft], [C.rose, C.roseSoft]];
  const panel = (log, rowY, label, caption, stepY) => {
    s.text(40, label, caption, { size: 18, anchor: 'start', weight: 700 });
    log.forEach((ids, step) => {
      const x = 150 + 42 * step;
      for (let row = 0; row < 3; row++) {
        const y = rowY[row];
        if (row < ids.length) {
          const [col, soft] = colours[ids[row] % 4];
          s.rect(x, y, 36, 32, { color: col, fill: soft, fillStyle: 'solid' });
          s.text(x + 18, y + 22, 'r' + ids[row], { font: 'mono', size: 15 });
        } else {
          s.rect(x, y, 36, 32, { color: C.muted, dash: '4 6' });
        }
      }
      s.text(x + 18, stepY, String(step + 1), { font: 'mono', size: 15 });
    });
  };
  const staticLog = [[0, 1, 2], [0, 1, 2], [0, 1], [1], [1], [1], [1], [1], [3, 4, 5], [3, 4, 5], [3, 4, 5], [3, 4, 5], [3, 5], [5]];
  const contLog = [[0, 1, 2], [0, 1, 2], [0, 1, 3], [1, 3, 4], [1, 3, 4], [1, 3, 4], [1, 3, 4], [1, 5], [5], [5], [5], [5], [5]];
  panel(staticLog, [84, 120, 156], 72, 'static: 14 steps, 28 of 42 slot-steps busy', 206);
  panel(contLog, [244, 280, 316], 232, 'continuous: 13 steps, 28 of 39 slot-steps busy', 366);
  save('54.1-batching-timeline.svg', s);
}
