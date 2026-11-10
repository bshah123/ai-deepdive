"""Lesson 23.3: pure-Python BPE versus the Rust core of Hugging Face tokenizers.

Produces the timings shown in diagrams/23.3-speed.svg. Run with the course venv:
    python -I scripts/diagrams/lessons/23.3_speed.py
Timings depend on the machine; the lesson reports one run on an Apple M5 (10 cores).
"""
import json, os, random, re, time
import tokenizers
from tokenizers import Tokenizer, models, pre_tokenizers, trainers

# --- a synthetic corpus: 100k made-up word types with Zipf-like frequencies
rng = random.Random(0)
syll = ["ka", "to", "ri", "sen", "mo", "la", "pe", "dun", "vi", "ar",
        "es", "qu", "il", "tha", "no", "b", "x", "u"]
words = ["".join(rng.choices(syll, k=rng.randint(1, 5))) for _ in range(100_000)]
freq = [1 / (r + 1) for r in range(len(words))]
def doc():
    return " ".join(rng.choices(words, freq, k=200)) + "."
train_docs = [doc() for _ in range(2000)]
test_docs = [doc() for _ in range(2000)]

# --- train a BPE tokenizer with the library (Rust)
tok = Tokenizer(models.BPE())
tok.pre_tokenizer = pre_tokenizers.Whitespace()            # regex \w+|[^\w\s]+
tok.train_from_iterator(train_docs, trainers.BpeTrainer(vocab_size=4000, show_progress=False))

# --- the same model in pure Python: apply merges in rank order (as in GPT-2's bpe())
state = json.loads(tok.to_str())
vocab = state["model"]["vocab"]
rank = {tuple(m): i for i, m in enumerate(state["model"]["merges"])}
NO_MERGE = 1 << 30

def bpe_word(word):
    parts = list(word)
    while len(parts) > 1:
        r, i = min((rank.get(p, NO_MERGE), i) for i, p in enumerate(zip(parts, parts[1:])))
        if r == NO_MERGE:
            break
        parts[i:i + 2] = [parts[i] + parts[i + 1]]          # apply the best-ranked merge
    return parts

def py_encode(text, cache=None):
    ids = []
    for w in re.findall(r"\w+|[^\w\s]+", text):
        if cache is None:
            ids += [vocab[p] for p in bpe_word(w)]
        else:
            if w not in cache:
                cache[w] = [vocab[p] for p in bpe_word(w)]
            ids += cache[w]
    return ids

rust_ids = [e.ids for e in tok.encode_batch(test_docs)]
assert rust_ids == [e.ids for e in tok.encode_batch_fast(test_docs)]
assert rust_ids == [py_encode(t) for t in test_docs] == [py_encode(t, {}) for t in test_docs]
print("Python and Rust give identical ids on all", len(test_docs), "documents")

def best_of_3(f):
    times = []
    for _ in range(3):
        t0 = time.perf_counter(); f(); times.append(time.perf_counter() - t0)
    return min(times)

mb = sum(len(t.encode()) for t in test_docs) / 1e6
results = {}
results["Python, no cache"] = best_of_3(lambda: [py_encode(t) for t in test_docs])
results["Python + cache, cold"] = best_of_3(lambda: (lambda c: [py_encode(t, c) for t in test_docs])({}))
CACHE = {}                                       # shared across runs, like the Rust word cache
results["Python + cache, warm"] = best_of_3(lambda: [py_encode(t, CACHE) for t in test_docs])
results["Rust, encode() loop"] = best_of_3(lambda: [tok.encode(t) for t in test_docs])
os.environ["TOKENIZERS_PARALLELISM"] = "false"
results["Rust, encode_batch, 1 thread"] = best_of_3(lambda: tok.encode_batch(test_docs))
results["Rust, batch_fast, 1 thread"] = best_of_3(lambda: tok.encode_batch_fast(test_docs))
os.environ["TOKENIZERS_PARALLELISM"] = "true"
results["Rust, encode_batch, all cores"] = best_of_3(lambda: tok.encode_batch(test_docs))
results["Rust, batch_fast, all cores"] = best_of_3(lambda: tok.encode_batch_fast(test_docs))

print(f"tokenizers {tokenizers.__version__}, {os.cpu_count()} CPU cores, {mb:.2f} MB of text")
for k, v in results.items():
    print(f"{k:31s} {v:6.3f} s  {mb / v:6.1f} MB/s")
