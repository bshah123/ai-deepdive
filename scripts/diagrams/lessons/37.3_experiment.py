"""Produce every number used in lesson 37.3. Executes the lesson's own first python block, so the
experiment and the lesson cannot drift apart. Writes scripts/diagrams/lessons/37.3_data.json and prints a summary.

Run: <python> scripts/diagrams/lessons/37.3_experiment.py
"""
import json
import pathlib
import re
import statistics

LESSON = pathlib.Path("/Users/bshah/Documents/Trial/Learning/content/part-06-rag/chapter-37-rag-fundamentals/37.3-pure-python-rag.md")
OUT = pathlib.Path(__file__).resolve().parent / "37.3_data.json"

block = re.search(r"```python\n(.*?)```", LESSON.read_text(), re.S).group(1)
ns = {"__name__": "lesson"}                    # skips the __main__ demo block
exec(compile(block, "lesson-block", "exec"), ns)
DOCS, QUERIES, OOC = ns["DOCS"], ns["QUERIES"], ns["OUT_OF_CORPUS"]
RAG, terms, words = ns["RAG"], ns["terms"], ns["words"]
CHUNKINGS = [("10", 10, 2), ("20", 20, 5), ("40", 40, 10), ("80", 80, 20), ("whole", 10**6, 0)]
result = {}


def gold_in(texts, gold):
    g = f" {' '.join(words(gold))} "
    return any(g in f" {' '.join(words(t))} " for t in texts)


# 1. Chunk-size sweep: retrieval success, and whether the gold answer is split across chunks at all
sweep = []
for label, size, overlap in CHUNKINGS:
    rag = RAG(DOCS, size, overlap)
    h1 = h3 = contained = 0
    ctx = []
    for q, gold, _ in QUERIES:
        hits = rag.retrieve(q, 3)
        texts = [h[1] for h in hits]
        h1 += gold_in(texts[:1], gold)
        h3 += gold_in(texts, gold)
        contained += gold_in([c for _, c in rag.chunks], gold)
        ctx.append(sum(len(t.split()) for t in texts))
    total_words = sum(len(t.split()) for _, t in DOCS)
    sweep.append({"size": label, "overlap": overlap, "chunks": len(rag.chunks),
                  "words_per_chunk": round(total_words / len(rag.chunks), 1),
                  "gold_in_some_chunk": contained, "hit_at_1": h1, "hit_at_3": h3,
                  "context_words_mean_top3": round(statistics.mean(ctx), 1)})
result["sweep"] = sweep

# 2. Per-query behaviour at size 40 (BM25) versus the naive overlap baseline on the same chunks
rag = RAG(DOCS, 40, 10)


def naive(query, k=3):
    q = set(terms(query))
    counts = [len(q & set(terms(c))) for _, c in rag.chunks]
    order = sorted(range(len(counts)), key=lambda i: (-counts[i], i))
    return [i for i in order[:k] if counts[i] > 0]


per_query = []
for q, gold, doc in QUERIES:
    hits = rag.retrieve(q, 3)
    bm_ids = [i for i, _ in rag.index.search(q, 3)]
    nv_ids = naive(q, 3)
    per_query.append({
        "query": q, "gold_doc": DOCS[doc][0],
        "bm25_top1_title": hits[0][0] if hits else None,
        "bm25_top1_score": round(hits[0][2], 3) if hits else 0.0,
        "bm25_hit1": gold_in([rag.chunks[i][1] for i in bm_ids[:1]], gold),
        "bm25_hit3": gold_in([rag.chunks[i][1] for i in bm_ids], gold),
        "naive_hit1": gold_in([rag.chunks[i][1] for i in nv_ids[:1]], gold),
        "naive_hit3": gold_in([rag.chunks[i][1] for i in nv_ids], gold),
    })
result["per_query"] = per_query
result["bm25_hit1_total"] = sum(p["bm25_hit1"] for p in per_query)
result["bm25_hit3_total"] = sum(p["bm25_hit3"] for p in per_query)
result["naive_hit1_total"] = sum(p["naive_hit1"] for p in per_query)
result["naive_hit3_total"] = sum(p["naive_hit3"] for p in per_query)

# 3. Abstention: top BM25 score for correct hits, misses and out-of-corpus queries
ok_scores = [p["bm25_top1_score"] for p in per_query if p["bm25_hit3"]]
miss_scores = [p["bm25_top1_score"] for p in per_query if not p["bm25_hit3"]]
ooc_scores = []
for q in OOC:
    top = rag.retrieve(q, 1)
    ooc_scores.append({"query": q, "top1_score": round(top[0][2], 3) if top else 0.0})
result["abstain"] = {"min_correct_top1": min(ok_scores), "max_miss_top1": max(miss_scores),
                     "ooc": ooc_scores, "max_ooc": max(o["top1_score"] for o in ooc_scores)}

# 4. Worked BM25 contributions for query 0 over its top-3 chunks (size 40)
q0 = QUERIES[0][0]
qterms = sorted(set(terms(q0)))
avgdl = rag.index.avgdl
contrib = []
for i, score in rag.index.search(q0, 3):
    dl = rag.index.lengths[i]
    row = {"chunk": rag.chunks[i][0], "dl": dl, "score": round(score, 3), "terms": {}}
    for t in qterms:
        tf = dict(rag.index.postings.get(t, [])).get(i, 0)
        if tf:
            row["terms"][t] = {"tf": tf, "contribution": round(
                rag.index.idf(t) * tf * 2.2 / (tf + 1.2 * (1 - 0.75 + 0.75 * dl / avgdl)), 3)}
    contrib.append(row)
result["q0_terms"] = {t: {"df": len(rag.index.postings.get(t, [])), "idf": round(rag.index.idf(t), 4)} for t in qterms}
result["q0_contrib"] = contrib
result["avgdl_size40"] = round(avgdl, 2)
result["n_chunks_size40"] = len(rag.chunks)
result["annual_idf_size40"] = round(rag.index.idf("annual"), 4)
result["annual_df_size40"] = len(rag.index.postings.get("annual", []))

# 5. Saturation: tf part of BM25 at dl = avgdl and dl = 2 * avgdl (k1 = 1.2, b = 0.75)
sat = {}
for dl_ratio in (1.0, 2.0):
    norm = 1 - 0.75 + 0.75 * dl_ratio
    sat[str(dl_ratio)] = {str(tf): round(tf * 2.2 / (tf + 1.2 * norm), 4) for tf in (1, 2, 4, 8)}
result["saturation"] = sat

# 6. Postings for a small vocabulary slice, whole documents (one chunk per document)
whole = RAG(DOCS, 10**6, 0)
slice_terms = ["annual", "leave", "days", "badge", "budget", "learning"]
result["postings_whole"] = {t: [(whole.chunks[i][0], tf) for i, tf in whole.index.postings.get(t, [])] for t in slice_terms}
result["idf_whole"] = {t: round(whole.index.idf(t), 4) for t in slice_terms}
result["n_docs"] = len(DOCS)

OUT.write_text(json.dumps(result, indent=1))
keys = ("sweep", "bm25_hit1_total", "bm25_hit3_total", "naive_hit1_total", "naive_hit3_total",
        "abstain", "avgdl_size40", "n_chunks_size40", "annual_df_size40", "annual_idf_size40", "idf_whole")
print(json.dumps({k: result[k] for k in keys}, indent=1))
for p in per_query:
    print(p)
print(json.dumps(contrib))
print(json.dumps(result["saturation"]))
print(json.dumps(result["postings_whole"]))
