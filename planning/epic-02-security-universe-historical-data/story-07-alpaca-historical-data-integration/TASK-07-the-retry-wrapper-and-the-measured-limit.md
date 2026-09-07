# Task 2.7.7 — The retry wrapper, bounded by the caller, with numbers taken from the measured limit

**Status:** Not started
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
