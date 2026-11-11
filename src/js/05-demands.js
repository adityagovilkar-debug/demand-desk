/* ===================== DEMANDS ===================== */
/* ===================== DEMAND LIST VIEW =====================
   One "view" decides what the list shows: grouping, sort order, statuses, field filters
   and "only …" toggles. It's edited in the ⚙ View panel, summed up as removable chips
   above the list, and can be saved as named one-click views. Per viewer (localStorage),
   never in the data file. */
const DV_GROUPS={none:"No grouping",epic:"Epic",wave:"Epic wave",status:"Status",system:"System",project:"Project",theme:"Theme",requestor:"Requestor",type:"Demand type",due:"Due date",next:"Next action",builder:"Built by",ticket:"Ticket"};
const DV_SORTS={due:{label:"Due date",dir:"asc"},next:{label:"Next action",dir:"asc"},received:{label:"Received",dir:"desc"},updated:{label:"Last updated",dir:"desc"},
  age:{label:"Age",dir:"desc"},waiting:{label:"Time waiting",dir:"desc"},status:{label:"Status",dir:"asc"},clash:{label:"Object clashes",dir:"desc"},
  demand:{label:"Demand ID",dir:"asc"},title:{label:"Title",dir:"asc"}};
const DV_ONLY={delegated:"Built by someone in my team",overdue:"Overdue",due7:"Overdue or due within 7 days",waiting:"Waiting on someone",clash:"With object clashes",notprod:"Transports not yet in Prod",next:"Next action due"};
const DV_FIELDS={builder:"Built by",epic:"Epic",system:"System",project:"Project",theme:"Theme",requestor:"Requestor",type:"Type"};
const STATUS_ORDER=Object.keys(STATUS),STATUS_RANK={bug:0,progress:1,open:2,delivered:3,closed:4};
const DV_PRESETS=[
  {name:"My active",view:{group:"epic",sort:"due",status:["open","progress","bug"]}},
  {name:"Go-live",view:{group:"system",sort:"due",only:["notprod"]}},
  {name:"Waiting",view:{group:"none",sort:"waiting",dir:"desc",only:["waiting"]}},
  {name:"Clashes",view:{group:"none",sort:"clash",dir:"desc",only:["clash"]}},
  {name:"Everything",view:{group:"none",sort:"updated",dir:"desc"}}];
let dvQuery=""; /* the quick text filter is deliberately not part of a saved view */
function dvBlank(){return{group:"none",sort:"due",dir:"asc",status:[],hideClosed:false,hideDelivered:false,only:[],f:{}};}
/* normalised + canonically ordered, so two views compare equal as JSON */
function dvNorm(v){v=(v&&typeof v==="object")?v:{};const f={};
  Object.keys(DV_FIELDS).forEach(k=>{if(v.f&&v.f[k])f[k]=String(v.f[k]);});
  return{group:DV_GROUPS[v.group]?v.group:"none",sort:DV_SORTS[v.sort]?v.sort:"due",
    dir:v.dir==="desc"||(v.dir!=="asc"&&DV_SORTS[v.sort]&&DV_SORTS[v.sort].dir==="desc")?"desc":"asc",
    status:STATUS_ORDER.filter(s=>Array.isArray(v.status)&&v.status.includes(s)),
    hideClosed:!!v.hideClosed,hideDelivered:!!v.hideDelivered,
    only:Object.keys(DV_ONLY).filter(k=>Array.isArray(v.only)&&v.only.includes(k)),f};}
function dvGet(){let v=null;try{v=JSON.parse(viewPref("view","null"));}catch(e){}
  return dvNorm(v||{group:groupByEpic()?"epic":"none"}); /* first run keeps the old group-by-epic choice */}
function dvSet(v){setViewPref("view",JSON.stringify(dvNorm(v)));}
function dvSame(a,b){return JSON.stringify(dvNorm(a))===JSON.stringify(dvNorm(b));}
function dvSaved(){let a=null;try{a=JSON.parse(viewPref("savedViews","null"));}catch(e){}
  if(!Array.isArray(a))a=DV_PRESETS.map(p=>({name:p.name,view:p.view}));
  let fresh=false;
  const out=a.filter(x=>x&&x.name).map(x=>{if(!x.id)fresh=true;return {id:x.id||uid(),name:String(x.name),view:dvNorm(x.view)};});
  if(fresh)dvSetSaved(out); /* ids must be stable, or a chip click can't find its view */
  return out;}
function dvSetSaved(a){setViewPref("savedViews",JSON.stringify(a.map(x=>({id:x.id,name:x.name,view:dvNorm(x.view)}))));}
function dvSaveCurrent(){const v=dvGet(),saved=dvSaved();
  const name=(prompt("Name this view — it becomes a one-click chip above the list:","")||"").trim();if(!name)return false;
  const ex=saved.find(s=>s.name.toLowerCase()===name.toLowerCase());
  if(ex){if(!confirm(`Replace the saved view “${ex.name}” with the current settings?`))return false;ex.view=v;}
  else saved.push({id:uid(),name,view:v});
  dvSetSaved(saved);toast(`Saved view “${name}”`);return true;}

function dvMatches(v,cidx){
  const today=todayStr(),words=dvQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),f=v.f;
  return t=>{
    if(v.status.length){if(!v.status.includes(t.status))return false;}
    else if((v.hideClosed&&t.status==="closed")||(v.hideDelivered&&t.status==="delivered"))return false;
    if(f.builder&&(f.builder==="__none"?(t.builders||[]).length>0:!(t.builders||[]).includes(f.builder)))return false;
    if(f.epic&&(f.epic==="__none"?!!epicById(t.epicId):t.epicId!==f.epic))return false;
    if(f.system&&t.system!==f.system)return false;
    if(f.project&&t.project!==f.project)return false;
    if(f.theme&&t.theme!==f.theme)return false;
    if(f.requestor&&t.requestor!==f.requestor)return false;
    if(f.type&&t.type!==f.type)return false;
    for(const k of v.only){
      if(k==="overdue"){const d=earliestOpenDue(t);if(!(d&&d<today))return false;}
      else if(k==="waiting"){if(!isWaiting(t))return false;}
      else if(k==="clash"){if(!openClashCount(t,cidx))return false;}
      else if(k==="notprod"){if(t.status==="closed"||!golivePending(t))return false;}
      else if(k==="next"){if(!nextActionDue(t))return false;}
      else if(k==="delegated"){if(!buildersOf(t).length)return false;}
      else if(k==="due7"){const d=earliestOpenDue(t);if(!(d&&daysUntil(d)<=7))return false;}}
    if(words.length){const e=epicById(t.epicId);
      const blob=[t.demandId,t.title,t.requestor,builderNames(t),t.project,t.theme,t.wave,t.system,t.client,t.type,e?epicLabel(e):"",
        ...t.objects.map(o=>o.name),...t.transports.map(tr=>tr.number),...(t.tocs||[]).map(c=>c.number)].join(" ").toLowerCase();
      if(!words.every(w=>blob.includes(w)))return false;}
    return true;};
}
function dvSortVal(t,k,cidx){
  switch(k){
    case "due":return earliestOpenDue(t)||null;
    case "next":return (t.nextAction&&t.nextAction.date&&t.status!=="closed")?t.nextAction.date:null;
    case "received":return t.receivedDate||null;
    case "updated":return t.updatedAt||0;
    case "age":return t.receivedDate?-daysUntil(t.receivedDate):Math.floor((Date.now()-t.createdAt)/86400000);
    case "waiting":return isWaiting(t)?(waitDays(t)??0):null;
    case "status":return STATUS_RANK[t.status];
    case "clash":return openClashCount(t,cidx)||null;
    case "demand":return (t.demandId||"").toLowerCase()||null;
    default:return (t.title||"").toLowerCase();}
}
function dvSort(list,v,cidx){const m=v.dir==="desc"?-1:1,val=new Map(list.map(t=>[t,dvSortVal(t,v.sort,cidx)]));
  return list.sort((a,b)=>{const x=val.get(a),y=val.get(b);
    if(x==null)return y==null?0:1; /* empty values always last, whichever direction */
    if(y==null)return -1;
    const c=typeof x==="number"&&typeof y==="number"?x-y:String(x).localeCompare(String(y),undefined,{numeric:true});
    return c*m||(earliestOpenDue(a)||"9999").localeCompare(earliestOpenDue(b)||"9999");});}
/* which block a demand falls into for the chosen grouping */
function dvGroupOf(t,g){
  const none=label=>({k:"",label:`<span class="faint">${label}</span>`,rank:9});
  switch(g){
    case "epic":{const e=epicById(t.epicId);
      return e?{k:e.id,label:`◆ ${e.code?`<b>${esc(e.code)}</b> · `:""}${esc(e.name)}`,rank:EPIC_GROUP_RANK[e.status],sl:epicLabel(e),epic:e}:none("No epic");}
    case "wave":{const e=epicById(t.epicId);if(!e)return none("No epic");
      const first=tasksForEpic(e.id).filter(x=>(x.wave||"")===(t.wave||"")).map(x=>x.receivedDate||"9999").sort()[0];
      return{k:e.id+"|"+(t.wave||""),label:`◆ ${esc(e.code||e.name)} · ${t.wave?`<b>${esc(t.wave)}</b>`:"no wave"}${waveTarget(e,t.wave)?` <span class="faint">🎯 ${waveTarget(e,t.wave)}</span>`:""}`,
        rank:EPIC_GROUP_RANK[e.status],sl:epicLabel(e)+"|"+first};}
    case "status":return{k:t.status,label:`<span class="pill ${STATUS[t.status].cls}">${STATUS[t.status].label}</span>`,rank:STATUS_RANK[t.status]};
    case "system":{if(!t.system)return none("No system");const m=tierMeta(t.system);
      return{k:t.system,label:`<b class="mono">${esc(t.system)}</b>${m?` <span class="faint">${m.label}</span>`:""}`,rank:0,sl:t.system};}
    case "due":{const d=earliestOpenDue(t);if(!d)return{k:"none",label:`<span class="faint">No due date</span>`,rank:4};const n=daysUntil(d);
      return n<0?{k:"over",label:`<span style="color:var(--red)">⚑ Overdue</span>`,rank:0}:n<=7?{k:"week",label:"Due within 7 days",rank:1}
        :n<=30?{k:"month",label:"Due within 30 days",rank:2}:{k:"later",label:"Due later",rank:3};}
    case "builder":{const b=buildersOf(t);if(!b.length)return{k:"",label:`<span class="faint">👷 You</span>`,rank:9};
      return{k:b.map(p=>p.id).sort().join("|"),label:`👷 <b>${esc(b.map(p=>p.name).join(", "))}</b>`,rank:0,sl:b.map(p=>p.name).join(", ")};}
    case "ticket":{if(!t.demandId)return none("No ticket ID");const n=demandIdCounts().get(t.demandId)||0;
      if(n<2)return{k:"__single",label:`<span class="faint">One demand per ticket</span>`,rank:5};const r=ticketRollup(t.demandId);
      return{k:t.demandId,label:`🎫 <b class="mono">${esc(t.demandId)}</b> · ${n} demands <span class="faint">· ${efFh(Math.round(r.h*10)/10)} h · ${r.there}/${r.trs} TRs there</span>`,rank:0,sl:t.demandId};}
    case "next":{const n=t.nextAction;if(!n||!n.date||t.status==="closed")return{k:"none",label:`<span class="faint">No next action</span>`,rank:3};
      return n.date<=todayStr()?{k:"due",label:`<span style="color:var(--amber)">⏰ Next action due</span>`,rank:0}
        :daysUntil(n.date)<=7?{k:"week",label:"⏰ Within 7 days",rank:1}:{k:"later",label:"⏰ Later",rank:2};}
    default:{const val=t[g];return val?{k:val,label:esc(val),rank:0,sl:val}:none("No "+DV_GROUPS[g].toLowerCase());}
  }
}
function dvCollapsed(key){try{return new Set(JSON.parse(viewPref(key,"[]")));}catch(e){return new Set();}}
/* the one-line summary of the view, as chips: click to change, ✕ to remove */
function dvChipList(v){const c=[];
  c.push({t:`▦ ${v.group==="none"?"Not grouped":"Group: "+DV_GROUPS[v.group]}`,open:1,rm:v.group!=="none"?x=>{x.group="none";}:null});
  c.push({t:`↕ ${DV_SORTS[v.sort].label} ${v.dir==="asc"?"↑":"↓"}`,flip:1});
  if(v.status.length)c.push({t:"Status: "+v.status.map(s=>STATUS[s].label).join(", "),rm:x=>{x.status=[];}});
  else{if(v.hideClosed)c.push({t:"Closed hidden",rm:x=>{x.hideClosed=false;}});
    if(v.hideDelivered)c.push({t:"Delivered hidden",rm:x=>{x.hideDelivered=false;}});}
  Object.entries(v.f).forEach(([k,val])=>{const e=k==="epic"&&val!=="__none"?epicById(val):null,p=k==="builder"&&val!=="__none"?personById(val):null;
    c.push({t:`${DV_FIELDS[k]}: ${k==="epic"?(val==="__none"?"none":(e?epicLabel(e):"?")):k==="builder"?(val==="__none"?"me":(p?p.name:"?")):val}`,rm:x=>{delete x.f[k];}});});
  v.only.forEach(k=>c.push({t:"Only: "+DV_ONLY[k].toLowerCase(),rm:x=>{x.only=x.only.filter(y=>y!==k);}}));
  return c;}
function dvFilterCount(v){return dvChipList(v).length-2;}
function renderDemandSidebar(){
  {const v=dvGet();if(v.f.epic&&v.f.epic!=="__none"&&!epicById(v.f.epic)){delete v.f.epic;dvSet(v);} /* epic deleted since */
   if(v.f.builder&&v.f.builder!=="__none"&&!personById(v.f.builder)){delete v.f.builder;dvSet(v);}}
  const v=dvGet(),saved=dvSaved(),n=dvFilterCount(v),cur=saved.find(s=>dvSame(s.view,v)),cidxV=benchOn()?clashIndex():null;
  document.getElementById("side").innerHTML=`
    <div class="side-tools">
      <div class="dvviews">${saved.map(s=>`<button class="dvview ${cur&&cur.id===s.id?"on":""}" data-id="${s.id}" title="Apply this saved view">${esc(s.name)}${benchOn()?`<b class="dvc">${state.tasks.filter(dvMatches(s.view,cidxV)).length}</b>`:""}</button>`).join("")}${cur?"":`<button class="dvview save" id="dvSave" title="Save the current grouping, sort and filters as a one-click view">★ Save view</button>`}</div>
      <div class="dvbar"><div class="dvq"><input id="dvQ" placeholder="Filter: ID, title, object, TR…" value="${esc(dvQuery)}" autocomplete="off"><button class="ghost sm ${dvQuery?"":"hide"}" id="dvQx" title="Clear">✕</button></div>
        <div class="lbmode" title="List, or a board by status"><button id="mList" class="${demandsMode()==="list"?"on":""}" title="List — with the demand beside it"><svg viewBox="0 0 16 16"><path d="M2 4h12M2 8h12M2 12h12"/></svg></button><button id="mBoard" class="${demandsMode()==="board"?"on":""}" title="Board — drag a card to change its status"><svg viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="3.5" height="11"/><rect x="6.25" y="2.5" width="3.5" height="7"/><rect x="11" y="2.5" width="3.5" height="9"/></svg></button></div>
        <button class="sm" id="dvOpen" title="Group, sort and filter the list">⚙ View${n?`<b class="dvn">${n}</b>`:""}</button></div>
      <div class="dvchips" id="dvChips"></div>
      <div class="filters">
        <button class="sm" id="btnPortfolio" title="Project / theme overview" style="flex:1">▦ Portfolio</button>
        <button class="sm" id="btnObjIdx" title="Object cross-reference index" style="flex:1">⌕ Objects</button>
        <button class="sm" id="btnAging" title="Time-in-status &amp; delivery lead times" style="flex:1">📈 Aging</button>
      </div>
      <button class="primary" id="btnNew" style="width:100%">＋ New Demand / Task</button>
    </div>
    <div class="stats" id="stats"></div>
    <div class="listwrap" id="taskList"></div>
    <div id="boardHost"></div>`;
  document.getElementById("btnNew").onclick=()=>openTaskModal(null);
  {const ml=document.getElementById("mList"),mb=document.getElementById("mBoard");
   if(ml)ml.onclick=()=>{if(demandsMode()!=="list")setDemandsMode("list");};
   if(mb)mb.onclick=()=>{if(demandsMode()!=="board")setDemandsMode("board");};}
  document.getElementById("btnObjIdx").onclick=openObjectIndex;
  document.getElementById("btnPortfolio").onclick=openPortfolio;
  document.getElementById("btnAging").onclick=openAging;
  document.querySelectorAll(".dvview[data-id]").forEach(b=>b.onclick=()=>{const s=dvSaved().find(x=>x.id===b.dataset.id);if(s){dvSet(s.view);renderDemandSidebar();}});
  {const sv=document.getElementById("dvSave");if(sv)sv.onclick=()=>{if(dvSaveCurrent())renderDemandSidebar();};}
  document.getElementById("dvOpen").onclick=openViewPanel;
  const q=document.getElementById("dvQ"),qx=document.getElementById("dvQx");
  /* oninput only — the list updates as you type without redrawing the box under the cursor */
  q.oninput=()=>{dvQuery=q.value;qx.classList.toggle("hide",!dvQuery);renderStats();renderList();};
  q.onkeydown=e=>{if(e.key==="Escape"&&q.value){e.stopPropagation();q.value="";q.oninput();}};
  qx.onclick=()=>{q.value="";q.oninput();q.focus();};
  drawDvChips();renderStats();renderList();
}
function drawDvChips(){const host=document.getElementById("dvChips");if(!host)return;const cs=dvChipList(dvGet());
  host.innerHTML=cs.map((c,i)=>`<span class="dvchip ${c.open||c.flip?"act":""}" data-i="${i}" title="${c.open?"Change the grouping":c.flip?"Click to reverse the order":""}"><span class="tx">${esc(c.t)}</span>${c.rm?`<span class="x" title="Remove">✕</span>`:""}</span>`).join("")
    +(cs.length-2>1?`<a class="dvclear" id="dvClearAll">clear filters</a>`:"");
  host.querySelectorAll(".dvchip").forEach(el=>{const c=cs[+el.dataset.i];
    el.onclick=ev=>{const x=dvGet();
      if(ev.target.classList.contains("x")){c.rm(x);dvSet(x);renderDemandSidebar();}
      else if(c.open)openViewPanel();
      else if(c.flip){x.dir=x.dir==="asc"?"desc":"asc";dvSet(x);renderDemandSidebar();}};});
  const ca=host.querySelector("#dvClearAll");if(ca)ca.onclick=()=>{const x=dvGet();dvSet({group:x.group,sort:x.sort,dir:x.dir});renderDemandSidebar();};}
/* ⚙ View — a light panel over the list; every change applies at once so you see the effect */
function openViewPanel(){
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg popbg"><div class="dvpanel"></div></div>`;
  const bg=root.querySelector(".popbg"),panel=root.querySelector(".dvpanel");
  const close=()=>{root.innerHTML="";};
  bg.onclick=e=>{if(e.target===bg)close();};
  const place=()=>{const a=document.getElementById("dvOpen");if(!a||!panel.isConnected)return;const r=a.getBoundingClientRect();
    const w=Math.min(680,window.innerWidth-16),left=Math.max(8,Math.min(r.left-8,window.innerWidth-w-8));
    panel.style.width=w+"px";panel.style.left=Math.round(left)+"px";panel.style.top=Math.round(r.bottom+6)+"px";
    panel.style.maxHeight=Math.max(240,window.innerHeight-r.bottom-18)+"px";};
  const update=fn=>{const v=dvGet();fn(v);dvSet(v);renderDemandSidebar();draw();};
  const draw=()=>{const keep=panel.scrollTop,v=dvGet(),saved=dvSaved();
    const opt=(type,name,val,on,label)=>`<label class="dvopt"><input type="${type}" name="${name}" value="${esc(val)}" ${on?"checked":""}> ${label}</label>`;
    const vals={builder:[["__none","— me (not handed on) —"],...state.people.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>[p.id,"👷 "+p.name+(p.active?"":" (moved on)")])],
      epic:[["__none","— no epic —"],...state.epics.slice().sort((a,b)=>epicLabel(a).localeCompare(epicLabel(b))).map(e=>[e.id,"◆ "+epicLabel(e)])],
      system:distinctVals("system").map(x=>[x,x+(clientsUsedFor(x).length?" · "+clientsUsedFor(x).join("/"):"")]),
      project:distinctVals("project").map(x=>[x,x]),theme:distinctVals("theme").map(x=>[x,x]),
      requestor:distinctVals("requestor").map(x=>[x,x]),type:distinctVals("type").map(x=>[x,x])};
    const plural={builder:"builders",epic:"epics",system:"systems",project:"projects",theme:"themes",requestor:"requestors",type:"types"};
    panel.innerHTML=`<div class="dvcols">
      <div><h4>Group by</h4>${Object.entries(DV_GROUPS).map(([k,l])=>opt("radio","dvg",k,v.group===k,esc(l))).join("")}</div>
      <div><h4>Sort by</h4>${Object.entries(DV_SORTS).map(([k,s])=>opt("radio","dvs",k,v.sort===k,esc(s.label))).join("")}
        <div class="dvdir"><button class="sm ${v.dir==="asc"?"on":""}" data-dir="asc">↑ Ascending</button><button class="sm ${v.dir==="desc"?"on":""}" data-dir="desc">↓ Descending</button></div>
        <p class="faint" style="font-size:11px;margin:6px 0 0">Demands with no value (no due date, not waiting…) always go last.</p></div>
      <div><h4>Show</h4>
        <div class="dvsub">Statuses <span style="font-weight:400">— none ticked = all</span></div>
        <div class="statchips">${Object.entries(STATUS).map(([k,s])=>`<button class="statchip ${s.cls} ${v.status.includes(k)?"on":""}" data-st="${k}">${s.label}</button>`).join("")}</div>
        <div class="dvhide" style="${v.status.length?"opacity:.45":""}" title="${v.status.length?"Ignored while specific statuses are ticked":""}">${opt("checkbox","dvh","hideClosed",v.hideClosed,"Hide closed")}${opt("checkbox","dvh","hideDelivered",v.hideDelivered,"Hide delivered")}</div>
        <div class="dvsub">Only demands…</div>
        ${Object.entries(DV_ONLY).map(([k,l])=>opt("checkbox","dvo",k,v.only.includes(k),esc(l))).join("")}
        <div class="dvsub">Filter by</div>
        <div class="dvfilters">${Object.keys(DV_FIELDS).map(k=>`<select data-f="${k}" title="${DV_FIELDS[k]}"><option value="">All ${plural[k]}</option>${vals[k].map(([val,lab])=>`<option value="${esc(val)}" ${v.f[k]===val?"selected":""}>${esc(lab)}</option>`).join("")}</select>`).join("")}</div>
      </div></div>
      <div class="dvfoot">
        <div class="dvsaved"><span class="faint">Saved views:</span>${saved.length?saved.map((s,i)=>`<span class="dvsv" data-id="${s.id}"><span class="dvsv-n" title="Apply">${esc(s.name)}</span><button class="ghost sm sv-up" title="Move left" ${i?"":"disabled"}>←</button><button class="ghost sm sv-ren" title="Rename">✎</button><button class="ghost sm danger sv-del" title="Delete">✕</button></span>`).join(""):`<span class="faint">none yet</span>`}
          ${DV_PRESETS.some(p=>!saved.some(s=>s.name===p.name))?`<a class="dvclear" id="sv-restore" title="Add back any starter view you deleted">↺ starter views</a>`:""}</div>
        <button class="ghost" id="dv-reset" title="No grouping, due-date order, nothing filtered">Reset</button><span style="flex:1"></span>
        <button id="dv-save">★ Save as view…</button><button class="primary" id="dv-done">Done</button></div>`;
    panel.querySelectorAll('input[name="dvg"]').forEach(i=>i.onchange=()=>update(x=>{x.group=i.value;}));
    panel.querySelectorAll('input[name="dvs"]').forEach(i=>i.onchange=()=>update(x=>{x.sort=i.value;x.dir=DV_SORTS[i.value].dir;}));
    panel.querySelectorAll(".dvdir [data-dir]").forEach(b=>b.onclick=()=>update(x=>{x.dir=b.dataset.dir;}));
    panel.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>update(x=>{const s=b.dataset.st;x.status=x.status.includes(s)?x.status.filter(y=>y!==s):[...x.status,s];}));
    panel.querySelectorAll('input[name="dvh"]').forEach(i=>i.onchange=()=>update(x=>{x[i.value]=i.checked;}));
    panel.querySelectorAll('input[name="dvo"]').forEach(i=>i.onchange=()=>update(x=>{x.only=i.checked?[...x.only,i.value]:x.only.filter(y=>y!==i.value);}));
    panel.querySelectorAll("select[data-f]").forEach(s=>s.onchange=()=>update(x=>{if(s.value)x.f[s.dataset.f]=s.value;else delete x.f[s.dataset.f];}));
    panel.querySelector("#dv-reset").onclick=()=>update(x=>{Object.assign(x,dvBlank());});
    panel.querySelector("#dv-done").onclick=close;
    panel.querySelector("#dv-save").onclick=()=>{if(dvSaveCurrent()){renderDemandSidebar();draw();}};
    panel.querySelectorAll(".dvsv").forEach(el=>{const id=el.dataset.id;
      const edit=fn=>{const a=dvSaved(),i=a.findIndex(s=>s.id===id);if(i<0)return;if(fn(a,i)===false)return;dvSetSaved(a);renderDemandSidebar();draw();};
      el.querySelector(".dvsv-n").onclick=()=>{const s=dvSaved().find(x=>x.id===id);if(s){dvSet(s.view);renderDemandSidebar();draw();}};
      el.querySelector(".sv-up").onclick=()=>edit((a,i)=>{if(!i)return false;[a[i-1],a[i]]=[a[i],a[i-1]];});
      el.querySelector(".sv-ren").onclick=()=>edit((a,i)=>{const nm=(prompt("Rename view:",a[i].name)||"").trim();if(!nm)return false;a[i].name=nm;});
      el.querySelector(".sv-del").onclick=()=>edit((a,i)=>{if(!confirm(`Delete the saved view “${a[i].name}”?`))return false;a.splice(i,1);});});
    const rs=panel.querySelector("#sv-restore");if(rs)rs.onclick=()=>{const a=dvSaved();
      DV_PRESETS.forEach(p=>{if(!a.some(s=>s.name===p.name))a.push({id:uid(),name:p.name,view:dvNorm(p.view)});});dvSetSaved(a);renderDemandSidebar();draw();};
    panel.scrollTop=keep;place();
  };
  draw();
}
function renderStats(){const s={open:0,progress:0,delivered:0,bug:0,closed:0,overdue:0};
  state.tasks.forEach(t=>{s[t.status]=(s[t.status]||0)+1;const d=earliestOpenDue(t);if(d&&daysUntil(d)<0)s.overdue++;});
  const el=document.getElementById("stats");if(!el)return;
  const shown=state.tasks.filter(dvMatches(dvGet(),clashIndex())).length;
  el.innerHTML=`<div class="stat op"><b>${s.open+s.progress}</b>active</div><div class="stat ov"><b>${s.overdue}</b>overdue</div><div class="stat"><b>${s.bug}</b>bugs</div><div class="stat dl"><b>${s.delivered}</b>delivered</div>`
    +(shown!==state.tasks.length?`<div class="stat" title="Demands in this view, of ${state.tasks.length}"><b>${shown}</b>shown</div>`:"");}
/* Per-viewer list preferences (not work data, so they live in localStorage, not the JSON). */
function viewPref(k,def){try{const v=localStorage.getItem("demanddesk."+k);return v===null?def:v;}catch(e){return def;}}
function setViewPref(k,v){try{localStorage.setItem("demanddesk."+k,v);}catch(e){}}
function groupByEpic(){return viewPref("groupEpic","1")==="1";}
const EPIC_GROUP_RANK={active:0,onhold:1,delivered:2,closed:3};
function demandCard(t,grouped,cidx){if(benchOn())return demandCardBench(t,grouped,cidx);const st=STATUS[t.status],sub=countSubs(t.subtasks),due=earliestOpenDue(t),dc=dueClass(due,t.status);
    const lc=linkedCount(t.id);
    return `<div class="tcard s-${t.status} ${t.id===activeId?"active":""}" data-id="${t.id}">
      <div class="demand">${esc(t.demandId||"— no demand id —")}</div>
      <div class="ttitle">${esc(t.title)}</div>
      <div class="meta"><span class="pill ${st.cls}">${st.label}</span>
        ${t.system?sysPill(t.system,"",t.client):""}
        ${isWaiting(t)?`<span class="pill" style="color:var(--amber);border-color:var(--amber-line)">⏳ ${esc(t.waiting.on)}${waitDays(t)!=null?" "+waitDays(t)+"d":""}</span>`:""}
        ${(()=>{const ep=epicById(t.epicId);if(!ep)return "";if(grouped)return t.wave?`<span class="pill" style="color:var(--accent2);border-color:var(--violet-line)">${esc(t.wave)}</span>`:"";
          return `<span class="pill" style="color:var(--accent2);border-color:var(--violet-line)">◆ ${esc(ep.code||ep.name)}${t.wave?" · "+esc(t.wave):""}</span>`;})()}
        ${t.project?`<span class="pill" style="color:var(--accent2);border-color:var(--violet-line)">▦ ${esc(t.project)}</span>`:""}
        ${t.theme?`<span class="pill type">${esc(t.theme)}</span>`:`<span class="pill type">${esc(t.type)}</span>`}
        ${t.requestor?`<span class="faint">👤 ${esc(t.requestor)}</span>`:""}
        ${buildersOf(t).length?`<span class="bld-tag" title="Built by">👷 ${esc(builderNames(t))}</span>`:""}
        ${sub.n?`<span class="faint">☑ ${sub.done}/${sub.n}</span>`:""}
        ${lc?`<span class="lc-badge">🔗 ${lc}</span>`:""}
        ${(t.reference&&t.reference.length)?`<span class="lc-badge">🔑 ${t.reference.length}</span>`:""}
        ${reworkCount(t)?`<span class="lc-badge" style="color:var(--red)">↻ ${reworkCount(t)}</span>`:""}
        ${(()=>{const n=openClashCount(t,cidx);return n?`<span class="clashtag" title="${n} object(s) also in flight in another demand">⚠ ${n} clash</span>`:"";})()}
        ${t.nextAction&&t.nextAction.date&&t.status!=="closed"?`<span class="due ${nextActionDue(t)?"soon":""}" title="Next action${t.nextAction.note?": "+esc(t.nextAction.note):""}">⏰ ${t.nextAction.date.slice(5)}</span>`:""}
        ${due?`<span class="due ${dc}">⚑ ${due}${dc==="over"?" ("+(-daysUntil(due))+"d)":""}</span>`:""}</div></div>`;}
function renderList(){
  if(demandsMode()==="board"){renderBoard();return;}
  const el=document.getElementById("taskList");if(!el)return;
  const v=dvGet(),cidx=clashIndex();
  const list=dvSort(state.tasks.filter(dvMatches(v,cidx)),v,cidx);
  if(!list.length){el.innerHTML=state.tasks.length
    ?`<div class="empty">No demands match this view.<br><a id="dvNone" style="cursor:pointer">Clear the filters</a></div>`
    :`<div class="empty">No demands yet.<br>Click <b>＋ New Demand</b>.</div>`;
    const c=el.querySelector("#dvNone");if(c)c.onclick=()=>{dvQuery="";dvSet({group:v.group,sort:v.sort,dir:v.dir});renderDemandSidebar();};return;}
  if(v.group==="none"){el.innerHTML=list.map(t=>demandCard(t,false,cidx)).join("");}
  else{
    /* one collapsible block per group; the chosen sort order is kept inside each block */
    const groups=new Map();
    list.forEach(t=>{const g=dvGroupOf(t,v.group);if(!groups.has(g.k))groups.set(g.k,{...g,ts:[]});groups.get(g.k).ts.push(t);});
    const gs=[...groups.values()].sort((a,b)=>a.rank-b.rank||String(a.sl??a.label).localeCompare(String(b.sl??b.label),undefined,{numeric:true}));
    const ckey=v.group==="epic"?"epicCollapsed":"collapsed."+v.group; /* collapsed blocks remembered per grouping */
    const coll=dvCollapsed(ckey),act=state.tasks.find(t=>t.id===activeId),today=todayStr();
    el.innerHTML=gs.map(g=>{const gid=g.k||"__none",ts=g.ts;
      const shut=coll.has(gid)&&!(act&&ts.includes(act));
      const total=v.group==="epic"?(g.epic?tasksForEpic(g.epic.id).length:state.tasks.filter(t=>!epicById(t.epicId)).length):ts.length;
      const open=ts.filter(t=>!["delivered","closed"].includes(t.status)).length;
      const over=ts.filter(t=>{const d=earliestOpenDue(t);return d&&d<today;}).length;
      return `<div class="egroup ${shut?"shut":""}" data-g="${esc(gid)}">
        <div class="eghead" title="${shut?"Expand":"Collapse"}">
          <span class="egtw">${shut?"▶":"▼"}</span>
          <span class="egname">${g.label}</span>
          ${g.epic&&g.epic.status!=="active"?`<span class="pill ${EPIC_STATUS[g.epic.status].cls}" style="font-size:9px;padding:0 5px">${EPIC_STATUS[g.epic.status].label}</span>`:""}
          ${over&&v.group!=="due"?`<span class="lc-badge" style="color:var(--red)">⚑ ${over}</span>`:""}
          <span class="egcount" title="${ts.length} shown${total>ts.length?" of "+total+" in this epic":""}">${open&&open<ts.length?`${open} open · `:""}${ts.length}${total>ts.length?`<span class="faint">/${total}</span>`:""}</span>
          ${g.epic?`<button class="ghost sm eggo" data-e="${g.epic.id}" title="Open the epic">›</button>`:""}
        </div>
        ${shut?"":`<div class="egbody">${ts.map(t=>demandCard(t,v.group==="epic"&&!!g.epic,cidx)).join("")}</div>`}</div>`;}).join("");
    el.querySelectorAll(".eghead").forEach(h=>h.onclick=ev=>{
      if(ev.target.classList.contains("eggo")){view="epics";activeEpicId=ev.target.dataset.e;epicTab="overview";renderApp();return;}
      const gid=h.parentElement.dataset.g,c=dvCollapsed(ckey);if(c.has(gid))c.delete(gid);else c.add(gid);
      setViewPref(ckey,JSON.stringify([...c]));renderList();});
  }
  el.querySelectorAll(".tcard").forEach(c=>c.onclick=()=>{activeId=c.dataset.id;activeTab="overview";renderApp();});
}
function renderDetail(){
  const t=activeTask(),host=document.getElementById("detail");
  if(!benchOn()&&activeTab==="overview")activeTab="work";   /* Overview is a Bench tab; classic opens on Work */
  if(!t){host.innerHTML=nopick("Select a demand on the left,<br>or create a new one to begin.");if(benchOn())renderCtxRail();return;}
  const st=STATUS[t.status],sub=countSubs(t.subtasks),lc=linkedCount(t.id);
  host.innerHTML=benchOn()?demandHeadBench(t,sub,lc):`
    <div class="detail-head">
      <div class="dh-top"><div style="flex:1">
        <div class="dh-demand">${esc(t.demandId||"— no demand id —")}</div>
        <h1>${esc(t.title)}</h1>
        <div class="dh-dates"><span>Type: <b>${esc(t.type)}</b></span>${t.system?`<span>System: ${sysPill(t.system,"",t.client)}</span>`:""}${(()=>{const ep=epicById(t.epicId);return ep?`<span>Epic: <b class="ep-go" style="color:var(--accent2);cursor:pointer">◆ ${esc(epicLabel(ep))}</b>${t.wave?` · <b>${esc(t.wave)}</b>`:""}</span>`:"";})()}${t.project?`<span>Project: <b>▦ ${esc(t.project)}</b></span>`:""}${t.theme?`<span>Theme: <b>${esc(t.theme)}</b></span>`:""}${t.requestor?`<span>Requestor: <b>👤 ${esc(t.requestor)}</b></span>`:""}<span>Built by: <a class="bld-link" id="dh-build" title="Who's building it">👷 ${buildersOf(t).length?esc(builderNames(t)):"you"}</a></span><span>Received: <b class="mono">${t.receivedDate||"—"}</b></span><span>Due: <b class="mono due ${dueClass(t.dueDate,t.status)}">${t.dueDate||"—"}</b></span>${reworkCount(t)?`<span style="color:var(--red)">↻ ${reworkCount(t)} rework cycle(s)</span>`:""}</div>
        ${t.nextAction&&t.nextAction.date?`<div class="nextact ${nextActionDue(t)?"due":""}">⏰ Next action <b class="mono">${t.nextAction.date}</b>${(()=>{const n=daysUntil(t.nextAction.date);return n<0?` (${-n}d ago)`:n===0?" (today)":` (in ${n}d)`;})()}${t.nextAction.note?` — ${esc(t.nextAction.note)}`:""}
          <button class="ghost sm" id="na-done" title="Did it — note it in History and clear">✓ Done</button><button class="ghost sm" id="na-edit" title="Change date or text">✎</button></div>`:""}
        ${(()=>{const cl=taskClashes(t).filter(x=>x.open.length);if(!cl.length)return "";const x=cl[0],o=x.open[0],more=cl.reduce((n,y)=>n+y.open.length,0)-1;
          return `<div class="clashband"><canvas class="orbit"></canvas><span>⚠ <b class="mono">${esc(x.o.name)}</b> is also in flight in <a class="cb-go" data-id="${o.t.id}">${esc(demandLabel(o.t))}</a> <span class="clw">— ${esc(clashWhere(o))}${more>0?` · +${more} more`:""}</span></span><button class="sm ghost cb-obj">Objects ›</button></div>`;})()}
      </div>
      <div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end">
        ${benchOn()?statusSegHTML(t):`<select id="dh-status" class="pill ${st.cls} statsel" title="Change status — logged in History">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${k===t.status?"selected":""}>${v.label}</option>`).join("")}</select>`}
        ${isWaiting(t)?`<span class="pill" style="font-size:12px;color:var(--amber);border-color:var(--amber-line)">⏳ Waiting on ${esc(t.waiting.on)}${waitDays(t)!=null?" · "+waitDays(t)+"d":""}</span>`:""}
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="sm" id="btnNext" title="When should this demand come back up on Today?">⏰ Next action</button><button class="sm" id="dhWin" title="Note a win about this demand (W)">🏆 Win</button><button class="sm" id="btnSpec" title="Generate post-delivery technical spec">📄 Tech Spec</button><button class="sm" id="btnEditTask">✎ Edit</button><button class="sm danger" id="btnDelTask">🗑 Delete</button></div>
      </div></div>
      <div class="tabs">
        <button class="tab ${activeTab==="work"?"active":""}" data-tab="work">Work &amp; Subtasks<span class="count">${sub.n}</span></button>
        <button class="tab ${activeTab==="objects"?"active":""}" data-tab="objects">Objects<span class="count">${t.objects.length}</span>${(()=>{const n=openClashCount(t);return n?`<span class="clashtag" title="Object(s) also in flight in another demand">⚠ ${n}</span>`:"";})()}</button>
        <button class="tab ${activeTab==="transports"?"active":""}" data-tab="transports">Transports<span class="count">${t.transports.length}</span></button>
        <button class="tab ${activeTab==="reference"?"active":""}" data-tab="reference">Reference<span class="count">${(t.reference||[]).length}</span></button>
        <button class="tab ${activeTab==="calls"?"active":""}" data-tab="calls">Linked<span class="count">${lc}</span></button>
        <button class="tab ${activeTab==="images"?"active":""}" data-tab="images">Images<span class="count">${imagesFor("demand",t.id).length}</span></button>
        <button class="tab ${activeTab==="effort"?"active":""}" data-tab="effort">Effort<span class="count">${efFh(efSum(efFor(t.id)))} h</span></button>
        <button class="tab ${activeTab==="history"?"active":""}" data-tab="history">History<span class="count">${(t.timeline||[]).length}</span></button>
        <span class="tind"></span>
      </div>
    </div><div class="detail-body" id="detailBody"></div>`;
  const epGo=host.querySelector(".ep-go");if(epGo)epGo.onclick=()=>{view="epics";activeEpicId=t.epicId;renderApp();};
  host.querySelector("#btnSpec").onclick=()=>openTechSpec(t);
  host.querySelector("#btnEditTask").onclick=()=>openTaskModal(t);
  host.querySelector("#btnNext").onclick=()=>openNextAction(t);
  host.querySelector("#dhWin").onclick=()=>openWin({taskId:t.id});
  {const ct=host.querySelector("#cxToggle");if(ct)ct.onclick=()=>{setViewPref("ctxRail",ctxRailOn()?"0":"1");syncDemandsLayout();renderDetail();};
   const dc=host.querySelector("#dhClose");if(dc)dc.onclick=()=>document.querySelector("main").classList.remove("open");}
  {const b=host.querySelector("#dh-build");if(b)b.onclick=()=>openBuilders(t);}
  {const d=host.querySelector("#na-done");if(d)d.onclick=()=>nextActionDone(t);const ed=host.querySelector("#na-edit");if(ed)ed.onclick=()=>openNextAction(t);}
  {const ds=host.querySelector("#dh-status");if(ds)ds.onchange=ev=>setDemandStatus(t,ev.target.value,ds);
   host.querySelectorAll("#dh-seg button").forEach(b=>b.onclick=()=>setDemandStatus(t,b.dataset.s,b));
   const cg=host.querySelector(".cb-go");if(cg)cg.onclick=()=>{activeId=cg.dataset.id;activeTab="objects";renderApp();};
   host.querySelectorAll(".tk-go").forEach(a=>a.onclick=()=>{activeId=a.dataset.id;activeTab="overview";renderApp();});
   const co=host.querySelector(".cb-obj");if(co)co.onclick=()=>{activeTab="objects";renderDetail();enterPulse("detail");};
   const ob=host.querySelector(".clashband canvas");if(ob&&benchOn())DK.scope(ob,drawOrbit);
   const nt=host.querySelector(".natick");if(nt)DK.scope(nt,drawTick);}
  host.querySelector("#btnDelTask").onclick=()=>{if(confirm("Delete this demand and all its subtasks, objects, transports"+(efFor(t.id).length?" and the "+efFh(efSum(efFor(t.id)))+" h logged against it":"")+"?")){state.tasks=state.tasks.filter(x=>x.id!==t.id);state.efforts=state.efforts.filter(e=>e.taskId!==t.id);state.meetings.forEach(m=>m.taskIds=m.taskIds.filter(id=>id!==t.id));state.journal.forEach(j=>j.taskIds=(j.taskIds||[]).filter(id=>id!==t.id));state.debug.forEach(s=>{if(s.taskId===t.id)s.taskId="";});state.images.forEach(im=>im.links=im.links.filter(l=>!(l.kind==="demand"&&l.id===t.id)));activeId=null;markDirty();renderApp();}};
  host.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;renderDetail();enterPulse("detail");});
  const body=host.querySelector("#detailBody");
  if(activeTab==="overview")renderOverview(body,t);
  else if(activeTab==="work")(benchOn()?renderWorkBench:renderWork)(body,t);
  else if(activeTab==="objects")renderObjects(body,t);
  else if(activeTab==="transports")renderTransports(body,t);
  else if(activeTab==="reference")renderReference(body,t);
  else if(activeTab==="calls")renderLinkedItems(body,t);
  else if(activeTab==="images")renderImagesSection(body,"demand",t.id);
  else if(activeTab==="effort")renderEffortTab(body,t);
  else renderHistory(body,t);
  placeTabInd(host);
  if(benchOn())renderCtxRail();
}
function renderReference(body,t){
  const list=t.reference||(t.reference=[]);
  body.innerHTML=`<div class="sec-title"><h3>Reference — key facts &amp; artifacts</h3><div class="ln"></div><button class="sm" id="addRef">＋ Add entry</button></div>
    <p class="faint" style="font-size:12px;margin-top:-6px">URLs, endpoints, credentials, config you created for this demand. Mark sensitive values <b>secret</b> (masked + kept out of search); <b>pin</b> the important ones to show at the top of the Work tab.</p>
    <div class="tbl-wrap"><table>
      <thead><tr><th style="width:26%">Label</th><th>Value</th><th style="width:64px">Secret</th><th style="width:50px">Pin</th><th style="width:34px"></th></tr></thead>
      <tbody id="refBody"></tbody></table></div>`;
  body.querySelector("#addRef").onclick=()=>{list.push({id:uid(),label:"",value:"",secret:false,pinned:false});touch(t);draw();renderDetail();};
  const tb=body.querySelector("#refBody");
  const draw=()=>{
    tb.innerHTML=list.length?list.map(r=>{const rv=revealPw[r.id];
      return `<tr data-id="${r.id}">
        <td><input class="r-label" value="${esc(r.label)}" placeholder="e.g. API proxy URL"></td>
        <td>${r.secret
          ?`<div style="display:flex;gap:3px;align-items:center"><input class="mono r-val" type="${rv?"text":"password"}" value="${esc(r.value)}" style="flex:1"><button class="ghost sm r-eye" title="Show/hide">${rv?"🙈":"👁"}</button><button class="ghost sm r-copy" title="Copy">📋</button></div>`
          :`<div style="display:flex;gap:3px;align-items:center"><input class="mono r-val" value="${esc(r.value)}" placeholder="value" style="flex:1">${/^https?:\/\//i.test(r.value)?`<a class="ghost sm" href="${esc(r.value)}" target="_blank" rel="noopener" title="Open link" style="text-decoration:none;padding:3px 6px">🔗</a>`:""}<button class="ghost sm r-copy" title="Copy">📋</button></div>`}</td>
        <td style="text-align:center"><input type="checkbox" class="r-secret" ${r.secret?"checked":""} style="width:auto"></td>
        <td style="text-align:center"><button class="ghost sm r-pin" title="Pin to top of Work tab">${r.pinned?"📌":"📍"}</button></td>
        <td><button class="ghost sm danger r-del">🗑</button></td></tr>`;}).join("")
      :`<tr><td colspan="5" class="faint" style="padding:14px;text-align:center">No reference entries yet. Use “＋ Add entry”.</td></tr>`;
    tb.querySelectorAll("tr[data-id]").forEach(tr=>{const r=list.find(x=>x.id===tr.dataset.id);
      tr.querySelector(".r-label").onchange=e=>{r.label=e.target.value;touch(t);};
      tr.querySelector(".r-val").onchange=e=>{r.value=e.target.value;touch(t);};
      const eye=tr.querySelector(".r-eye");if(eye)eye.onclick=()=>{revealPw[r.id]=!revealPw[r.id];draw();};
      tr.querySelector(".r-copy").onclick=()=>{navigator.clipboard.writeText(r.value).then(()=>toast("Copied")).catch(()=>toast("Copy failed",true));};
      tr.querySelector(".r-secret").onchange=e=>{r.secret=e.target.checked;if(r.secret)revealPw[r.id]=false;touch(t);draw();};
      tr.querySelector(".r-pin").onclick=()=>{r.pinned=!r.pinned;touch(t);draw();};
      tr.querySelector(".r-del").onclick=()=>{const i=list.indexOf(r);if(i>-1)list.splice(i,1);delete revealPw[r.id];touch(t);renderDetail();};});
  };
  draw();
}
function renderHistory(body,t){
  const tl=(t.timeline||[]).slice().sort((a,b)=>b.ts-a.ts);
  const dd=deliveredDates(t);
  body.innerHTML=`<div class="sec-title"><h3>Delivery &amp; rework timeline</h3><div class="ln"></div><button class="sm" id="addEvt">＋ Add note</button></div>
    <div style="display:flex;gap:14px;margin-bottom:14px;font-size:12px;color:var(--muted)">
      <span>Rework cycles: <b style="color:${reworkCount(t)?"var(--red)":"var(--txt)"}">${reworkCount(t)}</b></span>
      <span>Requirement changes: <b style="color:${changeEvents(t).length?"var(--accent2)":"var(--txt)"}">${changeEvents(t).length}</b></span>
      <span>Delivered: <b>${dd.length?dd.join(", "):"—"}</b></span></div>
    <div id="tlList"></div>`;
  body.querySelector("#addEvt").onclick=()=>{const n=prompt("Timeline note (e.g. 'QA raised bug on PA0008'):");if(n){logTimeline(t,"note","","",n);touch(t);renderHistory(body,t);}};
  const host=body.querySelector("#tlList");
  if(!tl.length){host.innerHTML=`<div class="faint" style="font-size:12px">No history yet. Status changes are logged automatically.</div>`;return;}
  const bench=benchOn();let lastM="",idx=0;host.classList.toggle("btl",bench);
  host.innerHTML=tl.map(e=>{
    let mo="";if(bench){const m=new Date(e.ts).toLocaleDateString("en-GB",{month:"long",year:"numeric"});if(m!==lastM){lastM=m;mo=`<div class="btl-mo">${m}</div>`;}}
    const pen=e.type==="status"&&!isChange(e)?(STATUS_PEN[e.to]||"var(--faint)"):"var(--accent2)";
    let label;
    if(isChange(e)){const to=STATUS[e.to]?STATUS[e.to].label:e.to,r=1+changeEvents(t).filter(x=>x.ts<=e.ts).length;
      label=`<span class="pill" style="color:var(--accent2);border-color:var(--violet-line)">🔄 Requirement changed</span> <span class="faint">→ ${to} · round ${r}${e.est?" · +"+efFh(e.est)+" h estimate":""}</span>${e.note?" — "+esc(e.note):""}<a href="#" class="e-def" title="Count this as a defect in my work after all">it was a defect?</a>`;}
    else if(e.type==="status"){const to=STATUS[e.to]?STATUS[e.to].label:e.to;const fr=e.from?(STATUS[e.from]?STATUS[e.from].label:e.from):"created";
      const danger=e.to==="bug";label=`<span class="pill ${STATUS[e.to]?STATUS[e.to].cls:""}">${to}</span> <span class="faint">from ${fr}</span>${danger?' <span style="color:var(--red)">↻ rework</span><a href="#" class="e-chg" title="It was not a defect — the requirement changed. Stops counting it as rework.">not a defect? → requirement changed</a>':""}`;}
    else label=esc(e.note);
    return mo+`<div class="actitem" data-id="${e.id}" style="--pen:${pen}"><span class="du mono" style="flex:0 0 150px;font-size:11px;color:var(--muted)">${fmtTs(e.ts)}</span><span class="at" style="cursor:default">${label}</span><span class="nact"><button class="ghost sm danger e-del">🗑</button></span></div>`;
  }).join("");
  host.querySelectorAll(".actitem").forEach(row=>{row.querySelector(".e-del").onclick=()=>{t.timeline=t.timeline.filter(x=>x.id!==row.dataset.id);touch(t);renderHistory(body,t);renderDetail();};
    const ev=(t.timeline||[]).find(x=>x.id===row.dataset.id),ch=row.querySelector(".e-chg"),df=row.querySelector(".e-def");
    if(ch)ch.onclick=x=>{x.preventDefault();bugToChange(t,ev);renderApp();toast("🔄 Now a requirement change — no longer counted as rework");};
    if(df)df.onclick=x=>{x.preventDefault();changeToBug(t,ev);renderApp();toast("Counted as a defect — rework");};});
}
function nopick(msg){return `<div class="nopick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v16H4z"/><path d="M4 9h16M9 9v11"/></svg><div>${msg}</div></div>`;}

function renderWork(body,t){
  const pinned=(t.reference||[]).filter(r=>r.pinned);
  body.innerHTML=`
    ${pinned.length?`<div class="pinbox" id="pinBox"></div>`:""}
    <div class="grid2" style="margin-bottom:6px">
      <div class="field"><label>What is to be done</label><textarea id="fDesc" placeholder="Scope, requirement summary, acceptance criteria…">${esc(t.description)}</textarea></div>
      <div class="field"><label>Working notes / status log</label><textarea id="fNotes" placeholder="Running notes, blockers, who asked, decisions…">${esc(t.notes)}</textarea></div>
    </div>
    <div id="n-links" style="margin-bottom:12px">${linkChips((t.description||"")+" "+(t.notes||""))}</div>
    <div class="sec-title"><h3>Subtasks (branching)</h3><div class="ln"></div><button class="sm" id="addRoot">＋ Add subtask</button></div>
    <div class="tree" id="tree"></div>
    <div class="sec-title" style="margin-top:24px"><h3>Comments on this demand</h3><div class="ln"></div></div>
    <div id="taskCmts"></div>
    <div id="lsHost" style="margin-top:24px"></div>`;
  const updNL=()=>{body.querySelector("#n-links").innerHTML=linkChips((t.description||"")+" "+(t.notes||""));};
  body.querySelector("#fDesc").onchange=e=>{t.description=e.target.value;touch(t);updNL();};
  body.querySelector("#fNotes").onchange=e=>{t.notes=e.target.value;touch(t);updNL();};
  body.querySelector("#addRoot").onclick=()=>{t.subtasks.push(mkSub());touch(t);renderDetail();};
  renderTree(body.querySelector("#tree"),t,t.subtasks);
  renderComments(body.querySelector("#taskCmts"),t,()=>touch(t));
  if(pinned.length)drawPinned(body.querySelector("#pinBox"),t,pinned);
  renderLessons(body.querySelector("#lsHost"),t);
}
function drawPinned(host,t,pinned){
  host.innerHTML=`<div class="pin-title">📌 Key reference</div>`+pinned.map(r=>{const rv=revealPw[r.id];
    return `<div class="pin-row" data-id="${r.id}"><span class="pin-l">${esc(r.label)||"(label)"}</span>
      <span class="pin-v mono">${r.secret?(rv?esc(r.value):"••••••••"):linkify(r.value)}</span>
      ${r.secret?`<button class="ghost sm p-eye">${rv?"🙈":"👁"}</button>`:""}
      <button class="ghost sm p-copy" title="Copy">📋</button></div>`;}).join("");
  host.querySelectorAll(".pin-row").forEach(row=>{const r=pinned.find(x=>x.id===row.dataset.id);
    const eye=row.querySelector(".p-eye");if(eye)eye.onclick=()=>{revealPw[r.id]=!revealPw[r.id];drawPinned(host,t,pinned);};
    row.querySelector(".p-copy").onclick=()=>{navigator.clipboard.writeText(r.value).then(()=>toast("Copied")).catch(()=>toast("Copy failed",true));};});
}
function mkSub(){return{id:uid(),title:"New subtask",done:false,receivedDate:todayStr(),dueDate:"",collapsed:false,comments:[],children:[]};}
function renderTree(host,t,list,rr){
  rr=rr||renderDetail;
  if(!list.length){if(host.classList.contains("tree"))host.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">No subtasks. Use “＋ Add subtask”, then branch each into sub-subtasks with “＋”.</div>`;return;}
  host.innerHTML="";
  list.forEach(s=>{const node=document.createElement("div");node.className="node";const dc=dueClass(s.dueDate,s.done?"closed":"open");const kids=s.children.length>0;const cc=(s.comments||[]).length;
    node.innerHTML=`<div class="nrow ${s.done?"done":""}">
      <span class="twist">${kids?(s.collapsed?"▶":"▼"):"·"}</span>
      <span class="chk ${s.done?"done":""}">${s.done?"✓":""}</span>
      <span class="nm">${esc(s.title)||"<span class='faint'>(click to name)</span>"}</span>
      <span class="ndates"><span title="Received">⇩ <input type="date" value="${s.receivedDate}" class="d-rec" style="width:130px;font-size:11px"></span><span title="Due">⚑ <input type="date" value="${s.dueDate}" class="d-due ${dc}" style="width:130px;font-size:11px"></span></span>
      <span class="nact"><button class="ghost sm a-cmt" title="Comments">💬${cc?`<span style="font-size:10px">${cc}</span>`:""}</button><button class="ghost sm a-add" title="Add sub-subtask">＋</button><button class="ghost sm danger a-del" title="Delete">🗑</button></span></div>
      <div class="children ${s.collapsed?"hide":""}"></div>`;
    const row=node.querySelector(".nrow");
    row.querySelector(".twist").onclick=()=>{if(kids){s.collapsed=!s.collapsed;touch(t);rr();}};
    row.querySelector(".chk").onclick=()=>{s.done=!s.done;touch(t);rr();};
    const nm=row.querySelector(".nm");nm.onclick=()=>editInline(nm,s.title,v=>{s.title=v;touch(t);rr();});
    row.querySelector(".d-rec").onchange=e=>{s.receivedDate=e.target.value;touch(t);};
    row.querySelector(".d-due").onchange=e=>{s.dueDate=e.target.value;touch(t);rr();};
    row.querySelector(".a-cmt").onclick=()=>openSubCommentsModal(t,s,rr);
    row.querySelector(".a-add").onclick=()=>{s.children.push(mkSub());s.collapsed=false;touch(t);rr();};
    row.querySelector(".a-del").onclick=()=>{const n=countSubs(s.children).n,c=(s.comments||[]).length;
      if((n||c)&&!confirm(`Delete “${s.title||"subtask"}”${n?` and the ${n} subtask(s) under it`:""}${c?` (${c} comment(s))`:""}?`))return;
      const r=findSub(t.subtasks,s.id);if(r){r.parent.splice(r.parent.indexOf(s),1);touch(t);rr();}};
    if(kids&&!s.collapsed)renderTree(node.querySelector(".children"),t,s.children,rr);
    host.appendChild(node);});
}
function editInline(span,val,cb){const inp=document.createElement("input");inp.value=val;inp.style.width="100%";span.replaceWith(inp);inp.focus();inp.select();const done=()=>cb(inp.value.trim());inp.onblur=done;inp.onkeydown=e=>{if(e.key==="Enter")inp.blur();if(e.key==="Escape"){e.stopPropagation();inp.value=val;inp.blur();}};}

function fmtTs(ts){const d=new Date(ts),y=d.getFullYear()!==new Date().getFullYear();return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",...(y?{year:"numeric"}:{})})+" · "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});}
function renderComments(host,owner,onChange){
  const list=owner.comments||(owner.comments=[]);
  host.innerHTML=`<div class="cmts">${list.length?list.map(c=>`<div class="cmt" data-id="${c.id}"><div class="cmt-meta"><span>${fmtTs(c.ts)}</span><button class="ghost sm c-del" title="Delete">🗑</button></div><div class="cmt-text">${linkify(c.text)}</div></div>`).join(""):`<div class="faint" style="font-size:12px">No comments yet.</div>`}</div>
    <div class="cmt-add"><textarea placeholder="Add a comment… (Ctrl+Enter to post)" rows="2"></textarea><button class="primary sm c-post">Post</button></div>`;
  const ta=host.querySelector(".cmt-add textarea");
  const post=()=>{const v=ta.value.trim();if(!v)return;list.push({id:uid(),text:v,ts:Date.now()});ta.value="";onChange();renderComments(host,owner,onChange);};
  host.querySelector(".c-post").onclick=post;
  ta.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")post();};
  host.querySelectorAll(".cmt").forEach(el=>{const c=list.find(x=>x.id===el.dataset.id);
    el.querySelector(".c-del").onclick=()=>{if(confirm("Delete this comment?")){list.splice(list.indexOf(c),1);onChange();renderComments(host,owner,onChange);}};
    const txt=el.querySelector(".cmt-text");txt.onclick=e=>{if(e.target.tagName==="A")return;editInline(txt,c.text,v=>{if(v){c.text=v;}onChange();renderComments(host,owner,onChange);});};});
}
function openSubCommentsModal(t,s,rr){
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>💬 Comments — ${esc(s.title)}</h2><div id="subC"></div><div class="modal-foot"><button id="m-close" class="primary">Done</button></div></div></div>`;
  renderComments(root.querySelector("#subC"),s,()=>touch(t));
  const close=()=>{root.innerHTML="";(rr||renderDetail)();};
  root.querySelector("#m-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
}

function renderObjects(body,t){
  body.innerHTML=`<div class="sec-title"><h3>Objects touched / modified</h3><div class="ln"></div><button class="sm" id="objTypes" title="Add or remove object types in the dropdown">⚙ Types</button><button class="sm" id="addObj">＋ Add object</button></div>
    <div class="tbl-wrap"><table><thead><tr><th style="width:22%">Object name</th><th style="width:16%">Type</th><th style="width:11%">Action</th><th>What was done</th><th style="width:16%">In transport(s)</th><th style="width:34px"></th></tr></thead><tbody id="objBody"></tbody></table></div>
    <p class="faint" style="font-size:12px">“In transport(s)” is derived from the Transports tab — tick objects on each TR there. The top search finds which demand touched a given object months later.</p>`;
  const tb=body.querySelector("#objBody");
  /* the warning line under an object: every other demand where it's also in flight */
  const drawClash=(o,idx)=>{const row=tb.querySelector(`tr.clashrow[data-for="${o.id}"]`);if(!row)return 0;
    const c=clashesFor(t,o,idx);row.classList.toggle("hide",!c.length);
    row.firstElementChild.innerHTML=c.map(x=>`<div class="clash ${x.ack?"ack":""}">⚠ <b class="mono">${esc(o.name)}</b> is also in flight in <a class="cl-go" data-id="${x.t.id}">${esc(demandLabel(x.t))}</a> <span>— ${esc(clashWhere(x))}</span>
      <button class="ghost sm cl-ack" data-id="${x.t.id}" title="${x.ack?"Flag this pair again":"You've agreed the order with the other demand — stop flagging this pair (on Today, the list and the run sheet)"}">${x.ack?"↺ Warn again":"✓ Sequenced — stop warning"}</button></div>`).join("");
    row.querySelectorAll(".cl-go").forEach(a=>a.onclick=()=>{activeId=a.dataset.id;activeTab="objects";renderApp();});
    row.querySelectorAll(".cl-ack").forEach(b=>b.onclick=()=>{const x=c.find(y=>y.t.id===b.dataset.id);setClashAck(t,o,x.t,!x.ack);renderDetail();});
    return c.filter(x=>!x.ack).length;};
  const draw=()=>{tb.innerHTML=t.objects.length?t.objects.map(o=>{const trs=trsForObject(t,o.id);return `<tr data-id="${o.id}">
    <td><input class="mono o-name" value="${esc(o.name)}" placeholder="ZRPS_..."></td>
    <td><select class="o-type">${objTypeOptions(o.type)}</select></td>
    <td><select class="o-act">${OBJ_ACTIONS.map(x=>`<option ${x===o.action?"selected":""}>${x}</option>`).join("")}</select></td>
    <td><textarea class="o-desc" placeholder="Describe the change…">${esc(o.desc)}</textarea></td>
    <td class="mono" style="font-size:11px;color:var(--muted)">${trs.length?trs.map(tr=>esc(tr.number||"(unnumbered)")).join(", "):"—"}</td>
    <td><button class="ghost sm danger o-del">🗑</button></td></tr><tr class="clashrow hide" data-for="${o.id}"><td colspan="6"></td></tr>`;}).join(""):`<tr><td colspan="6" class="faint" style="padding:14px;text-align:center">No objects logged yet.</td></tr>`;
    tb.querySelectorAll("tr[data-id]").forEach(tr=>{const o=t.objects.find(x=>x.id===tr.dataset.id);
      tr.querySelector(".o-name").onchange=e=>{o.name=e.target.value;touch(t);
        if(drawClash(o))toast(`⚠ ${o.name.trim()} is already in flight in another demand — see the warning under it`,true);};
      tr.querySelector(".o-type").onchange=e=>{o.type=e.target.value;touch(t);};
      tr.querySelector(".o-act").onchange=e=>{o.action=e.target.value;touch(t);drawClash(o);};
      tr.querySelector(".o-desc").onchange=e=>{o.desc=e.target.value;touch(t);};
      tr.querySelector(".o-del").onclick=()=>{if(o.name&&!confirm(`Remove ${o.name} from this demand's objects?`))return;t.objects=t.objects.filter(x=>x.id!==o.id);t.transports.forEach(x=>{if(x.objectIds)x.objectIds=x.objectIds.filter(id=>id!==o.id);});touch(t);draw();renderDetail();};});
    const idx=clashIndex();t.objects.forEach(o=>drawClash(o,idx));};
  body.querySelector("#objTypes").onclick=()=>openObjTypes(()=>{draw();});
  body.querySelector("#addObj").onclick=()=>{t.objects.push({id:uid(),name:"",type:objTypes()[0],action:"Modified",desc:"",ackClash:[]});touch(t);draw();};
  draw();
}
function openObjPicker(t,tr,cb){
  tr.objectIds=tr.objectIds||[];
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:440px"><h2>Objects in ${esc(tr.number||"this TR")}</h2>
    ${t.objects.length?`<div class="picklist">${t.objects.map(o=>`<label class="pickrow"><input type="checkbox" data-id="${o.id}" ${tr.objectIds.includes(o.id)?"checked":""} style="width:auto"><div><div class="mono">${esc(o.name||"(unnamed)")}</div><div class="faint" style="font-size:11px">${esc(o.type)} · ${esc(o.action)}</div></div></label>`).join("")}</div>`:`<p class="faint">No objects on this demand yet — add them on the Objects tab first.</p>`}
    <div class="modal-foot"><button id="op-close" class="primary">Done</button></div></div></div>`;
  const close=()=>{root.innerHTML="";cb&&cb();};
  root.querySelectorAll("input[data-id]").forEach(c=>c.onchange=()=>{if(c.checked){if(!tr.objectIds.includes(c.dataset.id))tr.objectIds.push(c.dataset.id);}else tr.objectIds=tr.objectIds.filter(id=>id!==c.dataset.id);touch(t);});
  root.querySelector("#op-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
}

function renderTransports(body,t){
  /* Bench: the transport map opens a transport's card for editing */
  const pickTr=id=>{trOpen.add(id);drawTrs();const c=body.querySelector(`.trcard[data-trid="${id}"]`);if(c){c.scrollIntoView({block:"center",behavior:motionOn()?"smooth":"auto"});c.classList.remove("pulse");void c.offsetWidth;c.classList.add("pulse");}};
  body.innerHTML=`<div id="readiness"></div><div id="trMap"></div>
    <div class="sec-title"><h3>Transport requests</h3><div class="ln"></div><button class="sm" id="runSheet" title="The import request for Basis: what's left to import into a system, in order">📋 Run sheet</button><button class="sm" id="expTr" title="Export all transports across all demands to CSV">⬇ CSV</button><button class="sm" id="addTr">＋ Add transport</button></div>
    <p class="faint" style="font-size:12px;margin:-4px 0 10px">Order = release order (use ↑↓). Add a sync target for each system a TR was imported to. If a TR is bundled in a <b>Transport of Copies</b>, its downstream systems are inherited from the ToC. Mark client-dependent config as <b>Customizing</b> to record its client (e.g. H13 / 150); <b>Workbench</b> TRs are client-independent.</p>
    <div id="trList"></div>
    <div class="sec-title" style="margin-top:22px"><h3>Transports of Copies (ToC)</h3><div class="ln"></div><button class="sm" id="addToc">＋ New ToC</button></div>
    <div id="tocList"></div>`;
  body.querySelector("#expTr").onclick=exportTransportsCSV;
  body.querySelector("#runSheet").onclick=()=>openRunSheet([t],`${t.demandId?t.demandId+" — ":""}${t.title}`,goliveTargetFor(t));
  body.querySelector("#addTr").onclick=()=>{const sg=trDescSuggest(t);if(sg)toast("Description suggested from your naming pattern — edit it if it's not right");t.transports.push({id:uid(),number:"",desc:sg,system:t.system||state.settings.defaultSystem,released:false,kind:"workbench",client:"",syncs:[],tocId:"",toc:"",objectIds:[],dest:[],notes:"",addedOn:todayStr(),releasedOn:""});touch(t);renderTransports(body,t);renderDetail();};
  body.querySelector("#addToc").onclick=()=>{(t.tocs=t.tocs||[]).push(normToc({system:state.settings.defaultSystem}));touch(t);renderTransports(body,t);};
  drawReadiness();drawTrs();drawTocs();

  function drawReadiness(){
    const host=body.querySelector("#readiness");
    if(!t.transports.length){host.innerHTML="";return;}
    const target=goliveTargetFor(t),routed=t.transports.filter(tr=>trTargets(t,tr).length),missing=routed.filter(tr=>!trComplete(t,tr));
    const own=t.transports.filter(tr=>trDest(t,tr).length).length,ok=routed.length&&!missing.length;
    const frozen=[...new Set(missing.flatMap(m=>trMissing(t,m)))].map(x=>[x,freezeFor(x)]).filter(x=>x[1]);
    host.innerHTML=`<div class="readybar ${routed.length?(ok?"ok":"warn"):""}">
      <span>Go-live target</span>
      <select id="rdy-sys" style="width:auto" title="Where transports go when they have no destinations of their own">${systemOptions(target)}</select>
      ${own?`<span class="faint" style="font-size:12px">· ${own} transport(s) have their own destinations</span>`:""}
      ${routed.length?(ok
        ?`<b style="color:var(--green)">✓ all ${routed.length} transport(s) have reached their destinations</b>`
        :`<b style="color:var(--amber)">⚠ ${missing.length} of ${routed.length} not complete:</b> <span class="mono" style="font-size:12px">${missing.map(m=>esc(m.number||"(unnumbered)")+" → "+esc(trMissing(t,m).join("/"))+(isCust(m)&&m.client?" · 🗂"+esc(m.client):"")).join(", ")}</span>`)
        :`<span class="faint">pick a go-live target, or give the transports their own destinations</span>`}
      ${frozen.map(([x,f])=>`<b style="color:var(--teal)">❄ ${esc(x)} is FROZEN until ${f.to} — ${esc(f.title)}</b>`).join(" ")}</div>`;
    host.querySelector("#rdy-sys").onchange=e=>{t.goliveTarget=e.target.value;touch(t);drawReadiness();drawTrs();};
  }

  function drawTrs(){
    const host=body.querySelector("#trList");host.innerHTML="";const cidx=clashIndex();
    if(!t.transports.length){host.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">No transports yet.</div>`;const m=body.querySelector("#trMap");if(m)m.innerHTML="";return;}
    t.transports.forEach((tr,idx)=>{
      const toc=tocFor(t,tr);const reached=reachedSystems(t,tr);const target=goliveTargetFor(t);const cust=isCust(tr);
      const card=document.createElement("div");card.className="trcard"+(cust?" cust":"");card.dataset.trid=tr.id;
      if(benchOn()&&tr.number&&!trOpen.has(tr.id))card.classList.add("collapsed");
      const tocOpts=`<option value="">— not bundled —</option>`+(t.tocs||[]).map(c=>`<option value="${c.id}" ${c.id===tr.tocId?"selected":""}>${esc(c.number||"(unnamed ToC)")}</option>`).join("");
      card.innerHTML=`
        <div class="trtop">
          <span class="seq">${idx+1}</span>
          <span class="reorder"><button class="ghost sm up" title="Move up" ${idx===0?"disabled":""}>↑</button><button class="ghost sm down" title="Move down" ${idx===t.transports.length-1?"disabled":""}>↓</button></span>
          <input class="mono num" value="${esc(tr.number)}" placeholder="H03K9..">
          <input class="dsc" value="${esc(tr.desc)}" placeholder="Short description">
          <select class="kind" title="Workbench = client-independent · Customizing = client-specific">
            <option value="workbench" ${!cust?"selected":""}>🔧 Workbench</option>
            <option value="customizing" ${cust?"selected":""}>🗂 Customizing</option></select>
          <select class="org" title="Origin system">${systemOptions(tr.system)}</select>
          <select class="cli ${cust?"":"hide"}" title="Origin client (mandant)">${clientOptions(tr.system,tr.client)}</select>
          <label style="display:flex;align-items:center;gap:5px;text-transform:none;font-size:12px;color:var(--muted);margin:0"><input type="checkbox" class="rel" ${tr.released?"checked":""} style="width:auto">Released</label>
          <button class="ghost sm trtgl" title="Show or hide this transport's details">▾ details</button><button class="ghost sm danger del">🗑</button>
        </div>
        <canvas class="trroute" title="Where this transport has reached — ringed system = go-live target"></canvas>
        ${destHTML(t,tr)}
        ${trClashHtml(t,tr,cidx)}
        <div style="display:flex;gap:14px;flex-wrap:wrap">
          <div style="flex:1;min-width:260px">
            <label>Synced to systems (directly)</label>
            <div class="syncs"></div>
            <button class="sm addsync" style="margin-top:4px">＋ Add sync target</button>
          </div>
          <div style="flex:0 0 230px">
            <label>Bundled in Transport of Copies</label>
            <select class="tocsel">${tocOpts}</select>${tr.tocId?"":`<button class="ghost sm tocone" style="margin-top:4px" title="Create a ToC just for this transport and bundle it in — you type only the ToC number">＋ ToC for this transport</button>`}
            ${toc&&toc.syncs.filter(s=>s.system).length?reachGridHTML(toc.syncs,"via ToC "+esc(toc.number||""),cust&&tr.client?" · 🗂 "+esc(tr.client):"")||`<div class="chiprow" style="margin-top:6px">${toc.syncs.filter(s=>s.system).map(s=>`<span class="sys ${sysTierCls(s.system)}" title="via ToC ${esc(toc.number)}">${esc(s.system)}<span class="d">via ToC</span>${cust&&tr.client?" · <span class='d'>🗂 "+esc(tr.client)+"</span>":""}${s.date?" · <span class='d'>"+s.date+"</span>":""}</span>`).join("")}</div>`:(toc?`<div class="faint" style="font-size:11px;margin-top:6px">ToC not moved anywhere yet</div>`:"")}
            <label style="margin-top:10px">Notes</label>
            <input class="notes" value="${esc(tr.notes)}">
          </div>
        </div>
        <div style="margin-top:8px"><label>Objects in this TR</label><div class="objlink"></div></div>`;
      const q=s=>card.querySelector(s);
      if(benchOn())DK.scope(q(".trroute"),trRouteDraw(t,tr));
      q(".trtgl").onclick=()=>{if(trOpen.has(tr.id))trOpen.delete(tr.id);else trOpen.add(tr.id);card.classList.toggle("collapsed",!trOpen.has(tr.id));};
      /* destinations: add a whole route (H43 → H42 → H41) or single systems; a pending one can be ticked reached */
      q(".dadd").onchange=e=>{const v=e.target.value;if(!v)return;tr.dest=tr.dest||[];
        const add=(v.startsWith("L:")?routeTiers().map(d=>v.slice(2)+d):[v]).filter(x=>x!==tr.system);
        if(!add.length){toast(`${v} is where this transport was built — it's there already`);drawTrs();return;}
        add.forEach(x=>{if(!tr.dest.includes(x))tr.dest.push(x);});touch(t);drawTrs();drawReadiness();};
      card.querySelectorAll(".dchip").forEach(ch=>{const x=ch.dataset.s,rm=ch.querySelector(".x");
        if(rm)rm.onclick=ev=>{ev.stopPropagation();tr.dest=(tr.dest||[]).filter(y=>y!==x);touch(t);drawTrs();drawReadiness();};
        if(ch.classList.contains("no"))ch.onclick=()=>{tr.syncs.push({system:x,date:todayStr()});const rel=syncReleases(tr,x);touch(t);drawTrs();drawReadiness();toast(`Recorded ${tr.number||"the transport"} reached ${x} today${rel?" — and marked it released":""}`);};});
      {const dr=q(".dreset");if(dr)dr.onclick=()=>{tr.dest=[];touch(t);drawTrs();drawReadiness();};}
      q(".num").onchange=e=>{tr.number=e.target.value;touch(t);drawReadiness();};
      q(".dsc").onchange=e=>{tr.desc=e.target.value;touch(t);};
      q(".kind").onchange=e=>{tr.kind=e.target.value;if(tr.kind!=="customizing")tr.client="";touch(t);drawTrs();drawReadiness();};
      q(".org").onchange=e=>{tr.system=e.target.value;if(tr.client&&!clientsForSystem(tr.system).includes(tr.client))tr.client="";touch(t);drawTrs();drawReadiness();};
      const cliSel=q(".cli");if(cliSel)cliSel.onchange=e=>{tr.client=e.target.value;touch(t);drawTrs();drawReadiness();};
      q(".rel").onchange=e=>{tr.released=e.target.checked;tr.releasedOn=tr.released?(tr.releasedOn||todayStr()):"";touch(t);};
      q(".notes").onchange=e=>{tr.notes=e.target.value;touch(t);};
      q(".tocsel").onchange=e=>{tr.tocId=e.target.value;touch(t);drawTrs();drawReadiness();};
      {const b=q(".tocone");if(b)b.onclick=()=>{const n=prompt(`ToC number for ${tr.number||"this transport"}:`,"");if(n===null)return;
        const c=normToc({number:n.trim(),desc:tr.desc});(t.tocs=t.tocs||[]).push(c);tr.tocId=c.id;touch(t);drawTrs();drawTocs();drawReadiness();
        toast(`${c.number||"New ToC"} created and ${tr.number||"the transport"} bundled in — record where the ToC moves under Transports of Copies`);};}
      q(".del").onclick=()=>{if((tr.number||tr.syncs.some(x=>x.system))&&!confirm(`Delete transport ${tr.number||"(unnumbered)"}? Its sync history goes with it.`))return;t.transports=t.transports.filter(x=>x.id!==tr.id);touch(t);renderTransports(body,t);renderDetail();};
      q(".up").onclick=()=>{if(idx>0){[t.transports[idx-1],t.transports[idx]]=[t.transports[idx],t.transports[idx-1]];touch(t);drawTrs();drawReadiness();}};
      q(".down").onclick=()=>{if(idx<t.transports.length-1){[t.transports[idx+1],t.transports[idx]]=[t.transports[idx],t.transports[idx+1]];touch(t);drawTrs();drawReadiness();}};
      const syncHost=q(".syncs");
      /* synced straight to many systems: the same grid as a ToC, date rows behind Edit moves */
      const drawSyncs=()=>{syncHost.innerHTML="";const n=tr.syncs.filter(s=>s.system).length,many=n>3,open=!many||tocEdit.has(tr.id),ab=q(".addsync");
        ab.style.display=open?"":"none";
        if(open)tr.syncs.forEach((sy,i)=>{const r=document.createElement("div");r.className="syncrow";
          r.innerHTML=`<select class="s-sys">${systemOptions(sy.system)}</select><input type="date" class="s-date" value="${sy.date||""}"><button class="ghost sm danger s-del">✕</button>`;
          r.querySelector(".s-sys").onchange=e=>{sy.system=e.target.value;const rel=syncReleases(tr,sy.system);touch(t);drawReadiness();drawTrs();if(rel)toast(`${tr.number||"The transport"} reached ${sy.system}, so it's marked released`);};
          r.querySelector(".s-date").onchange=e=>{sy.date=e.target.value;touch(t);};
          r.querySelector(".s-del").onclick=()=>{tr.syncs.splice(i,1);touch(t);drawSyncs();drawReadiness();};
          syncHost.appendChild(r);});
        if(n&&!(many&&open)){const chips=document.createElement("div"),g=reachGridHTML(tr.syncs,"Moved to",cust&&tr.client?" · 🗂 "+esc(tr.client):"");chips.className=g?"":"chiprow";chips.innerHTML=g||tr.syncs.filter(s=>s.system).map(s=>sysPill(s.system,s.date,cust?tr.client:"")).join("");syncHost.appendChild(chips);}
        if(many){const b=document.createElement("button");b.className="sm "+(open?"":"ghost");b.style.margin="6px 6px 0 0";b.textContent=open?"✓ Done editing":`✎ Edit moves (${n})`;
          b.title=open?"Back to the grid":"Change dates, add or remove systems";b.onclick=()=>{if(open)tocEdit.delete(tr.id);else tocEdit.add(tr.id);drawSyncs();};syncHost.appendChild(b);}
      };
      q(".addsync").onclick=()=>{tr.syncs.push({system:"",date:todayStr()});touch(t);drawSyncs();};
      drawSyncs();
      const ol=q(".objlink");
      const drawOl=()=>{tr.objectIds=tr.objectIds||[];
        const linked=tr.objectIds.map(id=>t.objects.find(o=>o.id===id)).filter(Boolean);
        ol.innerHTML=linked.map(o=>`<span class="chip" data-id="${o.id}">${esc(o.name||"(obj)")} <span class="x">✕</span></span>`).join("")+`<button class="ghost sm pickobj">＋ object</button>`;
        ol.querySelectorAll(".chip").forEach(ch=>ch.querySelector(".x").onclick=()=>{tr.objectIds=tr.objectIds.filter(x=>x!==ch.dataset.id);touch(t);drawOl();});
        ol.querySelector(".pickobj").onclick=()=>openObjPicker(t,tr,drawOl);
      };
      drawOl();
      host.appendChild(card);
    });
    if(benchOn())drawTrMap(body.querySelector("#trMap"),t,pickTr);
  }

  function drawTocs(){
    const host=body.querySelector("#tocList");host.innerHTML="";
    const tocs=t.tocs||[];
    if(!tocs.length){host.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">No Transports of Copies. Create one, then bundle TRs into it above — the bundled TRs inherit wherever the ToC is moved.</div>`;return;}
    tocs.forEach(c=>{
      const members=t.transports.filter(tr=>tr.tocId===c.id);
      const card=document.createElement("div");card.className="trcard toc";
      card.innerHTML=`
        <div class="trtop">
          <span class="toctag">ToC</span>
          <input class="mono cnum" value="${esc(c.number)}" placeholder="ToC number">
          <input class="cdsc" value="${esc(c.desc)}" placeholder="Description">
          <span class="faint" style="font-size:12px;white-space:nowrap">📦 ${members.length} TR(s)</span>
          <button class="ghost sm danger cdel">🗑</button>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap">
          <div style="flex:1;min-width:260px"><label>ToC moved to systems</label><div class="csyncs"></div><button class="sm caddsync" style="margin-top:4px">＋ Add sync target</button> <button class="sm croute" style="margin-top:4px" title="Every system on a route, with one date">⇢ Move along a route…</button></div>
          <div style="flex:0 0 230px"><label>Bundled TRs</label><div class="faint mono" style="font-size:12px">${members.map(m=>esc(m.number||"(unnumbered)")).join(", ")||"—"}</div><label style="margin-top:10px">Notes</label><input class="cnotes" value="${esc(c.notes)}"></div>
        </div>`;
      const q=s=>card.querySelector(s);
      q(".cnum").onchange=e=>{c.number=e.target.value;touch(t);drawTrs();drawReadiness();};
      q(".cdsc").onchange=e=>{c.desc=e.target.value;touch(t);};
      q(".cnotes").onchange=e=>{c.notes=e.target.value;touch(t);};
      q(".cdel").onclick=()=>{if(members.length&&!confirm("Delete this ToC? "+members.length+" TR(s) will become un-bundled."))return;t.transports.forEach(tr=>{if(tr.tocId===c.id)tr.tocId="";});t.tocs=t.tocs.filter(x=>x.id!==c.id);touch(t);renderTransports(body,t);};
      const sh=q(".csyncs");
      /* a ToC moved to many systems shows the grid; its date rows open only for editing */
      const drawCs=()=>{sh.innerHTML="";const n=c.syncs.filter(s=>s.system).length,many=n>3,open=!many||tocEdit.has(c.id),ab=q(".caddsync");
        ab.style.display=open?"":"none";
        if(open)c.syncs.forEach((sy,i)=>{const r=document.createElement("div");r.className="syncrow";
          r.innerHTML=`<select class="s-sys">${systemOptions(sy.system)}</select><input type="date" class="s-date" value="${sy.date||""}"><button class="ghost sm danger s-del">✕</button>`;
          r.querySelector(".s-sys").onchange=e=>{sy.system=e.target.value;touch(t);drawTrs();drawReadiness();};
          r.querySelector(".s-date").onchange=e=>{sy.date=e.target.value;touch(t);drawTrs();};
          r.querySelector(".s-del").onclick=()=>{c.syncs.splice(i,1);touch(t);drawCs();drawTrs();drawReadiness();};
          sh.appendChild(r);});
        if(n&&!(many&&open)){const chips=document.createElement("div"),g=reachGridHTML(c.syncs,"Moved to");chips.className=g?"":"chiprow";chips.innerHTML=g||c.syncs.filter(s=>s.system).map(s=>sysPill(s.system,s.date)).join("");sh.appendChild(chips);}
        if(many){const b=document.createElement("button");b.className="sm "+(open?"":"ghost");b.style.margin="6px 6px 0 0";b.textContent=open?"✓ Done editing":`✎ Edit moves (${n})`;
          b.title=open?"Back to the grid":"Change dates, add or remove systems";b.onclick=()=>{if(open)tocEdit.delete(c.id);else tocEdit.add(c.id);drawCs();};sh.appendChild(b);}
      };
      q(".caddsync").onclick=()=>{c.syncs.push({system:"",date:todayStr()});touch(t);drawCs();};
      q(".croute").onclick=()=>openTocRoute(t,c);
      drawCs();
      host.appendChild(card);
    });
  }
}

const tocEdit=new Set();   /* ToCs and transports whose date rows are open for editing (this session only) */
function routeTiers(){return state.settings.tiers.map(x=>x.d).sort().reverse();}   /* "3","2","1" = Dev → QA → Prod */
function destHTML(t,tr){const own=trDest(t,tr),T=trTargets(t,tr),R=reachedSystems(t,tr),when={};
  effectiveSyncs(t,tr).forEach(x=>{if(!when[x.system])when[x.system]=x.date;});
  const done=T.length&&T.every(x=>R.has(x)),tiers=routeTiers();
  return `<div class="dests"><span class="dl ${done?"ok":""}">${done?"✓ complete":"Destinations"}</span>
    ${T.map(x=>{const ok=R.has(x);return `<span class="dchip ${ok?"ok":"no"}" data-s="${esc(x)}" title="${ok?"Reached"+(when[x]?" "+when[x]:""):"Not there yet — click to record it reached today"}">${ok?"✓":"○"} ${esc(x)}${ok&&when[x]?` <span class="d">${when[x]}</span>`:""}${own.length?`<span class="x" title="Remove this destination">✕</span>`:""}</span>`;}).join("")||`<span class="faint">none yet</span>`}
    ${own.length?`<button class="ghost sm dreset" title="Drop these and follow the demand's go-live target again">↺ use go-live target</button>`:`<span class="faint dhint">(the demand's go-live target)</span>`}
    <select class="dadd" title="Where this transport has to end up — e.g. built in H03, only ever synced to H43 → H42 → H41"><option value="">＋ destination…</option>
      <optgroup label="Whole route">${state.settings.landscapes.map(L=>`<option value="L:${esc(L)}">${esc(L)} route — ${tiers.map(d=>L+d).filter(x=>x!==tr.system).map(esc).join(" → ")}</option>`).join("")}</optgroup>
      <optgroup label="Single system">${state.settings.landscapes.flatMap(L=>tiers.map(d=>L+d)).filter(x=>x!==tr.system).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</optgroup></select></div>`;}
function csvCell(v){v=(v==null?"":String(v));return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function exportTransportsCSV(){
  const tier=id=>{const m=tierMeta(id);return m?m.short:"";};
  const head=["Demand ID","Demand Title","Demand Status","Seq","TR Number","TR Description","Kind","Origin System","Origin Tier","Client","Released","Direct syncs","ToC Number","Effective syncs (incl. via ToC)","Destinations","Complete","Notes"];
  const rows=[head];
  state.tasks.forEach(t=>t.transports.forEach((tr,idx)=>{
    const direct=tr.syncs.filter(s=>s.system).map(s=>`${s.system} (${tier(s.system)})${s.date?" @"+s.date:""}`).join("; ");
    const toc=tocFor(t,tr);
    const eff=effectiveSyncs(t,tr).map(s=>`${s.system} (${tier(s.system)})${s.date?" @"+s.date:""}${s.via?" [via ToC "+s.via+"]":""}`).join("; ");
    rows.push([t.demandId,t.title,STATUS[t.status].label,idx+1,tr.number,tr.desc,isCust(tr)?"Customizing":"Workbench",tr.system,tier(tr.system),isCust(tr)?tr.client:"",tr.released?"Yes":"No",direct,toc?toc.number:"",eff,trTargets(t,tr).join(" → "),trComplete(t,tr)?"Yes":"No",tr.notes]);
  }));
  if(rows.length===1){toast("No transports to export",true);return;}
  const csv="﻿"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
  const b=new Blob([csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="transports-"+todayStr()+".csv";a.click();URL.revokeObjectURL(a.href);
  toast("Exported "+(rows.length-1)+" transports (CSV)");
}

/* ----- TECH SPEC ----- */
function specSubsHtml(list){return `<ul>${list.map(s=>`<li>[${s.done?"✓":"&nbsp;"}] ${esc(s.title)}${s.dueDate?` <i>(due ${s.dueDate})</i>`:""}${s.children.length?specSubsHtml(s.children):""}</li>`).join("")}</ul>`;}
function specSubsMd(list,d){let o="";list.forEach(s=>{o+=`${"  ".repeat(d)}- [${s.done?"x":" "}] ${s.title}${s.dueDate?` _(due ${s.dueDate})_`:""}\n`;o+=specSubsMd(s.children,d+1);});return o;}
function buildTechSpecHTML(t){
  const calls=meetingsForTask(t.id);
  return `<h1>Post-Delivery Technical Specification</h1>
   <h2>${esc(t.demandId||"(no demand id)")} — ${esc(t.title)}</h2>
   <p class="meta"><b>Type:</b> ${esc(t.type)} &nbsp;|&nbsp; <b>Status:</b> ${STATUS[t.status].label} &nbsp;|&nbsp; <b>System:</b> ${esc(t.system)||"—"}${t.client?" / "+esc(t.client):""} &nbsp;|&nbsp; <b>Requestor:</b> ${esc(t.requestor)||"—"}${buildersOf(t).length?` &nbsp;|&nbsp; <b>Built by:</b> ${esc(builderNames(t))}`:""} &nbsp;|&nbsp; <b>Received:</b> ${t.receivedDate||"—"} &nbsp;|&nbsp; <b>Due:</b> ${t.dueDate||"—"} &nbsp;|&nbsp; <b>Generated:</b> ${todayStr()}</p>
   ${(()=>{const e=epicById(t.epicId);return e?`<p class="meta"><b>Epic:</b> ${esc(epicLabel(e))}${e.owner?" ("+esc(e.owner)+")":""}</p>`:"";})()}
   ${(t.project||t.theme)?`<p class="meta"><b>Project:</b> ${esc(t.project)||"—"} &nbsp;|&nbsp; <b>Theme:</b> ${esc(t.theme)||"—"}</p>`:""}
   ${(reworkCount(t)||deliveredDates(t).length)?`<p class="meta"><b>Delivered:</b> ${deliveredDates(t).join(", ")||"—"} &nbsp;|&nbsp; <b>Rework cycles:</b> ${reworkCount(t)}</p>`:""}
   <h3>1. Functional Requirement</h3><p>${esc(t.description)||"<i>none captured</i>"}</p>
   <h3>2. Work Breakdown (as delivered)</h3>${t.subtasks.length?specSubsHtml(t.subtasks):"<p><i>no subtasks</i></p>"}
   <h3>3. Objects Changed</h3>${t.objects.length?`<table><tr><th>Object</th><th>Type</th><th>Action</th><th>Description</th><th>In TR(s)</th></tr>${t.objects.map(o=>`<tr><td>${esc(o.name)}</td><td>${esc(o.type)}</td><td>${esc(o.action)}</td><td>${esc(o.desc)}</td><td>${trsForObject(t,o.id).map(x=>esc(x.number||"")).join(", ")||"—"}</td></tr>`).join("")}</table>`:"<p><i>none logged</i></p>"}
   <h3>4. Transports</h3>${t.transports.length?`<table><tr><th>#</th><th>TR</th><th>Kind</th><th>Origin</th><th>Reached (incl. via ToC)</th><th>Destinations</th><th>ToC</th><th>Released</th></tr>${t.transports.map((tr,i)=>{const toc=tocFor(t,tr);const cl=isCust(tr)&&tr.client?" / "+esc(tr.client):"";return `<tr><td>${i+1}</td><td>${esc(tr.number)}${tr.desc?" – "+esc(tr.desc):""}</td><td>${isCust(tr)?"Customizing":"Workbench"}</td><td>${esc(tr.system)}${cl}</td><td>${effectiveSyncs(t,tr).map(s=>esc(s.system)+cl+(s.date?" ("+s.date+")":"")+(s.via?" via ToC":"")).join(", ")||"—"}</td><td>${esc(trTargets(t,tr).join(" → "))||"—"}${trComplete(t,tr)?" ✓":""}</td><td>${toc?esc(toc.number):"—"}</td><td>${tr.released?"Yes":"No"}</td></tr>`;}).join("")}</table>${(t.tocs&&t.tocs.length)?`<p style="margin-top:6px"><b>Transports of Copies:</b> ${t.tocs.map(c=>esc(c.number)+(c.syncs.filter(s=>s.system).length?" → "+c.syncs.filter(s=>s.system).map(s=>esc(s.system)).join(", "):"")).join(" · ")}</p>`:""}`:"<p><i>none logged</i></p>"}
   <h3>5. Decisions &amp; Clarifications (from meetings)</h3>${calls.length?calls.map(c=>`<p><b>${c.date} — ${esc(c.title)}</b> ${c.team?"["+esc(c.team)+"] ":""}${c.attendees?"("+esc(c.attendees)+")":""}</p><div class="note">${esc(c.body)}</div>`).join(""):"<p><i>no linked meetings</i></p>"}
   <h3>6. Working Notes &amp; Change History</h3><div class="note">${esc(t.notes)||"<i>none</i>"}</div>${(t.comments&&t.comments.length)?`<p style="margin-top:8px"><b>Comments:</b></p><ul>${t.comments.map(c=>`<li><i>${fmtTs(c.ts)}</i> — ${esc(c.text)}</li>`).join("")}</ul>`:""}
   ${(t.reference&&t.reference.length)?`<h3>7. Reference / Endpoints</h3><table><tr><th>Label</th><th>Value</th></tr>${t.reference.map(r=>`<tr><td>${esc(r.label)}</td><td>${r.secret?"<i>(secret — held in app)</i>":esc(r.value)}</td></tr>`).join("")}</table>`:""}`;
}
function buildTechSpecMarkdown(t){
  const calls=meetingsForTask(t.id);const L=[];
  L.push(`# Post-Delivery Technical Specification`,``,`## ${t.demandId||"(no demand id)"} — ${t.title}`,``);
  L.push(`- **Type:** ${t.type}`,`- **Status:** ${STATUS[t.status].label}`,`- **System:** ${t.system||"—"}${t.client?" / "+t.client:""}`,`- **Requestor:** ${t.requestor||"—"}`);
  {const e=epicById(t.epicId);if(e)L.push(`- **Epic:** ${epicLabel(e)}${e.owner?" ("+e.owner+")":""}`);}
  if(t.project||t.theme)L.push(`- **Project:** ${t.project||"—"} | **Theme:** ${t.theme||"—"}`);
  L.push(`- **Received:** ${t.receivedDate||"—"} | **Due:** ${t.dueDate||"—"}`);
  if(reworkCount(t)||deliveredDates(t).length)L.push(`- **Delivered:** ${deliveredDates(t).join(", ")||"—"} | **Rework cycles:** ${reworkCount(t)}`);
  L.push(`- **Spec generated:** ${todayStr()}`,``);
  L.push(`### 1. Functional Requirement`,t.description||"_(none captured)_",``);
  L.push(`### 2. Work Breakdown (as delivered)`,t.subtasks.length?specSubsMd(t.subtasks,0):"_(no subtasks)_",``);
  L.push(`### 3. Objects Changed`);
  if(t.objects.length){L.push(`| Object | Type | Action | Description | In TR(s) |`,`|---|---|---|---|---|`);t.objects.forEach(o=>L.push(`| ${o.name} | ${o.type} | ${o.action} | ${(o.desc||"").replace(/\n/g," ")} | ${trsForObject(t,o.id).map(x=>x.number||"").join(", ")||"—"} |`));}else L.push("_(none logged)_");
  L.push(``,`### 4. Transports`);
  if(t.transports.length){L.push(`| # | TR | Kind | Origin | Reached (incl. via ToC) | Destinations | ToC | Released |`,`|---|---|---|---|---|---|---|---|`);t.transports.forEach((tr,i)=>{const toc=tocFor(t,tr);const cl=isCust(tr)&&tr.client?" / "+tr.client:"";const sy=effectiveSyncs(t,tr).map(s=>`${s.system}${cl}${s.date?" ("+s.date+")":""}${s.via?" via ToC":""}`).join(", ");L.push(`| ${i+1} | ${tr.number}${tr.desc?" – "+tr.desc:""} | ${isCust(tr)?"Customizing":"Workbench"} | ${tr.system}${cl} | ${sy||"—"} | ${trTargets(t,tr).join(" → ")||"—"}${trComplete(t,tr)?" ✓":""} | ${toc?toc.number:"—"} | ${tr.released?"Yes":"No"} |`);});if(t.tocs&&t.tocs.length){L.push(``,`**Transports of Copies:** `+t.tocs.map(c=>c.number+(c.syncs.filter(s=>s.system).length?" → "+c.syncs.filter(s=>s.system).map(s=>s.system).join(", "):"")).join(" · "));}}else L.push("_(none logged)_");
  L.push(``,`### 5. Decisions & Clarifications (from meetings)`);
  if(calls.length)calls.forEach(c=>{L.push(`**${c.date} — ${c.title}** ${c.team?"["+c.team+"] ":""}${c.attendees?"("+c.attendees+")":""}`,``,c.body||"",``);});else L.push("_(no linked meetings)_");
  L.push(``,`### 6. Working Notes & Change History`,t.notes||"_(none)_");
  if(t.comments&&t.comments.length){L.push(``,`**Comments:**`);t.comments.forEach(c=>L.push(`- _${fmtTs(c.ts)}_ — ${c.text.replace(/\n/g," ")}`));}
  if(t.reference&&t.reference.length){L.push(``,`### 7. Reference / Endpoints`,`| Label | Value |`,`|---|---|`);t.reference.forEach(r=>L.push(`| ${r.label} | ${r.secret?"(secret — held in app)":(r.value||"").replace(/\n/g," ")} |`));}
  return L.join("\n");
}
function openTechSpec(t){
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:780px"><h2>📄 Post-Delivery Tech Spec — ${esc(demandLabel(t))}</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">Assembled from everything captured below. Edit freely after copying into Word, or print straight to PDF.</p>
    <div class="specpaper specdoc" id="specPrev">${buildTechSpecHTML(t)}</div>
    <div class="modal-foot"><button id="sp-copy">📋 Copy Markdown</button><button id="sp-md">⬇ Download .md</button><button id="sp-print">🖨 Print / Save PDF</button><button id="sp-close" class="primary">Close</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector("#sp-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  root.querySelector("#sp-copy").onclick=()=>{navigator.clipboard.writeText(buildTechSpecMarkdown(t)).then(()=>toast("Markdown copied to clipboard")).catch(()=>toast("Copy failed",true));};
  root.querySelector("#sp-md").onclick=()=>{const b=new Blob([buildTechSpecMarkdown(t)],{type:"text/markdown"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="techspec-"+(t.demandId||"demand")+".md";a.click();URL.revokeObjectURL(a.href);};
  root.querySelector("#sp-print").onclick=()=>{const pa=document.getElementById("printArea");pa.className="specdoc";pa.innerHTML=buildTechSpecHTML(t);window.print();};
}

/* ----- WEEKLY SUMMARY ----- */
function weekStartOf(offset){const d=new Date(todayStr()+"T00:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7)+offset*7);return d;}
function isoD(d){const p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate());}
function isoTs(ts){return isoD(new Date(ts));}
function weekData(offset){
  const s=weekStartOf(offset),e=new Date(s.getTime()+7*86400000);
  const s0=isoD(s),e0=isoD(new Date(e.getTime()-86400000));
  const inTs=ts=>ts>=s.getTime()&&ts<e.getTime();
  const inD=d=>d&&d>=s0&&d<=e0;
  const delivered=[],bugs=[],created=[],closed=[];
  state.tasks.forEach(t=>{
    (t.timeline||[]).forEach(ev=>{if(ev.type!=="status"||!inTs(ev.ts))return;
      if(ev.to==="delivered")delivered.push({t,ts:ev.ts});
      else if(ev.to==="bug")bugs.push({t,ts:ev.ts});
      else if(ev.to==="closed")closed.push({t,ts:ev.ts});});
    if(inTs(t.createdAt))created.push(t);
  });
  const moves=[];
  state.tasks.forEach(t=>{
    t.transports.forEach(tr=>tr.syncs.forEach(sy=>{if(sy.system&&inD(sy.date))moves.push({t,num:tr.number||"(TR)",sys:sy.system,date:sy.date,via:"",client:isCust(tr)?tr.client:""});}));
    (t.tocs||[]).forEach(c=>c.syncs.forEach(sy=>{if(sy.system&&inD(sy.date))moves.push({t,num:c.number||"(ToC)",sys:sy.system,date:sy.date,via:"ToC",client:""});}));
  });
  moves.sort((a,b)=>a.date.localeCompare(b.date));
  const journal=state.journal.filter(j=>inD(j.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const meetings=state.meetings.filter(m=>inD(m.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const findings=[];state.debug.forEach(sx=>sx.findings.forEach(f=>{if(inTs(f.ts))findings.push({s:sx,f});}));
  return {s0,e0,delivered,bugs,created,closed,moves,journal,meetings,findings};
}
function weekIsEmpty(w){return !w.delivered.length&&!w.bugs.length&&!w.created.length&&!w.closed.length&&!w.moves.length&&!w.journal.length&&!w.meetings.length&&!w.findings.length;}
function buildWeeklyHTML(w){
  const dl=t=>esc((t.demandId?t.demandId+" — ":"")+t.title);
  const sec=(title,inner)=>inner?`<h3>${title}</h3>${inner}`:"";
  const ul=items=>items.length?`<ul>${items.join("")}</ul>`:"";
  return `<h1>Weekly Summary</h1><h2>${w.s0} → ${w.e0}</h2>
    <p class="meta"><b>Delivered:</b> ${w.delivered.length} &nbsp;|&nbsp; <b>Bugs/rework raised:</b> ${w.bugs.length} &nbsp;|&nbsp; <b>New demands:</b> ${w.created.length} &nbsp;|&nbsp; <b>Closed:</b> ${w.closed.length} &nbsp;|&nbsp; <b>Transport moves:</b> ${w.moves.length} &nbsp;|&nbsp; <b>Generated:</b> ${todayStr()}</p>
    ${sec("Delivered this week",ul(w.delivered.map(x=>`<li>${dl(x.t)} <i>(${isoTs(x.ts)})</i></li>`)))}
    ${sec("Bugs / rework raised",ul(w.bugs.map(x=>`<li>${dl(x.t)} <i>(${isoTs(x.ts)})</i></li>`)))}
    ${sec("New demands received",ul(w.created.map(t=>`<li>${dl(t)}${t.requestor?` <i>— ${esc(t.requestor)}</i>`:""}</li>`)))}
    ${sec("Closed",ul(w.closed.map(x=>`<li>${dl(x.t)}</li>`)))}
    ${sec("Transport movements",w.moves.length?`<table><tr><th>Date</th><th>TR / ToC</th><th>To</th><th>Demand</th></tr>${w.moves.map(m=>`<tr><td>${m.date}</td><td>${esc(m.num)}${m.via?" ("+m.via+")":""}</td><td>${esc(m.sys)}${m.client?" / "+esc(m.client):""}</td><td>${dl(m.t)}</td></tr>`).join("")}</table>`:"")}
    ${sec("Meetings",ul(w.meetings.map(m=>`<li>👥 ${m.date}${m.team?" · "+esc(m.team):""} — ${esc(m.title)}${m.actions.length?` <i>(${m.actions.filter(a=>!a.done).length} open action(s))</i>`:""}</li>`)))}
    ${sec("Debug findings",ul(w.findings.map(({s,f})=>`<li><i>${esc(s.title)}:</i> ${esc(f.text)}</li>`)))}
    ${sec("Journal",w.journal.map(j=>`<p><b>${j.date}${j.title?" — "+esc(j.title):""}</b></p><div class="note">${esc(j.body)}</div>`).join(""))}
    ${weekIsEmpty(w)?"<p><i>Nothing recorded in this week.</i></p>":""}`;
}
function buildWeeklyMarkdown(w){
  const L=[];const dl=t=>(t.demandId?t.demandId+" — ":"")+t.title;
  L.push(`# Weekly Summary — ${w.s0} → ${w.e0}`,``);
  L.push(`Delivered: ${w.delivered.length} | Bugs/rework: ${w.bugs.length} | New demands: ${w.created.length} | Closed: ${w.closed.length} | TR moves: ${w.moves.length}`,``);
  const sec=(h,arr,fn)=>{if(arr.length){L.push(`### ${h}`);arr.forEach(x=>L.push("- "+fn(x)));L.push("");}};
  sec("Delivered this week",w.delivered,x=>`${dl(x.t)} (${isoTs(x.ts)})`);
  sec("Bugs / rework raised",w.bugs,x=>`${dl(x.t)} (${isoTs(x.ts)})`);
  sec("New demands received",w.created,t=>dl(t)+(t.requestor?` — ${t.requestor}`:""));
  sec("Closed",w.closed,x=>dl(x.t));
  sec("Transport movements",w.moves,m=>`${m.date} · ${m.num}${m.via?" ("+m.via+")":""} → ${m.sys}${m.client?" / "+m.client:""} · ${dl(m.t)}`);
  sec("Meetings",w.meetings,m=>`👥 ${m.date}${m.team?" · "+m.team:""} — ${m.title}${m.actions.length?` (${m.actions.filter(a=>!a.done).length} open action(s))`:""}`);
  sec("Debug findings",w.findings,({s,f})=>`${s.title}: ${f.text}`);
  if(w.journal.length){L.push(`### Journal`);w.journal.forEach(j=>{L.push(`**${j.date}${j.title?" — "+j.title:""}**`,``,j.body||"",``);});}
  if(weekIsEmpty(w))L.push("_Nothing recorded in this week._");
  return L.join("\n");
}
function openWeekly(){
  let off=0;const root=document.getElementById("modalRoot");
  const draw=()=>{
    const w=weekData(off);
    root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:780px"><h2>🗓 Weekly summary</h2>
      <p class="faint" style="font-size:12px;margin-top:-8px">Assembled from the timeline, transports, journal, meetings and debug findings — ready for a status report.</p>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
        <button class="sm" id="wk-prev">◀ prev</button>
        <b class="mono" style="font-size:13px">${w.s0} → ${w.e0}${off===0?" · this week":off===-1?" · last week":""}</b>
        <button class="sm" id="wk-next" ${off>=0?"disabled":""}>next ▶</button></div>
      <div class="specpaper specdoc">${buildWeeklyHTML(w)}</div>
      <div class="modal-foot"><button id="wk-copy">📋 Copy Markdown</button><button id="wk-md">⬇ Download .md</button><button id="wk-print">🖨 Print / Save PDF</button><button id="wk-close" class="primary">Close</button></div></div></div>`;
    const close=()=>root.innerHTML="";
    root.querySelector("#wk-close").onclick=close;
    root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
    root.querySelector("#wk-prev").onclick=()=>{off--;draw();};
    root.querySelector("#wk-next").onclick=()=>{if(off<0){off++;draw();}};
    root.querySelector("#wk-copy").onclick=()=>{navigator.clipboard.writeText(buildWeeklyMarkdown(w)).then(()=>toast("Markdown copied to clipboard")).catch(()=>toast("Copy failed",true));};
    root.querySelector("#wk-md").onclick=()=>{const b=new Blob([buildWeeklyMarkdown(w)],{type:"text/markdown"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="weekly-"+w.s0+".md";a.click();URL.revokeObjectURL(a.href);};
    root.querySelector("#wk-print").onclick=()=>{const pa=document.getElementById("printArea");pa.className="specdoc";pa.innerHTML=buildWeeklyHTML(w);window.print();};
  };
  draw();
}

function renderLinkedItems(body,t){
  const items=[
    ...meetingsForTask(t.id).map(m=>({kind:"meeting",date:m.date,obj:m})),
    ...journalForTask(t.id).map(j=>({kind:"journal",date:j.date,obj:j})),
    ...debugForTask(t.id).map(s=>({kind:"debug",date:isoTs(s.updatedAt),obj:s}))
  ].sort((a,b)=>b.date.localeCompare(a.date));
  body.innerHTML=`<div class="sec-title"><h3>Linked meetings, journal &amp; debug</h3><div class="ln"></div>
      <button class="sm" id="linkMeet">🔗 Meeting</button><button class="sm" id="linkJrnl">🔗 Journal</button><button class="sm" id="linkDbg">🔗 Debug</button></div>
    <div id="lcList"></div>`;
  body.querySelector("#linkMeet").onclick=()=>openLinkMeetingModal(t);
  body.querySelector("#linkJrnl").onclick=()=>openLinkJournalModal(t);
  body.querySelector("#linkDbg").onclick=()=>openLinkDebugModal(t);
  const host=body.querySelector("#lcList");
  if(!items.length){host.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">Nothing linked yet. Link meetings, journal entries or debug sessions with the buttons above — they also link from their own sections.</div>`;return;}
  host.innerHTML=items.map(it=>{
    if(it.kind==="meeting"){const m=it.obj;return `<div class="tcard" data-k="meeting" data-id="${m.id}"><div class="demand">👥 Meeting · ${m.date}${m.team?" · "+esc(m.team):""}</div><div class="ttitle">${esc(m.title)}</div><div class="meta faint">${esc(m.attendees||"")}${m.actions.length?`<span class="lc-badge">☑ ${meetingOpenActions(m)}/${m.actions.length}</span>`:""}</div></div>`;}
    if(it.kind==="journal"){const j=it.obj;return `<div class="tcard" data-k="journal" data-id="${j.id}" style="border-left-color:var(--teal)"><div class="demand" style="color:var(--teal)">📓 Journal · ${j.date}</div><div class="ttitle">${esc(j.title)||"(daily notes)"}</div><div class="meta faint">${esc((j.body||"").replace(/\s+/g," ").slice(0,80))}</div></div>`;}
    const s=it.obj;const st=DEBUG_STATUS[s.status];
    return `<div class="tcard" data-k="debug" data-id="${s.id}" style="border-left-color:var(--amber)"><div class="demand" style="color:var(--amber)">🐞 Debug · updated ${it.date}</div><div class="ttitle">${esc(s.title)}</div><div class="meta"><span class="pill ${st.cls}">${st.label}</span>${s.resume?`<span class="faint">${esc(s.resume.replace(/\s+/g," ").slice(0,70))}</span>`:""}</div></div>`;
  }).join("");
  host.querySelectorAll(".tcard").forEach(el=>el.onclick=()=>{
    const k=el.dataset.k,id=el.dataset.id;
    if(k==="meeting"){view="meetings";meetingRollup=false;activeMeetingId=id;}
    else if(k==="journal"){view="journal";journalTodos=false;activeJournalId=id;}
    else{view="debug";activeDebugId=id;}
    renderApp();});
}
function openLinkJournalModal(t){
  const root=document.getElementById("modalRoot");
  const rows=state.journal.slice().sort((a,b)=>b.date.localeCompare(a.date));
  root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>Link journal entries to “${esc(t.title)}”</h2>
    ${rows.length?`<div class="picklist">${rows.map(j=>`<label class="pickrow"><input type="checkbox" data-id="${j.id}" ${(j.taskIds||[]).includes(t.id)?"checked":""} style="width:auto"><div><div>📓 ${j.date}${j.title?" — "+esc(j.title):""}</div><div class="faint" style="font-size:11px">${esc((j.body||"").replace(/\s+/g," ").slice(0,70))}</div></div></label>`).join("")}</div>`:`<p class="faint">No journal entries yet.</p>`}
    <div class="modal-foot"><button id="m-close" class="primary">Done</button></div></div></div>`;
  const close=()=>{root.innerHTML="";renderDetail();};
  root.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{const j=state.journal.find(x=>x.id===cb.dataset.id);j.taskIds=j.taskIds||[];if(cb.checked){if(!j.taskIds.includes(t.id))j.taskIds.push(t.id);}else j.taskIds=j.taskIds.filter(id=>id!==t.id);touch(j);});
  root.querySelector("#m-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
}
function openLinkDebugModal(t){
  const root=document.getElementById("modalRoot");
  const rows=state.debug.slice().sort((a,b)=>b.updatedAt-a.updatedAt);
  root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>Link debug sessions to “${esc(t.title)}”</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">A debug session links to one demand — ticking here moves it to this demand.</p>
    ${rows.length?`<div class="picklist">${rows.map(s=>`<label class="pickrow"><input type="checkbox" data-id="${s.id}" ${s.taskId===t.id?"checked":""} style="width:auto"><div><div>🐞 ${esc(s.title)}</div><div class="faint" style="font-size:11px">${DEBUG_STATUS[s.status].label}${s.demandId?" · "+esc(s.demandId):""}</div></div></label>`).join("")}</div>`:`<p class="faint">No debug sessions yet.</p>`}
    <div class="modal-foot"><button id="m-close" class="primary">Done</button></div></div></div>`;
  const close=()=>{root.innerHTML="";renderDetail();};
  root.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{const s=state.debug.find(x=>x.id===cb.dataset.id);
    if(cb.checked){s.taskId=t.id;if(!s.demandId&&t.demandId)s.demandId=t.demandId;}else if(s.taskId===t.id)s.taskId="";touch(s);});
  root.querySelector("#m-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
}
function openLinkMeetingModal(t){
  const root=document.getElementById("modalRoot");
  const rows=state.meetings.slice().sort((a,b)=>b.date.localeCompare(a.date));
  root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>Link meetings to “${esc(t.title)}”</h2>
    ${rows.length?`<div class="picklist">${rows.map(m=>`<label class="pickrow"><input type="checkbox" data-id="${m.id}" ${m.taskIds.includes(t.id)?"checked":""} style="width:auto"><div><div>${esc(m.title)}</div><div class="faint" style="font-size:11px">${m.date}${m.team?" · "+esc(m.team):""} · ${esc(m.attendees||"")}</div></div></label>`).join("")}</div>`:`<p class="faint">No meetings yet. Create some in the Meetings section first.</p>`}
    <div class="modal-foot"><button id="m-close" class="primary">Done</button></div></div></div>`;
  const close=()=>{root.innerHTML="";renderDetail();};
  root.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{const m=state.meetings.find(x=>x.id===cb.dataset.id);if(cb.checked){if(!m.taskIds.includes(t.id))m.taskIds.push(t.id);}else m.taskIds=m.taskIds.filter(id=>id!==t.id);touch(m);});
  root.querySelector("#m-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
}

function openTaskModal(existing){
  const t=existing||{};const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>${existing?"Edit demand":"New demand / task"}</h2>
    <div class="grid2"><div class="field"><label>Demand ID</label><input id="m-demand" class="mono" value="${esc(t.demandId)||""}" placeholder="DMND-12345"></div>
      <div class="field"><label>Type</label><select id="m-type">${TASK_TYPES.map(x=>`<option ${x===t.type?"selected":""}>${x}</option>`).join("")}</select></div></div>
    <div class="field"><label>Title</label><input id="m-title" value="${esc(t.title)||""}" placeholder="Short description of the requirement"></div>
    <div class="grid2"><div class="field"><label>◆ Epic</label><select id="m-epic"><option value="">— none —</option>${state.epics.slice().sort((a,b)=>epicLabel(a).localeCompare(epicLabel(b))).map(x=>`<option value="${x.id}" ${(t.epicId||(!existing&&view==="epics"?activeEpicId:""))===x.id?"selected":""}>${esc(epicLabel(x))}</option>`).join("")}</select></div>
      <div class="field"><label>Wave / phase within the epic</label><input id="m-wave" list="dl-wave" value="${esc(t.wave)||""}" placeholder="e.g. Wave 2, Sync to backends"><datalist id="dl-wave">${distinctVals("wave").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></div></div>
    <div class="grid2"><div class="field"><label>Source system</label><select id="m-sys">${systemOptions(existing?t.system:(t.system||state.settings.defaultSystem))}</select></div>
      <div class="field"><label>Client / mandant</label><select id="m-client">${clientOptions(existing?t.system:(t.system||state.settings.defaultSystem),t.client)}</select></div></div>
    <div class="grid2"><div class="field"><label>Project (initiative)</label><input id="m-proj" list="dl-proj" value="${esc(t.project)||""}" placeholder="e.g. Sailpoint integration"><datalist id="dl-proj">${distinctVals("project").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></div>
      <div class="field"><label>Theme (functional area)</label><input id="m-theme" list="dl-theme" value="${esc(t.theme)||""}" placeholder="e.g. Travel, TRem, Payroll"><datalist id="dl-theme">${distinctVals("theme").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></div></div>
    <div class="grid2"><div class="field"><label>Requestor / who asked</label><input id="m-req" list="dl-req" value="${esc(t.requestor)||""}" placeholder="Name / team"><datalist id="dl-req">${distinctVals("requestor").map(v=>`<option value="${esc(v)}">`).join("")}</datalist></div>
      <div class="field"><label>Status</label><select id="m-status">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${k===t.status?"selected":""}>${v.label}</option>`).join("")}</select></div></div>
    <div class="grid2"><div class="field"><label>Received date</label><input type="date" id="m-rec" value="${t.receivedDate||todayStr()}"></div>
      <div class="field"><label>Due date</label><input type="date" id="m-due" value="${t.dueDate||""}"></div></div>
    <div class="grid2"><div class="field"><label>⏳ Waiting on (blocked by)</label><input id="m-wait" list="dl-wait" value="${esc((t.waiting&&t.waiting.on)||"")}" placeholder="blank = not blocked"><datalist id="dl-wait">${WAIT_OPTIONS.map(x=>`<option value="${x}">`).join("")}</datalist></div>
      <div class="field"><label>Waiting since</label><input type="date" id="m-waitsince" value="${(t.waiting&&t.waiting.since)||""}"></div></div>
    <div class="field"><label>👷 Built by <span class="faint" style="font-weight:400;text-transform:none;letter-spacing:0">— someone in your team; none ticked = you</span></label><div id="m-build"></div></div>
    <div class="field"><label>Description</label><textarea id="m-desc">${esc(t.description)||""}</textarea></div>
    <div class="modal-foot"><button id="m-cancel" class="ghost">Cancel</button><button id="m-save" class="primary">${existing?"Save changes":"Create demand"}</button></div></div></div>`;
  const bsel=(t.builders||[]).slice(),bhost=root.querySelector("#m-build"),bdraw=()=>{bhost.innerHTML=builderChipsHTML(bsel);wireBuilderChips(bhost,bsel,bdraw);};bdraw();
  const close=()=>root.innerHTML="";
  /* a stray click outside (or Esc) no longer throws away a half-filled demand */
  let edited=false;const md=root.querySelector(".modal");
  md.addEventListener("input",()=>{edited=true;});md.addEventListener("change",()=>{edited=true;});
  md.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();root.querySelector("#m-save").click();}});
  root.querySelector("#m-cancel").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target!==root.querySelector(".modal-bg"))return;
    if(!edited||confirm(existing?"Discard your changes to this demand?":"Discard this new demand?"))close();};
  {const sy=root.querySelector("#m-sys"),cl=root.querySelector("#m-client");
   sy.onchange=()=>{cl.innerHTML=clientOptions(sy.value,"");};}
  root.querySelector("#m-title").focus();
  root.querySelector("#m-save").onclick=()=>{const g=id=>root.querySelector(id).value;
    const won=g("#m-wait").trim();let wsince=g("#m-waitsince");if(won&&!wsince)wsince=todayStr();if(!won)wsince="";
    const data={demandId:g("#m-demand").trim(),type:g("#m-type"),title:g("#m-title").trim()||"(untitled)",requestor:g("#m-req").trim(),epicId:g("#m-epic"),wave:g("#m-wave").trim(),system:g("#m-sys"),client:g("#m-client"),project:g("#m-proj").trim(),theme:g("#m-theme").trim(),waiting:{on:won,since:wsince},receivedDate:g("#m-rec"),dueDate:g("#m-due"),status:g("#m-status"),description:g("#m-desc")};
    /* a delivered or closed demand moving back: save the rest, then ask why, as the status buttons do */
    const back=existing&&needsComeback(existing,data.status)?data.status:null;if(back)data.status=existing.status;
    if(existing){if(existing.status!==data.status)logTimeline(existing,"status",existing.status,data.status);Object.assign(existing,data);setBuilders(existing,bsel);touch(existing);}
    else{const nt={id:uid(),...data,builders:[...new Set(bsel)],goliveTarget:"",nextAction:{date:"",note:""},notes:"",timeline:[],subtasks:[],objects:[],transports:[],tocs:[],comments:[],reference:[],createdAt:Date.now(),updatedAt:Date.now()};
      logTimeline(nt,"status","",data.status);state.tasks.push(nt);activeId=nt.id;markDirty();}
    close();renderApp();if(back)openComeback(existing,back,()=>renderApp(),()=>renderApp());};
}
function clientsUsedFor(sysId){return [...new Set(state.tasks.filter(t=>t.system===sysId&&t.client).map(t=>t.client))].sort();}
function distinctVals(field){return [...new Set(state.tasks.map(t=>t[field]).filter(Boolean))].sort();}
function logTimeline(t,type,from,to,note){(t.timeline=t.timeline||[]).push({id:uid(),ts:Date.now(),type,from,to,note:note||""});}
function reworkCount(t){return (t.timeline||[]).filter(e=>e.type==="status"&&e.to==="bug").length;}
function deliveredDates(t){return (t.timeline||[]).filter(e=>e.type==="status"&&e.to==="delivered").map(e=>dstr(new Date(e.ts)));}

