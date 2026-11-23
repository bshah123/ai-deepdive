## What you learned

A coding agent and a research agent are both loops. The model proposes one step, a tool layer runs it, and the observation goes back into the context until a stop rule fires. The coding agent stops when a test run passes, not when the model says it is finished, and its tool layer carries the cheap guards: capped views, capped searches, edits that must match exactly once, and a syntax check before a write. The research agent adds a verifier that accepts a claim only when the cited page names the right subject and states the right value. In the lesson experiments, verification raised coverage from 0.50 to 1.00 and cost 15 pages instead of 6. The numbers come from small local or synthetic experiments, so the mechanisms are the lasting result, not the exact rates.

## Key ideas

- A coding agent is a loop: the model proposes one tool call, the tool layer runs it, and the observation returns to the context.
- The stop rule must read tool output, such as a test run, not the model's own report.
- Cheap checks belong in the tool layer: view windows, result caps, unique-match edits and syntax gates.
- Whole-file views cost about 13.5 times more than 100-line windows across six CPython standard library files (a rough characters-divided-by-four token estimate).
- About 20.6% of substantive lines in those files occur more than once in their own file, so exact-replace edits must refuse ambiguous matches.
- For B independent attempts that each succeed with probability p, the chance of at least one success is 1 - (1 - p)^B. Real attempts are correlated, so the true gain is smaller.
- A research agent is a loop: plan sub-questions, read pages for each open gap, verify each claim against its cited page, then write.
- Matching the attribute is not matching the subject. A claim must name the right entity and the right value.
- Verification keeps precision at 1.00 in the lesson run. A bigger budget does not help a loop that closes gaps on the first page it reads.
- A citation is not a verification. A string-presence check can still pass stale or mismatched evidence, and the planner limits what can be found at all.

## Before moving on

- I can write a tool layer for a coding agent with a capped file view, a capped search, and an edit that is refused unless its old text matches exactly once and compiles.
- I can compute the chance of at least one success in B independent attempts, and say why correlated attempts give less gain than the formula suggests.
- I can explain why a test run is a better stop condition than the model's own claim that the work is done.
- I can read a strategy trace and compute coverage and precision for a given page budget.
- I can name two failure modes that remain after adding a verifier: a string-presence check that passes stale evidence, and a writer that fills an open gap from memory.
