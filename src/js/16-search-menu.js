/* ===================== GLOBAL SEARCH ===================== */
/* search lives with the old-notes module below (searchAll / runGlobalSearch / the Search page) */
/* ===================== MENU ===================== */
function openMenu(){
  const root=document.getElementById("modalRoot");
  const tp=currentTheme(),mp=motionPref();
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:520px"><h2>Settings · Data &amp; backup</h2>
    <div style="margin:0 0 12px;padding:10px 12px;border:1px solid var(--line2);border-radius:8px">
      <label>Appearance</label>
      <div style="display:grid;grid-template-columns:62px 1fr;gap:6px 10px;align-items:center;font-size:12px">
        <span class="faint">Bench</span><div style="display:flex;gap:5px;flex-wrap:wrap">${[["bench","Follow Windows"],["bench-paper","Paper"],["bench-backlit","Backlit"]].map(([k,l])=>`<button class="sm tpc ${tp===k?"primary":""}" data-t="${k}">${l}</button>`).join("")}</div>
        <span class="faint">Motion</span><div style="display:flex;gap:5px;flex-wrap:wrap">${[["auto","Follow Windows"],["full","Calm"],["show","Full"],["off","Off"]].map(([k,l])=>`<button class="sm mpc ${mp===k?"primary":""}" data-m="${k}">${l}</button>`).join("")}</div>
        <span class="faint">Greeting</span><input id="mn-name" value="${esc(viewPref("userName",""))}" placeholder="Your first name, for the Today greeting (optional)" style="font-size:12px;padding:4px 8px">
      </div>
      <p class="faint" style="font-size:11px;margin:8px 0 0">The ☀/🌙 button in the title bar flips Paper ↔ Backlit. Theme and motion are remembered in this browser only — never in your data file.</p>
    </div>
    <div class="grid2">
      <div class="field"><label>Landscapes (comma separated)</label><input id="m-land" class="mono" value="${esc(state.settings.landscapes.join(", "))}"></div>
      <div class="field"><label>Default origin system</label><select id="m-defsys">${systemOptions(state.settings.defaultSystem)}</select></div>
    </div>
    <p class="faint" style="font-size:12px;margin-top:-4px">Tiers are fixed: <b>x3</b>=Development, <b>x2</b>=Pre-prod/QA, <b>x1</b>=Production. Editing landscapes regenerates the system list (e.g. H0…H6 → H03/H02/H01 …).</p>
    <details style="margin:8px 0;border:1px solid var(--line2);border-radius:8px;padding:8px 11px">
      <summary style="cursor:pointer;font-size:13px">🗂 Clients (mandants) per landscape <span class="faint" style="font-size:11px">— used by customizing transports</span></summary>
      <p class="faint" style="font-size:11px;margin:8px 0">Comma-separated client numbers for each landscape line. Only <b>Customizing</b> transports use these; Workbench transports stay client-independent.</p>
      <div id="mn-clients"></div>
    </details>
    <div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:9px 11px;border:1px solid var(--line2);border-radius:8px">
      <span style="flex:1;font-size:13px">${state.settings.encryption?"🔒 <b>File encryption: ON</b>":"🔓 File encryption: off"}</span>
      <button class="sm" id="mn-enc">${state.settings.encryption?"Change / remove":"🔒 Set master password"}</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:9px 11px;border:1px solid var(--line2);border-radius:8px">
      <span style="flex:1;font-size:13px">💾 Auto-save <span class="faint" style="font-size:11px">(writes to the connected file ~30&nbsp;s after a change)</span></span>
      <input type="checkbox" id="mn-autosave" ${state.settings.autosave?"checked":""} style="width:auto">
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin:8px 0;padding:9px 11px;border:1px solid var(--line2);border-radius:8px;flex-wrap:wrap">
      <span style="flex:1;font-size:13px">📁 Old notes (.txt): <b>${NOTES.length?NOTES.length+" notes"+(notesDir?"":" · reconnect to pick up changes"):"not connected"}</b></span>
      <button class="sm" id="mn-notes">${NOTES.length?"Manage…":"Connect…"}</button></div>
    <div style="display:flex;align-items:center;gap:8px;margin:8px 0;padding:9px 11px;border:1px solid var(--line2);border-radius:8px;flex-wrap:wrap">
      <span style="flex:1;font-size:13px">📷 Images folder: <b>${imagesDir?"connected":(imgDirSaved?"remembered (click to re-allow)":"not set")}</b></span>
      <button class="sm" id="mn-imgdir">${imagesDir?"Change…":"🖼 Connect…"}</button>
      ${imgDirSaved?`<button class="sm" id="mn-imgforget">Forget</button>`:""}
      <span style="flex-basis:100%;font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px">Default expiry
        <input type="number" id="mn-imgexp" min="0" max="3650" value="${state.settings.imageExpiryDays}" style="width:70px;padding:3px 6px"> days (0 = never) — expired images surface on Today</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:9px 11px;border:1px solid var(--line2);border-radius:8px">
      <span style="flex:1;font-size:13px">⏱ Working day <span class="faint" style="font-size:11px">— a full day of logged hours (day bars, week sheet, wrap-up)</span></span>
      <canvas id="mn-dayk" title="Drag up or down, scroll, or use the arrow keys — 4 to 12 hours" style="width:92px;height:80px;flex:none"></canvas></div>
    <div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:9px 11px;border:1px solid var(--line2);border-radius:8px">
      <span style="flex:1;font-size:13px">⇢ Unreleased transports <span class="faint" style="font-size:11px">— after this many days, one that isn't released comes up on Today</span></span>
      <input type="number" id="mn-unrel" min="1" max="60" value="${state.settings.unreleasedDays||5}" style="width:64px;padding:3px 6px"><span class="faint" style="font-size:12px">days</span></div>
    <div style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:9px 11px;border:1px solid var(--line2);border-radius:8px">
      <span style="flex:1;font-size:13px">🧩 Object types <span class="faint" style="font-size:11px">(${objTypes().length} in the Objects-tab dropdown)</span></span>
      <button class="sm" id="mn-objtypes">Edit…</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
      <button id="mn-keys">⌨ Keyboard shortcuts (?)</button>
      <button id="mn-week">🗓 Weekly summary…</button>
      <button id="mn-hand">🧳 Handover pack…</button>
      <button id="mn-rc">📚 A readable copy, by year…</button>
      <button id="mn-csv">⬇ Export transports (CSV for Excel)</button>
      <button id="mn-export">⬇ Export / download a copy (.json)</button>
      <button id="mn-import">⬆ Import / open a .json file</button>
      <button id="mn-snaps">↺ Restore a daily snapshot…</button>
      <button id="mn-restore">↺ Restore from local auto-backup</button>
      ${savedHandle?`<button id="mn-forget">🔌 Forget remembered file (${esc(savedHandle.name||"file")})</button>`:""}
    </div>
    <p class="faint" style="font-size:12px;margin-top:14px">Local backup: <b>${useIdb?"IndexedDB":"browser storage"}</b>${useIdb?" (large + remembers your file)":""}. Up to 14 daily snapshots are kept for rollback. The portable copy of record is the <b>.json file</b> you Save — keep it on your own drive/OneDrive.${supportsFS?"":"<br><b>Note:</b> this browser lacks the File System API, so Save/Open use download/upload."}</p>
    <div class="modal-foot"><button id="mn-close" class="primary">Done</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  const drawClients=()=>{const host=root.querySelector("#mn-clients");if(!host)return;
    host.innerHTML=state.settings.landscapes.map(L=>`<div style="display:flex;gap:8px;align-items:center;margin-bottom:5px"><span class="mono" style="flex:0 0 46px;color:var(--muted)">${esc(L)}x</span><input class="cl-inp" data-l="${esc(L)}" value="${esc((state.settings.clients[L]||[]).join(", "))}" placeholder="e.g. 030, 040, 150, 190"></div>`).join("");
    host.querySelectorAll(".cl-inp").forEach(inp=>inp.onchange=e=>{const arr=e.target.value.split(",").map(s=>s.trim()).filter(Boolean);if(arr.length)state.settings.clients[e.target.dataset.l]=arr;else delete state.settings.clients[e.target.dataset.l];markDirty();});};
  drawClients();
  root.querySelector("#m-land").onchange=e=>{const arr=e.target.value.split(",").map(s=>s.trim()).filter(Boolean);if(arr.length){state.settings.landscapes=arr;markDirty();drawClients();}};
  root.querySelector("#m-defsys").onchange=e=>{state.settings.defaultSystem=e.target.value||"H03";markDirty();};
  root.querySelector("#mn-enc").onclick=()=>{close();openEncryptionDialog();};
  root.querySelector("#mn-autosave").onchange=e=>{state.settings.autosave=e.target.checked;markDirty();};
  root.querySelector("#mn-notes").onclick=()=>{close();openSearch("");};
  root.querySelector("#mn-imgdir").onclick=async()=>{imagesDir=null;imgDirSaved=null;if(await ensureImgDir(true)){close();openMenu();}};
  const mif=root.querySelector("#mn-imgforget");if(mif)mif.onclick=async()=>{await forgetImgDir();toast("Images folder forgotten (files untouched)");close();openMenu();};
  {const cv=root.querySelector("#mn-dayk"),lo=4,hi=12,get=()=>(Math.min(hi,Math.max(lo,state.settings.dayHours))-lo)/(hi-lo);let tmr=0;
   DK.scope(cv,(c,w,h)=>{const C=efC(cv);V2.dotKnob(c,C,w/2,h/2+4,34,get(),C["pen-2"],{value:efFh(state.settings.dayHours),name:"hours"});});
   V2.bindKnob(cv,get,f=>{const v=Math.round((lo+f*(hi-lo))*4)/4;if(v===state.settings.dayHours)return;state.settings.dayHours=v;clearTimeout(tmr);tmr=setTimeout(()=>{markDirty();renderApp();},400);},.25/(hi-lo));}
  root.querySelector("#mn-unrel").onchange=e=>{state.settings.unreleasedDays=Math.min(60,Math.max(1,parseInt(e.target.value||"5",10)||5));e.target.value=state.settings.unreleasedDays;markDirty();};
  root.querySelector("#mn-imgexp").onchange=e=>{const n=Math.max(0,parseInt(e.target.value||"0",10)||0);state.settings.imageExpiryDays=n;markDirty();};
  root.querySelector("#mn-objtypes").onclick=()=>{close();openObjTypes(()=>renderApp());};
  root.querySelector("#mn-week").onclick=()=>{close();openWeekly();};
  root.querySelector("#mn-keys").onclick=()=>{close();openKeys();};
  root.querySelector("#mn-hand").onclick=()=>{close();openHandover();};
  root.querySelector("#mn-rc").onclick=()=>{close();openReadableCopy();};
  root.querySelector("#mn-csv").onclick=exportTransportsCSV;
  root.querySelector("#mn-export").onclick=exportDownload;
  root.querySelector("#mn-import").onclick=()=>{close();importViaInput();};
  root.querySelector("#mn-snaps").onclick=()=>{close();openSnapshots();};
  root.querySelector("#mn-restore").onclick=async()=>{const r=await loadBackup();if(r==="encrypted"){close();await unlockStartup();if(!pendingEncrypted){dirty=true;renderSaveState();}}else if(r){resetActive();dirty=true;close();renderApp();toast("Restored from local backup — Ctrl+S to write it to your file");}else toast("No local backup found",true);};
  const mf=root.querySelector("#mn-forget");if(mf)mf.onclick=async()=>{await forgetHandle();toast("Forgot the remembered file");close();};
  root.querySelectorAll(".tpc").forEach(b=>b.onclick=()=>{setTheme(b.dataset.t);root.querySelectorAll(".tpc").forEach(x=>x.classList.toggle("primary",x===b));});
  root.querySelectorAll(".mpc").forEach(b=>b.onclick=()=>{try{localStorage.setItem(MOTION_KEY,b.dataset.m);}catch(e){}applyMotion();renderApp();root.querySelectorAll(".mpc").forEach(x=>x.classList.toggle("primary",x===b));});
  root.querySelector("#mn-name").oninput=e=>{setViewPref("userName",e.target.value.trim());};
  root.querySelector("#mn-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
}
async function openSnapshots(){
  const root=document.getElementById("modalRoot");
  let arr=await getSnapshots();
  arr=arr.slice().reverse();
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:420px"><h2>↺ Daily snapshots</h2>
    ${arr.length?`<div class="picklist">${arr.map((s,i)=>`<div class="pickrow" data-i="${i}"><div><div>${s.date} ${s.enc?"🔒":""}</div><div class="faint" style="font-size:11px">${fmtTs(s.ts)}</div></div></div>`).join("")}</div>`:`<p class="faint">No snapshots yet — they're created when you Save.</p>`}
    <div class="modal-foot"><button id="s-close" class="primary">Close</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector("#s-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
  root.querySelectorAll(".pickrow[data-i]").forEach(el=>el.onclick=async()=>{const s=arr[+el.dataset.i];
    if(!await askOk("Changes not yet in your file are replaced.",{title:"Restore the snapshot from "+s.date+"?",ok:"Restore"}))return;
    try{if(await loadFromText(s.data,"snapshot "+s.date)){resetActive();dirty=true;close();renderApp();toast("Restored snapshot "+s.date+" — Ctrl+S to write it to your file");}}
    catch(e){toast("Snapshot is unreadable: "+e.message,true);}});
}

