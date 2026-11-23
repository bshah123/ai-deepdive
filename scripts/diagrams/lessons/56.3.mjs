// Diagrams for 56.3 (cost accounting, budgets, fallback routing).
// Run: node scripts/diagrams/lessons/56.3.mjs
// Every number comes from scripts/diagrams/lessons/56.3_data.json (written by 56.3_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-09-production-ai/chapter-56-observability-cost/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const d = JSON.parse(readFileSync(join(HERE, '56.3_data.json'), 'utf8'));
const usd = (x, n = 2) => '$' + x.toFixed(n);

// ---------------------------------------------------------------- 56.3-cost-anatomy.svg
{
  const s = new Sketch(880, 400, { title: 'Stacked bars: cost per 10,000 requests split into input and output tokens, for a small and a large model', seed: 5601 });
  s.text(440, 34, 'Cost per 10,000 requests (1,200 in, 300 out)', { size: 26, weight: 700 });
  const base = 330, k = 3.1; // px per dollar
  s.line(150, base, 730, base, { color: C.muted, width: 2 });
  const bars = [
    ['small model', d.cost.small, 260],
    ['large model', d.cost.large, 540],
  ];
  for (const [label, c, cx] of bars) {
    const hi = c.input_per_10k * k, ho = c.output_per_10k * k;
    s.rect(cx - 70, base - hi, 140, hi, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.rect(cx - 70, base - hi - ho, 140, ho, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, base - hi - ho - 14, usd(c.total_per_10k), { size: 22, weight: 700 });
    s.text(cx, base + 30, label, { size: 19 });
  }
  s.rect(140, 62, 18, 18, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(166, 76, 'input tokens', { size: 17, anchor: 'start' });
  s.rect(320, 62, 18, 18, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(346, 76, 'output tokens', { size: 17, anchor: 'start' });
  s.note(655, 90, 205, 96, [`large / small = ${d.cost_ratio.toFixed(1)}x`, 'output is the bigger share', 'of the large bill'], { size: 17 });
  s.text(440, 384, 'Illustrative prices per million tokens: small $0.25 in / $1.00 out; large $3.00 in / $15.00 out.', { size: 15, color: C.muted });
  save('56.3-cost-anatomy.svg', s);
}

// ---------------------------------------------------------------- 56.3-budget-overshoot.svg
{
  const s = new Sketch(880, 400, { title: 'Bar chart: USD spent above the limit for naive admission, against concurrency; reserved admission stays at zero', seed: 5602 });
  s.text(440, 34, 'Overspend past a $1.00 limit, by concurrency', { size: 26, weight: 700 });
  const base = 320, k = 380; // px per dollar
  s.line(100, base, 800, base, { color: C.muted, width: 2 });
  const Ks = ['1', '2', '4', '8', '16', '32', '64'];
  Ks.forEach((K, i) => {
    const cx = 150 + i * 105;
    const over = d.sweep[K].naive.over_limit;
    const h = over * k;
    s.rect(cx - 30, base - h, 60, Math.max(h, 1), { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 12, usd(over, 3), { size: 15, weight: 700 });
    s.text(cx, base + 26, `K=${K}`, { size: 17 });
    s.line(cx - 30, base - 1, cx + 30, base - 1, { color: C.green, width: 4 });
  });
  s.text(440, 362, 'Green line at zero: reserved admission (holds) never exceeds the limit in this run.', { size: 16, color: C.muted });
  s.text(440, 388, `K = requests in flight at once. ${d.n_req} requests, worst case $${d.worst.toFixed(4)} each.`, { size: 16, color: C.muted });
  save('56.3-budget-overshoot.svg', s);
}

// ---------------------------------------------------------------- 56.3-breaker-states.svg
{
  const s = new Sketch(880, 330, { title: 'Circuit breaker state machine: closed, open and half-open, with the transitions used in the lesson code', seed: 5603 });
  s.text(440, 34, 'Circuit breaker states', { size: 26, weight: 700 });
  s.rect(40, 120, 200, 80, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(140, 160, 'closed: calls go to primary', { size: 17, weight: 700 });
  s.rect(340, 120, 200, 80, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(440, 160, 'open: skip primary', { size: 17, weight: 700 });
  s.rect(640, 120, 200, 80, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(740, 160, 'half-open: one probe', { size: 17, weight: 700 });
  s.arrow(240, 150, 340, 150, { color: C.muted, head: 9 });
  s.text(290, 108, '3 failures in a row', { size: 15 });
  s.arrow(540, 150, 640, 150, { color: C.muted, head: 9 });
  s.text(590, 108, '10 s cooldown', { size: 15 });
  s.curveArrow(700, 200, 540, 250, 240, 200, { color: C.muted, head: 9 });
  s.text(540, 282, 'probe succeeds: back to closed', { size: 15 });
  s.text(440, 318, 'Probe fails: back to open, cooldown restarts.', { size: 15, color: C.muted });
  save('56.3-breaker-states.svg', s);
}

// ---------------------------------------------------------------- 56.3-outage-cost.svg
{
  const s = new Sketch(880, 400, { title: 'Two bar panels: primary calls and seconds lost to timeouts, with and without a circuit breaker, during a 60-second outage', seed: 5604 });
  s.text(440, 34, '240 requests, 60 s outage, with and without a breaker', { size: 26, weight: 700 });
  const panels = [
    ['Primary calls (240 requests)', 'primary_calls', 240, 'calls', 220],
    ['Seconds lost to timeouts', 'wasted_s', 600, 's', 640],
  ];
  for (const [title, key, max, unit, px] of panels) {
    s.text(px, 80, title, { size: 19, weight: 700 });
    const base = 320, k = 200 / max;
    s.line(px - 150, base, px + 150, base, { color: C.muted, width: 2 });
    const a = d.outage.no_breaker[key], b = d.outage.breaker[key];
    s.rect(px - 110, base - a * k, 80, a * k, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.text(px - 70, base - a * k - 12, `${a}${unit === 's' ? ' s' : ''}`, { size: 18, weight: 700 });
    s.rect(px + 10, base - b * k, 80, b * k, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    s.text(px + 50, base - b * k - 12, `${b}${unit === 's' ? ' s' : ''}`, { size: 18, weight: 700 });
    s.text(px - 70, base + 26, 'no breaker', { size: 16 });
    s.text(px + 50, base + 26, 'breaker', { size: 16 });
  }
  s.text(440, 378, `Breaker: 3 failures to open, 10 s cooldown. Served by primary: ${d.outage.no_breaker.served_primary} vs ${d.outage.breaker.served_primary}.`, { size: 15, color: C.muted });
  save('56.3-outage-cost.svg', s);
}
console.log('wrote 4 SVGs for 56.3');
