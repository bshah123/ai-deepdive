// Diagrams for Lesson 3.3 (strings). Run: node scripts/diagrams/lessons/3.3.mjs
// Every number is read from scripts/diagrams/lessons/3.3_data.json, written by 3.3_data.py (CPython 3.12.13).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'content/part-01-python-properly/chapter-03-numbers-strings-booleans/diagrams');
mkdirSync(OUT, { recursive: true });
const D = JSON.parse(readFileSync(join(HERE, '3.3_data.json'), 'utf8'));
const get = (obj, key) => {
  if (!(key in obj)) throw new Error('missing data key: ' + key);
  return obj[key];
};
const save = (name, sk) => {
  writeFileSync(join(OUT, name), sk.toString());
  console.log('wrote', name);
};

// ---------------------------------------------------------------- 1. code points, UTF-8 bytes, UTF-16 units
{
  const s = new Sketch(880, 400, { title: 'Four strings with their code point, UTF-8 byte and UTF-16 unit counts', seed: 3301 });
  s.text(440, 36, 'One text, three counts', { size: 26, weight: 700 });
  s.text(180, 74, 'code points', { size: 15, color: C.muted, anchor: 'start' });
  s.text(610, 74, 'UTF-8 bytes', { size: 15, color: C.muted });
  s.text(740, 74, 'UTF-16 units', { size: 15, color: C.muted });
  const rows = [
    { label: 'café, NFC', idx: 0, codes: ['U+0063', 'U+0061', 'U+0066', 'U+00E9'] },
    { label: 'café, NFD', idx: 1, codes: ['U+0063', 'U+0061', 'U+0066', 'U+0065', 'U+0301'] },
    { label: 'one emoji', idx: 4, codes: ['U+1F600'] },
    { label: 'family', idx: 5, codes: ['U+1F468', 'U+200D', 'U+1F469', 'U+200D', 'U+1F467'] },
  ];
  rows.forEach((r, i) => {
    const cy = 132 + i * 66;
    const sm = D.samples[r.idx];
    if (r.codes.length !== sm.code_points) throw new Error('cell count mismatch for ' + r.label);
    s.text(40, cy + 6, r.label, { size: 19, anchor: 'start', weight: 700 });
    r.codes.forEach((code, j) => {
      const x = 180 + j * 78;
      const combining = code === 'U+0301' || code === 'U+200D';
      const fill = combining ? C.amberSoft : C.blueSoft;
      const color = combining ? C.amber : C.blue;
      s.rect(x, cy - 22, 74, 44, { color, fill, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
      s.text(x + 37, cy + 6, code, { font: 'mono', size: 15 });
    });
    s.text(610, cy + 7, String(sm.utf8_bytes), { size: 22, weight: 700 });
    s.text(740, cy + 7, String(sm.utf16_units), { size: 22, weight: 700 });
  });
  s.note(40, 354, 800, 40, ['len() counts code points. Bytes and UTF-16 units depend on the encoding.'], { size: 18 });
  save('3.3-code-points.svg', s);
}

// ---------------------------------------------------------------- 2. worked UTF-8 example: é 世 😀
{
  const s = new Sketch(880, 340, { title: 'Three characters, their code points and UTF-8 bytes: C3 A9, E4 B8 96, F0 9F 98 80', seed: 3302 });
  s.text(440, 36, 'Worked example: "é世😀" as UTF-8', { size: 26, weight: 700 });
  const w = D.worked;
  const cols = [
    { cx: 170, cp: 'U+00E9', kind: 'e-acute', bytes: w.utf8_hex.split(' ').slice(0, 2), color: C.blue, fill: C.blueSoft },
    { cx: 450, cp: 'U+4E16', kind: 'CJK ideograph', bytes: w.utf8_hex.split(' ').slice(2, 5), color: C.amber, fill: C.amberSoft },
    { cx: 730, cp: 'U+1F600', kind: 'emoji', bytes: w.utf8_hex.split(' ').slice(5, 9), color: C.green, fill: C.greenSoft },
  ];
  if (cols.reduce((n, c) => n + c.bytes.length, 0) !== 9) throw new Error('byte split mismatch');
  cols.forEach((c) => {
    s.text(c.cx, 92, c.kind, { size: 17, color: C.muted });
    s.rect(c.cx - 85, 106, 170, 46, { color: c.color, fill: c.fill, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
    s.text(c.cx, 136, c.cp, { font: 'mono', size: 19, weight: 700 });
    const x0 = c.cx - ((c.bytes.length * 60) - 4) / 2;
    c.bytes.forEach((b, j) => {
      const x = x0 + j * 60;
      s.rect(x, 188, 56, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid', width: 1.2, roughness: 0.6 });
      s.text(x + 28, 214, b, { font: 'mono', size: 17 });
    });
    s.arrow(c.cx, 154, c.cx, 184, { color: C.muted });
    s.text(c.cx, 256, `${c.bytes.length} bytes`, { size: 19, weight: 700 });
  });
  s.note(40, 280, 800, 44, [`3 code points, ${w.utf8_hex.split(' ').length} bytes, ${w.utf16_units} UTF-16 units. U+1F600 is 000 011111 011000 000000 in bits.`], { size: 17 });
  save('3.3-worked-bytes.svg', s);
}

// ---------------------------------------------------------------- 3. flexible width (PEP 393)
{
  const s = new Sketch(880, 370, { title: 'Bytes for a 1000-character string by widest character: 1041, 1057, 2058, 4060', seed: 3303 });
  s.text(440, 36, 'Bytes for a 1000-character string', { size: 26, weight: 700 });
  const max = Math.max(...D.sizes.map((z) => z.getsizeof_1000));
  const X0 = 300, SCALE = 340 / max;
  const fills = [[C.blueSoft, C.blue], [C.blueSoft, C.blue], [C.amberSoft, C.amber], [C.roseSoft, C.rose]];
  D.sizes.forEach((z, i) => {
    const y = 84 + i * 62;
    s.text(40, y + 24, z.name, { size: 18, anchor: 'start' });
    const bw = z.getsizeof_1000 * SCALE;
    s.rect(X0, y, bw, 42, { color: fills[i][1], fill: fills[i][0], fillStyle: 'solid', width: 1.5, roughness: 0.8 });
    s.text(X0 + bw + 14, y + 26, `${z.getsizeof_1000} bytes`, { size: 18, anchor: 'start', font: 'mono' });
  });
  s.note(40, 320, 800, 36, ['The widest character sets the width of every character (PEP 393), not the encoding.'], { size: 18 });
  save('3.3-flexible-width.svg', s);
}

// ---------------------------------------------------------------- 4. rebinding instead of mutating
{
  const s = new Sketch(880, 300, { title: 'Before and after s += of a string that t also names', seed: 3304 });
  const after = D.after_plus_eq;
  s.text(220, 44, 'before: t = s', { size: 22, weight: 700 });
  s.text(660, 44, "after: s += ', world'", { size: 22, weight: 700 });
  s.rect(40, 110, 70, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid', width: 1.2, roughness: 0.6 });
  s.text(75, 136, 's', { font: 'mono', size: 17 });
  s.rect(40, 180, 70, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid', width: 1.2, roughness: 0.6 });
  s.text(75, 206, 't', { font: 'mono', size: 17 });
  s.rect(220, 150, 170, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
  s.text(305, 178, '"Hello"', { font: 'mono', size: 17 });
  s.arrow(110, 130, 220, 164, { color: C.muted });
  s.arrow(110, 200, 220, 178, { color: C.muted });
  s.rect(470, 110, 70, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid', width: 1.2, roughness: 0.6 });
  s.text(505, 136, 's', { font: 'mono', size: 17 });
  s.rect(470, 180, 70, 40, { color: C.ink, fill: C.blueSoft, fillStyle: 'solid', width: 1.2, roughness: 0.6 });
  s.text(505, 206, 't', { font: 'mono', size: 17 });
  s.rect(640, 96, 200, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
  s.text(740, 124, `"${after.s}"`, { font: 'mono', size: 17 });
  s.rect(640, 180, 200, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
  s.text(740, 208, `"${after.t}"`, { font: 'mono', size: 17 });
  s.arrow(540, 130, 640, 118, { color: C.muted });
  s.arrow(540, 200, 640, 202, { color: C.muted });
  s.note(40, 248, 800, 40, [`s is rebound to a new object. t still names the old one (s is t: ${after.s_is_t ? 'True' : 'False'}).`], { size: 18 });
  save('3.3-rebind.svg', s);
}

// ---------------------------------------------------------------- 5. identity: which strings are the same object
{
  const s = new Sketch(880, 560, { title: 'Seven identity checks, each with the object layout and the measured is result', seed: 3305 });
  s.text(440, 36, 'Literals, folding, runtime strings, sys.intern', { size: 26, weight: 700 });
  s.text(40, 72, 'expression', { size: 15, color: C.muted, anchor: 'start' });
  s.text(560, 72, 'objects', { size: 15, color: C.muted });
  s.text(800, 72, 'is', { size: 15, color: C.muted });
  const I = D.identity;
  const rows = [
    { expr: 'f() is g()   (one module)', same: true, res: get(I, 'f() is g()  (same text, two code objects, space in text)') },
    { expr: 'f1() is f2()   (two compile calls)', same: false, res: D.cross_unit_literal_is },
    { expr: 'h() is f()   ("hello " + "world")', same: true, res: get(I, 'h() is f()') },
    { expr: "''.join(['hello', ' world']) is f()", same: false, res: get(I, 'runtime \'hello world\' is f()') },
    { expr: 'sys.intern(that) is f()', same: false, res: get(I, "sys.intern(runtime 'hello world') is f()") },
    { expr: "''.join(['hel', 'lo']) is 'hello'", same: false, res: get(I, "joined 'hello' is literal 'hello'") },
    { expr: "sys.intern(that) is 'hello'", same: true, res: get(I, "sys.intern(joined 'hello') is literal 'hello'") },
  ];
  rows.forEach((r, i) => {
    const cy = 118 + i * 58;
    s.text(40, cy + 6, r.expr, { font: 'mono', size: 15, anchor: 'start' });
    if (r.same) {
      s.rect(560, cy - 16, 200, 32, { color: C.green, fill: C.greenSoft, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
      s.text(660, cy + 6, 'one object', { size: 16 });
    } else {
      s.rect(540, cy - 16, 110, 32, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
      s.text(595, cy + 6, 'object A', { size: 15 });
      s.rect(670, cy - 16, 110, 32, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid', width: 1.5, roughness: 0.8 });
      s.text(725, cy + 6, 'object B', { size: 15 });
    }
    s.text(810, cy + 7, r.res ? 'True' : 'False', { size: 20, weight: 700, color: r.res ? C.green : C.rose });
  });
  s.note(40, 500, 800, 42, ['Literals in one module can share an object. sys.intern() returns the table entry for a value.'], { size: 17 });
  save('3.3-identity.svg', s);
}
