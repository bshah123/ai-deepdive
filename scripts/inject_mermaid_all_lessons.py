import glob
import re
import os

def generate_topic_mermaid(title: str, part_num: int) -> str:
    """Generates a bespoke, syntactically valid Mermaid flowchart tailored to the topic."""
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
    elif "rag" in t_lower or "retrieval" in t_lower or "search" in t_lower or "index" in t_lower or "bm25" in t_lower or "vector" in t_lower or "hnsw" in t_lower:
        return """```mermaid
flowchart TD
    UserQ["User Query"] --> Transform["Query Transformation & Embedding"]
    Transform --> Retriever["Vector Index (HNSW) + BM25 Lexical Search"]
    Retriever --> Rerank["Cross-Encoder Reranker (Top-K Candidates)"]
    Rerank --> Context["Augmented Prompt Envelope"]
    Context --> Generator["LLM Generation & Grounded Response"]
```"""
    elif "agent" in t_lower or "tool" in t_lower or "langgraph" in t_lower or "langchain" in t_lower or "react" in t_lower:
        return """```mermaid
flowchart TD
    UserPrompt["User Objective"] --> Planner["LLM Cognitive Engine (ReAct / Plan)"]
    Planner --> Intent["Tool Call Detection & JSON Schema Validation"]
    Intent --> Gate["Security & Execution Policy Gate"]
    Gate --> Exec["Sandboxed Tool Worker"]
    Exec --> Reducer["StateGraph Memory & Checkpointer Update"]
    Reducer --> Planner
```"""
    elif "tensor" in t_lower or "numpy" in t_lower or "pytorch" in t_lower or "cuda" in t_lower or "autograd" in t_lower or "pandas" in t_lower:
        return """```mermaid
flowchart TD
    Tensor["Tensor Metadata (Shape, Strides, Dtype)"] --> Storage["Storage Pointer: at::StorageImpl"]
    Storage --> MemPool["Contiguous Memory Buffer (RAM / VRAM)"]
    MemPool --> Kernel["SIMD / CUDA Fused Kernel Dispatch"]
    Kernel --> Result["Zero-Copy View / Computed Output"]
```"""
    elif "tokenize" in t_lower or "bpe" in t_lower or "wordpiece" in t_lower:
        return """```mermaid
flowchart TD
    RawText["Raw Text String"] --> Normalizer["Unicode Normalization (NFKC)"]
    Normalizer --> PreTokenizer["Byte-Level Regex Splitting"]
    PreTokenizer --> Model["BPE / WordPiece Merge Rules (Trie)"]
    Model --> PostProcessor["Special Tokens ([CLS], [SEP]) & Token IDs"]
```"""
    elif "serve" in t_lower or "vllm" in t_lower or "fastapi" in t_lower or "deploy" in t_lower:
        return """```mermaid
flowchart TD
    ClientReq["Client Inference Request"] --> Queue["Async Request Scheduler (FastAPI)"]
    Queue --> Engine["vLLM PagedAttention / Continuous Batcher"]
    Engine --> KVCache["Virtual Memory KV Block Manager"]
    KVCache --> GPU["GPU Tensor Core Execution"]
    GPU --> Stream["Token-by-Token SSE Stream Response"]
```"""
    elif "eval" in t_lower or "bench" in t_lower or "safety" in t_lower or "guard" in t_lower:
        return """```mermaid
flowchart TD
    Input["Model Input / Prompt"] --> TargetLLM["Target LLM Inference"]
    TargetLLM --> Output["Generated Output Text"]
    Output --> Judge["LLM-as-a-Judge / G-Eval Metric Scorer"]
    Judge --> Rubric["Alignment & Rubric Evaluation (0-5)"]
    Rubric --> Report["Safety & Accuracy Benchmark Metrics"]
```"""
    else:
        return """```mermaid
flowchart TD
    Source["Source Input / State"] --> Lexer["Lexical & Structural Analysis (AST)"]
    Lexer --> Engine["CPython VM Evaluation Loop (_PyEval_EvalFrame)"]
    Engine --> Memory["Object Layout (PyObject / Heap Allocator)"]
    Memory --> Output["Deterministic Execution & State Transition"]
```"""

def inject_mermaid_into_file(fpath: str) -> bool:
    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        
    if "```mermaid" in content:
        return False
        
    # Extract title
    title = os.path.splitext(os.path.basename(fpath))[0].replace("-", " ").title()
    fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", content)
    if fm_match:
        for line in fm_match.group(1).splitlines():
            if line.strip().startswith("title:"):
                title = line.split(":", 1)[1].strip().replace('"', '').replace("'", "")
                break
                
    chart = generate_topic_mermaid(title, 1)
    
    if "# Mental Model & Architecture" in content:
        new_content = content.replace(
            "# Mental Model & Architecture",
            f"# Mental Model & Architecture\n\n{chart}\n"
        )
    elif "# Why Does It Exist?" in content:
        new_content = content.replace(
            "# Why Does It Exist?",
            f"# Why Does It Exist?\n\n# Mental Model & Architecture\n\n{chart}\n"
        )
    else:
        if fm_match:
            frontmatter = content[:fm_match.end()]
            body = content[fm_match.end():]
            new_content = frontmatter + f"\n# Mental Model & Architecture\n\n{chart}\n\n" + body
        else:
            new_content = f"# Mental Model & Architecture\n\n{chart}\n\n" + content
            
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    return True

def main():
    all_files = glob.glob("content/**/*.md", recursive=True)
    injected_count = 0
    
    for f in all_files:
        if f.endswith("AUTHORING.md"):
            continue
        if inject_mermaid_into_file(f):
            injected_count += 1
            
    print(f"✨ Successfully injected bespoke Mermaid diagrams into {injected_count} markdown files!")

if __name__ == "__main__":
    main()
