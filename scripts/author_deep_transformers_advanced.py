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
# CHAPTER 26: TRANSFORMER ARCHITECTURE
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-26-transformer-architecture/26.1-transformer-block.md", r"""---
id: "26.1"
part: 4
chapter: 26
title: "The Complete Transformer Block: Encoder vs Decoder"
slug: "transformer-block"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["25.1", "25.2"]
tags: ["transformer", "architecture", "residual-connections", "encoder-decoder"]
status: "published"
---

# Concept

A modern **Transformer Block** is the fundamental modular building unit of state-of-the-art Large Language Models. It combines two core sub-layers:
1. **Multi-Head Self-Attention (or GQA)**: Contextual token routing.
2. **Feed-Forward Network (FFN / MLP)**: Pointwise non-linear feature transformation.

Both sub-layers are wrapped by **Residual Connections (Skip Connections)** and **Normalization layers (RMSNorm / LayerNorm)**.

```mermaid
flowchart TD
    Input["Input Activations X [Batch, Seq, Dim]"] --> Norm1["RMSNorm 1"]
    Norm1 --> Attn["Grouped-Query Attention (GQA)"]
    Attn --> Add1["Residual Add: X + Attn(RMSNorm(X))"]
    Input --> Add1
    Add1 --> Norm2["RMSNorm 2"]
    Norm2 --> FFN["SwiGLU Feed-Forward Network"]
    FFN --> Add2["Residual Add: Out = X_mid + FFN(RMSNorm(X_mid))"]
    Add1 --> Add2
    Add2 --> Output["Output to Next Transformer Layer"]
```

# Encoder vs Decoder Architectures

| Architecture Type | Attention Masking | Primary Use Cases | Examples |
|---|---|---|---|
| **Encoder-Only** | Bidirectional (Full Attention) | Classification, Named Entity Recognition, Embeddings | BERT, RoBERTa, DeBERTa |
| **Encoder-Decoder** | Bidirectional in Encoder, Causal in Decoder + Cross-Attention | Translation, Abstractive Summarization | Original Transformer, T5, BART |
| **Decoder-Only** | **Causal (Autoregressive Mask)** | **Generative AI, Reasoning, Code Gen** | **GPT-4, LLaMA-3, Claude, Mistral** |

# Pre-LN vs Post-LN Architecture

- **Post-LN (Original 2017 Transformer)**: $x_{l+1} = \text{LayerNorm}(x_l + \text{SubLayer}(x_l))$. Gradients vanish in deep networks; requires delicate learning rate warmup.
- **Pre-LN (Modern Standard - GPT-2, LLaMA)**: $x_{l+1} = x_l + \text{SubLayer}(\text{RMSNorm}(x_l))$. Creates an unimpeded **Gradient Highway** allowing stable training of 100+ layer networks without warmup instability.

# PyTorch Implementation of a Pre-LN Transformer Block

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class RMSNorm(nn.Module):
    def __init__(self, dim, eps=1e-6):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x):
        # RMS(x) = sqrt(1/d * sum(x^2))
        rms = torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps)
        return x * rms * self.weight

class ModernTransformerBlock(nn.Module):
    def __init__(self, dim=4096, num_heads=32, hidden_dim=14336):
        super().__init__()
        self.norm1 = RMSNorm(dim)
        self.norm2 = RMSNorm(dim)
        
        # Self-Attention
        self.q_proj = nn.Linear(dim, dim, bias=False)
        self.k_proj = nn.Linear(dim, dim, bias=False)
        self.v_proj = nn.Linear(dim, dim, bias=False)
        self.out_proj = nn.Linear(dim, dim, bias=False)
        
        # SwiGLU FFN
        self.gate_proj = nn.Linear(dim, hidden_dim, bias=False)
        self.up_proj = nn.Linear(dim, hidden_dim, bias=False)
        self.down_proj = nn.Linear(hidden_dim, dim, bias=False)
        
        self.num_heads = num_heads
        self.head_dim = dim // num_heads

    def forward(self, x, mask=None):
        # Sub-layer 1: Pre-LN Attention + Residual
        normed = self.norm1(x)
        B, S, D = normed.shape
        Q = self.q_proj(normed).view(B, S, self.num_heads, self.head_dim).transpose(1, 2)
        K = self.k_proj(normed).view(B, S, self.num_heads, self.head_dim).transpose(1, 2)
        V = self.v_proj(normed).view(B, S, self.num_heads, self.head_dim).transpose(1, 2)
        
        attn_out = F.scaled_dot_product_attention(Q, K, V, is_causal=True)
        attn_out = attn_out.transpose(1, 2).contiguous().view(B, S, D)
        x = x + self.out_proj(attn_out)  # Residual Connection
        
        # Sub-layer 2: Pre-LN SwiGLU FFN + Residual
        normed_ffn = self.norm2(x)
        swiglu = F.silu(self.gate_proj(normed_ffn)) * self.up_proj(normed_ffn)
        x = x + self.down_proj(swiglu)   # Residual Connection
        return x

block = ModernTransformerBlock(dim=512, num_heads=8, hidden_dim=1376)
inputs = torch.randn(2, 16, 512)
print("Transformer Block Output Shape:", block(inputs).shape)
```

# Exercises

**🟢 Basic**: Modify the `ModernTransformerBlock` to support bidirectional non-causal attention for classification tasks.

**🟡 Intermediate**: Explain why the gradient flow through the residual connection $\frac{\partial \mathcal{L}}{\partial x_l} = \frac{\partial \mathcal{L}}{\partial x_{l+1}} (I + \frac{\partial \text{SubLayer}}{\partial x_l})$ prevents gradient vanishing in deep networks.

**🔴 Advanced**: Calculate the total parameter count of a 32-layer Transformer with $D=4096$, $H=32$, and SwiGLU hidden dimension $H_{\text{ffn}} = \frac{8}{3} D \approx 14336$.
""")

# ==============================================================================
# CHAPTER 27: GPT & DECODER-ONLY LLMS
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-27-gpt-decoder-llms/27.1-nanogpt-scratch.md", r"""---
id: "27.1"
part: 4
chapter: 27
title: "Building NanoGPT from Scratch in PyTorch"
slug: "nanogpt-scratch"
difficulty: "advanced"
estimated_minutes: 45
prerequisites: ["26.1", "25.1", "24.1"]
tags: ["nanogpt", "gpt", "from-scratch", "pytorch", "karpathy"]
status: "published"
---

# Concept

We will construct a complete, standalone, trainable **Generative Pre-trained Transformer (GPT)** from scratch in PyTorch (inspired by Andrej Karpathy's `nanoGPT`).

```mermaid
flowchart TD
    Tokens["Input Token IDs [B, S]"] --> TokEmb["Token Embeddings [B, S, D]"]
    Pos["Position Indices [S]"] --> PosEmb["Positional Embeddings [S, D]"]
    TokEmb --> AddEmb["X = TokEmb + PosEmb"]
    PosEmb --> AddEmb
    AddEmb --> Block0["Transformer Block 0"]
    Block0 --> Block1["Transformer Block 1"]
    Block1 --> BlockN["Transformer Block N"]
    BlockN --> FinalLN["Final LayerNorm"]
    FinalLN --> LMHead["LM Head (Linear -> Vocab_Size)"]
    LMHead --> Logits["Output Logits [B, S, Vocab_Size]"]
```

# Complete Standalone NanoGPT Implementation

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class CausalSelfAttention(nn.Module):
    def __init__(self, d_model, n_head):
        super().__init__()
        assert d_model % n_head == 0
        self.c_attn = nn.Linear(d_model, 3 * d_model, bias=False)  # Fused Q, K, V
        self.c_proj = nn.Linear(d_model, d_model, bias=False)
        self.n_head = n_head
        self.d_model = d_model

    def forward(self, x):
        B, S, D = x.shape
        q, k, v = self.c_attn(x).split(self.d_model, dim=2)
        k = k.view(B, S, self.n_head, D // self.n_head).transpose(1, 2)
        q = q.view(B, S, self.n_head, D // self.n_head).transpose(1, 2)
        v = v.view(B, S, self.n_head, D // self.n_head).transpose(1, 2)

        # Fast Scaled Dot-Product Attention with Causal Masking
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        y = y.transpose(1, 2).contiguous().view(B, S, D)
        return self.c_proj(y)

class MLP(nn.Module):
    def __init__(self, d_model):
        super().__init__()
        self.c_fc   = nn.Linear(d_model, 4 * d_model, bias=False)
        self.gelu   = nn.GELU()
        self.c_proj = nn.Linear(4 * d_model, d_model, bias=False)

    def forward(self, x):
        return self.c_proj(self.gelu(self.c_fc(x)))

class Block(nn.Module):
    def __init__(self, d_model, n_head):
        super().__init__()
        self.ln_1 = nn.LayerNorm(d_model)
        self.attn = CausalSelfAttention(d_model, n_head)
        self.ln_2 = nn.LayerNorm(d_model)
        self.mlp  = MLP(d_model)

    def forward(self, x):
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x

class NanoGPT(nn.Module):
    def __init__(self, vocab_size=65, d_model=128, n_layer=4, n_head=4, block_size=256):
        super().__init__()
        self.block_size = block_size
        self.transformer = nn.ModuleDict(dict(
            wte = nn.Embedding(vocab_size, d_model),
            wpe = nn.Embedding(block_size, d_model),
            h = nn.ModuleList([Block(d_model, n_head) for _ in range(n_layer)]),
            ln_f = nn.LayerNorm(d_model),
        ))
        self.lm_head = nn.Linear(d_model, vocab_size, bias=False)
        
        # Weight tying: Share embedding weights with LM Head
        self.transformer.wte.weight = self.lm_head.weight

    def forward(self, idx, targets=None):
        B, S = idx.shape
        pos = torch.arange(0, S, dtype=torch.long, device=idx.device)
        
        # Forward Token + Positional Embeddings
        x = self.transformer.wte(idx) + self.transformer.wpe(pos)
        
        # Forward through Transformer Blocks
        for block in self.transformer.h:
            x = block(x)
        x = self.transformer.ln_f(x)
        
        if targets is not None:
            logits = self.lm_head(x)
            loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
            return logits, loss
        else:
            # Inference: Compute logits only for last token
            logits = self.lm_head(x[:, [-1], :])
            return logits, None

    @torch.no_grad()
    def generate(self, idx, max_new_tokens, temperature=1.0, top_k=None):
        for _ in range(max_new_tokens):
            # Crop context if sequence exceeds block size
            idx_cond = idx if idx.size(1) <= self.block_size else idx[:, -self.block_size:]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :] / temperature
            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float('Inf')
            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)
        return idx

# Instantiate and verify NanoGPT
model = NanoGPT(vocab_size=256, d_model=64, n_layer=2, n_head=2, block_size=128)
inputs = torch.randint(0, 256, (2, 32))
logits, loss = model(inputs, targets=inputs)
print("Forward Loss:", loss.item())

# Generate tokens
sample_output = model.generate(torch.tensor([[10, 20]]), max_new_tokens=5)
print("Generated Token Sequence:", sample_output.tolist())
```

# Exercises

**🟢 Basic**: Train this NanoGPT model on a small character text file (e.g. Shakespeare text) for 500 steps and print generated text samples.

**🟡 Intermediate**: Add Learning Rate Cosine Annealing with Warmup to the training loop.

**🔴 Advanced**: Modify NanoGPT to replace learned positional embeddings (`wpe`) with Rotary Position Embeddings (RoPE) and LayerNorm with RMSNorm.
""")

# ==============================================================================
# CHAPTER 31: FINE-TUNING & PEFT (LORA)
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-31-fine-tuning/31.1-lora-math.md", r"""---
id: "31.1"
part: 4
chapter: 31
title: "Low-Rank Adaptation (LoRA) Mathematics: W_0 + B*A"
slug: "lora-math"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["20.2", "26.1"]
tags: ["lora", "peft", "fine-tuning", "low-rank", "math"]
status: "published"
---

# Concept

Full fine-tuning of an LLM requires updating and storing gradients and optimizer states for all parameters (e.g. 70 billion weights $\approx 1.2 \text{ TB}$ of VRAM).

**Low-Rank Adaptation (LoRA)** (Hu et al., 2021) hypothesizes that weight updates $\Delta W$ have a **low intrinsic rank $r \ll d$**. LoRA freezes the pre-trained weight matrix $W_0 \in \mathbb{R}^{d \times k}$ and parameterizes the update as the product of two low-rank matrices:

$$\Delta W = B \cdot A, \quad \text{where } A \in \mathbb{R}^{r \times k}, \ B \in \mathbb{R}^{d \times r}, \ r \ll \min(d, k)$$

$$h = W_0 x + \Delta W x = W_0 x + \frac{\alpha}{r} (B A) x$$

```mermaid
flowchart LR
    InputX["Input Vector x [dim_in]"] --> FrozenW["Frozen Pre-trained Weight W_0<br>[dim_out, dim_in] (No Gradients)"]
    InputX --> LoRA_A["LoRA Matrix A [r, dim_in]<br>(Init: Gaussian Normal)"]
    LoRA_A --> LoRA_B["LoRA Matrix B [dim_out, r]<br>(Init: Exact Zeros)"]
    LoRA_B --> Scale["Scale by alpha / r"]
    FrozenW --> Add["Sum: h = W_0 x + (alpha/r) B A x"]
    Scale --> Add
    Add --> OutputH["Output Activations h [dim_out]"]
```

# Why Initialize Matrix $B$ to Zero?

- Matrix $A$ is initialized with Gaussian random values $\mathcal{N}(0, \sigma^2)$.
- Matrix $B$ is initialized to **exact zeros**.
- Therefore, at step 0: $\Delta W = B \cdot A = 0 \cdot A = 0$.
- The model begins fine-tuning with its **exact original pre-trained behavior**, with zero perturbation.

# PyTorch LoRA Linear Layer from Scratch

```python
import torch
import torch.nn as nn
import math

class LoRALinear(nn.Module):
    def __init__(self, in_features, out_features, rank=8, lora_alpha=16):
        super().__init__()
        # 1. Base Linear Layer (Frozen)
        self.linear = nn.Linear(in_features, out_features, bias=False)
        self.linear.weight.requires_grad = False  # Freeze pre-trained weights!
        
        # 2. Trainable Low-Rank Adapters
        self.rank = rank
        self.scaling = lora_alpha / rank
        self.lora_A = nn.Parameter(torch.empty(rank, in_features))
        self.lora_B = nn.Parameter(torch.zeros(out_features, rank))
        
        # Initialize A with Kaiming uniform and B with zeros
        nn.init.kaiming_uniform_(self.lora_A, a=math.sqrt(5))

    def forward(self, x):
        # Base forward + scaled low-rank adapter forward
        base_out = self.linear(x)
        lora_out = (x @ self.lora_A.T @ self.lora_B.T) * self.scaling
        return base_out + lora_out

# Verify parameter reduction:
d_in, d_out, r = 4096, 4096, 16
layer = LoRALinear(d_in, d_out, rank=r)

full_params = d_in * d_out                               # 16,777,216 params
lora_params = (r * d_in) + (d_out * r)                   # 131,072 params
print(f"Full Layer Params: {full_params:,}")
print(f"LoRA Layer Params: {lora_params:,} ({(lora_params / full_params) * 100:.2f}% of full weights!)")
```

# Zero-Latency Deployment: Weight Merging

At inference time, you can merge $\Delta W$ directly into $W_0$ without any runtime overhead:

$$W_{\text{merged}} = W_0 + \frac{\alpha}{r} (B A)$$

# Exercises

**🟢 Basic**: Implement the `merge_weights()` and `unmerge_weights()` methods on `LoRALinear`.

**🟡 Intermediate**: Write a utility that traverses a PyTorch model and replaces all `nn.Linear` layers in attention blocks with `LoRALinear`.

**🔴 Advanced**: Calculate the total VRAM savings of fine-tuning LLaMA-3-8B with LoRA ($r=16$) vs full 16-bit fine-tuning with the AdamW optimizer.
""")

print("Advanced Transformers & LoRA authored with supreme depth!")
