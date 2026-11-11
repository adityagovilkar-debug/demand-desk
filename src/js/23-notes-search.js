/* ===================== OLD NOTES — your .txt files, read-only =====================
   Point the app at one folder; every .txt in it and its sub-folders becomes searchable.
   Nothing is written, moved or renamed there. The text is cached in this browser (IndexedDB),
   so search works straight away next time, and a rescan only re-reads files that changed.
   It never goes into the data file. */
let notesDir=null,notesDirSaved=null,NOTES=[],NOTES_META=null,notesBusy=null;
const notePrep=n=>({...n,low:String(n.text||"").toLowerCase()});
/* Notepad saves as UTF-8, UTF-16 ("Unicode") or the old ANSI code page — read all three */
function notesDecode(buf){const b=new Uint8Array(buf);
  if(b[0]===0xFF&&b[1]===0xFE)return new TextDecoder("utf-16le").decode(b.subarray(2));
  if(b[0]===0xFE&&b[1]===0xFF)return new TextDecoder("utf-16be").decode(b.subarray(2));
  if(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF)return new TextDecoder("utf-8").decode(b.subarray(3));
  try{return new TextDecoder("utf-8",{fatal:true}).decode(b);}catch(e){return new TextDecoder("windows-1252").decode(b);}}
async function notesRestore(){if(!useIdb)return;
  try{const c=await idbGet("notescache");if(Array.isArray(c))NOTES=c.map(notePrep);NOTES_META=(await idbGet("notesmeta"))||null;
    const h=await idbGet("notesdir");if(h){notesDirSaved=h;let p="prompt";try{p=await h.queryPermission({mode:"read"});}catch(e){}if(p==="granted"){notesDir=h;notesScan(false);}}
    if(view==="search")renderSearchPage();}catch(e){}}
async function notesConnect(){if(!window.showDirectoryPicker){toast("This browser can't open folders",true);return;}
  try{const h=await showDirectoryPicker({mode:"read",id:"ddnotes"});notesDir=notesDirSaved=h;if(useIdb)idbSet("notesdir",h).catch(()=>{});NOTES=[];await notesScan(true);}
  catch(e){if(e.name!=="AbortError")toast("Couldn't open the folder: "+e.message,true);}}
async function notesReconnect(){if(!notesDirSaved)return notesConnect();
  try{const p=await notesDirSaved.requestPermission({mode:"read"});if(p==="granted"){notesDir=notesDirSaved;await notesScan(true);}else toast("Permission not given — still searching the copy from the last read",true);}
  catch(e){toast("Couldn't reconnect: "+e.message,true);}}
async function notesForget(){if(!await askOk("Your .txt files are not touched — this only clears the copy this app keeps for searching.",{title:"Forget the notes folder?",ok:"Forget"}))return;
  notesDir=notesDirSaved=null;NOTES=[];NOTES_META=null;if(useIdb){await idbDel("notesdir");await idbDel("notescache");await idbDel("notesmeta");}renderApp();toast("Notes folder forgotten");}
function notesProgress(n){const el=document.getElementById("ntStatusTxt");if(el&&n!=null)el.textContent=`Reading… ${n} file${n===1?"":"s"} so far`;}
function notesScan(loud){if(!notesDir)return Promise.resolve();if(notesBusy)return notesBusy;
  notesBusy=(async()=>{const old=new Map(NOTES.map(n=>[n.path,n])),out=[];let read=0,skipped=0,seen=0;
    if(view==="search")renderSearchPage();
    const walk=async(dir,prefix,depth)=>{if(depth>16)return;
      for await(const [name,h] of dir.entries()){
        if(h.kind==="directory"){await walk(h,prefix+name+"/",depth+1);continue;}
        if(!/\.txt$/i.test(name))continue;seen++;
        try{const f=await h.getFile(),path=prefix+name,o=old.get(path);
          if(f.size>4*1024*1024){skipped++;continue;}
          if(o&&o.size===f.size&&o.mtime===f.lastModified)out.push(o);
          else{out.push(notePrep({path,name,folder:prefix.replace(/\/$/,""),date:isoD(new Date(f.lastModified)),mtime:f.lastModified,size:f.size,text:notesDecode(await f.arrayBuffer())}));read++;}
        }catch(e){skipped++;}
        if(seen%40===0){notesProgress(seen);await new Promise(r=>setTimeout(r,0));}}};
    try{await walk(notesDir,"",0);NOTES=out.sort((a,b)=>b.date.localeCompare(a.date));NOTES_META={root:notesDir.name,n:NOTES.length,skipped,at:Date.now()};
      if(useIdb){await idbSet("notescache",NOTES.map(({low,...n})=>n)).catch(()=>{});await idbSet("notesmeta",NOTES_META).catch(()=>{});}
      if(loud)toast(`📁 ${NOTES.length} note${NOTES.length===1?"":"s"} ready to search${read&&read<NOTES.length?` · ${read} new or changed`:""}${skipped?` · ${skipped} skipped`:""}`);}
    catch(e){toast("Couldn't read the folder: "+e.message,true);}
    finally{notesBusy=null;if(view==="search")renderSearchPage();else if(view==="demands"&&benchOn())renderCtxRail();}})();
  return notesBusy;}
const fmtSize=n=>n<1024?n+" B":n<1048576?Math.round(n/1024)+" KB":(n/1048576).toFixed(1)+" MB";
function notesStatusHTML(){const m=NOTES_META,root=(notesDirSaved&&notesDirSaved.name)||(m&&m.root)||"";
  if(notesBusy)return `<div class="ck-unit sr-notes"><span class="ic">📁</span><span id="ntStatusTxt">Reading your notes…</span></div>`;
  if(!notesDirSaved&&!NOTES.length)return `<div class="ck-unit sr-notes"><span class="ic">📁</span><span><b>Search your old .txt notes too.</b> Point this at the folder that holds them — every .txt in it and its sub-folders is read. Read-only: nothing there is changed, moved or renamed.</span><button class="sm primary" id="ntConnect">Connect a folder…</button></div>`;
  const when=m&&m.at?new Date(m.at).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"";
  return `<div class="ck-unit sr-notes"><span class="ic">📁</span><span><b>${esc(root||"Notes folder")}</b> · ${NOTES.length} note${NOTES.length===1?"":"s"}${m&&m.skipped?` · ${m.skipped} skipped (over 4 MB or unreadable)`:""}${when?` · read ${when}`:""}${notesDir?"":` · <span class="soon">searching the copy from the last read</span>`}</span>
    ${notesDir?`<button class="sm" id="ntRescan" title="Pick up new and changed files">↻ Rescan</button>`:`<button class="sm primary" id="ntReconnect" title="The browser asks again after a restart">🔌 Reconnect</button>`}<button class="sm ghost" id="ntChange">Change folder</button><button class="sm ghost danger" id="ntForget">Forget</button></div>`;}
function wireNotesStatus(host){const q=s=>host.querySelector(s);
  if(q("#ntConnect"))q("#ntConnect").onclick=notesConnect;if(q("#ntReconnect"))q("#ntReconnect").onclick=notesReconnect;
  if(q("#ntRescan"))q("#ntRescan").onclick=()=>notesScan(true);if(q("#ntChange"))q("#ntChange").onclick=notesConnect;if(q("#ntForget"))q("#ntForget").onclick=notesForget;}

/* ===================== SEARCH — everything in the data file + your old notes =====================
   All words must match (any order); "quoted words" match as a phrase. Each hit keeps the text it
   matched in and a date, so results can show where the words are and be filtered by year. */
function searchTerms(q){const out=[];String(q||"").replace(/"([^"]+)"|(\S+)/g,(_,a,b)=>{const x=(a||b||"").trim().toLowerCase();if(x)out.push(x);return "";});return out;}
function searchAll(q){const terms=searchTerms(q);if(!terms.length)return [];const hits=[];
  const add=(k,label,parts,date,go,sub)=>{const text=parts.filter(Boolean).join(" · "),low=text.toLowerCase();if(!terms.every(t=>low.includes(t)))return;hits.push({k,label,sub:sub||"",text,low,date:date||"",go});};
  const td=t=>t.receivedDate||isoTs(t.createdAt);
  state.tasks.forEach(t=>{const ep=epicById(t.epicId),go=tab=>()=>{view="demands";activeId=t.id;activeTab=tab;},dl=demandLabel(t);
    add("Demand",`${t.demandId||"—"} · ${t.title}`,[t.demandId,t.title,t.description,t.notes,t.type,t.requestor,builderNames(t),t.project,t.theme,t.wave,t.system,t.client?"client "+t.client:"",t.nextAction&&t.nextAction.note,ep?epicLabel(ep):"",(t.comments||[]).map(c=>c.text).join(" · ")],td(t),go("overview"),[STATUS[t.status].label,t.system,t.theme].filter(Boolean).join(" · "));
    t.objects.forEach(o=>add("Object",`${o.name||"(object)"} — ${o.action}`,[o.name,o.type,o.desc],td(t),go("objects"),dl));
    t.transports.forEach(tr=>{const toc=tocFor(t,tr),syn=effectiveSyncs(t,tr);
      add("Transport",`${tr.number||"(TR)"}${tr.desc?" — "+tr.desc:""}`,[tr.number,tr.desc,tr.notes,"origin "+tr.system,syn.map(s=>s.system).join(" "),toc?"ToC "+toc.number:"",(tr.dest||[]).join(" "),tr.client,isCust(tr)?"customizing cust config":"workbench"],syn.map(s=>s.date).filter(Boolean).sort().pop()||td(t),go("transports"),dl);});
    (t.tocs||[]).forEach(c=>add("ToC",`ToC ${c.number||"(unnamed)"}`,[c.number,c.desc,c.notes,c.syncs.map(s=>s.system).join(" ")],c.syncs.map(s=>s.date).filter(Boolean).sort().pop()||td(t),go("transports"),dl));
    (function w(a){a.forEach(s=>{add("Subtask",s.title||"(subtask)",[s.title,(s.comments||[]).map(c=>c.text).join(" · ")],s.dueDate||s.receivedDate||td(t),go("work"),dl);w(s.children||[]);});})(t.subtasks);
    (t.reference||[]).forEach(r=>add("Reference",`${r.label||"(reference)"}${r.secret?" 🔒":""}`,[r.label,r.secret?"":r.value],td(t),go("reference"),dl));
    (t.lessons||[]).forEach(l=>add("Lesson",`💡 ${l.text.split("\n")[0].slice(0,90)}`,[l.text],l.date,go("overview"),dl));});
  (state.jobs||[]).forEach(j=>add("Task",`☐ ${j.title}`,[j.title,j.askedBy,j.brief,j.outcome,j.waiting.on,j.nextAction.note,...j.log.map(x=>x.text),...j.refs.map(r=>r.label+(r.secret?"":" "+r.value))],j.received,()=>{view="jobs";activeJobId=j.id;},`${JOB_STATUS[j.status].l}${j.askedBy?" · "+j.askedBy:""}`));
  (state.people||[]).forEach(p=>{const ds=demandsOf(p.id);add("Team",`👷 ${p.name}`,[p.name,p.role],"",()=>{view="playbook";playTeam=true;activePlayId=null;},`${ds.length} demand${ds.length===1?"":"s"}${p.role?" · "+p.role:""}`);});
  state.meetings.forEach(m=>{const go=()=>{view="meetings";meetingRollup=false;activeMeetingId=m.id;};
    add("Meeting",m.title,[m.title,m.team,m.attendees,m.body],m.date,go,m.team);
    m.actions.forEach(a=>add("Action",`${a.done?"✓ ":""}${a.text||"(action)"}${a.owner?" ("+a.owner+")":""}`,[a.text,a.owner,a.resolution&&"↳ "+a.resolution],a.due||m.date,go,m.title));});
  state.credentials.forEach(c=>add("Vault",`${c.system||""}${c.client?"/"+c.client:""} ${c.label||""}`.trim()||"(credential)",[c.system,c.client,c.label,c.username,c.url,c.notes],"",()=>{view="vault";}));
  state.journal.forEach(j=>add("Journal",j.title||"Journal · "+j.date,[j.title,j.body],j.date,()=>{view="journal";journalTodos=false;activeJournalId=j.id;}));
  state.wins.forEach(w=>add("Win",`${WIN_KINDS[w.kind].icon} ${w.text}`,[w.text],w.date,()=>{view="review";}));
  state.efforts.forEach(e=>{const k=efKey(e);add("Effort",`${efFh(e.hours)} h · ${efName(k)}`,[e.note,e.activity],e.date,()=>{
    if(e.taskId&&efTaskOf(e.taskId)){view="demands";activeId=e.taskId;activeTab="effort";}else if(e.epicId&&epicById(e.epicId)){view="epics";activeEpicId=e.epicId;epicTab="effort";}else view="effort";setTimeout(()=>openEfDay(e.date,k),0);},e.activity);});
  state.epics.forEach(e=>{const go=tab=>()=>{view="epics";activeEpicId=e.id;epicTab=tab;},el="◆ "+(e.code||e.name);
    add("Epic",`◆ ${epicLabel(e)}`,[e.name,e.code,e.description,e.owner,e.notes,e.myScope],e.targetDate||"",go("overview"));
    e.log.forEach(x=>add("Epic story",`${EPIC_LOG[x.kind].icon} ${(x.text||"").slice(0,90)}`,[x.text],x.date,go("story"),el));
    e.deps.forEach(x=>add("Waiting on",`${x.done?"✓ ":"⏸ "}${x.team||"(team)"}${x.what?" — "+x.what:""}`,[x.team,x.what,x.note],x.since,go("deps"),el));
    (function w(a){a.forEach(s=>{add("Subtask",s.title||"(subtask)",[s.title],s.dueDate||"",go("subtasks"),el);w(s.children||[]);});})(e.subtasks);});
  state.playbook.forEach(p=>add("Playbook",`${PLAY_KINDS[p.kind].icon} ${p.title}`,[p.title,p.category,p.body,(p.steps||[]).map(s=>s.text).join(" · "),(p.people||[]).map(x=>x.name+" "+x.role+" "+x.contact).join(" · "),(p.systems||[]).join(" ")],p.due||p.from||"",()=>{view="playbook";activePlayId=p.id;},p.category));
  state.images.forEach(im=>add("Image",`📷 ${im.label||im.file}`,[im.label,im.file],isoTs(im.addedAt),()=>gotoImage(im)));
  state.debug.forEach(s=>add("Debug",s.title,[s.title,s.demandId,s.resume,s.notes,s.objects.map(o=>o.name+" "+o.note).join(" · "),s.breakpoints.map(b=>b.object+" "+b.condition+" "+b.note).join(" · "),s.findings.map(f=>f.text).join(" · "),s.watches.map(w=>w.name+" "+w.value+" "+w.where).join(" · ")],isoTs(s.updatedAt),()=>{view="debug";activeDebugId=s.id;},s.demandId));
  (state.sheets||[]).forEach(sh=>sh.rows.forEach((r,i)=>add("Sheet",`▦ ${sh.name} · ${r.filter(Boolean).slice(0,2).join(" · ").slice(0,70)}`,[r.map((c,k)=>(sh.headers[k]?sh.headers[k]+": ":"")+c).join(" · ")],sh.added,()=>{setTimeout(()=>openSheet(sh,i),0);},`row ${i+1} of ${sh.rows.length}`)));
  NOTES.forEach(n=>{if(terms.every(t=>n.low.includes(t)))hits.push({k:"Note",label:n.name,sub:n.folder||"(top folder)",text:n.text,low:n.low,date:n.date,note:n});});
  /* best match: words in the title count most, then how often they appear */
  hits.forEach(h=>{const lab=h.label.toLowerCase();let s=0;terms.forEach(t=>{if(lab.includes(t))s+=6;let i=0,c=0;while(c<6&&(i=h.low.indexOf(t,i))>=0){c++;i+=t.length;}s+=c;});h.score=s;});
  return hits;}
const searchSort=m=>m==="new"?(a,b)=>(b.date||"").localeCompare(a.date||""):m==="old"?(a,b)=>(a.date||"9999").localeCompare(b.date||"9999"):(a,b)=>b.score-a.score||(b.date||"").localeCompare(a.date||"");
const srReEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
/* mark the words in already-escaped html, never inside an &entity; */
function srMark(html,terms){if(!terms.length)return html;const re=new RegExp("(&[a-z#0-9]+;)|("+terms.map(t=>srReEsc(esc(t))).join("|")+")","gi");
  return html.replace(re,(m,ent,hit)=>ent?ent:`<mark>${hit}</mark>`);}
function searchSnippets(text,terms,width=80,max=2){const t=String(text||""),low=t.toLowerCase(),pos=[];
  terms.forEach(x=>{const i=low.indexOf(x);if(i>=0)pos.push(i);});pos.sort((a,b)=>a-b);
  const wins=[];pos.forEach(p=>{const a=Math.max(0,p-width),b=Math.min(t.length,p+width),l=wins[wins.length-1];if(l&&a<=l[1])l[1]=Math.max(l[1],b);else if(wins.length<max)wins.push([a,b]);});
  if(!wins.length)wins.push([0,Math.min(t.length,width*2)]);
  return wins.map(([a,b])=>(a>0?"…":"")+srMark(esc(t.slice(a,b).replace(/\s+/g," ")),terms)+(b<t.length?"…":"")).join(` <span class="faint">·</span> `);}
const SR_PEN={Sheet:"pen-6",Task:"pen-7",Demand:"pen-2",Object:"pen-4",Transport:"pen-3",ToC:"pen-5",Subtask:"ink-2",Reference:"ink-2",Meeting:"pen-4",Action:"pen-4",Vault:"ink-3",Journal:"pen-3","To-do":"pen-3",Win:"pen-4",Effort:"pen-2",Epic:"pen-5","Epic story":"pen-5","Waiting on":"pen-4",Playbook:"pen-6",Image:"ink-3",Debug:"pen-1",Note:"pen-7",Lesson:"pen-4"};
function openHit(h,terms){const box=document.getElementById("gsearchResults");if(box)box.classList.add("hide");
  if(h.k==="Note"){openNote(h.note,terms);return;}h.go();const gs=document.getElementById("globalSearch");if(gs)gs.value="";renderApp();}
/* the title-bar box: the best few, then everything on the Search page */
function runGlobalSearch(q){const box=document.getElementById("gsearchResults");if(!String(q||"").trim()){box.classList.add("hide");return;}
  const terms=searchTerms(q),hits=searchAll(q).sort(searchSort("best"));
  box.innerHTML=(hits.length?hits.slice(0,8).map((h,i)=>`<div class="gsr" data-i="${i}"><span class="k">${esc(h.k)}</span>${esc(h.label)}${h.date?` <span class="gsd">${shortD(h.date)}</span>`:""}<div class="gss">${searchSnippets(h.text,terms,60,1)}</div></div>`).join("")
      :`<div class="gsr faint">No matches${NOTES.length?"":" — your old .txt notes aren't connected yet"}</div>`)
    +`<div class="gsr gsall" data-all="1">⌕ ${hits.length>8?`All ${hits.length} results`:"Open Search"} — filter by kind and year${NOTES.length?"":", connect your old notes"} <kbd>Enter</kbd></div>`;
  box.classList.remove("hide");
  box.querySelectorAll(".gsr[data-i]").forEach(el=>el.onclick=()=>openHit(hits[+el.dataset.i],terms));
  box.querySelector("[data-all]").onclick=()=>openSearch(q);}
/* ---------- the Search page ---------- */
let SRCH={q:"",kind:"",year:"",sort:"best",limit:100};
function openSearch(q){SRCH={...SRCH,q:q!=null?String(q):SRCH.q,kind:"",year:"",limit:100};view="search";
  const box=document.getElementById("gsearchResults");if(box)box.classList.add("hide");const gs=document.getElementById("globalSearch");if(gs){gs.value="";gs.blur();}renderApp();}
function renderSearchPage(){const host=document.getElementById("detail");if(!host)return;
  const terms=searchTerms(SRCH.q),all=terms.length?searchAll(SRCH.q):[],yr=h=>h.date?h.date.slice(0,4):"—";
  const kinds=[...all.reduce((m,h)=>m.set(h.k,(m.get(h.k)||0)+1),new Map()).entries()].sort((a,b)=>b[1]-a[1]);
  const years=[...all.reduce((m,h)=>m.set(yr(h),(m.get(yr(h))||0)+1),new Map()).entries()].sort((a,b)=>b[0].localeCompare(a[0]));
  const list=all.filter(h=>(!SRCH.kind||h.k===SRCH.kind)&&(!SRCH.year||yr(h)===SRCH.year)).sort(searchSort(SRCH.sort));
  const chip=(attr,val,label,n,on)=>`<button class="ef-chip ${on?"on":""}" data-${attr}="${esc(val)}">${esc(label)}${n!=null?` <b class="mono">${n}</b>`:""}</button>`;
  host.innerHTML=`<div class="efx ef-ws sr">
    <div class="ef-wsh"><div><div class="ef-l1">⌕ Search · your data file${NOTES.length?` + ${NOTES.length} old note${NOTES.length===1?"":"s"}`:""}</div><h1>Search</h1></div></div>
    <div class="sr-box"><input id="srQ" value="${esc(SRCH.q)}" placeholder='Words to find — every word must appear · "exact phrase" in quotes' autocomplete="off" spellcheck="false"><span class="faint mono">${terms.length?`${list.length}${list.length!==all.length?" of "+all.length:""} result${all.length===1?"":"s"}`:""}</span></div>
    ${notesStatusHTML()}
    ${sheetsHTML()}
    ${all.length?`<div class="sr-filters">
      <div class="sr-f"><span class="ef-lb">Kind</span><div class="ef-row">${chip("kind","","All",all.length,!SRCH.kind)}${kinds.map(([k,n])=>chip("kind",k,k,n,SRCH.kind===k)).join("")}</div></div>
      <div class="sr-f"><span class="ef-lb">Year</span><div class="ef-row">${chip("year","","All",null,!SRCH.year)}${years.map(([y,n])=>chip("year",y,y==="—"?"No date":y,n,SRCH.year===y)).join("")}</div></div>
      <div class="sr-f"><span class="ef-lb">Order</span><div class="ef-row">${[["best","Best match"],["new","Newest"],["old","Oldest"]].map(([k,l])=>chip("sort",k,l,null,SRCH.sort===k)).join("")}</div></div></div>`:""}
    <div class="sr-list">${list.slice(0,SRCH.limit).map((h,i)=>`<div class="sr-hit" data-i="${i}" style="--pen:var(--${SR_PEN[h.k]||"ink-3"})">
        <div class="sr-h"><span class="ef-tag">${esc(h.k)}</span><b>${srMark(esc(h.label),terms)}</b>${h.sub?`<span class="faint">${esc(h.sub)}</span>`:""}<span class="sr-d mono">${h.date?efFmt(h.date,{day:"2-digit",month:"short",year:"numeric"}):""}</span></div>
        <div class="sr-s">${searchSnippets(h.text,terms)}</div></div>`).join("")}</div>
    ${list.length>SRCH.limit?`<button class="sm" id="srMore">Show ${Math.min(100,list.length-SRCH.limit)} more · ${list.length-SRCH.limit} left</button>`:""}
    ${!terms.length?`<div class="faint sr-empty">Type above. Every word must appear somewhere in the entry (any order); put words in "quotes" to match them as a phrase. Results come from demands, objects, transports, subtasks, comments, meetings, journal, to-dos, effort notes, wins, epics, the playbook, debug sessions${NOTES.length?" and your old notes":""}.</div>`:""}
    ${terms.length&&!all.length?`<div class="faint sr-empty">Nothing matches every word. Try fewer words${NOTES.length?"":", or connect your old notes"}.</div>`:""}
  </div>`;
  const q=s=>host.querySelector(s),inp=q("#srQ");wireNotesStatus(host);wireSheets(host);
  inp.oninput=()=>{clearTimeout(inp._t);inp._t=setTimeout(()=>{SRCH.q=inp.value;SRCH.kind="";SRCH.year="";SRCH.limit=100;const pos=inp.selectionStart;renderSearchPage();const ni=document.getElementById("srQ");if(ni){ni.focus();ni.setSelectionRange(pos,pos);}},250);};
  host.querySelectorAll("[data-kind]").forEach(b=>b.onclick=()=>{SRCH.kind=b.dataset.kind;SRCH.limit=100;renderSearchPage();});
  host.querySelectorAll("[data-year]").forEach(b=>b.onclick=()=>{SRCH.year=b.dataset.year;SRCH.limit=100;renderSearchPage();});
  host.querySelectorAll("[data-sort]").forEach(b=>b.onclick=()=>{SRCH.sort=b.dataset.sort;renderSearchPage();});
  host.querySelectorAll(".sr-hit").forEach(el=>el.onclick=()=>openHit(list[+el.dataset.i],terms));
  if(q("#srMore"))q("#srMore").onclick=()=>{SRCH.limit+=100;renderSearchPage();};
  if(!terms.length&&document.activeElement!==inp)setTimeout(()=>inp.focus(),30);}
/* ---------- reading one old note ---------- */
function openNote(n,terms){terms=terms||[];const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal efx nt-modal"><div class="nt-h"><div style="min-width:0"><span class="ef-lb">Old note · ${esc(n.folder||"(top folder)")}</span><h2>${esc(n.name)}</h2>
      <div class="faint mono" style="font-size:11px">${efLong(n.date)} · ${fmtSize(n.size)}${terms.length?` · <span id="ntCount"></span>`:""}</div></div>
      <div class="ef-row">${terms.length?`<button class="sm" id="ntPrev" title="Previous match">↑</button><button class="sm" id="ntNext" title="Next match">↓ Next</button>`:""}<button class="sm" id="ntCopy">⧉ Copy text</button><button class="ghost" id="ntClose">Close</button></div></div>
    <pre class="nt-body" id="ntBody">${srMark(esc(n.text),terms)}</pre></div></div>`;
  const q=s=>root.querySelector(s),bg=q(".modal-bg"),close=()=>{root.innerHTML="";};
  bg.onclick=e=>{if(e.target===bg)close();};q("#ntClose").onclick=close;
  q("#ntCopy").onclick=()=>navigator.clipboard.writeText(n.text).then(()=>toast("Copied")).catch(()=>toast("Copy failed",true));
  const marks=[...root.querySelectorAll("#ntBody mark")];let i=-1;
  const go=d=>{if(!marks.length)return;if(i>=0)marks[i].classList.remove("cur");i=(i+d+marks.length)%marks.length;marks[i].classList.add("cur");marks[i].scrollIntoView({block:"center"});const c=q("#ntCount");if(c)c.textContent=`match ${i+1} of ${marks.length}`;};
  if(q("#ntNext")){q("#ntNext").onclick=()=>go(1);q("#ntPrev").onclick=()=>go(-1);}
  if(marks.length)setTimeout(()=>go(1),30);else{const c=q("#ntCount");if(c)c.textContent="no matches in the text";}}
/* ---------- "have I seen this before?" — old notes that mention this demand ---------- */
function notesFor(t){const toks=[...new Set([t.demandId,...t.objects.map(o=>o.name),...t.transports.map(tr=>tr.number)].map(x=>String(x||"").trim()).filter(x=>x.length>=4))],lows=toks.map(x=>x.toLowerCase());
  return {toks,hits:toks.length?NOTES.map(n=>({n,m:toks.filter((x,i)=>n.low.includes(lows[i]))})).filter(x=>x.m.length).sort((a,b)=>b.m.length-a.m.length||b.n.date.localeCompare(a.n.date)):[]};}
function notesRailHTML(t){if(!NOTES.length)return "";const {toks,hits}=notesFor(t);if(!toks.length)return "";
  return `<div class="ck-unit cxs"><div class="ck-head"><h2>In your old notes</h2>${hits.length?`<a class="cxl" id="cxNotesAll">${hits.length} ›</a>`:""}</div>
    ${hits.slice(0,5).map((x,i)=>`<div class="lk cx-note" data-i="${i}" style="--pen:var(--pen-7)" title="${esc(x.n.path)}"><i></i><span class="t">${esc(x.n.name)} <span class="faint">${esc(x.m.slice(0,2).join(", "))}</span></span><span class="d">${shortD(x.n.date)}</span></div>`).join("")
      ||`<div class="bempty">Nothing in your old notes mentions ${esc(toks[0])}${toks.length>1?" or its objects":""}.</div>`}</div>`;}
function wireNotesRail(host,t){if(!NOTES.length)return;const {hits}=notesFor(t);
  host.querySelectorAll(".cx-note").forEach(el=>el.onclick=()=>{const x=hits[+el.dataset.i];if(x)openNote(x.n,x.m.map(m=>m.toLowerCase()));});
  const all=host.querySelector("#cxNotesAll");if(all)all.onclick=()=>{openSearch(t.demandId||(t.objects[0]&&t.objects[0].name)||"");SRCH.kind="Note";renderSearchPage();};}

