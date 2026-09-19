# Task 3.3.6 — Closing the backend, and the test that proves the page survives it

**Status:** Not started
**Story:** [3.3 The Browser Stream & `LIVE` in the Chrome](STORY.md)
**Depends on:** 3.3.5

## Objective

**Acceptance criterion 2, which is the one with teeth**: closing the backend
turns the region to `disconnected` **without a refresh**, and leaves every other
region and every number on the page intact.

## What the user can see when this lands

**A page that degrades honestly.** Kill the backend and the feed region says so;
the clock keeps ticking, the charts keep their numbers, and nothing collapses.

## What is already decided and must not be re-taken

- **§36 forbids collapsing to a global error screen**, and names this exact
  case: _"Live feed disconnected — displaying data through 10:42:17."_
  **This is the first story where that is testable.**
- **Degrade incrementally and LOCALLY** — a dropped market socket must leave the
  rest of the workspace and any gathered evidence intact and clearly labelled.
- **`disconnected` is honest here and says nothing more.** Reconnection and the
  staleness thresholds in anger are Story 3.10's; this story shows the state and
  stops.

### The CI shape may make criterion 2 UNOBSERVABLE — read this before writing the spec

**Added 2026-09-19, out of Task 3.3.3.** The story already says a runner with no
credential has no upstream socket. Task 3.3.3 made the consequence sharper than
that sentence reads:

- No credential means no provider, which the gateway reports as
  **`feed: null`**, and `connectionWordFor` returns **`null`** for that — the
  `—` §11.3's grid asks for.
- So on CI the region shows **`NOT CONFIGURED` and no connection word at all**
  — before the backend is killed.
- **And possibly after it too.** If the hook keeps reporting `feed: null` once
  its own socket dies, the region is **identical either side of the kill**, and
  a spec asserting `disconnected` appears fails on a runner for a reason that
  has nothing to do with the degradation it is testing.

**ANSWERED 2026-09-19 — `STORY.md` open decision 3.** The chrome says
**`DISCONNECTED` once our own socket dies, whatever the feed identity**, so on
CI the region reads `NOT CONFIGURED` before the kill and
`NOT CONFIGURED · DISCONNECTED` after it. **Criterion 2 is therefore observable
on a runner** — which is the reason that shape was chosen over silence. Assert
the second cell changing and the first cell **not** changing: the venue is still
honestly _nothing is configured_, and a spec that let them move together would
pass while the product conflated them.

**The superseded worry, kept because it is why this paragraph exists:** — whether losing the
backend is a connection fact the chrome states even when no provider was ever
configured. **Do not write this spec before it is answered**, and check the
answer against `pnpm store:bare` plus `MARKET_DATA_PROVIDER=none` rather than
against a local machine that has a credential. This repository has already paid
a six-minute round trip for asserting something CI could not produce.

## Work

- **Prove the degradation by causing it**, not by stubbing a state. A browser
  test that kills the socket and asserts the region changes **and the rest of
  the page does not** is the only version of this that means anything.
- **Check what CI's store can answer FIRST**, which this story's criteria say in
  as many words: **518 securities and zero bars**, and a runner with **no
  credential has no upstream socket either**. `pnpm store:bare` reproduces that
  shape locally in seconds, and this repository has already paid a six-minute
  round trip for skipping it.
- **Assert the numbers did not move** — criterion 4, _no datum changes as a
  result of this story_, and it is the boundary Story 3.4 depends on. A test
  that only checks the region would pass while a price ticked.
- **One browser test covering connected and disconnected**, per criterion 5.

## Done when

- A browser test drives connected → disconnected **without a refresh**
- The same test asserts every other region and every number is **unchanged**
- What CI's store can answer was checked **before** the suite ran
- `pnpm verify` and `pnpm e2e` pass
