// Shared drawing helpers for the Chapter 2 diagrams (lessons 2.1-2.10).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

export { Sketch, C };
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
export const OUT = join(ROOT, 'content/part-01-python-properly/chapter-02-variables-objects-memory/diagrams');
mkdirSync(OUT, { recursive: true });
export const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// A name tag (a label stuck on an object). Returns the anchor points.
export function nameTag(s, x, y, label, { w = 56, h = 28, color = C.amber, soft = C.amberSoft, size = 16 } = {}) {
  s.rect(x, y, w, h, { color, fill: soft, fillStyle: 'solid', width: 1.3, roughness: 0.9 });
  s.text(x + w / 2, y + h / 2 + 5, label, { font: 'mono', size });
  return { right: [x + w, y + h / 2], left: [x, y + h / 2], bottom: [x + w / 2, y + h], top: [x + w / 2, y], cx: x + w / 2, cy: y + h / 2 };
}

// An object box: a small type caption above, the value inside. Solid soft fill (text sits on it).
export function objBox(s, x, y, w, h, value, type, { color = C.blue, soft = C.blueSoft, size = 17, caption = true, dash } = {}) {
  s.rect(x, y, w, h, { color, fill: soft, fillStyle: 'solid', width: 1.6, roughness: 0.9, dash });
  if (value !== null && value !== undefined && value !== '') s.text(x + w / 2, y + h / 2 + 6, value, { font: 'mono', size });
  if (caption && type) s.text(x + 4, y - 6, type, { size: 16, anchor: 'start', color: C.muted });
  return { left: [x, y + h / 2], right: [x + w, y + h / 2], top: [x + w / 2, y], bottom: [x + w / 2, y + h], cx: x + w / 2, cy: y + h / 2 };
}

// Arrow between two anchor points (optionally curved through a control point).
export function ref(s, from, to, { color = C.ink, width = 1.8, head = 11, via } = {}) {
  if (via) return s.curveArrow(from[0], from[1], via[0], via[1], to[0], to[1], { color, width, head });
  return s.arrow(from[0], from[1], to[0], to[1], { color, width, head });
}
