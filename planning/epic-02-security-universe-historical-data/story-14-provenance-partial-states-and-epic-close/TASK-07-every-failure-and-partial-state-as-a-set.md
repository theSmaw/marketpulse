# Task 2.14.7 — Every failure and partial state in the epic, checked as a set

**Status:** Complete — 2026-09-15
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.3, 2.14.4, 2.14.5, 2.14.6

> **Amended 2026-09-14 by Task 2.14.1.** Two entries join the set: the two empty
> answers are now genuinely two states rather than one sentence used twice, and
> **they cannot both be produced in one store**; and a zero-bar page's missing
> `SourceNote` is a designed absence that belongs in the enumeration rather than
> looking like a gap in it.

> **Amended 2026-09-14 by Task 2.14.3.** The second of those entries splits in
> two, and the note's **reduced** shape — one clause, on every zero-bar page — is
> a state the enumeration would otherwise miss entirely. See the list below.

> **Amended 2026-09-14 by Task 2.14.4, which built that clause.** The split
> above is right and the **causes** under it were incomplete. Two more entries
> join the set, and one live claim in the list below was wrong: the note renders
> nothing on a page whose universe fetch has not resolved or has failed **and on
> one whose address names a symbol the universe does not hold** — which, unlike
> the other two, is reachable by typing it. The new story-only entry is the
> classification clause **with no date**. Both are in the list.

> **Amended 2026-09-15 by Task 2.14.5.** A state joins the set, a rule joins the
> decided list, and the store hazard this task already carries turns out to have
> a third case.
>
> - **The coverage sentence is a state**, and it is the newest voice in the set:
>   `Holding 1,560 bars, through 2026-09-11 16:00:00 EDT, of a window running to
2026-09-14 16:00:00 EDT.`
> - **It cannot be seen in the two stores this pass is most likely to be run
>   against.** `store:bare` has zero bars, so every chart there is a correct
>   `empty` and never a `partial`; the deployed store is backfilled nightly and
>   answers a named window in full, so it is `loaded`. **A developer's own store,
>   a few sessions behind, is the only one that produces it** — which makes three
>   states in this set that no single store can show together, where the task was
>   written for two.
> - **The rail now has three possible occupants and a stated priority**, and that
>   is the one place in the epic where three sentences compete for one slot. It is
>   exactly what this task is for: _held window_, _refreshing_, _coverage_. Check
>   them as a trio.

> **Amended 2026-09-15 by Task 2.14.6, which built the two empty answers.**
> The set grows by more than the two entries 2.14.1 anticipated, and one of the
> additions is a state whose whole content is that it draws nothing new.
>
> - **It is four sentences, not two.** Each plot names its own subject, so the
>   pair is `No history stored for NVDA yet.` / `No bars stored for this window.`
>   on the price plot and `No volume history stored for NVDA yet.` /
>   `No volume stored for this window.` beneath it. **Check them as a square
>   rather than as a pair**: the failure this task exists to find is a price plot
>   telling one story about an empty screen while the volume plot tells another,
>   and that is now reachable in two directions rather than one.
> - **There is a third vacancy state and it draws the second sentence on
>   purpose.** When the universe answer has failed or has not landed, the plot
>   says the **window** sentence, because it never infers _we hold nothing_ from
>   an absence it could not read. It is in the set precisely because it looks
>   identical to an entry already in it: what this pass verifies is that there is
>   **no third treatment to find**. The workshop story is
>   `Market/ChartVacancy` → `UniverseUnavailable`.
> - **Case one is producible on a populated store, which the enumeration bullet
>   below assumes it is not.** `store:bare` is still the honest shape of CI, but
>   it is not the only way: deleting one security's `1m` row from `bar_coverage`
>   on a developer's own store puts **that symbol** into case one while every
>   other security stays populated — so case one, case two and a `partial` can
>   be seen in one sitting against one pair. Used and restored on 2026-09-15
>   (row count checked back to 1,036). **Restore it.**
>
>   **But it is a way to look at a state, not a way to verify a spec**, and that
>   distinction cost a red CI run on the day it was written. The bars still
>   serve from that store — only the ledger row is gone — so the security reads
>   as case one **in a window that holds none** and as a populated chart in
>   every other. A spec landing on the default window therefore takes the
>   populated branch and passes, exactly where CI takes the vacancy branch and
>   fails. `store:bare` is the only faithful shape, it takes about a minute to
>   build, and a bare pair runs the whole suite in four.
>
> - **Four more rows for the copy matrix, and one of them was reworded by a
>   browser run.** Each drawn sentence has a deliberately _differently worded_
>   spoken twin in `chart-alternative.ts` or `series-announcement.ts`. That is
>   the standing rule — visible text is scanned, an announcement is heard once —
>   and it is now also mechanical: `readable()` cannot filter a visually-hidden
>   paragraph, since `clip` is still `:visible`, so two channels quoting one
>   string is a Playwright strict-mode failure. The drawn detail line and the
>   text alternative both said _Changing the window will not help_ until a
>   browser run said so.

## Objective

Acceptance criterion 3, and the local half of criterion 5. Take every failure
and partial state this epic can produce — **as a set, in one sitting, on one
screen size, by a person looking at them** — and establish three things: each is
a designed state, none of them produces a global error screen, and together they
speak in one voice.

The per-component work is already done. Story 2.10 shipped six union members,
Story 2.13 shipped four more states of a window change, and each was reviewed
against its own story. **Nothing has ever reviewed them against each other**,
which is where a product acquires four different words for _"we could not reach
the server"_.

## What the user can see when this lands

**The product behaves the same way every time something is missing** — and looks
deliberate while doing it. This is the criterion §36 makes a product
requirement: failures degrade locally, the rest of the workspace and any
gathered evidence stay visible and labelled, and there is no global error screen
anywhere in the epic's surface.

## What is already decided and must not be re-taken

- **Every state is produced from a named cause and reviewable in a stories
  grid** — the copy matrix, visible text against announced sentence for every
  state, is in Story 2.10's `TASK-08`. **Read it before rewriting any of it.**
- **A wait longer than 160 ms is covered by a pulsing panel over the picture,
  never over a number**, and the in-flight rail sentence was withdrawn because it
  lived 3–68 ms (ADR 0028, amended 2026-09-14). Do not reintroduce a sentence
  nobody can read.
- **The rail's order is stated rather than stacked** (`VOLUME-AND-WINDOW.md` §82,
  `PROVENANCE.md` §3.2): held window, then refreshing, then coverage, then
  nothing. This pass checks that the three speak one voice; it does not re-decide
  which of them wins.
- **Motion means work in progress, and nothing else may borrow it**
  (`VISUAL-LANGUAGE.md`, 2026-09-15). A settled rail's hairline is static; only
  `.refreshing`'s marches. A state in this set that moves while saying something
  has finished is a defect this pass should catch, and it is the one that nearly
  shipped in 2.14.5.
- **The last answer stays on screen until a newer one replaces it.** A window
  change never blanks the page.
- **One `Try again` per screen**, and every failure has an honest sentence.
- **A 5xx never carries the thrown message**, and a natively `disabled` control
  is not focusable — so anything `aria-describedby` hangs off it is unreachable,
  which is why `TextField` renders `aria-disabled` + `readOnly`. Both of those
  are shipped rules this pass verifies rather than re-decides.

## Work

- **Enumerate the set before producing any of it.** At minimum: search
  unavailable; the universe unreachable; a security not in the universe; a
  security found with no data; **both** empties, which are now two distinct
  sentences derived from two different facts (2.14.6) and which **cannot both be
  seen in one store** — `store:bare` gives only the first; a partial window **and its coverage
  sentence**, which is 2026-09-15's addition and is visible in **neither**
  `store:bare` **nor** the deployed store — the first has no bars and the second
  has them all, so only a developer's own store a few sessions behind produces
  it; a
  chart request failed; a window change refused by the cap; a window change failed with
  the previous window still readable; the stale mark; the untracked badge; the
  backend unreachable entirely; a security page opened cold with no backend at
  all; ~~**and the state where `SourceNote` renders nothing**, which is every
  zero-bar page and is a designed absence rather than a missing element~~ —
  **corrected 2026-09-14: it is two states, not one, and the enumeration gains
  the more interesting of them.** §0.1 is **per clause** since Task 2.14.2, and
  Task 2.14.3 implemented it that way, so: a zero-bar page draws the note
  **reduced to its classification clause alone** — the designed absence is of the
  two bar-derived clauses rather than of the note — and the note renders
  **nothing at all** only where no clause has data, which is a page whose
  universe fetch has not resolved or has failed. Both belong in the list, and the
  first is the one nobody would think to look at, because it is the shape **every
  page CI renders** ([`PROVENANCE.md`](PROVENANCE.md) §0.1).

  **Two more, added 2026-09-14 once Task 2.14.4 had built the clause**, and the
  second corrects the sentence immediately above rather than extending it:

  - **The classification clause with no date** — `provenance` absent from the
    universe envelope, the claim standing, and the date replaced by _When they
    were last checked is not recorded._ **No server this product runs can produce
    it**, because there is one curated file, so it is a story and that fact goes
    in the list beside it. It is the one entry in the set where what is missing is
    a **qualification** rather than an answer, and it carries no marker
    deliberately — which is worth checking against the rest of the set, since
    every other absence in it has one.
  - **A symbol the universe does not hold**, where the note renders **nothing**.
    The sentence above names two causes for that and there are three; this is the
    only one a person reaches by typing. It is also the entry most likely to be
    judged wrongly in isolation: `SecurityIdentity` has already said what is wrong
    with the address, in its own words and with its own marker, so what this pass
    checks is that **one** surface answers and the others are silent — not that
    each of them says something.

  Write the list into `PROVENANCE.md` — the list **is** the deliverable of this
  bullet, because a set checked from memory is a set with a hole in it.

- **Produce each one for real**, against a running pair. `store:bare` gives the
  empties; a stopped backend gives the unreachable states; `?sessions=` beyond
  the cap gives the refusal. Where a state needs a body no server sends, it is a
  story rather than a browser — and that fact goes in the list beside it, because
  "reviewed in Storybook" and "seen in the product" are different artefacts.
- **Look at them side by side.** Screenshot each, at 1440 and 390, with
  `pnpm probe`. The point of the pass is the comparison, and it is invisible one
  state at a time: four sentences that are each individually fine and
  collectively four different voices is the exact defect this task exists to
  find.
- **Check for a global error screen at every level**, which is the one hard
  criterion in the set. The `ErrorBoundary` exists and a thrown render is the way
  to a full-page failure; verify that each region's failure stays in its region,
  and remember that a boundary reset cannot recover state that lives **above**
  the boundary (that is a documented non-assertion, not a bug to chase).
- **Cover the failure states in the local browser suite** — criterion 5's local
  half. `backend-failure-states.spec.ts`, `security-series-states.spec.ts` and
  `security-window-change.spec.ts` exist and are the homes; extend rather than
  add a parallel file. Two suite rules apply: **before asserting on a number,
  ask whether CI has the data** (518 securities, zero bars), and a chart mark is
  **counted** rather than asserted visible, because a horizontal gridline is zero
  pixels tall and Playwright reports it `hidden`.
- **Run scoped while iterating.** `pnpm e2e security-series-states.spec.ts -g "…"`
  is seconds; the whole suite is five minutes and is for the end.

## Done when

- The enumerated set is in `PROVENANCE.md`, each entry with how it was produced
  and where it was seen — product or story.
- Every state renders as a designed state at 1440 and 390, and the screenshots
  were looked at as a set.
- **The rail's three occupants were compared against each other**, not only each
  against its own story: they share one slot, one reserved height and one marker,
  and three sentences that are individually fine and collectively three voices is
  the defect this task exists to find, arriving in the one place the product
  guarantees a reader will meet them in sequence.
- No state in the set produces a global error screen, and that was verified
  rather than assumed.
- The local browser suite covers the failure states; `pnpm e2e` is green.
- `pnpm verify` passes.

## Notes

This task is where this epic either reads as trustworthy or reads as broken, and
it is the one most likely to be declared done from a green suite. A green suite
says the states exist. It says nothing about whether they speak the same
language, and that is the entire deliverable.

---

## What was done

**The enumerated set is
[`PROVENANCE.md`](PROVENANCE.md) §12** — thirty-one states in thirty-seven rows,
each with the cause it was produced from and whether it was seen in the product
or only in the workshop. That list is the deliverable of the first work bullet
and everything below came out of reading it.

**The set was produced against the running pair**, each state forced from a
named cause, screenshotted at 1440 and 390, and — the part that mattered — with
**every readable sentence on the page dumped into one list per state**, live
regions and hidden reservations excluded. The instrument was a throwaway
Playwright driver in a scratch directory rather than a spec: `pnpm probe` cannot
intercept, and the browser suite asserts rather than shows. Six surfaces on one
screen is not something a person compares by scrolling.

### The instrument was broken before the pass could use it

`pnpm probe /securities/NVDA` — the form this script's own usage text leads with
and `CLAUDE.md` documents — reported `⚠ no region named "null" on this page`,
printed no measurements and exited 1. The page-scope branch returned the region
**name** across the `page.evaluate` boundary, and with no `--within` that name is
`null`, which is indistinguishable from the not-found sentinel. Fixed in this
change: the boundary carries a boolean, which cannot collide with an absent name.
The whole-page invocation has never worked, which says something about how the
tool has been used and is worth knowing.

### Four defects, none of them visible one state at a time

Each was correct in its own component, reviewed against its own story, and wrong
on the page. `PROVENANCE.md` §12.3 has each in full; in one line apiece:

1. **The Volume region said nothing at all** on a refused or failed series — a
   named landmark with a visible heading and an empty box, beside a Price region
   carrying three lines and a retry. It now draws a **deferral**, not an
   explanation: `No volume to draw. The Price region says why.`
2. **Search and the tracked universe said one thing twice.** They render from one
   fetch, so both describe every failure of it four inches apart, and two of the
   four search hints carried the table's own sentence — one reworded by two
   words, one verbatim. Neither was reachable by any instrument.
3. **Two retry controls shared one accessible name.** Story 2.11's reversal
   trigger — _the first screen where the two surfaces read different fetches_ —
   had already fired and nobody recorded it. Two controls is the rule holding;
   two identical names is not.
4. **One screen was set in two apostrophes**, with the same sentence in the tree
   twice, once each way.

### Two of them became checks, and both breaks were run red

- **`one-apostrophe-in-the-product-voice`**, break `straight-apostrophe-on-screen`.
- **`search-and-the-universe-share-no-words`**, break `search-repeats-the-table` —
  and the break **restores the tree exactly as it shipped**, which is the
  strongest kind: the check is proved against the defect it was written for.

**The second one is also this task's own lesson about measuring.** Its window was
first written as six words from reasoning, and it went green on the tree it had
just been written to catch — `CLAUDE.md`'s _a tolerance is measured, never
argued_ and _a break that does not go red is not evidence the check works_,
arriving together within ten minutes. The window is four, measured across the
broken tree and the repaired one, with both neighbours recorded in the check so
the next reader can see what is either side of it.

**A third measurement corrected a repair mid-flight.** The two retry controls were
first given their subject as a visually-hidden suffix inside the button. It works
on screen and not in the name: the accessible-name computation trims each text
node before joining them, so `Try again` + ` — the price series` came out as
`Try again— the price series`. Two tests had already been written against a name
the product did not have. It is an `aria-label` now.

### What the set found to be right, which is the larger half

Six surfaces, six subjects, one failure — Task 2.14.2's grain rule surviving the
worst state the epic can produce. The rail's three occupants share one grammar
and one marker, compared against each other for the first time here. The empty
answers read as a square rather than a pair, and the third vacancy draws no third
thing. And **no global error screen anywhere, holding structurally rather than by
care**: no fetch in this application throws, so there is no exception to unwind
into a boundary.

### The canvas

**`Failure and partial states.dc.html`**, a new file in the
`Component library for MarketPulse` project — ADR 0026's rule applied rather than
departed from, since the main canvas is still past `get_file`'s 256 KiB ceiling.
Eight sections, arranged **by cause rather than by component**, which is the
arrangement nothing in the tree produces and the only one the comparison is
possible in. §01 is the six-voice screen; §08 applies the four tests to the set.

### The four tests, and test 4's number

1. **A real funded product** — yes, and this is the part of a product where that
   is decided. A scaffold has one grey box for everything that went wrong.
2. **Designed rather than defaulted** — yes, and the evidence is what is absent:
   no banner, no modal, no toast, no exclamation mark, no error icon. The only
   colour in the whole set is on a single marker.
3. **A moment worth showing somebody** — yes: the §01 screenshot. Six surfaces
   reporting one outage, each about its own subject, page intact underneath.
4. **Does it feel alive** — **deferred. This is the sixth time, stated as a
   number.** Everything here is static by construction; a failure that animated
   would be an alarm, and the one moving thing in the set — the refreshing
   hairline — is already the correct exception. The position stays reserved for
   Epic 3's live feed, where §36's _displaying data through 10:42:17_ is a
   failure sentence that changes while somebody watches.

### Documents swept

- **`PROVENANCE.md`** gains §12, the set and its findings.
- **`VISUAL-LANGUAGE.md`** gains _a surface that owns nothing defers_ as a named
  part of the language, with its three rules and the reason a deferral is spoken
  where an empty answer is not.
- **`VOLUME-AND-WINDOW.md` §36** gains a dated amendment: _no frame_ was right
  and _nothing at all_ was not.
- **`SEARCH-AND-SELECTION.md` §6** gains a dated amendment recording that its
  reversal trigger fired at Story 2.12 and what it costs.
- **`docs/GAPS.md`** gains the two new invariants in its table and three entries
  the pass could not make mechanical.
- **`CLAUDE.md`**'s invariant count was live and wrong — _seven_ against a list of
  ten before this task added two.

### What the user can see

**A screen that no longer has a blank half.** Every named region on the Security
Explorer says something when its subject is missing, every sentence on it is
about its own subject, and no sentence is on it twice. **What a user still cannot
do:** watch a price move.

---

## For the stakeholder — what this actually was, in plain words

Software is usually judged on what it looks like when everything works. This was
a day spent on what MarketPulse looks like when things **don't** — when the
server is down, when we have no data for a company, when you ask for a date range
we haven't filled in yet. That matters more here than in most products, because
the entire premise is that you can trust what the screen tells you. A product
that is confident when it is right and incoherent when it is wrong has not earned
that trust; it has just been lucky.

**Thirty-one different things can go partly or wholly wrong on the screens this
epic built.** Every one of them had already been designed, built and reviewed —
individually. What had never happened is anybody looking at them **together**.
That sounds like a formality. It is not, and here is the clearest example of why.

When the server is unreachable, the price chart explains itself properly: it says
nothing answered, that this is usually temporary, and offers a button to try
again. Directly underneath it, the volume chart — the same width, the same
heading style, part of the same instrument — showed **an empty white box**. Not a
message. Nothing. Each half was correct on its own terms, and the pair was
plainly broken: a reader seeing an explained chart above a blank one concludes
the blank one is the bit that crashed. Nothing could have caught this except a
person looking at the whole screen, which is exactly what this task was for. The
volume chart now says one quiet line — _"No volume to draw. The Price region says
why"_ — which points at the explanation rather than repeating it.

The other three findings are the same shape. Two places on the page were telling
you the same thing about a failed server in slightly different words, inches
apart, which is how a reader learns that the small print is not worth reading.
Two "Try again" buttons on one screen had identical names, so anyone using a
screen reader heard the same two words twice with no way to tell which was which.
And one screen was, quite literally, set in two different apostrophes — the
typewriter kind next to the typographic kind, in the same size and colour, which
is the sort of thing that makes a page feel assembled rather than designed.

**Two of the four are now automated checks** that will fail the build if anyone
reintroduces them, and each of those checks was proved by deliberately breaking
the code and confirming it goes red. That matters: a check nobody has seen fail
is a check nobody knows works. One of them caught us out — the first version was
written from reasoning rather than measurement, passed happily against the very
bug it was designed to find, and had to be rewritten around a measured number.
That is recorded rather than tidied away, because it is the most useful thing in
the task.

**The larger half of the finding is that most of it was already right**, and it
is worth saying plainly. With every single request to the server refused, the
Security Explorer still shows all eight of its sections, and six different parts
of the page each report the same outage **in their own words, about their own
subject** — the status bar about the connection, the search box about searching,
the chart about the request you made, the company list about the company list.
None of them shouts. There is no red banner, no error dialog, no exclamation
mark. The page is still a page. That was the hard criterion for this task — that
nothing, anywhere, collapses into a single "something went wrong" screen — and it
holds for a structural reason rather than because somebody was careful: nothing
in this application throws an error that could take the page down in the first
place.

**Where this leaves the product.** Epic 2 set out to make one company's price
history real and honest. The honesty half is nearly finished: the charts say
where their numbers came from, how far they reach, and what they do not have. The
remaining two tasks close the epic — a performance question and the deployed
end-to-end check — after which Epic 3 turns the historical charts into live ones.
That is the release where the screen starts changing while you watch it, and it
is also the one where all of this pays off twice: a live feed that drops out is a
partial state, and this is the epic that decided what one of those looks like.
