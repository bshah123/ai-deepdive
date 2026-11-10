# Lesson 23.2 toy Unigram trainer (same code as in the lesson). Vocabulary sizes feed 23.2-grow-vs-prune.svg.
import math
import random
from collections import Counter

# Toy corpus: word -> frequency. 8 common verbs in 4 forms, plus a long tail of
# 12 rare words seen once (real corpora always have such a tail).
random.seed(0)
suffixes = ["", "s", "ed", "ing"]
common = ["walk", "talk", "jump", "play", "look", "cook", "help", "kick"]
rare = ["jog", "nod", "hop", "zip", "mix", "fix", "pack", "lock", "rock", "wish", "rush", "bark"]
corpus = {stem + suf: random.randint(3, 9) for stem in common for suf in suffixes}
for stem in rare:
    corpus[stem + random.choice(suffixes)] = 1

def pieces_in(word, p):
    """Every (start, end, piece) in the lattice of `word`."""
    return [(i, j, word[i:j]) for i in range(len(word))
            for j in range(i + 1, len(word) + 1) if word[i:j] in p]

def forward(word, p):          # alpha[j] = P(all segmentations of word[:j])
    alpha = [1.0] + [0.0] * len(word)
    for i, j, x in sorted(pieces_in(word, p), key=lambda t: t[1]):
        alpha[j] += alpha[i] * p[x]
    return alpha

def backward(word, p):         # beta[i] = P(all segmentations of word[i:])
    beta = [0.0] * len(word) + [1.0]
    for i, j, x in sorted(pieces_in(word, p), key=lambda t: -t[0]):
        beta[i] += p[x] * beta[j]
    return beta

def log_likelihood(p):         # L = sum over words of freq * log P(word)
    return sum(f * math.log(forward(w, p)[-1]) for w, f in corpus.items())

def em_step(p):
    """E-step: expected count of each piece over ALL segmentations. M-step: normalise."""
    counts = Counter()
    for w, f in corpus.items():
        alpha, beta = forward(w, p), backward(w, p)
        for i, j, x in pieces_in(w, p):
            counts[x] += f * alpha[i] * p[x] * beta[j] / alpha[-1]
    for c in chars:            # tiny floor so every word stays encodable (toy safeguard)
        counts[c] = max(counts[c], 1e-3)
    total = sum(counts.values())
    return {x: c / total for x, c in counts.items()}

def normalise(q):
    s = sum(q.values())
    return {x: v / s for x, v in q.items()}

def viterbi(word, p):
    best, back = [0.0] + [-math.inf] * len(word), [0] * (len(word) + 1)
    for i, j, x in sorted(pieces_in(word, p), key=lambda t: t[1]):
        if best[i] + math.log(p[x]) > best[j]:
            best[j], back[j] = best[i] + math.log(p[x]), i
    out, j = [], len(word)
    while j > 0:
        out.append(word[back[j]:j]); j = back[j]
    return out[::-1]

# 1. Seed vocabulary: all characters + every substring seen at least twice.
seed = Counter()
for w, f in corpus.items():
    for i in range(len(w)):
        for j in range(i + 1, len(w) + 1):
            seed[w[i:j]] += f
p = normalise({x: c for x, c in seed.items() if len(x) == 1 or c >= 2})
chars = {x for x in p if len(x) == 1}
target = len(chars) + 12                   # 12 multi-character pieces
print(f"seed: {len(p)} pieces ({len(chars)} characters), L = {log_likelihood(p):.1f}")

# 2. Repeat: EM, then drop the 20% of pieces whose removal hurts L least.
sizes = [len(p)]
while len(p) > target:
    for _ in range(3):
        p = em_step(p)
    base = log_likelihood(p)
    loss = {x: base - log_likelihood(normalise({y: v for y, v in p.items() if y != x}))
            for x in p if x not in chars}  # characters are never removed
    n_keep = max(target, int(0.8 * len(p))) - len(chars)
    survivors = set(sorted(loss, key=loss.get, reverse=True)[:n_keep]) | chars
    p = normalise({x: v for x, v in p.items() if x in survivors})
    sizes.append(len(p))
    print(f"pruned to {len(p):>3} pieces, L = {log_likelihood(p):.1f}")
for _ in range(3):
    p = em_step(p)

print("sizes:", sizes)
print("multi-character pieces:", sorted((x for x in p if len(x) > 1), key=p.get, reverse=True))
for w in ["walking", "talked", "played", "jumps", "stalking", "replayed", "unhelpful"]:
    print(f"{w:<9} -> {viterbi(w, p)}{'   (unseen)' if w not in corpus else ''}")
