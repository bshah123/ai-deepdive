// Diagrams for lesson 48.1 (ReAct loop). Every number below is copied from the
// output of the lesson's own script (stdlib Python, see the code block in 48.1-react-loop.md).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/part-07-frameworks/chapter-48-agent-architectures/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Measured in the lesson script: prompt words read at each step of the 5-step episode.
const STEP_WORDS = [10, 24, 41, 59, 76];
// Measured: total words read per episode, by catalogue size.
const LAMPS = [2, 4, 8, 16, 32];
const STEPS = [4, 6, 10, 18, 34];
const TOTAL_WORDS = [130, 307, 892, 2991, 10900];
// Measured: success rate over 2000 simulated episodes per bar.
const SLIPS = [0.0, 0.1, 0.2, 0.3];
const NO_FEEDBACK = [1.0, 0.603, 0.340, 0.180];
const FEEDBACK = [1.0, 0.995, 0.940, 0.810];

// 1. The loop
{
  const s = new Sketch(880, 300, { title: 'ReAct loop', seed: 4801 });
  s.text(440, 40, 'The ReAct loop: each observation goes back into the prompt', { size: 24, weight: 700 });
  s.rect(40, 80, 160, 64, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(120, 108, ['Transcript', 'prompt so far'], { size: 18 });
  s.arrow(204, 112, 244, 112, { color: C.muted });
  s.rect(248, 80, 160, 64, { color: C.violet, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(328, 108, ['Model', 'writes Thought + Action'], { size: 18 });
  s.arrow(412, 112, 452, 112, { color: C.muted });
  s.rect(456, 80, 150, 64, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(531, 108, ['Parser', 'Name[argument]?'], { size: 18 });
  s.arrow(610, 112, 650, 112, { color: C.muted });
  s.rect(654, 80, 186, 64, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(747, 108, ['Tool', 'search, info, finish'], { size: 18 });
  s.arrow(747, 148, 747, 196, { color: C.muted });
  s.line(747, 196, 120, 196, { color: C.muted });
  s.arrow(120, 196, 120, 148, { color: C.muted });
  s.text(440, 222, 'Observation appended, then the next step', { size: 18, color: C.muted });
  s.note(40, 240, 800, 44, ['No observations in the prompt: the model repeats search[lamp] until the budget ends.'], { size: 16 });
  save('48.1-react-loop.svg', s);
}

// 2. The worked episode with prompt words per step
{
  const s = new Sketch(880, 340, { title: 'Worked episode', seed: 4802 });
  s.text(440, 36, 'One episode: actions, observations, and words in the prompt', { size: 24, weight: 700 });
  const acts = ['search[lamp]', 'info[L1]', 'info[L2]', 'info[L3]', 'finish[L3]'];
  const obs = ['L1, L2, L3', '35, in stock', '22, out of stock', '28, in stock', 'answer: L3'];
  const base = 300, scale = 1.2;
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 170, w = 150;
    s.rect(x, 60, w, 120, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(x + w / 2, 86, `Step ${i + 1}`, { size: 18, weight: 700 });
    s.text(x + w / 2, 118, acts[i], { font: 'mono', size: 15 });
    s.text(x + w / 2, 152, obs[i], { size: 16 });
    const h = STEP_WORDS[i] * scale;
    s.rect(x + 25, base - h, 100, h, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(x + w / 2, base - h - 10, `${STEP_WORDS[i]} words`, { size: 16 });
  }
  s.line(30, base, 850, base, { color: C.muted });
  s.text(440, 326, 'Prompt grows by every observation, so later steps read more words.', { size: 17, color: C.muted });
  save('48.1-worked-trace.svg', s);
}

// 3. Context growth
{
  const s = new Sketch(880, 395, { title: 'Words read per episode', seed: 4803 });
  s.text(440, 36, 'Total words read in one episode, by catalogue size', { size: 24, weight: 700 });
  const base = 300, k = 220 / 10900;
  s.line(90, base, 820, base, { color: C.muted });
  TOTAL_WORDS.forEach((v, i) => {
    const cx = 160 + i * 140, h = v * k;
    s.rect(cx - 40, base - h, 80, h, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx, base - h - 10, `${v}`, { size: 17, weight: 700 });
    s.text(cx, base + 26, `${LAMPS[i]} lamps`, { size: 17 });
    s.text(cx, base + 50, `${STEPS[i]} steps`, { size: 15, color: C.muted });
  });
  s.text(440, 378, 'Each lamp adds one step, the search and finish add two; each step re-reads the transcript.', { size: 17, color: C.muted });
  save('48.1-context-growth.svg', s);
}

// 4. Formatting slips
{
  const s = new Sketch(880, 395, { title: 'Success under slips', seed: 4804 });
  s.text(440, 36, 'Episodes that finish with the right answer', { size: 24, weight: 700 });
  s.rect(190, 58, 16, 16, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(214, 72, 'stop on first parse failure', { size: 17, anchor: 'start' });
  s.rect(500, 58, 16, 16, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(524, 72, 'retry with an error observation', { size: 17, anchor: 'start' });
  const base = 320, H = 210;
  s.line(100, base, 800, base, { color: C.muted });
  s.line(100, base - H, 100, base, { color: C.muted });
  [0, 0.5, 1].forEach((t) => s.text(88, base - t * H + 6, t.toFixed(1), { size: 15, anchor: 'end', color: C.muted }));
  SLIPS.forEach((p, i) => {
    const cx = 200 + i * 180;
    const a = NO_FEEDBACK[i] * H, b = FEEDBACK[i] * H;
    s.rect(cx - 62, base - a, 56, a, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
    s.rect(cx + 6, base - b, 56, b, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
    s.text(cx - 34, base - a - 8, NO_FEEDBACK[i].toFixed(2), { size: 15 });
    s.text(cx + 34, base - b - 8, FEEDBACK[i].toFixed(2), { size: 15 });
    s.text(cx, base + 30, `p = ${p.toFixed(1)}`, { size: 17 });
  });
  s.text(440, 378, 'p = chance that one model output loses its brackets. 2,000 simulated episodes per bar.', { size: 16, color: C.muted });
  save('48.1-slip-rates.svg', s);
}
