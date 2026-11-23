# Experiment for lesson 32.1 (quantization foundations).
# Run: <python> scripts/diagrams/lessons/32.1_experiment.py
# Writes every number used in the lesson and its diagrams to 32.1_data.json.
# NumPy only. Synthetic data throughout; no model weights are downloaded.
import json, sys
import numpy as np

out = {"python": sys.version.split()[0], "numpy": np.__version__}

# ---------------------------------------------------------------- helpers
def to_bf16(x):
    """Round float32 to bfloat16 (1 sign, 8 exponent, 7 mantissa bits),
    round-to-nearest-even on the low 16 bits. Returns float32 values."""
    x = np.atleast_1d(np.asarray(x, dtype=np.float32))
    u = x.view(np.uint32).astype(np.uint64)
    lsb = (u >> 16) & 1
    u = ((u + 0x7FFF + lsb) >> 16) << 16
    return (u & 0xFFFFFFFF).astype(np.uint32).view(np.float32)

def fq_asym(x, bits, axis):
    """Asymmetric (affine) fake-quantization: unsigned codes 0..2^bits-1.
    The range is widened to include 0, so zero is exactly representable.
    Returns dequantized values, integer codes, scale and zero-point."""
    mn = np.minimum(x.min(axis=axis, keepdims=True), 0.0)
    mx = np.maximum(x.max(axis=axis, keepdims=True), 0.0)
    qmax = 2 ** bits - 1
    s = (mx - mn) / qmax
    s = np.where(s == 0, 1.0, s)
    z = np.clip(np.round(-mn / s), 0, qmax)
    q = np.clip(np.round(x / s) + z, 0, qmax)
    return s * (q - z), q.astype(np.int64), s, z

def rel_err(a, b):
    return float(np.linalg.norm(a - b) / np.linalg.norm(a))

# ---------------------------------------------------------------- A. number formats
fp16 = np.finfo(np.float16)
fp32 = np.finfo(np.float32)
out["fp16"] = {"max": float(fp16.max), "eps": float(fp16.eps),
               "smallest_normal": float(fp16.tiny), "exp_bits": 5, "mant_bits": 10}
out["fp32"] = {"max": float(fp32.max), "eps": float(fp32.eps),
               "smallest_normal": float(fp32.tiny), "exp_bits": 8, "mant_bits": 23}
# bfloat16: same exponent width as fp32, 7 stored mantissa bits.
bf16_max = (2.0 - 2.0 ** -7) * 2.0 ** 127          # largest finite bf16, derived
out["bf16"] = {"max": bf16_max, "eps": 2.0 ** -7,
               "smallest_normal": 2.0 ** -126, "exp_bits": 8, "mant_bits": 7}
out["bf16_max_check_bits_hex"] = hex(int(to_bf16(np.float32(bf16_max)).view(np.uint32)[0]))

pi = 3.14159
out["pi_in_fp16"] = float(np.float16(pi))
out["pi_in_bf16"] = float(to_bf16(pi)[0])
out["pi_in_fp32"] = float(np.float32(pi))
out["one_plus_2e-8_in_bf16"] = float(to_bf16(1.0 + 2.0 ** -8)[0])   # tie, rounds to even
out["one_plus_0p005_in_fp16"] = float(np.float16(1.005))
out["one_plus_0p005_in_bf16"] = float(to_bf16(1.005)[0])
_f16 = float(np.float16(70000.0))                                     # overflows to inf
out["70000_in_fp16"] = "inf" if np.isinf(_f16) else _f16
out["70000_in_bf16"] = float(to_bf16(70000.0)[0])

# ---------------------------------------------------------------- B. worked 4-bit example
x = np.array([-1.5, -0.2, 0.0, 0.7, 2.3])
deq, q, s, z = fq_asym(x, 4, axis=None)
out["worked"] = {
    "x": x.tolist(),
    "min": float(min(x.min(), 0.0)), "max": float(max(x.max(), 0.0)),
    "scale": float(s.ravel()[0]), "zero_point": int(z.ravel()[0]),
    "codes": q.tolist(), "dequant": [float(v) for v in deq],
    "abs_err": [float(v) for v in np.abs(x - deq)],
    "half_step_bound": float(s.ravel()[0] / 2),
    "zero_roundtrip": float(deq[2]),
}

# ---------------------------------------------------------------- C. error model check
rng = np.random.default_rng(0)
g = rng.standard_normal(100_000)
chk = {}
for bits in (8, 4):
    d, q, s, z = fq_asym(g, bits, axis=None)
    e = g - d
    step = float(s.ravel()[0])
    chk[str(bits)] = {
        "step": step,
        "max_abs_err": float(np.abs(e).max()),
        "half_step_bound": step / 2,
        "mse_measured": float(np.mean(e ** 2)),
        "mse_predicted_step2_over_12": step ** 2 / 12,
        "levels_used": int(np.unique(q).size),
    }
out["error_model_gaussian"] = chk

# ---------------------------------------------------------------- D. one outlier steals the grid
rng = np.random.default_rng(2)
feat = rng.standard_normal(4096)
with_out = feat.copy(); with_out[0] = 60.0
bulk = slice(1, None)
res = {}
for name, v in (("no_outlier", feat), ("one_outlier_60", with_out)):
    d, q, s, z = fq_asym(v, 8, axis=None)
    res[name] = {
        "step": float(s.ravel()[0]),
        "bulk_rel_err": rel_err(v[bulk], d[bulk]),
        "bulk_levels_used": int(np.unique(q[bulk]).size),
    }
out["outlier"] = res
# symmetric version (used later for the integer matmul)
qmax8 = 127
out["outlier"]["symmetric_step_with_outlier"] = float(np.abs(with_out).max() / qmax8)

# ---------------------------------------------------------------- E. granularity on a weight matrix
R, C = 256, 512
rng = np.random.default_rng(1)
W = rng.standard_normal((R, C)) * 0.02
rows = rng.choice(R, size=6, replace=False)
W[rows] *= 30.0                         # 6 of 256 rows are 30x larger (synthetic outliers)
X = rng.standard_normal((C, 64))        # 64 random input vectors
Y = W @ X

def quant_granular(W, bits, how):
    if how == "per-tensor":
        d, *_ = fq_asym(W, bits, axis=None)
    elif how == "per-channel":          # one scale per output row
        d, *_ = fq_asym(W, bits, axis=1)
    elif how == "per-group-128":        # one scale per 128 input weights in a row
        G = W.reshape(R, C // 128, 128)
        d, *_ = fq_asym(G, bits, axis=2)
        d = d.reshape(R, C)
    return d

gran = {}
for bits in (8, 4):
    gran[str(bits)] = {}
    for how in ("per-tensor", "per-channel", "per-group-128"):
        Wd = quant_granular(W, bits, how)
        gran[str(bits)][how] = {
            "weight_rel_err": rel_err(W, Wd),
            "output_rel_err": rel_err(Y, Wd @ X),
        }
out["granularity"] = gran
out["granularity_setup"] = {"rows": R, "cols": C, "outlier_rows": 6, "outlier_factor": 30,
                            "base_std": 0.02, "n_inputs": 64}

# ---------------------------------------------------------------- F. integer matmul is exact
Wq_scale = np.abs(W).max(axis=1, keepdims=True) / 127        # per-row symmetric int8
Wq = np.clip(np.round(W / Wq_scale), -127, 127).astype(np.int32)
xs = np.abs(X).max() / 127                                    # per-tensor symmetric int8
Xq = np.clip(np.round(X / xs), -127, 127).astype(np.int32)
acc = Wq @ Xq                                                  # int32 accumulation
y_int = acc * Wq_scale * xs                                    # rescale once at the end
y_deq = (Wq * Wq_scale) @ (Xq * xs)                            # float path on dequantized values
out["int_matmul"] = {
    "acc_max_abs": int(np.abs(acc).max()),
    "acc_fits_int32": bool(np.abs(acc).max() < 2 ** 31),
    "max_diff_int_vs_dequant_float": float(np.abs(y_int - y_deq).max()),
    "output_rel_err_vs_fp": rel_err(Y, y_int),
}

# ---------------------------------------------------------------- G. bits and memory
N = 7_000_000_000
scale_overhead = (16 + 4) / 128       # fp16 scale + 4-bit zero-point shared by 128 weights
bpw = {"fp16": 16.0, "int8": 8.0, "int4": 4.0, "int4_group128": 4.0 + scale_overhead}
out["bits_per_weight"] = bpw
out["gb_7b_model"] = {k: N * v / 8 / 1e9 for k, v in bpw.items()}

with open(__file__.replace("32.1_experiment.py", "32.1_data.json"), "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2))
