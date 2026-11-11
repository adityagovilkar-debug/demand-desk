/* ===================== VAULT (system credentials) ===================== */
function renderVault(){
  const enc=state.settings.encryption;
  document.getElementById("side").innerHTML=`
    <div class="side-tools">
      <button class="primary" id="btnNewCred" style="width:100%">＋ Add credential</button>
      <div class="${enc?"":"warn"}" style="font-size:12px;border-radius:8px;padding:9px 11px;border:1px solid ${enc?"var(--line2)":"var(--red)"};background:${enc?"var(--panel)":"var(--danger-bg)"}">
        ${enc?`🔒 <b>Encrypted at rest.</b><br>This file is protected by your master password.`:`⚠ <b>Not encrypted.</b><br>Passwords are stored in plain text. Set a master password before saving real credentials.`}
        <button class="sm" id="btnEnc" style="margin-top:8px;width:100%">${enc?"Change / remove master password":"🔒 Set master password"}</button>
      </div>
      <p class="faint" style="font-size:11px">Store user IDs &amp; passwords for the H-systems here. Even encrypted, anything you reveal on screen is visible while the app is open — lock your laptop.</p>
    </div>
    <div class="listwrap"><p class="faint" style="font-size:12px;padding:6px">${state.credentials.length} credential(s). Edit them in the table on the right.</p></div>`;
  document.getElementById("btnNewCred").onclick=()=>{state.credentials.push({id:uid(),system:state.settings.defaultSystem,client:"",label:"",url:"",username:"",password:"",notes:"",updatedAt:Date.now()});markDirty();renderVault();};
  document.getElementById("btnEnc").onclick=openEncryptionDialog;
  renderVaultTable();
}
function credLandscape(sys){return sys?String(sys).slice(0,-1):"";}
function renderVaultTable(){
  const host=document.getElementById("detail");
  host.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1"><h1>🔒 System Credentials Vault</h1>
    <div class="dh-dates"><span>${state.settings.encryption?"Encrypted with master password":"⚠ Unencrypted — set a master password"}</span><span>Grouped by landscape</span></div></div></div>
    <div class="tabs"><button class="tab active">Credentials</button></div></div>
    <div class="detail-body" id="vaultBody"></div>`;
  drawVault();
}
function credRow(c){const rv=revealPw[c.id];
  return `<tr data-id="${c.id}">
    <td><select class="c-sys">${systemOptions(c.system)}</select></td>
    <td><select class="c-cli" title="Client / mandant">${clientOptions(c.system,c.client)}</select></td>
    <td><input class="c-label" value="${esc(c.label)}" placeholder="e.g. SAP GUI"></td>
    <td><input class="mono c-user" value="${esc(c.username)}" placeholder="user id"></td>
    <td><div style="display:flex;gap:3px;align-items:center"><input class="mono c-pass" type="${rv?"text":"password"}" value="${esc(c.password)}" style="flex:1"><button class="ghost sm c-eye" title="Show/hide">${rv?"🙈":"👁"}</button><button class="ghost sm c-copy" title="Copy">📋</button></div></td>
    <td><input class="c-url" value="${esc(c.url)}" placeholder="https://"></td>
    <td><input class="c-notes" value="${esc(c.notes)}"></td>
    <td><button class="ghost sm danger c-del">🗑</button></td></tr>`;
}
function wireCredRow(tr){const c=state.credentials.find(x=>x.id===tr.dataset.id);if(!c)return;
  tr.querySelector(".c-sys").onchange=e=>{c.system=e.target.value;if(c.client&&!clientsForSystem(c.system).includes(c.client))c.client="";c.updatedAt=Date.now();markDirty();drawVault();};
  const cliEl=tr.querySelector(".c-cli");if(cliEl)cliEl.onchange=e=>{c.client=e.target.value;c.updatedAt=Date.now();markDirty();};
  const bind=(sel,key)=>{const el=tr.querySelector(sel);if(el)el.onchange=e=>{c[key]=e.target.value;c.updatedAt=Date.now();markDirty();};};
  bind(".c-label","label");bind(".c-user","username");bind(".c-pass","password");bind(".c-url","url");bind(".c-notes","notes");
  tr.querySelector(".c-eye").onclick=()=>{revealPw[c.id]=!revealPw[c.id];drawVault();};
  tr.querySelector(".c-copy").onclick=()=>{navigator.clipboard.writeText(c.password).then(()=>toast("Password copied")).catch(()=>toast("Copy failed",true));};
  tr.querySelector(".c-del").onclick=()=>deleteWithUndo("Deleted the login",()=>{state.credentials=state.credentials.filter(x=>x.id!==c.id);delete revealPw[c.id];});
}
function drawVault(){
  const body=document.getElementById("vaultBody");if(!body)return;
  const note=`<p class="faint" style="font-size:12px;margin-top:6px">2FA protects the login, but treat this file like a password manager export: keep encryption on and the file on your own drive.</p>`;
  if(!state.credentials.length){body.innerHTML=`<div class="faint" style="padding:16px;text-align:center">No credentials yet. Use “＋ Add credential”.</div>${note}`;return;}
  const groups={};state.credentials.forEach(c=>{const L=credLandscape(c.system)||"—";(groups[L]=groups[L]||[]).push(c);});
  const extra=Object.keys(groups).filter(k=>k!=="—"&&!state.settings.landscapes.includes(k)).sort();
  const order=[...state.settings.landscapes,...extra,"—"];
  const seen=new Set();let html="";
  const thead=`<thead><tr><th style="width:130px">System</th><th style="width:96px">Client</th><th>Label</th><th>Username</th><th style="width:200px">Password</th><th>URL</th><th>Notes</th><th style="width:34px"></th></tr></thead>`;
  order.forEach(L=>{if(seen.has(L))return;seen.add(L);const list=groups[L];if(!list||!list.length)return;
    list.sort((a,b)=>(a.system||"").localeCompare(b.system||"")||(a.client||"").localeCompare(b.client||"")||(a.label||"").localeCompare(b.label||""));
    const lbl=L==="—"?"Unassigned":("Landscape "+esc(L));
    html+=`<div class="sec-title" style="margin-top:6px"><h3>${lbl}</h3><div class="ln"></div><span class="faint" style="font-size:12px">${list.length} credential(s)</span></div>`;
    html+=`<div class="tbl-wrap"><table>${thead}<tbody>${list.map(credRow).join("")}</tbody></table></div>`;
  });
  body.innerHTML=html+note;
  body.querySelectorAll("tr[data-id]").forEach(wireCredRow);
}
async function openEncryptionDialog(){
  if(!state.settings.encryption){
    const pw=await promptPassword("🔒 Set master password (encrypts the whole file)",true);
    if(pw===null)return;
    state.settings.encryption=true;masterPassword=pw;markDirty();
    recryptSnapshots(null,pw); /* no plaintext snapshots left behind */
    toast("Encryption on — Save to write the encrypted file");renderApp();
    return;
  }
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:400px"><h2>🔒 Master password</h2>
    <p class="faint" style="font-size:12px">The file is currently encrypted. Lose this password and the data is unrecoverable — there is no backdoor.</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      <button id="e-change">Change master password</button>
      <button id="e-remove" class="danger">Remove encryption (store as plain text)</button>
      <button id="e-close" class="primary">Cancel</button></div></div></div>`;
  const close=()=>root.innerHTML="";
  root.querySelector("#e-close").onclick=close;
  root.querySelector("#e-change").onclick=async()=>{close();const pw=await promptPassword("New master password",true);if(pw===null)return;const old=masterPassword;masterPassword=pw;recryptSnapshots(old,pw);markDirty();toast("Password changed — Save to apply");};
  root.querySelector("#e-remove").onclick=async()=>{if(await askOk("The file will be saved as plain text, including any stored passwords.",{title:"Remove encryption?",ok:"Remove encryption",danger:true})){const old=masterPassword;state.settings.encryption=false;masterPassword=null;recryptSnapshots(old,null);markDirty();close();toast("Encryption removed — Save to write plain text");renderApp();}};
}

