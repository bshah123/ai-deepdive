## What you learned

A DSPy program is ordinary Python whose model calls are declared rather than hand-written. You state each step's inputs and outputs as a signature, call it through a module such as Predict, and the module renders the prompt, makes one model call and parses the reply back into named fields. ChainOfThought adds a reasoning field without changing the caller's code. Optimizers, called teleprompters, then fill a module's instructions and demonstrations from a training set and a metric. The lesson's stand-ins are scripted, so every number here measures the mechanism and not a real model's accuracy.

## Key ideas

- A signature such as `question -> answer` declares input and output fields, and its docstring becomes the instructions.
- A module renders a prompt from its signature, calls the model once, and parses the reply by field name. A missing output field raises an error.
- In the lesson's stand-in, Predict's only learnable part is its `demos` list. The full library's optimizers also rewrite instructions.
- ChainOfThought prepends one `reasoning` output field to the signature and keeps the same inputs and the same `.answer` access.
- Each model-calling module adds one call per input, and each demonstration adds prompt length (about 11.5 whitespace words per demonstration in the 46.1 renderer).
- A retry on format failure with per-attempt adherence p succeeds with probability 1 - (1 - p)^2, at an expected 1 + (1 - p) calls per request, under an independence assumption.
- A teleprompter keeps the teacher's traces that pass the metric. BootstrapFewShot stops after four demonstrations by default, as read from the DSPy source.
- MIPROv2 proposes instructions and searches over instruction and demonstration-set combinations, scored on minibatches.
- A winner chosen on a small minibatch overstates its accuracy (the winner's curse). A separate confirmation or test set that selection never touches gives the honest estimate.

## Before moving on

- □ I can write a signature for a task and say what prompt text a Predict module renders from it.
- □ I can explain what a missing output field does and why a loose text split is the wrong fix.
- □ I can state what ChainOfThought changes (the signature) and what it leaves alone (the caller).
- □ I can count the model calls per input for a multi-module program and multiply by the dataset size.
- □ I can compute success probability and expected calls for a retry policy under an independence assumption.
- □ I can explain why a teleprompter's metric must be a callable, and what BootstrapFewShot keeps from the teacher.
- □ I can explain why a minibatch winner's score is optimistic, and why a held-out set fixes it.
- □ I can say which claims here are verified against the DSPy paper or source, and which are only stand-in simulations.
