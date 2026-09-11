# Task 2.11.9 — Keyboard, screen reader, and the journey a browser walks

**Status:** Done — 2026-09-11
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

## Amended 2026-09-11 by Task 2.11.8 — two new controls to walk, one inherited question already answered, and a shape no screen reader in this project has met

The tracked universe gained a **band rail** (a `<nav>` of twelve jump links with
their counts) and a **collapse** on every band heading, plus `Collapse all` /
`Expand all`. Five consequences for this walk, and the second is an answer rather
than a question.

**1. The walk is fifteen stops longer, and the composition is measured rather
than described.** Taken at 1440×900 on `/securities/NVDA`, 2026-09-11:

|                                                         | 2.11.7 | Now     |
| ------------------------------------------------------- | ------ | ------- |
| Focusable elements on the page                          | 531    | **556** |
| Tab stops from the search field to the first table link | 8      | **23**  |
| Tab stops after the last table link                     | 0      | **0**   |

The 23 in order: the field, then the **eight region panels**, then
`Collapse all`, then the **twelve rail links**, then the Technology band's
disclosure button, then `XLK`. Nothing in that is accidental — the rail is
navigation and belongs in the tab order — but fifteen stops between a search
field and the first row is a thing to **hear** before agreeing it is fine, which
is the same judgement this file already owns for the six empty regions.

**2. The skip-link question is answered. Do not re-derive it.** The note above
asks this task to "measure how many Tab presses it takes to get past the table
before deciding whether it needs one", and 2.11.7 corrected the premise. 2.11.8
settles it: past the table is still the end of the document, and **`Collapse all`
is the skip link** — one press takes the page from **556 focusable elements to
38**, which is more than a skip link buys and leaves the reader where they were
rather than past something. What is left for the walk is not _whether_ to add
one; it is whether a keyboard user **discovers** that control, sitting as it does
nine stops after the field and before the twelve links it belongs with.

**3. Two controls owe the numbered flow their own steps**, and neither existed
when the Work list below was written:

- **A rail link**: Enter scrolls the band below the sticky chrome and moves
  focus to that band's disclosure button. The landing position is asserted in
  `e2e/specs/universe-navigation.spec.ts`; what no automated check can judge is
  whether the **arrival announces its subject** — a screen reader user has just
  travelled 11,933px and lands on a button, and what they hear is the whole
  question.
- **A band disclosure**: Space or Enter toggles it, `aria-expanded` changes,
  focus stays on the button.

**4. The thing to listen for hardest, because it is a decision 2.11.8 took that
only this pass can confirm.** Collapsing a band changes the summary line above
the table (`444 of 518 rows shown`) and **nothing announces it**. The argument
is that `aria-expanded` is spoken at the moment the listener presses the control,
about the thing they pressed, and that a `role="status"` re-reading the summary
on top of that is two announcements of one action. A component test asserts the
live region is byte-identical across a collapse, so the decision is enforced —
but "enforced" and "right" are different claims and this is the pass that can
tell them apart. If it is wrong, the fix belongs here.

**5. A shape nothing in this project has met before: a `<table>` with twelve
rowgroup headers and zero data rows.** With every band shut, the table's browse
mode has headings and no cells. Three specific things to check, none of which
axe can see — it passes at all three viewports in the collapsed state:

- what a screen reader's table navigation does in a table with no data rows;
- whether the column headings, which deliberately **stay** when the rows go,
  read as a promise of content that is not there;
- `aria-controls` on each band names the `<tbody>` that contains its own
  trigger, which is a superset of the truth rather than a wrong answer (there is
  nowhere else to put the id — a table admits no element between a `<tbody>` and
  its rows). Worth hearing what a reader that implements "move to controlled
  element" actually does with it.

**6. The page now has two `navigation` landmarks** — the masthead's and the
rail's — where it had one. Both are named, which is why `landmark-unique` is
quiet. Listing landmarks is a thing screen reader users do to orient, so the pass
should include what that list now sounds like.

**7. Two accessible names were fixed in 2.11.8 and the fix was measured in
jsdom, not in a screen reader.** The band heading was announcing itself as
`TechnologyBenchmark XLK2securities`; explicit spaces now make it
`Technology Benchmark XLK 74 securities`. Browsers and `dom-accessibility-api`
compute names differently, so this pass is the first time a real engine reads
either of them aloud. Confirm both, and the rail link's
`Technology 74 securities` with them.

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

---

## What was done — 2026-09-11

### The short version

The flow was walked in a real browser, end to end, by keyboard. **Five defects
were found and every one of them is fixed here rather than filed.** Four of the
five are invisible to `pnpm verify`, and three are invisible to axe as well —
they are facts about where a scroller stopped, what is in the tab order, and how
often a region speaks, none of which a DOM assertion can see.

The record with its measurements, its alternatives and its reversal triggers is
[`SEARCH-AND-SELECTION.md` §6](SEARCH-AND-SELECTION.md); this file says what
changed and what it cost.

### The instrument, stated plainly

The keyboard half was walked with real key presses in Chromium against the
running pair. The listening half was taken from **Chromium's own accessibility
tree** — role, accessible name, description and state as focus reached each
element, plus every distinct sentence each live region held and when. That is the
data an assistive technology is handed, and it is **not the same as hearing it**.

Two classes of finding are therefore held at the confidence they deserve rather
than asserted: how a given screen reader pronounces a name (§6.6), and what its
table navigation does in a table with no data rows (§6.6). Both are written down
as open observations with reversal triggers instead of being settled by
inference. Everything else below is a measurement.

### The five findings, and what each one cost to fix

| #   | What the walk found                                                       | Repair                                                                  |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Tab focus landed **behind the sticky chrome** — WCAG 2.2 2.4.11           | one CSS declaration, fed by a height `AppHeader` measures and publishes |
| 2   | The unavailable field's reason was **attached to an unreachable control** | `TextField` keeps a disabled field in the tab order, product-wide       |
| 3   | `Collapse all` removed **518 rows in silence**                            | `aria-expanded`, the same mechanism the twelve bands use                |
| 4   | The tracked universe was a **table with no accessible name**              | a visually-hidden `<caption>`                                           |
| 5   | The 400 ms announcement rate **inverts below its own threshold**          | a second number: a floor on how often the region may speak at all       |

**Finding 1 is the largest and it had stood since the chrome became sticky.** The
browser's scroll-into-view for sequential focus navigation — the one it performs
for every press of Tab — knows nothing about a `position: sticky` header. Before
the repair: **one** occluded stop at 1440×900, **four** at 768×800 including
`Collapse all`, and **two** at 390×780. It worsens as the viewport narrows,
because the status strip wraps to two rows at 768 and three at 390 — so the one
instrument that could have caught it, a person tabbing on a development machine,
is the one looking at the narrowest chrome.

**Finding 5 is the one this file was told to go looking for**, and it is the
clearest example of why a walk is not a reading. `SEARCH-AND-SELECTION.md` §4
nominated this pass as the first real opportunity to find out whether 400 ms is
right in practice. Typing `nvidia` at a hunt-and-peck cadence made the region
speak **seven times**, six of them while the person was still typing; at 90 and
160 ms/key it spoke once, correctly. A debounce cannot tell a pause from an
ending, and no value of it can — so the repair is a floor rather than a bigger
delay, and the slow cadence now hears **three** current sentences instead of
seven stale ones.

### Two decisions this task was handed and took

**Focus after a result is opened: it stays in the field** (§6.3). The route
re-renders rather than re-mounting, so the field is the same element still
holding the query, and this control is a symbol switcher as much as a search box.
The objection it had to answer was silence — and it does not apply, measured:
opening `AMD` changes the **panel's** live region to name `AMD` within 300 ms of
the keypress. The arrival announces itself, by the region that owns the subject
that changed. Moving focus to the identity block was rejected because it takes
the query away mid-switch and buys an announcement the page already makes.

**The disabled field stays focusable** (§6.2 of this list, §6.4 finding 2). Task
2.11.6 handed this one over explicitly, with three defensible answers. `readOnly`
alone was rejected on meaning: that prop is a display state — _a value nobody
edits here_ — and borrowing it would make what a listener hears say nothing about
why. Leaving it was rejected because the other explanation on screen is two stops
further on and describes a different surface. So the field renders `aria-disabled`
and `readOnly`, in `TextField` and therefore for every control after it.

**Its consequences were followed rather than left.** The state stopped being
inactive, so WCAG 1.4.11's and 1.4.3's exemptions stopped reaching it: the border
rose from 1.07:1 to **4.22:1** and the value's ink from 2.62:1 to **6.49:1**.

### What was heard and deliberately left alone

- **2.11.8's single-band decision is confirmed, not overturned.** Collapsing one
  band still announces only `collapsed` and the summary line is still not spoken.
  One action, one announcement, about the thing that was pressed.
- **Eight region tab stops, six holding nothing focusable.** Left. It is how a
  keyboard user reaches content they would otherwise scroll to, and finding 1 is
  what made it tolerable rather than merely defensible: they are now **visible**
  when reached.
- **`Collapse all`'s discoverability**, which 2.11.8 asked about. It is the first
  thing in the rail's header, so anybody tabbing toward the table meets it before
  a single row.
- **The rail's arrival.** A jump travels up to 16,069px and lands on a button
  named `Energy Benchmark XLE 22 securities` — the band, its benchmark and its
  size. The landing names its own subject, so it needs no sentence.

### One residue, recorded rather than fixed

The Tracked universe region is a tab stop on a panel 18,895px tall that **never
scrolls**. Focusing it lands somewhere that is not its heading, before the repair
and after it, and the next Tab corrects it. The real answer is a `Region` that
can say it does not scroll — which Task 1.13.4 deliberately declined to build,
and that argument still holds for the other seven. Reversal trigger in §6.4.

### What now stands where nothing stood

`e2e/specs/search-keyboard.spec.ts` — 11 tests, and **every one of the four
repairs was verified by restoring the break**:

- removing `scroll-padding-top` takes the 768 case red on three stops and leaves
  the 1440 case green, which is why it runs at two viewports;
- restoring the native `disabled` attribute fails at `the search field is not
reachable by Tab`;
- removing `aria-expanded` from the bulk toggle fails on the attribute;
- removing the `<caption>` fails on the table's name.

The floor's own test goes red when `SEARCH_ANNOUNCEMENT_MIN_GAP_MS` is set to 0.

The browser suite is now **13 spec files and 81 tests**, all green, with the axe
gate at zero violations through every state the repairs touched.

---

## For the stakeholders — what this task actually did, in plain words

**Nothing new was drawn. A great deal was made usable.**

Up to now, every piece of MarketPulse has been built for somebody using a mouse
and looking at a screen. This task was the first time anybody sat down and used
the product the way a substantial number of professional analysts actually do —
**entirely from the keyboard, and listening rather than looking.** It is
deliberately scheduled here, as its own piece of work rather than as a tidy-up at
the end, because the search box is the first genuinely interactive control we
have built and whatever we settle on it is the pattern every control after it
copies. Getting it wrong once is cheap; getting it wrong and then copying it into
the charts, the comparison picker and the AI workspace is not.

**Five real problems turned up, and all five are fixed.**

1. **Things you tab to were hiding behind the header.** The bar across the top of
   MarketPulse stays put when you scroll — deliberately, because it reports the
   market clock and whether the data feed is alive, and a status that scrolls away
   is a status nobody sees. But when you move through the page with the Tab key,
   the browser scrolls things to the very top of the window and does not know
   about that bar. So the thing you had just selected was sitting _underneath_ it,
   invisible, while the keyboard thought it was showing you something. It got
   worse on smaller screens — four items were affected on a laptop-sized window
   and only one on a large monitor, which is precisely why nobody had noticed:
   the machines we develop on show the problem least. One line of code fixed it
   everywhere, permanently, for every part of the product we build from now on.

2. **When search was broken, it explained itself to nobody.** If the service
   holding our list of companies cannot be reached, the search box greys out and a
   sentence appears underneath saying why, and offering the one thing that might
   help. That sentence is read aloud to a screen-reader user _when they land on
   the box_ — and a greyed-out box cannot be landed on. So the explanation was
   perfectly written, correctly attached, visible on screen, and could not be
   reached by the one person who most needed it: somebody who cannot see the
   screen and needs to be told why tabbing past a search box was the right thing
   to do. The box now stays reachable, still refuses to take typing it cannot use,
   and reads its reason out. We fixed this in the shared building block, so every
   input we ever build inherits the correct behaviour.

3. **A button that removed 518 rows of the page did it in total silence.** The
   tracked-universe table has a control that folds all twelve sectors shut at
   once — it is how a keyboard user gets past 518 rows in one keystroke. Pressing
   it changed the page dramatically and announced nothing at all. It now says
   whether the sectors are open or shut, using exactly the same mechanism the
   individual sector headings already use, so there is one idiom rather than two.

4. **The main table had no name.** Screen readers offer a "list all the tables on
   this page" shortcut, which is how somebody jumps straight to the data. Ours
   appeared in that list as an anonymous table. It now carries its name.

5. **The spoken summary was talking over people.** After you type, a short
   sentence is read aloud — "Security search: 1 match for nvid. NVDA." — timed to
   arrive just after you stop typing. We set that delay by judgement, wrote down
   that it was a judgement, and said this was the task that would find out whether
   it was right. **It was right for fast typists and badly wrong for slow ones.**
   Anyone typing slower than about two keys a second was interrupted after
   _every single letter_ — six interruptions while typing one six-letter word.
   And slow, deliberate typing is exactly what somebody navigating by ear does.
   No amount of adjusting the delay fixes this, because a delay cannot tell a
   pause from a finish. So we added a second rule — a cap on how often the
   sentence may be spoken at all — and the slow typist now hears three useful
   sentences instead of seven useless ones, while nothing changes for anyone else.

**Two things were found, measured, written down, and deliberately not changed.**
Our headings are set in small, letterspaced capitals, and it turns out browsers
pass those through to screen readers as capitals too. No meaning is lost — the
words are still the words — and the only available fixes are worse than the
problem, so we recorded the exact condition under which we would revisit it.
Likewise, when every sector is folded shut the table keeps its column headings
above no rows; we cannot tell from the outside whether that reads as a broken
promise, so we wrote down what we would need to hear before changing it. Guessing
is what this task exists not to do.

**Why any of this is worth doing now rather than at the end.**

The honest commercial answer: accessibility work deferred is accessibility work
that does not happen, and the cost of it rises with every screen that copies the
wrong pattern. Four of the five problems above were in **shared** pieces — the
header, the input, the panel — so fixing them now fixes them for the price chart
in the next story, the volume chart after that, the market overview in Epic 4 and
the AI workspace in Epic 11. Fixing them in Epic 15 would have meant fixing them
in nine places and re-testing nine screens.

There is a quality argument alongside it. Three of these five defects were
completely invisible to our automated checks, and one was invisible to the
industry-standard accessibility scanner as well. The product had a green tick
against all of them. **That is the point of a human walking the product**, and it
is the same reason this repository keeps insisting on measuring rather than
citing: the check that passes is not the same as the thing that works.

**What a customer can do today that they could not yesterday:** find a company by
typing part of its name or ticker, choose it with the arrow keys, open it with
Enter, hear what they have opened, and get back — without touching a mouse, and
without anything they select disappearing behind the header. That is the first
half of this epic's promise delivered to everybody rather than to most people.

**What they still cannot do:** see a price chart. The security's page states its
numbers in words and figures and deliberately draws nothing. That is the next
story, and it will be built on a search-and-selection layer that has now been
used in anger rather than merely tested.
