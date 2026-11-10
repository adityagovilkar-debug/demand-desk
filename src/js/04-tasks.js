/* ===================== TASKS — work that isn't a demand =====================
   The ask from a call, the mystery mail nobody owns, the "check this with Basis by Friday":
   a title, who asked and how, when they expect an answer, the brief as given, a dated log of
   what happened (calls, analysis, updates in, what you sent), the next action and who you're
   waiting on, reference facts, and finally what you reported back and whether it was in time.
   Hours are logged against a task like any demand (effort key "j:<id>"). Stored as state.jobs
   (state.todos is the Journal's quick checklist; state.tasks are demands). */
const JOB_STATUS={open:{l:"To do",cls:"open"},progress:{l:"In progress",cls:"progress"},done:{l:"Done",cls:"delivered"},dropped:{l:"Dropped",cls:"closed"}};
const JOB_SRC={call:"📞 Call",meeting:"👥 Meeting",email:"✉ Email",chat:"💬 Chat",self:"🙋 Myself",other:"Other"};
const JOB_LOG={call:{i:"📞",l:"Call"},analysis:{i:"🔍",l:"Analysis"},update:{i:"📨",l:"Update in"},sent:{i:"✉",l:"Sent / reported"},note:{i:"📝",l:"Note"},step:{i:"✓",l:"Step done"}};
let activeJobId=null,jobFilter="open",jobQuery="";
function normJob(j){j=j||{};const d=x=>/^\d{4}-\d\d-\d\d$/.test(x||"")?x:"";
  return{id:j.id||uid(),title:String(j.title||"").trim()||"(untitled task)",askedBy:String(j.askedBy||"").trim(),source:JOB_SRC[j.source]?j.source:"other",
    received:d(j.received)||isoTs(j.createdAt||Date.now()),due:d(j.due),status:JOB_STATUS[j.status]?j.status:"open",brief:String(j.brief||""),
    log:(j.log||[]).map(x=>({id:x.id||uid(),date:d(x.date)||todayStr(),kind:JOB_LOG[x.kind]?x.kind:"note",text:String(x.text||"")})).filter(x=>x.text.trim()),
    nextAction:{date:(j.nextAction&&j.nextAction.date)||"",note:(j.nextAction&&j.nextAction.note)||""},
    waiting:{on:(j.waiting&&j.waiting.on)||"",since:(j.waiting&&j.waiting.since)||""},
    refs:(j.refs||[]).map(r=>({id:r.id||uid(),label:String(r.label||""),value:String(r.value||""),secret:!!r.secret})),
    outcome:String(j.outcome||""),closedOn:d(j.closedOn),meetingId:String(j.meetingId||""),
    taskIds:(j.taskIds||[]).slice(),epicIds:(j.epicIds||[]).slice(),createdAt:j.createdAt||Date.now(),updatedAt:j.updatedAt||Date.now()};}
const jobById=id=>(state.jobs||[]).find(j=>j.id===id)||null;
const activeJob=()=>jobById(activeJobId);
const isJob=x=>!!x&&(state.jobs||[]).includes(x);
const jobOpen=j=>j.status==="open"||j.status==="progress";
const jobHours=j=>efSum(state.efforts.filter(e=>e.jobId===j.id));
const jobWaiting=j=>jobOpen(j)&&!!(j.waiting&&j.waiting.on);
const jobWaitDays=j=>j.waiting&&j.waiting.since?Math.max(0,-daysUntil(j.waiting.since)):null;
function jobLog(j,kind,text,date){j.log.push({id:uid(),date:date||todayStr(),kind,text:String(text||"")});touch(j);}
/* answered before / on / after the date they expected */
function jobTiming(j){if(!j.due||!j.closedOn||j.status!=="done")return null;
  const n=Math.round((new Date(j.due+"T00:00:00")-new Date(j.closedOn+"T00:00:00"))/864e5);
  return {n,txt:n>0?`${n} day${n>1?"s":""} before expected`:n===0?"on the day expected":`${-n} day${n<-1?"s":""} after expected`,ok:n>=0};}
/* what needs you: overdue or due within 3 days, a next action due, or waiting 3+ days */
function jobsNeedingYou(){const t=todayStr(),out=[];
  state.jobs.filter(jobOpen).forEach(j=>{const why=[];
    if(j.due){const n=daysUntil(j.due);if(n<0)why.push(`⚑ ${-n}d past expected`);else if(n<=3)why.push(n===0?"expected today":`expected in ${n}d`);}
    if(j.nextAction.date&&j.nextAction.date<=t)why.push(`⏰ ${esc(j.nextAction.note||"next action")}`);
    if(jobWaiting(j)&&(jobWaitDays(j)||0)>=3)why.push(`⏳ ${esc(j.waiting.on)} ${jobWaitDays(j)}d`);
    if(why.length)out.push({j,why,rank:j.due?daysUntil(j.due):99});});
  return out.sort((a,b)=>a.rank-b.rank);}
function newJob(o){const j=normJob({received:todayStr(),status:"open",source:"call",...(o||{})});state.jobs.unshift(j);activeJobId=j.id;view="jobs";markDirty();renderApp();
  setTimeout(()=>{const i=document.getElementById("jb-title");if(i&&!o)i.select();},40);return j;}

function renderJobSidebar(){const F={open:"Open",waiting:"Waiting",done:"Done",all:"All"},t=todayStr();
  document.getElementById("side").innerHTML=`<div class="side-tools">
      <button class="primary" id="btnNewJob" style="width:100%">＋ New task</button>
      <div class="jb-seg">${Object.entries(F).map(([k,l])=>`<button class="sm ${jobFilter===k?"on":"ghost"}" data-jf="${k}">${l}</button>`).join("")}</div>
      <input id="jbQ" placeholder="Filter: title, who asked…" value="${esc(jobQuery)}" autocomplete="off">
      <p class="faint" style="font-size:11px;margin:0">Work that isn't a demand — an ask from a call, a mail nobody owns. Hours log against it like a demand.</p></div>
    <div class="stats"><div class="stat op"><b>${state.jobs.filter(jobOpen).length}</b>open</div><div class="stat ov"><b>${state.jobs.filter(j=>jobOpen(j)&&j.due&&j.due<t).length}</b>late</div><div class="stat"><b>${state.jobs.filter(jobWaiting).length}</b>waiting</div></div>
    <div class="listwrap" id="jbList"></div>`;
  document.getElementById("btnNewJob").onclick=()=>newJob();
  document.querySelectorAll("[data-jf]").forEach(b=>b.onclick=()=>{jobFilter=b.dataset.jf;renderJobSidebar();});
  const q=document.getElementById("jbQ");q.oninput=()=>{jobQuery=q.value;drawJobList();};
  drawJobList();}
function drawJobList(){const el=document.getElementById("jbList");if(!el)return;const words=jobQuery.toLowerCase().split(/\s+/).filter(Boolean),t=todayStr();
  let rows=state.jobs.filter(j=>jobFilter==="all"||(jobFilter==="open"?jobOpen(j):jobFilter==="waiting"?jobWaiting(j):!jobOpen(j)));
  if(words.length)rows=rows.filter(j=>{const b=[j.title,j.askedBy,j.brief,j.outcome,j.waiting.on,...j.log.map(x=>x.text)].join(" ").toLowerCase();return words.every(w=>b.includes(w));});
  rows.sort((a,b)=>(jobOpen(b)-jobOpen(a))||(jobOpen(a)?(a.due||"9999").localeCompare(b.due||"9999")||a.received.localeCompare(b.received):(b.closedOn||"").localeCompare(a.closedOn||"")));
  if(!rows.length){el.innerHTML=`<div class="empty">${state.jobs.length?"Nothing here.":"No tasks yet.<br>The ask from a call, the mail nobody<br>owns — anything that isn't a demand."}</div>`;return;}
  el.innerHTML=rows.map(j=>{const st=JOB_STATUS[j.status],h=jobHours(j),dc=j.due&&jobOpen(j)?dueClass(j.due,"open"):"",tm=jobTiming(j);
    return `<div class="tcard s-${st.cls} ${j.id===activeJobId?"active":""}" data-id="${j.id}">
      <div class="demand">${JOB_SRC[j.source].split(" ")[0]} ${esc(j.askedBy||"—")}</div>
      <div class="ttitle">${esc(j.title)}</div>
      <div class="meta"><span class="pill ${st.cls}">${st.l}</span>
        ${jobWaiting(j)?`<span class="pill" style="color:var(--amber);border-color:var(--amber-line)">⏳ ${esc(j.waiting.on)}${jobWaitDays(j)!=null?" "+jobWaitDays(j)+"d":""}</span>`:""}
        ${jobOpen(j)&&j.nextAction.date?`<span class="due ${j.nextAction.date<=t?"soon":""}" title="${esc(j.nextAction.note)}">⏰ ${j.nextAction.date.slice(5)}</span>`:""}
        ${j.due&&jobOpen(j)?`<span class="due ${dc}">⚑ ${j.due}</span>`:""}${tm?`<span class="faint" style="color:var(--${tm.ok?"green":"red"})">${tm.ok?"✓":"⚑"} ${tm.txt}</span>`:""}
        ${h?`<span class="faint">⏱ ${efFh(h)} h</span>`:""}</div></div>`;}).join("");
  el.querySelectorAll(".tcard").forEach(x=>x.onclick=()=>{activeJobId=x.dataset.id;renderApp();});}

function renderJobDetail(){const j=activeJob(),host=document.getElementById("detail");
  if(!j){host.innerHTML=nopick("Select a task, or create one —<br>anything you've been asked that<br>isn't a demand.");return;}
  const st=JOB_STATUS[j.status],na=jobOpen(j)&&j.nextAction.date?j.nextAction:null,nad=na?daysUntil(na.date):0,tm=jobTiming(j),bench=benchOn();
  const asked=[...new Set(state.jobs.map(x=>x.askedBy).filter(Boolean))].sort();
  host.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1">
      <input id="jb-title" value="${esc(j.title)}" style="font-size:18px;font-weight:650;border-color:transparent;background:transparent;padding:2px 4px;width:100%">
      <div class="dh-dates" style="margin-top:8px">
        <span>Status <select id="jb-status" style="width:130px">${Object.entries(JOB_STATUS).map(([k,v])=>`<option value="${k}" ${k===j.status?"selected":""}>${v.l}</option>`).join("")}</select></span>
        <span>Asked by <input id="jb-asked" list="dl-jasked" value="${esc(j.askedBy)}" placeholder="e.g. my manager, team mailbox" style="width:180px"><datalist id="dl-jasked">${asked.map(a=>`<option value="${esc(a)}">`).join("")}</datalist></span>
        <span>Came in by <select id="jb-src" style="width:130px">${Object.entries(JOB_SRC).map(([k,v])=>`<option value="${k}" ${k===j.source?"selected":""}>${v}</option>`).join("")}</select></span>
        <span>Received <input type="date" id="jb-rec" value="${j.received}" style="width:150px"></span>
        <span>Expected by <input type="date" id="jb-due" value="${j.due}" style="width:150px"></span>
      </div><canvas class="jb-rail" title="From the ask to the answer"></canvas><div class="jb-railnote">${(()=>{const age=-daysUntil(j.received)+1,n=j.due?daysUntil(j.due):null,tm=jobTiming(j);
        if(j.status==="done")return tm?`Reported back ${tm.txt}`:"Reported back";if(j.status==="dropped")return "Dropped";
        return `Day ${age} · `+(n==null?"no date expected":n>0?`expected in ${n} d`:n===0?"expected today":`${-n} d past expected`);})()}</div></div>
      <div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end"><span class="pill ${st.cls}" style="font-size:12px">${st.l}</span>
        <button class="sm" id="jb-logt" title="Log time against this task">⏱ Log time</button>
        ${jobOpen(j)?`<button class="sm primary" id="jb-close" title="Record what you reported back">✓ Close…</button>`:""}
        <button class="sm danger" id="jb-del">🗑 Delete</button></div></div>
    ${na?(bench?`<div class="bband ${nad<=0?"watch":""}"><span class="k">Next action · ${nad<0?(-nad)+" d ago":nad===0?"today":"in "+nad+" d"}</span><span class="tx"><b>${esc(na.note||"(no note)")}</b> <span class="mono faint">${na.date}</span></span><button class="sm" id="jb-nadone">✓ Done</button><button class="sm ghost" id="jb-naedit">✎</button></div>`
       :`<div class="nextact ${nad<=0?"due":""}">⏰ Next action <b class="mono">${na.date}</b> — ${esc(na.note||"(no note)")} <button class="ghost sm" id="jb-nadone">✓ Done</button><button class="ghost sm" id="jb-naedit">✎</button></div>`)
      :jobOpen(j)?`<div class="jb-bandrow"><button class="sm ghost" id="jb-naset">⏰ Set the next action</button></div>`:""}
    ${jobOpen(j)?`<div class="jb-bandrow jb-wait">⏳ Waiting on <input id="jb-won" list="dl-jwait" value="${esc(j.waiting.on)}" placeholder="nobody — e.g. Basis team" style="width:200px"><datalist id="dl-jwait">${[...new Set([...WAIT_OPTIONS,...state.jobs.map(x=>x.waiting.on).filter(Boolean)])].map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
      ${j.waiting.on?`since <input type="date" id="jb-wsince" value="${j.waiting.since}" style="width:150px">${jobWaitDays(j)!=null?` <span class="faint">${jobWaitDays(j)} d</span>`:""}`:""}</div>`:""}
    ${!jobOpen(j)?`<div class="jb-closed ${tm?(tm.ok?"ok":"late"):""}">${j.status==="done"?"✓ Done":"Dropped"}${j.closedOn?` on <b>${j.closedOn}</b>`:""}${tm?` — <b>${tm.txt}</b>`:""}</div>`:""}
  </div>
  <div class="detail-body">
    ${!jobOpen(j)?`<div class="sec-title"><h3>${j.status==="done"?"What I reported back":"Why it was dropped"}</h3><div class="ln"></div></div><textarea id="jb-out" style="min-height:70px">${esc(j.outcome)}</textarea>`:""}
    <div class="sec-title" style="margin-top:${jobOpen(j)?0:16}px"><h3>The ask</h3><div class="ln"></div></div>
    <textarea id="jb-brief" placeholder="The instructions as given — what exactly they want to know, any constraints, who else is involved" style="min-height:90px">${esc(j.brief)}</textarea>
    <div class="sec-title" style="margin-top:16px"><h3>Log</h3><div class="ln"></div><span class="faint" style="font-size:11px">${j.log.length} entr${j.log.length===1?"y":"ies"}</span></div>
    <div class="jb-add"><div class="jb-kinds">${Object.entries(JOB_LOG).filter(([k])=>k!=="step").map(([k,v],i)=>`<button class="sm ${i===0?"on":"ghost"}" data-lk="${k}">${v.i} ${v.l}</button>`).join("")}</div>
      <div class="jb-addrow"><input type="date" id="jb-ldate" value="${todayStr()}" style="flex:0 0 150px"><input id="jb-ltext" placeholder="What happened — e.g. Call with Basis: they need the client number first (Enter to add)"><button class="sm primary" id="jb-ladd">Add</button></div></div>
    <div id="jb-log"></div>
    <div class="sec-title" style="margin-top:18px"><h3>Reference</h3><div class="ln"></div><button class="sm" id="jb-refadd">＋ Add</button></div>
    <div id="jb-refs"></div>
    <div class="sec-title" style="margin-top:18px"><h3>Linked</h3><div class="ln"></div><button class="sm" id="jb-link" title="Only if it turns out to touch a demand or epic">🔗 Demand / epic</button></div>
    <div class="jb-bandrow" style="margin-top:0">👥 Asked in meeting <select id="jb-mtg" style="max-width:360px"><option value="">— none —</option>${state.meetings.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,60).concat(j.meetingId&&!state.meetings.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,60).some(m=>m.id===j.meetingId)?state.meetings.filter(m=>m.id===j.meetingId):[]).map(m=>`<option value="${m.id}" ${m.id===j.meetingId?"selected":""}>${m.date} · ${esc(m.title)}</option>`).join("")}</select>${j.meetingId&&state.meetings.some(m=>m.id===j.meetingId)?` <a href="#" id="jb-mtggo">open ›</a>`:""}</div>
    <div class="chiprow" id="jb-chips"></div>
    <div class="sec-title" style="margin-top:18px"><h3>Time</h3><div class="ln"></div><span class="faint" style="font-size:11px" id="jb-hrs"></span><button class="sm" id="jb-logt2">⏱ Log time</button></div>
    <div id="jb-time"></div>
  </div>`;
  {const cv=host.querySelector(".jb-rail");if(cv){const fl=j.log.map(x=>x.date).sort()[0]||"";
    const st=[{label:"Received",date:shortD(j.received)},{label:"Working",date:fl?shortD(fl):""},{label:j.status==="dropped"?"Dropped":"Reported",date:j.closedOn?shortD(j.closedOn):j.due?"by "+shortD(j.due):""}];
    const cur=j.status==="done"||j.status==="dropped"?3:j.log.length||j.status==="progress"?1:0;
    DK.scope(cv,(c,w,h,tm)=>{const C=efC(cv);V2.rail(c,C,34,w-40,h/2+3,st,cur,C["pen-7"],tm);});}}
  const q=s=>host.querySelector(s),side=()=>renderJobSidebar();
  q("#jb-title").onchange=e=>{j.title=e.target.value.trim()||"(untitled task)";touch(j);side();};
  q("#jb-asked").onchange=e=>{j.askedBy=e.target.value.trim();touch(j);side();};
  q("#jb-src").onchange=e=>{j.source=e.target.value;touch(j);side();};
  q("#jb-rec").onchange=e=>{j.received=e.target.value||todayStr();touch(j);};
  q("#jb-due").onchange=e=>{j.due=e.target.value;touch(j);side();};
  q("#jb-status").onchange=e=>{const v=e.target.value;
    if((v==="done"||v==="dropped")&&jobOpen(j)){e.target.value=j.status;openJobClose(j,v);return;}
    if(jobOpen({status:v})&&!jobOpen(j)){j.closedOn="";jobLog(j,"note","Reopened");}
    j.status=v;touch(j);renderApp();};
  q("#jb-brief").onchange=e=>{j.brief=e.target.value;touch(j);};
  {const o=q("#jb-out");if(o)o.onchange=e=>{j.outcome=e.target.value;touch(j);};}
  q("#jb-logt").onclick=q("#jb-logt2").onclick=()=>openLogTime({key:"j:"+j.id});
  {const c=q("#jb-close");if(c)c.onclick=()=>openJobClose(j,"done");}
  q("#jb-del").onclick=()=>{const h=jobHours(j);if(!confirm(`Delete “${j.title}”?${h?` The ${efFh(h)} h logged on it stay in Effort as “(deleted task)”.`:""}`))return;
    state.jobs=state.jobs.filter(x=>x.id!==j.id);activeJobId=null;markDirty();renderApp();};
  {const d=q("#jb-nadone");if(d)d.onclick=()=>nextActionDone(j);const ed=q("#jb-naedit");if(ed)ed.onclick=()=>openNextAction(j);const s=q("#jb-naset");if(s)s.onclick=()=>openNextAction(j);}
  {const w=q("#jb-won");if(w)w.onchange=e=>{const v=e.target.value.trim();if(v&&!j.waiting.on)jobLog(j,"note",`Waiting on ${v}`);j.waiting={on:v,since:v?(j.waiting.since||todayStr()):""};touch(j);renderApp();};
   const ws=q("#jb-wsince");if(ws)ws.onchange=e=>{j.waiting.since=e.target.value;touch(j);renderApp();};}
  /* log */
  let kind="call";host.querySelectorAll("[data-lk]").forEach(b=>b.onclick=()=>{kind=b.dataset.lk;host.querySelectorAll("[data-lk]").forEach(x=>{x.classList.toggle("on",x===b);x.classList.toggle("ghost",x!==b);});q("#jb-ltext").focus();});
  const addLog=()=>{const tx=q("#jb-ltext").value.trim();if(!tx)return;jobLog(j,kind,tx,q("#jb-ldate").value||todayStr());
    if(j.status==="open")j.status="progress";q("#jb-ltext").value="";drawLog();side();};
  q("#jb-ladd").onclick=addLog;q("#jb-ltext").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addLog();}};
  const drawLog=()=>{const el=q("#jb-log"),L=j.log.slice().sort((a,b)=>b.date.localeCompare(a.date));
    el.innerHTML=L.map(x=>`<div class="jb-le" data-id="${x.id}"><span class="ic" title="${JOB_LOG[x.kind].l}">${JOB_LOG[x.kind].i}</span><span class="mono d">${shortD(x.date)}</span><span class="tx">${linkify(x.text)}</span><button class="ghost sm jb-led" title="Edit">✎</button><button class="ghost sm danger jb-lrm" title="Delete">✕</button></div>`).join("")||`<div class="faint" style="font-size:12px;padding:4px 2px">Nothing yet — log calls, your analysis, updates that come in, and what you sent.</div>`;
    el.querySelectorAll(".jb-le").forEach(r=>{const x=j.log.find(y=>y.id===r.dataset.id);
      r.querySelector(".jb-led").onclick=()=>editInline(r.querySelector(".tx"),x.text,v=>{if(v.trim()){x.text=v.trim();touch(j);}drawLog();});
      r.querySelector(".jb-lrm").onclick=()=>{j.log=j.log.filter(y=>y!==x);touch(j);drawLog();};});};
  drawLog();
  /* reference facts */
  const drawRefs=()=>{const el=q("#jb-refs");
    el.innerHTML=j.refs.map(r=>`<div class="jb-ref" data-id="${r.id}"><input class="rl" value="${esc(r.label)}" placeholder="Label — e.g. Contact, mailbox, ticket"><input class="rv ${r.secret?"mono":""}" type="${r.secret?"password":"text"}" value="${esc(r.value)}" placeholder="Value"><label title="Hide the value (it's still in your file — encrypt the file to protect it)"><input type="checkbox" class="rs" ${r.secret?"checked":""}> secret</label><button class="ghost sm danger rx">✕</button></div>`).join("")||`<div class="faint" style="font-size:12px;padding:2px">Names, numbers, mailboxes — the facts you'll need again.</div>`;
    el.querySelectorAll(".jb-ref").forEach(row=>{const r=j.refs.find(x=>x.id===row.dataset.id);
      row.querySelector(".rl").onchange=e=>{r.label=e.target.value;touch(j);};row.querySelector(".rv").onchange=e=>{r.value=e.target.value;touch(j);};
      row.querySelector(".rs").onchange=e=>{r.secret=e.target.checked;touch(j);drawRefs();};row.querySelector(".rx").onclick=()=>{j.refs=j.refs.filter(x=>x!==r);touch(j);drawRefs();};});};
  q("#jb-refadd").onclick=()=>{j.refs.push({id:uid(),label:"",value:"",secret:false});touch(j);drawRefs();const ins=q("#jb-refs").querySelectorAll(".rl");if(ins.length)ins[ins.length-1].focus();};
  drawRefs();
  /* links */
  q("#jb-mtg").onchange=e=>{j.meetingId=e.target.value;touch(j);renderJobDetail();};
  {const g=q("#jb-mtggo");if(g)g.onclick=e=>{e.preventDefault();view="meetings";meetingRollup=false;activeMeetingId=j.meetingId;renderApp();};}
  const drawChips=()=>drawLinkChips(q("#jb-chips"),j,drawChips,"Not tied to any demand or epic — that's fine.");drawChips();
  q("#jb-link").onclick=()=>openLinkPicker(j,`Link “${esc(j.title)}”`,drawChips);
  /* time */
  const es=state.efforts.filter(e=>e.jobId===j.id).sort((a,b)=>b.date.localeCompare(a.date));
  q("#jb-hrs").textContent=es.length?`${efFh(efSum(es))} h over ${new Set(es.map(e=>e.date)).size} day(s)`:"";
  q("#jb-time").innerHTML=es.map(e=>`<div class="jb-te" data-id="${e.id}"><span class="mono">${e.date}</span><span class="mono"><b>${efFh(e.hours)} h</b></span><span class="ef-tag" style="--pen:var(--${EF_ACTC[e.activity]})"><span class="ef-pd"></span>${esc(e.activity)}</span><span class="tx">${esc(e.note)}</span></div>`).join("")||`<div class="faint" style="font-size:12px;padding:2px">No time logged yet — ⏱ Log time, or the timer.</div>`;
  host.querySelectorAll(".jb-te").forEach(r=>r.onclick=()=>{const e=state.efforts.find(x=>x.id===r.dataset.id);if(e)efEdit(e);});}

/* closing: what did you report back, and when */
function openJobClose(j,status){const root=document.getElementById("modalRoot"),done=status!=="dropped";
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:500px"><h2>${done?"✓ Done — what did you report back?":"Drop this task?"}</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">${esc(j.title)}${j.askedBy?` · asked by ${esc(j.askedBy)}`:""}${j.due?` · expected by <b>${j.due}</b>`:""}</p>
    <div class="field"><label>${done?"The answer / what you sent":"Why (optional)"}</label><textarea id="jc-out" rows="4" placeholder="${done?"e.g. Confirmed with Basis: the job runs in client 150 only; told my manager on Thursday":"e.g. No longer needed — handled by another team"}">${esc(j.outcome)}</textarea></div>
    <div class="field"><label>${done?"Reported on":"Dropped on"}</label><input type="date" id="jc-date" value="${todayStr()}" style="width:170px"> <span id="jc-tm" class="faint" style="font-size:12px;margin-left:8px"></span></div>
    <div class="modal-foot"><button id="jc-cancel" class="ghost">Cancel</button><button id="jc-ok" class="primary">${done?"✓ Mark done":"Drop it"}</button></div></div></div>`;
  const q=s=>root.querySelector(s),close=()=>root.innerHTML="";
  const tmTxt=()=>{const el=q("#jc-tm");if(!done||!j.due){el.textContent="";return;}const x=jobTiming({...j,status:"done",closedOn:q("#jc-date").value});el.textContent=x?x.txt:"";el.style.color=x?`var(--${x.ok?"green":"red"})`:"";};
  q("#jc-date").onchange=tmTxt;tmTxt();
  q("#jc-cancel").onclick=close;q(".modal-bg").onclick=e=>{if(e.target===q(".modal-bg"))close();};
  q("#jc-ok").onclick=()=>{const out=q("#jc-out").value.trim(),d=q("#jc-date").value||todayStr();
    j.status=status;j.outcome=out;j.closedOn=d;j.nextAction={date:"",note:""};j.waiting={on:"",since:""};
    if(done)jobLog(j,"sent",out?`Reported back: ${out}`:"Reported back",d);else jobLog(j,"note",out?`Dropped: ${out}`:"Dropped",d);
    close();renderApp();const tm=jobTiming(j);toast(done?`Done${tm?" — "+tm.txt:""}`:"Dropped");};
  setTimeout(()=>{const o=q("#jc-out");if(o)o.focus();},40);}

