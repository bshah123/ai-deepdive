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
# CHAPTER 20: MATHEMATICS FOR MACHINE LEARNING
# ==============================================================================

write_file(r"content/part-03-ml-nlp/chapter-20-math-for-ml/20.1-linear-algebra-vectors.md", r"""---
id: "20.1"
part: 3
chapter: 20
title: "Vector Spaces, Inner Products & Orthogonal Projections"
slug: "linear-algebra-vectors"
difficulty: "intermediate"
estimated_minutes: 30
prerequisites: ["19.1"]
tags: ["linear-algebra", "projections", "inner-product", "gram-schmidt"]
status: "published"
---

# Geometric Foundations: Vector Spaces & Inner Products

In modern AI systems, high-dimensional vector spaces $\mathbb{R}^d$ represent everything from 4096-dimensional token embeddings in LLaMA-3 to latent query-key projections in Transformer attention heads.

For vectors $u, v \in \mathbb{R}^d$, the standard Euclidean **Inner Product (Dot Product)** is:

$$\langle u, v \rangle = u^T v = \sum_{i=1}^d u_i v_i = \|u\|_2 \|v\|_2 \cos(\theta)$$

```mermaid
flowchart LR
    VectorU["Vector u"] --> DotProduct["Inner Product: u^T v = ||u|| ||v|| cos(theta)"]
    VectorV["Vector v"] --> DotProduct
    DotProduct --> Metric1["Cosine Similarity: cos(theta) = (u^T v) / (||u|| ||v||)"]
    DotProduct --> Metric2["Orthogonality Test: u^T v = 0 (theta = 90 deg)"]
```

# Orthogonal Projections: The Core of Least Squares & Attention

When projecting an arbitrary vector $y \in \mathbb{R}^m$ onto the subspace spanned by the column space of matrix $A \in \mathbb{R}^{m \times n}$, we seek the point $\hat{y} = A x$ closest to $y$.

The error vector $e = y - Ax$ must be orthogonal to every column of $A$:

$$A^T (y - A x) = 0 \implies A^T y = A^T A x \implies x = (A^T A)^{-1} A^T y$$

The **Orthogonal Projection Matrix** $P$ is:

$$P = A (A^T A)^{-1} A^T, \quad \hat{y} = P y$$

```mermaid
flowchart TD
    VectorY["Target Vector y"] --> Project["Projection Matrix: P = A (A^T A)^(-1) A^T"]
    SubspaceA["Subspace col(A)"] --> Project
    Project --> PointYHat["Closest Subspace Point: y_hat = P y"]
    Project --> OrthogError["Orthogonal Residual: e = y - y_hat (e perpendicular to col(A))"]
```

### Properties of Projection Matrices:
1. **Idempotence**: $P^2 = P$ (projecting twice does not change the projection).
2. **Symmetry**: $P^T = P$.
3. **Eigenvalues**: Every eigenvalue $\lambda_i \in \{0, 1\}$.

# Numerical Verification in NumPy

```python
import numpy as np

# Define a 2D subspace in 3D space
A = np.array([
    [1.0, 0.0],
    [1.0, 1.0],
    [0.0, 1.0]
])

# Compute projection matrix P = A (A^T A)^(-1) A^T
P = A @ np.linalg.inv(A.T @ A) @ A.T

# Test projection on an arbitrary 3D vector
y = np.array([3.0, 2.0, 5.0])
y_hat = P @ y
error = y - y_hat

print("Projected vector y_hat:", y_hat)
print("Orthogonality check A^T * error (should be ~0):", A.T @ error)
print("Idempotence check (P^2 == P):", np.allclose(P @ P, P))
```

# AI Connection: Attention Projections

> [!AI]
> In Transformer Multi-Head Attention, the input representation $X$ is projected into Query, Key, and Value subspaces via learnable projection matrices $W_Q, W_K, W_V \in \mathbb{R}^{d_{\text{model}} \times d_k}$. 
> The dot product $Q K^T$ evaluates the pairwise cosine similarities and geometric projections across token feature representations.

# Problem Set & Challenges

**🟢 Challenge 1**: Prove mathematically that if $A$ has orthonormal columns ($A^T A = I$), the projection matrix simplifies to $P = A A^T$.

**🟡 Challenge 2**: Implement the Gram-Schmidt orthogonalization algorithm in NumPy to convert an arbitrary basis into an orthonormal basis.

**🔴 Challenge 3**: Derive why the Moore-Penrose Pseudoinverse $A^+ = (A^T A)^{-1} A^T$ produces the unique minimum-norm solution for underdetermined linear systems.
""")

write_file(r"content/part-03-ml-nlp/chapter-20-math-for-ml/20.2-matrix-decomposition-svd.md", r"""---
id: "20.2"
part: 3
chapter: 20
title: "Singular Value Decomposition (SVD) & Low-Rank Matrix Approximation"
slug: "matrix-decomposition-svd"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["20.1"]
tags: ["svd", "low-rank", "pca", "matrix-factorization", "lora"]
status: "published"
---

# Mathematical Theorem: The Singular Value Decomposition

The **Singular Value Decomposition (SVD)** is arguably the most powerful factorization in linear algebra. Any arbitrary rectangular real matrix $A \in \mathbb{R}^{m \times n}$ can be factored uniquely as:

$$A = U \Sigma V^T$$

```mermaid
flowchart LR
    MatrixA["Matrix A [m x n]"] --> FactorU["U [m x m]<br>(Orthonormal Left Singular Vectors: Eigenvectors of AA^T)"]
    MatrixA --> FactorSigma["Sigma [m x n]<br>(Diagonal Matrix of Singular Values: sigma_1 >= sigma_2 >= ... >= 0)"]
    MatrixA --> FactorV["V^T [n x n]<br>(Orthonormal Right Singular Vectors: Eigenvectors of A^T A)"]
```

# The Eckart-Young-Mirsky Theorem (Low-Rank Approximation)

The optimal rank-$k$ approximation ($k < \min(m, n)$) of matrix $A$ under both Frobenius and Spectral norms is obtained by truncating the SVD to the top $k$ singular values:

$$A_k = \sum_{i=1}^k \sigma_i u_i v_i^T = U_k \Sigma_k V_k^T$$

$$\min_{\text{rank}(B) \le k} \|A - B\|_F^2 = \|A - A_k\|_F^2 = \sum_{i=k+1}^{\min(m, n)} \sigma_i^2$$

```mermaid
flowchart TD
    FullMatrix["Full Weight Matrix W [4096 x 4096]<br>(16,777,216 parameters)"] --> SVD_Trunc["Truncate to Rank r=16"]
    SVD_Trunc --> FactorB["Matrix B = U_r * sqrt(Sigma_r) [4096 x 16]"]
    SVD_Trunc --> FactorA["Matrix A = sqrt(Sigma_r) * V_r^T [16 x 4096]"]
    FactorB --> LowRank["Low-Rank Approximation: W approx B * A<br>(131,072 parameters = 99.2% compression!)"]
    FactorA --> LowRank
```

# Practical NumPy Implementation

```python
import numpy as np

# Generate synthetic high-dimensional matrix
np.random.seed(42)
m, n, rank = 1000, 1000, 10
# Construct true low-rank matrix with noise
A_clean = np.random.randn(m, rank) @ np.random.randn(rank, n)
A_noisy = A_clean + 0.1 * np.random.randn(m, n)

# Compute Full SVD
U, S, Vt = np.linalg.svd(A_noisy, full_matrices=False)

# Truncate to rank-10 approximation
k = 10
A_k = (U[:, :k] * S[:k]) @ Vt[:k, :]

# Calculate compression ratio & reconstruction error
original_params = m * n
low_rank_params = (m * k) + (n * k) + k
recon_error = np.linalg.norm(A_clean - A_k, 'fro') / np.linalg.norm(A_clean, 'fro')

print(f"Original Size: {original_params:,} floats")
print(f"Low-Rank Size: {low_rank_params:,} floats ({(low_rank_params / original_params) * 100:.2f}% of original)")
print(f"Reconstruction Error relative to clean signal: {recon_error * 100:.2f}%")
```

# Direct AI Application: LoRA (Low-Rank Adaptation)

> [!AI]
> The Eckart-Young theorem is the foundational theoretical justification for **LoRA (Low-Rank Adaptation)** in LLM fine-tuning. 
> Research shows that the weight update matrix $\Delta W = W_{\text{fine-tuned}} - W_{\text{pre-trained}}$ has a very low intrinsic rank (often $r \le 16$). Parameterizing $\Delta W = B \cdot A$ achieves equal task accuracy to full fine-tuning while slashing memory by $>99\%$.

# Problem Set & Challenges

**🟢 Challenge 1**: Compute the SVD of a $3 \times 2$ matrix by hand using the eigenvalues and eigenvectors of $A^T A$.

**🟡 Challenge 2**: Implement Principal Component Analysis (PCA) using SVD and prove why centering data ($\mu = 0$) makes the right singular vectors $V$ identical to principal components.

**🔴 Challenge 3**: Implement a randomized SVD algorithm (Halko et al., 2011) that computes an accurate rank-$k$ approximation in $O(m \cdot n \cdot \log k)$ runtime using random Gaussian projection matrices.
""")

# ==============================================================================
# CHAPTER 28: SCALING LAWS & DISTRIBUTED TRAINING
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-28-training-llms/28.1-scaling-laws.md", r"""---
id: "28.1"
part: 4
chapter: 28
title: "Chinchilla Scaling Laws & Compute-Optimal Pre-Training"
slug: "scaling-laws"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["27.1", "19.1"]
tags: ["scaling-laws", "chinchilla", "kaplan", "compute-optimal", "pre-training"]
status: "published"
---

# The Science of Scaling: Kaplan vs Chinchilla

How should compute budget $C$ be allocated between model parameter count $N$ and training dataset tokens $D$?

```mermaid
flowchart TD
    ComputeBudget["Fixed Compute Budget C approx 6 * N * D FLOPs"] --> Kaplan["1. Kaplan et al. (OpenAI 2020):<br>Scale parameters 73%, tokens 27%<br>(Led to undertrained massive models like GPT-3 175B on 300B tokens)"]
    ComputeBudget --> Chinchilla["2. Hoffmann et al. (DeepMind 2022 - Chinchilla):<br>Scale parameters 50%, tokens 50% in EQUAL proportion!<br>(Optimal ratio: D approx 20 * N)"]
    Chinchilla --> ModernInference["3. Modern Over-Training (LLaMA-3 / Mistral):<br>Train 8B models on 15 Trillion tokens (D = 1875 * N)<br>(Massively amortizes downstream inference costs!)"]
```

# The Chinchilla Power-Law Loss Formulation

Hoffmann et al. modeled the cross-entropy pre-training loss $L(N, D)$ as:

$$L(N, D) = E + \frac{A}{N^\alpha} + \frac{B}{D^\beta}$$

| Term | Physical Meaning | Fitted Value |
|---|---|---|
| $E$ | Irreducible entropy of natural language | $\approx 1.69$ nats |
| $A / N^\alpha$ | Parameter bottleneck term | $A \approx 406.4, \ \alpha \approx 0.34$ |
| $B / D^\beta$ | Token dataset bottleneck term | $B \approx 410.7, \ \beta \approx 0.28$ |

Under a fixed compute budget $C = 6ND$, minimizing $L(N, D)$ subject to this constraint yields the **Compute-Optimal Scaling Rule**:

$$N_{\text{opt}} \propto C^a, \quad D_{\text{opt}} \propto C^b, \quad \text{where } a \approx 0.5, \ b \approx 0.5$$

$$\frac{D_{\text{opt}}}{N_{\text{opt}}} \approx 20 \text{ tokens per parameter}$$

# Pre-Training FLOPs Calculation Engine

```python
def calculate_pretraining_metrics(param_count_billions: float, tokens_trillions: float, gpu_tflops: float = 312.0):
    # 1. Total parameters N and tokens D
    N = param_count_billions * 1e9
    D = tokens_trillions * 1e12
    
    # 2. Total Pre-Training FLOPs: C = 6 * N * D (Forward = 2ND, Backward = 4ND)
    flops = 6 * N * D
    
    # 3. GPU hours on NVIDIA H100 (assuming 312 TFLOPs FP16 with 45% Model FLOPs Utilization MFU)
    effective_tflops = gpu_tflops * 0.45
    gpu_seconds = flops / (effective_tflops * 1e12)
    gpu_hours = gpu_seconds / 3600
    
    return {
        "Total FLOPs": f"{flops:.2e}",
        "H100 GPU Hours": f"{gpu_hours:,.0f} hours",
        "Days on 1024 H100 Cluster": f"{gpu_hours / (1024 * 24):.1f} days"
    }

# Example: LLaMA-3-8B on 15 Trillion Tokens
metrics = calculate_pretraining_metrics(param_count_billions=8.0, tokens_trillions=15.0)
for k, v in metrics.items():
    print(f"{k}: {v}")
```

# Why Modern LLMs "Over-Train" Beyond Chinchilla

Chinchilla optimality assumes you discard the model after training. In reality, an open model like LLaMA-3-8B is queried **billions of times in production**:
- Training an 8B model on 15T tokens requires more training FLOPs than Chinchilla dictates.
- However, serving an 8B model uses **90% less VRAM and compute per token** than serving a Chinchilla-optimal 70B model!
- Over-training dramatically **reduces total inference cost at scale**.

# Problem Set & Challenges

**🟢 Challenge 1**: Compute the total floating-point operations (FLOPs) required to pre-train a 70B parameter model on 3 Trillion tokens.

**🟡 Challenge 2**: Explain why backward pass computation ($4ND$ FLOPs) requires exactly double the compute of the forward pass ($2ND$ FLOPs).

**🔴 Challenge 3**: Calculate the Model FLOPs Utilization (MFU) of a distributed pre-training run achieving 120,000 tokens/sec across a cluster of 512 H100 SXM GPUs.
""")

# ==============================================================================
# CHAPTER 32: QUANTIZATION & INFERENCE OPTIMIZATION
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-32-quantization/32.1-quantization-foundations.md", r"""---
id: "32.1"
part: 4
chapter: 32
title: "Quantization Foundations: Uniform Affine & Symmetric INT8/INT4 Math"
slug: "quantization-foundations"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["17.1", "27.1"]
tags: ["quantization", "int8", "int4", "scale-zero-point", "gguf"]
status: "published"
---

# Physics of Quantization: Memory Bandwidth vs Arithmetic Precision

Serving Large Language Models is predominantly **Memory-Bandwidth-Bound** during autoregressive token generation. Fetching a 70B FP16 model (140 GB) requires 140 GB of GPU memory bandwidth per token.

Quantizing weights from 16-bit floats to 4-bit integers shrinks the model footprint by **4x (140 GB $\to$ 35 GB)**, allowing 70B models to run entirely in GPU VRAM on dual RTX 3090/4090 consumer cards.

```mermaid
flowchart LR
    FP16["FP16 Weights: 16 bits per param<br>(70B = 140 GB VRAM)"] --> QuantEngine["Quantization Mapping: Q(x) = clip( round(x/S) + Z )"]
    QuantEngine --> INT4["INT4 Weights: 4 bits per param<br>(70B = 35 GB VRAM: 4x Throughput!)"]
```

# Mathematical Quantization Formulas

### 1. Uniform Asymmetric (Affine) Quantization
Maps continuous real numbers $x \in [\alpha, \beta]$ to integer range $[q_{\min}, q_{\max}]$ (e.g. $[0, 255]$ for INT8):

$$\text{Scale: } S = \frac{\beta - \alpha}{q_{\max} - q_{\min}}$$
$$\text{Zero-Point: } Z = \text{round}\left(-\frac{\alpha}{S}\right) + q_{\min}$$
$$\text{Quantize: } q = \text{clip}\left(\text{round}\left(\frac{x}{S}\right) + Z, q_{\min}, q_{\max}\right)$$
$$\text{Dequantize: } \hat{x} = S \cdot (q - Z)$$

### 2. Uniform Symmetric Quantization
Constrains the floating range to $[-\alpha, \alpha]$ and sets zero-point $Z = 0$, simplifying hardware integer matrix arithmetic ($W q_x$):

$$S = \frac{\max(|x|)}{q_{\max}}, \quad q = \text{clip}\left(\text{round}\left(\frac{x}{S}\right), -q_{\max}, q_{\max}\right)$$
$$\hat{x} = S \cdot q$$

# Pure Python INT8 Quantization Engine

```python
import numpy as np

class SymmetricInt8Quantizer:
    @staticmethod
    def quantize(tensor: np.ndarray):
        # Determine maximum absolute value
        max_val = np.max(np.abs(tensor))
        scale = max_val / 127.0
        # Quantize to INT8 range [-127, 127]
        quantized = np.clip(np.round(tensor / scale), -127, 127).astype(np.int8)
        return quantized, scale

    @staticmethod
    def dequantize(quantized: np.ndarray, scale: float) -> np.ndarray:
        return quantized.astype(np.float32) * scale

# Test Quantizer on a weight matrix
np.random.seed(42)
weights = np.random.normal(0, 0.05, (1024, 1024)).astype(np.float32)
q_weights, scale = SymmetricInt8Quantizer.quantize(weights)
reconstructed = SymmetricInt8Quantizer.dequantize(q_weights, scale)

error = np.mean(np.abs(weights - reconstructed))
print(f"Original FP32 Size:  {weights.nbytes:,} bytes")
print(f"Quantized INT8 Size: {q_weights.nbytes:,} bytes (4x memory reduction!)")
print(f"Mean Quantization Error: {error:.6f}")
```

# Outlier Features & Modern Quantization Schemes

In Transformer models $>6.7\text{B}$ parameters, specific hidden dimension channels exhibit extreme outlier activation magnitudes ($>100\times$ standard deviation). Naive tensor-wide scaling loses resolution for 99.9% of normal weights.

Modern post-training quantization schemes solve this:
- **AWQ (Activation-aware Weight Quantization)**: Protects the 1% most salient weight channels based on activation magnitudes.
- **GPTQ (Second-Order Error Minimization)**: Uses the Hessian matrix $H = 2 X X^T$ to compensate unquantized weights iteratively.
- **NormalFloat4 (NF4 - QLoRA)**: An information-theoretically optimal quantile distribution for standard normal weights.

# Problem Set & Challenges

**🟢 Challenge 1**: Implement block-wise (group-wise) quantization with group size $G=64$ in NumPy and show how it reduces reconstruction error compared to per-tensor quantization.

**🟡 Challenge 2**: Calculate the exact integer dot-product formula for dequantizing $Y = (S_w \cdot q_w) \times (S_x \cdot q_x)$.

**🔴 Challenge 3**: Implement the NF4 (NormalFloat4) lookup table from QLoRA and verify that each of the 16 quantization bins holds an equal probability mass under standard Gaussian $\mathcal{N}(0, 1)$.
""")

print("Advanced mastery lessons written across Part 3 & 4 with dynamic structures and verified Mermaid diagrams!")
