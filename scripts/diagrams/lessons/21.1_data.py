# Produces the numbers used by the 21.1 diagrams. Run once: python3 21.1_data.py
import json, os
import numpy as np

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))

class MLP:
    def __init__(self, n_in, n_hidden, n_out, seed=0, lr=0.5):
        rng = np.random.default_rng(seed)
        self.W1 = rng.normal(0.0, 1.0, (n_in, n_hidden))
        self.b1 = np.zeros(n_hidden)
        self.W2 = rng.normal(0.0, 1.0, (n_hidden, n_out))
        self.b2 = np.zeros(n_out)
        self.lr = lr

    def forward(self, X):
        self.X = X
        self.h = sigmoid(X @ self.W1 + self.b1)
        self.a = sigmoid(self.h @ self.W2 + self.b2)
        return self.a

    def loss(self, X, y):
        a = self.forward(X)
        return 0.5 * np.mean(np.sum((a - y) ** 2, axis=1))

    def gradients(self, y):
        N = self.X.shape[0]
        d2 = (self.a - y) * self.a * (1 - self.a)
        d1 = (d2 @ self.W2.T) * self.h * (1 - self.h)
        return {"W1": self.X.T @ d1 / N, "b1": d1.sum(axis=0) / N,
                "W2": self.h.T @ d2 / N, "b2": d2.sum(axis=0) / N}

    def train_step(self, y):
        g = self.gradients(y)
        self.W1 -= self.lr * g["W1"]; self.b1 -= self.lr * g["b1"]
        self.W2 -= self.lr * g["W2"]; self.b2 -= self.lr * g["b2"]

X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([[0.0], [1.0], [1.0], [0.0]])
XOR = np.array([0, 1, 1, 0])

# loss curve, seed 0, loss measured before each update (same as the lesson run)
net = MLP(2, 4, 1, seed=0)
curve = []
for epoch in range(1, 5001):
    net.forward(X)                      # always forward before the update
    if epoch == 1 or epoch % 50 == 0:
        curve.append([epoch, float(0.5 * np.mean(np.sum((net.a - y) ** 2, axis=1)))])
    net.train_step(y)

# hidden-width sweep, 40 seeds, 5000 full-batch epochs, lr 0.5
sweep = {}
for H in (2, 3, 4, 8):
    ok = 0
    for seed in range(40):
        m = MLP(2, H, 1, seed=seed)
        for _ in range(5000):
            m.forward(X); m.train_step(y)
        p = m.forward(X)
        ok += int(np.array_equal((p > 0.5).astype(int).ravel(), XOR))
    sweep[str(H)] = ok

out = {"curve": curve, "sweep_of_40": sweep}
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "21.1_data.json"), "w") as f:
    json.dump(out, f, indent=1)
print(json.dumps({"curve_points": len(curve), "first": curve[0], "at_5000": curve[-1], "sweep_of_40": sweep}))
