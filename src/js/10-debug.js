/* ===================== DEBUG TRACKER ===================== */
function activeDebug(){return state.debug.find(s=>s.id===activeDebugId);}
function renderDebugSidebar(){
  document.getElementById("side").innerHTML=`
    <div class="side-tools">
      <select id="dFilter"><option value="">All statuses</option>${Object.entries(DEBUG_STATUS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("")}</select>
      <button class="primary" id="btnNewDbg" style="width:100%">＋ New debug session</button>
    </div>
    <div class="listwrap" id="dList"></div>`;
  document.getElementById("btnNewDbg").onclick=()=>{const s={id:uid(),title:"New debug session",demandId:"",taskId:"",status:"active",resume:"",notes:"",objects:[],breakpoints:[],findings:[],watches:[],createdAt:Date.now(),updatedAt:Date.now()};state.debug.unshift(s);activeDebugId=s.id;markDirty();renderApp();};
  const fd=document.getElementById("dFilter");fd.value=renderDebugSidebar._f||"";
  fd.onchange=()=>{renderDebugSidebar._f=fd.value;renderDebugSidebar();};
  const el=document.getElementById("dList");
  let rows=state.debug.slice().filter(s=>!renderDebugSidebar._f||s.status===renderDebugSidebar._f).sort((a,b)=>b.updatedAt-a.updatedAt);
  if(!rows.length){el.innerHTML=`<div class="empty">No debug sessions.<br>Track breakpoints, findings &amp; where<br>you left off — pick up after a weekend.</div>`;return;}
  el.innerHTML=rows.map(s=>{const st=DEBUG_STATUS[s.status];
    return `<div class="tcard s-${st.cls} ${s.id===activeDebugId?"active":""}" data-id="${s.id}">
      <div class="demand">${esc(s.demandId||"— no demand —")}</div>
      <div class="ttitle">${esc(s.title)}</div>
      <div class="meta"><span class="pill ${st.cls}">${st.label}</span>
        ${s.objects.length?`<span class="faint">⌖ ${s.objects.length}</span>`:""}
        ${s.breakpoints.length?`<span class="faint">● ${s.breakpoints.length} bp</span>`:""}
        ${s.findings.length?`<span class="faint">📝 ${s.findings.length}</span>`:""}</div></div>`;}).join("");
  el.querySelectorAll(".tcard").forEach(x=>x.onclick=()=>{activeDebugId=x.dataset.id;renderApp();});
}
function renderDebugDetail(){
  const s=activeDebug(),host=document.getElementById("detail");
  if(!s){host.innerHTML=nopick("Select a debug session, or create a new<br>one to track breakpoints &amp; findings.");return;}
  const st=DEBUG_STATUS[s.status];
  host.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1">
      <input id="d-title" value="${esc(s.title)}" style="font-size:18px;font-weight:650;border-color:transparent;background:transparent;padding:2px 4px;width:100%">
      <div class="dh-dates" style="margin-top:8px">
        <span>Demand ID <input id="d-demand" class="mono" value="${esc(s.demandId)}" placeholder="(optional)" style="width:140px"></span>
        <span>Status <select id="d-status" style="width:130px">${Object.entries(DEBUG_STATUS).map(([k,v])=>`<option value="${k}" ${k===s.status?"selected":""}>${v.label}</option>`).join("")}</select></span>
        <span style="flex:1">Link demand <select id="d-link"><option value="">— none —</option>${state.tasks.map(t=>`<option value="${t.id}" ${t.id===s.taskId?"selected":""}>${esc(t.demandId||"")} ${esc(t.title)}</option>`).join("")}</select></span>
      </div></div>
      <div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end"><span class="pill ${st.cls}" style="font-size:12px">${st.label}</span>
        <button class="sm danger" id="d-del">🗑 Delete</button></div></div>
    <div class="tabs"><button class="tab active">Workbench</button></div></div>
    <div class="detail-body" id="dBody"></div>`;
  host.querySelector("#d-title").onchange=e=>{s.title=e.target.value||"(untitled debug)";touch(s);renderDebugSidebar();};
  host.querySelector("#d-demand").onchange=e=>{s.demandId=e.target.value;touch(s);renderDebugSidebar();};
  host.querySelector("#d-status").onchange=e=>{s.status=e.target.value;touch(s);renderDebugDetail();renderDebugSidebar();};
  host.querySelector("#d-link").onchange=e=>{s.taskId=e.target.value;const t=state.tasks.find(x=>x.id===e.target.value);if(t&&!s.demandId&&t.demandId)s.demandId=t.demandId;touch(s);renderDebugDetail();};
  host.querySelector("#d-del").onclick=()=>{if(confirm("Delete this debug session?")){state.debug=state.debug.filter(x=>x.id!==s.id);activeDebugId=null;markDirty();renderApp();}};
  renderDebugBody(host.querySelector("#dBody"),s);
}
function renderDebugBody(body,s){
  const t=s.taskId&&state.tasks.find(x=>x.id===s.taskId);
  body.innerHTML=`
    <div class="resume-box"><label>▶ Resume here — where I left off / what to try next</label>
      <textarea id="d-resume" placeholder="e.g. Breakpoint hit at ZHR_PAYRUN line 412, LV_AMOUNT was 0 — check the READ on PA0008 above. Next: verify BEGDA filter.">${esc(s.resume)}</textarea></div>
    ${t?`<p style="margin-top:-8px;margin-bottom:14px"><a id="d-goto" style="cursor:pointer">→ Open linked demand: ${esc(taskLabel(t))}</a></p>`:""}
    <div class="sec-title"><h3>Objects involved</h3><div class="ln"></div><button class="sm" id="d-addobj">＋ Object</button></div>
    <div class="tbl-wrap"><table><thead><tr><th style="width:30%">Object</th><th>Note (what's relevant here)</th><th style="width:34px"></th></tr></thead><tbody id="d-objs"></tbody></table></div>

    <div class="sec-title"><h3>Breakpoints</h3><div class="ln"></div><button class="sm" id="d-addbp">＋ Breakpoint</button></div>
    <div class="tbl-wrap"><table><thead><tr><th style="width:24%">Object / Include</th><th style="width:80px">Line</th><th>Condition / when</th><th style="width:60px">Hit</th><th>Note</th><th style="width:34px"></th></tr></thead><tbody id="d-bps"></tbody></table></div>

    <div class="sec-title"><h3>Findings log</h3><div class="ln"></div></div>
    <div class="add-find">
      <select id="f-kind">${Object.entries(FIND_KINDS).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join("")}</select>
      <textarea id="f-text" placeholder="What you found — works, fails, a dead end, an observation… (Ctrl+Enter to add)"></textarea>
      <button class="primary sm" id="f-add">Add</button></div>
    <div id="d-finds"></div>

    <div class="sec-title" style="margin-top:18px"><h3>Variable watches</h3><div class="ln"></div><button class="sm" id="d-addw">＋ Variable</button></div>
    <div class="tbl-wrap"><table><thead><tr><th style="width:26%">Variable / field</th><th style="width:26%">Value / observation</th><th>Where (object · line · context)</th><th style="width:34px"></th></tr></thead><tbody id="d-watches"></tbody></table></div>

    <div class="sec-title" style="margin-top:18px"><h3>Scratch notes</h3><div class="ln"></div></div>
    <div class="field"><textarea id="d-notes" style="min-height:90px" placeholder="Anything else…">${esc(s.notes)}</textarea></div>`;
  body.querySelector("#d-resume").onchange=e=>{s.resume=e.target.value;touch(s);};
  body.querySelector("#d-notes").onchange=e=>{s.notes=e.target.value;touch(s);};
  if(t){const g=body.querySelector("#d-goto");if(g)g.onclick=()=>{view="demands";activeId=s.taskId;activeTab="overview";renderApp();};}
  // objects
  const objs=body.querySelector("#d-objs");
  const drawObjs=()=>{objs.innerHTML=s.objects.length?s.objects.map(o=>`<tr data-id="${o.id}"><td><input class="mono o-n" value="${esc(o.name)}" placeholder="ZHR_..."></td><td><input class="o-note" value="${esc(o.note)}"></td><td><button class="ghost sm danger o-x">🗑</button></td></tr>`).join(""):`<tr><td colspan="3" class="faint" style="padding:10px;text-align:center">No objects yet.</td></tr>`;
    objs.querySelectorAll("tr[data-id]").forEach(tr=>{const o=s.objects.find(x=>x.id===tr.dataset.id);tr.querySelector(".o-n").onchange=e=>{o.name=e.target.value;touch(s);};tr.querySelector(".o-note").onchange=e=>{o.note=e.target.value;touch(s);};tr.querySelector(".o-x").onclick=()=>{s.objects=s.objects.filter(x=>x.id!==o.id);touch(s);drawObjs();renderDebugSidebar();};});};
  body.querySelector("#d-addobj").onclick=()=>{s.objects.push({id:uid(),name:"",note:""});touch(s);drawObjs();renderDebugSidebar();};
  drawObjs();
  // breakpoints
  const bps=body.querySelector("#d-bps");
  const drawBps=()=>{bps.innerHTML=s.breakpoints.length?s.breakpoints.map(b=>`<tr data-id="${b.id}"><td><input class="mono b-o" value="${esc(b.object)}" placeholder="object/include"></td><td><input class="mono b-l" value="${esc(b.line)}" placeholder="line"></td><td><input class="b-c" value="${esc(b.condition)}" placeholder="e.g. lv_x = 0"></td><td style="text-align:center"><input type="checkbox" class="b-h" ${b.hit?"checked":""} style="width:auto"></td><td><input class="b-n" value="${esc(b.note)}"></td><td><button class="ghost sm danger b-x">🗑</button></td></tr>`).join(""):`<tr><td colspan="6" class="faint" style="padding:10px;text-align:center">No breakpoints yet.</td></tr>`;
    bps.querySelectorAll("tr[data-id]").forEach(tr=>{const b=s.breakpoints.find(x=>x.id===tr.dataset.id);const bind=(sel,k,cb)=>{const el=tr.querySelector(sel);if(el)el.onchange=e=>{b[k]=cb?cb(e):e.target.value;touch(s);};};bind(".b-o","object");bind(".b-l","line");bind(".b-c","condition");bind(".b-h","hit",e=>e.target.checked);bind(".b-n","note");tr.querySelector(".b-x").onclick=()=>{s.breakpoints=s.breakpoints.filter(x=>x.id!==b.id);touch(s);drawBps();renderDebugSidebar();};});};
  body.querySelector("#d-addbp").onclick=()=>{s.breakpoints.push({id:uid(),object:"",line:"",condition:"",hit:false,note:""});touch(s);drawBps();renderDebugSidebar();};
  drawBps();
  // findings
  const finds=body.querySelector("#d-finds");
  const drawFinds=()=>{const list=s.findings.slice().sort((a,b)=>b.ts-a.ts);
    finds.innerHTML=list.length?list.map(f=>{const k=FIND_KINDS[f.kind]||FIND_KINDS.note;return `<div class="finding" data-id="${f.id}"><span class="fk" style="color:${k.color}">${k.icon} ${k.label}</span><span class="ft">${linkify(f.text)}</span><span class="fts">${fmtTs(f.ts)}</span><span class="nact"><button class="ghost sm danger f-x">🗑</button></span></div>`;}).join(""):`<div class="faint" style="font-size:12px">No findings logged yet.</div>`;
    finds.querySelectorAll(".finding").forEach(el=>{const f=s.findings.find(x=>x.id===el.dataset.id);el.querySelector(".f-x").onclick=()=>{s.findings=s.findings.filter(x=>x.id!==f.id);touch(s);drawFinds();renderDebugSidebar();};const ft=el.querySelector(".ft");ft.onclick=e=>{if(e.target.tagName==="A")return;editInline(ft,f.text,v=>{if(v){f.text=v;touch(s);}drawFinds();});};});};
  const addFind=()=>{const txt=body.querySelector("#f-text"),v=txt.value.trim();if(!v)return;s.findings.push({id:uid(),ts:Date.now(),kind:body.querySelector("#f-kind").value,text:v});txt.value="";touch(s);drawFinds();renderDebugSidebar();};
  body.querySelector("#f-add").onclick=addFind;
  body.querySelector("#f-text").onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")addFind();};
  drawFinds();
  // watches
  const wa=body.querySelector("#d-watches");
  const drawWa=()=>{wa.innerHTML=s.watches.length?s.watches.map(w=>`<tr data-id="${w.id}"><td><input class="mono w-n" value="${esc(w.name)}" placeholder="LV_AMOUNT"></td><td><input class="mono w-v" value="${esc(w.value)}"></td><td><input class="w-w" value="${esc(w.where)}" placeholder="ZHR_PAYRUN · 412"></td><td><button class="ghost sm danger w-x">🗑</button></td></tr>`).join(""):`<tr><td colspan="4" class="faint" style="padding:10px;text-align:center">No variables tracked yet.</td></tr>`;
    wa.querySelectorAll("tr[data-id]").forEach(tr=>{const w=s.watches.find(x=>x.id===tr.dataset.id);const bind=(sel,k)=>{const el=tr.querySelector(sel);if(el)el.onchange=e=>{w[k]=e.target.value;touch(s);};};bind(".w-n","name");bind(".w-v","value");bind(".w-w","where");tr.querySelector(".w-x").onclick=()=>{s.watches=s.watches.filter(x=>x.id!==w.id);touch(s);drawWa();};});};
  body.querySelector("#d-addw").onclick=()=>{s.watches.push({id:uid(),name:"",value:"",where:""});touch(s);drawWa();};
  drawWa();
}

