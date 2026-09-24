# Task 3.10.6 — The cell that must not inherit Epic 2's word, in every connection state

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1, 3.10.2

## Objective

The market-feed cell answers **two** questions — _which venues are in these
numbers_ and _is data arriving_ — and on the deployed site it has been getting
the first one wrong on every route.

> `MARKET FEED ● ALL US EXCHANGES ● LIVE`

read beside numbers that were **entirely IEX**, seen on 2026-09-22.

## What the user can see when this lands

**The chrome stops claiming the whole market while showing one exchange**, in
every connection state — and a quiet socket at 02:00 reads as correct rather
than as broken.

## Why the two halves are one task

Because **the venue word has to be decided _with_ the connection word**, and
this story owns what the cell says in every connection state:

- while `LIVE`, the numbers arriving are the **socket's** tape;
- while `DISCONNECTED` or `STALE`, the newest numbers on screen are **still the
  socket's**;
- the charts beneath are the **historical** tape throughout.

So a cell that names a venue correctly for `LIVE` and keeps naming it through
`DISCONNECTED` may be right or wrong depending on which subject the word has.
Deciding one without the other is how it went wrong the first time.

## Where the words come from, and why nothing went red

The venue comes from `GET /market-data` (`{"feed":"sip"}` — the **historical**
provider's tape) and the connection word from the socket's `feed` frames
(`{"status":"live","feed":"iex"}`). Two sources, one cell.

**`market-feed-grid.test.ts` asserts that a connection word has _a_ feed word
beside it, not that it is the right one.** That is exactly why this shipped for
four days: Task 3.4.9 built a check that walks the **selections** and it is
correct about what it checks.

**When 3.10.1's decision 4 is answered, write it into that file as the rule that
a live connection word is never beside a feed word the live tape is not.** A
check whose failure mode is _it was never about that_ is the one that lets this
recur.

## What has narrowed since the decision was framed

Story 3.9 shipped the source note's two-feed sentence from a **recorded** body,
and `All US exchanges` now has **exactly one producer**, guarded by
`the-consolidated-word-has-one-producer` with a break behind it. So _defer to
the source note_ is a live option rather than a wish: `PROVENANCE.md` §1.3 —
the chrome says what it can and the source note says what the chrome cannot.

## Criterion 5, which lands here because it is the same cell

**A quiet socket outside market hours reads as correct rather than as broken.**
`FeedStatus` is about the **connection** and `MarketSessionStatus` is about the
**session**, and they are deliberately separate — _the market being open does
not mean data is flowing, and the market being shut is not a feed failure_.

A quiet socket at 02:00 is **correct**, and the 165 s threshold does not know
that. Assert it.

## Work

- The venue word, per 3.10.1's decision, in every connection state
- The rule written into `market-feed-grid.test.ts`, with a `pnpm break` entry
- A quiet socket outside market hours asserted as correct
- The cell looked at, at four viewports, in every state it can hold
- `pnpm invariants` extended if the decision creates a second producer risk

## Done when

1. No connection state puts a live word beside a tape the live feed is not
2. The check walks the **producers** rather than one rendering, break-verified
3. A shut market is not a feed failure, asserted
