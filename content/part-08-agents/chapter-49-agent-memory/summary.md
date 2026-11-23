## Chapter 49 Summary: Agent Memory

### What you learned

An LLM keeps no state between calls, so an agent must manage three kinds of memory itself. Re-sending the full history makes the total input grow quadratically with the number of turns; a sliding window bounds each prompt but forgets whole messages; a rolling summary bounds the prompt but loses detail at every fold. Facts that must survive belong outside the context window: a vector store of embeddings, searched by cosine similarity and ranked by recency, importance and relevance, with an explicit write step that adds, updates or skips. For structured facts about people and places, a triple store with supersession keeps one live value per functional relation, and hop-limited retrieval with a fact budget decides what reaches the prompt. Each mechanism was measured on small synthetic or hand-checked examples, and the lessons say where those measurements stop applying.

### Key ideas

- Re-sending the full history makes total input over a conversation grow as $\mu N(N+1)/2$, which is quadratic in the number of turns $N$.
- A sliding window caps each prompt at $B$ words, so total input is at most $BN$, but it forgets the dropped messages completely.
- A rolling summary's fold keeps a share $\rho$ per round, so a fact's survival after $k$ rounds is about $\rho^k$ under a position-blind stub.
- Identifiers, numbers and version strings are the first things a summary rewrites; keep them verbatim in a separate store.
- Cosine compares direction and ignores length; a dot product on unnormalised vectors ranks long vectors first.
- Park et al. (2023) sum three min-max normalised scores with equal weights; with timeless facts, the weights decide what wins.
- No single cosine threshold separated same-fact and different-fact pairs in our nine-pair test, so writes need a richer decision, such as Mem0's LLM choice of ADD, UPDATE, DELETE or NOOP.
- Recall depends on the embedding: a word-overlap stand-in found word-sharing queries and missed paraphrases.
- In a triple store, a functional relation (one live value, such as home city) must be declared by the designer; superseded facts stay in storage but leave retrieval.
- With a fact budget and shallow-first ordering, deep facts are dropped silently; the one-hop and two-hop results were identical at a budget of 20.
- String similarity for entity resolution trades recall for false merges: the thresholds that avoided every hard false merge missed at least a quarter of the name variants.

### Before moving on

- □ I can compute the sliding-window contents at a given turn by hand, and say which messages are dropped and why.
- □ I can estimate total input over a conversation with no compression, and say why it grows quadratically.
- □ I can explain why a rolling summary compounds loss, and compute $\rho^k$ for a given keep ratio and number of rounds.
- □ I can compute cosine similarity for two vectors by hand and explain why it differs from a raw dot product.
- □ I can explain how the three terms of the Park et al. score are normalised and combined, and check whether timeless facts dominate a ranking.
- □ I can compare two dedup thresholds on labelled pairs and name the trade-off between missed duplicates and wrong merges.
- □ I can trace supersession in a triple store and state which facts a one-hop query returns.
- □ I can compute the `difflib` ratio $2M/T$ for two normalised names and decide whether a threshold merges them.
