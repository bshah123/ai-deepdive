import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-60-multimodal/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// every number below is read from 60.2_data.json, written by 60.2_experiment.py
const D = JSON.parse(readFileSync(join(HERE, '60.2_data.json'), 'utf8'));
const fmt = (n) => n.toLocaleString('en-US');
const sig = (x) => (x < 0.001 ? x.toExponential(1) : x.toPrecision(3));

// ---- 1. shapes along the bridge ------------------------------------------
{
  const s = new Sketch(880, 300, { title: 'Image to ViT patches to connector to LLM input, with the shape at each stage', seed: 6021 });
  s.text(440, 36, 'Where the shapes change', { size: 24, weight: 700 });
  const boxes = [
    { x: 22,  l1: 'image', l2: `${336} px`, col: C.muted, soft: C.blueSoft },
    { x: 244, l1: 'ViT-L/14', l2: `${D.tokens.res336} × ${D.config.D_V}`, col: C.blue, soft: C.blueSoft },
    { x: 466, l1: 'connector', l2: `${D.config.D_V} → ${D.config.D_L}`, col: C.amber, soft: C.amberSoft },
    { x: 688, l1: 'LLM input', l2: `${D.tokens.res336 + D.config.text_tokens} × ${D.config.D_L}`, col: C.green, soft: C.greenSoft },
  ];
  const w = 170, y = 96, h = 92;
  for (const b of boxes) {
    s.rect(b.x, y, w, h, { color: b.col, fill: b.soft, fillStyle: 'solid' });
    s.text(b.x + w / 2, y + 36, b.l1, { size: 19 });
    s.text(b.x + w / 2, y + 68, b.l2, { font: 'mono', size: 17, weight: 700 });
  }
  for (let i = 0; i < 3; i++) s.arrow(boxes[i].x + w + 6, y + h / 2, boxes[i + 1].x - 6, y + h / 2, { color: C.muted });
  s.text(440, 230, 'Only the connector changes width. Every row of the connector output is one visual token.', { size: 18, color: C.muted });
  s.text(440, 262, `Text tokens: ${D.config.text_tokens} (in the prompt). Patches: ${D.tokens.res336}, from (336 / 14)² = 576.`, { size: 18, color: C.muted });
  save('60.2-bridge-shapes.svg', s);
}

// ---- 2. three connectors side by side ------------------------------------
{
  const s = new Sketch(880, 380, { title: 'Linear, two-layer MLP and Q-Former connectors compared by structure and output token count', seed: 6022 });
  s.text(440, 34, 'Three connectors, three token budgets', { size: 24, weight: 700 });
  const cols = [
    { x: 30, name: 'Linear', col: C.blue, soft: C.blueSoft, tokens: `${D.tokens.res336} tokens`, params: `${fmt(D.params.linear)} params` },
    { x: 320, name: 'MLP', col: C.amber, soft: C.amberSoft, tokens: `${D.tokens.res336} tokens`, params: `${fmt(D.params.mlp)} params` },
    { x: 610, name: 'Q-Former', col: C.green, soft: C.greenSoft, tokens: `${D.tokens.qformer} tokens`, params: 'fixed, any resolution' },
  ];
  for (const c of cols) {
    const cx = c.x + 120;
    s.rect(c.x, 70, 240, 290, { color: c.col, width: 1.4 });
    s.text(cx, 104, c.name, { size: 22, weight: 700 });
  }
  // linear: one box
  s.rect(cols[0].x + 50, 150, 140, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(cols[0].x + 120, 181, 'W · patch', { font: 'mono', size: 16 });
  // MLP: three boxes
  s.rect(cols[1].x + 50, 136, 140, 36, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(cols[1].x + 120, 160, 'W₁ · patch', { font: 'mono', size: 16 });
  s.rect(cols[1].x + 50, 186, 140, 36, { color: C.muted, fill: C.muted, fillStyle: 'solid' });
  s.text(cols[1].x + 120, 210, 'GELU', { font: 'mono', size: 16 });
  s.rect(cols[1].x + 50, 236, 140, 36, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(cols[1].x + 120, 260, 'W₂', { font: 'mono', size: 16 });
  // Q-Former: 32 queries into one cross-attention block
  s.circle(cols[2].x + 40, 150, 22, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.circle(cols[2].x + 40, 186, 22, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(cols[2].x + 40, 232, '⋮', { size: 22 });
  s.text(cols[2].x + 40, 128, 'queries', { font: 'mono', size: 14, color: C.muted });
  s.rect(cols[2].x + 80, 160, 140, 56, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(cols[2].x + 150, 194, 'cross-attn', { font: 'mono', size: 16 });
  s.arrow(cols[2].x + 66, 178, cols[2].x + 76, 178, { color: C.muted });
  // token counts and parameter counts (computed)
  for (const c of cols) {
    s.text(c.x + 120, 318, c.tokens, { size: 22, weight: 700 });
    s.text(c.x + 120, 346, c.params, { font: 'mono', size: 16, color: C.muted });
  }
  save('60.2-three-connectors.svg', s);
}

// ---- 3. Q-Former cross-attention, schematic -----------------------------
{
  const s = new Sketch(880, 340, { title: 'Learned queries cross-attend to patch features and return a fixed number of tokens', seed: 6023 });
  s.text(440, 34, 'Queries ask, patches answer, the output has a fixed size', { size: 24, weight: 700 });
  // patch features (left): 576 of them, show six
  const px = 40, py = 102;
  for (let i = 0; i < 5; i++) s.rect(px, py + i * 36, 170, 28, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(px + 85, py - 14, `576 patch features (1024 each)`, { size: 16, color: C.muted, anchor: 'middle' });
  // queries (top middle)
  s.rect(330, 70, 220, 46, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 99, '32 learned queries (768 each)', { size: 17 });
  s.arrow(440, 120, 440, 150, { color: C.muted });
  // attention block (middle)
  s.rect(320, 150, 240, 60, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 176, 'softmax over the 576 patches', { size: 17 });
  s.text(440, 198, `weights shape ${D.shapes.qformer_att.join(' × ')}`, { font: 'mono', size: 15 });
  s.arrow(px + 176, 150, 316, 180, { color: C.muted, dash: '6 8' });
  // output (right)
  const ox = 660;
  for (let i = 0; i < 5; i++) s.rect(ox, py + i * 36, 170, 28, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(ox + 85, py - 14, `32 output tokens (768 each)`, { size: 16, color: C.muted, anchor: 'middle' });
  s.arrow(564, 180, ox - 6, 180, { color: C.muted });
  s.text(440, 318, `Each row of the weights sums to ${D.att_row_sum_min.toFixed(6)} (checked). Count is 32 for any image size.`, { size: 18, color: C.muted });
  save('60.2-qformer-attention.svg', s);
}

// ---- 4. token budget bars -----------------------------------------------
{
  const s = new Sketch(880, 400, { title: 'Bar chart of visual tokens and KV cache size for three connector choices', seed: 6024 });
  s.text(440, 34, 'The connector sets how much context each image costs', { size: 24, weight: 700 });
  const groups = [
    { name: 'visual tokens per image', x0: 90, vals: [D.cost.linear_224.visual_tokens, D.cost.linear_336.visual_tokens, D.cost.qformer_32.visual_tokens], unit: '' },
    { name: 'KV cache per prompt, MiB', x0: 490, vals: [D.cost.linear_224.kv_cache_MB_fp16, D.cost.linear_336.kv_cache_MB_fp16, D.cost.qformer_32.kv_cache_MB_fp16], unit: ' MiB' },
  ];
  const labels = ['linear, 224 px', 'linear, 336 px', 'Q-Former'];
  const base = 318, maxH = 150;
  for (const g of groups) {
    s.text(g.x0 + 150, 76, g.name, { size: 19, weight: 700 });
    const max = Math.max(...g.vals);
    g.vals.forEach((v, i) => {
      const h = (v / max) * maxH;
      const x = g.x0 + i * 100;
      const col = i === 2 ? C.green : C.blue;
      const soft = i === 2 ? C.greenSoft : C.blueSoft;
      s.rect(x + 8, base - h, 80, h, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x + 48, base - h - 12, `${v}${g.unit}`, { font: 'mono', size: 17, weight: 700 });
      s.text(x + 48, base + 26, labels[i], { size: 15, color: C.muted });
    });
    s.arrow(g.x0 - 10, base, g.x0 + 300, base, { color: C.muted });
  }
  s.text(440, 384, `KV cache: 2 × 32 layers × 4096 × 2 bytes = ${fmt(D.kv_per_token_bytes)} bytes per token; prompt = visual tokens + ${D.config.text_tokens} text tokens.`, { size: 15, color: C.muted });
  save('60.2-token-budget.svg', s);
}

// ---- 5. toy sweep: linear vs MLP ----------------------------------------
{
  const s = new Sketch(880, 400, { title: 'Held-out mean squared error of linear and MLP connectors in a synthetic toy, four settings', seed: 6025 });
  s.text(440, 34, 'Toy only: linear vs MLP held-out error', { size: 24, weight: 700 });
  const rows = D.toy.sweep;
  const maxV = Math.max(...rows.map((r) => Math.max(r.linear_test_mse, r.mlp_test_mse)));
  const base = 240, maxH = 165;
  rows.forEach((r, i) => {
    const gx = 70 + i * 205;
    const hl = (r.linear_test_mse / maxV) * maxH, hm = (r.mlp_test_mse / maxV) * maxH;
    s.rect(gx, base - hl, 60, Math.max(hl, 1), { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(gx + 70, base - hm, 60, Math.max(hm, 1), { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(gx + 30, base - hl - 10, sig(r.linear_test_mse), { font: 'mono', size: 15, weight: 700 });
    s.text(gx + 100, base - hm - 10, sig(r.mlp_test_mse), { font: 'mono', size: 15, weight: 700 });
    s.text(gx + 65, base + 28, `teacher ${r.scale === 0.25 ? 'mild' : 'strong'}`, { size: 16 });
    s.text(gx + 65, base + 52, `n = ${r.n_train} train`, { size: 16, color: C.muted });
  });
  s.arrow(40, base, 860, base, { color: C.muted });
  s.rect(40, 342, 14, 14, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(62, 354, `linear (${D.toy.sweep[0].linear_params} params)`, { size: 17, anchor: 'start' });
  s.rect(300, 342, 14, 14, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(322, 354, `MLP (${D.toy.sweep[0].mlp_params} params)`, { size: 17, anchor: 'start' });
  s.text(640, 354, 'bars share one scale', { size: 15, color: C.muted, anchor: 'start' });
  save('60.2-toy-sweep.svg', s);
}
