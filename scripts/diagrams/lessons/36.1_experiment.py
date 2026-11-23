# Lesson 36.1 experiment: BM25 (lexical) vs LSA (a dense stand-in) on a tiny hand-written corpus.
# NumPy and the standard library only, so the same code runs in the lesson's in-browser Python.
import re
import json
import sys
import numpy as np

DOCS = [
    "Replace the brake pads when the rotor shows scoring and the pedal feels soft.",
    "Winter tyres grip better on snow and ice than summer tyres because of softer rubber.",
    "Wheel slip on frozen roads is reduced by lowering speed and leaving more distance.",
    "Error E4471 means the firmware failed its checksum; reflash the controller image.",
    "The controller reports error code E4417 when the sensor cable is disconnected.",
    "Regular oil changes extend engine life and keep the engine running smoothly.",
    "Skidding on black ice happens when the road temperature falls below freezing.",
    "Snow chains improve traction for trucks driving up mountain passes in winter.",
    "Brake fluid absorbs water over time, which lowers its boiling point.",
    "Cruise control holds a constant speed on motorway driving and saves fuel.",
    "Traction control cuts engine power when the wheels spin on a slippery surface.",
    "Battery terminals corroded with white powder should be cleaned with baking soda.",
]

# (id, query, indices of relevant documents). Relevance was written by hand before any scoring.
QUERIES = [
    ("A", "avoid losing traction in icy weather", {2, 6, 10}),
    ("B", "error E4471", {3}),
    ("C", "controller error code 4471", {3}),
    ("D", "winter tyres grip on snow", {1, 7}),
    ("E", "wheels spin on slippery surface", {10}),
    ("F", "clean corroded battery terminals", {11}),
    ("G", "how often to service the engine", {5}),
    ("H", "keep steady speed on motorway", {9}),
    ("I", "brake pads and brake fluid", {0, 8}),
    ("J", "snow chains for trucks in mountains", {7}),
]

K1, B = 1.2, 0.75   # common BM25 defaults (widely used, e.g. in Lucene); not tuned


def tokens(text):
    """Lowercase, split on anything that is not a letter or digit. No stemming."""
    return re.findall(r"[a-z0-9]+", text.lower())


def bm25_scores(query, docs_tok, k1=K1, b=B):
    n = len(docs_tok)
    avgdl = np.mean([len(d) for d in docs_tok])
    scores = np.zeros(n)
    for t in set(tokens(query)):
        df = sum(t in d for d in docs_tok)
        if df == 0:
            continue                              # term never seen: contributes nothing
        idf = np.log(1 + (n - df + 0.5) / (df + 0.5))
        for i, d in enumerate(docs_tok):
            tf = d.count(t)
            if tf:
                norm = k1 * (1 - b + b * len(d) / avgdl)
                scores[i] += idf * tf * (k1 + 1) / (tf + norm)
    return scores


def build_lsa(docs_tok, k):
    vocab = sorted({t for d in docs_tok for t in d})
    col = {t: j for j, t in enumerate(vocab)}
    n = len(docs_tok)
    counts = np.zeros((n, len(vocab)))
    for i, d in enumerate(docs_tok):
        for t in d:
            counts[i, col[t]] += 1
    df = (counts > 0).sum(axis=0)
    idf = np.log(n / df) + 1.0                    # smoothed idf, as in scikit-learn
    X = counts * idf
    X = X / np.linalg.norm(X, axis=1, keepdims=True)   # unit-length rows
    _, _, Vt = np.linalg.svd(X, full_matrices=False)
    P = Vt[:k].T                                  # vocab x k projection
    return col, idf, P, X @ P                     # documents as k-dimensional vectors


def lsa_scores(query, lsa):
    col, idf, P, doc_lat = lsa
    q = np.zeros(len(col))
    for t in tokens(query):
        if t in col:
            q[col[t]] += idf[col[t]]
    if not q.any():
        return np.zeros(len(doc_lat))
    q_lat = q @ P                                 # fold the query into the same k dimensions
    denom = np.linalg.norm(doc_lat, axis=1) * np.linalg.norm(q_lat) + 1e-12
    return doc_lat @ q_lat / denom                # cosine similarity


def best_rank(scores, rel):
    """1 = top. Pessimistic on ties: a document ties with everything it equals or beats."""
    return min(int(np.sum(scores >= scores[r])) for r in rel)


docs_tok = [tokens(d) for d in DOCS]
N = len(DOCS)
avgdl = float(np.mean([len(d) for d in docs_tok]))
K_DIMS = 4
lsa = build_lsa(docs_tok, K_DIMS)

print(f"N = {N} documents, average length avgdl = {avgdl:.3f} tokens, vocabulary = {len(lsa[0])} terms")
print(f"BM25 k1 = {K1}, b = {B}; LSA k = {K_DIMS} dimensions")

# Hand-check target: the term e4471 in document 3
df_e = sum("e4471" in d for d in docs_tok)
idf_e = np.log(1 + (N - df_e + 0.5) / (df_e + 0.5))
tf_e = docs_tok[3].count("e4471")
len_e = len(docs_tok[3])
term = idf_e * tf_e * (K1 + 1) / (tf_e + K1 * (1 - B + B * len_e / avgdl))
print(f"hand-check term e4471 in doc 3: df={df_e} idf={idf_e:.4f} tf={tf_e} |d|={len_e} contribution={term:.4f}")

print()
print("query  BM25 rank  LSA rank  BM25 top  LSA top  query")
results = []
for qid, qtext, rel in QUERIES:
    bm = bm25_scores(qtext, docs_tok)
    ls = lsa_scores(qtext, lsa)
    rb, rl = best_rank(bm, rel), best_rank(ls, rel)
    results.append({"id": qid, "query": qtext, "rel": sorted(rel), "bm25": bm.tolist(), "lsa": ls.tolist(), "rank_bm25": rb, "rank_lsa": rl})
    print(f"{qid:<6} {rb:>9}  {rl:>8}  {int(np.argmax(bm)):>8}  {int(np.argmax(ls)):>7}  {qtext}")

mrr_bm = float(np.mean([1 / r["rank_bm25"] for r in results]))
mrr_ls = float(np.mean([1 / r["rank_lsa"] for r in results]))
print(f"\nMRR (mean reciprocal rank) BM25 = {mrr_bm:.3f}   LSA k={K_DIMS} = {mrr_ls:.3f}")

print("\nLSA sensitivity to k:")
sens = {}
for k in (2, 4, 6, 8):
    L = build_lsa(docs_tok, k)
    ranks = [best_rank(lsa_scores(q, L), rel) for _, q, rel in QUERIES]
    sens[k] = float(np.mean([1 / r for r in ranks]))
    print(f"  k={k}: MRR = {sens[k]:.3f}  ranks = {ranks}")

print("\nQuery A, all documents (score BM25 | LSA):")
for i in range(N):
    print(f"  doc {i:>2}: {results[0]['bm25'][i]:.4f} | {results[0]['lsa'][i]:+.4f}  {DOCS[i][:60]}")

if len(sys.argv) > 1:
    out = {"queries": results, "mrr_bm25": mrr_bm, "mrr_lsa": mrr_ls, "lsa_sensitivity": sens,
           "avgdl": avgdl, "docs": DOCS, "k_dims": K_DIMS}
    with open(sys.argv[1], "w") as f:
        json.dump(out, f, indent=1, default=float)
