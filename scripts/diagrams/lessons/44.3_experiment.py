"""Lesson 44.3 experiment: every number the lesson and its diagrams use.

Mechanism-level toy. Retrieval is bag-of-words cosine on 8 chunks; the
sub-question decomposition is hand-written (it stands in for the LLM); the
router uses keyword overlap (it stands in for the LLM selector). Nothing here
is a benchmark. Writes 44.3_data.json next to this file.
Run: python3 44.3_experiment.py
"""
import json
import re
from pathlib import Path

import numpy as np

STOP = {"what", "was", "of", "and", "in", "how", "many", "did", "where", "will",
        "its", "to", "the", "a", "an", "does", "do", "much", "or", "with", "is",
        "were", "which", "who", "from", "their", "that", "for", "on", "at", "by",
        "it", "as", "s", "answers", "questions", "about", "useful", "answer"}

CHUNKS = [
    "Acme Corp reported revenue of 120 million dollars in 2023.",
    "Acme Corp opened three new factories in Ohio during 2023.",
    "Borealis Ltd reported revenue of 85 million dollars in 2023.",
    "Borealis Ltd hired 400 engineers in Norway during 2023.",
    "Cobalt Inc reported revenue of 40 million dollars in 2023.",
    "Cobalt Inc announced a merger with a robotics startup in 2022.",
    "Acme Corp plans to expand its factories to Texas in 2024.",
    "Borealis Ltd sells wind turbines to farms in Scotland.",
]

# Compound queries: gold = chunk ids that answer the query; subs = hand-written decomposition.
QUERIES = [
    ("What was the revenue of Acme Corp and Borealis Ltd in 2023?", {0, 2},
     ["What was the revenue of Acme Corp in 2023?", "What was the revenue of Borealis Ltd in 2023?"]),
    ("How many factories did Acme Corp open and how many engineers did Borealis Ltd hire in 2023?", {1, 3},
     ["How many factories did Acme Corp open in 2023?", "How many engineers did Borealis Ltd hire in 2023?"]),
    ("What was the revenue of Cobalt Inc and Acme Corp in 2023?", {4, 0},
     ["What was the revenue of Cobalt Inc in 2023?", "What was the revenue of Acme Corp in 2023?"]),
    ("Did Cobalt Inc announce a merger and where does Borealis Ltd sell turbines?", {5, 7},
     ["Did Cobalt Inc announce a merger?", "Where does Borealis Ltd sell turbines?"]),
    ("Where will Acme Corp expand its factories and how much revenue did Borealis Ltd report in 2023?", {6, 2},
     ["Where will Acme Corp expand its factories?", "How much revenue did Borealis Ltd report in 2023?"]),
    ("What was the revenue of Borealis Ltd and Cobalt Inc in 2023?", {2, 4},
     ["What was the revenue of Borealis Ltd in 2023?", "What was the revenue of Cobalt Inc in 2023?"]),
]


def tokens(text):
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]


VOCAB = sorted({t for c in CHUNKS for t in tokens(c)})
IDX = {w: i for i, w in enumerate(VOCAB)}


def embed(text):
    v = np.zeros(len(VOCAB))
    for t in tokens(text):
        if t in IDX:
            v[IDX[t]] += 1
    n = np.linalg.norm(v)
    return v / n if n else v


C = np.stack([embed(c) for c in CHUNKS])


def topk(text, k):
    scores = C @ embed(text)
    return [int(i) for i in np.argsort(-scores, kind="stable")[:k]]


retrieval = []
for question, gold, subs in QUERIES:
    row = {"query": question, "gold": sorted(gold), "subs": subs}
    for budget in (2, 4):
        single = topk(question, budget)
        per_sub = budget // len(subs)
        dec = []
        for s in subs:
            for i in topk(s, per_sub):
                if i not in dec:
                    dec.append(i)
        rs = len(gold & set(single)) / len(gold)
        rd = len(gold & set(dec)) / len(gold)
        row[f"single_{budget}"] = single
        row[f"decomp_{budget}"] = dec
        row[f"recall_single_{budget}"] = rs
        row[f"recall_decomp_{budget}"] = rd
    retrieval.append(row)

mean = {f"{m}_{b}": float(np.mean([r[f"recall_{m}_{b}"] for r in retrieval]))
        for m in ("single", "decomp") for b in (2, 4)}
full_hit = {f"{m}_{b}": float(np.mean([len(set(r["gold"]) - set(r[f"{m}_{b}" if m == "single" else f"decomp_{b}"])) == 0
                                       for r in retrieval]))
            for m in ("single", "decomp") for b in (2, 4)}

# Router: keyword overlap between query and each tool description; argmax, ties -> first tool.
TOOLS_CLEAR = {
    "revenue_tool": "Answers questions about company revenue, sales and financial results",
    "operations_tool": "Answers questions about factories, plants, expansion and products",
    "people_tool": "Answers questions about hiring, engineers and staff headcount",
    "deals_tool": "Answers questions about mergers, acquisitions and corporate announcements",
}
TOOLS_VAGUE = {
    "revenue_tool": "Useful for questions about companies and their 2023 results",
    "operations_tool": "Useful for questions about companies and their 2023 plans",
    "people_tool": "Useful for questions about companies and their 2023 staff",
    "deals_tool": "Useful for questions about companies and their 2023 news",
}
ROUTER_QUERIES = [
    ("What was Acme Corp's revenue in 2023?", "revenue_tool"),
    ("What were Cobalt Inc's sales results?", "revenue_tool"),
    ("How did Borealis Ltd's financial results change in 2023?", "revenue_tool"),
    ("Where did Acme Corp open new factories?", "operations_tool"),
    ("Which plants does Borealis Ltd run?", "operations_tool"),
    ("Which products did Cobalt Inc expand in 2024?", "operations_tool"),
    ("How many engineers did Borealis Ltd hire in 2023?", "people_tool"),
    ("What is the headcount of Acme Corp's staff?", "people_tool"),
    ("Who joined Cobalt Inc as staff in 2023?", "people_tool"),
    ("Did Cobalt Inc announce a merger in 2022?", "deals_tool"),
    ("Which acquisitions did Acme Corp announce?", "deals_tool"),
    ("What corporate news came from Borealis Ltd in 2023?", "deals_tool"),
]


def route(query, tools):
    q = set(tokens(query))
    scores = {name: len(q & set(tokens(desc))) for name, desc in tools.items()}
    best = max(scores.values())
    return next(n for n, s in scores.items() if s == best), scores


router = []
for query, gold in ROUTER_QUERIES:
    pc, sc = route(query, TOOLS_CLEAR)
    pv, sv = route(query, TOOLS_VAGUE)
    router.append({"query": query, "gold": gold, "clear": pc, "vague": pv,
                   "clear_ok": pc == gold, "vague_ok": pv == gold,
                   "clear_scores": sc, "vague_scores": sv})
acc = {"clear": float(np.mean([r["clear_ok"] for r in router])),
       "vague": float(np.mean([r["vague_ok"] for r in router]))}

calls = {str(n): n + 2 for n in (1, 2, 3, 4)}  # 1 question generation + n sub-answers + 1 final synthesis

data = {"chunks": CHUNKS, "retrieval": retrieval, "recall_mean": mean, "full_hit_rate": full_hit,
        "router": router, "router_accuracy": acc, "llm_calls_by_subquestions": calls,
        "tools_clear": TOOLS_CLEAR, "tools_vague": TOOLS_VAGUE}
out = Path(__file__).resolve().parent / "44.3_data.json"
out.write_text(json.dumps(data, indent=1))

print("mean recall, budget 2 (single, decomposed):", round(mean["single_2"], 3), round(mean["decomp_2"], 3))
print("mean recall, budget 4 (single, decomposed):", round(mean["single_4"], 3), round(mean["decomp_4"], 3))
print("full-hit rate, budget 2 (single, decomposed):", full_hit["single_2"], full_hit["decomp_2"])
print("full-hit rate, budget 4 (single, decomposed):", full_hit["single_4"], full_hit["decomp_4"])
for r in retrieval:
    print(r["gold"], "single2", r["single_2"], "dec2", r["decomp_2"], "| single4", r["single_4"], "dec4", r["decomp_4"])
print("router accuracy clear:", acc["clear"], " vague:", acc["vague"])
for r in router:
    print(f"  gold={r['gold']:15} clear={r['clear']:15} ok={r['clear_ok']!s:5} vague={r['vague']:15} ok={r['vague_ok']}")
print("LLM calls by sub-question count:", calls)
print("vocab size:", len(VOCAB))
