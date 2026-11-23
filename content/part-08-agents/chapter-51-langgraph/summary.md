## What you learned

This chapter treated LangGraph as a graph of functions that update a shared state. You declared a state schema with reducers, built a `StateGraph` from nodes and edges, and traced each run by hand in supersteps. You then used conditional edges to choose the next node, a cycle to retry until a check passes, and a compiled graph nested as a subgraph through a wrapper node. Last, you paused a run with `interrupt()` for a human decision, resumed it on the same thread with a checkpointer, and forked from an earlier checkpoint to test another branch. The trap that runs through all three lessons is that a paused node runs again from its first line on resume.

## Key ideas

- A state schema defines the keys; each node returns a partial update that touches only the keys it returns.
- A key with no reducer is overwritten (last write wins); `Annotated[list, operator.add]` appends.
- A superstep runs every scheduled node against the same snapshot, then applies their writes together.
- Two nodes writing one key with no reducer in the same superstep raise `InvalidUpdateError` in langgraph 1.2.24.
- A conditional edge calls a path function, and the path map turns its returned key into a node name or `END`.
- An unmapped key from the path function raises `KeyError` at run time, not at compile time.
- A cycle is safe only if some path reaches `END`; the recursion limit is a backstop that counts supersteps.
- A subgraph is a compiled graph with its own schema, and only the wrapper node maps keys across the boundary.
- `interrupt()` pauses a node, and `Command(resume=...)` returns the answer on the same thread ID.
- Side effects placed before `interrupt()` run again on every resume, so move them after the pause or make them idempotent.
- A checkpointer saves state per thread; `update_state` forks a new branch and leaves the original history in place.
- An in-memory checkpointer does not survive a process restart, so use a persistent one for long pauses.

## Before moving on

- [ ] Given a state schema and node functions, I can say which keys each node writes and which reducer combines each key.
- [ ] I can trace a graph's supersteps on paper and predict its final state before running it.
- [ ] I can write a conditional edge with a path map, and check that every value the path function returns is mapped.
- [ ] I can build a bounded retry loop and explain what the recursion limit counts.
- [ ] I can wrap a compiled subgraph in a node that maps keys in and out.
- [ ] I can pause a run with `interrupt()`, resume it on the same thread ID, and move side effects after the pause.
- [ ] I can fork a run from an earlier checkpoint with `update_state` and explain why the original branch survives.
