import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-10-evaluation-research/chapter-60-multimodal/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// every number below is read from 60.3_data.json, written by 60.3_experiment.py
const D = JSON.parse(readFileSync(join(HERE, '60.3_data.json'), 'utf8'));
const n = (x) => x.toLocaleString('en-US');

// ---- 1. audio front end: waveform -> log-Mel -> conv stem -----------------
{
  const s = new Sketch(880, 300, { title: 'Five stages from a 30 second waveform to 1500 encoder positions', seed: 601 });
  s.text(440, 34, 'Audio front end: waveform to encoder positions', { size: 24, weight: 700 });
  const xs = [20, 200, 380, 560, 740], w = 120, y = 70, h = 82;
  const labels = [
    ['waveform', '16 kHz, 30 s'],
    ['STFT', 'window 400, hop 160'],
    ['mel filters', '80 bands'],
    ['log10, floor,', 'then (x+4)/4'],
    ['two convs', 'k3, then stride 2'],
  ];
  const shapes = [
    `${n(D.mel_30s_shape[1] * 160)} samples`,
    `201 × ${n(D.frames_30s)}`,
    `80 × ${n(D.frames_30s)}`,
    `80 × ${n(D.frames_30s)}`,
    `${n(D.stem_len_30s)} × d`,
  ];
  xs.forEach((x, i) => {
    const soft = i === 4 ? C.greenSoft : C.blueSoft, col = i === 4 ? C.green : C.blue;
    s.rect(x, y, w, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x + w / 2, y + 34, labels[i][0], { size: 17, weight: 700 });
    s.text(x + w / 2, y + 60, labels[i][1], { size: 15, color: C.muted });
    s.text(x + w / 2, y + 116, shapes[i], { font: 'mono', size: 16 });
    if (i < 4) s.arrow(x + w + 4, y + h / 2, xs[i + 1] - 4, y + h / 2, { color: C.muted });
  });
  s.note(150, 210, 580, 62, [
    `${D.frames_30s} frames = 30 s × 100 frames per s; the stride-2 conv keeps every second frame.`,
    `Result: ${D.enc_positions_per_s} encoder positions per second, one vector each.`,
  ], { size: 18 });
  s.text(440, 290, 'Shapes follow the Whisper encoder settings: 16 kHz input, 80 mel bands.', { size: 15, color: C.muted });
  save('60.3-audio-frontend.svg', s);
}

// ---- 2. tokens per minute of audio -----------------------------------------
{
  const s = new Sketch(880, 330, { title: 'Tokens per minute of audio for four encoders, linear bars', seed: 602 });
  s.text(440, 34, 'Tokens per minute of audio', { size: 24, weight: 700 });
  const A = D.audio_streams;
  const rows = [
    ['Whisper encoder (continuous)', A.whisper_enc.codes_per_min, C.muted, C.muted],
    ['EnCodec 1.5 kbps (2 codebooks)', A.encodec_nq2.codes_per_min, C.blue, C.blueSoft],
    ['EnCodec 6 kbps (8 codebooks)', A.encodec_nq8.codes_per_min, C.blue, C.blueSoft],
    ['EnCodec 24 kbps (32 codebooks)', A.encodec_nq32.codes_per_min, C.amber, C.amberSoft],
  ];
  const max = Math.max(...rows.map((r) => r[1])), x0 = 330, barMax = 440;
  rows.forEach((r, i) => {
    const y = 80 + i * 52, w = Math.max(4, (barMax * r[1]) / max);
    s.text(x0 - 16, y + 24, r[0], { size: 17, anchor: 'end' });
    s.rect(x0, y, w, 34, { color: r[2], fill: r[3], fillStyle: 'solid' });
    s.text(x0 + w + 12, y + 24, n(r[1]), { font: 'mono', size: 17, anchor: 'start', weight: 700 });
  });
  s.note(250, 282, 560, 40, ['EnCodec: 75 frames per s × codebooks × 10 bits per code'], { size: 17 });
  save('60.3-tokens-per-minute.svg', s);
}

// ---- 3. residual quantization, one vector ----------------------------------
{
  const s = new Sketch(880, 300, { title: 'One vector quantized in three residual stages', seed: 603 });
  s.text(440, 34, 'Residual vector quantization: each stage codes what is left', { size: 24, weight: 700 });
  const e = D.rvq_example_stages;
  const boxes = [
    ['input x', `‖x‖ = ${D.rvq_norm_x0.toFixed(2)}`, C.muted, C.blueSoft],
    ['stage 1', `code ${e[0].code}`, `‖r1‖ = ${e[0].residual_norm.toFixed(2)}`, C.blue],
    ['stage 2', `code ${e[1].code}`, `‖r2‖ = ${e[1].residual_norm.toFixed(2)}`, C.blue],
    ['stage 3', `code ${e[2].code}`, `‖r3‖ = ${e[2].residual_norm.toFixed(2)}`, C.green],
  ];
  const xs = [30, 245, 460, 675], w = 175, y = 90, h = 110;
  boxes.forEach((b, i) => {
    const soft = i === 0 ? C.blueSoft : i === 3 ? C.greenSoft : C.blueSoft;
    const col = i === 3 ? C.green : i === 0 ? C.muted : C.blue;
    s.rect(xs[i], y, w, h, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(xs[i] + w / 2, y + 32, b[0], { size: 18, weight: 700 });
    s.text(xs[i] + w / 2, y + 66, b[1], { font: 'mono', size: 17 });
    if (i > 0) s.text(xs[i] + w / 2, y + 96, b[2], { font: 'mono', size: 17, color: C.muted });
    if (i < 3) s.arrow(xs[i] + w + 6, y + h / 2, xs[i + 1] - 6, y + h / 2, { color: C.muted });
  });
  s.note(150, 214, 580, 56, [
    'r1 = x − (entry chosen at stage 1). Each stage codes the residual of the one before.',
    'The decoder adds the chosen entries back to rebuild x.',
  ], { size: 17 });
  s.text(440, 290, `Toy data: 8-D vectors, codebooks of 16 entries (4 bits each). Real EnCodec uses 1,024 (10 bits).`, { size: 15, color: C.muted });
  save('60.3-rvq-stages.svg', s);
}

// ---- 4. reconstruction error versus number of codebooks --------------------
{
  const s = new Sketch(880, 410, { title: 'Mean squared error falls with each residual codebook (toy data)', seed: 604 });
  s.text(440, 34, 'Reconstruction error versus codebooks used', { size: 24, weight: 700 });
  const m = D.rvq_mse_by_nq, top = Math.max(...m), base = 320, H = 230;
  m.forEach((v, i) => {
    const x = 110 + i * 92, h = Math.max(3, (H * v) / top), w = 56;
    s.rect(x - w / 2, base - h, w, h, { color: i === 0 ? C.muted : C.blue, fill: i === 0 ? C.amberSoft : C.blueSoft, fillStyle: 'solid' });
    s.text(x, base - h - 12, v.toFixed(2), { font: 'mono', size: 16, weight: 700 });
    s.text(x, base + 26, String(i), { font: 'mono', size: 17 });
    s.text(x, base + 52, `${4 * i} bits`, { font: 'mono', size: 15, color: C.muted });
  });
  s.line(70, base, 830, base, { color: C.ink, width: 2 });
  s.text(440, 396, 'n_q: codebooks used (n_q = 0 means no codes; the error is the mean of x²)', { size: 16, color: C.muted });
  save('60.3-rvq-error.svg', s);
}

// ---- 5. video: tubelets and token counts -----------------------------------
{
  const s = new Sketch(880, 390, { title: 'A 16-frame clip cut into 2 by 16 by 16 tubelets, with token counts', seed: 605 });
  s.text(440, 34, 'Video tokens: a tubelet is a small 3D patch', { size: 24, weight: 700 });
  const V = D.video;
  s.rect(92, 92, 190, 190, { color: C.muted, fill: C.blueSoft, fillStyle: 'hachure' });
  s.rect(80, 104, 190, 190, { color: C.muted, fill: C.blueSoft, fillStyle: 'hachure' });
  s.rect(68, 116, 190, 190, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.grid(68, 116, 14, 14, 13.57, { color: C.muted });
  s.rect(68 + 13.57 * 4, 116 + 13.57 * 3, 13.57, 13.57, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(163, 346, `${V.frames} frames × ${V.h} × ${V.w} × 3`, { font: 'mono', size: 16, color: C.muted });
  const rows = [
    ['2D patch 16×16, per frame', V.tokens_2d_patch16_per_frame, C.muted, C.amberSoft],
    ['tubelet 2×16×16', V.tokens_tubelet_2x16x16, C.blue, C.blueSoft],
    ['tubelet 4×16×16', V.tokens_tubelet_4x16x16, C.green, C.greenSoft],
  ];
  const max = V.tokens_2d_patch16_per_frame, x0 = 500, barMax = 240;
  rows.forEach((r, i) => {
    const y = 110 + i * 74, w = (barMax * r[1]) / max;
    s.text(x0, y - 8, r[0], { size: 17 });
    s.rect(x0, y + 8, w, 34, { color: r[2], fill: r[3], fillStyle: 'solid' });
    s.text(x0 + w + 12, y + 32, n(r[1]), { font: 'mono', size: 18, weight: 700, anchor: 'start' });
  });
  s.text(440, 372, `One tubelet = 2 × 16 × 16 × 3 = ${n(V.values_per_tubelet_2x16x16)} numbers, mapped to one token.`, { size: 16, color: C.muted });
  save('60.3-tubelet.svg', s);
}
