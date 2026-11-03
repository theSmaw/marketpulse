# Task 6.3.1 — The Band Reaches the Wire

**Status:** **Complete — 2026-11-03** — real distribution measured at
normal 33.4% / elevated 41.4% / high 21.9% / extreme 3.3% (485 scored
equities, one local-store instant), replacing the inherited figure that
summed to 445.6 instead of 484; byte cost measured at 3,145 bytes for the
section over 485 real symbols, confirming the ~3.1KB shaping estimate.
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

## What was done — 2026-11-03

**A new optional `anomalyBands` section on `WireMarketOverview`**
(`packages/shared/src/market-stream-protocol.ts`): `WireAnomalyBands` — four
readonly symbol arrays (`normal`/`elevated`/`high`/`extreme`) plus `cohort:
WireUnusualCohort` (reused rather than invented). Encoded via
`anomalyBandsFields`/`encodeAnomalyBands` (withheld — the whole section,
never half — if any of `cohort.max`/`scored`/`others` is non-finite,
`encodeUnusual`'s own rule), decoded via `readAnomalyBands`/`readSymbolList`,
which refuses a frame whose total symbol count disagrees with
`cohort.scored`, whose symbols collide across bands, or whose `cohort` does
not itself decode. Declared `satisfies Record<keyof T, JsonSchemaProperty>`.
`MARKET_STREAM_PROTOCOL_VERSION` was **not** bumped — same precedent as
`breadth`/`movers`/`unusual`.

**Built from `cohort.members`, never a second pass.** `market-unusual.ts`
gained `anomalyBandsOf(members, scale)`, called from both `unusualActivity`
(live basis, off the same `cohort.members` the existing ranked rows already
hold) and `sessionSection` (session basis, off the same
`StoredCompositeRanking`-derived cohort). Neither arm queries anything new.
`unusualActivity`/`sessionSection`'s return type widened from
`WireUnusualActivity` to a new `UnusualPass = WireUnusualActivity &
{ readonly anomalyBands?: WireAnomalyBands }`.

**`index.ts` needed zero changes.** The obvious shape — a second top-level
input to `toWireMarketOverview` — would have needed its own key in
`index.ts`'s call site, and `each-overview-section-names-its-own-set`
requires that key's value to be a visible, inline call naming its own
population; a bound-variable reference (`unusualPass.anomalyBands` lifted
to a sibling property) would have broken that check's text walk. Instead
`toWireMarketOverview` reads `unusual.anomalyBands` off the one value it was
already handed — the call site at `index.ts`'s `unusual:
unusualActivity({...})` is untouched, confirmed by diff.

**Scoping and the never-mix-sessions rule are structural, not a wire-level
filter.** `cohort.members` is built from the composite population (the 501
curated equities) by construction, upstream of this task — the eleven
sector SPDRs, four market proxies and the hub were never candidates to
begin with, so there is no fifth case to filter. `sessionSection`'s existing
refusal (two nightly tables a session apart → no `cohort` → no
`anomalyBands`, naturally, via the same early return) needed no new code.

**`readAnomalyScore`'s refusal path (Done-when 5) is enforced by
construction rather than exercised by a new test.** Every `candidate.
outcome` feeding `anomalyBandsOf` is freshly computed by `scoreAnomaly()` in
this same process, never decoded off a wire or a stored column that could
disagree with itself — `a-stored-composite-is-minted-from-its-answers`
already guarantees the session arm's scores are minted the same way. There
is no code path on the producer side where an outcome's explanation fails
to re-add, so nothing there can be refused. What **is** exercised, at the
wire layer where a malformed frame genuinely can arrive (a stale image, a
hand-built test fixture, a future bug), is `readAnomalyBands`'s own refusal
on a symbol-count mismatch, a duplicate symbol, and an unreadable cohort —
covered in `market-stream-protocol.test.ts`.

**Tests.** `packages/shared/src/market-stream-protocol.test.ts` gained a
`describe("the anomaly-bands section — every scored equity, bucketed (Task
6.3.1)")` block: encode/round-trip, absence (not empty arrays) when nothing
is scored, absence on a malformed read, refusal on total ≠ `cohort.scored`,
refusal on a duplicate symbol across bands, refusal on an unreadable
cohort, and a check that no encoded band ever names a SPDR/proxy symbol.
**150 of 150 tests pass** in that file (143 pre-existing + 7 new).
`apps/backend/src/market-unusual.test.ts` gained three assertions: the
"every factor refused" and "two nightly tables disagree" tests now also
assert `section.anomalyBands` is `undefined` (both already-refused states);
the stored-composite ranking test (AMD/MSFT/NVDA at session ranks 71/99/88)
now asserts each symbol's `anomalyBands` bucket matches its own ranked
row's `band` (read off the row, not re-derived from `scoreAnomaly`'s
arithmetic — an earlier draft of this assertion hand-computed the bands and
had AMD and NVDA swapped; the fix reads the band off the already-asserted
row instead). **37 of 37 tests pass** in that file.

**The distribution was re-measured against real data (Done-when 6).** The
inherited figures (`normal` 219.2, `elevated` 179.4, `high` 39.3, `extreme`
7.74 "per instant over 484 scored securities") summed to 445.6, not 484, and
carried no record of how many instants they were an average over. This
machine's local Postgres store holds exactly one composite-score instant
(`session_composite_scores`, session `2026-09-11`, 485 rows — the local
store's only backfilled session). Counted directly:

```
$ psql ... -c "SELECT band, count(*) FROM session_composite_scores GROUP BY band;"
   band   | count
----------+-------
 elevated |   201
 extreme  |    16
 high     |   106
 normal   |   162
```

**normal 162 (33.4%), elevated 201 (41.4%), high 106 (21.9%), extreme 16
(3.3%)** — sums to 485, the scored population the same frame reports
elsewhere. The `16` corroborates `CLAUDE.md`'s own independent citation of
"16 `extreme` securities in the whole universe" from Task 5.6.3 — same
store, same session, read a different way. `STORY.md`'s AC 2 (the ~10%/~2%
"hot spot" guess) and AC 6 (the inherited 445.6-summing figure) were both
corrected with these numbers, with the caveat stated plainly: this is one
instant on one store, not a distribution across sessions, because nothing
records how many instants the inherited figure was ever an average over.

**The byte cost was measured against the real encoder (Done-when matches
the Work item), not estimated.** A throwaway instrument
(`encodeMarketStreamMessage` from the built shared package, fed the 485 real
symbols above bucketed into their real bands) measured an otherwise-minimal
`overview` frame grow from **144 to 3,289 bytes** — **3,145 bytes** for the
section alone, ~3.07 KiB, confirming the ~3.1KB figure the Gate-1 decision
was taken against. Run once, the finding quoted above, then deleted per
house convention. `STORY.md`'s Decision 1 records the confirmation;
stating it beside `MARKET-OVERVIEW.md` §8.4's own frame-size figures is
Task 6.3.5's, per this task's own Work item.

### Gates

`pnpm --filter @marketpulse/backend test market-unusual` → 37/37.
`pnpm --filter @marketpulse/shared test market-stream-protocol` → 150/150.
`pnpm build` → exit 0 (tsc -b, Vite bundle, Storybook build). `pnpm lint`
(`eslint . --max-warnings 0`) → exit 0. `pnpm format:check` → exit 0.
`pnpm test` (`pnpm -r run test`) → shared 667/667, backend 1344/1344,
frontend 1717/1717. `pnpm verify` (build → lint → format:check → stories →
env:check → links → invariants (80 hold) → coverage:check → test →
test:scripts → test:process) → **exit 0**, full transcript captured.

## For a stakeholder — a status report, 2026-11-03

This task was invisible on purpose — it is the backend half of the story's
first task, broadcasting data the renderer will draw in later tasks. The
market already scores every one of its 485 eligible equities each batch;
only the top-ten list reached the browser. Now the full band breakdown
does too, on a new optional part of the existing live-market message, built
from numbers the server was already computing — no new database query, no
extra work per batch beyond bucketing symbols that were already sorted.

Two things from the original task brief that were marked "re-measure, don't
guess" are now real numbers rather than carried-forward estimates. The
story's design doc had guessed that about 10% of securities would land in
the "high" band and about 2% in "extreme" (used to argue those are the only
two bands that should use colour, so the graph doesn't look like a warning
light most of the time); the real count, taken from this machine's own
database, is 21.9% and 3.3% — the "extreme" guess held up well, "high" was
about twice the guess. And the byte cost of sending this new data — the
original estimate was "about 3.1KB per update, a meaningful but acceptable
cost" — measured at 3,145 bytes against the real encoder with real security
symbols, which confirms that estimate almost exactly.

Nothing was deliberately left undone. The one open item — carrying the
measured byte figure sideways into the document that tracks the overview
frame's overall size budget — belongs to a later task in this story by the
original plan, not an omission here.
