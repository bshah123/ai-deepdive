# Experiment for Lesson 21.2 (activation functions). Run once; writes 21.2_data.json next to this file.
# Every number used in the lesson text and diagrams comes from this run.
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
erf = np.vectorize(math.erf)
out = {}

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))

def relu(x):
    return np.maximum(0.0, x)

def gelu(x):
    return x * 0.5 * (1.0 + erf(x / np.sqrt(2.0)))

def gelu_tanh(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2.0 / np.pi) * (x + 0.044715 * x**3)))

def silu(x):
    return x * sigmoid(x)

def d_sigmoid(x):
    s = sigmoid(x)
    return s * (1 - s)

def d_tanh(x):
    return 1 - np.tanh(x) ** 2

def d_gelu(x):
    phi = np.exp(-x**2 / 2) / np.sqrt(2 * np.pi)
    return 0.5 * (1 + erf(x / np.sqrt(2))) + x * phi

def d_silu(x):
    s = sigmoid(x)
    return s + x * s * (1 - s)

# 1. Values on a small grid (curves for diagram 1, worked example)
xc = np.round(np.linspace(-3, 3, 61), 6)
out["curves"] = {"x": xc.tolist(), "relu": relu(xc).round(6).tolist(),
                 "gelu": gelu(xc).round(6).tolist(), "silu": silu(xc).round(6).tolist()}
xw = np.array([-1.0, 1.0, 2.0])
out["worked"] = {"x": xw.tolist(), "relu": relu(xw).tolist(), "gelu": gelu(xw).tolist(),
                 "silu": silu(xw).tolist(), "d_gelu": d_gelu(xw).tolist(), "d_silu": d_silu(xw).tolist()}
out["gelu_tanh_max_abs_err"] = float(np.max(np.abs(gelu(np.linspace(-6, 6, 12001)) - gelu_tanh(np.linspace(-6, 6, 12001)))))

# 2. Maximum derivative on a fine grid
xg = np.linspace(-6, 6, 12001)
maxima = {}
for name, d in [("sigmoid", d_sigmoid), ("tanh", d_tanh), ("GELU", d_gelu), ("SiLU", d_silu)]:
    v = d(xg)
    i = int(np.argmax(v))
    maxima[name] = {"value": float(v[i]), "at": float(xg[i])}
out["max_derivative"] = maxima

# 3. Gradient norm ratio (first hidden layer / output layer) versus depth
ACT = {
    "sigmoid": (sigmoid, d_sigmoid),
    "tanh": (np.tanh, d_tanh),
    "ReLU": (relu, lambda z: (z > 0).astype(float)),
    "GELU": (gelu, d_gelu),
}

def grad_ratio(depth, act, init, seed=0, width=64, batch=256):
    f, df = ACT[act]
    rng = np.random.default_rng(seed)
    X = rng.standard_normal((batch, width))
    Y = rng.standard_normal((batch, width))
    gain = 2.0 if init == "he" else 1.0          # He: Var(W)=2/n; Xavier-style: Var(W)=1/n
    Ws = [rng.standard_normal((width, width)) * np.sqrt(gain / width) for _ in range(depth)]
    Wo = rng.standard_normal((width, width)) * np.sqrt(1.0 / width)
    hs, zs, h = [X], [], X
    for W in Ws:
        z = h @ W
        zs.append(z)
        h = f(z)
        hs.append(h)
    pred = h @ Wo
    g = (pred - Y) / batch                       # dL/dpred for L = 0.5 * mean over batch of ||pred - Y||^2 (summed over outputs)
    g_out = hs[-1].T @ g
    g = g @ Wo.T
    g_first = None
    for l in reversed(range(depth)):
        gz = g * df(zs[l])
        gW = hs[l].T @ gz
        if l == 0:
            g_first = gW
        g = gz @ Ws[l].T
    return float(np.linalg.norm(g_first) / np.linalg.norm(g_out))

configs = [("sigmoid", "xavier"), ("tanh", "xavier"), ("sigmoid", "he"), ("ReLU", "he"), ("GELU", "he")]
depths = [1, 2, 4, 8, 16, 32]
out["depths"] = depths
out["grad_ratio"] = {f"{a}/{i}": [grad_ratio(d, a, i) for d in depths] for a, i in configs}

# 3b. Seed spread at depth 32 (five seeds) so the depth trend is not one lucky draw
out["seed_spread_depth32"] = {f"{a}/{i}": [grad_ratio(32, a, i, seed=s) for s in range(5)] for a, i in configs}

# 4. SwiGLU on one token (2 features -> 3 hidden -> 2 outputs)
x = np.array([[1.0, 0.0]])
W = np.array([[0.5, 0.2, -0.3], [0.1, -0.4, 0.8]])
V = np.array([[2.0, -1.0, 0.5], [0.3, 0.7, -0.2]])
W2 = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, -1.0]])
gate = silu(x @ W)
value = x @ V
hidden = gate * value
y = hidden @ W2
out["swiglu"] = {"xW": (x @ W).round(6).tolist(), "gate": gate.round(6).tolist(),
                 "xV": value.round(6).tolist(), "hidden": hidden.round(6).tolist(), "out": y.round(6).tolist()}

with open(os.path.join(HERE, "21.2_data.json"), "w") as fh:
    json.dump(out, fh, indent=1)
print(json.dumps({k: out[k] for k in ["max_derivative", "gelu_tanh_max_abs_err", "worked", "swiglu"]}, indent=1))
for k, v in out["grad_ratio"].items():
    print(f"{k:16s}", " ".join(f"{r:.3e}" for r in v))
