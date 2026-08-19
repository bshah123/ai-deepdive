import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# LESSON 21.3: ADAMW OPTIMIZER
# ==============================================================================

write_file(r"content/part-03-ml-nlp/chapter-21-neural-networks/21.3-optimizers-adamw.md", r"""---
id: "21.3"
part: 3
chapter: 21
title: "First & Second-Moment Optimizers: SGD, Momentum, RMSProp, Adam & AdamW"
slug: "optimizers-adamw"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["21.1", "20.3"]
tags: ["adamw", "optimizers", "gradient-descent", "momentum", "weight-decay"]
contentShape: "mathematical-derivation"
openingType: "comparison"
status: "published"
---

# The Evolution of Neural Network Optimizers

Training deep neural networks requires navigating highly non-convex loss landscapes characterized by steep ravines, saddle points, and pathological curvature:

```mermaid
flowchart LR
    SGD["1. Vanilla SGD:<br>Oscillates wildly in ravines"] --> Momentum["2. SGD with Momentum (1886):<br>Dampens oscillations with velocity v"]
    Momentum --> RMSProp["3. RMSProp (Hinton 2012):<br>Per-parameter adaptive learning rates via 2nd moment s"]
    RMSProp --> Adam["4. Adam (Kingma & Ba 2014):<br>Combines 1st & 2nd moments + Bias correction"]
    Adam --> AdamW["5. AdamW (Loshchilov & Hutter 2017):<br>Decouples L2 weight decay from gradient updates!"]
```

---

# Why Standard L2 Regularization Fails in Adam (The AdamW Fix)

In standard SGD, adding an $L2$ penalty $\frac{1}{2} \lambda \|\theta\|^2$ is mathematically equivalent to **Weight Decay**:

$$\theta_{t+1} = \theta_t - \alpha \nabla_\theta \mathcal{L} - \alpha \lambda \theta_t$$

However, in **Adam**, L2 regularization is passed directly into the adaptive gradient accumulator ($g_t = \nabla \mathcal{L} + \lambda \theta_t$). This causes the second-moment accumulator $v_t$ to scale up:

$$v_t = \beta_2 v_{t-1} + (1 - \beta_2)(\nabla \mathcal{L} + \lambda \theta_t)^2$$

When a parameter has large historical gradients, $\sqrt{v_t}$ is large, which **suppresses the regularization penalty**! Weights that need the most regularization receive the least.

### The AdamW Decoupled Weight Decay Update:
**AdamW** decouples the weight decay from the gradient moments by subtracting the decay directly from $\theta_t$:

```mermaid
flowchart TD
    Grad["1. Compute Gradient: g_t = nabla_theta L(theta_t)"] --> Mom1["2. Update 1st Moment (Velocity): m_t = beta1 * m_{t-1} + (1 - beta1) * g_t"]
    Grad --> Mom2["3. Update 2nd Moment (Scale): v_t = beta2 * v_{t-1} + (1 - beta2) * g_t^2"]
    Mom1 --> BiasCorr["4. Bias Corrections: m_hat = m_t / (1 - beta1^t),  v_hat = v_t / (1 - beta2^t)"]
    Mom2 --> BiasCorr
    BiasCorr --> Update["5. AdamW Parameter Step: theta_{t+1} = theta_t - alpha * (m_hat / (sqrt(v_hat) + eps)) - alpha * lambda * theta_t"]
```

---

# Pure PyTorch AdamW Implementation from Scratch

```python
import torch
from typing import List

class ScratchAdamW:
    def __init__(
        self,
        params: List[torch.Tensor],
        lr: float = 1e-3,
        betas: tuple = (0.9, 0.999),
        eps: float = 1e-8,
        weight_decay: float = 0.01
    ):
        self.params = list(params)
        self.lr = lr
        self.beta1, self.beta2 = betas
        self.eps = eps
        self.weight_decay = weight_decay
        self.t = 0
        
        # State buffers
        self.m = [torch.zeros_like(p) for p in self.params]
        self.v = [torch.zeros_like(p) for p in self.params]

    @torch.no_grad()
    def step(self):
        self.t += 1
        for i, p in enumerate(self.params):
            if p.grad is None:
                continue
            g = p.grad
            
            # 1. Update biased 1st and 2nd moment estimates
            self.m[i].mul_(self.beta1).add_(g, alpha=1 - self.beta1)
            self.v[i].mul_(self.beta2).addcmul_(g, g, value=1 - self.beta2)
            
            # 2. Compute bias-corrected moments
            m_hat = self.m[i] / (1.0 - self.beta1 ** self.t)
            v_hat = self.v[i] / (1.0 - self.beta2 ** self.t)
            
            # 3. Apply Decoupled Weight Decay
            p.mul_(1.0 - self.lr * self.weight_decay)
            
            # 4. Apply Adaptive Gradient Update
            p.addcdiv_(m_hat, v_hat.sqrt().add_(self.eps), value=-self.lr)

    def zero_grad(self):
        for p in self.params:
            if p.grad is not None:
                p.grad.zero_()

# Test AdamW
w = torch.randn(10, requires_grad=True)
opt = ScratchAdamW([w], lr=0.01, weight_decay=0.05)

for _ in range(5):
    loss = (w ** 2).sum()
    loss.backward()
    opt.step()
    opt.zero_grad()

print(f"Optimized Weight L2 Norm: {w.norm().item():.4f}")
```

---

# Optimizer Comparison Matrix

| Optimizer | Memory Overhead per Parameter | Hyperparameters | Convergence Speed | Best For |
|---|---|---|---|---|
| **SGD + Momentum** | $+1$ state tensor ($v$) | $\alpha, \beta$ | Slow on ill-conditioned problems | Computer Vision (ResNet / ConvNets) |
| **RMSProp** | $+1$ state tensor ($s$) | $\alpha, \beta_2, \epsilon$ | Fast | Non-stationary / RL environments |
| **Adam** | $+2$ state tensors ($m, v$) | $\alpha, \beta_1, \beta_2, \epsilon$ | Very Fast | Prototyping & Generative Models |
| **AdamW** | $+2$ state tensors ($m, v$) | $\alpha, \beta_1, \beta_2, \epsilon, \lambda$ | **Fastest & Best Generalization** | **LLMs, Transformers, Diffusion** |

---

# Exercises & Problem Set

**🟢 Challenge 1**: Explain why bias correction ($\frac{m_t}{1 - \beta_1^t}$) is essential during the initial 100 training steps when $m_0 = 0$.

**🟡 Challenge 2**: Calculate the total GPU memory in Gigabytes required to store optimizer states for a 70B parameter FP16 model trained under AdamW.

**🔴 Challenge 3**: Implement Lion (EvoLved Sign Momentum) optimizer in PyTorch which tracks only the first moment and uses the sign function `torch.sign()`, saving 50% optimizer memory.
""")

# ==============================================================================
# LESSON 22.3: GLOVE & FASTTEXT
# ==============================================================================

write_file(r"content/part-03-ml-nlp/chapter-22-traditional-nlp/22.3-glove-fasttext.md", r"""---
id: "22.3"
part: 3
chapter: 22
title: "GloVe & FastText: Global Co-occurrence Matrix Factorization & Subwords"
slug: "glove-fasttext"
difficulty: "intermediate"
estimated_minutes: 35
prerequisites: ["22.1", "20.2"]
tags: ["glove", "fasttext", "embeddings", "subwords", "matrix-factorization"]
contentShape: "compare-choose"
openingType: "comparison"
status: "published"
---

# The Limitations of Local Context Window Embeddings

While Word2Vec (Skip-Gram / CBOW) learns embeddings from local context windows (e.g. 5 tokens), it ignores **global corpus-level statistical co-occurrence statistics**.

**GloVe (Global Vectors)** (Pennington et al., Stanford 2014) directly factorizes the global co-occurrence matrix:

```mermaid
flowchart TD
    subgraph GlobalMatrix ["1. Global Co-occurrence Matrix X (Vocab x Vocab)"]
        MatrixCell["X_{ij} = Total times word j appeared in context of word i across entire internet"]
    end

    subgraph RatioInsight ["2. Co-occurrence Probability Ratios"]
        Ratio["P(k | ice) / P(k | steam) -> Differentiates 'solid' vs 'gas' globally!"]
    end

    subgraph LogBilinearObjective ["3. GloVe Log-Bilinear Least Squares Objective"]
        Obj["L = sum f(X_{ij}) * (w_i^T w_j + b_i + b_j - log X_{ij})^2"]
    end

    GlobalMatrix --> RatioInsight --> LogBilinearObjective
```

---

# FastText: Solving Out-Of-Vocabulary (OOV) with Subwords

Standard word embeddings assign one vector per word. When encountering an unseen word (e.g. `bioinformaticist`, typos like `transformerr`), word-level embeddings fail ($[0, \dots, 0]$).

**FastText** (Bojanowski et al., Meta AI 2016) represents words as the sum of their **character n-grams**:

```mermaid
flowchart LR
    Word["Word: '<where>'"] --> NGrams["3-Grams: '<wh', 'whe', 'her', 'ere', 're>'<br>+ Full Word Token '<where>'"]
    NGrams --> HashBucket["Map n-grams to embedding table via hashing"]
    HashBucket --> SumVector["v_word = sum(v_ngram)<br>(Even rare / unseen words get rich representations!)"]
```

---

# Python FastText Subword Generator

```python
def generate_character_ngrams(word: str, min_n: int = 3, max_n: int = 6) -> list[str]:
    # Add boundary markers
    bounded_word = f"<{word}>"
    ngrams = []
    
    for n in range(min_n, max_n + 1):
        for i in range(len(bounded_word) - n + 1):
            ngrams.append(bounded_word[i : i + n])
            
    ngrams.append(bounded_word) # Include full word token
    return ngrams

word = "transformer"
grams = generate_character_ngrams(word, min_n=3, max_n=4)
print(f"Generated {len(grams)} subword n-grams for '{word}':")
print("Sample n-grams:", grams[:8])
```

---

# Embeddings Comparison Matrix

| Model | Representation Level | Global vs Local Statistics | Out-of-Vocabulary (OOV) Handling | Best Used For |
|---|---|---|---|---|
| **Word2Vec (SGNS)** | Whole Word | Local sliding window ($k=5$) | Fails (Returns unk token) | Lightweight semantic analogies |
| **GloVe** | Whole Word | Global matrix factorization | Fails (Returns unk token) | Large-scale pre-computed word vectors |
| **FastText** | **Character n-grams** | Local window over subwords | **Excellent (Sums subword n-grams)** | Morphology-rich languages & noisy text |
| **BPE / WordPiece** | Subword Tokens | Sequence-level self-attention | **Perfect (Decomposes to single bytes)** | **Modern LLMs (GPT-4, LLaMA-3)** |

---

# Exercises & Challenges

**🟢 Challenge 1**: Verify why the weighting function $f(X_{ij}) = \min\left(1, \left(\frac{X_{ij}}{x_{\max}}\right)^\alpha\right)$ with $\alpha = 0.75$ prevents extremely frequent stop words (e.g. `"the"`, `"and"`) from dominating the GloVe loss.

**🟡 Challenge 2**: Calculate the cosine similarity between the FastText vector of an unseen typo word (`"attentiion"`) and the canonical word (`"attention"`).

**🔴 Challenge 3**: Implement a pure NumPy GloVe SGD training loop that fits 16-dimensional vectors on a synthetic $50 \times 50$ co-occurrence matrix.
""")

print("Part 3 enriched with deep mathematical optimization, AdamW decoupled weight decay, and GloVe/FastText subword mechanics!")
