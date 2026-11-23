"""Experiment for lesson 29.3 (speculative decoding). NumPy only, fixed seeds.

Every number used in the lesson text or diagrams is printed by this script.
"""
import numpy as np

np.set_printoptions(precision=4, suppress=True)
rng = np.random.default_rng(29)

# ---------------------------------------------------------------- A. one position
# Target p and draft q over 5 tokens. Exact check of the accept/reject rule.
p = np.array([0.40, 0.10, 0.25, 0.15, 0.10])
q = np.array([0.20, 0.30, 0.20, 0.15, 0.15])
assert np.isclose(p.sum(), 1) and np.isclose(q.sum(), 1)

accept_prob = np.minimum(1.0, p / q)           # P(accept | draft proposed x)
overlap = np.minimum(p, q)                     # mass that is kept as-is
beta = overlap.sum()                           # P(accept) for a draft token drawn from q
resid = np.maximum(0.0, p - q)                 # leftover target mass
assert np.isclose(resid.sum(), 1 - beta)       # sum of positive parts = 1 - beta
resid_norm = resid / resid.sum()               # distribution used after a rejection

exact_out = q * accept_prob + (1 - beta) * resid_norm   # P(output = x), exact
print("A. one position")
print("p            :", p)
print("q            :", q)
print("accept_prob  :", accept_prob)
print("q*accept     :", q * accept_prob)
print("min(p,q)     :", overlap, " beta =", round(beta, 4))
print("resid (p-q)+ :", resid, " 1-beta =", round(1 - beta, 4))
print("resid_norm   :", resid_norm)
print("exact output :", exact_out)
print("max |exact - p| =", float(np.abs(exact_out - p).max()))

# Monte Carlo of the full procedure (one draft token, one correction)
N = 400_000
x = rng.choice(5, size=N, p=q)                 # draft proposes x ~ q
u = rng.random(N)
accepted = u < accept_prob[x]
y = np.where(accepted, x, rng.choice(5, size=N, p=resid_norm))
emp = np.bincount(y, minlength=5) / N
print("empirical    :", emp, " (N =", N, ")")
print("max |emp - p| =", round(float(np.abs(emp - p).max()), 4))
print("empirical accept rate =", round(float(accepted.mean()), 4))

# ---------------------------------------------------------------- B. tokens per call
# iid acceptance alpha per draft token, gamma draft tokens per round.
# Emitted tokens per round = (accepted draft prefix) + 1 (correction or bonus).
def expected_tokens(alpha, gamma):
    return (1 - alpha ** (gamma + 1)) / (1 - alpha) if alpha < 1 else gamma + 1

def simulate_tokens(alpha, gamma, trials=200_000):
    u = rng.random((trials, gamma))
    ok = u < alpha
    # length of the leading run of True per row
    prefix = np.where(ok.all(axis=1), gamma, np.argmin(ok, axis=1))
    return (prefix + 1).mean()

print("\nB. expected tokens per target call (iid acceptance alpha)")
for alpha in (0.5, 0.7, 0.8, 0.9):
    row = []
    for gamma in (1, 2, 4, 8):
        f = expected_tokens(alpha, gamma)
        s = simulate_tokens(alpha, gamma)
        row.append(f"g={gamma}: {f:.3f} (sim {s:.3f})")
    print(f"alpha={alpha}: " + " | ".join(row))

# ---------------------------------------------------------------- C. cost model
# Assumption: one target call over gamma+1 positions costs about the same as one
# single-token target step (memory-bound decode). Draft step costs c * target step.
def speedup(alpha, gamma, c):
    return expected_tokens(alpha, gamma) / (gamma * c + 1)

print("\nC. modelled speedup = E[tokens] / (gamma*c + 1)")
for alpha, gamma, c in [(0.8, 4, 0.1), (0.8, 4, 0.05), (0.5, 4, 0.1), (0.9, 8, 0.05), (0.8, 2, 0.5)]:
    print(f"alpha={alpha} gamma={gamma} c={c}: E={expected_tokens(alpha, gamma):.4f} "
          f"speedup={speedup(alpha, gamma, c):.3f}")


# ---------------------------------------------------------------- D. Medusa-style toy (identical code to the lesson)
import numpy as np

V, K, S = 10, 3, 0.6                                   # vocabulary, heads, head noise
rng = np.random.default_rng(29)

def softmax_rows(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)

logits = rng.normal(0, 1.5, (V, V))
T = softmax_rows(logits)                                # target: next-token probabilities
T_hat = softmax_rows(logits + rng.normal(0, S, (V, V))) # heads: an imperfect copy of T
contexts = rng.integers(0, V, 3000)                     # random last-verified tokens

def target_chain(prev):
    """Greedy continuation of the target model: K+1 tokens, chain[0] is the next token."""
    chain, cur = [], prev
    for _ in range(K + 1):
        cur = int(np.argmax(T[cur]))
        chain.append(cur)
    return chain

def head_top(prev, k, width):
    """Head k guesses the token k+1 steps ahead; keep its top `width` choices."""
    dist = np.linalg.matrix_power(T_hat, k + 1)[prev]
    return [int(t) for t in np.argsort(-dist)[:width]]

def build_tree(prev, width):
    """Every combination of the top choices of heads 1..K: the candidate paths."""
    paths = [()]
    for k in range(1, K + 1):
        top = head_top(prev, k, width)
        paths = [p + (t,) for p in paths for t in top]
    return paths

def tokens_emitted(prev, width):
    """One target call. chain[0] is the next token (from the base model, always right).
    Head k guesses chain[k]. Keep the longest run of matching guesses, then add the
    target's own token after that run."""
    chain = target_chain(prev)
    best = 0
    for path in build_tree(prev, width):
        n = 0
        while n < K and path[n] == chain[n + 1]:
            n += 1
        best = max(best, n)
    return best + 1

for width in (1, 2, 3):
    emitted = np.array([tokens_emitted(int(c), width) for c in contexts])
    print(f"top-{width} per head: {width**K:2d} candidates, "
          f"tokens per target call = {emitted.mean():.3f}")

prev = 9
print("context", prev, "head top-2:", [head_top(prev, k, 2) for k in range(1, K + 1)])
print("target chain:", target_chain(prev), "-> tokens emitted:", tokens_emitted(prev, 2))

# ---------------------------------------------------------------- dump for the diagrams
import json, os
means = {}
for width in (1, 2, 3):
    means[str(width)] = float(np.mean([tokens_emitted(int(c), width) for c in contexts]))
out = {
    "p": p.tolist(), "q": q.tolist(), "accept_prob": accept_prob.tolist(),
    "min_pq": overlap.tolist(), "resid_norm": resid_norm.tolist(), "beta": float(beta),
    "E": {str(a): {str(g): expected_tokens(a, g) for g in (1, 2, 4, 8)} for a in (0.5, 0.7, 0.8, 0.9)},
    "example_E": expected_tokens(0.8, 4), "example_speedup": speedup(0.8, 4, 0.1),
    "tree_means": means,
    "tree_example": {"context": prev, "tops": [head_top(prev, k, 2) for k in range(1, K + 1)],
                     "chain": target_chain(prev), "emitted": tokens_emitted(prev, 2)},
}
out_dir = "/Users/bshah/Documents/Trial/Learning/scripts/diagrams/lessons"
with open(os.path.join(out_dir, "29.3_data.json"), "w") as f:
    json.dump(out, f, indent=1)
print("wrote 29.3_data.json", means)
