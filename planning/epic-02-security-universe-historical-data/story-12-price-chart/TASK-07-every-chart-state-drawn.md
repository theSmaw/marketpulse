# Task 2.12.7 — Every chart state drawn, from a recorded body

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.5

## Objective

Render every member of `BarSeriesView` as a chart state — not only the one with
bars in it — and make a **series that stops before its own x-axis does** read as
the answer it is rather than as a broken chart.

Task 2.11.6 is the precedent and the argument is the same: 2.12.4 is about the
chart working, this is about it being honest, and combining them is how the
honest half gets shortened.

## What the user can see when this lands

**A chart that never lies about what it has.** A security with no stored bars,
a window only half covered, a refused request, an untracked symbol and an
unreachable backend each produce something a person can read and, where there is
something to do, act on — and **none of them takes the page with it**, which is
§36's rule and this repository's `Region` boundary.

## Work

- **All six members, produced through the real transition.** `loading`,
  `loaded`, `partial`, `empty`, `refused`, `failed` — plus the `stale` flag on
  the three answers. **Do not construct a state by hand**: `apps/frontend/src/
fixtures/` holds eleven recorded response bodies and `barSeriesFixtureView(name)`
  returns the state built through the real transition. A hand-built `partial`
  whose coverage disagrees with its bars is unreachable in the real layer, and a
  chart tuned against one draws the real thing wrongly.

- **`partial` is the state this task exists for.** The x-axis covers the window
  that was **asked for** — the server resolved it and reported it in
  `coverage.requested` — and the data stops somewhere inside it. Draw the
  difference rather than hiding it by shrinking the axis to the data, and say in
  words where the data ends. This is the normal case, not the exceptional one:
  the store is backfilled nightly and the free plan withholds the most recent
  ~15 minutes.

- **`stale` is a mark and must never touch a number.** `FRONTEND-STATE.md` §2's
  amendment: no dim, no blur, no fade, no skeleton over a price. And note the
  stated reversal trigger — **a chart that redraws a held series in a second
  style is the first thing that would turn `stale` into a seventh union member**.
  If this task needs that, it goes to §2 rather than being taken locally.

- **`empty` and `refused` are answers, not errors.** A security we track with no
  stored bars, and a request the server declined with a reason — each gets a
  sentence that names the cause, and `refused` carries no `Try again` where
  trying again cannot help.

- **`failed` keeps the page.** One `Try again`, the `requestId` where there is
  one, and the regions around it untouched — including the tracked universe
  below, which the existing browser specs already assert survives.

- **Two sentences describing one failure must not use the same words.** This
  page now renders from two fetches and, after this task, up to three surfaces
  describing them. It has gone wrong three times in one afternoon before, every
  time caught by a locator resolving to two nodes rather than by anybody reading
  the page.

- **Stories per state**, which criterion 6 requires and `pnpm stories`
  enforces for anything under `src/components/`.

## Done when

- Every member of the union renders, plus `stale` on each answer, each from
  `barSeriesFixtureView` rather than a hand-built object
- `partial` draws the asked-for window and the shorter covered one, and says
  where the data ends
- No state dims, blurs or fades a number
- A failed chart leaves the rest of the page intact — asserted in the browser,
  where a boundary can actually be observed
- No two surfaces on this page describe one failure with the same sentence
- Stories exist per state and `pnpm stories` passes
- `pnpm verify` passes

## Notes

If a state needs a recorded body the fixture set does not have, **record one**
rather than writing an object literal. The set is the reason the states on this
page are reachable rather than plausible.

The fence is the text alternative and the screen-reader walk — 2.12.8's. This
task makes each state _render_; that one makes each state _speak_.

---

## Amended 2026-09-11 by Task 2.12.2 — `partial` has a drawn treatment; `stale` deliberately does not

**`partial` is settled and this task implements it.** From the canvas and
`VISUAL-LANGUAGE.md`'s _The chart_ section:

- the requested-but-unheld span takes **`--chart-uncovered`** — 1.107:1, the
  quietest mark in this language;
- the coverage edge is a **dashed vertical** rule;
- the series is **clipped** at that edge rather than drawn to the frame;
- and the sentence beneath the plot carries the fact in words, unchanged and
  un-abbreviated, as `CHARTING.md` §5 requires.

The two constraints behind that shape, both of which a later tidy-up will be
tempted to break: **it must not read as a failure** — so no hatching, no warning
colour, no icon, and the wash is at the floor of visibility on purpose — and **it
must not read as flat data**, which is what the clip prevents rather than the
wash. Removing the clip and letting the line run to the frame is the defect this
whole treatment exists to make impossible, and it renders perfectly.

**`stale` was not settled and is still entirely this task's.** Worth stating
plainly, because everything else on this page's visual vocabulary now has an
answer somewhere and it would be reasonable to assume this one does too. It does
not: 2.12.2 took no position on what a held series looks like while the next one
loads. The constraints stand exactly as the Work section has them —
`FRONTEND-STATE.md` §2's amendment, no dim, no blur, no fade, no skeleton over a
price — and so does the reversal trigger: **a chart that redraws a held series in
a second style is the thing that turns `stale` into a seventh union member**, and
that is taken at §2 rather than here.

The one hint available: `BarSeriesPanel` already answers this without colour, with
a dashed marker and a travelling dashed rule above the figures rather than on
them. A chart has the same problem and more room.

**And one addition to the "two sentences must not use the same words" bullet.**
That bullet counts the surfaces on this page as "up to three" after this task.
It is now four — search, the tracked universe, the stated-facts block and the
chart's own state — and the chart's coverage sentence and the facts block's
coverage sentence describe _the same event on the same fetch_, which is the
closest pair this page has ever had.
