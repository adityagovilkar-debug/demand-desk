/* ===================== MEETINGS (calls + team unified) ===================== */
function renderMeetingSidebar(){
  const teams=distinctMeetingTeams();
  let totalOpen=0;state.meetings.forEach(m=>totalOpen+=meetingOpenActions(m));
  document.getElementById("side").innerHTML=`
    <div class="side-tools">
      <button class="primary" id="btnNewMeeting" style="width:100%">＋ New Meeting</button>
      ${teams.length?`<select id="mFilterTeam"><option value="">All teams</option>${teams.map(tm=>`<option>${esc(tm)}</option>`).join("")}</select>`:""}
    </div>
    <div class="stats"><div class="stat op"><b>${state.meetings.length}</b>meetings</div><div class="stat ov"><b>${totalOpen}</b>open actions</div></div>
    <div class="listwrap" id="meetList"></div>`;
  document.getElementById("btnNewMeeting").onclick=()=>{const m=normMeeting({date:todayStr(),title:"New meeting",team:renderMeetingSidebar._ft||""});state.meetings.unshift(m);activeMeetingId=m.id;meetingRollup=false;markDirty();renderApp();};
  const ft=document.getElementById("mFilterTeam");if(ft){ft.value=renderMeetingSidebar._ft||"";ft.onchange=()=>{renderMeetingSidebar._ft=ft.value;renderMeetingSidebar();};}
  const el=document.getElementById("meetList");
  const filter=renderMeetingSidebar._ft||"";
  const rows=state.meetings.slice().filter(m=>!filter||m.team===filter).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  const pinned=`<div class="tcard ${meetingRollup?"active":""}" data-roll="1" style="border-left-color:var(--amber)">
    <div class="ttitle">⚑ All open action points</div><div class="meta faint">${totalOpen} open across ${state.meetings.length} meeting(s)</div></div>`;
  el.innerHTML=pinned+(rows.length?rows.map(m=>{const open=meetingOpenActions(m);return `<div class="tcard ${(!meetingRollup&&m.id===activeMeetingId)?"active":""}" data-id="${m.id}">
    <div class="demand">👥 ${m.date}${m.team?` · <span style="color:var(--accent2)">${esc(m.team)}</span>`:""}</div><div class="ttitle">${esc(m.title)}</div>
    <div class="meta faint">${esc((m.attendees||"").slice(0,32))}${m.taskIds.length+(m.epicIds||[]).length?`<span class="lc-badge">🔗 ${m.taskIds.length+(m.epicIds||[]).length}</span>`:""}${m.actions.length?`<span class="lc-badge">${open?`⚑ ${open} open`:`✓ done`} / ${m.actions.length}</span>`:""}</div></div>`;}).join(""):`<div class="empty">No meetings${filter?" for "+esc(filter):""} yet.<br>Capture calls &amp; team meetings here.</div>`);
  el.querySelector("[data-roll]").onclick=()=>{meetingRollup=true;activeMeetingId=null;renderApp();};
  el.querySelectorAll(".tcard[data-id]").forEach(x=>x.onclick=()=>{meetingRollup=false;activeMeetingId=x.dataset.id;renderApp();});
}
function renderMeetingDetail(){
  const host=document.getElementById("detail");
  if(meetingRollup){return renderActionRollup(host);}
  const m=activeMeeting();
  if(!m){host.innerHTML=nopick("Select a meeting,<br>or create a new one.");return;}
  const hOpen=hdrOpen.has(m.id)||!m.title||m.title==="(untitled meeting)",oa=m.actions.filter(a=>!a.done).length,nl=(m.taskIds||[]).length+(m.epicIds||[]).length;
  host.innerHTML=`<div class="detail-head bhead" style="--pen:var(--pen-4)">
    <div class="bh-top"><div class="bh-l">
        <div class="bh-no"><span class="bh-id">Meeting</span> · ${esc(efWdl(m.date))}${m.team?` · ${esc(m.team)}`:""}</div>
        <input id="mt-title" class="bh-title" value="${esc(m.title)}" title="Click to rename">
        <div class="bh-sub">${m.attendees?"with "+esc(m.attendees):"no attendees noted"}</div></div>
      <div class="bh-acts"><div class="bh-btns"><button class="sm ${hOpen?"on":""}" id="mt-det" title="Date, team, attendees, duration">✎ Details</button><button class="sm ghost danger" id="mt-del" title="Delete this meeting">🗑</button></div></div></div>
    ${roHTML([{k:"Date",v:shortD(m.date)},{k:"Team",v:m.team?esc(m.team):"—"},{k:"Duration",v:m.hours?U(efFh(m.hours),"h"):"—",title:"Logged in Effort for you"},
      {k:"Action points",v:m.actions.length?U(oa+" / "+m.actions.length,"open"):"—",cls:oa?"warn":""},{k:"Linked",v:nl?U(nl,nl===1?"demand or epic":"demands & epics"):"—"}],"stack")}
    <div class="bh-fields ${hOpen?"":"hide"}"><div class="dh-dates" style="margin-top:8px">
        <span>Date <input type="date" id="mt-date" value="${m.date}" style="width:150px"></span>
        <span>Team <input id="mt-team" list="dl-team-m" value="${esc(m.team)}" placeholder="e.g. Portal Team" style="width:150px"><datalist id="dl-team-m">${distinctMeetingTeams().map(x=>`<option value="${esc(x)}">`).join("")}</datalist></span>
        <span class="dh-grow">Attendees <input id="mt-att" value="${esc(m.attendees)}" placeholder="Names…"></span>
        <span>Duration <input id="mt-hrs" value="${m.hours?efFh(m.hours):""}" placeholder="45m · 1.5h" style="width:90px" title="Logged in Effort for you — don't log it again there"></span>
      </div></div><div id="mt-eff"></div></div>
    <div class="detail-body">
      <div class="field"><label>Notes</label><textarea id="mt-body" style="min-height:180px">${esc(m.body)}</textarea></div>
      <div id="mt-links">${linkChips(m.body)}</div>
      <div class="sec-title" style="margin-top:12px"><h3>Linked epics &amp; demands</h3><div class="ln"></div><button class="sm" id="mt-link">🔗 Link</button></div>
      <div class="chiprow" id="mt-chips"></div>
      <div class="sec-title" style="margin-top:18px"><h3>Action points</h3><div class="ln"></div><button class="sm" id="mt-addact">＋ Add action point</button></div>
      <div id="mt-acts"></div>
      <div id="mt-imgs" style="margin-top:18px"></div>
    </div>`;
  host.querySelector("#mt-title").onchange=e=>{m.title=e.target.value||"(untitled meeting)";touch(m);meetingEffortSync(m);drawMeetingEff(m);renderMeetingSidebar();};
  host.querySelector("#mt-date").onchange=e=>{m.date=e.target.value||todayStr();touch(m);meetingEffortSync(m);drawMeetingEff(m);renderMeetingSidebar();};
  host.querySelector("#mt-hrs").onchange=e=>{const h=Math.round(efParseH(e.target.value)*4)/4;
    if(isNaN(h)||h>24){toast("How long? e.g. 45m · 1h · 1.5h · 1h30",true);e.target.value=m.hours?efFh(m.hours):"";return;}
    m.hours=h;e.target.value=h?efFh(h):"";touch(m);meetingEffortSync(m);drawMeetingEff(m);};
  host.querySelector("#mt-team").onchange=e=>{m.team=e.target.value.trim();touch(m);renderMeetingSidebar();};
  host.querySelector("#mt-att").onchange=e=>{m.attendees=e.target.value;touch(m);renderMeetingSidebar();};
  host.querySelector("#mt-det").onclick=()=>hdrToggle(m.id,renderMeetingDetail);
  host.querySelector("#mt-body").onchange=e=>{m.body=e.target.value;touch(m);const l=host.querySelector("#mt-links");if(l)l.innerHTML=linkChips(m.body);};
  host.querySelector("#mt-del").onclick=()=>deleteWithUndo("Deleted the meeting",()=>{state.meetings=state.meetings.filter(x=>x.id!==m.id);meetingEffortRemove(m.id);state.images.forEach(im=>im.links=im.links.filter(l=>!(l.kind==="meeting"&&l.id===m.id)));activeMeetingId=null;});
  host.querySelector("#mt-link").onclick=()=>openLinkDemandsToMeeting(m);
  host.querySelector("#mt-addact").onclick=()=>{m.actions.push(normAction({}));touch(m);drawMeetingActions(m);renderMeetingSidebar();};
  drawMeetingChips(m);drawMeetingActions(m);
  renderImagesSection(host.querySelector("#mt-imgs"),"meeting",m.id);
}
function drawMeetingChips(m){drawLinkChips(document.getElementById("mt-chips"),m,()=>{drawMeetingChips(m);renderMeetingSidebar();},"No epics or demands linked.");meetingEffortSync(m,true);drawMeetingEff(m);}
/* A meeting with a duration logs its own time in Effort — against the demand or epic it's linked to,
   else the Meetings bucket — so the hours are written once. Editing the meeting moves the entry;
   editing or deleting the entry in Effort updates the meeting. */
function meetingLogOpts(m){return [...(m.taskIds||[]).filter(id=>efTaskOf(id)).map(id=>({k:id,l:demandLabel(efTaskOf(id))})),
  ...(m.epicIds||[]).filter(id=>epicById(id)).map(id=>({k:"e:"+id,l:"◆ "+epicLabel(epicById(id))})),
  ...(state.jobs||[]).filter(j=>j.meetingId===m.id).map(j=>({k:"j:"+j.id,l:"☐ "+j.title})),{k:"b:mtg",l:"Meetings (no demand)"}];}
function meetingEffortKey(m){const ks=meetingLogOpts(m).map(o=>o.k);return ks.includes(m.logTo)?m.logTo:ks[0];}
function meetingEffortRemove(id){let n=0;for(let i=state.efforts.length-1;i>=0;i--)if(state.efforts[i].meetingId===id){state.efforts.splice(i,1);n++;}if(n)markDirty();return n;}
/* soft: only create a missing entry (when a planned meeting's day arrives) — never overwrite one */
function meetingEffortSync(m,soft){const cur=state.efforts.filter(e=>e.meetingId===m.id);
  if(!(m.hours>0)||m.date>todayStr()){if(!soft)meetingEffortRemove(m.id);return;}
  if(soft&&cur.length)return;
  const k=meetingEffortKey(m),want={date:m.date,hours:m.hours,taskId:"",epicId:"",jobId:"",bucket:"",note:"Meeting — "+m.title,meetingId:m.id};
  if(k.startsWith("b:"))want.bucket=k.slice(2);else if(k.startsWith("e:"))want.epicId=k.slice(2);else if(k.startsWith("j:"))want.jobId=k.slice(2);else want.taskId=k;
  const e=cur[0];
  if(e&&["date","hours","taskId","epicId","jobId","bucket","note"].every(f=>e[f]===want[f]))return;
  if(e)Object.assign(e,want,{subtaskId:""});else state.efforts.push(normEffort({...want,activity:"Meetings & admin"}));
  cur.slice(1).forEach(x=>state.efforts.splice(state.efforts.indexOf(x),1));
  markDirty();efTimerUI();}
function meetingsEffortCatchUp(){const c=meetingsEffortCatchUp;if(c.at&&Date.now()-c.at<60000)return;c.at=Date.now();(state.meetings||[]).forEach(m=>{if(m.hours>0)meetingEffortSync(m,true);});}
function drawMeetingEff(m){const host=document.getElementById("mt-eff");if(!host)return;
  if(!(m.hours>0)){host.innerHTML=`<div class="mt-eff faint">Add a duration and its time is logged in Effort for you.</div>`;return;}
  const e=state.efforts.find(x=>x.meetingId===m.id),opts=meetingLogOpts(m),k=meetingEffortKey(m);
  host.innerHTML=`<div class="mt-eff"><span>⏱ ${m.date>todayStr()?`${efFh(m.hours)} h will be logged on ${esc(m.date)}`:e?`${efFh(e.hours)} h logged in Effort`:`${efFh(m.hours)} h`} against</span>
    <select id="mt-logto">${opts.map(o=>`<option value="${esc(o.k)}" ${o.k===k?"selected":""}>${esc(o.l)}</option>`).join("")}</select>
    ${e?`<a href="#" id="mt-effgo">see the day ›</a>`:""}</div>`;
  host.querySelector("#mt-logto").onchange=ev=>{m.logTo=ev.target.value;touch(m);meetingEffortSync(m);drawMeetingEff(m);};
  const g=host.querySelector("#mt-effgo");if(g)g.onclick=ev=>{ev.preventDefault();openEfDay(m.date,k);};}
function openLinkDemandsToMeeting(m){openLinkPicker(m,`Link to “${esc(m.title)}”`,()=>{drawMeetingChips(m);meetingEffortSync(m);drawMeetingEff(m);renderMeetingSidebar();});}
function drawMeetingActions(m){
  const host=document.getElementById("mt-acts");if(!host)return;
  if(!m.actions.length){host.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">No action points yet.</div>`;return;}
  host.innerHTML="";
  m.actions.forEach((a,i)=>{const row=document.createElement("div");row.className="actitem"+(a.done?" done":"");const dc=dueClass(a.due,a.done?"closed":"open");
    row.innerHTML=`<span class="chk ${a.done?"done":""}">${a.done?"✓":""}</span>
      <span class="at">${esc(a.text)||"<span class='faint'>(click to write action)</span>"}</span>
      <input class="ow" value="${esc(a.owner)}" placeholder="Owner">
      <input type="date" class="du ${dc}" value="${a.due||""}" title="Due">
      <span class="nact">${a.done?"":`<button class="ghost sm a-job" title="Make it a Task — it keeps the link to this meeting">↗ Task</button>`}<button class="ghost sm a-res" title="Outcome / resolution note (e.g. the answer you were waiting for)">📝</button><button class="ghost sm danger a-del">🗑</button></span>
      ${a.resolution?`<span class="ares" title="Outcome — click to edit">↳ ${esc(a.resolution)}</span>`:""}`;
    row.querySelector(".chk").onclick=()=>{a.done=!a.done;touch(m);drawMeetingActions(m);renderMeetingSidebar();};
    const at=row.querySelector(".at");at.onclick=()=>editInline(at,a.text,v=>{a.text=v;touch(m);drawMeetingActions(m);});
    row.querySelector(".ow").onchange=e=>{a.owner=e.target.value;touch(m);};
    row.querySelector(".du").onchange=e=>{a.due=e.target.value;touch(m);drawMeetingActions(m);};
    row.querySelector(".a-del").onclick=()=>{m.actions.splice(i,1);touch(m);drawMeetingActions(m);renderMeetingSidebar();};
    {const jb=row.querySelector(".a-job");if(jb)jb.onclick=()=>actionToJob(a,m);}
    const editRes=()=>{let ar=row.querySelector(".ares");if(!ar){ar=document.createElement("span");ar.className="ares";row.appendChild(ar);}
      editInline(ar,a.resolution||"",v=>{a.resolution=v;touch(m);drawMeetingActions(m);});};
    row.querySelector(".a-res").onclick=editRes;
    const arEl=row.querySelector(".ares");if(arEl)arEl.onclick=editRes;
    host.appendChild(row);});
}
function renderActionRollup(host){
  let items=[];
  state.meetings.forEach(m=>m.actions.forEach(a=>{if(!a.done)items.push({a,m});}));
  const owners=[...new Set(items.map(x=>x.a.owner).filter(Boolean))].sort();
  const teams=[...new Set(items.map(x=>x.m.team).filter(Boolean))].sort();
  if(rollupOwner&&!owners.includes(rollupOwner))rollupOwner="";
  if(rollupTeam&&!teams.includes(rollupTeam))rollupTeam="";
  let shown=items.filter(x=>(!rollupOwner||x.a.owner===rollupOwner)&&(!rollupTeam||x.m.team===rollupTeam));
  shown.sort((x,y)=>(x.a.due||"9999").localeCompare(y.a.due||"9999"));
  host.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1">
      <h1>⚑ Open action points</h1>
      <div class="dh-dates"><span><b>${items.length}</b> open across <b>${state.meetings.length}</b> meeting(s)</span></div></div>
      <div style="display:flex;gap:8px">
        ${teams.length?`<div style="min-width:150px"><label>Team</label><select id="ro-team"><option value="">All teams</option>${teams.map(o=>`<option ${o===rollupTeam?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`:""}
        <div style="min-width:150px"><label>Owner</label><select id="ro-owner"><option value="">All owners</option>${owners.map(o=>`<option ${o===rollupOwner?"selected":""}>${esc(o)}</option>`).join("")}</select></div>
      </div>
    </div><div class="tabs"><button class="tab active">Sorted by due date</button></div></div>
    <div class="detail-body" id="roBody"></div>`;
  host.querySelector("#ro-owner").onchange=e=>{rollupOwner=e.target.value;renderActionRollup(host);};
  const rt=host.querySelector("#ro-team");if(rt)rt.onchange=e=>{rollupTeam=e.target.value;renderActionRollup(host);};
  const body=host.querySelector("#roBody");
  if(!shown.length){body.innerHTML=`<div class="faint" style="padding:8px 2px">🎉 No open action points${rollupTeam?" for "+esc(rollupTeam):""}${rollupOwner?" · "+esc(rollupOwner):""}.</div>`;return;}
  body.innerHTML="";
  shown.forEach(({a,m})=>{const dc=dueClass(a.due,"open");const row=document.createElement("div");row.className="actitem";
    row.innerHTML=`<span class="chk">${a.done?"✓":""}</span>
      <span class="at" style="cursor:default">${esc(a.text)||"<span class='faint'>(no text)</span>"}</span>
      <span class="ow" style="flex:0 0 110px;color:var(--muted)">${esc(a.owner)||"<span class='faint'>—</span>"}</span>
      <span class="du ${dc}" style="flex:0 0 100px;font-family:var(--mono);font-size:12px">${a.due||"—"}${dc==="over"?" ⚠":""}</span>
      <span class="go" style="flex:0 0 170px;font-size:11px;color:var(--accent);cursor:pointer" title="Open meeting">👥 ${m.date}${m.team?" · "+esc(m.team):""}</span>
      <button class="ghost sm a-job" title="Make it a Task — it keeps the link to the meeting">↗ Task</button>
      ${a.resolution?`<span class="ares" title="Outcome — click to edit">↳ ${esc(a.resolution)}</span>`:""}`;
    row.querySelector(".chk").onclick=()=>{a.done=true;touch(m);renderActionRollup(host);renderMeetingSidebar();};
    row.querySelector(".go").onclick=()=>{meetingRollup=false;activeMeetingId=m.id;renderApp();};
    row.querySelector(".a-job").onclick=()=>actionToJob(a,m);
    const arEl=row.querySelector(".ares");if(arEl)arEl.onclick=()=>editInline(arEl,a.resolution||"",v=>{a.resolution=v;touch(m);renderActionRollup(host);});
    body.appendChild(row);});
}

