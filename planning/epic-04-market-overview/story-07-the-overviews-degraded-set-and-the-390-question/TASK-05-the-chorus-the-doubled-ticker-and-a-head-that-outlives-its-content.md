# Task 4.7.5 — The chorus of four, the doubled ticker, and a head that outlives its content

**Status:** Not started
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.2

## Objective

**Three composition defects that no single region's story could have found**,
because each was added by a different one.

## What the user can see when this lands

**At 390: four regions that stop apologising in chorus, a mover row that stops
saying its ticker twice, and a region head that stops claiming figures that are
gone.**

## Work

### 1. The doubled ticker — the owner's decision, taken

`movers.ts` reads `label: names.get(figure.symbol) ?? figure.symbol`. With
`GET /securities` unreachable — **or merely slower than the first overview
frame, which is a genuine race at 124 ms against a measured 174–277 ms** — a
row reads `3 NVDA NVDA +4.2%`, and at 390 the price column is dropped so
**there is nothing between the duplicates.** A listener hears the identifier
twice.

**Reserve blank room instead**, with the row's accessible name unchanged:
`3 NVDA NVDA` reads as a rendering fault, and **absent context should be
absent**. Story 4.6's rule that the accessible name is the ticker is about the
**link**, which is a different track — this is the name track and it is a
separate decision.

### 2. The region head that outlives its content

`Region.tsx`'s `ErrorBoundary` wraps **only the content slot**; `meta` is
passed to `Panel` outside it, and the route computes it from
`movers !== undefined`. So a thrown `Movers` leaves the head reading
`Top 5 each way` — or **`ORDER HELD`** — over a fallback box saying the region
could not be displayed. Story 4.6 established that a tripped boundary keeps its
name, landmark and tab stop, which is correct; **nobody noticed it also keeps a
claim about figures that are gone.**

Same family as the market-feed cell's two true halves, and **checkable by
walking the producers rather than by rendering a state**.

### 3. The chorus of four, which is a photograph before it is a repair

`No prices yet.` / `No count yet.` / `No sector moves yet.` / `No moves to rank
yet.`, all four at the 2,000 ms floor, **stacked in one column at 390 with
three reserved panels after them**. Each is right by ADR 0029 — each region
owns its own subject — and the aggregate reading is **four separate apologies
and no explanation**, with the explanation at the foot of the page.

**Look at it before deciding anything.** Nobody has seen these four together at 390. The owner's standing instruction is to keep four sentences; if the chorus
reads as broken rather than waiting, **the repair is the ORDER** — breadth
first means the first thing a reader meets is an apology — rather than the
count. That is a Gate 2 conversation with the photograph in hand, not a change
to make here.

### And one risk this task must not take

The 2,000 ms floor is derived from **first-frame times of 174–277 ms against a
local pair**. On a phone on cellular mid-session the first frame may exceed
2,000 ms, in which case the terminal sentence appears **and is then replaced by
figures** — precisely the promise-the-next-frame-breaks that the floor exists to
prevent. **Not in `docs/GAPS.md`.** Record it; Task 4.7.10's sitting is the only
instrument that can see it.

## Done when

1. The name column reserves room rather than repeating the ticker, with the
   accessible name unchanged, and the race asserted rather than described
2. A region's `meta` does not claim figures its content no longer has —
   checked by walking the producers
3. The chorus of four is photographed at 390 and at 1440, and a recommendation
   recorded with the picture rather than a change made
4. The 2,000 ms floor's untested premise is written into `docs/GAPS.md` with a
   re-measure a phone can perform
