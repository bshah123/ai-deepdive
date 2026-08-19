import os
import json
import glob
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
MODEL = "mistral-small-latest"

def call_mistral(prompt: str, system_prompt: str = "You are a world-class Principal AI Engineer, CPython core developer, and author of elite engineering textbooks like LearnCpp."):
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
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        return f"HTTP Error {e.code}: {error_body}"
    except Exception as e:
        return f"Error: {str(e)}"

def analyze_chapter_content(file_path: str):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    prompt = f"""We are evaluating educational content for an engineering course platform called 'AI-DeepDive' (styled like LearnCpp for AI/Python engineers).

Here is the CURRENT lesson file from '{file_path}':

```markdown
{content}
```

Please analyze this lesson and provide a concise, rigorous diagnostic:
1. **Diagnosis & Weaknesses**: What is wrong or generic with the current file? (e.g. generic copy-paste templates, mismatched diagrams, lack of real code, missing depth on the actual topic title).
2. **Topic-Specific Possibilities**: What specific deep concepts, CPython / PyTorch / CUDA internals, mathematical equations, and real-world architectures SHOULD be taught here?
3. **Pedagogical Enhancements**: Specific diagrams (Mermaid), real executable Python code examples, common production traps (`> [!TRAP]`), profiling/debugging recipes, and AI connections (`> [!AI]`).
4. **Overall Score**: Rate the current content from 1-10 on rigor and provide a 1-sentence verdict.

Keep your response structured, sharp, and focused on concrete technical enhancements.
"""
    result = call_mistral(prompt)
    return {
        "file_path": file_path,
        "analysis": result
    }

def main():
    # Select representative lessons across key domains
    test_files = [
        "content/part-01-python-properly/chapter-01-how-python-works/01-python-programs.md",
        "content/part-01-python-properly/chapter-02-variables-objects/02-everything-is-object.md",
        "content/part-02-scientific-python/chapter-15-numpy-internals/01-ndarray-memory-layout.md",
        "content/part-04-transformers-llms/chapter-23-tokenization/01-why-tokenization.md",
        "content/part-06-rag/chapter-37-rag-fundamentals/01-why-rag.md",
        "content/part-08-agents/chapter-49-tool-calling/01-how-tool-calling-works.md"
    ]
    
    # Filter existing files
    valid_files = [f for f in test_files if os.path.exists(f)]
    print(f"Found {len(valid_files)} test files to analyze in parallel with Mistral...")

    start_time = time.time()
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(analyze_chapter_content, f): f for f in valid_files}
        for future in as_completed(futures):
            res = future.result()
            print(f" Completed analysis for: {res['file_path']}")
            results.append(res)

    elapsed = time.time() - start_time
    print(f"\nCompleted {len(results)} parallel analyses in {elapsed:.2f} seconds.")

    # Save to a structured report
    output_path = "scripts/mistral_enhancement_analysis.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Saved results to {output_path}")

if __name__ == "__main__":
    main()
