## Chapter 22 Summary — Traditional NLP

## What You Learned

Chapter 22 covers three ways to turn text into numbers before neural networks. Statistical NLP counts words and word neighbours, using n-gram probabilities, TF-IDF weights and cosine similarity (Lesson 22.1). Word2vec learns dense word vectors by predicting context words with negative sampling, and you derived its gradient and trained it in NumPy (Lesson 22.2). GloVe fits the logarithm of co-occurrence counts, and a FastText-style model builds vectors from character n-grams so that it can handle words it never saw in training (Lesson 22.3). In each case the chapter checks the output by hand and in code, and it shows where the result depends on conventions, seeds or learning rates.

## Key Ideas

- An n-gram model estimates $P(w_2 \mid w_1) = c(w_1 w_2) / c(w_1)$; unseen pairs need smoothing, and add-one smoothing adds V to the denominator.
- TF-IDF weights a count by $\ln(N/\mathrm{df})$, so a word in every document gets weight 0.
- Cosine similarity compares direction and ignores vector length.
- Textbook idf and scikit-learn's smoothed idf give different numbers, so compare scores only within one convention.
- Skip-gram predicts context words from a centre word; CBOW predicts the centre word from its averaged context.
- Negative sampling replaces the full softmax with logistic regression on one true and K noise words, costing K + 1 dot products instead of V.
- The gradient for each score is $g = \sigma(s) - y$, applied to the other vector, with all gradients taken before the update.
- GloVe minimises a weighted squared error between $w_i^\top \tilde w_j + b_i + \tilde b_j$ and $\log X_{ij}$; the weight f caps frequent pairs at 1.
- Raw cosines of learned vectors are often near 1 because they share a mean direction; centre them before reading neighbours.
- Subword vectors can cover unseen words, but they generalise from spelling, not meaning.
- Results on toy corpora depend on learning rate and seed, so check several settings before trusting a neighbour list.

## Before Moving On

- [ ] I can compute TF-IDF weights and cosine similarity for a small corpus by hand, and say which idf convention a library uses.
- [ ] I can compute add-one and MLE bigram probabilities from counts, and explain why the MLE gives zero for an unseen pair.
- [ ] I can write the skip-gram and CBOW objectives and count the training pairs for a window radius.
- [ ] I can derive the negative-sampling gradient $g = \sigma(s) - y$ and apply one update by hand.
- [ ] I can explain why the 3/4 noise exponent and the $\log X_{ij}$ weighting are design choices, and state their assumptions.
- [ ] I can say why a high raw cosine does not show similarity, and why I would test several seeds before reading a result.
