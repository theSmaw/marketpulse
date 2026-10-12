# Task 4.9.10 — The two ADRs, the three amendments, and invariant 4's qualification

**Status:** Complete — 2026-10-12 — and the finding is in the **amendment written to repair this exact defect**: ADR 0038's 2026-10-12 note says the point-in-time universe constraint is now in Epic 13's `EPIC.md` (**it is**) and that "`docs/GAPS.md` carries it too, by Task 4.9.5" (**it does not — Task 4.9.5 is Not started**). So a paragraph whose last sentence is _a claim about a mechanism reads identically whether the mechanism is there or not_ ends with a claim about a mechanism that is not there. Nothing is repaired here, because it is 4.9.5's row and 4.9.5 is still ahead; what is recorded is that the ADR states it in the **present tense** with no owner clause, which is the shape that goes stale silently
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** nothing

## Objective

Five decisions the technical architect specified and the product owner accepted
at Gate 2 are written down: **two ADRs, three dated amendments, and a
qualification on invariant 4.** None of them is re-decided here — the job is to
write them well, in the house shape, and to build the one mechanism an ADR owes
if it is not to be a claim about a guard.

- **ADR 0040** — what _current_ means: a measured five-minute observation
  window, one eligibility pass, and a window that travels on the frame.
- **ADR 0041** — a ranked surface re-orders under live data, and the
  reconciliation with the universe table's **opposite** rule, which this
  repository has asserted in two places and never reconciled.
- **ADR 0033** gains the fourth clock reading on the wire.
- **ADR 0038** decision 3 gains the **selection property** that makes a top-N
  safe on the grain rule — not a new ADR, for the reason Task 4.5.4 recorded.
- **`breadth-is-counted-over-the-equities-alone`**'s `claim:` string stops
  printing a population count as a live claim.
- **Invariant 4** gains a dated qualification naming aggregates and universe
  membership as the known bound, owned by Epic 13.

## What the user can see when this lands

**Nothing.** No route, no component, no stylesheet and no wire field was
touched. The one runtime file edited at all is `scripts/check-invariants.mjs`,
which no shipped code imports.

What a **reader of this repository** gets is the answer to two questions that
could previously only be reconstructed from five task files each: _what counts
as current_, and _why do rows move on one screen and not on another_.

## What was done

### ADR 0040 — the window

`docs/adr/0040-what-current-means-a-five-minute-observation-window.md`.

The context is three dated first-hand measurements rather than an argument:
IEX per-symbol minute coverage at **65.1% median, 2.1% worst case (`ERIE`)**
with an ordinary **187-minute** gap (`LIVE-DATA.md` §7.6, §11.2); a bar
arriving **~0.5 s after the minute it describes has ended** (§7.3); and Task
4.1.6's by-hour curve over **390 of a session's 390 minutes** — 1 minute
structurally **0 in all 390 samples**, 2 minutes **57.5% at 13:00**, 5 minutes
**90% median and never below 86.1% in any hour**, 15 minutes buying 8.5 points.

Four parts to the decision, each somebody's measured defect: the constant
spelled once; the clock being the **bar's** `startsAt` against the aggregate's
`asOf`, both arguments; **one pass, three accumulators, `measured` their sum**,
with the movers a selection from the same array so `movers.eligible` and
`breadth.measured` cannot disagree; and the window **read off the frame** as
`windowMinutes` in both grammars of the denominator sentence.

Five alternatives recorded with their reasons — count the whole map with no
expiry (the state the proxies and sectors are still in, and the direct cause of
Task 4.7.3's shipped contradiction), a per-security staleness verdict (rejected
on the coverage measurement: **an age, never a verdict**), `ageMs` as the clock
(two reasons, both already in source comments), percentages instead of counts
(**cross-referenced to `PRODUCT_SPEC.md` §9's amendment rather than re-argued**),
and two independent filters (rejected by Task 4.5.4).

Two reversal triggers, both conditions: _the first aggregate on this screen
whose honest window is not breadth's_ — which fires ADR 0038's frame-grain
trigger at the same instant — and _the first re-measurement of per-symbol IEX
minute coverage that moves Task 4.1.6's curve_, which is an **input** to the
decision rather than a re-litigation of it.

### The mechanism ADR 0040 owes, built in the same change

Verified first, rather than taken on trust: `git grep windowMinutes` over
`apps/` and `packages/` shows the browser reading the field off the frame in
`measured-set.ts` and `market-breadth.ts` and spelling it nowhere in shipped
source, and `BREADTH_WINDOW_MINUTES` has exactly one assignment. **Nothing held
either.**

`one-home-for-the-observation-window` now does, in three conjuncts: exactly one
**observation-window cutoff** in the whole shipped corpus, in
`market-breadth.ts`, naming `BREADTH_WINDOW_MINUTES`; the constant assigned
exactly once; and the frontend **reading** the window at every
`measuredWindow(` call site while spelling no minute count in any string. The
corpus is `shippedSourceFiles()` and not the files that compute an aggregate
today, for `one-home-for-imperative-navigation`'s reason — a new region is a
new file by this repository's convention.

**Two things the check cannot see are written down beside it** rather than
implied: a cutoff spelled as an **addition** to the bar's instant
(`startsAt + window < asOf`) is the same window the other way round and is
outside the pattern, and a window hard-coded in milliseconds with no minute
factor (`asOf.getTime() - 300_000`) is invisible to it.

The break is `a-second-observation-window`, which edits
`apps/backend/src/market-overview.ts` — _where the next author of an aggregate
over this seam is standing_, the target the movers breaks chose for the same
reason, because a break editing the module the check was written around proves
the least.

### The wrong pass, which is the part that found the real defect

`CLAUDE.md`'s 2026-09-26 procedure, followed in order. **The plant is the file
Epic 5 writes**: `apps/backend/src/market-unusual.ts`, an aggregate over the
same `MarketOverviewEntry[]` with its own constant and its own cutoff —

```ts
const RECENT_MINUTES = 5;
…
const since = asOf.getTime() - RECENT_MINUTES * 60_000;
```

The **draft** check was the obvious implementation: the constant is assigned
exactly once, and every `measuredWindow(` call site names `windowMinutes`.
Both clauses are true, both stay true, and neither is about a window — they are
about an identifier. Run with the plant on disk:

```text
$ node scripts/check-invariants.mjs
55 invariants hold.
EXIT=0
```

**Exit 0, with a second five-minute window in the tree.** The clause that
catches it is the one a re-implementer cannot avoid writing — the **cutoff**,
because whatever they build, a window over observations is a minute-scaled
quantity subtracted from an instant. With the third conjunct added and the same
plant on disk:

```text
$ node scripts/check-invariants.mjs
Invariants that no longer hold:

  ✗ one-home-for-the-observation-window
    …
    The tree holds 2 observation-window cutoffs, expected exactly 1:
      apps/backend/src/market-breadth.ts — getTime() - BREADTH_WINDOW_MINUTES * MS_PER_MINUTE
      apps/backend/src/market-unusual.ts — getTime() - RECENT_MINUTES * 60_000
    A SECOND observation window is a second definition of `current` on one screen. …

1 of 55 invariants failed.
EXIT=1
```

Plant deleted, `55 invariants hold.`, exit 0. Then the registered break, which
is the second half of the proof — **a check proved only by a plant the author
wrote is a check fitted to that plant**:

```text
$ pnpm break a-second-observation-window
Breaking apps/backend/src/market-overview.ts
  A second aggregate over the live map derives freshness itself, …

  $ node scripts/check-invariants.mjs

✓ apps/backend/src/market-overview.ts broken → red → restored byte-identical.
  matched: A SECOND observation window is a second definition of
```

### ADR 0041 — the order

`docs/adr/0041-a-ranked-surface-re-orders-under-live-data.md`.

**The reconciliation is the ADR's main job.** Task 3.6.3 decided the universe
table never re-orders — _a row that moves while it is being read is a row that
cannot be read_ — and three stories later the landing route ships three regions
whose entire content **is** an order computed from a live value. Both rules are
asserted in `CLAUDE.md`, in two places, and nothing reconciled them. Task
3.6.3's own close had already named the boundary and nobody wrote it down as a
decision: _"a ranked view is a different surface with a different promise, not
this table sorted differently."_ Decision 1 is a four-row table of what the two
surfaces promise, and the universe table's trigger is restated **unchanged**.

Six alternatives, all previously taken with reasons in 4.3.3, 4.3.5, 4.3.6,
4.5.7 and 4.6.5: never re-order; re-order on an explicit reader action; a fourth
mark; a **per-row stagger, rejected on a measurement** (the eleven sector ETFs
arrive in one wave bounded above by §7.4's **243 ms p50 spread, n = 445**, so
the stagger the data was supposed to give free does not exist); animating
`top`/`order`/`grid-row`, **rejected twice over** — per-frame layout on the page
§28 can least afford, and re-ordering in CSS while the DOM stays put hands a
screen reader a **different ranking** from the one drawn, invisible to axe, to
jsdom and to a screenshot; and a hold scoped per list rather than per region.

Consequences recorded: the held-row pad and the **81 px** step it prevents, with
the region one height in every state at every width across twenty-two of them
(**466 px** at Story 4.5, **491 since Task 4.7.4**); rows keyed by **symbol**;
roving stops keyed on symbol and clamping rather than wrapping; **ADR 0039's
focus backstop depending on this decision**; and the inheritance, unexamined, by
Epic 5's `Unusual activity` and any Epic 7 investigation list.

Two triggers: _the first sitting in which a person reports a ranked region as
flashing or refreshing rather than as facts arriving_, with the lever named —
**the disc goes, not the motion** — and, narrower and likelier first, _the
first ranked region whose order a reader can set or undo themselves_, which
fires the universe table's own trigger at the same instant.

**No new mechanism is owed, and every guard cited was verified present before
it was cited**: `the-settle-is-one-token-twice`,
`one-comparator-for-the-order-of-a-move` and
`one-home-for-imperative-navigation` in `scripts/check-invariants.mjs`;
`the-settle-becomes-a-delay-plus-a-duration`, `the-hold-is-scoped-to-one-list`,
`a-new-member-is-swept-to-the-bottom`, `the-held-badge-grows-the-head` and
`the-quiet-group-forgets-a-held-row` in `scripts/breaks.mjs`; and
`e2e/specs/overview-degraded-stops.spec.ts` on disk. None was absent.

### The three amendments

**ADR 0033**, beside the four constraints and before _Two smaller decisions_: a
dated note that **this wire now carries four clock readings and the ADR names
three**. The rules for `computedAt` and `observedAt` live in ADR 0038's
decision 3 and in `docs/GAPS.md`, which by 0033's own precedent is the wrong
home — an instant **nothing** reads got a whole ADR, so an instant a future
threshold **may** read deserves a line in the file a future author will audit.
The amendment is a pointer and not a second home, and it ends on the sentence
the next author needs: **`observedAt` is the only wire instant a liveness rule
may legitimately read**, because it is a fact about the market rather than
about this process.

**ADR 0038 decision 3**, as an amendment and explicitly **not** a new ADR, in
Task 4.5.4's own words: _"a second ADR would be a second home for Decision 1
and would make the misattribution permanent by giving it somewhere plausible to
point."_ A top-N on this frame is a **selection, not a reduction** — every row
carries its own key so ordering, uniqueness and the two lists' interleave are
checkable **from the frame**; the population falls to `GET /securities` (and
the arithmetic is the grain rule's own: **1,243 B** at **124.3 B a row**
against **60,636 B** for a widened `figures`); and the **cut** is
reconstructible, on the session basis from `lastCloses` and on the live basis
from the **snapshot-beside-aggregate pairing**, which is race-free because
`sendSnapshot` has no `await` between its two sends.

**`breadth-is-counted-over-the-equities-alone`'s `claim:` string.** It said
_"the 503 EQUITIES"_; Task 2.3.9 untracked `PSKY` and `WBD`, so it is **501** on
a store built into an empty database. Verified first: the check is
**structural** — it gates on `isEquitySymbol`, on the `equities` binding and on
exactly one `eligibleMoves(` call, and **no `503` literal gates anything**. But
a `claim:` string is **printed by the runner as a live claim** rather than filed
as a dated measurement, so it now reads _"the EQUITIES ALONE, by positive
membership from `UNIVERSE` by `kind`"_ and sends the count to `UNIVERSE.md` §17.
The one failure **message** that also printed `503` was reworded with it, for
the same reason; the `518` in it became _"the whole universe"_.

### Invariant 4's qualification

`CLAUDE.md`, beside invariant 4 and leaving its own wording **intact** — the
owner's Gate 2 decision, written as settled. _Structurally impossible_ is the
right bar and is not met in one named place: **an aggregate over the tracked
universe**. `currentMarketState` filters on `status = 'active'` against the
universe as it stands **now** and the store records no point-in-time
membership, so a replayed breadth count, sector mean or anomaly score computes
over **today's** roster while claiming to describe a past session — present
information reaching a replayed past, in the one place the invariant promises
it cannot.

Two things make it worth a line in `CLAUDE.md` rather than only in Epic 13's
file. **This is the second epic to find it by walking into it.** And the data
to answer _which securities were tracked on that date_ **does not exist and
cannot be reconstructed** — it can only be written from the day somebody starts
writing it, so the cost of deferring is not effort, it is history that is never
recoverable. Owner: **Epic 13**, whose `EPIC.md` carries the constraint in words
that epic can act on (verified, lines 371–372). Condition: **the first replayed
aggregate this product renders.**

## What this task did NOT do

- **It re-decided nothing.** Every figure, alternative and trigger above was
  taken in an earlier task and is attributed to it; where an argument already
  has a home it is **cross-referenced rather than restated**, which is the rule
  that kept the percentages alternative in `PRODUCT_SPEC.md` §9 and the
  selection property out of a new ADR.
- **It did not repair the `docs/GAPS.md` claim in the status line above.** That
  is Task 4.9.5's row, 4.9.5 is still ahead of this task, and quietly writing
  somebody else's entry would remove the only evidence that the obligation was
  ever outstanding.
- **It did not bring `Market proxies` and `Sector performance` inside the
  window.** ADR 0040 records the asymmetry as known and dated, with the
  argument for it, and Task 4.7.3 already removed the **reload** that made the
  contradiction reachable by pressing F5. Closing it is a product decision
  about what the top of the screen says during an outage.

### Gates

| Gate                                        | Result                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `node --check scripts/breaks.mjs`           | clean, after **every** edit to it — ~4,374 lines of sibling object literals and a lost brace is a `SyntaxError` |
| `node --check scripts/check-invariants.mjs` | clean                                                                                                           |
| `pnpm break a-second-observation-window`    | **red, then restored byte-identical** — transcript above                                                        |
| `pnpm links`                                | `539 documents, 1743 cross-file links, 39 anchor links, 0 broken.` before the new task file; re-run after it    |
| `pnpm build && pnpm verify`                 | green — tail and the invariant count in the story's record                                                      |

**Not run, and why:** `pnpm e2e` and `pnpm test:database`. Nothing in this
change is in either one's scope — no component, no stylesheet, no route, no
query and no wire field was touched, and the one script edited is imported by
no shipped code. Running either would have been five minutes and a database
for a change whose whole runtime surface is a grep.

## For a stakeholder — a status report, 2026-10-12

**Nothing on the screen changed, and that is the point.** This was the writing
down of five decisions the architect specified and you accepted at Gate 2 — the
kind of work whose absence costs a later epic a week of re-litigating something
that was already settled.

**Two new architecture decision records.** The first says what **"current"**
means for every figure this product aggregates: a security counts as heard from
if we have an observation from the last **five minutes**, where the five comes
from a measurement of a real session rather than from somebody's taste, and
where the same single test decides both the figure and the denominator printed
beside it. That definition now binds every region this product will ever add,
Epic 5's anomaly scores included — which is why it is a record rather than a
comment.

**The second settles an apparent contradiction a reader would otherwise have
to resolve for themselves.** On `/securities` this product refuses to let rows
move under a live feed; on the landing page the ranked regions re-order
constantly. Both are deliberate and the reason is that the two surfaces promise
different things: a table is the universe in a declared order, and a ranked
region **is** an answer to _where should I look_. A list that refused to re-rank
would be stating yesterday's answer in today's figures, which is the one failure
worse than movement because nothing on screen reveals it. The record also names
the condition under which we would change our minds, and the exact lever to pull
first.

**One thing was built rather than written.** An ADR that describes a guard and
does not ship one is a claim, and this repository has been burned by that twice.
The five-minute window is now held mechanically, and the check was proved
against the file the **next** epic would plausibly write — a second aggregate
with its own idea of recency. The first, obvious version of the check passed
that test wrongly, reporting all clear with the defect sitting on disk; the
transcript is kept in the record, because an unproved check and a working one
look identical from the outside.

**And one honest finding.** The amendment written three weeks ago to repair
exactly this class of problem — a document claiming a safeguard that does not
exist — itself ends with a claim that a safeguard exists in a file where it does
not, because the task that was to write it has not run yet. It is not repaired
here: it belongs to that task, and quietly fixing it would erase the only
evidence that the obligation was ever outstanding.
