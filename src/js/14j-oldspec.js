/* ===================== A SPEC FOR AN OLD DEMAND =====================
   Demands from before this app have no record here, so no tech spec. This form takes what you
   remember and what's in your own notes — the ticket, what was asked, how it was built, the
   steps, the objects, the transports, the testing, links — and produces the same technical
   specification a demand here gets. Keep it as a closed demand (found by Search, Seen before,
   the readable copy), or just take the document. The draft is kept in this browser as you type. */
const OS_KEY="oldspec.draft";
const OS_BLANK=()=>({demandId:"",title:"",type:TASK_TYPES[0],system:state.settings.defaultSystem||"",client:"",requestor:"",received:"",delivered:"",asked:"",built:"",steps:"",objects:"",trs:"",testing:"",links:""});
function osDraft(){try{return {...OS_BLANK(),...JSON.parse(viewPref(OS_KEY,"{}")||"{}")};}catch(e){return OS_BLANK();}}
const osSave=d=>setViewPref(OS_KEY,JSON.stringify(d));
const osSplit=l=>String(l).split(/\s*(?:\||\t|\s—\s|\s–\s)\s*/).map(x=>x.trim()).filter(Boolean);
/* objects, one a line: NAME | type | Created/Modified | what changed — any order after the name, all optional */
function osObjects(txt){const types=objTypes(),low=x=>String(x).toLowerCase();
  return String(txt||"").split(/\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const p=osSplit(l),name=(p.shift()||"").replace(/\s+/g,"");let type="",action="",rest=[];
    p.forEach(x=>{const ty=types.find(t=>low(t)===low(x)||low(t).split(/\s*\/\s*/).includes(low(x))),ac=OBJ_ACTIONS.find(a=>low(a)===low(x));if(ty&&!type)type=ty;else if(ac&&!action)action=ac;else rest.push(x);});
    if(!type)type=types.find(t=>/^Z?CL_/i.test(name)&&/class/i.test(t))||types.find(t=>/^Z?(SAPL|FM_)/i.test(name)&&/function/i.test(t))||types[0];
    return{id:uid(),name,type,action:action||"Modified",desc:rest.join(" — "),ackClash:[]};}).filter(o=>o.name);}
/* transports, one a line: the number, its text, and where it reached after an arrow — H03K900123 Payroll fix → H02 H01 */
function osTransports(txt,origin){return String(txt||"").split(/\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const [head,tail]=l.split(/\s*(?:→|->)\s*/);
    const toks=String(head||"").split(/\s+/),i=toks.findIndex(x=>/^[A-Z0-9]{3}K\d{5,7}$/i.test(x)),number=i>=0?toks[i].toUpperCase():"";if(i>=0)toks.splice(i,1);
    const reached=String(tail||"").split(/[\s,]+/).map(x=>x.trim().toUpperCase()).filter(x=>/^[A-Z][A-Z0-9]\d$/.test(x));
    return{id:uid(),number,desc:toks.join(" ").replace(/^[:\-–—|\s]+/,""),system:number?number.slice(0,3):(origin||""),released:true,kind:"workbench",client:"",
      syncs:reached.map(s=>({system:s,date:""})),tocId:"",toc:"",objectIds:[],dest:[],notes:"",addedOn:todayStr(),releasedOn:""};}).filter(t=>t.number||t.desc);}
function osLinks(txt){return String(txt||"").split(/\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const p=osSplit(l),url=p.find(x=>/^https?:\/\//i.test(x))||"",label=p.filter(x=>x!==url).join(" ")||(url?"Link":"");
    return{id:uid(),label,value:url||label,secret:false,pinned:false};}).filter(r=>r.value);}
const osTs=(d,h)=>new Date((d||todayStr())+"T"+(h||"10")+":00:00").getTime();
/* the demand the spec is made from — kept, or only used for the document */
function osDemand(d){const objects=osObjects(d.objects),transports=osTransports(d.trs,d.system),rec=d.received||d.delivered||todayStr(),del=d.delivered||rec;
  transports.forEach(tr=>{tr.objectIds=objects.filter(o=>tr.desc.toUpperCase().includes(o.name.toUpperCase())).map(o=>o.id);});
  const notes=[d.built.trim()?"How it was built:\n"+d.built.trim():"",d.testing.trim()?"Testing:\n"+d.testing.trim():""].filter(Boolean).join("\n\n");
  const t={id:uid(),demandId:d.demandId.trim(),type:d.type||TASK_TYPES[0],title:d.title.trim()||"(untitled)",requestor:d.requestor.trim(),epicId:"",wave:"",system:d.system||"",client:d.client||"",project:"",theme:"",
    waiting:{on:"",since:""},receivedDate:rec,dueDate:"",status:"closed",description:d.asked.trim(),builders:[],goliveTarget:"",nextAction:{date:"",note:""},notes,
    timeline:[{id:uid(),ts:osTs(rec,"09"),type:"status",from:"",to:"progress",note:""},{id:uid(),ts:osTs(del,"16"),type:"status",from:"progress",to:"delivered",note:""},
      {id:uid(),ts:osTs(del,"17"),type:"status",from:"delivered",to:"closed",note:""},{id:uid(),ts:Date.now(),type:"note",from:"",to:"",note:"Back-filled from my notes — a spec for an old demand"}],
    subtasks:String(d.steps||"").split(/\n/).map(l=>l.replace(/^[-*•\d.)\s]+/,"").trim()).filter(Boolean).map(s=>({id:uid(),title:s,done:true,receivedDate:rec,dueDate:"",collapsed:false,comments:[],children:[]})),
    objects,transports,tocs:[],comments:[],reference:osLinks(d.links),estimate:0,lessons:[],createdAt:Date.now(),updatedAt:Date.now()};
  return t;}
/* what your own notes say about the objects you typed */
function osNotesHint(d){const names=osObjects(d.objects).map(o=>o.name).filter(n=>n.length>=4).slice(0,8);if(!names.length)return "";
  const hits=names.map(n=>{const k=n.toLowerCase(),nn=(typeof NOTES!=="undefined"?NOTES:[]).filter(x=>x.low.includes(k)).length,
    sh=(state.sheets||[]).reduce((a,s)=>a+s.rows.filter(r=>r.join(" ").toLowerCase().includes(k)).length,0),dm=state.tasks.filter(t=>t.objects.some(o=>objKey(o.name)===objKey(n))).length;return{n,c:nn+sh+dm};}).filter(x=>x.c);
  return hits.length?`<div class="os-hint">In your notes and file: ${hits.map(h=>`<a href="#" data-os-q="${esc(h.n)}">${esc(h.n)} <b>${h.c}</b></a>`).join(" · ")} <span class="faint">— opens Search; your draft is kept</span></div>`:"";}
function openOldSpec(){const root=document.getElementById("modalRoot");let d=osDraft(),preview=false;
  const f=(k,label,ph,o={})=>`<div class="field"><label>${label}</label>${o.area?`<textarea data-k="${k}" rows="${o.rows||3}" placeholder="${esc(ph)}" ${o.mono?'class="mono"':""}>${esc(d[k])}</textarea>`:`<input data-k="${k}" ${o.type?`type="${o.type}"`:""} value="${esc(d[k])}" placeholder="${esc(ph)}" ${o.mono?'class="mono"':""} autocomplete="off">`}</div>`;
  const read=()=>{const o=osObjects(d.objects),t=osTransports(d.trs,d.system),s=String(d.steps).split(/\n/).filter(x=>x.trim()).length,l=osLinks(d.links).length;
    return `${o.length} object${o.length===1?"":"s"} · ${t.length} transport${t.length===1?"":"s"} · ${s} step${s===1?"":"s"} · ${l} link${l===1?"":"s"}`;};
  const draw=()=>{const t=osDemand(d);
    root.innerHTML=`<div class="modal-bg"><div class="modal efx os" style="width:880px"><h2>📄 A spec for an old demand</h2>
      ${preview?`<p class="faint" style="font-size:12px;margin-top:-8px">The technical specification, as a demand here would get it. Copy it into Word, download it, or print to PDF.</p>
        <div class="specpaper specdoc" id="osPrev">${buildTechSpecHTML(t)}</div>
        <div class="modal-foot"><button class="ghost" id="osBack" style="margin-right:auto">‹ Back to the form</button><button id="osCopy">📋 Copy Markdown</button><button id="osMd">⬇ Download .md</button><button id="osPrint">🖨 Print / Save PDF</button><button class="primary" id="osKeep">Keep as a closed demand</button></div>`
      :`<p class="faint" style="font-size:12px;margin-top:-8px">For a demand from before this app: what you remember and what's in your notes. Every field is optional except the title. Kept in this browser as you type.</p>
        <div class="mg"><div class="mg-h">The demand</div><div class="grid3">${f("demandId","Ticket / demand ID","e.g. 10288",{mono:1})}${f("title","Title","Short description of the requirement")}${`<div class="field"><label>Type</label><select data-k="type">${TASK_TYPES.map(x=>`<option ${x===d.type?"selected":""}>${esc(x)}</option>`).join("")}</select></div>`}</div>
          <div class="grid3">${f("system","System","e.g. H03",{mono:1})}${f("requestor","Asked by","Name / team")}<div class="grid2">${f("received","Received","",{type:"date"})}${f("delivered","Delivered","",{type:"date"})}</div></div></div>
        <div class="mg"><div class="mg-h">What and how</div>${f("asked","What was asked","The requirement as the business put it",{area:1,rows:3})}${f("built","How it was built","The solution: where it hooks in, the logic, decisions you took",{area:1,rows:4})}
          ${f("steps","Work done — one step a line","Analysed the payroll totals\nAdded the cost-centre selection\n…",{area:1,rows:3})}</div>
        <div class="mg"><div class="mg-h">Objects and transports</div><div class="grid2">
          ${f("objects","Objects — one a line: NAME | type | Created / Modified | what changed","ZHR_PAYROLL_RPT | Report | Modified | cost-centre selection\nZCL_HR_CC_FILTER | Class | Created",{area:1,rows:5,mono:1})}
          ${f("trs","Transports — one a line: number, its text, → where it reached","H03K900412 Payroll CC filter → H02 H01\nH03K900418 Filter class → H02 H01",{area:1,rows:5,mono:1})}</div>
          <div id="osHint">${osNotesHint(d)}</div></div>
        <div class="mg"><div class="mg-h">Testing and links</div><div class="grid2">${f("testing","Testing done","Unit test cases, test data, results",{area:1,rows:3})}${f("links","Links — one a line: label | URL","Functional spec | https://…\nUnit test document | https://…",{area:1,rows:3,mono:1})}</div></div>
        <div class="modal-foot"><button class="ghost" id="osClear" style="margin-right:auto" title="Start a new one">Clear</button><span class="faint os-read" id="osRead">${read()}</span><button class="ghost" id="osClose">Close</button><button id="osPrevB">Preview / export</button><button class="primary" id="osKeep">Keep as a closed demand</button></div>`}
      </div></div>`;
    const q=s=>root.querySelector(s),close=()=>{root.innerHTML="";};
    q(".modal-bg").onclick=e=>{if(e.target===q(".modal-bg"))close();};
    q("#osKeep").onclick=()=>{if(!d.title.trim()){toast("Give it a title first",true);preview=false;draw();return;}
      const nt=osDemand(d);state.tasks.push(nt);markDirty();d=OS_BLANK();osSave(d);close();view="demands";activeId=nt.id;activeTab="overview";renderApp();
      toast(`Kept ${demandLabel(nt)} as a closed demand — its spec is under 📄 Tech spec`);};
    if(preview){q("#osBack").onclick=()=>{preview=false;draw();};
      q("#osCopy").onclick=()=>navigator.clipboard.writeText(buildTechSpecMarkdown(t)).then(()=>toast("Markdown copied")).catch(()=>toast("Copy failed",true));
      q("#osMd").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buildTechSpecMarkdown(t)],{type:"text/markdown"}));a.download="techspec-"+(t.demandId||"old-demand")+".md";a.click();URL.revokeObjectURL(a.href);};
      q("#osPrint").onclick=()=>{const pa=document.getElementById("printArea");pa.className="specdoc";pa.innerHTML=buildTechSpecHTML(t);window.print();};return;}
    root.querySelectorAll("[data-k]").forEach(el=>{const on=()=>{d[el.dataset.k]=el.value;osSave(d);q("#osRead").textContent=read();
        if(el.dataset.k==="objects"){q("#osHint").innerHTML=osNotesHint(d);wireHint();}};el.oninput=on;el.onchange=on;});
    const wireHint=()=>root.querySelectorAll("[data-os-q]").forEach(a=>a.onclick=e=>{e.preventDefault();close();openSearch(a.dataset.osQ);});wireHint();
    q("#osClose").onclick=close;q("#osPrevB").onclick=()=>{preview=true;draw();};
    q("#osClear").onclick=async()=>{if(await askOk("The draft is emptied so you can start the next one.",{title:"Clear the form?",ok:"Clear"})){d=OS_BLANK();osSave(d);draw();}};
    setTimeout(()=>{const i=root.querySelector('[data-k="demandId"]');if(i&&!d.demandId)i.focus();},40);};
  draw();}
