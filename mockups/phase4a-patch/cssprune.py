"""Drop CSS that only applies to the retired classic themes (dark / light / instrument).
A selector is classic-only when it names data-theme dark|light|instrument and not bench, or
says :not([data-theme="bench"]). Rules whose selectors are all classic-only go; mixed lists
lose just the classic selectors. @media blocks are pruned inside and dropped when empty."""
import re
CLASSIC = re.compile(r'data-theme="(dark|light|instrument)"')
NOTBENCH = ':not([data-theme="bench"])'

def split_sel(sel):
    out, depth, cur = [], 0, ""
    for ch in sel:
        if ch in "([": depth += 1
        elif ch in ")]": depth -= 1
        if ch == "," and depth == 0:
            out.append(cur); cur = ""
        else:
            cur += ch
    out.append(cur)
    return out

def classic_only(s):
    if NOTBENCH in s: return True
    return bool(CLASSIC.search(s)) and 'data-theme="bench"' not in s

def match_brace(css, i):
    """css[i] == '{' -> index of the matching '}' (ignores braces in comments/strings roughly)"""
    depth = 0; j = i
    while j < len(css):
        c = css[j]
        if css.startswith("/*", j):
            j = css.index("*/", j) + 2; continue
        if c in "\"'":
            k = css.index(c, j + 1); j = k + 1; continue
        if c == "{": depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0: return j
        j += 1
    raise ValueError("unbalanced")

def prune(css, stats):
    out = []; i = 0; n = len(css)
    while i < n:
        # copy whitespace / comments through
        m = re.match(r'\s+', css[i:])
        if m: out.append(m.group(0)); i += len(m.group(0)); continue
        if css.startswith("/*", i):
            k = css.index("*/", i) + 2; out.append(css[i:k]); i = k; continue
        b = css.find("{", i)
        if b < 0: out.append(css[i:]); break
        head = css[i:b]; e = match_brace(css, b); body = css[b+1:e]
        if head.strip().startswith("@media") or head.strip().startswith("@supports"):
            inner = prune(body, stats)
            if inner.strip(): out.append(head + "{" + inner + "}")
            else: stats["media"] += 1
        elif head.strip().startswith("@"):
            out.append(css[i:e+1])
        else:
            sels = split_sel(head)
            keep = [s for s in sels if not classic_only(s)]
            if not keep: stats["rules"] += 1
            else:
                if len(keep) < len(sels):
                    stats["sels"] += len(sels) - len(keep)
                    lead = re.match(r'\s*', head).group(0)
                    head = lead + ",".join(s.strip() for s in keep)
                out.append(head + "{" + body + "}")
        i = e + 1
    return "".join(out)

if __name__ == "__main__":
    import sys, glob
    tot = {"rules": 0, "sels": 0, "media": 0}
    for p in sorted(glob.glob(sys.argv[1] + "/src/css/*.css")):
        s = open(p, encoding="utf-8").read(); st = {"rules": 0, "sels": 0, "media": 0}
        t = prune(s, st)
        if "--write" in sys.argv: open(p, "w", encoding="utf-8", newline="\n").write(t)
        print(p.split("/")[-1].split("\\")[-1], st, len(s), "->", len(t))
        for k in tot: tot[k] += st[k]
    print("total", tot)
