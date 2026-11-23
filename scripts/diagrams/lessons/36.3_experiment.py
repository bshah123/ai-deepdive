import math
from collections import Counter, defaultdict
import numpy as np

rng = np.random.default_rng(36)


def unit(v):
    return v / np.linalg.norm(v)


# ---- 1. A controlled corpus: every query has known relevant documents ----
N_DOCS, N_CONCEPTS, WORDS_PER_CONCEPT, N_BG, DIM = 3000, 50, 60, 200, 32
N_CATEGORIES, NOISE = 10, 0.25

concept_vec = np.stack([unit(v) for v in rng.standard_normal((N_CONCEPTS, DIM))])

# Simulated embedder: a word's vector is its concept vector plus noise,
# so synonyms land close together but not on top of each other.
word_vec = {}
for c in range(N_CONCEPTS):
    for j in range(WORDS_PER_CONCEPT):
        word_vec[f"c{c}w{j}"] = unit(concept_vec[c] + NOISE * rng.standard_normal(DIM))
for j in range(N_BG):
    word_vec[f"bg{j}"] = unit(rng.standard_normal(DIM))

doc_tokens, doc_concept, doc_cat, doc_words = [], [], [], []
for d in range(N_DOCS):
    c = d % N_CONCEPTS
    words = rng.choice(WORDS_PER_CONCEPT, size=8, replace=False)   # 8 of the concept's 60 words
    toks = [f"c{c}w{j}" for j in words[rng.integers(8, size=25)]]
    toks += [f"bg{rng.integers(N_BG)}" for _ in range(8)]
    sku = f"SKU{d:05d}"
    word_vec[sku] = unit(rng.standard_normal(DIM))                  # an identifier carries no concept
    toks.append(sku)
    doc_tokens.append(toks)
    doc_concept.append(c)
    doc_cat.append(int(rng.integers(N_CATEGORIES)))
    doc_words.append(words)
doc_cat_arr = np.array(doc_cat)

# ---- 2. Queries: 100 one-word topic queries, 100 identifier queries ----
queries = []   # (kind, query tokens, relevant doc ids)
for c in range(N_CONCEPTS):
    relevant = {d for d in range(N_DOCS) if doc_concept[d] == c}
    for _ in range(2):
        queries.append(("topic", [f"c{c}w{rng.integers(WORDS_PER_CONCEPT)}"], relevant))
for d in rng.choice(N_DOCS, size=100, replace=False):
    d = int(d)
    word = f"c{doc_concept[d]}w{rng.choice(doc_words[d])}"
    queries.append(("identifier", [f"SKU{d:05d}", word], {d}))
filter_cats = [int(rng.integers(N_CATEGORIES)) for _ in queries]


# ---- 3. Indexes: lexical (BM25) and dense (exact and IVF) ----
def tokens_to_vec(tokens):
    """Simulated bi-encoder: mean-pool the word vectors, then normalise."""
    return unit(np.mean([word_vec[t] for t in tokens], axis=0))


class BM25:
    """Okapi BM25 over an inverted index: term -> list of (doc, term frequency)."""

    def __init__(self, docs, k1=1.2, b=0.75):
        self.k1, self.b, self.N = k1, b, len(docs)
        self.len = np.array([len(t) for t in docs], dtype=float)
        self.avglen = self.len.mean()
        self.postings = defaultdict(list)
        for i, toks in enumerate(docs):
            for term, tf in Counter(toks).items():
                self.postings[term].append((i, tf))

    def scores(self, query_terms):
        s = np.zeros(self.N)
        for term in set(query_terms):
            plist = self.postings.get(term, [])
            if not plist:
                continue
            df = len(plist)
            idf = math.log(1 + (self.N - df + 0.5) / (df + 0.5))
            for i, tf in plist:
                norm = self.k1 * (1 - self.b + self.b * self.len[i] / self.avglen)
                s[i] += idf * tf * (self.k1 + 1) / (tf + norm)
        return s


def kmeans(X, k, iters=15):
    C = X[rng.choice(len(X), size=k, replace=False)].copy()
    for _ in range(iters):
        assign = np.argmax(X @ C.T, axis=1)
        for j in range(k):
            members = X[assign == j]
            if len(members):
                C[j] = members.mean(axis=0)
        C = np.stack([unit(c) for c in C])
    return C, np.argmax(X @ C.T, axis=1)


class IVFFlat:
    """Inverted file: k-means cells; exact scoring only inside the nprobe nearest cells."""

    def __init__(self, X, nlist):
        self.X = X
        self.C, assign = kmeans(X, nlist)
        self.lists = [np.flatnonzero(assign == j) for j in range(nlist)]

    def candidates(self, q, nprobe):
        cells = np.argsort(-(self.C @ q), kind="stable")[:nprobe]
        ids = np.concatenate([self.lists[j] for j in cells])
        return ids, self.X[ids] @ q


docs_vec = np.stack([tokens_to_vec(t) for t in doc_tokens])
bm25 = BM25(doc_tokens)
ivf = IVFFlat(docs_vec, nlist=64)

# ---- 4. Retrieval stages and fusion ----
DEPTH = 100      # candidates kept from each retriever before fusion
K_RRF = 60       # RRF constant (see Lesson 36.2)


def ranked(scores, depth, positive_only=False):
    order = np.argsort(-scores, kind="stable")
    if positive_only:
        order = order[scores[order] > 0]
    return order[:depth]


def lexical(q, allowed=None, depth=DEPTH):
    s = bm25.scores(q)
    if allowed is not None:
        s = np.where(allowed, s, -np.inf)
    return ranked(s, depth, positive_only=True)


def dense_exact(q, allowed=None, depth=DEPTH):
    s = docs_vec @ tokens_to_vec(q)
    if allowed is not None:
        s = np.where(allowed, s, -np.inf)
    return ranked(s, depth)


def dense_ivf(q, nprobe, allowed=None, depth=DEPTH):
    """Returns (ranked ids, number of vectors scored before any filter)."""
    ids, sc = ivf.candidates(tokens_to_vec(q), nprobe)
    scanned = len(ids)
    if allowed is not None:
        keep = allowed[ids]
        ids, sc = ids[keep], sc[keep]
    return ids[np.argsort(-sc, kind="stable")][:depth], scanned


def rrf(lists, k=K_RRF):
    score = defaultdict(float)
    for ranking in lists:
        for r, d in enumerate(ranking, start=1):
            score[int(d)] += 1.0 / (k + r)
    return sorted(score.items(), key=lambda kv: (-kv[1], kv[0]))


def hybrid(q, nprobe, allowed=None, depth=DEPTH, k=10):
    den, scanned = dense_ivf(q, nprobe, allowed, depth)
    fused = rrf([lexical(q, allowed, depth), den])
    return [d for d, _ in fused][:k], scanned


def hybrid_exact(q, k=10):
    fused = rrf([lexical(q), dense_exact(q)])
    return [d for d, _ in fused][:k]


# ---- 5. Metrics ----
def ndcg10(ranking, relevant):
    dcg = sum(1 / math.log2(r + 2) for r, d in enumerate(ranking[:10]) if int(d) in relevant)
    idcg = sum(1 / math.log2(r + 2) for r in range(min(len(relevant), 10)))
    return dcg / idcg


def mean_ndcg(system, kind=None):
    vals = [ndcg10(system(q), rel) for k_, q, rel in queries if kind in (None, k_)]
    return float(np.mean(vals))


RESULTS = {}

# ---- 6. Experiment 1: which retriever, which query type ----
systems = {
    "random ranking": lambda q: rng.permutation(N_DOCS),
    "BM25 (lexical)": lambda q: lexical(q),
    "dense, exact cosine": lambda q: dense_exact(q),
    "dense, IVF nprobe=8": lambda q: dense_ivf(q, 8)[0],
    "hybrid, BM25 + exact dense": lambda q: hybrid_exact(q),
    "hybrid, BM25 + IVF nprobe=8": lambda q: hybrid(q, 8)[0],
}
print(f"{N_DOCS} docs, {N_CONCEPTS} topics; queries: "
      f"{sum(k == 'topic' for k, _, _ in queries)} topic, "
      f"{sum(k == 'identifier' for k, _, _ in queries)} identifier")
print(f"{'system':<30}{'topic':>8}{'identifier':>12}{'all':>8}")
RESULTS["table1"] = {}
for name, fn in systems.items():
    t, i, a = mean_ndcg(fn, "topic"), mean_ndcg(fn, "identifier"), mean_ndcg(fn)
    RESULTS["table1"][name] = [t, i, a]
    print(f"{name:<30}{t:8.3f}{i:12.3f}{a:8.3f}")

# ---- 7. Experiment 2: how much of the corpus must the ANN scan? ----
print(f"\n{'nprobe':>6}{'scanned':>9}{'recall@100':>12}{'hybrid nDCG':>13}")
RESULTS["nprobe"] = []
for nprobe in [1, 2, 4, 8, 16, 32]:
    scanned, recall = [], []
    for _, q, _ in queries:
        exact = set(dense_exact(q).tolist())
        ids, n = dense_ivf(q, nprobe)
        scanned.append(n)
        recall.append(len(exact & set(ids.tolist())) / len(exact))
    h = mean_ndcg(lambda q: hybrid(q, nprobe)[0])
    frac = float(np.mean(scanned)) / N_DOCS
    RESULTS["nprobe"].append([nprobe, frac, float(np.mean(recall)), h])
    print(f"{nprobe:>6}{frac:9.1%}{np.mean(recall):12.3f}{h:13.3f}")

# ---- 8. Experiment 3: metadata filter keeping 10% of docs ----
def post_filter(q, allowed, depth):
    den, _ = dense_ivf(q, 8, None, depth)
    fused = rrf([lexical(q, None, depth), den])
    return [d for d, _ in fused if allowed[d]][:10]


def pre_filter(q, allowed, depth):
    return hybrid(q, 8, allowed, depth)[0]


print(f"\n{'filter strategy':<30}{'returned/10':>12}{'full 10':>9}{'nDCG@10':>9}")
RESULTS["filter"] = []
for label, fn in [("post-filter, candidates=10", lambda q, a: post_filter(q, a, 10)),
                  ("post-filter, candidates=100", lambda q, a: post_filter(q, a, 100)),
                  ("pre-filter, candidates=100", lambda q, a: pre_filter(q, a, 100))]:
    counts, full, nd = [], [], []
    for (kind, q, rel), cat in zip(queries, filter_cats):
        if kind != "topic":
            continue
        allowed = doc_cat_arr == cat
        out = fn(q, allowed)
        counts.append(len(out))
        full.append(len(out) == 10)
        nd.append(ndcg10(out, {d for d in rel if allowed[d]}))
    RESULTS["filter"].append([label, float(np.mean(counts)), float(np.mean(full)), float(np.mean(nd))])
    print(f"{label:<30}{np.mean(counts):12.2f}{np.mean(full):9.0%}{np.mean(nd):9.3f}")

# ---- 9. Worked example: one identifier query through every stage ----
_, q, rel = next(x for x in queries if x[0] == "identifier")
target = next(iter(rel))
lex_full = lexical(q)
den_full, _ = dense_ivf(q, 8)


def rank_of(lst, d):
    hits = np.flatnonzero(np.asarray(lst) == d)
    return int(hits[0]) + 1 if len(hits) else None


fused = rrf([lex_full, den_full])[:5]
print(f"\nquery {q}, target doc {target}")
print("target rank in BM25 list:", rank_of(lex_full, target),
      "| in dense IVF list:", rank_of(den_full, target))
for d, s in fused:
    print(f"  doc {d:4d}: BM25 rank {rank_of(lex_full, d)}, dense rank {rank_of(den_full, d)}, RRF {s:.5f}")
RESULTS["example"] = {"target": int(target),
                      "ranks": [rank_of(lex_full, target), rank_of(den_full, target)],
                      "fused_top5": [[int(d), float(s)] for d, s in fused]}


# ---- 10. Experiment 4: weight the BM25 list, tuned on half the queries ----
def weighted_hybrid(q, nprobe, w, k=10):
    """RRF where the BM25 list counts w times as much as the dense list."""
    den, _ = dense_ivf(q, nprobe)
    score = defaultdict(float)
    for r, d in enumerate(lexical(q), start=1):
        score[int(d)] += w / (K_RRF + r)
    for r, d in enumerate(den, start=1):
        score[int(d)] += 1.0 / (K_RRF + r)
    return [d for d, _ in sorted(score.items(), key=lambda kv: (-kv[1], kv[0]))][:k]


# Self-check: w = 1 must reproduce the unweighted hybrid exactly.
assert all(weighted_hybrid(q, 8, 1.0) == hybrid(q, 8)[0] for _, q, _ in queries)

tune = [x for i, x in enumerate(queries) if i % 2 == 0]
held = [x for i, x in enumerate(queries) if i % 2 == 1]


def score_on(split, fn, kind=None):
    return float(np.mean([ndcg10(fn(q), rel) for k_, q, rel in split if kind in (None, k_)]))


grid = [0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 20.0]
best_w = max(grid, key=lambda w: score_on(tune, lambda q: weighted_hybrid(q, 8, w)))
print(f"\nselected on tuning half: w = {best_w}")
print(f"{'system (held-out half)':<28}{'topic':>8}{'identifier':>12}{'all':>8}")
RESULTS["weights"] = {"selected": best_w, "rows": []}
rows = [("BM25 alone", lambda q: lexical(q))] + [
    (f"weighted RRF, w={w}", (lambda w: lambda q: weighted_hybrid(q, 8, w))(w)) for w in grid]
for name, fn in rows:
    t, i, a = score_on(held, fn, "topic"), score_on(held, fn, "identifier"), score_on(held, fn)
    RESULTS["weights"]["rows"].append([name, t, i, a])
    print(f"{name:<28}{t:8.3f}{i:12.3f}{a:8.3f}")
