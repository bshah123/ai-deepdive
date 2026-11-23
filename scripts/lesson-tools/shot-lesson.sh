#!/bin/bash
# Screenshot a rendered lesson page (dev server on :3000) as PNG tiles of the content column.
# Usage: scripts/lesson-tools/shot-lesson.sh <lessonid> [outdir]   -> prints tile paths (half-size, 2 page-heights each)
set -euo pipefail
ID="$1"; OUT="${2:-${TMPDIR:-/tmp}/lesson-preview/$ID}"; PY="${LESSON_PY:-python3}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; mkdir -p "$OUT"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,16000 --virtual-time-budget=15000 --screenshot="$OUT/page.png" "http://localhost:3000/lesson/$ID" >/dev/null 2>&1
"$PY" - "$OUT" <<'PYEOF'
import sys; from PIL import Image
out = sys.argv[1]; im = Image.open(f"{out}/page.png").convert("RGB").crop((300, 0, 1200, 16000))
# trim trailing blank area
px = im.resize((9, 1600)).load(); bg = px[4, 1599]; last = max((y for y in range(1600) if any(px[x, y] != bg for x in range(9))), default=0)
H = min(16000, (last + 30) * 10); n = 0
for y in range(0, H, 2800):
    t = im.crop((0, y, 900, min(y + 2800, H))); t = t.resize((t.size[0] * 2 // 3, t.size[1] * 2 // 3)); t.save(f"{out}/page{n}.png"); print(f"{out}/page{n}.png"); n += 1
PYEOF
