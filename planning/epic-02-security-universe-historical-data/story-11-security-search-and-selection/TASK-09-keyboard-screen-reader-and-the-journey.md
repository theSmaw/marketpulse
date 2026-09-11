# Task 2.11.9 — Keyboard, screen reader, and the journey a browser walks

**Status:** Not started
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.8

## Objective

Prove the story's third and sixth acceptance criteria against a real browser:
**the whole flow is operable by keyboard alone and announces itself correctly**,
and **a browser journey covers search → open → the security's page.**

This is a task rather than a pass at the end of another one because the story
says so explicitly and because the reason is structural: this is the first
genuinely interactive control in the product, and whatever is settled here is the
pattern every control after it is measured against. A keyboard walk is also the
only level that can see several of these defects — an axe pass is a floor and not
accessibility coverage, and no stylesheet is applied in the test environment, so
a browser is the only place contrast and focus visibility can be observed at all.

## Amended 2026-09-11 by Task 2.11.4 — what the browser suite already covers

Four of this task's assertions exist, so the work here is the **journey** rather
than those pieces. `e2e/specs/securities-route.spec.ts` now covers:

- **Search → open, by pointer.** Typing and clicking a result lands on
  `/securities/NVDA`. This is half of "a browser spec covers search → open → the
  security's page"; the other half is the page's own content, and the keyboard
  version of the same flow is still owed.
- **Axe over the open result surface**, which the three existing axe runs never
  saw because they never type.
- **The tab order**, asserting the field sits between the navigation and the
  table's region.
- **The arrival's motion**, and that it does not replay on every keystroke.

What is untouched and is the substance of this task: the numbered keyboard flow
walked end to end, **where focus lands after a result is opened**, Shift-Tab back
into the control, Back from a security to the list, the failure journeys, and the
screen-reader pass — which no automated check in this repository can stand in
for. Arrow keys, Escape and the spoken sentence are proved at the component level
only, where no screen reader exists and nothing is focused or blurred.

## Amended 2026-09-11 by Task 2.11.5 — two more pieces exist, and one bullet below was wrong

`e2e/specs/security-navigation.spec.ts` adds two assertions this task would
otherwise have written:

- **A table row's symbol opens on Enter**, reached with `press` so the focus and
  the key are the real path rather than a click wearing a keyboard's name. That
  is the keyboard half of "open a security" for the **table**; the keyboard half
  for the **search surface** — arrow keys and Enter, in a browser — is still
  owed here.
- **Back, walked in a browser**, though for the cache rather than for the
  keyboard: the sequence symbol → symbol → Back is asserted end to end without a
  document load.

**And it corrected the "Back" bullet below**, which asserted the opposite of what
the product does. See it — it is the one instruction in this file that would have
sent the walk looking for a behaviour that is not there, or worse, "fixing" one
that is correct.

**One thing this task now inherits that did not exist when it was written:** the
tracked universe is **518 links in the tab order**. Tabbing from the search field
to anything below the table is 518 stops. Nothing about that is wrong — every
one of them is a real destination and a skip link is the conventional answer —
but it is a keyboard-walk finding waiting to happen, it is invisible to axe, and
this is the task that owns it. Measure how many Tab presses it takes to get
past the table before deciding whether it needs one.

## Amended 2026-09-11 by Task 2.11.6 — one bullet below is done, and one finding is handed to this task to settle

**The failure journey is written.** The _"Add the one this story introduces:
with the backend unreachable, the control says so and the rest of the screen
stays usable"_ bullet in Work is discharged — `securities-route.spec.ts` now
holds three specs that did not exist when this file was written, each with an
axe run against a state the gate had never seen:

- search unavailable (the universe fetch refused), asserting the field is
  present, disabled, says why, and that the page carries **one** `Try again`
  rather than two;
- a query typed while the universe is still loading, asserting the field is
  live, the query is kept, and that nothing says "no matches";
- a query that matches nothing, asserting the sentence, the absence of a
  `listbox` and `aria-expanded="false"`.

What is still owed here is the keyboard and screen-reader half of those states,
which is the next paragraph.

**A finding this task should settle rather than inherit silently: in three of
the eight states the field is `disabled`, and a disabled input is not
focusable.** Its reason — _"Nothing to search yet: the tracked universe did not
answer…"_ — is wired to the control through `aria-describedby`, which is read
**when the control is reached**. It cannot be reached. So the sentence is on
screen and legible by browsing, and it is never announced as part of the
control, for the one user who most needs to be told why tabbing past a search
box was the right thing to do.

That is a real question with more than one defensible answer — `readOnly`
instead of `disabled`, which stays focusable and is a state `TextField` already
has; the sentence moving to a region that is read on arrival; or leaving it,
because the tracked universe's own failure block is in the tab order two stops
later and says more. It was not settled in 2.11.6 because **the walk is the only
thing that can settle it**, and guessing at it from the DOM is exactly what this
task exists not to do. Whatever is decided goes into
`SEARCH-AND-SELECTION.md` with its reason.

**And the live region has a fifth sentence to listen for.** `Security search:
still loading securities. "nv" is kept.` — spoken 400 ms after a keystroke made
while the universe is in flight. It is the only one of the five a person hears
while something else on the page is also arriving, so it is the one worth
listening to with the other two regions live.

## Amended 2026-09-11 by Task 2.11.7 — the page this walk crosses is a different page, and the "518 tab stops" note above is wrong

The Security Explorer is now §8.3's shell: an identity block, seven regions on a
grid, and the tracked universe last. Three consequences for the walk, and the
second is a correction rather than an addition.

**1. The page went from two focusable regions to eight.** `Region` renders a
`Panel` with `scrollable`, which is `overflow: auto` **and** `tabIndex={0}`
together — Task 1.13.4's fix for `scrollable-region-focusable`, applied to every
region rather than the ones currently overflowing. So each of the shell's seven
regions is a tab stop, and **six of them contain nothing focusable at all**: a
heading, a sentence, and a dashed placeholder. Tabbing onto a named landmark that
holds no control is not a defect — it is how a keyboard user reaches content they
would otherwise have to scroll to — but six of them in a row between a search
field and a table is a thing to _hear_ before deciding it is fine. This is the
task that owns that judgement, and nothing automated can make it.

**2. The inherited note above is false in its premise. Corrected, with the
measurement.** It reads: "the tracked universe is **518 links in the tab order**.
Tabbing from the search field to anything below the table is 518 stops."
**There is nothing below the table.** Measured on `/securities/NVDA`,
2026-09-11:

|                                                         |                           |
| ------------------------------------------------------- | ------------------------- |
| Focusable elements on the page                          | **531**                   |
| Tab stops from the search field to the first table link | **8** (the eight regions) |
| Table links                                             | **518**                   |
| **Tab stops after the last table link**                 | **0**                     |

A skip link would therefore buy back **nothing on this route**, because past the
table is the end of the document. Walk it before agreeing with that — the
argument for one may survive on a different route, or on the grounds that
reaching the end of the document is itself the problem — but do not walk it
looking for the cost the original note describes, because that cost is gone.
[Task 2.11.8](TASK-08-the-universe-table-past-500.md) has the same correction and
is asked to decide whether its rail is also the way past.

**3. The journey's destination is richer, and is worth asserting as such.** "Search
→ open → the security's page" used to land on a heading and a panel of numbers.
It now lands on an **identity block naming the company** — symbol, name,
`SECTOR · INDUSTRY · EXCHANGE`, and the last session close with its grain stated.
That is the sentence the criterion is really about, and it is what a screen reader
should be heard to reach after a result is opened. Note the block is deliberately
**silent** — it carries no `role="status"`
(`SEARCH-AND-SELECTION.md` §4's amendment) — so what to listen for is that
nothing is announced by it, and that the page still speaks exactly three
sentences.

**One thing not to re-find:** the shell holds **no state**, so there is nothing
in it that survives a change of symbol wrongly. Task 2.11.5's trap was answered
by not walking into it.

---

## What the user can see when this lands

**Nothing new drawn** — and quite a lot fixed. Whatever the walk finds is fixed
here rather than filed: focus that goes somewhere useless after opening a result,
an Escape that loses a query, a sticky band covering the element that was just
focused, a sentence announced with no subject in it.

## Work

- **The keyboard walkthrough, written down as a numbered flow** and then walked:
  reach the field, type, move through results, open one, get back. State what
  each key does and **where focus lands after each transition** — focus after a
  result is opened is the one most often left to chance, and landing at the top
  of a new document is not the same as landing on it.
  - Enter with zero, one and many results
  - Escape with the list open, and Escape again
  - Tab out of an open list
  - Shift-Tab back into the control
  - The control reached from the table, and from a security's page
  - **Back, from an opened security to the list — added 2026-09-11 by Task
    2.11.1. ~~The query is component state and does not survive it, so Back lands
    on the list with an empty field.~~ Corrected 2026-09-11 by Task 2.11.5:
    the field KEEPS its query.** The original sentence followed from "the query
    is component state" only while every navigation reloaded the bundle. It does
    not now: `/securities` and `/securities/:symbol` are two `<Route>`s rendering
    the **same** module, so React re-renders `SecurityExplorer` rather than
    re-mounting it. Measured in Chromium — the field still reads `nvid` after
    opening NVDA, after Back, and after a table-row click.

    So the sentence to state in the numbered flow is **"Back keeps my search"**,
    which is the friendlier of the two and was kept for that reason
    (`SEARCH-AND-SELECTION.md` §3's dated amendment). It is still a decision to
    say out loud rather than a defect to file, and if walking it makes a case
    that it is wrong, that is still an amendment to §3 rather than a fix here.

    This is also still the step where the third polite region must stay silent —
    and the mechanism is now different and worth listening for. The region is not
    unmounted and its sentence is not cleared, because the query that derived it
    survived; nothing changes, so nothing is announced. **What to check is that
    a screen reader does not re-read the retained sentence on arrival**, which is
    the one way this could be worse than the empty field would have been.

- **The screen-reader pass**, done with a real screen reader rather than inferred
  from the DOM. What is announced when the list opens, when the active option
  changes, when results settle, and when a security opens. Every sentence names
  its subject — this page has two polite regions already and a third is a
  decision (`FRONTEND-STATE.md` §7). **Amended 2026-09-11 by Task 2.11.1: the
  decision is taken and there are three.** Search's region speaks 400 ms after the
  last keystroke and quotes the query. What this pass is listening for is whether
  that rate is right in practice — whether it speaks over somebody still typing, or
  arrives late enough to feel disconnected from what they did. That is §4's own
  reversal trigger, and this task is its first real opportunity.

- **The browser journey.** A spec in `e2e/specs/` covering the criterion as a
  sentence: search for a security, open it, and land on its page with its bars.
  Read `e2e/README.md` first — it holds what a spec must not assert, and the
  suite's rules are not the same as the component suite's.

- **The keyboard journey in the browser too**, at least once end to end. It is
  the only assertion that catches a focus trap or an element covered by a sticky
  header, and both are invisible to jsdom and to axe.

- **The failure journeys.** `backend-failure-states.spec.ts` already walks every
  route asserting its `<h1>` with the backend down; search must not collapse the
  page and the existing assertions must still hold. Add the one this story
  introduces: with the backend unreachable, the control says so and the rest of
  the screen stays usable.

- **The axe gate stays at zero violations**, in the workshop and wherever else it
  runs. Note the asymmetry recorded in `CLAUDE.md`: axe is a **gate** before the
  merge and a **report** after it, and the two scopes answer different questions
  and are never compared.

## Done when

- A numbered keyboard flow exists in `SEARCH-AND-SELECTION.md`, and every step of
  it has been walked in a real browser
- Focus after opening a result is decided, implemented and asserted
- A screen-reader pass is recorded — what was heard, in order, and what was
  changed because of it
- A browser spec covers search → open → the security's page, and a second covers
  the same flow by keyboard alone
- The backend-down journey still renders every route, with search included
- `pnpm verify` and `pnpm e2e` pass

## Notes

The rule this task exists to honour is that accessibility here is a first-class
requirement rather than a pass afterwards. The practical form of that: **anything
this walk finds is fixed in this task.** A finding filed against a later story is
a finding that will be re-found by a user.

One thing not to assert, from `e2e/README.md` and `CLAUDE.md`'s list: an axe pass
as accessibility coverage, a `useId()` value or a DOM snapshot containing one, or
latency without a large n. And a break that does not go red is not evidence a
check works — when a check is added here, verify the substitution by breaking the
thing it is about.
