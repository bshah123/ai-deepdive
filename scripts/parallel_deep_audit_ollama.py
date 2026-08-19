import os
import sys
import json
import time
import glob
import re
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA_API_KEY = os.environ.get("OLLAMA_API_KEY", "")
OLLAMA_URL = "https://ollama.com/api/chat"
MODEL = "gpt-oss:120b"

def query_ollama(prompt: str, system_prompt: str = "You are a Principal AI Systems Engineer and Compiler Architect.") -> str:
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "options": {
            "temperature": 0.1
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
            with urllib.request.urlopen(req, timeout=90) as resp:
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

def audit_chapter_bundle(part_title: str, chapter_title: str, lessons: list):
    """Audit a chapter bundle for rendering, technical accuracy, and diagram clarity."""
    lesson_snippets = []
    for l in lessons:
        try:
            with open(l["file_path"], "r", encoding="utf-8", errors="ignore") as f:
                c = f.read()
                lesson_snippets.append(f"### Lesson {l['id']}: {l['title']}\n```markdown\n{c[:1200]}\n```\n")
        except Exception as e:
            pass

    prompt = f"""You are the Lead Curriculum Architect auditing the content and rendering for:
Part: {part_title}
Chapter: {chapter_title}

Below are the lessons in this chapter:
{"".join(lesson_snippets)}

Please provide a concise audit report:
1. **Rendering & Mathematical Integrity**: Are KaTeX math formulas ($...$ or $$...$$) clean, syntactically correct, and rendered properly?
2. **Diagram & Visual Representation**: Are Mermaid architecture diagrams and ASCII data structures clear, modern, and syntactically valid?
3. **Technical Precision**: Are low-level mechanics (CPython C-structs, PyTorch strides, CUDA/Triton kernels, algorithmic complexity) accurate?
4. **Key Verification Status**: Return a 1-sentence verdict on readiness.
"""
    result = query_ollama(prompt)
    return {
        "part": part_title,
        "chapter": chapter_title,
        "lesson_count": len(lessons),
        "audit": result
    }

def main():
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
            
    chapter_tasks = []
    for p in curr["parts"]:
        for c in p["chapters"]:
            ch_lessons = []
            for l in c.get("lessons", []):
                lid = l["id"]
                fpath = id_to_file.get(lid)
                if fpath and os.path.exists(fpath):
                    ch_lessons.append({"id": lid, "title": l["title"], "file_path": fpath})
            if ch_lessons:
                chapter_tasks.append((p["title"], c["title"], ch_lessons))
                
    print(f"Launching parallel deep audit for all {len(chapter_tasks)} chapters using Ollama Cloud (gpt-oss:120b)...", flush=True)
    start = time.time()
    
    results = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(audit_chapter_bundle, t[0], t[1], t[2]): t for t in chapter_tasks}
        for future in as_completed(futures):
            res = future.result()
            print(f"[{len(results)+1}/{len(chapter_tasks)}] ✅ Audited: {res['part']} -> {res['chapter']} ({res['lesson_count']} lessons)", flush=True)
            results.append(res)
            
    elapsed = time.time() - start
    print(f"\nAll {len(results)} chapters audited in {elapsed:.2f} seconds ({elapsed/60:.1f} min).", flush=True)
    
    with open("scripts/ollama_complete_curriculum_audit.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("Full audit report saved to scripts/ollama_complete_curriculum_audit.json", flush=True)

if __name__ == "__main__":
    main()
