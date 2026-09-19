# Task 3.4.2 — The first price that moves, with no vocabulary yet

**Status:** Not started
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.1

## Objective

**Put a moving number on a screen, deliberately undesigned**, and stand up the
replay so it can be watched at any hour. This is the instrument the next task's
design decision is taken against.

## What the user can see when this lands

**A price that changes while they watch it** on `/securities/:symbol` — the
first number in this product's history that moves on its own.

**It changes by swapping digits and nothing else.** No flash, no mark, no
colour, no transition. That is the honest starting point rather than a
placeholder: it is what "the correct answer may be very small" looks like at its
smallest, and the next task has to beat it on purpose rather than by default.

## Why the plain version ships first, rather than being skipped

**Open decision 1 says static mock-ups cannot settle a motion decision.** You
cannot design against a still image of a moving thing, and you cannot design
against a number that does not move yet. **So the subject of the decision has to
exist before the decision.**

It is also the story's own argument one level down: a vocabulary designed
against a mock is a vocabulary designed for the easy case, and this story exists
because that already happened once.

## What is already decided and must not be re-taken

- **One surface: the identity block's last price** on the Security Explorer.
  **A vocabulary is a decision and three surfaces would make it three
  decisions**; the universe table is Story 3.6 and the chart is Story 3.7.
- **A number ticks ONCE A MINUTE or less, never continuously** (§10.1, §7.6).
  There is no intra-minute movement on any screen in this epic — trades cannot
  reach 518 symbols (§1.4's 30-symbol cap) and no story delivers them. **Do not
  build anything that assumes a stream of ticks.**
- **The arrival is a burst, not a trickle**: about **332 bars inside 243 ms**,
  once a minute (§7.4).
- **Tabular numerals are already load-bearing** and become more so: a value that
  changes width must not move anything around it.
- **The existing `LAST SESSION CLOSE` block is a different claim** and this must
  not silently overwrite it. A live price and yesterday's close are two facts;
  decide what the block says when both exist, and say it in words rather than by
  replacing one with the other.

## The replay is the instrument, and it has an hours rule of its own

**ADR 0030's replay of our own stored minute bars** is why this story's design
work no longer waits for 21:30 — it is **real recorded intraday movement**,
available at any hour.

```
MARKET_DATA_PROVIDER=replay NON_LIVE_MARKET_DATA=permitted pnpm dev
```

- **It refuses during a session**, deliberately — `pnpm break
replay-refuses-during-a-session` proves it — so out of hours you replay and in
  session you get the real feed. Nothing has to be remembered.
- **Design at 1×.** The engine takes a speed multiplier and a developer may run
  it faster to iterate, but **the vocabulary is settled at the cadence the
  product actually has.** A language tuned against a 10× replay is designed for
  a market that does not exist.
- **Production never serves it** (ADR 0030, and `NON_LIVE_MARKET_DATA` is the
  guard that refused a mis-configured start once already).

## Work

- **Wire the identity block's price to the store**, for the security on screen.
- **Stand up the replay** and confirm a number moves at 1× while watching it.
- **`pnpm probe` at four widths** and look at the screen — the story requires a
  person to have looked, and this is the first task where there is motion to
  look at.
- **Record what the undesigned version is actually like to watch.** That
  observation is the next task's starting evidence and it is worth writing down
  before anybody has an opinion about a treatment.

## Done when

- A price updates on `/securities/:symbol` **without a page refresh**
- It was watched at **1×** against the replay, and the observation is written
  down
- Nothing animates, flashes or transitions — deliberately
- The last-session-close claim is still honest beside it
- `pnpm verify` passes
