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
# CHAPTER 19: MACHINE LEARNING FOUNDATIONS
# ==============================================================================

write_file(r"content/part-03-ml-nlp/chapter-19-ml-foundations/19.1-ml-problems.md", r"""---
id: "19.1"
part: 3
chapter: 19
title: "Machine Learning Problem Formulation & Empirical Risk"
slug: "ml-problems"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: ["15.1"]
tags: ["erm", "loss-functions", "optimization", "convexity"]
status: "published"
---

# Concept

Machine Learning is fundamentally formulated as **Empirical Risk Minimization (ERM)**. Given a dataset of $N$ samples $\mathcal{D} = \{(x_i, y_i)\}_{i=1}^N$ drawn from an unknown true distribution $P(X, Y)$, we seek model parameters $\theta^*$ that minimize the empirical loss:

$$\mathcal{R}_{\text{emp}}(\theta) = \frac{1}{N} \sum_{i=1}^N \mathcal{L}(f(x_i; \theta), y_i)$$

```mermaid
flowchart LR
    Dataset["Training Samples (X, Y)"] --> Forward["Model Prediction: y_hat = f(X; theta)"]
    Forward --> Loss["Loss Function: L(y_hat, Y)"]
    Loss --> Optimizer["Optimizer: Gradient Descent<br>theta = theta - lr * dL/dtheta"]
    Optimizer --> Forward
```

# Convex vs Non-Convex Loss Surfaces

- **Linear Models (Linear Regression, Logistic Regression, SVMs)**: Have **Convex Loss Surfaces** with a single unique global minimum and zero local minima.
- **Deep Neural Networks**: Have highly **Non-Convex Loss Surfaces** characterized by saddle points, ravines, and plateaus. Stochastic Gradient Descent (SGD) with momentum navigates these surfaces to find flat, generalizable local minima.

# Exercises

**🟢 Basic**: Implement a 1D linear regression model from scratch using gradient descent on the Mean Squared Error loss.

**🟡 Intermediate**: Write a simulation comparing batch gradient descent versus Stochastic Gradient Descent (SGD) on noisy synthetic data.

**🔴 Advanced**: Plot the 2D loss surface contours of a non-convex function (e.g. the Rosenbrock Banana function) and visualize the trajectory of SGD vs Momentum vs Adam.
""")

write_file(r"content/part-03-ml-nlp/chapter-19-ml-foundations/19.2-loss-functions.md", r"""---
id: "19.2"
part: 3
chapter: 19
title: "Loss Functions: MSE, Cross-Entropy & KL Divergence"
slug: "loss-functions"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["19.1"]
tags: ["loss-functions", "cross-entropy", "kl-divergence", "mse", "math"]
status: "published"
---

# Concept

A **Loss Function** $\mathcal{L}(\hat{y}, y)$ quantifies the penalty for model prediction errors. The mathematical choice of loss function corresponds directly to Maximum Likelihood Estimation (MLE) under specific probability distribution assumptions.

# The 3 Foundational Loss Functions

```mermaid
flowchart TD
    LossChoice["Loss Function Selection"] --> Regression["Regression Tasks (Continuous Y)"]
    LossChoice --> Classification["Classification & LLM Next-Token Prediction"]
    LossChoice --> Distributional["Distribution Matching / Distillation"]

    Regression --> MSE["Mean Squared Error (MSE)<br>L = 1/N * sum((y - y_hat)^2)<br>(Assumes Gaussian Noise)"]
    Classification --> CE["Cross-Entropy Loss (CE)<br>L = -sum(y_k * log(p_k))<br>(Assumes Categorical/Bernoulli)"]
    Distributional --> KL["KL Divergence<br>D_KL(P || Q) = sum(P(x) * log(P(x) / Q(x)))"]
```

# Numerical Stability: Fused Log-Softmax + NLLLoss

Computing $\text{softmax}(z)$ followed by $\log(\cdot)$ suffers from severe floating-point underflow/overflow. PyTorch's `nn.CrossEntropyLoss` uses the **Log-Sum-Exp trick**:

$$\log \left( \frac{e^{z_i}}{\sum_j e^{z_j}} \right) = z_i - \max(z) - \log \sum_j e^{z_j - \max(z)}$$

```python
import torch
import torch.nn.functional as F

logits = torch.tensor([[1000.0, 1001.0, 1002.0]])  # Extreme values
targets = torch.tensor([2])

# Naive Softmax -> Log causes NaN overflow:
try:
    naive_probs = torch.exp(logits) / torch.sum(torch.exp(logits))
    print("Naive Probs:", naive_probs)  # tensor([[nan, nan, nan]])
except Exception as e:
    pass

# Fused Cross-Entropy uses Log-Sum-Exp (Numerically Rock Solid!):
stable_loss = F.cross_entropy(logits, targets)
print(f"Stable Cross-Entropy Loss: {stable_loss.item():.4f}")
```

# Exercises

**🟢 Basic**: Implement Mean Absolute Error (L1 Loss) and Mean Squared Error (L2 Loss) in pure NumPy and explain their sensitivity to outliers.

**🟡 Intermediate**: Derive mathematically why minimizing Cross-Entropy is identical to minimizing KL Divergence when the target distribution $P$ is fixed.

**🔴 Advanced**: Implement a numerically stable multi-class Cross-Entropy loss from scratch in NumPy using the Log-Sum-Exp trick.
""")

write_file(r"content/part-03-ml-nlp/chapter-19-ml-foundations/19.3-bias-variance-regularization.md", r"""---
id: "19.3"
part: 3
chapter: 19
title: "Bias-Variance Tradeoff, Overfitting & Regularization (L1/L2)"
slug: "bias-variance-regularization"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["19.2"]
tags: ["bias-variance", "regularization", "l1-l2", "generalization"]
status: "published"
---

# Concept

The expected prediction error of any supervised model decomposes into three irreducible components:

$$\mathbb{E}[(y - \hat{f}(x))^2] = \underbrace{\text{Bias}[\hat{f}(x)]^2}_{\text{Underfitting}} + \underbrace{\text{Variance}[\hat{f}(x)]}_{\text{Overfitting}} + \underbrace{\sigma^2}_{\text{Irreducible Noise}}$$

```mermaid
flowchart LR
    Underfitting["High Bias / Low Variance<br>(Underfitting: Model too simple)"] <--> Balanced["Optimal Model Complexity<br>(Minimum Total Error)"] <--> Overfitting["Low Bias / High Variance<br>(Overfitting: Model memorizes noise)"]
```

# Regularization: L1 (Lasso) vs L2 (Ridge / Weight Decay)

To constrain model complexity and prevent overfitting, a penalty term is added to the objective:

$$\mathcal{L}_{\text{total}}(\theta) = \mathcal{L}_{\text{data}}(\theta) + \lambda \Omega(\theta)$$

- **L2 Regularization (Ridge / Weight Decay)**: $\Omega(\theta) = \frac{1}{2} \|\theta\|_2^2 = \frac{1}{2} \sum \theta_i^2$. Penalizes large weights smoothly, keeping parameter values small.
- **L1 Regularization (Lasso)**: $\Omega(\theta) = \|\theta\|_1 = \sum |\theta_i|$. Drives less important weights to **strictly zero**, producing sparse weight matrices.

# Exercises

**🟢 Basic**: Train a high-degree polynomial regression model with and without L2 regularization to visually demonstrate overfitting mitigation.

**🟡 Intermediate**: Explain geometrically using diamond vs circular constraint regions why L1 regularization produces exact zero weights while L2 produces small non-zero weights.

**🔴 Advanced**: Implement Dropout from scratch in NumPy during the forward and backward pass, properly scaling activations by $\frac{1}{1 - p}$ during training (Inverted Dropout).
""")

# ==============================================================================
# CHAPTER 21: NEURAL NETWORKS
# ==============================================================================

write_file(r"content/part-03-ml-nlp/chapter-21-neural-networks/21.2-activation-functions.md", r"""---
id: "21.2"
part: 3
chapter: 21
title: "Activation Functions: ReLU, GeLU, SwiGLU & Vanishing Gradients"
slug: "activation-functions"
difficulty: "intermediate"
estimated_minutes: 25
prerequisites: ["21.1"]
tags: ["activations", "gelu", "swiglu", "relu", "transformers"]
status: "published"
---

# Concept

Without non-linear activation functions, stacking multiple neural network layers collapses mathematically into a single linear transformation: $W_2 (W_1 X) = (W_2 W_1) X = W_{comb} X$. Non-linearities allow neural networks to act as **Universal Function Approximators**.

```mermaid
flowchart LR
    ReLU["1. ReLU (2012)<br>max(0, x)"] --> GELU["2. GeLU (2016 - GPT-2/3, BERT)<br>x * Phi(x)"]
    GELU --> SwiGLU["3. SwiGLU (2020 - LLaMA-1/2/3, Mistral)<br>Swish(xW) * (xV)"]
```

# Evolution of Modern Activation Functions

### 1. ReLU (Rectified Linear Unit)
$$\text{ReLU}(x) = \max(0, x)$$
- **Pros**: Fast computation, constant gradient of 1.0 for positive inputs (no vanishing gradient).
- **Cons**: "Dying ReLU" problem: neurons with negative inputs output 0 and receive 0 gradient forever.

### 2. GeLU (Gaussian Error Linear Unit)
$$\text{GeLU}(x) = x \cdot \Phi(x) = x \cdot P(X \le x) \approx 0.5 x \left(1 + \tanh\left(\sqrt{\frac{2}{\pi}} (x + 0.044715 x^3)\right)\right)$$
- Weights inputs by their probabilistic quantile under a standard normal distribution. Standard in BERT, GPT-2, GPT-3.

### 3. SwiGLU (Swish Gated Linear Unit)
Introduced by Noam Shazeer (2020), SwiGLU is the state-of-the-art activation used in **LLaMA-3, Mistral, Gemma-2, and DeepSeek**:

$$\text{SwiGLU}(x) = \text{Swish}_\beta(x W) \odot (x V) = (x W \cdot \sigma(\beta x W)) \odot (x V)$$

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class SwiGLUFFN(nn.Module):
    def __init__(self, dim, hidden_dim):
        super().__init__()
        # SwiGLU requires 3 linear projection matrices
        self.w1 = nn.Linear(dim, hidden_dim, bias=False)  # Gate projection
        self.w2 = nn.Linear(hidden_dim, dim, bias=False)  # Down projection
        self.w3 = nn.Linear(dim, hidden_dim, bias=False)  # Up projection

    def forward(self, x):
        # SwiGLU: (Swish(W1 x) * W3 x) W2
        return self.w2(F.silu(self.w1(x)) * self.w3(x))

ffn = SwiGLUFFN(dim=4096, hidden_dim=14336)
x = torch.randn(2, 16, 4096)
print("SwiGLU Output Shape:", ffn(x).shape)  # [2, 16, 4096]
```

# Exercises

**🟢 Basic**: Plot ReLU, Sigmoid, Tanh, and GeLU in Matplotlib across the interval $[-4, 4]$.

**🟡 Intermediate**: Derive the mathematical derivative of the Sigmoid function $\sigma'(x) = \sigma(x)(1 - \sigma(x))$ and show why deep networks with Sigmoid suffer from vanishing gradients.

**🔴 Advanced**: Benchmark the forward and backward execution time and peak memory of ReLU vs GeLU vs SwiGLU in PyTorch on GPU.
""")

write_file(r"content/part-03-ml-nlp/chapter-21-neural-networks/21.3-optimizers-adamw.md", r"""---
id: "21.3"
part: 3
chapter: 21
title: "Optimizers: SGD, Momentum, RMSprop & AdamW Deep Dive"
slug: "optimizers-adamw"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["21.1", "18.1"]
tags: ["adamw", "optimizers", "gradient-descent", "llm-training"]
status: "published"
---

# Concept

Optimizers update model parameters $\theta$ using loss gradients $\nabla_\theta \mathcal{L}$. Modern LLM pre-training almost universally uses **AdamW (Adaptive Moment Estimation with Decoupled Weight Decay)**.

# The Evolution of Gradient Descent

```mermaid
flowchart TD
    SGD["1. Vanilla SGD:<br>theta = theta - lr * g"] --> Momentum["2. SGD + Momentum:<br>m = beta * m + (1-beta) * g<br>theta = theta - lr * m"]
    Momentum --> RMSprop["3. RMSprop (Adaptive Per-Parameter Scale):<br>v = beta2 * v + (1-beta2) * g^2<br>theta = theta - lr * g / (sqrt(v) + eps)"]
    RMSprop --> Adam["4. Adam (Momentum + RMSprop):<br>Combines 1st (m) and 2nd (v) moments with bias correction"]
    Adam --> AdamW["5. AdamW (Loshchilov & Hutter 2017):<br>Decouples L2 weight decay from adaptive gradient scaling!"]
```

# The AdamW Algorithm in Detail

Given learning rate $\gamma$, weight decay $\lambda$, and parameters $\beta_1 = 0.9, \beta_2 = 0.999$:

1. Compute gradient: $g_t = \nabla_\theta \mathcal{L}_t(\theta_t)$
2. Update 1st moment (momentum): $m_t = \beta_1 m_{t-1} + (1 - \beta_1) g_t$
3. Update 2nd moment (uncentered variance): $v_t = \beta_2 v_{t-1} + (1 - \beta_2) g_t^2$
4. Bias correction:
   $$\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}$$
5. **Decoupled Parameter Update with Weight Decay**:
   $$\theta_{t+1} = \theta_t - \underbrace{\gamma \lambda \theta_t}_{\text{True Weight Decay}} - \underbrace{\frac{\gamma}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t}_{\text{Adaptive Gradient Step}}$$

# Pure Python AdamW Implementation

```python
import numpy as np

class AdamWOptimizer:
    def __init__(self, params, lr=1e-3, betas=(0.9, 0.999), eps=1e-8, weight_decay=1e-2):
        self.params = params
        self.lr = lr
        self.beta1, self.beta2 = betas
        self.eps = eps
        self.weight_decay = weight_decay
        self.t = 0
        self.m = [np.zeros_like(p) for p in params]
        self.v = [np.zeros_like(p) for p in params]

    def step(self, grads):
        self.t += 1
        for i, (p, g) in enumerate(zip(self.params, grads)):
            # 1. Update biased 1st and 2nd moments
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * (g ** 2)

            # 2. Bias correction
            m_hat = self.m[i] / (1 - self.beta1 ** self.t)
            v_hat = self.v[i] / (1 - self.beta2 ** self.t)

            # 3. Decoupled weight decay update
            p -= self.lr * self.weight_decay * p
            
            # 4. Adaptive gradient step
            p -= self.lr * m_hat / (np.sqrt(v_hat) + self.eps)

# Test optimizer
w = np.array([5.0, -3.0])
opt = AdamWOptimizer([w], lr=0.1)
for step in range(50):
    grad = 2 * w  # Quadratic loss gradient
    opt.step([grad])

print("Optimized weights (converging to 0):", w)
```

# Exercises

**🟢 Basic**: Explain why the bias correction terms $\frac{1}{1 - \beta_1^t}$ are critical during the first few iterations ($t=1, 2, 3$).

**🟡 Intermediate**: Demonstrate mathematically why L2 regularization inside standard Adam scales the weight decay penalty inversely by $\sqrt{v_t}$, whereas AdamW applies uniform decay.

**🔴 Advanced**: Calculate the total GPU memory footprint required to store optimizer states (master FP32 weights, 1st moment $m$, 2nd moment $v$) for a 70B parameter model in 16-bit mixed precision.
""")

# ==============================================================================
# CHAPTER 25: ATTENTION MECHANISM
# ==============================================================================

write_file(r"content/part-04-transformers-llms/chapter-25-attention/25.1-self-attention-math.md", r"""---
id: "25.1"
part: 4
chapter: 25
title: "Scaled Dot-Product Attention Math & Softmax Scaling"
slug: "self-attention-math"
difficulty: "advanced"
estimated_minutes: 30
prerequisites: ["20.1", "21.1"]
tags: ["attention", "transformers", "softmax", "qkv", "vaswani"]
status: "published"
---

# Concept

The **Attention Mechanism** (Vaswani et al., 2017) allows neural networks to dynamically route information across sequence positions regardless of their relative distance.

Given input queries $Q$, keys $K$, and values $V$:

$$\text{Attention}(Q, K, V) = \text{softmax}\left( \frac{Q K^T}{\sqrt{d_k}} + M \right) V$$

```mermaid
flowchart TD
    Q["Queries (Q) [B, H, S_q, D]"] --> MatMul1["Matrix Multiply: Q * K^T"]
    K["Keys (K) [B, H, S_k, D]"] --> MatMul1
    MatMul1 --> Scale["Scale by 1 / sqrt(d_k)"]
    Scale --> Mask["Apply Causal Mask (if autoregressive)"]
    Mask --> Softmax["Softmax along last axis (S_k)"]
    Softmax --> AttnWeights["Attention Weights A [B, H, S_q, S_k]"]
    AttnWeights --> MatMul2["Matrix Multiply: A * V"]
    V["Values (V) [B, H, S_k, D]"] --> MatMul2
    MatMul2 --> Output["Output Context [B, H, S_q, D]"]
```

# Why Scale by $\frac{1}{\sqrt{d_k}}$?

If components of $q$ and $k$ are independent random variables with mean 0 and variance 1, their dot product $q \cdot k = \sum_{i=1}^{d_k} q_i k_i$ has **mean 0 and variance $d_k$**.

For large dimensions (e.g. $d_k = 128$), the dot products grow large in magnitude, pushing the `softmax` function into regions with near-zero gradients (vanishing gradient problem). Dividing by $\sqrt{d_k}$ normalizes the variance back to **1.0**, keeping softmax gradients healthy.

```python
import torch
import torch.nn.functional as F

def scaled_dot_product_attention(Q, K, V, mask=None):
    d_k = Q.size(-1)
    # 1. Compute raw dot products: [B, H, S_q, S_k]
    scores = torch.matmul(Q, K.transpose(-2, -1)) / (d_k ** 0.5)
    
    # 2. Apply causal mask (-inf for future tokens)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))
        
    # 3. Softmax along key sequence dimension
    attn_weights = F.softmax(scores, dim=-1)
    
    # 4. Weighted combination of values
    output = torch.matmul(attn_weights, V)
    return output, attn_weights

# Verification
B, H, S, D = 2, 4, 8, 64
Q = torch.randn(B, H, S, D)
K = torch.randn(B, H, S, D)
V = torch.randn(B, H, S, D)
causal_mask = torch.tril(torch.ones(S, S))

out, weights = scaled_dot_product_attention(Q, K, V, mask=causal_mask)
print("Attention Output Shape:", out.shape)    # [2, 4, 8, 64]
print("Attention Weights Shape:", weights.shape) # [2, 4, 8, 8]
```

# Exercises

**🟢 Basic**: Verify empirically in PyTorch that the variance of the dot product of two random 128-dimensional vectors is approximately 128, and is normalized to 1.0 when scaled by $\frac{1}{\sqrt{128}}$.

**🟡 Intermediate**: Write a vectorized PyTorch implementation of Multi-Head Attention from scratch including input projection matrices $W_q, W_k, W_v, W_o$.

**🔴 Advanced**: Calculate the exact floating-point operation count (FLOPs) and memory bandwidth required to compute self-attention for sequence length $S=8192$ and hidden dimension $D=4096$.
""")

write_file(r"content/part-04-transformers-llms/chapter-25-attention/25.2-mha-gqa-mqa.md", r"""---
id: "25.2"
part: 4
chapter: 25
title: "Multi-Head (MHA), Multi-Query (MQA) & Grouped-Query Attention (GQA)"
slug: "mha-gqa-mqa"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["25.1"]
tags: ["gqa", "mqa", "mha", "kv-cache", "llama3"]
status: "published"
---

# Concept

During LLM autoregressive token generation, the memory bandwidth required to fetch Key-Value (KV) tensors from GPU High Bandwidth Memory (HBM) to on-chip SRAM dominates latency.

To reduce KV-cache memory consumption by **4x to 8x**, modern LLMs transitioned from Multi-Head Attention (MHA) to **Multi-Query Attention (MQA)** and **Grouped-Query Attention (GQA)**.

```mermaid
flowchart TD
    subgraph MHA ["1. Multi-Head Attention (MHA)<br>8 Q Heads, 8 K Heads, 8 V Heads (1:1 Ratio)"]
        Q8["Q0..Q7"] <--> K8["K0..K7"]
    end

    subgraph MQA ["2. Multi-Query Attention (MQA)<br>8 Q Heads, 1 K Head, 1 V Head (8:1 Ratio)"]
        Q_all["Q0..Q7"] <--> K1["Shared K0, V0"]
    end

    subgraph GQA ["3. Grouped-Query Attention (GQA - LLaMA-3)<br>8 Q Heads, 2 KV Groups (4:1 Ratio)"]
        Q_grp0["Q0..Q3"] <--> KV_grp0["Shared KV Head 0"]
        Q_grp1["Q4..Q7"] <--> KV_grp1["Shared KV Head 1"]
    end
```

# Architecture Comparison Table

| Architecture | Query Heads ($H_Q$) | KV Heads ($H_{KV}$) | KV Cache Memory Savings | Used In |
|---|---|---|---|---|
| **Multi-Head Attention (MHA)** | 32 | 32 | Baseline (1x) | GPT-3, Original Transformer |
| **Multi-Query Attention (MQA)** | 32 | 1 | **32x reduction** (Quality drop) | Falcon-7B, StarCoder |
| **Grouped-Query Attention (GQA)** | 32 | 8 | **4x reduction** (Zero quality loss) | **LLaMA-3, Mistral, Gemma-2** |

# PyTorch GQA Implementation

```python
import torch

def grouped_query_attention(Q, K, V, num_groups=4):
    # Q shape: [B, H_q, S_q, D] (e.g. 32 heads)
    # K, V shape: [B, H_kv, S_k, D] (e.g. 8 heads, so num_groups = 32 // 8 = 4)
    B, H_q, S_q, D = Q.shape
    B, H_kv, S_k, D = K.shape
    
    # Repeat/Broadcast KV heads across query groups
    K_expanded = K.repeat_interleave(num_groups, dim=1)  # [B, 32, S_k, D]
    V_expanded = V.repeat_interleave(num_groups, dim=1)  # [B, 32, S_k, D]
    
    # Standard Scaled Dot-Product Attention on expanded heads
    d_k = D ** 0.5
    scores = torch.matmul(Q, K_expanded.transpose(-2, -1)) / d_k
    weights = torch.softmax(scores, dim=-1)
    return torch.matmul(weights, V_expanded)

# Verify GQA with 32 Query heads and 8 KV heads
Q = torch.randn(2, 32, 16, 64)
K = torch.randn(2, 8, 16, 64)
V = torch.randn(2, 8, 16, 64)
out = grouped_query_attention(Q, K, V, num_groups=4)
print("GQA Output Shape:", out.shape)  # [2, 32, 16, 64]
```

# Exercises

**🟢 Basic**: Calculate the total KV-cache memory in gigabytes required to store 4,096 tokens for a 70B model with 64 heads, head dim 128, 80 layers in FP16 for MHA vs GQA (8 KV heads).

**🟡 Intermediate**: Write an efficient PyTorch GQA implementation using `torch.repeat_interleave` vs `torch.expand` and compare their memory allocation profiles.

**🔴 Advanced**: Analyze how GQA enables larger generation batch sizes on a single 80GB NVIDIA A100/H100 GPU before running Out-of-Memory (OOM).
""")

write_file(r"content/part-04-transformers-llms/chapter-25-attention/25.4-flash-attention.md", r"""---
id: "25.4"
part: 4
chapter: 25
title: "FlashAttention 1, 2 & 3: GPU SRAM Tiling & Online Softmax"
slug: "flash-attention"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["25.1", "17.2"]
tags: ["flash-attention", "cuda", "sram", "online-softmax", "dao"]
status: "published"
---

# Concept

Standard PyTorch self-attention computes and materializes the full $N \times N$ attention score matrix into GPU High Bandwidth Memory (HBM), causing $O(N^2)$ memory consumption and severe memory bandwidth bottlenecks.

**FlashAttention** (Tri Dao et al., 2022) is an exact (non-approximate) attention algorithm that computes attention in **$O(N)$ memory** by tiling $Q, K, V$ into blocks that fit into fast on-chip **GPU SRAM cache (192 KB per Streaming Multiprocessor)** and computing softmax incrementally using the **Online Softmax algorithm**.

```mermaid
flowchart TD
    subgraph StandardAttention ["Standard Attention: Memory Bandwidth Bound"]
        HBM_Q["GPU HBM (Global Memory)"] --> ReadQ["Read Q, K (HBM -> SRAM)"]
        ReadQ --> ComputeS["Compute S = Q*K^T"]
        ComputeS --> WriteS["WRITE S [N x N] BACK TO HBM! (Slow Bottleneck)"]
        WriteS --> ReadS["READ S BACK TO SRAM!"]
        ReadS --> SoftmaxCalc["Compute P = softmax(S)"]
        SoftmaxCalc --> WriteP["WRITE P BACK TO HBM!"]
        WriteP --> ReadPV["READ P, V TO SRAM"]
        ReadPV --> FinalO["Compute Output O = P*V"]
    end

    subgraph FlashAttention ["FlashAttention: Fused SRAM Kernel"]
        TileQ["Tile Q, K, V into SRAM Blocks (Br x Bc)"]
        TileQ --> OnlineSoftmax["Fused Kernel: Compute Attention Incrementally in SRAM via Online Softmax"]
        OnlineSoftmax --> WriteFinal["Write ONLY final Output O to HBM! (Zero N x N matrix in HBM!)"]
    end
```

# The Online Softmax Algorithm

To compute softmax across blocks without storing all values, Online Softmax updates scaling factors dynamically:

$$\text{Given previous maximum } m_{\text{old}} \text{ and new block maximum } m_{\text{new}} = \max(m_{\text{old}}, \max(x_i)):$$
$$d_{\text{new}} = d_{\text{old}} \cdot e^{m_{\text{old}} - m_{\text{new}}} + \sum e^{x_i - m_{\text{new}}}$$
$$\text{Output Correction: } O_{\text{new}} = O_{\text{old}} \cdot \frac{d_{\text{old}} e^{m_{\text{old}} - m_{\text{new}}}}{d_{\text{new}}} + \frac{\text{SoftmaxBlock} \cdot V_{\text{block}}}{d_{\text{new}}}$$

# Using FlashAttention-2 in PyTorch

```python
import torch

# PyTorch 2.0+ built-in FlashAttention-2 via Scaled Dot-Product Attention (SDPA)
Q = torch.randn(2, 32, 2048, 64, dtype=torch.float16, device='cuda')
K = torch.randn(2, 32, 2048, 64, dtype=torch.float16, device='cuda')
V = torch.randn(2, 32, 2048, 64, dtype=torch.float16, device='cuda')

# Enforce FlashAttention backend
with torch.backends.cuda.sdp_kernel(enable_flash=True, enable_math=False, enable_mem_efficient=False):
    out = torch.nn.functional.scaled_dot_product_attention(Q, K, V, is_causal=True)

print("FlashAttention Output Shape:", out.shape)
```

# Exercises

**🟢 Basic**: Benchmark execution time and peak GPU memory of PyTorch standard attention versus `F.scaled_dot_product_attention` for sequence lengths $S=1024, 2048, 4096, 8192$.

**🟡 Intermediate**: Implement the Online Softmax mathematical algorithm in pure Python on 1D vectors and verify that it produces identical outputs to standard two-pass softmax.

**🔴 Advanced**: Explain how FlashAttention-3 leverages NVIDIA Hopper H100 asynchronous Tensor Core pipelines (WGMMA / TMA) to achieve near-peak 800 TFLOPs FP16 throughput.
""")

print("ML Foundations & Attention authored with supreme depth!")
