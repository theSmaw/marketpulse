# Task 2.9.7 — Caching, and the one immutable thing this product has

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.5

## Objective

Take the cheapest caching opportunity this product will ever have — the bars of a
**closed** session never change — without ever serving a window ending _now_ from
a cache.

## What the user can see when this lands

**Nothing new**, and Stories 2.12 and 2.13 feel faster because of it: switching
back to a window already looked at should not re-read 8,000 rows.

## Work

- **Draw the line where the calendar draws it, not where a clock does.** A window
  entirely inside sessions that have closed is immutable and can say so; a window
  whose end is in the current or a future session is not, because the store's own
  catch-up will change it. Story 2.5's calendar is what tells the two apart, and
  reusing it here is what keeps one definition of a session.

- **Prefer the mechanism with the smallest failure mode.** A validator (`ETag` and
  a conditional request) is cheap and correct when in doubt; a long
  `Cache-Control: max-age` on the wrong response is a wrong number a user cannot
  clear. Decide which, say what happens when the store is backfilled underneath a
  cached answer, and note that the deployed frontend's own host caches nothing on
  this path — the browser and any proxy in between are the whole audience.

- **Assert the negative case, because it is the one that goes wrong silently.** A
  window ending in the live session must not be marked immutable, and a
  `bars:check` catch-up that extends coverage must not leave a stale answer
  servable. Make the break: mark a live window immutable, watch the assertion go
  red, put it back — a break that does not go red is equally evidence the break
  did not land.

- **Measure what it buys before keeping it.** A conditional request that saves
  8.4 MB is worth its complexity; one that saves 2 kB is not, and this repository's
  rule is to measure rather than assume. If the measurement says the caching is not
  worth having, **say so and remove it** — that is a result, and the story's
  criterion is that the semantics were decided, not that a header shipped.

## Done when

- The immutability rule is expressed through the calendar and tested either side
  of a session close
- A live-window response is asserted **not** to carry it, with the assertion made
  to fail once
- What it saves is measured on a real window and recorded in `MARKET-DATA-API.md`,
  including the decision to keep or drop it
- `pnpm verify` passes

## Notes

Epic 13's replay reads history as-of a past instant, where **every** window is
closed. Whatever is built here is the thing replay gets for free, so it is worth
writing the rule in terms of "sessions that have closed" rather than "not today".
