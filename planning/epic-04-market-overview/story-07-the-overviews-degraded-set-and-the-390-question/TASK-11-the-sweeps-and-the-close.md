# Task 4.7.11 — The sweeps and the close

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.1 … 4.7.10

## Objective

**A story close does not sweep upward or sideways on its own.**

## Work

### Upward, with what is already known to be owed

- **ADR 0033's _"36 bytes a frame, at most 16 frames a minute"_** — false in
  the tree, owed since Task 4.1.6, and Task 4.7.7 either discharges it or
  amends it.
- **ADR 0036**, if the keepalive moves.
- **ADR 0038 and ADR 0029**, if Task 4.7.3 or 4.7.4 changes what they describe.
- **Every figure this story's own `STORY.md` carries that the repairs void** —
  the `332`, the `54.0 s` idle floor, the `3×` margin and the **~90 s
  candidate**, which is **below the post-repair floor**. They are this story's
  own hand-offs and they are now historical records with their dates; correct
  the live claims and leave the dated ones standing, **with the count of each**.
- **The `201 px` chrome string** (Task 4.7.8), and the 390 wrap argument that
  rests on it.
- `scripts/deploy-gap.mjs` **hard-codes `watchdogMs: 165_000`** rather than
  importing it, so it would silently disagree with any change.

### Sideways — and run BOTH passes

Grep this story's documents for every `Story N.M` and `Owner:`, **and then walk
the epic's own story list asking _did 4.7 measure anything that story acts
on_**. **The second pass has found what the grep could not in five consecutive
stories.** Record the miss count. Story 4.9 is the obvious candidate — the
rehearsal, the deployed re-count Task 4.7.7 owes, and the suite verdict.

### `docs/GAPS.md`

Named now so they are written when found rather than at the close:

1. **The 2,000 ms floor has never been met on a real network.**
2. **The shared harness answered the retry, so before Task 4.7.1 no spec held a
   `disconnected` state for more than ~2 s.**
3. **`observedAt` is the only wire instant a liveness rule may read, and nothing
   says so** — either add it to `the-send-instant-is-not-a-clock` as a permitted
   field with its reason, or record that it is deliberately unguarded. **Leaving
   it undocumented is the half that rots.**
4. **The 165 s entry's figures are pre-repair** — amend with the keepalive-floor
   arithmetic rather than rewriting.
5. **A backgrounded tab's word lags and does not redial**, with the measurement
   if the sitting took one.
6. Whatever the sitting found, **including nothing**.

### The close

`STORY.md`'s status, naming **which ACs are met and which single row is owed**
the way `LIVE-REHEARSAL.md` does — rather than leaving the whole story _in
progress_ because one criterion needs a calendar. `CLAUDE.md`'s _Current
state_. The subject document. Then Gate 2.

## Done when

1. Every falsified live claim corrected the same day, historical records left
   standing, **with the count of each**
2. Both sideways passes run and **the miss count recorded**
3. `docs/GAPS.md` entries written, anything mechanisable made mechanical with
   its break
4. `STORY.md` says which criteria are met and which row is owed
5. `pnpm verify` and `pnpm e2e` green, and Gate 2 put to the owner

---

## Handed here by Task 4.7.3 — 2026-10-10: three things for the sweeps

Written here rather than linked.

**1. `three joins per cold load of `/`` is now false wherever it is a live
claim**, because `sendSnapshot()` serves the last broadcast aggregate. Swept on
2026-10-10 across sixteen files: amended in `docs/adr/0038`,
`scripts/check-invariants.mjs`, `scripts/breaks.mjs`,
`apps/backend/src/market-gateway.ts`, `market-gateway.process.test.ts`,
`market-overview.test.ts`, `apps/frontend/src/components/OverviewSourceNote/overview-source-note.ts`
and `planning/epic-14-performance-scale-validation/EPIC.md`. **Left standing as
historical records**: Story 4.8's `STORY.md` and its task files 4.8.3, 4.8.8,
4.8.10, 4.8.11 and 4.8.12, which record what was true when they were written.
**Re-grep at the close** — `grep -rn "three joins"` — because the sweep was
taken before this story's remaining tasks were written.

**2. The per-cold-load join product is now an estimate of a different thing.**
Task 4.8.11 had already said the ~4.6 ms rescale was an estimate rather than a
measurement; the count behind it has moved from three to one. If anything wants
the figure, re-take it with Task 4.8.11's recipe rather than dividing.

**3. One `docs/GAPS.md` entry was added and it is a condition rather than a
story**: _A replica restarted mid-session still serves its first browser a thin
aggregate_. Owner is the first deploy mid-session somebody watches `/` across.
Three candidate repairs are priced in it and none is costed; the cheapest
honest one — withholding the aggregate frame when there is no last broadcast —
is **refused with a reason** there, because it deletes two of Story 4.2's
sixteen states from every cold load.

---

## Handed here by Task 4.7.6 — 2026-10-11: one Gate 2 item, two amended claims and a new break

Written here rather than linked.

**1. For Gate 2, and it is the owner's because it changes shipped hold
behaviour.** `ORDER HELD` stays on while a **re-taken** pin moves every row.
`Region` combines non-bubbling `pointerenter`/`pointerleave` with **bubbling**
`focusin`/`focusout`, so a focus move _inside_ a ranked region releases the pin
and takes a fresh one against the last frame drawn. Measured in Chromium with
the membership held still: a pinned `SMCI FSLR NVDA AMD TSLA` becomes
`TSLA AMD NVDA FSLR SMCI` on **one `ArrowDown`**, with the badge on throughout —
and the press took the reader one row **up** the screen, because the key handler
read the order that was on screen when the key went down. **A second trigger
needs no key press at all**: Task 4.6.5's focus recovery is itself a focus move
inside the region, so a degradation that empties a list re-pins against the
emptied frame.

Story 4.6 left the first half unrepaired deliberately; its consequence in a
degraded state was not part of that decision, and the second half did not exist
when it was taken. The recommendation, costed in `docs/GAPS.md`: release the pin
on `focusout` only when focus has actually **left the region** — one condition
in `Region`'s `blurred` handler, using the event's own `relatedTarget`. What it
costs is that a reader who never leaves the region never sees a newer order,
which is the judgement Task 4.5.7 owns. **Do not take it as a tidy-up.**

**2. Two live claims were falsified and carry dated amendments** — sweep them if
either file moves: `use-order-hold.ts`' _"there is no state in which the badge
is on and the order is moving"_ and `MoversMeta.held`'s _"there is no state in
which the head says `ORDER HELD` over a region that is re-ordering"_. Both were
about one value being unable to disagree with itself, which is true and is not
what the defect is. Grepped at the time: two live sites, both amended; Story
4.5's and 4.6's task records left standing as historical.

**3. A new `docs/GAPS.md` entry and a new break.** The entry is
_`ORDER HELD` stays on while a re-taken pin moves every row_; the break is
`a-region-does-not-catch-its-dropped-focus`, over
`apps/frontend/src/components/Region/Region.tsx`, run by
`pnpm e2e overview-degraded-stops.spec.ts`. The break was performed **by hand**
for Task 4.7.1's reason — the harness refuses on an uncommitted target — with
the file checksummed either side; run it under `pnpm break` once this is
committed.

**4. One claim of ADR 0039's is now narrower than it reads**, and the ADR
carries a dated amendment rather than a rewrite: the decision reasoned about the
**seven region stops** and its rejected alternative is exactly the shape the
**twenty ranked ticker stops** have had since Story 4.6. Nobody considered it
there.

**5. One flake in a sibling spec, measured rather than suspected.**
`overview-nothing-to-open.spec.ts:545` — _the UN-PINNABLE hold state is reached
by keyboard_ — failed **1 of 48** at `--repeat-each=6`, reading the ranked list
as empty one line after `send()`. `expect(await tickersIn(ranked)).toEqual([…])`
is a plain `expect` over an `evaluateAll` and therefore does **not** retry, so
it races the frame being applied; the repair is `expect.poll` or an
`await expect(…)` on the first row's `data-ticker`. Left for whoever next reads
that file rather than edited from here.
