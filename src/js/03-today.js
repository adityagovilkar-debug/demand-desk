/* ===================== TODAY DASHBOARD ===================== */
function newJournalToday(){let j=state.journal.find(x=>x.date===todayStr());if(!j){j={id:uid(),date:todayStr(),title:"",body:"",createdAt:Date.now(),updatedAt:Date.now()};state.journal.unshift(j);markDirty();}activeJournalId=j.id;view="journal";renderApp();}
function renderToday(){
  const tasks=state.tasks;
  document.getElementById("side").innerHTML=`
    <div class="side-tools">
      <button class="primary" id="qNewDemand" style="width:100%">＋ New Demand</button>
      <button id="qJournal" style="width:100%">📓 Today's journal</button>
      <button id="qJob" style="width:100%">☐ New task</button>
      <button id="qDebug" style="width:100%">🐞 New debug session</button>
      <button id="qWeek" style="width:100%">🗓 Weekly summary</button>
      <button id="qHand" style="width:100%">🧳 Handover pack</button>
      <button id="qWin" style="width:100%">🏆 Note a win</button>
      <button id="qWrap" style="width:100%">🗓 Week wrap-up</button>
    </div>
    <div class="stats" id="todayStats"></div>
    <div class="listwrap"><p class="faint" style="font-size:12px;padding:10px;line-height:1.6">Your cockpit — everything needing attention, pulled from all workspaces. Click any item to jump to it.</p></div>`;
  document.getElementById("qNewDemand").onclick=()=>{view="demands";renderApp();openTaskModal(null);};
  document.getElementById("qJournal").onclick=newJournalToday;
  document.getElementById("qJob").onclick=()=>newJob();
  document.getElementById("qDebug").onclick=()=>{const s={id:uid(),title:"New debug session",demandId:"",taskId:"",status:"active",resume:"",notes:"",objects:[],breakpoints:[],findings:[],watches:[],createdAt:Date.now(),updatedAt:Date.now()};state.debug.unshift(s);activeDebugId=s.id;view="debug";markDirty();renderApp();};
  document.getElementById("qWeek").onclick=openWeekly;
  document.getElementById("qHand").onclick=openHandover;
  document.getElementById("qWin").onclick=()=>openWin();
  document.getElementById("qWrap").onclick=()=>{wrapForce=true;renderToday();setTimeout(()=>{const w=document.querySelector(".wrapup");if(w)w.scrollIntoView({block:"center",behavior:motionOn()?"smooth":"auto"});},80);};
  const active=tasks.filter(t=>["open","progress","bug"].includes(t.status)).length;
  const overdueC=tasks.filter(t=>{const d=earliestOpenDue(t);return d&&daysUntil(d)<0;}).length;
  document.getElementById("todayStats").innerHTML=`<div class="stat op"><b>${active}</b>active</div><div class="stat ov"><b>${overdueC}</b>overdue</div><div class="stat"><b>${tasks.filter(t=>t.status==="bug").length}</b>bugs</div><div class="stat"><b>${tasks.filter(isWaiting).length}</b>waiting</div>`;

  const host=document.getElementById("detail");
  if(contentCount()===0){
    host.innerHTML=`<div class="dash"><div class="getting-started">
      <h1>Welcome to Demand Desk</h1>
      <p class="gs-lede">Your data file is empty. Here's what each area is for.</p>
      <dl class="gs-list">
        <dt>Demands</dt><dd>Every requirement/change: branching subtasks, objects touched, transports, reference facts, post-delivery Tech Spec.</dd>
        <dt>Epics</dt><dd>Group related demands under one initiative — each keeps its own transports and go-live target.</dd>
        <dt>Debug</dt><dd>Breakpoints, findings &amp; a “resume here” note so you're never lost after a weekend.</dd>
        <dt>Journal</dt><dd>One consolidated rough-notes entry per day, plus your personal action items.</dd>
        <dt>Meetings</dt><dd>Call &amp; team-meeting notes with action points, linkable to demands.</dd>
        <dt>Playbook</dt><dd>Processes, FAQs, freeze periods, recurring obligations, contact lists.</dd>
        <dt>Vault</dt><dd>System credentials — set a master password first.</dd>
      </dl>
      <p class="gs-tip"><b>Ctrl+S</b> saves to your .json file · <b>Ctrl+K</b> searches everything · keep the file on your own drive.</p>
      <div class="gs-acts"><button class="primary" id="gsNew">＋ Create your first demand</button><button id="gsJournal">Start today's journal</button></div>
    </div></div>`;
    host.querySelector("#gsNew").onclick=()=>{view="demands";renderApp();openTaskModal(null);};
    host.querySelector("#gsJournal").onclick=newJournalToday;
    return;
  }

  const goDemand=(id,tab)=>()=>{view="demands";activeId=id;activeTab=tab||"work";renderApp();};
  const byDue=(a,b)=>(earliestOpenDue(a)||"9999").localeCompare(earliestOpenDue(b)||"9999");
  const overdue=tasks.filter(t=>{const d=earliestOpenDue(t);return d&&daysUntil(d)<0;}).sort(byDue);
  const dueWeek=tasks.filter(t=>{const d=earliestOpenDue(t);return d&&daysUntil(d)>=0&&daysUntil(d)<=7;}).sort(byDue);
  const bugs=tasks.filter(t=>t.status==="bug");
  const waiting=tasks.filter(isWaiting).sort((a,b)=>(a.waiting.since||"").localeCompare(b.waiting.since||""));
  const golive=tasks.filter(t=>["progress","delivered","bug"].includes(t.status)&&golivePending(t));
  /* a demand deliberately parked with a future next action isn't stale */
  const stale=tasks.filter(t=>["open","progress"].includes(t.status)&&(Date.now()-t.updatedAt)>14*86400000&&!(t.nextAction&&t.nextAction.date>todayStr()));
  const actions=[];state.meetings.forEach(m=>m.actions.forEach(a=>{if(!a.done)actions.push({a,m});}));
  actions.sort((x,y)=>(x.a.due||"9999").localeCompare(y.a.due||"9999"));
  const mytodos=state.todos.filter(x=>!x.done).sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
  const todayJ=state.journal.find(j=>j.date===todayStr());

  const cards=[];
  const card=(title,icon,tone,items)=>{if(items.length)cards.push({title,icon,tone,items});};
  const dlabel=t=>`${t.demandId?esc(t.demandId)+" · ":""}${esc(t.title)}`;
  card("Overdue","⚑","alert",overdue.map(t=>({main:dlabel(t),sub:`${-daysUntil(earliestOpenDue(t))}d late`,go:goDemand(t.id)})));
  {const cidx=clashIndex(),pairs=[],seen=new Set();
   tasks.forEach(t=>taskClashes(t,cidx).forEach(({o,open})=>open.forEach(x=>{const k=objKey(o.name)+"|"+[t.id,x.t.id].sort().join("|");
     if(seen.has(k))return;seen.add(k);pairs.push({t,o,x});})));
   card("Object clashes — in flight in two demands","⚠","alert",pairs.map(({t,o,x})=>({main:`<span class="mono">${esc(o.name)}</span>`,
     sub:`${esc(demandLabel(t))} ↔ ${esc(demandLabel(x.t))}`,go:goDemand(t.id,"objects")})));}
  card("Bugs / Rework","🐞","alert",bugs.map(t=>({main:dlabel(t),sub:reworkCount(t)?`↻ ${reworkCount(t)}`:"",go:goDemand(t.id)})));
  card("Go-live: transports not at their destination","🚚","warn",golive.map(t=>{const g=golivePending(t);return {main:dlabel(t),sub:`${g.missing.length} TR(s) → ${g.target}`,go:goDemand(t.id,"transports")};}));
  card("Waiting on","⏳","warn",waiting.map(t=>({main:dlabel(t),sub:`${esc(t.waiting.on)}${waitDays(t)!=null?" · "+waitDays(t)+"d":""}`,go:goDemand(t.id)})));
  card("Due this week","📅","",dueWeek.map(t=>({main:dlabel(t),sub:`${earliestOpenDue(t)} (${daysUntil(earliestOpenDue(t))}d)`,go:goDemand(t.id)})));
  card("Open action points","☑","",actions.map(({a,m})=>({main:esc(a.text||"(no text)"),sub:`${esc(a.owner||"—")}${m.team?" · "+esc(m.team):""}`,go:()=>{view="meetings";meetingRollup=false;activeMeetingId=m.id;renderApp();}})));
  card("My action items","✅","",mytodos.map(x=>({main:esc(x.text||"(no text)"),sub:x.due?(daysUntil(x.due)<0?"⚠ "+x.due:x.due):"",go:()=>{view="journal";journalTodos=true;renderApp();}})));
  card("Expired images — delete for data hygiene","🧹","warn",expiredImages().map(im=>({main:esc(im.label||im.file),sub:"expired "+im.expiry,go:()=>gotoImage(im)})));
  const epicsDue=state.epics.filter(e=>!["delivered","closed"].includes(e.status)&&e.targetDate&&daysUntil(e.targetDate)<=21)
    .sort((a,b)=>a.targetDate.localeCompare(b.targetDate));
  card("Epics nearing target","◆","warn",epicsDue.map(e=>{const r=epicRollup(e),n=daysUntil(e.targetDate);
    return{main:esc(epicLabel(e)),sub:`${r.done}/${r.ts.length} done · ${n<0?(-n)+"d over":e.targetDate}`,
      go:()=>{view="epics";activeEpicId=e.id;renderApp();}};}));
  const wavesDue=[];state.epics.filter(e=>!["delivered","closed"].includes(e.status)).forEach(e=>e.waves.forEach(w=>{
    if(!w.target||daysUntil(w.target)>21)return;
    const ws=tasksForEpic(e.id).filter(t=>t.wave===w.name);
    if(!ws.length||ws.every(t=>["delivered","closed"].includes(t.status)))return;
    wavesDue.push({e,w,ws});}));
  wavesDue.sort((a,b)=>a.w.target.localeCompare(b.w.target));
  card("Waves nearing target","🎯","warn",wavesDue.map(({e,w,ws})=>{const n=daysUntil(w.target);
    return{main:`◆ ${esc(e.code||e.name)} · ${esc(w.name)}`,sub:`${ws.filter(t=>["delivered","closed"].includes(t.status)).length}/${ws.length} done · ${n<0?(-n)+"d over":w.target}`,
      go:()=>{view="epics";activeEpicId=e.id;epicTab="overview";renderApp();}};}));
  const epicFU=[];state.epics.filter(e=>e.status!=="closed").forEach(e=>e.deps.forEach(x=>{const why=depFollowDue(e,x);if(why)epicFU.push({e,x,why});}));
  card("Epic follow-ups — chase other teams","📞","warn",epicFU.map(({e,x,why})=>({main:`◆ ${esc(e.code||e.name)} — ${esc(x.team||"(team?)")}`,sub:`${esc(x.what||"")}${x.what?" · ":""}${why}`,
    go:()=>{view="epics";activeEpicId=e.id;epicTab="deps";renderApp();}})));
  const recDue=state.playbook.filter(p=>p.kind==="recurring"&&p.due&&daysUntil(p.due)<=14).sort((a,b)=>a.due.localeCompare(b.due));
  card("Recurring processes due","🔁","warn",recDue.map(p=>({main:esc(p.title),sub:(daysUntil(p.due)<0?"⚠ overdue · ":"")+p.due,go:()=>{view="playbook";activePlayId=p.id;renderApp();}})));
  const frz=state.playbook.filter(p=>p.kind==="freeze"&&p.from&&p.to&&p.to>=todayStr()&&daysUntil(p.from)<=14).sort((a,b)=>a.from.localeCompare(b.from));
  card("Freeze periods","❄","warn",frz.map(p=>{const act=p.from<=todayStr();return{main:esc(p.title),sub:(act?"ACTIVE until "+p.to:"from "+p.from)+" · "+(p.systems||[]).length+" system(s)",go:()=>{view="playbook";activePlayId=p.id;renderApp();}};}));
  card("Tasks — due, next steps, waiting","☐","warn",jobsNeedingYou().map(({j,why})=>({main:esc(j.title),sub:why.join(" · "),go:()=>{view="jobs";activeJobId=j.id;renderApp();}})));
  card("Stale (open, untouched 14d+)","🕸","",stale.map(t=>({main:dlabel(t),sub:`${Math.floor((Date.now()-t.updatedAt)/86400000)}d`,go:goDemand(t.id)})));
  /* debug sessions stay "active" until someone says otherwise — after two quiet weeks, ask */
  const dbgSet=(s,st)=>{s.status=st;s.updatedAt=Date.now();markDirty();renderApp();toast(`🐞 ${s.title||"Session"} → ${DEBUG_STATUS[st].label}`);};
  card("Debug sessions gone quiet (14d+)","🐞","",state.debug.filter(s=>s.status==="active"&&Date.now()-(s.updatedAt||0)>14*86400000).sort((a,b)=>(a.updatedAt||0)-(b.updatedAt||0))
    .map(s=>{const t=s.taskId&&state.tasks.find(x=>x.id===s.taskId);return {main:esc(s.title||"(untitled session)"),sub:`${t?esc(demandLabel(t))+" · ":""}${Math.floor((Date.now()-(s.updatedAt||0))/86400000)}d`,
      go:()=>{view="debug";activeDebugId=s.id;renderApp();},acts:[["✓ Resolved",()=>dbgSet(s,"resolved"),"Found it — mark the session resolved"],["⏸ Paused",()=>dbgSet(s,"paused"),"Not now — park it"]]};}));

  let html="";
  if(!cards.length)html+=`<div class="dashcard" style="max-width:440px"><h3>✓ All clear</h3><div class="dash-empty">Nothing overdue, no bugs, nothing waiting. Nice.</div></div>`;
  else html+=`<div class="dash-grid">`+cards.map((c,ci)=>{const exp=renderToday._exp&&renderToday._exp[c.title];const shown=exp?c.items:c.items.slice(0,8);
    return `<div class="dashcard ${c.tone}"><h3>${c.icon} ${c.title}<span class="cnt">${c.items.length}</span></h3>${shown.map((it,ii)=>`<div class="dashitem ${String(it.sub||"").replace(/<[^>]+>/g,"").length>26?"two":""}" data-c="${ci}" data-i="${ii}"><span class="di-main">${it.main}</span>${it.sub?`<span class="di-sub">${it.sub}</span>`:""}${it.acts?`<span class="di-acts">${it.acts.map((a,ai)=>`<button class="sm ghost" data-c="${ci}" data-i="${ii}" data-a="${ai}" title="${esc(a[2]||"")}">${a[0]}</button>`).join("")}</span>`:""}</div>`).join("")}${c.items.length>shown.length?`<div class="dashitem" data-more="${ci}"><span class="di-main" style="color:var(--accent)">＋ ${c.items.length-shown.length} more…</span></div>`:""}</div>`;}).join("")+`</div>`;
  html+=`<div class="dash-grid dg-row" style="margin-top:14px"><div class="dashcard"><h3>📓 Today's journal</h3>${(todayJ&&(todayJ.body||todayJ.title))?`<div style="font-size:13px;white-space:pre-wrap;max-height:120px;overflow:auto;line-height:1.5">${esc(((todayJ.title?todayJ.title+"\n":"")+todayJ.body)).slice(0,400)}</div><button class="sm" id="openJ" style="margin-top:8px">Open journal</button>`:`<div class="dash-empty">No entry for today yet.</div><button class="sm" id="openJ" style="margin-top:8px">＋ Start today's note</button>`}</div>${efTodayHTML()}</div>`;
  const attn=cards.reduce((n,c)=>n+c.items.length,0),wrap=encWarnHTML()+wrapUpHTML(),ag=agendaItems();
  if(wrap&&!benchOn())html=wrap+html;
  host.innerHTML=benchOn()
    ?`<div class="dash cockpit"><div class="ck-in">${cockpitHTML(agendaHTML(ag))}${wrap}<div class="ck-sech"><span class="ck-lbl">Needs attention · ${attn}</span></div>${html}</div></div>`
    :`<div class="dash"><div class="dash-head"><h1>Today</h1><span class="faint">${new Date().toDateString()}</span></div>${agendaHTML(ag)}${html}</div>`;
  if(benchOn())mountCockpit(host);
  efWireToday(host);wireAgenda(host,ag);
  host.querySelectorAll(".dashitem[data-c]").forEach(el=>el.onclick=()=>cards[+el.dataset.c].items[+el.dataset.i].go());
  host.querySelectorAll(".di-acts button").forEach(b=>b.onclick=e=>{e.stopPropagation();cards[+b.dataset.c].items[+b.dataset.i].acts[+b.dataset.a][1]();});
  wireWrapUp(host);wireEncWarn(host);
  host.querySelectorAll(".dashitem[data-more]").forEach(el=>el.onclick=()=>{(renderToday._exp=renderToday._exp||{})[cards[+el.dataset.more].title]=true;renderToday();});
  const oj=host.querySelector("#openJ");if(oj)oj.onclick=newJournalToday;
}

/* ---------- the Friday wrap-up: the week in one card, before it's forgotten ----------
   Shown Friday to Sunday (or any day from the 🗓 button) until you tick it off for the week:
   hours against the working days so far, days with no log, and the wins and lessons noted —
   with a nudge to add one while the week is still fresh. */
let wrapForce=false;
function wrapWeek(){const t=todayStr(),mon=efMon(t),days=[0,1,2,3,4].map(i=>efAdd(mon,i)),past=days.filter(d=>d<=t);
  const es=state.efforts.filter(e=>e.date>=mon&&e.date<=efAdd(mon,6)),have=new Set(es.map(e=>e.date));
  const work=past.filter(d=>!efOff(d)),miss=work.filter(d=>!have.has(d)&&d<t);
  const wins=state.wins.filter(w=>w.date>=mon&&w.date<=t),lessons=state.tasks.flatMap(x=>(x.lessons||[]).filter(l=>l.date>=mon&&l.date<=t).map(l=>({t:x,l})));
  const by=new Map();es.filter(e=>e.taskId).forEach(e=>by.set(e.taskId,(by.get(e.taskId)||0)+e.hours));
  const worked=[...by].sort((a,b)=>b[1]-a[1]).map(([id])=>state.tasks.find(x=>x.id===id)).filter(Boolean);
  const moved=state.tasks.filter(x=>(x.timeline||[]).some(e=>e.type==="status"&&["delivered","closed"].includes(e.to)&&isoTs(e.ts)>=mon&&isoTs(e.ts)<=t));
  const jobsDone=state.jobs.filter(j=>j.status==="done"&&j.closedOn>=mon&&j.closedOn<=t);
  return {mon,days,h:efSum(es),target:work.length*EF_DAY,miss,off:past.filter(d=>efOff(d)),wins,lessons,worked,moved,jobsDone};}
function wrapUpHTML(){const dow=efDow(todayStr()),W=wrapWeek();
  if(!wrapForce&&(![5,6,0].includes(dow)||viewPref("wrap.done","")===W.mon))return "";
  const pct=W.target?Math.min(100,Math.round(W.h/W.target*100)):0;
  return `<div class="dashcard wrapup efx"><h3>🗓 Week wrap-up <span class="faint" style="font-weight:400;text-transform:none;letter-spacing:0">${efSh(W.mon)} – ${efSh(efAdd(W.mon,4))}</span><button class="sm ghost" id="wrDone" style="margin-left:auto" title="Hide it until next Friday">✓ Wrapped up</button></h3>
    <div class="wr-grid">
      <div><div class="wr-k">Hours</div><div class="wr-big">${efFh(Math.round(W.h*10)/10)} h <span class="faint">of ${W.target} h</span></div><div class="wr-bar"><i style="width:${pct}%"></i></div>
        ${W.miss.length?`<div class="wr-miss">⚠ No log on ${W.miss.map(d=>`<span class="mono">${efWdl(d)}</span> <a href="#" data-wfill="${d}">＋ log</a> · <a href="#" data-woff="${d}">day off</a>`).join("<br>")}</div>`:`<div class="wr-ok">✓ every working day logged${W.off.length?` · ${W.off.length} day${W.off.length>1?"s":""} off`:""}</div>`}</div>
      <div><div class="wr-k">Done this week</div>${W.moved.length||W.jobsDone.length?W.moved.slice(0,5).map(x=>`<div class="wr-row"><a href="#" data-wgo="${x.id}">${esc(demandLabel(x))}</a> <span class="faint">${STATUS[x.status].label.toLowerCase()}</span></div>`).join("")+W.jobsDone.slice(0,5).map(j=>{const tm=jobTiming(j);return `<div class="wr-row">☑ <a href="#" data-wjob="${j.id}">${esc(j.title)}</a>${tm?` <span class="faint">${tm.txt}</span>`:""}</div>`;}).join(""):`<div class="faint wr-row">Nothing delivered or closed yet.</div>`}
        ${W.worked.length?`<div class="wr-k" style="margin-top:8px">Most time on</div>${W.worked.slice(0,3).map(x=>`<div class="wr-row">${esc(demandLabel(x))}</div>`).join("")}`:""}</div>
      <div><div class="wr-k">Wins &amp; lessons</div>
        ${W.wins.map(w=>`<div class="wr-row">${WIN_KINDS[w.kind].icon} ${esc(w.text.length>60?w.text.slice(0,59)+"…":w.text)}</div>`).join("")}${W.lessons.map(({t,l})=>`<div class="wr-row">💡 ${esc(l.text.length>60?l.text.slice(0,59)+"…":l.text)} <span class="faint">${esc(demandLabel(t))}</span></div>`).join("")}
        ${W.wins.length||W.lessons.length?"":`<div class="wr-ask">Any win or lesson this week? A thank-you, a rescue, something you'd do differently — it's gone by review time.</div>`}
        <div class="wr-acts"><button class="sm" id="wrWin">🏆 Note a win</button>${W.worked.length?`<span class="faint">💡 lesson on</span>${W.worked.slice(0,3).map(x=>`<button class="sm ghost" data-wles="${x.id}">${esc(demandLabel(x))}</button>`).join("")}`:""}</div></div>
    </div></div>`;}
function wireWrapUp(host){const q=s=>host.querySelector(s);if(!q(".wrapup"))return;
  q("#wrDone").onclick=()=>{setViewPref("wrap.done",efMon(todayStr()));wrapForce=false;renderApp();toast("Week wrapped up — see you next Friday");};
  q("#wrWin").onclick=()=>openWin();
  host.querySelectorAll("[data-wles]").forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.wles);if(t)openLesson(t);});
  host.querySelectorAll("[data-wgo]").forEach(a=>a.onclick=e=>{e.preventDefault();view="demands";activeId=a.dataset.wgo;activeTab="overview";renderApp();});
  host.querySelectorAll("[data-wjob]").forEach(a=>a.onclick=e=>{e.preventDefault();view="jobs";activeJobId=a.dataset.wjob;renderApp();});
  host.querySelectorAll("[data-wfill]").forEach(a=>a.onclick=e=>{e.preventDefault();openLogTime({date:a.dataset.wfill});});
  host.querySelectorAll("[data-woff]").forEach(a=>a.onclick=e=>{e.preventDefault();openDaysOff({date:a.dataset.woff});});}

/* a file from a newer copy: say so, permanently, until a newer copy opens it */
function renderNewerBar(){let b=document.getElementById("newerBar");
  if(!dataNewer){if(b)b.remove();return;}
  if(!b){b=document.createElement("div");b.id="newerBar";document.body.appendChild(b);}
  b.innerHTML=`<b>⛔ Saving is off.</b> ${esc(newerMsg())}`;}

/* ---------- encryption off while the file holds secrets ---------- */
function secretCounts(){return {creds:state.credentials.length,refs:state.tasks.reduce((n,t)=>n+(t.reference||[]).filter(r=>r.secret).length,0)};}
function encWarnHTML(){if(state.settings.encryption)return "";const c=secretCounts();if(!c.creds&&!c.refs)return "";
  if(viewPref("encWarn.until","")>todayStr())return "";
  const what=[c.creds?`${c.creds} password${c.creds>1?"s":""} in the Vault`:"",c.refs?`${c.refs} secret reference${c.refs>1?"s":""} on demands`:""].filter(Boolean).join(" and ");
  return `<div class="dashcard enc-warn"><h3>🔓 Your data file isn't encrypted</h3>
    <p>It holds ${what} in plain text — anyone with a copy of the .json, or of a backup of it, can read them. A master password encrypts the whole file; nothing else changes.</p>
    <div class="ew-acts"><button class="sm primary" id="ewOn">🔒 Turn on encryption</button><button class="sm ghost" id="ewLater" title="Hide this for 30 days">Remind me in a month</button></div></div>`;}
function wireEncWarn(host){const on=host.querySelector("#ewOn");if(!on)return;
  on.onclick=()=>openEncryptionDialog();
  host.querySelector("#ewLater").onclick=()=>{setViewPref("encWarn.until",efAdd(todayStr(),30));renderApp();};}

/* ---------- your team: who actually builds a demand ----------
   Some demands you start and then hand to someone in your team; you still guide, test and log
   your own time on them. t.builders = the people building it (none = you). The list of people
   lives in Playbook → 👥 My team. */
let playTeam=false;
const personById=id=>(state.people||[]).find(p=>p.id===id)||null;
const buildersOf=t=>(t.builders||[]).map(personById).filter(Boolean);
const builderNames=t=>buildersOf(t).map(p=>p.name).join(", ");
const demandsOf=id=>state.tasks.filter(t=>(t.builders||[]).includes(id));
/* the toggle chips used by the Edit dialog and the assign dialog; sel is changed in place */
function builderChipsHTML(sel){const ppl=state.people.filter(p=>p.active||sel.includes(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="bld-chips">${ppl.map(p=>`<button type="button" class="sm bld ${sel.includes(p.id)?"on":""}" data-p="${p.id}" title="${esc(p.role||"")}">${sel.includes(p.id)?"✓ ":""}${esc(p.name)}${p.active?"":" (moved on)"}</button>`).join("")||`<span class="faint" style="font-size:12px">No one in your team list yet.</span>`}
    <span class="bld-new"><input placeholder="＋ new person" class="bld-in"><button type="button" class="sm ghost bld-add">Add</button></span></div>`;}
function wireBuilderChips(host,sel,redraw){
  host.querySelectorAll(".bld[data-p]").forEach(b=>b.onclick=()=>{const id=b.dataset.p,i=sel.indexOf(id);if(i<0)sel.push(id);else sel.splice(i,1);redraw();});
  const inp=host.querySelector(".bld-in"),add=()=>{const n=inp.value.trim();if(!n)return;
    let p=state.people.find(x=>x.name.toLowerCase()===n.toLowerCase());
    if(!p){p=normPerson({name:n});state.people.push(p);markDirty();toast(`${n} added to your team list (Playbook → My team)`);}
    if(!sel.includes(p.id))sel.push(p.id);redraw();};
  host.querySelector(".bld-add").onclick=add;inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();add();}};}
function setBuilders(t,ids){const before=builderNames(t);t.builders=[...new Set(ids)];const after=builderNames(t);
  if(before!==after)logTimeline(t,"note","","",after?`Built by ${after}${before?" (was "+before+")":""}`:`Back with you (was built by ${before})`);
  touch(t);}
function openBuilders(t){const root=document.getElementById("modalRoot"),sel=(t.builders||[]).slice();
  const draw=()=>{root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:480px"><h2>👷 Who's building ${esc(demandLabel(t))}?</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">Pick the people building it. Leave everyone unticked if you're building it yourself — you keep logging your own time either way.</p>
    <div id="bl-host">${builderChipsHTML(sel)}</div>
    <div class="modal-foot"><button id="bl-cancel" class="ghost">Cancel</button><button id="bl-save" class="primary">Save</button></div></div></div>`;
    wireBuilderChips(root.querySelector("#bl-host"),sel,draw);
    root.querySelector("#bl-cancel").onclick=()=>root.innerHTML="";
    root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))root.innerHTML="";};
    root.querySelector("#bl-save").onclick=()=>{setBuilders(t,sel);root.innerHTML="";renderApp();toast(sel.length?`Built by ${builderNames(t)}`:"Back with you");};};
  draw();}
/* Playbook → 👥 My team: the people, and what each is building */
function renderTeamPage(host){const ppl=state.people.slice().sort((a,b)=>(b.active-a.active)||a.name.localeCompare(b.name)),open=t=>!["delivered","closed"].includes(t.status);
  const mon=efAdd(todayStr(),-29);
  host.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1"><h2 style="margin:2px 4px">👥 My team</h2>
      <p class="faint" style="font-size:12px;margin:4px">The people you hand demands to. Assign them on a demand (<b>👷 Built by</b> in the side panel, or ✎ Edit); each one's demands show here.</p></div></div>
    <div class="tm-add"><input id="tm-name" placeholder="Name"><input id="tm-role" placeholder="Role or note (optional)"><button class="sm primary" id="tm-addb">＋ Add person</button></div></div>
    <div class="detail-body">${ppl.length?ppl.map(p=>{const ds=demandsOf(p.id).sort((a,b)=>(open(b)-open(a))||(b.updatedAt-a.updatedAt)),no=ds.filter(open).length,
        mine=efSum(state.efforts.filter(e=>e.date>=mon&&ds.some(t=>t.id===e.taskId)));
      return `<div class="tm-card ${p.active?"":"gone"}" data-p="${p.id}"><div class="tm-top">
          <input class="tm-n" value="${esc(p.name)}" title="Name"><input class="tm-r" value="${esc(p.role)}" placeholder="Role or note">
          <label class="tm-act" title="Moved to another team or left — kept on their old demands, hidden when assigning"><input type="checkbox" class="tm-gone" ${p.active?"":"checked"}> moved on</label>
          <button class="ghost sm danger tm-del" title="Remove from the list">✕</button></div>
          <div class="tm-stat">${no?`<b>${no}</b> open`:"nothing open"}${ds.length>no?` · ${ds.length-no} done`:""}${mine?` · your time on these, last 30 days: <b>${efFh(mine)} h</b>`:""}</div>
        ${ds.length?ds.map(t=>`<div class="tm-d" data-id="${t.id}"><span class="pill ${STATUS[t.status].cls}">${STATUS[t.status].label}</span><b class="mono">${esc(t.demandId||"—")}</b><span class="tt">${esc(t.title)}</span>${buildersOf(t).length>1?`<span class="faint">with ${esc(buildersOf(t).filter(x=>x.id!==p.id).map(x=>x.name).join(", "))}</span>`:""}</div>`).join(""):`<div class="faint tm-none">Not building any demand.</div>`}</div>`;}).join("")
      :`<div class="empty" style="padding:30px 0">No one yet. Add the people you hand demands to — then assign them on a demand.</div>`}</div>`;
  const q=s=>host.querySelector(s),add=()=>{const n=q("#tm-name").value.trim();if(!n){toast("A name, please",true);return;}
    if(state.people.some(x=>x.name.toLowerCase()===n.toLowerCase())){toast(`${n} is already on the list`,true);return;}
    state.people.push(normPerson({name:n,role:q("#tm-role").value}));markDirty();renderApp();setTimeout(()=>{const i=document.getElementById("tm-name");if(i)i.focus();},30);};
  q("#tm-addb").onclick=add;q("#tm-name").onkeydown=q("#tm-role").onkeydown=e=>{if(e.key==="Enter")add();};
  host.querySelectorAll(".tm-card").forEach(c=>{const p=personById(c.dataset.p),cq=s=>c.querySelector(s);
    cq(".tm-n").onchange=e=>{const v=e.target.value.trim();if(!v){e.target.value=p.name;return;}p.name=v;markDirty();};
    cq(".tm-r").onchange=e=>{p.role=e.target.value.trim();markDirty();};
    cq(".tm-gone").onchange=e=>{p.active=!e.target.checked;markDirty();renderApp();};
    cq(".tm-del").onclick=()=>{const ds=demandsOf(p.id);
      if(!confirm(ds.length?`Remove ${p.name}? They come off ${ds.length} demand(s) too — or tick “moved on” instead to keep them there.`:`Remove ${p.name} from your team list?`))return;
      ds.forEach(t=>setBuilders(t,t.builders.filter(x=>x!==p.id)));state.people=state.people.filter(x=>x.id!==p.id);markDirty();renderApp();};
    c.querySelectorAll(".tm-d").forEach(r=>r.onclick=()=>{view="demands";activeId=r.dataset.id;activeTab="overview";playTeam=false;renderApp();});});}

