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

## Amended by Task 4.1.1 — 2026-09-25: this screen will carry TWO kinds of "how current is this", and they must not be confused

**The denominator decision is taken and it puts a freshness sentence on
screen**: _of the 518 we track, N were heard from in the last M minutes_
(Story 4.4).

**That is a second statement about currency on a screen whose chrome already
makes one**, and the two answer different questions:

| Says                              | About                                                                   | Home                             |
| --------------------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| `LIVE` / `STALE` / `DISCONNECTED` | **the connection** — is data arriving at all                            | the status bar, and nowhere else |
| _N of 518 in the last M minutes_  | **the coverage of one figure** — how much of the market this number saw | beside the figure it qualifies   |

**They can legitimately disagree**, and that is the point rather than a defect:
a healthy `LIVE` feed with 340 of 518 names heard from in the last two minutes
is the ordinary state of IEX, and a reader must not read the denominator as a
feed fault.

### What this adds to this task

- **The guard is not "no currency statements outside the chrome"** — that would
  forbid the denominator. It is **no connection or session vocabulary** outside
  the chrome, which is what `connection-words-in-a-renderer` and
  `feed-words-in-a-renderer` already assert.
- **Check the denominator's wording against those two checks before Story 4.4
  writes it.** A sentence that reaches for `live`, `stale` or `disconnected` to
  describe coverage would trip a guard that exists for a different reason — and
  would deserve to.
- **Record the distinction where Story 4.4 will read it**, in its own words,
  rather than leaving it here.

## Amended by Task 4.1.4 — 2026-09-25: the route got small, and one new invariant looks like the opposite of this task's

**The check this task owes is now nearly trivial to perform**, and that is worth
saying rather than discovering. After Task 4.1.4 the route file is **135 lines
and imports two things**: `Region`, and its own stylesheet. It renders no
component that could carry a clock, a session word or a connection word, and
**walking the producers is reading one import list**.

**Do the walk anyway.** The point of the check is not its difficulty; it is that
the next author who adds a component here has a recorded reason not to reach for
`FeedIndicator`.

### And one thing that will look like a contradiction

Task 4.1.4 added **`the-workspace-package-reaches-the-bundle`**, which asserts
the live feed's sentence — _Trades reported by the IEX exchange only…_ — **is in
the frontend bundle.** Beside it sits `feed-words-in-a-renderer`, which asserts
feed words are **not** in a renderer.

**They are not in tension and a reader should not have to work that out.** One
is about the **package reaching the browser at all**; the other is about
**which module may spell the words**. The sentence belongs to shared, ships in
the bundle, and is rendered by the surface that owns provenance — all three at
once.

**Whatever guard this task adds must be written so the pair still reads as two
questions rather than one contradiction**, and if the cheapest way to do that is
a sentence in the invariant's own comment, write the sentence.
