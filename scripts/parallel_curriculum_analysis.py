import os
import json
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
MODEL = "mistral-small-latest"

def call_mistral(prompt: str, system_prompt: str = "You are a world-class Principal AI Systems Engineer and author of elite engineering course materials."):
    payload = {
        "model": MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    }
    
    req = urllib.request.Request(
        MISTRAL_API_URL,
        headers={
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/json"
        },
        data=json.dumps(payload).encode("utf-8")
    )
    
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        return f"HTTP Error {e.code}: {error_body}"
    except Exception as e:
        return f"Error: {str(e)}"

def analyze_and_enhance(lesson_info):
    file_path = lesson_info["file_path"]
    topic = lesson_info["topic"]
    
    with open(file_path, "r", encoding="utf-8") as f:
        current_content = f.read()
        
    prompt = f"""We are upgrading the educational content in 'AI-DeepDive' (a LearnCpp-style platform for AI & Systems Engineers).

FILE: {file_path}
TOPIC: {topic}

CURRENT CONTENT:
```markdown
{current_content}
```

Please perform two tasks:

### TASK 1: DIAGNOSTIC & ENHANCEMENT OPPORTUNITIES
1. **Shortcomings in Current Version**: What is generic, missing, or inaccurate for '{topic}'?
2. **Missing Low-Level & Architectural Depth**: What specific CPython/PyTorch/CUDA/systems internals, algorithms, and mathematical formulations are missing?
3. **Key Production Traps & AI Connections**: What real traps (`> [!TRAP]`) and real-world AI pipeline links (`> [!AI]`) should be highlighted?

### TASK 2: CONCRETE UPGRADE SPECIFICATION
Provide:
- A tailored **Mermaid diagram** specific to {topic}.
- An executable, self-contained **Python / PyTorch code snippet** that clearly teaches this specific concept.
- A 1-paragraph summary of the exact pedagogical transformation.
"""
    response = call_mistral(prompt)
    return {
        "topic": topic,
        "file_path": file_path,
        "content_length": len(current_content),
        "enhancement_spec": response
    }

def main():
    target_lessons = [
        {
            "topic": "Python Source Execution & Bytecode Pipeline",
            "file_path": "content/part-01-python-properly/chapter-01-how-python-works/01-python-programs.md"
        },
        {
            "topic": "NumPy Strides, ndarray Buffer & Memory Layout",
            "file_path": "content/part-02-scientific-python/chapter-15-numpy-internals/15.1-numpy-strides.md"
        },
        {
            "topic": "BPE (Byte Pair Encoding) Tokenization Algorithm",
            "file_path": "content/part-04-transformers-llms/chapter-23-tokenization/23.1-bpe-algorithm.md"
        },
        {
            "topic": "BM25 Scoring Mathematics & Inverted Index",
            "file_path": "content/part-05-information-retrieval/chapter-33-lexical-search/33.2-bm25-math.md"
        },
        {
            "topic": "Pure Python Vector RAG Pipeline Architecture",
            "file_path": "content/part-06-rag/chapter-37-rag-foundations/37.3-pure-python-rag.md"
        },
        {
            "topic": "LLM Tool Calling & JSON Schema Protocol",
            "file_path": "content/part-08-agents/chapter-49-tool-calling/49.1-function-calling-schema.md"
        }
    ]
    
    print(f"Launching parallel Mistral enhancement analysis for {len(target_lessons)} chapters...")
    start = time.time()
    
    results = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        future_map = {executor.submit(analyze_and_enhance, item): item for item in target_lessons}
        for future in as_completed(future_map):
            item = future_map[future]
            try:
                res = future.result()
                print(f"✅ Finished enhancement analysis: {res['topic']} ({res['file_path']})")
                results.append(res)
            except Exception as e:
                print(f"❌ Failed for {item['topic']}: {e}")
                
    elapsed = time.time() - start
    print(f"\nAll {len(results)} analyses completed in {elapsed:.2f} seconds.")
    
    output_path = "scripts/parallel_enhancement_report.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Saved complete enhancement analysis report to {output_path}")

if __name__ == "__main__":
    main()
