"""Numbers shown in the 23.1 diagrams. Run: python -I scripts/diagrams/lessons/23.1_data.py"""
import codecs, contextlib, io, re
from collections import Counter

# ---- toy corpus (Sennrich et al. 2016): pair counts before the first merge
corpus = {"low": 5, "lower": 2, "newest": 6, "widest": 3}
words = {tuple(w) + ("</w>",): f for w, f in corpus.items()}
counts = Counter()
for s, f in words.items():
    for p in zip(s, s[1:]):
        counts[p] += f
print("step-0 pair counts:", counts.most_common())

# ---- byte-level BPE on the Zen of Python
with contextlib.redirect_stdout(io.StringIO()):
    import this
text = codecs.decode(this.s, "rot13")
PAT = re.compile(r" ?[A-Za-z]+| ?[0-9]+| ?[^\sA-Za-z0-9]+|\s+(?!\S)|\s+")
chunks = lambda s: [tuple(m.group().encode()) for m in PAT.finditer(s)]

def merge_ids(ids, pair, new):
    out, i = [], 0
    while i < len(ids):
        if i + 1 < len(ids) and (ids[i], ids[i + 1]) == pair:
            out.append(new); i += 2
        else:
            out.append(ids[i]); i += 1
    return tuple(out)

def train(n):
    w = Counter(chunks(text)); vocab = {i: bytes([i]) for i in range(256)}; merges = {}
    for k in range(n):
        c = Counter()
        for x, f in w.items():
            for p in zip(x, x[1:]): c[p] += f
        if not c: break
        p = max(c, key=c.get); merges[p] = 256 + k; vocab[256 + k] = vocab[p[0]] + vocab[p[1]]
        w = Counter({merge_ids(x, p, 256 + k): f for x, f in w.items()})
    return merges, vocab

def encode(s, merges):
    ids = []
    for w in chunks(s):
        while len(w) > 1:
            p = min(zip(w, w[1:]), key=lambda q: merges.get(q, float("inf")))
            if p not in merges: break
            w = merge_ids(w, p, merges[p])
        ids.extend(w)
    return ids

nbytes = len(text.encode())
print("Zen bytes:", nbytes, "chars:", len(text))
for n in [0, 25, 50, 100, 200, 400, 800]:
    m, v = train(n)
    print(f"merges={n:4d} vocab={len(v):4d} tokens={len(encode(text, m)):4d} bytes/token={nbytes/len(encode(text, m)):.2f}")

m, v = train(200)
s = "naïve 👋"
print("utf8 per char:", [(ch, list(ch.encode())) for ch in s])
print("tokens:", [v[i] for i in encode(s, m)])
s2 = "Beautiful is better"
print("tokens:", [v[i] for i in encode(s2, m)])

# ---- curve for the compression diagram (in-sample: measured on the training text)
m, v = train(10_000)
print("merges available before training stops:", len(m), "chunks in text:", len(chunks(text)))
pts = []
for n in range(0, 301, 25):
    mm, _ = train(n)
    pts.append((n, round(nbytes / len(encode(text, mm)), 2)))
print("curve:", pts)
