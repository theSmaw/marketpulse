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

**Amended 2026-09-07 by Task 2.6.2: `TimeRange` shipped BRANDED, and that changes what
building a request looks like rather than only what it means.** A `{ start, end }` object
literal is not assignable to `TimeRange` — `toTimeRange(start, end)` is the only way to obtain
one, and it refuses a reversed, zero-width or invalid-`Date` range naming both ends. Two
consequences to expect immediately rather than discover: every construction site, **including
every test in this task and in Task 2.6.6**, calls `toTimeRange` rather than writing a
literal; and a range that arrived as JSON is not a `TimeRange` and has to be re-validated,
which is the correct behaviour and is what Story 2.9's route will have to do at its own
boundary. The brand is erased at runtime, so it costs nothing on the wire.

The symbol should be the branded `Ticker` `packages/shared` already ships, not a `string` —
that type exists and Task 2.3.2 gave it its first real job; this is its second. Note what
that does **not** buy: a well-formed ticker for a security we do not track is still a
perfectly valid request, and answering it is the error taxonomy's problem in Task 2.6.5.

**Amended 2026-09-07 by Task 2.6.3: `BarSeries` shipped BRANDED too, so the success
member's payload is not constructible by object literal.** `toBarSeries(input)` is the only
way to obtain one and it checks five things beyond the type — bars strictly ascending, the
sources' `barCount` summing to `bars.length`, `coverage.covered` null exactly when the series
is empty, every bar starting inside `covered` (half-open at the top), and `covered` lying
inside `requested`. The consequence for **this** task is narrow and worth knowing before
writing a test rather than after: every fake success result in this task's tests is built
through `toBarSeries` and `toSeriesProvenance`, exactly as every range is built through
`toTimeRange`. `BarSeriesInput` is exported for that purpose.

**And Task 2.6.3 proved a technique this task should reuse for criterion 5.** A compile-time
claim can be locked in as a test rather than left as prose: a `// @ts-expect-error` on the
call that omits `adjustment` errors today and fails the build with **`TS2578: Unused
'@ts-expect-error' directive`** the moment the field stops being required. That is stronger
than a comment and cheaper than a lint rule, and it is what Task 2.6.8's criterion 5 —
_"omitting it does not compile"_ — is re-run against.

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

**Amended 2026-09-07 by Task 2.6.1: the pair is named, and it is the first one here that is
NOT assertable in a test — so do not spend the task trying to build one.** Any deadline used
behind a Story 2.9 route must sit strictly below the frontend's `API_TIMEOUT_MS` (5 s) minus
a round trip, or the browser gives up first and the backend's patience is unobservable. The
two numbers are in `apps/frontend` and `apps/backend` with **no shared module between them**,
which is what makes this one prose where the other three are checks; moving `API_TIMEOUT_MS`
into `packages/shared` to make it checkable is a change to shipped code for a test's
convenience and is declined for Task 1.10.5's reason. The owner is **Story 2.9**.

The consequence for the shape this task builds: the backfill is **not** behind a route and
may legitimately want longer, so **the deadline is a per-request parameter with a default
rather than a single module constant.**

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
  name in a type, an identifier or a value** — grepped **over code rather than text**, per
  Task 2.6.2's finding and `PROVIDER.md` §9.5. Prose naming the vendor is expected and correct
  in these files, and is the reason the naive form of this check does not work
- The result is a discriminated union and the interface's declared return type cannot reject
- Adjustment is required at the call site, and the omission is locked in by a
  `@ts-expect-error` rather than described — Task 2.6.3's technique. Note the vocabulary
  itself already ships with no default and a test asserting the module exports no
  `/default/i` name; what is left here is the request field
- The deadline's coupled pair is named, and asserted by a test if it is reachable from code
- The absence of retry and of caching is written in the interface's own comment with the
  argument, not left as an omission
- `pnpm verify` is exit 0

## Notes

Nothing implements this yet, which makes it the easiest task in the story to over-build. The
discipline is the same one Task 2.6.2 needs: every method, field and option should have a
named reader in a story that exists. "Epic 3 will want it" is an argument for designing so it
can be **added**, which is decision 6 in `PROVIDER.md`, not an argument for adding it.
