import json

def get_weather(location: str, unit: str) -> str:
    """Toy weather tool. Temperatures in Celsius; converted for Fahrenheit."""
    celsius = {"tokyo": 28, "london": 15, "new york": 22}
    if location.lower() not in celsius:
        raise LookupError(f"no data for {location!r}")
    t = celsius[location.lower()]
    if unit == "fahrenheit":
        t = round(t * 9 / 5 + 32)
    return f"{t} degrees {unit}"

# Schema the model sees, in simplified form: required parameters, types, allowed values.
TOOLS = {
    "get_weather": {
        "fn": get_weather,
        "params": {"location": str, "unit": str},
        "allowed": {"unit": {"celsius", "fahrenheit"}},
    }
}

def validate(args, spec):
    """Return an error message, or None if the arguments fit the schema."""
    if not isinstance(args, dict):
        return "arguments must be a JSON object"
    for name, typ in spec["params"].items():
        if name not in args:
            return f"missing required argument {name!r}"
        if not isinstance(args[name], typ):
            return f"{name!r} must be {typ.__name__}, got {type(args[name]).__name__}"
        allowed = spec["allowed"].get(name)
        if allowed is not None and args[name] not in allowed:
            return f"{name!r} must be one of {sorted(allowed)}"
    extra = set(args) - set(spec["params"])
    if extra:
        return f"unexpected arguments {sorted(extra)}"
    return None

def dispatch(call):
    """Run one tool call. Returns (content, is_error). Never raises."""
    spec = TOOLS.get(call["name"])
    if spec is None:
        return f"unknown tool {call['name']!r}", True
    try:
        args = json.loads(call["arguments"])
    except json.JSONDecodeError as e:
        return f"arguments are not valid JSON: {e.msg}", True
    problem = validate(args, spec)
    if problem:
        return problem, True
    try:
        return str(spec["fn"](**args)), False
    except Exception as e:
        return f"tool error: {e}", True

def run_agent(model, user_text, max_steps=4):
    messages = [{"role": "user", "content": user_text}]
    for _ in range(max_steps):
        reply = model(messages)                 # one model call
        messages.append(reply)                  # keep the assistant turn unchanged
        if not reply["tool_calls"]:
            return reply["content"], messages
        for call in reply["tool_calls"]:
            content, is_error = dispatch(call)
            messages.append({"role": "tool", "tool_call_id": call["id"],
                             "content": content, "is_error": is_error})
    raise RuntimeError(f"no final answer after {max_steps} steps")

def stub_model(script):
    """Stand-in for an LLM: replays scripted replies. A real API call would go here."""
    replies = iter(script)
    return lambda messages: next(replies)

script = [
    {"role": "assistant", "content": "", "tool_calls": [
        {"id": "call_1", "name": "get_weather", "arguments": '{"location": "Tokyo", "unit": 22}'}]},
    {"role": "assistant", "content": "", "tool_calls": [
        {"id": "call_2", "name": "get_weather", "arguments": '{"location": "Tokyo", "unit": "fahrenheit"}'}]},
    {"role": "assistant", "content": "Tokyo is 82 degrees Fahrenheit.", "tool_calls": []},
]
answer, log = run_agent(stub_model(script), "How hot is Tokyo in Fahrenheit?")
for m in log:
    if m["role"] == "user":
        print("user   :", m["content"])
    elif m["role"] == "tool":
        print("tool   :", m["tool_call_id"], "is_error =", m["is_error"], "->", m["content"])
    elif m.get("tool_calls"):
        print("model  : calls", [c["name"] for c in m["tool_calls"]])
    else:
        print("model  : says", repr(m["content"]))
print("answer :", answer)

cases = [
    ("valid", "get_weather", '{"location": "Tokyo", "unit": "celsius"}'),
    ("malformed JSON", "get_weather", "{'location': 'Tokyo', 'unit': 'celsius'}"),
    ("wrong type", "get_weather", '{"location": "Tokyo", "unit": 22}'),
    ("missing argument", "get_weather", '{"location": "Tokyo"}'),
    ("enum violation", "get_weather", '{"location": "Tokyo", "unit": "kelvin"}'),
    ("tool raises", "get_weather", '{"location": "Atlantis", "unit": "celsius"}'),
    ("unknown tool", "get_wether", '{"location": "Tokyo", "unit": "celsius"}'),
]
print(f"{'case':<17}{'is_error':<10}content")
for label, name, args in cases:
    content, is_error = dispatch({"id": "x", "name": name, "arguments": args})
    print(f"{label:<17}{str(is_error):<10}{content}")

import numpy as np

# Toy model, not a measurement: each tool call needs K=3 attempts' worth of luck.
# p: chance the first attempt is malformed. R: chance a retry after an is_error message
# is correct (assumed here, not measured on a real model).
R, K, N = 0.7, 3, 20_000
rng = np.random.default_rng(47)

print("   p   naive  closed  validated  closed  attempts/call")
for p in (0.05, 0.20, 0.40):
    u = rng.random((N, K, 3))
    a1 = u[..., 0] < p            # attempt 1 malformed
    a2 = u[..., 1] < 1 - R        # attempt 2 malformed (drawn for all calls, used only if a1)
    a3 = u[..., 2] < 1 - R        # attempt 3 malformed (used only if a1 and a2)
    naive = np.mean(~a1.any(axis=1))           # no feedback: first bad call ends the episode
    call_fails = a1 & a2 & a3                  # all three attempts malformed
    validated = np.mean(~call_fails.any(axis=1))
    attempts = np.mean(1 + a1 + (a1 & a2))     # mean attempts per call
    print(f"{p:4.2f}  {naive:6.3f}  {(1-p)**K:6.3f}  {validated:9.3f}  "
          f"{(1-p*(1-R)**2)**K:6.3f}  {attempts:13.3f}")
