# Task 6.5.1 — The nightly pass, computed and stored

**Status:** Not started
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](STORY.md)
**Depends on:** nothing (this story depends on 6.2, not on any task in 6.4)

## Objective

Until this task runs, `relationships` is a name in `PRODUCT_SPEC.md` §30 and
nothing else — no table, no pass, no coefficient anywhere in this product. This
task is the whole backend half: a new pair-keyed derived table, a nightly
computation that produces it, and the cost measurement AC 7 demands before it
is scheduled. Nothing downstream (the route, the renderer) can start without
the table this task writes.

## What the user can see when this lands

Nothing. The pass runs in `backfill.yml` and writes rows nobody reads yet.
Task 6.5.2 is what makes any of this visible.

## Work

- **A new ADR** for the pair-keyed derived-relationship family: the canonical
  pair order (on **ticker**, not `security_id` — CI's store and the deployed
  store assign ids in different orders, so an id-ordered key would silently
  canonicalise differently between them), the stored top-N as a **selection**
  (Story 4.5's rule, union construction per STORY.md's resolved Open Decision
  1), and how a refused security propagates to every pair it would have
  formed. Cite ADR 0044 for the nightly/session-keyed mechanism rather than
  re-arguing it.
- **Dated amendments, in the same change:**
  - ADR 0044 — this family gains a member that is not per-security, and two of
    its stated properties do not carry over: the per-security pass's bounded
    resident set, and full resumability on a mid-pass crash (see below).
  - ADR 0045 — the tape lives on the pass row, not in the correlation row's
    key (unlike `volume_baselines`), because nothing about this computation
    carries a pending reversal trigger the way the live/baseline tape choice
    does; record the known, accepted bias this choice carries (see the
    `docs/GAPS.md` note below) rather than silently absorbing it.
  - `PRODUCT_SPEC.md` §30 — `relationships` as a generic table is deliberately
    not built; this story builds `return_correlations` instead, and the
    reasoning (a `kind` column would force every future relationship kind's
    columns nullable) goes beside the amendment.
  - `compute-baselines.ts`'s own header — its stated resident-set invariant
    ("the pass's resident set is one security's window rather than the
    universe's") becomes false the moment this task accumulates a return
    vector per security across the loop. State the real peak figure once
    measured, not just the fact that it changed.
- **Migration**: `return_correlations` (one row per retained pair, canonical
  ticker order, the coefficient, the counted overlap `n`, the window/lookback
  parameters applied) + `return_correlation_passes` (the pair-grain and
  security-grain populations, nested and checked in the database per `0014`'s
  own pattern — a security-grain refusal removes ~500 candidate pairs at a
  stroke, and the pass row's arithmetic must express that rather than report
  one undifferentiated `refused` count).
- **Computation**, inside `compute-baselines.ts`'s existing per-security loop:
  accumulate each security's 5-minute return vector (a by-product of the
  60-session window the pass already reads — no second read of `market_bars`)
  rather than discarding it; after the loop, compute all eligible pairwise
  coefficients in memory; apply the split guard's propagation (a security the
  guard refuses forms no pairs at all, counted once in security space, never
  once per lost pair); derive the minimum-overlap floor via Fisher-z for a
  _ranking's_ precision, not borrowed from Story 5.3's `n ≥ 2500` (that bound
  is about an integer percentile's last digit and does not transfer); apply
  the union-of-each-node's-top-N selection; canonicalise storage order on
  ticker.
- **No landmark node, ever.** The 501 active equities are the candidate
  population; the eleven sector SPDRs, the four proxies and the hub form no
  correlation pair under any circumstance — asserted on the producer, not
  merely absent from today's fixtures.
- **AC 7 — the cost**, measured and recorded verbatim: wall-clock for the
  pairwise phase in isolation and for the whole pass, against `backfill.yml`'s
  real timeout budget (state the share consumed, not the figure alone), and
  peak RSS (the accumulated-vectors resident set this task's own ADR amendment
  above names). A one-off instrument, run and recorded and deleted, in this
  repository's own idiom — quote at least one frame or row verbatim, because
  the instrument will not survive to be re-run.
- **AC 8 — the producer-level selection tests**: the whole retained array
  compared against a hand-written literal (not `length === N`, not
  `toContain`); same-reference checks against the input candidates (catches a
  producer that reconstructs rather than selects); the union-recoverability
  property (a node's own top-N is exactly its retained rows sorted and
  truncated); a declared, tested tiebreak for exact ties; the input-array
  immutability check. Register the break (`the-strongest-n-is-a-selection` or
  similar) in `scripts/breaks.mjs` in the same change, and confirm — per this
  repository's own hard-won rule — that any pass-through wire assertion stays
  green on the planted defect before confirming the producer check goes red.
- **`pnpm test:database` coverage**: `observed_at` has no default on either
  table; the canonical-order constraint is _driven_, not merely read off the
  DDL (attempt the reverse orientation and confirm it is refused); no
  self-pair; no row touching a landmark; the populations nest and a
  non-nesting write is refused; a re-run converges (upsert, not append); the
  pass row is written last and bounds what a reader may trust.
- **`docs/GAPS.md`**: the known, accepted bias — a thinly-traded security's
  pairwise coefficients attenuate toward zero because its 5-minute grid is
  sparser, biasing the ranking against exactly the securities a reader can
  least independently verify — named with an owner and a re-measure condition,
  not silently absorbed into the derivation above.

## Done when

1. `return_correlations` and `return_correlation_passes` exist, are written by
   `pnpm baselines`, and are empty-but-present on a bare store (CI's
   permanent state).
2. The producer-level selection tests pass, the break is registered and
   proven to go red, and `pnpm test:database` is green.
3. AC 7's cost figures are recorded verbatim in this task's own record, with
   the resident-set and wall-clock numbers stated against their real budgets.
4. The new ADR exists; the four dated amendments are in place; `pnpm links`
   and `pnpm invariants` are clean.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
