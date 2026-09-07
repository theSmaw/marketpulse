# Task 2.6.2 — `Bar` and `Timeframe`: the smallest honest description of a price observation

**Status:** Not started
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
