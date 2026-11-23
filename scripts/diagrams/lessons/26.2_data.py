# Experiment for lesson 26.2 (LayerNorm, RMSNorm, Pre-LN vs Post-LN). NumPy only.
# Every number quoted in 26.2.mjs and in the lesson text comes from running this file.
import numpy as np
np.set_printoptions(precision=4, suppress=True)
EPS = 1e-5

def layernorm(x, eps=0.0):
    mu = x.mean(-1, keepdims=True)
    var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def rmsnorm(x, eps=0.0):
    ms = (x ** 2).mean(-1, keepdims=True)
    return x / np.sqrt(ms + eps)

# ---- A. worked example, d = 4
x = np.array([1.0, 2.0, 3.0, 6.0])
mu = x.mean(); c = x - mu; var = (c ** 2).mean(); s = np.sqrt(var)
ln = c / s
ms = (x ** 2).mean(); rms = np.sqrt(ms); rn = x / rms
print("A mean", mu, "centred", c, "var", var, "std", s)
print("A LN", ln, "sum", ln.sum(), "var(out)", (ln ** 2).mean())
print("A meansq", ms, "rms", rms, "RMSNorm", rn, "rms(out)", np.sqrt((rn ** 2).mean()))
print("A LN with eps=1e-5", layernorm(x, EPS))

# ---- B. when do LN and RMSNorm agree?
rng = np.random.default_rng(1)
z = rng.normal(size=8); z = z - z.mean()          # zero-mean vector
print("B zero-mean: max|LN-RMS|", np.abs(layernorm(z) - rmsnorm(z)).max())
w = rng.normal(size=8) + 5.0                       # offset by +5
print("B offset +5: max|LN-RMS|", np.abs(layernorm(w) - rmsnorm(w)).max(), "mean(RMSNorm out)", rmsnorm(w).mean())
print("B LN(x)=LN(x+c) check", np.abs(layernorm(w) - layernorm(w + 100)).max(), " RMS(x+100) differs:", np.abs(rmsnorm(w) - rmsnorm(w + 100)).max())

# ---- C. Pre-LN vs Post-LN block stacks (FFN sublayer only, random init, d=64, d_ff=256)
def relu(a): return np.maximum(a, 0.0)

def ln_back(g, u, s):
    # gradient of y = (x - mean) / s w.r.t. x, given g = dL/dy, u = y, s = std (per row)
    return (g - g.mean(-1, keepdims=True) - u * (g * u).mean(-1, keepdims=True)) / s

def init(L, d, dff, rng):
    return [(rng.normal(size=(d, dff)) / np.sqrt(d), rng.normal(size=(dff, d)) / np.sqrt(dff)) for _ in range(L)]

def forward(X, Ws, mode):
    cache, x = [], X
    for W1, W2 in Ws:
        if mode == "pre":
            s = np.sqrt(((x - x.mean(-1, keepdims=True)) ** 2).mean(-1, keepdims=True) + EPS)
            u = (x - x.mean(-1, keepdims=True)) / s
            a = u @ W1; r = relu(a); y = x + r @ W2
            cache.append(dict(x=x, u=u, s=s, a=a))
        else:  # post
            a = x @ W1; r = relu(a); z = x + r @ W2
            s = np.sqrt(((z - z.mean(-1, keepdims=True)) ** 2).mean(-1, keepdims=True) + EPS)
            y = (z - z.mean(-1, keepdims=True)) / s
            cache.append(dict(x=x, u=y, s=s, a=a, z=z))
        x = y
    return x, cache

def backward(C, Ws, cache, mode):
    g = C.copy(); grads = [None] * len(Ws); dW2s = [None] * len(Ws)
    for i in range(len(Ws) - 1, -1, -1):
        W1, W2 = Ws[i]; c = cache[i]; r = relu(c["a"])
        if mode == "pre":
            dW2s[i] = r.T @ g                          # dL/dW2 for y = x + relu(LN(x) W1) W2
            dr = g @ W2.T; da = dr * (c["a"] > 0)
            du = da @ W1.T
            g = g + ln_back(du, c["u"], c["s"])      # identity path + through LN
        else:
            dz = ln_back(g, c["u"], c["s"])         # through LN after the residual add
            dW2s[i] = r.T @ dz
            dr = dz @ W2.T; da = dr * (c["a"] > 0)
            g = dz + da @ W1.T                       # identity path + through FFN
        grads[i] = g
    return grads, dW2s  # grads[i] = dL/d(input of block i); dW2s[i] = dL/dW2 of block i

# finite-difference check of the manual backward (small case)
r2 = np.random.default_rng(7)
Ws = init(3, 8, 16, r2); X = r2.normal(size=(2, 8)); C = r2.normal(size=(2, 8))
for mode in ("pre", "post"):
    y, cache = forward(X, Ws, mode); grads, _ = backward(C, Ws, cache, mode)
    eps = 1e-6; worst = 0.0
    for idx in [(0, 0), (1, 3), (1, 7)]:
        Xp = X.copy(); Xp[idx] += eps; Xm = X.copy(); Xm[idx] -= eps
        fd = ((forward(Xp, Ws, mode)[0] - forward(Xm, Ws, mode)[0]) * C).sum() / (2 * eps)
        worst = max(worst, abs(fd - grads[0][idx]) / max(1e-8, abs(fd)))
    print("C gradcheck", mode, "max rel err", f"{worst:.2e}")

# depth experiment: L = 24 blocks, 8 tokens, d = 64
L, d, dff, n = 24, 64, 256, 8
def per_layer_stats(seed):
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(n, d)); Ws = init(L, d, dff, rng); C = rng.normal(size=(n, d))
    out = {}
    for mode in ("pre", "post"):
        y, cache = forward(X, Ws, mode)
        grads, dW2s = backward(C, Ws, cache, mode)
        out.setdefault("pw", {})[mode] = np.array([np.linalg.norm(w) for w in dW2s])
        rms = [np.sqrt((c["x"] ** 2).mean(-1)).mean() for c in cache] + [np.sqrt((y ** 2).mean(-1)).mean()]
        gn = [np.linalg.norm(g) / np.sqrt(n) for g in grads]
        out[mode] = (np.array(rms), np.array(gn))
    return out

main = per_layer_stats(0)
sel = [0, 1, 2, 4, 8, 12, 16, 20, 23]
print("C1 layer  rms_pre  rms_post   gradnorm_pre  gradnorm_post")
for l in sel:
    print(f"C1 {l:3d} {main['pre'][0][l]:9.3f} {main['post'][0][l]:9.3f} {main['pre'][1][l]:13.4f} {main['post'][1][l]:13.4f}")
print("C1 output rms (after last block)", main["pre"][0][L], main["post"][0][L])
print("C2 grad ratio layer0/layer23 pre, post:", main["pre"][1][0] / main["pre"][1][L-1], main["post"][1][0] / main["post"][1][L-1])
ratios = []
for seed in range(5):
    o = per_layer_stats(seed)
    ratios.append((o["pre"][1][0] / o["pre"][1][L-1], o["post"][1][0] / o["post"][1][L-1], o["pre"][0][L], o["post"][0][L]))
ratios = np.array(ratios)
print("C3 seeds: pre grad ratio min/max", ratios[:, 0].min(), ratios[:, 0].max())
print("C3 seeds: post grad ratio min/max", ratios[:, 1].min(), ratios[:, 1].max())
print("C3 seeds: pre output rms min/max", ratios[:, 2].min(), ratios[:, 2].max(), " post", ratios[:, 3].min(), ratios[:, 3].max())

# ---- E. parameter gradients (dL/dW2 per block) at init, seed 0
pw = per_layer_stats(0)["pw"]
print("E layer  |dW2| pre  |dW2| post")
for l in [0, 4, 8, 12, 16, 20, 23]:
    print(f"E {l:3d} {pw['pre'][l]:10.4f} {pw['post'][l]:10.4f}")
print("E ratio block0/block23 pre, post:", pw["pre"][0] / pw["pre"][-1], pw["post"][0] / pw["post"][-1])

# ---- D. cost: reductions per vector (count of passes over d elements, by inspection)
print("D passes LN: mean, var (2 reductions) + normalise; RMS: 1 reduction + normalise")
