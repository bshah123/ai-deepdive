import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-06-rag/chapter-40-context-optimization/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below comes from 40.3_experiment.py (run it to regenerate 40.3_data.json).
const D = JSON.parse(readFileSync(join(HERE, '40.3_data.json'), 'utf8'));
const fmt = (n) => Math.round(n).toLocaleString('en-US');

// 1. Blocks: exact-prefix reuse, block by block
{
  const s = new Sketch(880, 345, { title: 'Prompt blocks: call 1 writes all four, call 3 reuses only the first', seed: 101 });
  s.text(440, 36, 'Caching matches exact prefixes, block by block', { size: 24, weight: 700 });
  const names = ['tools', 'system', 'document', 'user question'];
  const xs = [40, 245, 450, 655];
  const w = 180;
  s.text(40, 84, 'call 1: nothing cached yet', { size: 19, anchor: 'start' });
  names.forEach((n, i) => {
    s.rect(xs[i], 96, w, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(xs[i] + w / 2, 127, n, { size: 20 });
    s.text(xs[i] + w / 2, 170, 'written', { size: 18, color: C.muted });
  });
  s.text(40, 214, 'call 3: a date is added to the system block', { size: 19, anchor: 'start' });
  const fills = [
    [C.green, C.greenSoft, 'reused'],
    [C.rose, C.roseSoft, 'changed'],
    [C.amber, C.amberSoft, 'recomputed'],
    [C.amber, C.amberSoft, 'recomputed'],
  ];
  names.forEach((n, i) => {
    s.rect(xs[i], 226, w, 50, { color: fills[i][0], fill: fills[i][1], fillStyle: 'solid' });
    s.text(xs[i] + w / 2, 257, n, { size: 20 });
    s.text(xs[i] + w / 2, 300, fills[i][2], { size: 18, color: C.muted });
  });
  s.text(440, 330, `${D.prefix_match[2]}: nothing after the first change is reused`, { size: 19 });
  save('40.3-prefix-blocks.svg', s);
}

// 2. Causal attention: an early edit changes later keys
{
  const s = new Sketch(880, 330, { title: 'An edit at position 2 changes keys at later positions', seed: 102 });
  s.text(440, 36, 'An early edit invalidates every later position, layer by layer', { size: 24, weight: 700 });
  const x0 = 60, step = 66, cw = 58;
  const row = (y, label, fillFor) => {
    s.text(x0, y - 12, label, { size: 19, anchor: 'start' });
    for (let p = 0; p < 12; p++) {
      const [col, soft] = fillFor(p);
      s.rect(x0 + p * step, y, cw, 44, { color: col, fill: soft, fillStyle: 'solid' });
      s.text(x0 + p * step + cw / 2, y + 29, String(p), { font: 'mono', size: 17 });
    }
  };
  const l1 = D.changed_positions.layer1;
  const l2 = D.changed_positions.layer2;
  row(100, 'layer 1 keys', (p) => (p >= 8 ? [C.amber, C.amberSoft] : l1.includes(p) ? [C.rose, C.roseSoft] : [C.blue, C.blueSoft]));
  row(200, 'layer 2 keys', (p) => (p >= 8 ? [C.amber, C.amberSoft] : l2.includes(p) ? [C.rose, C.roseSoft] : [C.blue, C.blueSoft]));
  s.text(x0 + 3.5 * step + cw / 2 - 30, 272, `prefix: ${D.prefix_len} tokens, cached`, { size: 18 });
  s.text(x0 + 9.5 * step + cw / 2 - 30, 272, `new: ${D.suffix_len}`, { size: 18 });
  s.text(440, 312, `Edit at position 2: layer 1 changes ${l1.length} key, layer 2 changes ${l2.length} (positions 2 to 7).`, { size: 19 });
  save('40.3-causal-reuse.svg', s);
}

// 3. Timeline: hits and misses under two TTLs
{
  const s = new Sketch(880, 350, { title: 'Hit or miss for ten requests under 5-minute and 1-hour TTL', seed: 103 });
  s.text(440, 36, 'Ten requests on one shared prefix', { size: 24, weight: 700 });
  const xAt = (i) => 160 + i * 72;
  for (let i = 1; i < 10; i++) {
    s.text((xAt(i - 1) + xAt(i)) / 2, 96, `+${D.gaps[i - 1]} s`, { size: 16, font: 'mono' });
  }
  const lanes = [
    ['5-minute TTL', D.policies['5-minute TTL'].log, 150],
    ['1-hour TTL', D.policies['1-hour TTL'].log, 250],
  ];
  for (const [name, log, y] of lanes) {
    s.text(20, y + 6, name, { size: 19, anchor: 'start' });
    log.forEach((r, i) => {
      const hit = r === 'hit';
      s.rect(xAt(i) - 32, y - 18, 64, 36, {
        color: hit ? C.green : C.rose,
        fill: hit ? C.greenSoft : C.roseSoft,
        fillStyle: 'solid',
      });
      s.text(xAt(i), y + 6, r, { size: 17 });
    });
  }
  s.text(440, 318, 'Hits refresh the clock. The 400 s gap misses the 5-minute cache, not the 1-hour one.', { size: 18 });
  save('40.3-timeline.svg', s);
}

// 4. Bars: total input cost per policy
{
  const s = new Sketch(880, 400, { title: 'Total input cost of ten requests under three policies', seed: 104 });
  s.text(440, 36, 'Input cost of ten requests, in base-token units', { size: 24, weight: 700 });
  const names = ['no cache', '5-minute TTL', '1-hour TTL'];
  const maxTotal = D.policies['no cache'].total;
  const scale = 480 / maxTotal;
  names.forEach((name, i) => {
    const top = 96 + i * 90;
    const pol = D.policies[name];
    const w = pol.total * scale;
    const writes = pol.log.filter((r) => r === 'miss').length;
    const reads = pol.log.filter((r) => r === 'hit').length;
    const cap = name === 'no cache'
      ? '10 requests, each paying full price'
      : `${writes} writes at full premium, ${reads} reads at 0.1x`;
    s.text(40, top + 30, name, { size: 19, anchor: 'start' });
    if (name === 'no cache') {
      s.rect(250, top, w, 48, { color: C.muted, fillStyle: 'hachure' });
    } else {
      s.rect(250, top, w, 48, { color: name === '1-hour TTL' ? C.violet : C.blue, fill: name === '1-hour TTL' ? C.violet : C.blue, fillStyle: 'solid' });
    }
    s.text(250 + w + 14, top + 30, fmt(pol.total), { size: 19, anchor: 'start' });
    s.text(250, top + 70, cap, { size: 16, anchor: 'start', color: C.muted });
  });
  s.text(440, 380, 'Input tokens only. Output tokens cost the same under every policy and are left out.', { size: 17 });
  save('40.3-cost-bars.svg', s);
}
console.log('wrote 40.3 diagrams to', OUT);
