"""Experiment for lesson 27.3 (logit sampling). Produces every number used in the lesson and diagrams.
Run: python 27.3_experiment.py   -> prints numbers and writes 27.3_data.json next to this file."""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

def softmax(logits, temperature=1.0):
    z = logits / temperature
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()

def top_k_filter(p, k):
    keep = np.zeros(len(p), dtype=bool)
    keep[np.argsort(p)[::-1][:k]] = True
    return keep

def top_p_filter(p, top_p):
    order = np.argsort(p)[::-1]
    cum = np.cumsum(p[order])
    n_keep = int(np.argmax(cum >= top_p)) + 1
    keep = np.zeros(len(p), dtype=bool)
    keep[order[:n_keep]] = True
    return keep

def min_p_filter(p, base):
    return p >= base * p.max()

def renormalize(p, keep):
    q = np.where(keep, p, 0.0)
    return q / q.sum()

def entropy_bits(p):
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum())

TOK = ["the", "a", "cat", "dog", "zebra"]
logits = np.array([3.0, 2.0, 1.0, 0.0, -1.0])
out = {"tokens": TOK, "logits": logits.tolist()}

e = np.exp(logits)
p = softmax(logits)
out["exp"] = e.tolist()
out["sum_exp"] = float(e.sum())
out["probs"] = p.tolist()
print("exp      :", np.round(e, 3), "sum", round(float(e.sum()), 3))
print("probs T=1:", np.round(p, 4), "sum", round(float(p.sum()), 6))

# Temperature sweep
temps = [0.5, 1.0, 2.0]
out["temps"] = {}
for T in temps:
    pt = softmax(logits, T)
    rec = {
        "probs": pt.tolist(),
        "entropy_bits": entropy_bits(pt),
        "top1": float(pt.max()),
        "n_top_p_0_9": int(top_p_filter(pt, 0.9).sum()),
        "n_min_p_0_1": int(min_p_filter(pt, 0.1).sum()),
    }
    out["temps"][str(T)] = rec
    print(f"T={T}: probs {np.round(pt, 4)} H={rec['entropy_bits']:.3f} bits top1={rec['top1']:.4f} "
          f"topp0.9 keeps {rec['n_top_p_0_9']} minp0.1 keeps {rec['n_min_p_0_1']}")

# Truncation on a peaked and a flat distribution
flat_logits = np.array([1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55])
pf = softmax(flat_logits)
out["flat_probs"] = pf.tolist()
out["flat_logits"] = flat_logits.tolist()
trunc = {}
for name, dist in [("peaked", p), ("flat", pf)]:
    rec = {}
    for rule, keep in [("top_k_3", top_k_filter(dist, 3)),
                       ("top_p_0_9", top_p_filter(dist, 0.9)),
                       ("min_p_0_1", min_p_filter(dist, 0.1))]:
        rec[rule] = {"kept": int(keep.sum()), "kept_mass": float(dist[keep].sum()),
                     "kept_idx": np.where(keep)[0].tolist()}
        print(f"{name:6s} {rule:10s} kept {keep.sum():2d} mass {dist[keep].sum():.4f} idx {np.where(keep)[0].tolist()}")
    trunc[name] = rec
out["trunc"] = trunc

# Renormalized top-p distribution on the peaked case, and an empirical check
keep_tp = top_p_filter(p, 0.9)
q = renormalize(p, keep_tp)
out["top_p_renorm"] = q.tolist()
print("top-p(0.9) renormalized:", np.round(q, 4), "sum", round(float(q.sum()), 6))
rng = np.random.default_rng(0)
rng0 = np.random.default_rng(0)
N = 200_000
draws = rng.choice(len(q), size=N, p=q)
freq = np.bincount(draws, minlength=len(q)) / N
out["empirical_freq"] = freq.tolist()
out["empirical_N"] = N
out["empirical_max_abs_err"] = float(np.abs(freq - q).max())
print("empirical freq:", np.round(freq, 4), "max abs err", round(out["empirical_max_abs_err"], 4))
print("first 10 draws with seed 0:", rng0.choice(len(q), size=10, p=q).tolist())

# Sequential pipeline: top-k, then top-p, then min-p, each renormalizing
d = p.copy()
for step, keep in [("top_k_3", top_k_filter(d, 3))]:
    d = renormalize(d, keep)
d = renormalize(d, top_p_filter(d, 0.9))
d = renormalize(d, min_p_filter(d, 0.1))
out["pipeline_final"] = d.tolist()
out["pipeline_kept"] = int((d > 0).sum())
print("pipeline final:", np.round(d, 4), "kept", int((d > 0).sum()))

with open(os.path.join(HERE, "27.3_data.json"), "w") as f:
    json.dump(out, f, indent=1)
print("wrote 27.3_data.json")
