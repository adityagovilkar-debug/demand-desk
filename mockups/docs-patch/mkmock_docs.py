# builds demand-desk/mockups/documents.html — the documents checklist on invented data; nothing is read or saved
D = r"C:/Users/Aditya/Desktop/Aditya/Claude/demand-desk/"
SP = r"C:/Users/Aditya/AppData/Local/Temp/claude/223641597c3e10ea/b40f911a-65ea-4f8d-a409-2af0ca26f3fe/scratchpad/"
s = open(SP + "p9try3/DemandDesk.html", encoding="utf-8").read()
mock = open(D + "mockups/mockdata.js", encoding="utf-8").read()
EXTRA = r'''
function mockDataDocs(){const d=mockData(),t=id=>d.tasks.find(x=>x.id===id);
  t("m1").docs={ts:{state:"todo"},ut:{state:"todo"},fs:[{title:"FS Payroll report — cost-centre selection v2",by:"Payroll team",url:"https://example.invalid/sites/payroll/FS_10421_v2.docx"}]};
  t("m6").docs={ts:{state:"done",url:"https://example.invalid/sites/hr/TS_10402.docx",date:efAdd(todayStr(),-20)},ut:{state:"todo"},fs:[]};
  t("m8").docs={ts:{state:"done",url:"https://example.invalid/sites/hr/TS_10310.docx",date:efAdd(todayStr(),-70)},ut:{state:"na"},fs:[{title:"FS Pension extract",by:"Pensions desk",url:""}]};
  return d;}
const MOCK_NOTES=[
 ["A delivered demand without its documents","10388 was delivered with no tech spec or unit test: the Documents box sits at the top of Overview with a red edge, its card says ‘docs missing’, and Today asks until they're done. Paste a link and it's done; or mark one Not needed.",()=>{view="demands";activeId="m5";activeTab="overview";renderApp();}],
 ["Delivering opens the checklist","Show me moves 10421 to Delivered — the checklist opens on its own (from the status buttons, the board or ✎ Edit alike). ‘Later — remind me’ leaves it on Today.",()=>{view="demands";activeId="m1";activeTab="overview";renderApp();setTimeout(()=>setDemandStatus(state.tasks.find(x=>x.id==="m1"),"delivered"),300);}],
 ["Functional specs by others","Any number per demand — title, who wrote it, the link. 10421 has one; ＋ Add for more. They're searchable and go into the readable copy.",()=>{view="demands";activeId="m1";activeTab="overview";renderApp();setTimeout(()=>{const u=document.getElementById("ovDocs");if(u)u.scrollIntoView({block:"center"});},200);}],
 ["Side panel","A Documents box above Reference: each document's state, with ↗ to open it.",()=>{view="demands";activeId="m6";activeTab="overview";renderApp();}],
 ["On Today","Delivered demands still missing a document, counted from the day they were delivered, with ‘Add links’ right there.",()=>{view="today";renderApp();setTimeout(()=>{const a=document.getElementById("agenda");if(a)a.scrollIntoView({block:"start"});},200);}],
 ["Every one that's missing","The demand list's quick view ‘Docs missing’ (also in ⚙ View → Only): every delivered or closed demand without its documents — the backlog to catch up on.",()=>{dvSet({group:"none",sort:"due",only:["docs"]});view="demands";activeId="m5";renderApp();}]];
function mockPanel(){let p=document.getElementById("mockPanel");if(!p){p=document.createElement("div");p.id="mockPanel";document.body.appendChild(p);}
  p.innerHTML=`<div class="h"><b>MOCKUP · DOCUMENTS</b><button class="sm ghost" id="mkMin">${p.classList.contains("min")?"Show":"Hide"}</button></div><div class="body"><p>The tech spec and the unit test document as part of finishing a demand, with links, plus functional specs by others. Invented sample data; nothing is read or saved.</p><ol>${MOCK_NOTES.map(([t,d],i)=>`<li><b>${t}</b><span>${d}</span><button class="sm" data-i="${i}">Show me</button></li>`).join("")}</ol></div>`;
  p.querySelector("#mkMin").onclick=()=>{p.classList.toggle("min");mockPanel();};
  p.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{document.getElementById("modalRoot").innerHTML="";MOCK_NOTES[+b.dataset.i][2]();});}
'''
CSS = r'''
  #mockPanel{position:fixed;right:14px;bottom:34px;width:380px;max-height:calc(100vh - 110px);overflow:auto;z-index:90;background:var(--paper);color:var(--ink);border:2px solid var(--pen-2);border-radius:6px;padding:12px 14px;font-size:12.5px;box-shadow:0 8px 30px rgba(0,0,0,.25)}
  #mockPanel.min .body{display:none}#mockPanel .h{display:flex;justify-content:space-between;align-items:center}#mockPanel .h b{letter-spacing:.14em;font-size:10.5px}
  #mockPanel p{color:var(--ink-2);font-size:11.5px;margin:6px 0 8px}#mockPanel ol{margin:0;padding-left:18px}#mockPanel li{margin:0 0 10px;line-height:1.45}
  #mockPanel li b{display:block}#mockPanel li span{display:block;color:var(--ink-2)}#mockPanel li button{margin-top:4px}
'''
a = "const SELFTEST=/[?&]selftest\\b/.test(location.search);"; assert s.count(a) == 1
s = s.replace(a, "const SELFTEST=true;window.stDocsPrompt=true;   /* MOCKUP: a sandbox — invented data, nothing is read or saved */")
b = "  if(SELFTEST){seedState();renderApp();runSelfTest();return;}"; assert s.count(b) == 1
s = s.replace(b, """  if(SELFTEST){state=migrate(mockDataDocs());applyTheme("bench-paper");view="demands";activeId="m5";activeTab="overview";renderApp();mockPanel();return;}""")
c = "boot();\n</script>"; assert s.count(c) == 1
s = s.replace(c, mock + "\n" + EXTRA + "\nboot();\n</script>")
i = s.index("</style>"); s = s[:i] + CSS + s[i:]
s = s.replace("<title>Demand Desk", "<title>MOCKUP · Demand Desk", 1)
open(D + "mockups/documents.html", "w", encoding="utf-8", newline="\n").write(s)
print("mockup written")
