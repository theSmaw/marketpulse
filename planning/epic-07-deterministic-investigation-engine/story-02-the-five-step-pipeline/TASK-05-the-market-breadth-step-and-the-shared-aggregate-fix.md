# Task 7.2.5 — The market-breadth step, and the shared-aggregate fix

**Status:** Not started
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1

## Objective

Wraps `marketBreadth`/`eligibleMoves` so an investigation can state a
group fact about the whole tracked market — never a verdict on the
investigated security, and its own output type structurally cannot
carry one (`Input` is `{}`, no ticker at all).

**The real work in this task is architectural, not the tool itself.**
`marketBreadth` needs `eligibleMoves(...)`, which needs
`MarketOverviewEntry[]` from `buildMarketOverview(...)` — all three
currently live only as locals inside `index.ts`'s `marketOverview`
closure, and the only retained copy anywhere is `lastBroadcastPass`, a
private `let` inside `market-gateway.ts`. `pnpm invariants`'
`one-producer-of-the-overview-aggregate` forbids a second
`buildMarketOverview` call site, so a naive tool cannot simply recompute
one — and recomputing would also be the one place this story would walk
into Epic 13's own named invariant-4 gap (an aggregate computed over
`status = 'active'`, the market we track _now_, is exactly what a future
replay has to refuse).

## What the user can see when this lands

A real `Check market breadth` row stating a group fact — e.g. "Of 501
tracked equities, 312 were heard from in the last five minutes: 96
advancing, 211 declining, 5 unchanged" — on a developer's populated
store with the live feed running, or an honest, specific refusal on
every other store. The figure this step reports and the figure `/`'s own
`Market breadth` region draws are, from this task onward, **the same
number from the same pass at the same instant** — never two homes for
one fact.

## Work

**The architecture fix (do this first; the tool is small once it's
done):**

- Move the single producer's latest computed pass to one small holder
  beside `currentMarketState` in `index.ts` — **not** inside
  `market-gateway.ts`, whose own stated rule is that it decides _when_ a
  browser is told something and must not decide _what_ is true. The
  holder records **every** pass the producer computes, not only
  broadcast ones (so it reflects "the latest answer this process
  computed, and when," independent of whether any browser is attached).
- `market-gateway.ts`'s existing `lastBroadcastPass` becomes a _read_ of
  this one holder rather than a second memo of the same fact — collapse,
  don't duplicate. Confirm nothing regresses for the two-tabs-of-`/`
  consistency reason `lastBroadcastPass` originally existed for (Task
  4.7.3).
- Add a new `pnpm invariants` entry: the holder has exactly one writer
  (count write sites, not files — the real regression this guards is a
  second write added _beside_ the existing one), with a `pnpm break`
  entry planting a second write.
- Confirm `breadth-is-counted-over-the-equities-alone`'s existing corpus
  (currently `index.ts`-only) reaches a new tool file. If it doesn't,
  widen it in this same change, with its own `pnpm break` — do not leave
  this as a check that is prose for a file it has never seen.
- Write the dated amendment to ADR 0038, recording: the trigger fired;
  which option was taken (the holder, not a per-request recompute);
  `one-producer-of-the-overview-aggregate` stays literally true and was
  deliberately not reworded; and the new reversal trigger as a condition
  — "the first non-browser consumer of the aggregate that cannot accept
  the retained answer" (the named candidate: Epic 13's replay, where "the
  latest pass" is meaningless and the aggregate must be computed at the
  replay clock instead).

**The tool itself:**

- Build `get_market_breadth` as an `AnalyticalTool<{}, Output>` — no
  ticker in the input at all. `Output` reuses the existing
  `WireMarketBreadth` shape (`basis`, `advancing`/`declining`/`unchanged`,
  `measured`, `tracked`, `windowMinutes`|`session`) rather than minting a
  parallel one.
- When the holder has nothing recorded yet, the tool completes with a
  **distinct, honest refusal** — not "nothing observed" (which is a
  different fact: "we have an aggregate, and it says the market was
  quiet"), but "no aggregate has been computed in this process yet."
  This is invariant 5's `UNKNOWN`, not a failure, and it is the
  permanent state of CI (zero bars, no provider) and of any process with
  no reader attached.
- Reports the whole tracked universe (501 equities, never the sector
  cohort) — resolved at Gate 1, reusing the exact arithmetic with no new
  code.
- Wire into `investigationTools`.

## Done when

1. The architecture fix lands with its own passing tests: one holder,
   confirmed single-writer by `pnpm invariants` + `pnpm break`; the
   gateway's two-tabs consistency behaviour is unchanged.
2. ADR 0038 carries its dated amendment.
3. `get_market_breadth` is unit-tested with the holder stubbed/furnished
   both populated and empty, independent of any other tool's test.
4. The breadth step's output type cannot carry a per-security score —
   held as a type-level claim (the `@ts-expect-error` idiom
   `return-percentile.ts` already uses), not only a runtime test.
5. On a developer's populated store with the live feed running, the
   step's figure matches `/`'s own `Market breadth` region at the same
   instant. On CI, the step completes with the new, distinct
   no-aggregate-yet refusal.
6. `pnpm verify` is green.
