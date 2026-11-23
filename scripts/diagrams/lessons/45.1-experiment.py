"""Produces every number used in lesson 45.1. Writes 45.1-data.json next to this file."""
import json, os, runpy
from typing import Annotated

HERE = os.path.dirname(os.path.abspath(__file__))
ns = runpy.run_path(os.path.join(HERE, "45.1-minikernel.py"), run_name="minikernel_lib")
MiniKernel, kernel_function = ns["MiniKernel"], ns["kernel_function"]
handle_model_text, MathPlugin = ns["handle_model_text"], ns["MathPlugin"]

kernel = MiniKernel()
kernel.add_plugin(MathPlugin(), "math")
add_schema = kernel.schema("math-add")
divide_schema = kernel.schema("math-divide")

reply = '{"function": "math-add", "arguments": {"num1": "5", "num2": "3"}}'
result = handle_model_text(kernel, reply)

errors = {}
try:
    kernel.invoke("math-add", {"num1": "5"})
except ValueError as e:
    errors["missing_argument"] = str(e)
try:
    kernel.invoke("math-divide", {"num1": "10", "num2": "0"})
except ZeroDivisionError as e:
    errors["divide_by_zero"] = str(e)

# Schema size versus number of plugin functions (characters of compact JSON, not tokens).
def make_plugin(n):
    ns_ = {}
    for i in range(n):
        def op(self, num1: Annotated[float, "first number"],
               num2: Annotated[float, "second number"]) -> float:
            return num1 + num2
        op.__name__ = f"op{i}"
        ns_[f"op{i}"] = kernel_function(description="Adds two numbers together")(op)
    return type("Plugin", (), ns_)()

sizes = {}
for n in [1, 2, 4, 8, 16]:
    k = MiniKernel()
    k.add_plugin(make_plugin(n), "p")
    payload = [k.schema(key) for key in sorted(k._fns)]
    sizes[n] = len(json.dumps(payload, separators=(",", ":")))

data = {
    "add_schema": add_schema,
    "divide_schema_required": divide_schema["parameters"]["required"],
    "reply": reply,
    "coerced_num1": float("5"),
    "result": result,
    "errors": errors,
    "schema_chars_by_function_count": sizes,
    "chars_per_function": {n: round(sizes[n] / n, 1) for n in sizes},
}
with open(os.path.join(HERE, "45.1-data.json"), "w") as f:
    json.dump(data, f, indent=2)
print(json.dumps(data, indent=2))
