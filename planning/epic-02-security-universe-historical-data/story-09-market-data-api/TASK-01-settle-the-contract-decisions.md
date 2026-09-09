# Task 2.9.1 — Settle the four open decisions and the namespace, shipping no route

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Story 2.8 (complete)

## Objective

Take this story's four open decisions — the window vocabulary, downsampling,
pagination, and the read-side join — plus the path the series endpoint lives at,
**with measurements rather than preferences**, and write them down in one document
before any contract is typed. Task 2.6.1's precedent: settle the shape, ship nothing.

## What the user can see when this lands

**Nothing.** No route, no type, no page. The payoff is Story 2.12's chart, and the
thing this task buys is that Tasks 2.9.2 to 2.9.5 do not each answer the same
question differently. Say so plainly when reporting it.

## Work

Produce `MARKET-DATA-API.md` in this directory — the subject document for this
story, listed in `CLAUDE.md`'s _Where the record lives_ table by Task 2.9.9 — and
settle each of the following in it, with the alternatives and a **reversal trigger
that is a condition rather than a story number**.

- **The namespace and the path.** `GET /market-data` already exists (Task 2.6.7)
  and answers _which feed is this deployment reading_. That amendment says the
  namespace is yours to shape and states the one hard rule: **no second endpoint
  may answer "which feed"**. Weigh `/market-data/bars`, `/securities/:symbol/bars`
  and a third if there is one, and note that Story 2.11 gives a security its own
  frontend route — which is an argument about URLs a person types, not necessarily
  about the API's shape. Decide once; three later epics inherit it.

- **Open decision 1 — named windows, absolute ranges, or both.** The story states
  the trade: a named window keeps one definition of a session, an absolute range
  keeps the server dumber. Three facts bind it and are already settled upstream:
  a wire instant is a **UTC ISO 8601 string**, a session is a **`YYYY-MM-DD`
  market date and a separate wire type**, and `lastMarketSessions(n, endDate)`
  **refuses rather than truncates** outside 2024–2028 (ADR 0017 decision 9).
  `packages/shared` may not read the wall clock — lint enforces it — so `today`
  is resolved in the handler and passed in.

- **Open decision 2 — downsampling, and it now has a number under it.** A year of
  minute bars for one symbol is **97,530 rows ≈ 8.4 MB of JSON** (`BARS.md` §8.6),
  so "send them all" is not an answer. Decide whether the server ever reduces a
  series, and if it does, **decide it as an aggregation rather than as a
  sampling**: taking every _n_ th bar deletes exactly the spikes this product
  exists to notice, whereas bucketing to `first(open), max(high), min(low),
last(close), sum(volume)` is the same operation that made `1d` out of `1m` and
  is expressible in SQL over `numeric`. Note the constraint from `PROVIDER.md`
  §9.4 and `bar.ts`: a **stored** `1d` bar is never derived from `1m`, because
  replay reconstructs from what was stored — a **served** reduction is a different
  claim and the response has to be able to say which it is.

- **Open decision 3 — a cap, pagination, or neither.** Story 2.4 answered the
  universe's version by having no page size at all, on the argument that _the
  thing that reaches 500 without an edit is no number rather than a bigger one_.
  **That argument does not transfer**, and the story says so: a series' size is a
  function of a user's request. Decide what happens when a request exceeds
  whatever is chosen — a 400 naming the limit, a silently reduced series, and a
  paged answer are three different products — and prefer the one where a client
  **cannot** be handed fewer bars than it asked for without being told.

- **Open decision 4 — the read-side join** (added by Task 2.8.8). The store holds
  **complete sessions only**; the catch-up runs at 08:00 UTC before the open, so
  today's session is not in it. Three shapes, none chosen: serve only what is
  stored; stitch a live tail and label the seam; or ask the provider for the whole
  window on demand. Two measurements are already in hand — a mid-session fetch is
  **always ~16 minutes stale** and returned 134 of 390 minutes at a simulated
  12:00 ET, and every stored bar is **SIP** where Epic 3's stream is **IEX**.
  `SeriesProvenance.sources` is a list precisely so a stitch can report two feeds.
  **Recommend option 1 for this epic** unless the measurement says otherwise, and
  write the trigger for option 2 as a condition — Epic 3 having a live tail worth
  joining — rather than as a story number.

- **State what a "partial answer" is, in this contract's own words**, because
  three later tasks assert it: §36 says _"we have data through 15:42"_ and _"we
  have nothing for this symbol"_ are answers rather than errors, and
  `SeriesCoverage` already has the shape for both — `requested` always present,
  `covered` `null` exactly when the series is empty. The job here is to say which
  HTTP status each is and to refuse the temptation of a 404 for an empty series.

- **Restate the `status` rule so Task 2.9.4 cannot get it wrong.** `UNIVERSE.md`
  §12.2 puts this path firmly on the do-not-filter side: an `untracked` symbol's
  stored history is still what happened, so it is served and labelled untracked.
  Stories 2.7 and 2.8 filter; this does not.

## Done when

- `MARKET-DATA-API.md` exists and settles the namespace and all four open
  decisions, each with its alternatives and a reversal trigger stated as a
  condition
- Every figure in it was taken in this task or quoted with its source and date —
  no number is carried forward from `CLAUDE.md`
- The story's open-decision list is struck through in `STORY.md` the way Story
  2.4's was, pointing at the document rather than repeating it
- `pnpm verify` passes — which for a documentation-only task means `pnpm links`
  and `prettier` on the new file

## Notes

The user owns open decisions 2 and 4. Bring the numbers and a recommendation
rather than the question — `BARS.md` §2's three-option table is the format that
worked.
