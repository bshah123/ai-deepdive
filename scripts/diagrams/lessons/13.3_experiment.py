# Experiment for lesson 13.3 (virtual environments, site-packages, module search path).
# Run: <python> scripts/diagrams/lessons/13.3_experiment.py <scratch-work-dir>
# Writes every number used in the lesson and its diagrams to 13.3_data.json (paths normalised).
import json, os, shutil, subprocess, sys, site
from pathlib import Path

WORK = Path(sys.argv[1]).resolve()
WORK.mkdir(parents=True, exist_ok=True)
HERE = Path(__file__).resolve().parent
BASE = getattr(sys, "_base_executable", sys.executable)   # the interpreter a venv was built from
ENV = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")       # no .pyc files, so file counts are stable
out = {"python": sys.version.split()[0], "platform": sys.platform}

def norm(s):
    return s.replace(str(WORK), "<work>").replace(str(Path.home()), "~")

def run(args, cwd=None, env=None):
    p = subprocess.run([str(a) for a in args], capture_output=True, text=True,
                       cwd=cwd or WORK, env=env or ENV)
    return p.returncode, norm(p.stdout), norm(p.stderr)

PROBE = r'''
import json, site, sys
print(json.dumps({"prefix": sys.prefix, "base_prefix": sys.base_prefix,
                  "executable": sys.executable, "sys_path": sys.path,
                  "sitepackages": site.getsitepackages()}))
'''

def probe(py, cwd=None, env=None):
    code, so, se = run([py, "-c", PROBE], cwd=cwd, env=env)
    assert code == 0, se
    d = json.loads(so)
    d["sys_path"] = ["(cwd)" if p == "" else norm(p) for p in d["sys_path"]]
    d["prefix"], d["base_prefix"] = norm(d["prefix"]), norm(d["base_prefix"])
    d["sitepackages"] = [norm(p) for p in d["sitepackages"]]
    d["executable"] = norm(d["executable"])
    return d

# ---- A. The interpreter we are running in (a uv-built venv) ------------------
here = probe(sys.executable, env=os.environ.copy() | {"PYTHONDONTWRITEBYTECODE": "1"})
out["outer_in_venv"] = here["prefix"] != here["base_prefix"]
out["outer_sitepackages_count"] = len(here["sitepackages"])
cfg = Path(sys.prefix) / "pyvenv.cfg"
out["outer_pyvenv_cfg_keys"] = [l.split("=")[0].strip() for l in cfg.read_text().splitlines() if "=" in l]

# ---- B. Two fresh venvs built with the standard venv module -----------------
va, vb = WORK / "venv_a", WORK / "venv_b"
for d in (va, vb):
    shutil.rmtree(d, ignore_errors=True)
c1 = run([BASE, "-m", "venv", va])[0]
c2 = run([BASE, "-m", "venv", "--system-site-packages", vb])[0]
out["venv_create_exit"] = [c1, c2]
py_a, py_b = va / "bin" / "python", vb / "bin" / "python"
out["venv_cfg_a"] = [l.split(" = ")[0].strip() + " = " + l.split(" = ")[1].strip()
                     for l in (va / "pyvenv.cfg").read_text().splitlines() if " = " in l]
out["venv_cfg_b_system_site"] = [l for l in (vb / "pyvenv.cfg").read_text().splitlines()
                                 if l.startswith("include-system-site-packages")]

pa = probe(py_a)
out["a_in_venv"] = pa["prefix"] != pa["base_prefix"]
out["a_prefix"], out["a_base_prefix"] = pa["prefix"], pa["base_prefix"]
out["a_sys_path"] = pa["sys_path"]
out["a_sitepackages"] = pa["sitepackages"]
out["a_sys_path_len"] = len(pa["sys_path"])
out["a_sitepackages_index"] = pa["sys_path"].index(pa["sitepackages"][0])
pb = probe(py_b)
out["b_sitepackages"] = pb["sitepackages"]
out["b_sitepackages_count"] = len(pb["sitepackages"])
out["b_extra_system_entries"] = len(pb["sitepackages"]) - 1
out["b_sys_path_len"] = len(pb["sys_path"])

# what a fresh venv contains, measured
code, so, _ = run([py_a, "-m", "pip", "--version"])
out["pip_version_line"] = so.strip()
code, so, _ = run([py_a, "-m", "pip", "list", "--format=json"])
out["a_pip_list"] = sorted(p["name"] for p in json.loads(so))
sp = va / "lib" / "python3.12" / "site-packages"
files = [p for p in va.rglob("*") if p.is_file()]
out["a_file_count"] = len(files)
out["a_total_kib"] = round(sum(p.stat().st_size for p in files) / 1024)
out["a_site_packages_top"] = sorted(p.name for p in sp.iterdir() if not p.name.endswith(".dist-info"))

# ---- C. Activation is optional: run with an empty environment ---------------
bare = {"PATH": "/usr/bin:/bin", "HOME": str(Path.home()), "PYTHONDONTWRITEBYTECODE": "1"}
pbare = probe(py_a, env=bare)
out["no_activate_in_venv"] = pbare["prefix"] == pa["prefix"]
out["no_activate_path_has_venv_bin"] = any(str(va / "bin") in x for x in bare["PATH"].split(":"))

# ---- D. Shadowing: a local file named random.py hides the standard library --
shadow = WORK / "shadow"
shadow.mkdir(exist_ok=True)
(shadow / "random.py").write_text("print('loaded local random.py')\nvalue = 4\n")
c, so, se = run([py_a, "-c", "import random; print(random.__file__); print(hasattr(random, 'randint'))"], cwd=shadow)
out["shadow_import_stdout"] = so.strip()
c, so, se = run([py_a, "-c", "import random"], cwd=shadow)
out["shadow_import_rc"] = c
c, so, se = run([py_a, "-I", "-c", "import random; print(random.__file__)"], cwd=shadow)
out["isolated_import_stdout"] = so.strip()
c, so, se = run([py_a, "-c", "import random; print(random.randint(1, 1))"], cwd=shadow)
out["shadow_randint_stderr_last"] = se.strip().splitlines()[-1]
out["shadow_randint_rc"] = c

# ---- E. A .pth file in site-packages adds a directory to sys.path -----------
extra = WORK / "extra_dir"; extra.mkdir(exist_ok=True)
(sp / "zz_13_3_demo.pth").write_text(str(extra) + "\n")
pth = probe(py_a)
out["pth_entry_index"] = [norm(p) for p in pth["sys_path"]].index(norm(str(extra)))
out["pth_sitepackages_index"] = pth["sys_path"].index(pth["sitepackages"][0])
(sp / "zz_13_3_demo.pth").unlink()

# ---- F. Moving a venv: python still works, the pip script does not ----------
vm = WORK / "venv_moved"
shutil.rmtree(vm, ignore_errors=True)
shutil.move(str(va), str(vm))
code, so, se = run([vm / "bin" / "python", "-c", "import sys; print(sys.prefix)"])
out["moved_python_rc"] = code
out["moved_python_prefix"] = so.strip()
pip_first_line = (vm / "bin" / "pip").read_text().splitlines()[0]
out["moved_pip_shebang"] = pip_first_line
out["moved_pip_exists"] = (vm / "bin" / "pip").exists()
try:
    subprocess.run([str(vm / "bin" / "pip"), "--version"], capture_output=True, env=ENV)
    out["moved_pip_error"] = "ran"
except OSError as e:
    out["moved_pip_error"] = type(e).__name__ + ": " + e.strerror

(HERE / "13.3_data.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(json.dumps(out, indent=1, ensure_ascii=False))
