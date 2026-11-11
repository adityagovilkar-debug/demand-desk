/* ===================== MEMORY AND LOOKING BACK =====================
   Seen before: past demands, journal entries, meetings, debug sessions and pasted Excel
   rows that share a demand's objects or its rarer words — on the demand's side panel and
   under the journal entry you're writing, with the lessons from similar demands. Excel
   rows: paste rows copied from Excel and they become searchable notes. A readable copy:
   everything as Markdown files in folders by year, readable in Notepad without the app. */

/* ---------- Seen before ---------- */
const SB_STOP=new Set(("that this with from have will what when where which into been were they them their there then than also only just more most some such very your about after before again "+
  "because being both down during each here once other over same should through under until while would could shall must does doing done make made need needs needed please thanks thank "+
  "regards today tomorrow yesterday week weeks month days check checked call called mail email sent send team issue issues change changes changed demand demands task tasks note notes "+
  "data report work working okay sure like still asked said told want wants given using used test tested testing fine good able already").split(" "));
function sbTokens(s){const out=new Set();String(s||"").toLowerCase().replace(/[a-z0-9_\/]{4,}/g,w=>{if(SB_STOP.has(w))return "";if(/^\d+$/.test(w)&&w.length<5)return "";out.add(w);return "";});return out;}
const SB_PEN={Demand:"pen-2",Journal:"pen-3",Meeting:"pen-4",Debug:"pen-1",Sheet:"pen-6"};
/* the index is rebuilt only after the data changes (editSeq) */
function sbIndex(){const c=sbIndex;if(c.docs&&c.seq===editSeq&&c.sheets===(state.sheets||[]).length)return c;const docs=[];
  const add=(d,text)=>{d.tok=sbTokens(text);docs.push(d);};
  state.tasks.forEach(t=>add({k:"Demand",id:t.id,t,label:demandLabel(t)===t.demandId?`${t.demandId} · ${t.title}`:demandLabel(t)||t.title,date:t.receivedDate||isoTs(t.createdAt),
    objs:new Set(t.objects.map(o=>objKey(o.name)).filter(Boolean)),go:()=>{view="demands";activeId=t.id;activeTab="overview";renderApp();}},
    [t.title,t.description,t.notes,(t.comments||[]).map(x=>x.text).join(" "),t.objects.map(o=>o.name+" "+(o.desc||"")).join(" "),(t.lessons||[]).map(l=>l.text).join(" "),
     (t.timeline||[]).filter(e=>e.type==="note").map(e=>e.note).join(" ")].join(" ")));
  state.journal.forEach(j=>add({k:"Journal",id:j.id,label:j.title||"Journal · "+j.date,date:j.date,go:()=>{view="journal";activeJournalId=j.id;renderApp();}},[j.title,j.body].join(" ")));
  state.meetings.forEach(m=>add({k:"Meeting",id:m.id,label:m.title,date:m.date,go:()=>{view="meetings";meetingRollup=false;activeMeetingId=m.id;renderApp();}},
    [m.title,m.body,m.actions.map(a=>a.text+" "+(a.resolution||"")).join(" ")].join(" ")));
  state.debug.forEach(s=>add({k:"Debug",id:s.id,label:s.title,date:isoTs(s.updatedAt||s.createdAt||Date.now()),objs:new Set((s.objects||[]).map(o=>objKey(o.name)).filter(Boolean)),
    go:()=>{view="debug";activeDebugId=s.id;renderApp();}},[s.title,s.resume,s.notes,(s.objects||[]).map(o=>o.name+" "+(o.note||"")).join(" "),(s.findings||[]).map(f=>f.text).join(" ")].join(" ")));
  (state.sheets||[]).forEach(sh=>sh.rows.forEach((r,i)=>add({k:"Sheet",id:sh.id+"#"+i,label:`${sh.name} · ${r.filter(Boolean).slice(0,2).join(" · ").slice(0,60)}`,date:sh.added,
    go:()=>openSheet(sh,i)},r.join(" "))));
  const df=new Map();docs.forEach(d=>d.tok.forEach(w=>df.set(w,(df.get(w)||0)+1)));
  Object.assign(c,{docs,df,N:docs.length,seq:editSeq,sheets:(state.sheets||[]).length});return c;}
/* scored by shared objects (strong) and shared rare words (the rarer, the more) */
function seenBefore(text,objs,skip){const {docs,df,N}=sbIndex(),q=sbTokens(text),idf=w=>Math.log((N+1)/((df.get(w)||0)+.5)),cut=Math.log((N+1)/(Math.max(4,N*.03)+.5));
  const rare=[...q].filter(w=>idf(w)>=cut),out=[];
  docs.forEach(d=>{if(skip&&skip(d))return;let s=0;const why=[];
    (objs||[]).forEach(o=>{if(d.objs&&d.objs.has(o)){s+=9;why.push(o);}});
    rare.forEach(w=>{if(d.tok.has(w)){s+=idf(w);if(why.length<4&&!why.includes(w.toUpperCase()))why.push(w);}});
    if(s>=Math.max(1.7*cut,2))out.push({d,s,why});});
  return out.sort((a,b)=>b.s-a.s||String(b.d.date).localeCompare(String(a.d.date))).slice(0,6);}
function seenForDemand(t){const linked=new Set([...meetingsForTask(t.id).map(m=>m.id),...journalForTask(t.id).map(j=>j.id),...debugForTask(t.id).map(s=>s.id)]);
  return seenBefore([t.title,t.description,t.notes,t.objects.map(o=>o.name+" "+(o.desc||"")).join(" ")].join(" "),t.objects.map(o=>objKey(o.name)).filter(Boolean),
    d=>d.id===t.id||linked.has(d.id)||(d.k==="Demand"&&t.demandId&&d.t.demandId===t.demandId));}
function seenListHTML(hits,empty){if(!hits.length)return `<div class="bempty">${empty}</div>`;
  return hits.map((h,i)=>`<div class="lk sb-r" data-i="${i}" style="--pen:var(--${SB_PEN[h.d.k]})" title="${esc(h.d.k)} — shares ${esc(h.why.join(", "))}"><i></i><span class="t">${esc(h.d.label)}<span class="sb-why">${esc(h.d.k)} · ${h.why.map(w=>`<b>${esc(w)}</b>`).join(" · ")}</span></span><span class="d">${h.d.date?shortD(h.d.date):""}</span></div>`
    +(h.d.k==="Demand"&&(h.d.t.lessons||[]).length?h.d.t.lessons.slice(0,2).map(l=>`<div class="sb-les">💡 ${esc(l.text.split("\n")[0].slice(0,140))}</div>`).join(""):"")).join("");}
function seenRailHTML(t){const hits=seenForDemand(t);
  return `<div class="ck-unit cxs seenb"><div class="ck-head"><h2>Seen before</h2><span class="ck-meta">${hits.length?hits.length+" in your file":""}</span></div>
    ${seenListHTML(hits,"Nothing else in your file shares its objects or its rarer words.")}</div>`;}
function wireSeen(host,hits){host.querySelectorAll(".sb-r").forEach(el=>el.onclick=()=>{const h=hits[+el.dataset.i];if(h)h.d.go();});}
/* object names you mention count like a demand's own objects */
function objsInText(text){const known=new Set();state.tasks.forEach(t=>t.objects.forEach(o=>{const k=objKey(o.name);if(k)known.add(k);}));
  return [...sbTokens(text)].map(w=>w.toUpperCase()).filter(w=>known.has(w));}
function drawJournalSeen(j){const host=document.getElementById("j-seen");if(!host)return;const txt=[j.title,j.body].join(" "),hits=seenBefore(txt,objsInText(txt),d=>d.id===j.id);
  host.innerHTML=`<div class="sec-title" style="margin-top:14px"><h3>Seen before</h3><div class="ln"></div><span class="faint" style="font-size:11px">${hits.length?"shares rarer words with what you're writing":"updates as you write"}</span></div>
    <div class="sb-j">${seenListHTML(hits,"Nothing else in your file shares the rarer words of this entry yet.")}</div>`;wireSeen(host,hits);}

/* ---------- Excel rows, pasted ---------- */
function normSheet(x){const rows=(x.rows||[]).map(r=>(r||[]).map(c=>String(c==null?"":c)));return{id:x.id||uid(),name:String(x.name||"").trim()||"(pasted rows)",added:/^\d{4}-\d\d-\d\d$/.test(x.added||"")?x.added:todayStr(),
  headers:(x.headers||[]).map(String),rows,note:String(x.note||"")};}
/* what Excel puts on the clipboard: tab-separated cells, quoted when a cell holds a tab, quote or line break */
function parseTSV(s){const rows=[];let row=[],cell="",q=false;s=String(s||"").replace(/\r\n?/g,"\n");
  for(let i=0;i<s.length;i++){const ch=s[i];
    if(q){if(ch==='"'){if(s[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;continue;}
    if(ch==='"'&&cell===""){q=true;continue;}
    if(ch==="\t"){row.push(cell);cell="";}else if(ch==="\n"){row.push(cell);rows.push(row);row=[];cell="";}else cell+=ch;}
  if(cell!==""||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(c=>c.trim()));}
function openPasteSheet(){const root=document.getElementById("modalRoot");let rows=[],first=true;
  root.innerHTML=`<div class="modal-bg"><div class="modal efx" style="width:720px"><h2>Paste rows from Excel</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">Select the rows in Excel, Ctrl+C, then Ctrl+V below. They're kept in your data file and found by Search and by <i>Seen before</i> — nothing is read from a file.</p>
    <div class="field"><label>Name</label><input id="shName" placeholder="e.g. Transport log 2021 · Basis contacts · Old demand tracker"></div>
    <div class="field"><label>Rows</label><textarea id="shText" rows="6" placeholder="Paste here (Ctrl+V)" style="font-family:var(--mono);font-size:12px;white-space:pre"></textarea></div>
    <label class="tb-tg" style="margin:0 0 10px"><input type="checkbox" id="shHead" checked> The first row is headings</label>
    <div id="shPrev" class="sh-prev"></div>
    <div class="modal-foot"><button class="ghost" id="shCancel">Cancel</button><button class="primary" id="shSave" disabled>Keep these rows</button></div></div></div>`;
  const q=s=>root.querySelector(s),close=()=>{root.innerHTML="";};
  const draw=()=>{rows=parseTSV(q("#shText").value);first=q("#shHead").checked;const h=first&&rows.length?rows[0]:[],body=first?rows.slice(1):rows,w=Math.max(0,...rows.map(r=>r.length));
    q("#shSave").disabled=!body.length;q("#shSave").textContent=body.length?`Keep ${body.length} row${body.length===1?"":"s"}`:"Keep these rows";
    q("#shPrev").innerHTML=rows.length?`<div class="faint" style="font-size:11px;margin-bottom:4px">${body.length} row${body.length===1?"":"s"} × ${w} column${w===1?"":"s"}</div>${sheetTableHTML(h,body.slice(0,6))}${body.length>6?`<div class="faint" style="font-size:11px">… and ${body.length-6} more</div>`:""}`:"";};
  q("#shText").oninput=draw;q("#shHead").onchange=draw;q("#shCancel").onclick=close;q(".modal-bg").onclick=e=>{if(e.target===q(".modal-bg"))close();};
  q("#shSave").onclick=()=>{const body=first?rows.slice(1):rows;if(!body.length)return;
    const sh=normSheet({name:q("#shName").value,headers:first?rows[0]:[],rows:body});(state.sheets=state.sheets||[]).unshift(sh);markDirty();close();renderApp();
    toast(`Kept ${body.length} row${body.length===1?"":"s"} as “${sh.name}” — Search finds them now`);};
  setTimeout(()=>{const el=q("#shText");if(el)el.focus();},40);}
function sheetTableHTML(h,rows,hl){const w=Math.max(h.length,...rows.map(r=>r.length),0);
  return `<div class="sh-wrap"><table class="sh-t">${h.length?`<tr>${Array.from({length:w},(_,i)=>`<th>${esc(h[i]||"")}</th>`).join("")}</tr>`:""}${rows.map((r,i)=>`<tr${i===hl?' class="hl"':""} data-r="${i}">${Array.from({length:w},(_,k)=>`<td>${esc(r[k]||"")}</td>`).join("")}</tr>`).join("")}</table></div>`;}
function openSheet(sh,row){const root=document.getElementById("modalRoot");let f="";
  const draw=()=>{const w=f.toLowerCase().split(/\s+/).filter(Boolean),idx=sh.rows.map((r,i)=>i).filter(i=>!w.length||w.every(x=>sh.rows[i].join(" ").toLowerCase().includes(x)));
    root.querySelector("#shBody").innerHTML=`<div class="faint" style="font-size:11px;margin-bottom:4px">${idx.length} of ${sh.rows.length} rows</div>`+sheetTableHTML(sh.headers,idx.map(i=>sh.rows[i]),row!=null?idx.indexOf(row):-1);
    const hr=root.querySelector("tr.hl");if(hr)hr.scrollIntoView({block:"center"});};
  root.innerHTML=`<div class="modal-bg"><div class="modal efx" style="width:900px"><h2>▦ ${esc(sh.name)} <span class="faint" style="font-weight:400;font-size:12px">pasted ${esc(sh.added)}</span></h2>
    <input id="shF" placeholder="Filter rows…" autocomplete="off" style="margin-bottom:8px"><div id="shBody"></div>
    <div class="modal-foot"><button class="ghost sm" id="shDel" style="margin-right:auto">🗑 Delete these rows</button><button class="primary" id="shClose">Close</button></div></div></div>`;
  const close=()=>{root.innerHTML="";};root.querySelector("#shClose").onclick=close;root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  root.querySelector("#shF").oninput=e=>{f=e.target.value;row=null;draw();};
  root.querySelector("#shDel").onclick=()=>{close();deleteWithUndo(`Deleted “${sh.name}”`,()=>{state.sheets=state.sheets.filter(x=>x.id!==sh.id);});};
  draw();}
function sheetsHTML(){const sh=state.sheets||[];
  return `<div class="sh-list"><div class="sh-lh"><span class="ef-lb" style="margin:0">Excel rows you've pasted</span><button class="sm" id="shAdd">＋ Paste rows from Excel</button></div>
    ${sh.length?sh.map(s=>`<button class="ef-chip sh-c" data-sh="${s.id}">▦ ${esc(s.name)} <b class="mono">${s.rows.length}</b></button>`).join(""):`<span class="faint" style="font-size:12px">None yet — copy rows in Excel and paste them here; Search and <i>Seen before</i> find them.</span>`}</div>`;}
function wireSheets(host){const a=host.querySelector("#shAdd");if(a)a.onclick=openPasteSheet;
  host.querySelectorAll("[data-sh]").forEach(b=>b.onclick=()=>{const s=(state.sheets||[]).find(x=>x.id===b.dataset.sh);if(s)openSheet(s);});}

/* ---------- a readable copy, by year ---------- */
const rcName=s=>String(s||"").replace(/[\\/:*?"<>|\u0000-\u001f]+/g,"-").replace(/\s+/g," ").trim().slice(0,80)||"untitled";
const rcYear=d=>(d||"").slice(0,4)||"undated";
function rcDemand(t){const L=[],ep=epicById(t.epicId),hrs=efSum(efFor(t.id));
  L.push(`# ${t.demandId?t.demandId+" — ":""}${t.title}`,"",
    `| | |`,`|---|---|`,...[["Status",STATUS[t.status].label],["Type",t.type],["System",(t.system||"")+(t.client?" / "+t.client:"")],["Epic",ep?epicLabel(ep)+(t.wave?" · "+t.wave:""):""],
      ["Asked by",t.requestor],["Built by",builderNames(t)||"me"],["Received",t.receivedDate],["Due",t.dueDate],["Project",t.project],["Theme",t.theme],["Hours logged",hrs?efFh(hrs)+" h":""]]
      .filter(x=>x[1]).map(([k,v])=>`| ${k} | ${String(v).replace(/\|/g,"/")} |`),"");
  if(t.description)L.push("## What it is","",t.description,"");
  if(t.notes)L.push("## Where it stands","",t.notes,"");
  const subs=[];(function w(a,d){a.forEach(s=>{subs.push(`${"  ".repeat(d)}- [${s.done?"x":" "}] ${s.title||"(subtask)"}${s.dueDate?" (due "+s.dueDate+")":""}`);w(s.children||[],d+1);});})(t.subtasks||[],0);
  if(subs.length)L.push("## Subtasks","",...subs,"");
  if(t.objects.length)L.push("## Objects","",...t.objects.map(o=>`- ${o.name} — ${o.type||""} ${o.action||""}${o.desc?": "+o.desc:""}`),"");
  if(t.transports.length)L.push("## Transports","",...t.transports.map(tr=>{const syn=effectiveSyncs(t,tr).filter(s=>s.system);return `- ${tr.number||"(unnumbered)"}${tr.desc?" — "+tr.desc:""} · from ${tr.system}${tr.released?"":" · not released"}${syn.length?" · reached "+syn.map(s=>s.system+(s.date?" "+s.date:"")).join(", "):""}`;}),"");
  const refs=(t.reference||[]).filter(r=>!r.secret);if(refs.length)L.push("## Reference","",...refs.map(r=>`- ${r.label}: ${r.value}`),"");
  if((t.lessons||[]).length)L.push("## Lessons","",...t.lessons.map(l=>`- ${l.date}: ${l.text}`),"");
  if((t.comments||[]).length)L.push("## Comments","",...t.comments.map(c=>`- ${c.text}`),"");
  const tl=(t.timeline||[]).slice().sort((a,b)=>a.ts-b.ts);if(tl.length)L.push("## History","",...tl.map(e=>`- ${isoTs(e.ts)} ${e.type==="status"?"→ "+(STATUS[e.to]||{label:e.to}).label:e.note||""}`),"");
  return L.join("\n");}
/* every file of the copy as {path: text}; secrets (vault, secret references) are left out */
function rcFiles(){const F={},put=(p,t)=>{F[p]=t;},years=new Set();
  state.tasks.forEach(t=>{const y=rcYear(t.receivedDate||isoTs(t.createdAt));years.add(y);put(`${y}/Demands/${rcName((t.demandId?t.demandId+" ":"")+t.title)}.md`,rcDemand(t));});
  const jm=new Map();state.journal.forEach(j=>{const k=j.date.slice(0,7);if(!jm.has(k))jm.set(k,[]);jm.get(k).push(j);});
  jm.forEach((js,k)=>{years.add(k.slice(0,4));put(`${k.slice(0,4)}/Journal/${k}.md`,[`# Journal — ${k}`,"",...js.sort((a,b)=>a.date.localeCompare(b.date)).flatMap(j=>[`## ${j.date}${j.title?" — "+j.title:""}`,"",j.body||"",""])].join("\n"));});
  state.meetings.forEach(m=>{const y=rcYear(m.date);years.add(y);put(`${y}/Meetings/${rcName(m.date+" "+m.title)}.md`,[`# ${m.title}`,"",`${m.date}${m.team?" · "+m.team:""}${m.attendees?" · with "+m.attendees:""}${m.hours?" · "+efFh(m.hours)+" h":""}`,"",m.body||"",
    ...(m.actions.length?["","## Action points","",...m.actions.map(a=>`- [${a.done?"x":" "}] ${a.text}${a.owner?" ("+a.owner+")":""}${a.due?" — due "+a.due:""}${a.resolution?" → "+a.resolution:""}`)]:[])].join("\n"));});
  state.jobs.forEach(j=>{const y=rcYear(j.received);years.add(y);put(`${y}/Tasks/${rcName(j.received+" "+j.title)}.md`,[`# ${j.title}`,"",`${JOB_STATUS[j.status].l} · came in by ${JOB_SRC[j.source]}${j.askedBy?" · asked by "+j.askedBy:""} · received ${j.received}${j.due?" · expected "+j.due:""}${j.closedOn?" · closed "+j.closedOn:""}`,"",
    j.brief?"## The ask\n\n"+j.brief+"\n":"",j.log.length?"## Log\n\n"+j.log.map(x=>`- ${x.date} ${JOB_LOG[x.kind].l}: ${x.text}`).join("\n")+"\n":"",j.outcome?"## Outcome\n\n"+j.outcome:""].filter(x=>x!=="").join("\n"));});
  state.debug.forEach(s=>{const y=rcYear(isoTs(s.createdAt||s.updatedAt||Date.now()));years.add(y);put(`${y}/Debug/${rcName(s.title)}.md`,[`# ${s.title}`,"",s.resume?"**Resume here:** "+s.resume:"","",s.notes||"",
    ...(s.findings||[]).map(f=>`- ${f.text}`)].join("\n"));});
  [...years].forEach(y=>{const es=state.efforts.filter(e=>e.date.slice(0,4)===y);if(es.length){const by=new Map();es.forEach(e=>{const k=efName(efKey(e));by.set(k,(by.get(k)||0)+e.hours);});
      put(`${y}/Hours.md`,[`# Hours — ${y}`,"",`${efFh(efSum(es))} h in all`,"","| Where | Hours |","|---|---|",...[...by].sort((a,b)=>b[1]-a[1]).map(([k,h])=>`| ${k.replace(/\|/g,"/")} | ${efFh(Math.round(h*100)/100)} |`)].join("\n"));}
    const wins=state.wins.filter(w=>w.date.slice(0,4)===y),les=state.tasks.flatMap(t=>(t.lessons||[]).filter(l=>(l.date||"").slice(0,4)===y).map(l=>({t,l})));
    if(wins.length||les.length)put(`${y}/Wins and lessons.md`,[`# Wins and lessons — ${y}`,"",...wins.map(w=>`- ${w.date} ${WIN_KINDS[w.kind].l}: ${w.text}`),"",...les.map(({t,l})=>`- ${l.date} lesson on ${demandLabel(t)}: ${l.text}`)].join("\n"));});
  state.epics.forEach(e=>put(`Epics/${rcName((e.code?e.code+" ":"")+e.name)}.md`,[`# ${epicLabel(e)}`,"",e.description||"","","## Story","",...e.log.slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")).map(x=>`- ${x.date} ${EPIC_LOG[x.kind].label}: ${x.text}`)].join("\n")));
  state.playbook.forEach(p=>put(`Playbook/${rcName(p.title)}.md`,[`# ${p.title}`,"",p.body||"",...(p.steps||[]).map((s,i)=>`${i+1}. ${s.text}`),...(p.people||[]).map(x=>`- ${x.name} — ${x.role} ${x.contact}`)].join("\n")));
  (state.sheets||[]).forEach(sh=>put(`${rcYear(sh.added)}/Excel rows/${rcName(sh.name)}.md`,[`# ${sh.name}`,"",...(sh.headers.length?["| "+sh.headers.join(" | ")+" |","|"+sh.headers.map(()=>"---").join("|")+"|"]:[]),...sh.rows.map(r=>"| "+r.map(c=>c.replace(/\|/g,"/").replace(/\n/g," ")).join(" | ")+" |")].join("\n")));
  const ys=[...years].sort().reverse();
  put("README.md",[`# Demand Desk — a readable copy`,"",`Written ${todayStr()} from the data file. Plain Markdown: open any file in Notepad. Passwords and secret reference entries are left out.`,"",
    ...ys.map(y=>`- **${y}** — ${Object.keys(F).filter(p=>p.startsWith(y+"/Demands/")).length} demands, ${Object.keys(F).filter(p=>p.startsWith(y+"/Meetings/")).length} meetings, ${Object.keys(F).filter(p=>p.startsWith(y+"/Tasks/")).length} tasks`),"","- **Epics**, **Playbook** — not by year"].join("\n"));
  return F;}
async function rcWrite(dir,path,text){const parts=path.split("/");let d=dir;for(const p of parts.slice(0,-1))d=await d.getDirectoryHandle(p,{create:true});
  const fh=await d.getFileHandle(parts[parts.length-1],{create:true}),w=await fh.createWritable();await w.write(text);await w.close();}
function openReadableCopy(){const root=document.getElementById("modalRoot"),F=rcFiles(),n=Object.keys(F).length,last=viewPref("readable.at",""),fs=!!window.showDirectoryPicker;
  const years=[...new Set(Object.keys(F).map(p=>p.split("/")[0]).filter(x=>/^\d{4}$/.test(x)))].sort().reverse();
  root.innerHTML=`<div class="modal-bg"><div class="modal efx" style="width:560px"><h2>📚 A readable copy</h2>
    <p style="font-size:13px;line-height:1.55;margin-top:-6px">Everything in your data file as plain Markdown files, in folders by year — demands, journal, meetings, tasks, debug sessions, hours, wins and lessons, epics, the playbook, pasted Excel rows. Readable in Notepad even if this app is ever gone. <b>Passwords and secret reference entries are left out.</b></p>
    <div class="rc-sum">${n} files · ${years.join(" · ")||"no dated items yet"}${last?` · last written <b>${esc(last)}</b>`:""}</div>
    <p class="faint" style="font-size:11.5px">Each run rewrites the files. Pick the same folder each year (the folder picker remembers it); a demand you've renamed since leaves its old file behind.</p>
    <div class="modal-foot">${fs?"":`<span class="faint" style="font-size:11px;margin-right:auto">This browser can't write folders — download one file per year instead.</span>`}<button class="ghost" id="rcCancel">Cancel</button>${years.length?`<button id="rcDl" title="One .md file with this year's demands, journal, meetings and tasks">⬇ ${years[0]} as one file</button>`:""}${fs?`<button class="primary" id="rcGo">Choose a folder and write</button>`:""}</div></div></div>`;
  const q=s=>root.querySelector(s),close=()=>{root.innerHTML="";};q("#rcCancel").onclick=close;q(".modal-bg").onclick=e=>{if(e.target===q(".modal-bg"))close();};
  const dl=q("#rcDl");if(dl)dl.onclick=()=>{const y=years[0],txt=Object.keys(F).filter(p=>p.startsWith(y+"/")).sort().map(p=>`<!-- ${p} -->\n\n${F[p]}`).join("\n\n---\n\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/markdown"}));a.download=`Demand Desk ${y}.md`;a.click();URL.revokeObjectURL(a.href);setViewPref("readable.at",todayStr());close();toast(`Downloaded Demand Desk ${y}.md`);};
  const go=q("#rcGo");if(go)go.onclick=async()=>{let dir;try{dir=await window.showDirectoryPicker({id:"dd-readable",mode:"readwrite"});}catch(e){return;}
    go.disabled=true;go.textContent="Writing…";let k=0;
    try{const top=await dir.getDirectoryHandle("Demand Desk — readable copy",{create:true});for(const [p,t] of Object.entries(F)){await rcWrite(top,p,t);if(++k%25===0)go.textContent=`Writing… ${k} of ${n}`;}
      setViewPref("readable.at",todayStr());close();renderApp();toast(`Wrote ${k} files to ${dir.name} / Demand Desk — readable copy`);}
    catch(e){go.disabled=false;go.textContent="Choose a folder and write";toast("Couldn't write: "+e.message,true);}};}
/* the agenda asks once a year, from mid-December to the end of January */
function readableCopyDue(t0){const m=+t0.slice(5,7),d=+t0.slice(8,10);if(!((m===12&&d>=15)||m===1))return false;
  const cycle=m===12?t0.slice(0,4):String(+t0.slice(0,4)-1),last=viewPref("readable.at","");return !(last&&last>=cycle+"-12-01");}
