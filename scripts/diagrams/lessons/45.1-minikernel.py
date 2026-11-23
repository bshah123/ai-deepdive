import inspect
import json
import typing
from typing import Annotated

JSON_TYPE = {float: "number", int: "integer", str: "string", bool: "boolean"}

def kernel_function(name=None, description=""):
    """Mark a method so the kernel can expose it to the model."""
    def mark(fn):
        fn._kf = {"name": name or fn.__name__, "description": description}
        return fn
    return mark

def _base_and_doc(annotation):
    if typing.get_origin(annotation) is Annotated:
        base, doc = typing.get_args(annotation)[:2]
        return base, doc
    return annotation, ""

class MiniKernel:
    def __init__(self):
        self._fns = {}

    def add_plugin(self, plugin, plugin_name):
        for attr in dir(plugin):
            fn = getattr(plugin, attr)
            meta = getattr(fn, "_kf", None)
            if meta is not None:
                self._fns[f"{plugin_name}-{meta['name']}"] = (fn, meta)

    def schema(self, key):
        """Build the description the model sees, from the signature and annotations."""
        fn, meta = self._fns[key]
        hints = typing.get_type_hints(fn, include_extras=True)
        props, required = {}, []
        for pname, param in inspect.signature(fn).parameters.items():
            base, doc = _base_and_doc(hints[pname])
            prop = {"type": JSON_TYPE[base]}
            if doc:
                prop["description"] = doc
            props[pname] = prop
            if param.default is inspect.Parameter.empty:
                required.append(pname)
        return {"name": key, "description": meta["description"],
                "parameters": {"type": "object", "properties": props, "required": required}}

    def invoke(self, key, arguments):
        """Run one function call requested by the model. arguments is a dict."""
        fn, _ = self._fns[key]
        hints = typing.get_type_hints(fn, include_extras=True)
        kwargs = {}
        for pname in inspect.signature(fn).parameters:
            if pname not in arguments:
                raise ValueError(f"{key}: missing required argument '{pname}'")
            base, _ = _base_and_doc(hints[pname])
            kwargs[pname] = base(arguments[pname])   # coerce, e.g. "5" -> 5.0
        return str(fn(**kwargs))

def handle_model_text(kernel, text):
    """The model replies with text such as {"function": ..., "arguments": {...}}."""
    call = json.loads(text)
    return kernel.invoke(call["function"], call["arguments"])

class MathPlugin:
    @kernel_function(description="Adds two numbers together")
    def add(self, num1: Annotated[float, "first number"],
            num2: Annotated[float, "second number"]) -> float:
        return num1 + num2

    @kernel_function(description="Divides num1 by num2")
    def divide(self, num1: float, num2: float) -> float:
        return num1 / num2

if __name__ == "__main__":
    kernel = MiniKernel()
    kernel.add_plugin(MathPlugin(), "math")
    print(json.dumps(kernel.schema("math-add"), indent=2))
    reply = '{"function": "math-add", "arguments": {"num1": "5", "num2": "3"}}'
    print("model reply:", reply)
    print("result:", handle_model_text(kernel, reply))
