# Task 2.6.4 — The provider interface, the request, and a call that cannot throw

**Status:** Complete (2026-09-07)
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

---

## What was built (2026-09-07)

Two files in `apps/backend/src/`, `market-data-provider.ts` and its tests. **No dependency,
no lockfile change, no new script, no new `verify` step, and nothing in `packages/shared` or
`apps/frontend` touched.** `pnpm verify` exit 0; `pnpm test` is **516** (198 + 155 + 163).

### The decisions this task took, beyond implementing the brief

**The result union ships THREE members and not one, and the line is principled rather than
convenient.** `PROVIDER.md` §8.1 settles eight outcomes; Task 2.6.5 owns the taxonomy. What
shipped here is `ok`, `timeout` and `aborted`, because **those two failures follow from this
task's own request shape** — they are the two ways the `deadlineMs` and the `signal` on
`BarsRequestOptions` end a call, and they are producible with no upstream and no
implementation in existence. A deadline with no outcome to express its expiry is a deadline
nobody can observe, so shipping the options without them would have left this file's own
types incoherent. The remaining five are facts about a _world_ this task does not describe.
Eight total, no member owned twice, and `TASK-05` is amended to say it adds five.

**That handover is a mechanism rather than a note, and it was made to fail.** The tests
switch exhaustively over `BarsResult` with `satisfies never` in the default branch; adding a
sixth member reports `TS2322: Type '{ readonly outcome: "rate-limited"; }' is not assignable
to type 'never'` plus `TS1360`. So Task 2.6.5's first symptom will be a red build in a file
it did not edit, which is correct.

**The request and the per-call options are two parameters**, which nothing upstream had
settled. `BarsRequest` is the _question_ — symbol, range, timeframe, adjustment — and is a
value worth logging and worth using as Story 2.8's cache key. `BarsRequestOptions` is the
deadline and the signal. The split is concrete rather than aesthetic: a signal folded into
the request makes every cache key unique and puts a live object graph into anything that logs
one.

**The deadline is `DEFAULT_BARS_DEADLINE_MS = 3_000`, per-request-overridable**, and the
arithmetic is written beside it rather than the number alone: the browser's budget is
`API_TIMEOUT_MS` at 5,000 ms end to end, a deployed round trip measured 250–768 ms (Task
1.12.7), so the backend's own budget is at most ~4,200 ms in the worst case and 3,000 leaves
~1.2 s of headroom. It matches `TOKEN_TIMEOUT_MS` one dependency over. **The fourth coupled
pair is named and stays prose, owned by Story 2.9** — and the reason is now visible in a test
rather than only asserted: restating 5,000 in `apps/backend` to assert against would be
asserting against a _copy_, which `e2e/support/poll-timings.ts` only gets away with because it
**measures** the running application.

**`id` is on the interface**, so a retry wrapper reports the id of the thing it wraps rather
than inventing one, and so Task 2.6.7's _"which provider is configured"_ can be asked of a
provider that has not been called.

### Criterion 5, made to fail in both directions

The `@ts-expect-error` on the request that omits `adjustment` was exercised both ways, and
**only the second direction is the lock**:

| Break                          | Result                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| Remove the directive           | `TS2741: Property 'adjustment' is missing … in 'BarsRequest'` |
| Make `adjustment` **optional** | `TS2578: Unused '@ts-expect-error' directive`                 |

Removing the directive only proves the field is required _today_; the unused-directive error
is what fails the build on the day somebody adds a default. Two further directives beside it
were made to fail the same way: a `{ start, end }` literal in place of a `TimeRange` is
`TS2741: Property '[brand]' is missing`, and `timeframe: "5m"` is `TS2322`.

**A green `pnpm test` does not prove any of this and `pnpm verify` does**, because it builds
before it tests — Task 2.6.2's finding met from the useful side.

### What it resisted

One method. A **multi-symbol fetch** is declined with the shape it will need recorded so it
arrives without a rewrite: a batch method returns a `BarsResult` _per symbol_, which reuses
every member of this union unchanged, so partial success across a hundred symbols never has
to move anything here. A **latest-price call** is declined to Epic 3 as a sibling interface.
No retry, no caching, both argued in the module's own comment as the brief required.

### The checks

- **Vendor grep** (`PROVIDER.md` §9.5's code-only form, and the naive text form as well):
  **zero** hits in both files, in both forms — they say _"the vendor"_ throughout, so
  criterion 1 holds even under the check that produces false positives elsewhere.
- **The frontend artefact did not move**, which is the check rather than a coincidence, since
  the interface lives where the browser cannot reach it: 369,437 B `4f17aff3…`, 17,317 B
  `eb223e53…`, `index.html` 1,101 B `898733b0…`, 300 B — **388,155 B over four files**,
  identical at every hash to Task 2.5.6's. `PROVIDER.md` §11's zero-bytes prediction for
  Tasks 2.6.2–2.6.6 holds for the third task running.

### Downstream files amended

`TASK-05` (it adds five members, not seven, and its first symptom is a red build elsewhere),
`TASK-06` (the concrete signature it implements, plus five consequences — the two-parameter
call, `toTimeRange` everywhere, `timeout` produced against `deadlineMs` rather than a wall
clock, `aborted` needing no corpus entry, and "no method left throwing" being one method),
`TASK-08` (criterion 5 has two directions and re-running one re-runs half the check), and
`PROVIDER.md` §13, which gains corrections 5, 6 and 7.

---

## For the stakeholders — what this actually did

**Nothing changed on screen, and that is the plan rather than a shortfall.** This is the
fourth of eight tasks in a story whose visible payoff is the seventh; five of the eight are
invisible and the story says so in as many words.

Here is what it is for, without the jargon.

MarketPulse buys its market data from an outside company. That company can put its prices up,
go out of business, get bought, change its rules, or simply turn out to be the wrong choice —
and at some point we will want a second one alongside it, or a different one instead.

**This task wrote down the contract between MarketPulse and "whoever is selling us prices",
before we have signed up with anybody.** It is one small file that says, in effect: _anyone
who wants to supply this product with price history has to answer exactly this question, in
exactly this form, and hand back exactly this kind of answer._ Nothing implements it yet.
That is deliberate and it is the whole point of doing it in this order — **a contract written
after the fact is just a description of whatever the first supplier happened to do**, which
is how a product ends up welded to a vendor without anyone ever deciding to.

Four things it settles that would otherwise cost real money or real trust later:

- **Swapping suppliers becomes a job rather than a rebuild.** The rest of the product — the
  charts, the anomaly detection, the AI investigations — talks to this contract and never to
  a supplier. Changing supplier means writing one new file that satisfies it.
- **Every request has to say whether it wants prices adjusted for stock splits, and there is
  no "just do the usual".** This sounds like a technical footnote and is the opposite. When a
  company splits its stock ten-for-one, the price divides by ten overnight and nothing has
  actually happened. Get this wrong and the product's headline feature — _"this is unusual"_
  — confidently reports a 90% crash that never occurred, permanently, on that company. We
  refused to give the setting a default value on purpose, because the wrong default is
  invisible in testing and wrong exactly once, on the one company and the one week somebody
  is actually looking. The computer now refuses to compile code that forgets to say.
- **"We couldn't get the data" is a proper answer rather than a crash.** A supplier being
  slow, refusing us, or not knowing a company are all things that will happen on ordinary
  days. They now come back as ordinary answers the product can show sensibly, instead of
  errors that blank a screen. Crucially, a _genuine bug in our own code_ is deliberately still
  allowed to crash loudly — because a bug quietly disguised as "the supplier is having a bad
  day" is a permanent fault nobody ever investigates.
- **"The market was closed" is a success, not a failure.** Written down explicitly, because
  it is the single easiest mistake to make here and it looks like an error screen on Christmas
  Day.

One more decision with a bill attached: **how long we wait.** Three seconds, chosen by
arithmetic rather than taste — the browser gives up after five, and a slow answer that arrives
after the person watching has stopped listening is money spent for nothing. It is adjustable
per request, because the overnight job that loads a hundred companies is not sitting in front
of an impatient human and can afford to be more patient.

**What this unlocks:** the next two tasks add the full list of things that can go wrong and a
built-in offline data source, which is what lets the whole team — and the charts in Story 2.12
— work with no supplier account and no internet connection at all. Then the connection to the
real supplier is written against a contract that already exists and has already been tested.

**What a user still cannot do:** see a price. There is no chart, no price history and no
supplier connected. That arrives across the next few stories, and the visible moment in _this_
story is task seven, which finally replaces the fake `DISCONNECTED` label that has been sitting
in the product's header since Story 1.5 with something true.
