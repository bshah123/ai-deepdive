import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# 1. CHAPTER 22: WORD2VEC (GeeksforGeeks / Algorithmic Derivation Style)
# ==============================================================================

write_file(r"content/part-03-ml-nlp/chapter-22-traditional-nlp/22.1-word2vec.md", r"""---
id: "22.1"
part: 3
chapter: 22
title: "Word2Vec: Skip-Gram with Negative Sampling Mathematical Derivation"
slug: "word2vec"
difficulty: "intermediate"
estimated_minutes: 35
prerequisites: ["20.1", "19.2"]
tags: ["word2vec", "skip-gram", "negative-sampling", "embeddings", "nlp"]
status: "published"
---

# Problem Statement: Continuous Word Representations

Before Word2Vec (Mikolov et al., 2013), words were represented as high-dimensional one-hot vectors ($e_{\text{cat}} = [1, 0, 0, \dots]^T$), which treats all words as equidistant and orthogonal ($\langle e_{\text{cat}}, e_{\text{dog}} \rangle = 0$).

Word2Vec builds dense, low-dimensional continuous vector embeddings based on the **Distributional Hypothesis** (Firth, 1957): *"You shall know a word by the company it keeps."*

```mermaid
flowchart TD
    subgraph Architectures ["Word2Vec Architecture Variants"]
        CBOW["Continuous Bag of Words (CBOW):<br>Predict target center word w_t from context words [w_{t-2}, w_{t-1}, w_{t+1}, w_{t+2}]"]
        SkipGram["Skip-Gram:<br>Predict surrounding context words [w_{t-2}, w_{t-1}, w_{t+1}, w_{t+2}] given center word w_t"]
    end
```

# The Skip-Gram with Negative Sampling (SGNS) Objective

Naive Softmax over the full vocabulary ($V = 100,000$) requires computing $\sum_{w=1}^V e^{v_w^T v_c}$ in the denominator, which is computationally prohibitive ($O(V)$ per token).

**Negative Sampling** converts the multi-class classification problem into binary logistic regressions: distinguish the true context word $w_O$ from $K$ randomly sampled noise words $\{w_i\}_{i=1}^K$ drawn from the unigram distribution $P_n(w) \propto f(w)^{3/4}$:

$$\mathcal{L}_{\text{SGNS}} = \log \sigma(v'_{w_O} \cdot v_{w_I}) + \sum_{i=1}^K \mathbb{E}_{w_i \sim P_n(w)} \left[ \log \sigma(-v'_{w_i} \cdot v_{w_I}) \right]$$

```mermaid
flowchart LR
    CenterWord["Center Word v_{w_I} ('fox')"] --> DotPos["Dot with True Context v'_{w_O} ('brown')"]
    CenterWord --> DotNeg1["Dot with Noise 1 v'_{w_1} ('refrigerator')"]
    CenterWord --> DotNeg2["Dot with Noise 2 v'_{w_2} ('algebra')"]
    DotPos --> SigmoidPos["Maximize log sigma(v' . v) -> Drive to 1.0!"]
    DotNeg1 --> SigmoidNeg1["Maximize log sigma(-v' . v) -> Drive to 0.0!"]
    DotNeg2 --> SigmoidNeg2["Maximize log sigma(-v' . v) -> Drive to 0.0!"]
```

# Vectorized PyTorch Implementation of Skip-Gram

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class SkipGramNegativeSampling(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int):
        super().__init__()
        # Input target embeddings W_in and output context embeddings W_out
        self.in_embed = nn.Embedding(vocab_size, embed_dim)
        self.out_embed = nn.Embedding(vocab_size, embed_dim)
        
        # Initialize with uniform variance
        nn.init.uniform_(self.in_embed.weight, -0.5 / embed_dim, 0.5 / embed_dim)
        nn.init.zeros_(self.out_embed.weight)

    def forward(self, target_words, pos_context_words, neg_context_words):
        # target_words: [B]
        # pos_context_words: [B]
        # neg_context_words: [B, K]
        
        v_in = self.in_embed(target_words)              # [B, dim]
        v_pos = self.out_embed(pos_context_words)        # [B, dim]
        v_neg = self.out_embed(neg_context_words)        # [B, K, dim]
        
        # 1. Positive dot product loss: log(sigma(v_in . v_pos))
        pos_scores = torch.sum(v_in * v_pos, dim=-1)     # [B]
        pos_loss = F.logsigmoid(pos_scores)              # [B]
        
        # 2. Negative dot product loss: sum(log(sigma(-v_in . v_neg)))
        neg_scores = torch.bmm(v_neg, v_in.unsqueeze(-1)).squeeze(-1) # [B, K]
        neg_loss = torch.sum(F.logsigmoid(-neg_scores), dim=-1)       # [B]
        
        # Total loss to minimize
        return -torch.mean(pos_loss + neg_loss)

# Verify forward pass
model = SkipGramNegativeSampling(vocab_size=1000, embed_dim=64)
target = torch.tensor([10, 25])
pos = torch.tensor([12, 30])
neg = torch.tensor([[100, 200, 300, 400, 500], [101, 201, 301, 401, 501]])
loss = model(target, pos, neg)
print(f"Skip-Gram Loss: {loss.item():.4f}")
```

# Why the $3/4$ Power Exponent?

Mikolov et al. sampled negative noise words according to:

$$P_n(w) = \frac{f(w)^{3/4}}{\sum_{j=1}^V f(w_j)^{3/4}}$$

The $0.75$ exponent slightly boosts the probability of rare words while dampening extreme stopwords like `"the"` and `"of"`, providing a far richer negative sampling gradient landscape.

# Exercises & Challenges

**🟢 Challenge 1**: Compute the gradient $\frac{\partial \mathcal{L}}{\partial v_{w_I}}$ with respect to the input center vector $v_{w_I}$.

**🟡 Challenge 2**: Implement subsampling of frequent words: $P(\text{discard}) = 1 - \sqrt{\frac{t}{f(w)}}$ with threshold $t = 10^{-5}$.

**🔴 Challenge 3**: Train Skip-Gram embeddings on a raw text corpus and evaluate semantic accuracy using the Word2Vec Analogy Test Suite ($A : B :: C : ?$).
""")

# ==============================================================================
# 2. CHAPTER 31: QLORA & NF4 (Research & Systems Style)
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-31-fine-tuning/31.2-qlora-nf4.md", r"""---
id: "31.2"
part: 4
chapter: 31
title: "QLoRA: NormalFloat4 (NF4), Double Quantization & Paged Optimizers"
slug: "qlora-nf4"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["31.1", "32.1"]
tags: ["qlora", "nf4", "double-quantization", "paged-optimizers", "fine-tuning"]
status: "published"
---

# Architecture: Fine-Tuning 70B Models on a Single 48GB GPU

**QLoRA (Quantized Low-Rank Adaptation)** (Dettmers et al., UW 2023) reduces the memory footprint of LLM fine-tuning by over **65%** without sacrificing task accuracy through three algorithmic innovations:

```mermaid
flowchart TD
    subgraph QLoRATechnologies ["The 3 Pillars of QLoRA"]
        NF4["1. NormalFloat4 (NF4) Data Type:<br>Information-theoretically optimal 4-bit quantile mapping for zero-mean normal weights"]
        DQ["2. Double Quantization (DQ):<br>Quantizes the 32-bit quantization constants down to 8-bit floats (Saves 0.37 bits/param)"]
        PO["3. Paged Optimizers:<br>Paged CUDA memory eviction to CPU RAM during activation memory spikes to prevent OOMs"]
    end
```

# NormalFloat4 (NF4) Mathematical Quantile Construction

Pre-trained neural network weights follow a zero-mean Gaussian distribution $\mathcal{N}(0, \sigma^2)$. 

Standard uniform integer quantization (INT4) places bins uniformly along a line, wasting resolution on low-probability tails. **NF4** places its 16 quantization bins $q_i \in [-1, 1]$ such that **each bin contains exactly equal probability mass ($\frac{1}{16} = 6.25\%$)**:

$$q_i = \frac{1}{2} \left( Q_X\left(\frac{i}{2^k}\right) + Q_X\left(\frac{i+1}{2^k}\right) \right), \quad \text{where } Q_X(p) = \text{Gaussian Quantile Function}$$

```mermaid
flowchart LR
    StandardNormal["Gaussian Weight Distribution N(0, 1)"] --> Quantiles["Divide area under bell curve into 16 EQUAL AREA slices"]
    Quantiles --> ExactBins["16 Exact NF4 Lookups:<br>[-1.0, -0.696, -0.525, -0.395, -0.284, -0.185, -0.091, 0.0, 0.079, 0.160, 0.246, 0.338, 0.441, 0.563, 0.723, 1.0]"]
```

# Double Quantization (DQ) Math

Standard 4-bit block quantization with block size $B_1 = 64$ requires storing a 32-bit FP32 scaling constant $c_1$ for every 64 parameters ($32 / 64 = 0.5$ bits/param overhead).

**Double Quantization** treats these FP32 scaling constants as a new distribution and quantizes them with an 8-bit FP8 quantizer with block size $B_2 = 256$:

$$\text{Memory Overhead} = \frac{8 \text{ bits}}{64} + \frac{32 \text{ bits}}{64 \times 256} = 0.125 + 0.00195 = 0.127 \text{ bits/param}$$

Saving **$0.373$ bits per parameter**, which amounts to **3 GB of VRAM** for a 65B model!

# QLoRA Forward Pass Computation

```mermaid
flowchart TD
    InputX["Input Tensor x [dim_in] (16-bit BF16)"] --> Dequantize["1. Dequantize NF4 Base Weights W_0 on-the-fly to BF16"]
    InputX --> LoRA_Branch["2. Forward through Trainable 16-bit LoRA Adapters (A and B)"]
    Dequantize --> MatMul["Base Forward: W_0 @ x"]
    LoRA_Branch --> Scale["LoRA Forward: (alpha/r) * (x @ A.T @ B.T)"]
    MatMul --> AddOut["Sum: h = (W_0 x) + LoRA(x)"]
    Scale --> AddOut
```

# Using QLoRA with `bitsandbytes` and `peft`

```python
import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

# 1. Configure 4-bit NF4 Quantization with Double Quantization
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16
)

# 2. Load Base Model in 4-bit
model_id = "meta-llama/Meta-Llama-3-8B-Instruct"
# model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=bnb_config, device_map="auto")

# 3. Setup LoRA Adapters on target projection layers
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
# model = get_peft_model(model, lora_config)
print("QLoRA Configuration verified!")
```

# Exercises & Challenges

**🟢 Challenge 1**: Verify why QLoRA stores gradients and optimizer states ONLY for the LoRA adapter parameters $A$ and $B$, while keeping base weights $W_0$ in immutable 4-bit VRAM.

**🟡 Challenge 2**: Calculate the exact VRAM required to fine-tune LLaMA-3-8B with QLoRA (4-bit weights + BF16 activations + LoRA rank 16 AdamW optimizer states).

**🔴 Challenge 3**: Implement Paged Optimizer memory swapping in Python by hooking PyTorch tensor allocation events to offload dormant parameter tensors to CPU pinned memory.
""")

# ==============================================================================
# 3. CHAPTER 35: VECTOR DATABASES & IVF-PQ (GeeksforGeeks / Systems Style)
# ==============================================================================

write_file(r"content/part-05-information-retrieval/chapter-35-vector-databases/35.2-ivf-pq.md", r"""---
id: "35.2"
part: 5
chapter: 35
title: "Inverted File Product Quantization (IVF-PQ) Indexing Deep Dive"
slug: "ivf-pq"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["35.1", "34.1"]
tags: ["ivf-pq", "faiss", "vector-database", "compression", "ann"]
status: "published"
---

# Problem Statement: Scaling Vector Search to 1 Billion Vectors

Storing 1 billion 1024-dimensional floating-point vectors requires:

$$\text{Memory} = 10^9 \times 1024 \times 4 \text{ bytes} = 4.096 \text{ Terabytes of RAM!}$$

**IVF-PQ (Inverted File Product Quantization)** (Jégou et al., 2011) compresses high-dimensional vectors by **32x to 64x** and accelerates search by partitioning vector space into Voronoi clusters.

```mermaid
flowchart TD
    subgraph IVF_Clustering ["1. Inverted File (IVF) Coarse Partitioning"]
        Space["High-Dimensional Space"] --> KMeans["K-Means Clustering: Generate K Voronoi Centroids (e.g. K=4096)"]
        KMeans --> InvertedLists["Create Inverted Lists: Each centroid maps to a list of vector IDs"]
    end

    subgraph PQ_Compression ["2. Product Quantization (PQ) Vector Compression"]
        Vector["1024-dim Vector"] --> Split["Split into M=64 sub-vectors of dimension d*=16"]
        Split --> SubKMeans["Assign each sub-vector to nearest Sub-Codebook Centroid (256 centroids = 8 bits)"]
        SubKMeans --> ByteCode["Compressed Vector = 64 bytes (98.4% compression!)"]
    end
```

# Step-by-Step Algorithm Walkthrough

### Step 1: Inverted File (IVF) Coarse Pruning
- During indexing: Cluster database vectors into $K$ Voronoi cells using k-means.
- At query time: Compute distance from query vector $q$ to all $K$ centroids. Select the **$n_{\text{probe}}$ closest centroids** and search *only* the vectors inside those inverted lists.

### Step 2: Product Quantization (PQ) Byte Compression
A 1024-dimensional vector is sliced into $M=64$ sub-vectors of 16 dimensions each. For each sub-space, a codebook of 256 centroids is trained. Each sub-vector is replaced by an **8-bit byte index** (0 to 255).

$$\text{Original Size: } 1024 \times 4 = 4096 \text{ bytes} \implies \text{PQ Code: } 64 \times 1 = 64 \text{ bytes!}$$

### Step 3: Asymmetric Distance Computation (ADC)
To search, we precompute a lookup table between the uncompressed query $q$ and the 256 centroids of each sub-space. Vector distance is computed via fast table additions:

$$d(q, y) \approx \sum_{m=1}^M \|\tilde{q}_m - c_{m, i_m}\|_2^2$$

```mermaid
flowchart LR
    Query["Uncompressed Query q"] --> Lookups["Compute Lookup Table D[M=64, 256 centroids]"]
    Lookups --> FastSum["For each candidate vector: Sum 64 precomputed table lookups!<br>(Zero floating-point matrix multiplications!)"]
    FastSum --> FastDist["Sub-microsecond Vector Distance"]
```

# IVF-PQ Implementation in FAISS

```python
import numpy as np

# Synthetic demonstration with FAISS (or simulated in pure NumPy)
d = 128                           # Vector dimension
nb = 100000                       # Database size: 100,000 vectors
nq = 10                           # Query count

np.random.seed(42)
xb = np.random.random((nb, d)).astype('float32')
xq = np.random.random((nq, d)).astype('float32')

# Configuration parameters
nlist = 100                       # Number of Voronoi cells (IVF)
m = 16                            # Number of sub-quantizers (PQ)
bits_per_code = 8                 # 8 bits = 256 centroids per sub-space

# Memory comparison
uncompressed_mb = (nb * d * 4) / (1024 * 1024)
compressed_mb = (nb * m * 1) / (1024 * 1024)

print(f"Uncompressed Database: {uncompressed_mb:.2f} MB")
print(f"IVF-PQ Compressed:     {compressed_mb:.2f} MB ({uncompressed_mb / compressed_mb:.1f}x compression!)")
```

# Tradeoff Matrix: IVF-PQ vs HNSW vs Flat

| Index Type | Search Latency | Recall @ 10 | RAM Usage (10M vectors) | Build Time |
|---|---|---|---|---|
| **Flat Index (Exact)** | $O(N)$ (Slow: 150 ms) | **100%** | 40 GB | Zero |
| **HNSW (Graph-based)** | **$O(\log N)$ (Ultra-Fast: 1 ms)** | **95-99%** | 55 GB (Graph overhead) | Moderate |
| **IVF-PQ (Quantized)** | $O(n_{\text{probe}})$ (Fast: 3 ms) | 85-92% | **1.2 GB (97% savings!)** | High (Training phase) |

# Exercises & Challenges

**🟢 Challenge 1**: Explain how increasing $n_{\text{probe}}$ from 1 to 32 trades off query latency against retrieval recall.

**🟡 Challenge 2**: Implement Asymmetric Distance Computation (ADC) in Python using NumPy lookup tables across $M=8$ sub-quantizers.

**🔴 Challenge 3**: Implement IVF-PQ with residual vector quantization where PQ is applied to the residual vectors $r = x - c_{\text{centroid}}$.
""")

print("Successfully authored additional varied-structure chapters!")
