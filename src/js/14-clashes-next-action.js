/* ===================== OBJECT CLASHES ===================== */
/* The same object changed in two demands at once is how transports overwrite each
   other in QA or Prod. An object is "in flight" from the moment it's logged until the
   transports carrying it reach that demand's go-live system. Objects only Analyzed,
   and closed demands, never count. */
const objKey=n=>String(n||"").trim().toUpperCase();
function objectInFlight(t,o){
  if(!objKey(o.name)||o.action==="Analyzed"||t.status==="closed")return false;
  const trs=trsForObject(t,o.id);
  if(trs.length)return trs.some(tr=>trTargets(t,tr).length?!trComplete(t,tr):t.status!=="delivered");
  if(t.status!=="delivered")return true;
  return !!golivePending(t); /* delivered, object not ticked on a TR: trust the demand's own go-live check */
}
/* object name → every in-flight use, kept only where 2+ different demands share it */
function clashIndex(){const m=new Map();
  state.tasks.forEach(t=>t.objects.forEach(o=>{if(!objectInFlight(t,o))return;const k=objKey(o.name);
    if(!m.has(k))m.set(k,[]);m.get(k).push({t,o});}));
  [...m.keys()].forEach(k=>{if(new Set(m.get(k).map(x=>x.t.id)).size<2)m.delete(k);});
  return m;}
/* the other demands where this object is also in flight; ack = "sequenced, stop warning" */
function clashesFor(t,o,idx){if(!objectInFlight(t,o))return [];
  const v=(idx||clashIndex()).get(objKey(o.name));if(!v)return [];
  const seen=new Set();
  return v.filter(x=>x.t.id!==t.id&&!seen.has(x.t.id)&&seen.add(x.t.id))
    .map(x=>({t:x.t,o:x.o,ack:(o.ackClash||[]).includes(x.t.id)}));}
function taskClashes(t,idx){idx=idx||clashIndex();const out=[];
  t.objects.forEach(o=>{const c=clashesFor(t,o,idx);if(c.length)out.push({o,others:c,open:c.filter(x=>!x.ack)});});return out;}
function openClashCount(t,idx){return taskClashes(t,idx).filter(x=>x.open.length).length;}
/* acknowledging is mutual — both demands stop warning about each other for that object */
function setClashAck(t,o,other,on){const k=objKey(o.name);
  const flip=(obj,id)=>{obj.ackClash=obj.ackClash||[];
    if(on){if(!obj.ackClash.includes(id))obj.ackClash.push(id);}else obj.ackClash=obj.ackClash.filter(x=>x!==id);};
  t.objects.filter(x=>objKey(x.name)===k).forEach(x=>flip(x,other.id));
  other.objects.filter(x=>objKey(x.name)===k).forEach(x=>flip(x,t.id));
  other.updatedAt=Date.now();touch(t);}
/* where the other demand's copy of the object stands, e.g. "In progress · H03K900812 at H02" */
function clashWhere(x){const trs=trsForObject(x.t,x.o.id);
  return STATUS[x.t.status].label+(trs.length
    ?" · "+trs.map(tr=>{const r=[...reachedSystems(x.t,tr)];return (tr.number||"(TR)")+(r.length?" at "+r.join("/"):" not moved yet");}).join(", ")
    :" · not on a transport yet");}
function trClashHtml(t,tr,idx){const out=[];
  (tr.objectIds||[]).forEach(id=>{const o=t.objects.find(x=>x.id===id);if(!o)return;
    clashesFor(t,o,idx).filter(x=>!x.ack).forEach(x=>out.push(`⚠ Carries <b class="mono">${esc(o.name)}</b>, also in flight in <b>${esc(demandLabel(x.t))}</b> (${esc(clashWhere(x))}) — agree the import order.`));});
  return out.map(x=>`<div class="clash">${x}</div>`).join("");}

/* ===================== NEXT ACTION ===================== */
/* "Look at this again on …" — a date (and what to do) that brings a demand back onto
   Today, so it can be parked without being forgotten. */
function nextActionDue(t){const n=t.nextAction;return !!(n&&n.date&&n.date<=todayStr()&&t.status!=="closed");}
/* the next working day after a date — skips weekends and marked holidays / leave */
function nextWorkDay(d){let x=efAdd(d||todayStr(),1);for(let i=0;i<30&&(!efWd(x)||efOff(x));i++)x=efAdd(x,1);return x;}
/* done: the step just ticked off (✓ Done) — the box then asks for the step after it */
function openNextAction(t,done){
  const n=done?{date:"",note:""}:(t.nextAction||{date:"",note:""});
  const plus=d=>{const x=new Date(todayStr()+"T00:00:00");x.setDate(x.getDate()+d);return isoD(x);};
  const nextMon=(()=>{const x=new Date(todayStr()+"T00:00:00");x.setDate(x.getDate()+((8-x.getDay())%7||7));return isoD(x);})(),nwd=nextWorkDay();
  const quick=[["Next working day",nwd],...(nwd!==plus(1)?[["Tomorrow",plus(1)]]:[]),["In 3 days",plus(3)],["Next Monday",nextMon],["In 1 week",plus(7)],["In 2 weeks",plus(14)],["In a month",plus(30)]];
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:460px"><h2>${done?"✓ Done — and the next step?":"⏰ Next action"} — ${esc(demandLabel(t))}</h2>
    ${done?`<div class="na-donestep"><span>✓</span><s>${esc(done.note||"(no note)")}</s></div><div class="field na-time efx"><label>Time it took <span class="faint" style="text-transform:none;letter-spacing:0;font-weight:400">· optional — logged in Effort for today</span></label><div class="na-hrow"><input id="na-hrs" class="mono" placeholder="e.g. 1.5 · 2h30" autocomplete="off">${[["½ h","0.5"],["1 h","1"],["2 h","2"],["3 h","3"]].map(([l,h])=>`<button class="sm na-h" data-h="${h}">${l}</button>`).join("")}<span class="na-dsf" id="na-dsf"></span></div></div>`:`<p class="faint" style="font-size:12px;margin-top:-8px">On this date the demand comes back up on <b>Today</b> — park it without forgetting it.</p>`}
    <div class="field"><label>${done?"Next step":"What to do"}</label><input id="na-note" value="${esc(n.note)}" placeholder="${done?"What comes after it — leave empty if nothing yet":"e.g. Chase QA for test results, check the TR reached H02"}"></div>
    <div class="field"><label>On</label><input type="date" id="na-date" value="${n.date||nwd}" style="width:170px"></div>
    <div class="chiprow">${quick.map(([l,d])=>`<button class="sm na-q" data-d="${d}" title="${d}">${l}</button>`).join("")}</div>
    <div class="modal-foot">${done?`<button id="na-just" class="ghost" style="margin-right:auto" title="Tick it off without a next step">Just done</button>`:n.date?`<button id="na-clear" class="ghost" style="margin-right:auto">Clear</button>`:""}<button id="na-cancel" class="ghost">Cancel</button><button id="na-save" class="primary">${done?"Set next step":"Set"}</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  /* the time the step took — optional; 0 = none, -1 = not a number of hours (the dialog stays open) */
  const hrs=()=>{const i=root.querySelector("#na-hrs");if(!i||!i.value.trim())return 0;const h=Math.round(efParseH(i.value)*4)/4;
    if(!h||isNaN(h)||h>24){i.classList.add("na-bad");i.focus();toast("How long did it take? e.g. 1.5 · 2h30 · 90m — or leave it empty",true);return -1;}return h;};
  let logged=0;
  const tick=h=>{if(!done)return;if(isJob(t))jobLog(t,"step",done.note||"(step)");else logTimeline(t,"note","","",`Next action done${done.note?": "+done.note:""}`);
    if(h>0){const key=isJob(t)?"j:"+t.id:t.id;state.efforts.push(normEffort({date:todayStr(),hours:h,taskId:isJob(t)?"":t.id,jobId:isJob(t)?t.id:"",activity:efGuessAct(key,todayStr()),note:done.note||""}));
      setViewPref("ef.last",key);if(isJob(t)&&t.status==="open")t.status="progress";logged=h;efTimerUI();}};
  const doneMsg=()=>"Done — noted in History"+(logged?` · ${efFh(logged)} h logged`:"");
  root.querySelectorAll(".na-q").forEach(b=>b.onclick=()=>{root.querySelector("#na-date").value=b.dataset.d;});
  {const hi=root.querySelector("#na-hrs");if(hi){const have=efSum(state.efforts.filter(e=>e.date===todayStr()));
    const sy=()=>{const v=efParseH(hi.value),add=isNaN(v)?0:Math.round(v*4)/4;hi.classList.toggle("na-bad",!!hi.value.trim()&&!add);
      root.querySelectorAll(".na-h").forEach(b=>b.classList.toggle("on",+b.dataset.h===add));
      root.querySelector("#na-dsf").innerHTML=`${efDayBar(have,add)}<span>${efFh(have)} h today${add?` <span class="ef-good">+ ${efFh(add)}</span>`:""} of ${efFh(EF_DAY)}</span>`;};
    hi.oninput=sy;root.querySelectorAll(".na-h").forEach(b=>b.onclick=()=>{hi.value=+b.dataset.h===efParseH(hi.value)?"":b.dataset.h;sy();});sy();}}
  root.querySelector("#na-cancel").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  const clr=root.querySelector("#na-clear");if(clr)clr.onclick=()=>{t.nextAction={date:"",note:""};touch(t);close();renderApp();};
  const just=()=>{const h=hrs();if(h<0)return;tick(h);t.nextAction={date:"",note:""};touch(t);close();renderApp();toast(doneMsg());};
  const jb=root.querySelector("#na-just");if(jb)jb.onclick=just;
  const save=()=>{const d=root.querySelector("#na-date").value,note=root.querySelector("#na-note").value.trim();
    if(done&&!note){just();return;}
    if(!d){toast("Pick a date",true);return;}
    const h=hrs();if(h<0)return;
    tick(h);t.nextAction={date:d,note};touch(t);close();renderApp();
    toast((done?doneMsg()+". ":"")+(d<=todayStr()?"Next step is due now — it's on Today":"Back on Today on "+d));};
  root.querySelector("#na-save").onclick=save;
  root.querySelectorAll("input").forEach(i=>i.onkeydown=e=>{if(e.key==="Enter")save();});
  root.querySelector("#na-note").focus();
}
function nextActionDone(t){const n=t.nextAction;if(!n||!n.date)return;openNextAction(t,{note:n.note||""});}
/* the steps already done, newest first — read back from History */
function nextActionTrail(t){return (t.timeline||[]).filter(e=>e.type==="note"&&/^Next action done/.test(e.note||"")).map(e=>({ts:e.ts,note:(e.note||"").replace(/^Next action done:?\s*/,"")||"(no note)"})).sort((a,b)=>b.ts-a.ts);}

