import re
import numpy as np

docs = [
    "The Zorvex reactor runs at 450 kelvin during normal operation.",
    "Zorvex coolant is a sodium-free salt mixture.",
    "The Halden plant schedules maintenance every 90 days.",
    "Halden plant output peaked at 12 megawatts in 2021.",
    "Quarry basalt is dense and dark grey.",
    "Zorvex reactors were first built in the eastern delta.",
]
queries = {
    "q0": "What temperature does the Zorvex reactor run at?",
    "q1": "How often is maintenance at the Halden plant?",
    "q2": "Write a haiku about rain.",
    "q3": "What is 17 times 3?",
    "q4": "What colour is quarry basalt?",
}
# Stub for the trained Retrieve head: P(Retrieve = yes | query). Hand-set for illustration.
p_retrieve = {"q0": 0.91, "q1": 0.84, "q2": 0.07, "q3": 0.12, "q4": 0.66}
THRESHOLD = 0.2
STOP = {"the", "a", "is", "at", "what", "how", "of", "does", "in", "to", "about"}

def tokens(text):
    out = []
    for w in re.findall(r"[a-z0-9]+", text.lower()):
        if w in STOP:
            continue
        if len(w) > 3 and w.endswith("s"):   # crude plural stripping: runs -> run
            w = w[:-1]
        out.append(w)
    return out

vocab = sorted({w for d in docs for w in tokens(d)})
index = {w: i for i, w in enumerate(vocab)}
N = len(docs)
df = np.zeros(len(vocab))
for d in docs:
    for w in set(tokens(d)):
        df[index[w]] += 1
idf = np.log((1 + N) / (1 + df)) + 1          # smoothed IDF, same formula as scikit-learn

def tfidf(text):
    v = np.zeros(len(vocab))
    for w in tokens(text):
        if w in index:
            v[index[w]] += 1
    v = v * idf
    return v / np.linalg.norm(v) if v.any() else v

D = np.array([tfidf(d) for d in docs])       # each row has unit length

def retrieve(q, k=2):
    scores = D @ tfidf(q)                     # cosine similarity with every passage
    top = np.argsort(-scores, kind="stable")[:k]
    return [(int(i), round(float(scores[i]), 3)) for i in top]

for qid, q in queries.items():
    if p_retrieve[qid] > THRESHOLD:
        print(qid, "top-2 passages (index, cosine):", retrieve(q))

for t in (0.05, 0.2, 0.5, 0.9):
    fired = [q for q in queries if p_retrieve[q] > t]
    print(f"threshold {t:.2f}: retrieve for {len(fired)} of {len(queries)} queries {fired}")

W = {"rel": 1.0, "sup": 1.0, "use": 0.5}      # default critique weights reported for Self-RAG

def score(c):
    s_rel = c["rel"][0] / sum(c["rel"])       # desired value's probability, normalised over the type
    s_sup = c["sup"][0] / sum(c["sup"])
    s_use = c["use"][0] / sum(c["use"])
    S = W["rel"] * s_rel + W["sup"] * s_sup + W["use"] * s_use
    return c["gen"] + S, (s_rel, s_sup, s_use, S)

cands = {
    "A d0 correct":    {"gen": 0.55, "rel": [0.90, 0.10], "sup": [0.70, 0.20, 0.10], "use": [0.60, 0.30, 0.10, 0.00, 0.00]},
    "B d5 off-topic":  {"gen": 0.30, "rel": [0.35, 0.65], "sup": [0.10, 0.30, 0.60], "use": [0.20, 0.30, 0.30, 0.15, 0.05]},
    "C d2 ungrounded": {"gen": 0.40, "rel": [0.15, 0.85], "sup": [0.05, 0.15, 0.80], "use": [0.05, 0.10, 0.25, 0.30, 0.30]},
}
for name, c in cands.items():
    total, (r, s, u, S) = score(c)
    print(f"{name:16s} s_rel={r:.2f} s_sup={s:.2f} s_use={u:.2f} S={S:.3f} total={total:.3f}")
print("selected:", max(cands, key=lambda n: score(cands[n])[0]))

# Failure case: the critic is confidently wrong about candidate C.
wrong = dict(cands)
wrong["C d2 ungrounded"] = {"gen": 0.40, "rel": [0.99, 0.01], "sup": [0.99, 0.005, 0.005], "use": [0.90, 0.05, 0.03, 0.01, 0.01]}
for name in wrong:
    total, (r, s, u, S) = score(wrong[name])
    print(f"{name:16s} s_rel={r:.3f} s_sup={s:.3f} s_use={u:.2f} S={S:.3f} total={total:.3f}")
print("selected after critic error:", max(wrong, key=lambda n: score(wrong[n])[0]))

# ---- experiment-only checks and data dump (not in the lesson) ----
import json, sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
sk = TfidfVectorizer(analyzer=tokens)
M = sk.fit_transform(docs).toarray()
print("sklearn version", sklearn.__version__, "| max |D - sklearn| =", float(np.abs(D - M).max()), "| same vocab:", list(sk.get_feature_names_out()) == vocab)
gated = {q: retrieve(queries[q]) for q in queries if p_retrieve[q] > THRESHOLD}
sweep = {str(t): [q for q in queries if p_retrieve[q] > t] for t in (0.05, 0.2, 0.5, 0.9)}
sc = {n: score(c)[0] for n, c in cands.items()}
sc_wrong = {n: score(c)[0] for n, c in wrong.items()}
parts = {n: list(score(c)[1]) for n, c in cands.items()}
parts_wrong = {n: list(score(c)[1]) for n, c in wrong.items()}
json.dump({"docs": docs, "queries": queries, "p_retrieve": p_retrieve, "gated_top2": gated, "sweep": sweep,
           "cands": {n: {"gen": c["gen"], "rel": c["rel"], "sup": c["sup"], "use": c["use"]} for n, c in cands.items()},
           "parts": parts, "totals": sc, "parts_wrong": parts_wrong, "totals_wrong": sc_wrong,
           "selected": max(sc, key=sc.get), "selected_wrong": max(sc_wrong, key=sc_wrong.get),
           "weights": W, "threshold": THRESHOLD},
          open("/Users/bshah/Documents/Trial/Learning/scripts/diagrams/lessons/41.2_data.json", "w"), indent=1)
