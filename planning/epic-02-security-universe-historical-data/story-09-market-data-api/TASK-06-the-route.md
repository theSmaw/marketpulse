# Task 2.9.6 — The route, and its failures

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.5

## Objective

Put the series on the wire at the path Task 2.9.1 chose, with every failure
answering in the `ApiError` shape and a quotable request id — the first route in
this application whose response size depends on what the caller asked for.

## What the user can see when this lands

**A URL that returns real price history**, readable in a browser: open it with a
symbol and a window and get NVDA's actual minute bars out of the 48-million-row
store, with provenance attached. That is not a feature and it is not nothing —
it is the first market data this system has ever served, and it is worth showing
on the call the way `/securities` was. **The application renders nothing new**;
the chart is Story 2.12's.

## Work

- **Declare `500: apiErrorSchema`**, and note that `server.test.ts`'s route-table
  walk now covers **every route the application serves**, including the ones
  registered from `index.ts` (Task 2.4.2 closed that gap). So forgetting it is a
  red test rather than a discovery in production.

- **Register it where its dependency is constructed**, following the one rule this
  repository settled rather than re-deciding it: `/health` needs nothing and lives
  in `buildServer()`; a route with a dependency is registered where its dependency
  is constructed, which for anything needing the pool is `index.ts`. Do **not**
  attempt to move the pool into `buildServer()` — three ways out are recorded and
  rejected in `routes/securities.ts`, and `database.ts`'s reversal trigger now
  names a **condition** (the repository becoming constructible without the
  application's logger) rather than this story.

- **Map each refusal to its status, and keep the mapping in one table** rather
  than scattered through the handler:
  - a malformed symbol, timeframe, window or a window outside the calendar's
    2024–2028 range → **400** and `BAD_REQUEST`, with a message naming what is
    wrong and, for the calendar, the range it covers;
  - a request over Task 2.9.1's cap → **400**, naming the limit;
  - a symbol that is not in the universe → **404**;
  - a symbol we hold nothing for, and a window nothing traded in → **200 with an
    empty series**, which is §36's whole point;
  - the database being unavailable → **503** and a **new `SERVICE_UNAVAILABLE`
    member of `API_ERROR_CODES`**, with `errors.ts`'s status-to-code mapping
    extended **in the same change** — a 503 raised without it answers
    `INTERNAL_ERROR`, which names the wrong thing. This is not a fresh decision:
    `database.ts` records it in terms for this story to _implement rather than
    re-take_, and `routes/securities.ts` says _"a connection that fails … is still
    Story 2.9's"_. **`/diagnostics/database` is NOT the precedent** — it answers
    **200 whatever the answer is**, on purpose, because "is the database
    reachable" is a question it answers correctly when the answer is no. See
    `MARKET-DATA-API.md` §6, whose first draft got this wrong;
  - the provider failing while Task 2.9.5 fetches the tail → **200 with the stored
    part**, coverage ending where the store ends. §36: a partial answer is a
    product state, not an error;
  - anything uncaught → **500**, and **the thrown message never reaches the
    client** (Task 1.7.4's rule) — it goes to the log under the request's `reqId`.

- **`fast-json-stringify` strips every property the schema does not declare**, so
  assert the stripping property **on the real route** with a `preSerialization`
  hook — an `onSend` hook is handed a string that has already been stripped. And
  remember the trap that makes a green leak test worthless: adding a field to a
  handler leaves the test green until the field is declared in the schema too.

- **Test through `app.inject()`**, which is where this repository's integration
  tests live, over a stub read so the suite needs no database — that property is
  what keeps `pnpm verify` runnable with no server, no network and no credentials,
  and it is worth protecting deliberately rather than by luck.

- **Once `SERVICE_UNAVAILABLE` exists, `/securities` should answer it too.** That
  route has been able to produce this failure since Story 2.4 and returns a 500
  today only because the code did not exist — its own comment says so. Taking it
  here is a two-line change in the story that added the member; leaving it is a
  second answer to one question. Record whichever you do.

- **Do not add a search parameter and do not add a second "which feed" field.**
  Search is Story 2.11's and has an open decision this must not settle by accident;
  the feed question has one home already.

## Done when

- The endpoint answers with a real series from the real store, with a matching
  `x-request-id`
- Every row of the status table above has a test, and the 5xx path is asserted to
  carry the `ApiError` shape and **not** the thrown message
- The route-table walk sees the route and its `500: apiErrorSchema`
- `pnpm verify` passes with no database running

## Notes

Quote a real response in the task's write-up — a symbol, a window, the byte count
and the timing — rather than describing one. Task 2.9.9 takes the measurements
properly; this one just proves the thing answers.
