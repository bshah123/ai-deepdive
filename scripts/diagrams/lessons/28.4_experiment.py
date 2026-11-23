"""Experiment for lesson 28.4 (GRPO). NumPy only. Writes 28.4_data.json next to this file.

Toy setting (NOT an LLM): Q questions, each with K candidate responses (a tabular softmax
policy per question). Reward 1 if the response is one of that question's correct ones.
Everything here is a mechanism check, not evidence about LLM reasoning.
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(0)
out = {}

def softmax(x, axis=-1):
    z = x - x.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

def advantages(r, method, eps=1e-4):
    """r: (..., G) rewards of one group per row. Returns advantages with the same shape."""
    mean = r.mean(axis=-1, keepdims=True)
    if method == "reinforce":   # no baseline
        return r
    if method == "mean":        # group-mean baseline, no std division (Dr.GRPO-style)
        return r - mean
    if method == "grpo":        # group-mean baseline and population std division
        std = r.std(axis=-1, keepdims=True)
        return (r - mean) / (std + eps)
    raise ValueError(method)

# ---- 1. Worked example: one prompt, G = 4 sampled answers, rewards [1, 0, 0, 1]
r = np.array([1.0, 0.0, 0.0, 1.0])
print("rewards              :", r)
print("group mean           :", r.mean())
print("population std (ddof=0):", r.std(), " -> advantages", advantages(r, "grpo").round(3))
print("sample std (ddof=1)  :", round(r.std(ddof=1), 4), " -> advantages", ((r - r.mean()) / r.std(ddof=1)).round(3))
out["worked"] = {"rewards": r.tolist(), "adv_pop": advantages(r, "grpo").tolist(),
                 "adv_samp": ((r - r.mean()) / r.std(ddof=1)).tolist()}

# ---- 2. Std division reweights questions by their group success rate (G = 8, binary rewards)
G = 8
rows = []
for k in range(G + 1):
    rr = np.array([1.0] * k + [0.0] * (G - k))
    a_mean = advantages(rr, "mean")
    a_grpo = advantages(rr, "grpo")
    rows.append({"k": k, "p": k / G,
                 "sum_abs_mean": float(np.abs(a_mean).sum()),
                 "sum_abs_grpo": float(np.abs(a_grpo).sum())})
print("\nk correct of 8 | sum|A| mean-only | sum|A| GRPO (std)")
for row in rows:
    print(f"  k={row['k']}          {row['sum_abs_mean']:7.3f}          {row['sum_abs_grpo']:7.3f}")
out["std_weight"] = rows

# ---- 3. Per-sequence length normalisation: per-token weight of a wrong response, A = -1
print("\nper-token weight A/|o| for a wrong answer (A = -1):")
length_rows = []
for L in (10, 100, 1000):
    w = -1.0 / L
    print(f"  |o| = {L:5d} tokens -> per-token weight {w:+.4f}, total over sequence {w * L:+.1f}")
    length_rows.append({"L": L, "per_token": w})
out["length"] = length_rows

# ---- 4. KL estimators between two 4-way categorical distributions (sampled from the policy)
pi = softmax(np.array([0.3, -0.2, 0.9, 0.0]))
ref = softmax(np.array([0.0, 0.0, 0.0, 0.0]))
kl_exact = float(np.sum(pi * np.log(pi / ref)))
N = 400_000
a = rng.choice(4, size=N, p=pi)
x = ref[a] / pi[a]                              # ratio pi_ref / pi
k1 = -np.log(x)                                 # plain log-ratio estimator
k3 = x - np.log(x) - 1.0                        # estimator used in DeepSeekMath (x - log x - 1)
print(f"\nKL(pi||ref) exact           : {kl_exact:.5f}")
print(f"k1 = -log x, mean over N    : {k1.mean():.5f}   (min per-sample {k1.min():+.3f}, fraction < 0: {(k1 < 0).mean():.3f})")
print(f"k3 = x - log x - 1, mean    : {k3.mean():.5f}   (min per-sample {k3.min():+.3f})")
out["kl"] = {"exact": kl_exact, "k1_mean": float(k1.mean()), "k3_mean": float(k3.mean()),
             "k1_min": float(k1.min()), "k3_min": float(k3.min()),
             "k1_frac_neg": float((k1 < 0).mean())}

# ---- 5. Gradient check: does the group estimator point along the true gradient of J = E[r]?
K = 8
theta0 = rng.normal(0, 0.8, size=K)
pi0 = softmax(theta0)
R = np.array([0, 0, 1, 0, 0, 1, 0, 0], dtype=float)
J = float(pi0 @ R)
g_true = pi0 * (R - J)                          # d/dtheta of sum_k pi_k R_k for softmax

def group_grad_mc(method, M=200_000, G=8):
    a = (rng.random((M, G))[..., None] > np.cumsum(pi0)).sum(-1)   # inverse-CDF sampling
    a = np.minimum(a, K - 1)
    r = R[a]
    A = advantages(r, method)
    grad = np.zeros(K)
    np.add.at(grad, a.ravel(), A.ravel() / G)  # sum_i A_i * onehot(a_i) / G, averaged below
    grad -= pi0 * (A.sum(axis=1) / G).sum()
    return grad / M

def cos(u, v):
    return float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v)))

gc = {}
for m in ("reinforce", "mean", "grpo"):
    g = group_grad_mc(m)
    gc[m] = {"cos_to_true": cos(g, g_true), "norm_ratio": float(np.linalg.norm(g) / np.linalg.norm(g_true))}
    print(f"\n{m:9s}: cosine to true gradient {gc[m]['cos_to_true']:.4f}, norm ratio {gc[m]['norm_ratio']:.3f}")
out["grad_check"] = gc
out["grad_check_true_norm"] = float(np.linalg.norm(g_true))

# ---- 6. Toy training: Q questions of different difficulty, G = 8 samples per question.
# Plain SGD on a tabular softmax per question (no Adam). Same lr for all three methods, swept
# over a grid, because the advantage scale differs between methods (see section 5).
Q, K, G, STEPS, SEEDS = 8, 64, 8, 200, 10
n_correct = np.array([1, 1, 2, 2, 4, 4, 8, 8])                 # correct responses per question (of 64)
correct = (np.arange(K)[None, :] < n_correct[:, None]).astype(float)
checkpoints = [0, 25, 50, 100, 200]
LRS = [0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0]

def run(method, seed, lr):
    rg = np.random.default_rng(seed)
    theta = np.zeros((Q, K))
    hist = []
    for t in range(STEPS + 1):
        pi = softmax(theta)
        if t in checkpoints:
            hist.append((pi * correct).sum(1))                  # per-question accuracy
        if t == STEPS:
            break
        cdf = np.cumsum(pi, axis=1)
        u = rg.random((Q, G, 1))
        a = np.minimum((u > cdf[:, None, :]).sum(-1), K - 1)   # (Q, G) sampled responses
        r = correct[np.arange(Q)[:, None], a]
        A = advantages(r, method)
        grad = np.zeros((Q, K))
        np.add.at(grad, (np.repeat(np.arange(Q), G), a.ravel()), A.ravel())
        grad = (grad - pi * A.sum(1, keepdims=True)) / G
        theta += lr * grad
    return np.array(hist)                                       # (checkpoints, Q)

res = {"lr_grid": LRS, "step50_by_lr": {}, "curves_lr1": {}, "step50_hard_easy_lr1": {}}
print(f"step-50 mean accuracy (mean over {SEEDS} seeds) by learning rate:")
print("  lr:          " + "  ".join(f"{lr:6.3f}" for lr in LRS))
for m in ("reinforce", "mean", "grpo"):
    runs_by_lr = {lr: np.stack([run(m, s, lr) for s in range(SEEDS)]) for lr in LRS}
    vals = [float(runs_by_lr[lr][:, 2, :].mean()) for lr in LRS]
    res["step50_by_lr"][m] = vals
    print(f"  {m:10s}  " + "  ".join(f"{v:6.3f}" for v in vals))
    acc = runs_by_lr[1.0].mean(2)                               # common lr = 1.0
    res["curves_lr1"][m] = {"acc_mean": acc.mean(0).tolist(), "acc_sd": acc.std(0).tolist()}
    res["step50_hard_easy_lr1"][m] = {"hard_1correct": float(runs_by_lr[1.0][:, 2, :2].mean()),
                                      "easy_8correct": float(runs_by_lr[1.0][:, 2, 6:].mean())}
print(f"\ncommon lr = 1.0, steps {checkpoints}, mean ± sd over {SEEDS} seeds:")
for m in ("reinforce", "mean", "grpo"):
    acc = np.array(res["curves_lr1"][m]["acc_mean"]); sd = np.array(res["curves_lr1"][m]["acc_sd"])
    print(f"  {m:10s}", "  ".join(f"{v:.3f}±{s:.3f}" for v, s in zip(acc, sd)))
    h = res["step50_hard_easy_lr1"][m]
    print(f"  {'':10s} step 50: 1-correct questions {h['hard_1correct']:.3f}; 8-correct questions {h['easy_8correct']:.3f}")
print(f"\ninitial accuracy: {float(n_correct.mean() / K):.4f}")
out["train"] = res
out["train_setup"] = {"Q": Q, "K": K, "G": G, "steps": STEPS, "seeds": SEEDS, "lr_grid": LRS,
                      "n_correct": n_correct.tolist(), "initial_accuracy": float(n_correct.mean() / K),
                      "checkpoints": checkpoints}

with open(os.path.join(HERE, "28.4_data.json"), "w") as f:
    json.dump(out, f, indent=1)
