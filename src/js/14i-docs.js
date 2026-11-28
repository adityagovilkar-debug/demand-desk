/* ===================== DOCUMENTS — what has to exist before a demand is done =====================
   Every demand carries its own documents: the technical spec and the unit test document
   (each To do · Done · Not needed, with a link to where it's stored and the day it was done)
   and any number of functional specs written by other people. When a demand is delivered the
   checklist opens; anything still to do comes back on the agenda until it's done, and the
   demand list can show every delivered or closed demand that's missing one. Pasting a link
   counts as done. */
const DOC_KINDS={ts:{l:"Technical spec",s:"Tech spec"},ut:{l:"Unit test document",s:"Unit test"}};
const DOC_STATE={todo:"To do",done:"Done",na:"Not needed"};
function normDocs(d){d=d||{};const one=x=>({state:DOC_STATE[x&&x.state]?x.state:"todo",url:String((x&&x.url)||""),date:/^\d{4}-\d\d-\d\d$/.test((x&&x.date)||"")?x.date:""});
  return{ts:one(d.ts),ut:one(d.ut),fs:(d.fs||[]).map(f=>({id:f.id||uid(),title:String(f.title||""),by:String(f.by||""),url:String(f.url||"")})).filter(f=>f.title||f.url||f.by)};}
const docsOf=t=>t.docs||(t.docs=normDocs());
const docsMissing=t=>Object.keys(DOC_KINDS).filter(k=>docsOf(t)[k].state==="todo");
const docsApply=t=>["delivered","closed"].includes(t.status);
const docsDue=t=>docsApply(t)&&docsMissing(t).length>0;
function deliveredOn(t){const e=(t.timeline||[]).filter(x=>x.type==="status"&&x.to==="delivered").pop();return e?isoTs(e.ts):(t.receivedDate||todayStr());}
const docsPeople=t=>[...new Set([t.requestor,...(state.people||[]).map(p=>p.name),...state.tasks.flatMap(x=>(docsOf(x).fs||[]).map(f=>f.by))].filter(Boolean))].sort();

/* the editor: used on Overview and in the checklist that opens at delivery */
function docsEditorHTML(t){const d=docsOf(t),openA=u=>/^https?:\/\//i.test(u)?`<a class="ghost sm dc-open" href="${esc(u)}" target="_blank" rel="noopener" title="Open">↗</a>`:`<span class="dc-open"></span>`;
  return `${Object.entries(DOC_KINDS).map(([k,K])=>{const x=d[k];return `<div class="dc-row st-${x.state}" data-k="${k}">
      <span class="dc-light" title="${DOC_STATE[x.state]}"></span><span class="dc-l"><b>${K.l}</b><small>${x.state==="done"?(x.date?"done "+shortD(x.date):"done"):x.state==="na"?"not needed for this demand":docsApply(t)?"still to do":"due at delivery"}</small></span>
      <span class="seg dc-seg">${Object.entries(DOC_STATE).map(([s,l])=>`<button data-s="${s}" class="${x.state===s?"on":""}">${l}</button>`).join("")}</span>
      <input class="mono dc-url" value="${esc(x.url)}" placeholder="Link to where it's stored — pasting one marks it done" autocomplete="off">${openA(x.url)}
      ${k==="ts"?`<button class="sm ghost dc-draft" title="The app's draft tech spec for this demand — print it or copy it into your template">📄 Draft</button>`:`<span></span>`}</div>`;}).join("")}
    <div class="dc-fsh"><span class="ef-lb" style="margin:0">Functional specs — by others</span><button class="sm ghost dc-fsadd">＋ Add</button></div>
    ${d.fs.length?d.fs.map(f=>`<div class="dc-fs" data-id="${f.id}"><input class="dc-ft" value="${esc(f.title)}" placeholder="Title — e.g. FS Payroll cost-centre filter v2"><input class="dc-fb" list="dl-docby" value="${esc(f.by)}" placeholder="By"><input class="mono dc-fu" value="${esc(f.url)}" placeholder="Link">${openA(f.url)}<button class="ghost sm danger dc-fdel" title="Remove">🗑</button></div>`).join("")
      :`<div class="faint dc-none">None linked — add the functional spec someone else wrote, so it's one click from the demand.</div>`}
    <datalist id="dl-docby">${docsPeople(t).map(n=>`<option value="${esc(n)}">`).join("")}</datalist>`;}
function wireDocsEditor(host,t,redraw){const d=docsOf(t),save=()=>{touch(t);redraw();renderCtxRail&&view==="demands"&&renderCtxRail();};
  host.querySelectorAll(".dc-row").forEach(row=>{const k=row.dataset.k,x=d[k];
    row.querySelectorAll(".dc-seg button").forEach(b=>b.onclick=()=>{x.state=b.dataset.s;x.date=x.state==="done"?(x.date||todayStr()):"";save();});
    row.querySelector(".dc-url").onchange=e=>{x.url=e.target.value.trim();if(x.url&&x.state==="todo"){x.state="done";x.date=todayStr();toast(`${DOC_KINDS[k].s} marked done`);}save();};
    const dr=row.querySelector(".dc-draft");if(dr)dr.onclick=()=>openTechSpec(t);});
  host.querySelector(".dc-fsadd").onclick=()=>{d.fs.push({id:uid(),title:"",by:"",url:""});touch(t);redraw();setTimeout(()=>{const i=host.querySelectorAll(".dc-ft");if(i.length)i[i.length-1].focus();},30);};
  host.querySelectorAll(".dc-fs").forEach(r=>{const f=d.fs.find(x=>x.id===r.dataset.id);if(!f)return;
    r.querySelector(".dc-ft").onchange=e=>{f.title=e.target.value;touch(t);};r.querySelector(".dc-fb").onchange=e=>{f.by=e.target.value.trim();touch(t);};
    r.querySelector(".dc-fu").onchange=e=>{f.url=e.target.value.trim();save();};
    r.querySelector(".dc-fdel").onclick=()=>{d.fs=d.fs.filter(y=>y!==f);save();};});}
function docsSummary(t){const d=docsOf(t),n=Object.keys(DOC_KINDS).filter(k=>d[k].state!=="na").length,done=Object.keys(DOC_KINDS).filter(k=>d[k].state==="done").length;return{n,done,miss:docsMissing(t),fs:d.fs.length};}
function docsUnitHTML(t){const s=docsSummary(t);
  return `<div class="ck-unit docs ${docsDue(t)?"due":""}" id="ovDocs"><div class="ck-head"><h2>Documents</h2><span class="ck-meta">${s.n?`${s.done} of ${s.n} done`:"none needed"}${s.fs?` · ${s.fs} functional spec${s.fs===1?"":"s"}`:""}${docsDue(t)?` · <b class="dc-late">delivered without ${s.miss.map(k=>DOC_KINDS[k].s.toLowerCase()).join(" and ")}</b>`:""}</span></div><div class="dc-body"></div></div>`;}
function drawDocsUnit(t){const u=document.getElementById("ovDocs");if(!u)return;const b=u.querySelector(".dc-body"),again=()=>{const n=document.createElement("div");n.innerHTML=docsUnitHTML(t);u.replaceWith(n.firstChild);drawDocsUnit(t);};
  b.innerHTML=docsEditorHTML(t);wireDocsEditor(b,t,again);}
function docsRailHTML(t){const s=docsSummary(t),d=docsOf(t);
  return `<div class="ck-unit cxs dcr"><div class="ck-head"><h2>Documents</h2><a class="cxl" id="cxDocs">${s.n?`${s.done}/${s.n} ›`:"›"}</a></div>
    ${Object.entries(DOC_KINDS).map(([k,K])=>`<div class="dcr-r st-${d[k].state}"><i></i><span>${K.s}</span>${d[k].url?`<a href="${esc(d[k].url)}" target="_blank" rel="noopener" title="Open">↗</a>`:`<em>${DOC_STATE[d[k].state].toLowerCase()}</em>`}</div>`).join("")}
    ${d.fs.slice(0,3).map(f=>`<div class="dcr-r fs"><i></i><span title="${esc(f.by?"by "+f.by:"")}">${esc(f.title||"Functional spec")}</span>${f.url?`<a href="${esc(f.url)}" target="_blank" rel="noopener" title="Open">↗</a>`:""}</div>`).join("")}</div>`;}
/* the checklist that opens when a demand is delivered — and from the agenda */
function openDocsSheet(t,o={}){const root=document.getElementById("modalRoot");
  const draw=()=>{root.innerHTML=`<div class="modal-bg"><div class="modal efx" id="docsSheet" style="width:760px"><h2>${o.delivering?"Delivered — the documents":"Documents"} · ${esc(demandLabel(t))}</h2>
      <p class="faint" style="font-size:12px;margin-top:-8px">${o.delivering?"Before you move on: the tech spec and the unit test document, and where they're stored. Anything left to do comes back on Today until it's done.":"Paste a link to mark it done, or say it isn't needed for this demand."}</p>
      <div class="dc-sheet">${docsEditorHTML(t)}</div>
      <div class="modal-foot"><button class="ghost" id="dcLater">${docsMissing(t).length?"Later — remind me":"Close"}</button><button class="primary" id="dcDone">Done</button></div></div></div>`;
    const close=()=>{root.innerHTML="";renderApp();};
    wireDocsEditor(root.querySelector(".dc-sheet"),t,draw);
    root.querySelector("#dcLater").onclick=()=>{close();if(docsMissing(t).length)toast("It'll stay on Today until the documents are done");};
    root.querySelector("#dcDone").onclick=close;
    root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};};
  draw();}
/* every status change is written to History — the checklist hangs off that, so every way of delivering asks */
{const lt=logTimeline;logTimeline=function(t,type,from,to,note){lt(t,type,from,to,note);
  if(type==="status"&&to==="delivered"&&from!=="delivered"&&state.tasks.includes(t)&&docsMissing(t).length&&(!SELFTEST||window.stDocsPrompt))
    setTimeout(()=>{if(!document.querySelector("#modalRoot .modal-bg,.ask-bg")&&t.status==="delivered"&&docsMissing(t).length)openDocsSheet(t,{delivering:true});},motionOn()?900:150);};}
/* the agenda: delivered demands still missing a document */
function agendaDocsItems(t0){return state.tasks.filter(t=>t.status==="delivered"&&docsDue(t)).map(t=>{const m=docsMissing(t);
  return{k:"docs",date:deliveredOn(t)<=t0?deliveredOn(t):t0,what:`${m.map(k=>DOC_KINDS[k].s).join(" and ")} still to do`,sub:"delivered "+shortD(deliveredOn(t)),
    of:`${t.demandId?`<b class="mono">${esc(t.demandId)}</b> `:""}${esc(t.title)}`,go:()=>{view="demands";activeId=t.id;activeTab="overview";renderApp();},
    acts:[["Add links",()=>openDocsSheet(t),"Paste where the documents are stored, or mark one not needed"]]};});}
