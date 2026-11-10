---
id: "1.1"
part: 1
chapter: 1
title: "Python Programs & Source Code"
slug: "python-programs"
difficulty: "beginner"
estimated_minutes: 15
prerequisites: []
tags: ["python", "source-code", "syntax"]
status: "published"
---

# 1.1 — Python Programs & Source Code

## Opening Motivation & Context

Understanding how Python programs and source code work is fundamental to becoming a proficient Python developer. This lesson will demystify the mechanics behind Python programs, from the moment you write your first line of code to the execution of your program. You'll learn about the Python interpreter, the compilation process, and how Python programs are executed. This knowledge will not only help you write better code but also enable you to debug and optimize your programs more effectively.

## Core Concepts Breakdown

### Python Programs

Python programs are collections of instructions written in the Python programming language. These instructions are designed to perform specific tasks, such as data processing, web development, or machine learning. Python programs can range from simple scripts that perform a single task to complex applications that interact with databases, web services, and other software systems.

> [!KEY-INSIGHT]
> Python programs are not compiled into machine code before execution. Instead, they are interpreted by the Python interpreter, which reads and executes the code line by line.

### Source Code

Source code refers to the human-readable instructions written in a programming language. In the context of Python, source code is the text file containing the Python program. This file typically has a `.py` extension and can be edited using any text editor or integrated development environment (IDE).

> [!BEST-PRACTICE]
> Always use a consistent indentation style (either spaces or tabs) in your Python source code. Python uses indentation to define code blocks, and inconsistent indentation can lead to syntax errors.

### Python Interpreter

The Python interpreter is a program that reads and executes Python source code. When you run a Python program, the interpreter reads the source code, converts it into an intermediate form, and then executes the intermediate code. The Python interpreter is responsible for handling memory management, exception handling, and other low-level tasks.

> [!WARNING]
> The Python interpreter does not perform any type checking at compile time. This means that type-related errors will only be detected at runtime, which can lead to unexpected behavior in your programs.

## Code Demonstration & Runtime Output

Let's look at a simple Python program that demonstrates the concepts discussed in this lesson. This program calculates the factorial of a number using a recursive function.

```python
def factorial(n: int) -> int:
    """
    Calculate the factorial of a number using recursion.

    Args:
        n (int): The number to calculate the factorial of.

    Returns:
        int: The factorial of the number.
    """
    if n == 0:
        return 1
    else:
        return n * factorial(n - 1)

if __name__ == "__main__":
    number = 5
    result = factorial(number)
    print(f"The factorial of {number} is {result}")
```

Output:
```
The factorial of 5 is 120
```

### How this works (Line-by-Line Breakdown)

1. `def factorial(n: int) -> int:`: This line defines a function called `factorial` that takes an integer argument `n` and returns an integer. The function is annotated with type hints to indicate the expected types of the arguments and the return value.
2. `""" ... """`: This is a docstring that provides a description of the function, its arguments, and its return value. Docstrings are used to document Python code and can be accessed using the `help()` function.
3. `if n == 0:`: This line checks if the argument `n` is equal to 0. If it is, the function returns 1, which is the base case for the factorial calculation.
4. `else:`: This line is executed if the condition in the `if` statement is not met. It contains the recursive case for the factorial calculation.
5. `return n * factorial(n - 1)`: This line calculates the factorial of `n` by multiplying `n` with the factorial of `n - 1`. This is the recursive case for the factorial calculation.
6. `if __name__ == "__main__":`: This line checks if the script is being run as the main program. If it is, the code inside the `if` block is executed.
7. `number = 5`: This line assigns the value 5 to the variable `number`.
8. `result = factorial(number)`: This line calls the `factorial` function with the argument `number` and assigns the result to the variable `result`.
9. `print(f"The factorial of {number} is {result}")`: This line prints the result of the factorial calculation using an f-string to format the output.

> [!ADVANCED]
> When the Python interpreter executes the `factorial` function, it first checks if the argument `n` is equal to 0. If it is, the function returns 1. Otherwise, the function calls itself with the argument `n - 1`. This recursive call continues until the base case is reached, at which point the function starts returning the results of the recursive calls, multiplying each result by the current value of `n`. The final result is the factorial of the original argument `n`.

## Summary & Key Takeaways

- Python programs are collections of instructions written in the Python programming language.
- Source code refers to the human-readable instructions written in a programming language.
- The Python interpreter is a program that reads and executes Python source code.
- Python programs are not compiled into machine code before execution. Instead, they are interpreted by the Python interpreter.
- Always use a consistent indentation style in your Python source code.
- The Python interpreter does not perform any type checking at compile time. This means that type-related errors will only be detected at runtime.

## Quiz Time

### Question #1: Conceptual question

What is the purpose of the Python interpreter?

<details><summary>Show Solution</summary>

The Python interpreter is a program that reads and executes Python source code. It is responsible for handling memory management, exception handling, and other low-level tasks.

</details>

### Question #2: What does this code output?

```python
def greet(name: str) -> str:
    """
    Greet the user by name.

    Args:
        name (str): The name of the user.

    Returns:
        str: A greeting message.
    """
    return f"Hello, {name}!"

if __name__ == "__main__":
    user_name = "Alice"
    message = greet(user_name)
    print(message)
```

<details><summary>Show Solution</summary>

The code outputs:
```
Hello, Alice!
```

</details>

### Question #3: Find and fix the bug

```python
def divide(a: float, b: float) -> float:
    """
    Divide two numbers.

    Args:
        a (float): The dividend.
        b (float): The divisor.

    Returns:
        float: The result of the division.
    """
    return a / b

if __name__ == "__main__":
    dividend = 10
    divisor = 0
    result = divide(dividend, divisor)
    print(f"The result of the division is {result}")
```

<details><summary>Show Solution</summary>

The bug in the code is that it attempts to divide by zero, which is not allowed in mathematics. To fix this bug, you should add a check to ensure that the divisor is not zero before performing the division.

Here is the fixed code:

```python
def divide(a: float, b: float) -> float:
    """
    Divide two numbers.

    Args:
        a (float): The dividend.
        b (float): The divisor.

    Returns:
        float: The result of the division.

    Raises:
        ValueError: If the divisor is zero.
    """
    if b == 0:
        raise ValueError("Cannot divide by zero.")
    return a / b

if __name__ == "__main__":
    dividend = 10
    divisor = 0
    try:
        result = divide(dividend, divisor)
        print(f"The result of the division is {result}")
    except ValueError as e:
        print(f"Error: {e}")
```

</details>
