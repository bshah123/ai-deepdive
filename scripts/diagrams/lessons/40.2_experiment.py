import math
import re

import numpy as np

# A retrieved passage about an invented bridge, so no model can have memorised it.
DOC = (
    "The Halvorsen Bridge spans the Tessel River in the northern province of Ostmark. "
    "Construction began in 1926, and the bridge opened to traffic in 1931 after a long dispute "
    "between the provincial council and the national rail board. "
    "The bridge was designed by the engineer Ada Lindqvist, who had previously worked on harbour cranes. "
    "Its main span measures 412 metres, which made it the longest single-span steel arch in the country "
    "for almost three decades. "
    "Local newspapers covered the opening ceremony in great detail, and many residents remembered the "
    "weather as unusually cold. "
    "Maintenance crews repaint the steel every six years, using a coating that resists salt air from the "
    "nearby coast. "
    "Traffic grew steadily through the 1950s, and a second deck for pedestrians and cyclists was added in 1962. "
    "In 2009 engineers inspected the cables and replaced twelve hangers that showed fatigue cracks."
)

# Key facts a reader needs. Each is a short span; it counts as kept if all its tokens survive.
GOLD = ["Tessel River", "1931", "Ada Lindqvist", "412 metres", "1962", "twelve hangers"]

# Generic prose used only to train the toy language model. It contains no GOLD token.
BACKGROUND = (
    "The council met on Tuesday to review the budget for roads and water pipes. "
    "Most members agreed that the old pipes in the east district needed replacing before the next winter. "
    "The engineers explained that the work would take about two years and would close several streets "
    "for short periods. Residents asked how the costs would be shared between the city and the regional "
    "government. The mayor said that a full report would be published before the final vote. "
    "Later in the meeting, the committee discussed a plan for new bus lanes along the main road. "
    "Several drivers said that the lanes would reduce delays during the morning rush. "
    "Others worried that the lanes would take space from parking near the shops. "
    "The committee asked the transport office to measure traffic at the busiest junctions and report back "
    "in the spring. Meanwhile the library announced longer opening hours on weekends, and a new reading "
    "room for children will open in the autumn. The school board also reviewed plans for a sports hall "
    "that the local club had asked to share with students in the afternoons."
)


def tokenize(text):
    """Words and punctuation marks, one token each."""
    return re.findall(r"\w+|[^\w\s]", text)


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]


class BigramLM:
    """A toy causal language model: p(next word | previous word), interpolated with a unigram."""

    def __init__(self, corpus, k=0.1, lam=0.5):
        words = [t.lower() for t in tokenize(corpus)]
        self.vocab = sorted(set(words)) + ["<unk>", "<s>"]
        self.ix = {w: i for i, w in enumerate(self.vocab)}
        V = len(self.vocab)
        bigram = np.full((V, V), k)                  # add-k smoothed counts of (previous, current)
        unigram = np.full(V, k)                      # add-k smoothed counts of current word
        prev = self.ix["<s>"]
        for w in words:
            bigram[prev, self.ix[w]] += 1
            unigram[self.ix[w]] += 1
            prev = self.ix[w]
        bigram /= bigram.sum(axis=1, keepdims=True)
        unigram /= unigram.sum()
        # Unseen bigrams fall back to the unigram, so frequent words stay cheap and rare names stay costly.
        self.probs = lam * bigram + (1 - lam) * unigram[None, :]

    def surprisal(self, tokens):
        """Bits per token: -log2 p(token | previous token). High = surprising = informative."""
        out, prev = [], self.ix["<s>"]
        for t in tokens:
            cur = self.ix.get(t.lower(), self.ix["<unk>"])
            out.append(-math.log2(self.probs[prev, cur]))
            prev = cur
        return np.array(out)


def prune_tokens(tokens, lm, keep, seg=40):
    """Keep the top `keep` fraction of tokens by surprisal, segment by segment, in original order."""
    s = lm.surprisal(tokens)
    mask = np.zeros(len(tokens), dtype=bool)
    for start in range(0, len(tokens), seg):
        idx = np.arange(start, min(start + seg, len(tokens)))
        n_keep = max(1, round(keep * len(idx)))
        mask[idx[np.argsort(-s[idx], kind="stable")[:n_keep]]] = True
    return [t for t, m in zip(tokens, mask) if m]


STOP = set("the a an of and to in is was on for with by as at from that this it be are which who".split())


def lsa_select(text, keep):
    """LSA-style extractive summary: score sentences by their length in the top-3 latent topics."""
    sents = sentences(text)
    terms = [re.findall(r"[a-z0-9]+", s.lower()) for s in sents]
    vocab = sorted({w for ts in terms for w in ts if w not in STOP})
    ix = {w: i for i, w in enumerate(vocab)}
    A = np.zeros((len(vocab), len(sents)))            # term x sentence count matrix
    for j, ts in enumerate(terms):
        for w in ts:
            if w in ix:
                A[ix[w], j] += 1
    _, S, Vt = np.linalg.svd(A, full_matrices=False)
    r = min(3, len(S))
    score = ((S[:r, None] * Vt[:r]) ** 2).sum(axis=0)  # sentence weight in the top-r topics
    budget = keep * len(tokenize(text))
    chosen, used = [], 0
    for j in np.argsort(-score, kind="stable"):
        n = len(tokenize(sents[j]))
        if used + n <= budget:
            chosen.append(j)
            used += n
    return " ".join(sents[j] for j in sorted(chosen))


# ---------- experiment: every number used in the lesson and its diagrams ----------
import json
import os
import random

assert not any(g.lower() in BACKGROUND.lower() for g in GOLD), "gold leaked into the LM corpus"
lm = BigramLM(BACKGROUND)
doc_tokens = tokenize(DOC)
N = len(doc_tokens)
print("document tokens:", N, "sentences:", len(sentences(DOC)))

def retained(out_text):
    out = {t.lower() for t in tokenize(out_text)}
    return sum(all(t.lower() in out for t in tokenize(g)) for g in GOLD)

KEEPS = [0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.15]
rows = {"surprisal": [], "lsa": [], "random": [], "first": []}
rng = random.Random(0)
for keep in KEEPS:
    surp = prune_tokens(doc_tokens, lm, keep)
    lsa = lsa_select(DOC, keep)
    rnd = [t for t in doc_tokens if rng.random() < keep]
    first = doc_tokens[: round(keep * N)]
    for name, out_toks, out_text in [
        ("surprisal", surp, " ".join(surp)),
        ("lsa", tokenize(lsa), lsa),
        ("random", rnd, " ".join(rnd)),
        ("first", first, " ".join(first)),
    ]:
        rows[name].append({"keep_target": keep,
                           "kept_fraction": round(len(out_toks) / N, 3),
                           "gold_retained": retained(out_text)})
for name in rows:
    print(name)
    for r in rows[name]:
        print(f"  target {r['keep_target']:.2f}  kept {r['kept_fraction']:.3f}  gold {r['gold_retained']}/{len(GOLD)}")

# per-sentence bits for the worked example (sentence 3 of DOC)
ex = sentences(DOC)[2]
ex_toks = tokenize(ex)
ex_bits = lm.surprisal(ex_toks)
ex_kept = prune_tokens(ex_toks, lm, 0.5)
print("example:", ex)
print("example total bits:", round(float(ex_bits.sum()), 2), "tokens:", len(ex_toks))

n_ex = round(0.5 * len(ex_toks))
keep_idx = set(np.argsort(-ex_bits, kind="stable")[:n_ex].tolist())
lsa_half = lsa_select(DOC, 0.5)
lsa_ids = [i + 1 for i, s in enumerate(sentences(DOC)) if s in lsa_half]
print("example mask:", "".join("1" if i in keep_idx else "0" for i in range(len(ex_toks))))
print("lsa sentence ids at 50%:", lsa_ids)

if "__file__" in globals():  # write the data file only when run as a script, not inside the lesson checker
    data = {"doc_tokens": N, "n_sentences": len(sentences(DOC)), "gold_total": len(GOLD), "rows": rows,
            "example": {"text": ex, "tokens": ex_toks, "bits": [round(float(b), 2) for b in ex_bits],
                        "kept_mask": [i in keep_idx for i in range(len(ex_toks))]},
            "lsa_ids_at_half": lsa_ids}
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "40.2_data.json")
    json.dump(data, open(out, "w"), indent=1)
