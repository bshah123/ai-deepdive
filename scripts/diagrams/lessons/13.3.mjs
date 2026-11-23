// Diagrams for 13.3 (virtual environments, site-packages, module search path).
// Run: node scripts/diagrams/lessons/13.3.mjs
// Every number comes from scripts/diagrams/lessons/13.3_data.json (written by 13.3_experiment.py).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '../../../content/part-01-python-properly/chapter-13-modules-packages-environments/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());
const data = JSON.parse(readFileSync(join(HERE, '13.3_data.json'), 'utf8'));

// ---------------------------------------------------------------- 13.3-two-projects.svg
{
  const s = new Sketch(880, 340, { title: 'One shared site-packages holds one version of a name; a venv per project gives each project its own', seed: 1301 });
  s.text(440, 34, 'One shared install vs one venv per project', { size: 26, weight: 700 });

  s.text(220, 80, 'one shared install', { size: 20, weight: 700, color: C.rose });
  s.rect(120, 96, 200, 62, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(220, 120, 'site-packages', { font: 'mono', size: 17 });
  s.text(220, 146, 'lib 1.0', { font: 'mono', size: 17, weight: 700 });
  s.rect(40, 230, 150, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(115, 258, 'project A', { font: 'mono', size: 16 });
  s.rect(290, 230, 150, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(365, 258, 'project B', { font: 'mono', size: 16 });
  s.arrow(115, 230, 190, 160, { color: C.muted });
  s.arrow(365, 230, 250, 160, { color: C.muted });
  s.note(60, 286, 360, 40, ['B installs lib 2.0 and overwrites A'], { size: 17 });

  s.text(660, 80, 'one venv per project', { size: 20, weight: 700, color: C.green });
  s.rect(470, 96, 170, 100, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(555, 122, 'venv A', { size: 18, weight: 700 });
  s.text(555, 160, 'lib 1.0', { font: 'mono', size: 17 });
  s.rect(680, 96, 170, 100, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(765, 122, 'venv B', { size: 18, weight: 700 });
  s.text(765, 160, 'lib 2.0', { font: 'mono', size: 17 });
  s.rect(470, 236, 170, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(555, 264, 'project A', { font: 'mono', size: 16 });
  s.rect(680, 236, 170, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' });
  s.text(765, 264, 'project B', { font: 'mono', size: 16 });
  s.arrow(555, 236, 555, 200, { color: C.muted });
  s.arrow(765, 236, 765, 200, { color: C.muted });
  s.text(700, 330, 'library versions are illustrative', { size: 16, color: C.muted });
  save('13.3-two-projects.svg', s);
}

// ---------------------------------------------------------------- 13.3-venv-anatomy.svg
{
  const s = new Sketch(880, 340, { title: 'Folder layout of a fresh venv: pyvenv.cfg, a bin folder, and a site-packages folder holding pip', seed: 1302 });
  s.text(440, 34, 'What python -m venv creates', { size: 26, weight: 700 });
  s.rect(40, 70, 420, 240, { color: C.ink });
  const mono = { font: 'mono', size: 18, anchor: 'start' };
  s.text(70, 110, 'venv_a/', { ...mono, weight: 700 });
  s.text(92, 142, 'pyvenv.cfg', { ...mono, color: C.amber, weight: 700 });
  s.text(92, 172, 'bin/', mono);
  s.text(114, 200, 'python', mono);
  s.text(114, 228, 'pip', mono);
  s.text(92, 258, 'lib/python3.12/site-packages/', mono);
  s.text(114, 286, 'pip/', mono);
  s.arrow(250, 136, 486, 118, { color: C.amber });
  s.note(490, 84, 350, 100, ['pyvenv.cfg sits beside the python', 'binary or one level above it. Its', 'home key names the base install.'], { size: 17 });
  s.note(490, 206, 350, 112, ['measured on a fresh venv on this', `machine: ${data.a_file_count} files, about ${Math.round(data.a_total_kib / 1024)} MiB;`, `pip ${data.pip_version_line.split(' ')[1]} is the only package`], { size: 17 });
  s.text(440, 330, 'the venv is not relocatable: see the moved-venv sketch', { size: 16, color: C.muted });
  save('13.3-venv-anatomy.svg', s);
}

// ---------------------------------------------------------------- 13.3-sys-path.svg
{
  const s = new Sketch(880, 380, { title: 'The five sys.path entries of a venv, searched top to bottom for import widget', seed: 1303 });
  s.text(440, 34, 'import widget: scan sys.path top to bottom', { size: 26, weight: 700 });
  const rows = [
    ['(cwd)', 'current directory (python -c); the script folder for a script'],
    ['<base>/lib/python312.zip', 'standard library, zipped form (slot reserved)'],
    ['<base>/lib/python3.12', 'standard library source files'],
    ['<base>/lib/python3.12/lib-dynload', 'compiled standard-library extensions'],
    ['<venv>/lib/python3.12/site-packages', 'this venv: the only place pip installs'],
  ];
  const sp = data.a_sys_path.map((p) => p.replace('<work>/venv_a', '<venv>').replace(/^~\/\.local\/share\/uv\/python\/cpython-3\.12\.13-macos-aarch64-none/, '<base>').replace(/^~\/\.local\/share\/uv\/python\/cpython-3\.12-macos-aarch64-none/, '<base>'));
  rows.forEach(([label, desc], i) => {
    const y = 70 + i * 50;
    const last = i === rows.length - 1;
    const path = sp[i] ?? label;
    if (last) s.rect(40, y, 400, 36, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
    else s.rect(40, y, 400, 36, { color: C.muted });
    s.text(240, y + 23, path, { font: 'mono', size: 15 });
    s.text(470, y + 23, desc, { size: 17, anchor: 'start', color: last ? C.green : C.ink, weight: last ? 700 : 400 });
  });
  s.note(40, 330, 800, 36, [`A .pth file in site-packages can add entries after it (measured: added at index ${data.pth_entry_index}, after site-packages at index ${data.pth_sitepackages_index})`], { size: 16 });
  save('13.3-sys-path.svg', s);
}

// ---------------------------------------------------------------- 13.3-shadow.svg
{
  const s = new Sketch(880, 340, { title: 'A local random.py hides the standard library module; python -I skips the current directory', seed: 1304 });
  s.text(440, 34, 'A file named random.py in your folder', { size: 26, weight: 700 });
  s.rect(40, 70, 380, 220, { color: C.muted });
  s.text(230, 100, 'python run from that folder', { size: 19, weight: 700 });
  s.rect(70, 120, 320, 44, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(230, 147, 'random.py  (your file)', { font: 'mono', size: 16 });
  s.arrow(230, 164, 230, 204, { color: C.muted });
  s.note(70, 208, 320, 66, ['import random loads your file;', 'random.randint is missing'], { size: 17 });

  s.rect(460, 70, 380, 220, { color: C.muted });
  s.text(650, 100, 'python -I (isolated)', { size: 19, weight: 700 });
  s.rect(490, 120, 320, 44, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(650, 147, 'stdlib random.py', { font: 'mono', size: 16 });
  s.arrow(650, 164, 650, 204, { color: C.muted });
  s.note(490, 208, 320, 66, ['the current directory is not', 'searched; the stdlib file loads'], { size: 17 });

  s.text(440, 318, `measured: local file loads, then AttributeError (exit ${data.shadow_randint_rc})`, { size: 17, color: C.muted });
  save('13.3-shadow.svg', s);
}

// ---------------------------------------------------------------- 13.3-moved-venv.svg
{
  const s = new Sketch(880, 350, { title: 'After moving a venv, python still runs but bin/pip points at the old interpreter path', seed: 1305 });
  s.text(440, 34, 'Move a venv and only the scripts break', { size: 26, weight: 700 });
  s.rect(40, 80, 320, 220, { color: C.muted });
  s.text(200, 112, 'built at the old path', { size: 19, weight: 700 });
  s.text(200, 150, 'bin/pip', { font: 'mono', size: 17 });
  s.rect(60, 170, 280, 44, { color: C.amber, fill: C.amberSoft, fillStyle: 'solid' });
  s.text(200, 197, '#!old/venv/bin/python3.12', { font: 'mono', size: 15 });
  s.text(200, 250, 'the shebang is an absolute path', { size: 17, color: C.muted });
  s.arrow(370, 190, 496, 190, { color: C.ink });
  s.text(433, 172, 'mv', { size: 20, weight: 700 });

  s.rect(500, 80, 340, 220, { color: C.muted });
  s.text(670, 112, 'moved to the new path', { size: 19, weight: 700 });
  s.rect(520, 134, 300, 62, { color: C.green, fill: C.greenSoft, fillStyle: 'solid' });
  s.text(670, 158, 'bin/python: works', { size: 17, weight: 700 });
  s.text(670, 183, `sys.prefix = new path (exit ${data.moved_python_rc})`, { font: 'mono', size: 14 });
  s.rect(520, 214, 300, 70, { color: C.rose, fill: C.roseSoft, fillStyle: 'solid' });
  s.text(670, 240, 'bin/pip: FileNotFoundError', { size: 17, weight: 700 });
  s.text(670, 266, 'the missing file is the old shebang path', { size: 15 });
  s.text(440, 326, 'venv docs: recreate the environment at the new location', { size: 17, color: C.muted });
  save('13.3-moved-venv.svg', s);
}
