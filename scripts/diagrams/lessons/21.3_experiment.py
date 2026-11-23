# Experiment for lesson 21.3 (optimizers). Writes 21.3_data.json next to this file.
# Run: <python> scripts/diagrams/lessons/21.3_experiment.py
# torch is optional: if present, the NumPy update rules are checked against torch.optim (torch 2.15.0 used).
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------- NumPy versions of the four update rules (formulas read from torch 2.15 source) ----------
class SGD:                                   # torch.optim.SGD, dampening=0, nesterov=False
    def __init__(self, lr, momentum=0.0):
        self.lr, self.mu, self.buf = lr, momentum, None
    def step(self, w, g):
        if self.mu == 0.0:
            return w - self.lr * g
        self.buf = g.copy() if self.buf is None else self.mu * self.buf + g   # v <- mu*v + g
        return w - self.lr * self.buf                                          # w <- w - lr*v

class RMSprop:                               # torch.optim.RMSprop, momentum=0, centered=False
    def __init__(self, lr, alpha=0.99, eps=1e-8):
        self.lr, self.alpha, self.eps, self.sq = lr, alpha, eps, None
    def step(self, w, g):
        self.sq = (1 - self.alpha) * g * g if self.sq is None else self.alpha * self.sq + (1 - self.alpha) * g * g
        return w - self.lr * g / (np.sqrt(self.sq) + self.eps)

class AdamW:                                 # torch.optim.AdamW: decoupled decay, then Adam step
    def __init__(self, lr, wd=1e-2, b1=0.9, b2=0.999, eps=1e-8):
        self.lr, self.wd, self.b1, self.b2, self.eps = lr, wd, b1, b2, eps
        self.m = self.v = None; self.t = 0
    def step(self, w, g):
        self.t += 1
        w = w * (1 - self.lr * self.wd)                                        # w <- (1 - lr*wd) w
        self.m = (1 - self.b1) * g if self.m is None else self.b1 * self.m + (1 - self.b1) * g
        self.v = (1 - self.b2) * g * g if self.v is None else self.b2 * self.v + (1 - self.b2) * g * g
        mhat = self.m / (1 - self.b1 ** self.t)                                # bias correction
        vhat = self.v / (1 - self.b2 ** self.t)
        return w - self.lr * mhat / (np.sqrt(vhat) + self.eps)

NAMES = ["SGD", "Momentum", "RMSprop", "AdamW"]
def make(name, lr, wd=0.0):
    return {"SGD": lambda: SGD(lr), "Momentum": lambda: SGD(lr, 0.9),
            "RMSprop": lambda: RMSprop(lr), "AdamW": lambda: AdamW(lr, wd)}[name]()

out = {}

# ---------- A. hand-worked example: f(w) = w^2, w0 = 2, lr = 0.1 (grad = 2w) ----------
def grad1(w): return 2.0 * w
hand = {}
for n in NAMES:
    opt, w, traj = make(n, 0.1, wd=0.01), np.array([2.0]), []
    for _ in range(3):
        w = opt.step(w, grad1(w)); traj.append(float(w[0]))
    hand[n] = traj
out["hand"] = hand

# ---------- B. ill-conditioned quadratic, deterministic gradient, condition number 100 ----------
H_axis = np.diag([1.0, 100.0])
th = math.radians(45.0)
R = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
H_rot = R @ H_axis @ R.T                    # same eigenvalues 1 and 100, valley no longer axis-aligned
W0 = np.array([1.0, 0.37])                  # asymmetric start: a symmetric start lands on the minimum in one Adam/RMSprop step

def run_quad(H, name, lr, tol=1e-8, cap=20000):
    opt, w = make(name, lr, wd=0.0), W0.copy()   # wd=0: AdamW is plain Adam here, to isolate the update rule
    with np.errstate(all="ignore"):
        for t in range(1, cap + 1):
            w = opt.step(w, H @ w)
            f = 0.5 * w @ H @ w
            if not np.isfinite(f):
                return None
            if f < tol:
                return t
    return None

LRS_Q = [float(x) for x in np.logspace(-4, 1, 21)]
quad = {}
for label, H in [("axis", H_axis), ("rotated", H_rot)]:
    quad[label] = {}
    for n in NAMES:
        steps = {lr: run_quad(H, n, lr) for lr in LRS_Q}
        ok = {lr: s for lr, s in steps.items() if s is not None}
        best = min(ok, key=ok.get) if ok else None
        quad[label][n] = {"best_lr": best, "steps": ok[best] if best is not None else None,
                          "n_lrs_converged": len(ok)}
out["quad"] = quad
out["quad_lr_grid"] = LRS_Q

# ---------- C. minibatch logistic regression with heterogeneous feature scales ----------
rng = np.random.default_rng(0)
N, D = 2000, 20
Xs = rng.standard_normal((N, D))
w_true = rng.standard_normal(D) / math.sqrt(D) * 3.0
y = (rng.random(N) < 1 / (1 + np.exp(-(Xs @ w_true)))).astype(float)
scale = np.logspace(0, 1.5, D)              # unnormalised inputs: feature j multiplied by scale[j] (1 to ~32)
X = Xs * scale                              # labels unchanged; the model must learn w = w_true / scale

def loss_full(w):
    z = X @ w
    return float(np.mean(np.logaddexp(0.0, z) - y * z))     # stable mean binary cross-entropy

def grad_batch(w, idx):
    z = X[idx] @ w
    return X[idx].T @ (1 / (1 + np.exp(-z)) - y[idx]) / len(idx)

BUDGET = 3          # epochs (the budget-limited comparison)
EPOCHS = 10         # longer run, reported as the final loss
def train(name, lr, seed, bs=32):
    opt = make(name, lr, wd=0.01 if name == "AdamW" else 0.0)
    w, r, at_budget = np.zeros(D), np.random.default_rng(seed), None
    with np.errstate(all="ignore"):
        for ep in range(1, EPOCHS + 1):
            perm = r.permutation(N)
            for s in range(0, N, bs):
                idx = perm[s:s + bs]
                w = opt.step(w, grad_batch(w, idx))
            if ep == BUDGET:
                at_budget = loss_full(w)
    final = loss_full(w)
    return at_budget, final

LRS_L = [float(x) for x in np.logspace(-4, 0, 9)]
SEEDS = [0, 1, 2]
logi = {"init_loss": loss_full(np.zeros(D)), "lrs": LRS_L, "seeds": SEEDS,
        "budget_epochs": BUDGET, "final_epochs": EPOCHS, "results": {}, "best": {}}
for n in NAMES:
    b_mean, b_std, f_mean = [], [], []
    for lr in LRS_L:
        runs = [train(n, lr, s) for s in SEEDS]
        b = np.array([r[0] for r in runs]); f = np.array([r[1] for r in runs])
        b_mean.append(float(np.mean(b))); b_std.append(float(np.std(b))); f_mean.append(float(np.mean(f)))
    fin = [m if np.isfinite(m) else np.inf for m in f_mean]
    bud = [m if np.isfinite(m) else np.inf for m in b_mean]
    kb, kf = int(np.argmin(bud)), int(np.argmin(fin))   # learning rate chosen separately for each criterion
    logi["results"][n] = {"budget_mean": b_mean, "budget_std": b_std, "final_mean": f_mean}
    logi["best"][n] = {"lr_budget": LRS_L[kb], "budget_mean": b_mean[kb], "budget_std": b_std[kb],
                       "lr_final": LRS_L[kf], "final_mean": f_mean[kf]}
out["logistic"] = logi

# ---------- D. verify the NumPy rules against torch.optim (float64) ----------
try:
    import torch
    def torch_opt(n, params, lr):
        if n == "SGD": return torch.optim.SGD(params, lr=lr)
        if n == "Momentum": return torch.optim.SGD(params, lr=lr, momentum=0.9)
        if n == "RMSprop": return torch.optim.RMSprop(params, lr=lr, alpha=0.99, eps=1e-8)
        return torch.optim.AdamW(params, lr=lr, weight_decay=0.01 if False else 0.0)
    cmp_hand, cmp_quad = {}, {}
    for n in NAMES:
        # hand example: f = w^2, 3 steps, lr 0.1 (AdamW weight_decay 0.01 to match)
        wt = torch.tensor([2.0], dtype=torch.float64, requires_grad=True)
        o = torch.optim.AdamW([wt], lr=0.1, weight_decay=0.01) if n == "AdamW" else torch_opt(n, [wt], 0.1)
        ref = []
        for _ in range(3):
            o.zero_grad(); (wt ** 2).sum().backward(); o.step(); ref.append(float(wt.detach()[0]))
        cmp_hand[n] = max(abs(a - b) for a, b in zip(ref, hand[n]))
        # rotated quadratic, 20 steps, lr 0.01, wd 0 (AdamW reduces to Adam)
        Ht = torch.tensor(H_rot, dtype=torch.float64)
        wt = torch.tensor(W0, dtype=torch.float64, requires_grad=True)
        o = torch.optim.AdamW([wt], lr=0.01, weight_decay=0.0) if n == "AdamW" else torch_opt(n, [wt], 0.01)
        npo, w, worst = make(n, 0.01, wd=0.0), W0.copy(), 0.0
        for _ in range(20):
            o.zero_grad(); (0.5 * wt @ Ht @ wt).backward(); o.step()
            w = npo.step(w, H_rot @ w)
            worst = max(worst, float(np.max(np.abs(w - wt.detach().numpy()))))
        cmp_quad[n] = worst
    out["torch_check"] = {"torch_version": torch.__version__,
                          "max_abs_diff_hand_3_steps": cmp_hand,
                          "max_abs_diff_rotated_quad_20_steps": cmp_quad}
except ImportError:
    out["torch_check"] = None

with open(os.path.join(HERE, "21.3_data.json"), "w") as f:
    json.dump(out, f, indent=2)

print("hand:", {k: [round(x, 6) for x in v] for k, v in hand.items()})
print("quad:", json.dumps(quad))
print("logistic init loss:", round(logi["init_loss"], 4))
for n in NAMES:
    b = logi["best"][n]
    print(f"logistic {n:9s} lr@{BUDGET}ep={b['lr_budget']:.4g} loss@{BUDGET}ep={b['budget_mean']:.4f}+/-{b['budget_std']:.4f} | lr@{EPOCHS}ep={b['lr_final']:.4g} final={b['final_mean']:.4f}")
print("torch check:", out["torch_check"])
