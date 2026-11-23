"""Experiment behind lesson 59.1 (Chain-of-Thought). Produces every number used in the lesson.

Toy model, NOT an LLM. The task is a chain of modular affine maps x -> (a*x + b) mod 7,
applied to x0 = 0. Two assumptions are made explicit:
  D_DIRECT: a one-pass answerer can apply at most D_DIRECT maps in sequence before it must
            emit the answer (the serial-depth argument). It sees all maps but can only compose
            D_DIRECT of them in sequence.
  Per-token errors: when a chain-of-thought writes an intermediate state, that state is wrong
            with probability ERR (replaced by a uniform random state).
Token costs TOK_ANS and TOK_STEP are assumptions for the cost comparison, not measurements.

Writes scripts/diagrams/lessons/59.1_data.json, which the diagram script reads.
"""
import json
import pathlib

import numpy as np

P = 7            # states are 0..6
T = 4000         # tasks per chain length (experiment 1)
SEED = 59
D_DIRECT = 2     # maps a one-pass answerer can compose in sequence (toy assumption)
ERR = 0.02       # per-written-state error probability for the noisy chain-of-thought
TOK_ANS = 3      # tokens for a bare answer (assumption)
TOK_STEP = 12    # tokens to write one intermediate state (assumption)
NS = [1, 2, 4, 6, 8, 12, 16, 24, 32]

rng = np.random.default_rng(SEED)


def run(a, b, x, upto=None, err=0.0):
    """Apply the first `upto` maps in sequence. If err > 0, each written state may be corrupted."""
    n = a.shape[1] if upto is None else min(upto, a.shape[1])
    for i in range(n):
        x = (a[:, i] * x + b[:, i]) % P
        if err > 0:
            bad = rng.random(x.shape[0]) < err
            x = np.where(bad, rng.integers(0, P, x.shape[0]), x)
    return x


# Experiment 1: serial depth. Accuracy vs chain length n.
e1 = []
for n in NS:
    a = rng.integers(1, P, (T, n))
    b = rng.integers(0, P, (T, n))
    x0 = np.zeros(T, dtype=np.int64)
    truth = run(a, b, x0)
    direct = run(a, b, x0, upto=D_DIRECT)          # must answer after D_DIRECT maps
    cot_ideal = run(a, b, x0)                       # every state written correctly
    cot_noisy = run(a, b, x0, err=ERR)              # states occasionally corrupted
    e1.append({
        "n": n,
        "direct": round(float((direct == truth).mean()), 4),
        "cot_ideal": round(float((cot_ideal == truth).mean()), 4),
        "cot_noisy": round(float((cot_noisy == truth).mean()), 4),
        "direct_tokens": TOK_ANS,
        "cot_tokens": n * TOK_STEP,
    })

# Experiment 2: self-consistency. Each sample is right with probability q = p**m (independent
# per-step success p over m steps). Wrong samples are uniform over the 6 other answers.
# This independence is an idealisation: real errors are correlated, so gains are overstated here.
def vote_accuracy(p, m, ks, trials=20000):
    q = p ** m
    c = rng.integers(0, P, trials)                  # correct answer per task
    out = {}
    for k in ks:
        correct = rng.random((trials, k)) < q
        wrong = (c[:, None] + rng.integers(1, P, (trials, k))) % P
        ans = np.where(correct, c[:, None], wrong)
        counts = (ans[:, :, None] == np.arange(P)).sum(axis=1).astype(float)
        score = counts + 0.1 * rng.random((trials, P))   # random tie-break, never flips a real majority
        out[k] = round(float((score.argmax(axis=1) == c).mean()), 4)
    return q, out


KS = [1, 3, 5, 11, 21, 41]
q10, vote10 = vote_accuracy(0.9, 10, KS)
q5, vote5 = vote_accuracy(0.9, 5, KS)

e2 = {
    "p": 0.9,
    "m": 10,
    "q_single": round(q10, 4),
    "vote": {str(k): v for k, v in vote10.items()},
    "m5_q_single": round(q5, 4),
    "m5_vote": {str(k): v for k, v in vote5.items()},
}

# Experiment 3: cost per question (tokens generated), from the assumed token counts.
m = 10
cost = {
    "direct_tokens": TOK_ANS,
    "cot_tokens_m10": m * TOK_STEP,
    "sc11_tokens_m10": 11 * m * TOK_STEP,
}

data = {"seed": SEED, "P": P, "T": T, "D_DIRECT": D_DIRECT, "ERR": ERR,
        "TOK_ANS": TOK_ANS, "TOK_STEP": TOK_STEP, "chance": round(1 / P, 4),
        "e1": e1, "e2": e2, "cost": cost}

out = pathlib.Path(__file__).parent / "59.1_data.json"
out.write_text(json.dumps(data, indent=2) + "\n")

print("Experiment 1: accuracy vs chain length (T=%d tasks each, seed %d)" % (T, SEED))
print("%4s %8s %10s %10s %12s %10s" % ("n", "direct", "cot_ideal", "cot_noisy", "direct_tok", "cot_tok"))
for r in e1:
    print("%4d %8.4f %10.4f %10.4f %12d %10d" % (r["n"], r["direct"], r["cot_ideal"], r["cot_noisy"],
                                                 r["direct_tokens"], r["cot_tokens"]))
print("chance = 1/7 = %.4f" % (1 / P))
print()
print("Experiment 2: plurality vote over k samples, p=0.9 per step")
print("m=10: single-sample accuracy q = p^m = %.4f (sanity: k=1 must equal q)" % q10)
print("   ".join("k=%d:%.4f" % (k, vote10[k]) for k in KS))
print("m=5 : single-sample accuracy q = p^m = %.4f" % q5)
print("   ".join("k=%d:%.4f" % (k, vote5[k]) for k in KS))
print()
print("Experiment 3: tokens per question (assumed %d/answer, %d/step): direct=%d, CoT m=10=%d, SC k=11 m=10=%d"
      % (TOK_ANS, TOK_STEP, cost["direct_tokens"], cost["cot_tokens_m10"], cost["sc11_tokens_m10"]))
print("wrote", out)
