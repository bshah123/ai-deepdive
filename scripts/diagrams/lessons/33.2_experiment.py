"""Experiment for lesson 33.2 (BM25). Prints every number used in the lesson
and writes them to 33.2_numbers.json, which the diagram script reads."""
import json, math, os, sys

K1, B = 1.2, 0.75

def idf_lucene(n, N):          # Lucene BM25Similarity form
    return math.log(1 + (N - n + 0.5) / (n + 0.5))

def idf_rsj(n, N):             # Robertson-Sparck Jones form (can be negative)
    return math.log((N - n + 0.5) / (n + 0.5))

def tf_component(f, dl, avgdl, k1=K1, b=B):
    norm = k1 * (1 - b + b * dl / avgdl)
    return f * (k1 + 1) / (f + norm)

def run(docs, query, k1=K1, b=B):
    N = len(docs)
    avgdl = sum(len(d) for d in docs.values()) / N
    df = {t: sum(1 for d in docs.values() if t in d) for t in query}
    scores, parts = {}, {}
    for name, d in docs.items():
        parts[name] = {}
        for t in query:
            f = d.count(t)
            parts[name][t] = 0.0 if f == 0 else idf_lucene(df[t], N) * tf_component(f, len(d), avgdl, k1, b)
        scores[name] = sum(parts[name].values())
    return N, avgdl, df, parts, scores

docs = {"d1": "cat cat dog bird".split(), "d2": "cat fish owl owl".split(),
        "d3": "dog dog dog fish".split(), "d4": "bird fish owl whale".split()}
N, avgdl, df, parts, scores = run(docs, ["cat", "dog"])
print("N", N, "avgdl", avgdl, "df", df)
print("idf lucene", {t: round(idf_lucene(df[t], N), 4) for t in df}, "rsj", {t: idf_rsj(df[t], N) for t in df})
for k, v in parts.items():
    print(k, {t: round(x, 4) for t, x in v.items()}, "score", round(scores[k], 4))
ranking = sorted(scores, key=lambda k: -scores[k])
print("ranking", ranking)

# Saturation, document length equal to avgdl (norm = k1)
sat = [{"f": f, "linear": f, "bm25": tf_component(f, 4, 4)} for f in range(0, 21)]
print("sat f=1..5", [round(r["bm25"], 4) for r in sat[1:6]], "f=10", round(sat[10]["bm25"], 4), "f=20", round(sat[20]["bm25"], 4), "ceiling", K1 + 1)

# k1 sensitivity (length = avgdl)
k1_tab = {str(k1): [round(tf_component(f, 4, 4, k1=k1), 4) for f in (1, 2, 5, 10)] for k1 in (0.0, 1.2, 3.0)}
print("k1 table f=1,2,5,10", k1_tab)

# Length normalization: f=2, r = |D|/avgdl, b in {0, 0.75, 1}
len_tab = {str(b): {str(r): round(tf_component(2, r * 4, 4, b=b), 4) for r in (0.5, 1.0, 2.0)} for b in (0.0, 0.75, 1.0)}
print("length table", len_tab)

# IDF forms, N = 1000
idf_N = 1000
idf_rows = []
for n in (1, 10, 100, 250, 500, 750, 900, 999):
    idf_rows.append({"n": n, "rsj": round(idf_rsj(n, idf_N), 4), "lucene": round(idf_lucene(n, idf_N), 4),
                     "closed_form_ok": abs(idf_lucene(n, idf_N) - math.log((idf_N + 1) / (n + 0.5))) < 1e-12})
print("idf rows", idf_rows)
print("rsj at n=N/2 is", idf_rsj(500, 1000))

# Old lesson's 3-document example, recomputed (its printed scores were not produced by its code)
old = {"d1": "apple apple banana orange".split(), "d2": "apple banana banana orange".split(),
       "d3": "apple banana orange orange".split()}
o_N, o_avg, o_df, o_parts, o_scores = run(old, ["apple", "banana"])
print("old example: avgdl", o_avg, "df", o_df, "scores", {k: round(v, 4) for k, v in o_scores.items()},
      "lucene idf apple", round(idf_lucene(3, 3), 4), "rsj idf apple", round(idf_rsj(3, 3), 4))

out = {"N": N, "avgdl": avgdl, "df": df, "idf": {t: idf_lucene(df[t], N) for t in df},
       "parts": parts, "scores": scores, "ranking": ranking,
       "sat": sat, "k1_tab": k1_tab, "len_tab": len_tab, "idf_rows": idf_rows,
       "old_scores": o_scores, "old_idf_rsj_apple": idf_rsj(3, 3), "old_idf_lucene_apple": idf_lucene(3, 3)}
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "33.2_numbers.json"), "w") as fh:
    json.dump(out, fh, indent=1)
print("wrote 33.2_numbers.json")
