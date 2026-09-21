# Task 3.2.10 — Verify, document, and hand Story 3.3 a feed it can render

**Status:** **Complete — 2026-09-18. Story 3.2 is closed.** `STREAM-SEAM.md` written and named in `CLAUDE.md`; **no ADR, argued**; both audits ran with counts; `pnpm verify` and `pnpm e2e` (140) green. **The audits found one false positive and one real ordering conflict.** See _What was found_.
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.9

## Objective

Close the story: the subject document, the ADR if one is owed, the upward sweep,
and the hand-off that makes Story 3.3 a rendering job rather than a discovery
job.

## What the user can see when this lands

**Nothing** — and this is the last story in the epic of which that is true.
**Story 3.3 is the payoff and it is next**: it puts this feed's state in the
chrome, and it is the first time the product says something true about the
market _now_. Say that plainly when reporting the close.

## Work

- **The subject document.** This story's decisions and measurements need a home
  — `LIVE-DATA.md` is Story 3.1's record of **the vendor**, and this story's
  record is of **our client**. Decide deliberately whether that is a new
  `STREAM-SEAM.md` or a section of an existing document, and **add it to
  `CLAUDE.md`'s _Where the record lives_ table** if it is new.
- **An ADR if a decision was taken that outlives the story.** The likely
  candidate is the seam itself — what a green stream suite certifies, and what it
  does not. If nothing qualifies, **say so rather than writing a thin one**.
- **Sweep upward.** Every task in this story may falsify something written
  before it. Check `PROVIDER.md` §12's sketch against what was actually built,
  ADR 0030's description of the tree, and [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) — **and if the
  spike's answers turned out not to cover something, amend `LIVE-DATA.md` rather
  than deciding it in a task file**, which is this story's own standing rule.
- **Record what a green suite does NOT certify.** The whole suite runs on
  fixtures transcribed from a document, against a vendor nobody re-measured
  during this story. That is a real limit and it belongs in `docs/GAPS.md` with
  a re-measure, not in a footnote.
- **Hand Story 3.3 what it needs by name** — the shape of the state it renders,
  the five cells including `REPLAYING`, and the fact that connection state and
  feed identity are **different questions**.
- **Hand Story 3.5 and Story 3.10 their inherited constraints**: the upstream
  subscription is a constant and there is no resubscription protocol to write
  (§10.2, §8.7); the `u` superseding has to land somewhere and that somewhere is
  3.5's current-state model; reconnection policy and the gap it leaves are
  3.10's, informed by §14.2 — **what is missed while away is gone**, so
  gap-filling is an HTTP backfill and cannot be a socket feature.
- **AUDIT EVERY HAND-OFF `LIVE-DATA.md` NAMES, against the story that owns it —
  added 2026-09-18, and it is not optional.** Do not trust Story 3.1's close on
  this; it is already known to have been incomplete.

  **The evidence, so this is a repair rather than a precaution.** On 2026-09-18
  Task 3.2.4 found that `LIVE-DATA.md` §4.4 says in as many words _"Two of these
  change **Story 3.5's** shape rather than informing it"_ — and Story 3.5's
  `STORY.md` carried **nothing**. Task 3.1.9's close gathered five constraints
  for Story 3.2, the canvas answer for 3.4, the gap finding for 3.10 and the
  weekend hold for 3.11, and **missed 3.5 entirely**. Worse, 3.1.9's own stated
  reason for gathering Story 3.2's five was that a measured constraint which is
  not one of the eight decisions _"is exactly how a measured constraint gets
  lost"_. **It named the failure mode and then suffered it**, which is the whole
  argument for making this mechanical rather than attentive.

  It was also found **by accident** — 3.2.4 hit the symbol-validation question
  while writing a mapper and had to decide where it belonged. Nothing was looking
  for a missing hand-off, and nothing would have.

  **So do it by enumeration rather than by reading:**

  - **Grep `LIVE-DATA.md` for every `Story 3.N` mention**, and for the
    `Owner:` lines, and build the list before opening anything. A list you
    derived is checkable; a list you remembered is not.
  - **For each one, open that story's `STORY.md` and confirm the constraint is
    actually there**, in words that story can act on — **not** a link back to
    `LIVE-DATA.md`. A pointer is what a reader follows when they already know to
    look, and the whole failure is that they do not.
  - **Repair what is missing, in the owning story's file**, and record in this
    task's findings **how many were missing** — that count is the honest measure
    of how well the close worked, and it is the number a future epic close should
    expect to beat.
  - **Then extend it one hop**: `ALPACA.md` §10, `PROVIDER.md` §12 and
    ADR 0030 also name owners. Same treatment.

  **Note the shape of the bug, because it generalises past this epic:** a close
  sweeps the documents the story _wrote_, and a hand-off lives in a document the
  story _does not own_. Nothing about a story-close checklist naturally reaches
  across that boundary, which is why this has to be an enumeration with a count
  rather than a reminder to be thorough.

- **AUDIT EVERY CONSTRUCTION SITE — added 2026-09-18 after Task 3.2.9, and it is
  a different audit from the one above.** That one checks a **document** reached
  the story that owns it. This checks that **code reached a caller**.

  **The evidence, so this is a repair rather than a precaution.** Task 3.2.9 had
  to be added to this story because it shipped **three implementations of
  `MarketDataStream` and constructed none of them**. Every implementation was
  tested, every guard was proven with a `pnpm break`, and `pnpm verify` was green
  throughout — **because the absence of a construction site is not a shape any
  test has.** It was found by grepping for `createAlpacaStream(` and getting zero
  matches outside tests, and that grep only happened because a sweep asked what
  had changed.

  **Do it by enumeration, the same way:**

  - **List every exported factory, route and registration this story added** —
    `createAlpacaStream`, `createFixtureStream`, `createReplayStream`,
    `createMarketStream`, `createStoredReplaySource`, `registerMarketStreamCloser`,
    `readFeedDiagnostic`, `GET /diagnostics/feed`, `probeFeed` — and build the
    list before grepping. A list derived from the diff is checkable; a list from
    memory is not.
  - **For each, grep for a call site outside `*.test.ts`.** Zero matches is
    either a defect or a deliberate deferral, and **the two must be told apart in
    writing** — `MarketDataStream` itself was legitimately unimplemented for one
    task by design, and that is different from unreachable at the close.
  - **Record the count of things with no caller**, and for each survivor name the
    story that will call it. Zero is a result worth stating.
  - **Then run the built server and read `GET /diagnostics/feed`**, because the
    grep proves a call exists and only running it proves the call works. Task
    3.2.9 did exactly this and it is what turned _the code looks wired_ into _the
    feed reports `synthetic`/`live`_.

  **Note what this is not.** It cannot be a `verify` step: a factory built one
  story ahead of its caller is a legitimate state this repository uses
  deliberately, so a mechanical rule would fire on correct work. It is an
  enumeration with a written disposition, which is the residue `docs/GAPS.md`
  exists for.

- **Walk the acceptance criteria against a RUNNING system, not only the suite.**
  Task 3.2.9 is the proof this matters: every criterion in
  [`STORY.md`](STORY.md) could be read as satisfied while nothing ran. Start the
  built server under each configured provider and read what it says.

- **Check the epic's own open items.** Story 3.4 still owes a design decision on
  the **unreachable canvas**, and the extended-hours mark and _this corrected_
  treatment it now owes. This story does not resolve those; it should confirm
  they are still named.
- **`pnpm verify`, `pnpm e2e`, and every gate this story's changes can break.**

## Done when

- The subject document exists and `CLAUDE.md` names it if it is new
- An ADR is written, or its absence is argued in one paragraph
- The upward sweep ran, with **what was corrected and what was found already
  true** both listed
- What a green suite does not certify is in `docs/GAPS.md` with a re-measure
- Stories 3.3, 3.5 and 3.10 have their hand-offs **in their own `STORY.md`
  files**, not only here
- **Every `Story 3.N` mention and every `Owner:` line in `LIVE-DATA.md` has been
  enumerated and checked against that story's own `STORY.md`**, with **the count
  of how many were missing recorded** — zero is a result worth stating, and
  anything above zero is the repair this task made. Extended one hop to
  `ALPACA.md` §10, `PROVIDER.md` §12 and ADR 0030
- Every acceptance criterion in [`STORY.md`](STORY.md) is walked and marked,
  **against a running server rather than only the suite**
- **Every exported factory, route and registration this story added has a call
  site outside a test, or a written disposition naming the story that will call
  it**, with the count of survivors recorded
- `pnpm verify` and `pnpm e2e` pass

## Notes

The half most likely to be skipped is the sweep, for the reason `CLAUDE.md`
records: **recording a correction and propagating it are two obligations**, and
the mechanism that defers the first routinely covers only the product decision
the measurement forced, not the document that was wrong. Story 3.1's close caught
four such documents; this story should expect to catch some too.

---

## What was found

### The subject document is new, and the split is by subject rather than by size

`STREAM-SEAM.md`, named in `CLAUDE.md`'s _Where the record lives_ table.
**`LIVE-DATA.md` is about THE VENDOR; this is about OUR CLIENT** — a figure about
what Alpaca does belongs there and is re-measured rather than cited; a decision
about how we respond to it belongs here. Its §0 is the five things most likely to
be needed in a hurry.

### No ADR, and the absence is argued rather than assumed

The task says to write one **or say why not**. Not one, and the reason is this
repository's own rule rather than a shortage of material.

Every decision this story took already has exactly one home: the seam being a
**sibling** is `PROVIDER.md` §12's; the replay's five mechanisms are **ADR
0030**'s; the eight live-data decisions are `LIVE-DATA.md`'s; what a green suite
does not certify is `docs/GAPS.md`'s, now entries 7, 9 and 10. **An ADR
restating them would be a second home for decisions that already have one**,
which is the `one fact has one home` rule the invariants already enforce
mechanically elsewhere.

**The strongest candidate was the two-clock decision**, and it was declined for
the same reason: it is a consequence of §11.2's thresholds, and §11.2 now carries
it. `STREAM-SEAM.md` §3 explains it where an implementer will meet it.

### Audit 1 — the hand-offs. One false positive, and the crude version lied

**The enumeration**: ten stories named in `LIVE-DATA.md` — 3.2 (22×), 3.10 (20),
3.11 (17), 3.3 and 3.4 (10), 3.5 (8), 3.6 (7), 3.9 and 3.8 (6), 3.7 (3).

**A first pass counted `LIVE-DATA` references in each story's own file and
flagged Story 3.7 with zero.** That was a **false positive**: 3.8 carries its
constraint — the `bar_coverage` provenance column and why it stops being
sufficient the day an IEX bar is stored — in words it can act on, and simply does
not cite the source document by name. **Which is the correct shape**, since the
audit's own instruction is _in words that story can act on, not a link back_.

**The lesson is about the audit rather than the stories**: counting citations
measures citation, not delivery. The second pass read what each story was being
told and checked for that fact, which is slower and is the only version that
works.

**Missing after that pass: zero.** Every constraint `LIVE-DATA.md` names has
reached the story that owns it — which is the number a future epic close should
expect to beat, and it is only zero because three earlier sweeps repaired Story
3.5's, Story 3.10's, Story 3.11's and Story 3.3's along the way.

### Audit 1 also found a real ordering conflict, which is NOT a missing hand-off

**Two documents answer the same question differently, and both arguments are
good.**

- **Story 3.9's `STORY.md`**: _Before Story 3.8, deliberately_ — storing live
  bars would make its two-feed ledger come out of the database rather than out of
  the **stitch**, and the read-time stitch is the case the provenance design was
  built against.
- **`LIVE-DATA.md` §10.3**, decided later: today's bars are **not** held in
  memory, so _"Story 3.9's chart uses it, and **Story 3.8** stores the live
  session so that it can… Decision 4 and Story 3.8's scope are **one decision
  seen twice**."_ Its rejected alternative says it outright: _last observation
  only_ makes 3.8 **a dependency of 3.9 rather than a story after it**.

**The epic table has neither** — 3.9 depends on 3.6, 3.8 on 3.5 and 3.8. So a
dependency was decided in the spike and never propagated.

**Deliberately not resolved here**, because it is an epic-ordering decision
rather than this story's to take. **It is now in both stories' own files**, with
the real question stated so it can be answered rather than re-derived: _with
today's bars not in memory, where does 3.9's chart get the minutes between the
session open and the latest observation?_ — from 3.8's store, from the
current-state map alone with a visible hole, or from an early HTTP read that is
Story 3.10's gap-filling arriving sooner. **Story 3.9's argument for going first
is about the LEDGER and survives all three**; only today's _shape_ is in question.

### Audit 2 — the construction sites. One survivor, and it is a deferral

Fifteen exports enumerated from the diff. **Fourteen have a caller outside a
test.** The survivor:

|                            | Callers outside tests | Disposition                                                                                                                                                                                                                                                                     |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createMemoryReplaySource` | **0**                 | **Deliberate.** It is the `ReplayBarSource`'s in-memory implementation, which `STORY.md` required so that _one engine serves this and the generated case_ — and it is what lets every replay test run with **no database**, which `pnpm test` demands. Named rather than hidden |

**That is the disposition the audit asks for, in writing**, and it is the
distinction the item insists on: a factory built for the test suite is not the
same state as a factory nothing anywhere calls.

### The criteria were walked against a RUNNING server, and it was worth it

```text
alpaca  {"provider":"alpaca","feed":"iex","status":"disconnected",…}   started anyway, closed cleanly
replay  {"provider":"replay","feed":"replay","status":"live",…}        started, closed cleanly
none    {"provider":"none","feed":null,"status":null,…}                 no stream configured
```

**The `alpaca` line is the asymmetry working.** A deliberately wrong credential
produced a started process reporting `disconnected` rather than an exit — which
is what §8.2 and §8.4 require, and which no unit test states as plainly as
watching it happen.

Every run closed the stream deliberately: `http drained → market stream closed →
database pool closed`.

### What was checked and found already true

- **`PROVIDER.md` §12's sketch survived contact**: the seam is a sibling, shares
  the domain types, adds no configuration variable, and composition stayed
  available. Nothing in it needed correcting.
- **ADR 0030's description of the tree is now true** where it was aspirational —
  `replay` is in both unions, the guards exist, and §7f's claim that the deployed
  site connects to the real socket every session became true with Task 3.2.9.
- **`pnpm e2e`: 140 passed.** No browser assertion in this story, which is
  correct — nothing reaches a screen until Story 3.3.

### One piece of housekeeping worth naming

`pnpm e2e` was blocked by a **three-day-old `vite` on port 5173 whose backend was
long dead** — a stale pair serving nothing, with a browser tab still attached.
Cleared, a fresh pair started, and the suite run against that. Recorded because
_a suite that cannot start is not a suite that passed_, and the next person to
meet a busy 5173 should check its age before assuming it is theirs.

## For a stakeholder — a status report, 2026-09-18

**Story 3.2 is complete.** Ten tasks. A user can still explore 518 companies and
their historical charts, and still cannot watch a price move — **but the system
now connects to the live market, and can be asked what it is serving.**

**What this closing task did: checked our own work, twice, by counting rather
than by reading.**

Two audits, and both exist because earlier work had already failed the thing they
check.

**The first checks that a finding reached the team that needs it.** A fortnight
ago we spent nine days measuring the real market feed, and at the end handed the
findings to the pieces of work that would need them — and **missed one entirely**,
despite our own notes naming it in as many words. So this close re-checks every
one, by listing them mechanically rather than trusting anybody's memory.

**The result: none missing.** Worth saying plainly — though it is only zero
because three earlier reviews repaired the gaps as they went.

**But it did find something better: two of our own documents answering the same
question differently.** One says a piece of work should come _before_ another;
the other says it _depends_ on it. Both arguments are good, and they are about
different things — one about where a chart's data comes from, one about where a
provenance record comes from. **We did not resolve it**, because it is a
scheduling decision rather than this work's to take. We wrote the question into
both pieces of work so whoever schedules them settles it deliberately instead of
discovering it halfway through.

**The second audit checks that what we built is actually reachable** — added
after we discovered, two tasks ago, that we had built three ways to supply live
prices and connected none of them. Fifteen things checked; fourteen are in use.
The one that isn't is a test helper, which is a legitimate reason, and we wrote
down _why_ rather than leaving a blank.

**And we walked the requirements against a running system rather than a test
suite.** That is a distinction this close now insists on, because the earlier
gap proved a whole story's requirements could read as satisfied while nothing
ran. Doing it caught something reassuring: given a deliberately wrong password,
the system **starts anyway and honestly reports itself disconnected**, rather
than refusing to run. That is exactly right — refusing would mean failing to
deploy every time, for a reason that is entirely normal — and it is much more
convincing to watch than to read.

**One decision I want to flag as a non-decision.** The close asked whether this
work warranted a formal architecture record. **It did not, and saying so was the
point.** Every decision here already has exactly one home; writing a document
restating them would create a second place for the same facts to live, which is
how two versions of a decision start disagreeing. We wrote a subject document for
the _implementers_ instead, and left the decisions where they were made.

**How this unlocks progress.** **Story 3.3 is next, and it is the payoff**: it
puts the feed's state on screen. It is the first time this product says anything
true about the market **right now** — and because of this story, it is a
rendering job rather than a discovery job.

**What a user can see today: nothing new.** **That sentence has appeared in every
task report for two stories, and Story 3.3 is where it stops being true.**
