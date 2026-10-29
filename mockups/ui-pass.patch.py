import sys
# python ui_v41.py <file.html> — the UI pass; applied to the mockup first, to DemandDesk.html once approved
P = sys.argv[1]
s = open(P, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"expected {count} of: {old[:100]!r}, found {n}")
    s = s.replace(old, new)

# ---------- 1. Today hero: the flow field fades out instead of ending at a hard edge ----------
rep('''      ctx.globalAlpha=.35;ctx.fillStyle=C.paper;ctx.fillRect(0,0,Math.min(w*.46,620),h);},{keep:true});}''',
    '''      /* calm the field behind the text with a soft fade, not a hard-edged block (it used to end in a visible seam) */
      const fw=Math.min(w*.7,980),g=ctx.createLinearGradient(0,0,fw,0);g.addColorStop(0,DK.fade(C.paper,1));g.addColorStop(.45,DK.fade(C.paper,.85));g.addColorStop(1,DK.fade(C.paper,0));
      ctx.globalAlpha=.35;ctx.fillStyle=g;ctx.fillRect(0,0,fw,h);},{keep:true});}''')
# a colour with a given alpha, whatever form the theme gives it in
rep('''  function scope(cv,draw,opts={}){''', '''  function fade(col,a){col=String(col||"").trim();let m;
    if((m=col.match(/^#([0-9a-f]{3})$/i)))col="#"+m[1].split("").map(x=>x+x).join("");
    if((m=col.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i)))return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a})`;
    if((m=col.match(/^rgba?\\(([^)]+)\\)/)))return `rgba(${m[1].split(",").slice(0,3).join(",")},${a})`;return col;}
  function scope(cv,draw,opts={}){''')
rep('''label,rng,scope,get MONO(){''', '''label,rng,scope,fade,get MONO(){''')

# ---------- 2. Pulse tiles: Overdue opens just the late and due-soon demands; the hero numbers are links ----------
rep('''const DV_ONLY={delegated:"Built by someone in my team",overdue:"Overdue",''', '''const DV_ONLY={delegated:"Built by someone in my team",overdue:"Overdue",due7:"Overdue or due within 7 days",''')
rep('''      else if(k==="delegated"){if(!buildersOf(t).length)return false;}}''', '''      else if(k==="delegated"){if(!buildersOf(t).length)return false;}
      else if(k==="due7"){const d=earliestOpenDue(t);if(!(d&&daysUntil(d)<=7))return false;}}''')
rep('''view:{group:"due",sort:"due"}},''', '''view:{group:"due",sort:"due",only:["due7"]}},''')
rep('''        <div class="ck-sub"><b>${c.active.length}</b> active &nbsp;·&nbsp; <b class="${c.over.length?"bad":""}">${c.over.length}</b> overdue &nbsp;·&nbsp; <b class="${c.clash?"bad":""}">${c.clash}</b> object clash${c.clash===1?"":"es"} &nbsp;·&nbsp; <b>${c.short}</b> transport${c.short===1?"":"s"} short of go-live</div>''',
    '''        <div class="ck-sub"><a class="ck-sl" data-sl="0"><b>${c.active.length}</b> active</a> &nbsp;·&nbsp; <a class="ck-sl" data-sl="1"><b class="${c.over.length?"bad":""}">${c.over.length}</b> overdue</a> &nbsp;·&nbsp; <a class="ck-sl" data-sl="2"><b class="${c.clash?"bad":""}">${c.clash}</b> object clash${c.clash===1?"":"es"}</a> &nbsp;·&nbsp; <a class="ck-sl" data-sl="3"><b>${c.short}</b> transport${c.short===1?"":"s"} short of go-live</a></div>''')
rep('''  q("#ckPipeU").onclick=()=>goView(CK_TILES[3].view);''', '''  {const SL=[CK_TILES[0].view,{group:"none",sort:"due",only:["overdue"]},{group:"none",sort:"clash",dir:"desc",only:["clash"]},CK_TILES[3].view];
   host.querySelectorAll(".ck-sl").forEach(a=>a.onclick=()=>goView(SL[+a.dataset.sl]));}''')

# radar: spread evenly so IDs never pile up; label the four most urgent, outward
rep('''    state.tasks.forEach(tk=>{const d=earliestOpenDue(tk);if(!d)return;const n=daysUntil(d);if(n>7)return;const late=n<0,a=hashAngle(tk.id);
      const r=late?R*(.36+Math.min(.6,-n/120)):R*(.1+n/7*.2),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
      const since=((sw-a)%TAU+TAU)%TAU,glow=mv?Math.max(.3,1-since/TAU*1.3):1,pen=late?C["pen-1"]:C["pen-4"];
      dot(ctx,x,y,late?2.8:2.2,pen,glow);if(glow>.8)ring(ctx,x,y,6+(1-glow)*20,pen,.35);
      label(ctx,(tk.demandId||tk.title).slice(-5),x+6,y-6,{font:DK.MONO,size:8,weight:400,align:"left",color:C["ink-3"]});});''',
    '''    /* evenly spread, most urgent first: hashed angles used to stack IDs on top of each other */
    const L=state.tasks.map(tk=>({tk,d:earliestOpenDue(tk)})).filter(o=>o.d&&daysUntil(o.d)<=7).map(o=>({...o,n:daysUntil(o.d)})).sort((a,b)=>a.n-b.n);
    L.forEach((o,i)=>{const late=o.n<0,a=-Math.PI/2+.35+i*TAU/Math.max(L.length,3);
      const r=late?R*(.36+Math.min(.6,-o.n/120)):R*(.1+o.n/7*.2),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
      const since=((sw-a)%TAU+TAU)%TAU,glow=mv?Math.max(.3,1-since/TAU*1.3):1,pen=late?C["pen-1"]:C["pen-4"];
      dot(ctx,x,y,late?2.8:2.2,pen,glow);if(glow>.8)ring(ctx,x,y,6+(1-glow)*20,pen,.35);
      if(i<4){const right=Math.cos(a)>=0;label(ctx,o.tk.demandId||o.tk.title.slice(0,8),x+(right?7:-7),y,{font:DK.MONO,size:8.5,weight:500,align:right?"left":"right",color:C["ink-2"]});}});
    if(L.length>4)label(ctx,"+"+(L.length-4)+" more",cx,h-4,{font:DK.MONO,size:8,weight:400,color:C["ink-3"]});''')

# Go-live tile: real counts per system instead of decorative particles
rep('''  {const r=rng(11),M=[];for(let i=0;i<34;i++)M.push({x:r(),lane:Math.floor(r()*2),s:.4+r()*.6});
    const pipe=pipelineData(),names=pipe.lanes.slice(0,2).map(l=>l.L+"x");
    scope(tiles[3].querySelector("canvas"),(ctx,w,h,t,dt)=>{const xs=[w*.12,w*.5,w*.88],ys=names.length>1?[h*.32,h*.7]:[h*.5];
      ys.forEach((y,li)=>{for(let x=xs[0];x<=xs[2];x+=6)dot(ctx,x,y,.8,C["ink-4"]);
        xs.forEach((x,si)=>{const pen=[C["pen-2"],C["pen-4"],C["pen-3"]][si];ring(ctx,x,y,6,pen,.9);dot(ctx,x,y,2,pen);});
        label(ctx,names[li]||"",xs[0]-18,y,{font:DK.MONO,size:8,weight:400,color:C["ink-3"]});});
      if(pipe.lanes.length)M.forEach(p=>{if(mv)p.x+=p.s*dt*.00012;if(p.x>1)p.x=0;const li=Math.min(ys.length-1,p.lane),x=xs[0]+(xs[2]-xs[0])*p.x*.72;
        dot(ctx,x,ys[li]+Math.sin(p.x*40)*1.2,1.4,x<xs[1]?C["pen-2"]:C["pen-4"],.25+.6*Math.sin(p.x*Math.PI));});
      ["DEV","QA","PRD"].forEach((s,i)=>label(ctx,s,xs[i],h-5,{size:7.5,spacing:2}));});}''',
    '''  /* go-live: how many transports wait at each system of your two busiest landscapes; a dot travels on
     toward the next system only where something is actually waiting to move */
  {const pipe=pipelineData(),lanes=pipe.lanes.slice().sort((a,b)=>b.items.length-a.items.length).slice(0,2).sort((a,b)=>a.L.localeCompare(b.L)),tiers=pipe.tiers.slice(0,3);
    scope(tiles[3].querySelector("canvas"),(ctx,w,h,t)=>{const xs=[w*.16,w*.52,w*.88],ys=lanes.length>1?[h*.3,h*.68]:[h*.48],pens=[C["pen-2"],C["pen-4"],C["pen-3"]];
      if(!lanes.length){label(ctx,"no transports on open demands",w/2,h/2,{size:9,weight:400,color:C["ink-3"]});return;}
      lanes.forEach((ln,li)=>{const y=ys[li];for(let x=xs[0];x<=xs[2];x+=6)dot(ctx,x,y,.8,C["ink-4"]);
        label(ctx,ln.L,xs[0]-24,y,{font:DK.MONO,size:8.5,weight:500,color:C["ink-3"]});
        tiers.forEach((tier,si)=>{const x=xs[si],pen=pens[si],its=ln.items.filter(it=>it.si===si),n=its.length;
          ring(ctx,x,y,7,pen,n?.95:.4);if(n){dot(ctx,x,y,2.6,pen);label(ctx,String(n),x,y-15,{font:DK.MONO,size:9.5,weight:600,color:C.ink});}
          if(mv&&si<tiers.length-1&&its.some(it=>it.rel&&!it.done)){const f=((t*.00025)+li*.4+si*.3)%1;dot(ctx,x+(xs[si+1]-x)*f,y,1.6,pen,.25+.6*Math.sin(f*Math.PI));}});});
      ["DEV","QA","PRD"].forEach((s,i)=>label(ctx,s,xs[i],h-5,{size:7.5,spacing:2}));});}''')

# ---------- 3. Transport pipeline: one bead per demand, labelled with the demand; hover lists the transports ----------
rep('''  scope(q("#ckPipe"),(ctx,w,h,t,dt,s)=>{const d=s.data,tiers=d.tiers,n=d.lanes.length;''',
    '''  const pipeRec=scope(q("#ckPipe"),(ctx,w,h,t,dt,s)=>{const d=s.data,tiers=d.tiers,n=d.lanes.length;s.hits=[];''')
rep('''          if(txt){for(let k=-3;k<=3;k++){ctx.globalAlpha=on?.6:.25;ctx.strokeStyle=C["pen-1"];ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx+18+k*3,y-13);ctx.lineTo(sx+24+k*3,y-19);ctx.stroke();}
            label(ctx,txt,sx+20,y-27,{font:DK.MONO,size:8,weight:400,color:on?C["pen-1"]:C["ink-3"],align:"right"});}}''',
    '''          if(txt){for(let k=-2;k<=2;k++){ctx.globalAlpha=on?.6:.25;ctx.strokeStyle=C["pen-1"];ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(sx+14+k*3,y+5);ctx.lineTo(sx+20+k*3,y-1);ctx.stroke();}
            label(ctx,txt,sx,y+50,{font:DK.MONO,size:8,weight:400,color:on?C["pen-1"]:C["ink-3"]});}}''')
rep('''        const parked=ln.items.filter(x=>x.si===si),show=parked.slice(0,7);
        show.forEach((it,k)=>{const px=sx+(k-(show.length-1)/2)*11,pulse=mv?(Math.sin(t*.004+k+li*2)+1)/2:0;
          if(!it.rel)ring(ctx,px,y,3.4,pen,.95,1.2);
          else{dot(ctx,px,y,3.2,pen);if(!it.done&&si<last)ring(ctx,px,y,4+pulse*5,pen,.35*(1-pulse));}
          label(ctx,String(it.tr.number||"TR").slice(-4),px,y-15-(k%2)*10,{font:DK.MONO,size:8,weight:400,color:C["ink-3"]});});
        if(parked.length>show.length)label(ctx,"+"+(parked.length-show.length),sx+show.length*5.5+8,y,{font:DK.MONO,size:9,weight:600,color:C["ink-2"],align:"left"});});''',
    '''        /* one bead per demand — bigger when more of its transports wait here; the label is the demand (nobody remembers
           transport numbers), hovering lists its transports, a click opens them */
        const parked=ln.items.filter(x=>x.si===si),gm=new Map();parked.forEach(it=>{if(!gm.has(it.t.id))gm.set(it.t.id,{t:it.t,items:[]});gm.get(it.t.id).items.push(it);});
        const groups=[...gm.values()].sort((a,b)=>b.items.length-a.items.length||(a.t.demandId||"").localeCompare(b.t.demandId||"")),show=groups.slice(0,5),SP=Math.min(34,Math.max(18,(xs[1]-xs[0])/(show.length+1.5)));
        show.forEach((g,k)=>{const px=sx+(k-(show.length-1)/2)*SP,nn=g.items.length,r=2.8+Math.min(3,nn-1)*.9,rel=g.items.filter(x=>x.rel).length,moving=g.items.some(x=>x.rel&&!x.done)&&si<last,pulse=mv?(Math.sin(t*.004+k+li*2)+1)/2:0;
          if(!rel)ring(ctx,px,y,r+.4,pen,.95,1.2);else{dot(ctx,px,y,r,pen);if(rel<nn)ring(ctx,px,y,r+3,pen,.7,1);if(moving)ring(ctx,px,y,r+3+pulse*5,pen,.35*(1-pulse));}
          label(ctx,(g.t.demandId||g.t.title.slice(0,9))+(nn>1?" ×"+nn:""),px,y-17-(k%2)*11,{font:DK.MONO,size:8.5,weight:500,color:C["ink-2"]});
          s.hits.push({x:px,y:y-8,rx:Math.max(10,SP/2),ry:18,g,sys});});
        if(groups.length>show.length)label(ctx,"+"+(groups.length-show.length),sx+(show.length/2)*SP+12,y,{font:DK.MONO,size:9,weight:600,color:C["ink-2"],align:"left"});});''')
rep('''  },{data:pipelineData()});
  /* epic rings */''', '''  },{data:pipelineData()});
  efHover(pipeRec,h=>{const t=h.g.t;return `<b>${esc(demandLabel(t))}</b>${t.demandId?` <span class="faint">${esc(t.title)}</span>`:""}<br><span class="faint">${h.g.items.length} transport${h.g.items.length>1?"s":""} at ${esc(h.sys)}</span>`
      +h.g.items.map(it=>`<div class="mono" style="font-size:11px;margin-top:3px">${esc(it.tr.number||"(unnumbered)")} ${it.rel?"":"<span style='color:var(--watch)'>· not released</span>"}${it.done?" · ✓ there":it.target?" · → "+esc(it.target):""}${it.tr.desc?`<div class="faint" style="font-family:var(--sans)">${esc(it.tr.desc)}</div>`:""}</div>`).join("")+`<div class="faint" style="margin-top:4px">click to open its transports</div>`;},
    h=>{view="demands";activeId=h.g.t.id;activeTab="transports";renderApp();});
  q("#ckPipeU").onclick=()=>{if(pipeRec&&pipeRec.hv)return;goView(CK_TILES[3].view);};
  /* epic rings */''')
rep('''<canvas id="ckPipe" style="width:100%;height:${lanesN*96+8}px;display:block"></canvas>''', '''<canvas id="ckPipe" style="width:100%;height:${lanesN*104+8}px;display:block"></canvas>''')
rep('''<span>Each dot is a transport of an open demand, parked at the furthest system it has reached in its landscape. Streams run along the routes your transports have travelled; a <b>hollow ring</b> is not released yet, a <b>pulse</b> is waiting for its next import. Prod shows a coming change freeze.</span>''',
    '''<span>Each bead is a <b>demand</b>, sitting at the furthest system its transports have reached (<b>×3</b> = three of them there) — hover to see the transports, click to open them. A <b>hollow ring</b> isn't released yet, a <b>pulse</b> is waiting for its next import. Prod shows a coming change freeze.</span>''')

# calendar legend gets the next-action key the header promises
rep('''    [["pen-2","due"],["pen-4","recurring"],["pen-1","freeze"]].forEach(([p,l],i)=>{dot(ctx,w-156+i*54,h-5,2.2,C[p]);label(ctx,l,w-150+i*54,h-5,{size:8,weight:400,align:"left",color:C["ink-3"]});});});''',
    '''    [["pen-2","due"],["pen-4","next action",1],["pen-4","recurring"],["pen-1","freeze"]].forEach(([p,l,o],i)=>{const x=w-262+i*66;if(o)ring(ctx,x,h-5,3,C[p],1,1.2);else dot(ctx,x,h-5,2.2,C[p]);label(ctx,l,x+6,h-5,{size:8,weight:400,align:"left",color:C["ink-3"]});});});''')

# ---------- 4. Needs attention: cards flow in columns (no holes), long details go on their own line ----------
rep('''${shown.map((it,ii)=>`<div class="dashitem" data-c="${ci}" data-i="${ii}">''', '''${shown.map((it,ii)=>`<div class="dashitem ${String(it.sub||"").replace(/<[^>]+>/g,"").length>26?"two":""}" data-c="${ci}" data-i="${ii}">''')

# ---------- 5. Demand page: the stat strip never truncates or leaves a grey hole; History dates read like the rest ----------
rep('''function roHTML(items){return `<div class="bro">''', '''function roHTML(items,cls){return `<div class="bro ${cls||""}">''')
rep('''      isWaiting(t)?{k:"Waiting on",v:esc(t.waiting.on)+(waitDays(t)!=null?`<small>${waitDays(t)} d</small>`:""),cls:"warn"}:null])}''',
    '''      isWaiting(t)?{k:"Waiting on",v:esc(t.waiting.on)+(waitDays(t)!=null?`<small>${waitDays(t)} d</small>`:""),cls:"warn"}:null],"stack")}''')
rep('''function fmtTs(ts){const d=new Date(ts);return d.toLocaleDateString()+" "+d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}''',
    '''function fmtTs(ts){const d=new Date(ts),y=d.getFullYear()!==new Date().getFullYear();return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",...(y?{year:"numeric"}:{})})+" · "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});}''')
# the bottom row (journal + time) stays side by side; only Needs attention flows in columns
rep('''<div class="dash-grid" style="margin-top:14px"><div class="dashcard"><h3>📓 Today's journal</h3>''', '''<div class="dash-grid dg-row" style="margin-top:14px"><div class="dashcard"><h3>📓 Today's journal</h3>''')
# side panel: "H03 · DEV · client 010" no longer cut off
rep('''(t.client?" · client "+esc(t.client):""):"—"}</span>''', '''(t.client?" / "+esc(t.client):""):"—"}</span>''')

# Journey: labels take the first free lane, so close events, the rework arc and DUE never print over each other
rep('''    label(c,"rework",(a+b)/2,y-30,{size:8,color:C.bad});});''', '''    label(c,"rework",(a+b)/2,y-30,{size:8,color:C.bad});occ.push({x0:(a+b)/2-18,x1:(a+b)/2+18,y0:y-36,y1:y-24});});''')
rep('''  hs.forEach((e,i)=>{if(e.s!=="bug")return;const prev=hs.slice(0,i).reverse().find(x=>x.s==="delivered");if(!prev)return;const a=X(prev.d),b=X(e.d);if(b>xMax)return;''',
    '''  const occ=[];
  if(t.dueDate){const xd=X(t.dueDate);occ.push({x0:xd-12,x1:xd+12,y0:y-36,y1:y-24});}
  if(xNow<=xMax)occ.push({x0:xNow-18,x1:xNow+18,y0:y+34,y1:y+46});
  hs.forEach((e,i)=>{if(e.s!=="bug")return;const prev=hs.slice(0,i).reverse().find(x=>x.s==="delivered");if(!prev)return;const a=X(prev.d),b=X(e.d);if(b>xMax)return;''')
rep('''  let lastX=-99,flip=0;
  hs.forEach(e=>{const x=X(e.d);if(x>xMax)return;dot(c,x,y,4.2,C.paper);dot(c,x,y,3.4,pen(e.s));
    flip=x-lastX<60?1-flip:0;lastX=x;const up=flip===1;
    label(c,(STATUS[e.s]?STATUS[e.s].label.split(" /")[0]:e.s).toUpperCase(),x,y+(up?-16:18),{size:7.5,color:pen(e.s)});
    label(c,shortD(e.d),x,y+(up?-26:28),{font:DK.MONO,size:8,weight:400});});''',
    '''  const LANES=[[18,28],[-16,-26],[-42,-52],[44,54]];
  hs.forEach(e=>{const x=X(e.d);if(x>xMax)return;dot(c,x,y,4.2,C.paper);dot(c,x,y,3.4,pen(e.s));
    const st=(STATUS[e.s]?STATUS[e.s].label.split(" /")[0]:e.s).toUpperCase(),dt2=shortD(e.d),hw=Math.max(st.length*5.4,dt2.length*5.2)/2+3;
    let ln=LANES.find(([a,b])=>{const y0=y+Math.min(a,b)-6,y1=y+Math.max(a,b)+6;return !occ.some(o=>x-hw<o.x1&&x+hw>o.x0&&y0<o.y1&&y1>o.y0);})||LANES[0];
    occ.push({x0:x-hw,x1:x+hw,y0:y+Math.min(...ln)-6,y1:y+Math.max(...ln)+6});
    label(c,st,x,y+ln[0],{size:7.5,color:pen(e.s)});
    label(c,dt2,x,y+ln[1],{font:DK.MONO,size:8,weight:400});});''')

# ---------- 6. Effort + Review ----------
# the rhythm chart's busiest day used class "mx" — the transport map's table class (width:100%) stretched it
rep('''return `<div class="${v.d===best&&best>0?"mx":""}" title=''', '''return `<div class="${v.d===best&&best>0?"rh-best":""}" title=''')
rep('''  .efx .ef-rh>div.mx b{color:var(--ink)}''', '''  .efx .ef-rh>div.rh-best b{color:var(--ink)}''')
# Noticed: don't repeat the title when the label already carries it (shared ticket IDs)
rep('''  if(g==="demand"){const t=efTaskOf(k);return t?{l:demandLabel(t),sub:t.demandId?t.title:"",col:efPen(k)}:{l:"(deleted demand)",col:"ink-4"};}''',
    '''  if(g==="demand"){const t=efTaskOf(k);return t?{l:demandLabel(t),sub:t.demandId&&demandLabel(t)===t.demandId?t.title:"",col:efPen(k)}:{l:"(deleted demand)",col:"ink-4"};}''')
# Review page: hours on Tasks get their own line, as in the document
rep('''  const th=by(e=>{const t=rvTask(e.taskId);return e.taskId?(t&&t.theme)||"No theme":e.epicId?"◆ Epic-level work":"Not demand work";}),''',
    '''  const th=by(e=>{const t=rvTask(e.taskId);return e.taskId?(t&&t.theme)||"No theme":e.epicId?"◆ Epic-level work":e.jobId?"Other tasks":"Not demand work";}),''')
rep('''row(k,h,k==="Not demand work"?"ink-3":k==="◆ Epic-level work"?"pen-5":efThemePen(k))''', '''row(k,h,k==="Not demand work"?"ink-3":k==="◆ Epic-level work"?"pen-5":k==="Other tasks"?"pen-7":efThemePen(k))''')

# ---------- 7. Small alignment fixes ----------
rep('''<span style="flex:1">Attendees <input id="mt-att"''', '''<span class="dh-grow">Attendees <input id="mt-att"''')
rep('''    ${jobOpen(j)?`<div class="jb-bandrow">⏳ Waiting on''', '''    ${jobOpen(j)?`<div class="jb-bandrow jb-wait">⏳ Waiting on''')

# ---------- CSS ----------
rep('''  #printArea{display:none}''', '''  /* UI pass (v41) */
  .ck-sub a.ck-sl{color:inherit;text-decoration:none;cursor:pointer;border-bottom:1px dotted transparent}
  .ck-sub a.ck-sl:hover{border-bottom-color:currentColor}
  .dash-grid{display:block;columns:330px;column-gap:14px}
  .dash-grid>*{break-inside:avoid;margin:0 0 14px;width:100%;display:inline-block}
  .dash-grid.dg-row{display:grid;columns:auto}.dash-grid.dg-row>*{margin:0;display:block}
  span.du{white-space:nowrap}
  .dashitem.two{flex-wrap:wrap;row-gap:2px}
  .dashitem.two .di-main{flex:1 1 100%}
  .dashitem.two .di-sub{flex:1 1 auto;white-space:normal;line-height:1.35}
  .bro{display:flex;flex-wrap:wrap}
  .bro-i{flex:1 1 104px}
  .bro.stack .v small{display:block;margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dh-dates .dh-grow{display:flex;align-items:center;gap:8px;flex:1;min-width:220px}
  .dh-dates .dh-grow input{flex:1}
  :root[data-theme="bench"] .jb-wait{border:1px solid var(--rule);border-radius:3px;padding:6px 10px;margin-top:10px}
  main.board .filters button{flex:0 0 auto!important;padding-left:14px;padding-right:14px}
  main.board #btnNew{width:auto!important;align-self:flex-start}
  .ck-ep .es b{white-space:nowrap}
  #printArea{display:none}''')

open(P, "w", encoding="utf-8").write(s)
print("ok", P)
