"""Lesson 54.2 experiment: every number the lesson and its diagrams use.

Three models, all written in NumPy/pure Python (no GPU, no Triton, no TensorRT-LLM):
  A. Kernel fusion: counted bytes moved through memory for an elementwise chain.
  B. Dynamic batching: single-server discrete-event simulation with assumed costs.
  C. KV-cache budget: arithmetic for an assumed 7B-class model on an 80 GB GPU.
"""
import json
import os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = {}

# ---------- A. Fusion: counted memory traffic, and a check that fusion keeps the maths ----------
def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2.0 / np.pi) * (x + 0.044715 * x**3)))

rng = np.random.default_rng(54)
hidden, batch = 4096, 8
x = rng.standard_normal((batch, hidden)).astype(np.float32)
r = rng.standard_normal((batch, hidden)).astype(np.float32)
bias = rng.standard_normal(hidden).astype(np.float32)

def unfused(x, bias, r):
    t1 = x + bias          # kernel 1: read x, write t1
    t2 = gelu(t1)          # kernel 2: read t1, write t2
    return t2 + r          # kernel 3: read t2 and r, write y

def fused(x, bias, r):
    return gelu(x + bias) + r   # one kernel: read x and r, write y (same arithmetic)

S = batch * hidden
B = 2  # bytes per fp16 element
unfused_bytes = (2 + 2 + 3) * S * B   # counted: 2S + 2S + 3S element transfers
fused_bytes = 3 * S * B               # counted: read x, read r, write y
OUT["fusion"] = {
    "elements": S, "unfused_MB": unfused_bytes / 1e6, "fused_MB": fused_bytes / 1e6,
    "ratio": unfused_bytes / fused_bytes,
    "max_abs_diff": float(np.max(np.abs(unfused(x, bias, r) - fused(x, bias, r)))),
}

# ---------- B. Dynamic batching: single server, FIFO, batch dispatched when full or when oldest waited D ----------
A_FIXED, A_PER_REQ = 0.008, 0.0005  # assumed: 8 ms fixed cost per batch, 0.5 ms per request in it

def simulate(rate, max_batch, delay, n=20000, seed=54):
    rg = np.random.default_rng(seed)
    arr = np.cumsum(rg.exponential(1.0 / rate, n))
    lat = np.empty(n)
    sizes = []
    t_free, i = 0.0, 0
    while i < n:
        s0 = max(t_free, arr[i])                      # server free and a request is waiting
        full_t = arr[i + max_batch - 1] if i + max_batch - 1 < n else np.inf
        d = min(max(s0, full_t), max(s0, arr[i] + delay))  # dispatch: batch full OR oldest waited delay
        k = 0
        while i + k < n and k < max_batch and arr[i + k] <= d:
            k += 1
        done = d + A_FIXED + A_PER_REQ * k
        lat[i:i + k] = done - arr[i:i + k]
        sizes.append(k)
        t_free, i = done, i + k
    span = t_free - arr[0]
    return {
        "mean_ms": 1e3 * lat.mean(), "p95_ms": 1e3 * np.percentile(lat, 95),
        "mean_batch": float(np.mean(sizes)), "throughput": n / span,
    }

sweep = []
for delay_ms in [0, 1, 2, 5, 10]:
    res = simulate(200.0, 8, delay_ms / 1e3)
    sweep.append({"delay_ms": delay_ms, **res})
no_batch = simulate(200.0, 1, 0.0)
batch_low = simulate(60.0, 8, 0.0)
nobatch_low = simulate(60.0, 1, 0.0)
OUT["capacity_req_s"] = {"max_batch_1": 1 / (A_FIXED + A_PER_REQ), "max_batch_8": 8 / (A_FIXED + 8 * A_PER_REQ)}
OUT["sweep_rate200_mb8"] = sweep
OUT["rate200_mb1"] = no_batch
OUT["rate60_mb8_D0"] = batch_low
OUT["rate60_mb1"] = nobatch_low

# ---------- C. KV-cache budget ----------
layers, kv_heads, head_dim, bytes_fp16 = 32, 32, 128, 2   # ASSUMED 7B-class shape, not a verified config
params = 7e9
gpu_bytes = 80e9
reserve = 6e9                                              # ASSUMED activations and workspace
per_token = 2 * layers * kv_heads * head_dim * bytes_fp16  # K and V, every layer, every head
weights = params * bytes_fp16
budget = gpu_bytes - weights - reserve
seq = 4096
OUT["kv"] = {
    "per_token_bytes": per_token, "weights_GB": weights / 1e9, "budget_GB": budget / 1e9,
    "max_tokens_in_budget": int(budget // per_token), "max_batch_at_4096": int(budget // (per_token * seq)),
    "cases": [
        {"batch": b, "seq": seq, "kv_GB": b * seq * per_token / 1e9, "kv_GiB": b * seq * per_token / 2**30,
         "fits": bool(weights + reserve + b * seq * per_token <= gpu_bytes)}
        for b in [8, 16, 32]
    ],
}

with open(os.path.join(HERE, "54.2_data.json"), "w") as f:
    json.dump(OUT, f, indent=2)

print("A fusion:", OUT["fusion"])
print("B capacity:", OUT["capacity_req_s"])
for row in sweep:
    print("B sweep:", {k: round(v, 3) for k, v in row.items()})
print("B rate200 mb1:", {k: round(v, 3) for k, v in no_batch.items()})
print("B rate60 mb8 D0:", {k: round(v, 3) for k, v in batch_low.items()})
print("B rate60 mb1:", {k: round(v, 3) for k, v in nobatch_low.items()})
print("C kv:", OUT["kv"])
