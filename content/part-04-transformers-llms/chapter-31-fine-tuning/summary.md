Chapter 31 covers parameter-efficient fine-tuning (PEFT), the family of methods that adapts a pretrained model by training a small number of new parameters. Lesson 31.1 derives LoRA (low-rank adaptation): the forward pass $y = W_0 x + s\,B(Ax)$ with $s = \alpha/r$, the zero initialisation of $B$, the gradients of $A$ and $B$, and the rank floor that limits what a rank-$r$ update can learn. Lesson 31.2 adds quantization: NF4 (NormalFloat4) places 16 codebook levels at normal quantiles, block-wise scales store the error locally, double quantization shrinks the scale overhead, and a QLoRA layer keeps the frozen base in 4 bits while training the adapters. Lesson 31.3 checks a LoRA layer against finite differences and shows how one frozen base model can serve many adapters in one batch, and when merging an adapter into the base is worth it. All NumPy code in the chapter was run here; the PyTorch and PEFT calls were checked against the PEFT guide and were not executed.

## Key ideas

- LoRA freezes $W_0$ and trains $A \in \mathbb{R}^{r \times d_{in}}$ and $B \in \mathbb{R}^{d_{out} \times r}$; the scale is $s = \alpha/r$.
- Trainable parameters fall from $d_{in} d_{out}$ to $r(d_{in} + d_{out})$; for a $4096 \times 4096$ layer at $r = 8$ that is 0.39%.
- Setting $B = 0$ makes the adapted layer equal the pretrained layer at step 0; setting both $A$ and $B$ to zero stops training entirely.
- At $B = 0$ the gradient with respect to $A$ is exactly zero, so $B$ moves first.
- The update $sBA$ has rank at most $r$, so no rank-$r$ update beats the truncated-SVD floor on the target, whatever the training method.
- Changing $r$ without changing $\alpha$ changes the update's scale; rsLoRA (rank-stabilised LoRA) uses $\alpha/\sqrt{r}$ instead.
- NF4 uses 16 levels at normal quantiles with one exact zero; it beat uniform 4-bit in all four synthetic settings, by 1.37 to 3.89 dB.
- Quantization error is local to a block: 64-value blocks scored 1.48 dB above 4096-value blocks on Gaussian data.
- Double quantization brings the scale overhead to 0.127 bits per parameter, a saving of 0.373 bits, about 3 GB for 65B parameters.
- In QLoRA the frozen weight is stored in 4 bits but dequantized to BF16 for the multiply, so 4-bit storage saves memory, not arithmetic.
- In a mixed batch, the base matmul is shared and each token gathers its own adapter; merging makes $K$ tasks cost $K$ full copies.

## Before moving on

- □ I can write the LoRA forward pass, give $s = \alpha/r$, and count the trainable parameters for a given $d_{in}$, $d_{out}$ and $r$.
- □ I can explain why $B = 0$ gives an exact no-op at step 0, and which gradient is zero at that step.
- □ I can state the rank floor for a target update and say why raising $r$ is the fix only when the floor is the limit.
- □ I can dequantize a four-weight NF4 block by hand: divide by the absmax scale, pick the nearest level, multiply back.
- □ I can compute bits per parameter with and without double quantization, and the memory saving for a given parameter count.
- □ I can say why a QLoRA matmul runs in BF16 and what 4-bit storage does and does not save.
- □ I can check a LoRA gradient against finite differences and explain a mismatch of 10⁻⁸ versus 10⁻¹.
- □ I can decide between merged and separate adapters from the memory arithmetic for $K$ tasks.
