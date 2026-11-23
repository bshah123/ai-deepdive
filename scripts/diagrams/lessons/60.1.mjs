import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-60-multimodal/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// every number below is read from 60.1_data.json, written by 60.1_experiment.py
const D = JSON.parse(readFileSync(join(HERE, '60.1_data.json'), 'utf8'));
const f2 = (x) => x.toFixed(2);
const f4 = (x) => x.toFixed(4);

// ---- 1. the N x N batch matrix -------------------------------------------
{
  const s = new Sketch(880, 440, { title: 'Three by three matrix of cosine scores; diagonal cells are true pairs', seed: 601 });
  s.text(440, 34, 'A batch of N = 3 pairs gives an N × N score table', { size: 24, weight: 700 });
  const x0 = 280, y0 = 120, cw = 120, ch = 84;
  for (let j = 0; j < 3; j++) s.text(x0 + j * cw + cw / 2, 104, `caption ${j}`, { font: 'mono', size: 16, color: C.muted });
  for (let i = 0; i < 3; i++) s.text(x0 - 14, y0 + i * ch + ch / 2 + 6, `image ${i}`, { font: 'mono', size: 16, color: C.muted, anchor: 'end' });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const v = D.cos_matrix[i][j];
    const x = x0 + j * cw, y = y0 + i * ch;
    const hard = i !== j && v > D.diag_cos[i];          // negative scored above the true caption
    const o = i === j ? { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' }
            : hard ? { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' }
            : { color: C.muted };
    s.rect(x + 6, y + 6, cw - 12, ch - 12, o);
    s.text(x + cw / 2, y + ch / 2 + 7, f2(v), { font: 'mono', size: 22, weight: 700, color: i === j ? C.blue : C.ink });
  }
  s.note(640, 130, 220, 230, [
    'Blue: N true pairs', '(the diagonal).',
    '', 'Other cells: N² − N', 'negatives, taken free', 'from the same batch.',
    '', 'Amber: a negative that',
    'beats the true caption.',
  ], { size: 17 });
  s.text(440, 418, 'Cosine similarity of unit vectors, for the worked example in the lesson.', { size: 17, color: C.muted });
  save('60.1-batch-matrix.svg', s);
}

// ---- 2. the loss pipeline --------------------------------------------------
{
  const s = new Sketch(880, 470, { title: 'Two encoders, normalise, N by N logits, softmax in two directions, average', seed: 602 });
  s.text(440, 34, 'The symmetric contrastive loss, step by step', { size: 24, weight: 700 });
  const box = (x, y, w, h, label, col, soft) => {
    s.rect(x, y, w, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + w / 2, y + h / 2 + 6, label, { size: 18, color: C.ink });
  };
  box(40, 80, 150, 50, 'image batch', C.muted, C.blueSoft);
  box(250, 80, 170, 50, 'image encoder', C.blue, C.blueSoft);
  box(480, 80, 150, 50, 'normalise', C.blue, C.blueSoft);
  s.arrow(190, 105, 250, 105, { color: C.muted });
  s.arrow(420, 105, 480, 105, { color: C.muted });
  box(40, 210, 150, 50, 'caption batch', C.muted, C.amberSoft);
  box(250, 210, 170, 50, 'text encoder', C.amber, C.amberSoft);
  box(480, 210, 150, 50, 'normalise', C.amber, C.amberSoft);
  s.arrow(190, 235, 250, 235, { color: C.muted });
  s.arrow(420, 235, 480, 235, { color: C.muted });
  box(680, 150, 170, 70, 'logits = s · I Tᵀ', C.violet, C.greenSoft);
  s.arrow(630, 105, 680, 170, { color: C.muted });
  s.arrow(630, 235, 680, 200, { color: C.muted });
  s.text(765, 136, 'N × N matrix', { size: 16, color: C.muted });
  box(430, 300, 200, 60, 'softmax over texts', C.blue, C.blueSoft);
  box(660, 300, 200, 60, 'softmax over images', C.amber, C.amberSoft);
  s.arrow(740, 220, 530, 300, { color: C.muted });
  s.arrow(765, 220, 760, 300, { color: C.muted });
  box(430, 400, 430, 52, 'loss = (loss_t + loss_i) / 2', C.green, C.greenSoft);
  s.arrow(530, 360, 560, 400, { color: C.muted });
  s.arrow(760, 360, 680, 400, { color: C.muted });
  save('60.1-loss-pipeline.svg', s);
}

// ---- 3. temperature sweep on row 1 ----------------------------------------
{
  const s = new Sketch(880, 360, { title: 'Probability of the true caption for image 1 at four logit scales', seed: 603 });
  s.text(440, 34, 'Same similarities, four logit scales', { size: 24, weight: 700 });
  const x0 = 270, full = 400, xl = 700;
  const labels = ['scale 1', 'scale 10', `scale ${f2(D.clip_init_scale)} (CLIP init)`, 'scale 100'];
  const ys = [88, 150, 212, 274];
  s.line(x0 + full / 3, 70, x0 + full / 3, 320, { color: C.muted, dash: '6 8' });
  s.text(x0 + full / 3, 340, 'uniform 1/3', { size: 16, color: C.muted });
  s.text(xl, 70, 'p (true)   loss', { size: 16, color: C.muted, anchor: 'start' });
  D.temperature_sweep.forEach((r, k) => {
    const y = ys[k], p = r.row1_p_true, w = p * full;
    s.text(x0 - 16, y + 30, labels[k], { size: 17, anchor: 'end', color: C.ink });
    s.rect(x0, y, Math.max(w, 2), 42, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(xl, y + 29, `${f2(p)}      ${f2(r.loss)}`, { size: 18, anchor: 'start', color: C.ink });
  });
  save('60.1-temperature.svg', s);
}

// ---- 4. ViT patchify -----------------------------------------------------
{
  const s = new Sketch(880, 400, { title: 'An image becomes a row of 197 tokens: a [CLS] token and 196 patches', seed: 604 });
  s.text(440, 34, 'Patchify: a 224 px image becomes 196 tokens', { size: 24, weight: 700 });
  const gx = 40, gy = 84, n = 7, cell = 34;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    s.rect(gx + c * cell, gy + r * cell, cell, cell, { color: C.blue, fill: (r + c) % 2 ? C.blueSoft : undefined, fillStyle: 'solid' });
  }
  s.text(gx + (n * cell) / 2, gy + n * cell + 28, '16 × 16 px patches', { size: 17, color: C.muted });
  s.text(gx + (n * cell) / 2, gy + n * cell + 52, `(14 × 14 in all, 7 × 7 drawn)`, { size: 16, color: C.muted });
  s.arrow(gx + n * cell + 20, gy + (n * cell) / 2, 350, gy + (n * cell) / 2, { color: C.muted });
  const tokens = ['[CLS]', 'p1', 'p2', 'p3', '…', 'p196'];
  tokens.forEach((t, k) => {
    const x = 360 + k * 84;
    s.rect(x, 150, 76, 52, { color: k === 0 ? C.green : C.rose, fill: k === 0 ? C.greenSoft : C.roseSoft, fillStyle: 'solid' });
    s.text(x + 38, 183, t, { font: 'mono', size: 16, color: C.ink });
  });
  s.text(360, 238, 'each token is a 768-dim vector', { size: 17, anchor: 'start', color: C.muted });
  s.note(360, 262, 490, 120, [
    `224 ÷ 16 = ${D.vit.per_side} per side, so ${D.vit.n_patches} patches`,
    `plus [CLS] = ${D.vit.tokens_with_cls} tokens.`,
    `Each patch: 16 × 16 × 3 = ${D.vit.patch_dim} numbers,`,
    `one linear layer maps it to ${D.vit.d_model} dims.`,
  ], { size: 17 });
  save('60.1-patchify.svg', s);
}

// ---- 5. zero-shot classification -------------------------------------------
{
  const s = new Sketch(880, 360, { title: 'Zero-shot classification: an image vector against three text prompts', seed: 605 });
  s.text(440, 34, 'Zero-shot: pick the prompt whose text vector is closest', { size: 24, weight: 700 });
  s.text(260, 74, 'text prompt', { size: 16, color: C.muted, anchor: 'start' });
  s.text(510, 74, 'cosine', { size: 16, color: C.muted, anchor: 'start' });
  s.text(745, 74, 'softmax × 14.3', { size: 16, color: C.muted, anchor: 'start' });
  const names = ['a photo of a cat', 'a photo of a dog', 'a photo of a car'];
  names.forEach((nm, k) => {
    const y = 90 + k * 72, cos = D.zs_cos[k], p = D.zs_probs[k];
    const hit = k === 0;
    s.rect(260, y, 230, 50, { color: hit ? C.green : C.muted, fill: hit ? C.greenSoft : undefined, fillStyle: 'solid' });
    s.text(375, y + 31, nm, { font: 'mono', size: 15, color: C.ink });
    s.rect(510, y + 12, 150 * cos, 26, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(510 + 150 * cos + 12, y + 32, f2(cos), { font: 'mono', size: 18, anchor: 'start', color: C.ink });
    s.text(745, y + 32, `p = ${f4(p)}`, { font: 'mono', size: 17, anchor: 'start', color: hit ? C.green : C.ink });
  });
  s.text(440, 330, 'Toy vectors, not CLIP weights. The argmax of the cosine scores picks the class.', { size: 17, color: C.muted });
  save('60.1-zero-shot.svg', s);
}
