/* ===================== IMAGES (screenshots folder) ===================== */
/* Images live as FILES in a folder you pick; the .json stores only records
   {file,label,expiry,links}. Nothing binary ever enters the data file. */
let imagesDir=null, imgDirSaved=null, imgUrlCache={};
const IMG_EXTS=/\.(png|jpe?g|gif|webp|bmp)$/i;
async function restoreImgDir(){
  if(!useIdb||!supportsFS)return;
  try{const h=await idbGet("imgdir");if(!h)return;imgDirSaved=h;
    let p="prompt";try{p=await h.queryPermission({mode:"readwrite"});}catch(e){}
    if(p==="granted")imagesDir=h;
  }catch(e){}
}
async function ensureImgDir(interactive){
  if(imagesDir)return imagesDir;
  if(imgDirSaved){try{
    let p=await imgDirSaved.queryPermission({mode:"readwrite"});
    if(p!=="granted"&&interactive&&imgDirSaved.requestPermission)p=await imgDirSaved.requestPermission({mode:"readwrite"});
    if(p==="granted"){imagesDir=imgDirSaved;return imagesDir;}
  }catch(e){}}
  if(interactive&&window.showDirectoryPicker){
    try{imagesDir=await showDirectoryPicker({mode:"readwrite"});imgDirSaved=imagesDir;
      if(useIdb)idbSet("imgdir",imagesDir).catch(()=>{});
      toast("Images folder connected");return imagesDir;
    }catch(e){if(e.name!=="AbortError")toast("Couldn't open folder: "+e.message,true);}
  }
  return null;
}
async function forgetImgDir(){imagesDir=null;imgDirSaved=null;if(useIdb)await idbDel("imgdir");Object.values(imgUrlCache).forEach(u=>URL.revokeObjectURL(u));imgUrlCache={};}
function imagesFor(kind,id){return state.images.filter(im=>im.links.some(l=>l.kind===kind&&l.id===id));}
function expiredImages(){const t=todayStr();return state.images.filter(im=>im.expiry&&im.expiry<t);}
function isExpired(im){return !!(im.expiry&&im.expiry<todayStr());}
async function imgUrl(im){
  if(imgUrlCache[im.file])return imgUrlCache[im.file];
  if(!imagesDir)return null;
  try{const fh=await imagesDir.getFileHandle(im.file);const f=await fh.getFile();const u=URL.createObjectURL(f);imgUrlCache[im.file]=u;return u;}
  catch(e){return null;}
}
function defaultImgExpiry(){const d=state.settings.imageExpiryDays;return d?dstr(new Date(Date.now()+d*86400000)):"";}
async function saveImageBlob(blob,kind,id){
  const dir=await ensureImgDir(true);
  if(!dir){toast("Connect an images folder first (⋯ menu → Images)",true);return null;}
  const d=new Date(),p=n=>String(n).padStart(2,"0");
  const base=`dd-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  let name=base+".png";
  try{
    /* two pastes inside the same second must not overwrite each other's file */
    for(let n=2;;n++){try{await dir.getFileHandle(name);}catch(e){break;}name=`${base}-${n}.png`;}
    const fh=await dir.getFileHandle(name,{create:true});const w=await fh.createWritable();await w.write(blob);await w.close();
    const im=normImage({file:name,label:"",expiry:defaultImgExpiry(),links:kind?[{kind,id}]:[]});
    state.images.push(im);markDirty();
    toast("📷 Saved "+name+(im.expiry?" · expires "+im.expiry:""));
    return im;
  }catch(e){toast("Image save failed: "+e.message,true);return null;}
}
function pasteTarget(){
  if(view==="demands"&&activeTask())return{kind:"demand",id:activeTask().id};
  if(view==="meetings"&&!meetingRollup&&activeMeeting())return{kind:"meeting",id:activeMeeting().id};
  if(view==="journal"&&!journalTodos&&activeJournal())return{kind:"journal",id:activeJournal().id};
  if(view==="playbook"&&activePlay())return{kind:"playbook",id:activePlay().id};
  return null;
}
document.addEventListener("paste",async e=>{
  if(screenLocked||pendingEncrypted)return;
  const items=[...(e.clipboardData&&e.clipboardData.items||[])];
  const it=items.find(x=>x.type&&x.type.startsWith("image/"));
  if(!it)return;
  e.preventDefault();
  const tgt=pasteTarget();
  if(!tgt){toast("Open a demand, meeting or journal entry, then paste to attach the image",true);return;}
  const blob=it.getAsFile();if(!blob)return;
  const im=await saveImageBlob(blob,tgt.kind,tgt.id);
  if(im){if(tgt.kind==="demand")activeTab="images";renderApp();}
});
function renderImagesSection(host,kind,id){
  const list=imagesFor(kind,id);
  const days=state.settings.imageExpiryDays;
  host.innerHTML=`<div class="sec-title"><h3>📷 Images / screenshots</h3><div class="ln"></div>
      ${imagesDir?`<span class="faint" style="font-size:11px">🖼 folder connected</span>`:`<button class="sm" id="img-conn">🖼 Connect images folder</button>`}
      <button class="sm" id="img-add">＋ From folder</button></div>
    <p class="faint" style="font-size:12px;margin-top:-6px">Snip with <b>Win+Shift+S</b>, then press <b>Ctrl+V</b> here — the image is saved into your folder and attached. ${days?`Expiry defaults to <b>${days} days</b>; expired images appear on Today for cleanup.`:"No default expiry set."}</p>
    <div class="imgrid" id="imgGrid"></div>`;
  const conn=host.querySelector("#img-conn");
  if(conn)conn.onclick=async()=>{if(await ensureImgDir(true))renderImagesSection(host,kind,id);};
  host.querySelector("#img-add").onclick=()=>openImgFolderPicker(kind,id,()=>renderImagesSection(host,kind,id));
  const grid=host.querySelector("#imgGrid");
  if(!list.length){grid.innerHTML=`<div class="faint" style="font-size:12px;grid-column:1/-1">No images attached.</div>`;return;}
  grid.innerHTML=list.map(im=>`<div class="imgcard ${isExpired(im)?"expired":""}" data-id="${im.id}">
      ${imagesDir?`<img class="thumb" alt="">`:`<div class="nothumb">connect the folder<br>to preview</div>`}
      <div class="im-file" title="${esc(im.file)}">${esc(im.file)} ${isExpired(im)?'<span class="expbadge">EXPIRED</span>':""}</div>
      <input class="im-label" value="${esc(im.label)}" placeholder="What is this? (label)">
      <div class="im-exp">⏳ expires <input type="date" class="im-expiry" value="${im.expiry||""}"></div>
      <div class="im-acts"><button class="ghost sm im-view" title="View full size">👁</button><button class="ghost sm im-unlink" title="Unlink from here (keeps the file)">⛓</button><button class="ghost sm danger im-del" title="Delete file from disk">🗑</button></div>
    </div>`).join("");
  grid.querySelectorAll(".imgcard").forEach(card=>{
    const im=state.images.find(x=>x.id===card.dataset.id);
    const th=card.querySelector(".thumb");
    if(th)imgUrl(im).then(u=>{if(u)th.src=u;else{th.outerHTML=`<div class="nothumb">file not found in folder:<br>${esc(im.file)}</div>`;}});
    if(th)th.onclick=()=>openImageLightbox(im);
    card.querySelector(".im-view").onclick=()=>openImageLightbox(im);
    card.querySelector(".im-label").onchange=e=>{im.label=e.target.value;markDirty();};
    card.querySelector(".im-expiry").onchange=e=>{im.expiry=e.target.value;markDirty();renderImagesSection(host,kind,id);};
    card.querySelector(".im-unlink").onclick=()=>{im.links=im.links.filter(l=>!(l.kind===kind&&l.id===id));markDirty();renderImagesSection(host,kind,id);};
    card.querySelector(".im-del").onclick=async()=>{
      if(!await askOk(im.file+" is deleted from your images folder, and its record goes too. This can't be undone.",{title:"Delete this image?",ok:"Delete",danger:true}))return;
      const dir=await ensureImgDir(true);
      if(dir){try{await dir.removeEntry(im.file);}catch(e){/* already gone is fine */}}
      if(imgUrlCache[im.file]){URL.revokeObjectURL(imgUrlCache[im.file]);delete imgUrlCache[im.file];}
      state.images=state.images.filter(x=>x.id!==im.id);markDirty();renderImagesSection(host,kind,id);
      if(view==="today")renderApp();
    };
  });
}
async function openImageLightbox(im){
  const u=await imgUrl(im);
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="lightbox" id="lb">
      ${u?`<img src="${u}" alt="">`:`<div class="lb-meta">Can't preview — connect the images folder (⋯ menu) or the file is missing: ${esc(im.file)}</div>`}
      <div class="lb-meta">${esc(im.label||im.file)}${im.expiry?` · ⏳ ${im.expiry}${isExpired(im)?' <span class="expbadge">EXPIRED</span>':""}`:""} · click anywhere to close</div>
    </div>`;
  root.querySelector("#lb").onclick=()=>root.innerHTML="";
}
async function openImgFolderPicker(kind,id,cb){
  const dir=await ensureImgDir(true);
  if(!dir){toast("Connect an images folder first",true);return;}
  const files=[];
  try{for await(const entry of dir.values()){if(entry.kind==="file"&&IMG_EXTS.test(entry.name))files.push(entry.name);}}
  catch(e){toast("Couldn't read folder: "+e.message,true);return;}
  files.sort().reverse();
  const root=document.getElementById("modalRoot");
  root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:520px"><h2>📷 Attach images from folder</h2>
    <p class="faint" style="font-size:12px;margin-top:-8px">Every image file in the connected folder. Tick to attach here; files not yet known to Demand Desk get a record automatically.</p>
    ${files.length?`<div class="picklist">${files.map(f=>{
      const rec=state.images.find(x=>x.file===f);
      const linked=rec&&rec.links.some(l=>l.kind===kind&&l.id===id);
      return `<label class="pickrow"><input type="checkbox" data-f="${esc(f)}" ${linked?"checked":""} style="width:auto"><div><div class="mono" style="font-size:12px">${esc(f)}</div><div class="faint" style="font-size:11px">${rec?(rec.label||"registered")+(rec.expiry?" · exp "+rec.expiry:""):"not registered yet"}</div></div></label>`;}).join("")}</div>`
    :`<p class="faint">No image files in the folder yet.</p>`}
    <div class="modal-foot"><button id="m-close" class="primary">Done</button></div></div></div>`;
  const close=()=>{root.innerHTML="";cb&&cb();};
  root.querySelectorAll("input[data-f]").forEach(cbx=>cbx.onchange=()=>{
    const f=cbx.dataset.f;
    let rec=state.images.find(x=>x.file===f);
    if(cbx.checked){
      if(!rec){rec=normImage({file:f,expiry:defaultImgExpiry()});state.images.push(rec);}
      if(!rec.links.some(l=>l.kind===kind&&l.id===id))rec.links.push({kind,id});
    }else if(rec){rec.links=rec.links.filter(l=>!(l.kind===kind&&l.id===id));}
    markDirty();
  });
  root.querySelector("#m-close").onclick=close;
  root.querySelector(".modal-bg").onclick=e=>{if(e.target===root.querySelector(".modal-bg"))close();};
}
function gotoImage(im){
  const l=im.links[0];
  if(!l){view="demands";renderApp();return;}
  if(l.kind==="demand"){view="demands";activeId=l.id;activeTab="images";}
  else if(l.kind==="meeting"){view="meetings";meetingRollup=false;activeMeetingId=l.id;}
  else if(l.kind==="playbook"){view="playbook";activePlayId=l.id;}
  else{view="journal";journalTodos=false;activeJournalId=l.id;}
  renderApp();
}

