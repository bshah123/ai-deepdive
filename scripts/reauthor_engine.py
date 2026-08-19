import os
import sys
import json
import time
import glob
import re
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
MODEL = "mistral-small-latest"

PROGRESS_FILE = "scripts/reauthor_progress.json"

SYSTEM_PROMPT = """You are a world-class Principal AI Systems Engineer and author of elite engineering textbooks (like LearnCpp.com, but for Python Systems & Modern AI Engineering).

Your task is to author a definitive, deep-dive educational lesson in Markdown for an engineering course platform called 'AI-DeepDive'.

You must follow these strict rules:
1. Rigorous, high-density pedagogical style. No hand-waving or superficial summaries.
2. Every code snippet must be 100% executable, complete, syntax-highlighted Python/PyTorch with type hints and realistic outputs annotated in comments.
3. Detail true low-level mechanics: CPython C-structs (PyObject, ob_refcnt, tp_dict), frame evaluation loops, bytecode opcodes (LOAD_FAST, BINARY_OP), memory layouts, cache-line alignment, GPU HBM / CUDA kernels, or mathematical equations (using KaTeX $$...$$ and $...$).
4. Use standard GFM markdown callouts:
   > [!NOTE]
   > [!TIP]
   > [!WARNING]
   > [!TRAP] (Common engineering mistake or anti-pattern)
   > [!AI] (Direct connection to production LLM / AI systems)
5. Include a customized Mermaid diagram illustrating the mental model or systems architecture.
6. The lesson MUST begin with the exact YAML frontmatter provided in the prompt.
7. Use the following structured section headings (#):
   # Concept
   # Why Does It Exist?
   # Mental Model & Architecture
   # Under the Hood & Systems Internals
   # Production-Grade Executable Example
   # Step-by-Step Execution Trace
   # Common Traps & Antipatterns
   # Performance & Complexity Analysis
   # Debugging & Profiling Recipes
   # Real-World AI Systems Connection
   # Hands-on Engineering Challenges (🟢 Beginner, 🟡 Intermediate, 🔴 Systems/Production)
"""

def call_mistral_with_retry(prompt: str, max_retries: int = 5, initial_wait: float = 3.0) -> str:
    payload = {
        "model": MODEL,
        "temperature": 0.25,
        "max_tokens": 4096,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
    }
    
    wait_time = initial_wait
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                MISTRAL_API_URL,
                headers={
                    "Authorization": f"Bearer {MISTRAL_API_KEY}",
                    "Content-Type": "application/json"
                },
                data=json.dumps(payload).encode("utf-8")
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                # Check rate limits
                remaining_tokens = resp.headers.get("x-ratelimit-remaining-tokens-minute")
                remaining_req = resp.headers.get("x-ratelimit-remaining-req-minute")
                
                # If remaining tokens or requests are dangerously low, sleep a bit
                if remaining_tokens and int(remaining_tokens) < 5000:
                    time.sleep(10)
                elif remaining_req and int(remaining_req) < 5:
                    time.sleep(5)
                    
                data = json.loads(resp.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"]
                
        except urllib.error.HTTPError as e:
            if e.code == 429:
                # Rate limit exceeded
                retry_after = e.headers.get("Retry-After")
                sleep_sec = float(retry_after) if retry_after else wait_time
                print(f"  [Rate Limit 429] Waiting {sleep_sec:.1f}s before retry (attempt {attempt+1}/{max_retries})...")
                time.sleep(sleep_sec)
                wait_time *= 1.5
            elif e.code >= 500:
                print(f"  [Server Error {e.code}] Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
                wait_time *= 1.5
            else:
                error_body = e.read().decode("utf-8", errors="ignore")
                raise RuntimeError(f"HTTP Error {e.code}: {error_body}")
        except Exception as e:
            print(f"  [Error] {e}. Retrying in {wait_time:.1f}s...")
            time.sleep(wait_time)
            wait_time *= 1.5
            
    raise RuntimeError(f"Failed after {max_retries} attempts.")

def load_progress() -> dict:
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2)

def build_lesson_prompt(lesson_meta: dict, chapter_meta: dict, part_meta: dict, current_content: str) -> str:
    lid = lesson_meta["id"]
    ltitle = lesson_meta["title"]
    lslug = lesson_meta.get("slug", "")
    pnum = part_meta["number"]
    cnum = chapter_meta["number"]
    diff = lesson_meta.get("difficulty", "intermediate")
    est_min = lesson_meta.get("estimatedMinutes", 20)
    tags = lesson_meta.get("tags", [])
    prereqs = lesson_meta.get("prerequisites", [])
    
    tags_str = json.dumps(tags)
    prereqs_str = json.dumps(prereqs)
    
    frontmatter_block = f"""---
id: "{lid}"
part: {pnum}
chapter: {cnum}
title: "{ltitle}"
slug: "{lslug}"
difficulty: "{diff}"
estimated_minutes: {est_min}
prerequisites: {prereqs_str}
tags: {tags_str}
status: "published"
---"""

    prompt = f"""You are authoring Lesson {lid}: **{ltitle}** in Chapter {cnum}: **{chapter_meta['title']}** (Part {pnum}: **{part_meta['title']}**).

### Frontmatter to output at the very beginning:
```yaml
{frontmatter_block}
```

### Reference Current Draft (to upgrade, fix errors, and expand deeply):
```markdown
{current_content[:3000]}
```

### Detailed Content Requirements:
1. Begin with the EXACT YAML frontmatter above enclosed in `---`.
2. Do not write a duplicate main title `# {ltitle}` after frontmatter. Jump straight to the first section `# Concept`.
3. Provide rigorous, deep technical explanations for:
   - What {ltitle} is in computer science / AI systems.
   - The architectural bottlenecks and historical context that led to its creation.
   - Low-level internals (CPython C structs, memory layouts, bytecode, PyTorch strides/tensors, GPU kernels, math formulas).
   - A complete, self-contained, working Python example.
   - Annotated step-by-step trace of how the code executes in memory.
   - At least 2 `> [!TRAP]` callouts (subtle gotchas, performance traps, GIL issues, precision bugs).
   - Complexity ($O(1)$, $O(N)$, space complexity, cache effects).
   - Real debugging/profiling commands (`sys`, `tracemalloc`, `cProfile`, `dis`, `torch.profiler`).
   - At least 1 `> [!AI]` callout showing direct production relevance to LLMs/RAG/Agents/PyTorch.
   - 3 graded challenges (🟢 Beginner, 🟡 Intermediate, 🔴 Production).

Write the complete, full markdown file now:
"""
    return prompt

def clean_generated_markdown(generated_text: str, frontmatter_block: str) -> str:
    text = generated_text.strip()
    
    # If wrapped in ```markdown ... ```, strip the outer block
    if text.startswith("```markdown"):
        text = text[len("```markdown"):].strip()
    if text.startswith("```md"):
        text = text[len("```md"):].strip()
    if text.endswith("```") and text.count("```") % 2 != 0:
        text = text[:-3].strip()
        
    # Strip any leading frontmatter from generated text
    fm_match = re.match(r"^---\r?\n[\s\S]*?\r?\n---\r?\n", text)
    if fm_match:
        body = text[fm_match.end():].strip()
    else:
        body = text
        
    # Strip any repeated ```yaml ... ``` block at the very start of body
    body = re.sub(r"^```(?:yaml)?\s*---[\s\S]*?---\s*```\s*", "", body, flags=re.MULTILINE).strip()
    body = re.sub(r"^```(?:yaml)?[\s\S]*?```\s*", "", body, flags=re.MULTILINE).strip()
    
    # Strip any leading horizontal rule or extra '---'
    while body.startswith("---"):
        body = body[3:].strip()
        
    # Assemble final markdown
    clean_file = frontmatter_block.strip() + "\n\n" + body
    return clean_file

def reauthor_single_lesson(lesson: dict, chapter: dict, part: dict, file_path: str) -> bool:
    current_content = ""
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            current_content = f.read()
            
    prompt = build_lesson_prompt(lesson, chapter, part, current_content)
    
    pnum = part["number"]
    cnum = chapter["number"]
    lid = lesson["id"]
    ltitle = lesson["title"]
    
    frontmatter_block = f"""---
id: "{lid}"
part: {pnum}
chapter: {cnum}
title: "{ltitle}"
slug: "{lesson.get('slug', '')}"
difficulty: "{lesson.get('difficulty', 'intermediate')}"
estimated_minutes: {lesson.get('estimatedMinutes', 20)}
prerequisites: {json.dumps(lesson.get('prerequisites', []))}
tags: {json.dumps(lesson.get('tags', []))}
status: "published"
---"""

    print(f"  [Generating] Lesson {lid}: {ltitle}...", flush=True)
    generated_md = call_mistral_with_retry(prompt)
    
    clean_md = clean_generated_markdown(generated_md, frontmatter_block)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(clean_md)
        
    print(f"  ✅ [Saved] Lesson {lid} ({len(clean_md)} bytes) -> {file_path}", flush=True)
    return True
