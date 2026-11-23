import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-09-production-ai/chapter-55-llm-security/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Numbers are from the lesson's run (see the output blocks in 55.3-pii-content-moderation.md).

{
  const s = new Sketch(880, 300, { title: 'Three-stage redaction pipeline with an optional NER stage', seed: 5501 });
  s.text(440, 34, 'Redaction in three stages', { size: 26, weight: 700 });
  s.rect(30, 90, 200, 80, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(130, 122, '1  Find', { size: 22, weight: 700 });
  s.text(130, 150, 'regex per type', { font: 'mono', size: 15 });
  s.arrow(232, 130, 260, 130, { color: C.muted });
  s.rect(262, 90, 220, 80, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(372, 122, '2  Validate', { size: 22, weight: 700 });
  s.text(372, 150, 'Luhn, context words', { font: 'mono', size: 15 });
  s.arrow(484, 130, 512, 130, { color: C.muted });
  s.rect(514, 90, 200, 80, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(614, 122, '3  Replace', { size: 22, weight: 700 });
  s.text(614, 150, 'span to <TYPE>', { font: 'mono', size: 15 });
  s.arrow(716, 130, 740, 130, { color: C.muted });
  s.text(800, 136, 'output', { size: 19 });
  s.rect(262, 200, 220, 56, { color: C.muted, dash: '6 8' });
  s.text(372, 234, 'optional: NER model', { size: 18 });
  s.arrow(372, 198, 372, 174, { color: C.muted });
  s.text(440, 284, 'Stage 2 removes false positives. No stage guarantees full recall.', { size: 17, color: C.muted });
  save('55.3-pipeline.svg', s);
}

{
  const s = new Sketch(880, 300, { title: 'Naive name pattern span versus the gold span', seed: 5502 });
  s.text(440, 34, 'A boundary error in the name pattern', { size: 26, weight: 700 });
  s.text(60, 130, 'Contact Alice Moreno at the lab.', { font: 'mono', size: 22, anchor: 'start' });
  s.line(60, 104, 231, 104, { color: C.rose, width: 4 });
  s.text(146, 84, 'naive match: Contact Alice', { size: 18, color: C.rose });
  s.line(166, 158, 324, 158, { color: C.green, width: 4 });
  s.text(245, 190, 'gold: Alice Moreno', { size: 18, color: C.green });
  s.text(60, 250, '<NAME> Moreno at the lab.', { font: 'mono', size: 22, anchor: 'start' });
  s.text(430, 250, 'Moreno leaks', { size: 20, color: C.rose, anchor: 'start' });
  save('55.3-span-boundary.svg', s);
}

{
  const s = new Sketch(880, 330, { title: 'Bars: card false positives with and without the Luhn check', seed: 5503 });
  s.text(440, 34, 'The Luhn check on four card-like digit runs', { size: 26, weight: 700 });
  const base = 270, unit = 50;
  // regex only: 2 true cards (blue) and 2 false positives (rose)
  s.rect(130, base - 2 * unit, 120, 2 * unit, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(190, base - unit, 'TP 2', { size: 18 });
  s.rect(130, base - 4 * unit, 120, 2 * unit, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(190, base - 3 * unit, 'FP 2', { size: 18 });
  s.text(190, 300, 'regex only', { size: 19 });
  // regex + Luhn: 2 true cards, no false positives
  s.rect(470, base - 2 * unit, 120, 2 * unit, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(530, base - unit, 'TP 2', { size: 18 });
  s.text(530, 300, 'regex + Luhn', { size: 19 });
  s.line(40, base, 600, base, { color: C.muted });
  s.note(640, 100, 220, 150, ['4111 1111 1111 1111', 'sum 30: valid', '4111 1111 1111 1112', 'sum 31: rejected'], { size: 17 });
  save('55.3-luhn-check.svg', s);
}

{
  const s = new Sketch(880, 350, { title: 'Bars: benign flagged and harmful caught for three matching methods', seed: 5504 });
  s.text(440, 34, 'Three matching methods on the same sentences', { size: 26, weight: 700 });
  const unit = 40, x0 = 260;
  const rows = [
    ['substring', 7, 10, 5, 7],
    ['whole word', 0, 10, 3, 7],
    ['stemmed whole word', 0, 10, 5, 7],
  ];
  rows.forEach(([name, fp, nFp, tp, nTp], i) => {
    const y0 = 80 + i * 80;
    s.text(40, y0 + 22, name, { size: 20, anchor: 'start' });
    if (fp > 0) s.rect(x0, y0, fp * unit, 26, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(x0 + fp * unit + 12, y0 + 19, `${fp} of ${nFp} benign flagged`, { size: 17, anchor: 'start' });
    if (tp > 0) s.rect(x0, y0 + 34, tp * unit, 26, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(x0 + tp * unit + 12, y0 + 53, `${tp} of ${nTp} harmful caught`, { size: 17, anchor: 'start' });
  });
  s.rect(40, 322, 18, 18, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(66, 337, 'benign sentences flagged (of 10)', { size: 16, anchor: 'start' });
  s.rect(420, 322, 18, 18, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(446, 337, 'harmful test sentences caught (of 7)', { size: 16, anchor: 'start' });
  save('55.3-moderation-tradeoff.svg', s);
}

{
  const s = new Sketch(880, 380, { title: 'Same input encoded by concatenation and by json.dumps', seed: 5505 });
  s.text(440, 34, 'Same input, two encoders', { size: 26, weight: 700 });
  s.text(40, 80, 'concatenation', { size: 20, weight: 700, anchor: 'start' });
  s.rect(40, 95, 800, 58, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(440, 130, '{"user": "x", "role": "admin", "note": "hi"}', { font: 'mono', size: 18 });
  s.text(40, 180, 'parsed keys: user, role, note. The role key came from the input.', { size: 17, anchor: 'start', color: C.muted });
  s.text(40, 240, 'json.dumps', { size: 20, weight: 700, anchor: 'start' });
  s.rect(40, 255, 800, 58, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(440, 290, '{"user": "x\\", \\"role\\": \\"admin", "note": "hi"}', { font: 'mono', size: 18 });
  s.text(40, 345, 'The quotation marks are escaped, so the value stays one string. Only two keys.', { size: 17, anchor: 'start', color: C.muted });
  save('55.3-json-injection.svg', s);
}
