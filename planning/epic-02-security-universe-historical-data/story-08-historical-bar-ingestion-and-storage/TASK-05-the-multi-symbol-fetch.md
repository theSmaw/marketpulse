# Task 2.8.5 — The multi-symbol fetch, and the page that lies about a symbol

**Status:** Not started
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.4

## Objective

Add the batch method `market-data-provider.ts` has recorded since Task 2.6.4 and deliberately
not built: **fetch one window for many symbols in one request, returning a `BarsResult` per
symbol.**

It is a task rather than a section of the backfill because **it fails differently from
everything around it.** The backfill's failure is a skipped window — data that is absent.
This one's failure is a symbol reported as **successfully having no bars** when it has 390 of
them, which is data that is absent _wearing a legitimate answer_, and `PROVIDER.md` §8.2 makes
that answer a **success** by design.

## What the user can see when this lands

**Nothing.** No command drives it yet — the backfill is Task 2.8.6.

## Why this exists at all, in one number

**The rate limit is per REQUEST, not per symbol** — measured, 203 requests of 50 symbols each
against the same ceiling as 201 single-symbol requests. So the naive loop

```
for each symbol { for each session { fetch } }
```

is ~101 × 251 ≈ **25,350 requests** for a year of minute bars, which is over two hours of pure
rate-limited request time. Batched by session it is **~985 requests** — see the arithmetic
below — which is roughly twenty minutes. **The batch is not an optimisation; it is what makes
the backfill a command somebody runs rather than an overnight job.**

## What was measured, 2026-09-08, and it is the whole design

Three symbols, one regular session, `limit=500`, walked to exhaustion through the real API:

| Page | Contents                                                 | Token      |
| ---- | -------------------------------------------------------- | ---------- |
| 1    | `AAPL:390` (13:30–19:59) &nbsp; `MSFT:110` (13:30–15:19) | present    |
| 2    | `MSFT:280` (15:20–19:59) &nbsp; `NVDA:220` (13:30–17:09) | present    |
| 3    | `NVDA:170` (17:10–19:59)                                 | **`null`** |
|      | **Totals: AAPL 390, MSFT 390, NVDA 390**                 |            |

Four properties, and three of them are traps:

1. **`limit` is a total row budget across ALL symbols**, not a per-symbol one. 500 requested,
   500 returned on pages 1 and 2, split across whichever symbols fit.
2. **Symbols are filled in alphabetical order, one at a time**, and the response object contains
   only the symbols that page touched.
3. **A symbol straddles a page boundary.** MSFT arrives as 110 then 280.
4. **A symbol can be entirely ABSENT from a page while having a full session of data.** NVDA is
   not in page 1 at all.

### The trap, stated as the rule it produces

**Nothing may be concluded about any symbol until the walk is exhausted.**

A batch implementation that maps page 1's `bars` object into results reports **`NVDA: ok, 0
bars`** — and `PROVIDER.md` §8.2 is explicit that an empty answer is a **successful** answer,
meaning "the symbol exists and had no prints in this window". So the store would record NVDA as
having genuinely not traded on 2026-09-03, `toBarSeries` would accept it (`bars: []`,
`covered: null`, coherent), Task 2.8.7's completeness report would see a session that was
attempted and returned nothing, and **every instrument in this story would agree that the data
is correctly absent.**

That is the fourth time this story's shape has produced a well-formed lie — after Task 2.7.3's
silent truncation, Task 2.7.5's early-stopping page loop and Task 2.8.6's skipped window — and
it is the only one of the four that survives every check the system has.

The mirror trap is milder and worth naming: a symbol that appears on page 1 and then never
again (MSFT, had the walk stopped) is recorded **short** rather than empty, with `covered`
claiming the whole requested window.

## The shape

**`BarsResult` per symbol, and no new member** — the decision `market-data-provider.ts` already
records. Partial success across a hundred symbols reuses the eight-member taxonomy unchanged:
one symbol's `ok` sits beside another's `unauthorised` and nothing in `PROVIDER.md` §8 moves.

Three things to decide here rather than in the backfill:

- **The return type.** A `ReadonlyMap<Ticker, BarsResult>` rather than an array of pairs or an
  object keyed by string, because a `Ticker` is branded and an object key is not — and the whole
  hazard above is about attributing bars to the right symbol.
- **A symbol asked for and never seen in any page is `ok` with an empty series**, and that is
  correct only _after_ exhaustion. Every requested symbol must appear in the result map;
  a missing key is a bug, and a test should assert the map's key set equals the request's.
- **A failure is the whole batch's, not one symbol's.** A `429`, a timeout or an abort ends the
  walk, and every symbol gets that outcome — because the vendor failed the _request_ and we
  cannot know which symbols the remaining pages held. Attributing a transport failure to
  individual symbols would be inventing information. Note the asymmetry: success is per symbol,
  failure is per batch.

## Provenance and coverage, which do not simply transfer

`SeriesProvenance` is per series and a batch produces many, so each symbol gets its own — but
they share one fetch:

- **`retrievedAt` is stamped once, when the walk begins**, and every symbol in the batch carries
  the same value. Task 2.7.5 settled that for the single-symbol walk on the argument that
  stamping at completion makes a slow fetch claim a freshness it does not have; a batch makes
  the spread wider, so the argument is stronger rather than weaker.
- **`barCount` is per symbol**, and `toBarSeries` refuses a series whose sources' counts do not
  sum to `bars.length` — which is exactly the check a mis-attribution trips. That refusal is
  this task's most valuable safety net and it should be **made to fire** rather than trusted.
- **`covered` is the window the batch answered for**, per symbol, and the `alpacaServableEnd`
  clamp applies to the batch as a whole because the recency cliff keys on `end` alone.

## The page bound, recomputed for a batch

Task 2.7.5 derives the single-symbol bound from the range: wall-clock intervals over the page
ceiling. **A batch multiplies the numerator by the symbol count**, and the bound must follow or
it throws on a correct answer — which is the failure mode that section explicitly warns about.

The arithmetic worth writing into the comment beside it: 101 securities × 390 bars is
**39,390 rows for one session**, against the shipped `ALPACA_MAX_LIMIT` of 10,000, so **one
session for the whole universe is 4 pages**. A year is ~251 sessions × 4 ≈ **1,004 requests**,
and the whole minute backfill is ~9.84M rows ÷ 10,000 ≈ **985 pages** — the two agree, which is
the check.

**And the deadline must be the batch's, not the default.** `DEFAULT_BARS_DEADLINE_MS` is 3,000
and a five-page single-symbol walk already consumes 72% of it; four pages of 10,000 rows is a
much larger response. A batch caller passes its own, per Task 2.7.7's handover.

## Work

- The batch method on `MarketDataProvider`, its result type, and the per-symbol/per-batch
  asymmetry written beside it
- `fixture-provider.ts` implements it — and the corpus is what makes the page-straddling case
  testable offline, so it needs a fixture where a symbol spans a boundary
- `alpaca-provider.ts` implements it: the accumulate-across-pages walk, keyed by symbol
- Recorded fixtures of a real multi-symbol walk, at a reduced `limit` so three pages fit in
  kilobytes — the constraint Task 2.7.5 records applies here too: **a fixture recorded at a
  reduced page size is only replayable against a range wide enough to justify its page count**
- The page bound, recomputed for the symbol count, with the arithmetic in the comment
- **Deliberate breaks, each seen to fail and reverted**, and the first is the one this task
  exists for: mapping page 1's `bars` object straight into results — which must go red naming a
  symbol that has data and was reported empty. Then: a symbol dropped from the result map, a
  per-symbol failure attribution, and `retrievedAt` re-stamped per page

## Done when

- A three-symbol session walked against a real key returns exactly `minuteBars` for each, and
  the same walk replays offline from fixtures
- Every requested symbol appears in the result map, including one with genuinely no data
- The premature-conclusion break goes red; without it, it is green
- `pnpm verify` is exit 0 with no network

## Notes

The reason this is not folded into the backfill is worth keeping after it ships. The backfill
is a walk over sessions and its failures are _loud in aggregate_ — a missing session shows up in
Task 2.8.7's report as a session that was never attempted. This task's failure is **invisible in
aggregate**: the session was attempted, it succeeded, and one symbol in it is empty for a reason
the system believes it understands.

The only thing that catches it is knowing that page 1 is not an answer.
