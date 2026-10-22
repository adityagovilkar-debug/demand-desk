# Demand Desk — ideas not built yet

A running list of suggestions that haven't gone into the app, in the order I'd build
them. Nothing here is decided; pick, drop or reorder freely. Last updated 22 Oct 2026
(added: fixes and features suggested from a review of three weeks of real use).

## 0. Fixes found in real data (22 Oct 2026)

A. **The origin counts as reached.** Picking a whole landscape as a transport's route
   adds the origin system itself as a destination, which then shows as "still to reach"
   — so the only way to complete the transport was to log a fake sync to its own origin.
   Fix: the origin is always reached; landscape routes skip it.
B. **Logging a sync on an unreleased transport** should mark it released (or ask) —
   today a transport can be "not released" and already imported in three systems.
C. **Several demands sharing one ticket ID** look identical wherever only the ID is
   shown (effort charts and legend, week sheet, search titles, rail, clash warnings).
   Show "ID · short title" whenever the ID isn't unique — and let the week sheet
   **add up all demands of one ticket** (that's how a timesheet wants it).

## 1. Safety — worth doing before more features

1. **Built-in self-test** — open `DemandDesk.html?selftest`: it builds sample data in a
   sandbox (never your file), opens every page and tab in every theme, upgrades old-format
   data and checks nothing is lost, checks key numbers (rework, rounds, hours, review),
   and shows a green/red report. Run before every update; you can run it on the work
   laptop too.
2. **Newer-data guard** — an older copy of the app refuses to save a data file written by
   a newer version (today an older copy could drop fields it doesn't know, like estimates
   or requirement-change rounds).
3. **"Why is it coming back?" from the ✎ Edit dialog too** — today only the status
   buttons, the board and the dropdown ask; changing status inside Edit doesn't.

## 2. From how the app is actually used (22 Oct 2026)

7. **Next action as a chain of steps** — next actions get used as a running step list
   (dozens of "Next action done" entries). Make **✓ Done** ask "and the next step?" in the
   same box (date defaults to the next working day), and show the trail of done steps
   on the demand.
8. **A meeting's time, logged once** — meetings are recorded in Meetings *and* their hours
   logged again in Effort. Give a meeting a duration and log it automatically (against
   its linked demand or epic, else the Meetings bucket).
9. **Transport description from your naming pattern** — most transport descriptions follow
   one pattern ending in initials + a running number. When adding a transport, suggest the
   next one (same prefix, number + 1).
10. **One-to-one ToCs in one step** — some demands have a ToC per transport. "＋ ToC for this
    transport" creates and links it, copying the destinations; you type only the number.
11. **A Friday wrap-up on Today** — hours this week and missing days, plus "any win or
    lesson this week?" — wins and lessons are easy to forget in the moment.
12. **Stale debug sessions** — sessions stay "active" forever; flag ones untouched for two
    weeks on Today with one-click Resolved / Paused.

## 3. Finding things you didn't know to look for

4. **"Have I seen this before?" — the full version.** A panel that appears on its own:
   - lists **past demands, journal entries and meetings** (not only old .txt notes) that
     share objects or distinctive words with the demand you're on;
   - also appears while you **write a journal entry**;
   - matches on **rare words from the title and description**, not only exact IDs and
     object names (finds "cost-center filter" from 2023) — needs tuning to avoid noise.
   - when lessons exist, surface **lessons from similar demands** here.
   *(Today's "In your old notes" panel is the narrow first slice of this.)*

## 4. Looking back

5. **A readable copy every year** — export everything as plain text / Markdown files in
   folders by year, readable in Notepad even if this app is ever gone.

## 5. Small gaps

6. **Excel notes** — you chose .txt only for now. When wanted: paste rows copied from
   Excel into the notes (no file reading needed, so no library).

## 6. Suggested earlier — you passed on these (kept for reference)

- **Estimates from your own history** — suggest an estimate for a new demand from similar
  delivered ones ("report changes in Finance took you 18–26 h"). *(Estimates are unused so
  far, so this has nothing to learn from yet.)*
- **Archive closed demands** older than a year to a separate file (still searchable), to
  keep the main file small.
- **A second backup copy** written daily to a folder you choose (e.g. OneDrive).
- **Log time from the search box** — type `2h 10421 debug fixed zero totals` in Ctrl+K.
- **Subtask templates** — you wanted more usage data first.
- **Later, only if the file passes ~10,000 lines** — keep the code in separate files on
  my side and assemble the same single HTML for you (no difference on your laptop).
