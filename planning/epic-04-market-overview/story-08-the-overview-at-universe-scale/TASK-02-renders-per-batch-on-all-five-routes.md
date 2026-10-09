# Task 4.8.2 — Renders per batch, on all five routes

**Status:** **Complete — 2026-10-09.** A count, on all five routes, proved four ways. **2 renders per applied batch** on `/`, `/securities` and `/securities/:symbol`; **1** on `/investigations`, `/replay` and the not-found route, which the gateway sends no `bars` frame at all. Derived at 6.8–16.1 batches a minute: **13.6–32.2** and **6.8–16.1** renders a minute. The inherited sentence was wrong twice and is corrected at three live sites; the historical one is left standing. The two frames of a batch are **two tasks** and the single commit is React's, decided by an inter-frame gap of 4.4–33.1 ms.
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1

## Objective

**Every inherited figure in this story is a cost per render, and nobody has
counted renders.** This task counts them — a **count, not a timing**, so it is
the one arm the machine's load cannot corrupt.

## What the user can see when this lands

**Nothing.** It corrects a sentence three live documents carry.

## Work

### The claim this task exists to correct, and it is wrong twice

Three live sites say _"a security page subscribed to one symbol went from about
one whole-tree render a minute to up to sixteen"_ — `docs/GAPS.md`,
`epic-04-market-overview/EPIC.md` and this story's own text. **Both halves are
false.**

- **`/securities/:symbol` subscribes to all 518**, not one.
  `SecurityExplorer`'s `liveSymbols` adds every security in the loaded
  universe, because `UniverseTable` renders on that route too. So it already
  received a `bars` frame per applied batch **before** Story 4.2 — it went
  **~16 → up to ~32**, one extra render per batch rather than fifteen new ones.
- **"One a minute" is the FIXTURE's cadence**, not the feed's.
  `createFixtureStream` ticks at `tickEveryMs = 60_000` and emits all 518 in
  one batch — and that is the feed every production-build figure in Task 3.6.5
  was taken against. The real feed is **8.8–16.1 batches a minute**.

**The routes that really went from ~0 to ~16 are `/investigations`, `/replay`
and the not-found route**, which subscribe to nothing, so before Story 4.2
every `feed` frame was collapsed by `sameLiveFeedView` and nothing re-rendered.
**The owner's Gate 1 decision is to measure and record these, and NOT to
repair them** — the repair is a module-boundary change and the figure may well
be single-digit.

### The open question a count answers and a timing cannot

Whether `/securities/:symbol` is 32 or 16 depends on something no file can
answer: **whether Chromium dispatches the gateway's back-to-back `overview` and
`bars` frames in one task**, in which case React batches both `setView` calls
into one commit. Count it.

### What to count, and against what

Renders per **applied batch**, per route — `/`, `/securities`,
`/securities/:symbol`, `/investigations`, `/replay` — against a known batch
count, using 4.8.1's proved commit counter. Renders per minute is **derived**
from the cadence and stated as derived.

### And the correction is three live sites plus one that must not be touched

`story-05-*/TASK-06-*.md` carries a correct claim about a different thing and
is a **historical record**. Amend the live sites; leave it standing.

### Also discharge, because the condition fired twelve days ago

`docs/GAPS.md`'s owner clause for the four-route re-render reads _"Story 4.8 is
the first candidate and its scope is `/` only, so if it takes this it is
widening deliberately"_ — written 2026-09-26, and this story's own scope was
widened to all five routes on 2026-09-27. **The entry does not know its own
condition fired.**

## Done when

1. Renders per applied batch measured on all five routes, with the batch count
   proved rather than assumed
2. The one-frame-or-two question answered for the `overview`/`bars` pair
3. The three live sites corrected; the historical one left standing, and the
   count of each recorded
4. `docs/GAPS.md`'s stale owner clause amended with the reading

## Handed here by Task 4.8.1 — 2026-10-09: the harness exists, is proved, and three of your premises about HOW to run it are now different

**Everything below was measured in Task 4.8.1's own proof run; its transcript
is in that file.**

- **Use `scripts/overview-instrument.mjs`.** `startProductionPair()` builds its
  own artefact (`vite build` is **0.6–0.7 s** on rolldown) into
  `.capture/instrument/dist` and serves it on **:4273** with the backend on
  **:3100**, so it runs **beside a running `pnpm dev`** rather than instead of
  it. It asserts the production fingerprint off the wire and prints
  `PRODUCTION BUILD` with the bundle name and size.
- **The 3.6.4/3.6.5 recipe is unsafe as written.** `MARKET_DATA_PROVIDER=fixture`
  against `DATABASE_NAME=marketpulse` makes Story 3.8's live bar writer store
  **invented minute bars in the developer's own store**, 518 a minute. The
  harness defaults the provider to `none` and **refuses** a stream against
  `marketpulse`; name a scratch store (`pnpm store:bare` builds
  `marketpulse_bare`, which is also CI's shape).
- **The load ceiling is ratio 1.0 and it exits non-zero.** `--ceiling <ratio>`
  raises it and the raise is printed in the transcript. It refused twice for
  real during 4.8.1, because a previous run's planted spinners had not decayed
  out of the one-minute average — allow **60–90 s** between runs.
- **Load average alone is not something a browser can feel.** 24 spinning Node
  processes on 8 cores — Story 4.5's measured 23–33 exactly — moved this page's
  calibrator **not at all** (1.2 ms quiet, 1.2 ms loaded). What moved it was
  eight blocked **renderer** processes. So do not read a quiet load average as
  a quiet machine, and do read the calibrator's discard count.
- **The calibrator discriminates at the tail, not the median**: quiet
  `p50 1.2 / p95 1.3 / max 1.5`, loaded `p50 1.3 / p95 2.6 / max 9.7`. Discards
  were **0 / 120** quiet and **24 / 120** loaded. Report the discard count with
  every figure.
- **Four channels are proved and one is new.** The long-frame observer
  (self-test tagged and excluded, then a 180 ms plant caught in the acceptance
  channel), the continuous rAF-gap recorder, **a script clock per burst** — the
  remainder of the delivering task, via a `MessageChannel`, which is the one
  figure LoAF structurally cannot give because it has no entry below 50 ms —
  and a commit counter on `__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot`,
  which production React does call (**16 → 27** on a planted route change).
- **The repaint stamp on `/` is `main`, measured.** Six quiet seconds gave
  **6 mutation records on `body` and 0 on `main`** — the masthead clock and the
  status bar are outside `<main>`. There is **no fallback**: an absent target
  reports nothing, and `distribution()` returns `null` rather than zero
  everywhere.
- **`document.visibilityState` is asserted on every page the harness opens**,
  and the socket wrapper carries `wrapperIntact` — if Playwright's own
  `WebSocket` replaces it, the arm reports nothing rather than n = 0.

---

## What was done — 2026-10-09

**Status:** Complete. **No code changed and no check was added** — this is a
count and three document corrections. Two throwaway instruments were written,
run and **deleted**; their transcripts and one verbatim frame of each type are
below, which is `ALPACA.md` §11's shape and the 2026-09-18 lesson about an
instrument whose conclusion outlived its evidence.

### The answer, in one table

**Renders per applied batch**, where a render is one
`__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot` call — Task 4.8.1's proved
commit counter, which moved 16 → 27 on a planted route change.

| route                 | subscribed | frames a batch delivers | renders per batch            | a minute at 6.8–16.1 batches | before Story 4.2 |
| --------------------- | ---------- | ----------------------- | ---------------------------- | ---------------------------- | ---------------- |
| `/`                   | **25**     | `overview` + `bars`     | **2** (1 when the gap <2 ms) | **13.6–32.2**                | **0**            |
| `/securities`         | **518**    | `overview` + `bars`     | **2** (1 when the gap <2 ms) | **13.6–32.2**                | 6.8–16.1         |
| `/securities/:symbol` | **518**    | `overview` + `bars`     | **2**, 4 of 4                | **13.6–32.2**                | 6.8–16.1         |
| `/investigations`     | **0**      | `overview` only         | **1**, 10 of 10              | **6.8–16.1**                 | **0**            |
| `/replay`             | **0**      | `overview` only         | **1**, 10 of 10              | **6.8–16.1**                 | **0**            |
| `*` (not found)       | **0**      | `overview` only         | **1**, 10 of 10              | **6.8–16.1**                 | **0**            |

**Renders per minute is DERIVED and says so.** The cadence is
`LIVE-DATA.md` §9.5/§10.2 — _332 bars in **8.8 frames per minute** at the open,
284 in **6.8** at midday, 450 in **16.1** at the close_ — and no feed this
repository can run offline produces it, which is Gate 1's premise 2. Note this
task's own brief narrowed that to _8.8–16.1_; the **minimum is 6.8**, at
midday, and it is the figure that makes the quiet part of the day honest.

**Plus one path on `/` that is not a batch.** A **mover substitution** changes
`symbolKey`, the effect re-subscribes, and the gateway answers a `subscribe`
with a snapshot **and another aggregate** — `sendSnapshot()` sends both, in that
order. Measured **3 renders, 10 of 10**, against 1 for the same furnished batch
without the substitution: a substitution costs **+2**. At Task 4.5.5's measured
0.21–0.45 substitutions a minute that is **+0.4–0.9 renders a minute**, which
is the smallest term here and is recorded so nobody re-derives it.

### How the batch count was proved rather than assumed

Four ways, and the fourth is the one that mattered:

1. **Node sent it.** One batch per window, counted by the loop.
2. **The page received it.** Task 4.8.1's socket wrapper notes one `frame` row
   per message, **counted by URL** (Task 3.11.2's rule), with `wrapperIntact`
   **true** on every route — so Task 4.5.8's silently-overwritten-`WebSocket`
   failure would have reported nothing rather than zero.
3. **A control arm.** Same phase, nothing sent: **0 commits, 10 of 10, on all
   six routes.** This is what makes a 1 a 1 — the background rate is
   `useMarketClock` at 1 Hz plus `useBackendHealth` every 30 s, and the window
   is placed where neither lands.
4. **The real gateway, with its own socket.** The furnished arm's answer was
   **wrong** and the fidelity arm corrected it. See below.

**The window is phase-aligned to the wall clock, and that is the whole trick.**
`useMarketClock` schedules to the second boundary (`1000 - instant % 1000`), so
its commit lands at phase ~0–5 ms. The window is **[200 ms, 850 ms)** of each
wall-clock second with the batch sent at **400 ms**, which puts 200 ms of margin
either side. Every commit in the real-gateway arm was printed **with its
wall-clock phase** rather than subtracted, so the clock's commits are visible in
the transcript: a dense column at `p997–p3` and a batch's at `p528–p760`.

**And the subject-changed check, per route.** `main`'s `innerText` either side
of **one** batch:

- `/` — changed: `SPY 100.00 ▲ up +1.50%` → `SPY 107.77 ▲ up +9.27%`
- `/securities` and `/securities/:symbol` — changed: `LATEST PRICE 115.76` →
  `115.11`
- `/investigations`, `/replay`, `*` — **unchanged, byte for byte.** That is the
  finding rather than a hole: the whole-tree render on those three produces
  **identical output**, so no DOM check can prove the subject moved there and
  the proof is the frame row plus the commit against a control arm reading 0.

### The one-frame-or-two question: TWO tasks, and the single commit is REACT'S

The brief asked whether Chromium dispatches the gateway's back-to-back
`overview` and `bars` frames in one task, _"in which case React batches both
`setView` calls into one commit"_. **The premise is half right and the
mechanism is not.**

**They are two tasks.** A 60 ms block was planted in a `message` listener on
every market-stream frame, installed **inside** the instrument's own wrapper so
`wrapperIntact` stayed the instrument's own mark. On all three subscribing
routes it produced:

```text
longEntries: [{"entryType":"longtask","ms":60},{"entryType":"longtask","ms":60},
              {"entryType":"long-animation-frame","ms":122}]
longtaskCount: 2    longtaskMs: [60,60]
trace: ["frame:overview@58526.7","frame:bars@58587.2",
        "endOfTask#89@58587.6 task=60.9ms","endOfTask#90@58590.4 task=3.2ms"]
```

and on the three placeholder routes — which receive one frame — **one**
`longtask` of 60 ms beside a 62.2–67.6 ms `long-animation-frame`.

**`longtask` is per TASK; `long-animation-frame` spans every task inside one
rendering frame.** So the LoAF figure of 122–130.7 ms, read on its own, says
_one 120 ms task_ and is **wrong** — this instrument's first verdict function
made exactly that mistake and was corrected by its own output. Two 60 ms
`longtask` entries is two tasks, and that is the airtight reading.

**The `MessageChannel` trace is NOT airtight and is worth knowing why.**
`openBurst` posts to a `MessageChannel` when a frame lands, and that message
cannot run until the delivering task ends — so `frame, endOfTask, frame` proves
a task boundary, but `frame, frame, endOfTask` does **not** prove one task:
cross-task-source ordering is not FIFO, and the transcript above shows it
plainly (`endOfTask#89` was queued during the overview's task and ran **after**
the bars frame). Both interleavings occurred in the same run on different
routes. A long-task entry is a fact about one task's duration; a
`postMessage` ordering is a fact about a scheduler's choice.

**What actually decides the commit count is the inter-frame GAP**, and it is a
timing inside a count:

| sitting                                     | inter-frame gap (ms)      | renders per batch |
| ------------------------------------------- | ------------------------- | ----------------- |
| `/`, single client, n = 4                   | 0.5, 5.1, 5.7, 5.3        | **1**, 2, 2, 2    |
| `/`, two clients attached, n = 5            | 8.4, 5.1, 6.8, 4.4, 5.6   | 2, 2, 2, 2, 2     |
| `/securities`, single client, n = 4         | 23.4, **1.5**, 24.0, 32.8 | 2, **1**, 2, 2    |
| `/securities/:symbol`, single client, n = 4 | 26.4, 33.1, 30.3, 23.7    | 2, 2, 2, 2        |

**17 real applied batches: 2 renders in 15 of them, 1 in 2 — and both of those
two had a gap under 2 ms.** The boundary sits between ~1.5 ms and ~4.4 ms,
which is React's scheduler turnaround: a default-lane update from a socket
message is committed in a later `MessageChannel` task, so if that task runs in
the gap the batch costs two commits and if it does not it costs one.

**The furnished socket could not have answered this, and said 1.1–1.2.**
Through `page.routeWebSocket` the two frames arrive **0.4–6.6 ms** apart, so the
furnished arm read `[2,1,2,1,1,1,1,1,1,1]` on `/` and `[1,1,1,2,1,1,1,1,1,1]`
on `/securities/:symbol` — a mode of 1 and a mean of 1.1–1.2, which is the
**wrong answer**, published from an artefact of a CDP relay. The real gateway's
gap is wider because the two sends have real work between them: `broadcast` to
every client, then `scopedTo` and an encode per client, and on the browser's
side a **58–59 KiB** `bars` body to parse against the aggregate's 1.65 KiB.
That is the whole reason the fidelity arm exists, and it is the single most
transferable thing in this task.

### What was measured incidentally, and belongs to tasks 4.8.3 and 4.8.5

Not this task's figures — it is a count, and these are timings taken from the
same transcripts. They are recorded because they came free and because a
timing somebody has to go back for is a timing nobody takes.

- **`/securities/:symbol`, real gateway, one applied batch is ~55–62 ms of
  commit-to-commit work**: `overview@59115 → commit@59140.4` is **25.4 ms**,
  `bars@59141.4 → commit@59175.6` is **34.2 ms**. §28's **routine** 50 ms line
  is a per-task line and each of these is under it; the **batch** is not.
- **The furnished `endOfTask` script clock on `/securities`** read
  `task=97.8ms`, `50.6ms`, `39.5ms`, `25.8ms` for the render that follows a
  `bars` frame at 518 rows, and `0.3–1.5 ms` for the delivering task itself.
  Channel 3 is reading the right thing; the figure is 4.8.5's to take properly.
- **A cold load on `/` sends a `subscribe` with ZERO symbols.** The
  `subscribeSymbolCounts` series is `[0, 25, 25, …]`: `symbolKey` is `""` until
  the first aggregate arrives, the effect fires anyway, and the gateway answers
  an empty subscribe with a **snapshot and an aggregate** — two frames and two
  renders for a question with no content. `/securities*` has the same shape
  with `[1, 518]`: one subscribe for the route's own symbol, one for the
  universe. **Four extra frames per cold load on the two securities routes, two
  on `/`.** Task 4.8.6's.
- **Frame bytes, measured off the wire by the page's own wrapper**: `snapshot`
  148 B empty, `overview` **928 B** with no sections populated and
  **1,648–1,654 B** with all four, `feed` **126 B**, `bars` **1,762–1,811 B** at
  15 symbols and **58,187–59,475 B** at 518. The `docs/GAPS.md` entry's
  `431 bytes` for the aggregate is **superseded**: that figure predates the
  sector, breadth and movers sections.

### The three live sites corrected, and the count of each

| file                                       | occurrences                                                                                                   | what it now says                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/GAPS.md`                             | **1** sentence, plus the heading, the `Story 4.8 owns…` paragraph and the stale `Owner:` clause — **4 edits** | The sentence struck and corrected in place; a dated reading under the heading; the owner clause recorded as **fired on 2026-09-27** and re-owned to 4.8.5 and 4.8.3                   |
| `planning/epic-04-market-overview/EPIC.md` | **1**                                                                                                         | Struck, with the measured figures and the two-task finding beside it                                                                                                                  |
| `.../story-08-…/STORY.md`                  | **2** — the live claim at §_Your scope is now all five routes_ and Gate 1's own premise 4                     | The first struck and corrected; the second **confirmed and sharpened** rather than struck, because it was substantially right — `~16 → ~32` is the **close's** cadence, not the day's |

**And the one left standing.** The brief named `story-05-*/TASK-06-*.md`; the
file that actually carries the phrase is
`planning/epic-03-live-market-data/story-05-subscription-management-and-current-market-state/TASK-06-a-browser-receives-only-what-it-asked-for.md`,
Done-when 1 — _"A client subscribed to one symbol receives one symbol's
observations while a second client subscribed to the universe receives all of
them"_. **1 occurrence, left standing**: it is a correct claim about a different
thing (a test's two clients, not a route) and it is a historical record of what
Story 3.5 asserted. Grepped `docs/`, `planning/` and `CLAUDE.md` for
`subscribed to one symbol` and for `one whole-tree render a minute`; **6 and 2
hits**, of which two are this task's own file.

### `docs/GAPS.md`'s stale owner clause — discharged as stale, re-owned as open

The clause read _"Story 4.8 is the first candidate and its scope is `/` only,
so if it takes this it is widening deliberately"_, written 2026-09-26. **The
scope was widened to all five routes on 2026-09-27** and the clause went on
describing a scope the story had already left for twelve days. It now records
that the condition fired, carries the reading, and re-owns the half a count
cannot answer: **Task 4.8.5** for the per-tick script cost on
`/securities/:symbol` and **Task 4.8.3** for the backend leg. The entry's
`Re-measure:` line is sound in substance and its recipe is not — it points at
Task 3.6.5's instrument, whose `MARKET_DATA_PROVIDER=fixture` against the
primary store writes invented bars at 518 a minute — so it now points at entry
14's 2026-10-09 amendment and at `scripts/overview-instrument.mjs`.

### The transcript, verbatim

The furnished arm, `--windows 10`, production build, one page per route:

```text
Renders per applied batch — Task 4.8.2

  Load average 2.84 across 8 cores (ratio 0.354) against a ceiling of 1.00.
  built .capture/instrument/dist in 0.6 s (VITE_API_BASE_URL=http://127.0.0.1:3100)
  pair up — PRODUCTION BUILD
    frontend http://localhost:4273 (vite preview, index-BnqVOSWf.js, 398 KiB)
    backend  http://127.0.0.1:3100 (dist/index.js, provider=none, store=marketpulse_bare, CORS_ORIGIN=http://localhost:4273)
  universe from the pair's own backend: 518 symbols

| route | arm | n | commits per window | distinct |
| / | control | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| / | overview+bars | 10 | [2,1,2,1,1,1,1,1,1,1] | [1,2] |
| / | overview-only | 10 | [1,2,1,1,2,1,2,2,2,2] | [1,2] |
| / | bars-only | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| / | overview+bars(churn) | 10 | [3,3,3,3,3,3,3,3,3,3] | [3] |
| /securities | control | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| /securities | overview+bars | 10 | [1,1,2,1,2,1,1,1,1,1] | [1,2] |
| /securities | overview-only | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /securities | bars-only | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /securities | overview+bars(churn) | 10 | [1,1,1,1,1,1,1,2,1,1] | [1,2] |
| /securities/:symbol | control | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| /securities/:symbol | overview+bars | 10 | [1,1,1,2,1,1,1,1,1,1] | [1,2] |
| /securities/:symbol | overview-only | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /securities/:symbol | bars-only | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /securities/:symbol | overview+bars(churn) | 10 | [1,1,1,1,1,1,1,1,1,2] | [1,2] |
| /investigations | control | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| /investigations | overview+bars | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /investigations | overview-only | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /investigations | bars-only | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| /investigations | overview+bars(churn) | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /replay | control | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| /replay | overview+bars | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /replay | overview-only | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| /replay | bars-only | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| /replay | overview+bars(churn) | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| * (not found) | control | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| * (not found) | overview+bars | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| * (not found) | overview-only | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
| * (not found) | bars-only | 10 | [0,0,0,0,0,0,0,0,0,0] | [0] |
| * (not found) | overview+bars(churn) | 10 | [1,1,1,1,1,1,1,1,1,1] | [1] |
```

Per-route evidence, verbatim, one line each:

```text
/                    {"subscribeSymbolCounts":[0,25,25,25,25,25,25,25,25,25,25,25],"subscribedWhenMeasured":25,"observerProved":true,"observerEntries":3,"repaintTarget":"main","wrapperIntact":true,"oneBatchChangedMain":true,"oneBatchFirstDifference":{"at":39,"was":"ERVIEW\nMarket proxies\n\nSPY\n\n100.00\n▲\nup\n+1.50%\n\nQQQ\n\n101.00\n","now":"ERVIEW\nMarket proxies\n\nSPY\n\n107.77\n▲\nup\n+9.27%\n\nQQQ\n\n108.77\n"},"calibrator":{"n":20,"p50":1.5,"p95":2.7,"max":2.7,"min":1.1},"taskProbe":{"longtaskCount":2,"longtaskMs":[60,60],"reading":"2 TASKS, [60,60] ms"}}
/securities          {"subscribeSymbolCounts":[1,518],"subscribedWhenMeasured":518,"observerProved":true,"observerEntries":3,"repaintTarget":"main","wrapperIntact":true,"oneBatchChangedMain":true,"oneBatchFirstDifference":{"at":150,"was":"T · NASDAQ\n\nLATEST PRICE\n\n115.76\n\nOct 9 · 03:07 EDT · pre-ma","now":"T · NASDAQ\n\nLATEST PRICE\n\n115.11\n\nOct 9 · 03:07 EDT · pre-ma"},"calibrator":{"n":20,"p50":1.9,"p95":2.7,"max":2.7,"min":1.4},"taskProbe":{"longtaskCount":2,"longtaskMs":[60,60],"reading":"2 TASKS, [60,60] ms"}}
/securities/:symbol  {"subscribeSymbolCounts":[1,518],"subscribedWhenMeasured":518,"observerProved":true,"observerEntries":3,"repaintTarget":"main","wrapperIntact":true,"oneBatchChangedMain":true,"calibrator":{"n":20,"p50":1.8,"p95":2.7,"max":2.7,"min":1.5},"taskProbe":{"longtaskCount":2,"longtaskMs":[60,60],"reading":"2 TASKS, [60,60] ms"}}
/investigations      {"subscribeSymbolCounts":[0],"subscribedWhenMeasured":0,"observerProved":true,"observerEntries":2,"repaintTarget":"main","wrapperIntact":true,"mainTextLength":[267,267],"oneBatchChangedMain":false,"oneBatchFirstDifference":null,"calibrator":{"n":20,"p50":1.9,"p95":3.2,"max":3.2,"min":1.4},"taskProbe":{"longtaskCount":1,"longtaskMs":[60],"reading":"1 TASKS, [60] ms"}}
/replay              {"subscribeSymbolCounts":[0],"subscribedWhenMeasured":0,"observerProved":true,"observerEntries":2,"repaintTarget":"main","wrapperIntact":true,"mainTextLength":[256,256],"oneBatchChangedMain":false,"oneBatchFirstDifference":null,"calibrator":{"n":20,"p50":2,"p95":3.2,"max":3.2,"min":1.6},"taskProbe":{"longtaskCount":1,"longtaskMs":[60],"reading":"1 TASKS, [60] ms"}}
* (not found)        {"subscribeSymbolCounts":[0],"subscribedWhenMeasured":0,"observerProved":true,"observerEntries":2,"repaintTarget":"main","wrapperIntact":true,"mainTextLength":[230,230],"oneBatchChangedMain":false,"oneBatchFirstDifference":null,"calibrator":{"n":20,"p50":1.9,"p95":3.9,"max":3.9,"min":1.2},"taskProbe":{"longtaskCount":1,"longtaskMs":[60],"reading":"1 TASKS, [60] ms"}}
```

The fidelity arm — the **real** gateway, `MARKET_DATA_PROVIDER=fixture` against
`DATABASE_NAME=marketpulse_bare`, one client per sitting, 4 minutes each. Every
commit is printed with its wall-clock phase; `p997`–`p42` is
`useMarketClock`'s own, `p528`–`p764` is the batch's.

```text
--- /     (single client)
    overview  now=58973.3 n=0 bytes=1653
    bars      now=58973.8 n=15 bytes=1762
    overview  now=118971.3 n=0 bytes=1649
    bars      now=118976.4 n=15 bytes=1800
    overview  now=178977.3 n=0 bytes=1652
    bars      now=178983 n=15 bytes=1802
    overview  now=238973.8 n=0 bytes=1654
    bars      now=238979.1 n=15 bytes=1811
  per batch:
    batch 4: frames=["overview","bars"] interFrameGapMs=0.5 commits=1 at [58980.3]
    batch 5: frames=["overview","bars"] interFrameGapMs=5.1 commits=2 at [118976.2,118980]
    batch 6: frames=["overview","bars"] interFrameGapMs=5.7 commits=2 at [178982.8,178987.8]
    batch 7: frames=["overview","bars"] interFrameGapMs=5.3 commits=2 at [238979,238981]

--- /securities     (single client)
    overview  now=59133 n=0 bytes=1653      bars  now=59156.4 n=518 bytes=58187
    overview  now=119131 n=0 bytes=1649     bars  now=119132.5 n=518 bytes=59406
    overview  now=179132.3 n=0 bytes=1652   bars  now=179156.3 n=518 bytes=59406
    overview  now=239134.6 n=0 bytes=1654   bars  now=239167.4 n=518 bytes=59460
  per batch:
    batch 4: interFrameGapMs=23.4 commits at [59155.4/p529, 59181.9/p555, 59627/p0.5]      -> 2
    batch 5: interFrameGapMs=1.5  commits at [119177.7/p551, 119625.3/p999]                -> 1
    batch 6: interFrameGapMs=24.0 commits at [179155.4/p529, 179180.3/p554, 179624.7/p998] -> 2
    batch 7: interFrameGapMs=32.8 commits at [239166.3/p540, 239191.1/p565, 239624.5/p998] -> 2

--- /securities/NVDA     (single client)
    overview  now=59115 n=0 bytes=1653      bars  now=59141.4 n=518 bytes=58187
    overview  now=119113.5 n=0 bytes=1649   bars  now=119146.6 n=518 bytes=59406
    overview  now=179136.7 n=0 bytes=1652   bars  now=179167 n=518 bytes=59406
    overview  now=239114.1 n=0 bytes=1654   bars  now=239137.8 n=518 bytes=59460
  per batch:
    batch 4: interFrameGapMs=26.4 commits at [59140.4/p695, 59175.6/p730, 59444.4/p999]       -> 2
    batch 5: interFrameGapMs=33.1 commits at [119145/p700, 119169.7/p724, 119443.1/p998]      -> 2
    batch 6: interFrameGapMs=30.3 commits at [179165.9/p721, 179194.4/p749, 179456.2/p11, 179460.5/p15] -> 2
    batch 7: interFrameGapMs=23.7 commits at [239136.2/p691, 239160.1/p715, 239487.7/p42]     -> 2
  state {"commitTotal":273,"mutationTotal":6788,"repaintTarget":"main","wrapperIntact":true,"visibility":"visible"}
```

**Batch 6 on `/securities/NVDA` has FOUR commits and only two are the batch's**
— `p11` and `p15` are 4.3 ms apart at the second boundary, where
`useMarketClock` commits once. The extra one is unattributed and is left
unattributed rather than explained away; it occurred once in 17 batches.

### One frame of each type, verbatim, so the evidence outlives the instrument

Built with the **shipped** `encodeMarketStreamMessage`, so a protocol change
would have broken the instrument rather than producing a frame the gateway
cannot send. The aggregate below is 3,547 bytes as the instrument furnished it
(4 proxies, 11 sectors, breadth, 10 movers) against **1,648–1,654 bytes** from
the real gateway, which encodes the same sections over the real universe.

```text
{"type":"overview","version":1,"sentAt":"2026-10-09T06:55:27.320Z","overview":{"computedAt":"2026-10-09T06:55:27.320Z","feeds":["iex"],"figures":[{"state":"observed","symbol":"SPY","at":"2026-09-16T18:01:00.000Z","price":100,"changePercent":1.5,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"QQQ","at":"2026-09-16T18:01:00.000Z","price":101,"changePercent":1.4,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"DIA","at":"2026-09-16T18:01:00.000Z","price":102,"changePercent":1.3,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"IWM","at":"2026-09-16T18:01:00.000Z","price":103,"changePercent":1.2,"changeBasis":"2026-09-15"}],"sectors":[{"state":"observed","symbol":"XLK","at":"2026-09-16T18:01:00.000Z","price":50,"changePercent":2,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLV","at":"2026-09-16T18:01:00.000Z","price":51,"changePercent":1.85,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLF","at":"2026-09-16T18:01:00.000Z","price":52,"changePercent":1.7,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLY","at":"2026-09-16T18:01:00.000Z","price":53,"changePercent":1.55,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLC","at":"2026-09-16T18:01:00.000Z","price":54,"changePercent":1.4,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLI","at":"2026-09-16T18:01:00.000Z","price":55,"changePercent":1.25,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLP","at":"2026-09-16T18:01:00.000Z","price":56,"changePercent":1.1,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLE","at":"2026-09-16T18:01:00.000Z","price":57,"changePercent":0.95,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLU","at":"2026-09-16T18:01:00.000Z","price":58,"changePercent":0.8,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLRE","at":"2026-09-16T18:01:00.000Z","price":59,"changePercent":0.65,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XLB","at":"2026-09-16T18:01:00.000Z","price":60,"changePercent":0.5,"changeBasis":"2026-09-15"}],"breadth":{"basis":"observed","advancing":284,"declining":152,"unchanged":15,"measured":451,"tracked":503,"windowMinutes":5},"movers":{"basis":"observed","gainers":[{"state":"observed","symbol":"NVDA","at":"2026-09-16T18:01:00.000Z","price":200,"changePercent":9,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"AAPL","at":"2026-09-16T18:01:00.000Z","price":201,"changePercent":8,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"MSFT","at":"2026-09-16T18:01:00.000Z","price":202,"changePercent":7,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"AMZN","at":"2026-09-16T18:01:00.000Z","price":203,"changePercent":6,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"GOOGL","at":"2026-09-16T18:01:00.000Z","price":204,"changePercent":5,"changeBasis":"2026-09-15"}],"losers":[{"state":"observed","symbol":"TSLA","at":"2026-09-16T18:01:00.000Z","price":300,"changePercent":-9,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"META","at":"2026-09-16T18:01:00.000Z","price":301,"changePercent":-8,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"AVGO","at":"2026-09-16T18:01:00.000Z","price":302,"changePercent":-7,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"JPM","at":"2026-09-16T18:01:00.000Z","price":303,"changePercent":-6,"changeBasis":"2026-09-15"},{"state":"observed","symbol":"XOM","at":"2026-09-16T18:01:00.000Z","price":304,"changePercent":-5,"changeBasis":"2026-09-15"}],"eligible":451,"tracked":503,"windowMinutes":5}}}
```

```text
{"type":"bars","version":1,"sentAt":"2026-10-09T06:55:27.320Z","observations":{"NVDA":{"startsAt":"2026-09-16T18:00:00Z","open":100.5,"high":100.5,"low":100.5,"close":100.5,"volume":1000}}}
```

### The mechanism, for tasks 4.8.3 to 4.8.6, because both instruments are deleted

Six things that cost real time and are not derivable from the harness:

1. **Install `routeWebSocket` BEFORE `addInitScript(pageInstrument())`.**
   Init scripts run in the order added, so this order makes the instrument's
   wrapper wrap Playwright's mock rather than be replaced by it, and
   `wrapperIntact` stays honest. `wrapperIntact` was **true** on all six
   routes in every run.
2. **A second wrapper for a plant goes INSIDE the instrument's**, i.e. added
   before it, so the plant does not have to assert `__mpWrapped` itself.
3. **Phase-align the window to the wall clock**, [200, 850) with the send at
   400, and keep a **control arm at the same phase**. `useMarketClock` commits
   at phase ~0 and `useBackendHealth` every 30 s; the control arm read 0, 10 of
   10, on all six routes, which is what licenses reading a 1 as a 1.
4. **Never read a task-boundary verdict off `long-animation-frame`.** It spans
   every task inside one rendering frame. `longtask` is the per-task entry, and
   it only exists above 50 ms — so a plant has to be ≥60 ms per task.
5. **A furnished socket cannot measure anything that depends on the
   inter-frame gap.** `routeWebSocket` gives 0.4–6.6 ms where the real gateway
   gives 4.4–33.1 ms, and in this task that was the difference between the
   right answer and the wrong one. Gate 1 chose the furnished socket for **4.8.4
   (cadence and composition)**, which is correct — but 4.8.4 must state that its
   frames arrive closer together than the gateway's do, because that is the
   direction that **hides** a second render.
6. **The fixture arm is affordable for a COUNT and not for a cadence.**
   `MARKET_DATA_PROVIDER=fixture` + `DATABASE_NAME=marketpulse_bare` gives four
   real applied batches in four minutes through the real gateway and the real
   socket. It writes invented bars into the scratch store — **2,590 of them,
   tagged `feed: synthetic`** — and `pnpm store:bare` reports and removes them
   by name (`Emptied 2590 bars and 518 ledger rows`), which was run afterwards
   and verified at `518 securities, 0 bars`.

### What falsifies a planning document

1. **This task's own brief and this file both said the feed is `8.8–16.1`
   batches a minute.** `LIVE-DATA.md` §9.5/§10.2 says 8.8 at the open, **6.8 at
   midday** and 16.1 at the close. The minimum is 6.8 and `STORY.md`'s Gate 1
   premise 2 carries the same narrowing. Corrected here and in the three live
   sites; not swept further, because the two files that carry it in full
   (`story-03-*/TASK-03`, `TASK-04`) state all three figures correctly.
2. **`docs/GAPS.md`'s `431 bytes` for the aggregate is superseded.** Measured
   off the wire by the page's own wrapper: **1,648–1,654 B** with all four
   sections populated, 928 B with none. Noted in the record above rather than
   edited into that paragraph, which is explicitly _"recorded for
   completeness"_ about a frame that then grew three sections.
3. **The `Owner:` clause's condition had fired twelve days earlier**, which is
   the sixth time this repository has caught an owner clause that does not know
   its own condition fired. Amended.

### Done when

1. **Met.** All five routes (six, counting the not-found route separately),
   with the batch count proved four ways — Node's own count, the page's `frame`
   rows counted by URL, a control arm at 0, and the real gateway.
2. **Met, and the premise in the question was wrong.** **Two tasks**, proved by
   two 60 ms `longtask` entries against one 122–130.7 ms LoAF entry; the single
   commit is **React's** coalescing across tasks, and whether it happens turns
   on the inter-frame gap — 1 render below ~2 ms, 2 renders above ~4 ms, and
   the real gateway's gap is 4.4–33.1 ms, so **2** in production.
3. **Met.** Three live sites corrected (`docs/GAPS.md` 4 edits, `EPIC.md` 1,
   `STORY.md` 2); the historical one in
   `epic-03/story-05/TASK-06` left standing, 1 occurrence, named above.
4. **Met.** The clause records that its condition fired on 2026-09-27, carries
   the reading, and re-owns the timing half to Tasks 4.8.5 and 4.8.3.
