## Chapter 13 Summary — Modules, Packages & Environments

### What you learned

`import` first checks `sys.modules`, then searches `sys.path` through the finders, and runs the module body once. Packages are folders of modules, and relative imports resolve against the package name. Virtual environments give each project its own `site-packages`, and `sys.path` decides which file a name refers to.

### Key ideas

- `import x` checks `sys.modules` first; a hit returns the stored module without searching or running code.
- On a miss, the `sys.meta_path` finders run in order. `PathFinder` searches `sys.path`, and the first match wins.
- The module is stored before its body runs, so circular imports can see a half-built module. A failed body removes only its own entry.
- A `None` entry in `sys.modules` makes every import of that name raise `ModuleNotFoundError`.
- A regular package is a folder with `__init__.py`; importing a submodule runs each parent's `__init__.py` first.
- Relative imports fail when a file runs as a script, or when the dots climb above the top package.
- A folder without `__init__.py` is a namespace package; a regular package found first hides it.
- A venv gives one project its own site-packages; `pyvenv.cfg` makes `sys.prefix` differ from `sys.base_prefix`.
- A local `random.py` hides the standard library module, because `sys.path` is searched in order.

### Before moving on

- □ I can trace what `import x` does, step by step, from `sys.modules` to the finders.
- □ I can explain a circular import and why it sometimes works.
- □ I can lay out a package with `__init__.py` and use correct relative imports.
- □ I can diagnose a shadowed standard-library module from its `__file__`.
- □ I can create a venv and explain which interpreter and site-packages it uses.
