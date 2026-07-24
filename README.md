# Demand Desk — ABAP Work Tracker

A single, self-contained HTML file for tracking ABAP demands/tasks, branching
subtasks, objects touched, and transport requests. **No install, no admin
rights, fully offline, portable.**

## How to run
Double-click `DemandDesk.html`. It opens in your default browser (use **Edge**
or **Chrome** for the best file experience). Nothing to install.

## Appearance
A **☀ / 🌙 toggle** in the header switches between the dark and light themes.
Your choice is remembered on this browser (it's a display preference, not part
of your data file) and applied instantly on the next launch with no flash.

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

## Portability
Copy `DemandDesk.html` **and** your `.json` data file to any folder, USB stick,
or OneDrive. Open the HTML there, then **📂 Open** the JSON. Identical anywhere.

## Workspaces (top nav)
**Today**, **Demands**, **Debug**, **Journal**, **Meetings**, **Playbook**, and
**🔒 Vault** — switch between them in the header. The search box (top, or `Ctrl+K`)
spans all of them.

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
- **Subtasks** — branch infinitely; each has its own received/due dates, a done
  checkbox, overdue highlighting, and its **own comments** (💬 button → thread).
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
  free-text note of what was done.
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

The demands sidebar has a **Hide closed demands** checkbox to keep the list
focused on active work.

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
The `.json` is **plain text, not encrypted** — it's as private as the folder it
lives in. Keep it on your own drive, not a shared location. (Optional password
encryption can be added later if you want it.)

## Keyboard
- `Ctrl+S` — Save
- `Ctrl+K` — Search
- `Alt+N` — New demand
