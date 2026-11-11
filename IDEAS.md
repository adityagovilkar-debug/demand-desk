# Demand Desk — review and roadmap

A review of the whole app (10 Nov 2026) and the plan that came out of it, in the order
I'd build it. Nothing here is decided; pick, drop or reorder freely. Anything that
changes how the app looks goes to a mockup first.

How the review was done: the code was read end to end, the self-test was run (342
checks pass), and the app was timed on synthetic data of today's size and of about
five years of use.

## What the measurements say

- **Speed is not a problem and won't become one.** With about five years of data
  (500 demands, 1,300 transports, 6,500 time entries) the slowest screen draws in
  about 0.1 s and search answers in under 10 ms. Archiving old demands is not needed
  for speed.
- **The animations cost more than they should.** Every chart is redrawn at the
  screen's full frame rate, even when nothing on it moves. Sitting idle on Today or
  Effort uses roughly a tenth of a processor core; a page without charts uses almost
  nothing.
- **The browser backup is rewritten in full on every single change.** Fine today;
  in a few years the data outgrows one of the two backup stores (the other keeps
  working).
- **The file is one 840 KB page** with about 500 functions, edited by exact-text patch
  scripts. It works, but each change is slower and riskier than it needs to be.

## Decisions (answered 11 Nov 2026)

- **A — retire the classic themes: YES — done in v48.** Bench (Paper / Backlit) becomes the only
  look; the classic themes and their second copies of screens are removed. Done as
  part of Phase 4 (one coherent look), which is easier with one look to design for.
- **B — fold the Journal's to-dos into Tasks: YES — done in v48 (data v32).** Journal to-dos become one-line
  tasks (title, due date, done) and the Journal's to-do list goes; one list for
  things to do. Done with the Phase 4 clean-up, with a data upgrade that moves
  every to-do across, nothing lost.
- **C — split the source: YES** (already done in Phase 1).
- **D — encryption: NO.** The file stays unencrypted; nothing changes.

The original questions, for reference:

A. **Retire the three classic themes?** Bench (Paper / Backlit) is the look in use.
   The classic themes mean most screens exist twice (two demand cards, two headers,
   two Today layouts) and several past bugs came from the two colliding. Options:
   remove them, or freeze them (they keep working but get no new design work).
B. **Fold the Journal's to-do list into Tasks?** There are now four places a thing to
   do can live: a demand's next action, a Task, a Journal to-do and a meeting action
   point. Journal to-dos would become one-line tasks, so there is one list.
C. **Split the source on my side?** I'd keep the code in separate files and assemble
   the same single HTML for you. Nothing changes on your laptop. (You asked to hold
   this until the file got large; by content it now is.)
D. **Encryption.** If the file still holds passwords or secret references without a
   master password, turn it on. I'd also stop the reminder from being snoozed forever.

## Phase 1 — Foundations (no visible change) — DONE 10 Nov 2026

1. ✓ **Source in modules, one HTML out** — `src/` (shell, 8 style files, 26 code files)
   and `build.py`; the first build was byte-identical to the old file.
2. ✓ **A calmer animation loop** — 30 frames a second with focus, 10 behind other
   windows, none when hidden; charts that settle are left alone until the pointer,
   a resize or a theme change needs them. Idle cost on Effort fell from ~0.57 s to
   ~0.02 s of script per 5 s; on Today from ~0.43 s to ~0.10 s.
3. ✓ **Backup after a short pause** — about a second after changes stop, one store,
   flushed at once when the window hides or closes, the newer copy used on load.
4. ✓ **Self-test covers behaviour** — six new checks (348 in all): encryption
   round-trip, the changed-on-disk guard, the newer backup winning, Undo, the main
   dialogs, and ✎ Edit asking why.
5. ✓ **Mockups folder tidied** — 5.2 MB → 0.3 MB; patches and the sample data kept.
6. ✓ **"Why is it coming back?" from the ✎ Edit dialog too.**

## Phase 2 — The daily loop (where most of your clicks go) — DONE 11 Nov 2026

7. ✓ **An agenda on Today** — one ordered list for the day, above the cards: next actions
   due (demands and tasks), your own meeting action points, things due, follow-ups on
   what you're waiting for. **✓ Done** works right there and asks for the next step,
   so the next-action chain never needs the demand opened.
8. ✓ **Done → log the time** — ticking a step done offers to log time for it, already
   filled in (what, today, the step as the note). Joins the two things done most
   often, and closes the gap between hours worked and hours logged.
9. ✓ **Close the day** — one small sheet at the end of the day: the steps done, meetings
   held and demands touched today, each with an hours box, and what's left of the
   working day. *(Turns solid after 7.30 pm while the day is short.)*
10. ✓ **A meeting action point of yours becomes a Task in one click** (as Journal to-dos
    already do), keeping the link to the meeting.
11. ✓ **Show a feature's furniture only once it's used** — estimate panels and "over its
    estimate" notices appear after the first estimate exists; the same for other
    optional parts that are empty.

## Phase 3 — Transports and tickets (the core of the work) — DONE 11 Nov 2026

12. ✓ **A transport board** — one table of every transport still on its way, across all
    demands: number, demand, where it is, where it goes next, released or not, how
    long it has sat there. Filter by system or landscape; record an import for several
    at once. Today this is spread over the pipeline and each demand's tab.
13. ✓ **Move a ToC along a whole route in one go** — pick a route and one date.
14. ✓ **Unreleased for too long** — a transport that has stayed unreleased past a number
    of days shows on Today.
15. ✓ **Tickets as a light level above demands** — when several demands share a ticket
    ID: group the list by ticket, and show a strip on each demand with its siblings,
    their status, and the ticket's combined hours and transports.
16. ✓ **Handed-on demands going quiet** — a demand built by someone in your team with no
    update for a week shows on Today with a one-click "checked in" note.

## Phase 4 — One coherent look — DONE 11 Nov 2026 (v48, data v32; with decisions A and B)

17. ✓ **Line icons instead of emoji** — the app uses several hundred emoji as icons;
    in the Instrument look they are the odd ones out (as the pies and stamps were).
    Replace them with the icon family the side rail already uses, or plain labels.
18. ✓ **The demand page's tabs on one row** — nine tabs wrap onto two lines. Fold Linked
    and Images into the side panel (where they already show) and keep one row.
19. ✓ **Tasks and Meetings get the same header as Demands and Epics** — title, stat
    strip, bands — instead of a row of form fields.
20. ✓ **The Edit demand dialog in groups** — What / Where / When / Who, with the rarely
    used fields behind "More", instead of sixteen fields in two columns.
21. ✓ **In-app dialogs and Undo instead of browser pop-ups** — about forty places still
    use the browser's own prompt and confirm boxes. Deletes become "Deleted · Undo".
22. ✓ **A few more keys, and a "?" sheet listing them** — next action, done, log time,
    edit, move between workspaces.
23. ◐ **Finish Instrument v2** *(done: the Waiting tile's three longest waits, click a day in Next 10 weeks; still to do: the Journey as a rail, the Review month chart)* — the Journey as a rail, the Waiting tile listing the
    three longest waits, clicking a day in Next 10 weeks to see what's on it, the
    Review month chart.

## Phase 5 — Memory and looking back — DONE 11 Nov 2026 (v49, data v33)

24. ✓ **"Have I seen this before?" — the full version.** A panel that appears on its own:
    past demands, journal entries and meetings (not only old .txt notes) that share
    objects or distinctive words with the demand you're on; also while you write a
    journal entry; matching on rare words, not only exact IDs; lessons from similar
    demands shown there. *(Today's "In your old notes" panel is the first slice.)*
25. ✓ **A readable copy every year** — everything as plain text / Markdown files in
    folders by year, readable in Notepad even if this app is ever gone.
26. ✓ **Excel notes** — paste rows copied from Excel into the notes (no file reading).

## Suggested earlier — you passed on these (kept for reference)

- **Estimates from your own history** — suggest an estimate for a new demand from
  similar delivered ones. *(Estimates are unused so far.)*
- **Archive closed demands** older than a year to a separate file. *(Measured: not
  needed for speed.)*
- **A second backup copy** written daily to a folder you choose (e.g. OneDrive).
- **Log time from the search box** — type `2h 10421 debug fixed zero totals` in Ctrl+K.
- **Subtask templates** — you wanted more usage data first.
