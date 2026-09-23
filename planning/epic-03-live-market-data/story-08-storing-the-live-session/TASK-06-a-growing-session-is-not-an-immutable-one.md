# Task 3.8.6 — A growing session is not an immutable one

**Status:** Not started
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.3

## Objective

The read path was designed against a store that stopped at yesterday's close.
Task 3.8.3 changed that, and two decisions made under the old premise now need
re-reading rather than assuming: **the stitch's bound** and **what a cached
answer promises**.

## What the user can see when this lands

**Nothing new, and one thing that stops being wrong.** A chart of a session
being written to as it happens must not be served from a validator written for
a session that never changes.

## The two things to re-read

**1. The caching table, which has a third case now.**
`MARKET-DATA-API.md` §11 argued `ETag`s on _a closed session's bars never
change_, with the qualification already recorded that the bars do not change and
the **response** does. Its table gives an absolute window entirely inside closed
sessions `private, max-age=300`, and anything reaching into the current session
`private, no-cache`. **A session being written to as it happens is the third
case**, and the hazard is precise: an absolute window whose end has passed but
whose bars are still being filled in by the writer — an afternoon window
requested at 15:00 and served again at 15:10 — looks closed to the rule and is
not. Five minutes of freshness over a series growing every minute is a stale
chart with a valid validator.

**And since 2026-09-23 there is a concrete thing to key on.** Task 3.8.3
settled that the live writer claims `[first.startsAt, last.startsAt + 1
minute)` and never the session close, so **`bar_coverage.covered_end` advances
once a minute for every security the feed is carrying** — confirmed against a
real ledger. That makes _is this window still growing_ a question the store can
answer rather than one the clock has to guess: a window whose end is at or past
the ledger's `covered_end` is one the writer has not finished. Whether the
validator should read it is this task's to decide; that it is readable is not
in doubt.

**And a third case that is not about growth at all — added 2026-09-23 by Task
3.8.4.** The two above are both _a window gaining bars_. This one is **a window
whose bars change without gaining any**, and the caching argument has never had
to hold it.

Since 3.8.4 a served minute is the **preferred** tape rather than the only one.
So a window served at 20:00, before the backfill, returns the IEX bars; the
same window served at 21:00, after it, returns the **consolidated** bars for
those same minutes. Same instants, same bar count, **different prices**, and a
`provenance.sources` that has changed shape. `MARKET-DATA-API.md` §11's premise
is _a closed session's bars never change_ — that is now false in a second and
less obvious way, and the session does not have to be growing for it to bite.

The hazard is precise and it is the one the table's `max-age=300` was written
against: a window entirely inside closed sessions is cacheable by that rule, and
the reconciliation can land inside those five minutes. **Whatever validator this
task lands on has to change when the tape serving a minute changes**, not only
when a bar arrives — which is an argument for deriving it from something that
moves on a correction, `recorded_at` being the obvious candidate since `0004`
argued it as exactly that record.

**2. The stitch's bound, whose reversal trigger has fired.**
`MARKET-DATA-API.md` §5 recorded: _the tail's **source** changes when Epic 3 has
a live stream worth joining — at that point rule 2's clamp and rule 3's bound
both stop being necessary, because a stream is not a metered request and is not
16 minutes stale._ **That is now true.** Re-read the section against the tree,
decide whether the stitch is still earning its metered request for most windows,
and record the answer — including "it is, and here is when". The decision to
stitch is not automatically reversed; what changed is the thing being stitched.

## Work

- Re-read `MARKET-DATA-API.md` §5 and §11 against a store that holds today, and
  amend both with a date rather than rewriting them
- Whatever the caching rule needs in `routes/market-data.ts` and
  `series-cache.ts`, with the third case named in the table
- `routes/market-data.test.ts`: the growing-session case asserted — the same
  window asked twice across a write must not be served from a validator that
  says it did not change
- A `pnpm break` for the clause that carries it
- **Measure what the stitch costs now** on a window the store can answer in
  full, against Story 2.9's recorded figures, and say whether the metered
  request still happens
- `LIVE-SESSION.md` §on reading a session that is still being written

## Done when

1. A response for a growing session is not served stale from a validator
   written for an immutable one — criterion 7
2. §5's reversal trigger is evaluated **in writing**, with a verdict
3. `pnpm verify` and `pnpm test:database` pass
