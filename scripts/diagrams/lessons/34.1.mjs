import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-05-information-retrieval/chapter-34-dense-embeddings/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// 1. Cross-encoder versus bi-encoder
{
  const s = new Sketch(880, 400, { title: 'Cross-encoder reads query and document together; bi-encoder encodes each separately and compares vectors', seed: 3401 });
  s.text(440, 34, 'Two ways to score a query against a document', { size: 24, weight: 700 });
  // left: cross-encoder
  s.text(235, 92, 'Cross-encoder', { size: 22, weight: 700, color: C.amber });
  s.rect(70, 115, 330, 46, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(235, 143, '[CLS] query [SEP] doc', { font: 'mono', size: 16 });
  s.arrow(235, 161, 235, 200, { color: C.muted });
  s.rect(120, 200, 230, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(235, 228, 'encoder (one pass)', { size: 18 });
  s.arrow(235, 244, 235, 280, { color: C.muted });
  s.rect(165, 280, 140, 40, { color: C.ink });
  s.text(235, 306, 'score', { size: 18 });
  s.text(235, 352, 'one full pass per (query, doc) pair', { size: 17, color: C.muted });
  // right: bi-encoder
  s.text(655, 92, 'Bi-encoder', { size: 22, weight: 700, color: C.blue });
  s.rect(480, 115, 150, 46, { color: C.ink });
  s.text(555, 143, 'query', { size: 18 });
  s.rect(680, 115, 150, 46, { color: C.ink });
  s.text(755, 143, 'document', { size: 18 });
  s.arrow(555, 161, 555, 200, { color: C.muted });
  s.arrow(755, 161, 755, 200, { color: C.muted });
  s.rect(480, 200, 150, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(555, 228, 'encoder', { size: 18 });
  s.rect(680, 200, 150, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(755, 228, 'same encoder', { size: 18 });
  s.arrow(555, 244, 555, 280, { color: C.muted });
  s.arrow(755, 244, 755, 280, { color: C.muted });
  s.rect(480, 280, 150, 40, { color: C.blue });
  s.text(555, 306, 'q vector', { size: 18 });
  s.rect(680, 280, 150, 40, { color: C.blue });
  s.text(755, 306, 'd vector', { size: 18 });
  s.arrow(555, 320, 630, 352, { color: C.muted });
  s.arrow(755, 320, 680, 352, { color: C.muted });
  s.rect(565, 352, 180, 36, { color: C.ink, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(655, 376, 'cosine(q, d)', { size: 18 });
  s.text(60, 392, 'd vectors are computed offline and cached', { size: 15, color: C.muted, anchor: 'start' });
  save('34.1-two-architectures.svg', s);
}

// 2. Mean pooling with attention mask (numbers from the experiment)
{
  const s = new Sketch(880, 400, { title: 'Mean pooling over a padded sequence: the mask excludes the pad row', seed: 3402 });
  s.text(440, 34, 'Mean pooling: average only the real tokens', { size: 24, weight: 700 });
  const cols = [[60, 140], [200, 120], [320, 120], [440, 100]];
  const heads = ['token', 'dim 1', 'dim 2', 'mask'];
  cols.forEach(([x, w], i) => s.text(x + w / 2, 104, heads[i], { size: 18, weight: 700, color: C.muted }));
  const rows = [['cat', 1, 2, 1], ['naps', 3, 0, 1], ['warm', 5, 4, 1], ['[PAD]', 9, 9, 0]];
  rows.forEach((r, j) => {
    const y = 120 + j * 44;
    const pad = r[3] === 0;
    cols.forEach(([x, w], i) => {
      const val = String(r[i]);
      s.rect(x, y, w, 40, { color: pad ? C.rose : C.ink, fill: pad ? C.roseSoft : undefined, fillStyle: pad ? 'solid' : 'hachure' });
      s.text(x + w / 2, y + 26, val, { size: 18, font: i === 0 ? 'hand' : 'mono', color: pad ? C.rose : C.ink });
    });
  });
  s.arrow(560, 210, 610, 210, { color: C.muted });
  s.note(620, 110, 230, 190, ['sum of real rows', '(1+3+5, 2+0+4)', '= (9, 6)', 'divide by 3 real', 'tokens: (3, 2)'], { size: 18 });
  s.text(440, 340, 'Without the mask: (18, 15) / 4 = (4.5, 3.75). The pad row leaks into the sentence.', { size: 18, color: C.rose });
  s.text(440, 372, 'Then divide the vector by its length, so that cosine becomes a plain dot product.', { size: 17, color: C.muted });
  save('34.1-mean-pooling.svg', s);
}

// 3. Offline and online pipeline (dimensions from the experiment: 24 documents, d = 8)
{
  const s = new Sketch(880, 320, { title: 'Bi-encoder retrieval: documents are encoded once, offline; each query needs one encoder pass and one matrix-vector product', seed: 3403 });
  s.text(440, 34, 'Offline once, online per query', { size: 24, weight: 700 });
  s.text(60, 92, 'offline (once)', { size: 18, color: C.muted, anchor: 'start' });
  s.rect(60, 100, 150, 50, { color: C.ink });
  s.text(135, 131, '24 documents', { size: 17 });
  s.arrow(210, 125, 258, 125, { color: C.muted });
  s.rect(260, 100, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(335, 131, 'encoder', { size: 18 });
  s.arrow(410, 125, 458, 125, { color: C.muted });
  s.rect(460, 100, 200, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(560, 131, 'matrix D: 24 x 8', { size: 17, font: 'mono' });
  s.text(60, 214, 'online (per query)', { size: 18, color: C.muted, anchor: 'start' });
  s.rect(60, 224, 150, 50, { color: C.ink });
  s.text(135, 255, 'query', { size: 18 });
  s.arrow(210, 249, 258, 249, { color: C.muted });
  s.rect(260, 224, 150, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(335, 255, 'encoder', { size: 18 });
  s.arrow(410, 249, 458, 249, { color: C.muted });
  s.rect(460, 224, 170, 50, { color: C.blue });
  s.text(545, 255, 'q: 8 values', { size: 17, font: 'mono' });
  s.arrow(630, 249, 668, 249, { color: C.muted });
  s.rect(670, 224, 170, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(755, 255, 'D q: 24 scores', { size: 17, font: 'mono' });
  s.arrow(560, 150, 700, 224, { color: C.green, dash: '6 8' });
  s.text(700, 300, 'then take the top-k', { size: 17, color: C.muted });
  save('34.1-pipeline.svg', s);
}

// 4. Work per query at one million documents (counts from the experiment; d = 768 is an assumed width)
{
  const s = new Sketch(880, 300, { title: 'Encoder passes and dot products per query at one million documents', seed: 3404 });
  s.text(440, 34, 'Work per query at N = 1,000,000 documents', { size: 24, weight: 700 });
  s.text(60, 88, 'cross-encoder', { size: 20, weight: 700, color: C.amber, anchor: 'start' });
  s.rect(60, 98, 760, 42, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(440, 125, '1,000,000 encoder passes, one per pair', { size: 18 });
  s.text(60, 186, 'bi-encoder', { size: 20, weight: 700, color: C.blue, anchor: 'start' });
  s.rect(60, 196, 6, 42, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(84, 223, '1 encoder pass (query) + 1,000,000 dot products', { size: 18, anchor: 'start' });
  s.text(60, 276, 'with d = 768: 1,000,000 x 768 = 7.68 x 10^8 multiply-adds, all cheap and batchable', { size: 16, color: C.muted, anchor: 'start' });
  save('34.1-cost.svg', s);
}

// 5. Cosine versus dot product (2-D geometry; values from the experiment)
{
  const s = new Sketch(880, 400, { title: 'Dot product rewards length; cosine rewards direction', seed: 3405 });
  s.text(440, 34, 'Dot product rewards length; cosine rewards direction', { size: 24, weight: 700 });
  s.line(100, 320, 520, 320, { color: C.muted });
  s.line(120, 340, 120, 120, { color: C.muted });
  s.arrow(120, 320, 240, 320, { color: C.blue, width: 3 });
  s.arrow(120, 320, 192, 320, { color: C.green, width: 3 });
  s.arrow(120, 320, 360, 200, { color: C.amber, width: 3 });
  s.text(250, 300, 'q = (1, 0)', { size: 18, color: C.blue, anchor: 'start' });
  s.text(192, 350, 'd1 = (0.6, 0)', { size: 18, color: C.green });
  s.text(372, 192, 'd2 = (2, 1)', { size: 18, color: C.amber, anchor: 'start' });
  s.note(560, 110, 290, 190, ['d1: dot = 0.60, cos = 1.000', 'd2: dot = 2.00, cos = 0.894', 'dot picks d2 (longer vector)', 'cos picks d1 (same direction)'], { size: 18 });
  s.text(440, 388, 'Normalising both vectors to length 1 makes the dot product equal to the cosine.', { size: 17, color: C.muted });
  save('34.1-cosine-dot.svg', s);
}
