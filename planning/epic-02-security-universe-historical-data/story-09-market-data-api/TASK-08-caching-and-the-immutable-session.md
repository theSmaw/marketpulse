# Task 2.9.8 — Caching, and the one immutable thing this product has

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Tasks 2.9.5, 2.9.6

## Objective

Take the cheapest caching opportunity this product will ever have — the bars of a
**closed** session never change — without ever serving a window ending _now_ from
a cache.

## What the user can see when this lands

**Nothing new**, and Stories 2.12 and 2.13 feel faster because of it: switching
back to a window already looked at should not re-read 8,000 rows.

## Work

- **What you are bounding now exists, and its size is already capped while its
  frequency is not — added 2026-09-09 by Task 2.9.5.** `serveSeries` fetches at
  most the **current session's** tail, so a single request can never become a
  multi-day vendor fetch however stale the store is. What is unbounded is how
  _often_ that request is made: every chart window ending `now` is one metered
  request on a cache miss, once per page load, per symbol. The cache is
  therefore in front of `serveSeries` rather than inside it, and the store is
  not the cache — the tail is served and **cannot** be stored, because
  `recordSeries` refuses a two-source series by design.

  `MARKET-DATA-API.md` §5 names this task failing to bound that request as the
  condition for bringing the stitch decision back to the user. It is a condition
  rather than a formality: if it fires, say so rather than narrowing the stitch
  here.

- **Draw the line where the calendar draws it, not where a clock does.** A window
  entirely inside sessions that have closed is immutable and can say so; a window
  whose end is in the current or a future session is not, because the store's own
  catch-up will change it. Story 2.5's calendar is what tells the two apart, and
  reusing it here is what keeps one definition of a session.

- **A named window is a STABLE URL naming a MOVING target, and every HTTP cache
  keys on the URL — added 2026-09-09 by Task 2.9.2.** This is the trap this task
  is most likely to ship silently. `?sessions=5` resolves through the calendar
  against **today's** market date, so the same URL means a different window
  tomorrow, and it changes meaning again at every session close. A browser or
  proxy holding a `max-age` answer for it serves yesterday's window under today's
  address, and the response looks entirely well-formed — the resolved range is
  reported honestly in `coverage.requested`, it is simply the wrong range.
  So the immutability rule cannot be applied to the raw request: it is a property
  of the **resolved** range (`SeriesRequest.range`, always absolute), while the
  cache key is the URL the client sent. The consequence, which should be stated
  and tested rather than inferred: **the named form can carry a validator and must
  never carry a long `max-age`, even when the window it resolved to is entirely
  closed sessions.** The absolute form is the one that can be immutable, because
  its URL and its meaning are the same thing.
  Assert it: the same window requested both ways gets the same **body** and
  deliberately **different** cache headers, and make the break — mark the named
  form immutable and watch a test go red.

- **"A closed session never changes" is true of the BARS and not quite true of
  the RESPONSE — added 2026-09-09 by Task 2.9.4.** That task put
  `min(market_bars.recorded_at)` on the wire as the series' `retrievedAt`, and
  Story 2.8's open decision 1 settled that a vendor **correction overwrites** a
  bar and moves its `recorded_at`. So a correction landing against a closed
  session changes both a price and the timestamp beside it, in a window this
  task's rule would already have called immutable. That is not an argument
  against the rule — corrections are rare, and the trigger for noticing one is
  `BarWriteResult.corrected`, which exists precisely because it would otherwise
  be undetectable. It is an argument about **which mechanism**: a validator
  recomputed from the response survives a correction, and a long
  `Cache-Control: max-age` on a closed session serves the pre-correction body for
  its whole life with no way to clear it. Say which way this was taken and why,
  rather than leaving "immutable" to mean two things.

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

- **Measure what it buys — but note that "drop it" is no longer freely
  available.** A conditional request that saves ~~8.4 MB~~ **11.08 MB**
  (re-measured 2026-09-09 by Task 2.9.1; `MARKET-DATA-API.md` §8) is worth its
  complexity; one that saves 2 kB would not be. **Amended 2026-09-09 after 2.9.1
  settled the stitch:** this task now carries a second job that the first draft did
  not know about. Every window ending _now_ is a **metered vendor request** on a
  cache miss (§5), so caching is what bounds the cost of Task 2.9.5 rather than
  only what makes Story 2.12 feel quick. **Measure both** — bytes saved, and
  vendor requests avoided.

- **If the metered request cannot be bounded, that is a result to report rather
  than absorb.** `MARKET-DATA-API.md` §5 names this as the condition for bringing
  the stitch decision back to the user — the read-side join was chosen over
  "serve only what is stored" on the understanding that caching would hold the
  cost down. Say plainly whether it does. Do not quietly narrow the stitch
  instead.

## Done when

- The immutability rule is expressed through the calendar and tested either side
  of a session close, and what a **correction** to a closed session does to a
  cached answer is stated
- A live-window response is asserted **not** to carry it, with the assertion made
  to fail once
- A named window is asserted never to carry a long `max-age`, whatever it resolved
  to, and the same window asked both ways is shown to return the same body
- What it saves is measured on a real window — **bytes and vendor requests
  both** — and recorded in `MARKET-DATA-API.md`
- Whether the stitch's metered cost is bounded is stated plainly, and if it is not,
  §5's condition is reported rather than worked around
- `pnpm verify` passes

## Notes

Epic 13's replay reads history as-of a past instant, where **every** window is
closed. Whatever is built here is the thing replay gets for free, so it is worth
writing the rule in terms of "sessions that have closed" rather than "not today".
