## Chapter 10 Summary — Object-Oriented Python

### What you learned

A class is a blueprint and an instance stores its own attributes, either in a `__dict__` or in fixed slots (Lesson 10.1). With multiple inheritance, Python fixes one search order, the method resolution order (MRO), by the C3 merge, and it refuses to create a class when no consistent order exists (Lesson 10.2). `super()` follows that MRO, so each class in a cooperative chain runs once, provided every class calls it (Lesson 10.3). Descriptors are objects stored on a class that intercept attribute reads, writes and deletes; `property` is one (Lesson 10.4). Lookup follows a fixed precedence, and a metaclass runs when a class statement executes (Lesson 10.5).

### Key ideas

- **`__slots__`** removes the per-instance `__dict__`, so a misspelled attribute fails at assignment; a subclass without `__slots__` gets a `__dict__` back.
- **The MRO** is `cls.__mro__`, computed by the C3 merge of the parents' MROs and the list of direct bases.
- **C3 fails loudly:** contradictory base orders raise `TypeError` when the class is created.
- **`super()`** calls the next class in `type(self).__mro__`, not the parent named in the source.
- **Cooperative `__init__`** takes the keywords it owns and forwards the rest with `**kw`; `object.__init__` rejects anything left over.
- **A missing `super()` call** ends the chain silently, and the error appears later as an `AttributeError`.
- **Data descriptors** (those defining `__set__` or `__delete__`) take precedence over the instance dictionary; non-data descriptors and plain class attributes do not.
- **Per-instance state** belongs in `obj.__dict__` under the attribute's name, not on the shared descriptor object.
- **Metaclass order:** `__prepare__`, the class body, `__new__`, `__set_name__`, `__init_subclass__`, then `__init__`.

### Before moving on

- □ I can predict `Class.__mro__` for a small diamond by running the C3 merge by hand.
- □ I can say which class `super()` reaches for a given instance, and why the same line can reach different classes.
- □ I can write a cooperative `__init__` chain in which every class consumes its own keywords.
- □ I can explain why a slotted class rejects `obj.typo = 1` and when slots save memory, and I can measure the saving with `tracemalloc`.
- □ I can write a data descriptor that stores per-instance values in `obj.__dict__`.
- □ I can predict which of two same-named attributes Python returns, using the lookup precedence order.
