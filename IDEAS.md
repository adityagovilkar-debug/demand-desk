# Demand Desk — ideas not built yet

A running list of suggestions that haven't gone into the app, in the order I'd build
them. Nothing here is decided; pick, drop or reorder freely. Last updated 11 Oct 2026.

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

## 2. Finding things you didn't know to look for

4. **"Have I seen this before?" — the full version.** A panel that appears on its own:
   - lists **past demands, journal entries and meetings** (not only old .txt notes) that
     share objects or distinctive words with the demand you're on;
   - also appears while you **write a journal entry**;
   - matches on **rare words from the title and description**, not only exact IDs and
     object names (finds "cost-center filter" from 2023) — needs tuning to avoid noise.
   *(Today's "In your old notes" panel is the narrow first slice of this.)*
5. **A lesson when you close a demand** — an optional prompt: "what would you tell
   yourself next time?". Lessons are searchable and show up in #4 on similar demands.

## 3. Looking back

6. **Browse by month** — pick any month (say March 2023) and see everything from it on
   one timeline: demands received and delivered, journal, meetings, hours, wins, old
   notes. For when you remember *when* something happened, not what it was called.
7. **A readable copy every year** — export everything as plain text / Markdown files in
   folders by year, readable in Notepad even if this app is ever gone.

## 4. Small gaps

8. **Effort dots on the Overview journey** — the mockup showed dots under the days you
   worked; the Overview has the Effort gauge but the journey line doesn't show the days.
9. **Excel notes** — you chose .txt only for now. When wanted: paste rows copied from
   Excel into the notes (no file reading needed, so no library).

## 5. Suggested earlier — you passed on these (kept for reference)

- **Estimates from your own history** — suggest an estimate for a new demand from similar
  delivered ones ("report changes in Finance took you 18–26 h").
- **Archive closed demands** older than a year to a separate file (still searchable), to
  keep the main file small.
- **A second backup copy** written daily to a folder you choose (e.g. OneDrive).
- **Log time from the search box** — type `2h 10421 debug fixed zero totals` in Ctrl+K.
- **Subtask templates** — you wanted more usage data first.
- **Later, only if the file passes ~10,000 lines** — keep the code in separate files on
  my side and assemble the same single HTML for you (no difference on your laptop).
