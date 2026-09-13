# Task 2.13.8 — The walk: keyboard, screen reader, greyscale, and the week with a holiday in it

**Status:** Not started
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.7

## Objective

Walk the whole surface this story built the way Task 2.12.8 walked the price chart —
**as a rendering rather than as a claim** — and prove acceptance criterion 3, which
is the one criterion in this story that is about arithmetic rather than about a
screen.

Two halves, and they are in one task because they are one walk:

1. **"5 days" is five trading sessions across a week containing a holiday**, proved
   **through the control** rather than re-derived at the unit level.
2. **The control and the volume plot are operable and describable** — keyboard,
   screen reader, greyscale, axe, at three viewports.

## What the user can see when this lands

**The same product, reachable with the screen off and the mouse unplugged** — and
whatever the walk finds, which on the two previous walks was a real defect each time.

## Work

### Criterion 3, through the control

- **The week is already chosen and already asserted at the unit level.** Five sessions
  back from **2026-11-30** is `11-30, 11-27, 11-25, 11-24, 11-23` — skipping
  Thanksgiving `11-26` **and** the weekend, three ways a naive implementation is
  wrong in one assertion. `lastMarketSessions(n, endDate)` returns them **oldest
  first** and that must not be reversed.
- **This task's job is to prove it through the control**, which means a request
  naming five sessions, a server resolving it, an axis drawing five sessions, and
  **`11-27`'s half day drawing 210 bars and no empty 13:00–16:00 band**. Decide where
  that test lives: it is an assertion about a window, a calendar and a picture at
  once, which is the shape nothing below `pnpm e2e` can hold entirely.

### The walk

- **Keyboard, end to end.** Tab from the top of the page through search, the control,
  the charts and the table. Count the stops. **No stop may land behind the sticky
  chrome** — measured one occluded stop at 1440×900, **four** at 768×800 and two at
  390×780, worsening as the viewport narrows because the status strip wraps, so a
  development machine shows the least of it. `scroll-padding-top` is the repair and
  **does not help a target taller than the viewport**.
- **Every control carrying an explanation must be in the tab order.** Nothing compares
  an `aria-describedby` against whether the described element can be focused, and the
  failing combination — a correct, visible sentence on an unreachable control —
  renders and lints perfectly.
- **The text alternative, extended.** The price chart's is **one sentence reached two
  ways**: a hidden paragraph in the picture's place in reading order, and the
  description on the chart's single tab stop, read before the arrow-key hint. It
  states the symbol, the window, the opening and closing price, direction **as a
  word**, the high, the low, the feed, and how much of the frame the line occupies
  **counted in the axis's own trading minutes**. Volume and a changed window both
  change that sentence: the window is now something the reader chose, and the volume
  plot is a second picture that must either be in that sentence or have one of its
  own. Decide which, and note a listener has no other channel for the plot's shape.
- **It must stay derived from the same two functions.** §17.5 and `CLAUDE.md`'s gap
  list: the sentence and the uncovered wash agree **by construction** because both
  call `timeAxis` and `positionOfInstant`. A clause recomputed from elapsed time
  reports a gap of two and a half days across a weekend the axis gives no width to,
  and the words then disagree with the picture about a fact neither can check.
- **Greyscale and deuteranopia.** The chart's direction survives hue removal because
  the **geometry** carries it — the two washes differ by **1.009:1** under
  `grayscale(1)`. If the volume bars or the control's selected state encode anything
  in hue, this is where it fails. And note the lesson rather than only the rule:
  2.12.5's four greyscale simulations **passed against a chart that was wrong**,
  because removing the hue removes the disagreement. A person looking at the screen
  found it. Look at the screen.
- **axe, and what it does not certify.** The addon scopes to `#storybook-root`; a
  whole-document run adds page-level rules a fragment cannot satisfy, and the two
  must never be compared. A green axe run says nothing about any property in this
  task: it read zero violations throughout the occluded-tab-stop finding.
- **Three viewports, and the middle one is the instrument.** §15.4's defect held at
  1440 and at no narrower width, and 2.12.8's walk found the readout's reserved
  height wrong because it ran at 768.

## Done when

- A test proves five sessions across the Thanksgiving week **through the control**,
  including the half day's 210 bars and the absence of an empty afternoon
- The tab walk is recorded at 1440, 768 and 390, with the stop count and no occluded
  stop
- Every described control is reachable
- The text alternative accounts for volume and for a chosen window, still derived from
  `timeAxis` and `positionOfInstant`
- Greyscale and deuteranopia renderings exist as stories a person reads, and somebody
  read them
- axe is clean at three viewports, with what it does not cover stated
- Whatever the walk found is fixed or recorded with a named owner
- `pnpm verify` and `pnpm e2e` pass

## Notes

The fence is scope creep into Story 2.14: the feed label's wording and a stitched
series' two sources are 2.14's, and this task reads whatever label is there today
rather than improving it.

The thing to expect: **this walk will find something.** 2.11.9 found three unchecked
properties, 2.12.8 found a reserved height that held at exactly one viewport. Budget
for the finding rather than for the confirmation.

---

## Amended 2026-09-13 by Task 2.13.2 — two of this walk's questions are narrowed, and one is answered

**The greyscale bullet becomes a confirmation rather than a search.**
[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §12 decided volume encodes **no**
direction, and §8.2 gave the control's selected state three channels of which
none is hue — a 2 px near-black bar, a weight and an ink step. So neither of the
two things this bullet was told to look at spends hue at all.

**Confirm it rather than skipping it**, and note the asymmetry that makes that
worth doing: a simulation cannot prove a mark carries meaning without hue, but it
can catch a mark that started spending hue after the decision said it would not.
`CHARTING.md` §12.6 is the standing reminder in the other direction — four
greyscale simulations passed against a chart a person could see was wrong — so
the instruction stands unchanged: **look at the screen.**

**The text alternative's open question is leaning, not decided.** The Work bullet
asks whether the volume plot is in the price chart's sentence or has one of its
own, and §15 decided the parallel question for the **readout** — two strips, two
subjects, on the rule that a readout belongs to a subject and its sentences name
it. That is the same rule and it points the same way, so a second alternative for
the second picture is the likely answer rather than the settled one. **Decide it
here, informed by that, and record which.** A listener has no other channel for
the plot's shape, and the price chart's sentence is already at the length where a
clause about a second picture stops being one sentence.

**And it must stay derived.** Whatever the answer, both sentences count the same
axis: `timeAxis` and `positionOfInstant`, never elapsed time. `CLAUDE.md`'s gap
list carries that as a live hazard, and a second alternative is a second place it
can be got wrong.

Add to **Done when**:

- The greyscale walk **confirms** that neither the volume bars nor the control's
  selected state spends hue, rather than discovering it
- Whether volume has its own text alternative is decided and recorded, and both
  sentences derive from `timeAxis` and `positionOfInstant`

---

## Amended 2026-09-13 by Task 2.13.3 — criterion 3's unit half is done, and the spoken form is a call rather than a decision

### Criterion 3: the axis half is asserted, and what it asserts is an **absence**

This task's job is unchanged — **prove it through the control** — but the layer
below it is now covered, so this task is not deriving anything for the first time
and should not re-assert what is already held.

`chart-geometry.test.ts` now holds the holiday week at the axis level, from
`lastMarketSessions(5, 2026-11-30)`: five sessions
(`11-23, 11-24, 11-25, 11-27, 11-30`), the half day at **210 slots**, a total of
**1,770**, no tick labelled `Nov 26`, and Monday's first slot exactly 210 after the
half day's.

**The assertion that actually rules out an empty afternoon is about a missing
position**, and it is the form worth copying rather than paraphrasing: 14:00 ET on
`11-27` is a real instant inside the requested window and `positionOfInstant`
answers `boundary` for it — the same answer it gives a night or a weekend. A
continuous time axis would have given that instant 180 slots of empty plot and
every state test would still have passed.

So what is left here is the part only `pnpm e2e` can hold: a request naming five
sessions, a server resolving it, and **the picture** — the seam count, the two
date labels, and no three-hour blank between the half day's last bar and Monday's
first.

### The spoken volume form exists

`spokenVolume(volume)` gives `4.06 million` to the same precision `formatVolume`
gives `4.06M`, decided in one file so the two cannot drift. Whatever this task
decides about **whether** volume gets its own sentence, the figure inside it is
that call and not a second spelling.

The "it must stay derived" bullet is unchanged and now has a second reason to be
careful: `CLAUDE.md`'s gap list gained an entry from 2.13.3 about the memoised
walk, and the sentence and the wash still agree only because both call `timeAxis`
and `positionOfInstant`.
