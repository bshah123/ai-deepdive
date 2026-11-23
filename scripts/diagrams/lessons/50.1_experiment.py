import math
import random
from itertools import combinations

# 1. Three topologies on n agents, as lists of undirected edges (agent 0 is the hub or root)
def star(n):                      # supervisor 0 talks to every worker
    return [(0, i) for i in range(1, n)]

def binary_tree(n):               # hierarchy: agent i reports to agent (i-1)//2
    return [((i - 1) // 2, i) for i in range(1, n)]

def complete(n):                  # peer-to-peer: every pair can talk
    return list(combinations(range(n), 2))

def hops_from(n, edges, src=0):   # BFS distance from src to the farthest agent
    adj = {i: [] for i in range(n)}
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    dist, frontier = {src: 0}, [src]
    while frontier:
        nxt = []
        for u in frontier:
            for v in adj[u]:
                if v not in dist:
                    dist[v] = dist[u] + 1
                    nxt.append(v)
        frontier = nxt
    return max(dist.values())

def pairs_still_connected(n, edges, removed):
    """Fraction of ordered pairs of surviving agents that can still reach each other."""
    live = [i for i in range(n) if i != removed]
    adj = {i: [] for i in live}
    for a, b in edges:
        if removed not in (a, b):
            adj[a].append(b)
            adj[b].append(a)
    reachable = 0
    for s in live:
        seen, stack = {s}, [s]
        while stack:
            u = stack.pop()
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
        reachable += len(seen) - 1
    return reachable / (len(live) * (len(live) - 1))

n = 8
print(f"{'topology':<12}{'edges':>6}{'hops':>6}{'hub gone':>10}{'avg 1 lost':>12}")
for name, edges in [("star", star(n)), ("binary tree", binary_tree(n)), ("complete", complete(n))]:
    hub = pairs_still_connected(n, edges, removed=0)
    avg = sum(pairs_still_connected(n, edges, r) for r in range(n)) / n
    print(f"{name:<12}{len(edges):>6}{hops_from(n, edges):>6}{hub:>10.3f}{avg:>12.3f}")

# 2. Majority vote over n agents that each answer correctly with probability 1 - p
def majority_wrong(n, p):
    """Odd n, independent errors, all wrong answers agree (the worst case for voting)."""
    return sum(math.comb(n, k) * p**k * (1 - p)**(n - k) for k in range(n // 2 + 1, n + 1))

def correlated_wrong(n, p, rho):
    """With probability rho all agents share one draw (same answer); otherwise they are independent."""
    return rho * p + (1 - rho) * majority_wrong(n, p)

print(f"single agent error p = 0.300")
print(f"3 agents, independent : {majority_wrong(3, 0.3):.3f}")
for rho in (0.0, 0.25, 0.5):
    print(f"5 agents, rho={rho:.2f}  : {correlated_wrong(5, 0.3, rho):.3f}")

# Monte Carlo check of the closed form (seeded, so the output is repeatable)
rng = random.Random(0)
trials = 100_000
wrong = 0
for _ in range(trials):
    if rng.random() < 0.5:
        wrong += rng.random() < 0.3            # shared draw
    else:
        votes_wrong = sum(rng.random() < 0.3 for _ in range(5))
        wrong += votes_wrong > 2
print(f"Monte Carlo, 5 agents, rho=0.50: {wrong / trials:.3f} (closed form {correlated_wrong(5, 0.3, 0.5):.3f})")

# 3. Messages per task: supervisor dispatch-and-report vs. debate with all-to-all rounds
for k in (3, 5):
    print(f"supervisor, {k} subtasks: {2 * k} messages")
for n_agents, rounds in ((3, 2), (5, 2)):
    print(f"debate, {n_agents} agents, {rounds} rounds: {rounds * n_agents * (n_agents - 1)} messages")

# Dump every number the diagrams use (same computations as above).
import json, os
rhos = [0.0, 0.25, 0.5, 0.75, 1.0]
data = {
    "n": n,
    "topologies": [
        {"name": name, "edges": len(edges), "hops": hops_from(n, edges),
         "hub_gone": round(pairs_still_connected(n, edges, 0), 3),
         "avg_one_lost": round(sum(pairs_still_connected(n, edges, r) for r in range(n)) / n, 3)}
        for name, edges in [("star", star(n)), ("binary tree", binary_tree(n)), ("complete", complete(n))]
    ],
    "p": 0.3,
    "three_indep": round(majority_wrong(3, 0.3), 3),
    "five_by_rho": [{"rho": r, "err": round(correlated_wrong(5, 0.3, r), 3)} for r in rhos],
    "messages": {"supervisor_3": 2 * 3, "supervisor_5": 2 * 5, "debate_3x2": 2 * 3 * 2, "debate_5x2": 2 * 5 * 4},
}
here = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(here, "50.1_data.json"), "w") as f:
    json.dump(data, f, indent=2)
print("wrote 50.1_data.json")
