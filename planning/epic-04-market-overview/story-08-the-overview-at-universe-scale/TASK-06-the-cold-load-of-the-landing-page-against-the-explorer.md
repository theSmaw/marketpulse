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
