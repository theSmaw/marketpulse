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
