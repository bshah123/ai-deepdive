import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# PART 9: PRODUCTION AI & LLMOPS
# ==============================================================================

write_file(r"content/part-09-production-ai-llmops/chapter-53-latency-throughput-ttft/53.1-performance-metrics-ttft.md", r"""---
id: "53.1"
part: 9
chapter: 53
title: "LLM Performance Metrics: TTFT, ITL, Tokens/Sec & Throughput"
slug: "performance-metrics-ttft"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["29.1"]
tags: ["ttft", "itl", "latency", "throughput", "vllm", "llmops"]
status: "published"
---

# Concept

When serving Large Language Models in production, user experience and operational cost are governed by four fundamental latency and throughput metrics:

```mermaid
flowchart LR
    UserPrompt["User Prompt Sent"] --> Prefill["1. Prefill Phase (Compute-Bound)<br>Processes entire input prompt in parallel"]
    Prefill --> TTFT["Time to First Token (TTFT) Recorded"]
    TTFT --> Decode1["2. Decode Phase (Memory-Bound)<br>Generates token 1"]
    Decode1 --> ITL1["Inter-Token Latency (ITL)"]
    Decode1 --> Decode2["Generates token 2"]
    Decode2 --> ITL2["Inter-Token Latency (ITL)"]
    Decode2 --> End["Generation Complete"]
```

# The 4 Core LLM Production Metrics

| Metric | Definition | Optimization Target | Primary Hardware Bound |
|---|---|---|---|
| **TTFT (Time-to-First-Token)** | Latency from request arrival to the first generated token | $< 200 \text{ ms}$ for real-time chat | **Compute-Bound (FLOPs)** (Prefill phase) |
| **ITL (Inter-Token Latency)** | Average time between consecutive generated tokens | $< 30 \text{ ms/token}$ ($\approx 33 \text{ tok/s}$) | **Memory-Bandwidth-Bound** (KV-Cache fetch) |
| **Throughput (Tokens/Sec)** | Total tokens generated per second across all concurrent users | Maximize per GPU (e.g. $> 2000 \text{ tok/s}$) | **Batch Size & Tensor Cores** |
| **E2E Latency** | Total elapsed time: $\text{TTFT} + (\text{Tokens} \times \text{ITL})$ | Context & SLA dependent | Combined Prefill + Decode |

# Continuous Batching vs Static Batching

- **Static Batching (Legacy)**: All sequences in a batch must wait until the longest sequence finishes generating tokens. Short requests are blocked, causing massive GPU underutilization.
- **Continuous (Iteration-Level) Batching (vLLM / TGI)**: Dynamically injects newly arrived requests into the active decode iteration immediately after any request emits an `EOS` token, increasing serving throughput by **20x to 30x**.

# Exercises

**🟢 Basic**: Write a client benchmark script using `asyncio` and `httpx` that measures TTFT and ITL for 50 concurrent streaming requests against an OpenAI-compatible endpoint.

**🟡 Intermediate**: Calculate the maximum theoretical decode throughput (tokens/sec) of an 8B FP16 model on an NVIDIA A100 (2,039 GB/s HBM bandwidth) assuming memory bandwidth is saturated.

**🔴 Advanced**: Simulate a continuous batching scheduler in Python that schedules mixed-length prompts and tracks queue wait time vs GPU execution duty cycle.
""")

write_file(r"content/part-09-production-ai-llmops/chapter-54-serving-frameworks/54.1-deploying-vllm.md", r"""---
id: "54.1"
part: 9
chapter: 54
title: "Deploying High-Throughput vLLM Model Servers"
slug: "deploying-vllm"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["53.1", "29.2"]
tags: ["vllm", "serving", "paged-attention", "fastapi", "cuda-graphs"]
status: "published"
---

# Concept

**vLLM** (Kwon et al., UC Berkeley) is the industry standard open-source high-throughput LLM inference engine. It achieves 20x higher throughput than Hugging Face Transformers through:
1. **PagedAttention**: Manages KV-Cache memory in non-contiguous physical pages (virtual memory pagination), eliminating 96% of VRAM fragmentation.
2. **Continuous Batching**: Iteration-level scheduling.
3. **Chunked Prefill**: Blends compute-heavy prompt prefill with memory-heavy token decoding in the same batch.
4. **CUDA Graph Capture**: Pre-records GPU kernel execution sequences to eliminate CPU kernel launch latency.

```mermaid
flowchart TD
    subgraph LogicalSpace ["Logical KV-Cache (Virtual Blocks)"]
        ReqA["Request A: Block 0, Block 1, Block 2"]
    end

    subgraph BlockTable ["vLLM Block Table (Page Table Translation)"]
        ReqA --> Table["Logical Block 0 -> Physical Page 4<br>Logical Block 1 -> Physical Page 12<br>Logical Block 2 -> Physical Page 2"]
    end

    subgraph PhysicalVRAM ["Physical GPU VRAM Pages (16 Tokens per Page)"]
        Page2["Physical Page 2"]
        Page4["Physical Page 4"]
        Page12["Physical Page 12"]
    end

    Table --> PhysicalVRAM
```

# Production vLLM Deployment

```bash
# Launch vLLM OpenAI-Compatible API Server with Tensor Parallelism & Prefix Caching
python3 -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Meta-Llama-3-8B-Instruct \
    --tensor-parallel-size 1 \
    --gpu-memory-utilization 0.90 \
    --max-model-len 8192 \
    --enable-prefix-caching \
    --port 8000
```

# Programmatic Python Engine Usage

```python
from vllm import LLM, SamplingParams

prompts = [
    "Explain the architecture of FlashAttention:",
    "How does PagedAttention eliminate memory fragmentation?"
]

sampling_params = SamplingParams(temperature=0.7, top_p=0.9, max_tokens=150)
llm = LLM(model="meta-llama/Meta-Llama-3-8B-Instruct", gpu_memory_utilization=0.85)

outputs = llm.generate(prompts, sampling_params)
for out in outputs:
    print(f"Generated text:\\n{out.outputs[0].text}\\n---\\n")
```

# Exercises

**🟢 Basic**: Deploy a local vLLM server with a small model (e.g. Qwen-2.5-0.5B) and query it using the official `openai` Python SDK.

**🟡 Intermediate**: Configure `--enable-prefix-caching` and demonstrate that repeated system prompts produce near-zero TTFT latency via Radix-Tree KV reuse.

**🔴 Advanced**: Configure Tensor Parallelism (`--tensor-parallel-size 2`) across 2 GPUs with NCCL and analyze inter-GPU All-Reduce communication overhead during the decode phase.
""")

# ==============================================================================
# PART 10: EVALUATION & RESEARCH FRONTIERS
# ==============================================================================

write_file(r"content/part-10-evaluation-research/chapter-57-llm-evaluation/57.1-rag-triad-ragas.md", r"""---
id: "57.1"
part: 10
chapter: 57
title: "The RAG Triad: Context Relevance, Groundedness & Answer Relevance"
slug: "rag-triad-ragas"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["37.1", "37.2"]
tags: ["ragas", "rag-triad", "evaluation", "groundedness", "faithfulness"]
status: "published"
---

# Concept

Evaluating Retrieval-Augmented Generation (RAG) systems requires separating retrieval quality from generation quality. The **RAG Triad** (formalized by Ragas and TruLens) evaluates the three vertices connecting the User Query, Retrieved Context, and Generated Response:

```mermaid
flowchart TD
    Query["1. User Query"] <--> |"Context Relevance<br>(Did we retrieve useful context?)"| Context["2. Retrieved Context"]
    Context <--> |"Groundedness / Faithfulness<br>(Is the answer strictly supported by context?)"| Response["3. Generated Response"]
    Query <--> |"Answer Relevance<br>(Does the answer directly address the question?)"| Response
```

# Mathematical Definitions of RAG Triad Metrics

1. **Context Relevance**:
   $$\text{Context Relevance} = \frac{|\text{Relevant Sentences in Retrieved Context}|}{|\text{Total Sentences in Retrieved Context}|}$$
   Measures noise and irrelevant chunk retrieval.

2. **Groundedness (Faithfulness)**:
   $$\text{Faithfulness} = \frac{|\text{Claims in Response verifiable by Context}|}{|\text{Total Claims in Response}|}$$
   A score $< 1.0$ indicates **Hallucination** (the model introduced facts not present in source documents).

3. **Answer Relevance**:
   Evaluates whether the response directly addresses the query without digression or incomplete refusal.

# Evaluating with RAGAS in Python

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision
from datasets import Dataset

# Construct evaluation test dataset
eval_data = {
    "question": ["What is the primary optimizer in LLaMA-3?"],
    "contexts": [["LLaMA-3 models are trained using the AdamW optimizer with beta1=0.9 and beta2=0.95."]],
    "answer": ["LLaMA-3 uses the AdamW optimizer with decoupled weight decay."],
    "ground_truth": ["AdamW optimizer"]
}

dataset = Dataset.from_dict(eval_data)
# results = evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_precision])
# print("Evaluation Scores:", results)
```

# Exercises

**🟢 Basic**: Implement a basic rule-based hallucination detector that verifies all named entities in the model response exist in the source context.

**🟡 Intermediate**: Write a synthetic evaluation benchmark pipeline that automatically injects intentional factual contradictions into context chunks and tests whether the LLM flags the conflict.

**🔴 Advanced**: Implement G-Eval in Python using structured JSON schema output prompts that require the LLM-judge to output chain-of-thought reasoning followed by a calibrated 1–5 rubric score.
""")

write_file(r"content/part-10-evaluation-research/chapter-59-reasoning-models/59.1-chain-of-thought.md", r"""---
id: "10"
part: 10
chapter: 59
title: "Chain-of-Thought (CoT) & System 1 vs System 2 Reasoning"
slug: "chain-of-thought"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["27.1", "28.3"]
tags: ["cot", "reasoning", "system-2", "test-time-compute", "o1", "deepseek-r1"]
status: "published"
---

# Concept

Daniel Kahneman's cognitive framework distinguishes:
- **System 1 (Fast Thinking)**: Intuitive, automatic, heuristic pattern-matching (Standard standard LLM autoregressive token generation).
- **System 2 (Slow Thinking)**: Deliberative, sequential, self-correcting logical search (**Reasoning Models like OpenAI o1 and DeepSeek-R1**).

```mermaid
flowchart TD
    subgraph System1 ["System 1: Standard Autoregressive LLM (Fixed Compute)"]
        Prompt1["Prompt: 'Solve complex math problem'"] --> FixedGenerate["Single forward pass: 200 tokens output (Prone to errors)"]
    end

    subgraph System2 ["System 2: Reasoning Model (Dynamic Test-Time Compute)"]
        Prompt2["Prompt: 'Solve complex math problem'"] --> Deliberate["Deliberative Chain-of-Thought Generation:<br>1. Explore hypothesis A<br>2. Detect self-contradiction<br>3. Backtrack and explore hypothesis B<br>4. Verify with boundary conditions"]
        Deliberate --> VerifiedAnswer["Final Verified Output (High Accuracy)"]
    end
```

# Test-Time Compute Scaling

Modern AI research has revealed a third scaling law: **Test-Time Compute Scaling**. Rather than scaling model parameters or pre-training tokens, spending more compute during inference (generating thousands of reasoning tokens before emitting the final answer) produces massive improvements on competitive programming (Codeforces), Olympiad mathematics (AIME), and scientific synthesis.

```python
# System 2 Thinking Prompt Pattern
def generate_reasoning_prompt(problem: str) -> str:
    return (
        "Solve the following problem.\\n"
        "You must structure your response in two explicit sections:\\n"
        "<thought>\\n"
        "Step-by-step internal deliberation.\\n"
        "- Explore multiple solution pathways.\\n"
        "- Explicitly check for potential edge-case errors.\\n"
        "- If an error is detected, backtrack and state the correction.\\n"
        "</thought>\\n"
        "<final_answer>\\n"
        "Exact final verified solution.\\n"
        "</final_answer>\\n\\n"
        f"Problem: {problem}"
    )

print(generate_reasoning_prompt("How many r's are in the word 'strawberry'?"))
```

# Process Reward Models (PRM) vs Outcome Reward Models (ORM)

- **ORM (Outcome Reward Model)**: Rewards the model based solely on whether the final answer is correct (+1 / -1). Cannot identify *where* an error occurred in a 50-step calculation.
- **PRM (Process Reward Model / 'Let's Verify Step by Step')**: Evaluates and assigns a reward score to **every individual step** of the reasoning trace, guiding Monte Carlo Tree Search (MCTS) to prune bad reasoning branches early.

# Exercises

**🟢 Basic**: Write a python script parsing `<thought>` and `<final_answer>` tags from a reasoning model stream and rendering only the final output to the user while storing the thought trace for audit logs.

**🟡 Intermediate**: Implement a Majority Voting / Self-Consistency pipeline (`temperature=0.7`, $N=10$ paths) that samples 10 independent reasoning chains and returns the consensus answer.

**🔴 Advanced**: Implement a beam search or best-of-N tree search guided by a step-level Process Reward Model scoring function.
""")

print("Parts 9 & 10 authored with supreme depth!")
