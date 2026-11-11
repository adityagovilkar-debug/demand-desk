/* ===================== PLAYBOOK (processes / FAQs / freezes / contacts) ===================== */
function activePlay(){return state.playbook.find(p=>p.id===activePlayId);}
function playCategories(){return [...new Set(state.playbook.map(p=>p.category).filter(Boolean))].sort();}
function renderPlaybookSidebar(){
  const cats=playCategories();
  document.getElementById("side").innerHTML=`
    <div class="side-tools">
      <button class="primary" id="btnNewPlay" style="width:100%">＋ New entry</button>
      <div class="filters">
        <select id="pFk"><option value="">All kinds</option>${Object.entries(PLAY_KINDS).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join("")}</select>
        ${cats.length?`<select id="pFc"><option value="">All categories</option>${cats.map(c=>`<option>${esc(c)}</option>`).join("")}</select>`:""}
      </div>
      <p class="faint" style="font-size:11px;margin:0">Tribal knowledge, kept findable: how-tos, FAQs, freeze windows, recurring obligations, who-to-contact lists. 📌 pins float to the top; everything is in Ctrl+K search.</p>
    </div>
    <div class="listwrap" id="pbList"></div>`;
  document.getElementById("btnNewPlay").onclick=()=>{
    const p=normPlay({kind:renderPlaybookSidebar._fk||"process",title:"New entry",category:renderPlaybookSidebar._fc||""});
    state.playbook.unshift(p);activePlayId=p.id;playTeam=false;markDirty();renderApp();};
  const fk=document.getElementById("pFk");fk.value=renderPlaybookSidebar._fk||"";
  fk.onchange=()=>{renderPlaybookSidebar._fk=fk.value;renderPlaybookSidebar();};
  const fc=document.getElementById("pFc");
  if(fc){fc.value=renderPlaybookSidebar._fc||"";fc.onchange=()=>{renderPlaybookSidebar._fc=fc.value;renderPlaybookSidebar();};}
  const el=document.getElementById("pbList");
  {const n=state.people.filter(p=>p.active).length,busy=state.people.filter(p=>demandsOf(p.id).some(t=>!["delivered","closed"].includes(t.status))).length;
   el.insertAdjacentHTML("beforebegin",`<div class="tcard pin-team ${playTeam?"active":""}" id="pbTeam"><div class="demand">👥 My team</div><div class="ttitle">The people you hand demands to</div>
     <div class="meta"><span class="faint">${n?`${n} ${n>1?"people":"person"}${busy?` · ${busy} building something`:""}`:"add your team"}</span></div></div>`);
   document.getElementById("pbTeam").onclick=()=>{playTeam=true;activePlayId=null;renderApp();};}
  let rows=state.playbook.filter(p=>(!renderPlaybookSidebar._fk||p.kind===renderPlaybookSidebar._fk)&&(!renderPlaybookSidebar._fc||p.category===renderPlaybookSidebar._fc));
  rows.sort((a,b)=>(b.pinned-a.pinned)||b.updatedAt-a.updatedAt);
  if(!rows.length){el.innerHTML=`<div class="empty">No entries${renderPlaybookSidebar._fk||renderPlaybookSidebar._fc?" match the filter":""} yet.<br>Capture a process before it gets<br>lost in old mails and chats.</div>`;return;}
  el.innerHTML=rows.map(p=>{const K=PLAY_KINDS[p.kind];let sub="";
    if(p.kind==="recurring"&&p.due){const n=daysUntil(p.due);sub=`<span class="due ${n<0?"over":n<=14?"soon":""}">⏰ due ${p.due}</span>`;}
    else if(p.kind==="freeze"&&p.from){const act=p.from<=todayStr()&&todayStr()<=(p.to||"");sub=`<span class="mono" style="font-size:11px">${p.from} → ${p.to||"?"}</span>${act?' <span class="expbadge">ACTIVE</span>':""}`;}
    else if(p.kind==="process")sub=p.steps.length?`<span class="faint">${p.steps.length} step(s)</span>`:"";
    else if(p.kind==="contacts")sub=p.people.length?`<span class="faint">👤 ${p.people.length}</span>`:"";
    else sub=`<span class="faint">${esc((p.body||"").replace(/\s+/g," ").slice(0,48))}</span>`;
    return `<div class="tcard ${p.id===activePlayId?"active":""}" data-id="${p.id}">
      <div class="demand">${K.icon} ${K.label}${p.pinned?" · 📌":""}</div>
      <div class="ttitle">${esc(p.title)}</div>
      <div class="meta">${p.category?`<span class="pill" style="color:var(--accent2);border-color:var(--violet-line)">${esc(p.category)}</span>`:""}${sub}${imagesFor("playbook",p.id).length?`<span class="lc-badge">📷 ${imagesFor("playbook",p.id).length}</span>`:""}</div></div>`;}).join("");
  el.querySelectorAll(".tcard").forEach(x=>x.onclick=()=>{activePlayId=x.dataset.id;playTeam=false;renderApp();});
}
function renderPlaybookDetail(){
  const p=activePlay(),host=document.getElementById("detail");
  if(playTeam){renderTeamPage(host);return;}
  if(!p){host.innerHTML=nopick("Select an entry, or create one —<br>a process, FAQ, freeze period,<br>recurring task or contact list.");return;}
  const K=PLAY_KINDS[p.kind];
  host.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1">
      <input id="pb-title" value="${esc(p.title)}" style="font-size:18px;font-weight:650;border-color:transparent;background:transparent;padding:2px 4px;width:100%">
      <div class="dh-dates" style="margin-top:8px">
        <span>Kind <select id="pb-kind" style="width:230px">${Object.entries(PLAY_KINDS).map(([k,v])=>`<option value="${k}" ${k===p.kind?"selected":""}>${v.icon} ${v.label}</option>`).join("")}</select></span>
        <span style="flex:1">Category <input id="pb-cat" list="dl-pcat" value="${esc(p.category)}" placeholder="e.g. Access, Go-live, Payroll, Onboarding"><datalist id="dl-pcat">${playCategories().map(c=>`<option value="${esc(c)}">`).join("")}</datalist></span>
      </div></div>
      <div style="display:flex;gap:6px;align-self:flex-start">
        <button class="sm" id="pb-pin" title="Pinned entries float to the top of the list">${p.pinned?"📌 Pinned":"📍 Pin"}</button>
        <button class="sm" id="pb-print" title="Print / save as PDF — e.g. to hand to a new team member">🖨 Print</button>
        <button class="sm danger" id="pb-del">🗑 Delete</button>
      </div></div>
    <div class="tabs"><button class="tab active">${K.icon} ${K.label}</button></div></div>
    <div class="detail-body">
      <div class="field"><label>${p.kind==="faq"?"Answer":"Description / notes"}</label><textarea id="pb-body" style="min-height:110px" placeholder="${p.kind==="faq"?"The answer…":"Context, links to official docs, when this applies…"}">${esc(p.body)}</textarea></div>
      <div id="pb-links">${linkChips(p.body)}</div>
      <div id="pb-kind-sec" style="margin-top:14px"></div>
      <div id="pb-imgs" style="margin-top:18px"></div>
    </div>`;
  host.querySelector("#pb-title").onchange=e=>{p.title=e.target.value||"(untitled)";touch(p);renderPlaybookSidebar();};
  host.querySelector("#pb-kind").onchange=e=>{p.kind=e.target.value;touch(p);renderApp();};
  host.querySelector("#pb-cat").onchange=e=>{p.category=e.target.value.trim();touch(p);renderPlaybookSidebar();};
  host.querySelector("#pb-body").onchange=e=>{p.body=e.target.value;touch(p);const l=host.querySelector("#pb-links");if(l)l.innerHTML=linkChips(p.body);};
  host.querySelector("#pb-pin").onclick=()=>{p.pinned=!p.pinned;touch(p);renderApp();};
  host.querySelector("#pb-print").onclick=()=>printPlay(p);
  host.querySelector("#pb-del").onclick=()=>deleteWithUndo("Deleted the playbook entry",()=>{state.playbook=state.playbook.filter(x=>x.id!==p.id);state.tasks.forEach(t=>(t.lessons||[]).forEach(l=>{if(l.playId===p.id)l.playId="";}));state.images.forEach(im=>im.links=im.links.filter(l=>!(l.kind==="playbook"&&l.id===p.id)));activePlayId=null;});
  renderPlayKind(host.querySelector("#pb-kind-sec"),p);
  renderImagesSection(host.querySelector("#pb-imgs"),"playbook",p.id);
}
function renderPlayKind(body,p){
  if(p.kind==="process"){
    body.innerHTML=`<div class="sec-title"><h3>Steps</h3><div class="ln"></div><button class="sm" id="st-add">＋ Add step</button></div><div id="st-list"></div>`;
    body.querySelector("#st-add").onclick=()=>{p.steps.push({id:uid(),text:""});touch(p);renderPlayKind(body,p);renderPlaybookSidebar();};
    const host=body.querySelector("#st-list");
    if(!p.steps.length){host.innerHTML=`<div class="faint" style="font-size:12px;padding:4px 2px">No steps yet — use “＋ Add step”.</div>`;return;}
    host.innerHTML="";
    p.steps.forEach((s,i)=>{const row=document.createElement("div");row.className="actitem";
      row.innerHTML=`<span class="mono" style="flex:0 0 26px;color:var(--accent);font-weight:700;text-align:right">${i+1}.</span>
        <span class="at">${s.text?linkify(s.text):"<span class='faint'>(click to write the step)</span>"}</span>
        <span class="nact"><button class="ghost sm s-up" title="Move up" ${i===0?"disabled":""}>↑</button><button class="ghost sm s-dn" title="Move down" ${i===p.steps.length-1?"disabled":""}>↓</button><button class="ghost sm danger s-del">🗑</button></span>`;
      const at=row.querySelector(".at");
      at.onclick=e=>{if(e.target.tagName==="A")return;editInline(at,s.text,v=>{s.text=v;touch(p);renderPlayKind(body,p);});};
      row.querySelector(".s-up").onclick=()=>{[p.steps[i-1],p.steps[i]]=[p.steps[i],p.steps[i-1]];touch(p);renderPlayKind(body,p);};
      row.querySelector(".s-dn").onclick=()=>{[p.steps[i+1],p.steps[i]]=[p.steps[i],p.steps[i+1]];touch(p);renderPlayKind(body,p);};
      row.querySelector(".s-del").onclick=()=>{p.steps.splice(i,1);touch(p);renderPlayKind(body,p);renderPlaybookSidebar();};
      host.appendChild(row);});
    return;
  }
  if(p.kind==="recurring"){
    const n=p.due?daysUntil(p.due):null;
    body.innerHTML=`<div class="sec-title"><h3>Schedule</h3><div class="ln"></div></div>
      <div class="grid2" style="max-width:520px">
        <div class="field"><label>Next due</label><input type="date" id="rc-due" value="${p.due||""}"></div>
        <div class="field"><label>Repeats</label><select id="rc-rec">${[["annual","Annually"],["quarterly","Quarterly"],["monthly","Monthly"],["once","One-off"]].map(([k,l])=>`<option value="${k}" ${k===p.recur?"selected":""}>${l}</option>`).join("")}</select></div>
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        ${p.due?`<span class="due ${n<0?"over":n<=14?"soon":""}" style="font-size:13px">⏰ due ${p.due}${n!=null?` (${n<0?(-n)+"d overdue":"in "+n+"d"})`:""}</span>`:`<span class="faint">no date set — it won't surface on Today</span>`}
        <button class="sm" id="rc-done">✓ Done — advance to next</button>
        ${p.lastDone?`<span class="faint" style="font-size:11px">last done ${fmtTs(p.lastDone)}</span>`:""}
      </div>
      <p class="faint" style="font-size:12px">Appears on the Today dashboard from 14 days before it's due.</p>`;
    body.querySelector("#rc-due").onchange=e=>{p.due=e.target.value;touch(p);renderApp();};
    body.querySelector("#rc-rec").onchange=e=>{p.recur=e.target.value;touch(p);};
    body.querySelector("#rc-done").onclick=()=>{advanceRecurring(p);touch(p);renderApp();toast(p.due?"Done ✓ — next due "+p.due:"Done ✓");};
    return;
  }
  if(p.kind==="freeze"){
    const all=[];state.settings.landscapes.forEach(L=>state.settings.tiers.forEach(T=>all.push(L+T.d)));
    const act=p.from&&p.to&&p.from<=todayStr()&&todayStr()<=p.to;
    body.innerHTML=`<div class="sec-title"><h3>Freeze window</h3><div class="ln"></div>${act?'<span class="expbadge">ACTIVE NOW</span>':""}</div>
      <div class="grid2" style="max-width:520px">
        <div class="field"><label>From</label><input type="date" id="fz-from" value="${p.from||""}"></div>
        <div class="field"><label>To (inclusive)</label><input type="date" id="fz-to" value="${p.to||""}"></div>
      </div>
      <label>Frozen systems — click to toggle</label>
      <div class="chiprow" id="fz-sys" style="margin-top:6px">${all.map(s=>`<button class="sys ${sysTierCls(s)}" data-s="${s}" style="cursor:pointer;opacity:${(p.systems||[]).includes(s)?"1":".35"}">${s}${(p.systems||[]).includes(s)?" ✓":""}</button>`).join("")}</div>
      <p class="faint" style="font-size:12px;margin-top:10px">While active, the go-live check on every demand warns when its target system is frozen; the freeze also shows on Today from 14 days before it starts.</p>`;
    body.querySelector("#fz-from").onchange=e=>{p.from=e.target.value;touch(p);renderApp();};
    body.querySelector("#fz-to").onchange=e=>{p.to=e.target.value;touch(p);renderApp();};
    body.querySelectorAll("#fz-sys [data-s]").forEach(b=>b.onclick=()=>{const s=b.dataset.s;p.systems=p.systems||[];
      if(p.systems.includes(s))p.systems=p.systems.filter(x=>x!==s);else p.systems.push(s);
      touch(p);renderPlayKind(body,p);});
    return;
  }
  if(p.kind==="contacts"){
    body.innerHTML=`<div class="sec-title"><h3>People</h3><div class="ln"></div><button class="sm" id="pp-add">＋ Add person</button></div>
      <div class="tbl-wrap"><table><thead><tr><th style="width:24%">Name</th><th style="width:32%">Role / responsibility</th><th>Contact (mail, phone, Teams…)</th><th style="width:34px"></th></tr></thead><tbody id="pp-body"></tbody></table></div>`;
    body.querySelector("#pp-add").onclick=()=>{p.people.push({id:uid(),name:"",role:"",contact:""});touch(p);renderPlayKind(body,p);renderPlaybookSidebar();};
    const tb=body.querySelector("#pp-body");
    tb.innerHTML=p.people.length?p.people.map(x=>`<tr data-id="${x.id}">
      <td><input class="pp-n" value="${esc(x.name)}" placeholder="Name"></td>
      <td><input class="pp-r" value="${esc(x.role)}" placeholder="e.g. Basis lead, product owner"></td>
      <td><input class="pp-c" value="${esc(x.contact)}" placeholder="email / phone / Teams"></td>
      <td><button class="ghost sm danger pp-x">🗑</button></td></tr>`).join(""):`<tr><td colspan="4" class="faint" style="padding:12px;text-align:center">No people yet.</td></tr>`;
    tb.querySelectorAll("tr[data-id]").forEach(tr=>{const x=p.people.find(y=>y.id===tr.dataset.id);
      tr.querySelector(".pp-n").onchange=e=>{x.name=e.target.value;touch(p);};
      tr.querySelector(".pp-r").onchange=e=>{x.role=e.target.value;touch(p);};
      tr.querySelector(".pp-c").onchange=e=>{x.contact=e.target.value;touch(p);};
      tr.querySelector(".pp-x").onclick=()=>{p.people=p.people.filter(y=>y.id!==x.id);touch(p);renderPlayKind(body,p);};});
    return;
  }
  if(p.kind==="lesson"){const t=p.fromTaskId?state.tasks.find(x=>x.id===p.fromTaskId):null;
    body.innerHTML=t?`<div class="faint" style="font-size:12px">💡 Learned on <a href="#" id="pb-from">${esc(t.demandId||"")} ${esc(t.title)}</a>${p.fromDate?" · "+p.fromDate:""}</div>`:"";
    const a=body.querySelector("#pb-from");if(a)a.onclick=e=>{e.preventDefault();view="demands";activeId=t.id;activeTab="overview";renderApp();};return;}
  body.innerHTML=""; /* faq — the body IS the answer */
}
function printPlay(p){
  const K=PLAY_KINDS[p.kind];
  const pa=document.getElementById("printArea");pa.className="specdoc";
  pa.innerHTML=`<h1>${esc(p.title)}</h1>
    <p class="meta">${K.label}${p.category?" · "+esc(p.category):""} · printed ${todayStr()}</p>
    ${p.body?`<div class="note">${esc(p.body)}</div>`:""}
    ${p.kind==="process"&&p.steps.length?`<h3>Steps</h3><ol>${p.steps.map(s=>`<li>${esc(s.text)}</li>`).join("")}</ol>`:""}
    ${p.kind==="recurring"?`<p><b>Next due:</b> ${p.due||"—"} · <b>Repeats:</b> ${p.recur}</p>`:""}
    ${p.kind==="freeze"?`<p><b>Window:</b> ${p.from||"—"} → ${p.to||"—"}</p><p><b>Systems:</b> ${(p.systems||[]).join(", ")||"—"}</p>`:""}
    ${p.kind==="contacts"&&p.people.length?`<table><tr><th>Name</th><th>Role</th><th>Contact</th></tr>${p.people.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.role)}</td><td>${esc(x.contact)}</td></tr>`).join("")}</table>`:""}`;
  window.print();
}

