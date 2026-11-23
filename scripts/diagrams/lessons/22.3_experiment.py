"""Toy GloVe and subword (FastText-style) embeddings on a generated corpus.

Every number used in lesson 22.3 comes from this file.
Run:  python3 22.3_experiment.py              (prints the numbers)
      python3 22.3_experiment.py --json OUT   (also writes them as JSON for the diagrams)
"""
import json
import random
import sys

import numpy as np

# ---------------------------------------------------------------------------
# 1. A generated corpus with known structure
# ---------------------------------------------------------------------------
ANIMALS = ["dog", "cat", "horse", "bird"]
ROYALS = ["king", "queen", "prince", "princess"]
VEHICLES = ["car", "bus", "train", "truck"]
PLACES = ["park", "home", "market", "river"]
PEOPLE = ["walker", "talker", "player", "jumper"]
GROUPS = {
    "animal": (ANIMALS, ["runs", "jumps", "walks", "plays", "sleeps"]),
    "royal": (ROYALS, ["rules", "waves", "walks", "talks", "visits"]),
    "vehicle": (VEHICLES, ["drives", "stops", "carries"]),
}


def make_corpus(n_sentences=3000, seed=7):
    rng = random.Random(seed)
    sents = []
    for _ in range(n_sentences):
        r = rng.random()
        if r < 0.5:
            nouns, verbs = GROUPS[rng.choice(list(GROUPS))]
            s = f"the {rng.choice(nouns)} {rng.choice(verbs)} to the {rng.choice(PLACES)} ."
        elif r < 0.7:
            verb = rng.choice(["walked", "talked", "played", "jumped"])
            s = f"the {rng.choice(PEOPLE)} {verb} home ."
        else:
            verb = rng.choice(["walking", "talking", "playing", "jumping"])
            s = f"the {rng.choice(ANIMALS)} is {verb} in the {rng.choice(PLACES)} ."
        sents.append(s.split())
    return sents


# The word "walkers" (plural) is never generated, so it is out of vocabulary.
OOV_WORD = "walkers"

# ---------------------------------------------------------------------------
# 2. Vocabulary and window co-occurrence counts (GloVe weights 1/distance)
# ---------------------------------------------------------------------------
def build_vocab(sents):
    words = sorted({w for s in sents for w in s})
    return words, {w: i for i, w in enumerate(words)}


def cooccurrence(sents, w2i, window=4):
    V = len(w2i)
    X = np.zeros((V, V))
    for s in sents:
        ids = [w2i[w] for w in s]
        for i, a in enumerate(ids):
            for d in range(1, window + 1):
                if i + d < len(ids):
                    b = ids[i + d]
                    X[a, b] += 1.0 / d
                    X[b, a] += 1.0 / d
    return X


# ---------------------------------------------------------------------------
# 3. GloVe: weighted least squares on log co-occurrence, full-batch AdaGrad
# ---------------------------------------------------------------------------
def weight_f(x, xmax=100.0, alpha=0.75):
    return np.minimum((x / xmax) ** alpha, 1.0)


def glove(X, dim=16, iters=3000, lr=0.05, seed=0):
    rng = np.random.default_rng(seed)
    V = X.shape[0]
    W = (rng.random((V, dim)) - 0.5) / dim
    Wt = (rng.random((V, dim)) - 0.5) / dim
    b = np.zeros(V)
    bt = np.zeros(V)
    accs = [np.ones_like(W), np.ones_like(Wt), np.ones(V), np.ones(V)]
    mask = X > 0
    F = np.where(mask, weight_f(np.where(mask, X, 1.0)), 0.0)
    logX = np.where(mask, np.log(np.where(mask, X, 1.0)), 0.0)
    losses = []
    for _ in range(iters):
        E = W @ Wt.T + b[:, None] + bt[None, :] - logX
        losses.append(float((F * E ** 2).sum()))
        G = 2.0 * F * E
        grads = [G @ Wt, G.T @ W, G.sum(1), G.sum(0)]
        for p, g, acc in zip([W, Wt, b, bt], grads, accs):
            acc += g * g
            p -= lr * g / np.sqrt(acc)
    return W + Wt, losses, (F, logX, W, Wt, b, bt)  # GloVe uses W + W~ as the word vector


def glove_loss(F, logX, W, Wt, b, bt):
    E = W @ Wt.T + b[:, None] + bt[None, :] - logX
    return float((F * E ** 2).sum())


# ---------------------------------------------------------------------------
# 4. Subword model: word vector = mean of its character n-gram vectors
# ---------------------------------------------------------------------------
def ngrams(word, nmin=3, nmax=6):
    w = f"<{word}>"
    out = [w]  # the whole word is also a unit, as in FastText
    for n in range(nmin, nmax + 1):
        out += [w[i:i + n] for i in range(len(w) - n + 1)]
    return out


def subword_model(X, words, dim=16, iters=3000, lr=0.05, K=5, seed=0):
    grams = {}
    for w in words:
        for g in ngrams(w):
            grams.setdefault(g, len(grams))
    M = np.zeros((len(words), len(grams)))
    for i, w in enumerate(words):
        idx = [grams[g] for g in ngrams(w)]
        M[i, idx] = 1.0 / len(idx)

    rng = np.random.default_rng(seed)
    Z = (rng.random((len(grams), dim)) - 0.5) / dim  # n-gram input vectors
    U = np.zeros((len(words), dim))                  # output (context) vectors
    n_i = X.sum(1, keepdims=True)                    # how often word i is a centre
    Pn = X.sum(0) ** 0.75
    Pn = Pn / Pn.sum()                               # noise distribution
    NZ = K * n_i * Pn[None, :]                       # expected negative-sample counts
    acc_Z, acc_U = np.ones_like(Z), np.ones_like(U)
    losses = []
    for _ in range(iters):
        H = M @ Z
        S = H @ U.T
        Sig = 1.0 / (1.0 + np.exp(-S))
        losses.append(float(-(X * np.log(Sig + 1e-12) + NZ * np.log(1 - Sig + 1e-12)).sum()))
        Gm = Sig * (X + NZ) - X                      # dLoss/dScore for each (word, context)
        gZ = M.T @ (Gm @ U)
        gU = Gm.T @ H
        acc_Z += gZ * gZ
        Z -= lr * gZ / np.sqrt(acc_Z)
        acc_U += gU * gU
        U -= lr * gU / np.sqrt(acc_U)
    return grams, Z, losses, (M, U, NZ)


def sgns_loss(X, M, Z, U, NZ):
    S = (M @ Z) @ U.T
    Sig = 1.0 / (1.0 + np.exp(-S))
    return float(-(X * np.log(Sig + 1e-12) + NZ * np.log(1 - Sig + 1e-12)).sum())


def vector(word, grams, Z):
    idx = [grams[g] for g in ngrams(word) if g in grams]
    return Z[idx].mean(0), len(idx), len(ngrams(word))


def cos(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))


def centre(vecs):
    # Subtract the mean vector: removes the large common direction (see the raw cosines printed below).
    return vecs - vecs.mean(0)


def neighbours(word, vecs, words, k=4):
    q = vecs[words.index(word)]
    sims = [(cos(q, vecs[i]), w) for i, w in enumerate(words) if w != word]
    return sorted(sims, reverse=True)[:k]


# ---------------------------------------------------------------------------
ROYAL = {"queen", "prince", "princess"}
ANIMAL = {"cat", "horse", "bird", "dog"}


def report_cosines(tag, vecs, w2i):
    raw = cos(vecs[w2i["king"]], vecs[w2i["queen"]])
    c = centre(vecs)
    print(f"{tag}: raw cos(king,queen)={raw:.3f}  centred cos(king,queen)={cos(c[w2i['king']], c[w2i['queen']]):.3f}")
    return raw


def main(json_path=None):
    out = {}
    sents = make_corpus()
    words, w2i = build_vocab(sents)
    X = cooccurrence(sents, w2i)
    out["corpus"] = {"sentences": len(sents), "tokens": sum(map(len, sents)), "vocab": len(words)}
    print(f"sentences={len(sents)} tokens={out['corpus']['tokens']} vocab={len(words)}")
    print("OOV word in vocab:", OOV_WORD in w2i)

    pairs = [("king", "rules"), ("king", "waves"), ("king", "runs"), ("dog", "runs"), ("car", "drives")]
    out["pair_counts"] = {f"{a}-{b}": float(X[w2i[a], w2i[b]]) for a, b in pairs}
    rows, cols = ["king", "queen", "dog", "car"], ["rules", "waves", "runs", "drives", "park", "home"]
    out["cooc_grid"] = {"rows": rows, "cols": cols,
                        "values": [[round(float(X[w2i[r], w2i[c]]), 1) for c in cols] for r in rows]}
    print("window counts:", {k: round(v, 2) for k, v in out["pair_counts"].items()})

    # Hand-worked GloVe term: X_ij = 10, prediction w.w~ + b + b~ = 1.0
    x, pred = 10.0, 1.0
    f = float(weight_f(x))
    e = pred - np.log(x)
    term = f * e * e
    out["worked_term"] = {"x": x, "f": f, "log_x": float(np.log(x)), "e": float(e), "term": float(term)}
    print(f"f(10)={f:.4f} log(10)={np.log(x):.4f} e={e:.4f} f*e^2={term:.4f}")
    out["f_curve"] = {str(v): round(float(weight_f(v)), 4) for v in [1, 5, 10, 50, 100, 500]}
    print("f(x):", out["f_curve"])

    # ---- GloVe ----
    vecs, glosses, (F, logX, W, Wt, b, bt) = glove(X)
    out["glove_loss"] = {"start": glosses[0], "end": glosses[-1]}
    print(f"GloVe loss start={glosses[0]:.3f} end={glosses[-1]:.3f}")
    eps = 1e-6  # finite-difference check of one gradient entry
    i, j = w2i["king"], 3
    Wp = W.copy(); Wp[i, j] += eps
    Wm = W.copy(); Wm[i, j] -= eps
    num = (glove_loss(F, logX, Wp, Wt, b, bt) - glove_loss(F, logX, Wm, Wt, b, bt)) / (2 * eps)
    G = 2.0 * F * (W @ Wt.T + b[:, None] + bt[None, :] - logX)
    ana = float((G @ Wt)[i, j])
    out["gradcheck_rel_err"] = abs(num - ana) / max(1e-12, abs(num))
    print(f"gradient check rel err={out['gradcheck_rel_err']:.2e}")
    raw_gl = report_cosines("GloVe", vecs, w2i)
    cg = centre(vecs)
    out["glove_raw_cos_king_queen"] = raw_gl
    out["glove_nn_king"] = [[round(s, 4), w] for s, w in neighbours("king", cg, words)]
    out["glove_nn_dog"] = [[round(s, 4), w] for s, w in neighbours("dog", cg, words)]
    print("GloVe king:", [(w, round(s, 3)) for s, w in neighbours("king", cg, words)])
    print("GloVe dog :", [(w, round(s, 3)) for s, w in neighbours("dog", cg, words)])
    long_vecs, long_losses, _ = glove(X, iters=10000)
    out["glove_long"] = {"iters": 10000, "loss": long_losses[-1],
                         "nn_king": [[round(s, 4), w] for s, w in neighbours("king", centre(long_vecs), words)]}
    print(f"GloVe 10000 iters: loss={long_losses[-1]:.3f} king:",
          [w for _, w in neighbours("king", centre(long_vecs), words)])

    # ---- subword model ----
    grams, Z, flosses, (M, U, NZ) = subword_model(X, words)
    out["subword_loss"] = {"start": flosses[0], "end": flosses[-1], "ngram_index_size": len(grams)}
    print(f"subword loss start={flosses[0]:.1f} end={flosses[-1]:.1f} n-gram index={len(grams)}")
    # finite-difference check of the analytic gradient w.r.t. one n-gram vector entry
    Sig = 1.0 / (1.0 + np.exp(-((M @ Z) @ U.T)))
    Gm = Sig * (X + NZ) - X
    ana = float((M.T @ (Gm @ U))[3, 2])
    Zp = Z.copy(); Zp[3, 2] += eps
    Zm = Z.copy(); Zm[3, 2] -= eps
    num = (sgns_loss(X, M, Zp, U, NZ) - sgns_loss(X, M, Zm, U, NZ)) / (2 * eps)
    out["subword_gradcheck_rel_err"] = abs(num - ana) / max(1e-12, abs(num))
    print(f"subword gradient check rel err={out['subword_gradcheck_rel_err']:.2e}")
    fvecs = np.array([vector(w, grams, Z)[0] for w in words])
    report_cosines("subword", fvecs, w2i)
    cf = centre(fvecs)
    out["sub_nn_king"] = [[round(s, 4), w] for s, w in neighbours("king", cf, words)]
    out["sub_nn_dog"] = [[round(s, 4), w] for s, w in neighbours("dog", cf, words)]
    print("subword king:", [(w, round(s, 3)) for s, w in neighbours("king", cf, words)])
    print("subword dog :", [(w, round(s, 3)) for s, w in neighbours("dog", cf, words)])

    v, n_found, n_total = vector(OOV_WORD, grams, Z)
    out["oov"] = {"word": OOV_WORD, "ngrams_total": n_total, "ngrams_found": n_found,
                  "first_grams": ngrams(OOV_WORD)[:7], "in_glove_vocab": OOV_WORD in w2i}
    print(f"OOV '{OOV_WORD}': n-grams total={n_total} found in index={n_found}")
    print("first n-grams:", ngrams(OOV_WORD)[:7])
    cands = ["walker", "walked", "walks", "king", "car"]
    mu = fvecs.mean(0)
    out["oov_cos_centred"] = {c: round(cos(v - mu, fvecs[w2i[c]] - mu), 4) for c in cands}
    out["oov_cos_raw"] = {c: round(cos(v, fvecs[w2i[c]]), 4) for c in cands}
    out["oov_shared"] = {c: len(set(ngrams(OOV_WORD)) & set(ngrams(c))) for c in cands}
    out["oov_grams"] = [[g, g in grams] for g in ngrams(OOV_WORD)]
    print("OOV cos centred:", out["oov_cos_centred"])
    print("OOV cos raw    :", out["oov_cos_raw"])
    print("shared n-grams :", out["oov_shared"])

    # ---- seed sweep: do the qualitative results survive other initialisations? ----
    sweep = []
    for seed in range(5):
        gv, _, _ = glove(X, seed=seed)
        g2, Z2, _, _ = subword_model(X, words, seed=seed)
        fv2 = np.array([vector(w, g2, Z2)[0] for w in words])
        v2 = vector(OOV_WORD, g2, Z2)[0]
        mu2 = fv2.mean(0)
        king_gl = [w for _, w in neighbours("king", centre(gv), words, k=3)]
        king_sub = [w for _, w in neighbours("king", centre(fv2), words, k=3)]
        ranking = sorted(cands, key=lambda c: -cos(v2 - mu2, fv2[w2i[c]] - mu2))
        sweep.append({"seed": seed, "glove_king_top3": king_gl, "sub_king_top3": king_sub,
                      "oov_ranking": ranking[:4]})
        print(f"seed {seed}: GloVe king top3={king_gl} | subword king top3={king_sub} | OOV rank={ranking[:4]}")
    out["seed_sweep"] = sweep

    if json_path:
        with open(json_path, "w") as fh:
            json.dump(out, fh, indent=1, default=float)


if __name__ == "__main__":
    argv = getattr(sys, "argv", [])
    main(argv[argv.index("--json") + 1] if "--json" in argv else None)
