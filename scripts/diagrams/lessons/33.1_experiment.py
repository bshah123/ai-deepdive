# Experiment for lesson 33.1. Each BLOCK is the code shown in the lesson, copied verbatim.
# Run: python3 scripts/diagrams/lessons/33.1_experiment.py  (writes 33.1_data.json next to this file)
import json, math, os, random

# ---- BLOCK 1: build the index and intersect two postings lists ----
docs = {
    0: "the cat sat",
    1: "the dog sat down",
    2: "a cat and a dog",
    3: "the bird flew",
}

def build_index(docs):
    """Map each term to a sorted list of (doc_id, term_frequency) pairs."""
    index = {}
    for doc_id in sorted(docs):
        counts = {}
        for term in docs[doc_id].split():
            counts[term] = counts.get(term, 0) + 1
        for term, tf in counts.items():
            index.setdefault(term, []).append((doc_id, tf))
    return index

def intersect(p, q):
    """Two-pointer AND of two sorted doc-id lists. Returns (result, comparisons)."""
    i = j = comparisons = 0
    out = []
    while i < len(p) and j < len(q):
        comparisons += 1
        if p[i] == q[j]:
            out.append(p[i]); i += 1; j += 1
        elif p[i] < q[j]:
            i += 1
        else:
            j += 1
    return out, comparisons

index = build_index(docs)
for term in sorted(index):
    print(f"{term:5s} df={len(index[term])} postings={index[term]}")

def doc_ids(term):
    return [d for d, _ in index.get(term, [])]

for a, b in [("cat", "dog"), ("the", "sat"), ("the", "bird")]:
    result, cmp_ = intersect(doc_ids(a), doc_ids(b))
    print(f"{a} AND {b}: docs {result}  ({cmp_} comparisons)")

# ---- BLOCK 2: variable-byte (VByte) encoding of integers ----
def vbyte_encode(n):
    """Encode one non-negative integer: 7 data bits per byte, high bit 1 = more bytes follow."""
    groups = [n & 0x7F]
    n >>= 7
    while n:
        groups.append(n & 0x7F)
        n >>= 7
    groups.reverse()
    out = bytearray()
    for k, g in enumerate(groups):
        more = 0x80 if k < len(groups) - 1 else 0x00
        out.append(more | g)
    return bytes(out)

def vbyte_decode(data):
    """Decode a byte string back into a list of integers."""
    nums, n = [], 0
    for b in data:
        n = (n << 7) | (b & 0x7F)
        if b & 0x80 == 0:
            nums.append(n)
            n = 0
    return nums

for x in [4, 127, 128, 824, 1000]:
    enc = vbyte_encode(x)
    print(f"{x:5d} -> {[format(b, '08b') for b in enc]}  {len(enc)} byte(s)  decodes to {vbyte_decode(enc)[0]}")

rng_check = random.Random(1)
sample = [rng_check.randrange(0, 2**20) for _ in range(10000)]
assert [v for x in sample for v in vbyte_decode(vbyte_encode(x))] == sample
print("round trip of 10,000 random integers below 2**20: OK")

# ---- BLOCK 3: synthetic Zipf-like corpus, d-gaps, bytes per posting ----
N_DOCS, N_TERMS = 20_000, 1_000
rng = random.Random(33)
postings = {}
for r in range(1, N_TERMS + 1):
    df = max(1, round(0.3 * N_DOCS / r))
    postings[f"t{r}"] = sorted(rng.sample(range(N_DOCS), df))
print(f"terms={len(postings)} postings={sum(len(p) for p in postings.values())}")

def gaps(doc_ids_):
    """d-gaps: the first id as is, then each id minus the previous one."""
    return [doc_ids_[0]] + [b - a for a, b in zip(doc_ids_, doc_ids_[1:])]

buckets = [("df>=1000", 1000, 10**9), ("100-999", 100, 999), ("10-99", 10, 99), ("1-9", 1, 9)]
bucket_rows = {}
for label, lo, hi in buckets:
    terms = [p for p in postings.values() if lo <= len(p) <= hi]
    n_post = sum(len(p) for p in terms)
    vbytes = sum(len(vbyte_encode(g)) for p in terms for g in gaps(p))
    bitmap = sum(N_DOCS // 8 for _ in terms)
    bucket_rows[label] = {"terms": len(terms), "postings": n_post,
                          "vbyte": vbytes / n_post, "bitmap": bitmap / n_post}
    print(f"{label:9s} terms={len(terms):4d} postings={n_post:6d} "
          f"vbyte={vbytes / n_post:.2f} B/posting  bitmap={bitmap / n_post:.2f} B/posting  raw32=4.00")

# ---- BLOCK 4: merge vs skip pointers, counting comparisons ----
rng = random.Random(33)
N_DOCS, N_TERMS = 20_000, 1_000
postings = {}
for r in range(1, N_TERMS + 1):
    df = max(1, round(0.3 * N_DOCS / r))
    postings[f"t{r}"] = sorted(rng.sample(range(N_DOCS), df))

def merge_and(p, q):
    """Two-pointer AND. Returns (result, comparisons)."""
    i = j = comparisons = 0
    out = []
    while i < len(p) and j < len(q):
        comparisons += 1
        if p[i] == q[j]:
            out.append(p[i]); i += 1; j += 1
        elif p[i] < q[j]:
            i += 1
        else:
            j += 1
    return out, comparisons

def skip_and(short, long_, step):
    """Two-pointer AND where long_ has skip pointers at every multiple of `step`."""
    i = j = comparisons = 0
    out = []
    while i < len(short) and j < len(long_):
        x, y = short[i], long_[j]
        comparisons += 1
        if x == y:
            out.append(x); i += 1; j += 1
        elif x < y:
            i += 1
        else:
            while (j // step + 1) * step < len(long_):
                nxt = (j // step + 1) * step
                comparisons += 1
                if long_[nxt] < x:
                    j = nxt
                else:
                    break
            j += 1
    return out, comparisons

skip_rows = []
for a, b in [("t300", "t1"), ("t60", "t1"), ("t300", "t60"), ("t20", "t40")]:
    p, q = sorted([postings[a], postings[b]], key=len)
    truth = sorted(set(p) & set(q))
    m, c_m = merge_and(p, q)
    s, c_s = skip_and(p, q, step=round(math.sqrt(len(q))))
    assert m == truth and s == truth
    skip_rows.append({"pair": f"{a} AND {b}", "short": len(p), "long": len(q),
                      "result": len(truth), "merge": c_m, "skip": c_s})
    print(f"{a} AND {b}: short={len(p)} long={len(q)} result={len(truth)} "
          f"merge={c_m} skip={c_s}")

# ---- dump the numbers the diagrams use ----
out = {"block1_index": {t: index[t] for t in sorted(index)},
       "block1_intersections": [{"pair": f"{a} AND {b}", "result": intersect(doc_ids(a), doc_ids(b))[0],
                                 "comparisons": intersect(doc_ids(a), doc_ids(b))[1]}
                                for a, b in [("cat", "dog"), ("the", "sat"), ("the", "bird")]],
       "vbyte_examples": {str(x): [format(b, '08b') for b in vbyte_encode(x)] for x in [4, 127, 128, 824, 1000]},
       "buckets": bucket_rows, "skip_rows": skip_rows}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "33.1_data.json"), "w") as f:
    json.dump(out, f, indent=1)
