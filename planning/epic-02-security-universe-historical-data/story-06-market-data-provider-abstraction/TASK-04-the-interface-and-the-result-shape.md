# Task 2.6.4 — The provider interface, the request, and a call that cannot throw

**Status:** Not started
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Tasks 2.6.2, 2.6.3

## Objective

Write the interface every market-data provider is read through — the seam invariant 7
requires — plus the request shape and the result shape a caller branches on. No vendor code,
no implementation; Task 2.6.6 supplies the first one.

## What the user can see when this lands

**Nothing.** One interface file in `apps/backend`, per Task 2.6.1's split, and its types.

## Why the interface comes before the client and not after it

The story states it and it is worth keeping in front of whoever implements this: **an
interface extracted from a working client is a description of that client; an interface
written first is a constraint on it.** The test of whether this task succeeded is not whether
Story 2.7 can implement it — anything can be implemented — it is whether Story 2.7 finds
itself wanting to change it. Record any such pressure in Story 2.7 rather than silently
widening the interface.

## Work

### The methods, and resisting the obvious second one

One method is probably the whole interface at this point: **fetch bars for a symbol, over a
range, at a timeframe, with an adjustment mode.** Everything else this story could add has no
reader yet.

Two candidates will be tempting and both should be argued rather than assumed:

- **A multi-symbol fetch.** Story 2.8 backfills a hundred securities and will want one, and
  the vendor supports it. But its shape is genuinely different — partial success across
  symbols is a real outcome and a single-symbol result cannot express it — so adding it now,
  with no caller, means guessing that shape. Prefer naming it as Story 2.8's addition, and
  design the result shape so it can arrive without a rewrite.
- **A latest-price call.** Epic 3's, and it is a different mode rather than a different
  method — see Task 2.6.1's decision 6.

### The request is a type, and it is where criterion 5 lands

Symbol, range, timeframe, adjustment. The adjustment field is required with no default,
which is criterion 5, and the range is Task 2.6.2's type rather than two parameters.

The symbol should be the branded `Ticker` `packages/shared` already ships, not a `string` —
that type exists and Task 2.3.2 gave it its first real job; this is its second. Note what
that does **not** buy: a well-formed ticker for a security we do not track is still a
perfectly valid request, and answering it is the error taxonomy's problem in Task 2.6.5.

### A provider call does not throw, and the shape is `api-client.ts`'s

The story points at it directly and the precedent is exact.
`apps/frontend/src/api-client.ts` returns a **discriminated union of seven outcomes and never
rejects**, and Task 1.12.2 recorded why: a caller cannot forget a case the compiler makes it
handle, and a thrown error is a case the compiler cannot see. Task 1.12.3 then found the
second half of the payoff — because nothing throws, there is no `try`/`catch` in the polling
loop at all, and a failure state cannot accidentally reach an error boundary.

Both halves transfer. So:

- the result is a union with a discriminant, the success member carrying the series Task
  2.6.3 built
- **a bug is still allowed to throw**, and that distinction is the one to write down: a
  refused symbol is a result, a `TypeError` inside our own mapping code is a defect and must
  not be laundered into a tidy union member. Task 2.6.5 owns the line between them; this task
  owes the shape that makes the line expressible.

### The deadline, the cancellation signal, and the ordering nothing checks

`api-client.ts` composes `AbortSignal.timeout()` with the caller's own controller through
`AbortSignal.any()`, and reads **which signal fired off the signals** rather than off a
`DOMException` name — a string comparison against a value from another realm. The same
arrangement is right here and for the same reason.

**And this story creates the fourth coupled-constant pair in the repository.** The three
existing ones are recorded in `CLAUDE.md`: `API_TIMEOUT_MS` below `HEALTH_POLL_INTERVAL_MS`,
`TOKEN_TIMEOUT_MS` below `CONNECT_TIMEOUT_MS`, `DIAGNOSTIC_CACHE_TTL_MS` below
`POOL_IDLE_TIMEOUT_MS`. Whatever deadline this interface takes is coupled to something —
Story 2.8's per-request budget across a hundred symbols, at minimum. **Name the pair, and if
it is reachable from code, assert the ordering in a test**, which is this repository's own
rule that a test beats an eighth `verify` step when the thing being checked is reachable from
an assembled instance.

### There is deliberately no retry here

For `api-client.ts`'s stated reason: **retry is a property of the caller's policy, and a
retry buried in the transport makes the deadline a lie** — five seconds silently becomes
fifteen. Task 2.6.5 decides where the policy lives.

### And deliberately no caching

The story says it plainly: the provider fetches, it does not store. Story 2.8 owns the
record. A provider that quietly memoises is a provider whose behaviour differs between the
first call and the second, which is exactly what makes a fixture-backed test stop meaning
anything.

## Done when

- The interface exists in `apps/backend`, with the request and result types, and **no vendor
  name anywhere in it** — grepped, criterion 1
- The result is a discriminated union and the interface's declared return type cannot reject
- Adjustment is required at the call site
- The deadline's coupled pair is named, and asserted by a test if it is reachable from code
- The absence of retry and of caching is written in the interface's own comment with the
  argument, not left as an omission
- `pnpm verify` is exit 0

## Notes

Nothing implements this yet, which makes it the easiest task in the story to over-build. The
discipline is the same one Task 2.6.2 needs: every method, field and option should have a
named reader in a story that exists. "Epic 3 will want it" is an argument for designing so it
can be **added**, which is decision 6 in `PROVIDER.md`, not an argument for adding it.
