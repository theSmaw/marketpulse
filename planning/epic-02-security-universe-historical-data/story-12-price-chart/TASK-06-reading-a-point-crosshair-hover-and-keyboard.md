# Task 2.12.6 — Reading a point: the crosshair, and the keyboard path to it

**Status:** Not started
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
