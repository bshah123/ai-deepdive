import os

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

# Lesson 53.1: Latency & Throughput
write_file(r"content/part-09-production-llmops/chapter-53-latency-throughput/53.1-latency-metrics.md", r"""---
id: "53.1"
part: 9
chapter: 53
title: "Production LLM Latency & Serving Metrics: TTFT, ITL & The Roofline Model"
slug: "latency-metrics"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["29.1"]
tags: ["latency", "ttft", "itl", "roofline", "vllm", "benchmarking"]
contentShape: "case-study"
openingType: "visual"
status: "published"
---

# Deconstructing the Latency of an LLM Request

In standard HTTP services, latency is measured simply as round-trip time. In streaming LLM applications, user experience is governed by **two distinct latency regimes**:

```mermaid
flowchart LR
    subgraph Phase1 ["Phase 1: Prefill Stage (Compute-Bound)"]
        UserSend["User sends 1,000 token prompt"] --> GPU_GEMM["GPU Compute: Matrix-Matrix Multiply across all prompt tokens in parallel"]
        GPU_GEMM --> FirstToken["First Token Generated!"]
    end

    subgraph Phase2 ["Phase 2: Autoregressive Decode Stage (Memory-Bandwidth Bound)"]
        FirstToken --> Token1["Emit Token 2 (Memory bound: read entire KV-cache from HBM)"]
        Token1 --> Token2["Emit Token 3"]
        Token2 --> TokenN["Emit Token N... Stream complete!"]
    end
```

---

# The 4 Vital LLM Serving Metrics

| Metric | Definition | Target SLA | Primary Hardware Bottleneck |
|---|---|---|---|
| **TTFT (Time to First Token)** | Time elapsed from HTTP request arrival until the very first stream chunk arrives at the client. | $< 300\text{ ms}$ | **GPU Compute FLOPS** (Tensor Cores during prompt prefill) |
| **ITL (Inter-Token Latency) / TPOT** | Time between consecutive tokens during streaming generation. | $< 30\text{ ms}$ ($> 35\text{ tok/sec}$) | **GPU HBM Memory Bandwidth** (KV-cache read speed) |
| **Throughput (Tokens/Sec)** | Total output tokens generated per second across all concurrent client streams. | $> 1,500\text{ tok/sec}$ per H100 | Continuous batching scheduler efficiency |
| **P99 Tail Latency** | Worst 1% request latency under peak burst load. | $< 1.5\text{x}$ P50 | Queue contention & prefill preemption |

---

# The Roofline Arithmetic Intensity Model

```mermaid
flowchart TD
    Prefill["Prefill Phase Arithmetic Intensity:<br>I = (2 * P * S) / (2 * P + 2 * L * d * S) -> High (Compute Bound!)"]
    Decode["Decode Phase Arithmetic Intensity:<br>I = (2 * P * 1) / (2 * P + 2 * L * d * S) -> LOW ~1 FLOP/Byte (Memory-Bandwidth Bound!)"]
```

During autoregressive token decoding (batch size $B=1$), the GPU must read all weights ($P$ parameters) and all historical KV-cache from High Bandwidth Memory (HBM) into SRAM **just to generate a single token**!

$$\text{Max Single-Stream Decode Speed} = \frac{\text{GPU Memory Bandwidth (Bytes/sec)}}{\text{Model Size (Bytes)}} = \frac{3.35 \text{ TB/s (H100)}}{16 \text{ GB (8B FP16)}} \approx 209 \text{ tokens/sec}$$

---

# Python Streaming Latency Benchmarking Client

```python
import time
import statistics

class LatencyTracker:
    def __init__(self):
        self.start_time = None
        self.first_token_time = None
        self.token_timestamps = []

    def start_request(self):
        self.start_time = time.perf_counter()

    def record_chunk(self):
        now = time.perf_counter()
        if self.first_token_time is None:
            self.first_token_time = now
        self.token_timestamps.append(now)

    def report(self):
        ttft = (self.first_token_time - self.start_time) * 1000
        itls = [
            (self.token_timestamps[i] - self.token_timestamps[i-1]) * 1000 
            for i in range(1, len(self.token_timestamps))
        ]
        avg_itl = statistics.mean(itls) if itls else 0
        total_time = self.token_timestamps[-1] - self.start_time
        tok_per_sec = len(self.token_timestamps) / total_time

        print(f"--- Latency Benchmark Report ---")
        print(f"Time to First Token (TTFT): {ttft:.1f} ms")
        print(f"Inter-Token Latency (ITL):  {avg_itl:.1f} ms ({1000/avg_itl:.1f} tok/s)")
        print(f"Total Stream Throughput:    {tok_per_sec:.1f} tok/s")

# Test tracker
tracker = LatencyTracker()
tracker.start_request()
time.sleep(0.18) # 180ms TTFT
tracker.record_chunk()
for _ in range(20):
    time.sleep(0.025) # 25ms per token (40 tok/s)
    tracker.record_chunk()
tracker.report()
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Calculate the minimum GPU memory bandwidth required to stream 80 tokens/sec for a 70B parameter INT4 model ($35\text{ GB}$).

**🟡 Challenge 2**: Explain why Chunked Prefill (Sarathi-Serve) interleaves long prompt prefill chunks with active decode steps to prevent TTFT spikes on concurrent requests.

**🔴 Challenge 3**: Implement an asynchronous load-testing engine in Python using `asyncio` and `httpx` that fires 50 concurrent streaming requests and calculates P50, P95, and P99 latency percentiles.
""")

# ==============================================================================
# PART 10: EVALUATION & RESEARCH FRONTIERS
# ==============================================================================

# Lesson 59.1: Reasoning Models & Test-Time Compute
write_file(r"content/part-10-evaluation-frontiers/chapter-59-reasoning-models/59.1-reasoning-paradigms.md", r"""---
id: "59.1"
part: 10
chapter: 59
title: "Reasoning Models: System 1 vs System 2 & Test-Time Compute Scaling"
slug: "reasoning-paradigms"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["28.3", "48.1"]
tags: ["reasoning", "o1", "test-time-compute", "system2", "prm", "mcts"]
contentShape: "case-study"
openingType: "visual"
status: "published"
---

# The Paradigm Shift: Test-Time Compute Scaling

Traditional LLM scaling laws (Kaplan et al., Chinchilla) focus exclusively on **Pre-training Scaling** (increasing parameter count $N$ and pretraining tokens $D$).

Modern frontier reasoning models (OpenAI o1, DeepSeek-R1) introduce a third orthogonal scaling axis: **Test-Time Compute Scaling**:

```mermaid
flowchart LR
    subgraph PretrainingScaling ["Classical Scaling: Fixed Compute per Token"]
        BaseLLM["Standard LLM: Emits token directly in ~30ms (System 1 Fast Intuitive Thinking)"]
    end

    subgraph TestTimeScaling ["Modern Reasoning: Variable Compute per Problem"]
        ReasonLLM["Reasoning Model: Explores multiple chain-of-thought branches, backtracks, verifies intermediate steps before answering (System 2 Deliberate Thinking)"]
    end
```

---

# System 1 vs System 2 Cognitive Architectures

| Dimension | System 1 (Standard LLM: GPT-4o, LLaMA-3) | System 2 (Reasoning LLM: OpenAI o1, DeepSeek-R1) |
|---|---|---|
| **Cognitive Mode** | Fast, associative, pattern matching | Slow, deliberate, self-correcting logic |
| **Output Mechanism** | Next-token prediction directly to user | Long hidden `<thought>` scratchpad reasoning tokens generated first |
| **Error Handling** | Hallucinations propagate irreversibly | Actively detects logical inconsistencies, backtracks, and re-evaluates |
| **Scaling Law** | Accuracy plateaus for fixed model size | **Accuracy scales monotonically with the number of test-time thought tokens!** |

---

# Verification: Process Reward Models (PRMs) vs Outcome Reward Models (ORMs)

To guide search trees during multi-step reasoning, models use **Process Reward Models (PRMs)** (Lightman et al., 2023):

```mermaid
flowchart TD
    Problem["Math Problem: Solve 3x + 5 = 20"] --> Step1["Step 1: Subtract 5 from both sides -> 3x = 15"]
    Step1 --> PRM1["PRM Score: +1.0 (Correct step!)"]
    
    Step1 --> Step2A["Step 2A: Divide by 3 -> x = 5"]
    PRM1 --> Step2A
    Step2A --> PRM2A["PRM Score: +1.0 (Correct step!) -> Accept Final Answer: 5"]

    Step1 --> Step2B["Step 2B: Divide by 2 -> x = 7.5"]
    PRM1 --> Step2B
    Step2B --> PRM2B["PRM Score: -1.0 (ERROR!) -> Prune and Backtrack!"]
```

---

# Monte Carlo Tree Search (MCTS) for Step-Level Reasoning

```python
import math

class ThoughtNode:
    def __init__(self, step_text: str, parent=None):
        self.step_text = step_text
        self.parent = parent
        self.children = []
        self.visits = 0
        self.value = 0.0

    def ucb1_score(self, total_parent_visits: int, exploration_c: float = 1.414) -> float:
        if self.visits == 0:
            return float('inf')
        # UCB1 exploration formula
        exploitation = self.value / self.visits
        exploration = exploration_c * math.sqrt(math.log(total_parent_visits) / self.visits)
        return exploitation + exploration

root = ThoughtNode("Start Problem: Prove sqrt(2) is irrational")
child1 = ThoughtNode("Assume sqrt(2) = a/b in lowest terms", parent=root)
child1.visits = 10
child1.value = 8.5 # 85% success rate
root.children.append(child1)

print(f"Child 1 UCB1 Priority Score: {child1.ucb1_score(total_parent_visits=20):.4f}")
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Explain why standard autoregressive transformers cannot easily "backtrack" within a single linear decoding stream without generating explicit natural language thought tokens.

**🟡 Challenge 2**: Contrast Best-of-N sampling vs Beam Search vs Monte Carlo Tree Search (MCTS) for test-time verification.

**🔴 Challenge 3**: Implement a pure Python Step-Level Verifier that takes a 4-step mathematical proof, queries a PRM simulator at each step, and backtracks to generate an alternative branch if the score drops below $+0.5$.
""")

# Lesson 60.1: Vision Transformers & Multimodal Frontier
write_file(r"content/part-10-evaluation-frontiers/chapter-60-multimodal-frontier/60.1-multimodal-architectures.md", r"""---
id: "60.1"
part: 10
chapter: 60
title: "Multimodal Frontier: Vision Transformers (ViT), CLIP & LLaVA MLP Projectors"
slug: "multimodal-architectures"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["26.1", "34.1"]
tags: ["multimodal", "vit", "clip", "llava", "vision-language", "anyres"]
contentShape: "visual-spatial"
openingType: "visual"
status: "published"
---

# The Architecture of Modern Vision-Language Models (VLMs)

How do Large Language Models process images without training a multimodal network entirely from scratch?

Modern Visual-Language Models (LLaVA, Qwen2-VL, Pixtral) connect a **Frozen Vision Encoder** to a **Pre-trained LLM Backbone** through a **Learned Projection Adapter**:

```mermaid
flowchart TD
    subgraph VisionPipeline ["1. Vision Encoding Pipeline"]
        RawImg["High-Res Input Image (e.g. 336x336 pixels)"] --> Patchify["Slice into 14x14 pixel patches (576 image patches)"]
        Patchify --> ViT["Vision Transformer (CLIP ViT-L/14 or SigLIP)<br>Outputs 576 patch embeddings [576, 1024]"]
    end

    subgraph CrossModalAlignment ["2. Cross-Modal Projector / Adapter"]
        ViT --> MLP_Projector["Two-Layer GELU MLP Projector<br>Projects 1024-dim visual vectors -> 4096-dim LLM text embedding space!"]
    end

    subgraph LLMBackbone ["3. LLM Autoregressive Decoder"]
        PromptTokens["Text Prompt Tokens: 'Describe this image in detail:'"] --> TextEmbed["Text Embedding Layer [L_text, 4096]"]
        MLP_Projector --> VisualTokens["Visual Tokens [576, 4096]"]
        
        VisualTokens --> InterleavedSequence["Combined Sequence: [Visual Tokens ... Text Tokens]"]
        TextEmbed --> InterleavedSequence
        InterleavedSequence --> DecoderLLM["Decoder LLM (LLaMA-3-8B / Vicuna)<br>Generates text response grounded on visual tokens!"]
    end
```

---

# CLIP Contrastive Pre-Training

**CLIP (Contrastive Language-Image Pre-training)** (Radford et al., OpenAI 2021) aligns image and text representations by maximizing the cosine similarity of $N$ correct (image, text) pairs while minimizing $N^2 - N$ incorrect pairs:

$$\mathcal{L}_{\text{CLIP}} = -\frac{1}{2N} \sum_{i=1}^N \left( \log \frac{\exp(\langle I_i, T_i \rangle / \tau)}{\sum_j \exp(\langle I_i, T_j \rangle / \tau)} + \log \frac{\exp(\langle T_i, I_i \rangle / \tau)}{\sum_j \exp(\langle T_i, I_j \rangle / \tau)} \right)$$

```mermaid
flowchart LR
    Images["Batch of N Images"] --> VisionEnc["Vision Encoder -> I_1, I_2, ..., I_N"]
    Texts["Batch of N Text Captions"] --> TextEnc["Text Encoder -> T_1, T_2, ..., T_N"]
    VisionEnc --> CosMatrix["NxN Cosine Similarity Matrix"]
    TextEnc --> CosMatrix
    CosMatrix --> Diagonal["Maximize Diagonal Entries (Ground Truth Match)!"]
```

---

# LLaVA 2-Layer MLP Projector Implementation

```python
import torch
import torch.nn as nn

class LLaVAMLPProjector(nn.Module):
    def __init__(self, vision_dim: int = 1024, text_dim: int = 4096):
        super().__init__()
        # Two-layer MLP with GELU activation
        self.linear_1 = nn.Linear(vision_dim, text_dim, bias=True)
        self.act = nn.GELU()
        self.linear_2 = nn.Linear(text_dim, text_dim, bias=True)

    def forward(self, image_features: torch.Tensor) -> torch.Tensor:
        # image_features: [Batch, NumPatches (576), VisionDim (1024)]
        x = self.act(self.linear_1(image_features))
        return self.linear_2(x) # Output: [Batch, 576, TextDim (4096)]

# Verify cross-modal dimensions
projector = LLaVAMLPProjector(vision_dim=1024, text_dim=4096)
img_feats = torch.randn(2, 576, 1024)
visual_tokens = projector(img_feats)
print("Projected Visual Token Tensor Shape:", visual_tokens.shape)
```

---

# AnyRes (Any-Resolution) Dynamic Image Tiling

When processing high-resolution images (e.g. $1000 \times 1000$), resizing to $336 \times 336$ blurs fine text and small objects.

**AnyRes (Dynamic High-Res Tiling)**:
1. Divide the high-res image into a grid of $336 \times 336$ sub-tiles (e.g. $2 \times 2 = 4$ local tiles).
2. Create a 5th downsampled thumbnail of the entire global image.
3. Pass all 5 tiles through the ViT encoder independently.
4. Concat all patch tokens ($5 \times 576 = 2,880$ visual tokens) into the LLM context.

---

# Exercises & Challenges

**🟢 Challenge 1**: Calculate the sequence length overhead added to the LLM context when feeding a high-res image processed via 4 AnyRes local tiles + 1 global overview tile ($14 \times 14$ patches per tile).

**🟡 Challenge 2**: Explain why Cross-Attention Vision Encoders (Flamingo style) require fewer context tokens than prefix concatenation (LLaVA style).

**🔴 Challenge 3**: Implement a pure PyTorch CLIP zero-shot image classifier that takes an image vector, computes dot products against 10 candidate class text prompt vectors (`"a photo of a {label}"`), and computes softmax class probabilities.
""")

print("Parts 9 and 10 re-authored with supreme depth, rich visualizations, and zero boilerplate!")
