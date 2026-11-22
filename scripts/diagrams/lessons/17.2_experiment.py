# Timeline model of one GPU training loop: N batches, each = one host-to-device copy then one kernel.
# Times in ms. Each op runs when its stream, its engine and its dependencies are all free.
# Assumptions: one copy engine, one compute engine, the kernel fills the compute engine,
# and the host issues ops at zero cost. Bandwidths are illustrative, not measured here.

def simulate(ops):
    stream_free, engine_free, finish = {}, {}, {}
    timeline = []
    for op in ops:
        start = max([stream_free.get(op["stream"], 0.0), engine_free.get(op["engine"], 0.0)]
                    + [finish[d] for d in op["deps"]])
        finish[op["name"]] = start + op["ms"]
        stream_free[op["stream"]] = engine_free[op["engine"]] = finish[op["name"]]
        timeline.append((op["name"], op["engine"], start, finish[op["name"]]))
    return timeline, max(finish.values())

def pipeline(n, copy_ms, kernel_ms, streams, buffers):
    # Batch i is copied into buffer i % buffers. A copy must wait for the kernel
    # that last read that buffer, which is batch i - buffers.
    ops = []
    for i in range(n):
        ops.append({"name": f"c{i}", "engine": "copy", "ms": copy_ms,
                    "stream": "copy" if streams == 2 else "s0",
                    "deps": [f"k{i - buffers}"] if i >= buffers else []})
        ops.append({"name": f"k{i}", "engine": "sm", "ms": kernel_ms,
                    "stream": "compute" if streams == 2 else "s0",
                    "deps": [f"c{i}"]})
    return ops

BYTES = 256e6          # one batch: 256 MB
PINNED_GBS = 12.0      # assumed host-to-device bandwidth from pinned memory
PAGEABLE_GBS = 6.0     # assumed bandwidth from pageable memory
KERNEL_MS = 15.0
N = 8

copy_pinned = BYTES / (PINNED_GBS * 1e9) * 1e3
copy_pageable = BYTES / (PAGEABLE_GBS * 1e9) * 1e3
print(f"copy: pinned {copy_pinned:.2f} ms, pageable {copy_pageable:.2f} ms, kernel {KERNEL_MS} ms")

cases = [
    ("A pageable, 1 stream", pipeline(N, copy_pageable, KERNEL_MS, streams=1, buffers=2)),
    ("B pinned, 1 stream", pipeline(N, copy_pinned, KERNEL_MS, streams=1, buffers=2)),
    ("C pinned, 2 streams, 2 buffers", pipeline(N, copy_pinned, KERNEL_MS, streams=2, buffers=2)),
    ("D pinned, 2 streams, 1 buffer", pipeline(N, copy_pinned, KERNEL_MS, streams=2, buffers=1)),
]
for label, ops in cases:
    _, total = simulate(ops)
    print(f"{label:32s} total {total:8.2f} ms")

c, k = copy_pinned, KERNEL_MS
print(f"formula N*max(c,k)+min(c,k) for C: {N * max(c, k) + min(c, k):.2f} ms")

tl, _ = simulate(cases[2][1])
for name, engine, s, f in tl[:6]:
    print(f"{name:3s} {engine:5s} {s:7.2f} -> {f:7.2f}")

for ratio in (1.15, 2.5):
    t_page = BYTES / (PINNED_GBS / ratio * 1e9) * 1e3
    _, a = simulate(pipeline(N, t_page, KERNEL_MS, streams=1, buffers=2))
    print(f"pageable {ratio}x slower: A total {a:.2f} ms")

# ---- export for the diagram script (not part of the lesson listing) ----
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
data = {
    "params": {"bytes_mb": BYTES / 1e6, "pinned_gbs": PINNED_GBS, "pageable_gbs": PAGEABLE_GBS,
               "kernel_ms": KERNEL_MS, "batches": N,
               "copy_pinned_ms": copy_pinned, "copy_pageable_ms": copy_pageable},
    "scenarios": [{"label": label, "total": simulate(ops)[1]} for label, ops in cases],
    "gantt_A": [[n, e, round(s, 4), round(f, 4)] for n, e, s, f in simulate(cases[0][1])[0][:6]],
    "gantt_C": [[n, e, round(s, 4), round(f, 4)] for n, e, s, f in simulate(cases[2][1])[0][:6]],
    "ratios": [{"ratio": r, "A": simulate(pipeline(N, BYTES / (PINNED_GBS / r * 1e9) * 1e3,
                                                  KERNEL_MS, streams=1, buffers=2))[1]}
               for r in (1.15, 2.5)],
}
with open(os.path.join(HERE, "17.2_data.json"), "w") as fh:
    json.dump(data, fh, indent=1)
