# Task 3.4.3 — A stream that drives itself, and the assertion that was missing

**Status:** Not started
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.2

## Objective

**Make a number move.** Task 3.4.2 shipped the screen and could not demonstrate
it, because **none of the three stream implementations delivers an observation
into a running process.** Everything after this is blocked on it.

## What the user can see when this lands

**The first number in this product's history that moves on its own** — the
deliverable Task 3.4.2 owed and could not produce. Digits swapping, nothing
else, exactly as that task designed it.

## Why this is a task rather than a line in 3.4.2

Because it is **not the same work**. 3.4.2 wired a component to a store and took
a design decision about what a block says; this is a backend defect in the seam
underneath, and the three faults below have nothing to do with each other. A
task that contained both would be two tasks with one name.

## What was found, so this does not start from zero

| Provider  | State                                                                     |
| --------- | ------------------------------------------------------------------------- |
| `replay`  | calendar fault **fixed** in 3.4.2; the stored source still yields nothing |
| `fixture` | **has no timer** — it emits only when a test calls `tick()`               |
| `alpaca`  | **`406`** — the deployed backend holds the plan's single connection       |

**Three of the four candidate causes for the replay are ruled out**, measured
rather than assumed:

- `from` resolves to **Friday 2026-09-11 13:30Z** since 3.4.2's calendar fix
- the store holds **390 minute bars per symbol in exactly that window**, for all
  five of `STREAM_SYMBOLS`
- the engine's ceiling arithmetic is right: `ceiling = from + elapsed × speed`,
  so the slice at `from` itself is due **immediately**

**What is left is `createStoredReplaySource`.**

## The shape underneath, which is what this task should actually leave behind

Story 3.2's close found **three implementations with no construction site** and
a green `verify` throughout. This is that one level further out: **three
implementations that are constructed, and none of which drives itself.**

Every test drives them by hand — `tick()`, or an injected event — so **nothing
has ever asserted that a stream left alone in a process produces anything.**
That is what let it survive two stories.

> **The repair is not finished when a number moves. It is finished when
> something would go red if it stopped.**

## Work

- **Fix `createStoredReplaySource`**, or give `createFixtureStream` a timer —
  and say which and why. The fixture is the cheaper route to _a number that
  moves_; the replay is the one Task 3.4.4's design decision needs, because it
  is **real recorded movement** rather than a generator's idea of some.
- **A timer on the fixture must run at the product's own cadence** (§2.1: one
  observation per symbol per minute). A generator emitting faster because it is
  convenient produces a motion decision designed for a market that does not
  exist, which is this story's own warning one level down.
- **Leave the missing assertion behind.** A test that starts a stream, advances
  time, and asserts an observation arrived **without anything calling `tick()`**
  — for whichever implementations are meant to be self-driving. It belongs in
  `pnpm test` with injected timers rather than in a browser.
- **Then finish Task 3.4.2's demonstration**: watch a price change at **1×**,
  `pnpm probe` at four widths, and **write down what the undesigned version is
  actually like to watch.** That observation is Task 3.4.4's starting evidence
  and is worth having before anybody has an opinion about a treatment.

## Done when

- A price updates on `/securities/:symbol` **without a page refresh**, watched
  at **1×**
- **A test fails if a stream stops driving itself** — the assertion that was
  missing, not just a working stream
- Which implementation was fixed, and why that one, is written down
- The observation of the undesigned version is recorded for Task 3.4.4
- `pnpm verify` passes
