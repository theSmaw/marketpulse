# Story 2.9 — Market Data API

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Stories 2.3, 2.8
**Epic scope covered:** **Addition to this epic's stated scope** — the read contract implied by "security search/select" and the two charts

## Description

The HTTP contract the frontend reads securities and bars through. The epic's scope list
names the ingestion and it names the charts, and assumes the wire between them; this story
makes it explicit, because that wire is a contract three later epics also consume and
because Epic 1 spent a whole story establishing how this codebase declares one.

## What the user can see when this story lands

**A URL that returns real price history**, readable in a browser, and ~~nothing rendered in
the application~~ — the chart is Story 2.12's.

**Amended 2026-09-09 by the task breakdown below: one thing IS rendered.** Task 2.9.6 puts
the **last stored close and its change on `/securities`**, the table Task 2.8.9 already
built, riding on a response that page already fetches. It is the first real price this
product has ever displayed, and taking it here is the delivery decision Task 2.8.9 took for
the same reason — nine backend tasks with nothing on screen is a run of work nobody outside
the code can see. It is **not** a chart, not a window control and not a live price, and it
settles none of Story 2.10's, 2.11's or 2.12's decisions.

**Scope note added 2026-09-05: Story 2.4 took the universe endpoints from this story**, and
with them the response-contract idiom and the first `selectFrom`. What remains here is the
part that needs bars to exist: the series contract, the time-window request shape, and
partial answers over a series. See Story 2.4's own file for the full table of what moved.

What it unblocks is Stories 2.10 to 2.13 and three later epics. **The payoff is visible in
Story 2.12.**

## Why it sits here in the sequence

After there is something to serve and before anything tries to render it. It is also the
last backend-only story in the epic, so it is the natural place for the epic's server-side
work to be proved end to end.

## Scope

- ~~Endpoint shapes: list the tracked universe, search it, fetch one security~~ — **all
  three moved to Story 2.4 when it was inserted; struck here 2026-09-06 because the scope
  note above said they had moved while this list still claimed them.** What remains is the
  endpoint this story is actually about: **fetch a bar series for a symbol over a time
  window at a timeframe**. Search is Story 2.11's
- The request contract for a series: symbol, timeframe, window, and how the window is
  expressed — an absolute range, or a named window like "5 sessions" resolved server-side
  through Story 2.5's calendar. The second keeps one definition of a session; the first
  keeps the server dumber.
  **Story 2.5 is complete and it settled the wire format this bullet needs (added 2026-09-06
  by Task 2.5.6).** Three things bind this story:
  **a market timestamp on the wire is a UTC ISO 8601 instant**, and `America/New_York`
  exists only at the moment of display — there is no timezone in the payload and there must
  not be one;
  **a market DATE is a separate wire type**, a `YYYY-MM-DD` string, because a session is a
  date rather than an instant and sending it as an instant is how "which session is this"
  becomes a timezone question at every call site;
  and `lastMarketSessions(n, endDate)` from `@marketpulse/shared` is what resolves a named
  window, returning sessions **oldest first** and **refusing** rather than truncating when
  the window runs off the calendar's 2024–2028 range (ADR 0017, decision 9). That refusal is
  the one to design the error path for: it is a **400-shaped** condition — the caller asked
  for a window this system cannot express — rather than a 500, so it wants
  `BAD_REQUEST` and a message naming the range, not a stack trace.
  **`packages/shared` may not read the wall clock**, which is enforced by lint, so "the last
  5 sessions from today" resolves `today` in the route handler and passes it in
- The response contract, in `packages/shared`, with the `satisfies` guard idiom Task 1.7.3
  established so a field added to the interface and forgotten in the schema is a compile
  error rather than a field that silently vanishes from the wire
- **Provenance in the payload**, per Story 2.6 — the response says which feed it came from
  and whether it is adjusted, so the UI cannot render market data without knowing
- Partial answers as first-class results (§36): "we have data through 15:42" and "we have
  nothing for this symbol" are answers, not errors, and the contract must be able to say
  them without using an error code
- **`status` is NOT filtered on this path** (added 2026-09-06). `UNIVERSE.md` §12.2 names
  the seven readers of Task 2.3.6's invisible predicate and puts this one firmly on the
  do-not-filter side: bars stored against a security we have since stopped tracking are
  still what happened, so a series request for an `untracked` symbol returns its stored
  history and says it is untracked — a 404 would be a lie about data we hold. Stories 2.7
  and 2.8 filter and this does not, and that asymmetry is deliberate
- Failure responses through Story 1.7's `ApiError` shape and its `500: apiErrorSchema`
  convention, with the correlation id already in place
- Payload size and shape: a year of minute bars is large enough that the encoding matters.
  Measure it before choosing anything clever
- Caching semantics — historical bars for a closed session are immutable, which is the
  cheapest caching opportunity this product will ever have

## Out of scope, and who owns it

- Anything rendered — Stories 2.10 to 2.14
- Streaming updates — Epic 3, which adds a second protocol beside this one (§31)
- Anomaly, filing or investigation endpoints — Epics 5, 9, 7

## Open decisions — settle with the user

1. **Named windows or absolute ranges**, per above
2. **Whether the server ever downsamples.** A three-year daily chart is ~750 points and
   fine; a one-year minute chart is ~100,000 points and is not — something must reduce it,
   and doing it on the server keeps the payload small while doing it on the client keeps
   the server honest about what it holds. Note that downsampling price data has a correct
   and an incorrect way to do it, and the incorrect way removes exactly the spikes this
   product exists to notice
3. **Pagination or a hard cap** on a series request, and what the API does when a request
   exceeds it
4. ~~**How much of the universe the list endpoint returns at once** — 100 is small enough to
   send whole today and the architecture is meant to reach 500~~ **Moved to Story 2.4 open
   decision 1, which builds that endpoint; struck 2026-09-06.** Whatever it answers, this
   story inherits it — the shape of a series response should not disagree with the shape of
   a list response about how a large result is expressed

## Acceptance criteria

1. Every endpoint declares a response schema, and a field added to a response type without
   its schema entry fails to compile
2. A series request returns bars with provenance, over a window resolved through the
   trading calendar
3. Unknown symbol, empty window, malformed timeframe and an unavailable database each
   produce the right status and the `ApiError` shape, with a quotable request id
4. "Partial data" is expressible and is not an error
5. Response times for the access patterns the charts need are measured against the real
   row count
6. The contract is exercised by tests against an assembled server, in the shape
   `server.test.ts` established
7. `pnpm verify` passes

## What this story hands forward

The contract Stories 2.10 to 2.14 consume, and the shape Epic 3's live channel sits beside
rather than replaces.

---

## Amended 2026-09-06, after Story 2.4 closed — what actually moved, and what you inherit built

The scope note above was written on 2026-09-05, before Story 2.4 ran. This records what it
actually left you, because a story whose scope moved and whose file only says so in the
future tense is how work gets done twice.

### The temporal seam is BUILT, and it is not yet EXERCISED — read both halves

`apps/backend/src/securities.ts` (Task 2.4.1) is the module `CLAUDE.md` and ADR 0015 were
promising: it builds its own `Kysely` instance over the existing pool, **does not export
it**, and exports functions returning domain objects instead. Copy that arrangement; do not
re-decide it.

**The half that matters more to you than to Story 2.4.** `securities` has no `observed_at`
and is not a temporal table, so nothing that module does would be filtered by Epic 13's
plugin even once the plugin exists. The seam was established against a case where breaking
it has **no symptom at all** — which is exactly why it was worth doing there, and it means
**your bar query is the first one where the seam does real work**, because `market_bars`
(Story 2.8) is the first table with an `observed_at`. A `selectFrom("market_bars")` that
reaches for a handle it imported from somewhere is the failure this arrangement exists to
prevent, and it will pass every test anybody can write today.

**ADR 0015's gap 4 is unchanged and was re-stated rather than closed.** The arrangement is
_honoured_, not _enforced_ — nothing stops a future module exporting an unplugged handle.

### Three things you inherit rather than have to build

- **The response-contract idiom, applied.** `packages/shared/src/securities-response.ts` is
  the worked example: an object envelope rather than a bare array (because provenance is a
  fact about the _list_), and the `satisfies` guard applied **three times** — envelope,
  security, provenance record — because it checks top-level keys and **does not reach into a
  nested object**. Nothing forces the second and third applications. A series response has
  the same shape problem and the same trap.
- **`server.test.ts`'s route-table walk now covers every route the application serves**,
  the diagnostics one included (Task 2.4.2). That was a cost Task 2.1.7 stated and left
  open; you inherit it closed, so a route you add that can fail and does not declare
  `500: apiErrorSchema` is a red test rather than a discovery in production.
- **A measured payload baseline.** ~~101 securities are **17,299 bytes**, ~2,591 gzipped. §6's
  500-security ceiling is therefore ~13 kB on the wire uncompressed.~~ **Re-measured 2026-09-09
  by Task 2.8.10: what ships is 518 securities WITH Task 2.8.9's coverage array, at 150,660
  bytes and 12,831 gzipped.** The ~13 kB prediction was for 500 securities and no coverage; it
  is not what ships, so quote the measurement. That is why Task 2.4.2
  took **no pagination and no page size** — and note what the decision actually was: the
  thing that reaches 500 without an edit is **no number rather than a bigger one**.

### What is still yours, and one thing that is newly yours

Unchanged: the series contract, the time-window request shape, partial answers over a
series, and everything that needs bars to exist.

**Newly yours: pagination, if a bar series needs it.** Story 2.4 settled it for the universe
by not having one. A series is the first response here whose size is a function of a user's
request rather than of a curated file, so the argument does not transfer.

**And `database.ts`'s recorded reversal trigger — moving the pool into `buildServer()` — is
still UNFIRED, which is not what anyone expected.** Task 2.4.2 shipped the first route that
serves data and could not fire it: the repository needs the pool, the pool needs `app.log`,
and `pino` is not importable from `apps/backend`, so a `ServerOptions.securities` cannot be
constructed before the call it would be an argument to. `securities.ts`'s route is registered
from `index.ts` for that reason. Three ways out are recorded and rejected in that file. If
you want the factory to own it, that is a real piece of work rather than a tidy-up.

## Amended 2026-09-07 by Task 2.6.7 — you already have a route in your namespace

**`GET /market-data` exists and it is a first cut of this story's contract**, recorded here
rather than only in that task's own file, the way Story 2.4's pre-emptions of 2.9, 2.10 and
2.11 were. Read this before designing the series endpoint's paths.

**What it is.** One field — `{ feed: MarketFeed | null }` — answering _which market feed is
this deployment reading_. It is a **standing configuration** rather than anything about a
request: true before any fetch is made, still true while one fails, and the chrome's
`Market feed` region renders it on every route. Its contract is
`packages/shared/src/market-data-response.ts` and its route is
`apps/backend/src/routes/market-data.ts`.

**Why it could not wait for you.** The header had rendered a **hard-coded `DISCONNECTED`**
since Story 1.5 and this was the story that knew what the true claim was. The three
candidate homes were weighed and two are closed for reasons that also apply to you:
`/health` is settled by Task 2.1.7 and not reopened, and `/securities` is **structurally
unable** to serve a chrome-wide fact, because `useSecurities` fetches only on `/securities`
while the chrome renders on all five routes.

**Three things it hands you.**

- **The path is taken and the namespace is yours to shape.** `/market-data` is a resource
  today. A series endpoint nested under it (`/market-data/bars`, or whatever you choose) is
  the tidy read; so is leaving this where it is and putting bars elsewhere. What must not
  happen is a second endpoint answering _which feed_ — that fact has one home now.
- **Provenance on a series does not come from here.** This route reports what the
  **deployment is configured to read**; `SeriesProvenance` remains the authority for what a
  **particular** series came from, per source, and it is what Story 2.14 renders beside a
  number. The two agree by construction in a provider that has one definition of its feed —
  `MarketDataProvider.feed` is that definition, and `fixture-provider.ts` reads it rather
  than repeating a literal. **Do not add a feed to a series response envelope**: it is
  already on the series.
- **The route is registered from `index.ts`** even though it could have gone in
  `buildServer()` — `resolveMarketData` needs no pool and no logger, so the ordering that
  blocked `/securities` does not apply. What decided it is one rule rather than two:
  `/health` needs nothing and lives in the factory, a route with a dependency is registered
  where its dependency is constructed. `server.test.ts`'s route-table walk covers it.

**And the shape decision that will be put to you again.** The body is **one field**, and
`provider` is deliberately absent because nothing reads it: every provider declares a feed,
so `feed === null` is exactly _"no provider is configured"_. `API_ERROR_CODES`' rule governs
a response's fields as much as a union's members — a field exists when something reads it.
The provider's name arrives with its first reader, which is Story 2.14, off `SeriesProvenance`
where it already travels.

---

## Amended 2026-09-08 by Task 2.8.8 — a fourth open decision: the read-side join

The store is full and its shape has one consequence this story owns and does not
currently name.

**The backfill stores COMPLETE sessions only**, and the nightly catch-up runs
before the open — so while a session is happening it is not in the store. A
chart window ending _now_ therefore spans two things: a stored part, and a live
part that is not stored and comes from a different tape (everything stored is
**SIP**; Epic 3's live stream is **IEX**).

Three shapes, none chosen, and this story should take it explicitly rather than
discovering it at the first chart:

1. **Serve only what is stored**, and let a "today" chart end at yesterday's
   close. Honest, cheapest, and visibly wrong to anybody who expected today.
2. **Stitch the store to a live tail and label the seam.** `PROVIDER.md` §2.4
   already refuses to let a `SeriesProvenance` hide a source disagreement, so the
   response has to say which feed each part came from — which is the mechanism
   that exists precisely for this.
3. **Ask the provider for the whole window on demand** and store nothing extra.
   Simple, and it makes every chart a metered vendor request.

Two measurements this story should have before choosing:

- **A mid-session fetch is possible and is always ~16 minutes stale.** Measured
  at a simulated 12:00 ET: a request for today's session clamps to `now − 16 min`
  and would return **134 of 390 minutes**. The clamp is mandatory rather than
  polite — the plan's recency cliff refuses the **whole** request otherwise.
- **A year of minute bars for one symbol is 97,530 rows ≈ 8.4 MB of JSON.** That
  is this story's open decision 2 on downsampling, with a number under it: the
  answer cannot be "send them all".

See [`BARS.md`](../story-08-historical-bar-ingestion-and-storage/BARS.md) §8.13
and §8.6.

---

## Task breakdown, added 2026-09-09

Nine tasks. The shape follows Story 2.8's: **settle first, build the contract
before the route, and take the visible payoff inside this story rather than
deferring it** — ten tasks of backend work with nothing on screen is a run of
work nobody outside the code can see.

**2.9.1 ships nothing on purpose.** Four open decisions and a namespace, two of
which need the user, and all four of which three later tasks would otherwise
answer differently. Task 2.6.1 is the precedent.

**2.9.2 and 2.9.3 are the two halves of the contract**, split because they fail
differently: a request is validated and refused, a response is typed and
stripped. They can be built in either order and neither needs a database.

**2.9.4 is the hard one.** It is the first query in this repository where the
temporal seam does real work, and it inherits a problem `readBars`' own comment
names and leaves open: the store deliberately holds **no** provenance, and a
series cannot exist without it.

**2.9.6 is the payoff, and it is the last close on `/securities` rather than a
chart.** It rides on a response the page already fetches, so it pre-empts neither
Story 2.10's state decision nor Story 2.12's charting decision, and it is the
first real price this product has ever displayed.

**2.9.8 is a task rather than a step** because acceptance criterion 5 is a
measurement against 48 million rows, and because its result may change Story
2.12's plan.

| Task                                                                    | What it does                                               | Visible?                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| [2.9.1](TASK-01-settle-the-contract-decisions.md)                       | Namespace, windows, downsampling, caps, the read-side join | No                      |
| [2.9.2](TASK-02-the-request-contract-and-the-window.md)                 | Symbol, timeframe, window — parsed, validated, refused     | No                      |
| [2.9.3](TASK-03-the-response-contract.md)                               | The wire shape, guarded at every nesting level             | No                      |
| [2.9.4](TASK-04-the-read-and-the-provenance-the-store-does-not-hold.md) | Rows → `BarSeries`, and where provenance comes from        | No                      |
| [2.9.5](TASK-05-the-route.md)                                           | The endpoint, and every way it can fail                    | **A URL, not a screen** |
| [2.9.6](TASK-06-the-first-real-price-on-screen.md)                      | Last close on `/securities`                                | **Yes — the payoff**    |
| [2.9.7](TASK-07-caching-and-the-immutable-session.md)                   | Closed sessions never change                               | No                      |
| [2.9.8](TASK-08-measured-against-forty-eight-million-rows.md)           | Timings and payloads, local and deployed                   | No                      |
| [2.9.9](TASK-09-verify-document-and-adr.md)                             | Verify, `MARKET-DATA-API.md`, the ADR, the upward sweep    | No                      |
