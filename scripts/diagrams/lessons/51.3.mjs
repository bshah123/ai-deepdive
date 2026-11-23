import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-08-agents/chapter-51-langgraph/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below comes from the real run in the lesson (langgraph 1.2.24, Python 3.12).
// Approve calls: 1 (first pause), 2 (after resume "yes"), 3 (fork pause), 4 (fork resume "no").
// Send calls: 0, 1, 1, 1. Checkpoints: 5 before the fork, 7 after it.

// 1. Pause and resume timeline
{
  const s = new Sketch(880, 330, { title: 'draft, approve pauses at interrupt, a human answers, approve runs again, then send', seed: 301 });
  s.text(440, 34, 'interrupt() pauses the run; resume re-runs the node from its first line', { size: 24, weight: 700 });
  const y = 120, h = 56;
  s.rect(40, y, 130, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(105, y + 36, 'draft', { size: 22 });
  s.rect(210, y, 150, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(285, y + 36, 'approve', { size: 22 });
  s.rect(400, y, 140, h, { color: C.violet, fill: 'none', fillStyle: 'solid', dash: '6 8' });
  s.text(470, y + 36, 'human', { size: 22 });
  s.rect(580, y, 130, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(645, y + 36, 'approve', { size: 22 });
  s.rect(750, y, 100, h, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(800, y + 36, 'send', { size: 22 });
  s.arrow(170, y + 28, 210, y + 28, { color: C.muted });
  s.arrow(360, y + 28, 400, y + 28, { color: C.muted });
  s.arrow(540, y + 28, 580, y + 28, { color: C.muted });
  s.arrow(710, y + 28, 750, y + 28, { color: C.muted });
  s.text(105, 206, ['draft ran', '1 time'], { size: 16 });
  s.text(285, 206, ['approve ran 1 time,', 'then interrupt() pauses'], { size: 16 });
  s.text(470, 206, ['answer "yes" is', 'the resume value'], { size: 16 });
  s.text(645, 206, ['approve runs again', 'from its first line'], { size: 16 });
  s.text(800, 206, ['send ran', '1 time'], { size: 16 });
  s.note(40, 250, 800, 60, ['A checkpoint is saved at the pause, so the process can stop and resume later on the same thread_id.'], { size: 18 });
  save('51.3-pause-resume.svg', s);
}

// 2. Checkpoint history: a fork adds a branch and keeps the original
{
  const s = new Sketch(880, 430, { title: 'Checkpoint chain: a fork from step 1 creates a second branch; the original branch stays', seed: 302 });
  s.text(440, 34, 'A fork adds checkpoints; the original branch is kept', { size: 24, weight: 700 });
  const box = (x, y, lines, col) => {
    const fill = col === 'blue' ? C.blueSoft : col === 'amber' ? C.amberSoft : col === 'green' ? C.greenSoft : C.roseSoft;
    const color = col === 'blue' ? C.blue : col === 'amber' ? C.amber : col === 'green' ? C.green : C.rose;
    s.rect(x, y, 120, 76, { color, fill, fillStyle: 'solid' });
    s.text(x + 60, y + 26, lines[0], { size: 18, weight: 700 });
    s.text(x + 60, y + 50, lines[1], { size: 15 });
    s.text(x + 60, y + 68, lines[2], { size: 15 });
  };
  box(30, 165, ['step -1', 'input', ' '], 'blue');
  box(170, 165, ['step 0', 'next: draft', ' '], 'blue');
  box(310, 165, ['step 1', 'next: approve', 'draft: Post'], 'amber');
  s.arrow(150, 203, 170, 203, { color: C.muted });
  s.arrow(290, 203, 310, 203, { color: C.muted });
  s.text(520, 72, 'original branch, unchanged', { size: 17, color: C.muted });
  box(450, 80, ['step 2', 'next: send', 'draft: Post'], 'green');
  box(640, 80, ['step 3', 'done', 'draft: Post'], 'green');
  s.arrow(430, 190, 450, 130, { color: C.muted });
  s.arrow(570, 118, 640, 118, { color: C.muted });
  s.text(520, 336, 'fork: update_state, then resume', { size: 17, color: C.muted });
  box(450, 250, ['step 2', 'next: approve', 'draft: Edited'], 'rose');
  box(640, 250, ['step 3', 'done', 'draft: Edited'], 'rose');
  s.arrow(430, 216, 450, 276, { color: C.rose });
  s.arrow(570, 288, 640, 288, { color: C.rose });
  s.note(40, 374, 800, 44, ['5 checkpoints before the fork, 7 after it: 2 new, none overwritten.'], { size: 18 });
  save('51.3-checkpoint-branches.svg', s);
}

// 3. Approve call count per event (bar chart)
{
  const s = new Sketch(880, 420, { title: 'Bar chart of approve calls after four events: 1, 2, 3, 4', seed: 303 });
  s.text(440, 34, 'The paused node runs again on every resume', { size: 24, weight: 700 });
  s.text(440, 68, 'approve calls in total, after each event', { size: 17, color: C.muted });
  const base = 290, k = 50;
  const bars = [
    { label: 'first pause', n: 1, send: 0, cx: 170 },
    { label: 'resume "yes"', n: 2, send: 1, cx: 340 },
    { label: 'fork pause', n: 3, send: 1, cx: 510 },
    { label: 'resume "no"', n: 4, send: 1, cx: 680 },
  ];
  s.line(60, base, 800, base, { color: C.muted });
  bars.forEach(({ label, n, send, cx }) => {
    s.rect(cx - 55, base - n * k, 110, n * k, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(cx, base - n * k - 12, String(n), { size: 22, weight: 700 });
    s.text(cx, base + 28, label, { size: 17 });
    s.text(cx, base + 52, `send calls: ${send}`, { size: 16, color: C.muted });
  });
  s.note(40, 372, 800, 40, ['send is skipped when approved is false, so its count stays at 1 on the last resume.'], { size: 17 });
  save('51.3-approve-calls.svg', s);
}
