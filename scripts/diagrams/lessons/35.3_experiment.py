import heapq, math
import numpy as np

class HNSW:
    """Minimal HNSW following Malkov & Yashunin (arXiv:1603.09320), Algorithms 1-4."""
    def __init__(self, data, M=8, efC=64, heuristic=True, seed=1):
        self.data = data
        self.M, self.M0, self.efC = M, 2 * M, efC
        self.mL = 1.0 / math.log(M)
        self.heuristic = heuristic
        self.rng = np.random.default_rng(seed)
        self.layers = []          # layers[l] = {node: [neighbours]}
        self.ep, self.top = None, -1
        self.evals = 0            # distance computations (machine-independent cost)

    def dist(self, v, i):
        self.evals += 1
        return float(np.linalg.norm(self.data[i] - v))

    def search_layer(self, q, eps, ef, lc):
        visited = set(eps)
        cand, res = [], []        # cand: min-heap; res: max-heap via negated distance
        for e in eps:
            de = self.dist(q, e)
            heapq.heappush(cand, (de, e)); heapq.heappush(res, (-de, e))
        while cand:
            dc, c = heapq.heappop(cand)
            if dc > -res[0][0]:
                break
            for e in self.layers[lc][c]:
                if e in visited:
                    continue
                visited.add(e)
                de = self.dist(q, e)
                if len(res) < ef or de < -res[0][0]:
                    heapq.heappush(cand, (de, e)); heapq.heappush(res, (-de, e))
                    if len(res) > ef:
                        heapq.heappop(res)
        return sorted((-nd, i) for nd, i in res)

    def select(self, q, cands, m):
        # cands: sorted list of (distance to q, node)
        if not self.heuristic:
            return cands[:m]
        chosen, skipped = [], []
        for dq, e in cands:
            if len(chosen) >= m:
                break
            # keep e only if it is closer to q than to every already-chosen neighbour
            if all(self.dist(self.data[e], s) >= dq for _, s in chosen):
                chosen.append((dq, e))
            else:
                skipped.append((dq, e))
        for item in skipped:                      # keepPrunedConnections: top up to m
            if len(chosen) >= m:
                break
            chosen.append(item)
        return chosen

    def insert(self, idx):
        l = int(-math.log(self.rng.random()) * self.mL)
        while len(self.layers) <= l:
            self.layers.append({})
        for lc in range(l + 1):
            self.layers[lc][idx] = []
        if self.ep is None:
            self.ep, self.top = idx, l
            return
        q = self.data[idx]
        ep = [self.ep]
        for lc in range(self.top, l, -1):          # greedy descent, ef = 1
            ep = [self.search_layer(q, ep, 1, lc)[0][1]]
        for lc in range(min(l, self.top), -1, -1):
            W = self.search_layer(q, ep, self.efC, lc)
            m_max = self.M0 if lc == 0 else self.M
            nbrs = self.select(q, W, self.M)
            self.layers[lc][idx] = [i for _, i in nbrs]
            for _, e in nbrs:
                conn = self.layers[lc][e]
                conn.append(idx)
                if len(conn) > m_max:              # shrink the neighbour's list
                    ev = self.data[e]
                    cands = sorted((self.dist(ev, c), c) for c in conn)
                    self.layers[lc][e] = [i for _, i in self.select(ev, cands, m_max)]
            ep = [i for _, i in W]
        if l > self.top:
            self.ep, self.top = idx, l

    def search(self, q, k, ef, descend=True):
        ep = [self.ep]
        if descend:
            for lc in range(self.top, 0, -1):
                ep = [self.search_layer(q, ep, 1, lc)[0][1]]
        else:
            ep = [int(self.rng.integers(len(self.data)))]   # single-layer ablation: random entry
        W = self.search_layer(q, ep, max(ef, k), 0)
        return [i for _, i in W[:k]]

def build(data, **kw):
    g = HNSW(data, **kw)
    for i in range(len(data)):
        g.insert(i)
    return g

def recall_at_k(found, truth):
    return len(set(found) & set(truth)) / len(truth)

# ---- experiment: every number used in lesson 35.3 comes from this run ----
# Writes 35.3_data.json next to this file; the diagram script reads it.
import json, os

def truth_for(X, Q, K):
    return [list(np.argsort(np.linalg.norm(X - q, axis=1))[:K]) for q in Q]

def sweep(g, Q, truth, efs, K=10):
    rows = []
    for ef in efs:
        g.evals = 0
        rec = [recall_at_k(g.search(q, K, ef), t) for q, t in zip(Q, truth)]
        rows.append({"ef": ef, "recall": float(np.mean(rec)), "dist": g.evals / len(Q)})
    return rows

if __name__ == "__main__":
    K = 10
    N, D, NQ = 2000, 16, 200
    X = np.random.default_rng(0).standard_normal((N, D))
    Q = np.random.default_rng(0).standard_normal((NQ, D))
    # Use a different stream for queries so they are not the same draws as the data
    Q = np.random.default_rng(100).standard_normal((NQ, D))
    truth = truth_for(X, Q, K)
    out = {"N": N, "D": D, "M": 8, "efC": 64, "K": K, "NQ": NQ}

    g = build(X, M=8, efC=64, heuristic=True, seed=1)
    out["layer_sizes_2000"] = [len(L) for L in g.layers]
    out["max_deg_layer0"] = max(len(v) for v in g.layers[0].values())
    out["max_deg_upper"] = max((len(v) for L in g.layers[1:] for v in L.values()), default=0)
    print("nodes per layer (N=2000):", out["layer_sizes_2000"])
    print("max degree layer0 =", out["max_deg_layer0"], "(limit 2M = 16); upper =", out["max_deg_upper"], "(limit M = 8)")

    out["sweep"] = sweep(g, Q, truth, [10, 20, 40, 80, 160], K)
    print("\nef  recall@10  dist/query   (brute force = N = 2000)")
    for r in out["sweep"]:
        print(f"{r['ef']:<4}{r['recall']:.3f}     {r['dist']:7.1f}")

    sel = {}
    for heur in [True, False]:
        rs, ds = [], []
        for seed in [1, 2, 3]:
            gg = build(X, M=8, efC=64, heuristic=heur, seed=seed)
            rr = sweep(gg, Q, truth, [40], K)[0]
            rs.append(rr["recall"]); ds.append(rr["dist"])
        sel["heuristic" if heur else "simple"] = {"recall": rs, "dist": ds}
    out["selection_ef40"] = sel
    print("\nneighbour selection, ef=40, graph seeds 1-3:")
    for k, v in sel.items():
        print(f"  {k:<10} recall {[round(x, 3) for x in v['recall']]}  dist {[round(x, 1) for x in v['dist']]}")

    g.evals = 0
    abl = []
    for name, dsc in [("descent", True), ("layer0_random_entry", False)]:
        g.evals = 0
        rec = [recall_at_k(g.search(q, K, 40, descend=dsc), t) for q, t in zip(Q, truth)]
        abl.append({"name": name, "recall": float(np.mean(rec)), "dist": g.evals / NQ})
    out["ablation_2000"] = abl
    print("\nhierarchy ablation, N=2000, ef=40:")
    for a in abl:
        print(f"  {a['name']:<20} recall {a['recall']:.3f} dist {a['dist']:.1f}")

    N2, NQ2 = 10000, 100
    X2 = np.random.default_rng(5).standard_normal((N2, D))
    Q2 = np.random.default_rng(105).standard_normal((NQ2, D))
    truth2 = truth_for(X2, Q2, K)
    g2 = build(X2, M=8, efC=64, heuristic=True, seed=1)
    out["layer_sizes_10000"] = [len(L) for L in g2.layers]
    abl2 = []
    for name, dsc in [("descent", True), ("layer0_random_entry", False)]:
        g2.evals = 0
        rec = [recall_at_k(g2.search(q, K, 40, descend=dsc), t) for q, t in zip(Q2, truth2)]
        abl2.append({"name": name, "recall": float(np.mean(rec)), "dist": g2.evals / NQ2})
    out["ablation_10000"] = abl2
    print("\nN=10000 nodes per layer:", out["layer_sizes_10000"])
    for a in abl2:
        print(f"  {a['name']:<20} recall {a['recall']:.3f} dist {a['dist']:.1f}")

    here = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
    with open(os.path.join(here, "35.3_data.json"), "w") as f:
        json.dump(out, f, indent=1)
    print("\nwrote 35.3_data.json")
