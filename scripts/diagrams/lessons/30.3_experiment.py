"""Experiment for lesson 30.3. Every number in the lesson and in 30.3.mjs comes from this file.

Run:  python3 scripts/diagrams/lessons/30.3_experiment.py      (needs numpy only)
Writes 30.3_data.json next to this file.
"""
import itertools
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
out = {}

# ---------------------------------------------------------------- A. lazy streaming pipeline
# Standard library only. A toy "dataset": 3 shards x 5 examples. Labels are toy values.
calls = {"source": 0, "map": 0}


def source():
    for shard in range(3):
        for i in range(5):
            ex_id = shard * 5 + i
            calls["source"] += 1
            text = ("good film" if ex_id % 2 == 0 else "bad plot twist") + f" number {ex_id}"
            yield {"id": ex_id, "text": text, "label": int(ex_id % 2 == 0)}


MAX_LEN = 6
vocab = {"<pad>": 0}


def tokenize(text):
    ids = [vocab.setdefault(w, len(vocab)) for w in text.split()][:MAX_LEN]
    return ids + [0] * (MAX_LEN - len(ids))


def lazy_map(it, fn):
    for ex in it:
        calls["map"] += 1
        yield {"input_ids": fn(ex["text"]), "label": ex["label"]}


def batches(it, n):
    buf = []
    for ex in it:
        buf.append(ex)
        if len(buf) == n:
            yield buf
            buf = []
    if buf:
        yield buf


pipe = batches(lazy_map(source(), tokenize), 2)
first = next(pipe)
out["lazy_first_batch"] = {
    "batch_size": len(first),
    "source_read": calls["source"],
    "map_calls": calls["map"],
    "input_ids": [e["input_ids"] for e in first],
}
rest = list(pipe)
out["lazy_total"] = {
    "batches": len(rest) + 1,
    "last_batch_size": len(rest[-1]),
    "source_read": calls["source"],
    "map_calls": calls["map"],
    "vocab_size": len(vocab),
}

# ---------------------------------------------------------------- B. shuffle buffer
# Same idea as IterableDataset.shuffle(buffer_size=...): fill a buffer, then for each new
# example emit a random buffered example and replace it with the new one. Flush at the end.


def shuffle_buffer(it, buffer_size, rng):
    buf = []
    for ex in it:
        if len(buf) < buffer_size:
            buf.append(ex)
            continue
        j = int(rng.integers(len(buf)))
        yield buf[j]
        buf[j] = ex
    for k in rng.permutation(len(buf)):
        yield buf[k]


N = 1000
out["shuffle"] = {}
for b in [1, 10, 100, 1000]:
    order = list(shuffle_buffer(iter(range(N)), b, np.random.default_rng(0)))
    assert sorted(order) == list(range(N))
    # Invariant: output k was stored before source item k + b was read, so its id is <= k + b - 1.
    assert all(order[k] <= k + b - 1 for k in range(N))
    disp = np.abs(np.arange(N) - np.array(order))
    out["shuffle"][str(b)] = {
        "mean_displacement": float(disp.mean()),
        "max_displacement": int(disp.max()),
        "adjacent_fraction": float(np.mean(np.diff(order) == 1)),
        "first_10": order[:10],
    }
# Sanity: a uniform random permutation of N items has E|i - pi(i)| ~ N/3.
out["shuffle_uniform_reference"] = N / 3

# ---------------------------------------------------------------- C. gradient accumulation
# Linear model, MSE loss L = mean((X w - y)^2), so dL/dw = (2/m) X^T (X w - y) on m examples.
rng = np.random.default_rng(1)
n, d = 32, 3
X = rng.normal(size=(n, d))
w_true = np.array([1.0, -2.0, 0.5])
y = X @ w_true + 0.1 * rng.normal(size=n)
w = np.zeros(d)


def grad_mse(Xb, yb, w):
    return 2.0 / len(yb) * Xb.T @ (Xb @ w - yb)


g_full = grad_mse(X, y, w)
micro, k = 8, 32 // 8
g_micro = [grad_mse(X[i * micro:(i + 1) * micro], y[i * micro:(i + 1) * micro], w) for i in range(k)]
g_acc = sum(g_micro) / k              # correct: average the k micro-batch gradients
g_naive = sum(g_micro)                # bug: forget to divide by k
lr = 0.1
w_full = w - lr * g_full
w_acc = w - lr * g_acc
# Trap: unequal micro-batches (20 + 12) with a mean of per-micro-batch means
g_a = grad_mse(X[:20], y[:20], w)
g_b = grad_mse(X[20:], y[20:], w)
g_uneven = (g_a + g_b) / 2

out["accum"] = {
    "g_full": g_full.tolist(),
    "g_micro_0": g_micro[0].tolist(),
    "g_acc": g_acc.tolist(),
    "max_abs_diff_acc_vs_full": float(np.max(np.abs(g_acc - g_full))),
    "naive_over_full_ratio": float(np.linalg.norm(g_naive) / np.linalg.norm(g_full)),
    "w_full": w_full.tolist(),
    "w_acc": w_acc.tolist(),
    "max_abs_diff_w": float(np.max(np.abs(w_acc - w_full))),
    "uneven_mean_of_means_rel_error": float(np.linalg.norm(g_uneven - g_full) / np.linalg.norm(g_full)),
}
out["trainer_effective_batch"] = {
    "per_device": 8, "grad_accum": 4,
    "devices_1": 8 * 1 * 4,
    "devices_2": 8 * 2 * 4,
}

# ---------------------------------------------------------------- D. sharding across processes
# Model of Accelerate's default (split_batches=False, even_batches=True): each process gets a
# whole batch of size bs; batches go round-robin; an incomplete last batch is filled with
# samples from the start of the dataset (the docs' wording). Model only, not Accelerate's code.


def assign(n_samples, bs, world):
    seq = list(range(n_samples))
    bl = [seq[i:i + bs] for i in range(0, n_samples, bs)]
    cyc = itertools.cycle(seq)
    while len(bl[-1]) < bs:
        bl[-1].append(next(cyc))
    while len(bl) % world:
        bl.append([next(cyc) for _ in range(bs)])
    return {p: [bl[i] for i in range(p, len(bl), world)] for p in range(world)}


plan = assign(9, 5, 2)
steps = len(plan[0])
gathered = [x for p in plan for step in plan[p] for x in step]
dups = sorted(x for x in set(gathered) if gathered.count(x) > 1)
out["sharding"] = {
    "process_0": plan[0],
    "process_1": plan[1],
    "steps_per_epoch": steps,
    "samples_seen_per_step": 5 * 2,
    "gathered_before_dedup": len(gathered),
    "duplicated_ids": dups,
    "after_gather_for_metrics": len(set(gathered)),
}

with open(os.path.join(HERE, "30.3_data.json"), "w") as fh:
    json.dump(out, fh, indent=1)

print(json.dumps(out, indent=1))
