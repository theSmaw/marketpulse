# Task 3.6.6 — A live update asserted in a browser, against what CI can actually answer

**Status:** Not started
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.3

## Objective

Criterion 6: **a browser test covers a live update landing in the table.**

And the half of the criterion that is really the task:

> **CI's store is 518 securities and zero bars and CI has no upstream socket**,
> so this assertion is about a _fixture_ stream or it is about nothing.

## What the user can see when this lands

**Nothing.** A test.

## Why this is a task rather than a line in another one

**This repository has shipped an assertion that only passed while the product
was broken**, and it was in a spec about this epic's own words
(`docs/GAPS.md`, the `e2e/specs/` and `e2e/specs-deployed/` entry). It has also
spent a six-minute CI round trip on an assertion about data CI did not have.

**Three facts about CI shape everything here:**

- **Zero bars.** Every chart is a correct `empty` and every figure on the
  security page is absent. `pnpm store:bare` reproduces that locally in seconds
  and answers in seconds what a CI round trip answers in six minutes.
- **No credential, no socket.** There is no upstream feed to observe.
- **A green run certifies internal consistency, not a vendor.**

So the stream under test must be one the suite **produces**, and the assertion
must be about the **transition** — a number that was one thing and is now
another — rather than about a value CI may not have.

## The trap this task must not walk into

**A store ten days stale answers `5D` empty and `1M` populated**, the readout
strip is absent in one state and present in the other, and the chart moves
**90 px** — which `security-window-change.spec.ts` asserts it does not. The
failure reads as a **layout defect in the product**, complete with a screenshot.
It was mis-diagnosed three times in one session.

**So: run against `DATABASE_NAME=marketpulse_bare` before believing any failure
that looks like layout or a missing figure.** If it passes there and fails
against your own store, the store is the subject.

## Work

- A browser assertion that a row's price **changes** while the page is open,
  driven by a stream the suite controls
- Written against what CI's store and CI's absent credential can answer — no
  assertion on a specific figure that depends on bars existing
- Scope the run while iterating: `pnpm e2e <spec> -g "<name>"` is seconds where
  the suite is about five minutes
- Check the locator against **both** `e2e/specs/` and `e2e/specs-deployed/` — a
  grep over the directory you are editing returns a complete-looking answer and
  the two directories do not share their specs
- Run the whole suite once at the end, against the bare store

## Done when

1. A live update landing in the table is asserted in a real browser
2. The assertion holds against `marketpulse_bare` — verified, not assumed
3. Nothing in it asserts a figure that depends on data CI does not have
4. `pnpm verify` passes and the browser suite is green against the bare store
