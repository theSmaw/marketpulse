# Task 4.2.9 — ADR 0038, the sweeps, and the close

**Status:** Not started
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.8

## Objective

**The seam four stories and one epic go through gets a decision record**, and
the story sweeps in the two directions a close does not reach on its own.

## What the user can see when this lands

**Nothing.** The story is finished and the next reader can find out why it was
built this way.

## Work

- **ADR 0038 — the overview aggregate: one join, one frame, and what a derived
  figure on this wire owes.** The number is free and unclaimed, verified against
  `docs/`, `planning/` and `README.md`. It records: the join rather than the
  aggregate; one backend module taking the map, a closes lookup and an `asOf`
  as arguments; `changeFromClose` moved to shared and called by two processes;
  one compute per applied batch, broadcast, never from the feed-state path;
  per-frame tapes and a per-figure `observed`/`stored` discriminant; and the
  version deliberately not bumped.
- **The alternatives, each with its consequence** — the browser-side
  computation, the polled route, the basis-on-the-wire variant, one frame type
  per region, and no wire at all in this story. Two of them were the owner's
  own rejections in Task 4.1.1 and must be recorded as such rather than
  re-argued.
- **Two reversal triggers, both conditions.** Primary: **the first overview
  figure whose value depends on something a single client chose** — a per-client
  window, a subset, a scrub position — at which point the frame stops being
  broadcast-identical and wants a request/response shape. Narrower and likely
  to fire first: **the first consumer of the overview aggregate that is not a
  browser**, because Epic 7's tools and Epic 10's agent cannot attach a
  WebSocket to call a function.
- **The consequence that is not fixable here, recorded rather than hidden.**
  `currentMarketState` filters to `status = 'active'` against **today's**
  universe, and the store records no point-in-time membership — so a replayed
  aggregate would compute over the present universe. `UNIVERSE.md` §12.2's rule
  says a computation over the market we track now filters and a read of
  something we stored does not; a replayed aggregate is the second and behaves
  like the first. It needs a schema change, it is not this story's, and it may
  bound what Epic 13 can honestly claim. ADR 0038's consequences and
  `docs/GAPS.md`, with a re-measure.
- **The upward sweep.** Every figure and claim this story falsified or moved:
  `PRODUCT_SPEC.md` §9's region list (the rename), `last-close.ts`'s own
  invariant-1 argument (a **dated amendment**, because the module moved and the
  argument now applies across a process boundary), ADR 0033 (Task 4.1.6 says it
  owes an amendment for the ~332-frame path and it has never been written), and
  `CLAUDE.md`'s _Current state_ and _Where the record lives_.
- **The sideways sweep, enumerated rather than asserted.** Grep this story's
  documents for every `Story N.M` and `Owner:` line, check each against that
  story's own file, write the constraint **into that story's file in words it
  can act on**, and **record the count that were missing**. Known already:
  - **Story 4.3** — the frame's shape, and whether sectors share this frame or
    get their own type.
  - **Story 4.4** — the denominator sentence must not reach for
    `live`/`stale`/`disconnected`, and the coverage count is frozen between
    bursts, bounded at a minute during a session and **unbounded when the feed
    dies**.
  - **Story 4.5** — the fourth design test was answered for **one** figure
    decaying; four in the same frame may read as a refresh rather than as four
    arrivals, and if it does the repair is in the strip, not the motion layer.
    Also: a ranked list over 518 candidates once a minute is a **routine**
    per-tick cost on a new page, the same category as the 40 ms/30 s health-poll
    re-render Task 3.6.5 found and repaired.
  - **Story 4.6** — the first thing that makes a proxy activatable must not be a
    natively `disabled` control carrying an `aria-describedby`, which is
    unreachable by definition.
  - **Story 4.7** — the overview's `computedAt` and what a decayed count says
    when the feed has stopped; and the ~332 `feed` frames a minute, still theirs.
  - **Story 4.8** — the per-tick cost of this screen at universe scale, and
    Epic 14's trigger.
- **The listening backlog gains an entry rather than an answer**: whether four
  per-proxy blocks read as four sentences or one run-on string is readable from
  neither the DOM nor a timing. Same unanswerable as the identity block's
  10-or-11 words across three `<p>`s, multiplied by four.
- **`STORY.md` status, the subject document, and a `LIVE-REHEARSAL.md` row if
  this story needs a person to have watched it.** If a rehearsal is recorded,
  say **which half it proved** — a rehearsal against a quiet system certifies
  the wiring and not the loop, and with the market shut one drain and all drains
  look identical.

## Done when

1. ADR 0038 exists with its alternatives, consequences and two conditional
   reversal triggers, and every guard it describes has a check and a break that
   have actually been run
2. The upward sweep is done and each amended document is dated, with historical
   records left standing
3. Every sibling story named in this story's documents has the constraint in its
   own file, and **the count that were missing is recorded**
4. `docs/GAPS.md` carries the point-in-time universe entry
5. `pnpm verify`, `pnpm e2e` and `pnpm test:database` are green, and anything
   not run is named

## Amended by Task 4.2.8 — 2026-09-26: one decision this close owns, and three things to carry

**1. Decide whether `/` gets a deployed region check, and it is this close's call
because it is the only task that can take it.** `e2e/specs-deployed/` names **no
region on the landing route**, so the rename had no second copy to miss — an
absence rather than a rot. But `security-explorer-journey.spec.ts` asserts, for
the **other** route, that every §8.3 region is present **and says something**,
and `/` now has a region with a subject and no equivalent. **And the deployed
store is the only place the strip's live states occur at all**: on CI every
proxy is `unknown` for ever, so a deployed check is the only mechanical reader
of the states this story exists to produce. Recorded as the **fourth occasion**
on `docs/GAPS.md`'s two-directories entry, with that entry's owner naming this
close. A deployed spec is a **report** rather than a gate — it runs after the
merge — so it cannot block anything, which is the argument both for and against.

**2. `Market proxies` is now a homonym, and a future locator will collide.** It
is the landing region, the universe table's group heading, and a rail link —
the same four securities and the product's existing word, so it is consistent
rather than wrong. But **any future region locator on `/securities` must be
scoped**, and nothing says so yet outside this line.

**3. Retiring a check is on this close's desk.** After 4.2.7's repair,
`the-consolidated-word-has-one-producer` is a **strict duplicate** of one of
`one-home-for-the-feed-words`' literals — same corpus, same home, different
message. Deferred here deliberately, because retiring a guard wants the whole
story's inventory in view and this is the task that has it.

**4. One design note, not a defect.** When one proxy ticks, **three of four
cells carry an exception line** — at n=4 the shared-claim-with-exceptions idiom
inverts and the exception becomes the majority. It misstates nothing, and the
gateway usually applies a batch, so it is a note for whoever next designs a
shared claim over a small set.
