# Task 3.4.1 — The observation store, and the gate that would have stopped it

**Status:** Not started
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.3 (complete)

## Objective

Hold the prices. `useLiveFeed` keeps the newest observation's **instant** and
not the observations themselves; this adds §10.3's Map. **No component changes.**

## What the user can see when this lands

**Nothing.** A Map nothing renders. Task 3.4.2 puts it on screen.

## What is already decided and must not be re-taken

- **§10.3: one Map, latest observation only.** Not a history, not a buffer. A
  history is Story 3.9's and a chart series is Story 3.7's.
- **§11.1's omission semantics**: an entry for every security observed and **no
  entry at all** for the rest, so _present but empty_ is unspellable. That is
  already how `WireObservation` is typed — every field required — so the Map
  inherits it rather than restating it.
- **It is additive.** `advanceLiveFeed` in
  `apps/frontend/src/market/live-feed.ts` already receives the whole message;
  the reducer, its event union and the transport all carry it today. Nothing
  about the transport changes.
- **A malformed instant must not poison the Map**, for the reason it already
  must not poison `lastObservationAt`: `Date.parse` returns `NaN`, and one
  `NaN` through `Math.max` makes the feed permanently stale. The existing guard
  is the precedent.

## The trap — handed here by Task 3.3.4 and it is the whole reason this is its own task

**`sameLiveFeedView` will silently stop your prices moving.**

`use-live-feed.ts` sets state only when the derived view **differs**, because
Task 3.3.2's gateway re-sends the feed state every 120 s and a hook notifying on
every message would re-render the application thirty times an hour to redraw an
identical word. That gate compares **five named fields**.

**Add observations to the connection and forget the comparison, and the Map will
update while the screen never does** — a first moving price that does not move,
with every test green, because the reducer is right and the gate is upstream of
it.

**So the comparison is extended in the same change**, and the test asserts the
**negative**: _a new price causes a render._ A test that only checks the Map's
contents passes against the defect.

## Work

- **The Map**, on `LiveFeedConnection`, keyed by symbol, latest observation only.
- **On the view**, in whatever shape a renderer actually wants — a `Map` on a
  view object is fine and a copy per message is not; decide which and say why.
- **Extend `sameLiveFeedView`**, and prove the negative.
- **Decide what `unreadable` and a missing symbol mean to a reader of the Map**:
  absence is §11.1's answer and there is no second spelling of it.

## Done when

- The newest observation per symbol is held, and only the newest
- **A new price causes a render** — asserted, and it fails without the gate
  change
- A malformed instant cannot corrupt the Map
- No component consumes it yet
- `pnpm verify` passes
