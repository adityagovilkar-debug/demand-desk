/* ===================== WIRE UP ===================== */
document.querySelectorAll(".navbtn,.rb[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;meetingRollup=false;journalTodos=false;renderApp();});
document.getElementById("railMenu").onclick=()=>openMenu();
/* keep the epic pointer valid across restores/imports */
function resetActive(){activeId=activeMeetingId=activeJournalId=activeDebugId=activePlayId=activeEpicId=activeJobId=null;meetingRollup=journalTodos=false;}
document.getElementById("btnOpen").onclick=openFile;
document.getElementById("btnSave").onclick=saveFile;
document.getElementById("btnMenu").onclick=openMenu;
document.getElementById("btnReconnect").onclick=()=>reconnectFile();
document.getElementById("btnTheme").onclick=toggleTheme;
applyTheme(currentTheme());
const gs=document.getElementById("globalSearch");
gs.oninput=e=>{clearTimeout(gs._t);gs._t=setTimeout(()=>runGlobalSearch(e.target.value),150);};
gs.onblur=()=>setTimeout(()=>document.getElementById("gsearchResults").classList.add("hide"),200);
gs.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();openSearch(gs.value);}});
gs.onfocus=()=>{if(gs.value)runGlobalSearch(gs.value);};
document.addEventListener("keydown",e=>{
  if(screenLocked||pendingEncrypted)return;
  /* Esc closes whatever is open on top: lightbox, dialog, then the search results */
  if(e.key==="Escape"){const root=document.getElementById("modalRoot");
    const lb=root.querySelector("#lb");if(lb){lb.click();return;}
    const bg=root.querySelector(".modal-bg");if(bg&&bg.onclick){flushEdits();bg.click();return;}
    if(document.activeElement===gs){gs.value="";document.getElementById("gsearchResults").classList.add("hide");gs.blur();}
    return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveFile();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();gs.focus();}
  if(e.altKey&&!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==="n"){e.preventDefault();view="demands";renderApp();openTaskModal(null);}
});
window.addEventListener("beforeunload",e=>{flushEdits();if(dirty){e.preventDefault();e.returnValue="";}});

/* ---------- never lose half-typed text ----------
   Fields commit on "change", which only fires when you leave the field. Text typed but
   not yet committed is tracked here: long-form text areas commit after a short pause in
   typing (so the backup and auto-save see it), and Save / closing the window commit
   every field first. Only fields with a change handler are touched. */
const pendingEdit=new Set();
document.addEventListener("input",e=>{const el=e.target;
  if(!el||typeof el.onchange!=="function")return;
  if(!(el.tagName==="TEXTAREA"||(el.tagName==="INPUT"&&!/^(date|checkbox|radio|number|file)$/.test(el.type))))return;
  pendingEdit.add(el);
  if(el.tagName==="TEXTAREA"){clearTimeout(el._commitT);el._commitT=setTimeout(()=>commitEdit(el),1200);}
},true);
document.addEventListener("change",e=>{pendingEdit.delete(e.target);},true);
function commitEdit(el){if(!pendingEdit.delete(el)||!el.isConnected)return;el.dispatchEvent(new Event("change"));}
function flushEdits(){[...pendingEdit].forEach(commitEdit);}

/* ---------- one copy at a time ----------
   Two open copies share one backup and one data file, and whichever writes last
   silently wins. Each copy announces itself; any overlap raises a banner in both. */
const INSTANCE=uid(),peers=new Map(); /* id → last heard from; a copy that stops pinging is gone */
function drawPeerWarn(){const el=document.getElementById("peerWarn");if(!el)return;
  if(!peers.size||drawPeerWarn._off){el.classList.add("hide");return;}
  el.innerHTML=`<span>⚠ <b>Demand Desk is also open in another tab or window.</b> Both copies write to the same file and backup, so one can overwrite the other's changes — keep just one open.</span><button class="sm" id="pw-x">Dismiss</button>`;
  el.classList.remove("hide");
  el.querySelector("#pw-x").onclick=()=>{drawPeerWarn._off=true;drawPeerWarn();};}
/* Two carriers, because pages opened straight from disk (file://) don't always get
   BroadcastChannel, but they do share localStorage and its "storage" event. */
const PRESENCE_KEY="demanddesk.presence";let peerBc=null;
function announce(t){const m={t,id:INSTANCE,ts:Date.now()};
  try{if(peerBc)peerBc.postMessage(m);}catch(e){}
  try{localStorage.setItem(PRESENCE_KEY,JSON.stringify(m));}catch(e){}}
function onPeerMsg(m){if(!m||!m.id||m.id===INSTANCE)return;
  if(m.t==="bye")peers.delete(m.id);
  else{const isNew=!peers.has(m.id);if(isNew)drawPeerWarn._off=false;peers.set(m.id,Date.now());
    if(m.t==="hello")announce("here");}
  drawPeerWarn();}
try{peerBc=new BroadcastChannel("demanddesk");peerBc.onmessage=ev=>onPeerMsg(ev.data);}catch(e){peerBc=null;}
window.addEventListener("storage",e=>{if(e.key===PRESENCE_KEY&&e.newValue){try{onPeerMsg(JSON.parse(e.newValue));}catch(x){}}});
announce("hello");
setInterval(()=>{announce("ping");
  const cut=Date.now()-40000;let gone=false;peers.forEach((ts,id)=>{if(ts<cut){peers.delete(id);gone=true;}});
  if(gone)drawPeerWarn();},15000);
window.addEventListener("pagehide",()=>announce("bye"));

/* ---------- idle lock (only when encryption is on) ---------- */
const IDLE_MS=15*60*1000;
let lastActivity=Date.now(),screenLocked=false;
["mousemove","keydown","mousedown","wheel","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{lastActivity=Date.now();},{passive:true}));
setInterval(()=>{if(!screenLocked&&isEncrypted()&&Date.now()-lastActivity>IDLE_MS)lockScreen();},30000);
function lockScreen(){
  if(screenLocked)return;flushEdits();screenLocked=true;revealPw={};
  const veil=document.createElement("div");veil.className="lockveil";
  veil.innerHTML=`<div class="modal" style="width:360px"><h2>🔒 Locked (idle)</h2>
    <p class="faint" style="font-size:12px">Locked after 15 minutes of inactivity. Nothing was lost — unsaved changes are kept.</p>
    <div class="field"><label>Master password</label><input type="password" id="lk-pw" autocomplete="off"></div>
    <div id="lk-err" style="color:var(--red);font-size:12px;min-height:14px"></div>
    <div class="modal-foot"><button id="lk-ok" class="primary" style="width:100%">Unlock</button></div></div>`;
  document.body.appendChild(veil);
  const pw=veil.querySelector("#lk-pw");pw.focus();
  const tryUnlock=()=>{if(pw.value===masterPassword){veil.remove();screenLocked=false;lastActivity=Date.now();renderApp();}
    else{veil.querySelector("#lk-err").textContent="Wrong password.";pw.value="";pw.focus();}};
  veil.querySelector("#lk-ok").onclick=tryUnlock;
  pw.onkeydown=e=>{if(e.key==="Enter")tryUnlock();};
}

async function unlockStartup(){
  while(true){const pw=await promptPassword("🔒 Enter master password to unlock Demand Desk");
    if(pw===null){showStartupLock();return;}
    try{state=migrate(await decryptEnvelope(pendingEncrypted,pw));masterPassword=pw;pendingEncrypted=null;renderApp();toast("Unlocked 🔒");return;}
    catch(e){toast("Wrong password — try again",true);}}
}
/* Cancelled the unlock prompt: cover the app until unlocked — the empty placeholder
   behind it must not be edited (it would be saved over the real encrypted data). */
function showStartupLock(){
  if(document.getElementById("bootLock"))return;
  const veil=document.createElement("div");veil.className="lockveil";veil.id="bootLock";
  veil.innerHTML=`<div class="modal" style="width:380px"><h2>🔒 Demand Desk is locked</h2>
    <p class="faint" style="font-size:12px">Your data is encrypted. Nothing is shown or saved until you unlock it with the master password.</p>
    <div class="modal-foot"><button id="bl-open">📂 Open another file</button><button id="bl-unlock" class="primary">Unlock…</button></div></div>`;
  document.body.appendChild(veil);
  veil.querySelector("#bl-unlock").onclick=()=>{veil.remove();unlockStartup();};
  veil.querySelector("#bl-open").onclick=async()=>{veil.remove();await openFile();if(pendingEncrypted)showStartupLock();};
}
function seedState(){
    const tId=uid(), tocId=uid(), objId=uid(), epId=uid();
    state=migrate({version:10,settings:{landscapes:[...DEF_LANDSCAPES],tiers:DEF_TIERS,defaultSystem:"H03",encryption:false,autosave:true,clients:{H0:["010"],H1:["030","040","050","150","190","560"]}},
      tasks:[{id:tId,demandId:"DMND-10421",type:"Report change",title:"Add cost-center filter to ZFI_AGEING report",
        status:"progress",requestor:"Priya (FI)",epicId:epId,wave:"Wave 1",system:"H03",client:"010",project:"FI month-end pack",theme:"Finance",waiting:{on:"QA team",since:"2026-06-26"},receivedDate:"2026-06-15",dueDate:"2026-07-03",
        estimate:16,description:"Business wants the ageing report selectable by cost center; default = all.",
        notes:"Confirmed selection-screen layout with Priya. Watch the OpenSQL on BSID.",
        timeline:[{id:uid(),ts:Date.now()-86400000*8,type:"status",from:"",to:"open",note:""},{id:uid(),ts:Date.now()-86400000*3,type:"status",from:"open",to:"progress",note:""}],
        subtasks:[{id:uid(),title:"Add SELECT-OPTIONS for cost center",done:true,receivedDate:"2026-06-15",dueDate:"2026-06-20",collapsed:false,children:[{id:uid(),title:"Validate against CSKS",done:false,receivedDate:"2026-06-16",dueDate:"2026-06-22",collapsed:false,children:[]}]},
          {id:uid(),title:"Adjust ALV field catalog",done:false,receivedDate:"2026-06-15",dueDate:"2026-06-28",collapsed:false,children:[]}],
        objects:[{id:objId,name:"ZFI_AGEING",type:"Report / Program",action:"Modified",desc:"New select-option S_KOSTL; passed into data-fetch routine."}],
        transports:[
          {id:uid(),number:"H03K900812",desc:"Selection screen + S_KOSTL",system:"H03",released:true,kind:"workbench",client:"",syncs:[{system:"H02",date:"2026-06-21"}],tocId:tocId,toc:"",objectIds:[objId],notes:"QA fix #1"},
          {id:uid(),number:"H03K900840",desc:"ALV field catalog",system:"H03",released:true,kind:"workbench",client:"",syncs:[{system:"H02",date:"2026-06-24"}],tocId:tocId,toc:"",objectIds:[objId],notes:"QA fix #2"},
          {id:uid(),number:"H03K900861",desc:"Cost-center auth check",system:"H03",released:false,kind:"workbench",client:"",syncs:[],tocId:"",toc:"",objectIds:[],notes:"latest — not yet released to QA"},
          {id:uid(),number:"H03K900877",desc:"Ageing tolerance days — table maintenance",system:"H03",released:true,kind:"customizing",client:"010",syncs:[{system:"H02",date:"2026-06-24"}],tocId:"",toc:"",objectIds:[],notes:"client-dependent config — must reach client 010 in each system"}],
        tocs:[{id:tocId,number:"H03K900900",desc:"ZFI_AGEING go-live bundle",syncs:[{system:"H01",date:"2026-06-28"}],notes:"Carries the QA-tested fixes to Prod in one move instead of 9-10 separate TRs."}],
        reference:[{id:uid(),label:"Functional spec (SharePoint)",value:"https://contoso.sharepoint.com/sites/FI/ZFI_AGEING_FS.docx",secret:false,pinned:true},{id:uid(),label:"Test data",value:"Company code 1000, fiscal 2026",secret:false,pinned:false},{id:uid(),label:"Proxy service password",value:"«sample-secret-not-real»",secret:true,pinned:false}]}],
      meetings:[
        {id:uid(),date:"2026-06-18",title:"Sync with FI team on ageing report",team:"FI",attendees:"Priya, Rahul (FI)",body:"- Priya confirmed default should show ALL cost centers.\n- Rahul: needs it before month-end close (3rd).\n- Watch performance on large BSID selects.",taskIds:[tId],actions:[]},
        {id:uid(),date:"2026-06-22",title:"Weekly team standup",team:"Portal Team",attendees:"Me (PO), Anjali, Vikram, Sneha",body:"Sprint review + upcoming demands triage.",taskIds:[],actions:[{id:uid(),text:"Anjali to estimate the PA0008 infotype change",owner:"Anjali",done:false,due:"2026-06-25"},{id:uid(),text:"Vikram to release H43 transport to QA",owner:"Vikram",done:true,due:"2026-06-23",resolution:"Released as H43K900231, imported to H42 on 23.06."}]}],
      todos:[{id:uid(),text:"Update the deployment checklist wiki",done:false,due:"2026-07-04",createdAt:Date.now(),doneAt:null},{id:uid(),text:"Book leave for August",done:false,due:"",createdAt:Date.now(),doneAt:null}],
      credentials:[{id:uid(),system:"H13",client:"150",label:"SAP GUI",url:"",username:"DEVELOPER",password:"«sample-not-real»",notes:"demo — replace with your own",updatedAt:Date.now()}],
      journal:[{id:uid(),date:todayStr(),title:"Rough notes",body:"- Looked at ZFI_AGEING perf; the BSID select is the bottleneck.\n- Asked Priya re: default cost center -> ALL.\n- TODO: check if FOR ALL ENTRIES table can be empty.",taskIds:[tId]}],
      epics:[{id:epId,name:"FI ageing & month-end pack",code:"LUCA",owner:"Priya (FI)",targetDate:"2026-09-30",status:"active",
        description:"Everything the FI month-end close needs from us: the ageing report rework, the cost-center connection, and the standard-object change that feeds it.",
        notes:"Demands stay separate so each keeps its own transports and go-live target.",
        role:"contributor",myScope:"My slice: the ageing report and its cost-center filter. The integration team owns the upstream feed — my transports can't go to Prod until their mapping is live in QA.",
        log:[{date:"2026-05-28",kind:"milestone",text:"Epic kick-off with FI — waves agreed"},{date:"2026-06-30",kind:"decision",text:"Cost-center default = ALL (confirmed with Priya)"}],
        deps:[{team:"Integration team",what:"Upstream feed mapping deployed to H12",since:"2026-07-01",expected:"2026-08-15",lastCheck:"2026-07-20"}],
        subtasks:[{title:"Hand-over note for FI key users",done:false,dueDate:"2026-09-25",children:[]}],
        waves:[{name:"Wave 1",target:"2026-09-25"}]}],
      efforts:[{date:"2026-06-15",hours:1.5,taskId:tId,activity:"Analysis",note:"Went through the requirement with Priya; mapped the cost-center field"},
        {date:"2026-06-16",hours:3,taskId:tId,activity:"Build",note:"S_KOSTL select-option + validation against CSKS"},
        {date:"2026-06-16",hours:1,bucket:"mtg",activity:"Meetings & admin",note:"Stand-up and portal sync"},
        {date:"2026-06-18",hours:2.5,taskId:tId,activity:"Build",note:"Passed the range into the data fetch; watch the BSID select"},
        {date:"2026-06-21",hours:1,taskId:tId,activity:"Transport & Basis",note:"Released H03K900812; asked Basis to import to QA"}],
      playbook:[
        {id:uid(),kind:"process",title:"Request a new system role",category:"Access",pinned:true,
         body:"Roles are requested via the IAM portal, NOT by mailing Basis. Approval goes to your line manager first, then the system owner.",
         steps:[{id:uid(),text:"Open the IAM portal → Request access"},{id:uid(),text:"Pick the system (e.g. H01) and search the role (Z_HR_*)"},{id:uid(),text:"Justification: name the demand ID"},{id:uid(),text:"After approval mail, log off/on once in the target system"}]},
        {id:uid(),kind:"freeze",title:"Year-end change freeze",category:"Go-live",
         body:"No production imports without CAB exception approval.",
         from:"2026-11-15",to:"2026-12-31",systems:["H01","H11"]},
        {id:uid(),kind:"recurring",title:"Annual authorization review",category:"Access",
         body:"Review and confirm all Z-role assignments for the team; export list from SUIM, mark leavers.",
         due:"2027-03-15",recur:"annual"},
        {id:uid(),kind:"contacts",title:"Payroll product — responsible people",category:"Payroll",
         body:"",people:[{id:uid(),name:"Sneha",role:"Product owner (Payroll)",contact:"sneha@corp"},{id:uid(),name:"Vikram",role:"Basis contact H1x",contact:"vikram@corp"}]}],
      debug:[{id:uid(),title:"ZHR_PAYRUN nets to zero for some employees",demandId:"DMND-10377",taskId:tId,status:"paused",
        resume:"Breakpoint hit at ZHR_PAYRUN_F01 line 412 - LV_AMOUNT was 0. The READ on PA0008 above returned sy-subrc 4 for these PERNRs. NEXT: check the BEGDA/ENDDA filter on the PA0008 read.",
        notes:"Only affects employees with a mid-month action (IT0000).",
        objects:[{id:uid(),name:"ZHR_PAYRUN",note:"main report"},{id:uid(),name:"ZHR_PAYRUN_F01",note:"include with the calc routine"}],
        breakpoints:[{id:uid(),object:"ZHR_PAYRUN_F01",line:"412",condition:"lv_amount = 0",hit:true,note:"where the zero appears"},{id:uid(),object:"ZHR_PAYRUN_F01",line:"388",condition:"",hit:true,note:"the PA0008 READ"}],
        findings:[{id:uid(),ts:Date.now()-3600000,kind:"fails",text:"PA0008 READ returns sy-subrc 4 for affected PERNRs"},{id:uid(),ts:Date.now()-3000000,kind:"deadend",text:"Tried clearing the buffer - no change, not a buffering issue"},{id:uid(),ts:Date.now()-1800000,kind:"note",text:"All affected employees have an IT0000 action mid-month"}],
        watches:[{id:uid(),name:"LV_AMOUNT",value:"0",where:"ZHR_PAYRUN_F01 - 412"},{id:uid(),name:"SY-SUBRC",value:"4",where:"after PA0008 READ - 388"}]}]});
}
async function boot(){
  if(SELFTEST){seedState();renderApp();runSelfTest();return;}
  await initStore();
  const res=await loadBackup();
  if(res==="encrypted"){ renderApp(); await unlockStartup(); }
  else {
    if(!res){ seedState();
      if(backupUnreadable)toast("The browser's backup couldn't be read, so it was set aside untouched. Use 📂 Open to load your .json file.",true); }
    renderApp();
    let hadFile=false;try{hadFile=useIdb?!!(await idbGet("hadfile")):!!localStorage.getItem(LS_HANDLE_HINT);}catch(e){}
    if(res&&hadFile)toast("Loaded from local backup");
  }
  await restoreHandle();
  await restoreImgDir();
  notesRestore();
}
boot();
