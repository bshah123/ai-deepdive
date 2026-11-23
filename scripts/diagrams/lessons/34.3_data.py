# Experiment for lesson 34.3 (Matryoshka embeddings). NumPy only.
# Toy setting: 10 classes, 64-d inputs with variance decaying by index, hidden by a random rotation,
# linear encoder to a 32-d embedding. Not a claim about real text models; see the lesson.
import json, os
import numpy as np

K, D_IN, D_FULL = 10, 64, 32          # classes, input dims, full embedding dims
NESTED = [2, 4, 8, 16, 32]            # MRL prefix sizes trained jointly (32 = full embedding)
EVAL = [2, 4, 8, 16, 32]              # prefix sizes evaluated
SEEDS = range(5)
STEPS, LR = 600, 0.5

def make_data(seed):
    rng = np.random.default_rng(seed)
    s = 0.85 ** np.arange(D_IN)                                 # per-coordinate scale: decays with index
    means = 2.0 * s * rng.standard_normal((K, D_IN))            # class means, same decay as the noise
    Q, _ = np.linalg.qr(rng.standard_normal((D_IN, D_IN)))      # random rotation: no axis is special
    def sample(n_per_class):
        y = np.repeat(np.arange(K), n_per_class)
        X = means[y] + s * rng.standard_normal((len(y), D_IN))
        return X @ Q, y
    Xtr, ytr = sample(200)                                      # gallery (training set)
    Xte, yte = sample(100)                                      # queries (test set)
    return Xtr, ytr, Xte, yte

def softmax(z):
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)

def train(X, y, dims, seed, steps=STEPS, lr=LR):
    """Full-batch gradient descent on the SUM of cross-entropy losses, one per prefix size m in dims.
    One linear encoder W (D x D_IN) is shared; each prefix size m has its own linear head V[m] (K x m).
    With dims=[D] this is ordinary single-size training."""
    rng = np.random.default_rng(1000 + seed)
    D = max(dims)
    W = rng.standard_normal((D, D_IN)) / np.sqrt(D_IN)
    V = {m: rng.standard_normal((K, m)) / np.sqrt(m) for m in dims}
    Y = np.eye(K)[y]
    N = len(y)
    for _ in range(steps):
        E = X @ W.T                                  # N x D embeddings
        dE = np.zeros_like(E)
        dV = {}
        for m in dims:
            Em = E[:, :m]                            # the prefix: first m coordinates only
            G = (softmax(Em @ V[m].T) - Y) / N       # d(mean CE_m)/d(logits)
            dV[m] = G.T @ Em
            dE[:, :m] += G @ V[m]                    # gradient reaches the shared coordinates
        W -= lr * (dE.T @ X)
        for m in dims:
            V[m] -= lr * dV[m]
    return W

def p_at_10(gal, gal_y, qry, qry_y, k=10):
    """Mean fraction of the k nearest gallery items (cosine on the given columns) sharing the query label."""
    g = gal / np.linalg.norm(gal, axis=1, keepdims=True)
    q = qry / np.linalg.norm(qry, axis=1, keepdims=True)
    top = np.argpartition(-(q @ g.T), k, axis=1)[:, :k]
    return float((gal_y[top] == qry_y[:, None]).mean())

def run(seed):
    Xtr, ytr, Xte, yte = make_data(seed)
    out = {}
    W_mrl = train(Xtr, ytr, NESTED, seed)
    W_std = train(Xtr, ytr, [D_FULL], seed)
    out["raw input prefix"] = {m: p_at_10(Xtr[:, :m], ytr, Xte[:, :m], yte) for m in EVAL}
    for name, W in [("MRL", W_mrl), ("standard, truncated", W_std)]:
        Gtr, Gte = Xtr @ W.T, Xte @ W.T
        out[name] = {m: p_at_10(Gtr[:, :m], ytr, Gte[:, :m], yte) for m in EVAL}
    Gtr, Gte = Xtr @ W_std.T, Xte @ W_std.T              # PCA of the standard full embedding
    mu = Gtr.mean(axis=0)
    _, _, Vt = np.linalg.svd(Gtr - mu, full_matrices=False)
    Ptr, Pte = (Gtr - mu) @ Vt.T, (Gte - mu) @ Vt.T
    out["PCA of standard"] = {m: p_at_10(Ptr[:, :m], ytr, Pte[:, :m], yte) for m in EVAL}
    out["independent per size"] = {}
    for m in EVAL:
        W = train(Xtr, ytr, [m], seed)
        out["independent per size"][m] = p_at_10(Xtr @ W.T, ytr, Xte @ W.T, yte)
    return out

if __name__ == "__main__":
    res = {}
    for seed in SEEDS:
        for name, by_m in run(seed).items():
            for m, v in by_m.items():
                res.setdefault(name, {}).setdefault(m, []).append(v)
    summary = {name: {m: (float(np.mean(v)), float(np.std(v))) for m, v in by_m.items()} for name, by_m in res.items()}
    print(f"P@10 (chance = 0.10), mean +- std over {len(SEEDS)} seeds")
    print(f"{'method':24s}" + "".join(f"{'m=' + str(m):>14s}" for m in EVAL))
    for name, by_m in summary.items():
        print(f"{name:24s}" + "".join(f"{by_m[m][0]:8.3f}+-{by_m[m][1]:.3f}" for m in EVAL))
    print("bytes per vector (float32, 4 bytes per dim):", {m: 4 * m for m in EVAL})
    if len(SEEDS) == 5:
        here = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(here, "34.3_results.json"), "w") as f:
            json.dump({"seeds": len(SEEDS), "eval_dims": EVAL,
                       "results": {n: {str(m): v for m, v in d.items()} for n, d in summary.items()}}, f, indent=1)
