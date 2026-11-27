"""Documents per demand (tech spec, unit test, functional specs) — data v34. Usage: python p_docs.py <root>"""
import sys, shutil, os
ROOT = sys.argv[1].rstrip("/\\") + "/"; HERE = os.path.dirname(os.path.abspath(__file__)) + "/"; S = ROOT + "src/js/"
def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="\n").write(s)
def rep(s, a, b, n=1):
    c = s.count(a); assert c == n, f"expected {n}, found {c}: {a[:100]!r}"; return s.replace(a, b)
shutil.copy(HERE + "14i-docs.js", S + "14i-docs.js"); shutil.copy(HERE + "16-docs.css", ROOT + "src/css/16-docs.css")

p = S + "01-core.js"; s = rd(p)
s = rep(s, "const DATA_VERSION=33;", "const DATA_VERSION=34;")
s = rep(s, "estimate:(+t.estimate>0?Math.round(+t.estimate*4)/4:0),", "estimate:(+t.estimate>0?Math.round(+t.estimate*4)/4:0),docs:normDocs(t.docs),   /* v34: tech spec, unit test, functional specs */")
wr(p, s)

p = S + "19-bench-demands.js"; s = rd(p)
s = rep(s, """  {const pb=body.querySelector("#ovPins");if(pb)drawPinned(pb,t,(t.reference||[]).filter(r=>r.pinned));}""",
 """  {const pb=body.querySelector("#ovPins");if(pb)drawPinned(pb,t,(t.reference||[]).filter(r=>r.pinned));}
  /* documents: at the top once the demand is delivered, at the foot before that */
  body.insertAdjacentHTML(docsApply(t)?"afterbegin":"beforeend",docsUnitHTML(t));drawDocsUnit(t);""")
s = rep(s, """    <div class="ck-unit cxs"><div class="ck-head"><h2>Reference</h2>""", """    ${docsRailHTML(t)}
    <div class="ck-unit cxs"><div class="ck-head"><h2>Reference</h2>""")
s = rep(s, "const q=s=>host.querySelector(s);wireNotesRail(host,t);", """const q=s=>host.querySelector(s);wireNotesRail(host,t);
  {const dl=q("#cxDocs");if(dl)dl.onclick=()=>{activeTab="overview";renderDetail();setTimeout(()=>{const u=document.getElementById("ovDocs");if(u)u.scrollIntoView({block:"start",behavior:motionOn()?"smooth":"auto"});},60);};}""")
s = rep(s, "${na?btag(`⏰", """${docsDue(t)?btag(`📄 ${docsMissing(t).length>1?"docs":DOC_KINDS[docsMissing(t)[0]].s.toLowerCase()} missing`,"var(--bad)","Delivered without its "+docsMissing(t).map(k=>DOC_KINDS[k].s.toLowerCase()).join(" and ")):""}${na?btag(`⏰""")
wr(p, s)

p = S + "05-demands.js"; s = rd(p)
s = rep(s, """next:"Next action due"};""", """next:"Next action due",docs:"Delivered or closed, documents missing"};""")
s = rep(s, """      else if(k==="waiting"){if(!isWaiting(t))return false;}""", """      else if(k==="waiting"){if(!isWaiting(t))return false;}
      else if(k==="docs"){if(!docsDue(t))return false;}""")
s = rep(s, """  {name:"Waiting",view:{group:"none",sort:"waiting",dir:"desc",only:["waiting"]}},""", """  {name:"Waiting",view:{group:"none",sort:"waiting",dir:"desc",only:["waiting"]}},
  {name:"Docs missing",view:{group:"none",sort:"due",only:["docs"]}},""")
wr(p, s)

p = S + "14b-daily-loop.js"; s = rd(p)
s = rep(s, """yearly:{l:"Once a year",pen:"pen-5",o:3.7},""", """yearly:{l:"Once a year",pen:"pen-5",o:3.7},docs:{l:"Documents",pen:"pen-1",o:3.4},""")
s = rep(s, "  out.push(...agendaTransportItems(t0));", "  out.push(...agendaTransportItems(t0),...agendaDocsItems(t0));")
wr(p, s)

p = S + "23-notes-search.js"; s = rd(p)
s = rep(s, "t.nextAction&&t.nextAction.note,ep?epicLabel(ep)", "t.nextAction&&t.nextAction.note,docsOf(t).fs.map(f=>f.title+\" \"+f.by).join(\" \"),ep?epicLabel(ep)")
wr(p, s)

p = S + "14g-memory.js"; s = rd(p)
s = rep(s, """  if((t.lessons||[]).length)L.push("## Lessons\"""", """  {const d=docsOf(t),rows=[...Object.entries(DOC_KINDS).map(([k,K])=>`- ${K.l}: ${DOC_STATE[d[k].state]}${d[k].date?" ("+d[k].date+")":""}${d[k].url?" — "+d[k].url:""}`),...d.fs.map(f=>`- Functional spec: ${f.title||"(untitled)"}${f.by?" by "+f.by:""}${f.url?" — "+f.url:""}`)];L.push("## Documents","",...rows,"");}
  if((t.lessons||[]).length)L.push("## Lessons\"""")
wr(p, s)

p = S + "25-selftest.js"; s = rd(p)
s = rep(s, """   ok("Encryption warning shows while secrets are unencrypted",""", r"""   {const b=state.tasks.find(x=>x.id==="st-b"),c=state.tasks.find(x=>x.id==="st-c"),m=migrate(clone(stOldFixture()));
    ok("Documents: an upgraded demand starts with its tech spec and unit test to do",m.tasks[0].docs.ts.state==="todo"&&m.tasks[0].docs.ut.state==="todo"&&Array.isArray(m.tasks[0].docs.fs));
    ok("Documents: a delivered demand missing them is on the agenda and in the 'Docs missing' filter",agendaItems().some(i=>i.k==="docs"&&i.of.includes("ST-2"))&&state.tasks.filter(dvMatches({...dvBlank(),only:["docs"]})).includes(b));
    view="demands";activeId="st-b";activeTab="overview";renderApp();const u=document.querySelector('#ovDocs .dc-row[data-k="ts"] .dc-url');if(u){u.value="https://example.invalid/ts.docx";u.dispatchEvent(new Event("change"));}
    const ts=docsOf(b).ts;ok("Documents: pasting a link marks the tech spec done, dated today",ts.state==="done"&&ts.date===todayStr()&&ts.url.endsWith("ts.docx"),JSON.stringify(ts));
    {const nb=document.querySelector('#ovDocs .dc-row[data-k="ut"] .dc-seg button[data-s="na"]');if(nb)nb.click();}
    ok("Documents: 'Not needed' takes it off the agenda",!docsDue(b)&&!agendaItems().some(i=>i.k==="docs"&&i.of.includes("ST-2")));
    window.stDocsPrompt=true;const s0=c.status;setDemandStatus(c,"delivered");await sleep(motionOn()?1100:350);const asked=!!document.getElementById("docsSheet");window.stDocsPrompt=false;
    document.getElementById("modalRoot").innerHTML="";c.status=s0;c.timeline=c.timeline.filter(e=>!(e.type==="status"&&e.to==="delivered"));
    ok("Documents: delivering a demand opens the checklist",asked);view="today";renderApp();}
   ok("Encryption warning shows while secrets are unencrypted",""")
s = rep(s, """["A readable copy",()=>openReadableCopy()],""", """["A readable copy",()=>openReadableCopy()],["Documents checklist",()=>openDocsSheet(a,{delivering:true})],""")
wr(p, s)
print("documents patch applied")
