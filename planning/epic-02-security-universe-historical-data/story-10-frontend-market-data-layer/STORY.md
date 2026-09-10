# Story 2.10 — Frontend Market-Data Layer & Application State

**Status:** In progress — Tasks 2.10.1 to 2.10.8 complete (2026-09-10); 2.10.9 closes it
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.9
**Epic scope covered:** **Addition to this epic's stated scope** — the client-side half implied by every UI item in it

## Description

Decide how the frontend holds domain state and how it fetches, caches and invalidates
market data — once, here, before three UI stories each answer it differently.

§25 recommends Redux for domain state and RxJS for streaming, and immediately adds "avoid
introducing heavyweight global state libraries until application complexity demonstrates
the need". This epic is the first place there is any domain state at all, so this story is
where that judgement is actually exercised rather than quoted.

## What the user can see when this story lands

**Nothing new on screen by itself**, and everything after it is faster and more consistent
because of it. This story decides how the frontend holds domain state and fetches market
data — once, here, rather than three times in three UI stories.

**Scope note added 2026-09-05: Story 2.4 took the first fetch and the loading / loaded /
failed / empty states as types**, exercised against the securities list. What remains here is
the decision that story deliberately refused to take on one static list — **whether this
application needs a store at all**, plus caching, invalidation and the `market` feature
module's real shape. §25's own advice is to avoid a heavyweight state library until
complexity demonstrates the need, and a bar series is the first thing that might.

What a user does eventually feel from this story: whether switching between securities is
instant or re-fetches, and whether a failed request takes out one region or the page.

## Why it sits here in the sequence

It is the first frontend story in the epic and the one every subsequent one depends on.
Getting it after the charts would mean rewriting them.

## Scope

- The state decision: what lives in a store, what is server cache, and what is local
  component state. These are three different things and conflating the first two is the
  most common way a React application acquires a store it does not need
- The data-fetching layer, built on `apps/frontend/src/api-client.ts`, which is currently
  **the only file in the application that calls `fetch`** and should stay so — Story 1.12
  proved that property by grep and it is worth keeping
- Loading, empty, partial and failed states as **types**, not as booleans scattered through
  components (§36). Story 1.12's `BackendStatus` work is the precedent: name the states,
  make the impossible ones unrepresentable, and let components render a state rather than
  infer one
- A `market` feature module under the §26 boundaries, exposing a domain-level API rather
  than its internals
- Caching and invalidation: a closed session's bars never change, so this is mostly a
  question of what to keep and when to refetch.
  **Amended 2026-09-10 by Task 2.9.8: the SERVER now answers half of this, and it
  answers it in a layer no JavaScript here can see.** Both `/market-data/bars` and
  `/securities` carry an `ETag` and a `Cache-Control`, so the **browser's own HTTP
  cache** already holds every response, revalidates it with `If-None-Match`, and
  turns an unchanged answer into a `304` with no body — measured at 190,736 bytes
  → 0 for `/securities` and 1,060,490 → 0 for a month of minute bars
  (`MARKET-DATA-API.md` §11). `fetch()` sees a 200 either way; none of this needs
  a line of frontend code and **adding a second cache in front of it would be a
  cache that can disagree with a correct one**. An **absolute** window inside
  closed sessions is additionally reusable for five minutes with no request at
  all; a **named** window (`?sessions=N`) deliberately is not, because the same
  URL means a different window tomorrow — which is a reason for this layer to
  prefer sending resolved absolute windows once it knows one.

  So what is genuinely left here is the half the browser cannot do: **keeping a
  parsed, typed series in memory across a component unmount**, and deciding when a
  window the user is looking at should be re-asked for at all. Open decision 2
  below should be read against that — the measured saving a hand-rolled or
  library server cache still has to justify is a `304` round-trip and a
  `JSON.parse`, not a megabyte

- Request cancellation on navigation and on window change, which `api-client.ts` already
  composes an abort signal for
- What test support this needs, so Stories 2.11 to 2.13 test components without each
  inventing its own mock — the `test-render.tsx` module is the stated home for the
  application's context in tests, and any provider added here lands there

## Out of scope, and who owns it

- Streaming, sockets and reconnection — Epic 3, which is why the choice here should not be
  hostile to RxJS arriving beside it
- The AI's typed workspace commands operating on this state — Epic 11, which is a reason to
  keep the state shape describable
- Investigation state — Epics 7, 8, 12

## Open decisions — settle with the user

1. **Redux now, or not yet.** The honest position: today's domain state is a selected
   symbol, a time window and some cached series. A server-cache library plus URL state
   covers that with no store at all. Against that, §25 names Redux, Epic 11's generative
   workspace is much easier against an explicit typed state tree with a command log, and
   Epic 12 persists workspace state. So the question is whether to pay for it now or take a
   migration later — and the migration is cheap only if this story keeps state out of
   component internals either way. **This is the decision to settle with a person.**
2. **Server cache mechanism** — a library, or a small hand-rolled cache. Note this
   repository's habit of building the alternative before rejecting it, and its equally
   strong habit of keeping a library when the hand-rolled version fails in ways that look
   like success
3. **Where the selected symbol and window live.** The URL is the strongest candidate:
   deep-linking already works (Epic 1 proved it against the deployed host), a shared link
   to a chart is a real product feature, and Epic 11 wants the workspace describable

## Acceptance criteria

1. `api-client.ts` remains the only file calling `fetch`, verified by grep
2. Loading, empty, partial and failed are represented as types, and a component cannot
   render "loaded" without data
3. A navigation away from a pending request cancels it, and the cancelled result is not
   rendered as a failure — the distinction Story 1.12's `aborted` outcome exists for
4. The layer works against a fixture backend with no network
5. The decision and its reversal trigger are recorded
6. `pnpm verify` passes, including the React Compiler rules, which this story is the
   second real test of

## What this story hands forward

One place market data enters the UI, and the state shape Epics 3, 11 and 12 build on.

---

## Amended 2026-09-06, after Story 2.4 closed — what actually moved, and the one pattern nobody else knows

The scope note above was written on 2026-09-05, before Story 2.4 ran.

### The store decision is genuinely still yours, and Story 2.4 protected it deliberately

There are now **two hooks and no store**: `use-backend-health.ts` (Task 1.12.3) and
`use-securities.ts` (Task 2.4.3), both plain `useState` + `useEffect`, neither sharing
anything with the other. That is not an oversight — it is the recommendation in this file's
own open decisions being followed. §25 says avoid a heavyweight state library until
complexity demonstrates the need, and **one static list is the weakest possible evidence on
which to decide how this application holds domain state.** A bar series is the first thing
that might be real evidence.

`CLAUDE.md`'s frontend summary was corrected to say "no state **library**" rather than "no
state management", because the second sentence stopped being true at Task 1.12.3 and nobody
had noticed.

### The states-as-types pattern is established and worth copying exactly

`SecuritiesView` is a **discriminated union of four states** — loading, loaded,
`unreachable`, `answered-badly` — rather than four booleans, which is Story 1.12's
`BackendStatus` lesson applied a second time: the impossible combinations cannot be
constructed, so the component renders a state instead of inferring one.

Two details that are decisions rather than accidents. **The two failure states are kept
apart on the one distinction a reader can act on** — whether anything answered at all —
rather than on the seven outcomes `api-client.ts` distinguishes. And **`answered-badly`
carries the `requestId`** when the body was a well-formed `ApiError`, which is the only
internal identifier this product puts on screen, per the rule recorded in `api-client.ts`.

> **Amended 2026-09-09 by Task 2.9.6 — there is now a SECOND distinction a reader can act
> on, and this story owns what to do about it.** That task added `SERVICE_UNAVAILABLE` to
> `API_ERROR_CODES` and gave both `/securities` and `GET /market-data/bars` a **503** when
> the database is unreachable, distinct from the 500 that means this server failed. The
> backend's whole reason for the split is that the two carry **different instructions**: a
> 503 says _temporary, retry_ and a 500 says _this will fail again_.
>
> The frontend currently throws that away at the first hop. `useSecurities` maps
> `api-error`, `http-error` and `unreadable-body` alike to `answered-badly`, and
> `UniverseTable` renders it as **"unexpected response"** — a sentence that is now false for
> the commonest failure the page has, and false in the direction that matters, because it
> tells a user nothing will help when in fact waiting will.
>
> **This is not automatically a third state.** The rule above is still right that a state
> exists when a reader can act on it, and the honest reading is that there are now two
> actions — _check what is answering at that address_ and _wait and retry_ — not that there
> are three states. Whether that means a third member, a `retryable` flag off the
> `ApiError`'s `code`, or different copy under the same state is **this story's decision to
> take**, and it should be taken against the code rather than the status: `code` is the
> closed union a client is meant to branch on, and branching on the number would be reading
> the status line where the contract put a value.
>
> Two things it must not do. It must not put the raw `code` on screen — that is an internal
> discriminator, and `requestId` remains the only internal identifier this product shows.
> And it must not add a state per `API_ERROR_CODES` member; the union grows for the
> server's reasons, and a page that mirrors it is a page that changes every time the API
> learns a new failure.
>
> Task 2.9.7's file carries a pointer here, because it is the next task to touch this page
> and must not widen its scope to fix this in passing.

Note the shape it takes as a prop: `UniverseTable` takes `view: SecuritiesView` **whole**,
which is the _opposite_ of `BackendIndicator` taking four separate props — and both are
right. A union exists so the impossible combinations cannot be built, and spreading it back
into four props hands the renderer the eight-way boolean space it removed.

### The one line to carry forward: how a page announces that its content changed

**This is a property of every asynchronously-filled surface, not of this page**, which makes
it yours rather than Story 2.11's — you own the frontend data layer's shape and this is a
property of every consumer of it.

`UniverseTable`'s `Announcement` is a **persistent `role="status"`, rendered in every state
and never unmounted, that announces nothing on arrival.** All three clauses are load-bearing
and each was produced rather than reasoned about (Task 2.4.5):

- **Never unmounted.** Task 2.4.3 put `aria-live` on the _loading_ paragraph — the element
  that gets **removed** when the data lands — so the page said it had started and never said
  it had finished. A live region added at the same moment as its content is not reliably
  announced either.
- **`status` and never `alert`.** §36 makes an unreachable service a product state rather
  than a failure, and `alert` is what `ErrorFallback` carries — so an `alert` here would be
  indistinguishable from a render failure to the assertion the browser suite makes on every
  route.
- **Silent while loading.** Arriving at a page is not a change, so a sentence there is never
  heard as an announcement and is only a second copy of the visible line.

The browser suite asserts the mechanism rather than the wording: that the region exists
before the content changes, is **the same DOM node** afterwards, and carries a sentence.
Whether the sentence is a _good_ one was judged by a person; no instrument can hear anything.

> **Answered 2026-09-10 by Task 2.10.8, and the answer adds a fourth clause the
> three above could not raise.** This section was written when one page filled
> once. `/securities` now fills **two** surfaces over the network — the universe
> table and the market-data panel — and both speak.
>
> **A live region per subject, and its sentences name that subject.** That is
> what makes the queue order stop mattering: two polite regions updated in the
> same moment are read in an order neither component controls, so each sentence
> has to be complete out of context. _"NVDA: holding 1,438 bars…"_ and _"The
> tracked universe loaded. 518 securities…"_ are, in either order. One region for
> the page was rejected — it makes one component the owner of another's
> sentences, and the two states come from two independent hooks with no moment at
> which both are settled.
>
> Two sub-decisions travel with it, both recorded with their reasons in
> `components/BarSeriesPanel/series-announcement.ts`: a **correlation id is never
> spoken** (36 characters of hex a listener cannot hold or transcribe — the same
> judgement this page made about a magnitude), and a **re-entered state is
> announced**, by a clause the region passes through and back out of. That second
> one is the mechanism half of Task 2.4.5's finding: a live region whose text does
> not change announces nothing, so a refetch landing on the answer it started
> from — the common case for a closed session's bars — would otherwise be silent.
>
> **Story 2.11 inherits one more thing: a note on rate.** Nothing today changes
> either region's text without a user having navigated or pressed something. A
> search field that re-requested on every keystroke would drive this at typing
> speed, which is actively hostile — so whatever ships there owes either a
> debounce upstream of the request or a decision to stay silent while a query is
> being typed.

### Still yours

Caching, invalidation, the `market` feature module's real shape, and the store decision
itself. Nothing about a fetch-once-on-mount hook over a curated list constrains any of them.

> All four were taken across Tasks 2.10.1 to 2.10.6 and are recorded in
> [`FRONTEND-STATE.md`](FRONTEND-STATE.md), which is the subject document and
> wins where it and this file disagree.

---

## Amended 2026-09-10, after Story 2.9 closed — the contract you fetch through, and four things you inherit rather than decide

Story 2.9 is complete. Its subject document is
[`MARKET-DATA-API.md`](../story-09-market-data-api/MARKET-DATA-API.md) and its
decisions are ADR 0021. Read both before designing the `market` module's fetch
layer — this section is the pointer rather than a second copy, and where the two
disagree the subject document wins.

**The endpoint is `GET /market-data/bars?symbol=&timeframe=&sessions=` or
`&start=&end=`.** One symbol per request today, on a path chosen so widening it
to several is a query-parameter change rather than a rename (§1).

- **Do not resolve a window from the browser's clock.** Send `sessions=5` and let
  the server resolve it. A browser in Singapore at 09:00 local is on the previous
  _market_ date in New York, so a client that computes "the last 5 sessions"
  itself is off by one session for roughly half the world for several hours of
  every day — invisible in local testing, and it produces a chart that is
  plausible and shifted rather than an error anybody sees (§2). The response
  reports the resolved absolute range back in `coverage.requested`, which is the
  only way you can tell what "5 sessions" meant.
- **A partial answer is a 200, and so is an empty one.** `coverage.covered` is
  narrower than `coverage.requested` when we hold part of the window, and `null`
  when the series is empty; `bars: []` with provenance and `requested` present is
  an **answer**, never an error (§6). Your states-as-types union needs a member
  for _loaded and partial_ that is not _failed_ — that is the one shape Story
  2.4's static list could not teach you.
- **Caching is already half-decided on the server and you should not fight it**
  (§11). Every response carries a weak `ETag` recomputed from the whole body;
  an absolute window inside closed sessions carries `private, max-age=300` and a
  named window carries no lifetime at all, because `?sessions=5` is a stable URL
  naming a moving target. `fetch()` revalidates on its own. **Whatever you decide
  about a client store, do not build a second TTL over these URLs** — the
  five-minute ceiling exists so nothing in this system serves an invalidated body
  for longer, and a client cache with its own lifetime defeats it silently.
- **The cap is 10,000 bars and it is refused rather than reduced** (§3, §4). The
  server never downsamples, so a window control that can ask for more than the
  cap has to handle a 400 that names the number. A year of minute bars is 11.08
  MB and is refused; a month is ~1.06 MB identity and **~154 kB on the wire**,
  because the server compresses (§13) and `fetch` decompresses transparently —
  you need no code for that, and Task 2.9.10 confirmed it against the browser
  suite.

**And one thing that is still entirely yours.** Story 2.9 built no hook, no store
and no second fetch — Task 2.9.7 added a fourth key to a response
`useSecurities` already fetched, precisely so this story's decision stayed open.
`use-*.ts` is still four files.

---

## Tasks — added 2026-09-10

Nine tasks, sequential. The shape follows Story 2.9's: **the decisions are
settled first and ship nothing** (2.10.1, the precedent being Tasks 2.6.1 and
2.9.1), the layer is built in four thin slices that are each testable without a
screen, and the last three put it in front of a person and close the story.

**This story says "nothing new on screen by itself", and that is still true of
the layer — but it is not true of the story.** Three of the nine tasks are
visible, and they are placed as early as the dependency graph allows rather than
banked at the end, because a run of stories with no visible change is how a
product stops being demonstrable. 2.10.2 lands second and is visible: it applies
the retryable-failure decision to `/securities`, which is a page that already
exists and already produces the failure, so it needs none of the series work
beneath it.

**2.10.7 renders a real series and deliberately draws nothing.** Story 2.12 owns
the charting decision — library or hand-built, line or candlestick, how the
x-axis handles market gaps — and it should take it against a data layer that is
already known to be right, rather than debugging both at once. So this story's
payoff is a panel of stated facts: the window asked for against the window held,
the bar count, the first and last market timestamps, the four prices, the feed
labelled by the rule that already ships. No axis, no line, no sparkline. That
fence is written into the task and into the component's header.

**2.10.8 is a task rather than a step** because the state union has members the
universe page could not produce — partial, empty, and two refusals that are not
failures — and because "what the screen does while the next series loads" is a
decision Story 2.13's window control and Epic 3's live feed both inherit. Taking
it once, here, is the whole reason this story sits before the charts.

| Task                                                                    | What it does                                                           | Visible?                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- |
| [2.10.1](TASK-01-settle-the-state-decisions.md)                         | Store, cache, where selection lives, and what "retryable" means        | No                           |
| [2.10.2](TASK-02-a-failure-a-user-can-act-on.md)                        | `/securities` says whether waiting will help, and offers a retry       | **Yes — and it lands early** |
| [2.10.3](TASK-03-the-series-on-the-wire.md)                             | `isBarSeriesResponse`, `getBarSeries`, and the window we never compute | No                           |
| [2.10.4](TASK-04-the-market-module-and-the-states.md)                   | The `market` module, and partial as a first-class state                | No                           |
| [2.10.5](TASK-05-the-hook-cancellation-and-what-survives-an-unmount.md) | Cancellation, supersession, and a parsed series kept across unmount    | No                           |
| [2.10.6](TASK-06-the-fixture-backend.md)                                | A fixture backend, so 2.11–2.13 do not invent three mocks              | No                           |
| [2.10.7](TASK-07-a-real-series-on-screen-without-a-chart.md)            | A real series on screen, URL-keyed, drawing nothing                    | **Yes — the payoff**         |
| [2.10.8](TASK-08-every-state-produced-not-described.md)                 | Every state from a named cause; stale-while-loading; the announcement  | **Yes**                      |
| [2.10.9](TASK-09-verify-document-and-adr.md)                            | Verify, `FRONTEND-STATE.md`, the ADR, the upward sweep, the deploy     | No                           |

**What this story deliberately does not take**, so that no task quietly does: the
charting decision (2.12), search and the per-security route's URL strings (2.11),
the window control and its calendar vocabulary (2.13), and provenance as a
product-wide requirement including a series naming two feeds at once (2.14).
2.10.1 owns the _rules_ those four inherit — where state lives, what a shared
link carries — and none of the strings.
