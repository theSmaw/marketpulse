# Task 2.7.3 — The Alpaca client: one request, one page, and the mapping onto the domain types

**Status:** Not started
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.2

## Objective

Implement `MarketDataProvider` against Alpaca's historical bars endpoint for **one symbol, one
timeframe, one page**, and map the response onto `Bar`, `BarSeries` and `SeriesProvenance`.
Record the raw HTTP bodies as a fixture corpus and test the mapping against them offline.

**Pagination is deliberately Task 2.7.5's and errors are deliberately Task 2.7.6's.** This task
ships the happy path and **fails loudly on everything else** — see below, because that decision
is what makes the split safe rather than a half-built client.

## What the user can see when this lands

**Nothing on a screen**, and this is the story's own framing: it fetches into a terminal rather
than into a database.

What there is to **show** somebody is `pnpm bars NVDA` printing real closing prices for a real
session out of a real market-data vendor. That is the first real market number this product has
ever produced, and it is worth demonstrating even though it is a terminal — `pnpm db`,
`pnpm migrate` and `pnpm universe` established that shape.

## The files

- `apps/backend/src/alpaca-provider.ts` — the provider. One file, beside `fixture-provider.ts`,
  because `PROVIDER.md` §1 puts every implementation in `apps/backend`
- `apps/backend/src/alpaca-mapping.ts` — **the mapping, separated from the transport**, and this
  is the one structural decision in the task. The mapping is a pure function from a parsed
  response body to a `BarSeries`, so every test of it is a fast test with no socket, no
  credential and no build — the property `pnpm test` has held since Story 1.9 and that a
  client-shaped module would quietly break. The transport is the thin part
- `apps/backend/src/fixtures/alpaca/*.json` — raw response bodies, recorded from Task 2.7.1's
  real requests
- `scripts/fetch-bars.mjs` and a root `pnpm bars` — the operator command. A wrapper over the
  built module in `src/`, following `pnpm migrate` and `pnpm universe` exactly: the mechanism is
  inside `pnpm verify`'s net and the script is the name, the built-output guard and the exit
  code. **Check `bars` against `pnpm help -a` before claiming it**, and validate the detection
  against a known built-in in the same run — the procedure `db`, `ready`, `image`, `universe`
  and `e2e` have each followed

## `PROVIDER_IDS` gains `alpaca`, and it is the first vendor name in `packages/shared`

`PROVIDER.md` §4.1 ships that vocabulary with one member deliberately — _"Story 2.7 adds its
own member, in the same commit as the client that produces it"_, which is `SECURITY_STATUSES`'
rule held for the fifth time. This is that commit.

**It moves a recorded figure and the amendment is owed rather than optional.** Task 2.6.8
recorded the code-only vendor grep over `packages/shared/src` as **zero, and always having been
zero**, and it becomes one. Amend that claim where it stands, and say what the new figure means:
one hit, it is the provider id, and it is there because a provenance record has to name the
vendor for §7.1's display to be possible at all. That is the opposite of a leak, and the naive
text grep — already 8 and 7 across the two packages, every one of them a comment explaining a
decision — should be re-run rather than cited, because Task 2.6.5 found the recorded count wrong
by one.

## The mapping, field by field, and the two that are dropped

| Alpaca | Ours       | Note                                                                         |
| ------ | ---------- | ---------------------------------------------------------------------------- |
| `t`    | `startsAt` | **Task 2.7.1 measured which end of the interval this marks.** See below      |
| `o`    | `open`     |                                                                              |
| `h`    | `high`     |                                                                              |
| `l`    | `low`      |                                                                              |
| `c`    | `close`    |                                                                              |
| `v`    | `volume`   | An IEX share count, and §7.1's label is what makes it honest                 |
| `n`    | —          | **Dropped.** `PROVIDER.md` §9.1 declined trade count with a trigger          |
| `vw`   | —          | **Dropped.** Same section, same rule: a field exists when something reads it |

`PROVIDER.md` §9.1 settled the six fields against the vendor's eight, and the rule is that
adding one costs a column in a table with roughly ten million rows a year plus a value in every
response. **Do not widen `Bar` here.** If something genuinely needs `vw`, that is a decision
with a trigger and an owner, not a convenience taken while writing a mapping.

**The timestamp is the one to get right and the one nothing downstream can catch.** Task 2.7.1
measured which end of the minute `t` marks; apply that measurement, and write the evidence into
the mapping as a comment rather than the conclusion alone — because a future reader who
disagrees needs to know what would settle it. If `t` marks the end, the mapping subtracts a
timeframe and **that subtraction is the most load-bearing line in this story**: a one-minute
systematic error is invisible on a chart and wrong in every §11 calculation. Assert it in a test
against a recorded session whose first and last bars are known.

## The request

- **`sort=asc`, explicitly**, because `toBarSeries` refuses a series that is not strictly
  ascending and a default nobody stated is a default that can move
- **`adjustment` from the request**, mapping our two members onto the vendor's parameter:
  `raw` → `raw`, `split-adjusted` → `split`. `PROVIDER.md` §3.3's finding is what makes this a
  one-line pass-through instead of a corporate-actions table
- **`timeframe`** mapping `1m` → `1Min` and `1d` → `1Day`, exhaustively over `TIMEFRAMES`, so a
  third member fails the build here
- **`start` and `end`** as RFC-3339 from the `TimeRange`'s two instants, remembering the range
  is **half-open** and the vendor's is not necessarily — Task 2.7.1's captured bodies say
  whether the bar at `end` is included, and if it is, this mapping drops it. A duplicated bar at
  a window seam is real corruption in Story 2.8's backfill, which tiles thousands of windows
- **No `feed` parameter**, because the free plan serves IEX and asking for something the plan
  does not carry is an error rather than an upgrade. The provider's own `feed` field declares
  `iex`, and the trigger for that becoming a request parameter is a paid plan

## Provenance: one source, and `retrievedAt` stamped exactly once

Every series carries one `BarSource`: `providerId: "alpaca"`, `feed: "iex"`, the `adjustment`
that was asked for, `barCount`, and `retrievedAt` **stamped at fetch and never re-stamped**.

`PROVIDER.md` §4.3 records the trap this repository has already fallen into once: Task 2.3.5's
`checkedOn` defaulting to `now()` made a provenance date permanently silent about the one thing
it exists to report. A read path that re-stamps is the same failure, and it is one careless line
away — but not in this file, because this file is the fetch. Stamp it here so that Story 2.9's
read path has nothing to stamp.

## One attempt, no cache, and the deadline

The module comment above `MarketDataProvider` says all three and this is the first
implementation that could break any of them:

- **One attempt.** No retry — Task 2.7.7 builds the wrapper, and a retry here would make the
  caller's deadline a lie
- **No cache.** Story 2.8 owns the record; a provider that memoises behaves differently on the
  second call, which is exactly what stops a fixture-backed test meaning anything
- **The deadline is the caller's**, defaulting to `DEFAULT_BARS_DEADLINE_MS`, composed with the
  caller's signal through `AbortSignal.any()` — `api-client.ts`'s arrangement, and for its
  stated reason: **which signal fired is read off the signals rather than off the rejection**,
  because a `DOMException` name is a string comparison against a value from another realm. That
  is what keeps `timeout` and `aborted` two different outcomes rather than one guess

**And a call cannot throw for a fact about the world.** Task 2.7.6 owns the taxonomy; what this
task owes is that the happy path returns `{ outcome: "ok", series }` and that the two outcomes
its own deadline and signal produce — `timeout` and `aborted` — are returned rather than thrown.

## What this task does when it meets something it does not handle yet — and it is loud

**A `next_page_token` that is not null is a THROW, not a truncation**, until Task 2.7.5 lands.

This is the decision that makes splitting the client across three tasks honest instead of
dangerous. A client that quietly returns the first thousand bars of a longer range is a client
that lies with a perfectly well-formed answer: the series is ascending, the provenance is
correct, the coverage looks plausible, and it is missing data nobody will notice until a chart
has a hole in it. `PROVIDER.md` §8.5's line applies exactly — **an incomplete answer we
produced is us, not the world**, and laundering it into `upstream-unavailable` or into a
successful short series is the shape that section forbids.

So: throw, with a message naming Task 2.7.5, and keep the throw until that task removes it.
Every request this task makes stays inside one page by construction, which Task 2.7.1's
measured `limit` ceiling makes an arithmetic fact rather than a hope.

## The fixture corpus — the OTHER corpus, and do not confuse it with Story 2.6's

`PROVIDER.md` §6.1 settles this and the wrong instruction is the plausible one:

| Corpus       | Contains                       | Tests                             |
| ------------ | ------------------------------ | --------------------------------- |
| Story 2.6's  | **Domain types** — `BarSeries` | Everything that consumes the seam |
| **This one** | **Raw HTTP response bodies**   | The vendor mapping, and only that |

**Story 2.6's fixture provider is not re-recorded and does not need to be.** It parses no vendor
JSON, so it has nothing vendor-shaped it could be wrong about. What is recorded here is the only
artefact that can test a mapping, which is the only place a vendor's shape can be got wrong.

Record, at minimum: a liquid name over a full regular session; the same name over a **half day**;
a **thin** name with absent minutes; a **holiday** (an empty answer); a daily series over
several months; and the split pair from Task 2.7.1 — the same range as `raw` and as `split`.

Two rules for the recording, both of which are how a corpus goes bad:

- **Record the bytes, not a summary.** A hand-tidied fixture is a fixture of our assumptions,
  which is the exact failure §6.2 declines hand-authoring to avoid
- **Strip the request headers and check for the key before committing** — see Task 2.7.2's leak
  list, where this is named as the most plausible way a credential gets committed in this story

## Work

- The mapping module, pure, with its tests against recorded bodies
- The provider, thin, over `fetch` — **no HTTP dependency**, and expect that answer: Node 24
  ships `fetch`, and this repository has declined a library for one documented request once
  already (`@azure/identity`, 32 packages and 46 MB, Task 2.1.6). If one is proposed, cost it
  from a fresh install the way Task 2.2.1 costed Kysely, then revert
- `alpaca` in `PROVIDER_IDS`, and `createMarketDataProvider`'s exhaustive switch wired — which
  will fail the build until it is, by design
- `pnpm bars`, and the recorded fixtures
- The vendor-grep amendment where Task 2.6.8's figure stands
- Three deliberate breaks, each seen to fail and reverted: the timestamp shifted by one
  timeframe, `sort` removed, and `retrievedAt` taken from the response rather than from the
  fetch

## Done when

- `pnpm bars` prints real bars for a real symbol from a real key
- Every recorded body maps, and every mapping test runs with **no network** — criterion 7
- A range that would paginate throws, naming the task that fixes it
- A security with no split returns identical bars under both adjustments; the split pair differs
  in the direction `PROVIDER.md` §3.5 records
- `toBarSeries`'s five coherence checks pass on every recorded fixture, unmodified
- `pnpm verify` is exit 0 with no network and no database; `pnpm test` still needs neither

## Notes

The temptation in a task like this is to write one file that does the request, the retry, the
pagination and the error mapping, because that is what a client looks like in every example
anybody has ever read. This story is split into five because each of those four has a different
failure mode and three of them fail **silently**: a retry inside the transport lies about the
deadline, a swallowed page lies about the data, and a laundered parse failure lies about whose
fault it is. Only the happy path fails loudly, which is why it is the one that ships first.
