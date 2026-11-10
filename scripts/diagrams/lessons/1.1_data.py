"""Numbers and labels shown in the Lesson 1.1 diagrams. Run: python scripts/diagrams/lessons/1.1_data.py
(Python 3.12.) The diagrams copy these values by hand into 1.1.mjs; the lesson's own code blocks print the same."""
import ast, io, tokenize

line = "total = price * 3  # with tax\n"
print("tokens:", [(tokenize.tok_name[t.type], t.string) for t in tokenize.generate_tokens(io.StringIO(line).readline)])
print(ast.dump(ast.parse(line), indent=2))

# indentation stack trace for the 4-line function in the lesson
src = "def f(x):\n    if x:\n        return 1\n    return 0\n"
stack = [0]
for n, text in enumerate(src.splitlines(), 1):
    w = len(text) - len(text.lstrip(" "))
    ev = []
    if w > stack[-1]:
        stack.append(w); ev.append("INDENT")
    while w < stack[-1]:
        stack.pop(); ev.append("DEDENT")
    print(f"line {n}: width {w}, stack {stack}, {ev}")
ev = ["DEDENT"] * (len(stack) - 1)
print("end of file: pops ->", ev)
