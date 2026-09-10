# Task 2.10.4 — The `market` module, and the state a static list could not teach us

**Status:** Complete — 2026-09-10
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.3

## Objective

Give the frontend its first feature module under §26's boundaries, and define
what this application knows about a bar series as **types** — including the one
member Story 2.4's static list could not have taught anyone: **loaded and
partial, which is not failed.**

No React in this task beyond what a pure function needs. The collapse from the
client's seven transport outcomes onto a small named vocabulary is a function
with a reason per branch, testable without rendering anything, exactly as
`toBackendHealth` and `useSecurities`' collapse already are.

## What the user can see when this lands

**Nothing.** Types and one pure function. The payoff is Tasks 2.10.7 and 2.10.8
and then three UI stories.

## Work

- **Create the `market` module** under §26's `app/market/{data,models,state}`
  boundaries, adapted to this repository's actual layout rather than copied
  literally — `apps/frontend/src` today is flat, with `components/<Name>/` and
  `routes/`, and four hooks at the root. **Decide where a feature module sits in
  that tree and record it**, because Epics 3 to 11 add seven more and this is the
  precedent. The rule §26 states is the one that matters: a module exposes a
  domain-level API rather than its internals, so what leaves this module is a
  hook, a type and a handful of functions, and nothing imports its inside.

  Do not move the four existing hooks into it. `use-backend-health` and
  `use-market-clock` are chrome rather than market domain, and `use-securities`
  is a candidate but moving it is a change with no user in it — note the
  judgement and leave it, or move it deliberately and say why.

- **The series state is a discriminated union**, following `SecuritiesView`
  exactly, which is itself Story 1.12's `BackendStatus` lesson applied a second
  time: the impossible combinations cannot be constructed, so a component renders
  a state instead of inferring one. Acceptance criterion 2 is that a component
  **cannot render "loaded" without data**, and a union is what makes that a type
  error rather than a convention.

  The members this contract forces, each with the reason it exists rather than a
  name alone:

  - **loading** — nothing yet.
  - **loaded** — bars, and `coverage.covered` equal to what was requested.
  - **partial** — `coverage.covered` is narrower than `coverage.requested`. **A
    partial answer is a 200** (§6), it is an answer rather than an error, and this
    is the member the story names as the one shape Story 2.4 could not teach.
    Note it carries _two_ windows and a component needs both: what was asked for
    and what we hold. "We have data through 15:42" is only writable if the state
    kept the number.
  - **empty** — `bars: []` with provenance and `requested` present. Also a 200,
    also an answer (§6). Distinct from `partial` with zero bars only if that
    distinction is real — check the contract rather than assuming, and if it is
    not, say so and have one member.
  - **refused** — the request itself was not answerable: the 10,000-bar cap
    (§3, §4), or a window outside the calendar's 2024–2028 range. **Neither is a
    failure the user caused and neither is a server fault**, which is why they do
    not belong under the failure members. The cap's 400 names the number; a state
    that discards it makes the sentence "too much data" instead of "10,000 bars is
    the limit and you asked for 98,280".
  - **the failures**, carrying the `retryable` flag `FRONTEND-STATE.md` §4
    settled, and **exactly the two distinctions a reader can act on** — the one
    `SecuritiesView` already draws (did anything answer at all?) plus retryability.
    Not one per `API_ERROR_CODES` member: the union grows for the server's reasons
    and a page that mirrors it changes every time the API learns a new failure.

    > **Amended 2026-09-10 by Task 2.10.1 — where `refused` sits relative to the
    > flag, because the two were settled in different documents and could
    > otherwise produce two different unions.** §4's mapping table lists
    > `BAD_REQUEST` as not retryable, and both refusals above — the cap and the
    > calendar — arrive as `api-error` carrying exactly that code. **They are
    > still `refused`, not failures.** The flag is a property of the **failure**
    > members only, and `refused` is upstream of it: a refusal is a well-formed
    > answer about the request, so it needs its number on screen and needs no
    > statement about whether waiting helps. Waiting never helps, and saying so
    > would imply it might otherwise. So the collapse tests the code for a refusal
    > **before** it reaches the retryable branch, and §4's row for `BAD_REQUEST`
    > governs only a `BAD_REQUEST` this client did not recognise as a refusal.

    > **Amended 2026-09-10 by Task 2.10.2, which shipped the flag on the other
    > page.** Two things to copy rather than re-decide, both found by building it.
    >
    > **The failed member carries _two_ booleans, not one.** `retryable`, as §4
    > says — and `retrying`, because "what does the surface do while the retry is
    > in flight" is a separate question whose obvious answer is wrong. Returning
    > to `loading` takes the failure's own sentence off the screen while we find
    > out whether it is still true and puts it back a moment later, which reads as
    > the thing breaking twice. So the failure stays and the control says it is
    > working. It is not a member for the same reason `retryable` is not: a member
    > whose entire content is the member it replaces makes every consumer carry
    > both. Spell it the same way `SecuritiesView` does — two pages disagreeing
    > about this is the outcome §4 exists to prevent.
    >
    > **The action does not travel on the union.** `useSecurities` now returns
    > `{ view, retry }` and `UniverseTable` takes the union whole plus a
    > **required** `onRetry` callback beside it. A function hung off the failed
    > member would make the state un-comparable, un-serialisable and awkward to
    > construct in a story or a test — and the _keep the shape describable_ bullet
    > below is exactly the property that forbids it, because Epic 11 wants state a
    > `WorkspaceCommand` can act on and Epic 12 persists it. **State on the union,
    > actions beside it**, and required rather than optional for `ErrorFallback`'s
    > reason: offering recovery is the half of a failure state that is easy to
    > forget, and an optional callback is a failure state that silently loses its
    > way out.

  **`aborted` is not a member.** It is not a fact about the backend at all — it is
  a torn-down effect or a superseded request — and rendering one as a failure is
  the specific defect acceptance criterion 3 exists to prevent. It leaves the
  collapse without producing a state; Task 2.10.5 owns the mechanism.

- **Write the collapse as one function with a comment per branch.** Both existing
  precedents do, and both are readable a year later because of it. The value of
  the comment is the _reason_ two outcomes merge, not a restatement of which.

- **Decide how a state is handed to a component, and follow Task 2.4.4's finding
  rather than re-deriving it.** `UniverseTable` takes `view: SecuritiesView`
  **whole** while `BackendIndicator` takes four separate props, and both are
  right: a union exists so the impossible combinations cannot be built, and
  spreading it back into four props hands the renderer the eight-way boolean space
  it removed. A series is a union, so it travels whole.

- **Keep the shape describable.** Invariant 2 and Epic 11 want typed state a
  `WorkspaceCommand` can act on, and Epic 12 persists it. That is not a licence to
  build a command log now — it is a reason to prefer plain serialisable data over
  class instances, closures and `Map`s in the state, and to say so in the module
  header.

## Done when

- A `market` module exists, its position in the tree is recorded with the reason,
  and nothing outside it imports its internals
- The series state is a union whose `loaded` member cannot exist without bars —
  demonstrated by **producing** the compile error, not by describing it
- `partial` carries both windows, and `refused` carries the cap's number
- The collapse is a pure function with a per-branch reason, unit-tested against
  every transport outcome including `aborted`
- `aborted` produces no state, asserted by a test
- `pnpm verify` passes

---

## Amended 2026-09-10 by Task 2.10.3 — the coherence check is yours, and nothing else will do it

`isBarSeriesResponse` shipped in `packages/shared` and it checks **shape and
never coherence**: it does not know whether the bars ascend, whether the sources'
`barCount`s sum to the bars, or whether `covered` agrees with either.
`bar-series-response.ts`'s own header had predicted that the domain constructors
would live in the predicate, and building it produced the argument against —
which is about what the answer would _mean_ rather than about cost.
`api-client.ts` maps a predicate failure to `unreadable-body`, whose documented
meaning is _something that is not this API is answering at this address_. A body
shaped exactly like this contract and carrying mis-ordered bars is the opposite
diagnosis — **our own server with a bug** — and reporting it as a stranger at the
address sends the next reader to the wrong half of the system.

So the check is not lost, it is **relocated to this task**, and the obligation is
explicit rather than implied: wherever this module first turns a
`BarSeriesResponse` into domain objects, it goes through `toTimeRange`,
`toSeriesProvenance` and `toBarSeries` rather than casting or reading the payload
field by field. Those constructors throw, which is correct — every failure they
can produce is a bug in a server we wrote, not a market condition — so the
collapse decides which state a thrown coherence failure becomes, and that is a
_failed_ member rather than `refused` (nobody asked for anything wrong) and
rather than `unreadable-body`'s reading (this is our API, answering badly).

Two smaller things the same task settled that belong here:

- **The request type already exists.** `BarSeriesRequest` and `SeriesWindow` are
  in `apps/frontend/src/bar-series-query.ts`, and `barSeriesQuery()` renders one
  as the query string. The string it returns is deliberately order-stable so it
  can be the cache key `FRONTEND-STATE.md` §2 asks for — Task 2.10.5's cache
  should use it rather than inventing a second spelling of one request.
- **`empty` and `partial` are distinguishable on the wire, and the contract makes
  the distinction for you.** An empty series is `bars: []` with `covered: null`;
  a partial one has a `covered` window narrower than `requested`. There is no
  third reading, so the question this task's bullet leaves open — whether
  `partial` with zero bars is a real state — answers itself: it cannot occur,
  because a series with no bars covers nothing at all.

---

## What was done — 2026-09-10

Four files under a new directory, one guard added to `packages/shared`, and one
lint rule. No React, no component, nothing on screen.

| File                                             | What it is                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `apps/frontend/src/market/index.ts`              | The module's API, and the header recording where a module sits     |
| `apps/frontend/src/market/bar-series-payload.ts` | The wire body turned into domain objects, through the constructors |
| `apps/frontend/src/market/bar-series-view.ts`    | The six-member union and the collapse                              |
| two `*.test.ts` beside them                      | 21 tests: every transport outcome, every coherence refusal         |
| `packages/shared/src/bar-series.ts`              | One new guard — see _the hole nobody was checking_ below           |
| `eslint.config.mjs`                              | The module boundary, as a rule rather than a habit                 |

### Where a feature module sits, and what enforces its edge

§26 draws `app/market/{data,models,state}`. This tree has no `app/` — the
application **is** `apps/frontend/src` — so a feature module is **a directory
under `src/`, sibling to `components/` and `routes/`, named for its domain**.
That is the rule the seven modules Epics 3 to 11 add now inherit, and it is
written in the module's own header rather than here, because that is the file
the next person opens.

§26's three sub-namespaces were **not** created. They are a shape for a module
big enough to need them; this one is three files, and `data/`, `models/` and
`state/` holding one file each would be ceremony over 400 lines of code. They are
spelled as filenames instead, and a directory arrives when a namespace has more
than a couple of files in it.

**The edge is a lint rule.** `index.ts` is the API; nothing outside
`src/market/` may import anything else under it. A stated invariant that nothing
checks quietly stops being true, and this repository has watched that happen.

**And the rule's placement is itself a finding.** It went into the existing
browser-boundary block's `patterns` array rather than into a config object of its
own, because flat config resolves a rule to the **last** configuration that
matched — a second block setting `no-restricted-imports` for the same files
replaces the first rather than adding to it. Reproduced rather than reasoned
about: with the market pattern in its own block, `import path from "node:path"`
in a frontend source file lints **clean**, and the browser boundary — the only
thing standing where a compile error used to be — is gone with no diagnostic
anywhere. Restored, and both restrictions then fire on one file at once.

### The four existing hooks did not move, and neither did the request type

Recorded as a judgement rather than left as a silence. `use-backend-health.ts`
and `use-market-clock.ts` are chrome — a service's health and a wall clock are
facts about the deployment and the day, not about the market's data.
`use-securities.ts` genuinely is market domain and is a candidate; moving it
touches a route, a component, two test files and a story to relocate a file that
works, and it is **a change with no user in it**. It moves when something else
has to move anyway.

`bar-series-query.ts` stayed at the root for the same reason plus one more: Task
2.10.3 shipped it, `api-client.ts` imports it, and two documents reference it by
path. Its types are **re-exported** through `market/index.ts`, so a consumer gets
one import for _what we ask for_ and _what we know about the answer_ without the
file moving.

### The union: six members, three of them answers

`loading` · `loaded` · `partial` · `empty` · `refused` · `failed`.

**`loaded` cannot exist without bars, and the compile error was produced rather
than described.** `BarSeries.bars` may legitimately be empty, so a `loaded`
member carrying a plain `BarSeries` would make "loaded with nothing in it"
constructible. `PopulatedBarSeries` is an **intersection** that narrows `bars` to
a non-empty tuple and `covered` to a non-null range in place — not a second copy
of `BarSeries` that could drift from it. A scratch file assigning a plain
`BarSeries` to the `loaded` member gave:

```
src/scratch-loaded.ts(9,3): error TS2322: Type 'BarSeries' is not assignable to type 'PopulatedBarSeries'.
    Types of property 'bars' are incompatible.
      Type 'readonly Bar[]' is not assignable to type 'readonly [Bar, ...Bar[]]'.
        Source provides no match for required element at position 0 in target.
```

`covered` is narrowed **alongside** `bars` because `toBarSeries` has already made
the two one fact. It is a type predicate rather than a rebuilt object on purpose:
spreading a `BarSeries` into a new object to attach narrower types would be a
second way to obtain one, which is exactly what its brand exists to prevent.

**`partial` carries both windows**, in `series.coverage`, and both are needed:
_"you asked for five sessions"_ comes off `requested` and _"we have data through
15:42"_ comes off `covered.end`. It is the normal case rather than the
exceptional one — the store is backfilled nightly and the plan withholds the most
recent ~15 minutes — and it is a **200**.

**`empty` is a distinct member and the contract settles it**, exactly as Task
2.10.3 predicted: an empty series is `bars: []` with `covered: null`, a partial
one has a narrower `covered`, and a series with no bars covers nothing at all. So
_partial with zero bars_ cannot occur.

**The three answer members carry `securityStatus`.** §7 puts it on the envelope
because it is a fact about the security rather than about the bars, and a panel
that cannot say _we no longer track this security_ would be dropping the only
thing that field is for.

### The finding: every `BAD_REQUEST` on this endpoint is a refusal, and so is `NOT_FOUND`

The task's amendment says the collapse tests for a refusal **before** the
retryable branch, and that `FRONTEND-STATE.md` §4's `BAD_REQUEST` row governs
only a `BAD_REQUEST` this client did not recognise as a refusal. Reading the
server settles what that leaves:

- `parseSeriesRequest` produces **five** refusals — malformed symbol, malformed
  timeframe, malformed window, a window outside the calendar, and the
  10,000-bar cap — and all five are a `400 BAD_REQUEST`. The machine-readable
  `reason` is **logged and never sent**, so this client cannot subset them.
- It does not need to. All five are well-formed answers _about the request_,
  each carrying a sentence written for a person, and none is a fault anybody can
  wait out. So **there is no reachable `BAD_REQUEST` on this endpoint that is
  not a refusal**, and §4's row for it governs `/securities` and nothing here.
- `NOT_FOUND` — a symbol we do not track — is the same kind of thing: an answer
  about the request rather than about the market or the server. It is `refused`
  too, and a **reversal trigger** is recorded below.

`refused` therefore carries the server's `message` **verbatim** and nothing else.
Not a rewritten sentence: the numbers in it are the server's own arithmetic, and
a client that re-words _"that window is 98,280 bars and one response carries at
most 10,000"_ into _"too much data"_ is inventing prose about a calculation it
did not do. No `retryable` flag, because waiting never helps and saying so would
imply it might otherwise. No `requestId`, because the rule is that an id appears
only beside a failure the user is already being told about, and a refusal is not
a failure.

### The hole nobody was checking, and where it was closed

Found while writing three lines of the mapper, and it is the kind that is
invisible: **`new Date("nonsense")` is an `Invalid Date` rather than a throw, and
an invalid instant compares as neither before nor after anything.** So a bar
built from one passes `toBarSeries`' ascending check, and passes both of its
range checks too — `NaN < start` is false and `NaN >= end` is false — which makes
it a member of every window ever asked for and puts it on a chart as a point with
no position.

`toTimeRange` has always refused an invalid end. Nothing refused a **bar's**
instant.

The guard went into **`toBarSeries` in `packages/shared`**, not into the mapper
that found it, because the mapper is not the only call site:
`apps/backend/src/alpaca-mapping.ts` does `new Date(bar.t)` on a vendor field and
the bar it builds is **stored**. A check written where it was noticed would have
left the worse of the two paths open — the same argument `api-client.ts` makes
about predicates, arriving from the other direction. `bar-series.ts`' list of
what it checks gained a bullet with the date and the reason; both call sites now
pass bare `new Date(...)` calls in, deliberately.

### The coherence check landed, and its failure is a `failed` rather than an `unreadable-body`

Task 2.10.3's relocated obligation, discharged: nothing in this module reads a
payload field into a domain object by hand. `toDomainSeries` goes through
`toTicker`, `toTimeRange`, `toSeriesProvenance`, `mergeSeriesProvenance` and
`toBarSeries` — the same constructors the backend builds its answers with — so
the bars ascend, the sources' `barCount`s sum to the bars, `covered` is null
exactly when the series is empty, every bar starts inside `covered`, and
`covered` lies inside `requested`, all checked on the way in.

A throw from any of them becomes `failed` / `answered-badly`, **not retryable**.
Not `refused` — nobody asked for anything wrong — and not `unreadable-body`'s
reading, whose documented meaning is _something that is not this API is answering
at this address_ and which points the next reader at the wrong half of the
system. This is our own server with a bug.

The thrown sentence is **not** put on the state: it names checks, fields and
instants, which is developer detail and is exactly what `ErrorFallback` keeps a
boolean in order to make unshowable. It is written to the console instead, with
the `requestId`, because the alternative is swallowing the one sentence that says
_which_ check failed — and swallowing it is how that bug stays invisible. A test
asserts both halves: the state, and that the report happened and names the check.

### Verified

- `pnpm verify` passes — build, lint, format, stories, env, links, **1,187
  tests** (237 shared, 650 backend, 286 frontend, 14 process).
- The `loaded`-without-bars compile error was **produced** and is quoted above;
  the scratch file was then deleted.
- The lint boundary was checked by **both** directions on one file: a deep
  import into `market/` errors, and moving the rule into a block of its own
  silently disables the `node:*` restriction beside it. Both measured, the
  second reverted.
- `grep -rn "fetch(" apps/frontend/src` returns **one file**, `api-client.ts`,
  at one line. Story 2.10's acceptance criterion 1 still holds.
- `aborted` produces no state, asserted by identity (`toBe`) from two different
  previous states rather than by equality — nothing is constructed at all.
- One thing the tests could not tell me and `tsc` did: the fixtures were written
  with `securityStatus: "tracked"`, which is not a member of `SecurityStatus`
  (`active` | `untracked`). **Vitest passed all 14 anyway**, because a test run
  is not a typecheck. `pnpm verify` caught it in the build step. A small live
  instance of this repository's rule that a green test suite is evidence of
  less than it looks like.
- Not run: `pnpm e2e`. Nothing rendered changed — no route, no component, no
  stylesheet — and the browser suite asserts what is on screen.

### Reversal triggers

- **`refused` splits** at the first surface that offers an _action_ for an
  unknown security rather than a sentence — Story 2.11's search is the likely
  one. "Ask for a narrower window" and "search for the security you meant" are
  the same shape today and stop being so the moment the second has a control.
- **The two failure members split** at the first failure a reader of _this
  screen_ can act on differently. A coherence failure and a 500 are different
  bugs and the same instruction, which is why they share a member now.
- **The module grows directories** when a namespace inside it holds more than a
  couple of files.

---

## For the stakeholders — a status report in plain English

### Where the product is

MarketPulse today shows a list of 518 companies with a real last price and a real
change, drawn from roughly 48 million minute-by-minute price records we hold on
our own servers. It still cannot draw a chart. The distance between _"the prices
are on our server"_ and _"you can look at them"_ is a short run of small,
unglamorous, load-bearing pieces, and this was the fourth of them. Two more and
there is something on screen.

### What this task built

**A vocabulary for every way a price request can turn out** — and the first
proper home for the market side of the application.

Nothing visible. Stated plainly, as this project requires.

### The one idea worth understanding

When you ask a financial application for "the last five days of NVDA", there are
more possible outcomes than _it worked_ and _it broke_, and the interesting ones
are in between:

- **We have all of it.**
- **We have most of it.** We hold data up to 3:42pm and you asked for up to now.
  Our data supplier withholds the most recent quarter of an hour on the free
  plan, and our own overnight top-up runs once a day. This is the **normal**
  case, not a rare one.
- **We have none of it**, for that company over that period — and that is a
  correct answer, not a fault.
- **We won't answer that.** You asked for a year of minute-by-minute data, which
  is 98,280 individual records; we cap a single answer at 10,000 and we refuse
  rather than quietly sending less.
- **Something went wrong**, and there are two versions: nothing answered at all,
  or something answered badly.

Most applications collapse the middle three into either "loading forever" or a
red error box. Both are lies. A chart that shows four and a half days when you
asked for five, and says nothing about it, is the worse of the two — it looks
completely correct.

This task made those outcomes **named states in the code**, in a form where the
nonsensical combinations cannot be written down at all. A screen cannot claim to
have loaded data it does not have: that is now a build failure, and we produced
the failure to prove it rather than asserting it in a comment. And where we hold
part of a window, the application keeps **both** numbers — what you asked for and
what we have — because "we have data through 3:42pm" is a sentence you can only
write if somebody kept the 3:42.

### Three decisions worth explaining

**We show the server's own sentence when it refuses.** When the cap is hit, our
server replies with the actual arithmetic: _"that window is 98,280 bars and one
response carries at most 10,000."_ The application passes that through
unchanged. The temptation is to write friendlier prose in the interface — "too
much data" — and that is a downgrade: it takes a number the user can act on and
replaces it with a shrug.

**A refusal is not an error, and it does not get a "try again" button.** Asking
for too much data is a well-formed answer about your request. A retry button
under it would be a lie the user pays for twice — pressing it produces the same
refusal. Where waiting genuinely _does_ help, we say so and offer the button;
that distinction was built two tasks ago and this one spells it identically, so
two screens can never disagree about what the same failure means.

**We check our own server's arithmetic before we draw anything.** The response
now goes through the same validators the server used to build it: the timestamps
must ascend, the record of where each price came from must account for every
price, and the window we claim to cover must fit inside the window you asked
for. If any of that disagrees, we say the series could not be read rather than
charting it. This is deliberately distrustful of our own code, and it is cheap
insurance: a chart drawn from subtly wrong data looks exactly like a chart drawn
from right data.

### A bug caught on the way past

Writing the above turned up something that had been true since the price
storage was built and that nothing would have reported. A timestamp that cannot
be understood — a supplier sending something malformed — produces a special
"invalid" value that, when compared to any other date, answers _neither earlier
nor later_. Every one of our existing ordering checks therefore let it through:
it was, technically, inside every time window ever requested.

The fix went into the shared foundation rather than into the screen that found
it, because the same weakness sat on the path that **stores** prices from our
supplier — a bad timestamp there would have been written to the database rather
than merely shown once. It is one guard and one test, and it is the sort of
thing that is nearly free to fix now and expensive to find later, when the
symptom is a chart with a point in the wrong century.

### What this unlocks

The next task connects this vocabulary to the screen: fetching, cancelling a
request when the user navigates away, and keeping a price series in memory so
that flicking between two companies does not refetch. The one after that builds
the test harness. Then — two tasks later — a real price series appears on screen
for the first time, deliberately as a panel of stated facts rather than a chart,
so that when the chart arrives in Story 2.12 it is drawn on a foundation already
known to be correct.
