/* ===================== SELF-TEST =====================
   DemandDesk.html?selftest — a sandbox: your file, the browser backup and the snapshots are never
   read or written. It upgrades old-format data and checks nothing is lost, checks the numbers the
   app shows (rework, rounds, hours, transports…), then opens every page, tab and dialog in every
   theme and reports anything that broke. Run it after every update — on the work laptop too. */
function stOldFixture(){return {version:10,settings:{landscapes:["H0","H4"],tiers:DEF_TIERS,defaultSystem:"H03",clients:{H0:["010"]}},
  tasks:[{id:"st-o1",demandId:"ST-100",title:"Old-format demand with a legacy ToC",status:"delivered",type:"Report change",requestor:"Legacy requestor",receivedDate:"2025-01-10",
    description:"Legacy description text",notes:"Legacy working notes",epicId:"st-missing-epic",
    transports:[{id:"st-otr1",number:"H03K000001",desc:"Legacy transport text",system:"H03",released:false,toc:"H03K000099",syncs:[{system:"H43",date:"2025-02-01"}],dest:["H03","H43"],notes:"Legacy transport note"}],
    objects:[{name:"ZST_LEGACY_REPORT",type:"Report",desc:"Legacy object note"}],
    subtasks:[{title:"Legacy subtask",children:[{title:"Legacy sub-subtask"}],comments:[{text:"Legacy subtask comment"}]}],
    comments:[{text:"Legacy demand comment"}],reference:[{label:"Legacy endpoint",value:"https://example.invalid/legacy"}],
    timeline:[{ts:Date.UTC(2025,0,30),type:"status",from:"open",to:"delivered"},{ts:Date.UTC(2025,0,31),type:"note",note:"Legacy history note"}]}],
  calls:[{id:"st-c1",date:"2025-01-12",title:"Legacy call title",attendees:"Legacy attendee",body:"Legacy call notes",taskIds:["st-o1"]}],
  teamMeetings:[{id:"st-tm1",date:"2025-01-13",title:"Legacy team meeting",team:"Legacy team",body:"Legacy team notes",actions:[{text:"Legacy action point",owner:"Legacy owner"}]}],
  journal:[{date:"2025-01-14",title:"Legacy journal title",body:"Legacy journal body"}],todos:[{text:"Legacy to-do"}],
  debug:[{title:"Legacy debug session",resume:"Legacy resume note",findings:[{text:"Legacy finding"}],breakpoints:[{object:"ZST_LEGACY_REPORT",line:"120",note:"Legacy breakpoint note"}]}],
  credentials:[{system:"H03",label:"Legacy sample login",username:"legacy-sample-user",password:"not-a-real-password"}],
  playbook:[{kind:"faq",title:"Legacy FAQ",body:"Legacy FAQ answer"}],
  efforts:[{date:"2025-01-15",hours:2.5,taskId:"st-o1",activity:"Build",note:"Legacy effort note"},{date:"2025-01-16",hours:1,bucket:"lrn",note:"Legacy learning"}],
  leaveDays:["2025-01-20"],wins:[{date:"2025-01-16",kind:"thanks",text:"Legacy win"}],images:[],epics:[]};}
function stSample(){const T=todayStr(),D=n=>efAdd(T,n),ts=n=>new Date(D(n)+"T10:00:00").getTime(),st=(id,to,n,x)=>({id,ts:ts(n),type:"status",from:"",to,...(x||{})});
  return {version:DATA_VERSION,settings:{landscapes:["H0","H4"],tiers:DEF_TIERS,defaultSystem:"H03",clients:{H0:["010"]},encryption:false},
  epics:[{id:"st-e1",code:"ST-EPIC",name:"Sample epic",status:"active",targetDate:D(10),waves:[{name:"Wave 1",target:D(14)}],deps:[{team:"Sample team",what:"Interface ready",since:D(-40),expected:D(-5)}],log:[{date:D(-20),kind:"note",text:"Sample epic note"}]}],
  tasks:[
   {id:"st-a",demandId:"ST-1",title:"Sample report gets a filter",status:"progress",type:"Report change",epicId:"st-e1",wave:"Wave 1",system:"H03",receivedDate:D(-30),dueDate:D(-2),estimate:16,
    nextAction:{date:T,note:"Chase the sample QA"},waiting:{on:"QA team",since:D(-3)},
    timeline:[st("x1","progress",-29),st("x2","delivered",-15),st("x3","bug",-12),st("x4","progress",-11),{id:"x5",ts:ts(-8),type:"note",note:"Next action done: Write the sample spec"}],
    objects:[{id:"st-o-a",name:"ZST_SHARED_CLASS",type:"Class",action:"Modified"}],
    transports:[{id:"st-tr-a1",number:"H03K900001",desc:"ST : ST-1 : Sample filter : AB07",system:"H03",released:true,dest:["H43","H42","H41"],syncs:[{system:"H43",date:D(-10)}],objectIds:["st-o-a"],tocId:"st-toc-a"},
                {id:"st-tr-a2",number:"H03K900002",desc:"ST : ST-1 : Sample filter : AB08",system:"H03",released:false,syncs:[]}],
    tocs:[{id:"st-toc-a",number:"H03K900099",desc:"Sample ToC",syncs:[{system:"H42",date:D(-5)}]}],
    subtasks:[{title:"Sample subtask",children:[{title:"Sample sub-subtask",done:true}]}],
    reference:[{label:"Sample URL",value:"https://example.invalid/sample",pinned:true},{label:"Sample secret",value:"not-a-real-secret",secret:true}],
    lessons:[{date:D(-1),text:"Sample lesson"}],comments:[{text:"Sample comment"}]},
   {id:"st-b",demandId:"ST-2",title:"Sample interface, requirement changed",status:"delivered",type:"Interface",receivedDate:D(-60),
    timeline:[st("y1","progress",-58),st("y2","delivered",-40),st("y3","progress",-30,{cause:"change",from:"delivered",est:6}),st("y4","delivered",-20)],transports:[]},
   {id:"st-c",demandId:"ST-3",title:"First half of a split ticket",status:"open",type:"Enhancement",builders:["st-p-1","st-p-gone"],objects:[{name:"ZST_SHARED_CLASS",type:"Class",action:"Modified"}],transports:[],timeline:[]},
   {id:"st-d",demandId:"ST-3",title:"Second half of a split ticket",status:"closed",type:"Enhancement",transports:[],timeline:[st("z1","closed",-3)]}],
  meetings:[{id:"st-m1",date:D(-1),title:"Sample sync",team:"Sample team",taskIds:["st-a"],actions:[{text:"Sample action",owner:"Sample owner",due:D(2)}]}],
  journal:[{id:"st-j1",date:T,title:"Sample journal",body:"Sample journal body"}],todos:[{text:"Sample to-do",due:D(1)}],
  debug:[{id:"st-dbg1",title:"Sample quiet session",status:"active",taskId:"st-a",updatedAt:ts(-20),findings:[{kind:"works",text:"Sample finding"}]}],
  playbook:[{id:"st-p1",kind:"freeze",title:"Sample freeze",from:D(-1),to:D(5),systems:["H41"]},{kind:"recurring",title:"Sample recurring",due:D(3),recur:"annual"},{kind:"process",title:"Sample process",steps:[{text:"Sample step"}]}],
  credentials:[{system:"H03",label:"Sample login",username:"sample-user",password:"not-a-real-password"}],
  efforts:[{date:D(-1),hours:3,taskId:"st-a",activity:"Build",note:"Sample build"},{date:D(-2),hours:2,taskId:"st-a",activity:"Testing"},{date:D(-2),hours:1.5,epicId:"st-e1",activity:"Meetings & admin"},
    {date:D(-3),hours:1,bucket:"adm"},{date:D(-25),hours:4,taskId:"st-b",activity:"Build"},{date:D(-3),hours:2,taskId:"st-c",activity:"Analysis"},{date:D(-3),hours:1,taskId:"st-d",activity:"Analysis"},{date:D(-1),hours:2,jobId:"st-job-1",activity:"Analysis",note:"Sample analysis"}],
  daysOff:[{date:"2030-01-07",kind:"holiday",label:"Sample holiday"}],wins:[{date:D(-2),kind:"thanks",text:"Sample win"}],images:[],reviewNotes:{},
  people:[{id:"st-p-1",name:"Sample Builder",role:"Developer"},{id:"st-p-2",name:"Moved-on Builder",active:false}],
  jobs:[{id:"st-job-1",title:"Sample check with the Basis team",askedBy:"Sample manager",source:"call",received:D(-4),due:D(1),status:"progress",brief:"Sample brief",
      log:[{date:D(-3),kind:"call",text:"Sample call"},{date:D(-2),kind:"update",text:"Sample update in"}],nextAction:{date:T,note:"Sample next step"},waiting:{on:"Basis team",since:D(-3)},
      refs:[{label:"Sample contact",value:"Sample person"},{label:"Sample code",value:"not-a-real-secret",secret:true}],meetingId:"st-m1",taskIds:["st-a"]},
    {id:"st-job-2",title:"Sample mail nobody owned",askedBy:"Team mailbox",source:"email",received:D(-10),due:D(-5),status:"done",closedOn:D(-6),outcome:"Sample outcome"}]};}
/* every piece of text in a data object (ids and the one deliberately-cleared link excepted) */
function stTexts(o,k,out){out=out||[];
  if(typeof o==="string"){if(o.length>=3&&!["id","epicId","ts"].includes(k))out.push(o);}
  else if(Array.isArray(o))o.forEach(x=>stTexts(x,k,out));
  else if(o&&typeof o==="object")Object.keys(o).forEach(x=>stTexts(o[x],x,out));
  return out;}
function stPanel(){let p=document.getElementById("stPanel");if(!p){p=document.createElement("div");p.id="stPanel";document.body.appendChild(p);}return p;}
async function runSelfTest(){
  const R=[],sec=n=>R.push({sec:n}),ok=(name,pass,detail)=>{R.push({name,pass:!!pass,detail:pass?"":String(detail==null?"":detail)});};
  const errs=[],onErr=e=>errs.push(String((e&&(e.message||(e.reason&&(e.reason.message||e.reason))))||"error"));
  window.addEventListener("error",onErr);window.addEventListener("unhandledrejection",onErr);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)),clone=o=>JSON.parse(JSON.stringify(o)),panel=stPanel(),t0=Date.now();
  const prog=txt=>{panel.innerHTML=`<div class="st-head"><b>🧪 Self-test</b><span>${esc(txt)}</span></div><p class="st-note">Sandbox — your data file, backup and snapshots are not touched.</p>`;};
  const step=async(name,fn)=>{const n=errs.length;let thrown="";try{await fn();}catch(e){thrown=(e&&e.message)||String(e);}await sleep(30);
    ok(name,!thrown&&errs.length===n,thrown||errs.slice(n).join(" | "));};
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),got=(a,b)=>`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`;

  prog("upgrading old data…");
  sec("Data upgrade");
  {const old=stOldFixture(),m1=migrate(clone(old)),s1=JSON.stringify(m1),texts=stTexts(old),lost=texts.filter(x=>!s1.includes(JSON.stringify(x).slice(1,-1)));
   ok(`Old-format data upgrades to data version ${DATA_VERSION}`,m1.version===DATA_VERSION&&isValidState(m1),got(m1.version,DATA_VERSION));
   ok(`No text lost in the upgrade (${texts.length} values checked)`,!lost.length,"missing: "+lost.slice(0,6).join(" · "));
   ok("Upgrading a second time changes nothing",eq(migrate(clone(m1)),m1),"the second pass gave different data");
   ok("Old calls and team meetings move into Meetings",m1.meetings.length===2&&!m1.calls.length&&!m1.teamMeetings.length,got(m1.meetings.length,2));
   ok("An old free-text ToC becomes a ToC record",m1.tasks[0].tocs.length===1&&m1.tasks[0].transports[0].tocId===m1.tasks[0].tocs[0].id);
   ok("Old leave days become days off",m1.daysOff.length===1&&m1.daysOff[0].date==="2025-01-20");
   ok("A transport's own origin is dropped from its destinations",eq(m1.tasks[0].transports[0].dest,["H43"]),got(m1.tasks[0].transports[0].dest,["H43"]));
   ok("A transport already imported elsewhere is marked released",m1.tasks[0].transports[0].released===true);
   ok("Hours logged survive",efSum(m1.efforts)===3.5,got(efSum(m1.efforts),3.5));
   ok("A link to a deleted epic is cleared",m1.tasks[0].epicId==="");
   migrate({version:DATA_VERSION+3,tasks:[]});const nv=dataNewer;dataNewer=0;
   ok("A file from a newer copy switches saving off",nv===DATA_VERSION+3,got(nv,DATA_VERSION+3));
   migrate({version:DATA_VERSION,tasks:[]});ok("A file of this version saves normally",dataNewer===0);
   ok("The sandbox can't save",!safeToPersist());}

  prog("checking the numbers…");
  sec("Numbers");
  state=migrate(stSample());dataNewer=0;resetActive();
  {const T=todayStr(),D=n=>efAdd(T,n),tk=id=>state.tasks.find(t=>t.id===id),a=tk("st-a"),b=tk("st-b"),c=tk("st-c"),tr=a.transports[0];
   ok("Rework: one return to Bug counts once",reworkCount(a)===1,got(reworkCount(a),1));
   ok("Rounds: a changed requirement starts round 2",roundCount(b)===2,got(roundCount(b),2));
   ok("Rounds: each round's first delivery counts",roundDeliveries(b).length===2,got(roundDeliveries(b).length,2));
   ok("Hours on a demand add up",efSum(efFor("st-a"))===5,got(efSum(efFor("st-a")),5));
   {const v=rvStats(D(-30),T).hours;ok("Review: hours in a period add up",v===16.5,got(v,16.5));}
   ok("Transports: the origin is never missing",!trMissing(a,{...tr,dest:["H03","H43"]}).length);
   ok("Transports: a ToC move counts as reached",eq(trMissing(a,tr),["H41"]),got(trMissing(a,tr),["H41"]));
   ok("Go-live check flags the unfinished demand",!!golivePending(a));
   {const x={system:"H03",released:false};ok("Syncing to another system marks a transport released",syncReleases(x,"H43")&&x.released&&!syncReleases({system:"H03",released:false},"H03"));}
   ok("Object clash found between two open demands",openClashCount(a)===1,got(openClashCount(a),1));
   ok("Shared ticket IDs are told apart",demandLabel(a)==="ST-1"&&demandLabel(c).startsWith("ST-3 · "),demandLabel(c));
   {const v=trDescSuggest(a);ok("Next transport description follows the pattern",v==="ST : ST-1 : Sample filter : AB09",got(v,"ST : ST-1 : Sample filter : AB09"));}
   ok("Next working day skips the weekend and holidays",nextWorkDay("2030-01-04")==="2030-01-08",got(nextWorkDay("2030-01-04"),"2030-01-08"));
   ok("Done steps read back from History",eq(nextActionTrail(a).map(x=>x.note),["Write the sample spec"]));
   {const m=state.meetings[0],mine=()=>state.efforts.filter(e=>e.meetingId===m.id);
    m.hours=1.5;meetingEffortSync(m);const c1=mine().length===1&&mine()[0].taskId==="st-a"&&mine()[0].hours===1.5;
    m.logTo="b:mtg";meetingEffortSync(m);const c2=mine().length===1&&mine()[0].bucket==="mtg";
    m.hours=0;meetingEffortSync(m);const c3=mine().length===0;
    ok("A meeting's duration logs, moves and clears its Effort entry",c1&&c2&&c3,`create ${c1} · move ${c2} · clear ${c3}`);}
   {const d0=state.settings.dayHours;state.settings.dayHours=8.5;renderApp();const v=EF_DAY;state.settings.dayHours=d0;renderApp();ok("The working-day setting is used",v===8.5,got(v,8.5));}
   ok("Team: a demand keeps its builders, a deleted person is dropped",eq(c.builders,["st-p-1"]),got(c.builders,["st-p-1"]));
   ok("Team: each person's demands are found",demandsOf("st-p-1").length===1&&builderNames(c)==="Sample Builder");
   ok("Team: the list filters by builder",state.tasks.filter(dvMatches({...dvBlank(),f:{builder:"st-p-1"}})).length===1&&state.tasks.filter(dvMatches({...dvBlank(),only:["delegated"]})).length===1);
   {setBuilders(a,["st-p-1"]);const n1=a.timeline[a.timeline.length-1].note;setBuilders(a,[]);const n2=a.timeline[a.timeline.length-1].note;
    ok("Team: handing a demand on (and back) is noted in History",n1==="Built by Sample Builder"&&/^Back with you/.test(n2),n1+" / "+n2);}
   {const j1=jobById("st-job-1"),j2=jobById("st-job-2"),e=state.efforts.find(x=>x.jobId==="st-job-1");
    ok("Tasks: hours log against a task",!!e&&efKey(e)==="j:st-job-1"&&efName("j:st-job-1")==="☐ Sample check with the Basis team"&&jobHours(j1)===2&&efKeyValid("j:st-job-1"));
    ok("Tasks: answered before the date expected",jobTiming(j2)&&jobTiming(j2).n===1&&jobTiming(j2).ok,JSON.stringify(jobTiming(j2)));
    ok("Tasks: what needs you shows on Today",jobsNeedingYou().some(x=>x.j===j1)&&!jobsNeedingYou().some(x=>x.j===j2));
    ok("Tasks: a meeting can log its time against a task asked in it",meetingLogOpts(state.meetings[0]).some(o=>o.k==="j:st-job-1"));
    ok("Tasks: the review counts tasks handled",rvStats(D(-30),T).jobs.length===1);
    ok("Tasks: search finds a task by its log",searchAll("sample update in").some(h=>h.k==="Task"));
    openNextAction(j1,{note:"Sample next step"});const r0=document.getElementById("modalRoot");r0.querySelector("#na-note").value="Sample following step";r0.querySelector("#na-save").click();
    ok("Tasks: ✓ Done on a next action logs the step and sets the next",j1.log.some(x=>x.kind==="step"&&x.text==="Sample next step")&&j1.nextAction.note==="Sample following step",JSON.stringify(j1.nextAction));
    const m2=migrate(clone({version:29,tasks:[],jobs:[clone(j1)],efforts:[clone(e)]}));ok("Tasks: survive an upgrade with their hours",m2.jobs.length===1&&m2.jobs[0].log.length===j1.log.length&&m2.efforts[0].jobId==="st-job-1");}
   {const m=state.tasks.filter(dvMatches({...dvBlank(),only:["due7"]}));ok("Today: the Overdue tile opens only late or due-soon demands",m.length>0&&m.every(x=>{const d=earliestOpenDue(x);return d&&daysUntil(d)<=7;})&&CK_TILES[1].view.only.includes("due7"));}
   ok("History dates read like the rest of the app",/^\d\d [A-Z][a-z]{2}( \d{4})? · \d\d:\d\d$/.test(fmtTs(Date.now())),fmtTs(Date.now()));
   {const many=["H03","H02","H01","H43"].map(x=>({system:x,date:T})),g=reachGridHTML(many,"via ToC X");
    ok("Transports: a ToC moved to many systems shows as a compact grid",!!g&&g.includes("4 systems")&&g.includes("rg-no")&&reachGridHTML(many.slice(0,3),"x")===null);}
   ok("Instrument v2: matrix readout lays out a number",V2.matrixLayout("12:34").cols===25&&V2.mxW("88",21)===33,V2.matrixLayout("12:34").cols);
   {const d0=dirty;dirty=true;renderSaveState();const nm=!!document.querySelector("#saveState .vic.nm");dirty=d0;renderSaveState();ok("Instrument v2: the save light shows its state",nm);}
   ok("Instrument v2: no milestone stamps",!document.querySelector(".vstamp")&&typeof demandStamp==="undefined");
   /* behaviour, not only "it opens" */
   {const env=JSON.parse(await encryptStateStr("st-pass")),dec=await decryptEnvelope(env,"st-pass"),same=JSON.stringify(dec)===JSON.stringify(state);
    const loads=isValidState(migrate(JSON.parse(JSON.stringify(dec))));dataNewer=0;let wrong=false;try{await decryptEnvelope(env,"not-it");}catch(e){wrong=true;}
    ok("Encryption: the file round-trips with the master password, and only with it",same&&loads&&wrong&&!JSON.stringify(env).includes("Sample report gets a filter"),`same ${same} · loads ${loads} · wrong password refused ${wrong}`);}
   {const fh0=fileHandle,fs0=fileSig;let lm=1000;fileHandle={name:"st.json",getFile:async()=>({lastModified:lm,size:10})};await noteFileSig();const same=await diskChanged();lm=2000;const moved=await diskChanged();
    fileHandle=fh0;fileSig=fs0;ok("Disk guard: a data file changed by something else is noticed",!same&&!!moved);}
   ok("Backup: the newer of the two browser copies is used",pickBackup({raw:"A",at:1},{raw:"B",at:2})==="B"&&pickBackup({raw:"A",at:5},{raw:null,at:0})==="A"&&pickBackup({raw:"A",at:0},{raw:"B",at:0})==="A"&&pickBackup({raw:null,at:0},{raw:"B",at:0})==="B");
   {const e=state.efforts[0],n=state.efforts.length;efDelete(e);const gone=state.efforts.length===n-1;const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();
    ok("Undo: a deleted time entry comes back",gone&&!!ub&&state.efforts.length===n&&state.efforts.includes(e));}
   {const t=state.tasks.find(x=>x.id==="st-c"),R=document.getElementById("modalRoot");
    openNextAction(t);R.querySelector("#na-note").value="Self-test step";R.querySelector("#na-date").value="2030-01-08";R.querySelector("#na-save").click();
    const na=t.nextAction.note==="Self-test step"&&t.nextAction.date==="2030-01-08";
    const n0=state.efforts.length;openLogTime({key:"st-c",date:todayStr()});const hi=R.querySelector('[data-f="hours"]');hi.value="1.5";hi.dispatchEvent(new Event("input"));R.querySelector('[data-f="log"]').click();
    const lg=state.efforts.length===n0+1&&state.efforts[state.efforts.length-1].hours===1.5;
    const t0=state.tasks.length;openTaskModal(null);R.querySelector("#m-title").value="Self-test demand";R.querySelector("#m-save").click();
    const nd=state.tasks.length===t0+1&&state.tasks.some(x=>x.title==="Self-test demand");
    R.innerHTML="";ok("Dialogs: next action, log time and new demand do what they say",na&&lg&&nd,`next ${na} · log ${lg} · new ${nd}`);}
   {const b=state.tasks.find(x=>x.id==="st-b"),R=document.getElementById("modalRoot");openTaskModal(b);R.querySelector("#m-status").value="progress";R.querySelector("#m-save").click();
    const asked=!!R.querySelector("#cbOk")&&b.status==="delivered";const c=R.querySelector("#cbCancel");if(c)c.click();R.innerHTML="";
    ok("Edit: moving a delivered demand back asks why",asked);}
   {const t=state.tasks.find(x=>x.id==="st-a"),m=state.meetings.find(x=>x.id==="st-m1"),T0=todayStr();
    m.actions.push({id:"st-act-me",text:"Sample action of mine",owner:"",done:false,due:T0,resolution:""},{id:"st-act-them",text:"Sample action of theirs",owner:"Sample owner",done:false,due:T0,resolution:""});
    const ag=agendaItems(),has=(k,f)=>ag.some(i=>i.k===k&&f(i));
    ok("Agenda: next steps, your action points, follow-ups and what's due — late first",
      has("step",i=>i.what.includes("Chase the sample QA"))&&has("act",i=>i.what.includes("of mine"))&&!has("act",i=>i.what.includes("of theirs"))&&has("chase",i=>i.what.includes("QA team"))&&has("due",i=>i.date<T0)&&ag.every((x,i)=>!i||ag[i-1].date<=x.date),
      ag.map(i=>i.k+":"+i.date).join(", "));
    ag.find(i=>i.k==="chase"&&i.what.includes("QA team")).acts[0][1]();
    ok("Agenda: a follow-up, once chased, waits three days (noted in History)",!chaseDue(t)&&lastChase(t)===T0&&!agendaItems().some(i=>i.k==="chase"&&i.what.includes("QA team")));
    {const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();}
    ok("Agenda: Undo takes the chase back",chaseDue(t)&&lastChase(t)==="");
    const a=m.actions.find(x=>x.id==="st-act-me"),j0=state.jobs.length;actionToJob(a,m);const j=state.jobs[0];
    ok("A meeting action point becomes a Task, linked to the meeting",state.jobs.length===j0+1&&j.title==="Sample action of mine"&&j.meetingId==="st-m1"&&j.source==="meeting"&&a.done&&!agendaItems().some(i=>i.what.includes("of mine")));
    view="today";renderApp();}
   {const t=state.tasks.find(x=>x.id==="st-a"),R=document.getElementById("modalRoot"),n0=state.efforts.length;
    t.nextAction={date:todayStr(),note:"Sample step to time"};nextActionDone(t);R.querySelector("#na-hrs").value="1.5";R.querySelector("#na-just").click();
    const e=state.efforts[state.efforts.length-1],timed=state.efforts.length===n0+1&&e.taskId==="st-a"&&e.hours===1.5&&e.note==="Sample step to time"&&e.date===todayStr()&&!t.nextAction.date;
    t.nextAction={date:todayStr(),note:"Sample untimed step"};nextActionDone(t);R.querySelector("#na-hrs").value="lots";R.querySelector("#na-just").click();
    const held=!!R.querySelector("#na-hrs")&&t.nextAction.date===todayStr();R.querySelector("#na-hrs").value="";R.querySelector("#na-just").click();
    ok("✓ Done logs the time it took, with the step as the note — and only a real number of hours",timed&&held&&state.efforts.length===n0+1&&!t.nextAction.date,`timed ${timed} · held ${held} · entries ${state.efforts.length-n0}`);R.innerHTML="";}
   {const R=document.getElementById("modalRoot"),T0=todayStr(),day=()=>efSum(state.efforts.filter(e=>e.date===T0)),have=day();
    const mt=normMeeting({id:"st-m-today",date:T0,title:"Sample meeting today",taskIds:[]});state.meetings.push(mt);
    openCloseDay();const rows=[...R.querySelectorAll(".cd-row")],ra=rows.find(r=>r.textContent.includes("ST-1")),rm=rows.find(r=>r.textContent.includes("Sample meeting today")),re=R.querySelector(".cd-else");
    const seen=!!ra&&!!rm&&!!re;let lbl="";
    if(seen){ra.querySelector(".cd-h").value="2";rm.querySelector(".cd-h").value="0.5";re.querySelector(".cd-h").value="1";R.querySelectorAll(".cd-h").forEach(b=>b.dispatchEvent(new Event("input")));
      lbl=R.querySelector("#cdLog").textContent;R.querySelector("#cdLog").click();}
    const now=day();
    ok("Close the day: an hours box per thing touched, meetings included, logged in one go",seen&&lbl==="Log 3.5 h"&&now===have+3.5&&mt.hours===0.5&&state.efforts.some(e=>e.meetingId==="st-m-today"),`rows ${seen} · ${lbl} · ${have} → ${now}`);
    {const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();}
    ok("Close the day: Undo takes it all back",day()===have&&!state.efforts.some(e=>e.meetingId==="st-m-today")&&!mt.hours,`${day()} vs ${have}`);
    state.meetings.splice(state.meetings.indexOf(mt),1);R.innerHTML="";}
   {const est=state.tasks.map(t=>t.estimate),txt=()=>document.getElementById("detail").textContent;state.tasks.forEach(t=>t.estimate=0);view="effort";renderApp();const none=!txt().includes("Estimate vs actual")&&!anyEstimate();
    state.tasks.forEach((t,i)=>t.estimate=est[i]);renderApp();const back=txt().includes("Estimate vs actual");view="today";renderApp();
    ok("Estimate panels stay hidden until an estimate exists",none&&back,`hidden ${none} · back ${back}`);}
   {const a=state.tasks.find(x=>x.id==="st-a"),a1=a.transports.find(x=>x.id==="st-tr-a1"),a2=a.transports.find(x=>x.id==="st-tr-a2"),rows=trBoardRows();
    const r1=rows.find(r=>r.tr===a1),r2=rows.find(r=>r.tr===a2);
    ok("Transport board: where each transport is and where it goes next",r1&&r1.at==="H42"&&r1.next==="H41"&&r2&&r2.at==="H03"&&r2.next==="H02"&&!r2.tr.released,JSON.stringify(r1&&[r1.at,r1.next])+" "+JSON.stringify(r2&&[r2.at,r2.next]));
    view="transports";renderApp();const row=[...document.querySelectorAll(".tb-row")].find(x=>x.dataset.key==="st-a|st-tr-a2");if(row)row.querySelector(".tb-ck").click();
    const sy=document.getElementById("tbSys");if(sy){sy.value="H02";sy.dispatchEvent(new Event("change"));const rb=document.getElementById("tbRec");if(rb)rb.click();}
    const rec=a2.syncs.some(x=>x.system==="H02"&&x.date===todayStr())&&a2.released&&a2.releasedOn===todayStr();
    {const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();}
    ok("Transport board: an import recorded for the selected transports, with Undo",rec&&!a2.syncs.some(x=>x.system==="H02")&&!a2.released,`recorded ${rec} · after undo ${JSON.stringify(a2.syncs)} ${a2.released}`);
    const toc=a.tocs[0],R=document.getElementById("modalRoot");openTocRoute(a,toc);const picked=[...R.querySelectorAll(".tr-rs input:checked:not(:disabled)")].map(i=>i.value);R.querySelector("#trRGo").click();
    const moved=["H43","H41"].every(x=>toc.syncs.some(y=>y.system===x&&y.date===todayStr()));
    {const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();}
    ok("A ToC moves along a whole route in one go (what's there already left out), with Undo",eq(picked,["H43","H41"])&&moved&&toc.syncs.length===1,`picked ${picked} · moved ${moved} · left ${toc.syncs.length}`);R.innerHTML="";
    a2.addedOn=efAdd(todayStr(),-9);let it=agendaItems().find(i=>i.k==="release"&&i.what.includes("H03K900002"));const shown=!!it;if(it)it.acts[0][1]();
    ok("Today: a transport unreleased too long comes up, and Released clears it",shown&&a2.released&&a2.releasedOn===todayStr()&&!agendaItems().some(i=>i.k==="release"&&i.what.includes("H03K900002")));
    a2.released=false;a2.releasedOn="";a2.addedOn=todayStr();
    const c=state.tasks.find(x=>x.id==="st-c");c.nextAction={date:"",note:""};c.updatedAt=Date.now()-10*864e5;it=agendaItems().find(i=>i.k==="check"&&i.what.includes("Sample Builder"));const quiet=!!it;if(it)it.acts[0][1]();
    ok("Today: a demand handed to your team that went quiet comes up; Checked in notes it",quiet&&(c.timeline||[]).some(e=>/^Checked in with Sample Builder/.test(e.note||""))&&!agendaItems().some(i=>i.k==="check"&&i.what.includes("Sample Builder")));
    ok("Tickets: demands sharing a ticket ID see each other, and group together",eq(ticketSiblings(c).map(x=>x.id),["st-d"])&&ticketBandHTML(c).includes("Ticket ST-3 · 2 demands")&&dvGroupOf(c,"ticket").k==="ST-3"&&dvGroupOf(a,"ticket").k==="__single");
    const m=migrate(clone(stOldFixture())),tr0=m.tasks[0].transports[0];
    ok("Upgrade: transports get the day they were added, the unreleased reminder a default",/^\d{4}-\d\d-\d\d$/.test(tr0.addedOn)&&tr0.releasedOn===""&&m.settings.unreleasedDays===5,JSON.stringify([tr0.addedOn,tr0.releasedOn,m.settings.unreleasedDays]));
    view="today";renderApp();}
   ok("One look: only Bench (Paper / Backlit) is offered",Object.keys(THEME_OPTS).every(k=>k.startsWith("bench"))&&benchOn());
   {const m=migrate(clone(stOldFixture())),j=m.jobs.find(x=>x.title==="Legacy to-do");
    ok("Upgrade: the Journal's to-dos become Tasks",!!j&&j.source==="self"&&j.status==="open"&&m.todos.length===0&&state.jobs.some(x=>x.title==="Sample to-do"&&x.due===efAdd(todayStr(),1)),JSON.stringify(j));}
   {const n=state.debug.length,keep=state.debug[0];deleteWithUndo("Self-test delete",()=>{state.debug=[];});const gone=state.debug.length===0;
    const ub=[...document.querySelectorAll("#toast button")].find(x=>x.textContent==="Undo");if(ub)ub.click();
    ok("Delete with Undo: it goes, and Undo brings it back",gone&&state.debug.length===n&&state.debug[0].id===keep.id);}
   {const p1=askText("Self-test question",{value:"a"});await sleep(40);const inp=document.querySelector(".ask-bg input");if(inp)inp.value="Self-test answer";const okb=document.querySelector('.ask-bg [data-a="ok"]');if(okb)okb.click();const v1=await p1;
    const p2=askOk("Self-test?");await sleep(40);document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));const v2=await p2;
    ok("In-app dialogs: OK answers, Esc cancels",v1==="Self-test answer"&&v2===false&&!document.querySelector(".ask-bg"),JSON.stringify([v1,v2]));}
   {view="today";renderApp();document.activeElement&&document.activeElement.blur&&document.activeElement.blur();
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"g",bubbles:true}));document.dispatchEvent(new KeyboardEvent("keydown",{key:"r",bubbles:true}));const went=view==="transports";
    view="demands";activeId="st-a";renderApp();document.dispatchEvent(new KeyboardEvent("keydown",{key:"n",bubbles:true}));const R=document.getElementById("modalRoot"),na=!!R.querySelector("#na-note");R.innerHTML="";
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"?",bubbles:true}));const ks=!!R.querySelector(".keys");R.innerHTML="";view="today";renderApp();
    ok("Keys: G then a letter moves between workspaces, N opens the next action, ? lists them",went&&na&&ks,`go ${went} · N ${na} · ? ${ks}`);}
   {view="demands";activeId="st-a";activeTab="overview";renderApp();await sleep(60);const d=document.getElementById("detail"),left=(d.textContent.match(/🗑|⏱|⏰|🏆/g)||[]).length;
    ok("Line icons: the page's emoji are drawn as line icons",!!d.querySelector(".ic")&&!left,`emoji left: ${left}`);
    view="jobs";activeJobId="st-job-1";renderApp();const j=jobById("st-job-1"),s0=j.status;{const sb=document.querySelector('#jb-seg button[data-s="open"]');if(sb)sb.click();}const segOk=j.status==="open";j.status=s0;renderApp();
    const jh=!!document.querySelector(".bhead #jb-title")&&!!document.querySelector(".bh-fields.hide #jb-status");
    view="meetings";meetingRollup=false;activeMeetingId="st-m1";renderApp();const mh=!!document.querySelector(".bhead #mt-title")&&!!document.querySelector(".bh-fields.hide #mt-date");
    ok("Tasks and Meetings have the Demand header: status segment, readouts, details folded",segOk&&jh&&mh,`seg ${segOk} · task ${jh} · meeting ${mh}`);
    const R=document.getElementById("modalRoot");openTaskModal(state.tasks.find(x=>x.id==="st-a"));const gs=R.querySelectorAll(".mg").length,more=!!R.querySelector("details.mg-more #m-proj"),all=["m-demand","m-title","m-desc","m-sys","m-epic","m-status","m-due","m-req","m-wait","m-theme"].every(i=>R.querySelector("#"+i));R.innerHTML="";
    ok("The Edit dialog in groups — What, Where, When, Who, and More",gs===5&&more&&all,`groups ${gs} · more ${more} · fields ${all}`);
    ok("A day in Next 10 weeks lists what's on it; the Waiting tile names the longest waits",calDayItems(efAdd(todayStr(),10)).some(x=>x.k==="Epic target")&&waitListHTML(cockpitCounts().waiting).includes("QA team"));
    view="today";renderApp();}
   {const a=state.tasks.find(x=>x.id==="st-a"),sb=seenForDemand(a);
    ok("Seen before: demands sharing an object are found, with the object named",sb.some(h=>h.d.id==="st-c"&&h.why.includes("ZST_SHARED_CLASS"))&&!sb.some(h=>h.d.id==="st-dbg1"),JSON.stringify(sb.map(h=>[h.d.id,h.why])));
    const j2={id:"st-j2",date:efAdd(todayStr(),-40),title:"",body:"Sample quokka wombat rollout",taskIds:[],epicIds:[],createdAt:Date.now(),updatedAt:Date.now()},m2=normMeeting({id:"st-m9",date:efAdd(todayStr(),-50),title:"Sample review",body:"quokka and wombat discussed"});
    state.journal.push(j2);state.meetings.push(m2);markDirty();const jh=seenBefore(j2.body,[],d=>d.id===j2.id);
    ok("Seen before: rarer words a journal entry shares with past meetings",jh.some(h=>h.d.id==="st-m9"&&h.why.includes("quokka")),JSON.stringify(jh.map(h=>[h.d.id,h.why])));
    state.journal=state.journal.filter(x=>x!==j2);state.meetings=state.meetings.filter(x=>x!==m2);
    const tsv=parseTSV('Col A\tCol B\n"x\ty"\t"q""z"\nlast\t\n');
    ok("Excel rows: tabs, quoted cells and blank cells read as Excel writes them",eq(tsv,[["Col A","Col B"],["x\ty",'q"z'],["last",""]]),JSON.stringify(tsv));
    const sh=normSheet({name:"ST sheet",headers:["Code"],rows:[["walrusuniquecell"]]});state.sheets=[sh];markDirty();
    ok("Excel rows: Search finds a pasted row",searchAll("walrusuniquecell").some(h=>h.k==="Sheet"));state.sheets=[];markDirty();
    const F=rcFiles(),y=(a.receivedDate||"").slice(0,4),key=`${y}/Demands/ST-1 Sample report gets a filter.md`,all=JSON.stringify(F);
    ok("A readable copy: Markdown by year, secrets left out",!!F[key]&&F[key].includes("# ST-1 — Sample report gets a filter")&&!!F["README.md"]&&!all.includes("not-a-real-secret")&&!all.includes("not-a-real-password"),Object.keys(F).slice(0,6).join(" · "));
    ok("The readable copy is asked for once a year, around New Year only",!readableCopyDue("2026-07-01")&&!readableCopyDue("2026-12-01"));}
   {const T0=todayStr(),R=replayData(efAdd(T0,-30),T0),n0=document.querySelectorAll(".rp-bg").length;openReplay(efAdd(T0,-30),T0,"Self-test");await sleep(80);const up=document.querySelectorAll(".rp-bg").length===n0+1;
    document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
    ok("Replay: a period plays back from the hours and events in it, and Esc closes it",R.days.length===31&&R.hrs.size>0&&R.ev.some(e=>e.k==="tr")&&up&&!document.querySelector(".rp-bg"),`days ${R.days.length} · hour-days ${R.hrs.size} · events ${R.ev.length} · opened ${up}`);
    ok("Motion: Calm and Off leave the Full-level effects out",["auto","full","off"].includes(motionPref())?!motionShow():true);}
   ok("Encryption warning shows while secrets are unencrypted",!!encWarnHTML()||viewPref("encWarn.until","")>T);}

  sec("Screens");
  const views=["today","demands","jobs","epics","debug","journal","meetings","playbook","team","vault","effort","review","month","search","transports"];
  const tabs=["overview","work","objects","transports","effort","history","reference","calls","images"],etabs=["overview","story","details","deps","subtasks","effort"];
  const a=state.tasks.find(t=>t.id==="st-a");
  const pick=()=>{activeJobId="st-job-1";activeId="st-a";activeEpicId="st-e1";activeDebugId="st-dbg1";activeMeetingId="st-m1";activeJournalId="st-j1";activePlayId="st-p1";meetingRollup=false;journalTodos=false;};
  const closeAll=()=>{document.getElementById("modalRoot").innerHTML="";const d=document.getElementById("efDrw");if(d)d.classList.remove("on");};
  const modals=[["Log time",()=>openLogTime()],["Note a win",()=>openWin()],["Next action",()=>openNextAction(a)],["Next action ✓ Done",()=>nextActionDone(a)],["Close the day",()=>openCloseDay()],["Keyboard",()=>openKeys()],["A readable copy",()=>openReadableCopy()],["Paste rows from Excel",()=>openPasteSheet()],["Move a ToC along a route",()=>openTocRoute(a,a.tocs[0])],["Days off",()=>openDaysOff()],
    ["Tech Spec",()=>openTechSpec(a)],["Weekly summary",()=>openWeekly()],["Handover pack",()=>openHandover()],["Aging",()=>openAging()],["Portfolio",()=>openPortfolio()],
    ["Run sheet",()=>openRunSheet([a],"Self-test",goliveTargetFor(a))],["Lesson",()=>openLesson(a)],["Built by",()=>openBuilders(a)],["Settings menu",()=>openMenu()],["Close a task",()=>openJobClose(jobById("st-job-1"),"done")],["Log time on a task",()=>openLogTime({key:"j:st-job-1"})],["A closed task",()=>{view="jobs";activeJobId="st-job-2";renderApp();}],["Edit demand",()=>openTaskModal(a)],["Day ledger",()=>openEfDay(efAdd(todayStr(),-2))],["Week wrap-up",()=>{wrapForce=true;view="today";renderApp();}]];
  const themes=Object.keys(THEME_OPTS),total=themes.length*(views.length+tabs.length+etabs.length+modals.length);let n=0;
  for(const th of themes){applyTheme(th);lastTind=null;const L=THEME_OPTS[th],fails0=R.filter(r=>r.pass===false).length;
    for(const v of views){prog(`screens — ${L} · ${++n}/${total}`);await step(`${L} · ${v}`,()=>{pick();if(v==="team"){view="playbook";renderApp();playTeam=true;activePlayId=null;}else view=v;renderApp();});}
    for(const tb of tabs){prog(`screens — ${L} · ${++n}/${total}`);await step(`${L} · demand tab ${tb}`,()=>{pick();view="demands";activeTab=tb;renderApp();});}
    for(const tb of etabs){prog(`screens — ${L} · ${++n}/${total}`);await step(`${L} · epic tab ${tb}`,()=>{pick();view="epics";epicTab=tb;renderApp();});}
    for(const [nm,fn] of modals){prog(`screens — ${L} · ${++n}/${total}`);await step(`${L} · ${nm}`,()=>{pick();view="demands";activeTab="overview";renderApp();fn();});closeAll();}
    wrapForce=false;}
  applyTheme(currentTheme());lastTind=null;view="today";resetActive();renderApp();
  window.removeEventListener("error",onErr);window.removeEventListener("unhandledrejection",onErr);
  dirty=false;renderSaveState();stReport(R,Date.now()-t0);}
function stReport(R,ms){const panel=stPanel(),tests=R.filter(r=>r.name),bad=tests.filter(r=>!r.pass);
  const groups=[];R.forEach(r=>{if(r.sec)groups.push({sec:r.sec,rows:[]});else groups[groups.length-1].rows.push(r);});
  const scr=groups.find(g=>g.sec==="Screens");
  const txt=[`Demand Desk self-test — ${new Date().toLocaleString()} — data version ${DATA_VERSION}`,bad.length?`${bad.length} of ${tests.length} checks FAILED`:`All ${tests.length} checks passed`,"",
    ...groups.flatMap(g=>[`## ${g.sec}`,...g.rows.filter(r=>g.sec!=="Screens"||!r.pass).map(r=>`${r.pass?"✓":"✗"} ${r.name}${r.detail?" — "+r.detail:""}`),g.sec==="Screens"?`(${g.rows.filter(r=>r.pass).length} of ${g.rows.length} screens opened cleanly)`:"",""])].join("\n");
  panel.className=bad.length?"bad":"good";
  panel.innerHTML=`<div class="st-head"><b>🧪 Self-test</b><span>${(ms/1000).toFixed(1)} s</span><button class="sm ghost" id="stHide" title="Look around the sandbox">Hide</button></div>
    <div class="st-sum">${bad.length?`✗ ${bad.length} of ${tests.length} checks failed`:`✓ All ${tests.length} checks passed`}</div>
    <p class="st-note">Sandbox — your data file, backup and snapshots were not touched. Nothing here is saved.</p>
    <div class="st-acts"><button class="sm" id="stCopy">⧉ Copy report</button><button class="sm" id="stAgain">↻ Run again</button><button class="sm primary" id="stBack">Back to my data</button></div>
    ${groups.map(g=>{const show=g.sec==="Screens"?g.rows.filter(r=>!r.pass):g.rows;
      return `<div class="st-sec"><h4>${esc(g.sec)}${g.sec==="Screens"?` <span>${g.rows.filter(r=>r.pass).length} of ${g.rows.length} opened cleanly — every page, tab and dialog in ${Object.keys(THEME_OPTS).length} themes</span>`:""}</h4>
        ${show.map(r=>`<div class="st-row ${r.pass?"ok":"no"}"><i>${r.pass?"✓":"✗"}</i><span>${esc(r.name)}${r.detail?`<small>${esc(r.detail)}</small>`:""}</span></div>`).join("")}</div>`;}).join("")}`;
  const q=s=>panel.querySelector(s);
  q("#stCopy").onclick=()=>navigator.clipboard.writeText(txt).then(()=>toast("Report copied")).catch(()=>toast("Copy failed",true));
  q("#stAgain").onclick=()=>location.reload();
  q("#stBack").onclick=()=>{location.href=location.pathname;};
  q("#stHide").onclick=()=>{panel.classList.add("min");panel.onclick=()=>panel.classList.remove("min");};
  q("#stHide").addEventListener("click",e=>e.stopPropagation());}

