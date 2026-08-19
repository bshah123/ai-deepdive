import os
import sys
import json
import glob
import re
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA_KEY = os.environ.get("OLLAMA_API_KEY", "")
OLLAMA_URL = "https://ollama.com/api/chat"

MISTRAL_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

PROGRESS_FILE = "scripts/learncpp_enhance_progress.json"

def query_ollama(model: str, prompt: str, system_prompt: str = "", timeout: int = 50) -> str:
    headers = {"Authorization": f"Bearer {OLLAMA_KEY}", "Content-Type": "application/json"}
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    data = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.2, "num_ctx": 16384}
    }
    try:
        r = requests.post(OLLAMA_URL, headers=headers, json=data, timeout=timeout)
        if r.status_code == 200:
            return r.json().get("message", {}).get("content", "").strip()
    except Exception:
        pass
    return ""

def query_mistral(model: str, prompt: str, system_prompt: str = "", timeout: int = 55) -> str:
    headers = {"Authorization": f"Bearer {MISTRAL_KEY}", "Content-Type": "application/json"}
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    data = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 4000
    }
    try:
        r = requests.post(MISTRAL_URL, headers=headers, json=data, timeout=timeout)
        if r.status_code == 200:
            return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        pass
    return ""

def is_valid_learncpp_lesson(content: str) -> bool:
    if not content or len(content) < 2000:
        return False
    if content.count("```python") < 2:
        return False
    if "Output:" not in content and "output" not in content.lower():
        return False
    if "## Quiz time" not in content and "## Quiz Time" not in content:
        return False
    if "<details>" not in content:
        return False
    return True

def generate_learncpp_lesson(task):
    lid = task["id"]
    ltitle = task["title"]
    pnum = task["part_num"]
    cnum = task["chapter_num"]
    fpath = task["file_path"]

    frontmatter_str = f"""---
id: "{lid}"
part: {pnum}
chapter: {cnum}
title: "{ltitle}"
slug: "{task.get('slug', '')}"
difficulty: "{task.get('difficulty', 'intermediate')}"
estimated_minutes: {task.get('estimatedMinutes', 25)}
prerequisites: {json.dumps(task.get('prerequisites', []))}
tags: {json.dumps(task.get('tags', []))}
status: "published"
---"""

    prompt = f"""You are the principal author of LearnCpp.com, creating a premier, exhaustive technical lesson for:
Part {pnum}: {task['part_title']} | Chapter {cnum}: {task['chapter_title']}
Lesson {lid} — **{ltitle}**

CRITICAL PEDAGOGICAL STRUCTURE & RULES:
1. Title: # {lid} — {ltitle}
2. Opening Motivation & Context: Clear explanation of what this topic is and why it matters in computing and AI.
3. Core Concepts Breakdown: Explain the mechanics with:
   > [!KEY-INSIGHT]
   > Core mental model takeaway.
   > [!BEST-PRACTICE]
   > Concrete actionable engineering rule.
   > [!WARNING]
   > Common footgun or bug trap.
4. ## Code Demonstration & Runtime Output
   You MUST write a full, runnable 35-50 line ```python code block demonstrating the concept, with type hints and __main__ block.
   Immediately below it, you MUST write a ```text block starting with "Output:" showing actual terminal execution output.
5. ### How this works (Line-by-Line Breakdown)
   Provide line-by-line anatomical explanation of that code snippet.
6. > [!ADVANCED]
   Deep CPython C-structs, AST, bytecode opcodes with dis, memory strides, or GPU layouts.
7. > [!QA]
   Q&A answering a common dilemma (e.g. Q: When should I prefer X over Y?).
8. ## Summary & Key Takeaways
   Bulleted summary checklist.
9. ## Quiz time
   - ### Question #1: Conceptual question with <details><summary>Show Solution</summary>...
   - ### Question #2: What does this code output? MUST include a 4-8 line ```python snippet, followed by <details><summary>Show Solution</summary>...
   - ### Question #3: Find and fix the bug: MUST include a 6-10 line buggy ```python snippet, followed by <details><summary>Show Solution</summary> containing the fixed ```python snippet.

You MUST write ALL code blocks in full. Do not omit code blocks.
Generate the Markdown lesson now:
"""

    system_prompt = "You are the head curriculum author of LearnCpp.com, creating premier technical guides with complete runnable Python code blocks, terminal outputs, line-by-line breakdowns, and interactive quizzes."

    # 1. Try Codestral first
    content = query_mistral("codestral-latest", prompt, system_prompt)
    used_model = "codestral-latest"

    # 2. Try gpt-oss:120b fallback if invalid
    if not is_valid_learncpp_lesson(content):
        content = query_ollama("gpt-oss:120b", prompt, system_prompt)
        used_model = "gpt-oss:120b"

    # 3. Try mistral-small-latest fallback if still invalid
    if not is_valid_learncpp_lesson(content):
        content = query_mistral("mistral-small-latest", prompt, system_prompt)
        used_model = "mistral-small-latest"

    if not is_valid_learncpp_lesson(content):
        return False, lid, ltitle, fpath, "Failed validation (missing required code blocks or quiz)"

    # Clean frontmatter without touching internal code blocks
    text = content.strip()
    # Strip leading ```markdown or ```md wrapper if wrapping entire text
    if text.startswith("```markdown"):
        text = text[len("```markdown"):].strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    elif text.startswith("```md"):
        text = text[len("```md"):].strip()
        if text.endswith("```"):
            text = text[:-3].strip()

    # Strip any leading frontmatter generated by LLM
    fm_match = re.match(r"^---\r?\n[\s\S]*?\r?\n---\r?\n", text)
    if fm_match:
        body = text[fm_match.end():].strip()
    else:
        body = text

    # Strip any duplicate H1 or frontmatter at start
    while body.startswith("---"):
        body = body[3:].strip()

    final_content = frontmatter_str.strip() + "\n\n" + body + "\n"

    os.makedirs(os.path.dirname(fpath), exist_ok=True)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(final_content)

    return True, lid, ltitle, fpath, used_model

def main():
    with open("data/curriculum.json") as f:
        curr = json.load(f)

    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            progress = json.load(f)
    else:
        progress = {}

    part_dir_map = {
        "part-01": "content/part-01-python-properly",
        "part-02": "content/part-02-scientific-python",
        "part-03": "content/part-03-ml-nlp",
        "part-04": "content/part-04-transformers-llms",
        "part-05": "content/part-05-information-retrieval",
        "part-06": "content/part-06-rag",
        "part-07": "content/part-07-frameworks",
        "part-08": "content/part-08-agents",
        "part-09": "content/part-09-production-ai",
        "part-10": "content/part-10-evaluation-research",
    }

    all_files = glob.glob("content/**/*.md", recursive=True)
    file_by_id = {}
    for f in all_files:
        if f.endswith("summary.md") or f.endswith("AUTHORING.md"):
            continue
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as fp:
                head = fp.read(400)
            m = re.search(r"id:\s*[\"']?([0-9]+\.[0-9]+)[\"']?", head)
            if m:
                lid = m.group(1)
                file_by_id[lid] = f
        except Exception:
            pass

    tasks = []
    for p in curr["parts"]:
        p_id = p["id"]
        p_num = p["number"]
        p_dir = part_dir_map.get(p_id, f"content/{p_id}")
        p_title = p["title"]
        for c in p["chapters"]:
            c_id = c["id"]
            c_title = c["title"]
            c_num = int(c["number"])
            c_dirs = glob.glob(os.path.join(p_dir, f"{c_id}*"))
            c_dir = c_dirs[0] if c_dirs else os.path.join(p_dir, f"{c_id}-{c.get('slug', '')}")
            for l in c["lessons"]:
                lid = l["id"]
                fname = l.get("file", f"{lid}-{l.get('slug', '')}.md")
                fpath = file_by_id.get(lid, os.path.join(c_dir, fname))

                tasks.append({
                    "id": lid,
                    "title": l["title"],
                    "slug": l.get("slug", ""),
                    "difficulty": l.get("difficulty", "intermediate"),
                    "estimatedMinutes": l.get("estimatedMinutes", 25),
                    "prerequisites": l.get("prerequisites", []),
                    "tags": l.get("tags", []),
                    "file_path": fpath,
                    "part_num": p_num,
                    "part_title": p_title,
                    "chapter_num": c_num,
                    "chapter_title": c_title
                })

    remaining_tasks = [t for t in tasks if t["id"] not in progress]
    print(f"🎯 Total Master Lessons: {len(tasks)}")
    print(f"✅ Already Enhanced (LearnCpp Style): {len(progress)}")
    print(f"🚀 Remaining to Process: {len(remaining_tasks)}")

    completed = len(progress)

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(generate_learncpp_lesson, t): t for t in remaining_tasks}
        for future in as_completed(futures):
            success, lid, title, fpath, info = future.result()
            if success:
                completed += 1
                progress[lid] = {
                    "title": title,
                    "file": fpath,
                    "model": info,
                    "timestamp": time.time()
                }
                with open(PROGRESS_FILE, "w") as pf:
                    json.dump(progress, pf, indent=2)
                print(f"[{completed}/{len(tasks)}] 🌟 [{info}] Enhanced Lesson {lid} - {title}", flush=True)
            else:
                print(f"[{completed}/{len(tasks)}] ⚠️ Retry Required: Lesson {lid} - {title} ({info})", flush=True)

    print("\n🎉 Complete LearnCpp-Style Curriculum Enhancement Complete!")

if __name__ == "__main__":
    main()
