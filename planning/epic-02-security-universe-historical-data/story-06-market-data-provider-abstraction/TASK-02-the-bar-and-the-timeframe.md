# Task 2.6.2 — `Bar` and `Timeframe`: the smallest honest description of a price observation

**Status:** Complete (2026-09-07)
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Task 2.6.1

## Objective

Put the domain types every price in this product is eventually made of into
`packages/shared` — `Bar`, `Timeframe`, and the time range a request is made over — with no
reference to any vendor. This is acceptance criterion 1's first half.

## What the user can see when this lands

**Nothing.** Two or three type files and their tests. What it decides that a user does
eventually see is the **precision of every number on a chart** — see the `numeric`-versus-
float paragraph below, which is the one thing in this task that is not merely naming.

## Work

> **Amended 2026-09-07 by Task 2.6.1.** Four of the questions below are **settled** in
> `PROVIDER.md` §9 and this task implements them rather than re-deciding them — the field
> set (§9.1), the timestamp's name and convention (§9.2), the range's ends (§9.3), the
> timeframe members and whether aggregation is expressible (§9.4), and the numeric type
> (§9.5). They were taken there rather than here because §9.4's aggregation answer and
> §9.5's numeric answer both turn on readers in Epics 5 and 13, and deciding them beside the
> provenance record kept one document rather than two. **Overturn any of them only with a
> recorded reason in `PROVIDER.md`**; the paragraphs below are kept because they carry the
> arguments, not because the questions are still open.
>
> The short form, so this task can be started without a second read: six fields — `open`,
> `high`, `low`, `close`, `volume`, **`startsAt`** — with `vw` and `n` declined against named
> triggers; `symbol` and `timeframe` on the **series**, not the bar; a **half-open**
> `TimeRange` that refuses a reversed or zero-width range naming both ends; `TIMEFRAMES` is
> **`["1m", "1d"]`** and aggregation is **not expressible**; prices are **`number`**, with
> the guard that an aggregate over prices is computed in SQL over `numeric` and never in
> JavaScript.

### The field set is chosen against the vendor's list, not copied from it

Task 2.6.1 wrote the vendor's bar fields into `PROVIDER.md` precisely so this decision is
taken against a known list. Alpaca's minute bar carries more than OHLCV — a VWAP and a trade
count among them. **The rule to apply is `API_ERROR_CODES`' rule, one layer up: a field
exists when something reads it.**

So: open, high, low, close, volume, and the instant the bar covers, are almost certainly the
set. For each candidate beyond those, name the reader or leave it out — and note that VWAP
in particular is tempting because Epic 5's volume work sounds like it might want it, and
"Epic 5 might want it" is not a reader. Leaving it out costs one migration later; putting it
in costs a column in a ten-million-row table and a value nothing validates.

Two fields that are **not** optional and are easy to omit:

- **Which instant the bar's timestamp means** — the start of the minute or its end. Both
  conventions exist in the wild. Name it in the field's own comment, because a one-minute
  systematic error is invisible on a chart and wrong in every anomaly calculation.
- **The timeframe the bar belongs to.** A `Bar` with no timeframe is a value that cannot be
  interpreted; whether it lives on the bar or on the series that holds it is a real choice —
  see Task 2.6.3, which builds the series.

### The numeric type is the decision with product weight

`migrations/README.md` already fixed the storage half and the argument transfers whole:
money is `numeric(18,6)` and never a float, because float addition **is not associative** —
`sum()` over `[1e16, 1.0, -1e16]` returns 0 or 1 depending on the order, measured — so a
percentage change can disagree with itself between two renders because a query plan changed.

The consequence this task inherits, and it is not optional: **`pg` hands JavaScript a
`numeric` as a `string`**, deliberately, because a JS `number` is a double. So decide, here,
what a `Bar`'s `close` is on the domain type and on the wire:

- a `string`, preserving every digit, and every consumer parses at the point of arithmetic
- a `number`, which is honest for a price at two decimal places and silently lossy the first
  time something sums a column
- a branded type over one of the two

State it, state what Story 2.9's JSON carries, and state what Story 2.12's chart does with
it. Do not leave this to be discovered by whoever writes the axis.

### The timestamp follows `CALENDAR.md` §5 and does not re-decide it

Story 2.5 already settled this and it is binding here: **storage is `timestamptz`, the wire
is UTC ISO 8601 with the `Z`, `America/New_York` exists only at the moment of display, and
exactly one module performs the conversion** — enforced since Task 2.5.2 by two
`no-restricted-syntax` lint rules. A market **date** is a separate wire type, a plain
`"2026-09-04"`, never an instant at midnight.

Two things follow that this task must honour rather than rediscover:

- a `Bar`'s instant is a UTC instant, and nothing in `packages/shared` may read the wall
  clock — the `Date.now()` and zero-argument `new Date()` rules over `packages/shared/src`
  have **no exception**
- a request over "the last five trading days" is a **market date** question and goes through
  `market-session.ts`'s `lastMarketSessions`, which already exists and already refuses to
  walk off the end of the calendar rather than truncating

### `Timeframe` is a closed union, and the reason is the same reason `SECURITY_KINDS` is

A parsed string (`"1Min"`, `"5Min"`, `"1Day"`) is the vendor's vocabulary and a typo in it
is a runtime error. A closed union is a compile error, and it is what lets Task 2.6.6's
fixture provider and Story 2.7's client be checked against the same set.

Decide the members against a reader, as above: minute bars are Story 2.8's ingestion and
daily bars are what a multi-month chart draws without downloading a hundred thousand rows.
Anything else needs a reader named.

**And decide whether aggregation is expressible at all.** If a caller can ask for 5-minute
bars, either the provider aggregates or we do, and those produce different answers at a
session boundary. Saying "one minute and one day, and nothing else, until something needs
more" is a legitimate and probably correct answer — say it rather than leaving the union
open-ended.

### The time range is a type, not two parameters

A start and an end passed as two arguments can be swapped at a call site and nothing
notices. `market-session.ts` already refuses a reversed range rather than answering with an
empty array that hides the swap — follow it, and make an invalid range a refusal that names
both ends.

Note what a range's ends mean is a real question: inclusive of both, or half-open. Half-open
is what makes adjacent windows tile without a duplicated bar at the seam, which Story 2.8's
backfill does thousands of times. Choose and write it in the type's own comment.

## Done when

- The types exist in `packages/shared`, exported, with tests beside them
- **A grep for every vendor name over `packages/shared/src` returns nothing** — criterion 1,
  checked rather than asserted
- Every field's comment says what it means, and the timestamp's says which end of the
  interval it marks
- The numeric decision is written down in the type and in `PROVIDER.md`, with the wire form
  stated
- An invalid or reversed range is refused, and that is a test that was seen to fail first
- `pnpm verify` is exit 0, and the frontend artefact's movement is measured and explained —
  Task 2.6.1 predicted it, and a literal-versus-constructor difference is the thing to look
  for

## Notes

The whole risk in this task is quiet over-building. Every field added here is a column in
Story 2.8's table, a property in Story 2.9's contract, a value Story 2.14 has to be honest
about, and something Epic 13 has to be able to reproduce as-of a past instant. `Bar` should
be boring and small, and the argument for each field should be a name, not a category.

---

## What was built (2026-09-07)

Four files in `packages/shared/src`, two of them tests, plus twenty-eight lines on
`index.ts`. No dependency, no lockfile change, no new script, no new `verify` step, and **no
change to any file in `apps/frontend` or `apps/backend`**.

| File                 | What it holds                                      |
| -------------------- | -------------------------------------------------- |
| `bar.ts`             | `Bar` (six fields), `TIMEFRAMES`, `Timeframe`      |
| `time-range.ts`      | `TimeRange` (branded, half-open) and `toTimeRange` |
| `bar.test.ts`        | 8 tests                                            |
| `time-range.test.ts` | 5 tests                                            |

`packages/shared` is **172 tests across 11 files**, so `pnpm test` is **481** (172 + 146 +
163). `pnpm verify` is exit 0 in **31.06 s**.

### The three decisions this task took beyond `PROVIDER.md` §9

§9 settled the field set, the timestamp's name, the range's ends, the timeframe members and
the numeric type, and this task implemented them rather than re-deciding them. Three things
it decided itself, all recorded back into `PROVIDER.md` rather than left in the code:

1. **`TimeRange` is branded.** §9.3 said "a type, not two parameters", and a bare
   `{ start, end }` interface delivers only half of that: it stops the _positional_ mistake
   and does nothing about the _invalid_ one, because a caller writes the object literal and
   the constructor is never reached. A `unique symbol` brand — `Ticker`'s precedent exactly —
   makes `toTimeRange` the only way to obtain one. Erased at runtime, so it costs nothing on
   the wire or in the bundle. Stated cost: a range parsed out of JSON is not a `TimeRange` and
   has to be re-validated, which is correct rather than annoying.
2. **Three refusals rather than two, and the third was not anticipated.** An **invalid**
   `Date` is refused _before_ the ordering check, because `new Date("nonsense")` compares as
   neither before nor after anything — so it slips straight past `start >= end` and produces
   an empty answer at the point of use rather than an error at the point of construction.
   That is the silent-failure shape this repository keeps meeting, arriving in a new place.
3. **Two things were written and then removed before they shipped.** A `MINUTE_BAR_MS`
   constant and a `Symbol_` alias — neither had a reader, and the second re-litigated
   `ticker.ts`'s stated naming decision badly. This task's own Notes section warns about
   quiet over-building and it arrived as _convenience_ rather than as a field, which is the
   form that gets waved through.

### Two findings worth carrying, both from breaks that were made rather than reasoned about

**Five deliberate breaks, each reverted — and the fifth did not go red, which is the
finding.** Dropping the invalid-`Date` guard, relaxing zero-width, shortening the message so
it names one end, and adding a third `TIMEFRAMES` member each took 1–2 tests red naming the
behaviour. **Renaming `startsAt` to `timestamp` left all 13 tests passing at exit 0.** It is
caught by `tsc -b`, with three errors naming the field, and is invisible to `vitest run`
alone — because `expectTypeOf` is compile-time only and a `const bar: Bar = {…}` annotation is
erased, so `Object.keys` still returns the six literal keys.

The consequence, and it is a real one for whoever adds the next type here: **`Bar`'s shape is
a compile-time claim and `TIMEFRAMES`' membership is a runtime one.** `pnpm verify` catches
both because it builds before it tests; `pnpm test` on its own catches only the second. This
is the same class as the repository's recorded `.tsx`-under-a-`.ts`-glob trap and Task
2.5.3's _"a break that does not go red is evidence the break did not land, not that the code
is right"_ — met here from the other side, where the break landed and the wrong instrument
was watching.

**Criterion 1's grep has to be over code, not text, and a naive one reports six false
positives.** `packages/shared/src` contains six occurrences of a vendor name and **zero of
them are code** — five comments and one line in a test, every one explaining _why_ a decision
was taken. That is the opposite of a leak and deleting them to make a grep clean would destroy
the record. The four files added here contain zero in either form, deliberately: they say
_"the vendor"_ throughout, so the number does not grow. The code-only form of the check is
written into `PROVIDER.md` §9.5 for Task 2.6.8 to run rather than cite, and it returns
nothing. It stays prose plus a measured grep rather than becoming a test, because the check
reads source _text_ and `packages/shared` deliberately has no `@types/node` — the identical
argument `market-time.test.ts` already records for Story 2.5's criterion 2.

### The artefact did not move, and that is the check rather than a coincidence

`PROVIDER.md` §11 predicted zero bytes for Tasks 2.6.2–2.6.6 and said explicitly that it is a
check rather than a forecast. Measured before and after on a clean build: **369,437 B
`4f17aff3…` of JavaScript, 17,317 B `eb223e53…` of CSS, `index.html` 1,101 B `898733b0…`,
`staticwebapp.config.json` 300 B — 388,155 B over four files**, identical at every hash and
reproducing Task 2.5.6's figures to the byte. `TIMEFRAMES` is a plain `as const` literal and
is tree-shaken completely, `Bar`/`Timeframe`/`TimeRange` are type-only and erased, and
`toTimeRange` is an unused export that goes with them. Had it moved, something would have been
declared through a constructor call and would need finding, not accepting.

### What this task deliberately did not build

- **`isBar`.** Task 1.7.3's rule is that a validator ships with its first reader; nothing yet
  receives a bar it did not construct. Trigger: Story 2.7's mapping of a real vendor response.
- **An OHLC sanity check** (`low <= open, close <= high`). Same reason, same trigger.
- **A `timeRangeIncludes` helper.** The half-open rule is in the type's own comment, and the
  first thing that needs to ask "is this bar in this range" is Task 2.6.6's fixture filter.
- **Anything on the series** — the symbol, the timeframe, provenance and coverage are Task
  2.6.3's, and criterion 3 is that no code path produces a bar without provenance.

---

## Status report for stakeholders — what this actually was, in plain terms

**Visible change to the product: none.** This task added no screen, no button and no number.
What it did is agree, once and in writing, on _what a price is_ — and that turns out to be the
sort of thing that is very cheap to get right now and very expensive to get right later.

**The one-sentence version.** Every price chart, every "this stock moved 4.2%" and every
anomaly score MarketPulse will ever show is built out of the same small object: a price
observation over a slice of time. This task defined that object — and, just as importantly,
refused to define anything else.

**Why the smallness is the work.** The obvious move is to copy the data supplier's format and
keep everything they send, on the grounds that it might be useful. We deliberately did not.
Every field kept here becomes a column in a table that will hold roughly ten million rows, a
value sent to every browser, and something the product has to be honest about on screen
forever. So the rule applied was: _a field exists when something reads it._ Two of the
supplier's fields were left out with a written note saying what would bring them back. One of
them — a "number of trades" counter — looked genuinely useful for telling _"nobody traded"_
apart from _"we have no data"_, until we worked out that it cannot answer that question at
all, because the record only exists when trading happened. Better to find that out on a
Sunday afternoon than in six months.

**The decision a user will one day notice.** Each observation is stamped with a time, and
there is a genuine ambiguity in this industry about whether a bar labelled 09:30 covers the
minute _starting_ then or the minute _ending_ then. Get it backwards and every chart looks
completely normal while every calculation is quietly one minute out — the worst kind of bug,
because nothing ever complains. Our fix is not a comment or a convention document: the field
is **named** `startsAt` rather than `timestamp`. Now, when someone connects the real data
supplier, wiring it up wrongly reads as an obvious contradiction in their own code instead of
as a perfectly reasonable line. We also wrote down, as an obligation on the next story rather
than a hope, that somebody must confirm the supplier's convention against a real response.

**The decision about precision.** Prices are held as ordinary numbers rather than as text. The
reasoning is worth stating because the opposite is often assumed to be "safer": a single price
is stored _exactly_ as a number to far beyond any share price that exists. What is not exact
is _adding many of them up_, and nothing in this version of the product does that in the
browser — the four calculations we have planned are divisions, an ordering and a count.
Anything that genuinely does have to add prices up will do it in the database, which was
already set up for exact arithmetic. Holding prices as text would have pushed a conversion
step into twenty different places, achieved nothing, and given a false sense of safety.

**The decision about time windows.** Asking for data needs a "from" and a "to". Passed as two
separate values, they can be accidentally swapped and nothing notices — you just get an empty
chart. So a time window is now a single object that **refuses to exist** if it is backwards,
empty, or built from a nonsense date, and the refusal names both ends so you can see which one
is wrong. Windows also stop just _before_ their end time rather than including it, which
sounds pedantic and is not: it is what lets the system fetch history in consecutive chunks
without every chunk overlapping its neighbour by one observation — something a later story
will do thousands of times, where an overlap is genuine data corruption rather than a
cosmetic annoyance.

**One thing we caught by being suspicious of ourselves.** We deliberately broke our own code
five times to check the tests would notice. Four times they did. The fifth — renaming the
timestamp field, the exact mistake described above — left every test passing. It turned out
the mistake _is_ caught, but by the compiler rather than by the test suite, and only because
our standard checks run the compiler first. That is now written down, because the next person
adding a type here would otherwise have trusted a green test run that could not see the
problem.

**How this moves the product forward.** MarketPulse's whole promise is that the AI never
invents a number — it asks the system, and the system answers from real data with a stated
source. That promise needs a pipeline from a data supplier to a chart, and this is the first
brick of it. The next task attaches the label that says _where each price came from_ — which
feed, which supplier, and whether it has been adjusted for stock splits — because the product
is required to display that rather than imply it. After that comes the interface the supplier
plugs into, a deterministic offline stand-in so charts work on a laptop with no internet, and
then the real connection. The first thing a user will actually see from this chain of work is
a small but honest correction: the header currently shows a hard-coded _"DISCONNECTED"_ feed
status that has been invented since the very first version, and later in this same story it
starts telling the truth. The payoff everyone is waiting for — a real price chart with real
history — arrives a few stories after that, and it will be built out of exactly the object
defined today.
