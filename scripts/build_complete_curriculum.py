import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
curriculum_file = os.path.join(base_dir, "data/curriculum.json")

with open(curriculum_file, "r") as f:
    curriculum = json.load(f)

# Define expanded lessons for all chapters
EXPANDED_LESSONS = {
    # Part 1: Python Properly
    "chapter-04": [
        {"id": "4.1", "title": "PyListObject & Contiguous Pointers", "slug": "dynamic-arrays", "file": "4.1-dynamic-arrays.md", "difficulty": "intermediate", "estimatedMinutes": 20, "tags": ["list", "dynamic-array", "cpython"]},
        {"id": "4.2", "title": "List Comprehensions & Bytecode Optimization", "slug": "comprehensions", "file": "4.2-comprehensions.md", "difficulty": "beginner", "estimatedMinutes": 20, "tags": ["comprehensions", "bytecode", "optimization"]},
        {"id": "4.3", "title": "Timsort & Stable In-Place Sorting", "slug": "timsort", "file": "4.3-timsort.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["sort", "timsort", "algorithms"]},
        {"id": "4.4", "title": "Slicing, Memory Copies & itertools", "slug": "slicing-itertools", "file": "4.4-slicing-itertools.md", "difficulty": "intermediate", "estimatedMinutes": 20, "tags": ["slicing", "itertools", "memory"]},
        {"id": "4.5", "title": "collections.deque vs List for FIFO Queues", "slug": "deque-vs-list", "file": "4.5-deque-vs-list.md", "difficulty": "intermediate", "estimatedMinutes": 20, "tags": ["deque", "fifo", "data-structures"]}
    ],
    "chapter-05": [
        {"id": "5.1", "title": "PyTupleObject & Struct Optimization", "slug": "tuples-vs-lists", "file": "5.1-tuples-vs-lists.md", "difficulty": "beginner", "estimatedMinutes": 15, "tags": ["tuple", "immutable", "cpython"]},
        {"id": "5.2", "title": "Tuple Packing, Unpacking & Pattern Matching", "slug": "tuple-unpacking", "file": "5.2-tuple-unpacking.md", "difficulty": "beginner", "estimatedMinutes": 20, "tags": ["unpacking", "syntax", "pattern-matching"]},
        {"id": "5.3", "title": "namedtuple vs typing.NamedTuple vs dataclass", "slug": "namedtuples", "file": "5.3-namedtuples.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["namedtuple", "dataclass", "types"]}
    ],
    "chapter-06": [
        {"id": "6.1", "title": "Hash Table Foundations & __hash__", "slug": "hash-table-foundations", "file": "6.1-hash-table-foundations.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["hash", "dict", "hashable"]},
        {"id": "6.2", "title": "Compact Dict Layout (PEP 468) & Sparse Indices", "slug": "compact-dict", "file": "6.2-compact-dict.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["pep468", "cpython", "memory"]},
        {"id": "6.3", "title": "Collision Resolution: Open Addressing & Probing", "slug": "collision-resolution", "file": "6.3-collision-resolution.md", "difficulty": "advanced", "estimatedMinutes": 25, "tags": ["probing", "collisions", "algorithms"]},
        {"id": "6.4", "title": "Dict Resizing, Load Factor & defaultdict/Counter", "slug": "dict-resizing-collections", "file": "6.4-dict-resizing-collections.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["collections", "counter", "resizing"]}
    ],
    "chapter-07": [
        {"id": "7.1", "title": "PyFrameObject & The CPython Call Stack", "slug": "call-stack", "file": "7.1-call-stack.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["stack", "frame", "execution"]},
        {"id": "7.2", "title": "Argument Passing Mechanics (*args, **kwargs)", "slug": "argument-passing", "file": "7.2-argument-passing.md", "difficulty": "beginner", "estimatedMinutes": 20, "tags": ["arguments", "varargs", "kwargs"]},
        {"id": "7.3", "title": "First-Class Functions, Lambdas & Higher-Order Functions", "slug": "first-class-functions", "file": "7.3-first-class-functions.md", "difficulty": "intermediate", "estimatedMinutes": 20, "tags": ["lambda", "functional", "higher-order"]},
        {"id": "7.4", "title": "Recursion Limits & Stack Overflow Prevention", "slug": "recursion-stack", "file": "7.4-recursion-stack.md", "difficulty": "intermediate", "estimatedMinutes": 20, "tags": ["recursion", "sys-setrecursionlimit", "stack"]}
    ],
    "chapter-08": [
        {"id": "8.1", "title": "LEGB Scope & PyCellObject Internals", "slug": "legb-scope", "file": "8.1-legb-scope.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["scope", "legb", "closures"]},
        {"id": "8.2", "title": "Closures & Free Variables (__closure__)", "slug": "closures", "file": "8.2-closures.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["closures", "cell", "freevars"]},
        {"id": "8.3", "title": "Function Decorators & functools.wraps", "slug": "decorators", "file": "8.3-decorators.md", "difficulty": "intermediate", "estimatedMinutes": 30, "tags": ["decorators", "wraps", "metaprogramming"]},
        {"id": "8.4", "title": "Parameterized Decorators & Class Decorators", "slug": "advanced-decorators", "file": "8.4-advanced-decorators.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["decorators", "classes", "parameters"]}
    ],
    "chapter-09": [
        {"id": "9.1", "title": "The Iteration Protocol (__iter__ and __next__)", "slug": "iteration-protocol", "file": "9.1-iteration-protocol.md", "difficulty": "intermediate", "estimatedMinutes": 20, "tags": ["iterator", "protocol", "next"]},
        {"id": "9.2", "title": "Generators & The yield Keyword Internals", "slug": "generators-yield", "file": "9.2-generators-yield.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["generators", "yield", "frame-suspension"]},
        {"id": "9.3", "title": "Two-Way Generators: send(), throw(), and close()", "slug": "two-way-generators", "file": "9.3-two-way-generators.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["coroutine", "send", "throw"]},
        {"id": "9.4", "title": "itertools: Infinite, Combinatoric & Terminating Iterators", "slug": "itertools-mastery", "file": "9.4-itertools-mastery.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["itertools", "chain", "groupby"]}
    ],
    "chapter-10": [
        {"id": "10.1", "title": "Classes, Instances & __dict__ vs __slots__", "slug": "classes-mro", "file": "10.1-classes-mro.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["classes", "slots", "dict"]},
        {"id": "10.2", "title": "Method Resolution Order (MRO) & C3 Linearization", "slug": "mro-c3", "file": "10.2-mro-c3.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["mro", "c3", "inheritance"]},
        {"id": "10.3", "title": "super() Mechanics & Cooperative Multiple Inheritance", "slug": "super-mechanics", "file": "10.3-super-mechanics.md", "difficulty": "advanced", "estimatedMinutes": 25, "tags": ["super", "cooperative-inheritance"]},
        {"id": "10.4", "title": "Property Descriptors (__get__, __set__, __delete__)", "slug": "descriptors", "file": "10.4-descriptors.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["descriptors", "property", "attributes"]}
    ],
    "chapter-11": [
        {"id": "11.1", "title": "Magic Methods: __getitem__, __len__, __call__", "slug": "magic-methods", "file": "11.1-magic-methods.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["dunder", "magic-methods", "protocols"]},
        {"id": "11.2", "title": "Context Managers & The with Statement (__enter__/__exit__)", "slug": "context-managers", "file": "11.2-context-managers.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["context-manager", "with", "contextlib"]},
        {"id": "11.3", "title": "Custom Container Emulation & Sequence Protocols", "slug": "custom-containers", "file": "11.3-custom-containers.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["containers", "sequence", "mapping"]}
    ],
    "chapter-12": [
        {"id": "12.1", "title": "Exception Hierarchy & Stack Unwinding", "slug": "exception-handling", "file": "12.1-exception-handling.md", "difficulty": "intermediate", "estimatedMinutes": 20, "tags": ["exceptions", "try-except", "stack-unwind"]},
        {"id": "12.2", "title": "Exception Chaining: raise ... from ...", "slug": "exception-chaining", "file": "12.2-exception-chaining.md", "difficulty": "intermediate", "estimatedMinutes": 20, "tags": ["chaining", "traceback", "debugging"]},
        {"id": "12.3", "title": "Profiling & Tracing with cProfile and sys.settrace", "slug": "profiling-tracing", "file": "12.3-profiling-tracing.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["cprofile", "tracing", "performance"]}
    ],
    "chapter-13": [
        {"id": "13.1", "title": "The CPython Import Engine & sys.modules Cache", "slug": "import-engine", "file": "13.1-import-engine.md", "difficulty": "beginner", "estimatedMinutes": 20, "tags": ["import", "sys-modules", "cpython"]},
        {"id": "13.2", "title": "Packages, __init__.py & Relative vs Absolute Imports", "slug": "packages-imports", "file": "13.2-packages-imports.md", "difficulty": "beginner", "estimatedMinutes": 20, "tags": ["packages", "init", "namespaces"]},
        {"id": "13.3", "title": "Virtual Environments, Site-Packages & Package Resolution", "slug": "venvs-packaging", "file": "13.3-venvs-packaging.md", "difficulty": "beginner", "estimatedMinutes": 20, "tags": ["venv", "site-packages", "pip"]}
    ],
    "chapter-14": [
        {"id": "14.1", "title": "Python Type Annotations & Mypy Static Checking", "slug": "type-annotations", "file": "14.1-type-annotations.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["typing", "mypy", "type-hints"]},
        {"id": "14.2", "title": "Generics, TypeVar, Protocol & Structural Subtyping", "slug": "generics-protocols", "file": "14.2-generics-protocols.md", "difficulty": "advanced", "estimatedMinutes": 30, "tags": ["generics", "protocol", "typevar"]},
        {"id": "14.3", "title": "Data Validation with Pydantic V2 & Rust Backend", "slug": "pydantic-validation", "file": "14.3-pydantic-validation.md", "difficulty": "intermediate", "estimatedMinutes": 25, "tags": ["pydantic", "validation", "rust"]}
    ]
}

# Update curriculum parts
for part in curriculum["parts"]:
    for ch in part["chapters"]:
        if ch["id"] in EXPANDED_LESSONS:
            lesson_metas = []
            for l in EXPANDED_LESSONS[ch["id"]]:
                lesson_metas.append({
                    "id": l["id"],
                    "partId": part["id"],
                    "chapterId": ch["id"],
                    "title": l["title"],
                    "slug": l["slug"],
                    "file": l["file"],
                    "difficulty": l["difficulty"],
                    "estimatedMinutes": l["estimatedMinutes"],
                    "tags": l["tags"],
                    "status": "published"
                })
            ch["lessons"] = lesson_metas

# Save updated curriculum.json
with open(curriculum_file, "w") as f:
    json.dump(curriculum, f, indent=2)

print("curriculum.json updated with complete multi-lesson structure!")
