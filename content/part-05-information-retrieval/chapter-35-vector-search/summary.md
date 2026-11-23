## What you learned

Vector search returns the stored embeddings nearest to a query. Exact (flat) search compares the query with every stored vector, so it is always correct and its work grows linearly with N. Approximate indexes skip most of the database. IVF scans only the nprobe nearest k-means cells. IVF-PQ also compresses each vector to a few bytes and scores it with asymmetric distance tables. HNSW walks a layered proximity graph. Every approximate index trades recall@k against work, and the trade-off depends on the data as well as on the index settings. Production vector databases add metadata filters, sharding, deletes and memory limits, and each of these can change the returned results, not only the speed. The numbers in this chapter come from small synthetic experiments, so the lessons teach how to measure the trade-off on your own queries rather than which product to choose.

## Key ideas

- Flat search computes N squared distances per query, has recall 1, and its cost grows linearly with N (Lesson 35.1).
- Recall@k is the fraction of the true k nearest neighbours that the search returns. It ignores order, and it depends on both the index setting and the data (Lesson 35.1).
- IVF runs k-means to form cells, then scans only nprobe cells per query. A true neighbour in an unprobed cell is never seen (Lesson 35.1).
- Product quantization splits d dimensions into m sub-vectors and stores each as a one-byte codeword index. With d = 32 and m = 8, a vector shrinks from 128 bytes to 8 bytes (Lesson 35.2).
- Asymmetric distance computation (ADC) keeps the query at full precision. It builds a table of squared distances to the codewords, then adds one entry per sub-space (Lesson 35.2).
- IVF-PQ encodes residuals x minus c, where c is the cell centre. The ADC table must be rebuilt for every probed cell, because it depends on r = q minus c (Lesson 35.2).
- IVF-PQ recall loss has two sources: true neighbours in unprobed cells, and error from PQ. Measure them separately (Lesson 35.2).
- HNSW draws each node's top layer so that the probability of reaching layer j is M to the power minus j. A search descends greedily through the upper layers, then runs a best-first search on layer 0 with list length ef (Lesson 35.3).
- Compare approximate settings at matched cost, not at matched parameter values. Distance-call counts and scanned fractions do not depend on the machine, but wall-clock time does (Lessons 35.1 and 35.3).
- A post-filter applied after an approximate search can return far fewer than k rows. In-scan filtering fills the list but can still miss matches in unprobed cells (Lesson 35.4).
- A sharded top-k merge is exact only when each shard returns at least k candidates (Lesson 35.4).
- Deleted rows behave like filters until a rebuild or compaction removes them (Lesson 35.4).
- Raw vector memory is N times d times bytes per dimension, and it is the floor. For 10 million vectors of 768 float32 dimensions, that is 30.72 GB, and int8 storage reduces it to 7.68 GB (Lesson 35.4).

## Before moving on

- [ ] I can compute squared Euclidean distances for a small set by hand and name the exact top-k.
- [ ] I can state recall@k against exact search and say which index setting and dataset it describes.
- [ ] I can explain how IVF forms cells, how nprobe controls the work, and why a neighbour can be missed.
- [ ] I can compress a vector with PQ and compute an ADC distance from a table by hand, including the residual step.
- [ ] I can trace a greedy walk on a small graph and explain the roles of M, ef and the layers in HNSW.
- [ ] I can check whether a filter, a shard merge or a set of tombstoned deletes still returns k live results.
- [ ] I can estimate raw vector memory from N, d and the bytes per dimension.
