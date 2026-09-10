# Task 2.10.3 — The series on the wire: the predicate, the request, and the window we never compute

**Status:** Not started
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.1

## Objective

Give the frontend a fourth request shape — `GET /market-data/bars` — with the
guard that decides whether a body is a series, and the one function that builds
the query string. No React, no state, no component: this is the transport half
and it ends at a `Promise<ApiResult<BarSeriesResponse>>`.

## What the user can see when this lands

**Nothing.** The payoff is Task 2.10.7. What this buys is that nothing after it
writes a URL by hand or re-decides what a valid series body is.

## Work

- **`isBarSeriesResponse` ships in `packages/shared`, beside the shape it
  checks**, and this is its first reader — which is Task 1.7.3's rule that a
  predicate arrives with one rather than with the contract. `BarSeriesResponse`,
  `BarSeriesPayload`, `SeriesCoveragePayload`, `SeriesProvenancePayload`,
  `TimeWindowPayload` and `BarPayload` already exist there from Task 2.9.3; what
  does not exist is the guard.

  **How strict it is, is a decision with a precedent on each side.**
  `isHealthResponse` deliberately accepts unknown extra fields and an unknown
  `status`, because a newer server is a version skew rather than a broken one.
  `isMarketDataResponse` is deliberately stricter, because a feed slug this
  bundle has no words for cannot be rendered honestly and must not reach a
  component that would print it. A series sits nearer the second on **feed and
  adjustment** — `provenance.sources` carries a `BarSource` whose feed this
  bundle must be able to label, and invariant 6 is that provenance is displayed
  rather than implied — and nearer the first on everything else. Decide it once,
  write the reasoning in the module header the way both precedents do, and note
  what an `unreadable-body` from this endpoint therefore means.

  Two shapes it must **accept**, because both are correct answers rather than
  broken bodies: `bars: []` with provenance and `coverage.requested` present, and
  `coverage.covered` of `null`. A guard that requires a non-empty array turns the
  contract's own empty answer into "something else is answering at this address".

- **`getBarSeries()` in `api-client.ts`, a fourth call to `apiRequest`** for the
  reason `getSecurities` writes out: the base URL, the five-second deadline, the
  composed abort signal, the correlation-id read and the seven outcomes are each
  invisible at a call site. `api-client.ts` remains the only file in
  `apps/frontend/src` that calls `fetch` — acceptance criterion 1 — and this task
  is the one most likely to break that, because a series is the first request
  with parameters.

- **One function builds the query, and the browser's clock is not an input to
  it.** This is `MARKET-DATA-API.md` §2 and it is the trap this task exists to
  close: a browser in Singapore at 09:00 local is on the previous _market_ date in
  New York, so a client that resolves "the last 5 sessions" itself is off by one
  session for roughly half the world for several hours of every day — invisible in
  local testing, and it produces a chart that is plausible and shifted rather than
  an error anybody sees. **Send `sessions=N` and let the server resolve it**; read
  what it meant back out of `coverage.requested`.

  The absolute form exists too and is the primitive (§2), so the builder takes
  both window forms as a discriminated union rather than five optional
  parameters — the same reason the states below are a union. Note there is a
  legitimate reason to send an absolute window: §11 gives an absolute window
  inside closed sessions a five-minute lifetime where a named one has none. That
  is Task 2.10.5's to exploit if it wants to; this task only has to make both
  expressible.

- **The refusals are part of the contract, not surprises.** The cap is 10,000
  bars and is **refused with a 400 that names the number** rather than reduced —
  the server never downsamples (§3, §4) — and the calendar refuses a window
  outside 2024–2028 rather than returning fewer sessions than asked for. Both come
  back as `api-error` with a `code`. This task does not render them; it must not
  swallow them either, and its tests should assert that each survives the guard
  as an `api-error` carrying a readable `code`.

- **Test against recorded bodies, not against a running server.** `pnpm test` is
  fast by contract — no socket, no database, no network. The backend keeps raw
  recorded vendor bodies under `src/fixtures/alpaca/`, excluded from Prettier on
  purpose because formatting them would rewrite evidence; the frontend needs the
  equivalent for **our own** wire shape, and where those live is Task 2.10.6's
  decision. Until then, inline the fixtures in the test file rather than inventing
  a second home for them.

## Done when

- `isBarSeriesResponse` is exported from `@marketpulse/shared`, has a module
  header saying how strict it is and why, and accepts both the empty series and a
  `null` `covered`
- `getBarSeries()` exists, and `grep -rn "fetch(" apps/frontend/src` still returns
  exactly one file
- The query builder takes both window forms and cannot express a half-specified
  one, and **nothing in `apps/frontend/src` reads a clock to build a window** —
  asserted by inspection and stated in the file
- A 400 naming the cap and a calendar refusal both arrive as `api-error` with a
  readable `code`, covered by tests
- `pnpm verify` passes, and `pnpm --filter @marketpulse/shared test` covers the
  guard's accept and reject cases including the two that look like failures
