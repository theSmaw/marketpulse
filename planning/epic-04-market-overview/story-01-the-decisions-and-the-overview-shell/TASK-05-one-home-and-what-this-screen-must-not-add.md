# Task 4.1.5 — One home, and what this screen must not add

**Status:** Not started
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.4

## Objective

**The overview is the screen most likely to grow a second clock**, and this
product has already produced that defect four times on one screen.

`PRODUCT_SPEC.md` §9's own sketch puts `LIVE` and `10:42:16 ET` in the
masthead — which **already exist**: the market clock shipped in Story 2.5 and
the feed cell in Story 2.6, with the connection word added by Epic 3. Epic 4's
`EPIC.md` says it in as many words: _"live market status indicators here means
the **connection** state Epic 3 adds beside them, not a second clock."_

**So this task's deliverable is a guard rather than a feature**, and the reason
it is a task is that the rule has been broken before by people who knew it:

- **`FeedStatus` is about the CONNECTION and `MarketSessionStatus` about the
  SESSION**, and collapsing them produced a cell that answered two questions
  and said which for neither, for four days.
- **The connection has ONE home** — the status bar — and every other surface
  stays quiet by decision (ADR 0029's fourth rule; three separate tasks took it
  with measurements).

## What the user can see when this lands

**Nothing new, and nothing duplicated.** The landing page carries the same
clock and the same feed cell as every other route, in the same place.

## Work

- The route confirmed to render **no** second clock, session word or connection
  word — by walking the producers rather than by looking at a screen, which is
  what `market-feed-grid.test.ts` established as the shape of this check
- **A mechanical guard**: the connection and session vocabularies must not
  appear in this route's own markup. `pnpm invariants` already holds
  `connection-words-in-a-renderer` and `feed-words-in-a-renderer` — extend or
  reuse rather than inventing a third
- The break run, and the entry added in the same change
- **The open question recorded rather than answered here**: whether an
  aggregate region needs its own freshness statement is Story 4.4's, and it is
  not the same thing as a connection word

## Done when

1. Nothing on `/` reports the connection or the session except the chrome
2. A check fails if that changes, and it has been proved red
3. The distinction between _the feed stopped_ and _the market is shut_ has
   exactly one home on this screen, and it is the one it has everywhere else
