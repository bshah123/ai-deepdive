import numpy as np

D = 4          # steps in one solution
Q = 0.5        # chance that a freshly proposed step is correct
K = 4          # maximum children per MCTS node
C_EXPLORE = 1.0

def propose(rng, sigma):
    """One generator call. Returns (is_correct, noisy process reward)."""
    correct = bool(rng.random() < Q)
    return correct, float(correct) + sigma * rng.standard_normal()

def orm_best_of_n(budget, rng, sigma):
    """Sample budget // D full chains; the outcome verifier scores only the final answer."""
    best_ok, best_score = False, -np.inf
    for _ in range(budget // D):
        ok = all([rng.random() < Q for _ in range(D)])
        score = float(ok) + sigma * rng.standard_normal()
        if score > best_score:
            best_ok, best_score = ok, score
    return best_ok

def beam_prm(budget, rng, sigma, beam=4):
    """At each depth, expand every beam item and keep the top `beam` partial chains by summed step reward."""
    k = budget // (beam * D)
    beams = [(0.0, True)] * beam          # (summed process reward, all steps correct so far)
    for _ in range(D):
        cands = []
        for total, ok in beams:
            for _ in range(k):
                c, s = propose(rng, sigma)
                cands.append((total + s, ok and c))
        cands.sort(key=lambda t: -t[0])
        beams = cands[:beam]
    return beams[0][1]

class Node:
    def __init__(self, depth, ok, cum, parent=None):
        self.depth, self.ok, self.cum, self.parent = depth, ok, cum, parent
        self.children, self.visits, self.total = [], 0, 0.0
        self.done = depth == D           # a finished path (depth D) is terminal and never expanded

def backprop(node, reward):
    while node is not None:
        node.visits += 1
        node.total += reward
        node = node.parent

def mcts_prm(budget, rng, sigma, decode="mean"):
    """UCT with one expansion per iteration (one generator call); the PRM scores each new step."""
    root = Node(0, True, 0.0)
    spent = 0
    while spent < budget and not root.done:
        node = root
        while len(node.children) == K:            # fully expanded: select a live child by UCB1
            parent = node
            live = [ch for ch in node.children if not ch.done]
            node = max(live, key=lambda ch: ch.total / ch.visits
                       + C_EXPLORE * np.sqrt(np.log(parent.visits) / ch.visits))
        c, s = propose(rng, sigma)                # expand: one new child, one generator call
        child = Node(node.depth + 1, node.ok and c, node.cum + s, node)
        node.children.append(child)
        backprop(child, child.cum)                # back up the partial-path PRM score
        spent += 1
        p = node                                  # a node whose K children are all done is done
        while p is not None and len(p.children) == K and all(ch.done for ch in p.children):
            p.done = True
            p = p.parent
    node = root
    while node.children:                          # answer: follow the best mean (or most visited)
        if decode == "mean":
            node = max(node.children, key=lambda ch: ch.total / ch.visits)
        else:
            node = max(node.children, key=lambda ch: ch.visits)
    return node.depth == D and node.ok

def success(strategy, budget, sigma, n=400, seed=0):
    rng = np.random.default_rng(seed)
    return sum(strategy(budget, rng, sigma) for _ in range(n)) / n

def se(p, n=400):
    return float(np.sqrt(p * (1 - p) / n))

STRATS = [("ORM best-of-N", orm_best_of_n), ("PRM beam", beam_prm), ("PRM MCTS", mcts_prm)]

print(f"single chain, closed form Q^D = {Q ** D:.4f}")
for budget in [16, 64]:
    sim = success(orm_best_of_n, budget, 0.0, n=4000)
    exact = 1 - (1 - Q ** D) ** (budget // D)
    print(f"sanity, ORM sigma=0, budget {budget}: simulated {sim:.3f}, closed form {exact:.3f}")
print(f"sanity, PRM beam sigma=0, budget 64: simulated {success(beam_prm, 64, 0.0):.3f}")

print("success rate, sigma = 0.5 (400 problems; +/- one standard error)")
for name, strat in STRATS:
    cells = []
    for budget in [16, 32, 64, 128]:
        p = success(strat, budget, 0.5)
        cells.append(f"B={budget}: {p:.3f}+/-{se(p):.3f}")
    print(f"{name:14s}", "  ".join(cells))

print("success rate at budget 64 as the verifier noise grows")
for sigma in [0.25, 0.5, 1.0, 2.0]:
    cells = [f"{name}: {success(strat, 64, sigma):.3f}" for name, strat in STRATS]
    print(f"sigma={sigma:4.2f}  " + "  ".join(cells))

print("ablation, MCTS answer by visit count instead of mean, sigma = 0.5:",
      " ".join(f"B={b}: {success(lambda bu, r, s: mcts_prm(bu, r, s, decode='visits'), b, 0.5):.3f}"
               for b in [16, 64, 128]))

# UCB1 worked example: (visits, total reward) per child; parent visits = sum of child visits
stats = {"A": (3, 2.4), "B": (1, 0.9), "C": (2, 1.1), "D": (1, 1.0)}
N = sum(v for v, _ in stats.values())
print(f"UCB1 with parent visits N = {N}, c = {C_EXPLORE}")
for name, (n_i, w_i) in stats.items():
    ucb = w_i / n_i + C_EXPLORE * np.sqrt(np.log(N) / n_i)
    print(f"child {name}: mean {w_i / n_i:.3f}, UCB {ucb:.3f}")

# ---- export every number used by the diagrams (not shown in the lesson) ----
import json, pathlib
BUDGETS = [16, 32, 64, 128]
main = {name: {str(b): {"p": success(strat, b, 0.5), "se": se(success(strat, b, 0.5))} for b in BUDGETS}
        for name, strat in STRATS}
sweep = {name: {str(s): success(strat, 64, s) for s in [0.25, 0.5, 1.0, 2.0]} for name, strat in STRATS}
out = {
    "D": D, "Q": Q, "K": K, "n_problems": 400,
    "single_chain": Q ** D,
    "orm_sigma0": {str(b): success(orm_best_of_n, b, 0.0, n=4000) for b in [16, 64]},
    "orm_sigma0_closed": {str(b): 1 - (1 - Q ** D) ** (b // D) for b in [16, 64]},
    "beam_sigma0_64": success(beam_prm, 64, 0.0),
    "main": main,
    "sweep_b64": sweep,
    "ablation_visits": {str(b): success(lambda bu, r, s: mcts_prm(bu, r, s, decode="visits"), b, 0.5) for b in [16, 64, 128]},
    "ucb": {name: {"visits": n_i, "total": w_i, "mean": w_i / n_i,
                   "ucb": w_i / n_i + C_EXPLORE * float(np.sqrt(np.log(N) / n_i))}
            for name, (n_i, w_i) in stats.items()},
    "ucb_parent_visits": N,
}
pathlib.Path(__file__).with_name("59.2_data.json").write_text(json.dumps(out, indent=2))
