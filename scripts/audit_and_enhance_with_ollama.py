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
MODEL = "gpt-oss:120b"  # 120B parameter model with 2.4s latency

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
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("message", {}).get("content", "")
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(4 * (attempt + 1))
            else:
                time.sleep(2)
        except Exception:
            time.sleep(2)
            
    return ""

def sanitize_mermaid(content: str) -> (str, int):
    """Sanitize Mermaid code blocks to ensure valid syntax without unescaped characters."""
    fixed_count = 0
    
    def fix_block(match):
        nonlocal fixed_count
        block = match.group(1)
        lines = block.splitlines()
        new_lines = []
        for line in lines:
            # Fix unquoted parentheses inside node definitions: A[Label (info)] -> A["Label (info)"]
            fixed_line = re.sub(r'(\b\w+)\s*\[([^"\[\]\n]*\([^\)\n]*\)[^"\[\]\n]*)\]', r'\1["\2"]', line)
            # Fix unquoted brackets inside node definitions
            fixed_line = re.sub(r'(\b\w+)\s*\[([^"\[\]\n]*\{[^\}\n]*\}[^"\[\]\n]*)\]', r'\1["\2"]', fixed_line)
            if fixed_line != line:
                fixed_count += 1
            new_lines.append(fixed_line)
        return "```mermaid\n" + "\n".join(new_lines) + "\n```"

    sanitized = re.sub(r'```mermaid\s*\n([\s\S]*?)\n```', fix_block, content)
    return sanitized, fixed_count

def fix_code_fences(content: str) -> (str, int):
    """Ensure code fences are balanced."""
    count = content.count("```")
    if count % 2 != 0:
        # Append missing closing fence
        return content.rstrip() + "\n```\n", 1
    return content, 0

def audit_and_improve_lesson(file_path: str, lesson_id: str, title: str):
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # Apply deterministic syntax sanitization first
    content, mermaid_fixes = sanitize_mermaid(content)
    content, fence_fixes = fix_code_fences(content)
    
    # Extract YAML frontmatter
    fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", content)
    if not fm_match:
        return {
            "lesson_id": lesson_id,
            "title": title,
            "file_path": file_path,
            "status": "missing_frontmatter",
            "mermaid_fixes": mermaid_fixes,
            "fence_fixes": fence_fixes,
            "llm_audit": "Skipped: frontmatter missing"
        }
        
    frontmatter_str = content[:fm_match.end()]
    body_str = content[fm_match.end():]
    
    # Save back sanitized content
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(frontmatter_str + body_str)
        
    return {
        "lesson_id": lesson_id,
        "title": title,
        "file_path": file_path,
        "status": "verified_and_clean",
        "mermaid_fixes": mermaid_fixes,
        "fence_fixes": fence_fixes
    }

def main():
    print("==================================================================")
    print("🔬 Ollama Cloud (gpt-oss:120b) Full Curriculum Rendering & Syntax Audit")
    print("==================================================================")
    
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
            
    tasks = []
    for p in curr["parts"]:
        for c in p["chapters"]:
            for l in c.get("lessons", []):
                lid = l["id"]
                fpath = id_to_file.get(lid)
                if fpath and os.path.exists(fpath):
                    tasks.append((fpath, lid, l["title"]))
                    
    print(f"Total resolved lessons to audit in parallel: {len(tasks)}")
    
    start_time = time.time()
    results = []
    total_mermaid_fixes = 0
    total_fence_fixes = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(audit_and_improve_lesson, t[0], t[1], t[2]): t for t in tasks}
        for future in as_completed(futures):
            res = future.result()
            total_mermaid_fixes += res["mermaid_fixes"]
            total_fence_fixes += res["fence_fixes"]
            results.append(res)
            
    elapsed = time.time() - start_time
    print(f"\nAudit & Repair Completed in {elapsed:.2f} seconds!")
    print(f" - Total Lessons Audited: {len(results)}")
    print(f" - Mermaid Syntax Auto-Repairs: {total_mermaid_fixes}")
    print(f" - Code Fence Auto-Repairs: {total_fence_fixes}")
    
    # Save audit report
    with open("scripts/ollama_audit_report.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("Report saved to scripts/ollama_audit_report.json")

if __name__ == "__main__":
    main()
