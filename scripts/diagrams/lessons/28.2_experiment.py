"""Experiment for lesson 28.2 (distributed training). Writes 28.2_data.json next to this file.

Everything the lesson quotes comes from this script. NumPy only.
Ranks are simulated in one process; ring collectives move real arrays chunk by chunk
and count the elements each rank sends.
"""
import json
import os
from functools import lru_cache

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "28.2_data.json")
results = {}

# ---------------------------------------------------------------- 1. memory model
K = 12  # bytes of optimizer state per parameter for mixed-precision Adam (ZeRO paper, Sec. 2)
# per-parameter bytes: fp16 params 2, fp16 grads 2, fp32 master params 4, fp32 momentum 4, fp32 variance 4

def mem_per_rank_bytes(psi, nd, stage):
    """Model-state bytes per GPU. stage: 0 = DDP baseline, 1 = ZeRO-1, 2 = ZeRO-2, 3 = ZeRO-3."""
    if stage == 0:
        return (2 + 2 + K) * psi
    if stage == 1:
        return 4 * psi + K * psi / nd
    if stage == 2:
        return 2 * psi + (2 + K) * psi / nd
    if stage == 3:
        return (2 + 2 + K) * psi / nd
    raise ValueError(stage)

PSI_BIG, ND_BIG = 7.5e9, 64
mem_gb = {name: mem_per_rank_bytes(PSI_BIG, ND_BIG, s) / 1e9
          for name, s in [("DDP", 0), ("ZeRO-1", 1), ("ZeRO-2", 2), ("ZeRO-3", 3)]}
results["memory_gb_7p5B_nd64"] = {k: round(v, 2) for k, v in mem_gb.items()}
results["bytes_per_param_baseline"] = 2 + 2 + K

# memory table for a few sizes/degrees, to show the 1/Nd behaviour
results["memory_table_gb"] = {
    f"psi={p:g}B,nd={n}": {f"stage{s}": round(mem_per_rank_bytes(p * 1e9, n, s) / 1e9, 2) for s in range(4)}
    for p in (1.5, 7.5) for n in (8, 64)
}

# ---------------------------------------------------------------- 2. toy model + ring collectives
N = 4                                   # simulated data-parallel ranks
D_IN, D_H, D_OUT = 16, 32, 4
SHAPES = [(D_IN, D_H), (D_H,), (D_H, D_OUT), (D_OUT,)]
PSI = sum(int(np.prod(s)) for s in SHAPES)
assert PSI % N == 0
results["psi_toy"] = PSI

def unflatten(theta):
    out, i = [], 0
    for s in SHAPES:
        n = int(np.prod(s))
        out.append(theta[i:i + n].reshape(s))
        i += n
    return out

def loss_and_grad(theta, X, Y):
    """Mean over samples of squared error for a 2-layer tanh MLP; gradient w.r.t. the flat theta."""
    W1, b1, W2, b2 = unflatten(theta)
    n = X.shape[0]
    H = np.tanh(X @ W1 + b1)
    E = H @ W2 + b2 - Y
    loss = np.sum(E ** 2) / n
    dP = 2 * E / n
    dW2, db2 = H.T @ dP, dP.sum(0)
    dZ = (dP @ W2.T) * (1 - H ** 2)
    dW1, db1 = X.T @ dZ, dZ.sum(0)
    return loss, np.concatenate([a.ravel() for a in (dW1, db1, dW2, db2)])

def adam_step(p, g, m, v, t, lr=1e-2, b1=0.9, b2=0.999, eps=1e-8):
    """Elementwise Adam: every entry of p, m, v is updated from the same entry of g alone."""
    m = b1 * m + (1 - b1) * g
    v = b2 * v + (1 - b2) * g * g
    mh, vh = m / (1 - b1 ** t), v / (1 - b2 ** t)
    return p - lr * mh / (np.sqrt(vh) + eps), m, v

def owner_chunk(r, n):
    """After a ring reduce-scatter, rank r holds the fully reduced chunk (r+1) mod n."""
    return (r + 1) % n

def ring_reduce_scatter(bufs):
    """bufs[r]: rank r's full gradient vector. Returns owned chunks and elements sent per rank."""
    n = len(bufs)
    chunks = [np.array_split(b.copy(), n) for b in bufs]
    sent = [0] * n
    for s in range(n - 1):
        msgs = []
        for r in range(n):
            c = (r - s) % n
            msgs.append(((r + 1) % n, c, chunks[r][c].copy()))
            sent[r] += chunks[r][c].size
        for dst, c, data in msgs:
            chunks[dst][c] = chunks[dst][c] + data
    return [chunks[r][owner_chunk(r, n)] for r in range(n)], sent

def ring_all_gather(owned, n):
    """owned[r]: the chunk rank r owns. Returns the full vector on every rank and elements sent per rank."""
    full = [[None] * n for _ in range(n)]
    for r in range(n):
        full[r][owner_chunk(r, n)] = owned[r].copy()
    sent = [0] * n
    for s in range(n - 1):
        msgs = []
        for r in range(n):
            c = (owner_chunk(r, n) - s) % n
            msgs.append(((r + 1) % n, c, full[r][c].copy()))
            sent[r] += full[r][c].size
        for dst, c, data in msgs:
            full[dst][c] = data
    return [np.concatenate(full[r]) for r in range(n)], sent

def ring_all_reduce(bufs):
    owned, s1 = ring_reduce_scatter(bufs)
    full, s2 = ring_all_gather(owned, len(bufs))
    return full, [a + b for a, b in zip(s1, s2)]

def chunk_slice(vec, r, n):
    """Index range of rank r's owned chunk inside the flat vector."""
    sizes = [len(c) for c in np.array_split(np.arange(len(vec)), n)]
    start = sum(sizes[:owner_chunk(r, n)])
    return slice(start, start + sizes[owner_chunk(r, n)])

def train(mode, steps, theta0, Xs, Ys):
    """mode: 'single' (reference), 'ddp', 'zero2', 'zero3'. Returns final full theta and elements sent per rank per step."""
    n = len(Xs)
    if mode == "single":
        X, Y = np.concatenate(Xs), np.concatenate(Ys)
        theta, m, v = theta0.copy(), np.zeros_like(theta0), np.zeros_like(theta0)
        for t in range(1, steps + 1):
            _, g = loss_and_grad(theta, X, Y)
            theta, m, v = adam_step(theta, g, m, v, t)
        return theta, 0.0

    comm = []
    if mode == "ddp":
        theta = [theta0.copy() for _ in range(n)]          # full parameters and optimizer state on every rank
        m = [np.zeros_like(theta0) for _ in range(n)]
        v = [np.zeros_like(theta0) for _ in range(n)]
    elif mode == "zero2":                                  # full parameters, but optimizer state only for own chunk
        theta = [theta0.copy() for _ in range(n)]
        m = [np.zeros(len(theta0[chunk_slice(theta0, r, n)])) for r in range(n)]
        v = [np.zeros(len(theta0[chunk_slice(theta0, r, n)])) for r in range(n)]
    else:                                                  # zero3: parameters, gradients and state sharded
        shard = [theta0[chunk_slice(theta0, r, n)].copy() for r in range(n)]
        m = [np.zeros_like(s) for s in shard]
        v = [np.zeros_like(s) for s in shard]

    for t in range(1, steps + 1):
        step_sent = [0] * n
        if mode == "zero3":                                # all-gather parameters before forward
            theta, s = ring_all_gather(shard, n)
            step_sent = [a + b for a, b in zip(step_sent, s)]
            # ZeRO-3 discards the full parameters after forward, so backward gathers them again
            theta, s = ring_all_gather(shard, n)
            step_sent = [a + b for a, b in zip(step_sent, s)]
        grads = [loss_and_grad(theta[r], Xs[r], Ys[r])[1] for r in range(n)]
        if mode == "ddp":
            full, s = ring_all_reduce(grads)               # all-reduce = reduce-scatter + all-gather
            step_sent = [a + b for a, b in zip(step_sent, s)]
            g_mean = [f / n for f in full]
            for r in range(n):
                theta[r], m[r], v[r] = adam_step(theta[r], g_mean[r], m[r], v[r], t)
        else:                                              # zero2 and zero3: reduce-scatter gradients
            owned, s = ring_reduce_scatter(grads)
            step_sent = [a + b for a, b in zip(step_sent, s)]
            if mode == "zero2":
                new_chunks = []
                for r in range(n):                         # update only the chunk this rank owns
                    sl = chunk_slice(theta0, r, n)
                    p_r, m[r], v[r] = adam_step(theta[r][sl], owned[r] / n, m[r], v[r], t)
                    new_chunks.append(p_r)
                full, s = ring_all_gather(new_chunks, n)   # all-gather updated parameters
                step_sent = [a + b for a, b in zip(step_sent, s)]
                theta = full
            else:
                for r in range(n):
                    shard[r], m[r], v[r] = adam_step(shard[r], owned[r] / n, m[r], v[r], t)
        comm.append(step_sent)

    if mode == "zero3":
        final, _ = ring_all_gather(shard, n)
        return final[0], comm[0][0]
    return theta[0], comm[0][0]

rng = np.random.default_rng(0)
X = rng.normal(size=(64, D_IN))
Y = rng.normal(size=(64, D_OUT))
Xs, Ys = np.split(X, N), np.split(Y, N)                    # each rank gets 16 samples
theta0 = np.concatenate([a.ravel() for a in (
    rng.normal(size=(D_IN, D_H)) / np.sqrt(D_IN), np.zeros(D_H),
    rng.normal(size=(D_H, D_OUT)) / np.sqrt(D_H), np.zeros(D_OUT))])

STEPS = 20
ref, _ = train("single", STEPS, theta0, Xs, Ys)
results["final_loss_single"] = float(loss_and_grad(ref, X, Y)[0])
results["initial_loss"] = float(loss_and_grad(theta0, X, Y)[0])

# ring collectives are exact sums of chunks, so check them first
test = [rng.normal(size=PSI) for _ in range(N)]
ar, _ = ring_all_reduce(test)
results["allreduce_max_err"] = float(max(np.max(np.abs(a - np.sum(test, axis=0))) for a in ar))

# one gradient step: DDP gradient equals full-batch gradient
grads_local = [loss_and_grad(theta0, Xs[r], Ys[r])[1] for r in range(N)]
g_full = loss_and_grad(theta0, X, Y)[1]
results["ddp_grad_max_err"] = float(np.max(np.abs(np.mean(grads_local, axis=0) - g_full)))

rows = {}
for mode in ("ddp", "zero2", "zero3"):
    final, sent = train(mode, STEPS, theta0, Xs, Ys)
    rows[mode] = {"max_abs_err_vs_single": float(np.max(np.abs(final - ref))),
                  "elements_sent_per_rank_per_step": int(sent),
                  "in_units_of_psi": round(sent / PSI, 4)}
results["training_equivalence"] = rows
results["comm_ratio_zero3_over_ddp"] = rows["zero3"]["elements_sent_per_rank_per_step"] / rows["ddp"]["elements_sent_per_rank_per_step"]
results["steps"] = STEPS
# one collective (all-gather or reduce-scatter) sent by one rank, in elements
_, one = ring_all_gather([theta0[chunk_slice(theta0, r, N)] for r in range(N)], N)
results["elements_per_collective_per_rank"] = int(one[0])
# memory breakdown per GPU for the 7.5B / Nd=64 figure (GB): fp16 weights, fp16 grads, optimizer state
psi, nd = PSI_BIG, ND_BIG
results["memory_breakdown_gb"] = {
    "DDP":    {"weights": 2 * psi / 1e9, "grads": 2 * psi / 1e9, "optimizer": K * psi / 1e9},
    "ZeRO-1": {"weights": 2 * psi / 1e9, "grads": 2 * psi / 1e9, "optimizer": K * psi / nd / 1e9},
    "ZeRO-2": {"weights": 2 * psi / 1e9, "grads": 2 * psi / nd / 1e9, "optimizer": K * psi / nd / 1e9},
    "ZeRO-3": {"weights": 2 * psi / nd / 1e9, "grads": 2 * psi / nd / 1e9, "optimizer": K * psi / nd / 1e9},
}

# ---------------------------------------------------------------- 3. GPipe schedule simulation
def gpipe_timeline(K_, M_, f=1.0, b=2.0):
    """Each stage runs M forwards then M backwards; a task starts when its device is free and its input is ready."""
    tasks = {}
    for s in range(K_):
        seq = [("F", s, m) for m in range(M_)] + [("B", s, m) for m in reversed(range(M_))]
        for i, tk in enumerate(seq):
            tasks[tk] = {"dev": s, "prev": seq[i - 1] if i > 0 else None,
                         "dur": f if tk[0] == "F" else b}

    def deps(tk):
        kind, s, m = tk
        if kind == "F":
            return [("F", s - 1, m)] if s > 0 else []
        return [("B", s + 1, m)] if s < K_ - 1 else []

    memo = {}
    def end(tk):
        if tk in memo:
            return memo[tk]
        t = tasks[tk]
        start = 0.0
        if t["prev"] is not None:
            start = max(start, end(t["prev"])[1])
        for d in deps(tk):
            start = max(start, end(d)[1])
        memo[tk] = (start, start + t["dur"])
        return memo[tk]

    for tk in tasks:
        end(tk)
    makespan = max(e for _, e in memo.values())
    busy = sum(t["dur"] for t in tasks.values())
    idle_frac = 1 - busy / (K_ * makespan)
    return memo, makespan, idle_frac

pipe = {}
for M_ in (1, 2, 4, 8, 16, 32):
    _, mk, idle = gpipe_timeline(4, M_)
    formula = (4 - 1) / (M_ + 4 - 1)
    pipe[M_] = {"simulated_idle_fraction": round(idle, 4), "formula_(K-1)/(M+K-1)": round(formula, 4),
                "makespan": mk}
results["pipeline_K4"] = pipe
# 2-stage check and the M = 4K point from the GPipe paper's remark
idle_k8_m32 = gpipe_timeline(8, 32)[2]
results["pipeline_K8_M32"] = {"simulated": round(idle_k8_m32, 4), "formula": round(7 / 39, 4)}

# Gantt data for K = 4, M = 4 (f = 1, b = 2 time units)
tl, mk, _ = gpipe_timeline(4, 4)
results["gantt_K4_M4"] = [{"kind": k, "stage": s, "micro": m, "start": a, "end": e}
                          for (k, s, m), (a, e) in sorted(tl.items(), key=lambda kv: (kv[0][1], kv[1][0]))]

with open(OUT, "w") as fh:
    json.dump(results, fh, indent=2)

# ---------------------------------------------------------------- print a readable summary
print("memory GB, 7.5B params, Nd=64:", results["memory_gb_7p5B_nd64"])
print("toy PSI:", PSI, " initial loss %.4f  final single-process loss %.4f" % (results["initial_loss"], results["final_loss_single"]))
print("ring all-reduce max error:", results["allreduce_max_err"])
print("DDP gradient vs full-batch max error:", results["ddp_grad_max_err"])
for mode, row in rows.items():
    print(f"{mode:6s} max|theta - single| = {row['max_abs_err_vs_single']:.2e}   elements sent/rank/step = {row['elements_sent_per_rank_per_step']} ({row['in_units_of_psi']} psi)")
print("ZeRO-3 / DDP communication ratio:", round(results["comm_ratio_zero3_over_ddp"], 4))
for M_, row in pipe.items():
    print(f"GPipe K=4 M={M_:2d}: simulated idle {row['simulated_idle_fraction']:.4f}   formula {row['formula_(K-1)/(M+K-1)']:.4f}")
print("GPipe K=8 M=32: simulated", results["pipeline_K8_M32"]["simulated"], "formula", results["pipeline_K8_M32"]["formula"])
print("Gantt K=4 M=4 (kind stage micro start-end):")
for g in results["gantt_K4_M4"]:
    print(f"  {g['kind']}{g['micro']} stage{g['stage']} {g['start']:.0f}-{g['end']:.0f}")
