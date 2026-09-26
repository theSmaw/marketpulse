# Task 4.2.3 — The join, and one home for the change arithmetic

**Status:** **Complete — 2026-09-26.** The arithmetic has one home in `packages/shared` and the join is a pure function that reads no clock and holds no handle. **The guard written beside it passed green on the exact defect it exists for** — the population was keyed on the wire type this module holds rather than the type the next author holds — and the repair is keyed on the **readers of the closes** and on **the division itself**, which is the one thing a re-implementer cannot avoid writing. Four breaks, one of them in a second file.
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.1

## Objective

**The seam is not an aggregate. It is the join** — and naming it correctly is
what makes this story's two contradictory acceptance criteria both true.

The story calls the seam _"where an aggregate over the universe is computed"_,
and then says the proxies are _"the one aggregate that is not an aggregate"_.
Both are right, and together they hide what is actually missing. What nothing in
this backend can do today is **join a live observation to the previous session's
stored close**: `currentMarketState` holds only the live map, `readLastCloses`
holds only the stored closes, and only `GET /securities` reads the second.
Sector performance (4.3), breadth (4.4 — an advancer is the _sign_ of a change
from close), the movers (4.5 — ranked _by_ it) and Epic 5's scores all need
exactly that join. The four proxies are its smallest possible consumer.

**And the contradiction, resolved at Gate 1.** AC 2 requires `changeFromClose`;
AC 4 requires the computation to be backend-side; `changeFromClose` is a
frontend module. The owner chose: **move it to `packages/shared` and let the
backend call the one implementation.** AC 2 becomes _stronger_ rather than
weaker — one implementation, now called by two processes — and the move carries
across the guard that matters most, the same-session branch that otherwise
produces _"518 well-formed, correctly-formatted, correctly-coloured numbers
saying the market did not move."_

## What the user can see when this lands

**Nothing.** The join exists and is tested; nothing sends it anywhere. Task
4.2.4 puts it on the wire and 4.2.5 puts it on the screen.

## Work

- **Move `changeFromClose`, `changePercent` and `LiveChange`** from
  `apps/frontend/src/components/UniverseTable/last-close.ts` to
  `packages/shared/src/`. The move is mechanical — the module already imports
  only from `@marketpulse/shared` — and it is **owed anyway**: `last-close.ts`
  records its own precedent and condition (`price-format.ts` moved when a third
  consumer arrived) and **this story is the third consumer**. Today's two are
  `UniverseTable.tsx` and `SecurityIdentity.tsx`, which already imports it
  across a component boundary.
- **`apps/backend/src/market-overview.ts`** — a sibling of
  `current-market-state.ts`, not a method on it. Pure: it takes the current-state
  map, a closes lookup and an `asOf` instant as **arguments**, reads no clock,
  opens no socket and holds no repository handle.
- **The closes cache.** `readLastCloses` is a 518-row database read that changes
  **once a night**. It must not sit inside the socket callback — that callback is
  the one place an `await` holds up every browser's price and an unhandled
  rejection kills the process. Load at startup; refresh on a **condition** (the
  first burst whose market date differs from the cached one) rather than a
  schedule; and **never empty the cache on a failed refresh** — a stale-but-true
  denominator beats no figure.
- **The `asOf` seam, which is scope the owner added at Gate 1.** `readLastCloses`
  returns _the latest close we hold_, with no replay clock — under a replay of a
  past session that is future information, and this task creates the code path.
  Thread `asOf` and a `closesAsOf(session)` lookup **now**, with a production
  implementation that ignores the argument and returns the cached latest. The
  parameter existing is the point: Epic 13 changes one implementation rather
  than finding a call site with no way to ask the question. Name ADR 0015's
  gap 4 beside it so the author of that plugin finds this site.
- **Two invariants, each with its break in the same change.**
  - `one-home-for-the-live-change`, in the `the-consolidated-word-has-one-producer`
    family (a producer walk, not a call-site count — more callers is the desired
    state here). Two clauses, because the obvious one misses the real defect:
    ~~the basis field `previousClose` appears in exactly one shipped module
    (**measured: zero occurrences outside `last-close.ts` today**)~~ —
    **that measurement is FALSE and was corrected on 2026-09-26 before the
    check was written.** Re-taken on the real tree with comments stripped and
    tests excluded, `previousClose` was in **five** shipped modules:
    `market-bars.ts`, `routes/securities.ts`, `securities-response.ts`,
    `last-close.ts` and `fixture-corpus.ts`. A check written from the original
    premise would have been red the day it landed. The clause is therefore
    scoped to **member reads** (`.previousClose`) — which is the basis
    question, since declaring a field, schema-ing it and copying it are not
    deciding what to measure from — with each permitted site an **anchor** that
    fails if it stops reading. **The figure came from a shaping pass and was
    carried into this file without being re-taken, which is the citing-rather-
    than-measuring failure this repository names by hand.** And
    any shipped file referencing both a `SecurityLastClose` and a `Bar` also
    references `changeFromClose`. Clause two is what catches the re-implementation
    that reads only `close.close` and never mentions `previousClose`.
  - `one-producer-of-the-overview-aggregate` — the builder has exactly one call
    site in shipped backend code, **counted as call sites and not as files**:
    that is the recorded lesson from `one-subscriber-on-the-upstream-socket`,
    where counting files left a second subscriber in the same file green. Widen
    the test-file exclusion to admit `.process.` and `.database.`, or the check
    counts test call sites.
  - Breaks: `the-proxies-do-their-own-arithmetic` (inline the subtraction),
    `a-second-basis-is-read` (substitute `previousClose`), and
    `a-second-overview-aggregate` (a second builder call **in the file that
    already has one**, because that is the shape the real regression takes).

## Done when

1. Exactly one implementation of the change arithmetic exists in the workspace,
   in `packages/shared`, and both existing frontend callers import it unchanged
2. `market-overview.ts` is a pure function — its unit tests construct a map and
   a closes lookup and need no Fastify instance, no database and no clock
3. The builder takes `asOf` and a `closesAsOf` lookup, and the production
   implementation's disregard of the session argument is recorded, not hidden
4. A proxy with no observation, and a proxy with no stored close, each produce a
   distinguishable typed result — not a zero, not a null price
5. Three invariants' worth of breaks run red and restore the tree byte-identical

---

## What was done — 2026-09-26

### The move, and a third caller nobody had counted

`changeFromClose`, `changePercent` and `LiveChange` are now
`packages/shared/src/live-change.ts`. **The same-session branch moved
unedited** — diffed, and the only hunk is a doc comment; `changePercent` and
`LiveChange` diff to **zero bytes**. No test was lost: the old `it()` names are
byte-identical to the union of the two surviving files.

**There were three frontend callers, not two.** `SecuritySearch.tsx` imported
`changePercent` and is named in neither this task file nor the brief that drove
it. All three now import from `@marketpulse/shared` and **no call site changed
shape** — every diff line in the four frontend files is an import or a prose
amendment.

`commonSession` stayed behind: it answers _do 518 rows share a session so a
heading can state it once_, which is a fact about one view of one response
rather than arithmetic, and it has no backend consumer. Three live pointers
naming `last-close.ts` as the home of the arithmetic were corrected.

### The join

```ts
export function buildMarketOverview(
  inputs: MarketOverviewInputs,
): readonly MarketOverviewEntry[];

export interface MarketOverviewInputs {
  readonly symbols: readonly Ticker[];
  readonly observations: ReadonlyMap<Ticker, CurrentObservation>;
  readonly closesAsOf: (
    session: MarketDate,
  ) => ReadonlyMap<Ticker, SecurityLastClose>;
  readonly asOf: Date;
}
```

**`symbols` is a parameter rather than `INDEX_PROXIES`** — the join is the
seam and the proxies are one caller. **`closesAsOf` is synchronous**, because
an `async` lookup puts an `await` back on the socket callback, the one path
where an unhandled rejection kills the process.

**Purity verified by perturbation rather than by reading.** One runtime import;
`./current-market-state.js` is `import type` and erases. No `Date.now()`, no
zero-argument `new Date()`, no handle, no direct reach into
`currentMarketState`. `asOf` is converted exactly once, and **the test proving
it genuinely fails a UTC implementation** — substituting
`asOf.toISOString().slice(0,10)` makes `2026-09-15T00:30Z` ask for the wrong
session and the spec goes red.

**Three states, and the fourth combination is not a fourth member.** A live
price with no stored close is `live` carrying `{ percent: null, basis: null }`
— the price is still true and only the figure is absent. `unknown` is
nothing-observed-and-nothing-stored, which is CI's store for all 518. No
optional keys anywhere, so `exactOptionalPropertyTypes` is honoured by
construction, and no reachable path produces a `0` where the truth is
_no basis_.

### The guard passed green on the defect it exists for, for the second task running

**Reviewed by writing the defect rather than reading the check.** A
hand-written `sector-performance.ts` — the join over `currentMarketState.all()`
and `readLastCloses()`, subtracting inline with no same-session branch, which
is the shape **Story 4.3 will actually write** — reported `32 invariants hold.`

The cause: the population was keyed on `SecurityLastClose`, the **wire** type
this module holds, while the backend's own closes type is `LastClose`
(`market-bars.ts`), returned by `readLastCloses`, with the same shape and no
`session`. So the natural author is outside the population entirely — and
because they cannot call `changeFromClose` without converting first,
re-implementation is **more** likely rather than less.

**And `\bLastClose\b` alone would not have fixed it**, because the defect names
the type nowhere and there is no word boundary inside `readLastCloses`. The
population is therefore keyed on **the readers of the closes**
(`SecurityLastClose|LastClose|readLastCloses|closesAsOf`) against a live side,
with `market-bars.ts` exempted by **declaration shape** (`export interface
LastClose`) so the exemption moves if the type does.

**A third clause closes the hole greps structurally cannot**: a division whose
denominator is a close. TypeScript never requires anyone to write the type
names, but a re-implementer cannot avoid writing the division. Proven against a
version of the defect with **both types erased** — and it is the clause that
caught the orchestrator's independent re-test at the close, whose scratch file
imported neither type.

**The comment says what the pair still cannot see**, in those words: a join
whose closes arrive through a parameter of an inferred type from a helper in a
third file, naming no reader and dividing by no `close`. That file is invisible
here and always will be.

Three further holes, each reproduced and each fixed: a **re-export line
exempted an entire file** (now requires no statement body at all — no `=>`, no
`function`, no `return`); **trailing `//` comments** exempted a real
re-implementer (`withoutTrailingComments` promoted beside `withoutComments`,
URL-safe, with `withoutComments` left untouched because its asymmetry is right
for its other consumers); and an **arrow redefinition was invisible** to the
producer count, as was an aliased import — which is now **refused** rather than
counted, because a count that is silently wrong is worse than none.

### Gates

`pnpm verify` **exit 0** — **32 invariants hold**, shared 326 passed, backend
957 passed, frontend 1,145 passed, `test:process` 35 passed, no unhandled
errors in the log. `tsc -b` clean, run directly rather than trusted through
`verify`.

**Four breaks, all red and restored byte-identical** —
`the-proxies-do-their-own-arithmetic`, `a-second-basis-is-read`,
`a-second-overview-aggregate`, and **`a-second-join-in-a-second-file`**, added
because all three originals edit `market-overview.ts`, the file where the check
already worked.

**Not run, with reasons:** `pnpm test:database` — no migration, no query, no
change to `market-bars.ts` or `schema.ts`; the join reads a lookup handed to
it. `pnpm e2e` and `pnpm probe` — nothing renders.

### The lesson, which is now a pattern rather than an incident

**Two consecutive tasks shipped a guard that passed green on the exact defect
it forbids** — 4.2.1's brace matcher defeated by a destructured parameter, and
this one's population keyed on the wrong type. The common cause is writing the
check by looking at the tree just produced and asking _what is true of it_,
rather than at the defect and asking _what would slip past_.

**The cheapest form of the discipline is not "imagine the defect".** It is
**write the file the next story will write, run the check, keep the
transcript** — then fix, then confirm red, then delete. It cost four minutes
and caught what reading the check twice did not.

## For a stakeholder — a status report, 2026-09-26

### What this was

**The piece of plumbing every remaining part of this screen runs through.**
Until now nothing in our server could combine _what a share is trading at right
now_ with _what it closed at yesterday_ — the two live in different places and
only one page ever needed both. Sector performance, market breadth, the day's
biggest movers and next quarter's anomaly scores all need exactly that
combination, and four index funds are the smallest possible way to prove it
works.

We also moved the calculation that works out a percentage change so both halves
of the product share one copy. It had been sitting inside a table component,
already being borrowed by two other screens — and this was the third, which is
the point its own notes said it should move.

### What we found

**A third screen was already using it that nobody had counted**, including the
plan for this task. Harmless, and a reminder that the plan is a starting point.

### The part worth telling

**We added a safeguard to stop a future developer writing that calculation a
second time, and it did not work — for the second task running.**

A reviewer wrote out the mistake by hand, as the next piece of work would
naturally write it, and the safeguard reported everything fine. The reason is
worth understanding because it is not carelessness: the check had been written
by looking at the code we had just produced, rather than at the mistake someone
else would make. Our code holds one kind of record; the next developer will
reach for a different one with the same contents and a different name, and the
check was watching only for ours.

It is now checked three ways, the strongest of which watches for **the division
itself** — because whatever a developer calls things, they cannot write a
percentage change without dividing. We then deliberately broke it four times,
including in a second file, and watched it catch each one.

**We have written the lesson down rather than just fixing the instance**: write
the mistake first, watch the check fail to catch it, then build.

### Where this leaves the work

**Still nothing on screen, and one task to go before there is.** The
calculation and the join are done; next is the message that carries them to the
browser, and then four live index figures appear at the top of the landing
page.
