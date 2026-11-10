// Diagrams for Lesson 23.3 (Hugging Face tokenizers). Run: node scripts/diagrams/lessons/23.3.mjs
// Every token, id and offset shown here was printed by the lesson's code (tokenizers 0.23.3).
// Timings in 23.3-speed come from scripts/diagrams/lessons/23.3_speed.py (one run, Apple M5).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-04-transformers-llms/chapter-23-tokenization/diagrams');
mkdirSync(OUT, { recursive: true });
// Fira Code would draw "0x" as "0×" (a ligature); switch ligatures off for the whole figure.
const NOLIG = `<g style="font-variant-ligatures:none;font-feature-settings:'liga' 0,'calt' 0">`;
const save = (name, sk) => {
  sk.out.unshift(NOLIG);
  sk.out.push('</g>');
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// A row of token "chips": small boxes with monospace text. Returns the x after the last chip.
const CH = 9.2; // approx. width of one Fira Code character at size 15
function chips(s, x, y, tokens, o = {}) {
  const { color = C.ink, fill, h = 34, gap = 6, size = 15, textColor = C.ink, widths } = o;
  tokens.forEach((t, i) => {
    const w = widths ? widths[i] : Math.max(30, 16 + CH * [...t].length);
    s.rect(x, y, w, h, { color, fill, fillStyle: 'solid', width: 1.4, roughness: 0.8 });
    s.text(x + w / 2, y + h / 2 + 5, t, { font: 'mono', size, color: textColor });
    x += w + gap;
  });
  return x;
}

// ---------------------------------------------------------------- 23.3 pipeline
{
  const s = new Sketch(880, 470, { title: 'The four stages of a Hugging Face tokenizer, applied to "The Café cat!"', seed: 2331 });
  const rows = [
    { y: 26, label: 'input text', sub: '', c: C.muted },
    { y: 92, label: '① normalizer', sub: 'NFD, strip accents, lowercase', c: C.blue },
    { y: 166, label: '② pre-tokenizer', sub: 'Whitespace: split into words', c: C.violet },
    { y: 240, label: '③ model', sub: 'BPE, 27-token vocabulary', c: C.amber },
    { y: 314, label: '④ post-processor', sub: 'template [CLS] $A [SEP]', c: C.green },
  ];
  rows.forEach((r) => {
    s.text(20, r.y + 18, r.label, { size: 25, weight: 700, anchor: 'start', color: r.c === C.muted ? C.ink : r.c });
    if (r.sub) s.text(20, r.y + 42, r.sub, { size: 18, anchor: 'start', color: C.muted });
  });
  // arrows between rows, in the gutter on the left of the chips
  [[60, 96], [126, 170], [200, 244], [274, 318]].forEach(([a, b]) => s.arrow(262, a, 262, b, { color: C.muted, width: 1.4, head: 9 }));

  chips(s, 290, 20, ['The Café cat!'], { color: C.muted });
  chips(s, 290, 88, ['the cafe cat!'], { color: C.blue, fill: C.blueSoft });
  chips(s, 290, 162, ['the', 'cafe', 'cat', '!'], { color: C.violet, gap: 14 });
  // model output, with unknowns in rose
  const model = ['the', 'c', 'a', '[UNK]', 'e', 'cat', '[UNK]'];
  let x = 290;
  model.forEach((t) => {
    const unk = t === '[UNK]';
    x = chips(s, x, 236, [t], { color: unk ? C.rose : C.amber, fill: unk ? C.roseSoft : C.amberSoft });
  });
  const post = ['[CLS]', 'the', 'c', 'a', '[UNK]', 'e', 'cat', '[UNK]', '[SEP]'];
  x = 290;
  post.forEach((t, i) => {
    const sp = i === 0 || i === post.length - 1;
    x = chips(s, x, 310, [t], { color: sp ? C.green : C.muted, fill: sp ? C.greenSoft : undefined });
  });
  s.text(290, 374, 'ids      [1, 18, 6, 5, 0, 7, 19, 0, 2]', { font: 'mono', size: 15, anchor: 'start' });
  s.text(290, 398, 'offsets  (0,0) (0,3) (4,5) (5,6) (6,7) (7,8) (9,12) (12,13) (0,0)', { font: 'mono', size: 13, anchor: 'start', color: C.muted });
  s.note(20, 396, 248, 62, ["'f' and '!' never appeared", 'in training → [UNK]'], { size: 19, rotate: -1.5 });
  s.note(440, 412, 420, 50, ["token 'e' has offsets (7,8) → 'é' in the original"], { size: 19, rotate: 1 });
  save('23.3-pipeline.svg', s);
}

// ---------------------------------------------------------------- 23.3 unseen characters
{
  const s = new Sketch(880, 440, { title: 'Three ways to handle characters missing from the vocabulary, on "café🤗"', seed: 2332 });
  s.text(20, 36, 'input', { size: 24, weight: 700, anchor: 'start' });
  // characters and their UTF-8 bytes
  const chars = [
    ['c', '63'],
    ['a', '61'],
    ['f', '66'],
    ['é', 'C3 A9'],
    ['🤗', 'F0 9F A4 97'],
  ];
  let x = 230;
  chars.forEach(([ch, by]) => {
    const w = Math.max(48, 18 + CH * by.length);
    const known = ch.length === 1 && 'caf'.includes(ch);
    s.rect(x, 14, w, 36, { color: known ? C.ink : C.rose, width: 1.4, roughness: 0.8 });
    s.text(x + w / 2, 40, ch, { font: 'mono', size: 19, color: known ? C.ink : C.rose });
    s.text(x + w / 2, 72, by, { font: 'mono', size: 13, color: C.muted });
    x += w + 10;
  });
  s.text(x + 6, 40, 'vocab: {c, a, f}', { size: 20, anchor: 'start', color: C.muted });
  s.text(x + 6, 72, '← UTF-8 bytes (hex)', { size: 18, anchor: 'start', color: C.muted });

  const rows = [
    {
      y: 110, name: '[UNK] only', sub: 'no fallback', c: C.rose, fill: C.roseSoft,
      toks: ['c', 'a', 'f', '<unk>', '<unk>'], verdict: ['5 tokens', 'decodes to "caf<unk><unk>": lossy'],
    },
    {
      y: 210, name: 'byte fallback', sub: 'SentencePiece, LLaMA', c: C.green, fill: C.greenSoft,
      toks: ['c', 'a', 'f', '<0xC3>', '<0xA9>', '<0xF0>', '<0x9F>', '<0xA4>', '<0x97>'], verdict: ['9 tokens', 'only unknown characters become bytes'],
    },
    {
      y: 310, name: 'byte-level BPE', sub: 'GPT-2, RoBERTa', c: C.blue, fill: C.blueSoft,
      toks: ['c', 'a', 'f', 'Ã', '©', 'ð', 'Ł', '¤', 'Ĺ'], verdict: ['9 tokens', 'every character is bytes first'],
    },
  ];
  rows.forEach((r) => {
    s.text(20, r.y + 24, r.name, { size: 24, weight: 700, anchor: 'start', color: r.c });
    s.text(20, r.y + 48, r.sub, { size: 18, anchor: 'start', color: C.muted });
    let cx = 230;
    r.toks.forEach((t) => {
      const known = ['c', 'a', 'f'].includes(t);
      cx = chips(s, cx, r.y + 4, [t], { color: known ? C.ink : r.c, fill: known ? undefined : r.fill, gap: 5, size: 14 });
    });
    s.text(230, r.y + 66, `${r.verdict[0]} · ${r.verdict[1]}`, { size: 19, anchor: 'start', color: C.muted });
  });
  s.note(500, 392, 360, 40, 'byte fallback and byte-level both round-trip exactly', { size: 19, rotate: -1 });
  save('23.3-unseen-chars.svg', s);
}

// ---------------------------------------------------------------- 23.3 byte map
{
  // GPT-2 bytes_to_unicode (same algorithm as openai/gpt-2 src/encoder.py)
  const keep = [];
  for (let b = 0x21; b <= 0x7e; b++) keep.push(b);
  for (let b = 0xa1; b <= 0xac; b++) keep.push(b);
  for (let b = 0xae; b <= 0xff; b++) keep.push(b);
  const map = new Map(keep.map((b) => [b, b]));
  let n = 0;
  for (let b = 0; b < 256; b++) if (!map.has(b)) map.set(b, 256 + n++);
  const kept = keep.length; // 188
  const moved = 256 - kept; // 68

  const s = new Sketch(880, 550, { title: 'GPT-2 byte-to-character table: 188 bytes keep their own character, 68 are moved to U+0100 and up', seed: 2333 });
  const cell = 27;
  const X = 54;
  const Y = 64;
  s.text(X + 8 * cell, 30, 'all 256 byte values, as 16 rows × 16 columns', { size: 22, weight: 700 });
  for (let r = 0; r < 16; r++) {
    s.text(X - 10, Y + r * cell + 19, `${r.toString(16).toUpperCase()}_`, { font: 'mono', size: 12, anchor: 'end', color: C.muted });
    s.text(X + r * cell + cell / 2, Y - 8, `_${r.toString(16).toUpperCase()}`, { font: 'mono', size: 12, color: C.muted });
  }
  const fills = [];
  const labels = [];
  for (let b = 0; b < 256; b++) {
    const r = Math.floor(b / 16);
    const c = b % 16;
    const cp = map.get(b);
    const shifted = cp !== b;
    const x = X + c * cell;
    const y = Y + r * cell;
    fills.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" style="fill:${shifted ? C.amberSoft : C.blueSoft};stroke:none"/>`);
    const ch = String.fromCodePoint(cp);
    labels.push([x + cell / 2, y + 19, ch, shifted]);
  }
  s.raw(fills.join('\n'));
  s.grid(X, Y, 16, 16, cell, { color: C.ink, width: 1.4, roughness: 0.6 });
  labels.forEach(([x, y, ch, shifted]) => s.text(x, y, ch, { font: 'mono', size: 14, color: shifted ? C.amber : C.ink }));
  // highlight the newline byte 0x0A (row 0, col A) and the space byte 0x20 (row 2, col 0)
  const RX = 520;
  const hi = (b) => {
    const x = X + (b % 16) * cell;
    const y = Y + Math.floor(b / 16) * cell;
    s.rect(x - 2, y - 2, cell + 4, cell + 4, { color: C.rose, width: 2.4, roughness: 0.7 });
  };
  hi(0x0a);
  hi(0x20);
  s.rect(RX, 84, 26, 22, { color: C.rose, width: 2.2, roughness: 0.7 });
  s.text(RX + 38, 102, 'two examples (rose boxes):', { size: 19, anchor: 'start', color: C.rose });
  s.text(RX + 38, 130, 'row 0_, col _A: newline 0x0A → Ċ', { size: 19, anchor: 'start' });
  s.text(RX + 38, 156, 'row 2_, col _0: space 0x20 → Ġ', { size: 19, anchor: 'start' });

  s.rect(RX, 210, 26, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1.2 });
  s.text(RX + 38, 228, `${kept} printable bytes keep their character`, { size: 19, anchor: 'start' });
  s.rect(RX, 248, 26, 22, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.2 });
  s.text(RX + 38, 266, `${moved} bytes (controls, space, 0x7F–0xA0, 0xAD)`, { size: 19, anchor: 'start' });
  s.text(RX + 38, 288, 'move to U+0100 … U+0143', { size: 19, anchor: 'start' });
  s.note(RX, 330, 330, 92, ['Why? Every token stays a printable', 'string, and the map is one-to-one,', 'so decoding gives back the exact bytes.'], { size: 19, rotate: 1 });
  s.text(X + 8 * cell, Y + 16 * cell + 34, 'é = bytes C3 A9 → "Ã©"    space+cat → "Ġcat"', { font: 'mono', size: 14, color: C.muted });
  save('23.3-byte-map.svg', s);
}

// ---------------------------------------------------------------- 23.3 speed
{
  // From scripts/diagrams/lessons/23.3_speed.py: 2.86 MB of text, best of 3, Apple M5 (10 cores), tokenizers 0.23.3
  const runs = [
    { name: 'Python, no cache', mbs: 1.3, sec: 2.209, py: true },
    { name: 'Python + word cache (cold)', mbs: 8.7, sec: 0.328, py: true },
    { name: 'Python + word cache (warm)', mbs: 29.3, sec: 0.098, py: true },
    { name: 'Rust, encode_batch, 1 thread', mbs: 8.5, sec: 0.338 },
    { name: 'Rust, batch_fast, 1 thread', mbs: 15.5, sec: 0.184 },
    { name: 'Rust, encode_batch, 10 cores', mbs: 51.9, sec: 0.055 },
    { name: 'Rust, batch_fast, 10 cores', mbs: 68.3, sec: 0.042 },
  ];
  const s = new Sketch(880, 492, { title: 'Encoding throughput, pure-Python BPE versus the Rust core', seed: 2334 });
  s.text(440, 32, 'throughput in MB of text per second (higher is better)', { size: 23, weight: 700 });
  const X0 = 300;
  const scale = 380 / 70;
  runs.forEach((r, i) => {
    const y = 58 + i * 50;
    s.text(X0 - 14, y + 23, r.name, { size: 19, anchor: 'end', color: r.py ? C.blue : C.amber });
    const w = Math.max(5, r.mbs * scale);
    s.rect(X0, y + 4, w, 28, { color: r.py ? C.blue : C.amber, fill: r.py ? C.blue : C.amber, width: 1.2, roughness: 0.9 });
    s.text(X0 + w + 10, y + 24, `${r.mbs} MB/s  (${r.sec.toFixed(3)} s)`, { font: 'mono', size: 13, anchor: 'start' });
  });
  s.line(X0, 52, X0, 408, { color: C.muted, width: 1 });
  s.text(X0 + 4, 430, 'batch_fast = encode_batch_fast: same ids, offsets not computed', { size: 18, anchor: 'start', color: C.muted });
  s.note(24, 416, 250, 66, ['Python and Rust: same ids', 'one run, Apple M5'], { size: 18, rotate: -1 });
  save('23.3-speed.svg', s);
}
