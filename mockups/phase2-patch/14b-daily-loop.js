/* ===================== THE DAILY LOOP =====================
   Today's agenda: one ordered list of what the day asks of you — next steps due (demands and
   tasks), your own meeting action points, follow-ups on what you're waiting for, Journal
   to-dos and what's due — each done right where it shows. Close the day: an hours box for
   every demand, task and meeting touched that day, against the working day. */
const CHASE_EVERY=3;   /* days between follow-ups on something you're waiting for */
const AG_KINDS={step:{l:"Next step",pen:"pen-2",o:0},act:{l:"Action point",pen:"pen-5",o:1},chase:{l:"Follow up",pen:"pen-4",o:2},todo:{l:"To-do",pen:"pen-6",o:3},due:{l:"Due",pen:"pen-1",o:4}};
/* an action point is yours when it has no owner, says me / myself / I, or names you (the Greeting name in ⋯) */
function actionIsMine(a){const o=String(a.owner||"").trim().toLowerCase(),n=viewPref("userName","").trim().toLowerCase();
  return !o||["me","myself","i","self"].includes(o)||(!!n&&o.split(/[\s,/&+]+/).includes(n));}
/* follow-ups are read back from History ("Chased …"), so nothing new is stored */
function lastChase(x){const l=isJob(x)?x.log.filter(e=>/^Chased\b/.test(e.text)).map(e=>e.date):(x.timeline||[]).filter(e=>e.type==="note"&&/^Chased\b/.test(e.note||"")).map(e=>isoTs(e.ts));return l.sort().pop()||"";}
function chaseDue(x){if(isJob(x)?!jobWaiting(x):!isWaiting(x))return false;
  const from=[x.waiting.since||"",lastChase(x)].sort().pop();return !from||-daysUntil(from)>=CHASE_EVERY;}
function agUnlog(x,txt){const a=isJob(x)?x.log:(x.timeline||[]),k=isJob(x)?"text":"note";for(let i=a.length-1;i>=0;i--)if(a[i][k]===txt){a.splice(i,1);break;}}
function agNote(x,kind,txt){if(isJob(x))jobLog(x,kind,txt);else{logTimeline(x,"note","","",txt);touch(x);}}
function agChased(x){const msg=`Chased ${x.waiting.on}`;agNote(x,"call",msg);renderApp();
  efToastUndo(`${msg} — back on the agenda in ${CHASE_EVERY} days if nothing comes in`,()=>{agUnlog(x,msg);touch(x);renderApp();});}
function agAnswerIn(x){const w={...x.waiting},msg=isJob(x)?`Answer in from ${w.on}`:`No longer waiting on ${w.on}`;x.waiting={on:"",since:""};agNote(x,"update",msg);renderApp();
  efToastUndo(`No longer waiting on ${w.on}`,()=>{x.waiting=w;agUnlog(x,msg);touch(x);renderApp();});}
/* a meeting action point of yours becomes a Task — linked to the meeting, the point ticked off */
function actionToJob(a,m){a.done=true;a.resolution=a.resolution||"→ moved to Tasks";touch(m);
  newJob({title:a.text||"(from a meeting)",due:a.due||"",source:"meeting",meetingId:m.id,received:m.date&&m.date<=todayStr()?m.date:todayStr()});
  toast("Moved to Tasks — the action point is ticked off");}
function agSubDue(t,d){let hit=null;(function w(a){a.forEach(s=>{if(!hit&&!s.done&&s.dueDate===d)hit=s;w(s.children||[]);});})(t.subtasks||[]);return hit;}
function agendaItems(){const t0=todayStr(),out=[];
  const of=x=>isJob(x)?`☐ ${esc(x.title)}`:`${x.demandId?`<b class="mono">${esc(x.demandId)}</b> `:""}${esc(x.title)}`;
  const go=x=>()=>{if(isJob(x)){view="jobs";activeJobId=x.id;}else{view="demands";activeId=x.id;activeTab="work";}renderApp();};
  const add=(k,date,what,x,acts,more)=>out.push({k,date,what,of:of(x),go:go(x),acts:acts||[],...(more||{})});
  const steps=[["✓ Done",x=>nextActionDone(x),"Tick it off — then the step after it, and the time it took"],["Move",x=>openNextAction(x),"Not today — pick another day"]];
  [...state.tasks.filter(nextActionDue),...state.jobs.filter(j=>jobOpen(j)&&j.nextAction.date&&j.nextAction.date<=t0)]
    .forEach(x=>add("step",x.nextAction.date,esc(x.nextAction.note||"(next step)"),x,steps.map(([l,f,h])=>[l,()=>f(x),h])));
  state.meetings.forEach(m=>m.actions.forEach(a=>{if(a.done||!a.due||a.due>t0||!actionIsMine(a))return;
    out.push({k:"act",date:a.due,what:esc(a.text||"(no text)"),of:`👥 ${esc(m.title)}`,go:()=>{view="meetings";meetingRollup=false;activeMeetingId=m.id;renderApp();},
      acts:[["✓ Done",()=>{a.done=true;touch(m);renderApp();efToastUndo("Action point ticked off",()=>{a.done=false;touch(m);renderApp();});},"Tick the action point off"],
        ["↗ Task",()=>actionToJob(a,m),"Make it a Task — it keeps the link to the meeting"]]});}));
  [...state.tasks,...state.jobs].filter(chaseDue).forEach(x=>{const n=isJob(x)?jobWaitDays(x):waitDays(x),lc=lastChase(x);
    add("chase",t0,`Chase ${esc(x.waiting.on)}`,x,[["Chased",()=>agChased(x),`You chased them — it comes back in ${CHASE_EVERY} days`],["Answer in",()=>agAnswerIn(x),"Not waiting any more"]],
      {sub:[n!=null?`waiting ${n} d`:"",lc&&lc>=(x.waiting.since||"")?`chased ${-daysUntil(lc)} d ago`:""].filter(Boolean).join(" · ")});});
  state.todos.filter(x=>!x.done&&x.due&&x.due<=t0).forEach(x=>out.push({k:"todo",date:x.due,what:esc(x.text||"(no text)"),of:"📓 Journal",go:()=>{view="journal";journalTodos=true;renderApp();},
    acts:[["✓ Done",()=>{x.done=true;x.doneAt=Date.now();markDirty();renderApp();efToastUndo("To-do ticked off",()=>{x.done=false;x.doneAt=null;markDirty();renderApp();});},"Tick it off"]]}));
  state.tasks.forEach(x=>{const d=earliestOpenDue(x);if(!d||d>t0)return;const s=d===x.dueDate&&!["delivered","closed"].includes(x.status)?null:agSubDue(x,d);
    add("due",d,s?`Subtask: ${esc(s.title)}`:d<t0?"Past its due date":"Due today",x);});
  state.jobs.filter(j=>jobOpen(j)&&j.due&&j.due<=t0).forEach(x=>add("due",x.due,x.askedBy?`${esc(x.askedBy)} expects an answer`:"An answer is expected",x));
  return out.sort((a,b)=>a.date.localeCompare(b.date)||AG_KINDS[a.k].o-AG_KINDS[b.k].o);}
const AG_CAP=10;
function agendaHTML(items){const t0=todayStr(),late=items.filter(i=>i.date<t0).length,shown=agendaHTML.all?items:items.slice(0,AG_CAP);
  const have=efSum(state.efforts.filter(e=>e.date===t0)),evening=new Date().getHours()>=16&&efWd(t0)&&!efOff(t0)&&have<EF_DAY&&viewPref("cd.done","")!==t0;
  return `<div class="ck-unit agenda efx" id="agenda"><div class="ck-head"><h2>Today's agenda</h2><span class="ck-meta">${items.length?`${items.length} thing${items.length===1?"":"s"}${late?` · <b class="ag-late">${late} late</b>`:""} · `:""}next steps · your action points · follow-ups · due</span></div>
    ${items.length?`<div class="ag-list">${shown.map((it,i)=>{const K=AG_KINDS[it.k],n=-daysUntil(it.date);return `<div class="ag-row${n>0?" late":""}" data-ag="${i}" title="Open it">
      <span class="ag-when">${n>0?`${n} d late`:"today"}</span><span class="ag-k" style="--pen:var(--${K.pen})"><i></i>${K.l}</span>
      <span class="ag-what">${it.what}${it.sub?` <span class="ag-sub">${it.sub}</span>`:""}</span><span class="ag-of">${it.of}</span>
      <span class="ag-acts">${it.acts.map((a,ai)=>`<button class="sm${ai?" ghost":""}" data-ag="${i}" data-aa="${ai}" title="${esc(a[2]||"")}">${a[0]}</button>`).join("")}</span></div>`;}).join("")}
      ${items.length>shown.length?`<button class="sm ghost ag-more" id="agMore">＋ ${items.length-shown.length} more</button>`:""}</div>`
    :`<div class="ag-empty">✓ Nothing due today — no next steps, action points or follow-ups waiting on you.</div>`}
    <div class="ag-foot">${efDayBar(have,0,Math.max(18,EF_DAY*2))}<span><b>${efFh(have)} h</b> of ${efFh(EF_DAY)} logged today</span><button class="sm${evening?" primary":""}" id="agClose" title="An hours box for everything you touched today">☾ Close the day</button></div></div>`;}
function wireAgenda(host,items){const el=host.querySelector("#agenda");if(!el)return;
  el.querySelectorAll(".ag-row").forEach(r=>r.onclick=()=>{const it=items[+r.dataset.ag];if(it&&it.go)it.go();});
  el.querySelectorAll(".ag-acts button").forEach(b=>b.onclick=e=>{e.stopPropagation();items[+b.dataset.ag].acts[+b.dataset.aa][1]();});
  const m=el.querySelector("#agMore");if(m)m.onclick=()=>{agendaHTML.all=true;renderToday();};
  el.querySelector("#agClose").onclick=()=>openCloseDay();}

/* ---------- Close the day ---------- */
function dayTouched(d){const rows=[],logged=k=>efSum(state.efforts.filter(e=>e.date===d&&efKey(e)===k)),on=ts=>!!ts&&isoTs(ts)===d;
  const said=e=>e.type==="status"?`→ ${(STATUS[e.to]||{label:e.to}).label}`:String(e.note||"").replace(/^Next action done:?\s*/,"✓ ");
  state.tasks.forEach(t=>{const did=(t.timeline||[]).filter(e=>on(e.ts)&&(e.type==="status"||e.note)).map(said),has=logged(t.id);
    if(did.length||has||on(t.updatedAt))rows.push({key:t.id,name:demandLabel(t),title:t.demandId&&demandLabel(t)===t.demandId?t.title:"",did,has,note:did.filter(s=>s.startsWith("✓ ")).map(s=>s.slice(2)).join("; ")});});
  state.jobs.forEach(j=>{const es=j.log.filter(e=>e.date===d),did=es.map(e=>(e.kind==="step"?"✓ ":"")+e.text),has=logged("j:"+j.id);
    if(did.length||has||on(j.updatedAt))rows.push({key:"j:"+j.id,name:"☐ "+j.title,title:"",did,has,note:es.filter(e=>e.kind==="step").map(e=>e.text).join("; ")});});
  state.epics.forEach(e=>{const has=logged("e:"+e.id);if(has||on(e.updatedAt))rows.push({key:"e:"+e.id,name:"◆ "+(e.code||e.name),title:e.code?e.name:"",did:[],has,note:""});});
  /* what you actually did something on (a step, a status, hours) first; merely edited after */
  rows.sort((a,b)=>(b.did.length||b.has?1:0)-(a.did.length||a.has?1:0));
  return {rows,mtgs:state.meetings.filter(m=>m.date===d)};}
function openCloseDay(d){d=d&&d<=todayStr()?d:todayStr();const root=document.getElementById("modalRoot"),{rows,mtgs}=dayTouched(d),today=d===todayStr(),off=efOff(d);
  root.innerHTML=`<div class="modal-bg"><div class="modal efx cd-modal" style="width:780px"><h2>☾ Close the day <span class="faint" style="font-weight:400">${efWdl(d)}</span>
      <span class="cd-nav"><button class="sm ghost" id="cdPrev" title="The day before">‹</button><button class="sm ghost" id="cdNext" ${today?"disabled":""} title="The day after">›</button></span></h2>
    <p class="faint cd-lede">Everything you touched ${today?"today":"that day"}, an hours box each — fill in what you remember, leave the rest empty.${off?` <b>${EF_OFF[off.kind].icon} ${esc(efOffTxt(off))}</b>`:""}</p>
    <div class="cd-day" id="cdDay"></div>
    <div class="cd-rows">
      ${mtgs.map((m,i)=>{const e=state.efforts.find(x=>x.meetingId===m.id);return `<div class="cd-row" data-m="${i}"><span class="ef-pd" style="--pen:var(--ink-3)"></span><div class="cd-n"><b>👥 ${esc(m.title)}</b><div class="cd-did">meeting · its time goes to ${esc(efName(meetingEffortKey(m)))}</div></div>
        <span class="cd-has">${e?efFh(e.hours)+" h logged":""}</span><span></span><input class="cd-h mono" placeholder="h" ${e?`disabled title="Logged from the meeting's duration — change it on the meeting"`:""} autocomplete="off"></div>`;}).join("")}
      ${rows.map((r,i)=>`<div class="cd-row" data-r="${i}"><span class="ef-pd" style="--pen:var(--${efPen(r.key)})"></span><div class="cd-n"><b>${esc(r.name)}</b>${r.title?` <span class="faint">${esc(r.title)}</span>`:""}${r.did.length?`<div class="cd-did">${r.did.slice(0,4).map(esc).join(" · ")}${r.did.length>4?` · +${r.did.length-4}`:""}</div>`:""}</div>
        <span class="cd-has">${r.has?efFh(r.has)+" h logged":""}</span>
        <select class="cd-act" title="Activity">${efActList(r.key).map(a=>`<option ${a===efGuessAct(r.key,d)?"selected":""}>${esc(a)}</option>`).join("")}</select>
        <input class="cd-h mono" placeholder="${r.has?"+ h":"h"}" autocomplete="off"></div>`).join("")}
      <div class="cd-row cd-else"><span class="ef-pd" style="--pen:var(--ink-3)"></span><div class="cd-n"><b>Anything else</b><div class="cd-did">time that wasn't on a demand or task</div></div><span></span>
        <select class="cd-b" title="Where the time went">${Object.entries(EF_BUCKETS).map(([k,b])=>`<option value="${k}">${esc(b.l)}</option>`).join("")}</select><input class="cd-h mono" placeholder="h" autocomplete="off"></div>
    </div>
    ${rows.length||mtgs.length?"":`<div class="cd-none faint">Nothing touched ${today?"today":"that day"} — log time against a demand with ⏱ Log time, or put it under Anything else.</div>`}
    <div class="modal-foot"><button class="ghost sm" id="cdOff" style="margin-right:auto" title="Not working that day? Mark it as a holiday or leave">🏖 Day off…</button><button class="ghost" id="cdCancel">Cancel</button><button class="primary" id="cdLog">Log</button></div></div></div>`;
  const q=s=>root.querySelector(s),bg=q(".modal-bg"),close=()=>{root.innerHTML="";},have=efSum(state.efforts.filter(e=>e.date===d));
  const boxes=()=>[...root.querySelectorAll(".cd-h:not(:disabled)")];
  const parse=b=>{const v=b.value.trim();if(!v)return 0;const h=Math.round(efParseH(v)*4)/4;return !h||isNaN(h)||h>24?NaN:h;};
  const sync=()=>{let add=0,bad=0;boxes().forEach(b=>{const h=parse(b);b.classList.toggle("cd-bad",isNaN(h));if(isNaN(h))bad++;else add+=h;});
    const tot=have+add,left=EF_DAY-tot;
    q("#cdDay").innerHTML=`${efDayBar(have,add,Math.max(18,EF_DAY*2))}<span><b>${efFh(have)} h</b> logged${add?` <span class="ef-good">+ ${efFh(add)}</span> = <b>${efFh(tot)} h</b>`:""} of ${efFh(EF_DAY)}${off?"":left>0?` · <b>${efFh(left)} h</b> not accounted for`:left<0?` · ${efFh(-left)} h over`:" · a full day"}</span>`;
    const lb=q("#cdLog");lb.textContent=bad?"Check the hours":add?`Log ${efFh(add)} h`:"Log";lb.disabled=!add||!!bad;};
  const log=()=>{if(q("#cdLog").disabled)return;const made=[],mt=[],now=Date.now();
    root.querySelectorAll(".cd-row").forEach(row=>{const b=row.querySelector(".cd-h");if(!b||b.disabled)return;const h=parse(b);if(!h||isNaN(h))return;
      if(row.dataset.r!=null){const r=rows[+row.dataset.r],k=r.key,isJ=k.startsWith("j:"),isE=k.startsWith("e:");
        const e=normEffort({date:d,hours:h,taskId:isJ||isE?"":k,jobId:isJ?k.slice(2):"",epicId:isE?k.slice(2):"",activity:row.querySelector(".cd-act").value,note:r.note});state.efforts.push(e);made.push(e);
        const t=efTaskOf(k);if(t)t.updatedAt=now;if(isJ){const j=jobById(k.slice(2));if(j&&j.status==="open")j.status="progress";}}
      else if(row.dataset.m!=null){const m=mtgs[+row.dataset.m];mt.push([m,m.hours]);m.hours=h;m.updatedAt=now;meetingEffortSync(m);}
      else{const e=normEffort({date:d,hours:h,bucket:row.querySelector(".cd-b").value});state.efforts.push(e);made.push(e);}});
    const n=made.length+mt.length;if(!n)return;
    if(today)setViewPref("cd.done",d);markDirty();close();renderApp();efTimerUI();
    const sum=efSum(made)+mt.reduce((s,[m])=>s+m.hours,0);
    efToastUndo(`Logged ${efFh(sum)} h on ${n} thing${n===1?"":"s"} · ${efFh(efSum(state.efforts.filter(e=>e.date===d)))} of ${efFh(EF_DAY)} h ${today?"today":"on "+efWdl(d)}`,()=>{
      made.forEach(e=>{const i=state.efforts.indexOf(e);if(i>=0)state.efforts.splice(i,1);});mt.forEach(([m,h0])=>{m.hours=h0;meetingEffortSync(m);});
      if(today)setViewPref("cd.done","");markDirty();renderApp();efTimerUI();});};
  boxes().forEach(b=>{b.oninput=sync;b.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();log();}};});
  q("#cdLog").onclick=log;q("#cdCancel").onclick=close;bg.onclick=e=>{if(e.target===bg)close();};
  q("#cdPrev").onclick=()=>openCloseDay(efAdd(d,-1));q("#cdNext").onclick=()=>openCloseDay(efAdd(d,1));
  q("#cdOff").onclick=()=>openDaysOff({date:d});
  sync();setTimeout(()=>{const b=boxes()[0];if(b)b.focus();},40);}
