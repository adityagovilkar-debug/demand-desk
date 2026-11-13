/* ===================== MOTION =====================
   The "Full" motion level (⋯ → Motion). Everything here moves because something happened
   or a value changed: the page powers on, readouts roll to a new value, a transport travels
   to the station it reached, a finished step flies into the day's hours, a save ripples
   across the dot grid, a workspace sweeps in, results decode, a running timer has a trace.
   Calm and Off leave all of it out. Replay — a period played back as a short film — is a
   button, so it works at any level. Nothing here changes data. */
const motionShow=()=>motionPref()==="show";
const MO={boot:false,view:null,vals:new Map(),tr:new Map(),hours:null,origin:null,sq:null,seen:null,raf:0};
const moHrsToday=()=>efSum(state.efforts.filter(e=>e.date===todayStr()));

/* ---------- power-on: the page draws itself, once per session ---------- */
function moPowerOn(){const root=document.querySelector(".ck-in");if(!root)return;
  const els=[...root.querySelectorAll(":scope>.ck-unit,:scope>.ck-sech,.ck-tiles>.ck-unit,.ck-grid>.ck-unit,.dash-grid>.dashcard")];
  els.forEach((el,i)=>el.animate([{clipPath:"inset(0 100% 0 0)",opacity:.25},{clipPath:"inset(0 0 0 0)",opacity:1}],{duration:560,delay:Math.min(1500,85*i),easing:"cubic-bezier(.2,.8,.2,1)",fill:"backwards"}));
  const m=document.querySelector("main");if(!m)return;const r=m.getBoundingClientRect(),l=document.createElement("i");l.className="mo-scanh";l.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px`;document.body.appendChild(l);
  l.animate([{transform:"translateY(0)",opacity:.9},{transform:`translateY(${r.height}px)`,opacity:.15}],{duration:1300,easing:"cubic-bezier(.3,0,.3,1)"}).onfinish=()=>l.remove();}
/* ---------- a workspace sweeps in behind a scan line ---------- */
function moScan(){const m=document.querySelector("main");if(!m)return;const r=m.getBoundingClientRect(),l=document.createElement("i");l.className="mo-scanv";l.style.cssText=`left:${r.left}px;top:${r.top}px;height:${r.height}px`;document.body.appendChild(l);
  l.animate([{transform:"translateX(0)",opacity:.9},{transform:`translateX(${r.width}px)`,opacity:.2}],{duration:440,easing:"cubic-bezier(.4,0,.2,1)"}).onfinish=()=>l.remove();
  m.animate([{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0 0 0)"}],{duration:440,easing:"cubic-bezier(.4,0,.2,1)"});}
/* ---------- readouts roll to their new value ---------- */
const MO_ROLL="#detail .bro-i .v,#detail .ck-tile .ft>span:first-child,#detail .ag-foot b,#detail .ck-sub b,#detail .wr-big";
function moRoll(boot){const ctx=[view,view==="demands"?activeId:view==="jobs"?activeJobId:view==="epics"?activeEpicId:view==="meetings"?activeMeetingId:""].join("|");
  document.querySelectorAll(MO_ROLL).forEach((el,i)=>{const tn=el.firstChild;if(!tn||tn.nodeType!==3||el._roll)return;const m=/^(\s*)(\d+(?:\.\d+)?)(\s*h?\s*)$/.exec(tn.nodeValue);if(!m)return;
    const lab=(el.parentElement.querySelector(".k")||{}).textContent||"",key=ctx+"|"+lab+"|"+(lab?"":i),val=+m[2],prev=MO.vals.get(key);MO.vals.set(key,val);
    const from=boot?0:prev;if(from==null||from===val)return;const dec=(m[2].split(".")[1]||"").length,t0=performance.now(),dur=boot?1100:560;el._roll=1;
    const step=now=>{const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);tn.nodeValue=m[1]+(from+(val-from)*e).toFixed(dec)+m[3];if(p<1)requestAnimationFrame(step);else el._roll=0;};requestAnimationFrame(step);});}
/* ---------- a dot that flies from where something happened to where it counts ---------- */
function moFly(x0,y0,to,col,done){if(!to)return;const r=to.getBoundingClientRect(),x1=r.left+Math.min(r.width/2,50),y1=r.top+r.height/2,mx=(x0+x1)/2,my=Math.min(y0,y1)-70;
  for(let i=0;i<6;i++){const d=document.createElement("i");d.className="mo-dot";d.style.cssText=`background:${col};width:${9-i}px;height:${9-i}px;opacity:${1-i*.15}`;document.body.appendChild(d);
    d.animate([{transform:`translate(${x0}px,${y0}px)`},{transform:`translate(${mx}px,${my}px)`,offset:.5},{transform:`translate(${x1}px,${y1}px) scale(.6)`}],{duration:760,delay:i*42,easing:"cubic-bezier(.3,.1,.2,1)",fill:"both"})
      .onfinish=()=>{d.remove();if(!i){to.classList.remove("mo-ping");void to.offsetWidth;to.classList.add("mo-ping");if(done)done();}};}}
/* ticking something done: remember where, and fly once the step is really gone or its time is logged */
document.addEventListener("click",e=>{if(!motionShow())return;const b=e.target.closest&&e.target.closest(".ag-acts button,#na-done,#cxNaDone,#jb-nadone");if(!b)return;
  const row=b.closest(".ag-row"),r=(row||b).getBoundingClientRect(),dot=row&&row.querySelector(".ag-k i");
  MO.origin={x:r.left+(row?90:r.width/2),y:r.top+r.height/2,col:dot?getComputedStyle(dot).backgroundColor:"var(--pen-2)",t:Date.now(),items:agendaItems().length,hrs:moHrsToday()};},true);
function moDoneFly(){const o=MO.origin;if(!o)return;if(Date.now()-o.t>180000){MO.origin=null;return;}
  if(document.querySelector("#modalRoot .modal-bg,.ask-bg"))return;if(!(agendaItems().length<o.items||moHrsToday()>o.hrs))return;MO.origin=null;
  moFly(o.x,o.y,document.querySelector(".ag-foot svg")||document.getElementById("sbEffort")||document.getElementById("btnLog"),o.col);}
/* the day's bar fills dot by dot; a full working day closes the ring */
function moDayFill(){const h=moHrsToday(),prev=MO.hours;MO.hours=h;const foot=document.querySelector(".ag-foot");if(!foot)return;const svg=foot.querySelector("svg");
  if(h>=EF_DAY&&!foot.querySelector(".mo-full")){const s=document.createElement("span");s.className="mo-full"+(prev!=null&&prev<EF_DAY?" go":"");s.title="A full working day logged";
    s.innerHTML=`<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6.5"/><path d="M6 9.3l2.1 2.1 4-4.4"/></svg>`;svg&&svg.after(s);}
  if(prev==null||h<=prev||!svg)return;const cs=[...svg.querySelectorAll("circle")];
  for(let i=Math.floor(prev*2);i<Math.round(h*2)&&i<cs.length;i++){cs[i].style.transformBox="fill-box";cs[i].style.transformOrigin="center";
    cs[i].animate([{transform:"scale(0)"},{transform:"scale(1.9)",offset:.6},{transform:"scale(1)"}],{duration:420,delay:(i-Math.floor(prev*2))*70+700,easing:"ease-out",fill:"backwards"});}}
/* ---------- a transport travels to the station it reached (the board) ---------- */
function moTransports(){document.querySelectorAll("#detail .tb-row[data-key]").forEach(row=>{const k=row.dataset.key,chips=[...row.querySelectorAll(".tb-st")],n=chips.filter(c=>c.classList.contains("on")).length,prev=MO.tr.get(k);MO.tr.set(k,n);
    if(prev==null||n<=prev)return;const a=chips[prev-1],b=chips[n-1];if(!a||!b)return;const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(),d=document.createElement("i");
    d.className="mo-dot";d.style.cssText="background:var(--ink);width:9px;height:9px";document.body.appendChild(d);b.classList.add("mo-wait");row.classList.add("mo-moved");
    d.animate([{transform:`translate(${ra.left+ra.width/2}px,${ra.top+ra.height/2}px)`},{transform:`translate(${rb.left+rb.width/2}px,${rb.top+rb.height/2}px)`}],{duration:820,delay:120,easing:"cubic-bezier(.5,0,.2,1)",fill:"both"})
      .onfinish=()=>{d.remove();b.classList.remove("mo-wait");b.classList.add("mo-ping");};});}
/* ---------- a save sends one ring across the dot grid ---------- */
function moRipple(el){if(!el||document.hidden)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,cv=document.createElement("canvas"),W=innerWidth,H=innerHeight,dpr=window.devicePixelRatio||1;
  cv.className="mo-rip";cv.width=W*dpr;cv.height=H*dpr;document.body.appendChild(cv);const c=cv.getContext("2d");c.scale(dpr,dpr);
  const max=Math.hypot(Math.max(cx,W-cx),Math.max(cy,H-cy)),t0=performance.now(),P=20,band=38,col=DK.C["pen-2"]||"#1B4FA0";
  const step=now=>{const p=(now-t0)/1200;if(p>=1){cv.remove();return;}const R=p*max;c.clearRect(0,0,W,H);c.fillStyle=col;
    for(let x=Math.max(0,Math.floor((cx-R-band)/P)*P);x<=Math.min(W,cx+R+band);x+=P)for(let y=Math.max(0,Math.floor((cy-R-band)/P)*P);y<=Math.min(H,cy+R+band);y+=P){
      const d=Math.hypot(x-cx,y-cy)-R;if(d>-band&&d<band){const k=1-Math.abs(d)/band;c.globalAlpha=k*(1-p)*.8;c.beginPath();c.arc(x,y,.8+k*2,0,6.2832);c.fill();}}
    requestAnimationFrame(step);};requestAnimationFrame(step);}
{const saved=markSaved;markSaved=function(){saved();if(motionShow())moRipple(document.getElementById("btnSave"));};}
/* ---------- results decode in; Seen before scans once per demand ---------- */
function moDecodeEl(el,ms){if(el._mo)return;el._mo=1;const html=el.innerHTML,text=el.textContent;if(!text.trim())return;V2.decode(el,text,ms);setTimeout(()=>{if(el.isConnected)el.innerHTML=html;},text.length*ms+90);}
function moDecode(){if(view==="search"&&typeof SRCH!=="undefined"&&MO.sq!==SRCH.q+"|"+SRCH.kind+"|"+SRCH.year){MO.sq=SRCH.q+"|"+SRCH.kind+"|"+SRCH.year;
    document.querySelectorAll("#detail .sr-hit .sr-h b").forEach((el,i)=>{if(i<10)setTimeout(()=>el.isConnected&&moDecodeEl(el,14),i*45);});}
  const sb=document.querySelector(".seenb");if(sb&&view==="demands"&&MO.seen!==activeId){MO.seen=activeId;sb.classList.add("mo-scan");sb.querySelectorAll(".sb-r").forEach((r,i)=>r.style.animationDelay=(250+i*110)+"ms");}}
/* ---------- a running timer has a trace in the title bar ---------- */
function moTimerScope(){const b=document.getElementById("btnLog");if(!b)return null;let cv=document.getElementById("moScope");
  if(!cv){cv=document.createElement("canvas");cv.id="moScope";cv.width=120;cv.height=44;cv.title="A timer is running";b.parentElement.insertBefore(cv,b);}
  const on=motionShow()&&!!efTimer();cv.style.display=on?"":"none";return on?cv:null;}
setInterval(()=>{const cv=moTimerScope();if(!cv||document.hidden)return;const c=cv.getContext("2d"),w=cv.width,h=cv.height,t=performance.now()/1000;c.clearRect(0,0,w,h);
  c.strokeStyle=DK.C["pen-1"]||"#D93A1E";c.lineWidth=2.2;c.lineJoin="round";c.beginPath();let ly=h/2;
  for(let x=0;x<=w-8;x+=2){const u=((x/w)*1.6-t*.55)%1,v=u<0?u+1:u;let y=Math.sin(v*50)*.7;if(v>.40&&v<.47)y=-(v-.40)/.07*15;else if(v>=.47&&v<.53)y=-15+(v-.47)/.06*27;else if(v>=.53&&v<.59)y=12-(v-.53)/.06*12;
    ly=h/2+y;x?c.lineTo(x,ly):c.moveTo(x,ly);}c.stroke();c.fillStyle=c.strokeStyle;c.beginPath();c.arc(w-7,ly,3,0,6.2832);c.fill();},60);

/* ---------- after anything is drawn ---------- */
function motionAfterRender(){document.documentElement.classList.toggle("mo-show",motionShow());
  if(!motionShow()){MO.view=view;MO.boot=true;MO.hours=moHrsToday();return;}
  const first=!MO.boot;if(first){MO.boot=true;if(view==="today"&&contentCount()>0&&document.querySelector(".ck-in"))moPowerOn();}else if(MO.view!==view)moScan();
  MO.view=view;moRoll(first);moTransports();moDoneFly();moDayFill();moDecode();}
{const d=document.getElementById("detail");if(d)new MutationObserver(()=>{if(!MO.raf)MO.raf=requestAnimationFrame(()=>{MO.raf=0;try{motionAfterRender();}catch(e){console.error(e);}});}).observe(d,{childList:true,subtree:true});}

/* ===================== REPLAY — a period played back as a short film ===================== */
function replayData(from,to){if(to>todayStr())to=todayStr();const days=[];for(let d=from;d<=to&&days.length<800;d=efAdd(d,1))days.push(d);
  const hrs=new Map(),top=new Map();state.efforts.forEach(e=>{if(e.date<from||e.date>to)return;hrs.set(e.date,(hrs.get(e.date)||0)+e.hours);const m=top.get(e.date)||new Map(),k=efKey(e);m.set(k,(m.get(k)||0)+e.hours);top.set(e.date,m);});
  const pen=new Map();top.forEach((m,d)=>pen.set(d,efPen([...m].sort((a,b)=>b[1]-a[1])[0][0])));
  const ev=[],inP=d=>d&&d>=from&&d<=to;
  state.tasks.forEach(t=>{if(inP(t.receivedDate))ev.push({d:t.receivedDate,k:"new",tx:"Received "+demandLabel(t)});
    (t.timeline||[]).forEach(e=>{const d=isoTs(e.ts);if(inP(d)&&e.type==="status"&&e.to==="delivered")ev.push({d,k:"del",tx:"Delivered "+demandLabel(t)});});
    t.transports.forEach(tr=>effectiveSyncs(t,tr).forEach(s=>{if(inP(s.date))ev.push({d:s.date,k:"tr",tx:`${tr.number||"Transport"} reached ${s.system}`});}));
    (t.lessons||[]).forEach(l=>{if(inP(l.date))ev.push({d:l.date,k:"win",tx:"Lesson — "+l.text.split("\n")[0].slice(0,70)});});});
  state.wins.forEach(w=>{if(inP(w.date))ev.push({d:w.date,k:"win",tx:w.text.slice(0,80)});});
  state.jobs.forEach(j=>{if(j.status==="done"&&inP(j.closedOn))ev.push({d:j.closedOn,k:"task",tx:"Answered — "+j.title});});
  ev.sort((a,b)=>a.d.localeCompare(b.d));return {days,hrs,pen,ev};}
const RP_KIND={new:["pen-2","Received"],del:["pen-3","Delivered"],tr:["pen-4","Transports moved"],win:["pen-5","Wins & lessons"],task:["pen-7","Tasks answered"]};
function openReplay(from,to,title){const D=replayData(from,to),N=D.days.length;if(!N){toast("Nothing in that period yet",true);return;}
  const ov=document.createElement("div");ov.className="rp-bg";ov.innerHTML=`<canvas></canvas><div class="rp-bar"><span class="rp-t">Replay · ${esc(title)}</span><button class="sm" id="rpAgain">↻ Again</button><button class="sm primary" id="rpClose">Close</button></div>`;
  document.body.appendChild(ov);const cv=ov.querySelector("canvas"),c=cv.getContext("2d"),C=DK.C,dur=Math.max(6500,Math.min(16000,N*48));let t0=performance.now(),raf=0,dead=false;
  const cum=[];{let h=0,i=0;const k={new:0,del:0,tr:0,win:0,task:0};D.days.forEach(d=>{h+=D.hrs.get(d)||0;while(i<D.ev.length&&D.ev[i].d<=d){k[D.ev[i].k]++;i++;}cum.push({h,ei:i,...k});});}
  const mono=DK.MONO,L=(tx,x,y,o)=>DK.label(c,tx,x,y,o);
  const draw=now=>{if(dead)return;const dpr=window.devicePixelRatio||1,W=ov.clientWidth,H=ov.clientHeight;if(cv.width!==W*dpr||cv.height!==H*dpr){cv.width=W*dpr;cv.height=H*dpr;}
    c.setTransform(dpr,0,0,dpr,0,0);c.globalAlpha=1;c.fillStyle=C.paper;c.fillRect(0,0,W,H);
    const p=Math.min(1,(now-t0)/dur),fp=p*N,di=Math.min(N-1,Math.floor(fp)),S=cum[di],pad=Math.max(36,W*.06),side=Math.min(300,W*.24),gx=pad,gw=W-pad*2-side-30,top=150;
    L(String(title).toUpperCase(),pad,62,{size:10,spacing:2.4,align:"left",color:C["ink-3"]});
    L(efFmt(D.days[di],{weekday:"short",day:"numeric",month:"long",year:"numeric"}),pad,100,{font:mono,size:30,weight:500,align:"left",color:C.ink});
    /* the days: a column per week, a dot per day — its size the hours, its colour where most of them went */
    const first=efMon(D.days[0]),weeks=Math.floor((new Date(D.days[N-1]+"T00:00:00")-new Date(first+"T00:00:00"))/6048e5)+1,cell=Math.max(9,Math.min(gw/weeks,(H-top-230)/7,64)),ox=gx+(gw-cell*weeks)/2;
    ["M","T","W","T","F","S","S"].forEach((d,r)=>L(d,ox-14,top+r*cell+cell/2,{size:8,color:C["ink-3"]}));
    D.days.forEach((d,j)=>{const wk=Math.floor((new Date(d+"T00:00:00")-new Date(first+"T00:00:00"))/6048e5),r=(efDow(d)+6)%7,x=ox+wk*cell+cell/2,y=top+r*cell+cell/2,age=fp-j,h=D.hrs.get(d)||0;
      if(d.slice(8)==="01"||(j===0&&+d.slice(8)<=20))L(efFmt(d,{month:"short"}).toUpperCase(),x,top-14,{size:8,spacing:1.4,color:C["ink-3"]});
      if(age<0||!h){DK.dot(c,x,y,age<0?1:1.3,age<0?C["ink-4"]:(efOff(d)?C["pen-5"]:C["ink-4"]),age<0?.7:1);return;}
      const k=Math.min(1,age/1.6),e=1-Math.pow(1-k,3),R=Math.min(cell*.34,cell*.07+Math.min(1.3,h/EF_DAY)*cell*.2);
      DK.dot(c,x,y,R*(k<1?e*1.25-(e*.25*k):1),C[D.pen.get(d)]||C["pen-2"],.92);if(k<1)DK.ring(c,x,y,R+10*k,C[D.pen.get(d)]||C["pen-2"],(1-k)*.6);});
    {const d=D.days[di],wk=Math.floor((new Date(d+"T00:00:00")-new Date(first+"T00:00:00"))/6048e5),r=(efDow(d)+6)%7;DK.ring(c,ox+wk*cell+cell/2,top+r*cell+cell/2,Math.min(cell*.5,14),C.ink,.9,1.2);}
    /* the counters */
    const sx=W-pad-side;let sy=top+6;c.globalAlpha=1;
    L("HOURS LOGGED",sx,sy,{size:9,spacing:2,align:"left",color:C["ink-3"]});
    {const prevH=di?cum[di-1].h:0,hv=prevH+(S.h-prevH)*(fp-di),str=String(Math.round(hv)),cellM=Math.min(7,side/(V2.matrixLayout(str).cols+1));V2.matrixText(c,C,str,sx,sy+14,cellM,C.ink);sy+=14+cellM*8+22;}
    Object.entries(RP_KIND).forEach(([k,[pn,lb]])=>{DK.dot(c,sx+4,sy,3.2,C[pn]);L(lb.toUpperCase(),sx+16,sy,{size:9,spacing:1.6,align:"left",color:C["ink-3"]});L(String(S[k]),sx+side-4,sy,{font:mono,size:20,weight:500,align:"right",color:C.ink});sy+=34;});
    /* what just happened */
    const ty=H-150;c.globalAlpha=1;L("AS IT HAPPENED",pad,ty-22,{size:9,spacing:2,align:"left",color:C["ink-3"]});
    for(let n=0;n<4;n++){const e=D.ev[S.ei-1-n];if(!e)break;const a=1-n*.24;DK.dot(c,pad+4,ty+n*24,3,C[RP_KIND[e.k][0]],a);
      L(efFmt(e.d,{day:"2-digit",month:"short"}),pad+16,ty+n*24,{font:mono,size:10.5,weight:400,align:"left",color:DK.fade(C["ink-3"],a)});L(e.tx,pad+78,ty+n*24,{size:13,weight:n?400:600,align:"left",color:DK.fade(C.ink,a)});}
    /* progress */
    c.globalAlpha=1;for(let x=pad;x<W-pad;x+=8)DK.dot(c,x,H-36,x<pad+(W-pad*2)*p?1.6:.9,x<pad+(W-pad*2)*p?C.ink:C["ink-4"]);
    if(p<1)raf=requestAnimationFrame(draw);else{c.globalAlpha=1;L(`${N} days · ${efFh(Math.round(S.h))} h · ${S.del} delivered · ${S.tr} transport moves`,W-pad,100,{font:mono,size:12,weight:400,align:"right",color:C["ink-2"]});}};
  const close=()=>{dead=true;cancelAnimationFrame(raf);document.removeEventListener("keydown",key,true);ov.remove();};
  const key=e=>{if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();close();}};document.addEventListener("keydown",key,true);
  ov.querySelector("#rpClose").onclick=close;ov.querySelector("#rpAgain").onclick=()=>{cancelAnimationFrame(raf);t0=performance.now();raf=requestAnimationFrame(draw);};
  raf=requestAnimationFrame(draw);}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#rvReplay,#wrReplay");if(!b)return;
  if(b.id==="rvReplay"){const P=rvPeriod();openReplay(P.from,P.to,P.l);}else{const mon=efMon(todayStr());openReplay(mon,efAdd(mon,6),"The week of "+efSh(mon));}});
