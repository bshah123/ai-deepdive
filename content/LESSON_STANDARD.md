# Lesson Standard

The one-page contract for every lesson in AI-DeepDive. Finished examples: `part-04-transformers-llms/chapter-25-attention/25.1-self-attention-math.md` and `chapter-23-tokenization/23.1-bpe-tokenizer.md` (skim one; do not read both in full).

**Reader:** a motivated undergraduate or self-learner. Build from fundamentals. Define every term and expand every abbreviation at first use. Concrete worked example before abstraction. Plain, direct sentences; no hype, no filler.

## 1. Shape of a lesson

1. Frontmatter (keep `id` and `slug`; set the rest):
   ```yaml
   ---
   id: "25.1"
   part: 4
   chapter: 25
   title: "Scaled Dot-Product Attention, from Scratch"
   slug: "self-attention-math"
   difficulty: "intermediate"   # beginner | intermediate | advanced | research
   estimated_minutes: 35
   prerequisites: ["20.1"]      # ids of lessons that exist
   tags: ["attention", "softmax"]
   status: "published"
   ---
   ```
2. Opening, 2–3 sentences: what the reader will be able to do; a `**You need:**` line.
3. The problem this idea solves, concretely.
4. Intuition, carried by a diagram.
5. A worked example by hand whose numbers the code reproduces exactly.
6. Runnable code with its real output. Derivation or "under the hood" where it matters, with assumptions stated.
7. `## Common traps`: 3–5 short `[!TRAP]` callouts.
8. `## Summary`: 3–5 bullets.
9. `## Quiz time`: 3–5 questions (`### Question 1: ...`) mixing calculation, prediction, bug-spotting and explanation, each with a solution in `<details>`. Optionally `## Exercise` with a tested solution.
10. `## References`: only sources you opened.

**Length:** 1,300–1,900 visible words (not counting code, `<details>` and references). Diagrams replace prose; they do not add to it.

## 2. Diagrams: 3–6 per lesson

A diagram earns its place when it replaces a paragraph or a table: a memory layout, a pipeline, a before/after, a worked example's numbers, a small chart of measured data, a comparison. Prefer several small focused sketches to one crowded one.

- Code goes in `scripts/diagrams/lessons/<id>.mjs`; output SVGs go in `<chapter>/diagrams/<id>-<name>.svg`.
- Embed on its own line: `![What the picture shows, in words](diagrams/<id>-<name>.svg "Short caption")`
- Every number in a diagram comes from code you ran, and agrees with the text.
- Check it by eye, once, with one command (prints PNG tiles to open; light and dark side by side):
  `scripts/lesson-tools/preview-diagrams.sh <id>`
  Fix text that overlaps, is clipped, or is crossed by an arrow.

Skeleton:

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sketch, C } from '../sketch.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../content/<part-dir>/<chapter-dir>/diagrams');
mkdirSync(OUT, { recursive: true });
const save = (name, s) => writeFileSync(join(OUT, name), s.toString());

{
  const s = new Sketch(880, 320, { title: 'Accessible description', seed: 101 }); // width is always 880; unique seed per diagram
  s.text(440, 34, 'Heading', { size: 26, weight: 700 });
  s.rect(40, 80, 120, 44, { color: C.blue, fill: C.blueSoft, fillStyle: 'solid' }); // box with text inside: solid soft fill
  s.text(100, 108, 'label', { font: 'mono', size: 16 });                            // text is centred on x by default
  s.arrow(165, 102, 260, 102, { color: C.muted });
  s.note(560, 220, 280, 60, ['a sticky note', 'two lines'], { size: 19 });
  save('<id>-<name>.svg', s);
}
```

API (all coordinates in px; options in the last argument):

| Call | Notes |
|---|---|
| `rect(x, y, w, h, o)` · `circle(cx, cy, diameter, o)` · `line(x1, y1, x2, y2, o)` | `o`: `color`, `width`, `fill`, `fillStyle` (`'hachure'` default, `'solid'`), `dash: '6 8'` |
| `arrow(x1, y1, x2, y2, o)` · `curveArrow(x1, y1, cx, cy, x2, y2, o)` | also `head` (px) |
| `grid(x, y, rows, cols, cell, o)` | a matrix; `hiRow`, `hiColor` highlight one row |
| `text(x, y, str or [lines], o)` | `size` (22), `anchor` (`'middle'`, `'start'`, `'end'`), `color`, `font` (`'hand'` or `'mono'`), `weight: 700`, `rotate` |
| `note(x, y, w, h, [lines], o)` | sticky note; `size`, `rotate` |
| `raw(svgString)` | escape hatch |

Colours, tokens only (they follow light and dark themes): `C.ink`, `C.muted`, `C.blue`, `C.amber`, `C.green`, `C.rose`, `C.violet`, and soft fills `C.blueSoft`, `C.amberSoft`, `C.greenSoft`, `C.roseSoft`. Hachure fill is for bars and empty shapes, never behind text. Keep text at size 15 or larger and 20 px clear of the edges. Hand font is about 0.42 × size px per character; mono is about 0.6 × size.

## 3. Code

- Every output shown is real: run the code and paste the output verbatim in an ` ```output ` block directly after the code block. Check the whole lesson with
  `python3 scripts/check-lesson-outputs.py <python> <lesson.md>` (0 FAIL, 0 DEPENDS).
- **Visible** Python blocks must run alone in the browser (Pyodide): standard library and NumPy only, own imports, no reliance on earlier blocks.
- Anything else (PyTorch, SciPy, scikit-learn, pandas, any framework, or code continuing an earlier block) goes inside
  `<details><summary>Run locally: needs pip install X</summary>` … `</details>`, with real output and the library version.
- Frameworks, services and hardware you cannot run: teach the mechanism with a small runnable pure-Python/NumPy version (stub the model). Show real framework code only if you ran it with a mock, or checked each call against the official docs; say which. Never show output for code you did not run.
- Outputs that depend on timing, hardware or memory addresses: say so in the text, or avoid them.

## 4. Truth

- Every non-obvious claim has a source you opened: paper (arXiv abstract page), official docs, PEP, RFC, or library source. Never invent authors, venues, years, numbers, versions or URLs. Unverified venue: cite arXiv only. Cannot verify: drop it, or label it "my own reasoning".
- Dated facts (model names, benchmark numbers, API details, prices) are checked and dated, or removed.
- A heuristic is not a theorem. State assumptions and where a claim stops holding.
- The old lesson files were mass-generated and contain fake outputs and wrong mechanisms. Keep only what you have verified.

## 5. Renderer rules

- No H1 in the body (the page header shows the title). No LaTeX in headings.
- One paragraph or list item per line. No hard-wrapped prose.
- Math: inline `$...$`; display `$$` on its own lines. No literal dollar signs in prose.
- Callouts: `> [!KEY-INSIGHT]`, `> [!TIP]`, `> [!NOTE]`, `> [!WARNING]`, `> [!TRAP]`, `> [!ADVANCED]`.
- `<details><summary>Plain text label</summary>` then a blank line, content (full markdown works), blank line, `</details>`.
- Tables are fine. Never write tag-like text such as `</w>` outside backticks.
- See the real page with one command (prints PNG tiles): `scripts/lesson-tools/shot-lesson.sh <id>` (needs `pnpm run dev`).

## 6. Chapter files

- `summary.md`: what you learned (one paragraph), key ideas (one line each), a "Before moving on" checklist of concrete skills.
- `quiz.json`: 6–10 questions across the chapter, in this exact shape, with plausible distractors and varied correct options:
  ```json
  {"chapterId": "chapter-25", "title": "Chapter 25 Quiz — Attention", "questions": [
    {"id": "q25.1", "question": "...", "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}], "correctOptionId": "b", "explanation": "..."}]}
  ```
- After editing lessons: `node scripts/sync-curriculum.mjs --chapters chapter-NN` then `pnpm run validate-content`.
