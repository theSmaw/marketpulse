# Task 2.6.6 — The fixture provider: the whole interface, offline, deterministic

**Status:** Complete
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Tasks 2.6.4, 2.6.5

## Objective

Implement the interface fully, with no network. This is what acceptance criteria 2, 4 and 6
are actually met by, and it is what keeps `pnpm test` free of network access for the rest of
the project.

## What the user can see when this lands

**Nothing directly**, unless Task 2.6.1 decided the fixture provider is selectable in a
running backend — in which case a developer with no Alpaca key has a backend that answers,
and Task 2.6.7 is what makes that visible.

## Why this is the load-bearing task in the story

Three things rest on it, and each is a property the repository already holds and would
otherwise lose:

- **`pnpm test` is fast, needs no build, no socket and no database.** That property has
  survived thirteen stories and `CLAUDE.md` records it as a rule. A test that reaches Alpaca
  breaks all of it at once, and the sixth level of test that already exists —
  `pnpm test:database` — exists precisely because a database test broke all three.
- **Story 2.12's chart works on a laptop on a train.** Also a real requirement: the
  charting decision is a whole-product decision inherited by Epics 6, 8 and 11, and it should
  not be taken while fighting a rate limit.
- **Criterion 4 is only checkable here.** Producing `unauthorised` against a real vendor
  means deliberately breaking a credential; producing it against a fixture is a line of code.

## Work

### What Task 2.6.4 shipped, so this task implements rather than infers

**Amended 2026-09-07 by Task 2.6.4.** The seam is
`apps/backend/src/market-data-provider.ts` and the shape to implement is:

```ts
interface MarketDataProvider {
  readonly id: ProviderId; // `"fixture"` here
  fetchBars(
    request: BarsRequest,
    options?: BarsRequestOptions,
  ): Promise<BarsResult>;
}
```

Five consequences worth knowing before writing a line, each of which would otherwise be
discovered:

- **The request and the options are two parameters and that is deliberate.** `BarsRequest`
  is the _question_ — `symbol`, `range`, `timeframe`, `adjustment` — and is a legitimate
  corpus lookup key. `BarsRequestOptions` is `deadlineMs` and `signal`, which are how one
  invocation behaves. Do not key the corpus on the options; a signal in a key makes every
  key unique.
- **Every range in every test comes from `toTimeRange`.** `TimeRange` is branded, so a
  `{ start, end }` literal is a compile error, and the corpus's declared coverage window is
  built the same way.
- **`timeout` is produced against `options.deadlineMs`, not against a wall clock.** §6.3
  requires determinism and `PROVIDER.md` §8.7 already says the mechanism is _a corpus entry
  with a delay against a short test deadline_ — so the test passes a small `deadlineMs`
  rather than waiting out the 3,000 ms default.
- **`aborted` needs no corpus entry at all**: the test aborts its own `AbortController`, and
  the provider composes it with the deadline exactly as `api-client.ts` does — reading
  **which** signal fired off the signals rather than off the rejection.
- **`no method left throwing` is one method.** There is one, and the interface deliberately
  has no batch fetch and no latest-price call; both are argued in that module's comment, and
  Epic 3's streaming attaches as a **sibling interface** rather than as a method here.

> **Amended 2026-09-07 by Task 2.6.1.** Three conditionals below are now settled and one of
> them changes what this task builds rather than only how it is described:
>
> - **It ships. Unconditionally.** `PROVIDER.md` §5 — so it is `apps/backend/src`, it is
>   inside the container image, and the "if it ships" clauses below are simply the plan.
> - **`MARKET_DATA_PROVIDER`'s default is `none`, not `fixture`** (§5.3), and `none` is a
>   real member of the enum rather than an absent value. That is what makes this story's
>   loud-default requirement concrete, and it is also what gives Task 2.6.7 a true thing to
>   say before Story 2.7 exists. At the end of this story the enum is `["none", "fixture"]`;
>   Story 2.7 adds its own member.
> - **The corpus is GENERATED from `market-session.ts` and seeded** (§6.2), and — the part
>   that removes work rather than adding it — **there is no re-recording obligation on this
>   corpus at all** (§6.1). It produces domain types and parses no vendor JSON, so it has
>   nothing vendor-shaped it could be wrong about. Story 2.7 records a _different_ corpus
>   (raw HTTP bodies, for its mapping) and owes a reconciliation of three specific numbers,
>   which is written into that story's file. **"Re-record Story 2.6's fixtures" is the wrong
>   instruction**; the Notes at the foot of this file predate that finding.
> - **`retrievedAt` is a fixed instant declared by the corpus** (§6.3), because a `now()`
>   stamp is not byte-identical across runs — and it makes the series obviously not live,
>   which §5.4 wants anyway.

### What Task 2.6.2 handed forward, deliberately, rather than building on a forecast

**This task is the named trigger for the one helper Task 2.6.2 declined**, and it is worth
knowing before writing the filter rather than after. `TimeRange` is half-open, `[start, end)`,
and `timeRangeIncludes` was **not** built because nothing yet needed to ask _"is this bar in
this range"_ — this provider is the first thing that does. Three notes:

- The half-open rule is in `time-range.ts`'s own comment, so the inline form is
  `b.startsAt >= range.start && b.startsAt < range.end`. **The `<` is the whole point**: get
  it wrong and adjacent windows each claim the bar at the seam, which is the corruption
  Story 2.8's backfill would then report as a unique-constraint failure that was actually the
  database being right.
- If a second caller appears, the helper belongs **beside the type in `packages/shared`**
  rather than local to the provider — one definition of half-openness, for
  `market-time.ts`'s reason.
- `TimeRange` is **branded**, so the corpus and every test in this task obtain one through
  `toTimeRange(start, end)` and never by writing a `{ start, end }` literal. It refuses a
  reversed, zero-width or invalid-`Date` range naming both ends, which means a fixture whose
  window is degenerate fails loudly at construction rather than producing a confusingly empty
  series.

The corpus's own instants come from `market-session.ts` per `PROVIDER.md` §6.2, so the
ranges are built from session bounds rather than written out — which is also what keeps the
"no wall clock" property below true by construction.

### What Task 2.6.3 handed forward, and one question it deliberately did not answer

**Every series this provider returns is built through `toBarSeries`, and every provenance
record through `toSeriesProvenance`.** Both types are branded, so there is no object-literal
route — which is the point, and it means the corpus has to satisfy five runtime checks the
types cannot express. Four are mechanical:

- **bars strictly ascending by `startsAt`** — a repeated or reversed pair is refused
- **the sources' `barCount` must sum to `bars.length`** — so a fixture that filters bars to a
  requested range must recompute the count rather than carrying the corpus's own
- **`coverage.covered` is `null` exactly when `bars` is empty**, which is the shape §8.2
  already requires of the holiday, weekend and no-print answers: `bars: []`,
  `coverage.covered: null`, and it is a **successful** result
- **`retrievedAt` must be a UTC ISO 8601 instant ending in `Z`** and must parse. The corpus
  declares a fixed one (§6.3), so write it in that spelling; an offset spelling is refused

**The fifth is the one that is a decision rather than a constraint, and it is this task's to
take.** `covered` is **supplied, not derived** — `bar.ts` deliberately ships no map from a
timeframe to a duration, because `1d` has no honest number, so `toBarSeries` cannot compute
`covered.end` from the last bar and does not try. What it enforces is only that every bar
starts inside `covered` (half-open at the top) and that `covered` sits inside `requested`.
That leaves two defensible readings and they differ on a real case:

- **`covered` = the window the provider actually answered for**, which for a fixture holding
  a whole session is the requested range intersected with the corpus's own extent
- **`covered` = the span of the bars returned**, which makes a thinly traded name whose last
  print was at 15:42 report coverage ending at 15:42

The second is what Story 2.14's _"we have data through 15:42"_ sounds like, and it is
probably wrong: §2.5 is explicit that coverage says **how far the answer reaches, not whether
it is dense**, and a name with no print after 15:42 was still _covered_ to the close. Take
the first reading unless there is an argument against it, and write the argument down either
way — because whichever is chosen, Story 2.14 renders it and Story 2.8's gap handling is
built beside it.

### What Task 2.6.5 handed forward — this task is the first thing that CONSTRUCTS a failure

**Amended 2026-09-07 by Task 2.6.5.** The taxonomy is complete: `BarsResult` has all eight
members, `PROVIDER.md` §8.1's table exactly. Five consequences, each of which would otherwise
be met at the keyboard.

- **`rate-limited`'s hint is optional, so building one is a BRANCH rather than an
  assignment.** Under `exactOptionalPropertyTypes`, `retryAfterMs?: number` means genuinely
  absent, not present-and-`undefined` — so a corpus entry that may or may not carry a hint is
  written the way `apiError()` writes its `details`:

  ```ts
  return hint === undefined
    ? { outcome: "rate-limited" }
    : { outcome: "rate-limited", retryAfterMs: hint };
  ```

  This provider is the **first constructor of these members anywhere**, so it is where that
  idiom gets set. Absent means _the vendor did not say_ and never _"immediately"_.

- **No member echoes the request back**, which is a rule rather than an omission: _a member
  carries only what the caller does not already hold_. So `unknown-symbol` does **not** name
  the symbol and `range-not-available` does **not** repeat the range. Two consequences here:
  the corpus must not be tempted to add them back, and a test asserting _which_ symbol was
  unknown holds the **request** it sent rather than reading the result.

- **`unauthorised` is ONE member covering missing, wrong and unentitled credentials.** One
  corpus flag, not three. They are merged because a caller does the same thing about all
  three, and because they are not reliably distinguishable from a vendor's response.

- **`isRetryableOutcome()` ships beside the union**, so criterion 4's distinguishability test
  has a second thing worth asserting: not only that each cause arrives distinct, but that
  each is **classified** correctly. **Do not re-derive retryability in a `switch` of your
  own** — that is a second copy of the taxonomy, which is the whole reason the classifier is
  exported.

- **There is a canonical way to enumerate all eight**, and it is worth copying rather than
  re-inventing: `market-data-provider.test.ts` holds them in a
  `Record<BarsResult["outcome"], BarsResult>`, which is `health.ts`'s response-schema idiom
  and makes a ninth member a compile error naming the missing key. Whether this task's suite
  imports that or declares its own is a judgement — a cross-test-file import is unusual here
  — but **something in this task should enumerate the eight in a form a ninth member breaks**,
  because that is what stops a future cause being produced by nothing.

**And one thing this task does NOT own: the retry wrapper.** Task 2.6.5 confirmed
`PROVIDER.md` §8.8 — retry lives in a wrapper implementing this same interface — and
deliberately **built nothing**, because there was no provider to wrap and no measured
distribution to pick a backoff from. This task supplies the first thing it can be composed
around; **Story 2.7 builds it**, against its own measured limit. Do not build it here, and do
not put a retry inside the fixture provider: a provider makes exactly one attempt, which is
precisely what makes a fixture-backed test mean anything.

### Determinism is the requirement, and it has a sharper edge than it looks

The same request must produce the same series, byte for byte, on every machine and every run.
Two things break that quietly and both should be structurally impossible rather than avoided:

- **reading the wall clock.** A fixture whose range is relative to "today" is a fixture whose
  test passes until a market holiday. `packages/shared` already cannot read the clock — the
  lint rules have no exception — and this provider should take its instants from its input
  for the same reason
- **a random walk with an unseeded generator.** If bars are generated rather than recorded,
  the seed is part of the fixture and is written down

### The corpus comes from Task 2.6.1's decision, and it carries an obligation forward

`PROVIDER.md` settled where the fixtures come from and when they get re-recorded against a
real Alpaca response. Honour it, and **make the corpus's own provenance visible**: whatever
`Provenance` says for a fixture series must not be mistakable for real market data. That is
Task 2.6.3's record doing its job on its first consumer, and it is also the thing that stops
a fixture-backed chart ever being screenshotted as a product.

Cover, at minimum, the cases the rest of the epic will hit:

- a full regular session, and its exact bar count — **390** for a regular session and **210**
  for a half day, both derived by `market-session.ts` rather than written out here
- a **half day**, which is where a hard-coded 390 dies
- a **holiday** and a **weekend**, which are empty answers rather than failures
- a **gap** inside a session — a minute with no print, which on IEX is ordinary for a thinly
  traded name and which Story 2.8 must not read as a fault
- a range that **crosses a DST transition**, since the UTC open moves 14:30Z → 13:30Z and
  back and `CALENDAR.md` §7 already names the dates to use
- a range spanning a **corporate action**, so Task 2.6.3's adjustment modes return genuinely
  different numbers rather than agreeing by accident — otherwise nothing in this story ever
  exercises criterion 5's real consequence

### Every error cause, produced — criterion 4

Each member of Task 2.6.5's taxonomy needs a way to be triggered, and the mechanism should be
part of the fixture corpus rather than a special flag on the interface: a symbol that is
configured to be rate-limited, a symbol that does not exist, a corpus entry that says the
upstream is unavailable. The interface must not grow a `simulateError` parameter — that is a
test concern leaking into a shipped type, which is the shape Task 1.10.5 refused when it
declined to widen `config.ts`'s port range for a test's convenience.

**Then assert distinguishability rather than assuming it**: a test that receives each cause
and branches on it, which is what proves the union is switchable and not merely different
strings.

### Where it lives, and the `files` consequence

Task 2.6.1 decided whether it ships. If it does, it is `apps/backend/src`, it is in the
container image, and **which provider is active is configuration** — a `CONFIG_VARIABLES`
entry, an `.env.example` line, and `pnpm env:check` will fail if the two disagree, including
on the default. That check has been made to fail all four ways before and will do so again.

**Amended 2026-09-07 by Task 2.6.4: the interface now exists, and it turns `none` into a
question this file does not answer. Decide it here rather than at the keyboard.** Is `none`
an _implementation_ of `MarketDataProvider` that answers every call, or the _absence_ of a
provider? The two are not equivalent and the first is almost certainly wrong:

- A **null-object provider** has to return a `BarsResult`, and there is no member meaning
  _"no provider is configured"_ — that is a fact about our own deployment rather than a fact
  about the world, so it fails `PROVIDER.md` §8.5's test for membership and would be a ninth
  outcome nobody has planned. Making it answer `upstream-unavailable` instead is precisely
  the laundering §8.5 forbids: a configuration fault wearing a transient fault's costume.
  And a null object that throws is _"a method left throwing"_, which the Done-when list below
  forbids in as many words.
- **Absence** — callers hold `MarketDataProvider | undefined`, or the composition root simply
  has none — keeps the union honest and pushes the answer to the layer that can give a
  correct one. A Story 2.9 route with no provider is a **503** carrying the
  `SERVICE_UNAVAILABLE` code `database.ts` already reserves for exactly this shape, added by
  the story that can produce it per `API_ERROR_CODES`' own rule.

Whichever is chosen, note the consequence for Task 2.6.7, which renders this state: under
`none` there is **no provider object to ask**, so `MarketDataProvider.id` cannot be the
source of _"which provider is configured"_ — the configuration value is.

State the safety property explicitly wherever the selection is read: a deployment that
selects the fixture provider is serving **invented prices**, so the default must be the one
that fails loudly rather than the one that quietly works. Task 1.8.3's `CORS_ORIGIN` note is
the precedent — a default that is convenient in development is a decision about production,
and it must be written down as one.

### The test suite this creates

Fast tests, in `pnpm test`, no build, no socket, no database. If a fixture is large enough
that loading it is slow, that is a signal the corpus is too realistic rather than a reason to
move the suite.

## Done when

- The fixture provider implements the interface **completely** — no method left throwing
  "not implemented"
- The same request produces a byte-identical series across runs, asserted
- Every error cause from Task 2.6.5 is produced against it and each is distinguished by a
  caller in a test — **all eight members**, enumerated in a form a ninth member breaks, with
  each one's `isRetryableOutcome()` classification asserted rather than re-derived
- The `rate-limited` entry that omits its hint is built by **branching**, not by assigning
  `undefined`, and a test asserts the field is genuinely absent
- The half day, the holiday, the gap, the DST range and the corporate action are all covered,
  with counts derived from `market-session.ts` rather than written out
- A fixture series' provenance cannot be mistaken for real market data — which is
  `MARKET_FEED_DESCRIPTIONS.synthetic` doing its job: `provider: "fixture"`,
  `feed: "synthetic"`, rendered as _"Generated test data. Not a market feed."_
- `coverage.covered`'s meaning is decided and the argument is written down, per the
  section above; the empty cases carry `covered: null`
- The range filter is half-open and was **seen to fail** against a bar sitting exactly on
  `range.end`, which is the one boundary an inclusive comparison gets wrong and no other test
  in the corpus would notice
- If it ships: the provider selection is in `CONFIG_VARIABLES` and `.env.example`,
  `pnpm env:check` passes, and the default is the loud one
- **`none` is decided — implementation or absence — and the argument is written down**, per
  the amendment above; a caller with no provider configured has a defined behaviour rather
  than a `undefined` reaching a route by accident
- `pnpm test` passes **with the network disabled**, checked rather than assumed — criterion 6
- `pnpm verify` is exit 0

## Notes

The re-recording obligation is the thing most likely to be quietly dropped. If Story 2.7 does
not re-record this corpus against a real Alpaca response, every test in this story is
asserting that our code agrees with our assumptions — which is a green suite that certifies
nothing, and this repository has already named that failure twice.

> **Amended 2026-09-07 on completion.** The Notes above predate Task 2.6.1's finding that
> there are **two** corpora doing two different jobs (`PROVIDER.md` §6.1), and the paragraph
> is wrong as written: this corpus holds **domain types**, parses no vendor JSON and
> therefore has nothing vendor-shaped it could be wrong about. What Story 2.7 owes is a
> **reconciliation of three specific numbers** — see §6.4 — recorded as a scope bullet in
> that story's own file rather than as a re-recording obligation here.

---

## What shipped

Five new files in `apps/backend/src` and three edited ones. No dependency, no lockfile
change, no new `verify` step, and nothing in `packages/shared` or `apps/frontend` touched.

| File                  | What it is                                                         |
| --------------------- | ------------------------------------------------------------------ |
| `fixture-corpus.ts`   | What the fixture world contains, and how a bar is produced         |
| `fixture-provider.ts` | `MarketDataProvider`, implemented completely                       |
| `market-data.ts`      | `MARKET_DATA_PROVIDER` → a provider, or nothing                    |
| three `*.test.ts`     | 56 fast tests over the corpus and the provider, 7 over the factory |
| `config.ts`           | `MARKET_DATA_PROVIDER`, defaulting to `none`                       |
| `.env.example`        | The variable, and why its default is the loud one                  |
| `config.test.ts`      | The new key on `Config` and in `CONFIG_VARIABLES`                  |

### The corpus is split from the provider, because they answer different questions

`fixture-corpus.ts` answers _what does the fixture world contain_ — which symbols exist,
which of them misbehave, which minutes have no print, when a split happened.
`fixture-provider.ts` answers _what does one call return_, which is a filter, a coverage
claim and a taxonomy. Keeping them apart is what lets the corpus tests assert generation
(bar counts, gaps, the split, OHLC coherence) without going through a `BarsResult`, and the
provider tests assert the seam without re-deriving a price.

### The five decisions this task owed, taken

**1. `covered` is the window the provider ANSWERED FOR, not the span of the bars.** The task
file recommended this reading and the recommendation holds; the argument that decides it is
§2.5's, that coverage says _how far the answer reaches, not whether it is dense_. A thinly
traded name whose last print was at 15:42 was still **covered** to the close — nobody traded
it, which is a different statement from _"we have no data after 15:42"_, and Story 2.14
renders the second sentence if it reads the bars instead. Concretely: `covered` is the
requested range intersected with the corpus's own extent, and `null` exactly when the series
is empty, which `toBarSeries` enforces in both directions.

**2. A PARTIAL overlap is answered partially; only a window with NO overlap is
`range-not-available`.** This was not in the brief and it is the sharper half of decision 1.
A request reaching past the end of what the provider holds is exactly the shape
`SeriesCoverage` exists for, and refusing it would make `range-not-available` mean two
different things, one of which has a perfectly good answer. So the member is reserved for a
window this provider will never serve **however it is narrowed** — which is also what keeps
it honest as a description of the vendor's history depth once Story 2.7 maps a real one.

**3. `none` is ABSENCE.** `createMarketDataProvider` returns `MarketDataProvider | undefined`
and there is no null-object implementation, for the reason the amendment above sets out and
which is worth restating as the mechanism rather than the conclusion: **there is no
`BarsResult` member meaning "no provider is configured"**, because that is a fact about our
own deployment rather than about the world, and §8.5's test for membership excludes it. The
two ways out are both worse — answering `upstream-unavailable` is the laundering §8.5
forbids, and a retry wrapper would then retry it forever against a vendor nobody configured;
a null object that throws is _"a method left throwing"_, which the Done-when list forbids in
as many words. The defined behaviour for a caller with no provider is a **503 carrying
`SERVICE_UNAVAILABLE`**, owned by Story 2.9, which is the story that can produce it.

**4. The selection vocabulary is DERIVED from `PROVIDER_IDS`, not restated.**
`MARKET_DATA_PROVIDER_SELECTIONS` is `["none", ...PROVIDER_IDS]`, so Story 2.7 adding its own
member to `packages/shared` makes it selectable with no edit to `config.ts` — **and makes
`createMarketDataProvider`'s exhaustive switch fail the build** until somebody wires it up.
A second literal list would be a copy whose disagreement's symptom is a configuration value
an operator can set and nothing can honour. It is the ninth-member mechanism Task 2.6.5
built, arriving one layer down, and it is the first thing in `config.ts` that imports from
`packages/shared` — verified not to break `scripts/local-database.mjs`, which reads the built
`dist/config.js`.

**5. Real tickers for the ordinary entries; `ZZ`-prefixed ones for the faults and the
split.** The line is not the obvious one and it is worth carrying: an invented **price** for
a real company is labelled synthetic and is therefore honest — that is §5.4's whole
mechanism — but an invented **corporate action** is a claim about that company's history,
and no provenance label repairs _"AMD split four-for-one in June 2026"_. The same applies to
_"this symbol is permanently unauthorised"_. So `NVDA`, `SPY` and `AMD` carry generated
prices, and `ZZSPL`, `ZZRL`, `ZZRLN`, `ZZUA`, `ZZUP` and `ZZSLO` carry the awkward
behaviours. Keeping the ordinary entries real is what preserves §5.2's stated reason for
shipping this at all: Story 2.12's charting decision should be takeable on a laptop with no
vendor key, and a chart of `ZZZZ` is a worse rehearsal than a chart of `NVDA`.

### The corpus, and what is derived rather than written

**390 and 210 appear in no source file and in no test.** Every count comes from
`market-session.ts`'s `minuteBars`, per date — so a regular session asserts
`REGULAR.minuteBars`, the day after Thanksgiving asserts `HALF_DAY.minuteBars`, and the
assertion that one is smaller than the other is what actually proves the half day is
handled. That is `PROVIDER.md` §6.2's requirement applied to the tests as well as to the
generator.

| Symbol  | What it is for                                             |
| ------- | ---------------------------------------------------------- |
| `NVDA`  | A liquid name: a print every minute of every session       |
| `SPY`   | A second liquid name, different seed                       |
| `AMD`   | Thin: four declared minutes of every session have no print |
| `ZZSPL` | A four-for-one split at the open of 2026-06-01             |
| `ZZRL`  | `rate-limited` **with** a hint                             |
| `ZZRLN` | `rate-limited` **without** one — the branch, not an assign |
| `ZZUA`  | `unauthorised`                                             |
| `ZZUP`  | `upstream-unavailable`                                     |
| `ZZSLO` | Waits 30 s, so a short deadline produces `timeout`         |

The coverage window is 2026-01-02 to 2026-12-31, built from those sessions' own `open` and
`close` instants rather than written out — so `toTimeRange` refuses it at module load if a
calendar edit ever made the two dates cross.

**The gap offsets are all below a half day's bar count, and there is a test asserting it.**
An offset past a half day's close would silently be a no-op on exactly the day this corpus
exists to cover, which is the same class of bug as a hard-coded 390 and is invisible in every
other assertion.

**The whole session is generated and then filtered, never generated from the requested
start.** That is not an implementation detail — it is what makes a request for 10:00–10:05
return the same five bars the whole-session request contains at those minutes. Seeding the
walk from the requested start would give a different price for the same minute depending on
what else was asked for, which is a corpus that cannot be used to test a cache, a stitch, or
anything Story 2.8 does. There is a test that tiles two adjacent windows and asserts the
concatenation is **the same bars**, not merely the same count.

### The split is engineered so RAW has the cliff, and the direction matters

A four-for-one split quarters the price, so the corpus puts `ZZSPL` at 512 before
2026-06-01 and at 128 after it. The **raw** series therefore has a genuine step in it —
which is what happened, and what §3.6 says an honest chart shows provided the label beside it
reads `raw` — and `split-adjusted` removes it by scaling the **earlier** half down to meet the
later one, dividing prices by four and multiplying volume by four so the notional traded is
preserved. Measured across the split at daily resolution: raw closes 525.93 → 140.04,
split-adjusted 131.48 → 140.04.

Had it been built the other way round, `split-adjusted` would have _introduced_ a step, and
every test in this story would assert the opposite of what the product means.

Beside it is the test that matters more in practice: **a symbol with no split returns
byte-identical bars in both modes.** That is `market-provenance.ts`'s warning made concrete
and it is the whole reason acceptance criterion 5 forbids a default — a wrong adjustment
argument is invisible on almost every series, almost all the time, and wrong exactly once on
the one name and the one week somebody is looking at.

### Every outcome, produced — and enumerated in a form a ninth member breaks

`HOW_EACH_OUTCOME_IS_PRODUCED` is a `Record<BarsResult["outcome"], () => Promise<BarsResult>>`,
which is `health.ts`'s response-schema idiom and the same shape
`market-data-provider.test.ts` uses one file over. A ninth member added to the union without
an entry is a **compile error naming the missing key**; an entry for an outcome that does not
exist is an excess-property error. Checked in both directions, so a future cause cannot be
produced by nothing.

| Outcome                | Produced by                                        |
| ---------------------- | -------------------------------------------------- |
| `ok`                   | An ordinary session                                |
| `timeout`              | `ZZSLO` against `deadlineMs: 20`                   |
| `aborted`              | The test's own `AbortController` — no corpus entry |
| `unknown-symbol`       | `AAPL`, a well-formed ticker not in the corpus     |
| `range-not-available`  | A 2027 window, outside the declared coverage       |
| `rate-limited`         | `ZZRL` / `ZZRLN`                                   |
| `unauthorised`         | `ZZUA`                                             |
| `upstream-unavailable` | `ZZUP`                                             |

Three things are asserted about that set rather than one. That each **arrives** distinct.
That a caller can **branch** on it — an exhaustive `switch` producing a different string per
member, which is what proves the union is switchable and not merely different strings, and is
the failure mode a single `ProviderError` with a `message` has. And that each is
**classified** by `isRetryableOutcome()` rather than by a `switch` of the test's own, because
re-deriving retryability is a second copy of the taxonomy.

**No `simulateError` parameter reached the shipped interface.** Every mechanism is the corpus
or the caller's own signal, per §8.7 and Task 1.10.5's refusal to widen `config.ts`'s port
range for a test's convenience.

### `rate-limited`'s hint is a branch, and this is where that idiom got set

This provider is the **first constructor of these members anywhere**. Under
`exactOptionalPropertyTypes` an omitted `retryAfterMs` means the key is genuinely absent,
which is the difference between _"the vendor did not say"_ and _"come back immediately"_, so
it is written as `apiError()` writes its `details`:

```ts
result:
  fault.retryAfterMs === undefined
    ? { outcome: "rate-limited" }
    : { outcome: "rate-limited", retryAfterMs: fault.retryAfterMs },
```

A test asserts `"retryAfterMs" in result` is **false** on `ZZRLN`, which is the assertion
that goes red if somebody assigns instead of branching — and it was made to.

### Four deliberate breaks, each seen to fail and reverted

| Break                                                | What went red                                      |
| ---------------------------------------------------- | -------------------------------------------------- |
| The range filter's `<` becomes `<=`                  | **2 tests** — the seam bar claimed by both windows |
| `rate-limited` assigns the hint instead of branching | 1 test — `"retryAfterMs" in result` was true       |
| `covered` set even on an empty series                | 2 tests, via `toBarSeries`'s own refusal           |
| The split adjusted the wrong side of the date        | 3 tests across both files                          |

The first is the one the Done-when list names specifically, and it is worth recording that
**it takes two tests down rather than one**: the seam bar appears in the first window _and_
the count of the first window is wrong. `[09:30, 10:00)` and `[10:00, 10:30)` must not both
claim the 10:00 bar — Story 2.8's backfill tiles adjacent windows thousands of times, and
`market_bars`' unique constraint would reject the duplicate, reporting a failure that was
actually the database being right.

### Determinism is asserted ACROSS RUNS, not only within one

Two calls in one process would prove only that the function is not stateful. What is checked
in is a **SHA-256 of the canonical serialisation of a whole session** —
`46d155d651e339088f17792a49d2de11bceac2694ffde4203b8d6e7f6ee93f9e` for `NVDA` on 2026-09-04
at `1m`, raw — which is a claim that survives a restart, a different machine and a different
day. It fails if the generator changes, which for a fixture corpus is correct: **the numbers
are the fixture.**

Nothing here reads the wall clock. `packages/shared` structurally cannot — the `Date.now()`
and zero-argument `new Date()` lint rules over it have no exception — and this module lives
in `apps/backend`, where that rule does not apply, so it is a decision stated in the module
comment rather than an enforcement. `FIXTURE_RETRIEVED_AT` is a fixed instant for the same
reason **and** for Task 2.3.5's: a provenance date that is always today is permanently silent
about staleness, which is the only thing it exists to report.

### Criterion 6 was CHECKED rather than assumed, and the check needed a control

The whole fast suite was run with `fetch`, `net.connect`, `net.createConnection`,
`tls.connect`, `http.request`, `https.request` and `dns.lookup` all replaced by functions
that throw. **585 tests pass** — 198 in `packages/shared`, 224 in `apps/backend`, 163 in
`apps/frontend`.

That is only evidence if the blocker blocks, which is Task 2.5.3's rule (_a break that does
not go red is evidence the break did not land_) arriving from the other side. So a throwaway
test calling `fetch` was run **both ways**: it fails with `NETWORK ACCESS ATTEMPTED via
fetch` under the blocker and passes without it. The blocker, the temporary configs and the
control test were all removed; the tree is clean.

Vitest 4 has **no `--setupFiles` CLI flag** (`CACError: Unknown option`), so the blocker was
injected through a temporary per-package config that `mergeConfig`s the real one — noted
because the obvious command does not exist.

### Figures

- `pnpm verify` **exit 0**. `pnpm test` is **585** (198 + 224 + 163), `pnpm test:process`
  14 — all fast, no build, no socket, no database, no network.
- `pnpm env:check` reports **13 backend variables documented**, up from 12.
- The backend starts under `MARKET_DATA_PROVIDER=fixture` and answers `/health` 200; `pnpm db`
  still reads the built `dist/config.js` correctly, which is the thing decision 4 could have
  broken.
- **The frontend artefact did not move**, which is `PROVIDER.md` §11's check rather than a
  coincidence: 369,437 B `4f17aff3…`, 17,317 B `eb223e53…`, `index.html` 1,101 B
  `898733b0…`, 300 B, **388,155 B over four files** — Task 2.5.6's figures to the byte, and
  §11's zero-bytes prediction holding for the **fifth** task running. Everything this task
  shipped is in `apps/backend`.
- The vendor grep over the new files is **zero**, in the code-only and the naive text form
  alike: they say _"the vendor"_ throughout.

### What this task deliberately did NOT build

- **The retry wrapper.** §8.8 is confirmed and `market-data-provider.ts` already carries the
  argument. This task supplies the first thing it can be composed around; **Story 2.7 builds
  it**, against its own measured limit. A retry inside this provider would make a caller's
  deadline a lie and would stop a fixture-backed test meaning anything.
- **`timeRangeIncludes` in `packages/shared`.** Task 2.6.2 named a second caller as the
  trigger for extracting it and there is still one, so the half-open comparison is inline
  with the rule beside it.
- **Any wiring into `index.ts`.** Nothing serves market data yet.
  `createMarketDataProvider`'s first caller is Task 2.6.7.
- **A chart.** Argued at length in `STORY.md` and unchanged: it would take Story 2.12's
  charting decision by accident, and it would put invented prices on a market product's
  screen.

---

## What this means in plain terms — a status report

**Where the product is.** MarketPulse can already show you the ~100 US companies it tracks,
live from a real database, on a real website. What it cannot yet show you is a **price** —
because until this week there was no agreed way for a price to get into the system at all.
The last few pieces of work have been building that agreement: what a price observation _is_,
what it has to say about where it came from, and what happens when the place it comes from
says no.

**What this piece of work added.** A complete, working, fake market-data source that lives
inside the product. Ask it for Nvidia's minute-by-minute prices for the 4th of September 2026
and it hands back 390 of them, correctly stopping at the closing bell — and 210 on the day
after Thanksgiving, because the market shuts early and it knows that from the trading
calendar built two weeks ago rather than from a number somebody typed in. Ask it for a public
holiday and it politely returns nothing at all, which is the right answer and not an error.

That sounds modest. It is the piece everything else is now built against.

**Why a fake one, before the real one.** Three concrete reasons, in the order they will
matter.

1. **The tests stay fast and stay honest.** Every automated check in this project runs in
   about half a minute, on a laptop, on a plane, with no internet. The moment one of them
   phones a real market-data vendor, that stops being true — the checks get slow, they start
   failing for reasons that have nothing to do with our code, and eventually people start
   ignoring them. We verified this properly rather than assuming it: we switched off every
   way a program can reach the internet and ran all 585 checks again. All 585 passed.
2. **We can build the price charts without a vendor account.** The charting work is a big
   decision that a lot of later features inherit, and it should be taken carefully rather
   than while fighting a rate limit or waiting for an account to be approved.
3. **We can rehearse every way it can go wrong.** This is the one that pays off for users. A
   real data feed fails in half a dozen distinguishable ways — the company doesn't exist, we
   asked too fast, our key expired, their servers are down, we ran out of patience, the user
   navigated away. Each of those deserves a **different message on screen**, because
   "we have no data for this company" and "the feed refused us" are different situations and
   only one of them means "try again in a minute". Rehearsing them against a real vendor
   would mean deliberately breaking our own account. Rehearsing them against this is a line
   of configuration, and all eight are now proven to work.

**The decision most worth knowing about.** This thing invents prices. That is exactly what
it is for, and it is also precisely what the product specification forbids us to ever put in
front of a user under a straight face — §35 lists "manufacture missing observations" among
the things MarketPulse must not do. So two protections were built in rather than promised.

_It is switched off by default._ Turning it on takes a deliberate line of configuration on
whoever's machine wants it. The tempting shortcut — have it on by default so everything
"just works" — is how invented prices end up quietly shipped to production, and we have made
that mistake's cousin before, so the argument is written into the code where the next person
will read it.

_And when it is on, it says so, structurally._ Every series it produces carries a label that
reads **"Generated test data. Not a market feed."** — not as a caption somebody remembered to
add to one screen, but as part of the data itself, so it travels with the numbers wherever
they go. A screenshot of a fake chart advertises that it is fake, without anybody having to
remember.

**One nice detail.** The fake data includes a company that does a four-for-one stock split
partway through the year. That sounds like an odd thing to invent on purpose, and it is the
single most valuable thing in the corpus: a split makes a share price drop to a quarter
overnight without anything actually happening, and a chart that does not know about it shows
a terrifying cliff that is pure accounting. Worse, our future "unusual activity" scoring would
see a −75% move and confidently flag it as the most extreme anomaly it had ever seen —
permanently, and wrongly. Now there is a test that proves we handle it, and — the important
half — a test proving that for every company that _hasn't_ split, asking the question the
wrong way looks completely fine. That is why the product forces every request to state its
answer explicitly rather than assuming one: the mistake is invisible almost all the time, and
catastrophic on exactly the day somebody is looking.

**What a user still cannot do.** See a price. See a chart. Search for a security. Nothing on
screen has changed with this task. The next piece of work (2.6.7) is the first visible one in
this run: the "Market feed" indicator in the header has read a hard-coded `DISCONNECTED`
since the very first week of the project, and it will start telling the truth — that no
market-data provider is configured yet. After that, one configuration value in the next story
turns the same indicator into `IEX` with nothing in the interface edited, because the honest
answer was designed in rather than bolted on.
