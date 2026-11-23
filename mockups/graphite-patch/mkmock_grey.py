# builds demand-desk/mockups/graphite.html — the app in a grey dark mode, on invented data; nothing is read or saved
D = r"C:/Users/Aditya/Desktop/Aditya/Claude/demand-desk/"
s = open(D + "DemandDesk.html", encoding="utf-8").read()
mock = open(D + "mockups/mockdata.js", encoding="utf-8").read()

TONES = r'''
  /* MOCKUP: grey dark tones (data-tone on <html>); "Backlit" = today's near-black */
  :root[data-theme="bench"][data-mode="dark"][data-tone="graphite"]{
    --paper:#393A3E; --paper-2:#404145; --grid-dot:#4D4F55; --rule:#4A4B50; --rule-strong:#5A5C62;
    --ink:#EEEEF0; --ink-2:#C4C6CB; --ink-3:#94979E; --ink-4:#63666D;
    --pen-1:#FF7A5F; --pen-2:#82A8F5; --pen-3:#4ED3AF; --pen-4:#F2BD45; --pen-5:#BB98F0; --pen-6:#F7925A; --pen-7:#6BD0EA; --pen-8:#EE86BB;
    --good:#4ED3AF; --watch:#F2BD45; --bad:#FF7A5F;
  }
  :root[data-theme="bench"][data-mode="dark"][data-tone="charcoal"]{
    --paper:#232428; --paper-2:#2A2B30; --grid-dot:#36383E; --rule:#333439; --rule-strong:#44464C;
    --ink:#EAEBEE; --ink-2:#B4B7BE; --ink-3:#80838B; --ink-4:#4E5158;
    --pen-1:#FF6648; --pen-2:#6E9AF1; --pen-3:#38CBA4; --pen-4:#E8B035; --pen-5:#AE88EC; --pen-6:#F4844A; --pen-7:#5CC9E5; --pen-8:#E878B0;
    --good:#38CBA4; --watch:#E8B035; --bad:#FF6648;
  }
  #mockPanel{position:fixed;right:14px;bottom:34px;width:330px;z-index:90;background:var(--paper);color:var(--ink);border:2px solid var(--pen-2);border-radius:6px;padding:12px 14px;font-size:12.5px;box-shadow:0 8px 30px rgba(0,0,0,.35)}
  #mockPanel.min .body{display:none}
  #mockPanel .h{display:flex;justify-content:space-between;align-items:center;gap:8px}
  #mockPanel .h b{letter-spacing:.14em;font-size:10.5px}
  #mockPanel .t{display:flex;gap:5px;margin:10px 0 6px}
  #mockPanel .t button{flex:1}
  #mockPanel .t button.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}
  #mockPanel .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px;border:1px solid var(--rule-strong)}
  #mockPanel p{color:var(--ink-2);margin:6px 0 8px;line-height:1.5;font-size:11.5px}
  #mockPanel .go{display:flex;flex-wrap:wrap;gap:4px}
'''
PANEL = r'''
/* ---------- mockup: tone switcher ---------- */
const MOCK_TONES=[["graphite","Graphite","#393A3E","The grey you liked: about the colour of the faded tile in the marks mockup. Softer, more like a lit instrument panel than a black screen."],
  ["charcoal","Charcoal","#232428","Half way between: still clearly dark, but no longer black."],["backlit","Backlit","#0E0F12","Today's near-black, for comparison."]];
function mockTone(k){if(k==="backlit")document.documentElement.removeAttribute("data-tone");else document.documentElement.setAttribute("data-tone",k);
  DK.readColors();renderApp();mockPanel();}
function mockPanel(){let p=document.getElementById("mockPanel");if(!p){p=document.createElement("div");p.id="mockPanel";document.body.appendChild(p);}
  const cur=document.documentElement.getAttribute("data-tone")||"backlit",T=MOCK_TONES.find(x=>x[0]===cur);
  p.innerHTML=`<div class="h"><b>MOCKUP · DARK TONE</b><button class="sm ghost" id="mkMin">${p.classList.contains("min")?"Show":"Hide"}</button></div><div class="body">
    <div class="t">${MOCK_TONES.map(([k,l,c])=>`<button class="sm ${k===cur?"on":""}" data-k="${k}"><span class="sw" style="background:${c}"></span>${l}</button>`).join("")}</div>
    <p>${T[3]} Paper stays as it is. Invented sample data; nothing is read or saved.</p>
    <div class="go">${[["Today","today"],["Demand","demands"],["Transports","transports"],["Effort","effort"],["Review","review"],["Tasks","jobs"]].map(([l,v])=>`<button class="sm" data-v="${v}">${l}</button>`).join("")}<button class="sm" id="mkDlg">A dialog</button><button class="sm" id="mkPaper">Paper ↔ dark</button></div></div>`;
  p.querySelector("#mkMin").onclick=()=>{p.classList.toggle("min");mockPanel();};
  p.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>mockTone(b.dataset.k));
  p.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{document.getElementById("modalRoot").innerHTML="";view=b.dataset.v;if(view==="demands"){activeId="m1";activeTab="overview";}if(view==="jobs")activeJobId="j1";renderApp();});
  p.querySelector("#mkDlg").onclick=()=>{view="demands";activeId="m1";renderApp();openTaskModal(state.tasks.find(t=>t.id==="m1"));};
  p.querySelector("#mkPaper").onclick=()=>{const d=document.documentElement.getAttribute("data-mode")==="dark";applyTheme(d?"bench-paper":"bench-backlit");lastTind=null;renderApp();mockPanel();};}
'''
a = "const SELFTEST=/[?&]selftest\\b/.test(location.search);"
assert s.count(a) == 1
s = s.replace(a, "const SELFTEST=true;   /* MOCKUP: a sandbox — invented data, nothing is read or saved */")
b = "  if(SELFTEST){seedState();renderApp();runSelfTest();return;}"
assert s.count(b) == 1
s = s.replace(b, """  if(SELFTEST){state=migrate(mockData());applyTheme("bench-backlit");document.documentElement.setAttribute("data-tone","graphite");DK.readColors();renderApp();mockPanel();return;}""")
c = "boot();\n</script>"
assert s.count(c) == 1
s = s.replace(c, mock + "\n" + PANEL + "\nboot();\n</script>")
d = "</style>"
i = s.index(d)
s = s[:i] + TONES + s[i:]
s = s.replace("<title>Demand Desk", "<title>MOCKUP · Demand Desk", 1)
open(D + "mockups/graphite.html", "w", encoding="utf-8", newline="\n").write(s)
print("mockup written")
