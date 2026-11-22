import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

// Numbers come from scripts/diagrams/lessons/6.1_data.py (CPython 3.12.13). Probe and mask rules: CPython 3.12 Objects/dictobject.c.
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-01-python-properly/chapter-06-dictionaries-hash-tables/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const m = { font: 'mono', size: 17 };

// 1. key -> hash -> mask -> slot, with the bits of the worked example
{
  const s = new Sketch(880, 290, { title: 'Pipeline: key 13 has hash 13; 13 AND 7 is 5, so the entry goes to slot 5.', seed: 601 });
  s.text(440, 34, 'From key to slot: hash, then mask', { size: 26, weight: 700 });
  const y = 66, h = 56;
  s.rect(30, y, 150, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(105, y + 36, 'key 13', { ...m, size: 19 });
  s.arrow(186, y + 28, 236, y + 28, { color: C.muted });
  s.rect(240, y, 200, h, { color: C.violet, fill: C.violetSoft ?? C.blueSoft, fillStyle: 'solid' });
  s.text(340, y + 36, 'hash(13) = 13', { ...m, size: 19 });
  s.arrow(446, y + 28, 496, y + 28, { color: C.muted });
  s.rect(500, y, 170, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(585, y + 36, '13 & 7 = 5', { ...m, size: 19 });
  s.arrow(676, y + 28, 716, y + 28, { color: C.muted });
  s.rect(720, y, 130, h, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(785, y + 36, 'slot 5', { ...m, size: 19 });
  // bit arithmetic under the mask box
  s.text(585, 160, '1101   13', { ...m, size: 19 });
  s.text(585, 190, '0111   mask 7', { ...m, size: 19 });
  s.line(500, 202, 670, 202, { color: C.ink, width: 2 });
  s.text(585, 230, '0101   5', { ...m, size: 19, weight: 700 });
  s.text(60, 170, 'Only the low three bits', { size: 22, anchor: 'start' });
  s.text(60, 200, 'pick the slot when the', { size: 22, anchor: 'start' });
  s.text(60, 230, 'table has 8 slots.', { size: 22, anchor: 'start' });
  save('6.1-key-to-slot.svg', s);
}

// 2. eight keys per slot pattern
{
  const s = new Sketch(880, 380, { title: 'Keys 0 to 7 fill slots 0 to 7 one each; keys 0, 8, ..., 56 all land in slot 0.', seed: 602 });
  s.text(440, 34, 'Eight slots, two key sets', { size: 26, weight: 700 });
  s.text(60, 72, 'keys 0..7: hash & 7 gives 0..7', { size: 21, anchor: 'start', color: C.muted });
  for (let i = 0; i < 8; i++) {
    const x = 60 + i * 100;
    s.rect(x, 90, 84, 52, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + 42, 124, String(i), { ...m, size: 19 });
    s.text(x + 42, 162, `slot ${i}`, { ...m, size: 15, color: C.muted });
  }
  s.text(60, 214, 'keys 0, 8, 16, ..., 56: hash & 7 gives 0 for all eight', { size: 21, anchor: 'start', color: C.muted });
  for (let i = 0; i < 8; i++) {
    const x = 60 + i * 100;
    s.rect(x, 232, 84, 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(x + 42, 259, String(i * 8), { ...m, size: 18 });
    s.arrow(x + 42, 276, 110, 330, { color: C.rose, head: 9 });
  }
  s.rect(60, 330, 200, 40, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(160, 357, 'slot 0: 8 keys', { ...m, size: 18, weight: 700 });
  s.text(300, 357, 'slots 1 to 7: empty', { ...m, size: 18, anchor: 'start', color: C.muted });
  save('6.1-slot-collisions.svg', s);
}

// 3. equality calls per lookup, n = 1000
{
  const s = new Sketch(880, 350, { title: 'Bar chart of __eq__ calls per lookup for 1000 keys: list absent 1000, dict absent 0, dict present 1, dict with equal hashes absent 1000.', seed: 603 });
  s.text(440, 34, '__eq__ calls per lookup, n = 1000 keys', { size: 26, weight: 700 });
  const rows = [
    ['list, key absent', 1000, C.amber, C.amberSoft],
    ['dict, key absent', 0, C.green, C.greenSoft],
    ['dict, key present', 1, C.green, C.greenSoft],
    ['dict, all hashes 0, absent', 1000, C.rose, C.roseSoft],
  ];
  const x0 = 330, scale = 400 / 1000;
  rows.forEach(([label, v, col, soft], i) => {
    const y = 80 + i * 56;
    s.text(40, y + 26, label, { size: 21, anchor: 'start' });
    const w = Math.max(v * scale, 2);
    s.rect(x0, y, w, 36, { color: col, fill: soft, fillStyle: 'solid' });
    s.text(x0 + w + 12, y + 26, String(v), { ...m, size: 19, weight: 700, anchor: 'start' });
  });
  s.note(40, 296, 800, 40, ['Same counts for n = 10, 100, 1000 and 10000 (list absent = n, dict absent = 0, dict present = 1).'], { size: 18 });
  save('6.1-eq-calls.svg', s);
}

// 4. the hash contract: equal objects must share a slot
{
  const s = new Sketch(880, 375, { title: 'Left: equal objects with equal hash share a slot and are found. Right: equal objects with identity hashes land in different slots and are missed.', seed: 604 });
  s.text(440, 34, 'The contract: equal objects need equal hashes', { size: 25, weight: 700 });
  // left panel
  s.rect(30, 60, 400, 290, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.5 });
  s.text(230, 92, 'Pt("a") == Pt("a"), hash equal', { size: 20, weight: 700 });
  s.rect(60, 120, 150, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(135, 148, 'stored key', { ...m, size: 17 });
  s.rect(270, 120, 130, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(335, 148, 'lookup key', { ...m, size: 17 });
  s.arrow(135, 164, 230, 240, { color: C.muted });
  s.arrow(335, 164, 290, 240, { color: C.muted });
  s.rect(200, 240, 170, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(285, 268, 'same slot', { ...m, size: 17, weight: 700 });
  s.text(230, 330, 'result: found (True)', { size: 21, weight: 700 });
  // right panel
  s.rect(450, 60, 400, 290, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid', width: 1.5 });
  s.text(650, 92, 'Tag("x") == Tag("x"), id hash', { size: 20, weight: 700 });
  s.rect(480, 120, 150, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(555, 148, 'stored key', { ...m, size: 17 });
  s.rect(690, 120, 130, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(755, 148, 'lookup key', { ...m, size: 17 });
  s.arrow(555, 164, 530, 240, { color: C.muted });
  s.arrow(755, 164, 790, 240, { color: C.muted, dash: '6 8' });
  s.rect(440, 240, 170, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(525, 268, 'slot A (full)', { ...m, size: 17, weight: 700 });
  s.rect(680, 240, 170, 44, { color: C.muted, fill: 'none', fillStyle: 'hachure' });
  s.text(765, 268, 'slot B (empty)', { ...m, size: 17, color: C.muted });
  s.text(650, 330, 'result: missed (False)', { size: 21, weight: 700 });
  save('6.1-hash-contract.svg', s);
}

// 5. mutated key: stale slot
{
  const s = new Sketch(880, 420, { title: 'A key is mutated after insertion. Its entry stays in the old slot, while lookups for the new value go to a different slot.', seed: 605 });
  s.text(440, 34, 'Mutating a key after insertion', { size: 26, weight: 700 });
  const strip = (y, cells, label, note, col, soft) => {
    s.text(40, y + 30, label, { size: 20, anchor: 'start', weight: 700 });
    for (let i = 0; i < 8; i++) {
      const x = 250 + i * 60;
      const hit = cells[i];
      const filled = hit && hit !== 'empty';
      s.rect(x, y, 56, 56, { color: filled ? col : C.muted, fill: filled ? soft : 'none', fillStyle: filled ? 'solid' : 'hachure' });
      if (filled) s.text(x + 28, y + 35, hit, { ...m, size: 15 });
      if (hit === 'empty') s.text(x + 28, y + 35, 'empty', { ...m, size: 13, color: C.muted });
    }
    s.text(250, y + 80, note, { size: 19, anchor: 'start', color: C.muted });
  };
  // a's slot = 2, b's slot = 6 (illustrative positions)
  strip(70, [null, null, 'a:1', null, null, null, null, null], '1. insert p, name "a"', 'entry sits in a’s slot', C.blue, C.blueSoft);
  strip(170, [null, null, 'a:1', null, null, null, null, null], '2. p.name = "b"', 'entry unchanged; hash no longer matches', C.amber, C.amberSoft);
  strip(270, [null, null, 'a:1', null, null, null, 'empty', null], '3. Pt("b") in table', 'hash("b") points at b’s slot: empty', C.rose, C.roseSoft);
  save('6.1-stale-key.svg', s);
}
