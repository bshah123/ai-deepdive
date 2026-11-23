import hashlib
import random
from collections import OrderedDict


def block_hashes(tokens, B):
    """Hash each FULL block of B tokens. Each hash also folds in the previous block's
    hash, so a block's identity covers its whole prefix. A partial last block gets no hash."""
    out, parent = [], "root"
    for i in range(len(tokens) // B):
        chunk = tuple(tokens[i * B:(i + 1) * B])
        parent = hashlib.sha256(repr((parent, chunk)).encode()).hexdigest()[:8]
        out.append(parent)
    return out


def content_only_hashes(tokens, B):
    """Wrong on purpose: hash each block's tokens alone, ignoring what came before."""
    return [hashlib.sha256(repr(tuple(tokens[i * B:(i + 1) * B])).encode()).hexdigest()[:8]
            for i in range(len(tokens) // B)]


class PrefixCache:
    """Toy LRU cache of KV blocks, keyed by chained block hash. Capacity is in blocks."""

    def __init__(self, capacity, B=16):
        self.cap, self.B = capacity, B
        self.lru = OrderedDict()              # oldest first; the first key is evicted first

    def serve(self, tokens):
        """Return (prompt tokens reused from cache, prompt length), then cache this prompt."""
        hs = block_hashes(tokens, self.B)
        hit = 0
        while hit < len(hs) and hs[hit] in self.lru:   # longest cached prefix
            hit += 1
        for h in reversed(hs):                # last block first, so the first block ends up newest
            if h in self.lru:
                self.lru.move_to_end(h)
            else:
                self.lru[h] = None
        while len(self.lru) > self.cap:       # evict least recently used
            self.lru.popitem(last=False)
        return hit * self.B, len(tokens)


def rand_tokens(rng, n):
    return [rng.randrange(50000) for _ in range(n)]


def toy_demo():
    P1 = [1, 2, 3, 4, 9, 9, 9, 9, 7, 7]      # 10 tokens: two full blocks of 4, plus 2 leftover
    P2 = [5, 6, 7, 8, 9, 9, 9, 9, 7, 7]      # same second block content, different first block
    P3 = [1, 2, 3, 4, 9, 9, 9, 9, 5, 5]      # shares the first two blocks with P1
    chain = {k: block_hashes(p, 4) for k, p in [("P1", P1), ("P2", P2), ("P3", P3)]}
    leading = lambda a, b: next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
    naive_p1 = set(content_only_hashes(P1, 4))
    naive_false = sum(h in naive_p1 for h in content_only_hashes(P2, 4))
    return {
        "chain": chain,
        "leading_P1_P2": leading(chain["P1"], chain["P2"]),
        "leading_P1_P3": leading(chain["P1"], chain["P3"]),
        "naive_false_hits_P2": naive_false,
    }


def granularity(S, B=16):
    """Two prompts share a system prompt of S tokens. Full-block reuse vs token-level reuse."""
    rng = random.Random(S)
    sys_p = rand_tokens(rng, S)
    p1 = sys_p + rand_tokens(rng, 20)
    p2 = sys_p + rand_tokens(rng, 20)
    cache = PrefixCache(10**6, B)
    cache.serve(p1)
    block_reuse, _ = cache.serve(p2)
    lcp = 0
    while lcp < min(len(p1), len(p2)) and p1[lcp] == p2[lcp]:
        lcp += 1
    return {"S": S, "block_reuse": block_reuse, "token_reuse": lcp}


def trap(where, n=50, B=16):
    """One per-request ID (a timestamp, say) placed at the front or the back of a shared prefix."""
    rng = random.Random(3)
    prefix = rand_tokens(rng, 96)
    cache = PrefixCache(10**6, B)
    hit = total = 0
    for i in range(n):
        suffix = rand_tokens(rng, 32)
        rid = [900000 + i]
        p = rid + prefix + suffix if where == "front" else prefix + suffix + rid
        h, t = cache.serve(p)
        hit, total = hit + h, total + t
    return hit / total


def workload(seed=7, n_req=2000, tenants=8, sys_len=256):
    """Zipf-like tenant popularity; each request has a shared system prompt and a unique user suffix."""
    rng = random.Random(seed)
    sys_prompts = [rand_tokens(rng, sys_len) for _ in range(tenants)]
    weights = [1 / (k + 1) for k in range(tenants)]
    reqs = []
    for _ in range(n_req):
        t = rng.choices(range(tenants), weights)[0]
        reqs.append(sys_prompts[t] + rand_tokens(rng, rng.randrange(40, 201)))
    return reqs


def hit_rate(cap, reqs, B=16):
    cache = PrefixCache(cap, B)
    hit = total = 0
    for p in reqs:
        h, t = cache.serve(p)
        hit, total = hit + h, total + t
    return hit / total


def memory_and_prefill(layers=32, kv_heads=8, head_dim=128, bytes_per=2, sys_len=2048, users=64, suffix=128):
    """Arithmetic for an illustrative config (not any named model): K and V per token, fp16."""
    per_token = 2 * layers * kv_heads * head_dim * bytes_per
    MiB = 2**20
    computed = suffix                          # uncached prompt tokens, if sys_len is fully cached
    total = sys_len + suffix
    return {
        "bytes_per_token": per_token,
        "block16_MiB": per_token * 16 / MiB,
        "sys_copy_MiB": per_token * sys_len / MiB,
        "no_sharing_GiB": users * per_token * sys_len / 2**30,
        "shared_GiB": per_token * sys_len / 2**30,
        "prefill_fraction_computed": computed / total,
    }


def results():
    reqs = workload()
    caps = [0, 16, 32, 64, 128, 256, 512, 1024, 4096]
    return {
        "toy": toy_demo(),
        "granularity": [granularity(S) for S in [16, 40, 100, 2048]],
        "trap_front": trap("front"),
        "trap_back": trap("back"),
        "sweep": [{"cap": c, "hit": hit_rate(c, reqs)} for c in caps],
        "memory": memory_and_prefill(),
    }


if __name__ == "__main__":
    R = results()
    T = R["toy"]
    print("P1 chain:", T["chain"]["P1"])
    print("P2 chain:", T["chain"]["P2"])
    print("P3 chain:", T["chain"]["P3"])
    print("leading blocks shared, P1 vs P2:", T["leading_P1_P2"], "->", 4 * T["leading_P1_P2"], "tokens")
    print("leading blocks shared, P1 vs P3:", T["leading_P1_P3"], "->", 4 * T["leading_P1_P3"], "tokens")
    print("content-only hashing would call P2's block 2 a hit:", T["naive_false_hits_P2"], "block")
    print()
    for g in R["granularity"]:
        print(f"system prompt {g['S']:5d} tokens: block-level reuse {g['block_reuse']:5d}, token-level reuse {g['token_reuse']:5d}")
    print()
    print(f"trap: request ID at the front of the prompt -> hit rate {R['trap_front']:.3f}")
    print(f"trap: request ID at the back of the prompt  -> hit rate {R['trap_back']:.3f}")
    print()
    for row in R["sweep"]:
        print(f"cache capacity {row['cap']:5d} blocks -> token hit rate {row['hit']:.3f}")
    print()
    M = R["memory"]
    print(f"KV bytes per token: {M['bytes_per_token']}")
    print(f"one 16-token block: {M['block16_MiB']:.1f} MiB")
    print(f"one copy of a 2048-token system prompt: {M['sys_copy_MiB']:.0f} MiB")
    print(f"64 users, no sharing: {M['no_sharing_GiB']:.0f} GiB; shared: {M['shared_GiB']:.2f} GiB")
    print(f"prefill tokens computed for a 2048+128 prompt with the system prompt cached: {M['prefill_fraction_computed']:.3f} of the prompt")
