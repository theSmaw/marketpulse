# Task 4.8.6 — The cold load of `/` against `/securities`

**Status:** **Complete — 2026-10-09.** 40 cold loads in one session, four arms of ten, interleaved: **`/` carries no task over 50 ms and one 50.9 ms frame in ten loads (worst rAF gap p50 24.7 / p95 34.7 ms); `/securities` carries a 62.8–77.4 ms frame on 10 of 10 (worst rAF gap p50 66.7 / p95 68.5)**. Attributed on two 20-row control arms: **≈6 ms for the 518-security payload both routes fetch, ≈48 ms for the 518-row markup only one of them draws**, and the long frame's own split agrees — script 26–31 ms on both routes, style/layout/paint 34–38 ms on `/securities` alone. **The 2026-09-22 figure moved in the channel rather than in the cost**: `longtask` read 50–56 ms on 7 of 10 then and **nothing in 10 of 10** now, while the continuous rAF channel read 49–87 then and **50.0–68.5 on every load** now — so Epic 14 entry 1's own prescribed `Re-measure:` command would today report the breach as repaired.
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1

## Objective

**AC 2 says the comparison is stated rather than implied, and a comparison that
is two numbers side by side is implied.**

## What the user can see when this lands

**Nothing.**

## Work

### The fact that makes the comparison informative, and nobody has recorded it

**`/` calls `useSecurities()` too.** Both routes fetch and parse the same
518-security payload; they differ in **markup** — roughly **24 anchors against
530 `<tr>` and ~10,385 nodes**. So the input is held constant and only the
rendering differs, which is what makes the difference attributable to the thing
Epic 14 owns.

### The protocol, and every clause is somebody's measured defect

1. **One artefact, one backend, one store, one viewport (1440×900), one
   session.** A figure that has moved looks exactly like a figure
   mis-recorded.
2. **n ≥ 10 cold loads per route**, fresh browser context each, and
   **interleaved** — `/`, `/securities`, `/`, `/securities`… **Blocked arms on
   a machine that drifts measure the drift.**
3. **The 20-row control arm**, from Epic 14's own method. Without it the
   difference is stated; with it, attributed. Task 3.6.5's control was 1-of-6
   against 8-of-10 and that is what carried its conclusion.
4. **`document.visibilityState === "visible"` asserted per page**, instruments
   from `addInitScript` before navigation.
5. **Unbuffered `longtask`** — 3.6.5's trap: `buffered: true` returns the cold
   load into a measurement about something else.
6. **Both the count of tasks over 50 ms and the worst rAF gap**, because they
   disagree usefully: 3.6.5's cold load was 50–56 ms on 7/10 **with rAF gaps of
   49–87 ms**.
7. **Load average in the transcript either side of each arm.**

### And the baseline is to rebuild, not to cite

**37–40 ms a tick and 50–56 ms cold load are 2026-09-22 figures** and predate
Stories 4.2–4.6 entirely — four new regions, twenty-four anchors, three memo
boundaries on `/`, and an overview frame re-rendering `App` on every route.
`CLAUDE.md`'s rule applies: only rebuilding the old commit tells a moved figure
from a mis-recorded one.

## Done when

1. n ≥ 10 interleaved cold loads per route with the 20-row control, medians and
   p95, load recorded either side
2. The comparison **attributed** — what the difference is made of — not only
   stated
3. `/securities`' own figure re-taken on today's tree rather than cited from
   2026-09-22

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

## Handed here by Task 4.8.3 — 2026-10-09

**A cold load of `/` costs THREE full 518-joins on the server before the first
paint**, counted off the wire by a real browser against the real gateway on a
quiet feed: one on connect (answering a subscription that is structurally
empty), one answering a **zero-symbol** subscribe, and one answering the real
~25-symbol subscribe. `/securities/:symbol` is three as well; **`/investigations`
is two**, for a page that draws no figure at all. At the tight-loop price on a
populated store that is **11.2 ms** of server script per cold load of `/`, and
**11.2n ms** for n browsers.

**None of it is visible to any gated run.** On CI's store — 518 securities, zero
bars — every entry is `unknown`, `changeFromClose` is never reached, and the
whole `overviewMessage()` costs **0.056 ms** instead of 3.72. The same is true of
a freshly started process for its first minute, which is exactly the condition a
cold-load measurement is taken in. If you want the server leg of your cold load
to be real, the store behind it has to have bars.

## Handed here by Task 4.8.4 — 2026-10-09

- **A cold load of `/` really does send a `subscribe` with zero symbols, and
  then one with 25** — `subscribes: [0, 25]` in all seven arms, reproducing
  4.8.2's reading through a different instrument. The gateway answers **both**
  with a snapshot and an aggregate, so that is **four frames and two full
  518-joins before the page has asked a question with content in it**.
- **The second subscribe carries 25 symbols and the page draws nothing from the
  `bars` frames it buys.** An arm that sent only `bars` frames to those 25,
  with prices that moved every batch, left `<main>`'s text **identical** on both
  cadences. Every figure on this screen comes from the aggregate; the
  subscription exists so the arrival mark can fire. Its price, measured:
  **0.9–1.2 ms a batch** and **~3,000 B a frame**.
- **The subscription count is a membership function and a bad frame changes
  it.** `subscribes: [0,25,15,25,15,25]` in this task's first run was the page
  falling back to 15 symbols — four proxies plus eleven sectors — because
  `readMovers` had dropped the movers section. If your cold-load arm reads 15,
  the frame is being refused, not the page being slow.
- **The harness's signal handler is fixed** (`process.off` before re-raising).
  Before 2026-10-09 a `SIGTERM` to a harness run left a process spinning at
  100% of a core holding both ports, and the next run refused its own addresses
  and read as a configuration fault.

## Handed here by Task 4.8.5 — 2026-10-09: the chart was already rebuilding twice a minute before this epic existed, and an aged store can still be driven with real bars

**Do not read a long frame at 30 s into a cold load as a cold-load artefact.**
Task 4.8.5's control arm sent **nothing** and both chart plots still rebuilt
**twice in 45 s** — `buildsPerBatch` 0.17 against 2.17 driven. That is `App`'s
**30 s `/health` poll**, and it means the chart has been rebuilding twice a
minute since before Story 4.2. Zero builds between polls, so a build outside
one is attributable.

**`App.tsx`'s accepted per-poll re-render therefore has a cost nobody had
priced**, and its own reversal trigger — _a render rate that is no longer a
poll_ — fired in Epic 3.

**And a `/securities/:symbol` arm can be driven with REAL bars on a store that
ends 2026-09-11.** `?sessions=5` there is a correct **empty**, but the real
handler answers its **absolute `start`/`end` window form**, so 4.8.5 fetched
1,950 and 6,630 genuinely stored bars and replayed them with `page.route` —
verified off the plot's own vertex count rather than trusted.

---

## What was done — 2026-10-09

**Status: Complete.** Forty cold loads in one session — **four arms, n = 10
each, interleaved** — on one artefact, one backend, one store, one viewport.
**The comparison is attributed rather than stated**, and the attribution is
arithmetic on the two control arms rather than an argument.

**And the figure Epic 14 told this task to re-take has moved in a way that
changes how it has to be read: `/securities` is still over §28's line on every
single cold load, and the channel Epic 14's own prescribed re-measure names can
no longer see it.** `longtask` reported **nothing** in 40 of 40 loads while
`long-animation-frame` reported a 62.8–77.4 ms frame in **10 of 10** loads of
`/securities`. A reader who ran Epic 14 entry 1's `Re-measure:` line verbatim
today would conclude the breach had been repaired.

### Conditions, once, for every figure below

Production build asserted off the wire (`index-BnqVOSWf.js`, 398 KiB) served by
`vite preview` on `:4273`; backend `dist/index.js` on `:3100`, **`provider=none`**
so no stream and therefore no live-bar writer exists at all, against
**`DATABASE_NAME=marketpulse`** — 518 securities and **48,797,343 bars**, so the
server's own leg of the load is the real three-join one Task 4.8.3 priced and
not CI's `unknown`-everywhere shape. Chromium via Playwright, headless, 1440×900,
a **fresh browser context per load**, `document.visibilityState` asserted
`visible` on every page, every instrument from `addInitScript` **before**
navigation, `longtask` and `long-animation-frame` both **unbuffered**. macOS 14 /
arm64, 8 cores. Load average at the top of the run **2.64 (ratio 0.330** against
the harness ceiling of 1.00), recorded either side of all 40 loads, range
**1.93–7.54** across the session. The measurement window is **4,000 ms** after
`domcontentloaded`; `domContentLoadedEventEnd` was **28.2–45.2 ms** on every
untrimmed load, so the window contains the whole load with a hundredfold margin
and **no 30 s health poll** (Task 4.8.5's warning).

### The four arms, and why four

| arm               | what it holds constant                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | the subject                                                                                                                                                                                   |
| `/securities`     | the comparison, re-taken on today's tree                                                                                                                                                      |
| `/securities @20` | **Epic 14's own control arm** — the same route with `GET /securities` trimmed to 20 rows                                                                                                      |
| `/ @20`           | the control the comparison needs and Epic 14 does not have: **`/` with the same payload trimmed**, which is the only way to tell the 518-security _fetch and parse_ from the 518-row _markup_ |

Rotated `/`, `/securities`, `/ @20`, `/securities @20` ten times. **Interleaved,
because blocked arms on a machine that drifts measure the drift** — and the
machine did drift: load ran 3.19 → 7.54 → 1.93 inside the session, and every arm
holds loads from the high stretch and the low one.

### The two figures

**Both channels, because they disagree and the disagreement is the finding.**
Unscreened, all ten proved loads per arm; `quantile` is this repository's own
(`floor(q·n)`).

| arm               | tasks over 50 ms (`longtask`) | frames over 50 ms (LoAF) | worst rAF gap p50 | p95     | min–max   | DOM nodes  |
| ----------------- | ----------------------------- | ------------------------ | ----------------- | ------- | --------- | ---------- |
| `/`               | **0 of 10**                   | **1 of 10** (50.9 ms)    | **24.7 ms**       | 34.7 ms | 18.6–34.7 | **447**    |
| `/securities`     | **0 of 10**                   | **10 of 10** (62.8–77.4) | **66.7 ms**       | 68.5 ms | 50.0–68.5 | **10,318** |
| `/ @20`           | 0 of 10                       | **0 of 10**              | 18.7 ms           | 18.7 ms | 18.6–18.7 | 447        |
| `/securities @20` | 0 of 10                       | **0 of 10**              | 18.8 ms           | 33.4 ms | 18.5–33.4 | 765        |

The screened figures agree: with the calibrator band applied, `/` keeps 7 of 10
(**p50 22.3 / p95 33.3**) and `/securities` keeps 8 of 10 (**p50 66.7 / p95
68.5**); the two control arms discard nothing. The screen moves no reading by
more than 2.4 ms and changes no conclusion, which is why both are printed.

**Calibrator: reference 2.2 ms** — `{"n":25,"p50":2.2,"p95":2.8,"max":2.9,"min":1.7}`
— **ratios ×1.09 (`/`), ×0.91 (`/securities`), ×1.05 (`/ @20`), ×1.09
(`/securities @20`)**, discards **3 / 2 / 0 / 0 of 10**. No arm was measured on a
machine behaving differently from the reference.

### What the difference is MADE OF — the attribution, which is the point of the task

One frame at 60 Hz is 16.7 ms and the floor both control arms sit on is
**18.6–18.8 ms**, which is one frame. Subtracting the floor:

| what                                                                                                  | cost at the worst frame | evidence                                          |
| ----------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| the 518-security payload — fetch, parse, `useSecurities`, and `/`'s three whole-universe computations | **≈ 6 ms**              | `/` 24.7 against `/ @20` 18.7                     |
| the 518-row table's markup                                                                            | **≈ 48 ms**             | `/securities` 66.7 against `/securities @20` 18.8 |
| **the difference between the two routes**                                                             | **42.0 ms**             | 66.7 − 24.7                                       |

**So the comparison is: `/` pays about 6 ms for a payload it computes over and
renders almost none of; `/securities` pays about 48 ms for the same payload's
markup. Both routes call `useSecurities()`, both receive the same 20,072-byte
response, and only one of them is in breach.** The `/ @20` arm is what licenses
the first row: with twenty securities `/` draws the **same 447 nodes** and its
worst frame collapses to the one-frame floor, so the ~6 ms is the payload and
not the page's own chrome.

**And the long frame's own split says the same thing from inside.** Every
`/securities` load produced exactly one long animation frame, invoked by
`MessagePort.onmessage` — the React scheduler — and the split is stable across
all ten:

- **script 26.2–31.0 ms**
- **style, layout and paint 34.2–38.3 ms**
- `blockingDuration` 11.0–17.9 ms

The one long frame `/` produced in ten loads was **50.9 ms, script 25.2 ms,
render 20.0 ms**. So the script halves of the two routes are _the same size_ —
26–31 ms against 25 ms — and the whole of the difference is the render half:
**34–38 ms of style, layout and paint over 9,871 extra nodes** (10,318 against 447) and 505 extra anchors, **≈ 3.9 µs a node**. That is Epic 14 entry 1's own
attribution — _the lever is DOM size_ — re-derived on a page that did not exist
when it was written.

### The re-taken `/securities` figure against 2026-09-22, and what moved

| reading                                  | 2026-09-22 (Task 3.6.5)                                                                   | 2026-10-09 (here)                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `longtask` entries over 50 ms, cold load | **50–56 ms on 7 of 10**                                                                   | **none, 0 of 10**                               |
| worst rAF gap                            | **49–87 ms**                                                                              | **50.0–68.5 ms**, 10 of 10 over 50              |
| the 20-row control                       | 1 of 6 (66 ms, first launch), gaps 29–45 ms                                               | **0 of 10**, gaps 18.5–33.4 ms                  |
| LoAF on the cold load                    | not recorded for the cold load (recorded for the steady state: 73–82 ms, 46–49 ms script) | **62.8–77.4 ms, 26.2–31.0 ms script, 10 of 10** |
| document size                            | 10,385 nodes against 848 (2026-09-11)                                                     | **10,318 against 765**                          |

**The breach has not been repaired and the band has narrowed from the top.**
What has changed is **which channel can see it**: the work is no longer a single
task over 50 ms, it is a 63–77 ms _frame_ whose script half is 26–31 ms and whose
render half is 34–38 ms. The rAF-gap channel — the one that was continuous in
2026-09-22 and is continuous here — reads **50.0–68.5 ms against 49–87 ms**: the
same breach, slightly tighter, **10 of 10 rather than 8 of 10**, and no longer
reported by `PerformanceObserver({ entryTypes: ["longtask"] })` at all.

**The `longtask` channel was proved on every one of the 40 loads, so the zero is
a zero.** A 120 ms block was planted inside a `requestAnimationFrame` **after**
each measurement window closed, on the very page that produced the figure, and
the proof is required **per channel**: an arm counts only if the plant produced
both a `longtask` entry and a `long-animation-frame` entry. All 40 did —
`proved 10 of 10 (unproved: [])` in every arm. Without that clause a plant
caught by LoAF and missed by `longtask` would have left the _tasks over 50 ms_
figure unobtainable on an arm that looked proved, which is this story's own named
failure mode wearing a different hat.

**The one difference from 3.6.5's conditions that is not controlled**, stated
rather than argued away: that session ran `MARKET_DATA_PROVIDER=fixture` with a
feed changing all 518 rows a minute, and this one runs `provider=none`. Inside a
4,000 ms window a fixture feed delivers at most one batch, and a batch's cost on
this page was measured by Task 3.6.5 itself at 37–40 ms of script — enough, if it
landed inside the load, to push a 29 ms script task over 50. **Controlling it
costs a store with bars and a stream, which the harness refuses against
`marketpulse` for Story 3.8's reason**; it would be a different measurement from
the one Epic 14 asks for (_cold load_), and it is named here so the next reader
does not mistake the silence for proof.

### Four corroborations of earlier tasks, through a third instrument

1. **Three joins per cold load, on `/` and on `/securities` both.** Every load
   of every arm received the same six frames — `snapshot`, `overview`,
   `snapshot`, `overview`, `snapshot`, `overview` — which is the connect plus
   **two** subscribes that Task 4.8.3 counted off the wire and Task 4.8.4
   reproduced as `subscribes: [0, 25]`. A third instrument, a third reading, the
   same answer. (`n: 0` on every snapshot because `provider=none` has observed
   nothing; the aggregate's own cost is unaffected — it is the 518 `lastCloses`
   join.)
2. **`/` really does render almost nothing of the universe**: 447 nodes, 29
   anchors, 0 `<tr>`, 1,808 characters of `main` text — against the brief's
   estimate of ~24 anchors and ~10,385 nodes for the other page.
3. **React commits are 12–14 on `/` and 15 on `/securities`**, with no per-load
   spread on the latter at all, which is consistent with Task 4.8.2's two renders
   a batch being a property of the frame rather than of the route.
4. **The trim is asserted, not assumed.** Each control load records its
   interception — `trim 1x→20` — because a control arm whose interception never
   fired is the 518-row arm wearing a different label. Note that the trimmed arms'
   `domContentLoaded` is **38.6–65.5 ms** against 28.2–31.2 untrimmed: that is
   Playwright's own route handler in the path, which is why the comparison is
   taken on frame and gap channels and never on navigation timing.

### Transcript, verbatim

Three rounds of the per-load lines and the two subject arms' summaries, from the
session the figures above come from:

```text
  Load average 2.64 across 8 cores (ratio 0.330) against a ceiling of 1.00.
  built .capture/instrument/dist in 0.6 s (VITE_API_BASE_URL=http://127.0.0.1:3100)
  pair up — PRODUCTION BUILD
    frontend http://localhost:4273 (vite preview, index-BnqVOSWf.js, 398 KiB)
    backend  http://127.0.0.1:3100 (dist/index.js, provider=none, store=marketpulse, CORS_ORIGIN=http://localhost:4273)
  calibrator reference 2.2 ms — {"n":25,"p50":2.2,"p95":2.8,"max":2.9,"min":1.7} (5 cold loads of /investigations, 5 samples each, the arms' own shape)

   1 /                over50 0 [] worstGap 22.3 cal 2.3 nodes 447 rows 0 a 29 mainChars 1808 commits 13 frames ["snapshot:0","overview:0","snapshot:0","overview:0","snapshot:0","overview:0"] load 3.19→4.94
   1 /securities      over50 0 [] worstGap 66.7 cal 1.6 nodes 10318 rows 531 a 534 mainChars 48336 commits 15 frames ["snapshot:0","overview:0","snapshot:0","overview:0","snapshot:0","overview:0"] load 4.94→4.62
   1 / @20            over50 0 [] worstGap 18.7 cal 1.7 nodes 447 rows 0 a 29 mainChars 1613 trim 1x→20 commits 12 frames ["snapshot:0","overview:0","snapshot:0","overview:0","snapshot:0","overview:0"] load 4.62→4.33
   1 /securities @20  over50 0 [] worstGap 33.3 cal 2.2 nodes 765 rows 28 a 31 mainChars 4575 trim 1x→20 commits 14 frames ["snapshot:0","overview:0","snapshot:0","overview:0","snapshot:0","overview:0"] load 4.33→4.06
   2 /                over50 0 [] worstGap 33.3 cal 2.3 nodes 447 rows 0 a 29 mainChars 1808 commits 14 frames [...] load 4.06→3.82
   2 /securities      over50 0 [] worstGap 68.5 cal 2.1 nodes 10318 rows 531 a 534 mainChars 48336 commits 15 frames [...] load 3.82→3.82
   3 /                over50 0 [] worstGap 25.3 cal 1.2 nodes 447 rows 0 a 29 mainChars 1808 commits 13 frames [...] load 3.75→7.54
   3 /securities      over50 0 [] worstGap 65 cal 2 nodes 10318 rows 531 a 534 mainChars 48336 commits 15 frames [...] load 7.54→7.17

--- summary (n=10 per arm, interleaved) ---

  /
    proved 10 of 10 (unproved: []) — calibrator screen keeps 7, discards 3, band [1.38,3.52]
    UNSCREENED, all 10 proved loads: over50 []; worst rAF gap [22.3,33.3,25.3,18.9,25,18.7,18.6,34.7,18.6,24.7]; calibrator [2.3,2.3,1.2,2.7,1.9,1.3,2.4,1.2,2.6,2.7]
    tasks over 50 ms: 0 across 7 loads — []; loads carrying one: 0/7
    worst rAF gap: p50 22.3 p95 33.3 min 18.6 max 33.3 — [22.3,33.3,18.9,25,18.6,18.6,24.7]
    calibrator median 2.4 ms — ratio ×1.09 of the 2.2 ms reference
    DOM: nodes [447,447,447,447,447,447,447] tr [0] a [29]
    longtask entries per load [0,0,0,0,0,0,0,0,0,0] LoAF entries per load [0,1,0,0,0,0,0,0,0,0]
    every long-animation-frame, per proved load:
      [{"dur":50.9,"blocking":0,"scriptMs":25.2,"renderMs":20,"styleLayoutMs":20,"invokers":["http://localhost:4273/assets/index-BnqVOSWf.js","MessagePort.onmessage"]}]

  /securities
    proved 10 of 10 (unproved: []) — calibrator screen keeps 8, discards 2, band [1.38,3.52]
    UNSCREENED, all 10 proved loads: over50 []; worst rAF gap [66.7,68.5,65,50.9,67.2,51.5,50,66.7,66.8,50.1]; calibrator [1.6,2.1,2,2.1,2.1,1.3,2,2,1.8,1.3]
    tasks over 50 ms: 0 across 8 loads — []; loads carrying one: 0/8
    worst rAF gap: p50 66.7 p95 68.5 min 50 max 68.5 — [66.7,68.5,65,50.9,67.2,50,66.7,66.8]
    calibrator median 2 ms — ratio ×0.91 of the 2.2 ms reference
    DOM: nodes [10318,...] tr [531] a [534]
    longtask entries per load [0,0,0,0,0,0,0,0,0,0] LoAF entries per load [1,1,1,1,1,1,1,1,1,1]
    every long-animation-frame, per proved load:
      [{"dur":77.4,"blocking":16.1,"scriptMs":29.5,"renderMs":36.6,"styleLayoutMs":36.4,"invokers":["MessagePort.onmessage"]}]
      [{"dur":66.8,"blocking":12.5,"scriptMs":28.3,"renderMs":34.2,"styleLayoutMs":34.2,"invokers":["MessagePort.onmessage"]}]
      [{"dur":75.4,"blocking":15.9,"scriptMs":31,"renderMs":34.9,"styleLayoutMs":34.7,"invokers":["MessagePort.onmessage"]}]
      [{"dur":71.8,"blocking":17.9,"scriptMs":29.5,"renderMs":38.3,"styleLayoutMs":38.1,"invokers":["MessagePort.onmessage"]}]
      [{"dur":71.9,"blocking":16.1,"scriptMs":29.7,"renderMs":36.4,"styleLayoutMs":36.2,"invokers":["MessagePort.onmessage"]}]
      [{"dur":72.3,"blocking":11.5,"scriptMs":26.3,"renderMs":35.2,"styleLayoutMs":35.1,"invokers":["MessagePort.onmessage"]}]
      [{"dur":62.8,"blocking":11.4,"scriptMs":26.5,"renderMs":34.8,"styleLayoutMs":34.8,"invokers":["MessagePort.onmessage"]}]
      [{"dur":69.5,"blocking":11.2,"scriptMs":26.8,"renderMs":34.3,"styleLayoutMs":34.3,"invokers":["MessagePort.onmessage"]}]
      [{"dur":69.4,"blocking":11,"scriptMs":26.2,"renderMs":34.7,"styleLayoutMs":34.7,"invokers":["MessagePort.onmessage"]}]
      [{"dur":65.4,"blocking":15.1,"scriptMs":29,"renderMs":35.9,"styleLayoutMs":35.8,"invokers":["MessagePort.onmessage"]}]

  / @20
    proved 10 of 10 (unproved: []) — calibrator screen keeps 10, discards 0, band [1.38,3.52]
    worst rAF gap: p50 18.7 p95 18.7 min 18.6 max 18.7 — [18.7,18.7,18.6,18.7,18.7,18.7,18.7,18.7,18.6,18.6]
    DOM: nodes [447,...] tr [0] a [29]   main text length [1613] trim ["1x→20"]
    longtask entries per load [0,...] LoAF entries per load [0,0,0,0,0,0,0,0,0,0]

  /securities @20
    proved 10 of 10 (unproved: []) — calibrator screen keeps 10, discards 0, band [1.38,3.52]
    worst rAF gap: p50 18.8 p95 33.4 min 18.5 max 33.4 — [33.3,18.7,18.7,18.7,18.8,32.6,18.5,18.7,19.2,33.4]
    DOM: nodes [765,...] tr [28] a [31]   main text length [4575] trim ["1x→20"]
    longtask entries per load [0,...] LoAF entries per load [0,0,0,0,0,0,0,0,0,0]
```

### Three instrument findings, two of them about the shared harness

**1. `scripts/overview-instrument.mjs`'s self-test is structurally hostile to a
cold-load measurement, and the next task to measure a load through it must
disable it.** `pageInstrument` plants **120 ms inside the first
`requestAnimationFrame`** and tags every entry before **1,500 ms** as
`selfTest`, excluded from the acceptance channel. On a cold load that window
**is** the measurement: the plant lands inside the load it is measuring, and the
load's own entries are then excluded from the figure. This task ran with
`selfTestBlockMs: 0, selfTestCloseMs: 0` and proved the observer **afterwards,
per channel, on the page that produced the figure** — which is strictly better
evidence and is the shape any later load measurement should copy.

**2. The harness's `stop()` does not reap `vite preview`, so an abnormal exit
leaves port 4273 held — and the next run reads as a configuration fault.**
Produced for real here: the first attempt crashed inside a Playwright route
handler, and afterwards the backend was gone while
`node …/vite/bin/vite.js preview --outDir …` was listening on 4273 with **PPID
1**. The cause is that the preview is spawned as `pnpm exec vite preview`, so the
process the harness holds is `pnpm` and the listener is its **grandchild**;
`child.kill()` reaps the wrapper. This is the same _symptom_ Task 4.8.4 repaired
for the signal case — _the next run refused its own addresses and read as a
configuration fault_ — reached by a different route, and it is **not repaired
here** (this is a measurement task). Handed to 4.8.9 and 4.8.10.

**3. An orphaned instrument process from Task 4.8.4 was spinning at 100% of a
core for 58 minutes, with its own script file already deleted.**
`node scripts/browser-leg.mjs`, PPID 1, found before any arm was run and killed;
`scripts/browser-leg.mjs` does not exist in the tree, because 4.8.4 deleted the
throwaway and the process outlived the file. It was inside every load-average
reading on this machine for the preceding hour. Task 4.8.1's rule —
_do not read a quiet load average as a quiet machine_ — gains a converse worth
keeping: **a dead instrument's process outlives its file, so grep `ps` for this
story's script names before trusting a load reading**, not just the load number.

**And one method finding, which is why the reference is taken the way it is.**
The calibrator's reference was first taken the obvious way — 20 back-to-back
samples on a page that had been sitting quiet for 1.5 s — and read **1.4 ms**
against arms that read **2.0–2.7 ms**, because an arm samples five times
immediately after a cold load in a fresh context. The 1.6× band around 1.4 then
**discarded 2 to 8 of every 10 loads**: a screen rejecting the ordinary state of
the measurement rather than contention arriving in it. The reference used above
is **five cold loads of the cheapest route, sampled exactly where an arm
samples**, and it discards 0–3 of 10.

### Done when

1. **Met.** 40 cold loads, n = 10 per arm, interleaved, fresh context each,
   Epic 14's 20-row control plus a second 20-row control on `/`; medians and p95
   above, screened and unscreened; load average recorded either side of every
   load and printed in the transcript.
2. **Met.** ≈6 ms for the shared 518-security payload against ≈48 ms for the
   518-row markup, each licensed by its own 20-row arm, and the long frame's own
   script/render split (26–31 ms against 34–38 ms) agreeing from inside.
3. **Met, and it moved.** `longtask` 50–56 ms on 7 of 10 → **none in 10**;
   worst rAF gap 49–87 → **50.0–68.5 on 10 of 10**; LoAF 62.8–77.4 ms on 10 of 10. The breach stands; the channel that reported it does not.

### Handed onward

- **Task 4.8.8** — the verdict, in its own file.
- **Task 4.8.10** — §28's figures, two live claims to sweep, and the harness
  defect.
- **Epic 14's `EPIC.md`** — entry 1's prescribed `Re-measure:` command would
  today report no breach at all. Amended there, dated, the same day.

The instrument was `scripts/cold-load.mjs`, run twice (a discarded calibration
session and the session above) and **deleted**, per this repository's shape for a
throwaway: run it, record the findings with a verbatim row, delete it.
