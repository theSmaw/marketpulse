# Task 4.8.6 — The cold load of `/` against `/securities`

**Status:** Not started
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
