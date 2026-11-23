## Chapter 11 Summary — Python Data Model

### What you learned

Python's syntax is wired to special methods: `x[i]`, `len(x)`, `x(...)` and `for` loops all call methods on the object's type. You saw how to make your own containers behave like built-ins, how `with` uses `__enter__` and `__exit__`, and how to subclass the standard abstract bases.

### Key ideas

- A syntax such as `x[i]` or `len(x)` is a call on a special method of the type, with the instance passed first.
- `__getitem__` also gives iteration: Python calls it with 0, 1, 2, … until it raises `IndexError`.
- `__len__` must return a non-negative integer; CPython 3.12 rejects floats and strings.
- Special methods are looked up on the type, so an attribute set on one instance does not change `len(instance)`.
- `with` calls `__enter__` once and calls `__exit__` on every exit path.
- A true return value from `__exit__` suppresses the exception; a false or `None` value re-raises it.
- In a `@contextmanager` generator, cleanup belongs in `try`/`finally`, because the exception is raised at the `yield`.
- `ExitStack` manages a number of resources known only at run time, and releases them in reverse order.
- Subclass `collections.abc.Sequence` or `MutableSequence` to get the mixin methods, and make `isinstance` checks work by inheritance.

### Before moving on

- □ I can name the special method behind each common syntax form.
- □ I can make a class iterable with only `__getitem__`, and explain when iteration stops.
- □ I can write a context manager both as a class and as a `@contextmanager` generator.
- □ I can explain when `__exit__` suppresses an exception.
- □ I can subclass a collections abstract base and implement its required methods.
