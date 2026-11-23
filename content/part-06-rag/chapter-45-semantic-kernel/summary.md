## What you learned

A language model cannot run code, so a program has to run the functions the model asks for. Semantic Kernel (SK) is a software development kit (SDK) that does this bookkeeping for Python. You mark methods in a plugin class with `@kernel_function`, register the plugin with a kernel, and the kernel turns each method's signature and annotations into a JSON description that the model reads. When the model replies with a function call, the kernel checks the arguments, converts them to their annotated types, runs the method and returns the result as text. Lesson 45.1 built a small kernel in pure Python to show this mechanism. Lesson 45.2 showed the loop that repeats these calls until the model answers in plain text, and why SK's older planners were replaced by function calling. Both lessons were run against `semantic-kernel` version 1.36.0; the mini kernel is a teaching model, not SK's source code.

## Key ideas

- A plugin is a class whose marked methods become functions named `plugin-function`, such as `math-add`.
- The kernel reads parameter names, type annotations and `Annotated` strings. It needs no separate schema file.
- The model sends JSON text, so arguments arrive as strings. The kernel converts each one to its annotated type before calling the method.
- A worked call: `num1 = "5"` and `num2 = "3"` become 5.0 and 3.0, the method returns 8.0, and the model receives the text `"8.0"`.
- Function calling replaces the older planners. The model chooses the next call from the schemas it is given [1].
- The loop sends the schemas and the history on every request. The schema is paid for on each call, so keep descriptions short [2].
- Set a maximum number of iterations. Without a limit, a model that keeps calling functions never returns a final answer.
- Permissions belong inside the function. The model decides when a function runs, so a function that deletes files must check its own arguments and rights.
- Keyword matching on the goal is not planning, and a `str` parameter forces the model to guess a format. Use typed parameters where the value has a fixed shape [2].

## Before moving on

- □ I can write a plugin class with `@kernel_function` and register it under a plugin name.
- □ I can predict the function name and the JSON parameter list the kernel derives from a given signature.
- □ I can trace one call from the model's reply text through coercion, the method call and the returned string.
- □ I can explain why the schema is sent on every request and what that costs.
- □ I can write a loop with a maximum iteration count and explain what happens when the limit is reached.
- □ I can say where an authorization check belongs and why a prompt instruction alone is not enough.
