#!/bin/bash
# Preview a lesson's diagrams (light | dark side by side) as PNG tiles.
# Usage: scripts/lesson-tools/preview-diagrams.sh <lessonid> [outdir]
# Runs scripts/diagrams/lessons/<lessonid>.mjs first, then prints the PNG paths to Read.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; ID="$1"; OUT="${2:-${TMPDIR:-/tmp}/lesson-preview/$ID}"
PY="${LESSON_PY:-python3}"; CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"; cd "$ROOT"
node "scripts/diagrams/lessons/$ID.mjs" >/dev/null
"$PY" - "$ROOT" "$ID" "$OUT" <<'PYEOF'
import sys, glob, re, os
root, lid, out = sys.argv[1:]
svgs = sorted(glob.glob(f"{root}/content/*/*/diagrams/{lid}-*.svg"))
if not svgs: sys.exit(f"no SVGs named {lid}-*.svg")
css = open(f"{root}/src/index.css").read()
tok = css[css.index("/* ---------- Hand-drawn lesson diagrams"):]
tok = re.sub(r"\.sketch-figure[^}]*}", "", tok)
h = sum(int(re.search(r'viewBox="0 0 \d+ (\d+)"', open(s).read()).group(1)) * 0.75 + 40 for s in svgs)
panes = "".join(f'<div class="p {t}">' + "".join(f"<small>{os.path.basename(s)}</small>{open(s).read()}" for s in svgs) + "</div>" for t in ("light", "dark"))
html = f"""<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Fira+Code&display=swap" rel=stylesheet>
<style>{tok} body{{margin:0;display:flex;font-family:sans-serif}} .p{{width:660px;padding:10px}} .light{{background:#fff;color:#000}} .dark{{background:#0f172a;color:#fff}} svg{{width:660px;display:block;margin-bottom:10px}} small{{opacity:.6}}</style>{panes}"""
open(f"{out}/preview.html", "w").write(html)
open(f"{out}/height", "w").write(str(int(h) + 40))
PYEOF
H=$(cat "$OUT/height")
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1360,$H --virtual-time-budget=6000 --screenshot="$OUT/all.png" "file://$OUT/preview.html" >/dev/null 2>&1
"$PY" - "$OUT" <<'PYEOF'
import sys; from PIL import Image
out = sys.argv[1]; im = Image.open(f"{out}/all.png"); n = 0
for y in range(0, im.size[1], 1400):
    im.crop((0, y, im.size[0], min(y + 1400, im.size[1]))).save(f"{out}/tile{n}.png"); print(f"{out}/tile{n}.png"); n += 1
PYEOF
