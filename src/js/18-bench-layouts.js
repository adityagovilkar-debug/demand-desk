/* ===================== BENCH LAYOUTS: pages, panels, story =====================
   Bench gives the Demand and Epic pages their own header (ID line, title, readouts,
   status control, bands) and the Epic overview its story-first layout. Every other
   view keeps its renderer: Bench frames each titled section as a panel on the live
   page (wrapSections), so all editing code stays exactly the same in every theme. */
const U=(v,u)=>`${v}<small>${u}</small>`;
/* "03 Jul" this year, "03 Jul 25" otherwise — readouts stay short enough not to clip */
const shortD=s=>{if(!s)return "—";const d=new Date(s+"T00:00:00");return d.toLocaleDateString("en-GB",d.getFullYear()===new Date().getFullYear()?{day:"2-digit",month:"short"}:{day:"2-digit",month:"short",year:"2-digit"});};
function roHTML(items,cls){return `<div class="bro ${cls||""}">${items.filter(Boolean).map(x=>`<div class="bro-i ${x.cls||""}"${x.title?` title="${esc(x.title)}"`:""}><span class="k">${x.k}</span><span class="v">${x.v}</span></div>`).join("")}</div>`;}
function dotBarSVG(frac,n=12,pen="var(--ink)"){let s=`<svg class="dbar" width="${n*5}" height="6" aria-hidden="true">`;const lit=Math.round(Math.max(0,Math.min(1,frac||0))*n);
  for(let i=0;i<n;i++)s+=i<lit?`<circle cx="${i*5+2.5}" cy="3" r="2" style="fill:${pen}"/>`:`<circle cx="${i*5+2.5}" cy="3" r="1.1" style="fill:var(--ink-4)"/>`;return s+"</svg>";}
/* a clock face of dots filling toward the next action */
function drawTick(ctx,w,h,t){const {dot,C,TAU}=DK,cx=w/2,cy=h/2,R=Math.min(w,h)/2-3,sec=motionOn()?((t/1000)%60)/60:.25;
  for(let i=0;i<24;i++){const a=-Math.PI/2+i/24*TAU,on=i/24<=sec;dot(ctx,cx+Math.cos(a)*R,cy+Math.sin(a)*R,on?1.5:.9,on?C.watch:C["ink-4"]);}
  const a=-Math.PI/2+sec*TAU;ctx.globalAlpha=.7;ctx.strokeStyle=C.watch;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*(R-4),cy+Math.sin(a)*(R-4));ctx.stroke();dot(ctx,cx,cy,1.5,C.watch);}

/* ---------- Demand page header ---------- */
function demandHeadBench(t,sub,lc){
  const ep=epicById(t.epicId),open=!["delivered","closed"].includes(t.status),dn=t.dueDate&&open?daysUntil(t.dueDate):null;
  const tgt=goliveTargetFor(t),ownDest=t.transports.some(tr=>trDest(t,tr).length),at=t.transports.filter(tr=>trComplete(t,tr)).length;
  const fin=benchOn()?journeyFinish(t,statusHistory(t)):null;   /* finished demands stop ageing at their last event */
  const age=Math.max(0,Math.floor(((fin?new Date(fin+"T00:00:00").getTime():Date.now())-(t.receivedDate?new Date(t.receivedDate+"T00:00:00").getTime():t.createdAt))/864e5));
  const na=t.nextAction&&t.nextAction.date&&t.status!=="closed"?t.nextAction:null,nad=na?daysUntil(na.date):0;
  const cl=taskClashes(t).filter(x=>x.open.length),rw=reworkCount(t),nClash=openClashCount(t);
  return `<div class="detail-head bhead" style="--pen:${STATUS_PEN[t.status]}">
    <div class="bh-top"><div class="bh-l">
        <div class="bh-no"><span class="bh-id">${esc(t.demandId||"no demand id")}</span>${ep?` · <a class="ep-go" title="Open the epic">◆ ${esc(ep.code||ep.name)}</a>`:""}${t.wave?` · ${esc(t.wave)}`:""}</div>
        <h1>${esc(t.title)}</h1>
        <div class="bh-sub">${esc(t.type)}${t.requestor?` · asked by ${esc(t.requestor)}`:""}${buildersOf(t).length?` · 👷 built by ${esc(builderNames(t))}`:""}${t.project?` · ▦ ${esc(t.project)}`:""}${t.theme?` · ${esc(t.theme)}`:""}</div></div>
      <div class="bh-acts">${statusSegHTML(t)}
        <div class="bh-btns"><button class="sm" id="btnNext" title="When should this demand come back up on Today?">⏰ Next action</button><button class="sm" id="dhWin" title="Note a win about this demand (W)">🏆 Win</button><button class="sm" id="btnSpec" title="Generate post-delivery technical spec">📄 Tech spec</button><button class="sm" id="btnEditTask">✎ Edit</button><button class="sm ghost danger" id="btnDelTask" title="Delete this demand">🗑</button>${demandsMode()==="list"?`<button class="sm cx-t" id="cxToggle" title="Show or hide the context rail">${ctxRailOn()?"Context ⟩":"⟨ Context"}</button>`:""}<button class="sm bh-close" id="dhClose" title="Back to the board (Esc)">✕ Close</button></div></div></div>
    ${roHTML([
      {k:"Received",v:shortD(t.receivedDate)},
      {k:"Due",v:t.dueDate?shortD(t.dueDate)+(dn!=null&&dn<0?`<small>${-dn} d late</small>`:dn!=null&&dn<=7?`<small>in ${dn} d</small>`:""):"—",cls:dn!=null&&dn<0?"bad":dn!=null&&dn<=3?"warn":""},
      {k:fin?"Took":"Age",v:U(age,"days")},
      {k:"System",v:t.system?esc(t.system)+(t.client?`<small>client ${esc(t.client)}</small>`:""):"—"},
      {k:ownDest?"Destinations":tgt?"Go-live · "+esc(tgt):"Go-live",v:t.transports.length?U(`${at}/${t.transports.length}`,ownDest?"TRs complete":"TRs there"):"—",cls:t.transports.length?(at<t.transports.length?"warn":"good"):"",title:"Transports that have reached the go-live system"},
      {k:"Subtasks",v:sub.n?U(`${sub.done}/${sub.n}`,"done"):"—"},
      {k:"Rework",v:U(rw,rw===1?"cycle":"cycles"),cls:rw?"bad":""},
      roundCount(t)>1?{k:"Rounds",v:U(roundCount(t),(roundCount(t)-1)+" requirement change"+(roundCount(t)>2?"s":"")),title:"The requirement changed after delivery — never counted as rework"}:null,
      (()=>{const h=efSum(efFor(t.id)),e=+t.estimate||0;return h||e?{k:"Logged",v:U(efFh(h),e?"/ "+efFh(e)+" h":"h"),cls:e&&h>e?"bad":"",title:"Hours logged against this demand — Effort tab"}:null;})(),
      isWaiting(t)?{k:"Waiting on",v:esc(t.waiting.on)+(waitDays(t)!=null?`<small>${waitDays(t)} d</small>`:""),cls:"warn"}:null],"stack")}
    ${na?`<div class="bband ${nad<=0?"watch":""}"><canvas class="natick"></canvas><span class="k">Next action · ${nad<0?(-nad)+" d ago":nad===0?"today":"in "+nad+" d"}</span><span class="tx"><b>${esc(na.note||"(no note)")}</b> <span class="mono faint">${na.date}</span></span><button class="sm" id="na-done" title="Did it — note it in History and clear">✓ Done</button><button class="sm ghost" id="na-edit" title="Change date or text">✎</button></div>`:""}
    ${cl.length?(()=>{const x=cl[0],o=x.open[0],more=cl.reduce((n,y)=>n+y.open.length,0)-1;
      return `<div class="clashband"><canvas class="orbit"></canvas><span><span class="ck">Object clash</span> <b class="mono">${esc(x.o.name)}</b> is also in flight in <a class="cb-go" data-id="${o.t.id}">${esc(demandLabel(o.t))}</a> <span class="clw">— ${esc(clashWhere(o))}${more>0?` · +${more} more`:""}. Agree the import order.</span></span><button class="sm cb-obj">Objects ›</button></div>`;})():""}
    ${ticketBandHTML(t)}
    <div class="tabs">
      <button class="tab ${activeTab==="overview"?"active":""}" data-tab="overview" title="1">Overview</button>
      <button class="tab ${activeTab==="work"?"active":""}" data-tab="work" title="2">Work<span class="count">${sub.n}</span></button>
      <button class="tab ${activeTab==="objects"?"active":""}" data-tab="objects" title="3">Objects<span class="count">${t.objects.length}</span>${nClash?`<span class="clashtag" title="Object(s) also in flight in another demand">⚠ ${nClash}</span>`:""}</button>
      <button class="tab ${activeTab==="transports"?"active":""}" data-tab="transports" title="4">Transports<span class="count">${t.transports.length}</span></button>
      <button class="tab ${activeTab==="effort"?"active":""}" data-tab="effort" title="5">Effort<span class="count">${efFh(efSum(efFor(t.id)))} h</span></button>
      <button class="tab ${activeTab==="history"?"active":""}" data-tab="history" title="6">History<span class="count">${(t.timeline||[]).length}</span></button>
      <span class="tsep"></span>
      <button class="tab sec2 ${activeTab==="reference"?"active":""}" data-tab="reference">Reference<span class="count">${(t.reference||[]).length}</span></button>
      <button class="tab sec2 inrail ${activeTab==="calls"?"active":""}" data-tab="calls">Linked<span class="count">${lc}</span></button>
      <button class="tab sec2 inrail ${activeTab==="images"?"active":""}" data-tab="images">Images<span class="count">${imagesFor("demand",t.id).length}</span></button>
      <span class="kbh keyhint" title="Keyboard shortcuts" onclick="openKeys()">? keys</span>
      <span class="tind"></span>
    </div></div><div class="detail-body" id="detailBody"></div>`;}

/* ---------- Epic page header ---------- */
const EPIC_PEN={active:"var(--accent)",onhold:"var(--amber)",delivered:"var(--green)",closed:"var(--faint)"};
function epicBenchTab(){return epicTab==="story"?"overview":epicTab;}
function epicHeadBench(e,r,pk,fu,storyN,openDeps,sub){
  const story=epicStory(e),first=story.length?story[0].date:"",months=first?monthsBetween(first,todayStr()):0;
  const live=!["delivered","closed"].includes(e.status),tn=e.targetDate?daysUntil(e.targetDate):null,short=r.pending.reduce((n,x)=>n+x.g.missing.length,0),tab=epicBenchTab();
  return `<div class="detail-head bhead" style="--pen:var(--accent2)">
    <div class="bh-top"><div class="bh-l">
        <div class="bh-no">◆ ${esc(e.code||"no code")} · ${e.role==="contributor"?"I contribute a part":"I lead this"}</div>
        <h1>${esc(e.name)}</h1>
        <div class="bh-sub">${[e.owner?"owner "+esc(e.owner):"",e.targetDate?"target "+e.targetDate:"",first?"running "+(months>=1?months+" month"+(months>1?"s":""):"under a month")+" · since "+first:"no history yet"].filter(Boolean).join(" · ")}</div></div>
      <div class="bh-acts"><div class="seg" id="ep-seg" title="Epic status — changes are noted in the story">${Object.entries(EPIC_STATUS).map(([k,v])=>`<button data-s="${k}" class="${k===e.status?"on":""}" style="--pen:${EPIC_PEN[k]}"><i></i>${v.label}</button>`).join("")}</div>
        <div class="bh-btns"><button class="sm" id="ep-edit">✎ Edit</button><button class="sm" id="ep-brief" title="The whole epic as one document">📄 Epic brief</button><button class="sm" id="ep-run" title="Import request for Basis across every demand in the epic">📋 Run sheet</button><button class="sm" id="ep-add">🔗 Assign demands</button><button class="sm ghost danger" id="ep-del" title="Delete this epic">🗑</button></div></div></div>
    ${roHTML([
      {k:"Demands",v:r.ts.length},
      {k:"Done",v:U(r.done,"of "+r.ts.length),cls:r.ts.length&&r.done===r.ts.length?"good":""},
      {k:"Overdue",v:r.overdue.length,cls:r.overdue.length?"bad":""},
      {k:"Transports",v:U(r.trs.length,r.trs.length?(short?short+" short":"all at go-live"):""),title:"Transports across the epic · how many haven't reached their go-live system",cls:short?"warn":r.trs.length?"good":""},
      {k:"Waiting on others",v:U(openDeps,fu.length?fu.length+" follow-up due":"open"),cls:fu.length?"bad":openDeps?"warn":""},
      {k:"Target",v:e.targetDate?(tn<0?U(-tn,"d over"):U(tn,"d left")):"—",cls:live&&tn!=null&&tn<0?"bad":live&&tn!=null&&tn<=14?"warn":""},
      {k:"Story",v:U(storyN,"events")}])}
    ${pk&&pk.parked?`<div class="bband watch"><span class="k">⏸ Parked</span><span class="tx">Nothing of yours is in flight — waiting on <b>${pk.open}</b> thing${pk.open>1?"s":""} from other teams${pk.days!=null?` for <b>${pk.days} days</b>`:""}.${fu.length?` <b style="color:var(--bad)">${fu.length} follow-up${fu.length>1?"s":""} due.</b>`:""}</span></div>`:""}
    <div class="tabs">
      <button class="tab ${tab==="overview"?"active":""}" data-tab="overview">Overview<span class="count">${storyN}</span></button>
      <button class="tab ${tab==="details"?"active":""}" data-tab="details">Scope &amp; go-live<span class="count">${r.ts.length}</span></button>
      <button class="tab ${tab==="deps"?"active":""}" data-tab="deps">Waiting on others<span class="count">${openDeps}${fu.length?" · 📞"+fu.length:""}</span></button>
      <button class="tab ${tab==="subtasks"?"active":""}" data-tab="subtasks">Subtasks<span class="count">${sub.n}</span></button>
      <button class="tab ${tab==="effort"?"active":""}" data-tab="effort">Effort<span class="count">${efFh(Math.round(efSum(epicEfforts(e))))} h</span></button>
      <span class="tind"></span>
    </div></div><div class="detail-body" id="epBody"></div>`;}
function epicOrderedDemands(e){const ts=tasksForEpic(e.id);return waveOrder(ts).flatMap(w=>ts.filter(t=>(t.wave||"")===w).sort((a,b)=>(a.receivedDate||"9999").localeCompare(b.receivedDate||"9999")));}
function wireEpicHeadBench(host,e){
  host.querySelectorAll("#ep-seg button").forEach(b=>b.onclick=()=>{const v=b.dataset.s;if(v===e.status)return;const was=e.status;e.status=v;
    e.log.push({id:uid(),date:todayStr(),kind:"milestone",text:`Epic status: ${EPIC_STATUS[was].label} → ${EPIC_STATUS[v].label}`});touch(e);
    flyDot(b,document.querySelector(`#epicList .tcard[data-id="${e.id}"]`),EPIC_PEN[v]);renderApp();toast("Epic status → "+EPIC_STATUS[v].label+" · noted in the story");});
  const ed=host.querySelector("#ep-edit");if(ed)ed.onclick=()=>openEpicEdit(e);
  const rs=host.querySelector("#ep-run");if(rs)rs.onclick=()=>openRunSheet(epicOrderedDemands(e),"◆ "+epicLabel(e),commonTarget(tasksForEpic(e.id)));}
/* the classic header edits inline; Bench keeps the header clean and edits here */
function openEpicEdit(e){
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:520px"><h2>✎ Edit epic</h2>
    <div class="field"><label>Name</label><input id="ee-name" value="${esc(e.name)}"></div>
    <div class="grid2"><div class="field"><label>Code</label><input id="ee-code" class="mono" value="${esc(e.code)}" placeholder="LUCA"></div>
      <div class="field"><label>Owner — who drives it</label><input id="ee-owner" value="${esc(e.owner)}"></div></div>
    <div class="grid2"><div class="field"><label>Target date</label><input type="date" id="ee-target" value="${e.targetDate||""}"></div>
      <div class="field"><label>Status</label><select id="ee-status">${Object.entries(EPIC_STATUS).map(([k,v])=>`<option value="${k}" ${k===e.status?"selected":""}>${v.label}</option>`).join("")}</select></div></div>
    <div class="grid2"><div class="field"><label>My role</label><select id="ee-role"><option value="lead" ${e.role==="lead"?"selected":""}>Lead — I own it</option><option value="contributor" ${e.role==="contributor"?"selected":""}>Contributor — one slice</option></select></div>
      <div class="field"><label>Chase other teams every</label><div style="display:flex;gap:6px;align-items:center"><input type="number" id="ee-follow" min="1" max="365" value="${e.followDays}" style="width:90px"><span class="faint">days</span></div></div></div>
    <div class="modal-foot"><button id="ee-cancel" class="ghost">Cancel</button><button id="ee-save" class="primary">Save</button></div></div></div>`;
  const q=s=>root.querySelector(s),close=()=>root.innerHTML="";
  q("#ee-cancel").onclick=close;q(".modal-bg").onclick=ev=>{if(ev.target===q(".modal-bg"))close();};
  const save=()=>{const was=e.status,ns=q("#ee-status").value,fd=parseInt(q("#ee-follow").value,10);
    e.name=q("#ee-name").value.trim()||"(untitled epic)";e.code=q("#ee-code").value.trim();e.owner=q("#ee-owner").value.trim();
    e.targetDate=q("#ee-target").value;e.role=q("#ee-role").value;if(fd>0)e.followDays=fd;
    if(ns!==was){e.status=ns;e.log.push({id:uid(),date:todayStr(),kind:"milestone",text:`Epic status: ${EPIC_STATUS[was].label} → ${EPIC_STATUS[ns].label}`});}
    touch(e);close();renderApp();toast("Epic saved");};
  q("#ee-save").onclick=save;
  root.querySelectorAll("input").forEach(i=>i.onkeydown=ev=>{if(ev.key==="Enter")save();});
  q("#ee-name").focus();}

/* ---------- Epic overview: the story first, with who you're waiting on beside it ---------- */
function renderEpicOverviewBench(body,e,r){
  const story=epicStory(e),waves=waveOrder(r.ts),open=e.deps.filter(x=>!x.done).sort((a,b)=>(depFollowDue(e,b)?1:0)-(depFollowDue(e,a)?1:0)||(a.since||"9999").localeCompare(b.since||"9999"));
  const doneN=e.deps.length-open.length,today=todayStr();
  const depRow=x=>{const last=x.lastCheck||x.since,ago=last?Math.max(0,-daysUntil(last)):null,due=depFollowDue(e,x),snz=x.snoozeUntil&&x.snoozeUntil>today;
    return `<div class="dep2 ${due?"due":""}" data-id="${x.id}"><canvas data-still="3000" data-f="${ago==null?0:ago/e.followDays}" data-due="${due?1:0}" data-ago="${ago==null?"":ago}"></canvas>
      <div class="dep2-t"><div class="dn">${esc(x.team||"(which team?)")}</div><div class="dw">${esc(x.what||"")}</div>
        <div class="dm">${[x.since?`waiting ${Math.max(0,-daysUntil(x.since))} d`:"",ago!=null?`last contact ${ago} d ago`:"never chased",x.expected?`expected ${x.expected}`:""].filter(Boolean).join(" · ")}${due?` · <b>${esc(due)}</b>`:""}${snz?` · 💤 until ${x.snoozeUntil}`:""}</div></div>
      <div class="dep2-a"><button class="sm d2-check" title="You chased them — log it in the story">📞 Checked in</button><span><button class="sm ghost d2-snooze" title="Don't nudge me about this until later">💤</button><button class="sm ghost d2-done" title="They delivered">✓</button></span></div></div>`;};
  const waveRow=w=>{const rows=r.ts.filter(t=>(t.wave||"")===w),dn=rows.filter(t=>["delivered","closed"].includes(t.status)).length,tg=waveTarget(e,w),n=tg?daysUntil(tg):null,all=rows.length&&dn===rows.length;
    return `<div class="wav2"><span class="wn">${w?esc(w):"<span class='faint'>no wave</span>"}</span><span class="wc mono">${dn}/${rows.length}</span>${dotBarSVG(rows.length?dn/rows.length:0,12,"var(--accent2)")}
      <span class="wt mono ${all?"good":n!=null&&n<0?"bad":n!=null&&n<=14?"warn":""}">${all?"✓ done":tg?(n<0?(-n)+" d over":n===0?"today":"in "+n+" d"):"no target"}</span></div>`;};
  const demRow=t=>{const d=earliestOpenDue(t),n=d?daysUntil(d):null;
    return `<div class="dem2" data-id="${t.id}" style="--pen:${STATUS_PEN[t.status]}"><i></i><span class="mono di">${esc(t.demandId||"—")}</span><span class="dt">${esc(t.title)}${t.wave?` <span class="faint">· ${esc(t.wave)}</span>`:""}</span><span class="mono dd ${n!=null&&n<0?"bad":""}">${d?(n<0?(-n)+" d late":shortD(d)):STATUS[t.status].label.toLowerCase()}</span></div>`;};
  body.innerHTML=`<div class="ep2">
    <div class="bsec ep-story"><div class="sec-title"><h3>Story</h3><div class="ln"></div><span class="faint mono" style="font-size:10.5px">${story.length?`${story.length} events · ${story[0].date} → ${story[story.length-1].date}`:"nothing yet"}</span></div><div id="ep2Story"></div></div>
    <div class="ep-side">
      <div class="bsec"><div class="sec-title"><h3>Waiting on others</h3><div class="ln"></div><span class="faint" style="font-size:10.5px">chase every ${e.followDays} d</span><button class="sm ghost" id="ep2Add" title="Add something another team owes">＋</button></div>
        ${open.length?open.map(depRow).join(""):`<div class="bempty">Nothing blocking — this epic is yours to drive.</div>`}
        ${doneN||open.length?`<a class="bmore" id="ep2All">${doneN?doneN+" delivered · ":""}edit dates &amp; details ›</a>`:""}</div>
      ${waves.length>1||(waves.length===1&&waves[0])?`<div class="bsec"><div class="sec-title"><h3>Waves</h3><div class="ln"></div><a class="bmore" id="ep2Waves" style="margin:0">targets ›</a></div>${waves.map(waveRow).join("")}</div>`:""}
      <div class="bsec"><div class="sec-title"><h3>Demands</h3><div class="ln"></div><span class="faint mono" style="font-size:10.5px">${r.done}/${r.ts.length} done</span></div>
        ${r.ts.length?epicOrderedDemands(e).map(demRow).join(""):`<div class="bempty">No demands yet — use 🔗 Assign demands above.</div>`}</div>
    </div></div>`;
  renderEpicStory(body.querySelector("#ep2Story"),e);
  body.querySelectorAll(".dep2").forEach(row=>{const x=e.deps.find(d=>d.id===row.dataset.id);if(!x)return;
    row.querySelector(".d2-check").onclick=()=>depCheckIn(e,x);
    row.querySelector(".d2-snooze").onclick=()=>depSnooze(e,x);
    row.querySelector(".d2-done").onclick=()=>depDelivered(e,x);
    const cv=row.querySelector("canvas"),f=+cv.dataset.f,due=cv.dataset.due==="1",ago=cv.dataset.ago,st={v:motionOn()?0:Math.min(1,f)};
    DK.scope(cv,(ctx,w,h,tm,dt)=>{st.v+=(Math.min(1,f)-st.v)*DK.ease(dt,.06);DK.dotArc(ctx,w/2,h/2+5,Math.min(w/2,h/1.45)-4,st.v,26,due?DK.C.bad:DK.C.watch,1.8);
      DK.label(ctx,ago===""?"—":ago+"d",w/2,h/2+13,{font:DK.MONO,size:9,weight:600,color:due?DK.C.bad:DK.C.ink});});});
  body.querySelectorAll(".dem2").forEach(row=>row.onclick=()=>goEpicDemand(row.dataset.id));
  const q=s=>body.querySelector(s);
  if(q("#ep2Add"))q("#ep2Add").onclick=()=>{e.deps.push(normDep({since:todayStr()}));touch(e);epicTab="deps";renderEpicDetail();};
  if(q("#ep2All"))q("#ep2All").onclick=()=>{epicTab="deps";renderEpicDetail();enterPulse("detail");};
  if(q("#ep2Waves"))q("#ep2Waves").onclick=()=>{epicTab="details";renderEpicDetail();enterPulse("detail");};
}

/* ---------- panels: frame each titled section, on the live page ---------- */
function wrapSections(root){if(!root||!benchOn())return;
  root.querySelectorAll(".sec-title").forEach(h=>{const p=h.parentElement;
    if(!p||h.closest(".bsec,.modal,.trcard,.ck-unit,.dashcard,.resume-box,.pinbox"))return;
    const box=document.createElement("div");box.className="bsec";p.insertBefore(box,h);
    /* a section runs to the next heading — or to a block that carries its own heading (it becomes its own panel) */
    let n=h;while(n){const next=n.nextElementSibling;box.appendChild(n);n=next;if(n&&(n.classList.contains("sec-title")||n.querySelector(".sec-title")))break;}});}
{const detail=document.getElementById("detail");let queued=false;
  const obs=new MutationObserver(()=>{if(queued)return;queued=true;
    queueMicrotask(()=>{obs.disconnect();try{wrapSections(detail);}finally{queued=false;obs.observe(detail,{childList:true,subtree:true});}});});
  obs.observe(detail,{childList:true,subtree:true});}

