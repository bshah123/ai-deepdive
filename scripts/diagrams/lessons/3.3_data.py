# Experiment for Lesson 3.3 (strings). Every number used in the lesson and its diagrams comes from this file.
# Run: <venv python> scripts/diagrams/lessons/3.3_data.py > scripts/diagrams/lessons/3.3_data.json
import json
import sys
import unicodedata

out = {"python": sys.version.split()[0]}

# 1. Code points vs bytes vs UTF-16 units
SAMPLES = [
    ("café, NFC (U+00E9)", "café"),
    ("café, NFD (e + U+0301)", "café"),
    ("ASCII 'hello'", "hello"),
    ("CJK '世界'", "世界"),
    ("emoji U+1F600", "\U0001F600"),
    ("family emoji (3 people + 2 ZWJ)", "\U0001F468‍\U0001F469‍\U0001F467"),
]
out["samples"] = [
    {
        "name": name,
        "repr": repr(s),
        "code_points": len(s),
        "utf8_bytes": len(s.encode("utf-8")),
        "utf16_units": len(s.encode("utf-16-le")) // 2,
        "utf8_hex": s.encode("utf-8").hex(" "),
    }
    for name, s in SAMPLES
]

# One letter, three encodings: the byte count depends on the encoding, not on the string
e_acute = "é"
out["e_acute_encodings"] = {
    "latin-1": len(e_acute.encode("latin-1")),
    "utf-8": len(e_acute.encode("utf-8")),
    "utf-16-le": len(e_acute.encode("utf-16-le")),
}
try:
    "é".encode("ascii")
    out["e_acute_ascii"] = "ok"
except UnicodeEncodeError as err:
    out["e_acute_ascii"] = type(err).__name__

# Hand-worked example: "é世😀"
worked = "é世\U0001F600"
out["worked"] = {"text": worked, "code_points": len(worked), "utf8_hex": worked.encode("utf-8").hex(" "), "utf16_units": len(worked.encode("utf-16-le")) // 2}

# Normalization: NFC and NFD are different code point sequences for the same text
nfc = "café"
nfd = "café"
out["nfc_eq_nfd"] = nfc == nfd
out["nfd_normalized_eq_nfc"] = unicodedata.normalize("NFC", nfd) == nfc
out["nfc_len"], out["nfd_len"] = len(nfc), len(nfd)

# 2. Flexible representation (PEP 393): size set by the widest character
KINDS = [
    ("ASCII 'a'", "a"),
    ("Latin-1 'é' (U+00E9)", "é"),
    ("BMP '世' (U+4E16)", "世"),
    ("astral '😀' (U+1F600)", "\U0001F600"),
]
out["sizes"] = []
for name, ch in KINDS:
    g1000 = sys.getsizeof(ch * 1000)
    g2000 = sys.getsizeof(ch * 2000)
    out["sizes"].append({
        "name": name,
        "getsizeof_1000": g1000,
        "bytes_per_char": (g2000 - g1000) / 1000,
        "getsizeof_empty": sys.getsizeof(""),
    })
out["getsizeof_1000_mixed_bmp_plus_one_ascii"] = sys.getsizeof("a" + "世" * 999)

# 3. Immutability
s = "Hello"
try:
    s[0] = "J"
    out["item_assign_error"] = "no error"
except TypeError as err:
    out["item_assign_error"] = str(err)
t = s
s += ", world"
out["after_plus_eq"] = {"s": s, "t": t, "s_is_t": s is t}
b = bytearray(b"Hello")
b[0] = ord("J")
out["bytearray_after_assign"] = b.decode()

# 4. Identity: literals, constant folding, runtime-built strings, sys.intern
def f():
    return "hello world"

def g():
    return "hello world"

def h():
    return "hello " + "world"

hello_lit = "hello"
hello_joined = "".join(["hel", "lo"])
ws_joined = "".join(["hello", " world"])
us_lit = "hello_world"
us_joined = "".join(["hello", "_world"])
out["identity"] = {
    "f() is g()  (same text, two code objects, space in text)": f() is g(),
    "h() folds 'hello '+'world' into a constant": "hello world" in h.__code__.co_consts,
    "h() is f()": h() is f(),
    "joined 'hello' is literal 'hello'": hello_joined is hello_lit,
    "sys.intern(joined 'hello') is literal 'hello'": sys.intern(hello_joined) is hello_lit,
    "runtime 'hello world' is f()": ws_joined is f(),
    "sys.intern(runtime 'hello world') is f()": sys.intern(ws_joined) is f(),
    "sys.intern(runtime) is sys.intern(runtime 2)": sys.intern(ws_joined) is sys.intern("".join(["hello", " world"])),
    "joined 'hello_world' is literal 'hello_world'": us_joined is us_lit,
    "sys.intern(joined 'hello_world') is literal": sys.intern(us_joined) is us_lit,
    "equal values": ws_joined == f(),
}

# Single Latin-1 characters are cached by CPython
a_var = "a"
out["single_char_cache"] = {"join(['a']) is 'a'": "".join(["a"]) is a_var, "chr(97) is 'a'": chr(97) is a_var}


# Same literal in two separate compilations (two modules, say): shared or not?
ns1, ns2 = {}, {}
exec(compile("def f():\n    return 'hello world'\n", "<unit-1>", "exec"), ns1)
exec(compile("def f():\n    return 'hello world'\n", "<unit-2>", "exec"), ns2)
out["cross_unit_literal_is"] = ns1["f"]() is ns2["f"]()
out["cross_unit_literal_is_sys_intern"] = sys.intern("hello world") is ns1["f"]()

# Header overhead: ASCII vs non-ASCII compact strings
out["getsizeof_single"] = {"'a'": sys.getsizeof("a"), "'é'": sys.getsizeof("\u00e9"), "'世'": sys.getsizeof("\u4e16"), "''": sys.getsizeof("")}

print(json.dumps(out, ensure_ascii=False, indent=2))
