/* ===================== LESSONS — what you'd tell yourself next time =====================
   A lesson lives on its demand (t.lessons=[{id,date,text,playId}]) — it's part of that demand's
   story and it's searchable. The ones that are general rules can also go to the Playbook as a
   "Lesson learned" entry, linked both ways; that copy is edited separately. */
function promoteLesson(t,l){const first=l.text.split(/\n/)[0].trim(),title=first.length>80?first.slice(0,77)+"…":first;
  const p=normPlay({kind:"lesson",title:title||"Lesson learned",body:l.text,category:"Lessons learned",fromTaskId:t.id,fromLessonId:l.id,fromDate:l.date});
  state.playbook.unshift(p);l.playId=p.id;return p;}
function openLesson(t,o={}){const root=document.getElementById("modalRoot"),L=t.lessons||(t.lessons=[]),l=o.id?L.find(x=>x.id===o.id):null,inPb=l&&l.playId?state.playbook.find(p=>p.id===l.playId):null;
  root.innerHTML=`<div class="modal-bg"><div class="modal efx ef-modal"><h2>${o.closing?"💡 Closed — anything worth remembering?":l?"✎ Edit lesson":"💡 A lesson from this demand"}</h2>
    <p class="faint" style="font-size:12px;margin-top:-6px;line-height:1.5">${o.closing?`<b>${esc(demandLabel(t))}</b> is closed. If there's one thing you'd tell yourself before the next demand like it, note it — it stays with this demand and shows up in search.`:`What would you tell yourself before the next demand like <b>${esc(demandLabel(t))}</b>?`}</p>
    <div class="ef-qc"><textarea id="lsText" rows="4" placeholder="e.g. Ask FI for the final cost-center list before building the selection screen — it changed twice">${esc(l?l.text:"")}</textarea>
      ${inPb?`<div class="faint" style="font-size:12px">💡 Also in the Playbook — <a href="#" id="lsPb">open it ›</a> <span class="faint">(that copy is edited separately)</span></div>`
        :`<label class="ls-pb"><input type="checkbox" id="lsToPb"><span><b>Also add to the Playbook</b> as a “Lesson learned” — for rules you'd follow on <i>any</i> demand, not just this one.</span></label>`}
      <div class="ef-foot"><span class="ef-dsf faint">Ctrl+Enter saves</span>${l?`<button class="ghost danger" id="lsDel">Delete</button>`:""}<button class="ghost" id="lsCancel">${o.closing?"Skip":"Cancel"}</button><button class="primary" id="lsSave">Save</button></div></div></div></div>`;
  const q=s=>root.querySelector(s),bg=q(".modal-bg"),close=()=>{root.innerHTML="";};
  bg.onclick=e=>{if(e.target===bg)close();};q("#lsCancel").onclick=close;
  if(q("#lsPb"))q("#lsPb").onclick=e=>{e.preventDefault();close();view="playbook";activePlayId=inPb.id;renderApp();};
  const save=()=>{const text=q("#lsText").value.trim();
    if(!text){if(o.closing){close();return;}const ta=q("#lsText");ta.classList.remove("ef-shake");void ta.offsetWidth;ta.classList.add("ef-shake");ta.focus();toast("What's the lesson?",true);return;}
    let x=l;if(x)x.text=text;else{x={id:uid(),date:todayStr(),text,playId:""};L.push(x);}
    const toPb=q("#lsToPb")&&q("#lsToPb").checked;if(toPb)promoteLesson(t,x);
    touch(t);close();renderApp();toast(toPb?"💡 Lesson saved — and added to the Playbook":"💡 Lesson saved");};
  q("#lsSave").onclick=save;q("#lsText").onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();save();}};
  if(q("#lsDel"))q("#lsDel").onclick=()=>{const i=L.indexOf(l);L.splice(i,1);touch(t);close();renderApp();efToastUndo("Lesson deleted",()=>{L.splice(Math.min(i,L.length),0,l);touch(t);renderApp();});};
  setTimeout(()=>{const ta=q("#lsText");if(ta)ta.focus();},40);}
function renderLessons(host,t){if(!host)return;const ls=(t.lessons||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  host.innerHTML=`<div class="sec-title"><h3>Lessons</h3><div class="ln"></div><span class="faint" style="font-size:10.5px">what you'd tell yourself next time</span><button class="sm" id="lsAdd">＋ Add a lesson</button></div>
    ${ls.map(l=>{const p=l.playId?state.playbook.find(x=>x.id===l.playId):null;
      return `<div class="ls-row" data-id="${l.id}"><span class="d mono">${shortD(l.date)}</span><div class="x"><div>${linkify(l.text).replace(/\n/g,"<br>")}</div><div class="m">${p?`<a href="#" class="ls-open" data-pb="${p.id}">💡 In the Playbook ›</a>`:`<a href="#" class="ls-promote" title="For rules you'd follow on any demand">→ Add to the Playbook</a>`}</div></div><span class="ops"><button class="ghost sm" data-op="ed" title="Edit">✎</button><button class="ghost sm danger" data-op="rm" title="Delete">✕</button></span></div>`;}).join("")
      ||`<div class="faint" style="font-size:12px;padding:2px 0 4px">No lessons yet — you're asked when you close the demand, or add one any time.</div>`}`;
  host.querySelector("#lsAdd").onclick=()=>openLesson(t);
  host.querySelectorAll(".ls-row").forEach(r=>{const l=(t.lessons||[]).find(x=>x.id===r.dataset.id);if(!l)return;
    r.querySelector('[data-op="ed"]').onclick=()=>openLesson(t,{id:l.id});
    r.querySelector('[data-op="rm"]').onclick=()=>{const L=t.lessons,i=L.indexOf(l);L.splice(i,1);touch(t);renderApp();efToastUndo("Lesson deleted",()=>{L.splice(Math.min(i,L.length),0,l);touch(t);renderApp();});};
    const pr=r.querySelector(".ls-promote");if(pr)pr.onclick=e=>{e.preventDefault();promoteLesson(t,l);touch(t);renderApp();toast("💡 Added to the Playbook as a lesson learned");};
    const op=r.querySelector(".ls-open");if(op)op.onclick=e=>{e.preventDefault();view="playbook";activePlayId=op.dataset.pb;renderApp();};});}

/* ===================== BROWSE BY MONTH =====================
   Everything that happened in one month, day by day — for when you remember *when* something
   happened, not what it was called. Built from what's already in the file (and your old notes,
   dated by when the file was last saved). */
let MON={ym:"",kinds:new Set()};
const MON_KINDS={demand:{l:"Demands",pen:"pen-2"},job:{l:"Tasks",pen:"pen-7"},transport:{l:"Transports",pen:"pen-3"},meeting:{l:"Meetings",pen:"pen-4"},journal:{l:"Journal",pen:"pen-3"},effort:{l:"Hours",pen:"pen-2"},
  win:{l:"Wins & lessons",pen:"pen-4"},epic:{l:"Epics",pen:"pen-5"},debug:{l:"Debug",pen:"pen-1"},note:{l:"Old notes",pen:"pen-7"},off:{l:"Days off",pen:"ink-3"}};
function monthEvents(){const ev=[],push=(d,k,h,go,x)=>{if(d&&/^\d{4}-\d\d-\d\d/.test(d))ev.push({d:d.slice(0,10),k,h,go,...(x||{})});};
  state.tasks.forEach(t=>{const dl=esc(demandLabel(t)),go=tab=>()=>{view="demands";activeId=t.id;activeTab=tab;renderApp();};
    push(t.receivedDate,"demand",`📥 <b>${dl}</b> received — ${esc(t.title)}`,go("overview"),{o:0});
    (t.timeline||[]).forEach(e=>{const d=isoTs(e.ts);
      if(e.type==="status"&&e.from){const to=STATUS[e.to]?STATUS[e.to].label:e.to;
        push(d,"demand",isChange(e)?`🔄 <b>${dl}</b> — requirement changed → ${to}${e.note?": "+esc(e.note):""}`:`${e.to==="delivered"?"🚀":e.to==="bug"?"↻":e.to==="closed"?"✓":"↪"} <b>${dl}</b> → ${to}`,go("history"),{o:1,del:e.to==="delivered"});}
      else if(e.type==="note"&&e.note)push(d,"demand",`🗒 <b>${dl}</b>: ${esc(e.note)}`,go("history"),{o:1});});
    (t.comments||[]).forEach(c=>push(isoTs(c.ts),"demand",`💬 <b>${dl}</b>: ${esc(c.text.length>160?c.text.slice(0,157)+"…":c.text)}`,go("overview"),{o:2}));
    (t.lessons||[]).forEach(l=>push(l.date,"win",`💡 Lesson · <b>${dl}</b>: ${esc(l.text.length>180?l.text.slice(0,177)+"…":l.text)}`,go("overview"),{o:6}));
    t.transports.forEach(tr=>tr.syncs.forEach(s=>push(s.date,"transport",`🚚 <b class="mono">${esc(tr.number||"(TR)")}</b> reached ${esc(s.system)} · ${dl}`,go("transports"),{o:3})));
    (t.tocs||[]).forEach(c=>c.syncs.forEach(s=>push(s.date,"transport",`📦 ToC <b class="mono">${esc(c.number||"")}</b> reached ${esc(s.system)} · ${dl}`,go("transports"),{o:3})));});
  (state.jobs||[]).forEach(j=>{const go=()=>{view="jobs";activeJobId=j.id;renderApp();},tl=esc(j.title);
    push(j.received,"job",`☐ <b>${tl}</b> came in${j.askedBy?" from "+esc(j.askedBy):""}${j.due?` · expected by ${j.due}`:""}`,go,{o:0});
    j.log.forEach(x=>push(x.date,"job",`${JOB_LOG[x.kind].i} <b>${tl}</b>: ${esc(x.text.length>160?x.text.slice(0,157)+"…":x.text)}`,go,{o:1}));
    if(j.closedOn&&j.status==="done"){const tm=jobTiming(j);push(j.closedOn,"job",`☑ <b>${tl}</b> done${tm?" — "+tm.txt:""}`,go,{o:1,del:true});}});
  state.meetings.forEach(m=>push(m.date,"meeting",`👥 <b>${esc(m.title)}</b>${m.team?" · "+esc(m.team):""}${m.actions.length?` · ${m.actions.length} action point${m.actions.length===1?"":"s"}`:""}`,()=>{view="meetings";meetingRollup=false;activeMeetingId=m.id;renderApp();},{o:4}));
  state.journal.forEach(j=>push(j.date,"journal",`📓 <b>${esc(j.title||"Journal")}</b>${j.body?" — "+esc(j.body.replace(/\s+/g," ").slice(0,160)):""}`,()=>{view="journal";journalTodos=false;activeJournalId=j.id;renderApp();},{o:5}));
  const byDay=new Map();state.efforts.forEach(e=>{(byDay.get(e.date)||byDay.set(e.date,[]).get(e.date)).push(e);});
  byDay.forEach((es,d)=>{const m=new Map();es.forEach(e=>{const k=efKey(e);m.set(k,(m.get(k)||0)+e.hours);});
    push(d,"effort",`⏱ <b>${efFh(efSum(es))} h</b> — ${[...m.entries()].sort((a,b)=>b[1]-a[1]).map(([k,h])=>esc(efName(k))+" "+efFh(h)).join(" · ")}`,()=>openEfDay(d),{o:7,h2:efSum(es)});});
  state.wins.forEach(w=>push(w.date,"win",`${WIN_KINDS[w.kind].icon} Win: ${esc(w.text)}`,()=>{view="review";renderApp();},{o:6}));
  state.epics.forEach(e=>{const el=esc(e.code||e.name),go=tab=>()=>{view="epics";activeEpicId=e.id;epicTab=tab;renderApp();};
    e.log.forEach(x=>push(x.date,"epic",`${EPIC_LOG[x.kind].icon} ◆ ${el}: ${esc(x.text)}`,go("story"),{o:8}));
    e.deps.forEach(x=>{push(x.since,"epic",`⏸ ◆ ${el}: started waiting on ${esc(x.team||"another team")}${x.what?" — "+esc(x.what):""}`,go("deps"),{o:8});
      if(x.done&&x.doneDate)push(x.doneDate,"epic",`▶ ◆ ${el}: ${esc(x.team||"the other team")} delivered${x.what?" — "+esc(x.what):""}`,go("deps"),{o:8});});});
  state.debug.forEach(s=>s.findings.forEach(f=>push(isoTs(f.ts),"debug",`${FIND_KINDS[f.kind]?FIND_KINDS[f.kind].icon:"•"} <b>${esc(s.title)}</b>: ${esc(f.text.length>160?f.text.slice(0,157)+"…":f.text)}`,()=>{view="debug";activeDebugId=s.id;renderApp();},{o:9})));
  (state.daysOff||[]).forEach(x=>push(x.date,"off",`${EF_OFF[x.kind].icon} ${EF_OFF[x.kind].l}${x.label?" — "+esc(x.label):""}`,()=>openEfDay(x.date),{o:-1}));
  NOTES.forEach(n=>push(n.date,"note",`📄 <b>${esc(n.name)}</b> <span class="faint">${esc(n.folder||"")}</span> — ${esc(n.text.replace(/\s+/g," ").slice(0,140))}`,()=>openNote(n,[]),{o:10}));
  return ev;}
const monLabel=ym=>efFmt(ym+"-01",{month:"long",year:"numeric"});
function renderMonth(){const host=document.getElementById("detail"),t=todayStr(),all=monthEvents();if(!MON.ym)MON.ym=t.slice(0,7);
  const ym=MON.ym,inM=all.filter(e=>e.d.slice(0,7)===ym),shown=inM.filter(e=>!MON.kinds.size||MON.kinds.has(e.k));
  const cnt=new Map();all.forEach(e=>{if(e.d<=t&&e.k!=="off"){const m=e.d.slice(0,7);cnt.set(m,(cnt.get(m)||0)+1);}});
  const y1=+t.slice(0,4),y0=Math.min(y1,...[...cnt.keys()].map(m=>+m.slice(0,4))),mx=Math.max(1,...cnt.values());
  const strip=[];for(let y=y1;y>=y0;y--)strip.push(`<div class="mo-yr"><span class="mono">${y}</span>${Array.from({length:12},(_,i)=>{const m=y+"-"+p2(i+1),n=cnt.get(m)||0,fut=m>t.slice(0,7);
    return `<button class="mo-m ${m===ym?"on":""}" data-ym="${m}" ${fut?"disabled":""} title="${monLabel(m)}${n?" · "+n+" thing"+(n===1?"":"s"):""}"><i style="width:${n?Math.round(4+Math.sqrt(n/mx)*12):3}px;height:${n?Math.round(4+Math.sqrt(n/mx)*12):3}px;opacity:${n?1:.35}"></i><span>${efFmt(m+"-01",{month:"short"})}</span></button>`;}).join("")}</div>`);
  const kc=new Map();inM.forEach(e=>kc.set(e.k,(kc.get(e.k)||0)+1));
  const rec=inM.filter(e=>e.o===0).length,del=inM.filter(e=>e.del).length,hrs=inM.filter(e=>e.k==="effort").reduce((a,e)=>a+e.h2,0);
  const days=[...new Set(shown.map(e=>e.d))].sort();
  host.innerHTML=`<div class="efx ef-ws mo">
    <div class="ef-wsh"><div><div class="ef-l1">▦ Browse by month</div><h1>${monLabel(ym)}</h1></div>
      <div class="ef-ctl"><span class="ef-row"><button class="sm ghost" id="moP" title="Month before">‹</button><button class="sm ${ym===t.slice(0,7)?"ghost":""}" id="mo0">This month</button><button class="sm ghost" id="moN" title="Month after" ${ym>=t.slice(0,7)?"disabled":""}>›</button></span></div></div>
    <div class="ck-unit mo-strip">${strip.join("")}<div class="faint" style="font-size:10.5px;margin-top:4px">Bigger dot = more happened that month. Click a month.</div></div>
    ${roHTML([{k:"Received",v:U(rec,"demand"+(rec===1?"":"s"))},{k:"Delivered",v:U(del,"time"+(del===1?"":"s"))},{k:"Hours logged",v:hrs?U(efFh(Math.round(hrs*10)/10),"h"):"—"},
      {k:"Meetings",v:String(kc.get("meeting")||0)},{k:"Journal",v:String(kc.get("journal")||0)},{k:"Wins & lessons",v:String(kc.get("win")||0)},{k:"Old notes",v:String(kc.get("note")||0),title:"Notes whose file was last saved this month"}])}
    ${inM.length?`<div class="sr-f"><span class="ef-lb">Show</span><div class="ef-row"><button class="ef-chip ${!MON.kinds.size?"on":""}" data-k="">Everything <b class="mono">${inM.length}</b></button>${Object.entries(MON_KINDS).filter(([k])=>kc.get(k)).map(([k,v])=>`<button class="ef-chip ${MON.kinds.has(k)?"on":""}" data-k="${k}" style="--pen:var(--${v.pen})"><span class="ef-pd"></span>${v.l} <b class="mono">${kc.get(k)}</b></button>`).join("")}</div></div>`:""}
    <div class="mo-days">${days.map(d=>{const evs=shown.filter(e=>e.d===d).sort((a,b)=>a.o-b.o);
      return `<div class="mo-day"><div class="mo-dh"><b>${efFmt(d,{weekday:"short",day:"numeric"})}</b><span class="faint">${efFmt(d,{month:"short",year:"numeric"})}</span></div><div class="mo-evs">${evs.map(e=>`<div class="mo-ev" data-i="${shown.indexOf(e)}" style="--pen:var(--${MON_KINDS[e.k].pen})"><i></i><span>${e.h}</span></div>`).join("")}</div></div>`;}).join("")
      ||`<div class="faint sr-empty">${inM.length?"Nothing of the chosen kinds this month.":`Nothing recorded in ${monLabel(ym)}.${NOTES.length?"":" Connect your old .txt notes on the Search page and their months fill in here too."}`}</div>`}</div>
  </div>`;
  const q=s=>host.querySelector(s);
  q("#moP").onclick=()=>{MON.ym=efMonthShift(ym,-1);renderMonth();};q("#moN").onclick=()=>{if(ym<t.slice(0,7)){MON.ym=efMonthShift(ym,1);renderMonth();}};q("#mo0").onclick=()=>{MON.ym=t.slice(0,7);renderMonth();};
  host.querySelectorAll(".mo-m[data-ym]").forEach(b=>b.onclick=()=>{MON.ym=b.dataset.ym;renderMonth();});
  host.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(!k)MON.kinds.clear();else if(MON.kinds.has(k))MON.kinds.delete(k);else MON.kinds.add(k);renderMonth();});
  host.querySelectorAll(".mo-ev").forEach(el=>el.onclick=()=>{const e=shown[+el.dataset.i];if(e&&e.go)e.go();});}

/* ===================== the Overview journey: the days you worked, under the line ===================== */
function journeyEffort(c,w,h,t,X,xMax,label){const es=efFor(t.id);if(!es.length||h<180)return;const EC=efC(c.canvas),base=h-46,by=new Map();
  es.forEach(e=>{(by.get(e.date)||by.set(e.date,[]).get(e.date)).push(e);});
  for(let x=28;x<=w-28;x+=6)DK.dot(c,x,base+3,.5,EC["ink-4"]);
  by.forEach((list,d)=>{const x=X(d);if(x<28||x>Math.min(xMax,w-28))return;let yy=base,n=0;
    list.slice().sort((a,b)=>EF_ORD.indexOf(a.activity)-EF_ORD.indexOf(b.activity)).forEach(e=>{const k=Math.max(1,Math.round(e.hours));for(let j=0;j<k&&n<9;j++,n++){DK.dot(c,x,yy,1.35,EC[EF_ACTC[e.activity]]||EC["pen-2"],.9);yy-=3;}});});
  label(c,`DAYS WORKED · ${efFh(Math.round(efSum(es)*10)/10)} H`,28,base+11,{size:7,align:"left"});}

