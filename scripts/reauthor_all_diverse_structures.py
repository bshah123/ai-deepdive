import os
import json
import re

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# 1. CHAPTER 23: TOKENIZATION (GeeksforGeeks / Algorithmic Style)
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-23-tokenization/23.2-wordpiece-sentencepiece.md", r"""---
id: "23.2"
part: 4
chapter: 23
title: "WordPiece & SentencePiece Tokenization Algorithms"
slug: "wordpiece-sentencepiece"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["23.1"]
tags: ["wordpiece", "sentencepiece", "unigram", "bert", "t5"]
status: "published"
---

# Problem Statement: Subword Tokenization Beyond Frequency

While Byte-Pair Encoding (BPE) greedily merges the most *frequent* adjacent character pair, frequency alone is not optimal for statistical language modeling. 

**WordPiece (BERT)** and **SentencePiece (T5, LLaMA)** introduce likelihood-driven optimization and raw whitespace-independent stream tokenization:

```mermaid
flowchart LR
    subgraph Algorithms ["Subword Algorithm Comparison"]
        BPE["BPE (GPT-2/3/4)<br>Merge rule: Maximize pair frequency count"]
        WP["WordPiece (BERT)<br>Merge rule: Maximize mutual information / language model likelihood"]
        SP["SentencePiece (T5, LLaMA)<br>Treats input as raw byte stream; preserves whitespace as '_'"]
    end
```

# WordPiece Algorithm Walkthrough (BERT)

WordPiece chooses the subword pair $(u, v)$ that maximizes the **Likelihood Increase** of the language model when merged:

$$\text{Score}(u, v) = \frac{\text{count}(uv)}{\text{count}(u) \times \text{count}(v)}$$

Notice that this is proportional to the **Pointwise Mutual Information (PMI)** between tokens $u$ and $v$. If two tokens only appear together, their score is extremely high even if their raw count is moderate.

### Prefix Annotation: `##` Markers
WordPiece marks continuation subwords with `##`:
- Input: `"unaffable"`
- Tokenized: `["un", "##aff", "##able"]`

# SentencePiece & Unigram Language Model Tokenization

Unlike BPE and WordPiece (which require whitespace-based pre-tokenization and fail on languages without spaces like Chinese and Japanese), **SentencePiece**:
1. Treats the entire input sentence as a raw sequence of Unicode characters.
2. Replaces spaces with a dedicated meta-symbol `_` (U+2581).
3. Applies either BPE or the **Unigram Language Model algorithm** (Kudo, 2018).

```mermaid
flowchart TD
    RawInput["Raw String: 'Hello world'"] --> Preprocess["SentencePiece: ' Hello world'"]
    Preprocess --> Viterbi["Viterbi Decoding: Find highest probability subword segmentation"]
    Viterbi --> Subwords["Segmented Output: [' Hello', ' world']"]
    Subwords --> Reversible["Lossless Reversible: Replace ' ' with space -> 'Hello world'"]
```

# Algorithm Comparison Table

| Algorithm | Base Unit | Selection Criterion | Handling Continuation | Reversibility | Used In |
|---|---|---|---|---|---|
| **BPE** | Characters / Bytes | Raw Pair Frequency | Byte-level merges | Lossless (Byte-level) | GPT-4, LLaMA-3 |
| **WordPiece** | Characters | Maximum Likelihood (PMI) | `##` prefix | Lossy whitespace | BERT, DistilBERT |
| **Unigram LM** | Pruned Vocab | Expected Likelihood reduction | None (`_` symbol) | **100% Lossless** | T5, ALBERT, Gemma |

# Python Implementation: SentencePiece Whitespace Reversibility

```python
def sentencepiece_encode(text: str) -> list[str]:
    # Replace whitespace with underscore meta-symbol U+2581
    normalized = text.replace(" ", " ")
    if not normalized.startswith(" "):
        normalized = " " + normalized
    return normalized

def sentencepiece_decode(tokens: list[str]) -> str:
    # Lossless detokenization
    full_text = "".join(tokens)
    return full_text.replace(" ", " ").strip()

sample = "AI systems rely on tokenizers."
encoded = sentencepiece_encode(sample)
print("Encoded stream:", encoded)
decoded = sentencepiece_decode([encoded])
print("Decoded back:", decoded)
print("Perfect match?", decoded == sample)
```

# Exercises & Hands-On Challenges

**🟢 Challenge 1**: Trace the WordPiece scoring formula on bigrams where $\text{count}(u)=100, \text{count}(v)=100, \text{count}(uv)=90$ versus $\text{count}(u)=10000, \text{count}(v)=10000, \text{count}(uv)=90$.

**🟡 Challenge 2**: Implement the Viterbi dynamic programming search to find the optimal Unigram subword path given a dictionary of token log-probabilities.

**🔴 Challenge 3**: Train a SentencePiece Unigram model on a multilingual text dataset using the `sentencepiece` Python library and analyze subword fertility across English, Japanese, and Python code.
""")

# ==============================================================================
# 2. CHAPTER 24: EMBEDDINGS (Research & Physics Style)
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-24-embeddings/24.1-token-embeddings.md", r"""---
id: "24.1"
part: 4
chapter: 24
title: "Token Embeddings, Weight Tying & Semantic Vector Geometry"
slug: "token-embeddings"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["23.1", "20.1"]
tags: ["embeddings", "weight-tying", "vector-geometry", "cosine-similarity"]
status: "published"
---

# The Mathematical Embedding Lookup Operator

A Token Embedding layer is fundamentally a matrix multiplication against a one-hot vector:

$$e_t = W_E^T \mathbf{1}_{x_t}, \quad \text{where } W_E \in \mathbb{R}^{V \times d}$$

Because one-hot matrix multiplication is computationally wasteful, PyTorch's `nn.Embedding` implements this as an $O(1)$ **indexed row lookup**:

```mermaid
flowchart LR
    TokenID["Token ID: 1549 (' neural')"] --> Lookup["Table Lookup: W_E[1549, :]"]
    EmbeddingTable["Embedding Matrix W_E<br>[Vocab_Size=128256, Dim=4096]<br>(2.1 GB VRAM in FP32)"] --> Lookup
    Lookup --> DenseVector["Dense Latent Vector e_t [4096]<br>[-0.042, 0.183, ..., -0.012]"]
```

# Weight Tying: Sharing Input & Output Matrices

In language modeling, the model must map token IDs to hidden states (Input Embedding $W_E \in \mathbb{R}^{V \times d}$) and map hidden states back to vocabulary logits (LM Head $W_{\text{head}} \in \mathbb{R}^{V \times d}$).

**Weight Tying** (Press & Wolf, 2017) sets:

$$W_{\text{head}} = W_E$$

```mermaid
flowchart TD
    InputIDs["Input Token IDs"] -->|Embed with W_E| HiddenStates["Transformer Hidden States h [B, S, d]"]
    HiddenStates -->|Project with W_E^T| Logits["Output Vocabulary Logits: z = h @ W_E^T [B, S, V]"]
```

### Benefits of Weight Tying:
1. **Halves Vocabulary Parameter Footprint**: For a 128,000 token vocabulary and $d=4096$, saving one matrix eliminates **524 million parameters** (~1.05 GB VRAM).
2. **Dual Semantic Constraint**: Forces token representations that produce similar context embeddings to also predict similar output distributions.

# Vector Space Geometry & Semantic Arithmetic

Embedding spaces organize concepts as geometric vectors where semantic relationships correspond to linear translations:

$$\vec{v}_{\text{King}} - \vec{v}_{\text{Man}} + \vec{v}_{\text{Woman}} \approx \vec{v}_{\text{Queen}}$$

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

# Creating an Embedding Layer with Weight Tying
class TiedLanguageModelHead(nn.Module):
    def __init__(self, vocab_size: int = 32000, d_model: int = 4096):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        # Weight tying: LM head shares the exact same tensor memory
        self.lm_head_weight = self.embedding.weight

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        # Compute logits via linear projection using tied weights: [B, S, d] @ [d, V] -> [B, S, V]
        return F.linear(hidden_states, self.lm_head_weight)

model = TiedLanguageModelHead()
hidden = torch.randn(2, 8, 4096)
logits = model(hidden)
print("Logits Shape:", logits.shape)  # [2, 8, 32000]
print("Tied parameter sharing verified?", model.embedding.weight.data_ptr() == model.lm_head_weight.data_ptr())
```

# Exercises & Challenges

**🟢 Challenge 1**: Compute the memory footprint (in MB) of an embedding layer with $\text{vocab\_size}=128,000$ and $d=4096$ in FP16 precision.

**🟡 Challenge 2**: Verify that initializing embedding weights with $\mathcal{N}(0, \frac{1}{\sqrt{d}})$ preserves unit variance across the input representations.

**🔴 Challenge 3**: Implement a PyTorch module that measures the cosine similarity matrix between all token embeddings and identifies semantic clusters using k-means.
""")

# ==============================================================================
# 3. CHAPTER 27: GPT INFERENCE & SAMPLING (Interactive Systems Style)
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-27-gpt-decoder-llms/27.3-logit-sampling.md", r"""---
id: "27.3"
part: 4
chapter: 27
title: "Logit Sampling: Temperature, Top-K, Top-P (Nucleus) & Min-P"
slug: "logit-sampling"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["27.1", "19.2"]
tags: ["sampling", "temperature", "top-p", "top-k", "min-p", "generation"]
status: "published"
---

# The Output Logit Pipeline

During text generation, the LLM produces a raw unnormalized logit vector $z \in \mathbb{R}^V$ for the next token. Before drawing a sample, logits are filtered through a multi-stage decoding pipeline:

```mermaid
flowchart LR
    RawLogits["1. Raw Logits z [Vocab_Size]"] --> Temp["2. Temperature Scaling: z / T"]
    Temp --> Filter1["3. Top-K Truncation: Keep K highest logits"]
    Filter1 --> Filter2["4. Top-P (Nucleus) / Min-P Filtering"]
    Filter2 --> Softmax["5. Renormalize with Softmax"]
    Softmax --> Multinomial["6. Multinomial Categorical Sampling"]
    Multinomial --> NextToken["Selected Token ID"]
```

# Parameter Deep Dive

### 1. Temperature Scaling ($T$)
Modulates the sharpness of the probability distribution:
$$p_i = \frac{e^{z_i / T}}{\sum_j e^{z_j / T}}$$

- **$T \to 0$ (Greedy Decoding)**: Probability of the top logit approaches 1.0; deterministic, repetitive.
- **$T = 1.0$**: Unmodified model probability distribution.
- **$T > 1.0$**: Flattens distribution, increasing entropy and creative divergence.

### 2. Top-K Sampling
Restricts sampling to strictly the $K$ most probable tokens ($K \in [20, 100]$), setting all other logits to $-\infty$.

### 3. Top-P (Nucleus) Sampling (Holtzman et al., 2020)
Dynamically selects the smallest set of tokens whose cumulative probability exceeds threshold $P \in [0.8, 0.95]$:

$$\sum_{i \in \text{Nucleus}} p_i \ge P$$

### 4. Min-P Sampling (Modern Frontier Alternative)
Truncates all tokens whose probability is less than a fraction $p_{\text{min}}$ of the top token's probability:

$$\text{Keep tokens where } p_i \ge p_{\text{min}} \times p_{\max}$$

```mermaid
flowchart TD
    TopToken["Top Token Probability: p_max = 0.60"] --> MinPCalc["Min-P Threshold (min_p = 0.05):<br>Cutoff = 0.05 * 0.60 = 0.03"]
    MinPCalc --> Keep["Keep token A (0.25 >= 0.03) and token B (0.10 >= 0.03)"]
    MinPCalc --> Drop["Discard token C (0.01 < 0.03) - Eliminated noise!"]
```

# Production Python Sampling Function

```python
import torch
import torch.nn.functional as F

def sample_next_token(
    logits: torch.Tensor,
    temperature: float = 0.7,
    top_k: int = 50,
    top_p: float = 0.9,
    min_p: float = 0.05
) -> int:
    # 1. Apply Temperature
    logits = logits / max(temperature, 1e-5)

    # 2. Top-K filtering
    if top_k > 0:
        top_k_val = min(top_k, logits.size(-1))
        indices_to_remove = logits < torch.topk(logits, top_k_val)[0][..., -1, None]
        logits[indices_to_remove] = float('-inf')

    # 3. Softmax probabilities
    probs = F.softmax(logits, dim=-1)

    # 4. Min-P filtering
    if min_p > 0.0:
        p_max = torch.max(probs, dim=-1, keepdim=True)[0]
        min_p_threshold = p_max * min_p
        probs[probs < min_p_threshold] = 0.0
        probs = probs / probs.sum(dim=-1, keepdim=True)  # Renormalize

    # 5. Top-P (Nucleus) filtering
    if top_p < 1.0:
        sorted_probs, sorted_indices = torch.sort(probs, descending=True)
        cumulative_probs = torch.cumsum(sorted_probs, dim=-1)
        sorted_indices_to_remove = cumulative_probs > top_p
        # Shift right to keep first token above threshold
        sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
        sorted_indices_to_remove[..., 0] = False
        sorted_probs[sorted_indices_to_remove] = 0.0
        probs = torch.zeros_like(probs).scatter_(-1, sorted_indices, sorted_probs)
        probs = probs / probs.sum(dim=-1, keepdim=True)  # Renormalize

    # 6. Sample categorical
    next_token = torch.multinomial(probs, num_samples=1)
    return next_token.item()

# Test sampler
mock_logits = torch.tensor([2.0, 5.0, 1.0, 0.5, 4.5])
sampled_token = sample_next_token(mock_logits, temperature=0.8, top_p=0.9, min_p=0.05)
print("Sampled Token Index:", sampled_token)
```

# Comparison of Sampling Configurations

| Use Case | Temperature | Top-P | Min-P | Rationale |
|---|---|---|---|---|
| **Code Generation / Math** | $0.0 - 0.2$ | $0.95$ | $0.05$ | Precision, deterministic syntax, minimal hallucination |
| **Factual QA / Summarization** | $0.3 - 0.5$ | $0.90$ | $0.05$ | Balanced accuracy with natural prose flow |
| **Creative Writing / Brainstorming** | $0.8 - 1.0$ | $0.95$ | $0.02$ | High entropy, novel associative word choices |

# Exercises & Challenges

**🟢 Challenge 1**: Trace why setting $T=0.01$ causes the output to degenerate into greedy selection without needing `torch.argmax`.

**🟡 Challenge 2**: Implement Repetition Penalty: $z_i = z_i / \theta$ for $z_i > 0$ and $z_i = z_i \times \theta$ for $z_i < 0$ for all tokens already generated in the context window.

**🔴 Challenge 3**: Implement Speculative Decoding draft verification using logit acceptance criteria: $\alpha = \min\left(1, \frac{P_{\text{target}}(x)}{P_{\text{draft}}(x)}\right)$.
""")

# ==============================================================================
# 4. CHAPTER 30: HUGGING FACE ECOSYSTEM (W3Schools / API Deep Dive Style)
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-30-huggingface/30.1-hf-automodel.md", r"""---
id: "30.1"
part: 4
chapter: 30
title: "Hugging Face AutoModel Architecture, Dynamic Configs & Weights Engine"
slug: "hf-automodel"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["27.1"]
tags: ["huggingface", "automodel", "transformers", "safetensors", "accelerate"]
status: "published"
---

# Architecture: The Hugging Face Polymorphic Dispatch Engine

The Hugging Face `transformers` library uses dynamic polymorphic factory classes (`AutoModel`, `AutoTokenizer`, `AutoConfig`) to inspect remote model metadata (`config.json`) and instantiate the exact architecture class:

```mermaid
flowchart TD
    ModelID["Model Identifier: 'meta-llama/Meta-Llama-3-8B'"] --> AutoConfig["AutoConfig.from_pretrained()"]
    AutoConfig --> ReadJSON["Inspect config.json: 'architectures': ['LlamaForCausalLM']"]
    ReadJSON --> RegistryLookup["Lookup in MODEL_FOR_CAUSAL_LM_MAPPING"]
    RegistryLookup --> Instantiate["Instantiate LlamaForCausalLM(config)"]
    Instantiate --> LoadWeights["Stream Weights from model.safetensors into VRAM"]
```

# API Syntax & Parameter Breakdown

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Meta-Llama-3-8B-Instruct",
    torch_dtype=torch.bfloat16,     # Load directly in 16-bit precision
    device_map="auto",              # Accelerate handles multi-GPU memory placement
    low_cpu_mem_usage=True,        # Avoid duplicating full weights in CPU RAM
    attn_implementation="flash_attention_2"  # Fused FlashAttention-2 kernel
)
```

| Parameter | Type | Default | Production Impact |
|---|---|---|---|
| `torch_dtype` | `torch.dtype` | `torch.float32` | `torch.bfloat16` cuts memory by 50% with zero loss in training dynamic range. |
| `device_map` | `str` or `dict` | `None` | `"auto"` automatically shards layers across available GPUs without manual `.to(cuda)`. |
| `low_cpu_mem_usage` | `bool` | `True` | Creates empty `meta` device tensor shells and streams weights directly, preventing CPU OOMs. |
| `attn_implementation` | `str` | `"eager"` | `"flash_attention_2"` boosts inference speed by 2x to 4x on Ampere/Hopper GPUs. |

# SafeTensors: Zero-Copy Memory-Mapped Loading

Legacy PyTorch `.bin` checkpoints used Python `pickle`, which executes arbitrary Python bytecode (severe security vulnerability) and requires reading files into CPU memory before copying to GPU.

**SafeTensors** (`.safetensors` format) provides:
1. **Security**: Pure byte buffer data format (zero code execution).
2. **Zero-Copy Memory-Mapping (`mmap`)**: Points GPU DMA directly to the OS disk cache buffer, cutting load times from minutes to seconds.

```mermaid
flowchart LR
    DiskFile["Model File on NVMe SSD (model.safetensors)"] --> MMap["OS Page Cache Memory Map (mmap)"]
    MMap --> DirectDMA["Direct Memory Access (DMA) Transfer straight to GPU VRAM!"]
    DirectDMA --> GPU_VRAM["GPU VRAM Active Tensors"]
```

# Complete Production Generation Loop

```python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

# Initialize tokenizer & model with FlashAttention-2
model_id = "Qwen/Qwen2.5-0.5B"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.float16,
    device_map="auto"
)

# Format chat prompt using Jinja2 template
messages = [
    {"role": "system", "content": "You are an expert AI systems engineer."},
    {"role": "user", "content": "Explain how FlashAttention-2 uses GPU SRAM."}
]
prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

# Generate with streaming KV-cache
with torch.no_grad():
    outputs = model.generate(
        **inputs,
        max_new_tokens=150,
        temperature=0.7,
        top_p=0.9,
        do_sample=True,
        pad_token_id=tokenizer.eos_token_id
    )

response = tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
print("Generated Response:\n", response)
```

# Exercises & Challenges

**🟢 Challenge 1**: Write a script that inspects a model's `model.config.to_dict()` and prints its hidden dimension, number of layers, attention heads, and vocabulary size.

**🟡 Challenge 2**: Implement a custom Hugging Face `TextStreamer` that prints tokens in real-time to the terminal as they are emitted from the GPU.

**🔴 Challenge 3**: Use the `accelerate` library to manually shard a 70B parameter model across 2 GPUs with custom memory limits (`max_memory={0: "40GB", 1: "40GB"}`).
""")

# ==============================================================================
# 5. CHAPTER 38: CHUNKING & INGESTION (GeeksforGeeks / Systems Style)
# ==============================================================================

write_file(r"content/part-06-rag/chapter-38-chunking-ingestion/38.1-chunking-strategies.md", r"""---
id: "38.1"
part: 6
chapter: 38
title: "Document Chunking Strategies: Fixed-Size, Recursive & Semantic"
slug: "chunking-strategies"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["37.1", "34.1"]
tags: ["chunking", "rag", "semantic-chunking", "token-overlap", "ingestion"]
status: "published"
---

# The Critical Role of Chunking in RAG

When ingesting documents into a Vector Database, chunk size determines the retrieval resolution:
- **Chunks too small (e.g. 50 tokens)**: Lose broad context, coreference resolution, and topic meaning.
- **Chunks too large (e.g. 2000 tokens)**: Dilute semantic focus, causing embeddings to be generic and noisy.

```mermaid
flowchart TD
    subgraph FixedChunking ["1. Fixed-Size Character / Token Chunking"]
        Fixed["Split every N characters strictly.<br>Problem: Splits sentences mid-word or mid-thought!"]
    end

    subgraph RecursiveChunking ["2. Recursive Character Text Splitting (Industry Standard)"]
        Recurse["Hierarchical Separators: ['\\n\\n', '\\n', '. ', ' ']<br>Keeps paragraphs and sentences intact!"]
    end

    subgraph SemanticChunking ["3. Semantic Similarity Chunking"]
        Semantic["Compute cosine distance between consecutive sentence embeddings.<br>Split at local peaks where semantic topic shifts!"]
    end
```

# Strategy Comparison Matrix

| Strategy | Speed | Context Preservation | Implementation Complexity | Best For |
|---|---|---|---|---|
| **Fixed-Size with Overlap** | Ultra-Fast | Poor (Splits sentences) | Trivial | Baseline prototypes |
| **Recursive Character** | Fast | **High (Preserves paragraphs & code blocks)** | Moderate | **General RAG, Markdown, PDFs, Code** |
| **Document-Aware (HTML/Markdown)** | Fast | High (Preserves headers & tables) | Moderate | Documentation, API reference manuals |
| **Semantic Distance** | Slow (requires LLM/embeddings) | Very High | Advanced | Narrative literature, multi-topic articles |

# Recursive Character Text Splitter Implementation

```python
import re

class RecursiveTextSplitter:
    def __init__(self, chunk_size: int = 200, chunk_overlap: int = 40, separators=None):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split_text(self, text: str) -> list[str]:
        final_chunks = []
        # Find the highest-priority separator present in the text
        separator = self.separators[-1]
        for sep in self.separators:
            if sep == "" or sep in text:
                separator = sep
                break

        splits = text.split(separator) if separator != "" else list(text)
        
        good_splits = []
        for s in splits:
            if len(s) < self.chunk_size:
                good_splits.append(s)
            else:
                # Recursively split with remaining separators
                sub_index = self.separators.index(separator) + 1
                if sub_index < len(self.separators):
                    sub_splitter = RecursiveTextSplitter(
                        self.chunk_size, self.chunk_overlap, self.separators[sub_index:]
                    )
                    good_splits.extend(sub_splitter.split_text(s))
                else:
                    good_splits.append(s)

        # Merge splits into chunks with sliding overlap
        current_chunk = []
        current_length = 0
        for s in good_splits:
            if current_length + len(s) > self.chunk_size and current_chunk:
                doc = separator.join(current_chunk)
                final_chunks.append(doc)
                # Keep overlapping elements
                while current_length > self.chunk_overlap and current_chunk:
                    popped = current_chunk.pop(0)
                    current_length -= len(popped) + len(separator)
            current_chunk.append(s)
            current_length += len(s) + len(separator)

        if current_chunk:
            final_chunks.append(separator.join(current_chunk))
        return final_chunks

# Test Recursive Splitter
doc = "FlashAttention-2 is a fast attention algorithm. It computes exact attention in SRAM.\\n\\nPagedAttention manages memory in blocks. It eliminates VRAM fragmentation in vLLM."

splitter = RecursiveTextSplitter(chunk_size=80, chunk_overlap=20)
chunks = splitter.split_text(doc)
for i, c in enumerate(chunks):
    print(f"Chunk {i+1} ({len(c)} chars):\n'{c}'\n---")
```

# Exercises & Challenges

**🟢 Challenge 1**: Explain why a 10–20% token overlap between adjacent chunks prevents information loss for sentences crossing chunk boundaries.

**🟡 Challenge 2**: Implement a Markdown Header Splitter that preserves `# Header 1` and `## Header 2` paths in the metadata of every child chunk.

**🔴 Challenge 3**: Implement a Semantic Distance Chunking algorithm in PyTorch that embeds sentences with `all-MiniLM-L6-v2`, computes consecutive cosine similarity, and splits at the 95th percentile distance drops.
""")

print("Successfully refactored chapters into diverse, authentic pedagogical structures!")
