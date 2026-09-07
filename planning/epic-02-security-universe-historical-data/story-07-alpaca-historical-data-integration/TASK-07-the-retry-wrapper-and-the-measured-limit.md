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
  not a round one.
- **Backoff.** Exponential with **jitter**, and the jitter is not decoration: Story 2.8 fires a
  hundred requests, they hit a rate limit together, and a jitter-free backoff retries them
  together — a thundering herd against the service that just asked for less traffic.
- **The floor from `retryAfterMs`.** Whichever is longer, the backoff or the hint, bounded by
  the deadline.
- **What is _not_ here: cross-request pacing.** `PROVIDER.md` §8.8 draws this line and it is the
  one most likely to be crossed by accident. **Per-request retry is this wrapper's;
  cross-request pacing across a hundred symbols is Story 2.8's backfill.** Conflating them is
  how a backfill re-fetches ninety-nine symbols that answered perfectly because one was rate
  limited, which is the single most reliable way to make a rate limit worse.

## Exercising it at the limit — criterion 4

The criterion's wording is precise: _"the client behaves correctly at the limit rather than
being assumed to stay below it."_ So drive the real limit, with a real key, and read what
happens. Task 2.7.1 measured where it is, whether the window is fixed or sliding and whether it
is per key or per endpoint; this task's job is the behaviour at it.

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
  which is harmless and is what keeps the two paths identical
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
