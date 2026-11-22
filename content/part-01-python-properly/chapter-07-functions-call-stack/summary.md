## Chapter 7 Summary — Functions & Call Stack

### What you learned

Each active call has a frame, and frames form a stack linked through `f_back`. You learned how Python passes arguments, how `*args` and `**kwargs` are bound, how functions are objects you can pass around, and why recursion depth is limited.

### Key ideas

- Arguments are passed by assignment: rebinding a parameter leaves the caller unchanged; mutating the object is seen by both.
- Binding follows a fixed order: positional values, then `*args` as a tuple, then keyword values, then `**kwargs` as a dict.
- Each call builds new `args` and `kwargs` containers, but their elements are shared with the caller.
- Keyword-only parameters after `*` and positional-only parameters before `/` restrict how values are passed.
- A mutable default is created once when the `def` runs, and is shared across calls.
- A function is an object of type `function`; a closure keeps its captured variable in a cell.
- In CPython 3.11 and later, frame objects are created only when code asks for them, such as through `sys._getframe()`.
- A function's value stack peaks at `co_stacksize` (5 for `factorial` in our run).
- Recursion limits (1,000 by default) count every frame on the stack. Raising the limit can crash the interpreter, and CPython does not remove tail calls.

### Before moving on

- □ I can predict which variable changes after a call that rebinds versus mutates an argument.
- □ I can bind a call to `*args`, `**kwargs` and keyword-only parameters, and say where each value goes.
- □ I can explain why a mutable default argument is shared, and fix it.
- □ I can walk the frame chain with `f_back` and name each caller.
- □ I can rewrite a deep recursion as an explicit stack.
