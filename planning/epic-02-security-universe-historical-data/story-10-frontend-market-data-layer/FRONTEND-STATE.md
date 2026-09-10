# Frontend state — the store, the cache, the URL, and what "retryable" means

The subject document for [Story 2.10](STORY.md), produced by Task 2.10.1, which
**ships no hook, no module and no pixel**. Its whole output is that Tasks 2.10.3
to 2.10.8 — and Stories 2.11, 2.12 and 2.13 after them — do not each answer the
same four questions differently. Task 2.9.1's precedent exactly, and Task
2.6.1's before it.

Every bundle figure below was **taken on 2026-09-10 in this repository**, by the
method §1 names: add the candidate, wire a realistic use of it into the render
tree, `vite build`, read `dist/`, revert. Nothing is read off a package page.
The server-side caching figures are quoted from
[`MARKET-DATA-API.md`](../story-09-market-data-api/MARKET-DATA-API.md) §11 with
their date, and that document wins where the two disagree.

**Four decisions, and one boundary.** This task decides where state lives and
how it is fetched. It does **not** choose a charting library (Story 2.12), does
not design the per-security route's URL strings (Story 2.11), and does not
settle the window vocabulary (Story 2.13). It owns the _rules_ those three
inherit and none of the strings.

---

## 1. The store — not yet, and the shape that keeps it cheap

**Decided: no state library in this story. Four hooks become a `market` module
with a typed state union and a domain API, and the store arrives when one of
three conditions below fires.**

### What is actually in the tree today

Enumerated rather than characterised, because "we have no state management" was
a sentence that stopped being true at Task 1.12.3 and nobody noticed for two
stories.

| Module                  | What it holds                                  | Requests? | Shared with anything? |
| ----------------------- | ---------------------------------------------- | --------- | --------------------- |
| `use-backend-health.ts` | A polled `BackendStatus`                       | Yes       | No                    |
| `use-securities.ts`     | A `SecuritiesView` — a four-member union       | Yes       | No                    |
| `use-market-feed.ts`    | Which feed this deployment reads, fetched once | Yes       | No                    |
| `use-market-clock.ts`   | The market clock, read from a timer            | No        | No                    |

Four `useState` + `useEffect` hooks, no store, no context, and **nothing shared
between any two of them**. There is no piece of state in this application that
two components both write. That is the honest starting position and it is the
whole of the case against paying for a store today.

### The bundle cost, measured

Method: the candidate added with `pnpm add`, a probe module wired into
`main.tsx` inside the real render tree (a store with a two-field slice and a
`useSelector`; a `QueryClient` with a `useQuery` over the bars endpoint), then
`pnpm --filter @marketpulse/frontend exec vite build`, reading the emitted JS
chunk. Reverted afterwards, and the baseline rebuilt to the **byte-identical
chunk hash** (`index-B1wH5iln.js`) to prove the revert landed.

| Candidate                                        | JS chunk  | gzip          | Δ gzip vs baseline     |
| ------------------------------------------------ | --------- | ------------- | ---------------------- |
| **Baseline** — what ships today                  | 376.45 kB | **122.26 kB** | —                      |
| `@reduxjs/toolkit` 2.12.0 + `react-redux` 9.3.0  | 399.13 kB | **130.69 kB** | **+8.43 kB (+6.9%)**   |
| `@tanstack/react-query` 5.102.8                  | 409.59 kB | **131.80 kB** | **+9.54 kB (+7.8%)**   |
| RTK + RTK Query (`@reduxjs/toolkit/query/react`) | 451.65 kB | **147.53 kB** | **+25.27 kB (+20.7%)** |
| A hand-rolled bounded `Map` cache, ~35 lines     | 376.80 kB | **122.39 kB** | **+0.13 kB (+0.1%)**   |

Two readings that are not obvious from the table. **Redux itself is the cheap
half** — 8.43 kB gzipped is a real but unremarkable price for an explicit typed
state tree, and it is _not_ what a "heavyweight global state library" costs in
the sentence §25 uses. What is expensive is the **data-fetching layer bolted to
it**: RTK Query triples the bill, and it would be buying a cache whose expensive
half the server already built (§2).

So the bundle is not the argument against Redux. It is the argument against
buying Redux **and** a server-cache library together, which is the shape most
React applications acquire by default.

### The argument, and what Epic 11 actually needs

§25 names Redux and immediately says to avoid a heavyweight global state library
until complexity demonstrates the need. This epic is the first place there is any
domain state at all, so the judgement is exercised here rather than quoted.

**Against paying now.** There is no shared state. A store today would hold one
symbol, one window and a cache — and the symbol and window are going in the URL
(§3), which is a better home than any store for the reasons §3 gives. A store
whose entire contents are a server cache is the commonest way a React
application acquires a store it does not need, and it is exactly what the STORY's
scope note warns about: _what lives in a store, what is server cache, and what is
local component state are three different things._

**For paying now.** Invariant 2 is that the AI manipulates typed application
state, and Epic 11 executes `WorkspaceCommand` objects against it; §19 requires
every command to be recorded, with undo, redo and pinning; Epic 12 persists
workspace state. All three are materially easier against one explicit typed tree
with a reducer and a command log than against a graph of hooks.

**The resolution is that Epic 11 needs a typed state tree and a command log, and
neither of those needs to exist before there is a second writer.** A reducer over
a typed state object is a thing this repository can add in one task; what makes
that task expensive is not the reducer, it is state that has been dissolved into
component internals in the meantime. The STORY's own hedge is binding on that
point and it is the operative half of this decision.

### The shape that keeps the migration cheap — binding on Task 2.10.4

Four rules. Each is a property Task 2.10.4 builds and Tasks 2.10.5 to 2.10.8
inherit.

1. **State lives in the `market` module, not in a component.** The module owns a
   `BarSeriesView` discriminated union and a domain API that returns one; a
   component receives the union **whole** as a prop and renders the member it is
   given. This is `UniverseTable`'s shape and it is deliberately the opposite of
   `BackendIndicator`'s four separate props — a union exists so the impossible
   combinations cannot be built, and spreading it back into props hands the
   renderer the boolean space it removed.
2. **Every state is a member of a union, never a boolean.** Story 1.12's
   `BackendStatus` lesson applied a third time. Consumers `switch`, and `tsc`
   refuses one that forgets a member — which is what makes adding _partial_
   (Task 2.10.4) a compile error at every call site rather than a silent
   fall-through.
3. **The transition function is pure and separate from the hook.** `useSecurities`
   already has this shape: `toSecuritiesView(previous, result)` is a pure
   function of the previous state and one `ApiResult`, and the hook is a thin
   `useEffect` around it. A pure `(state, event) => state` is a reducer that has
   not been told it is one, and it is the single thing that makes a later Redux
   migration a re-wiring rather than a rewrite.
4. **Context, when it arrives, arrives in one file.** `test-render.tsx` is
   already stated to be the one home of the application's context in tests, and
   its own header says every provider Epic 2 adds lands there. So a `<Provider>`
   added in Epic 11 touches `App.tsx`, `.storybook/preview.tsx` and
   `test-render.tsx` — three files, all of which already describe the tree — and
   no test file.

### Reversal trigger — three conditions, any one of which fires

Conditions rather than a story number, per `CLAUDE.md`.

- **The first piece of state that two sibling surfaces both _write_.** Two
  readers is prop-drilling; two writers is a store. (A comparison chart and a
  topology view both setting the focused symbol is the likely first one.)
- **The first `WorkspaceCommand` that must be applied to state no URL can
  carry** — §18's worked example is four symbols, a metric and a window in one
  command, and §19 wants it undoable. The moment the workspace is not spellable
  as an address, the address stops being its home.
- **The first requirement for undo, redo, or a replayable command log**, which
  is a reducer and a log by definition and should not be hand-rolled twice.

Note what is deliberately **not** a trigger: bundle size, a third hook, or a
component tree deep enough to be annoying to prop-drill. The first two are not
evidence of anything and the third has a cheaper answer than a store.

---

## 2. The server cache — hand-rolled, bounded, and with no lifetime of its own

**Decided: a small hand-rolled in-memory cache of parsed series, read only to
paint sooner and never to skip a request.**

### The one sentence a later reader must not misread

> **The browser's own HTTP cache already stores every one of these responses,
> revalidates each with `If-None-Match`, and turns an unchanged answer into a
> `304` with an empty body — measured at 1,060,490 B → 0 for a month of minute
> bars and 190,736 B → 0 for `/securities` (`MARKET-DATA-API.md` §11,
> 2026-09-10). A client cache is therefore not being asked to save a megabyte.
> That megabyte is already saved, in a layer no JavaScript here can see. It is
> being asked to save one `304` round trip and one `JSON.parse`.**

Anyone re-arguing this decision in bytes is arguing about bytes that were saved
by Task 2.9.8 before this layer existed.

What is genuinely left is the half the browser cannot do: **the browser caches
_bodies_, and this application needs a _parsed, typed series_ to survive a
component unmount.** A `304` still costs a round trip, and a 200 from disk still
costs a `JSON.parse` of up to a megabyte on the main thread — against §28's "no
routine main-thread task >50 ms".

### Library or hand-rolled — the test this repository already uses

This repository has two opposing habits and both are real: Story 1.6 threw away
two schema libraries and Task 1.7.6 threw away `react-error-boundary` (+932 B,
built then reverted), while `@fastify/cors` was **kept against that habit**. [ADR 0008](../../../docs/adr/0008-the-local-development-loop.md) §2 states the deciding rule, and it is not about size:

> Those would have been merely verbose if hand-rolled wrong; a hand-rolled CORS
> is either too permissive, which is a security bug, or subtly wrong on
> preflight, which presents as `TypeError: Failed to fetch` beside a 200 in the
> log — that is, **indistinguishable from the bug being fixed**.

**So the question is the failure mode, and this one fails verbosely.** A
hand-rolled cache that misses when it should hit produces an extra request that
the server answers with a `304` — visible in the network panel, costing a round
trip, correct on screen. There is exactly **one** way a client cache fails
invisibly, and it is the one that matters: **serving a body that has been
invalidated.** That failure is what the five-minute ceiling exists to bound, and
the design below removes it structurally rather than promising to avoid it.

This is therefore the `react-error-boundary` case and not the `@fastify/cors`
case: a small amount of code whose wrong behaviour is loud. **+0.13 kB against
+9.54 kB** is then a tiebreaker rather than the argument.

### The design, and why it cannot defeat the five-minute ceiling

**No second TTL over these URLs.** The constraint is binding and it is met by a
stronger rule than "pick a shorter TTL":

- **Every read of the cache is accompanied by a request.** The entry is used to
  **paint sooner** — the previous parsed series rendered while the new answer is
  in flight, which is the stale-while-loading behaviour Task 2.10.8 owns — and
  never to decide that no request is needed.
- **Which means freshness is decided in the layer that already owns it.** The
  request goes out; the browser answers it from disk with no network at all when
  the response carried `private, max-age=300` (an absolute window inside closed
  sessions), and revalidates it into a `304` otherwise. The ceiling stays exactly
  where §11 put it, and this layer has no opinion about time at all.
- **Eviction is by count, never by clock.** A bounded LRU `Map`. A cache with no
  lifetime cannot have a lifetime that disagrees with the server's.
- **The key is the request as sent** — `symbol | timeframe | window`, with the
  window in the form the caller expressed it (§3). A named window and an absolute
  window are different keys because they are different requests, which is the
  same rule every HTTP cache between here and the server is already using.

The consequence worth stating: a stale entry can be on screen only for the
duration of one in-flight request, and only underneath a visible loading
affordance. That is a **product** behaviour Task 2.10.8 designs, not a
correctness hazard.

### What this does not decide

The entry bound (24 is the working number) and the parsed-heap cost of a series
are **Task 2.10.5's to measure when it builds the thing** — a heap figure taken
against a module that does not exist would be a number about a probe.

### Reversal trigger

- **A `JSON.parse` of a real series measured over 50 ms on the main thread**,
  which turns this from a convenience into a §28 obligation and probably moves
  parsing to a worker rather than to a library.
- **The first requirement this cache cannot express without acquiring a clock** —
  a background refetch on an interval, or a request deduplicated across
  components that mount at different times. Both are things a library does well
  and a hand-rolled `Map` starts doing badly, and the second is the likelier one
  when Epic 3's live feed arrives beside this.

---

## 3. Where the selected symbol and window live — the URL

**Decided: the URL is the home. The subject goes in the path, the view goes in
the query, and a shared link carries the window form the user actually
expressed.**

### The home

Deep-linking already works and was proved against the deployed host in Epic 1;
`staticwebapp.config.json` is part of the artefact for exactly that reason. A
link to a chart is a real product feature — §38's demo is a thing people are
shown, and "send me that" is the first thing a viewer asks. And Epic 11 wants
the workspace describable, which an address already is.

The alternative — component state, or a store — loses the shared link, loses the
back button, and makes the browser's own history a second, disagreeing copy of
the navigation state. There is no case for it here.

### The shape — the rule Stories 2.11 and 2.13 inherit

**The path names the subject. The query names the view.**

- **Path segment for the subject**: which security is being looked at.
  `paths.ts` already records that Story 2.11's view is `/securities/:symbol`,
  nested under the list, and already argues why the parameterised route is not
  declared until something is behind it. Nothing here changes that.
- **Query parameter for the view**: the window, and later the comparison set and
  the encoding. These are adjustments to how one subject is being looked at, and
  a query parameter is what an optional, omittable, order-insensitive adjustment
  is.
- **An absent parameter means the default, and the application never writes a
  parameter it did not need.** A URL that accretes every default is not
  shareable, it is a session dump.

The **strings** are not decided here. Story 2.11 owns the route's shape and
Story 2.13 owns the window vocabulary; what they inherit is the rule above.

### Which window form a shared link carries — the product decision

`MARKET-DATA-API.md` §11 makes this a real question rather than a formatting
one: `?sessions=5` is a stable URL naming a **moving target** and carries no
cache lifetime, while an absolute window inside closed sessions is a stable URL
naming a fixed thing and is reusable for five minutes with no request at all.

**Decided: the URL carries what the user expressed, and the application never
silently rewrites one form into the other.**

- A user who picked **"last 5 sessions"** gets `?sessions=5` in the address bar,
  and a link they share means _the last 5 sessions_ when it is opened tomorrow.
  That is what the person sending it meant. Resolving it to absolute at the
  moment of copying would freeze the link's meaning to a window the sender was
  not talking about — silently, and in a way that looks entirely correct.
- A user who picked **an explicit range** gets that range, and their link means
  that range forever. Which is also what they meant.
- **The resolved range is still read and still used.** `coverage.requested`
  reports what "5 sessions" meant, it is the only way the client can know, and it
  is what the panel Task 2.10.7 renders states back to the user. It informs the
  display; it does not rewrite the address.

The cache behaviour then follows for free rather than being arranged: a named
link is a moving target and carries `no-cache`, so it revalidates; an absolute
link is fixed and carries `max-age=300`, so it does not. The two forms mean
different things and are cached differently **because** they mean different
things.

**And the window is never computed here.** Send `sessions=5` and let the server
resolve it (§2 of the API document): a browser in Singapore at 09:00 local is on
the previous _market_ date in New York, so a client that resolves "the last 5
sessions" itself is off by one session for much of the world for several hours
of every day — invisible in local testing, and producing a chart that is
plausible and shifted rather than an error anyone sees.

### Reversal trigger

- **The first view state that cannot be spelled in an address a person would
  paste.** §18's four-symbol comparison with a metric and per-series encoding is
  the likely first one. At that point the workspace acquires a serialisable
  state object, the URL carries an identifier for it, and this decision becomes
  "the URL names the workspace" rather than "the URL is the workspace".
- **The first time two windows are on screen at once** — a comparison against a
  different period — because one address cannot hold two current values of one
  thing without inventing a syntax for it.

---

## 4. What a retryable failure is — a derived flag, not a state

Handed to this story on 2026-09-09 by Task 2.9.6, which gave `/securities` and
`GET /market-data/bars` a **503** when the database is unreachable, distinct from
the 500 that means this server failed. The two carry different instructions —
_temporary, retry_ against _this will fail again_ — and the frontend currently
throws the distinction away at the first hop and renders both as **"unexpected
response"**, which is false in the direction that matters.

**Decided: a `retryable: boolean` derived from the error `code`, carried on the
existing failed state, changing the copy and adding a retry affordance. Not a
third state, and not a state per code.**

### Why a flag rather than a member

The rule this repository already uses is that _a state exists when a reader can
act on it_, and there are honestly two actions here. The reason they are not two
states is that **only one of them is an action on this page.** "Wait and retry"
is an affordance: a button, and a sentence saying waiting may help. "Check what
is answering at that address" is something an operator does elsewhere, with the
`requestId` this state already carries. The page's shape is the same in both
cases — a failure region, a sentence, and possibly a button.

A third union member would force every consumer's `switch` to grow for a
distinction that changes one sentence and one button, and it would grow again at
the next code. A flag off the state changes the two things that actually differ.

### The mapping, and the two things it must not do

Derived from `code` and **never from the status number** — `code` is the closed
union a client is meant to branch on, and reading the status line is reading
where the contract did not put the answer.

| Client outcome                           | Retryable | Why                                                                  |
| ---------------------------------------- | --------- | -------------------------------------------------------------------- |
| `api-error`, `code: SERVICE_UNAVAILABLE` | **yes**   | The contract's own word for _temporary_                              |
| `api-error`, `code: INTERNAL_ERROR`      | no        | This server failed; it will fail again                               |
| `api-error`, `code: NOT_FOUND`           | no        | A fact about the subject, not about the moment                       |
| `api-error`, `code: BAD_REQUEST`         | no        | A fact about the request, and this client built it                   |
| `timeout`                                | **yes**   | Nothing arrived; waiting may help                                    |
| `unreachable`                            | **yes**   | Nothing arrived; a refused connection or a name that did not resolve |
| `http-error`                             | no        | See below — deliberate, and fail-safe                                |
| `unreadable-body`                        | no        | Something is answering and it is not this API                        |
| `aborted`                                | —         | Not a state at all; the caller did this                              |

**The flag is a property of the failure states only, and the two refusals are
not failures.** Task 2.10.4's union has a `refused` member for the 10,000-bar cap
and for a window outside the calendar's range, and both arrive as `api-error`
carrying `BAD_REQUEST`. They keep their own member and never acquire this flag: a
refusal is a well-formed answer **about the request**, it owes the user its
number rather than a statement about waiting, and marking it "not retryable"
implies waiting was ever the question. The row above governs a `BAD_REQUEST` this
client did not recognise as a refusal.

**`http-error` is not retryable on purpose, and it is the interesting row.** It
is a non-2xx whose body is not an `ApiError` — an ingress answering its own 503
while the replica behind it is not serving, which is genuinely temporary. But it
carries no `code`, and the fence is that we branch on the code. An answer we
cannot read the contract from is one we cannot make a promise about, so this
client understates retryability rather than guessing.

There is a **second, non-obvious path into that row and it is worth writing
down**: `isApiError` rejects a `code` it has not been taught (`api-error.ts`
argues why — a discriminator a caller switches on is worse admitted than
declined). So a server that later learns `TOO_MANY_REQUESTS` produces
`http-error` in this bundle until the shared package teaches it the code. That
is a version skew degrading to "we do not promise waiting will help", which is
the safe direction, and it means **teaching the frontend a new retryable code is
a `packages/shared` change and a redeploy**, not a wire change.

**Where it lives:** beside `API_ERROR_CODES` in `packages/shared/src/api-error.ts`,
because the meaning of a code is part of the contract rather than a client's
opinion — the same rule `api-client.ts` states for predicates, and for the same
reason: a second copy written at a call site is the copy that disagrees first.

### Two things this must not do, both inherited and both binding

- **The raw `code` never goes on screen.** It is an internal discriminator.
  `requestId` remains the only internal identifier this product shows, under
  `api-client.ts`'s rule: the whole id, never a prefix, only ever as a labelled
  reference beside a failure the user is already being told about.
- **No state per `API_ERROR_CODES` member.** That union grows for the server's
  reasons, and a page that mirrors it changes every time the API learns a new
  failure.

### What this binds

**Both the universe page and every series state after it.** Task 2.10.2 applies
it to `/securities` — which is where the sentence is false today — and Task
2.10.4's `BarSeriesView` carries the same flag on its own failed member, spelled
the same way. Two pages disagreeing about what a 503 means would be the exact
outcome this task exists to prevent.

The **copy** is not decided here. The rule is: a retryable failure says waiting
may help and offers a retry; a non-retryable one says it will not and offers
none — because a retry button under a failure that will fail again is a lie the
user pays for twice.

> **Amended 2026-09-10, by Task 2.10.2 shipping it.** Two things a later state
> should copy rather than re-decide.
>
> **The failed state carries a second flag, `retrying`.** Not in this section's
> original decision, and it is a different question with the same answer: what
> the page does _while_ a retry is in flight. Returning to the loading state
> takes the failure's own sentence off the screen while we find out whether it
> is still true and puts it back a moment later, which reads as the page
> breaking twice. So the failure stays and the control says it is working, and
> the control is deliberately not disabled — a disabled button loses focus in
> every browser. `BarSeriesView` should spell both the same way.
>
> **The announcement is part of the flag rather than an extra.** A live region
> whose text does not change announces nothing, so a retry that fails the same
> way is silent to a listener unless the region passes through a distinct
> sentence and back out of it. Measured across `failed → retrying → failed`.
>
> The shipped copy is tabulated in
> [`TASK-02`](TASK-02-a-failure-a-user-can-act-on.md). The rule above is what
> governs, and **both** directions of it are said out loud on screen: a
> non-retryable failure states that trying again would produce the same answer,
> rather than leaving the absent button to be inferred.

> **Amended 2026-09-10, by Task 2.10.4 building `BarSeriesView`.** Two things
> the mapping table above does not say, both found by reading the server rather
> than by re-deciding anything.
>
> **On `GET /market-data/bars` there is no reachable `BAD_REQUEST` that is not a
> refusal, so that row governs `/securities` and nothing on the series path.**
> `parseSeriesRequest` produces five refusals — malformed symbol, malformed
> timeframe, malformed window, a window outside the calendar, and the
> 10,000-bar cap — and all five are one `400 BAD_REQUEST`. The machine-readable
> `reason` is **logged and never sent**, so a client cannot subset them; it does
> not need to, because all five are well-formed answers about the request, each
> carrying a sentence written for a person, and none is a fault anybody can wait
> out. The paragraph above is therefore right about where the fence goes and its
> "a `BAD_REQUEST` this client did not recognise as a refusal" describes an
> empty set here.
>
> **`NOT_FOUND` is a refusal too, on this endpoint.** A symbol we do not track is
> an answer about the request rather than about the market or the server, it
> carries its own sentence, and waiting does not change it. It joins `refused`
> rather than acquiring a `retryable: false`, for the same reason the cap does.
> The reversal trigger is a **control**: the first surface that offers an action
> for an unknown security — Story 2.11's search — rather than a sentence, at
> which point the two stop having the same shape and `refused` splits.
>
> Note what has **not** changed: no state per `API_ERROR_CODES` member. Two
> codes reach one member and two reach another; the union is six wide and the
> API can learn a fifth code without it moving.

### Reversal trigger

- **The first code that is retryable only after a stated delay** — a
  `Retry-After`, or a rate limit — at which point a boolean is not enough and
  this becomes structured retry guidance rather than a flag.
- **The first failure where retrying is harmful.** Everything this API serves
  today is a `GET`. The moment a retryable failure sits on something that is not
  idempotent, "may the user press this again" stops being a property of the code.

---

## 5. What each following task inherits

| Task       | What it takes from here                                                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2.10.2** | §4 whole — the flag, the mapping, the two prohibitions, and the copy rule                                                                                                                                                        |
| **2.10.3** | §3's "never compute the window here"; the cache key's shape (§2)                                                                                                                                                                 |
| **2.10.4** | §1's four shape rules; the union with a _partial_ member; §4's flag on its failed member. **Shipped 2026-09-10** — six members, `refused` outside the flag, and the amendment in §4                                              |
| **2.10.5** | §2's design — bounded LRU, read-to-paint-never-to-skip, no clock, **keyed on the request as sent** — and the heap figure it owes. Its own file was drafted with a resolved-window key and carries a dated amendment reversing it |
| **2.10.6** | Nothing decided here constrains the fixture backend; it serves the contract §3 sends                                                                                                                                             |
| **2.10.7** | §3's URL rule — the symbol is a **path segment**, so this task declares `/securities/:symbol`; the panel states the resolved range back                                                                                          |
| **2.10.8** | §2's stale-while-loading consequence, which is a product behaviour it designs                                                                                                                                                    |
| **2.10.9** | This file, into `CLAUDE.md`'s _Where the record lives_ table, and the ADR                                                                                                                                                        |

## 6. What this task did not decide, restated

So that no later task quietly takes one of these believing it was settled here:
the **charting** decision (Story 2.12), **search** and the per-security route's
URL **strings** (Story 2.11), the **window vocabulary** and its calendar words
(Story 2.13), and provenance as a product-wide requirement including a series
naming two feeds at once (Story 2.14).

Nothing above forced any of them. If a later task finds that it did, that is a
finding to record here rather than a licence to take it.
