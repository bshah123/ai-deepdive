import json
import numpy as np

# ---------- 1. Scheduling: what parallel calls buy ----------
latency = {"get_weather": 0.9, "search_flights": 1.4, "search_hotels": 1.1}  # simulated seconds
print(f"sequential, 3 calls: {sum(latency.values()):.1f} s")
print(f"parallel, 3 independent calls: {max(latency.values()):.1f} s")

deps = {"get_weather": [], "search_flights": [], "search_hotels": ["search_flights"]}
finish = {}
def finish_time(name):
    if name not in finish:
        start = max((finish_time(d) for d in deps[name]), default=0.0)
        finish[name] = start + latency[name]
    return finish[name]
print(f"hotel search depends on flights: {max(finish_time(n) for n in deps):.1f} s")

# ---------- 2. One assistant turn, several tool_use blocks ----------
turn = [
    {"type": "tool_use", "id": "toolu_1", "name": "get_weather"},
    {"type": "tool_use", "id": "toolu_2", "name": "search_flights"},
    {"type": "tool_use", "id": "toolu_3", "name": "search_hotels"},
]
done = {}
for call in sorted(turn, key=lambda c: latency[c["name"]]):   # completion order
    done[call["id"]] = {"type": "tool_result", "tool_use_id": call["id"],
                        "content": f"{call['name']} finished"}
user_message = [done[c["id"]] for c in turn]                   # one message, request order
print("completion order:", list(done))
print("user message:", [r["tool_use_id"] for r in user_message])

# ---------- 3. Constrained decoding over a finite language ----------
CITIES = ["Tokyo", "London", "Paris"]
VALID = [f'{{"city": "{c}", "days": {d}}}' for c in CITIES for d in range(1, 10)]
VALID_SET = set(VALID)
PREFIXES = {s[:i] for s in VALID for i in range(len(s) + 1)}   # every character-level viable prefix
VOCAB = ["{", '"city"', ': "', "Tokyo", "London", "Paris", "Tok", "yo", "Lon", "don",
         "Par", "is", '", ', '"days"', ': ', *map(str, range(1, 10)), "}", '"}',
         "the", "hi", "<eos>"]
EOS = VOCAB.index("<eos>")
V = len(VOCAB)

def live_states(tokens):
    # A prefix is live if some sequence of vocabulary tokens completes it to a valid string.
    live = set(VALID_SET)
    changed = True
    while changed:
        changed = False
        for p in PREFIXES:
            if p not in live and any(p + t in live for t in tokens if t != "<eos>"):
                live.add(p)
                changed = True
    return live

LIVE = live_states(VOCAB)

def allowed(text, live=LIVE, tokens=VOCAB):
    ids = [i for i, t in enumerate(tokens) if t != "<eos>" and text + t in live]
    if text in VALID_SET:
        ids.append(EOS)
    return ids

def reachable_dead_ends(tokens, ok):
    # Count reachable states from which the mask allows no token and the string is not complete.
    seen, stack, dead = set(), [""], 0
    while stack:
        p = stack.pop()
        if p in seen:
            continue
        seen.add(p)
        if p in VALID_SET:
            continue
        nxt = [p + t for t in tokens if t != "<eos>" and ok(p + t)]
        if not nxt:
            dead += 1
        stack.extend(nxt)
    return dead

no_don = [t for t in VOCAB if t != "don"]
print(f"valid strings in the language: {len(VALID)}")
print("dead ends, prefix-only mask, full vocabulary:", reachable_dead_ends(VOCAB, lambda s: s in PREFIXES))
print("dead ends, prefix-only mask, without 'don':", reachable_dead_ends(no_don, lambda s: s in PREFIXES))
print("dead ends, live-state mask, full vocabulary:", reachable_dead_ends(VOCAB, lambda s: s in LIVE))
print("dead ends, live-state mask, without 'don':", reachable_dead_ends(no_don, lambda s: s in live_states(no_don)))

INTENDED = '{"city": "London", "days": 4}'
INTENDED_IDS = [VOCAB.index(t) for t in ["{", '"city"', ': "', "London", '", ', '"days"', ': ', "4", "}"]] + [EOS]
rng = np.random.default_rng(47)
W = rng.normal(0.0, 0.8, size=(V + 1, V))   # row V = start of sequence
BOOST = 6.0                                  # the "model" is confident and mostly on track

def model_logits(prev, gen):
    z = W[prev].copy()
    if len(gen) < len(INTENDED_IDS) and gen == INTENDED_IDS[:len(gen)]:
        z[INTENDED_IDS[len(gen)]] += BOOST
    return z

def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()

def detok(ids):
    return "".join(VOCAB[i] for i in ids)

def sample(gen_rng, constrained, max_new):
    gen, finished = [], False
    for _ in range(max_new):
        z = model_logits(gen[-1] if gen else V, gen)
        if constrained:
            mask = np.full(V, -np.inf)
            mask[allowed(detok(gen))] = 0.0
            z = z + mask
        tok = int(gen_rng.choice(V, p=softmax(z)))
        if tok == EOS:
            finished = True
            break
        gen.append(tok)
    return detok(gen), finished

def is_valid(text):
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return False
    return (isinstance(obj, dict) and list(obj) == ["city", "days"]
            and obj["city"] in CITIES and type(obj["days"]) is int and 1 <= obj["days"] <= 9)

print("intended string is valid:", is_valid(INTENDED))

# Mask at one step: the model has just written '{"city": "'
prefix_ids = [VOCAB.index(t) for t in ["{", '"city"', ': "']]
raw = softmax(model_logits(prefix_ids[-1], prefix_ids))
legal = allowed('{"city": "')
mask = np.full(V, -np.inf)
mask[legal] = 0.0
masked = softmax(np.log(raw) + mask)
print('state: {"city": "')
print("  allowed tokens:", [VOCAB[i] for i in legal])
print(f"  probability the model put on legal tokens: {raw[legal].sum():.3f}")
for i in sorted(range(V), key=lambda i: -raw[i])[:8]:
    tag = "allowed" if mask[i] == 0 else "blocked"
    print(f"  {VOCAB[i]!r:<12} raw {raw[i]:.3f}  masked {masked[i]:.3f}  {tag}")

N = 2000
def run(constrained, max_new):
    gen_rng = np.random.default_rng(7)
    return [sample(gen_rng, constrained, max_new) for _ in range(N)]

def summary(name, runs):
    texts = [t for t, _ in runs]
    valid = np.mean([is_valid(t) for t in texts])
    finished = np.mean([f for _, f in runs])
    city = np.mean([is_valid(t) and json.loads(t)["city"] == "London" for t in texts])
    exact = np.mean([t == INTENDED for t in texts])
    print(f"{name:<26} valid {valid:6.1%}  finished {finished:6.1%}  "
          f"city=London {city:6.1%}  exact {exact:6.1%}")

summary("unconstrained, 14 tokens", run(False, 14))
summary("constrained, 14 tokens", run(True, 14))
summary("constrained, 5 tokens", run(True, 5))
