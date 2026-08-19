import os
import sys
import json
import glob
import re
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA_API_KEY = os.environ.get("OLLAMA_API_KEY", "")
OLLAMA_URL = "https://ollama.com/api/chat"
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"

OLLAMA_MODELS = [
    "gpt-oss:120b",
    "minimax-m3",
    "nemotron-3-super",
    "gemma4:31b"
]

PROGRESS_FILE = "scripts/furnish_progress.json"

SYSTEM_PROMPT = """You are a world-class Principal AI Systems Engineer and author of elite engineering textbooks (like LearnCpp.com, but for Python Systems & Modern AI Engineering).

Your task is to author a complete, definitive, master-quality educational lesson in Markdown for the 'AI-DeepDive' platform.

You must follow these strict pedagogical and formatting rules:
1. The output MUST begin with the EXACT YAML frontmatter provided in the prompt.
2. DO NOT output any duplicate frontmatter or markdown title (# Title) right after frontmatter. Jump immediately to `# Concept`.
3. You MUST include ALL 11 required section headings in this exact order:
   # Concept
   # Why Does It Exist?
   # Mental Model & Architecture (MUST include a valid, rich ```mermaid flowchart/sequence diagram with quoted labels)
   # Under the Hood & Systems Internals (CPython C structs, memory layouts, bytecode opcodes, PyTorch strides/tensors, GPU kernels, math formulas in KaTeX $$...$$)
   # Production-Grade Executable Example (100% complete, runnable, syntax-highlighted Python/PyTorch code with type hints)
   # Step-by-Step Execution Trace (Annotated walkthrough of state transitions in memory)
   # Common Traps & Antipatterns (At least 2 > [!TRAP] callouts)
   # Performance & Complexity Analysis (Table of time/space complexity, cache-line effects)
   # Debugging & Profiling Recipes (Real profiling commands using sys, tracemalloc, cProfile, dis, or torch.profiler)
   # Real-World AI Systems Connection (At least 1 > [!AI] callout detailing production LLM/RAG/Serving relevance)
   # Hands-on Engineering Challenges (🟢 Beginner, 🟡 Intermediate, 🔴 Production)
4. Rigorous, high-density style. No generic fluff, no placeholders, no hand-waving.
"""

def query_mistral(prompt: str) -> str:
    """Fallback to Mistral Large when Ollama Cloud is rate-limited."""
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "mistral-large-latest",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 4096
    }
    try:
        resp = requests.post(MISTRAL_URL, headers=headers, json=data, timeout=90)
        if resp.status_code == 200:
            result = resp.json()
            return result["choices"][0]["message"]["content"].strip()
    except Exception as e:
        pass
    return ""

def query_ollama(prompt: str, retries: int = 2) -> str:
    headers = {
        "Authorization": f"Bearer {OLLAMA_API_KEY}",
        "Content-Type": "application/json"
    }
    
    for attempt in range(retries):
        for model in OLLAMA_MODELS:
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a world-class Principal AI & Systems Architect authoring master-class curriculum. Every section must have deep technical rigor, low-level mechanics, Mermaid flowcharts, and zero generic boilerplate."
                    },
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_ctx": 16384
                }
            }
            try:
                resp = requests.post(OLLAMA_URL, headers=headers, json=payload, timeout=60)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("message", {}).get("content", "").strip()
                    if len(content) > 600:
                        return content
                elif resp.status_code == 429:
                    # Rate limited on Ollama Cloud: immediately attempt Mistral Large failover
                    mistral_res = query_mistral(prompt)
                    if mistral_res and len(mistral_res) > 600:
                        return mistral_res
                    time.sleep(2)
            except Exception as e:
                time.sleep(1)
                
    # Final fallback to Mistral Large
    mistral_res = query_mistral(prompt)
    if mistral_res and len(mistral_res) > 600:
        return mistral_res
        
    return ""

def generate_topic_mermaid(title: str, part_num: int) -> str:
    """Generates a bespoke, syntactically valid Mermaid flowchart tailored to the topic."""
    t_lower = title.lower()
    
    if "attention" in t_lower or "transformer" in t_lower:
        return """```mermaid
flowchart TD
    Q["Input Tokens / Embeddings"] --> M1["Linear Projections: Q, K, V"]
    M1 --> M2["Scaled Dot-Product: (Q @ K.T) / sqrt(d_k)"]
    M2 --> M3["Causal Mask & Softmax Normalization"]
    M3 --> M4["Context Aggregation: (Weights @ V)"]
    M4 --> OUT["Output Projection & Residual Add"]
```"""
    elif "rag" in t_lower or "retrieval" in t_lower or "search" in t_lower or "index" in t_lower:
        return """```mermaid
flowchart TD
    UserQ["User Query"] --> Transform["Query Transformation & Embedding"]
    Transform --> Retriever["Vector Index (HNSW) + BM25 Lexical"]
    Retriever --> Rerank["Cross-Encoder Reranker (Top-K)"]
    Rerank --> Context["Augmented Prompt Envelope"]
    Context --> Generator["LLM Generation & Factuality Verification"]
```"""
    elif "agent" in t_lower or "tool" in t_lower or "langgraph" in t_lower:
        return """```mermaid
flowchart TD
    UserPrompt["User Objective"] --> Planner["LLM Cognitive Engine (ReAct / Plan)"]
    Planner --> Intent["Tool Call Detection & JSON Schema Validation"]
    Intent --> Gate["Security & Execution Policy Gate"]
    Gate --> Exec["Sandboxed Tool Worker"]
    Exec --> Reducer["StateGraph Memory & Checkpointer Update"]
    Reducer --> Planner
```"""
    elif "tensor" in t_lower or "numpy" in t_lower or "pytorch" in t_lower or "cuda" in t_lower:
        return """```mermaid
flowchart TD
    Tensor["Tensor Metadata (Shape, Strides, Dtype)"] --> Storage["Storage Pointer: at::StorageImpl"]
    Storage --> MemPool["Contiguous Memory Buffer (RAM / VRAM)"]
    MemPool --> Kernel["SIMD / CUDA Fused Kernel Dispatch"]
    Kernel --> Result["Zero-Copy View / Computed Output"]
```"""
    else:
        return """```mermaid
flowchart TD
    Source["Source Input / State"] --> Lexer["Lexical & Structural Analysis"]
    Lexer --> Engine["CPython VM / Execution Pipeline"]
    Engine --> Memory["Object Layout (PyObject / Heap Allocator)"]
    Memory --> Output["Deterministic Execution State"]
```"""

def sanitize_and_clean_markdown(raw_text: str, frontmatter_str: str, title: str = "", part_num: int = 1) -> str:
    text = raw_text.strip()
    
    # Strip wrapping code fences if LLM wrapped entire response
    if text.startswith("```markdown"):
        text = text[len("```markdown"):].strip()
    elif text.startswith("```md"):
        text = text[len("```md"):].strip()
    if text.endswith("```") and text.count("```") % 2 != 0:
        text = text[:-3].strip()
        
    # Strip any leading YAML frontmatter outputted by LLM
    fm_match = re.match(r"^---\r?\n[\s\S]*?\r?\n---\r?\n", text)
    if fm_match:
        body = text[fm_match.end():].strip()
    else:
        body = text
        
    # Strip duplicate stray YAML blocks
    body = re.sub(r"^```(?:yaml)?\s*---[\s\S]*?---\s*```\s*", "", body, flags=re.MULTILINE).strip()
    body = re.sub(r"^```(?:yaml)?[\s\S]*?```\s*", "", body, flags=re.MULTILINE).strip()
    body = re.sub(r"^(?:id:|part:|chapter:|title:|slug:|difficulty:|estimated_minutes:|prerequisites:|tags:|status:)[^\n]*\n?", "", body, flags=re.MULTILINE).strip()
    
    while body.startswith("---"):
        body = body[3:].strip()
        
    # Ensure Mental Model has a valid Mermaid diagram
    if "```mermaid" not in body:
        mermaid_chart = generate_topic_mermaid(title, part_num)
        if "# Mental Model & Architecture" in body:
            body = body.replace("# Mental Model & Architecture", f"# Mental Model & Architecture\n\n{mermaid_chart}\n")
        else:
            # Insert after Why Does It Exist
            if "# Why Does It Exist?" in body:
                body = body.replace("# Why Does It Exist?", f"# Why Does It Exist?\n\n# Mental Model & Architecture\n\n{mermaid_chart}\n")
            else:
                body = f"# Mental Model & Architecture\n\n{mermaid_chart}\n\n" + body

    # Sanitize Mermaid labels
    def fix_mermaid_block(match):
        block = match.group(1)
        lines = block.splitlines()
        new_lines = []
        for line in lines:
            # Replace unquoted parentheses in node definitions: Node[Label (Text)] -> Node["Label (Text)"]
            fixed_line = re.sub(r'(\b[a-zA-Z0-9_]+)\s*\[([^"\[\]\n]+)\]', lambda m: f'{m.group(1)}["{m.group(2).replace(chr(34), chr(39)).strip()}"]', line)
            # Illegal node IDs starting with digits
            fixed_line = re.sub(r'^(\s*)(\d+[a-zA-Z0-9_]*)\s*([\[\(\{])', r'\1Node_\2\3', fixed_line)
            fixed_line = re.sub(r'(-->|---|==>|\.->)\s*(\d+[a-zA-Z0-9_]*)\s*([\[\(\{])', r'\1 Node_\2\3', fixed_line)
            # Arrow text
            fixed_line = re.sub(r'--\s*([^|\-\n>]+?)\s*-->', lambda m: f'-->|"{m.group(1).replace(chr(34), chr(39)).strip()}"|', fixed_line)
            new_lines.append(fixed_line)
        return "```mermaid\n" + "\n".join(new_lines) + "\n```"

    body = re.sub(r'```mermaid\s*\n([\s\S]*?)\n```', fix_mermaid_block, body)
    
    # Ensure code fences are balanced
    if body.count("```") % 2 != 0:
        body = body + "\n```"
        
    final_output = frontmatter_str.strip() + "\n\n" + body + "\n"
    return final_output

def furnish_lesson(item):
    fpath = item["file_path"]
    lid = item["id"]
    ltitle = item["title"]
    pnum = item["part_num"]
    cnum = item["chapter_num"]
    
    frontmatter_str = f"""---
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

    prompt = f"""Author a complete, master-class educational lesson for:
Part {pnum}: {item['part_title']}
Chapter {cnum}: {item['chapter_title']}
Lesson {lid}: **{ltitle}**

### Exact Frontmatter:
```yaml
{frontmatter_str}
```

### Strict Requirements:
- Start immediately with the YAML frontmatter above enclosed in `---`.
- Do NOT output any duplicate frontmatter or `# {ltitle}` heading.
- You MUST provide every single one of the following 11 section headings:
  # Concept
  # Why Does It Exist?
  # Mental Model & Architecture (Include a complete ```mermaid flowchart diagram)
  # Under the Hood & Systems Internals (Low-level C-structs, PyTorch strides/memory layouts, CUDA/Triton kernels, KaTeX math formulas)
  # Production-Grade Executable Example (100% complete working Python code)
  # Step-by-Step Execution Trace
  # Common Traps & Antipatterns (At least 2 > [!TRAP] callouts)
  # Performance & Complexity Analysis (Table of time/space complexity)
  # Debugging & Profiling Recipes
  # Real-World AI Systems Connection (At least 1 > [!AI] callout)
  # Hands-on Engineering Challenges (🟢 Beginner, 🟡 Intermediate, 🔴 Production)

Generate the full, complete Markdown now:
"""

    raw_response = query_ollama(prompt)
    if not raw_response or len(raw_response) < 600:
        return False, lid, ltitle, "Response too short"
        
    cleaned_content = sanitize_and_clean_markdown(raw_response, frontmatter_str, ltitle, pnum)
    
    os.makedirs(os.path.dirname(fpath), exist_ok=True)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(cleaned_content)
        
    return True, lid, ltitle, fpath

def main():
    print("==================================================================", flush=True)
    print("🚀 Master Curriculum Furnishing Engine (Powered by gpt-oss:120b)", flush=True)
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

    progress = {}
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r") as pf:
                progress = json.load(pf)
        except:
            progress = {}
            
    tasks = []
    for p in curr["parts"]:
        for c in p["chapters"]:
            for l in c.get("lessons", []):
                lid = l["id"]
                p_num = int(p["number"]) if isinstance(p["number"], (int, str)) and str(p["number"]).isdigit() else 1
                c_num = int(c["number"]) if isinstance(c["number"], (int, str)) and str(c["number"]).isdigit() else 1
                
                fpath = id_to_file.get(lid)
                if not fpath:
                    # Construct default canonical path if not mapped
                    p_slug = p.get("slug", f"part-{p_num:02d}")
                    c_slug = c.get("slug", f"chapter-{c_num:02d}")
                    l_slug = l.get("slug", lid)
                    fpath = f"content/{p_slug}/{c_slug}/{lid}-{l_slug}.md"
                    
                tasks.append({
                    "id": lid,
                    "title": l["title"],
                    "slug": l.get("slug", ""),
                    "difficulty": l.get("difficulty", "intermediate"),
                    "estimatedMinutes": l.get("estimatedMinutes", 20),
                    "prerequisites": l.get("prerequisites", []),
                    "tags": l.get("tags", []),
                    "file_path": fpath,
                    "part_num": p_num,
                    "part_title": p["title"],
                    "chapter_num": c_num,
                    "chapter_title": c["title"]
                })
                
    remaining_tasks = [t for t in tasks if t["id"] not in progress]
    print(f"Total Curriculum Lessons: {len(tasks)}", flush=True)
    print(f"Already Furnished: {len(progress)}", flush=True)
    print(f"Remaining Lessons to Furnish: {len(remaining_tasks)}", flush=True)
    
    if not remaining_tasks:
        print("🎉 All lessons are already 100% furnished!", flush=True)
        return
        
    start_time = time.time()
    completed = len(progress)
    failed = 0
    
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(furnish_lesson, t): t for t in remaining_tasks}
        for future in as_completed(futures):
            success, lid, title, info = future.result()
            if success:
                completed += 1
                progress[lid] = {
                    "title": title,
                    "file": info,
                    "timestamp": time.time()
                }
                with open(PROGRESS_FILE, "w") as pf:
                    json.dump(progress, pf, indent=2)
                print(f"[{completed}/{len(tasks)}] ✅ Furnished: Lesson {lid} - {title}", flush=True)
            else:
                failed += 1
                print(f"[{completed+failed}/{len(tasks)}] ❌ Failed: Lesson {lid} - {title} ({info})", flush=True)
                
    elapsed = time.time() - start_time
    print(f"\n==================================================================", flush=True)
    print(f"🏁 Master Furnishing Run Finished in {elapsed:.2f}s ({elapsed/60:.1f} min)!", flush=True)
    print(f"   Total Completed: {completed}/{len(tasks)}", flush=True)
    print(f"   Total Failed: {failed}", flush=True)
    print(f"==================================================================", flush=True)

if __name__ == "__main__":
    main()
