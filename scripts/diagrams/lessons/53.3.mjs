import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-09-production-ai/chapter-53-serving-metrics/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Numbers come from 53.3_sim.py via 53.3_data.py (run: python3 scripts/diagrams/lessons/53.3_data.py)
const D = JSON.parse(readFileSync(join(HERE, '53.3_data.json'), 'utf8'));
const pct = (v) => v.toFixed(3);

// 1. Chained block hashes
{
  const s = new Sketch(880, 410, { title: 'Blocks of four tokens with chained hashes. Two prompts share their first block; the second block has the same tokens but a different hash', seed: 531 });
  const ch = D.toy.chain;
  s.text(440, 34, "Chained block hashes: a block's hash covers its whole prefix", { size: 24, weight: 700 });
  s.text(260, 72, 'block 1 (4 tokens)', { size: 15, color: C.muted });
  s.text(400, 72, 'block 2 (4 tokens)', { size: 15, color: C.muted });
  s.text(525, 72, 'partial (2 tokens)', { size: 15, color: C.muted });
  const row = (y, label, toks1, toks2, tail, h1, h2, hi) => {
    s.text(40, y + 28, label, { size: 20, weight: 700, anchor: 'start' });
    const o2 = hi ? { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' } : {};
    s.rect(200, y, 120, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(260, y + 28, toks1, { font: 'mono', size: 17 });
    s.rect(340, y, 120, 44, hi ? o2 : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(400, y + 28, toks2, { font: 'mono', size: 17 });
    s.rect(480, y, 90, 44, { color: C.muted, dash: '6 8' });
    s.text(525, y + 28, tail, { font: 'mono', size: 17 });
    s.text(260, y + 66, `h = ${h1}`, { font: 'mono', size: 15, color: C.blue });
    s.text(400, y + 66, `h = ${h2}`, { font: 'mono', size: 15, color: hi ? C.amber : C.blue, weight: hi ? 700 : undefined });
    s.text(525, y + 66, 'not hashed', { size: 15, color: C.muted });
  };
  row(100, 'P1', '1 2 3 4', '9 9 9 9', '7 7', ch.P1[0], ch.P1[1], true);
  row(200, 'P2', '5 6 7 8', '9 9 9 9', '7 7', ch.P2[0], ch.P2[1], true);
  row(300, 'P3', '1 2 3 4', '9 9 9 9', '5 5', ch.P3[0], ch.P3[1], false);
  s.note(598, 112, 262, 100, ['Same tokens 9 9 9 9 in P1 and P2,', 'but a different hash: the hash', 'also covers the first block.'], { size: 16 });
  s.note(598, 296, 262, 84, ['P1 and P3 share h1 and h2,', 'so their first 8 tokens reuse', 'the same cached KV blocks.'], { size: 16 });
  s.text(440, 396, 'Hash = first 8 hex digits of SHA-256 over (parent hash, block tokens). Toy block size 4.', { size: 15, color: C.muted });
  save('53.3-block-chain.svg', s);
}

// 2. Tokens lost to block alignment
{
  const s = new Sketch(880, 335, { title: 'Bars show tokens a full-block cache cannot reuse for system prompts of 16, 40, 100 and 2048 tokens, block size 16', seed: 532 });
  s.text(440, 34, 'Only full blocks are reusable: tokens lost to alignment', { size: 24, weight: 700 });
  const base = 250, k = 10; // 10 px per token; worst case is B - 1 = 15 tokens
  s.line(80, base, 800, base, { color: C.muted });
  s.line(80, base - 15 * k, 800, base - 15 * k, { color: C.muted, dash: '6 8' });
  s.text(800, base - 15 * k - 10, 'worst case: B − 1 = 15', { size: 15, color: C.muted, anchor: 'end' });
  D.granularity.forEach((g, i) => {
    const lost = g.token_reuse - g.block_reuse;
    const cx = 190 + i * 170;
    const h = lost * k;
    if (h > 0) s.rect(cx - 45, base - h, 90, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12 > 230 ? base - 12 : base - h - 12, `${lost} lost`, { size: 17, weight: 700, color: C.amber });
    s.text(cx, 276, `S = ${g.S}`, { size: 18, weight: 700 });
    s.text(cx, 300, `${g.block_reuse} of ${g.token_reuse} reused`, { size: 15, color: C.muted });
  });
  s.text(440, 326, 'S = system prompt length in tokens. Lost = token-level reuse minus block-level reuse.', { size: 15, color: C.muted });
  save('53.3-granularity.svg', s);
}

// 3. Trap: request ID position
{
  const s = new Sketch(880, 270, { title: 'Hit rate with one request ID in the prompt: 0.000 when the ID is first, 0.729 when it is last', seed: 533 });
  s.text(440, 34, 'Where one per-request ID sits decides everything', { size: 24, weight: 700 });
  const X = (v) => 260 + 520 * v;
  s.text(40, 128, 'ID first', { size: 20, weight: 700, anchor: 'start' });
  s.text(X(0) + 12, 128, `${pct(D.trap_front)}: no block after the ID can match`, { size: 17, anchor: 'start', color: C.rose });
  s.text(40, 186, 'ID last', { size: 20, weight: 700, anchor: 'start' });
  s.rect(X(0), 160, X(D.trap_back) - X(0), 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(X(D.trap_back) + 12, 186, pct(D.trap_back), { size: 20, weight: 700, anchor: 'start', color: C.blue });
  s.line(X(0), 228, X(1), 228, { color: C.muted });
  for (const v of [0, 0.5, 1]) {
    s.line(X(v), 228, X(v), 234, { color: C.muted });
    s.text(X(v), 254, v.toFixed(1), { size: 15, color: C.muted });
  }
  save('53.3-request-id-trap.svg', s);
}

// 4. Hit rate versus capacity
{
  const rows = D.sweep;
  const s = new Sketch(880, 390, { title: 'Token hit rate rises with cache capacity from 0 to 0.681 and flattens; 128 blocks holds all eight system prompts but reaches only 0.502', seed: 534 });
  s.text(440, 34, 'Cache capacity versus token hit rate', { size: 24, weight: 700 });
  const base = 300, k = 300; // 300 px per unit of hit rate
  const ceil = D.sweep[D.sweep.length - 1].hit;
  s.line(50, base, 840, base, { color: C.muted });
  s.line(50, base - ceil * k, 840, base - ceil * k, { color: C.muted, dash: '6 8' });
  s.text(50, base - ceil * k - 10, `no capacity limit: ${pct(ceil)}`, { size: 16, color: C.muted, anchor: 'start' });
  rows.forEach((r, i) => {
    const x = 60 + i * 94, h = r.hit * k;
    const hi = r.cap === 128;
    const col = hi ? C.amber : C.blue, soft = hi ? C.amberSoft : C.blueSoft;
    if (h > 0) s.rect(x, base - h, 56, h, { color: col, fill: soft, fillStyle: 'solid' });
    const inside = h >= 30; // label inside tall bars so the ceiling line never crosses it
    s.text(x + 28, inside ? base - h + 22 : base - h - 10, pct(r.hit), { size: 15, color: inside ? C.ink : col, weight: hi ? 700 : undefined });
    s.text(x + 28, base + 26, `${r.cap}`, { size: 15, color: C.muted });
  });
  s.text(440, 352, '128 blocks = 8 system prompts × 16 blocks, yet 0.502 (not 0.681): unique suffixes evict them.', { size: 16, color: C.amber });
  s.text(440, 378, 'x-axis: cache capacity in KV blocks of 16 tokens; hit rate = reused prompt tokens / all prompt tokens', { size: 15, color: C.muted });
  save('53.3-capacity-sweep.svg', s);
}

// 5. Memory: sharing one system prompt
{
  const s = new Sketch(880, 350, { title: 'Sixty-four users with their own copy of a 2048-token prompt need 64 tiles of 256 MiB; sharing needs one tile', seed: 535 });
  s.text(440, 34, 'One system prompt, 64 users', { size: 24, weight: 700 });
  const g0x = 120, g0y = 80, cell = 26;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    s.rect(g0x + c * cell + 3, g0y + r * cell + 3, 20, 20, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid', width: 1 });
  }
  s.text(g0x + 104, 314, '64 copies × 256 MiB = 16 GiB', { size: 18, weight: 700 });
  s.text(580, 114, '1 copy', { size: 18, weight: 700, color: C.amber, anchor: 'start' });
  s.rect(580, 130, 20, 20, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.2 });
  s.text(590, 314, '1 copy × 256 MiB = 0.25 GiB', { size: 18, weight: 700, color: C.amber });
  s.text(440, 344, 'Illustrative config: 32 layers, 8 KV heads, head dim 128, fp16. Each token stores K and V: 128 KiB.', { size: 15, color: C.muted });
  save('53.3-memory-sharing.svg', s);
}
