"""Experiment for lesson 19.2 (loss functions). Every number in the lesson and its diagrams comes from this script.

Run:  python3 scripts/diagrams/lessons/19.2_experiment.py
Writes: scripts/diagrams/lessons/19.2_data.json (read by 19.2.mjs)
Needs: numpy; torch only for the last section (wrapped in try/except).
"""
import json
import math
import os

import numpy as np

np.set_printoptions(precision=6, suppress=True)
HERE = os.path.dirname(os.path.abspath(__file__))
data = {}

# ---------------------------------------------------------------- 1. worked example: four points
y = np.array([1.0, 0.0, 1.0, 1.0])
p = np.array([0.9, 0.1, 0.8, 0.7])
se = (y - p) ** 2
mse = se.mean()
bce_terms = -(y * np.log(p) + (1 - y) * np.log(1 - p))
bce = bce_terms.mean()
print("== 1. worked example (four points)")
print("squared error :", se)
print("MSE           :", round(mse, 6))
print("BCE per point :", bce_terms)
print("BCE mean      :", round(bce, 6))
data["example"] = {
    "y": y.tolist(), "p": p.tolist(),
    "sq_err": se.tolist(), "mse": float(mse),
    "bce_terms": bce_terms.tolist(), "bce": float(bce),
}

# ---------------------------------------------------------------- 2. multi-class softmax + cross-entropy
logits = np.array([2.0, 1.0, 0.1])
target = 0
e = np.exp(logits - logits.max())
probs = e / e.sum()
ce_mc = -np.log(probs[target])
onehot = np.eye(3)[target]
grad_logits = probs - onehot          # d(CE)/d(logits) for softmax + CE
print("\n== 2. softmax + cross-entropy (3 classes, true class 0)")
print("logits        :", logits)
print("softmax       :", probs, " sum =", probs.sum())
print("CE = -log p0  :", round(ce_mc, 6))
print("grad wrt z    :", grad_logits)
data["multiclass"] = {
    "logits": logits.tolist(), "probs": probs.tolist(),
    "ce": float(ce_mc), "grad": grad_logits.tolist(),
}

# finite-difference check of the softmax + CE gradient
def ce_from_logits(z):
    zz = z - z.max()
    lp = zz - np.log(np.exp(zz).sum())
    return -lp[target]

h = 1e-6
fd = np.array([(ce_from_logits(logits + h * np.eye(3)[i]) - ce_from_logits(logits - h * np.eye(3)[i])) / (2 * h) for i in range(3)])
print("finite-diff   :", fd, " max abs err =", float(np.abs(fd - grad_logits).max()))
data["multiclass"]["fd_max_err"] = float(np.abs(fd - grad_logits).max())

# ---------------------------------------------------------------- 3. KL divergence and the identity CE = H + KL
P = np.array([0.2, 0.3, 0.5])
Q = np.array([0.1, 0.4, 0.5])
kl_pq = float(np.sum(P * np.log(P / Q)))
kl_qp = float(np.sum(Q * np.log(Q / P)))
H_P = float(-np.sum(P * np.log(P)))
H_PQ = float(-np.sum(P * np.log(Q)))
print("\n== 3. KL divergence (nats)")
print("KL(P||Q)      :", round(kl_pq, 6))
print("KL(Q||P)      :", round(kl_qp, 6))
print("H(P)          :", round(H_P, 6))
print("H(P,Q)        :", round(H_PQ, 6))
print("H(P)+KL(P||Q) :", round(H_P + kl_pq, 6), " (equals H(P,Q))")
data["kl"] = {"P": P.tolist(), "Q": Q.tolist(), "kl_pq": kl_pq, "kl_qp": kl_qp,
              "H_P": H_P, "H_PQ": H_PQ}

# ---------------------------------------------------------------- 4. gradients through a sigmoid
def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))

zs = [-5.0, -3.0, -1.0, 0.0, 2.0]
rows = []
print("\n== 4. gradient wrt logit z, true label y = 1")
print(f"{'z':>6} {'p':>10} {'dCE/dz':>12} {'dMSE/dz':>12} {'ratio':>8}")
for z in zs:
    pz = float(sigmoid(z))
    g_ce = pz - 1.0                          # CE = -log p  ->  dCE/dz = p - y
    g_mse = -2.0 * (1.0 - pz) * pz * (1.0 - pz)  # MSE = (1-p)^2, dp/dz = p(1-p)
    # finite-difference check
    eps = 1e-6
    ce_fn = lambda s: -math.log(float(sigmoid(s)))
    mse_fn = lambda s: (1.0 - float(sigmoid(s))) ** 2
    fd_ce = (ce_fn(z + eps) - ce_fn(z - eps)) / (2 * eps)
    fd_mse = (mse_fn(z + eps) - mse_fn(z - eps)) / (2 * eps)
    assert abs(fd_ce - g_ce) < 1e-6 and abs(fd_mse - g_mse) < 1e-6
    ratio = abs(g_ce) / abs(g_mse)
    print(f"{z:6.1f} {pz:10.6f} {g_ce:12.6f} {g_mse:12.6f} {ratio:8.1f}")
    rows.append({"z": z, "p": pz, "g_ce": g_ce, "g_mse": g_mse, "ratio": ratio})
data["sigmoid_grads"] = rows

# ---------------------------------------------------------------- 5. loss curves for y = 1
ps = [round(0.01 * i, 2) for i in range(1, 100)]
curve = {"p": ps, "ce": [-math.log(q) for q in ps], "mse": [(1 - q) ** 2 for q in ps]}
data["curves"] = curve
print("\n== 5. y = 1 loss at p = 0.05, 0.5, 0.95")
for q in (0.05, 0.5, 0.95):
    print(f"p={q:4.2f}  CE={-math.log(q):.6f}  MSE={(1 - q) ** 2:.6f}")

# ---------------------------------------------------------------- 6. numerical stability
print("\n== 6. numerical stability")
with np.errstate(over="ignore", invalid="ignore", divide="ignore"):
    naive_sm = np.exp(np.array([1000.0, 0.0])) / np.exp(np.array([1000.0, 0.0])).sum()
print("naive softmax([1000, 0]) :", naive_sm)
z = np.array([1000.0, 0.0])
lse = z.max() + np.log(np.exp(z - z.max()).sum())
stable_sm = np.exp(z - lse)
print("stable softmax([1000, 0]):", stable_sm)
with np.errstate(divide="ignore"):
    print("naive -log(0)            :", -np.log(np.float64(0.0)))
clipped = -math.log(1e-15)
print("clipped -log(1e-15)      :", round(clipped, 6))
data["stability"] = {"stable_sm": stable_sm.tolist(), "clip_loss": clipped}

# ---------------------------------------------------------------- 7. PyTorch cross-check (optional)
try:
    import torch
    import torch.nn.functional as F
    print("\n== 7. PyTorch", torch.__version__)
    lg = torch.tensor([[2.0, 1.0, 0.1]], dtype=torch.float64)
    tgt = torch.tensor([0])
    ce_t = F.cross_entropy(lg, tgt).item()
    Pt = torch.tensor(P, dtype=torch.float64)
    Qt = torch.tensor(Q, dtype=torch.float64)
    kl_correct = F.kl_div(Qt.log(), Pt, reduction="sum").item()   # input = log Q, target = P
    kl_swapped = F.kl_div(Pt, Qt, reduction="sum").item()          # wrong argument order
    print("F.cross_entropy(logits) :", round(ce_t, 6), " manual:", round(float(ce_mc), 6))
    print("F.kl_div(log Q, P)      :", round(kl_correct, 6), " = KL(P||Q) =", round(kl_pq, 6))
    print("F.kl_div(P, Q) (swapped):", round(kl_swapped, 6))
    data["torch"] = {"version": torch.__version__, "ce": ce_t,
                     "kl_correct": kl_correct, "kl_swapped": kl_swapped}
except ImportError as exc:
    print("\n== 7. torch not available:", exc)
    data["torch"] = None

with open(os.path.join(HERE, "19.2_data.json"), "w") as f:
    json.dump(data, f, indent=2)
print("\nwrote", os.path.join(HERE, "19.2_data.json"))
