## What you learned

A bi-encoder encodes a query and each document separately into a unit-length vector, using mean pooling over real tokens under the attention mask, and ranks documents by cosine similarity. For unit vectors this is a dot product, so the document vectors can be computed once and cached. Contrastive training with InfoNCE treats the other documents in a batch as free negatives: each row of the batch similarity matrix is a softmax cross-entropy whose correct class is the query's own document. Batch size and temperature change how many negatives there are and how sharp the softmax is, and the best temperature must be tuned. Matryoshka Representation Learning (MRL) trains one vector so that each prefix of its coordinates works as a smaller embedding, by summing one loss per prefix. In our synthetic toy, MRL beats cutting a standard embedding at small sizes. The architecture sets the cost of retrieval, and the training sets its quality; a weak encoder can lose to plain word overlap.

## Key ideas

- A cross-encoder reads query and document together, which is more accurate but costs one encoder pass per pair; a bi-encoder encodes each side once, so document vectors can be cached.
- Mean pooling averages the vectors of real tokens under the attention mask and then normalises to unit length; without the mask, padding rows change the result.
- For unit vectors, cosine similarity equals the dot product, so retrieval over a corpus is one matrix-vector product.
- InfoNCE is the softmax cross-entropy over one row of a B-by-B similarity matrix whose diagonal holds the positives; B pairs give B(B − 1) negatives.
- Dividing similarities by the temperature τ sets how sharply the softmax favours the best candidate. The sentence-transformers `MultipleNegativesRankingLoss` default scale of 20 is τ = 0.05, but in our sweep τ = 0.2 did best.
- Duplicate documents in one batch count as false negatives, which sets a loss floor of log 2.
- MRL puts a separate head and loss on each prefix and sums them. Cutting a standard embedding has no such guarantee, and the ranking can flip.
- Normalise each prefix before comparing it, and choose the prefix size on your own data.

## Before moving on

- □ I can compute a masked mean-pooled vector and the unmasked one, and say which padding rows change the result.
- □ I can explain why a bi-encoder can cache document vectors and a cross-encoder cannot.
- □ I can compute the InfoNCE loss for one query from its similarities and a temperature, and state the gradient $(P - I)/B$ with respect to the scaled logits.
- □ I can say how batch size and temperature change the negatives and the softmax, and why the best temperature must be tuned on validation data.
- □ I can compute the storage of a float32 index at full size and at a prefix size.
- □ I can explain why MRL needs one head per prefix, and why prefixes must be normalised before comparison.
