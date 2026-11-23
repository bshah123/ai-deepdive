import math
import numpy as np

# Tiny random decoder in float64 (no trained weights). Everything the lesson reports comes from this file.
SEED, V, D, H, L, FF, MAXLEN = 27, 16, 16, 2, 2, 32, 128
DH = D // H                                    # head size = 8
rng = np.random.default_rng(SEED)

def mat(rows, cols, scale):
    return rng.normal(0.0, scale, size=(rows, cols))

P = {"emb": mat(V, D, 0.5), "pos": mat(MAXLEN, D, 0.5), "unemb": mat(D, V, D ** -0.5), "layers": []}
for _ in range(L):
    P["layers"].append({
        "Wq": mat(D, D, D ** -0.5), "Wk": mat(D, D, D ** -0.5),
        "Wv": mat(D, D, D ** -0.5), "Wo": mat(D, D, D ** -0.5),
        "W1": mat(D, FF, D ** -0.5), "W2": mat(FF, D, FF ** -0.5),
    })

COUNT = {"token_passes": 0, "score_entries": 0}

def reset():
    COUNT.update({"token_passes": 0, "score_entries": 0})

def layer_norm(x, eps=1e-5):
    mu = x.mean(-1, keepdims=True)
    var = x.var(-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def softmax(z):
    z = z - z.max(-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(-1, keepdims=True)

def empty_cache():
    return [(np.zeros((0, H, DH)), np.zeros((0, H, DH))) for _ in range(L)]

def forward(tokens, start_pos, cache):
    # tokens: the new tokens; they sit at absolute positions start_pos, start_pos+1, ...
    # cache: per layer (K, V) for all earlier positions; extended in place with the new ones.
    n = len(tokens)
    pos = np.arange(start_pos, start_pos + n)
    x = P["emb"][tokens] + P["pos"][pos]
    COUNT["token_passes"] += n
    for li, lp in enumerate(P["layers"]):
        h = layer_norm(x)
        q = (h @ lp["Wq"]).reshape(n, H, DH)
        k = (h @ lp["Wk"]).reshape(n, H, DH)
        v = (h @ lp["Wv"]).reshape(n, H, DH)
        K_old, V_old = cache[li]
        K = np.concatenate([K_old, k])
        Vv = np.concatenate([V_old, v])
        cache[li] = (K, Vv)
        T = K.shape[0]
        scores = np.einsum("ihd,jhd->hij", q, K) / math.sqrt(DH)
        COUNT["score_entries"] += H * n * T
        # causal mask on absolute positions: query at pos[i] may read key j only if j <= pos[i]
        mask = np.arange(T)[None, :] <= pos[:, None]
        scores = np.where(mask[None], scores, -np.inf)
        w = softmax(scores)
        att = np.einsum("hij,jhd->ihd", w, Vv).reshape(n, D)
        x = x + att @ lp["Wo"]
        h2 = layer_norm(x)
        x = x + np.maximum(h2 @ lp["W1"], 0.0) @ lp["W2"]
    return layer_norm(x) @ P["unemb"]

def run_recompute(prompt, n_new):
    reset()
    toks, logits = list(prompt), []
    for _ in range(n_new):
        out = forward(np.array(toks), 0, empty_cache())   # whole sequence, every step
        logits.append(out[-1])
        toks.append(int(out[-1].argmax()))
    return toks, logits, dict(COUNT)

def run_cached(prompt, n_new):
    reset()
    cache = empty_cache()
    toks = list(prompt)
    out = forward(np.array(toks), 0, cache)               # prefill: the prompt in one pass
    logits = [out[-1]]
    toks.append(int(out[-1].argmax()))
    for _ in range(n_new - 1):                             # decode: one new token per step
        out = forward(np.array([toks[-1]]), len(toks) - 1, cache)
        logits.append(out[0])
        toks.append(int(out[0].argmax()))
    return toks, logits, dict(COUNT), cache

PROMPT, N_NEW = [3, 7, 1, 9], 8
toks_r, lg_r, cnt_r = run_recompute(PROMPT, N_NEW)
toks_c, lg_c, cnt_c, cache = run_cached(PROMPT, N_NEW)
print("prompt:", PROMPT)
print("generated, recompute:", toks_r[len(PROMPT):])
print("generated, cached:   ", toks_c[len(PROMPT):])
print("same tokens:", toks_r == toks_c)
max_diff = max(float(np.abs(a - b).max()) for a, b in zip(lg_r, lg_c))
print("max logit difference below 1e-9:", max_diff < 1e-9)
gaps = [float(np.sort(l)[-1] - np.sort(l)[-2]) for l in lg_r]
print("smallest top-1 minus top-2 logit gap: %.2f" % min(gaps))
print("token positions run through the network:")
print("  recompute:", cnt_r["token_passes"], " cached:", cnt_c["token_passes"])
print("attention score entries computed:")
print("  recompute:", cnt_r["score_entries"], " cached:", cnt_c["score_entries"])

T = cache[0][0].shape[0]
actual = sum(K.nbytes + V.nbytes for K, V in cache)
print("cache length after generation:", T, "positions")
print("cache bytes, float64 arrays:", actual, "== 2*L*T*H*DH*8 ->", 2 * L * T * H * DH * 8 == actual)
print("bytes per cached position: float64", 2 * L * H * DH * 8, " fp16", 2 * L * H * DH * 2)

print("generated N | recompute passes | cached passes | recompute scores | cached scores")
for n in [4, 8, 16, 32, 64]:
    _, _, a = run_recompute(PROMPT, n)
    _, _, b, _ = run_cached(PROMPT, n)
    print(f"{n:>11} | {a['token_passes']:>16} | {b['token_passes']:>13} | {a['score_entries']:>16} | {b['score_entries']:>13}")

def kv_bytes_per_token(layers, kv_heads, head_dim, bytes_per=2):
    return 2 * layers * kv_heads * head_dim * bytes_per
print("hypothetical 32-layer, head size 128, fp16, 4096-token sequence:")
for name, kvh in [("32 KV heads", 32), ("8 KV heads", 8), ("1 KV head", 1)]:
    per = kv_bytes_per_token(32, kvh, 128)
    print(f"  {name}: {per} bytes per token, {per * 4096 / 2**30:.4f} GiB")

s = np.array([0.0, 1.0, 2.0]) * 1.0 / math.sqrt(1)
w = softmax(s)
print("worked example scores:", s.tolist())
print("worked example weights:", " ".join(f"{x:.3f}" for x in w))
print("worked example output: %.3f" % float(w @ np.array([1.0, 2.0, 3.0])))

def run_cached_bad_positions(prompt, n_new):
    cache = empty_cache()
    toks = list(prompt)
    out = forward(np.array(toks), 0, cache)
    toks.append(int(out[-1].argmax()))
    for _ in range(n_new - 1):
        out = forward(np.array([toks[-1]]), 0, cache)     # BUG: position restarts at 0
        toks.append(int(out[0].argmax()))
    return toks

bad = run_cached_bad_positions(PROMPT, N_NEW)
print("bug, positions restart at 0, generated:", bad[len(PROMPT):])
print("bug output equals correct output:", bad == toks_r)

# --- export for diagrams (not part of the lesson listing) ---
import json, os
here = os.path.dirname(os.path.abspath(__file__))
steps_r = [list(range(len(PROMPT) + s)) for s in range(N_NEW)]
steps_c = [list(range(len(PROMPT)))] + [[len(PROMPT) + s] for s in range(N_NEW - 1)]
table = []
for n in [4, 8, 16, 32, 64]:
    _, _, a = run_recompute(PROMPT, n)
    _, _, b, _ = run_cached(PROMPT, n)
    table.append({"n": n, "rec_passes": a["token_passes"], "cache_passes": b["token_passes"],
                  "rec_scores": a["score_entries"], "cache_scores": b["score_entries"]})
data = {"prompt": PROMPT, "generated": toks_r[len(PROMPT):], "steps_recompute": steps_r,
        "steps_cached": steps_c, "table": table, "cache_T": int(T),
        "cache_bytes": int(actual), "max_diff_ok": bool(max_diff < 1e-9),
        "bad_generated": bad[len(PROMPT):], "worked_scores": s.tolist(),
        "worked_weights": [float(x) for x in w], "worked_output": float(w @ np.array([1.0, 2.0, 3.0]))}
data["kv"] = [{"name": n, "kv_heads": k, "bytes_per_token": kv_bytes_per_token(32, k, 128), "gib_4096": kv_bytes_per_token(32, k, 128) * 4096 / 2**30} for n, k in [("32 KV heads", 32), ("8 KV heads", 8), ("1 KV head", 1)]]
json.dump(data, open(os.path.join(here, "27.2_data.json"), "w"), indent=1)
