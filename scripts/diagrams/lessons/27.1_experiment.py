import json, os
import math
import numpy as np

VOCAB = list("abcdefghijklmnopqrstuvwxyz .")
STOI = {c: i for i, c in enumerate(VOCAB)}
V, T_MAX, D, H, L = len(VOCAB), 16, 32, 4, 2   # vocab, block size, width, heads, blocks
HD = D // H                                    # width of one head

def init_params(std=0.02, seed=1337):
    rng = np.random.default_rng(seed)
    n = lambda *shape: rng.normal(0.0, std, shape)
    ones_zeros = lambda: (np.ones(D), np.zeros(D))
    p = {"wte": n(V, D), "wpe": n(T_MAX, D), "ln_f": ones_zeros(), "blocks": []}
    for _ in range(L):
        p["blocks"].append({
            "ln1": ones_zeros(),
            "attn_w": n(D, 3 * D), "attn_b": np.zeros(3 * D),
            "proj_w": n(D, D), "proj_b": np.zeros(D),
            "ln2": ones_zeros(),
            "fc_w": n(D, 4 * D), "fc_b": np.zeros(4 * D),
            "out_w": n(4 * D, D), "out_b": np.zeros(D),
        })
    return p

def count(o):
    if isinstance(o, np.ndarray):
        return o.size
    return sum(count(v) for v in (o.values() if isinstance(o, dict) else o))

def layer_norm(x, g, b, eps=1e-5):
    mu = x.mean(-1, keepdims=True)
    var = x.var(-1, keepdims=True)
    return g * (x - mu) / np.sqrt(var + eps) + b

def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(math.sqrt(2 / math.pi) * (x + 0.044715 * x ** 3)))

def causal_attention(h, bp, mask=True):
    B, T, _ = h.shape
    q, k, v = np.split(h @ bp["attn_w"] + bp["attn_b"], 3, axis=-1)
    heads = lambda m: m.reshape(B, T, H, HD).transpose(0, 2, 1, 3)   # (B, H, T, HD)
    q, k, v = heads(q), heads(k), heads(v)
    att = q @ k.transpose(0, 1, 3, 2) / math.sqrt(HD)                # (B, H, T, T)
    if mask:
        future = np.triu(np.ones((T, T), dtype=bool), k=1)           # True above the diagonal
        att = np.where(future, -np.inf, att)
    att = np.exp(att - att.max(-1, keepdims=True))
    att = att / att.sum(-1, keepdims=True)
    y = (att @ v).transpose(0, 2, 1, 3).reshape(B, T, D)
    return y @ bp["proj_w"] + bp["proj_b"], att

def block(x, bp, mask=True):
    a, att = causal_attention(layer_norm(x, *bp["ln1"]), bp, mask)
    x = x + a
    m = gelu(layer_norm(x, *bp["ln2"]) @ bp["fc_w"] + bp["fc_b"]) @ bp["out_w"] + bp["out_b"]
    return x + m, att

def gpt_forward(idx, p, mask=True):
    B, T = idx.shape
    x = p["wte"][idx] + p["wpe"][:T]                                 # (B, T, D)
    atts = []
    for bp in p["blocks"]:
        x, att = block(x, bp, mask)
        atts.append(att)
    x = layer_norm(x, *p["ln_f"])
    return x @ p["wte"].T, atts                                      # tied head: (B, T, V)

def next_token_loss(logits, idx):
    lg, tg = logits[:, :-1], idx[:, 1:]                              # position t predicts token t+1
    lg = lg - lg.max(-1, keepdims=True)
    logp = lg - np.log(np.exp(lg).sum(-1, keepdims=True))
    return -np.take_along_axis(logp, tg[..., None], -1).mean()

def gpt_param_formula(V, T, D, L):
    per_block = 2 * (2 * D) + (D * 3 * D + 3 * D) + (D * D + D) + (D * 4 * D + 4 * D) + (4 * D * D + D)
    return V * D + T * D + L * per_block + 2 * D

out = {}
text = "the cat sat on t"
ids = np.array([[STOI[c] for c in text]])                  # (1, 16)
p = init_params(0.02)
logits, atts = gpt_forward(ids, p)
out["shape_logits"] = list(logits.shape)
out["shape_att"] = list(atts[0].shape)
out["params_tiny_actual"] = count(p)
out["params_tiny_formula"] = gpt_param_formula(V, T_MAX, D, L)
assert out["params_tiny_actual"] == out["params_tiny_formula"]
g = dict(V=50257, T=1024, D=768, L=12)
out["params_gpt2cfg"] = gpt_param_formula(**g)
per_block = 2 * (2 * g["D"]) + (g["D"] * 3 * g["D"] + 3 * g["D"]) + (g["D"] * g["D"] + g["D"]) + (g["D"] * 4 * g["D"] + 4 * g["D"]) + (4 * g["D"] * g["D"] + g["D"])
out["params_gpt2cfg_parts"] = {"embeddings": g["V"] * g["D"] + g["T"] * g["D"], "per_block": per_block, "blocks": g["L"] * per_block, "ln_f": 2 * g["D"], "wte": g["V"] * g["D"]}
ids2 = ids.copy(); ids2[0, 10] = STOI["z"]
leak = {}
for mask in (True, False):
    a, _ = gpt_forward(ids, p, mask); b, _ = gpt_forward(ids2, p, mask)
    leak["mask_on" if mask else "mask_off"] = np.abs(a - b).max(axis=(0, 2)).tolist()
out["leak"] = leak
out["att_head0_block0_4x4"] = atts[0][0, 0, :4, :4].tolist()
out["att_upper_max"] = float(np.abs(np.triu(atts[0][0, 0], 1)).max())
out["att_row_sums"] = atts[0][0, 0].sum(-1).tolist()
ws = np.exp(np.array([0.5, 1.0, -np.inf])); ws = ws / ws.sum()
out["worked_row"] = {"exp": [math.exp(0.5), math.exp(1.0)], "sum": math.exp(0.5) + math.exp(1.0), "weights": ws.tolist()}
out["ln_V"] = math.log(V)
losses = {}
for std in (0.02, 1.0):
    vals = []
    for seed in range(5):
        pp = init_params(std, seed=seed)
        lg, _ = gpt_forward(ids, pp)
        vals.append(float(next_token_loss(lg, ids)))
    losses[str(std)] = vals
out["init_losses"] = losses
xs = np.linspace(-4, 4, 2001)
exact = np.array([0.5 * x * (1 + math.erf(x / math.sqrt(2))) for x in xs])
out["gelu_max_abs_err"] = float(np.abs(gelu(xs) - exact).max())
out["text"] = text
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "27.1_data.json"), "w"), indent=1)
print(json.dumps(out, indent=1)[:3000])
