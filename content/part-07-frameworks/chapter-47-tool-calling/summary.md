Tool calling works in three stages. You describe each tool with a JSON Schema, the model writes a tool call as text, and your program parses, validates and runs it before returning the result as a message. The model never runs anything itself, so the loop, the schema check and the error messages are your code's responsibility. A schema can also constrain the decoder, which guarantees the shape of a call but not whether its values are right. Several calls in one turn can run in parallel when they do not depend on each other.

## Key ideas

- A tool's arguments are described by a JSON Schema (type, properties, required, enum, minimum, additionalProperties).
- Under the JSON Schema specification, 3.0 is an integer and true is not a number; Python needs explicit handling for both.
- Strict modes require additionalProperties false and every property in required, and they reject some keywords such as minimum.
- A decoder mask sets the logit of every token that cannot continue a valid output to minus infinity, so the output is valid by construction.
- A mask guarantees form, not content: a valid city value can still be the wrong city.
- The mask must work on live states; a legal prefix with no legal continuation gives NaN probabilities.
- The loop parses the arguments, validates them against the schema, runs the function, and turns every failure into an is_error result.
- The loop needs a step cap, and a cut-off output is not a valid output.
- Error feedback helps only through retries; with a retry success rate of zero, the validated policy is no better than the naive one.
- Parallel calls take the longest independent call's time; dependent calls take the critical path.
- All tool_result blocks for one assistant turn go back in one user message, each matched by tool_use_id.

## Before moving on

- [ ] I can write a JSON Schema for a tool's arguments and check a candidate call against it, including the 3.0 and true cases.
- [ ] I can say what a schema check guarantees and what it does not, and why a decoder mask cannot choose the right value.
- [ ] I can trace one pass of the function-calling loop: parse, validate, dispatch, append the result, and stop on a reply with no tool call.
- [ ] I can compute the wall-clock time of a batch of parallel calls, with and without a dependency.
- [ ] I can explain why each tool result must match its request by id and why all results go in one user message.
