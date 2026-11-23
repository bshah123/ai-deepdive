## Chapter 48 Summary — Agent Architectures

### What you learned

An agent is a model inside a loop: it writes a step, a parser turns the step into a call, and the result goes back into the prompt. This chapter built three control patterns and measured each one in a toy setting with stated assumptions. The ReAct loop (Lesson 48.1) alternates a thought, a tool action and an observation, and the transcript is the model's only memory. Plan-and-solve (Lesson 48.2) writes the whole plan first as a dependency graph, so independent steps can run together and a flat plan's success falls as $p^n$. Evaluator-optimizer loops with reflection memory (Lesson 48.3) add a judge that accepts or rejects each attempt; with a leaky judge, the precision of an accepted answer caps the gain. The numbers come from a scripted stand-in model, from invented catalogue and revenue data, and from assumed probabilities. None of them is a benchmark result, and the cited papers report their own results, which this chapter did not reproduce.

### Key ideas

- The model sees only the transcript, so an observation that is not in the prompt does not exist for the model (Lesson 48.1).
- Each ReAct step re-reads the whole transcript. In the toy catalogue, total words read grow from 130 at 2 lamps to 10,900 at 32 lamps.
- A parse-error observation that lets the loop retry keeps success at 0.81 at slip rate 0.3, against 0.18 for a loop that stops on the first error (toy model, Lesson 48.1).
- A plan is a dependency graph. A step can run once every id in its `needs` has finished, so the 11-step example needs 4 rounds rather than 11 sequential calls (Lesson 48.2).
- Check a plan's structure before running it: every `needs` id must exist and the graph must have no cycles.
- A flat plan of $n$ independent steps with per-step success $p$ succeeds with probability $p^n$. Checkpoints with retries recover most of the loss, but only if attempts are independent and the verifier is perfect.
- For a judge with true-accept rate $t$ and false-accept rate $f$, one attempt is accepted with probability $a = pt + (1-p)f$, and the accepted answers are correct with precision $pt/a$ (Lesson 48.3).
- With $K$ attempts, output accuracy is $pt/a + (1-a)^{K-1}[p(1-t) - (1-a)pt/a]$. It rises towards $pt/a$ when $f < t$ and falls towards it when $f > t$.
- The share of accepted answers that are wrong stays at $(1-p)f/a$ for any $K$. More attempts add accepted wrong answers in proportion to how many items are accepted.
- A reflection memory helps only through the gain from a useful note. Both the probability that a note is useful and the gain it brings are assumptions in this chapter, not measurements.
- Intrinsic self-correction without external feedback is not reliably helpful (Huang et al., 2023), so the judge is the component to test first.

### Before moving on

- □ I can trace a ReAct episode by hand, and count the prompt words read at each step.
- □ I can say what changes when observations are removed from the transcript, and why the loop then fails.
- □ I can write a parse-and-dispatch loop with a step budget and an error observation for unparseable output.
- □ I can turn a plan's `needs` lists into dependency rounds with `graphlib.TopologicalSorter`, and reject unknown ids.
- □ I can compute $p^n$ for a flat plan and the success of a checkpointed plan with retries, and state the independence assumption each one needs.
- □ I can compute $a$, the precision $pt/a$, and the $K$-attempt output accuracy from $p$, $t$ and $f$ by hand.
- □ I can predict whether more attempts help or hurt, from whether $f$ is below or above $t$.
- □ I can simulate an evaluator-optimizer loop with NumPy and check it against the formula, and I can say which fallback rule the formula assumes.
