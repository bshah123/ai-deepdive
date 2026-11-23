# Experiment for lesson 39.3. Every number in the lesson and its diagrams comes from this file.
# Run once:  <venv-python> scripts/diagrams/lessons/39.3_experiment.py
# Writes scripts/diagrams/lessons/39.3_data.json. NumPy only.
import json
from pathlib import Path

import numpy as np

OUT = Path(__file__).parent / "39.3_data.json"
result = {}

# ---- Block A: worked example (hand-chosen 2-D unit vectors) -------------------------
def maxsim(Q, D):
    return float((Q @ D.T).max(axis=1).sum())

Q = np.array([[1.0, 0.0],
              [0.0, 1.0],
              [0.6, 0.8]])
D = np.array([[0.8, 0.6],
              [0.0, 1.0],
              [-1.0, 0.0],
              [0.6, -0.8]])
S = Q @ D.T
result["worked"] = {
    "S": S.round(4).tolist(),
    "argmax": S.argmax(axis=1).tolist(),
    "rowmax": S.max(axis=1).round(4).tolist(),
    "score": round(maxsim(Q, D), 4),
}
print("A. worked example")
print(S.round(2))
print("argmax", S.argmax(axis=1), "rowmax", S.max(axis=1).round(2), "score", round(maxsim(Q, D), 4))

# ---- Block B: concept experiment, MaxSim vs mean-pooled single vector -----------------
def unit(x):
    return x / np.linalg.norm(x, axis=-1, keepdims=True)

def cosine(u, v):
    return float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v)))

rng = np.random.default_rng(39)
DIM, N_CONCEPTS = 128, 200
concepts = unit(rng.standard_normal((N_CONCEPTS, DIM)))

def token(i):
    return unit(concepts[i] + 0.5 * rng.standard_normal(DIM) / np.sqrt(DIM))

def trial(L):
    a, b, c = rng.choice(N_CONCEPTS, size=3, replace=False)
    others = np.setdiff1d(np.arange(N_CONCEPTS), [a, b, c])
    Q = np.stack([token(a), token(b)])
    fill1 = rng.choice(others, size=L - 2)
    fill2 = rng.choice(others, size=L - 2)
    rel = np.stack([token(a), token(b)] + [token(k) for k in fill1])
    dis = np.stack([token(a), token(c)] + [token(k) for k in fill2])
    ms = maxsim(Q, rel) > maxsim(Q, dis)
    mp = cosine(Q.mean(0), rel.mean(0)) > cosine(Q.mean(0), dis.mean(0))
    return ms, mp

TRIALS = 400
dilution = {}
print("B. accuracy: relevant doc beats distractor (both docs have L tokens)")
for L in (4, 16, 64, 256):
    res = np.array([trial(L) for _ in range(TRIALS)])
    dilution[str(L)] = {"maxsim": float(res[:, 0].mean()), "meanpool": float(res[:, 1].mean())}
    print(f"L={L:3d}  MaxSim={res[:, 0].mean():.3f}  mean-pool={res[:, 1].mean():.3f}  (n={TRIALS})")
result["dilution"] = dilution
result["trials"] = TRIALS

# ---- Block C: MaxSim never decreases when a document token is added; float16 storage --
rng2 = np.random.default_rng(7)
Q = unit(rng2.standard_normal((32, 128)))
D = unit(rng2.standard_normal((100, 128)))
base = maxsim(Q, D)
extra = maxsim(Q, np.vstack([D, unit(rng2.standard_normal((1, 128)))]))
print("C. before adding one doc token:", round(base, 4), " after:", round(extra, 4), " non-decreasing:", extra >= base)
violations = 0
for _ in range(500):
    Qt = unit(rng2.standard_normal((8, 128)))
    Dt = unit(rng2.standard_normal((20, 128)))
    more = np.vstack([Dt, unit(rng2.standard_normal((5, 128)))])
    violations += maxsim(Qt, more) < maxsim(Qt, Dt)
print("monotonicity violations in 500 random cases:", violations)
result["monotone"] = {"base": round(base, 4), "extra": round(extra, 4), "violations_500": int(violations)}

docs = unit(rng2.standard_normal((200, 100, 128)))
scores32 = np.array([maxsim(Q, d) for d in docs])
scores16 = np.array([maxsim(Q.astype(np.float16).astype(np.float32),
                            d.astype(np.float16).astype(np.float32)) for d in docs])
err = np.abs(scores32 - scores16)
top1_same = int(scores32.argmax() == scores16.argmax())
print(f"float16 storage: max |score error| = {err.max():.2e}, top-1 unchanged = {bool(top1_same)}")
result["fp16"] = {"max_abs_err": float(err.max()), "top1_same": bool(top1_same)}

# ---- Block D: cost and storage arithmetic (assumptions stated, not measured) -------------
P = 1.1e8          # parameters of a BERT-base-sized encoder (assumption)
Lq, Ld, d = 32, 100, 128
N = 1_000_000
cross_pair = 2 * P * (Lq + Ld)           # FLOPs, one query-document pair, cross-encoder
maxsim_doc = 2 * Lq * Ld * d             # FLOPs, one document, MaxSim
bienc_query = 2 * P * Lq                 # FLOPs, encode the query once (bi-encoder)
bienc_dots = N * 2 * d                   # FLOPs, N dot products (bi-encoder)
cross_all = N * cross_pair               # FLOPs per query if every doc is scored by the cross-encoder
maxsim_all = N * maxsim_doc              # FLOPs per query, brute-force MaxSim over N docs
print(f"D. cross-encoder pair {cross_pair:.3e}  MaxSim doc {maxsim_doc:.3e}  ratio {cross_pair / maxsim_doc:,.0f}x")
print(f"   per query, N={N:,}: cross-encoder {cross_all:.3e}  MaxSim {maxsim_all:.3e}  bi-encoder {bienc_query + bienc_dots:.3e}")
fp32_gb = N * Ld * d * 4 / 1e9
fp16_gb = N * Ld * d * 2 / 1e9
print(f"   index for N docs of {Ld} tokens: fp32 {fp32_gb:.1f} GB, fp16 {fp16_gb:.1f} GB")
result["cost"] = {
    "P": P, "Lq": Lq, "Ld": Ld, "d": d, "N": N,
    "cross_pair": cross_pair, "maxsim_doc": maxsim_doc,
    "ratio": cross_pair / maxsim_doc,
    "cross_all": cross_all, "maxsim_all": maxsim_all,
    "bienc_all": bienc_query + bienc_dots,
    "fp32_gb": fp32_gb, "fp16_gb": fp16_gb,
    "bytes_doc_fp32": Ld * d * 4, "bytes_doc_fp16": Ld * d * 2, "bytes_biencoder_fp32": d * 4,
}

OUT.write_text(json.dumps(result, indent=1))
print("wrote", OUT)
