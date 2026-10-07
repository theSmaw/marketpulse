# Task 4.4.4 — The join sees 518, and breadth rides the frame

**Status:** Not started
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.1 (the positive filter) and 4.4.2 (one classifier)

## Objective

**Breadth is the first consumer of the join that needs the whole universe**, and
every guard around that join is shaped for a handful of named symbols.

## What the user can see when this lands

**Nothing.** The frame carries breadth and nothing renders it. Task 4.4.5 is the
payoff.

## Work

- **Widen the one call site to `trackedTickers()`** — all 518 — and split by
  **positive** membership on both sections. **Do not add a second call site and do
  not widen `one-producer-of-the-overview-aggregate`'s bound**: its break is the
  weak 1→2 signal and would pass silently under a wider one.
- **Count over the 503 equities**, not all 518 — the owner's Gate 1 decision. A
  count including SPY and the eleven SPDRs alongside their own constituents makes
  this region and `Market proxies` non-independent, and in a one-sided market the
  fifteen shift the figure by up to ~2.9 points.
- **`overview.breadth`, a NEW optional key carrying a two-member union** —
  `basis: "observed"` with the five-minute coverage, or `basis: "session"` with the
  session date. **Counts, never percentages**: three independently-rounded
  percentages sum to 99 or 101, which is AC 5 as a defect. Optional **on the read
  side too**, because a rollback pins a previous image and a new bundle can meet an
  old gateway.
- **ADR 0031's obligation at a second grain**: one `WireFields` map **per union
  member**, not one over the union — `keyof` a union is the intersection of its
  members' keys, so a single map would wave the discriminating fields through
  unexamined. Build the section outside the map and spread it in a branch, as
  `encodeOverview` already does. **Non-finite drops the whole `breadth` key**,
  never a field and never `0`: a `0` under `advancing` is a plausible, readable,
  wrong figure saying _nothing in the market went up_.
- **The window is measured on `bar.startsAt` against the join's own `asOf`** — not
  on `CurrentObservation.ageMs`, which is computed with **its own wall clock** and
  would put a second clock into a function whose purity is invariant 4 made
  structural, and would be wrong under replay. **`startsAt` is also what Task
  4.1.6 measured**: the curve's 1-minute row reads 0 in all 390 samples precisely
  because a bar arrives after the minute it describes has ended. Measuring on an
  arrival instant shifts every figure in that table by a minute.
- **N is the sum, by construction, not a second measurement.** One pass, a `switch`
  over the three directions **with no `default`**, so a fourth category fails to
  compile and `advancing + declining + unchanged === N` is true by shape rather
  than by test.
- **The same window filters the numerator and the denominator.** If the counts
  fold over the whole map while N is windowed, the stated denominator and the
  counted numerator disagree — invisibly, with every number well-formed — and the
  surplus lands in `unchanged`, **collapsing _unchanged_ into _not heard from_,
  which is the one failure this story exists to prevent.**
- **Measure the widening**: 518 joins per applied batch, ~16 a minute, inside the
  socket callback. Record the figure; it is the first universe-scale per-tick
  computation on that path.

## Done when

1. `overview.breadth` carries counts and a denominator in a labelled union, with
   one field map per member
2. `figures` still carries exactly four and `sectors` eleven — asserted on a
   pass-through frame
3. `advancing + declining + unchanged === measured` holds by construction, with a
   test that fails if the pass is replaced
4. The window is `startsAt` against `asOf`, and a test proves a stale observation
   is excluded from both the count and N
5. `one-producer-of-the-overview-aggregate` still reports one call site, its bound
   unchanged, and its break re-run
