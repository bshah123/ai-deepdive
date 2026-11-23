# Experiment for lesson 37.2 (the RAG lifecycle on a toy corpus, NumPy + standard library only).
# Run: <python> scripts/diagrams/lessons/37.2_experiment.py
# Writes every number used in the lesson and its diagrams to 37.2_data.json.
import json, re
from pathlib import Path
import numpy as np

# ---- Source documents: a fictional staff handbook, so no outside facts are needed
DOCS = {
    "leave": "Full-time staff accrue 1.5 days of annual leave per completed month. Unused leave up to 10 days carries over to the next calendar year. Leave requests must be approved by a line manager at least 5 working days in advance, except for sick leave. Sick leave does not need advance approval. Staff must notify their manager before 9:30 a.m. on the first day of absence. A medical certificate is required for absences longer than 3 consecutive days.",
    "expenses": "Travel expenses are reimbursed when a claim is submitted within 30 days of the trip. Claims above 500 dollars need a second approval from the finance team. Receipts are required for every item, including meals. Alcohol is not reimbursable under any circumstances. Personal car mileage is paid at the rate the finance team publishes each January.",
    "remote": "Staff may work remotely up to 2 days per week with manager approval. Core hours are 10:00 to 15:00 local time, when everyone must be reachable. Remote staff must use the company VPN when they access internal systems.",
    "it": "Laptops are issued on the first day and must be returned within 14 days of leaving the company. Lost devices must be reported to the IT help desk within 24 hours. Personal USB drives are not permitted on company laptops.",
    "safety": "The battery test bench must not be run without safety glasses. Lithium cells that swell or smell of solvent go into the red cabinet. Staff must log every cell taken out of the cabinet in the register at the front desk.",
    "onboarding": "New hires attend orientation on their first Monday. The security induction takes 90 minutes and includes badge setup. Probation lasts 3 months, and the first performance review happens in week 12.",
}

# ---- Evaluation questions: (question, gold answer string that must appear verbatim in the context)
QUERIES = [
    ("How many days of annual leave do staff accrue each month?", "1.5 days"),
    ("How long can unused leave carry over?", "10 days"),
    ("How far ahead must a leave request be approved?", "5 working days"),
    ("By what time must I tell my manager I am sick?", "9:30 a.m."),
    ("When is a medical certificate needed?", "3 consecutive days"),
    ("How soon after a trip must a travel claim be submitted?", "30 days"),
    ("Who approves a claim above 500 dollars?", "second approval"),
    ("Is alcohol reimbursable?", "not reimbursable"),
    ("How many days a week can I work remotely?", "2 days per week"),
    ("What are the core hours for remote staff?", "10:00 to 15:00"),
    ("How quickly must a lost device be reported?", "24 hours"),
    ("Can I connect a personal USB drive to a company laptop?", "not permitted"),
    ("How long is probation?", "3 months"),
    ("When is the first performance review?", "week 12"),
]

# ---- 1. INGESTION: load, chunk, index
def chunk(text, size, overlap=0):
    """Split text into windows of `size` words; consecutive windows share `overlap` words."""
    words = text.split()
    step = size - overlap
    out = []
    for start in range(0, len(words), step):
        out.append(" ".join(words[start:start + size]))
        if start + size >= len(words):
            break
    return out

def ingest(docs, size, overlap=0):
    return [{"doc": d, "text": piece} for d, text in docs.items() for piece in chunk(text, size, overlap)]

STOP = {"a", "an", "the", "of", "to", "is", "are", "be", "do", "does", "i", "my", "it", "on", "in",
        "for", "and", "or", "at", "how", "can", "what", "when", "which", "if", "after", "before", "by"}

def tokens(s):
    return [t for t in re.findall(r"[a-z0-9]+", s.lower()) if t not in STOP]

def build_index(chunks):
    """TF-IDF vectors, one row per chunk, L2-normalised. A toy stand-in for a neural embedding."""
    vocab = sorted({t for c in chunks for t in tokens(c["text"])})
    col = {t: j for j, t in enumerate(vocab)}
    counts = np.zeros((len(chunks), len(vocab)))
    for i, c in enumerate(chunks):
        for t in tokens(c["text"]):
            counts[i, col[t]] += 1
    df = (counts > 0).sum(axis=0)
    idf = np.log((1 + len(chunks)) / (1 + df)) + 1.0
    X = counts * idf
    X = X / (np.linalg.norm(X, axis=1, keepdims=True) + 1e-12)
    return {"chunks": chunks, "vocab": col, "idf": idf, "X": X}

# ---- 2. RETRIEVAL: embed the query, score every chunk, keep top-k
def embed_query(index, text):
    v = np.zeros(len(index["vocab"]))
    for t in tokens(text):
        if t in index["vocab"]:
            v[index["vocab"][t]] += 1
    v = v * index["idf"]
    return v / (np.linalg.norm(v) + 1e-12)

def retrieve(index, query, k=3):
    scores = index["X"] @ embed_query(index, query)
    order = np.argsort(-scores, kind="stable")[:k]
    return [dict(index["chunks"][i], score=float(scores[i])) for i in order]

# ---- 3. GENERATION: assemble the prompt (the LLM call itself is not run here)
def build_prompt(question, hits):
    sources = "\n".join(f"[{i + 1}] {h['text']}" for i, h in enumerate(hits))
    return ("Answer using only the numbered sources and cite them as [n]. "
            "If the sources do not contain the answer, say so.\n\n"
            f"Sources:\n{sources}\n\nQuestion: {question}\nAnswer:")

# ---- Evaluation: does the gold answer reach the prompt?
def evaluate(size, overlap, k=3):
    chunks = ingest(DOCS, size, overlap)
    index = build_index(chunks)
    in_index, at1, at_k = 0, 0, 0
    for q, gold in QUERIES:
        g = gold.lower()
        in_index += any(g in c["text"].lower() for c in chunks)
        top = retrieve(index, q, k)
        at1 += g in top[0]["text"].lower()
        at_k += g in " \n ".join(h["text"] for h in top).lower()
    n = len(QUERIES)
    return {"size": size, "overlap": overlap, "n_chunks": len(chunks),
            "mean_words": round(float(np.mean([len(c["text"].split()) for c in chunks])), 1),
            "answer_in_index": in_index / n, "answer_at_1": at1 / n, "answer_at_k": at_k / n}

CONFIGS = [(4, 0), (4, 2), (8, 0), (8, 4), (16, 0), (16, 8), (32, 0), (32, 16), (64, 0), (10**6, 0)]

if __name__ == "__main__":
    # Walkthrough at the default chunk size
    size, overlap = 16, 0
    chunks = ingest(DOCS, size, overlap)
    index = build_index(chunks)
    print("documents:", len(DOCS), " chunks:", len(chunks), " vocabulary:", len(index["vocab"]))
    print("first chunks of 'leave':")
    for c in chunks[:3]:
        print("  |", c["text"])
    q, gold = QUERIES[2]
    print("\nquery:", q)
    top = retrieve(index, q, 3)
    for h in top:
        print(f"  {h['score']:.3f}  [{h['doc']}] {h['text'][:60]}...")
    print("\nprompt:")
    print(build_prompt(q, top))
    # Hand-check example: two chunks, worked by hand in the lesson
    tiny = [{"doc": "a", "text": "leave requests approved"}, {"doc": "b", "text": "leave notify manager"}]
    tiny_index = build_index(tiny)
    print("\nhand check (N = 2 chunks):")
    print("idf:", {t: round(float(tiny_index["idf"][j]), 3) for t, j in sorted(tiny_index["vocab"].items())})
    for h in retrieve(tiny_index, "leave approved", 2):
        print(f"  {h['score']:.3f}  {h['text']}")
    print("\nsweep over chunk size (words) and overlap, k = 3:")
    print(f"{'size':>8} {'ov':>4} {'chunks':>7} {'words':>6} {'in_index':>9} {'@1':>6} {'@3':>6}")
    rows = []
    for s, o in CONFIGS:
        r = evaluate(s, o)
        rows.append(r)
        label = "doc" if s >= 10**6 else str(s)
        print(f"{label:>8} {o:>4} {r['n_chunks']:>7} {r['mean_words']:>6} "
              f"{r['answer_in_index']:>9.2f} {r['answer_at_1']:>6.2f} {r['answer_at_k']:>6.2f}")

    # Per-query failure attribution at the default configuration
    per_query = []
    for q, gold in QUERIES:
        g = gold.lower()
        top = retrieve(index, q, 3)
        if not any(g in c["text"].lower() for c in chunks):
            status = "lost_at_ingestion"
        elif g in " \n ".join(h["text"] for h in top).lower():
            status = "in_top3"
        else:
            status = "lost_at_retrieval"
        per_query.append({"question": q, "gold": gold, "status": status})
    print("\nper-query status at size 16:")
    for p in per_query:
        print(f"  {p['status']:<20} {p['gold']}")

    # ---- dump (not shown in the lesson)
    ex_q, ex_gold = QUERIES[2]
    ex_hits = retrieve(index, ex_q, 3)
    leave_chunks = [c["text"] for c in chunks if c["doc"] == "leave"][:3]
    data = {"n_docs": len(DOCS), "n_queries": len(QUERIES), "default_size": size,
            "default_chunks": len(chunks), "default_vocab": len(index["vocab"]),
            "default_counts": {s: sum(p["status"] == s for p in per_query)
                               for s in ["lost_at_ingestion", "lost_at_retrieval", "in_top3"]},
            "sweep": rows, "per_query": per_query,
            "leave_chunks_16": leave_chunks,
            "example_query": ex_q, "example_gold": ex_gold,
            "example_hits": [{"doc": h["doc"], "text": h["text"], "score": round(h["score"], 3),
                              "has_gold": ex_gold.lower() in h["text"].lower()} for h in ex_hits]}
    Path(__file__).with_name("37.2_data.json").write_text(json.dumps(data, indent=2))
