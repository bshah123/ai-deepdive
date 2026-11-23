# Experiment for lesson 40.3 (context caching). Produces every number used in the lesson and its diagrams.
# Run: python 40.3_experiment.py  -> writes 40.3_data.json next to this file.
import numpy as np

# A tiny 2-layer causal self-attention model with random weights (a stand-in for an LLM).
rng = np.random.default_rng(0)
D, VOCAB, LAYERS = 8, 100, 2
E = rng.normal(size=(VOCAB, D))                                   # token embeddings
Wq = rng.normal(size=(LAYERS, D, D)) / np.sqrt(D)
Wk = rng.normal(size=(LAYERS, D, D)) / np.sqrt(D)
Wv = rng.normal(size=(LAYERS, D, D)) / np.sqrt(D)

def forward(tokens, cache=None):
    """Process `tokens` after an optional cached prefix.
    cache: per-layer (K, V) arrays for the prefix. Returns (hidden states of the new tokens, updated cache)."""
    start = 0 if cache is None else cache[0][0].shape[0]
    x = E[tokens]
    new_cache = []
    for l in range(LAYERS):
        q, k, v = x @ Wq[l], x @ Wk[l], x @ Wv[l]
        if cache is not None:
            k = np.vstack([cache[l][0], k])
            v = np.vstack([cache[l][1], v])
        new_cache.append((k, v))
        scores = q @ k.T / np.sqrt(D)
        q_pos = np.arange(start, start + len(tokens))[:, None]
        k_pos = np.arange(k.shape[0])[None, :]
        scores = np.where(k_pos <= q_pos, scores, -np.inf)            # causal mask: no looking ahead
        w = np.exp(scores - scores.max(axis=1, keepdims=True))
        w = w / w.sum(axis=1, keepdims=True)
        x = x + w @ v                                                  # residual connection
    return x, new_cache

prefix = [3, 14, 15, 9, 26, 5, 35, 8]     # 8 tokens: tools + system prompt (the cacheable part)
suffix = [7, 9, 32, 38]                   # 4 tokens: the new user message

full, _ = forward(prefix + suffix)        # no cache: all 12 tokens are processed
_, cache = forward(prefix)                # write the prefix cache once: 8 tokens processed
part, _ = forward(suffix, cache)          # later call: only the 4 new tokens are processed
print("tokens processed without cache:", len(prefix) + len(suffix))
print("tokens processed with cache   :", len(suffix))
print("suffix matches full recompute :", np.allclose(full[-len(suffix):], part))

edited = [3, 14, 99, 9, 26, 5, 35, 8]     # one token changed, at position 2
_, c_orig = forward(prefix)
_, c_edit = forward(edited)
for layer in range(LAYERS):
    changed = [p for p in range(len(prefix))
               if not np.allclose(c_orig[layer][0][p], c_edit[layer][0][p])]
    print(f"layer {layer + 1}: cached keys that changed at positions", changed)

# Input-side cost, in units of one uncached base input token.
# Multipliers as quoted in the Anthropic prompt-caching docs: a cache write costs 1.25x (5-minute TTL)
# or 2x (1-hour TTL) the base price; a cache read costs 0.1x. A hit refreshes the entry's lifetime.
PREFIX, NEW = 20_000, 200                 # shared prefix tokens; new uncached tokens per request
POLICIES = {
    "no cache":     {"write": 1.00, "read": 1.00, "ttl": 0},
    "5-minute TTL": {"write": 1.25, "read": 0.10, "ttl": 300},
    "1-hour TTL":   {"write": 2.00, "read": 0.10, "ttl": 3600},
}
GAPS = [60, 120, 240, 400, 100, 2000, 90, 3700, 30]   # seconds between requests; first request at t=0

def run(policy):
    p = POLICIES[policy]
    times = [0]
    for g in GAPS:
        times.append(times[-1] + g)
    last, cost, log = None, 0.0, []
    for t in times:
        alive = last is not None and p["ttl"] > 0 and t - last <= p["ttl"]
        if alive:
            cost += PREFIX * p["read"] + NEW
            log.append("hit")
        else:
            cost += PREFIX * p["write"] + NEW
            log.append("miss" if p["ttl"] else "full")
        last = t
    return cost, log

def ratio(policy, k):
    """Cost of k requests that share one prefix, relative to paying full price every time."""
    p = POLICIES[policy]
    cached = PREFIX * p["write"] + (k - 1) * PREFIX * p["read"] + k * NEW
    return cached / (k * (PREFIX + NEW))


class PrefixCache:
    """Exact-prefix cache: a request hits on the longest leading run of blocks seen before."""
    def __init__(self):
        self.seen = set()                       # every leading prefix ever written

    def request(self, blocks):
        matched = 0
        for i in range(1, len(blocks) + 1):
            if tuple(blocks[:i]) in self.seen:
                matched = i
        for i in range(1, len(blocks) + 1):
            self.seen.add(tuple(blocks[:i]))
        return f"{matched} of {len(blocks)} blocks reused"


tools = "tools: search(query)"
system = "system: You are a helpful assistant."
doc = "doc: 3,000 tokens of refund policy"
user = "user: What is the refund window?"

import json, os
pc = PrefixCache()
blocks_match = [
    pc.request([tools, system, doc, user]),
    pc.request([tools, system, doc, "user: How do I log in?"]),
    pc.request([tools, system + " Today is 2026-11-23.", doc, user]),
    pc.request(["tools: search(query, limit)", system, doc, user]),
]
times = [0]
for g in GAPS:
    times.append(times[-1] + g)
data = {
    "prefix_len": len(prefix), "suffix_len": len(suffix),
    "tokens_no_cache": len(prefix) + len(suffix), "tokens_cached": len(suffix),
    "suffix_matches": bool(np.allclose(full[-len(suffix):], part)),
    "changed_positions": {f"layer{l + 1}": [p for p in range(len(prefix))
                          if not np.allclose(c_orig[l][0][p], c_edit[l][0][p])] for l in range(LAYERS)},
    "gaps": GAPS, "times": times,
    "policies": {name: {"total": run(name)[0], "log": run(name)[1]} for name in POLICIES},
    "ratios": {name: [round(ratio(name, k), 4) for k in (1, 2, 3, 5, 10, 100)] for name in ("5-minute TTL", "1-hour TTL")},
    "prefix_match": blocks_match,
    "prefix_tokens": PREFIX, "new_tokens": NEW,
}
assert data["policies"]["no cache"]["total"] == 10 * (PREFIX + NEW)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "40.3_data.json")
with open(out, "w") as f:
    json.dump(data, f, indent=1)
print("wrote", out)
print(json.dumps(data["policies"], indent=None)[:400])
