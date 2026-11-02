# Task 6.3.1 — The Band Reaches the Wire

**Status:** Not started
**Story:** [6.3 The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](STORY.md)
**Depends on:** nothing

## Objective

`market-unusual.ts` already computes a composite band for every eligible
equity each batch (~485 of them) — only the wire **selection** is 10, for
`Unusual activity`'s own ranked rows. This task broadcasts the rest: a
band-bucketed section on the existing overview frame, for every scored
equity, on both the live and session bases, so every later task in this
story has real data to draw with rather than a fixture.

## What the user can see when this lands

**Nothing.** Backend-only; nothing drawn yet.

## Work

- **A new optional nested section on `WireMarketOverview`**
  (`packages/shared/src/market-stream-protocol.ts`), alongside `breadth`,
  `movers` and `unusual` — **absent**, never present-as-empty, where nothing
  was scored (CI's permanent state, byte-free there). Shape: four arrays of
  symbols, one per band (`normal`/`elevated`/`high`/`extreme`), plus the
  cohort the section is about (reuse `WireUnusualCohort`'s shape rather than
  inventing a second). **Absence from all four bands means unscored** —
  `normal` is listed explicitly so a dropped or stale section defaults to
  "we don't know" rather than "calm". Declare properties
  `satisfies Record<keyof T, JsonSchemaProperty>` per house convention.
- **Scoped to the 501 equities.** The eleven sector SPDRs, four market
  proxies and the hub are never in any of the four arrays — they are outside
  the composite's population entirely (confirmed at Gate 1 shaping), not a
  fifth "unscored" case.
- **The band comes off `candidate.outcome.band`, never `bandOf(score)`
  re-derived at the wire** — `rowOf`'s existing rule in `market-unusual.ts`,
  extended rather than duplicated. Build the section from `cohort.members`
  (the full ~485-strong array `unusualActivity()` already holds) with a
  `.map()`/`.reduce()` before `selectByScore(..., limit)` takes its ten —
  the existing ranked rows are unaffected.
- **Both bases.** The live arm reads the same `candidates`/`cohort.members`
  the live ranked section already builds from. The session (out-of-hours)
  arm reads `StoredCompositeRanking`'s own `scores` array, already resolved
  once per batch by `session-composite-cache.ts` — no new query, no new
  table. **Never mix the two halves**: where `session_composite_scores` and
  `session_return_percentiles` are a session apart, the section is **absent
  entirely**, matching `sessionSection`'s own existing refusal rather than a
  new rule.
- **Re-measure the distribution AC 5 needs**, now that real band data
  exists in one place: over a real batch (or several), count scored
  equities per band, confirm the total matches the scored population
  reported elsewhere on the same frame (`measured-set.ts`), and restate AC 5
  in `STORY.md` with the correct denominator — or say plainly why the
  original figures were per-instant means over a varying population if
  that is what re-measuring confirms.
- **`MARKET_STREAM_PROTOCOL_VERSION` is NOT bumped.** The section is new and
  optional; an old decoder ignores an unknown key, same precedent as
  `breadth`/`movers`/`unusual`'s own addition.
- **Byte cost measured on a real frame**, not estimated — confirm the ~3.1KB
  figure from shaping against what the encoder actually produces, and state
  it beside the existing frame-size figures in `MARKET-OVERVIEW.md` §8.4
  (handed sideways in Task 6.3.5, not here — this task only takes the
  measurement).

## Done when

1. The new section exists on `WireMarketOverview`, encoded once per batch on
   both bases, absent (not empty) where nothing is scored.
2. It is built from the same `cohort.members`/`StoredCompositeRanking` the
   existing ranked section already resolves — no new backend query, no new
   cache.
3. The eleven sector SPDRs, four market proxies and the hub never appear in
   any band array, on any store.
4. A frame where the two nightly tables disagree in session produces no
   section at all, matching `sessionSection`'s existing rule.
5. `readAnomalyScore`'s refusal path is honoured — a security whose
   explanation doesn't re-add is absent from every band array, not placed in
   one by a raw score.
6. The real distribution is measured and the discrepancy in AC 5 is
   resolved (restated in `STORY.md`, with the command or method that
   produced the figure).
7. Unit/integration tests cover: the section's presence/absence rules, the
   scoping to equities, the never-mixed-sessions rule, and the
   `readAnomalyScore` refusal path.
8. `pnpm build && pnpm lint && pnpm format:check && pnpm test` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
