"""Lesson 44.2: a query engine, three response synthesizers and a chat engine, from scratch.

Pure standard library + NumPy, so it runs in the browser (Pyodide).
The retriever is TF-IDF (term frequency x inverse document frequency), not an embedding model.
The LLM is a deterministic stub: it counts calls and prompt words and returns the first
OUT words of its CONTEXT block. Its answers are NOT meaningful; only call counts and prompt sizes are.
"""
import math
import re
import numpy as np

# Toy manual of 10 chunks (our own text, fictional product).
CHUNKS = [
    "The Ferrin P200 pump is rated for a flow of 40 litres per minute at a head of 25 metres.",
    "Its motor is a sealed induction unit that runs on 230 volts, single phase, and draws 1.2 amps.",
    "Install the pump on a level concrete base, at least 30 centimetres above the highest water level.",
    "The mechanical seals must be replaced every 4000 running hours, or sooner if a leak appears at the shaft.",
    "Before replacing seals, drain the casing and close the isolation valves on both sides of the pump.",
    "Never run the pump dry: without water the seals overheat within minutes.",
    "The warranty covers the motor and casing for 24 months from the date of commercial installation.",
    "Clean the strainer basket every month; a blocked basket reduces flow and can damage the impeller.",
    "The control panel has a dry-run sensor that stops the motor when the suction level drops too low.",
    "Spare parts include a seal kit, a capacitor and a strainer basket; order them with the serial number.",
]
STOP = {"the", "a", "an", "is", "of", "on", "to", "do", "does", "how", "what", "it", "its", "and", "or",
        "be", "at", "we", "i", "me", "my", "can", "for", "that", "by", "this", "with", "should", "must",
        "need", "where", "which", "then", "if", "from", "in", "so", "as", "when", "up", "out", "not",
        "will", "they", "them", "there", "both", "than", "any", "are", "you", "your"}

def tokens(text):
    return [w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP]

VOCAB = sorted({w for c in CHUNKS for w in tokens(c)})
IDX = {w: i for i, w in enumerate(VOCAB)}
N = len(CHUNKS)
df = np.zeros(len(VOCAB))
for c in CHUNKS:
    for w in set(tokens(c)):
        df[IDX[w]] += 1
IDF = np.log((1 + N) / (1 + df)) + 1          # smoothed idf: log((1+N)/(1+df)) + 1

def vec(toks):
    v = np.zeros(len(VOCAB))
    for w in toks:
        if w in IDX:                           # out-of-vocabulary words are dropped
            v[IDX[w]] += 1
    v = v * IDF
    n = np.linalg.norm(v)
    return v / n if n > 0 else v

X = np.stack([vec(tokens(c)) for c in CHUNKS])  # one unit vector per chunk

def retrieve(query, k):
    """Query engine step 1: the retriever. Returns [(chunk_id, cosine score)], best first."""
    scores = X @ vec(tokens(query))
    order = np.argsort(-scores, kind="stable")[:k]
    return [(int(i), float(scores[i])) for i in order]

# ---- Response synthesis -------------------------------------------------------------
OUT = 12                                       # stub answer length, in words
WINDOW = 120                                   # demo context window, in words (scaled down)
PADDING = 10                                   # room kept free for the output
QA = "Answer the question using only the context. Question: {q} CONTEXT: "
REFINE = "Question: {q} Improve the existing answer with the new context. EXISTING ANSWER: {a} CONTEXT: "
SUMMARY = "Summarise the context for the question. Question: {q} CONTEXT: "

def nwords(s):
    return len(s.split())

def budget(q):
    """Words left for context in one refine prompt, after template, answer and padding."""
    return WINDOW - PADDING - nwords(REFINE.format(q=q, a=" ".join(["a"] * OUT)))

def pack(texts, room):
    """Greedy packing: join consecutive chunks while they fit in `room` words."""
    packs, cur = [], []
    for t in texts:
        if nwords(t) > room:
            raise ValueError("one chunk is larger than the room left")
        if cur and sum(nwords(x) for x in cur) + nwords(t) > room:
            packs.append(" ".join(cur))
            cur = []
        cur.append(t)
    if cur:
        packs.append(" ".join(cur))
    return packs

class StubLLM:
    def __init__(self):
        self.log = []                          # (kind, prompt length in words)

    def complete(self, kind, prompt):
        self.log.append((kind, nwords(prompt)))
        if kind == "condense":                 # stub rewrite: previous user turn + follow-up
            prev = prompt.split("PREVIOUS:")[1].split("FOLLOW-UP:")[0].strip()
            return prev + " " + prompt.split("FOLLOW-UP:")[1].strip()
        ctx = prompt.split("CONTEXT:")[-1].split()
        return " ".join(ctx[:OUT])

def refine(q, pieces, llm):
    answer = None
    for piece in pieces:
        if answer is None:
            prompt = QA.format(q=q) + piece
        else:
            prompt = REFINE.format(q=q, a=answer) + piece
        answer = llm.complete("refine", prompt)  # the new answer replaces the old one
    return answer

def synthesize(mode, q, chunks, llm):
    b = budget(q)
    if mode == "refine":                        # one piece per chunk
        return refine(q, chunks, llm)
    if mode == "compact":                       # pack chunks first, then refine
        return refine(q, pack(chunks, b), llm)
    if mode == "accumulate":                    # one answer per chunk, concatenated
        return " | ".join(llm.complete("acc", QA.format(q=q) + c) for c in chunks)
    if mode == "compact_accumulate":
        return " | ".join(llm.complete("acc", QA.format(q=q) + p) for p in pack(chunks, b))
    if mode == "simple_summarize":              # everything in one prompt
        return llm.complete("simple", SUMMARY.format(q=q) + " ".join(chunks))
    if mode == "tree_summarize":                # bottom-up: summarise groups until one remains
        level = chunks
        while True:
            outs = [llm.complete("tree", SUMMARY.format(q=q) + g) for g in pack(level, b)]
            if len(outs) == 1:
                return outs[0]
            level = outs
    raise ValueError(mode)

# ---- Chat engine: condense the follow-up, retrieve, then synthesize -----------------
class ChatEngine:
    def __init__(self, llm, k=2):
        self.llm, self.k, self.history = llm, k, []

    def chat(self, msg):
        if self.history:                       # the condense step: one extra call
            standalone = self.llm.complete("condense", f"PREVIOUS: {self.history[-1]} FOLLOW-UP: {msg}")
        else:
            standalone = msg
        hits = retrieve(standalone, self.k)    # retrieval uses the standalone question
        answer = synthesize("compact", msg, [CHUNKS[i] for i, _ in hits], self.llm)
        self.history.append(msg)
        return standalone, [i for i, _ in hits], answer

if __name__ == "__main__":
    print(f"chunks={N} vocab={len(VOCAB)} matrix={X.shape}")

    # 1. Retrieval, worked example
    q1 = "What is the rated flow of the Ferrin P200 pump?"
    print("\nquery:", q1, "| tokens:", tokens(q1))
    for i, s in retrieve(q1, 3):
        print(f"  chunk {i}  score {s:.3f}  {CHUNKS[i][:48]}...")

    # 2. Response synthesizers on the same top-6 chunks
    q2 = "How should I maintain the Ferrin P200 pump?"
    hits = retrieve(q2, 6)
    chunks = [CHUNKS[i] for i, _ in hits]
    print(f"\nquery: {q2}\nretrieved chunks (best first): {[i for i, _ in hits]}")
    print(f"budget per refine prompt: {budget(q2)} words of context (window {WINDOW}, padding {PADDING})")
    for mode in ["refine", "compact", "accumulate", "compact_accumulate", "tree_summarize", "simple_summarize"]:
        llm = StubLLM()
        synthesize(mode, q2, chunks, llm)
        longest = max(n for _, n in llm.log)
        fits = "yes" if longest <= WINDOW else "NO"
        print(f"  {mode:18s} calls={len(llm.log):2d}  longest prompt={longest:3d} words  fits window={fits}")

    llm = StubLLM()
    final = refine(q2, chunks, llm)
    print("\nrefine, final stub answer:", repr(final))
    print("refine, chunk ids in order:", [i for i, _ in hits])
    print("refine, last chunk text:  ", repr(chunks[-1][:60]))

    # 3. Chat engine: raw follow-up vs condensed standalone question
    items = [
        ("What is the rated flow of the Ferrin P200 pump?", "How often do its seals need replacing?", 3),
        ("How is the Ferrin P200 motor powered?", "Where should the pump be installed?", 2),
        ("How do I drain the pump before maintenance?", "Which valves must I close?", 4),
        ("What voltage does the pump motor need?", "Can it run dry for a while?", 5),
    ]
    raw_hit = cond_hit = 0
    for prev, follow, gold in items:
        raw_ids = [i for i, _ in retrieve(follow, 2)]
        eng = ChatEngine(StubLLM(), k=2)
        eng.history = [prev]
        standalone, ids, _ = eng.chat(follow)
        raw_hit += gold in raw_ids
        cond_hit += gold in ids
        print(f"\nfollow-up: {follow!r}  gold chunk {gold}")
        print(f"  raw top-2 {raw_ids}   condensed top-2 {ids}")
        print(f"  standalone: {standalone!r}")
        print(f"  LLM calls this turn: {len(eng.llm.log)} {[k for k, _ in eng.llm.log]}")
    print(f"\nrecall@2 raw follow-up: {raw_hit}/{len(items)}   condensed: {cond_hit}/{len(items)}")
    first = ChatEngine(StubLLM(), k=2)
    first.chat(items[0][0])
    print(f"first turn (no history) LLM calls: {len(first.llm.log)} {[k for k, _ in first.llm.log]}")
    print("\nchunk words in retrieval order:", [nwords(c) for c in chunks], "total", sum(nwords(c) for c in chunks))
    print("compact packs (words each):", [nwords(p) for p in pack(chunks, budget(q2))])
    print("all 10 chunks total words:", sum(nwords(c) for c in CHUNKS))
    # hand-check numbers for chunk 0 and query 1
    df_ = {w: int(df[IDX[w]]) for w in ["ferrin", "p200", "rated", "flow", "pump"]}
    print("df:", df_, "idf:", {w: round(float(IDF[IDX[w]]), 4) for w in df_})
    print("idf of df=1:", round(math.log(11 / 2) + 1, 4), " df=2:", round(math.log(11 / 3) + 1, 4), " df=4:", round(math.log(11 / 5) + 1, 4))
    print("chunk 0 unit-vector check, cosine:", round(float(X[0] @ vec(tokens(q1))), 4))
