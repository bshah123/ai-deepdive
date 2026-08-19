import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
curriculum_path = os.path.join(base_dir, "data/curriculum.json")

with open(curriculum_path, "r", encoding="utf-8") as f:
    curriculum = json.load(f)

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# 1. DEFINE THE 10 NEW CUTTING-EDGE LESSONS
# ==============================================================================

new_lessons_meta = [
    {
        "partId": "part-04",
        "chapterId": "chapter-25",
        "lesson": {
            "id": "25.5",
            "partId": "part-04",
            "chapterId": "chapter-25",
            "title": "Multi-Head Latent Attention (MLA) & DeepSeek Architecture",
            "slug": "multi-head-latent-attention-mla",
            "file": "25.5-multi-head-latent-attention-mla.md",
            "difficulty": "advanced",
            "estimatedMinutes": 40,
            "prerequisites": ["25.2", "24.1"],
            "tags": ["mla", "deepseek", "kv-cache", "low-rank-compression", "transformers"],
            "status": "published",
            "contentShape": "mathematical-derivation",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-04",
        "chapterId": "chapter-26",
        "lesson": {
            "id": "26.4",
            "partId": "part-04",
            "chapterId": "chapter-26",
            "title": "Mixture of Experts (MoE), Top-2 Gating & Expert Parallelism",
            "slug": "mixture-of-experts-moe",
            "file": "26.4-mixture-of-experts-moe.md",
            "difficulty": "advanced",
            "estimatedMinutes": 40,
            "prerequisites": ["26.3"],
            "tags": ["moe", "deepseek-moe", "mixtral", "routing", "load-balancing"],
            "status": "published",
            "contentShape": "under-the-hood",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-04",
        "chapterId": "chapter-28",
        "lesson": {
            "id": "28.4",
            "partId": "part-04",
            "chapterId": "chapter-28",
            "title": "Group Relative Policy Optimization (GRPO) & Pure RL for Reasoning",
            "slug": "grpo-deepseek-r1",
            "file": "28.4-grpo-deepseek-r1.md",
            "difficulty": "advanced",
            "estimatedMinutes": 45,
            "prerequisites": ["28.3"],
            "tags": ["grpo", "deepseek-r1", "reinforcement-learning", "reasoning", "alignment"],
            "status": "published",
            "contentShape": "mathematical-derivation",
            "openingType": "mathematical-intuition"
        }
    },
    {
        "partId": "part-06",
        "chapterId": "chapter-38",
        "lesson": {
            "id": "38.3",
            "partId": "part-06",
            "chapterId": "chapter-38",
            "title": "Late Chunking: Context-Preserving Embeddings for Long Documents",
            "slug": "late-chunking",
            "file": "38.3-late-chunking.md",
            "difficulty": "intermediate",
            "estimatedMinutes": 30,
            "prerequisites": ["38.1", "34.1"],
            "tags": ["late-chunking", "jina-ai", "embeddings", "rag", "retrieval"],
            "status": "published",
            "contentShape": "compare-choose",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-06",
        "chapterId": "chapter-40",
        "lesson": {
            "id": "40.3",
            "partId": "part-06",
            "chapterId": "chapter-40",
            "title": "Speculative RAG: Parallel Multi-Draft Generation & Verification",
            "slug": "speculative-rag",
            "file": "40.3-speculative-rag.md",
            "difficulty": "advanced",
            "estimatedMinutes": 35,
            "prerequisites": ["40.1", "29.3"],
            "tags": ["speculative-rag", "draft-models", "latency-optimization", "verification"],
            "status": "published",
            "contentShape": "case-study",
            "openingType": "problem"
        }
    },
    {
        "partId": "part-08",
        "chapterId": "chapter-49",
        "lesson": {
            "id": "49.3",
            "partId": "part-08",
            "chapterId": "chapter-49",
            "title": "Dynamic Entity Memory Graphs & Temporal Extraction (Mem0 / Zep)",
            "slug": "mem0-graph-memory",
            "file": "49.3-mem0-graph-memory.md",
            "difficulty": "advanced",
            "estimatedMinutes": 35,
            "prerequisites": ["49.1", "42.1"],
            "tags": ["mem0", "agent-memory", "knowledge-graphs", "temporal-memory"],
            "status": "published",
            "contentShape": "problem-solution",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-08",
        "chapterId": "chapter-51",
        "lesson": {
            "id": "51.3",
            "partId": "part-08",
            "chapterId": "chapter-51",
            "title": "Human-in-the-Loop, Time-Travel Debugging & State Rollbacks",
            "slug": "human-in-the-loop-langgraph",
            "file": "51.3-human-in-the-loop-langgraph.md",
            "difficulty": "intermediate",
            "estimatedMinutes": 35,
            "prerequisites": ["51.1"],
            "tags": ["langgraph", "human-in-the-loop", "time-travel", "state-checkpoints"],
            "status": "published",
            "contentShape": "code-transformation",
            "openingType": "code"
        }
    },
    {
        "partId": "part-09",
        "chapterId": "chapter-54",
        "lesson": {
            "id": "54.3",
            "partId": "part-09",
            "chapterId": "chapter-54",
            "title": "RadixAttention & Structured JSON Decoding in SGLang",
            "slug": "radix-attention-sglang",
            "file": "54.3-radix-attention-sglang.md",
            "difficulty": "advanced",
            "estimatedMinutes": 40,
            "prerequisites": ["54.1", "29.2"],
            "tags": ["sglang", "radix-attention", "prefix-caching", "structured-decoding"],
            "status": "published",
            "contentShape": "under-the-hood",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-10",
        "chapterId": "chapter-59",
        "lesson": {
            "id": "59.3",
            "partId": "part-10",
            "chapterId": "chapter-59",
            "title": "Search-Tree Reasoning: A*, Beam Search & MCTS with Value Guidance",
            "slug": "search-trees-mcts-reasoning",
            "file": "59.3-search-trees-mcts-reasoning.md",
            "difficulty": "advanced",
            "estimatedMinutes": 45,
            "prerequisites": ["59.1"],
            "tags": ["mcts", "tree-of-thought", "search-trees", "reasoning", "value-models"],
            "status": "published",
            "contentShape": "mathematical-derivation",
            "openingType": "visual"
        }
    },
    {
        "partId": "part-10",
        "chapterId": "chapter-60",
        "lesson": {
            "id": "60.4",
            "partId": "part-10",
            "chapterId": "chapter-60",
            "title": "Diffusion Transformers (DiT) & Latent Generative Video (Sora)",
            "slug": "diffusion-transformers-dit",
            "file": "60.4-diffusion-transformers-dit.md",
            "difficulty": "advanced",
            "estimatedMinutes": 45,
            "prerequisites": ["60.1", "26.1"],
            "tags": ["dit", "diffusion-transformers", "sora", "generative-video", "adaln-zero"],
            "status": "published",
            "contentShape": "visual-spatial",
            "openingType": "visual"
        }
    }
]

# Insert lessons into curriculum.json if not already present
for item in new_lessons_meta:
    pid = item["partId"]
    cid = item["chapterId"]
    new_l = item["lesson"]
    
    for part in curriculum["parts"]:
        if part["id"] == pid:
            for chapter in part["chapters"]:
                if chapter["id"] == cid:
                    existing_ids = [l["id"] for l in chapter["lessons"]]
                    if new_l["id"] not in existing_ids:
                        chapter["lessons"].append(new_l)
                        print(f"Added Lesson {new_l['id']} ({new_l['title']}) to Chapter {cid}!")

with open(curriculum_path, "w", encoding="utf-8") as f:
    json.dump(curriculum, f, indent=2)

# ==============================================================================
# 2. WRITE DEEP CONTENT FOR EACH NEW LESSON
# ==============================================================================

# Lesson 25.5: Multi-Head Latent Attention (MLA)
write_file(r"content/part-04-transformers-llms/chapter-25-attention/25.5-multi-head-latent-attention-mla.md", r"""---
id: "25.5"
part: 4
chapter: 25
title: "Multi-Head Latent Attention (MLA) & DeepSeek Architecture"
slug: "multi-head-latent-attention-mla"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["25.2", "24.1"]
tags: ["mla", "deepseek", "kv-cache", "low-rank-compression", "transformers"]
contentShape: "mathematical-derivation"
openingType: "visual"
status: "published"
---

# The KV-Cache Memory Crisis & The MLA Revolution

In standard Multi-Head Attention (MHA) and Grouped-Query Attention (GQA), the Key-Value (KV) cache grows linearly with context length and batch size. For a 128k context window on LLaMA-3-70B, the KV cache alone consumes **over 32 GB of VRAM per request**, severely constraining serving concurrency.

**Multi-Head Latent Attention (MLA)** (DeepSeek-V2 / V3, 2024) introduces **Low-Rank Key-Value Joint Compression**, compressing KV representations into a tiny latent vector $c_t^{KV}$ of dimension $d_c = 512$:

```mermaid
flowchart TD
    subgraph StandardGQA ["1. Standard MHA / GQA (Heavy KV Cache per Token: 8KB)"]
        Hidden1["Hidden State h_t [d_model = 4096]"] --> Keys1["Cache Key Heads: K_t [H_kv x d_h]"]
        Hidden1 --> Vals1["Cache Value Heads: V_t [H_kv x d_h]"]
    end

    subgraph DeepSeekMLA ["2. DeepSeek MLA (Compressed Latent Vector: 512B -> 93% VRAM Reduction!)"]
        Hidden2["Hidden State h_t [d_model = 4096]"] --> KV_Down["W_{DKV} Down-Projection [4096 -> 512]"]
        KV_Down --> LatentKV["Cache ONLY Latent Vector: c_t^{KV} [512-dim] + Decoupled RoPE Key k_t^{R} [64-dim]"]
        
        LatentKV -.->|During Attention: Reconstruct via W_{UK} and W_{UV}| UncompressedAttention["Dynamic Matrix Multiply with Query Matrix!"]
    end
```

---

# The Mathematical Formulation of MLA

### 1. KV Low-Rank Compression & RoPE Decoupling
To allow RoPE positional encoding while keeping the latent cache position-agnostic, MLA decouples positional keys:

$$c_t^{KV} = h_t W_{DKV} \quad (W_{DKV} \in \mathbb{R}^{d \times d_c})$$
$$k_t^R = \text{RoPE}(h_t W_{KR}) \quad (W_{KR} \in \mathbb{R}^{d \times d_R})$$

During inference, **only $[c_t^{KV}, k_t^R]$ is stored in GPU VRAM** ($512 + 64 = 576$ elements per token, compared to $8,192$ elements in standard MHA!).

### 2. Query Projection & Attention Computation
Queries are projected into uncompressed content queries and positional RoPE queries:

$$q_{t, i}^C = (h_t W_{DQ}) W_{UQ, i}$$
$$q_{t, i}^R = \text{RoPE}(h_t W_{QR, i})$$

The attention score between query $t$ and key $s$ is computed cleanly:

$$\text{AttnScore}_{t, s, i} = \frac{(q_{t, i}^C)^T (c_s^{KV} W_{UK, i}) + (q_{t, i}^R)^T k_s^R}{\sqrt{d_h + d_R}}$$

$$\text{Output}_{t, i} = \sum_{s=1}^t \text{Softmax}_s(\text{AttnScore}_{t, s, i}) \cdot (c_s^{KV} W_{UV, i})$$

---

# Mathematical Equivalence: The Matrix Absorption Trick

During generation, we do not need to expand $c_s^{KV}$ back into $K_s$ and $V_s$ on every token. 

Because matrix multiplication is associative, we can **absorb $W_{UK}$ into the Query Projection**:

$$q_{t, i}^C (c_s^{KV} W_{UK, i})^T = \left( q_{t, i}^C W_{UK, i}^T \right) c_s^{KV}$$

This means the attention kernel computes dot products **directly between transformed queries and the 512-dimensional compressed KV cache**, achieving the full expressive capacity of Multi-Head Attention with the memory footprint of a tiny single head!

---

# Python PyTorch Implementation of DeepSeek MLA

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class DeepSeekMLA(nn.Module):
    def __init__(
        self,
        d_model: int = 4096,
        num_heads: int = 32,
        head_dim: int = 128,
        kv_lora_rank: int = 512,
        qk_rope_head_dim: int = 64
    ):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = head_dim
        self.d_c = kv_lora_rank
        self.d_r = qk_rope_head_dim

        # KV Compression
        self.w_dkv = nn.Linear(d_model, self.d_c, bias=False)
        self.w_uk = nn.Linear(self.d_c, num_heads * head_dim, bias=False)
        self.w_uv = nn.Linear(self.d_c, num_heads * head_dim, bias=False)
        self.w_kr = nn.Linear(d_model, self.d_r, bias=False)

        # Output projection
        self.w_o = nn.Linear(num_heads * head_dim, d_model, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, S, _ = x.shape
        # Compress KV
        c_kv = self.w_dkv(x) # [B, S, 512] -> Cached during decode!
        k_r = self.w_kr(x)   # [B, S, 64]  -> Cached during decode!

        # Decompress KV for attention
        k_c = self.w_uk(c_kv).view(B, S, self.num_heads, self.head_dim)
        v = self.w_uv(c_kv).view(B, S, self.num_heads, self.head_dim)

        print(f"MLA Compressed KV Cache Footprint per Token: {c_kv.shape[-1] + k_r.shape[-1]} floats")
        return x

mla = DeepSeekMLA()
out = mla(torch.randn(2, 16, 4096))
```

---

# KV-Cache Footprint Comparison

| Architecture | Elements Cached per Token | VRAM per Token (FP16) | 128k Context Memory (Batch=1) |
|---|---|---|---|
| **Multi-Head Attention (MHA)** | $2 \times 32 \times 128 = 8,192$ | $16.38\text{ KB}$ | **$2.1\text{ GB}$ per layer ($67\text{ GB}$ total)** |
| **Grouped-Query (GQA-8)** | $2 \times 8 \times 128 = 2,048$ | $4.10\text{ KB}$ | **$0.5\text{ GB}$ per layer ($16\text{ GB}$ total)** |
| **DeepSeek MLA** | **$512 + 64 = 576$** | **$1.15\text{ KB}$** | **$0.14\text{ GB}$ per layer ($4.6\text{ GB}$ total -> 93% Savings!)** |

---

# Exercises & Challenges

**🟢 Challenge 1**: Calculate the exact KV-cache memory saving factor of DeepSeek-V3 ($d_c = 512, d_R = 64$) over LLaMA-3-70B MHA ($64 \times 128$).

**🟡 Challenge 2**: Prove mathematically why absorbing $W_{UK}$ into $q_t$ eliminates the need to decompress $c_s^{KV}$ during autoregressive generation.

**🔴 Challenge 3**: Implement a Triton kernel that fuses the MLA compressed dot product $(q W_{UK}^T) c^{KV}$ into a single SRAM block operation.
""")

# Lesson 28.4: Group Relative Policy Optimization (GRPO)
write_file(r"content/part-04-transformers-llms/chapter-28-training-llms/28.4-grpo-deepseek-r1.md", r"""---
id: "28.4"
part: 4
chapter: 28
title: "Group Relative Policy Optimization (GRPO) & Pure RL for Reasoning"
slug: "grpo-deepseek-r1"
difficulty: "advanced"
estimated_minutes: 45
prerequisites: ["28.3"]
tags: ["grpo", "deepseek-r1", "reinforcement-learning", "reasoning", "alignment"]
contentShape: "mathematical-derivation"
openingType: "mathematical-intuition"
status: "published"
---

# The Discovery of Pure Reinforcement Learning Reasoning

Traditional RLHF requires training a separate **Critic / Value Model** of the same size as the Actor model to compute the baseline $V(s)$ for Generalized Advantage Estimation (GAE).

**Group Relative Policy Optimization (GRPO)** (Shao et al., DeepSeek-Math / DeepSeek-R1 2024–2025) **completely eliminates the Critic model**.

Instead of estimating value functions, GRPO samples a **group of $G$ candidate outputs** $\{o_1, o_2, \dots, o_G\}$ for each question $q$ and computes advantages by **normalizing rewards relative to the group's empirical distribution**:

```mermaid
flowchart TD
    Prompt["Math / Coding Prompt q"] --> SampleGroup["Policy pi_theta generates G candidate completions: {o_1, o_2, ..., o_G}"]
    SampleGroup --> RuleRewards["Deterministic Verifier / Reward Function scores each completion: {r_1, r_2, ..., r_G}"]
    RuleRewards --> GroupNorm["Group Normalization:<br>Mean = 1/G * sum(r_i),  Std = sqrt(1/G * sum(r_i - Mean)^2)<br>Advantage A_i = (r_i - Mean) / (Std + eps)"]
    GroupNorm --> Backprop["GRPO Clipped Objective Update to pi_theta (Zero Critic Model Needed!)"]
```

---

# The GRPO Mathematical Objective Function

For each question $q$ and group of outputs $\{o_1, \dots, o_G\}$, the GRPO objective maximizes:

$$\mathcal{J}_{\text{GRPO}}(\theta) = \mathbb{E}_{q \sim P(Q), \{o_i\}_{i=1}^G \sim \pi_{\theta_{\text{old}}}(O \mid q)} \left[ \frac{1}{G} \sum_{i=1}^G \left( \min\left( \frac{\pi_\theta(o_i \mid q)}{\pi_{\theta_{\text{old}}}(o_i \mid q)} A_i, \ \text{clip}\left(\frac{\pi_\theta(o_i \mid q)}{\pi_{\theta_{\text{old}}}(o_i \mid q)}, 1-\epsilon, 1+\epsilon\right) A_i \right) - \beta \, \mathbb{D}_{\text{KL}}\left(\pi_\theta \,\|\, \pi_{\text{ref}}\right) \right) \right]$$

Where the group advantage is computed analytically:

$$A_i = \frac{r_i - \text{mean}(\{r_1, \dots, r_G\})}{\text{std}(\{r_1, \dots, r_G\}) + \epsilon}$$

### The Closed-Form KL Penalty
To stabilize training without an external reward model drift, the KL divergence is approximated directly via token log-probabilities:

$$\mathbb{D}_{\text{KL}}\left(\pi_\theta \,\|\, \pi_{\text{ref}}\right) = \frac{\pi_{\text{ref}}(o_{i, t} \mid q, o_{i, <t})}{\pi_\theta(o_{i, t} \mid q, o_{i, <t})} - \log \frac{\pi_{\text{ref}}(o_{i, t} \mid q, o_{i, <t})}{\pi_\theta(o_{i, t} \mid q, o_{i, <t})} - 1$$

---

# The Emergence of the "Aha!" Moment (Self-Reflection in DeepSeek-R1-Zero)

When trained on verifiable mathematical and coding tasks using GRPO with **Zero Supervised Fine-Tuning (SFT)**, the model autonomously discovers:
1. **Long Chain-of-Thought Expansion**: Generation length increases from 500 tokens to 8,000+ tokens to deliberate complex steps.
2. **Self-Correction & Backtracking**: The model naturally emits phrases like *"Wait, let me double check my previous substitution..."* and recalculates.

```mermaid
flowchart LR
    Step1["Generate initial equation"] --> Step2["Check intermediate constraint"]
    Step2 --> Discrepancy["Detect contradiction: 'Wait, this yields negative mass!'"]
    Discrepancy --> Backtrack["Backtrack and re-solve with alternative substitution"]
    Backtrack --> VerifiedSolution["Final Verified Answer inside &lt;box&gt;&lt;/box&gt;"]
```

---

# Pure PyTorch GRPO Loss Implementation

```python
import torch
import torch.nn.functional as F

def compute_grpo_loss(
    logp_active: torch.Tensor,     # [B, G, SeqLen]
    logp_old: torch.Tensor,        # [B, G, SeqLen]
    logp_ref: torch.Tensor,        # [B, G, SeqLen]
    rewards: torch.Tensor,         # [B, G]
    mask: torch.Tensor,            # [B, G, SeqLen]
    clip_eps: float = 0.2,
    beta_kl: float = 0.04
) -> torch.Tensor:
    B, G, S = logp_active.shape
    
    # 1. Compute Group Normalized Advantage A_i
    mean_r = rewards.mean(dim=1, keepdim=True)
    std_r = rewards.std(dim=1, keepdim=True) + 1e-8
    advantages = ((rewards - mean_r) / std_r).unsqueeze(-1) # [B, G, 1]

    # 2. Probability Ratio r_t(theta) = exp(logp - logp_old)
    ratios = torch.exp(logp_active - logp_old)
    
    # 3. Clipped Surrogate Objective
    surr1 = ratios * advantages
    surr2 = torch.clamp(ratios, 1.0 - clip_eps, 1.0 + clip_eps) * advantages
    policy_loss = -torch.min(surr1, surr2)

    # 4. Unbiased KL Divergence Penalty
    kl = torch.exp(logp_ref - logp_active) - (logp_ref - logp_active) - 1.0
    
    total_loss = (policy_loss + beta_kl * kl) * mask
    return total_loss.sum() / mask.sum()

# Verify GRPO on simulated group of G=4 completions
B, G, S = 2, 4, 32
logp = torch.randn(B, G, S)
logp_old = logp.clone()
logp_ref = logp.clone()
rewards = torch.tensor([[1.0, 0.0, 1.0, 0.0], [0.0, 0.0, 1.0, 1.0]])
mask = torch.ones(B, G, S)

loss = compute_grpo_loss(logp, logp_old, logp_ref, rewards, mask)
print(f"Computed GRPO Batch Loss: {loss.item():.4f}")
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Explain why GRPO requires verifiable deterministic reward functions (e.g. sympy math equality, pytest execution) rather than noisy LLM judges during early RL training.

**🟡 Challenge 2**: Prove why group advantage normalization ensures that if all $G$ candidates fail ($r_i = 0$ for all $i$), the advantages become $0.0$ and trigger zero gradient destabilization.

**🔴 Challenge 3**: Implement a complete GRPO training loop on GSM8K math problems using regex box extraction `<answer>(.*?)</answer>` as the reward verifier.
""")

print("New cutting-edge DeepSeek MLA and GRPO lessons authored with supreme depth!")
