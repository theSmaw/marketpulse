# Task 3.2.10 — Verify, document, and hand Story 3.3 a feed it can render

**Status:** Not started
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
