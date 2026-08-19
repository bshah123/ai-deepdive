import os
import sys
import json
import glob
import re
import time
import requests

OLLAMA_API_KEY = os.environ.get("OLLAMA_API_KEY", "")
OLLAMA_URL = "https://ollama.com/api/chat"
MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
PROGRESS_FILE = "scripts/furnish_progress.json"

OLLAMA_MODELS = [
    "gpt-oss:120b",
    "minimax-m3",
    "nemotron-3-super",
    "gemma4:31b"
]

def query_llm_with_backoff(prompt: str) -> str:
    """Queries Ollama Cloud or Mistral with progressive exponential backoff on 429."""
    for attempt in range(8):
        # 1. Try Ollama Cloud models
        for model in OLLAMA_MODELS:
            try:
                headers = {"Authorization": f"Bearer {OLLAMA_API_KEY}", "Content-Type": "application/json"}
                data = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a Principal AI Systems Architect. Author deep, production-grade technical lessons with zero fluff."},
                        {"role": "user", "content": prompt}
                    ],
                    "stream": False
                }
                resp = requests.post(OLLAMA_URL, headers=headers, json=data, timeout=90)
                if resp.status_code == 200:
                    content = resp.json().get("message", {}).get("content", "").strip()
                    if len(content) > 500:
                        return content
                elif resp.status_code == 429:
                    pass
            except Exception:
                pass

        # 2. Try Mistral
        try:
            m_headers = {"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type": "application/json"}
            m_data = {
                "model": "mistral-large-latest",
                "messages": [
                    {"role": "system", "content": "You are a Principal AI Systems Architect. Author deep, production-grade technical lessons with zero fluff."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 4096
            }
            resp = requests.post(MISTRAL_URL, headers=m_headers, json=m_data, timeout=90)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"].strip()
                if len(content) > 500:
                    return content
        except Exception:
            pass

        # Exponential sleep on rate limits
        sleep_dur = 4 * (attempt + 1)
        print(f"   ⏳ Rate limited, backing off for {sleep_dur}s (Attempt {attempt+1}/8)...", flush=True)
        time.sleep(sleep_dur)

    return ""

def generate_topic_mermaid(title: str) -> str:
    t_lower = title.lower()
    if "attention" in t_lower or "transformer" in t_lower or "gpt" in t_lower:
        return """```mermaid
flowchart TD
    Q["Input Tokens / Embeddings"] --> M1["Linear Projections: Q, K, V"]
    M1 --> M2["Scaled Dot-Product: (Q @ K.T) / sqrt(d_k)"]
    M2 --> M3["Causal Mask & Softmax Normalization"]
    M3 --> M4["Context Weighted Sum: (Weights @ V)"]
    M4 --> OUT["Output Projection & Residual Connection"]
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
    elif "serve" in t_lower or "vllm" in t_lower or "triton" in t_lower or "deploy" in t_lower or "trace" in t_lower:
        return """```mermaid
flowchart TD
    ClientReq["Client Inference Request"] --> Queue["Async Request Scheduler (FastAPI)"]
    Queue --> Engine["vLLM / Triton PagedAttention Engine"]
    Engine --> KVCache["Virtual Memory KV Block Manager"]
    KVCache --> GPU["GPU Tensor Core Kernel Dispatch"]
    GPU --> Stream["Token-by-Token Streaming Response"]
```"""
    else:
        return """```mermaid
flowchart TD
    Source["Source Input / State"] --> Engine["Execution Pipeline & System Logic"]
    Engine --> Memory["State Transitions & Memory Layout"]
    Memory --> Output["Deterministic Verified Result"]
```"""

def sanitize_and_clean_markdown(raw_text: str, frontmatter_str: str, title: str) -> str:
    text = raw_text.strip()
    if text.startswith("```markdown"):
        text = text[len("```markdown"):].strip()
    elif text.startswith("```md"):
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
    body = re.sub(r"^(?:id:|part:|chapter:|title:|slug:|difficulty:|estimated_minutes:|prerequisites:|tags:|status:)[^\n]*\n?", "", body, flags=re.MULTILINE).strip()

    while body.startswith("---"):
        body = body[3:].strip()

    if "```mermaid" not in body:
        chart = generate_topic_mermaid(title)
        if "# Mental Model & Architecture" in body:
            body = body.replace("# Mental Model & Architecture", f"# Mental Model & Architecture\n\n{chart}\n")
        else:
            body = f"# Mental Model & Architecture\n\n{chart}\n\n" + body

    def fix_mermaid(match):
        block = match.group(1)
        lines = block.splitlines()
        new_lines = []
        for line in lines:
            fixed_line = re.sub(r'(\b[a-zA-Z0-9_]+)\s*\[([^"\[\]\n]+)\]', lambda m: f'{m.group(1)}["{m.group(2).replace(chr(34), chr(39)).strip()}"]', line)
            new_lines.append(fixed_line)
        return "```mermaid\n" + "\n".join(new_lines) + "\n```"

    body = re.sub(r'```mermaid\s*\n([\s\S]*?)\n```', fix_mermaid, body)
    return frontmatter_str.strip() + "\n\n" + body + "\n"

def main():
    with open("data/curriculum.json") as f:
        curr = json.load(f)

    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            progress = json.load(f)
    else:
        progress = {}

    all_lessons = []
    for p in curr["parts"]:
        p_num = p["number"]
        for c in p["chapters"]:
            c_num = int(c["number"])
            for l in c["lessons"]:
                lid = l["id"]
                all_lessons.append({
                    "id": lid,
                    "title": l["title"],
                    "slug": l.get("slug", ""),
                    "difficulty": l.get("difficulty", "intermediate"),
                    "estimatedMinutes": l.get("estimatedMinutes", 20),
                    "prerequisites": l.get("prerequisites", []),
                    "tags": l.get("tags", []),
                    "file_path": l.get("file", ""),
                    "part_num": p_num,
                    "part_title": p["title"],
                    "chapter_num": c_num,
                    "chapter_title": c["title"]
                })

    # Resolve paths
    all_disk = glob.glob("content/**/*.md", recursive=True)
    for t in all_lessons:
        lid = t["id"]
        for f in all_disk:
            bn = os.path.basename(f)
            if bn.startswith(f"{lid}-") or bn.startswith(f"{lid}.") or bn == f"{lid}.md":
                t["file_path"] = f
                break
        if not t["file_path"]:
            t["file_path"] = f"content/part-{t['part_num']:02d}/chapter-{t['chapter_num']:02d}/{lid}-{t['slug']}.md"

    remaining = [l for l in all_lessons if l["id"] not in progress]
    print(f"🎯 Total Lessons: {len(all_lessons)}")
    print(f"✅ Already Furnished: {len(progress)}")
    print(f"🚀 Remaining to Furnish: {len(remaining)}")

    for idx, item in enumerate(remaining, 1):
        lid = item["id"]
        ltitle = item["title"]
        pnum = item["part_num"]
        cnum = item["chapter_num"]
        fpath = item["file_path"]

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

### Requirements:
- Begin with exact YAML frontmatter.
- Jump directly to `# Concept`.
- Include ALL 11 required sections:
  # Concept
  # Why Does It Exist?
  # Mental Model & Architecture (Include a valid ```mermaid flowchart)
  # Under the Hood & Systems Internals
  # Production-Grade Executable Example
  # Step-by-Step Execution Trace
  # Common Traps & Antipatterns (At least 2 > [!TRAP] callouts)
  # Performance & Complexity Analysis
  # Debugging & Profiling Recipes
  # Real-World AI Systems Connection (At least 1 > [!AI] callout)
  # Hands-on Engineering Challenges
"""

        print(f"\n[{idx}/{len(remaining)}] Authoring Lesson {lid}: {ltitle}...", flush=True)
        raw_resp = query_llm_with_backoff(prompt)
        if raw_resp:
            cleaned = sanitize_and_clean_markdown(raw_resp, frontmatter_str, ltitle)
            os.makedirs(os.path.dirname(fpath), exist_ok=True)
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(cleaned)

            progress[lid] = {
                "title": ltitle,
                "file": fpath,
                "timestamp": time.time()
            }
            with open(PROGRESS_FILE, "w") as pf:
                json.dump(progress, pf, indent=2)

            print(f"   ✅ Successfully furnished and checkpointed Lesson {lid}!", flush=True)
            time.sleep(2)
        else:
            print(f"   ❌ Failed to get response for Lesson {lid}", flush=True)

    print("\n🏁 Master Finishing Sweep Complete!", flush=True)

if __name__ == "__main__":
    main()
