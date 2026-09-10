# Task 2.10.1 — Settle the store, the cache and where selection lives, shipping no component

**Status:** Complete — 2026-09-10
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Story 2.9 (complete)

## Objective

Take this story's three open decisions — **a store or not**, **the server-cache
mechanism**, and **where the selected symbol and window live** — plus the fourth
the 2026-09-09 amendment handed this story (**what a retryable failure is on the
frontend**), with measurements rather than preferences, and write them down in one
document before a line of the layer is typed.

Task 2.9.1's precedent exactly: settle the shape, ship nothing. The thing this
task buys is that Tasks 2.10.3 to 2.10.8, and then three UI stories after them,
do not each answer the same question differently.

## What the user can see when this lands

**Nothing.** No hook, no module, no pixel. The payoff is Task 2.10.7, which puts
a real bar series on screen, and the three stories after it. Say so plainly when
reporting it — this repository's rule is that "nothing visible" is stated rather
than dressed up, and the story it pays off is named.

## Work

Produce **`FRONTEND-STATE.md`** in this directory — the subject document for this
story, added to `CLAUDE.md`'s _Where the record lives_ table by the close task
(2.10.9) — and settle each of the following in it, with the alternatives that
were weighed and a **reversal trigger that is a condition rather than a story
number**.

- **Open decision 1 — Redux now, or not yet.** State the honest position the
  story states: today's domain state is a selected symbol, a time window and some
  cached series, and a server cache plus URL state covers that with no store at
  all. Against that, §25 names Redux, Epic 11's generative workspace is much
  easier against an explicit typed state tree with a command log, and Epic 12
  persists workspace state.

  Three things must appear in the decision or it is a preference. **What is
  actually in the tree today** — enumerate it; there are four hooks
  (`use-backend-health`, `use-securities`, `use-market-feed`, `use-market-clock`)
  and no store, and three of them make requests. **What Epic 11 needs and when**
  — a `WorkspaceCommand` executed against typed state is invariant 2, and the
  question is whether that state has to exist now or whether this story only has
  to avoid making it expensive later. And **the bundle cost, measured** rather
  than assumed, the way Story 1.4 measured its component library: add the
  candidate, build, read `dist/`, remove it. A number that is not in the file is
  a number nobody took.

  Whatever is decided, the story's own hedge is binding: **the migration is cheap
  only if this story keeps state out of component internals either way.** So if
  the answer is "not yet", the file must say what shape keeps it cheap, and that
  shape is what Task 2.10.4 builds.

- **Open decision 2 — the server-cache mechanism.** A library, or a small
  hand-rolled cache. **Read `MARKET-DATA-API.md` §11 before weighing this**,
  because the server already answers half of it in a layer no JavaScript here can
  see: every response carries a weak `ETag`, `fetch()` revalidates on its own,
  and an unchanged answer comes back as a `304` with no body — measured at
  1,060,490 bytes → 0 for a month of minute bars.

  So the thing a client cache still has to justify is **a `304` round trip and a
  `JSON.parse`**, not a megabyte, and the file must say that explicitly so nobody
  later re-argues this in bytes that were already saved. What is genuinely left
  is **keeping a parsed, typed series in memory across a component unmount**.

  Two hard constraints on whatever is chosen. **No second TTL over these URLs** —
  the five-minute ceiling exists so nothing in this system serves an invalidated
  body for longer, and a client cache with a lifetime of its own defeats it
  silently. And note this repository's two opposing habits, both real: it built
  and threw away two schema libraries and an error-boundary library, and it kept
  `@fastify/cors` because the hand-rolled version fails invisibly. Say which of
  those this is and why.

- **Open decision 3 — where the selected symbol and window live.** The URL is the
  strongest candidate: deep-linking already works and was proved against the
  deployed host in Epic 1, a shared link to a chart is a real product feature, and
  Epic 11 wants the workspace describable. Decide the **shape** too, not only the
  home — Story 2.11 owns the per-security route's URL and Story 2.13 owns the
  window control, so what this task owes them is the rule (path segment for the
  subject, query for the view; or whatever is decided) rather than the strings.

  One thing this decision must handle rather than defer: **a named window and an
  absolute range are different URLs with different cache behaviour** (§11 again —
  `?sessions=5` is a stable URL naming a moving target and carries no lifetime,
  an absolute window inside closed sessions is reusable for five minutes with no
  request at all). If the URL is the home of window state, which form goes in it
  is a product decision about what a shared link means tomorrow, and it belongs
  here.

- **The fourth decision, handed to this story on 2026-09-09 by Task 2.9.6 — what
  a retryable failure is.** `/securities` and `GET /market-data/bars` now answer
  **503** when the database is unreachable, distinct from the 500 that means this
  server failed, and the two carry different instructions: _temporary, retry_
  against _this will fail again_. The frontend throws that away at the first hop
  and renders both as "unexpected response", which is false in the direction that
  matters.

  The story's amendment already fences the answer and the fence is binding.
  Branch on **`code`**, the closed union a client is meant to read, never on the
  status number. Do **not** put the raw code on screen — `requestId` remains the
  only internal identifier this product shows. Do **not** add a state per
  `API_ERROR_CODES` member, because that union grows for the server's reasons and
  a page mirroring it changes every time the API learns a new failure. What is
  open is only whether this is a third state, a `retryable` flag off the error,
  or different copy under the same state. Decide it, and note that the answer
  binds both the universe page and every series state after it.

## Done when

- `FRONTEND-STATE.md` exists and settles four decisions, each with its
  alternatives and a reversal trigger that is a condition
- The store decision carries a **measured** bundle figure for the candidate, taken
  in this repository rather than read off a package page
- The cache decision states, in one sentence a later reader cannot misread, what
  the browser's HTTP cache already does and therefore what a client cache is
  being asked to buy
- The URL decision says which window form a shared link carries
- Nothing is added to `apps/frontend/src` — verified by `git status`
- `pnpm verify` passes, which for a documentation task means `pnpm links` in
  particular

## Notes

The temptation here is to decide by architecture diagram. Resist it: three of the
four decisions have a cheap measurement available in this repository today, and a
decision with a number in it survives a disagreement six epics from now.

One boundary worth stating up front, because it is the likeliest scope leak: this
task does not choose a **charting** library, does not design the security route,
and does not settle Story 2.13's window vocabulary. It decides where state lives
and how it is fetched. If a decision here appears to force one of those, that is
a finding to record, not a licence to take it.

---

## What was done — 2026-09-10

**Output:** [`FRONTEND-STATE.md`](FRONTEND-STATE.md) in this directory, settling
four decisions with alternatives and a reversal trigger that is a condition.

| Decision              | Settled as                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| A store, or not yet   | **Not yet** — no state library; four shape rules that keep the migration cheap                     |
| The server cache      | **Hand-rolled**, bounded by count, no clock, read to paint sooner and never to skip                |
| Where selection lives | **The URL** — path for the subject, query for the view; a link carries the form the user expressed |
| A retryable failure   | **A `retryable` flag derived from `code`**, not a third state and not one state per code           |

**Measured in this repository on 2026-09-10** (add the candidate, wire a real
use of it into the render tree, `vite build`, read `dist/`, revert — baseline
rebuilt afterwards to the byte-identical chunk hash `index-B1wH5iln.js`):

| Candidate                          | gzip JS   | Δ vs the 122.26 kB baseline |
| ---------------------------------- | --------- | --------------------------- |
| `@reduxjs/toolkit` + `react-redux` | 130.69 kB | +8.43 kB (+6.9%)            |
| `@tanstack/react-query`            | 131.80 kB | +9.54 kB (+7.8%)            |
| RTK + RTK Query                    | 147.53 kB | +25.27 kB (+20.7%)          |
| A hand-rolled bounded `Map` cache  | 122.39 kB | +0.13 kB (+0.1%)            |

Two findings worth carrying: **Redux itself is the cheap half** — the bundle is
not an argument against it, and the expensive thing is the fetching layer
usually bolted to it. And `isApiError` declines a `code` it has not been taught,
so a future retryable code arrives as `http-error` and reads as
**not** retryable until `packages/shared` learns it — a version skew that
degrades in the safe direction, recorded in §4 because nothing checks it.

**Nothing was added to `apps/frontend/src`** — `git status` clean apart from the
documentation. `pnpm verify` passes.

---

## For the stakeholders — a status report in plain English

### Where the product is

MarketPulse can already show you the market's tracked universe — 518 companies,
each with a real last price and a real change — backed by about 48 million real
minute-by-minute price records and a working, cached, provenance-labelled API
that serves them. What it cannot do yet is **draw a chart**. Everything between
"the data exists on the server" and "you can look at it" is the piece of work
we have just started, and this task was its first step.

### What this task actually was

**We wrote no code at all, on purpose.** This task was four decisions, written
down once, before anyone types the layer that depends on them.

The reason is boring and expensive to ignore. Four separate pieces of screen are
coming — a search box, a price chart, a volume chart, and later an AI-driven
workspace — and every one of them needs to answer the same questions: where does
"which company am I looking at" live? What happens when you switch back to a
company you were just looking at — does it reappear instantly or reload? What
does the screen say when something goes wrong? If four different pieces of work
answer those four ways, you get an application that behaves differently
depending which corner of it you are in, and the cost of unifying it later is
several times the cost of deciding it now. So we decided it now, with
measurements rather than opinions, in one document.

### The four decisions, and why

**1. We are not adding a state-management library yet.** This is the one that
looks like a technical detail and is really a schedule decision. The industry
default is to install Redux on day one; our own product specification even
names it. We measured what it costs — about 8 kB on every page load for Redux
itself, or 25 kB for Redux plus the data-fetching add-on that usually comes with
it — and then looked at what we would actually put in it. Today the honest
answer is: one selected company, one time window, and some cached prices. That
is not a state-management problem yet.

So we deferred it, but we did **not** defer it by hoping. The document specifies
four concrete rules about how the code must be arranged so that adding Redux
later is a rewiring job rather than a rewrite — chiefly that this state lives in
one place with a clear boundary, and never gets scattered inside individual
screen components, which is what actually makes these migrations expensive. When
the AI workspace arrives in a later phase and needs undo, redo and a record of
every change the AI made, we will add the library and the work will be
contained. We also wrote down the three specific conditions that will trigger
that, so it is a decision with a trip-wire rather than a decision we have to
remember to revisit.

**2. We are hand-rolling the price cache rather than buying one.** This is the
decision the previous piece of work quietly made easy. The server already tells
your browser, in a language browsers have spoken for twenty years, "here is a
fingerprint of this answer — next time, ask me if it changed and I'll usually
say no in an empty reply." That was measured at a full megabyte of price data
reduced to nothing on a repeat view. So the expensive part of caching is already
done, for free, in a layer we did not have to write and cannot see.

What is left is small: keeping prices already downloaded and decoded sitting in
memory so that flipping back to a company you just viewed paints instantly. A
35-line piece of code does that, and a library to do it would add about 9 kB and
its own opinions. We took the small code — but only after applying this
project's own rule for library-versus-hand-rolled, which is not about size, it
is: _if we build this wrong, is it obvious or invisible?_ Here it is obvious. A
cache that misses when it should hit shows up as an extra network request and
nothing else; the screen stays correct.

There is exactly one way a cache like this can fail invisibly — showing you a
price that has since been corrected — and we designed that out rather than
promising to avoid it. Our cache never decides that a request is unnecessary. It
only lets the screen paint sooner while the real request is in flight. Freshness
stays entirely the server's decision, which is where the existing five-minute
guarantee lives.

**3. What you are looking at lives in the web address.** Pick a company, pick a
time window, and the address bar changes to match — so the link is shareable,
the back button works, and "send me that chart" is a real feature rather than a
description of one.

The genuinely interesting product decision inside this is what a shared link
_means tomorrow_. If you were looking at "the last 5 trading sessions" and you
send that link to a colleague who opens it next week, should they see the same
five days you saw, or the most recent five days? We decided: **the link carries
what you actually asked for.** If you asked for "the last 5 sessions", the link
means the last 5 sessions, always. If you deliberately selected a specific date
range, the link means that exact range, forever. The tempting alternative — the
application quietly converting "last 5 sessions" into the specific dates at the
moment you copy the link — is wrong in a way nobody would ever notice: the link
still works, still looks correct, and shows the wrong week.

**4. When something breaks, the screen will say whether waiting will help.** Our
server already distinguishes between "the database is momentarily unreachable,
try again" and "this request failed and will fail again". Until today the
interface threw that distinction away and told users "unexpected response" in
both cases — which is not just unhelpful, it is wrong in the worse direction,
because it tells someone nothing will help when in fact waiting for a few
seconds would have.

We decided how to fix it without over-engineering it: the failure state carries
a simple yes/no "is this worth retrying", derived from the server's own
vocabulary. A retryable failure gets a retry button and a sentence saying waiting
may help; a permanent one gets neither, because a retry button on something that
will fail again is a lie the user pays for twice. We deliberately did _not_
create a separate screen state for every kind of error the server can report —
that list grows for the server's reasons, and an interface that mirrors it is an
interface that changes every time the back end learns a new failure.

### Why this matters to the thing you can see

Nothing on screen changed today, and that is stated plainly rather than dressed
up — this project's own rule. But the next task in the queue is **visible and
lands early on purpose**: it applies decision 4 to the securities page that
already exists, so the first user-facing improvement from this work is a failure
message that tells the truth and a button that helps.

After that, four short pieces of plumbing, and then the payoff: a real price
series for a real company on screen, fetched through this layer, with the window
you asked for, the window we actually hold, the bar count, the prices, and an
honest label saying which market feed it came from. That deliberately draws no
chart — the charting decision is its own piece of work, and it should be made
against a data layer already known to be correct rather than debugging both at
once. Then the search box, then the price chart, then the volume chart. Those
three are where this product stops being a list of companies and starts being
something you would show someone.
