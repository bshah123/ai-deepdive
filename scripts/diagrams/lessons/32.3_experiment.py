"""Experiment for lesson 32.3 (GGUF, GGML block quantization, llama.cpp-style dot products).

NumPy and the standard library only. Every number used in the lesson comes from this file.
Run:  python3 scripts/diagrams/lessons/32.3_experiment.py
Writes scripts/diagrams/lessons/32.3_data.json.
"""
import json
import os
import struct
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
F32_ = np.float32

# ---------------------------------------------------------------- GGUF writer / reader
# Layout follows docs/gguf.md (ggml-org/ggml): magic, version, tensor_count, kv_count,
# metadata KV pairs, tensor infos, padding to general.alignment, tensor data.
GGML_F32, GGML_F16, GGML_Q4_0, GGML_Q8_0 = 0, 1, 2, 8
VT_UINT32, VT_FLOAT32, VT_BOOL, VT_STRING, VT_ARRAY = 4, 6, 7, 8, 9


def align_up(o, a):
    return o + (a - o % a) % a


def gstr(s):
    b = s.encode("utf-8")
    return struct.pack("<Q", len(b)) + b


def kv_str(key, value):
    return gstr(key) + struct.pack("<I", VT_STRING) + gstr(value)


def kv_u32(key, value):
    return gstr(key) + struct.pack("<I", VT_UINT32) + struct.pack("<I", value)


def kv_f32(key, value):
    return gstr(key) + struct.pack("<I", VT_FLOAT32) + struct.pack("<f", value)


def kv_bool(key, value):
    return gstr(key) + struct.pack("<I", VT_BOOL) + struct.pack("<B", int(value))


def kv_str_array(key, values):
    body = b"".join(gstr(v) for v in values)
    return gstr(key) + struct.pack("<I", VT_ARRAY) + struct.pack("<IQ", VT_STRING, len(values)) + body


def write_gguf(path, kvs, tensors, alignment=32):
    """tensors: list of (name, ne_dims, ggml_type, data_bytes)."""
    meta = b"".join(kvs)
    offsets, cur = [], 0
    for _, _, _, data in tensors:
        offsets.append(cur)
        cur = align_up(cur + len(data), alignment)
    infos = b""
    for (name, ne, typ, _), off in zip(tensors, offsets):
        infos += gstr(name) + struct.pack("<I", len(ne)) + struct.pack("<%dQ" % len(ne), *ne)
        infos += struct.pack("<IQ", typ, off)
    header = b"GGUF" + struct.pack("<IQQ", 3, len(tensors), len(kvs))
    p_end = len(header) + len(meta) + len(infos)
    data_start = align_up(p_end, alignment)
    blob = bytearray(header + meta + infos)
    blob += b"\x00" * (data_start - p_end)
    for (_, _, _, data), off in zip(tensors, offsets):
        assert len(blob) == data_start + off
        blob += data
        blob += b"\x00" * (align_up(len(data), alignment) - len(data))
    with open(path, "wb") as f:
        f.write(bytes(blob))
    return {"header_bytes": len(header), "kv_bytes": len(meta), "tensor_info_bytes": len(infos),
            "p_end": p_end, "data_start": data_start, "file_bytes": len(blob), "offsets": offsets}


def read_gguf(buf):
    magic = bytes(buf[:4])
    version, n_t, n_kv = struct.unpack_from("<IQQ", buf, 4)
    pos = 24

    def rd_str():
        nonlocal pos
        n, = struct.unpack_from("<Q", buf, pos)
        pos += 8
        s = bytes(buf[pos:pos + n]).decode("utf-8")
        pos += n
        return s

    kvs = {}
    for _ in range(n_kv):
        key = rd_str()
        vt, = struct.unpack_from("<I", buf, pos)
        pos += 4
        if vt == VT_STRING:
            val = rd_str()
        elif vt == VT_UINT32:
            val, = struct.unpack_from("<I", buf, pos); pos += 4
        elif vt == VT_FLOAT32:
            val, = struct.unpack_from("<f", buf, pos); pos += 4
        elif vt == VT_BOOL:
            val = bool(buf[pos]); pos += 1
        elif vt == VT_ARRAY:
            et, n = struct.unpack_from("<IQ", buf, pos); pos += 12
            assert et == VT_STRING
            val = [rd_str() for _ in range(n)]
        else:
            raise ValueError(vt)
        kvs[key] = val
    tensors = []
    for _ in range(n_t):
        name = rd_str()
        nd, = struct.unpack_from("<I", buf, pos); pos += 4
        ne = list(struct.unpack_from("<%dQ" % nd, buf, pos)); pos += 8 * nd
        typ, off = struct.unpack_from("<IQ", buf, pos); pos += 12
        tensors.append({"name": name, "ne": ne, "type": typ, "offset": off})
    alignment = kvs.get("general.alignment", 32)
    data_start = align_up(pos, alignment)
    for t in tensors:
        t["abs_offset"] = data_start + t["offset"]
    return {"magic": magic, "version": version, "kv": kvs, "tensors": tensors,
            "data_start": data_start, "header_end": pos}


# ---------------------------------------------------------------- block quantizers (llama.cpp rules)
def q4_0_quantize(x):
    """Port of quantize_row_q4_0_ref: per block of 32, d = signed_max / -8, q = min(15, trunc(x/d + 8.5))."""
    x = np.asarray(x, dtype=F32_).reshape(-1, 32)
    rows = np.arange(x.shape[0])
    idx = np.argmax(np.abs(x), axis=1)            # first element of maximum magnitude (C uses strict <)
    mx = x[rows, idx]                             # signed value
    d = (mx / F32_(-8)).astype(F32_)
    nz = d != 0
    idd = np.where(nz, F32_(1) / np.where(nz, d, F32_(1)), F32_(0)).astype(F32_)
    q = np.minimum(15, np.trunc(x * idd[:, None] + F32_(8.5)).astype(np.int32)).astype(np.uint8)
    qs = (q[:, :16] | (q[:, 16:] << 4)).astype(np.uint8)   # element j -> low nibble of byte j; j+16 -> high
    return d.astype(np.float16), qs


def q4_0_dequantize(d16, qs):
    lo = (qs & 0x0F).astype(np.int32) - 8
    hi = (qs >> 4).astype(np.int32) - 8
    q = np.concatenate([lo, hi], axis=1).astype(F32_)
    return (q * d16.astype(F32_)[:, None]).reshape(-1)


def q8_0_quantize(x):
    """Port of quantize_row_q8_0_ref: d = amax / 127, q = roundf(x / d) (half away from zero)."""
    x = np.asarray(x, dtype=F32_).reshape(-1, 32)
    amax = np.max(np.abs(x), axis=1)
    d = (amax / F32_(127)).astype(F32_)
    nz = d != 0
    idd = np.where(nz, F32_(1) / np.where(nz, d, F32_(1)), F32_(0)).astype(F32_)
    v = x * idd[:, None]
    q = (np.sign(v) * np.floor(np.abs(v) + F32_(0.5))).astype(np.int8)
    return d.astype(np.float16), q


def q8_0_dequantize(d16, q):
    return (q.astype(F32_) * d16.astype(F32_)[:, None]).reshape(-1)


def sym4_blocks_dequant(x, block):
    """Same Q4_0 rule with an arbitrary block length (experiment only; block=32 is the real format).
    As in the C code, the inverse scale uses the FP32 d; the stored scale is FP16."""
    x = np.asarray(x, dtype=F32_).reshape(-1, block)
    rows = np.arange(x.shape[0])
    mx = x[rows, np.argmax(np.abs(x), axis=1)]
    d32 = (mx / F32_(-8)).astype(F32_)
    nz = d32 != 0
    idd = np.where(nz, F32_(1) / np.where(nz, d32, F32_(1)), F32_(0)).astype(F32_)
    q = np.minimum(15, np.trunc(x * idd[:, None] + F32_(8.5)).astype(np.int32))
    d = d32.astype(np.float16).astype(F32_)
    return ((q - 8).astype(F32_) * d[:, None]).reshape(-1)


def main():
    out = {}
    rng = np.random.default_rng(0)

    # ------------------------------------------------ 1. bytes per weight from block sizes
    bpw = {
        "F32": 4 * 8, "F16": 2 * 8,
        "Q8_0": (2 + 32) * 8 / 32,            # fp16 scale + 32 int8
        "Q4_0": (2 + 16) * 8 / 32,            # fp16 scale + 16 bytes of packed nibbles
        "Q4_K_block": (2 + 2 + 12 + 128) * 8 / 256,  # super-block of 256: d, dmin, 12 scale bytes, 128 quant bytes
    }
    out["bytes_per_block"] = {"Q4_0": 18, "Q8_0": 34, "Q4_K_superblock": 144}
    out["bits_per_weight"] = {k: float(v) for k, v in bpw.items()}
    P = 7_000_000_000
    out["size_7B_GB_decimal"] = {k: round(P * v / 8 / 1e9, 2) for k, v in bpw.items() if k != "Q4_K_block"}

    # ------------------------------------------------ 2. write and read a tiny GGUF file
    w_small = rng.standard_normal(128).astype(F32_) * 0.05   # a 2 x 64 weight matrix (ne = [64, 2])
    norm = (1.0 + 0.1 * rng.standard_normal(64)).astype(F32_)  # F32 vector of 64 values
    d_w, qs_w = q4_0_quantize(w_small)
    blk_w = np.concatenate([d_w.view(np.uint8).reshape(-1, 2), qs_w], axis=1).tobytes()  # 18 bytes per block
    kvs = [
        kv_str("general.architecture", "llama"),
        kv_u32("general.alignment", 32),
        kv_u32("llama.context_length", 4096),
        kv_f32("llama.rope.freq_base", 10000.0),
        kv_bool("general.quantized", True),
        kv_str_array("tokenizer.ggml.tokens", ["<s>", "</s>", "hello"]),
    ]
    tensors = [
        ("blk.0.attn_norm.weight", [64], GGML_F32, norm.tobytes()),
        ("blk.0.attn_q.weight", [64, 2], GGML_Q4_0, blk_w),
    ]
    tmp = tempfile.mkdtemp()
    path = os.path.join(tmp, "tiny.gguf")
    layout = write_gguf(path, kvs, tensors)
    buf = open(path, "rb").read()
    parsed = read_gguf(buf)
    assert parsed["magic"] == b"GGUF" and parsed["version"] == 3
    assert parsed["kv"]["general.architecture"] == "llama"
    assert parsed["kv"]["llama.context_length"] == 4096
    assert parsed["kv"]["tokenizer.ggml.tokens"] == ["<s>", "</s>", "hello"]
    t_norm, t_q = parsed["tensors"]
    assert t_norm["ne"] == [64] and t_norm["type"] == GGML_F32
    assert t_q["ne"] == [64, 2] and t_q["type"] == GGML_Q4_0
    norm_back = np.frombuffer(buf, dtype=F32_, count=64, offset=t_norm["abs_offset"])
    assert np.array_equal(norm_back, norm)
    raw_q = np.frombuffer(buf, dtype=np.uint8, count=len(blk_w), offset=t_q["abs_offset"])
    assert raw_q.tobytes() == blk_w
    deq_from_file = q4_0_dequantize(np.frombuffer(blk_w, dtype=np.uint8).reshape(-1, 18)[:, :2].copy().view(np.float16).reshape(-1),
                                    np.frombuffer(blk_w, dtype=np.uint8).reshape(-1, 18)[:, 2:])
    assert np.array_equal(deq_from_file, q4_0_dequantize(d_w, qs_w))

    out["gguf"] = {
        "magic_ascii": parsed["magic"].decode(),
        "magic_hex": parsed["magic"].hex(" "),
        "version": parsed["version"],
        "first_24_bytes_hex": buf[:24].hex(" "),
        "kv_count": len(kvs),
        "tensor_count": len(tensors),
        "header_bytes": layout["header_bytes"],
        "kv_bytes": layout["kv_bytes"],
        "tensor_info_bytes": layout["tensor_info_bytes"],
        "p_end": layout["p_end"],
        "data_start": layout["data_start"],
        "tensor_offsets_rel": layout["offsets"],
        "abs_offsets": [t["abs_offset"] for t in parsed["tensors"]],
        "file_bytes": layout["file_bytes"],
        "q4_block_bytes_in_file": len(blk_w),
        "norm_bytes": norm.nbytes,
        "alignment_check_all_offsets_mod_32": all(t["abs_offset"] % 32 == 0 for t in parsed["tensors"]),
    }
    # mmap-style access: a view of one tensor without reading the whole file
    mm = np.memmap(path, dtype=np.uint8, mode="r", offset=t_q["abs_offset"], shape=(len(blk_w),))
    out["gguf"]["memmap_first_block_d_fp16"] = float(np.frombuffer(bytes(mm[:2]), dtype=np.float16)[0])

    # worked example: one block of 32 weights, by hand
    ex = np.array([0.12, -0.80, 0.33, 0.05, -0.41, 0.60, -0.02, 0.27,
                   0.00, 0.19, -0.66, 0.08, 0.44, -0.11, 0.91, -0.25,
                   0.37, -0.53, 0.14, 0.02, -0.07, 0.29, -0.38, 0.50,
                   -0.19, 0.61, 0.03, -0.46, 0.22, -0.09, 0.75, -0.31], dtype=F32_)
    dz, qz = q4_0_quantize(ex)
    deq_ex = q4_0_dequantize(dz, qz)
    qlevels = (np.concatenate([(qz & 0x0F), (qz >> 4)], axis=1)).reshape(-1)
    out["worked_block"] = {
        "input": [float(v) for v in ex],
        "argmax_abs_index": int(np.argmax(np.abs(ex))),
        "signed_max": float(ex[np.argmax(np.abs(ex))]),
        "d_fp32": float(ex[np.argmax(np.abs(ex))] / -8),
        "d_fp16": float(dz[0]),
        "levels_0_to_15_in_element_order": [int(v) for v in qlevels],
        "first_8_packed_bytes_hex": qz[0, :8].tobytes().hex(" "),
        "dequant_first_8": [float(v) for v in deq_ex[:8]],
        "max_abs_error": float(np.max(np.abs(deq_ex - ex))),
        "rmse": float(np.sqrt(np.mean((deq_ex - ex) ** 2))),
    }

    # ------------------------------------------------ 3. error on Gaussian weights vs outlier-heavy weights
    N = 1 << 16
    gauss = rng.standard_normal(N).astype(F32_)
    outl = gauss.copy()
    hit = rng.choice(N, size=N // 1000, replace=False)  # 0.1% of entries become outliers
    outl[hit] *= F32_(20.0)

    def stats(x, xh):
        e = xh - x
        return {"rmse": float(np.sqrt(np.mean(e ** 2))),
                "rel_rmse": float(np.sqrt(np.mean(e ** 2)) / np.std(x)),
                "max_abs": float(np.max(np.abs(e)))}

    res = {}
    for label, x in [("gaussian", gauss), ("outliers", outl)]:
        r = {}
        d16, qs = q4_0_quantize(x)
        assert np.array_equal(q4_0_dequantize(d16, qs), sym4_blocks_dequant(x, 32))
        r["Q4_0 (block 32)"] = stats(x, q4_0_dequantize(d16, qs))
        r["Q8_0 (block 32)"] = stats(x, q8_0_dequantize(*q8_0_quantize(x)))
        r["4-bit, block 256"] = stats(x, sym4_blocks_dequant(x, 256))
        r["4-bit, one block (whole tensor)"] = stats(x, sym4_blocks_dequant(x, N))
        res[label] = r
    out["error"] = res
    out["error_setup"] = {"n_weights": N, "outlier_fraction": 0.001, "outlier_scale": 20.0, "seed": 0}

    # ------------------------------------------------ 4. dot product in the llama.cpp style
    n = 4096
    w = (rng.standard_normal(n) * 0.02).astype(F32_)
    a = rng.standard_normal(n).astype(F32_)
    dw, qw = q4_0_quantize(w)
    da, qa = q8_0_quantize(a)
    lo = (qw & 0x0F).astype(np.int32) - 8
    hi = (qw >> 4).astype(np.int32) - 8
    wq = np.concatenate([lo, hi], axis=1)                       # (blocks, 32) signed levels
    sumi = np.sum(wq * qa.astype(np.int32), axis=1)             # exact integer work per block
    blockwise = float(np.sum(sumi.astype(F32_) * dw.astype(F32_) * da.astype(F32_)))
    via_dequant = float(np.dot(q4_0_dequantize(dw, qw), q8_0_dequantize(da, qa)))
    exact = float(np.dot(w.astype(np.float64), a.astype(np.float64)))
    out["dot"] = {
        "n": n,
        "blocks": n // 32,
        "blockwise_int_path": blockwise,
        "dequantize_then_float_dot": via_dequant,
        "exact_fp64_dot": exact,
        "abs_gap_blockwise_vs_dequant": abs(blockwise - via_dequant),
        "abs_error_blockwise_vs_exact": abs(blockwise - exact),
        "first_block_sumi": int(sumi[0]),
        "first_block_d_w": float(dw[0]),
        "first_block_d_a": float(da[0]),
    }

    # spread of the dot-product error over 300 random rows (one draw can be a 2-sigma outlier)
    rng2 = np.random.default_rng(2)
    errs, preds = [], []
    for _ in range(300):
        w2 = (rng2.standard_normal(n) * 0.02).astype(F32_)
        a2 = rng2.standard_normal(n).astype(F32_)
        d2, q2 = q4_0_quantize(w2)
        ew = q4_0_dequantize(d2, q2) - w2
        errs.append(float(np.dot(ew.astype(np.float64), a2.astype(np.float64))))
        preds.append(float(np.sqrt(np.sum(ew.astype(np.float64) ** 2))))
    out["dot"]["error_sd_300_rows_empirical"] = float(np.std(errs))
    out["dot"]["error_sd_predicted_sqrt_sum_ew2_mean"] = float(np.mean(preds))

    # ------------------------------------------------ 5. record environment
    out["numpy_version"] = np.__version__
    with open(os.path.join(HERE, "32.3_data.json"), "w") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
