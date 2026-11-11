/* ===================== OBJECT INDEX (cross-reference) ===================== */
/* Add / rename / reorder / remove the object types offered in the Objects tab. */
function openObjTypes(onDone){
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:460px"><h2>⚙ Object types</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">These fill the <b>Type</b> dropdown on every demand's Objects tab. Renaming one here leaves objects already logged untouched; removing one keeps it on the objects that use it, it just stops being offered.</p>
    <div id="ot-list"></div>
    <div style="display:flex;gap:6px;margin-top:10px"><input id="ot-new" placeholder="New type, e.g. CDS View  (Enter to add)" style="flex:1"><button class="sm primary" id="ot-add">＋ Add</button></div>
    <div class="modal-foot"><button id="ot-reset" class="ghost">↺ Restore defaults</button><button id="ot-close" class="primary">Done</button></div></div></div>`;
  const draw=()=>{const host=root.querySelector("#ot-list"),list=objTypes();
    host.innerHTML=`<div class="tbl-wrap" style="max-height:300px;overflow:auto"><table><tbody>${list.map((x,i)=>{const n=objTypeUsage(x);
      return `<tr data-i="${i}"><td style="width:26px;text-align:right" class="faint mono">${i+1}</td>
        <td><input class="ot-n" value="${esc(x)}"></td>
        <td style="width:74px" class="faint" title="Objects logged with this type">${n?n+" used":""}</td>
        <td style="width:96px;text-align:right;white-space:nowrap"><button class="ghost sm ot-up" ${i?"":"disabled"}>↑</button><button class="ghost sm ot-dn" ${i<list.length-1?"":"disabled"}>↓</button><button class="ghost sm danger ot-x">🗑</button></td></tr>`;}).join("")}</tbody></table></div>`;
    const save=arr=>{state.settings.objTypes=arr;markDirty();draw();};
    host.querySelectorAll("tr[data-i]").forEach(tr=>{const i=+tr.dataset.i,arr=objTypes().slice();
      tr.querySelector(".ot-n").onchange=ev=>{const v=ev.target.value.trim();
        if(!v){ev.target.value=arr[i];return;}
        if(arr.some((y,j)=>j!==i&&y===v)){toast("That type already exists",true);ev.target.value=arr[i];return;}
        arr[i]=v;save(arr);};
      tr.querySelector(".ot-up").onclick=()=>{if(i){[arr[i-1],arr[i]]=[arr[i],arr[i-1]];save(arr);}};
      tr.querySelector(".ot-dn").onclick=()=>{if(i<arr.length-1){[arr[i+1],arr[i]]=[arr[i],arr[i+1]];save(arr);}};
      tr.querySelector(".ot-x").onclick=async()=>{
        if(arr.length===1){toast("Keep at least one type",true);return;}
        const n=objTypeUsage(arr[i]);
        if(n&&!await askOk(`“${arr[i]}” is used by ${n} object(s). They keep the type — it just won't be offered for new ones.`,{title:"Remove this type from the list?",ok:"Remove"}))return;
        arr.splice(i,1);save(arr);};});};
  const add=()=>{const el=root.querySelector("#ot-new"),v=el.value.trim();if(!v)return;
    const arr=objTypes().slice();
    if(arr.includes(v)){toast("That type already exists",true);return;}
    arr.push(v);state.settings.objTypes=arr;markDirty();el.value="";draw();el.focus();};
  root.querySelector("#ot-add").onclick=add;
  root.querySelector("#ot-new").onkeydown=ev=>{if(ev.key==="Enter")add();};
  root.querySelector("#ot-reset").onclick=async()=>{if(await askOk("Objects already logged keep their current type.",{title:"Restore the built-in object types?",ok:"Restore"}))
    {state.settings.objTypes=[...DEF_OBJ_TYPES];markDirty();draw();}};
  const close=()=>{root.innerHTML="";if(onDone)onDone();};
  root.querySelector("#ot-close").onclick=close;
  root.querySelector(".modal-bg").onclick=ev=>{if(ev.target===root.querySelector(".modal-bg"))close();};
  draw();
}
function openObjectIndex(){
  const root=document.getElementById("modalRoot");
  const map={},dmap={};
  state.tasks.forEach(t=>t.objects.forEach(o=>{const k=(o.name||"").trim().toUpperCase();if(!k)return;(map[k]=map[k]||[]).push({t,o});}));
  state.debug.forEach(s=>{
    s.objects.forEach(o=>{const k=(o.name||"").trim().toUpperCase();if(!k)return;(dmap[k]=dmap[k]||[]).push({s,note:o.note});});
    s.breakpoints.forEach(b=>{const k=(b.object||"").trim().toUpperCase();if(!k)return;(dmap[k]=dmap[k]||[]).push({s,note:(b.line?"bp@"+b.line:"breakpoint")+(b.condition?" "+b.condition:"")});});
  });
  const names=[...new Set([...Object.keys(map),...Object.keys(dmap)])].sort(),cidx=clashIndex();
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:660px"><h2>⌕ Object cross-reference</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">Every demand and debug session that touched an object — for when the same issue resurfaces months later.</p>
    <div style="display:flex;gap:10px;align-items:center"><input id="oi-q" placeholder="Filter objects (e.g. ZFI_AGEING)…" autocomplete="off" style="flex:1">
      <label style="display:flex;align-items:center;gap:6px;margin:0;text-transform:none;letter-spacing:0;font-size:12px;font-weight:500;color:var(--muted);white-space:nowrap"><input type="checkbox" id="oi-clash" style="width:auto"> only clashes (${cidx.size})</label></div>
    <div id="oi-list" class="picklist" style="margin-top:10px;max-height:48vh"></div>
    <div class="modal-foot"><button id="oi-close" class="primary">Close</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector("#oi-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  const listEl=root.querySelector("#oi-list");
  const draw=q=>{q=(q||"").trim().toUpperCase();
    const onlyC=root.querySelector("#oi-clash").checked;
    const show=names.filter(n=>(!q||n.includes(q))&&(!onlyC||cidx.has(n)));
    if(!show.length){listEl.innerHTML=`<div class="pickrow faint">No objects logged${q?" match “"+esc(q)+"”":""}.</div>`;return;}
    listEl.innerHTML=show.map(n=>{const uses=map[n]||[],duses=dmap[n]||[];
      return `<div class="pickrow" style="display:block;cursor:default">
        <div class="mono" style="color:var(--accent);font-weight:600">${esc(n)} <span class="faint" style="font-weight:400">· ${uses.length} demand(s)${duses.length?" · "+duses.length+" debug":""}</span>${cidx.has(n)?`<span class="clashtag">⚠ in flight in ${new Set(cidx.get(n).map(x=>x.t.id)).size} demands</span>`:""}</div>
        ${uses.map(u=>{const trs=trsForObject(u.t,u.o.id);return `<div style="font-size:12px;margin:3px 0 0 6px"><a class="oi-go" data-id="${u.t.id}" style="cursor:pointer">📋 ${esc(demandLabel(u.t))}</a> <span class="faint">— ${esc(u.o.action)}${u.o.desc?": "+esc(u.o.desc):""}${trs.length?" · in "+trs.map(x=>esc(x.number||"(TR)")).join(", "):""}</span></div>`;}).join("")}
        ${duses.map(u=>`<div style="font-size:12px;margin:3px 0 0 6px"><a class="oi-dgo" data-id="${u.s.id}" style="cursor:pointer">🐞 ${esc(u.s.title)}</a> <span class="faint">${u.note?"— "+esc(u.note):""}</span></div>`).join("")}</div>`;}).join("");
    listEl.querySelectorAll(".oi-go").forEach(a=>a.onclick=()=>{view="demands";activeId=a.dataset.id;activeTab="objects";close();renderApp();});
    listEl.querySelectorAll(".oi-dgo").forEach(a=>a.onclick=()=>{view="debug";activeDebugId=a.dataset.id;close();renderApp();});
  };
  draw("");
  const q=root.querySelector("#oi-q");q.focus();q.oninput=()=>draw(q.value);
  root.querySelector("#oi-clash").onchange=()=>draw(q.value);
}

/* ===================== PORTFOLIO (project / theme rollup) ===================== */
function openPortfolio(){
  const root=document.getElementById("modalRoot");
  let dim="project";
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:700px"><h2>▦ Portfolio overview</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">Everything grouped by initiative or functional area — e.g. all work done for Sailpoint, or every TRem change.</p>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
      <div class="nav" style="background:var(--panel2)"><button class="navbtn active" data-dim="project">By Project</button><button class="navbtn" data-dim="theme">By Theme</button><button class="navbtn" data-dim="epic">By Epic</button></div>
      <input id="pf-q" placeholder="Filter…" style="flex:1" autocomplete="off">
    </div>
    <div id="pf-list" class="picklist" style="max-height:56vh"></div>
    <div class="modal-foot"><button id="pf-close" class="primary">Close</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector("#pf-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  const listEl=root.querySelector("#pf-list");
  const draw=()=>{
    const q=(root.querySelector("#pf-q").value||"").trim().toLowerCase();
    const groups={};
    state.tasks.forEach(t=>{
      const raw=dim==="epic"?(()=>{const e=epicById(t.epicId);return e?epicLabel(e):"";})():t[dim];
      const key=(raw||"").trim()||"— (none) —";(groups[key]=groups[key]||[]).push(t);});
    let names=Object.keys(groups).sort((a,b)=>a==="— (none) —"?1:b==="— (none) —"?-1:a.localeCompare(b));
    if(q)names=names.filter(n=>n.toLowerCase().includes(q)||groups[n].some(t=>[t.demandId,t.title].join(" ").toLowerCase().includes(q)));
    if(!names.length){listEl.innerHTML=`<div class="pickrow faint">Nothing matches “${esc(q)}”.</div>`;return;}
    listEl.innerHTML=names.map(n=>{const items=groups[n];const sc={};items.forEach(t=>sc[t.status]=(sc[t.status]||0)+1);
      const objs=new Set(),trs=new Set();items.forEach(t=>{t.objects.forEach(o=>o.name&&objs.add(o.name));t.transports.forEach(tr=>tr.number&&trs.add(tr.number));});
      const badges=Object.entries(sc).map(([k,v])=>`<span class="pill ${STATUS[k].cls}" style="font-size:10px">${v} ${STATUS[k].label}</span>`).join(" ");
      return `<div class="pickrow" style="display:block;cursor:default">
        <div style="display:flex;align-items:center;gap:8px"><div style="font-weight:700;color:var(--accent2)">▦ ${esc(n)}</div><span class="faint" style="font-size:11px">${items.length} demand(s)</span>${n!=="— (none) —"?`<a class="pf-filter" data-n="${esc(n)}" style="margin-left:auto;font-size:11px;cursor:pointer">filter list →</a>`:""}</div>
        <div style="margin:5px 0">${badges}</div>
        ${items.map(t=>`<div style="font-size:12px;margin:2px 0 0 6px"><a class="pf-go" data-id="${t.id}" style="cursor:pointer">${esc(t.demandId||"—")} · ${esc(t.title)}</a> <span class="pill ${STATUS[t.status].cls}" style="font-size:9px">${STATUS[t.status].label}</span></div>`).join("")}
        ${(objs.size||trs.size)?`<div style="font-size:11px;margin:6px 0 0 6px" class="faint">${objs.size?"Objects: "+[...objs].map(esc).join(", "):""}${objs.size&&trs.size?" · ":""}${trs.size?"TRs: "+[...trs].map(esc).join(", "):""}</div>`:""}
      </div>`;}).join("");
    listEl.querySelectorAll(".pf-go").forEach(a=>a.onclick=()=>{view="demands";activeId=a.dataset.id;activeTab="overview";close();renderApp();});
    listEl.querySelectorAll(".pf-filter").forEach(a=>a.onclick=()=>{const n=a.dataset.n;
      const dv=dvGet();dv.f={};dv.status=[];dv.only=[];dvQuery="";
      if(dim==="project")dv.f.project=n;
      else if(dim==="theme")dv.f.theme=n;
      else{const e=state.epics.find(x=>epicLabel(x)===n);if(e)dv.f.epic=e.id;}
      dvSet(dv);
      view="demands";close();renderApp();});
  };
  root.querySelectorAll(".navbtn[data-dim]").forEach(b=>b.onclick=()=>{dim=b.dataset.dim;root.querySelectorAll(".navbtn[data-dim]").forEach(x=>x.classList.toggle("active",x===b));draw();});
  root.querySelector("#pf-q").oninput=draw;
  root.querySelector("#pf-q").focus();
  draw();
}

/* ===================== AGING INSIGHTS ===================== */
function openAging(){
  const root=document.getElementById("modalRoot");
  const now=Date.now();
  const days=ms=>Math.floor(ms/86400000);
  const statusSince=t=>{let last=null;(t.timeline||[]).forEach(e=>{if(e.type==="status"&&(!last||e.ts>last))last=e.ts;});return last||t.createdAt;};
  const open=state.tasks.filter(t=>!["closed","delivered"].includes(t.status))
    .map(t=>({t,age:t.receivedDate?Math.max(0,-daysUntil(t.receivedDate)):days(now-t.createdAt),inStatus:days(now-statusSince(t))}))
    .sort((a,b)=>b.age-a.age);
  const leads=[];state.tasks.forEach(t=>{
    const first=(t.timeline||[]).filter(e=>e.type==="status"&&e.to==="delivered").map(e=>e.ts).sort((a,b)=>a-b)[0];
    if(first&&t.receivedDate){const lead=days(first-new Date(t.receivedDate+"T00:00:00").getTime());if(lead>=0)leads.push({t,lead,rw:reworkCount(t)});}});
  leads.sort((a,b)=>b.lead-a.lead);
  const avg=leads.length?Math.round(leads.reduce((s,x)=>s+x.lead,0)/leads.length):0;
  const med=leads.length?leads.map(x=>x.lead).sort((a,b)=>a-b)[Math.floor(leads.length/2)]:0;
  const ageCol=n=>n>30?"var(--red)":n>14?"var(--amber)":"var(--txt)";
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:760px"><h2>📈 Aging insights</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">How long things have been sitting, and how long delivery actually takes. Click a row to open the demand.</p>
    <div class="sec-title"><h3>Open demands by age</h3><div class="ln"></div><span class="faint" style="font-size:12px">${open.length} open · red &gt;30d · amber &gt;14d</span></div>
    ${open.length?`<div class="tbl-wrap"><table><thead><tr><th>Demand</th><th style="width:110px">Status</th><th style="width:64px">Age</th><th style="width:86px">In status</th><th style="width:150px">Waiting on</th><th style="width:100px">Due</th></tr></thead><tbody>
      ${open.map(({t,age,inStatus})=>`<tr class="ag-go" data-id="${t.id}" style="cursor:pointer"><td style="padding:7px 9px">${esc(t.demandId||"—")} · ${esc(t.title)}</td><td><span class="pill ${STATUS[t.status].cls}" style="font-size:10px">${STATUS[t.status].label}</span></td><td class="mono" style="color:${ageCol(age)};font-weight:700">${age}d</td><td class="mono">${inStatus}d</td><td style="font-size:12px">${isWaiting(t)?"⏳ "+esc(t.waiting.on)+(waitDays(t)!=null?" · "+waitDays(t)+"d":""):"—"}</td><td class="mono due ${dueClass(t.dueDate,t.status)}">${t.dueDate||"—"}</td></tr>`).join("")}</tbody></table></div>`
    :`<p class="faint">No open demands. 🎉</p>`}
    <div class="sec-title" style="margin-top:16px"><h3>Delivery lead times</h3><div class="ln"></div><span class="faint" style="font-size:12px">received → first delivered</span></div>
    ${leads.length?`<div class="stats" style="border:none;padding:0;margin-bottom:10px"><div class="stat"><b>${leads.length}</b>delivered</div><div class="stat op"><b>${avg}d</b>avg lead</div><div class="stat"><b>${med}d</b>median</div><div class="stat ov"><b>${leads.filter(x=>x.rw).length}</b>with rework</div></div>
      <div class="tbl-wrap"><table><thead><tr><th>Demand</th><th style="width:100px">Lead time</th><th style="width:100px">Rework</th></tr></thead><tbody>
      ${leads.map(({t,lead,rw})=>`<tr class="ag-go" data-id="${t.id}" style="cursor:pointer"><td style="padding:7px 9px">${esc(t.demandId||"—")} · ${esc(t.title)}</td><td class="mono">${lead}d</td><td>${rw?`<span style="color:var(--red)">↻ ${rw}</span>`:"—"}</td></tr>`).join("")}</tbody></table></div>`
    :`<p class="faint">No delivered demands with a received date yet — lead times appear once you deliver.</p>`}
    <div class="modal-foot"><button id="ag-close" class="primary">Close</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector("#ag-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  root.querySelectorAll(".ag-go").forEach(r=>r.onclick=()=>{view="demands";activeId=r.dataset.id;activeTab="overview";close();renderApp();});
}

