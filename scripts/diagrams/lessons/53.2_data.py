import json
import math
import random
import sys
from dataclasses import dataclass

T0, T1 = 1.0, 0.02  # assumed step-time model: one decode iteration takes T0 + T1*B time units (not measured)


@dataclass
class Req:
    rid: int
    arrival: float
    out_len: int          # tokens to generate
    done: int = 0         # tokens generated so far
    first: float = None   # time the first token is ready (TTFT = first - arrival)
    finish: float = None  # time the last token is ready (E2E = finish - arrival)


def clone(reqs):
    return [Req(r.rid, r.arrival, r.out_len) for r in reqs]


def step_time(b, t0=T0, t1=T1):
    return t0 + t1 * b


def run_static(reqs, max_batch, t0=T0, t1=T1):
    """Static batching: take up to max_batch waiting requests, run until the longest one finishes."""
    queue = sorted(reqs, key=lambda r: r.arrival)
    i, t, busy, waiting = 0, 0.0, 0.0, []
    while i < len(queue) or waiting:
        if not waiting:
            t = max(t, queue[i].arrival)
        while i < len(queue) and queue[i].arrival <= t:
            waiting.append(queue[i])
            i += 1
        batch, waiting = waiting[:max_batch], waiting[max_batch:]
        dt = step_time(len(batch), t0, t1)      # padded batch: finished slots still cost compute
        for s in range(max(r.out_len for r in batch)):
            t_end = t + dt
            for r in batch:
                if r.out_len > s:               # request still live: its slot is useful
                    busy += dt
                    r.done += 1
                    if s == 0:
                        r.first = t_end
                    if s == r.out_len - 1:
                        r.finish = t_end
            t = t_end
    return busy, t


def run_continuous(reqs, max_batch, t0=T0, t1=T1):
    """Continuous batching: re-decide the batch after every decode iteration."""
    queue = sorted(reqs, key=lambda r: r.arrival)
    i, t, busy = 0, 0.0, 0.0
    waiting, running = [], []
    while i < len(queue) or waiting or running:
        if not running and not waiting:
            t = max(t, queue[i].arrival)
        while i < len(queue) and queue[i].arrival <= t:
            waiting.append(queue[i])
            i += 1
        while waiting and len(running) < max_batch:   # admit into free slots
            running.append(waiting.pop(0))
        dt = step_time(len(running), t0, t1)
        t_end = t + dt
        busy += len(running) * dt
        still = []
        for r in running:
            r.done += 1
            if r.done == 1:
                r.first = t_end
            if r.done == r.out_len:                   # finished: leave now, free the slot
                r.finish = t_end
            else:
                still.append(r)
        running = still
        t = t_end
    return busy, t


def make_workload(n, rate, seed, mu=4.0, sigma=1.0, cap=1024):
    """rate=None: all requests present at t=0 (offline). Otherwise Poisson arrivals."""
    rng = random.Random(seed)
    t, reqs = 0.0, []
    for k in range(n):
        if rate is not None:
            t += rng.expovariate(rate)
        length = min(cap, max(1, round(rng.lognormvariate(mu, sigma))))
        reqs.append(Req(k, t, length))
    return reqs


def pct(xs, p):
    s = sorted(xs)
    return s[math.ceil(p / 100 * len(s)) - 1]   # nearest-rank percentile


def summarize(reqs, busy, makespan, max_batch):
    lat = [r.finish - r.arrival for r in reqs]
    ttft = [r.first - r.arrival for r in reqs]
    tokens = sum(r.out_len for r in reqs)
    return {
        "tok_per_unit": tokens / makespan,
        "util": busy / (max_batch * makespan),
        "p50_lat": pct(lat, 50),
        "p95_lat": pct(lat, 95),
        "mean_lat": sum(lat) / len(lat),
        "mean_ttft": sum(ttft) / len(ttft),
        "makespan": makespan,
    }


def main():
    # 1. Worked example: step time fixed at 1 (T1 = 0), batch of 2, four requests at t = 0
    trace = [Req(1, 0.0, 2), Req(2, 0.0, 6), Req(3, 0.0, 2), Req(4, 0.0, 4)]
    for name, fn in [("static", run_static), ("continuous", run_continuous)]:
        rs = clone(trace)
        busy, mk = fn(rs, 2, t0=1.0, t1=0.0)
        s = summarize(rs, busy, mk, 2)
        print(f"{name}: makespan={mk:.1f} utilisation={s['util']:.3f} mean latency={s['mean_lat']:.2f} mean TTFT={s['mean_ttft']:.2f}")
        for r in sorted(rs, key=lambda r: r.rid):
            print(f"  r{r.rid} out_len={r.out_len} first={r.first:.1f} finish={r.finish:.1f}")

    # 2. Offline throughput: 400 requests all present at t = 0
    base = make_workload(400, None, seed=7)
    lens = [r.out_len for r in base]
    print(f"\nworkload: n={len(base)} mean out_len={sum(lens)/len(lens):.1f} median={pct(lens, 50)} max={max(lens)}")
    print("B   static tok/unit   continuous tok/unit   ratio   static util   continuous util")
    offline = {}
    for B in [1, 2, 4, 8, 16, 32]:
        rs = clone(base); bs, ms = run_static(rs, B); ss = summarize(rs, bs, ms, B)
        rc = clone(base); bc, mc = run_continuous(rc, B); sc = summarize(rc, bc, mc, B)
        offline[B] = (ss, sc)
        print(f"{B:<3} {ss['tok_per_unit']:>14.2f}   {sc['tok_per_unit']:>18.2f}   {sc['tok_per_unit']/ss['tok_per_unit']:>5.2f}"
              f"   {ss['util']:>11.3f}   {sc['util']:>15.3f}")

    # 3. Sensitivity of the batch-size trade-off to the step-time growth T1
    print("\nsensitivity, continuous tok/unit by step-time slope T1 (T0 = 1):")
    for t1 in [0.0, 0.02, 0.05]:
        vals = []
        for B in [8, 16, 32]:
            rc = clone(base); bc, mc = run_continuous(rc, B, t1=t1)
            vals.append(f"B={B}: {summarize(rc, bc, mc, B)['tok_per_unit']:.2f}")
        print(f"  T1={t1:<5} " + "  ".join(vals))

    # 4. Online: Poisson arrivals at 0.015 requests per unit time, B = 8
    wl = make_workload(400, 0.015, seed=11)
    print("\nonline: 400 requests, Poisson rate 0.015 req/unit, B = 8")
    online = {}
    for name, fn in [("static", run_static), ("continuous", run_continuous)]:
        rs = clone(wl); busy, mk = fn(rs, 8); s = summarize(rs, busy, mk, 8)
        online[name] = s
        print(f"{name:<11} p50 latency={s['p50_lat']:.1f}  p95 latency={s['p95_lat']:.1f}  mean TTFT={s['mean_ttft']:.1f}"
              f"  tok/unit={s['tok_per_unit']:.2f}  util={s['util']:.3f}")

    if "--json" in sys.argv:
        out = {
            "offline": {str(B): {"static": ss, "continuous": sc} for B, (ss, sc) in offline.items()},
            "online": online,
        }
        with open(sys.argv[sys.argv.index("--json") + 1], "w") as f:
            json.dump(out, f, indent=1)


if __name__ == "__main__":
    main()
