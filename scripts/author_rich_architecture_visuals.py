import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# CHAPTER 17: PYTORCH FUNDAMENTALS & CUDA PIPELINE
# ==============================================================================

write_file(r"content/part-02-scientific-python/chapter-17-pytorch-fundamentals/17.1-tensor-internals.md", r"""---
id: "17.1"
part: 2
chapter: 17
title: "PyTorch Tensor Internals: TensorImpl, Storage & Memory Strides"
slug: "tensor-internals"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["15.1", "15.2"]
tags: ["pytorch", "tensorimpl", "storage", "strides", "c10"]
status: "published"
---

# Architecture Overview: The Two-Tiered Tensor Design

In PyTorch (specifically C++ `c10` core), a `torch.Tensor` is split into two decoupled objects:
1. **`c10::TensorImpl` (Metadata Head)**: Stores tensor shape (sizes), strides, storage offset, data type (`ScalarType`), device, and autograd version counter (`_version`).
2. **`c10::StorageImpl` (Flat Contiguous Data Buffer)**: Owns the raw memory allocation (CPU heap or GPU VRAM) via a refcounted pointer.

```mermaid
flowchart TD
    subgraph TensorInstances ["Multiple Tensor Views (Zero Memory Overhead)"]
        T1["Tensor A (Shape: [4, 4], Strides: [4, 1], Offset: 0)"]
        T2["Tensor B = A.t() (Shape: [4, 4], Strides: [1, 4], Offset: 0)"]
        T3["Tensor C = A[1:3, 1:3] (Shape: [2, 2], Strides: [4, 1], Offset: 5)"]
    end

    subgraph StorageBuffer ["Shared StorageImpl (Single Flat Memory Buffer)"]
        RawMemory["Raw Buffer: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]<br>(16 elements x 4 bytes = 64 bytes total)"]
    end

    T1 -->|Points to data_ptr| RawMemory
    T2 -->|Points to data_ptr| RawMemory
    T3 -->|Points to data_ptr + 5| RawMemory
```

# Memory Stride Formula & Index Mapping

To map an $N$-dimensional coordinate $(i_0, i_1, \dots, i_{k-1})$ to its flat memory index:

$$\text{Flat Offset} = \text{storage\_offset} + \sum_{d=0}^{k-1} i_d \times \text{stride}[d]$$

```mermaid
flowchart LR
    Coord["2D Index (row=2, col=3)"] --> StrideCalc["Offset = 0 + (2 * stride[0]) + (3 * stride[1])<br>= (2 * 4) + (3 * 1) = 11"]
    StrideCalc --> MemoryAddress["Memory Address = data_ptr + (11 * sizeof(float32))"]
```

# View vs Copy Operations in PyTorch

```python
import torch

# Create a 4x4 matrix
A = torch.arange(16, dtype=torch.float32).reshape(4, 4)
print("A strides:", A.stride())          # (4, 1) - Contiguous in row-major

# Transpose creates a VIEW (zero data copy!)
B = A.t()
print("B strides:", B.stride())          # (1, 4) - Non-contiguous
print("Shares storage?", A.untyped_storage().data_ptr() == B.untyped_storage().data_ptr())  # True

# Calling .contiguous() forces a physical memory rearrangement
C = B.contiguous()
print("C strides:", C.stride())          # (4, 1) - New contiguous allocation!
print("Shares storage with A?", A.untyped_storage().data_ptr() == C.untyped_storage().data_ptr())  # False
```

# Exercises & Challenges

**🟢 Challenge 1**: Inspect the storage pointer of `A[::2, ::2]` and compute its strides.

**🟡 Challenge 2**: Explain why calling `.view(-1)` on a non-contiguous tensor throws `RuntimeError: view size is not compatible with input tensor's size and stride` whereas `.reshape(-1)` automatically copies if necessary.

**🔴 Challenge 3**: Implement a pure Python class `SimpleTensor` that encapsulates flat list storage, strides, shape, and handles 2D slicing without data duplication.
""")

# ==============================================================================
# CHAPTER 23: TOKENIZATION PIPELINE
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-23-tokenization/23.1-bpe-algorithm.md", r"""---
id: "23.1"
part: 4
chapter: 23
title: "Byte-Pair Encoding (BPE) from Scratch & Hugging Face Tokenizers"
slug: "bpe-algorithm"
difficulty: "intermediate"
estimated_minutes: 35
prerequisites: ["3.3"]
tags: ["bpe", "tokenization", "subwords", "tiktoken", "huggingface"]
status: "published"
---

# The Tokenization Execution Pipeline

In modern LLMs (GPT-4, LLaMA-3, Claude), text is converted to token IDs through a 4-stage pipeline implemented in Rust (`huggingface/tokenizers` and `openai/tiktoken`):

```mermaid
flowchart LR
    RawText["1. Raw Unicode Text:<br>'Hello World!'"] --> Normalizer["2. Normalizer:<br>Unicode NFKC / Lowercase / Whitespace cleanup"]
    Normalizer --> PreTokenizer["3. Pre-Tokenizer:<br>Regex split into word/punctuation chunks"]
    PreTokenizer --> Model["4. Subword Model (BPE / WordPiece):<br>Iterative pair merge lookup in Vocab"]
    Model --> PostProcessor["5. Post-Processor:<br>Add Special Tokens (&lt;s&gt;, &lt;bos&gt;, &lt;eos&gt;)"]
    PostProcessor --> TokenIDs["Output Token IDs:<br>[1, 15043, 2787, 0, 2]"]
```

# Byte-Pair Encoding (BPE) Merge Tree Algorithm

BPE begins with a base vocabulary of individual characters or raw bytes ($0\dots255$) and iteratively merges the most frequent adjacent pair across the training corpus:

```mermaid
flowchart TD
    Initial["Initial Tokens: ['l', 'o', 'w'], ['l', 'o', 'w', 'e', 'r'], ['n', 'e', 'w', 'e', 's', 't']"] --> CountPairs["Count adjacent pair frequencies:<br>('e', 'r'): 1, ('e', 's'): 1, ('l', 'o'): 2, ('o', 'w'): 2"]
    CountPairs --> Merge1["Merge top pair ('l', 'o') -> 'lo'<br>Vocab: {'l', 'o', 'w', 'e', 'r', 'n', 's', 't', 'lo'}"]
    Merge1 --> Merge2["Merge top pair ('lo', 'w') -> 'low'<br>Vocab: {..., 'low'}"]
    Merge2 --> Merge3["Merge top pair ('e', 'r') -> 'er'<br>Vocab: {..., 'low', 'er'}"]
    Merge3 --> FinalTokens["Tokenized representation: ['low'], ['low', 'er'], ['new', 'est']"]
```

# Pure Python Byte-Level BPE Tokenizer

```python
from collections import Counter

def train_bpe(text: str, num_merges: int):
    # Initialize words with character lists ending with special boundary
    words = [list(word) + ['</w>'] for word in text.split()]
    vocab = set(c for word in words for c in word)
    merges = {}

    for i in range(num_merges):
        # Count all adjacent pair frequencies
        pairs = Counter()
        for word in words:
            for j in range(len(word) - 1):
                pairs[(word[j], word[j+1])] += 1

        if not pairs:
            break

        # Find the most frequent pair
        best_pair = max(pairs, key=pairs.get)
        new_token = ''.join(best_pair)
        vocab.add(new_token)
        merges[best_pair] = new_token

        # Replace the pair across all words
        new_words = []
        for word in words:
            new_word = []
            j = 0
            while j < len(word):
                if j < len(word) - 1 and (word[j], word[j+1]) == best_pair:
                    new_word.append(new_token)
                    j += 2
                else:
                    new_word.append(word[j])
                    j += 1
            new_words.append(new_word)
        words = new_words

    return vocab, merges

# Train on sample text
corpus = "low lower newest widest lowest"
vocab, merges = train_bpe(corpus, num_merges=4)
print("Learned BPE Merges:", merges)
```

# Exercises & Challenges

**🟢 Challenge 1**: Explain why Byte-Fallback BPE (mapping unknown characters to UTF-8 byte tokens) guarantees that the tokenizer never produces `<unk>` (out-of-vocabulary) errors.

**🟡 Challenge 2**: Compare the token count of a 1,000-line Python file tokenized with `cl100k_base` (GPT-4) versus `llama3` tokenizer.

**🔴 Challenge 3**: Implement a Trie-based greedy longest-match prefix tokenizer in Python that tokenizes a sequence in $O(N)$ runtime.
""")

# ==============================================================================
# CHAPTER 24: EMBEDDINGS & POSITIONAL ENCODINGS (ROPE)
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-24-embeddings/24.2-positional-encodings.md", r"""---
id: "24.2"
part: 4
chapter: 24
title: "Positional Encodings: Absolute, Sinusoidal, ALiBi & Rotary (RoPE)"
slug: "positional-encodings"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["24.1", "20.1"]
tags: ["rope", "positional-encodings", "alibi", "sinusoidal", "llama3"]
status: "published"
---

# Why Positional Information is Necessary

Self-Attention is **permutation-equivariant**: if you shuffle the input token sequence, the attention output is identical up to the same permutation. Without positional encodings, the model cannot distinguish between `"The dog bit the cat"` and `"The cat bit the dog"`.

```mermaid
flowchart TD
    subgraph AbsoluteEncoding ["1. Absolute Positional Encodings (Original Transformer / GPT-2)"]
        TokEmb["Token Embedding x_i"] --> AddPos["Sum: h_i = x_i + PosEmbedding[i]"]
        PosTable["Learned / Sinusoidal Lookup Table"] --> AddPos
        AddPos --> Weakness1["Weakness: Fixed maximum context length (Cannot extrapolate)"]
    end

    subgraph RelativeRotary ["2. Rotary Position Embedding - RoPE (LLaMA-3, Mistral, Gemma)"]
        QueryK["Query q_m and Key k_n at positions m, n"] --> ComplexRot["Rotate 2D slice pairs by angle m * theta_i:<br>q_m' = R_{theta, m} * q_m<br>k_n' = R_{theta, n} * k_n"]
        ComplexRot --> RelAttn["Dot product naturally encodes relative distance m - n:<br>&lt;q_m', k_n'&gt; = Re(&lt;q_m, k_n&gt; e^(i(m-n)theta))"]
    end
```

# Mathematical Formulation of RoPE (Rotary Position Embeddings)

RoPE groups the $d$-dimensional embedding vector into $\frac{d}{2}$ pairs of coordinates and rotates each 2D sub-vector by an angle proportional to sequence position $m$ and frequency $\theta_i = 10000^{-2(i-1)/d}$:

$$R_{\Theta, m}^d = \begin{pmatrix}
\cos m\theta_1 & -\sin m\theta_1 & 0 & 0 & \dots \\
\sin m\theta_1 & \cos m\theta_1 & 0 & 0 & \dots \\
0 & 0 & \cos m\theta_2 & -\sin m\theta_2 & \dots \\
0 & 0 & \sin m\theta_2 & \cos m\theta_2 & \dots \\
\vdots & \vdots & \vdots & \vdots & \ddots
\end{pmatrix}$$

```mermaid
flowchart LR
    Pair["2D Coordinate Pair (x_0, x_1)"] --> Rotation["Rotate by angle m * theta_1 in 2D Complex Plane"]
    Rotation --> RotatedPair["Rotated Pair: (x_0 cos(m*theta) - x_1 sin(m*theta), x_0 sin(m*theta) + x_1 cos(m*theta))"]
```

# Vectorized PyTorch Implementation of RoPE

```python
import torch

def precompute_freqs_cis(dim: int, end: int, theta: float = 10000.0):
    # theta_i = 1 / (theta ^ (2i / dim))
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2)[: (dim // 2)].float() / dim))
    t = torch.arange(end, device=freqs.device)  # Sequence positions: 0, 1, ..., end-1
    freqs = torch.outer(t, freqs).float()       # [end, dim // 2]
    # Represent as complex unit vectors e^(i * m * theta)
    freqs_cis = torch.polar(torch.ones_like(freqs), freqs)  # [end, dim // 2]
    return freqs_cis

def apply_rotary_emb(x: torch.Tensor, freqs_cis: torch.Tensor) -> torch.Tensor:
    # Reshape x to complex numbers: [B, S, H, D] -> [B, S, H, D // 2]
    x_complex = torch.view_as_complex(x.float().reshape(*x.shape[:-1], -1, 2))
    freqs_cis = freqs_cis[:x.shape[1], :].unsqueeze(0).unsqueeze(2)  # [1, S, 1, D // 2]
    # Complex multiplication rotates the vectors
    x_rotated = torch.view_as_real(x_complex * freqs_cis).flatten(3)
    return x_rotated.type_as(x)

# Verify RoPE rotation
B, S, H, D = 2, 8, 4, 64
q = torch.randn(B, S, H, D)
freqs = precompute_freqs_cis(dim=D, end=128)
q_rotated = apply_rotary_emb(q, freqs)
print("RoPE output shape:", q_rotated.shape)  # [2, 8, 4, 64]
```

# Positional Encoding Architecture Comparison

| Method | Encoding Type | Extrapolation Capacity | Used In |
|---|---|---|---|
| **Learned Positional** | Absolute (additive) | Fails on longer context ($S > S_{\max}$) | GPT-2, BERT, OPT |
| **Sinusoidal Positional** | Absolute (fixed frequencies) | Limited extrapolation | Original Transformer |
| **ALiBi** | Relative (attention bias penalty $-m \cdot |i - j|$) | High extrapolation | BLOOM, MPT-7B |
| **RoPE** | **Relative (complex rotation)** | **State-of-the-Art (with RoPE scaling like YaRN)** | **LLaMA-3, Mistral, Gemma-2, DeepSeek** |

# Exercises & Challenges

**🟢 Challenge 1**: Verify that rotating two vectors $q$ and $k$ with RoPE preserves the Euclidean norm: $\|q_{\text{rot}}\|_2 = \|q\|_2$.

**🟡 Challenge 2**: Implement Linear RoPE Scaling to double context length from 4,096 to 8,192 tokens by scaling frequencies $\theta' = \theta / 2$.

**🔴 Challenge 3**: Implement YaRN (Yet another RoPE extensioN method) in PyTorch which combines temperature scaling with progressive high/low frequency interpolation.
""")

# ==============================================================================
# CHAPTER 29: KV CACHE & HIGH-THROUGHPUT INFERENCE
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-29-inference-kv-cache/29.1-kv-cache-mechanics.md", r"""---
id: "29.1"
part: 4
chapter: 29
title: "KV Cache Mechanics, Memory Footprint & Roofline Latency Bound"
slug: "kv-cache-mechanics"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["25.1", "25.2", "27.1"]
tags: ["kv-cache", "inference", "memory-bandwidth", "roofline", "throughput"]
status: "published"
---

# Why Autoregressive Generation Requires a KV-Cache

In naive autoregressive decoding, generating token $T+1$ requires passing all $T$ previous tokens through the entire Transformer model. Because previous token activations do not change, this causes $O(T^2)$ redundant matrix multiplications!

The **KV-Cache** stores the Key and Value tensor activations of all preceding tokens for every attention layer, reducing token generation computation from $O(T)$ to **$O(1)$ per step**.

```mermaid
flowchart TD
    subgraph Step1 ["Step 1: Prefill Phase (Full Prompt 'The quick brown')"]
        PromptTokens["Prompt Tokens [0..2]"] --> FullAttn["Compute Q, K, V for all tokens"]
        FullAttn --> StoreKV["Store K0, K1, K2 and V0, V1, V2 in KV-Cache"]
        FullAttn --> Emit1["Emit First Token: 'fox'"]
    end

    subgraph Step2 ["Step 2: Decode Phase (Single New Token 'fox')"]
        NewToken["Input ONLY token 'fox' [Pos 3]"] --> SingleQ["Compute Q3, K3, V3 ONLY!"]
        SingleQ --> AppendKV["Append K3, V3 to KV-Cache"]
        StoreKV --> FetchKV["Fetch past K0..K2, V0..V2 from GPU HBM"]
        FetchKV --> AttnCalc["Attend Q3 against full keys [K0, K1, K2, K3]"]
        AppendKV --> AttnCalc
        AttnCalc --> Emit2["Emit Next Token: 'jumps'"]
    end
```

# Mathematical Memory Footprint Formula

The total GPU VRAM memory required for the KV-Cache across a batch is:

$$\text{Memory}_{\text{KV}} = 2 \times B \times S \times L \times H_{\text{kv}} \times D_{\text{head}} \times P_{\text{bytes}}$$

- Factor $2$: One tensor for Keys, one for Values.
- $B$: Batch size (concurrent sequences).
- $S$: Sequence context length (e.g. 8,192 tokens).
- $L$: Number of Transformer layers (e.g. 80 layers in LLaMA-3-70B).
- $H_{\text{kv}}$: Number of KV heads (8 in GQA vs 64 in MHA).
- $D_{\text{head}}$: Dimension per head (128).
- $P_{\text{bytes}}$: Bytes per parameter (2 bytes for FP16/BF16, 1 byte for FP8).

```mermaid
flowchart LR
    MHA["Multi-Head Attention (MHA: 64 KV heads)<br>KV-Cache for 4k tokens, Batch 16:<br><b>52.4 GB VRAM</b> (OOM on single 80GB GPU!)"]
    GQA["Grouped-Query Attention (GQA: 8 KV heads)<br>KV-Cache for 4k tokens, Batch 16:<br><b>6.55 GB VRAM</b> (8x Memory Reduction!)"]
```

# Python KV-Cache Memory Calculator

```python
def calculate_kv_cache_gb(
    batch_size: int,
    seq_len: int,
    num_layers: int,
    num_kv_heads: int,
    head_dim: int,
    precision_bytes: int = 2
):
    # Total bytes = 2 (K and V) * B * S * L * H_kv * D_head * bytes
    total_bytes = 2 * batch_size * seq_len * num_layers * num_kv_heads * head_dim * precision_bytes
    total_gb = total_bytes / (1024 ** 3)
    return total_gb

# Compare LLaMA-3-70B (80 layers, head_dim=128, FP16):
# GQA (8 KV heads) vs MHA (64 KV heads)
llama3_gqa = calculate_kv_cache_gb(batch_size=32, seq_len=4096, num_layers=80, num_kv_heads=8, head_dim=128)
llama3_mha = calculate_kv_cache_gb(batch_size=32, seq_len=4096, num_layers=80, num_kv_heads=64, head_dim=128)

print(f"LLaMA-3-70B GQA KV-Cache (Batch 32, 4k Context): {llama3_gqa:.2f} GB VRAM")
print(f"LLaMA-3-70B MHA KV-Cache (Batch 32, 4k Context): {llama3_mha:.2f} GB VRAM")
```

# The Memory Bandwidth Roofline Model

During token decoding ($B=1$), arithmetic intensity is extremely low:
$$\text{Arithmetic Intensity} = \frac{\text{FLOPs}}{\text{Bytes Fetched from HBM}} \approx 1.0 \text{ FLOP / Byte}$$

Because modern GPUs have massive compute (e.g. NVIDIA H100 = 1,000 TFLOPs FP16) but limited memory bandwidth (3.35 TB/s HBM3), the GPU is **stalled 99% of the time waiting for memory transfers**.

$$\text{Maximum Decode Token Rate} = \frac{\text{GPU Memory Bandwidth (Bytes/sec)}}{\text{Model Parameters (Bytes)} + \text{KV-Cache per token (Bytes)}}$$

For a 70B model in FP16 (140 GB) on an H100 (3,350 GB/s):
$$\text{Theoretical Max Rate} = \frac{3350 \text{ GB/s}}{140 \text{ GB}} \approx 23.9 \text{ tokens/sec per stream}$$

# Exercises & Challenges

**🟢 Challenge 1**: Calculate the KV-cache savings when quantizing the KV-cache from FP16 (2 bytes) to FP8 (1 byte) on a batch of 64 requests with 8k context.

**🟡 Challenge 2**: Write a PyTorch attention function that takes cached key-value tensors `past_key_values`, concatenates new key-values, and returns updated cache buffers.

**🔴 Challenge 3**: Implement a continuous batching simulator in Python that tracks total GPU VRAM consumed by dynamically growing KV-caches across asynchronous requests.
""")

# ==============================================================================
# CHAPTER 34: DENSE RETRIEVAL & CONTRASTIVE LOSS
# ==============================================================================

write_file(r"content/part-05-information-retrieval/chapter-34-dense-retrieval/34.1-bi-encoders-cross-encoders.md", r"""---
id: "34.1"
part: 5
chapter: 34
title: "Dense Embeddings: Bi-Encoder vs Cross-Encoder Architectures"
slug: "bi-encoders-cross-encoders"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["24.1", "33.1"]
tags: ["bi-encoder", "cross-encoder", "dense-retrieval", "embeddings", "ranking"]
status: "published"
---

# Architecture Comparison: Bi-Encoders vs Cross-Encoders

In modern neural information retrieval and RAG search pipelines, two core Transformer architectures are used in complementary two-stage cascades:

```mermaid
flowchart TD
    subgraph Stage1 ["Stage 1: Bi-Encoder Retrieval (Scale: Millions of Documents in Milliseconds)"]
        Query["Query q"] --> EncQ["Encoder E_q"] --> VecQ["Vector e_q [d]"]
        Doc["Document d"] --> EncD["Encoder E_d"] --> VecD["Vector e_d [d]"]
        VecQ --> DotProd["Cosine / Dot Product: Score = e_q . e_d (Sub-millisecond ANN Vector Search)"]
        VecD --> DotProd
    end

    subgraph Stage2 ["Stage 2: Cross-Encoder Reranking (Scale: Top-50 Candidates with Full Token Attention)"]
        PairInput["Concatenated Input: [CLS] Query [SEP] Document [SEP]"] --> FullAttn["Cross-Encoder (Full NxN All-to-All Token Attention)"]
        FullAttn --> HighScore["Precise Relevance Score in [0, 1]"]
    end

    DotProd -. Top 50 Chunks .-> PairInput
```

# Tradeoff Analysis Table

| Characteristic | Bi-Encoder (Dense Embeddings) | Cross-Encoder (Reranker) |
|---|---|---|
| **Input Format** | Query and Document encoded **separately** | Query and Document encoded **together** |
| **Token Interaction** | None (only late dot product of pooled vectors) | **Full all-to-all cross-attention** between query and doc tokens |
| **Precomputation** | Document embeddings precomputed & indexed in Vector DB | **Cannot precompute** (requires runtime query concatenation) |
| **Search Speed** | **$< 5\text{ ms}$ across 10,000,000 documents** via HNSW | $\approx 50\text{ ms}$ for 50 documents |
| **Accuracy / NDCG@10** | High (80-85%) | **State-of-the-Art (92-96%)** |
| **Primary Role** | First-stage coarse retrieval candidate generation | Second-stage precision reranking |

# The InfoNCE Contrastive Loss

Bi-Encoders are trained using the **InfoNCE (Noise-Contrastive Estimation) Loss**. Given query $q_i$, positive passage $p_i^+$, and $K$ negative passages $\{p_{i, j}^-\}_{j=1}^K$:

$$\mathcal{L}_{\text{InfoNCE}} = -\log \frac{e^{\text{sim}(q_i, p_i^+) / \tau}}{e^{\text{sim}(q_i, p_i^+) / \tau} + \sum_{j=1}^K e^{\text{sim}(q_i, p_{i, j}^-) / \tau}}$$

```mermaid
flowchart LR
    BatchQueries["Batch of B Queries"] --> EmbedQ["Encode: Q [B, d]"]
    BatchPassages["Batch of B Passages"] --> EmbedP["Encode: P [B, d]"]
    EmbedQ --> SimMatrix["Similarity Matrix: S = (Q @ P^T) / tau [B x B]"]
    EmbedP --> SimMatrix
    SimMatrix --> InBatchLoss["In-Batch Negative Cross-Entropy:<br>Diagonal elements = Positives, Off-diagonals = Negatives!"]
```

# Python PyTorch Implementation of In-Batch InfoNCE Loss

```python
import torch
import torch.nn.functional as F

def in_batch_infonce_loss(query_embeddings, doc_embeddings, temperature=0.05):
    # Normalize vectors to unit sphere
    q_norm = F.normalize(query_embeddings, p=2, dim=1)
    d_norm = F.normalize(doc_embeddings, p=2, dim=1)
    
    # Compute similarity matrix [B, B]
    sim_matrix = torch.matmul(q_norm, d_norm.T) / temperature
    
    # Target indices: diagonal entries (i, i) are matching positives
    targets = torch.arange(query_embeddings.size(0), device=query_embeddings.device)
    
    # Symmetric Cross-Entropy Loss
    loss_q2d = F.cross_entropy(sim_matrix, targets)
    loss_d2q = F.cross_entropy(sim_matrix.T, targets)
    return (loss_q2d + loss_d2q) / 2.0

# Verify loss
B, dim = 8, 128
q_emb = torch.randn(B, dim)
d_emb = q_emb + 0.1 * torch.randn(B, dim)  # Noisy positives
loss = in_batch_infonce_loss(q_emb, d_emb)
print(f"In-Batch InfoNCE Loss: {loss.item():.4f}")
```

# Exercises & Challenges

**🟢 Challenge 1**: Explain why "Hard Negative Mining" (using BM25 top results that do not contain the answer) is crucial for training high-performance embedding models.

**🟡 Challenge 2**: Build a 2-stage retrieval pipeline using `sentence-transformers` for embedding search and `bge-reranker-large` for Cross-Encoder scoring.

**🔴 Challenge 3**: Implement Matryoshka Representation Learning (MRL) loss allowing 1024-dimension embeddings to be truncated to 128 dimensions with $<2\%$ drop in retrieval accuracy.
""")

# ==============================================================================
# CHAPTER 39: ADVANCED RETRIEVAL & COLBERT LATE INTERACTION
# ==============================================================================

write_file(r"content/part-06-rag/chapter-39-advanced-retrieval/39.3-colbert-late-interaction.md", r"""---
id: "39.3"
part: 6
chapter: 39
title: "ColBERT: Late Interaction Token-Level MaxSim Search"
slug: "colbert-late-interaction"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["34.1", "25.1"]
tags: ["colbert", "late-interaction", "maxsim", "rag", "dense-retrieval"]
status: "published"
---

# The Information Bottleneck of Single-Vector Embeddings

Standard dense retrieval compresses an entire 500-word document chunk into a **single 1024-dimensional vector**, causing severe loss of fine-grained entity and numerical detail.

**ColBERT (Contextualized Late Interaction over BERT)** (Khattab & Zaharia, Stanford) preserves **every token embedding** of both query and document, computing relevance via the **MaxSim** operator.

```mermaid
flowchart TD
    subgraph ColBERT_Indexing ["Document Token Indexing (Offline)"]
        DocText["Document D: 'Transformer attention tiles GPU SRAM'"] --> DocBERT["BERT Encoder E_d"]
        DocBERT --> DocVectors["Doc Token Vectors: [d_0, d_1, d_2, d_3, d_4] [D_len, 128]"]
        DocVectors --> IndexDB["Pisa / PLAID Centroid Inverted Index"]
    end

    subgraph ColBERT_Querying ["Late Interaction Querying (Runtime)"]
        QueryText["Query Q: 'GPU SRAM tiling'"] --> QueryBERT["BERT Encoder E_q"]
        QueryBERT --> QueryVectors["Query Token Vectors: [q_0, q_1, q_2] [Q_len, 128]"]
        QueryVectors --> MaxSimMatrix["MaxSim Operator: For each query token q_i,<br>find max dot-product across all doc tokens d_j"]
        IndexDB --> MaxSimMatrix
        MaxSimMatrix --> SumScores["Sum of Max Similarities = Final Document Relevance Score"]
    end
```

# The Mathematical MaxSim Formula

The ColBERT similarity score between query $Q$ and document $D$ is:

$$\text{Score}(Q, D) = \sum_{i \in Q} \max_{j \in D} \left( E_q(q_i) \cdot E_d(d_j)^T \right)$$

```mermaid
flowchart LR
    Q_token["Query Token q_i ('SRAM')"] --> CompAll["Compute dot products with all Doc tokens: [d_0, d_1, d_2, d_3]"]
    CompAll --> TakeMax["max(q_i . d_j) = 0.94 (Matches doc token 'SRAM')"]
    TakeMax --> Accumulate["Add to Total Query Score"]
```

# Pure Python Vectorized MaxSim Implementation

```python
import torch
import torch.nn.functional as F

def colbert_maxsim(query_token_embeddings, doc_token_embeddings):
    # query_tokens: [Q_len, dim]
    # doc_tokens: [D_len, dim]
    
    # 1. Normalize token vectors
    q_norm = F.normalize(query_token_embeddings, p=2, dim=-1)
    d_norm = F.normalize(doc_token_embeddings, p=2, dim=-1)
    
    # 2. Compute token-to-token similarity matrix [Q_len, D_len]
    sim_matrix = torch.matmul(q_norm, d_norm.T)
    
    # 3. For each query token, take maximum similarity across all document tokens
    max_sim_per_query_token, _ = torch.max(sim_matrix, dim=-1)  # [Q_len]
    
    # 4. Sum maximum scores across all query tokens
    colbert_score = torch.sum(max_sim_per_query_token)
    return colbert_score.item()

# Test MaxSim with 4 query tokens and 8 doc tokens
Q_len, D_len, dim = 4, 8, 128
q_tokens = torch.randn(Q_len, dim)
d_tokens = torch.randn(D_len, dim)

score = colbert_maxsim(q_tokens, d_tokens)
print(f"ColBERT Late-Interaction MaxSim Score: {score:.4f}")
```

# The PLAID Engine (Performance & Memory Compression)

Storing 128-dimensional vectors for billions of document tokens would require petabytes of RAM. 

ColBERTv2 uses **PLAID (Performance-optimized Late Interaction for Asymmetric Information Distribution)**:
1. **Centroid Residual Quantization**: Quantizes token embeddings into nearest centroid ID (16 bits) + 2-bit residual vector.
2. **Pruning & Interleaved Search**: Evaluates candidates by searching only the top 10% most relevant centroid postings lists, achieving sub-20ms latency.

# Exercises & Challenges

**🟢 Challenge 1**: Verify why ColBERT is significantly more expressive than single-vector bi-encoders on multi-hop questions with multiple constraints.

**🟡 Challenge 2**: Implement the Reciprocal Rank Fusion (RRF) algorithm to combine ranks from ColBERT and BM25: $RRF(d) = \sum_{m} \frac{1}{60 + r_m(d)}$.

**🔴 Challenge 3**: Implement a quantized vector index for ColBERT token embeddings using k-means clustering centroids and residual 2-bit quantization.
""")

# ==============================================================================
# CHAPTER 50: MULTI-AGENT ARCHITECTURES & PATTERNS
# ==============================================================================

write_file(r"content/part-08-autonomous-agents/chapter-50-multi-agent/50.1-multi-agent-topologies.md", r"""---
id: "50.1"
part: 8
chapter: 50
title: "Multi-Agent System Topologies: Supervisor, Peer-to-Peer & Hierarchical"
slug: "multi-agent-topologies"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["48.1", "49.1"]
tags: ["multi-agent", "supervisor-pattern", "hierarchical", "routing", "langgraph"]
status: "published"
---

# Why Multi-Agent Systems Outperform Monolithic Prompts

A single LLM prompt attempting to handle research, code generation, testing, documentation, and security auditing quickly suffers from **context pollution, prompt confusion, and high error propagation**.

Multi-agent architectures partition complex problem spaces into **specialized autonomous roles** with distinct system prompts, targeted tools, and isolated memory scopes.

```mermaid
flowchart TD
    subgraph Pattern1 ["1. Centralized Supervisor Pattern"]
        UserGoal["User Request"] --> Super["Supervisor / Router LLM"]
        Super -->|Delegates Task A| Agent1["Research Agent (Search Tools)"]
        Super -->|Delegates Task B| Agent2["Coder Agent (Terminal/Python)"]
        Super -->|Delegates Task C| Agent3["Reviewer Agent (Linter Tools)"]
        Agent1 -. Returns Results .-> Super
        Agent2 -. Returns Code .-> Super
        Agent3 -. Returns Audit .-> Super
        Super --> FinalResp["Final Consolidated Response"]
    end

    subgraph Pattern2 ["2. Hierarchical Swarm with Subagents"]
        Boss["Lead Architect Agent"] --> LeadA["Team Lead (Backend)"]
        Boss --> LeadB["Team Lead (Frontend)"]
        LeadA --> Worker1["DB Subagent"]
        LeadA --> Worker2["API Subagent"]
        LeadB --> Worker3["UI Subagent"]
    end
```

# The 3 Core Multi-Agent Topologies

| Topology | Control Flow | Communication Protocol | Best Use Cases |
|---|---|---|---|
| **Supervisor / Router** | Centralized orchestrator directs workers sequentially or conditionally | State dictionary passed through supervisor | Customer support triage, standard analytical tasks |
| **Peer-to-Peer Collaborative** | Agents hand off control dynamically via shared state | Direct agent-to-agent message passing | Debate systems, brainstorming, pair-programming |
| **Hierarchical Swarm** | Nested trees of supervisors and specialized worker subagents | Isolated subgraphs with state aggregation | Complex software engineering projects, automated research |

# Pure Python Supervisor Multi-Agent Orchestrator

```python
from typing import Dict, Any

class AgentWorker:
    def __init__(self, name: str, role_prompt: str):
        self.name = name
        self.role_prompt = role_prompt

    def execute(self, task: str) -> str:
        # Mock LLM generation for demonstration
        if self.name == "Researcher":
            return f"[Researcher Result]: Found 3 relevant papers on FlashAttention-3."
        elif self.name == "Coder":
            return f"[Coder Result]: Implemented FlashAttention forward kernel in PyTorch."
        elif self.name == "Reviewer":
            return f"[Reviewer Result]: Code passed all unit tests and memory bounds."
        return "Unknown task"

class SupervisorOrchestrator:
    def __init__(self):
        self.workers = {
            "research": AgentWorker("Researcher", "You search literature."),
            "code": AgentWorker("Coder", "You write Python code."),
            "review": AgentWorker("Reviewer", "You audit code.")
        }

    def route_plan(self, plan: list[str]) -> list[str]:
        results = []
        for step in plan:
            if "literature" in step or "search" in step:
                res = self.workers["research"].execute(step)
            elif "implement" in step or "code" in step:
                res = self.workers["code"].execute(step)
            elif "audit" in step or "review" in step:
                res = self.workers["review"].execute(step)
            else:
                res = "Step skipped"
            results.append(res)
        return results

supervisor = SupervisorOrchestrator()
execution_trace = supervisor.route_plan([
    "search literature for FlashAttention algorithms",
    "implement kernel in code",
    "review code quality"
])

for step in execution_trace:
    print(step)
```

# Communication Protocols & Deadlock Prevention

In autonomous multi-agent networks, loops and circular delegations can trigger infinite billing loops and deadlocks.

```mermaid
flowchart LR
    AgentA["Agent A (Coder)"] -->|Asks Review| AgentB["Agent B (Reviewer)"]
    AgentB -->|Requests Fix| AgentA
    AgentA -.->|Infinite Loop Trap!| AgentB
    AgentB -->|Guardrail: Max Recursion Limit = 5| Abort["Halt & Alert Human Supervisor"]
```

### Essential Guardrails:
1. **Strict Recursion Limits**: Enforce `max_iterations = 10` on any cyclic state graph.
2. **State Immutability & Audit Trail**: Keep append-only message logs with author identity tags (`sender: 'Coder'`).
3. **Structured Handoff Contracts**: Require agents to output typed Pydantic routing decisions (`NextStep(target="Coder", reason="Syntax error on line 42")`).

# Exercises & Challenges

**🟢 Challenge 1**: Implement a dynamic supervisor in LangGraph that routes tasks between a math calculator agent and a web search agent based on user query classification.

**🟡 Challenge 2**: Build an adversarial 2-agent debate system where an Advocate agent and a Skeptic agent critique a technical proposal across 3 rounds before a Judge outputs a summary score.

**🔴 Challenge 3**: Implement a distributed multi-agent system with asynchronous message queues (Redis / RabbitMQ) supporting task timeout retries and distributed tracing.
""")

# ==============================================================================
# CHAPTER 60: MULTIMODAL VISION-LANGUAGE MODELS (VLMS)
# ==============================================================================

write_file(r"content/part-10-evaluation-research/chapter-60-multimodal-frontier/60.1-vision-language-models.md", r"""---
id: "60.1"
part: 10
chapter: 60
title: "Vision-Language Models (VLMs): CLIP, LLaVA & Cross-Modal Projection"
slug: "vision-language-models"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["26.1", "34.1"]
tags: ["vlm", "clip", "llava", "multimodal", "vision-transformers"]
status: "published"
---

# Multimodal Architecture: Bridging Pixels and Tokens

Modern Vision-Language Models (such as **LLaVA, GPT-4o, and Claude 3.5 Sonnet**) process image pixels by projecting visual patches into the **same token embedding space** used by the text Transformer backbone.

```mermaid
flowchart TD
    subgraph VisionEncoder ["1. Vision Encoder (Vision Transformer - ViT)"]
        RawImage["Raw Image [384 x 384 x 3]"] --> Patchify["Split into 14x14 Patches (576 patches)"]
        Patchify --> ViT["Vision Transformer (e.g. CLIP ViT-L/14)"]
        ViT --> VisionEmbeds["Vision Feature Tokens: [576, 1024]"]
    end

    subgraph MultimodalProjector ["2. Multimodal Projector (Linear / 2-Layer MLP)"]
        VisionEmbeds --> Projector["Linear / MLP Projection: W_proj [1024 -> 4096]"]
        Projector --> VisualTokens["Visual Tokens: [576, 4096]<br>(Identical dimension to text embeddings!)"]
    end

    subgraph LLM_Backbone ["3. Autoregressive LLM Backbone (e.g. LLaMA-3-8B)"]
        TextPrompt["User Prompt: 'Describe this image'"] --> TextEmb["Text Embeddings: [5, 4096]"]
        VisualTokens --> ConcatSequence["Concatenated Input: [Visual Tokens (576)] + [Text Tokens (5)]"]
        TextEmb --> ConcatSequence
        ConcatSequence --> TransformerLayers["Standard Transformer Blocks (Self-Attention over image + text)"]
        TransformerLayers --> OutputText["Generated Text: 'A diagram showing FlashAttention...'"]
    end
```

# Contrastive Vision-Language Pre-training: The CLIP Objective

**CLIP (Contrastive Language-Image Pre-training)** (Radford et al., OpenAI 2021) trains a Vision Encoder $E_V$ and Text Encoder $E_T$ on 400 million image-text pairs using symmetric cross-entropy loss:

$$\mathcal{L}_{\text{CLIP}} = \frac{1}{2} \left( \mathcal{L}_{I \to T} + \mathcal{L}_{T \to I} \right)$$

```mermaid
flowchart LR
    BatchImages["Batch of B Images"] --> EncImg["Vision Encoder E_V"] --> ImgVecs["Image Vectors: I [B, d]"]
    BatchTexts["Batch of B Captions"] --> EncTxt["Text Encoder E_T"] --> TxtVecs["Text Vectors: T [B, d]"]
    ImgVecs --> SimMat["Cross-Modal Cosine Matrix: S = (I @ T^T) / tau [B x B]"]
    TxtVecs --> SimMat
    SimMat --> DiagonalPositives["Maximize diagonal (matching image-caption pairs)<br>Minimize off-diagonals (non-matching pairs)"]
```

# Pure PyTorch Cross-Modal Linear Projector

```python
import torch
import torch.nn as nn

class SimpleVLMConnector(nn.Module):
    def __init__(self, vision_dim: int = 1024, llm_dim: int = 4096):
        super().__init__()
        # 2-Layer MLP Projector with GeLU non-linearity (LLaVA-1.5 style)
        self.projector = nn.Sequential(
            nn.Linear(vision_dim, llm_dim, bias=False),
            nn.GELU(),
            nn.Linear(llm_dim, llm_dim, bias=False)
        )

    def forward(self, vision_features: torch.Tensor, text_embeddings: torch.Tensor):
        # vision_features: [B, num_patches=576, 1024]
        # text_embeddings: [B, text_seq_len=12, 4096]
        
        # 1. Project visual tokens into LLM hidden space
        visual_tokens = self.projector(vision_features)  # [B, 576, 4096]
        
        # 2. Concatenate along sequence dimension
        multimodal_sequence = torch.cat([visual_tokens, text_embeddings], dim=1) # [B, 588, 4096]
        return multimodal_sequence

# Verify Projector
connector = SimpleVLMConnector(vision_dim=1024, llm_dim=4096)
img_feats = torch.randn(2, 576, 1024)
txt_embeds = torch.randn(2, 12, 4096)
fused_sequence = connector(img_feats, txt_embeds)
print("Fused Multimodal Sequence Shape:", fused_sequence.shape)  # [2, 588, 4096]
```

# High-Resolution Image Processing: AnyRes Tiling

Processing high-resolution images (e.g. $1024 \times 1024$) by downsampling to $384 \times 384$ destroys small text, charts, and fine visual details.

Modern VLMs use **AnyRes Tiling**:
1. Crop image into multiple $384 \times 384$ sub-grid tiles + 1 global thumbnail image.
2. Forward each tile independently through the Vision Transformer.
3. Arrange tile tokens into a 2D spatial grid with newline separator tokens.

# Exercises & Challenges

**🟢 Challenge 1**: Calculate the total number of visual tokens injected into the LLM context when an image is split into a $2 \times 2$ grid of $384 \times 384$ tiles with a $14 \times 14$ ViT patch size.

**🟡 Challenge 2**: Implement Zero-Shot Image Classification in Python using pre-trained CLIP weights and text prompts: `"A photo of a {label}"`.

**🔴 Challenge 3**: Implement a Cross-Attention vision-language layer (Flamingo style) where text tokens attend to visual feature maps via gated cross-attention.
""")

print("Rich architecture and visual deep-dive lessons successfully generated!")
