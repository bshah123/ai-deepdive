## What you learned

A `.py` file is translated completely before any of it runs. CPython decodes the bytes to text, splits the text into tokens, groups the tokens into a syntax tree, and compiles that tree into bytecode, one code object for each module, function and class body. Only then does a stack-based eval loop execute the instructions. This is why a syntax error stops a file before its first line prints, while a runtime error stops it only at the failing line. The chapter then shows how the same file behaves under `python file.py`, `python -m`, `python -c` and stdin, through `sys.argv`, `__file__`, `sys.path[0]` and `__name__`; how `import` searches `sys.path` and caches compiled modules in `__pycache__`; how to read `dis` output; how CPython specializes hot instructions since 3.11; and how PyPy and Jython differ from CPython. Most outputs come from CPython 3.12.13. Bytecode, timings and some behaviour change with the version and the machine, and each lesson labels the results that come from another interpreter.

## Key ideas

- The whole file is tokenized, parsed and compiled before execution, so a syntax error produces no output (Lessons 1.1, 1.2).
- Indentation is a stack of widths: a deeper line pushes one `INDENT`, and a shallower line pops one `DEDENT` for each level it leaves (Lesson 1.1).
- `__name__` is `"__main__"` for a started script, for `python -m` and for `python -c`, and the module name when the file is imported, so put script-only code under `if __name__ == "__main__":` (Lessons 1.1, 1.2).
- Each module, function and class body becomes a code object, which the eval loop runs one instruction at a time on a stack (Lesson 1.2).
- A `.pyc` file in `__pycache__` is reused when the modification time and size in its header match the source. The cache saves compile time only (Lesson 1.2).
- `sys.argv`, `__file__` and `sys.path[0]` depend on how Python was started. The `-P` flag (added in 3.11) keeps the script's folder off the front of `sys.path` (Lessons 1.2, 1.4).
- `import` checks `sys.modules` first, then the finders, then takes the first match on `sys.path`. Inside one folder a package directory beats a same-named module, and a folder without `__init__.py` is used only if nothing later matches (Lesson 1.4).
- A file named like a standard-library module, such as `random.py`, hides the real module when the script's folder comes first on `sys.path` (Lesson 1.4).
- Changing `sys.path` affects only modules that are not yet imported (Lesson 1.4).
- In `dis` output, most arguments index `co_varnames`, `co_consts` or `co_names`. A `for` loop is a `FOR_ITER` plus a backward jump, and the opcode names are specific to each CPython version (Lesson 1.5).
- The compiler folds only sub-expressions that are fully constant, so `60*60*24*n` and `n*60*60*24` compile to 4 and 8 instructions (Lesson 1.5).
- In the lesson's timing run, a loop on local variables (`LOAD_FAST`) took 25.0 ms, while the same loop at module level took 48.3 ms and in a function with `global` declarations took 43.8 ms (Lesson 1.5).
- Since 3.11, CPython specializes an instruction on its second execution and checks its assumption on every run. After 53 misses it goes back to generic code and specializes again. `dis.dis(f, adaptive=True)` shows the running form (Lesson 1.6).
- A site that sees several types is slower: one class took 18.4 ns per loop iteration in the lesson's run, and four classes took 24.0 ns (Lesson 1.6).
- The tier-2 interpreter and copy-and-patch just-in-time (JIT) compiler in 3.13 and later are experimental. In the lesson's small loops they did not speed anything up (Lesson 1.6).
- CPython, PyPy and Jython are separate programs that implement the same language. Across the lesson's four workloads PyPy ran from about 1.4 to about 40 times faster than CPython 3.12, and its JIT has a warm-up cost on the first calls (Lesson 1.3).
- PyPy does not free objects by reference counting, so `__del__` may run later and a file is not closed as soon as it goes out of scope. Use `with` (Lesson 1.3).

## Before moving on

- [ ] For a file with a syntax error on a given line, say whether any line prints, and why.
- [ ] Count the `INDENT` and `DEDENT` tokens of a nested block by applying the indentation-stack rule.
- [ ] Use `tokenize`, `ast.parse` and `dis.dis` to show the tokens, syntax tree and bytecode of one statement.
- [ ] Guard script-only code with `if __name__ == "__main__":`, and predict what runs under `python file.py`, `python -m` and `import`.
- [ ] Predict `sys.argv`, `__file__` and `sys.path[0]` for a script, a `-m` run, a `-c` run and stdin.
- [ ] Explain when a `.pyc` is reused, and why a same-size edit with a restored modification time can be missed.
- [ ] Predict which file `import` loads, given a `sys.path` list and the presence of packages, modules and folders without `__init__.py`.
- [ ] Diagnose a shadowed standard-library module by printing `module.__file__`, then fix it by renaming the file or by running with `-P`.
- [ ] Read a `dis` listing: find the table an argument points to, locate a loop's jump target, and tell instruction count apart from cache slots.
- [ ] Predict whether the compiler folds a constant expression, and explain why operand order matters.
- [ ] Show a specialized instruction with `dis.dis(f, adaptive=True)` after a warm-up, and explain why a site with mixed types is slower.
- [ ] Time a function with a warm-up and repeated runs, and explain why a single call on PyPy misleads.
