import os
import sys
import json
import glob
import re
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA_API_KEY = os.environ.get("OLLAMA_API_KEY", "")
OLLAMA_URL = "https://ollama.com/api/chat"
MODEL = "gpt-oss:120b"

SYSTEM_PROMPT = """You are a world-class Principal AI Systems Engineer and author of elite engineering textbooks (like LearnCpp.com, but for Python Systems & Modern AI Engineering).

Your task is to author a definitive, deep-dive educational lesson in Markdown for an engineering course platform called 'AI-DeepDive'.

You must follow these strict rules:
1. Rigorous, high-density pedagogical style. No hand-waving or superficial summaries.
2. Every code snippet must be 100% executable, complete, syntax-highlighted Python/PyTorch with type hints and realistic outputs annotated in comments.
3. Detail true low-level mechanics: CPython C-structs (PyObject, ob_refcnt, tp_dict, PyFrameObject, PyLongObject, PyListObject, PyDictObject), frame evaluation loops, bytecode opcodes (LOAD_FAST, BINARY_OP), memory layouts, cache-line alignment, GPU HBM / CUDA kernels, or mathematical equations (using KaTeX $$...$$ and $...$).
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

def query_ollama(prompt: str) -> str:
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "options": {
            "temperature": 0.2
        },
        "stream": False
    }
    
    req = urllib.request.Request(
        OLLAMA_URL,
        headers={
            "Authorization": f"Bearer {OLLAMA_API_KEY}",
            "Content-Type": "application/json"
        },
        data=json.dumps(payload).encode("utf-8")
    )
    
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("message", {}).get("content", "")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(3 * (attempt + 1))
            else:
                time.sleep(2)
        except Exception:
            time.sleep(2)
            
    return ""

def clean_generated_markdown(generated_text: str, frontmatter_block: str) -> str:
    text = generated_text.strip()
    if text.startswith("```markdown"):
        text = text[len("```markdown"):].strip()
    if text.startswith("```md"):
        text = text[len("```md"):].strip()
    if text.endswith("```") and text.count("```") % 2 != 0:
        text = text[:-3].strip()
        
    fm_match = re.match(r"^---\r?\n[\s\S]*?\r?\n---\r?\n", text)
    if fm_match:
        body = text[fm_match.end():].strip()
    else:
        body = text
        
    body = re.sub(r"^```(?:yaml)?\s*---[\s\S]*?---\s*```\s*", "", body, flags=re.MULTILINE).strip()
    body = re.sub(r"^```(?:yaml)?[\s\S]*?```\s*", "", body, flags=re.MULTILINE).strip()
    
    while body.startswith("---"):
        body = body[3:].strip()
        
    # Auto-sanitize unquoted parentheses in Mermaid
    def fix_mermaid(match):
        block = match.group(1)
        lines = block.splitlines()
        new_lines = []
        for line in lines:
            fixed_line = re.sub(r'(\b\w+)\s*\[([^"\[\]\n]*\([^\)\n]*\)[^"\[\]\n]*)\]', r'\1["\2"]', line)
            new_lines.append(fixed_line)
        return "```mermaid\n" + "\n".join(new_lines) + "\n```"

    body = re.sub(r'```mermaid\s*\n([\s\S]*?)\n```', fix_mermaid, body)
    
    # Balance code fences
    if body.count("```") % 2 != 0:
        body = body + "\n```"
        
    clean_file = frontmatter_block.strip() + "\n\n" + body
    return clean_file

def reauthor_lesson_task(item):
    fpath = item["file_path"]
    lid = item["id"]
    ltitle = item["title"]
    pnum = item["part_num"]
    cnum = item["chapter_num"]
    
    frontmatter_block = f"""---
id: "{lid}"
part: {pnum}
chapter: {cnum}
title: "{ltitle}"
slug: "{item.get('slug', '')}"
difficulty: "{item.get('difficulty', 'intermediate')}"
estimated_minutes: {item.get('estimatedMinutes', 20)}
prerequisites: {json.dumps(item.get('prerequisites', []))}
tags: {json.dumps(item.get('tags', []))}
status: "published"
---"""

    prompt = f"""You are authoring Lesson {lid}: **{ltitle}** in Chapter {cnum}: **{item['chapter_title']}** (Part {pnum}: **{item['part_title']}**).

### Frontmatter to output at the very beginning:
```yaml
{frontmatter_block}
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
    raw_md = query_ollama(prompt)
    if not raw_md or len(raw_md) < 500:
        return False, lid, ltitle, "Empty or truncated response"
        
    clean_md = clean_generated_markdown(raw_md, frontmatter_block)
    
    os.makedirs(os.path.dirname(fpath), exist_ok=True)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(clean_md)
        
    return True, lid, ltitle, fpath

def main():
    print("==================================================================", flush=True)
    print("🔥 Targeted Boilerplate Elimination Engine (Powered by gpt-oss:120b)", flush=True)
    print("==================================================================", flush=True)
    
    with open("data/curriculum.json", "r", encoding="utf-8") as f:
        curr = json.load(f)
        
    all_md = glob.glob("content/**/*.md", recursive=True)
    id_to_file = {}
    for fpath in all_md:
        if fpath.endswith("summary.md") or fpath.endswith("AUTHORING.md") or fpath.endswith("index.md"):
            continue
        try:
            with open(fpath, "r", encoding="utf-8", errors="ignore") as mf:
                head = mf.read(500)
                for line in head.splitlines():
                    if line.strip().startswith("id:"):
                        val = line.split(":", 1)[1].strip().replace('"', '').replace("'", "")
                        id_to_file[val] = fpath
                        break
        except:
            pass
            
    # Find all lessons with boilerplate directly by file content
    boilerplate_tasks = []
    for fpath in all_md:
        if fpath.endswith("summary.md") or fpath.endswith("AUTHORING.md") or fpath.endswith("index.md"):
            continue
        with open(fpath, "r", encoding="utf-8", errors="ignore") as fp:
            content = fp.read()
        if "Low-Level System Architecture & Execution Mechanics" in content or "Virtual Memory Page Allocation / GPU HBM" in content or "sample_buffer = bytearray" in content:
            # Extract frontmatter metadata from file directly
            fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", content)
            lid = ""
            ltitle = ""
            pnum = 1
            cnum = 1
            if fm_match:
                for line in fm_match.group(1).splitlines():
                    if line.strip().startswith("id:"):
                        lid = line.split(":", 1)[1].strip().replace('"', '').replace("'", "")
                    elif line.strip().startswith("title:"):
                        ltitle = line.split(":", 1)[1].strip().replace('"', '').replace("'", "")
                    elif line.strip().startswith("part:"):
                        try:
                            pnum = int(line.split(":", 1)[1].strip())
                        except:
                            pass
                    elif line.strip().startswith("chapter:"):
                        try:
                            cnum = int(line.split(":", 1)[1].strip())
                        except:
                            pass
            if not ltitle:
                ltitle = os.path.splitext(os.path.basename(fpath))[0].replace("-", " ").title()
            if not lid:
                lid = os.path.splitext(os.path.basename(fpath))[0]
                
            boilerplate_tasks.append({
                "id": lid,
                "title": ltitle,
                "slug": lid,
                "difficulty": "intermediate",
                "estimatedMinutes": 20,
                "prerequisites": [],
                "tags": [],
                "file_path": fpath,
                "part_num": pnum,
                "part_title": f"Part {pnum}",
                "chapter_num": cnum,
                "chapter_title": f"Chapter {cnum}"
            })
                        
    print(f"Total files identified with repeated boilerplate directly on disk: {len(boilerplate_tasks)}", flush=True)
    if not boilerplate_tasks:
        print("🎉 No repeated boilerplate found! All files are 100% clean.", flush=True)
        return
        
    start_time = time.time()
    completed = 0
    failed = 0
    
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(reauthor_lesson_task, item): item for item in boilerplate_tasks}
        for future in as_completed(futures):
            success, lid, title, info = future.result()
            if success:
                completed += 1
                print(f"[{completed}/{len(boilerplate_tasks)}] ✅ Re-authored: Lesson {lid} - {title}", flush=True)
            else:
                failed += 1
                print(f"[{completed+failed}/{len(boilerplate_tasks)}] ❌ Failed: Lesson {lid} - {title} ({info})", flush=True)
                
    elapsed = time.time() - start_time
    print(f"\n==================================================================", flush=True)
    print(f"🏁 Boilerplate Elimination Complete in {elapsed:.2f}s ({elapsed/60:.1f} min)!", flush=True)
    print(f"   Successfully re-authored: {completed}", flush=True)
    print(f"   Failed: {failed}", flush=True)
    print(f"==================================================================", flush=True)

if __name__ == "__main__":
    main()
