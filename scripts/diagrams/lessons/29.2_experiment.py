"""Experiment for lesson 29.2 (PagedAttention). Produces every number used in the lesson.

Part A and Part B are the exact visible code blocks of the lesson (NumPy and the standard library only).
The final section dumps the numbers to 29.2_data.json for the diagram script.
"""
import json
import math
import os

import numpy as np

# ---------------- Part A: paged KV cache, toy sizes ----------------

class PagedKVCache:
    """One attention head's KV cache, stored as fixed-size pages (blocks) of B token slots."""

    def __init__(self, num_blocks, block_size, dim):
        self.B, self.D = block_size, dim
        self.k = np.zeros((num_blocks, block_size, dim))   # physical key pool
        self.v = np.zeros((num_blocks, block_size, dim))   # physical value pool
        self.free = list(range(num_blocks))[::-1]          # pop() hands out 0, 1, 2, ...
        self.ref = [0] * num_blocks                        # how many sequences map each block
        self.table = {}                                    # seq id -> block table (logical -> physical)
        self.length = {}                                   # seq id -> tokens stored

    def _take(self):
        if not self.free:
            raise MemoryError("no free blocks")
        b = self.free.pop()
        self.ref[b] = 1
        return b

    def _release(self, b):
        self.ref[b] -= 1
        if self.ref[b] == 0:
            self.free.append(b)

    def new_seq(self, sid):
        self.table[sid], self.length[sid] = [], 0

    def append(self, sid, k_vec, v_vec):
        t, blocks = self.length[sid], self.table[sid]
        if t % self.B == 0:                       # no page yet, or the last one is full
            blocks.append(self._take())
        elif self.ref[blocks[-1]] > 1:            # shared partial page: copy before writing
            new = self._take()
            self.k[new], self.v[new] = self.k[blocks[-1]], self.v[blocks[-1]]
            self._release(blocks[-1])
            blocks[-1] = new
        b, slot = blocks[-1], t % self.B
        self.k[b, slot], self.v[b, slot] = k_vec, v_vec
        self.length[sid] = t + 1

    def fork(self, parent, child):
        """Child shares every page of the parent: no data is copied."""
        self.table[child] = list(self.table[parent])
        self.length[child] = self.length[parent]
        for b in self.table[child]:
            self.ref[b] += 1

    def free_seq(self, sid):
        for b in self.table.pop(sid):
            self._release(b)
        del self.length[sid]

    def gather(self, sid):
        """Walk the block table; return keys and values in logical token order."""
        blocks, n = self.table[sid], self.length[sid]
        K = self.k[blocks].reshape(-1, self.D)[:n]
        V = self.v[blocks].reshape(-1, self.D)[:n]
        return K, V


def attend(q, K, V):
    """Scaled dot-product attention for one query over the given keys and values."""
    s = K @ q / math.sqrt(q.shape[0])
    w = np.exp(s - s.max())
    return (w / w.sum()) @ V


def kv(seq, pos, D=4):
    """Deterministic fake key and value for token `pos` of sequence `seq`."""
    base = np.arange(1, D + 1)
    return np.cos(0.1 * (pos + 1) * base + seq), np.sin(0.3 * (pos + 1) * base - seq)


D, B = 4, 4
cache = PagedKVCache(num_blocks=8, block_size=B, dim=D)
cache.new_seq("A")
cache.new_seq("B")
ref = {"A": [], "B": []}
# Interleave two requests, so their pages end up scattered through the pool
for i in range(10):
    for sid, n in (("A", 10), ("B", 6)):
        if i < n:
            k, v = kv(ord(sid), i)
            cache.append(sid, k, v)
            ref[sid].append((k, v))
print("block tables:", {s: cache.table[s] for s in "AB"})
print("free blocks:", sorted(cache.free))

q = np.array([0.5, -1.0, 0.25, 0.8])
K, V = cache.gather("A")
K_ref = np.stack([k for k, _ in ref["A"]])
V_ref = np.stack([v for _, v in ref["A"]])
out_contig = attend(q, K_ref, V_ref)
print("max |paged - contiguous| =", np.abs(attend(q, K, V) - out_contig).max())
pad_K = cache.k[cache.table["A"]].reshape(-1, D)       # all 3 pages, including 2 empty slots
pad_V = cache.v[cache.table["A"]].reshape(-1, D)
print("max error if empty slots are not masked =", np.abs(attend(q, pad_K, pad_V) - out_contig).max())

# Parallel sampling: 4 outputs share a 100-token prompt (page size 16), 50 output tokens each
def run(share):
    c = PagedKVCache(num_blocks=64, block_size=16, dim=D)
    c.new_seq("p")
    for i in range(100):
        c.append("p", *kv(0, i))
    for s in range(4):
        if share:
            c.fork("p", f"c{s}")
        else:
            c.new_seq(f"c{s}")
            for i in range(100):
                c.append(f"c{s}", *kv(0, i))
    c.free_seq("p")
    for s in range(4):
        for j in range(50):
            c.append(f"c{s}", *kv(10 + s, 100 + j))
    return c

shared, separate = run(share=True), run(share=False)
print("pages in use, shared prompt:", 64 - len(shared.free))
print("pages in use, separate copies:", 64 - len(separate.free))
ok = True
for s in range(4):
    expect = [kv(0, i) for i in range(100)] + [kv(10 + s, 100 + j) for j in range(50)]
    K_s, V_s = shared.gather(f"c{s}")
    ok &= np.array_equal(K_s, np.stack([k for k, _ in expect]))
    ok &= np.array_equal(V_s, np.stack([v for _, v in expect]))
print("every child reads back its own tokens:", ok)
print("child 0 block table:", shared.table["c0"])
print("child 3 block table:", shared.table["c3"])

# ---------------- Part B: how many requests fit? ----------------

CAPACITY = 65_536                          # token slots of KV memory
MAX_LEN = 2048                             # per-request reservation of a static scheme
idx = np.arange(1000)
lengths = 32 + (idx * 7919) % 2017         # deterministic workload: 1000 requests, 32..2048 tokens

# Static: reserve MAX_LEN slots per request, whatever its real length
static_admit = CAPACITY // MAX_LEN
static_util = lengths[:static_admit].sum() / CAPACITY

def paged(B):
    blocks_total = CAPACITY // B
    need = -(-lengths // B)                # ceil(L / B) pages per request
    admit = int(np.searchsorted(np.cumsum(need), blocks_total, side="right"))
    util = lengths[:admit].sum() / CAPACITY
    waste = (need[:admit] * B - lengths[:admit]).mean()
    return admit, util, waste

admit16, util16, waste16 = paged(16)
print(f"static: {static_admit} requests admitted, {static_util:.1%} of capacity holds tokens")
print(f"paged B=16: {admit16} requests admitted, {util16:.1%} of capacity holds tokens")
print(f"paged B=16: mean wasted slots per request = {waste16:.2f}")
print("mean request length:", lengths.mean())
for Bs in [1, 4, 16, 64, 256, 2048]:
    a, u, w = paged(Bs)
    print(f"page size {Bs:4d}: {a:2d} admitted, {u:.1%} of capacity holds tokens, {w:7.2f} wasted slots per request")

# ---------------- Dump numbers for the diagrams ----------------

A_table = cache.table["A"]
B_table = cache.table["B"]
pool_owner = {}
for sid in "AB":
    for b in cache.table[sid]:
        pool_owner[b] = sid
sweep = []
for Bs in [1, 4, 16, 64, 256, 2048]:
    a, u, w = paged(Bs)
    sweep.append({"B": Bs, "admit": a, "util": float(u), "waste": float(w)})
ex_len = 300
data = {
    "toy": {
        "block_size": B, "pool_blocks": 8, "len_A": 10, "len_B": 6,
        "table_A": A_table, "table_B": B_table,
        "owner": {str(k): v for k, v in sorted(pool_owner.items())},
        "free": sorted(cache.free),
        "max_err_paged": float(np.abs(attend(q, K, V) - out_contig).max()),
        "max_err_padded": float(np.abs(attend(q, pad_K, pad_V) - out_contig).max()),
    },
    "fork": {
        "block_size": 16, "prompt": 100, "outputs": 50, "n": 4,
        "pages_shared": 64 - len(shared.free),
        "pages_separate": 64 - len(separate.free),
        "child_tables": {f"c{s}": shared.table[f"c{s}"] for s in range(4)},
        "ref_end": [shared.ref[b] for b in shared.table["c0"]],
        "all_correct": bool(ok),
    },
    "admission": {
        "capacity": CAPACITY, "max_len": MAX_LEN, "mean_len": float(lengths.mean()),
        "static_admit": static_admit, "static_util": float(static_util),
        "paged16_admit": admit16, "paged16_util": float(util16),
        "paged16_waste": float(waste16),
        "sweep": sweep,
    },
    "example_request": {
        "len": ex_len, "static_slots": MAX_LEN,
        "paged_pages": -(-ex_len // 16), "paged_slots": -(-ex_len // 16) * 16,
        "paged_waste": -(-ex_len // 16) * 16 - ex_len,
    },
}
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "29.2_data.json"), "w") as f:
    json.dump(data, f, indent=2)
print("wrote 29.2_data.json")
