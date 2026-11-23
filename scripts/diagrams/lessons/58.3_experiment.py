# Experiment for lesson 58.3 (data filtering, MinHash LSH de-duplication, quality classifiers).
# Run: <python> scripts/diagrams/lessons/58.3_experiment.py
# Writes every number used in the lesson and its diagrams to 58.3_data.json.
import json, sys, zlib
import numpy as np

rng = np.random.default_rng(58)
out = {"numpy": np.__version__, "python": sys.version.split()[0]}

# ---- synthetic corpus: Zipf-distributed pseudo-words -------------------------
BOILER = ["click", "buy", "free", "download", "cheap", "subscribe",
          "winner", "casino", "offer", "limited", "now", "deal"]
letters = list("abcdefghijklmnoprstuvy")
words = set()
while len(words) < 3000:
    words.add("".join(rng.choice(letters, size=rng.integers(3, 8))))
VOCAB = sorted(words - set(BOILER))
P = 1.0 / np.arange(1, len(VOCAB) + 1) ** 1.07
P /= P.sum()

def clean_doc(n):
    return list(rng.choice(VOCAB, size=n, p=P))

def mutate(tokens, rate):
    t = np.array(tokens, dtype=object)
    mask = rng.random(len(t)) < rate
    t[mask] = rng.choice(VOCAB, size=int(mask.sum()), p=P)
    return list(t)

def shingles(tokens, k=3):
    return {" ".join(tokens[i:i + k]) for i in range(len(tokens) - k + 1)}

# ---- toy example: the hand-checkable pair --------------------------------------
toy_a = "the cat sat on the mat".split()
toy_b = "the cat sat on the red mat".split()
sa, sb = shingles(toy_a), shingles(toy_b)
out["toy"] = {
    "shingles_a": sorted(sa), "shingles_b": sorted(sb),
    "inter": len(sa & sb), "union": len(sa | sb),
    "jaccard": len(sa & sb) / len(sa | sb),
}
union = sorted(sa | sb)
TOY_HASH = [(1, 3), (4, 7), (9, 2)]          # (a, b) of three hash functions h(x) = (a*x + b) mod 11
toy_table = [[(a * x + b) % 11 for (a, b) in TOY_HASH] for x in range(len(union))]
sig_a = [min(toy_table[union.index(s)][f] for s in sa) for f in range(3)]
sig_b = [min(toy_table[union.index(s)][f] for s in sb) for f in range(3)]
out["toy_minhash"] = {
    "union": union, "hash_table": toy_table, "sig_a": sig_a, "sig_b": sig_b,
    "agree": sum(x == y for x, y in zip(sig_a, sig_b)),
}

# ---- de-duplication corpus -----------------------------------------------------
N_BASE, N_COPIES, N_WORDS = 250, 100, 120
RATES = [0.01, 0.03, 0.06, 0.10, 0.20, 0.35]     # word substitution rates of the variants
NEAR = 0.5                                       # policy: Jaccard >= 0.5 counts as a near-duplicate

docs, family = [], []
for f in range(N_BASE):
    base = clean_doc(N_WORDS)
    docs.append(base); family.append(f)
    for r in RATES:
        docs.append(mutate(base, r)); family.append(f)
for c in rng.choice(N_BASE, size=N_COPIES, replace=False):
    docs.append(list(docs[c * (len(RATES) + 1)])); family.append(int(c))
N = len(docs)
family = np.array(family)

S = [shingles(d) for d in docs]
sizes = np.array([len(s) for s in S])

# exact Jaccard for every pair (the ground truth)
J = np.zeros((N, N))
for i in range(N):
    si = S[i]
    for j in range(i + 1, N):
        inter = len(si & S[j])
        if inter:
            J[i, j] = inter / (sizes[i] + sizes[j] - inter)
iu = np.triu_indices(N, 1)
Jf = J[iu]
T = J >= NEAR
T = np.triu(T, 1)
tru = T[iu]
cross_family_truth = int(np.sum(tru & (family[iu[0]] != family[iu[1]])))
out["corpus"] = {
    "docs": N, "families": N_BASE, "copies": N_COPIES, "words_per_doc": N_WORDS,
    "shingles_mean": float(sizes.mean()), "pairs": int(len(Jf)),
    "pairs_jaccard_positive": int(np.sum(Jf > 0)),
    "near_dup_pairs_truth": int(tru.sum()),
    "near_dup_pairs_cross_family": cross_family_truth,
    "identical_pairs": int(np.sum(Jf == 1.0)),
}
out["variant_jaccard_mean"] = {
    str(r): float(np.mean([J[f * (len(RATES) + 1), f * (len(RATES) + 1) + k + 1] for f in range(N_BASE)]))
    for k, r in enumerate(RATES)
}

# ---- MinHash signatures ------------------------------------------------------
K, PRIME = 128, 2**31 - 1
A = rng.integers(1, PRIME, size=K)
B = rng.integers(0, PRIME, size=K)

def signature(sh):
    x = np.array([zlib.crc32(s.encode()) % PRIME for s in sh], dtype=np.int64)
    h = (A[:, None] * x[None, :] + B[:, None]) % PRIME
    return h.min(axis=1)

SIG = np.stack([signature(s) for s in S])

# estimator check on pairs whose true Jaccard lies in [0.3, 0.7]
mid = np.where((Jf >= 0.3) & (Jf <= 0.7))[0]
ii, jj = iu[0][mid], iu[1][mid]
est = (SIG[ii] == SIG[jj]).mean(axis=1)
err = est - Jf[mid]
out["estimator"] = {
    "k": K, "pairs_checked": int(len(mid)),
    "bias": float(err.mean()), "std_error": float(err.std()),
    "std_theory_at_J05": float(np.sqrt(0.25 / K)),
    "mean_abs_error": float(np.abs(err).mean()),
}

# ---- LSH banding ---------------------------------------------------------------
def lsh_pairs(b, r):
    cand = set()
    for band in range(b):
        buckets = {}
        for i in range(N):
            key = SIG[i, band * r:(band + 1) * r].tobytes()
            buckets.setdefault(key, []).append(i)
        for ids in buckets.values():
            for x in range(len(ids)):
                for y in range(x + 1, len(ids)):
                    cand.add((ids[x], ids[y]))
    return cand

def p_cand(s, b, r):
    return 1.0 - (1.0 - s ** r) ** b

sweep = []
cand_32_4 = None
for b, r in [(64, 2), (32, 4), (16, 8), (8, 16)]:
    cand = lsh_pairs(b, r)
    if (b, r) == (32, 4):
        cand_32_4 = cand
    cm = np.zeros((N, N), bool)
    for i, j in cand:
        cm[i, j] = True
    ver = {(i, j) for (i, j) in cand if (SIG[i] == SIG[j]).mean() >= NEAR}
    vm = np.zeros((N, N), bool)
    for i, j in ver:
        vm[i, j] = True
    tp = int(np.sum(cm & T)); vtp = int(np.sum(vm & T))
    sweep.append({
        "b": b, "r": r, "threshold_approx": float((1.0 / b) ** (1.0 / r)),
        "candidates": len(cand), "precision": tp / len(cand), "recall": tp / int(tru.sum()),
        "verified": len(ver), "verified_precision": vtp / len(ver), "verified_recall": vtp / int(tru.sum()),
    })
out["lsh_sweep"] = sweep

# S-curve for (b, r) = (32, 4): measured candidate rate per Jaccard bin
cm = np.zeros((N, N), bool)
for i, j in cand_32_4:
    cm[i, j] = True
cf = cm[iu]
bins = []
for lo in np.arange(0.0, 1.0, 0.1):
    hi = lo + 0.1
    sel = (Jf > lo - 1e-12) & (Jf <= hi + 1e-12) if lo > 0 else (Jf >= 0) & (Jf <= hi + 1e-12) & (Jf > 0)
    n = int(sel.sum())
    bins.append({
        "lo": round(float(lo), 1), "hi": round(float(hi), 1), "pairs": n,
        "candidate_rate": float(cf[sel].mean()) if n else None,
        "theory_mean": float(p_cand(Jf[sel], 32, 4).mean()) if n else None,
    })
out["s_curve_32_4"] = bins

# ---- quality classifier: reference vs crawl, naive Bayes ---------------------
VOC = VOCAB + BOILER
V = len(VOC)
def doc_ids(n, f):
    base = rng.choice(len(VOCAB), size=n, p=P)
    boil = rng.random(n) < f
    return np.where(boil, len(VOCAB) + rng.integers(0, len(BOILER), size=n), base)

ref = [doc_ids(100, 0.0) for _ in range(800)]
f_crawl = np.where(rng.random(800) < 0.1, 0.0, rng.uniform(0, 1, size=800))
crawl = [doc_ids(100, f) for f in f_crawl]
ref_tr, ref_te = ref[:600], ref[600:]
cr_tr, cr_te = crawl[:600], crawl[600:]
f_cr_te = f_crawl[600:]

def counts(docs_):
    c = np.zeros(V)
    for d in docs_:
        c += np.bincount(d, minlength=V)
    return c

c_r, c_c = counts(ref_tr), counts(cr_tr)
llr = np.log((c_r + 1) / (c_r.sum() + V)) - np.log((c_c + 1) / (c_c.sum() + V))
s_ref = np.array([llr[d].sum() for d in ref_te])
s_cr = np.array([llr[d].sum() for d in cr_te])
auc = float(np.mean((s_ref[:, None] > s_cr[None, :]) + 0.5 * (s_ref[:, None] == s_cr[None, :])))
qual = []
for keep in [0.90, 0.95, 0.99]:
    tau = float(np.quantile(s_ref, 1 - keep))
    kept_cr = s_cr >= tau
    qual.append({
        "reference_kept": float(np.mean(s_ref >= tau)), "tau": tau,
        "crawl_kept": float(kept_cr.mean()),
        "mean_boiler_fraction_all_crawl": float(f_cr_te.mean()),
        "mean_boiler_fraction_kept_crawl": float(f_cr_te[kept_cr].mean()) if kept_cr.any() else None,
    })
out["quality"] = {"auc": auc, "test_docs_per_class": 200, "operating_points": qual}

if "__file__" in globals():  # the lesson checker runs this block through exec, without a file path
    with open(__file__.replace("_experiment.py", "_data.json"), "w") as fh:
        json.dump(out, fh, indent=1)
c = out["corpus"]; e = out["estimator"]
print(f"corpus: {c['docs']} docs, {c['pairs']:,} pairs, {c['near_dup_pairs_truth']:,} near-dup pairs (J>=0.5), cross-family {c['near_dup_pairs_cross_family']}, identical {c['identical_pairs']}")
print(f"estimator (k={e['k']}, {e['pairs_checked']:,} pairs with J in [0.3,0.7]): bias {e['bias']:+.4f}, std {e['std_error']:.4f} (theory {e['std_theory_at_J05']:.4f})")
for row in out["lsh_sweep"]:
    print(f"b={row['b']:>2} r={row['r']:>2} t~{row['threshold_approx']:.3f} cand={row['candidates']:>5} raw P={row['precision']:.3f} R={row['recall']:.3f} | verified n={row['verified']:>5} P={row['verified_precision']:.3f} R={row['verified_recall']:.3f}")
for b_ in out["s_curve_32_4"]:
    if b_["pairs"]: print(f"J in [{b_['lo']:.1f},{b_['hi']:.1f}): pairs={b_['pairs']:>6} measured={b_['candidate_rate']:.3f} theory={b_['theory_mean']:.3f}")
q = out["quality"]; print(f"quality AUC={q['auc']:.4f}")
for op in q["operating_points"]:
    print(f"keep ref {op['reference_kept']:.2f}: crawl kept {op['crawl_kept']:.3f}, boiler frac kept {op['mean_boiler_fraction_kept_crawl']:.5f} vs all {op['mean_boiler_fraction_all_crawl']:.3f}")
