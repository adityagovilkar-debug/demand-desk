/* ===================== BENCH DEMANDS: three panes, board, overview, transport map =====================
   The Demands workspace in Bench: list · the demand · a context rail. A board mode lays
   the list out by status (drag to change it) with the demand sliding over it. Overview
   tells the demand's journey; Transports opens on a map of every transport against every
   system on its route. Classic themes keep the original page. */
const TIER_S={"3":"DEV","2":"QA","1":"PRD"};
const penVar=x=>({"3":"var(--pen-2)","2":"var(--pen-4)","1":"var(--pen-3)"})[String(x).slice(-1)]||"var(--pen-5)";
function demandsMode(){return benchOn()&&viewPref("demandsMode","list")==="board"?"board":"list";}
function ctxRailOn(){return viewPref("ctxRail","1")==="1";}
function syncDemandsLayout(){const m=document.querySelector("main");if(!m)return;const b=benchOn()&&view==="demands";
  m.classList.toggle("demands3",b&&demandsMode()==="list");m.classList.toggle("noctx",b&&!ctxRailOn());
  m.classList.toggle("board",b&&demandsMode()==="board");if(!(b&&demandsMode()==="board"))m.classList.remove("open");}
function whenTxt(t){const d=t.dueDate&&!["delivered","closed"].includes(t.status)?daysUntil(t.dueDate):null;
  if(d==null)return t.status==="delivered"?"delivered":t.status==="closed"?"closed":"no due date";
  return d<0?`<span class="late">${-d} d late</span>`:d===0?`<span class="soon">due today</span>`:d<=7?`<span class="soon">in ${d} d</span>`:"due "+shortD(t.dueDate);}
/* one dot per transport: ● complete · ◐ on its way · dashed ○ not released · ○ built, not moved */
function trStripSVG(t){if(!t.transports.length)return "";let s=`<svg width="${t.transports.length*9}" height="9" aria-hidden="true">`;
  t.transports.forEach((tr,i)=>{const x=i*9+4.5,moved=[...reachedSystems(t,tr)].some(z=>z!==tr.system);
    s+=trComplete(t,tr)?`<circle cx="${x}" cy="4.5" r="3.2" style="fill:var(--good)"/>`
      :!tr.released?`<circle cx="${x}" cy="4.5" r="3" style="fill:none;stroke:var(--watch);stroke-dasharray:1.5 1.2"/>`
      :moved?`<circle cx="${x}" cy="4.5" r="3" style="fill:none;stroke:var(--watch)"/><path d="M${x} 1.5 A3 3 0 0 1 ${x} 7.5Z" style="fill:var(--watch)"/>`
      :`<circle cx="${x}" cy="4.5" r="3" style="fill:none;stroke:var(--ink-3)"/>`;});
  return s+"</svg>";}
function btag(txt,pen,title){return `<span class="btag${pen?" pen":""}"${pen?` style="--pen:${pen}"`:""}${title?` title="${esc(title)}"`:""}>${txt}</span>`;}
function demandCardBench(t,grouped,cidx,board){const ep=epicById(t.epicId),nc=openClashCount(t,cidx),na=t.nextAction&&t.nextAction.date&&t.status!=="closed"?t.nextAction:null;
  return `<div class="tcard lr s-${t.status} ${t.id===activeId&&!board?"active":""} ${t.status==="closed"?"closed":""}" data-id="${t.id}" style="--pen:${STATUS_PEN[t.status]}"${board?' draggable="true"':""}>
    <div class="l1"><span>${esc(t.demandId||"no demand id")}</span>${ep&&!grouped?`<span class="ep">◆ ${esc(ep.code||ep.name)}</span>`:""}${t.wave?`<span class="wv">· ${esc(t.wave)}</span>`:""}<span class="when">${whenTxt(t)}</span></div>
    <div class="tt">${esc(t.title)}</div>
    <div class="l3">${board?"":btag(`<i class="pdot"></i>${STATUS[t.status].label}`,STATUS_PEN[t.status])}${t.system&&!board?btag(`${esc(t.system)}<span class="t">${TIER_S[t.system.slice(-1)]||""}</span>${t.client?"·"+esc(t.client):""}`):""}
      ${buildersOf(t).length?btag(`👷 ${esc(builderNames(t))}`,"var(--pen-5)","Built by"):""}${isWaiting(t)?btag(`⏳ ${esc(t.waiting.on)}${waitDays(t)!=null?" "+waitDays(t)+"d":""}`,"var(--watch)"):""}${nc?btag(`⚠ ${nc} clash`,"var(--bad)","Object(s) also in flight in another demand"):""}
      ${na?btag(`⏰ ${na.date===todayStr()?"today":na.date<todayStr()?"due":shortD(na.date)}`,"var(--watch)",na.note):""}${(()=>{const h=efSum(efFor(t.id)),e=+t.estimate||0;return h&&!board?btag(`⏱ ${efFh(h)}${e?"/"+efFh(e):""} h`,e&&h>e?"var(--bad)":"","Hours logged"+(e?" / estimate":"")):"";})()}
      <span class="strip" title="Transports: ● complete · ◐ on its way · ○ built · dashed = not released">${trStripSVG(t)}</span></div></div>`;}

/* ---------- board: the list laid out by status; drag a card to change it ---------- */
function renderBoard(){const host=document.getElementById("boardHost");if(!host)return;
  const v=dvGet(),cidx=clashIndex();
  /* every column stays visible, so a status-based view can't hide the card you just dropped */
  const bv={...v,status:[],hideClosed:false,hideDelivered:false};
  const L=dvSort(state.tasks.filter(dvMatches(bv,cidx)).filter(t=>t.status!=="closed"),v,cidx);
  host.innerHTML=["open","progress","bug","delivered"].map(s=>{const ts=L.filter(t=>t.status===s);
    return `<div class="bcol" data-s="${s}" style="--pen:${STATUS_PEN[s]}"><div class="bh"><i class="pdot"></i><span class="n">${STATUS[s].label}</span><span class="c">${ts.length}</span></div>
      <div class="bl">${ts.map(t=>demandCardBench(t,false,cidx,true)).join("")||`<div class="bempty">Drop a demand here</div>`}</div></div>`;}).join("");
  host.querySelectorAll(".tcard").forEach(c=>{c.onclick=()=>{activeId=c.dataset.id;activeTab="overview";document.querySelector("main").classList.add("open");renderDetail();renderCtxRail();enterPulse("detail");};
    c.ondragstart=e=>{e.dataTransfer.setData("text/plain",c.dataset.id);e.dataTransfer.effectAllowed="move";c.classList.add("drag");};
    c.ondragend=()=>c.classList.remove("drag");});
  host.querySelectorAll(".bcol").forEach(col=>{col.ondragover=e=>{e.preventDefault();col.classList.add("over");};col.ondragleave=()=>col.classList.remove("over");
    col.ondrop=e=>{e.preventDefault();col.classList.remove("over");const t=state.tasks.find(x=>x.id===e.dataTransfer.getData("text/plain"));if(!t||t.status===col.dataset.s)return;
      if(needsComeback(t,col.dataset.s)){openComeback(t,col.dataset.s,()=>{renderBoard();renderStats();if(activeId===t.id)renderDetail();},()=>renderBoard());return;}
      logTimeline(t,"status",t.status,col.dataset.s);t.status=col.dataset.s;touch(t);renderBoard();renderStats();
      const c=host.querySelector(`.tcard[data-id="${t.id}"]`);if(c&&motionOn())c.classList.add("land");
      if(activeId===t.id)renderDetail();toast(`${demandLabel(t)} → ${STATUS[t.status].label} · logged in History`);};});}
function setDemandsMode(m){setViewPref("demandsMode",m);syncDemandsLayout();renderDemandSidebar();renderDetail();renderCtxRail();}

/* ---------- context rail: what you glance at while working ---------- */
function renderCtxRail(){const host=document.getElementById("cxr");if(!host)return;
  if(!(benchOn()&&view==="demands")){host.innerHTML="";return;}
  const t=activeTask();if(!t){host.innerHTML=`<div class="cx-in"><div class="bempty" style="padding:30px 0">Pick a demand to see its context.</div></div>`;return;}
  const ep=epicById(t.epicId),na=t.nextAction&&t.nextAction.date?t.nextAction:null,nad=na?daysUntil(na.date):0;
  const refs=(t.reference||[]),pins=refs.filter(r=>r.pinned),show=(pins.length?pins:refs).slice(0,4);
  const links=[...meetingsForTask(t.id).map(m=>({k:"meeting",id:m.id,t:m.title,d:m.date,pen:"var(--pen-4)"})),...journalForTask(t.id).map(j=>({k:"journal",id:j.id,t:j.title||"Journal "+j.date,d:j.date,pen:"var(--pen-3)"})),
    ...debugForTask(t.id).map(s=>({k:"debug",id:s.id,t:s.title,d:isoTs(s.updatedAt),pen:"var(--pen-1)"}))].sort((a,b)=>b.d.localeCompare(a.d));
  const imgs=imagesFor("demand",t.id),dn=t.dueDate&&!["delivered","closed"].includes(t.status)?daysUntil(t.dueDate):null;
  host.innerHTML=`<div class="cx-in">
    <div class="ck-unit cxs" style="--pen:var(--watch)"><div class="ck-head"><h2>Next action</h2><span class="ck-meta">${na?(nad<0?(-nad)+" d ago":nad===0?"today":"in "+nad+" d"):""}</span></div>
      ${na?`<div class="nx"><canvas class="nxc"></canvas><div><div class="t">${esc(na.note||"(no note)")}</div><div class="w mono">${na.date}</div></div></div><div class="cxa"><button class="sm" id="cxNaDone">✓ Done</button><button class="sm ghost" id="cxNaEdit">✎ Change</button></div>`
        :`<button class="sm" id="cxNaSet" style="width:100%">⏰ When should this come back up?</button>`}
      ${(()=>{const tr=nextActionTrail(t);return tr.length?`<div class="cx-natr"><div class="h">Done so far · ${tr.length}</div>${tr.slice(0,5).map(x=>`<div class="r"><span class="k">✓</span><span class="s" title="${esc(x.note)}">${esc(x.note)}</span><span class="d">${shortD(isoTs(x.ts))}</span></div>`).join("")}${tr.length>5?`<a class="cxl" data-tab="history">+ ${tr.length-5} earlier in History ›</a>`:""}</div>`:"";})()}</div>
    <div class="ck-unit cxs"><div class="ck-head"><h2>Facts</h2><a class="cxl" id="cxEdit">✎ edit</a></div><div class="kv">
      <span class="k">System</span><span class="v mono">${t.system?esc(t.system)+" · "+(TIER_S[t.system.slice(-1)]||"")+(t.client?" / "+esc(t.client):""):"—"}</span>
      ${ep?`<span class="k">Epic</span><span class="v"><a class="cxl ep" id="cxEpic">◆ ${esc(ep.code||ep.name)}${t.wave?" · "+esc(t.wave):""}</a></span>`:""}
      <span class="k">Requestor</span><span class="v">${esc(t.requestor)||"—"}</span>
      <span class="k">Built by</span><span class="v"><a class="cxl" id="cxBuild" title="Who's building it — someone in your team, or you">👷 ${buildersOf(t).length?esc(builderNames(t)):"you"}</a></span>
      ${t.project?`<span class="k">Project</span><span class="v">▦ ${esc(t.project)}</span>`:""}${t.theme?`<span class="k">Theme</span><span class="v">${esc(t.theme)}</span>`:""}
      <span class="k">Type</span><span class="v">${esc(t.type)}</span>
      <span class="k">Received</span><span class="v mono">${t.receivedDate||"—"}</span>
      <span class="k">Due</span><span class="v mono ${dn!=null&&dn<0?"late":""}">${t.dueDate||"—"}</span>
      <span class="k">Go-live</span><span class="v mono">${esc(goliveTargetFor(t))||"—"}${t.transports.some(tr=>trDest(t,tr).length)?" <span class='dim'>+ own routes</span>":""}</span>
      ${isWaiting(t)?`<span class="k">Waiting on</span><span class="v soon">${esc(t.waiting.on)}${waitDays(t)!=null?" · "+waitDays(t)+" d":""}</span>`:""}</div></div>
    <div class="ck-unit cxs"><div class="ck-head"><h2>Reference</h2><a class="cxl" data-tab="reference">${refs.length?"all "+refs.length+" ›":"＋ add ›"}</a></div>
      ${show.map(r=>`<div class="rf" data-id="${r.id}"><span class="l">${r.pinned?"📌 ":""}${esc(r.label)||"(no label)"}</span><span class="v">${r.secret?"••••••••":linkify(r.value)}</span><button class="ghost sm c" title="Copy">📋</button></div>`).join("")||`<div class="bempty">URLs, endpoints, test data — pin the ones you need often.</div>`}</div>
    <div class="ck-unit cxs"><div class="ck-head"><h2>Linked</h2><a class="cxl" data-tab="calls">${links.length?links.length+" · link ›":"＋ link ›"}</a></div>
      ${links.slice(0,6).map(l=>`<div class="lk" data-k="${l.k}" data-id="${l.id}" style="--pen:${l.pen}"><i></i><span class="t">${esc(l.t)}</span><span class="d">${shortD(l.d)}</span></div>`).join("")||`<div class="bempty">No meetings, journal or debug sessions linked.</div>`}</div>
    <div class="ck-unit cxs"><div class="ck-head"><h2>Images</h2><a class="cxl" data-tab="images">${imgs.length?"all "+imgs.length+" ›":"Ctrl V to paste"}</a></div>
      ${imgs.length?`<div class="thumbs">${imgs.slice(0,6).map(im=>`<div data-id="${im.id}" title="${esc(im.label||im.file)}"><span>${esc(im.label||im.file)}</span></div>`).join("")}</div>`:`<div class="bempty">Snip with Win+Shift+S, then Ctrl+V anywhere on this demand.</div>`}</div>${notesRailHTML(t)}</div>`;
  const q=s=>host.querySelector(s);wireNotesRail(host,t);
  if(q("#cxNaDone"))q("#cxNaDone").onclick=()=>nextActionDone(t);
  if(q("#cxNaEdit"))q("#cxNaEdit").onclick=()=>openNextAction(t);
  if(q("#cxBuild"))q("#cxBuild").onclick=()=>openBuilders(t);
  if(q("#cxNaSet"))q("#cxNaSet").onclick=()=>openNextAction(t);
  q("#cxEdit").onclick=()=>openTaskModal(t);
  if(q("#cxEpic"))q("#cxEpic").onclick=()=>{view="epics";activeEpicId=t.epicId;epicTab="overview";renderApp();};
  host.querySelectorAll(".cxl[data-tab]").forEach(a=>a.onclick=()=>{activeTab=a.dataset.tab;renderDetail();enterPulse("detail");});
  host.querySelectorAll(".rf .c").forEach(b=>b.onclick=()=>{const r=refs.find(x=>x.id===b.parentElement.dataset.id);navigator.clipboard.writeText(r.value).then(()=>toast("Copied")).catch(()=>toast("Copy failed",true));});
  host.querySelectorAll(".lk:not(.cx-note)").forEach(el=>el.onclick=()=>{const k=el.dataset.k,id=el.dataset.id;
    if(k==="meeting"){view="meetings";meetingRollup=false;activeMeetingId=id;}else if(k==="journal"){view="journal";journalTodos=false;activeJournalId=id;}else{view="debug";activeDebugId=id;}renderApp();});
  host.querySelectorAll(".thumbs [data-id]").forEach(el=>{const im=state.images.find(x=>x.id===el.dataset.id);if(!im)return;
    el.onclick=()=>openImageLightbox(im);imgUrl(im).then(u=>{if(u){el.style.backgroundImage=`url("${u}")`;el.classList.add("has");}});});
  const nx=q(".nxc");if(nx)DK.scope(nx,drawTick);}

/* ---------- Overview: the journey, the two notes, four instruments, the latest ---------- */
function avgLeadDays(){const L=[];state.tasks.forEach(t=>{const f=(t.timeline||[]).filter(e=>e.type==="status"&&e.to==="delivered").map(e=>e.ts).sort((a,b)=>a-b)[0];
  if(f&&t.receivedDate){const d=Math.floor((f-new Date(t.receivedDate+"T00:00:00").getTime())/864e5);if(d>=0)L.push(d);}});return L.length?Math.round(L.reduce((a,b)=>a+b,0)/L.length):null;}
function statusHistory(t){const h=(t.timeline||[]).filter(e=>e.type==="status").map(e=>({d:isoTs(e.ts),s:e.to})).sort((a,b)=>a.d.localeCompare(b.d));
  const start=t.receivedDate||(h[0]&&h[0].d)||isoTs(t.createdAt);
  if(!h.length||h[0].d>start)h.unshift({d:start,s:h.length?"open":t.status});return h;}
function renderOverview(body,t){
  const avg=avgLeadDays(),hs=statusHistory(t),loops=hs.filter(h=>h.s==="bug").length,fin=journeyFinish(t,hs);
  const sd=countSubs(t.subtasks),nComp=t.transports.filter(tr=>trComplete(t,tr)).length,clashN=openClashCount(t);
  /* a finished demand's age stops at its finish ("took N days"), a live one keeps counting */
  const endMs=fin?new Date(fin+"T00:00:00").getTime():Date.now(),age=Math.max(0,Math.floor((endMs-(t.receivedDate?new Date(t.receivedDate+"T00:00:00").getTime():t.createdAt))/864e5));
  const overdueSubs=(function c(a){return a.reduce((n,s)=>n+(!s.done&&s.dueDate&&s.dueDate<todayStr()?1:0)+c(s.children),0);})(t.subtasks);
  const feed=[...(t.timeline||[]).map(e=>isChange(e)?{ts:e.ts,pen:"var(--accent2)",h:`<b>🔄 Requirement changed</b> <span class="dim">→ ${STATUS[e.to]?STATUS[e.to].label:esc(e.to)}${e.note?" · "+esc(e.note):""}</span>`}:e.type==="status"?{ts:e.ts,pen:STATUS_PEN[e.to]||"var(--faint)",h:`<b>${STATUS[e.to]?STATUS[e.to].label:esc(e.to)}</b>${e.from?` <span class="dim">from ${STATUS[e.from]?STATUS[e.from].label:esc(e.from)}</span>`:" <span class='dim'>— created</span>"}`}:{ts:e.ts,pen:"var(--accent2)",h:esc(e.note)}),
    ...(t.comments||[]).map(c=>({ts:c.ts,pen:"var(--ink-3)",h:linkify(c.text)})),
    ...t.transports.flatMap(tr=>tr.syncs.filter(s=>s.system&&s.date).map(s=>({ts:new Date(s.date+"T12:00:00").getTime(),pen:"var(--good)",h:`<b class="mono">${esc(tr.number||"(TR)")}</b> reached ${esc(s.system)}`})))]
    .sort((a,b)=>b.ts-a.ts).slice(0,7);
  body.innerHTML=`
    <div class="bsec jr"><div class="sec-title"><h3>Journey</h3><div class="ln"></div><span class="faint mono" style="font-size:10.5px">received ${t.receivedDate||"—"} · ${fin?`took ${age} days · finished ${fin}`:`${age} days`}${loops?` · ${loops} rework loop${loops>1?"s":""}`:""}</span></div><canvas class="jcv${efFor(t.id).length?" ef":""}"></canvas></div>
    <div class="grid2">
      <div class="field"><label>What is to be done</label><textarea id="fDesc" placeholder="Scope, requirement summary, acceptance criteria…">${esc(t.description)}</textarea></div>
      <div class="field"><label>Where it stands · working notes</label><textarea id="fNotes" placeholder="Running notes, blockers, who asked, decisions…">${esc(t.notes)}</textarea></div></div>
    <div id="n-links" style="margin:-4px 0 12px">${linkChips((t.description||"")+" "+(t.notes||""))}</div>
    <div class="ov4">
      <div class="ck-unit ins" data-tab="work"><canvas data-k="subs" data-f="${sd.n?sd.done/sd.n:0}"></canvas><div><div class="k">Subtasks</div><div class="v">${sd.done}<small>/ ${sd.n}</small></div><div class="s ${overdueSubs?"late":""}">${sd.n?(overdueSubs?overdueSubs+" overdue":"on track"):"none yet"}</div></div></div>
      <div class="ck-unit ins" data-tab="transports"><canvas data-k="trs" data-f="${t.transports.length?nComp/t.transports.length:0}"></canvas><div><div class="k">Transports</div><div class="v">${nComp}<small>/ ${t.transports.length} complete</small></div><div class="s">${t.transports.filter(x=>!x.released).length} not released</div></div></div>
      <div class="ck-unit ins" data-tab="objects"><canvas data-k="obj" data-f="${t.objects.length?clashN/t.objects.length:0}"></canvas><div><div class="k">Objects</div><div class="v">${t.objects.length}<small>logged</small></div><div class="s ${clashN?"late":""}">${clashN?clashN+" in a clash":"no clashes"}</div></div></div>
      <div class="ck-unit ins" data-tab="history"><canvas data-k="age" data-f="${avg?Math.min(1,age/(avg*2)):0}"></canvas><div><div class="k">${fin?"Took":"Age"}</div><div class="v">${age}<small>d${avg!=null?" · avg lead "+avg:""}</small></div><div class="s ${avg!=null&&age>avg&&!["delivered","closed"].includes(t.status)?"soon":""}">${avg==null?"no delivered demands yet":age>avg?"longer than your usual":"within your usual"}</div></div></div>
      ${(()=>{const h=efSum(efFor(t.id)),e=+t.estimate||0;return `<div class="ck-unit ins" data-tab="effort"><canvas data-k="eff" data-f="${e?Math.min(1,h/e):0}" data-over="${e&&h>e?1:0}"></canvas><div><div class="k">Effort</div><div class="v">${efFh(h)}<small>${e?"/ "+efFh(e)+" h":"h logged"}</small></div><div class="s ${e&&h>e?"late":""}">${e?(h>e?efFh(h-e)+" h over estimate":efFh(e-h)+" h left"):h?"no estimate yet":"nothing logged yet"}</div></div></div>`;})()}</div>
    <div class="bsec"><div class="sec-title"><h3>Latest</h3><div class="ln"></div><span class="faint" style="font-size:10.5px">status · notes · comments · transport moves</span></div>
      ${feed.map(f=>`<div class="fe" style="--pen:${f.pen}"><span class="d">${shortD(isoTs(f.ts))}</span><i></i><span>${f.h}</span></div>`).join("")||`<div class="bempty">Nothing yet.</div>`}
      <div class="compose"><textarea id="ovCmt" rows="1" placeholder="Add a comment… (Ctrl+Enter)"></textarea><button class="sm primary" id="ovPost">Post</button></div></div>
    <div class="bsec" id="lsHost"></div>`;
  const updNL=()=>{body.querySelector("#n-links").innerHTML=linkChips((t.description||"")+" "+(t.notes||""));};
  body.querySelector("#fDesc").onchange=e=>{t.description=e.target.value;touch(t);updNL();};
  body.querySelector("#fNotes").onchange=e=>{t.notes=e.target.value;touch(t);updNL();};
  const post=()=>{const ta=body.querySelector("#ovCmt"),v=ta.value.trim();if(!v)return;(t.comments=t.comments||[]).push({id:uid(),text:v,ts:Date.now()});touch(t);renderOverview(body,t);};
  body.querySelector("#ovPost").onclick=post;body.querySelector("#ovCmt").onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")post();};
  body.querySelectorAll(".ins[data-tab]").forEach(u=>u.onclick=()=>{activeTab=u.dataset.tab;renderDetail();enterPulse("detail");});
  body.querySelectorAll(".ins canvas").forEach(cv=>{const f=+cv.dataset.f,k=cv.dataset.k,st={v:motionOn()?0:f};
    DK.scope(cv,(c,w,h)=>{const {C}=DK;st.v+=(f-st.v)*.05;const col=k==="obj"?(f>0?C.bad:C["pen-2"]):k==="age"?(f>.5?C.watch:C.good):k==="eff"?(+cv.dataset.over?C.bad:C.good):k==="trs"?C.good:C["pen-2"];
      if(k==="age"||k==="eff")DK.dotArc(c,w/2,h/2+4,w/2-5,st.v,22,col,1.8);else DK.dotRing(c,w/2,h/2,w/2-5,st.v,30,col);});});
  renderLessons(body.querySelector("#lsHost"),t);
  DK.scope(body.querySelector(".jcv"),journeyDraw(t));}
/* the demand's life on a date line: status stretches, rework loops, transports landing, due, today */
function journeyDraw(t){return (c,w,h,tm,dt,s)=>{const {dot,ring,label,C}=DK,mv=motionOn();
  const hs=statusHistory(t),pen=k=>C[STATUS_CK[k]]||C["ink-3"],ms=d=>new Date(d+"T00:00:00").getTime();
  /* a finished demand's line ends at its last event, not at today — otherwise an old closed demand is a speck on the left */
  const fin=journeyFinish(t,hs),t0=ms(hs[0].d);
  const tLast=fin?ms(fin):Math.max(Date.now(),t.dueDate?ms(t.dueDate):0),tEnd=tLast+Math.max(864e5,(tLast-t0)*.04);
  const X=d=>28+(w-56)*((ms(d)-t0)/Math.max(1,tEnd-t0)),y=h*(h>=180?.40:.44);
  const prog=mv?Math.min(1,(performance.now()-s.born)/1400):1,xMax=28+(w-56)*(1-Math.pow(1-prog,3)),today=todayStr(),xNow=fin?Infinity:X(today);
  for(let x=28;x<=w-28;x+=6)dot(c,x,y,.8,C["ink-4"]);
  hs.forEach((e,i)=>{const a=Math.min(X(e.d),xMax),b=Math.min(i<hs.length-1?X(hs[i+1].d):(t.status==="closed"?X(e.d)+2:fin?Math.max(X(e.d)+2,X(fin)):xNow),xMax);if(b<=a)return;
    c.globalAlpha=.85;c.strokeStyle=pen(e.s);c.lineWidth=3;c.beginPath();c.moveTo(a,y);c.lineTo(b,y);c.stroke();});
  const occ=[];
  if(t.dueDate){const xd=X(t.dueDate);occ.push({x0:xd-12,x1:xd+12,y0:y-36,y1:y-24});}
  if(xNow<=xMax)occ.push({x0:xNow-18,x1:xNow+18,y0:y+34,y1:y+46});
  hs.forEach((e,i)=>{if(e.s!=="bug")return;const prev=hs.slice(0,i).reverse().find(x=>x.s==="delivered");if(!prev)return;const a=X(prev.d),b=X(e.d);if(b>xMax)return;
    c.globalAlpha=.6;c.strokeStyle=C.bad;c.lineWidth=1.2;c.setLineDash([3,3]);c.beginPath();c.moveTo(b,y-4);c.quadraticCurveTo((a+b)/2,y-44,a,y-4);c.stroke();c.setLineDash([]);
    label(c,"rework",(a+b)/2,y-30,{size:8,color:C.bad});occ.push({x0:(a+b)/2-18,x1:(a+b)/2+18,y0:y-36,y1:y-24});});
  changeEvents(t).forEach((ev,i)=>{const x=X(isoTs(ev.ts));if(x>xMax)return;c.globalAlpha=.75;c.strokeStyle=C["pen-5"];c.lineWidth=1.2;c.setLineDash([2,3]);c.beginPath();c.moveTo(x,y-40);c.lineTo(x,y+8);c.stroke();c.setLineDash([]);
    label(c,"REQUIREMENT CHANGED · ROUND "+(i+2),x+4,y-44,{size:7.5,color:C["pen-5"],align:"left"});});
  const LANES=[[18,28],[-16,-26],[-42,-52],[44,54]];
  hs.forEach(e=>{const x=X(e.d);if(x>xMax)return;dot(c,x,y,4.2,C.paper);dot(c,x,y,3.4,pen(e.s));
    const st=(STATUS[e.s]?STATUS[e.s].label.split(" /")[0]:e.s).toUpperCase(),dt2=shortD(e.d),hw=Math.max(st.length*5.4,dt2.length*5.2)/2+3;
    let ln=LANES.find(([a,b])=>{const y0=y+Math.min(a,b)-6,y1=y+Math.max(a,b)+6;return !occ.some(o=>x-hw<o.x1&&x+hw>o.x0&&y0<o.y1&&y1>o.y0);})||LANES[0];
    occ.push({x0:x-hw,x1:x+hw,y0:y+Math.min(...ln)-6,y1:y+Math.max(...ln)+6});
    label(c,st,x,y+ln[0],{size:7.5,color:pen(e.s)});
    label(c,dt2,x,y+ln[1],{font:DK.MONO,size:8,weight:400});});
  t.transports.forEach((tr,k)=>tr.syncs.forEach(sy=>{if(!sy.date)return;const x=X(sy.date);if(x>xMax||x<28)return;const yy=h-16-(k%3)*7;
    c.globalAlpha=.35;c.strokeStyle=C.good;c.lineWidth=1;c.beginPath();c.moveTo(x,y+6);c.lineTo(x,yy);c.stroke();dot(c,x,yy,2.2,C.good);}));
  if(t.transports.some(tr=>tr.syncs.some(sy=>sy.date)))label(c,"TRANSPORTS LANDING",28,h-3,{size:7,align:"left"});
  journeyEffort(c,w,h,t,X,xMax,label);
  if(t.dueDate){const xd=X(t.dueDate);if(xd<=xMax){c.globalAlpha=.8;c.strokeStyle=C.bad;c.lineWidth=1;c.beginPath();c.moveTo(xd,y-24);c.lineTo(xd,y+10);c.stroke();label(c,"DUE",xd,y-30,{size:7.5,color:C.bad});}}
  if(xNow<=xMax){const pl=mv?(Math.sin(tm*.004)+1)/2:0;ring(c,xNow,y,6+pl*5,C.ink,.4*(1-pl));dot(c,xNow,y,2.4,C.ink);label(c,"TODAY",xNow,y+40,{size:7.5,color:C.ink});}
  else if(fin&&prog>=1){const n=Math.round((ms(today)-ms(fin))/864e5);if(n>0)label(c,`TODAY +${n}D →`,w-28,y+40,{size:7.5,color:C["ink-4"],align:"right"});}};}
/* the last dated thing a delivered/closed demand did (status change or transport landing); null while it's still live */
function journeyFinish(t,hs){if(!["delivered","closed"].includes(t.status))return null;const today=todayStr();
  let d=hs[hs.length-1].d;const see=x=>{if(x&&x<=today&&x>d)d=x;};
  t.transports.forEach(tr=>tr.syncs.forEach(s=>see(s.date)));(t.tocs||[]).forEach(c=>c.syncs.forEach(s=>see(s.date)));return d;}

/* ---------- Work: subtasks beside comments ---------- */
function renderWorkBench(body,t){const sd=countSubs(t.subtasks);
  body.innerHTML=`<div class="wk2">
    <div><div class="sec-title"><h3>Subtasks</h3><div class="ln"></div><span class="faint mono" style="font-size:10.5px">${sd.done}/${sd.n} done</span><button class="sm" id="addRoot">＋ Add subtask</button></div><div class="tree" id="tree"></div></div>
    <div><div class="sec-title"><h3>Comments</h3><div class="ln"></div><span class="faint mono" style="font-size:10.5px">${(t.comments||[]).length}</span></div><div id="taskCmts"></div></div></div>`;
  body.querySelector("#addRoot").onclick=()=>{t.subtasks.push(mkSub());touch(t);renderDetail();};
  renderTree(body.querySelector("#tree"),t,t.subtasks);
  renderComments(body.querySelector("#taskCmts"),t,()=>touch(t));}

/* ---------- Transports: every transport against every system on its route ---------- */
const trOpen=new Set();   /* transport cards expanded for editing (Bench) */
function trRouteSystems(t,tr){const own=trDest(t,tr),L=landscapeOf(tr.system);return own.length?[tr.system,...own.filter(x=>x!==tr.system)]:(L?routeTiers().map(d=>L+d):[]);}
function drawTrMap(host,t,onPick){if(!host)return;
  if(!t.transports.length){host.innerHTML="";return;}
  const cols=[];const add=x=>{if(x&&!cols.includes(x))cols.push(x);};
  t.transports.forEach(tr=>{trRouteSystems(t,tr).forEach(add);tr.syncs.forEach(s=>add(s.system));});(t.tocs||[]).forEach(c=>c.syncs.forEach(s=>add(s.system)));
  cols.sort((a,b)=>landscapeOf(a).localeCompare(landscapeOf(b))||String(b).slice(-1).localeCompare(String(a).slice(-1)));
  const lands=[];cols.forEach(x=>{const L=landscapeOf(x),g=lands.find(y=>y.L===L);if(g)g.n++;else lands.push({L,n:1});});
  const first=cols.map((x,i)=>i>0&&landscapeOf(x)!==landscapeOf(cols[i-1]));
  const cell=(tr,x,ri,ci)=>{const R=new Map();effectiveSyncs(t,tr).forEach(sy=>{if(!R.has(sy.system))R.set(sy.system,{d:sy.date,via:sy.via});});const T=trTargets(t,tr),onRoute=trRouteSystems(t,tr).includes(x),tg=T.includes(x);
    if(x===tr.system)return `<span class="cell origin" style="--pen:${penVar(x)}" title="Origin ${esc(x)}"><i></i></span>`;
    if(R.has(x)){const r=R.get(x);return `<span class="cell reach ${tg?"tgt":""}" style="--pen:${penVar(x)};--d:${80+ri*60+ci*35}ms" title="Reached ${esc(x)}${r.d?" "+r.d:""}${r.via?" (via ToC "+esc(r.via)+")":""}"><i></i>${r.d?`<span class="dt">${shortD(r.d)}</span>`:""}</span>`;}
    if(onRoute||tg)return `<span class="cell pend ${tg?"tgt":""}" style="--pen:${penVar(x)}" title="${tg?"Destination":"On the route"} — not reached yet"><i></i></span>`;
    return `<span class="cell none"><i></i></span>`;};
  const row=(tr,mem)=>{const i=t.transports.indexOf(tr),miss=trMissing(t,tr);
    return `<tr class="mtr ${mem?"mem":""} ${trOpen.has(tr.id)?"sel":""}" data-id="${tr.id}"><td class="sq">${p2(i+1)}</td><td><span class="nm">${esc(tr.number||"(unnumbered)")}</span>${isCust(tr)?btag("cust"+(tr.client?" · "+esc(tr.client):""),"var(--teal)"):""}${!tr.released?btag("not released","var(--watch)"):""}<div class="ds">${esc(tr.desc||"")}</div></td>
      ${cols.map((x,ci)=>`<td class="c ${first[ci]?"sepL":""}">${cell(tr,x,i,ci)}</td>`).join("")}
      <td class="st">${trComplete(t,tr)?`<span class="good">✓ complete</span>`:trTargets(t,tr).length?(miss.length>3?`<span class="soon" title="Still to reach: ${esc(miss.join(", "))}">→ ${miss.length} systems to go</span>`:`<span class="soon">→ ${esc(miss.join(" · "))}</span>`):`<span class="dim">no target</span>`}</td></tr>`;};
  let rows="";const inToc=new Set();
  (t.tocs||[]).forEach(c=>{const mem=t.transports.filter(x=>x.tocId===c.id);mem.forEach(m=>inToc.add(m.id));
    rows+=`<tr class="toc"><td class="sq">ToC</td><td><span class="nm">${esc(c.number||"(unnumbered ToC)")}</span>${btag("bundles "+mem.length,"var(--accent2)")}<div class="ds">${esc(c.desc||"")}</div></td>
      ${cols.map((x,ci)=>{const hit=c.syncs.find(s=>s.system===x);return `<td class="c ${first[ci]?"sepL":""}">${hit?`<span class="cell reach" style="--pen:var(--accent2);--d:${ci*40}ms" title="ToC reached ${esc(x)} ${hit.date||""}"><i></i>${hit.date?`<span class="dt">${shortD(hit.date)}</span>`:""}</span>`:`<span class="cell none"><i></i></span>`}</td>`;}).join("")}<td></td></tr>`;
    mem.forEach(m=>rows+=row(m,true));});
  t.transports.forEach(tr=>{if(!inToc.has(tr.id))rows+=row(tr,false);});
  host.innerHTML=`<div class="bsec trmap"><div class="sec-title"><h3>Transport map</h3><div class="ln"></div><span class="faint" style="font-size:10.5px">click a transport to edit it below</span></div>
    <div style="overflow-x:auto"><table class="mx ${cols.length>7?"dense":""}" style="min-width:${Math.round(24+210+cols.length*(cols.length>7?40:58)+130)}px"><thead><tr><th></th><th></th>${lands.map((g,gi)=>`<th class="land ${gi?"sepL":""}" colspan="${g.n}">${esc(g.L)} landscape</th>`).join("")}<th></th></tr>
      <tr><th>#</th><th>Transport</th>${cols.map((x,ci)=>`<th class="mxs ${first[ci]?"sepL":""}">${esc(x)}<small>${TIER_S[String(x).slice(-1)]||""}</small></th>`).join("")}<th style="text-align:right">Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="mxleg"><span><span class="cell origin" style="--pen:var(--pen-2)"><i></i></span>origin</span><span><span class="cell reach" style="--pen:var(--pen-3)"><i></i></span>reached</span><span><span class="cell pend" style="--pen:var(--pen-4)"><i></i></span>on its way</span><span><span class="cell pend tgt" style="--pen:var(--pen-3)"><i></i></span>destination</span><span style="color:var(--accent2)">▌ a ToC brackets the transports it bundles</span></div></div>`;
  host.querySelectorAll("tr.mtr").forEach(r=>r.onclick=()=>onPick(r.dataset.id));}

/* ---------- keys: ↑↓ through the list, 1–6 for the main tabs ---------- */
document.addEventListener("keydown",e=>{
  if(!benchOn()||view!=="demands"||screenLocked||pendingEncrypted||e.ctrlKey||e.metaKey||e.altKey)return;
  if(document.querySelector("#modalRoot .modal-bg"))return;
  const a=document.activeElement;if(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))return;
  if(e.key==="Escape"&&document.querySelector("main.board.open")){document.querySelector("main").classList.remove("open");return;}
  if((e.key==="ArrowDown"||e.key==="ArrowUp")&&demandsMode()==="list"){const ids=[...document.querySelectorAll("#taskList .tcard")].map(c=>c.dataset.id);if(!ids.length)return;
    const i=ids.indexOf(activeId),n=ids[Math.max(0,Math.min(ids.length-1,i<0?0:i+(e.key==="ArrowDown"?1:-1)))];
    if(n&&n!==activeId){e.preventDefault();activeId=n;document.querySelectorAll("#taskList .tcard").forEach(c=>c.classList.toggle("active",c.dataset.id===n));
      const c=document.querySelector(`#taskList .tcard[data-id="${n}"]`);if(c)c.scrollIntoView({block:"nearest"});renderDetail();renderCtxRail();enterPulse("detail");}}
  if(/^[1-6]$/.test(e.key)){const k=["overview","work","objects","transports","effort","history"][+e.key-1];if(activeTask()&&k!==activeTab){activeTab=k;renderDetail();enterPulse("detail");}}});

