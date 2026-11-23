import json
import numpy as np

# ---- 1. Probability-weighted score (G-Eval style) on one worked example ----
scores = np.array([1, 2, 3, 4, 5])
p = np.array([0.05, 0.10, 0.20, 0.40, 0.25])   # judge's probability for each score token
expected = float(np.dot(p, scores))             # sum_i p(s_i) * s_i
argmax_score = int(scores[np.argmax(p)])
print("expected score:", round(expected, 3), " argmax score:", argmax_score)

# ---- 2. Pairwise judge with position bias, and the swap test ----
def judge_prefers_first(q_first, q_second, rng, beta, kappa=2.0, sigma=1.0):
    """Simulated judge. Logit = kappa*(quality gap) + beta (slot-1 bias) + Gaussian noise.
    Returns True when the judge picks the response in the first slot."""
    logit = kappa * (q_first - q_second) + beta + sigma * rng.standard_normal(q_first.shape)
    return logit > 0

def position_bias_report(beta, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    qA = rng.standard_normal(n)                        # latent quality of response A
    qB = rng.standard_normal(n)                        # latent quality of response B
    truth_A = qA > qB                                  # ground truth: is A better?
    first_1 = judge_prefers_first(qA, qB, rng, beta)   # call 1: A in slot 1
    first_2 = judge_prefers_first(qB, qA, rng, beta)   # call 2: B in slot 1 (swapped)
    A_wins_1 = first_1                                 # call 1 picks slot 1 = A
    A_wins_2 = ~first_2                                # call 2 picks slot 1 = B, so A wins iff slot 1 is not picked
    consistent = A_wins_1 == A_wins_2                  # same winner in both orders
    naive_correct = A_wins_1 == truth_A                # single order, no tie option
    return {
        "beta": beta,
        "slot1_pref_rate": float(np.mean(first_1)),                 # 0.5 means no slot preference
        "naive_acc": float(np.mean(naive_correct)),                 # single order, all pairs
        "naive_acc_on_consistent": float(np.mean(naive_correct[consistent])),
        "consistency": float(np.mean(consistent)),
        "tie_rate": float(1 - np.mean(consistent)),                 # inconsistent pairs become ties
        "swap_acc_decided": float(np.mean(naive_correct[consistent])),
        "swap_acc_ties_wrong": float(np.mean(naive_correct & consistent)),
    }

print("beta  slot1  naive  naive|cons  consist  tie    acc|decided  acc(ties wrong)")
results = []
for beta in [0.0, 0.5, 1.0]:
    r = position_bias_report(beta)
    results.append(r)
    print(f"{r['beta']:.1f}   {r['slot1_pref_rate']:.3f}  {r['naive_acc']:.3f}  "
          f"{r['naive_acc_on_consistent']:.3f}       {r['consistency']:.3f}    {r['tie_rate']:.3f}  "
          f"{r['swap_acc_decided']:.3f}        {r['swap_acc_ties_wrong']:.3f}")

# ---- 3. Hard score vs probability-weighted score: agreement with human ratings ----
def rank(x):
    x = np.asarray(x, float)
    order = np.argsort(x, kind="stable")
    r = np.empty(len(x))
    r[order] = np.arange(1, len(x) + 1)
    for v in np.unique(x):                             # average ranks over ties
        m = x == v
        r[m] = r[m].mean()
    return r

def spearman(a, b):
    return float(np.corrcoef(rank(a), rank(b))[0, 1])

def resolution_run(seed, n=300):
    rng = np.random.default_rng(seed)
    z = rng.standard_normal(n)                                  # latent quality of each response
    human = 3 + 1.1 * z + 0.5 * rng.standard_normal(n)          # human rating (continuous)
    mu = 3 + 1.1 * z + 0.8 * rng.standard_normal(n)             # judge's latent opinion
    s = np.arange(1, 6)
    logits = -(s[None, :] - mu[:, None]) ** 2 / (2 * 0.6 ** 2)  # judge's distribution over 1..5
    pj = np.exp(logits - logits.max(1, keepdims=True))
    pj /= pj.sum(1, keepdims=True)
    hard = s[np.argmax(pj, 1)]
    weighted = pj @ s
    return {"distinct_hard": int(len(np.unique(hard))),
            "distinct_weighted": int(len(np.unique(np.round(weighted, 9)))),
            "rho_hard": spearman(hard, human),
            "rho_weighted": spearman(weighted, human)}

resolution = resolution_run(seed=1)
print("distinct values  hard:", resolution["distinct_hard"], " weighted:", resolution["distinct_weighted"])
print("spearman vs human  hard:", round(resolution["rho_hard"], 3), " weighted:", round(resolution["rho_weighted"], 3))
gaps = [resolution_run(seed=s) for s in range(20)]
diff = np.array([g["rho_weighted"] - g["rho_hard"] for g in gaps])
print("20 seeds: weighted minus hard rho, mean", round(diff.mean(), 3), " min", round(diff.min(), 3),
      " max", round(diff.max(), 3))

json.dump({"worked": {"p": p.tolist(), "expected": expected, "argmax": argmax_score},
           "bias": results, "resolution": resolution,
           "seeds": {"mean_gap": float(diff.mean()), "min_gap": float(diff.min()), "max_gap": float(diff.max())}},
          open(__file__.replace("_experiment.py", "_data.json"), "w"), indent=2)
