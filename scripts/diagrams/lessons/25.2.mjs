// Diagrams for 25.2 (MHA, GQA, MQA). Run: node scripts/diagrams/lessons/25.2.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'content/part-04-transformers-llms/chapter-25-attention/diagrams');
mkdirSync(OUT, { recursive: true });

const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- 25.2-mha-vs-gqa-vs-mqa.svg
{
  const s = new Sketch(900, 360, {
    title: 'Architectural Comparison: Multi-Head (MHA), Grouped-Query (GQA), and Multi-Query (MQA)',
    seed: 42
  });

  // Panel 1: MHA (8 Q : 8 KV)
  s.text(150, 36, 'MHA (Multi-Head)', { size: 22, weight: 700 });
  s.text(150, 60, '8 Q heads : 8 KV heads', { size: 16, color: C.muted });
  for (let i = 0; i < 8; i++) {
    const y = 85 + i * 28;
    s.rect(40, y, 65, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(72, y + 16, `Q${i + 1}`, { font: 'mono', size: 13, color: C.blue });
    s.arrow(108, y + 11, 160, y + 11, { color: C.muted, head: 5 });
    s.rect(165, y, 65, 22, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(197, y + 16, `KV${i + 1}`, { font: 'mono', size: 13, color: C.green });
  }
  s.text(150, 330, 'Ratio: 1:1 (Max Cache Size)', { size: 15, color: C.rose, weight: 700 });

  s.line(300, 30, 300, 340, { color: C.muted, width: 1, dash: '4 4' });

  // Panel 2: GQA (8 Q : 2 KV groups) - Llama 3 / Mistral standard
  s.text(450, 36, 'GQA (Grouped-Query)', { size: 22, weight: 700, color: C.violet });
  s.text(450, 60, '8 Q heads : 2 KV groups (4:1)', { size: 16, color: C.muted });

  // Group 1
  for (let i = 0; i < 4; i++) {
    const y = 85 + i * 28;
    s.rect(340, y, 65, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(372, y + 16, `Q${i + 1}`, { font: 'mono', size: 13, color: C.blue });
    s.arrow(408, y + 11, 460, 127, { color: C.violet, width: 1.5, head: 5 });
  }
  s.rect(465, 110, 75, 34, { color: C.violet, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(502, 132, 'KV Group 1', { font: 'mono', size: 13, color: C.ink, weight: 700 });

  // Group 2
  for (let i = 4; i < 8; i++) {
    const y = 85 + i * 28;
    s.rect(340, y, 65, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(372, y + 16, `Q${i + 1}`, { font: 'mono', size: 13, color: C.blue });
    s.arrow(408, y + 11, 460, 239, { color: C.violet, width: 1.5, head: 5 });
  }
  s.rect(465, 222, 75, 34, { color: C.violet, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(502, 244, 'KV Group 2', { font: 'mono', size: 13, color: C.ink, weight: 700 });

  s.text(450, 330, '4x KV Cache Savings (Optimal)', { size: 15, color: C.violet, weight: 700 });

  s.line(600, 30, 600, 340, { color: C.muted, width: 1, dash: '4 4' });

  // Panel 3: MQA (8 Q : 1 KV)
  s.text(750, 36, 'MQA (Multi-Query)', { size: 22, weight: 700 });
  s.text(750, 60, '8 Q heads : 1 shared KV head', { size: 16, color: C.muted });
  for (let i = 0; i < 8; i++) {
    const y = 85 + i * 28;
    s.rect(640, y, 65, 22, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(672, y + 16, `Q${i + 1}`, { font: 'mono', size: 13, color: C.blue });
    s.arrow(708, y + 11, 760, 183, { color: C.muted, width: 1.2, head: 5 });
  }
  s.rect(765, 163, 85, 40, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(807, 188, 'Single KV', { font: 'mono', size: 14, color: C.green, weight: 700 });

  s.text(750, 330, '8x KV Cache Savings (Quality Drop)', { size: 15, color: C.amber, weight: 700 });

  save('25.2-mha-vs-gqa-vs-mqa.svg', s);
}

// ---------------------------------------------------------------- 25.2-kv-cache-bottleneck.svg
{
  const s = new Sketch(840, 320, {
    title: 'The Memory Bandwidth Wall during Autoregressive Generation (Decode Phase)',
    seed: 99
  });

  // Arithmetic Intensity Formula box
  s.rect(40, 40, 760, 70, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(420, 68, 'Arithmetic Intensity = FLOPs / Memory Access Bytes', { size: 21, weight: 700, color: C.blue });
  s.text(420, 94, 'Decode phase processes seq_len = 1 token per step → Arithmetic Intensity ≈ 1 FLOP/byte (Memory-Bound!)', { size: 15, color: C.ink });

  // Left: GPU Compute Engine (Idling)
  s.rect(80, 150, 260, 120, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(210, 180, 'GPU Tensor Cores', { size: 20, weight: 700, color: C.amber });
  s.text(210, 208, 'H100 Peak: 1,979 TFLOPs', { size: 15, color: C.ink });
  s.text(210, 234, 'Status: STARVING FOR DATA', { size: 14, color: C.rose, weight: 700 });
  s.text(210, 255, '(Operating at < 5% utilization)', { size: 13, color: C.muted });

  // Middle: Memory Bandwidth Pipe
  s.arrow(345, 210, 475, 210, { color: C.rose, width: 4, head: 12 });
  s.text(410, 190, 'HBM3 Bus', { size: 15, weight: 700, color: C.rose });
  s.text(410, 235, '3.35 TB/s Limit', { size: 13, color: C.muted });

  // Right: KV Cache in HBM
  s.rect(480, 150, 280, 120, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(620, 180, 'HBM High Bandwidth Memory', { size: 20, weight: 700, color: C.green });
  s.text(620, 208, 'Full KV Cache per token:', { size: 14, color: C.ink });
  s.text(620, 230, 'Bytes = 2 × 2 × n_layers × n_heads × d_k', { font: 'mono', size: 13, color: C.blue });
  s.text(620, 255, 'GQA reduces KV reads by 4x to 8x', { size: 14, color: C.violet, weight: 700 });

  save('25.2-kv-cache-bottleneck.svg', s);
}
