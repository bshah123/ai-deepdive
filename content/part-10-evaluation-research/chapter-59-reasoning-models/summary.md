Chapter 59 covers how reasoning models spend computation. Lesson 59.1 shows why writing intermediate steps lets a fixed-depth model handle longer problems, and why majority voting over sampled chains helps only when the correct answer is more likely than any single wrong one. Lesson 59.2 compares three ways to spend a fixed budget of generator calls at test time: best-of-N with an outcome reward, beam search with a process reward, and Monte Carlo tree search (MCTS) with UCB1 selection. Lesson 59.3 separates what OpenAI (o1) and DeepSeek (R1) have disclosed from what they have not, and derives the group-relative advantage used by GRPO (group relative policy optimization). All the numerical results come from toy simulations with stated assumptions, not from trained language models.

Key ideas:

- A direct answer gets one pass of sequential computation; a written chain gets one round of computation per written step.
- In the toy model, a direct answerer that can compose only two maps falls to chance (1/7) once the chain is 4 steps long, while an ideal chain stays at 1.0.
- With 2% error per written state, accuracy falls gradually with chain length (0.983 at n = 1, 0.599 at n = 32), because a wrong state stays wrong through every later map.
- Plurality voting over k sampled chains helps only when the correct answer is more likely than any single wrong answer, which in the toy means q > 1/7.
- With a perfect outcome verifier, best-of-N at D = 4 steps and budget 16 succeeds with probability 1 - 0.9375^4 = 0.2275.
- Process rewards let beam search prune partial chains early. In the toy at sigma 0.5, beam search beat MCTS and outcome best-of-N at budgets 64 and 128, while MCTS led at budgets 16 and 32.
- In MCTS, the final answer rule matters: following the highest mean value beat following the most-visited child in the toy.
- OpenAI's o1 post discloses reinforcement learning (RL) on the chain of thought and a hidden raw chain. It does not disclose the architecture or any inference-time search.
- DeepSeek-R1-Zero applies GRPO to a base model with rule-based accuracy and format rewards. The full R1 adds supervised fine-tuning stages around the same RL step.
- GRPO replaces PPO's learned value model with the mean and standard deviation of a group of sampled answers. In a one-prompt toy, the group-mean baseline is biased by (G - 1)/G.

Before moving on:

- [ ] I can explain why a fixed-depth direct answer fails on a chain of dependent steps, and why writing the steps fixes it.
- [ ] I can compute the success probability of best-of-N from the per-chain success probability and the budget.
- [ ] I can state the condition under which majority voting over chains helps, and say why it depends on the independence assumption.
- [ ] I can compute a UCB1 score from visit counts and total rewards, and explain what the exploration term does.
- [ ] I can compute GRPO advantages for a group of rewards by hand, including the all-equal case.
- [ ] I can separate what OpenAI and DeepSeek have published about their reasoning models from what they have not.
