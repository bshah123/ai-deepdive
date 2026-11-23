"""Experiment for lesson 31.2 (QLoRA). Prints every number the lesson uses and writes 31.2_data.json."""
import json, os
from statistics import NormalDist
import numpy as np

np.set_printoptions(precision=4, suppress=True)

# ---- A. NF4 codebook, quantizer, worked example ----
def nf4_levels(delta=1/32):
    """16 NF4 levels in [-1, 1]: 8 positive, 7 negative, one exact zero (paper's construction)."""
    Q = NormalDist().inv_cdf                              # quantile function of N(0, 1)
    pos = np.array([Q(p) for p in np.linspace(0.5, 1 - delta, 9)])[1:]
    neg = np.array([Q(p) for p in np.linspace(delta, 0.5, 8)])[:-1]
    levels = np.concatenate([neg, [0.0], pos])
    return levels / np.abs(levels).max()

def quantize(w, levels, block=64):
    """Absmax block quantization: one scale per block, one 4-bit code per value."""
    b = w.reshape(-1, block)
    scale = np.abs(b).max(axis=1, keepdims=True)
    mid = (levels[1:] + levels[:-1]) / 2                  # decision boundaries between neighbouring levels
    codes = np.searchsorted(mid, b / scale)               # index of the nearest level, 0..15
    return codes, scale

def dequantize(codes, scale, levels):
    return (levels[codes] * scale).reshape(-1)

NF4 = nf4_levels()
UNIFORM = np.arange(-7, 8) / 7
print("NF4 levels:", NF4)
print("count:", NF4.size, " negative:", int((NF4 < 0).sum()), " zero:", int((NF4 == 0).sum()), " positive:", int((NF4 > 0).sum()))
print("uniform levels:", UNIFORM)

w = np.array([0.42, -0.90, 0.05, 0.31])
codes, scale = quantize(w, NF4, block=4)
w_hat = dequantize(codes, scale, NF4)
worked = dict(w=w.tolist(), absmax=float(scale.ravel()[0]), normalised=(w / scale.ravel()[0]).tolist(),
              codes=codes.ravel().tolist(), level=NF4[codes.ravel()].tolist(), dequant=w_hat.tolist(),
              abs_error=np.abs(w - w_hat).tolist())
print("absmax scale:", scale.ravel())
print("normalised  :", w / scale.ravel())
print("codes       :", codes.ravel())
print("levels      :", NF4[codes.ravel()])
print("dequantised :", w_hat)
print("abs error   :", np.abs(w - w_hat))

# ---- B. Error comparison and double quantization ----
def sqnr_db(w, w_hat):
    return 10 * np.log10(np.mean(w ** 2) / np.mean((w - w_hat) ** 2))

rng = np.random.default_rng(31)
N = 2 ** 18
gauss = rng.standard_normal(N)
laplace = rng.laplace(scale=1 / np.sqrt(2), size=N)      # unit variance, heavier tails than a Gaussian
sqnr_rows = []
print(f"{'data':10s}{'block':>7s}{'uniform-4':>12s}{'NF4':>10s}   (SQNR, dB)")
for name, x in [("gaussian", gauss), ("laplace", laplace)]:
    for block in (64, 4096):
        vals = []
        for levels in (UNIFORM, NF4):
            c, s = quantize(x, levels, block)
            vals.append(float(sqnr_db(x, dequantize(c, s, levels))))
        sqnr_rows.append(dict(data=name, block=block, uniform=vals[0], nf4=vals[1]))
        print(f"{name:10s}{block:7d}{vals[0]:12.2f}{vals[1]:10.2f}")

codes_g, s_g = quantize(gauss, NF4, 64)
c1 = s_g.ravel()                                         # first-level absmax scales, one per 64 weights
g = c1.reshape(-1, 256)
mean2 = g.mean(axis=1, keepdims=True)
c2 = g - mean2                                           # centre before the second quantization
s2 = np.abs(c2).max(axis=1, keepdims=True)
c2_q = np.round(c2 / s2 * 127) / 127 * s2                # 8-bit symmetric stand-in for the paper's FP8
c1_dq = (c2_q + mean2).reshape(-1)
w_plain = (NF4[codes_g] * c1[:, None]).reshape(-1)
w_dq = (NF4[codes_g] * c1_dq[:, None]).reshape(-1)
dq = dict(sqnr_plain=float(sqnr_db(gauss, w_plain)), sqnr_dq=float(sqnr_db(gauss, w_dq)))
print(f"SQNR with 32-bit scales: {dq['sqnr_plain']:.4f}  with double quantization: {dq['sqnr_dq']:.4f}")

bits_plain = 4 + 32 / 64
bits_dq = 4 + 8 / 64 + 32 / (64 * 256)
bits = dict(bf16=16.0, plain=bits_plain, dq=bits_dq, saving=bits_plain - bits_dq)
print(f"bits/param: bf16 16, NF4 + 32-bit scales {bits_plain:.4f}, NF4 + double quant {bits_dq:.6f}, saving {bits['saving']:.6f}")

# ---- C. Linear layer: dequantize on the fly, LoRA path, gradient check ----
rng = np.random.default_rng(1)
d_in, d_out, r, alpha, n = 256, 128, 8, 16, 32
scale_lora = alpha / r
W = rng.standard_normal((d_out, d_in)) / np.sqrt(d_in)   # frozen base weight
x = rng.standard_normal((n, d_in))
cW, sW = quantize(W.ravel(), NF4, 64)
W_q = dequantize(cW, sW, NF4).reshape(d_out, d_in)
y_exact = x @ W.T
y_base = x @ W_q.T
rel_err = float(np.linalg.norm(y_base - y_exact) / np.linalg.norm(y_exact))
print("relative output error from quantizing W:", rel_err)

A = rng.standard_normal((r, d_in)) / np.sqrt(d_in)
B = np.zeros((d_out, r))

def forward(x, A, B):
    return x @ W_q.T + scale_lora * (x @ A.T) @ B.T

print("with B = 0, output equals base output:", bool(np.allclose(forward(x, A, B), y_base)))
B = rng.standard_normal((d_out, r)) * 0.05
y = forward(x, A, B)
h = x @ A.T
gB = scale_lora * y.T @ h                                # analytic dL/dB for L = 0.5 * sum(y^2)
gA = scale_lora * (y @ B).T @ x                          # analytic dL/dA

def loss():
    return 0.5 * np.sum(forward(x, A, B) ** 2)

def num_grad(P, eps=1e-6):
    g_ = np.zeros_like(P)
    for idx in np.ndindex(P.shape):
        P[idx] += eps; hi = loss(); P[idx] -= 2 * eps; lo = loss(); P[idx] += eps
        g_[idx] = (hi - lo) / (2 * eps)
    return g_

errB = float(np.abs(gB - num_grad(B)).max() / np.abs(gB).max())
errA = float(np.abs(gA - num_grad(A)).max() / np.abs(gA).max())
print("gradient check, relative max error  dB:", f"{errB:.2e}", " dA:", f"{errA:.2e}")
trainable = A.size + B.size
print("trainable LoRA params:", trainable, " frozen base params:", W.size, f" ratio: {trainable / W.size:.4f}")

# ---- D. Memory arithmetic (decimal GB = 1e9 bytes) ----
P65 = 65e9
mem = dict(bf16=P65 * 16 / 8 / 1e9, plain=P65 * bits_plain / 8 / 1e9, dq=P65 * bits_dq / 8 / 1e9,
           dq_saving=P65 * bits["saving"] / 8 / 1e9)
print(f"65B weights: bf16 {mem['bf16']:.1f} GB, NF4+32-bit scales {mem['plain']:.2f} GB, NF4+DQ {mem['dq']:.2f} GB, DQ saves {mem['dq_saving']:.2f} GB")
dd, rr = 4096, 64
adapter = rr * (dd + dd)
adam_bytes = 2 * 4 * adapter                             # two fp32 Adam states per trainable parameter
base4_bytes = dd * dd * 0.5
adapt = dict(params=adapter, adam_mb=adam_bytes / 1e6, base4_mb=base4_bytes / 1e6)
print(f"4096x4096 projection, r=64: adapter params {adapter}, Adam states {adam_bytes/1e6:.2f} MB, frozen NF4 base {base4_bytes/1e6:.2f} MB")

out = dict(top_sigma=NormalDist().inv_cdf(1 - 1 / 32), levels=NF4.tolist(), uniform=UNIFORM.tolist(), worked=worked, sqnr=sqnr_rows, dq=dq, bits=bits,
           linear=dict(rel_err=rel_err, gradB=errB, gradA=errA, trainable=trainable, base=W.size,
                       ratio=trainable / W.size), mem=mem, adapter=adapt)
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "31.2_data.json"), "w") as f:
    json.dump(out, f, indent=1)
print("wrote 31.2_data.json")
