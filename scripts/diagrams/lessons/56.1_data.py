"""Experiment behind lesson 56.1. Run with the venv that has opentelemetry-sdk 1.45.2:
   venv-56.1/bin/python scripts/diagrams/lessons/56.1_data.py
Writes 56.1_data.json next to this file (read by 56.1.mjs). Every number in the lesson comes from here."""
import contextvars, itertools, json, os, random
from contextlib import contextmanager
from dataclasses import dataclass, field
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased

# ---- part 1: toy tracer (stdlib), same code as the lesson's first block ----
ids = itertools.count(1)
clock_ms = [0.0]
current = contextvars.ContextVar("current_span", default=None)
finished = []

@dataclass
class Span:
    name: str
    trace_id: str
    span_id: str
    parent_id: str | None
    start_ms: float
    end_ms: float = 0.0
    attributes: dict = field(default_factory=dict)
    status: str = "OK"

@contextmanager
def start_span(name, trace_id=None, parent_id=None, attributes=None):
    local = current.get()
    if trace_id is None and local is not None:
        trace_id, parent_id = local.trace_id, local.span_id
    if trace_id is None:
        trace_id = f"{next(ids):032x}"
    span = Span(name, trace_id, f"{next(ids):016x}", parent_id, clock_ms[0], attributes=dict(attributes or {}))
    token = current.set(span)
    try:
        yield span
    except Exception as exc:
        span.status = f"ERROR: {exc}"
        raise
    finally:
        span.end_ms = clock_ms[0]
        finished.append(span)
        current.reset(token)

def advance(ms):
    clock_ms[0] += ms

def inject(span):
    return f"00-{span.trace_id}-{span.span_id}-01"

def extract(header):
    version, trace_id, parent_id, flags = header.split("-")
    return trace_id, parent_id

def retrieve(header):
    trace_id, parent_id = extract(header)
    with start_span("vector_search", trace_id, parent_id, {"db.system": "vector-store"}):
        advance(71)

def llm_call(step, input_tokens, output_tokens, ms):
    attrs = {"step": step, "gen_ai.request.model": "example-model",
             "gen_ai.usage.input_tokens": input_tokens, "gen_ai.usage.output_tokens": output_tokens}
    with start_span("llm_call", attributes=attrs):
        advance(ms)

def get_weather(city):
    with start_span("tool_call", attributes={"tool.name": "get_weather"}):
        advance(300)
        raise TimeoutError("weather API timed out after 300 ms")

def chat_request(question):
    with start_span("chat_request", attributes={"question_chars": len(question)}) as root:
        with start_span("embed_query", attributes={"model": "example-embedder"}):
            advance(38)
        retrieve(inject(root))
        llm_call(1, 1840, 64, 1000)
        try:
            get_weather("Roorkee")
        except TimeoutError:
            pass
        llm_call(2, 2310, 58, 1000)
        advance(1)

chat_request("What is the weather in Roorkee today?")
root = next(s for s in finished if s.parent_id is None)
total = root.end_ms - root.start_ms
llm_ms = sum(s.end_ms - s.start_ms for s in finished if s.name == "llm_call")
spans = [dict(name=s.name, trace_id=s.trace_id, span_id=s.span_id, parent_id=s.parent_id,
              start_ms=s.start_ms, end_ms=s.end_ms, status=s.status, attributes=s.attributes)
         for s in sorted(finished, key=lambda s: s.start_ms)]

# ---- part 2: real SDK head sampling, ratio 0.1, seeded ----
random.seed(0)
sampled_tracer = TracerProvider(sampler=ParentBased(TraceIdRatioBased(0.1))).get_tracer("s")
N = 10_000
kept = 0
for _ in range(N):
    s = sampled_tracer.start_span("root")
    kept += s.is_recording()
    s.end()

out = dict(spans=spans, header=inject(root), total_ms=total, llm_ms=llm_ms,
           llm_share=round(llm_ms / total, 4), n_spans=len(finished),
           sample_ratio=0.1, sample_kept=kept, sample_total=N)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "56.1_data.json"), "w"), indent=1)
print("total", total, "llm", llm_ms, "share", round(llm_ms / total, 4), "kept", kept, "of", N)
