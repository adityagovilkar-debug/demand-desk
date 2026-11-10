"""Builds DemandDesk.html from src/ — the shell, then every src/css/*.css and src/js/*.js in name order.

    python build.py           write DemandDesk.html
    python build.py --check   exit 1 if DemandDesk.html doesn't match src/ (someone edited the built file)

Edit the files in src/, never DemandDesk.html: it is regenerated. The output is still one
self-contained HTML file — nothing changes for the person using it.
"""
import glob, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "DemandDesk.html")

def read(p):
    with open(p, "rb") as f:
        return f.read().decode("utf-8")

def build():
    shell = read(os.path.join(HERE, "src", "shell.html"))
    css = "".join(read(p) for p in sorted(glob.glob(os.path.join(HERE, "src", "css", "*.css"))))
    js = "".join(read(p) for p in sorted(glob.glob(os.path.join(HERE, "src", "js", "*.js"))))
    for mark in ("/*@@CSS@@*/\n", "/*@@JS@@*/\n"):
        if shell.count(mark) != 1:
            sys.exit(f"src/shell.html must contain {mark.strip()} exactly once")
    return shell.replace("/*@@CSS@@*/\n", css).replace("/*@@JS@@*/\n", js)

if __name__ == "__main__":
    html = build()
    if "--check" in sys.argv:
        same = os.path.exists(OUT) and read(OUT) == html
        print("DemandDesk.html matches src/" if same else "DemandDesk.html differs from src/ — run build.py (and don't edit the built file)")
        sys.exit(0 if same else 1)
    with open(OUT, "wb") as f:
        f.write(html.encode("utf-8"))
    print(f"built DemandDesk.html — {len(html.splitlines())} lines, {len(html.encode('utf-8')) // 1024} KB")
