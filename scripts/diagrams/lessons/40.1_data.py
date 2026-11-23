# Data for 40.1 (lost in the middle). Run: python3 scripts/diagrams/lessons/40.1_data.py
# Every number used in 40.1.mjs and the lesson comes from this output. NumPy only.

import numpy as np

def gold_share(n, gold_score=3.0, d=64, trials=300, seed=0):
    """Average softmax weight on one gold key among n random distractor keys."""
    rng = np.random.default_rng(seed)
    total = 0.0
    for _ in range(trials):
        q = rng.standard_normal(d)
        k_gold = q * (gold_score * np.sqrt(d) / (q @ q))   # makes q.k/sqrt(d) = gold_score
        keys = np.vstack([k_gold, rng.standard_normal((n, d))])
        s = keys @ q / np.sqrt(d)                           # scaled dot-product scores
        w = np.exp(s - s.max())
        total += w[0] / w.sum()
    return total / trials

print("n_distractors  simulated  E[exp] approx  exact (distractor score 0)")
for n in [1, 10, 100, 1000]:
    g = np.exp(3.0)
    print(f"{n:>13}  {gold_share(n):9.3f}  {g / (g + n * np.exp(0.5)):13.3f}  {g / (g + n):26.3f}")

# --- part 2: toy positional bias
import numpy as np

def share_at_position(n, p, pos_bias, gold_score=3.0, trials=2000, seed=1):
    """Attention share on the gold document placed at index p (toy model with an assumed positional bias)."""
    rng = np.random.default_rng(seed)
    x = np.linspace(0.0, 1.0, n)
    bias = pos_bias * (2 * x - 1) ** 2      # assumed: 0 in the middle, pos_bias at both ends
    total = 0.0
    for _ in range(trials):
        s = rng.standard_normal(n)          # distractor content scores ~ N(0, 1)
        s[p] = gold_score
        z = s + bias
        w = np.exp(z - z.max())
        total += w[p] / w.sum()
    return total / trials

n = 20
for label, b in [("no positional bias", 0.0), ("U-shaped bias, strength 1.5", 1.5)]:
    curve = [float(share_at_position(n, p, b)) for p in range(n)]
    print(label)
    print("  first:", round(curve[0], 3), "| middle (p=9):", round(curve[9], 3), "| last:", round(curve[-1], 3))
    print("  all 20:", [round(c, 3) for c in curve])

# --- part 3: mitigation (toy)
import numpy as np

def share_at_position(n, p, pos_bias, gold_score=3.0, trials=2000, seed=1):
    rng = np.random.default_rng(seed)
    x = np.linspace(0.0, 1.0, n)
    bias = pos_bias * (2 * x - 1) ** 2
    total = 0.0
    for _ in range(trials):
        s = rng.standard_normal(n)
        s[p] = gold_score
        z = s + bias
        w = np.exp(z - z.max())
        total += w[p] / w.sum()
    return total / trials

cases = [("20 docs, gold in middle (p=9)", 20, 9),
         ("20 docs, gold moved to first (p=0)", 20, 0),
         ("5 docs, gold in middle (p=2)", 5, 2)]
for label, n, p in cases:
    print(f"{label:38s} share={share_at_position(n, p, 1.5):.3f}")
