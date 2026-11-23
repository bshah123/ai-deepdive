import json
import math
import re

# Toy corpus. The facts are invented so that no answer can come from outside knowledge.
CHUNKS = [
    "Ferncliff Lab opened in 2014 in the town of Brindle.",
    "The lab has 42 staff members, of whom 11 hold doctorates.",
    "Its main instrument is a cryo-microscope bought in 2019.",
    "Brindle is a market town known for its river mill.",
    "The river mill closed to visitors in 2011 for repairs.",
    "Staff at the lab publish on protein structure every year.",
]

STOP = {"a", "an", "the", "of", "in", "on", "at", "to", "for", "by", "with", "as", "is", "was",
        "be", "its", "it", "this", "that", "has", "have", "did", "when", "what", "who", "how",
        "where", "whom", "and", "or", "every", "their", "from", "year", "years", "each", "not",
        "are", "which", "does", "do"}


def stem(tok):
    # Crude suffix stripping: "opened" -> "open", "members" -> "member".
    for suf in ("ed", "s"):
        if tok.endswith(suf) and len(tok) - len(suf) >= 4:
            return tok[: -len(suf)]
    return tok


def terms(text):
    words = re.findall(r"[a-z0-9]+", text.lower().replace("-", " "))
    return [stem(w) for w in words if w not in STOP]


def idf_table(docs):
    n = len(docs)
    df = {}
    for d in docs:
        for t in set(terms(d)):
            df[t] = df.get(t, 0) + 1
    return {t: math.log((1 + n) / (1 + c)) + 1 for t, c in df.items()}


def tfidf(text, idf):
    v = {}
    for t in terms(text):
        v[t] = v.get(t, 0.0) + idf.get(t, math.log(1 + len(CHUNKS)) + 1)
    return v


def cosine(a, b):
    dot = sum(w * b.get(t, 0.0) for t, w in a.items())
    na = math.sqrt(sum(w * w for w in a.values()))
    nb = math.sqrt(sum(w * w for w in b.values()))
    return dot / (na * nb) if na and nb else 0.0


IDF = idf_table(CHUNKS)


def retrieve(query, k):
    qv = tfidf(query, IDF)
    ranked = sorted(range(len(CHUNKS)), key=lambda i: (-cosine(qv, tfidf(CHUNKS[i], IDF)), i))
    return ranked[:k]


def split_claims(answer):
    return [s.strip() for s in re.split(r"(?<=\.)\s+", answer.strip()) if s.strip()]


def support(claim, context):
    """Stub for the LLM/NLI check: the fraction of the claim's terms found in the best chunk."""
    ct = set(terms(claim))
    return max(len(ct & set(terms(CHUNKS[i]))) / len(ct) for i in context)


def faithfulness(answer, context, theta=0.8):
    cl = split_claims(answer)
    supported = [support(c, context) >= theta for c in cl]
    return sum(supported) / len(cl)


def context_relevance(question, context, min_shared=2):
    qt = set(terms(question))
    relevant = [len(qt & set(terms(CHUNKS[i]))) >= min_shared for i in context]
    return sum(relevant) / len(context)


def answer_relevance(question, answer):
    """Stub: cosine between the question and the answer as bags of terms.
    RAGAS instead generates questions from the answer and averages their similarity."""
    def bag(t):
        d = {}
        for w in terms(t):
            d[w] = d.get(w, 0.0) + 1.0
        return d
    return cosine(bag(question), bag(answer))


QUESTION = "When did Ferncliff Lab open?"
ctx_lab = retrieve(QUESTION, 3)
ctx_mill = retrieve("What does the river mill do?", 2)

CASES = [
    ("A grounded and on topic", "Ferncliff Lab opened in 2014.", ctx_lab, QUESTION),
    ("B one invented date", "Ferncliff Lab opened in 2014. The state funded it in 2016.", ctx_lab, QUESTION),
    ("C grounded, off topic", "The lab has 42 staff members.", ctx_lab, QUESTION),
    ("D right answer, wrong context", "Ferncliff Lab opened in 2014.", ctx_mill, QUESTION),
    ("E near miss paraphrase", "The lab was opened in 2014 by a team of 42 people.", ctx_lab, QUESTION),
]

results = {}
print("retrieved for question:", ctx_lab)
print("retrieved for mill query:", ctx_mill)
print()
print(f"{'case':32s} {'F':>5s} {'CR':>5s} {'AR':>5s}")
for name, answer, ctx, q in CASES:
    f = faithfulness(answer, ctx)
    cr = context_relevance(q, ctx)
    ar = answer_relevance(q, answer)
    results[name] = {"F": f, "CR": cr, "AR": ar}
    print(f"{name:32s} {f:5.2f} {cr:5.2f} {ar:5.2f}")

print()
print("claim supports for case B:")
for c in split_claims(CASES[1][1]):
    print(f"  {support(c, ctx_lab):.2f}  {c}")

print()
print("case E faithfulness vs theta:")
sweep = {}
for theta in (0.5, 0.8, 1.0):
    sweep[theta] = faithfulness(CASES[4][1], ctx_lab, theta)
    print(f"  theta={theta:.1f}  F={sweep[theta]:.2f}")
print("case E claim support:", round(support(split_claims(CASES[4][1])[0], ctx_lab), 3))

if __name__ == "__main__":
    with open("/Users/bshah/Documents/Trial/Learning/scripts/diagrams/lessons/57.1_data.json", "w") as fh:
        json.dump({"retrieved_question": ctx_lab, "retrieved_mill": ctx_mill,
                   "cases": results, "sweepE": {str(k): v for k, v in sweep.items()},
                   "claimsB": [[c, support(c, ctx_lab)] for c in split_claims(CASES[1][1])],
                   "supportE": support(split_claims(CASES[4][1])[0], ctx_lab),
                   "chunks": CHUNKS, "question": QUESTION}, fh, indent=2)
