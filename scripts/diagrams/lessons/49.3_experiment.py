"""Lesson 49.3 experiment: entity memory as a triple store.

Stdlib only and seeded. Fact extraction is stubbed (facts come from a generator,
not from an LLM), so every number below measures the memory mechanism alone.
Prints every number the lesson uses and writes 49.3_numbers.json next to this file.
"""
import difflib
import json
import os
import random
import re
from collections import deque
from itertools import combinations

# ---- 0. Worked example (same code as the lesson's visible block) ----
FUNCTIONAL = {"lives_in"}   # relations with one live value at a time


class Store:
    def __init__(self, supersede):
        self.supersede = supersede
        self.facts = []

    def add(self, s, r, o, turn):
        if self.supersede and r in FUNCTIONAL:
            for f in self.facts:
                if f["s"] == s and f["r"] == r:
                    f["live"] = False          # keep the history, hide it from retrieval
        self.facts.append({"s": s, "r": r, "o": o, "turn": turn, "live": True})

    def live_facts(self):
        return [f for f in self.facts if f["live"]]


def retrieve(store, start, hops):
    depth = {start: 0}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if depth[node] == hops:
            continue
        for f in store.live_facts():
            if f["s"] == node and f["o"] not in depth:
                depth[f["o"]] = depth[node] + 1
                queue.append(f["o"])
    hits = [f for f in store.live_facts() if f["s"] in depth and depth[f["s"]] <= hops]
    return sorted(hits, key=lambda f: (depth[f["s"]], -f["turn"]))


WORKED = [("Alice", "lives_in", "Delhi"), ("Alice", "likes", "Laptop"),
          ("Alice", "friend_of", "Bob"), ("Bob", "likes", "Phone"),
          ("Alice", "lives_in", "Mumbai")]


def build_worked(supersede):
    store = Store(supersede)
    for turn, (s, r, o) in enumerate(WORKED, start=1):
        store.add(s, r, o, turn)
    return store


naive_w, sup_w = build_worked(False), build_worked(True)
got_w = retrieve(sup_w, "Alice", hops=1)
gold_w = {("Bob", "likes", "Phone")}          # what Alice's friends like
ret_w = {(f["s"], f["r"], f["o"]) for f in got_w}
worked = {
    "lives_in_append_only": [f["o"] for f in naive_w.live_facts() if f["r"] == "lives_in"],
    "lives_in_supersede": [f["o"] for f in sup_w.live_facts() if f["r"] == "lives_in"],
    "returned_1hop_supersede": len(got_w),
    "returned_1hop_append_only": len(retrieve(naive_w, "Alice", hops=1)),
    "gold_hits": len(gold_w & ret_w),
    "precision_1hop": len(gold_w & ret_w) / len(got_w),
}
print("worked:", worked)
print("worked retrieval order:", [(f["s"], f["r"], f["o"], f["turn"]) for f in got_w])

# ---- 1. Synthetic world: 60 users, 30 products, 8 cities ----
USERS = [f"U{i:02d}" for i in range(60)]
PRODUCTS = [f"P{i:02d}" for i in range(30)]
CITIES = ["Delhi", "Mumbai", "Pune", "Chennai", "Kolkata", "Jaipur", "Lucknow", "Kochi"]

rng = random.Random(49)
friends = {u: set() for u in USERS}
for u in USERS:
    for v in rng.sample([x for x in USERS if x != u], 2):
        friends[u].add(v)
        friends[v].add(u)
likes = {u: rng.sample(PRODUCTS, 3) for u in USERS}
home = {u: rng.choice(CITIES) for u in USERS}
moves = {u: rng.choice([c for c in CITIES if c != home[u]])
         for u in USERS if rng.random() < 0.4}


def stream(supersede):
    store, turn = Store(supersede), 0

    def add(s, r, o):
        nonlocal turn
        turn += 1
        store.add(s, r, o, turn)

    for u in USERS:
        add(u, "lives_in", home[u])
        for p in likes[u]:
            add(u, "likes", p)
        for v in sorted(friends[u]):
            add(u, "friend_of", v)
    for u in USERS:                            # moves arrive after the initial facts
        if u in moves:
            add(u, "lives_in", moves[u])
    return store


naive, sup = stream(False), stream(True)

# ---- 2. Supersession: is the stale city still in the context? ----
def stale_in_context(store):
    return sum(any(f["r"] == "lives_in" and f["o"] == home[u] for f in retrieve(store, u, 0))
               for u in sorted(moves))


supersession = {
    "moved_users": len(moves),
    "stale_in_context_append_only": stale_in_context(naive),
    "stale_in_context_supersede": stale_in_context(sup),
}
print("supersession:", supersession)

# ---- 3. Retrieval: friends' likes, by hop depth and fact budget (micro-averaged) ----
def evaluate(store, hops, budget):
    hit = gold_n = returned = 0
    for u in USERS:
        gold = {(v, "likes", p) for v in friends[u] for p in likes[v]}
        got = retrieve(store, u, hops)
        if budget is not None:
            got = got[:budget]
        ret = {(f["s"], f["r"], f["o"]) for f in got}
        hit += len(gold & ret)
        gold_n += len(gold)
        returned += len(got)
    return {"recall": round(hit / gold_n, 3), "precision": round(hit / returned, 3),
            "facts_per_user": round(returned / len(USERS), 1), "gold_total": gold_n}


retrieval = {f"hops{h}_budget{b if b else 'none'}": evaluate(sup, h, b)
             for h in (0, 1, 2) for b in (None, 20)}
for k, v in retrieval.items():
    print("retrieval", k, v)

# ---- 4. Entity resolution: do name variants merge, and do different people stay apart? ----
FIRST = ["Asha", "Ravi", "Meera", "Arjun", "Nisha", "Kiran", "Vikram", "Anita", "Rohan", "Priya",
         "Sanjay", "Lakshmi", "Dev", "Isha", "Manoj", "Tara", "Suresh", "Gita", "Nikhil", "Divya"]
LAST = ["Rao", "Iyer", "Mehta", "Singh", "Verma", "Nair", "Joshi", "Kapoor", "Reddy", "Shah",
        "Das", "Pillai", "Bose", "Gupta", "Menon", "Sen", "Kumar", "Patel", "Rawat", "Dutta"]

rng = random.Random(49)
people = rng.sample([(f, l) for f in FIRST for l in LAST], 40)
name = lambda p: f"{p[0]} {p[1]}"


def variant(p, kind):
    f, l = p
    if kind == "lower-case":
        return f"{f.lower()} {l.lower()}"
    if kind == "initial":
        return f"{f[0]}. {l}"
    if kind == "typo":                       # delete one letter from the first name
        return (f[:2] + f[3:] if len(f) > 3 else f[:1] + f[2:]) + f" {l}"
    if kind == "reversed":
        return f"{l}, {f}"


KINDS = ["lower-case", "initial", "typo", "reversed"]
pairs = []                                   # (text_a, text_b, same_person, label)
for i, kind in enumerate(KINDS):
    for p in people[10 * i: 10 * i + 10]:
        pairs.append((name(p), variant(p, kind), True, kind))
rand_neg = [tuple(rng.sample(people, 2)) for _ in range(40)]
same_last = [(a, b) for a, b in combinations(people, 2) if a[1] == b[1]]
same_first = [(a, b) for a, b in combinations(people, 2) if a[0] == b[0]]
hard_neg = rng.sample(same_last, 20) + rng.sample(same_first, 20)
for a, b in rand_neg:
    pairs.append((name(a), name(b), False, "random"))
for a, b in hard_neg:
    pairs.append((name(a), name(b), False, "hard"))


def norm(s):                                 # lower-case the letters, sort the tokens
    return " ".join(sorted(re.findall(r"[a-z]+", s.lower())))


def score(a, b):
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()


resolution = {}
for t in (1.0, 0.9, 0.8, 0.7, 0.6):
    tp = sum(1 for a, b, y, _ in pairs if y and score(a, b) >= t)
    fp = sum(1 for a, b, y, _ in pairs if not y and score(a, b) >= t)
    per_kind = {k: sum(1 for a, b, y, lab in pairs if y and lab == k and score(a, b) >= t)
                for k in KINDS}
    resolution[str(t)] = {"tp": tp, "fp": fp, "recall": round(tp / 40, 3),
                          "precision": round(tp / (tp + fp), 3) if tp + fp else None,
                          "false_merges_hard": sum(1 for a, b, y, lab in pairs
                                                   if not y and lab == "hard" and score(a, b) >= t),
                          "recall_by_kind": per_kind}
    print("resolution t=", t, resolution[str(t)])

out = {"worked": worked, "supersession": supersession, "retrieval": retrieval,
       "resolution": resolution, "n_positive": 40, "n_negative": len(rand_neg) + len(hard_neg)}
with open(os.path.join(os.path.dirname(os.path.abspath(globals().get("__file__", "."))), "49.3_numbers.json"), "w") as fh:
    json.dump(out, fh, indent=1)
