import json, re
import numpy as np

# Toy corpus: 12 short technical passages (ids 0-11).
DOCS = [
    "Gradient descent updates each weight by a small step against the gradient of the loss.",
    "If the learning rate is too large, the loss oscillates or diverges instead of falling.",
    "Adam keeps running averages of the gradient and of its square to scale each step size.",
    "Dropout randomly zeroes activations during training, which reduces overfitting.",
    "Early stopping ends training when the validation loss has stopped improving for a while.",
    "An inverted index maps every term to the list of documents that contain it.",
    "BM25 scores a document by term frequency with saturation and a document length penalty.",
    "Approximate nearest neighbour indexes such as HNSW trade a little recall for much faster search.",
    "Chunk overlap repeats a few tokens between neighbouring chunks so facts at a boundary survive.",
    "A cross-encoder reads the query and the passage together, which is slower but more accurate.",
    "Reciprocal rank fusion merges ranked lists by summing 1 divided by (k plus rank).",
    "Quantization stores weights in fewer bits, such as 8-bit integers, to cut memory use.",
]

# Colloquial queries with vocabulary that does not match the relevant passages.
QUERIES = [
    ("why does my training blow up when I raise the step size", {1}),
    ("how do I stop my network from memorising the training set", {3, 4}),
    ("why did keyword search miss documents that use different words", {5, 6}),
    ("how do I make vector search fast on millions of items", {7}),
    ("what does splitting text into pieces with some repetition achieve", {8}),
    ("how do I make a model smaller in memory", {11}),
]

# Scripted stand-ins for the LM's hypothetical answers (one per query). Written before any run.
HYPO = [
    "A learning rate that is set too high makes each update overshoot the minimum, so the loss oscillates and can diverge.",
    "Overfitting is reduced by regularisation such as dropout, and by early stopping once the validation loss plateaus.",
    "Keyword search uses an inverted index with BM25 scoring, so a document that expresses the same idea in different words is missed.",
    "Approximate nearest neighbour search with an HNSW graph trades a little recall for much faster lookups over millions of vectors.",
    "Overlapping chunks repeat some tokens at each boundary, so a sentence cut in half still appears whole in one chunk.",
    "Quantization stores each weight in fewer bits, such as 8-bit integers, which lowers the memory a model needs.",
]
# A hallucinated hypothesis for query 0: fluent, plausible, and wrong about the cause.
WRONG = "Training blows up when the dataset is too small, so the fix is to collect more labelled examples."

STOP = {"a", "an", "the", "of", "to", "and", "is", "it", "by", "that", "for", "on", "in", "do", "how",
        "why", "my", "i", "what", "does", "when", "which", "with", "so", "are", "as", "be", "each",
        "from", "or", "than", "this", "at", "can", "into", "its", "some", "if", "not", "too", "just",
        "up", "will", "they", "their", "one", "many", "such", "more", "instead"}

def tokens(text):
    return [w for w in re.findall(r"[a-z]+", text.lower()) if w not in STOP]

# Fixed encoder: TF-IDF over the corpus vocabulary, then a rank-K SVD (latent semantic analysis).
vocab = sorted({w for d in DOCS for w in tokens(d)})
idx = {w: i for i, w in enumerate(vocab)}

def bow(text):
    v = np.zeros(len(vocab))
    for w in tokens(text):
        if w in idx:
            v[idx[w]] += 1
    return v

X = np.array([bow(d) for d in DOCS])
df = (X > 0).sum(axis=0)
idf = np.log((1 + len(DOCS)) / (1 + df)) + 1
_, S, Vt = np.linalg.svd(X * idf, full_matrices=False)
energy = np.cumsum(S**2) / np.sum(S**2)
K = int(np.argmax(energy >= 0.8)) + 1      # smallest K keeping at least 80% of the energy
P = Vt[:K].T
print("energy kept by K =", K, ":", round(float(energy[K - 1]), 3))

def embed(text):
    z = (bow(text) * idf) @ P
    n = np.linalg.norm(z)
    return z / n if n > 0 else z

D = np.array([embed(d) for d in DOCS])

def best_relevant(qvec, rel):
    scores = D @ qvec
    order = np.argsort(-scores, kind="stable")
    ranks = {int(d): r + 1 for r, d in enumerate(order)}
    best = min(rel, key=lambda d: ranks[d])
    return ranks[best], float(scores[best])

oov = [sum(w not in idx for w in tokens(h)) / len(tokens(h)) for h in HYPO]
print("vocab size:", len(vocab), " latent dims K:", K)
print("share of hypothesis tokens outside the corpus vocabulary:", round(float(np.mean(oov)), 3))

print("query 4 in-vocab words:", [w for w in tokens(QUERIES[4][0]) if w in idx])
print("hypothesis 4 in-vocab words:", [w for w in tokens(HYPO[4]) if w in idx])

rows = []
for (q, rel), h in zip(QUERIES, HYPO):
    r_q, s_q = best_relevant(embed(q), rel)
    r_h, s_h = best_relevant(embed(h), rel)
    rows.append((r_q, r_h, s_q, s_h))

print("query  rank(query)  rank(HyDE)  cos(query)  cos(HyDE)")
for i, (a, b, s, t) in enumerate(rows):
    print(f"q{i}     {a:>10}  {b:>10}  {s:>10.3f}  {t:>10.3f}")
print("recall@2 query:", sum(a <= 2 for a, *_ in rows), "/", len(rows),
      " HyDE:", sum(b <= 2 for _, b, *_ in rows), "/", len(rows))

rel0 = QUERIES[0][1]
r_w, s_w = best_relevant(embed(WRONG), rel0)
print(f"q0 with hallucinated hypothesis: rank {r_w}, cos {s_w:.3f}")

# Data export for the diagram script (same numbers as printed above).
json.dump({"rows": rows, "wrong": [r_w, s_w], "K": K, "vocab": len(vocab),
           "oov": float(np.mean(oov))},
          open(__file__.rsplit("/", 1)[0] + "/41.1_data.json", "w"), indent=1)
