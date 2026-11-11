/* ===================== LINE ICONS =====================
   The app used several hundred emoji as icons; in the Instrument look they were the odd
   ones out. Each emoji the app uses has a line icon here, drawn like the side rail's (18×18,
   1.4 stroke, round ends, current text colour), and is swapped in as the page renders —
   buttons, headings, cards, dialogs, toasts. Form fields, dropdown options and tooltips keep
   the character (they can't hold a drawing). Typographic marks (✓ ✕ ✎ ★) stay as they are. */
const IC_CIRC=(x,y,r)=>`M${x+r} ${y}a${r} ${r} 0 1 1-${2*r} 0a${r} ${r} 0 1 1 ${2*r} 0z`;
const IC_PATHS={
  trash:"M3.5 5h11M7.2 5V3.3h3.6V5M5 5l.7 10.2h6.6L13 5M7.6 7.8v4.6M10.4 7.8v4.6",
  timer:IC_CIRC(9,10,5.8)+"M9 7v3.2l2.2 1.4M7.3 2.5h3.4M9 2.5v1.7",
  clipboard:"M6 3.5H4.5v12h9v-12H12M6.5 2.5h5v2.2h-5zM6.5 8h5M6.5 10.5h5M6.5 13h3",
  people:IC_CIRC(6.5,7,2.3)+IC_CIRC(12.5,7.5,1.8)+"M2.5 15c.6-2.4 2.2-3.6 4-3.6s3.4 1.2 4 3.6M11 11.8c1.6-.3 3.4.6 4.4 3.2",
  lock:"M3.5 7.5h11v8h-11zM6 7.5V5.5a3 3 0 0 1 6 0v2M9 11v1.5",
  unlock:"M3.5 7.5h11v8h-11zM6 7.5V5.5a3 3 0 0 1 5.8-1M9 11v1.5",
  link:"M7.6 10.4l2.8-2.8M8.4 5.6l1.1-1.1a2.6 2.6 0 0 1 3.7 3.7l-1.1 1.1M9.6 12.4l-1.1 1.1a2.6 2.6 0 0 1-3.7-3.7l1.1-1.1",
  bulb:"M6.6 12.5h4.8M7.2 15h3.6M6.6 12.5c0-1.6-2.1-2.6-2.1-5a4.5 4.5 0 0 1 9 0c0 2.4-2.1 3.4-2.1 5",
  hourglass:"M5 2.5h8M5 15.5h8M6 2.5c0 3.3 3 4.2 3 6.5s-3 3.2-3 6.5M12 2.5c0 3.3-3 4.2-3 6.5s3 3.2 3 6.5",
  alarm:IC_CIRC(9,10,5.5)+"M9 7.3V10l1.8 1.2M3 4.5l2-2M15 4.5l-2-2",
  phone:"M5.2 2.8l2 .3.9 3-1.6 1.2a8.5 8.5 0 0 0 4.2 4.2l1.2-1.6 3 .9.3 2-1.6 1.7C8.6 14.5 3.5 9.4 3.5 4.4z",
  pause:"M6.5 4v10M11.5 4v10",
  builder:"M4.5 8.5h9M6 8.5a3 3 0 0 1 6 0M11.3 10.2a2.4 2.4 0 0 1-4.6 0M3.5 16c.6-2.3 2.9-3.5 5.5-3.5s4.9 1.2 5.5 3.5M9 5.5v-1",
  umbrella:"M2.5 9a6.5 6.5 0 0 1 13 0zM9 9v5.5a1.5 1.5 0 0 1-3 0",
  folders:"M2.5 6h4l1.2 1.4h7.8V15h-13zM4.5 3.5h4l1.2 1.4h5.8V6",
  notebook:"M4.5 2.5h9v13h-9zM6.8 2.5v13M9 6h2.5M9 8.5h2.5",
  bug:"M6 7h6v4.5a3 3 0 0 1-6 0zM9 7v7.5M6 9.5H3.5M14.5 9.5H12M6.2 12.5l-2.2 1.6M11.8 12.5l2.2 1.6M7 7l-.9-2.2M11 7l.9-2.2",
  snow:"M9 2v14M3 5.5l12 7M3 12.5l12-7M7.4 2.9L9 4.3l1.6-1.4M7.4 15.1L9 13.7l1.6 1.4",
  refresh:"M14 8a5 5 0 0 0-9.2-2.2M4 10a5 5 0 0 0 9.2 2.2M4.5 3v3h3M13.5 15v-3h-3",
  repeat:"M3.5 8V7a2 2 0 0 1 2-2h9M12.5 3l2 2-2 2M14.5 10v1a2 2 0 0 1-2 2h-9M5.5 15l-2-2 2-2",
  trophy:"M5.5 2.5h7v4.2a3.5 3.5 0 0 1-7 0zM5.5 4H3v1.2A2.6 2.6 0 0 0 5.7 7.8M12.5 4H15v1.2a2.6 2.6 0 0 1-2.7 2.6M9 10.2v2.8M6.5 15.5h5M7.5 13h3",
  gear:IC_CIRC(9,9,2.3)+"M9 2v2M9 14v2M2 9h2M14 9h2M4 4l1.4 1.4M12.6 12.6L14 14M4 14l1.4-1.4M12.6 5.4L14 4",
  calendar:"M2.5 3.5h13v12h-13zM2.5 7h13M6 2v3M12 2v3M5.5 10h1M8.5 10h1M11.5 10h1M5.5 12.5h1M8.5 12.5h1",
  pin:"M9 16v-5M5.5 11h7M6.5 11l.5-6.5h4l.5 6.5M6 2.5h6",
  printer:"M5 7V2.5h8V7M5 13H3V7h12v6h-2M5 10.5h8v5H5z",
  camera:"M2.5 5.5h3l1.2-2h4.6l1.2 2h3V15h-13z"+IC_CIRC(9,10,2.6),
  picture:"M2.5 3.5h13v11h-13zM2.5 12l4-3.5 3 2.5 2.5-2 3.5 3M11.6 6.5v.1",
  disk:"M3 3h9.5L15 5.5V15H3zM6 3v4h6V3M5.5 15v-4.5h7V15",
  note:"M4 2.5h7l3 3v10H4zM11 2.5v3h3M6.5 9h5M6.5 11.5h5M6.5 14h3",
  pencil:"M3 15l1-3.5L12.5 3 15 5.5 6.5 14zM10.8 4.7l2.5 2.5",
  truck:"M1.5 4.5h9.5v8h-9.5zM11 7.5h3l2.5 2.8v2.2H11"+IC_CIRC(4.5,13.8,1.4)+IC_CIRC(13.5,13.8,1.4),
  doc:"M4 2.5h7l3 3v10H4zM11 2.5v3h3",
  folder:"M2 4.5h5l1.5 1.8H16V15H2z",
  plug:"M6.5 2.5v3.5M11.5 2.5v3.5M4.5 6h9v2.5a4.5 4.5 0 0 1-9 0zM9 13v3",
  target:IC_CIRC(9,9,6)+IC_CIRC(9,9,2.6)+"M9 9v.1",
  chat:"M2.5 3.5h13V12H8l-3.5 3v-3h-2z",
  eye:"M1.5 9s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"+IC_CIRC(9,9,2),
  eyeoff:"M1.5 9s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5zM3 3l12 12",
  sleep:"M4 5h4l-4 5h4M10 9h3.5L10 13h3.5",
  inbox:"M2.5 10.5h4l1 2h3l1-2h4M2.5 10.5l2-5h9l2 5v5h-13zM9 1.8v5.4M7 5.2L9 7.2l2-2",
  box:"M2.5 5.5L9 2.5l6.5 3v7L9 15.5l-6.5-3zM2.5 5.5L9 8.5l6.5-3M9 8.5v7",
  case:"M2.5 6h13v9h-13zM6.5 6V3.5h5V6M6 6v9M12 6v9",
  party:"M3 15l3.5-9.5 6 6zM10 3.5l.5 1.5M14.5 7.5l-1.5.5M12.5 2.5l-1 2.5M15.5 4.5l-2.5 1",
  mail:"M2.5 4h13v10h-13zM2.5 4.5L9 9.5l6.5-5",
  chart:"M2.5 15.5h13M3.5 12l3.5-4 3 2.5 5-6M12 4.5h3v3",
  wrench:"M11.5 2.6a3.6 3.6 0 0 0-3.2 5L3 12.9a1.5 1.5 0 0 0 2.1 2.1l5.3-5.3a3.6 3.6 0 0 0 5-3.2l-2.2 1.3-1.9-1.1-.1-2.2z",
  moon:"M14.5 11.2A6 6 0 1 1 6.8 3.5a4.8 4.8 0 0 0 7.7 7.7z",
  sun:IC_CIRC(9,9,3)+"M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4",
  keyboard:"M1.5 5h15v8.5h-15zM4 7.5h1M7 7.5h1M10 7.5h1M13 7.5h1M5 11h8",
  rocket:"M9 2c3 2 4 5 3 9H6C5 7 6 4 9 2zM6 11l-2 3h3M12 11l2 3h-3M9 6.5v.1",
  flag:"M4 16V2.5M4 3h10l-2 3.5 2 3.5H4",
  scales:"M9 2.5v13M5.5 15.5h7M3 5h12M3 5L1.2 9.5a1.9 1.9 0 0 0 3.6 0zM15 5l-1.8 4.5a1.9 1.9 0 0 0 3.6 0z",
  question:"M6.5 6.5a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2 1-1.2 2M9 13.5v.1",
  broom:"M13 2.5L9 8.5M6.5 8.5l5 3-2 4H3z",
  web:"M2.5 2.5l13 13M15.5 2.5l-13 13M9 2v14M2 9h14",
  stop:IC_CIRC(9,9,6)+"M5.8 9h6.4",
  person:IC_CIRC(9,5.5,2.4)+"M3.5 15.5c.6-2.6 2.9-4 5.5-4s4.9 1.4 5.5 4",
  search:IC_CIRC(7.5,7.5,4.5)+"M11 11l4.5 4.5",
  ticket:"M2.5 5h13v2.5a1.5 1.5 0 0 0 0 3V13h-13v-2.5a1.5 1.5 0 0 0 0-3zM11 5v8",
  puzzle:"M3 6h3a1.5 1.5 0 1 1 3 0h3v3a1.5 1.5 0 1 1 0 3v3H3z",
  heart:"M9 15s-6-3.6-6-8a3.2 3.2 0 0 1 6-1.6A3.2 3.2 0 0 1 15 7c0 4.4-6 8-6 8z",
  extinguisher:"M6.5 6.5h5v9h-5zM9 6.5v-3h3.5M7 3.5L5.5 2",
  cap:"M1.5 7L9 3.5 16.5 7 9 10.5zM4.5 8.5v4c2.5 2 6.5 2 9 0v-4M16.5 7v4",
  star:"M9 2l2.1 4.4 4.8.6-3.5 3.3.9 4.7L9 12.7 4.7 15l.9-4.7L2.1 7l4.8-.6z",
  warn:"M9 2.5l7 12.5H2zM9 7v4M9 13.3v.1",
  checkbox:"M3 3h12v12H3zM5.5 9.2l2.3 2.3 4.7-5",
  box0:"M3 3h12v12H3z",
  flagf:"M4.5 16V2.5M4.5 3h9l-1.8 3 1.8 3h-9"};
const IC_OF={"🗑":"trash","⏱":"timer","📋":"clipboard","👥":"people","🔒":"lock","🔓":"unlock","🔗":"link","⛓":"link","💡":"bulb","⏳":"hourglass","⏰":"alarm","📞":"phone",
  "⏸":"pause","👷":"builder","🏖":"umbrella","🌴":"umbrella","🗂":"folders","📓":"notebook","🐞":"bug","❄":"snow","🔄":"refresh","🔁":"repeat","🏆":"trophy","⚙":"gear",
  "🗓":"calendar","📅":"calendar","📌":"pin","📍":"pin","🖨":"printer","📷":"camera","🖼":"picture","💾":"disk","📝":"note","🗒":"note","✍":"pencil","🚚":"truck",
  "📄":"doc","📁":"folder","📂":"folder","🔌":"plug","🎯":"target","💬":"chat","👁":"eye","🙈":"eyeoff","💤":"sleep","📥":"inbox","📦":"box","🧳":"case","🎉":"party",
  "✉":"mail","📨":"mail","📈":"chart","🔧":"wrench","☾":"moon","🌙":"moon","☀":"sun","⌨":"keyboard","🚀":"rocket","🏁":"flag","⚖":"scales","❓":"question","🧹":"broom",
  "🕸":"web","⛔":"stop","🙋":"person","👤":"person","🔍":"search","🎫":"ticket","🧩":"puzzle","🙏":"heart","🧯":"extinguisher","🎓":"cap","⭐":"star","⚠":"warn",
  "☑":"checkbox","☐":"box0","⚑":"flagf"};
const IC_RE=new RegExp("("+Object.keys(IC_OF).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")\uFE0F?","gu");
const icSvg=name=>`<svg class="ic ic-${name}" viewBox="0 0 18 18" aria-hidden="true"><path d="${IC_PATHS[name]}"/></svg>`;
const IC_SKIP="textarea,select,option,script,style,svg,title,[contenteditable],.noic";
function icText(n){const s=n.nodeValue;IC_RE.lastIndex=0;if(!IC_RE.test(s))return;const p=n.parentElement;if(!p||p.closest(IC_SKIP))return;
  IC_RE.lastIndex=0;const f=document.createDocumentFragment();let last=0,m;
  while((m=IC_RE.exec(s))){if(m.index>last)f.appendChild(document.createTextNode(s.slice(last,m.index)));
    const sp=document.createElement("span");sp.className="icw";sp.innerHTML=icSvg(IC_OF[m[1]]);f.appendChild(sp);last=m.index+m[0].length;}
  if(last<s.length)f.appendChild(document.createTextNode(s.slice(last)));p.replaceChild(f,n);}
function iconize(root){if(!root)return;if(root.nodeType===3){icText(root);return;}if(root.nodeType!==1||root.closest&&root.closest(IC_SKIP))return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),hits=[];let n;while((n=w.nextNode()))if(IC_RE.test(n.nodeValue)){IC_RE.lastIndex=0;hits.push(n);}else IC_RE.lastIndex=0;
  hits.forEach(icText);}
const icObs=new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")icText(m.target);else m.addedNodes.forEach(iconize);}});
icObs.observe(document.body,{childList:true,subtree:true,characterData:true});
iconize(document.body);
