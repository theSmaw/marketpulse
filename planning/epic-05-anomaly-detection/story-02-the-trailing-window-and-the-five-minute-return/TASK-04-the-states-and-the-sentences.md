# Task 5.2.4 — The States & the Sentences

**Status:** Not started
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](STORY.md)
**Depends on:** 5.2.3

## Objective

**The state every gated run is permanently in is not the state anybody designs
against.** CI's store is 516 securities and zero bars and its feed is
`provider=none`, so the window there **never holds one entry** — every gated run
renders an absence, for ever. Story 5.1 shipped the adjacent defect and repaired
it: _nothing has reached us yet_ and _everything reached us and none of it had a
move_ were one sentence for a day.

**For a window there are four absences, not two**, and they must not collide.

## What the user can see when this lands

**The region is honest in every state**, and no two of them read alike.

## Work

- **Eight states, drawn and asserted.** The four absences first, because they
  are the ones that collapse:
  1. **the security unresolved** — held room, geometry only, the region-level
     sentence after the 2,000 ms floor;
  2. **no window payload yet** — deliberately the same as 1, which is
     `RelativePerformance`'s own reasoning rather than a third state;
  3. **payload arrived, zero bars for this symbol** — CI's permanent state, and
     a restarted replica's: the figure slot carries **words**;
  4. **one bar held, earlier endpoint absent** — **refused**, with the one
     instant it has and `observed 1 of 5 minutes`, because without them 4
     collapses into 3 and _refused_ and _heard nothing_ are the two facts that
     look identical;

  then 5. a legitimate partial (2 ≤ k ≤ 4); 6. k = 5; 7. a return of **exactly
  zero**, which is `PriceChange`'s `unchanged` and must not be confusable with a
  refusal; 8. a valid figure whose window ended forty minutes ago — **nothing
  changes**, because the instant is the age and there is no verdict.

- **Two new sentences, and no more.** Eight absence sentences are already
  approved and named in `relative-performance.ts`; neither of these can be one
  of them:
  - the **region-level noun**, which names its own region — four already read
    `No prices yet.` / `No count yet.` / `No sector moves yet.` /
    `No moves to rank yet.` on `/` and `No comparison yet.` on this page, so
    **this is the sixth of its kind and not the fifth the story's own Design
    work section says.** `NO_COMPARISON` names the comparison region and reusing
    it would put one string in two regions.
  - the **missing-endpoint refusal**. `NO_CLOSE` says _no close to measure
    from_ and a close is a **session** artefact off the universe answer; what is
    missing here is a **minute bar at an instant**. Reusing it would tell a
    reader the store lacks a close when it lacks a minute.
- **One height across all eight, at four widths**, reserved band by band and
  never a `min-height`. The qualifier gets a **two-line floor at 390**, because
  its width is a function of the printed instants and the k-count — a one-line
  reserve makes the region's height depend on the digits of the day.
- **A browser assertion that asserts NO number**, and is a **pass-through**
  rather than a furnished frame. Task 4.3.8 found **four** overview specs green
  against a server with the ranking deleted, each asserting its own fixture. So:
  forward this product's own frames, assert the drawn figure equals what the
  server sent — **strictly weaker than correctness, and say so** — plus the
  honest-absence string by **exact text**, the region's one height, and the tab
  stop.
  - **The equivalent break is the one that matters**: delete the refusal from
    the producer and watch the spec stay green. If it does, the spec is serving
    its own answer.
- **No live region.** The figure changes about once a minute and an unprompted
  polite update is the open listening item with six entries. Declare it quiet
  **with a reversal trigger**, and add the listening question to that item
  rather than claiming it answered.

## Done when

1. All eight states render, each with its own drawn text, and **3 and 4 do not
   read alike** — asserted by string rather than by eye.
2. The region is **one height in every state at every width**, measured with
   `pnpm probe` and the figure recorded; no `min-height`.
3. Exactly two new sentences exist, each with its recorded reason for not being
   one of the eight already approved.
4. The browser spec asserts no number, forwards the server's own frames, and
   **goes red when the refusal is deleted from the producer** — performed, with
   the transcript.
5. The accessibility tree carries no placeholder value in any state, and the
   quiet decision has a reversal trigger.
6. `pnpm verify` green; `pnpm e2e` green on the specs this touches.

---

## What was done — 2026-10-13

<!-- written at completion -->
