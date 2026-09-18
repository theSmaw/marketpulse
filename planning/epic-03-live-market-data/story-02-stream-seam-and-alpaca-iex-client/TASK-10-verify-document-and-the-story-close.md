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
- Every acceptance criterion in [`STORY.md`](STORY.md) is walked and marked
- `pnpm verify` and `pnpm e2e` pass

## Notes

The half most likely to be skipped is the sweep, for the reason `CLAUDE.md`
records: **recording a correction and propagating it are two obligations**, and
the mechanism that defers the first routinely covers only the product decision
the measurement forced, not the document that was wrong. Story 3.1's close caught
four such documents; this story should expect to catch some too.
