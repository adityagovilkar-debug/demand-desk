/* ===================== TRANSPORT RUN SHEET ===================== */
/* What Basis has to import into one system, in release order. A ToC stands in for the
   TRs bundled in it (imported once, where its first member sits in the order), customizing
   TRs name their client, and whatever already reached the target is left off the request.
   Only TRs routed through the target's landscape count — an H1x TR never goes to H01. */
function runSheetData(tasks,target,showDone){
  const rows=[];let other=0;
  if(target){const L=landscapeOf(target);
    tasks.forEach(t=>{const tocSeen=new Set();
      t.transports.forEach(tr=>{
        /* a transport with its own destinations only belongs on a sheet for one of them */
        const own=trDest(t,tr);
        if(own.length?!own.includes(target):(landscapeOf(tr.system)!==L&&!effectiveSyncs(t,tr).some(s=>landscapeOf(s.system)===L))){other++;return;}
        const toc=tocFor(t,tr);
        if(toc){if(tocSeen.has(toc.id))return;tocSeen.add(toc.id);
          const members=t.transports.filter(x=>x.tocId===toc.id),hit=toc.syncs.find(s=>s.system===target);
          rows.push({t,toc,members,number:toc.number||"(unnumbered ToC)",desc:toc.desc,type:"ToC",client:"",released:true,
            done:!!hit||members.every(m=>reachedSystems(t,m).has(target)),doneDate:hit?hit.date:"",objIds:members.flatMap(m=>m.objectIds||[])});}
        else{const hit=effectiveSyncs(t,tr).find(s=>s.system===target);
          rows.push({t,tr,number:tr.number||"(unnumbered)",desc:tr.desc,type:isCust(tr)?"Customizing":"Workbench",client:isCust(tr)?tr.client:"",
            released:tr.released,done:!!hit,doneDate:hit?hit.date:"",objIds:tr.objectIds||[]});}
      });});
    const cidx=clashIndex();
    rows.forEach(r=>{r.warn=r.released?[]:["not released yet"];
      [...new Set(r.objIds)].map(id=>r.t.objects.find(o=>o.id===id)).filter(Boolean).forEach(o=>
        clashesFor(r.t,o,cidx).filter(x=>!x.ack).forEach(x=>r.warn.push(`${o.name} is also in flight in ${demandLabel(x.t)} — check the order`)));});}
  const todo=rows.filter(r=>!r.done);
  return {rows,todo,list:showDone?rows:todo,other,tier:tierMeta(target),freeze:target?freezeFor(target):null,
    multi:new Set(rows.map(r=>r.t.id)).size>1};
}
/* inline-styled so the table survives being pasted into Outlook or Teams */
function runSheetHTML(d,target,label,notes){
  const cell='style="border:1px solid #bbb;padding:4px 8px;text-align:left;vertical-align:top"';
  let n=0;
  return `<h1>Transport import request</h1><h2>${esc(target)}${d.tier?" · "+esc(d.tier.label):""} — ${esc(label)}</h2>
    ${d.freeze?`<p><b style="color:#b3261e">❄ ${esc(target)} is in a change freeze until ${esc(d.freeze.to)} — ${esc(d.freeze.title)}.</b></p>`:""}
    ${d.list.length?`<p>Please import in this order:</p>
    <table style="border-collapse:collapse;font-size:12px"><tr><th ${cell}>#</th><th ${cell}>Transport</th><th ${cell}>Type</th><th ${cell}>Client</th><th ${cell}>Description</th>${d.multi?`<th ${cell}>Demand</th>`:""}<th ${cell}>Remarks</th></tr>
    ${d.list.map(r=>`<tr${r.done?' style="color:#888"':""}><td ${cell}>${r.done?"✓":++n}</td><td ${cell}><b>${esc(r.number)}</b></td><td ${cell}>${r.type}</td><td ${cell}>${esc(r.client)||"—"}</td>
      <td ${cell}>${esc(r.desc||"")}${r.members?`<br><i>contains ${r.members.map(m=>esc(m.number||"(TR)")).join(", ")}</i>`:""}</td>${d.multi?`<td ${cell}>${esc(demandLabel(r.t))}</td>`:""}
      <td ${cell}>${r.done?"already in "+esc(target)+(r.doneDate?" ("+esc(r.doneDate)+")":""):r.warn.map(w=>"⚠ "+esc(w)).join("<br>")}</td></tr>`).join("")}</table>`
    :`<p><i>Nothing left to import into ${esc(target)} — everything has reached it.</i></p>`}
    ${notes?`<p><b>Notes:</b><br>${esc(notes).replace(/\n/g,"<br>")}</p>`:""}`;
}
function runSheetText(d,target,label,notes){
  const L=[`Transport import request — ${target}${d.tier?" ("+d.tier.label+")":""}`,label,""];
  if(d.freeze)L.push(`NOTE: ${target} is in a change freeze until ${d.freeze.to} (${d.freeze.title}).`,"");
  if(!d.todo.length)L.push(`Nothing left to import into ${target}.`);
  else{L.push("Please import in this order:");const w=Math.max(...d.todo.map(r=>r.number.length));
    d.todo.forEach((r,i)=>{L.push(`${String(i+1).padStart(3)}. ${r.number.padEnd(w)}  ${r.type}${r.client?" → client "+r.client:""}${r.desc?" — "+r.desc:""}${r.members?` [contains ${r.members.map(m=>m.number||"(TR)").join(", ")}]`:""}${d.multi?` (${demandLabel(r.t)})`:""}`);
      r.warn.forEach(x=>L.push(`       ⚠ ${x}`));});}
  if(notes)L.push("","Notes: "+notes);
  return L.join("\n");
}
function commonTarget(ts){const c={};ts.forEach(t=>{if(!t.transports.length)return;const g=goliveTargetFor(t);if(g)c[g]=(c[g]||0)+1;});
  return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||"";}
function copyRich(html,text){
  try{if(window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write)
    return navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([`<div style="font-family:Segoe UI,Arial,sans-serif;font-size:13px">${html}</div>`],{type:"text/html"}),"text/plain":new Blob([text],{type:"text/plain"})})]);}catch(e){}
  return navigator.clipboard.writeText(text);}
function openRunSheet(tasks,label,defTarget){
  const root=document.getElementById("modalRoot"),notes=openRunSheet._notes||(openRunSheet._notes={});
  let target=defTarget||"",showDone=false;
  const draw=()=>{
    const d=runSheetData(tasks,target,showDone),nt=notes[label]||"";
    root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:840px"><h2>📋 Transport run sheet — ${esc(label)}</h2>
      <p class="faint" style="font-size:12px;margin-top:-8px">What Basis needs to import, in release order. A ToC replaces the TRs bundled in it; anything that already reached the target drops off the request.</p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
        <span style="font-size:13px">Import into</span><select id="rs-sys" style="width:auto">${systemOptions(target)}</select>
        <label style="display:flex;align-items:center;gap:6px;margin:0;text-transform:none;letter-spacing:0;font-size:12px;font-weight:500;color:var(--muted)"><input type="checkbox" id="rs-done" ${showDone?"checked":""} style="width:auto"> show what's already there</label>
        <span class="faint" style="font-size:12px;margin-left:auto">${target?`${d.todo.length} to import${d.other?` · ${d.other} TR(s) not routed here left out`:""}`:""}</span></div>
      <textarea id="rs-notes" rows="2" placeholder="Notes for Basis (optional) — e.g. import after 18:00, ToC first, ping me on Teams when done">${esc(nt)}</textarea>
      <div class="specpaper specdoc" id="rs-prev" style="margin-top:10px">${target?runSheetHTML(d,target,label,nt):"<p><i>Pick the system to import into.</i></p>"}</div>
      <div class="modal-foot">${d.todo.length?`<button id="rs-mark" style="margin-right:auto" title="Once Basis confirms: record the import on every transport / ToC in the list">✓ Mark all imported…</button>`:""}
        <button id="rs-copy" ${target?"":"disabled"} title="Formatted table — paste into an email or Teams">📋 Copy for email</button><button id="rs-text" ${target?"":"disabled"} title="Plain text">📋 Copy as text</button><button id="rs-close" class="primary">Close</button></div></div></div>`;
    const close=()=>{root.innerHTML="";renderApp();};
    root.querySelector("#rs-close").onclick=close;
    root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
    root.querySelector("#rs-sys").onchange=e=>{target=e.target.value;draw();};
    root.querySelector("#rs-done").onchange=e=>{showDone=e.target.checked;draw();};
    /* notes update the preview in place — a full redraw would steal the cursor */
    root.querySelector("#rs-notes").oninput=e=>{notes[label]=e.target.value;if(target)root.querySelector("#rs-prev").innerHTML=runSheetHTML(runSheetData(tasks,target,showDone),target,label,notes[label]);};
    const cp=root.querySelector("#rs-copy");if(cp)cp.onclick=()=>{const x=runSheetData(tasks,target,false);
      copyRich(runSheetHTML(x,target,label,notes[label]||""),runSheetText(x,target,label,notes[label]||"")).then(()=>toast("Copied — paste it into your mail to Basis")).catch(()=>toast("Copy failed",true));};
    const tx=root.querySelector("#rs-text");if(tx)tx.onclick=()=>{navigator.clipboard.writeText(runSheetText(runSheetData(tasks,target,false),target,label,notes[label]||"")).then(()=>toast("Copied as text")).catch(()=>toast("Copy failed",true));};
    const mk=root.querySelector("#rs-mark");if(mk)mk.onclick=async()=>{
      const v=await askText(`Basis imported all ${d.todo.length} item(s) into ${target}?`,{label:"Date of the import",type:"date",value:todayStr(),ok:"Record"});if(v===null)return;
      const dt=v.trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(dt)){toast("Use the YYYY-MM-DD format",true);return;}
      const touched=new Set();d.todo.forEach(r=>{(r.toc||r.tr).syncs.push({system:target,date:dt});if(!r.toc)syncReleases(r.tr,target,dt);touched.add(r.t);});
      touched.forEach(t=>touch(t));draw();toast(`Recorded ${d.todo.length} import(s) into ${target} on ${dt}`);};
  };
  draw();
}

/* ===================== HANDOVER PACK ===================== */
/* Everything a colleague needs to carry your open work while you're away: per demand,
   where it stands, what's next and what's in flight — plus other teams you're waiting
   on, and freezes / recurring duties that fall inside the period. */
const HO_RANK={bug:0,progress:1,open:2,delivered:3,closed:4};
function handoverDefaultIds(){return state.tasks.filter(t=>["open","progress","bug"].includes(t.status)||(t.status==="delivered"&&golivePending(t))).map(t=>t.id);}
function hoOpenSubs(list,d,out){list.forEach(s=>{if(!s.done)out.push({s,d});hoOpenSubs(s.children,s.done?d:d+1,out);});return out;}
function handoverDoc(s,ts){
  const H=[],M=[],mdc=x=>String(x||"").replace(/\|/g,"\\|").replace(/\n/g," ");
  const para=(label,txt)=>{if(!txt)return;H.push(`<p><b>${label}</b></p><div class="note">${esc(txt)}</div>`);M.push(`**${label}**`,``,txt,``);};
  const list=(label,items)=>{if(!items.length)return;H.push(`<p><b>${label}</b></p><ul>${items.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`);M.push(`**${label}**`,``,...items.map(x=>"- "+x),``);};
  const dl=t=>(t.demandId?t.demandId+" — ":"")+t.title;
  const plus30=(()=>{const x=new Date(todayStr()+"T00:00:00");x.setDate(x.getDate()+30);return isoD(x);})();
  const winStart=s.from||todayStr(),winEnd=s.until||plus30;
  const period=(s.from||s.until)?`${s.from||"…"} → ${s.until||"…"}`:"";
  const cidx=clashIndex();
  H.push(`<h1>Handover${period?" · "+esc(period):""}</h1><p class="meta">${s.to?`<b>Handed over to:</b> ${esc(s.to)} &nbsp;|&nbsp; `:""}<b>Demands:</b> ${ts.length} &nbsp;|&nbsp; <b>Prepared:</b> ${todayStr()}</p>`);
  M.push(`# Handover${period?" · "+period:""}`,``,`${s.to?`**Handed over to:** ${s.to} | `:""}**Demands:** ${ts.length} | **Prepared:** ${todayStr()}`,``);
  if(s.intro){H.push(`<div class="note">${esc(s.intro)}</div>`);M.push(s.intro,``);}
  const nextStep=t=>(t.nextAction&&t.nextAction.date)?`${t.nextAction.date}${t.nextAction.note?": "+t.nextAction.note:""}`:isWaiting(t)?`waiting on ${t.waiting.on}`:"";
  if(ts.length){
    H.push(`<h3>At a glance</h3><table><tr><th>Demand</th><th>Status</th><th>System</th><th>Due</th><th>Next step</th></tr>${ts.map(t=>`<tr><td>${esc(dl(t))}</td><td>${STATUS[t.status].label}</td><td>${esc(t.system)||"—"}${t.client?" / "+esc(t.client):""}</td><td>${earliestOpenDue(t)||"—"}</td><td>${esc(nextStep(t))||"—"}</td></tr>`).join("")}</table>`);
    M.push(`## At a glance`,``,`| Demand | Status | System | Due | Next step |`,`|---|---|---|---|---|`,
      ...ts.map(t=>`| ${mdc(dl(t))} | ${STATUS[t.status].label} | ${t.system||"—"}${t.client?" / "+t.client:""} | ${earliestOpenDue(t)||"—"} | ${mdc(nextStep(t))||"—"} |`),``);}
  ts.forEach(t=>{
    const ep=epicById(t.epicId),due=earliestOpenDue(t);
    const meta=[STATUS[t.status].label,t.system?t.system+(t.client?" / "+t.client:""):"",ep?"◆ "+epicLabel(ep)+(t.wave?" · "+t.wave:""):"",
      t.requestor?"asked by "+t.requestor:"",t.receivedDate?"received "+t.receivedDate:"",due?"due "+due:"",
      isWaiting(t)?`waiting on ${t.waiting.on}${waitDays(t)!=null?" for "+waitDays(t)+"d":""}`:""].filter(Boolean).join(" · ");
    H.push(`<h3>${esc(dl(t))}</h3><p class="meta">${esc(meta)}</p>`);M.push(`## ${dl(t)}`,``,`_${meta}_`,``);
    if(t.nextAction&&t.nextAction.date)list("Next action",[`${t.nextAction.date}${t.nextAction.note?" — "+t.nextAction.note:""}`]);
    para("What it is",t.description.length>700?t.description.slice(0,700)+"…":t.description);
    para("Where it stands",t.notes);
    list("Open subtasks",hoOpenSubs(t.subtasks,0,[]).map(({s:x,d})=>`${"› ".repeat(d)}${x.title||"(untitled)"}${x.dueDate?" (due "+x.dueDate+")":""}`));
    const trs=t.transports.map(tr=>{const r=[...reachedSystems(t,tr)],toc=tocFor(t,tr);
      return `${tr.number||"(unnumbered)"} — ${isCust(tr)?"customizing"+(tr.client?", client "+tr.client:""):"workbench"}${tr.released?"":", NOT released"}${r.length?", reached "+r.join("/"):", not moved yet"}${trDest(t,tr).length?", destinations "+trDest(t,tr).join(" → ")+(trComplete(t,tr)?" (complete)":""):""}${toc?", in ToC "+(toc.number||"(unnumbered)"):""}${tr.desc?" · "+tr.desc:""}`;});
    const g=golivePending(t);if(g)trs.push(`⚠ ${g.missing.length} transport(s) not yet in ${g.target}: ${g.missing.map(x=>x.number||"(TR)").join(", ")}`);
    list("Transports",trs);
    list("⚠ Object clashes",taskClashes(t,cidx).flatMap(({o,open})=>open.map(x=>`${o.name} is also in flight in ${demandLabel(x.t)} (${clashWhere(x)})`)));
    if(s.refs)list("Reference",(t.reference||[]).filter(r=>r.label||r.value).map(r=>`${r.label||"(no label)"}: ${r.secret?"(secret — not included, ask me)":r.value}`));
    list("Debugging in progress",debugForTask(t.id).filter(x=>["active","paused"].includes(x.status)).map(x=>`${x.title}${x.resume?" — resume here: "+x.resume.replace(/\s+/g," "):""}`));
    list("Latest comments",(t.comments||[]).slice(-3).map(c=>`${isoTs(c.ts)} — ${c.text.replace(/\s+/g," ")}`));
    if(s.actions){const acts=[];meetingsForTask(t.id).forEach(mt=>mt.actions.filter(a=>!a.done).forEach(a=>acts.push(`${a.text||"(no text)"}${a.owner?" ("+a.owner+")":""}${a.due?" — due "+a.due:""} · from ${mt.date} ${mt.title}`)));
      list("Open action points",acts);}
  });
  const deps=[];[...new Set(ts.map(t=>t.epicId).filter(Boolean))].map(epicById).filter(Boolean)
    .forEach(e=>e.deps.filter(x=>!x.done).forEach(x=>deps.push({e,x})));
  if(deps.length){
    H.push(`<h3>Waiting on other teams</h3><table><tr><th>Epic</th><th>Team</th><th>What they owe</th><th>Since</th><th>Expected</th><th>Last chased</th></tr>${deps.map(({e,x})=>`<tr><td>${esc(e.code||e.name)}</td><td>${esc(x.team)}</td><td>${esc(x.what)}</td><td>${x.since||"—"}</td><td>${x.expected||"—"}</td><td>${x.lastCheck||"never"}</td></tr>`).join("")}</table>`);
    M.push(`## Waiting on other teams`,``,`| Epic | Team | What they owe | Since | Expected | Last chased |`,`|---|---|---|---|---|---|`,
      ...deps.map(({e,x})=>`| ${mdc(e.code||e.name)} | ${mdc(x.team)} | ${mdc(x.what)} | ${x.since||"—"} | ${x.expected||"—"} | ${x.lastCheck||"never"} |`),``);}
  const inWin=d=>d&&d>=winStart&&d<=winEnd;
  const per=[
    ...state.playbook.filter(p=>p.kind==="freeze"&&p.from&&p.to&&p.from<=winEnd&&p.to>=winStart).map(p=>`❄ Change freeze ${p.from} → ${p.to}: ${p.title}${(p.systems||[]).length?" ("+p.systems.join(", ")+")":""}`),
    ...state.playbook.filter(p=>p.kind==="recurring"&&inWin(p.due)).map(p=>`🔁 ${p.due}: ${p.title}`),
    ...(s.todos?state.jobs.filter(j=>jobOpen(j)&&j.due&&j.due<=winEnd).map(j=>`☐ ${j.due}: ${j.title}`):[])];
  if(per.length){H.push(`<h3>During this period (${esc(winStart)} → ${esc(winEnd)})</h3>`);M.push(`## During this period (${winStart} → ${winEnd})`,``);list("Coming up",per);}
  return {html:H.join(""),md:M.join("\n")};
}
function openHandover(){
  const s=openHandover._s||(openHandover._s={to:"",from:todayStr(),until:"",intro:"",ids:null,actions:true,refs:true,todos:false});
  const live=new Set(state.tasks.map(t=>t.id));
  s.ids=new Set([...(s.ids||handoverDefaultIds())].filter(id=>live.has(id)));
  const cand=state.tasks.filter(t=>t.status!=="closed")
    .sort((a,b)=>HO_RANK[a.status]-HO_RANK[b.status]||(earliestOpenDue(a)||"9999").localeCompare(earliestOpenDue(b)||"9999"));
  const chosen=()=>cand.filter(t=>s.ids.has(t.id));
  const root=document.getElementById("modalRoot");
  const lbl='style="display:flex;align-items:center;gap:6px;margin:0;text-transform:none;letter-spacing:0;font-size:12px;font-weight:500;color:var(--muted)"';
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:880px"><h2>🧳 Handover pack</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">Everything a colleague needs to carry your open demands while you're away. The document below updates as you fill this in.</p>
    <div class="grid2"><div class="field"><label>Handing over to</label><input id="ho-to" value="${esc(s.to)}" placeholder="Name"></div>
      <div class="field"><label>Away from → back on</label><div style="display:flex;gap:6px;align-items:center"><input type="date" id="ho-from" value="${s.from}"><span class="faint">→</span><input type="date" id="ho-until" value="${s.until}"></div></div></div>
    <div class="field"><label>Opening note</label><textarea id="ho-intro" rows="2" placeholder="General context — who to escalate to, anything urgent, where things live…">${esc(s.intro)}</textarea></div>
    <details style="margin-bottom:10px"><summary style="cursor:pointer;font-size:13px">Demands included: <b id="ho-n">${s.ids.size}</b> of ${cand.length} not closed — choose…</summary>
      <div style="display:flex;gap:6px;margin:8px 0"><button class="sm" id="ho-def" title="Open, in progress, bug, and delivered-but-not-yet-in-Prod">Open work</button><button class="sm" id="ho-all">All</button><button class="sm" id="ho-none">None</button></div>
      <div class="picklist" id="ho-list" style="max-height:220px"></div></details>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px">${[["actions","Open action points from linked meetings"],["refs","Reference entries (secrets left out)"],["todos","My tasks due before I'm back"]].map(([k,l])=>`<label ${lbl}><input type="checkbox" class="ho-opt" data-k="${k}" ${s[k]?"checked":""} style="width:auto"> ${l}</label>`).join("")}</div>
    <div class="specpaper specdoc" id="ho-prev"></div>
    <div class="modal-foot"><button id="ho-copy">📋 Copy Markdown</button><button id="ho-md">⬇ Download .md</button><button id="ho-print">🖨 Print / Save PDF</button><button id="ho-close" class="primary">Close</button></div></div></div>`;
  const prev=()=>{root.querySelector("#ho-prev").innerHTML=handoverDoc(s,chosen()).html;root.querySelector("#ho-n").textContent=s.ids.size;};
  const drawList=()=>{const host=root.querySelector("#ho-list");
    host.innerHTML=cand.length?cand.map(t=>`<label class="pickrow"><input type="checkbox" data-id="${t.id}" ${s.ids.has(t.id)?"checked":""} style="width:auto"><div><div class="demand">${esc(t.demandId||"—")} · <span class="pill ${STATUS[t.status].cls}" style="font-size:9px">${STATUS[t.status].label}</span></div><div>${esc(t.title)}</div></div></label>`).join("")
      :`<div class="pickrow faint">No demands that aren't closed.</div>`;
    host.querySelectorAll("input[data-id]").forEach(cb=>cb.onchange=()=>{if(cb.checked)s.ids.add(cb.dataset.id);else s.ids.delete(cb.dataset.id);prev();});};
  /* fields update the preview live (oninput, not onchange — so nothing redraws under the cursor) */
  [["#ho-to","to"],["#ho-from","from"],["#ho-until","until"],["#ho-intro","intro"]].forEach(([sel,k])=>{root.querySelector(sel).oninput=e=>{s[k]=e.target.value;prev();};});
  root.querySelector("#ho-def").onclick=()=>{s.ids=new Set(handoverDefaultIds());drawList();prev();};
  root.querySelector("#ho-all").onclick=()=>{s.ids=new Set(cand.map(t=>t.id));drawList();prev();};
  root.querySelector("#ho-none").onclick=()=>{s.ids=new Set();drawList();prev();};
  root.querySelectorAll(".ho-opt").forEach(cb=>cb.onchange=()=>{s[cb.dataset.k]=cb.checked;prev();});
  const close=()=>root.innerHTML="";
  root.querySelector("#ho-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  root.querySelector("#ho-copy").onclick=()=>{navigator.clipboard.writeText(handoverDoc(s,chosen()).md).then(()=>toast("Markdown copied to clipboard")).catch(()=>toast("Copy failed",true));};
  root.querySelector("#ho-md").onclick=()=>{const b=new Blob([handoverDoc(s,chosen()).md],{type:"text/markdown"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="handover-"+(s.from||todayStr())+".md";a.click();URL.revokeObjectURL(a.href);};
  root.querySelector("#ho-print").onclick=()=>{const pa=document.getElementById("printArea");pa.className="specdoc";pa.innerHTML=handoverDoc(s,chosen()).html;window.print();};
  drawList();prev();
}

