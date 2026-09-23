# Demand Desk — ABAP Work Tracker

A single, self-contained HTML file for tracking ABAP demands/tasks, branching
subtasks, objects touched, and transport requests. **No install, no admin
rights, fully offline, portable.**

## How to run
Double-click `DemandDesk.html`. It opens in your default browser (use **Edge**
or **Chrome** for the best file experience). Nothing to install.

## Appearance
The header button cycles **three themes**: **dark → light → instrument white →
dark**. The icon shows what you'd switch *to* (☀ light, ▦ instrument, 🌙 dark).

**Instrument White** is the scientific-plotter aesthetic from the Yantra
dashboard (see `instrument-white/`), the same one Team Desk offers: white paper
with a faint engineering dot-grid, hairline rules, corner registration tics on
every panel, uppercase silkscreen micro-labels, and tabular monospaced figures.
Colour is reserved for meaning — ink carries all structure, so anything coloured
is a real state. The pens are fixed for the life of the app:

| Pen | Used for |
|---|---|
| prussian `#1B4FA0` | Open · Development tier · links |
| ochre `#B07500` | In progress · QA tier · waiting & warnings |
| viridian `#0E7C63` | Delivered · Production tier · reached / good |
| cinnabar `#D93A1E` | Bug · overdue · expired (the "past a limit" pen) |
| violet `#6B3FA0` | projects · Transports of Copies |

Typography uses three faces, all stock on Windows so nothing needs installing:
**Bahnschrift** (Windows' DIN — the typeface of engineering drawings) for the
uppercase silkscreen micro-labels, **Cascadia Mono** for every figure (tabular,
so numbers don't jitter as they change), and Segoe UI Variable for prose. The
page sits on a faint engineering dot-grid, with each panel reading as a sheet of
paper laid on the blueprint.

Your choice is remembered on this browser (a display preference, not part of
your data file — so it also works on the lock screen) and is applied before the
first paint, with no flash.

## Saving your data
- Click **💾 Save** (or `Ctrl+S`). The first time, pick where to keep your
  `.json` data file (e.g. a OneDrive or Documents folder).
- After that, Save writes straight back to that file.
- **Auto-save** — once a file is connected, the app also writes to it
  automatically ~30 seconds after your last change (header shows
  "✓ Auto-saved"). No more forgetting Ctrl+S. Toggle it in the **⋯ menu**;
  the defensive save guard still applies (a suspicious or suddenly-empty
  state is never auto-written).
- **📂 Open** reconnects to an existing `.json` file — do this each time you
  reopen the app so it writes to the same file.
- Every change is also auto-mirrored to the browser's local storage as a safety
  net, so an accidental close won't lose work. The **⋯ menu → Restore** brings
  that back.

## 🧳 Handover pack
Today sidebar or ⋯ menu. One document for the colleague covering your open work
while you're away: who it's for, the away dates, an opening note, then an *at a
glance* table and, per demand, where it stands, the next action, open subtasks,
transports and what's still short of Prod, object clashes, reference entries
(secrets left out), debugging in progress with its resume note, latest comments
and open action points from linked meetings. It ends with other teams you're
waiting on (from the epics) and freezes / recurring duties (optionally your
to-dos) that fall in the period. Choose which demands go in (default: open work
plus delivered-but-not-in-Prod). Copy as Markdown, download .md, or print to PDF.

## Portability
Copy `DemandDesk.html` **and** your `.json` data file to any folder, USB stick,
or OneDrive. Open the HTML there, then **📂 Open** the JSON. Identical anywhere.

## Workspaces (top nav)
**Today**, **Demands**, **Epics**, **Debug**, **Journal**, **Meetings**,
**Playbook**, and **🔒 Vault** — switch between them in the header. The search box
(top, or `Ctrl+K`) spans all of them.

### Today (the cockpit — default landing)
A cross-cutting dashboard that pulls everything needing attention into one glance:
**Overdue**, **Bugs / Rework**, **Go-live: TRs not yet at Prod** (counting ToC
coverage), **Waiting on** (blocked demands), **Due this week**, **Open action
points** (from meetings), **My action items** (personal reminders),
**Recurring processes due** and **Freeze periods** (from the Playbook), **Stale**
(open, untouched 14d+), plus today's journal. Click any item to jump straight to
it. Empty sections are hidden; if everything's clear it says so. A first-run
**getting-started** guide appears when the data file is empty.

## Data safety
- **Defensive save guard** — the app refuses to overwrite your file (or the local
  backup) with a corrupted state, and asks for confirmation before saving an
  *empty* dataset over a file that had data. A freak bug can't silently nuke your
  work.
- **Local backup store** — uses **IndexedDB** when available (large, sturdier),
  automatically **falling back to localStorage** if IndexedDB is blocked (e.g. on
  a locked-down machine). Either way it's just a safety mirror; the `.json` file
  you Save is the source of truth. The ⋯ menu shows which store is in use.
- **Remember my file (🔌 Reconnect)** — when supported, the app remembers the
  `.json` you last used. On the next launch a **🔌 Reconnect** button appears in
  the header; one click (and a one-time browser "Allow") re-links it so Ctrl+S
  saves straight to your file — no need to 📂 Open every time. If your browser/IT
  blocks this, nothing changes: you just use 📂 Open as before. "Forget remembered
  file" is in the ⋯ menu.
- **Half-typed text is never lost** — fields normally commit when you leave them.
  Long text boxes (notes, journal, meeting notes, descriptions) now also commit
  after about a second's pause in typing, so the backup and auto-save include
  them. `Ctrl+S` and closing the window commit whatever field you're still in.
- **"⚠ File changed on disk"** — the app remembers the data file's timestamp from
  its own last save. If the file changed since (another tab, another PC through
  OneDrive, a copy restored over it), auto-save **pauses** instead of overwriting
  it, and a red notice appears by the Save button. Click it to either **load the
  newer file** (what was on screen is kept as a snapshot first) or **overwrite
  the file** with what's on screen.
- **Open in two tabs? You're warned** — a red banner appears in both copies when
  Demand Desk is open more than once, since both write to the same file and
  backup. It clears within about 40 seconds of closing the other copy.
- **Saves never overlap** — an auto-save and a `Ctrl+S` queue one behind the
  other, and anything you change *while* a save is writing stays marked unsaved
  and goes out with the next save.
- **Ctrl+S re-links your remembered file** instead of popping up a "Save as"
  dialog that could split your data into a second file.
- **Wrong-file protection** — 📂 Open refuses files that aren't Demand Desk data
  (e.g. Snip Desk `.marks.json` sidecars or Team Desk files in the same folder),
  and asks before replacing changes that haven't been saved yet (a copy is kept
  as a snapshot either way).
- **Locked means locked** — if you cancel the master-password prompt at start-up,
  the app stays covered until you unlock or open another file, so nothing can be
  typed into the empty placeholder and saved over your encrypted data.
- **Unreadable backup is set aside, not overwritten** — if the browser's backup
  is ever damaged, it's kept separately and you're told to 📂 Open your file.
- The browser tab title shows **●** while there are unsaved changes.
- Treat the saved `.json` as the source of truth; the local mirror and the 14
  daily snapshots are convenience/rollback only.

## Security & encryption
- **Optional master password** (Vault banner, or ⋯ menu) AES-GCM-encrypts the
  **entire** data file at rest using the browser's built-in Web Crypto
  (PBKDF2, 200k iterations). The local-storage mirror and snapshots are encrypted
  too. **There is no recovery if you lose the password.**
- **Snapshots follow the password** — turning encryption on immediately
  re-encrypts all stored daily snapshots (no plaintext copies linger); changing
  or removing the password re-keys them too.
- **Idle lock** — when encryption is on, the screen locks after 15 minutes of
  inactivity and asks for the master password again. Unsaved changes are kept.
- The Vault shows a red warning until encryption is on. Turn it on before storing
  real credentials. Even encrypted, revealed passwords are visible on screen while
  the app is open — lock your laptop.

### Demands
- **Tasks** — Demand ID, type, title, received & due dates, status, description,
  working-notes log, and a **timestamped comments thread**.
- **Quick status** — the status badge in the demand header is a dropdown: change
  it there without opening ✎ Edit. Every change is logged in History as before.
  A **closed** demand no longer counts as overdue or "waiting on" because of
  leftover subtasks or an old blocker.
- **⚠ Object clash warnings** — the same object being changed in two demands at
  once is how transports overwrite each other in QA/Prod. An object counts as
  *in flight* from the moment it's logged until the transports carrying it reach
  that demand's go-live system (objects marked *Analyzed*, and closed demands,
  never count; names match regardless of case/spaces). When two demands have the
  same object in flight you get:
  - a red line under the object on the **Objects** tab naming the other demand
    and where its copy stands (e.g. *In progress · H03K901000 at H02*) — plus a
    warning the moment you type a clashing name;
  - a **⚠ clash** badge on both demand cards and on the Objects tab;
  - a line on each **transport** that carries it ("agree the import order");
  - an **Object clashes** card on **Today**, a mark in the epic's object list,
    and an **only clashes** filter in **⌕ Objects**.
  Once you've agreed the order with the other demand, click **✓ Sequenced — stop
  warning**; that silences the pair on both demands (↺ Warn again undoes it).
  Clashes clear on their own when a transport reaches Prod or a demand closes.
- **📋 Transport run sheet** (Transports tab, and the epic's Transports section
  for every demand in the epic) — the import request for Basis. Pick the target
  system; it lists what still has to be imported there, in release order. A ToC
  replaces the TRs bundled in it, customizing TRs name their client, anything
  already in the target drops off, TRs from other landscapes are left out.
  Unreleased TRs, object clashes and active freezes are flagged. Add notes
  ("after 18:00"), then **Copy for email** (a formatted table for Outlook/Teams)
  or **Copy as text**. When Basis confirms, **✓ Mark all imported…** records the
  import on every listed transport/ToC in one go.
- **⏰ Next action** — "look at this again on…": a date plus what to do. Quick
  picks (tomorrow, next Monday, in 2 weeks…). It shows under the demand title and
  on its card, and the demand comes back on **Today → Next actions due** on that
  date. **✓ Done** notes it in History and clears it. A demand parked with a
  future next action isn't counted as stale.
- **Delete safety** — deleting a subtask that has sub-subtasks or comments, a
  numbered transport (its sync history goes with it) or a named object asks first.
- **Subtasks** — branch infinitely; each has its own received/due dates, a done
  checkbox, overdue highlighting, and its **own comments** (💬 button → thread).
- **Source system & client** — where the demand lives, e.g. `H03` / client `010`.
  The system is picked from your landscape grid and the client list follows the
  landscape (so H1x offers 030/040/050/150/190/560). It shows as a tier-coloured
  chip on the card and in the demand header, filters the sidebar (**All systems**),
  is searchable, and appears in the Tech Spec and Epic brief. New demands default
  to your default system; a new transport starts from the demand's system.
- **Project & Theme** — two grouping dimensions on each demand. **Project** = a
  named initiative spanning many demands (e.g. "Sailpoint integration"); **Theme**
  = a functional area (e.g. Travel, TRem, Payroll). Both have reuse-suggestions
  (type-ahead), filter the sidebar, are searchable, and appear in the Tech Spec.
  The **▦ Portfolio** button gives a rollup grouped by Project or Theme — every
  demand, plus the aggregated objects and transports, for "all work done for X".
- **Requestor** — "who asked" per demand, shown on cards/header and filterable
  in the sidebar (handy when management circles back months later).
- **⏳ Waiting on** — flag a demand as blocked (QA team / Functional / Transport
  import / …) with a since-date; shows an amber badge with days-waiting on the
  card/header and surfaces in the Today dashboard.
- **Object ↔ Transport linking** — on each transport, tick which objects it
  carries ("Objects in this TR"); each object then shows which TRs delivered it
  (many-to-many — the same object can be in several TRs). Also reflected in the
  object index and Tech Spec.
- **History tab** — auto-logged status-change timeline with delivery dates and a
  **rework-cycle counter** (delivered → bug → redelivered), for QA bugs found late.
- **Reference** — key facts & artifacts you created for the demand: API proxy
  URLs, endpoints, credentials, config, RFC destinations, spec links, etc. A
  flexible label→value list. Mark an entry **secret** to mask it (reveal + copy,
  excluded from search, protected by file encryption); **pin** important entries
  to surface them at the top of the Work tab. Non-secret entries flow into the
  Tech Spec; secrets show as label only.
- **📄 Tech Spec** — generate a post-delivery technical specification from
  everything captured (requirement, work breakdown, objects, transports, linked
  call decisions, notes, requestor, delivery/rework history). Copy as Markdown,
  download `.md`, or print to PDF.
- **⌕ Objects** (sidebar) — object cross-reference index: pick an object and see
  every demand and transport that touched it.
- **📈 Aging** (sidebar) — open demands ranked by age (days since received, days
  in current status, waiting-on), red >30d / amber >14d, plus delivery lead-time
  stats (received → first delivered: average, median, and rework counts).

### Debug
A debugging workbench per investigation, so a weekend gap doesn't lose you:
- **▶ Resume here** — a highlighted box at the top for "where I left off / what to
  try next".
- **Objects involved** — searchable, and folded into the ⌕ object index (so a
  recurring issue months later is one search away).
- **Breakpoints** — object / include, line, condition, hit flag, note.
- **Findings log** — timestamped entries tagged Works ✓ / Fails ✗ / Dead-end ⊘ /
  Note, newest first.
- **Variable watches** — variable, value/observation, where (object · line).
- Optional **Demand ID** and a link to an existing demand; a status
  (Active/Paused/Resolved/Abandoned). Linked sessions appear on the demand's
  **Linked** tab (amber 🐞 cards), so a demand shows its debugging history.

### Vault
Stores user IDs & passwords for the H-systems (system picked from the landscape
grid), with an optional **Client (mandant)** per credential — drawn from that
system's landscape client list, the same clients used by customizing transports.
Credentials are **grouped by landscape** (Landscape H0, H1, …, with an Unassigned
group for credentials without a system) and **sorted by System, then Client, then
Label** within each group, so big landscapes stay scannable. Passwords are masked
with reveal + copy buttons. Protect it with the master password (see Security
above).
- **Objects touched** — name, type, action (Created/Modified/Deleted), and a
  free-text note of what was done. The **type** list is yours to edit: **⚙ Types**
  on the Objects tab (or ⋯ menu → *Object types*) lets you add, rename, reorder
  and remove entries, with **↺ Restore defaults** to go back to the built-in list.
  Each row shows how many objects use that type; renaming or removing one never
  touches objects already logged — a removed type simply stops being offered and
  still shows on the objects that carry it.
- **Transports** — TR number, description, origin system, released flag, and a
  list of **sync targets** (each system + import date). Transports are **ordered**
  (release order; reorder with ↑↓).
  - **Workbench vs Customizing** — each TR is marked **🔧 Workbench**
    (client-independent — moving H13 → H12 copies across all clients, so no
    client is shown) or **🗂 Customizing** (client-dependent). A customizing TR
    carries one **client / mandant** (picked from its landscape's client list),
    which is preserved across the track (H13/150 → H12/150 → H11/150) and shown
    on every sync chip, the go-live badge, CSV, and the Tech Spec. Customizing
    cards get a teal edge. A single demand can carry customizing TRs for
    different clients (one for 120, one for 190) — each keeps its own.
  - **Client lists** are maintained per landscape in the **⋯ menu** ("🗂 Clients
    per landscape"), so the landscape grid and pills stay uncluttered. e.g.
    H0 → 010; H1 → 030, 040, 050, 150, 190, 560.
  - **Transports of Copies (ToC)** are first-class: a ToC has its own number and
    its own sync targets, and you bundle TRs into it. A bundled TR then **inherits
    the ToC's downstream systems** — so 9-10 TRs carried to Prod by one ToC show
    "reached H01 via ToC" instead of looking stuck in QA.
  - **Go-live coverage check** (top of the tab) — pick a target system (defaults
    to the production tier of the origin landscape) and it flags any TR that
    hasn't reached it (counting ToC coverage), so you don't miss a TR before
    go-live. The chosen target is remembered **per demand**.
- **Linked** — everything tied to this demand in one tab, clearly differentiated:
  **👥 Meetings**, **📓 Journal entries** (teal), and **🐞 Debug sessions**
  (amber, with their status). Link any of the three right from the tab, or from
  their own sections. Click a card to jump to it.
- **Images** — screenshots attached to the demand (see *Images & screenshots*
  below).

**The demand list view** — the top of the Demands sidebar has four parts:

1. **Saved views** — one-click chips. Five starter views come built in:
   **My active** (open, in progress and bugs, grouped by epic, by due date),
   **Go-live** (transports not yet in Prod, grouped by system), **Waiting**
   (longest wait first), **Clashes** (demands with object clashes) and
   **Everything** (most recently updated first). The chip for the view you're on
   is highlighted; change anything and a **★ Save view** chip appears to keep the
   new combination under a name.
2. **Quick filter box** — type part of a demand ID, title, object name, TR or ToC
   number, requestor, project, theme, system or epic; the list narrows as you
   type (several words must all match). `Esc` clears it.
3. **⚙ View** — one panel for everything else, applied live as you click:
   - **Group by:** no grouping, epic, epic wave, status, system, project, theme,
     requestor, demand type, due date (overdue / within 7 days / within 30 days /
     later / none) or next action.
   - **Sort by:** due date, next action, received, last updated, age, time waiting,
     status, object clashes, demand ID or title — ascending or descending. Demands
     with no value (no due date, not waiting…) always go last.
   - **Show:** tick statuses (none ticked = all), hide closed / delivered, and
     *only* demands that are overdue, waiting on someone, with object clashes,
     with transports not yet in Prod, or with a next action due. Plus dropdown
     filters for epic (or "no epic"), system, project, theme, requestor and type.
   - **Saved views** at the bottom: click a name to apply it, ← to move it left,
     ✎ to rename, ✕ to delete, and **↺ starter views** brings back any built-in
     view you deleted. **Reset** returns to a plain, ungrouped due-date list.
   The small number on the ⚙ View button counts the active filters.
4. **Summary chips** — what the current view is doing, e.g. `Group: Epic` ·
   `Due date ↑` · `System: H03`. Click the group chip to open the panel, click the
   sort chip to reverse the order, and ✕ on any filter chip to drop it
   (**clear filters** removes them all).

A **shown** counter appears in the stats row whenever the view hides some demands.

**Groups** — each group is a collapsible block with a header that sticks to the
top while you scroll. It shows how many are open and shown (e.g. `2 open · 3`,
or `2/3` when filters hide some of an epic), an ⚑ count if any are overdue, and
for epics a **›** to jump to the epic. Click a header to collapse it; collapsed
groups are remembered separately for each grouping, and a group re-opens by
itself when the demand you're working on is inside it. The sort order still
applies inside every group.

The view, saved views and collapsed groups are remembered per browser and are
**not** stored in your data file.

### System landscape
Sync targets are picked from your landscape grid, generated from `H0`–`H6` ×
tier digit: **x3 = Development, x2 = Pre-prod/QA, x1 = Production** (e.g. `H03`,
`H02`, `H01` … `H63`). Colour-coded by tier. Edit the landscape list in the
**⋯ menu**. Every system code is searchable — type `H42` to find every transport
that touched it. **Clients (mandants)** for each landscape are also set in the
⋯ menu and used only by customizing transports (see Transports above).

### Meetings
One unified place for **calls and team meetings** (the old Calls and Team tabs
are merged here). Each meeting has a date, a **Team** field (e.g. "Portal Team",
"FI" — type-ahead suggests teams you've used) so you can classify meetings for
the different teams you manage, an attendees list, free-form notes, **linked
demands** (chips + 🔗 link button — these show under a demand's *Linked* tab),
and **action points** (text, owner, due date, done).
- The sidebar has a **team filter** and open-action counts.
- The pinned **⚑ All open action points** entry rolls up every open action across
  all meetings, sorted by due date and filterable by **team** and **owner** — so
  you can see just the Portal Team's open items, or just Anjali's.
- **↳ Outcome / resolution notes** — every action point has a 📝 button to record
  the answer (e.g. "Confirmed: cutover on 15.08"). The note stays with the point
  after you close it — the question and its answer live together — shows in the
  rollup, and is searchable. Click the teal ↳ line to edit it.

### Journal
- **Daily entries** — one consolidated rough-notes entry per day.
- **Linked demands** — link an entry to the demand(s) the notes are about
  (chips + 🔗 button); linked entries appear on the demand's *Linked* tab.
- **✅ My action items** — a single running personal to-do list (reminders and
  internal tasks not tied to any demand or meeting). Open via the pinned entry at
  the top of the Journal sidebar; items persist across days until you tick them,
  and open items also surface on the Today dashboard. Add with a due date, tick
  to complete, add ↳ outcome notes (📝), clear completed in one click.

### Epics
Group related demands under one initiative. A **LUCA** epic might hold three
separate demands — set up a connection, build a report, modify a standard object
— which stay independent so each keeps **its own transports and go-live target**,
even when they share a ticket number.

An epic is a real record, not just a label: **code** (e.g. `LUCA`), name,
description, owner, target date, status (Active / On hold / Delivered / Closed),
**my role** (*Lead* — I own it, or *Contributor* — I deliver one slice of a bigger
programme) and **my part / scope**. Epics often run for more than a year, so the
detail page has four tabs:

**Overview** rolls up everything underneath it:
- **Demands, grouped by wave** — give each demand a *Wave / phase* in its ✎ Edit
  dialog (`Wave 1`, `Wave 2`, `Sync to backends`); waves are listed in the order
  they arrived, each with a done count and its own **🎯 target date** (set it
  right on the wave header; it shows "in 9d" / "6d over", and waves due within
  21 days appear on **Today** under *Waves nearing target*). Per demand: status, waiting-on flag,
  received date, outstanding go-live TRs and next due date; click through.
- A **⏸ Parked** banner when other teams still owe you something and none of your
  own demands are in flight, with how long you've been waiting.
- **Go-live readiness across the epic** — one line telling you whether *every*
  transport on *every* demand has reached its target, and which haven't (with a
  ❄ warning if the target system is inside a freeze period).
- **Objects touched** and **Transports** — the full cross-demand list, so "what
  did LUCA actually change?" is one screen.

**Story** — the epic's whole history on one timeline, grouped by month, newest or
oldest first. Add your own dated entries (📝 note, 🏁 milestone, ⚖ decision,
📞 follow-up) and **back-date them freely** to reconstruct what happened last
year. Woven in automatically: each demand's arrival, status changes and history
notes, transports reaching each system, meetings and journal entries linked to
the epic's demands, epic status changes, and when other teams started blocking
you or delivered. Toggle sources on/off with the chips.

**Linking meetings and journal entries to an epic.** Calls about the initiative
as a whole don't have to be pinned to one demand: a meeting or journal entry's
**🔗 Link** dialog now lists epics above demands, or use **🔗 Meetings** /
**🔗 Journal** on the epic's Story tab. Linked epics show as ◆ chips; either kind
of link puts the item in the epic's Story.

**Waiting on others** — for the months when your part is done but can't be
transported until another team finishes. One row per dependency: team, what they
owe, waiting since, expected date, last contact. **📞 Checked in** asks what they
said (and a new expected date, if any) and writes it into the Story;
**✓ Delivered** closes it and records how long it took. **💤 Later** snoozes the
nudges until a date you choose (a number of days, or a date) — e.g. "they said
nothing happens before the November release"; ✕ cancels it, and a check-in
clears it. A row turns *follow-up
due* when its expected date passes or nobody has chased it for N days (30 by
default, set per epic) — those appear on **Today** as *Epic follow-ups*, and as
📞 / ⏸ badges on the epic list.

**Subtasks** — a branching checklist for work that belongs to the initiative, not
to any single demand (alignment calls, cut-over prep, the hand-over note).

**📄 Epic brief** turns all of it into one document — scope, demands by wave,
dependencies, go-live readiness, objects, full story — to copy as Markdown,
download, or print to PDF. Useful for handovers, or when someone asks what
happened a year ago. Story entries, dependencies and epic subtasks are all in
Ctrl+K search.

Assign demands from the epic (**🔗 Assign demands**) or from the demand's own
✎ Edit dialog. Deleting an epic never deletes demands — they just become
un-grouped. Epics also appear on **Today** as they near their target date, and
as a third dimension in the **▦ Portfolio** rollup.

**Epic vs Project vs Theme** — all three coexist: an *Epic* is a first-class
record grouping demands; *Project* and *Theme* remain free-text labels for a
named initiative and a functional area (Travel, TRem, Payroll).

### Playbook
Your team's tribal knowledge — the stuff that otherwise dies in old mails and
long Teams chats — kept in one searchable place. One flexible entry type with
five **kinds**, all sharing a title, a **category** (free text with type-ahead:
Access, Go-live, Payroll, …), free-text notes (URLs become clickable), pasted
screenshots, and a 📌 pin to float important entries to the top:

- **📋 Process / How-to** — numbered, reorderable steps ("Request a new role",
  "Go-live mail — who to include"). 🖨 Print any entry to hand to a new joiner.
- **❓ FAQ** — the title is the question, the notes are the answer.
- **🔁 Recurring task** — a due date plus cadence (annually / quarterly /
  monthly / one-off). Surfaces on **Today from 14 days before it's due**;
  "✓ Done" advances it to the next occurrence automatically (month-end dates
  clamp correctly — Jan 31 → Feb 28).
- **❄ Freeze period** — from/to dates plus the frozen systems (toggle them on
  the landscape grid). Shows on Today from 14 days before it starts, and while
  active **every demand's go-live check warns** if its target system is frozen
  ("❄ H01 is FROZEN until 31 Dec").
- **👥 Contacts / Responsibilities** — name · role · contact tables per product
  or area ("Payroll product — responsible people").

The sidebar filters by kind and category; everything is in Ctrl+K search —
type "password reset" months later and the procedure appears.

### Images & screenshots
Attach screenshots (code, chats, bugs) to **demands** (Images tab), **meetings**,
**journal entries** and **playbook entries** — without ever bloating the data
file:
- Images live as **plain files in a folder you pick** (⋯ menu → 📷 Images
  folder, or the Connect button in any Images section). The `.json` stores only
  a record: filename, label, expiry, links. **No image data enters the JSON.**
- **Paste to attach** — snip with **Win+Shift+S**, open the demand / meeting /
  journal entry, press **Ctrl+V**: the PNG is written into your folder
  (`dd-YYYYMMDD-HHMMSS.png`) and attached in one step.
- **＋ From folder** — attach files already in the folder (e.g. saved by
  Snip Desk, the companion screenshot annotator); one image can attach to
  several places.
- **Expiry for data hygiene** — every image gets an expiry date (default 90
  days, configurable in the ⋯ menu; blank = never). Expired images get a red
  badge and surface in a **🧹 Expired images** card on Today; the 🗑 button
  deletes the actual file from disk plus its record. ⛓ unlinks without deleting.
- Thumbnails and a click-to-zoom lightbox render straight from the folder;
  labels are searchable (Ctrl+K).
- If the folder isn't connected on a given day, records still show (with a
  connect prompt) — nothing is lost.

### Exports & backups
- **Transports → CSV** (⋯ menu, or the **⬇ CSV** button on a demand's Transports
  tab) — one row per transport across every demand, opens cleanly in Excel.
- **Tech Spec → Markdown / .md / PDF** — per demand (see above).
- **🗓 Weekly summary** (Today sidebar, or ⋯ menu) — a status report for any week:
  demands delivered / bugs raised / new / closed, every transport movement,
  meetings (with open-action counts), debug findings and the week's journal
  entries. Browse
  previous weeks with ◀ ▶; copy as Markdown, download `.md`, or print to PDF —
  ready for your status call.
- **Daily snapshots** — up to 14 are kept automatically on Save; restore any from
  the ⋯ menu (encrypted if encryption is on). Restoring marks the app "unsaved"
  so you remember to write it to your file.

### Global search (`Ctrl+K`)
One box across demands, objects, transports, **system codes**, subtasks,
meetings, action points, personal to-dos, journal, vault — and **comments** on
demands and subtasks too.

### Clickable links
Any `https://…` URL becomes clickable: in comments and debug findings it renders
as a link; non-secret Reference values get a **🔗 open** button; and a row of
link chips appears under the notes fields (demand notes, journal, meeting notes)
collecting every URL found in the text.

## A note on "secure"
Unless you set a master password (see *Security & encryption*), the `.json` is
**plain text** — it's as private as the folder it lives in. Keep it on your own
drive, not a shared location.

## Keyboard
- `Ctrl+S` — Save
- `Ctrl+K` — Search
- `Alt+N` — New demand
- `Ctrl+Enter` — create / save in the demand dialog
- `Esc` — close the open dialog or image (a half-filled demand asks first)
