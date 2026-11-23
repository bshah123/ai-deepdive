"""Every number used in lesson 24.4 (ALiBi) comes from this script.

Run once:  python3 scripts/diagrams/lessons/24.4_data.py
Pure NumPy and the standard library.
"""
import math

import numpy as np


def alibi_slopes(n_heads):
    """Head slopes, following the BLOOM implementation (transformers, _get_alibi_slopes).

    For a power-of-two head count n the slopes are 2**(-8*k/n), k = 1..n.
    Otherwise the closest power of two p is used, plus the odd-indexed slopes of
    the 2p sequence for the remaining heads.
    """
    def base_for(p):
        return 2 ** (-(2 ** -(math.log2(p) - 3)))

    p = 2 ** math.floor(math.log2(n_heads))
    slopes = [base_for(p) ** k for k in range(1, p + 1)]
    if p != n_heads:
        rem = min(p, n_heads - p)
        slopes += [base_for(2 * p) ** k for k in range(1, 2 * rem + 1, 2)]
    return np.array(slopes)


def causal_alibi_bias(L, m):
    """B[i, j] = -m * (i - j) for j <= i, -inf for j > i (the causal mask)."""
    i = np.arange(L)[:, None]
    j = np.arange(L)[None, :]
    B = -m * (i - j).astype(float)
    B[j > i] = -np.inf
    return B


def softmax(x):
    x = x - np.max(x)
    e = np.exp(x)
    return e / e.sum()


# ---- 1. Head slopes -------------------------------------------------------
s8 = alibi_slopes(8)
print("1. slopes, 8 heads:", np.round(s8, 6).tolist())
assert np.allclose(s8, 2.0 ** (-np.arange(1, 9)))           # 2**-k, k = 1..8
s12 = alibi_slopes(12)
print("   slopes, 12 heads:", np.round(s12, 6).tolist())
print("   slopes, 16 heads (first 4):", np.round(alibi_slopes(16)[:4], 6).tolist())

# ---- 2. Causal bias matrix for L = 5, m = 1/2 -------------------------------
m = 0.5
B = causal_alibi_bias(5, m)
print("\n2. causal bias matrix, L=5, m=1/2 (row i = query, col j = key):")
for row in B:
    print("   " + " ".join(f"{v:6.2f}" if np.isfinite(v) else "  -inf" for v in row))

# ---- 3. Worked example: query i = 4, all content scores equal to 0 ----------
i = 4
bias_row = B[i][: i + 1]                     # keys j = 0..4
e = np.exp(bias_row)
w = softmax(bias_row)
print("\n3. query i=4, zero content scores, m=1/2")
print("   bias  (j=0..4):", bias_row.tolist())
print("   exp(bias)      :", np.round(e, 6).tolist())
print("   sum exp        :", round(float(e.sum()), 6))
print("   weights        :", np.round(w, 4).tolist())
print("   check sum      :", round(float(w.sum()), 12))

# ---- 4. Effective window per head, uniform content, infinite causal context --
# With zero content scores the weight on distance d is proportional to r**d,
# r = exp(-m). Fraction of mass within distance <= D: 1 - r**(D+1) (infinite L).
# Smallest D reaching 90 percent: D90 = ceil(ln(0.1)/ln(r)) - 1.
print("\n4. effective window (90% of mass), uniform content")
d90 = []
for k, m_h in enumerate(s8, start=1):
    r = math.exp(-m_h)
    D = math.ceil(math.log(0.1) / math.log(r)) - 1
    # finite-length check at L = 2048 (normaliser 1 - r**L)
    L = 2048
    frac = (1 - r ** (D + 1)) / (1 - r ** L)
    d90.append(D)
    print(f"   head {k}: m={m_h:<10.6g} r={r:.6f}  D90={D:4d}  frac(L=2048)={frac:.4f}")

# ---- 5. Training length 1024 vs test length 2048 ----------------------------
print("\n5. bias values and log10 of relative weight vs the nearest key")
print("   m          bias@1023   bias@2047   log10 w(1023)  log10 w(2047)")
for m_h in [s8[0], s8[3], s8[7]]:
    print(f"   {m_h:<10.6g} {-m_h*1023:10.3f} {-m_h*2047:11.3f} "
          f"{-m_h*1023/math.log(10):14.2f} {-m_h*2047/math.log(10):14.2f}")

# ---- 6. Shift invariance: -m(i-j) and +m*j differ by a per-row constant ----
rng = np.random.default_rng(0)
L = 6
S = rng.normal(size=(L, L))                  # arbitrary content scores
mask = np.triu(np.ones((L, L), dtype=bool), 1)
def rowwise_softmax(X):
    X = np.where(mask, -np.inf, X)
    X = X - X.max(axis=1, keepdims=True)
    E = np.exp(X)
    return E / E.sum(axis=1, keepdims=True)
Bp = -m * (np.arange(L)[:, None] - np.arange(L)[None, :]).astype(float)
Bb = m * np.arange(L)[None, :].astype(float) * np.ones((L, 1))
diff = np.max(np.abs(rowwise_softmax(S + Bp) - rowwise_softmax(S + Bb)))
print("\n6. max |softmax(S - m(i-j)) - softmax(S + m j)| =", f"{diff:.2e}")

# ---- 7. Content override: far key with score advantage delta vs nearest key ----
delta = 4.0
print("\n7. crossover distance d* = delta / m for delta = 4 (far key beats nearest key)")
for k, m_h in enumerate(s8, start=1):
    print(f"   head {k}: m={m_h:<10.6g} d*={delta / m_h:8.1f}")
