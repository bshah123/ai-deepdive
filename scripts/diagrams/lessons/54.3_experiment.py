"""Experiment script for lesson 54.3 (Ollama, local inference, edge deployment).

Produces every number used in the lesson and the diagrams. Run once:
    python3 scripts/diagrams/lessons/54.3_experiment.py
Writes scripts/diagrams/lessons/54.3_data.json.
Standard library + NumPy only.
"""
import json
import os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
out = {}

# ---- 1. Weight memory for an 8.03B-parameter model at llama.cpp bits-per-weight ----
# bits-per-weight (bpw) values as printed in llama.cpp tools/quantize/README.md
# for Llama-3.1-8B (fetched 2026-11-23).
PARAMS = 8.03e9
BPW = {"F16": 16.0005, "Q8_0": 8.5008, "Q4_K_M": 4.8944}
GIB = 2 ** 30
mem = {}
for name, bpw in BPW.items():
    b = PARAMS * bpw / 8
    mem[name] = {"bytes": b, "GB": b / 1e9, "GiB": b / GIB}
out["weights"] = mem
# consistency check against the table's printed sizes (14.96, 7.95, 4.58 GiB)
out["weights_GiB_check"] = {k: round(v["GiB"], 2) for k, v in mem.items()}

# ---- 2. Worked quantization example: symmetric int4 (codes -8..7), 4 weights ----
w = np.array([0.12, -0.50, 0.33, 0.90])
scale = np.abs(w).max() / 7.0
codes = np.clip(np.round(w / scale), -8, 7).astype(int)
deq = codes * scale
out["toy"] = {
    "w": w.tolist(), "scale": float(scale), "codes": codes.tolist(),
    "deq": [round(float(x), 4) for x in deq],
    "err": [round(float(x), 4) for x in (deq - w)],
}

# ---- 3. Reconstruction error on random weights, symmetric per-group quantization ----
rng = np.random.default_rng(0)
W = rng.standard_normal(4096 * 8)  # 32768 Gaussian weights

def quant_dequant(x, bits, group):
    qmax = 2 ** (bits - 1) - 1
    g = x.reshape(-1, group)
    s = np.abs(g).max(axis=1, keepdims=True) / qmax
    q = np.clip(np.round(g / s), -qmax - 1, qmax)
    return (q * s).reshape(-1)

err = {}
for bits in (8, 4):
    for group in (32, 128, 4096):
        d = quant_dequant(W, bits, group)
        rel = np.linalg.norm(d - W) / np.linalg.norm(W)
        err[f"int{bits}_g{group}"] = float(rel)
out["rel_error"] = err

# storage cost per weight incl. one fp16 scale per group (illustrative accounting)
out["bits_per_weight_incl_scale"] = {
    f"int{b}_g{g}": b + 16 / g for b in (8, 4) for g in (32, 128)
}

# ---- 4. KV cache size (fp16 cache), illustrative architecture ----
LAYERS, KV_HEADS, HEAD_DIM, BYTES = 32, 8, 128, 2
per_tok = 2 * LAYERS * KV_HEADS * HEAD_DIM * BYTES  # keys + values
out["kv_per_token_bytes"] = per_tok
out["kv_GiB"] = {str(ctx): per_tok * ctx / GIB for ctx in (2048, 8192, 32768)}

# ---- 5. Decode upper bound: batch 1, each new token reads all weights once ----
BW = 100e9  # assumed memory bandwidth, bytes/s (illustrative, not measured)
ub = {}
for name in BPW:
    bytes_per_tok = mem[name]["bytes"] + per_tok * 8192 * 0  # weights only
    ub[name] = BW / bytes_per_tok
out["decode_upper_bound_tok_s"] = ub
out["assumed_bandwidth_GBps"] = BW / 1e9

with open(os.path.join(HERE, "54.3_data.json"), "w") as f:
    json.dump(out, f, indent=2)

np.set_printoptions(precision=4, suppress=True)
print("weights (GiB):", out["weights_GiB_check"])
print("weights (GB) :", {k: round(v["GB"], 3) for k, v in mem.items()})
print("toy w        :", w)
print("toy scale    :", round(float(scale), 6))
print("toy codes    :", codes)
print("toy deq      :", out["toy"]["deq"])
print("toy err      :", out["toy"]["err"])
print("rel error    :", {k: round(v, 4) for k, v in err.items()})
print("bpw incl scale:", {k: round(v, 3) for k, v in out["bits_per_weight_incl_scale"].items()})
print("KV bytes/token:", per_tok, "(", per_tok // 1024, "KiB )")
print("KV GiB       :", {k: round(v, 3) for k, v in out["kv_GiB"].items()})
print("decode UB tok/s at", out["assumed_bandwidth_GBps"], "GB/s:", {k: round(v, 2) for k, v in ub.items()})
