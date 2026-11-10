/* ===================== REVIEW — your year, for the appraisal =====================
   Everything is worked out from what's already here: demands delivered in the period
   (first move to Delivered), hours logged, rework and on-time rates against the period
   before, epics and your role in them, requestors, learning — plus WINS: the small
   things you'd otherwise forget by review time. state.wins=[{id,date,kind,text,taskId}];
   state.reviewNotes={"<from>_<to>": your own summary}; t.star features a demand. */
const WIN_KINDS={thanks:{l:"Appreciation",icon:"🙏",pen:"pen-3"},delivery:{l:"Delivery",icon:"🚀",pen:"pen-2"},rescue:{l:"Rescue / fix",icon:"🧯",pen:"pen-1"},
  mentor:{l:"Helped / taught",icon:"🎓",pen:"pen-5"},improve:{l:"Improvement",icon:"💡",pen:"pen-4"},other:{l:"Other",icon:"⭐",pen:"ink-3"}};
function normWin(x){x=x||{};return{id:x.id||uid(),date:/^\d{4}-\d\d-\d\d$/.test(x.date||"")?x.date:todayStr(),kind:WIN_KINDS[x.kind]?x.kind:"other",text:String(x.text||"").trim(),taskId:x.taskId||"",createdAt:x.createdAt||Date.now()};}
const rvList=a=>a.length<=1?(a[0]||""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
const rvTask=id=>id?state.tasks.find(t=>t.id===id)||null:null;
const rvLong=d=>efFmt(d,{day:"numeric",month:"short",year:"numeric"});
/* periods: Indian financial year (Apr–Mar) first — the usual appraisal cycle */
function rvPeriods(){const t=todayStr(),y=+t.slice(0,4),m=+t.slice(5,7),fy=m>=4?y:y-1,s2=n=>String(n).slice(2);
  return {fy:{l:`FY ${fy}–${s2(fy+1)}`,from:`${fy}-04-01`,to:`${fy+1}-03-31`},lfy:{l:`FY ${fy-1}–${s2(fy)}`,from:`${fy-1}-04-01`,to:`${fy}-03-31`},
    cy:{l:String(y),from:`${y}-01-01`,to:`${y}-12-31`},ly:{l:String(y-1),from:`${y-1}-01-01`,to:`${y-1}-12-31`},l12:{l:"Last 12 months",from:efAdd(t,-364),to:t}};}
function rvPeriod(){const P=rvPeriods(),k=viewPref("rv.period","fy");
  if(k==="custom"){const f=viewPref("rv.from",""),to=viewPref("rv.to","");if(f&&to&&f<=to)return{k,l:`${rvLong(f)} – ${rvLong(to)}`,from:f,to};}
  return P[k]?{k,...P[k]}:{k:"fy",...P.fy};}
const rvFirstDelivered=t=>{const d=deliveredDates(t);return d.length?d.slice().sort()[0]:"";};
function rvStats(from,to){const end=to>todayStr()?todayStr():to,inP=d=>d&&d>=from&&d<=to;
  /* a delivery = the first move to Delivered in each round, so a demand re-delivered after a changed requirement counts again */
  const del=state.tasks.flatMap(t=>roundDeliveries(t).filter(x=>inP(x.d)).map(x=>({t,d:x.d,r:x.r,from:x.from}))).sort((a,b)=>a.d.localeCompare(b.d));
  const ef=state.efforts.filter(e=>inP(e.date)),hours=efSum(ef),dem=efSum(ef.filter(e=>e.taskId||e.epicId));
  const hoursOf=id=>efSum(ef.filter(e=>e.taskId===id));
  const dts=[...new Set(del.map(x=>x.t))],rw=dts.filter(t=>reworkCount(t)>0).length,withDue=del.filter(x=>x.t.dueDate&&x.r===roundCount(x.t)),onTime=withDue.filter(x=>x.d<=x.t.dueDate).length;
  const leads=del.filter(x=>x.from&&x.from<=x.d).map(x=>Math.round((new Date(x.d+"T00:00:00")-new Date(x.from+"T00:00:00"))/864e5));
  const worked=new Set([...del.map(x=>x.t.id),...ef.filter(e=>e.taskId&&rvTask(e.taskId)).map(e=>e.taskId)]);
  const epics=[...new Set([...[...worked].map(id=>(rvTask(id)||{}).epicId),...ef.map(e=>e.epicId)].filter(Boolean))].map(epicById).filter(Boolean);
  const learn=ef.filter(e=>e.bucket==="lrn"||e.activity==="Learning");
  return {from,to,end,del,ef,hours,dem,hoursOf,rw,rwPct:dts.length?Math.round(rw/dts.length*100):null,onTime,withDue:withDue.length,onTimePct:withDue.length?Math.round(onTime/withDue.length*100):null,
    avgLead:leads.length?Math.round(leads.reduce((a,b)=>a+b,0)/leads.length):null,wins:state.wins.filter(w=>inP(w.date)).sort((a,b)=>a.date.localeCompare(b.date)),worked,epics,
    reqs:[...new Set(del.map(x=>x.t.requestor).filter(Boolean))],themes:[...new Set(del.map(x=>x.t.theme).filter(Boolean))],
    objects:[...new Set(del.flatMap(x=>x.t.objects.map(o=>o.name)).filter(Boolean))],meetings:state.meetings.filter(m=>inP(m.date)),learn,
    lessons:state.tasks.flatMap(t=>(t.lessons||[]).filter(l=>inP(l.date)).map(l=>({t,l}))),
    jobs:state.jobs.filter(j=>j.status==="done"&&inP(j.closedOn)).sort((a,b)=>a.closedOn.localeCompare(b.closedOn)),
    changes:state.tasks.flatMap(t=>changeEvents(t).filter(e=>inP(isoTs(e.ts))).map(e=>({t,e}))),chH:efSum(ef.filter(e=>{const t=rvTask(e.taskId);return t&&roundOn(t,e.date)>1;})),
    topics:[...new Set(learn.map(e=>e.note.trim()).filter(Boolean))].slice(0,4)};}
function rvPrev(from,to){const n=Math.round((new Date(to+"T00:00:00")-new Date(from+"T00:00:00"))/864e5),pto=efAdd(from,-1);return rvStats(efAdd(pto,-n),pto);}
/* what to put first: demands you starred, then where your hours went, then the most objects */
function rvHighlights(S){return [...S.worked].map(rvTask).filter(Boolean).sort((a,b)=>((b.star?1e6:0)+S.hoursOf(b.id)*10+b.objects.length)-((a.star?1e6:0)+S.hoursOf(a.id)*10+a.objects.length)).slice(0,6);}
const rvNoteKey=P=>P.from+"_"+P.to;
function rvDraft(P,S,R){const o=[],n=S.del.length;
  o.push(`${S.end<S.to?"So far in":"In"} ${P.l} I delivered ${n} demand${n===1?"":"s"}${S.themes.length?` across ${rvList(S.themes)}`:""}${S.reqs.length?` for ${S.reqs.length} requestor${S.reqs.length===1?"":"s"}`:""}.`);
  const hl=rvHighlights(S).slice(0,3);if(hl.length)o.push(`The biggest pieces of work were ${rvList(hl.map(t=>t.title))}.`);
  const lead=S.epics.filter(e=>e.role==="lead").map(e=>e.code||e.name),con=S.epics.filter(e=>e.role!=="lead").map(e=>e.code||e.name);
  if(lead.length)o.push(`I led ${rvList(lead)}${con.length?` and contributed to ${rvList(con)}`:""}.`);else if(con.length)o.push(`I contributed to ${rvList(con)}.`);
  if(S.hours)o.push(`I logged ${efFh(Math.round(S.hours))} hours, ${efPct(S.dem,S.hours)}% of it on demand work.`);
  if(S.changes.length)o.push(`When requirements changed after delivery (${S.changes.length} time${S.changes.length===1?"":"s"}), I took the work back up${S.chH?` — ${efFh(Math.round(S.chH*10)/10)} hours on the changed requirements`:""}.`);
  if(S.rwPct!=null)o.push(`${S.rwPct}% of deliveries needed rework${R.rwPct!=null?` (${R.rwPct}% the period before)`:""}${S.onTimePct!=null?`, and ${S.onTimePct}% landed on or before their due date`:""}.`);
  if(S.learn.length)o.push(`I spent ${efFh(Math.round(efSum(S.learn)))} hours learning${S.topics.length?` — ${rvList(S.topics)}`:""}.`);
  if(S.wins.length)o.push(`Along the way: ${S.wins.slice(0,3).map(w=>w.text.replace(/[.\s]+$/,"")).join("; ")}.`);
  return o.join(" ");}
/* the document — the same content as HTML (screen, print, rich copy) and Markdown */
function rvDoc(P,S,R,note){const H=[],M=[],md=x=>String(x??"").replace(/\|/g,"\\|").replace(/\n/g," "),dl=t=>(t.demandId?t.demandId+" — ":"")+t.title;
  const list=(label,items)=>{if(!items.length)return;H.push(`<h3>${esc(label)}</h3><ul>${items.map(x=>`<li>${x.h}</li>`).join("")}</ul>`);M.push(`## ${label}`,``,...items.map(x=>"- "+x.m),``);};
  const table=(label,head,rows)=>{if(!rows.length)return;H.push(`<h3>${esc(label)}</h3><table><tr>${head.map(h=>`<th>${esc(h)}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>`);
    M.push(`## ${label}`,``,`| ${head.join(" | ")} |`,`|${head.map(()=>"---").join("|")}|`,...rows.map(r=>`| ${r.map(md).join(" | ")} |`),``);};
  const sofar=S.end<S.to?" (so far)":"",cmp=(a,b,unit,better)=>b==null||a==null?"":` — ${a===b?"same as":a<b===(better==="low")?"better than":"against"} ${b}${unit} the period before`;
  H.push(`<h1>Year in review · ${esc(P.l)}</h1><p class="meta"><b>Period:</b> ${rvLong(S.from)} – ${rvLong(S.to)}${sofar} &nbsp;|&nbsp; <b>Prepared:</b> ${rvLong(todayStr())}</p>`);
  M.push(`# Year in review · ${P.l}`,``,`**Period:** ${rvLong(S.from)} – ${rvLong(S.to)}${sofar} | **Prepared:** ${rvLong(todayStr())}`,``);
  if(note&&note.trim()){H.push(`<div class="note">${esc(note.trim()).replace(/\n/g,"<br>")}</div>`);M.push(note.trim(),``);}
  const g=[];const add=(h,m)=>g.push({h,m:m||h.replace(/<[^>]+>/g,"")});
  add(`<b>${S.del.length}</b> demand${S.del.length===1?"":"s"} delivered${S.epics.length?` across ${S.epics.length} epic${S.epics.length===1?"":"s"}`:""}${S.themes.length?` · ${esc(S.themes.join(", "))}`:""}`);
  if(S.hours)add(`<b>${efFh(Math.round(S.hours))} h</b> logged — ${efPct(S.dem,S.hours)}% on demand work`);
  if(S.rwPct!=null)add(`<b>${S.rwPct}%</b> of delivered demands needed rework${cmp(S.rwPct,R.rwPct,"%","low")}`);
  if(S.changes.length)add(`<b>${S.changes.length}</b> requirement change${S.changes.length===1?"":"s"} absorbed after delivery${S.chH?` — ${efFh(Math.round(S.chH*10)/10)} h of work on changed requirements, not counted as rework`:""}`);
  if(S.onTimePct!=null)add(`<b>${S.onTimePct}%</b> delivered on or before the due date (${S.onTime} of ${S.withDue})`);
  if(S.avgLead!=null)add(`<b>${S.avgLead} days</b> on average from request to delivery${cmp(S.avgLead,R.avgLead," days","low")}`);
  if(S.reqs.length)add(`Work for <b>${S.reqs.length}</b> requestor${S.reqs.length===1?"":"s"}: ${esc(S.reqs.join(", "))}`);
  if(S.objects.length)add(`<b>${S.objects.length}</b> object${S.objects.length===1?"":"s"} created or changed in delivered demands`);
  if(S.learn.length)add(`<b>${efFh(Math.round(efSum(S.learn)))} h</b> learning${S.topics.length?` — ${esc(rvList(S.topics))}`:""}`);
  if(S.jobs.length){const wd=S.jobs.filter(j=>j.due),ok=wd.filter(j=>jobTiming(j).ok).length;add(`<b>${S.jobs.length}</b> other task${S.jobs.length===1?"":"s"} handled outside demands${wd.length?` — ${ok} of ${wd.length} answered by the date expected`:""}`);}
  if(S.meetings.length)add(`<b>${S.meetings.length}</b> meeting${S.meetings.length===1?"":"s"} noted`);
  if(S.wins.length)add(`<b>${S.wins.length}</b> win${S.wins.length===1?"":"s"} noted`);
  if(S.lessons.length)add(`<b>${S.lessons.length}</b> lesson${S.lessons.length===1?"":"s"} written down`);
  list("At a glance",g);
  list("Highlights",rvHighlights(S).map(t=>{const ep=epicById(t.epicId),d=rvFirstDelivered(t),h=S.hoursOf(t.id);
    const meta=[ep?"◆ "+(ep.code||ep.name):"",t.theme,d&&d>=S.from&&d<=S.to?"delivered "+rvLong(d):STATUS[t.status].label.toLowerCase(),h?efFh(Math.round(h))+" h":"",t.objects.length?t.objects.length+" object"+(t.objects.length===1?"":"s"):"",reworkCount(t)?"reworked":""].filter(Boolean).join(" · ");
    const desc=(t.description||"").replace(/\s+/g," ").trim(),short=desc.length>200?desc.slice(0,197)+"…":desc;
    return {h:`<b>${esc(dl(t))}</b> <span class="meta">(${esc(meta)})</span>${short?`<br>${esc(short)}`:""}`,m:`**${dl(t)}** (${meta})${short?" — "+short:""}`};}));
  if(S.wins.length){H.push(`<h3>Wins</h3>`);M.push(`## Wins`,``);
    Object.entries(WIN_KINDS).forEach(([k,v])=>{const ws=S.wins.filter(w=>w.kind===k);if(!ws.length)return;
      H.push(`<p><b>${v.icon} ${v.l}</b></p><ul>${ws.map(w=>{const t=rvTask(w.taskId);return `<li>${rvLong(w.date)} — ${esc(w.text)}${t?` <span class="meta">(${esc(demandLabel(t))})</span>`:""}</li>`;}).join("")}</ul>`);
      M.push(`**${v.icon} ${v.l}**`,``,...ws.map(w=>{const t=rvTask(w.taskId);return `- ${rvLong(w.date)} — ${w.text}${t?` (${demandLabel(t)})`:""}`;}),``);});}
  list("Lessons learned",S.lessons.map(({t,l})=>({h:`${esc(l.text).replace(/\n/g,"<br>")} <span class="meta">(${esc(demandLabel(t))} · ${rvLong(l.date)})</span>`,m:`${l.text.replace(/\n/g," ")} (${demandLabel(t)} · ${rvLong(l.date)})`})));
  table("Epics",["Epic","My role","My part","Delivered in period","Hours"],S.epics.map(e=>{const ts=tasksForEpic(e.id);
    return [epicLabel(e),e.role==="lead"?"Lead":"Contributor",e.myScope||"—",String(S.del.filter(x=>x.t.epicId===e.id).length)+" of "+ts.length,efFh(Math.round(ts.reduce((a,t)=>a+S.hoursOf(t.id),0)+efSum(S.ef.filter(x=>x.epicId===e.id))))||"0"];}));
  table("Delivered",["Demand","Title","Type","Theme","Requestor","Delivered","Days","Hours","Notes"],S.del.map(({t,d,r,from})=>{
    const lead=from&&from<=d?String(Math.round((new Date(d+"T00:00:00")-new Date(from+"T00:00:00"))/864e5)):"—",h=efSum(efFor(t.id));
    return [t.demandId||"—",t.title+(r>1?` (round ${r})`:""),t.type,t.theme||"—",t.requestor||"—",d,lead,h?efFh(Math.round(h*10)/10):"—",[r>1?"after a requirement change":"",reworkCount(t)?"reworked":"",t.dueDate&&d>t.dueDate&&r===roundCount(t)?"after due date":""].filter(Boolean).join(", ")||"—"];}));
  table("Other tasks handled",["Task","Asked by","Received","Closed","Expected by","Timing","Hours"],S.jobs.map(j=>{const tm=jobTiming(j),h=jobHours(j);
    return [j.title,j.askedBy||"—",j.received,j.closedOn,j.due||"—",tm?tm.txt:"—",h?efFh(Math.round(h*10)/10):"—"];}));
  if(S.hours){const by=(f)=>{const m=new Map();S.ef.forEach(e=>{const k=f(e);if(k)m.set(k,(m.get(k)||0)+e.hours);});return [...m.entries()].sort((a,b)=>b[1]-a[1]);};
    const fmt=a=>a.map(([k,h])=>({h:`${esc(k)} — ${efFh(Math.round(h))} h (${efPct(h,S.hours)}%)`,m:`${k} — ${efFh(Math.round(h))} h (${efPct(h,S.hours)}%)`}));
    list("Where the time went — by theme",fmt(by(e=>{const t=rvTask(e.taskId);return e.taskId?(t&&t.theme)||"No theme":e.epicId?"◆ Epic-level work":e.jobId?"Other tasks":"Not demand work";})));
    list("Where the time went — by activity",fmt(by(e=>e.activity)));}
  if(!S.del.length&&!S.hours&&!S.wins.length){H.push(`<p><i>Nothing delivered, logged or noted in this period yet.</i></p>`);M.push(`_Nothing delivered, logged or noted in this period yet._`);}
  return {html:H.join(""),md:M.join("\n")};}
/* ---------- the workspace ---------- */
let RVS=null;
function renderReview(){const host=document.getElementById("detail");efHideTip();
  const P=rvPeriod(),S=rvStats(P.from,P.to),R=rvPrev(P.from,P.to),key=rvNoteKey(P),note=(state.reviewNotes||{})[key]||"";RVS={P,S,R};
  const delta=(a,b,unit,low)=>a==null||b==null?"":`<small class="${(a<=b)===low?"ef-good":"ef-bad"}">${a===b?"=":(a<b?"▼":"▲")} ${b}${unit} before</small>`;
  const hl=new Set(rvHighlights(S).map(t=>t.id));
  host.innerHTML=`<div class="efx ef-ws rv">
    <div class="ef-wsh"><div><div class="ef-l1">🏆 Review · ${esc(P.l)} · ${rvLong(S.from)} – ${rvLong(S.to)}${S.end<S.to?" · so far":""}</div><h1>Your year in review</h1></div>
      <div class="ef-ctl"><div class="ef-sg" id="rvP"><span class="cap">Period</span>${Object.entries(rvPeriods()).map(([k,v])=>`<button data-k="${k}" class="${k===P.k?"on":""}">${esc(v.l)}</button>`).join("")}<button data-k="custom" class="${P.k==="custom"?"on":""}">Custom</button></div>
        ${P.k==="custom"?`<span class="ef-row"><input type="date" id="rvFrom" value="${P.from}" style="width:150px"><span class="faint">–</span><input type="date" id="rvTo" value="${P.to}" style="width:150px"></span>`:""}</div></div>
    <div class="ef-ctl"><button class="sm" id="rvWin">🏆 Note a win</button><span style="flex:1"></span><button class="sm" id="rvCopy" title="Formatted — paste into Word, Outlook or your appraisal form">⧉ Copy</button><button class="sm" id="rvMd" title="Markdown file">⬇ .md</button><button class="sm primary" id="rvPrint" title="Print, or choose 'Save as PDF'">🖨 Print / PDF</button></div>
    ${roHTML([{k:"Delivered",v:U(S.del.length,"demand"+(S.del.length===1?"":"s"))},
      {k:"Hours logged",v:S.hours?U(efFh(Math.round(S.hours)),"h"):"—"},
      {k:"Rework",v:S.rwPct==null?"—":`${S.rwPct}<small>%</small>${delta(S.rwPct,R.rwPct,"%",true)}`,cls:S.rwPct?"":""},
      {k:"On time",v:S.onTimePct==null?"—":U(S.onTimePct,"% of "+S.withDue)},
      {k:"Request → delivery",v:S.avgLead==null?"—":`${S.avgLead}<small>days</small>${delta(S.avgLead,R.avgLead," d",true)}`},
      {k:"Wins",v:U(S.wins.length,"noted")},
      {k:"Other tasks",v:U(S.jobs.length,"handled")}])}
    <div class="ck-unit"><div class="ck-head"><h2>My summary</h2><span class="ck-meta">saved with this period · opens the document</span></div>
      <textarea id="rvNote" rows="4" placeholder="In your own words — what this year was about, what you're proud of, what you'd like next. Or start from a draft written from your data.">${esc(note)}</textarea>
      <div class="ef-foot" style="margin-top:8px"><span class="faint" style="font-size:11px">The draft only uses what's in this file. Make it yours before you send it.</span><button class="sm" id="rvDraft">✍ Draft one from my data</button></div></div>
    <div class="ef-gw">
      <div class="ef-stack">
        <div class="ck-unit"><div class="ck-head"><h2>Month by month</h2><span class="ck-meta">● delivered · ▮ hours logged · ◆ wins</span></div><canvas class="rv-months" id="rvMonths" data-still="2000"></canvas></div>
        <div class="ck-unit"><div class="ck-head"><h2>Delivered</h2><span class="ck-meta">${S.del.length} · ★ to feature a demand in Highlights</span></div>
          ${S.del.length?S.del.map(({t,d,r})=>{const h=efSum(efFor(t.id));return `<div class="rv-row ${hl.has(t.id)?"hl":""}" data-id="${t.id}"><button class="rv-star ${t.star?"on":""}" data-star="${t.id}" title="${t.star?"Featured — click to stop featuring":"Feature this in Highlights"}">★</button><span class="mono">${esc(t.demandId||"—")}</span><a href="#" class="t" data-go="${t.id}">${esc(t.title)}</a><span class="mono faint">${efSh(d)}</span><span class="mono">${h?efFh(Math.round(h))+" h":""}</span><span class="fl">${r>1?`<span class="ef-tag" style="--pen:var(--pen-5)">round ${r}</span>`:""}${reworkCount(t)?`<span class="ef-tag" style="--pen:var(--bad)">↻</span>`:""}${t.dueDate&&d>t.dueDate?`<span class="ef-tag" style="--pen:var(--watch)">late</span>`:""}</span></div>`;}).join(""):`<div class="faint" style="font-size:12px">Nothing delivered in this period yet.</div>`}</div>
      </div>
      <div class="ef-stack">
        <div class="ck-unit"><div class="ck-head"><h2>Wins</h2><span class="ck-meta">${S.wins.length} · press W anywhere</span></div>
          ${S.wins.length?S.wins.slice().reverse().map(w=>{const t=rvTask(w.taskId),k=WIN_KINDS[w.kind];return `<div class="rv-win" style="--pen:var(--${k.pen})"><span class="ic" title="${k.l}">${k.icon}</span><div style="min-width:0"><div>${linkify(w.text)}</div><div class="m">${rvLong(w.date)} · ${k.l}${t?` · ${esc(demandLabel(t))}`:""}</div></div><span class="ops"><button class="ghost sm" data-wed="${w.id}" title="Edit">✎</button><button class="ghost sm danger" data-wrm="${w.id}" title="Delete">✕</button></span></div>`;}).join("")
            :`<div class="faint" style="font-size:12px;line-height:1.55">No wins noted in this period. A thank-you mail, a clean go-live, a colleague you helped — note them as they happen; they're the first thing you forget.</div>`}
          <button class="sm" id="rvWin2" style="margin-top:10px">＋ Note a win</button></div>
        <div class="ck-unit"><div class="ck-head"><h2>Where the time went</h2><span class="ck-meta">${S.hours?efFh(Math.round(S.hours))+" h":"no hours logged"}</span></div>${rvTimeRows(S)}</div>
      </div></div>
    <div class="ck-unit"><div class="ck-head"><h2>The document</h2><span class="ck-meta">what Copy, .md and Print give you</span></div><div class="specpaper specdoc" id="rvDoc">${rvDoc(P,S,R,note).html}</div></div>
  </div>`;
  const q=s=>host.querySelector(s),doc=()=>rvDoc(P,S,R,(state.reviewNotes||{})[key]||"");
  host.querySelectorAll("#rvP button").forEach(b=>b.onclick=()=>{setViewPref("rv.period",b.dataset.k);if(b.dataset.k==="custom"&&!viewPref("rv.from","")){setViewPref("rv.from",P.from);setViewPref("rv.to",P.to);}renderReview();});
  if(q("#rvFrom")){const ch=()=>{const f=q("#rvFrom").value,t=q("#rvTo").value;if(f&&t&&f<=t){setViewPref("rv.from",f);setViewPref("rv.to",t);renderReview();}};q("#rvFrom").onchange=ch;q("#rvTo").onchange=ch;}
  q("#rvWin").onclick=q("#rvWin2").onclick=()=>openWin();
  const nt=q("#rvNote");
  nt.oninput=()=>{q("#rvDoc").innerHTML=rvDoc(P,S,R,nt.value).html;};
  nt.onchange=()=>{const N=state.reviewNotes||(state.reviewNotes={});if(nt.value.trim())N[key]=nt.value;else delete N[key];markDirty();};
  q("#rvDraft").onclick=()=>{const d=rvDraft(P,S,R);nt.value=nt.value.trim()?nt.value.replace(/\s+$/,"")+"\n\n"+d:d;nt.dispatchEvent(new Event("input"));nt.dispatchEvent(new Event("change"));nt.focus();toast("Draft added — now make it yours");};
  q("#rvCopy").onclick=()=>{const x=doc();copyRich(x.html,x.md).then(()=>toast("Copied — paste into Word, Outlook or your appraisal form")).catch(()=>toast("Copy failed",true));};
  q("#rvMd").onclick=()=>{const b=new Blob([doc().md],{type:"text/markdown"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="review-"+P.l.replace(/[^\w–-]+/g,"-")+".md";a.click();URL.revokeObjectURL(a.href);};
  q("#rvPrint").onclick=()=>{flushEdits();const pa=document.getElementById("printArea");pa.className="specdoc";pa.innerHTML=doc().html;window.print();};
  host.querySelectorAll("[data-star]").forEach(b=>b.onclick=()=>{const t=rvTask(b.dataset.star);if(!t)return;t.star=!t.star;touch(t);renderReview();toast(t.star?"★ Featured in Highlights":"No longer featured");});
  host.querySelectorAll("[data-go]").forEach(a=>a.onclick=e=>{e.preventDefault();view="demands";activeId=a.dataset.go;activeTab="overview";renderApp();});
  host.querySelectorAll("[data-wed]").forEach(b=>b.onclick=()=>openWin({editId:b.dataset.wed}));
  host.querySelectorAll("[data-wrm]").forEach(b=>b.onclick=()=>{const w=state.wins.find(x=>x.id===b.dataset.wrm);if(!w)return;const i=state.wins.indexOf(w);state.wins.splice(i,1);markDirty();renderApp();
    efToastUndo("Win deleted",()=>{state.wins.splice(Math.min(i,state.wins.length),0,w);markDirty();renderApp();});});
  efHover(DK.scope(q("#rvMonths"),rvMonthsDraw),rvMonthsTip);}
function rvTimeRows(S){if(!S.hours)return `<div class="faint" style="font-size:12px;line-height:1.55">Log hours (⏱ or T) and this shows where your time went — by theme and by activity.</div>`;
  const by=f=>{const m=new Map();S.ef.forEach(e=>{const k=f(e);m.set(k,(m.get(k)||0)+e.hours);});return [...m.entries()].sort((a,b)=>b[1]-a[1]);};
  const th=by(e=>{const t=rvTask(e.taskId);return e.taskId?(t&&t.theme)||"No theme":e.epicId?"◆ Epic-level work":e.jobId?"Other tasks":"Not demand work";}),ac=by(e=>e.activity),mx=Math.max(...th.map(x=>x[1]),...ac.map(x=>x[1]),1);
  const row=(k,h,pen)=>`<div class="ef-brow"><span class="n"><span class="ef-pd" style="--pen:var(--${pen})"></span>${esc(k)}</span><span class="v">${efFh(Math.round(h))} h · ${efPct(h,S.hours)}%</span>${efBarDots(h,mx/30,30,pen)}</div>`;
  return `<div class="ef-lb" style="margin-top:2px">By theme</div>${th.map(([k,h])=>row(k,h,k==="Not demand work"?"ink-3":k==="◆ Epic-level work"?"pen-5":k==="Other tasks"?"pen-7":efThemePen(k))).join("")}<div class="ef-lb" style="margin-top:12px">By activity</div>${ac.map(([k,h])=>row(k,h,EF_ACTC[k]||"ink-3")).join("")}`;}
/* month by month: hours as a dot column, delivered demands as big dots beside it, wins as diamonds on top */
function rvMonths(S){const out=[];let d=S.from.slice(0,7)+"-01";while(d<=S.to&&out.length<36){const m=d.slice(0,7),nx=efAdd(efAdd(d,32).slice(0,7)+"-01",0);
  out.push({m,d,fut:d>todayStr(),hours:efSum(S.ef.filter(e=>e.date.slice(0,7)===m)),del:S.del.filter(x=>x.d.slice(0,7)===m),wins:S.wins.filter(w=>w.date.slice(0,7)===m)});d=nx;}return out;}
function rvMonthsDraw(c,w,h,tm,dt,s){const C=efC(s.cv),M=RVS?rvMonths(RVS.S):[],n=Math.max(1,M.length),L=10,cw=(w-L*2)/n,y0=h-20,top=26,p=efEase(efProg(s,1100));s.hits=[];
  const maxH=Math.max(40,...M.map(x=>x.hours)),unit=maxH>200?10:maxH>80?5:2,maxDots=Math.ceil(maxH/unit),pitch=Math.min(6,(y0-top)/Math.max(maxDots,1)),maxDel=Math.max(4,...M.map(x=>x.del.length)),dp=Math.min(9,(y0-top)/maxDel);
  for(let x=L;x<=w-L;x+=5)efDot(c,x,y0+4,.6,C["ink-4"]);
  M.forEach((mo,i)=>{const xc=L+cw*i+cw/2,hov=s.hv&&s.hv.i===i,g=efEase(p*1.4-i/n*.4);
    if(hov){c.globalAlpha=1;c.fillStyle=C["paper-2"];c.fillRect(L+cw*i+1,4,cw-2,h-8);}
    const nh=Math.round(mo.hours/unit*g);for(let j=0;j<nh;j++)efDot(c,xc-5,y0-pitch/2-j*pitch,Math.min(2,pitch*.4),C["pen-2"],mo.fut?.25:.7);
    mo.del.forEach((x,j)=>{if(j/Math.max(1,mo.del.length)>g)return;efDot(c,xc+5,y0-dp/2-j*dp,Math.min(3.4,dp*.42),x.t.star?C["pen-4"]:C.good,.95);});
    mo.wins.forEach((x,j)=>{const xx=xc-((mo.wins.length-1)*7)/2+j*7,yy=12;c.globalAlpha=.9;c.fillStyle=C[WIN_KINDS[x.kind].pen]||C["pen-5"];c.beginPath();c.moveTo(xx,yy-3.5);c.lineTo(xx+3.5,yy);c.lineTo(xx,yy+3.5);c.lineTo(xx-3.5,yy);c.closePath();c.fill();});
    efLabel(c,efFmt(mo.d,{month:"short"}).toUpperCase(),xc,h-7,{size:7.5,color:mo.d.slice(0,7)===todayStr().slice(0,7)?C.ink:C["ink-3"]});
    s.hits.push({x:xc,y:h/2,rx:cw/2,ry:h/2,i,mo});});}
function rvMonthsTip(hit){const mo=hit.mo;return `<b>${efFmt(mo.d,{month:"long",year:"numeric"})}</b>${mo.fut?" · still to come":""}<div>${efFh(Math.round(mo.hours))} h logged · ${mo.del.length} delivered · ${mo.wins.length} win${mo.wins.length===1?"":"s"}</div>`+
  mo.del.map(x=>`<div class="r" style="--pen:var(--good)"><i></i><span>${esc(x.t.demandId||"")} ${esc(x.t.title)}</span><span>${efSh(x.d)}</span></div>`).join("")+
  mo.wins.map(x=>`<div class="r" style="--pen:var(--${WIN_KINDS[x.kind].pen})"><i></i><span>${WIN_KINDS[x.kind].icon} ${esc(x.text)}</span><span>${efSh(x.date)}</span></div>`).join("");}
/* ---------- noting a win ---------- */
function openWin(o={}){const root=document.getElementById("modalRoot"),w=o.editId?state.wins.find(x=>x.id===o.editId):null,st={kind:w?w.kind:(o.kind||"thanks")};
  const tid=w?w.taskId:(o.taskId||"");
  root.innerHTML=`<div class="modal-bg"><div class="modal efx ef-modal"><h2>${w?"✎ Edit win":"🏆 Note a win"}</h2>
    <p class="faint" style="font-size:12px;margin-top:-6px;line-height:1.5">The small things you forget by appraisal time — a thank-you, a clean go-live, a bug you rescued, something you taught a colleague. They go into your year in review.</p>
    <div class="ef-qc">
      <div class="ef-qrow"><div><span class="ef-lb">When</span><input type="date" id="wnDate" max="${todayStr()}" value="${w?w.date:(o.date||todayStr())}" style="width:150px"></div>
        <div><span class="ef-lb">Kind</span><div class="ef-row">${Object.entries(WIN_KINDS).map(([k,v])=>`<button class="ef-chip ${k===st.kind?"on":""}" data-kind="${k}" style="--pen:var(--${v.pen})">${v.icon} ${v.l}</button>`).join("")}</div></div></div>
      <div><span class="ef-lb">What happened</span><textarea id="wnText" rows="3" placeholder="e.g. Priya thanked the team for getting the ageing report out before month-end close">${esc(w?w.text:"")}</textarea></div>
      <div><span class="ef-lb">Linked demand · optional</span><select id="wnTask"><option value="">—</option>${state.tasks.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(t=>`<option value="${t.id}" ${t.id===tid?"selected":""}>${esc(t.demandId?t.demandId+" — "+t.title:t.title)}</option>`).join("")}</select></div>
      <div class="ef-foot"><span class="ef-dsf faint">Ctrl+Enter saves</span>${w?`<button class="ghost danger" id="wnDel">Delete</button>`:""}<button class="ghost" id="wnCancel">Cancel</button><button class="primary" id="wnSave">${w?"Save":"Note it"}</button></div></div></div></div>`;
  const q=s=>root.querySelector(s),bg=q(".modal-bg"),close=()=>{root.innerHTML="";};
  bg.onclick=e=>{if(e.target===bg)close();};q("#wnCancel").onclick=close;
  root.querySelectorAll("[data-kind]").forEach(b=>b.onclick=()=>{st.kind=b.dataset.kind;root.querySelectorAll("[data-kind]").forEach(x=>x.classList.toggle("on",x===b));});
  const save=()=>{const text=q("#wnText").value.trim(),date=q("#wnDate").value||todayStr();
    if(!text){const ta=q("#wnText");ta.classList.remove("ef-shake");void ta.offsetWidth;ta.classList.add("ef-shake");ta.focus();toast("What happened?",true);return;}
    if(date>todayStr()){toast("That day hasn't happened yet",true);return;}
    const x=normWin({id:w?w.id:uid(),date,kind:st.kind,text,taskId:q("#wnTask").value,createdAt:w?w.createdAt:Date.now()});
    if(w)state.wins[state.wins.indexOf(w)]=x;else state.wins.push(x);markDirty();close();renderApp();
    toast(`${WIN_KINDS[x.kind].icon} ${w?"Updated":"Noted — it's in your year in review"}`);};
  q("#wnSave").onclick=save;
  q("#wnText").onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();save();}};
  if(q("#wnDel"))q("#wnDel").onclick=()=>{const i=state.wins.indexOf(w);state.wins.splice(i,1);markDirty();close();renderApp();efToastUndo("Win deleted",()=>{state.wins.splice(Math.min(i,state.wins.length),0,w);markDirty();renderApp();});};
  setTimeout(()=>{const ta=q("#wnText");if(ta)ta.focus();},40);}
document.addEventListener("keydown",e=>{
  if((e.key!=="w"&&e.key!=="W")||e.ctrlKey||e.metaKey||e.altKey)return;
  if(screenLocked||pendingEncrypted||document.querySelector("#modalRoot .modal-bg")||document.getElementById("bootLock"))return;
  const a=document.activeElement;if(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))return;
  e.preventDefault();openWin(view==="demands"&&activeTask()?{taskId:activeId}:{});});
{const b=document.getElementById("btnWinTop");if(b)b.onclick=()=>openWin(view==="demands"&&activeTask()?{taskId:activeId}:{});}

