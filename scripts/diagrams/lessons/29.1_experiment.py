"""Experiment for lesson 29.1: every number used in the lesson and its diagrams.

Run:  python3 scripts/diagrams/lessons/29.1_experiment.py
Writes scripts/diagrams/lessons/29.1_data.json and prints the numbers.
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
GiB = 2**30
out = {}

# ---- 1. Footprint formula: bytes = 2 * L * H_kv * d * T * b * batch -------------
def kv_bytes(L, H_kv, d, T, b, batch=1):
    return 2 * L * H_kv * d * T * b * batch

# Toy worked example (fp16, b = 2)
toy = dict(L=2, H_kv=2, d=4, T=3, b=2)
out["toy_per_token"] = 2 * toy["L"] * toy["H_kv"] * toy["d"] * toy["b"]
out["toy_elements"] = 2 * toy["L"] * toy["H_kv"] * toy["d"] * toy["T"]
out["toy_bytes"] = kv_bytes(**toy)
assert out["toy_bytes"] == out["toy_per_token"] * toy["T"]

# Illustrative 7B-class config (MHA: H_kv = H = 32). Not a claim about a named model.
L, H, d, b = 32, 32, 128, 2
out["mha_per_token_bytes"] = kv_bytes(L, H, d, 1, b)
out["mha_per_token_KiB"] = out["mha_per_token_bytes"] / 1024
out["mha_seq4096_GiB"] = kv_bytes(L, H, d, 4096, b) / GiB
out["gqa8_seq4096_GiB"] = kv_bytes(L, 8, d, 4096, b) / GiB
out["gqa8_per_token_KiB"] = kv_bytes(L, 8, d, 1, b) / 1024

# Weights: 6.7e9 parameters in fp16 (illustrative size)
P = 6.7e9
W_bytes = P * b
out["weights_GiB"] = W_bytes / GiB

# Batch 32, 4k context on an 80 GB card (decimal GB)
card_GiB = 80e9 / GiB
out["card_80GB_in_GiB"] = card_GiB
out["batch32_kv_GiB"] = 32 * out["mha_seq4096_GiB"]
out["batch32_total_GiB"] = out["batch32_kv_GiB"] + out["weights_GiB"]

# Context sweep for the chart
Ts = [512, 1024, 2048, 4096, 8192, 16384, 32768]
out["sweep_T"] = Ts
out["sweep_mha_GiB"] = [kv_bytes(L, H, d, T, b) / GiB for T in Ts]
out["sweep_gqa8_GiB"] = [kv_bytes(L, 8, d, T, b) / GiB for T in Ts]

# ---- 2. Bandwidth bound: bytes read per decode step ------------------------------
BW = 2039e9        # A100 80GB SXM memory bandwidth, bytes/s (NVIDIA spec page)
FLOPS = 312e12     # A100 FP16 tensor core, dense, FLOP/s (NVIDIA spec page)
out["BW_GBps"] = BW / 1e9
out["ridge_flop_per_byte"] = FLOPS / BW

T = 4096
rows = []
for B in [1, 8, 32]:
    step_bytes = W_bytes + B * kv_bytes(L, H, d, T, b)   # weights read once, KV read per sequence
    t = step_bytes / BW
    rows.append(dict(batch=B, step_GB=step_bytes / 1e9,
                     kv_share=(step_bytes - W_bytes) / step_bytes,
                     step_ms=t * 1e3, tok_per_s=B / t))
out["decode_rows_T4096_MHA"] = rows

# Ceiling as batch grows: weights amortise, KV does not
seq_kv = kv_bytes(L, H, d, T, b)
out["ceiling_MHA_T4096_tok_s"] = BW / seq_kv
out["ceiling_GQA8_T4096_tok_s"] = BW / kv_bytes(L, 8, d, T, b)
out["ceiling_MHA_T512_tok_s"] = BW / kv_bytes(L, H, d, 512, b)

# Arithmetic intensity of the attention read (per layer, one decode token, one sequence)
#   FLOPs: QK^T and AV each cost 2*H*d*T  -> 4*H*d*T
#   bytes: K and V, each H_kv*d*T elements of b bytes -> 2*H_kv*d*T*b
def attn_intensity(H_q, H_kv):
    flops = 4 * H_q * d * T
    bytes_ = 2 * H_kv * d * T * b
    return flops / bytes_
out["intensity_attn_MHA"] = attn_intensity(32, 32)
out["intensity_attn_GQA8"] = attn_intensity(32, 8)

# Weights during decode: 2P FLOPs per token, 2P bytes read once per step, shared by B tokens
out["intensity_weights_B"] = {str(B): (2 * P * B) / W_bytes for B in [1, 8, 32, 153]}

# ---- 3. Naive concatenation vs preallocation (copy traffic) -----------------------
per_tok = out["mha_per_token_bytes"]
Tn = 4096
out["concat_copied_TiB"] = per_tok * Tn * (Tn - 1) / 2 / 2**40
out["prealloc_written_GiB"] = per_tok * Tn / GiB

# Toy check of the copy count with real NumPy arrays
def naive_copy_count(T, per_token):
    copied, cache = 0, np.zeros((0,), dtype=np.uint8)
    for _ in range(T):
        new = np.zeros((per_token,), dtype=np.uint8)
        copied += cache.nbytes                    # concatenate copies the whole old cache
        cache = np.concatenate([cache, new])
    return copied
out["toy_concat_copied_T8_per8"] = naive_copy_count(8, 8)
out["toy_formula_T8_per8"] = 8 * (8 * 7) // 2

path = os.path.join(HERE, "29.1_data.json")
with open(path, "w") as f:
    json.dump(out, f, indent=1)

for k, v in out.items():
    print(k, "=", v)
