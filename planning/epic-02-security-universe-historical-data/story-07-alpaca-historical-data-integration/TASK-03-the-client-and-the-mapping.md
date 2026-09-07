# Task 2.7.3 — The Alpaca client: one request, one page, and the mapping onto the domain types

**Status:** Complete (2026-09-07)
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

## What Task 2.7.2 left you, and the one thing adding that member changes (added 2026-09-07)

**The credential is already configured, already on the platform, and already typed.** Do not
read `process.env` here and do not add a variable: `config.alpaca` is
`{ keyId, secretKey } | undefined` — **absent** rather than present-and-empty, which is the
distinction `exactOptionalPropertyTypes` exists to draw — and a client that reads it with no
credential configured is a compile error rather than a request signed with `""`. The pair is
refused at startup if only one half is set, so this task never has to consider half a
credential. `apps/backend/.env` on the development machine already holds a real key.

**Adding `alpaca` to `PROVIDER_IDS` has one effect on `config.ts` beyond the exhaustive switch,
and it is a comment rather than a behaviour.** Task 2.7.2's cross-variable check for
_"a provider selected without its credential"_ reads the **raw** `MARKET_DATA_PROVIDER` value
rather than the parsed selection, precisely because `alpaca` was not yet a member and the check
had to be producible on the day it was written. That still works unchanged once the member
exists. What changes is that the configuration stops reporting **two** problems and starts
reporting one, because `readEnum` accepts the value — so:

- the comment in `config.ts` beside `ALPACA_PROVIDER_SELECTION` that explains the two-problem
  consequence, and
- the comment on `config.test.ts`'s _"does not fire on `MARKET_DATA_PROVIDER=alpaca` when the
  credential is present"_ test, which says the selection is still refused so the message is not
  empty,

both become false in this commit. That test should become an assertion that `loadConfig`
**succeeds** and returns `marketDataProvider: "alpaca"` with the credential attached, which is a
stronger claim than the one it makes today and is only available once this member exists. No
test breaks either way; this is a claim that quietly stops being true, which is the class this
repository sweeps for at every close.

**And the harness survives, cleaned.** Task 2.7.1's throwaway scripts are still outside the tree
at `…/scratchpad/alpaca-harness`, swept on 2026-09-07 and holding **zero** credential bytes.
Reuse its refuse-on-match capture writer rather than a manual check — it is the thing that made
2.7.1's 22 captures provably clean, and this task's fixtures are the ones that actually get
committed.

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

**The timestamp is the one to get right and the one nothing downstream can catch.**

**MEASURED 2026-09-07: `t` marks the START of the interval, so `startsAt` maps directly with no
shift.** The first bar of a regular session is stamped at the session open exactly
(`13:30:00Z`), where an end-marking convention would have put it one minute later. So the
subtraction this paragraph used to call _"the most load-bearing line in this story"_ **is not
needed** — which is the good outcome, and `PROVIDER.md` §9.2's naming decision cost nothing.

Write the evidence into the mapping as a comment rather than the conclusion alone, because a
future reader who disagrees needs to know what would settle it, and assert it in a test against
a recorded session whose first and last bars are known. Note a daily bar's `t` is stamped at
**midnight ET** (`04:00:00Z` under EDT) rather than at the session open — so a daily mapping
must not reuse a minute mapping's assumption.

## The request

- **`sort=asc`, explicitly**, because `toBarSeries` refuses a series that is not strictly
  ascending and a default nobody stated is a default that can move
- **`adjustment` from the request**, mapping our two members onto the vendor's parameter:
  `raw` → `raw`, `split-adjusted` → `split`. `PROVIDER.md` §3.3's finding is what makes this a
  one-line pass-through instead of a corporate-actions table
- **`timeframe`** mapping `1m` → `1Min` and `1d` → `1Day`, exhaustively over `TIMEFRAMES`, so a
  third member fails the build here
- **`start` and `end` — SETTLED 2026-09-07, and the vendor's `end` IS inclusive.** Our
  `TimeRange` is half-open `[start, end)`; Alpaca's `end` is **inclusive**. Measured on one
  session: asking `end = close` returns **391** bars for a 390-minute session, with the extra one
  stamped at the close instant — and since `t` marks the **start** of its interval, that bar
  covers 16:00–16:01 ET and is **outside the regular session** `CALENDAR.md` §2 scopes V1 to.
  Asking `end = close - 1 timeframe` returns exactly 390.

  **So this mapping subtracts one timeframe from `TimeRange.end`.** That is now the load-bearing
  line the timestamp turned out not to be, and it is worth a named test: a duplicated bar at a
  window seam is real corruption in Story 2.8's backfill, which tiles thousands of windows, and
  it is exactly what `PROVIDER.md` §9.3 made the type half-open to prevent

- **Explicit session bounds, never a bare date.** Measured: a date-only range
  (`start=2025-11-28&end=2025-11-28`) returns **217 bars on a 210-minute half day**, the extras
  running from an hour before the open to eight minutes after the early close. Date-only ranges
  include **extended-hours** bars, which §2 puts out of V1 scope. `TimeRange` carries instants,
  so this falls out for free — but it is the shape somebody reaches for when hand-testing, and it
  silently changes the denominator every §11 calculation assumes
- **The `feed` parameter — AMENDED 2026-09-07, this bullet was wrong and expensively so.**
  It read _"no `feed` parameter, because the free plan serves IEX"_. Task 2.7.1 measured that
  **the free plan serves SIP for historical bars** — the full consolidated tape — and that the
  live stream is the IEX-only half. `feed=sip` is accepted for anything older than the withheld
  window and refused only for recent data (`403 subscription does not permit querying recent SIP
data`). **The default is SIP.**

  It is not a cosmetic difference. Same thin names, same sessions: **`feed=iex` gives 82.8% mean
  minute coverage with gaps to 15 minutes; the default gives 99.7% with gaps to 2.** `CCI` reads
  53.6% on `iex` and 98.5% on the default. Sending `feed=iex` would throw away most of the data
  quality this plan gives us, for no benefit.

  **This is open decision 6 and it is settled HERE**, because this is the first thing that
  writes a `feed` into a provenance record — see `STORY.md`. Decide, with the argument: whether
  to send `feed` at all, whether `MarketFeed` gains `sip`, and what `MarketDataProvider.feed`
  means on a deployment whose history is SIP and whose future stream is IEX

## Provenance: one source, and `retrievedAt` stamped exactly once

Every series carries one `BarSource`: `providerId: "alpaca"`, the `adjustment` that was asked
for, `barCount`, and `retrievedAt` **stamped at fetch and never re-stamped**.

**The `feed` value is open decision 6's and is NOT `iex` by default** — this paragraph said
`feed: "iex"` until 2026-09-07, and Task 2.7.1 measured that historical bars come from SIP.
Whatever is decided above is what goes here, and it must be the feed the request actually used
rather than a constant, because `PROVIDER.md` §2 makes this record the authority for a
particular series.

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
  will fail the build until it is, by design. It takes the credential from **`config.alpaca`**,
  which Task 2.7.2 shipped; nothing here reads `process.env`
- The two comments Task 2.7.2 left that this commit makes false — in `config.ts` and in
  `config.test.ts` — amended, and that test strengthened into a success assertion
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

---

## What shipped (2026-09-07)

Six new source files, one new script, one new root command, **no dependency and no lockfile
change**. `pnpm verify` is exit 0, `pnpm test` is **683** (206 + 294 + 183), and the frontend
artefact did not move.

| File                                  | What it is                                        |
| ------------------------------------- | ------------------------------------------------- |
| `apps/backend/src/alpaca-mapping.ts`  | The vendor translation, **both directions**, pure |
| `apps/backend/src/alpaca-provider.ts` | The transport, thin                               |
| `apps/backend/src/fetch-bars.ts`      | `pnpm bars`' mechanism                            |
| `apps/backend/src/fixtures/alpaca/`   | Eleven raw response bodies, 356 KB                |
| `scripts/fetch-bars.mjs`              | The wrapper: a name, a build guard, an exit code  |
| three `*.test.ts`                     | 51 tests, all offline                             |

### `pnpm bars NVDA` — the first real market number this product has produced

```text
NVDA  2026-09-03  1m  raw
  window  2026-09-03T13:30:00.000Z → 2026-09-03T20:00:00.000Z
  provider alpaca  feed sip

  390 bars

      time (UTC)              open      high       low     close        volume
      2026-09-03T13:30:00.000Z   226.0200  226.0200  224.7500  225.2100       2642421
      …
      2026-09-03T19:59:00.000Z   228.4250  228.6100  228.3200  228.4000       1396496

  provenance  raw, 1 source
              alpaca / sip, 390 bars, retrieved 2026-09-07T08:33:50.071Z
  coverage    2026-09-03T13:30:00.000Z → 2026-09-03T20:00:00.000Z
```

### The one structural decision: the mapping owns BOTH directions

The task file called the mapping/transport split the one structural decision, and the half
that was not obvious is which side the **request** falls on. The reflex is _"mapping means
response → domain"_. That is wrong here, because **the most dangerous line in this story is
in the request** — see the `end` finding below — so `toAlpacaQuery` lives in the pure module
and is testable with no socket. What is left in the provider is the request, the signals and
the status code.

That is what keeps `pnpm test` fast, offline and buildless, a property held since Story 1.9
that one vendor-shaped module would have broken for good.

### Open decision 6 — SETTLED: `feed=sip`, sent explicitly

`MARKET_FEEDS` **needed no change**: Task 2.6.3 shipped `sip` beside `iex` and `synthetic`,
and `MARKET_FEED_DESCRIPTIONS.sip` already reads _"All US exchanges, via the consolidated
tape."_ The vocabulary was ready before the question was asked.

The client **sends `feed=sip` explicitly** rather than taking the measured-identical default,
on two arguments — and the second is the deciding one:

- `sort=asc`'s, verbatim: **a default nobody stated is a default that can move**, and this
  one is a vendor's rather than ours.
- **It makes the provenance record true by construction.** Whether the default silently falls
  back to IEX for a window SIP will not serve is _unmeasured_. An explicit `feed=sip` cannot
  fall back — it is a measured `403` — so a `BarSource` saying `sip` is a claim about what was
  asked for and answered, not an assumption about a default.

`feed=iex` loses on measured quality, one way: 82.8% mean minute coverage against 99.7%, with
`CCI` at 53.6% against 98.5%. Epic 3's live stream is a **sibling** interface and will declare
`iex`; §4.2's reversal trigger is **not** met, because this provider serves exactly one feed.

### The load-bearing line turned out not to be the timestamp

`t` marks the **start** of its interval, so `startsAt` maps directly with no shift and
`PROVIDER.md` §9.2's naming decision cost nothing.

What needs care is `end`. **Alpaca's is inclusive and ours is half-open**, so passing it
through fetches one extra bar — 391 for a 390-minute session — and since `t` marks the start,
that bar covers 16:00–16:01 ET, outside the regular session.

**The conversion is minus one MILLISECOND, not the "minus one timeframe" the brief offered**,
and that is better than an approximation that happens to work: it is the _exact_ half-open-to
-inclusive conversion, so it is correct for any timeframe with no table to keep in step with
`TIMEFRAMES` and no DST arithmetic — where subtracting "one day" would move by an hour across
a transition, and filtering after the fact would fetch a bar in order to discard it.

**Verified against the live API on both timeframes** rather than assumed, because a vendor
accepting sub-second precision is not something to take on faith:

| Timeframe | `end`           |    Bars | Last bar    |
| --------- | --------------- | ------: | ----------- |
| `1Min`    | `19:59:59.999Z` | **390** | `19:59:00Z` |
| `1Min`    | `20:00:00Z`     |     391 | `20:00:00Z` |
| `1Day`    | `03:59:59.999Z` |  **20** | `06-29T04Z` |
| `1Day`    | `04:00:00Z`     |      21 | `06-30T04Z` |

**Every fixture was recorded through the shipped mapping's own output**, so the corpus _is_
what the client sends.

### The fixture corpus, and its two controls

Eleven raw bodies, 356 KB. Every one of Task 2.7.1's figures reproduced **exactly** — 390 for
a regular session, 210 for the half day, 384 for the thin name, 0 for the holiday, and the
391-bar `end` trap.

They are read with `readFileSync` from `src/` and **never `import`ed**, which is a decision
rather than a habit: `resolveJsonModule` would compile 356 KB of test data into `dist/`, and
`apps/backend`'s `files` field ships `dist` into the container image.

Two of them are **measurements rather than observations**, because they carry controls:

- **`JNJ` has no split in the recorded range and returns byte-identical bodies under both
  adjustments** — confirmed offline by md5 and live by diffing two `pnpm bars` runs. That is
  what makes `adjustment` safe to send unconditionally.
- **The `end`-at-close body is recorded because the domain type refuses it.** A test asserts
  that mapping it throws `starts outside the covered range`, which is a stronger statement of
  the trap than any assertion about a query string.

### What it refuses, and why the refusals are the point

- **A `next_page_token` is a throw naming Task 2.7.5**, and it stays until that task removes
  it. A client quietly returning the first page lies with a perfectly well-formed answer:
  ascending, correct provenance, plausible coverage, and missing data nobody notices until a
  chart has a hole in it. `PROVIDER.md` §8.5 — an incomplete answer we produced is **us**.
- **A non-2xx throws** rather than being mapped, because Task 2.7.6 owns the taxonomy against
  its own measurements. The message deliberately **never reads the body**: a bad key answers
  with an nginx **HTML** page, so a client assuming JSON turns a clear `unauthorised` into a
  laundered parse failure.
- **A malformed body throws**, because a shape we did not expect is a fact about our code
  rather than about the world — and laundering it would put it in front of a retry wrapper
  that would retry a shape that will never change.

### Three deliberate breaks, each seen to fail and reverted

| Break                           | Result                                       |
| ------------------------------- | -------------------------------------------- |
| Timestamp shifted by one minute | **The test file failed to LOAD** — see below |
| `sort=asc` removed              | 2 failed across **both** test files          |
| `retrievedAt` read from a clock | 1 failed                                     |

**The first is the one worth carrying, because it never reached an assertion.** Shifting the
timestamp makes the first bar fall outside the requested window, so `toBarSeries`'s own
coherence check refuses the series at describe-scope and the whole file fails to collect:

```
RangeError: Bar at 2026-09-03T13:29:00.000Z starts outside the covered range
[2026-09-03T13:30:00.000Z, 2026-09-03T20:00:00.000Z).
```

The **domain type** caught it before any test ran, which is stronger than a red assertion.
`alpaca-mapping.ts` was byte-identical after each revert (md5 `0a7f0f23…`).

### Three recorded claims stopped being true, and one was not named by the brief

The task file predicted two — the `config.ts` comment about reporting _two_ problems, and the
`config.test.ts` comment saying the selection is still refused. Both amended, and that test
**strengthened** from _"the message is not empty"_ into an assertion that `loadConfig`
**succeeds** and returns `marketDataProvider: "alpaca"` with the credential attached, which is
a stronger claim only available once the member exists.

**The third was found by a red test rather than by reading**:
`packages/shared/src/market-provenance.test.ts` asserted `toEqual(["fixture"])` under the
title _"ships exactly one provider, and it is not the vendor"_. It is now
_"ships a member only for a provider something can produce"_ — the durable claim rather than
the temporary one, since the rule is about **production** and not about the count.

`createMarketDataProvider`'s exhaustive switch also **fired exactly as `market-data.ts`
promised**, failing the build before a line of that file had been edited.

### The vendor grep moved, and it is 2 rather than the predicted 1

The brief predicted _"one hit, it is the provider id"_. It is **two**: the id in
`market-provenance.ts`, and the assertion in `market-provenance.test.ts` that locks the
vocabulary. The second is unavoidable rather than untidy — a test asserting which members
exist has to name them, and asserting a length instead is the weaker claim Task 2.6.5 already
found wanting.

Neither is a leak, and one of them is the point: a `ProviderId` is the one place the vendor's
name is the **subject** rather than an implementation detail, because a provenance record has
to name who sold us the data for §7.1's display to be possible at all.

**And the `apps/backend/src` naive figure has stopped being informative**: it is **262 across
12 files** against the 7 Task 2.6.8 recorded, because `alpaca-provider.ts`, `alpaca-mapping.ts`
and their tests _are_ the vendor client. That is `PROVIDER.md` §1's split working as designed,
and the figure worth re-running is the `packages/shared` one. Amended where 2.6.8 recorded it.

### Two things produced rather than reasoned about

**A daily bar is stamped at midnight ET, hours before the session opens** — so `pnpm bars NVDA
1d` printed _"no bars"_ against a session window, correctly and uselessly. That is the exact
trap `alpaca-mapping.ts`'s own comment warns about, met in the one place it can bite, and it
is why `windowFor` gives the two timeframes different window shapes. `nextMarketSession`
supplies the upper bound from the calendar rather than by adding 24 hours, which would be an
hour wrong across a DST transition.

**A green `pnpm test` proved none of the types.** The mapping tests passed at exit 0 while
`tsc -b` reported fourteen errors, because `marketSessionOn` returns `undefined` for a holiday
and the runner strips types. Task 2.6.2's finding met from the useful side: **`pnpm verify`
catches it because it builds before it tests.**

### Criterion 7, checked with a control

The whole backend suite was run with every off-machine host refused at `dns.lookup` and
`net.connect` — **294 passed** — and a throwaway probe against `data.alpaca.markets` was
refused in the same run, so the blocker was **proved to block** rather than assumed to.
Loopback stays allowed, because `alpaca-provider.test.ts` drives a real local HTTP server
deliberately: _"no network"_ honestly means **reaches no host but itself**.

### Figures

- `pnpm verify` **exit 0**; `pnpm test` **683** (206 + 294 + 183); `pnpm test:process` 14
- **No dependency, no lockfile change.** Node 24 ships `fetch`; Task 2.1.6 already declined a
  library for one documented request at a measured 32 packages and 46 MB
- **The frontend artefact did not move** — 371,463 B `c8f1c3ad…`, 18,063 B `ed3d1744…`,
  `index.html` 1,101 B `7b0075a8…`, 300 B, **390,927 B over four files** — reproducing Task
  2.6.8's figures to the byte, with **`alpaca` zero in the bundle**. That is the check rather
  than a coincidence: `PROVIDER_IDS` is a plain array literal and is tree-shaken completely,
  Task 2.3.8's literal-versus-constructor rule holding
- `pnpm links` 219 documents / 508 cross-file links / 34 anchor links / **0 broken**
- **Leak sweep clean on all five producers**; `apps/backend/.env` untracked; `pnpm bars` was
  checked against `pnpm help -a` and is free, with the detection validated in the same run
  against five known built-ins

### The honest gap

**Nothing is deployed.** `MARKET_DATA_PROVIDER` is absent from the Container App entirely, so
the deployed backend still reads no provider and the chrome still says `NOT CONFIGURED`. Task
2.7.4 owns both that setting and putting the feed's word on the deployed page — and it now
knows which word.

---

## For the stakeholders — what this actually means

**MarketPulse just read its first real prices.**

Until today this product could show you which companies it tracks and whether its own services
were healthy, and that was all. There was no market data in it anywhere. Today it fetched the
real minute-by-minute trading history of NVIDIA for a real session — 390 prices, opening,
high, low, closing and volume for every minute the market was open — from a real market-data
provider, using a real account.

You can see it for yourself by typing `pnpm bars NVDA`. It prints to a terminal rather than
drawing a chart, and that is deliberate: this task was about getting the numbers **right**,
and the next tasks store them, serve them and eventually draw them.

**Why it took a whole task to read some numbers.** Because getting market data slightly wrong
is worse than not having it. Three things we found are worth explaining:

- **The one-minute problem.** Every price bar has a timestamp, and providers disagree about
  whether it means _"the minute this covers started"_ or _"…ended"_. Get it backwards and
  every price on every chart is shifted by one minute — which looks completely normal and is
  wrong in every calculation the product will later make. We measured it rather than assumed
  it, and named our own field `startsAt` so a wrong mapping would read as an obvious
  contradiction rather than a plausible guess.
- **The extra bar.** We ask for "the trading session" and the provider returns **391** bars
  for a 390-minute session. It includes the very last instant where we exclude it. That one
  bar, repeated at the edge of every window we ever request, would have become thousands of
  duplicated prices in the database once we start storing history. It was caught only because
  391 is _more_ minutes than the session has, which is arithmetically impossible.
- **We are getting better data than we thought.** The industry assumption — and our own
  product specification — was that a free plan gives you one exchange's trades, roughly 4% of
  the market. We measured it, and for **historical** data this plan serves the **full US
  consolidated tape**. On thinly traded companies that is the difference between having 53% of
  the minutes and having 98%. The product will now say so honestly on screen: not
  `Market feed: IEX`, but the consolidated tape, because telling a user their data is
  narrower than it is would be as wrong as telling them it is broader.

**What you still cannot do.** There is no chart, no price on any screen, and nothing is
stored — refresh the page and the product looks exactly as it did yesterday. The next task
points the live site at the provider so the header stops saying `NOT CONFIGURED`; the task
after that handles fetching long histories in pages; then storing them; then drawing them.

**What is now unblocked is essentially everything.** Every number this product will ever show
— the anomaly scores, the sector comparisons, the charts, the AI investigations that reason
about what happened at 11:07 on a Tuesday — is made of these bars. This is the pipe they come
through, and it now runs end to end.
