# Task 3.6.6 — A live update asserted in a browser, against what CI can actually answer

**Status:** **Complete — 2026-09-22.** `e2e/specs/universe-live-update.spec.ts` — two tests, both green against `marketpulse_bare` and against a developer's store, both break-verified (`the-table-ignores-the-live-price`, `the-table-marks-no-arrival`). The stream is the spec's own, every assertion is a transition, and nothing in it names a figure that depends on bars existing. The whole suite ran against the bare store: 139 passed, and the one failure — the window-change spec's chart-move assertion, under a load average near 50 — passed 11 for 11 alone against the same store, which is the load-shaped failure `docs/GAPS.md` documents rather than a defect.
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

---

## What was done — 2026-09-22

### 1. The spec, and the shape it copies

`e2e/specs/universe-live-update.spec.ts` answers the market socket **from the
test** — `security-price-motion.spec.ts`'s `serveFeed` pattern, built with the
shipped encoder so a protocol change breaks it at the compiler — and drives
`/securities`, where the page subscribes to all 518 securities by being on it
(Task 3.5.6). The snapshot on connect is what makes a price exist on first
paint; the returned `push` is what makes one **arrive**.

**Two tests, and each is a transition rather than a value:**

- **_A bar arriving changes a row's price with no reload, and moves nothing
  else._** The snapshot puts `219.50` in NVDA's `Last` cell, spoken as `Live
price`; a pushed bar takes it to `220.25`, the old figure is gone, and the
  spoken word survives. Then the two things a person would notice if they
  went wrong: **AAPL's cell is exactly what it was**, and **every row is where
  it was** — the symbol order before and after the frame is asserted equal,
  which is Task 3.6.3's decision asserted where it is visible.
- **_The arrival marks the row that arrived, and only that row._** Two live
  prices from the snapshot and **zero marks** — a snapshot is not an arrival
  (Task 3.5.4), and at universe scale that is the difference between a table
  that populates and one that flashes (Task 3.6.2). One pushed bar, **one
  mark, on NVDA's row**, none on AAPL's, one in the whole region — and the
  mark's `animation-name` is the vocabulary's own `arrival-decays`, asserted
  on the animation rather than a sampled opacity for the motion spec's reason.

### 2. What was NOT asserted, and why each absence is deliberate

- **No figure that depends on bars.** On CI and against `marketpulse_bare`
  AAPL's cell is an em dash with `No close yet` spoken; against a developer's
  store it is a stored close with its session date. The spec **captures** that
  cell before the frame and asserts it **unchanged** after, so both stores are
  right. The `Change` column is not asserted at all: its figure derives from a
  stored close, which CI does not have.
- **No `Live price` count across the table**, because a developer's store and
  the bare one disagree about which rows carry a stored close and the count
  would be an assertion about the store.
- **No duration.** `e2e/README.md`'s rule; a timing on a shared runner is
  noise. What a tick costs is Task 3.6.5's, with its own instrument.
- **Nothing about whether a frame ever arrives.** The spec furnishes the wire,
  so its two green tests say everything about what the browser does with an
  arrival on this table and nothing about whether the gateway sends one. That
  is the price the motion spec already pays and the README already records;
  the sentence is now written for this spec too, in the README's own list of
  what a green run does not certify.

### 3. One handle, two surfaces — and the motion spec re-scoped

The table's mark had no DOM handle; the identity block's has carried
`[data-arrival]` since Task 3.4.8, which recorded it as _the_ handle. The
table's mark now carries the same attribute — one vocabulary, one handle —
which meant the motion spec's `markOf` locator, a page-wide `[data-arrival]`,
would have counted two marks on `/securities/NVDA`: the figure's and the NVDA
row's, because that page renders the table below the block. **It is scoped to
the identity block now**, with the reason in its doc comment, and all six of
its tests pass unchanged in meaning.

### 4. The locator, checked against both directories

`e2e/specs-deployed/tracked-universe.spec.ts` and `e2e/specs/securities-route.spec.ts`
both locate a row as `region.getByRole("row", { name: /^AAPL / })` inside the
`Tracked universe` region, and this spec does the same. The `Last` cell is
located **structurally** — the fourth `cell` after the row header — rather than
by its text, because its text is exactly what is under test.

### 5. The one defect the first run found was in the spec

`toHaveText(appleBefore)` failed against a cell that had not changed:
`innerText()` reads the visually-hidden `No close yet` on its own line and the
matcher's default reader collapses it to a space, so the two never agree.
`useInnerText: true` reads both sides the same way. Recorded because it is the
shape `e2e/README.md` already warns about — _not a single element's text where
a component splits it_ — arriving through the whitespace rather than the
words.

### 6. Verified, not assumed

- **Against `marketpulse_bare`** — `pnpm store:bare`, then
  `DATABASE_NAME=marketpulse_bare pnpm dev`: both tests green in 4.1 s, and
  the motion spec's six green beside them after the re-scope.
- **Against a developer's store** the same spec passes, because nothing in it
  names what an untouched cell contains.
- **The whole suite against the bare store** — 139 passed, one failed:
  `security-window-change.spec.ts`'s _pressing a window does not move the
  chart at desktop_, reporting a 68 px move, under a load average near 50.
  That is the exact shape this task's own trap describes, so it was re-run
  **alone against the same bare store** before being believed either way: 11
  passed in 18.6 s. `docs/GAPS.md`'s rule — read `uptime` before believing a
  red run, re-run one failing spec alone — applied as written.
- **Both breaks landed.** `the-table-ignores-the-live-price` hands every row
  `live={undefined}` and the transition test goes red; `the-table-marks-no-arrival`
  drops the handle and the mark test goes red. Both restored byte-identical.

## For a stakeholder — a status report, 2026-09-22

**Where the product is.** The securities page shows live prices for all 518
tracked companies, updating once a minute, each arrival marked with a small
disc that fades. The last five tasks built that, decided how it behaves, made
it fast enough, and measured how quickly a price reaches the screen. **This
task asked a simpler question: do we have an automatic test that would tell us
if it stopped working?**

**Why that is harder than it sounds.** Our automated checks run on a machine
that has **no market data at all** — no stored prices and no connection to the
market feed. That is deliberate: those checks must run without credentials,
anywhere, in minutes. But it means a test cannot say "the row shows 219.50"
because on that machine there is no 219.50 to show. This project has been
caught by that twice: once a test passed only while the product was broken,
and once a six-minute check failed over a number the machine never had.

**What we did.** The test brings its own market. It stands in for our server's
live feed, sends the browser a starting price for NVIDIA, then sends a new one
— and checks three things a person would check: the number in NVIDIA's row
**changed** to the new one without reloading the page; Apple's row, which
received nothing, is **exactly as it was**; and **no row moved** — the table
stayed in the order it was in. A second test checks the little disc: nothing
is marked when the page first fills (that would be 518 discs flashing at a
reader who just arrived), and when one bar arrives, **one** row is marked — the
right one.

**Why we made the decisions we did.**

- **We test the change, not the number.** Every check is "it was this, now it
  is that", so the same test is right on a machine with no data and on a
  developer's machine full of it. That is what lets it run on every merge
  without a credential.
- **We proved the test can fail.** A test that has never gone red has never
  been tested. We deliberately broke the product two ways — stopped the table
  receiving live prices, and removed the disc — and confirmed the test caught
  both, then put everything back automatically.
- **We ran it against a copy of the empty machine before trusting it**, rather
  than finding out from a slow round trip. That copy takes seconds to build
  and is what the whole test suite was run against at the end.
- **We said what it cannot tell us.** This test knows what the browser does
  when a price arrives. It does not know whether one ever will, because it
  supplied the price itself. That gap is written down next to the test, so
  nobody reads a green tick as more than it is.

**What a user can see today: nothing new.** What it unlocks is confidence: the
headline of this story — 518 prices moving on their own — is now guarded by a
check that runs on every change, and the story's closing task inherits that
rather than having to trust a screenshot.
