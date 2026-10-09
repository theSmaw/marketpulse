# Task 4.8.2 — Renders per batch, on all five routes

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1

## Objective

**Every inherited figure in this story is a cost per render, and nobody has
counted renders.** This task counts them — a **count, not a timing**, so it is
the one arm the machine's load cannot corrupt.

## What the user can see when this lands

**Nothing.** It corrects a sentence three live documents carry.

## Work

### The claim this task exists to correct, and it is wrong twice

Three live sites say _"a security page subscribed to one symbol went from about
one whole-tree render a minute to up to sixteen"_ — `docs/GAPS.md`,
`epic-04-market-overview/EPIC.md` and this story's own text. **Both halves are
false.**

- **`/securities/:symbol` subscribes to all 518**, not one.
  `SecurityExplorer`'s `liveSymbols` adds every security in the loaded
  universe, because `UniverseTable` renders on that route too. So it already
  received a `bars` frame per applied batch **before** Story 4.2 — it went
  **~16 → up to ~32**, one extra render per batch rather than fifteen new ones.
- **"One a minute" is the FIXTURE's cadence**, not the feed's.
  `createFixtureStream` ticks at `tickEveryMs = 60_000` and emits all 518 in
  one batch — and that is the feed every production-build figure in Task 3.6.5
  was taken against. The real feed is **8.8–16.1 batches a minute**.

**The routes that really went from ~0 to ~16 are `/investigations`, `/replay`
and the not-found route**, which subscribe to nothing, so before Story 4.2
every `feed` frame was collapsed by `sameLiveFeedView` and nothing re-rendered.
**The owner's Gate 1 decision is to measure and record these, and NOT to
repair them** — the repair is a module-boundary change and the figure may well
be single-digit.

### The open question a count answers and a timing cannot

Whether `/securities/:symbol` is 32 or 16 depends on something no file can
answer: **whether Chromium dispatches the gateway's back-to-back `overview` and
`bars` frames in one task**, in which case React batches both `setView` calls
into one commit. Count it.

### What to count, and against what

Renders per **applied batch**, per route — `/`, `/securities`,
`/securities/:symbol`, `/investigations`, `/replay` — against a known batch
count, using 4.8.1's proved commit counter. Renders per minute is **derived**
from the cadence and stated as derived.

### And the correction is three live sites plus one that must not be touched

`story-05-*/TASK-06-*.md` carries a correct claim about a different thing and
is a **historical record**. Amend the live sites; leave it standing.

### Also discharge, because the condition fired twelve days ago

`docs/GAPS.md`'s owner clause for the four-route re-render reads _"Story 4.8 is
the first candidate and its scope is `/` only, so if it takes this it is
widening deliberately"_ — written 2026-09-26, and this story's own scope was
widened to all five routes on 2026-09-27. **The entry does not know its own
condition fired.**

## Done when

1. Renders per applied batch measured on all five routes, with the batch count
   proved rather than assumed
2. The one-frame-or-two question answered for the `overview`/`bars` pair
3. The three live sites corrected; the historical one left standing, and the
   count of each recorded
4. `docs/GAPS.md`'s stale owner clause amended with the reading
