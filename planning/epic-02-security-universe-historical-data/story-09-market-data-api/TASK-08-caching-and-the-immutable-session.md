# Task 2.9.8 — Caching, and the one immutable thing this product has

**Status:** Complete — 2026-09-10
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

- **The response carries a fact that is NOT about bars at all, and the calendar
  rule says nothing about it — added 2026-09-09 by Task 2.9.6.** The envelope is
  `{ series, securityStatus }`, and `securityStatus` comes from the `securities`
  table rather than from `market_bars`. `pnpm universe` can flip a security from
  `active` to `untracked` at any moment, including against a window of sessions
  that closed years ago — so **a response about a closed session is immutable in
  its bars and mutable in its envelope**, and a `max-age` derived purely from the
  calendar would serve a stale status under a correct-looking body. This is the
  second thing already found to be true of the "immutable" response and the two
  have different shapes: 2.9.4's correction moves a **price** and is rare, this
  moves a **label** and is one command away. A validator recomputed from the whole
  body survives both, which is the argument the bullet below is already making;
  what this adds is that the argument no longer rests on corrections alone. Say
  which way it was taken.

- **Where the cache sits decides whether the 404 still happens — added 2026-09-09
  by Task 2.9.6.** The handler is three steps in one order: parse, then
  `findSecurity` (the 404 and the `securityStatus`), then `serveSeries`. A cache
  **in front of `serveSeries`** keeps the universe lookup on every request, which
  is one point read and the thing that keeps an unknown symbol a 404. A cache in
  front of the **whole response** skips it — and then a symbol removed from the
  universe goes on being served from cache with its old status, and the 404 that
  `MARKET-DATA-API.md` §6 makes a statement about the _security_ becomes a
  statement about what was recently asked for. Pick deliberately and say which;
  the cheaper one is not obviously the right one.

- **There is a SECOND response with this shape now, and this task has to say
  whether it is in scope — added 2026-09-09 by Task 2.9.7.** That task put
  `lastCloses` on `/securities`: the close of a session that has closed, for 518
  securities, which is _precisely_ the immutable thing this task's objective
  names, changing once a day when the nightly catch-up runs. It is also the
  bigger payload of the two — **190,736 bytes, 19,526 gzipped**, fetched once per
  page load by `useSecurities`.

  And it carries the same envelope trap the bullet above describes, from a
  different direction: the `securities` array holds `status`, which `pnpm
universe` can flip at any moment, so `/securities` is **immutable in its closes
  and mutable in its rows** exactly as the series response is immutable in its
  bars and mutable in its `securityStatus`. One rule that survives both is the
  argument for a validator; two routes with two rules is how they diverge.

  **Decide it explicitly rather than discovering it.** The case for out: this
  story is the market-data API and `/securities` is Story 2.4's resource, fetched
  once per page load rather than once per chart interaction, so the saving is
  small and the scope creep is real. The case for in: it is the same fact, the
  same calendar rule and the same validator, and leaving it means the first thing
  a reader tries — _is my price fresh?_ — has a different answer from the second.
  Whichever way it goes, say so, because a later reader finding one route cached
  and the other not will assume it was an oversight.

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
- Whether `/securities`' `lastCloses` is inside this task's rule is **stated
  either way**, with the reason
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

---

## What was built — 2026-09-10

Two modules, two headers on four responses, and one cache. Every figure quoted
below is recorded with its method in
[`MARKET-DATA-API.md`](MARKET-DATA-API.md) §11; nothing is repeated here that
lives there.

### The files

| File                                     | What it is                                                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/http-cache.ts`         | Transport only: the `ETag`, the `If-None-Match` comparison, the `304`, and the two `Cache-Control` directives. Knows nothing about sessions, bars or securities. |
| `apps/backend/src/series-cache.ts`       | The market half: `closedThrough`, `isClosedWindow`, `seriesCacheControl`, and the LRU of served answers.                                                         |
| `apps/backend/src/series-request.ts`     | Gains `windowForm` on `SeriesRequest` — the one field on that type that is about the request rather than about what was asked for.                               |
| `apps/backend/src/routes/market-data.ts` | Sets the header, reads and writes the cache between `findSecurity` and `serveSeries`.                                                                            |
| `apps/backend/src/routes/securities.ts`  | Sets `private, no-cache` and installs the validator. Carries the in-scope decision in a comment beside the code.                                                 |
| `apps/backend/src/index.ts`              | Amended: its _"it is cached by nothing yet"_ claim about `/securities` is no longer true, and the conclusion it supported is unchanged.                          |

Tests: `http-cache.test.ts` (17), `series-cache.test.ts` (23), and additions to
`routes/market-data.test.ts` and `routes/securities.test.ts`. `pnpm verify`
passes, and so do the other two required checks — `pnpm test:database` (165) and
`pnpm e2e` (30), neither of which this change was expected to touch and both of
which were run rather than assumed.

### The decisions this task's brief asked to be stated either way

1. **Which mechanism.** A **validator**, everywhere; no response carries
   `immutable` and none carries a `max-age` longer than five minutes. The
   argument no longer rests on corrections alone — the brief's second bullet is
   right that `securityStatus` is a _second_ mutable thing in an "immutable"
   response, with a different shape and a much shorter fuse. A validator
   recomputed from the whole serialised body survives both, and a `max-age` is a
   promise nothing can withdraw. §11's first table.

2. **Where the cache sits.** In front of `serveSeries` and **behind**
   `findSecurity`, so the universe lookup runs on every request. The cheaper
   option was refused: it would take the 404, the live `securityStatus` and the
   503 with it. All three are asserted against a cache deliberately shared
   across two servers.

3. **Is `/securities` in scope.** **Yes for the validator, no for a lifetime and
   no for the answer cache**, with the reasons in §11's last subsection and in
   the code. It is the bigger payload (190,736 B against 44,701 B) and it is
   fetched on every page load; it also has no window, so there is nothing the
   immutability predicate could be applied to.

4. **The named-window trap.** Closed, and it is the thing this task was most
   likely to ship silently. A named window carries a validator and **never** a
   lifetime, whatever it resolved to — asserted by requesting the same window
   both ways after the close and showing byte-identical bodies, the same `ETag`,
   and deliberately different `Cache-Control`.

5. **Whether the stitch's metered cost is bounded.** **It is, and §5's condition
   does not fire.** The bound is one vendor request per resolved window per
   minute **per replica**, which removes the dimension §5 was worried about —
   cost scaling with how many people are looking. What it still scales with is
   how many distinct windows exist, and — corrected the same day, because the
   first draft of §11 said "per minute" and meant "per minute per process" — how
   many replicas the Container App is running, which is platform-only
   configuration Task 2.9.9 owns reading. The stitch was **not** narrowed.

6. **What a backfill underneath a cached answer does.** Every entry expires,
   immutable or not, because the catch-up changes a fact about our store that
   the calendar cannot see. There is deliberately no invalidation hook: a cache
   a writer has to remember to clear is wrong on the day somebody forgets.

### Two things produced rather than reasoned about

- **`reply.removeHeader("content-length")` in an `onSend` hook does nothing.**
  Fastify computes that header from the payload after every hook has run, so a
  `304` goes out with `Content-Length: 0`. Attempted, measured against a running
  server, reverted to a comment recording the finding.
- **The local store cannot produce a real metered vendor request.** Its
  `covered_end` is six sessions behind, so §5 rule 3's session-gap bound
  declines every tail — both requests logged `tail: "stale-store"` and zero
  vendor requests were made with or without the cache. The count was therefore
  taken through the shipping plugin with a counting provider stub, and the
  method is named in §11 rather than the figure being presented as a vendor
  measurement.

### Three breaks, all verified

A live window marked reusable, and the cache read made to always miss, were each
substituted and the assertions watched go red before being put back. §11's last
table records which assertion caught which. A break that does not go red is
equally evidence the break did not land.

---

## For the stakeholder — what this means, in plain terms

**Short version: the product now remembers. Nothing new appears on screen, and
two of the three screens ahead of us will feel noticeably quicker because of
this.**

### The idea

Almost everything MarketPulse shows you about the past is _finished_. Tuesday's
trading day ended at four o'clock on Tuesday; nothing that happens tomorrow will
change what Tuesday's chart looks like. That is unusual and valuable — most of
what a market application shows you is changing under your feet — and it means we
can safely avoid doing the same work twice.

This task spent that. Two mechanisms, and the difference between them matters:

- **The browser is now allowed to keep answers.** When you look at a chart of a
  day that is over, your browser holds onto it. Switch away, switch back, and it
  is simply there — no waiting, no request, nothing to load.
- **The server now remembers its own answers.** When two people ask for the same
  chart, we work it out once.

### Why we were careful rather than aggressive

The obvious version of this is to tell the browser "this never changes, keep it
forever". We deliberately did not, for three reasons we found while building —
two of which were not in the original plan.

1. **Prices are occasionally corrected.** Exchanges and data vendors do amend a
   published price after the fact. It is rare. It also means "a closed day never
   changes" is _almost_ true rather than true.
2. **The label beside the price can change at any moment.** Every chart says
   whether we are still tracking that company. That is a fact about our own
   watchlist, not about the market, and it can change today against a chart of a
   day five years ago.
3. **A "keep this forever" instruction cannot be taken back.** Once a browser has
   been told to hold something for a year, there is no way for us to reach it and
   say we were wrong.

So instead of promising anything, we **fingerprint** every answer. Each response
carries a short code computed from its exact contents. When your browser asks
again, it sends the code back; if nothing has changed we reply "still current"
in a few bytes and send nothing else. If _anything_ changed — a corrected price,
a changed label, a single number — the code is different and you get the fresh
answer automatically. It cannot go stale, and there is nothing anyone has to
remember to clear.

On top of that, a chart of a day that is definitively over is allowed to be
reused with no question asked at all — but only for **five minutes**. That is the
one number in this whole piece of work: five minutes is the longest that anything
in this system will show you something a correction has superseded.

### The numbers

A "still current" reply costs essentially nothing. The things it replaces:

| What you were about to download again                                             | Now         |
| --------------------------------------------------------------------------------- | ----------- |
| The full list of 518 companies with their prices — **190 kB**, on every page load | a few bytes |
| A month of minute-by-minute prices for one company — **1.06 MB**                  | a few bytes |
| A full year of minute-by-minute prices — **11.08 MB**                             | a few bytes |

And on the server, a repeated chart request went from **31 ms** to **12 ms** —
about two thirds of it removed, because the database is not asked again.

### The part that was a genuine risk, and is now closed

When we last reported, we had just connected the price chart to the live market
data feed — meaning a chart that runs up to _right now_ fetches the most recent
minutes from our data provider as you look at it. That is the right behaviour and
it carried a real, stated risk: our data provider allows a limited number of
requests, and "fetch the latest minutes" was happening **once for every person
looking at every chart**. That cost grows with how popular the product is, which
is precisely the wrong shape.

We wrote down at the time that if this task could not put a ceiling on it, we
would come back and change the design rather than quietly absorb the cost.

**It did, and we did not have to.** The server now fetches the latest minutes for
a given chart at most **once a minute**, no matter how many people are watching
it. Since the finest detail we serve is one bar per minute, asking more often
than that cannot tell you anything new — so this costs nothing in freshness and
removes the growth entirely. The design stands as agreed.

### What you still cannot do

Nothing on screen changed today. There is still no price chart — that is the
story after next. The tracked-universe page and its last-close prices are exactly
as they were, only lighter on the wire.

### Why this was worth doing now rather than later

Two reasons, and neither is "performance".

The first is that the cost above was a **known open risk with a written trigger**.
Leaving it would have meant either shipping a design we had already flagged, or
re-opening a decision after two more tasks had built on top of it.

The second is that this is the piece of work that our headline feature inherits
free. The plan's signature capability is **replay** — winding the market back to
a moment and asking what was knowable then. In replay, _every_ moment is in the
past, so _every_ answer is one of the finished, cacheable ones this task just
learned how to handle. We deliberately wrote the rule as "sessions that have
already closed" rather than "not today" for exactly that reason: replay gets the
whole of this without a line of new code.
