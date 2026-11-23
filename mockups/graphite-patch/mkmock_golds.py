# builds demand-desk/mockups/gold.html — alternatives to the gold pen (In progress · QA · waiting), on invented data; nothing saved
D = r"C:/Users/Aditya/Desktop/Aditya/Claude/demand-desk/"
s = open(D + "DemandDesk.html", encoding="utf-8").read()
mock = open(D + "mockups/mockdata.js", encoding="utf-8").read()
# key, label, light, dark, note
P = [("ochre","Ochre (today)","#B07500","#E0A526","Today's gold. On white it leans olive and reads muddy."),
     ("amber","Amber","#C27500","#F5A623","The colour of your 'Connect' sample on Backlit; on Paper the same amber, deepened just enough to read as text."),
     ("marigold","Marigold","#B86400","#F29B38","A touch more orange — warm and clear, still well away from the red of Bug."),
     ("saffron","Saffron","#CF7A12","#FFB24D","The brightest of the four — lively on white, glowing on Backlit; thinnest as small text on Paper."),
     ("honey","Honey","#B98510","#F2BE4A","Yellower and lighter than today's ochre, but clean, without the olive cast.")]
css = "\n".join(f'''  :root[data-theme="bench"][data-gold="{k}"]{{--pen-4:{l};--watch:{l};}}
  :root[data-theme="bench"][data-mode="dark"][data-gold="{k}"]{{--pen-4:{d};--watch:{d};}}''' for k,_,l,d,_n in P if k!="ochre")
css += r'''
  #mockPanel{position:fixed;right:14px;bottom:34px;width:350px;z-index:90;background:var(--paper);color:var(--ink);border:2px solid var(--pen-2);border-radius:6px;padding:12px 14px;font-size:12.5px;box-shadow:0 8px 30px rgba(0,0,0,.25)}
  #mockPanel.min .body{display:none}
  #mockPanel .h{display:flex;justify-content:space-between;align-items:center}
  #mockPanel .h b{letter-spacing:.14em;font-size:10.5px}
  #mockPanel .t{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin:10px 0 6px}
  #mockPanel .t button.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
  #mockPanel .sw{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}
  #mockPanel p{color:var(--ink-2);margin:6px 0 8px;line-height:1.5;font-size:11.5px}
  #mockPanel .go{display:flex;flex-wrap:wrap;gap:4px}
'''
PANEL = r'''
/* ---------- mockup: gold-pen switcher ---------- */
const MOCK_P=%P%;
function mockPen(k){if(k==="ochre")document.documentElement.removeAttribute("data-gold");else document.documentElement.setAttribute("data-gold",k);DK.readColors();renderApp();mockPanel();}
function mockPanel(){let p=document.getElementById("mockPanel");if(!p){p=document.createElement("div");p.id="mockPanel";document.body.appendChild(p);}
  const cur=document.documentElement.getAttribute("data-gold")||"ochre",dark=document.documentElement.getAttribute("data-mode")==="dark",T=MOCK_P.find(x=>x[0]===cur);
  p.innerHTML=`<div class="h"><b>MOCKUP · THE GOLD PEN</b><button class="sm ghost" id="mkMin">${p.classList.contains("min")?"Show":"Hide"}</button></div><div class="body">
    <div class="t">${MOCK_P.map(([k,l,c,d])=>`<button class="sm ${k===cur?"on":""}" data-k="${k}"><span class="sw" style="background:${dark?d:c}"></span>${l.replace(" (today)","")}</button>`).join("")}</div>
    <p><b>${esc(T[1])}</b> — ${esc(T[4])} It changes In progress, the QA tier, waiting and warnings, everywhere. Invented sample data; nothing is read or saved.</p>
    <div class="go">${[["Today","today"],["Demands","demands"],["Transports","transports"],["Effort","effort"],["Review","review"]].map(([l,v])=>`<button class="sm" data-v="${v}">${l}</button>`).join("")}<button class="sm" id="mkMode">${dark?"☀ Paper":"🌙 Backlit"}</button></div></div>`;
  p.querySelector("#mkMin").onclick=()=>{p.classList.toggle("min");mockPanel();};
  p.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>mockPen(b.dataset.k));
  p.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{view=b.dataset.v;if(view==="demands"){activeId="m1";activeTab="overview";}renderApp();});
  p.querySelector("#mkMode").onclick=()=>{applyTheme(dark?"bench-paper":"bench-backlit");lastTind=null;renderApp();mockPanel();};}
'''.replace("%P%", "[" + ",".join(f'["{k}","{l}","{a}","{b}","{n}"]' for k,l,a,b,n in P) + "]")
a = "const SELFTEST=/[?&]selftest\\b/.test(location.search);"
assert s.count(a) == 1
s = s.replace(a, "const SELFTEST=true;   /* MOCKUP: a sandbox — invented data, nothing is read or saved */")
b = "  if(SELFTEST){seedState();renderApp();runSelfTest();return;}"
assert s.count(b) == 1
s = s.replace(b, """  if(SELFTEST){state=migrate(mockData());applyTheme("bench-paper");document.documentElement.setAttribute("data-gold","amber");DK.readColors();view="demands";activeId="m1";activeTab="overview";renderApp();mockPanel();return;}""")
c = "boot();\n</script>"
assert s.count(c) == 1
s = s.replace(c, mock + "\n" + PANEL + "\nboot();\n</script>")
i = s.index("</style>")
s = s[:i] + css + s[i:]
s = s.replace("<title>Demand Desk", "<title>MOCKUP · Demand Desk", 1)
open(D + "mockups/gold2.html", "w", encoding="utf-8", newline="\n").write(s)
print("mockup written")
