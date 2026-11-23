import numpy as np

D_IN, D_OUT, G = 128, 128, 32        # input channels, output channels, quantization group size
N_CAL, N_EVAL = 256, 1024            # calibration tokens (choose scales, Hessian) and held-out tokens
OUTLIERS = [5, 40, 97]               # input channels whose activations are about 20x larger
N_SEEDS = 5

def make_data(seed, n_cal=N_CAL, correlated=True):
    rng = np.random.default_rng(seed)
    W = rng.normal(0.0, 0.05, size=(D_IN, D_OUT))          # one row per input channel
    chan = np.ones(D_IN); chan[OUTLIERS] = 20.0
    A = np.eye(D_IN) + 0.5 * rng.normal(0.0, 1.0, size=(D_IN, D_IN)) / np.sqrt(D_IN)
    if not correlated:
        A = np.eye(D_IN)                                   # independent channels: Hessian is diagonal
    acts = lambda n: (rng.normal(0.0, 1.0, size=(n, D_IN)) @ A) * chan
    return acts(n_cal), acts(N_EVAL), W                    # calibration set, held-out set, weights

def grid(W, bits=4, g=G):
    # one scale per (group of g input rows, output column), from the absolute maximum
    return np.abs(W.reshape(-1, g, W.shape[1])).max(axis=1) / (2 ** (bits - 1) - 1)

def rtn(W, bits=4, g=G, s=None):
    # round-to-nearest, symmetric, no calibration data
    s = grid(W, bits, g) if s is None else s
    qmax = 2 ** (bits - 1) - 1
    S = np.repeat(s, g, axis=0)
    return np.clip(np.round(W / S), -qmax - 1, qmax) * S

def awq(W, Xc, bits=4, g=G, n_grid=20):
    # AWQ-style: scale input rows by mean|x|^alpha; choose alpha by calibration output error
    x_mag = np.abs(Xc).mean(axis=0)
    best = None
    for alpha in np.linspace(0.0, 1.0, n_grid + 1):
        s = x_mag ** alpha
        Q = rtn(W * s[:, None], bits, g) / s[:, None]      # quantize scaled rows, then undo the scale
        err = np.linalg.norm(Xc @ W - Xc @ Q)
        if best is None or err < best[0]:
            best = (err, alpha, Q)
    return best[2], best[1]

def gptq(W, Xc, bits=4, g=G, damp=0.01):
    # GPTQ-style: quantize input rows in order; push each row's error onto the rows not yet quantized
    s = grid(W, bits, g)                                   # grid fixed before the process
    qmax = 2 ** (bits - 1) - 1
    H = 2.0 * Xc.T @ Xc
    H += damp * np.mean(np.diag(H)) * np.eye(H.shape[0])
    U = np.linalg.cholesky(np.linalg.inv(H)).T             # upper triangular, U.T @ U = H^-1
    Wq = W.copy(); Q = np.zeros_like(W)
    for j in range(W.shape[0]):
        sj = s[j // g]
        Q[j] = np.clip(np.round(Wq[j] / sj), -qmax - 1, qmax) * sj
        err = (Wq[j] - Q[j]) / U[j, j]
        Wq[j + 1:] -= np.outer(U[j, j + 1:], err)
    return Q

def int8_act(X):
    s = np.abs(X).max() / 127.0                            # per tensor, symmetric
    return np.clip(np.round(X / s), -128, 127) * s

def int8_weight(W):
    s = np.abs(W).max(axis=0) / 127.0                      # per output column, symmetric
    return np.clip(np.round(W / s), -128, 127) * s

def smooth_scale(Xc, W, alpha):
    # SmoothQuant: s_j = max|X_j|^alpha / max|W_j|^(1-alpha)
    return np.abs(Xc).max(axis=0) ** alpha / np.abs(W).max(axis=1) ** (1 - alpha)

def w8a8(X, W, s):
    return int8_act(X / s[None, :]) @ int8_weight(W * s[:, None])

def rel_err(ref, Y):
    return np.linalg.norm(ref - Y) / np.linalg.norm(ref)

if __name__ == "__main__":
    ones = np.ones(D_IN)
    keys = ["rtn", "awq", "gptq", "w8a8_naive", "sq_025", "sq_050", "sq_075"]
    rows = []
    for seed in range(N_SEEDS):
        Xc, Xe, W = make_data(seed)
        ref = Xe @ W
        Q_awq, alpha = awq(W, Xc)
        r = {"rtn": rel_err(ref, Xe @ rtn(W)),
             "awq": rel_err(ref, Xe @ Q_awq), "alpha": alpha,
             "gptq": rel_err(ref, Xe @ gptq(W, Xc)),
             "w8a8_naive": rel_err(ref, w8a8(Xe, W, ones)),
             "sq_025": rel_err(ref, w8a8(Xe, W, smooth_scale(Xc, W, 0.25))),
             "sq_050": rel_err(ref, w8a8(Xe, W, smooth_scale(Xc, W, 0.50))),
             "sq_075": rel_err(ref, w8a8(Xe, W, smooth_scale(Xc, W, 0.75)))}
        rows.append(r)
        print(f"seed {seed}: " + "  ".join(f"{k} {r[k]:.4f}" for k in keys) + f"  awq_alpha {alpha:.2f}")
    print(f"mean +/- std over {N_SEEDS} seeds, held-out tokens (relative output error):")
    for k in keys:
        v = np.array([r[k] for r in rows])
        print(f"  {k:12s} {v.mean():.4f} +/- {v.std():.4f}")
    print("AWQ alphas chosen:", ", ".join(f"{r['alpha']:.2f}" for r in rows))

    # seed 0 diagnostics
    Xc, Xe, W = make_data(0)
    ref_c = Xc @ W
    x_mag = np.abs(Xc).mean(axis=0)
    print(f"mean|x| outlier channels {np.round(x_mag[OUTLIERS], 1)}, median channel {np.median(x_mag):.2f}")
    mx = np.abs(Xc).max(axis=0)
    print(f"max|x| outlier channels {np.round(mx[OUTLIERS], 1)}, median channel {np.median(mx):.2f}")
    sq = smooth_scale(Xc, W, 0.5)
    print(f"SmoothQuant s, outlier channels {np.round(sq[OUTLIERS], 1)}, median {np.median(sq):.2f}")
    mx2 = mx / sq; mw2 = np.abs(W).max(axis=1) * sq
    print(f"after smoothing, max|X'| outliers {np.round(mx2[OUTLIERS], 2)}, median {np.median(mx2):.2f}")
    print(f"after smoothing, max|W'| outliers {np.round(mw2[OUTLIERS], 2)}, median {np.median(mw2):.2f}")
    print(f"seed 0 calibration error: rtn {rel_err(ref_c, Xc @ rtn(W)):.4f}  gptq {rel_err(ref_c, Xc @ gptq(W, Xc)):.4f}")
    sweep = []
    for a in np.linspace(0, 1, 11):
        s = x_mag ** a
        sweep.append(f"{a:.1f}:{rel_err(ref_c, Xc @ (rtn(W * s[:, None]) / s[:, None])):.4f}")
    print("AWQ calibration error by alpha, seed 0:", " ".join(sweep))
    bits = 4 + 16 / G
    print(f"bits per weight: 4 + 16/{G} = {bits:.2f}; memory ratio vs FP16 = {16 / bits:.2f}")

    print("calibration-size sweep, held-out relative error, mean over seeds:")
    for corr, n_cal in [(False, 256), (True, 128), (True, 256), (True, 1024), (True, 4096)]:
        e = {"rtn": [], "awq": [], "gptq": []}
        for seed in range(N_SEEDS):
            Xc, Xe, W = make_data(seed, n_cal, correlated=corr)
            ref = Xe @ W
            e["rtn"].append(rel_err(ref, Xe @ rtn(W)))
            e["awq"].append(rel_err(ref, Xe @ awq(W, Xc)[0]))
            e["gptq"].append(rel_err(ref, Xe @ gptq(W, Xc)))
        print(f"  correlated={str(corr):5s} n_cal={n_cal:5d}  rtn {np.mean(e['rtn']):.4f}  "
              f"awq {np.mean(e['awq']):.4f}  gptq {np.mean(e['gptq']):.4f}")
