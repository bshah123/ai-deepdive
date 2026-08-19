---
id: "1.2"
part: 1
chapter: 1
title: "Running Python & Execution Pipeline"
slug: "running-python"
difficulty: "beginner"
estimated_minutes: 20
prerequisites: []
tags: ["cpython", "bytecode", "interpreter"]
status: "published"
---

# 1.2 — Running Python & Execution Pipeline

## Opening Motivation & Context

Understanding how Python runs and executes code is fundamental to becoming a proficient Python programmer. This knowledge helps you write more efficient, maintainable, and bug-free code. It also provides insights into how Python interacts with your system and how you can optimize your code for performance.

## Core Concepts Breakdown

When you run a Python script, several steps occur behind the scenes. Python is an interpreted language, which means that your code is converted into bytecode that is then executed by the Python virtual machine (PVM). This process involves several stages, including parsing, compiling, and executing.

> [!KEY-INSIGHT]
> Python code is first parsed into an Abstract Syntax Tree (AST), then compiled into bytecode, and finally executed by the Python virtual machine.

> [!BEST-PRACTICE]
> Always use a virtual environment to manage your project dependencies. This helps avoid conflicts between different projects and ensures that your code runs consistently across different environments.

> [!WARNING]
> Be cautious when using the `exec()` function, as it can execute arbitrary code and pose a security risk if not used carefully.

## Code Demonstration & Runtime Output

```python
import sys
import dis

def greet(name: str) -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"

def main() -> None:
    """Main function to demonstrate Python execution pipeline."""
    print("Starting the Python execution pipeline demonstration...")

    # Get the name from the command line arguments
    if len(sys.argv) > 1:
        name = sys.argv[1]
    else:
        name = "World"

    # Call the greet function
    message = greet(name)
    print(message)

    # Disassemble the greet function to show bytecode
    print("\nBytecode for the greet function:")
    dis.dis(greet)

if __name__ == "__main__":
    main()
```

```text
Output:
Starting the Python execution pipeline demonstration...
Hello, World!

Bytecode for the greet function:
  2           0 LOAD_FAST                0 (name)
              2 LOAD_CONST               1 ('Hello, ')
              4 BINARY_ADD
              6 LOAD_CONST               2 ('!')
              8 BINARY_ADD
             10 RETURN_VALUE
```

### How this works (Line-by-Line Breakdown)

1. **Imports**: The `sys` module is imported to access command-line arguments, and the `dis` module is imported to disassemble the bytecode of the `greet` function.
2. **Function Definition**: The `greet` function is defined to take a string argument `name` and return a greeting message.
3. **Main Function**: The `main` function is defined to demonstrate the Python execution pipeline.
4. **Command-Line Argument Handling**: The script checks if a command-line argument is provided. If not, it defaults to "World".
5. **Function Call**: The `greet` function is called with the provided name, and the result is printed.
6. **Bytecode Disassembly**: The `dis.dis` function is used to disassemble the bytecode of the `greet` function and print it.
7. **Main Guard**: The `if __name__ == "__main__":` guard ensures that the `main` function is only called when the script is run directly, not when it is imported as a module.

> [!ADVANCED]
> The `dis` module provides a way to disassemble Python bytecode into a human-readable format. This is useful for understanding how Python code is executed at a low level. The bytecode consists of opcodes and operands, which are executed by the Python virtual machine.

> [!QA]
> Q: When should I prefer using the `exec()` function over evaluating expressions with `eval()`?
> A: The `exec()` function is used to execute dynamic Python code, while `eval()` is used to evaluate expressions. You should prefer `exec()` when you need to execute a block of code dynamically, such as when implementing a scripting language or when you need to execute code from a string. However, be cautious when using `exec()` as it can pose a security risk if not used carefully.

## Summary & Key Takeaways

- Python code is first parsed into an Abstract Syntax Tree (AST).
- The AST is then compiled into bytecode.
- The bytecode is executed by the Python virtual machine.
- Use virtual environments to manage project dependencies.
- Be cautious when using the `exec()` function.
- The `dis` module can be used to disassemble bytecode for debugging and optimization.

## Quiz time

### Question #1: Conceptual question

What is the main difference between the `exec()` and `eval()` functions in Python?

<details><summary>Show Solution</summary>

The `exec()` function is used to execute dynamic Python code, while `eval()` is used to evaluate expressions. `exec()` can execute multiple statements, while `eval()` can only evaluate a single expression.

</details>

### Question #2: What does this code output?

```python
import dis

def add(a: int, b: int) -> int:
    """Return the sum of a and b."""
    return a + b

print("Bytecode for the add function:")
dis.dis(add)
```

<details><summary>Show Solution</summary>

The code outputs the bytecode for the `add` function, which includes opcodes for loading the arguments `a` and `b`, adding them, and returning the result.

```text
Output:
Bytecode for the add function:
  2           0 LOAD_FAST                0 (a)
              2 LOAD_FAST                1 (b)
              4 BINARY_ADD
              6 RETURN_VALUE
```

</details>

### Question #3: Find and fix the bug

```python
import sys

def main() -> None:
    """Main function to demonstrate a bug."""
    if len(sys.argv) > 1:
        name = sys.argv[1]
    else:
        name = "World"

    print(f"Hello, {name}")

if __name__ == "__main__":
    main()
```

<details><summary>Show Solution</summary>

The bug in the code is that the `main` function is not called when the script is run directly. The fix is to ensure that the `main` function is called when the script is run directly by using the `if __name__ == "__main__":` guard.

```python
import sys

def main() -> None:
    """Main function to demonstrate a bug."""
    if len(sys.argv) > 1:
        name = sys.argv[1]
    else:
        name = "World"

    print(f"Hello, {name}")

if __name__ == "__main__":
    main()
```

</details>
