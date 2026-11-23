import json
import sys

import numpy as np


# ---- 1. Temperature softmax ----------------------------------------------
def softmax(z, T=1.0):
    s = z / T
    s = s - s.max(axis=-1, keepdims=True)   # subtracting the max does not change the result
    e = np.exp(s)
    return e / e.sum(axis=-1, keepdims=True)


z = np.array([2.0, 1.0, 0.1])
worked = {}
for T in (1.0, 2.0, 4.0):
    p = softmax(z, T)
    worked[str(T)] = [round(float(v), 3) for v in p]
    print(f"T={T:.0f}: p = {np.round(p, 3)}")


# ---- 2. Soft loss and its gradient --------------------------------------
def soft_loss(zs, zt, T):
    """T^2 * KL(p_teacher^T || p_student^T), averaged over the batch."""
    pt, ps = softmax(zt, T), softmax(zs, T)
    kl = (pt * (np.log(pt) - np.log(ps))).sum(axis=-1)
    return (T ** 2 * kl).mean()


def soft_grad(zs, zt, T):
    """Analytic gradient with respect to the student logits: T * (p_s^T - p_t^T) / n."""
    return T * (softmax(zs, T) - softmax(zt, T)) / zs.shape[0]


rng = np.random.default_rng(1)
zs, zt, T = rng.normal(size=(5, 3)), rng.normal(size=(5, 3)), 3.0
num, eps = np.zeros_like(zs), 1e-6
for i in range(zs.shape[0]):
    for j in range(zs.shape[1]):
        d = np.zeros_like(zs)
        d[i, j] = eps
        num[i, j] = (soft_loss(zs + d, zt, T) - soft_loss(zs - d, zt, T)) / (2 * eps)
err = float(np.abs(num - soft_grad(zs, zt, T)).max())
print("analytic gradient matches finite differences to 1e-6:", err < 1e-6)

# Gradient size against T, for random logits: without and with the T^2 factor
rng = np.random.default_rng(2)
zs, zt = rng.normal(size=(200, 3)), rng.normal(size=(200, 3))
scaling = {}
print("T    |grad| no T^2 (rel. to T=1)   |grad| with T^2 (rel. to T=1)")
def grad_norms(T):
    g_raw = np.linalg.norm((softmax(zs, T) - softmax(zt, T)).mean(axis=0)) / T
    return g_raw, T ** 2 * g_raw


g1_raw, g1_t2 = grad_norms(1.0)
for T in (1.0, 2.0, 4.0, 8.0, 16.0, 32.0):
    g_raw, g_t2 = grad_norms(T)
    scaling[str(T)] = [round(float(g_raw / g1_raw), 4), round(float(g_t2 / g1_t2), 4)]
    print(f"{T:>4.0f}  {g_raw / g1_raw:>10.4f}                    {g_t2 / g1_t2:>10.4f}")


# ---- 3. Teacher-student experiment ---------------------------------------
D, K, H_TEACH, H_STUD = 8, 3, 64, 8
A = np.random.default_rng(0).normal(size=(D, 16))
B = np.random.default_rng(0).normal(size=(16, K))


def true_logits(X):
    return np.tanh(X @ A) @ B   # the hidden rule that generates the labels


def make_data(n, rng):
    X = rng.normal(size=(n, D))
    y = (true_logits(X) + 0.5 * rng.normal(size=(n, K))).argmax(axis=1)  # noisy training labels
    y_clean = true_logits(X).argmax(axis=1)                             # noise-free test labels
    return X, y, y_clean


class MLP:
    def __init__(self, h, rng):
        self.W1 = rng.normal(0, 1 / np.sqrt(D), (D, h))
        self.b1 = np.zeros(h)
        self.W2 = rng.normal(0, 1 / np.sqrt(h), (h, K))
        self.b2 = np.zeros(K)

    def __call__(self, X):
        Hd = np.tanh(X @ self.W1 + self.b1)
        return Hd @ self.W2 + self.b2, Hd


def fit(model, X, grad_logits, steps, lr=0.5):
    """Full-batch gradient descent; grad_logits(Z) is dLoss/dZ, averaged over the batch."""
    for _ in range(steps):
        Z, Hd = model(X)
        G = grad_logits(Z)
        dA = (G @ model.W2.T) * (1 - Hd ** 2)
        model.W2 -= lr * Hd.T @ G
        model.b2 -= lr * G.sum(axis=0)
        model.W1 -= lr * X.T @ dA
        model.b1 -= lr * dA.sum(axis=0)
    return model


def ce_grad(y):
    def g(Z):
        P = softmax(Z)
        P[np.arange(len(y)), y] -= 1
        return P / len(y)
    return g


def kd_grad(y, zt, T, alpha):
    """Gradient of alpha * T^2 * KL(teacher || student) + (1 - alpha) * CE(labels)."""
    pt = softmax(zt, T)
    def g(Z):
        hard = softmax(Z)
        hard[np.arange(len(y)), y] -= 1
        soft = T * (softmax(Z, T) - pt)
        return (alpha * soft + (1 - alpha) * hard) / len(y)
    return g


def acc(Z, y):
    return float((Z.argmax(axis=1) == y).mean())


Xt, yt, _ = make_data(4000, np.random.default_rng(10))
teacher = fit(MLP(H_TEACH, np.random.default_rng(11)), Xt, ce_grad(yt), steps=3000)
Xte, _, yte = make_data(5000, np.random.default_rng(99))
zte_teacher = teacher(Xte)[0]
teacher_acc = acc(zte_teacher, yte)
print(f"teacher ({teacher.W1.size + teacher.W2.size + teacher.b1.size + teacher.b2.size} params) "
      f"test accuracy = {teacher_acc:.3f}")


def run(N, seed, T=None, alpha=0.5, steps=2000, teacher_hard=False):
    rng = np.random.default_rng(1000 + seed)
    X, y, _ = make_data(N, rng)
    student = MLP(H_STUD, rng)
    zt = teacher(X)[0]
    if teacher_hard:   # control: the teacher's argmax as hard labels, no soft targets
        grad = ce_grad(zt.argmax(axis=1))
    else:
        grad = ce_grad(y) if T is None else kd_grad(y, zt, T, alpha)
    fit(student, X, grad, steps)
    zs = student(Xte)[0]
    return acc(zs, yte), float((zs.argmax(axis=1) == zte_teacher.argmax(axis=1)).mean())


def stats(vals):
    v = np.array(vals)
    return round(float(v.mean()), 4), round(float(v.std(ddof=1)), 4)


SEEDS = range(5)
grid = {}
print("\nStudent test accuracy (clean labels), mean and std over 5 seeds")
print("N     hard labels    teacher argmax   KD T=2, alpha=0.5    KD T=4, alpha=0.5")
for N in (30, 100, 300):
    row = {}
    for name, T in (("hard", None), ("teacher_hard", None), ("kd_T2", 2.0), ("kd_T4", 4.0)):
        runs = [run(N, s, T=T, teacher_hard=(name == "teacher_hard")) for s in SEEDS]
        row[name] = {"acc": stats([r[0] for r in runs]), "fidelity": stats([r[1] for r in runs])}
    grid[str(N)] = row
    print(f"{N:<5} " + "   ".join(f"{row[k]['acc'][0]:.3f} ± {row[k]['acc'][1]:.3f}"
                                  for k in ("hard", "teacher_hard", "kd_T2", "kd_T4")))

tsweep = {}
print("\nN = 100, alpha = 0.5: effect of the temperature T")
for T in (1.0, 2.0, 4.0, 8.0):
    runs = [run(100, s, T=T) for s in SEEDS]
    tsweep[str(T)] = stats([r[0] for r in runs])
    print(f"T={T:.0f}: accuracy {tsweep[str(T)][0]:.3f} ± {tsweep[str(T)][1]:.3f}")

if len(sys.argv) > 1:   # save the numbers for the diagrams
    json.dump({"worked": worked, "scaling": scaling, "teacher_acc": round(teacher_acc, 4),
               "grid": grid, "tsweep": tsweep}, open(sys.argv[1], "w"), indent=1)
