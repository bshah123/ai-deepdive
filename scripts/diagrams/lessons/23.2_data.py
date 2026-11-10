"""Numbers shown in the Lesson 23.2 diagrams. Run: python scripts/diagrams/lessons/23.2_data.py"""
import math

# --- MaxMatch trace for "unaffable" (diagram 23.2-maxmatch.svg)
vocab = {"[UNK]", "u", "un", "a", "aff", "able", "##a", "##f", "##aff",
         "##able", "##ab", "##le", "##s", "b", "##b", "##u", "##n"}
word, start = "unaffable", 0
while start < len(word):
    tried = []
    for end in range(len(word), start, -1):
        piece = ("##" if start else "") + word[start:end]
        tried.append(piece)
        if piece in vocab:
            break
    print(f"start {start}: {len(tried)} tries, first {tried[0]!r}, hit {tried[-1]!r}")
    start = end

# --- Viterbi lattice for "hugs" (diagram 23.2-lattice.svg)
p = {"h": 0.05, "u": 0.05, "g": 0.05, "s": 0.10,
     "hu": 0.05, "ug": 0.10, "gs": 0.05, "hug": 0.15}
w = "hugs"
best = [0.0] + [-math.inf] * len(w)
for e in range(1, len(w) + 1):
    for s in range(e):
        if w[s:e] in p:
            best[e] = max(best[e], best[s] + math.log(p[w[s:e]]))
print("edges:", {x: (w.index(x), w.index(x) + len(x), p[x]) for x in p})
print("best log P at each position:", [round(b, 3) for b in best])
