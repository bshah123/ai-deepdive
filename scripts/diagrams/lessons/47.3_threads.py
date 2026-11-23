import time
from concurrent.futures import ThreadPoolExecutor

def tool(name, seconds):
    time.sleep(seconds)              # stands in for a network call
    return f"{name} finished"

calls = [("get_weather", 0.9), ("search_flights", 1.4), ("search_hotels", 1.1)]

t0 = time.perf_counter()
for name, s in calls:
    tool(name, s)
print(f"sequential: {time.perf_counter() - t0:.1f} s")

t0 = time.perf_counter()
with ThreadPoolExecutor() as ex:
    futures = [ex.submit(tool, name, s) for name, s in calls]
    outputs = [f.result() for f in futures]   # results come back in request order
print(f"threaded:   {time.perf_counter() - t0:.1f} s")
print(outputs)
