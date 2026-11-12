"""Experiment script for lesson 25.5 (Multi-Head Latent Attention).

Every number used in the lesson text and in 25.5.mjs is printed here.
Run:  python scripts/diagrams/lessons/25.5_data.py
The five sections are the five visible code blocks of the lesson, each self-contained.
"""

# ---------------------------------------------------------------- block A
print("== A: worked example ==")
import numpy as np

H = np.array([[1.0, 0.0, 1.0, 0.0],          # token 1   (d = 4)
              [0.0, 1.0, 0.0, 1.0],          # token 2
              [1.0, 1.0, 0.0, 0.0]])         # token 3
W_D = np.array([[1.0, 0.0, 1.0, 0.0],        # down-projection, d = 4 -> d_c = 2
                [0.0, 1.0, 0.0, 1.0]])
W_UK = np.array([[1.0,  0.0],                # up-projection to keys, d_c = 2 -> d_h = 4
                 [0.0,  1.0],
                 [1.0,  1.0],
                 [1.0, -1.0]])
W_UV = np.array([[1.0, 0.0],                 # up-projection to values, d_c = 2 -> d_h = 4
                 [0.0, 1.0],
                 [1.0, 1.0],
                 [0.0, 2.0]])
q = np.array([1.0, 0.0, 1.0, 0.0])           # the current token's query, d_h = 4

C = H @ W_D.T                                # latents: the ONLY thing we cache
K = C @ W_UK.T                               # route 1: rebuild every key ...
V = C @ W_UV.T                               # ... and every value
s1 = K @ q / np.sqrt(4)
w1 = np.exp(s1) / np.exp(s1).sum()
out1 = w1 @ V

q_lat = W_UK.T @ q                           # route 2: fold W_UK into the query, once
s2 = C @ q_lat / np.sqrt(4)                  # score against the latents directly
w2 = np.exp(s2) / np.exp(s2).sum()
out2 = W_UV @ (w2 @ C)                       # mix the latents, up-project once

np.set_printoptions(precision=3, suppress=True)
print("latents C      :", C.tolist())
print("keys K         :", K.tolist())
print("latent query   :", q_lat)
print("scores  route 1:", K @ q, "  route 2:", C @ q_lat)
print("weights        :", w1)
print("mixed latent   :", w2 @ C)
print("output  route 1:", out1)
print("output  route 2:", out2)
print("cached numbers per token:", K.shape[1] + V.shape[1], "->", C.shape[1])

# ---------------------------------------------------------------- block B
print("== B: multi-head, explicit vs absorbed ==")
import numpy as np

rng = np.random.default_rng(0)
d, n_h, d_h, d_c, n = 64, 4, 16, 8, 100      # model width, heads, head width, latent width, tokens
H = rng.normal(size=(n, d))
W_Q   = rng.normal(size=(n_h, d_h, d)) / np.sqrt(d)
W_DKV = rng.normal(size=(d_c, d)) / np.sqrt(d)
W_UK  = rng.normal(size=(n_h, d_h, d_c)) / np.sqrt(d_c)
W_UV  = rng.normal(size=(n_h, d_h, d_c)) / np.sqrt(d_c)
W_O   = rng.normal(size=(n_h, d, d_h)) / np.sqrt(d_h)
mask = np.triu(np.full((n, n), -np.inf), k=1)        # causal mask (Lesson 25.3)

def softmax(s):
    e = np.exp(s - s.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)

C = H @ W_DKV.T                                      # (n, d_c)       the cache
Q = np.einsum('hkd,nd->hnk', W_Q, H)                 # (n_h, n, d_h)

# Route 1, explicit: rebuild keys and values for every head, then ordinary attention.
K = np.einsum('hkc,nc->hnk', W_UK, C)                # (n_h, n, d_h)
V = np.einsum('hkc,nc->hnk', W_UV, C)
A1 = softmax(Q @ K.transpose(0, 2, 1) / np.sqrt(d_h) + mask)
out1 = np.einsum('hdk,hnk->nd', W_O, A1 @ V)

# Route 2, absorbed: never build K or V.
Q_lat = np.einsum('hnk,hkc->hnc', Q, W_UK)           # W_UK^T q   (n_h, n, d_c)
A2 = softmax(Q_lat @ C.T / np.sqrt(d_h) + mask)
W_OV = np.einsum('hdk,hkc->hdc', W_O, W_UV)          # W_O W_UV, computed once
out2 = np.einsum('hdc,hnc->nd', W_OV, A2 @ C)

K_all = K.transpose(1, 0, 2).reshape(n, n_h * d_h)   # every head's key, side by side
sv = np.linalg.svd(K_all, compute_uv=False)
print("max |explicit - absorbed| :", f"{np.abs(out1 - out2).max():.1e}")
print("key matrix shape          :", K_all.shape, " rank:", np.linalg.matrix_rank(K_all))
print("singular values 1-8       :", np.round(sv[:8], 1))
print("singular value 9          :", f"{sv[8]:.1e}")
print("cached numbers per token  :", 2 * n_h * d_h, "(keys + values)  vs ", d_c, "(latent)")

# ---------------------------------------------------------------- block C
print("== C: RoPE blocks the absorption ==")
import numpy as np

def rope(x, pos):
    """Rotate consecutive pairs of x by the angles pos * theta_m (RoPE, Lesson 24.3)."""
    theta = 10000.0 ** (-np.arange(0, x.shape[-1], 2) / x.shape[-1])
    ang = np.asarray(pos, dtype=float)[..., None] * theta
    out = np.empty_like(x)
    out[..., 0::2] = x[..., 0::2] * np.cos(ang) - x[..., 1::2] * np.sin(ang)
    out[..., 1::2] = x[..., 0::2] * np.sin(ang) + x[..., 1::2] * np.cos(ang)
    return out

W_UK = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, -1.0]])
C = np.array([[2.0, 0.0], [0.0, 2.0], [1.0, 1.0]])   # cached latents of tokens at positions 0, 1, 2
q = np.array([1.0, 0.0, 1.0, 0.0])
t = 3                                                # the query sits at position 3

np.set_printoptions(precision=3, suppress=True)
print("no RoPE: one latent query for all tokens:", W_UK.T @ q)
for j in range(3):
    true = rope(q, t) @ rope(W_UK @ C[j], j)         # score with RoPE on full keys
    q_lat_j = W_UK.T @ rope(q, t - j)                # the latent query that reproduces it
    print(f"RoPE, token {j} (distance {t - j}): latent query {q_lat_j}  score {true:.3f} = {q_lat_j @ C[j]:.3f}")

# ---------------------------------------------------------------- block D
print("== D: full MLA with decoupled RoPE, cached decoding ==")
import numpy as np

rng = np.random.default_rng(1)
d, n_h, d_h, d_R, d_c, d_cq, n = 32, 2, 8, 4, 6, 12, 7
init = lambda *shape: rng.normal(size=shape) / np.sqrt(shape[-1])
W_DKV, W_KR = init(d_c, d), init(d_R, d)                       # key/value side
W_UK, W_UV = init(n_h, d_h, d_c), init(n_h, d_h, d_c)
W_DQ, W_UQ, W_QR = init(d_cq, d), init(n_h, d_h, d_cq), init(n_h, d_R, d_cq)   # query side
W_O = init(n_h, d, d_h)
W_OV = np.einsum('hdk,hkc->hdc', W_O, W_UV)                    # absorbed once, offline

def rope(x, pos):
    theta = 10000.0 ** (-np.arange(0, x.shape[-1], 2) / x.shape[-1])
    ang = np.asarray(pos, dtype=float)[..., None] * theta
    out = np.empty_like(x)
    out[..., 0::2] = x[..., 0::2] * np.cos(ang) - x[..., 1::2] * np.sin(ang)
    out[..., 1::2] = x[..., 0::2] * np.sin(ang) + x[..., 1::2] * np.cos(ang)
    return out

def softmax(s):
    e = np.exp(s - s.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)

def mla_full(H, pos):
    """Reference: build full keys and values for the whole sequence (no cache)."""
    n = len(H)
    C, cq = H @ W_DKV.T, H @ W_DQ.T
    K = np.einsum('hkc,nc->hnk', W_UK, C)                      # content keys   (n_h, n, d_h)
    V = np.einsum('hkc,nc->hnk', W_UV, C)
    kR = rope(H @ W_KR.T, pos)                                 # ONE positional key per token (n, d_R)
    Q = np.einsum('hkc,nc->hnk', W_UQ, cq)                     # content queries
    qR = rope(np.einsum('hrc,nc->hnr', W_QR, cq), pos)         # positional queries, per head
    scores = Q @ K.transpose(0, 2, 1) + qR @ kR.T              # content part + positional part
    A = softmax(scores / np.sqrt(d_h + d_R) + np.triu(np.full((n, n), -np.inf), k=1))
    return np.einsum('hdk,hnk->nd', W_O, A @ V), scores

def mla_step(h, pos, cache):
    """Decode one token. The cache holds only C (d_c numbers) and kR (d_R numbers) per token."""
    cache["C"].append(W_DKV @ h)
    cache["kR"].append(rope(W_KR @ h, pos))
    C, kR = np.array(cache["C"]), np.array(cache["kR"])
    cq = W_DQ @ h
    q_lat = np.einsum('hk,hkc->hc', W_UQ @ cq, W_UK)           # W_UK^T q^C   (n_h, d_c)
    qR = rope(W_QR @ cq, pos)                                  # (n_h, d_R)
    A = softmax((q_lat @ C.T + qR @ kR.T) / np.sqrt(d_h + d_R))
    return np.einsum('hdc,hc->d', W_OV, A @ C)

H = rng.normal(size=(n, d))
ref, scores = mla_full(H, np.arange(n))
cache = {"C": [], "kR": []}
dec = np.array([mla_step(H[t], t, cache) for t in range(n)])
_, shifted = mla_full(H, np.arange(n) + 1000)

print("max |cached decode - full forward| :", f"{np.abs(dec - ref).max():.1e}")
print("max score change, positions + 1000 :", f"{np.abs(shifted - scores).max():.1e}")
print("cached numbers per token           :", len(cache['C'][0]), "+", len(cache['kR'][0]),
      "=", d_c + d_R, " (full keys + values:", 2 * n_h * d_h, ")")

# ---------------------------------------------------------------- block E
print("== E: DeepSeek-V2 cache sizes ==")
n_h, d_h, layers = 128, 128, 60          # DeepSeek-V2 (paper, Section 3.1.2)
d_c, d_R = 512, 64                       # latent width, positional-key width
context, bytes_per_number = 32_768, 2    # my assumptions: 32k tokens, 16-bit floats

per_layer = {
    "MHA (128 KV heads)": 2 * n_h * d_h,
    "GQA (8 KV heads)":   2 * 8 * d_h,
    "MLA":                d_c + d_R,
    "MQA (1 KV head)":    2 * d_h,
}
for name, e in per_layer.items():
    gib = e * layers * context * bytes_per_number / 2**30
    print(f"{name:20s} {e:6,d} numbers/token/layer   {e * layers:9,d} per token   {gib:7.2f} GiB at 32k tokens")
print("MHA / MLA =", round(per_layer["MHA (128 KV heads)"] / per_layer["MLA"], 1),
      "  MLA equals GQA with", per_layer["MLA"] / (2 * d_h), "KV heads")
