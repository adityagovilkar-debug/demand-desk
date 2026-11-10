/* ===================== EFFORT — the hours you put into demands =====================
   One list in the data file: state.efforts = [{id,date,hours,taskId,bucket,activity,note,subtaskId}].
   A row is against a demand (taskId) or against a non-demand bucket (meetings, admin,
   support, learning) so a whole day adds up. state.daysOff marks holidays and leave, which never
   count as "no log". A demand's estimate is t.estimate (hours, 0 = none). Hours logged
   while the demand's status was Bug count as rework — no extra bookkeeping. */
const EF_ACTS=[["Analysis","pen-2"],["Build","pen-3"],["Testing","pen-6"],["Debug / fix","pen-1"],["Transport & Basis","pen-4"],["Documentation","pen-5"],["Meetings & admin","ink-3"],["Support","pen-7"],["Learning","pen-8"]];
const EF_ACTC=Object.fromEntries(EF_ACTS),EF_ORD=EF_ACTS.map(a=>a[0]),EF_DEMAND_ACTS=EF_ORD.slice(0,6);
const EF_BUCKETS={mtg:{l:"Meetings",act:"Meetings & admin"},adm:{l:"Admin & email",act:"Meetings & admin"},sup:{l:"Support & small asks",act:"Support"},lrn:{l:"Learning",act:"Learning"}};
const EF_PAL=["pen-2","pen-3","pen-4","pen-5","pen-6","pen-7","pen-8"];
let EF_DAY=8;   /* your working day in hours — settings.dayHours, applied on every render */
function normEffort(x){const task=!x.bucket&&!x.epicId&&x.taskId?String(x.taskId):"",epic=!task&&!x.bucket&&x.epicId?String(x.epicId):"",job=!task&&!epic&&!x.bucket&&x.jobId?String(x.jobId):"",bucket=task||epic||job?"":(EF_BUCKETS[x.bucket]?x.bucket:"sup");
  return{id:x.id||uid(),date:/^\d{4}-\d\d-\d\d$/.test(x.date||"")?x.date:todayStr(),hours:Math.max(0,Math.round((+x.hours||0)*4)/4),taskId:task,epicId:epic,jobId:job,bucket,
    activity:EF_ACTC[x.activity]?x.activity:(bucket?EF_BUCKETS[bucket].act:epic?"Meetings & admin":job?"Analysis":"Build"),note:String(x.note||""),subtaskId:task?(x.subtaskId||""):"",meetingId:String(x.meetingId||""),createdAt:x.createdAt||Date.now()};}
const efKey=e=>e.taskId||(e.epicId?"e:"+e.epicId:e.jobId?"j:"+e.jobId:"b:"+e.bucket);
const efTaskOf=k=>k&&!/^[bej]:/.test(String(k))?state.tasks.find(t=>t.id===k)||null:null;
function efName(k){if(String(k).startsWith("b:"))return (EF_BUCKETS[k.slice(2)]||{l:"Other"}).l;
  if(String(k).startsWith("e:")){const ep=epicById(k.slice(2));return ep?"◆ "+(ep.code||ep.name)+" (epic)":"(deleted epic)";}
  if(String(k).startsWith("j:")){const j=jobById(k.slice(2));return j?"☐ "+j.title:"(deleted task)";}
  const t=efTaskOf(k);return t?(demandLabel(t)):"(deleted demand)";}
const efKeyValid=k=>!!k&&(String(k).startsWith("b:")?!!EF_BUCKETS[k.slice(2)]:String(k).startsWith("e:")?!!epicById(k.slice(2)):String(k).startsWith("j:")?!!jobById(k.slice(2)):!!efTaskOf(k));
const efHash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return h>>>0;};
/* colours go round the palette in the order demands arrived, so demands open at the same time never share one */
function efPen(k){if(String(k).startsWith("b:"))return "ink-3";if(String(k).startsWith("e:"))return efEpicPen(k.slice(2));if(String(k).startsWith("j:"))return EF_PAL[efHash(k)%EF_PAL.length];const c=efPen;
  if(c.arr!==state.tasks||c.n!==state.tasks.length){c.arr=state.tasks;c.n=state.tasks.length;c.m=new Map();
    state.tasks.slice().sort((x,y)=>(x.receivedDate||isoTs(x.createdAt)).localeCompare(y.receivedDate||isoTs(y.createdAt))).forEach((t,i)=>c.m.set(t.id,EF_PAL[i%EF_PAL.length]));}
  return c.m.get(k)||EF_PAL[efHash(k)%EF_PAL.length];}
const efEpicPen=id=>{const i=state.epics.findIndex(e=>e.id===id);return EF_PAL[(i<0?efHash(id):i+2)%EF_PAL.length];};
const efThemePen=th=>{const L=[...new Set(state.tasks.map(t=>t.theme).filter(Boolean))].sort(),i=L.indexOf(th);return EF_PAL[(i<0?efHash(th):i)%EF_PAL.length];};
/* canvases redraw every frame: look names and colours up once per render */
const efM=k=>{const m=EFA&&EFA.meta;let v=m&&m.get(k);if(!v){v=efGMeta(k);if(m)m.set(k,v);}return v;};
const efSum=a=>a.reduce((s,e)=>s+e.hours,0);
const efFh=h=>String(Math.round(h*100)/100);
const efFor=id=>state.efforts.filter(e=>e.taskId===id);
const efAdd=(d,n)=>{const x=new Date(d+"T00:00:00");x.setDate(x.getDate()+n);return isoD(x);};
const efDow=d=>new Date(d+"T00:00:00").getDay();
const efMon=d=>efAdd(d,-((efDow(d)+6)%7));
const efWd=d=>{const g=efDow(d);return g>0&&g<6;};
const efFmt=(d,o)=>new Date(d+"T00:00:00").toLocaleDateString("en-GB",o);
const efSh=d=>efFmt(d,{day:"2-digit",month:"short"}),efWdl=d=>efFmt(d,{weekday:"short",day:"2-digit",month:"short"});
const efWdd=d=>efFmt(d,{weekday:"short"})+" "+new Date(d+"T00:00:00").getDate(),efLong=d=>efFmt(d,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
/* ---------- days off: public holidays and leave ----------
   state.daysOff=[{date,kind:"holiday"|"leave",label}]. A day off is never a "day with no log" and
   isn't counted as a working day in the averages; logging hours on one is still allowed. */
const EF_OFF={holiday:{l:"Holiday",icon:"🎉",pen:"pen-5"},leave:{l:"Leave",icon:"🌴",pen:"pen-7"}};
function normDayOff(x){if(typeof x==="string")x={date:x,kind:"leave"};x=x||{};return{date:String(x.date||""),kind:EF_OFF[x.kind]?x.kind:"leave",label:String(x.label||"").trim()};}
const efOff=d=>(state.daysOff||[]).find(x=>x.date===d)||null;
const efLeave=d=>!!efOff(d);
const efOffTxt=o=>o?EF_OFF[o.kind].l+(o.label?" · "+o.label:""):"";
function efSetOff(dates,kind,label){const L=state.daysOff||(state.daysOff=[]);
  dates.forEach(d=>{const o=L.find(x=>x.date===d);if(o){o.kind=kind;o.label=label;}else L.push({date:d,kind,label});});
  L.sort((a,b)=>a.date.localeCompare(b.date));markDirty();}
function efClearOff(d){state.daysOff=(state.daysOff||[]).filter(x=>x.date!==d);markDirty();}
/* "2026-10-20", "20.10.2026", "20/10/2026", "20-10-2026" — day first, as on Indian and German calendars */
function efParseDate(str){str=String(str||"").trim();let m,y,mo,d;
  if((m=str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))){y=+m[1];mo=+m[2];d=+m[3];}
  else if((m=str.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/))){y=+m[3];mo=+m[2];d=+m[1];}else return null;
  const x=new Date(y,mo-1,d);if(x.getFullYear()!==y||x.getMonth()!==mo-1||x.getDate()!==d)return null;return isoD(x);}
function efRefreshDrawer(){const d=document.getElementById("efDrw");if(d&&d.classList.contains("on"))openEfDay(d.dataset.date,d.dataset.key||"");}
function openDaysOff(o={}){const root=document.getElementById("modalRoot"),st={kind:o.kind||"holiday"};
  const rows=list=>list.map(x=>`<div class="ef-do"><span class="mono">${efWdl(x.date)}${x.date.slice(0,4)!==todayStr().slice(0,4)?" "+x.date.slice(0,4):""}</span><span class="ef-tag" style="--pen:var(--${EF_OFF[x.kind].pen})">${EF_OFF[x.kind].icon} ${EF_OFF[x.kind].l}</span><span class="lb">${esc(x.label)}</span><button class="ghost sm danger" data-rm="${x.date}" title="Not a day off">✕</button></div>`).join("");
  const draw=()=>{const t=todayStr(),L=state.daysOff||[],up=L.filter(x=>x.date>=t),past=L.filter(x=>x.date<t).slice().reverse().slice(0,30);
    const keep=root.querySelector("#doLabel")?{from:root.querySelector("#doFrom").value,to:root.querySelector("#doTo").value,label:root.querySelector("#doLabel").value}:{from:o.date||t,to:o.to||"",label:o.label||""};
    root.innerHTML=`<div class="modal-bg"><div class="modal efx ef-modal"><h2>🏖 Holidays &amp; leave</h2>
      <p class="faint" style="font-size:12px;margin-top:-6px;line-height:1.5">A day off never counts as a day with no log, and isn't counted as a working day in your averages. You can still log hours on one if you did work.</p>
      <div class="ef-qc">
        <div class="ef-qrow"><div><span class="ef-lb">From</span><input type="date" id="doFrom" value="${keep.from}"></div><div><span class="ef-lb">To · optional, for a stretch</span><input type="date" id="doTo" value="${keep.to}"></div>
          <div><span class="ef-lb">Kind</span><div class="ef-row">${Object.entries(EF_OFF).map(([k,v])=>`<button class="ef-chip ${k===st.kind?"on":""}" data-kind="${k}" style="--pen:var(--${v.pen})">${v.icon} ${v.l}</button>`).join("")}</div></div></div>
        <div><span class="ef-lb">Label · optional</span><input id="doLabel" placeholder="e.g. Dussehra · Annual leave · Sick day" value="${esc(keep.label)}" autocomplete="off"></div>
        <div class="ef-foot"><span class="ef-dsf" id="doInfo"></span><button class="primary" id="doAdd">Mark as day off</button></div>
        <details class="ef-paste"><summary>Paste your company's holiday calendar</summary>
          <textarea id="doPaste" rows="5" placeholder="One per line, date first:&#10;2026-10-20 Diwali&#10;20.10.2026 Diwali&#10;25/12/2026, Christmas"></textarea>
          <div class="ef-foot" style="margin-top:6px"><span class="faint" style="font-size:11px">Dates are day-first (20/10 = 20 October).</span><button id="doPasteAdd">Add these as holidays</button></div></details>
        <div><span class="ef-lb">Coming up</span>${rows(up)||`<div class="faint" style="font-size:12px">Nothing planned.</div>`}</div>
        ${past.length?`<div><span class="ef-lb">Earlier</span>${rows(past)}</div>`:""}
      </div><div class="modal-foot"><button class="ghost" id="doClose">Close</button></div></div></div>`;
    const q=x=>root.querySelector(x),bg=q(".modal-bg"),close=()=>{root.innerHTML="";};
    bg.onclick=e=>{if(e.target===bg)close();};q("#doClose").onclick=close;
    const span=()=>{const a=efParseDate(q("#doFrom").value),b=efParseDate(q("#doTo").value)||a;if(!a)return[];const lo=a<b?a:b,hi=a<b?b:a,out=[];
      for(let d=lo;d<=hi&&out.length<400;d=efAdd(d,1))if(efWd(d)||lo===hi)out.push(d);return out;};
    const info=()=>{const ds=span(),lg=ds.filter(d=>state.efforts.some(e=>e.date===d)).length;
      q("#doInfo").innerHTML=ds.length?`${ds.length===1?`<b>${efWdl(ds[0])}</b>`:`<b>${ds.length}</b> working days`}${lg?` · <span class="ef-bad">${lg} already ha${lg===1?"s":"ve"} hours logged — they stay</span>`:""}`:"Pick a date";
      q("#doAdd").disabled=!ds.length;};
    root.querySelectorAll("[data-kind]").forEach(b=>b.onclick=()=>{st.kind=b.dataset.kind;root.querySelectorAll("[data-kind]").forEach(x=>x.classList.toggle("on",x===b));});
    q("#doFrom").onchange=info;q("#doTo").onchange=info;info();
    q("#doAdd").onclick=()=>{const ds=span();if(!ds.length)return;efSetOff(ds,st.kind,q("#doLabel").value.trim());
      toast(`${EF_OFF[st.kind].icon} ${ds.length===1?efWdl(ds[0]):ds.length+" days"} marked as ${EF_OFF[st.kind].l.toLowerCase()}`);renderApp();efRefreshDrawer();
      if(o.date){close();return;}q("#doLabel").value="";q("#doTo").value="";draw();};
    q("#doPasteAdd").onclick=()=>{const lines=q("#doPaste").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);let bad=0,n=0;
      lines.forEach(line=>{const m=line.match(/^(\S+)\s*[,;\t-]?\s*(.*)$/),d=m&&efParseDate(m[1]);if(!d){bad++;return;}efSetOff([d],"holiday",(m[2]||"").trim());n++;});
      if(n){renderApp();efRefreshDrawer();}toast(n?`Added ${n} holiday${n===1?"":"s"}${bad?` · ${bad} line${bad===1?"":"s"} not understood`:""}`:"No dates found — put the date first on each line",!n);if(n)draw();};
    root.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{efClearOff(b.dataset.rm);renderApp();efRefreshDrawer();draw();});
    setTimeout(()=>{const l=q("#doLabel");if(l)l.focus();},40);};
  draw();}
const efPct=(a,b)=>b?Math.round(a/b*100):0;
function efParseH(s){s=String(s||"").trim().toLowerCase().replace(",",".");if(!s)return 0;let m;
  if((m=s.match(/^(\d+(?:\.\d+)?)\s*h(?:\s*(\d+)\s*m?)?$/)))return +m[1]+(m[2]?+m[2]/60:0);
  if((m=s.match(/^(\d+)\s*m(?:in)?$/)))return +m[1]/60;
  if((m=s.match(/^(\d+):(\d{1,2})$/)))return +m[1]+ +m[2]/60;
  if(/^\d+(\.\d+)?$/.test(s))return +s;return NaN;}
function efStatusOn(t,d,h){h=h||statusHistory(t);let s=h[0].s;for(const x of h)if(x.d<=d)s=x.s;return s;}
function efRework(t,es){const h=statusHistory(t);return efSum((es||efFor(t.id)).filter(e=>efStatusOn(t,e.date,h)==="bug"));}
function efSubs(t){const out=[];(function w(a,d){(a||[]).forEach(s=>{out.push({id:s.id,title:s.title||"(subtask)",d});w(s.children,d+1);});})(t.subtasks,0);return out;}
const efSubTitle=(t,id)=>{const r=id&&t?findSub(t.subtasks,id):null;return r?r.sub.title:"";};
/* working days with nothing logged — only from the first day you ever logged, so a new file isn't all red */
function efUnlogged(n){if(!state.efforts.length)return[];const first=state.efforts.reduce((m,e)=>e.date<m?e.date:m,"9999"),have=new Set(state.efforts.map(e=>e.date)),out=[],t=todayStr();
  for(let i=1;i<=n;i++){const d=efAdd(t,-i);if(d<first)break;if(efWd(d)&&!efLeave(d)&&!have.has(d))out.push(d);}return out;}

/* ---------- colours for the canvases (read from an .efx element, so classic themes get fallbacks) ---------- */
const EF_CK=["paper","paper-2","ink","ink-2","ink-3","ink-4","rule","rule-strong","pen-1","pen-2","pen-3","pen-4","pen-5","pen-6","pen-7","pen-8","good","watch","bad"];
function efC(el){const r=document.documentElement,k=(r.getAttribute("data-theme")||"")+"|"+(r.getAttribute("data-mode")||"");
  if(efC.k!==k||!efC.c){const cs=getComputedStyle(el),c={};EF_CK.forEach(x=>c[x]=cs.getPropertyValue("--"+x).trim()||"#8a8f98");
    efC.c=c;efC.k=k;efC.mono=cs.getPropertyValue("--mono").trim()||"monospace";efC.sans=cs.getPropertyValue("--sans").trim()||"sans-serif";}return efC.c;}
function efDot(c,x,y,r,col,a=1){c.globalAlpha=a;c.fillStyle=col;c.beginPath();c.arc(x,y,Math.max(.1,r),0,DK.TAU);c.fill();}
function efRing(c,x,y,r,col,a=1,lw=1){c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=lw;c.beginPath();c.arc(x,y,Math.max(.1,r),0,DK.TAU);c.stroke();}
function efLabel(c,t,x,y,{mono=false,size=9,weight=600,color,align="center"}={}){c.globalAlpha=1;c.fillStyle=color||efC.c["ink-3"];c.font=`${weight} ${size}px ${mono?efC.mono:efC.sans}`;c.textAlign=align;c.textBaseline="middle";c.fillText(t,x,y);}
function efArc(c,cx,cy,R,f,n,col,C){const a0=.78*Math.PI,sw=1.44*Math.PI;f=Math.max(0,Math.min(1,f));for(let i=0;i<n;i++){const t=i/(n-1),a=a0+sw*t;
  if(t<=f&&f>0)efDot(c,cx+Math.cos(a)*R,cy+Math.sin(a)*R,1.9,col,.5+.5*t/f);else efDot(c,cx+Math.cos(a)*R,cy+Math.sin(a)*R,1.05,C["ink-4"]);}}
function efRingDots(c,cx,cy,R,f,n,col,C){for(let i=0;i<n;i++){const t=i/n,a=-Math.PI/2+t*DK.TAU,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;if(t<f)efDot(c,x,y,1.7,col,.55+.45*(t/f));else efDot(c,x,y,1.05,C["ink-4"]);}}
const efProg=(s,ms)=>motionOn()?Math.min(1,(performance.now()-s.born)/ms):1,efEase=x=>1-Math.pow(1-Math.max(0,Math.min(1,x)),3);
/* small svg pieces */
function efDayBar(have,add=0,n=18,pitch=5){const tot=have+add,N=Math.max(n,Math.ceil(tot*2));let s=`<svg width="${N*pitch}" height="8" aria-hidden="true">`;
  for(let i=0;i<N;i++){const x=i*pitch+pitch/2,f=i<have*2-.01?"var(--ink-2)":i<tot*2-.01?(i>=EF_DAY*2?"var(--bad)":"var(--good)"):null;
    s+=f?`<circle cx="${x}" cy="4" r="${pitch*.38}" style="fill:${f}"/>`:`<circle cx="${x}" cy="4" r="${pitch*.2}" style="fill:var(--ink-4)"/>`;}return s+"</svg>";}
function efHDots(h,pen){const n=Math.max(1,Math.round(h*2));let s=`<svg width="${Math.min(n,16)*5}" height="${Math.ceil(n/16)*5}" aria-hidden="true">`;for(let i=0;i<n;i++)s+=`<circle cx="${(i%16)*5+2.5}" cy="${Math.floor(i/16)*5+2.5}" r="1.8" style="fill:var(--${pen})"/>`;return s+"</svg>";}
function efBarDots(h,unit,max,pen){const n=Math.round(h/unit);let s=`<svg width="${max*6}" height="8" aria-hidden="true">`;for(let i=0;i<max;i++)s+=i<n?`<circle cx="${i*6+3}" cy="4" r="2.2" style="fill:var(--${pen})"/>`:`<circle cx="${i*6+3}" cy="4" r="1" style="fill:var(--ink-4)"/>`;return s+"</svg>";}

/* ---------- tooltip, undo toast ---------- */
function efTipEl(){let t=document.getElementById("efTip");if(!t){t=document.createElement("div");t.id="efTip";t.className="efx ef-tip";document.body.appendChild(t);}return t;}
function efShowTip(html,x,y){const t=efTipEl();t.innerHTML=html;t.classList.add("on");const w=t.offsetWidth,h=t.offsetHeight;t.style.left=Math.max(6,Math.min(innerWidth-w-10,x+14))+"px";t.style.top=(y+h+20>innerHeight?y-h-10:y+14)+"px";}
function efHideTip(){const t=document.getElementById("efTip");if(t)t.classList.remove("on");}
function efHover(rec,html,click){if(!rec)return;rec.hits=[];rec.hv=null;const cv=rec.cv;
  cv.addEventListener("mousemove",ev=>{rec.dirty=true;const b=cv.getBoundingClientRect(),x=ev.clientX-b.left,y=ev.clientY-b.top;let hit=null;
    for(const h of rec.hits||[])if(Math.abs(x-h.x)<=h.rx&&Math.abs(y-h.y)<=h.ry){hit=h;break;}
    rec.hv=hit;if(!hit){efHideTip();cv.style.cursor="";return;}cv.style.cursor=click?"pointer":"";efShowTip(html(hit),ev.clientX,ev.clientY);});
  cv.addEventListener("mouseleave",()=>{rec.hv=null;rec.dirty=true;efHideTip();});
  if(click)cv.addEventListener("click",()=>{if(rec.hv){efHideTip();click(rec.hv);}});}
function efToastUndo(msg,fn){toast(msg);const t=document.getElementById("toast"),b=document.createElement("button");b.className="sm";b.textContent="Undo";b.style.marginLeft="10px";
  b.onclick=()=>{t.className="toast";fn();};t.appendChild(b);t.classList.add("ef-undo");clearTimeout(toast._t);toast._t=setTimeout(()=>t.className="toast",5200);}

/* ---------- the composer: inline on a demand's Effort tab and in the ⏱ dialog ---------- */
function efGuessAct(key,date){if(String(key).startsWith("b:"))return (EF_BUCKETS[key.slice(2)]||EF_BUCKETS.sup).act;
  if(String(key).startsWith("j:")){const l=state.efforts.filter(e=>e.jobId===key.slice(2)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt)[0];return l?l.activity:"Analysis";}
  if(String(key).startsWith("e:")){const l=state.efforts.filter(e=>e.epicId===key.slice(2)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt)[0];return l?l.activity:"Meetings & admin";}const t=efTaskOf(key);if(t&&efStatusOn(t,date)==="bug")return "Debug / fix";
  const l=state.efforts.filter(e=>e.taskId===key).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt)[0];return l?l.activity:"Analysis";}
const efActList=k=>String(k).startsWith("j:")?EF_ORD:String(k).startsWith("b:")?EF_ORD.slice(6):String(k).startsWith("e:")?["Meetings & admin",...EF_DEMAND_ACTS]:EF_DEMAND_ACTS;
function efTaskOptions(sel){const o=t=>`<option value="${t.id}" ${t.id===sel?"selected":""}>${esc(t.demandId?t.demandId+" — "+t.title:t.title)}</option>`;
  const live=state.tasks.filter(t=>t.status!=="closed"),old=state.tasks.filter(t=>t.status==="closed");
  return `${live.length?`<optgroup label="Demands">${live.map(o).join("")}</optgroup>`:""}${(()=>{const eps=state.epics.filter(e=>e.status!=="closed"||"e:"+e.id===sel);return eps.length?`<optgroup label="Epics — epic-level work (calls, planning)">${eps.map(e=>`<option value="e:${e.id}" ${"e:"+e.id===sel?"selected":""}>◆ ${esc(e.code?e.code+" — "+e.name:e.name)}</option>`).join("")}</optgroup>`:"";})()}${(()=>{const js=state.jobs.filter(j=>jobOpen(j)||"j:"+j.id===sel);return js.length?`<optgroup label="Tasks — not demands">${js.map(j=>`<option value="j:${j.id}" ${"j:"+j.id===sel?"selected":""}>☐ ${esc(j.title)}</option>`).join("")}</optgroup>`:"";})()}<optgroup label="Not a demand">${Object.entries(EF_BUCKETS).map(([k,v])=>`<option value="b:${k}" ${"b:"+k===sel?"selected":""}>${v.l}</option>`).join("")}</optgroup>${old.length?`<optgroup label="Closed demands">${old.map(o).join("")}</optgroup>`:""}`;}
function efLastKey(){const k=viewPref("ef.last","");if(efKeyValid(k))return k;const t=state.tasks.find(x=>["open","progress","bug"].includes(x.status));return t?t.id:"b:mtg";}
function efMountComposer(host,o,done){
  const st={key:o.key,date:o.date||todayStr(),hs:o.hours!=null?String(o.hours):"",act:o.act||efGuessAct(o.key,o.date||todayStr()),note:o.note||"",sub:o.sub||""};
  const q=s=>host.querySelector(s);
  const draw=()=>{if(!efActList(st.key).includes(st.act))st.act=efGuessAct(st.key,st.date);const t=efTaskOf(st.key),subs=t?efSubs(t):[];
    host.innerHTML=`<div class="ef-qc">
      ${o.modal?`<div><span class="ef-lb">Against</span><select data-f="task">${efTaskOptions(st.key)}</select></div>`:""}
      <div class="ef-qrow">
        <div><span class="ef-lb">Day</span><div class="ef-row"><button class="sm ghost" data-f="prev" title="Day before">‹</button><input type="date" data-f="date" max="${todayStr()}"><button class="sm ghost" data-f="next" title="Day after">›</button><button class="ef-chip" data-day="0">Today</button><button class="ef-chip" data-day="-1">Yesterday</button></div></div>
        <div><span class="ef-lb">Hours</span><div class="ef-row">${[.5,1,1.5,2,3,4].map(v=>`<button class="ef-chip mono" data-h="${v}">${v}</button>`).join("")}<input class="ef-hin mono" data-f="hours" placeholder="2h30" value="${esc(st.hs)}" autocomplete="off"></div></div>
      </div>
      <div><span class="ef-lb">Activity</span><div class="ef-row">${efActList(st.key).map(a=>`<button class="ef-chip" data-a="${esc(a)}" style="--pen:var(--${EF_ACTC[a]})"><span class="ef-pd"></span>${esc(a)}</button>`).join("")}</div></div>
      <div><span class="ef-lb">What I did</span><textarea class="ef-note" data-f="note" rows="2" placeholder="${t?"e.g. Built the cost-center range into the data fetch; unit-tested with CC 4711":String(st.key).startsWith("j:")?"e.g. Call with Basis, then checked the job logs":String(st.key).startsWith("e:")?"e.g. Alignment call with the integration team about wave 2":"e.g. Stand-up, then the governance call"}">${esc(st.note)}</textarea></div>
      ${subs.length?`<div><span class="ef-lb">Against a subtask (optional)</span><select data-f="sub" style="max-width:420px"><option value="">—</option>${subs.map(s=>`<option value="${s.id}" ${s.id===st.sub?"selected":""}>${"   ".repeat(s.d)}${esc(s.title)}</option>`).join("")}</select></div>`:""}
      <div class="ef-foot"><div class="ef-dsf" data-f="dsf"></div><button class="ghost sm" data-f="off" title="Not working that day? Mark it as a holiday or leave">🏖 Day off…</button>${o.modal?`<button class="ghost" data-f="cancel">Cancel</button>`:`<button class="sm" data-f="timer" title="Start a timer on this demand — stop it on ⏱ in the title bar and the hours are filled in">▶ Start timer</button>`}<button class="primary" data-f="log">Log</button></div></div>`;
    wire();sync();};
  const wire=()=>{
    if(q('[data-f="task"]'))q('[data-f="task"]').onchange=e=>{st.key=e.target.value;st.act=efGuessAct(st.key,st.date);st.sub="";draw();};
    q('[data-f="date"]').onchange=e=>{if(e.target.value)st.date=e.target.value>todayStr()?todayStr():e.target.value;sync();};
    q('[data-f="prev"]').onclick=()=>{st.date=efAdd(st.date,-1);sync();};
    q('[data-f="next"]').onclick=()=>{if(st.date<todayStr())st.date=efAdd(st.date,1);sync();};
    host.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{st.date=efAdd(todayStr(),+b.dataset.day);sync();});
    host.querySelectorAll("[data-h]").forEach(b=>b.onclick=()=>{st.hs=b.dataset.h;q('[data-f="hours"]').value=st.hs;sync();});
    q('[data-f="hours"]').oninput=e=>{st.hs=e.target.value;sync();};
    host.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{st.act=b.dataset.a;sync();});
    q('[data-f="note"]').oninput=e=>{st.note=e.target.value;};
    if(q('[data-f="sub"]'))q('[data-f="sub"]').onchange=e=>{st.sub=e.target.value;};
    if(q('[data-f="cancel"]'))q('[data-f="cancel"]').onclick=()=>{if(o.onCancel)o.onCancel();};
    q('[data-f="off"]').onclick=()=>openDaysOff({date:st.date});
    const go=()=>{const h=Math.round(efParseH(st.hs)*4)/4;
      if(!h||isNaN(h)||h>24){const hi=q('[data-f="hours"]');hi.classList.remove("ef-shake");void hi.offsetWidth;hi.classList.add("ef-shake");hi.focus();toast("How many hours? e.g. 2 · 1.5 · 2h30 · 90m",true);return;}
      if(st.date>todayStr()){toast("That day hasn't happened yet",true);return;}
      const isB=st.key.startsWith("b:"),isE=st.key.startsWith("e:"),isJ=st.key.startsWith("j:"),prev=o.editId?state.efforts.find(x=>x.id===o.editId):null;
      const e=normEffort({id:o.editId||uid(),date:st.date,hours:h,taskId:isB||isE||isJ?"":st.key,epicId:isE?st.key.slice(2):"",jobId:isJ?st.key.slice(2):"",bucket:isB?st.key.slice(2):"",activity:st.act,note:st.note.trim(),subtaskId:isB||isE||isJ?"":st.sub,meetingId:prev?prev.meetingId:"",createdAt:prev?prev.createdAt:Date.now()});
      {const mt=e.meetingId&&state.meetings.find(x=>x.id===e.meetingId);if(mt){mt.hours=e.hours;mt.date=e.date;mt.logTo=efKey(e);mt.updatedAt=Date.now();}}
      if(isE){const ep=epicById(e.epicId);if(ep)ep.updatedAt=Date.now();}
      if(isJ){const jb=jobById(e.jobId);if(jb){jb.updatedAt=Date.now();if(jb.status==="open")jb.status="progress";}}
      if(prev)state.efforts[state.efforts.indexOf(prev)]=e;else state.efforts.push(e);
      const t=efTaskOf(e.taskId);if(t)t.updatedAt=Date.now();
      markDirty();done(e);};
    q('[data-f="log"]').onclick=go;
    host.querySelectorAll("textarea,input").forEach(el=>el.addEventListener("keydown",ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ev.preventDefault();go();}
      else if(ev.key==="Enter"&&el.tagName==="INPUT"&&el.dataset.f==="hours"){ev.preventDefault();q('[data-f="note"]').focus();}}));
    if(q('[data-f="timer"]'))q('[data-f="timer"]').onclick=()=>efTimerStart(st.key);};
  const sync=()=>{q('[data-f="date"]').value=st.date;const hv=efParseH(st.hs);
    host.querySelectorAll("[data-h]").forEach(b=>b.classList.toggle("on",+b.dataset.h===hv));
    host.querySelectorAll("[data-day]").forEach(b=>b.classList.toggle("on",efAdd(todayStr(),+b.dataset.day)===st.date));
    host.querySelectorAll("[data-a]").forEach(b=>b.classList.toggle("on",b.dataset.a===st.act));
    const have=efSum(state.efforts.filter(e=>e.date===st.date&&e.id!==o.editId)),add=isNaN(hv)?0:Math.round(hv*4)/4;
    q('[data-f="dsf"]').innerHTML=`${efDayBar(have,add)}<span><b>${efWdl(st.date)}</b>${efOff(st.date)?" · "+EF_OFF[efOff(st.date).kind].icon+" "+esc(efOffTxt(efOff(st.date))):""} · ${efFh(have)} h logged${add?` <span class="ef-good">+ ${efFh(add)}</span> = <b>${efFh(have+add)} h</b>`:""} of ${EF_DAY}</span>`;
    q('[data-f="log"]').textContent=(o.editId?"Save":"Log")+(add?" "+efFh(add)+" h":"");
    q('[data-f="off"]').style.display=!have&&!efOff(st.date)&&!o.editId?"":"none";};
  draw();}
let efFlashId=null;
function openLogTime(o={}){const root=document.getElementById("modalRoot");
  let key=o.key;if(!efKeyValid(key))key=view==="demands"&&activeTask()?activeId:view==="epics"&&activeEpic()?"e:"+activeEpicId:view==="jobs"&&activeJob()?"j:"+activeJobId:efLastKey();
  root.innerHTML=`<div class="modal-bg"><div class="modal efx ef-modal"><h2>${o.editId?"✎ Edit time entry":"⏱ Log time"}</h2><div id="efMq"></div></div></div>`;
  const bg=root.querySelector(".modal-bg"),close=()=>{root.innerHTML="";};
  bg.onclick=e=>{if(e.target===bg)close();};
  efMountComposer(root.querySelector("#efMq"),{...o,key,modal:true,onCancel:close},e=>{close();efAfterLog(e,!!o.editId);});
  setTimeout(()=>{const h=root.querySelector('[data-f="hours"]');if(h)h.focus();},40);}
function efAfterLog(e,edited){setViewPref("ef.last",efKey(e));efFlashId=e.id;
  toast(`${edited?"Updated":"Logged"} ${efFh(e.hours)} h · ${efName(efKey(e))} · ${e.activity}`);renderApp();efTimerUI();
  const d=document.getElementById("efDrw");if(d&&d.classList.contains("on"))openEfDay(d.dataset.date,d.dataset.key||"");}
function efDelete(e){const i=state.efforts.indexOf(e);if(i<0)return;state.efforts.splice(i,1);
  const mt=e.meetingId&&state.meetings.find(x=>x.id===e.meetingId),mh=mt?mt.hours:0;if(mt)mt.hours=0;markDirty();renderApp();efTimerUI();
  const d=document.getElementById("efDrw");if(d&&d.classList.contains("on"))openEfDay(d.dataset.date,d.dataset.key||"");
  efToastUndo(`Deleted ${efFh(e.hours)} h from ${efWdl(e.date)}`,()=>{state.efforts.splice(Math.min(i,state.efforts.length),0,e);if(mt)mt.hours=mh;markDirty();renderApp();efTimerUI();});}
const efEdit=e=>openLogTime({key:efKey(e),date:e.date,hours:e.hours,act:e.activity,note:e.note,sub:e.subtaskId,editId:e.id});

/* ---------- a running timer (kept in this browser, not the data file) ---------- */
const EF_TIMER_KEY="demanddesk.timer";
function efTimer(){try{const v=JSON.parse(localStorage.getItem(EF_TIMER_KEY)||"null");return v&&v.key&&v.start?v:null;}catch(e){return null;}}
function efTimerStart(key){try{localStorage.setItem(EF_TIMER_KEY,JSON.stringify({key,start:Date.now()}));}catch(e){}efTimerUI();toast(`Timer running on ${efName(key)} — click ⏱ in the title bar to stop and log it`);}
function efTimerStop(){const tm=efTimer();if(!tm)return;try{localStorage.removeItem(EF_TIMER_KEY);}catch(e){}efTimerUI();
  const h=Math.max(.25,Math.round((Date.now()-tm.start)/36e5*4)/4),ok=efKeyValid(tm.key);
  if(h>12)toast(`The timer ran for ${efFh(h)} h — put in the hours you actually worked`,true);
  openLogTime({key:ok?tm.key:undefined,hours:h>12?"":h,date:isoTs(tm.start)});}
function efTimerUI(){const tm=efTimer(),b=document.getElementById("btnLog"),sb=document.getElementById("sbEffort");
  if(b){let txt="⏱ Log time";if(tm){const s=Math.max(0,Math.floor((Date.now()-tm.start)/1000));txt=`<span class="ef-rec"></span>${esc(efName(tm.key))} · ${Math.floor(s/3600)}:${p2(Math.floor(s/60)%60)}:${p2(s%60)} ■`;}
    if(b.innerHTML!==txt)b.innerHTML=txt;b.title=tm?"Timer running — click to stop it and log the hours":"Log time (T)";b.classList.toggle("ef-on",!!tm);}
  if(sb){const h=efSum(state.efforts.filter(e=>e.date===todayStr()));sb.textContent=`⏱ today ${efFh(h)} / ${EF_DAY} h`;}}
setInterval(efTimerUI,1000);
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){const d=document.getElementById("efDrw");if(d&&d.classList.contains("on")&&!document.querySelector("#modalRoot .modal-bg")){d.classList.remove("on");}return;}
  if((e.key!=="t"&&e.key!=="T")||e.ctrlKey||e.metaKey||e.altKey)return;
  if(screenLocked||pendingEncrypted||document.querySelector("#modalRoot .modal-bg")||document.getElementById("bootLock"))return;
  const a=document.activeElement;if(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))return;
  e.preventDefault();openLogTime();});

/* =================== a demand's Effort tab =================== */
let efLogAll=false;
function renderEffortTab(body,t){
  const es=efFor(t.id).slice().sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt),tot=efSum(es),est=+t.estimate||0;
  const days=new Set(es.map(e=>e.date)),last=es[es.length-1],rw=efRework(t,es),subs=efSubs(t),since=last?-daysUntil(last.date):99;
  body.innerHTML=`<div class="efx ef-tab">
    <div class="ck-unit"><div class="ck-head"><h2>Log time on ${esc(t.demandId||"this demand")}</h2><span class="ck-meta">Ctrl+Enter logs · T from anywhere · 2 · 1.5 · 2h30 · 90m</span></div><div id="efQc"></div></div>
    <div class="ef-ins">
      <div class="ck-unit ins"><canvas data-k="est" data-still="3000"></canvas><div style="min-width:0"><div class="k">Logged vs estimate</div><div class="v" id="efEstV">${efFh(tot)}<small>${est?"/ "+efFh(est)+" h":"h"}</small></div><div class="s ${est&&tot>est?"late":""}">${est?(tot>est?efFh(tot-est)+" h over":efFh(est-tot)+" h left"):"no estimate"} · <a href="#" class="ef-est">${est?"change":"set one"}</a></div></div></div>
      <div class="ck-unit ins"><canvas data-k="days" data-still="3000"></canvas><div style="min-width:0"><div class="k">Days worked</div><div class="v">${days.size}<small>days</small></div><div class="s">${days.size?"avg "+efFh(Math.round(tot/days.size*10)/10)+" h on a day you touched it":"nothing logged yet"}</div></div></div>
      <div class="ck-unit ins"><canvas data-k="rw" data-still="3000"></canvas><div style="min-width:0"><div class="k">Rework</div><div class="v">${efFh(rw)}<small>h</small></div><div class="s ${rw?"late":""}">${rw?efPct(rw,tot)+"% — hours logged while in Bug":"none — never bounced"}</div></div></div>
      <div class="ck-unit ins"><canvas data-k="last" data-still="3000"></canvas><div style="min-width:0"><div class="k">Last worked</div><div class="v">${last?efWdd(last.date):"—"}</div><div class="s">${last?efFh(efSum(es.filter(e=>e.date===last.date)))+" h · "+esc(last.activity):"never"}</div></div></div></div>
    ${es.length?`<div class="ck-unit"><div class="ck-head"><h2>Days on it</h2><span class="ck-meta">a column per week · size = hours that day · ring = today · hollow = holiday or leave</span></div><canvas class="ef-dcal" data-still="0"></canvas></div>`:""}
    ${es.length?`<div class="ck-unit"><div class="ck-head"><h2>Effort over its life</h2><span class="ck-meta">status above · a dot = ½ h, coloured by activity · line = running total${est?" against the estimate":""} · click a day</span></div>
      <canvas class="ef-life" data-still="1700"></canvas>
      <div class="ef-legend">${EF_DEMAND_ACTS.filter(a=>es.some(e=>e.activity===a)).map(a=>`<span><span class="ef-pd" style="--pen:var(--${EF_ACTC[a]})"></span>${a}</span>`).join("")}${est?`<span style="margin-left:auto"><span style="width:14px;border-top:1px dashed var(--ink-3)"></span>estimate</span>`:""}</div></div>`:""}
    <div class="ef-gw">
      <div class="ck-unit"><div class="ck-head"><h2>Log</h2><span class="ck-meta">${es.length} entr${es.length===1?"y":"ies"} · by week · hover to edit</span></div><div id="efLog"></div></div>
      <div class="ef-stack">
        ${roundCount(t)>1?efRoundRows(t,es):""}
        <div class="ck-unit"><div class="ck-head"><h2>By activity</h2><span class="ck-meta">${efFh(tot)} h</span></div>${efActRows(es)}</div>
        ${subs.length?`<div class="ck-unit"><div class="ck-head"><h2>By subtask</h2><span class="ck-meta">optional link on each entry</span></div>${efSubRows(es,t,subs)}</div>`:""}
      </div></div></div>`;
  efMountComposer(body.querySelector("#efQc"),{key:t.id},e=>efAfterLog(e,false));
  {const a=body.querySelector(".ef-est");a.onclick=ev=>{ev.preventDefault();const v=body.querySelector("#efEstV");
    v.innerHTML=`<input type="number" min="0" step="0.5" class="ef-estin mono" value="${est||""}" placeholder="hours">`;const i=v.querySelector("input");i.focus();i.select();let done=false;
    const ok=()=>{if(done)return;done=true;const n=Math.round((parseFloat(i.value)||0)*4)/4;if(n!==est){t.estimate=n>0?n:0;touch(t);}renderDetail();};
    i.onkeydown=e=>{if(e.key==="Enter")ok();if(e.key==="Escape"){e.stopPropagation();done=true;renderDetail();}};i.onblur=ok;};}
  efRenderLog(body.querySelector("#efLog"),t,es);
  const frac={est:est?tot/est:0,days:(()=>{const a=es.length?es[0].date:todayStr();let n=0;for(let d=a;d<=(last?last.date:a);d=efAdd(d,1))if(efWd(d))n++;return days.size/Math.max(1,n);})(),rw:tot?rw/tot:0,last:last?1-Math.min(1,since/14):0};
  {const cv=body.querySelector(".ef-dcal");if(cv){const by=new Map();es.forEach(e=>by.set(e.date,(by.get(e.date)||0)+e.hours));const vals=[];
    for(let i=52*7-1;i>=0;i--){const d=efAdd(todayStr(),-i);vals.push(efOff(d)?null:(by.get(d)||0)/EF_DAY);}
    /* as many weeks as fit at a readable dot size, up to a year */
    DK.scope(cv,(c,w,h,tm,dt,s)=>{const C=efC(cv),wk=Math.max(8,Math.min(52,Math.floor((w-20)/15)));V2.dotCalendar(c,C,0,0,w,h,vals.slice(-wk*7),C[efPen(t.id)]||C.ink);});}}
  body.querySelectorAll(".ef-ins canvas").forEach(cv=>{const k=cv.dataset.k,f=frac[k],sv={v:motionOn()?0:f};
    DK.scope(cv,(c,w,h,tm,dt)=>{const C=efC(cv);sv.v+=(f-sv.v)*DK.ease(dt,.06);
      if(k==="est")efArc(c,w/2,h/2+4,w/2-5,Math.min(1,sv.v),24,est&&tot>est?C.bad:C.good,C);
      else if(k==="last")efArc(c,w/2,h/2+4,w/2-5,sv.v,22,since<=3?C.good:since<=10?C.watch:C["ink-3"],C);
      else efRingDots(c,w/2,h/2,w/2-5,sv.v,30,k==="rw"?C.bad:C["pen-2"],C);});});
  const lc=body.querySelector(".ef-life");
  if(lc)efHover(DK.scope(lc,efLifeDraw(t,es)),hit=>{const list=es.filter(e=>e.date===hit.d),st=efStatusOn(t,hit.d);
    return `<b>${efWdl(hit.d)}</b> · ${efFh(efSum(list))} h · <span style="color:var(--${STATUS_CK[st]||"ink-3"})">${STATUS[st]?STATUS[st].label:st}</span>`+list.map(e=>`<div class="r" style="--pen:var(--${EF_ACTC[e.activity]})"><i></i><span>${esc(e.note||e.activity)}</span><span>${efFh(e.hours)}</span></div>`).join("");},hit=>openEfDay(hit.d,t.id));}
function efActRows(es){const tot=efSum(es)||1,rows=EF_ORD.map(a=>[a,efSum(es.filter(e=>e.activity===a))]).filter(r=>r[1]>0).sort((a,b)=>b[1]-a[1]),mx=Math.max(...rows.map(r=>r[1]),1);
  return rows.map(([a,h])=>`<div class="ef-brow"><span class="n"><span class="ef-pd" style="--pen:var(--${EF_ACTC[a]})"></span>${a}</span><span class="v">${efFh(h)} h · ${efPct(h,tot)}%</span>${efBarDots(h,mx/30,30,EF_ACTC[a])}</div>`).join("")||`<div class="faint" style="font-size:12px">Nothing logged yet.</div>`;}
function efSubRows(es,t,subs){const rows=[...subs.map(s=>[s.title,efSum(es.filter(e=>e.subtaskId===s.id)),s.d]),["Not against a subtask",efSum(es.filter(e=>!e.subtaskId||!subs.some(s=>s.id===e.subtaskId))),-1]].filter(r=>r[1]>0),mx=Math.max(...rows.map(r=>r[1]),1);
  return rows.map(([s,h,d])=>`<div class="ef-brow"><span class="n ${d<0?"faint":""}" style="padding-left:${Math.max(0,d)*12}px">${esc(s)}</span><span class="v">${efFh(h)} h</span>${efBarDots(h,mx/30,30,d<0?"ink-3":"pen-3")}</div>`).join("")||`<div class="faint" style="font-size:12px">Nothing logged against a subtask yet.</div>`;}
function efRenderLog(host,t,es){const sorted=es.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  if(!sorted.length){host.innerHTML=`<div class="faint" style="font-size:12px;padding:6px 0">Nothing logged yet — use the box above, or press <b>T</b> anywhere.</div>`;return;}
  const W=new Map();sorted.forEach(e=>{const m=efMon(e.date);(W.get(m)||W.set(m,[]).get(m)).push(e);});
  const weeks=[...W.entries()],show=efLogAll?weeks:weeks.slice(0,5),h=statusHistory(t),thisMon=efMon(todayStr());
  host.innerHTML=show.map(([m,list])=>`<div class="ef-wkh"><span>Week of ${efSh(m)}${m===thisMon?" · this week":""}</span><b>${efFh(efSum(list))} h</b></div>`+
    list.map(e=>{const sb=efSubTitle(t,e.subtaskId);return `<div class="ef-ent ${e.id===efFlashId?"flash":""}" data-id="${e.id}"><span class="d">${efWdd(e.date)}</span><span class="h">${efHDots(e.hours,EF_ACTC[e.activity])}<span>${efFh(e.hours)} h</span></span>
      <span class="x"><span>${e.note?linkify(e.note):`<span class="faint">(no details)</span>`}</span><span class="tg"><span class="ef-tag" style="--pen:var(--${EF_ACTC[e.activity]})"><span class="ef-pd"></span>${esc(e.activity)}</span>${sb?`<span class="sb2">↳ ${esc(sb)}</span>`:""}${efStatusOn(t,e.date,h)==="bug"?`<span class="ef-tag" style="--pen:var(--bad)">rework</span>`:""}${roundCount(t)>1?`<span class="ef-tag" style="--pen:var(--pen-5)">round ${roundOn(t,e.date)}</span>`:""}</span></span>
      <span class="ops"><button class="ghost sm" data-op="ed" title="Edit">✎</button><button class="ghost sm danger" data-op="rm" title="Delete">✕</button></span></div>`;}).join("")).join("")+
    (weeks.length>5?`<button class="sm" id="efMore" style="margin-top:10px">${efLogAll?"Show the last 5 weeks":"Show all "+weeks.length+" weeks"}</button>`:"");
  const mo=host.querySelector("#efMore");if(mo)mo.onclick=()=>{efLogAll=!efLogAll;efRenderLog(host,t,es);};
  host.querySelectorAll(".ef-ent").forEach(r=>{const e=state.efforts.find(x=>x.id===r.dataset.id);if(!e)return;
    r.querySelector('[data-op="ed"]').onclick=()=>efEdit(e);r.querySelector('[data-op="rm"]').onclick=()=>efDelete(e);});
  const f=host.querySelector(".ef-ent.flash");if(f){efFlashId=null;setTimeout(()=>f.scrollIntoView({block:"nearest",behavior:motionOn()?"smooth":"auto"}),60);}}
/* the demand's life: status band on top, a dot per half hour per day, running total against the estimate */
function efLifeDraw(t,es){const hist=statusHistory(t),H=hist.map(x=>[daysUntil(x.d),x.s]),by=new Map();
  es.forEach(e=>{const o=daysUntil(e.date);(by.get(o)||by.set(o,[]).get(o)).push(e);});
  const offs=[...by.keys()].sort((a,b)=>a-b),live=!["delivered","closed"].includes(t.status),lastOff=Math.max(H[H.length-1][0],offs.length?offs[offs.length-1]:-1e9);
  const end=live?Math.max(0,lastOff):lastOff,a=Math.min(H[0][0],offs.length?offs[0]:0)-2,b=end+3,est=+t.estimate||0,total=efSum(es),cmax=Math.max(est,total,1)*1.1;
  return (c,w,h,tm,dt,s)=>{const C=efC(s.cv),L=26,Rr=66,X=o=>L+(w-L-Rr)*(o-a)/Math.max(1,b-a),p=efEase(efProg(s,1400)),xMax=L+(w-L-Rr)*p;
    const bandY=24,top=48,y0=h-26,dayW=(w-L-Rr)/Math.max(1,b-a);s.hits=[];
    H.forEach(([d,st],i)=>{const x1=X(Math.max(d,a)),x2=i<H.length-1?X(H[i+1][0]):st==="closed"?x1+3:X(end);if(x1>xMax)return;
      const xe=Math.max(x1+3,Math.min(x2,xMax)),pen=C[STATUS_CK[st]]||C["ink-3"];
      if(st==="bug"){c.globalAlpha=.07;c.fillStyle=C.bad;c.fillRect(x1,top-6,xe-x1,y0-top+8);efLabel(c,"REWORK",(x1+xe)/2,top+4,{size:7.5,color:C.bad});}
      c.globalAlpha=.9;c.strokeStyle=pen;c.lineWidth=4;c.beginPath();c.moveTo(x1,bandY);c.lineTo(xe,bandY);c.stroke();
      if(i===0||x1-X(H[i-1][0])>34)efLabel(c,(STATUS[st]?STATUS[st].label.split(" /")[0]:st).toUpperCase(),x1,bandY-11,{size:7.5,color:pen,align:"left"});});
    changeEvents(t).forEach((ev,i)=>{const x=X(daysUntil(isoTs(ev.ts)));if(x>xMax)return;c.globalAlpha=.75;c.strokeStyle=C["pen-5"];c.lineWidth=1.2;c.setLineDash([2,3]);c.beginPath();c.moveTo(x,bandY+4);c.lineTo(x,y0+2);c.stroke();c.setLineDash([]);efLabel(c,"ROUND "+(i+2),x+4,top+4,{size:7.5,color:C["pen-5"],align:"left"});});
    for(let x=L;x<=w-Rr;x+=5)efDot(c,x,y0+6,.6,C["ink-4"]);
    const pitch=Math.min(5.4,(y0-top)/17),r=Math.max(1.1,Math.min(2.2,dayW*.36,pitch*.42));
    offs.forEach(o=>{const x=X(o);if(x>xMax)return;let y=y0;const hov=s.hv&&s.hv.o===o;
      by.get(o).slice().sort((u,v)=>EF_ORD.indexOf(u.activity)-EF_ORD.indexOf(v.activity)).forEach(e=>{const n=Math.max(1,Math.round(e.hours*2));for(let j=0;j<n;j++){efDot(c,x,y,hov?r+.6:r,C[EF_ACTC[e.activity]],hov?1:.9);y-=pitch;}});
      s.hits.push({x,y:(y+y0)/2,rx:Math.max(3,dayW/2),ry:(y0-y)/2+8,o,d:by.get(o)[0].date});});
    const yC=v=>y0-(y0-top)*v/cmax;let cum=0,px=X(a);c.lineWidth=1.3;
    offs.forEach(o=>{const x=X(o);if(x>xMax)return;const nv=cum+efSum(by.get(o));c.globalAlpha=.85;
      c.strokeStyle=est&&cum>est?C.bad:C["ink-2"];c.beginPath();c.moveTo(px,yC(cum));c.lineTo(x,yC(cum));c.stroke();
      c.strokeStyle=est&&nv>est?C.bad:C["ink-2"];c.beginPath();c.moveTo(x,yC(cum));c.lineTo(x,yC(nv));c.stroke();px=x;cum=nv;});
    if(live&&p>=1){c.strokeStyle=est&&cum>est?C.bad:C["ink-2"];c.beginPath();c.moveTo(px,yC(cum));c.lineTo(X(0),yC(cum));c.stroke();}
    let ye=null;if(est){ye=yC(est);c.globalAlpha=.75;c.strokeStyle=C["ink-3"];c.lineWidth=1;c.setLineDash([4,4]);c.beginPath();c.moveTo(L,ye);c.lineTo(w-Rr,ye);c.stroke();c.setLineDash([]);
      efLabel(c,`EST ${efFh(est)} h`,w-Rr+8,ye,{size:8,align:"left"});}
    if(p>=1){let yt=yC(total);if(ye!=null&&Math.abs(yt-ye)<13)yt=ye+(yt<ye?-13:13);efLabel(c,`${efFh(total)} h`,w-Rr+8,yt,{mono:true,size:11,align:"left",color:est&&total>est?C.bad:C.ink});}
    for(let o=Math.ceil(a);o<=b;o++){const d=efAdd(todayStr(),o);if(d.endsWith("-01")){const x=X(o);efLabel(c,efFmt(d,{month:"short"}).toUpperCase(),x,h-8,{size:7.5});c.globalAlpha=.6;c.fillStyle=C["ink-4"];c.fillRect(x,y0+3,1,7);}}
    /* plotter trace: while the running total draws itself, a pen head rides it on a dotted carriage line */
    if(p<1&&offs.length){let cm=0;offs.forEach(o=>{if(X(o)<=xMax)cm+=efSum(by.get(o));});const hy=yC(cm);
      for(let yy=top-8;yy<y0;yy+=4)efDot(c,xMax,yy,.6,C["ink-3"],.7);efDot(c,xMax,hy,2.4,C["ink-2"]);efRing(c,xMax,hy,5.5,C["ink-2"],.35);}
    if(a<=0&&b>=0){const x=X(0);if(x<=xMax){c.globalAlpha=.5;c.strokeStyle=C.ink;c.lineWidth=1;c.setLineDash([2,3]);c.beginPath();c.moveTo(x,top-10);c.lineTo(x,y0+4);c.stroke();c.setLineDash([]);efLabel(c,"TODAY",x,top-16,{size:7.5,color:C.ink});}}};}

/* =================== the Effort workspace =================== */
const EF_RNG={w:{l:"This week",weeks:1},m:{l:"4 weeks",weeks:4},q:{l:"13 weeks",weeks:13},h:{l:"26 weeks",weeks:26},mo:{l:"Month"},cu:{l:"Custom"}};
const EF_GROUPS={demand:"Demand",epic:"Epic",activity:"Activity",theme:"Theme"};
let efFocus=null,efWk=0,EFA=null;
const efRg=()=>EF_RNG[viewPref("ef.range","q")]?viewPref("ef.range","q"):"q",efG=()=>EF_GROUPS[viewPref("ef.group","demand")]?viewPref("ef.group","demand"):"demand";
const efOffD=o=>efAdd(todayStr(),o),efMonOff=o=>o-((efDow(efOffD(o))+6)%7);
function efGKey(e){const g=efG();if(g==="activity")return e.activity;
  if(e.jobId)return g==="demand"?"j:"+e.jobId:"_non";
  if(e.epicId)return g==="demand"?"e:"+e.epicId:g==="epic"?(epicById(e.epicId)?e.epicId:"_noe"):"_ep";
  if(!e.taskId)return "_non";const t=efTaskOf(e.taskId);
  if(g==="demand")return e.taskId;if(g==="epic")return t&&t.epicId&&epicById(t.epicId)?t.epicId:"_noe";return t&&t.theme?t.theme:"_nt";}
function efGMeta(k){const g=efG();if(k==="_non")return {l:"Not demand work",col:"ink-3"};if(k==="_ep")return {l:"◆ Epic-level work",col:"pen-5"};
  if(String(k).startsWith("j:")){const j=jobById(k.slice(2));return {l:j?"☐ "+j.title:"(deleted task)",sub:j?"task"+(j.askedBy?" · for "+j.askedBy:""):"",col:efPen(k)};}
  if(String(k).startsWith("e:")){const ep=epicById(k.slice(2));return {l:"◆ "+(ep?(ep.code||ep.name):"(deleted epic)"),sub:"epic-level work"+(ep&&ep.code?" · "+ep.name:""),col:efPen(k)};}
  if(g==="demand"){const t=efTaskOf(k);return t?{l:demandLabel(t),sub:t.demandId&&demandLabel(t)===t.demandId?t.title:"",col:efPen(k)}:{l:"(deleted demand)",col:"ink-4"};}
  if(g==="epic"){if(k==="_noe")return {l:"No epic",col:"pen-4"};const e=epicById(k);return {l:"◆ "+(e?(e.code||e.name):"epic"),sub:e&&e.code?e.name:"",col:efEpicPen(k)};}
  if(g==="activity")return {l:k,col:EF_ACTC[k]||"ink-3"};
  return k==="_nt"?{l:"No theme",col:"ink-2"}:{l:k,col:efThemePen(k)};}
function efAgg(){const RG=efRange(),rg=RG.rg,a=RG.a,b=RG.b,E=state.efforts.map(e=>({...e,off:daysUntil(e.date)})),R=E.filter(e=>e.off>=a&&e.off<=b&&e.off<=0),tot=new Map();
  R.forEach(e=>{const k=efGKey(e);tot.set(k,(tot.get(k)||0)+e.hours);});
  const keys=[...tot.keys()].sort((x,y)=>(x==="_non")-(y==="_non")||tot.get(y)-tot.get(x));
  const cal0=efMonOff(0)-25*7,day=new Map();
  E.forEach(e=>{if(e.off<cal0||e.off>0)return;let d=day.get(e.off);if(!d){d={tot:0,by:new Map()};day.set(e.off,d);}d.tot+=e.hours;const k=efGKey(e);d.by.set(k,(d.by.get(k)||0)+e.hours);});
  /* a short range is shown per day, up to ~30 weeks per week, anything longer per month */
  const span=b-a+1,mode=span<=10?"day":span<=210?"week":"month",dayMode=mode==="day",B=[];
  if(mode==="day")for(let o=a;o<=b;o++)B.push({a:o,b:o,l:efWdd(efOffD(o)).toUpperCase()});
  else if(mode==="week")for(let o=efMonOff(a);o<=b;o+=7)B.push({a:o,b:o+6,l:efSh(efOffD(o))});
  else{let m=efOffD(a).slice(0,7);const end=efOffD(b).slice(0,7);while(m<=end&&B.length<60){B.push({a:daysUntil(m+"-01"),b:daysUntil(efMonthEnd(m)),l:efFmt(m+"-01",{month:"short"}).toUpperCase(),m});m=efMonthShift(m,1);}}
  B.forEach(bk=>{bk.by=new Map();bk.tot=0;R.forEach(e=>{if(e.off>=bk.a&&e.off<=bk.b){const k=efGKey(e);bk.by.set(k,(bk.by.get(k)||0)+e.hours);bk.tot+=e.hours;}});});
  const first=E.length?Math.min(...E.map(e=>e.off)):1;
  EFA={E,R,tot,keys,day,B,dayMode,mode,a,b,RG,cal0,first,rg,meta:new Map()};return EFA;}
let efMxPrev=null;
function renderEffortWS(){const host=document.getElementById("detail");efHideTip();
  if(!state.efforts.length){host.innerHTML=`<div class="efx ef-ws"><div class="ef-wsh"><div><div class="ef-l1">⏱ Effort</div><h1>Where your hours go</h1></div></div>
    <div class="ck-unit ef-empty"><div class="ck-head"><h2>Nothing logged yet</h2></div>
      <p>Log the hours you put into a demand — <b>3 h on DMND-10421 on Tuesday, building the cost-center filter</b> — and this page shows where your time goes: a calendar of your days, hours per week by demand, epic, activity or theme, a week sheet to copy into your timesheet, estimate against actual, and how much went to rework.</p>
      <p>Log from anywhere with <b>⏱ Log time</b> in the title bar or the <b>T</b> key, or from the <b>Effort</b> tab on a demand. Meetings, admin, support and learning have their own buckets, so a whole day adds up.</p>
      <button class="primary" id="efFirst">⏱ Log your first hours</button></div></div>`;
    host.querySelector("#efFirst").onclick=()=>openLogTime();return;}
  const A=efAgg(),rg=A.rg,g=efG(),total=efSum(A.R),len=A.b-A.a+1;
  const pa=A.a-len,prev=efSum(A.E.filter(e=>e.off>=pa&&e.off<A.a)),delta=prev?Math.round((total-prev)/prev*100):0;
  const wdays=[];for(let o=A.a;o<=Math.min(A.b,0);o++){const d=efOffD(o);if(efWd(d)&&!efLeave(d))wdays.push(o);}
  const logged=new Set(A.R.map(e=>e.off)),unl=wdays.filter(o=>o<0&&o>=A.first&&!logged.has(o)),worked=wdays.filter(o=>logged.has(o)).length;
  const dem=efSum(A.R.filter(e=>e.taskId||e.epicId)),nDem=new Set(A.R.filter(e=>e.taskId).map(e=>e.taskId)).size;
  const rwH=efSum(A.R.filter(e=>{const t=efTaskOf(e.taskId);return t&&efStatusOn(t,e.date)==="bug";}));
  host.innerHTML=`<div class="efx ef-ws">
    <div class="ef-wsh"><div><div class="ef-l1">⏱ Effort · ${esc(A.RG.l)} · ${efSh(A.RG.from)} – ${efSh(A.RG.to)}</div><h1>Where your hours went</h1></div>
      <div class="ef-ctl"><div class="ef-sg" id="efRg"><span class="cap">Range</span>${Object.entries(EF_RNG).map(([k,v])=>`<button data-k="${k}" class="${k===rg?"on":""}">${v.l}</button>`).join("")}</div>
        ${rg==="mo"?`<span class="ef-row"><button class="sm ghost" id="efMoP" title="Month before">‹</button><b class="mono" style="min-width:124px;text-align:center;font-weight:500">${esc(A.RG.l)}</b><button class="sm ghost" id="efMoN" title="Month after">›</button></span>`:""}
        ${rg==="cu"?`<span class="ef-row"><input type="date" id="efCuF" value="${A.RG.from}" style="width:150px"><span class="faint">–</span><input type="date" id="efCuT" value="${A.RG.to}" style="width:150px"></span>`:""}
        <div class="ef-sg" id="efGp"><span class="cap">Group by</span>${Object.entries(EF_GROUPS).map(([k,v])=>`<button data-k="${k}" class="${k===g?"on":""}">${v}</button>`).join("")}</div>
        <button class="sm" id="efOffB" title="Public holidays and leave — days that never count as missing a log">🏖 Days off</button><button class="sm" id="efCsv" title="Every entry ever logged, as a spreadsheet">⬇ CSV</button><button class="sm primary" id="efLogB">⏱ Log time</button></div></div>
    ${roHTML([{k:"Logged",v:`<canvas class="mxr" id="efMxR" data-still="1000" data-v="${efFh(Math.round(total))}" style="width:${V2.mxW(efFh(Math.round(total)),22)}px;height:22px" title="${efFh(total)} h"></canvas>`+`<small>h</small>`+(prev?`<small class="${delta>=0?"ef-good":"ef-bad"}">${delta>=0?"▲":"▼"} ${Math.abs(delta)}% vs previous</small>`:"")},
      {k:"Per worked day",v:U(efFh(Math.round(total/Math.max(1,worked)*10)/10),"h")},
      {k:"Days logged",v:U(worked,"/ "+wdays.length+" working")},
      {k:"Demand work",v:U(efPct(dem,total),"% · "+nDem+" demand"+(nDem===1?"":"s"))},
      {k:"Rework",v:U(efFh(rwH),"h"),cls:rwH?"bad":""},
      {k:"Days with no log",v:String(unl.length),cls:unl.length?"bad":""}])}
    <div class="ck-unit"><div class="ck-head"><h2>Noticed</h2><span class="ck-meta">worked out from your log</span></div><div id="efNoticed"></div></div>
    <div class="ef-lgrow"><span class="ef-lb" style="margin:0">${EF_GROUPS[g]}s · click to focus${g==="demand"?" · double-click to open":""}</span>${A.keys.map(k=>{const m=efGMeta(k);return `<button class="ef-lgi ${efFocus===k?"on":efFocus?"off":""}" data-k="${esc(k)}" style="--pen:var(--${m.col})" title="${esc(m.sub||"")}"><span class="ef-pd"></span>${esc(m.l)}<b>${efFh(A.tot.get(k))}</b></button>`;}).join("")}</div>
    <div class="ck-unit"><div class="ck-head"><h2>26 weeks in dots</h2><span class="ck-meta">a dial per day · a dot = ½ h, a full ring = your working day · colours = where the hours went · red dots = a working day with no log · dotted rule = the range · click a day</span></div><canvas class="ef-cal" id="efCal" data-still="1400"></canvas></div>
    <div class="ef-gw">
      <div class="ck-unit"><div class="ck-head"><h2>Where the hours went</h2><span class="ck-meta">${A.mode==="day"?`per day · a dot = ½ h · dashed = ${efFh(EF_DAY)} h`:A.mode==="week"?`per week · a dot = 1 h · dashed = ${efFh(EF_DAY*5)} h`:`per month · a dot = 4 h · dashed = ${efFh(EF_DAY*21)} h`} · click a column</span></div><canvas class="ef-wkc" id="efWk" data-still="2600"></canvas></div>
      <div class="ck-unit"><div class="ck-head"><h2>Activity mix</h2><span class="ck-meta">${efFh(total)} h</span></div><div class="ef-mixw"><canvas id="efMix" data-still="2000"></canvas><div>${efMixRows(A.R)}</div></div></div></div>
    <div class="ck-unit" id="efSheet"></div>
    <div class="ef-g3">
      <div class="ck-unit"><div class="ck-head"><h2>Estimate vs actual</h2><span class="ck-meta">whole life · demands in range</span></div>${efEstRows(A)}</div>
      <div class="ck-unit"><div class="ck-head"><h2>Rework cost</h2><span class="ck-meta">hours logged while a demand was in Bug</span></div>${efReworkHTML(A,dem)}</div>
      <div class="ck-unit"><div class="ck-head"><h2>Your week's rhythm</h2><span class="ck-meta">avg on a logged day</span></div>${efRhythmHTML(A)}</div></div></div>`;
  host.querySelector("#efNoticed").innerHTML=efNoticedHTML(A,total,dem,unl);
  const openDemand=id=>{view="demands";activeId=id;activeTab="effort";renderApp();};
  /* the headline as a matrix readout; switching the range wipes the old number into the new one */
  {const cv=host.querySelector("#efMxR");if(cv){const to=cv.dataset.v,from=efMxPrev||to;efMxPrev=to;
    DK.scope(cv,(c,w,h,tm,dt,s)=>{const C=efC(cv),cell=h/7,age=performance.now()-s.born;if(from!==to&&age<900)V2.matrixWipe(c,C,from,to,0,0,cell,age,C.ink,C["pen-2"]);else V2.matrixText(c,C,to,0,0,cell,C.ink);});}}
  host.querySelectorAll("#efRg button").forEach(b=>b.onclick=()=>{if(b.dataset.k==="cu"&&!viewPref("ef.from","")){setViewPref("ef.from",A.RG.from);setViewPref("ef.to",A.RG.to);}setViewPref("ef.range",b.dataset.k);efFocus=null;renderEffortWS();});
  {const mp=host.querySelector("#efMoP");if(mp){const cur=()=>viewPref("ef.month",todayStr().slice(0,7));mp.onclick=()=>{setViewPref("ef.month",efMonthShift(cur(),-1));renderEffortWS();};host.querySelector("#efMoN").onclick=()=>{setViewPref("ef.month",efMonthShift(cur(),1));renderEffortWS();};}
   const cf=host.querySelector("#efCuF");if(cf){const ch=()=>{const f=cf.value,t=host.querySelector("#efCuT").value;if(f&&t&&f<=t){setViewPref("ef.from",f);setViewPref("ef.to",t);renderEffortWS();}};cf.onchange=ch;host.querySelector("#efCuT").onchange=ch;}}
  host.querySelectorAll("#efGp button").forEach(b=>b.onclick=()=>{setViewPref("ef.group",b.dataset.k);efFocus=null;renderEffortWS();});
  host.querySelector("#efLogB").onclick=()=>openLogTime();host.querySelector("#efOffB").onclick=()=>openDaysOff();host.querySelector("#efCsv").onclick=efCSV;
  host.querySelectorAll(".ef-lgi").forEach(b=>{b.onclick=()=>{efFocus=efFocus===b.dataset.k?null:b.dataset.k;DK.wake();host.querySelectorAll(".ef-lgi").forEach(x=>{x.classList.toggle("on",x.dataset.k===efFocus);x.classList.toggle("off",!!efFocus&&x.dataset.k!==efFocus);});};
    b.ondblclick=()=>{if(efG()==="demand"&&efTaskOf(b.dataset.k))openDemand(b.dataset.k);};});
  host.querySelectorAll(".ef-erow[data-id]").forEach(r=>r.onclick=()=>openDemand(r.dataset.id));
  host.querySelectorAll("#efNoticed [data-act]").forEach(b=>b.onclick=()=>efNoticeActs[+b.dataset.act]());
  efHover(DK.scope(host.querySelector("#efCal"),efCalDraw),efCalTip,hit=>{if(hit.kind==="none")openLogTime({date:efOffD(hit.off)});else openEfDay(efOffD(hit.off));});
  efHover(DK.scope(host.querySelector("#efWk"),efWkDraw),efWkTip,hit=>{if(EFA.mode==="month"){setViewPref("ef.range","mo");setViewPref("ef.month",hit.b.m);renderEffortWS();return;}if(EFA.dayMode){if(hit.b.a<=0)openEfDay(efOffD(hit.b.a));return;}efWk=Math.max(0,(efMonOff(0)-efMonOff(hit.b.a))/7);efRenderSheet(true);host.querySelector("#efSheet").scrollIntoView({behavior:motionOn()?"smooth":"auto",block:"center"});});
  DK.scope(host.querySelector("#efMix"),efMixDraw);
  efRenderSheet();}
/* calendar: 26 weeks × 7 days, a pie per day */
function efCalDraw(c,w,h,tm,dt,s){const A=EFA,C=efC(s.cv),p=efEase(efProg(s,1200)),L=30,top=20,cw=(w-L-6)/26,ch=(h-top-4)/7,cell=Math.min(cw,ch);s.hits=[];
  /* Instrument v2: each day is a dial of dots — one dot per half hour round the ring, a full ring = your working
     day, lit clockwise from 12 in the colours of where the time went (what the pie's slices were). Unlit dots are
     the rest of the day; hours past a full day spill into an inner ring. The range is a dotted rule over its weeks
     with full ink inside it; days outside it are drawn faint. */
  const inR=o=>o>=A.a&&o<=A.b,col=o=>L+Math.floor((o-A.cal0)/7)*cw,lo=Math.max(A.a,A.cal0),hi=Math.min(A.b,A.cal0+26*7-1);
  if(hi>=lo){const xr=col(lo)+3,xe=Math.min(w-6,col(hi)+cw)-3;for(let x=xr;x<=xe;x+=4)efDot(c,x,top-7,.75,C["ink-2"],.85);efDot(c,xr,top-7,1.5,C["ink-2"]);efDot(c,xe,top-7,1.5,C["ink-2"]);}
  ["MON","","WED","","FRI","",""].forEach((d,i)=>d&&efLabel(c,d,L-8,top+i*ch+ch/2,{size:7,align:"right"}));
  const ix=k=>{const i=A.keys.indexOf(k);return i<0?99:i;};let lastM=-1;
  const N=Math.max(8,Math.round(EF_DAY*2)),R=Math.max(4,cell*.34),rL=Math.max(.9,Math.min(2,R*DK.TAU/N*.36)),rU=Math.max(.45,rL*.45),N2=Math.max(6,Math.round(N*.62));
  const ringAt=(x,y,r,n,lit,fade,hov)=>{for(let i=0;i<n;i++){const a=-Math.PI/2+i/n*DK.TAU,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r,k=lit[i];
    if(k)efDot(c,px,py,rL*(hov?1.2:1),C[efM(k).col]||C["ink-3"],(efFocus&&efFocus!==k?.12:.95)*fade);else efDot(c,px,py,rU,C["ink-4"],fade);}};
  for(let wk=0;wk<26;wk++){const m0=A.cal0+wk*7,dm=new Date(efOffD(m0)+"T00:00:00").getMonth();
    if(dm!==lastM){lastM=dm;efLabel(c,efFmt(efOffD(m0),{month:"short"}).toUpperCase(),L+wk*cw+2,7,{size:7.5,align:"left"});}
    if(wk/26>p)continue;
    for(let r=0;r<7;r++){const off=m0+r,x=L+wk*cw+cw/2,y=top+r*ch+ch/2,dstr=efOffD(off),we=r>=5,fade=inR(off)?1:.32;
      if(off>0){const fo=efOff(dstr);if(fo)efRing(c,x,y,Math.max(2,R*.42),C[EF_OFF[fo.kind].pen],.6,1.2);else efDot(c,x,y,.6,C["ink-4"],.5);s.hits.push({x,y,rx:cw/2,ry:ch/2,off,kind:"fut"});continue;}
      const d=A.day.get(off),hov=s.hv&&s.hv.off===off;let kind="day";
      const fo=efOff(dstr);
      if(fo&&!(d&&d.tot)){efRing(c,x,y,Math.max(2,R*.42),C[EF_OFF[fo.kind].pen],.9*fade,1.3);kind="leave";}
      else if(d&&d.tot){const seq=[];[...d.by.entries()].sort((u,v)=>ix(u[0])-ix(v[0])).forEach(([k,v])=>{for(let j=0;j<Math.round(v*2);j++)seq.push(k);});
        if(!seq.length)seq.push([...d.by.keys()][0]);
        ringAt(x,y,R*(hov?1.08:1),N,seq.slice(0,N),fade,hov);
        if(seq.length>N)ringAt(x,y,R*.56,N2,seq.slice(N,N+N2),fade,hov);}
      else if(!we&&off<0&&off>=A.first){for(let i=0;i<N;i++){const a=-Math.PI/2+i/N*DK.TAU;efDot(c,x+Math.cos(a)*R,y+Math.sin(a)*R,rU*1.25,C.bad,.75*fade);}kind="none";}
      else{efDot(c,x,y,.8,C["ink-4"],fade);kind=we?"we":"quiet";}
      if(off===0)efRing(c,x,y,R+4,C.ink,.6);
      if(hov&&kind!=="day")efRing(c,x,y,R+2,C["ink-2"],.6);
      s.hits.push({x,y,rx:cw/2,ry:ch/2,off,kind});}}}
function efCalTip(hit){const d=efOffD(hit.off);
  const fo=efOff(d),ot=fo?` · ${EF_OFF[fo.kind].icon} ${esc(efOffTxt(fo))}`:"";
  if(hit.kind==="fut")return `<b>${efWdl(d)}</b>${ot}<div class="hint">${fo?"click to change":"still to come · click to plan a day off"}</div>`;
  if(hit.kind==="leave")return `<b>${efWdl(d)}</b>${ot}<div class="hint">click to see or change</div>`;
  if(hit.kind==="none")return `<b>${efWdl(d)}</b> · <span class="ef-bad">no log</span><div class="hint">click to fill it in — or mark it as a holiday or leave</div>`;
  const D=EFA.day.get(hit.off);if(!D)return `<b>${efWdl(d)}</b>${hit.kind==="we"?" · weekend":" · nothing logged"}<div class="hint">click for the day</div>`;
  return `<b>${efWdl(d)}</b>${ot} · ${efFh(D.tot)} h`+[...D.by.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>{const m=efM(k);return `<div class="r" style="--pen:var(--${m.col})"><i></i><span>${esc(m.l)}${m.sub?` <span class="faint">${esc(m.sub)}</span>`:""}</span><span>${efFh(v)}</span></div>`;}).join("")+`<div class="hint">click for the day's ledger</div>`;}
/* stacked dot columns per week (or per day) */
function efWkDraw(c,w,h,tm,dt,s){const A=EFA,C=efC(s.cv),B=A.B,n=B.length,L=32,top=14,bot=24,y0=h-bot,cw=(w-L-8)/n,u=A.mode==="day"?.5:A.mode==="week"?1:4,tgt=A.mode==="day"?EF_DAY:A.mode==="week"?EF_DAY*5:EF_DAY*21;s.hits=[];
  const m=cw>=200?6:cw>=90?4:cw>=44?2:1,maxH=Math.max(tgt*1.12,...B.map(b=>b.tot)),rows=Math.ceil(maxH/u/m),pitch=Math.min(14,(y0-top)/rows),hp=Math.min(pitch,cw*.8/m),r=Math.min(pitch,hp)*.4;
  const yT=y0-(tgt/u/m)*pitch;c.globalAlpha=.7;c.strokeStyle=C["ink-3"];c.setLineDash([4,4]);c.lineWidth=1;c.beginPath();c.moveTo(L,yT);c.lineTo(w-8,yT);c.stroke();c.setLineDash([]);efLabel(c,`${tgt} h`,L-6,yT,{size:7.5,align:"right"});
  const el=motionOn()?performance.now()-s.born:1e9,every=Math.ceil(n/10);
  const tops=[];
  B.forEach((bk,i)=>{const xc=L+cw*i+cw/2,x0=xc-(m-1)*hp/2,hov=s.hv&&s.hv.b===bk,pb=efEase((el-i*28)/800);
    if(hov){c.globalAlpha=1;c.fillStyle=C["paper-2"];c.fillRect(L+cw*i+1,top-6,cw-2,y0-top+10);}
    const seq=[];A.keys.forEach(k=>{const v=(bk.by.get(k)||0)/u,full=Math.floor(v+1e-9);for(let j=0;j<full;j++)seq.push({k,half:false});if(v-full>=.5-1e-9)seq.push({k,half:true});});
    const shown=Math.floor(seq.length*pb);
    seq.forEach((d,j)=>{if(j>=shown)return;const x=x0+(j%m)*hp,y=y0-pitch/2-Math.floor(j/m)*pitch;efDot(c,x,y,d.half?r*.6:r,C[efM(d.k).col]||C["ink-3"],efFocus&&efFocus!==d.k?.13:.92);});
    if(!bk.tot&&bk.a<=0)efDot(c,xc,y0-pitch/2,1,C["ink-4"]);
    if(i%every===0||A.dayMode)efLabel(c,bk.l,xc,h-9,{size:7.5,color:bk.a<=0&&bk.b>=0?C.ink:C["ink-3"]});
    tops[i]={x:xc,y:y0-pitch/2-Math.max(0,Math.ceil(seq.length/m)-1)*pitch,tot:bk.tot,pb,now:bk.a<=0&&bk.b>=0};
    s.hits.push({x:xc,y:(top+y0)/2,rx:cw/2,ry:(y0-top)/2+8,b:bk});});
  /* label the two points that matter — the peak and now — on leader lines */
  if(tops.length&&tops.every(x=>x.pb>=1)){const pk=tops.reduce((a,b)=>b.tot>a.tot?b:a,tops[0]),nw=tops.find(x=>x.now),unit=A.mode==="day"?"today":A.mode==="week"?"this week":"this month";
    /* a label sits above every column it would cross */
    const lyFor=o=>{const flip=o.x>w-130,a0=flip?o.x-140:o.x,a1=flip?o.x:o.x+140;let y=o.y-16;tops.forEach(q=>{if(q!==o&&q.tot&&q.x>=a0&&q.x<=a1)y=Math.min(y,q.y-12);});return Math.max(10,y);};
    let pl=null;if(pk.tot){pl=lyFor(pk);V2.callout(c,C,pk.x,pk.y,`${efFh(pk.tot)} h · ${pk===nw?unit+" · peak":"peak"}`,pl,C["ink-2"],w);}
    if(nw&&nw!==pk&&nw.tot){let nl=lyFor(nw);if(pl!=null&&Math.abs(nl-pl)<14&&Math.abs(nw.x-pk.x)<180)nl=Math.max(10,pl-14);V2.callout(c,C,nw.x,nw.y,`${efFh(nw.tot)} h · ${unit}`,nl,C["pen-2"],w);}}}
function efWkTip(hit){const bk=hit.b,title=EFA.mode==="day"?efWdl(efOffD(bk.a)):EFA.mode==="month"?efFmt(bk.m+"-01",{month:"long",year:"numeric"}):`Week of ${efSh(efOffD(bk.a))}`;if(!bk.tot)return `<b>${title}</b><div class="hint">nothing logged</div>`;
  return `<b>${title}</b> · ${efFh(bk.tot)} h`+[...bk.by.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>{const m=efM(k);return `<div class="r" style="--pen:var(--${m.col})"><i></i><span>${esc(m.l)}${m.sub?` <span class="faint">${esc(m.sub)}</span>`:""}</span><span>${efFh(v)}</span></div>`;}).join("")+`<div class="hint">${EFA.mode==="day"?"click for the day":EFA.mode==="month"?"click to see this month":"click to open this week in the sheet"}</div>`;}
/* activity mix: one ring of dots */
const efMixTotals=R=>EF_ORD.map(a=>[a,efSum(R.filter(e=>e.activity===a))]).filter(x=>x[1]>0);
function efMixDraw(c,w,h,tm,dt,s){const C=efC(s.cv),M=efMixTotals(EFA.R),tot=M.reduce((a,b)=>a+b[1],0)||1,N=80,cx=w/2,cy=h/2,R1=Math.min(w,h)/2-8,p=efEase(efProg(s,1100));let idx=0;
  M.forEach(([a,v])=>{const cnt=Math.round(v/tot*N);for(let j=0;j<cnt&&idx<N;j++,idx++){const t=idx/N;if(t>p)continue;const an=-Math.PI/2+t*DK.TAU;
    efDot(c,cx+Math.cos(an)*R1,cy+Math.sin(an)*R1,2.4,C[EF_ACTC[a]],.95);efDot(c,cx+Math.cos(an)*(R1-7),cy+Math.sin(an)*(R1-7),1.3,C[EF_ACTC[a]],.45);}});
  efLabel(c,efFh(Math.round(efSum(EFA.R)*10)/10),cx,cy-5,{mono:true,size:20,weight:500,color:C.ink});efLabel(c,"HOURS",cx,cy+13,{size:7.5});}
function efMixRows(R){const M=efMixTotals(R).sort((a,b)=>b[1]-a[1]),tot=M.reduce((a,b)=>a+b[1],0)||1;
  return M.map(([a,v])=>`<div class="ef-mrow" style="--pen:var(--${EF_ACTC[a]})"><i></i><span>${a}</span><span class="h">${efFh(v)} h</span><span class="p">${efPct(v,tot)}%</span></div>`).join("")||`<div class="faint" style="font-size:12px">Nothing in this range.</div>`;}
/* the week sheet — what goes into the timesheet */
function efRenderSheet(pin){const host=document.getElementById("efSheet");if(!host)return;
  const m=efMonOff(0)-efWk*7,ds=[0,1,2,3,4,5,6].map(i=>m+i),es=state.efforts.filter(e=>{const o=daysUntil(e.date);return o>=m&&o<=m+6;}),tot=efSum(es);
  const keys=[...new Set(es.map(efKey))].sort((a,b)=>(a.startsWith("b:"))-(b.startsWith("b:"))||efName(a).localeCompare(efName(b)));
  /* demands that share one ticket ID can be added up into one row — that's how a timesheet wants them */
  const shared=demandIdsShared(),byT=shared.size>0&&viewPref("ef.sheetBy","demand")==="ticket",rows=[];
  keys.forEach(k=>{const t=efTaskOf(k),g=byT&&t&&shared.has(t.demandId)?"T:"+t.demandId:k,r=rows.find(x=>x.g===g);if(r)r.keys.push(k);else rows.push({g,keys:[k],id:t?t.demandId:""});});
  const res=r=>es.filter(e=>r.keys.includes(efKey(e))),cell=(r,o)=>efSum(res(r).filter(e=>e.date===efOffD(o))),we=o=>{const g=efDow(efOffD(o));return g===0||g===6;},first=state.efforts.reduce((x,e)=>e.date<x?e.date:x,"9999");
  const many=r=>r.keys.length>1,titles=r=>r.keys.map(k=>efTaskOf(k).title);
  const rl=r=>{const k=r.keys[0],t=efTaskOf(k);return many(r)?`<b class="mono">${esc(r.id)}</b> <span class="faint" title="${esc(titles(r).join("\n"))}">${r.keys.length} demands added up</span>`:t?`<b class="mono">${esc(t.demandId||"")}</b> <span class="faint">${esc(t.title)}</span>`:esc(efName(k));};
  const rt=r=>{const t=efTaskOf(r.keys[0]);return many(r)?`${r.id} ${titles(r).join(" + ")}`:t?`${t.demandId?t.demandId+" ":""}${t.title}`:efName(r.keys[0]);};
  host.innerHTML=`<div class="ck-head"><h2>Week sheet</h2><span class="ck-meta">${efSh(efOffD(m))} – ${efSh(efOffD(m+6))} · ${efFh(tot)} h · click an empty cell to log it, a filled one to see the day</span>
    <span class="ef-wnav">${shared.size?`<button class="sm ${byT?"ghost":""}" id="efByD" title="One row per demand">By demand</button><button class="sm ${byT?"":"ghost"}" id="efByT" title="Demands that share a ticket ID added up into one row">By ticket</button><span style="width:8px"></span>`:""}<button class="sm ghost" id="efWkP" title="Week before">‹</button><button class="sm ${efWk?"":"ghost"}" id="efWk0">This week</button><button class="sm ghost" id="efWkN" title="Week after" ${efWk===0?"disabled":""}>›</button><button class="sm" id="efWkCopy" title="A tab-separated table — paste into your timesheet or Excel">⧉ Copy for timesheet</button></span></div>
    <div style="overflow-x:auto"><table class="ef-sheet ${pin?"pin":""}"><thead><tr><th>${byT?"Ticket":"Demand"} / bucket</th>${ds.map(o=>`<th class="c ${we(o)?"we":""} ${o===0?"td":""}" title="${esc(efOffTxt(efOff(efOffD(o))))}">${efFmt(efOffD(o),{weekday:"short"})}${efOff(efOffD(o))?" "+EF_OFF[efOff(efOffD(o)).kind].icon:""}<small>${efSh(efOffD(o))}</small></th>`).join("")}<th class="tt">Total</th></tr></thead>
    <tbody>${rows.map((r,ri)=>`<tr><td class="rl"><span class="ef-pd" style="--pen:var(--${efPen(r.keys[0])})"></span> ${rl(r)}</td>${ds.map(o=>{const v=cell(r,o);return `<td class="c ${v?"has":"e"} ${we(o)?"we":""} ${o===0?"td":""} ${o>0?"fu":""}" data-o="${o}" data-r="${ri}">${v?efFh(v):""}</td>`;}).join("")}<td class="tt">${efFh(efSum(res(r)))}</td></tr>`).join("")||`<tr><td class="rl faint" colspan="9">Nothing logged this week.</td></tr>`}</tbody>
    <tfoot><tr><td class="rl faint">Day total</td>${ds.map(o=>{const d=efOffD(o),v=efSum(es.filter(e=>e.date===d)),lv=efOff(d),un=!lv&&!we(o)&&o<0&&!v&&d>=first;
      return `<td class="${we(o)?"we":""} ${o===0?"td":""}">${v?`${efDayBar(v,0,16,4.2)}${efFh(v)}`:lv?`<span class="faint" style="cursor:pointer" data-day="${d}" title="${esc(efOffTxt(lv))}">${EF_OFF[lv.kind].icon} ${EF_OFF[lv.kind].l.toLowerCase()}</span>`:un?`<span class="ef-bad">no log</span><div class="ef-tiny"><a href="#" data-fill="${d}">＋ log</a> · <a href="#" data-off="${d}">day off</a></div>`:""}</td>`;}).join("")}<td class="tt">${efFh(tot)}</td></tr></tfoot></table></div>`;
  host.querySelector("#efWkP").onclick=()=>{efWk++;efRenderSheet();};host.querySelector("#efWkN").onclick=()=>{if(efWk>0){efWk--;efRenderSheet();}};host.querySelector("#efWk0").onclick=()=>{efWk=0;efRenderSheet();};
  [["#efByD","demand"],["#efByT","ticket"]].forEach(([id,v])=>{const b=host.querySelector(id);if(b)b.onclick=()=>{setViewPref("ef.sheetBy",v);efRenderSheet(pin);};});
  host.querySelectorAll("td.c").forEach(td=>td.onclick=()=>{const o=+td.dataset.o,r=rows[+td.dataset.r];if(o>0||!r)return;if(td.classList.contains("has"))openEfDay(efOffD(o),many(r)?"":r.keys[0]);else openLogTime({key:r.keys[0],date:efOffD(o)});});
  host.querySelectorAll("[data-fill]").forEach(el=>el.onclick=e=>{e.preventDefault();openLogTime({date:el.dataset.fill});});
  host.querySelectorAll("[data-off]").forEach(el=>el.onclick=e=>{e.preventDefault();openDaysOff({date:el.dataset.off});});
  host.querySelectorAll("[data-day]").forEach(el=>el.onclick=()=>openEfDay(el.dataset.day));
  host.querySelector("#efWkCopy").onclick=()=>{const out=[[`${byT?"Ticket":"Demand"} / bucket`,...ds.map(efOffD),"Total"].join("\t"),...rows.map(r=>[rt(r),...ds.map(o=>{const v=cell(r,o);return v?efFh(v):"";}),efFh(efSum(res(r)))].join("\t"))];
    navigator.clipboard.writeText(out.join("\n")).then(()=>toast(`Copied ${rows.length} row${rows.length===1?"":"s"} — paste into your timesheet or Excel`)).catch(()=>toast("Copy failed",true));};}
function efEstRows(A){const ids=[...new Set(A.R.filter(e=>efTaskOf(e.taskId)&&+efTaskOf(e.taskId).estimate).map(e=>e.taskId))];
  const rows=ids.map(id=>{const t=efTaskOf(id);return {t,a:efSum(efFor(id)),e:+t.estimate};}).sort((x,y)=>(y.a/y.e)-(x.a/x.e)),mx=Math.max(...rows.map(r=>Math.max(r.a,r.e)),1),N=34,u=mx/N;
  const noEst=new Set(A.R.filter(e=>{const t=efTaskOf(e.taskId);return t&&!+t.estimate;}).map(e=>e.taskId)).size;
  return rows.map(r=>{const na=Math.round(r.a/u),ne=Math.round(r.e/u),pen=efPen(r.t.id);let s=`<svg width="${N*6+4}" height="12" aria-hidden="true">`;
    for(let i=0;i<Math.max(na,ne);i++){const x=i*6+3;s+=i<na?`<circle cx="${x}" cy="6" r="2.2" style="fill:var(--${i<ne?pen:"bad"})"/>`:`<circle cx="${x}" cy="6" r="1.1" style="fill:var(--ink-4)"/>`;}
    s+=`<line x1="${ne*6+.5}" x2="${ne*6+.5}" y1="0" y2="12" style="stroke:var(--ink-2)"/></svg>`;const d=r.a-r.e;
    return `<div class="ef-erow" data-id="${r.t.id}" title="Open the demand's Effort tab"><span class="n"><b class="mono">${esc(r.t.demandId||"")}</b> <span class="faint">${esc(r.t.title)}</span></span><span class="v ${d>0?"ef-bad":""}">${efFh(r.a)} / ${efFh(r.e)} h${d>0?" · +"+efFh(d):""}</span>${s}</div>`;}).join("")
    +(noEst?`<div class="faint" style="font-size:11px;margin-top:8px">${noEst} demand${noEst===1?"":"s"} in range ha${noEst===1?"s":"ve"} no estimate — set one on its Effort tab.</div>`:"")
    ||`<div class="faint" style="font-size:12px">No demand work in this range.</div>`;}
function efReworkHTML(A,dem){const rw=A.R.filter(e=>{const t=efTaskOf(e.taskId);return t&&efStatusOn(t,e.date)==="bug";}),tot=efSum(rw);
  if(!tot)return `<div class="ef-big">0<small>h</small></div><div class="faint" style="margin-top:6px;font-size:12px">Nothing bounced back in this range.</div>`;
  const by=[...new Set(rw.map(e=>e.taskId))].map(id=>[id,efSum(rw.filter(e=>e.taskId===id))]).sort((a,b)=>b[1]-a[1]),mx=Math.max(...by.map(b=>b[1]));
  return `<div class="ef-big ef-bad">${efFh(tot)}<small>h · ${efPct(tot,dem)}% of demand work</small></div>`+by.map(([id,h])=>{const t=efTaskOf(id);return `<div class="ef-erow" data-id="${id}"><span class="n"><b class="mono">${esc(t.demandId||"")}</b> <span class="faint">${esc(t.title)}</span></span><span class="v">${efFh(h)} h</span>${efBarDots(h,Math.max(.5,mx/30),30,"bad")}</div>`;}).join("");}
function efRhythmHTML(A){const nm=["Mon","Tue","Wed","Thu","Fri"];
  const av=nm.map((_,i)=>{const es=A.R.filter(e=>efDow(e.date)===i+1),n=new Set(es.map(e=>e.date)).size||1;return {d:efSum(es.filter(e=>e.taskId||e.epicId))/n,o:efSum(es.filter(e=>!e.taskId&&!e.epicId))/n};});
  const best=Math.max(...av.map(v=>v.d));
  return `<div class="ef-rh">${av.map((v,i)=>{const nd=Math.round(v.d*2),no=Math.round(v.o*2);let s=`<svg width="10" height="100" aria-hidden="true">`;
    for(let j=0;j<20;j++)s+=`<circle cx="5" cy="${97.5-j*5}" r="${j<nd+no?2.1:.9}" style="fill:var(--${j<nd?"pen-2":j<nd+no?"ink-3":"ink-4"})"/>`;
    return `<div class="${v.d===best&&best>0?"rh-best":""}" title="${efFh(Math.round(v.d*10)/10)} h demand work · ${efFh(Math.round(v.o*10)/10)} h other">${s}<b>${efFh(Math.round(v.d*10)/10)}</b>${nm[i]}</div>`;}).join("")}</div>
    <div class="ef-legend" style="justify-content:center"><span><span class="ef-pd" style="--pen:var(--pen-2)"></span>demand work (the number)</span><span><span class="ef-pd" style="--pen:var(--ink-3)"></span>meetings, admin, support, learning</span></div>`;}
let efNoticeActs=[];
function efNoticedHTML(A,total,dem,unl){efNoticeActs=[];const out=[],act=(l,fn)=>{efNoticeActs.push(fn);return `<button class="sm" data-act="${efNoticeActs.length-1}">${l}</button>`;},g=efG();
  const k0=A.keys.find(k=>k!=="_non");if(k0){const m=efGMeta(k0);out.push([m.col,`<b>${esc(m.l)}</b>${m.sub?` <span class="faint">${esc(m.sub)}</span>`:""} took <b>${efPct(A.tot.get(k0),total)}%</b> of your hours — the most of any ${EF_GROUPS[g].toLowerCase()}.`,""]);}
  const over=[...new Set(A.R.filter(e=>e.taskId).map(e=>e.taskId))].map(efTaskOf).filter(t=>t&&+t.estimate&&efSum(efFor(t.id))>+t.estimate).sort((a,b)=>(efSum(efFor(b.id))-b.estimate)-(efSum(efFor(a.id))-a.estimate));
  over.slice(0,2).forEach(t=>out.push(["bad",`<b>${esc(demandLabel(t))}</b> is <b>${efFh(efSum(efFor(t.id))-t.estimate)} h over</b> its ${efFh(t.estimate)} h estimate.`,act("Open",()=>{view="demands";activeId=t.id;activeTab="effort";renderApp();})]));
  const rw=A.R.filter(e=>{const t=efTaskOf(e.taskId);return t&&efStatusOn(t,e.date)==="bug";});
  if(rw.length){const ids=[...new Set(rw.map(e=>e.taskId))].sort((a,b)=>efSum(rw.filter(e=>e.taskId===b))-efSum(rw.filter(e=>e.taskId===a)));
    out.push(["bad",`<b>${efFh(efSum(rw))} h</b> went to rework (${efPct(efSum(rw),dem)}% of demand work) — mostly <b>${esc(efName(ids[0]))}</b>.`,""]);}
  const recent=unl.filter(o=>o>=-14);if(recent.length)out.push(["watch",`<b>${recent.length} working day${recent.length>1?"s":""} with no log</b> in the last two weeks: ${recent.map(o=>efWdl(efOffD(o))).join(", ")}.`,`<span style="display:flex;gap:4px">${act("Fill "+efWdd(efOffD(recent[0])),()=>openLogTime({date:efOffD(recent[0])}))}${act("🏖 Day off",()=>openDaysOff({date:efOffD(recent[0])}))}</span>`]);
  if(total)out.push(["ink-3",`<b>${100-efPct(dem,total)}%</b> of your time wasn't demand work — meetings, admin, support and learning.`,""]);
  return out.map(([pen,h,b])=>`<div class="ef-nt" style="--pen:var(--${pen})"><i></i><span>${h}</span>${b}</div>`).join("")||`<div class="faint" style="font-size:12px">Log a few days and patterns show up here.</div>`;}
/* the day ledger: everything on one day, edit it, mark it as leave */
function openEfDay(date,hiKey){let d=document.getElementById("efDrw");
  /* a div, not an <aside>: the Instrument/Bench themes make every aside see-through so the dot grid shows behind the sidebars */
  if(!d){d=document.createElement("div");d.id="efDrw";d.className="efx ef-drw";d.setAttribute("role","dialog");d.setAttribute("aria-label","Day ledger");document.body.appendChild(d);
    const sc=document.createElement("div");sc.className="efx ef-scrim";sc.onclick=()=>d.classList.remove("on");d.after(sc);}
  d.dataset.date=date;d.dataset.key=hiKey||"";const es=state.efforts.filter(e=>e.date===date).sort((a,b)=>a.createdAt-b.createdAt),tot=efSum(es),lv=efOff(date);
  d.innerHTML=`<button class="sm ghost ef-x" id="efDrwX">✕ Close</button><span class="ef-lb">${lv?EF_OFF[lv.kind].icon+" "+esc(efOffTxt(lv)):"Day ledger"}</span><h2>${efLong(date)}</h2>
    <div class="ef-dsf" style="padding-bottom:12px;border-bottom:1px solid var(--rule);margin-bottom:4px">${efDayBar(tot,0)}<span><b>${efFh(tot)} h</b> of ${EF_DAY}</span></div>
    ${es.map(e=>{const k=efKey(e),t=efTaskOf(e.taskId),sb=efSubTitle(t,e.subtaskId);return `<div class="ef-de ${hiKey&&hiKey===k?"hi":""}" data-id="${e.id}" style="--pen:var(--${efPen(k)})"><i></i><div style="min-width:0"><b class="mono">${esc(efName(k))}</b>${t&&t.demandId?` <span class="faint">${esc(t.title)}</span>`:""}<div>${e.note?linkify(e.note):`<span class="faint">(no details)</span>`}</div>
      <div class="t"><span class="ef-tag" style="--pen:var(--${EF_ACTC[e.activity]})"><span class="ef-pd"></span>${esc(e.activity)}</span>${sb?`<span class="faint" style="font-size:10.5px">↳ ${esc(sb)}</span>`:""}</div></div>
      <div style="text-align:right"><span class="mono">${efFh(e.hours)} h</span><div class="ops"><button class="ghost sm" data-op="ed" title="Edit">✎</button><button class="ghost sm danger" data-op="rm" title="Delete">✕</button></div></div></div>`;}).join("")||`<div class="faint" style="padding:14px 0;font-size:12px">Nothing logged${lv?" — a day off":""}.</div>`}
    <div style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap">${date<=todayStr()?`<button class="sm primary" id="efDrwLog">＋ Log time for this day</button>`:""}${lv?`<button class="sm" id="efDrwOffEd">✎ Change</button><button class="sm" id="efDrwLeave">Not a day off</button>`:`<button class="sm" id="efDrwOffEd">🏖 Mark as holiday or leave…</button>`}</div>
    <p class="faint" style="font-size:11px;margin-top:10px;line-height:1.5">A holiday or leave day never counts as a day with no log.</p>`;
  void d.offsetWidth;d.classList.add("on");
  d.querySelector("#efDrwX").onclick=()=>d.classList.remove("on");
  if(d.querySelector("#efDrwLog"))d.querySelector("#efDrwLog").onclick=()=>openLogTime({date,key:hiKey||undefined});
  d.querySelector("#efDrwOffEd").onclick=()=>openDaysOff({date,kind:lv?lv.kind:undefined,label:lv?lv.label:""});
  if(d.querySelector("#efDrwLeave"))d.querySelector("#efDrwLeave").onclick=()=>{efClearOff(date);renderApp();openEfDay(date,hiKey);toast("No longer a day off");};
  d.querySelectorAll(".ef-de").forEach(r=>{const e=state.efforts.find(x=>x.id===r.dataset.id);if(!e)return;r.querySelector('[data-op="ed"]').onclick=()=>efEdit(e);r.querySelector('[data-op="rm"]').onclick=()=>efDelete(e);});}
function efCSV(){if(!state.efforts.length){toast("Nothing logged yet",true);return;}
  const rows=[["Date","Weekday","Epic","Demand ID","Demand title","Bucket","Activity","Hours","Subtask","What I did"]];
  state.efforts.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt).forEach(e=>{const t=efTaskOf(e.taskId);
    const ep=e.epicId?epicById(e.epicId):t&&t.epicId?epicById(t.epicId):null;
    rows.push([e.date,efFmt(e.date,{weekday:"short"}),ep?(ep.code||ep.name):(e.epicId?"(deleted epic)":""),t?t.demandId:"",t?t.title:e.jobId?(jobById(e.jobId)||{title:"(deleted task)"}).title:(e.taskId?"(deleted demand)":e.epicId?"(epic-level work)":""),e.taskId||e.epicId?"":e.jobId?"Task":EF_BUCKETS[e.bucket].l,e.activity,e.hours,efSubTitle(t,e.subtaskId),e.note]);});
  const csv="﻿"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
  const b=new Blob([csv],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="effort-"+todayStr()+".csv";a.click();URL.revokeObjectURL(a.href);
  toast("Exported "+(rows.length-1)+" time entries (CSV)");}
/* Today: what's logged, and days that slipped through */
function efTodayHTML(){const t=todayStr(),th=efSum(state.efforts.filter(e=>e.date===t)),mon=efMon(t),wk=efSum(state.efforts.filter(e=>e.date>=mon&&e.date<=t)),un=efUnlogged(14),tm=efTimer();
  return `<div class="dashcard efx ef-today"><h3>⏱ Time</h3>
    <div class="ef-dsf" style="margin:2px 0 8px">${efDayBar(th,0)}<span><b>${efFh(th)} h</b> logged today of ${EF_DAY} · <b>${efFh(wk)} h</b> this week</span></div>
    ${tm?`<div style="font-size:12px;margin-bottom:6px"><span class="ef-rec"></span> timer running on <b>${esc(efName(tm.key))}</b></div>`:""}
    ${un.length?`<div class="ef-un">⚠ ${un.length} working day${un.length>1?"s":""} with no log</div>${un.slice(0,5).map(d=>`<div class="ef-unr"><span class="mono">${efWdl(d)}</span><a href="#" data-fill="${d}">＋ Log</a><a href="#" data-off="${d}">🏖 Holiday / leave</a></div>`).join("")}${un.length>5?`<div class="faint" style="font-size:11px;margin-top:2px">…and ${un.length-5} earlier — a stretch away? Use 🏖 Days off with a To date.</div>`:""}`:""}
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="sm primary" id="efTLog">⏱ Log time</button><button class="sm" id="efTOff">🏖 Days off</button><button class="sm" id="efTOpen">Effort ›</button></div></div>`;}
function efWireToday(host){const q=s=>host.querySelector(s);
  if(q("#efTLog"))q("#efTLog").onclick=()=>openLogTime();if(q("#efTOpen"))q("#efTOpen").onclick=()=>{view="effort";renderApp();};
  if(q("#ckLog"))q("#ckLog").onclick=()=>openLogTime();if(q("#ckWin"))q("#ckWin").onclick=()=>openWin();
  host.querySelectorAll(".ef-today [data-fill]").forEach(a=>a.onclick=e=>{e.preventDefault();openLogTime({date:a.dataset.fill});});
  host.querySelectorAll(".ef-today [data-off]").forEach(a=>a.onclick=e=>{e.preventDefault();openDaysOff({date:a.dataset.off});});
  if(q("#efTOff"))q("#efTOff").onclick=()=>openDaysOff();}
{const b=document.getElementById("btnLog");if(b)b.onclick=()=>{if(efTimer())efTimerStop();else openLogTime();};
 const s=document.getElementById("sbEffort");if(s)s.onclick=()=>{view="effort";renderApp();};}

