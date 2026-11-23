import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-08-agents/chapter-50-multi-agent-systems/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
// Every number below comes from 50.1_experiment.py (run it to regenerate this file).
const D = JSON.parse(readFileSync(join(HERE, '50.1_data.json'), 'utf8'));

const hopWord = (h) => (h === 1 ? 'hop' : 'hops');

// 1. Three topologies on eight agents
{
  const s = new Sketch(880, 380, { title: 'Star, binary tree and complete graph, each with eight agents', seed: 501 });
  s.text(440, 36, 'Three ways to wire eight agents', { size: 26, weight: 700 });
  const panels = [
    { x: 20, name: 'Star: one supervisor', t: D.topologies[0] },
    { x: 310, name: 'Tree: a hierarchy', t: D.topologies[1] },
    { x: 600, name: 'Complete: peer-to-peer', t: D.topologies[2] },
  ];
  for (const p of panels) {
    const cx = p.x + 130;
    s.rect(p.x, 80, 260, 290, { color: C.muted, dash: '6 8' });
    s.text(cx, 110, p.name, { size: 19, weight: 700 });
    s.text(cx, 134, `${p.t.edges} links · max ${p.t.hops} ${hopWord(p.t.hops)}`, { size: 16, font: 'mono', color: C.muted });
  }
  // Star (panel 1): hub at top centre, seven workers in a row
  {
    const cx = 150, hubY = 185, rowY = 300;
    const offs = [-105, -70, -35, 0, 35, 70, 105];
    for (const o of offs) s.line(cx, hubY, cx + o, rowY, { color: C.muted, width: 2 });
    for (const o of offs) s.circle(cx + o, rowY, 24, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.circle(cx, hubY, 30, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, hubY + 6, 'S', { font: 'mono', size: 18, weight: 700 });
  }
  // Tree (panel 2): binary heap layout, node 0 at the root
  {
    const cx = 440;
    const pos = [
      [cx, 170], [cx - 65, 235], [cx + 65, 235],
      [cx - 98, 300], [cx - 33, 300], [cx + 33, 300], [cx + 98, 300],
      [cx - 98, 345],
    ];
    const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7]];
    for (const [a, b] of edges) s.line(pos[a][0], pos[a][1], pos[b][0], pos[b][1], { color: C.muted, width: 2 });
    pos.forEach(([x, y], i) => {
      const root = i === 0;
      s.circle(x, y, root ? 30 : 24, root
        ? { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' }
        : { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    });
    s.text(cx, 175, 'R', { font: 'mono', size: 18, weight: 700 });
  }
  // Complete graph (panel 3): eight agents on a ring, every pair linked
  {
    const cx = 730, cy = 245, r = 95;
    const pts = [...Array(8).keys()].map((i) => {
      const a = (2 * Math.PI * i) / 8 - Math.PI / 2;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      s.line(pts[i][0], pts[i][1], pts[j][0], pts[j][1], { color: C.muted, width: 1 });
    }
    for (const [x, y] of pts) s.circle(x, y, 24, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  }
  save('50.1-topologies.svg', s);
}

// 2. What one failure costs
{
  const s = new Sketch(880, 350, { title: 'Bar chart: share of agent pairs still connected after one failure, by topology', seed: 502 });
  s.text(440, 34, 'What one failure costs', { size: 26, weight: 700 });
  s.rect(230, 48, 22, 16, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(262, 62, 'hub or root removed', { size: 17, anchor: 'start' });
  s.rect(520, 48, 22, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(552, 62, 'average over one removed agent', { size: 17, anchor: 'start' });
  const base = 300, H = 180;
  s.line(90, base, 790, base, { color: C.muted, width: 2 });
  const groups = [180, 440, 700];
  D.topologies.forEach((t, i) => {
    const g = groups[i];
    const bars = [
      { x: g - 62, v: t.hub_gone, c: C.amber, f: C.amberSoft },
      { x: g + 6, v: t.avg_one_lost, c: C.blue, f: C.blueSoft },
    ];
    for (const b of bars) {
      const h = b.v * H;
      if (h > 0) s.rect(b.x, base - h, 56, h, { color: b.c, fill: b.f, fillStyle: 'solid' });
      s.text(b.x + 28, base - h - 10, b.v.toFixed(3), { font: 'mono', size: 16 });
    }
    s.text(g, 330, t.name, { size: 19, weight: 700 });
  });
  save('50.1-failure.svg', s);
}

// 3. Majority vote gain as errors become correlated
{
  const s = new Sketch(880, 400, { title: 'Line chart: error of a five-agent majority vote against the amount of error correlation rho', seed: 503 });
  s.text(440, 34, 'Five voters, shared errors', { size: 26, weight: 700 });
  s.text(120, 66, 'blue: five agents, error rate by rho · dashed: one agent alone', { size: 17, anchor: 'start' });
  const X = (r) => 120 + r * 520;
  const Y = (e) => 330 - (e / 0.35) * 240;
  s.line(120, 90, 120, 330, { color: C.ink, width: 2 });
  s.line(120, 330, 640, 330, { color: C.ink, width: 2 });
  for (const e of [0, 0.1, 0.2, 0.3]) {
    s.line(114, Y(e), 120, Y(e), { color: C.ink, width: 2 });
    s.text(104, Y(e) + 6, e.toFixed(1), { anchor: 'end', font: 'mono', size: 16 });
  }
  s.text(56, 210, 'error rate', { size: 19, rotate: -90 });
  for (const r of [0, 0.25, 0.5, 0.75, 1]) s.text(X(r), 356, r.toFixed(2), { font: 'mono', size: 16 });
  s.text(380, 388, 'rho: fraction of trials where all five agents share one error', { size: 18 });
  // single agent reference
  s.line(120, Y(D.p), 640, Y(D.p), { color: C.rose, width: 2, dash: '6 8' });
  s.text(650, Y(D.p) + 6, `one agent: ${D.p.toFixed(3)}`, { size: 17, anchor: 'start', color: C.rose });
  // curve
  const pts = D.five_by_rho.map((d) => [X(d.rho), Y(d.err), d.err]);
  for (let i = 1; i < pts.length; i++) {
    s.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], { color: C.blue, width: 3 });
  }
  for (const [x, y, e] of pts) {
    s.circle(x, y, 12, { color: C.blue, fill: C.blue, fillStyle: 'solid' });
    s.text(x + 12, y + 28, e.toFixed(3), { font: "mono", size: 16, anchor: "start" });
  }
  save('50.1-correlated-vote.svg', s);
}

// 4. Messages per task
{
  const s = new Sketch(880, 360, { title: 'Bar chart: messages per task for supervisor and debate designs', seed: 504 });
  s.text(440, 34, 'Messages per task', { size: 26, weight: 700 });
  const base = 290, scale = 4.2;
  s.line(90, base, 800, base, { color: C.muted, width: 2 });
  const items = [
    { label: ['supervisor', '3 subtasks'], v: D.messages.supervisor_3, c: C.blue, f: C.blueSoft },
    { label: ['supervisor', '5 subtasks'], v: D.messages.supervisor_5, c: C.blue, f: C.blueSoft },
    { label: ['debate', '3 agents, 2 rounds'], v: D.messages.debate_3x2, c: C.rose, f: C.roseSoft },
    { label: ['debate', '5 agents, 2 rounds'], v: D.messages.debate_5x2, c: C.rose, f: C.roseSoft },
  ];
  items.forEach((it, i) => {
    const cx = 165 + i * 210;
    const h = it.v * scale;
    s.rect(cx - 45, base - h, 90, h, { color: it.c, fill: it.f, fillStyle: 'solid' });
    s.text(cx, base - h - 12, String(it.v), { font: 'mono', size: 18, weight: 700 });
    s.text(cx, 318, it.label, { size: 17 });
  });
  save('50.1-messages.svg', s);
}
