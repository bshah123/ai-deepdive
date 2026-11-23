import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-38-document-ingestion/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below comes from scripts/diagrams/lessons/38.2_data.json, written by the experiment driver.
const D = JSON.parse(readFileSync(join(HERE, '38.2_data.json'), 'utf8'));

// 1. Fixed-size windows: where the cuts fall in characters.
{
  const s = new Sketch(880, 310, { title: 'Three overlapping fixed-size windows over the first 520 characters, with cuts at 200, 360 and 520', seed: 381 });
  const x = (c) => 60 + c * (740 / 520);
  s.text(440, 34, 'Fixed-size windows cut where the count says, not where the sense is', { size: 24, weight: 700 });
  const rows = [[0, 200, 72, 'chunk 1: 0-200'], [160, 360, 120, 'chunk 2: 160-360'], [320, 520, 168, 'chunk 3: 320-520']];
  const colours = [[C.blue, C.blueSoft], [C.amber, C.amberSoft], [C.green, C.greenSoft]];
  rows.forEach(([a, b, y, label], i) => {
    const [stroke, fill] = colours[i];
    s.rect(x(a), y, x(b) - x(a), 36, { color: stroke, fill, fillStyle: 'solid' });
    s.text((x(a) + x(b)) / 2, y + 24, label, { font: 'mono', size: 16 });
  });
  s.line(x(200), 60, x(200), 222, { color: C.rose, dash: '6 8' });
  s.line(60, 236, 800, 236, { color: C.muted });
  [[0, '0'], [200, '200'], [360, '360'], [520, '520']].forEach(([c, t]) => {
    s.line(x(c), 232, x(c), 240, { color: C.muted });
    s.text(x(c), 262, t, { font: 'mono', size: 16 });
  });
  s.text(440, 292, 'Chunk 1 ends one character before the full stop, so the sentence is split.', { size: 18 });
  save('38.2-fixed-cuts.svg', s);
}

// 2. The separator ladder used by the recursive splitter.
{
  const s = new Sketch(880, 300, { title: 'Recursive splitting tries separators from coarse to fine', seed: 382 });
  s.text(440, 34, 'Recursive splitting: coarse separators first, finer ones only when needed', { size: 24, weight: 700 });
  s.text(440, 74, 'Recurse only into pieces that are still longer than the chunk size.', { size: 19 });
  const boxes = [
    ['1. paragraphs', '"\\n\\n"', C.blue, C.blueSoft],
    ['2. lines', '"\\n"', C.blue, C.blueSoft],
    ['3. words', '" "', C.green, C.greenSoft],
    ['4. characters', '""', C.amber, C.amberSoft],
  ];
  boxes.forEach(([head, sep, stroke, fill], i) => {
    const x0 = 35 + i * 210;
    s.rect(x0, 110, 180, 110, { color: stroke, fill, fillStyle: 'solid' });
    s.text(x0 + 90, 152, head, { size: 21, weight: 700 });
    s.text(x0 + 90, 186, `split on ${sep}`, { font: 'mono', size: 16 });
    if (i < 3) s.arrow(x0 + 186, 165, x0 + 204, 165, { color: C.muted });
  });
  s.note(80, 228, 720, 74, ['Sentence ends (". ") are not on the list, so a chunk can still end mid-sentence.', 'Packing keeps about overlap characters of the previous chunk as the start of the next.'], { size: 17 });
  save('38.2-separator-ladder.svg', s);
}

// 3. Measured: evidence sentences kept intact, by chunk size.
{
  const s = new Sketch(880, 360, { title: 'Evidence sentences kept intact versus chunk size, fixed and recursive, one document', seed: 383 });
  const { sizes, fixed, recursive } = D.sweep;
  const base = 300, unit = 20;
  s.text(440, 34, 'Evidence sentences kept whole (out of 9), by chunk size', { size: 24, weight: 700 });
  s.rect(110, 48, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(136, 62, 'fixed-size', { anchor: 'start', size: 18 });
  s.rect(290, 48, 18, 18, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(316, 62, 'recursive', { anchor: 'start', size: 18 });
  s.line(100, base - 9 * unit, 800, base - 9 * unit, { color: C.muted, dash: '6 8' });
  s.text(88, base - 9 * unit + 6, '9', { font: 'mono', size: 16, anchor: 'end' });
  s.line(100, base, 800, base, { color: C.ink });
  s.text(88, base + 6, '0', { font: 'mono', size: 16, anchor: 'end' });
  sizes.forEach((size, i) => {
    const cx = 170 + i * 120;
    const hf = fixed[i] * unit, hr = recursive[i] * unit;
    s.rect(cx - 42, base - hf, 40, hf, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx + 2, base - hr, 40, hr, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(cx - 22, base - hf - 10, String(fixed[i]), { font: 'mono', size: 16 });
    s.text(cx + 22, base - hr - 10, String(recursive[i]), { font: 'mono', size: 16 });
    s.text(cx, base + 28, String(size), { font: 'mono', size: 17 });
  });
  s.text(440, base + 58, 'chunk size in characters (overlap = size / 5)', { size: 18 });
  save('38.2-survival-sweep.svg', s);
}

// 4. Measured: semantic breakpoints with a lexical (TF-IDF) stand-in.
{
  const s = new Sketch(880, 405, { title: 'Cosine distance between neighbouring windows, with the topic changes marked', seed: 384 });
  const sem = D.semantic['1'];
  const base = 300, unit = 500, n = sem.dist.length, slot = 740 / n, bw = 26;
  const truth = [5, 11];
  s.text(440, 34, 'Semantic breakpoints on a lexical stand-in: the topic changes are not the largest gaps', { size: 21, weight: 700 });
  s.rect(80, 52, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(106, 66, 'topic change in the text', { anchor: 'start', size: 17 });
  s.rect(380, 52, 18, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(406, 66, 'predicted break (90th percentile)', { anchor: 'start', size: 17 });
  const ty = base - sem.thr * unit;
  s.line(80, ty, 820, ty, { color: C.ink, dash: '6 8' });
  s.text(820, ty - 10, `threshold ${sem.thr.toFixed(3)}`, { anchor: 'end', size: 16 });
  s.line(80, base, 820, base, { color: C.ink });
  sem.dist.forEach((d, i) => {
    const x0 = 80 + i * slot + (slot - bw) / 2, h = d * unit;
    const isTruth = truth.includes(i), isPred = sem.pred.includes(i);
    const [stroke, fill] = isTruth ? [C.amber, C.amberSoft] : [C.blue, C.blueSoft];
    s.rect(x0, base - h, bw, h, { color: stroke, fill, fillStyle: 'solid' });
    if (isPred) s.rect(x0 - 5, base - h - 5, bw + 10, h + 5, { color: C.rose, width: 2.5, fillStyle: 'solid', fill: 'none' });
    s.text(x0 + bw / 2, base + 24, String(i), { font: 'mono', size: 15 });
  });
  s.text(440, base + 56, 'gap after sentence i (0 to 16); window = sentence i-1, i, i+1', { size: 18 });
  s.text(440, 392, `The two real topic changes rank ${sem.rank5} and ${sem.rank11} of 17 gaps, so the rule misses them.`, { size: 18 });
  save('38.2-semantic-gaps.svg', s);
}

console.log('wrote 38.2 diagrams');
