/* ===================== ONE COHERENT LOOK =====================
   Tasks and Meetings get the header Demands and Epics have — kind and context on top, the
   title, a status segment, readouts — with their editable fields folded under ✎ Details.
   The Waiting tile on Today names the three longest waits; a day in Next 10 weeks opens
   what's on it. */
const hdrOpen=new Set();   /* tasks and meetings whose Details fields are open (this session only) */
const JOB_PEN={open:"var(--pen-2)",progress:"var(--pen-4)",done:"var(--pen-3)",dropped:"var(--ink-3)"};
function hdrToggle(id,redraw){if(hdrOpen.has(id))hdrOpen.delete(id);else hdrOpen.add(id);redraw();}
function waitListHTML(ws){return `<div class="bl ck-wl">${ws.slice(0,3).map(t=>`<div title="${esc(demandLabel(t))} — waiting on ${esc(t.waiting.on)}"><b class="mono">${esc(t.demandId||"—")}</b><span>${esc(t.waiting.on)}</span><i>${waitDays(t)!=null?waitDays(t)+" d":"—"}</i></div>`).join("")}</div>`;}
/* everything on one day: freezes, recurring duties, due dates, next actions, tasks, meetings, epic targets, days off */
function calDayItems(di){const out=[],dl=x=>`${x.demandId?`<b class="mono">${esc(x.demandId)}</b> `:""}${esc(x.title)}`;
  const toDemand=x=>()=>{view="demands";activeId=x.id;activeTab="overview";renderApp();},toPlay=p=>()=>{view="playbook";activePlayId=p.id;renderApp();};
  (state.daysOff||[]).filter(x=>x.date===di).forEach(x=>out.push({pen:EF_OFF[x.kind]?EF_OFF[x.kind].pen:"pen-5",k:EF_OFF[x.kind]?EF_OFF[x.kind].l:"Day off",tx:esc(x.label||"")||"—",go:()=>openDaysOff({date:di})}));
  state.playbook.filter(p=>p.kind==="freeze"&&p.from&&p.to&&p.from<=di&&di<=p.to).forEach(p=>out.push({pen:"pen-1",k:"Freeze",tx:`${esc(p.title)}${(p.systems||[]).length?` <span class="faint">${esc(p.systems.join(", "))}</span>`:""}`,go:toPlay(p)}));
  state.playbook.filter(p=>p.kind==="recurring"&&p.due===di).forEach(p=>out.push({pen:"pen-4",k:"Recurring",tx:esc(p.title),go:toPlay(p)}));
  state.meetings.filter(m=>m.date===di).forEach(m=>out.push({pen:"ink-3",k:"Meeting",tx:esc(m.title),go:()=>{view="meetings";meetingRollup=false;activeMeetingId=m.id;renderApp();}}));
  state.tasks.filter(x=>!["delivered","closed"].includes(x.status)&&x.dueDate===di).forEach(x=>out.push({pen:"pen-2",k:"Due",tx:dl(x),go:toDemand(x)}));
  state.tasks.filter(x=>x.status!=="closed"&&x.nextAction&&x.nextAction.date===di).forEach(x=>out.push({pen:"pen-4",k:"Next action",tx:`${esc(x.nextAction.note||"(next step)")} <span class="faint">${esc(demandLabel(x))}</span>`,go:toDemand(x)}));
  state.jobs.filter(j=>jobOpen(j)&&(j.due===di||j.nextAction.date===di)).forEach(j=>out.push({pen:"pen-7",k:j.due===di?"Task due":"Task step",tx:esc(j.due===di?j.title:(j.nextAction.note||j.title)),go:()=>{view="jobs";activeJobId=j.id;renderApp();}}));
  state.epics.filter(e=>e.status!=="closed"&&e.targetDate===di).forEach(e=>out.push({pen:"pen-5",k:"Epic target",tx:esc(epicLabel(e)),go:()=>{view="epics";activeEpicId=e.id;renderApp();}}));
  return out;}
function wireCalClick(cv,host){const box=host.querySelector("#ckCalDay");if(!cv||!box)return;cv.style.cursor="pointer";cv.title="Click a day to see what's on it";
  cv.addEventListener("click",e=>{const r=cv.getBoundingClientRect(),W=10,cw=(r.width-40)/W,ch=(r.height-30)/7,c=Math.floor((e.clientX-r.left-34)/cw),rw=Math.floor((e.clientY-r.top-20)/ch);
    if(c<0||c>=W||rw<0||rw>6)return;
    const d=new Date(todayStr()+"T00:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7)+c*7+rw);const di=isoD(d),items=calDayItems(di);
    box.innerHTML=`<div class="ck-cd-h"><b>${esc(efWdl(di))}</b>${di===todayStr()?" · today":""}<span class="faint">${items.length?items.length+" thing"+(items.length===1?"":"s"):""}</span><a href="#" class="ck-cd-x" title="Close">✕</a></div>
      ${items.length?items.map((x,i)=>`<div class="ck-cd-r" data-i="${i}" style="--pen:var(--${x.pen})"><i></i><span class="k">${x.k}</span><span class="tx">${x.tx}</span></div>`).join(""):`<div class="faint">Nothing on this day.</div>`}`;
    box.classList.add("on");box.querySelectorAll(".ck-cd-r").forEach(el=>el.onclick=()=>items[+el.dataset.i].go());
    box.querySelector(".ck-cd-x").onclick=ev=>{ev.preventDefault();box.classList.remove("on");};});}
