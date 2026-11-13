/* ===================== BENCH LOOK: dots, motion, cockpit =====================
   The default look (Bench's Instrument aesthetic, Paper + Backlit). Everything that
   moves is drawn from the real data file — a dot is a real transport, a ring is a
   real share of demands — and all of it switches off with Settings → Motion: Off or
   Windows' "reduce animations". Classic themes don't render any of this. */
const DK=(()=>{
  const TAU=Math.PI*2,C={};let MONO="monospace",SANS="sans-serif";
  const KEYS=["paper","paper-2","ink","ink-2","ink-3","ink-4","rule","rule-strong","pen-1","pen-2","pen-3","pen-4","pen-5","pen-6","good","watch","bad"];
  const scopes=[];
  function readColors(){const cs=getComputedStyle(document.documentElement);KEYS.forEach(k=>C[k]=cs.getPropertyValue("--"+k).trim());
    MONO=cs.getPropertyValue("--mono").trim()||MONO;SANS=cs.getPropertyValue("--sans").trim()||SANS;scopes.forEach(s=>s.w=0);}
  function dot(ctx,x,y,r,col,a=1){ctx.globalAlpha=a;ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
  function ring(ctx,x,y,r,col,a=1,lw=1){ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();}
  /* gauge: a 240° arc of dots; radius and ink both carry the value */
  function dotArc(ctx,cx,cy,R,frac,n,col,lw=2.1){const a0=.78*Math.PI,sw=1.44*Math.PI,f=Math.max(0,Math.min(1,frac));
    for(let i=0;i<n;i++){const t=i/(n-1),a=a0+sw*t,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;
      if(t<=f+1e-6&&f>0)dot(ctx,x,y,lw*(.75+.25*t/Math.max(f,.01)),col,.45+.55*t/Math.max(f,.01));else dot(ctx,x,y,1.15,C["ink-4"]);}
    const a=a0+sw*f;ctx.globalAlpha=.32;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*(R-6),cy+Math.sin(a)*(R-6));ctx.stroke();
    dot(ctx,cx+Math.cos(a)*(R-6),cy+Math.sin(a)*(R-6),2.2,col);ring(ctx,cx+Math.cos(a)*(R-6),cy+Math.sin(a)*(R-6),5,col,.3);}
  /* proportion: dots round a circle, filled clockwise from 12 o'clock; unlit dots always drawn */
  function dotRing(ctx,cx,cy,R,frac,n,col,spin=0){for(let i=0;i<n;i++){const t=i/n,a=-Math.PI/2+t*TAU+spin,x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;
    if(t<frac)dot(ctx,x,y,1.6+.6*(t/frac),col,.5+.5*(t/frac));else dot(ctx,x,y,1.05,C["ink-4"]);}}
  function label(ctx,text,x,y,{font=SANS,size=9,weight=600,color=C["ink-3"],align="center",base="middle",spacing=0}={}){
    ctx.globalAlpha=1;ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline=base;
    if("letterSpacing" in ctx)ctx.letterSpacing=spacing+"px";ctx.fillText(text,x,y);if("letterSpacing" in ctx)ctx.letterSpacing="0px";}
  function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  /* one requestAnimationFrame loop for every canvas; a canvas that leaves the page drops out */
  function fade(col,a){col=String(col||"").trim();let m;
    if((m=col.match(/^#([0-9a-f]{3})$/i)))col="#"+m[1].split("").map(x=>x+x).join("");
    if((m=col.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i)))return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a})`;
    if((m=col.match(/^rgba?\(([^)]+)\)/)))return `rgba(${m[1].split(",").slice(0,3).join(",")},${a})`;return col;}
  /* A chart whose drawing settles says so with data-still="ms" on its canvas (or opts.still): once that long
     after it appears it is left as drawn, and redrawn only on a resize, a theme change, or wake() — the
     pointer moving over it, a focus change. Canvases without it keep animating. */
  function scope(cv,draw,opts={}){if(!cv)return null;const st=opts.still!=null?opts.still:cv.dataset.still!=null?+cv.dataset.still:null;
    const s={cv,draw,ctx:cv.getContext("2d"),w:0,h:0,keep:!!opts.keep,dead:false,born:performance.now(),data:opts.data,still:st,dirty:false};scopes.push(s);return s;}
  /* the share of the way to move this frame, for an easing tuned at 60 fps: frame-rate independent */
  const ease=(dt,k)=>1-Math.pow(1-k,(dt||16.7)/16.7);
  function wake(cv){scopes.forEach(s=>{if(!cv||s.cv===cv)s.dirty=true;});}
  /* one loop, capped like Bench: 30 frames a second while the window has focus, 10 behind other windows,
     none while hidden; animations run on elapsed time, so a lower rate only looks calmer */
  let last=performance.now(),lastDraw=0;
  function frame(t){requestAnimationFrame(frame);
    if(document.hidden){last=t;return;}
    if(t-lastDraw<(document.hasFocus()?1000/30-2:1000/10-2))return;lastDraw=t;
    const dt=Math.min(120,t-last);last=t;const dpr=window.devicePixelRatio||1;
    for(let i=scopes.length-1;i>=0;i--){const s=scopes[i];
      if(s.dead||!s.cv.isConnected){scopes.splice(i,1);continue;}
      if(s.cv.offsetParent===null)continue;
      const w=s.cv.clientWidth,h=s.cv.clientHeight;if(!w||!h)continue;
      if(w!==s.w||h!==s.h){s.w=w;s.h=h;s.cv.width=Math.round(w*dpr);s.cv.height=Math.round(h*dpr);s.fresh=true;}
      if(s.still!=null&&t-s.born>s.still+100&&!s.fresh&&!s.dirty)continue;
      s.ctx.setTransform(dpr,0,0,dpr,0,0);if(!s.keep)s.ctx.clearRect(0,0,w,h);s.ctx.globalAlpha=1;
      try{s.draw(s.ctx,w,h,t,dt,s);}catch(e){console.error(e);s.dead=true;}s.fresh=false;s.dirty=false;}}
  requestAnimationFrame(frame);
  return{TAU,C,readColors,dot,ring,dotArc,dotRing,label,rng,scope,wake,ease,fade,get MONO(){return MONO;},get scopes(){return scopes;}};
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
const benchOn=()=>document.documentElement.getAttribute("data-theme")==="bench";
/* Motion: Settings choice, or follow Windows' "reduce animations" */
const MOTION_KEY="demanddesk.motion",reducedMQ=matchMedia("(prefers-reduced-motion: reduce)");
function motionPref(){try{return localStorage.getItem(MOTION_KEY)||"auto";}catch(e){return "auto";}}
function motionOn(){const p=motionPref();return p==="full"||p==="show"||(p==="auto"&&!reducedMQ.matches);}   /* full = Calm, show = Full (14h-motion.js) */
function applyMotion(){document.documentElement.classList.toggle("nomotion",!motionOn());document.documentElement.classList.toggle("mo-show",motionPref()==="show");}
reducedMQ.addEventListener("change",applyMotion);
const STATUS_PEN={open:"var(--accent)",progress:"var(--amber)",bug:"var(--red)",delivered:"var(--green)",closed:"var(--faint)"};
const STATUS_CK={open:"pen-2",progress:"pen-4",bug:"pen-1",delivered:"pen-3",closed:"ink-3"};
const p2=n=>String(n).padStart(2,"0");
const hashAngle=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return ((h>>>0)%3600)/3600*DK.TAU;};

/* a change travels to where it lands — e.g. a status change flies to the demand's card */
function flyDot(fromEl,toEl,color){if(!fromEl||!toEl||!benchOn()||!motionOn())return;
  const a=fromEl.getBoundingClientRect(),b=toEl.getBoundingClientRect();if(!a.width||!b.width)return;
  const f=document.createElement("div");
  f.style.cssText=`position:fixed;z-index:90;pointer-events:none;width:8px;height:8px;border-radius:50%;background:${color};left:${a.left+a.width/2-4}px;top:${a.top+a.height/2-4}px;transition:transform .7s cubic-bezier(.6,.05,.25,1),opacity .7s`;
  document.body.appendChild(f);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transform=`translate(${b.left+16-(a.left+a.width/2)}px,${b.top+b.height/2-(a.top+a.height/2)}px) scale(.6)`;}));
  setTimeout(()=>{f.style.opacity="0";},620);setTimeout(()=>f.remove(),820);}
/* content rises in when you arrive somewhere — never on ordinary edits */
function enterPulse(kind){if(!benchOn()||!motionOn())return;const a=document.getElementById("app");
  a.classList.remove("enter-all","enter-detail");void a.offsetWidth;a.classList.add(kind==="detail"?"enter-detail":"enter-all");
  clearTimeout(enterPulse._t);enterPulse._t=setTimeout(()=>a.classList.remove("enter-all","enter-detail"),1100);}
/* the tab indicator slides from the old tab to the new one, even across a re-render */
let lastTind=null;
function placeTabInd(root){if(!benchOn())return;const tabs=root&&root.querySelector(".tabs"),ti=tabs&&tabs.querySelector(".tind"),on=tabs&&tabs.querySelector(".tab.active");if(!ti||!on)return;
  const to={l:on.offsetLeft,t:on.offsetTop+on.offsetHeight-2,w:on.offsetWidth};
  if(lastTind&&motionOn()){ti.style.transition="none";ti.style.left=lastTind.l+"px";ti.style.top=lastTind.t+"px";ti.style.width=lastTind.w+"px";void ti.offsetWidth;ti.style.transition="";}
  ti.style.left=to.l+"px";ti.style.top=to.t+"px";ti.style.width=to.w+"px";lastTind=to;}
/* status as a segmented control (Bench) */
function statusSegHTML(t){return `<div class="seg" id="dh-seg" title="Status — every change is logged in History">${Object.entries(STATUS).map(([k,v])=>`<button data-s="${k}" class="${k===t.status?"on":""}" style="--pen:${STATUS_PEN[k]}"><i></i>${esc(v.label.split(" /")[0])}</button>`).join("")}</div>`;}
function setDemandStatus(t,v,fromEl){if(v===t.status)return;
  if(needsComeback(t,v)){openComeback(t,v,()=>renderApp(),()=>renderApp());return;}
  const card=document.querySelector(`#taskList .tcard[data-id="${t.id}"]`);
  logTimeline(t,"status",t.status,v);t.status=v;touch(t);
  flyDot(fromEl,card,STATUS_PEN[v]);
  const after=()=>{renderApp();const c=document.querySelector(`#taskList .tcard[data-id="${t.id}"]`);if(c&&benchOn()&&motionOn())c.classList.add("flash");};
  if(benchOn()&&motionOn()&&card)setTimeout(after,600);else after();
  toast("Status → "+STATUS[v].label+" · logged in History");
  if(v==="closed")setTimeout(()=>{if(!document.querySelector("#modalRoot .modal-bg"))openLesson(t,{closing:true});},benchOn()&&motionOn()&&card?750:80);}

/* where a transport has actually reached, drawn as its route Dev → QA → Prod */
function trRouteDraw(t,tr){return (ctx,w,h,tm,dt,s)=>{const {dot,ring,label,C}=DK;
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
/* two demands, one object: two dots circling the same point */
function drawOrbit(ctx,w,h,t){const {dot,ring,C}=DK,cx=w/2,cy=h/2,tt=motionOn()?t*.0024:0;ring(ctx,cx,cy,5,C.bad,.9);dot(ctx,cx,cy,1.6,C.bad);
  const r=9+Math.sin(tt*.7)*2.5;[0,Math.PI].forEach((o,i)=>{const a=tt+o;dot(ctx,cx+Math.cos(a)*r*1.9,cy+Math.sin(a)*r*.9,2.3,i?C["pen-4"]:C["pen-2"]);});}

/* ---------- title bar: animated wordmark + clock · icon rail · status bar ---------- */
{const m=document.getElementById("mark");if(m)for(let i=0;i<9;i++)m.appendChild(document.createElement("i"));}
let markBusy=false;
/* v2 "Working": the wordmark holds still while nothing is happening and traces a snake path (120 ms a step)
   only while something real is in progress — a save, reading the notes folder */
let markWork=0,markUntil=0,markStep=0;const MARK_PATH=[0,1,2,5,4,3,6,7,8];
setInterval(()=>{const m=[...document.querySelectorAll("#mark i")];if(!m.length)return;
  if((markWork>0||Date.now()<markUntil)&&benchOn()&&motionOn()&&!document.hidden){markStep=(markStep+1)%9;
    m.forEach((x,i)=>{const age=(markStep-MARK_PATH.indexOf(i)+9)%9;x.classList.toggle("on",age<4);x.style.opacity=age<4?String(1-age*.22):"";});}
  else if(markStep!==-1){markStep=-1;m.forEach((x,i)=>{x.style.opacity="";x.classList.toggle("on",i===0||i===4||i===8);});}},120);
function markWorking(on){markWork=Math.max(0,markWork+(on?1:-1));if(on)markUntil=Math.max(markUntil,Date.now()+700);}
function markSaved(){markUntil=Date.now()+900;}
function greetText(){const h=new Date().getHours(),n=viewPref("userName","").trim();
  return (h<5?"Up late":h<12?"Good morning":h<17?"Good afternoon":"Good evening")+(n?", "+n:"")+".";}
setInterval(()=>{const d=new Date(),hc=document.getElementById("hclock");
  if(hc)hc.textContent=`${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  const bc=document.getElementById("ckClock");if(bc)bc.textContent=":"+p2(d.getSeconds());
  const g=document.getElementById("ckGreet");if(g)g.textContent=greetText();
  updateSb();},1000);
function syncRail(){const r=document.getElementById("rail");if(!r)return;
  r.querySelectorAll(".rb[data-view]").forEach(b=>b.classList.toggle("on",b.dataset.view===view));
  const b=r.querySelector(`.rb[data-view="${view}"]`),ind=document.getElementById("railInd");
  if(b&&ind&&benchOn()){ind.style.transform=`translateY(${b.offsetTop+6}px)`;ind.style.background=getComputedStyle(b).getPropertyValue("--pen");}
  const set=(id,n)=>{const el=document.getElementById(id);if(el)el.textContent=n?String(n):"";};
  set("rcDemands",state.tasks.filter(t=>["open","progress","bug"].includes(t.status)).length);
  set("rcJournal",0);
  set("rcJobs",state.jobs.filter(jobOpen).length);
  set("rcMeetings",state.meetings.reduce((n,m)=>n+meetingOpenActions(m),0));}
/* status bar: which file, whether it's saved, and when auto-save will write */
function updateSb(){if(!benchOn())return;const f=document.getElementById("sbFile"),a=document.getElementById("sbAuto"),c=document.getElementById("sbCount"),r=document.getElementById("sbRight");if(!f)return;
  f.textContent=fileHandle?fileHandle.name:(savedHandle?"file not linked — 🔌 Reconnect in the title bar":"no data file yet — 💾 Save to choose one");f.className=fileHandle?"":"warn";
  let txt,cls="";
  if(diskConflict){txt="⚠ auto-save paused — the file changed on disk";cls="bad";}
  else if(pendingEncrypted){txt="🔒 locked";}
  else if(dirty){cls="warn";const due=autoSaveDue&&fileHandle&&state.settings.autosave&&supportsFS;
    if(due&&Date.now()<autoSaveDue+3000){const s=Math.max(0,Math.ceil((autoSaveDue-Date.now())/1000));txt=s?`● unsaved · autosave in ${s} s`:"● saving…";}else txt="● unsaved";}
  else if(lastWriteAt){const d=new Date(lastWriteAt);txt=`✓ ${lastSaveAuto?"auto-saved":"saved"} ${p2(d.getHours())}:${p2(d.getMinutes())}`;}
  else txt=state.settings.autosave?"autosave on":"autosave off";
  a.textContent=txt;a.className=cls;
  c.textContent=`${state.tasks.length} demands · ${state.epics.length} epics · ${state.meetings.length} meetings`;
  r.textContent=(state.settings.encryption?"🔒 encrypted · ":"")+"demand desk · data v"+state.version;}

/* ---------- Today cockpit ---------- */
/* every transport of a demand that isn't closed, parked at the furthest tier it reached in its own landscape */
function pipelineData(){
  /* each transport sits in the lane of every landscape it's meant to reach (its origin
     landscape by default), at the furthest tier it has got to there; one that hasn't
     arrived in a destination landscape yet waits at the lane's entrance */
  const tiers=routeTiers(),lanes=new Map();
  state.tasks.forEach(t=>{if(t.status==="closed")return;
    t.transports.forEach(tr=>{if(!tr.system)return;const R=reachedSystems(t,tr),own=trDest(t,tr),T=trTargets(t,tr),home=landscapeOf(tr.system);
      const done=!!(T.length&&trComplete(t,tr)),Ls=own.length?[...new Set(own.map(landscapeOf))]:[home];
      Ls.forEach(L=>{const ds=[...(L===home?[tr.system]:[]),...R].filter(x=>landscapeOf(x)===L).map(x=>String(x).slice(-1)).filter(d=>tiers.includes(d));
        if(!lanes.has(L))lanes.set(L,[]);
        lanes.get(L).push({t,tr,si:ds.length?tiers.indexOf(ds.sort()[0]):-1,rel:!!tr.released,target:T.join("/"),done,from:L===home?"":tr.system});});});});
  const out=[...lanes.entries()].map(([L,items])=>({L,items})).sort((a,b)=>b.items.length-a.items.length).slice(0,4).sort((a,b)=>a.L.localeCompare(b.L));
  return{tiers,lanes:out};}
function cockpitCounts(){const T=state.tasks,today=todayStr();
  const pipe=pipelineData();
  return{active:T.filter(t=>["open","progress","bug"].includes(t.status)),
    over:T.filter(t=>{const d=earliestOpenDue(t);return d&&d<today;}),
    waiting:T.filter(isWaiting).sort((a,b)=>(waitDays(b)||0)-(waitDays(a)||0)),
    clash:clashIndex().size,pipe,short:new Set(pipe.lanes.flatMap(l=>l.items.filter(x=>x.target&&!x.done).map(x=>x.tr.id))).size,
    unrel:new Set(pipe.lanes.flatMap(l=>l.items.filter(x=>!x.rel).map(x=>x.tr.id))).size,total:new Set(pipe.lanes.flatMap(l=>l.items.map(x=>x.tr.id))).size};}
const CK_TILES=[
  {no:"01",pen:"var(--pen-2)",st:"live",nm:"Active demands",bl:"Open, in progress and rework — the ring splits by status.",view:{group:"epic",sort:"due",status:["open","progress","bug"]}},
  {no:"02",pen:"var(--pen-1)",st:"sweeping",nm:"Overdue & due soon",bl:"Radar — distance from the centre is days late; the inner ring is due within 7 days.",view:{group:"due",sort:"due",only:["due7"]}},
  {no:"03",pen:"var(--pen-4)",st:"waiting",nm:"Waiting on others",bl:"The longest open wait, against a 30-day follow-up rule.",view:{group:"none",sort:"waiting",dir:"desc",only:["waiting"]}},
  {no:"04",pen:"var(--pen-3)",st:"to prod",nm:"Go-live",bl:"Transports still on their way to the demand's go-live system.",view:{group:"system",sort:"due",only:["notprod"]}}];
function cockpitHTML(mid=""){const c=cockpitCounts(),worst=c.over.reduce((m,t)=>Math.max(m,-daysUntil(earliestOpenDue(t))),0),w=c.waiting[0];
  const foot=[`${c.active.length}<small>of ${state.tasks.length}</small>`,`${c.over.length}<small>late${c.over.length?" · worst "+worst+" d":""}</small>`,
    w?`${waitDays(w)||0}<small>d · ${esc(w.waiting.on)}</small>`:`0<small>nobody</small>`,`${c.short}<small>TRs short of go-live</small>`];
  const eps=state.epics.filter(e=>["active","onhold"].includes(e.status)).sort((a,b)=>(a.targetDate||"9999").localeCompare(b.targetDate||"9999")).slice(0,6);
  const lanesN=Math.max(1,c.pipe.lanes.length);
  return `<div class="ck-unit ck-hero"><canvas class="flow" id="ckFlow"></canvas>
      <div class="ck-hero-in"><div class="ck-lbl">${esc(new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}))}</div>
        <h1 id="ckGreet">${esc(greetText())}</h1>
        <div class="ck-sub"><a class="ck-sl" data-sl="0"><b>${c.active.length}</b> active</a> &nbsp;·&nbsp; <a class="ck-sl" data-sl="1"><b class="${c.over.length?"bad":""}">${c.over.length}</b> overdue</a> &nbsp;·&nbsp; <a class="ck-sl" data-sl="2"><b class="${c.clash?"bad":""}">${c.clash}</b> object clash${c.clash===1?"":"es"}</a> &nbsp;·&nbsp; <a class="ck-sl" data-sl="3"><b>${c.short}</b> transport${c.short===1?"":"s"} short of go-live</a></div>
        <button class="ck-search" id="ckSearch"><span class="caret"></span>Find a demand, an object, a transport, a system…<kbd>Ctrl K</kbd></button>
        <div class="ck-acts"><button class="primary" id="ckNew">＋ New demand</button><button id="ckJ">Today's journal</button><button id="ckDbg">Debug session</button><button id="ckLog">⏱ Log time</button><button id="ckWin">🏆 Win</button><button id="ckWrap" title="This week: hours, missing days, wins and lessons">Week wrap-up</button><button id="ckWeek">Weekly summary</button><button id="ckHand">Handover pack</button></div></div>
      <div class="ck-clock"><div class="ck-lbl" style="text-align:right">local · offline · ${state.settings.autosave?"autosave on":"autosave off"}</div><div class="big"><canvas id="ckClockM" title="Local time"></canvas><small id="ckClock"></small></div></div></div>
    ${mid}<div class="ck-sech"><span class="ck-lbl">Pulse · read from your data file</span></div>
    <div class="ck-tiles">${CK_TILES.map((x,i)=>`<div class="ck-unit ck-tile" data-i="${i}" style="--pen:${x.pen}"><div class="top"><span class="no">${x.no}</span><span class="st"><i></i><span>${x.st}</span></span></div>
      <canvas></canvas><div class="nm">${x.nm}</div>${i===2&&c.waiting.length?waitListHTML(c.waiting):`<div class="bl">${x.bl}</div>`}<div class="ft"><span>${foot[i]}</span><span class="go">Open ›</span></div></div>`).join("")}</div>
    <div class="ck-grid">
      <div class="ck-unit go" id="ckPipeU" style="--pen:var(--pen-3)" title="Open the transport board"><div class="ck-head"><h2>Transport pipeline</h2><span class="ck-meta">${c.total} transports · ${c.short} short of go-live · ${c.unrel} not released</span></div>
        <canvas id="ckPipe" style="width:100%;height:${lanesN*104+8}px;display:block"></canvas>
        <div class="ck-note"><span class="ring"></span><span>Each bead is a <b>demand</b>, sitting at the furthest system its transports have reached (<b>×3</b> = three of them there) — hover to see the transports, click to open them. A <b>hollow ring</b> isn't released yet, a <b>pulse</b> is waiting for its next import. Prod shows a coming change freeze.</span></div></div>
      <div class="ck-unit"><div class="ck-head"><h2>Epics</h2><span class="ck-meta">${eps.length} active</span></div>
        ${eps.length?eps.map(e=>{const r=epicRollup(e),fu=epicFollowUps(e).length;return `<div class="ck-ep" data-e="${e.id}"><canvas></canvas><div style="min-width:0"><div class="ec">◆ ${esc(e.code||"EPIC")} · ${e.role==="contributor"?"contributor":"lead"}</div><div class="en">${esc(e.name)}</div>
          <div class="es">${r.done}/${r.ts.length} demands done${e.targetDate?" · target "+e.targetDate:""}${fu?` · <b>${fu} follow-up${fu>1?"s":""} due</b>`:""}</div></div></div>`;}).join(""):`<div class="ck-empty">No active epics.</div>`}</div>
      <div class="ck-unit"><div class="ck-head"><h2>Next 10 weeks</h2><span class="ck-meta">click a day to see what's on it</span></div><canvas id="ckCal" data-still="1700" style="width:100%;height:158px;display:block"></canvas><div class="ck-calday" id="ckCalDay"></div></div>
    </div>`;}
function mountCockpit(host){const {dot,ring,dotArc,dotRing,label,C,scope,rng,TAU}=DK;
  const q=s=>host.querySelector(s),goView=v=>{dvSet(v);view="demands";renderApp();};
  q("#ckSearch").onclick=()=>document.getElementById("globalSearch").focus();
  q("#ckNew").onclick=()=>{view="demands";renderApp();openTaskModal(null);};
  q("#ckJ").onclick=newJournalToday;
  q("#ckDbg").onclick=()=>{const s={id:uid(),title:"New debug session",demandId:"",taskId:"",status:"active",resume:"",notes:"",objects:[],breakpoints:[],findings:[],watches:[],createdAt:Date.now(),updatedAt:Date.now()};state.debug.unshift(s);activeDebugId=s.id;view="debug";markDirty();renderApp();};
  q("#ckWeek").onclick=openWeekly;q("#ckWrap").onclick=()=>{wrapForce=true;renderToday();setTimeout(()=>{const w=document.querySelector(".wrapup");if(w)w.scrollIntoView({block:"center",behavior:motionOn()?"smooth":"auto"});},80);};q("#ckHand").onclick=openHandover;
  {const SL=[CK_TILES[0].view,{group:"none",sort:"due",only:["overdue"]},{group:"none",sort:"clash",dir:"desc",only:["clash"]},CK_TILES[3].view];
   host.querySelectorAll(".ck-sl").forEach(a=>a.onclick=()=>goView(SL[+a.dataset.sl]));}
  host.querySelectorAll(".ck-ep").forEach(el=>el.onclick=()=>{view="epics";activeEpicId=el.dataset.e;epicTab="overview";renderApp();});
  const bc=q("#ckClock");if(bc){const d=new Date();bc.textContent=":"+p2(d.getSeconds());}
  const mv=motionOn(),today=todayStr();
  /* the clock as a matrix readout — the one per screen; the colon blinks, a new minute wipes in */
  {const cv=q("#ckClockM");if(cv)scope(cv,(ctx,w,h,t,dt,s)=>{const d=new Date(),hm=p2(d.getHours())+":"+p2(d.getMinutes()),str=mv&&d.getSeconds()%2?hm.replace(":",";"):hm;
    if(s.hm!==hm){s.from=s.hm||hm;s.hm=hm;s.t0=t;}const cell=V2.matrixFit("88:88",w,h),x=w-V2.matrixLayout(str).cols*cell;
    if(s.from!==hm&&t-s.t0<900)V2.matrixWipe(ctx,C,s.from,hm,x,0,cell,t-s.t0,C.ink,C["pen-2"]);else V2.matrixText(ctx,C,str,x,0,cell,C.ink);});}
  /* hero: a flow field, one stream colour per status, denser where more demands sit */
  {const N=mv?520:0,P=[],r=rng(7);
    const ws=(()=>{const k={open:0,progress:0,bug:0,delivered:0};state.tasks.forEach(t=>{if(k[t.status]!=null)k[t.status]++;});
      const a=Object.entries(k).map(([s,n])=>[STATUS_CK[s],1+n*2]),sum=a.reduce((x,y)=>x+y[1],0);return a.map(([p,n])=>[p,n/sum]);})();
    const spawn=(p,w,h)=>{p.x=r()*w;p.y=r()*h;p.life=60+r()*160;let u=r(),acc=0;p.pen=ws[0][0];for(const [pen,wt] of ws){acc+=wt;if(u<=acc){p.pen=pen;break;}}};
    for(let i=0;i<N;i++)P.push({});
    scope(q("#ckFlow"),(ctx,w,h,t,dt,s)=>{
      if(s.fresh){ctx.fillStyle=C.paper;ctx.globalAlpha=1;ctx.fillRect(0,0,w,h);P.forEach(p=>spawn(p,w,h));}
      ctx.globalAlpha=.07;ctx.fillStyle=C.paper;ctx.fillRect(0,0,w,h);ctx.lineWidth=1;const tt=t*.00006;
      for(const p of P){const a=Math.sin(p.x*.0036+tt*3)*1.6+Math.cos(p.y*.006-tt*2)*1.2+.25,sp=.55+.35*Math.sin(tt*5+p.y*.01);
        const nx=p.x+Math.cos(a)*sp*dt*.108,ny=p.y+Math.sin(a)*sp*dt*.06;ctx.globalAlpha=.3;ctx.strokeStyle=C[p.pen]||C["ink-3"];
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(nx,ny);ctx.stroke();p.x=nx;p.y=ny;
        if(--p.life<0||p.x<-5||p.x>w+5||p.y<-5||p.y>h+5)spawn(p,w,h);}
      /* calm the field behind the text with a soft fade, not a hard-edged block (it used to end in a visible seam) */
      const fw=Math.min(w*.7,980),g=ctx.createLinearGradient(0,0,fw,0);g.addColorStop(0,DK.fade(C.paper,1));g.addColorStop(.45,DK.fade(C.paper,.85));g.addColorStop(1,DK.fade(C.paper,0));
      ctx.globalAlpha=.35;ctx.fillStyle=g;ctx.fillRect(0,0,fw,h);},{keep:true});}
  /* tiles */
  const tiles=host.querySelectorAll(".ck-tile");tiles.forEach(el=>el.onclick=()=>goView(CK_TILES[+el.dataset.i].view));
  {const st={v:mv?0:1};scope(tiles[0].querySelector("canvas"),(ctx,w,h,t,dt)=>{
    const segs=["bug","progress","open","delivered"].map(s=>[s,state.tasks.filter(x=>x.status===s).length]),tot=Math.max(1,segs.reduce((n,x)=>n+x[1],0));
    st.v+=(1-st.v)*DK.ease(dt,.05);const n=72,R=Math.min(w,h)/2-8,cx=w/2+18,cy=h/2,spin=mv?t*.00004:0;
    for(let i=0;i<n;i++){const f=i/n,a=-Math.PI/2+f*TAU+spin;let pen=null,run=0;for(const [s,k] of segs){run+=k/tot;if(f<run){pen=STATUS_CK[s];break;}}
      const x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;if(pen&&f<st.v&&state.tasks.length)dot(ctx,x,y,2,C[pen],.9);else dot(ctx,x,y,1.05,C["ink-4"]);}
    label(ctx,String(state.tasks.filter(x=>["open","progress","bug"].includes(x.status)).length),cx,cy-5,{font:DK.MONO,size:24,weight:600,color:C.ink});
    label(ctx,"ACTIVE",cx,cy+15,{size:8,spacing:2});
    const SH={bug:"rework",progress:"in progress",open:"open",delivered:"delivered"};
    segs.forEach(([s,k],i)=>{dot(ctx,8,12+i*14,2.5,C[STATUS_CK[s]]);label(ctx,`${k} ${SH[s]}`,16,12+i*14,{font:DK.MONO,size:9,weight:400,align:"left",color:C["ink-2"]});});});}
  scope(tiles[1].querySelector("canvas"),(ctx,w,h,t)=>{
    const cx=w/2,cy=h/2+2,R=Math.min(w,h)/2-6;[1,.66,.33].forEach(k=>ring(ctx,cx,cy,R*k,C["rule-strong"],.9));
    for(let i=0;i<48;i++){const a=i/48*TAU;dot(ctx,cx+Math.cos(a)*R,cy+Math.sin(a)*R,.8,C["ink-4"]);}
    const sw=mv?(t*.0012)%TAU:-Math.PI/2;
    if(mv)for(let k=0;k<26;k++){const a=sw-k*.03;ctx.globalAlpha=.16*(1-k/26);ctx.strokeStyle=C["pen-1"];ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);ctx.stroke();}
    /* evenly spread, most urgent first: hashed angles used to stack IDs on top of each other */
    const L=state.tasks.map(tk=>({tk,d:earliestOpenDue(tk)})).filter(o=>o.d&&daysUntil(o.d)<=7).map(o=>({...o,n:daysUntil(o.d)})).sort((a,b)=>a.n-b.n);
    L.forEach((o,i)=>{const late=o.n<0,a=-Math.PI/2+.35+i*TAU/Math.max(L.length,3);
      const r=late?R*(.36+Math.min(.6,-o.n/120)):R*(.1+o.n/7*.2),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
      const since=((sw-a)%TAU+TAU)%TAU,glow=mv?Math.max(.3,1-since/TAU*1.3):1,pen=late?C["pen-1"]:C["pen-4"];
      dot(ctx,x,y,late?2.8:2.2,pen,glow);if(glow>.8)ring(ctx,x,y,6+(1-glow)*20,pen,.35);
      if(i<4){const right=Math.cos(a)>=0;label(ctx,o.tk.demandId||o.tk.title.slice(0,8),x+(right?7:-7),y,{font:DK.MONO,size:8.5,weight:500,align:right?"left":"right",color:C["ink-2"]});}});
    if(L.length>4)label(ctx,"+"+(L.length-4)+" more",cx,h-4,{font:DK.MONO,size:8,weight:400,color:C["ink-3"]});
    dot(ctx,cx,cy,1.6,C.ink);});
  {const st={f:0};scope(tiles[2].querySelector("canvas"),(ctx,w,h,t,dt)=>{
    const m=state.tasks.filter(isWaiting).reduce((x,t)=>Math.max(x,waitDays(t)||0),0);st.f=mv?st.f+(Math.min(1,m/30)-st.f)*DK.ease(dt,.05):Math.min(1,m/30);
    const cx=w/2,cy=h/2+10,R=Math.min(w/2,h/1.55)-6;dotArc(ctx,cx,cy,R,st.f,40,m>=30?C.bad:C["pen-4"]);
    label(ctx,`${Math.round(st.f*30)}${m>30?"+":""} d`,cx,cy+18,{font:DK.MONO,size:15,weight:600,color:C.ink});label(ctx,"OF 30 D",cx,cy+33,{size:7.5,spacing:2});});}
  /* go-live: how many transports wait at each system of your two busiest landscapes; a dot travels on
     toward the next system only where something is actually waiting to move */
  {const pipe=pipelineData(),lanes=pipe.lanes.slice().sort((a,b)=>b.items.length-a.items.length).slice(0,2).sort((a,b)=>a.L.localeCompare(b.L)),tiers=pipe.tiers.slice(0,3);
    scope(tiles[3].querySelector("canvas"),(ctx,w,h,t)=>{const xs=[w*.16,w*.52,w*.88],ys=lanes.length>1?[h*.3,h*.68]:[h*.48],pens=[C["pen-2"],C["pen-4"],C["pen-3"]];
      if(!lanes.length){label(ctx,"no transports on open demands",w/2,h/2,{size:9,weight:400,color:C["ink-3"]});return;}
      lanes.forEach((ln,li)=>{const y=ys[li];for(let x=xs[0];x<=xs[2];x+=6)dot(ctx,x,y,.8,C["ink-4"]);
        label(ctx,ln.L,xs[0]-24,y,{font:DK.MONO,size:8.5,weight:500,color:C["ink-3"]});
        tiers.forEach((tier,si)=>{const x=xs[si],pen=pens[si],its=ln.items.filter(it=>it.si===si),n=its.length;
          ring(ctx,x,y,7,pen,n?.95:.4);if(n){dot(ctx,x,y,2.6,pen);label(ctx,String(n),x,y-15,{font:DK.MONO,size:9.5,weight:600,color:C.ink});}
          if(mv&&si<tiers.length-1&&its.some(it=>it.rel&&!it.done)){const f=((t*.00025)+li*.4+si*.3)%1;dot(ctx,x+(xs[si+1]-x)*f,y,1.6,pen,.25+.6*Math.sin(f*Math.PI));}});});
      ["DEV","QA","PRD"].forEach((s,i)=>label(ctx,s,xs[i],h-5,{size:7.5,spacing:2}));});}
  /* transport pipeline */
  const pipeRec=scope(q("#ckPipe"),(ctx,w,h,t,dt,s)=>{const d=s.data,tiers=d.tiers,n=d.lanes.length;s.hits=[];
    if(!n){label(ctx,"No transports on open demands yet — they appear here as they move toward Prod.",w/2,h/2,{size:11,weight:400,color:C["ink-3"]});return;}
    if(!s.P){s.P=[];const r=rng(21);for(let i=0;i<70*n;i++)s.P.push({u:r(),s:.35+r()*.8,j:r()-.5,lane:i%n});}
    const laneH=(h-8)/n,x0=w*.12,x1=w*.88,last=tiers.length-1,xs=tiers.map((_,i)=>x0+(x1-x0)*(i/Math.max(1,last))),pens=[C["pen-2"],C["pen-4"],C["pen-3"]];
    d.lanes.forEach((ln,li)=>{const y=laneH*li+laneH*.52;
      label(ctx,"LANDSCAPE "+ln.L,4,laneH*li+10,{size:8,spacing:2,align:"left"});
      for(let x=xs[0];x<=xs[last];x+=7)dot(ctx,x,y,.85,C["ink-4"]);
      const far=Math.max(0,...ln.items.filter(x=>x.rel).map(x=>x.si));
      if(far>0)s.P.forEach(p=>{if(p.lane!==li)return;if(mv)p.u+=p.s*dt*.00007;if(p.u>1)p.u-=1;
        const u=p.u*far/Math.max(1,last),x=xs[0]+(xs[last]-xs[0])*u,k=Math.min(2,Math.round(u*last));
        dot(ctx,x,y+p.j*7*Math.sin(p.u*Math.PI*4),1.1,pens[k],.18+.35*Math.sin(p.u*Math.PI));});
      tiers.forEach((tier,si)=>{const sx=xs[si],pen=pens[Math.min(2,si)],sys=ln.L+tier,meta=tierFor(tier);
        ring(ctx,sx,y,11,pen,.9);ring(ctx,sx,y,15,pen,.18);
        label(ctx,sys,sx,y+26,{font:DK.MONO,size:10,weight:600,color:C.ink});label(ctx,meta?meta.short:"",sx,y+38,{size:7.5,spacing:2});
        if(si===last){const f=freezeFor(sys);let txt="",on=false;
          if(f){txt="FROZEN to "+f.to;on=true;}
          else{const up=state.playbook.filter(p=>p.kind==="freeze"&&p.from&&p.from>today&&(p.systems||[]).includes(sys)).map(p=>daysUntil(p.from)).sort((a,b)=>a-b)[0];if(up!=null&&up<=60)txt="freeze in "+up+" d";}
          if(txt){for(let k=-2;k<=2;k++){ctx.globalAlpha=on?.6:.25;ctx.strokeStyle=C["pen-1"];ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx+14+k*3,y+5);ctx.lineTo(sx+20+k*3,y-1);ctx.stroke();}
            label(ctx,txt,sx,y+50,{font:DK.MONO,size:8,weight:400,color:on?C["pen-1"]:C["ink-3"]});}}
        /* one bead per demand — bigger when more of its transports wait here; the label is the demand (nobody remembers
           transport numbers), hovering lists its transports, a click opens them */
        const parked=ln.items.filter(x=>x.si===si),gm=new Map();parked.forEach(it=>{if(!gm.has(it.t.id))gm.set(it.t.id,{t:it.t,items:[]});gm.get(it.t.id).items.push(it);});
        const groups=[...gm.values()].sort((a,b)=>b.items.length-a.items.length||(a.t.demandId||"").localeCompare(b.t.demandId||"")),show=groups.slice(0,5),SP=Math.min(34,Math.max(18,(xs[1]-xs[0])/(show.length+1.5)));
        show.forEach((g,k)=>{const px=sx+(k-(show.length-1)/2)*SP,nn=g.items.length,r=2.8+Math.min(3,nn-1)*.9,rel=g.items.filter(x=>x.rel).length,moving=g.items.some(x=>x.rel&&!x.done)&&si<last,pulse=mv?(Math.sin(t*.004+k+li*2)+1)/2:0;
          if(!rel)ring(ctx,px,y,r+.4,pen,.95,1.2);else{dot(ctx,px,y,r,pen);if(rel<nn)ring(ctx,px,y,r+3,pen,.7,1);if(moving)ring(ctx,px,y,r+3+pulse*5,pen,.35*(1-pulse));}
          label(ctx,(g.t.demandId||g.t.title.slice(0,9))+(nn>1?" ×"+nn:""),px,y-17-(k%2)*11,{font:DK.MONO,size:8.5,weight:500,color:C["ink-2"]});
          s.hits.push({x:px,y:y-8,rx:Math.max(10,SP/2),ry:18,g,sys});});
        if(groups.length>show.length)label(ctx,"+"+(groups.length-show.length),sx+(show.length/2)*SP+12,y,{font:DK.MONO,size:9,weight:600,color:C["ink-2"],align:"left"});});
      /* synced in from another landscape and not arrived yet: waiting at the lane's entrance */
      const arr=ln.items.filter(x=>x.si<0);
      if(arr.length){arr.slice(0,4).forEach((it,k)=>ring(ctx,xs[0]-28-k*9,y,3,it.rel?C["pen-2"]:C.watch,.9,1.1));
        label(ctx,"from "+[...new Set(arr.map(x=>x.from))].slice(0,2).join("/"),xs[0]-30,y+15,{font:DK.MONO,size:7.5,weight:400,color:C["ink-3"]});}});
  },{data:pipelineData()});
  efHover(pipeRec,h=>{const t=h.g.t;return `<b>${esc(demandLabel(t))}</b>${t.demandId?` <span class="faint">${esc(t.title)}</span>`:""}<br><span class="faint">${h.g.items.length} transport${h.g.items.length>1?"s":""} at ${esc(h.sys)}</span>`
      +h.g.items.map(it=>`<div class="mono" style="font-size:11px;margin-top:3px">${esc(it.tr.number||"(unnumbered)")} ${it.rel?"":"<span style='color:var(--watch)'>· not released</span>"}${it.done?" · ✓ there":it.target?" · → "+esc(it.target):""}${it.tr.desc?`<div class="faint" style="font-family:var(--sans)">${esc(it.tr.desc)}</div>`:""}</div>`).join("")+`<div class="faint" style="margin-top:4px">click to open its transports</div>`;},
    h=>{view="demands";activeId=h.g.t.id;activeTab="transports";renderApp();});
  q("#ckPipeU").onclick=()=>{if(pipeRec&&pipeRec.hv)return;view="transports";renderApp();};
  /* epic rings */
  host.querySelectorAll(".ck-ep").forEach(el=>{const e=epicById(el.dataset.e);if(!e)return;const r=epicRollup(e),f=r.ts.length?r.done/r.ts.length:0,st={v:mv?0:f};
    scope(el.querySelector("canvas"),(ctx,w,h,t,dt)=>{st.v+=(f-st.v)*DK.ease(dt,.04);dotRing(ctx,w/2,h/2,w/2-5,st.v,32,C["pen-5"],mv?t*.00008:0);
      label(ctx,Math.round(st.v*100)+"%",w/2,h/2,{font:DK.MONO,size:10,color:C.ink});});});
  /* 10-week calendar: freezes, recurring duties, due dates, next actions */
  scope(q("#ckCal"),(ctx,w,h,t,dt,s)=>{const W=10,cw=(w-40)/W,ch=(h-30)/7,start=new Date(today+"T00:00:00");start.setDate(start.getDate()-((start.getDay()+6)%7));
    const age=(performance.now()-s.born)/900;["M","T","W","T","F","S","S"].forEach((d,i)=>label(ctx,d,10,20+i*ch+ch/2,{size:7.5}));
    const frz=state.playbook.filter(p=>p.kind==="freeze"&&p.from&&p.to),rec=new Set(state.playbook.filter(p=>p.kind==="recurring"&&p.due).map(p=>p.due));
    const due=new Set(state.tasks.filter(x=>!["delivered","closed"].includes(x.status)&&x.dueDate).map(x=>x.dueDate)),nx=new Set(state.tasks.filter(x=>x.status!=="closed"&&x.nextAction&&x.nextAction.date).map(x=>x.nextAction.date));
    let lastM=-1;
    for(let c=0;c<W;c++)for(let r=0;r<7;r++){const d=new Date(start);d.setDate(d.getDate()+c*7+r);const di=dstr(d),x=34+c*cw+cw/2,y=20+r*ch+ch/2;
      if(d.getMonth()!==lastM&&r===0){lastM=d.getMonth();label(ctx,d.toLocaleDateString("en-GB",{month:"short"}).toUpperCase(),x,6,{size:7.5,spacing:1.5,color:C["ink-2"]});}
      const vis=mv?Math.max(0,Math.min(1,age*1.4-c*.12)):1;if(!vis)continue;
      if(di===today){ring(ctx,x,y,6,C.ink,vis);dot(ctx,x,y,2.4,C.ink,vis);continue;}
      if(frz.some(p=>p.from<=di&&di<=p.to)){dot(ctx,x,y,2.4,C["pen-1"],.75*vis);continue;}
      if(rec.has(di)){dot(ctx,x,y,3,C["pen-4"],vis);ring(ctx,x,y,6,C["pen-4"],.35*vis);continue;}
      if(due.has(di)){dot(ctx,x,y,2.6,C["pen-2"],vis);continue;}
      if(nx.has(di)){ring(ctx,x,y,3,C["pen-4"],vis,1.2);continue;}
      dot(ctx,x,y,r>4?.8:1.1,C["ink-4"],(di<today?.5:1)*vis);}
    [["pen-2","due"],["pen-4","next action",1],["pen-4","recurring"],["pen-1","freeze"]].forEach(([p,l,o],i)=>{const x=w-262+i*66;if(o)ring(ctx,x,h-5,3,C[p],1,1.2);else dot(ctx,x,h-5,2.2,C[p]);label(ctx,l,x+6,h-5,{size:8,weight:400,align:"left",color:C["ink-3"]});});});
  wireCalClick(q("#ckCal"),host);
}

/* ---------- theme + motion ----------
   A per-viewer preference (localStorage, never the data file), so it also applies on
   the lock screen. Two families: Bench (the default — Paper / Backlit, or follow
   Windows) (the three classic themes were retired in v48). The title-bar button flips light ↔ dark inside
   the chosen family; Settings (⋯) picks any theme and the motion level. */
const THEME_KEY="demanddesk.theme";
const THEME_OPTS={"bench":"Follow Windows","bench-paper":"Paper","bench-backlit":"Backlit"};   /* the classic themes were retired in v48 — a saved one opens as Bench */
try{if(!localStorage.getItem("demanddesk.themeV2")){localStorage.setItem("demanddesk.themeV2","1");localStorage.setItem(THEME_KEY,"bench");}}catch(e){}
function currentTheme(){try{const t=localStorage.getItem(THEME_KEY);return THEME_OPTS[t]?t:"bench";}catch(e){return "bench";}}
const darkMQ=matchMedia("(prefers-color-scheme: dark)");
function applyTheme(t){t=t||currentTheme();const el=document.documentElement;
  if(t.startsWith("bench")){el.setAttribute("data-theme","bench");el.setAttribute("data-mode",t==="bench-backlit"||(t==="bench"&&darkMQ.matches)?"dark":"light");}
  /* Chromium doesn't reliably repaint persistent chrome when :root variables change;
     detaching and reattaching the root forces every element to re-resolve them */
  el.style.display="none";void el.offsetHeight;el.style.display="";
  DK.readColors();applyMotion();
  const b=document.getElementById("btnTheme");
  if(b){const dark=t.startsWith("bench")?el.getAttribute("data-mode")==="dark":t==="dark";
    b.textContent=dark?"☀":"🌙";b.title=(dark?"Switch to light":"Switch to dark")+" · every theme is in ⋯ Settings";}}
function setTheme(t){try{localStorage.setItem(THEME_KEY,t);}catch(e){}applyTheme(t);lastTind=null;renderApp();}
function toggleTheme(){const t=currentTheme();let nx;
  if(t.startsWith("bench"))nx=document.documentElement.getAttribute("data-mode")==="dark"?"bench-paper":"bench-backlit";
  setTheme(nx);toast("Theme: "+THEME_OPTS[nx]);}
darkMQ.addEventListener("change",()=>{if(currentTheme()==="bench"){applyTheme("bench");renderApp();}});

