import sys
# python instrument-v2.patch.py <file.html> — Demand Desk on Instrument v2 (the Field Guide picks, 2026-11-10).
# Applied to mockups/instrument-v2.html first; to DemandDesk.html once approved.
P = sys.argv[1]
s = open(P, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"expected {count} of: {old[:100]!r}, found {n}")
    s = s.replace(old, new)

# ---------------------------------------------------------------- the v2 kit (after DK)
rep('''  return{TAU,C,readColors,dot,ring,dotArc,dotRing,label,rng,scope,fade,get MONO(){return MONO;}};
})();''', r'''  return{TAU,C,readColors,dot,ring,dotArc,dotRing,label,rng,scope,fade,get MONO(){return MONO;}};
})();
/* ---------- Instrument v2 (the Field Guide picks) — ported from Bench's dots.js "V2" section.
   Every piece carries a value or a state; every one resolves to its final frame when motion is off.
   Colours are passed in (C), so the classic themes' fallbacks work too. ---------- */
const V2=(()=>{const {dot,ring,label}=DK,TAU=Math.PI*2,cl=v=>v<0?0:v>1?1:v,still=()=>!motionOn();
  /* matrix readout: a 5×7 dot font; unlit cells always drawn. ';' is a blank colon for blinking a clock */
  const F={"0":["01110","10001","10011","10101","11001","10001","01110"],"1":["00100","01100","00100","00100","00100","00100","01110"],"2":["01110","10001","00001","00010","00100","01000","11111"],
    "3":["11110","00001","00001","01110","00001","00001","11110"],"4":["00010","00110","01010","10010","11111","00010","00010"],"5":["11111","10000","11110","00001","00001","10001","01110"],
    "6":["00110","01000","10000","11110","10001","10001","01110"],"7":["11111","00001","00010","00100","01000","01000","01000"],"8":["01110","10001","10001","01110","10001","10001","01110"],
    "9":["01110","10001","10001","01111","00001","00010","01100"],":":["0","0","1","0","1","0","0"],";":["0","0","0","0","0","0","0"],".":["0","0","0","0","0","0","1"],
    "-":["000","000","000","111","000","000","000"],"+":["000","000","010","111","010","000","000"]," ":["000","000","000","000","000","000","000"]};
  const lay=new Map();
  function matrixLayout(str){str=String(str);if(lay.has(str))return lay.get(str);let cols=0;const on=new Set();
    for(const ch of str){const g=F[ch]||F[" "];for(let r=0;r<7;r++)for(let k=0;k<g[r].length;k++)if(g[r][k]==="1")on.add((cols+k)+","+r);cols+=g[0].length+1;}
    const L={cols:Math.max(0,cols-1),on};if(lay.size>300)lay.clear();lay.set(str,L);return L;}
  const matrixFit=(str,w,h)=>Math.min(w/Math.max(1,matrixLayout(str).cols),h/7);
  const mxW=(str,h)=>Math.ceil(matrixLayout(str).cols*h/7);
  function matrixText(c,C,str,x,y,cell,col){const L=matrixLayout(str),lit=cell*.4,off=Math.max(.6,cell*.11);
    for(let k=0;k<L.cols;k++)for(let r=0;r<7;r++){const px=x+k*cell+cell/2,py=y+r*cell+cell/2;if(L.on.has(k+","+r))dot(c,px,py,lit,col);else dot(c,px,py,off,C["ink-4"]);}
    return L.cols*cell;}
  /* matrix wipe: the old value flips to the new in a diagonal wave (16 ms a cell), the wavefront in a pen */
  function matrixWipe(c,C,from,to,x,y,cell,age,col,wave){const A=matrixLayout(from),B=matrixLayout(to),cols=Math.max(A.cols,B.cols),lit=cell*.4,off=Math.max(.6,cell*.11);if(still())age=1e9;
    for(let k=0;k<cols;k++)for(let r=0;r<7;r++){const o0=A.on.has(k+","+r),o1=B.on.has(k+","+r),lp=cl((age-(k+r)*16)/220);let v=o1?1:0;
      if(o0!==o1)v=lp<.5?(o0?1-2*lp:0):(o1?2*lp-1:0);const px=x+k*cell+cell/2,py=y+r*cell+cell/2,front=lp>0&&lp<1;
      if(v>.02)dot(c,px,py,off+(lit-off)*v,front?wave:col);else dot(c,px,py,off,front?wave:C["ink-4"],front?.6:1);}}
  /* leader callout: a label on a thin elbow line, like a technical drawing; flips left near the right edge */
  function callout(c,C,px,py,text,ly,col,w){const up=ly<py,flip=px>w-130,ex=flip?px-10:px+10;
    c.globalAlpha=.8;c.strokeStyle=col;c.lineWidth=.8;c.beginPath();c.moveTo(px,up?py-5:py+5);c.lineTo(px,ly);c.lineTo(ex,ly);c.stroke();
    label(c,text,flip?ex-3:ex+3,ly,{font:DK.MONO,size:9.5,weight:500,color:C.ink,align:flip?"right":"left"});ring(c,px,py,4.5,col,.9);dot(c,px,py,1.8,col);}
  /* dot calendar: weeks as columns (Mon on top); size + ink = the amount; 0 = ghost, null = not a working day; ring = today */
  const M3=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  function dotCalendar(c,C,x0,y0,w,h,vals,col){const end=new Date(),tr=(end.getDay()+6)%7,weeks=Math.ceil((vals.length+6-tr)/7)||1,L=20,T=16,cell=Math.min((w-L)/weeks,(h-T)/7);
    const start=new Date(end);start.setDate(end.getDate()-tr-7*(weeks-1));
    for(let i=0;i<weeks;i++){const d=new Date(start);d.setDate(start.getDate()+7*i);if(d.getDate()<=7)label(c,M3[d.getMonth()],x0+L+i*cell,y0+6,{size:7.5,align:"left",spacing:1,color:C["ink-3"]});
      for(let j=0;j<7;j++){const x=x0+L+i*cell+cell/2,y=y0+T+j*cell+cell/2,back=(weeks-1-i)*7+(tr-j),v=vals[vals.length-1-back];
        if(back<0){dot(c,x,y,.55,C["ink-4"],.5);continue;}
        if(v==null)ring(c,x,y,1.4,C["ink-4"]);else if(!v)dot(c,x,y,.8,C["ink-4"]);else dot(c,x,y,1+(cell*.38-1)*Math.sqrt(cl(v)),col,.35+.65*cl(v));
        if(back===0)ring(c,x,y,cell*.48,C.ink,.9);}}
    ["M","W","F"].forEach((t,k)=>label(c,t,x0+4,y0+T+k*2*cell+cell/2,{size:7.5,align:"left",color:C["ink-3"]}));}
  /* rail timeline: solid = done, pen + slow pulse = now, hollow = ahead; date above, stage below */
  function rail(c,C,x0,x1,y,st,cur,col,t){const n=st.length,X=i=>n<2?x0:x0+(x1-x0)*i/(n-1),xc=cur<0?x0-1:X(Math.min(cur,n-1));
    for(let x=x0;x<=x1;x+=4)dot(c,x,y,x<=xc?1.1:.8,x<=xc?C.ink:C["ink-4"]);
    st.forEach((s,i)=>{const x=X(i);
      if(i<cur)dot(c,x,y,3.3,C.ink);
      else if(i===cur){dot(c,x,y,3.8,col);if(!still()){const p=(t%1800)/1800;ring(c,x,y,4.5+p*10,col,(1-p)*.6);}}
      else{dot(c,x,y,3.6,C.paper);ring(c,x,y,3.3,C["ink-3"]);}
      label(c,String(s.label).toUpperCase(),x,y+20,{size:8,color:i===cur?C.ink:C["ink-3"],spacing:1.2});
      if(s.date)label(c,s.date,x,y-18,{font:DK.MONO,size:9.5,weight:500,color:i<=cur?C["ink-2"]:C["ink-4"]});});}
  /* knob: a dot gauge you turn by dragging, scrolling or the arrow keys */
  function dotKnob(c,C,cx,cy,R,frac,col,{value="",name=""}={}){const n=27,a0=.78*Math.PI,sw=1.44*Math.PI,f=cl(frac);
    for(let i=0;i<n;i++){const t=i/(n-1),a=a0+sw*t,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;if(t<=f+1e-6&&f>0)dot(c,x,y,1.6+.5*t,col,.45+.55*t/Math.max(f,.01));else dot(c,x,y,1.05,C["ink-4"]);}
    ring(c,cx,cy,R-10,C["rule-strong"]);const a=a0+sw*f;dot(c,cx+Math.cos(a)*(R-15),cy+Math.sin(a)*(R-15),2,C.ink);
    label(c,String(value),cx,cy-1,{font:DK.MONO,size:14,color:C.ink});if(name)label(c,String(name).toUpperCase(),cx,cy+13,{size:7,spacing:1.4,color:C["ink-3"]});}
  function bindKnob(cv,get,set,step){let drag=null;cv.tabIndex=0;cv.style.touchAction="none";cv.style.cursor="ns-resize";
    cv.addEventListener("pointerdown",e=>{drag={y:e.clientY,v:get()};cv.setPointerCapture(e.pointerId);});
    cv.addEventListener("pointermove",e=>{if(drag)set(cl(drag.v+(drag.y-e.clientY)/140));});
    cv.addEventListener("pointerup",()=>drag=null);
    cv.addEventListener("wheel",e=>{e.preventDefault();set(cl(get()-Math.sign(e.deltaY)*step));},{passive:false});
    cv.addEventListener("keydown",e=>{const d={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[e.key];if(!d)return;e.preventDefault();set(cl(get()+d*step));});}
  /* decode: an ID arrives as glyphs that settle one character every 40 ms */
  const G="#%&*+=-:/<>0123456789ABCDEFX";
  function decode(el,text,ms=40){if(el._dec)cancelAnimationFrame(el._dec);if(still()){el.textContent=text;return;}const t0=performance.now();
    const step=now=>{const k=Math.floor((now-t0)/ms);el.textContent=text.slice(0,k)+[...text.slice(k)].map(ch=>ch===" "?" ":G[(Math.random()*G.length)|0]).join("");
      if(k>=text.length){el.textContent=text;el._dec=0;}else el._dec=requestAnimationFrame(step);};el._dec=requestAnimationFrame(step);}
  /* segmented control: an ink indicator slides from the old choice to the new one (the page re-renders in between) */
  const segPos={};
  function segSlide(){document.querySelectorAll(".ef-sg[id]").forEach(sg=>{let ind=sg.querySelector(".sgi");if(!ind){ind=document.createElement("span");ind.className="sgi";sg.prepend(ind);sg.classList.add("has-sgi");}
    const on=sg.querySelector("button.on");if(!on){ind.style.opacity="0";return;}ind.style.opacity="1";
    const to={x:on.offsetLeft,w:on.offsetWidth},from=segPos[sg.id];segPos[sg.id]=to;
    if(from&&!still()&&(from.x!==to.x||from.w!==to.w)){ind.style.transition="none";ind.style.width=from.w+"px";ind.style.transform=`translateX(${from.x}px)`;void ind.offsetWidth;ind.style.transition="";}
    ind.style.width=to.w+"px";ind.style.transform=`translateX(${to.x}px)`;});}
  return{matrixLayout,matrixFit,mxW,matrixText,matrixWipe,callout,dotCalendar,rail,dotKnob,bindKnob,decode,segSlide};})();
/* after every render: slide the segmented controls; decode a demand's ID the first time it opens.
   Effort and Review redraw themselves without renderApp, so new controls are also picked up as they appear. */
let v2LastId=null,v2Mo=0;
{const d=document.getElementById("detail");if(d)new MutationObserver(()=>{if(!v2Mo)v2Mo=requestAnimationFrame(()=>{v2Mo=0;V2.segSlide();});}).observe(d,{childList:true,subtree:true});}
function v2AfterRender(){V2.segSlide();const el=document.querySelector(".bhead .bh-id");
  if(el&&activeId&&v2LastId!==activeId){v2LastId=activeId;V2.decode(el,el.textContent);}}
/* the ink stamp — only for real milestones: a demand delivered or closed, a task reported back */
function vStamp(text,pen,fresh){return `<span class="vstamp ${fresh?"in":""}" style="--pen:${pen}">${esc(text)}</span>`;}
function demandStamp(t){if(!["delivered","closed"].includes(t.status))return "";
  const ev=(t.timeline||[]).filter(e=>e.type==="status"&&e.to===t.status).sort((a,b)=>b.ts-a.ts)[0];
  return vStamp(`${t.status==="closed"?"CLOSED":"DELIVERED"}${ev?" · "+shortD(isoTs(ev.ts)).toUpperCase():""}`,t.status==="closed"?"var(--ink-2,var(--muted))":"var(--good,var(--green))",ev&&Date.now()-ev.ts<6000);}''')

rep('''function renderApp(){
  EF_DAY=+state.settings.dayHours||8;renderNewerBar();''', '''function renderApp(){
  EF_DAY=+state.settings.dayHours||8;renderNewerBar();requestAnimationFrame(v2AfterRender);''')

# ---------------------------------------------------------------- 1. save state = an honest state light
rep('''  if(diskConflict){el.textContent="⚠ File changed on disk";el.className="savestate conflict";
    el.title="Auto-save is paused so nothing gets overwritten — click to decide";el.onclick=()=>resolveDiskConflict();return;}
  if(dirty){el.textContent=(fileHandle?"● Unsaved":"● Not saved")+lock;el.className="savestate dirty";}
  else{el.textContent=(fileHandle?(lastSaveAuto?"✓ Auto-saved":"✓ Saved"):"")+lock;el.className="savestate saved";}}''',
    '''  /* an honest state light: what it is, why, and the fix (live · stale · not set up · fault) */
  const st=(k,txt,why,cls)=>{el.innerHTML=`<i class="vic ${k}"></i>${esc(txt)}${lock}`;el.className="savestate "+cls;el.title=why;};
  if(diskConflict){st("fault","File changed on disk","Something else changed your data file, so auto-save is paused and nothing gets overwritten. Click to decide which copy wins.","conflict");el.onclick=()=>resolveDiskConflict();return;}
  if(dirty){if(fileHandle)st("stale","Unsaved",`Changes since the last save${state.settings.autosave?" — auto-save writes them within 30 s":""}. Ctrl+S saves now.`,"dirty");
    else st("nm","Not saved","No data file chosen yet, so your changes live only in this browser's backup. Fix: 💾 Save and pick a file.","dirty");}
  else if(fileHandle)st("live",lastSaveAuto?"Auto-saved":"Saved",`Everything is in ${fileHandle.name}.`,"saved");
  else{el.innerHTML="";el.className="savestate saved";}}''')

# ---------------------------------------------------------------- 2. the wordmark only moves while something is working
rep('''setInterval(()=>{if(markBusy||!benchOn()||!motionOn()||document.hidden)return;const m=[...document.querySelectorAll("#mark i")];if(!m.length)return;
  m.forEach(x=>x.classList.remove("on"));const k=Math.floor(Math.random()*9);m[k].classList.add("on");m[(k+4)%9].classList.add("on");m[4].classList.add("on");},900);
function markSaved(){const m=[...document.querySelectorAll("#mark i")];if(!m.length||!benchOn())return;markBusy=true;let k=0;
  const iv=setInterval(()=>{k++;m.forEach((x,i)=>x.classList.toggle("on",i<k));if(k>=9){clearInterval(iv);setTimeout(()=>{markBusy=false;},400);}},motionOn()?40:0);}''',
    '''/* v2 "Working": the wordmark holds still while nothing is happening and traces a snake path (120 ms a step)
   only while something real is in progress — a save, reading the notes folder */
let markWork=0,markUntil=0,markStep=0;const MARK_PATH=[0,1,2,5,4,3,6,7,8];
setInterval(()=>{const m=[...document.querySelectorAll("#mark i")];if(!m.length)return;
  if((markWork>0||Date.now()<markUntil)&&benchOn()&&motionOn()&&!document.hidden){markStep=(markStep+1)%9;
    m.forEach((x,i)=>{const age=(markStep-MARK_PATH.indexOf(i)+9)%9;x.classList.toggle("on",age<4);x.style.opacity=age<4?String(1-age*.22):"";});}
  else if(markStep!==-1){markStep=-1;m.forEach((x,i)=>{x.style.opacity="";x.classList.toggle("on",i===0||i===4||i===8);});}},120);
function markWorking(on){markWork=Math.max(0,markWork+(on?1:-1));if(on)markUntil=Math.max(markUntil,Date.now()+700);}
function markSaved(){markUntil=Date.now()+900;}''')

# ---------------------------------------------------------------- 3. Today: the clock is a matrix readout
rep('''<div class="big" id="ckClock"></div>''', '''<div class="big"><canvas id="ckClockM" title="Local time"></canvas><small id="ckClock"></small></div>''')
rep('''bc.innerHTML=`${p2(d.getHours())}:${p2(d.getMinutes())}<small>:${p2(d.getSeconds())}</small>`''', '''bc.textContent=":"+p2(d.getSeconds())''', 2)
rep('''  const mv=motionOn(),today=todayStr();
  /* hero: a flow field''', '''  const mv=motionOn(),today=todayStr();
  /* the clock as a matrix readout — the one per screen; the colon blinks, a new minute wipes in */
  {const cv=q("#ckClockM");if(cv)scope(cv,(ctx,w,h,t,dt,s)=>{const d=new Date(),hm=p2(d.getHours())+":"+p2(d.getMinutes()),str=mv&&d.getSeconds()%2?hm.replace(":",";"):hm;
    if(s.hm!==hm){s.from=s.hm||hm;s.hm=hm;s.t0=t;}const cell=V2.matrixFit("88:88",w,h),x=w-V2.matrixLayout(str).cols*cell;
    if(s.from!==hm&&t-s.t0<900)V2.matrixWipe(ctx,C,s.from,hm,x,0,cell,t-s.t0,C.ink,C["pen-2"]);else V2.matrixText(ctx,C,str,x,0,cell,C.ink);});}
  /* hero: a flow field''')

# ---------------------------------------------------------------- 4. a transport's route is a rail timeline
start = s.index("function trRouteDraw(t,tr){")
end = s.index("/* two demands, one object: two dots circling the same point */")
s = s[:start] + r'''function trRouteDraw(t,tr){return (ctx,w,h,tm,dt,s)=>{const {dot,ring,label,C}=DK;
  /* v2 rail: the route as stations — solid = reached, pen + slow pulse = waiting for its next import,
     hollow = still ahead; the date it arrived above, the system below. Its own destinations after the
     origin (H03 → H43 → H42 → H41), or by default Dev → QA → Prod of its own landscape. */
  const own=trDest(t,tr),L=landscapeOf(tr.system);if(!L)return;
  const S=own.length?[tr.system,...own.filter(x=>x!==tr.system)]:routeTiers().map(d=>L+d);
  const when={};effectiveSyncs(t,tr).forEach(x=>{if(x.date&&(!when[x.system]||x.date<when[x.system]))when[x.system]=x.date;});
  const R=reachedSystems(t,tr),has=x=>x===tr.system||R.has(x),T=new Set(trTargets(t,tr)),mv=motionOn();
  const penOf=x=>({"3":C["pen-2"],"2":C["pen-4"],"1":C["pen-3"]})[String(x).slice(-1)]||C["pen-5"];
  const n=S.length,X=i=>16+(w-32)*(i/Math.max(1,n-1)),y=h/2;
  const nx=S.findIndex(x=>!has(x)),cur=!tr.released?0:nx<0?n:nx,xc=X(Math.min(n-1,Math.max(0,cur>=n?n-1:cur-1)));
  for(let x=X(0);x<=X(n-1);x+=4)dot(ctx,x,y,x<=xc&&cur>0?1.1:.8,x<=xc&&cur>0?C["ink-2"]:C["ink-4"]);
  S.forEach((x,i)=>{const px=X(i),on=has(x),now=i===cur,pen=now&&!tr.released?C.watch:penOf(x);
    if(now){dot(ctx,px,y,3.8,pen);if(mv){const p=(tm%1800)/1800;ring(ctx,px,y,4.5+p*10,pen,(1-p)*.6);}}
    else if(on)dot(ctx,px,y,3.3,penOf(x));
    else{dot(ctx,px,y,3.6,C.paper);ring(ctx,px,y,3.3,C["ink-3"]);}
    if(T.has(x))ring(ctx,px,y,7,on?penOf(x):C["ink-3"],.5);
    if(i>0&&when[x])label(ctx,shortD(when[x]),px,y-15,{font:DK.MONO,size:8.5,weight:500,color:C["ink-2"]});
    label(ctx,x,px,y+16,{font:DK.MONO,size:8.5,weight:on||now?600:400,color:now?C.ink:on?C["ink-2"]:C["ink-3"]});});
  if(!tr.released)label(ctx,"NOT RELEASED",Math.max(2,X(0)-10),y-15,{size:7,spacing:1.2,color:C.watch,align:"left"});};}
''' + s[end:]

# ---------------------------------------------------------------- 5. demand header: ID decodes, milestones get a stamp
rep('''        <div class="bh-no">${esc(t.demandId||"no demand id")}${ep?''', '''        <div class="bh-no"><span class="bh-id">${esc(t.demandId||"no demand id")}</span>${ep?''')
rep('''  return `<div class="detail-head bhead" style="--pen:${STATUS_PEN[t.status]}">''', '''  return `<div class="detail-head bhead" style="--pen:${STATUS_PEN[t.status]}">${demandStamp(t)}''')

# ---------------------------------------------------------------- 6. Effort: matrix headline, callouts, sliding segments
rep('''    ${roHTML([{k:"Logged",v:efFh(total)+`<small>h</small>`+''', '''    ${roHTML([{k:"Logged",v:`<canvas class="mxr" id="efMxR" data-v="${efFh(Math.round(total))}" style="width:${V2.mxW(efFh(Math.round(total)),22)}px;height:22px" title="${efFh(total)} h"></canvas>`+`<small>h</small>`+''')
rep('''  host.querySelectorAll("#efRg button").forEach(b=>b.onclick=''', '''  /* the headline as a matrix readout; switching the range wipes the old number into the new one */
  {const cv=host.querySelector("#efMxR");if(cv){const to=cv.dataset.v,from=efMxPrev||to;efMxPrev=to;
    DK.scope(cv,(c,w,h,tm,dt,s)=>{const C=efC(cv),cell=h/7,age=performance.now()-s.born;if(from!==to&&age<900)V2.matrixWipe(c,C,from,to,0,0,cell,age,C.ink,C["pen-2"]);else V2.matrixText(c,C,to,0,0,cell,C.ink);});}}
  host.querySelectorAll("#efRg button").forEach(b=>b.onclick=''')
rep('''function renderEffortWS(){''', '''let efMxPrev=null;
function renderEffortWS(){''')
# Where the hours went: leader callouts on the peak and on now, instead of a number over every column
rep('''  B.forEach((bk,i)=>{const xc=L+cw*i+cw/2,x0=xc-(m-1)*hp/2,hov=s.hv&&s.hv.b===bk,pb=efEase((el-i*28)/800);''',
    '''  const tops=[];
  B.forEach((bk,i)=>{const xc=L+cw*i+cw/2,x0=xc-(m-1)*hp/2,hov=s.hv&&s.hv.b===bk,pb=efEase((el-i*28)/800);''')
rep('''    if(n<=13&&bk.tot&&pb>=1)efLabel(c,efFh(bk.tot),xc,y0-pitch*Math.ceil(seq.length/m)-8,{mono:true,size:9,weight:500,color:C["ink-2"]});
    s.hits.push({x:xc,y:(top+y0)/2,rx:cw/2,ry:(y0-top)/2+8,b:bk});});}''',
    '''    tops[i]={x:xc,y:y0-pitch/2-Math.max(0,Math.ceil(seq.length/m)-1)*pitch,tot:bk.tot,pb,now:bk.a<=0&&bk.b>=0};
    s.hits.push({x:xc,y:(top+y0)/2,rx:cw/2,ry:(y0-top)/2+8,b:bk});});
  /* label the two points that matter — the peak and now — on leader lines */
  if(tops.length&&tops.every(x=>x.pb>=1)){const pk=tops.reduce((a,b)=>b.tot>a.tot?b:a,tops[0]),nw=tops.find(x=>x.now),unit=A.mode==="day"?"today":A.mode==="week"?"this week":"this month";
    /* a label sits above every column it would cross */
    const lyFor=o=>{const flip=o.x>w-130,a0=flip?o.x-140:o.x,a1=flip?o.x:o.x+140;let y=o.y-16;tops.forEach(q=>{if(q!==o&&q.tot&&q.x>=a0&&q.x<=a1)y=Math.min(y,q.y-12);});return Math.max(10,y);};
    let pl=null;if(pk.tot){pl=lyFor(pk);V2.callout(c,C,pk.x,pk.y,`${efFh(pk.tot)} h · ${pk===nw?unit+" · peak":"peak"}`,pl,C["ink-2"],w);}
    if(nw&&nw!==pk&&nw.tot){let nl=lyFor(nw);if(pl!=null&&Math.abs(nl-pl)<14&&Math.abs(nw.x-pk.x)<180)nl=Math.max(10,pl-14);V2.callout(c,C,nw.x,nw.y,`${efFh(nw.tot)} h · ${unit}`,nl,C["pen-2"],w);}}}''')

# ---------------------------------------------------------------- 7. demand Effort tab: dot calendar + plotter head
rep('''    ${es.length?`<div class="ck-unit"><div class="ck-head"><h2>Effort over its life</h2>''',
    '''    ${es.length?`<div class="ck-unit"><div class="ck-head"><h2>Days on it</h2><span class="ck-meta">a column per week · size = hours that day · ring = today · hollow = holiday or leave</span></div><canvas class="ef-dcal"></canvas></div>`:""}
    ${es.length?`<div class="ck-unit"><div class="ck-head"><h2>Effort over its life</h2>''')
rep('''  body.querySelectorAll(".ef-ins canvas").forEach(cv=>{''', '''  {const cv=body.querySelector(".ef-dcal");if(cv){const by=new Map();es.forEach(e=>by.set(e.date,(by.get(e.date)||0)+e.hours));const vals=[];
    for(let i=52*7-1;i>=0;i--){const d=efAdd(todayStr(),-i);vals.push(efOff(d)?null:(by.get(d)||0)/EF_DAY);}
    /* as many weeks as fit at a readable dot size, up to a year */
    DK.scope(cv,(c,w,h,tm,dt,s)=>{const C=efC(cv),wk=Math.max(8,Math.min(52,Math.floor((w-20)/15)));V2.dotCalendar(c,C,0,0,w,h,vals.slice(-wk*7),C[efPen(t.id)]||C.ink);});}}
  body.querySelectorAll(".ef-ins canvas").forEach(cv=>{''')
rep('''c.fillRect(x,y0+3,1,7);}}''', '''c.fillRect(x,y0+3,1,7);}}
    /* plotter trace: while the running total draws itself, a pen head rides it on a dotted carriage line */
    if(p<1&&offs.length){let cm=0;offs.forEach(o=>{if(X(o)<=xMax)cm+=efSum(by.get(o));});const hy=yC(cm);
      for(let yy=top-8;yy<y0;yy+=4)efDot(c,xMax,yy,.6,C["ink-3"],.7);efDot(c,xMax,hy,2.4,C["ink-2"]);efRing(c,xMax,hy,5.5,C["ink-2"],.35);}''')

# ---------------------------------------------------------------- 8. Tasks: a rail from the ask to the answer, and a stamp
rep('''        <span>Expected by <input type="date" id="jb-due" value="${j.due}" style="width:150px"></span>
      </div></div>''', '''        <span>Expected by <input type="date" id="jb-due" value="${j.due}" style="width:150px"></span>
      </div><canvas class="jb-rail" title="From the ask to the answer"></canvas><div class="jb-railnote">${(()=>{const age=-daysUntil(j.received)+1,n=j.due?daysUntil(j.due):null,tm=jobTiming(j);
        if(j.status==="done")return tm?`Reported back ${tm.txt}`:"Reported back";if(j.status==="dropped")return "Dropped";
        return `Day ${age} · `+(n==null?"no date expected":n>0?`expected in ${n} d`:n===0?"expected today":`${-n} d past expected`);})()}</div></div>''')
rep('''  const q=s=>host.querySelector(s),side=()=>renderJobSidebar();''', '''  {const cv=host.querySelector(".jb-rail");if(cv){const fl=j.log.map(x=>x.date).sort()[0]||"";
    const st=[{label:"Received",date:shortD(j.received)},{label:"Working",date:fl?shortD(fl):""},{label:j.status==="dropped"?"Dropped":"Reported",date:j.closedOn?shortD(j.closedOn):j.due?"by "+shortD(j.due):""}];
    const cur=j.status==="done"||j.status==="dropped"?3:j.log.length||j.status==="progress"?1:0;
    DK.scope(cv,(c,w,h,tm)=>{const C=efC(cv);V2.rail(c,C,34,w-40,h/2+3,st,cur,C["pen-7"],tm);});}}
  const q=s=>host.querySelector(s),side=()=>renderJobSidebar();''')
rep('''      <div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end"><span class="pill ${st.cls}" style="font-size:12px">${st.l}</span>
        <button class="sm" id="jb-logt"''', '''      <div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end">${j.status==="done"?(()=>{const tm=jobTiming(j);return vStamp(tm?`REPORTED · ${tm.n>0?tm.n+" D EARLY":tm.n===0?"ON THE DAY":-tm.n+" D LATE"}`:"REPORTED",tm&&!tm.ok?"var(--bad,var(--red))":"var(--good,var(--green))",j.updatedAt&&Date.now()-j.updatedAt<6000);})():`<span class="pill ${st.cls}" style="font-size:12px">${st.l}</span>`}
        <button class="sm" id="jb-logt"''')

# ---------------------------------------------------------------- 9. settings: the working day is a knob
rep('''      <input type="number" id="mn-dayh" min="1" max="16" step="0.25" value="${state.settings.dayHours}" style="width:70px;padding:3px 6px"> h</div>''',
    '''      <canvas id="mn-dayk" title="Drag up or down, scroll, or use the arrow keys — 4 to 12 hours" style="width:92px;height:80px;flex:none"></canvas></div>''')
a = s.index('  root.querySelector("#mn-dayh").onchange=')
b = s.index('  root.querySelector("#mn-imgexp").onchange=')
s = s[:a] + '''  {const cv=root.querySelector("#mn-dayk"),lo=4,hi=12,get=()=>(Math.min(hi,Math.max(lo,state.settings.dayHours))-lo)/(hi-lo);let tmr=0;
   DK.scope(cv,(c,w,h)=>{const C=efC(cv);V2.dotKnob(c,C,w/2,h/2+4,34,get(),C["pen-2"],{value:efFh(state.settings.dayHours),name:"hours"});});
   V2.bindKnob(cv,get,f=>{const v=Math.round((lo+f*(hi-lo))*4)/4;if(v===state.settings.dayHours)return;state.settings.dayHours=v;clearTimeout(tmr);tmr=setTimeout(()=>{markDirty();renderApp();},400);},.25/(hi-lo));}
''' + s[b:]

# ---------------------------------------------------------------- CSS
rep('''  #printArea{display:none}''', '''  /* Instrument v2 */
  .vic{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:0;flex:none}
  .vic.live{background:var(--good,#2a8a4a);animation:vbreathe 2.4s ease-in-out infinite}
  .vic.stale{border:1.5px solid var(--watch,#c08a1e)}
  .vic.nm{border:1px dashed var(--ink-3,#888)}
  .vic.fault{background:var(--bad,#c0392b);box-shadow:0 0 0 3px color-mix(in srgb,var(--bad,#c0392b) 22%,transparent)}
  @keyframes vbreathe{50%{opacity:.4}}
  .vstamp{display:inline-block;transform:rotate(-6deg);border:1.5px solid var(--pen);color:var(--pen);padding:3px 7px 2px;font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;border-radius:2px;outline:1px solid var(--pen);outline-offset:2px;background:var(--paper,var(--panel));white-space:nowrap}
  .vstamp.in{animation:vstampin .45s cubic-bezier(.2,.8,.2,1) both}
  @keyframes vstampin{0%{opacity:0;transform:rotate(-6deg) scale(1.6)}60%{opacity:1;transform:rotate(-6deg) scale(.96)}100%{transform:rotate(-6deg) scale(1)}}
  .bhead{position:relative}
  .bhead>.vstamp{position:absolute;top:22px;right:26px}
  .ck-clock .big{display:flex;align-items:flex-end;justify-content:flex-end;gap:4px}
  .ck-clock .big canvas{display:block;width:172px;height:42px}
  .ck-clock .big small{margin-bottom:-2px}
  :root[data-theme="bench"] .trroute{height:48px;width:300px}
  .logo .mark i{transition:background .1s,opacity .1s}
  .mxr{display:inline-block;vertical-align:-3px;margin-right:2px}
  .ef-dcal{display:block;width:100%;height:124px}
  .jb-rail{display:block;width:min(560px,100%);height:56px;margin:12px 0 0}
  .jb-railnote{font-family:var(--mono);font-size:11px;color:var(--ink-3,var(--muted));margin:2px 0 0 4px}
  .efx .ef-sg{position:relative;background:var(--paper)}
  .efx .ef-sg .sgi{position:absolute;top:2px;bottom:2px;left:0;width:0;background:var(--ink);border-radius:2px;transition:transform .35s cubic-bezier(.2,.8,.2,1),width .35s cubic-bezier(.2,.8,.2,1);pointer-events:none}
  .efx .ef-sg button{position:relative;z-index:1;background:transparent;transition:color .2s}
  .efx .ef-sg button:hover{background:transparent}
  .efx .ef-sg button.on{color:var(--paper);background:var(--ink);box-shadow:none}
  .efx .ef-sg.has-sgi button.on{background:transparent}
  .efx .ef-sg .cap{position:relative;z-index:1}
  button:active:not(:disabled){transform:scale(.97)}
  @media (prefers-reduced-motion:reduce){.vic.live,.vstamp.in{animation:none}.efx .ef-sg .sgi{transition:none}}
  #printArea{display:none}''')

open(P, "w", encoding="utf-8").write(s)
print("ok", P)
