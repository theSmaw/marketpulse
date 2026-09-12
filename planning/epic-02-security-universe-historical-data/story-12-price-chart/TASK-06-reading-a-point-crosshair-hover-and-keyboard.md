# Task 2.12.6 — Reading a point: the crosshair, and the keyboard path to it

**Status:** **Complete — 2026-09-12**
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.5

## Objective

Make the chart readable rather than decorative: move a pointer across it and
read the bar under it — and reach the same reading with a keyboard, which is
where charts usually fail.

## What the user can see when this lands

**A crosshair that tracks the cursor and a readout that says what that bar was**
— its time in market terms, its four prices, and its change. This is the second
thing in the product that responds to a person, after search, and the first that
responds continuously.

**And it works without a mouse.** Tab to the chart, arrow along the bars, and
the same readout follows.

## Work

- **The crosshair and readout**, in the form Task 2.12.2 settled. Constraints
  that outrank taste: **motion must never make a number harder to read**, the
  readout must not cover the mark it describes, and its numbers are the data
  face with tabular figures so they do not jitter as the pointer moves.

- **Pixels back to a bar** goes through Task 2.12.3's inverse scale. Nothing
  here re-derives a mapping from an element's bounding box; that is a second
  spelling of the scale, and the two will disagree at the edges.

- **The keyboard model, built to a pattern rather than to a resemblance of one.**
  The chart is one tab stop, not 780. Left and Right move the read position by a
  bar, Home and End reach the ends, and Escape clears the reading and leaves the
  chart focused. A page of arrow-reachable marks is the thing to avoid and it is
  the naive implementation.

  The story owns implementing this; **Task 2.12.8 walks and proves it
  end-to-end**, which is Task 2.11.9's relationship to the combobox.

- **Announcing a moving value without shouting.** A live region driven per
  pointer-move or per arrow-press is actively hostile, and this page already has
  regions belonging to other subjects — `FRONTEND-STATE.md` §7's rule is that a
  region belongs to a subject and its sentences name it. Settle the rate the way
  `SEARCH-ANNOUNCEMENT_DELAY_MS` was settled for search, and prefer a readout
  that is _readable_ over one that is _spoken continuously_.

- **Pointer, touch and precision.** The nearest bar rather than the exact one
  under the pixel; no reading at all when the pointer is outside the plot; and a
  `prefers-reduced-motion` answer that is already given once at the token layer
  rather than re-answered here.

- **`useId` for anything that needs an id**, and no test asserts one — that is
  on `CLAUDE.md`'s list of things a test must not assert.

## Done when

- Hovering reads the nearest bar; leaving the plot clears the reading
- The chart is one tab stop, and arrows, Home, End and Escape behave as above
- The reading is produced by the same scale that drew the marks, inverted
- Component tests cover the keyboard path and the cleared state; a browser spec
  covers the pointer path, which jsdom cannot
- The announcement rate is settled, named, and recorded in `CHARTING.md`
- axe reads zero violations
- `pnpm verify` passes

## Notes

The fence is that **every failed and empty state is 2.12.7's**. A crosshair over
an empty chart is a state, and it is that task's.

The other fence is comparison. Reading two series at one instant is Epic 8's,
and the shape of this readout should not foreclose it — one more reason the
readout is a component with props rather than a string built inline.

---

## Amended 2026-09-11 by Task 2.12.1 — **this task got more important, not just more defined**

[`CHARTING.md`](CHARTING.md) §2 chose a line of closes over candlesticks, on the
measurement that a candle would be **0.47 px wide** at the default window. The
bars still carry open, high, low and close, and the plot no longer shows three of
them.

**So this readout is where a bar's four prices actually reach the user**, and
that is a load-bearing role rather than a convenience. `CHARTING.md` §2 justifies
the line decision partly _on the grounds that this readout exists_ — "OHLC
reaches the user through the readout rather than the mark" — so a readout that
ships showing only the close would retroactively make the series-type decision
wrong.

What that adds to the Work section above, which otherwise stands unchanged:

- **The readout states all four prices**, plus the bar's market time and its
  change. The Work section already said so; this amendment is why it is not
  negotiable.
- **The inverse scale returns a bar index, not an instant** — the axis is
  ordinal ([Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s
  amendment). "Nearest bar" is therefore `round()` on a fraction of the plot
  width, which is simpler than the time-based nearest-neighbour search the
  original bullet implies.
- **The chart is one tab stop and the marks are not in the tab order**, which is
  easy here and would not have been: the base chart is one `<path>`, so there is
  no per-bar element that could accidentally become focusable. Keep it that way —
  §1's element-count constraint and this are the same constraint.

---

## Amended 2026-09-11 by Task 2.12.2 — the form is settled, and one claim in the amendment above is now inaccurate

The Work section's "in the form Task 2.12.2 settled" now has an answer.

- **One crosshair, identical under the pointer and under keyboard focus.** A
  vertical `--chart-crosshair` rule (`--ink-secondary`'s value, quieter than the
  data it points at) and a **white disc with a near-black ring** on the line. Two
  treatments were considered and declined: they are two things to keep correct
  and a promise that the keyboard path is the lesser one.
- **The focus ring is the existing global one and there is no new token.** The
  disc is hollow _so that the ring can land on it_ — a near-black outline around
  a near-black filled dot on a near-black line is invisible. `--focus-*` is
  unchanged, and ADR 0026's declined box-shadow ring stays declined.
- **The readout sits beside the plot, not over it.** Drawn on the canvas as a
  panel carrying the bar's market timestamp, its four prices with the close
  emphasised, and its change with a glyph and a sign. That satisfies the Work
  section's "must not cover the mark it describes" by placement rather than by
  collision-avoidance logic, which is the cheaper of the two by a long way and is
  the one that survives a narrow region.

### One claim above is now inaccurate, and correcting it does not change the conclusion

The 2.12.1 amendment says: _"the base chart is one `<path>`, so there is no
per-bar element that could accidentally become focusable."_

**The first clause is no longer true.** The plot as 2.12.2 draws it carries
roughly two dozen elements — an uncovered rect, the wash path, gridlines, the
session seams, the reference rule, the series path, the coverage edge, the axis
rule, the crosshair, its disc, and the labels.

**The second clause is unaffected and is the one doing the work.** None of those
scales with the _bar_ count: the seams scale with the number of **sessions** and
the gridlines and labels are fixed per breakpoint. So there is still no per-bar
element, the chart is still one tab stop, and §1's element-count constraint still
holds. The correction matters because
[Task 2.12.9](TASK-09-measured-against-fifty-milliseconds.md) carries "~11 DOM
nodes, flat in point count" as a prediction to measure against, and a reader
arriving from here would otherwise import a figure that has moved.

---

## Amended 2026-09-11 by Task 2.12.3 — the inverse is built, and it hands back a **slot**, which is not a bar

The inverse exists, round-tripped against the forward function in the same
commit, so the off-by-a-half-pixel the Work section warns about is already
closed. What this task inherits, and one thing it now has to decide that no
earlier amendment names.

### What is built, and what to call

- **`nearestSlot(slotScale, pixel)`** — the pointer's answer. It rounds and
  **clamps**, deliberately: a pointer dragged past the plot's edge still means
  the nearest point. `scaleValue` deliberately does not clamp, because a _mark_
  outside the domain belongs outside the frame — two opposite rules, and they are
  two functions rather than one with a flag.
- **`unscaleSlot`** for a fractional position and **`unscaleValue`** for a price
  off a pixel. Both are the exact inverses of what drew the marks, which is the
  Work section's "nothing here re-derives a mapping from an element's bounding
  box" satisfied by there being nothing to re-derive.
- **`clampToRange`** for holding a crosshair inside the plot.

### The gap: a slot is a position on the axis, a bar is a thing that traded

The 2.12.1 amendment above says _"the inverse scale returns a bar index"_. **It
returns a slot index**, and the difference is not pedantry — it is the case this
task will otherwise meet as a crash or as a wrong reading.

`placeBars(axis, bars)` returns `{ bar, slot }` pairs. Slot and array index
coincide **only when every slot in the window has a bar in it**, which is true of
the `loaded` fixture and is not true in general:

- a **`partial`** answer covers the first _n_ slots of a longer axis — the normal
  case, since the free plan withholds the most recent ~15 minutes;
- a **minute with no prints** leaves a hole in the middle of a session, which the
  store records as an absent row rather than a zero-volume bar.

So `bars[nearestSlot(...)]` is wrong in both, and wrong quietly in the second:
it reads a real bar, just not the one under the pointer, with everything after
the hole shifted by one.

**Two decisions this task owns, and it owns them because there is nowhere else
for them:**

1. **What the crosshair does over a slot with no bar.** Snap to the nearest
   _placed_ bar, or show no reading at all. Both are defensible — the second is
   more honest and the first is smoother — and the answer must be the same under
   the pointer and under the arrow keys, because 2.12.2 settled that there is one
   crosshair treatment for both inputs and two behaviours behind one appearance
   would be worse than two appearances.
2. **What the arrow keys step through.** Slots or placed bars. Stepping slots
   means Right can land on nothing; stepping bars means the crosshair moves an
   uneven distance on each press. Say which, and why.

Whichever way both go, **the lookup belongs in `src/market/` beside the scale**,
as a tested pure function — not inside the component. That is where every other
piece of this arithmetic went and it is the only level that can test the hole
case without a browser.

### One thing that did not change

The chart is still **one tab stop**, and nothing 2.12.3 built puts a per-bar
element anywhere: `placeBars` returns data, not nodes. The 2.12.2 correction
above — that the plot is two dozen elements, none of them per-bar — still holds
and is still the clause doing the work.

---

## Amended 2026-09-12 by Task 2.12.4 — this task inherits a repair that was assigned to 2.12.4 and not taken, and it is the one §28 is about

### The chart recomputes its whole geometry on every render, and nothing memoises it

[Task 2.12.9](TASK-09-measured-against-fifty-milliseconds.md)'s amendment asked
2.12.4 to **check whether the trading-calendar walk runs once per render or once
per request**, and said that if it were per-render the repair — memoise on the
request identity — _"belongs in Task 2.12.4's component rather than in the
arithmetic"_.

**It is per render, and 2.12.4 did not take the repair.** `PriceChart` calls
`chartFrame(...)` in its render body with no `useMemo`, and `chartFrame` calls
`timeAxis`, which steps **day by day** through the trading calendar to build the
x-domain. Two things make that a fact rather than a guess:

- **The React Compiler is not installed.** `apps/frontend/vite.config.ts` records
  that all three of `@vitejs/plugin-react`'s transformer peers — including
  `babel-plugin-react-compiler` — are optional and none is installed. The
  compiler's _lint rules_ are on and its _auto-memoisation is not_, so there is
  no invisible `useMemo` here.
- **Nothing re-renders the chart today.** The only state it holds is its measured
  box, behind an equality guard, so in practice `chartFrame` runs on mount, on a
  resize, and when the view changes. That is why 2.12.4 leaving it unmemoised is
  not a defect **yet**.

**This task is what makes it one.** A crosshair re-renders on every pointer move.
Unmemoised, every one of those rebuilds the axis, re-walks the calendar,
re-derives the price domain and rebuilds a 1,950-point path string — for a change
that moves one vertical rule and one disc. That is precisely the shape
`PRODUCT_SPEC.md` §28's word **routine** is about, and it is the case
[Task 2.12.9](TASK-09-measured-against-fifty-milliseconds.md) already names as
the genuinely unmeasured surface.

So the repair moves here, by default rather than by preference: it is the task
that introduces the render, and the commit it was assigned to is closed.

**Two ways to take it, and they are not equivalent:**

1. **Memoise the frame** on the inputs that produce it — the plot box, the
   density and the view's identity — so a pointer move re-renders the crosshair
   over a frame that was not recomputed.
2. **Keep the crosshair's state out of the component that computes the frame**,
   so a pointer move re-renders a sibling and the frame's owner does not render
   at all.

The second is structurally stronger and the first is one line. Measure before
choosing, and **do not report a repair you did not measure after** — 2.12.9's
rule, and this is the surface it was written for.

### The chart has zero tab stops today, not one

The Work section says the chart is one tab stop. It is currently **none**: the
`<svg>` is `aria-hidden` with `focusable="false"` and carries no interaction at
all, which 2.12.4 took deliberately on the grounds that the picture is not the
evidence — the stated facts beneath it are.

Two consequences:

- **This task adds the page's first chart tab stop**, which changes the count
  [Task 2.12.8](TASK-08-the-text-alternative-and-the-screen-reader-walk.md) walks
  at three viewports. `CLAUDE.md` records that occluded stops **worsen as the
  viewport narrows** — four at 768 against one at 1440 — so the new stop is
  measured at the narrow end rather than the wide one.
- **Whatever becomes focusable is not the `<svg>` as it stands.** An
  `aria-hidden` element cannot hold focus, and a focusable element inside an
  `aria-hidden` subtree is the exact defect `CLAUDE.md` records from Story 2.11 —
  a control carrying a description that no key press can reach. Decide the
  focusable element and its accessible name here, and note that
  [Task 2.12.8](TASK-08-the-text-alternative-and-the-screen-reader-walk.md) owns
  the text alternative that may want the same element. **Those two decisions
  interact and this one lands first.**

### One thing that is easier than the amendments above assume

The slot-versus-bar gap 2.12.3 recorded is unchanged and is still this task's.
What is now settled is where the lookup goes: `placeBars` is already called inside
`components/PriceChart/chart-geometry.ts`, which is pure and tested, so the
`{slot → bar}` resolution has an existing home one step below the component and
does not need a new one. The instruction stands that the arithmetic belongs in
`src/market/`; what `chart-geometry.ts` shows is that a **pixel-level** step
between the two is an established layer rather than a new idea.

---

## Amended 2026-09-12 by Task 2.12.5 — the plot now states a direction, and this readout states a different one

### Two direction statements, two subjects, and they must not be confused

The plot now says **which way the window went** — a dashed rule at the price the
window opened at, and the line finishing above or below it. This readout says
**which way one bar went**, which is the per-bar open-against-close that
`CHARTING.md` §2 moved here when it chose a line over candlesticks.

Those are different facts and they will disagree constantly.

> **Corrected hours later on 2026-09-12, by the wash split.** This paragraph read
> _"the design canvas already states the rule it follows: **the tint is the
> window's direction, never the bar's**"_ — and that rule was **reversed** the
> same afternoon. The wash no longer states the window's direction at all: it
> splits at the reference rule, green above and red below, so it says
> _where the price is relative to the window's open, at this instant_.
> `CHARTING.md` §12.6 has the argument.

**The correction makes this task's problem harder, not easier**, and that is why
it is worth reading rather than skimming. There are now **three** subjects on one
screen, not two:

| Surface                        | Says                                                 |
| ------------------------------ | ---------------------------------------------------- |
| The headline glyph and sign    | What the **window** did, open to last close          |
| The wash's colour at point _x_ | Whether the price at _x_ is above or below that open |
| This readout                   | What **one bar** did, its own open to its own close  |

All three can disagree at once, legitimately: a down-minute, below the window's
open, inside a window that finished up. So the thing to get right here is that the
readout's glyph and sign are visibly _about the bar_ — a label, a position, or a
heading that says so. The old two-subject version of this problem could have been
solved by tone; this one cannot.

The precedent to copy is one this page already sets: the identity block's
`LAST SESSION CLOSE` and the chart's current-value reading are two figures for
two subjects, and what keeps them apart is that each is labelled.

### The crosshair crosses a rule now, and both are chrome

`--chart-crosshair` is `#43474f` and `--chart-reference` is `#74777f`. Where the
vertical crosshair meets the horizontal reference rule they cross at similar
weight, and both are dashed-or-solid chrome rather than data. Decide what that
intersection looks like rather than discovering it: a crosshair that reads as
part of the reference rule, or a reference rule that looks broken where the
crosshair sits, are both the sort of thing only a screenshot finds.

The cheap answer is probably that the crosshair is drawn **over** the rule and is
solid where the rule is dashed, which is already the difference between them.

### The memoisation repair got slightly larger

The amendment above assigns this task the unmemoised `chartFrame` call, on the
grounds that a pointer move rebuilds a 1,950-point path string. **It now builds a
second one in JavaScript and hands the DOM one copy of it.**

> **Corrected hours later on 2026-09-12, by the wash split.** This read _"the same
> string again in memory and the same string again handed to the DOM"_ and called
> the cost doubled. **The DOM half is wrong.** The area is defined once in
> `<defs>` and drawn through two clipped `<use>` elements, so the browser parses
> one 1,950-point string for the fill however many times it is drawn. What does
> double is the **JavaScript**: `directionalArea` builds `series + two segments +
Z` as a new string on every call, and that call is in the render body.

So the repair is unchanged and the figure it is repairing is **two string builds
per render, one DOM parse** rather than two of each. That is still the one part of
this chart linear in the bar count and still the right thing to point the trace
at — it is simply half the size the first version of this paragraph claimed, and
a measurement taken against the wrong expectation is how a real regression gets
read as noise.

The second of the two repair options — keeping the crosshair's state out of the
component that computes the frame — is still the structurally stronger one.

### One prediction that keeps being corrected is nearly settled

2.12.2 said the plot carries "roughly two dozen" elements and 2.12.4 corrected it
to gridlines, seams and one `<path>`. It is now gridlines, seams, **two paths —
one of them in `<defs>` — two `<use>`, two `<clipPath>` with a `<rect>` each**,
and the reference rule. This task adds the crosshair and its disc; 2.12.7 adds
the uncovered rect and the coverage edge. The shape has never moved and is the
part that matters: **`O(sessions + breakpoint)`, `O(1)` in bars.** No element here
scales with the bar count, and this task is the one most able to break that — a
per-bar hit target is the naive way to build a crosshair and is the thing
`CHARTING.md` §1's constraint forbids.

---

## What was built — 2026-09-12

### The shape of it

**`ChartReading` is a sibling of the plot, not a branch of `PriceChart`.** That
is the one structural decision everything else hangs off. It renders two things
onto the chart's grid — an interactive overlay in the plot's own cell, and the
readout strip in a row beneath the axis — and it holds the read position, so a
pointer move re-renders it and the component that computes the frame does not
render at all.

| Piece                                      | Where                                                   |
| ------------------------------------------ | ------------------------------------------------------- |
| The sentence, the pacing, the bar's change | `src/market/chart-reading.ts`                           |
| Slot → bar, as a binary search             | `nearestPlaced` in `src/market/chart-time-axis.ts`      |
| Bars with their pixels, and the x scale    | `ChartFrame.readings` / `.slots` in `chart-geometry.ts` |
| The crosshair, the strip, the keys         | `components/PriceChart/ChartReading.tsx`                |
| Two tokens                                 | `--chart-point`, `--chart-readout-height`               |

### The decisions this task owned, and what they were

Every one of these is argued at length in
[`CHARTING.md` §13](CHARTING.md) and drawn on **`Price reading.dc.html`**, a
fifth file on the design canvas. In brief:

1. **A slot with no bar: the crosshair snaps** to the nearest bar that exists,
   and the crosshair is drawn at the **bar's** pixel rather than the pointer's,
   so the rule and the disc can never disagree. What makes the snap honest is
   that the strip leads with that bar's own market timestamp. §13.1.
2. **The arrows step bars, not slots.** §13.2.
3. **The readout is a reserved strip under the axis**, not a card over the plot
   and not a column beside it — 342 px is the width that killed the column.
   §13.6.
4. **The announcement rate is search's two numbers**, and the _floor_ is what
   does the work here rather than the delay: a held arrow key repeats ~30 times
   a second. **A pointer announces nothing.** §13.4.
5. **The focus ring lands on the plot**, which corrects a claim on
   `Price chart.dc.html` and in `VISUAL-LANGUAGE.md`. Both were corrected the
   same day, canvas first. §13.5.
6. **The memoisation repair 2.12.4 did not take** was taken structurally and
   **measured after**: zero `chartFrame` calls across forty arrow presses, with
   the counter verified live in the same test. §13.7.

### What it cost elsewhere

- `PriceChart` gained a `symbol` prop, for `BarSeriesPanel`'s reason.
- Two specs were corrected rather than deleted: the Price region now holds
  **two** SVGs (the plot and the overlay), and the panel's live region needed
  `.first()` because the chart's reading has one of its own.
- One `SecurityExplorer` test's comment was amended: three live regions is what
  **jsdom** can see, and a browser with bars in the store sees four.

### What this task did **not** decide

Every failed and empty state is 2.12.7's — a crosshair over a chart with no bars
is a state, and `ChartReading` renders **nothing at all** there today rather than
a tab stop that answers no key press. The text alternative is 2.12.8's and may
want this same element; the element and its name are settled here, what it says
about the _series_ is not.

---

## For the stakeholders — what this actually means

_A non-technical account of what changed on 2026-09-12, and why._

### Before this, the chart was a picture. Now it answers questions.

Last week the Security Explorer learned to draw NVDA's price over the last five
trading days. It was a real drawing of real market data — but it was exactly as
interactive as a photograph. You could look at a dip in the line and have no way
whatsoever to find out **when** it happened or **what the price was**. The exact
figures were printed underneath, but they described the whole window, not the
bit you were pointing at.

**That gap is now closed.** Move your mouse across the chart and a thin vertical
line follows it, with a small circle sitting exactly on the price line. Directly
underneath, a row of figures tells you what you are pointing at: the date and
time in New York market terms, the four prices that minute traded at, and
whether that minute finished up or down.

This is the second thing in MarketPulse that responds to a person — the search
box was the first — and it is the first that responds **continuously**. That
matters more than it sounds. The whole product is built around a person asking
_"what happened here?"_, and until today the answer was always "somewhere in this
table below".

### Three decisions worth knowing about

**1. We chose a simple line over the traditional "candlestick" chart — and this
is the feature that made that choice safe.**

A few days ago we measured that a candlestick on our default view would be about
**half a pixel wide**. Unreadable. So we draw a clean line instead. But a
candlestick carries four numbers per minute (the open, the high, the low and the
close) and a line carries one. We justified the simpler drawing explicitly _on
the grounds that this readout would exist_ — and it does, showing all four. The
earlier decision is now paid for rather than owed.

**2. It works without a mouse, and that took most of the thought.**

Charts are where accessibility usually fails silently. The naive way to make a
chart keyboard-reachable is to make every data point a stop — which on our
default view means pressing Tab **1,950 times** to get past it. We made the
chart a single stop: land on it and you immediately get a reading of the most
recent minute, arrow keys walk you along, Home and End jump to the ends, Escape
clears it.

Building that turned up a genuine mistake in our own design work. Our design
system said the focus indicator should draw around the little circle on the line.
That cannot work, because when you first arrive on the chart there is no circle
yet — you have not read anything. So the indicator goes around the plot, and
arriving opens on the last bar. We corrected the design canvas, the design
document and the code on the same day, in that order.

**3. Three things on that screen say "up" or "down", and they can all disagree
at once — legitimately.**

The big number at the top says what the whole five-day window did. The green and
red shading says whether the price at each point is above or below where the
window opened. And the new readout says what **one single minute** did. A minute
can tick up while sitting well below the window's opening price inside a week
that finished higher — and all three statements are correct.

That is a real hazard: three unlabelled arrows contradicting each other looks
like a broken product. So every one of them is explicitly labelled — the new one
is prefixed `BAR` and sits at the end of a row that begins with that minute's own
timestamp. This follows a rule the product already had: never let colour or a
glyph be the only thing saying what a number is about.

### Two smaller things we were deliberate about

**Nothing on the page moves when you point at it.** The row that shows the
reading is there whether or not you are pointing — when you are not, it holds a
short line telling you the chart can be read, including with the keyboard. If it
appeared only on hover, every figure below would jump down a line under the
reader's hand. We verified this by deliberately breaking it and watching the test
catch it.

**The chart does not re-do its own arithmetic every time you move the mouse.**
Working out where 1,950 price points go involves walking the trading calendar day
by day. Done on every mouse movement, that is the kind of thing that makes an
application feel sluggish under load — and this product has published performance
commitments. We arranged the code so the calculation simply does not happen
again, and then **measured it**: forty key presses, zero recalculations.

### Where this leaves the product

The Security Explorer now has a chart a market analyst could genuinely use to
investigate something: a real series, an honest picture of how much data we hold,
exact figures underneath, and the ability to interrogate any individual minute of
it with a mouse or a keyboard.

**What is still missing, on purpose.** The chart's error and empty states are not
yet designed as states (next task). A screen-reader walk of the whole page has
not been done yet (the task after). There is no volume chart and no way to change
the time window — that is the next story. And there is still no live data: every
price on this screen is stored history, correctly labelled as such. Live prices
arrive in Epic 3.

None of that is drift. Each remaining region on that screen still says, in a
sentence, which piece of work fills it.
