# Task 5.6.8 — The conjunction, the sweep, and the close

**Status:** Not started
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.7

## Objective

A collection of completed tasks is not a completed story — and this story leaves
one design question that **cannot be settled by reading** and must be settled by
photographs.

## What the user can see when this lands

**Nothing new**, unless the amber decision changes a token.

## Work

- **The amber conjunction, into the kept grid.** Four tokens resolve to
  `--palette-amber: #e2b544`: `--anomaly-high`, `--feed-stale`,
  `--service-degraded`, `--provenance-synthetic`. The status bar is **sticky**, so
  a drawn chip and a `STALE` cell are **always co-visible** — adjacent at 390,
  ~700 px apart at 1440. **Chip-against-chrome greyscale step is 1.00**, so no
  greyscale simulation of the region alone can show it.
  - **Rows into `overview-degraded-grid.spec.ts`** (a **kept** spec — Task
    3.10.9's grid was deleted and took a repair with it that had to be re-derived
    two epics later; **add rows, do not restructure**): `high` × stale, `extreme`
    × stale, `high` × backend degraded, `high` × both, `high` × synthetic, and a
    **control** with no chip. Four widths, colour **and** greyscale.
  - **Whole-viewport, never region-scoped** — a crop is the one picture that
    structurally cannot show this.
  - **Say in the spec's header that these are FURNISHED**, produced through the
    shipped socket path like Task 4.7.9's thirteen states, because on CI every
    score is absent for ever. Otherwise the first reader takes a green flagged
    run as proof the collision was examined.
  - **The architectural cost of a repair is zero and that is the useful fact for
    Design**: every consumer reads the semantic token, never `--palette-amber`,
    and `market.css` says the indirection exists for exactly this move. Moving
    `--service-degraded` is **one line**; no component moves.
  - **The two tokens are not symmetric.** `--provenance-synthetic`'s amber has a
    **safety** argument — a fixture-backed deployment advertising itself
    structurally rather than by somebody remembering a banner — so it stays, or
    moves **louder**, never quieter. Recommend moving `--service-degraded` only.
  - **If anything moves, add both names to `TOKEN_NAMES` in the same change.**
    Neither is there today, so the startup throw does not cover them and a
    `var()` resolving to nothing renders an **invisible marker with correct DOM
    and a green `verify`**.
- **Sweep upward**: every figure this story falsified, same day. At minimum
  `anomaly.ts`'s boundaries docblock, `MARKET-OVERVIEW.md` §1.4's trigger count,
  and `unusual-activity.ts`' now-false _"`AnomalyBadge` is imported by no shipped
  route and stays that way"_.
- **Sweep sideways by grepping for every `Story N.M` and `Owner:` line**, check
  each against that story's own file, and **record the count that were missing**.
  Prior art: 5.4's close was 1 of 4, 5.5's was **3 of 3**, and 5.5's next-day
  sweep found a 4th. **Known already**: Story 5.7 (the AC 7 contradiction over
  `substantially`, plus `LIVE-REHEARSAL` row 5.6); Epic 7 (the ledger is a
  complete explanation **only** beside the factor bands — any surface drawing
  this score without them owes its own account); Epic 14 (which clause fired and
  which did not).
- **`docs/GAPS.md`** for every claim left standing, and anything mechanisable
  made mechanical instead. At minimum: no gated machine and no person has seen a
  composite drawn; **the score is checkable against nothing on screen and is
  strictly worse than the percentile** — its inputs are two such figures plus
  weights, so **the explanation's internal addition is the only check that will
  ever exist**; and whether `extreme` is reachable at all, with a condition (the
  first week in which no security reaches the top band).
- **`LIVE-REHEARSAL.md` row 5.6** — the sixth this epic owes. Row 5.5's
  _unwatchable_ precedent applies to the volume term; the **score itself is
  watchable** once two factors are present, which is a stronger row than 5.5's.
- **`STORY.md`, `MARKET-OVERVIEW.md`, `CLAUDE.md`'s Current state**, and the
  subject document. ADR **0046** — one ADR with three parts (the weighted sum and
  its four refused alternatives; no imputation / no renormalisation / the factor
  count in the identity; the score and explanation as one object with its
  guarantee ending at the wire), each with a **condition** as its reversal
  trigger. Not three ADRs: ADR 0038 refused that for the stated reason that _"a
  second ADR would be a second home … and would make the misattribution
  permanent by giving it somewhere plausible to point."_
- ADR **0044** gets a **third dated amendment** (third application), and the
  `*_passes` convention should become a **mechanism** — a stated convention in
  `apps/backend/migrations/README.md` plus an invariant that every DERIVED table
  keyed on `(…, observed_at[, feed])` has a sibling passes table. **Not** a shared
  `derived_aggregate_passes` table with a discriminator: the three pass rows carry
  differently-typed columns, which is 0044's own argument against widening.

## Done when

1. The conjunction rows are in the kept grid, furnished and labelled as such,
   whole-viewport, colour and greyscale.
2. The amber decision is taken **with the photographs in hand**, or explicitly
   deferred with a condition.
3. The sideways sweep is enumerated and the missing count recorded.
4. ADR 0046 exists with three parts and three conditions; 0044 amended.
5. `LIVE-REHEARSAL.md` row 5.6 states what is watchable and what is not.
6. `pnpm verify`, `pnpm test:database`, `pnpm e2e` at two workers — all green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
