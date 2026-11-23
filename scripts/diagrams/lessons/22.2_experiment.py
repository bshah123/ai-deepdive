"""Experiment for lesson 22.2 (Word2Vec). Every number in the lesson and its diagrams comes from this file.

Run:  python3 22.2_experiment.py      (NumPy only)
Writes 22.2_data.json next to this file, which 22.2.mjs reads.
"""
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


# ---- toy corpus: two word groups that share frames inside each group -----------
ANIMALS = ["cat", "dog", "horse"]
VEHICLES = ["car", "truck", "bus"]
ANIMAL_FRAMES = ["the {} ate the food", "the {} slept in the yard", "a {} ran in the park",
                 "the {} chased the ball", "my {} wants to play"]
VEHICLE_FRAMES = ["the {} drove down the road", "the {} needs fuel at the station",
                  "a {} stopped at the light", "the {} parked in the garage", "my {} is very fast"]


def make_corpus(seed=0, repeats=3):
    sents = [f.format(w) for w in ANIMALS for f in ANIMAL_FRAMES]
    sents += [f.format(w) for w in VEHICLES for f in VEHICLE_FRAMES]
    sents = sents * repeats
    order = np.random.default_rng(seed).permutation(len(sents))
    return [sents[i].split() for i in order]


def build_vocab(sents):
    counts = {}
    for s in sents:
        for w in s:
            counts[w] = counts.get(w, 0) + 1
    vocab = sorted(counts, key=lambda w: (-counts[w], w))
    index = {w: i for i, w in enumerate(vocab)}
    freq = np.array([counts[w] for w in vocab], dtype=float)
    return vocab, index, freq


def sg_pairs(ids, window):
    """(center, context) pairs; skip-gram predicts each context word from the center."""
    pairs = []
    for s in ids:
        for i, t in enumerate(s):
            for j in range(max(0, i - window), min(len(s), i + window + 1)):
                if j != i:
                    pairs.append((t, s[j]))
    return pairs


def cbow_examples(ids, window):
    """(context list, center) examples; CBOW predicts the center from its averaged context."""
    ex = []
    for s in ids:
        for i, t in enumerate(s):
            ctx = [s[j] for j in range(max(0, i - window), min(len(s), i + window + 1)) if j != i]
            if ctx:
                ex.append((ctx, t))
    return ex


def train(ids, V, freq, model="sg", d=16, window=2, K=5, epochs=10,
          lr0=0.05, lr_min=0.001, seed=0):
    rng = np.random.default_rng(seed)
    Win = (rng.random((V, d)) - 0.5) / d      # input (word) vectors, as in the word2vec code
    Wout = np.zeros((V, d))                   # output (context) vectors start at zero
    pn = freq ** 0.75
    pn /= pn.sum()                            # noise distribution P_n(w) ~ count^(3/4)
    data = sg_pairs(ids, window) if model == "sg" else cbow_examples(ids, window)
    history = []
    for ep in range(epochs):
        lr = max(lr0 * (1 - ep / epochs), lr_min)
        total = 0.0
        for k in rng.permutation(len(data)):
            negs = rng.choice(V, size=K, p=pn)  # K noise words per example (may repeat the target)
            if model == "sg":
                t, c = data[k]
                v = Win[t].copy()
                grad_v = np.zeros(d)
                for idx, y in [(c, 1)] + [(n, 0) for n in negs]:
                    u = Wout[idx].copy()
                    s = u @ v
                    total += -np.log(sigmoid(s)) if y == 1 else -np.log(sigmoid(-s))
                    g = sigmoid(s) - y
                    grad_v += g * u
                    Wout[idx] -= lr * g * v
                Win[t] -= lr * grad_v
            else:
                ctx, t = data[k]
                h = Win[ctx].mean(axis=0)
                grad_h = np.zeros(d)
                for idx, y in [(t, 1)] + [(n, 0) for n in negs]:
                    u = Wout[idx].copy()
                    s = u @ h
                    total += -np.log(sigmoid(s)) if y == 1 else -np.log(sigmoid(-s))
                    g = sigmoid(s) - y
                    grad_h += g * u
                    Wout[idx] -= lr * g * h
                for c in ctx:
                    Win[c] -= lr * grad_h / len(ctx)
        history.append(total / len(data))
    return Win, Wout, history, len(data)


def cos(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))


def neighbours(Win, vocab, word, k=3):
    E = Win / np.linalg.norm(Win, axis=1, keepdims=True)
    sims = E @ E[vocab.index(word)]
    order = [i for i in np.argsort(-sims) if vocab[i] != word][:k]
    return [(vocab[i], round(float(sims[i]), 3)) for i in order]


out = {}

# ---- 1. corpus and skip-gram pair counts ----------------------------------------
sents = make_corpus(seed=0)
vocab, index, freq = build_vocab(sents)
ids = [[index[w] for w in s] for s in sents]
out["corpus"] = {"sentences": len(sents), "tokens": int(freq.sum()), "vocab": len(vocab),
                 "count_cat": int(freq[index["cat"]]), "count_car": int(freq[index["car"]])}
ex_pairs = sg_pairs([[0, 1, 2, 3, 4]], window=2)   # "the quick brown fox jumps" as ids
out["pairs_five_tokens_window2"] = len(ex_pairs)
out["pairs_corpus_window2"] = len(sg_pairs(ids, 2))

# ---- 2. noise distribution: unigram vs count^(3/4) -------------------------------
f = np.array([100.0, 10.0, 1.0])
uni = f / f.sum()
p34 = f ** 0.75 / (f ** 0.75).sum()
out["noise_example"] = {"counts": f.tolist(), "unigram": uni.tolist(), "power34": p34.tolist()}
fc = freq ** 0.75 / (freq ** 0.75).sum()
out["noise_corpus"] = {"word": vocab, "count": freq.tolist(), "unigram": (freq / freq.sum()).tolist(),
                       "power34": fc.tolist()}

# ---- 3. hand-checkable single SGNS update (2-d, one positive, one negative) -------
v = np.array([0.5, 0.25])
u_pos = np.array([0.4, 0.8])
u_neg = np.array([-0.6, 0.2])
lr = 0.1
s_pos, s_neg = u_pos @ v, u_neg @ v
g_pos, g_neg = sigmoid(s_pos) - 1, sigmoid(s_neg) - 0
grad_v = g_pos * u_pos + g_neg * u_neg
v2 = v - lr * grad_v
u_pos2 = u_pos - lr * g_pos * v
u_neg2 = u_neg - lr * g_neg * v
out["hand"] = {
    "v": v.tolist(), "u_pos": u_pos.tolist(), "u_neg": u_neg.tolist(), "lr": lr,
    "s_pos": float(s_pos), "s_neg": float(s_neg),
    "sig_pos": float(sigmoid(s_pos)), "sig_neg": float(sigmoid(s_neg)),
    "loss_pos": float(-np.log(sigmoid(s_pos))), "loss_neg": float(-np.log(sigmoid(-s_neg))),
    "g_pos": float(g_pos), "g_neg": float(g_neg), "grad_v": grad_v.tolist(),
    "v_new": v2.tolist(), "u_pos_new": u_pos2.tolist(), "u_neg_new": u_neg2.tolist(),
    "s_pos_new": float(u_pos2 @ v2), "s_neg_new": float(u_neg2 @ v2),
}

# ---- 4. train SGNS and CBOW (seed 0) -------------------------------------------
Win_sg, _, hist_sg, n_sg = train(ids, len(vocab), freq, "sg", seed=0)
Win_cb, _, hist_cb, n_cb = train(ids, len(vocab), freq, "cbow", seed=0)
out["loss_init_theory"] = 6 * float(np.log(2))          # (1 + K) * log 2 with K = 5, zero output vectors
out["sg_history"] = hist_sg
out["cbow_history"] = hist_cb
out["sg_examples_per_epoch"] = n_sg
out["cbow_examples_per_epoch"] = n_cb
out["sg_neighbours_cat"] = neighbours(Win_sg, vocab, "cat")
out["cbow_neighbours_cat"] = neighbours(Win_cb, vocab, "cat")
out["sg_neighbours_car"] = neighbours(Win_sg, vocab, "car")

# ---- 5. robustness over 5 seeds (corpus order and init both change) ---------------
rows = {}
for model in ["sg", "cbow"]:
    res = {"cat_dog": [], "cat_car": [], "car_truck": [], "cat_top2_animals": []}
    for seed in range(5):
        sents_s = make_corpus(seed=seed)
        vocab_s, index_s, freq_s = build_vocab(sents_s)
        ids_s = [[index_s[w] for w in s] for s in sents_s]
        W, _, _, _ = train(ids_s, len(vocab_s), freq_s, model, seed=seed)
        g = lambda w: W[index_s[w]]
        res["cat_dog"].append(cos(g("cat"), g("dog")))
        res["cat_car"].append(cos(g("cat"), g("car")))
        res["car_truck"].append(cos(g("car"), g("truck")))
        top2 = [w for w, _ in neighbours(W, vocab_s, "cat", k=2)]
        res["cat_top2_animals"].append(sum(w in ANIMALS for w in top2))
    rows[model] = {k: [round(x, 4) for x in v] if k != "cat_top2_animals" else v
                   for k, v in res.items()}
out["seeds"] = rows

# ---- 6. cost of a full softmax versus negative sampling (per (w, c) pair) ------
V_big, d_big, K = 100_000, 300, 5
out["cost"] = {"V": V_big, "d": d_big, "K": K,
               "full_softmax_dots": V_big, "ns_dots": K + 1,
               "ratio": V_big / (K + 1),
               "full_softmax_madds": V_big * d_big, "ns_madds": (K + 1) * d_big}

# ---- 5b. diagnostics: anisotropy (all cosines high) and learning-rate sensitivity --
def anisotropy(W):
    E = W / np.linalg.norm(W, axis=1, keepdims=True)
    S = E @ E.T
    n = len(E)
    return float((S.sum() - n) / (n * (n - 1)))   # mean off-diagonal cosine


def centred_cos(W, a, b):
    mu = W.mean(axis=0)
    return cos(W[index[a]] - mu, W[index[b]] - mu)


diag = {}
for model in ["sg", "cbow"]:
    diag[model] = {"anisotropy": anisotropy(Win_sg if model == "sg" else Win_cb),
                   "cat_car_centred": centred_cos(Win_sg if model == "sg" else Win_cb, "cat", "car")}
out["diagnostics_seed0"] = diag
sens = {}
for lr0 in [0.025, 0.05]:
    for model in ["sg", "cbow"]:
        vals = []
        for seed in range(5):
            sents_s = make_corpus(seed=seed)
            vocab_s, index_s, freq_s = build_vocab(sents_s)
            ids_s = [[index_s[w] for w in s] for s in sents_s]
            W, _, _, _ = train(ids_s, len(vocab_s), freq_s, model, seed=seed, lr0=lr0)
            vals.append(round(cos(W[index_s["cat"]], W[index_s["car"]]), 4))
        sens[f"{model}_lr{lr0}"] = vals
out["sensitivity_cat_car"] = sens

with open(os.path.join(HERE, "22.2_data.json"), "w") as fh:
    json.dump(out, fh, indent=1)

# ---- print the numbers the text quotes -------------------------------------------
print("corpus:", out["corpus"])
print("pairs, 5 tokens, window 2:", out["pairs_five_tokens_window2"], "| whole corpus:", out["pairs_corpus_window2"])
print("noise example unigram:", np.round(uni, 4), "power 3/4:", np.round(p34, 4))
print("hand:", {k: (np.round(x, 4).tolist() if isinstance(x, list) else round(x, 4)) for k, x in out["hand"].items()
                if k not in ("lr",)})
print("loss theory init:", round(out["loss_init_theory"], 4))
print("SG loss by epoch:", np.round(hist_sg, 4).tolist())
print("CBOW loss by epoch:", np.round(hist_cb, 4).tolist())
print("SG neighbours cat:", out["sg_neighbours_cat"], " car:", out["sg_neighbours_car"])
print("CBOW neighbours cat:", out["cbow_neighbours_cat"])
for m in rows:
    print(m, {k: v for k, v in rows[m].items()})
print("cost:", out["cost"])
print("diagnostics:", out["diagnostics_seed0"])
print("sensitivity cat-car:", out["sensitivity_cat_car"])
