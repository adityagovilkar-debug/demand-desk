/* ===================== IN-APP DIALOGS, UNDO AND KEYS =====================
   The app's own questions instead of the browser's prompt and confirm boxes: askBox (a
   title, a line of text, any fields), askOk and askText. They sit above any open dialog
   and answer with a promise. Deletes don't ask — they happen, with "Deleted · Undo" for a
   few seconds (the data as it was is kept that long). And the keyboard: ? lists every key. */
function askBox(o){return new Promise(res=>{const el=document.createElement("div"),fs=o.fields||[];el.className="ask-bg";
  el.innerHTML=`<div class="modal ask" role="dialog" aria-modal="true" style="width:${o.width||440}px"><h2>${esc(o.title||"")}</h2>${o.text?`<p class="ask-t">${esc(o.text)}</p>`:""}
    ${fs.map((f,i)=>`<div class="field"><label>${esc(f.label||"")}</label>${f.type==="textarea"?`<textarea data-i="${i}" rows="${f.rows||3}" placeholder="${esc(f.placeholder||"")}">${esc(f.value||"")}</textarea>`
      :`<input data-i="${i}" type="${f.type||"text"}" value="${esc(f.value==null?"":f.value)}" placeholder="${esc(f.placeholder||"")}" autocomplete="off"${f.type==="date"?' style="width:170px"':""}>`}${f.hint?`<div class="ask-h">${esc(f.hint)}</div>`:""}</div>`).join("")}
    <div class="modal-foot"><button class="ghost" data-a="no">${esc(o.cancel||"Cancel")}</button><button class="primary${o.danger?" ask-danger":""}" data-a="ok">${esc(o.ok||"OK")}</button></div></div>`;
  document.body.appendChild(el);
  const vals=()=>{const r={};fs.forEach((f,i)=>{r[f.k||i]=el.querySelector(`[data-i="${i}"]`).value;});return r;};
  const done=v=>{el.remove();document.removeEventListener("keydown",key,true);res(v);};
  const ok=()=>{if(o.check){const m=o.check(vals());if(m){toast(m,true);return;}}done(fs.length?vals():true);};
  const key=e=>{if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();done(null);}
    else if(e.key==="Enter"&&(e.target.tagName!=="TEXTAREA"||e.ctrlKey||e.metaKey)&&e.target.tagName!=="BUTTON"){e.preventDefault();e.stopImmediatePropagation();ok();}};
  document.addEventListener("keydown",key,true);
  el.querySelector('[data-a="no"]').onclick=()=>done(null);el.querySelector('[data-a="ok"]').onclick=ok;
  el.addEventListener("mousedown",e=>{if(e.target===el)done(null);});
  setTimeout(()=>{const f=el.querySelector("[data-i]")||el.querySelector('[data-a="ok"]');if(f){f.focus();if(f.select&&f.type!=="date")f.select();}},30);});}
const askOk=(text,o={})=>askBox({title:o.title||"Are you sure?",text,ok:o.ok||"OK",danger:o.danger,cancel:o.cancel}).then(v=>!!v);
const askText=(title,o={})=>askBox({title,text:o.text,ok:o.ok,fields:[{k:"v",label:o.label||"",value:o.value||"",placeholder:o.placeholder,type:o.type,hint:o.hint}],
  check:o.check?v=>o.check(v.v):null}).then(v=>v?v.v:null);
const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||"").trim());

/* a delete you can take back: everything as it was is kept while the toast shows */
const NAV_KEYS=()=>({view,activeId,activeTab,activeEpicId,activeMeetingId,activeJournalId,activeDebugId,activePlayId,activeJobId});
function deleteWithUndo(msg,fn){const snap=JSON.stringify(state),nav=NAV_KEYS();fn();markDirty();renderApp();
  efToastUndo(msg,()=>{state=JSON.parse(snap);({view,activeId,activeTab,activeEpicId,activeMeetingId,activeJournalId,activeDebugId,activePlayId,activeJobId}=nav);markDirty();renderApp();toast("Brought back");});}

/* ---------- keys ---------- */
const GO_KEYS={t:["today","Today"],d:["demands","Demands"],r:["transports","Transports"],k:["jobs","Tasks"],e:["epics","Epics"],m:["meetings","Meetings"],j:["journal","Journal"],
  f:["effort","Effort"],v:["review","Review"],o:["month","Month"],b:["playbook","Playbook"],x:["debug","Debug"],s:["search","Search"]};
const KEY_SHEET=[["Anywhere",[["Ctrl S","Save to your data file"],["Ctrl K","Search everything"],["Alt N","New demand"],["T","Log time"],["W","Note a win"],["?","This list"]]],
  ["Go to a workspace — G, then",Object.entries(GO_KEYS).map(([k,[,l]])=>[k.toUpperCase(),l])],
  ["On a demand or a task",[["N","Next action — when it comes back up"],["D","✓ Done — tick the next action off (and log the time)"],["E","Edit the demand"],["↑ ↓","The demand above / below in the list"],["1–6","Overview · Work · Objects · Transports · Effort · History"]]],
  ["In a dialog",[["Enter","OK / Save"],["Ctrl Enter","Save, from a text box"],["Esc","Close"]]]];
function openKeys(){const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal keys" style="width:640px"><h2>⌨ Keyboard</h2><p class="faint" style="font-size:12px;margin-top:-8px">Letters work when you're not typing in a field.</p>
    <div class="keys-g">${KEY_SHEET.map(([h,rows])=>`<div class="keys-s"><div class="ef-lb">${esc(h)}</div>${rows.map(([k,l])=>`<div class="keys-r"><span>${k.split(" ").map(x=>`<kbd>${esc(x)}</kbd>`).join(" ")}</span><span>${esc(l)}</span></div>`).join("")}</div>`).join("")}</div>
    <div class="modal-foot"><button class="primary" id="keysClose">Close</button></div></div></div>`;
  const close=()=>{root.innerHTML="";};root.querySelector("#keysClose").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};}
let goPending=0;
document.addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||screenLocked||pendingEncrypted||document.getElementById("bootLock"))return;
  if(document.querySelector("#modalRoot .modal-bg,.ask-bg"))return;
  const a=document.activeElement;if(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))return;
  const k=e.key,lk=k.toLowerCase();
  if(goPending&&Date.now()-goPending<1500){goPending=0;const g=GO_KEYS[lk];if(g){e.preventDefault();e.stopImmediatePropagation();view=g[0];meetingRollup=false;renderApp();}return;}
  goPending=0;
  if(k==="?"){e.preventDefault();openKeys();return;}
  if(lk==="g"){e.preventDefault();goPending=Date.now();toast("Go to… T Today · D Demands · R Transports · K Tasks · E Epics · M Meetings · J Journal · F Effort");return;}
  const x=view==="demands"?activeTask():view==="jobs"?activeJob():null;if(!x)return;
  if(lk==="n"){e.preventDefault();openNextAction(x);}
  else if(lk==="d"&&x.nextAction&&x.nextAction.date){e.preventDefault();nextActionDone(x);}
  else if(lk==="e"&&view==="demands"){e.preventDefault();openTaskModal(x);}});
