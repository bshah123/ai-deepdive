import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-02-scientific-python/chapter-17-pytorch-fundamentals/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers come from scripts/diagrams/lessons/17.2_experiment.py (run once; output in 17.2_data.json).
const D = JSON.parse(readFileSync(join(HERE, '17.2_data.json'), 'utf8'));

// Centre a block of text lines on (cx, cy).
const centred = (s, cx, cy, lines, size, o = {}) => {
  const arr = Array.isArray(lines) ? lines : [lines];
  const lh = size * 1.1;
  s.text(cx, cy - ((arr.length - 1) * lh) / 2 + size * 0.35, arr, { size, ...o });
};

// 1. Timeline: first three batches, pageable serial (A) vs pinned double-buffered (C)
{
  const s = new Sketch(880, 360, { title: 'Timeline of three batches: serial pageable vs overlapped pinned copies', seed: 201 });
  const X0 = 190;
  const PX = 640 / 180; // 180 ms spans 640 px
  const x = (t) => X0 + t * PX;
  s.text(440, 34, 'Three batches on one time axis (ms)', { size: 24, weight: 700 });
  const bar = (seg, y) => {
    const [name, engine, a, b] = seg;
    const copy = engine === 'copy';
    s.rect(x(a), y, x(b) - x(a), 36, { color: copy ? C.blue : C.green, fill: copy ? C.blueSoft : C.greenSoft, fillStyle: 'solid' });
    s.text((x(a) + x(b)) / 2, y + 24, name, { font: 'mono', size: 15 });
  };
  s.text(30, 84, 'A  pageable, one stream', { size: 19, weight: 700, anchor: 'start' });
  s.text(30, 118, 'copy engine', { size: 16, anchor: 'start' });
  s.text(30, 163, 'compute', { size: 16, anchor: 'start' });
  D.gantt_A.forEach((seg) => bar(seg, seg[1] === 'copy' ? 100 : 145));
  s.text(30, 232, 'C  pinned, two streams', { size: 19, weight: 700, anchor: 'start' });
  s.text(30, 266, 'copy engine', { size: 16, anchor: 'start' });
  s.text(30, 311, 'compute', { size: 16, anchor: 'start' });
  D.gantt_C.forEach((seg) => bar(seg, seg[1] === 'copy' ? 248 : 293));
  s.line(x(0), 336, x(180), 336, { color: C.muted, width: 1.2 });
  for (const t of [0, 60, 120, 180]) {
    s.line(x(t), 336, x(t), 342, { color: C.muted, width: 1.2 });
    s.text(x(t), 362 - 10, `${t}`, { size: 15, color: C.muted });
  }
  save('17.2-timeline.svg', s);
}

// 2. Staging path: pageable goes through a driver-made pinned buffer, pinned does not
{
  const s = new Sketch(880, 360, { title: 'Pageable copies go through a staging buffer; pinned copies do not', seed: 202 });
  s.text(440, 34, 'Where the bytes travel on a host-to-device copy', { size: 24, weight: 700 });
  const box = (x, y, w, h, lines, color, fill) => {
    s.rect(x, y, w, h, { color, fill, fillStyle: 'solid' });
    centred(s, x + w / 2, y + h / 2, lines, 17);
  };
  s.text(30, 80, 'pageable (the default)', { size: 19, weight: 700, anchor: 'start' });
  box(30, 96, 190, 62, ['your tensor', '(pageable)'], C.rose, C.roseSoft);
  box(260, 96, 200, 62, ['staging buffer', '(pinned, by driver)'], C.amber, C.amberSoft);
  box(650, 96, 190, 62, ['GPU memory'], C.blue, C.blueSoft);
  s.arrow(220, 127, 258, 127, { color: C.ink });
  s.arrow(460, 127, 648, 127, { color: C.ink });
  s.text(554, 116, 'DMA over PCIe', { size: 16 });

  s.text(30, 212, 'pinned (page-locked)', { size: 19, weight: 700, anchor: 'start' });
  box(30, 228, 190, 62, ['your tensor', '(pinned)'], C.green, C.greenSoft);
  box(650, 228, 190, 62, ['GPU memory'], C.blue, C.blueSoft);
  s.arrow(220, 259, 648, 259, { color: C.ink });
  s.text(434, 248, 'DMA over PCIe, no staging copy', { size: 16 });

  s.note(30, 300, 820, 46, ['Pageable: the CPU copies the bytes once, then the DMA runs. Pinned: the DMA reads your buffer.'], { size: 17 });
  save('17.2-staging.svg', s);
}

// 3. Totals for four configurations (measured by the timeline model)
{
  const s = new Sketch(880, 380, { title: 'Bar chart of total time for eight batches under four configurations', seed: 203 });
  s.text(440, 34, `Total time for ${D.params.batches} batches (ms, model)`, { size: 24, weight: 700 });
  const base = 290;
  const scale = 0.44; // px per ms
  const cols = [C.rose, C.blue, C.green, C.muted];
  const fills = [C.roseSoft, C.blueSoft, C.greenSoft, undefined]; // D: hachure, an empty bar
  const names = [['A pageable', '1 stream'], ['B pinned', '1 stream'], ['C pinned', '2 streams, 2 buffers'], ['D pinned', '2 streams, 1 buffer']];
  s.line(80, base, 840, base, { color: C.muted, width: 1.2 });
  D.scenarios.forEach((r, i) => {
    const cx = 180 + i * 190;
    const h = r.total * scale;
    s.rect(cx - 60, base - h, 120, h, { color: cols[i], fill: fills[i], fillStyle: fills[i] ? 'solid' : 'hachure' });
    s.text(cx, base - h - 12, `${r.total.toFixed(1)} ms`, { size: 18, weight: 700 });
    centred(s, cx, base + 30, names[i], 16);
  });
  s.text(440, 372, 'Same batch size and kernel time in all four bars; only copy speed and overlap change.', { size: 15, color: C.muted });
  save('17.2-totals.svg', s);
}

// 4. Double buffering: two slots, a copy waits for the kernel that last read its slot
{
  const s = new Sketch(880, 330, { title: 'Two buffer slots let copy i+1 run while kernel i runs', seed: 204 });
  s.text(440, 34, 'Copy stream and compute stream with two buffer slots', { size: 24, weight: 700 });
  const slot = (i) => (i % 2 === 0 ? ['slot 0', C.blue] : ['slot 1', C.violet]);
  const bx = (i) => 130 + i * 185;
  s.text(20, 112, 'copy stream', { size: 16, anchor: 'start' });
  s.text(20, 222, 'compute stream', { size: 16, anchor: 'start' });
  for (let i = 0; i < 4; i++) {
    const [lab, col] = slot(i);
    s.rect(bx(i), 80, 165, 54, { color: col, fill: C.blueSoft, fillStyle: 'solid' });
    centred(s, bx(i) + 82, 107, [`copy batch ${i}`, `into ${lab}`], 17);
    if (i < 3) {
      s.rect(bx(i), 190, 165, 54, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
      centred(s, bx(i) + 82, 217, [`kernel batch ${i}`, `reads ${lab}`], 17);
      s.arrow(bx(i) + 82, 136, bx(i) + 82, 186, { color: C.ink });
    }
  }
  s.text(440, 282, 'Copy batch 2 reuses slot 0, so it waits for kernel 0 to finish.', { size: 17, color: C.rose });
  s.text(440, 312, 'With one slot, every copy waits for the previous kernel (case D).', { size: 16, color: C.muted });
  save('17.2-buffers.svg', s);
}
