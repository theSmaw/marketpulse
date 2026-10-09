# Task 4.8.1 — The instrument, proved before any silence is believed

**Status:** **Complete — 2026-10-09.** `scripts/overview-instrument.mjs` is the harness and `pnpm instrument:prove` the proof — fourteen proofs, four of them negative, every channel driven by a planted effect of known size. The pair builds and serves its own production artefact on its own two ports; the load ceiling is **ratio 1.0** and exits non-zero; the calibrator discarded **0 of 120** quiet samples and **24 of 120** under planted load. `session-sitting.mjs`'s two defects are repaired and its `/` reading is taken against `main` (**6 mutation records on `body`, 0 on `main`** in six quiet seconds). Two things the 3.6.4/3.6.5 recipe no longer supports are recorded below, and `docs/GAPS.md` entry 14's re-measure command was unsafe as written and is amended.
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** —

## Objective

**Every figure in this story comes out of one harness, and a harness nobody has
proved reports the same thing when it works and when it is broken.**

`long-animation-frame` only produces an entry **above 50 ms**, so **zero
observed and the observer is broken are the same output.** That cost a task
once already. This task builds the instrument, proves each of its channels
against a planted effect, and refuses to run on a machine that cannot execute
it.

## What the user can see when this lands

**Nothing.** It pays off in every task after it: 4.8.2 through 4.8.6 and 4.8.9
all run through this harness.

## Work

### The pair, which is not the gated suite

**`pnpm e2e` drives the origin `CORS_ORIGIN` names, which is the DEV server** —
`playwright.config.ts` and `scripts/pair-addresses.mjs` both argue this at
length. So **AC 1 cannot be met through the gated suite.** The established
recipe is Task 3.6.4/3.6.5's and is quoted here rather than re-derived:
`vite build` → `vite preview` on `:4173`, backend `dist/index.js`, `CORS_ORIGIN`
repointed at the preview, instruments installed from `addInitScript` **before**
navigation.

### Four channels, each proved by a planted effect

1. **A long-animation-frame / longtask observer**, with the self-test
   `scripts/session-sitting.mjs` already carries: a deliberate **120 ms** block
   inside a `requestAnimationFrame`, the resulting entry tagged
   `selfTest: true` and **excluded from every acceptance figure**, and `proved`
   printed whether or not anything else is. Copy that shape; do not re-invent
   it.
2. **A continuous rAF-gap recorder**, installed before navigation. This is
   Epic 14's own prescribed method, and it is what distinguishes _one task over
   the line_ from _the page spent 80 ms not painting_.
3. **A script clock per burst.**
4. **A commit counter** on React's DevTools hook — production React still calls
   it on every commit. **Prove it** by planting a state change and asserting
   the count moves.

### A DOM check that the thing under test actually changed

Task 4.5.8's first draft **was silently overwritten by Playwright's own
`WebSocket` and reported n = 0.** Every arm asserts a positive: a count of
distinct drawn values, or a text that moved. **An arm that cannot prove its
subject changed reports nothing, not zero.**

### `document.visibilityState === "visible"`, asserted on every page

Epic 14's own warning: a CDP-driven tab reports `hidden`, pauses `rAF`, and
makes every figure small, plausible and meaningless.

### A calibrator, and a load ceiling that REFUSES

Story 4.5's hand-off records three whole-suite runs failing **3, then 5, then
7**, every failure a 30 s timeout with zero assertion failures, at load
**23–33 on 8 cores**, while CI passed. Its verdict: _the machine could not
execute it — and those two look identical from a terminal._

So: **read `loadavg` at the top and exit non-zero above a stated ceiling** — a
figure that was never allowed to be taken cannot be quoted — **take the
heavy-job lock** (`scripts/heavy-job.mjs` exists; `pnpm e2e` takes it and a
hand-rolled script does not), and **sample a fixed-cost calibrator beside every
measurement**, discarding any window where it drifts outside a stated band and
**printing the discard count**. Nothing in this repository has detected
contention mid-run before; this is the repair for the sentence above.

### And one instrument defect to fix rather than work around

`scripts/session-sitting.mjs`'s repaint stamp is
`document.querySelector("table") ?? document.body`. **There is no `<table>` on
`/`** — `BreadthLedger` says so in as many words — so on `/` it observes
`document.body`, **where the masthead clock mutates text every second.** Every
`painted` figure taken on `/` with it would be a race between the frame and the
clock tick. And `pendingFrame` is set only for `frame.type === "bars"` with a
non-empty symbol list, so **an `overview` frame never produces a `painted` row
at all.**

## Done when

1. The harness drives a **production build** pair and says so in its own output
2. All four channels are proved by a planted effect, with the transcripts kept
3. The calibrator discards under load and prints the count; the load ceiling
   refuses rather than warns
4. `session-sitting.mjs`'s two defects are repaired, and its `/` reading is
   taken against an element the clock does not touch
5. Every arm asserts its subject changed, and reports **nothing** rather than
   zero when it cannot

---

## What was done — 2026-10-09

**Status:** Complete. Two files added, one repaired, one `docs/GAPS.md`
re-measure amended. **No `pnpm verify` step and no spec was added, on purpose**
— this is an instrument, it needs a built tree, two ports and a browser, and
`verify` has none of those.

### What was built, and where

| File                              | What it is                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/overview-instrument.mjs` | The harness. The load reading, the production-build pair, the page-side instrument, the drain, the visibility assertion, the quantiles and the calibrator screen. Loading it needs no network, no credentials and no database. |
| `scripts/prove-instrument.mjs`    | The proof run — `pnpm instrument:prove`, ~75 s. Ten sections, **fourteen** proofs, each driven by a planted effect of known size.                                                                                              |
| `scripts/session-sitting.mjs`     | Two defects repaired (below).                                                                                                                                                                                                  |
| `docs/GAPS.md` entry 14           | Its `Re-measure:` command was unsafe as written. Amended.                                                                                                                                                                      |

### The pair, and why it is not the 3.6.4/3.6.5 recipe verbatim

`pnpm e2e` drives the origin `CORS_ORIGIN` names, which is the dev server, so
AC 1 cannot be met through the gated suite — that part is unchanged. **Two
things about the recipe did change**, both measured rather than preferred:

1. **It runs on its own two ports and builds its own artefact.** The recipe's
   4173 and 3000 require tearing down a running `pnpm dev`, and five tasks in
   this story need this pair. `VITE_API_BASE_URL` is substituted at **build
   time**, so a harness on a second backend port cannot reuse
   `apps/frontend/dist` — it builds into `.capture/instrument/dist`
   (deliberately not over the artefact a `pnpm invariants` check reads).
   Measured: `vite build` is **0.6–0.7 s** on rolldown, so building per run is
   cheaper than reasoning about staleness. The bundle hash differs from the
   repository's own (`index-BnqVOSWf.js` against `index-BPKvqonB.js`), which is
   the substitution visible in the artefact.
2. **The provider defaults to `none` and a stream against `marketpulse` is
   refused.** The recipe's `MARKET_DATA_PROVIDER=fixture` was taken on
   2026-09-22; Story 3.8 shipped the live bar writer on **2026-09-23** and
   `index.ts` hangs it off _any_ configured stream, so following the recipe
   today writes **invented minute bars into the developer's own store**, 518 a
   minute. `docs/GAPS.md` already carries that finding from the other direction
   (Task 4.5.8, 2026-10-08) — what it did **not** carry is that entry 14's own
   `Re-measure:` line still instructs a reader to do it. Amended.

**The production build is asserted off the wire, not believed.**
`assertProductionBuild()` reads the served HTML and refuses `/@vite/client` or
`/src/main.tsx`, then reads the hashed bundle's byte length.

### The four channels, and the planted effect each was proved against

| Channel                   | Planted                                      | Instrument caught                                                                            |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1. long-frame observer    | 120 ms inside a `requestAnimationFrame`      | 3 entries, worst **148.8 ms**, both `longtask` and `long-animation-frame`, tagged `selfTest` |
| 1b. acceptance channel    | **180 ms** after the self-test window closed | **0** acceptance entries before, **2** after — `[180, 193.1]` ms                             |
| 2. rAF-gap recorder       | 120 ms inside a `requestAnimationFrame`      | quiet n=179 p50 **16.7** p95 17.6; after the plant max **117.0 ms**                          |
| 3. script clock per burst | 120 ms blocked inside the burst's own task   | control **0.2 ms**, planted **120.2 ms**                                                     |
| 4. commit counter         | a route change to `/investigations` and back | **16 → 27** commits, 17 stamps                                                               |
| DOM check                 | two distinct texts into the repaint target   | mutations **25 → 29**, distinct values `["planted-one","planted-two"]`                       |

**Channel 1b is the half that matters** and it is why the self-test is not
enough on its own: a tagged self-test entry proves the observer fired _once_,
and `acceptanceEntriesBeforePlant: 0` then `2` proves the exclusion is an
exclusion rather than a dead observer. **Channel 3 exists because channel 1
cannot see below 50 ms**: a `MessageChannel` message posted at the burst stamp
cannot run until the delivering task ends, so its handler's
`performance.now() - t0` is the decode, the reducer and any synchronous render
that followed.

### Four negative proofs, because a guard only seen passing is not proved

| Guard                         | Planted                                            | Result                                                                        |
| ----------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| the load ceiling              | a ceiling of `0.00001`                             | `ok: false` — refuses, does not warn                                          |
| the production-build detector | a server serving `/@vite/client` + `/src/main.tsx` | threw, naming both fingerprints                                               |
| `visibilityState`             | a `visibilityState` getter returning `"hidden"`    | threw before any figure was taken                                             |
| the repaint target            | `repaintSelector: "table"` on `/`                  | `repaintTarget: null`, one `repaint-target-missing` row, **nothing reported** |

The load ceiling was also seen refusing for real, twice, during this task: two
proof runs were refused at ratio **1.188** and **1.086** because the previous
run's own planted spinners had not decayed out of the one-minute average.

### The load ceiling and the calibrator

**Ceiling: ratio 1.0 — one runnable thread per core — derived from two
measurements.** The known-good end is Task 3.6.5, whose production-build
figures were taken with _"load average under 6 throughout"_ on 8 cores, ratio
**0.75**. The known-bad end is Story 4.5's hand-off: **23–33 on 8 cores**,
ratio 2.9–4.1, three whole-suite runs failing 3 then 5 then 7 with **zero**
assertion failures. It **exits non-zero** rather than warning
(`scripts/run-e2e.mjs` warns at 0.7 and is right to, for a pass/fail suite: a
corrupted assertion is red, a corrupted figure is a plausible number that gets
published). `--ceiling <ratio>` raises it and the raise is recorded in the
transcript, so a figure taken under a raised ceiling carries the raise.

**Calibrator: 2,000,000 iterations of `Math.sqrt`, JIT-warmed 12 times at
install, sampled beside every burst, band 1.6× either side of a reference
median taken at the top of the run.** n = 120 either side:

| arm                                    | p50    | p95    | max    | discarded    |
| -------------------------------------- | ------ | ------ | ------ | ------------ |
| quiet                                  | 1.2 ms | 1.3 ms | 1.5 ms | **0 / 120**  |
| 8 blocked renderers + 24 node spinners | 1.3 ms | 2.6 ms | 9.7 ms | **24 / 120** |

Band **0.75–1.92 ms** against a 1.2 ms reference.

**Three sizing attempts, and the first two were wrong — which is the finding
rather than an aside.**

- **200,000 iterations read 0.2 ms**, at Chromium's own 0.1 ms quantisation:
  quiet `{p50 0.2, p95 0.3, max 0.4, min 0}`, and a 1.6× band discarded **25 of
  60 quiet samples**. Worse, the loaded arm read **lower** than the quiet one,
  because the loop was still being warmed by the JIT.
- **24 spinning Node processes on 8 cores moved nothing.** That is three
  runnable threads per core — Story 4.5's measured 23–33 exactly — and the
  calibrator read **1.2 ms quiet and 1.2 ms loaded**, with load average 10.68
  to 12.63 at the sample. macOS keeps scheduling a foreground renderer at
  user-interactive QoS whatever a terminal's children are doing. **Load average
  alone is not something a browser can feel**, which is worth knowing before
  trusting any load-average-only guard.
- **What corrupted Story 4.5's run was another browser suite**, so the plant
  that reproduces it is other **renderer** processes: eight pages, each in its
  own context so it gets its own process, each blocking 50 ms of every frame.
  That moved the maximum 1.5 → 9.7 ms.

**A second calibrator was measured and rejected.** A fixed `setTimeout(…, 0)`
hop reads **4.5 ms p50 quiet and 4.5 ms p50 loaded** — Chromium's
nested-timeout clamp dominates it completely. It is printed in the transcript
and screens nothing.

**The discrimination is at the tail, not the median**, and the quiet arm is not
reliably quiet on this machine: an earlier run minutes before gave a quiet max
of **2.7 ms** and 6 discards of 60. So the proof's criterion is _loaded
discards more than quiet_, not _quiet discards nothing_ — discarding an honest
window costs n, keeping a dishonest one gets it published.

### `session-sitting.mjs`'s two defects, repaired

Both made a figure **unobtainable rather than wrong**, which is why neither had
ever been noticed.

1. **The repaint stamp was `document.querySelector("table") ?? document.body`.**
   There is no `<table>` on `/`, so on the landing route it observed the
   **body**, where the masthead clock mutates text every second. It is **`main`**
   now, with **no fallback** — an absent target is reported and nothing is
   observed. `<main>` is one element on all five routes and both surfaces that
   tick on a timer (`MarketClock` in the masthead, the status bar in
   `AppFooter`) are outside it. **Measured rather than asserted**: six quiet
   seconds on `/` at 1440 on a production build, no frames and no interaction,
   gave **6 mutation records on `body` and 0 on `main`**.
2. **A pairing opened only for a `bars` frame with a non-empty symbol list**, so
   an **`overview` frame never produced a `painted` row at all** — and on `/`
   the aggregate arrives on its own frame type (ADR 0038). §28's
   send-to-repaint figure was therefore structurally unobtainable for the whole
   landing page. Pairings now carry their frame `type` and the summary splits by
   it, because pooling two journeys publishes one number for neither; and
   `sentAtToRepaint` carries an `unobtainable` sentence when n = 0.

**A third, latent, reported rather than repaired.** That file's observer
verdict is computed with `out.some(...)` over the page buffer, which is
`splice`d on every drain — so a drain before the 1,500 ms self-test window
closes would report an **unproved observer on a working one**. It is safe only
because the drain loop's first tick is at 5,000 ms. The new harness uses
counters instead, for exactly this reason. Left standing because it belongs to
Task 3.11.8's instrument and is not currently reachable.

### The transcript, verbatim

```text

Proving the instrument — Task 4.8.1

1. The load ceiling
   Load average 5.69 across 8 cores (ratio 0.712) against a ceiling of 1.00.
  PROVED   the ceiling refuses rather than warns
            planted: "ceiling 0.00001"
            verdict: false
            reading: 5.69

2. The pair
  built .capture/instrument/dist in 0.6 s (VITE_API_BASE_URL=http://127.0.0.1:3100)
  pair up — PRODUCTION BUILD
    frontend http://localhost:4273 (vite preview, index-BnqVOSWf.js, 398 KiB)
    backend  http://127.0.0.1:3100 (dist/index.js, provider=none, store=marketpulse_bare, CORS_ORIGIN=http://localhost:4273)
  PROVED   a dev server is refused by its own fingerprint
            planted: "@vite/client + /src/main.tsx"
            refusal: "Error: http://127.0.0.1:51542 is NOT serving a production build — @vite/client=true /src/main.tsx=true bundle=null. Every figure from a dev "
  PROVED   the pair being driven is a production build
            frontend: "http://localhost:4273"
            bundle: "index-BnqVOSWf.js"
            bundleKiB: 398
            backend: "http://127.0.0.1:3100"

3. document.visibilityState
  PROVED   a hidden page stops the run
            live: "visible"
            planted: "visibilityState getter -> \"hidden\""
            refusal: "Error: document.visibilityState is \"hidden\". rAF is paused, so every gap, every burst and every paint below would be sma"

4. Channel 1 — the long-frame observer
  PROVED   the self-test's planted 120 ms block produced an entry
            planted: "120 ms inside a requestAnimationFrame"
            entries: 3
            worstMs: 141.5
            entryTypes: ["longtask","long-animation-frame"]
            invokers: ["http://localhost:4273/assets/index-BnqVOSWf.js","FrameRequestCallback","MessagePort.onmessage"]
            loafSupported: true
            longtaskSupported: true
  PROVED   the acceptance channel excludes the self-test and still catches a plant
            planted: "180 ms inside a requestAnimationFrame, after the self-test window"
            selfTestEntriesTagged: 3
            acceptanceEntriesBeforePlant: 0
            acceptanceEntriesAfterPlant: 2
            caughtMs: [180,196.2]
            caughtEntryTypes: ["longtask","long-animation-frame"]

5. Channel 2 — the rAF-gap recorder
  PROVED   the recorder is continuous and a planted block appears as a gap
            planted: "120 ms inside a requestAnimationFrame"
            quiet: {"n":180,"p50":16.7,"p95":17.6,"max":33.3,"min":15.7}
            quietSeconds: 3
            afterPlant: {"n":50,"p50":16.7,"p95":17.7,"max":116,"min":15.6}

6. Channel 3 — the script clock per burst
  PROVED   the script clock reads a planted 120 ms and a control reads ~0
            planted: "120 ms blocked inside the burst's own task"
            controlTaskMs: 0.1
            plantedTaskMs: 120.1
            note: "LoAF has no entry below 50 ms, which is why this channel exists beside it"

7. Channel 4 — the commit counter on React's hook
  PROVED   production React calls the hook, and a planted state change moves the count
            planted: "a route change to /investigations and back"
            before: 16
            after: 27
            moved: 11
            commitStampsSeen: 17

8. The DOM check — and the arm that reports NOTHING
  PROVED   a planted mutation is seen and its distinct values counted
            planted: "two distinct texts into the repaint target"
            repaintTarget: "main"
            before: 25
            after: 29
            distinctValues: ["planted-one","planted-two"]
  PROVED   the socket wrapper is still the wrapper, counted by URL
            wrapperIntact: true
            sockets: [{"url":"ws://127.0.0.1:3100/market-stream","ours":true}]
            framesSeen: 10
  PROVED   an absent repaint target reports nothing, not zero
            planted: "repaintSelector \"table\" on a route that has no table"
            repaintTarget: null
            mutationTotal: 0
            missingRows: 1
            note: "the old instrument would have fallen back to document.body here"

9. The repaired repaint stamp — `main` against `body` on `/`
  PROVED   `main` is quiet for six seconds while `body` is not
            window: "6 s, no frames, no interaction"
            bodyMutationRecords: 6
            mainMutationRecords: 0
            note: "the masthead clock and the status bar are outside <main>"

10. The calibrator, and the discard count
  PROVED   the calibrator discards more under planted load, and prints both counts
            planted: "8 blocked renderer processes + 24 spinning node processes on 8 cores"
            loadDuringPlant: 13.12
            iterations: 2000000
            band: "x/1.6 … x*1.6 of the reference"
            referenceMs: 1.2
            bandMs: [0.75,1.92]
            quiet: {"n":120,"p50":1.2,"p95":1.3,"max":1.5,"min":1}
            quietDiscarded: 0
            quietSchedule: {"n":120,"p50":4.5,"p95":5.1,"max":5.4,"min":0}
            loadedSchedule: {"n":120,"p50":4.5,"p95":5.3,"max":6.6,"min":0}
            loaded: {"n":120,"p50":1.3,"p95":2.6,"max":9.7,"min":1.1}
            loadedDiscarded: 24
            loadedDiscardedOf: 120
            quietDiscardedOf: 120

14 of 14 proved. Load 5.69 before, 25.85 after (ceiling 1, 8 cores).
```

### Done when

1. **Met.** The harness builds and serves its own production artefact and
   prints `PRODUCTION BUILD` with the bundle name and size; a dev server's own
   fingerprint is refused.
2. **Met.** Six planted-effect proofs across the four channels plus the DOM
   check, transcript above.
3. **Met.** 0 / 120 quiet discards against 24 / 120 loaded, both counts
   printed; the ceiling exits non-zero and did so twice for real.
4. **Met.** `main` rather than `body`, measured at 6 records against 0; and
   `overview` frames now pair.
5. **Met.** Every arm reports `null` or an `unobtainable` sentence rather than
   zero — proved by the `repaintSelector: "table"` arm.
