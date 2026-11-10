"""Phase 2 — the daily loop. Usage: python p2.py <demand-desk root (holding src/)>"""
import sys, shutil, os, re
ROOT = sys.argv[1].rstrip("/\\") + "/"
HERE = os.path.dirname(os.path.abspath(__file__)) + "/"
S = ROOT + "src/js/"

def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="\n").write(s)
def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, f"expected {n}, found {c}: {a[:80]!r}"
    return s.replace(a, b)

shutil.copy(HERE + "14b-daily-loop.js", S + "14b-daily-loop.js")
shutil.copy(HERE + "09-daily-loop.css", ROOT + "src/css/09-daily-loop.css")

# ---- 8. Done -> log the time (the next-action dialog) ----
p = S + "14-clashes-next-action.js"; s = rd(p)
s = rep(s, """<s>${esc(done.note||"(no note)")}</s></div>`""",
 """<s>${esc(done.note||"(no note)")}</s></div><div class="field na-time efx"><label>Time it took <span class="faint" style="text-transform:none;letter-spacing:0;font-weight:400">· optional — logged in Effort for today</span></label><div class="na-hrow"><input id="na-hrs" class="mono" placeholder="e.g. 1.5 · 2h30" autocomplete="off">${[["½ h","0.5"],["1 h","1"],["2 h","2"],["3 h","3"]].map(([l,h])=>`<button class="sm na-h" data-h="${h}">${l}</button>`).join("")}<span class="na-dsf" id="na-dsf"></span></div></div>`""")
s = rep(s, """  const tick=()=>{if(!done)return;if(isJob(t))jobLog(t,"step",done.note||"(step)");else logTimeline(t,"note","","",`Next action done${done.note?": "+done.note:""}`);};""",
 """  /* the time the step took — optional; 0 = none, -1 = not a number of hours (the dialog stays open) */
  const hrs=()=>{const i=root.querySelector("#na-hrs");if(!i||!i.value.trim())return 0;const h=Math.round(efParseH(i.value)*4)/4;
    if(!h||isNaN(h)||h>24){i.classList.add("na-bad");i.focus();toast("How long did it take? e.g. 1.5 · 2h30 · 90m — or leave it empty",true);return -1;}return h;};
  let logged=0;
  const tick=h=>{if(!done)return;if(isJob(t))jobLog(t,"step",done.note||"(step)");else logTimeline(t,"note","","",`Next action done${done.note?": "+done.note:""}`);
    if(h>0){const key=isJob(t)?"j:"+t.id:t.id;state.efforts.push(normEffort({date:todayStr(),hours:h,taskId:isJob(t)?"":t.id,jobId:isJob(t)?t.id:"",activity:efGuessAct(key,todayStr()),note:done.note||""}));
      setViewPref("ef.last",key);if(isJob(t)&&t.status==="open")t.status="progress";logged=h;efTimerUI();}};
  const doneMsg=()=>"Done — noted in History"+(logged?` · ${efFh(logged)} h logged`:"");""")
s = rep(s, """  root.querySelectorAll(".na-q").forEach(b=>b.onclick=()=>{root.querySelector("#na-date").value=b.dataset.d;});""",
 """  root.querySelectorAll(".na-q").forEach(b=>b.onclick=()=>{root.querySelector("#na-date").value=b.dataset.d;});
  {const hi=root.querySelector("#na-hrs");if(hi){const have=efSum(state.efforts.filter(e=>e.date===todayStr()));
    const sy=()=>{const v=efParseH(hi.value),add=isNaN(v)?0:Math.round(v*4)/4;hi.classList.toggle("na-bad",!!hi.value.trim()&&!add);
      root.querySelectorAll(".na-h").forEach(b=>b.classList.toggle("on",+b.dataset.h===add));
      root.querySelector("#na-dsf").innerHTML=`${efDayBar(have,add)}<span>${efFh(have)} h today${add?` <span class="ef-good">+ ${efFh(add)}</span>`:""} of ${efFh(EF_DAY)}</span>`;};
    hi.oninput=sy;root.querySelectorAll(".na-h").forEach(b=>b.onclick=()=>{hi.value=+b.dataset.h===efParseH(hi.value)?"":b.dataset.h;sy();});sy();}}""")
s = rep(s, """  const just=()=>{tick();t.nextAction={date:"",note:""};touch(t);close();renderApp();toast("Done — noted in History");};""",
 """  const just=()=>{const h=hrs();if(h<0)return;tick(h);t.nextAction={date:"",note:""};touch(t);close();renderApp();toast(doneMsg());};""")
s = rep(s, """    if(!d){toast("Pick a date",true);return;}
    tick();t.nextAction={date:d,note};touch(t);close();renderApp();
    toast((done?"Done — noted in History. ":"")+""",
 """    if(!d){toast("Pick a date",true);return;}
    const h=hrs();if(h<0)return;
    tick(h);t.nextAction={date:d,note};touch(t);close();renderApp();
    toast((done?doneMsg()+". ":"")+""")
wr(p, s)

# ---- 10. A meeting action point becomes a Task ----
p = S + "06-meetings.js"; s = rd(p)
s = rep(s, """<span class="nact"><button class="ghost sm a-res\"""",
 """<span class="nact">${a.done?"":`<button class="ghost sm a-job" title="Make it a Task — it keeps the link to this meeting">↗ Task</button>`}<button class="ghost sm a-res\"""")
s = rep(s, """    row.querySelector(".a-del").onclick=()=>{m.actions.splice(i,1);touch(m);drawMeetingActions(m);renderMeetingSidebar();};""",
 """    row.querySelector(".a-del").onclick=()=>{m.actions.splice(i,1);touch(m);drawMeetingActions(m);renderMeetingSidebar();};
    {const jb=row.querySelector(".a-job");if(jb)jb.onclick=()=>actionToJob(a,m);}""")
s = rep(s, """<span class="go" style="flex:0 0 170px;font-size:11px;color:var(--accent);cursor:pointer" title="Open meeting">👥 ${m.date}${m.team?" · "+esc(m.team):""}</span>""",
 """<span class="go" style="flex:0 0 170px;font-size:11px;color:var(--accent);cursor:pointer" title="Open meeting">👥 ${m.date}${m.team?" · "+esc(m.team):""}</span>
      <button class="ghost sm a-job" title="Make it a Task — it keeps the link to the meeting">↗ Task</button>""")
s = rep(s, """    row.querySelector(".go").onclick=()=>{meetingRollup=false;activeMeetingId=m.id;renderApp();};""",
 """    row.querySelector(".go").onclick=()=>{meetingRollup=false;activeMeetingId=m.id;renderApp();};
    row.querySelector(".a-job").onclick=()=>actionToJob(a,m);""")
wr(p, s)

# ---- 7. The agenda on Today (the "Next actions due" card folds into it) ----
p = S + "03-today.js"; s = rd(p)
s2 = re.sub(r'  card\("Next actions due".*?\n(?=  card\("Bugs / Rework")', "", s, count=1, flags=re.S)
assert s2 != s, "next-actions card not found"; s = s2
s = rep(s, """  const attn=cards.reduce((n,c)=>n+c.items.length,0),wrap=encWarnHTML()+wrapUpHTML();""",
 """  const attn=cards.reduce((n,c)=>n+c.items.length,0),wrap=encWarnHTML()+wrapUpHTML(),ag=agendaItems();""")
s = rep(s, """${cockpitHTML()}${wrap}""", """${cockpitHTML(agendaHTML(ag))}${wrap}""")
s = rep(s, """<span class="faint">${new Date().toDateString()}</span></div>${html}</div>`;""",
 """<span class="faint">${new Date().toDateString()}</span></div>${agendaHTML(ag)}${html}</div>`;""")
s = rep(s, """  efWireToday(host);
  host.querySelectorAll(".dashitem[data-c]")""", """  efWireToday(host);wireAgenda(host,ag);
  host.querySelectorAll(".dashitem[data-c]")""")
wr(p, s)

p = S + "17-bench-look.js"; s = rd(p)
s = rep(s, "function cockpitHTML(){", "function cockpitHTML(mid=\"\"){")
s = rep(s, """    <div class="ck-sech"><span class="ck-lbl">Pulse · read from your data file</span></div>""",
 """    ${mid}<div class="ck-sech"><span class="ck-lbl">Pulse · read from your data file</span></div>""")
wr(p, s)

# ---- 11. Estimate furniture only once an estimate exists ----
p = S + "20-effort.js"; s = rd(p)
s = rep(s, "const efSum=a=>a.reduce((s,e)=>s+e.hours,0);",
 "const efSum=a=>a.reduce((s,e)=>s+e.hours,0);\nconst anyEstimate=()=>state.tasks.some(t=>+t.estimate>0);   /* estimate panels stay out of the way until the first estimate exists */")
s = rep(s, """<div class="k">Logged vs estimate</div>""", """<div class="k">${est||anyEstimate()?"Logged vs estimate":"Logged"}</div>""")
s = rep(s, """:"no estimate"} · <a href="#" class="ef-est">${est?"change":"set one"}</a>""",
 """:anyEstimate()?"no estimate":`${es.length} entr${es.length===1?"y":"ies"}`} · <a href="#" class="ef-est">${est?"change":anyEstimate()?"set one":"add an estimate"}</a>""")
s = rep(s, """    <div class="ef-g3">
      <div class="ck-unit"><div class="ck-head"><h2>Estimate vs actual</h2><span class="ck-meta">whole life · demands in range</span></div>${efEstRows(A)}</div>""",
 """    <div class="ef-g3${anyEstimate()?"":" two"}">
      ${anyEstimate()?`<div class="ck-unit"><div class="ck-head"><h2>Estimate vs actual</h2><span class="ck-meta">whole life · demands in range</span></div>${efEstRows(A)}</div>`:""}""")
wr(p, s)

p = S + "22-rounds-epic-effort.js"; s = rd(p)
s = rep(s, """q("#cbEstW").style.display=q("#cbNoteW").style.display=st.why==="change"?"":"none";""",
 """q("#cbNoteW").style.display=st.why==="change"?"":"none";q("#cbEstW").style.display=st.why==="change"&&anyEstimate()?"":"none";""")
wr(p, s)

# ---- self-test ----
p = S + "25-selftest.js"; s = rd(p)
s = rep(s, """   ok("Encryption warning shows while secrets are unencrypted",""",
 r"""   {const t=state.tasks.find(x=>x.id==="st-a"),m=state.meetings.find(x=>x.id==="st-m1"),T0=todayStr();
    m.actions.push({id:"st-act-me",text:"Sample action of mine",owner:"",done:false,due:T0,resolution:""},{id:"st-act-them",text:"Sample action of theirs",owner:"Sample owner",done:false,due:T0,resolution:""});
    const ag=agendaItems(),has=(k,f)=>ag.some(i=>i.k===k&&f(i));
    ok("Agenda: next steps, your action points, follow-ups and what's due — late first",
      has("step",i=>i.what.includes("Chase the sample QA"))&&has("act",i=>i.what.includes("of mine"))&&!has("act",i=>i.what.includes("of theirs"))&&has("chase",i=>i.what.includes("QA team"))&&has("due",i=>i.date<T0)&&ag.every((x,i)=>!i||ag[i-1].date<=x.date),
      ag.map(i=>i.k+":"+i.date).join(", "));
    ag.find(i=>i.k==="chase"&&i.what.includes("QA team")).acts[0][1]();
    ok("Agenda: a follow-up, once chased, waits three days (noted in History)",!chaseDue(t)&&lastChase(t)===T0&&!agendaItems().some(i=>i.k==="chase"&&i.what.includes("QA team")));
    {const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();}
    ok("Agenda: Undo takes the chase back",chaseDue(t)&&lastChase(t)==="");
    const a=m.actions.find(x=>x.id==="st-act-me"),j0=state.jobs.length;actionToJob(a,m);const j=state.jobs[0];
    ok("A meeting action point becomes a Task, linked to the meeting",state.jobs.length===j0+1&&j.title==="Sample action of mine"&&j.meetingId==="st-m1"&&j.source==="meeting"&&a.done&&!agendaItems().some(i=>i.what.includes("of mine")));
    view="today";renderApp();}
   {const t=state.tasks.find(x=>x.id==="st-a"),R=document.getElementById("modalRoot"),n0=state.efforts.length;
    t.nextAction={date:todayStr(),note:"Sample step to time"};nextActionDone(t);R.querySelector("#na-hrs").value="1.5";R.querySelector("#na-just").click();
    const e=state.efforts[state.efforts.length-1],timed=state.efforts.length===n0+1&&e.taskId==="st-a"&&e.hours===1.5&&e.note==="Sample step to time"&&e.date===todayStr()&&!t.nextAction.date;
    t.nextAction={date:todayStr(),note:"Sample untimed step"};nextActionDone(t);R.querySelector("#na-hrs").value="lots";R.querySelector("#na-just").click();
    const held=!!R.querySelector("#na-hrs")&&t.nextAction.date===todayStr();R.querySelector("#na-hrs").value="";R.querySelector("#na-just").click();
    ok("✓ Done logs the time it took, with the step as the note — and only a real number of hours",timed&&held&&state.efforts.length===n0+1&&!t.nextAction.date,`timed ${timed} · held ${held} · entries ${state.efforts.length-n0}`);R.innerHTML="";}
   {const R=document.getElementById("modalRoot"),T0=todayStr(),day=()=>efSum(state.efforts.filter(e=>e.date===T0)),have=day();
    const mt=normMeeting({id:"st-m-today",date:T0,title:"Sample meeting today",taskIds:[]});state.meetings.push(mt);
    openCloseDay();const rows=[...R.querySelectorAll(".cd-row")],ra=rows.find(r=>r.textContent.includes("ST-1")),rm=rows.find(r=>r.textContent.includes("Sample meeting today")),re=R.querySelector(".cd-else");
    const seen=!!ra&&!!rm&&!!re;let lbl="";
    if(seen){ra.querySelector(".cd-h").value="2";rm.querySelector(".cd-h").value="0.5";re.querySelector(".cd-h").value="1";R.querySelectorAll(".cd-h").forEach(b=>b.dispatchEvent(new Event("input")));
      lbl=R.querySelector("#cdLog").textContent;R.querySelector("#cdLog").click();}
    const now=day();
    ok("Close the day: an hours box per thing touched, meetings included, logged in one go",seen&&lbl==="Log 3.5 h"&&now===have+3.5&&mt.hours===0.5&&state.efforts.some(e=>e.meetingId==="st-m-today"),`rows ${seen} · ${lbl} · ${have} → ${now}`);
    {const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();}
    ok("Close the day: Undo takes it all back",day()===have&&!state.efforts.some(e=>e.meetingId==="st-m-today")&&!mt.hours,`${day()} vs ${have}`);
    state.meetings.splice(state.meetings.indexOf(mt),1);R.innerHTML="";}
   {const est=state.tasks.map(t=>t.estimate),txt=()=>document.getElementById("detail").textContent;state.tasks.forEach(t=>t.estimate=0);view="effort";renderApp();const none=!txt().includes("Estimate vs actual")&&!anyEstimate();
    state.tasks.forEach((t,i)=>t.estimate=est[i]);renderApp();const back=txt().includes("Estimate vs actual");view="today";renderApp();
    ok("Estimate panels stay hidden until an estimate exists",none&&back,`hidden ${none} · back ${back}`);}
   ok("Encryption warning shows while secrets are unencrypted",""")
s = rep(s, """["Next action ✓ Done",()=>nextActionDone(a)],""", """["Next action ✓ Done",()=>nextActionDone(a)],["Close the day",()=>openCloseDay()],""")
wr(p, s)
print("phase 2 patch applied to", ROOT)
