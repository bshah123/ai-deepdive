"""Experiment for lesson 49.2: numbers used in the lesson text and diagrams.

Stand-in embedding: hashed unigrams + bigrams (no model weights, no network). It has NO
paraphrase knowledge, so the recall split below shows what lexical overlap can and cannot do.
Recency follows Park et al. (2023): exponential decay 0.995 per hour; facts are timeless (1.0).
Importance is hand-assigned 1-10 here (Park asks an LLM). All three terms are min-max
normalised over the store and summed with weight 1 (Park's alpha = 1).
Run: python3 scripts/diagrams/lessons/49.2_experiment.py
"""
import json
import re
import zlib
from pathlib import Path

import numpy as np

OUT = Path(__file__).with_name("49.2_numbers.json")
DIM = 256
STOP = set("a an the of to in on for and or is was were be by with at as that this it its i my me we "
           "our you your they their he she his her from about did do does how what when who which "
           "into after before get got".split())
NOW_DAY = 28

EPISODES = [  # id, day, importance, text
    ("E1", 1, 6, "User asked for help: a pandas groupby returned NaN for the sales column."),
    ("E2", 3, 8, "User said the quarterly report deadline is Friday and they felt stressed."),
    ("E3", 5, 3, "User shared a vegetarian lentil curry recipe and asked to scale it for six people."),
    ("E4", 9, 5, "User booked a flight to Chennai for a sister's wedding in March."),
    ("E5", 12, 7, "Training loss diverged after the user raised the learning rate to 0.1."),
    ("E6", 14, 4, "User asked how to read a parquet file written with a different schema."),
    ("E7", 20, 2, "User moved their home office into the second bedroom."),
    ("E8", 27, 6, "User got confused about why softmax attention scores are divided by a square root."),
]
FACTS = [  # id, text (semantic: no timestamp, importance 9)
    ("F1", "The user prefers Python 3.12 for all projects."),
    ("F2", "The user is allergic to peanuts."),
    ("F3", "The user's manager is named Priya."),
    ("F4", "The user lives in Delhi."),
]
QUERIES = [  # group, text, gold id
    ("lexical", "pandas groupby NaN sales", "E1"),
    ("lexical", "vegetarian lentil curry recipe", "E3"),
    ("lexical", "flight Chennai wedding", "E4"),
    ("lexical", "parquet schema", "E6"),
    ("paraphrase", "the optimizer exploded when the step size was too big", "E5"),
    ("paraphrase", "the user avoids meat in their dinner plans", "E3"),
    ("paraphrase", "a trip to see family for a marriage", "E4"),
    ("paraphrase", "who does the user report to at work", "F3"),
]
RECENCY_QUERY = "when is the quarterly report deadline"
DEDUP_PAIRS = [  # text_a, text_b, same_fact
    ("User lives in Delhi.", "The user's home is in Delhi.", 1),
    ("User is allergic to peanuts.", "Peanuts cause the user an allergic reaction.", 1),
    ("User prefers Python 3.12.", "The user likes to use Python 3.12 for projects.", 1),
    ("User's manager is Priya.", "Priya is the user's manager.", 1),
    ("User moved to Pune in 2025.", "The user relocated to Pune in 2025.", 1),
    ("User lives in Delhi.", "User is allergic to peanuts.", 0),
    ("User prefers Python 3.12.", "User prefers dark mode in the editor.", 0),
    ("User moved to Pune in 2025.", "User moved their home office into the second bedroom.", 0),
    ("User's manager is Priya.", "User's sister is getting married in March.", 0),
]
THRESHOLDS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]


def embed(text):
    toks = [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]
    feats = toks + [a + "_" + b for a, b in zip(toks, toks[1:])]
    v = np.zeros(DIM)
    for f in feats:
        h = zlib.crc32(f.encode())            # deterministic (Python's hash() is salted per run)
        v[h % DIM] += 1.0 if (h >> 16) & 1 else -1.0
    n = np.linalg.norm(v)
    return v / n if n else v


def build_store():
    rows = [dict(id=i, kind="episodic", hours=d * 24.0, importance=imp, text=t) for i, d, imp, t in EPISODES]
    rows += [dict(id=i, kind="semantic", hours=None, importance=9, text=t) for i, t in FACTS]
    for r in rows:
        r["vec"] = embed(r["text"])
    return rows


def search(rows, query, k):
    q = embed(query)
    sims = np.array([r["vec"] @ q for r in rows])   # unit vectors: dot product = cosine
    order = np.argsort(-sims, kind="stable")[:k]
    return [(rows[i]["id"], float(sims[i])) for i in order]


def main():
    rows = build_store()
    res = {"dim": DIM, "n_memories": len(rows)}

    # 1. Worked example in 3-D (matches the hand calculation in the lesson)
    q3 = np.array([1.0, 2.0, 0.0])
    m3 = {"m1": np.array([2.0, 1.0, 0.0]), "m2": np.array([0.0, 1.0, 2.0]), "m3": np.array([1.0, 2.0, 0.5])}
    cos3 = {k: float(q3 @ v / (np.linalg.norm(q3) * np.linalg.norm(v))) for k, v in m3.items()}
    res["worked3d"] = {"dots": {k: float(q3 @ v) for k, v in m3.items()},
                       "norms": {k: float(np.linalg.norm(v)) for k, v in m3.items()},
                       "cos": cos3, "norm_q": float(np.linalg.norm(q3))}

    # 2. Retrieval recall by query group (brute force over the whole store)
    recall = {}
    per_query = []
    for group, text, gold in QUERIES:
        top3 = [i for i, _ in search(rows, text, 3)]
        r1 = top3[0] == gold
        r3 = gold in top3
        per_query.append(dict(group=group, query=text, gold=gold, top3=top3, hit1=bool(r1), hit3=bool(r3)))
    for group in ("lexical", "paraphrase"):
        sub = [p for p in per_query if p["group"] == group]
        recall[group] = {"n": len(sub),
                         "recall_at_1": sum(p["hit1"] for p in sub) / len(sub),
                         "recall_at_3": sum(p["hit3"] for p in sub) / len(sub)}
    res["recall"] = recall
    res["per_query"] = per_query

    # 3. Park-style score: relevance only vs combined (recency + importance + relevance)
    now_h = NOW_DAY * 24.0
    rel = np.array([max(0.0, float(r["vec"] @ embed(RECENCY_QUERY))) for r in rows])
    rec = np.array([1.0 if r["hours"] is None else 0.995 ** (now_h - r["hours"]) for r in rows])
    imp = np.array([r["importance"] for r in rows], dtype=float)

    def mm(x):
        span = x.max() - x.min()
        return (x - x.min()) / span if span > 0 else np.zeros_like(x)

    comb = mm(rec) + mm(imp) + mm(rel)
    by_rel = np.argsort(-rel, kind="stable")[:3]
    by_comb = np.argsort(-comb, kind="stable")[:3]
    res["scoring"] = {
        "query": RECENCY_QUERY,
        "relevance_only_top3": [dict(id=rows[i]["id"], rel=round(float(rel[i]), 3), rec=round(float(rec[i]), 3),
                                     imp=int(imp[i]), comb=round(float(comb[i]), 3)) for i in by_rel],
        "combined_top3": [dict(id=rows[i]["id"], rel=round(float(rel[i]), 3), rec=round(float(rec[i]), 3),
                               imp=int(imp[i]), comb=round(float(comb[i]), 3)) for i in by_comb],
        "all": [dict(id=r["id"], rel=round(float(rel[j]), 3), rec=round(float(rec[j]), 3),
                     imp=int(imp[j]), comb=round(float(comb[j]), 3)) for j, r in enumerate(rows)],
    }

    # 4. Write path: cosine of same-fact vs different-fact pairs, and a threshold sweep
    pairs = [(a, b, y, float(embed(a) @ embed(b))) for a, b, y in DEDUP_PAIRS]
    res["dedup_pairs"] = [dict(a=a, b=b, same=y, cos=round(c, 3)) for a, b, y, c in pairs]
    sweep = []
    for t in THRESHOLDS:
        tp = sum(1 for *_, y, c in pairs if y == 1 and c >= t)
        fp = sum(1 for *_, y, c in pairs if y == 0 and c >= t)
        fn = sum(1 for *_, y, c in pairs if y == 1 and c < t)
        sweep.append(dict(threshold=t, merged_correct=tp, merged_wrong=fp, missed=fn))
    res["threshold_sweep"] = sweep

    # 5. Footprint arithmetic (exact arithmetic, not measured)
    N, d = 1_000_000, 1536
    res["footprint"] = {"N": N, "d": d, "bytes_float32": N * d * 4,
                        "GB_float32": round(N * d * 4 / 1e9, 3),
                        "madds_per_query": N * d}

    OUT.write_text(json.dumps(res, indent=2))
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
