/* ===================== ROUNDS — when the requirement itself changes =====================
   A status move with cause "change" starts a new round. It is never rework: rework is a move to
   Bug, a defect in delivered work. Deliveries, hours and estimates split by round, so going back
   to the drawing board neither looks like a mistake nor hides the extra work. */
const isChange=e=>!!(e&&e.type==="status"&&e.cause==="change");
function changeEvents(t){return (t.timeline||[]).filter(isChange).sort((a,b)=>a.ts-b.ts);}
function roundCount(t){return 1+changeEvents(t).length;}
function roundOn(t,date){let r=1;changeEvents(t).forEach(e=>{if(isoTs(e.ts)<=date)r++;});return r;}
function roundStarts(t){return [t.receivedDate||isoTs(t.createdAt),...changeEvents(t).map(e=>isoTs(e.ts))];}
/* every delivery that counts: the first move to Delivered inside each round */
function roundDeliveries(t){const st=roundStarts(t),out=[];
  (t.timeline||[]).filter(e=>e.type==="status"&&e.to==="delivered").sort((a,b)=>a.ts-b.ts).forEach(e=>{const d=isoTs(e.ts),r=roundOn(t,d);if(!out.some(x=>x.r===r))out.push({r,d,from:st[r-1]||st[0]});});
  return out;}
function roundEstimates(t){const ch=changeEvents(t),add=ch.reduce((a,e)=>a+(+e.est||0),0),total=+t.estimate||0;return [Math.max(0,total-add),...ch.map(e=>+e.est||0)];}
const needsComeback=(t,v)=>["delivered","closed"].includes(t.status)&&["open","progress","bug"].includes(v);
/* a delivered (or closed) demand moving backwards: ask why, once */
function openComeback(t,v,done,cancel){const root=document.getElementById("modalRoot"),n=roundCount(t)+1,st={why:v==="bug"?"defect":"change",to:v==="open"?"open":"progress"};
  root.innerHTML=`<div class="modal-bg"><div class="modal efx ef-modal"><h2>↩ ${esc(demandLabel(t))} is coming back — why?</h2>
    <p class="faint" style="font-size:12px;margin-top:-6px;line-height:1.5">It was ${STATUS[t.status].label.toLowerCase()}. The reason decides how the work from here on is counted — a changed requirement is not a mistake.</p>
    <div class="cb-opts">
      <button class="cb-opt" data-why="defect" style="--pen:var(--bad)"><b>🐞 A defect in my work</b><span>Goes to Bug / rework, and counts as rework.</span></button>
      <button class="cb-opt" data-why="change" style="--pen:var(--pen-5)"><b>🔄 The requirement changed</b><span>Starts round ${n}. Never counts as rework — round ${n-1} stays delivered, and its hours stay with it.</span></button>
      <button class="cb-opt" data-why="reopen" style="--pen:var(--ink-3)"><b>↩ Just reopening</b><span>No label — say it was closed by mistake.</span></button></div>
    <div class="ef-qc" id="cbMore" style="margin-top:12px">
      <div class="ef-qrow"><div><span class="ef-lb">Back to</span><div class="ef-row"><button class="ef-chip" data-to="progress">In progress</button><button class="ef-chip" data-to="open">Open — waiting for the new spec</button></div></div>
        <div id="cbEstW"><span class="ef-lb">Add to the estimate · optional</span><div class="ef-row"><input id="cbEst" class="mono" placeholder="hours" style="width:90px" autocomplete="off"><span class="faint" style="font-size:11px">h for round ${n}</span></div></div></div>
      <div id="cbNoteW"><span class="ef-lb">What changed? · optional</span><textarea id="cbNote" rows="2" placeholder="e.g. Business now wants the split by profit center instead of cost center"></textarea></div></div>
    <div class="modal-foot"><button class="ghost" id="cbCancel">Cancel</button><button class="primary" id="cbOk"></button></div></div></div>`;
  const q=s=>root.querySelector(s),bg=q(".modal-bg"),close=()=>{root.innerHTML="";};
  const no=()=>{close();if(cancel)cancel();};bg.onclick=e=>{if(e.target===bg)no();};q("#cbCancel").onclick=no;
  const sync=()=>{root.querySelectorAll("[data-why]").forEach(b=>b.classList.toggle("on",b.dataset.why===st.why));root.querySelectorAll("[data-to]").forEach(b=>b.classList.toggle("on",b.dataset.to===st.to));
    q("#cbMore").style.display=st.why==="defect"?"none":"";q("#cbEstW").style.display=q("#cbNoteW").style.display=st.why==="change"?"":"none";
    q("#cbOk").textContent=st.why==="defect"?"Move to Bug / rework":st.why==="change"?`Start round ${n}`:`Move to ${STATUS[st.to].label}`;};
  root.querySelectorAll("[data-why]").forEach(b=>b.onclick=()=>{st.why=b.dataset.why;sync();});
  root.querySelectorAll("[data-to]").forEach(b=>b.onclick=()=>{st.to=b.dataset.to;sync();});
  q("#cbOk").onclick=()=>{const was=t.status;
    if(st.why==="defect"){logTimeline(t,"status",was,"bug");t.status="bug";}
    else if(st.why==="change"){const est=Math.round((parseFloat(String(q("#cbEst").value).replace(",","."))||0)*4)/4;
      logTimeline(t,"status",was,st.to,q("#cbNote").value.trim());const ev=t.timeline[t.timeline.length-1];ev.cause="change";
      if(est>0){ev.est=est;t.estimate=(+t.estimate||0)+est;}t.status=st.to;}
    else{logTimeline(t,"status",was,st.to);t.status=st.to;}
    touch(t);close();if(done)done();
    toast(st.why==="defect"?"Status → Bug / rework · logged in History":st.why==="change"?`🔄 Requirement changed — round ${n} started`:"Status → "+STATUS[t.status].label);};
  sync();}
/* fixing the past: a move to Bug that was really a changed requirement, and back */
function bugToChange(t,ev){ev.to="progress";ev.cause="change";const later=(t.timeline||[]).filter(x=>x.type==="status"&&x.ts>ev.ts).sort((a,b)=>a.ts-b.ts)[0];
  if(later&&later.from==="bug")later.from="progress";if(!later&&t.status==="bug")t.status="progress";touch(t);}
function changeToBug(t,ev){ev.to="bug";ev.cause="";const later=(t.timeline||[]).filter(x=>x.type==="status"&&x.ts>ev.ts).sort((a,b)=>a.ts-b.ts)[0];
  if(later&&["progress","open"].includes(later.from))later.from="bug";if(!later&&["progress","open"].includes(t.status))t.status="bug";touch(t);}

/* ===================== EFFORT ON AN EPIC =====================
   An epic's hours = its demands' hours + hours logged against the epic itself (calls, planning,
   chasing other teams). Any period: the whole epic, a calendar month, or custom dates. */
let epPer={mode:"all",month:"",from:"",to:""};
const epicEfforts=e=>{const ids=new Set(tasksForEpic(e.id).map(t=>t.id));return state.efforts.filter(x=>x.epicId===e.id||ids.has(x.taskId));};
const efMonthEnd=m=>efAdd(efAdd(m+"-01",32).slice(0,7)+"-01",-1);
const efMonthShift=(m,n)=>{const d=new Date(+m.slice(0,4),+m.slice(5,7)-1+n,1);return d.getFullYear()+"-"+p2(d.getMonth()+1);};
function epPeriod(all){const t=todayStr();
  if(epPer.mode==="month"){const m=epPer.month||t.slice(0,7);return {from:m+"-01",to:efMonthEnd(m),l:efFmt(m+"-01",{month:"long",year:"numeric"})};}
  if(epPer.mode==="custom"&&epPer.from&&epPer.to&&epPer.from<=epPer.to)return {from:epPer.from,to:epPer.to,l:`${rvLong(epPer.from)} – ${rvLong(epPer.to)}`};
  const f=all.length?all.reduce((m,x)=>x.date<m?x.date:m,"9999"):t;return {from:f,to:t,l:"Whole epic"};}
function renderEpicEffort(body,e){const all=epicEfforts(e).sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt);
  if(epPer.mode==="custom"&&!epPer.from){epPer.from=efAdd(todayStr(),-30);epPer.to=todayStr();}
  const P=epPeriod(all),es=all.filter(x=>x.date>=P.from&&x.date<=P.to),tot=efSum(es),ts=epicOrderedDemands(e),lvl=es.filter(x=>x.epicId),onDem=es.filter(x=>x.taskId);
  const estSum=ts.reduce((a,t)=>a+(+t.estimate||0),0),life=efSum(all),lifeDem=efSum(all.filter(x=>x.taskId));
  const rwH=efSum(onDem.filter(x=>{const t=rvTask(x.taskId);return t&&efStatusOn(t,x.date)==="bug";})),chH=efSum(onDem.filter(x=>{const t=rvTask(x.taskId);return t&&roundOn(t,x.date)>1;}));
  const byDem=ts.map(t=>({t,h:efSum(onDem.filter(x=>x.taskId===t.id))})).filter(x=>x.h>0).sort((a,b)=>b.h-a.h),idle=ts.length-byDem.length;
  const mx=Math.max(1,...byDem.map(x=>x.h),efSum(lvl));
  const waves=(()=>{const m=new Map();onDem.forEach(x=>{const t=rvTask(x.taskId),w=(t&&t.wave)||"(no wave)";m.set(w,(m.get(w)||0)+x.hours);});if(lvl.length)m.set("◆ Epic-level work",efSum(lvl));return [...m.entries()].sort((a,b)=>b[1]-a[1]);})();
  const mode=epPer.mode;
  body.innerHTML=`<div class="efx ef-tab">
    <div class="ef-wsh"><div class="ef-ctl"><div class="ef-sg" id="epP"><span class="cap">Period</span>${[["all","Whole epic"],["month","Month"],["custom","Custom"]].map(([k,l])=>`<button data-m="${k}" class="${k===mode?"on":""}">${l}</button>`).join("")}</div>
        ${mode==="month"?`<span class="ef-row"><button class="sm ghost" id="epPrev" title="Month before">‹</button><b class="mono" style="min-width:132px;text-align:center;font-weight:500">${esc(P.l)}</b><button class="sm ghost" id="epNext" title="Month after">›</button></span>`:""}
        ${mode==="custom"?`<span class="ef-row"><input type="date" id="epFrom" value="${P.from}" style="width:150px"><span class="faint">–</span><input type="date" id="epTo" value="${P.to}" style="width:150px"></span>`:""}</div>
      <div class="ef-ctl"><button class="sm" id="epCopy" title="Hours by demand — formatted, for a status mail">⧉ Copy as table</button></div></div>
    ${roHTML([{k:mode==="all"?"Hours · whole epic":"Hours · "+esc(P.l),v:U(efFh(Math.round(tot*10)/10),"h")},
      {k:"On demands",v:U(efFh(Math.round(efSum(onDem)*10)/10),"h · "+byDem.length+" demand"+(byDem.length===1?"":"s"))},
      {k:"Epic-level",v:U(efFh(Math.round(efSum(lvl)*10)/10),"h · calls, planning")},
      {k:"Estimate vs actual",v:estSum?U(efFh(Math.round(lifeDem)),"/ "+efFh(estSum)+" h"):"—",cls:estSum&&lifeDem>estSum?"bad":"",title:"Whole life: hours on the epic's demands against their estimates added up"},
      {k:"Rework",v:U(efFh(rwH),"h"),cls:rwH?"bad":"",title:"Hours logged while a demand was in Bug"},
      {k:"Changed requirements",v:U(efFh(chH),"h"),title:"Hours in round 2 or later — not rework"}])}
    <div class="ck-unit"><div class="ck-head"><h2>Log time on the epic itself</h2><span class="ck-meta">calls, planning, chasing other teams — work that belongs to no single demand</span></div><div id="epQc"></div></div>
    <div class="ck-unit"><div class="ck-head"><h2>Month by month</h2><span class="ck-meta">the epic's whole life · coloured by demand · ◆ epic-level · click a month</span></div><canvas class="ep-months" id="epMonths"></canvas></div>
    <div class="ef-gw">
      <div class="ef-stack">
        <div class="ck-unit"><div class="ck-head"><h2>By demand</h2><span class="ck-meta">${esc(P.l)}${idle?` · ${idle} demand${idle===1?"":"s"} with no hours`:""}</span></div>
          ${byDem.map(({t,h})=>`<div class="ef-brow ep-go" data-id="${t.id}" title="Open the demand's Effort tab"><span class="n"><span class="ef-pd" style="--pen:var(--${efPen(t.id)})"></span><b class="mono">${esc(t.demandId||"")}</b> <span class="faint">${esc(t.title)}</span>${t.wave?` <span class="ef-tag">${esc(t.wave)}</span>`:""}</span><span class="v">${efFh(Math.round(h*10)/10)} h · ${efPct(h,tot)}%</span>${efBarDots(h,mx/30,30,efPen(t.id))}</div>`).join("")}
          ${lvl.length?`<div class="ef-brow"><span class="n"><span class="ef-pd" style="--pen:var(--pen-5)"></span><b>◆ Epic-level work</b> <span class="faint">calls, planning, chasing</span></span><span class="v">${efFh(Math.round(efSum(lvl)*10)/10)} h · ${efPct(efSum(lvl),tot)}%</span>${efBarDots(efSum(lvl),mx/30,30,"pen-5")}</div>`:""}
          ${!tot?`<div class="faint" style="font-size:12px">No hours in this period.</div>`:""}</div>
        ${waves.length>1?`<div class="ck-unit"><div class="ck-head"><h2>By wave</h2><span class="ck-meta">${esc(P.l)}</span></div>${waves.map(([w,h])=>`<div class="ef-brow"><span class="n">${esc(w)}</span><span class="v">${efFh(Math.round(h*10)/10)} h · ${efPct(h,tot)}%</span>${efBarDots(h,Math.max(...waves.map(x=>x[1]))/30,30,w.startsWith("◆")?"pen-5":"pen-2")}</div>`).join("")}</div>`:""}
      </div>
      <div class="ef-stack">
        <div class="ck-unit"><div class="ck-head"><h2>By activity</h2><span class="ck-meta">${efFh(Math.round(tot*10)/10)} h</span></div>${efActRows(es)}</div>
        <div class="ck-unit"><div class="ck-head"><h2>Epic-level entries</h2><span class="ck-meta">${lvl.length} · ${esc(P.l)}</span></div>
          ${lvl.slice().reverse().map(x=>`<div class="ef-de" data-id="${x.id}" style="--pen:var(--${EF_ACTC[x.activity]})"><i></i><div style="min-width:0"><span class="mono faint" style="font-size:10.5px">${efWdl(x.date)}</span><div>${x.note?linkify(x.note):`<span class="faint">(no details)</span>`}</div><div class="t"><span class="ef-tag" style="--pen:var(--${EF_ACTC[x.activity]})"><span class="ef-pd"></span>${esc(x.activity)}</span></div></div><div style="text-align:right"><span class="mono">${efFh(x.hours)} h</span><div class="ops"><button class="ghost sm" data-op="ed" title="Edit">✎</button><button class="ghost sm danger" data-op="rm" title="Delete">✕</button></div></div></div>`).join("")
            ||`<div class="faint" style="font-size:12px;line-height:1.55">Nothing logged on the epic itself in this period. A call about the epic, wave planning, chasing another team — log it in the box above.</div>`}</div>
      </div></div></div>`;
  const q=s=>body.querySelector(s),rr=()=>renderEpicEffort(body,e);
  body.querySelectorAll("#epP [data-m]").forEach(b=>b.onclick=()=>{epPer.mode=b.dataset.m;if(epPer.mode==="month"&&!epPer.month)epPer.month=todayStr().slice(0,7);rr();});
  if(q("#epPrev")){q("#epPrev").onclick=()=>{epPer.month=efMonthShift(epPer.month||todayStr().slice(0,7),-1);rr();};q("#epNext").onclick=()=>{epPer.month=efMonthShift(epPer.month||todayStr().slice(0,7),1);rr();};}
  if(q("#epFrom")){const ch=()=>{const f=q("#epFrom").value,t=q("#epTo").value;if(f&&t&&f<=t){epPer.from=f;epPer.to=t;rr();}};q("#epFrom").onchange=ch;q("#epTo").onchange=ch;}
  efMountComposer(q("#epQc"),{key:"e:"+e.id},x=>efAfterLog(x,false));
  body.querySelectorAll(".ep-go").forEach(r=>r.onclick=()=>{view="demands";activeId=r.dataset.id;activeTab="effort";renderApp();});
  body.querySelectorAll(".ef-de[data-id]").forEach(r=>{const x=state.efforts.find(y=>y.id===r.dataset.id);if(!x)return;r.querySelector('[data-op="ed"]').onclick=()=>efEdit(x);r.querySelector('[data-op="rm"]').onclick=()=>efDelete(x);});
  q("#epCopy").onclick=()=>{const head=["Demand","Title","Wave","Hours · "+P.l,"Hours · whole life","Estimate"];
    const rows=ts.map(t=>[t.demandId||"—",t.title,t.wave||"—",efFh(Math.round(efSum(onDem.filter(x=>x.taskId===t.id))*10)/10),efFh(Math.round(efSum(efFor(t.id))*10)/10),+t.estimate?efFh(+t.estimate):"—"]);
    rows.push(["◆","Epic-level work (calls, planning)","—",efFh(Math.round(efSum(lvl)*10)/10),efFh(Math.round(efSum(all.filter(x=>x.epicId))*10)/10),"—"],["","Total","",efFh(Math.round(tot*10)/10),efFh(Math.round(life*10)/10),estSum?efFh(estSum):"—"]);
    const html=`<p><b>◆ ${esc(epicLabel(e))} — hours, ${esc(P.l)}</b></p><table border="1" cellpadding="4" style="border-collapse:collapse"><tr>${head.map(h=>`<th>${esc(h)}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`;
    const text=[`◆ ${epicLabel(e)} — hours, ${P.l}`,head.join("\t"),...rows.map(r=>r.join("\t"))].join("\n");
    copyRich(html,text).then(()=>toast("Copied — paste into a mail or Excel")).catch(()=>toast("Copy failed",true));};
  const months=(()=>{const out=[];if(!all.length)return out;let m=all[0].date.slice(0,7);const end=todayStr().slice(0,7);while(m<=end&&out.length<60){const xs=all.filter(x=>x.date.slice(0,7)===m),by=new Map();xs.forEach(x=>{const k=x.epicId?"◆":x.taskId;by.set(k,(by.get(k)||0)+x.hours);});out.push({m,tot:efSum(xs),by});m=efMonthShift(m,1);}return out;})();
  efHover(DK.scope(q("#epMonths"),(c,w,h,tm,dt,s)=>{const C=efC(s.cv),n=Math.max(1,months.length),L=10,cw=(w-L*2)/n,y0=h-20,top=10,p=efEase(efProg(s,1000));s.hits=[];
    const maxH=Math.max(8,...months.map(x=>x.tot)),unit=maxH>160?8:maxH>80?4:maxH>40?2:1,pitch=Math.min(7,(y0-top)/Math.ceil(maxH/unit)),r=Math.min(2.6,pitch*.42,cw*.3);
    for(let x=L;x<=w-L;x+=5)efDot(c,x,y0+4,.6,C["ink-4"]);
    months.forEach((mo,i)=>{const xc=L+cw*i+cw/2,sel=epPer.mode==="month"&&epPer.month===mo.m,hov=s.hv&&s.hv.i===i;
      if(sel||hov){c.globalAlpha=1;c.fillStyle=C["paper-2"];c.fillRect(L+cw*i+1,2,cw-2,h-6);if(sel){c.globalAlpha=.8;c.fillStyle=C.ink;c.fillRect(L+cw*i+1,h-3,cw-2,2);}}
      let y=y0-pitch/2,j=0;const show=Math.ceil(mo.tot/unit*efEase(p*1.5-i/n*.5));
      [...mo.by.entries()].sort((a,b)=>(a[0]==="◆")-(b[0]==="◆")||b[1]-a[1]).forEach(([k,v])=>{const col=k==="◆"?C["pen-5"]:C[efPen(k)];for(let z=0;z<Math.round(v/unit);z++){if(j++>=show)return;efDot(c,xc,y,r,col,.9);y-=pitch;}});
      if(n<=24||i%2===0)efLabel(c,efFmt(mo.m+"-01",{month:"short"}).toUpperCase(),xc,h-9,{size:7.5,color:sel?C.ink:C["ink-3"]});
      s.hits.push({x:xc,y:h/2,rx:cw/2,ry:h/2,i,mo});});}),
    hit=>{const mo=hit.mo;return `<b>${efFmt(mo.m+"-01",{month:"long",year:"numeric"})}</b> · ${efFh(Math.round(mo.tot*10)/10)} h`+[...mo.by.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>{const t=k==="◆"?null:rvTask(k);return `<div class="r" style="--pen:var(--${k==="◆"?"pen-5":efPen(k)})"><i></i><span>${k==="◆"?"◆ Epic-level work":esc(t?(demandLabel(t)):"(deleted demand)")}</span><span>${efFh(Math.round(v*10)/10)}</span></div>`;}).join("")+`<div class="hint">click to see this month</div>`;},
    hit=>{epPer={...epPer,mode:"month",month:hit.mo.m};rr();});}
/* a demand's hours split by round (Effort tab) */
function efRoundRows(t,es){const n=roundCount(t),st=roundStarts(t),ests=roundEstimates(t),rows=[];
  for(let r=1;r<=n;r++)rows.push({r,h:efSum(es.filter(e=>roundOn(t,e.date)===r)),from:st[r-1],est:ests[r-1]});const mx=Math.max(1,...rows.map(x=>x.h));
  return `<div class="ck-unit"><div class="ck-head"><h2>By round</h2><span class="ck-meta">a new round starts when the requirement changed</span></div>${rows.map(x=>`<div class="ef-brow"><span class="n"><span class="ef-pd" style="--pen:var(--${x.r>1?"pen-5":"pen-2"})"></span><b>Round ${x.r}</b> <span class="faint">from ${efSh(x.from)}</span></span><span class="v">${efFh(Math.round(x.h*10)/10)} h${x.est?" / "+efFh(x.est)+" h est":""}</span>${efBarDots(x.h,mx/30,30,x.r>1?"pen-5":"pen-2")}</div>`).join("")}</div>`;}
/* the Effort page's range as day offsets: rolling weeks, a calendar month, or custom dates */
function efRange(){const rg=efRg(),t=todayStr();
  if(rg==="mo"){let m=viewPref("ef.month",t.slice(0,7));if(!/^\d{4}-\d\d$/.test(m))m=t.slice(0,7);const from=m+"-01",to=efMonthEnd(m);return {rg,a:daysUntil(from),b:daysUntil(to),l:efFmt(from,{month:"long",year:"numeric"}),from,to};}
  if(rg==="cu"){const f=viewPref("ef.from",""),to=viewPref("ef.to","");if(f&&to&&f<=to)return {rg,a:daysUntil(f),b:daysUntil(to),l:"Custom",from:f,to};const a=efMonOff(0)-12*7;return {rg,a,b:0,l:"Custom",from:efOffD(a),to:t};}
  const a=efMonOff(0)-(EF_RNG[rg].weeks-1)*7;return {rg,a,b:0,l:EF_RNG[rg].l,from:efOffD(a),to:t};}

