## Chapter 19 Summary — Machine Learning Foundations

### What you learned

Supervised learning chooses a hypothesis that minimises risk on data you can see, while what you care about is risk on data you cannot. You learned loss functions, the bias–variance trade-off with regularisation, concentration inequalities that bound the gap between the two, PAC learning with VC dimension, and energy-based models.

### Key ideas

- A supervised problem has a distribution $D$, a hypothesis class $\mathcal{H}$ and a loss $\ell$. True risk averages the loss over $D$, which is unknown.
- Empirical risk averages the loss over a sample; empirical risk minimisation returns the minimiser of that sample risk.
- Training risk falls as the model grows, but true risk is U-shaped; low training risk alone is not evidence of a good model.
- The output type picks the loss: MSE for regression, binary cross-entropy for one sigmoid output, cross-entropy for softmax outputs.
- Cross-entropy equals entropy plus KL divergence, so minimising it with one-hot labels minimises KL divergence.
- Expected squared test error is noise plus squared bias plus variance.
- Ridge (L2) shrinks every coefficient; lasso (L1) can set coefficients to exactly zero.
- Markov needs only a non-negative mean; Chebyshev uses the variance; Hoeffding needs bounded independent values and decays as $e^{-2n\epsilon^2}$.
- For a finite class, the union bound adds $\ln|\mathcal{H}|$ to the sample size needed.
- PAC learning: with probability at least $1-\delta$ the learner's true risk is at most $\epsilon$. VC dimension is the largest set the class can shatter.
- Energy-based models score pairs with an unnormalised energy; their training can collapse if only true-class energies are pushed down.

### Before moving on

- □ I can separate true risk from empirical risk and say what ERM optimises.
- □ I can pick the loss that matches a model's output layer.
- □ I can explain the bias–variance decomposition and where regularisation sits in it.
- □ I can choose between Markov, Chebyshev and Hoeffding for a bound.
- □ I can state the PAC sample-size bound for a finite hypothesis class.
- □ I can explain why training energy-based models needs negative samples.
