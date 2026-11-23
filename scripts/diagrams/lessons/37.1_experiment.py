# Experiment for lesson 37.1 (why vector search is not RAG).
# Run: <python> scripts/diagrams/lessons/37.1_experiment.py
# Writes every number used in the lesson and its diagrams to 37.1_data.json.
# The corpus is a FICTIONAL handbook. The embedding is a deterministic hashed
# bag-of-words STAND-IN (no learned weights): it only captures word overlap.
import json, os, re, zlib
import numpy as np

SENTENCES = [
    "Northwind Robotics employees accrue 1.5 days of annual leave for each completed month of service.",
    "Unused leave carries over to the next calendar year up to a limit of 10 days.",
    "Employees who are ill for more than three consecutive days must submit a medical certificate.",
    "Travel expenses are reimbursed within 30 days of receipt of a signed claim form.",
    "Claims above 500 dollars require approval from a department head before payment.",
    "The office Wi-Fi password is rotated every quarter by the IT team.",
    "Remote work requests must be approved by a line manager in writing.",
    "Parental leave is 16 weeks for the primary carer and 4 weeks for the secondary carer.",
]
# (question, index of the gold sentence or None if the handbook cannot answer it)
QUESTIONS = [
    ("How much annual leave do employees accrue each month?", 0),
    ("How long can unused leave carry over?", 1),
    ("When must an ill employee submit a medical certificate?", 2),
    ("How fast are travel expenses reimbursed after a claim form arrives?", 3),
    ("Who approves claims above 500 dollars?", 4),
    ("How often is the office Wi-Fi password changed?", 5),
    ("Who must approve remote work requests?", 6),
    ("How many weeks of parental leave does the primary carer get?", 7),
    ("What is the reimbursement deadline for a signed claim form?", 3),
    ("How long can an employee be ill before a certificate is needed?", 2),
    ("What is the company's stock price policy?", None),
    ("Which cafeteria serves vegetarian meals?", None),
    ("What is the warranty period for the robot arm?", None),
]
STOP = {"a", "an", "the", "of", "to", "do", "does", "is", "are", "how", "many", "much",
        "what", "who", "when", "which", "for", "each", "by", "be", "must", "can", "if", "it",
        "and", "in", "on", "at", "from", "that", "this", "with", "or", "was", "its", "their",
        "before", "after", "than", "up", "long", "fast", "often"}
DIM = 4096

def tokens(text):
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOP]

def embed(text):
    v = np.zeros(DIM)
    for t in tokens(text):
        v[zlib.crc32(t.encode()) % DIM] += 1.0   # crc32 is deterministic across runs
    n = np.linalg.norm(v)
    return v / n if n else v

def search(query, chunks, k):
    q = embed(query)
    scores = np.array([embed(c) @ q for c in chunks])   # unit vectors: dot = cosine
    order = np.argsort(-scores, kind="stable")[:k]
    return [(int(i), float(scores[i])) for i in order], scores

def chunk(text, size, overlap):
    w = text.split()
    out, i = [], 0
    while True:
        out.append(" ".join(w[i:i + size]))
        if i + size >= len(w):
            break
        i += size - overlap
    return out

def norm(s):
    return " ".join(s.split())

out = {"numpy": np.__version__, "dim": DIM, "n_sentences": len(SENTENCES),
       "n_answerable": sum(g is not None for _, g in QUESTIONS),
       "n_unanswerable": sum(g is None for _, g in QUESTIONS)}

# A. One sentence = one chunk. Does top-k contain the gold sentence?
hit1 = hit3 = 0
per_q = []
for q, gold in QUESTIONS:
    if gold is None:
        continue
    top, _ = search(q, SENTENCES, 3)
    ids = [i for i, _ in top]
    hit1 += ids[0] == gold
    hit3 += gold in ids
    per_q.append({"q": q, "gold": gold, "top3": ids, "top3_scores": [round(s, 3) for _, s in top]})
out["hit_at_1"] = hit1
out["hit_at_3"] = hit3
out["per_answerable_query"] = per_q

# B. Score example for the lesson diagram: the query that misses at rank 1 (if any), else the first.
example_q = next((r["q"] for r in per_q if r["top3"][0] != r["gold"]), per_q[0]["q"])
ex_gold = next(g for q, g in QUESTIONS if q == example_q)
_, ex_scores = search(example_q, SENTENCES, 3)
out["example_query"] = example_q
out["example_gold"] = ex_gold
out["example_scores"] = [round(float(s), 3) for s in ex_scores]

# C. Chunking: is the gold sentence fully inside one of the top-3 chunks?
doc = " ".join(SENTENCES)
rows = []
for size, overlap in [(10, 0), (10, 5), (20, 0), (20, 10), (40, 0), (len(doc.split()), 0)]:
    chunks = chunk(doc, size, overlap)
    ok = 0
    n_q = 0
    for q, gold in QUESTIONS:
        if gold is None:
            continue
        n_q += 1
        top, _ = search(q, chunks, 3)
        ok += any(norm(SENTENCES[gold]) in norm(chunks[i]) for i, _ in top)
    avg_words = float(np.mean([len(c.split()) for c in chunks]))
    rows.append({"size": size, "overlap": overlap, "n_chunks": len(chunks),
                 "avg_chunk_words": round(avg_words, 1), "evidence_at_3": ok, "n": n_q,
                 "prompt_words_top3": round(min(3, len(chunks)) * avg_words, 1)})
out["chunking"] = rows
out["sentence_words"] = [len(s.split()) for s in SENTENCES]

# D. Abstention: vector search always returns k hits. Compare top-1 scores.
ans = [float(search(q, SENTENCES, 1)[0][0][1]) for q, g in QUESTIONS if g is not None]
unans = [float(search(q, SENTENCES, 1)[0][0][1]) for q, g in QUESTIONS if g is None]
out["top1_answerable"] = [round(x, 3) for x in ans]
out["top1_unanswerable"] = [round(x, 3) for x in unans]
out["top1_answerable_min"] = round(min(ans), 3)
out["top1_unanswerable_max"] = round(max(unans), 3)

here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "37.1_data.json"), "w") as f:
    json.dump(out, f, indent=1)
print(json.dumps({k: v for k, v in out.items() if k != "per_answerable_query"}, indent=1))
for r in per_q:
    print(r)
