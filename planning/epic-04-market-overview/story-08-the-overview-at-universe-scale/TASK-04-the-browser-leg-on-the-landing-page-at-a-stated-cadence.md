# Task 4.8.4 — The browser leg on `/`, at a cadence that is set rather than assumed

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1, 4.8.2

## Objective

**The cost this story owns is ~16 whole-tree renders a minute, and no feed this
repository can run offline produces that cadence.**

## What the user can see when this lands

**Nothing, and the absence of a stutter once a minute is the point.**

## Work

### Why the obvious recipe measures 1/16 of the effect

The fixture ticks at `tickEveryMs = 60_000`; the replay _"emits one slice per
minute across every symbol"_ and **cannot express a split minute at all**, by
its own comment. The real feed is **8.8–16.1 batches a minute**. So a reader
following Task 3.6.5's recipe gets a comfortable green at **one sixteenth** of
the real render count — the exact inverse of 3.6.4's _the fixture is the harsher
feed_, which was true of payload and is false of cadence.

### The owner's Gate 1 decision: the furnished socket, local only

`serveFeed` / Playwright's `routeWebSocket` is **the only mechanism that can
set cadence AND composition freely**, and the only one that gives a true
control arm — `bars` only against `bars` + `overview` — without editing shipped
code. It certifies stages 9 and 10 (decode, render, paint) exactly and the
backend not at all, which is 4.8.3's job.

**It runs locally and never against a deployed page.** The standing rule is
that replayed or synthetic data must never reach the deployed site, and
`e2e:deployed` plus `routeWebSocket` would put furnished frames in front of a
deployed page in one browser context — honest for a measurement, and exactly
the shape a reader mistakes for a product state in a screenshot. **Do not take
that arm.**

### A browser on `/` subscribes to ~25 symbols, not 518

`symbolKey` is four proxies + eleven sectors + ten movers. **So "the whole
universe arriving" is not a state this route has**, and the arm must say what
it actually drives: one 431-byte-plus `overview` frame and a `bars` frame
scoped to ~25 observations, at the stated cadence.

### State the minimum detectable effect BEFORE running an arm

Task 4.5.8 measured the whole movers tick at **p50 0.3 ms of script, worst
frame 18.6 ms, zero `longtask` entries in both arms**, and recorded that it
**cannot see a regression smaller than a millisecond**. A proved LoAF observer
on `/` will correctly report zero and certify nothing. **If the MDE exceeds the
effect sought, say the measurement cannot answer the question** — that is the
honest close, and 4.5.8 set the precedent.

### Also take the frame's real size

`431 bytes` is the **four-proxy** frame. It has since gained eleven sectors,
breadth (+6–8 bytes) and movers (**1,243 bytes measured**). The
`6.9 KiB/min` and `12% on top` figures in this story and in `docs/GAPS.md` are
arithmetic on the 431. Re-take it.

## Done when

1. Per-tick script and worst animation frame on `/`, production build, at a
   **stated, driven** cadence with the control arm beside it
2. The MDE stated before the arm ran, and compared with the effect sought
3. The overview frame's real size measured, and the two derived byte figures
   corrected where they are live
4. The cadence's provenance recorded: what drove it, and that no offline feed
   reproduces it
