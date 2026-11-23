## Chapter 32 Summary: LLM Optimization & Quantization

### What you learned

Quantization stores a model's weights in fewer bits and turns them back into numbers only when computing. You worked out how a scale $s$ and a zero-point $z$ map real values onto integer codes, and how rounding error follows from the step size: its mean square is about $s^2/12$ when the grid is fine relative to the data. Granularity sets how much range each scale must cover, and one outlier value can coarsen the grid for all the others. You then compared post-training quantization (PTQ) methods on one synthetic layer: round-to-nearest (RTN), an activation-aware scale search (AWQ-style), a second-order error-correction loop (GPTQ-style), and SmoothQuant, which moves activation outliers into the weights so that 8-bit activations work. Last, you read the GGUF file layout used by llama.cpp (a 24-byte header, metadata, a tensor table and aligned data), computed the 4.5 bits per weight of the Q4_0 block format, and checked that its integer dot product equals dequantize-then-multiply. Every error number in this chapter comes from synthetic data, so the numbers show mechanisms, not model quality.

### Key ideas

- FP16 (16-bit floating point) overflows above 65,504; BF16 (bfloat16) keeps FP32's exponent range with 7 mantissa bits.
- The affine map is $q = \operatorname{round}(x/s) + z$ and $\hat{x} = s(q - z)$, with rounding error at most $s/2$ inside the range.
- The zero-point is an integer and the range always contains 0.0, so zero padding and ReLU outputs decode exactly.
- Finer scale groups help most at low bit widths: on the synthetic matrix, per-tensor INT4 output error was 26.0% and per-group-128 was 9.8%.
- One value of 60 among 4,096 values made the INT8 step 8.8 times larger and cut the codes used by the other values from 205 to 28.
- A layer's quantization error is weighted by activation size, so a few outlier input channels dominate $XW$.
- AWQ-style scaling multiplies salient input channels before rounding and divides the activations by the same factor; the exponent is chosen on calibration tokens only, and $\alpha = 0$ is plain RTN.
- GPTQ-style correction needs correlated inputs and enough calibration tokens; with uncorrelated inputs and 256 tokens it was worse than RTN (0.1120 against 0.0972).
- SmoothQuant divides activations by $s_j$ and multiplies the matching weight rows by $s_j$; the reverse direction raised the seed-0 W8A8 error from 0.014 to 0.234.
- A GGUF tensor offset is relative to the start of tensor data, which is the first multiple of the alignment (32 by default) after the tensor table.
- Q4_0 stores 32 weights as one FP16 scale and 16 bytes of 4-bit levels: 18 bytes, or 4.5 bits per weight. The scale is $d = w_{\max}/-8$ and the rebuilt value is $(q - 8)\,d$.
- The Q4_0 integer dot product is exact within each block, and only the scale multiplications round. The llama.cpp build documentation says Metal is enabled by default on macOS.

### Before moving on

- □ I can compute the scale, zero-point, codes and dequantized values of an affine quantizer by hand, and check the error bound $s/2$.
- □ I can explain why one outlier coarsens the grid, and how per-tensor, per-channel and per-group scales change that.
- □ I can convert bits per weight into gigabytes for a given parameter count, including the scale overhead.
- □ I can explain why the AWQ-style search reduces to RTN at $\alpha = 0$, and why $\alpha$ must be chosen on calibration data.
- □ I can state when the GPTQ-style correction reduces to RTN and why it needs enough calibration tokens.
- □ I can apply the SmoothQuant transform in the correct direction and explain why the reverse direction hurts W8A8.
- □ I can read a GGUF header and tensor table, and compute the data start from the alignment.
- □ I can compute the size of a Q4_0 block, its bits per weight, and the values rebuilt from its levels and scale.
