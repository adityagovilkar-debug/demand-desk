/* ===================== EPICS ===================== */
function renderEpicSidebar(){
  document.getElementById("side").innerHTML=`
    <div class="side-tools">
      <button class="primary" id="btnNewEpic" style="width:100%">＋ New Epic</button>
      <select id="eFilter"><option value="">All statuses</option>${Object.entries(EPIC_STATUS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("")}</select>
      <p class="faint" style="font-size:11px;margin:0">Group related demands under one initiative — a connection, a report and an object change can share an epic while staying separate demands with their own transports.</p>
    </div>
    <div class="stats" id="epicStats"></div>
    <div class="listwrap" id="epicList"></div>`;
  document.getElementById("btnNewEpic").onclick=()=>{const e=normEpic({name:"New epic"});state.epics.unshift(e);activeEpicId=e.id;markDirty();renderApp();};
  const fe=document.getElementById("eFilter");fe.value=renderEpicSidebar._f||"";
  fe.onchange=()=>{renderEpicSidebar._f=fe.value;renderEpicSidebar();};
  const openE=state.epics.filter(e=>e.status==="active").length;
  const unassigned=state.tasks.filter(t=>!t.epicId).length;
  document.getElementById("epicStats").innerHTML=`<div class="stat op"><b>${state.epics.length}</b>epics</div><div class="stat"><b>${openE}</b>active</div><div class="stat"><b>${unassigned}</b>unassigned</div>`;
  const el=document.getElementById("epicList");
  let rows=state.epics.filter(e=>!renderEpicSidebar._f||e.status===renderEpicSidebar._f);
  rows.sort((a,b)=>(a.status==="closed")-(b.status==="closed")||(a.targetDate||"9999").localeCompare(b.targetDate||"9999")||b.updatedAt-a.updatedAt);
  if(!rows.length){el.innerHTML=`<div class="empty">No epics${renderEpicSidebar._f?" with that status":""} yet.<br>Create one, then assign demands to it<br>from the demand's Edit dialog.</div>`;return;}
  el.innerHTML=rows.map(e=>{const st=EPIC_STATUS[e.status],r=epicRollup(e),pk=epicParked(e,r),fu=epicFollowUps(e).length;
    const dc=dueClass(e.targetDate,e.status==="delivered"||e.status==="closed"?"closed":"open");
    return `<div class="tcard s-${st.cls} ${e.id===activeEpicId?"active":""}" data-id="${e.id}">
      <div class="demand">◆ ${esc(e.code||"epic")}</div>
      <div class="ttitle">${esc(e.name)}</div>
      <div class="meta"><span class="pill ${st.cls}">${st.label}</span>
        <span class="faint">${r.ts.length} demand(s)${r.ts.length?` · ${r.done}/${r.ts.length} done`:""}</span>
        ${r.overdue.length?`<span class="lc-badge" style="color:var(--red)">⚑ ${r.overdue.length}</span>`:""}
        ${pk?`<span class="lc-badge" style="color:var(--amber)" title="${pk.parked?"Parked — waiting on other teams":"Open dependencies on other teams"}">${pk.parked?"⏸":"⏳"} ${pk.days!=null?pk.days+"d":pk.open}</span>`:""}
        ${fu?`<span class="lc-badge" style="color:var(--red)" title="Follow-ups due">📞 ${fu}</span>`:""}
        ${e.role==="contributor"?`<span class="faint" title="I contribute one slice">◐</span>`:""}
        ${e.targetDate?`<span class="due ${dc}">🎯 ${e.targetDate}</span>`:""}</div></div>`;}).join("");
  el.querySelectorAll(".tcard").forEach(x=>x.onclick=()=>{activeEpicId=x.dataset.id;renderApp();});
}
let epicTab="overview", epicStoryOpts={newest:true,off:{}};
function goEpicDemand(id,tab){view="demands";activeId=id;activeTab=tab||"work";renderApp();}
function renderEpicDetail(){
  const e=activeEpic(),host=document.getElementById("detail");
  if(!e){host.innerHTML=nopick("Select an epic, or create one to group<br>related demands under one initiative.");return;}
  const st=EPIC_STATUS[e.status],r=epicRollup(e),pk=epicParked(e,r),fu=epicFollowUps(e);
  const storyN=epicStory(e).length,openDeps=e.deps.filter(x=>!x.done).length,sub=countSubs(e.subtasks);
  host.innerHTML=epicHeadBench(e,r,pk,fu,storyN,openDeps,sub);
  const on=(sel,ev,fn)=>{const el=host.querySelector(sel);if(el)el[ev]=fn;};
  on("#ep-name","onchange",ev=>{e.name=ev.target.value||"(untitled epic)";touch(e);renderApp();});
  on("#ep-code","onchange",ev=>{e.code=ev.target.value.trim();touch(e);renderApp();});
  on("#ep-owner","onchange",ev=>{e.owner=ev.target.value;touch(e);});
  on("#ep-target","onchange",ev=>{e.targetDate=ev.target.value;touch(e);renderApp();});
  on("#ep-status","onchange",ev=>{const was=e.status;e.status=ev.target.value;
    e.log.push({id:uid(),date:todayStr(),kind:"milestone",text:`Epic status: ${EPIC_STATUS[was].label} → ${EPIC_STATUS[e.status].label}`});touch(e);renderApp();});
  on("#ep-role","onchange",ev=>{e.role=ev.target.value;touch(e);renderEpicDetail();});
  on("#ep-brief","onclick",()=>openEpicBrief(e));
  on("#ep-add","onclick",()=>openAssignDemandsToEpic(e));
  on("#ep-del","onclick",()=>deleteWithUndo(`Deleted the epic ${e.code||e.name}`,()=>{
    state.tasks.forEach(t=>{if(t.epicId===e.id)t.epicId="";});state.efforts=state.efforts.filter(x=>x.epicId!==e.id);
    state.meetings.concat(state.journal).forEach(x=>{if(x.epicIds)x.epicIds=x.epicIds.filter(id=>id!==e.id);});
    state.epics=state.epics.filter(x=>x.id!==e.id);activeEpicId=null;}));
  host.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{epicTab=b.dataset.tab;renderEpicDetail();enterPulse("detail");});
  const body=host.querySelector("#epBody");
  {wireEpicHeadBench(host,e);const tb=epicBenchTab();
    if(tb==="deps")renderEpicDeps(body,e);else if(tb==="effort")renderEpicEffort(body,e);else if(tb==="subtasks")renderEpicSubtasks(body,e);
    else if(tb==="details")renderEpicOverview(body,e,r,pk,fu);else renderEpicOverviewBench(body,e,r);}
  placeTabInd(host);
}
function renderEpicOverview(body,e,r,pk,fu){
  const story=epicStory(e),first=story.length?story[0].date:"";
  const span=first?monthsBetween(first,todayStr()):0;
  const waves=waveOrder(r.ts);
  body.innerHTML=`
    ${pk?`<div class="readybar ${pk.parked?"warn":""}"><span><b style="color:var(--amber)">${pk.parked?"⏸ Parked — nothing of mine is in flight; ":"⏳ "}waiting on ${pk.open} thing(s) from other teams${pk.days!=null?` for ${pk.days} day(s)`:""}.</b>
      ${fu.length?` <span style="color:var(--red)">📞 ${fu.length} follow-up(s) due.</span>`:""}</span><button class="sm" id="ep-go-deps" style="margin-left:auto">Open ›</button></div>`:""}
    <div class="grid2" style="margin-bottom:6px">
      <div class="field"><label>Description — the epic as a whole</label><textarea id="ep-desc" placeholder="What this initiative delivers, scope, background…">${esc(e.description)}</textarea></div>
      <div class="field"><label>${e.role==="contributor"?"My part in it":"My scope / approach"}</label><textarea id="ep-scope" placeholder="${e.role==="contributor"?"The slice I deliver, and where it plugs into the bigger picture. What I need from others before I can transport.":"How I'm splitting it into demands and waves."}">${esc(e.myScope)}</textarea></div>
    </div>
    <div class="field"><label>Notes</label><textarea id="ep-notes" rows="2" placeholder="Anything else — dated events belong on the Story tab.">${esc(e.notes)}</textarea></div>
    <div id="ep-links" style="margin-bottom:12px">${linkChips([e.description,e.myScope,e.notes].join(" "))}</div>
    <div class="stats" style="margin:0 0 16px">
      <div class="stat op"><b>${r.ts.length}</b>demands</div>
      <div class="stat dl"><b>${r.done}</b>done</div>
      <div class="stat ov"><b>${r.overdue.length}</b>overdue</div>
      <div class="stat"><b>${r.objects.length}</b>objects</div>
      <div class="stat"><b>${r.trs.length}</b>transports</div>
      <div class="stat" title="${first?"First event "+first:""}"><b>${first?(span>=1?span+" mo":"&lt;1 mo"):"—"}</b>running</div>
    </div>
    <div class="sec-title"><h3>Demands in this epic</h3><div class="ln"></div>
      <span class="faint" style="font-size:12px">${Object.entries(r.counts).map(([k,v])=>`${v} ${STATUS[k].label.toLowerCase()}`).join(" · ")||"none yet"}</span></div>
    <div id="ep-demands"></div>
    <div class="sec-title" style="margin-top:20px"><h3>Go-live readiness across the epic</h3><div class="ln"></div></div>
    <div id="ep-golive"></div>
    <div class="sec-title" style="margin-top:20px"><h3>Objects touched</h3><div class="ln"></div><span class="faint" style="font-size:12px">${r.objects.length} across the epic</span></div>
    <div id="ep-objects"></div>
    <div class="sec-title" style="margin-top:20px"><h3>Transports</h3><div class="ln"></div><span class="faint" style="font-size:12px">${r.trs.length} across the epic</span>${r.trs.length?`<button class="sm" id="ep-run" title="One import request for Basis covering every demand in the epic">📋 Run sheet</button>`:""}</div>
    <div id="ep-trs"></div>`;
  const updL=()=>{body.querySelector("#ep-links").innerHTML=linkChips([e.description,e.myScope,e.notes].join(" "));};
  body.querySelector("#ep-desc").onchange=ev=>{e.description=ev.target.value;touch(e);updL();};
  body.querySelector("#ep-scope").onchange=ev=>{e.myScope=ev.target.value;touch(e);updL();};
  body.querySelector("#ep-notes").onchange=ev=>{e.notes=ev.target.value;touch(e);updL();};
  const gd=body.querySelector("#ep-go-deps");if(gd)gd.onclick=()=>{epicTab="deps";renderEpicDetail();};
  /* demands, grouped by wave in the order the waves arrived */
  const dh=body.querySelector("#ep-demands");
  if(!r.ts.length)dh.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">No demands yet. Use “🔗 Assign demands”, or set the epic on a demand's ✎ Edit dialog.</div>`;
  else{
    const grouped=waves.length>1||waves[0]!=="";
    dh.innerHTML=waves.map(w=>{
      const rows=r.ts.filter(t=>(t.wave||"")===w).sort((a,b)=>(a.receivedDate||"9999").localeCompare(b.receivedDate||"9999"));
      const dn=rows.filter(t=>["delivered","closed"].includes(t.status)).length;
      const wt=waveTarget(e,w),wn=wt?daysUntil(wt):null,wdone=dn===rows.length;
      const wcls=wt&&!wdone?(wn<0?"over":wn<=14?"soon":""):"";
      return (grouped?`<div class="wavehead"><span>${w?esc(w):"— no wave —"}</span>
        ${w?`<span class="wvt" title="Target date for this wave">🎯 <input type="date" class="wv-date" data-w="${esc(w)}" value="${wt}">${wt&&!wdone?`<span class="due ${wcls}">${wn<0?(-wn)+"d over":wn===0?"today":"in "+wn+"d"}</span>`:""}${wt&&wdone?`<span style="color:var(--green)">✓ done</span>`:""}</span>`:""}
        <span class="faint">${dn}/${rows.length} done</span></div>`:"")+
      rows.map(t=>{const s=STATUS[t.status],due=earliestOpenDue(t),dc=dueClass(due,t.status),g=golivePending(t);
        return `<div class="actitem" data-id="${t.id}" style="cursor:pointer">
          <span class="mono" style="flex:0 0 120px;color:var(--accent);font-size:12px">${esc(t.demandId||"—")}</span>
          <span class="at" style="cursor:pointer">${esc(t.title)}</span>
          <span class="pill ${s.cls}" style="flex:0 0 auto">${s.label}</span>
          ${isWaiting(t)?`<span class="pill" style="flex:0 0 auto;color:var(--amber);border-color:var(--amber-line)">⏳ ${esc(t.waiting.on)}</span>`:""}
          ${g?`<span class="lc-badge" style="color:var(--amber)">🚚 ${g.missing.length}→${g.target}</span>`:""}
          <span class="mono faint" style="flex:0 0 92px;font-size:11px" title="Received">⇩ ${t.receivedDate||"—"}</span>
          <span class="du ${dc}" style="flex:0 0 92px;font-family:var(--mono);font-size:12px" title="Next due">${due||"—"}</span></div>`;}).join("");}).join("");
    dh.querySelectorAll(".actitem").forEach(row=>row.onclick=()=>goEpicDemand(row.dataset.id));
    dh.querySelectorAll(".wv-date").forEach(inp=>inp.onchange=()=>{setWaveTarget(e,inp.dataset.w,inp.value);touch(e);renderEpicDetail();});
  }
  const gh=body.querySelector("#ep-golive");
  if(!r.trs.length)gh.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">No transports recorded on this epic's demands yet.</div>`;
  else if(!r.pending.length)gh.innerHTML=`<div class="readybar ok"><b style="color:var(--green)">✓ every transport across ${r.ts.length} demand(s) has reached its go-live target</b></div>`;
  else gh.innerHTML=`<div class="readybar warn"><span><b style="color:var(--amber)">⚠ ${r.pending.length} demand(s) still have transports short of their target:</b></span>
    <span style="flex-basis:100%;font-size:12px">${r.pending.map(x=>`<span class="mono">${esc(demandLabel(x.t))}</span> — ${x.g.missing.length} TR(s) → ${x.g.target}${(()=>{const f=freezeFor(x.g.target);return f?` <span style="color:var(--teal)">❄ frozen until ${f.to}</span>`:"";})()}`).join("<br>")}</span></div>`;
  const oh=body.querySelector("#ep-objects"),cidx=clashIndex();
  oh.innerHTML=r.objects.length?`<div class="tbl-wrap"><table><thead><tr><th style="width:26%">Object</th><th style="width:18%">Type</th><th style="width:12%">Action</th><th>Demand</th></tr></thead><tbody>
    ${r.objects.map(({o,t})=>`<tr class="ep-obj" data-id="${t.id}" style="cursor:pointer"><td class="mono">${esc(o.name)}${clashesFor(t,o,cidx).some(x=>!x.ack)?`<span class="clashtag" title="Also in flight in another demand">⚠ clash</span>`:""}</td><td>${esc(o.type)}</td><td>${esc(o.action)}</td><td class="faint">${esc(demandLabel(t))}</td></tr>`).join("")}</tbody></table></div>`
    :`<div class="faint" style="font-size:12px;padding:4px 2px">No objects logged yet.</div>`;
  oh.querySelectorAll(".ep-obj").forEach(row=>row.onclick=()=>goEpicDemand(row.dataset.id,"objects"));
  const th=body.querySelector("#ep-trs");
  th.innerHTML=r.trs.length?`<div class="tbl-wrap"><table><thead><tr><th style="width:22%">TR</th><th style="width:14%">Kind</th><th style="width:14%">Origin</th><th>Reached</th><th style="width:22%">Demand</th></tr></thead><tbody>
    ${r.trs.map(({tr,t})=>{const cl=isCust(tr)&&tr.client?" / "+esc(tr.client):"";
      return `<tr class="ep-tr" data-id="${t.id}" style="cursor:pointer"><td class="mono">${esc(tr.number||"(unnumbered)")}</td><td>${isCust(tr)?"🗂 Customizing":"🔧 Workbench"}</td><td class="mono">${esc(tr.system)}${cl}</td><td class="mono" style="font-size:11px">${[...reachedSystems(t,tr)].join(", ")||"—"}</td><td class="faint">${esc(demandLabel(t))}</td></tr>`;}).join("")}</tbody></table></div>`
    :`<div class="faint" style="font-size:12px;padding:4px 2px">No transports yet.</div>`;
  th.querySelectorAll(".ep-tr").forEach(row=>row.onclick=()=>goEpicDemand(row.dataset.id,"transports"));
  {const b=body.querySelector("#ep-run");if(b)b.onclick=()=>{const ordered=waves.flatMap(w=>r.ts.filter(t=>(t.wave||"")===w).sort((a,b)=>(a.receivedDate||"9999").localeCompare(b.receivedDate||"9999")));
    openRunSheet(ordered,"◆ "+epicLabel(e),commonTarget(r.ts));};}
}
const STORY_SRC={log:"📝 Epic log",demand:"📥 Demands",transport:"🚚 Transports",meeting:"👥 Meetings & journal",dep:"⏸ Other teams"};
function renderEpicStory(body,e){
  const all=epicStory(e),o=epicStoryOpts;
  let list=all.filter(x=>!o.off[x.src]);if(o.newest)list=list.slice().reverse();
  const first=all.length?all[0].date:"",last=all.length?all[all.length-1].date:"";
  body.innerHTML=`
    <div class="storyadd">
      <input type="date" id="st-date" value="${todayStr()}" style="width:150px">
      <select id="st-kind" style="width:140px">${Object.entries(EPIC_LOG).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join("")}</select>
      <input id="st-text" placeholder="What happened? e.g. “Wave 2 scope agreed — 4 more endpoints”  (Enter to add)" style="flex:1;min-width:200px">
      <button class="primary sm" id="st-add">＋ Add to story</button>
    </div>
    <p class="faint" style="font-size:11px;margin:4px 0 10px">Back-date entries freely to reconstruct older history. Demand arrivals, status changes, transport moves, linked meetings/journal and other teams' hand-offs are woven in automatically.</p>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
      <div class="statchips" id="st-src">${Object.entries(STORY_SRC).map(([k,v])=>`<button class="statchip open ${o.off[k]?"":"on"}" data-s="${k}">${esc(v)}</button>`).join("")}</div>
      <button class="sm" id="st-linkm" style="margin-left:auto" title="Link meetings about this epic that aren't tied to one demand">🔗 Meetings</button>
      <button class="sm" id="st-linkj" title="Link journal entries about this epic">🔗 Journal</button>
      <button class="sm ghost" id="st-order">${o.newest?"↓ Newest first":"↑ Oldest first"}</button>
    </div>
    ${all.length?`<div class="faint mono" style="font-size:11px;margin-bottom:8px">${all.length} event(s) · ${first} → ${last} · ${monthsBetween(first,last)} month(s)</div>`:""}
    <div id="st-list"></div>`;
  const add=()=>{const tx=body.querySelector("#st-text").value.trim();if(!tx)return;
    e.log.push({id:uid(),date:body.querySelector("#st-date").value||todayStr(),kind:body.querySelector("#st-kind").value,text:tx});
    touch(e);renderEpicDetail();};
  body.querySelector("#st-add").onclick=add;
  body.querySelector("#st-text").onkeydown=ev=>{if(ev.key==="Enter")add();};
  body.querySelectorAll("#st-src .statchip").forEach(b=>b.onclick=()=>{o.off[b.dataset.s]=!o.off[b.dataset.s];renderEpicStory(body,e);});
  body.querySelector("#st-order").onclick=()=>{o.newest=!o.newest;renderEpicStory(body,e);};
  body.querySelector("#st-linkm").onclick=()=>openEpicLinkPicker(e,"meetings");
  body.querySelector("#st-linkj").onclick=()=>openEpicLinkPicker(e,"journal");
  const host=body.querySelector("#st-list");
  if(!list.length){host.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">${all.length?"Everything is filtered out — switch a source back on above.":"Nothing yet. Add the first entry above, or assign demands to this epic."}</div>`;return;}
  let html="",month="";
  list.forEach(x=>{const m=x.date.slice(0,7);
    if(m!==month){month=m;const d=new Date(m+"-01T00:00:00");html+=`<div class="storymonth">${isNaN(d)?esc(m):d.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</div>`;}
    const goable=x.tid||x.mid||x.jid;
    html+=`<div class="storyrow src-${x.src}" ${x.id?`data-log="${x.id}"`:""}>
      <span class="mono sd">${esc(x.date)}</span><span class="si">${x.icon}</span>
      <span class="st ${goable?"go":""}" ${x.tid?`data-tid="${x.tid}"`:""}${x.mid?` data-mid="${x.mid}"`:""}${x.jid?` data-jid="${x.jid}"`:""}>${x.src==="log"?`<span class="sk">${EPIC_LOG[x.kind].label}</span> `:""}${linkify(x.text)}</span>
      ${x.id?`<span class="nact"><button class="ghost sm l-edit" title="Edit">✎</button><button class="ghost sm danger l-del" title="Delete">🗑</button></span>`:""}</div>`;});
  host.innerHTML=html;
  host.querySelectorAll(".st.go").forEach(s=>s.onclick=ev=>{if(ev.target.tagName==="A")return;
    if(s.dataset.tid)goEpicDemand(s.dataset.tid);
    else if(s.dataset.mid){view="meetings";meetingRollup=false;activeMeetingId=s.dataset.mid;renderApp();}
    else if(s.dataset.jid){view="journal";journalTodos=false;activeJournalId=s.dataset.jid;renderApp();}});
  host.querySelectorAll(".storyrow[data-log]").forEach(row=>{const x=e.log.find(l=>l.id===row.dataset.log);if(!x)return;
    row.querySelector(".l-del").onclick=()=>deleteWithUndo("Deleted the story entry",()=>{e.log=e.log.filter(l=>l.id!==x.id);touch(e);});
    row.querySelector(".l-edit").onclick=async()=>{
      const v=await askBox({title:"Edit the story entry",fields:[{k:"tx",label:"Entry",value:x.text,type:"textarea"},{k:"dt",label:"Date",value:x.date,type:"date"}],ok:"Save"});if(!v)return;const tx=v.tx,dt=v.dt||"";
      if(tx.trim())x.text=tx.trim();if(/^\d{4}-\d{2}-\d{2}$/.test(dt.trim()))x.date=dt.trim();touch(e);renderEpicDetail();};});
}
function openEpicLinkPicker(e,kind){
  const root=document.getElementById("modalRoot"),isM=kind==="meetings";
  const list=(isM?state.meetings:state.journal).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const viaDemand=new Set(tasksForEpic(e.id).map(t=>t.id));
  root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>Link ${isM?"meetings":"journal entries"} to ◆ ${esc(epicLabel(e))}</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">Items already linked to one of this epic's demands show in its Story anyway — they're marked below.</p>
    ${list.length?`<div class="picklist">${list.map(x=>{const via=(x.taskIds||[]).some(id=>viaDemand.has(id));
      return `<label class="pickrow"><input type="checkbox" data-id="${x.id}" ${(x.epicIds||[]).includes(e.id)?"checked":""} style="width:auto"><div><div>${isM?"👥 "+esc(x.title):"📓 "+x.date+(x.title?" — "+esc(x.title):"")}</div><div class="faint" style="font-size:11px">${isM?x.date+(x.team?" · "+esc(x.team):""):esc((x.body||"").replace(/\s+/g," ").slice(0,70))}${via?" · already in story via a demand":""}</div></div></label>`;}).join("")}</div>`:`<p class="faint">No ${isM?"meetings":"journal entries"} yet.</p>`}
    <div class="modal-foot"><button id="m-close" class="primary">Done</button></div></div></div>`;
  root.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{const x=list.find(y=>y.id===cb.dataset.id);x.epicIds=x.epicIds||[];
    if(cb.checked){if(!x.epicIds.includes(e.id))x.epicIds.push(e.id);}else x.epicIds=x.epicIds.filter(id=>id!==e.id);touch(x);});
  const close=()=>{root.innerHTML="";renderEpicDetail();};
  root.querySelector("#m-close").onclick=close;
  root.querySelector(".modal-bg").onclick=ev=>{if(ev.target===root.querySelector(".modal-bg"))close();};
}
function renderEpicDeps(body,e){
  const rows=e.deps.slice().sort((a,b)=>a.done-b.done||(a.since||"9999").localeCompare(b.since||"9999"));
  body.innerHTML=`
    <div class="sec-title"><h3>What other teams owe before my part can move</h3><div class="ln"></div><button class="sm" id="dp-add">＋ Add dependency</button></div>
    <p class="faint" style="font-size:12px;margin:-4px 0 10px">For the months where your work is done but can't be transported until someone else finishes. <b>📞 Checked in</b> records a follow-up in the Story. A row turns due when its expected date passes, or nobody has chased it for
      <input type="number" id="dp-every" min="1" max="365" value="${e.followDays}" style="width:62px;padding:2px 5px"> days. Due follow-ups also show on <b>Today</b>.</p>
    <div class="tbl-wrap"><table class="deptbl"><thead><tr><th style="width:17%">Team / person</th><th>What they owe</th><th style="width:130px">Waiting since</th><th style="width:130px">Expected</th><th style="width:110px">Last contact</th><th style="width:290px"></th></tr></thead><tbody id="dp-body"></tbody></table></div>`;
  body.querySelector("#dp-every").onchange=ev=>{const n=parseInt(ev.target.value,10);if(n>0){e.followDays=n;touch(e);renderEpicDetail();}};
  body.querySelector("#dp-add").onclick=()=>{e.deps.push(normDep({since:todayStr()}));touch(e);renderEpicDetail();};
  const tb=body.querySelector("#dp-body");
  if(!rows.length){tb.innerHTML=`<tr><td colspan="6" class="faint" style="padding:14px;text-align:center">Nothing blocking. Add a row when your part is waiting on another team's build, config or go-live.</td></tr>`;return;}
  tb.innerHTML=rows.map(x=>{const due=depFollowDue(e,x),last=x.lastCheck||"";
    const ago=last?-daysUntil(last):null;
    return `<tr data-id="${x.id}" class="${x.done?"depdone":""}">
      <td><input class="d-team" value="${esc(x.team)}" placeholder="e.g. LUCA integration team" ${x.done?"disabled":""}></td>
      <td><input class="d-what" value="${esc(x.what)}" placeholder="e.g. middleware mapping deployed to QA" ${x.done?"disabled":""}>
        ${due?`<div style="font-size:11px;color:var(--red);margin-top:3px">📞 follow-up due — ${due}</div>`:""}
        ${!x.done&&x.snoozeUntil&&x.snoozeUntil>todayStr()?`<div style="font-size:11px;color:var(--muted);margin-top:3px">💤 reminders snoozed until <span class="mono">${x.snoozeUntil}</span> <button class="ghost sm d-unsnooze" title="Cancel the snooze" style="padding:0 5px">✕</button></div>`:""}
        ${x.done?`<div style="font-size:11px;color:var(--green);margin-top:3px">✓ delivered ${x.doneDate}${x.since&&x.doneDate?` · after ${Math.max(0,daysUntil(x.doneDate)-daysUntil(x.since))}d`:""}</div>`:""}</td>
      <td><input type="date" class="d-since" value="${x.since}" ${x.done?"disabled":""}>${!x.done&&x.since?`<div class="faint mono" style="font-size:11px;margin-top:3px">${Math.max(0,-daysUntil(x.since))}d</div>`:""}</td>
      <td><input type="date" class="d-exp" value="${x.expected}" ${x.done?"disabled":""}></td>
      <td class="mono" style="font-size:11px">${last?`${last}<div class="faint">${ago}d ago</div>`:'<span class="faint">never</span>'}</td>
      <td style="text-align:right;white-space:nowrap">${x.done?`<button class="ghost sm d-reopen">↺ Reopen</button>`:`<button class="sm d-check" title="I chased them — log it">📞 Checked in</button> <button class="sm d-snooze" title="Don't flag this for follow-up until a later date">💤 Later</button> <button class="sm d-done" title="They delivered">✓ Delivered</button>`} <button class="ghost sm danger d-del">🗑</button></td></tr>`;}).join("");
  tb.querySelectorAll("tr[data-id]").forEach(tr=>{const x=e.deps.find(d=>d.id===tr.dataset.id);
    /* text fields don't redraw (Tab to the next field keeps working); dates do, they drive the nudges */
    const bind=(sel,k,redraw)=>{const el=tr.querySelector(sel);if(el)el.onchange=ev=>{x[k]=ev.target.value;touch(e);if(redraw)renderEpicDetail();};};
    bind(".d-team","team");bind(".d-what","what");bind(".d-since","since",1);bind(".d-exp","expected",1);
    const ck=tr.querySelector(".d-check");if(ck)ck.onclick=()=>depCheckIn(e,x);
    const sz=tr.querySelector(".d-snooze");if(sz)sz.onclick=()=>depSnooze(e,x);
    const us=tr.querySelector(".d-unsnooze");if(us)us.onclick=()=>{x.snoozeUntil="";touch(e);renderEpicDetail();};
    const dn=tr.querySelector(".d-done");if(dn)dn.onclick=()=>depDelivered(e,x);
    const ro=tr.querySelector(".d-reopen");if(ro)ro.onclick=()=>{x.done=false;x.doneDate="";touch(e);renderEpicDetail();};
    tr.querySelector(".d-del").onclick=()=>deleteWithUndo("Removed the dependency",()=>{e.deps=e.deps.filter(d=>d.id!==x.id);touch(e);});});
}
async function depCheckIn(e,x){const who=x.team||"the other team";
  const v=await askBox({title:`Checked with ${who}`,fields:[{k:"note",label:"What did they say? (goes into the epic's Story — blank is fine)",type:"textarea"},{k:"nd",label:"New expected date, if they gave one",type:"date",hint:"Blank keeps "+(x.expected||"none")}],ok:"Log it"});if(!v)return;
  const note=v.note||"",nd=(v.nd||"").trim();
  x.lastCheck=todayStr();x.snoozeUntil="";
  const newExp=/^\d{4}-\d{2}-\d{2}$/.test(nd);if(newExp)x.expected=nd;
  e.log.push({id:uid(),date:todayStr(),kind:"followup",text:`Checked with ${who}${x.what?" re "+x.what:""}${note.trim()?": "+note.trim():""}${newExp?" · now expected "+nd:""}`});
  touch(e);renderEpicDetail();toast("Follow-up logged in the Story");}
async function depSnooze(e,x){const who=x.team||"the other team";
  const v=await askText(`Remind me about ${who} again in…`,{label:"Days — or a date (YYYY-MM-DD)",value:"14",ok:"Snooze"});if(v===null)return;const t=v.trim();
  let until="";if(/^\d{4}-\d{2}-\d{2}$/.test(t))until=t;else if(/^\d+$/.test(t)&&+t>0){const d=new Date();d.setDate(d.getDate()+(+t));until=isoD(d);}
  if(!until||until<=todayStr()){toast("Give a number of days, or a future date",true);return;}
  x.snoozeUntil=until;touch(e);renderEpicDetail();toast("No follow-up nudges until "+until);}
function depDelivered(e,x){x.done=true;x.doneDate=todayStr();x.lastCheck=todayStr();touch(e);
  if(!e.deps.some(d=>!d.done))toast("Nothing left blocking this epic — time to move your transports?");
  renderEpicDetail();}
function renderEpicSubtasks(body,e){
  body.innerHTML=`<div class="sec-title"><h3>Epic-level subtasks</h3><div class="ln"></div><button class="sm" id="es-add">＋ Add subtask</button></div>
    <p class="faint" style="font-size:12px;margin:-4px 0 10px">Work that belongs to the initiative rather than any one demand — alignment calls, cut-over prep, the hand-over note, “raise the Wave 3 demand”.</p>
    <div class="tree" id="es-tree"></div>`;
  const rr=()=>renderEpicDetail();
  body.querySelector("#es-add").onclick=()=>{e.subtasks.push(mkSub());touch(e);rr();};
  renderTree(body.querySelector("#es-tree"),e,e.subtasks,rr);
}
/* ---------- epic brief: the whole initiative as one document ---------- */
function epicBriefData(e){const r=epicRollup(e);return{r,pk:epicParked(e,r),story:epicStory(e),waves:waveOrder(r.ts)};}
function buildEpicBriefHTML(e){
  const {r,pk,story,waves}=epicBriefData(e);
  const subs=list=>list.length?`<ul>${list.map(s=>`<li>${s.done?"✓ ":"☐ "}${esc(s.title)}${s.dueDate?` <i>(due ${s.dueDate})</i>`:""}${subs(s.children)}</li>`).join("")}</ul>`:"";
  return `<h1>◆ ${esc(epicLabel(e))}</h1>
    <p><b>Status:</b> ${EPIC_STATUS[e.status].label} · <b>My role:</b> ${e.role==="contributor"?"Contributor (one slice)":"Lead"}${e.owner?` · <b>Owner:</b> ${esc(e.owner)}`:""}${e.targetDate?` · <b>Target:</b> ${e.targetDate}`:""}${story.length?` · <b>Running since:</b> ${story[0].date}`:""}</p>
    ${pk?`<p><b>${pk.parked?"⏸ Parked":"⏳ Waiting"}:</b> ${pk.open} open dependency(ies)${pk.days!=null?`, oldest ${pk.days} day(s)`:""}.</p>`:""}
    ${e.description?`<h3>Description</h3><p style="white-space:pre-wrap">${esc(e.description)}</p>`:""}
    ${e.myScope?`<h3>${e.role==="contributor"?"My part":"Scope / approach"}</h3><p style="white-space:pre-wrap">${esc(e.myScope)}</p>`:""}
    <h3>Demands (${r.ts.length} · ${r.done} done)</h3>
    ${r.ts.length?waves.map(w=>`${waves.length>1||w?`<h4>${w?esc(w):"No wave"}${waveTarget(e,w)?` — target ${waveTarget(e,w)}`:""}</h4>`:""}<table><tr><th>Demand</th><th>Title</th><th>System</th><th>Status</th><th>Received</th><th>Transports</th></tr>${r.ts.filter(t=>(t.wave||"")===w).sort((a,b)=>(a.receivedDate||"").localeCompare(b.receivedDate||"")).map(t=>`<tr><td>${esc(t.demandId||"—")}</td><td>${esc(t.title)}</td><td>${esc(t.system)||"—"}${t.client?" / "+esc(t.client):""}</td><td>${STATUS[t.status].label}</td><td>${t.receivedDate||"—"}</td><td>${t.transports.map(tr=>esc(tr.number||"(TR)")).join(", ")||"—"}</td></tr>`).join("")}</table>`).join(""):"<p><i>none</i></p>"}
    ${e.deps.length?`<h3>Dependencies on other teams</h3><table><tr><th>Team</th><th>What</th><th>Since</th><th>Expected</th><th>State</th></tr>${e.deps.map(x=>`<tr><td>${esc(x.team)}</td><td>${esc(x.what)}</td><td>${x.since||"—"}</td><td>${x.expected||"—"}</td><td>${x.done?"✓ delivered "+x.doneDate:(x.lastCheck?"open · last chased "+x.lastCheck:"open")}</td></tr>`).join("")}</table>`:""}
    <h3>Go-live readiness</h3><p>${!r.trs.length?"No transports recorded.":!r.pending.length?"✓ Every transport has reached its go-live target.":r.pending.map(x=>`${esc(demandLabel(x.t))} — ${x.g.missing.length} TR(s) not yet in ${x.g.target}`).join("<br>")}</p>
    ${e.subtasks.length?`<h3>Epic subtasks</h3>${subs(e.subtasks)}`:""}
    ${r.objects.length?`<h3>Objects touched</h3><table><tr><th>Object</th><th>Type</th><th>Action</th><th>Demand</th></tr>${r.objects.map(({o,t})=>`<tr><td>${esc(o.name)}</td><td>${esc(o.type)}</td><td>${esc(o.action)}</td><td>${esc(demandLabel(t))}</td></tr>`).join("")}</table>`:""}
    <h3>Story</h3>${story.length?`<table><tr><th style="width:95px">Date</th><th>Event</th></tr>${story.map(x=>`<tr><td>${esc(x.date)}</td><td>${x.icon} ${x.src==="log"?`<b>${EPIC_LOG[x.kind].label}:</b> `:""}${esc(x.text)}</td></tr>`).join("")}</table>`:"<p><i>nothing recorded</i></p>"}
    ${e.notes?`<h3>Notes</h3><p style="white-space:pre-wrap">${esc(e.notes)}</p>`:""}
    <p style="color:#888;font-size:11px">Generated by Demand Desk on ${todayStr()}</p>`;
}
function buildEpicBriefMarkdown(e){
  const {r,pk,story,waves}=epicBriefData(e),L=[];
  const subs=(list,d)=>list.forEach(s=>{L.push(`${"  ".repeat(d)}- [${s.done?"x":" "}] ${s.title}${s.dueDate?` (due ${s.dueDate})`:""}`);subs(s.children,d+1);});
  L.push(`# ◆ ${epicLabel(e)}`,``,`**Status:** ${EPIC_STATUS[e.status].label} · **My role:** ${e.role==="contributor"?"Contributor (one slice)":"Lead"}${e.owner?` · **Owner:** ${e.owner}`:""}${e.targetDate?` · **Target:** ${e.targetDate}`:""}${story.length?` · **Running since:** ${story[0].date}`:""}`,``);
  if(pk)L.push(`**${pk.parked?"⏸ Parked":"⏳ Waiting"}:** ${pk.open} open dependency(ies)${pk.days!=null?`, oldest ${pk.days} day(s)`:""}.`,``);
  if(e.description)L.push(`## Description`,e.description,``);
  if(e.myScope)L.push(`## ${e.role==="contributor"?"My part":"Scope / approach"}`,e.myScope,``);
  L.push(`## Demands (${r.ts.length} · ${r.done} done)`);
  waves.forEach(w=>{if(waves.length>1||w)L.push(``,`### ${w||"No wave"}${waveTarget(e,w)?` — target ${waveTarget(e,w)}`:""}`);
    L.push(`| Demand | Title | System | Status | Received | Transports |`,`|---|---|---|---|---|---|`);
    r.ts.filter(t=>(t.wave||"")===w).sort((a,b)=>(a.receivedDate||"").localeCompare(b.receivedDate||"")).forEach(t=>L.push(`| ${t.demandId||"—"} | ${t.title} | ${t.system||"—"}${t.client?" / "+t.client:""} | ${STATUS[t.status].label} | ${t.receivedDate||"—"} | ${t.transports.map(tr=>tr.number||"(TR)").join(", ")||"—"} |`));});
  L.push(``);
  if(e.deps.length){L.push(`## Dependencies on other teams`,`| Team | What | Since | Expected | State |`,`|---|---|---|---|---|`);
    e.deps.forEach(x=>L.push(`| ${x.team} | ${x.what} | ${x.since||"—"} | ${x.expected||"—"} | ${x.done?"delivered "+x.doneDate:(x.lastCheck?"open · last chased "+x.lastCheck:"open")} |`));L.push(``);}
  L.push(`## Go-live readiness`,!r.trs.length?"No transports recorded.":!r.pending.length?"✓ Every transport has reached its go-live target.":r.pending.map(x=>`- ${demandLabel(x.t)} — ${x.g.missing.length} TR(s) not yet in ${x.g.target}`).join("\n"),``);
  if(e.subtasks.length){L.push(`## Epic subtasks`);subs(e.subtasks,0);L.push(``);}
  L.push(`## Story`);
  if(story.length)story.forEach(x=>L.push(`- **${x.date}** ${x.icon} ${x.src==="log"?EPIC_LOG[x.kind].label+": ":""}${x.text}`));else L.push("_nothing recorded_");
  if(e.notes)L.push(``,`## Notes`,e.notes);
  return L.join("\n");
}
function openEpicBrief(e){
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:820px"><h2>📄 Epic brief — ${esc(epicLabel(e))}</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">The whole initiative in one document: scope, demands by wave, who you're waiting on, and the full story.</p>
    <div class="specpaper specdoc">${buildEpicBriefHTML(e)}</div>
    <div class="modal-foot"><button id="eb-copy">📋 Copy Markdown</button><button id="eb-md">⬇ Download .md</button><button id="eb-print">🖨 Print / Save PDF</button><button id="eb-close" class="primary">Close</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector("#eb-close").onclick=close;
  root.querySelector(".modal-bg").onclick=ev=>{if(ev.target===root.querySelector(".modal-bg"))close();};
  root.querySelector("#eb-copy").onclick=()=>{navigator.clipboard.writeText(buildEpicBriefMarkdown(e)).then(()=>toast("Markdown copied to clipboard")).catch(()=>toast("Copy failed",true));};
  root.querySelector("#eb-md").onclick=()=>{const b=new Blob([buildEpicBriefMarkdown(e)],{type:"text/markdown"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="epic-"+(e.code||e.name).replace(/[^\w.-]+/g,"_")+"-"+todayStr()+".md";a.click();URL.revokeObjectURL(a.href);};
  root.querySelector("#eb-print").onclick=()=>{const pa=document.getElementById("printArea");pa.className="specdoc";pa.innerHTML=buildEpicBriefHTML(e);window.print();};
}
function openAssignDemandsToEpic(e){
  const root=document.getElementById("modalRoot");
  const rows=state.tasks.slice().sort((a,b)=>b.updatedAt-a.updatedAt);
  root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>Assign demands to “${esc(e.name)}”</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">A demand belongs to one epic. Ticking here moves it to this epic; unticking leaves it un-grouped.</p>
    ${rows.length?`<div class="picklist">${rows.map(t=>{const other=t.epicId&&t.epicId!==e.id?epicById(t.epicId):null;
      return `<label class="pickrow"><input type="checkbox" data-id="${t.id}" ${t.epicId===e.id?"checked":""} style="width:auto"><div><div class="demand">${esc(t.demandId||"—")}</div><div>${esc(t.title)}</div>${other?`<div class="faint" style="font-size:11px">currently in ◆ ${esc(epicLabel(other))}</div>`:""}</div></label>`;}).join("")}</div>`:`<p class="faint">No demands yet.</p>`}
    <div class="modal-foot"><button id="m-close" class="primary">Done</button></div></div></div>`;
  const close=()=>{root.innerHTML="";renderApp();};
  root.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{const t=state.tasks.find(x=>x.id===cb.dataset.id);
    if(cb.checked)t.epicId=e.id;else if(t.epicId===e.id)t.epicId="";touch(t);});
  root.querySelector("#m-close").onclick=close;
  root.querySelector(".modal-bg").onclick=ev=>{if(ev.target===root.querySelector(".modal-bg"))close();};
}

