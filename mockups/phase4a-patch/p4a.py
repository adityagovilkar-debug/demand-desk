"""Phase 4a — one look (classic themes retired), Journal to-dos into Tasks, demand tabs on one row,
in-app dialogs with Undo, keys sheet. Usage: python p4a.py <demand-desk root>"""
import sys, shutil, os, re
ROOT = sys.argv[1].rstrip("/\\") + "/"
HERE = os.path.dirname(os.path.abspath(__file__)) + "/"
S = ROOT + "src/js/"
sys.path.insert(0, HERE)
import cssprune

def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s): open(p, "w", encoding="utf-8", newline="\n").write(s)
def rep(s, a, b, n=1):
    c = s.count(a)
    assert c == n, f"expected {n}, found {c}: {a[:100]!r}"
    return s.replace(a, b)
def resub(s, pat, b, n=1, flags=re.S):
    r, c = re.subn(pat, (lambda m: m.expand(b)) if "\\" in b else (lambda m: b), s, flags=flags)
    assert c == n, f"expected {n}, found {c}: {pat[:100]!r}"
    return r

# --- a tiny JS scanner: skip strings, template literals and balanced braces ---
def skip_str(s, i):
    q = s[i]; i += 1
    while s[i] != q:
        i += 2 if s[i] == "\\" else 1
    return i + 1
def skip_tpl(s, i):
    i += 1
    while True:
        c = s[i]
        if c == "\\": i += 2; continue
        if c == "`": return i + 1
        if s.startswith("${", i): i = skip_block(s, i + 2); continue
        i += 1
def skip_block(s, i):
    """i just after an opening { (or ${) -> index after the matching }"""
    depth = 0
    while True:
        c = s[i]
        if c in "\"'": i = skip_str(s, i); continue
        if c == "`": i = skip_tpl(s, i); continue
        if c == "{": depth += 1
        elif c == "}":
            if depth == 0: return i + 1
            depth -= 1
        i += 1
def cut_ternary_tpl(s, head, keep):
    """`head` ends just before a template literal (the classic branch); replace head+template with keep"""
    i = s.index(head); assert s.count(head) == 1, head
    j = i + len(head); assert s[j] == "`", s[j:j+20]
    e = skip_tpl(s, j)
    return s[:i] + keep + s[e:]
def cut_function(s, sig):
    i = s.index(sig); assert s.count(sig) == 1, sig
    e = skip_block(s, i + len(sig))
    if s[e:e+1] == "\n": e += 1
    return s[:i] + s[e:]

for f in ["14d-dialogs-keys.js"]: shutil.copy(HERE + f, S + f)
shutil.copy(HERE + "11-dialogs-keys.css", ROOT + "src/css/11-dialogs-keys.css")

# =============== A. the classic themes are retired: Bench (Paper / Backlit) is the look ===============
st = {"rules": 0, "sels": 0, "media": 0}
import glob
for p in sorted(glob.glob(ROOT + "src/css/*.css")):
    s = rd(p); t = cssprune.prune(s, st).replace(':root:is([data-theme="instrument"],[data-theme="bench"])', ':root[data-theme="bench"]')
    if t != s: wr(p, t)
print("css pruned", st)

p = S + "17-bench-look.js"; s = rd(p)
s = rep(s, """const THEME_OPTS={"bench":"Bench · follow Windows","bench-paper":"Bench · Paper","bench-backlit":"Bench · Backlit","dark":"Classic dark","light":"Classic light","instrument":"Instrument White"};""",
 """const THEME_OPTS={"bench":"Follow Windows","bench-paper":"Paper","bench-backlit":"Backlit"};   /* the classic themes were retired in v48 — a saved one opens as Bench */""")
s = rep(s, """  else{el.setAttribute("data-theme",t);el.removeAttribute("data-mode");}\n""", "")
s = rep(s, """  else nx=t==="dark"?"light":"dark";\n""", "")
s = rep(s, "and the three classic themes.", "(the three classic themes were retired in v48).")
wr(p, s)

p = S + "16-search-menu.js"; s = rd(p)
s = resub(s, r'\n        <span class="faint">Classic</span><div[^\n]*?</div>', "")
s = rep(s, "Bench is the default. The ☀/🌙 button in the title bar flips light ↔ dark within the family you pick.", "The ☀/🌙 button in the title bar flips Paper ↔ Backlit.")
s = rep(s, """      <button id="mn-week">🗓 Weekly summary…</button>""", """      <button id="mn-keys">⌨ Keyboard shortcuts (?)</button>
      <button id="mn-week">🗓 Weekly summary…</button>""")
s = rep(s, """  root.querySelector("#mn-week").onclick=()=>{close();openWeekly();};""", """  root.querySelector("#mn-week").onclick=()=>{close();openWeekly();};
  root.querySelector("#mn-keys").onclick=()=>{close();openKeys();};""")
wr(p, s)

p = S + "03-today.js"; s = rd(p)
s = rep(s, "  if(wrap&&!benchOn())html=wrap+html;\n", "")
s = cut_ternary_tpl(s, """${html}</div></div>`
    :""", "${html}</div></div>`")
s = rep(s, """  host.innerHTML=benchOn()
    ?`<div class="dash cockpit">""", """  host.innerHTML=`<div class="dash cockpit">""")
s = rep(s, "  if(benchOn())mountCockpit(host);", "  mountCockpit(host);")
wr(p, s)

p = S + "05-demands.js"; s = rd(p)
s = rep(s, """  if(!benchOn()&&activeTab==="overview")activeTab="work";   /* Overview is a Bench tab; classic opens on Work */\n""", "")
s = rep(s, """nopick("Select a demand on the left,<br>or create a new one to begin.");if(benchOn())renderCtxRail();return;}""", """nopick("Select a demand on the left,<br>or create a new one to begin.");renderCtxRail();return;}""")
s = cut_ternary_tpl(s, "host.innerHTML=benchOn()?demandHeadBench(t,sub,lc):", "host.innerHTML=demandHeadBench(t,sub,lc)")
s = rep(s, "(benchOn()?renderWorkBench:renderWork)(body,t)", "renderWorkBench(body,t)")
s = cut_function(s, "function renderWork(body,t){")
assert "renderWork(" not in s
i = s.index("function demandCard(t,grouped,cidx){"); e = skip_block(s, i + len("function demandCard(t,grouped,cidx){"))
s = s[:i] + "function demandCard(t,grouped,cidx){return demandCardBench(t,grouped,cidx);}" + s[e:]
wr(p, s)

p = S + "11-epics.js"; s = rd(p)
s = cut_ternary_tpl(s, "host.innerHTML=benchOn()?epicHeadBench(e,r,pk,fu,storyN,openDeps,sub):", "host.innerHTML=epicHeadBench(e,r,pk,fu,storyN,openDeps,sub)")
s = rep(s, """  if(benchOn()){wireEpicHeadBench(host,e);const tb=epicBenchTab();
    if(tb==="deps")renderEpicDeps(body,e);else if(tb==="effort")renderEpicEffort(body,e);else if(tb==="subtasks")renderEpicSubtasks(body,e);
    else if(tb==="details")renderEpicOverview(body,e,r,pk,fu);else renderEpicOverviewBench(body,e,r);}
  else if(epicTab==="story")renderEpicStory(body,e);
  else if(epicTab==="deps")renderEpicDeps(body,e);
  else if(epicTab==="subtasks")renderEpicSubtasks(body,e);
  else if(epicTab==="effort")renderEpicEffort(body,e);
  else renderEpicOverview(body,e,r,pk,fu);""", """  {wireEpicHeadBench(host,e);const tb=epicBenchTab();
    if(tb==="deps")renderEpicDeps(body,e);else if(tb==="effort")renderEpicEffort(body,e);else if(tb==="subtasks")renderEpicSubtasks(body,e);
    else if(tb==="details")renderEpicOverview(body,e,r,pk,fu);else renderEpicOverviewBench(body,e,r);}""")
wr(p, s)

# =============== B. the Journal's to-dos become Tasks (data v32) ===============
p = S + "01-core.js"; s = rd(p)
s = rep(s, "const DATA_VERSION=31;", "const DATA_VERSION=32;")
s = rep(s, "  d.todos=(d.todos||[]).map(normTodo);", """  /* v32: the Journal's to-do list became Tasks — one list for things to do */
  (d.todos||[]).map(normTodo).forEach(x=>{if(d.jobs.some(j=>j.id===x.id))return;
    d.jobs.push(normJob({id:x.id,title:x.text||"(to-do)",source:"self",received:isoTs(x.createdAt||Date.now()),due:x.due||"",status:x.done?"done":"open",
      closedOn:x.done?isoTs(x.doneAt||x.createdAt||Date.now()):"",outcome:x.resolution||"",createdAt:x.createdAt,updatedAt:x.doneAt||x.createdAt}));});
  d.todos=[];""")
wr(p, s)

p = S + "03-today.js"; s = rd(p)
s = resub(s, r'  const mytodos=state\.todos[^\n]*\n', "")
s = resub(s, r'  card\("My action items"[^\n]*\n', "")
s = rep(s, "One consolidated rough-notes entry per day, plus your personal action items.", "One consolidated rough-notes entry per day.")
wr(p, s)

p = S + "09-journal.js"; s = rd(p)
s = rep(s, "  const openTodos=state.todos.filter(x=>!x.done).length;\n", "")
s = resub(s, r'  const pinned=`.*?</div></div>`;\n', "")
s = rep(s, "  el.innerHTML=pinned+list;", "  el.innerHTML=list;")
s = rep(s, """  el.querySelector("[data-todos]").onclick=()=>{journalTodos=true;renderApp();};\n""", "")
s = cut_function(s, "function renderTodos(host){")
s = rep(s, "  if(journalTodos)return renderTodos(host);\n", "")
assert "todos" not in s.replace("journalTodos", ""), "journal still mentions todos"
wr(p, s)

p = S + "14b-daily-loop.js"; s = rd(p)
s = resub(s, r'  state\.todos\.filter\(x=>!x\.done&&x\.due&&x\.due<=t0\).*?\]\}\)\);\n', "")
s = rep(s, """x.askedBy?`${esc(x.askedBy)} expects an answer`:"An answer is expected\"""", """x.askedBy?`${esc(x.askedBy)} expects an answer`:x.source==="self"?"Due":"An answer is expected\"""")
s = rep(s, "Journal\n   to-dos and what's due", "and what's\n   due")
wr(p, s)

p = S + "15-run-sheet-handover.js"; s = rd(p)
s = rep(s, "...(s.todos?state.todos.filter(x=>!x.done&&x.due&&x.due<=winEnd).map(x=>`☐ ${x.due}: ${x.text}`):[])",
 "...(s.todos?state.jobs.filter(j=>jobOpen(j)&&j.due&&j.due<=winEnd).map(j=>`☐ ${j.due}: ${j.title}`):[])")
s = rep(s, """["todos","My to-dos due before I'm back"]""", """["todos","My tasks due before I'm back"]""")
wr(p, s)

p = S + "17-bench-look.js"; s = rd(p)
s = rep(s, """  set("rcJournal",state.todos.filter(x=>!x.done).length);""", """  set("rcJournal",0);""")
wr(p, s)
p = S + "23-notes-search.js"; s = rd(p)
s = resub(s, r'  state\.todos\.forEach\(x=>add\("To-do"[^\n]*\n', "")
wr(p, s)
p = S + "04-tasks.js"; s = rd(p)
s = rep(s, "(state.todos is the Journal's quick checklist; state.tasks are demands)", "(state.tasks are demands; the Journal's old to-do list became tasks in v32)")
wr(p, s)

# =============== 18. the demand page's tabs on one row ===============
p = S + "18-bench-layouts.js"; s = rd(p)
s = rep(s, """<button class="tab sec2 ${activeTab==="calls"?"active":""}" data-tab="calls">""", """<button class="tab sec2 inrail ${activeTab==="calls"?"active":""}" data-tab="calls">""")
s = rep(s, """<button class="tab sec2 ${activeTab==="images"?"active":""}" data-tab="images">""", """<button class="tab sec2 inrail ${activeTab==="images"?"active":""}" data-tab="images">""")
s = rep(s, """<span class="kbh" title="Keyboard: ↑ ↓ move through the list, 1–6 switch tabs, T logs time">↑↓ · 1–6 · T</span>""",
 """<span class="kbh keyhint" title="Keyboard shortcuts" onclick="openKeys()">? keys</span>""")
wr(p, s)

# =============== 21. in-app dialogs, and Undo instead of "are you sure?" ===============
p = S + "01-core.js"; s = rd(p)
s = rep(s, "flushEdits();if(dirty&&!confirm(UNSAVED_MSG))return;\n  try{", """flushEdits();if(dirty&&!await askOk(UNSAVED_MSG,{title:"Open another file?",ok:"Open"}))return;\n  try{""")
s = rep(s, "function importViaInput(){flushEdits();if(dirty&&!confirm(UNSAVED_MSG))return;", """async function importViaInput(){flushEdits();if(dirty&&!await askOk(UNSAVED_MSG,{title:"Open another file?",ok:"Open"}))return;""")
s = rep(s, "function saveGuardOk(action){", "async function saveGuardOk(action){")
s = resub(s, r'return confirm\("⚠ You\'re about to "\+action\+" an EMPTY dataset(.*?)Continue anyway\?"\);', r'return askOk("You\'re about to "+action+" an EMPTY dataset\1Continue anyway?",{title:"⚠ An empty file?",ok:"Continue",danger:true});')
s = rep(s, 'if(!saveGuardOk("save"))return;', 'if(!await saveGuardOk("save"))return;')
s = rep(s, 'async function exportDownload(){if(!saveGuardOk("download"))return;', 'async function exportDownload(){if(!await saveGuardOk("download"))return;')
wr(p, s)

p = S + "03-today.js"; s = rd(p)
s = resub(s, r'      if\(!confirm\(ds\.length\?`Remove \$\{p\.name\}\?.*?\)\)return;\n      (ds\.forEach\(t=>setBuilders\(t,t\.builders\.filter\(x=>x!==p\.id\)\)\);state\.people=state\.people\.filter\(x=>x\.id!==p\.id\);)markDirty\(\);renderApp\(\);\};',
 r'      deleteWithUndo(`Removed ${p.name}`,()=>{\1});};')
wr(p, s)

p = S + "04-tasks.js"; s = rd(p)
s = resub(s, r'q\("#jb-del"\)\.onclick=\(\)=>\{const h=jobHours\(j\);if\(!confirm\(.*?\)\)return;\n    state\.jobs=state\.jobs\.filter\(x=>x\.id!==j\.id\);activeJobId=null;markDirty\(\);renderApp\(\);\};',
 'q("#jb-del").onclick=()=>deleteWithUndo(`Deleted “${j.title}”`,()=>{state.jobs=state.jobs.filter(x=>x.id!==j.id);activeJobId=null;});')
wr(p, s)

p = S + "05-demands.js"; s = rd(p)
s = rep(s, "function dvSaveCurrent(){const v=dvGet(),saved=dvSaved();", "async function dvSaveCurrent(){const v=dvGet(),saved=dvSaved();")
s = rep(s, """const name=(prompt("Name this view — it becomes a one-click chip above the list:","")||"").trim();""",
 """const name=((await askText("Save this view",{label:"Name — it becomes a one-click chip above the list",ok:"Save"}))||"").trim();""")
s = rep(s, """if(ex){if(!confirm(`Replace the saved view “${ex.name}” with the current settings?`))return false;""",
 """if(ex){if(!await askOk(`“${ex.name}” gets the current settings.`,{title:"Replace a saved view?",ok:"Replace"}))return false;""")
s = rep(s, """sv.onclick=()=>{if(dvSaveCurrent())renderDemandSidebar();};""", """sv.onclick=async()=>{if(await dvSaveCurrent())renderDemandSidebar();};""")
s = rep(s, """panel.querySelector("#dv-save").onclick=()=>{if(dvSaveCurrent()){renderDemandSidebar();draw();}};""", """panel.querySelector("#dv-save").onclick=async()=>{if(await dvSaveCurrent()){renderDemandSidebar();draw();}};""")
s = rep(s, """el.querySelector(".sv-ren").onclick=()=>edit((a,i)=>{const nm=(prompt("Rename view:",a[i].name)||"").trim();if(!nm)return false;a[i].name=nm;});""",
 """el.querySelector(".sv-ren").onclick=async()=>{const sv=dvSaved().find(x=>x.id===id);if(!sv)return;const nm=((await askText("Rename the view",{value:sv.name,ok:"Rename"}))||"").trim();if(nm)edit((a,i)=>{a[i].name=nm;});};""")
s = rep(s, """el.querySelector(".sv-del").onclick=()=>edit((a,i)=>{if(!confirm(`Delete the saved view “${a[i].name}”?`))return false;a.splice(i,1);});});""",
 """el.querySelector(".sv-del").onclick=()=>{const sv=dvSaved().find(x=>x.id===id);edit((a,i)=>{a.splice(i,1);});
        if(sv)efToastUndo(`Deleted the view “${sv.name}”`,()=>{const a=dvSaved();a.push(sv);dvSetSaved(a);renderDemandSidebar();draw();});};});""")
s = resub(s, r'host\.querySelector\("#btnDelTask"\)\.onclick=\(\)=>\{if\(confirm\(.*?\)\)\{(state\.tasks=state\.tasks\.filter.*?activeId=null;)markDirty\(\);renderApp\(\);\}\};',
 r'host.querySelector("#btnDelTask").onclick=()=>deleteWithUndo(`Deleted ${demandLabel(t)}`,()=>{\1});')
s = rep(s, """body.querySelector("#addEvt").onclick=()=>{const n=prompt("Timeline note (e.g. 'QA raised bug on PA0008'):");if(n){""",
 """body.querySelector("#addEvt").onclick=async()=>{const n=await askText("Add a note to History",{placeholder:"e.g. QA raised a bug on PA0008",ok:"Add"});if(n&&n.trim()){""")
s = resub(s, r'      if\(\(n\|\|c\)&&!confirm\(.*?\)\)return;\n      const r=findSub\(t\.subtasks,s\.id\);if\(r\)\{r\.parent\.splice\(r\.parent\.indexOf\(s\),1\);touch\(t\);rr\(\);\}\};',
 '      deleteWithUndo(`Deleted “${s.title||"subtask"}”${n?` and the ${n} under it`:""}`,()=>{const r=findSub(t.subtasks,s.id);if(r){r.parent.splice(r.parent.indexOf(s),1);touch(t);}});};')
s = rep(s, """el.querySelector(".c-del").onclick=()=>{if(confirm("Delete this comment?")){""",
 """el.querySelector(".c-del").onclick=async()=>{if(await askOk("It can't be brought back.",{title:"Delete this comment?",ok:"Delete",danger:true})){""")
s = resub(s, r'tr\.querySelector\("\.o-del"\)\.onclick=\(\)=>\{if\(o\.name&&!confirm\(.*?\)\)return;(t\.objects=t\.objects\.filter.*?)touch\(t\);draw\(\);renderDetail\(\);\};',
 r'tr.querySelector(".o-del").onclick=()=>deleteWithUndo(`Removed ${o.name||"the object"}`,()=>{\1touch(t);});')
s = rep(s, """b.onclick=()=>{const n=prompt(`ToC number for ${tr.number||"this transport"}:`,"");if(n===null)return;""",
 """b.onclick=async()=>{const n=await askText("A new ToC",{label:`ToC number for ${tr.number||"this transport"}`,placeholder:"e.g. H03K900499 — or fill it in later",ok:"Create"});if(n===null)return;""")
s = resub(s, r'q\("\.del"\)\.onclick=\(\)=>\{if\(\(tr\.number\|\|tr\.syncs\.some\(x=>x\.system\)\)&&!confirm\(.*?\)\)return;(t\.transports=t\.transports\.filter\(x=>x\.id!==tr\.id\);)touch\(t\);renderTransports\(body,t\);renderDetail\(\);\};',
 r'q(".del").onclick=()=>deleteWithUndo(`Deleted transport ${tr.number||"(unnumbered)"}`,()=>{\1touch(t);});')
s = resub(s, r'q\("\.cdel"\)\.onclick=\(\)=>\{if\(members\.length&&!confirm\(.*?\)\)return;(t\.transports\.forEach\(tr=>\{if\(tr\.tocId===c\.id\)tr\.tocId="";\}\);t\.tocs=t\.tocs\.filter\(x=>x\.id!==c\.id\);)touch\(t\);renderTransports\(body,t\);\};',
 r'q(".cdel").onclick=()=>deleteWithUndo(`Deleted ToC ${c.number||""}`,()=>{\1touch(t);});')
s = rep(s, """    if(!edited||confirm(existing?"Discard your changes to this demand?":"Discard this new demand?"))close();};""",
 """    if(!edited){close();return;}askOk(existing?"Your changes to this demand will be lost.":"This new demand won't be created.",{title:"Discard?",ok:"Discard",danger:true}).then(y=>{if(y)close();});};""")
wr(p, s)

def del_undo(path, pat, label):
    s = rd(path)
    s = resub(s, pat, label)
    wr(path, s)
del_undo(S + "06-meetings.js", r'host\.querySelector\("#mt-del"\)\.onclick=\(\)=>\{if\(confirm\("Delete this meeting and its action points\?"\)\)\{(.*?)markDirty\(\);renderApp\(\);\}\};',
 r'host.querySelector("#mt-del").onclick=()=>deleteWithUndo("Deleted the meeting",()=>{\1});')
del_undo(S + "07-vault.js", r'tr\.querySelector\("\.c-del"\)\.onclick=\(\)=>\{if\(confirm\("Delete this credential\?"\)\)\{(.*?)markDirty\(\);renderVault\(\);\}\};',
 r'tr.querySelector(".c-del").onclick=()=>deleteWithUndo("Deleted the login",()=>{\1});')
del_undo(S + "09-journal.js", r'host\.querySelector\("#j-del"\)\.onclick=\(\)=>\{if\(confirm\("Delete this journal entry\?"\)\)\{(.*?)markDirty\(\);renderApp\(\);\}\};',
 r'host.querySelector("#j-del").onclick=()=>deleteWithUndo("Deleted the journal entry",()=>{\1});')
del_undo(S + "10-debug.js", r'host\.querySelector\("#d-del"\)\.onclick=\(\)=>\{if\(confirm\("Delete this debug session\?"\)\)\{(.*?)markDirty\(\);renderApp\(\);\}\};',
 r'host.querySelector("#d-del").onclick=()=>deleteWithUndo("Deleted the debug session",()=>{\1});')
del_undo(S + "12-playbook.js", r'host\.querySelector\("#pb-del"\)\.onclick=\(\)=>\{if\(confirm\("Delete this playbook entry\?"\)\)\{(.*?)markDirty\(\);renderApp\(\);\}\};',
 r'host.querySelector("#pb-del").onclick=()=>deleteWithUndo("Deleted the playbook entry",()=>{\1});')

p = S + "07-vault.js"; s = rd(p)
s = rep(s, """root.querySelector("#e-remove").onclick=()=>{if(confirm("Remove encryption? The file will be saved as PLAIN TEXT, including any stored passwords.")){""",
 """root.querySelector("#e-remove").onclick=async()=>{if(await askOk("The file will be saved as plain text, including any stored passwords.",{title:"Remove encryption?",ok:"Remove encryption",danger:true})){""")
wr(p, s)

p = S + "08-objects-portfolio-aging.js"; s = rd(p)
s = rep(s, """tr.querySelector(".ot-x").onclick=()=>{""", """tr.querySelector(".ot-x").onclick=async()=>{""")
s = resub(s, r'if\(n&&!confirm\(`"\$\{arr\[i\]\}" is used by \$\{n\} object\(s\)\.\\n\\nThose objects keep the type — it just won\'t be offered for new ones\. Remove it from the list\?`\)\)return;',
 'if(n&&!await askOk(`“${arr[i]}” is used by ${n} object(s). They keep the type — it just won\'t be offered for new ones.`,{title:"Remove this type from the list?",ok:"Remove"}))return;')
s = resub(s, r'root\.querySelector\("#ot-reset"\)\.onclick=\(\)=>\{if\(confirm\("Restore the built-in list of object types\?\\n\\nObjects already logged keep their current type\."\)\)',
 'root.querySelector("#ot-reset").onclick=async()=>{if(await askOk("Objects already logged keep their current type.",{title:"Restore the built-in object types?",ok:"Restore"}))')
wr(p, s)

p = S + "11-epics.js"; s = rd(p)
s = resub(s, r'  on\("#ep-del","onclick",\(\)=>\{\n    const n=tasksForEpic\(e\.id\)\.length;\n    if\(!confirm\(.*?\)\)return;\n',
 '  on("#ep-del","onclick",()=>deleteWithUndo(`Deleted the epic ${e.code||e.name}`,()=>{\n')
s = rep(s, "    state.epics=state.epics.filter(x=>x.id!==e.id);activeEpicId=null;markDirty();renderApp();});", "    state.epics=state.epics.filter(x=>x.id!==e.id);activeEpicId=null;}));")
s = rep(s, """row.querySelector(".l-del").onclick=()=>{if(confirm("Delete this story entry?")){e.log=e.log.filter(l=>l.id!==x.id);touch(e);renderEpicDetail();}};""",
 """row.querySelector(".l-del").onclick=()=>deleteWithUndo("Deleted the story entry",()=>{e.log=e.log.filter(l=>l.id!==x.id);touch(e);});""")
s = rep(s, """    row.querySelector(".l-edit").onclick=()=>{
      const tx=prompt("Entry text:",x.text);if(tx===null)return;
      const dt=prompt("Date (YYYY-MM-DD):",x.date);if(dt===null)return;""", """    row.querySelector(".l-edit").onclick=async()=>{
      const v=await askBox({title:"Edit the story entry",fields:[{k:"tx",label:"Entry",value:x.text,type:"textarea"},{k:"dt",label:"Date",value:x.date,type:"date"}],ok:"Save"});if(!v)return;const tx=v.tx,dt=v.dt||"";""")
s = rep(s, """tr.querySelector(".d-del").onclick=()=>{if(confirm("Remove this dependency?")){e.deps=e.deps.filter(d=>d.id!==x.id);touch(e);renderEpicDetail();}};""",
 """tr.querySelector(".d-del").onclick=()=>deleteWithUndo("Removed the dependency",()=>{e.deps=e.deps.filter(d=>d.id!==x.id);touch(e);});""")
s = resub(s, r'function depCheckIn\(e,x\)\{const who=x\.team\|\|"the other team";\n  const note=prompt\(.*?\);if\(note===null\)return;\n  const nd=\(prompt\(.*?\)\|\|""\)\.trim\(\);',
 'async function depCheckIn(e,x){const who=x.team||"the other team";\n  const v=await askBox({title:`Checked with ${who}`,fields:[{k:"note",label:"What did they say? (goes into the epic\'s Story — blank is fine)",type:"textarea"},{k:"nd",label:"New expected date, if they gave one",type:"date",hint:"Blank keeps "+(x.expected||"none")}],ok:"Log it"});if(!v)return;\n  const note=v.note||"",nd=(v.nd||"").trim();')
s = resub(s, r'function depSnooze\(e,x\)\{const who=x\.team\|\|"the other team";\n  const v=prompt\(.*?,"14"\);if\(v===null\)return;',
 'async function depSnooze(e,x){const who=x.team||"the other team";\n  const v=await askText(`Remind me about ${who} again in…`,{label:"Days — or a date (YYYY-MM-DD)",value:"14",ok:"Snooze"});if(v===null)return;')
wr(p, s)

p = S + "13-images.js"; s = rd(p)
s = rep(s, """if(!confirm("Delete "+im.file+" from the folder AND remove its record?"))return;""",
 """if(!await askOk(im.file+" is deleted from your images folder, and its record goes too. This can't be undone.",{title:"Delete this image?",ok:"Delete",danger:true}))return;""")
wr(p, s)
p = S + "15-run-sheet-handover.js"; s = rd(p)
s = resub(s, r'const mk=root\.querySelector\("#rs-mark"\);if\(mk\)mk\.onclick=\(\)=>\{\n      const v=prompt\(.*?,todayStr\(\)\);if\(v===null\)return;',
 'const mk=root.querySelector("#rs-mark");if(mk)mk.onclick=async()=>{\n      const v=await askText(`Basis imported all ${d.todo.length} item(s) into ${target}?`,{label:"Date of the import",type:"date",value:todayStr(),ok:"Record"});if(v===null)return;')
wr(p, s)
p = S + "16-search-menu.js"; s = rd(p)
s = rep(s, """if(!confirm("Restore snapshot from "+s.date+"? Current unsaved changes will be replaced."))return;""",
 """if(!await askOk("Changes not yet in your file are replaced.",{title:"Restore the snapshot from "+s.date+"?",ok:"Restore"}))return;""")
wr(p, s)
p = S + "23-notes-search.js"; s = rd(p)
s = resub(s, r'async function notesForget\(\)\{if\(!confirm\("Forget the notes folder\?.*?"\)\)return;',
 'async function notesForget(){if(!await askOk("Your .txt files are not touched — this only clears the copy this app keeps for searching.",{title:"Forget the notes folder?",ok:"Forget"}))return;')
wr(p, s)

left = []
for p in sorted(glob.glob(S + "*.js")):
    if p.endswith("25-selftest.js"): continue
    for m in re.finditer(r"\b(prompt|confirm)\(", rd(p)):
        left.append(os.path.basename(p))
print("browser pop-ups left:", left)

# =============== self-test ===============
p = S + "25-selftest.js"; s = rd(p)
s = rep(s, """   ok("Encryption warning shows while secrets are unencrypted",""", r"""   ok("One look: only Bench (Paper / Backlit) is offered",Object.keys(THEME_OPTS).every(k=>k.startsWith("bench"))&&benchOn());
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
   ok("Encryption warning shows while secrets are unencrypted",""")
s = rep(s, """["Close the day",()=>openCloseDay()],""", """["Close the day",()=>openCloseDay()],["Keyboard",()=>openKeys()],""")
wr(p, s)
print("phase 4a patch applied to", ROOT)
