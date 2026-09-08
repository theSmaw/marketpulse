# Task 2.7.7 — The retry wrapper, bounded by the caller, with numbers taken from the measured limit

**Status:** Complete (2026-09-07)
**Story:** [2.7 Alpaca Historical Data Integration](STORY.md)
**Depends on:** Task 2.7.6

## Objective

Build the retry wrapper `PROVIDER.md` §8.8 settled and Task 2.6.5 confirmed, pick its numbers
from Task 2.7.1's measurements rather than from habit, and exercise it **at the real limit**
rather than assuming the product stays below one. That is acceptance criterion 4.

## What the user can see when this lands

**Nothing on screen.** What a developer sees is that a transient vendor failure stops being a
failed request: `pnpm bars` against a rate-limited key waits and succeeds rather than reporting
an error a person then has to interpret.

## The shape is already decided, and this task's job is not to re-decide it

Three documents say the same thing and the module comment above `MarketDataProvider` says it
where the next person will be reading: **retry lives in a wrapper implementing the same
interface, composed around a provider.** The two rejected homes and their costs are recorded
there. Confirm or overturn with a reason; do not re-derive.

What is genuinely open is the **numbers**, and they were left open deliberately — Task 2.6.5
built nothing because _"there is no provider to wrap, no measured distribution to pick a backoff
from, and a wrapper written now would be tested only against itself."_ Both of those are now
false, which is what makes this the right task.

## The three constraints, and the third is the one people skip

1. **Only retryable causes are retried**, and `isRetryableOutcome()` is the source. Not a
   `switch` written here — that is a second copy of the taxonomy, and a copy is how a ninth
   member ends up silently non-retryable. A retry on `unauthorised` is a loop against a wall; a
   retry on `unknown-symbol` asks a settled question again.

   **One thing to know rather than to act on (added 2026-09-07 by Task 2.7.6):** the recency
   `403` maps to `unauthorised` and is therefore **non-retryable**, which is correct while
   `alpacaServableEnd`'s clamp stands, because the status cannot arrive at all. If anyone ever
   removes or widens that clamp, this wrapper is where the consequence lands — a window problem
   reported as a permanent credential fault, never retried. The reversal trigger is written in a
   comment beside the branch in `alpaca-mapping.ts`; do not duplicate it here.

2. **A retry must not outlive the caller's deadline or its abort signal.** The wrapper receives
   both, is bounded by both, and **gets no budget of its own**. This is the same sentence as _"a
   retry buried in the transport makes the deadline a lie"_, applied to the one thing that is
   allowed to retry. A `rate-limited` hint is a **floor inside that bound**, never an extension
   of it — so a vendor asking for sixty seconds inside a three-second deadline means giving up,
   not waiting sixty seconds.
3. **A retry policy plus a rate limit is a queue, a queue has a depth, and an unbounded one is a
   memory leak wearing a politeness costume.** State the depth. State what happens when it is
   full. The honest answer for V1 may well be _there is no queue: a retry is a delay inside one
   call and concurrency is the caller's problem_ — which is a legitimate design and is
   **materially cheaper**, provided it is written down as a decision rather than arrived at by
   not thinking about it. If it is that, say what happens when Story 2.8 makes a hundred
   concurrent calls, because it will.

## The numbers, derived rather than chosen

Every one of these is an arithmetic consequence of something measured, and each should carry its
derivation in a comment so it can be re-derived rather than inherited:

- **Attempts.** Bounded by constraint 2 before it is bounded by a count: at a three-second
  deadline and a measured round trip, the count that fits is small. Pick the number that fits,
  not a round one. **AMENDED 2026-09-07 by Task 2.7.5, which measured the number: on a paginated
  fetch at the default deadline it is ZERO.** A 5-page walk took **2,170 ms — 72% of
  `DEFAULT_BARS_DEADLINE_MS`**, and that default was derived for a _single_ request against the
  browser's 5-second budget. So the honest statement is that **the attempt count is a function of
  how many pages the range spans**, which the wrapper cannot see: it wraps `getBars`, and a range
  is not a page count. A caller that wants retries on a multi-page range must pass its own
  `deadlineMs`, which Task 2.7.5 already hands forward to Story 2.8 — record it here as the
  wrapper's precondition rather than leaving it to be discovered as an unexplained `timeout`.
- **What an attempt COSTS, which is not one number, and both extremes are now measured (added
  2026-09-07 by Task 2.7.6).** This is the constraint most likely to be designed around wrongly,
  because the obvious mental model — _"an attempt costs a round trip"_ — is true of neither end:
  - **A refused connection fails in ~1 ms.** `upstream-unavailable` now covers transport
    failures, and a host that is not there answers instantly. So **the cheapest failure retries
    fastest**, which is exactly backwards: a backoff driven by an attempt _counter_ rather than
    by elapsed wall clock burns its whole budget against a dead host in milliseconds and then
    reports `upstream-unavailable` anyway, having achieved nothing but load.
  - **A hung host costs the WHOLE deadline.** Our own `AbortSignal.timeout` is what ends it, so
    the answer is `timeout` and **the attempt count is 1** — there is no retry, and there cannot
    be, because the first attempt consumed the budget.

  Those two bracket everything in between. The consequence: **drive the backoff from elapsed
  time against the caller's deadline, never from an attempt counter**, and state what happens
  when the remaining budget is smaller than the next delay — give up now, rather than sleeping
  past the deadline and reporting a `timeout` we manufactured ourselves.

- **Backoff.** Exponential with **jitter**, and the jitter is not decoration: Story 2.8 fires a
  hundred requests, they hit a rate limit together, and a jitter-free backoff retries them
  together — a thundering herd against the service that just asked for less traffic.
- **The floor from `retryAfterMs` — and MEASURED 2026-09-07, this vendor never sends one.** The
  `429` carries **no `Retry-After` header and no `x-ratelimit-*` headers at all**; the body is
  `{"message": "too many requests."}`. So the backoff must work with **no server-supplied delay**,
  and the hint path is real code that Alpaca will not exercise. Keep it — a vendor adding the
  header is silent, and `PROVIDER.md` §8.6 made the hint a branch and a floor for exactly this
  reason — but **test it against the fixture provider**, which Task 2.6.6 made able to produce
  `rate-limited` with a hint, because the live vendor cannot.

  **A second offline producer exists since 2026-09-07 and is worth knowing about before writing
  a third.** Task 2.7.6 built `parseRetryAfterMs` and drives a real `Retry-After` header through
  the shipped client using `alpaca-provider.test.ts`'s local HTTP harness, which can set
  arbitrary response headers. That is the only place the header's **parsing** is exercised end
  to end — the fixture provider produces the member with a hint already attached and so cannot
  test the parse. Use the fixture provider for this wrapper's _behaviour_, and note the parse as
  already covered rather than re-testing it. One trap it found and closed: **`Date.parse` reads
  `-5` and `2020` as dates**, so an unguarded header returns `0` — _"come back immediately"_ —
  against the service that just refused us.

- **What is _not_ here: cross-request pacing.** `PROVIDER.md` §8.8 draws this line and it is the
  one most likely to be crossed by accident. **Per-request retry is this wrapper's;
  cross-request pacing across a hundred symbols is Story 2.8's backfill.** Conflating them is
  how a backfill re-fetches ninety-nine symbols that answered perfectly because one was rate
  limited, which is the single most reliable way to make a rate limit worse.

## What a retry actually retries, now that `getBars` is a WALK (added 2026-09-07 by Task 2.7.5)

**This task was written when one `getBars` was one HTTP request. It is now up to five**, and
that changes what a retry costs without changing a line of this wrapper's design.

The wrapper composes around the **interface**, so a retry re-runs `getBars` — which means it
re-runs the walk **from page 1**, discarding N−1 pages that succeeded and re-spending N requests
against a 200-per-minute limit. On the measured 5-page month that is **five requests spent to
recover from a failure on the fifth**, and it is the same arithmetic as constraint 3's queue: a
hundred symbols retried once is not a hundred extra requests, it is a hundred times the page
count.

**Do not fix this by moving retry inside the walk.** That is a retry inside the transport, which
`PROVIDER.md` §8.8 rejects and which makes the caller's deadline a lie — the deadline is now
shared across pages _and_ attempts, so a per-page retry would multiply an already-shared budget.
What is wanted is the decision **stated**, with its arithmetic, and one of:

- **Accept it**, on the argument that a whole-walk retry is the only shape that can produce a
  coherent `BarSeries` at all — a resumed walk needs a resume point, and Task 2.7.5 rejected
  exposing one precisely because a clipped `covered` is indistinguishable from _"the vendor had
  nothing after this point"_. This is the cheap answer and is probably right for V1.
- **Bound retries by page count rather than by attempts**, so a wide range gets fewer attempts
  than a narrow one. Honest, and it needs the wrapper to know something about the range that the
  interface does not currently tell it.

Either way, **say what it means for Story 2.8**, which composes this around a hundred symbols and
is the caller most likely to discover the multiplication the hard way.

## Exercising it at the limit — criterion 4

The criterion's wording is precise: _"the client behaves correctly at the limit rather than
being assumed to stay below it."_ So drive the real limit, with a real key, and read what happens.

**What Task 2.7.1 measured (2026-09-07), and what it did NOT:**

- **The limit is ~200 requests**, then `429` — the documented 200/min confirmed almost exactly.
  **Three bursts of 320 concurrent have now been taken: 201 and 203 (Task 2.7.1), and 207 (Task
  2.7.6).** Quote the range rather than any single reading, and re-take it rather than citing
  this line: it is a live third party's number on a given day, not a figure reproducible from a
  clean clone.
- **It is per REQUEST, not per symbol.** 203 requests of 50 symbols each succeeded in one
  window, the same ceiling as 201 single-symbol requests. This matters to the wrapper because a
  retry costs the same as any request regardless of how many symbols it names.
- **It only binds under concurrency.** 260 _sequential_ requests never tripped it, because at
  ~280 ms each they took 73 s and spanned more than one window. A burst of 320 tripped it in
  1.5 s. So the window is short and rolls; **the wrapper's backoff only has to outlast a window,
  not a punishment period** — but confirm that, see below.
- **NOT measured: whether the limit is per key or per endpoint.** `ALPACA.md` §6 records this as
  open, and settling it needs a second endpoint driven inside the same window. **This task owns
  it**, because it is already driving the limit and the assets endpoint (Task 2.7.8's) is a
  second endpoint on the same key.

Two things worth recording that the criterion does not ask for and that Story 2.8 will need:
**how long the vendor stays angry** — whether one 429 means one request or a punished window —
and **whether the wrapper's own retries count against the limit**, which they do, and which is
why an aggressive policy makes a rate limit permanent rather than transient.

## Testing it, which happens offline

The whole argument for a wrapper over an in-provider retry is that **it is testable against the
fixture provider with no network at all.** Task 2.6.6 made every outcome producible from the
corpus, including `rate-limited`, `upstream-unavailable` and `timeout`, and that is what the
wrapper is composed around here.

Assert the behaviours rather than the implementation: a retryable outcome is retried and a
non-retryable one is returned untouched on the first attempt; the caller's signal aborts a
pending backoff **immediately** rather than after it elapses; the deadline bounds the total
elapsed time across attempts; and a `retryAfterMs` longer than the remaining budget produces the
failure rather than an overrun.

**And the wrapper is invisible downstream.** It reports the `id` and the `feed` of the provider
it wraps rather than inventing its own — `MarketDataProvider.id`'s own note says so — so
provenance on a retried series is identical to provenance on a first-attempt one. Assert that,
because it is the property that lets Story 2.8 compose freely.

Fake timers are the obvious tool and are worth resisting for the abort test specifically: the
thing being checked is that a pending wait is cancelled by a real signal, and a fake clock can
make that pass while the shipped code waits out the delay. Use a short real backoff there.

## Work

- `apps/backend/src/retry-provider.ts`, or whatever name reads better as _a provider that
  wraps a provider_ — one file, composing rather than subclassing
- The policy's numbers, each with its derivation
- The queue decision, or the explicit absence of one, written down with what it means for Story
  2.8
- Offline tests over the fixture provider, including the signal-cancels-a-pending-wait case
- The live run at the limit, recorded in `ALPACA.md` with its date
- Where it is composed: **the wrapper is applied in `createMarketDataProvider`**, so every
  consumer gets it and nothing chooses; note that this makes the fixture provider retryable too,
  which is harmless and is what keeps the two paths identical.

  **Its signature moved at Task 2.7.3** and is now
  `createMarketDataProvider(selection, credentials = {})`, where `credentials` is an object
  keyed by the provider that needs one (`MarketDataCredentials`) rather than a positional
  argument — deliberately, because the next provider needs a _different_ credential and a
  second positional parameter is how a call site passes the wrong one. Wrapping happens around
  the value each `case` returns, so the `alpaca` branch's credential check stays where it is

- Two deliberate breaks, each seen to fail and reverted: a retry that outlives the caller's
  deadline, and `unauthorised` made retryable

## Done when

- The wrapper is exercised at the real rate limit and behaves rather than being assumed to
- Every behaviour is asserted offline against the fixture provider — criterion 7 holds
- `isRetryableOutcome()` is the only classifier; a grep finds no second copy of the table
- The queue depth is stated, or its absence is
- `pnpm verify` is exit 0 with no network access

## Notes

The reason this is a whole task rather than fifteen lines inside the client is that all three
constraints above are violated by the _obvious_ implementation, and each violation is silent.
A retry loop with its own timeout makes every deadline in the system a suggestion. A retry that
classifies its own outcomes drifts from the taxonomy the moment a member is added. And an
unbounded retry against a rate limit is the classic way to turn a service's polite request into
an outage — ours, not theirs.

Story 2.8 composes this around a hundred symbols. Everything that is wrong here is multiplied by
a hundred there, which is the argument for measuring it against one.

---

# What shipped (2026-09-07)

Two new files — `apps/backend/src/retry-provider.ts` and its tests — plus three lines of
composition in `market-data.ts` and `fetch-bars.ts`. **No dependency and no lockfile change.**

## The shape was confirmed, not re-decided

`PROVIDER.md` §8.8's wrapper stands, unchanged and un-argued-with. `withRetry(provider)`
implements `MarketDataProvider`, delegates `id` and `feed`, and is applied inside
`createMarketDataProvider` around the value each `case` returns — so every consumer gets it,
nothing chooses, `none` stays absence and the `alpaca` branch's credential check does not move.
The fixture provider is wrapped too, deliberately: it is harmless (a corpus fault is permanent)
and it is what keeps the two paths identical.

`pnpm bars` was routed through it as well, because it is the one place a person sees the
effect — and it passes **its own 20-second deadline**, since `DEFAULT_BARS_DEADLINE_MS` was
derived for a single browser-budget request and Task 2.7.5 measured a five-page walk at 72% of
it. That is the wrapper's stated precondition being honoured by its first caller rather than
discovered later as an unexplained `timeout`.

## The three constraints

1. **`isRetryableOutcome()` is the only classifier** — one import, one call site, no `switch`
   in the file. Made to fail: `unauthorised` marked retryable takes **four** tests red across
   two files.
2. **Bounded by the caller's deadline and signal, with no budget of its own**, by two
   mechanisms rather than one — each attempt is delegated the **remaining** budget, and the
   wrapper **never sleeps past the deadline**, giving up with the real cause rather than
   manufacturing a `timeout`. Made to fail: passing the caller's original figure to every
   attempt takes **two** tests red, one of which watches an individual attempt behave
   perfectly while the whole call overruns.
3. **There is no queue, stated as a decision.** A retry is a delay inside one call; depth is
   the caller's own in-flight count. What that means for Story 2.8 is in the numbers below.

## The numbers, and one derivation the live run changed

There is deliberately **no `maxAttempts`**. A count is the wrong bound and would be reached
second anyway: Task 2.7.6 measured a refused connection at ~1 ms and a hung host at the whole
budget, so elapsed wall clock against the caller's deadline is the only rule correct for both.
The attempt counter chooses the _shape_ of the delay; it decides nothing about whether there is
another attempt.

**`RETRY_BASE_DELAY_MS` was going to be 250 and is 300, because the live run produced a second
measurement that agrees with the first.** ALPACA.md §6's round trip is ~280 ms; §6b's newly
measured refill token is ~310 ms. Two independent numbers landing together is a better
derivation than either alone.

`RETRY_MAX_DELAY_MS` is 2,000, derived from `DEFAULT_BARS_DEADLINE_MS` rather than chosen — a
delay larger than the whole default budget could never be slept. `MIN_ATTEMPT_BUDGET_MS` is 300
and is a _second_ constant on purpose: one is how long to wait, the other is how much room an
attempt needs, and they move for different reasons.

**Equal jitter rather than full jitter**, which is the more commonly cited form: full jitter
draws from `[0, scheduled]` and so can return approximately zero — straight back at the service
that just refused us.

**A consequence worth stating rather than discovering: `timeout` is retryable in the taxonomy
and unreachable through this wrapper**, because a hung attempt consumes the entire remaining
budget by definition. That is not a contradiction; `isRetryableOutcome` classifies a _cause_
and this wrapper is bounded by a _budget_. Slicing the caller's deadline into per-attempt
portions was rejected: it invents a second timeout the caller cannot see.

## Three live findings, and two of them change other tasks

Full tables in **ALPACA.md §6b**. Re-take them rather than citing; they are a live third
party's behaviour on one day.

**1. The limiter is a token bucket refilling at 3.23/s, not a punished 60-second window.** The
burst reproduced exactly (320 concurrent → **201 ok / 119 refused**, a fourth reading), and
then the very next request answered `200` with `x-ratelimit-remaining: 0`. Ten seconds of
continuous asking let **33 through — 3.23/s** against a bucket's predicted 3.33/s and a fixed
window's predicted zero. **So one `429` means one request refused, and a backoff only has to
outlast a token (~310 ms) rather than a window.** That is what makes this policy cheap enough
to apply to every call, and nothing here had established it.

**2. The open per-key-or-per-endpoint question is answered, and the answer is per _API_.**
Inside the same drained window: a second `data` path (`/v2/stocks/snapshots`) got **`429`**,
while the trading API's `/v2/assets/NVDA` got **`200` with `x-ratelimit-remaining: 199`**.
**Task 2.7.8's assets lookup therefore does not compete with bar fetching at all**, which
removes the strongest argument against adopting it. ALPACA.md §6 and §10 are amended.

**3. Criterion 4, the wrapper driven at the real limit — and retries are not free.**

| Burst of 320                |    `ok` | `rate-limited` | HTTP requests |   Wall |
| --------------------------- | ------: | -------------: | ------------: | -----: |
| bare provider (the control) |      91 |            229 |       **320** |  1.0 s |
| through the wrapper, 3 s    | **206** |            114 |       **606** |  3.0 s |
| through the wrapper, 20 s   | **263** |             57 |     **1,473** | 19.9 s |

It works — spare deadline becomes answers. **Retries count against the limit**, which the
request counts settle rather than argue. And **the return diminishes while the cost does not**:
the first 286 extra requests bought 115 extra answers (2.5 each), the next 867 bought 57
(15 each), and at the 20-second deadline the wrapper sustained **73 requests a second against a
3.23/s refill — 22× the limit** and still left 57 calls refused.

**That last row is the strongest argument in this repository for §8.8's line that pacing is
Story 2.8's.** A hundred concurrent retriers do not recover from a rate limit; they compete for
the same refill. What fixes it is asking less often, which no per-request wrapper can do — and
which Story 2.8 gets cheaply, because the limit is per _request_ rather than per symbol, so the
whole universe is one request per window.

## What a retry re-spends, and the decision taken

A retry re-runs `fetchBars`, which since Task 2.7.5 is up to five HTTP requests, **from page 1**.
**Accepted** — the cheap answer, and the only coherent one: a resumed walk needs a resume point,
and Task 2.7.5 rejected exposing one precisely because a clipped `covered` is indistinguishable
from _"the vendor had nothing after this point"_, so a resumable retry trades a wasted request
for a series that lies about its own coverage. The number Story 2.8 inherits: **a retried symbol
costs its page count again.**

## Verification

- **16 new tests, entirely offline** — the fixture provider for the real outcomes, plus a
  counting stub for the _recovers-on-a-later-attempt_ case, because a corpus fault cannot
  change its mind. No `simulateError` reaches the shipped interface.
- The abort test uses a **real** 2,000 ms delay and no fake clock, because a fake clock can make
  a cancelled-wait assertion pass while the shipped code waits the delay out. It aborts at 20 ms
  and asserts the call returns in under 500 ms.
- **Criterion 7 checked with a control rather than assumed**: the whole backend suite runs with
  every off-machine `fetch`, `net.connect`, `net.createConnection`, `tls.connect` and
  `dns.lookup` refused — **349 passed** — and a throwaway probe against `data.alpaca.markets`
  was refused in the same run, so the blocker was proved to block. Loopback is allowed, because
  _"no network"_ honestly means _"reaches no host but itself"_: `alpaca-provider.test.ts`'s
  local HTTP harness binds 127.0.0.1 by design.
- `pnpm verify` **exit 0 in 32.86 s**; `pnpm test` is **738** (206 + 349 + 183),
  `test:process` 14. `pnpm bars NVDA 1d` prints 30 real daily bars through the wrapper.
- The live harness was a throwaway outside the tree, deleted; `git status` is the five files
  this task touched and nothing else.

---

# For a non-technical reader — where the product is, and what this adds

**Nothing changed on screen, and that is expected for this task.** What changed is what happens
when the outside world has a bad moment.

MarketPulse gets its prices from Alpaca, a market-data company. Like every such service, Alpaca
puts a ceiling on how often we may ask — roughly 200 questions a minute — and if we go over it
simply refuses, politely, and tells us to come back later. Until today, one refusal meant one
failed request: whatever we were doing stopped, and a person had to work out why.

**This task built the thing that waits and asks again.** If a request fails for a reason that
might not be true a moment later — the service was briefly busy, or briefly unreachable — we
now pause and try once more, automatically. If it fails for a reason that will still be true in
a second — a wrong password, or a stock symbol that does not exist — we do **not** try again,
because asking a settled question twice is just noise.

Three judgement calls are worth explaining, because each is a place this kind of code usually
goes wrong.

**We never take longer than we were asked to.** Whoever calls us says how long they are prepared
to wait; every retry happens _inside_ that time rather than on top of it. This sounds obvious
and is the single most common bug in retry code: the natural way to write it quietly multiplies
everyone's patience by the number of attempts, so a page that promised to give up after five
seconds silently takes fifteen. We wrote that mistake on purpose to confirm our tests catch it,
and they do.

**When we run out of time, we report the real reason.** If we cannot fit another attempt in, we
say _"the service asked us to slow down"_ rather than _"it took too long"_ — because the first
tells you something you can act on and the second describes our own stopwatch.

**We deliberately did not build a queue.** The tempting next step is a central waiting room for
all requests. We measured what that would actually buy and decided it belongs to the next piece
of work — the one that downloads history for all ~100 companies — rather than here. That
decision came out of a real experiment rather than a preference, and the experiment produced the
most useful number of the day.

**What we learned by pointing this at the real Alpaca service.** We deliberately went over the
limit and watched what happened. Two things surprised us, both usefully.

First, **Alpaca does not sulk.** We had assumed that going over the limit locks you out for a
minute. It does not: the allowance refills continuously, at about three requests a second, so a
refusal costs you one request rather than a minute. That means our "wait and try again" pause
can be a third of a second rather than tens of seconds — which is the difference between a user
noticing a hesitation and a user noticing nothing at all.

Second, **retrying helps an individual request and does not help a crowd.** Firing 320 requests
at once, we got 91 answers without the new code and 263 with it — a big improvement. But getting
those extra answers cost four and a half times as many questions asked, and the last stretch was
especially poor value: the first batch of extra effort bought an answer for every two and a half
extra questions, the second bought one for every fifteen. The lesson is that patience helps a
single request and cannot fix an overloaded queue; what fixes that is asking less often, which
is a decision the _history downloader_ has to make. We have written that down for it, with the
numbers, so it starts from evidence rather than from instinct. Happily, the same experiment
showed that job can ask for all 100 companies in **one** request, so it has plenty of room.

We also settled an open question worth a small saving later: Alpaca's price service and its
company-information service have **separate** allowances. The next task needs the second one to
tell a real company from a typo, and it can now do that without stealing from the price budget.

**Where the product stands.** The deployed site shows the ~100 companies MarketPulse tracks,
read live from a real database, and honestly labels where its data comes from. Behind it, a real
connection to a real market-data vendor now fetches genuine historical prices — and as of today
it survives the vendor having an off moment. The next tasks tell a real ticker from a typo, and
then store the history we fetch. Once history is stored, the charts and the "is this move
unusual?" scoring that the product is built around have something to compute against — which is
the point at which a stakeholder stops being shown a list of companies and starts being shown
the market.
