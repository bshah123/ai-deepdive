"""Lesson 59.3 experiment: variance of three policy-gradient estimators on a
Bernoulli policy (one prompt, G samples per group). Writes 59.3_data.json.

Policy: a model answers correctly with probability q = sigmoid(theta).
Reward r = 1 if correct else 0. Score function: d/dtheta log pi(a) = a - q.
Exact gradient of E[r] with respect to theta: q (1 - q).
"""
import json
import sys
from pathlib import Path

import numpy as np

G = 8            # completions per prompt (GRPO group size)
TRIALS = 200_000
EPS = 1e-8       # added to the std to avoid division by zero
SEED = 59

def estimators(a, q):
    """a: (TRIALS, G) array of 0/1 outcomes. Returns the gradient estimate per trial
    for each method, shape (TRIALS,)."""
    r = a.astype(float)
    score = a - q                       # grad log pi for each sample
    mean = r.mean(axis=1, keepdims=True)
    std = r.std(axis=1, keepdims=True)  # population std (ddof=0)
    adv = {
        "no_baseline": r,                        # REINFORCE, A = r
        "mean_baseline": r - mean,               # A = r - group mean
        "grpo": (r - mean) / (std + EPS),        # A = (r - mean) / std
    }
    return {k: (v * score).mean(axis=1) for k, v in adv.items()}

def main():
    rng = np.random.default_rng(SEED)
    out = {"G": G, "trials": TRIALS, "q_values": [0.1, 0.5, 0.9], "results": {}}
    for q in out["q_values"]:
        a = (rng.random((TRIALS, G)) < q).astype(np.int64)
        est = estimators(a, q)
        exact = q * (1 - q)
        row = {"exact_gradient": exact,
               "p_all_equal_group": float(np.mean(a.min(axis=1) == a.max(axis=1)))}
        for name, g in est.items():
            row[name] = {"mean": float(g.mean()),
                         "std": float(g.std()),
                         "bias_vs_exact": float(g.mean() - exact)}
        out["results"][str(q)] = row

    # hand-checkable group example from the lesson
    ex = {}
    for rewards in ([1, 0, 0, 1], [1, 1, 1, 0]):
        r = np.array(rewards, dtype=float)
        ex[str(rewards)] = {"mean": float(r.mean()), "std": float(r.std()),
                            "advantages": [round(float(x), 3) for x in (r - r.mean()) / (r.std() + EPS)]}
    out["worked_groups"] = ex

    dest = Path(__file__).with_name("59.3_data.json")
    dest.write_text(json.dumps(out, indent=2))
    print("python", sys.version.split()[0], "numpy", np.__version__)
    for q, row in out["results"].items():
        print(f"q={q}: exact={row['exact_gradient']:.4f}  P(all equal)={row['p_all_equal_group']:.3f}")
        for name in ("no_baseline", "mean_baseline", "grpo"):
            m = row[name]
            print(f"   {name:14s} mean={m['mean']:+.4f} std={m['std']:.4f} bias={m['bias_vs_exact']:+.4f}")
    for k, v in ex.items():
        print("group", k, "mean", v["mean"], "std", v["std"], "adv", v["advantages"])

if __name__ == "__main__":
    main()
