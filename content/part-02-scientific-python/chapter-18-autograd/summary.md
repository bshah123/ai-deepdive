## Chapter 18 Summary: Autograd & Computational Graphs

### What you learned

Reverse-mode automatic differentiation (AD) records each primitive operation of the forward pass and then applies each operation's vector-Jacobian product (VJP) rule in reverse order. One backward sweep therefore gives the gradient of a scalar loss with respect to every parameter. You built a NumPy tape and checked its gradients against central finite differences, then traced a backward pass by hand on a small graph. Next you wrote a scalar engine in pure Python, with a `Value` class that stores a backward closure for each operation, and used it to train a multilayer perceptron (MLP) with 17 parameters. You checked the same function against PyTorch. Last, you wrote a custom `torch.autograd.Function` with its own backward, tested that backward with `gradcheck`, and used tensor hooks to read and change gradients as they arrive.

### Key ideas

- Reverse mode needs one sweep for a scalar output, however many inputs there are. Forward mode needs one sweep per input.
- A node's gradient is the sum of the contributions from all of its uses, so the backward rules must use `+=`, not `=`.
- A broadcast operand's gradient must be summed back to that operand's own shape.
- Visit nodes in reverse topological order, so each gradient is complete before it is passed on.
- Gradients accumulate in `.grad` across backward calls. Rebuild the graph each step, and zero the parameters' gradients before `backward()`.
- A central difference has a best step size near $\varepsilon^{1/3} \approx 6 \times 10^{-6}$ in double precision, a heuristic balance between truncation error and round-off.
- `torch.round` has a derivative of 0 almost everywhere, so it sends no learning signal. The straight-through estimator replaces that derivative with a heuristic.
- `gradcheck` compares a custom backward with finite differences in double precision. It should pass for a true derivative and is expected to fail for a straight-through estimator.
- A tensor hook's return value replaces the gradient. Returning `None` leaves it unchanged.

### Before moving on

- □ I can compute a small expression's gradient by hand with the chain rule, adding the contributions from every path.
- □ I can count the sweeps that reverse mode and forward mode need for a given number of inputs.
- □ I can write a backward rule that adds into each input's gradient with `+=`, and say what goes wrong with `=` when a node is used twice.
- □ I can undo broadcasting on a gradient and state the shape it must have.
- □ I can run a central-difference check and explain why a very small step size gives a larger error.
- □ I can write a custom `torch.autograd.Function` with `save_for_backward`, and a backward that returns one gradient per input.
- □ I can run `gradcheck` on a custom backward in float64, and say when a failure is expected.
- □ I can register a tensor hook, and say when `.grad` accumulates and when it needs `zero_()`.
