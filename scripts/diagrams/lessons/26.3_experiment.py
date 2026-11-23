# Experiment for lesson 26.3 (FFN: standard MLP, GELU, SwiGLU).
# Writes scripts/diagrams/lessons/26.3_data.json (read by 26.3.mjs) and prints every number the lesson uses.
# Run: python3 scripts/diagrams/lessons/26.3_experiment.py
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
erf = np.vectorize(math.erf)

def relu(x): return np.maximum(0.0, x)
def gelu(x): return 0.5 * x * (1.0 + erf(x / math.sqrt(2.0)))
def gelu_tanh(x):
    c = math.sqrt(2.0 / math.pi)
    return 0.5 * x * (1.0 + np.tanh(c * (x + 0.044715 * x**3)))
def silu(x): return x / (1.0 + np.exp(-x))

np.set_printoptions(precision=4, suppress=True)
out = {}

# 1. Activation curves for the figure
xs = np.round(np.arange(-3.0, 3.0001, 0.05), 4)
out["curves"] = {"x": xs.tolist(), "relu": relu(xs).tolist(), "gelu": gelu(xs).tolist(), "silu": silu(xs).tolist()}
print("grid points:", len(xs))
probe = np.array([-2.0, -1.0, -0.5, 0.0, 0.5, 1.0, 2.0])
print("probe x     :", probe)
print("relu        :", relu(probe))
print("gelu exact  :", gelu(probe))
print("gelu tanh   :", gelu_tanh(probe))
print("silu        :", silu(probe))
print("max |exact - tanh| on probe:", float(np.max(np.abs(gelu(probe) - gelu_tanh(probe)))))

fine = np.linspace(-4, 4, 80001)
g = gelu(fine)
i = int(np.argmin(g))
out["gelu_min"] = {"x": float(fine[i]), "y": float(g[i])}
print("GELU minimum: x* =", round(float(fine[i]), 4), " GELU(x*) =", round(float(g[i]), 4))

# 2. Worked example: d_model = 2, d_ff = 3, no biases
x = np.array([1.0, 2.0])
W_up = np.array([[2.0, 0.0, 1.0], [0.0, 1.0, 1.0]])
W_gate = np.array([[1.0, 0.0, -1.0], [0.0, 0.0, 0.0]])
W_down = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, -1.0]])
up = x @ W_up
gate = x @ W_gate
s = silu(gate)
h_sw = up * s
y_sw = h_sw @ W_down
h_re = relu(up); y_re = h_re @ W_down
h_ge = gelu(up); y_ge = h_ge @ W_down
print("up", up, "gate", gate, "silu(gate)", s)
print("swiglu hidden", h_sw, "out", y_sw)
print("relu hidden", h_re, "out", y_re)
print("gelu hidden", h_ge, "out", y_ge)
out["example"] = {"x": x.tolist(), "up": up.tolist(), "gate": gate.tolist(), "silu_gate": s.tolist(),
                  "h_swiglu": h_sw.tolist(), "y_swiglu": y_sw.tolist(), "y_relu": y_re.tolist(), "y_gelu": y_ge.tolist()}

# 3. Parameter accounting (biases ignored, as in Shazeer 2020)
rows = []
for d in (512, 4096):
    attn = 4 * d * d                       # Q, K, V, O projections
    std = 2 * d * (4 * d)                  # two matrices, d_ff = 4d
    swi = 3 * d * (4 * d)                  # three matrices, d_ff = 4d
    dff_match = 8 * d / 3                  # three matrices, d_ff = 8d/3
    dff_round = int(round(dff_match))
    swi_match = 3 * d * dff_round
    up256 = int(math.ceil(dff_match / 256) * 256)
    rows.append(dict(d=d, attn=attn, std=std, swi=swi, swi_ratio=swi / std, dff_match=dff_match,
                     dff_round=dff_round, swi_match=swi_match, match_ratio=swi_match / std,
                     ffn_share=std / (std + attn), up256=up256))
    print(f"d={d}: attn={attn:,} std_ffn={std:,} swiglu_4d={swi:,} ratio={swi/std:.3f}"
          f" dff_8d/3={dff_match:.2f} dff_round={dff_round} swiglu_match={swi_match:,} ratio={swi_match/std:.5f}"
          f" ffn_share={std/(std+attn):.4f} round_up_256={up256}")
out["params"] = rows

with open(os.path.join(HERE, "26.3_data.json"), "w") as f:
    json.dump(out, f)
print("wrote 26.3_data.json")
