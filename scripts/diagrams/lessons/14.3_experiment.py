"""Experiment for lesson 14.3 (Pydantic V2). Produces every number used in the lesson.

Run: python scripts/diagrams/lessons/14.3_experiment.py
Writes: scripts/diagrams/lessons/14.3_data.json and prints a readable report.
Timings are machine-dependent; the JSON records the machine and interpreter.
"""
import json, platform, statistics, time
from typing import Annotated, Optional

import pydantic
import pydantic_core
from pydantic import BaseModel, ConfigDict, Field, ValidationError

out = {"versions": {"python": platform.python_version(), "machine": platform.machine(),
                    "pydantic": pydantic.VERSION, "pydantic_core": pydantic_core.__version__}}

# ---- 1. Main model and a valid input that arrives as strings (as JSON/HTTP would) ----
class Reading(BaseModel):
    sensor_id: str = Field(pattern=r"^S-\d{3}$")
    temperature_c: float = Field(ge=-273.15)
    count: int = Field(gt=0)

ok = Reading.model_validate({"sensor_id": "S-042", "temperature_c": "21.5", "count": "3"})
out["valid_repr"] = str(ok)
out["valid_types"] = {k: type(v).__name__ for k, v in ok.model_dump().items()}

# ---- 2. One record, three bad fields: are all errors collected? ----
bad = {"sensor_id": "X-1", "temperature_c": "hot", "count": 0}
try:
    Reading.model_validate(bad)
    out["bad_record"] = "NO ERROR (unexpected)"
except ValidationError as e:
    out["bad_record"] = {"error_count": e.error_count(),
                         "errors": [{"loc": list(x["loc"]), "type": x["type"], "msg": x["msg"]} for x in e.errors()],
                         "str": str(e)}

# ---- 3. Lax vs strict coercion for an int field and a float field ----
class LaxInt(BaseModel):
    n: int
class StrictInt(BaseModel):
    model_config = ConfigDict(strict=True)
    n: int
class LaxFloat(BaseModel):
    x: float
class StrictFloat(BaseModel):
    model_config = ConfigDict(strict=True)
    x: float

def attempt(model, field, value):
    try:
        v = getattr(model(**{field: value}), field)
        return {"ok": True, "value": repr(v), "type": type(v).__name__}
    except ValidationError as e:
        return {"ok": False, "type": e.errors()[0]["type"]}

int_inputs = [1, "1", 1.0, 1.5, "1.5", True, " 7 ", "abc", None]
out["coercion_int"] = [{"input": repr(v), "lax": attempt(LaxInt, "n", v), "strict": attempt(StrictInt, "n", v)}
                       for v in int_inputs]
float_inputs = [3, "999.99", "1e3", "nan", "abc"]
out["coercion_float"] = [{"input": repr(v), "lax": attempt(LaxFloat, "x", v), "strict": attempt(StrictFloat, "x", v)}
                         for v in float_inputs]

# ---- 4. Optional[int] without a default is still required ----
class OptNoDefault(BaseModel):
    age: Optional[int]
class OptWithDefault(BaseModel):
    age: Optional[int] = None
out["optional_no_default_missing"] = attempt_missing = None
try:
    OptNoDefault()
    out["optional_no_default_missing"] = "accepted"
except ValidationError as e:
    out["optional_no_default_missing"] = {"type": e.errors()[0]["type"], "loc": list(e.errors()[0]["loc"])}
out["optional_with_default_missing"] = repr(OptWithDefault().age)

# ---- 5. Where does validation run? Validator class and schema build cost ----
out["validator_class"] = f"{type(Reading.__pydantic_validator__).__module__}.{type(Reading.__pydantic_validator__).__name__}"

def median_time(fn, repeat=7):
    ts = []
    for _ in range(repeat):
        t0 = time.perf_counter(); fn(); ts.append(time.perf_counter() - t0)
    return statistics.median(ts)

def define_class():
    class Tmp(BaseModel):
        sensor_id: str = Field(pattern=r"^S-\d{3}$")
        temperature_c: float = Field(ge=-273.15)
        count: int = Field(gt=0)
    return Tmp
out["class_definition_seconds"] = median_time(define_class, repeat=21)

# ---- 6. Per-record cost: hand-written Python vs model_validate(dict) vs model_validate_json(str) ----
import re
N = 100_000
records = [{"sensor_id": f"S-{i % 1000:03d}", "temperature_c": str(20.0 + (i % 50) / 10),
            "count": str(1 + i % 9)} for i in range(N)]
blobs = [json.dumps(r) for r in records]
pat = re.compile(r"^S-\d{3}$")

def handwritten(r):
    # Same coercions and checks as Reading, but raises on the first failure and returns a dict.
    s = r["sensor_id"]
    if not pat.match(s):
        raise ValueError("sensor_id")
    t = float(r["temperature_c"])
    if t < -273.15:
        raise ValueError("temperature_c")
    c = int(r["count"])
    if c <= 0:
        raise ValueError("count")
    return {"sensor_id": s, "temperature_c": t, "count": c}

def run_handwritten():
    for r in records:
        handwritten(r)
def run_dict():
    for r in records:
        Reading.model_validate(r)
def run_json():
    for b in blobs:
        Reading.model_validate_json(b)

# sanity: all records are valid, so no exceptions should have been raised
run_handwritten(); run_dict(); run_json()
bench = {}
for name, fn in [("handwritten_python", run_handwritten), ("pydantic_model_validate_dict", run_dict),
                 ("pydantic_model_validate_json", run_json)]:
    total = median_time(fn, repeat=5)
    bench[name] = {"us_per_record": round(total / N * 1e6, 3), "total_s_for_100k": round(total, 4)}
out["bench_records"] = N
out["bench"] = bench

with open(__file__.replace("_experiment.py", "_data.json"), "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(json.dumps(out, indent=2, ensure_ascii=False))
