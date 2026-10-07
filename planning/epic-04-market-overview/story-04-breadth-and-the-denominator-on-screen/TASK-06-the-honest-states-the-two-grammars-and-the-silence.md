# Task 4.4.6 — The honest states, the two grammars, and the silence

**Status:** **Complete — 2026-10-07. The denominator reaches a listener, CONFIRMED by reading the accessibility tree before and after — before, `451` appeared nowhere in it. And building the correct version next door exposed a LIVE DEFECT in Task 4.3.8's reservation, shipped ten days: `visibility` on one element un-hid the eleven held rows, leaking internal sector slugs into the tree.**
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.5

## Objective

**The market is shut about 80% of the week, so the second grammar is the common
path rather than an edge case** — and three states that look identical must read
differently.

## What the user can see when this lands

**An honest region out of hours**: last session's close-to-close breadth, labelled
as that session, rather than a blank panel or a stale intraday count. And a region
that says what it has none of when nothing ever arrives.

## Work

- **Two grammars of one sentence, chosen by what the figures are** — the shipped
  precedent is `qualifierOf`'s two grammars in `market-proxies.ts`, and its two
  states are the same two.
  - In session: _Of the 503 companies we track, N were heard from in the last 5
    minutes._
  - Shut: the denominator is **not a coverage figure** — it is how much of the
    store has two sessions behind it, and the sentence names **the session the
    closes belong to**. Note there is **no previous-session date** on
    `SecurityLastClose`, only a number, which is why `sessionChangePercent` had to
    carry its meaning in its name.
- **This discharges the story's own flagged tension.** Close-to-close was rejected
  as _the denominator for the intraday figure_, not as the market-shut answer. The
  two grammars are what make that visible rather than contradictory.
- **Three states that look identical and must read differently:**
  | state                             | means                                                  | draws                              |
  | --------------------------------- | ------------------------------------------------------ | ---------------------------------- |
  | no `breadth` section on the frame | this gateway does not send breadth (a pinned rollback) | the reserved state — **not zeros** |
  | section present, N = 0            | we counted and heard nothing                           | the sentence, no figures           |
  | no frame at all, past the floor   | nothing reached this browser                           | the silence sentence               |
- **The silence floor is `useWaited`, reused** at `SAY_NOTHING_ARRIVED_AFTER_MS`
  (2,000 ms against a first frame measured at 174–277 ms) — **do not invent a
  second floor**. The sentence sits in room the reservation already holds, so
  nothing moves when it appears. **The words are breadth's own**: the strip has no
  _prices_, sectors have no _moves_, breadth has no **count**.
- **N = 0 and N = 1**: no percentage over an empty denominator, and no `100%` over
  one security — technically true and it reads as a statement about the market.
- **A figure heard from but with no measurable move** is in none of the three
  buckets. The owner's rule is that N **is** the sum, so such a figure is outside N
  — **measure how large that set is on the deployed store** before the sentence is
  final, because if it is never empty the wording needs one more word.

## Done when

1. The two grammars are produced, not imagined, and neither can render the other's
   denominator
2. The three look-alike states render differently, each produced through the
   shipped socket path
3. N = 0 and N = 1 draw no percentage, and no state draws zeros where the truth is
   _we have not heard_
4. The region's height is unchanged across every state added here
5. The heard-from-but-unmeasurable set is measured on a real store and the figure
   recorded

## Amended at Gate 1 — 2026-10-07: you owe a RE-MEASURE, not a subtraction, and it is the same sitting as the one you already owe

**Gate 1's choice of the 503 equities invalidated every absolute figure in Task
4.1.6's coverage curve**, because that instrument sampled **518**. The choice of
**M = 5 does not move** — it rests on the _shape_ of the curve and removing fifteen
of the most liquid names in the market changes no part of that argument — but the
band does.

**What is now unusable as a figure over 503:** `N typically ~466`, the whole-day
band `446–498`, and the worst-hour `446`. The honest first estimate is `N − 15`
(~451 median, ~431 worst hour, against 503) **and that is an inference the
instrument never made.** Do not ship the sentence against a band nobody measured.

**The re-measure is Task 4.1.6's instrument re-run against the 503** — a Node
client on the deployed gateway, sampling every 60 s through a regular session —
and **it is the same sitting as the measurement this task already owes**: how large
the heard-from-but-unmeasurable set is on a real store. One session answers both,
and both are figures the sentence depends on.

**Why it matters more than a tidy-up**: the sentence _states_ N, and this file
publishes a band a reader can compare it to. A sentence reading `431 of 503` beside
a published expectation of `446–498` reads as a fault in the product rather than as
a different denominator.

**And the noun changes with the set** — _of the 503 companies we track_. `518` is
never spelled as a literal in a rendered string: the set is **read**, and one
delisting makes a hard-coded figure a lie with no symptom.

## Amended by Task 4.4.5 — 2026-10-07: N reaches NO LISTENER, which is this story's own thesis failing for one audience

**The denominator is printed once, as the ladder's right endpoint — and the ladder
is `aria-hidden`.** That is `RankedList`'s decision at its own ladder, inherited
correctly, and the consequence is specific to breadth: **a screen reader gets the
three counts, the set heading and the remainder, and never the denominator.**

**This story exists to put a denominator on screen.** For a listener it is not on
screen. The counts arrive with nothing to measure them against, which is the exact
shape `EPIC.md` was written to prevent — _a percentage with a footnote is a
percentage nobody reads the footnote of_ — arriving by the one route nobody checked.

**Your grammar is what carries it.** The sentence _of the 503 companies we track, N
were heard from in the last 5 minutes_ is the thing that reaches a listener, so the
wording is not a tidy-up — **it is the only delivery of the denominator to that
audience.** Task 4.4.5 wrote that into the component's comment rather than
inventing wording.

**It is a hand-off a story close would not sweep**, because it is not a defect in
any file: the ladder is correctly hidden, the counts are correctly labelled, and
nothing is missing from the DOM. It is a fact about what a listener is handed.

### What 4.4.5 shipped that you are wording rather than placing

**Four strings exist at a realistic length, each with one home, and neither basis
can render the other's.** They are **placement**, not copy:

| basis      | footer clause                                                      | quiet row's label |
| ---------- | ------------------------------------------------------------------ | ----------------- |
| `observed` | `Heard from means at least one observation in the last 5 minutes.` | `Not heard from`  |
| `session`  | `Close to close on 2026-10-06.`                                    | `No prior close`  |

`Not heard from` is **false about a closed market**, and CI plus ~80% of the week
are on the `session` basis — which is why shipping only the live grammar would have
been a hole rather than a deferral.

**And the N = 0 suppression is already in**, because ADR 0029 is not negotiable:
without it CI draws `Advancing 0 / Declining 0 / Unchanged 0` against a 0–0 scale,
which is a fully-formed partition over zero observations. The ledger, ladder and
headline give up their content and **keep their room**; the quiet group carries the
whole truth. **The sentence that belongs in the room that suppression holds is
yours.**

### And the figure to measure

`STORY.md` still records **121 px at 390**; the region measured **139** before this
task and **475** after. The deltas 4.4.5 recorded are `0 / 0 / +372 / +336`, and
**nothing moved at 1440 or 1024** — every region byte-identical, and the proxy strip
byte-identical at all four widths.

---

## What was done — 2026-10-07

### The denominator reaches a listener — read from the accessibility tree

`Accessibility.getFullAXTree` via CDP against the running pair. **Before**, as
4.4.5 shipped it — **`451` appears nowhere**:

```
region "Market breadth"
  paragraph "NET ADVANCING" → "down" "−78"
  DescriptionList → Advancing 335 / Declining 166 / Unchanged 2
  heading "OF THE 503 WE TRACK"
  paragraph "Close to close on 2026-09-11."
```

**The ladder's `0` and `503` are absent from the tree entirely** — the finding
confirmed rather than inferred. **After:**

```
  DescriptionList → Advancing 284 / Declining 152 / Unchanged 15
  heading "OF THE 503 WE TRACK"
  DescriptionList → "Not heard from" 52
  paragraph "Of the 503 companies we track, 451 were heard from in the last 5 minutes."
```

**Delivery confirmed**, and the drawn method clause is correctly absent — it is the
`aria-hidden` twin, so a listener hears the sentence **once, not twice**.

### Two renderings of one string

`BreadthClaim { drawn, spoken }`, both built by `claimOf` from **the same three
fields of the same frame**:

| basis      | drawn (N ≥ 1)                                                      | spoken (always)                                                               | quiet label      |
| ---------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------- |
| `observed` | `Heard from means at least one observation in the last 5 minutes.` | `Of the 503 companies we track, 451 were heard from in the last 5 minutes.`   | `Not heard from` |
| `session`  | `Close to close on 2026-10-06.`                                    | `Of the 503 companies we track, 501 had a close-to-close move on 2026-10-06.` | `No prior close` |

At **N = 0** the two collapse to one and the element renders bare, so the sentence
is not in `textContent` twice: _…none were heard from…_. At **N = 1** the session
grammar uses **`had`** — the one verb needing no number agreement, right for both
`1 had` and `451 had`.

**Neither basis can render the other's, and it is the type that holds it**:
`WireMarketBreadth` is a discriminated union, `windowMinutes` exists only on
`observed` and `session` only on `session`, so reaching for the wrong field is
**`TS2339`, not a wrong sentence**. Asserted over **both** renderings.

**`503`, `518` and `5` appear as literals in no rendered string** — `tracked`,
`measured`, `windowMinutes` and `session` are all read off the frame.

### The three look-alike states, produced

| state                   | produced by                      | draws                                                                                   |
| ----------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| no `breadth` section    | a frame with no section          | the reserved panel and its sentence — **no zeros**                                      |
| `measured: 0`           | a readable section, all counts 0 | ledger, ladder, headline and rule all **held**; the quiet group carries the whole truth |
| no frame ever, past 2 s | snapshot sent, no overview frame | held geometry and **`No count yet.`**                                                   |

Zero page errors in any state, four widths. **`No count yet.`** is breadth's own
word: the strip has no _prices_, sectors have no _moves_, **breadth has no count.**

### A live defect in Task 4.3.8's code, found by writing the correct version next door

**`SectorPerformanceReservation` put `visibility: hidden` and its `visible`
override on the SAME element**, with `aria-hidden` removed in the same branch.
**`visibility` is inherited by children that never set it**, so past the floor the
whole box un-hid — **including the eleven rows it was only ever holding room for.**

Produced at 1440, verbatim:

```
"Sector performance\nNOT RANKED\n—\nTechnology\ntechnology\n—\nHealth Care\nhealth_care\n—\nFinancials\nfinancials…"
```

The second column is `RESERVED_SECTORS`' **internal sector slugs** in the symbol
column — which that module's own comment says _"is the React key and is never
read"_. **The fully-formed-placeholder failure its own docblock forbids, plus a
slug leak**, and it was in the accessibility tree too. **Shipped ten days.**

**Repaired in this change** with the two-box pattern `BreadthLedgerReservation` was
built with from the start: the held geometry keeps its own `hidden` and its own
`aria-hidden` **unconditionally**, the sentence is a **sibling** in the room it
holds. **Nothing can un-hide the rows, because nothing overrides them.**

**One unit test had to be amended, and its intent was right.** It asserted
`aria-hidden` on `firstElementChild` — the one box the reservation used to be. It
now names **the box that holds the rows** rather than whichever is first, and the
claim it makes is unchanged: the rows are out of the accessibility tree.

### The check, and three defects written before it was registered

`the-denominator-reaches-a-listener` asserts `claim.spoken` renders in **exactly
one** element, that the element carries no `aria-hidden` and does carry
`styles.spoken`, and that `.spoken` **composes `visuallyHidden`** rather than
hiding with `display` or `visibility` — both of which remove an element from the
accessibility tree.

**Three plausible defects were produced first**, all red with distinct messages:
collapsing the two renderings (`renders claim.spoken in 0 elements`), sweeping
`aria-hidden` onto the spoken span (`hides the spoken denominator clause`), and
`display: none` (`does not compose visuallyHidden`). **The break registers the
first** — the one a reader makes while believing they are deleting a duplicate.

**`pnpm break` could not run through the harness** (dirty target); the registry's
own substitution was performed by hand — `occurrences of find: 1`, red with the
entry's `expect` string, restored to `42 invariants hold.` **Run it once committed.**

### The two measurements — one taken, one honestly refused

**(b) The heard-from-but-unmeasurable set is 0 of 503, and it is a complete
bound.** That set is `heard-from ∩ unmeasurable`, so it is bounded above by
`unmeasurable`, which is a pure store property:

```
 equities | no_close_at_all | one_session_only | measurable
      503 |               0 |                0 |        503
```

**So it is empty whatever the feed is doing, and `Not heard from` is true of the
whole remainder.** No extra word needed. **Reversal trigger, a condition**: the
first store state in which a tracked equity holds fewer than two stored daily
sessions while the live feed runs — a newly-added constituent before its first
backfill, or a bare store with a provider configured. At that moment the remainder
contains a security we **have** heard from, and the label lies about it.

**(a) The coverage re-measure over the 503 was NOT taken, and nothing was
estimated.** The sitting fell at **05:23–06:30 ET on a Wednesday** — the market was
shut throughout. **No band has been published.** What the sitting must capture is
recorded in the task file; **M = 5 does not move**, and nothing shipped depends on
the band, because the sentence states N read off the frame.

### Geometry — every state is 475

`pnpm probe /` before and after: the **whole-page output is byte-identical**,
`diff` clean. Per state, `getBoundingClientRect().height`:

| state                             | 1440  | 1024  | 768 | 390 |
| --------------------------------- | ----- | ----- | --- | --- |
| observed / session / N=1 / N=0 ×2 | 475   | 475   | 475 | 475 |
| silence                           | 486   | 486   | 475 | 475 |
| no section                        | 264.5 | 264.5 | 117 | 135 |

`scrollHeight === clientHeight` in every row — **no silent scroller**. The silence
row's 486 at the two widest is the **sector** region's reservation making the shared
`fr` row taller and breadth following it — **the tie working as designed**. The dev
server was restarted before measuring, because `.spoken` is a `composes:` change.

### Two owner decisions, 2026-10-07

**The restatement is accepted.** A listener meets the set size twice — as the quiet
group's heading and in the sentence. Every arrangement has exactly one redundancy,
because the sentence necessarily contains both the set and the window; restating
the **set** keeps the heading meaningful when read alone, where moving the sentence
into the `h3` would make it the accessible **name** of the remainder group.

**N = 1 suppresses the bands, the origin rule and the ladder together.** A scale
with nothing drawn against it is a claim with no data — and a `0 … 1` ladder beside
a single bar invites a reader to read a proportion off a sample of one.

### Gates

```
$ pnpm verify    EXIT 0,  grep -ci unhandled over the transcript: 0
42 invariants hold.  ·  40 components, 40 stories files.
487 documents, 1669 cross-file links, 39 anchor links, 0 broken.
shared 408 · backend 1010 · frontend 1322 (84) · process 41
$ pnpm e2e       EXIT 0,  189 passed, 15 skipped (4.5m)
```

**An earlier `pnpm e2e` on this tree exited 1 with 5 failed**, reported rather than
only the green one: `securities-route` ×2, `security-explorer-shell`,
`security-holiday-week`, `security-navigation` — **all on `/securities`, none on the
landing route, none on breadth** — at 31–60 s in a run taking 5.2 m against 3.8 m
clean. Scoped re-run: **37 passed**, all five included. **The only change between
the clean run and the failing one was a `visibility` toggle on a decorative hairline
inside `Market breadth`**, which cannot reach a `/securities/NVDA` navigation or an
axe pass on the explorer shell.

## For a stakeholder — a status report, 2026-10-07

**The region is now honest in every state it can be in, and the denominator finally
reaches somebody using a screen reader.**

That last part was the task's real work. The figure _503_ was printed once, as the
label at the end of the bar scale, and that scale is hidden from assistive
technology — correctly, because it is decoration for everyone else. So a listener
got three counts and nothing to measure them against: the exact failure this story
was written to prevent. It was confirmed by reading what a browser actually hands a
screen reader, before and after. Before, the number appeared nowhere.

**Out of hours the region says a different sentence**, because _not heard from_ is
false about a closed market — it reports the last session's close-to-close move and
names the day. That matters more than it sounds: the market is shut about eighty
percent of the week.

**And building the correct version of one small thing exposed a defect in the
version shipped ten days ago.** The sector region's placeholder used a single
hidden box for both the held space and the message, and when the message appeared
the whole box became visible — showing eleven rows of placeholder content,
including internal database values that were never meant to be seen. Repaired here,
using the arrangement the new region was built with from the start.

**One measurement was owed and is not taken**: the coverage figures need a live
trading session, and this ran at half past five in the morning New York time.
Nothing was estimated and no figure was published — what the sitting must capture
is written down instead.
