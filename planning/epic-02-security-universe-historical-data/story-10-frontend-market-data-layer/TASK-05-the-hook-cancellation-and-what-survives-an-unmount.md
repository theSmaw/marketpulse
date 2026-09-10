# Task 2.10.5 — The hook: cancellation, supersession, and the one thing the browser cannot cache

**Status:** Complete — 2026-09-10
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.4

## Objective

The reading half of the layer: one hook that turns a symbol and a window into
the state Task 2.10.4 defined, cancels correctly when either changes or the
component goes away, and keeps a **parsed, typed series in memory across an
unmount** — which is the only part of caching the browser's own HTTP cache
cannot do for us.

## What the user can see when this lands

**Nothing directly** — there is still nothing rendering a series until Task
2.10.7. What lands here is the behaviour a user eventually _feels_: whether
coming back to a security is instant or re-fetches, and whether navigating away
mid-request leaves an error sitting on the previous page.

## Work

- **Cancellation, on both causes, through the signal that already exists.**
  `api-client.ts` composes the caller's `AbortSignal` with its own five-second
  deadline rather than choosing between them, and returns `aborted` as an outcome
  distinct from `timeout` and `unreachable` precisely so a torn-down effect is
  not reported as a fact about the backend. Two things must abort: the effect
  tearing down (navigation, unmount) and the inputs changing under a request in
  flight.

  **Supersession is the half that is easy to get wrong and impossible to see.**
  A request for a window the user has already moved off must not land, even if it
  arrives first — and an out-of-order pair is the failure mode, not a slow one.
  Assert it with two overlapping requests resolved in reverse order, and check
  that the rendered state is the later _request's_, not the later _response's_.

  > **Amended 2026-09-10 by Task 2.10.2, which met this on a single request and
  > found the mechanism the obvious implementation misses.** **Aborting the
  > previous request is not sufficient, and the gap is not a race you can close
  > by aborting sooner.** A request that had already resolved when the abort
  > landed cannot be un-resolved, and `apiRequest` reports `aborted` only when
  > the fetch itself _rejects_ — so the loser's `ok` result reaches the caller
  > normally and overwrites the winner's. Aborting is still right; it is just not
  > the thing that makes this correct.
  >
  > What closes it is **identity**: one ref holds the controller whose answer this
  > hook will accept, starting a request takes that ref, and a result whose
  > controller no longer owns it is dropped. The teardown clears the ref as well
  > as aborting, which is what makes "no state update after an unmount" true for
  > the same already-resolved case. `use-securities.ts` carries the working
  > implementation and its comments — copy it rather than re-deriving it, and
  > note this hook has two supersession causes where that one has one.
  >
  > **And the test that catches it is not the one it looks like.** A stubbed
  > `fetch` that ignores the signal is exactly the shape of a real response that
  > resolved before the abort, so an out-of-order pair in jsdom exercises the
  > identity guard and _not_ the abort. Arrange the two answers so a stale
  > landing is visible — the loser must say something different from the winner,
  > or the assertion passes either way. Verified there by removing the guard and
  > watching it go red; do the same here.

- **The cache: what it holds, and what it is forbidden from holding.** Read
  `MARKET-DATA-API.md` §11 before writing a line of it. Every response carries a
  weak `ETag`, `fetch()` revalidates on its own, and a `304` costs no body — so
  what this cache buys is a round trip and a `JSON.parse`, measured at
  1,060,490 bytes → 0 already saved by the layer beneath it. **It must not have a
  lifetime of its own.** The five-minute ceiling is the ceiling on how long
  anything in this system serves an invalidated body, and a client TTL defeats it
  silently and invisibly.

  So the questions this task actually answers are: keyed on what; bounded how (a
  series is up to 10,000 bars and a user can visit 518 securities, so unbounded
  growth is a real leak on a long-lived tab); and evicted when.

  > **Amended 2026-09-10 by Task 2.10.1, and this reverses the key this task was
  > written with.** The paragraph above said to key on the **resolved** window
  > rather than the requested one, because `?sessions=5` means a different window
  > tomorrow. That was the right key for the cache this task assumed — one that
  > **serves without asking** — and `FRONTEND-STATE.md` §2 chose a different
  > mechanism, so the reason has gone: **every read of the cache is accompanied
  > by a request**, the entry only paints sooner while that request is in flight,
  > and freshness stays entirely with the browser and the server's five-minute
  > ceiling. A stale entry can therefore be on screen only for the duration of one
  > in-flight request.
  >
  > Under that mechanism the resolved key is not merely unnecessary, it is
  > **actively wrong in the common case**: a named window's first request cannot
  > look itself up under a resolved range it does not have yet, so `?sessions=5`
  > — the form decision 3 puts in the address bar — would never hit at all, and
  > the cache would buy nothing for the only window form a user normally has.
  >
  > **So: key on the request as sent** — `symbol | timeframe | window`, with the
  > window in the form the caller expressed it, which is the same key every HTTP
  > cache between here and the server is already using. **Record
  > `coverage.requested` on the entry** rather than in the key, because a
  > component needs the resolved range to state it (Task 2.10.4's `partial`
  > carries two windows) and the fresh answer replaces it within one request.
  > Eviction is by **count, never by clock** — a cache with no lifetime cannot
  > have a lifetime that disagrees with the server's.

  The mechanism is a hand-rolled bounded LRU `Map`, chosen in `FRONTEND-STATE.md`
  §2 on the failure-mode test rather than on size (a library was measured at
  +9.54 kB gzipped against +0.13 kB, and that was the tiebreaker rather than the
  argument). **The bundle figure does not need re-taking — nothing was
  installed.** What this task does owe is the figure §2 deferred to it and could
  not honestly take against a module that did not exist: **the parsed heap cost
  of a real series, and therefore whether 24 entries is the right bound.**

- **Do not send a window this client resolved.** Task 2.10.3's rule holds inside
  the hook: `sessions=N` goes out, `coverage.requested` comes back, and the
  resolved absolute range is what the cache keys on. That is also the one honest
  route to §11's five-minute reuse, if this hook chooses to re-ask with the
  absolute form once it knows one — a decision worth taking explicitly here or
  explicitly declining.

  > **Amended 2026-09-10 by Task 2.10.3 — the middle clause of that bullet is
  > dead and the key already exists as a string.** _"The resolved absolute range
  > is what the cache keys on"_ is the key the amendment above this one already
  > reversed; it survived in this sentence because the two were written a task
  > apart. **The key is the request as sent.** The first and last clauses stand
  > unchanged.
  >
  > What is new is that the key does not have to be invented: `barSeriesQuery()`
  > in `apps/frontend/src/bar-series-query.ts` renders a `BarSeriesRequest` as
  > the query string, and its **parameter order is fixed on purpose so that this
  > string can be the key**. Use it rather than composing a second spelling —
  > two spellings of one request are two misses and two round trips, and nothing
  > on screen looks wrong while it happens. `SeriesWindow` is the discriminated
  > union the request holds, so a named and an absolute window are different
  > strings because they are different requests, which is the same key every HTTP
  > cache between here and the server is already using.
  >
  > **And the last clause has a consequence to take with eyes open.** If this
  > hook does re-ask with the absolute form once `coverage.requested` has told it
  > one, that second request is a **different key holding the same bars** — the
  > cache pays for the same series twice, and the entry bound this task is
  > setting has to be read against that. Both forms are expressible
  > (`SeriesWindow` makes sure of it) and neither is preferred by the builder, so
  > this is genuinely a decision rather than a constraint. Note it is a decision
  > about a _request_, not about the address bar: `FRONTEND-STATE.md` §3 forbids
  > rewriting the URL's window form, and says nothing about what is asked for
  > behind it.

- **Refetch policy, stated rather than defaulted.** The story's own framing:
  a closed session's bars never change, so this is mostly a question of what to
  keep and when to re-ask at all. Contrast the two hooks that exist —
  `useBackendHealth` polls every 30 seconds because a health state changes, and
  `useSecurities` fetches once because the universe changes a handful of times a
  year. A bar series is a third thing: immutable once its session closes, and
  moving during one. **Do not build a poll for the live case.** Epic 3 owns
  streaming, and a poll added here is the wrong mechanism arriving early —
  but say what the hook does with an open session's tail, because the answer is
  the seam Epic 3 attaches to.

- **Be honest about React's constraints rather than fighting them.** Effects run
  twice under StrictMode in development, and an abort-on-teardown that is correct
  makes that harmless — which is a useful check rather than an annoyance. The
  React Compiler rules (17 of them, effectively all at error) **have never fired
  on shipped code**, and `CLAUDE.md` records that this is evidence nothing has
  written the shape they dislike rather than evidence the tree satisfies them.
  This hook is the second real test of that, per acceptance criterion 6; if a rule
  fires, that is a finding worth writing down rather than a nuisance to silence.

## Done when

- Changing symbol or window aborts the in-flight request, and a superseded
  response cannot reach the rendered state — asserted with an out-of-order pair
- An unmount aborts, and **no state update happens after it**
- `aborted` renders nothing and is never reported as a failure (acceptance
  criterion 3)
- Leaving a security and returning does not re-`JSON.parse` a series still held,
  demonstrated by a test that counts requests or parses rather than by inspection
- The cache has **no TTL of its own**, is bounded by count, and is keyed on the
  request as sent — with `coverage.requested` recorded on the entry rather than
  in the key (see the amendment above, which reverses this task's original key)
- The parsed heap cost of a real series is measured, and the entry bound is set
  from it rather than from the working number of 24
- The refetch policy is written down with its reversal trigger
- `pnpm verify` passes, including the React Compiler rules

---

## Amended 2026-09-10 by Task 2.10.4 — what the hook wraps, and the import it must use

The union and both transitions exist. This task adds an effect around them and
should add nothing else to them.

- **The two pure functions are `toBarSeriesView(previous, result)` and
  `toRetryingBarSeriesView(previous)`**, spelled exactly as `useSecurities`
  spells its pair, and the hook is a thin `useEffect` and a `useCallback` over
  them. `useSecurities` is the working example of the whole shape — supersession
  through one `AbortController` ref, the identity check that discards an answer
  from a request that had already resolved when the abort landed, and the
  teardown that clears the ref as well as aborting.
- **Return `{ view, retry }`, not a bare union.** The action does not travel on
  the state: a function hung off the `failed` member would make the union
  un-comparable, un-serialisable and awkward to construct in a story or a test,
  and Epic 11 wants state a `WorkspaceCommand` can act on. `SecuritiesSource` is
  the precedent.
- **Import through `market/index.js`.** `eslint.config.mjs` now forbids any file
  outside `src/market/` importing anything else under it — the module's API is
  its barrel. If the hook lives **inside** the module (it should), it imports its
  siblings directly and the rule does not apply, because the rule matches the
  import source string and a sibling is `./bar-series-view.js`.
- **The cache key is `barSeriesQuery(request)`**, which is already order-stable
  for exactly this reason, and `market/index.ts` re-exports it. Do not invent a
  second spelling of one request.
- **`toDomainSeries` throws, and the collapse already catches it.** The hook must
  not add a `try` of its own: `toBarSeriesView` owns the one place a coherence
  failure becomes a state, and a second catch would be a second answer to the
  same question. Note this for the cache too — **only a parsed series that
  reached a state is worth keeping**, so cache the domain object rather than the
  payload, and an incoherent answer caches nothing.

---

## What was done — 2026-09-10

Two files under `apps/frontend/src/market/`, two test files beside them, and two
lines added to the module's barrel. No component, no route, nothing on screen.

| File                                         | What it is                                                     |
| -------------------------------------------- | -------------------------------------------------------------- |
| `apps/frontend/src/market/use-bar-series.ts` | The hook: one request, cancelled and superseded correctly      |
| `apps/frontend/src/market/series-cache.ts`   | The parsed-series cache: two bounds, no clock, no lifetime     |
| two `*.test.ts` beside them                  | 22 tests — 11 on the loop, 11 on the cache                     |
| `apps/frontend/src/market/index.ts`          | `useBarSeries` and `BarSeriesSource` leave; the cache does not |

`pnpm verify` passes, including the React Compiler rules — see _what the
compiler said_ below, which is a finding rather than a green tick.

### The hook is an effect and nothing else

Task 2.10.4's instruction held. The union, both pure transitions, the coherence
check and the request's spelling were already there; this file adds the loop and
imports the rest. It is `useSecurities`' shape — one `useState`, one
`useEffect`, one `useCallback` over pure functions — with the differences
below.

**Three events end a request's claim on the state, not one.** The inputs
changing (symbol or window), the effect tearing down (navigation, unmount), and
a retry. All three go through the one mechanism `useSecurities` established: a
ref holding the controller of the request whose answer this hook will accept.
Starting a request aborts the previous one and takes that ref; an answer from a
request that no longer owns it is dropped; the teardown clears the ref as well
as aborting.

**And the identity guard is the half that matters, verified rather than
asserted.** Deleting the `current.current !== controller` line and re-running
turned the supersession test red, exactly as the task's amendment predicted:
aborting cannot un-resolve a request that had already resolved, so the loser's
`ok` result reaches the callback normally. The test is arranged so that a stale
landing is _visible_ — the two answers carry 1 bar and 9 bars respectively, so an
assertion that only checked `loaded` would have passed either way.

**The unmount test asserts the signal, not the state, and that is a correction
to the criterion rather than a shortcut.** React does not re-render an unmounted
component, so `result.current` cannot move after an unmount whether the guard
exists or not — a state assertion there is green against a hook with no guard at
all. What is observable is that the in-flight request's `AbortSignal` reports
`aborted`, and that an answer landing after the unmount is **not** written to the
cache, so a later mount starts from `loading` rather than from an answer no
component ever rendered. Both are asserted.

### The trap that is not in the task: a request object is a new object every render

A route builds `{ symbol, timeframe, window }` inline, so the hook receives a
different object identity on every render while describing the identical
request. An effect keyed on that object re-fetches forever — and on screen it
looks like a working hook.

The key settles it, and it did not have to be invented: `barSeriesQuery(request)`
is a total, order-stable spelling of a request, fixed in that order by Task
2.10.3 **so that it could be this key**. The hook holds the request in state and
adjusts it during render when the key changes — React's own documented
"adjusting state when a prop changes", which re-renders before committing rather
than painting once and correcting. There is a test for it: two `rerender()`s with
a fresh literal produce one request.

### The cache: what was measured, and the bound the measurement changed

`FRONTEND-STATE.md` §2 left this task two things to settle — the parsed heap cost
of a real series, and whether 24 entries is the right bound. Measured on the real
`toDomainSeries` over a payload built from 390 **real** recorded Alpaca minute
bars (`nvda-1min-regular-session.json`) tiled to length, 20 parsed copies held
live, `--expose-gc` either side, `heapUsed` divided by 20, three runs agreeing to
0.6 kB:

| Series                            | Wire (identity) | Parsed heap | Parse + construct |
| --------------------------------- | --------------- | ----------- | ----------------- |
| 1 session of minute bars (390)    | 44,561 B        | **97.8 kB** | 0.22–0.26 ms      |
| 5 sessions of minute bars (1,950) | 221,238 B       | **475 kB**  | 0.93–1.88 ms      |
| The 10,000-bar cap                | 1,132,936 B     | **2.43 MB** | 4.6–8.7 ms        |

**A series varies 25× in size, so a bound counted in entries bounds entries and
not memory.** 24 entries is 11.4 MB of held series at the default window and
**58 MB** at the cap — a figure a window control can reach, and exactly the shape
of thing that looks fine in testing and exhausts a tab in use. So the cache
carries **two** bounds: **50,000 bars** (~12 MB — five cap-sized series, 25
default ones, or 128 single sessions) and **32 entries**, the guard for the
degenerate case a bar budget cannot see, since an empty series is a correct
answer weighing zero bars. Both are counts, neither is a clock. `FRONTEND-STATE.md`
§2 has the same table as a dated amendment.

**§2's first reversal trigger has not fired.** A cap-sized series parses and
constructs in 4.6–8.7 ms against §28's 50 ms budget, so this stays a convenience
rather than becoming a Web Worker. The figure is V8 under Vitest rather than a
browser tab — the same engine, not the same allocator — so it is the right order
of magnitude rather than good to the kilobyte.

**What the cache holds is the three answers and nothing else.** `loading` is not
an answer; a `refused` re-asked gets the same refusal and would put a server's
sentence in a store that outlives the screen it was written for; a `failed`
painted before a new request has had its chance reports a fault that may already
be fixed. An incoherent body needs no rule of its own — `toBarSeriesView` turns
one into `failed`, so it is excluded by the same line.

**The LRU has one subtlety worth recording.** `read` deliberately does not
promote an entry, because the hook reads it _during a render_ in order to paint a
held series in the first commit rather than one paint later, and promoting would
be a mutation performed during a render. It costs nothing: every read is followed
by a request whose answer is written back, and the write promotes. Recency-on-write
is recency-on-read, without a side effect where React promises there are none.
For the same reason the cache write is its own `useEffect` rather than a line
inside the `setView` updater — an updater must be pure, and React calls it twice
under `StrictMode`.

### A criterion this task could not meet as written, and why that is correct

> _"Leaving a security and returning does not re-`JSON.parse` a series still
> held, demonstrated by a test that counts requests or parses."_

**Not expressible under the mechanism `FRONTEND-STATE.md` §2 chose, and the
criterion predates it.** §2's rule is that _every read of the cache is
accompanied by a request_ — the entry paints sooner while the fresh answer is in
flight and is never consulted to decide that no request is needed. That is what
keeps freshness entirely with the browser and the server's five-minute ceiling.
So returning to a security still costs a request and still parses its answer; a
test counting requests would be asserting the opposite of the design.

What the cache actually buys is the **first paint**, and that is what the test
asserts: after an unmount and a remount of the same request, the state of the
very first render is `loaded` with the held bars, and the request still goes out.
Both halves are the assertion — the second one is the one that would catch a
future edit turning this into a cache that answers on its own.

### The absolute-window re-ask: explicitly declined

The task asked for this to be taken or declined explicitly. **Declined**, with
the reasoning and a reversal trigger in the hook's header. Three reasons: it is a
guaranteed second request for bars already held, to buy a cheaper third that may
never happen; it is a different cache key holding the same series, so the bar
budget would bound half the history it appears to; and a named window's repeat
request is already revalidated into a `304` with an empty body, so five minutes
of `max-age` saves one round trip rather than a megabyte. Note it is a decision
about a **request** — `FRONTEND-STATE.md` §3's rule is about the address bar and
is untouched.

### The refetch policy, and the seam Epic 3 attaches to

**A request on mount, on a change of symbol or window, and on retry. No poll, no
refetch on focus.** `useBackendHealth` polls because a health state changing is
the whole information it carries; `useSecurities` asks once because the universe
changes a handful of times a year; a bar series is a third thing — immutable once
its session closes, moving during one.

**What this hook does with an open session's tail is nothing, and it says so.**
Such a window comes back `partial` carrying `covered.end` — _"we have data
through 15:42"_ — and stays that way until something asks again. The free plan
withholds the most recent ~15 minutes and the store is backfilled nightly, so a
poll would re-ask every 30 seconds for a tail that moves once a night. And
`covered.end` is exactly the seam Epic 3's socket resumes from. Two reversal
triggers are in the header, both conditions.

### What the compiler said

**Nothing**, and `CLAUDE.md`'s reading of that stands: the 17 React Compiler
rules have still never fired on shipped code, which is evidence that nothing has
yet written the shape they dislike rather than evidence the tree satisfies them.
This story was named as their second real test, and the two constructs most
likely to have provoked one — a `useRef` holding an `AbortController` that is
written from an async callback, and a `setState` called during render — both
passed silently. Recorded so the next reader knows it was looked at.

### Done-when, against what landed

| Criterion                                               | Where                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| Symbol or window change aborts; superseded cannot land  | Two tests; the guard verified by removal                             |
| Unmount aborts, nothing kept from it                    | Asserted on the signal and on the cache — see the correction above   |
| `aborted` renders nothing, never a failure              | `bar-series-view.ts`'s branch, exercised through both teardown paths |
| Returning does not re-parse a series still held         | **Amended** — the paint is what is asserted; see the section above   |
| No TTL, bounded by count, keyed on the request as sent  | `series-cache.ts`, and a test that an entry survives time passing    |
| Parsed heap measured; the bound set from it             | The table above; two bounds rather than 24 entries                   |
| The refetch policy written down with a reversal trigger | The hook's header, two triggers                                      |
| `pnpm verify` passes, React Compiler rules included     | Exit 0; 306 frontend tests                                           |

---

## For the stakeholders — a status report in plain English

### Where the product is

MarketPulse can show you 518 companies with a real last price and a real change,
drawn from roughly 48 million minute-by-minute price records sitting on our own
servers. It still cannot draw a chart. Between _"the prices are on our server"_
and _"you can look at them"_ is a short run of small, unglamorous, load-bearing
pieces, and this was the fifth of them. **Two more tasks and there is a real
price series on screen.**

### What this task built

The part of the application that actually goes and gets a price series — and,
more importantly, the part that knows **when to stop caring about an answer it
already asked for**.

Nothing visible. Stated plainly, as this project requires.

### Why "stop caring about an answer" is the whole job

Picture an analyst doing what analysts do: clicking NVDA, then AMD, then back to
NVDA, changing the window from five days to a month on the way. That is four
requests in about three seconds, over a network that does not deliver answers in
the order they were asked for.

The failure this creates is genuinely nasty because **it looks like success**.
The answer for NVDA arrives a moment after you have moved to AMD, and the screen
fills with NVDA's prices under AMD's name. No error, no warning, no red box —
just the wrong company's data, labelled convincingly. In a product whose entire
purpose is to be trusted about numbers, that is the worst class of bug there is.

So the rule this task implements is: **at any moment there is exactly one request
whose answer this screen will accept, and every other answer is thrown away**,
however correct it is. The obvious way to do this — cancel the old request — is
not enough on its own, and that is the finding worth reporting. A request that
had _already finished_ microseconds before you cancelled it cannot be un-finished;
its answer is still coming. So the code also checks, at the moment an answer
arrives, whether it is still the answer we are waiting for. We proved that check
works by deleting it and watching the test fail — because a safety net nobody has
tested is a claim, not a net.

The same mechanism handles you navigating away entirely. Leave a page mid-request
and nothing is left behind: no error message sitting on a screen you have left,
no half-finished work, no wasted data.

### The other half: not making you wait for something we already have

Go from NVDA to AMD and back to NVDA, and the second visit should feel instant.
It now does: the application keeps the prices it has already prepared and puts
them back on screen immediately.

Two decisions here are worth explaining because they are the difference between a
cache that helps and one that quietly lies.

**First, it never decides for itself that the data is fresh enough.** It shows
you what it has _while it asks the server anyway_. This matters: elsewhere in the
system we guarantee that nothing serves out-of-date prices for longer than five
minutes, and a memory that answered on its own authority would break that promise
invisibly — the one kind of bug you would never notice and could never trust us
about afterwards. So this memory has no expiry date, deliberately. It cannot
disagree with the guarantee because it never gets a vote.

**Second, we measured how much memory a price series actually occupies before
deciding how many to keep**, rather than picking a number that sounded sensible.
The plan said "keep about 24 of them". Measurement showed a series can be
anything from 98 kilobytes to 2.4 megabytes depending on how much history you
asked for — a 25-fold range. Keeping 24 of the large kind would be 58 megabytes
of a user's browser quietly consumed, which works fine in testing and degrades a
real user's machine after an afternoon's work. So the limit is now expressed in
the thing that actually costs money — the amount of price history held, capped at
about 12 megabytes — with a second, simpler limit as a backstop. A number that
was a guess is now a number with a measurement behind it.

We also confirmed the underlying work is fast: preparing the largest series we
will ever send takes under 9 milliseconds, comfortably inside the 50-millisecond
budget the product sets for keeping the interface responsive. If it had been
slower, this task would have had to move that work off the main thread; it did
not, and we wrote down why so nobody re-litigates it.

### What we chose not to build, and why that is progress

**We did not add automatic refreshing.** A price chart for a closed trading day
never changes, so re-asking on a timer would be pure waste. A chart of today's
trading does move — but the right way to follow a live market is a live
connection, which is the next epic's job, and a timer added now would be the
wrong machine arriving early and would have to be torn out. Instead, the state
this task produces carries the exact point our data reaches ("we have prices
through 15:42"), which is precisely where the live feed will pick up. The seam is
built; the thing that plugs into it comes later.

**We also declined an optimisation that looked free and was not.** There was a
way to make repeat requests cheaper by re-asking the server a slightly different
question. It would have cost an extra request every single time to save a cheaper
one that may never happen, and would have halved the useful capacity of the
memory described above. The reasoning is written down alongside the code,
including the specific condition under which we would change our minds.

### What you still cannot do

Everything you could not do yesterday. There are no charts, no live prices, no
per-company page. What exists now is the machinery that fetches a company's price
history correctly and quickly, with every way it can go wrong already named and
handled. The next task builds a stand-in server so the screens can be developed
and tested without touching the real market data; the one after that puts a real
price series in front of a person for the first time.

---

## Amended 2026-09-10 by Task 2.10.6 — the reset's wiring is done, and the file that had it is no longer the only one protected

This task recorded that `barSeriesCache.clear()` existed and that wiring it where
`cleanup` is called was still Task 2.10.6's. It is now done, and two things about
how differ from what was expected here.

**It is reached through the module's API, not off the instance.**
`src/test-setup.ts` sits outside `src/market/`, and the `no-restricted-imports`
boundary means it can import only `index.ts` — where the cache is deliberately
absent. So `clearBarSeriesCache()` is exported instead: it can forget and it
cannot read, which leaves _nothing outside this module can read a series without
asking for one_ exactly as true as it was. An ESLint exemption for one file was
rejected on the trap that config already documents — a second block for the same
files **replaces** the rule rather than adding to it, and would have taken the
browser boundary out with it.

**`market/use-bar-series.test.ts`'s own `beforeEach`/`afterEach` clears were
removed.** They protected that file and nothing else, and leaving them in would
have masked the substitution that proves the new line works.
`market/series-cache-isolation.test.ts` is that proof: two tests over one request,
2 passed with the line, **1 failed / 1 passed without it** — `expected 'loaded' to
be 'loading'` — and the failing one passes alone.
