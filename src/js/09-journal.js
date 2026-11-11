/* ===================== JOURNAL ===================== */
function activeJournal(){return state.journal.find(j=>j.id===activeJournalId);}
function renderJournalSidebar(){
  document.getElementById("side").innerHTML=`
    <div class="side-tools">
      <button class="primary" id="btnToday" style="width:100%">＋ Today's entry</button>
    </div>
    <div class="listwrap" id="jList"></div>`;
  document.getElementById("btnToday").onclick=()=>{journalTodos=false;let j=state.journal.find(x=>x.date===todayStr());if(!j){j={id:uid(),date:todayStr(),title:"",body:"",createdAt:Date.now(),updatedAt:Date.now()};state.journal.unshift(j);markDirty();}activeJournalId=j.id;renderApp();};
  const el=document.getElementById("jList");
  const rows=state.journal.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  const list=rows.length?rows.map(j=>{const preview=(j.body||"").replace(/\s+/g," ").slice(0,60);
    return `<div class="tcard ${(!journalTodos&&j.id===activeJournalId)?"active":""}" data-id="${j.id}">
      <div class="demand">📓 ${j.date}${j.date===todayStr()?" · today":""}</div>
      <div class="ttitle">${esc(j.title)||"<span class='faint' style='font-weight:400'>(no title)</span>"}</div>
      <div class="meta faint">${esc(preview)||"empty"}${((j.taskIds||[]).length+(j.epicIds||[]).length)?`<span class="lc-badge">🔗 ${(j.taskIds||[]).length+(j.epicIds||[]).length}</span>`:""}</div></div>`;}).join(""):`<div class="empty" style="padding:20px 12px">No journal entries yet.<br>Keep daily rough notes here.</div>`;
  el.innerHTML=list;
  el.querySelectorAll(".tcard[data-id]").forEach(x=>x.onclick=()=>{journalTodos=false;activeJournalId=x.dataset.id;renderApp();});
}
function renderJournalDetail(){
  const host=document.getElementById("detail");
  const j=activeJournal();
  if(!j){host.innerHTML=nopick("Pick a day on the left, or click<br><b>＋ Today's entry</b> to start writing.");return;}
  host.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1">
      <input id="j-title" value="${esc(j.title)}" placeholder="Optional title for the day…" style="font-size:18px;font-weight:650;border-color:transparent;background:transparent;padding:2px 4px">
      <div class="dh-dates" style="margin-top:8px"><span>Date <input type="date" id="j-date" value="${j.date}" style="width:150px"></span></div></div>
      <button class="sm danger" id="j-del" style="align-self:flex-start">🗑 Delete</button></div>
    <div class="tabs"><button class="tab active">Notes</button></div></div>
    <div class="detail-body"><div class="field"><label>Rough notes for the day</label><textarea id="j-body" class="jbody" placeholder="Anything — what you worked on, snippets, things to remember…">${esc(j.body)}</textarea></div><div id="j-links">${linkChips(j.body)}</div>
      <div class="sec-title" style="margin-top:14px"><h3>Linked epics &amp; demands</h3><div class="ln"></div><button class="sm" id="j-link">🔗 Link</button></div>
      <div class="chiprow" id="j-chips"></div>
      <div id="j-imgs" style="margin-top:18px"></div></div>`;
  host.querySelector("#j-title").onchange=e=>{j.title=e.target.value;touch(j);renderJournalSidebar();};
  host.querySelector("#j-date").onchange=e=>{const nd=e.target.value||todayStr();
    if(state.journal.some(x=>x.id!==j.id&&x.date===nd)){toast("An entry for "+nd+" already exists",true);e.target.value=j.date;return;}
    j.date=nd;touch(j);renderJournalSidebar();};
  host.querySelector("#j-body").onchange=e=>{j.body=e.target.value;touch(j);renderJournalSidebar();const l=host.querySelector("#j-links");if(l)l.innerHTML=linkChips(j.body);};
  host.querySelector("#j-del").onclick=()=>deleteWithUndo("Deleted the journal entry",()=>{state.journal=state.journal.filter(x=>x.id!==j.id);state.images.forEach(im=>im.links=im.links.filter(l=>!(l.kind==="journal"&&l.id===j.id)));activeJournalId=null;});
  host.querySelector("#j-link").onclick=()=>openLinkDemandsToJournal(j);
  drawJournalChips(j);
  renderImagesSection(host.querySelector("#j-imgs"),"journal",j.id);
}
function drawJournalChips(j){drawLinkChips(document.getElementById("j-chips"),j,()=>{drawJournalChips(j);renderJournalSidebar();},"Nothing linked — link the epics or demands these notes are about.");}
function openLinkDemandsToJournal(j){openLinkPicker(j,`Link journal ${j.date}`,()=>{drawJournalChips(j);renderJournalSidebar();});}
/* Shared by meetings and journal entries: an item can link to whole epics
   (epicIds — for epic-wide calls that aren't about one demand) and to demands (taskIds). */
function drawLinkChips(host,o,redraw,emptyMsg){
  if(!host)return;o.taskIds=o.taskIds||[];o.epicIds=o.epicIds||[];
  const eps=o.epicIds.map(epicById).filter(Boolean),ts=o.taskIds.map(id=>state.tasks.find(x=>x.id===id)).filter(Boolean);
  if(!eps.length&&!ts.length){host.innerHTML=`<span class="faint" style="font-size:12px">${emptyMsg}</span>`;return;}
  host.innerHTML="";
  const add=(label,go,remove,epic)=>{const chip=document.createElement("span");chip.className="chip"+(epic?" epicchip":"");
    chip.innerHTML=`<span class="go">${esc(label)}</span> <span class="x">✕</span>`;
    chip.querySelector(".go").onclick=go;chip.querySelector(".x").onclick=()=>{remove();touch(o);redraw();};host.appendChild(chip);};
  eps.forEach(e=>add("◆ "+epicLabel(e),()=>{view="epics";activeEpicId=e.id;epicTab="story";renderApp();},()=>{o.epicIds=o.epicIds.filter(x=>x!==e.id);},true));
  ts.forEach(t=>add(taskLabel(t),()=>{view="demands";activeId=t.id;activeTab="overview";renderApp();},()=>{o.taskIds=o.taskIds.filter(x=>x!==t.id);},false));
}
function openLinkPicker(o,title,onClose){
  const root=document.getElementById("modalRoot");o.taskIds=o.taskIds||[];o.epicIds=o.epicIds||[];
  const eps=state.epics.slice().sort((a,b)=>(a.status==="closed")-(b.status==="closed")||epicLabel(a).localeCompare(epicLabel(b)));
  const rows=state.tasks.slice().sort((a,b)=>b.updatedAt-a.updatedAt);
  root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>${title}</h2>
    ${eps.length?`<div class="picksec">◆ Epics <span class="faint">— for talk about the initiative as a whole</span></div><div class="picklist" style="max-height:190px">${eps.map(e=>`<label class="pickrow"><input type="checkbox" data-ep="${e.id}" ${o.epicIds.includes(e.id)?"checked":""} style="width:auto"><div><div class="demand">◆ ${esc(e.code||"epic")}</div><div>${esc(e.name)}</div></div></label>`).join("")}</div>`:""}
    <div class="picksec">Demands</div>
    ${rows.length?`<div class="picklist">${rows.map(t=>{const ep=epicById(t.epicId);return `<label class="pickrow"><input type="checkbox" data-id="${t.id}" ${o.taskIds.includes(t.id)?"checked":""} style="width:auto"><div><div class="demand">${esc(t.demandId||"—")}${ep?` · ◆ ${esc(ep.code||ep.name)}`:""}</div><div>${esc(t.title)}</div></div></label>`;}).join("")}</div>`:`<p class="faint">No demands yet.</p>`}
    <div class="modal-foot"><button id="m-close" class="primary">Done</button></div></div></div>`;
  const toggle=(arr,id,on)=>on?(arr.includes(id)?arr:arr.concat(id)):arr.filter(x=>x!==id);
  root.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{o.taskIds=toggle(o.taskIds,cb.dataset.id,cb.checked);touch(o);});
  root.querySelectorAll("input[data-ep]").forEach(cb=>cb.onchange=()=>{o.epicIds=toggle(o.epicIds,cb.dataset.ep,cb.checked);touch(o);});
  const close=()=>{root.innerHTML="";onClose();};
  root.querySelector("#m-close").onclick=close;
  root.querySelector(".modal-bg").onclick=ev=>{if(ev.target===root.querySelector(".modal-bg"))close();};
}

