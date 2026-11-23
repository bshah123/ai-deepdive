import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-09-production-ai/chapter-54-model-serving/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const D = JSON.parse(readFileSync(join(HERE, '54.2_data.json'), 'utf8'));

// 1. Two paths: offline compile, online serve
{
  const s = new Sketch(880, 380, { title: 'Offline compile path and online serving path', seed: 541 });
  s.text(440, 34, 'Compile once offline, then serve online', { size: 24, weight: 700 });
  s.text(40, 66, 'OFFLINE (once per GPU and shape setting)', { size: 16, color: C.muted, anchor: 'start' });
  s.rect(40, 80, 200, 64, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(140, 106, ['Trained model', 'checkpoint'], { size: 17 });
  s.rect(300, 80, 240, 64, { color: C.violet, fill: C.violetSoft ?? C.blueSoft, fillStyle: 'solid' });
  s.text(420, 106, ['Compile for one GPU', 'fuse ops, fix shapes'], { size: 17 });
  s.rect(600, 80, 240, 64, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(720, 106, ['Engine file', 'model.plan'], { size: 17 });
  s.arrow(240, 112, 300, 112, { color: C.muted });
  s.arrow(540, 112, 600, 112, { color: C.muted });
  s.text(40, 196, 'ONLINE (per request)', { size: 16, color: C.muted, anchor: 'start' });
  s.rect(40, 214, 200, 64, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(140, 240, ['Client requests', 'one per user'], { size: 17 });
  s.rect(300, 214, 240, 64, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(420, 240, ['Triton queue and', 'dynamic batcher'], { size: 17 });
  s.rect(600, 214, 240, 64, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(720, 240, ['Engine on GPU', 'runs one batch'], { size: 17 });
  s.arrow(240, 246, 300, 246, { color: C.muted });
  s.arrow(540, 246, 600, 246, { color: C.muted });
  s.line(720, 144, 720, 214, { color: C.rose, dash: '6 8' });
  s.text(700, 186, 'loaded from model_repository', { size: 16, color: C.rose, anchor: 'end' });
  s.text(420, 332, 'Triton waits at most max_queue_delay, then sends the batch as it stands.', { size: 17, color: C.muted });
  save('54.2-pipeline.svg', s);
}

// 2. Fusion: counted bytes moved
{
  const f = D.fusion;
  const s = new Sketch(880, 300, { title: 'Bytes moved: unfused versus fused elementwise chain', seed: 542 });
  s.text(440, 34, 'Fusion keeps intermediates on chip: 7 tensor passes become 3', { size: 22, weight: 700 });
  const maxW = 500, unW = maxW, fuW = maxW * f.fused_MB / f.unfused_MB;
  s.text(40, 112, 'Unfused: 3 kernels', { size: 18, anchor: 'start' });
  s.rect(260, 96, unW, 40, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(260, 90, `${f.unfused_MB.toFixed(3)} MB (7 passes of 32,768 fp16 values)`, { size: 16, anchor: 'start' });
  s.text(40, 212, 'Fused: 1 kernel', { size: 18, anchor: 'start' });
  s.rect(260, 196, fuW, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(260, 190, `${f.fused_MB.toFixed(3)} MB (3 passes)`, { size: 16, anchor: 'start' });
  s.text(440, 272, 'Counted traffic only: read x, read r, write y. Not a timing measurement.', { size: 16, color: C.muted });
  save('54.2-fusion-traffic.svg', s);
}

// 3. Dynamic batching: mean latency vs queue delay
{
  const rows = D.sweep_rate200_mb8;
  const s = new Sketch(880, 410, { title: 'Mean latency versus dynamic batching delay at 200 requests per second', seed: 543 });
  s.text(440, 34, 'Latency rises with queue delay once the server keeps up', { size: 22, weight: 700 });
  s.note(560, 56, 290, 60, ['One request per batch at 200/s:', `${Math.round(D.rate200_mb1.mean_ms).toLocaleString('en-US')} ms, queue grows`], { size: 16 });
  const base = 320, scale = 10; // px per ms
  s.line(80, base, 820, base, { color: C.muted });
  rows.forEach((r, i) => {
    const cx = 130 + i * 160, h = r.mean_ms * scale;
    s.rect(cx - 40, base - h, 80, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, `${r.mean_ms.toFixed(1)} ms`, { size: 16, weight: 700 });
    s.text(cx, base + 26, `delay ${r.delay_ms} ms`, { size: 16 });
    s.text(cx, base + 48, `batch ${r.mean_batch.toFixed(2)}`, { size: 16, color: C.muted });
  });
  s.text(440, 396, 'Simulated costs: 8 ms per batch + 0.5 ms per request. Not a GPU benchmark.', { size: 16, color: C.muted });
  save('54.2-batching-delay.svg', s);
}

// 4. KV-cache budget on an 80 GB GPU
{
  const k = D.kv;
  const s = new Sketch(880, 400, { title: 'GPU memory budget for batch sizes at 4096 tokens each', seed: 544 });
  s.text(440, 34, 'KV cache takes the memory that batch size asks for', { size: 22, weight: 700 });
  const base = 340, scale = 2.6; // px per GB
  const limit = base - 80 * scale;
  s.line(60, limit, 820, limit, { color: C.rose, dash: '6 8' });
  s.text(60, limit - 10, '80 GB GPU', { size: 16, color: C.rose, anchor: 'start' });
  k.cases.forEach((c, i) => {
    const cx = 230 + i * 200, w = 110;
    const wH = k.weights_GB * scale, rH = 6 * scale, kvH = c.kv_GB * scale;
    let y = base;
    s.rect(cx - w / 2, y - wH, w, wH, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' }); y -= wH;
    s.rect(cx - w / 2, y - rH, w, rH, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' }); y -= rH;
    s.rect(cx - w / 2, y - kvH, w, kvH, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    const total = k.weights_GB + 6 + c.kv_GB;
    const label = c.fits ? `${total.toFixed(1)} GB` : `${total.toFixed(1)} GB, no fit`;
    s.text(cx, y - kvH - 30, [`batch ${c.batch}`, label], { size: 16, weight: 700 });
  });
  s.line(60, base, 820, base, { color: C.muted });
  s.note(40, 350, 800, 36, [`KV cache = ${k.per_token_bytes / 1024} KiB per token x batch x 4096 tokens (fp16, assumed 7B-class shape)`], { size: 15 });
  save('54.2-kv-budget.svg', s);
}
