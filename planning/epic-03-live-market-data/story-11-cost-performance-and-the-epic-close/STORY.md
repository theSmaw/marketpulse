# Story 3.11 — Cost, Performance, the Sweep & the Epic Close

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.10
**Epic scope covered:** the continuous-connection cost envelope, the epic's exit criterion, and everything this epic falsified upstream

## Description

The close, in the shape Epic 2's worked: re-take every acceptance criterion
against the thing it is about rather than citing it, finish the subject
document, write the ADRs, **sweep upward**, and hand what ships open to a named
owner rather than to a story number.

It carries one measurement no other story can take, because it needs a month
rather than an afternoon.

## The cost envelope, which is a re-measurement and not a confirmation

**Epic 1's recorded figure is an idle figure and this epic breaks the condition
it rests on.** The Consumption plan's idle vCPU rate requires the replica to
receive **less than 1,000 bytes per second** of network traffic. A replica
holding a live feed exceeds that through every market session, so the estimate
moves from **$4.21** to **$14.04** for the replica — **$9.21 to $19.04** a month
with ACR Basic. Memory bills the same either way; the discount is on vCPU alone.

**And the alert that matters would not fire.** The `$20` budget with its
50/80/100% alerts sits just _above_ the active-rate total, so the single change
most likely to move this bill is the one the thresholds cannot see.

Epic 1 could not take a real reading at all — both billing APIs refused, then
answered `[]` and `429` — so **this is a re-measurement rather than a
confirmation**, and the budget threshold is re-decided against what it reads.
Storage is the second half: a live session adds rows every day, and what a month
of them costs is arithmetic nobody has done.

## What the user can see when this story lands

**Nothing new, and the epic's exit criterion walked on the deployed site by a
person** — a live connection maintained for the tracked universe, visible market
values updating without a page refresh, at three viewports.

Epic 2 ended by making its exit criterion **run on every deploy** rather than be
walked once. This epic's criterion is harder: it needs a live session, and a
deploy at 21:00 on a Sunday cannot prove it. That is a real constraint on what
the deployed check can assert and it should be stated rather than worked around.

## Why it sits here in the sequence

Because a close re-takes rather than cites, and there is nothing to re-take
until the last feature story has shipped.

## Scope

- **The cost reading**, above, with the budget re-decided and `HOSTING.md`
  amended. Note what is being measured: the change is the **socket**, not the
  traffic to browsers, and the two are separable in the reading.
- **The performance figures, at universe scale with the feed running**:
  §28's _event → application state <250 ms p95_ excluding provider latency;
  _no routine main-thread task >50 ms_; and the one breach this product already
  carries with a named owner — **50–76 ms on every cold load of `/securities`
  and `/securities/:symbol`, from the 518-row table rather than from the chart**,
  measured three times and attributed from both ends each time. Its trigger is a
  condition that outranks Epic 14, and Story 3.6 will have evaluated it; this
  story records the verdict either way.
- **The subject document finished** — `LIVE-DATA.md`, from Story 3.1, as the
  maintained account of how a live observation reaches a screen, with the rule
  that where it and any task file in this epic disagree, **it wins**.
- **The ADRs.** Epic 2 produced nine; this epic's candidates are the streaming
  seam and what a fixture-backed stream certifies; the motion vocabulary and
  what a green suite certifies about it (nothing below a browser can see
  motion, and nothing at all can see whether it helps); and the two-tape store.
  **ADRs are never renumbered**, so these start at **0030**.
- **The upward sweep, which is the obligation most likely to be skipped.**
  Falsification travels **upward**: a task measures a vendor or the tree, and
  what it invalidates is a premise in an ADR, an invariant in `CLAUDE.md`, or
  `PRODUCT_SPEC.md` — and **nothing sweeps upward**, because a story close
  sweeps that story's own documents. This has already happened once in this
  repository: for a day, `ALPACA.md` and ADR 0019 both recorded that §7.1's feed
  claim was false while §7.1 itself, `README.md`, two other ADRs and invariant 6
  went on asserting it. The known candidates before the work starts:
  - **`PRODUCT_SPEC.md` §42's milestone**, whose _live price updates_ clause is
    this epic's and is explicitly marked as such
  - **§7.1's asymmetry table**, which is a dated observation of a third party
    and will have been re-measured by the spike
  - **`CLAUDE.md`'s invariant 6**, whose parenthesis — _Epic 3's live feed must
    not inherit Epic 2's word_ — becomes a statement about shipped code
  - **`CLAUDE.md`'s "Current state"** section, including _what they still cannot
    do: watch a price move_, which this epic makes false
  - **`FeedIndicator`'s and `feed-status.ts`'s own comments**, which describe a
    component that is not in the chrome and a type waiting for this epic
  - **`VISUAL-LANGUAGE.md`'s Motion section**, whose deferral is discharged
  - **`PROVIDER.md` §12**, which sketched this epic's seam and can now record
    what shipped against what was predicted
- **`docs/GAPS.md`.** Add what this epic leaves standing, each with a
  `Re-measure:` line — and take the standing instruction seriously: **an entry
  that can be made mechanical should be**, because a prose entry with a
  re-measure command is a check nobody runs. A live feed generates exactly the
  kind of claim that rots silently.
- **`pnpm break` entries** for every check this epic added, and a run of each.
- **What ships open**, each with an **owner and a condition** rather than a
  story number.

## Out of scope, and who owns it

- Aggregations over the live universe — Epic 4
- Anomaly scores — Epic 5
- Any repair to the §28 cold-load breach beyond evaluating its trigger —
  Epic 14, unless Story 3.6's measurement fired it

## Open decisions — settle with the user

1. **The budget**, re-decided against a real reading.
2. **Whether the deployed check asserts liveness**, given that it cannot on a
   Sunday. The honest options are a criterion that only asserts out of hours
   what can be asserted out of hours, or a scheduled check inside a session —
   and the second is a new mechanism rather than an assertion.

## Acceptance criteria

1. Every acceptance criterion in Stories 3.1–3.10 re-taken against the thing it
   is about, with the instrument named and the reading quoted — and the split
   stated between the ones that re-take from a clean clone and the ones that are
   **dated readings against a populated store and a live session**
2. The exit criterion walked by a person on the deployed site during a live
   session, at three viewports
3. A real billing reading, the budget re-decided, `HOSTING.md` amended
4. §28's figures re-taken with the feed running
5. The ADRs written; `LIVE-DATA.md` closed as the maintained document
6. The upward sweep performed against the list above **and against a grep**,
   with live claims amended, historical records left standing, and ADRs given
   dated amendments rather than rewrites
7. `docs/GAPS.md` updated, with anything mechanisable made mechanical
8. `pnpm verify`, `pnpm test:database` and `pnpm e2e` all green, and every new
   check's break performed
9. **[`LIVE-REHEARSAL.md`](../LIVE-REHEARSAL.md) is complete** — a dated row for
   every visible story, each watched against the real IEX socket during a real
   session, with its `What was wrong` column filled in honestly. Added
   2026-09-16 with [ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md):
   this epic can be built at any hour against a replay of our own bars, and
   criterion 2 above is the only other thing standing between that convenience
   and an epic that closes without anyone having watched the live feed work.
   **A missing row is closed by taking the rehearsal, never by deleting the
   row** — and a `pnpm invariants` entry asserts every story `EPIC.md` marks
   complete has one, so this criterion is checked rather than remembered
10. **The replay's guards re-broken rather than assumed**: that a replay refuses
    to start while the market is open, and that a replayed series cannot reach
    `market_bars`. Both are the mechanisms ADR 0030 rests on, and a check that
    has not gone red this epic has not been tested this epic

## What this story hands forward

A live application, and an epic whose figures can be re-taken rather than cited.
