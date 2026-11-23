import json
from pathlib import Path

import numpy as np

# ---------- fusion methods -------------------------------------------------
def rrf(ranked_lists, k=60):
    """Reciprocal rank fusion: sum of 1/(k + rank) over every list a doc appears in."""
    total = {}
    for ranked in ranked_lists:                # each list: doc ids, best first
        for rank, doc in enumerate(ranked, start=1):
            total[doc] = total.get(doc, 0.0) + 1.0 / (k + rank)
    return total

def min_max(scores):
    """Map {doc: score} to [0, 1] with this list's own min and max."""
    lo, hi = min(scores.values()), max(scores.values())
    if hi == lo:
        return {d: 1.0 for d in scores}
    return {d: (s - lo) / (hi - lo) for d, s in scores.items()}

def convex(lex, dense, alpha=0.5):
    """alpha * norm(lexical) + (1 - alpha) * norm(dense); a doc missing from a list counts as 0."""
    a, b = min_max(lex), min_max(dense)
    return {d: alpha * a.get(d, 0.0) + (1 - alpha) * b.get(d, 0.0) for d in sorted(set(a) | set(b))}

def ranking(scores):
    return sorted(scores, key=lambda d: (-scores[d], d))   # ties broken by id

def best_first(scores):
    return sorted(scores, key=lambda d: -scores[d])

# ---------- A. four-document hand example ----------------------------------
lex = {"A": 12.4, "B": 9.1, "C": 7.7, "D": 3.2}        # BM25-like scores
dense = {"A": 0.79, "B": 0.40, "C": 0.81, "D": 0.52}   # cosine-like scores
lex_order, dense_order = best_first(lex), best_first(dense)
print("lexical order:", lex_order, "| dense order:", dense_order)

raw = {d: lex[d] + dense[d] for d in lex}
print("raw sum      :", {d: round(v, 2) for d, v in raw.items()}, "->", ranking(raw))
rr = rrf([lex_order, dense_order], k=60)
print("RRF k=60     :", {d: round(v, 5) for d, v in rr.items()}, "->", ranking(rr))
cc = convex(lex, dense, alpha=0.5)
print("min-max 0.5  :", {d: round(v, 4) for d, v in cc.items()}, "->", ranking(cc))

# Scale test: multiply the lexical scores by c. Only the raw sum should react.
for c in (1.0, 0.05):
    scaled = {d: c * lex[d] for d in lex}
    r_raw = ranking({d: scaled[d] + dense[d] for d in lex})
    r_rrf = ranking(rrf([best_first(scaled), dense_order], k=60))
    r_mm = ranking(convex(scaled, dense, alpha=0.5))
    print(f"c={c:<5} raw:{r_raw} rrf:{r_rrf} minmax:{r_mm}")

# k sensitivity of one rank's contribution
for k in (0, 10, 60):
    print(f"k={k:<3} contribution of rank 1: {1/(k+1):.4f}  rank 5: {1/(k+5):.4f}  rank 10: {1/(k+10):.4f}")

# ---------- B. simulation with known relevance ------------------------------
# Assumed generative model (not a real benchmark): 1000 docs, 5 relevant per query.
# Lexical score ~ 10 * (1.5 * relevant + N(0,1)), shifted to be >= 0 (BM25-like scale).
# Dense score   ~ 0.5 + 0.1 * (1.2 * relevant + N(0,1)), cosine-like scale.
rng = np.random.default_rng(36)
N_DOCS, N_Q, N_REL, TOP = 1000, 300, 5, 100

def make_query():
    rel = np.zeros(N_DOCS, dtype=bool)
    rel[rng.choice(N_DOCS, N_REL, replace=False)] = True
    lex_s = 10.0 * (1.5 * rel + rng.normal(size=N_DOCS))
    lex_s -= lex_s.min()
    dense_s = 0.5 + 0.1 * (1.2 * rel + rng.normal(size=N_DOCS))
    return rel, lex_s, dense_s

QUERIES = [make_query() for _ in range(N_Q)]

def ndcg10(ranked, relevant):
    dcg = sum(1.0 / np.log2(i + 2) for i, d in enumerate(ranked[:10]) if d in relevant)
    idcg = sum(1.0 / np.log2(i + 2) for i in range(min(len(relevant), 10)))
    return dcg / idcg

def evaluate(c):
    """c scales the lexical scores (a change of units, e.g. BM25 vs. a rescaled BM25)."""
    names = ["lexical only", "dense only", "raw sum", "min-max a=0.5", "RRF k=60"]
    out = {n: [] for n in names}
    top1_agree = 0
    for rel, lex_s, dense_s in QUERIES:
        relevant = set(np.flatnonzero(rel).tolist())
        L = c * lex_s
        t_lex = [int(i) for i in np.argsort(-L, kind="stable")[:TOP]]
        t_den = [int(i) for i in np.argsort(-dense_s, kind="stable")[:TOP]]
        lex_top = {i: float(L[i]) for i in t_lex}
        den_top = {i: float(dense_s[i]) for i in t_den}
        raw_all = {i: float(L[i] + dense_s[i]) for i in range(N_DOCS)}  # raw sum over the full corpus
        mm = convex(lex_top, den_top, alpha=0.5)
        rr_s = rrf([t_lex, t_den], k=60)
        out["lexical only"].append(ndcg10(t_lex, relevant))
        out["dense only"].append(ndcg10(t_den, relevant))
        out["raw sum"].append(ndcg10(ranking(raw_all), relevant))
        out["min-max a=0.5"].append(ndcg10(ranking(mm), relevant))
        out["RRF k=60"].append(ndcg10(ranking(rr_s), relevant))
        top1_agree += ranking(mm)[0] == ranking(rr_s)[0]
    return {n: np.array(v) for n, v in out.items()}, top1_agree / N_Q

base, agree = evaluate(1.0)
print(f"\nmean nDCG@10 over {N_Q} queries (standard error in brackets), lexical scale c=1")
for n, v in base.items():
    print(f"  {n:<15} {v.mean():.3f} (se {v.std(ddof=1)/np.sqrt(N_Q):.3f})")
diff = base["RRF k=60"] - base["min-max a=0.5"]
print(f"  RRF minus min-max: {diff.mean():+.3f} (se {diff.std(ddof=1)/np.sqrt(N_Q):.3f})")
print(f"  top-1 agreement RRF vs min-max: {agree:.2f}")

scale_runs = {c: evaluate(c)[0] for c in (0.1, 1.0, 10.0)}
for c, res in scale_runs.items():
    print(f"  c={c:<5} raw sum {res['raw sum'].mean():.3f}   RRF {res['RRF k=60'].mean():.3f}   min-max {res['min-max a=0.5'].mean():.3f}")
same = all(np.allclose(scale_runs[c]["RRF k=60"], base["RRF k=60"]) and
           np.allclose(scale_runs[c]["min-max a=0.5"], base["min-max a=0.5"]) for c in scale_runs)
print("  RRF and min-max identical across scales:", same)

# ---------- C. dump numbers for the diagrams ----------------------------------
out_path = Path(__file__).resolve().parent / "36.2_data.json"
out_path.write_text(json.dumps({
    "hand": {"lex": lex, "dense": dense, "raw": raw, "rrf": rr, "minmax": cc,
             "lex_order": lex_order, "dense_order": dense_order,
             "raw_rank": ranking(raw), "rrf_rank": ranking(rr), "mm_rank": ranking(cc)},
    "sim": {n: {"mean": float(v.mean()), "se": float(v.std(ddof=1) / np.sqrt(N_Q))} for n, v in base.items()},
    "scale": {str(c): {n: float(v.mean()) for n, v in r.items()} for c, r in scale_runs.items()},
    "diff": {"mean": float(diff.mean()), "se": float(diff.std(ddof=1) / np.sqrt(N_Q))},
    "top1_agree": agree, "same_across_scales": bool(same),
}, indent=2))
