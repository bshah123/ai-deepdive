## Chapter 21 Summary — Neural Networks

### What you learned

A single perceptron draws one line, so XOR needs a hidden layer. You built a small multilayer perceptron with backpropagation, saw why activation functions and depth interact with gradients, compared optimisers on the same problems, and proved the perceptron convergence bound.

### Key ideas

- A perceptron computes a weighted sum and a threshold, so it draws one line; XOR is not linearly separable.
- A hidden layer maps the inputs into a space where XOR is separable.
- Backpropagation is the chain rule applied layer by layer; a finite-difference check agreed to about $3 \times 10^{-11}$.
- Training success depends on the random start: with two hidden units 26 of 40 seeds reached XOR, against 40 of 40 for four or more.
- Stacked linear layers without a nonlinearity collapse to one linear map.
- Backpropagation multiplies one slope per layer. Sigmoid's slope is at most 0.25, so its gradients vanish with depth; ReLU kept gradients between 0.3 and 0.5 in our run.
- SwiGLU gates one linear branch with a SiLU branch and uses three matrices, with the hidden width scaled by 2/3.
- Each optimiser keeps a different memory: none (SGD), a velocity (momentum), a squared-gradient average (RMSprop), or two averages with decoupled decay (AdamW).
- On a bowl with curvature 100, SGD needs a step below 0.02 to converge; momentum needs about a third of its steps.
- The perceptron learning rule converges in at most $(R/\gamma)^2$ updates when the data are separable with margin $\gamma$ and radius $R$; the bound is worst-case and needs separability.

### Before moving on

- □ I can explain why XOR needs a hidden layer, and construct one by hand.
- □ I can derive the gradient for a two-layer network and check it numerically.
- □ I can explain vanishing gradients with a sigmoid stack and compare ReLU.
- □ I can state the update rule of each optimiser and what it remembers.
- □ I can state Novikoff's bound and say which assumption it needs.
