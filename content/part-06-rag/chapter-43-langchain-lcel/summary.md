## Chapter 43 Summary: LangChain LCEL

### What you learned

LangChain Expression Language (LCEL) joins components with the `|` operator into one runnable object, which has the same methods as its parts: `invoke`, `batch`, `stream` and their async twins. Lesson 43.1 showed how `|` builds a `RunnableSequence`, how a dictionary on the left becomes a `RunnableParallel`, and the two mistakes that break most chains: a prompt value used where a string is expected, and a `RunnableLambda` given a dictionary where it expects separate arguments. Lesson 43.2 covered parallel branches, which save time only when each branch waits without blocking the event loop, the chunks that `stream()` yields, and how `batch()` and `max_concurrency` set the number of calls in flight. Lesson 43.3 used traces, which are trees of runs that record inputs, outputs and timing, to find the first step whose output is wrong and the step with the largest self time, and to turn on LangSmith tracing through a callback handler.

### Key ideas

- A runnable exposes `invoke`, `batch`, `stream`, `ainvoke`, `abatch` and `astream`; a chain has the same interface as its parts.
- `a | b` calls `a.__or__(b)`, which returns a `RunnableSequence`; a dictionary on the left returns `NotImplemented` from `dict.__or__`, so Python calls `b.__ror__` and the dictionary is coerced to a `RunnableParallel`.
- Each step receives exactly the previous step's output. A prompt template returns a `StringPromptValue`, so call `.to_string()` before you format it into a string.
- `RunnableLambda` passes its whole input as one argument. Unpack a dictionary inside the function.
- `RunnableParallel` branches cannot read each other's outputs; use `|` to pass one step's output to the next.
- Parallel branches take about as long as the slowest branch in `invoke` (thread pool) and `ainvoke` (asyncio), but a `time.sleep` inside an `async def` runs the branches one after another.
- `stream()` yields one single-key dictionary per chunk, in arrival order. A plain function yields one chunk; a generator yields one chunk per `yield`.
- `batch()` and `abatch()` parallelise over inputs, so `RunnableParallel(...).batch(xs)` makes branches × inputs step calls. Outputs keep the input order.
- `max_concurrency` limits `invoke` and `batch`, but not `RunnableParallel.ainvoke`; a rate limit on that path needs your own semaphore.
- A trace is a tree of runs. Total time includes children; self time does not. Rank steps by self time when you look for slow ones.
- For a wrong answer, read the trace from the top down and stop at the first run whose output is wrong for its input. A fluent final answer does not show that an early step failed.
- LangSmith tracing is switched on with `LANGSMITH_TRACING=true` and an API key. Hide inputs and outputs before you trace real users, because traces store the text that flows through the chain.
- The chapter used two LangChain versions: `langchain-core` 0.3.86 for Lessons 43.1 and 43.2, and 1.8.4 for Lesson 43.3.

### Before moving on

- □ I can predict what `RunnableLambda(f).batch(xs)` returns, including the output order, and say why `batch` calls `invoke` once per input.
- □ I can say what `{"k": f} | g` builds, and what `g` receives as its input.
- □ I can name the type each step returns in a prompt-to-model chain, and fix a bug where a prompt value is formatted as a string.
- □ I can convert a function that takes a dictionary into one that takes separate arguments with `RunnableLambda(lambda d: f(d["a"], d["b"]))`.
- □ I can estimate the wall-clock time of a `RunnableParallel` from its slowest branch, and say when a blocking call inside `async def` removes the gain.
- □ I can predict how many chunks `stream()` yields for a plain function and for a generator, and merge the chunks by key.
- □ I can count the step calls for `RunnableParallel` over n inputs, and say whether `max_concurrency` limits `invoke` or `ainvoke` for that case.
- □ I can compute the self time of each run in a trace from the totals of its children, and rank the runs by self time.
- □ I can read a trace from the top down and name the first run whose output is wrong.
