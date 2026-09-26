# Task 4.2.3 — The join, and one home for the change arithmetic

**Status:** Not started
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
    the basis field `previousClose` appears in exactly one shipped module
    (**measured: zero occurrences outside `last-close.ts` today, and the one in
    `SecurityIdentity.tsx` is a comment that `withoutComments` removes**); and
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
