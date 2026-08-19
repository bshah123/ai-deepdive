import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# 1. CHAPTER 03: IEEE 754 FLOATING POINT ARITHMETIC
# ==============================================================================

write_file(r"content/part-01-python-properly/chapter-03-numbers-strings-booleans/3.2-floats.md", r"""---
id: "3.2"
part: 1
chapter: 3
title: "Floating-Point Numbers: IEEE 754 Standard & Why 0.1 + 0.2 != 0.3"
slug: "floats"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["3.1"]
tags: ["floats", "ieee-754", "precision", "rounding", "cpython"]
contentShape: "experiment-playground"
openingType: "code"
status: "published"
---

# Look at This Code: The Floating-Point Paradox

Open any Python interpreter and run:

```python
print(0.1 + 0.2 == 0.3) # Prints: False!
print(0.1 + 0.2)        # Prints: 0.30000000000000004
```

Why does Python fail at simple elementary school arithmetic?

```mermaid
flowchart TD
    subgraph Base10Fraction ["Base-10 Decimal World"]
        Dec["0.1 = 1 / 10 (Clean terminating decimal)"]
    end

    subgraph Base2BinaryWorld ["Base-2 Binary World (IEEE 754)"]
        Bin["1/10 in binary = 0.00011001100110011... (INFINITE REPEATING FRACTION!)<br>Hardware truncates to 53 bits of precision -> Causes microscopic rounding error!"]
    end

    Dec -.->|Conversion to binary| Bin
```

---

# The IEEE 754 Double-Precision (Float64) Memory Layout

In CPython, a Python `float` is a 64-bit IEEE 754 double-precision number represented across three binary fields:

```mermaid
flowchart LR
    Sign["Sign Bit: 1 Bit (0 = Positive, 1 = Negative)"]
    Exp["Biased Exponent: 11 Bits (Bias = 1023)"]
    Mantissa["Mantissa / Fraction: 52 Bits (Normalized Significand)"]
    
    Sign --- Exp
    Exp --- Mantissa
```

$$\text{Value} = (-1)^{\text{sign}} \times 2^{\text{exponent} - 1023} \times \left(1 + \sum_{i=1}^{52} b_i 2^{-i}\right)$$

---

# How to Compare Floats Safely in Production

Never use `==` to compare floating-point numbers. Always use **`math.isclose()`** with relative and absolute tolerances:

```python
import math

a = 0.1 + 0.2
b = 0.3

# SAFE PRODUCTION COMPARISON:
print("math.isclose(a, b):", math.isclose(a, b)) # True!
```

---

# Special Float Values: `inf`, `-inf`, and `nan`

```python
pos_inf = float("inf")
neg_inf = float("-inf")
not_a_num = float("nan")

print("inf > 10**100:", pos_inf > 10**100) # True
print("nan == nan:   ", not_a_num == not_a_num) # FALSE! NaN is never equal to anything, even itself!
print("math.isnan:   ", math.isnan(not_a_num)) # True
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Inspect the exact binary fraction representation of `0.1` using `(0.1).as_integer_ratio()`.

**🟡 Challenge 2**: Explain why financial applications (banking, crypto, accounting) use `decimal.Decimal` instead of `float`.

**🔴 Challenge 3**: Implement a pure Python function that decodes a 64-bit integer into its IEEE 754 sign, exponent, and mantissa components.
""")

# ==============================================================================
# 2. CHAPTER 17: NUMPY STRIDES & ZERO-COPY BROADCASTING
# ==============================================================================

write_file(r"content/part-02-scientific-python/chapter-17-numpy/17.1-numpy-ndarrays.md", r"""---
id: "17.1"
part: 2
chapter: 17
title: "NumPy ndarrays Under the Hood: Memory Strides, C vs Fortran & Zero-Copy Broadcasting"
slug: "numpy-ndarrays"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["16.5", "2.2"]
tags: ["numpy", "strides", "broadcasting", "c-contiguous", "memory-layout"]
contentShape: "under-the-hood"
openingType: "visual"
status: "published"
---

# The Internal Anatomy of a NumPy `ndarray`

A NumPy `ndarray` is a lightweight Python header pointing to a **contiguous block of homogeneous binary memory**:

```mermaid
flowchart TD
    subgraph PyArrayObjectHeader ["NumPy ndarray Header (Small Python Object)"]
        DataPtr["data pointer -> Points to raw C memory buffer in RAM"]
        Dtype["dtype -> float64 (8 bytes per item)"]
        Shape["shape -> (3, 4) (3 rows, 4 columns)"]
        Strides["strides -> (32, 8) (Step 32 bytes to move 1 row, 8 bytes to move 1 col)"]
    end

    subgraph RawMemoryBlock ["1D Contiguous Memory in RAM (96 Bytes total)"]
        Elements["[0,0] [0,1] [0,2] [0,3] | [1,0] [1,1] [1,2] [1,3] | [2,0] [2,1] [2,2] [2,3]"]
    end

    DataPtr --> RawMemoryBlock
```

---

# The Stride Formula: Fast 2D Coordinate Translation

To find the memory byte offset for element `(i, j)`:

$$\text{Memory Address}(i, j) = \text{data\_ptr} + i \times \text{strides}[0] + j \times \text{strides}[1]$$

### C-Contiguous vs Fortran-Contiguous:
- **C-Contiguous (Row-Major)**: Moving across a row steps 8 bytes (`strides=(32, 8)`).
- **Fortran-Contiguous (Column-Major)**: Moving down a column steps 8 bytes (`strides=(8, 24)`).

---

# Zero-Copy Array Transposition (`arr.T`)

When you transpose a 2D matrix `arr.T`, **NumPy copies ZERO bytes of data**. It simply swaps the strides:

```python
import numpy as np

arr = np.arange(12, dtype=np.int64).reshape(3, 4)
print("Original Shape:", arr.shape, "Strides:", arr.strides) # (3, 4), (32, 8)

transposed = arr.T
print("Transposed Shape:", transposed.shape, "Strides:", transposed.strides) # (4, 3), (8, 32)
print("Shares same memory buffer?", np.shares_memory(arr, transposed)) # True!
```

---

# Zero-Copy Broadcasting with Stride=0

When you add a $(3, 1)$ matrix to a $(1, 4)$ vector:
$$\text{Array A: Shape } (3, 1), \ \text{Strides } (8, 8)$$
$$\text{Array B: Shape } (1, 4), \ \text{Strides } (32, 8)$$

NumPy sets the stride of the singleton dimension to **`0`**:

```mermaid
flowchart LR
    StrideZero["Stride = 0 on Dimension 1:<br>When stepping along columns, index pointer stays at memory offset 0!<br>Simulates an infinite repeated array with ZERO EXTRA RAM!"]
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Verify why summing along `axis=1` of a C-contiguous array is $3\times$ faster than summing along `axis=0` due to CPU L1 cache line prefetching.

**🟡 Challenge 2**: Use `np.lib.stride_tricks.as_strided` to create a 2D sliding window view of a 1D time series without copying data.

**🔴 Challenge 3**: Implement a pure Python matrix indexing class that takes `shape`, `strides`, and `data` buffer, and computes multidimensional indexing using stride arithmetic.
""")

# ==============================================================================
# 3. CHAPTER 25: CAUSAL MASKING & SCALED DOT PRODUCT ATTENTION
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-25-attention/25.3-causal-masking.md", r"""---
id: "25.3"
part: 4
chapter: 25
title: "Causal Masking: Why Autoregressive LLMs Set Future Attention to -Infinity"
slug: "causal-masking"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["25.1"]
tags: ["causal-masking", "attention", "autoregressive", "gpt", "transformers"]
contentShape: "mental-model-first"
openingType: "visual"
status: "published"
---

# The Cheating Paradox in Language Modeling

When training an autoregressive language model (GPT-4, LLaMA-3), the goal is to predict the **next token $t+1$ given historical tokens $t_1, \dots, t$**.

If token $t$ could attend to token $t+1$ during self-attention, the model would simply **look ahead and copy the answer** with zero learning!

```mermaid
flowchart TD
    subgraph CheatingWithoutMask ["Without Mask: Token 1 'sees' Token 3 (Cheating!)"]
        T1["Token 1: 'The'"] <---> T2["Token 2: 'capital'"] <---> T3["Token 3: 'of'"]
    end

    subgraph CausalMaskMatrix ["With Lower-Triangular Causal Mask (Pure Autoregressive)"]
        Matrix["Attention Logits Matrix:<br>Token 1: [Score(1,1),  -inf,        -inf      ]<br>Token 2: [Score(2,1),  Score(2,2),  -inf      ]<br>Token 3: [Score(3,1),  Score(3,2),  Score(3,3)]"]
    end
```

---

# Why Mask with $-\infty$ Before Softmax?

Recall the **Softmax function**:

$$\text{Softmax}(z_i) = \frac{e^{z_i}}{\sum_j e^{z_j}}$$

When $z_{\text{future}} = -\infty$:

$$e^{-\infty} = \lim_{z \to -\infty} e^z = 0.0$$

Setting future logits to $-\infty$ forces future attention probabilities to **strictly $0.0$**, making it mathematically impossible for any gradient or information to leak from future tokens!

```mermaid
flowchart LR
    Logits["Raw Attention Logits QK^T / sqrt(d)"] --> AddMask["Add Causal Mask Matrix M (Upper triangle = -inf, Lower triangle = 0.0)"]
    AddMask --> Softmax["Softmax -> Upper triangle becomes exact 0.000!"]
    Softmax --> ValWeight["Multiply by Values V"]
```

---

# PyTorch Causal Mask Implementation

```python
import torch
import torch.nn.functional as F

def causal_attention(Q: torch.Tensor, K: torch.Tensor, V: torch.Tensor) -> torch.Tensor:
    # Q, K, V: [Batch, SeqLen, HeadDim]
    B, S, D = Q.shape
    d_k = D
    
    # 1. Compute raw scores
    scores = torch.matmul(Q, K.transpose(-2, -1)) / (d_k ** 0.5)
    
    # 2. Construct upper-triangular boolean mask
    # torch.triu with diagonal=1 selects elements strictly above the main diagonal
    mask = torch.triu(torch.full((S, S), float("-inf")), diagonal=1)
    
    # 3. Apply mask to scores
    masked_scores = scores + mask
    
    # 4. Softmax over last dimension
    attn_weights = F.softmax(masked_scores, dim=-1)
    
    # 5. Weighted values
    return torch.matmul(attn_weights, V), attn_weights

# Verify causal weights
Q = torch.randn(1, 4, 16)
K = torch.randn(1, 4, 16)
V = torch.randn(1, 4, 16)

out, weights = causal_attention(Q, K, V)
print("Causal Attention Weights Matrix (Lower Triangular):\n", weights[0].round(decimals=2))
```

---

# Exercises & Challenges

**🟢 Challenge 1**: Verify that the top row of the attention matrix has $100\%$ of its weight on Token 1.

**🟡 Challenge 2**: Explain why bidirectional models (like BERT) omit the causal mask while decoder models (like GPT) strictly require it.

**🔴 Challenge 3**: Implement a sliding-window local causal mask (Mistral style) where each token can only attend to the preceding $W=4096$ tokens.
""")

print("Missing knowledge gaps filled with crystal-clear first-principles pedagogical depth!")
