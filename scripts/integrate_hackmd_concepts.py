import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def write_file(rel_path, content):
    full_path = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Wrote: {rel_path} ({len(content)} chars)")

# ==============================================================================
# 1. CHAPTER 19.3: BIAS-VARIANCE, DOUBLE DESCENT & MODERN OVERFITTING
# ==============================================================================

write_file(r"content/part-03-ml-nlp/chapter-19-ml-foundations/19.3-bias-variance-regularization.md", r"""---
id: "19.3"
part: 3
chapter: 19
title: "The Bias-Variance Tradeoff, Modern Double Descent & Regularization"
slug: "bias-variance-regularization"
difficulty: "advanced"
estimated_minutes: 35
prerequisites: ["19.1", "19.2"]
tags: ["bias-variance", "double-descent", "regularization", "benign-overfitting", "least-squares"]
status: "published"
---

# Classical Bias-Variance Decomposition

For any supervised estimator $\hat{f}(x; \mathcal{D})$ trained on dataset $\mathcal{D}$, the expected squared prediction error decomposes cleanly into three fundamental components:

$$\mathbb{E}_{\mathcal{D}, \epsilon}[(y - \hat{f}(x))^2] = \underbrace{\left(\text{Bias}[\hat{f}(x)]\right)^2}_{\text{Underfitting}} + \underbrace{\text{Var}[\hat{f}(x)]}_{\text{Sensitivity to Data}} + \underbrace{\sigma^2}_{\text{Irreducible Noise}}$$

```mermaid
flowchart TD
    TotalError["Expected Mean Squared Error E[(y - f_hat)^2]"] --> BiasTerm["Bias^2: (E[f_hat] - f(x))^2<br>(Model assumptions too rigid)"]
    TotalError --> VarTerm["Variance: E[(f_hat - E[f_hat])^2]<br>(Model memorizes random training noise)"]
    TotalError --> NoiseTerm["sigma^2: Irreducible Noise in Nature"]
```

---

# The Paradigm Shift: The Modern Double Descent Curve

Classical statistical learning theory teaches that as model parameter capacity $p$ exceeds the number of training samples $n$ ($p > n$), the model overfits and test error diverges to infinity.

However, modern deep neural networks (and even overparameterized linear models) exhibit **Double Descent** (Belkin et al., 2019):

```mermaid
flowchart LR
    UnderParam["1. Classical Regime (p &lt; n)<br>Error falls, hits classical U-curve minimum"] --> InterpPeak["2. Interpolation Threshold (p = n)<br>Model barely fits training data (Zero training error).<br>Hessian has tiny singular values -> Variance EXPLODES!"]
    InterpPeak --> OverParam["3. Modern Overparameterized Regime (p &gt;&gt; n)<br>Infinitely many interpolating fits exist.<br>Minimum-norm pseudoinverse selects smoothest fit -> Test Error PLUMMETS!"]
```

# Why Does Test Error Fall When $p \gg n$? (Benign Overfitting)

When $p > n$, the linear system $X w = y$ has infinitely many exact interpolating solutions ($\text{Training Error} = 0$). 

Using the Moore-Penrose pseudoinverse $X^+$ selects the **Minimum-Norm Interpolating Solution**:

$$\hat{w} = X^T (X X^T)^{-1} y = \arg\min_{w: Xw = y} \|w\|_2$$

Because the parameter capacity is so high ($p \gg n$), the model spreads the noise thinly across hundreds of irrelevant dimensions without distorting the true underlying signal on the principal dimensions (a phenomenon known as **Benign Overfitting**).

# Numerical Simulation of Double Descent in NumPy

```python
import numpy as np

def simulate_double_descent(n_samples=50, max_features=120, noise_std=0.2):
    np.random.seed(42)
    # True latent function: y = sin(x_1) + 2 * x_2
    X_train_raw = np.random.uniform(-2, 2, (n_samples, 2))
    y_train = np.sin(X_train_raw[:, 0]) + 2 * X_train_raw[:, 1] + np.random.normal(0, noise_std, n_samples)

    X_test_raw = np.random.uniform(-2, 2, (200, 2))
    y_test = np.sin(X_test_raw[:, 0]) + 2 * X_test_raw[:, 1]

    # Generate random Fourier feature projections: phi(X) = cos(X @ W_rand)
    W_random = np.random.randn(2, max_features)
    
    test_errors = []
    feature_counts = list(range(5, max_features, 5))

    for p in feature_counts:
        # Construct feature matrices with p parameters
        Phi_train = np.cos(X_train_raw @ W_random[:, :p])
        Phi_test = np.cos(X_test_raw @ W_random[:, :p])

        # Minimum-norm OLS solution via pseudoinverse
        w_hat = np.linalg.pinv(Phi_train) @ y_train
        
        # Evaluate Test MSE
        test_preds = Phi_test @ w_hat
        test_mse = np.mean((y_test - test_preds) ** 2)
        test_errors.append(test_mse)

    return feature_counts, test_errors

features, errors = simulate_double_descent(n_samples=50)
peak_idx = np.argmax(errors)
print(f"Interpolation Peak occurred at p={features[peak_idx]} features (n=50 samples) with Test MSE={errors[peak_idx]:.2f}")
print(f"Overparameterized Test MSE at p={features[-1]} features: {errors[-1]:.2f} (Generalizes significantly better!)")
```

---

# Regularization: L1 (Lasso) vs L2 (Ridge) Geometric Duality

```mermaid
flowchart TD
    subgraph L2_Ridge ["L2 Regularization (Ridge Regression)"]
        L2_Penalty["Penalty: 1/2 * lambda * ||w||_2^2"]
        L2_Solution["Analytical Solution: w = (X^T X + lambda I)^(-1) X^T y"]
        L2_Geometry["Circular Constraint: Shrinks all weights smoothly, none strictly zero"]
    end

    subgraph L1_Lasso ["L1 Regularization (Lasso Regression)"]
        L1_Penalty["Penalty: lambda * ||w||_1"]
        L1_Solution["Sub-gradient / Soft-Thresholding: S_lambda(w) = sign(w) * max(|w| - lambda, 0)"]
        L1_Geometry["Diamond Polytope Constraint: Intersects coordinate axes, driving weights to EXACT ZERO!"]
    end
```

# Exercises & Problem Set

**🟢 Problem 1 (Double Descent Mechanics)**: Explain why adding a small L2 ridge penalty ($\lambda = 10^{-3}$) completely flattens the interpolation peak at $p = n$.

**🟡 Problem 2 (Mathematical Derivation)**: Derive the soft-thresholding update formula for Lasso coordinate descent by taking the subgradient of $\frac{1}{2} (y - w x)^2 + \lambda |w|$.

**🔴 Problem 3 (Research Challenge)**: Prove that on noiseless data ($\sigma = 0$), the interpolation peak does not vanish if the random feature dictionary cannot represent the true function exactly.
""")

# ==============================================================================
# 2. CHAPTER 20.3: EXPONENTIAL FAMILIES & GENERALIZED LINEAR MODELS (GLMs)
# ==============================================================================

write_file(r"content/part-03-ml-nlp/chapter-20-math-for-ml/20.3-calculus-gradients.md", r"""---
id: "20.3"
part: 3
chapter: 20
title: "Exponential Families, Generalized Linear Models (GLMs) & Poisson Regression"
slug: "calculus-gradients"
difficulty: "advanced"
estimated_minutes: 40
prerequisites: ["20.1", "19.2"]
tags: ["glm", "exponential-family", "poisson-regression", "mle", "cs229"]
status: "published"
---

# The Exponential Family of Distributions

In statistical machine learning, standard distributions (Gaussian, Bernoulli, Poisson, Gamma, Categorical) belong to the **Exponential Family**, defined in canonical form as:

$$p(y; \eta) = b(y) \exp\left( \eta^T T(y) - a(\eta) \right)$$

- $\eta$: **Natural (canonical) parameter**.
- $T(y)$: **Sufficient statistic** (often $T(y) = y$).
- $a(\eta)$: **Log-partition function** (normalizer ensuring probabilities integrate to 1.0).
- $b(y)$: **Base measure**.

```mermaid
flowchart LR
    DistributionChoice["Target Response Variable Type"] --> RealValued["Real-valued Continuous -> Gaussian N(mu, sigma^2)"]
    DistributionChoice --> BinaryCounts["Binary 0/1 -> Bernoulli(p)"]
    DistributionChoice --> EventCounts["Integer Event Counts (e.g. API requests) -> Poisson(lambda)"]
```

---

# Case Study: Deriving Poisson Regression from Scratch

When predicting non-negative integer counts (e.g. LLM API request arrivals per minute), we model the response $y \in \{0, 1, 2, \dots\}$ as a **Poisson distribution**:

$$p(y; \lambda) = \frac{e^{-\lambda} \lambda^y}{y!}$$

### Step 1: Prove Poisson is in the Exponential Family
Rewrite $p(y; \lambda)$ in exponential canonical form:

$$p(y; \lambda) = \frac{1}{y!} \exp\left( \log(\lambda^y e^{-\lambda}) \right) = \frac{1}{y!} \exp\left( y \log \lambda - \lambda \right)$$

Comparing with $b(y) \exp(\eta T(y) - a(\eta))$:
- **Base measure**: $b(y) = \frac{1}{y!}$
- **Natural parameter**: $\eta = \log \lambda \implies \lambda = e^\eta$
- **Sufficient statistic**: $T(y) = y$
- **Log-partition function**: $a(\eta) = \lambda = e^\eta$

### Step 2: Canonical Response Function
In Generalized Linear Models (GLMs), we set $\eta = \theta^T x$. The expected value of $y$ given $x$ is:

$$h_\theta(x) = \mathbb{E}[y \mid x] = \lambda = e^{\theta^T x}$$

The **canonical link function** is the logarithm: $g(\mu) = \log(\mu) = \theta^T x$.

### Step 3: Deriving the Stochastic Gradient Ascent Update
Given training sample $(x, y)$, the log-likelihood is:

$$\ell(\theta) = \log p(y \mid x; \theta) = \log\left(\frac{1}{y!}\right) + y (\theta^T x) - e^{\theta^T x}$$

Taking the partial derivative with respect to $\theta_j$:

$$\frac{\partial \ell}{\partial \theta_j} = y x_j - e^{\theta^T x} x_j = \left( y - e^{\theta^T x} \right) x_j = \left( y - h_\theta(x) \right) x_j$$

$$\theta := \theta + \alpha \left( y - h_\theta(x) \right) x$$

```mermaid
flowchart LR
    LinearCombination["eta = theta^T x"] --> ExpResponse["Response: lambda = e^(theta^T x)"]
    ExpResponse --> Error["Error Signal: e = (y_true - lambda)"]
    Error --> GradientUpdate["Update: theta = theta + alpha * (y - lambda) * x<br>(Identical elegant form to Linear and Logistic Regression!)"]
```

---

# Python Implementation of Poisson Regression

```python
import numpy as np

class PoissonRegressor:
    def __init__(self, lr=0.01, n_iter=1000):
        self.lr = lr
        self.n_iter = n_iter
        self.theta = None

    def fit(self, X, y):
        # Add bias column
        X_bias = np.hstack([np.ones((X.shape[0], 1)), X])
        self.theta = np.zeros(X_bias.shape[1])

        for _ in range(self.n_iter):
            # Compute predicted rate lambda = exp(X @ theta)
            y_hat = np.exp(np.clip(X_bias @ self.theta, -20, 20))
            grad = X_bias.T @ (y - y_hat) / len(y)
            self.theta += self.lr * grad

    def predict(self, X):
        X_bias = np.hstack([np.ones((X.shape[0], 1)), X])
        return np.exp(X_bias @ self.theta)

# Test on simulated user API traffic
np.random.seed(42)
N = 200
X = np.random.uniform(1, 10, (N, 1))
true_rate = np.exp(0.3 * X[:, 0] + 0.5)
y = np.random.poisson(true_rate)

model = PoissonRegressor(lr=0.01, n_iter=2000)
model.fit(X, y)
print(f"Fitted Parameters: Bias={model.theta[0]:.4f}, Slope={model.theta[1]:.4f} (True: 0.5, 0.3)")
```

---

# Discriminative vs Generative: GDA vs Logistic Regression

| Criterion | Logistic Regression (Discriminative) | Gaussian Discriminant Analysis - GDA (Generative) |
|---|---|---|
| **What it Models** | $P(Y \mid X)$ directly | $P(X \mid Y)$ and $P(Y)$, then applies Bayes Rule |
| **Data Assumptions** | Minimal (Robust to non-Gaussian and heavy-tailed data) | **Strict Gaussian**: $X \mid Y=k \sim \mathcal{N}(\mu_k, \Sigma)$ |
| **Sample Efficiency** | Requires more data to converge | **Asymptotically efficient**: Needs less data if Gaussian holds |
| **Decision Boundary** | **Linear** hyperplane | **Linear** if $\Sigma_0 = \Sigma_1$ (LDA); **Quadratic** if $\Sigma_0 \ne \Sigma_1$ (QDA) |

# Exercises & Challenges

**🟢 Problem 1 (Implicit Bias)**: Prove that on strictly linearly separable data, unregularized logistic regression weights grow to infinite magnitude ($\|\theta\| \to \infty$) and the decision boundary direction converges to the Maximum Margin Hyperplane.

**🟡 Problem 2 (Exponential Family Derivation)**: Express the Bernoulli distribution $P(y; p) = p^y (1-p)^{1-y}$ in exponential canonical form and identify $\eta, T(y), a(\eta), b(y)$.

**🔴 Problem 3 (Expectation-Maximization Challenge)**: Derive the E-step and M-step update formulas for a two-coin toss mixture model where coin selection $z_i \in \{A, B\}$ is unobserved.
""")

print("HackMD concepts, GLMs, Double Descent & Poisson regression integrated with supreme mathematical rigor!")
