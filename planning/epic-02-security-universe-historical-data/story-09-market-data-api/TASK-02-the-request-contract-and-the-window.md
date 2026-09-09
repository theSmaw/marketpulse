# Task 2.9.2 — The request contract: symbol, timeframe, window

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.1

## Objective

Turn "a symbol, a timeframe and a window" into a parsed, validated, typed request
— **as a pure function with no route and no database around it** — so the shape
Task 2.9.1 chose is exercised before anything can be served wrongly.

## What the user can see when this lands

**Nothing.** This is the half of the endpoint that decides what a caller is
allowed to ask for.

## Work

- **Parse and validate in one place, returning a result rather than throwing** for
  anything a caller can cause. `toTicker` and `toTimeRange` throw because their
  refusals are programming errors; a query string is the opposite — every refusal
  here is a **client** error and has to become a 400 with a message a person can
  act on. Keep the taxonomy small and name each member for what the caller did
  wrong, following `API_ERROR_CODES`' rule that a member exists when something
  reads it.

- **The timeframe is `TIMEFRAMES` from `@marketpulse/shared`** — `1m` and `1d`,
  and nothing else. Validate against the const array, never against a literal, so
  the vocabulary cannot fork the way the migration's `check` constraint cannot
  fork from it.

- **Resolve a named window through the calendar, in the handler's layer, never in
  `packages/shared`.** `lastMarketSessions(n, endDate)` returns sessions **oldest
  first** — do not reverse it — and throws `MarketCalendarRangeError` when the
  window runs off 2024–2028. **That refusal is a 400, not a 500**: the caller
  asked for a window this system cannot express, and the message names the covered
  range the way `pnpm bars` already does. Prove it: the same request one day
  outside the range and one day inside is the control.

- **The two window forms are mutually exclusive and a request naming both is a
  400** (`MARKET-DATA-API.md` §2). Not "prefer the absolute one", not "prefer the
  named one" — a caller that sent both does not agree with itself, and silently
  picking one is how it stays wrong. The response always reports the **resolved
  absolute** range in `coverage.requested`, so a named request and an absolute
  request are the same answer.

- **Absolute ranges become a `TimeRange`,** which is half-open and already refuses
  reversed and zero-width pairs. A malformed instant, a missing bound and a
  reversed pair are three different messages.

- **Enforce Task 2.9.1's cap here rather than in the query**, so a request that is
  too large is refused before a 48-million-row table is touched. A cap enforced
  after the read is a cap that costs what it was meant to save.

- **Do not resolve `today` inside `packages/shared`** — the two
  `no-restricted-syntax` rules make a zero-argument `new Date()` there a lint
  error, and that rule is the mechanism rather than the reminder. The clock is
  read once, at the edge, and passed in; which is also what makes this function
  testable without freezing time.

- **Unit-test it at the level it lives at.** Every refusal, the oldest-first
  ordering, the half-day session in the 2026-11-30 week (`11-27` closes 13:00 ET),
  and the boundary either side of the calendar's range.

## Done when

- One module turns a raw request into either a typed, validated request or a named
  refusal, with no `fetch`, no pool and no Fastify in it
- Every refusal has a test, and the calendar's range refusal is asserted as a
  **client** error rather than an internal one
- A named window and the equivalent absolute range resolve to the same
  `TimeRange`, asserted
- `pnpm verify` passes with no database running

## Notes

This is the file Epic 13 will read hardest: a replay-mode request is this shape
with a ceiling on it. Do not build the ceiling — invariant 4 says it belongs in
the data layer and Epic 13 owns it — but do not make it awkward either.
