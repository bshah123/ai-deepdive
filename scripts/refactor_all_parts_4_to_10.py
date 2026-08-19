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
# PART 4: TRANSFORMERS & LLMS
# ==============================================================================

# Lesson 24.3: RoPE (Rotary Position Embeddings)
write_file(r"content/part-04-transformers-llms/chapter-24-embeddings/24.1-rope.md", r"""---
id: "24.1"
part: 4
chapter: 24
title: "Rotary Position Embeddings (RoPE) Deep Dive"
slug: "rope"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["24.1", "20.1"]
tags: ["rope", "positional-encodings", "complex-numbers", "llama3", "transformers"]
contentShape: "visual-spatial"
openingType: "visual"
status: "published"
---

# Visualizing Rotary Position Embeddings

In modern frontier Large Language Models (LLaMA-3, Mistral, Gemma-2, DeepSeek), positional information is not added to token embeddings. Instead, query and key representations are **rotated in 2D coordinate subspaces in the complex plane**:

```mermaid
flowchart TD
    subgraph VectorSplitting ["1. Split 128-dim Embedding into 64 2D Coordinate Slices"]
        VecQ["Query Vector q = [x_0, x_1, x_2, x_3, ..., x_126, x_127]"] --> Slice0["Pair 0: (x_0, x_1) with theta_0 = 10000^(-0/128)"]
        VecQ --> Slice1["Pair 1: (x_2, x_3) with theta_1 = 10000^(-2/128)"]
        VecQ --> Slice63["Pair 63: (x_126, x_127) with theta_63 = 10000^(-126/128)"]
    end

    subgraph ComplexRotation ["2. Multiply by Complex Exponentials e^(i * m * theta)"]
        Slice0 --> Rot0["Rotate by angle m * theta_0 in 2D complex plane"]
        Slice1 --> Rot1["Rotate by angle m * theta_1"]
        Slice63 --> Rot63["Rotate by angle m * theta_63"]
    end

    Rot0 --> FinalQ["Rotated Query q_m' = R_{theta, m} * q_m"]
    Rot1 --> FinalQ
    Rot63 --> FinalQ
```

---

# Why RoPE Naturally Encodes Relative Distance $(m - n)$

When computing the dot product between query $q$ at position $m$ and key $k$ at position $n$:

$$\langle R_{\Theta, m} q, R_{\Theta, n} k \rangle = \text{Re} \left[ (q \, e^{i m \theta}) (k \, e^{i n \theta})^* \right] = \text{Re} \left[ q k^* e^{i (m - n) \theta} \right]$$

The self-attention score depends **strictly on the relative distance $m - n$ between tokens**, completely invariant to absolute position offsets!

```mermaid
flowchart LR
    TokenM["Query at Pos m: (m * theta)"] --> Subtraction["Phase Difference: (m - n) * theta"]
    TokenN["Key at Pos n: (n * theta)"] --> Subtraction
    Subtraction --> CosineDecay["Natural Long-Range Attention Attenuation"]
```

---

# Vectorized PyTorch Implementation

```python
import torch

def precompute_freqs_cis(dim: int, end: int, theta: float = 500000.0):
    # LLaMA-3 uses theta = 500,000 for 128k context support!
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2)[: (dim // 2)].float() / dim))
    t = torch.arange(end, device=freqs.device)
    freqs = torch.outer(t, freqs).float()
    return torch.polar(torch.ones_like(freqs), freqs)  # e^(i * m * theta)

def apply_rotary_emb(x: torch.Tensor, freqs_cis: torch.Tensor) -> torch.Tensor:
    # x: [Batch, SeqLen, Heads, HeadDim]
    x_complex = torch.view_as_complex(x.float().reshape(*x.shape[:-1], -1, 2))
    freqs_cis = freqs_cis[:x.shape[1], :].unsqueeze(0).unsqueeze(2)
    x_out = torch.view_as_real(x_complex * freqs_cis).flatten(3)
    return x_out.type_as(x)

# Verify RoPE forward
B, S, H, D = 2, 16, 8, 64
q = torch.randn(B, S, H, D)
freqs = precompute_freqs_cis(dim=D, end=128)
q_rot = apply_rotary_emb(q, freqs)
print("RoPE rotated shape:", q_rot.shape)
```

---

# Long-Context Extrapolation: YaRN & NTK-Aware Scaling

When evaluating a model on 32,000 tokens when pre-trained on 4,096 tokens, raw RoPE fails because unseen high frequencies cause attention scores to blow up.

Modern context extensions use **YaRN (Yet another RoPE extensioN)**:
- **Low Frequencies ($m\theta \ll 1$)**: Linearly interpolate (stretch) frequencies by factor $s = \frac{L_{\text{new}}}{L_{\text{old}}}$.
- **High Frequencies ($m\theta \gg 1$)**: Do not interpolate (preserve local token precision).
- **Intermediate Frequencies**: Smoothly blend interpolation factors via ramp function.

---

# Exercises & Challenges

**🟢 Challenge 1**: Verify by direct matrix multiplication that the 2D rotation matrix $R_\theta = \begin{pmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{pmatrix}$ has determinant $\det(R) = 1$ and $R_\theta^T R_\theta = I$.

**🟡 Challenge 2**: Implement the Neural Tangent Kernel (NTK) aware RoPE scaling formula: $\theta' = \theta \times b^{d / (d - 2)}$ where $b$ is the scale multiplier.

**🔴 Challenge 3**: Implement a unit test in PyTorch proving that shifting both query and key by constant offset $k$ ($\text{pos}_q = m + k, \text{pos}_k = n + k$) produces an identical attention score to ($\text{pos}_q = m, \text{pos}_k = n$).
""")

# Lesson 26.2: RMSNorm vs LayerNorm
write_file(r"content/part-04-transformers-llms/chapter-26-transformer-architecture/26.2-rmsnorm-layernorm.md", r"""---
id: "26.2"
part: 4
chapter: 26
title: "Normalization: LayerNorm, Pre-LN vs Post-LN & RMSNorm"
slug: "rmsnorm-layernorm"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["26.1", "21.2"]
tags: ["rmsnorm", "layernorm", "normalization", "pre-ln", "llama3"]
contentShape: "compare-choose"
openingType: "comparison"
status: "published"
---

# The Evolution of Normalization in Transformers

Deep Transformer networks suffer from internal covariate shift and exploding activations. Normalization stabilizes training by scaling hidden activations across the channel dimension:

```mermaid
flowchart TD
    subgraph LayerNorm_Standard ["1. Standard LayerNorm (Ba et al., 2016 - GPT-2 / BERT)"]
        LN_Mean["1. Compute Channel Mean: mu = 1/d * sum(x_i)"]
        LN_Var["2. Compute Channel Variance: sigma^2 = 1/d * sum((x_i - mu)^2)"]
        LN_Norm["3. Normalize: y = (x - mu) / sqrt(sigma^2 + eps) * gamma + beta"]
        LN_Mean --> LN_Var --> LN_Norm
    end

    subgraph RMSNorm_Fast ["2. Root Mean Square Norm - RMSNorm (Zhang & Sennrich, 2019 - LLaMA-3 / Mistral)"]
        RMS_Val["1. Compute Root Mean Square: RMS(x) = sqrt(1/d * sum(x_i^2) + eps)"]
        RMS_Norm["2. Normalize (Zero Mean Subtraction!): y = (x / RMS(x)) * gamma"]
        RMS_Val --> RMS_Norm
    end
```

---

# Why Does RMSNorm Outperform LayerNorm?

Empirical research proved that the **variance scaling** property of LayerNorm accounts for 99% of training stability, while **mean centering** ($\mu$) is computationally redundant.

### Key Advantages of RMSNorm:
1. **7% to 15% Faster Execution**: Eliminates the first pass to compute mean $\mu$ and subtraction $(x - \mu)$, saving memory bandwidth on GPU SRAM.
2. **Zero Bias Parameter ($\beta$)**: Reduces parameter count by eliminating the learnable additive bias vector.

$$\text{RMSNorm}(x) = \frac{x}{\sqrt{\frac{1}{d} \sum_{i=1}^d x_i^2 + \epsilon}} \odot \gamma$$

---

# Pre-LN vs Post-LN: The Gradient Highway

```mermaid
flowchart TD
    subgraph PostLN ["Post-LN (Original 2017 Transformer): Fragile Deep Gradients"]
        In1["x_l"] --> SubLayer1["SubLayer"]
        In1 --> Add1["Add: x + SubLayer(x)"]
        SubLayer1 --> Add1
        Add1 --> NormPost["LayerNorm(x + SubLayer(x))"]
        NormPost --> OutPost["x_{l+1}"]
    end

    subgraph PreLN ["Pre-LN (LLaMA-3, GPT-3): Unimpeded Gradient Highway"]
        In2["x_l"] --> NormPre["RMSNorm(x_l)"]
        NormPre --> SubLayer2["SubLayer"]
        SubLayer2 --> Add2["Add: x_l + SubLayer(RMSNorm(x_l))"]
        In2 --> Add2
        Add2 --> OutPre["x_{l+1}"]
    end
```

In Pre-LN architectures, the residual connection forms an unobstructed **linear identity highway** from the final loss back to the input embeddings:

$$\frac{\partial \mathcal{L}}{\partial x_0} = \frac{\partial \mathcal{L}}{\partial x_L} + \sum_{l=0}^{L-1} \frac{\partial \mathcal{L}}{\partial x_{l+1}} \frac{\partial \text{SubLayer}_l}{\partial x_l}$$

---

# Pure PyTorch RMSNorm Implementation

```python
import torch
import torch.nn as nn

class LLaMA3RMSNorm(nn.Module):
    def __init__(self, dim: int, eps: float = 1e-5):
        super().__init__()
        self.eps = eps
        # Learnable scale parameter gamma
        self.weight = nn.Parameter(torch.ones(dim))

    def _norm(self, x: torch.Tensor) -> torch.Tensor:
        # RMS(x) = sqrt(mean(x^2) + eps)
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        output = self._norm(x.float()).type_as(x)
        return output * self.weight

# Benchmark against LayerNorm
dim = 4096
rms = LLaMA3RMSNorm(dim)
ln = nn.LayerNorm(dim)

x = torch.randn(4, 512, dim)
print("RMSNorm output shape:", rms(x).shape)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Verify why `torch.rsqrt(val)` (reciprocal square root) is faster on GPU CUDA hardware than computing `1.0 / torch.sqrt(val)`.

**🟡 Challenge 2**: Explain why Post-LN networks require an extensive warm-up learning rate schedule (e.g. 2,000 warmup steps) while Pre-LN networks can train stably from step 1.

**🔴 Challenge 3**: Implement a Triton kernel for fused RMSNorm that computes root mean square and multiplication in a single GPU pass using SRAM registers.
""")

# Lesson 26.3: SwiGLU FFN
write_file(r"content/part-04-transformers-llms/chapter-26-transformer-architecture/26.3-swiglu-ffn.md", r"""---
id: "26.3"
part: 4
chapter: 26
title: "Feed-Forward Networks: Standard MLP, GeLU & SwiGLU Gating"
slug: "swiglu-ffn"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["26.1", "21.2"]
tags: ["swiglu", "ffn", "mlp", "llama3", "transformers"]
contentShape: "code-transformation"
openingType: "code"
status: "published"
---

# Transforming the Transformer Feed-Forward Network

In a Transformer block, the Feed-Forward Network (FFN / MLP) processes each token position independently. Over the past 7 years, the FFN layer underwent a major architectural transformation:

```mermaid
flowchart TD
    subgraph StandardFFN ["1. Original Transformer FFN (2017)"]
        In1["x [d_model]"] --> W1["Linear: W1 [d -> 4d]"]
        W1 --> Act1["ReLU Activation"]
        Act1 --> W2["Linear: W2 [4d -> d]"]
        W2 --> Out1["Output: W2 * ReLU(W1 * x)"]
    end

    subgraph SwiGLUFFN ["2. Modern SwiGLU Gated FFN (LLaMA-3 / Mistral)"]
        In2["x [d_model]"] --> GateProj["Gate Proj: W_gate [d -> d_ffn]"]
        In2 --> UpProj["Up Proj: W_up [d -> d_ffn]"]
        GateProj --> SiLU["SiLU Activation (Swish)"]
        SiLU --> ElementMult["Hadamard Elementwise Multiplication (*)"]
        UpProj --> ElementMult
        ElementMult --> DownProj["Down Proj: W_down [d_ffn -> d]"]
        DownProj --> Out2["Output: (SiLU(x * W_gate) * (x * W_up)) * W_down"]
    end
```

---

# The SwiGLU Mathematical Formula

Introduced by Noam Shazeer (2020), the **SwiGLU (Swish Gated Linear Unit)** layer uses bilinear multiplicative gating:

$$\text{SwiGLU}(x) = \left( \text{Swish}(x W_{\text{gate}}) \odot (x W_{\text{up}}) \right) W_{\text{down}}$$
$$\text{where } \text{Swish}(z) = z \cdot \sigma(z) = \text{SiLU}(z)$$

### The $8/3$ Parameter Scaling Rule
A standard 2-matrix MLP with hidden dimension $4d$ has $2 \times (d \times 4d) = 8d^2$ parameters. 

Because SwiGLU requires 3 linear matrices ($W_{\text{gate}}, W_{\text{up}}, W_{\text{down}}$), modern LLMs set the hidden dimension to **$\frac{8}{3} d_{\text{model}}$**:

$$3 \times \left(d \times \frac{8}{3} d\right) = 8d^2 \text{ parameters (Exact parameter parity with standard MLPs!)}$$

---

# PyTorch Production SwiGLU Implementation

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class LLaMA3SwiGLUFFN(nn.Module):
    def __init__(self, d_model: int = 4096, d_ffn: int = 14336):
        super().__init__()
        # Three projection matrices without bias
        self.w_gate = nn.Linear(d_model, d_ffn, bias=False)
        self.w_up   = nn.Linear(d_model, d_ffn, bias=False)
        self.w_down = nn.Linear(d_ffn, d_model, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # SwiGLU forward pass
        return self.w_down(F.silu(self.w_gate(x)) * self.w_up(x))

# Verify LLaMA-3-8B dimensions
d_model = 4096
# In LLaMA-3, 8/3 * 4096 = 10922, rounded up to nearest multiple of 256 -> 14336
d_ffn = 14336
ffn = LLaMA3SwiGLUFFN(d_model=d_model, d_ffn=d_ffn)

x = torch.randn(2, 32, d_model)
out = ffn(x)
print("SwiGLU Output Shape:", out.shape)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Compute the exact parameter count of a 32-layer LLaMA-3-8B FFN block ($d=4096, d_{\text{ffn}}=14336$).

**🟡 Challenge 2**: Explain why modern LLM linear projections omit the bias vector ($b=0$), and how this impacts multi-GPU Tensor Parallelism communication.

**🔴 Challenge 3**: Implement a Mixture of Experts (MoE) layer (Mixtral 8x7B style) using 8 SwiGLU expert blocks routed via top-2 softmax gating.
""")

# Lesson 29.2: PagedAttention & vLLM
write_file(r"content/part-04-transformers-llms/chapter-29-inference-kv-cache/29.2-paged-attention-vllm.md", r"""---
id: "29.2"
part: 4
chapter: 29
title: "PagedAttention & vLLM: Virtual Memory Block Management"
slug: "paged-attention-vllm"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["29.1"]
tags: ["vllm", "paged-attention", "virtual-memory", "serving", "high-throughput"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The Memory Fragmentation Crisis in Standard Serving

Standard LLM serving systems allocate a contiguous chunk of GPU VRAM for the maximum possible sequence length (e.g. 4,096 tokens) when a request arrives.

This causes massive memory waste:
- **Internal Fragmentation**: Unused reserved slots for tokens never generated.
- **External Fragmentation**: Memory gaps between requests preventing new requests from allocating.
- **Result**: Up to **80% of GPU VRAM is wasted on empty buffers**, capping concurrency at low batch sizes.

```mermaid
flowchart TD
    subgraph LegacyServing ["Legacy Serving: 80% VRAM Wasted in Contiguous Pre-allocation"]
        Alloc1["Request A: Reserved 4096 tokens (Uses only 300 tokens -> 3796 WASTED!)"]
        Alloc2["Request B: Reserved 4096 tokens (Uses only 150 tokens -> 3946 WASTED!)"]
    end

    subgraph PagedAttentionModel ["vLLM PagedAttention: Dynamic Non-Contiguous Page Allocation (Zero Waste!)"]
        VirtualTable["Logical Block Table (Virtual Memory Translation)"]
        Pool["Shared Physical Page Pool in GPU VRAM (e.g. 16 tokens per block)"]
        VirtualTable -->|Maps on-demand| Pool
    end
```

---

# How PagedAttention Works

Inspired by **Virtual Memory Paging in Operating Systems**, **PagedAttention** (Kwon et al., UC Berkeley 2023) divides the KV-cache of each sequence into fixed-size **Blocks** (e.g. 16 tokens per block).

Blocks do not need to be physically contiguous in GPU VRAM!

```mermaid
flowchart LR
    subgraph LogicalSequence ["Logical KV-Cache for Request A"]
        Block0["Logical Block 0 (Tokens 0-15)"]
        Block1["Logical Block 1 (Tokens 16-31)"]
        Block2["Logical Block 2 (Tokens 32-47)"]
    end

    subgraph BlockTable ["vLLM Block Table Translation"]
        Block0 --> Page7["Physical Page 7"]
        Block1 --> Page1["Physical Page 1"]
        Block2 --> Page19["Physical Page 19"]
    end

    subgraph PhysicalVRAM ["Physical GPU HBM Memory"]
        Page1["Page 1 [16 tokens]"]
        Page7["Page 7 [16 tokens]"]
        Page19["Page 19 [16 tokens]"]
    end
```

---

# Zero-Copy Copy-on-Write for Parallel Sampling

When generating multiple candidate responses for a single prompt (or in Tree-of-Thought search), PagedAttention shares the prompt physical blocks across all candidate streams without duplicating memory!

```mermaid
flowchart TD
    PromptBlocks["Shared Physical Prompt Blocks (Tokens 0-100)"]
    PromptBlocks --> Stream1["Candidate Response 1 (Allocates ONLY new decode blocks)"]
    PromptBlocks --> Stream2["Candidate Response 2 (Allocates ONLY new decode blocks)"]
    PromptBlocks --> Stream3["Candidate Response 3 (Allocates ONLY new decode blocks)"]
```

---

# Python PagedAttention Block Manager Simulation

```python
class PhysicalBlock:
    def __init__(self, block_number: int, block_size: int = 16):
        self.block_number = block_number
        self.block_size = block_size
        self.ref_count = 0

class BlockManager:
    def __init__(self, total_blocks: int, block_size: int = 16):
        self.free_blocks = [PhysicalBlock(i, block_size) for i in range(total_blocks)]
        self.block_tables = {}  # request_id -> list of physical blocks

    def allocate_request(self, request_id: str, prompt_tokens: int):
        num_blocks_needed = (prompt_tokens + 15) // 16
        allocated = []
        for _ in range(num_blocks_needed):
            block = self.free_blocks.pop(0)
            block.ref_count = 1
            allocated.append(block)
        self.block_tables[request_id] = allocated
        print(f"Allocated {len(allocated)} physical blocks for Request '{request_id}'")

    def append_token(self, request_id: str, current_token_count: int):
        table = self.block_tables[request_id]
        if current_token_count % 16 == 1:
            # Crossed block boundary -> allocate 1 fresh block from pool
            new_block = self.free_blocks.pop(0)
            new_block.ref_count = 1
            table.append(new_block)
            print(f"Allocated new block {new_block.block_number} dynamically!")

# Test Block Manager
mgr = BlockManager(total_blocks=100)
mgr.allocate_request("req_1", prompt_tokens=30)
mgr.append_token("req_1", current_token_count=33)
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Calculate the total memory fragmentation percentage reduction when moving from static 4,096-token pre-allocation to 16-token PagedAttention blocks on an average 300-token prompt workload.

**🟡 Challenge 2**: Explain how vLLM handles prompt prefix caching (Radix-Tree search) across independent requests sharing common system prompts.

**🔴 Challenge 3**: Implement a continuous batching scheduler in Python that evicts the longest-idle request blocks to CPU memory (preemption) when GPU block utilization hits 98%.
""")

print("Part 4 deep lessons rewritten with supreme mastery and diverse content shapes!")
