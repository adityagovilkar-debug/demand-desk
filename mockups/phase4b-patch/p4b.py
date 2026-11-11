"""Phase 4b — line icons, Tasks/Meetings headers, the Edit dialog in groups, the Waiting tile and a day
in Next 10 weeks. Apply after p4a.py. Usage: python p4b.py <demand-desk root>"""
import sys, shutil, os, re
ROOT = sys.argv[1].rstrip("/\\") + "/"
HERE = os.path.dirname(os.path.abspath(__file__)) + "/"
S = ROOT + "src/js/"
def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="\n").write(s)
def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, f"expected {n}, found {c}: {a[:100]!r}"
    return s.replace(a, b)
def resub(s, pat, b, n=1):
    r, c = re.subn(pat, lambda m: m.expand(b), s, flags=re.S)
    assert c == n, f"expected {n}, found {c}: {pat[:100]!r}"
    return r

for f in ["14e-icons.js", "14f-look.js"]: shutil.copy(HERE + f, S + f)
shutil.copy(HERE + "12-look.css", ROOT + "src/css/12-look.css")

# the title-bar Log time button compared its own HTML every second — icons would make it rewrite itself
p = S + "20-effort.js"; s = rd(p)
s = rep(s, "if(b.innerHTML!==txt)b.innerHTML=txt;", "if(b._t!==txt){b._t=txt;b.innerHTML=txt;}")
wr(p, s)

# ---- 19. Tasks: the Demand header ----
p = S + "04-tasks.js"; s = rd(p)
s = resub(s, r'  host\.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1">\n      <input id="jb-title"[^\n]*\n      (<div class="dh-dates" style="margin-top:8px">.*?\n      </div>)(<canvas class="jb-rail".*?)</div>\n      <div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end">.*?id="jb-del">🗑 Delete</button></div></div>',
r'''  const hOpen=hdrOpen.has(j.id)||j.title==="(untitled task)",hrs=jobHours(j),dn=j.due?daysUntil(j.due):null;
  host.innerHTML=`<div class="detail-head bhead" style="--pen:${JOB_PEN[j.status]}">
    <div class="bh-top"><div class="bh-l">
        <div class="bh-no"><span class="bh-id">Task</span> · ${esc(JOB_SRC[j.source])}${j.askedBy?` · asked by ${esc(j.askedBy)}`:""}</div>
        <input id="jb-title" class="bh-title" value="${esc(j.title)}" title="Click to rename"></div>
      <div class="bh-acts"><div class="seg" id="jb-seg" title="Status">${Object.entries(JOB_STATUS).map(([k,v])=>`<button data-s="${k}" class="${k===j.status?"on":""}" style="--pen:${JOB_PEN[k]}"><i></i>${v.l}</button>`).join("")}</div>
        <div class="bh-btns"><button class="sm" id="jb-logt" title="Log time against this task">⏱ Log time</button>${jobOpen(j)?`<button class="sm primary" id="jb-close" title="Record what you reported back">✓ Close…</button>`:""}<button class="sm ${hOpen?"on":""}" id="jb-det" title="Status, who asked, how it came in, the dates">✎ Details</button><button class="sm ghost danger" id="jb-del" title="Delete this task">🗑</button></div></div></div>
    ${roHTML([{k:"Received",v:shortD(j.received)},
      {k:"Expected",v:j.due?shortD(j.due)+(jobOpen(j)&&dn!=null?`<small>${dn<0?-dn+" d late":dn===0?"today":"in "+dn+" d"}</small>`:""):"—",cls:jobOpen(j)&&dn!=null?(dn<0?"bad":dn<=1?"warn":""):""},
      {k:"Logged",v:hrs?U(efFh(hrs),"h"):"—"},{k:"Log",v:U(j.log.length,j.log.length===1?"entry":"entries")},
      jobWaiting(j)?{k:"Waiting on",v:esc(j.waiting.on)+(jobWaitDays(j)!=null?`<small>${jobWaitDays(j)} d</small>`:""),cls:"warn"}:null],"stack")}
    <div class="bh-fields ${hOpen?"":"hide"}">\1</div>
    \2''')
s = rep(s, """  q("#jb-brief").onchange=e=>{j.brief=e.target.value;touch(j);};""", """  host.querySelectorAll("#jb-seg button").forEach(b=>b.onclick=()=>{if(b.dataset.s===j.status)return;const sel=q("#jb-status");sel.value=b.dataset.s;sel.onchange({target:sel});});
  q("#jb-det").onclick=()=>hdrToggle(j.id,renderJobDetail);
  q("#jb-brief").onchange=e=>{j.brief=e.target.value;touch(j);};""")
wr(p, s)

# ---- 19. Meetings: the Demand header ----
p = S + "06-meetings.js"; s = rd(p)
s = resub(s, r'  host\.innerHTML=`<div class="detail-head"><div class="dh-top"><div style="flex:1">\n      <input id="mt-title"[^\n]*\n      (<div class="dh-dates" style="margin-top:8px">.*?\n      </div>)<div id="mt-eff"></div></div>\n      <button class="sm danger" id="mt-del" style="align-self:flex-start">🗑 Delete</button></div>\n    <div class="tabs"><button class="tab active">Notes, Demands &amp; Action Points</button></div></div>',
r'''  const hOpen=hdrOpen.has(m.id)||!m.title||m.title==="(untitled meeting)",oa=m.actions.filter(a=>!a.done).length,nl=(m.taskIds||[]).length+(m.epicIds||[]).length;
  host.innerHTML=`<div class="detail-head bhead" style="--pen:var(--pen-4)">
    <div class="bh-top"><div class="bh-l">
        <div class="bh-no"><span class="bh-id">Meeting</span> · ${esc(efWdl(m.date))}${m.team?` · ${esc(m.team)}`:""}</div>
        <input id="mt-title" class="bh-title" value="${esc(m.title)}" title="Click to rename">
        <div class="bh-sub">${m.attendees?"with "+esc(m.attendees):"no attendees noted"}</div></div>
      <div class="bh-acts"><div class="bh-btns"><button class="sm ${hOpen?"on":""}" id="mt-det" title="Date, team, attendees, duration">✎ Details</button><button class="sm ghost danger" id="mt-del" title="Delete this meeting">🗑</button></div></div></div>
    ${roHTML([{k:"Date",v:shortD(m.date)},{k:"Team",v:m.team?esc(m.team):"—"},{k:"Duration",v:m.hours?U(efFh(m.hours),"h"):"—",title:"Logged in Effort for you"},
      {k:"Action points",v:m.actions.length?U(oa+" / "+m.actions.length,"open"):"—",cls:oa?"warn":""},{k:"Linked",v:nl?U(nl,nl===1?"demand or epic":"demands & epics"):"—"}],"stack")}
    <div class="bh-fields ${hOpen?"":"hide"}">\1</div><div id="mt-eff"></div></div>''')
s = rep(s, """  host.querySelector("#mt-att").onchange=e=>{m.attendees=e.target.value;touch(m);renderMeetingSidebar();};""",
 """  host.querySelector("#mt-att").onchange=e=>{m.attendees=e.target.value;touch(m);renderMeetingSidebar();};
  host.querySelector("#mt-det").onclick=()=>hdrToggle(m.id,renderMeetingDetail);""")
wr(p, s)

# ---- 20. the Edit demand dialog in groups ----
p = S + "05-demands.js"; s = rd(p)
s = rep(s, """root.innerHTML=`<div class="modal-bg"><div class="modal"><h2>${existing?"Edit demand":"New demand / task"}</h2>""",
 """root.innerHTML=`<div class="modal-bg"><div class="modal" style="width:680px"><h2>${existing?"Edit demand":"New demand / task"}</h2>""")
a = s.index('    <div class="grid2"><div class="field"><label>Demand ID</label>')
endmark = '<div class="field"><label>Description</label><textarea id="m-desc">${esc(t.description)||""}</textarea></div>'
b = s.index(endmark) + len(endmark)
block = s[a:b]
def field(i):
    k = block.index(f'id="{i}"'); st = block.rindex('<div class="field">', 0, k); en = block.index("</div>", k) + 6
    return block[st:en]
bs = block.index('<div class="field"><label>👷 Built by'); be = block.index('<div id="m-build"></div></div>', bs) + len('<div id="m-build"></div></div>')
F = {i: field(i) for i in ["m-demand","m-type","m-title","m-desc","m-sys","m-client","m-epic","m-wave","m-status","m-rec","m-due","m-req","m-wait","m-waitsince","m-proj","m-theme"]}
F["built"] = block[bs:be]
new = ('    <div class="mg"><div class="mg-h">What</div><div class="grid2">@m-demand@@m-type@</div>@m-title@@m-desc@</div>\n'
       '    <div class="mg"><div class="mg-h">Where</div><div class="grid2">@m-sys@@m-client@</div><div class="grid2">@m-epic@@m-wave@</div></div>\n'
       '    <div class="mg"><div class="mg-h">When</div><div class="grid3">@m-status@@m-rec@@m-due@</div></div>\n'
       '    <div class="mg"><div class="mg-h">Who</div><div class="grid3">@m-req@@m-wait@@m-waitsince@</div>@built@</div>\n'
       '    <details class="mg mg-more"${t.project||t.theme?" open":""}><summary class="mg-h">More — project and theme${t.project||t.theme?` <span class="faint">${esc([t.project,t.theme].filter(Boolean).join(" · "))}</span>`:""}</summary><div class="grid2">@m-proj@@m-theme@</div></details>')
for k, v in F.items(): new = new.replace("@" + k + "@", v)
assert "@" not in new.replace("@m-", "") or True
for k in F: assert ("@" + k + "@") not in new, k
s = s[:a] + new + s[b:]
wr(p, s)

# ---- 23. the Waiting tile names the longest waits; a day in Next 10 weeks opens ----
p = S + "17-bench-look.js"; s = rd(p)
s = rep(s, """<canvas></canvas><div class="nm">${x.nm}</div><div class="bl">${x.bl}</div>""",
 """<canvas></canvas><div class="nm">${x.nm}</div>${i===2&&c.waiting.length?waitListHTML(c.waiting):`<div class="bl">${x.bl}</div>`}""")
s = rep(s, """<canvas id="ckCal" data-still="1700" style="width:100%;height:158px;display:block"></canvas></div>""",
 """<canvas id="ckCal" data-still="1700" style="width:100%;height:158px;display:block"></canvas><div class="ck-calday" id="ckCalDay"></div></div>""")
s = rep(s, "freezes · recurring · due · next actions</span>", "click a day to see what's on it</span>")
s = rep(s, """label(ctx,l,x+6,h-5,{size:8,weight:400,align:"left",color:C["ink-3"]});});});""",
 """label(ctx,l,x+6,h-5,{size:8,weight:400,align:"left",color:C["ink-3"]});});});
  wireCalClick(q("#ckCal"),host);""")
wr(p, s)

# ---- self-test ----
p = S + "25-selftest.js"; s = rd(p)
s = rep(s, """   ok("Encryption warning shows while secrets are unencrypted",""", r"""   {view="demands";activeId="st-a";activeTab="overview";renderApp();await sleep(60);const d=document.getElementById("detail"),left=(d.textContent.match(/🗑|⏱|⏰|🏆/g)||[]).length;
    ok("Line icons: the page's emoji are drawn as line icons",!!d.querySelector(".ic")&&!left,`emoji left: ${left}`);
    view="jobs";activeJobId="st-job-1";renderApp();const j=jobById("st-job-1"),s0=j.status;{const sb=document.querySelector('#jb-seg button[data-s="open"]');if(sb)sb.click();}const segOk=j.status==="open";j.status=s0;renderApp();
    const jh=!!document.querySelector(".bhead #jb-title")&&!!document.querySelector(".bh-fields.hide #jb-status");
    view="meetings";meetingRollup=false;activeMeetingId="st-m1";renderApp();const mh=!!document.querySelector(".bhead #mt-title")&&!!document.querySelector(".bh-fields.hide #mt-date");
    ok("Tasks and Meetings have the Demand header: status segment, readouts, details folded",segOk&&jh&&mh,`seg ${segOk} · task ${jh} · meeting ${mh}`);
    const R=document.getElementById("modalRoot");openTaskModal(state.tasks.find(x=>x.id==="st-a"));const gs=R.querySelectorAll(".mg").length,more=!!R.querySelector("details.mg-more #m-proj"),all=["m-demand","m-title","m-desc","m-sys","m-epic","m-status","m-due","m-req","m-wait","m-theme"].every(i=>R.querySelector("#"+i));R.innerHTML="";
    ok("The Edit dialog in groups — What, Where, When, Who, and More",gs===5&&more&&all,`groups ${gs} · more ${more} · fields ${all}`);
    ok("A day in Next 10 weeks lists what's on it; the Waiting tile names the longest waits",calDayItems(efAdd(todayStr(),10)).some(x=>x.k==="Epic target")&&waitListHTML(cockpitCounts().waiting).includes("QA team"));
    view="today";renderApp();}
   ok("Encryption warning shows while secrets are unencrypted",""")
wr(p, s)
print("phase 4b patch applied to", ROOT)
