"""Experiment for lesson 49.1: short-term context strategies on synthetic chats.

Proxy: 1 whitespace word = 1 token (no real tokenizer; the mechanism is the point).
Summariser: a deliberately crude stub that keeps the leading KEEP fraction of the text it
compresses. It is NOT an LLM, so recall numbers describe this stub, not language models.
"""
import json
import math
from pathlib import Path

import numpy as np

OUT = Path(__file__).with_name("49.1_numbers.json")

N = 80            # turns
BUDGET = 400      # prompt budget for raw messages (sliding window)
RECENT = 240      # raw-message budget in the rolling-summary strategy
SUMMARY_MAX = 80  # summary budget; the summariser runs only when it is exceeded
MAIN_KEEP = 0.75  # stub keep ratio used for the per-turn chart
SEEDS = range(60)
KEEP_SWEEP = [0.5, 0.75, 0.9, 1.0]


def make_conversation(seed):
    rng = np.random.default_rng(seed)
    lens = rng.integers(20, 61, size=N)
    fact_turns = set(int(t) for t in rng.choice(np.arange(0, N), size=5, replace=False))
    msgs, facts = [], []
    for t in range(N):
        words = [f"w{int(rng.integers(1000))}" for _ in range(int(lens[t]))]
        if t in fact_turns:
            code = str(int(rng.integers(1000, 10000)))
            pos = int(rng.integers(0, len(words) + 1))
            fact = ["the", "license", "key", "for", "box", f"B{t}", "is", code]
            words = words[:pos] + fact + words[pos:]
            facts.append({"turn": t + 1, "code": code, "pos_frac": round((pos + fact.index(code)) / len(words), 3)})
        msgs.append(words)
    return msgs, facts


def sliding(msgs):
    sizes, final = [], []
    for t in range(N):
        window, total = [], 0
        for m in reversed(msgs[: t + 1]):
            if total + len(m) > BUDGET:
                break
            window.insert(0, m)
            total += len(m)
        sizes.append(total)
        final = [w for m in window for w in m]
    return sizes, final


def full_history(msgs):
    sizes, total = [], 0
    for m in msgs:
        total += len(m)
        sizes.append(total)
    overflow = next((t + 1 for t, s in enumerate(sizes) if s > BUDGET), None)
    return sizes, overflow


def rolling(msgs, keep):
    """Fold the oldest raw message into the summary when raw > RECENT.
    Summary is appended to; the stub compresses it (one round) only when > SUMMARY_MAX."""
    summary, raw = [], []
    sizes, rounds, reads = [], 0, 0
    for t in range(N):
        raw.append(msgs[t])
        while sum(len(m) for m in raw) > RECENT:
            summary = summary + raw.pop(0)
            if len(summary) > SUMMARY_MAX:
                reads += len(summary)
                summary = summary[: math.ceil(keep * len(summary))]
                rounds += 1
        sizes.append(len(summary) + sum(len(m) for m in raw))
    final = summary + [w for m in raw for w in m]
    return sizes, final, rounds, reads


def survival_table(length=200, rounds=6, keep=0.5):
    """Exact fraction of positions in a text that survive k lead-keep rounds, vs keep**k."""
    rows, L = [], length
    alive_positions = list(range(length))
    for k in range(rounds + 1):
        if k > 0:
            L = math.ceil(keep * L)
            alive_positions = [p for p in alive_positions if p < L]
        measured = len(alive_positions) / length
        rows.append({"rounds": k, "measured": round(measured, 4), "analytic_keep_pow_k": round(keep ** k, 4)})
    return rows


def toy_example():
    toy = ["my name is Ana and I live in Pune", "nice to meet you Ana",
           "what is the weather today", "it is sunny and warm", "should I bring a jacket"]
    lens = [len(s.split()) for s in toy]
    budget = 16
    rows = []
    for t in range(len(toy)):
        kept, total = [], 0
        for i in range(t, -1, -1):
            if total + lens[i] > budget:
                break
            kept.insert(0, i + 1)
            total += lens[i]
        rows.append({"turn": t + 1, "cumulative_words": sum(lens[: t + 1]),
                     "kept_messages": kept, "window_words": total})
    return {"message_lengths": lens, "budget": budget, "rows": rows}


def main():
    per_seed = {"sliding": [], "full_total": [], "sweep": {str(k): [] for k in KEEP_SWEEP}}
    main_run = None
    for seed in SEEDS:
        msgs, facts = make_conversation(seed)
        fh_sizes, overflow = full_history(msgs)
        sl_sizes, sl_final = sliding(msgs)
        codes = [f["code"] for f in facts]
        per_seed["sliding"].append({"recall": sum(c in sl_final for c in codes) / len(codes),
                                    "total_input": int(sum(sl_sizes)), "sizes": sl_sizes})
        per_seed["full_total"].append({"total_input": int(sum(fh_sizes)), "overflow_turn": overflow})
        for k in KEEP_SWEEP:
            ro_sizes, ro_final, rounds, reads = rolling(msgs, k)
            per_seed["sweep"][str(k)].append({"recall": sum(c in ro_final for c in codes) / len(codes),
                                              "rounds": rounds, "reads": reads,
                                              "total_input": int(sum(ro_sizes))})
        if seed == 49:
            ro_sizes, ro_final, rounds, reads = rolling(msgs, MAIN_KEEP)
            main_run = {"facts": facts, "full_sizes": fh_sizes, "sliding_sizes": sl_sizes,
                        "rolling_sizes": ro_sizes, "rolling_rounds": rounds,
                        "rolling_reads": reads, "rolling_final_words": len(ro_final),
                        "sliding_recall": sum(c in sl_final for c in codes),
                        "rolling_recall": sum(c in ro_final for c in codes)}

    def stats(xs):
        a = np.array(xs, dtype=float)
        return {"mean": round(float(a.mean()), 3), "min": round(float(a.min()), 3), "max": round(float(a.max()), 3)}

    summary = {
        "params": {"N": N, "BUDGET": BUDGET, "RECENT": RECENT, "SUMMARY_MAX": SUMMARY_MAX,
                   "MAIN_KEEP": MAIN_KEEP, "seeds": len(SEEDS), "KEEP_SWEEP": KEEP_SWEEP},
        "mean_message_words": round(float(np.mean([sum(len(m) for m in make_conversation(s)[0]) / N for s in SEEDS])), 2),
        "full_history": {"overflow_turns": stats([r["overflow_turn"] for r in per_seed["full_total"]]),
                         "total_input_mean": round(float(np.mean([r["total_input"] for r in per_seed["full_total"]]))) },
        "sliding_window": {"recall": stats([r["recall"] for r in per_seed["sliding"]]),
                           "total_input_mean": round(float(np.mean([r["total_input"] for r in per_seed["sliding"]])))},
        "rolling_sweep": {},
        "survival_keep_0_5": survival_table(keep=0.5),
        "survival_keep_0_75": survival_table(keep=0.75),
        "toy": toy_example(),
        "main_seed_49": main_run,
    }
    for k in KEEP_SWEEP:
        rs = per_seed["sweep"][str(k)]
        summary["rolling_sweep"][str(k)] = {
            "recall": stats([r["recall"] for r in rs]),
            "rounds_mean": round(float(np.mean([r["rounds"] for r in rs])), 1),
            "reads_mean": round(float(np.mean([r["reads"] for r in rs]))),
            "total_input_mean": round(float(np.mean([r["total_input"] for r in rs]))),
        }
    summary["full_history"]["total_input_mean"] = summary["full_history"]["total_input_mean"]
    OUT.write_text(json.dumps(summary, indent=1))
    print(json.dumps({k: v for k, v in summary.items() if k not in ("main_seed_49", "toy", "survival_keep_0_5", "survival_keep_0_75")}, indent=1))
    print("survival 0.5:", summary["survival_keep_0_5"])
    print("survival 0.75:", summary["survival_keep_0_75"])
    print("toy rows:", summary["toy"]["rows"])
    m = main_run
    print("main seed 49 facts:", m["facts"])
    print("main: rounds", m["rolling_rounds"], "reads", m["rolling_reads"], "final words", m["rolling_final_words"],
          "sliding recall", m["sliding_recall"], "rolling recall", m["rolling_recall"])
    idx = (0, 9, 19, 39, 79)
    print("sizes turns 1,10,20,40,80: full", [m["full_sizes"][i] for i in idx],
          "sliding", [m["sliding_sizes"][i] for i in idx], "rolling", [m["rolling_sizes"][i] for i in idx])
    print("max sizes: sliding", max(m["sliding_sizes"]), "rolling", max(m["rolling_sizes"]))


if __name__ == "__main__":
    main()
