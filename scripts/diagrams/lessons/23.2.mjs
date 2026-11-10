// Diagrams for Lesson 23.2 (WordPiece & SentencePiece / Unigram). Run: node scripts/diagrams/lessons/23.2.mjs
// Numbers come from scripts/diagrams/lessons/23.2_data.py, 23.2_unigram_train.py and 23.2_grow.py,
// and from the lesson's SentencePiece / tokenizers code blocks.
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

// ---------------------------------------------------------------- family map
{
  const s = new Sketch(880, 400, { title: 'WordPiece, BPE and Unigram compared; SentencePiece is a library that implements BPE and Unigram', seed: 2301 });
  const cols = [
    {
      x: 30, name: 'WordPiece', color: C.violet, soft: C.roseSoft,
      train: ['grow: merge the pair with', 'the best ratio', 'count(ab) ÷ count(a)·count(b)'],
      enc: ['greedy longest match,', 'left to right, ## inside words'],
      used: 'BERT',
    },
    {
      x: 310, name: 'BPE (Lesson 23.1)', color: C.amber, soft: C.amberSoft,
      train: ['grow: merge the most', 'frequent pair', 'count(ab)'],
      enc: ['replay the learned', 'merges in order'],
      used: 'Llama 1 (SentencePiece BPE)',
    },
    {
      x: 590, name: 'Unigram LM', color: C.blue, soft: C.blueSoft,
      train: ['shrink: start huge, run EM,', 'drop pieces whose loss', 'hurts likelihood least'],
      enc: ['Viterbi: most probable', 'segmentation (or sample one)'],
      used: 'T5, ALBERT, XLNet',
    },
  ];
  s.line(300, 30, 870, 30, { color: C.green, width: 1.4, dash: '7 7' });
  s.line(870, 30, 870, 360, { color: C.green, width: 1.4, dash: '7 7' });
  s.line(300, 360, 870, 360, { color: C.green, width: 1.4, dash: '7 7' });
  s.line(300, 30, 300, 360, { color: C.green, width: 1.4, dash: '7 7' });
  s.text(585, 388, 'SentencePiece library: trains BPE or Unigram on raw text, spaces become ▁', { size: 20, color: C.green });
  cols.forEach((c) => {
    const cx = c.x + 130;
    s.text(cx, 66, c.name, { size: 26, weight: 700, color: c.color });
    s.rect(c.x + 8, 84, 244, 104, { color: c.color, fill: c.soft, fillStyle: 'solid' });
    s.text(c.x + 20, 108, 'TRAIN', { size: 15, anchor: 'start', color: C.muted, weight: 700 });
    s.text(cx, 132, c.train, { size: 19 });
    s.rect(c.x + 8, 204, 244, 80, { color: c.color });
    s.text(c.x + 20, 228, 'ENCODE', { size: 15, anchor: 'start', color: C.muted, weight: 700 });
    s.text(cx, 252, c.enc, { size: 19 });
    s.text(cx, 320, ['used by:', c.used], { size: 19, color: C.muted });
  });
  save('23.2-family.svg', s);
}

// ---------------------------------------------------------------- MaxMatch trace
// Data: 23.2_data.py -> start 0: 8 tries -> un; start 2: 5 tries -> ##aff; start 5: 1 try -> ##able
{
  const s = new Sketch(880, 370, { title: 'Greedy longest-match-first WordPiece on unaffable', seed: 2302 });
  const word = 'unaffable';
  const x0 = 40;
  const cw = 40;
  const y0 = 40;
  [...word].forEach((ch, i) => {
    s.rect(x0 + i * cw, y0, cw, 40, { color: C.ink, width: 1.4 });
    s.text(x0 + i * cw + cw / 2, y0 + 27, ch, { font: 'mono', size: 18 });
  });
  const steps = [
    { start: 0, end: 2, piece: 'un', tries: 8, first: 'unaffable' },
    { start: 2, end: 5, piece: '##aff', tries: 5, first: '##affable' },
    { start: 5, end: 9, piece: '##able', tries: 1, first: '##able' },
  ];
  steps.forEach((st, k) => {
    const y = 110 + k * 62;
    // the first (longest) candidate tried: from start to end of word
    if (st.tries > 1) {
      s.line(x0 + st.start * cw + 4, y + 8, x0 + 9 * cw - 4, y + 8, { color: C.rose, width: 1.4, dash: '5 6' });
      s.text(x0 + 9 * cw + 6, y + 13, '✗', { size: 18, color: C.rose, anchor: 'start' });
    }
    s.rect(x0 + st.start * cw + 2, y + 18, (st.end - st.start) * cw - 4, 32, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x0 + ((st.start + st.end) / 2) * cw, y + 40, st.piece, { font: 'mono', size: 15 });
    const msg = st.tries > 1
      ? `start ${st.start}: ${st.tries} tries, longest first (${st.first} ✗ …)`
      : `start ${st.start}: first try is in the vocabulary`;
    s.text(450, y + 30, msg, { size: 19, anchor: 'start', color: C.ink });
    s.text(450, y + 52, `→ keep ${st.piece}, jump to position ${st.end}`, { size: 18, anchor: 'start', color: C.green });
  });
  s.note(40, 312, 800, 40, 'If no candidate matches at some position, the WHOLE word becomes [UNK]:  unzip → [UNK]', { size: 19, rotate: -0.5 });
  save('23.2-maxmatch.svg', s);
}

// ---------------------------------------------------------------- Unigram lattice
// Data: 23.2_data.py -> best log P per position [0, -2.996, -2.996, -1.897, -4.2]
{
  const s = new Sketch(880, 360, { title: 'Segmentation lattice of hugs under a unigram model, with the Viterbi path', seed: 2303 });
  const nx = [90, 260, 430, 600, 770];
  const by = 230;
  const best = ['0', '−3.00', '−3.00', '−1.90', '−4.20'];
  const chars = ['h', 'u', 'g', 's'];
  const pc = { h: 0.05, u: 0.05, g: 0.05, s: 0.1 };
  // single-character edges
  chars.forEach((ch, i) => {
    const onPath = ch === 's';
    s.arrow(nx[i] + 16, by, nx[i + 1] - 16, by, { color: onPath ? C.green : C.muted, width: onPath ? 3 : 1.4, head: 10 });
    s.text((nx[i] + nx[i + 1]) / 2, by + 30, `${ch} · ${pc[ch].toFixed(2)}`, { font: 'mono', size: 15, color: onPath ? C.green : C.ink });
  });
  // multi-character arcs
  const arcs = [
    { a: 0, b: 2, piece: 'hu', p: '0.05', h: 74 },
    { a: 1, b: 3, piece: 'ug', p: '0.10', h: 74 },
    { a: 2, b: 4, piece: 'gs', p: '0.05', h: 74 },
    { a: 0, b: 3, piece: 'hug', p: '0.15', h: 186, path: true },
  ];
  arcs.forEach((r) => {
    const x1 = nx[r.a] + 8;
    const x2 = nx[r.b] - 8;
    const cx = (x1 + x2) / 2;
    const cy = by - r.h;
    s.curveArrow(x1, by - 12, cx, cy, x2, by - 12, { color: r.path ? C.green : C.muted, width: r.path ? 3 : 1.4, head: 10 });
    s.text(cx, cy - 10, `${r.piece} · ${r.p}`, { font: 'mono', size: 15, color: r.path ? C.green : C.ink });
  });
  nx.forEach((x, i) => {
    s.circle(x, by, 26, { color: C.ink, fill: C.amberSoft, fillStyle: 'solid', width: 1.4 });
    s.text(x, by + 6, String(i), { font: 'mono', size: 14 });
    s.text(x, by + 66, best[i], { font: 'mono', size: 14, color: C.amber });
  });
  s.text(30, by + 66, 'best', { size: 18, color: C.amber, anchor: 'start' });
  s.text(30, by + 84, 'log P', { size: 18, color: C.amber, anchor: 'start' });
  s.text(440, 342, 'Viterbi path: hug + s,  P = 0.15 × 0.10 = 0.015  (log P = −4.20)', { size: 21, color: C.green });
  save('23.2-lattice.svg', s);
}

// ---------------------------------------------------------------- grow vs prune
// Data: 23.2_unigram_train.py -> Unigram sizes [211, 168, 134, 107, 85, 68, 54, 43, 36]
//       23.2_grow.py -> BPE 24 -> 36 and WordPiece 32 -> 44 in 12 merges (+1 piece per merge)
{
  const s = new Sketch(880, 400, { title: 'Vocabulary size on a log scale: Unigram prunes from 211 to 36; BPE grows from 24 to 36 and WordPiece from 32 to 44', seed: 2304 });
  const X0 = 100;
  const Y0 = 330; // value 20
  const H = 270; // pixels from 20 to 250 (log scale)
  const lg = Math.log10;
  const yv = (v) => Y0 - ((lg(v) - lg(20)) / (lg(250) - lg(20))) * H;
  const XL = 120;
  const XR = 630;
  s.line(X0, Y0, XR + 30, Y0, { color: C.ink });
  s.line(X0, Y0, X0, Y0 - H - 10, { color: C.ink });
  [20, 30, 50, 100, 200].forEach((v) => {
    s.line(X0 - 5, yv(v), X0, yv(v), { color: C.ink, width: 1 });
    s.text(X0 - 10, yv(v) + 5, String(v), { font: 'mono', size: 12, anchor: 'end', color: C.muted });
  });
  s.text(34, Y0 - H / 2, 'vocabulary size (log scale)', { size: 18, color: C.muted, rotate: -90 });
  s.text((XL + XR) / 2, Y0 + 32, 'training progress →   (Unigram: 8 pruning rounds; BPE, WordPiece: 12 merges)', { size: 17, color: C.muted });
  // target line
  s.line(X0, yv(36), XR + 20, yv(36), { color: C.green, width: 1.2, dash: '6 6' });
  s.text(XR + 26, yv(36) + 6, 'target 36', { size: 18, color: C.green, anchor: 'start' });
  // Unigram: 9 points over 8 pruning rounds
  const sizes = [211, 168, 134, 107, 85, 68, 54, 43, 36];
  const ux = (i) => XL + (i * (XR - XL)) / 8;
  sizes.forEach((v, i) => {
    if (i > 0) s.line(ux(i - 1), yv(sizes[i - 1]), ux(i), yv(v), { color: C.blue, width: 2.2 });
    s.circle(ux(i), yv(v), 9, { color: C.blue, fill: C.blue, fillStyle: 'solid', width: 1 });
    if (i < 8) s.text(ux(i) + 9, yv(v) - (i === 7 ? 18 : 9), String(v), { font: 'mono', size: 12, color: C.blue, anchor: 'start' });
  });
  // staircases, one piece per merge
  const stair = (start, color) => {
    const bx = (k) => XL + (k * (XR - XL)) / 12;
    for (let k = 0; k < 12; k++) {
      s.line(bx(k), yv(start + k), bx(k + 1), yv(start + k), { color, width: 2.2, roughness: 0.6 });
      s.line(bx(k + 1), yv(start + k), bx(k + 1), yv(start + k + 1), { color, width: 2.2, roughness: 0.6 });
    }
  };
  stair(24, C.amber);
  stair(32, C.violet);
  s.text(260, Y0 - 10, 'BPE: 24 characters → 36', { size: 18, color: C.amber, anchor: 'start' });
  s.text(150, yv(36) - 16, 'WordPiece: 32 units (k and ##k differ) → 44', { size: 18, color: C.violet, anchor: 'start' });
  s.note(430, 40, 330, 76, ['Unigram: start with 211 pieces,', 'each round keep the 80% whose', 'removal would hurt likelihood most'], { size: 19, rotate: 1.2 });
  save('23.2-grow-vs-prune.svg', s);
}

// ---------------------------------------------------------------- lossless round trip
{
  const s = new Sketch(880, 440, { title: 'WordPiece maps different spacings to the same tokens; SentencePiece keeps spaces as the ▁ symbol', seed: 2305 });
  const toks = (x, y, list, color, soft) => {
    let cx = x;
    list.forEach((t) => {
      const w = Math.max(26, t.length * 9 + 14);
      s.rect(cx, y, w, 30, { color, fill: soft, fillStyle: 'solid', width: 1.3, roughness: 0.9 });
      s.text(cx + w / 2, y + 21, t, { font: 'mono', size: 14 });
      cx += w + 5;
    });
    return cx;
  };
  // WordPiece half
  s.text(30, 36, 'WordPiece (BERT-style pipeline)', { size: 25, weight: 700, color: C.violet, anchor: 'start' });
  s.text(30, 84, '"Unable,affable!"', { font: 'mono', size: 14, anchor: 'start' });
  s.text(30, 134, '"Unable ,\u00a0 affable !"', { font: 'mono', size: 14, anchor: 'start' });
  s.arrow(222, 80, 326, 100, { color: C.muted, width: 1.4, head: 9 });
  s.arrow(222, 130, 326, 112, { color: C.muted, width: 1.4, head: 9 });
  const endW = toks(334, 90, ['un', '##able', ',', 'aff', '##able', '!'], C.violet, C.roseSoft);
  s.arrow(endW + 4, 105, endW + 40, 105, { color: C.rose, width: 1.6, head: 9 });
  s.text(endW + 46, 101, '"unable,', { font: 'mono', size: 13, anchor: 'start', color: C.rose });
  s.text(endW + 46, 119, ' affable!"', { font: 'mono', size: 13, anchor: 'start', color: C.rose });
  s.text(334, 166, 'same tokens → decoder must guess the spaces; case is gone too', { size: 19, anchor: 'start', color: C.rose });

  s.line(30, 196, 850, 196, { color: C.muted, width: 1, dash: '6 8' });

  // SentencePiece half
  s.text(30, 236, 'SentencePiece (Unigram model from the lesson)', { size: 25, weight: 700, color: C.blue, anchor: 'start' });
  s.text(30, 288, '"Eva cooked."', { font: 'mono', size: 14, anchor: 'start' });
  s.text(30, 348, '"Eva cooked ."', { font: 'mono', size: 14, anchor: 'start' });
  s.arrow(160, 284, 200, 284, { color: C.muted, width: 1.4, head: 9 });
  s.arrow(160, 344, 200, 344, { color: C.muted, width: 1.4, head: 9 });
  const a = toks(208, 268, ['▁', 'E', 'v', 'a', '▁cook', 'e', 'd', '.'], C.blue, C.blueSoft);
  const b = toks(208, 328, ['▁', 'E', 'v', 'a', '▁cook', 'e', 'd', '▁', '.'], C.blue, C.blueSoft);
  s.arrow(a + 4, 283, 640, 283, { color: C.green, width: 1.6, head: 9 });
  s.arrow(b + 4, 343, 640, 343, { color: C.green, width: 1.6, head: 9 });
  s.text(648, 288, '"Eva cooked."  ✓', { font: 'mono', size: 13, anchor: 'start', color: C.green });
  s.text(648, 348, '"Eva cooked ."  ✓', { font: 'mono', size: 13, anchor: 'start', color: C.green });
  s.text(208, 400, 'the space is a token (▁): to decode, join the pieces, turn ▁ into a space, drop the first one', { size: 19, anchor: 'start', color: C.green });
  save('23.2-lossless.svg', s);
}
