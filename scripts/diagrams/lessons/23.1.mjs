// Diagrams for Lesson 23.1 (BPE tokenization). Run: node scripts/diagrams/lessons/23.1.mjs
// Numbers come from scripts/diagrams/lessons/23.1_data.py and the lesson's code blocks.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-04-transformers-llms/chapter-23-tokenization/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// A row of symbol boxes; returns the x after the last box.
const symbols = (s, x, y, items, o = {}) => {
  const { h = 36, size = 15, gap = 6, pad = 14, color = C.ink, fill, hi = [] } = o;
  let cx = x;
  items.forEach((t, i) => {
    const w = Math.max(30, t.length * size * 0.62 + pad);
    const isHi = hi.includes(i);
    s.rect(cx, y, w, h, {
      color: isHi ? C.green : color,
      fill: isHi ? C.greenSoft : fill,
      fillStyle: 'solid',
      width: isHi ? 2 : 1.4,
      roughness: 0.9,
    });
    s.text(cx + w / 2, y + h / 2 + size * 0.36, t, { font: 'mono', size });
    cx += w + gap;
  });
  return cx;
};

// ---------------------------------------------------------------- granularity
{
  const s = new Sketch(880, 350, { title: 'The unseen word lowest split three ways: word-level, character-level and BPE', seed: 2311 });
  s.text(440, 34, 'The unseen word "lowest", three ways', { size: 27, weight: 700 });
  const rows = [
    { y: 70, name: 'word-level', vocab: 'vocab: the 4 training words' },
    { y: 155, name: 'characters', vocab: 'vocab: 10 letters' },
    { y: 240, name: 'BPE, 10 merges', vocab: 'vocab: 11 symbols + 10 merges' },
  ];
  rows.forEach((r) => {
    s.text(24, r.y + 25, r.name, { size: 23, weight: 700, anchor: 'start' });
    s.text(24, r.y + 50, r.vocab, { size: 17, color: C.muted, anchor: 'start' });
  });
  const X0 = 250;
  // word-level
  s.rect(X0, 70, 90, 38, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(X0 + 45, 95, '[UNK]', { font: 'mono', size: 16 });
  s.text(X0 + 116, 95, '1 token, but the meaning is gone', { size: 21, color: C.rose, anchor: 'start' });
  // characters
  const xEnd = symbols(s, X0, 155, ['l', 'o', 'w', 'e', 's', 't'], { color: C.blue });
  s.text(xEnd + 20, 180, '6 tokens: nothing unknown, but long', { size: 21, color: C.blue, anchor: 'start' });
  // BPE
  const xb = symbols(s, X0, 240, ['low', 'est</w>'], { hi: [0, 1] });
  s.text(xb + 20, 265, '2 tokens, both seen in training', { size: 21, color: C.green, anchor: 'start' });
  s.note(640, 270, 220, 62, ['training words: low,', 'lower, newest, widest'], { size: 19, rotate: 1.5 });
  save('23.1-granularity.svg', s);
}

// ---------------------------------------------------------------- pair counts
{
  const s = new Sketch(880, 380, { title: 'Toy corpus as symbols and its adjacent-pair counts before the first merge', seed: 2312 });
  s.text(190, 34, 'corpus (word × count)', { size: 24, weight: 700 });
  const corpus = [
    [5, ['l', 'o', 'w', '</w>']],
    [2, ['l', 'o', 'w', 'e', 'r', '</w>']],
    [6, ['n', 'e', 'w', 'e', 's', 't', '</w>']],
    [3, ['w', 'i', 'd', 'e', 's', 't', '</w>']],
  ];
  corpus.forEach(([f, sy], i) => {
    const y = 62 + i * 54;
    s.text(40, y + 25, `${f} ×`, { size: 22, anchor: 'end', color: C.muted });
    symbols(s, 50, y, sy, { size: 14, gap: 4, pad: 10, h: 34 });
  });
  s.line(420, 50, 420, 290, { color: C.muted, width: 1.2, dash: '6 8' });

  s.text(650, 34, 'pair counts (weighted)', { size: 24, weight: 700 });
  const pairs = [['e s', 9], ['s t', 9], ['t </w>', 9], ['w e', 8], ['l o', 7], ['o w', 7], ['n e', 6], ['e w', 6], ['w </w>', 5]];
  const unit = 20;
  pairs.forEach(([p, c], i) => {
    const y = 56 + i * 26;
    const tie = c === 9;
    s.text(540, y + 17, p, { font: 'mono', size: 14, anchor: 'end', color: tie ? C.ink : C.muted });
    s.rect(550, y + 3, c * unit, 18, { color: tie ? C.amber : C.blue, fill: tie ? C.amber : C.blue, width: 1, roughness: 0.8, hachureGap: 4 });
    s.text(558 + c * unit, y + 18, String(c), { font: 'mono', size: 13, anchor: 'start' });
  });
  s.curveArrow(800, 300, 868, 190, 766, 92, { color: C.amber, width: 1.4, head: 9 });
  s.text(640, 318, ['three-way tie at 9: the first pair', 'seen wins, so merge 1 is e + s → es'], { size: 19, color: C.amber });
  s.note(40, 300, 360, 62, ['repeat: count pairs → merge the', 'most frequent → record the merge'], { size: 19 });
  save('23.1-pair-counts.svg', s);
}

// ---------------------------------------------------------------- encode lowest
{
  const s = new Sketch(880, 380, { title: 'Encoding lowest by applying learned merges in rank order', seed: 2313 });
  s.text(440, 32, 'Encode "lowest": apply merges by rank, lowest rank first', { size: 25, weight: 700 });
  const steps = [
    ['start', ['l', 'o', 'w', 'e', 's', 't', '</w>'], []],
    ['rank 1: e + s', ['l', 'o', 'w', 'es', 't', '</w>'], [3]],
    ['rank 2: es + t', ['l', 'o', 'w', 'est', '</w>'], [3]],
    ['rank 3: est + </w>', ['l', 'o', 'w', 'est</w>'], [3]],
    ['rank 4: l + o', ['lo', 'w', 'est</w>'], [0]],
    ['rank 5: lo + w', ['low', 'est</w>'], [0]],
  ];
  steps.forEach(([lab, sy, hi], i) => {
    const y = 56 + i * 46;
    s.text(220, y + 24, lab, { font: 'mono', size: 14, anchor: 'end', color: i === 0 ? C.muted : C.ink });
    symbols(s, 236, y, sy, { size: 14, gap: 5, pad: 10, h: 34, hi });
  });
  s.note(560, 120, 300, 112, ['rank 9 (low + </w>) never', 'fires: "low" is followed', 'by est</w>, not </w>.', 'No learned pair left → stop.'], { size: 19, rotate: 1.5 });
  s.text(440, 362, 'Same rules, same order as training: new words split the same way the corpus did', { size: 19, color: C.muted });
  save('23.1-encode.svg', s);
}

// ---------------------------------------------------------------- bytes
{
  const s = new Sketch(880, 330, { title: 'Byte-level BPE: the characters of naïve and a waving-hand emoji become UTF-8 bytes', seed: 2314 });
  s.text(440, 32, 'Byte-level BPE starts from UTF-8 bytes, not characters', { size: 25, weight: 700 });
  const chars = [
    ['n', [110]], ['a', [97]], ['ï', [195, 175]], ['v', [118]], ['e', [101]], ['space', [32]], ['👋', [240, 159, 145, 139]],
  ];
  const bw = 58;
  const gap = 6;
  let x = 60;
  s.text(40, 92, 'chars', { size: 20, color: C.muted, anchor: 'end' });
  s.text(40, 192, 'bytes', { size: 20, color: C.muted, anchor: 'end' });
  chars.forEach(([ch, bytes]) => {
    const w = bytes.length * bw + (bytes.length - 1) * gap;
    const multi = bytes.length > 1;
    s.rect(x, 64, w, 42, { color: multi ? C.amber : C.blue, fill: multi ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
    if (ch === '👋') s.text(x + w / 2, 93, '👋', { size: 22 });
    else s.text(x + w / 2, 93, ch === 'space' ? '␣' : ch, { font: 'mono', size: 18 });
    bytes.forEach((b, j) => {
      const bx = x + j * (bw + gap);
      s.rect(bx, 164, bw, 40, { color: C.ink, width: 1.4, roughness: 0.9 });
      s.text(bx + bw / 2, 190, String(b), { font: 'mono', size: 15 });
    });
    if (multi) {
      s.line(x + w / 2, 110, x + w / 2, 122, { color: C.muted, width: 1.2 });
      s.text(x + w / 2, 141, `${bytes.length} bytes`, { size: 18, color: C.amber });
      s.line(x + w / 2, 148, x + w / 2, 158, { color: C.muted, width: 1.2 });
    } else {
      s.line(x + w / 2, 110, x + w / 2, 158, { color: C.muted, width: 1.2 });
    }
    x += w + 14;
  });
  s.text(60, 236, '7 characters → 11 bytes; each byte is an id in 0…255', { size: 20, anchor: 'start' });
  s.note(60, 256, 560, 60, ['the 256 byte values are the starting vocabulary,', 'so no string can ever be "unknown"'], { size: 19 });
  save('23.1-bytes.svg', s);
}

// ---------------------------------------------------------------- compression curve
// Data: scripts/diagrams/lessons/23.1_data.py (Zen of Python, 856 bytes, in-sample)
{
  const pts = [[0, 1.0], [25, 1.4], [50, 1.68], [75, 1.93], [100, 2.18], [125, 2.38], [150, 2.56], [175, 2.77], [200, 3.01], [225, 3.31], [250, 3.66], [275, 4.1], [300, 4.3]];
  const s = new Sketch(880, 360, { title: 'Bytes per token versus number of merges on the Zen of Python', seed: 2315 });
  const x0 = 110, y0 = 290, W = 600, H = 220;
  const X = (m) => x0 + (m / 300) * W;
  const Y = (v) => y0 - (v / 4.5) * H;
  s.text(440, 32, 'More merges → fewer, longer tokens (until pairs run out)', { size: 25, weight: 700 });
  s.line(x0, y0, x0 + W + 10, y0, { color: C.ink });
  s.line(x0, y0, x0, y0 - H - 10, { color: C.ink });
  [0, 100, 200, 300].forEach((m) => s.text(X(m), y0 + 22, String(m), { font: 'mono', size: 13, color: C.muted }));
  [1, 2, 3, 4].forEach((v) => s.text(x0 - 10, Y(v) + 5, String(v), { font: 'mono', size: 13, color: C.muted, anchor: 'end' }));
  s.text(x0 + W / 2, y0 + 50, 'number of merges', { size: 20, color: C.muted });
  s.text(52, y0 - H / 2, 'bytes per token', { size: 20, color: C.muted, rotate: -90 });
  for (let i = 1; i < pts.length; i++) {
    s.line(X(pts[i - 1][0]), Y(pts[i - 1][1]), X(pts[i][0]), Y(pts[i][1]), { color: C.blue, width: 2.4, roughness: 0.6 });
  }
  pts.forEach(([m, v]) => s.circle(X(m), Y(v), 7, { color: C.blue, fill: C.blue, fillStyle: 'solid', width: 1 }));
  s.line(X(285), y0, X(285), Y(4.3) - 6, { color: C.rose, width: 1.4, dash: '5 6' });
  s.text(X(285) - 10, Y(4.3) - 14, 'stops at 285 merges: 4.30', { size: 19, color: C.rose, anchor: 'end' });
  s.text(X(0) + 16, Y(1.0) + 26, '1.00 (raw bytes)', { size: 18, anchor: 'start', color: C.blue });
  s.text(X(200) + 12, Y(3.01) + 22, '3.01 at 200', { size: 18, anchor: 'start', color: C.blue });
  s.note(140, 70, 320, 66, ['in-sample: measured on the same', '856-byte text it was trained on'], { size: 19, rotate: -1.5 });
  save('23.1-compression.svg', s);
}
