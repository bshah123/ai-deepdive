# Experiment for lesson 19.6 (energy-based models, energy surfaces, margin losses).
# Run: <python> scripts/diagrams/lessons/19.6_experiment.py
# Writes every number used in the lesson and its diagrams to 19.6_data.json.
# NumPy only, so the lesson's visible code blocks reproduce the same numbers.
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "19.6_data.json")
K = 3  # number of candidate classes


def gibbs_probs(E):
    """p_k = exp(-E_k) / sum_j exp(-E_j), beta = 1, computed stably."""
    a = -(E - E.min())
    w = np.exp(a)
    return w / w.sum()


def lse_neg(E):
    """log sum_k exp(-E_k), stable."""
    return -E.min() + np.log(np.exp(-(E - E.min())).sum())


def make_data(seed, n=60):
    rng = np.random.default_rng(seed)
    centers = np.array([[0.0, 0.0], [3.0, 0.0], [0.0, 3.0]])
    X = np.vstack([c + rng.normal(0.0, 1.0, size=(n, 2)) for c in centers])
    y = np.repeat(np.arange(K), n)
    return X, y


# ---------- Model 1: prototype energy E(x, k) = ||x - c_k||^2 ----------

def proto_E(C, x):
    return ((x - C) ** 2).sum(axis=1)


def sample_grad_nll(C, x, t):
    """Gradient of L_NLL = E_t + log sum_k exp(-E_k) w.r.t. C (shape K x 2)."""
    E = proto_E(C, x)
    g = np.eye(K)[t] - gibbs_probs(E)          # dL/dE_k = 1[k=t] - p_k
    return g[:, None] * (-2.0) * (x - C)       # dE_k/dC_k = -2 (x - C_k)


def sample_grad_margin(C, x, t, m):
    """Gradient of sum_{k != t} max(0, m + E_t - E_k) w.r.t. C."""
    E = proto_E(C, x)
    gC = np.zeros_like(C)
    for k in range(K):
        if k != t and m + E[t] - E[k] > 0:
            gC[t] += -2.0 * (x - C[t])         # d E_t / d C_t, pulls target energy down when stepped against
            gC[k] += 2.0 * (x - C[k])          # -d E_k / d C_k, pushes contrast energy up
    return gC


def sample_loss_nll(C, x, t):
    E = proto_E(C, x)
    return E[t] + lse_neg(E)


def sample_loss_margin(C, x, t, m):
    E = proto_E(C, x)
    return sum(max(0.0, m + E[t] - E[k]) for k in range(K) if k != t)


def predict(C, X):
    D = ((X[:, None, :] - C[None]) ** 2).sum(-1)
    return D.argmin(axis=1)


def evaluate(C, X, y, m):
    E_all = ((X[:, None, :] - C[None]) ** 2).sum(-1)
    Et = E_all[np.arange(len(y)), y]
    Ek = E_all.copy()
    Ek[np.arange(len(y)), y] = np.inf
    gap = Ek.min(axis=1) - Et
    nll = np.mean([sample_loss_nll(C, x, t) for x, t in zip(X, y)])
    zero = np.mean([sample_loss_margin(C, x, t, m) == 0.0 for x, t in zip(X, y)])
    return {
        "acc": float(np.mean(predict(C, X) == y)),
        "mean_nll": float(nll),
        "frac_zero_margin": float(zero),
        "mean_gap": float(gap.mean()),
    }


def train_proto(method, X, y, lr, m=1.0, epochs=60, seed=1, val=None, test=None):
    rng = np.random.default_rng(seed)
    C = rng.normal(0.0, 0.5, size=(K, 2))
    curve = {"epoch": [], "train_acc": [], "test_acc": [], "mean_nll": [], "frac_zero_margin": []}
    for ep in range(1, epochs + 1):
        for i in rng.permutation(len(X)):
            x, t = X[i], y[i]
            g = sample_grad_nll(C, x, t) if method == "nll" else sample_grad_margin(C, x, t, m)
            C = C - lr * g
        ev_tr = evaluate(C, X, y, m)
        ev_te = evaluate(C, *test, m)
        curve["epoch"].append(ep)
        curve["train_acc"].append(ev_tr["acc"])
        curve["test_acc"].append(ev_te["acc"])
        curve["mean_nll"].append(ev_tr["mean_nll"])
        curve["frac_zero_margin"].append(ev_tr["frac_zero_margin"])
    return C, curve


# ---------- Model 2: linear-quadratic energy E(x, k) = ||W_k x||^2 (collapse demo) ----------

def lin_E(W, x):
    return np.array([np.sum((W[k] @ x) ** 2) for k in range(K)])


def train_lin(method, X, y, lr, m=1.0, epochs=30, seed=3):
    rng = np.random.default_rng(seed)
    W = rng.normal(0.0, 0.5, size=(K, 2, 2))
    rec = {"epoch": [], "E_true": [], "gap": []}
    for ep in range(1, epochs + 1):
        for i in rng.permutation(len(X)):
            x, t = X[i], y[i]
            E = lin_E(W, x)
            if method == "positive_only":
                W[t] -= lr * 2.0 * np.outer(W[t] @ x, x)
            else:
                for k in range(K):
                    if k != t and m + E[t] - E[k] > 0:
                        W[t] -= lr * 2.0 * np.outer(W[t] @ x, x)
                        W[k] += lr * 2.0 * np.outer(W[k] @ x, x)
        Et, gaps = [], []
        for x, t in zip(X, y):
            E = lin_E(W, x)
            Et.append(E[t])
            gaps.append(min(E[k] for k in range(K) if k != t) - E[t])
        rec["epoch"].append(ep)
        rec["E_true"].append(float(np.mean(Et)))
        rec["gap"].append(float(np.mean(gaps)))
    return W, rec


def main():
    out = {}

    # 1. Hand example: one input, three candidates, 1-D prototypes w = [0, 1, 3].
    x0, w0 = 1.0, np.array([0.0, 1.0, 3.0])
    E0 = (x0 - w0) ** 2
    p0 = gibbs_probs(E0)
    t0, m_hand = 0, 1.0
    out["hand"] = {
        "x": x0, "prototypes": w0.tolist(), "E": E0.tolist(),
        "exp_neg_E": np.exp(-E0).tolist(), "Z": float(np.exp(-E0).sum()),
        "p": p0.tolist(), "argmin": int(np.argmin(E0)),
        "target": t0, "nll_target": float(E0[t0] + lse_neg(E0)),
        "neg_log_p_target": float(-np.log(p0[t0])),
        "margin": m_hand, "margin_loss_vs_1": float(max(0.0, m_hand + E0[t0] - E0[1])),
    }

    # 2. Loss shapes as a function of the contrast energy, target energy fixed at 0 (binary case).
    e_neg = np.round(np.arange(-1.0, 3.0001, 0.05), 4)
    m_shape = 1.0
    out["loss_shapes"] = {
        "e_neg": e_neg.tolist(),
        "margin": np.maximum(0.0, m_shape - e_neg).tolist(),           # max(0, m + E_pos - E_neg), E_pos = 0
        "nll": np.log1p(np.exp(-e_neg)).tolist(),                       # E_pos + log(e^0 + e^-E_neg), E_pos = 0
        "contrastive_dissimilar": (0.5 * np.maximum(0.0, m_shape - e_neg) ** 2).tolist(),
        "m": m_shape,
    }

    # 3. Softmax equivalence: softmax cross-entropy on logits z equals NLL with E = -z.
    rng = np.random.default_rng(7)
    z = rng.normal(size=K)
    E = -z
    ce = -(z[0] - np.log(np.exp(z - z.max()).sum()) - z.max())
    out["softmax_equiv_maxdiff"] = float(abs(ce - (E[0] + lse_neg(E))))

    # 4. Gradient checks (finite differences) for the two losses.
    X, y = make_data(0)
    C_rand = np.random.default_rng(5).normal(0.0, 1.0, size=(K, 2))
    x, t = X[0], y[0]
    h = 1e-6
    fd_nll = np.zeros_like(C_rand)
    fd_mar = np.zeros_like(C_rand)
    for k in range(K):
        for d in range(2):
            Cp, Cm = C_rand.copy(), C_rand.copy()
            Cp[k, d] += h
            Cm[k, d] -= h
            fd_nll[k, d] = (sample_loss_nll(Cp, x, t) - sample_loss_nll(Cm, x, t)) / (2 * h)
            fd_mar[k, d] = (sample_loss_margin(Cp, x, t, 1.0) - sample_loss_margin(Cm, x, t, 1.0)) / (2 * h)
    out["gradcheck"] = {
        "nll_maxerr": float(np.abs(fd_nll - sample_grad_nll(C_rand, x, t)).max()),
        "margin_maxerr": float(np.abs(fd_mar - sample_grad_margin(C_rand, x, t, 1.0)).max()),
    }

    # 5. Prototype model: choose the learning rate on validation accuracy, then report test.
    Xtr, ytr = make_data(0)
    Xva, yva = make_data(11)
    Xte, yte = make_data(2, n=1000)  # 3000 test points: binomial SE of accuracy about 0.5 points
    lr_grid = [0.002, 0.01, 0.05]
    sel = {}
    for method in ["nll", "margin"]:
        scores = {}
        for lr in lr_grid:
            C, _ = train_proto(method, Xtr, ytr, lr, m=1.0, epochs=60, val=(Xva, yva), test=(Xte, yte))
            scores[lr] = evaluate(C, Xva, yva, 1.0)["acc"]
        best = max(lr_grid, key=lambda r: (scores[r], -r))
        sel[method] = {"val_acc_by_lr": {str(k): v for k, v in scores.items()}, "chosen_lr": best}
    out["lr_selection"] = sel

    out["proto"] = {}
    for method in ["nll", "margin"]:
        lr = sel[method]["chosen_lr"]
        C, curve = train_proto(method, Xtr, ytr, lr, m=1.0, epochs=60, test=(Xte, yte))
        final = evaluate(C, Xte, yte, 1.0)
        out["proto"][method] = {"lr": lr, "curve": curve, "final_test": final,
                                "final_train": evaluate(C, Xtr, ytr, 1.0),
                                "centers": C.round(4).tolist()}

    # 6. Margin sweep at the chosen margin-model learning rate.
    lr_m = sel["margin"]["chosen_lr"]
    out["m_sweep"] = []
    for m in [0.25, 0.5, 1.0, 2.0, 4.0]:
        C, _ = train_proto("margin", Xtr, ytr, lr_m, m=m, epochs=60, test=(Xte, yte))
        ev = evaluate(C, Xte, yte, m)
        out["m_sweep"].append({"m": m, "test_acc": ev["acc"], "train_frac_zero_margin": evaluate(C, Xtr, ytr, m)["frac_zero_margin"],
                               "mean_gap_test": ev["mean_gap"]})

    # 7. Collapse: positive-only vs margin on the linear-quadratic energy.
    lr_lin = 0.005
    _, rec_pos = train_lin("positive_only", Xtr, ytr, lr_lin)
    _, rec_mar = train_lin("margin", Xtr, ytr, lr_lin)
    out["collapse"] = {"lr": lr_lin, "positive_only": rec_pos, "margin": rec_mar}

    with open(OUT, "w") as f:
        json.dump(out, f, indent=1)

    # Human-readable summary on stdout.
    h = out["hand"]
    print("hand E:", np.round(h["E"], 4), "argmin", h["argmin"])
    print("hand p:", np.round(h["p"], 4), "Z", round(h["Z"], 4))
    print("nll target", round(h["nll_target"], 4), "-log p", round(h["neg_log_p_target"], 4),
          "margin vs 1", h["margin_loss_vs_1"])
    print("softmax equiv maxdiff", out["softmax_equiv_maxdiff"])
    print("gradcheck", out["gradcheck"])
    print("lr selection", sel)
    for method in ["nll", "margin"]:
        p = out["proto"][method]
        print(method, "lr", p["lr"], "final test", p["final_test"], "train", p["final_train"]["acc"])
        for ep in [1, 5, 10, 20, 40, 60]:
            i = ep - 1
            print("   ep", ep, "train", round(p["curve"]["train_acc"][i], 4), "test", round(p["curve"]["test_acc"][i], 4),
                  "nll", round(p["curve"]["mean_nll"][i], 4), "zero", round(p["curve"]["frac_zero_margin"][i], 4))
    for r in out["m_sweep"]:
        print("m", r)
    for name in ["positive_only", "margin"]:
        r = out["collapse"][name]
        for ep in [1, 5, 10, 20, 30]:
            i = ep - 1
            print(name, "ep", ep, "E_true", f"{r['E_true'][i]:.3e}", "gap", f"{r['gap'][i]:.3e}")


if __name__ == "__main__":
    main()
