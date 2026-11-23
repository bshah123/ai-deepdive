"""Lesson 60.2 experiment: every number used in the lesson and its diagrams.

Writes 60.2_data.json next to this file. Pure NumPy, fixed seeds.
Run: python3 60.2_experiment.py
Assumed configs (stated in the lesson): ViT-L hidden 1024, 14-px patches,
LLM hidden 4096 with 32 layers (7B-class, LLaMA-style), fp16 KV cache.
"""
import json
from pathlib import Path

import numpy as np

np.set_printoptions(precision=4, suppress=True)
HERE = Path(__file__).resolve().parent


def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)      # subtract max for stability
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)


def gelu(x):                                     # tanh approximation of GELU
    return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))


D_V, D_L, PATCH = 1024, 4096, 14                 # ViT-L hidden, LLM hidden, patch size
LAYERS, BYTES, TEXT = 32, 2, 64                  # LLM layers, fp16 bytes, text tokens in prompt

# ---- 1. visual tokens from resolution -------------------------------------
def n_patches(res):
    return (res // PATCH) ** 2

tokens_224 = n_patches(224)                      # 16 x 16 grid
tokens_336 = n_patches(336)                      # 24 x 24 grid
QFORMER_Q, QFORMER_D = 32, 768                   # BLIP-2 Q-Former: 32 queries of dim 768

# ---- 2. bridge parameter counts (weights + biases) ------------------------
linear_params = D_V * D_L + D_L
mlp_params = linear_params + D_L * D_L + D_L     # Linear -> GELU -> Linear
mlp_hidden_params = (D_V * D_L + D_L)

# ---- 3. shapes with random weights (forward pass only) --------------------
rng = np.random.default_rng(0)
X = rng.standard_normal((tokens_336, D_V))       # 576 patch features from a 336-px image

W = rng.standard_normal((D_V, D_L)) * 0.02
b = np.zeros(D_L)
lin_out = X @ W + b                              # (576, 4096)

W1 = rng.standard_normal((D_V, D_L)) * 0.02
W2 = rng.standard_normal((D_L, D_L)) * 0.02
mlp_out = gelu(X @ W1) @ W2                      # (576, 4096)

# Q-Former-style resampler: 32 learned queries cross-attend to the 576 features.
queries = rng.standard_normal((QFORMER_Q, QFORMER_D)) * 0.02
Wq = rng.standard_normal((QFORMER_D, QFORMER_D)) * 0.02
Wk = rng.standard_normal((D_V, QFORMER_D)) * 0.02
Wv = rng.standard_normal((D_V, QFORMER_D)) * 0.02
keys, vals = X @ Wk, X @ Wv                      # (576, 768)
att = softmax((queries @ Wq) @ keys.T / np.sqrt(QFORMER_D), axis=-1)   # (32, 576)
qf_out = att @ vals                              # (32, 768)
Wo = rng.standard_normal((QFORMER_D, D_L)) * 0.02
qf_llm = qf_out @ Wo                             # (32, 4096): tokens the LLM reads

# ---- 4. what the LLM pays per prompt (analytic, per-token) -----------------
kv_per_token = 2 * LAYERS * D_L * BYTES          # keys + values, all layers, bytes
def kv_mb(n_visual):
    return (n_visual + TEXT) * kv_per_token / 2 ** 20

layer_weights = 12 * D_L ** 2                    # ~ params per LLaMA-style layer
def attn_over_proj_ratio(T):
    # per layer: attention ~ 4 T^2 d FLOPs; projections/FFN ~ 2 * 12 d^2 * T FLOPs
    return (4 * T ** 2 * D_L) / (2 * layer_weights * T)

cases = {
    "linear_336": tokens_336,
    "linear_224": tokens_224,
    "qformer_32": QFORMER_Q,
}
cost = {}
for name, nv in cases.items():
    T = nv + TEXT
    cost[name] = {
        "visual_tokens": nv,
        "prompt_tokens": T,
        "kv_cache_MB_fp16": round(kv_mb(nv), 1),
        "attn_over_proj_ratio": round(attn_over_proj_ratio(T), 4),
    }

# ---- 5. toy alignment: linear vs MLP connector on synthetic data -----------
# Teacher: target = tanh(V @ C1) @ C2, with C1 scaled by `scale` (nonlinearity strength).
# Both connectors see the same train and test sets. Toy only: not a VLM benchmark.
def run_toy(scale, n_train, seed_teacher=7, H=64, lr=0.05, steps=4000):
    T = np.random.default_rng(seed_teacher)
    C1 = T.standard_normal((16, 32)) * scale / 4.0
    C2 = T.standard_normal((32, 4)) / np.sqrt(32)
    def make(n, rng):
        V = rng.standard_normal((n, 16))
        return V, np.tanh(V @ C1) @ C2
    Vtr, Ytr = make(n_train, np.random.default_rng(1))
    Vte, Yte = make(2000, np.random.default_rng(2))
    # linear connector: closed-form least squares with a bias column
    Atr = np.hstack([Vtr, np.ones((n_train, 1))]); Ate = np.hstack([Vte, np.ones((len(Vte), 1))])
    Wl, *_ = np.linalg.lstsq(Atr, Ytr, rcond=None)
    lin_te = float(((Ate @ Wl - Yte) ** 2).mean())
    # MLP connector: 16 -> H (tanh) -> 4, full-batch gradient descent, manual backprop
    r = np.random.default_rng(3)
    W1 = r.standard_normal((16, H)) * 0.3; b1 = np.zeros(H)
    W2 = r.standard_normal((H, 4)) * 0.3;  b2 = np.zeros(4)
    for _ in range(steps):
        h = np.tanh(Vtr @ W1 + b1)
        pred = h @ W2 + b2
        d = 2 * (pred - Ytr) / Ytr.size          # d(mean squared error)/d(pred)
        gW2 = h.T @ d; gb2 = d.sum(0)
        dz = (d @ W2.T) * (1 - h ** 2)
        gW1 = Vtr.T @ dz; gb1 = dz.sum(0)
        W1 -= lr * gW1; b1 -= lr * gb1; W2 -= lr * gW2; b2 -= lr * gb2
    mlp_te = float(((np.tanh(Vte @ W1 + b1) @ W2 + b2 - Yte) ** 2).mean())
    return {"scale": scale, "n_train": n_train, "var_test": float(Yte.var(axis=0).mean()),
            "linear_test_mse": lin_te, "mlp_test_mse": mlp_te,
            "linear_params": int(Wl.size), "mlp_params": int(W1.size + b1.size + W2.size + b2.size)}

sweep = [run_toy(s, n) for s in (0.25, 1.0) for n in (400, 4000)]
for row in sweep:
    print("scale %.2f n %4d var %.4f linear %.4f mlp %.4f" % (row["scale"], row["n_train"], row["var_test"], row["linear_test_mse"], row["mlp_test_mse"]))

data = {
    "config": {"D_V": D_V, "D_L": D_L, "patch": PATCH, "layers": LAYERS, "text_tokens": TEXT},
    "tokens": {"res224": tokens_224, "res336": tokens_336, "qformer": QFORMER_Q},
    "params": {"linear": linear_params, "mlp": mlp_params},
    "shapes": {
        "linear_out": list(lin_out.shape), "mlp_out": list(mlp_out.shape),
        "qformer_att": list(att.shape), "qformer_out": list(qf_out.shape),
        "qformer_llm": list(qf_llm.shape),
    },
    "att_row_sum_min": float(att.sum(axis=1).min()), "att_row_sum_max": float(att.sum(axis=1).max()),
    "kv_per_token_bytes": kv_per_token,
    "cost": cost,
    "toy": {"hidden": 64, "lr": 0.05, "steps": 4000, "sweep": sweep},
}
(HERE / "60.2_data.json").write_text(json.dumps(data, indent=2))

if __name__ == "__main__":
    print("visual tokens 224 px / 336 px / Q-Former:", tokens_224, tokens_336, QFORMER_Q)
    print("bridge params  linear:", linear_params, " MLP:", mlp_params)
    print("shapes:", data["shapes"])
    print("Q-Former attention row sums in [%.6f, %.6f]" % (data["att_row_sum_min"], data["att_row_sum_max"]))
    print("KV bytes per token (fp16, 32 layers):", kv_per_token)
    for k, v in cost.items():
        print(k, v)
