/* ===================== TRANSPORTS AND TICKETS =====================
   The transport board: every transport still on its way, across all demands — where it is,
   where it goes next, released or not, how long it has sat there — filtered by landscape,
   grouped by the next system, with an import recorded for several at once. A ToC moved
   along a whole route in one go. Tickets as a light level above demands: the demands that
   share a ticket ID, side by side. And two reminders for the agenda: a transport left
   unreleased too long, and a demand handed to your team that has gone quiet. */
const TRB={L:"",unrel:false,done:false,q:"",sel:new Set()};
const QUIET_DAYS=7;   /* a handed-on demand with no update for this long comes up on the agenda */
const unrelDays=()=>+state.settings.unreleasedDays||5;
const trbKey=(t,tr)=>t.id+"|"+tr.id;
function trLastMove(t,tr){return effectiveSyncs(t,tr).map(s=>s.date).filter(Boolean).sort().pop()||"";}
/* since when it has sat where it is: its last move, else its release, else the day it was added */
function trSince(t,tr){const m=trLastMove(t,tr);if(m)return {d:m,what:"moved"};if(tr.released&&tr.releasedOn)return {d:tr.releasedOn,what:"released"};return tr.addedOn?{d:tr.addedOn,what:"added"}:null;}
function trUnrelDays(tr){return !tr.released&&tr.addedOn?Math.max(0,-daysUntil(tr.addedOn)):null;}
const trTierIdx=x=>{const i=routeTiers().indexOf(String(x).slice(-1));return i<0?9:i;};
function trBoardRows(){const out=[];
  state.tasks.forEach(t=>{if(t.status==="closed")return;
    t.transports.forEach(tr=>{if(!tr.system)return;
      const R=reachedSystems(t,tr),T=trTargets(t,tr),route=[tr.system,...trRouteSystems(t,tr).filter(x=>x!==tr.system)];
      T.forEach(x=>{if(!route.includes(x))route.push(x);});
      const far=Math.max(0,...T.map(x=>route.indexOf(x))),path=route.slice(0,far+1);
      const done=trComplete(t,tr),next=done?"":(path.find(x=>x!==tr.system&&!R.has(x))||trMissing(t,tr)[0]||"");
      const at=[...path].reverse().find(x=>x===tr.system||R.has(x))||tr.system,since=trSince(t,tr);
      out.push({t,tr,toc:tocFor(t,tr),path,R,T,done,next,at,since,sat:since?Math.max(0,-daysUntil(since.d)):null,unrel:trUnrelDays(tr)});});});
  return out;}
function trbFilter(rows){const w=TRB.q.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(r=>(TRB.done||!r.done)&&(!TRB.unrel||!r.tr.released)&&(!TRB.L||r.path.some(x=>landscapeOf(x)===TRB.L))
    &&(!w.length||w.every(x=>[r.tr.number,r.tr.desc,r.t.demandId,r.t.title,r.toc&&r.toc.number].join(" ").toLowerCase().includes(x))));}
function trbRouteHTML(r){const when={};effectiveSyncs(r.t,r.tr).forEach(s=>{if(!when[s.system])when[s.system]=s.date;});
  return `<span class="tb-route">${r.path.map((x,i)=>{const on=x===r.tr.system||r.R.has(x),nx=x===r.next;
    return `${i?`<i class="${on?"on":""}"></i>`:""}<span class="tb-st ${on?"on":nx?"nx":""} ${sysTierCls(x)}" title="${esc(x)}${x===r.tr.system?" · built here":on?" · reached"+(when[x]?" "+when[x]:""):nx?" · next":" · still ahead"}">${esc(x)}</span>`;}).join("")}</span>`;}
function renderTrBoard(){const host=document.getElementById("detail"),all=trBoardRows(),U5=unrelDays();
  const live=all.filter(r=>!r.done),rows=trbFilter(all),keys=new Set(rows.map(r=>trbKey(r.t,r.tr)));
  [...TRB.sel].forEach(k=>{if(!keys.has(k))TRB.sel.delete(k);});
  const Ls=[...new Set(live.flatMap(r=>r.path.map(landscapeOf)))].sort();
  const groups=new Map();rows.forEach(r=>{const k=r.done?"":r.next;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);});
  const order=[...groups.keys()].sort((a,b)=>(!a)-(!b)||trTierIdx(a)-trTierIdx(b)||a.localeCompare(b));
  const unrel=live.filter(r=>!r.tr.released),late=unrel.filter(r=>(r.unrel||0)>=U5);
  const nexts=new Map();live.forEach(r=>{if(r.next)nexts.set(r.next,(nexts.get(r.next)||0)+1);});const top=[...nexts].sort((a,b)=>b[1]-a[1])[0];
  host.innerHTML=`<div class="efx ef-ws tb">
    <div class="ef-wsh"><div><div class="ef-l1">⇢ Transports</div><h1>Every transport on its way</h1></div>
      <div class="ef-ctl"><input id="tbQ" placeholder="Filter: number, text, demand…" value="${esc(TRB.q)}" autocomplete="off" style="width:240px"></div></div>
    ${roHTML([{k:"On their way",v:U(live.length,"transport"+(live.length===1?"":"s"))},{k:"Not released",v:U(unrel.length,late.length?`${late.length} over ${U5} d`:"none too long"),cls:late.length?"bad":""},
      {k:"Busiest next stop",v:top?U(esc(top[0]),top[1]+" waiting"):"—"},{k:"Demands",v:String(new Set(live.map(r=>r.t.id)).size)},
      {k:"Complete",v:U(all.length-live.length,"at their destinations"),title:"Transports of open demands that reached every destination — ‘show complete’ lists them"}])}
    <div class="sr-f tb-f"><span class="ef-lb">Landscape</span><div class="ef-row"><button class="ef-chip ${TRB.L?"":"on"}" data-l="">All</button>${Ls.map(L=>`<button class="ef-chip ${TRB.L===L?"on":""}" data-l="${esc(L)}">${esc(L)}x</button>`).join("")}</div>
      <label class="tb-tg"><input type="checkbox" id="tbUnrel" ${TRB.unrel?"checked":""}> not released only</label><label class="tb-tg"><input type="checkbox" id="tbDone" ${TRB.done?"checked":""}> show complete</label></div>
    ${order.length?order.map(k=>{const g=groups.get(k),tm=k?tierMeta(k):null,allSel=g.every(r=>TRB.sel.has(trbKey(r.t,r.tr))),fz=k?freezeFor(k):null;
      return `<div class="ck-unit tb-g"><div class="ck-head"><h2>${k?`<label class="tb-gck"><input type="checkbox" data-gk="${esc(k)}" ${allSel?"checked":""} title="Select all ${g.length}"></label>Next stop <span class="sys ${sysTierCls(k)}">${esc(k)}</span>${tm?` <span class="faint tb-tl">${esc(tm.label)}</span>`:""}`:"✓ At their destinations"}${fz?` <span class="tb-fz">❄ frozen until ${esc(fz.to)}</span>`:""}</h2>
        <span class="ck-meta">${g.length} transport${g.length===1?"":"s"}${k?` · <a href="#" data-rs="${esc(k)}">📋 run sheet for ${esc(k)}</a>`:""}</span></div>
        ${g.sort((a,b)=>(b.sat??-1)-(a.sat??-1)).map(r=>{const key=trbKey(r.t,r.tr),ul=r.unrel!=null&&r.unrel>=U5;
          return `<div class="tb-row${TRB.sel.has(key)?" sel":""}" data-key="${esc(key)}">
            ${r.done?"<span></span>":`<input type="checkbox" class="tb-ck" ${TRB.sel.has(key)?"checked":""} title="Select for a bulk import">`}
            <span class="tb-tr"><b class="mono">${esc(r.tr.number||"(unnumbered)")}</b>${isCust(r.tr)?` <span class="tb-tag">cust${r.tr.client?" "+esc(r.tr.client):""}</span>`:""}${r.toc?` <span class="tb-tag" title="Moves with its Transport of Copies">via ToC ${esc(r.toc.number||"")}</span>`:""}<span class="tb-ds">${esc(r.tr.desc||"")}</span></span>
            <span class="tb-dm"><b class="mono">${esc(r.t.demandId||"—")}</b> ${esc(r.t.title)}</span>
            ${trbRouteHTML(r)}
            <span class="tb-rel ${r.tr.released?"":ul?"bad":"warn"}">${r.tr.released?"● released":`○ not released${r.unrel!=null?` · ${r.unrel} d`:""}`}</span>
            <span class="tb-sat">${r.since?`${r.sat} d <span class="faint">at ${esc(r.at)}</span>`:`<span class="faint">at ${esc(r.at)}</span>`}</span></div>`;}).join("")}</div>`;}).join("")
      :`<div class="ck-unit"><div class="ck-empty">${all.length?"Nothing matches — clear the filter.":"No transports yet. Add them on a demand's Transports tab."}</div></div>`}
    <div class="tb-bulk ${TRB.sel.size?"on":""}" id="tbBulk"></div>
  </div>`;
  const q=s=>host.querySelector(s),byKey=new Map(rows.map(r=>[trbKey(r.t,r.tr),r]));
  const fq=q("#tbQ");fq.oninput=()=>{TRB.q=fq.value;const p=fq.selectionStart;renderTrBoard();const n=document.getElementById("tbQ");n.focus();n.setSelectionRange(p,p);};
  host.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>{TRB.L=b.dataset.l;renderTrBoard();});
  q("#tbUnrel").onchange=e=>{TRB.unrel=e.target.checked;renderTrBoard();};q("#tbDone").onchange=e=>{TRB.done=e.target.checked;renderTrBoard();};
  host.querySelectorAll(".tb-row").forEach(el=>el.onclick=e=>{const r=byKey.get(el.dataset.key);if(!r)return;
    if(e.target.classList.contains("tb-ck")){if(e.target.checked)TRB.sel.add(el.dataset.key);else TRB.sel.delete(el.dataset.key);el.classList.toggle("sel",e.target.checked);drawBulk();return;}
    view="demands";activeId=r.t.id;activeTab="transports";renderApp();});
  host.querySelectorAll("[data-gk]").forEach(c=>c.onchange=()=>{groups.get(c.dataset.gk).forEach(r=>{const k=trbKey(r.t,r.tr);if(c.checked)TRB.sel.add(k);else TRB.sel.delete(k);});renderTrBoard();});
  host.querySelectorAll("[data-rs]").forEach(a=>a.onclick=e=>{e.preventDefault();const k=a.dataset.rs;openRunSheet([...new Set(groups.get(k).map(r=>r.t))],"Transport board",k);});
  function drawBulk(){const b=q("#tbBulk"),sel=[...TRB.sel].map(k=>byKey.get(k)).filter(Boolean);b.classList.toggle("on",!!sel.length);if(!sel.length){b.innerHTML="";return;}
    const c=new Map();sel.forEach(r=>{if(r.next)c.set(r.next,(c.get(r.next)||0)+1);});const opts=[...new Set(sel.flatMap(r=>r.path.filter(x=>x!==r.tr.system&&!r.R.has(x))))].sort((a,b)=>trTierIdx(a)-trTierIdx(b)||a.localeCompare(b));
    const def=[...c].sort((a,b)=>b[1]-a[1])[0];
    b.innerHTML=`<b>${sel.length} selected</b><span>Record an import into</span><select id="tbSys">${opts.map(x=>`<option ${def&&def[0]===x?"selected":""}>${esc(x)}</option>`).join("")}</select><span>on</span><input type="date" id="tbDate" value="${todayStr()}" max="${todayStr()}"><button class="primary sm" id="tbRec">✓ Record</button><button class="ghost sm" id="tbClr">Clear</button><span class="faint tb-bn" id="tbNote"></span>`;
    const note=()=>{const s=q("#tbSys").value,skip=sel.filter(r=>!r.path.includes(s)&&!r.T.includes(s)).length,viaToc=new Set(sel.filter(r=>r.toc).map(r=>r.toc.id)).size;
      q("#tbNote").textContent=[skip?`${skip} of them aren't routed through ${s} — left out`:"",viaToc?`${viaToc} ToC${viaToc>1?"s":""} — the import is recorded on the ToC`:""].filter(Boolean).join(" · ");};
    q("#tbSys").onchange=note;note();
    q("#tbClr").onclick=()=>{TRB.sel.clear();renderTrBoard();};
    q("#tbRec").onclick=()=>{const s=q("#tbSys").value,d=q("#tbDate").value||todayStr();if(d>todayStr()){toast("That day hasn't happened yet",true);return;}
      const undo=[],tocs=new Set();let n=0;
      sel.filter(r=>r.path.includes(s)||r.T.includes(s)).forEach(r=>{
        if(r.toc){if(tocs.has(r.toc.id)||r.toc.syncs.some(x=>x.system===s))return;tocs.add(r.toc.id);const y={system:s,date:d};r.toc.syncs.push(y);undo.push(()=>{const i=r.toc.syncs.indexOf(y);if(i>=0)r.toc.syncs.splice(i,1);});}
        else{if(r.R.has(s))return;const y={system:s,date:d},rel=r.tr.released,ro=r.tr.releasedOn;r.tr.syncs.push(y);syncReleases(r.tr,s,d);
          undo.push(()=>{const i=r.tr.syncs.indexOf(y);if(i>=0)r.tr.syncs.splice(i,1);r.tr.released=rel;r.tr.releasedOn=ro;});}
        touch(r.t);n++;});
      if(!n){toast(`Nothing to record — they're in ${s} already`,true);return;}
      TRB.sel.clear();renderTrBoard();
      efToastUndo(`Recorded ${n} import${n===1?"":"s"} into ${s} on ${d}`,()=>{undo.forEach(f=>f());markDirty();renderApp();});};}
  drawBulk();}

/* ---------- a ToC moved along a whole route in one go ---------- */
function openTocRoute(t,c,after){const members=t.transports.filter(tr=>tr.tocId===c.id),tiers=routeTiers(),root=document.getElementById("modalRoot");
  const origins=new Set(members.map(m=>m.system)),have=new Set(c.syncs.map(s=>s.system).filter(Boolean));
  const own=members.flatMap(m=>trDest(t,m)).map(landscapeOf),cnt=new Map();own.forEach(L=>cnt.set(L,(cnt.get(L)||0)+1));
  let L=[...cnt].sort((a,b)=>b[1]-a[1]).map(x=>x[0])[0]||landscapeOf(goliveTargetFor(t))||state.settings.landscapes[0]||"";
  const draw=()=>{const sys=tiers.map(d=>L+d).filter(x=>!origins.has(x));
    root.innerHTML=`<div class="modal-bg"><div class="modal efx" style="width:520px"><h2>⇢ Move ${esc(c.number||"the ToC")} along a route</h2>
      <p class="faint" style="font-size:12px;margin-top:-8px">Every system on the route gets the same date — the ${members.length} transport${members.length===1?"":"s"} bundled in it follow.</p>
      <div class="field"><label>Route</label><select id="trRoute">${state.settings.landscapes.map(x=>`<option value="${esc(x)}" ${x===L?"selected":""}>${esc(x)} route — ${tiers.map(d=>x+d).filter(y=>!origins.has(y)).map(esc).join(" → ")}</option>`).join("")}</select></div>
      <div class="field"><label>Moved to</label><div class="tr-rsys">${sys.map(x=>`<label class="tr-rs ${have.has(x)?"done":""}"><input type="checkbox" value="${esc(x)}" ${have.has(x)?"disabled":"checked"}> <span class="sys ${sysTierCls(x)}">${esc(x)}</span>${have.has(x)?` <span class="faint">already there</span>`:""}</label>`).join("")||`<span class="faint">Nothing left on this route.</span>`}</div></div>
      <div class="field"><label>On</label><input type="date" id="trRDate" value="${todayStr()}" max="${todayStr()}" style="width:170px"></div>
      <div class="modal-foot"><button class="ghost" id="trRCancel">Cancel</button><button class="primary" id="trRGo">Move</button></div></div></div>`;
    const q=s=>root.querySelector(s),close=()=>{root.innerHTML="";};
    q("#trRoute").onchange=e=>{L=e.target.value;draw();};q("#trRCancel").onclick=close;
    q(".modal-bg").onclick=e=>{if(e.target===q(".modal-bg"))close();};
    q("#trRGo").onclick=()=>{const d=q("#trRDate").value||todayStr(),pick=[...root.querySelectorAll(".tr-rs input:checked:not(:disabled)")].map(i=>i.value);
      if(!pick.length){toast("Tick at least one system",true);return;}if(d>todayStr()){toast("That day hasn't happened yet",true);return;}
      const added=pick.map(x=>({system:x,date:d}));c.syncs.push(...added);touch(t);close();if(after)after();renderApp();
      efToastUndo(`${c.number||"ToC"} moved to ${pick.join(" → ")} on ${d}`,()=>{c.syncs=c.syncs.filter(s=>!added.includes(s));touch(t);if(after)after();renderApp();});};};
  draw();}

/* ---------- tickets: the demands that share a ticket ID ---------- */
function ticketSiblings(t){return t.demandId&&(demandIdCounts().get(t.demandId)||0)>1?state.tasks.filter(x=>x!==t&&x.demandId===t.demandId):[];}
function ticketRollup(id){const ts=state.tasks.filter(x=>x.demandId===id),trs=ts.flatMap(x=>x.transports.map(tr=>[x,tr]));
  return {ts,h:efSum(ts.flatMap(x=>efFor(x.id))),trs:trs.length,there:trs.filter(([x,tr])=>trComplete(x,tr)).length,open:ts.filter(x=>x.status!=="closed"&&x.status!=="delivered").length};}
function ticketBandHTML(t){const sib=ticketSiblings(t);if(!sib.length)return "";const r=ticketRollup(t.demandId);
  return `<div class="bband tkband"><span class="k">Ticket ${esc(t.demandId)} · ${r.ts.length} demands</span><span class="tx">${sib.map(x=>`<a class="tk-go" data-id="${x.id}" title="Open it"><span class="pill ${STATUS[x.status].cls}">${STATUS[x.status].label}</span> ${esc(x.title)}</a>`).join("")}</span>
    <span class="tk-sum mono" title="The whole ticket — every demand under it">${efFh(Math.round(r.h*10)/10)} h · ${r.there}/${r.trs} TRs there</span></div>`;}

/* ---------- agenda reminders ---------- */
function agCheckedIn(x){const msg=`Checked in with ${builderNames(x)}`,u0=x.updatedAt;logTimeline(x,"note","","",msg);touch(x);renderApp();
  efToastUndo(`${msg} — back on the agenda in ${QUIET_DAYS} days if nothing moves`,()=>{agUnlog(x,msg);x.updatedAt=u0;markDirty();renderApp();});}
function agReleased(x,tr){const ro=tr.releasedOn;tr.released=true;tr.releasedOn=todayStr();touch(x);renderApp();
  efToastUndo(`${tr.number||"Transport"} marked released`,()=>{tr.released=false;tr.releasedOn=ro;touch(x);renderApp();});}
function agendaTransportItems(t0){const out=[],U5=unrelDays(),go=(x,tab)=>()=>{view="demands";activeId=x.id;activeTab=tab;renderApp();};
  const of=x=>`${x.demandId?`<b class="mono">${esc(x.demandId)}</b> `:""}${esc(x.title)}`;
  state.tasks.filter(x=>x.status!=="closed").forEach(x=>x.transports.forEach(tr=>{const n=trUnrelDays(tr);if(n==null||n<U5)return;
    out.push({k:"release",date:efAdd(tr.addedOn,U5),what:`Release <b class="mono">${esc(tr.number||"(unnumbered)")}</b>`,sub:`unreleased ${n} d`,of:of(x),go:go(x,"transports"),
      acts:[["Released",()=>agReleased(x,tr),"Mark it released"]]});}));
  state.tasks.filter(x=>["open","progress","bug"].includes(x.status)&&buildersOf(x).length&&!(x.nextAction&&x.nextAction.date>t0)).forEach(x=>{
    const last=isoTs(x.updatedAt||0),n=-daysUntil(last);if(n<QUIET_DAYS)return;
    out.push({k:"check",date:efAdd(last,QUIET_DAYS),what:`Check in with ${esc(builderNames(x))}`,sub:`no update for ${n} d`,of:of(x),go:go(x,"overview"),
      acts:[["Checked in",()=>agCheckedIn(x),`Note it in History — back in ${QUIET_DAYS} days if nothing moves`]]});});
  return out;}
