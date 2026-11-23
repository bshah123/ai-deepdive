"""Experiment for lesson 31.1 (LoRA mathematics). NumPy only.

Produces every number used in the lesson and its diagrams, written to
31.1_data.json next to this file. Run once:
    python3 31.1_experiment.py
"""
import json
import os

import numpy as np

np.set_printoptions(precision=6, suppress=True)
HERE = os.path.dirname(os.path.abspath(__file__))
out = {"numpy": np.__version__}

# ---------------------------------------------------------------- 1. hand-sized example
W0 = np.array([[2.0, 0.0],
               [0.0, 1.0]])
A = np.array([[1.0, 2.0]])            # r x d_in  = 1 x 2
B = np.array([[0.5],
              [-1.0]])                # d_out x r = 2 x 1
alpha, r = 2.0, 1
s = alpha / r                          # scaling factor alpha / r = 2
x = np.array([1.0, 1.0])

base = W0 @ x                          # pretrained path
Ax = A @ x                             # down-projection to rank r
BAx = B @ Ax                           # up-projection back to d_out
delta = s * BAx                        # scaled low-rank update
y = base + delta
out["hand"] = {
    "W0x": base.tolist(), "Ax": Ax.tolist(), "BAx": BAx.tolist(),
    "scaled_delta": delta.tolist(), "y": y.tolist(), "s": s,
    "rank_BA": int(np.linalg.matrix_rank(B @ A)),
}

# ---------------------------------------------------------------- 2. parameter counts
params = []
for d_in, d_out in [(768, 768), (4096, 4096)]:
    for rr in [4, 8, 16, 64]:
        full = d_in * d_out
        lora = rr * (d_in + d_out)
        params.append({"d_in": d_in, "d_out": d_out, "r": rr, "full": full,
                       "lora": lora, "pct": 100.0 * lora / full,
                       "flop_ratio": lora / full})
out["params"] = params

# ---------------------------------------------------------------- 3. init and merge checks
rng = np.random.default_rng(0)
d_in, d_out, rr = 16, 8, 4
X = rng.standard_normal((5, d_in))     # batch of 5 inputs, one per row
W0r = rng.standard_normal((d_out, d_in)) / np.sqrt(d_in)
Ar = rng.standard_normal((rr, d_in)) / np.sqrt(d_in)
Br = np.zeros((d_out, rr))             # B = 0 at initialisation
s = 1.0

def lora_forward(X, W0, A, B, s):
    return X @ W0.T + s * (X @ A.T) @ B.T

Y_init = lora_forward(X, W0r, Ar, Br, s)
out["init_max_abs_diff_from_pretrained"] = float(np.max(np.abs(Y_init - X @ W0r.T)))

Br2 = rng.standard_normal((d_out, rr))  # any nonzero B
Y_unmerged = lora_forward(X, W0r, Ar, Br2, s)
W_merged = W0r + s * Br2 @ Ar
Y_merged = X @ W_merged.T
out["merge_max_abs_error"] = float(np.max(np.abs(Y_unmerged - Y_merged)))
out["merged_rank_of_update"] = int(np.linalg.matrix_rank(s * Br2 @ Ar))

# ---------------------------------------------------------------- 4. gradient check
T = rng.standard_normal((5, d_out))    # random targets

def loss(A, B):
    Y = lora_forward(X, W0r, A, B, s)
    return 0.5 * np.sum((Y - T) ** 2)

Y = lora_forward(X, W0r, Ar, Br2, s)
G = Y - T                              # dL/dY for L = 0.5 * sum((Y - T)^2)
gB = s * G.T @ (X @ Ar.T)              # d_out x r
gA = s * (G @ Br2).T @ X               # r x d_in
eps = 1e-6
num_gB = np.zeros_like(Br2)
for i in range(Br2.shape[0]):
    for j in range(Br2.shape[1]):
        Bp, Bm = Br2.copy(), Br2.copy()
        Bp[i, j] += eps; Bm[i, j] -= eps
        num_gB[i, j] = (loss(Ar, Bp) - loss(Ar, Bm)) / (2 * eps)
num_gA = np.zeros_like(Ar)
for i in range(Ar.shape[0]):
    for j in range(Ar.shape[1]):
        Ap, Am = Ar.copy(), Ar.copy()
        Ap[i, j] += eps; Am[i, j] -= eps
        num_gA[i, j] = (loss(Ap, Br2) - loss(Am, Br2)) / (2 * eps)
out["gradcheck_max_rel_err_B"] = float(np.max(np.abs(gB - num_gB)) / np.max(np.abs(num_gB)))
out["gradcheck_max_rel_err_A"] = float(np.max(np.abs(gA - num_gA)) / np.max(np.abs(num_gA)))

# gradients at initialisation (B = 0): dL/dA must be exactly zero
G0 = Y_init - T
gB0 = s * G0.T @ (X @ Ar.T)
gA0 = s * (G0 @ Br).T @ X
out["init_grad_norm_B"] = float(np.linalg.norm(gB0))
out["init_grad_norm_A"] = float(np.linalg.norm(gA0))

# ---------------------------------------------------------------- 5. rank sweep on a synthetic task
# Task: W* = W0 + dW*, where dW* has singular values 0.8^i (a decaying spectrum).
# Inputs x ~ N(0, I), so E||E x||^2 = ||E||_F^2 and population gradients are exact.
# Error metric: unexplained energy ||dW - dW*||_F^2 / ||dW*||_F^2.
d = 64
rng = np.random.default_rng(7)         # fixed seed so the lesson's sweep block reproduces these numbers
U, _ = np.linalg.qr(rng.standard_normal((d, d)))
V, _ = np.linalg.qr(rng.standard_normal((d, d)))
sig = 0.8 ** np.arange(1, d + 1)
dWstar = U @ np.diag(sig) @ V.T
energy = np.sum(dWstar ** 2)
sv = np.linalg.svd(dWstar, compute_uv=False)
out["target_singular_values_first8"] = sv[:8].tolist()
out["zero_update_error"] = 1.0

def svd_floor(rk):
    # Eckart-Young: best rank-rk approximation error (relative energy)
    return float(np.sum(sv[rk:] ** 2) / energy)

def train_lora(rk, lr=0.1, steps=20000, seed=1):
    g = np.random.default_rng(seed)
    Aa = g.standard_normal((rk, d)) / np.sqrt(d)
    Bb = np.zeros((d, rk))
    for _ in range(steps):
        E = Bb @ Aa - dWstar                 # s = 1
        gBb = E @ Aa.T                      # dL/dB = s E A^T
        gAa = Bb.T @ E                      # dL/dA = s B^T E
        Bb -= lr * gBb
        Aa -= lr * gAa
    E = Bb @ Aa - dWstar
    return {
        "r": rk,
        "params": rk * (2 * d),
        "lora_error": float(np.sum(E ** 2) / energy),
        "svd_floor": svd_floor(rk),
        "rank_of_learned_update": int(np.linalg.matrix_rank(Bb @ Aa, tol=1e-8)),
    }

sweep = [train_lora(rk) for rk in [1, 2, 4, 8, 16, 32, 64]]
for row in sweep:
    row["gap_over_floor"] = (row["lora_error"] - row["svd_floor"])
out["sweep"] = sweep
out["full_params"] = d * d

if __name__ == "__main__":
    print("hand:", json.dumps(out["hand"]))
    for row in params:
        print("params", row)
    print("init max abs diff:", out["init_max_abs_diff_from_pretrained"])
    print("merge max abs error:", out["merge_max_abs_error"], "rank", out["merged_rank_of_update"])
    print("gradcheck rel err B, A:", out["gradcheck_max_rel_err_B"], out["gradcheck_max_rel_err_A"])
    print("init grad norms B, A:", out["init_grad_norm_B"], out["init_grad_norm_A"])
    print("target sv first 8:", np.round(sv[:8], 6))
    for row in sweep:
        print("sweep", row)
    with open(os.path.join(HERE, "31.1_data.json"), "w") as f:
        json.dump(out, f, indent=2)
