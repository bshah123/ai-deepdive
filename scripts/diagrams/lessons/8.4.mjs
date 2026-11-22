import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-08-scope-closures-decorators/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

// Every number below is read from the experiment's output, never typed by hand.
const D = JSON.parse(readFileSync(join(HERE, '8.4_data.json'), 'utf8'));

// 1. Two calls, two closures: @repeat(3) is repeat(3)(greet)
{
  const s = new Sketch(880, 400, { title: 'Two calls build a closure chain for @repeat(3)', seed: 8401 });
  s.text(440, 40, 'Two calls, two closures', { size: 26, weight: 700 });
  s.rect(60, 70, 360, 92, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(240, 102, 'repeat(3)', { font: 'mono', size: 20, weight: 700 });
  s.text(240, 134, 'returns decorator_repeat', { size: 19 });
  s.note(480, 70, 340, 92, ['closure cell', `num_times = ${D.step1_cells[0]}`], { size: 19 });
  s.arrow(240, 166, 240, 226, { color: C.muted });
  s.text(330, 202, 'called with greet', { size: 17, color: C.muted });
  s.rect(60, 232, 360, 92, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(240, 264, 'decorator_repeat(greet)', { font: 'mono', size: 18, weight: 700 });
  s.text(240, 296, 'returns wrapper', { size: 19 });
  s.note(480, 232, 340, 92, ['wrapper keeps two cells', `func = greet, num_times = ${D.step2_cells.num_times}`], { size: 18 });
  s.text(440, 368, 'so greet = wrapper: the name now points at the wrapper', { size: 19 });
  save('8.4-closure-chain.svg', s);
}

// 2. The forgotten parentheses fail silently
{
  const s = new Sketch(880, 340, { title: 'Forgetting the call parentheses: @repeat versus @repeat(3)', seed: 8402 });
  s.text(440, 40, 'Forgetting the parentheses fails silently', { size: 24, weight: 700 });
  s.text(40, 92, 'Correct:  @repeat(3)', { size: 21, anchor: 'start', weight: 700, color: C.green });
  s.rect(40, 108, 400, 50, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(240, 139, 'greet is wrapper', { font: 'mono', size: 17 });
  s.arrow(446, 133, 500, 133, { color: C.muted });
  s.rect(510, 108, 330, 50, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(675, 139, `greet("Alice") prints ${D.repeat_print_count} lines`, { size: 19 });
  s.text(40, 200, 'Bug:  @repeat  (no call)', { size: 21, anchor: 'start', weight: 700, color: C.rose });
  s.rect(40, 216, 400, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(240, 247, 'greet is decorator_repeat', { font: 'mono', size: 17 });
  s.arrow(446, 241, 500, 241, { color: C.muted });
  s.rect(510, 216, 330, 50, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(675, 247, `greet("Alice") returns a ${D.noparen_return_type}`, { size: 19 });
  s.text(40, 310, `The call prints ${D.noparen_prints} characters and raises no error. The result is the ${D.noparen_return_name} function.`, { size: 17, anchor: 'start', color: C.muted });
  save('8.4-no-parens.svg', s);
}

// 3. Class decorator with a subclass: the name changes
{
  const s = new Sketch(880, 370, { title: 'A subclass-based class decorator rebinds the class name', seed: 8403 });
  s.text(440, 40, 'The name now points at a subclass', { size: 24, weight: 700 });
  s.rect(40, 74, 340, 100, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(210, 106, 'PersonRaw', { font: 'mono', size: 18, weight: 700 });
  s.text(210, 140, 'the class you wrote', { size: 18 });
  s.text(440, 118, 'debug()', { size: 18, color: C.muted });
  s.arrow(384, 124, 496, 124, { color: C.muted });
  s.rect(500, 74, 340, 100, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(670, 106, 'Person.__name__', { font: 'mono', size: 17, weight: 700 });
  s.text(670, 140, `"${D.decorated_name}"`, { font: 'mono', size: 17 });
  s.arrow(670, 180, 210, 180, { color: C.muted });
  s.text(440, 206, `${D.decorated_name} subclasses ${D.decorated_bases[0]}`, { size: 19 });
  s.note(40, 240, 800, 104, [
    'Fix: copy the identity back onto the subclass.',
    `DebuggedClass.__name__ = cls.__name__  ->  "${D.fixed_name}"`,
    `functools.update_wrapper fails on a class: ${D.update_wrapper_on_class.split(':')[0]}`,
  ], { size: 18 });
  save('8.4-class-rebind.svg', s);
}

// 4. Hook trace: which hook fires for construction and for a method call
{
  const s = new Sketch(880, 340, { title: 'Hook events for construction and a method call', seed: 8404 });
  s.text(440, 40, 'What the hooks see', { size: 24, weight: 700 });
  s.text(200, 84, 'Person("Bob", 30)', { font: 'mono', size: 17, weight: 700 });
  s.rect(60, 100, 280, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(200, 128, '__setattr__ name', { font: 'mono', size: 16 });
  s.arrow(200, 144, 200, 168, { color: C.muted });
  s.rect(60, 168, 280, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(200, 196, '__setattr__ age', { font: 'mono', size: 16 });
  s.text(200, 250, `${D.init_events.length} set events, ${D.init_events.filter((e) => e[0] === 'get').length} get events`, { size: 20 });
  s.text(660, 84, 'p.greet()', { font: 'mono', size: 17, weight: 700 });
  const gets = D.greet_events.map((e) => e[1]);
  gets.forEach((name, i) => {
    const y = 100 + i * 60;
    s.rect(520, y, 280, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
    s.text(660, y + 28, `__getattribute__ ${name}`, { font: 'mono', size: 15 });
    if (i < gets.length - 1) s.arrow(660, y + 44, 660, y + 60, { color: C.muted });
  });
  s.text(660, 280, `${D.greet_event_count} get events, one per attribute read`, { size: 20 });
  save('8.4-hook-trace.svg', s);
}

console.log('wrote 4 SVGs to', OUT);
