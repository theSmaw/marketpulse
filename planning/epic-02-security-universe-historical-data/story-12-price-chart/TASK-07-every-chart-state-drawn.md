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

---

## Amended 2026-09-11 by Task 2.12.3 — `partial` is not a synonym for "the line stops early"

[`CHARTING.md`](CHARTING.md) §10.1 records the finding in full; this is the half
that changes what this task builds.

§6.2's rule — the x-domain comes from `coverage.requested`, so a `partial` answer
leaves visible space at the right-hand edge — holds **only when the shortfall is
made of trading minutes**. The recorded `partial` fixture's is not: it holds 60
bars covering Friday 15:00–16:00 ET against a window requested to Saturday 16:00
ET, and on a session-ordinal axis that window has exactly 60 slots in it, because
**Saturday contributes none**. The bars fill the frame, correctly.

So `barSeriesFixtureView("partial")` **does not exercise `--chart-uncovered`, the
dashed coverage edge, or the clip**, and a treatment built and reviewed against it
alone is a treatment nothing on screen has run. Verified in
`market/chart-time-axis.test.ts`, at _comes from the requested window and not from
the bars_ and the test after it.

The state that does show space is the ordinary one — a window reaching into a
session in progress, which the free plan withholds the most recent ~15 minutes of.
Either record a body for it or build the axis for one in the story, and **do not
take a green render of the existing `partial` fixture as evidence the treatment
works**.

---

## Amended 2026-09-12 by Task 2.12.4 — four of the six states already render, so this task reviews them and draws two

The largest change to this task is that **it is no longer where most of these
states first appear**. 2.12.4 could not draw `loaded` without deciding what the
component does with the other five members, because it takes the view whole and
its `switch` is exhaustive. So it took those decisions, and this task's job on
four of six is to **confirm or overturn a decision that exists** rather than to
originate one — which is a different and smaller job, and is worth knowing before
planning it.

### What renders today, and on whose authority

| State                | Today                                                               | This task                                        |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `loading`            | A real frame with an empty scale — gridlines, no labels, no line    | Finish the **treatment**; the shape is fixed     |
| `loaded`             | Drawn                                                               | Nothing                                          |
| `partial`            | Drawn as `loaded` is — correct axis, **no uncovered treatment**     | **The whole of it.** This is still the task      |
| `empty`              | A real, labelled axis and no line                                   | Review; add the sentence's relationship to it    |
| `refused` / `failed` | **No chart at all.** The panel's sentence stands alone              | Confirm or overturn, deliberately                |
| `stale`              | Untouched — the panel's dashed rail marks it and the chart does not | **Entirely this task's**, as 2.12.2 already said |

**The `refused`/`failed` decision is the one to take seriously rather than
inherit.** 2.12.4's reasoning is that neither has a window to be about, so a
frame under either would be a picture of a window nobody asked for. That is
defensible and it is not obviously right: the alternative — an empty frame with
the failure's sentence inside it — keeps the region's height stable, which stops
the page below jumping when a retry succeeds. Neither was measured. **Decide it
here and say which, because "nobody revisited it" and "it was decided" render
identically.**

### The state this task exists for now exists on screen, and it is not the fixture

[`CHARTING.md`](CHARTING.md) §11.3. 2.12.3's amendment above tells this task to
"either record a body for it or build the axis for one in the story", because the
recorded `partial` fixture's shortfall is a weekend and therefore exercises none
of `--chart-uncovered`, the dashed edge or the clip.

**Both halves of that instruction have moved:**

- **Building the axis for one is done and tested.** `chart-geometry.test.ts`'s
  _stops the line short when the shortfall is made of trading minutes_ takes the
  `full` fixture's 30 bars against a window extended by an hour of the same
  session, and asserts the line ends 29/89ths across. So the geometry this
  treatment sits on is already verified against a trading-time shortfall.
- **The live product is in that state right now.** A developer's store answers
  the default window with 390 bars covering one session of five, because the
  backfill is paced and sequential. `/securities/NVDA` today draws a line
  occupying a fifth of its frame with four uncovered sessions beside it — which
  is what `--chart-uncovered`, the dashed edge and the clip are for, and it is
  the single most visible unfinished thing in the product.

**What is still owed is a recorded body**, and the reason is narrower than the
amendment above implies: a **story** cannot reach the live state, and criterion 6
wants a story per state. So record one — a window reaching into a session in
progress — for the workshop, and use the running page for the judgement.

### Two smaller things

- **The `stale` hint has a second half now.** 2.12.2 points at `BarSeriesPanel`'s
  dashed marker and travelling rule as the precedent. Note the chart currently
  sits **above** that rail rather than inside it, so a held chart is marked by
  something that is no longer adjacent to it. That is either fine — one mark for
  one answer — or it is the reason to move the rail. Decide; do not let the
  layout decide.
- **The "four surfaces describing one failure" count is right and the pairing has
  changed.** 2.12.4 moved the current-value reading above the chart, so the
  closest pair on this page is now the reading and the chart, which describe the
  same window in two channels rather than two sentences. The grep still applies
  to the sentences; the new risk is the two **channels** disagreeing, which is
  [Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md)'s
  opening-close question and is named there.
