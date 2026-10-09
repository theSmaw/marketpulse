# Task 4.8.5 — The chart's rebuild on a tick nothing on the chart changed

**Status:** Not started
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
