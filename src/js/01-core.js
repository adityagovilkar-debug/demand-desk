"use strict";
/* ============================================================
   DEMAND DESK v2 — ABAP work tracker (demands, calls, PO team).
   Local .json file (File System Access API) + localStorage mirror.
   ============================================================ */

const LS_KEY="demanddesk.backup.v1", LS_HANDLE_HINT="demanddesk.hadfile", SNAP_KEY="demanddesk.snapshots.v1";
const uid=()=>crypto.randomUUID?crypto.randomUUID():"id-"+Date.now()+"-"+Math.random().toString(16).slice(2);
function dstr(d){const p=n=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate());}
const todayStr=()=>dstr(new Date());

const STATUS={open:{label:"Open",cls:"open"},progress:{label:"In progress",cls:"progress"},delivered:{label:"Delivered",cls:"delivered"},bug:{label:"Bug / Rework",cls:"bug"},closed:{label:"Closed",cls:"closed"}};
const TASK_TYPES=["Report change","New development","Standard object mod","Infotype change","Troubleshooting","Enhancement","Other"];
const DEF_OBJ_TYPES=["Report / Program","Include","Function Module","Class / Method","Structure","Table / View","Data Element / Domain","Infotype","Enhancement / BAdI","Smartform / Adobe","Transformation","Search Help","Other"];
const OBJ_ACTIONS=["Created","Modified","Deleted","Analyzed"];
/* Object types are editable (⋯ menu, or ⚙ on the Objects tab) — every ABAP shop
   names its objects differently, and older objects keep a type even after it is
   removed from the list. */
function objTypes(){const a=state.settings.objTypes;return (a&&a.length)?a:DEF_OBJ_TYPES;}
function objTypeOptions(selected){
  let list=objTypes().slice();
  if(selected&&!list.includes(selected))list=[selected,...list];
  return list.map(x=>`<option ${x===selected?"selected":""}>${esc(x)}</option>`).join("");
}
function objTypeUsage(type){let n=0;state.tasks.forEach(t=>t.objects.forEach(o=>{if(o.type===type)n++;}));return n;}

const DEF_LANDSCAPES=["H0","H1","H2","H3","H4","H5","H6"];
const DEF_TIERS=[{d:"3",label:"Development",short:"DEV"},{d:"2",label:"Pre-prod / QA",short:"QA"},{d:"1",label:"Production",short:"PRD"}];

/* The data format this copy understands. Bump it whenever a change adds or reshapes saved data —
   an older copy then refuses to save a file written by a newer one, instead of dropping fields
   it doesn't know about. */
const DATA_VERSION=32;
let dataNewer=0;   /* the version of a loaded file that's newer than this copy (0 = fine) */
const SELFTEST=/[?&]selftest\b/.test(location.search);   /* sandbox: nothing is read from or written to your data */
function newerMsg(){return `This data was saved by a newer Demand Desk (data version ${dataNewer}); this copy understands up to ${DATA_VERSION}. Saving is switched off so nothing gets dropped — open the file with the newest DemandDesk.html.`;}
let state={version:DATA_VERSION,people:[],jobs:[],settings:{landscapes:[...DEF_LANDSCAPES],tiers:DEF_TIERS,defaultSystem:"H03",encryption:false,autosave:true,clients:{},imageExpiryDays:90},tasks:[],epics:[],meetings:[],calls:[],teamMeetings:[],credentials:[],journal:[],todos:[],debug:[],images:[],playbook:[],efforts:[],daysOff:[],wins:[],reviewNotes:{}};
let fileHandle=null, dirty=false, autoSaveTimer=null, lastSaveAuto=false, lastWriteAt=0, autoSaveDue=0, diskConflict=null, fileSig=null, savePromise=null, backupUnreadable=false;
let view="today";
let activeId=null, activeTab="overview", activeMeetingId=null, meetingRollup=false, rollupOwner="", rollupTeam="";
let activeJournalId=null, activeDebugId=null, journalTodos=false, activePlayId=null, activeEpicId=null;
let masterPassword=null, pendingEncrypted=null, revealPw={};

const DEBUG_STATUS={active:{label:"Active",cls:"open"},paused:{label:"Paused",cls:"progress"},resolved:{label:"Resolved",cls:"delivered"},abandoned:{label:"Abandoned",cls:"closed"}};
const FIND_KINDS={works:{label:"Works",icon:"✓",color:"var(--green)"},fails:{label:"Fails",icon:"✗",color:"var(--red)"},deadend:{label:"Dead end",icon:"⊘",color:"var(--amber)"},note:{label:"Note",icon:"•",color:"var(--muted)"}};

const supportsFS="showSaveFilePicker" in window;

/* ---------- systems ---------- */
function tierFor(d){ return state.settings.tiers.find(t=>t.d===d); }
function tierMeta(sysId){ const d=String(sysId||"").slice(-1); return tierFor(d); }
function sysTierCls(sysId){ return "t"+(String(sysId||"").slice(-1)); }
/* Where something has been moved, when that's many systems: one line saying how many and when,
   then a grid — a row per landscape, a column per tier — with each system's date on hover.
   Three or fewer stay as chips (returns null). */
function reachGridHTML(syncs,lead,extra){const S=(syncs||[]).filter(s=>s.system);if(S.length<=3)return null;
  const first=new Map();S.forEach(s=>{if(!first.has(s.system)||(s.date&&(!first.get(s.system)||s.date<first.get(s.system))))first.set(s.system,s.date||"");});
  const tiers=routeTiers(),Ls=[...new Set([...first.keys()].map(landscapeOf))].sort(),ds=[...first.values()].filter(Boolean).sort();
  const when=!ds.length?"":ds[0]===ds[ds.length-1]?shortD(ds[0]):shortD(ds[0])+" – "+shortD(ds[ds.length-1]);
  return `<div class="rgrid"><div class="rg-h">${lead} · <b>${first.size} systems</b>${when?" · "+when:""}${extra||""}</div>
    <div class="rg-t" style="grid-template-columns:repeat(${tiers.length},auto)">${tiers.map(d=>`<span class="rg-k">${esc((tierFor(d)||{}).short||d)}</span>`).join("")}${
      Ls.map(L=>tiers.map(d=>{const x=L+d;return first.has(x)?`<span class="rg-c sys ${sysTierCls(x)}" title="${esc(x)} · ${first.get(x)?"reached "+first.get(x):"reached"}">${esc(x)}</span>`:`<span class="rg-c rg-no" title="${esc(x)} — not moved there">·</span>`;}).join("")).join("")}</div></div>`;}
function sysPill(sysId,date,client){
  const m=tierMeta(sysId);
  return `<span class="sys ${sysTierCls(sysId)}">${esc(sysId)}<span class="d">${m?m.short:""}</span>${client?` · <span class="d">🗂 ${esc(client)}</span>`:""}${date?` · <span class="d">${date}</span>`:""}</span>`;
}
/* ---------- clients (mandants) — kept per landscape, used only by customizing TRs ---------- */
function landscapeOf(sysId){return sysId?String(sysId).slice(0,-1):"";}
function clientsForSystem(sysId){return (state.settings.clients&&state.settings.clients[landscapeOf(sysId)])||[];}
function isCust(tr){return !!(tr&&tr.kind==="customizing");}
function clientOptions(sysId,selected){
  let cs=clientsForSystem(sysId).slice();
  if(selected&&!cs.includes(selected))cs=[selected,...cs];
  if(!cs.length)return `<option value="">(none — set in ⋯ menu)</option>`;
  return `<option value="">— client —</option>`+cs.map(c=>`<option value="${esc(c)}" ${c===selected?"selected":""}>${esc(c)}</option>`).join("");
}
function systemOptions(selected){
  return `<option value="">—</option>`+state.settings.landscapes.map(L=>{
    const opts=state.settings.tiers.map(T=>{const id=L+T.d;return `<option value="${id}" ${id===selected?"selected":""}>${id} · ${T.label}</option>`;}).join("");
    return `<optgroup label="Landscape ${L}">${opts}</optgroup>`;
  }).join("");
}

/* ---------- crypto (Web Crypto, no deps) ---------- */
function isEncrypted(){return !!(state.settings.encryption&&masterPassword);}
function b64(buf){let s="";const a=new Uint8Array(buf);for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s);}
function ub64(str){const s=atob(str);const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}
async function deriveKey(pw,salt){const km=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:200000,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
async function encryptString(str,pw){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveKey(pw,salt);const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(str));
  return JSON.stringify({_encrypted:true,app:"demand-desk",v:1,salt:b64(salt),iv:b64(iv),data:b64(ct)});}
function encryptStateStr(pw){return encryptString(JSON.stringify(state),pw);}
/* when the master password is set/changed/removed, re-encrypt (or decrypt) the stored
   daily snapshots too, so no plaintext copy lingers after encryption is enabled */
async function recryptSnapshots(oldPw,newPw){try{
  const arr=await getSnapshots();let changed=false;
  for(const s of arr){try{
    let plain=s.data;
    if(s.enc){ if(!oldPw)continue; plain=JSON.stringify(await decryptEnvelope(JSON.parse(s.data),oldPw)); }
    if(newPw){s.data=await encryptString(plain,newPw);s.enc=true;}else{s.data=plain;s.enc=false;}
    changed=true;
  }catch(e){}}
  if(changed)setSnapshots(arr);
}catch(e){}}
async function decryptEnvelope(env,pw){const key=await deriveKey(pw,ub64(env.salt));
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:ub64(env.iv)},key,ub64(env.data));return JSON.parse(new TextDecoder().decode(pt));}
async function serializeData(){return isEncrypted()?await encryptStateStr(masterPassword):JSON.stringify(state,null,2);}

/* ---------- persistence ---------- */
let hadContent=false;
function contentCount(){return (state.jobs||[]).length+state.tasks.length+state.epics.length+state.meetings.length+state.credentials.length+state.journal.length+state.todos.length+state.debug.length+state.images.length+state.playbook.length+(state.efforts||[]).length+(state.wins||[]).length;}
function isValidState(s){return s&&typeof s==="object"&&Array.isArray(s.tasks)&&Array.isArray(s.epics)&&Array.isArray(s.meetings)&&Array.isArray(s.credentials)&&Array.isArray(s.journal)&&Array.isArray(s.todos)&&Array.isArray(s.debug)&&Array.isArray(s.images)&&Array.isArray(s.playbook)&&(s.efforts===undefined||Array.isArray(s.efforts));}
function noteContent(){if(isValidState(state)&&contentCount()>0)hadContent=true;}
/* defensive guard: returns true if it is SAFE to persist current state */
/* never while the startup unlock is pending: the in-memory state is then an empty
   placeholder, and persisting it would overwrite the real (encrypted) data */
function safeToPersist(){return !SELFTEST&&!dataNewer&&!pendingEncrypted&&isValidState(state)&&!(hadContent&&contentCount()===0);}
/* editSeq counts edits, so a save only clears "dirty" if nothing changed while the file
   was being written — an edit made mid-write stays unsaved and goes out with the next save. */
let editSeq=0;
function markDirty(){noteContent();dirty=true;editSeq++;renderSaveState();backupLocal();scheduleAutoSave();}
function renderSaveState(){const el=document.getElementById("saveState");
  document.title=(dirty?"● ":"")+"Demand Desk — ABAP Work Tracker";
  if(!el)return;
  const lock=state.settings.encryption?" 🔒":"";
  el.onclick=null;el.title="";
  /* an honest state light: what it is, why, and the fix (live · stale · not set up · fault) */
  const st=(k,txt,why,cls)=>{el.innerHTML=`<i class="vic ${k}"></i>${esc(txt)}${lock}`;el.className="savestate "+cls;el.title=why;};
  if(diskConflict){st("fault","File changed on disk","Something else changed your data file, so auto-save is paused and nothing gets overwritten. Click to decide which copy wins.","conflict");el.onclick=()=>resolveDiskConflict();return;}
  if(dirty){if(fileHandle)st("stale","Unsaved",`Changes since the last save${state.settings.autosave?" — auto-save writes them within 30 s":""}. Ctrl+S saves now.`,"dirty");
    else st("nm","Not saved","No data file chosen yet, so your changes live only in this browser's backup. Fix: 💾 Save and pick a file.","dirty");}
  else if(fileHandle)st("live",lastSaveAuto?"Auto-saved":"Saved",`Everything is in ${fileHandle.name}.`,"saved");
  else{el.innerHTML="";el.className="savestate saved";}}
/* ---------- auto-save (writes to the connected file ~30s after the last change) ---------- */
function scheduleAutoSave(){clearTimeout(autoSaveTimer);if(!state.settings.autosave||!supportsFS)return;autoSaveTimer=setTimeout(autoSaveNow,30000);autoSaveDue=Date.now()+30000;}
async function autoSaveNow(){
  if(!state.settings.autosave||!fileHandle||!dirty||diskConflict||pendingEncrypted||dataNewer||SELFTEST)return;
  if(!isValidState(state)||(hadContent&&contentCount()===0))return; /* silent guard — never auto-write a suspicious state; manual Save still asks */
  if(savePromise){scheduleAutoSave();return;}
  try{const f=await diskChanged();
    if(f){diskConflict=f;renderSaveState();toast("Your data file was changed outside this window — auto-save paused. Click the red notice to decide.",true);return;}
    await writeFile();lastSaveAuto=true;renderSaveState();maybeSnapshot();}
  catch(e){/* e.g. permission revoked — stay dirty; manual 💾 Save will surface the error */}
}
/* The one place that writes the data file. Serialised, so an auto-save and a Ctrl+S
   can never interleave two writes to the same file. */
function writeFile(){
  if(dataNewer||SELFTEST)return Promise.reject(new Error(SELFTEST?"self-test sandbox — nothing is saved":newerMsg()));
  const run=(savePromise||Promise.resolve()).catch(()=>{}).then(async()=>{
    const seq=editSeq;
    const w=await fileHandle.createWritable();await w.write(await serializeData());await w.close();
    await noteFileSig();lastWriteAt=Date.now();if(typeof markSaved==="function")markSaved();
    if(editSeq===seq)dirty=false;else scheduleAutoSave();});
  savePromise=run;
  return run.finally(()=>{if(savePromise===run)savePromise=null;});
}
/* ---------- external-change guard ----------
   fileSig is the file's timestamp + size as this window last wrote or read it. If the
   file on disk no longer matches, something else changed it — another tab, another PC
   via OneDrive, a copy restored over it — and writing blindly would erase that work. */
async function noteFileSig(){if(!fileHandle)return;try{const f=await fileHandle.getFile();
  fileSig={name:fileHandle.name,lm:f.lastModified,size:f.size};if(useIdb)idbSet("filesig",fileSig).catch(()=>{});}catch(e){}}
async function diskChanged(){if(!fileHandle||!fileSig||fileSig.name!==fileHandle.name)return null;
  try{const f=await fileHandle.getFile();return (f.lastModified!==fileSig.lm||f.size!==fileSig.size)?f:null;}catch(e){return null;}}
function resolveDiskConflict(f){
  f=f||diskConflict;if(!f||!fileHandle)return;
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:520px"><h2>⚠ Your data file changed on disk</h2>
    <p style="font-size:13px"><b class="mono">${esc(fileHandle.name)}</b> was modified <b>${esc(new Date(f.lastModified).toLocaleString())}</b> — after this window last saved or opened it.</p>
    <p class="faint" style="font-size:12px">Usually that means Demand Desk is open in another tab or window, the file was edited on another PC (OneDrive), or a copy was restored over it. Auto-save is paused until you choose, so nothing has been overwritten yet.</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      <button id="dc-load" class="primary">📂 Load the newer file from disk</button>
      <span class="faint" style="font-size:11px;margin:-4px 0 4px 2px">What's on screen now is kept first as a snapshot (⋯ → Restore a daily snapshot).</span>
      <button id="dc-keep" class="danger">💾 Overwrite the file with what's on screen</button>
      <button id="dc-later" class="ghost">Decide later</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector("#dc-later").onclick=close;
  root.querySelector(".modal-bg").onclick=ev=>{if(ev.target===root.querySelector(".modal-bg"))close();};
  root.querySelector("#dc-load").onclick=async()=>{close();
    try{await snapshotNow("before reloading "+fileHandle.name);
      const cur=await fileHandle.getFile();
      if(!await loadFromText(await cur.text(),fileHandle.name))return;
      diskConflict=null;dirty=false;await noteFileSig();backupLocal();renderApp();toast("Loaded the newer file from disk");}
    catch(e){toast("Couldn't load it: "+e.message,true);}};
  root.querySelector("#dc-keep").onclick=async()=>{close();diskConflict=null;await noteFileSig();saveFile();};
}
/* an extra, labelled restore point — e.g. just before a reload or an open replaces the screen */
async function snapshotNow(label){try{const arr=await getSnapshots();
  arr.push({date:todayStr()+" · "+label,ts:Date.now(),enc:isEncrypted(),data:await serializeData()});
  while(arr.length>14)arr.shift();setSnapshots(arr);}catch(e){}}
/* ---------- IndexedDB layer (optional; falls back to localStorage) ---------- */
/* IndexedDB gives a larger, sturdier backup store and can hold the file handle
   so the app re-links to your .json on next launch. If IndexedDB or the File
   System Access API isn't available (e.g. blocked on a locked-down machine),
   everything below silently falls back to exactly the localStorage behaviour. */
const IDB_NAME="demanddesk", IDB_STORE="kv";
let idb=null, useIdb=false, savedHandle=null;
function idbOpen(){return new Promise((res,rej)=>{let rq;try{rq=indexedDB.open(IDB_NAME,1);}catch(e){return rej(e);}
  rq.onupgradeneeded=()=>{const db=rq.result;if(!db.objectStoreNames.contains(IDB_STORE))db.createObjectStore(IDB_STORE);};
  rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);rq.onblocked=()=>rej(new Error("idb blocked"));});}
function idbGet(k){return new Promise((res,rej)=>{try{const tx=idb.transaction(IDB_STORE,"readonly");const r=tx.objectStore(IDB_STORE).get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
function idbSet(k,v){return new Promise((res,rej)=>{try{const tx=idb.transaction(IDB_STORE,"readwrite");tx.objectStore(IDB_STORE).put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);}catch(e){rej(e);}});}
function idbDel(k){return new Promise((res)=>{try{const tx=idb.transaction(IDB_STORE,"readwrite");tx.objectStore(IDB_STORE).delete(k);tx.oncomplete=()=>res();tx.onerror=()=>res();}catch(e){res();}});}
async function initStore(){
  try{idb=await idbOpen();useIdb=!!idb;}catch(e){idb=null;useIdb=false;}
  if(useIdb){try{ /* one-time migrate existing localStorage backup into IndexedDB */
    if((await idbGet("backup"))==null){const ls=localStorage.getItem(LS_KEY);if(ls){await idbSet("backup",ls);const sn=localStorage.getItem(SNAP_KEY);if(sn)await idbSet("snapshots",sn);await idbSet("hadfile","1");}}
  }catch(e){}}
}

/* ---------- browser backup ----------
   Written about a second after changes stop (not on every change), to IndexedDB when the browser has it,
   else to localStorage. When the window hides or closes it is written at once — and to localStorage too,
   because that write can't be cut short. Each copy carries the time it was taken, and loading uses the
   newer of the two. */
let backupTimer=null;
const LS_AT=LS_KEY+".at";
function persistBackup(str,closing){const at=Date.now();
  if(!useIdb||closing){try{localStorage.setItem(LS_KEY,str);localStorage.setItem(LS_AT,String(at));}catch(e){/* e.g. 5MB quota full — IndexedDB still covers it */}}
  try{localStorage.setItem(LS_HANDLE_HINT,"1");}catch(e){}
  if(useIdb){idbSet("backup",str).catch(()=>{});idbSet("backupAt",at).catch(()=>{});idbSet("hadfile","1").catch(()=>{});}
}
async function backupNow(closing){clearTimeout(backupTimer);backupTimer=null;
  if(!safeToPersist())return; /* never let a corrupt/emptied state clobber the good backup */
  try{persistBackup(isEncrypted()?await encryptStateStr(masterPassword):JSON.stringify(state),closing);}catch(e){}}
function backupLocal(){if(!safeToPersist())return;clearTimeout(backupTimer);backupTimer=setTimeout(()=>backupNow(false),1000);}
/* the window is going away or out of sight: don't leave a pending backup behind */
function flushBackup(){if(backupTimer)backupNow(true);}
/* the newer of the two browser copies ({raw, at}); with no times, IndexedDB's as before */
function pickBackup(idb,ls){if(idb.raw==null)return ls.raw;if(ls.raw==null)return idb.raw;return (+ls.at||0)>(+idb.at||0)?ls.raw:idb.raw;}
async function loadBackup(){
  const idb={raw:null,at:0},ls={raw:null,at:0};
  if(useIdb){try{const v=await idbGet("backup");if(v!=null){idb.raw=v;idb.at=+(await idbGet("backupAt"))||0;}}catch(e){}}
  try{ls.raw=localStorage.getItem(LS_KEY);ls.at=+localStorage.getItem(LS_AT)||0;}catch(e){}
  const raw=pickBackup(idb,ls);
  if(raw==null)return false;
  try{const p=JSON.parse(raw);if(p&&p._encrypted){pendingEncrypted=p;return "encrypted";}
    if(!p||typeof p!=="object"||!Array.isArray(p.tasks))throw new Error("not Demand Desk data");
    state=migrate(p);return true;}
  catch(e){ /* keep the unreadable copy aside — the next edit would otherwise overwrite it */
    backupUnreadable=true;try{if(useIdb)await idbSet("backup-unreadable",raw);else localStorage.setItem(LS_KEY+".unreadable",raw);}catch(e2){}
    return false;}
}
async function getSnapshots(){
  if(useIdb){try{const v=await idbGet("snapshots");if(v!=null)return JSON.parse(v);}catch(e){}}
  try{return JSON.parse(localStorage.getItem(SNAP_KEY)||"[]");}catch(e){return [];}
}
function setSnapshots(arr){if(dataNewer||SELFTEST)return;const str=JSON.stringify(arr);try{localStorage.setItem(SNAP_KEY,str);}catch(e){}if(useIdb)idbSet("snapshots",str).catch(()=>{});}
async function maybeSnapshot(){try{
  const arr=await getSnapshots();const today=todayStr();
  if(arr.length&&arr[arr.length-1].date===today)return;
  arr.push({date:today,ts:Date.now(),enc:isEncrypted(),data:await serializeData()});
  while(arr.length>14)arr.shift();
  setSnapshots(arr);
}catch(e){}}

/* ---------- persistent file handle ---------- */
function rememberHandle(){if(useIdb&&fileHandle){savedHandle=fileHandle;idbSet("handle",fileHandle).catch(()=>{});}updateReconnectUI();}
async function restoreHandle(){
  if(!useIdb||!supportsFS||fileHandle)return;
  try{savedHandle=await idbGet("handle");}catch(e){savedHandle=null;}
  try{fileSig=(await idbGet("filesig"))||null;}catch(e){}
  if(!savedHandle)return;
  let perm="prompt";try{if(savedHandle.queryPermission)perm=await savedHandle.queryPermission({mode:"readwrite"});}catch(e){}
  if(perm==="granted"){fileHandle=savedHandle;setFileLabel(savedHandle.name);await checkLinkedFile(false);}
  updateReconnectUI();renderSaveState();
}
/* On (re)linking the file: if it changed since this browser last saved it, don't let
   the local copy auto-save over it — flag it and let the user choose. */
async function checkLinkedFile(ask){
  const f=await diskChanged();
  if(f){diskConflict=f;renderSaveState();
    if(ask)resolveDiskConflict(f);else toast("Your data file changed since this browser last saved it — click the red notice to choose",true);return false;}
  if(!fileSig||fileSig.name!==fileHandle.name)await noteFileSig();
  return true;
}
async function reconnectFile(quiet){
  if(!savedHandle)return false;
  try{
    let perm="prompt";if(savedHandle.queryPermission)perm=await savedHandle.queryPermission({mode:"readwrite"});
    if(perm!=="granted"&&savedHandle.requestPermission)perm=await savedHandle.requestPermission({mode:"readwrite"});
    if(perm==="granted"){fileHandle=savedHandle;setFileLabel(savedHandle.name);updateReconnectUI();
      if(!await checkLinkedFile(true))return true;
      renderSaveState();if(dirty)scheduleAutoSave();if(!quiet)toast("Reconnected → "+savedHandle.name+" · saves now go to your file");return true;}
    toast("Permission not granted — use 📂 Open instead",true);return false;
  }catch(e){toast("Couldn't reconnect: "+e.message,true);return false;}
}
function updateReconnectUI(){const b=document.getElementById("btnReconnect");if(!b)return;
  if(savedHandle&&!fileHandle){b.classList.remove("hide");b.textContent="🔌 Reconnect "+(savedHandle.name||"file");}
  else b.classList.add("hide");}
async function forgetHandle(){savedHandle=null;if(useIdb)await idbDel("handle");updateReconnectUI();}

function migrate(d){
  dataNewer=(+d.version||0)>DATA_VERSION?+d.version:0;
  d.version=DATA_VERSION;
  d.settings=d.settings||{};
  d.settings.landscapes=d.settings.landscapes&&d.settings.landscapes.length?d.settings.landscapes:[...DEF_LANDSCAPES];
  d.settings.tiers=d.settings.tiers&&d.settings.tiers.length?d.settings.tiers:DEF_TIERS;
  d.settings.defaultSystem=d.settings.defaultSystem||"H03";
  d.settings.encryption=!!d.settings.encryption;
  d.settings.autosave=d.settings.autosave!==false;
  d.settings.clients=(d.settings.clients&&typeof d.settings.clients==="object")?d.settings.clients:{};
  {const a=(d.settings.objTypes||[]).map(x=>String(x||"").trim()).filter(Boolean);
   d.settings.objTypes=[...new Set(a.length?a:DEF_OBJ_TYPES)];}
  d.settings.imageExpiryDays=(typeof d.settings.imageExpiryDays==="number")?d.settings.imageExpiryDays:90;
  /* v28: the length of your working day — the full-day mark for hours logged */
  d.settings.dayHours=(+d.settings.dayHours>=1&&+d.settings.dayHours<=16)?Math.round(+d.settings.dayHours*4)/4:8;
  /* v31: days a transport may stay unreleased before it comes up on Today */
  d.settings.unreleasedDays=(+d.settings.unreleasedDays>=1&&+d.settings.unreleasedDays<=60)?Math.round(+d.settings.unreleasedDays):5;
  d.images=(d.images||[]).map(normImage);
  d.playbook=(d.playbook||[]).map(normPlay);
  /* hours logged (v22): demand rows keep their taskId even if the demand is later removed from another copy */
  d.efforts=(d.efforts||[]).map(normEffort).filter(e=>e.hours>0);
  /* days off (v23): holidays and leave with a label; the v22 leaveDays list folds in as plain leave */
  {const seen=new Set();d.daysOff=[...(d.daysOff||[]),...(d.leaveDays||[])].map(normDayOff).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x.date)&&!seen.has(x.date)&&seen.add(x.date)).sort((a,b)=>a.date.localeCompare(b.date));delete d.leaveDays;}
  /* wins and per-period review notes (v24) */
  d.wins=(d.wins||[]).map(normWin).filter(w=>w.text);
  d.reviewNotes=(d.reviewNotes&&typeof d.reviewNotes==="object"&&!Array.isArray(d.reviewNotes))?d.reviewNotes:{};
  d.epics=(d.epics||[]).map(normEpic);
  /* v29: your team — people a demand can be handed to (t.builders holds their ids) */
  d.people=(d.people||[]).map(normPerson).filter(p=>p.name);
  /* v30: tasks that aren't demands */
  d.jobs=(d.jobs||[]).map(normJob);
  /* referential integrity: a demand pointing at a deleted epic falls back to none,
     so a stale id can never render as a phantom grouping */
  {const eids=new Set(d.epics.map(e=>e.id));
   (d.tasks||[]).forEach(t=>{if(t.epicId&&!eids.has(t.epicId))t.epicId="";});
   (d.meetings||[]).concat(d.journal||[],d.calls||[]).forEach(x=>{if(x&&x.epicIds)x.epicIds=x.epicIds.filter(id=>eids.has(id));});}
  d.tasks=(d.tasks||[]).map(t=>{
    const tocs=(t.tocs||[]).map(normToc);
    const transports=(t.transports||[]).map(tr=>({
      id:tr.id||uid(),number:tr.number||"",desc:tr.desc||"",system:tr.system||d.settings.defaultSystem,released:!!tr.released,
      kind:tr.kind==="customizing"?"customizing":"workbench", client:tr.client||"",
      syncs:(tr.syncs||[]).map(s=>({system:s.system||"",date:s.date||""})), tocId:tr.tocId||"", toc:tr.toc||"",
      objectIds:(tr.objectIds||[]).slice(),
      dest:(tr.dest||[]).map(x=>String(x).trim()).filter(Boolean),
      notes:(tr.notes||"")+(tr.syncedTo?` [legacy synced-to: ${tr.syncedTo}]`:""),
      /* v31: the day it was added (older transports count from the upgrade) and the day it was released */
      addedOn:/^\d{4}-\d\d-\d\d$/.test(tr.addedOn||"")?tr.addedOn:todayStr(),releasedOn:tr.released&&/^\d{4}-\d\d-\d\d$/.test(tr.releasedOn||"")?tr.releasedOn:""
    }));
    /* v27: the origin is never a destination of its own transport, and a transport whose
       own syncs reached another system must have been released */
    transports.forEach(tr=>{tr.dest=tr.dest.filter(x=>x!==tr.system);
      if(!tr.released&&tr.syncs.some(s=>s.system&&s.system!==tr.system))tr.released=true;});
    /* migrate legacy free-text ToC numbers into first-class ToC records */
    transports.forEach(tr=>{ if(!tr.tocId && tr.toc){ let toc=tocs.find(x=>x.number===tr.toc); if(!toc){toc=normToc({number:tr.toc}); tocs.push(toc);} tr.tocId=toc.id; } tr.toc=""; });
    return {
    id:t.id||uid(),demandId:t.demandId||"",title:t.title||"(untitled)",type:t.type||"Other",status:t.status||"open",
    requestor:t.requestor||"",epicId:t.epicId||"",wave:t.wave||"",
    system:t.system||"",client:t.client||"",project:t.project||"",theme:t.theme||"",
    waiting:{on:(t.waiting&&t.waiting.on)||"",since:(t.waiting&&t.waiting.since)||""},goliveTarget:t.goliveTarget||"",
    nextAction:{date:(t.nextAction&&t.nextAction.date)||"",note:(t.nextAction&&t.nextAction.note)||""},
    receivedDate:t.receivedDate||"",dueDate:t.dueDate||"",estimate:(+t.estimate>0?Math.round(+t.estimate*4)/4:0),star:!!t.star,
    builders:[...new Set((t.builders||[]).filter(id=>(d.people||[]).some(p=>p.id===id)))],
    lessons:(t.lessons||[]).map(l=>({id:l.id||uid(),date:/^\d{4}-\d\d-\d\d$/.test(l.date||"")?l.date:todayStr(),text:String(l.text||""),playId:l.playId||""})).filter(l=>l.text.trim()),description:t.description||"",notes:t.notes||"",
    timeline:(t.timeline||[]).map(e=>({id:e.id||uid(),ts:e.ts||Date.now(),type:e.type||"note",from:e.from||"",to:e.to||"",note:e.note||"",cause:e.cause==="change"?"change":"",est:+e.est>0?+e.est:0})),
    subtasks:(t.subtasks||[]).map(normSub),
    objects:(t.objects||[]).map(o=>({id:o.id||uid(),name:o.name||"",type:o.type||"",action:o.action||"Modified",desc:o.desc||"",ackClash:(o.ackClash||[]).slice()})),
    transports, tocs,
    comments:(t.comments||[]).map(normComment),
    reference:(t.reference||[]).map(r=>({id:r.id||uid(),label:r.label||"",value:r.value||"",secret:!!r.secret,pinned:!!r.pinned})),
    createdAt:t.createdAt||Date.now(),updatedAt:t.updatedAt||Date.now(),
  };});
  /* ----- unify legacy calls + teamMeetings into a single meetings collection -----
     Idempotent: after the first migration the legacy arrays are emptied, so a
     saved file re-loaded never double-merges. New data only ever goes to meetings. */
  d.meetings=(d.meetings||[]).map(normMeeting);
  (d.calls||[]).forEach(c=>d.meetings.push(normMeeting({id:c.id,date:c.date,title:c.title||"(untitled call)",team:"",attendees:c.attendees,body:c.body,taskIds:c.taskIds,actions:[],createdAt:c.createdAt,updatedAt:c.updatedAt})));
  (d.teamMeetings||[]).forEach(m=>d.meetings.push(normMeeting({id:m.id,date:m.date,title:m.title||"(untitled meeting)",team:m.team||"",attendees:m.attendees,body:m.body,taskIds:[],actions:m.actions,createdAt:m.createdAt,updatedAt:m.updatedAt})));
  d.calls=[];d.teamMeetings=[];
  /* v32: the Journal's to-do list became Tasks — one list for things to do */
  (d.todos||[]).map(normTodo).forEach(x=>{if(d.jobs.some(j=>j.id===x.id))return;
    d.jobs.push(normJob({id:x.id,title:x.text||"(to-do)",source:"self",received:isoTs(x.createdAt||Date.now()),due:x.due||"",status:x.done?"done":"open",
      closedOn:x.done?isoTs(x.doneAt||x.createdAt||Date.now()):"",outcome:x.resolution||"",createdAt:x.createdAt,updatedAt:x.doneAt||x.createdAt}));});
  d.todos=[];
  d.credentials=(d.credentials||[]).map(c=>({id:c.id||uid(),system:c.system||"",client:c.client||"",label:c.label||"",url:c.url||"",username:c.username||"",password:c.password||"",notes:c.notes||"",updatedAt:c.updatedAt||Date.now()}));
  d.journal=(d.journal||[]).map(j=>({id:j.id||uid(),date:j.date||todayStr(),title:j.title||"",body:j.body||"",taskIds:(j.taskIds||[]).slice(),epicIds:(j.epicIds||[]).slice(),createdAt:j.createdAt||Date.now(),updatedAt:j.updatedAt||Date.now()}));
  d.debug=(d.debug||[]).map(s=>({id:s.id||uid(),title:s.title||"(untitled debug)",demandId:s.demandId||"",taskId:s.taskId||"",status:s.status||"active",resume:s.resume||"",notes:s.notes||"",
    objects:(s.objects||[]).map(o=>({id:o.id||uid(),name:o.name||"",note:o.note||""})),
    breakpoints:(s.breakpoints||[]).map(b=>({id:b.id||uid(),object:b.object||"",line:b.line||"",condition:b.condition||"",hit:!!b.hit,note:b.note||""})),
    findings:(s.findings||[]).map(f=>({id:f.id||uid(),ts:f.ts||Date.now(),kind:f.kind||"note",text:f.text||""})),
    watches:(s.watches||[]).map(w=>({id:w.id||uid(),name:w.name||"",value:w.value||"",where:w.where||""})),
    createdAt:s.createdAt||Date.now(),updatedAt:s.updatedAt||Date.now()}));
  return d;
}
function normPerson(p){p=p||{};return{id:p.id||uid(),name:String(p.name||"").trim(),role:String(p.role||"").trim(),active:p.active!==false,createdAt:p.createdAt||Date.now()};}
function normSub(s){return{id:s.id||uid(),title:s.title||"",done:!!s.done,receivedDate:s.receivedDate||"",dueDate:s.dueDate||"",collapsed:!!s.collapsed,comments:(s.comments||[]).map(normComment),children:(s.children||[]).map(normSub)};}
function normComment(c){return{id:c.id||uid(),text:c.text||"",ts:c.ts||Date.now()};}
function normAction(a){return{id:a.id||uid(),text:a.text||"",owner:a.owner||"",done:!!a.done,due:a.due||"",resolution:a.resolution||""};}
function normMeeting(m){return{id:m.id||uid(),date:m.date||todayStr(),title:m.title||"(untitled meeting)",team:m.team||"",attendees:m.attendees||"",body:m.body||"",taskIds:(m.taskIds||[]).slice(),epicIds:(m.epicIds||[]).slice(),actions:(m.actions||[]).map(normAction),hours:Math.max(0,Math.round((+m.hours||0)*4)/4),logTo:String(m.logTo||""),createdAt:m.createdAt||Date.now(),updatedAt:m.updatedAt||Date.now()};}
function normTodo(x){return{id:x.id||uid(),text:x.text||"",done:!!x.done,due:x.due||"",resolution:x.resolution||"",createdAt:x.createdAt||Date.now(),doneAt:x.doneAt||null};}
function normImage(x){return{id:x.id||uid(),file:x.file||"",label:x.label||"",expiry:x.expiry||"",links:(x.links||[]).filter(l=>l&&l.kind&&l.id).map(l=>({kind:l.kind,id:l.id})),addedAt:x.addedAt||Date.now()};}
/* ---------- epics ----------
   A first-class grouping for related demands (e.g. "LUCA"): a connection, a report
   and a standard-object change can share one epic while staying separate demands,
   each with its own transports and go-live target. Distinct from `project`/`theme`,
   which remain free-text labels. */
const EPIC_STATUS={active:{label:"Active",cls:"open"},onhold:{label:"On hold",cls:"progress"},
  delivered:{label:"Delivered",cls:"delivered"},closed:{label:"Closed",cls:"closed"}};
/* The epic's own story entries — dated by hand so a year-old history can be back-filled. */
const EPIC_LOG={note:{label:"Note",icon:"📝"},milestone:{label:"Milestone",icon:"🏁"},decision:{label:"Decision",icon:"⚖"},followup:{label:"Follow-up",icon:"📞"}};
/* role: "lead" = I own the whole initiative; "contributor" = I deliver one slice of a
   larger programme and mostly can't see the rest of it. */
function normEpic(e){return{id:e.id||uid(),name:e.name||"(untitled epic)",code:e.code||"",description:e.description||"",
  owner:e.owner||"",targetDate:e.targetDate||"",status:EPIC_STATUS[e.status]?e.status:"active",notes:e.notes||"",
  role:e.role==="contributor"?"contributor":"lead",myScope:e.myScope||"",
  followDays:(typeof e.followDays==="number"&&e.followDays>0)?e.followDays:30,
  log:(e.log||[]).map(x=>({id:x.id||uid(),date:x.date||todayStr(),kind:EPIC_LOG[x.kind]?x.kind:"note",text:x.text||""})),
  deps:(e.deps||[]).map(normDep),
  subtasks:(e.subtasks||[]).map(normSub),
  waves:(e.waves||[]).filter(w=>w&&w.name).map(w=>({name:w.name,target:w.target||""})),
  createdAt:e.createdAt||Date.now(),updatedAt:e.updatedAt||Date.now()};}
/* Something another team owes before my part of the epic can move. */
function normDep(x){return{id:x.id||uid(),team:x.team||"",what:x.what||"",since:x.since||"",expected:x.expected||"",
  lastCheck:x.lastCheck||"",snoozeUntil:x.snoozeUntil||"",done:!!x.done,doneDate:x.doneDate||"",note:x.note||""};}
const PLAY_KINDS={
  process:{label:"Process / How-to",icon:"📋"},
  faq:{label:"FAQ",icon:"❓"},
  recurring:{label:"Recurring task",icon:"🔁"},
  freeze:{label:"Freeze period",icon:"❄"},
  contacts:{label:"Contacts / Responsibilities",icon:"👥"},
  lesson:{label:"Lesson learned",icon:"💡"}
};
function normPlay(p){return{id:p.id||uid(),kind:PLAY_KINDS[p.kind]?p.kind:"process",title:p.title||"(untitled)",category:p.category||"",body:p.body||"",pinned:!!p.pinned,
  steps:(p.steps||[]).map(s=>({id:s.id||uid(),text:s.text||""})),
  due:p.due||"",recur:["annual","quarterly","monthly","once"].includes(p.recur)?p.recur:"annual",lastDone:p.lastDone||null,
  from:p.from||"",to:p.to||"",systems:(p.systems||[]).slice(),
  people:(p.people||[]).map(x=>({id:x.id||uid(),name:x.name||"",role:x.role||"",contact:x.contact||""})),
  fromTaskId:p.fromTaskId||"",fromLessonId:p.fromLessonId||"",fromDate:p.fromDate||"",
  createdAt:p.createdAt||Date.now(),updatedAt:p.updatedAt||Date.now()};}
function activeFreezes(date){date=date||todayStr();return state.playbook.filter(p=>p.kind==="freeze"&&p.from&&p.to&&p.from<=date&&date<=p.to);}
function freezeFor(sysId,date){return activeFreezes(date).find(f=>(f.systems||[]).includes(sysId))||null;}
function advanceRecurring(p){
  p.lastDone=Date.now();
  if(!p.due)return;
  if(p.recur==="once"){p.due="";return;}
  const d=new Date(p.due+"T00:00:00"),day=d.getDate();
  if(p.recur==="annual")d.setFullYear(d.getFullYear()+1);
  else if(p.recur==="quarterly")d.setMonth(d.getMonth()+3);
  else d.setMonth(d.getMonth()+1);
  if(d.getDate()!==day)d.setDate(0); /* month overflow (e.g. Jan 31 + 1mo) → clamp to month end */
  p.due=isoD(d);
}
function normToc(x){return{id:x.id||uid(),number:x.number||"",desc:x.desc||"",syncs:(x.syncs||[]).map(s=>({system:s.system||"",date:s.date||""})),notes:x.notes||""};}
/* ToC + effective-sync helpers: a TR bundled into a ToC inherits the ToC's downstream syncs */
function tocFor(t,tr){return tr.tocId?(t.tocs||[]).find(x=>x.id===tr.tocId):null;}
function effectiveSyncs(t,tr){
  const own=tr.syncs.filter(s=>s.system).map(s=>({system:s.system,date:s.date,via:""}));
  const toc=tocFor(t,tr);
  const viaToc=toc?toc.syncs.filter(s=>s.system).map(s=>({system:s.system,date:s.date,via:toc.number||"ToC"})):[];
  return [...own,...viaToc];
}
/* a transport that has reached another system has been released — never leave it "not released"
   (ToC moves don't count: a ToC carries the objects while the transport itself stays open) */
function syncReleases(tr,sys,date){if(!tr||tr.released||!sys||sys===tr.system)return false;tr.released=true;tr.releasedOn=tr.releasedOn||date||todayStr();return true;}
/* Transport descriptions often follow one naming pattern ending in initials + a running number
   ("… : AB12"). Suggest the next: this demand's last such description (else the newest one elsewhere,
   with that demand's ticket ID and text swapped for this one's), numbered one past the highest in use.
   SAP keeps 60 characters of a transport's short text, so the suggestion stays within that. */
const TR_SEQ=/^(.*[:|\-\/]\s*)([A-Za-z]{1,4})(\d{1,5})\s*$/;
function trDescSuggest(t){const hits=[];
  state.tasks.slice().sort((a,b)=>(a.updatedAt||0)-(b.updatedAt||0)).forEach(x=>x.transports.forEach(tr=>{const m=TR_SEQ.exec(tr.desc||"");if(m)hits.push({x,m});}));
  if(!hits.length)return "";
  const own=hits.filter(h=>h.x===t),src=own.length?own[own.length-1]:hits.slice().reverse().find(h=>h.x.demandId&&t.demandId&&h.m[1].includes(h.x.demandId));
  if(!src)return "";
  const ini=src.m[2],top=Math.max(...hits.filter(h=>h.m[2].toUpperCase()===ini.toUpperCase()).map(h=>+h.m[3])),seq=ini+String(top+1).padStart(src.m[3].length,"0");
  let pre=src.m[1];
  if(src.x!==t){const id=src.x.demandId,i=pre.indexOf(id),after=pre.slice(i+id.length),sep=(/^\s*[:|\-\/]\s*/.exec(after)||[" : "])[0],tail=(/\s*[:|\-\/]\s*$/.exec(pre)||[" : "])[0];
    const head=pre.slice(0,i)+t.demandId+sep,room=60-head.length-tail.length-seq.length;
    const tt=t.title.length>room?t.title.slice(0,room+1).replace(/\s+\S*$/,""):t.title;
    pre=room>=8?head+tt.trim()+tail:head;}
  return (pre+seq).slice(0,60);}
function reachedSystems(t,tr){const set=new Set();effectiveSyncs(t,tr).forEach(s=>set.add(s.system));return set;}
function prodTargetFor(t){ /* default go-live target = production tier of the first transport's landscape */
  const tr=t.transports[0]; if(!tr||!tr.system)return "";
  const L=tr.system.slice(0,-1); const prod=(state.settings.tiers.find(x=>x.d==="1"));
  return prod?L+prod.d:"";
}
const WAIT_OPTIONS=["QA team","Functional team","Transport import","Business","Basis","Another team","Me (action needed)"];
function isWaiting(t){return !!(t.waiting&&t.waiting.on)&&t.status!=="closed";}
function waitDays(t){return (t.waiting&&t.waiting.since)?Math.max(0,-daysUntil(t.waiting.since)):null;}
function trsForObject(t,objId){return t.transports.filter(tr=>(tr.objectIds||[]).includes(objId));}
function goliveTargetFor(t){return t.goliveTarget||prodTargetFor(t)||"";}
/* Where a transport has to end up. Most follow the demand's go-live target (e.g. H01);
   some are built in one system only to be synced elsewhere — H03 → H43 → H42 → H41 —
   or to several landscapes at once. Those carry their own destinations (tr.dest), and
   they're complete when every destination has been reached. */
function trDest(t,tr){return (tr&&tr.dest&&tr.dest.length)?tr.dest.filter(x=>x!==tr.system):[];}   /* a transport is always in its origin */
function trTargets(t,tr){const d=trDest(t,tr);if(d.length)return d;const g=goliveTargetFor(t);return g?[g]:[];}
function trMissing(t,tr){const R=reachedSystems(t,tr);return trTargets(t,tr).filter(x=>x!==tr.system&&!R.has(x));}
function trComplete(t,tr){return trTargets(t,tr).length>0&&trMissing(t,tr).length===0;}
function golivePending(t){if(!t.transports.length)return null;
  const missing=t.transports.filter(tr=>trTargets(t,tr).length&&!trComplete(t,tr));
  return missing.length?{target:[...new Set(missing.flatMap(tr=>trMissing(t,tr)))].join("/"),missing}:null;}

/* Refuses anything that isn't Demand Desk data — the same folder also holds Snip Desk
   .marks.json sidecars and Team Desk files, and opening one would otherwise load as
   an empty desk that the next save writes over that file. */
const NOT_DD="that isn't a Demand Desk data file";
async function loadFromText(txt,labelName){
  let parsed=JSON.parse(txt);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error(NOT_DD);
  if(parsed._encrypted){
    if(parsed.app&&parsed.app!=="demand-desk")throw new Error("that file belongs to "+parsed.app+", not Demand Desk");
    while(true){const pw=await promptPassword("🔒 Enter master password"+(labelName?" for "+labelName:""));
      if(pw===null)return false;
      let dec;try{dec=await decryptEnvelope(parsed,pw);}catch(e){toast("Wrong password — try again",true);continue;}
      if(!dec||!Array.isArray(dec.tasks))throw new Error(NOT_DD);
      state=migrate(dec);masterPassword=pw;break;}
  }else{if(!Array.isArray(parsed.tasks))throw new Error(NOT_DD);state=migrate(parsed);masterPassword=null;}
  pendingEncrypted=null;
  return true;
}
const UNSAVED_MSG="You have changes that haven't reached your data file yet.\n\nOpening a different file replaces what's on screen (a copy is kept first — ⋯ → Restore a daily snapshot). Continue?";
async function openFile(){if(!supportsFS)return importViaInput();
  flushEdits();if(dirty&&!await askOk(UNSAVED_MSG,{title:"Open another file?",ok:"Open"}))return;
  try{const[h]=await window.showOpenFilePicker({types:[{description:"Demand Desk data",accept:{"application/json":[".json"]}}]});
    const f=await h.getFile();const txt=await f.text();
    if(dirty)await snapshotNow("before opening "+h.name);
    if(!await loadFromText(txt,h.name))return;
    fileHandle=h;diskConflict=null;dirty=false;setFileLabel(h.name);await noteFileSig();rememberHandle();resetActive();backupLocal();renderApp();toast("Opened "+h.name);
  }catch(e){if(e.name!=="AbortError")toast("Couldn't open: "+e.message,true);}}
async function saveGuardOk(action){
  if(SELFTEST){toast("Self-test sandbox — nothing is saved",true);return false;}
  if(dataNewer){toast(newerMsg(),true);return false;}
  if(pendingEncrypted){toast("Unlock first — nothing can be saved while the data is still locked",true);return false;}
  if(!isValidState(state)){toast("Save blocked — data looks corrupted; your file was NOT overwritten.",true);return false;}
  if(hadContent&&contentCount()===0){return askOk("You\'re about to "+action+" an EMPTY dataset — every demand, debug session, journal entry etc. is currently empty.\n\nThis is unusual and may be a mistake. Continue anyway?",{title:"⚠ An empty file?",ok:"Continue",danger:true});}
  return true;
}
async function saveFile(){flushEdits();if(!supportsFS)return exportDownload();
  if(!await saveGuardOk("save"))return;
  try{
    /* a remembered file that just needs permission again: re-link it rather than
       opening a Save-As dialog that could fork the data into a second file */
    if(!fileHandle&&savedHandle){if(!await reconnectFile(true)||diskConflict)return;}
    if(!fileHandle){fileHandle=await window.showSaveFilePicker({suggestedName:"demand-desk-data.json",types:[{description:"Demand Desk data",accept:{"application/json":[".json"]}}]});fileSig=null;}
    if(savePromise)await savePromise.catch(()=>{});
    const changed=await diskChanged();if(changed){diskConflict=changed;renderSaveState();resolveDiskConflict(changed);return;}
    await writeFile();diskConflict=null;lastSaveAuto=false;setFileLabel(fileHandle.name);rememberHandle();renderSaveState();maybeSnapshot();toast("Saved → "+fileHandle.name+(isEncrypted()?" 🔒":""));
  }catch(e){if(e.name!=="AbortError")toast("Save failed: "+e.message,true);}}
function setFileLabel(n){const el=document.getElementById("fileLabel");if(el)el.textContent=n?("— "+n):"";}
async function exportDownload(){if(!await saveGuardOk("download"))return;const b=new Blob([await serializeData()],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="demand-desk-data.json";a.click();URL.revokeObjectURL(a.href);if(!supportsFS)dirty=false; /* only when the download IS the save — otherwise the linked file is still behind */
  renderSaveState();maybeSnapshot();toast("Downloaded data file"+(isEncrypted()?" 🔒":""));}
async function importViaInput(){flushEdits();if(dirty&&!await askOk(UNSAVED_MSG,{title:"Open another file?",ok:"Open"}))return;
  const i=document.createElement("input");i.type="file";i.accept=".json,application/json";
  i.onchange=()=>{const f=i.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{if(dirty)await snapshotNow("before importing "+f.name);if(!await loadFromText(r.result,f.name))return;dirty=false;resetActive();backupLocal();renderApp();toast("Imported "+f.name);}catch(e){toast("Bad file: "+e.message,true);}};r.readAsText(f);};i.click();}

/* password prompt — returns Promise<string|null> */
function promptPassword(title,confirm){
  return new Promise(resolve=>{
    const root=document.getElementById("modalRoot");
    root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:400px"><h2>${esc(title)}</h2>
      <div class="field"><label>Password</label><input type="password" id="pw1" autocomplete="off"></div>
      ${confirm?`<div class="field"><label>Confirm password</label><input type="password" id="pw2" autocomplete="off"></div>`:""}
      <div id="pw-err" class="faint" style="color:var(--red);font-size:12px;min-height:14px"></div>
      <div class="modal-foot"><button id="pw-cancel" class="ghost">Cancel</button><button id="pw-ok" class="primary">OK</button></div></div></div>`;
    const p1=root.querySelector("#pw1");p1.focus();
    const done=v=>{root.innerHTML="";resolve(v);};
    const submit=()=>{const v=p1.value;if(confirm){const v2=root.querySelector("#pw2").value;if(v.length<4){root.querySelector("#pw-err").textContent="Use at least 4 characters.";return;}if(v!==v2){root.querySelector("#pw-err").textContent="Passwords don't match.";return;}}else if(!v){return;}done(v);};
    root.querySelector("#pw-ok").onclick=submit;
    root.querySelector("#pw-cancel").onclick=()=>done(null);
    root.querySelectorAll("input").forEach(inp=>inp.onkeydown=e=>{if(e.key==="Enter")submit();if(e.key==="Escape")done(null);});
  });
}

/* ---------- helpers ---------- */
function activeTask(){return state.tasks.find(t=>t.id===activeId);}
function activeMeeting(){return state.meetings.find(m=>m.id===activeMeetingId);}
function touch(o){o.updatedAt=Date.now();markDirty();}
function daysUntil(d){if(!d)return null;return Math.round((new Date(d+"T00:00:00")-new Date(todayStr()+"T00:00:00"))/86400000);}
function dueClass(d,status){if(!d||status==="delivered"||status==="closed")return"";const n=daysUntil(d);if(n===null)return"";if(n<0)return"over";if(n<=3)return"soon";return"";}
function esc(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
/* linkify: escape text but render http(s) URLs as clickable links */
const URL_RE=/(https?:\/\/[^\s<>"')\]]+)/g;
function linkify(raw){return String(raw||"").split(URL_RE).map((p,i)=>i%2?`<a href="${esc(p)}" target="_blank" rel="noopener">${esc(p)}</a>`:esc(p)).join("");}
function linkChips(text){const m=String(text||"").match(URL_RE);if(!m)return"";const u=[...new Set(m)];
  return `<div class="chiprow" style="margin-top:6px">${u.map(x=>`<a class="chip" href="${esc(x)}" target="_blank" rel="noopener" style="text-decoration:none">🔗 ${esc(x.length>62?x.slice(0,59)+"…":x)}</a>`).join("")}</div>`;}
function toast(m,err){const t=document.getElementById("toast");t.textContent=m;t.className="toast show"+(err?" err":"");clearTimeout(toast._t);toast._t=setTimeout(()=>t.className="toast",2600);}
function countSubs(list){let n=0,done=0;(function w(a){a.forEach(s=>{n++;if(s.done)done++;w(s.children);});})(list);return{n,done};}
function findSub(list,id){for(const s of list){if(s.id===id)return{sub:s,parent:list};const r=findSub(s.children,id);if(r)return r;}return null;}
function earliestOpenDue(t){if(t.status==="closed")return null; /* a closed demand's leftover subtasks aren't overdue work */
  let best=null;if(t.dueDate&&t.status!=="delivered"&&t.status!=="closed")best=t.dueDate;(function w(a){a.forEach(s=>{if(!s.done&&s.dueDate&&(!best||s.dueDate<best))best=s.dueDate;w(s.children);});})(t.subtasks);return best;}
function activeEpic(){return state.epics.find(e=>e.id===activeEpicId);}
function epicById(id){return id?state.epics.find(e=>e.id===id):null;}
function tasksForEpic(id){return state.tasks.filter(t=>t.epicId===id);}
function epicLabel(e){return (e.code?e.code+" · ":"")+e.name;}
/* Rollup across an epic's demands: status mix, every object and transport it
   touches, and whether the whole epic has actually reached production. */
function epicRollup(e){
  const ts=tasksForEpic(e.id);
  const counts={};ts.forEach(t=>counts[t.status]=(counts[t.status]||0)+1);
  const objects=[],trs=[];
  ts.forEach(t=>{t.objects.forEach(o=>{if(o.name)objects.push({o,t});});
    t.transports.forEach(tr=>trs.push({tr,t}));});
  const pending=ts.map(t=>({t,g:golivePending(t)})).filter(x=>x.g);
  const overdue=ts.filter(t=>{const d=earliestOpenDue(t);return d&&daysUntil(d)<0;});
  const openTs=ts.filter(t=>!["delivered","closed"].includes(t.status));
  return {ts,counts,objects,trs,pending,overdue,openTs,
    done:ts.filter(t=>["delivered","closed"].includes(t.status)).length};
}
/* A dependency needs chasing when its expected date has passed, or nobody has
   checked in with that team for the epic's follow-up interval. */
function depFollowDue(e,x){
  if(x.done)return "";
  if(x.snoozeUntil&&x.snoozeUntil>todayStr())return "";
  if(x.expected&&daysUntil(x.expected)<0)return "expected date passed";
  const last=x.lastCheck||x.since;if(!last)return "";
  const n=-daysUntil(last);return n>=e.followDays?`no contact for ${n}d`:"";
}
function waveTarget(e,name){const w=name&&e.waves.find(x=>x.name===name);return w?w.target:"";}
function setWaveTarget(e,name,date){let w=e.waves.find(x=>x.name===name);if(!w){w={name,target:""};e.waves.push(w);}w.target=date;}
function meetingsForEpic(e){const ids=new Set(tasksForEpic(e.id).map(t=>t.id));return state.meetings.filter(m=>(m.epicIds||[]).includes(e.id)||m.taskIds.some(id=>ids.has(id)));}
function journalForEpic(e){const ids=new Set(tasksForEpic(e.id).map(t=>t.id));return state.journal.filter(j=>(j.epicIds||[]).includes(e.id)||(j.taskIds||[]).some(id=>ids.has(id)));}
function epicFollowUps(e){return e.deps.filter(x=>depFollowDue(e,x));}
/* "Parked" = other teams still owe something, and none of my demands are being worked. */
function epicParked(e,r){
  const open=e.deps.filter(x=>!x.done);if(!open.length)return null;
  r=r||epicRollup(e);
  const since=open.map(x=>x.since).filter(Boolean).sort()[0]||"";
  return{parked:!r.ts.some(t=>["open","progress","bug"].includes(t.status)),open:open.length,since,days:since?Math.max(0,-daysUntil(since)):null};
}
function waveOrder(ts){ /* waves in the order they were first received */
  const first={};ts.forEach(t=>{const w=t.wave||"";const d=t.receivedDate||"9999";if(!(w in first)||d<first[w])first[w]=d;});
  return Object.keys(first).sort((a,b)=>(a==="")-(b==="")||first[a].localeCompare(first[b])||a.localeCompare(b));
}
/* Everything that ever happened to an epic, oldest→newest: its own log, each demand's
   arrival / status changes / notes, transports reaching systems, linked meetings and
   journal entries, and when other teams started blocking or delivered. */
function epicStory(e){
  const ev=[],ts=tasksForEpic(e.id),dl=t=>(demandLabel(t))+(t.wave?" ["+t.wave+"]":"");
  e.log.forEach(x=>ev.push({date:x.date,src:"log",icon:EPIC_LOG[x.kind].icon,kind:x.kind,text:x.text,id:x.id,ord:0}));
  ts.forEach(t=>{
    if(t.receivedDate)ev.push({date:t.receivedDate,src:"demand",icon:"📥",text:`${dl(t)} received — ${t.title}`,tid:t.id,ord:1});
    (t.timeline||[]).forEach(x=>{
      if(x.type==="status"&&x.from){const to=STATUS[x.to]?STATUS[x.to].label:x.to;
        ev.push({date:isoTs(x.ts),src:"demand",icon:isChange(x)?"🔄":x.to==="bug"?"↻":"↪",text:isChange(x)?`${dl(t)} — requirement changed${x.note?": "+x.note:""} → ${to}`:`${dl(t)} → ${to}${x.to==="bug"?" (rework)":""}`,tid:t.id,ord:2});}
      else if(x.type==="note"&&x.note)ev.push({date:isoTs(x.ts),src:"demand",icon:"🗒",text:`${dl(t)}: ${x.note}`,tid:t.id,ord:2});});
    t.transports.forEach(tr=>tr.syncs.forEach(s=>{if(s.date&&s.system)ev.push({date:s.date,src:"transport",icon:"🚚",text:`${tr.number||"(TR)"} reached ${s.system}${isCust(tr)&&tr.client?"/"+tr.client:""} · ${dl(t)}`,tid:t.id,ord:3});}));
    (t.tocs||[]).forEach(c=>c.syncs.forEach(s=>{if(s.date&&s.system)ev.push({date:s.date,src:"transport",icon:"📦",text:`ToC ${c.number||"(unnamed)"} reached ${s.system} · ${dl(t)}`,tid:t.id,ord:3});}));
  });
  meetingsForEpic(e).forEach(m=>ev.push({date:m.date,src:"meeting",icon:"👥",text:`${m.title}${m.team?" · "+m.team:""}`,mid:m.id,ord:4}));
  journalForEpic(e).forEach(j=>ev.push({date:j.date,src:"meeting",icon:"📓",text:j.title||(j.body||"").replace(/\s+/g," ").slice(0,80)||"(journal entry)",jid:j.id,ord:4}));
  e.deps.forEach(x=>{const who=x.team||"another team";
    if(x.since)ev.push({date:x.since,src:"dep",icon:"⏸",text:`Started waiting on ${who}${x.what?": "+x.what:""}`,ord:5});
    if(x.done&&x.doneDate)ev.push({date:x.doneDate,src:"dep",icon:"▶",text:`${who} delivered${x.what?": "+x.what:""}`,ord:5});});
  return ev.sort((a,b)=>a.date.localeCompare(b.date)||a.ord-b.ord);
}
function monthsBetween(a,b){const x=new Date(a+"T00:00:00"),y=new Date(b+"T00:00:00");return (y.getFullYear()-x.getFullYear())*12+y.getMonth()-x.getMonth();}
function meetingsForTask(id){return state.meetings.filter(m=>m.taskIds.includes(id));}
function journalForTask(id){return state.journal.filter(j=>(j.taskIds||[]).includes(id));}
function debugForTask(id){return state.debug.filter(s=>s.taskId===id);}
function linkedCount(id){return meetingsForTask(id).length+journalForTask(id).length+debugForTask(id).length;}
function meetingOpenActions(m){return m.actions.filter(a=>!a.done).length;}
function distinctMeetingTeams(){return [...new Set(state.meetings.map(m=>m.team).filter(Boolean))].sort();}
function taskLabel(t){return (t.demandId?t.demandId+" · ":"")+t.title;}
/* how many demands use each ticket ID — a ticket split into several demands */
function demandIdCounts(){const c=demandIdCounts;
  if(!c.m||c.arr!==state.tasks||Date.now()-c.at>500){c.arr=state.tasks;c.at=Date.now();c.m=new Map();state.tasks.forEach(x=>{if(x.demandId)c.m.set(x.demandId,(c.m.get(x.demandId)||0)+1);});}
  return c.m;}
function demandIdsShared(){return new Set([...demandIdCounts()].filter(([,n])=>n>1).map(([k])=>k));}
const demandShort=s=>{s=String(s||"").trim();return s.length>26?s.slice(0,25).replace(/\s+\S*$/,"")+"…":s;};
/* a demand's short name: its ticket ID, plus the start of its title when other demands share that ID */
function demandLabel(t){if(!t)return "";if(!t.demandId)return t.title;return demandIdCounts().get(t.demandId)>1?t.demandId+" · "+demandShort(t.title):t.demandId;}

