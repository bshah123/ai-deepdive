## Chapter 5 Summary — Tuples & Immutability

### What you learned

A tuple stores its items inside one block of memory, while a list stores a pointer to a separate array with spare slots. That layout explains the size, speed and hashing differences in this chapter. You also learned how the comma builds a tuple, how unpacking and `match` take tuples apart, and how `namedtuple` and `dataclass` add field names on top.

### Key ideas

- A tuple of n items is 40 + 8n bytes on CPython 3.12.13 (64-bit), measured.
- Building a sequence with `+` in a loop copies every item each time; `append` on a list does not.
- A tuple is hashable only if every item inside it is hashable.
- Immutability of a tuple covers its own references, not the objects those references point to.
- The comma makes the tuple; parentheses only group, except for the empty tuple `()`.
- Unpacking assigns left to right, and the count must match. A starred name collects the rest as a list.
- `match` tries `case` blocks top to bottom and runs the first that matches; a bare name captures, a dotted name compares.
- `namedtuple` and `typing.NamedTuple` give named fields and still unpack and compare like plain tuples.
- Immutability is shallow in every tuple-like type: a list field inside still changes.
- `slots=True` on a dataclass removes the per-instance dictionary (120.8 to 88.5 bytes in our measurement).

### Before moving on

- □ I can predict the size of a tuple from its item count on CPython 3.12.
- □ I can explain why `s = s + (x,)` in a loop is slower than `append` on a list.
- □ I can say whether a given tuple is hashable, and why.
- □ I can unpack nested sequences and use a starred name correctly.
- □ I can write a `match` statement that distinguishes a capture from a constant.
- □ I can choose between a tuple, a `namedtuple`, a `NamedTuple` and a `dataclass` for a given record.
