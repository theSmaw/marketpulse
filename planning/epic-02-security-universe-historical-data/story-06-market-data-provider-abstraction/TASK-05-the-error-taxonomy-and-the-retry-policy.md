# Task 2.6.5 — The error taxonomy, and where a retry policy is allowed to live

**Status:** Not started
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Task 2.6.4

## Objective

Turn "the call failed" into a closed set of causes a caller can branch on, in the shape
Story 1.7 established for `ApiError` — and decide where rate limiting and retry live, without
choosing the numbers, which Story 2.7 measures.

## What the user can see when this lands

**Nothing yet.** But this task decides how many different things the product can eventually
say when a price is missing, and Story 2.14's whole subject is that "we have nothing for this
symbol" and "the feed refused us" are different sentences rather than one error screen.

## Work

### The causes, from Task 2.6.1's list, and each one earns its place

**Amended 2026-09-07 by Task 2.6.1. The list is settled in `PROVIDER.md` §8.1 and it is
SEVEN causes rather than the five below — one struck, one renamed, two added. This task
implements that table; it does not re-derive it. Read §8 before writing a line, and overturn
a member only with a recorded reason.** The three changes, so the difference is visible
rather than buried in a cross-reference:

- ~~**bad range**~~ is **struck**, and `range-not-available` replaces it. The description
  below calls it "a defect at the call site", and Task 2.6.2's `TimeRange` constructor
  already makes that reading **unreachable** — a reversed or zero-width range is refused
  naming both ends, following `marketSessionsBetween`. What remains is a range the provider
  will not serve (before its history depth, in the future, too large), which is a fact about
  the world. A member whose name lies about whose fault it is gets handled wrongly.
- **`timeout` and `aborted` are added**, for `api-client.ts`'s reasons, which transfer whole
  (`PROVIDER.md` §8.4). `timeout` is the only outcome that is a joint fact about the vendor
  **and our own deadline**, so it admits a repair — raise the deadline — that "they are down"
  does not. `aborted` is not a fact about the world at all, and the obligation it carries is
  Task 1.12.3's: **never render an `aborted` as a market-data state.**
- **"No data for this range" is NOT an error** — settled, `PROVIDER.md` §8.2. It is a
  successful empty answer: `bars: []`, `coverage.covered: null`. This is the single most
  likely thing to be got wrong by whoever writes the first `if (bars.length === 0)`.

The original five, kept for the record, each separated from its neighbours by **a different
thing a caller does about it** — `API_ERROR_CODES`' own rule, where a member is added when a
failure can be produced and merged when nothing branches on the difference:

- **unknown symbol** — the request was well-formed and there is no such security. Story 2.14
  renders this as an answer, not a failure
- **rate-limited** — retryable, and the only member that plausibly carries a hint about when
- **unauthorised** — a configuration fault, never retryable, and the one Story 2.7's deploy
  will produce for real when a key is wrong
- **upstream unavailable** — the vendor is down or unreachable; retryable, unlike the above
- ~~**bad range**~~ — struck; see above

### The line between a result and a throw

Task 2.6.4 established that a provider call returns rather than rejects. This task draws the
line, and it should be written as a sentence somebody can apply:

**A cause is a member when it is a fact about the world; it is a thrown defect when it is a
fact about our code.** A rate limit is the world. A mapping function that received a shape it
did not expect is us — and laundering that into a tidy `upstream-unavailable` is how a bug
becomes a permanent, invisible degradation.

Note the trap Task 2.1.7 found in a neighbouring place, because it applies to whatever is
built here: a leak test can pass because `fast-json-stringify` strips an undeclared property,
so **a green test is not evidence that a handler could not leak** — the schema is what holds
it shut. Anything here that eventually reaches a response inherits that.

### What a cause may carry, and what it must never

Each member may carry what a caller can act on: which symbol, which range, a retry hint.

It must not carry the vendor's raw response body or its message, and the reason is Task
1.7.4's, measured rather than assumed: a 5xx that passes the upstream message through
answered a request with `connection to postgres at 10.0.0.4:5432 refused`. **A message
written for a developer is internal detail too**, and it is the half that looks harmless.
The cause is the wire; the detail goes to the log under the request's correlation id, which
is the arrangement `errors.ts` already ships and Task 2.1.7 already reused for
`/diagnostics/database`.

### Every cause must be producible, which is why this task precedes the fixture provider

Acceptance criterion 4 says each cause is **producible against the fixture provider** and
each is **distinguishable by the caller**. That is two claims and they are checked
differently — one is a test that makes it happen, the other is a compile-time property of the
union.

This task owes the taxonomy in a shape Task 2.6.6 can produce every member of. If any member
turns out to be unproducible even by a fixture, that member is a guess and should be struck
here rather than shipped and never exercised.

### The retry and rate-limit policy: shape only, no numbers

The story is explicit that the numbers are Story 2.7's, measured. What this task settles is
**where the policy lives and what it is allowed to do**, and there are three candidates with
real differences:

- **Inside each provider implementation.** Rejected on sight, probably: it makes the deadline
  a lie (Task 2.6.4), and it means every future provider re-implements it differently.
- **A wrapper implementing the same interface**, composed around a provider. Testable against
  the fixture provider with no network at all, replaceable, and it keeps the provider itself
  a thing that makes exactly one attempt. This is the shape to beat.
- **At the call site**, in Story 2.8's backfill. Right for _pacing_ a hundred symbols and
  wrong for retrying one request, and conflating the two is how a backfill ends up retrying a
  whole batch.

**Amended 2026-09-07: `PROVIDER.md` §8.8 recommends the WRAPPER with the arguments and the
two rejections already written out, plus the distinction that decides it — per-request retry
is the wrapper's, cross-request pacing across a hundred symbols is Story 2.8's backfill, and
conflating them is how a backfill retries a whole batch. The final call remains this task's;
confirm it or overturn it with a reason, and do not re-derive it from scratch.**

Whatever is chosen, write down the three constraints that make retry dangerous here rather
than leaving them to be rediscovered: **only retryable causes are retried** — a retry on
`unauthorised` is a loop against a wall; **a retry must not outlive the caller's deadline or
its abort signal**; and **a retry policy plus a rate limit is a queue**, which has a depth,
and an unbounded one is a memory leak wearing a politeness costume.

## Done when

- The taxonomy is a closed union in `apps/backend`, **all seven members from `PROVIDER.md`
  §8.1** and no others, with no vendor name — grepped
- The empty-range question's settled answer (`PROVIDER.md` §8.2 — a successful empty answer,
  never an error) is **implemented**, and is written where Story 2.12 will read it
- No member can carry an upstream message or body, and that is structural rather than a
  convention
- The retry policy's **home** is decided and written down, with the two rejected candidates
  and their arguments; no numbers
- `pnpm verify` is exit 0

## Notes

The failure mode to avoid is a single `ProviderError` with a `message`, which is what every
codebase has before somebody needs to render two of them differently. Story 2.14's whole
subject is that "we have nothing for this symbol" and "the feed refused us" are different
sentences; a string cannot be switched on.
