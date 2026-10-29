import sys
# python toc_v42.py <file.html> — a ToC that reached many systems shows as a compact grid instead of a column of chips
P = sys.argv[1]
s = open(P, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"expected {count} of: {old[:100]!r}, found {n}")
    s = s.replace(old, new)

rep('''function sysPill(sysId,date,client){''', r'''/* Where something has been moved, when that's many systems: one line saying how many and when,
   then a grid — a row per landscape, a column per tier — with each system's date on hover.
   Three or fewer stay as chips (returns null). */
function reachGridHTML(syncs,lead,extra){const S=(syncs||[]).filter(s=>s.system);if(S.length<=3)return null;
  const first=new Map();S.forEach(s=>{if(!first.has(s.system)||(s.date&&(!first.get(s.system)||s.date<first.get(s.system))))first.set(s.system,s.date||"");});
  const tiers=routeTiers(),Ls=[...new Set([...first.keys()].map(landscapeOf))].sort(),ds=[...first.values()].filter(Boolean).sort();
  const when=!ds.length?"":ds[0]===ds[ds.length-1]?shortD(ds[0]):shortD(ds[0])+" – "+shortD(ds[ds.length-1]);
  return `<div class="rgrid"><div class="rg-h">${lead} · <b>${first.size} systems</b>${when?" · "+when:""}${extra||""}</div>
    <div class="rg-t" style="grid-template-columns:repeat(${tiers.length},auto)">${tiers.map(d=>`<span class="rg-k">${esc((tierFor(d)||{}).short||d)}</span>`).join("")}${
      Ls.map(L=>tiers.map(d=>{const x=L+d;return first.has(x)?`<span class="rg-c sys ${sysTierCls(x)}" title="${esc(x)} · ${first.get(x)?"reached "+first.get(x):"reached"}">${esc(x)}</span>`:`<span class="rg-c rg-no" title="${esc(x)} — not moved there">·</span>`;}).join("")).join("")}</div></div>`;}
function sysPill(sysId,date,client){''')

# on each transport card: the systems inherited from its ToC
rep('''            ${toc&&toc.syncs.filter(s=>s.system).length?`<div class="chiprow" style="margin-top:6px">${toc.syncs''',
    '''            ${toc&&toc.syncs.filter(s=>s.system).length?reachGridHTML(toc.syncs,"via ToC "+esc(toc.number||""),cust&&tr.client?" · 🗂 "+esc(tr.client):"")||`<div class="chiprow" style="margin-top:6px">${toc.syncs''')
# on the ToC card itself, under its sync rows
rep('''        if(c.syncs.filter(s=>s.system).length){const chips=document.createElement("div");chips.className="chiprow";chips.innerHTML=c.syncs.filter(s=>s.system).map(s=>sysPill(s.system,s.date)).join("");sh.appendChild(chips);}''',
    '''        if(c.syncs.filter(s=>s.system).length){const chips=document.createElement("div"),g=reachGridHTML(c.syncs,"Moved to");chips.className=g?"":"chiprow";chips.innerHTML=g||c.syncs.filter(s=>s.system).map(s=>sysPill(s.system,s.date)).join("");sh.appendChild(chips);}''')

rep('''  #printArea{display:none}''', '''  .rgrid{margin-top:6px;border:1px solid var(--line2,var(--rule));border-radius:6px;padding:7px 9px;display:inline-block;max-width:100%}
  .rg-h{font-size:11px;color:var(--muted,var(--ink-3));margin-bottom:6px}
  .rg-h b{color:var(--text,var(--ink));font-weight:600}
  .rg-t{display:grid;gap:4px 5px;align-items:center}
  .rg-k{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted,var(--ink-3));text-align:center}
  .rg-c.sys{margin:0;justify-content:center;font-size:11px;padding:1px 7px}
  .rg-no{text-align:center;color:var(--faint,var(--ink-4))}
  #printArea{display:none}''')

open(P, "w", encoding="utf-8").write(s)
print("ok", P)
