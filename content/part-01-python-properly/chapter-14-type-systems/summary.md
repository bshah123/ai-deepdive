# Chapter 14 Summary — Type Systems & Data Validation

### What You Learned

Python stores type annotations but does not enforce them, so a bad call can run without error until the bad value reaches a line that fails. Mypy, a static checker, reads the annotations without running the code and reports disagreements, but a clean run only shows that the code agrees with its annotations. Generics (`TypeVar`) and Protocols let you state how inputs and outputs relate, and how a class must look, without inheritance; `isinstance` on a runtime-checkable Protocol checks only that the names exist, so mypy is still needed for signatures. Pydantic V2 covers the other side: it validates raw data at the program boundary, converting well-defined inputs in lax mode, rejecting the rest, and reporting every error with a machine-readable type. The three tools answer different questions, so you use them together.

### Key Concepts

- Annotations are stored in `__annotations__` and are not checked when the function runs.
- Mypy checks annotations before the run; a clean run means no detected inconsistency, not correct behaviour.
- `str | None` marks a value that may be `None`; a guard such as `if name is None` narrows the type on the path that follows.
- Functions with no annotations are skipped by default; `--check-untyped-defs` checks their bodies.
- A `TypeVar` is bound at each call; an unbounded `T` supports no operators, and a bound declares the methods the checker may use.
- A Protocol matches by shape, so a class does not need to inherit from it.
- `isinstance` on a runtime-checkable Protocol checks names only; signature errors need mypy.
- `list` is invariant, so `list[int]` is not a `list[float]`; `Sequence[float]` is read-only and accepts both.
- Pydantic builds a validator once per model class and runs it on each input.
- Lax mode converts well-defined input such as `"3"` to `3`; strict mode accepts only the declared type.
- Pydantic reports all bad fields in one pass, each with a `loc`, a `type` code and a message.
- In Pydantic V2, `Optional[int]` without a default is required; add `= None` to make it optional.

### Before Moving On

- [ ] Run mypy on a file with one wrong argument, and read the line number and message it prints.
- [ ] Explain why `double("ab")` returns `abab` at run time and still fails mypy.
- [ ] Run mypy on a file with an unannotated function, with and without `--check-untyped-defs`, and compare the output.
- [ ] Write a `TypeVar`-based function that compares two values, and bound it to a Protocol that declares `__gt__`.
- [ ] Show that `isinstance` on a runtime-checkable Protocol accepts a class with a wrong method signature, and that mypy rejects it.
- [ ] Choose `Sequence` instead of `list` for a read-only parameter, and say why.
- [ ] Define a Pydantic model, validate one dict in lax mode and one in strict mode, and read `e.errors()` for a bad record.
