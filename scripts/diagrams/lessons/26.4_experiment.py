"""Experiment for lesson 26.4 (Mixture of Experts). NumPy only.

Produces every number used in the lesson and its diagrams, written to 26.4_data.json.
Run: python3 scripts/diagrams/lessons/26.4_experiment.py
"""
import json, math, os
import numpy as np

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "26.4_data.json")
np.set_printoptions(precision=4, suppress=True)
res = {}


def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)   # subtract the max for numerical stability
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)


# ---------- A. Worked example: one token, 4 experts, top-2 ----------
x = np.array([1.0, 2.0])                                   # one token, d = 2
G = np.array([[1.0, 0.0],                                  # gate matrix, one row per expert
              [0.5, 1.0],
              [0.3, 0.0],
              [0.0, 1.0]])
W = np.array([[[1, 0], [0, 1]],                            # expert 0: identity
              [[2, 0], [0, 1]],                            # expert 1
              [[0, 1], [1, 0]],                            # expert 2
              [[1, 1], [0, 1]]], dtype=float)              # expert 3
logits = G @ x                                             # gate score per expert
top2 = np.argsort(-logits)[:2]                             # indices of the two largest scores
p_all = softmax(logits)                                    # softmax over all 4 experts
w_renorm = p_all[top2] / p_all[top2].sum()                 # renormalise the top-2 probabilities
w_softmax2 = softmax(logits[top2])                         # softmax over the top-2 logits only
expert_out = np.einsum("eij,j->ei", W, x)                  # every expert's output (computed here for clarity)
y = (w_softmax2[:, None] * expert_out[top2]).sum(axis=0)   # only the two selected experts contribute

res["A"] = {
    "logits": logits.tolist(), "top2": top2.tolist(), "p_all": p_all.tolist(),
    "mass_top2": float(p_all[top2].sum()), "w_renorm": w_renorm.tolist(),
    "w_softmax2": w_softmax2.tolist(), "expert_out": expert_out.tolist(), "y": y.tolist(),
    "expert_out_top2": expert_out[top2].tolist(),
}

# ---------- B. Routing at scale: loads, capacity and dropped tokens ----------
T, d, E, k = 4096, 16, 8, 2
rng = np.random.default_rng(26)
X = rng.standard_normal((T, d))
Wg = rng.standard_normal((d, E)) / np.sqrt(d)              # gate weights, scaled so logits have std about 1
bias_skew = np.array([0.8, 0.5, 0.3, 0.1, -0.1, -0.3, -0.5, -0.8])  # toy stand-in for learned imbalance
cases = {"balanced": np.zeros(E), "skewed": bias_skew}


def route(X, Wg, bias, k):
    logits = X @ Wg + bias
    idx = np.argsort(-logits, axis=1)[:, :k]               # top-k expert ids per token
    return logits, idx


def dispatch(idx, E, cap):
    """First come, first served in token order; a full expert drops the extra assignments."""
    counts = np.zeros(E, dtype=int)
    kept = np.zeros(idx.shape, dtype=bool)
    for t in range(idx.shape[0]):
        for j in range(idx.shape[1]):
            e = idx[t, j]
            if counts[e] < cap:
                counts[e] += 1
                kept[t, j] = True
    return kept


B = {}
for name, bias in cases.items():
    logits, idx = route(X, Wg, bias, k)
    loads = np.bincount(idx.ravel(), minlength=E)           # assignments per expert, before dropping
    drops = {}
    for cf in [1.0, 1.25, 1.5, 2.0]:
        cap = math.ceil(cf * k * T / E)                     # expert capacity = cf * (k*T/E)
        kept = dispatch(idx, E, cap)
        drops[str(cf)] = {"cap": cap, "dropped": int((~kept).sum()),
                          "frac": float((~kept).sum() / (T * k))}
    B[name] = {"loads": loads.tolist(), "max_over_mean": float(loads.max() / loads.mean()),
               "drops": drops}
res["B"] = B
res["B_meta"] = {"T": T, "d": d, "E": E, "k": k, "assignments": T * k, "mean_load": T * k / E}

# ---------- C. Switch auxiliary load-balancing loss: alpha * N * sum_i f_i * P_i ----------
alpha = 0.01
C = {}
for name, bias in cases.items():
    logits, _ = route(X, Wg, bias, k)
    probs = softmax(logits)
    top1 = probs.argmax(axis=1)
    f = np.bincount(top1, minlength=E) / T                  # fraction of tokens sent to expert i
    P = probs.mean(axis=0)                                  # mean router probability for expert i
    C[name] = {"f": f.tolist(), "P": P.tolist(), "loss": float(alpha * E * (f * P).sum())}
# uniform routing (f_i = P_i = 1/E) and the collapsed extreme (f_0 = P_0 = 1)
C["uniform_value"] = float(alpha * E * E * (1 / E) * (1 / E))
C["collapsed_value"] = float(alpha * E * 1.0 * 1.0)
res["C"] = C

# ---------- D. Expert parallelism: 8 experts on 4 devices ----------
D = 4
devices_of_expert = np.arange(E) // (E // D)              # experts 0-1 on device 0, 2-3 on device 1, ...
D_out = {}
for name, bias in cases.items():
    logits, idx = route(X, Wg, bias, k)
    token_dev = np.arange(T) // (T // D)                  # tokens are sharded across the same devices
    dest = devices_of_expert[idx]                         # destination device of each assignment
    cross = (dest != token_dev[:, None])                  # True if the token must leave its device
    recv = np.bincount(dest.ravel(), minlength=D)         # assignments each device computes
    d_model, bytes_per = 4096, 2                          # bf16 hidden state, assumed
    D_out[name] = {"cross_pairs": int(cross.sum()), "cross_frac": float(cross.mean()),
                   "recv": recv.tolist(), "recv_max_over_mean": float(recv.max() / recv.mean()),
                   "cross_MB": float(cross.sum() * d_model * bytes_per / 1e6)}
res["D"] = D_out

# ---------- E. Parameter arithmetic: only k of E experts run per token ----------
res["E"] = {str(n): {"active_frac": k / n} for n in [8, 64]}

with open(OUT, "w") as fh:
    json.dump(res, fh, indent=1)

print("A logits", logits.shape if False else np.array(res["A"]["logits"]))
print("A top2", res["A"]["top2"], "w_renorm", np.array(res["A"]["w_renorm"]),
      "w_softmax2", np.array(res["A"]["w_softmax2"]), "y", np.array(res["A"]["y"]))
print("A mass top2", round(res["A"]["mass_top2"], 4))
for name in cases:
    print(name, "loads", B[name]["loads"], "max/mean", round(B[name]["max_over_mean"], 3))
    for cf, v in B[name]["drops"].items():
        print("   cf", cf, "cap", v["cap"], "dropped", v["dropped"], "frac", round(v["frac"], 4))
for name in cases:
    print(name, "aux loss", round(C[name]["loss"], 5), "f", np.array(C[name]["f"]), "P", np.array(C[name]["P"]))
print("uniform", C["uniform_value"], "collapsed", C["collapsed_value"])
for name in cases:
    print(name, D_out[name])
print(res["E"])
print("wrote", OUT)
