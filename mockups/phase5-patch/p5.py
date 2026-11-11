"""Phase 5 — memory and looking back: Seen before, pasted Excel rows (data v33), a readable copy by year.
Usage: python p5.py <demand-desk root>"""
import sys, shutil, os, re
ROOT = sys.argv[1].rstrip("/\\") + "/"
HERE = os.path.dirname(os.path.abspath(__file__)) + "/"
S = ROOT + "src/js/"
def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="\n").write(s)
def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, f"expected {n}, found {c}: {a[:100]!r}"
    return s.replace(a, b)

shutil.copy(HERE + "14g-memory.js", S + "14g-memory.js")
shutil.copy(HERE + "13-memory.css", ROOT + "src/css/13-memory.css")

p = S + "14e-icons.js"; s = rd(p)
s = rep(s, """  flagf:"M4.5 16V2.5M4.5 3h9l-1.8 3 1.8 3h-9"};""", """  flagf:"M4.5 16V2.5M4.5 3h9l-1.8 3 1.8 3h-9",
  books:"M3 3h3v12H3zM7 3h3v12H7zM11.2 3.6l2.9-.8 2.9 11.6-2.9.8z",
  download:"M9 2.5v9M5.5 8L9 11.5 12.5 8M3 14.5h12",
  upload:"M9 11.5v-9M5.5 6L9 2.5 12.5 6M3 14.5h12"};""")
s = rep(s, """"☑":"checkbox","☐":"box0","⚑":"flagf"};""", """"☑":"checkbox","☐":"box0","⚑":"flagf","📚":"books","⬇":"download","⬆":"upload"};""")
wr(p, s)

p = S + "01-core.js"; s = rd(p)
s = rep(s, "const DATA_VERSION=32;", "const DATA_VERSION=33;")
s = rep(s, "let state={version:DATA_VERSION,people:[],jobs:[],", "let state={version:DATA_VERSION,people:[],jobs:[],sheets:[],")
s = rep(s, "  d.todos=[];", "  d.todos=[];\n  /* v33: rows pasted from Excel, kept as searchable notes */\n  d.sheets=(d.sheets||[]).map(normSheet);")
s = rep(s, "function contentCount(){return (state.jobs||[]).length+", "function contentCount(){return (state.jobs||[]).length+(state.sheets||[]).length+")
wr(p, s)

p = S + "19-bench-demands.js"; s = rd(p)
s = rep(s, "${notesRailHTML(t)}", "${seenRailHTML(t)}${notesRailHTML(t)}")
s = rep(s, "const q=s=>host.querySelector(s);wireNotesRail(host,t);", "const q=s=>host.querySelector(s);wireNotesRail(host,t);wireSeen(host,seenForDemand(t));")
s = rep(s, 'host.querySelectorAll(".lk:not(.cx-note)")', 'host.querySelectorAll(".lk:not(.cx-note):not(.sb-r)")')
wr(p, s)

p = S + "09-journal.js"; s = rd(p)
s = rep(s, """      <div id="j-imgs" style="margin-top:18px"></div></div>`;""", """      <div id="j-seen"></div>
      <div id="j-imgs" style="margin-top:18px"></div></div>`;""")
s = rep(s, "  drawJournalChips(j);\n", """  drawJournalChips(j);drawJournalSeen(j);
  host.querySelector("#j-body").addEventListener("input",e=>{clearTimeout(drawJournalSeen._t);const v=e.target.value;drawJournalSeen._t=setTimeout(()=>drawJournalSeen({...j,body:v}),700);});
""")
wr(p, s)

p = S + "23-notes-search.js"; s = rd(p)
s = rep(s, "  NOTES.forEach(n=>{if(terms.every(t=>n.low.includes(t)))", """  (state.sheets||[]).forEach(sh=>sh.rows.forEach((r,i)=>add("Sheet",`▦ ${sh.name} · ${r.filter(Boolean).slice(0,2).join(" · ").slice(0,70)}`,[r.map((c,k)=>(sh.headers[k]?sh.headers[k]+": ":"")+c).join(" · ")],sh.added,()=>{setTimeout(()=>openSheet(sh,i),0);},`row ${i+1} of ${sh.rows.length}`)));
  NOTES.forEach(n=>{if(terms.every(t=>n.low.includes(t)))""")
s = rep(s, "const SR_PEN={Task:", "const SR_PEN={Sheet:\"pen-6\",Task:")
s = rep(s, "    ${notesStatusHTML()}\n", "    ${notesStatusHTML()}\n    ${sheetsHTML()}\n")
s = rep(s, "const q=s=>host.querySelector(s),inp=q(\"#srQ\");wireNotesStatus(host);", "const q=s=>host.querySelector(s),inp=q(\"#srQ\");wireNotesStatus(host);wireSheets(host);")
wr(p, s)

p = S + "16-search-menu.js"; s = rd(p)
s = rep(s, """      <button id="mn-hand">🧳 Handover pack…</button>""", """      <button id="mn-hand">🧳 Handover pack…</button>
      <button id="mn-rc">📚 A readable copy, by year…</button>""")
s = rep(s, """  root.querySelector("#mn-hand").onclick=()=>{close();openHandover();};""", """  root.querySelector("#mn-hand").onclick=()=>{close();openHandover();};
  root.querySelector("#mn-rc").onclick=()=>{close();openReadableCopy();};""")
wr(p, s)

p = S + "14b-daily-loop.js"; s = rd(p)
s = rep(s, """check:{l:"Check in",pen:"pen-7",o:3.6},""", """check:{l:"Check in",pen:"pen-7",o:3.6},yearly:{l:"Once a year",pen:"pen-5",o:3.7},""")
s = rep(s, "  out.push(...agendaTransportItems(t0));", """  out.push(...agendaTransportItems(t0));
  if(readableCopyDue(t0))out.push({k:"yearly",date:t0,what:"Make this year's readable copy",sub:"everything as Markdown, by year",of:"📚 your data file",go:openReadableCopy,acts:[["Make it",()=>openReadableCopy(),"Write the readable copy now"]]});""")
wr(p, s)

p = S + "25-selftest.js"; s = rd(p)
s = rep(s, """   ok("Encryption warning shows while secrets are unencrypted",""", r"""   {const a=state.tasks.find(x=>x.id==="st-a"),sb=seenForDemand(a);
    ok("Seen before: demands sharing an object are found, with the object named",sb.some(h=>h.d.id==="st-c"&&h.why.includes("ZST_SHARED_CLASS"))&&!sb.some(h=>h.d.id==="st-dbg1"),JSON.stringify(sb.map(h=>[h.d.id,h.why])));
    const j2={id:"st-j2",date:efAdd(todayStr(),-40),title:"",body:"Sample quokka wombat rollout",taskIds:[],epicIds:[],createdAt:Date.now(),updatedAt:Date.now()},m2=normMeeting({id:"st-m9",date:efAdd(todayStr(),-50),title:"Sample review",body:"quokka and wombat discussed"});
    state.journal.push(j2);state.meetings.push(m2);markDirty();const jh=seenBefore(j2.body,[],d=>d.id===j2.id);
    ok("Seen before: rarer words a journal entry shares with past meetings",jh.some(h=>h.d.id==="st-m9"&&h.why.includes("quokka")),JSON.stringify(jh.map(h=>[h.d.id,h.why])));
    state.journal=state.journal.filter(x=>x!==j2);state.meetings=state.meetings.filter(x=>x!==m2);
    const tsv=parseTSV('Col A\tCol B\n"x\ty"\t"q""z"\nlast\t\n');
    ok("Excel rows: tabs, quoted cells and blank cells read as Excel writes them",eq(tsv,[["Col A","Col B"],["x\ty",'q"z'],["last",""]]),JSON.stringify(tsv));
    const sh=normSheet({name:"ST sheet",headers:["Code"],rows:[["walrusuniquecell"]]});state.sheets=[sh];markDirty();
    ok("Excel rows: Search finds a pasted row",searchAll("walrusuniquecell").some(h=>h.k==="Sheet"));state.sheets=[];markDirty();
    const F=rcFiles(),y=(a.receivedDate||"").slice(0,4),key=`${y}/Demands/ST-1 Sample report gets a filter.md`,all=JSON.stringify(F);
    ok("A readable copy: Markdown by year, secrets left out",!!F[key]&&F[key].includes("# ST-1 — Sample report gets a filter")&&!!F["README.md"]&&!all.includes("not-a-real-secret")&&!all.includes("not-a-real-password"),Object.keys(F).slice(0,6).join(" · "));
    ok("The readable copy is asked for once a year, around New Year only",!readableCopyDue("2026-07-01")&&!readableCopyDue("2026-12-01"));}
   ok("Encryption warning shows while secrets are unencrypted",""")
s = rep(s, """["Keyboard",()=>openKeys()],""", """["Keyboard",()=>openKeys()],["A readable copy",()=>openReadableCopy()],["Paste rows from Excel",()=>openPasteSheet()],""")
wr(p, s)
print("phase 5 patch applied to", ROOT)
