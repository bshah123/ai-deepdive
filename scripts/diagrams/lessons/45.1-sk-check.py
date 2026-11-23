"""Checks the lesson's claims against the real semantic-kernel package (1.36.0). Needs pip install semantic-kernel."""
import asyncio, logging
from typing import Annotated
from semantic_kernel import Kernel
from semantic_kernel.functions import kernel_function, KernelArguments
logging.disable(logging.CRITICAL)

class MathPlugin:
    @kernel_function(name="add", description="Adds two numbers together")
    def add(self, num1: Annotated[float, "first number"], num2: Annotated[float, "second number"]) -> float:
        return num1 + num2

    @kernel_function(name="divide", description="Divides num1 by num2")
    def divide(self, num1: float, num2: float) -> float:
        return num1 / num2

async def main():
    kernel = Kernel()
    kernel.add_plugin(MathPlugin(), plugin_name="math")
    r = await kernel.invoke(plugin_name="math", function_name="add", num1=5, num2=3)
    print("add(5, 3) =", r.value)
    r = await kernel.invoke(kernel.get_function("math", "add"), KernelArguments(num1="5", num2="3"))
    print("add with string arguments =", r.value)
    for m in kernel.get_full_list_of_function_metadata():
        print(m.fully_qualified_name, [(p.name, p.type_, p.is_required, p.description) for p in m.parameters], "->", m.return_parameter.type_)
    try:
        await kernel.invoke(plugin_name="math", function_name="add", num1=5)
    except Exception as e:
        print("missing argument ->", type(e).__name__)
    try:
        await kernel.invoke(plugin_name="math", function_name="divide", num1=10, num2=0)
    except Exception as e:
        print("divide by zero ->", type(e).__name__, "| cause:", type(e.__cause__).__name__ if e.__cause__ else None)
    try:
        await kernel.invoke(plugin_name="math", function_name="multiply", num1=1, num2=2)
    except Exception as e:
        print("unknown function ->", type(e).__name__)

asyncio.run(main())
