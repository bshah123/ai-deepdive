import random, re
from collections import Counter

def pick(rng, seq):
    return seq[int(rng.random() * len(seq))]

def tokens(s):
    return re.findall(r"[a-z0-9]+", s.lower())

def lcs_len(a, b):
    prev = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b, 1):
            cur.append(prev[j - 1] + 1 if x == y else max(prev[j], cur[j - 1]))
        prev = cur
    return prev[-1]

def rouge_l(cand, ref):
    """ROUGE-L F1 on lower-cased word tokens. Our tokenizer, not the paper's."""
    c, r = tokens(cand), tokens(ref)
    if not c or not r:
        return 0.0
    l = lcs_len(c, r)
    if l == 0:
        return 0.0
    p, q = l / len(c), l / len(r)
    return 2 * p * q / (p + q)

VERBS = ["summarize", "classify", "translate", "explain", "list", "rewrite", "compare", "extract"]
OBJECTS = ["a news article", "a product review", "a short story", "a math word problem",
           "an email", "a recipe", "a picture caption", "a poem"]
CONSTRAINTS = ["in exactly three bullet points", "in under fifty words", "for a ten-year-old reader",
               "in the present tense", "as valid JSON", "without any adjectives"]
TOPICS = ["volcanoes", "rent prices", "solar panels", "the French Revolution", "sleep cycles",
          "bicycle repair", "coral reefs", "tax forms", "chess openings", "monsoon rain",
          "vaccine trials", "public libraries", "electric cars", "river deltas", "job interviews",
          "wind turbines", "medieval castles", "bread baking", "lunar eclipses", "water filters"]
BANNED = {"picture", "image", "graph"}   # keyword filter; the paper names image, picture, graph

def fresh(rng):
    text = f"{pick(rng, VERBS).capitalize()} {pick(rng, OBJECTS)} about {pick(rng, TOPICS)}"
    if rng.random() < 0.5:
        text += " " + pick(rng, CONSTRAINTS)
    return text + "."

class StubTeacher:
    """Stand-in for an LLM. It is not a language model: it writes templated text.
    With probability copy_prob it imitates a demonstration (copy it, swap the first word).
    Otherwise it composes a fresh instruction."""
    def __init__(self, copy_prob=0.35):
        self.copy_prob = copy_prob

    def write(self, rng, demos):
        if rng.random() < self.copy_prob:
            words = pick(rng, demos).split()
            words[0] = pick(rng, VERBS).capitalize()
            return " ".join(words)
        return fresh(rng)

SEED_TASKS, DEMOS, FROM_HUMAN, THRESHOLD = 175, 8, 6, 0.7

def self_instruct(rng, seeds, teacher, proposals=1000, threshold=THRESHOLD):
    pool, machine = list(seeds), []
    funnel = Counter(proposed=0, rejected_keyword=0, rejected_length=0, rejected_rouge=0, accepted=0)
    for _ in range(proposals):
        demos = [pick(rng, seeds) for _ in range(FROM_HUMAN)]
        demos += [pick(rng, machine or seeds) for _ in range(DEMOS - FROM_HUMAN)]
        cand = teacher.write(rng, demos)
        funnel["proposed"] += 1
        toks = tokens(cand)
        if BANNED & set(toks):
            funnel["rejected_keyword"] += 1
        elif not 3 <= len(toks) <= 20:              # our length cutoffs, not the paper's
            funnel["rejected_length"] += 1
        elif max(rouge_l(cand, p) for p in pool) >= threshold:
            funnel["rejected_rouge"] += 1
        else:
            funnel["accepted"] += 1
            pool.append(cand)
            machine.append(cand)
    return machine, funnel

seed_rng = random.Random(1)
seeds = [fresh(seed_rng) for _ in range(SEED_TASKS)]

machine, funnel = self_instruct(random.Random(2), seeds, StubTeacher())
print("funnel:", dict(funnel))
print("first accepted:", machine[:3])
print("ROUGE-L, near-twins:", round(rouge_l("Summarize a news article about rent prices.", "Summarize a news article about volcanoes."), 3))

sweep_rows = []
for t in [0.5, 0.6, 0.7, 0.8, 0.9]:
    m, f = self_instruct(random.Random(2), seeds, StubTeacher(), 1000, t)
    words = {w for s in m for w in tokens(s)}
    sweep_rows.append((t, f["accepted"], len(words)))
    print(f"threshold {t:.1f}: accepted {f['accepted']:4d}  distinct words {len(words)}")

OPS = {
    "add constraint": ["in under fifty words", "without any bullet points", "as valid JSON", "in the present tense"],
    "deepen": ["focusing on edge cases", "for a specialist audience", "with the main assumptions stated"],
    "concretize": ["using a concrete everyday example", "with three specific numbers", "naming a real city"],
    "more reasoning steps": ["showing each reasoning step", "checking the answer before stating it"],
    "complicate input": ["given a table with missing values", "where two of the inputs conflict"],
}

def evolve(rng, starts, rounds=4):
    by_depth = {0: list(starts)}
    killed = []
    for d in range(1, rounds + 1):
        nxt, dead = [], 0
        for text in by_depth[d - 1]:
            op = pick(rng, list(OPS))
            clause = pick(rng, OPS[op])
            if clause in text:                  # no information gain: the clause is already there
                dead += 1
            else:
                nxt.append(text.rstrip(".") + ", " + clause + ".")
        by_depth[d] = nxt
        killed.append(dead)
    return by_depth, killed

by_depth, killed = evolve(random.Random(3), seeds[:40])
for d in range(5):
    n = len(by_depth[d])
    mean = sum(len(tokens(s)) for s in by_depth[d]) / n if n else 0.0
    print(f"depth {d}: survivors {n:2d}  mean words {mean:5.1f}")
print("eliminated per round:", killed)
print("example at depth 4:", by_depth[4][0])
import bisect, math, random

K, N, GENS, RUNS = 50, 200, 30, 20
zipf = [1.0 / (k + 1) for k in range(K)]          # Zipf-like: category k has weight 1/k
Z = sum(zipf)
p_real = [w / Z for w in zipf]

def draw_counts(rng, probs, n):
    cum, s = [], 0.0
    for p in probs:
        s += p
        cum.append(s)
    counts = [0] * len(probs)
    for _ in range(n):
        u = rng.random() * s
        counts[min(bisect.bisect_right(cum, u), len(probs) - 1)] += 1
    return counts

def entropy_bits(p):
    return -sum(x * math.log2(x) for x in p if x > 0)

def run(seed, anchor):
    """Each generation: sample from the current model, refit by empirical frequency (maximum likelihood)."""
    rng = random.Random(seed)
    p = list(p_real)
    support, entropy = [], []
    for g in range(GENS + 1):
        support.append(sum(1 for x in p if x > 0))
        entropy.append(entropy_bits(p))
        if g == GENS:
            break
        if anchor:   # half the training sample is always fresh real data
            counts = [a + b for a, b in zip(draw_counts(rng, p, N // 2), draw_counts(rng, p_real, N // 2))]
        else:        # pure self-training: all of it is generated by the previous model
            counts = draw_counts(rng, p, N)
        total = sum(counts)
        p = [x / total for x in counts]
    return support, entropy

print(f"real distribution: entropy {entropy_bits(p_real):.2f} bits over {K} categories")
series = {}
for anchor in (False, True):
    sup = [0.0] * (GENS + 1)
    ent = [0.0] * (GENS + 1)
    for seed in range(RUNS):
        s, e = run(seed, anchor)
        for g in range(GENS + 1):
            sup[g] += s[g] / RUNS
            ent[g] += e[g] / RUNS
    label = "anchored (half real)" if anchor else "pure self-training"
    series[label] = (sup, ent)
    print(label)
    for g in (0, 1, 5, 10, 20, 30):
        print(f"  gen {g:2d}: support {sup[g]:5.1f} of {K}  entropy {ent[g]:5.2f} bits")

# ---- export every number the diagrams use (diagram script reads this JSON) ----
import json, sys
out = {
    "seed_tasks": SEED_TASKS, "demos": DEMOS, "from_human": FROM_HUMAN, "threshold": THRESHOLD,
    "funnel": dict(funnel),
    "sweep": [{"threshold": t, "accepted": a, "distinct_words": w} for t, a, w in sweep_rows],
    "evol_depth": [{"depth": d, "survivors": len(by_depth[d]),
                    "mean_words": (sum(len(tokens(s)) for s in by_depth[d]) / len(by_depth[d])) if by_depth[d] else 0.0}
                   for d in range(5)],
    "evol_eliminated_per_round": killed,
    "collapse_K": K, "collapse_N": N, "collapse_runs": RUNS, "collapse_gens": GENS,
    "real_entropy_bits": entropy_bits(p_real),
    "collapse": {label: {"support": sup, "entropy": ent} for label, (sup, ent) in series.items()},
}
json.dump(out, open(sys.argv[1], "w"), indent=1)
print("wrote", sys.argv[1])
