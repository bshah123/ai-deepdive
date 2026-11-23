## What you learned

Chapter 28 covers how large language models are trained at scale. You learned to turn a training run into a compute budget, $C \approx 6ND$ floating-point operations (FLOPs) for $N$ parameters and $D$ tokens, and to read the Chinchilla fit for the compute-optimal split between parameters and tokens. You learned to count the memory that Adam-based training needs and how data parallelism, the ZeRO sharding stages and pipeline parallelism divide it. You then turned preference comparisons into a reward model with PPO, or directly into a policy with DPO, and computed GRPO's group-relative advantages to see why that method needs no critic.

## Key ideas

- A training run costs about $C \approx 6ND$ FLOPs (Lesson 28.1).
- Hoffmann et al.'s fit $L = E + A/N^{0.34} + B/D^{0.28}$ has a minimum over $N$ at a fixed budget. The compute-optimal exponents are about 0.46 for parameters and 0.54 for tokens, using rounded constants (Lesson 28.1).
- Mixed-precision Adam needs 16 bytes per parameter before activations, so a 7.5B-parameter model needs 120 GB per GPU under DDP (Lesson 28.2).
- DDP replicates the model state and reduces time per step, not memory. ZeRO stages 1, 2 and 3 shard the state to 31.4, 16.6 and 1.9 GB per GPU for that model on 64 GPUs (Lesson 28.2).
- ZeRO-3 sends 1.5 times the communication volume of DDP (Lesson 28.2).
- Pipeline parallelism with $M$ micro-batches over $K$ balanced stages leaves a fraction $(K-1)/(M+K-1)$ of device time idle (Lesson 28.2).
- SFT minimises the negative log-probability of demonstrations, so it cannot rank two correct answers (Lesson 28.3).
- The Bradley-Terry model turns a reward gap into a win probability, $\sigma(r_w - r_l)$. The KL-regularised RLHF optimum is $\pi^* \propto \pi_{\text{ref}}\, e^{r/\beta}$ (Lesson 28.3).
- DPO trains on fixed preference pairs with no reward model. In the toy problem its optimum matches the reward-model route to floating-point precision (Lesson 28.3).
- GRPO normalises each answer's reward by its group's mean and standard deviation. A group in which every reward is equal gives zero policy gradient (Lesson 28.4).
- Dividing by the standard deviation weights each question by $1/\sqrt{p(1-p)}$, which favours very hard and very easy questions (Lesson 28.4).
- The GRPO and DPO experiments use tabular toy policies. They check mechanisms and do not show reasoning gains in language models (Lessons 28.3 and 28.4).

## Before moving on

- [ ] I can convert a parameter count and a token count into training FLOPs with $C \approx 6ND$, and say which numbers in Lesson 28.1 are predictions and which are reported measurements.
- [ ] I can compute the per-GPU model-state memory under DDP and ZeRO-1, 2 and 3 for a given parameter count and GPU count.
- [ ] I can compute the GPipe bubble fraction for given $K$ and $M$, and say how many micro-batches reach a target idle fraction.
- [ ] I can write the DPO loss with the reference log-ratio, and explain why its value at initialisation is $\log 2$.
- [ ] I can compute GRPO advantages by hand for a binary reward group, with and without the $\varepsilon$ guard.
