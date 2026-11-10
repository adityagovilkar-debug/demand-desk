"""Phase 3 — transports and tickets. Usage: python p3.py <demand-desk root (holding src/)>"""
import sys, shutil, os
ROOT = sys.argv[1].rstrip("/\\") + "/"
HERE = os.path.dirname(os.path.abspath(__file__)) + "/"
S = ROOT + "src/js/"

def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="\n").write(s)
def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, f"expected {n}, found {c}: {a[:90]!r}"
    return s.replace(a, b)

shutil.copy(HERE + "14c-transports-tickets.js", S + "14c-transports-tickets.js")
shutil.copy(HERE + "10-transports-tickets.css", ROOT + "src/css/10-transports-tickets.css")

# ---- data: when a transport was added and released; the unreleased threshold (v31) ----
p = S + "01-core.js"; s = rd(p)
s = rep(s, "const DATA_VERSION=30;", "const DATA_VERSION=31;")
s = rep(s, """      notes:(tr.notes||"")+(tr.syncedTo?` [legacy synced-to: ${tr.syncedTo}]`:"")
    }));""", """      notes:(tr.notes||"")+(tr.syncedTo?` [legacy synced-to: ${tr.syncedTo}]`:""),
      /* v31: the day it was added (older transports count from the upgrade) and the day it was released */
      addedOn:/^\\d{4}-\\d\\d-\\d\\d$/.test(tr.addedOn||"")?tr.addedOn:todayStr(),releasedOn:tr.released&&/^\\d{4}-\\d\\d-\\d\\d$/.test(tr.releasedOn||"")?tr.releasedOn:""
    }));""")
s = rep(s, """  d.settings.dayHours=(+d.settings.dayHours>=1&&+d.settings.dayHours<=16)?Math.round(+d.settings.dayHours*4)/4:8;""",
 """  d.settings.dayHours=(+d.settings.dayHours>=1&&+d.settings.dayHours<=16)?Math.round(+d.settings.dayHours*4)/4:8;
  /* v31: days a transport may stay unreleased before it comes up on Today */
  d.settings.unreleasedDays=(+d.settings.unreleasedDays>=1&&+d.settings.unreleasedDays<=60)?Math.round(+d.settings.unreleasedDays):5;""")
s = rep(s, "function syncReleases(tr,sys){if(!tr||tr.released||!sys||sys===tr.system)return false;tr.released=true;return true;}",
 "function syncReleases(tr,sys,date){if(!tr||tr.released||!sys||sys===tr.system)return false;tr.released=true;tr.releasedOn=tr.releasedOn||date||todayStr();return true;}")
wr(p, s)

p = S + "15-run-sheet-handover.js"; s = rd(p)
s = rep(s, "if(!r.toc)syncReleases(r.tr,target)", "if(!r.toc)syncReleases(r.tr,target,dt)")
wr(p, s)

p = S + "05-demands.js"; s = rd(p)
s = rep(s, """toc:"",objectIds:[],dest:[],notes:""});""", """toc:"",objectIds:[],dest:[],notes:"",addedOn:todayStr(),releasedOn:""});""")
s = rep(s, """q(".rel").onchange=e=>{tr.released=e.target.checked;touch(t);};""",
 """q(".rel").onchange=e=>{tr.released=e.target.checked;tr.releasedOn=tr.released?(tr.releasedOn||todayStr()):"";touch(t);};""")
s = rep(s, """type:"Demand type",due:"Due date",next:"Next action",builder:"Built by"};""",
 """type:"Demand type",due:"Due date",next:"Next action",builder:"Built by",ticket:"Ticket"};""")
s = rep(s, """    case "next":{const n=t.nextAction;""",
 """    case "ticket":{if(!t.demandId)return none("No ticket ID");const n=demandIdCounts().get(t.demandId)||0;
      if(n<2)return{k:"__single",label:`<span class="faint">One demand per ticket</span>`,rank:5};const r=ticketRollup(t.demandId);
      return{k:t.demandId,label:`🎫 <b class="mono">${esc(t.demandId)}</b> · ${n} demands <span class="faint">· ${efFh(Math.round(r.h*10)/10)} h · ${r.there}/${r.trs} TRs there</span>`,rank:0,sl:t.demandId};}
    case "next":{const n=t.nextAction;""")
s = rep(s, """   const cg=host.querySelector(".cb-go");if(cg)cg.onclick=()=>{activeId=cg.dataset.id;activeTab="objects";renderApp();};""",
 """   const cg=host.querySelector(".cb-go");if(cg)cg.onclick=()=>{activeId=cg.dataset.id;activeTab="objects";renderApp();};
   host.querySelectorAll(".tk-go").forEach(a=>a.onclick=()=>{activeId=a.dataset.id;activeTab="overview";renderApp();});""")
s = rep(s, """<button class="sm caddsync" style="margin-top:4px">＋ Add sync target</button>""",
 """<button class="sm caddsync" style="margin-top:4px">＋ Add sync target</button> <button class="sm croute" style="margin-top:4px" title="Every system on a route, with one date">⇢ Move along a route…</button>""")
s = rep(s, """      q(".caddsync").onclick=()=>{c.syncs.push({system:"",date:todayStr()});touch(t);drawCs();};""",
 """      q(".caddsync").onclick=()=>{c.syncs.push({system:"",date:todayStr()});touch(t);drawCs();};
      q(".croute").onclick=()=>openTocRoute(t,c);""")
wr(p, s)

p = S + "18-bench-layouts.js"; s = rd(p)
s = rep(s, """    <div class="tabs">
      <button class="tab ${activeTab==="overview"?"active":""}" data-tab="overview" title="1">""",
 """    ${ticketBandHTML(t)}
    <div class="tabs">
      <button class="tab ${activeTab==="overview"?"active":""}" data-tab="overview" title="1">""")
wr(p, s)

p = S + "14b-daily-loop.js"; s = rd(p)
s = rep(s, """todo:{l:"To-do",pen:"pen-6",o:3},due:{l:"Due",pen:"pen-1",o:4}};""",
 """todo:{l:"To-do",pen:"pen-6",o:3},release:{l:"Release",pen:"pen-1",o:3.5},check:{l:"Check in",pen:"pen-7",o:3.6},due:{l:"Due",pen:"pen-1",o:4}};""")
s = rep(s, """  return out.sort((a,b)=>a.date.localeCompare(b.date)||AG_KINDS[a.k].o-AG_KINDS[b.k].o);}""",
 """  out.push(...agendaTransportItems(t0));
  return out.sort((a,b)=>a.date.localeCompare(b.date)||AG_KINDS[a.k].o-AG_KINDS[b.k].o);}""")
s = rep(s, "next steps · your action points · follow-ups · due</span>", "next steps · action points · follow-ups · transports · due</span>")
wr(p, s)

p = S + "02-render.js"; s = rd(p)
s = rep(s, """["effort","review","search","month"].includes(view)""", """["effort","review","search","month","transports"].includes(view)""")
s = rep(s, """  else if(view==="month"){renderMonth();}""", """  else if(view==="month"){renderMonth();}
  else if(view==="transports"){renderTrBoard();}""")
wr(p, s)

p = ROOT + "src/shell.html"; s = rd(p)
s = rep(s, """      <button class="navbtn" data-view="demands">Demands</button>""",
 """      <button class="navbtn" data-view="demands">Demands</button>
      <button class="navbtn" data-view="transports">Transports</button>""")
s = rep(s, """    <button class="rb" data-view="jobs" """,
 """    <button class="rb" data-view="transports" style="--pen:var(--pen-3)"><svg viewBox="0 0 18 18"><circle cx="4" cy="13.5" r="1.7"/><circle cx="14" cy="4.5" r="1.7"/><path d="M5.7 13.5H11a2.5 2.5 0 0 0 0-5H7a2.5 2.5 0 0 1 0-5h5.3"/></svg><span class="pd"></span><span class="tip">Transports · every one on its way</span></button>
    <button class="rb" data-view="jobs" """)
wr(p, s)

p = S + "17-bench-look.js"; s = rd(p)
s = rep(s, """<div class="ck-unit go" id="ckPipeU" style="--pen:var(--pen-3)" title="Open the go-live view of your demands">""",
 """<div class="ck-unit go" id="ckPipeU" style="--pen:var(--pen-3)" title="Open the transport board">""")
s = rep(s, """q("#ckPipeU").onclick=()=>{if(pipeRec&&pipeRec.hv)return;goView(CK_TILES[3].view);};""",
 """q("#ckPipeU").onclick=()=>{if(pipeRec&&pipeRec.hv)return;view="transports";renderApp();};""")
wr(p, s)

p = S + "16-search-menu.js"; s = rd(p)
s = rep(s, """<canvas id="mn-dayk" title="Drag up or down, scroll, or use the arrow keys — 4 to 12 hours" style="width:92px;height:80px;flex:none"></canvas></div>""",
 """<canvas id="mn-dayk" title="Drag up or down, scroll, or use the arrow keys — 4 to 12 hours" style="width:92px;height:80px;flex:none"></canvas></div>
    <div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:9px 11px;border:1px solid var(--line2);border-radius:8px">
      <span style="flex:1;font-size:13px">⇢ Unreleased transports <span class="faint" style="font-size:11px">— after this many days, one that isn't released comes up on Today</span></span>
      <input type="number" id="mn-unrel" min="1" max="60" value="${state.settings.unreleasedDays||5}" style="width:64px;padding:3px 6px"><span class="faint" style="font-size:12px">days</span></div>""")
s = rep(s, """  root.querySelector("#mn-imgexp").onchange=""",
 """  root.querySelector("#mn-unrel").onchange=e=>{state.settings.unreleasedDays=Math.min(60,Math.max(1,parseInt(e.target.value||"5",10)||5));e.target.value=state.settings.unreleasedDays;markDirty();};
  root.querySelector("#mn-imgexp").onchange=""")
wr(p, s)

# ---- self-test ----
p = S + "25-selftest.js"; s = rd(p)
s = rep(s, """   ok("Encryption warning shows while secrets are unencrypted",""",
 r"""   {const a=state.tasks.find(x=>x.id==="st-a"),a1=a.transports.find(x=>x.id==="st-tr-a1"),a2=a.transports.find(x=>x.id==="st-tr-a2"),rows=trBoardRows();
    const r1=rows.find(r=>r.tr===a1),r2=rows.find(r=>r.tr===a2);
    ok("Transport board: where each transport is and where it goes next",r1&&r1.at==="H42"&&r1.next==="H41"&&r2&&r2.at==="H03"&&r2.next==="H02"&&!r2.tr.released,JSON.stringify(r1&&[r1.at,r1.next])+" "+JSON.stringify(r2&&[r2.at,r2.next]));
    view="transports";renderApp();const row=[...document.querySelectorAll(".tb-row")].find(x=>x.dataset.key==="st-a|st-tr-a2");if(row)row.querySelector(".tb-ck").click();
    const sy=document.getElementById("tbSys");if(sy){sy.value="H02";sy.dispatchEvent(new Event("change"));const rb=document.getElementById("tbRec");if(rb)rb.click();}
    const rec=a2.syncs.some(x=>x.system==="H02"&&x.date===todayStr())&&a2.released&&a2.releasedOn===todayStr();
    {const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();}
    ok("Transport board: an import recorded for the selected transports, with Undo",rec&&!a2.syncs.some(x=>x.system==="H02")&&!a2.released,`recorded ${rec} · after undo ${JSON.stringify(a2.syncs)} ${a2.released}`);
    const toc=a.tocs[0],R=document.getElementById("modalRoot");openTocRoute(a,toc);const picked=[...R.querySelectorAll(".tr-rs input:checked:not(:disabled)")].map(i=>i.value);R.querySelector("#trRGo").click();
    const moved=["H43","H41"].every(x=>toc.syncs.some(y=>y.system===x&&y.date===todayStr()));
    {const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();}
    ok("A ToC moves along a whole route in one go (what's there already left out), with Undo",eq(picked,["H43","H41"])&&moved&&toc.syncs.length===1,`picked ${picked} · moved ${moved} · left ${toc.syncs.length}`);R.innerHTML="";
    a2.addedOn=efAdd(todayStr(),-9);let it=agendaItems().find(i=>i.k==="release"&&i.what.includes("H03K900002"));const shown=!!it;if(it)it.acts[0][1]();
    ok("Today: a transport unreleased too long comes up, and Released clears it",shown&&a2.released&&a2.releasedOn===todayStr()&&!agendaItems().some(i=>i.k==="release"&&i.what.includes("H03K900002")));
    a2.released=false;a2.releasedOn="";a2.addedOn=todayStr();
    const c=state.tasks.find(x=>x.id==="st-c");c.nextAction={date:"",note:""};c.updatedAt=Date.now()-10*864e5;it=agendaItems().find(i=>i.k==="check"&&i.what.includes("Sample Builder"));const quiet=!!it;if(it)it.acts[0][1]();
    ok("Today: a demand handed to your team that went quiet comes up; Checked in notes it",quiet&&(c.timeline||[]).some(e=>/^Checked in with Sample Builder/.test(e.note||""))&&!agendaItems().some(i=>i.k==="check"&&i.what.includes("Sample Builder")));
    ok("Tickets: demands sharing a ticket ID see each other, and group together",eq(ticketSiblings(c).map(x=>x.id),["st-d"])&&ticketBandHTML(c).includes("Ticket ST-3 · 2 demands")&&dvGroupOf(c,"ticket").k==="ST-3"&&dvGroupOf(a,"ticket").k==="__single");
    const m=migrate(clone(stOldFixture())),tr0=m.tasks[0].transports[0];
    ok("Upgrade: transports get the day they were added, the unreleased reminder a default",/^\d{4}-\d\d-\d\d$/.test(tr0.addedOn)&&tr0.releasedOn===""&&m.settings.unreleasedDays===5,JSON.stringify([tr0.addedOn,tr0.releasedOn,m.settings.unreleasedDays]));
    view="today";renderApp();}
   ok("Encryption warning shows while secrets are unencrypted",""")
s = rep(s, """"vault","effort","review","month","search"];""", """"vault","effort","review","month","search","transports"];""")
s = rep(s, """["Close the day",()=>openCloseDay()],""", """["Close the day",()=>openCloseDay()],["Move a ToC along a route",()=>openTocRoute(a,a.tocs[0])],""")
wr(p, s)
print("phase 3 patch applied to", ROOT)
