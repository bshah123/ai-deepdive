"""Numbers for lesson 53.1 (performance metrics). Run: python3 scripts/diagrams/lessons/53.1_data.py
Writes 53.1_data.json next to this file; 53.1.mjs reads it. The lesson's code blocks are the same code.
Cost-model constants are ASSUMPTIONS (see the lesson), not measurements on any device."""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- Block A: metrics from a token-timestamp log (hand-checkable request) ----
arrival = 0.00                                   # seconds
token_times = np.linspace(0.42, 2.50, 100)       # first token at 0.42 s, last at 2.50 s, 100 tokens
ttft = token_times[0] - arrival
itl = np.diff(token_times)
e2e = token_times[-1] - arrival
mean_itl = itl.mean()
print(f"TTFT        = {ttft:.3f} s")
print(f"mean ITL    = {mean_itl*1000:.1f} ms over {len(itl)} gaps")
print(f"E2E         = {e2e:.3f} s")
print(f"tokens/s, end-to-end  = {len(token_times)/e2e:.1f}")
print(f"tokens/s, decode only = {1/mean_itl:.1f}")
hand = dict(ttft_s=ttft, mean_itl_ms=mean_itl * 1000, e2e_s=e2e,
            tps_e2e=len(token_times) / e2e, tps_decode=1 / mean_itl)

# ---- Block B: static batch of B decoding sequences (closed form) ----
T0 = 14.0      # ms per decode iteration: read all weights once (assumed)
C_SEQ = 0.25   # ms per running sequence per iteration: KV-cache reads at ~512 tokens context (assumed)
A_PROMPT = 0.1 # ms per prompt token in prefill (assumed)
PROMPT = 256   # prompt tokens per request

batch_rows = []
for B in [1, 2, 4, 8, 16, 32, 64]:
    itl_ms = T0 + C_SEQ * B
    batch_rows.append(dict(B=B, itl_ms=itl_ms, per_seq_tps=1000 / itl_ms, system_tps=B * 1000 / itl_ms))
print()
print(f"{'B':>3} {'ITL ms':>7} {'per-seq tok/s':>14} {'system tok/s':>13}")
for r in batch_rows:
    print(f"{r['B']:>3} {r['itl_ms']:>7.2f} {r['per_seq_tps']:>14.1f} {r['system_tps']:>13.0f}")

# ---- Block C: iteration-level simulator with prefill-prioritised scheduling ----
MAX_BATCH = 32

def simulate(rate_per_s, n_req=300, seed=53):
    rng = np.random.default_rng(seed)
    arrivals = np.cumsum(rng.exponential(1000.0 / rate_per_s, n_req))  # ms
    out_len = rng.integers(64, 193, n_req)                              # output tokens per request
    tokens = [[] for _ in range(n_req)]                                 # emission times (ms)
    waiting, running, now, nxt = [], [], 0.0, 0
    while nxt < n_req or waiting or running:
        while nxt < n_req and arrivals[nxt] <= now:
            waiting.append(nxt)
            nxt += 1
        if waiting and len(running) < MAX_BATCH:          # prefill first: new prompts block decodes
            batch = waiting[:MAX_BATCH - len(running)]
            del waiting[:len(batch)]
            now += T0 + A_PROMPT * PROMPT * len(batch)
            for r in batch:
                tokens[r].append(now)                     # first token comes out of prefill
            running.extend(batch)
        elif running:                                     # one decode iteration: 1 token per running request
            now += T0 + C_SEQ * len(running)
            for r in running:
                tokens[r].append(now)
            running = [r for r in running if len(tokens[r]) < out_len[r]]
        else:                                             # idle until the next arrival
            now = arrivals[nxt]
    return arrivals, tokens

def summarise(rate):
    arrivals, tokens = simulate(rate)
    ttft = np.array([t[0] - a for a, t in zip(arrivals, tokens)])
    itl_all = np.concatenate([np.diff(t) for t in tokens])
    total_tokens = sum(len(t) for t in tokens)
    span_s = (max(t[-1] for t in tokens) - arrivals[0]) / 1000
    return dict(rate=rate, ttft_p50=np.percentile(ttft, 50), ttft_p99=np.percentile(ttft, 99),
                itl_p50=np.percentile(itl_all, 50), itl_p99=np.percentile(itl_all, 99),
                itl_mean=itl_all.mean(), system_tps=total_tokens / span_s)

sweep = [summarise(r) for r in [1, 3, 5, 7, 9]]
print()
print(f"{'req/s':>5} {'TTFT p50':>9} {'TTFT p99':>9} {'ITL p50':>8} {'ITL p99':>8} {'ITL mean':>9} {'sys tok/s':>10}")
for s in sweep:
    print(f"{s['rate']:>5} {s['ttft_p50']:>9.0f} {s['ttft_p99']:>9.0f} {s['itl_p50']:>8.1f} "
          f"{s['itl_p99']:>8.1f} {s['itl_mean']:>9.1f} {s['system_tps']:>10.0f}")

# One request at rate 7 that overlapped other prefills: its per-token ITL series
arrivals7, tokens7 = simulate(7)
itl_per_req = [np.diff(t) for t in tokens7]
worst = int(np.argmax([x.max() for x in itl_per_req]))
series = itl_per_req[worst]
med = float(np.median(series))
print()
print(f"request {worst}: tokens={len(series)+1}, median ITL={med:.1f} ms, max ITL={series.max():.1f} ms, "
      f"tokens above 1.5x median={int((series > 1.5*med).sum())}")
print(f"spike sizes (ms): {np.round(np.sort(series)[-5:], 1).tolist()}")

out = dict(hand=hand, batch=batch_rows, sweep=sweep,
           stall=dict(request=worst, median_ms=med, series=[float(x) for x in series]),
           model=dict(T0=T0, C_SEQ=C_SEQ, A_PROMPT=A_PROMPT, PROMPT=PROMPT, MAX_BATCH=MAX_BATCH))
with open(os.path.join(HERE, "53.1_data.json"), "w") as f:
    json.dump(out, f, indent=1, default=float)
