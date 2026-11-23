"""Lesson 50.3 experiment: how much each multi-agent pattern costs in model calls and prompt words.

No LLM is called. StubLLM logs every call's prompt size and reply size in words
(whitespace split; a proxy, NOT model tokens). Reply lengths are fixed constants, so
the numbers measure structure: how many calls, and how much history each call re-sends.
They say nothing about answer quality. The functions here are the same as the lesson's code.
"""
import json, os

def words(n, tag="w"):
    return " ".join([tag] * n)

class StubLLM:
    def __init__(self):
        self.log = []
    def call(self, name, prompt, reply_words):
        self.log.append((name, len(prompt.split()), reply_words))
        return words(reply_words, "out")

ROLE, TASK = words(40, "role"), words(15, "task")

def run_sequential(llm, all_context=False):
    outputs = []
    for name, reply in [("researcher", 120), ("analyst", 90), ("writer", 150)]:
        context = outputs if all_context else outputs[-1:]
        outputs.append(llm.call(name, " ".join([ROLE, TASK] + context), reply))

def run_hierarchical(llm):
    llm.call("manager plan", words(60, "mgr") + " " + words(45, "task") + " " + words(30, "roster"), 50)
    replies = {"researcher": 120, "analyst": 90, "writer": 150}
    outs = {n: llm.call(f"worker {n}", " ".join([ROLE, TASK, words(20, "assign")]), r) for n, r in replies.items()}
    for n, out in outs.items():
        llm.call(f"manager review {n}", " ".join([words(60, "mgr"), out, words(15, "crit")]), 20)

def run_group_chat(llm, n_messages, selector=False, msg_words=60):
    history = []
    for t in range(n_messages):
        hist = " ".join(history)
        if selector:
            llm.call("selector", " ".join([words(30, "roster"), words(30, "sel"), hist]), 2)
        history.append(llm.call(f"speaker {t % 3}", " ".join([ROLE, TASK, hist]), msg_words))

def stats(fn, **kw):
    llm = StubLLM(); fn(llm, **kw)
    p = [x for _, x, _ in llm.log]
    return {"calls": len(p), "prompt_words": sum(p), "reply_words": sum(r for _, _, r in llm.log),
            "max_call_prompt": max(p)}

def single(llm):
    llm.call("single", ROLE + " " + TASK, 150)

out = {"patterns": {
    "single_agent": stats(single),
    "sequential_default": stats(run_sequential),
    "sequential_all_context": stats(run_sequential, all_context=True),
    "hierarchical": stats(run_hierarchical),
}, "group_chat": {}}
for T in [4, 8, 12, 16, 20, 25]:
    out["group_chat"][str(T)] = {"round_robin": stats(run_group_chat, n_messages=T),
                                 "selector": stats(run_group_chat, n_messages=T, selector=True)}
P = out["patterns"]
out["closed_form_rr"] = {str(T): 55 * T + 60 * T * (T - 1) // 2 for T in [4, 8, 12, 16, 20, 25]}
out["ratios"] = {
    "cap25_over_stop8_rr": round(out["group_chat"]["25"]["round_robin"]["prompt_words"] /
                                 out["group_chat"]["8"]["round_robin"]["prompt_words"], 2),
    "hierarchical_over_seq_default_prompt": round(P["hierarchical"]["prompt_words"] / P["sequential_default"]["prompt_words"], 2),
    "seq_default_over_single_total_words": round((P["sequential_default"]["prompt_words"] + P["sequential_default"]["reply_words"]) /
                                                 (P["single_agent"]["prompt_words"] + P["single_agent"]["reply_words"]), 2),
}
assert all(out["group_chat"][T]["round_robin"]["prompt_words"] == out["closed_form_rr"][T] for T in out["closed_form_rr"])
print(json.dumps(out, indent=1))
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "50.3_data.json"), "w") as f:
    json.dump(out, f, indent=1)
