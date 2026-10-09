# Task 4.8.5 — The chart's rebuild on a tick nothing on the chart changed

**Status:** **Complete — 2026-10-09.** The rebuild costs **1.3 ms a render at 1,950 bars and 3.6 ms at 6,630** (p50, production build, overview tick driven at the close's 3,727 ms cadence, calibrator x1.00 with 0 of 12 discarded) — **12% and 27%** of the 10.9–13.2 ms React render task containing it, and **18% / 27%** of `CHARTING.md` §18's 7.2–13.2 ms, which includes a live-edge join this tick does not perform. **Zero long tasks and no dropped animation frame** in any arm that sent the aggregate alone, and the chart's drawn output is **byte-identical** either side — every path string, in all four arms, including the one where `main`'s text moves by 6,717 characters. The verdict is **record with a condition, do not repair**; the component's argument is **amended, in two places**, and the trigger is a ratio rather than a bar count. The control found something nobody had recorded: **the 30 s health poll already rebuilds both plots**, twice a minute, with nothing arriving.
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1, 4.8.2

## Objective

**An overview frame rebuilds the price and volume path strings for up to 6,630
bars, on a page that does not display an overview.** The owner asked for this
measured at Gate 1.

## What the user can see when this lands

**Nothing.** If the figure is bad, the repair is `memo()` on two plots — which
reverses an argument recorded in the component, so it is a decision rather than
a tidy-up.

## Work

### What is memoised on `/securities/:symbol` and what is not

| Surface                                               | Boundary                                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `useLiveSeries`                                       | memoised on `[view, watched, key, liveFeed]` — **the live-edge join does not re-run** on an overview-only tick |
| `ChartAxis`'s `timeFrame`                             | memoised — **the calendar walk does not re-run**                                                               |
| `UniverseTable` rows                                  | `memo()` ×3, props identity-stable, so 518 rows reconcile and bail                                             |
| **`PriceChart`, `VolumeChart`**                       | **none** — and `priceFrame(...)` / `volumeFrame(...)` are called in the render bodies with no memoisation      |
| `SecurityExplorer`, `UniverseTable`, `BarSeriesPanel` | none                                                                                                           |

**The absence is deliberate and its premise is falsified.** The comment
arguing against memoising the frame builders names a **crosshair** as the only
possible caller — written before anything could re-render the chart on a timer.
**Story 4.2 falsified that premise** by giving every route an overview frame.

### What to measure

The script cost of a `priceFrame`/`volumeFrame` rebuild **with unchanged
bars**, at the default window and at **6,630**. Note that `CHARTING.md` §18's
7.2–13.2 ms **includes the live-edge join**, which an overview tick does not
perform — so that figure is not this one and must not be cited as it.

### And the regression this task must not cause

ADR 0027's one-path silhouette is **13 drawn elements at 6,630 bars**, which is
why 3.4× the bars costs 1.8× the script. A memo boundary must not change what
is drawn; the proof is that `main`'s text and the drawn element count are
identical either side.

## Done when

1. The rebuild's script cost measured at the default window and at 6,630 bars,
   on a production build, with the overview tick driven rather than waited for
2. Compared against §18's figure **with the difference in what each includes
   stated**
3. A verdict: repair here, or recorded with a condition — and if repaired, the
   component's argument amended rather than deleted, because it was right about
   the crosshair

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

**The server is not where a per-tick chart cost comes from, and here are the
numbers that say so.** The per-client half of `publishObservations` — `scopedTo`
over 518 observations, the `bars` encode and the send — is **1.59 ms** for a
client subscribed to all 518 and **0.113 ms** for one subscribed to a single
symbol, measured against the real gateway with a cached overview as the control.
The `bars` body itself is **60,107 bytes** at 518 and **1,780** at 25. So
anything you measure on `/securities/:symbol` above a couple of milliseconds is
decode, reconcile or render, and the `withLiveEdge` rebuild is the place to look.

Note also that **a cold `/securities/:symbol` costs three server joins**, the
same as `/` — the page subscribes to all 518 because the universe table renders
there too.

## Handed here by Task 4.8.4 — 2026-10-09

**Three things about the instrument, and one about the figure you are chasing.**

- **Task 4.8.3's gap-sensitivity warning does not apply to your arm.** Its
  fixed-cost calibrator reads ×2.4–3.5 at a gap **in a Node process**; sampled
  in a visible Chromium renderer beside every burst at gaps of **3,727 ms and
  8,824 ms**, the same calibrator reads **×1.00** in five arms out of five
  (discards 0–3 of 8–14). So your browser figures are absolute on this machine,
  and you do **not** need to publish them with 4.8.3's tight-loop caveat. Keep
  sampling the control — that is how this was established.
- **Channel 3 measures ELAPSED time, not script.** `openBurst` posts to a
  `MessageChannel` at a frame's arrival and the handler reads
  `performance.now() - t0`, so **anything the browser does in between lands in
  the figure** — including style, layout and paint. Measured: the same `bars`
  frame reads **0.1–0.2 ms** when nothing on screen changes and **2.4–3.4 ms**
  when an aggregate committed between the two frames. On a chart that redraws
  13 drawn elements, that distinction is the whole measurement.
- **If you need React's own render task, wrap `MessageChannel`** — installed
  **after** the harness's init script, so the harness's own `endOfTask` channel
  was built with the native constructor and is structurally outside your
  numbers — and tag each port task with the commits that happened inside it.
  The channel with commits in it is React's scheduler. Proved against a planted
  70 ms block, caught at 70.0–70.1 ms in all seven arms. **And forward to the
  native `onmessage` descriptor**: an own accessor shadows
  `MessagePort.prototype`'s, React's scheduler then never runs, the page
  renders nothing and **no error is raised anywhere**.
- **The route's own background rate is 1 commit a second**, `useMarketClock`'s,
  and `drain()` returns everything since the previous drain — so a per-batch
  bucket at an 8.8 s cadence contains ~9 of them. Run a **quiet arm at the same
  cadence** and subtract; a narrow phase-aligned window is the alternative and
  it cannot contain the arrival mark's 900 ms decay.

---

## What was done — 2026-10-09

**Status:** Complete. **No shipped behaviour changed.** One throwaway
instrument written, run and deleted (`scripts/chart-rebuild.mjs`); one temporary
probe added at the two call sites, run, and removed with the file checksums
compared either side; one component comment given a **dated amendment** rather
than a rewrite. The verdict is **record with a condition, do not repair**, and
the argument is below rather than asserted.

### The answer, in one table

Per render, on `/securities/NVDA` at 1440×900, production build, furnished
socket, one `overview` frame a batch at the close's measured cadence
(**3,727 ms**, 16.1/min), `provider=none` against the developer's own store so
Story 3.8's live bar writer has no stream to hang off.

| on screen                       | `priceFrame` | `volumeFrame` | **the rebuild, per render** | the React render task containing it | the rebuild's share |
| ------------------------------- | ------------ | ------------- | --------------------------- | ----------------------------------- | ------------------- |
| **1,950 bars** (default window) | 0.6 ms       | 0.6 ms        | **1.3 ms**                  | **10.9 ms**                         | **12%**             |
| **6,630 bars**                  | 1.9 ms       | 1.5 ms        | **3.6 ms**                  | **13.2 ms**                         | **27%**             |

All p50. n = **13 builds per plot** and **12 batches** per window; the first two
batches of each arm are dropped as the load's own tail. Spreads:
price `0.4–0.9` / `1.5–2.5`, volume `0.4–0.8` / `1.1–5.5`, per render
`0.8–2.4` / `2.6–7.4`.

**The calibrator reads ×1.00 in every arm, 0 discarded of 12** (0 of 24 in the
two-frame arms), band `0.75–1.92 ms` against a 1.2 ms reference taken tight on
the page itself — so Task 4.8.4's finding holds here too and these figures are
absolute on this machine rather than carrying 4.8.3's gap caveat.

**And §28's line is met with an order of magnitude to spare by the chart.** In
all four aggregate-only arms: **zero** `longtask` and zero
`long-animation-frame` entries, worst rAF gap **17.7–17.8 ms** against a
16.7 ms quantum, 2,686–2,687 gaps sampled an arm. The observer was proved in
every arm (a 120 ms self-test) and the render-task channel was proved against a
planted **70 ms**, caught at **70.0 ms** in all six arms.

### The control, and what it found that was not asked for

**The quiet arm is not quiet.** With nothing sent at all, the two plots still
rebuilt **twice in 45 s** — `buildsPerBatch` **0.17** against the overview
arm's **2.17** — which is one rebuild of each plot per **health poll**.
`App` polls `/health` every 30 s, every poll writes a fresh state object, and
`App` is the router's host. So **the chart was already rebuilding twice a
minute before Story 4.2 existed**, and the overview frame multiplies that by
eight rather than introducing it. `App.tsx` says the per-poll re-render was
measured and accepted at Task 1.12.3 and names its own reversal trigger as _a
render rate that is no longer a poll_; that trigger fired in Epic 3 and this is
the first measurement of what it costs the chart.

Two further things the control establishes, both negative and both wanted:

- **Zero builds between polls.** Nothing else on this route rebuilds the
  chart on a timer — so every build in the overview arms is attributable to the
  frame that was sent.
- **An isolated rebuild costs MORE than one at cadence.** The quiet arm's two
  samples read **0.7 / 0.8 ms** at 1,950 bars and **2.9 / 2.1 ms** at 6,630,
  against 0.6 / 0.6 and 1.9 / 1.5 at cadence. n = 1 either side, so it is
  recorded rather than concluded; the plausible reading is a cold JIT and cold
  caches 30 s apart.

### Nothing on the chart changed, and that is measured rather than asserted

The claim in this task's title is a measurement here:

| arm                     | `main` text                                     | Price plot                                                                   | Volume plot                               |
| ----------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| aggregate only, 1,950   | **identical** (48,793 chars, hash `-786720698`) | **identical** — 20 elements, 2 paths, 1,952 vertices, path hash `1215416830` | **identical** — 10 elements, 833 subpaths |
| aggregate only, 6,630   | **identical** (48,800 chars, hash `-101716596`) | **identical** — 31 elements, 6,632 vertices, hash `-1819339818`              | **identical** — 22 elements, 833 subpaths |
| `bars`+aggregate, 1,950 | 48,793 → **55,510**                             | **identical**, every figure above unchanged                                  | **identical**                             |
| `bars`+aggregate, 6,630 | 48,800 → **55,517**                             | **identical**                                                                | **identical**                             |

So on this route an `overview` frame changes **nothing at all** inside `<main>`
— not one character over fourteen frames — and still rebuilds both plots. The
two-frame arm is the stronger form of the same finding: the page's text moves
by 6,717 characters (517 table rows gaining a live price and an arrival mark)
while **every path string the two plots draw is byte-identical**, which is also
the ADR 0027 proof this task owed had it repaired anything.

### The comparison with `CHARTING.md` §18, and what each figure includes

**§18's 7.2–8.1 / 12.3–13.2 ms is not this figure and must not be quoted as
it.** Stated rather than implied:

|            | **§18** (Task 3.9.9, 2026-09-24)                                                                                                                                                                               | **this task**                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the event  | a **bar arriving** for the security on screen                                                                                                                                                                  | an **`overview` frame** for a page that displays no overview                                                                                                                       |
| the figure | **7.2–8.1 ms** at 1,950, **12.3–13.2 ms** at 6,630                                                                                                                                                             | **1.3 ms** at 1,950, **3.6 ms** at 6,630                                                                                                                                           |
| includes   | the `bars` decode, the `withLiveBars` join, `toBarSeries`, `timeFrame`, both frame builders, React's render and commit, and the style, layout and paint of a chart whose series **changed** — net of a control | `priceFrame` and `volumeFrame` **only**, timed at their own call sites                                                                                                             |
| excludes   | —                                                                                                                                                                                                              | the decode, the reducer, React's reconcile, style, layout, paint, and the 518-row table on the same route                                                                          |
| the series | **changed** — this is a chart being extended                                                                                                                                                                   | **unchanged** — every path string identical either side                                                                                                                            |
| the join   | **runs**                                                                                                                                                                                                       | **does not run.** `useLiveSeries` is memoised on `[view, watched, key, liveFeed]` and `ChartAxis`'s `timeFrame` on `[price, volume, view, report]`, and an aggregate moves neither |

**The rebuild is 18% of §18's figure at the default window and 27% at 6,630** —
and the two scale differently, which is the part worth keeping. §18 recorded
_3.4× the bars costs 1.8× the script_; the two frame builders on their own cost
**2.8×**, because they **are** the part that is linear in the bar count
(`placeBars`, the point map, the path string) while §18's figure carries the
fixed costs of a decode, a reducer and the paint of thirteen elements. ADR
0027's silhouette dividend is in §18's number and not in this one.

### The verdict: record with a condition, do not repair

`memo()` on `PriceChart` and `VolumeChart` **would work** — the props are
`view` (`series.screen.shown`, identity-stable across an aggregate because
`withLiveEdge` returns the same screen and `useLiveSeries` the same view),
`symbol`, `pending` and `stored`, all four stable — and it would remove
**1.3 ms** a render at the default window and **3.6 ms** at 6,630. It is not
taken, for four reasons in descending order of weight:

1. **The figure is 12–27% of the task it sits in, and the other 73–88% is
   somebody else's already-owned defect.** The render task containing the
   rebuild is **10.9–13.2 ms** with nothing on screen changing, and
   **24.1–26.6 ms** (max **48.4 ms**) when the table's 517 rows change. The
   chart is not what makes this page expensive; the 518-row universe table is,
   and `CLAUDE.md` and `planning/epic-14-performance-scale-validation/EPIC.md`
   already own it by name.
2. **§28's word is _task_, and no arm that sent the aggregate alone produced
   one.** Zero long entries, no dropped frame, worst rAF 17.8 ms. A 1.3–3.6 ms
   saving buys nothing measurable against the criterion the repair would be
   justified by.
3. **A memo is a conditional recomputation whose condition is a dependency
   somebody has to keep right**, which is `ChartReading.tsx`'s own recorded
   argument and still correct. The structurally stronger repair for a render
   arriving from **above** is a boundary above — and the right boundary is
   whatever Epic 14 chooses for the table, which renders in the same subtree
   for the same reason.
4. **The rebuild is not new and was not introduced by Story 4.2.** The health
   poll was already doing it twice a minute, measured above.

**The reversal trigger is a ratio, not a bar count**, and deliberately:

> **The first measurement in which `priceFrame` and `volumeFrame` together are
> more than HALF the React render task that contains them.**

A bar count would be the wrong form. The densest chart this product can draw is
**8,190 bars** (`CHARTING.md` §19, `MAX_MINUTE_SESSIONS = 21`), which at this
task's 2.8× scaling is **~4.4 ms** — still a quarter of the task — so a
threshold written in bars either never fires or fires on a window nobody asks
for. The ratio is answerable from one run of the same two channels, and it moves
the moment the table's cost is repaired, which is the condition under which the
chart's share actually starts to matter.

### What this task's own instrument does NOT certify

- **The per-batch rebuild count.** A real batch on this route is **two** frames
  — the scoped `bars` frame and the aggregate — and Task 4.8.2 measured **two
  renders a batch** here against the real gateway. The two-frame arm driven
  here produced **2.17 builds a batch**, identical to the aggregate-only arm,
  because the furnished socket's inter-frame gap coalesces the two `setView`
  calls (4.8.2 measured 0.4–6.6 ms furnished against 4.4–33.1 ms real). So
  **per batch against the real gateway the arithmetic is 2× these figures —
  2.6 ms and 7.2 ms — and that is arithmetic rather than a measurement.**
  At 16.1 batches a minute: **42 ms a minute at the default window, 116 ms at
  6,630**, spread across 32 tasks.
- **The two-frame arm's long frames are not the chart's and are not the
  product's shape either.** That arm produced **8–9 long entries of 51–96.9 ms
  per 12 batches** (worst rAF **100.4 ms**) — but it sends all **517** other
  securities in every `bars` frame, where the real feed delivers 332–450 bars a
  minute across **8.8–16.1** frames, i.e. ~25–50 observations a frame. It is
  the _every row changing_ worst case at 16× the real rate, and the figure that
  governs is Task 3.6.5's measured 37–40 ms of script with every row changing.
  **The chart's own figure is unaffected by it** — 1.2 / 3.3 ms against 1.3 /
  3.6 — which is why the headline survives the arm that breached §28.
- **The window.** This machine's store ends **2026-09-11**, so the honest
  default window today is empty. Both bodies were fetched from the real handler
  through the route's **absolute** window form (`start`/`end`) and replayed into
  the page: **1,950** and **6,630** real stored bars, read off the plot's own
  vertex count (1,952 and 6,632 `L` commands, the two extra being the area
  path's closing segments) rather than off the body.
- **A real gateway, and a deployed page.** Furnished frames must never reach a
  deployed page; this is the browser's cost of a rebuild and not the
  deployment's.

### The transcript, verbatim

```text

The chart's rebuild on an overview tick — Task 4.8.5 (base)

  Load average 5.21 across 8 cores (ratio 0.651) against a ceiling of 1.00.
  built .capture/instrument/dist in 0.6 s (VITE_API_BASE_URL=http://127.0.0.1:3100)
  pair up — PRODUCTION BUILD
    frontend http://localhost:4273 (vite preview, index-DUUnXuC_.js, 398 KiB)
    backend  http://127.0.0.1:3100 (dist/index.js, provider=none, store=marketpulse, CORS_ORIGIN=http://localhost:4273)
  bodies — default 1950 bars, dense 6630 bars (real stored bars, absolute window)
  base — default / overview+nothing-changed
    bars [1950] | builds/batch 2.17 | price p50 0.6 | volume p50 0.6 | per batch p50 1.3 | react task p50 0.3 | worst rAF 17.8 | long 0 | cal x1 (0/12 discarded)
  base — default / quiet
    bars [1950] | builds/batch 0.17 | price p50 0.7 | volume p50 0.8 | per batch p50 0 | react task p50 0.3 | worst rAF 17.7 | long 0 | cal x— (—/0 discarded)
  base — dense / overview+nothing-changed
    bars [6630] | builds/batch 2.17 | price p50 1.9 | volume p50 1.5 | per batch p50 3.6 | react task p50 0.3 | worst rAF 17.7 | long 0 | cal x1 (0/12 discarded)
  base — dense / quiet
    bars [6630] | builds/batch 0.17 | price p50 2.9 | volume p50 2.1 | per batch p50 0 | react task p50 0.3 | worst rAF 17.8 | long 0 | cal x— (—/0 discarded)

Load 5.21 before, 3.33 after (ceiling 1, 8 cores).

wrote .capture/instrument/chart-rebuild-base.json
```

```text

The chart's rebuild on an overview tick — Task 4.8.5 (twoframe)

  Load average 2.81 across 8 cores (ratio 0.351) against a ceiling of 1.00.
  twoframe — default / bars+overview (the real two-frame batch)
    bars [1950] | builds/batch 2.17 | price p50 0.5 | volume p50 0.6 | per batch p50 1.2 | react task p50 0.3 | worst rAF 100.4 | long 9 | cal x1 (0/24 discarded)
  twoframe — dense / bars+overview (the real two-frame batch)
    bars [6630] | builds/batch 2.17 | price p50 1.8 | volume p50 1.4 | per batch p50 3.3 | react task p50 0.3 | worst rAF 83.3 | long 8 | cal x1 (0/24 discarded)

Load 2.81 before, 4.44 after (ceiling 1, 8 cores).
```

The dense aggregate-only arm in full, which is the arm the headline comes from:

```json
{
  "arm": "base — dense / overview+nothing-changed",
  "density": "dense",
  "bodyBars": 6630,
  "barsOnThePlot": [6630],
  "cadence": "16/min, every 3727 ms",
  "batches": 12,
  "framesSent": 14,
  "subscribedWhenMeasured": 518,
  "socketUrls": ["ws://127.0.0.1:3100/market-stream"],
  "observerProved": true,
  "channelProof": { "plantedMs": 70, "caught": [70], "channelTasksSeen": 15 },
  "visibility": "visible",
  "wrapperIntact": true,
  "pageErrors": [],
  "frameBuildMs": {
    "price": { "n": 13, "p50": 1.9, "p95": 2.5, "max": 2.5, "min": 1.5 },
    "volume": { "n": 13, "p50": 1.5, "p95": 5.5, "max": 5.5, "min": 1.1 },
    "perBatch": { "n": 12, "p50": 3.6, "p95": 7.4, "max": 7.4, "min": 2.6 },
    "buildsPerBatch": 2.17
  },
  "reactRenderTaskMs": {
    "withCommits": {
      "n": 58,
      "p50": 0.3,
      "p95": 13.8,
      "max": 21.3,
      "min": 0.1
    },
    "withBuilds": {
      "n": 13,
      "p50": 13.2,
      "p95": 21.3,
      "max": 21.3,
      "min": 11.8
    }
  },
  "rafGapMs": { "n": 2687, "p50": 16.7, "p95": 17.4, "max": 17.7, "min": 15.6 },
  "longEntries": [],
  "calibrator": {
    "tight": { "n": 25, "p50": 1.2, "p95": 2.7, "max": 2.7, "min": 1.1 },
    "atTheGap": { "n": 12, "p50": 1.2, "p95": 1.2, "max": 1.2, "min": 1.1 },
    "ratioToTight": 1,
    "screenedAtTheGap": {
      "band": [0.75, 1.92],
      "reference": 1.2,
      "kept": 12,
      "discarded": 0,
      "discardedSamples": []
    }
  },
  "drawn": {
    "before": {
      "main": { "chars": 48800, "hash": -101716596 },
      "Price": {
        "elements": 31,
        "paths": 2,
        "subpaths": 1,
        "vertices": 6632,
        "pathHash": -1819339818
      },
      "Volume": {
        "elements": 22,
        "paths": 1,
        "subpaths": 833,
        "vertices": 1,
        "pathHash": 1785273907
      }
    },
    "after": {
      "main": { "chars": 48800, "hash": -101716596 },
      "Price": {
        "elements": 31,
        "paths": 2,
        "subpaths": 1,
        "vertices": 6632,
        "pathHash": -1819339818
      },
      "Volume": {
        "elements": 22,
        "paths": 1,
        "subpaths": 833,
        "vertices": 1,
        "pathHash": 1785273907
      }
    }
  }
}
```

### How it was measured, and the two instrument notes worth keeping

**The probe is at the call sites, not around a task.** `performance.now()`
either side of `priceFrame(...)` and `volumeFrame(...)` in the two render
bodies, pushed into a page array with the bar count beside it. That is forced
rather than preferred: Task 4.8.4 established that channel 3 measures **elapsed**
time from a frame's arrival to a `MessageChannel` message running, so style,
layout and paint land inside it — the same `bars` frame read 0.1–0.2 ms with
nothing on screen changing and 2.4–3.4 ms when a commit happened in between.
Nothing that measures a task can price two pure functions. The probe was
removed afterwards and both files' MD5s compared against copies taken before it
was added: `14bd276b7ce0807801fc2b1a520e2216` and
`36a6b1e874529d563df68b772605fb3e`, unchanged.

**`routeWebSocket` must be registered BEFORE the harness's init scripts.**
Playwright installs its own page-side `WebSocket` mock through an init script of
its own, init scripts run in registration order, and routing last **replaces**
the harness's wrapper — `wrapperIntact` reads false and the arm reports nothing,
which is Task 4.5.8's measured defect from a new direction. Registered first,
the application's `new WebSocket` reaches the harness's wrapper, which
constructs Playwright's mock: `wrapperIntact: true` and
`socketUrls: ["ws://127.0.0.1:3100/market-stream"]`, counted by URL, in all six
arms. **Worth adding to the harness's own notes if a later task needs both.**

### Done when

1. **Met.** 1.3 ms at 1,950 bars and 3.6 ms at 6,630, p50, production build,
   with the overview tick **driven** at 3,727 ms, a quiet control at the same
   cadence, a calibrator ratio and discard count beside every figure, and the
   bar count read off the plot.
2. **Met.** The §18 comparison is a table above with what each figure includes
   and excludes, the 18% / 27% relation, and the different scaling explained.
3. **Met.** The verdict is **record with a condition**; the argument in
   `ChartReading.tsx` is given a **dated amendment** that keeps the crosshair
   paragraph standing, states what Story 4.2 falsified, carries the measurement
   and names the ratio trigger.

## Handed to Task 4.8.6 — 2026-10-09

- **The health poll rebuilds the chart.** `App`'s 30 s `/health` poll produces
  one render of every plot, measured here at **2 builds in 45 s with nothing
  else happening**. A cold-load arm that runs longer than 30 s has a poll in it;
  interleave as planned and the poll lands in both arms, but do not read a
  second long frame 30 s in as a cold-load artefact.
- **A `/securities/:symbol` arm can be driven with real bars on a store whose
  coverage has aged out**, which the brief's recipe cannot do: fetch the body
  from the real handler through its **absolute** window form (`start`/`end`) and
  replay it with `page.route`. `?sessions=5` on this machine today is a correct
  **empty**.

## Handed to Task 4.8.8 — 2026-10-09: a THIRD candidate condition, and why it is not offered as one

**Do not add the chart's rebuild to the trigger.** This task measured the
`/securities/:symbol` half of the same question and the figure is **1.3–3.6 ms
a render, 12–27% of the task containing it** — so a clause naming it would be
exactly the defect 4.8.8's own brief identifies: _a figure wearing a condition's
clothes_. The condition this task records lives in `ChartReading.tsx` and is a
**ratio of two things one measurement gives** (the two builders against the
render task containing them), which is answerable without deciding whether a
number is large.

**What 4.8.8 should take from here instead is one fact for its B clause.** The
aggregate is produced on the observations publish, and on this route the
**health poll** is already a second, independent cadence that re-renders the
whole tree — so if B is worded as _a cadence the bar feed does not set_, note
that one such cadence has existed since Story 1.12 and is accepted in writing in
`App.tsx`. B should say **the overview aggregate**, not **a whole-tree render**,
or it is already met.

## Handed to Task 4.8.10 — 2026-10-09

- **`CHARTING.md` §18 owes a cross-reference rather than a correction.** Its
  7.2–13.2 ms is correct for the event it measures and is **not** the cost of an
  overview tick; this task's figures are 18% / 27% of it. Nothing in §18 is
  falsified — what is missing is the sentence saying which event each figure is
  of, now that two events rebuild the same chart. Add it beside §18 with the
  table above, in §18's own words rather than by link.
- **The sentence _"nothing re-rendered the chart before today"_ was false for
  six weeks** — from ADR 0038 (2026-09-26) to 2026-10-09 — and it exists in
  **two** places, both amended here with a dated block rather than rewritten:
  `ChartReading.tsx` (the design argument) and `PriceChart.test.tsx` (the same
  premise above the crosshair guard, whose own assertion is unaffected and is
  unchanged). Enumerated by grepping `apps/frontend/src` and
  `packages/shared/src` for `Nothing re-render`, `re-rendered the chart` and
  `never re-render` — **3 hits, 2 live, both amended** — and by grepping for
  `memois`/`unmemoised`, which found five further sites, all of which describe a
  memo that exists rather than a premise that something does not re-render.
  Worth one wider grep in the sweep for any **other** comment whose premise is
  _nothing re-renders this_, because Story 4.2 falsified that premise for every
  route at once.
- **The quiet-arm figure for this route is 2 chart rebuilds a minute from the
  health poll**, which belongs in §28's account of what the page costs when
  nothing arrives.
