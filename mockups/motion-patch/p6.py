"""Motion — the Full level and Replay. Usage: python p6.py <demand-desk root>"""
import sys, shutil, os
ROOT = sys.argv[1].rstrip("/\\") + "/"
HERE = os.path.dirname(os.path.abspath(__file__)) + "/"
S = ROOT + "src/js/"
def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="\n").write(s)
def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, f"expected {n}, found {c}: {a[:100]!r}"
    return s.replace(a, b)

shutil.copy(HERE + "14h-motion.js", S + "14h-motion.js")
shutil.copy(HERE + "14-motion.css", ROOT + "src/css/14-motion.css")

p = S + "17-bench-look.js"; s = rd(p)
s = rep(s, """function motionOn(){const p=motionPref();return p==="full"||(p==="auto"&&!reducedMQ.matches);}""",
 """function motionOn(){const p=motionPref();return p==="full"||p==="show"||(p==="auto"&&!reducedMQ.matches);}   /* full = Calm, show = Full (14h-motion.js) */""")
s = rep(s, """function applyMotion(){document.documentElement.classList.toggle("nomotion",!motionOn());}""",
 """function applyMotion(){document.documentElement.classList.toggle("nomotion",!motionOn());document.documentElement.classList.toggle("mo-show",motionPref()==="show");}""")
wr(p, s)

p = S + "16-search-menu.js"; s = rd(p)
s = rep(s, """[["auto","Follow Windows"],["full","Full"],["off","Off"]]""", """[["auto","Follow Windows"],["full","Calm"],["show","Full"],["off","Off"]]""")
wr(p, s)

p = S + "21-review.js"; s = rd(p)
s = rep(s, """<button class="sm primary" id="rvPrint\"""", """<button class="sm" id="rvReplay" title="This period played back as a short film">▶ Replay</button><button class="sm primary" id="rvPrint\"""")
wr(p, s)

p = S + "03-today.js"; s = rd(p)
s = rep(s, """<button class="sm ghost" id="wrDone" style="margin-left:auto\"""", """<button class="sm ghost" id="wrReplay" style="margin-left:auto" title="This week played back as a short film">▶ Replay</button><button class="sm ghost" id="wrDone\"""")
wr(p, s)

p = S + "25-selftest.js"; s = rd(p)
s = rep(s, """   ok("Encryption warning shows while secrets are unencrypted",""", r"""   {const T0=todayStr(),R=replayData(efAdd(T0,-30),T0),n0=document.querySelectorAll(".rp-bg").length;openReplay(efAdd(T0,-30),T0,"Self-test");await sleep(80);const up=document.querySelectorAll(".rp-bg").length===n0+1;
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
    ok("Replay: a period plays back from the hours and events in it, and Esc closes it",R.days.length===31&&R.hrs.size>0&&R.ev.some(e=>e.k==="tr")&&up&&!document.querySelector(".rp-bg"),`days ${R.days.length} · hour-days ${R.hrs.size} · events ${R.ev.length} · opened ${up}`);
    ok("Motion: Calm and Off leave the Full-level effects out",["auto","full","off"].includes(motionPref())?!motionShow():true);}
   ok("Encryption warning shows while secrets are unencrypted",""")
wr(p, s)
print("motion patch applied to", ROOT)
