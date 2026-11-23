Graph RAG answers questions by following links between entities, not only by ranking text chunks by similarity. Lesson 42.1 stores facts in a property graph, where properties sit on nodes and edges, and checks candidate facts with a schema. In the hand-labelled test set, the schema caught all 11 structural errors and passed 3 false facts, so it is a type check, not a fact check. Lesson 42.2 covers Microsoft GraphRAG, which groups an entity graph into communities by maximising modularity. Greedy local moves can split a community in two, and Leiden's refinement step rules that out. GraphRAG then summarises each community and answers corpus-wide questions by mapping over the summaries and reducing the partial answers. Lesson 42.3 combines vector seeds with graph expansion under a context budget. On a synthetic graph at budget 40, two-hop expansion recovered 43.0% of gold nodes against 21.6% for vector search, but the gain depended on the graph carrying the relation and on the seeds being correct.

Key ideas:
- A property graph puts properties on nodes and on edges; an RDF triple has exactly three slots, so a "since" date has no place on the triple itself (42.1).
- A multi-hop question chains edges, so one false edge corrupts every answer that passes through it (42.1).
- A schema checks labels, property names and types, and endpoint labels. It cannot tell whether a well-typed fact is true (42.1).
- Modularity is $Q = \sum_c \left[ L_c/m - (K_c/2m)^2 \right]$; two triangles joined by one bridge score $5/14 \approx 0.3571$ (42.2).
- Greedy local moves maximise Q without checking connectivity, so a move can split a community while Q still rises (42.2).
- Leiden's refinement merges nodes only inside each community and only between well-connected pieces; Traag et al. (2019) prove that its communities are connected (42.2).
- GraphRAG answers a corpus-wide question by mapping over the community summaries and then reducing the partial answers (42.2).
- Hybrid retrieval picks seeds by vector similarity and expands along edges; the hop cap, the ordering and the budget decide what reaches the prompt (42.3).
- Compare methods at equal budgets, and check how many gold answers sit at each hop distance before expecting expansion to help (42.3).

## Before moving on

- [ ] I can state why a property graph can store "since 2019" on a relationship while an RDF triple cannot, without a workaround.
- [ ] I can explain why a schema check passes a well-typed false fact, and which provenance field lets me trace and remove it.
- [ ] I can compute modularity Q for a small partition by hand and check the result in NumPy.
- [ ] I can find a greedy move that disconnects a community, and explain why Q accepts it.
- [ ] I can name the three Leiden phases and say what refinement adds over Louvain's local moving.
- [ ] I can write a Cypher expansion that groups paths by node and returns the minimum hop distance.
- [ ] I can compare vector-only and hybrid retrieval at equal budgets, and say which hop distance the gain depends on.
