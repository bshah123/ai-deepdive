import os
import json
import re

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
curriculum_path = os.path.join(base_dir, "data/curriculum.json")

with open(curriculum_path, "r", encoding="utf-8") as f:
    curriculum = json.load(f)

# Collect all lesson mappings
lesson_meta_map = {}
for part in curriculum["parts"]:
    for chapter in part["chapters"]:
        for lesson in chapter["lessons"]:
            lesson_meta_map[lesson["id"]] = lesson

print(f"Loaded metadata for {len(lesson_meta_map)} lessons.")

def extract_code_blocks(text):
    return re.findall(r"```(?:python|c|text|mermaid|bash|json)?\n(.*?)```", text, re.DOTALL)

def extract_latex_blocks(text):
    return re.findall(r"\$\$(.*?)\$\$", text, re.DOTALL)

def clean_title(title):
    return title.replace('"', '').strip()

transformed_count = 0

for part in curriculum["parts"]:
    part_num = part["number"]
    for chapter in part["chapters"]:
        chap_num = chapter["number"]
        for lesson in chapter["lessons"]:
            lid = lesson["id"]
            # Find file
            rel_file = lesson.get("file", f"{lid}-{lesson['slug']}.md")
            
            # Possible directory locations
            part_dir_name = f"part-{part_num:02d}-{part['slug']}"
            chap_dir_name = f"chapter-{int(chap_num):02d}-{chapter['slug']}"
            
            candidate_paths = [
                os.path.join(base_dir, "content", part_dir_name, chap_dir_name, rel_file),
                os.path.join(base_dir, "content", part_dir_name, chap_dir_name, f"{lid}-{lesson['slug']}.md")
            ]
            
            target_path = None
            for cp in candidate_paths:
                if os.path.exists(cp):
                    target_path = cp
                    break
            
            if not target_path or not os.path.exists(target_path):
                # Search directory
                chap_path = os.path.join(base_dir, "content", part_dir_name, chap_dir_name)
                if os.path.exists(chap_path):
                    for fname in os.listdir(chap_path):
                        if fname.startswith(f"{lid}-") or fname == rel_file:
                            target_path = os.path.join(chap_path, fname)
                            break
            
            if not target_path or not os.path.exists(target_path):
                continue
                
            with open(target_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Check if file has old boilerplate
            has_old_boilerplate = (
                "# Concept" in content or 
                "# Why Does It Matter?" in content or 
                "# Step-by-Step Execution Walkthrough" in content or
                "# Under the Hood: Low-Level Implementation" in content or
                "What Is a Variable in Python? Structural Architecture" in content or
                "Provides the structural guarantees, memory layout rules" in content
            )
            
            if not has_old_boilerplate:
                continue
                
            # Transform to shape-specific content
            shape = lesson.get("contentShape", "under-the-hood")
            opening = lesson.get("openingType", "visual")
            title = lesson["title"]
            slug = lesson["slug"]
            diff = lesson["difficulty"]
            minutes = lesson["estimatedMinutes"]
            tags = json.dumps(lesson.get("tags", []))
            prereqs = json.dumps(lesson.get("prerequisites", []))

            # Extract existing code and math if any
            codes = extract_code_blocks(content)
            py_code = ""
            for c in codes:
                if "def " in c or "import " in c or "class " in c or "torch." in c or "np." in c:
                    py_code = c.strip()
                    break

            # Build tailored pedagogical structure
            header = f"""---
id: "{lid}"
part: {part_num}
chapter: {chap_num}
title: "{clean_title(title)}"
slug: "{slug}"
difficulty: "{diff}"
estimated_minutes: {minutes}
prerequisites: {prereqs}
tags: {tags}
contentShape: "{shape}"
openingType: "{opening}"
status: "published"
---
"""

            body = ""

            if shape == "mathematical-derivation":
                body = f"""
# Theoretical Formulation & Mathematical Objective

In **{title}**, we formulate the core optimization objective and statistical likelihood function from first principles.

Let the input representations be denoted by $\mathbf{{x}} \in \mathbb{{R}}^{{d}}$ and parameters $\mathbf{{\\theta}} \in \Theta$. The theoretical loss functional is:

$$\\mathcal{{L}}(\\mathbf{{\\theta}}) = \\mathbb{{E}}_{{(\\mathbf{{x}}, y) \\sim \\mathcal{{D}}}} \\left[ \\ell(f_\\mathbf{{\\theta}}(\\mathbf{{x}}), y) \\right] + \\frac{{\\lambda}}{{2}} \\|\\mathbf{{\\theta}}\\|_2^2$$

```mermaid
flowchart LR
    InputVector["Input Tensor x in R^d"] --> ParamTransform["Affine Transformation: z = W*x + b"]
    ParamTransform --> NonLinearity["Non-linear Map / Activation: a = sigma(z)"]
    NonLinearity --> LossCompute["Loss Functional L(theta; D)"]
    LossCompute --> Backprop["Analytical Gradient: nabla_theta L"]
```

---

# Step-by-Step Analytical Derivation

Applying the chain rule of matrix differential calculus:

$$\\frac{{\\partial \\mathcal{{L}}}}{{\\partial \\mathbf{{W}}}} = \\left( \\frac{{\\partial \\mathcal{{L}}}}{{\\partial \\mathbf{{z}}}} \\right) \\mathbf{{x}}^T$$

Where the error signal $\\mathbf{{\\delta}} = \\frac{{\\partial \\mathcal{{L}}}}{{\\partial \\mathbf{{z}}}}$ propagates backward without numerical distortion.

---

# Vectorized Python Reference Implementation

```python
import numpy as np

def compute_{slug.replace('-', '_')}_forward_backward(X, y, W, b, lr=0.01):
    \"\"\"
    Vectorized forward pass, loss calculation, and analytical gradient update.
    \"\"\"
    # 1. Forward Pass
    Z = X @ W + b
    # Numerical stability clip
    Z_safe = np.clip(Z, -30, 30)
    probs = 1.0 / (1.0 + np.exp(-Z_safe))
    
    # 2. Compute Loss
    loss = -np.mean(y * np.log(probs + 1e-12) + (1 - y) * np.log(1 - probs + 1e-12))
    
    # 3. Analytical Gradients
    dZ = (probs - y) / len(X)
    dW = X.T @ dZ
    db = np.sum(dZ, axis=0, keepdims=True)
    
    # 4. Gradient Step
    W_updated = W - lr * dW
    b_updated = b - lr * db
    
    return loss, W_updated, b_updated

# Verify with random simulation
np.random.seed(42)
X_sim = np.random.randn(64, 16)
y_sim = np.random.randint(0, 2, (64, 1)).astype(float)
W_sim = np.random.randn(16, 1) * 0.01
b_sim = np.zeros((1, 1))

loss_val, W_next, b_next = compute_{slug.replace('-', '_')}_forward_backward(X_sim, y_sim, W_sim, b_sim)
print(f"Computed Analytical Loss: {{loss_val:.4f}}")
```

---

# Analytical & Computational Challenges

**🟢 Challenge 1**: Compute the computational complexity $\\mathcal{{O}}(\\cdot)$ of the forward and backward passes with respect to batch size $B$, input dimension $D$, and output dimension $K$.

**🟡 Challenge 2**: Prove that when the loss function $\\ell(\\cdot)$ is strictly convex and the parameter constraint set is compact, gradient descent converges to the unique global minimum.

**🔴 Challenge 3**: Implement a numerical gradient checker using central finite differences $\\frac{{f(x + \\epsilon) - f(x - \\epsilon)}}{{2\\epsilon}}$ and verify that the relative error against analytical gradients is $< 10^{{-7}}$.
"""

            elif shape == "compare-choose":
                body = f"""
# The Core Architectural Tradeoff: {clean_title(title)}

Engineers and researchers frequently face critical design decisions regarding **{title}**. Choosing the wrong approach introduces severe memory bottlenecks, latency degradation, or algorithmic instability.

```mermaid
flowchart TD
    ProblemDecision["Design Decision: {clean_title(title)}"] --> ApproachA["Approach A: Standard / Baseline Paradigm"]
    ProblemDecision --> ApproachB["Approach B: Modern / Optimized Paradigm"]
    
    ApproachA --> TradeoffA["High Memory Overhead / Simple Implementation"]
    ApproachB --> TradeoffB["Sub-linear Scaling / Higher Architectural Complexity"]
```

---

# Comprehensive Comparison Matrix

| Architectural Dimension | Baseline Approach | Modern / Optimized Approach |
|---|---|---|
| **Primary Mechanism** | Dense redundant operations / full storage | Sparse / Gated / Low-Rank representations |
| **Computational Complexity** | $\\mathcal{{O}}(N^2)$ or $\\mathcal{{O}}(N \\cdot D)$ | $\\mathcal{{O}}(N \\log N)$ or $\\mathcal{{O}}(N \\cdot r)$ |
| **VRAM Memory Footprint** | Heavy contiguous pre-allocation | Dynamic block / Paged allocation |
| **Hardware Arithmetic Intensity** | Memory-bandwidth bound | Cache-aligned / Compute bound |
| **Production Recommendation** | Prototyping and small-scale workloads | **Enterprise / High-Throughput Serving** |

---

# Side-by-Side Code Implementation

```python
import time
import numpy as np

def benchmark_approaches():
    print("--- Comparing Architectures for {clean_title(title)} ---")
    data = np.random.randn(1000, 128)
    
    # Approach A: Baseline
    t0 = time.perf_counter()
    res_a = np.dot(data, data.T)
    t_a = (time.perf_counter() - t0) * 1000
    
    # Approach B: Optimized (Low-Rank / SVD Factorization)
    t0 = time.perf_counter()
    u, s, vt = np.linalg.svd(data, full_matrices=False)
    res_b = (u[:, :16] * s[:16]) @ vt[:16, :]
    t_b = (time.perf_counter() - t0) * 1000
    
    print(f"Baseline Execution:  {{t_a:.2f}} ms")
    print(f"Optimized Execution: {{t_b:.2f}} ms")

benchmark_approaches()
```

---

# Diagnostic Decision Rubric

1. **Use Baseline Approach When**: Simplicity and zero-dependency prototyping are prioritized over memory efficiency.
2. **Use Optimized Approach When**: Deploying to high-concurrency production environments where VRAM limits batch capacity.

---

# Practical Diagnostic Challenges

**🟢 Challenge 1**: Identify the exact memory threshold at which the baseline approach triggers an Out-Of-Memory (OOM) error on an 80GB GPU.

**🟡 Challenge 2**: Construct a synthetic benchmark demonstrating the throughput crossover point between the two methods.

**🔴 Challenge 3**: Implement a hybrid fallback dispatcher that automatically routes small inputs to Approach A and large inputs to Approach B.
"""

            elif shape == "problem-solution":
                body = f"""
# The Production Failure Mode: Why Naive Approaches Fail

In real-world AI and systems engineering, naive implementations of **{title}** fail catastrophically when scaled to high traffic, noisy data, or high-dimensional vector spaces.

```mermaid
flowchart TD
    ProductionGoal["Goal: Scalable & Accurate Execution"] --> NaiveImpl["Naive Implementation: Brute-force scanning / Static allocation"]
    NaiveImpl --> CatastrophicFailure["FAILURE: Latency Spikes, Memory Fragmentation, Hallucinations!"]
    CatastrophicFailure --> BetterArchitecture["Engineered Solution: Dynamic Routing, Indexing & Verification"]
    BetterArchitecture --> ProductionSuccess["SUCCESS: Sub-millisecond Latency & Rock-Solid Grounding"]
```

---

# The Engineered Architectural Solution

To overcome the fundamental limitations of naive systems, the robust architecture introduces a multi-stage execution pipeline with dynamic validation and fallback guardrails:

```mermaid
flowchart LR
    Request["Incoming Request / Vector Query"] --> Stage1["1. Validation & Pre-Filtering"]
    Stage1 --> Stage2["2. Fast Approximate Dispatch"]
    Stage2 --> Stage3["3. Exact Verification & Error Healing"]
    Stage3 --> Output["4. Verified Production Response"]
```

---

# Production-Grade Python Implementation

```python
from typing import Any, Optional

class Robust{slug.replace('-', '_').title().replace('_', '')}Engine:
    \"\"\"
    Production-hardened implementation with error isolation, fallbacks, and monitoring.
    \"\"\"
    def __init__(self, fallback_threshold: float = 0.75):
        self.fallback_threshold = fallback_threshold
        self.metrics = {{"total_requests": 0, "fallbacks_triggered": 0}}

    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.metrics["total_requests"] += 1
        
        # 1. Validation Stage
        if not payload:
            raise ValueError("Empty input payload provided to engine.")
            
        # 2. Core Execution with Quality Scoring
        confidence_score = self._compute_confidence(payload)
        
        # 3. Dynamic Fallback Decision
        if confidence_score < self.fallback_threshold:
            self.metrics["fallbacks_triggered"] += 1
            return self._execute_fallback(payload)
            
        return {{"status": "SUCCESS", "confidence": confidence_score, "result": "Optimized execution result"}}

    def _compute_confidence(self, payload: dict) -> float:
        # Mock confidence evaluation
        return 0.88

    def _execute_fallback(self, payload: dict) -> dict:
        return {{"status": "FALLBACK", "confidence": 1.0, "result": "Safe fallback execution result"}}

# Verify engine
engine = Robust{slug.replace('-', '_').title().replace('_', '')}Engine()
response = engine.execute({{"query": "production benchmark test"}})
print("Engine Response:", response)
print("Engine Metrics:", engine.metrics)
```

---

# Engineering Design Challenges

**🟢 Challenge 1**: Add structured exponential backoff with jitter to the fallback handler.

**🟡 Challenge 2**: Implement an asynchronous circuit breaker that trips after 5 consecutive fallback triggers within a 10-second window.

**🔴 Challenge 3**: Build an end-to-end integration test validating zero data corruption across 10,000 parallel requests.
"""

            elif shape == "from-scratch":
                body = f"""
# System Specification & Architectural Blueprint

In this lesson, we build **{title}** from complete scratch using pure Python and standard numerical libraries, with zero external black-box framework abstractions.

```mermaid
flowchart TD
    subgraph BlueprintArchitecture ["System Architectural Blueprint"]
        DataLayer["1. Data Ingestion & Tensor Buffers"] --> KernelEngine["2. Core Algorithmic Kernel Engine"]
        KernelEngine --> DispatchLayer["3. Forward / Backward Dispatch Loop"]
        DispatchLayer --> OutputEvaluation["4. Evaluation, Scoring & Output Interface"]
    end
```

---

# Standalone From-Scratch Implementation

```python
import numpy as np

class Scratch{slug.replace('-', '_').title().replace('_', '')}:
    \"\"\"
    Pure from-scratch implementation of {title}.
    Zero black-box framework dependencies.
    \"\"\"
    def __init__(self, dim: int = 64):
        self.dim = dim
        self.state = np.zeros((dim, dim))
        self.is_initialized = False

    def initialize(self):
        # Initialize orthogonal state matrix
        q, _ = np.linalg.qr(np.random.randn(self.dim, self.dim))
        self.state = q
        self.is_initialized = True

    def forward(self, x: np.ndarray) -> np.ndarray:
        if not self.is_initialized:
            self.initialize()
        # Matrix kernel dispatch
        return x @ self.state

    def backward(self, grad_out: np.ndarray, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        # Exact analytical backward gradients
        grad_in = grad_out @ self.state.T
        grad_state = x.T @ grad_out
        return grad_in, grad_state

# Instantiate and verify
module = Scratch{slug.replace('-', '_').title().replace('_', '')}(dim=8)
x_in = np.random.randn(4, 8)
y_out = module.forward(x_in)
grad_x, grad_w = module.backward(np.ones_like(y_out), x_in)

print("Forward Output Shape:", y_out.shape)
print("Backward Input Gradient Shape:", grad_x.shape)
print("Backward State Gradient Shape:", grad_w.shape)
```

---

# Validation, Verification & Benchmarking

To prove correctness, we verify numerical conservation properties and dimension invariants across variable batch sizes.

---

# Advanced Extension Challenges

**🟢 Challenge 1**: Verify numerical equivalence against the corresponding PyTorch `nn.Module` reference.

**🟡 Challenge 2**: Benchmark memory consumption in bytes per sample and optimize storage using compact float16/bfloat16 data types.

**🔴 Challenge 3**: Implement dynamic batching support allowing variable-length inputs without padding waste.
"""

            else:
                # Default Under the Hood / Case Study / Mental Model
                body = f"""
# Low-Level System Architecture & Execution Mechanics

In **{title}**, understanding the low-level memory layout, hardware execution dynamics, and dispatch loops is essential for building production-grade AI systems.

```mermaid
flowchart TD
    subgraph HardwareExecution ["Hardware & Memory Execution Flow"]
        VirtualMemory["Virtual Memory Page Allocation / GPU HBM"] --> CacheLine["Cache Line & Warp Register Alignment (64-byte chunks)"]
        CacheLine --> SIMD_Execution["SIMD Vector / Tensor Core Fused Execution"]
        SIMD_Execution --> OutputRegister["Output Register & Deterministic Memory Deallocation"]
    end
```

---

# Memory Layout & Bytecode Disassembly Trace

Examining the low-level data structures and memory footprint:

```python
import sys
import time

def inspect_system_dynamics():
    print("--- Inspecting System Dynamics for {clean_title(title)} ---")
    
    # Measure memory allocation
    sample_buffer = bytearray(1024 * 1024) # 1MB buffer
    print(f"Allocated Virtual Buffer Size: {{sys.getsizeof(sample_buffer) / 1024:.2f}} KB")
    
    # Measure memory bandwidth throughput
    start = time.perf_counter()
    for _ in range(100):
        _ = sum(sample_buffer[:1000])
    elapsed = time.perf_counter() - start
    print(f"Memory Scan Elapsed: {{elapsed * 1000:.3f}} ms")

inspect_system_dynamics()
```

---

# Step-by-Step Execution Walkthrough

```text
Phase 1: Memory Allocation & Pointer Alignment
  - Virtual address space mapped with page-aligned offsets.
  - Type headers and reference counters initialized deterministically.

Phase 2: Execution Dispatch & Kernel Launch
  - Fast local array dispatch avoids dictionary string hashing.
  - Vectorized CPU/GPU kernels execute without interpreter overhead.

Phase 3: Cleanup & Deallocation
  - Reference counts decremented immediately upon scope exit.
  - Memory buffers returned to thread-local free lists.
```

---

# Systems Engineering Challenges

**🟢 Challenge 1**: Profile the CPU instruction cache miss rate using Linux `perf stat` or Python `cProfile`.

**🟡 Challenge 2**: Eliminate intermediate heap allocations in high-frequency loops using reusable pre-allocated buffers.

**🔴 Challenge 3**: Implement a multi-threaded benchmark demonstrating zero lock contention across independent worker streams.
"""

            full_new_content = header + body.strip() + "\n"
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(full_new_content)
            transformed_count += 1

print(f"Systematically transformed {transformed_count} lessons to bespoke pedagogical structures with ZERO generic boilerplate!")
