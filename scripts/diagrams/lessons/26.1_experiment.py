import numpy as np

np.set_printoptions(precision=3, suppress=True)
D, H, DFF = 8, 2, 32       # model width, number of heads, feed-forward width
DH = D // H                # width of one head

def softmax(x):
    e = np.exp(x - x.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def layer_norm(x, g, b, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = x.var(axis=-1, keepdims=True)
    return g * (x - mu) / np.sqrt(var + eps) + b

def attention(xq, xkv, w, causal=False):
    # xq: (Tq, D) supplies the queries; xkv: (Tk, D) supplies keys and values
    Tq, Tk = xq.shape[0], xkv.shape[0]
    split = lambda m: m.reshape(-1, H, DH).transpose(1, 0, 2)   # -> (H, T, DH)
    Q, K, V = split(xq @ w["Wq"]), split(xkv @ w["Wk"]), split(xkv @ w["Wv"])
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(DH)             # (H, Tq, Tk)
    if causal:
        scores = np.where(np.triu(np.ones((Tq, Tk), bool), k=1), -np.inf, scores)
    weights = softmax(scores)
    out = (weights @ V).transpose(1, 0, 2).reshape(Tq, D) @ w["Wo"]
    return out, weights

def ffn(x, w):
    return np.maximum(0.0, x @ w["W1"] + w["b1"]) @ w["W2"] + w["b2"]

def encoder_block(x, p):
    a, _ = attention(x, x, p["self"])
    x = layer_norm(x + a, *p["ln1"])
    return layer_norm(x + ffn(x, p["ffn"]), *p["ln2"])

def decoder_block(y, memory, p):
    a, w_self = attention(y, y, p["self"], causal=True)
    y = layer_norm(y + a, *p["ln1"])
    c, w_cross = attention(y, memory, p["cross"])
    y = layer_norm(y + c, *p["ln2"])
    return layer_norm(y + ffn(y, p["ffn"]), *p["ln3"]), w_self, w_cross

def init_block(rng, decoder):
    W = lambda r, c: rng.normal(0, 1 / np.sqrt(r), (r, c))
    attn = lambda: {k: W(D, D) for k in ("Wq", "Wk", "Wv", "Wo")}
    ln = lambda: (np.ones(D), np.zeros(D))
    p = {"self": attn(), "ln1": ln(), "ln2": ln(),
         "ffn": {"W1": W(D, DFF), "b1": np.zeros(DFF), "W2": W(DFF, D), "b2": np.zeros(D)}}
    if decoder:
        p["cross"], p["ln3"] = attn(), ln()
    return p

def count(p):
    if isinstance(p, dict): return sum(count(v) for v in p.values())
    if isinstance(p, tuple): return sum(count(v) for v in p)
    return p.size

rng = np.random.default_rng(0)
enc_p, dec_p = init_block(rng, False), init_block(rng, True)
src = rng.normal(size=(5, D))    # 5 source tokens
tgt = rng.normal(size=(4, D))    # 4 target tokens

# 1. Shapes through both blocks
memory = encoder_block(src, enc_p)
out, w_self, w_cross = decoder_block(tgt, memory, dec_p)
print("encoder output:", memory.shape, "| decoder output:", out.shape)
print("decoder self-attention weights (H, Tq, Tk):", w_self.shape)
print("cross-attention weights (H, Tq, Tk):", w_cross.shape)

# 2. Layer norm on one vector, by hand
x = np.array([1.0, 2.0, 3.0, 4.0])
print("layer norm of [1, 2, 3, 4]:", layer_norm(x, np.ones(4), np.zeros(4)))

# 3. Causal mask: head 0 of decoder self-attention
print("causal weights, head 0:")
print(w_self[0])
print("row sums:", w_self[0].sum(axis=-1))
print("total weight on future positions:", np.triu(w_self, k=1).sum())

# 4. Leak test: change one input token, see which outputs move
def change_per_position(fn, x, pos):
    x2 = x.copy(); x2[pos] += 1.0
    return np.abs(fn(x2) - fn(x)).max(axis=-1)

enc_change = change_per_position(lambda z: encoder_block(z, enc_p), src, 4)
dec_change = change_per_position(lambda z: decoder_block(z, memory, dec_p)[0], tgt, 3)
print("encoder: change source token 4 -> max change at each position:",
      ["%.2e" % v for v in enc_change])
print("decoder: change target token 3 -> max change at each position:",
      ["%.2e" % v for v in dec_change])

# 5. Parameter counts
print("parameters, D=8, DFF=32: encoder block", count(enc_p), "| decoder block", count(dec_p))
def formula(d, dff, decoder):
    attn, ffn_, ln = 4 * d * d, d * dff + dff + dff * d + d, 2 * d
    return (2 * attn if decoder else attn) + ffn_ + (3 * ln if decoder else 2 * ln)
print("formula, D=8, DFF=32:", formula(8, 32, False), formula(8, 32, True))
print("formula, D=512, DFF=2048: encoder", formula(512, 2048, False), "| decoder", formula(512, 2048, True))

# ---- data dump for the diagram script (scripts/diagrams/lessons/26.1.mjs) ----
import json, os
xs = np.array([1.0, 2.0, 3.0, 4.0])
d_big = {"attn": 4 * 512 * 512, "ffn": 512 * 2048 + 2048 + 2048 * 512 + 512, "ln": 2 * 512}
data = {
    "ln_x": xs.tolist(),
    "ln_mean": float(xs.mean()),
    "ln_centred": (xs - xs.mean()).tolist(),
    "ln_var": float(xs.var()),
    "ln_std": float(np.sqrt(xs.var() + 1e-5)),
    "ln_out": layer_norm(xs, np.ones(4), np.zeros(4)).tolist(),
    "causal_w": w_self[0].tolist(),
    "enc_change": enc_change.tolist(),
    "dec_change": dec_change.tolist(),
    "params_big": {
        "attn": d_big["attn"], "ffn": d_big["ffn"], "ln": d_big["ln"],
        "encoder": formula(512, 2048, False), "decoder": formula(512, 2048, True),
    },
    "params_small": {"encoder": count(enc_p), "decoder": count(dec_p)},
}
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "26.1_data.json")
with open(out_path, "w") as f:
    json.dump(data, f, indent=1)
print("wrote", out_path)
