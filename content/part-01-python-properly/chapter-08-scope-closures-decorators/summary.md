# Chapter 8 Summary: Scope, Closures & Decorators

This chapter explained how Python decides which binding a name refers to, and how a function can keep variables alive after its outer function returns. A name is looked up in the local, enclosing, global and built-in scopes, in that order (LEGB). Any assignment in a function body makes the name local to that body, so rebinding an outer name needs `global` or `nonlocal`. A closure keeps the cell that holds each free variable, and it reads that cell when it is called. A decorator is a function that takes a function and returns a replacement, usually a wrapper that closes over the original. Parameterized decorators and class decorators use the same closure pattern, one level further out.

## Key ideas

- LEGB: a name is searched in the local, enclosing, global and built-in scopes, and the search stops at the first scope that binds it.
- Any binding in a function body, including `+=`, makes the name local to the whole body, so an earlier read raises `UnboundLocalError`.
- A closure holds one cell per free variable (`__closure__`), and the cell holds the variable, not a copy of its value.
- Closures created in one loop share one cell for the loop variable; a default argument or a factory function gives each closure its own value.
- `nonlocal` rebinds a variable in the nearest enclosing function; mutating a captured object does not need it.
- `@deco` above `def f` is one reassignment, `f = deco(f)`, and stacked decorators apply bottom-up and run top-down.
- A wrapper should take `*args, **kwargs` and return the original result; `functools.wraps` keeps the name, docstring and signature.
- `@repeat(3)` is two calls: `repeat(3)` returns a decorator, and that decorator wraps the function. Writing `@repeat` without the call does not raise an error.
- A subclass-based class decorator renames the class, while an in-place decorator keeps the original class name.

## Before moving on

- [ ] I can predict which binding a name refers to by applying LEGB to a nested function, without running the code.
- [ ] I can find the line that makes a name local to a function, and fix an `UnboundLocalError` with `global`, `nonlocal` or a new variable.
- [ ] I can read `__closure__` and `co_freevars` of a closure and say which variables it keeps alive.
- [ ] I can write a closure counter with `nonlocal`, and explain why two closures from one call share state.
- [ ] I can fix a loop of lambdas that all return the same value, using a default argument or a factory function.
- [ ] I can write a decorator with `*args, **kwargs` and `functools.wraps`, and trace one call through it.
- [ ] I can write a parameterized decorator such as `@repeat(3)`, and recognise the missing-parentheses bug.
- [ ] I can state whether a class decorator returns a subclass or the same class, and what that does to `__name__`.
