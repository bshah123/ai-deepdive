# Experiment for lesson 31.3 (PEFT implementation & multi-LoRA serving). NumPy only.
# Run: <python> scripts/diagrams/lessons/31.3_experiment.py
# Writes every number used in the lesson and its diagrams to 31.3_data.json.
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
out = {"numpy": np.__version__, "python": sys.version.split()[0]}

# ---- A. Hand example: d_in = d_out = 4, r = 2, alpha = 4 -> scale = 2 ----------
scale = 4 / 2
W0 = np.diag([1.0, 2.0, 3.0, 4.0])                  # frozen base weight
A = np.array([[1.0, 0.0, 1.0, 0.0],                 # r x d_in
              [0.0, 1.0, 0.0, 1.0]])
B = np.array([[1.0, 0.0],                           # d_out x r
              [0.0, 0.0],
              [0.0, 1.0],
              [0.0, 0.0]])
x = np.array([1.0, 2.0, 3.0, 4.0])
base = W0 @ x
down = A @ x
up = B @ down
delta = scale * up
y = base + delta
out["hand"] = {"scale": scale, "base": base.tolist(), "down": down.tolist(),
               "up": up.tolist(), "delta": delta.tolist(), "y": y.tolist(),
               "y_zero_B": (base + scale * (np.zeros_like(B) @ down)).tolist()}

# ---- B. Parameter counts ------------------------------------------------------
def full_params(d_in, d_out):
    return d_in * d_out

def lora_params(d_in, d_out, r):
    return r * (d_in + d_out)

out["params"] = []
for d in (768, 4096):
    f, l = full_params(d, d), lora_params(d, d, 8)
    out["params"].append({"d": d, "full": f, "lora_r8": l, "ratio": l / f})

# Hypothetical model for arithmetic only (not a released model):
L, D, R = 32, 4096, 8
attn_base_params = L * 4 * D * D                    # q, k, v, o per layer
adapter_params = L * 2 * R * (D + D)                # LoRA on q and v only
BYTES = 2                                           # fp16
out["toy_model"] = {"layers": L, "width": D, "rank": R,
                    "base_attn_bytes": attn_base_params * BYTES,
                    "adapter_bytes": adapter_params * BYTES,
                    "adapter_params": adapter_params,
                    "ratio": adapter_params / attn_base_params}
out["memory_gib"] = []
for k in (1, 2, 4, 8, 16):
    unmerged = (attn_base_params * BYTES + k * adapter_params * BYTES) / 2**30
    merged = k * attn_base_params * BYTES / 2**30
    out["memory_gib"].append({"k": k, "unmerged": unmerged, "merged": merged})

# ---- C. Gradient check (analytic vs central finite differences) ---------------
rng = np.random.default_rng(0)
d_in, d_out, r, s = 5, 3, 2, 2.0
W = rng.normal(size=(d_out, d_in))
Ag = rng.normal(size=(r, d_in)) * 0.5
Bg = rng.normal(size=(d_out, r)) * 0.5
xg = rng.normal(size=d_in)
tg = rng.normal(size=d_out)

def loss(A_, B_):
    y_ = W @ xg + s * (B_ @ (A_ @ xg))
    return 0.5 * np.sum((y_ - tg) ** 2)

g = (W @ xg + s * (Bg @ (Ag @ xg))) - tg
gB = s * np.outer(g, Ag @ xg)
gA = s * np.outer(Bg.T @ g, xg)
eps = 1e-6
nB = np.zeros_like(Bg); nA = np.zeros_like(Ag)
for i in range(Bg.shape[0]):
    for j in range(Bg.shape[1]):
        P = Bg.copy(); P[i, j] += eps; M = Bg.copy(); M[i, j] -= eps
        nB[i, j] = (loss(Ag, P) - loss(Ag, M)) / (2 * eps)
for i in range(Ag.shape[0]):
    for j in range(Ag.shape[1]):
        P = Ag.copy(); P[i, j] += eps; M = Ag.copy(); M[i, j] -= eps
        nA[i, j] = (loss(P, Bg) - loss(M, Bg)) / (2 * eps)
out["gradcheck"] = {"max_err_B": float(np.abs(gB - nB).max()), "max_err_A": float(np.abs(gA - nA).max())}

# ---- D. Toy training: frozen W0, target = W0 + rank-2 change -------------------
rng = np.random.default_rng(0)
d, n, steps, lr = 16, 512, 5000, 0.01
W0t = rng.normal(size=(d, d)) / np.sqrt(d)
As = rng.normal(size=(2, d)) / np.sqrt(d)
Bs = rng.normal(size=(d, 2))
X = rng.normal(size=(n, d))
T = X @ (W0t + 2.0 * Bs @ As).T

def train(kind, r=0):
    if kind == "full":
        dW = np.zeros((d, d))
        params = d * d
    else:
        A_ = np.random.default_rng(7).normal(size=(r, d)) / np.sqrt(d)
        B_ = np.zeros((d, r))
        params = r * 2 * d
    curve = []
    for _ in range(steps):
        if kind == "full":
            Yh = X @ (W0t + dW).T
            G = (Yh - T) / n
            curve.append(float(0.5 * np.sum((Yh - T) ** 2) / n))
            dW -= lr * (G.T @ X)
        else:
            Z = X @ A_.T
            Yh = X @ W0t.T + 2.0 * Z @ B_.T
            G = (Yh - T) / n
            curve.append(float(0.5 * np.sum((Yh - T) ** 2) / n))
            gB_ = 2.0 * G.T @ Z
            gA_ = 2.0 * (G @ B_).T @ X
            B_ -= lr * gB_
            A_ -= lr * gA_
    return {"params": params, "loss0": curve[0], "loss_final": curve[-1]}

# Same A initialisation (seed 7) for every LoRA run
out["train"] = {}
for name, kind, r in [("lora_r1", "lora", 1), ("lora_r2", "lora", 2), ("lora_r4", "lora", 4), ("full", "full", 0)]:
    out["train"][name] = train(kind, r)

# ---- E. Multi-adapter batched serving ----------------------------------------
rng = np.random.default_rng(1)
d, r, na, s = 8, 2, 3, 2.0
W0s = rng.normal(size=(d, d)) / np.sqrt(d)
A_bank = rng.normal(size=(na, r, d)) / np.sqrt(d)
B_bank = rng.normal(size=(na, d, r)) * 0.5
Xs = rng.normal(size=(6, d))
ids = np.array([0, 2, 1, 0, 2, 2])
base_s = Xs @ W0s.T
down_s = np.einsum('td,trd->tr', Xs, A_bank[ids])
up_s = np.einsum('tr,tdr->td', down_s, B_bank[ids])
batched = base_s + s * up_s
ref = np.stack([W0s @ Xs[t] + s * B_bank[k] @ (A_bank[k] @ Xs[t]) for t, k in enumerate(ids)])
W_merged = W0s + s * B_bank[0] @ A_bank[0]
out["serving"] = {"max_err_batched_vs_ref": float(np.abs(batched - ref).max()),
                  "tokens_per_adapter": np.bincount(ids, minlength=na).tolist(),
                  "max_err_merged_adapter0": float(np.abs(Xs[0] @ W_merged.T - batched[0]).max()),
                  "batched_row0": batched[0].tolist()}

with open(os.path.join(HERE, "31.3_data.json"), "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
