# Task 2.13.5 — One reading, two series

**Status:** Not started
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.4

## Objective

Make the chart's existing reading answer for **both** plots: hovering or focusing a
moment states that bar's prices **and its volume**, through one crosshair, one
readout and one keyboard path.

The story's scope calls this "shared interaction", and the word that matters is
_one_. Two readouts, two crosshairs or two tab stops would be the same
information at twice the cost, and a screen reader would meet it twice.

## What the user can see when this lands

**Volume joins the reading.** Move a pointer across either plot and the crosshair
follows in both; the strip under the axis states the bar's market instant, its four
prices, its own change labelled `BAR` — and now its traded volume. The same reading
arrives by keyboard: still **one tab stop**, still `Tab` onto the last bar, arrows
to step, `Home`/`End`, `Escape` to clear and keep focus.

## Work

- **One crosshair across two plots.** Decide whether the vertical rule spans both
  plots as one mark or is drawn per plot at the same x. Either answer is
  defensible; what is not is two marks that can disagree, which is the same
  structural argument 2.13.3 made about the axis.

- **The snap, unchanged.** §13.1: a slot with no bar makes the crosshair **snap**,
  and the timestamp is what makes that honest. §13.2: the arrows step **bars**, not
  slots. Both are already right and neither is re-taken — but a second series means
  the snap now has to produce a volume for the snapped bar rather than for the slot
  the pointer was over.

- **The strip, and what it must not become.** §13.6's readout is a reserved strip
  under the axis, and §15.4 found the reservation itself defective: a `min-height`
  token held at 1440 and nowhere else, so the figures below the chart jumped
  **14–32 px at every other viewport** with `pnpm verify` and all 96 browser tests
  green. The reservation is now a **hidden reading of the last bar in the same grid
  cell** — a measurement of the real thing at the real width. Adding a volume
  figure makes the reading wider and therefore changes where it wraps, so the sizer
  must carry it too. **The middle viewport is the instrument**; a spec that runs
  only at 1440 cannot fail.

- **Announcement pacing, unchanged and not re-derived.** §13.4: a pointer announces
  nothing; a key press announces the bar, paced by two numbers. Volume is another
  clause in the same sentence, not a second announcement — and a live region
  belongs to a **subject** whose sentences name it (`FRONTEND-STATE.md` §7). This
  page already carries four regions; a fifth, or an unnamed clause, is the failure
  that matters and **nothing anywhere catches it**.

- **Volume's words, not its glyphs.** The written figure abbreviates; the spoken one
  is the form 2.13.3 settled. A reading that says "4.1M" aloud is not English, and
  the exact figure is the thing a listener has no other channel for.

- **Focus, and what it is on.** §13.5: the ring lands on the **plot**, correcting
  the canvas. If volume is a second focusable thing, the chart has two tab stops
  where it had one — decide deliberately, and note the bar the product is held to:
  the chart is **one tab stop and never one per bar**, `Tab` opens on the last bar
  so focus is never empty.

- **The React Compiler will have opinions.** Its rules first fired on Story 2.11's
  combobox and both catches were correct, with repairs **simpler** than the code
  they replaced. A reading shared between two plots is the shape they dislike
  (`refs` written during render, `set-state-in-effect`). Treat a firing as a design
  note.

- **No frame recomputation, still.** The reading's state stays in the sibling; the
  counter test stays at zero across forty arrow presses. This is the task where
  "both plots need the reading, so let's hold it in the parent" is the obvious
  thought, and it is the one regression §28's own criterion cannot see.

## Done when

- One crosshair, one readout and one tab stop serve both plots
- The readout states volume for the bar the crosshair snapped to, written and
  spoken, with the exact figure available
- The strip's reservation measures a reading that **includes** volume, and its spec
  runs at all three viewports
- A key press announces one sentence naming its subject; a pointer announces nothing
- The frame-recomputation test still reports zero, and verifies its own counter
- Stories cover the reading at rest, on a bar, and at the ends; `pnpm stories` passes
- `pnpm verify` and `pnpm e2e` pass

## Notes

The fence is the **window**. A reading that survives a window change is 2.13.7's
subject — the reading must clear or re-anchor when the series underneath it is
replaced, and that is a state question rather than an interaction one.

The second fence is Epic 5. _"Volume 3.8× normal"_ belongs on this plot eventually
and the baseline that computes it does not exist; a readout clause comparing this
bar to anything is a number this product is not yet entitled to state.

---

## Amended 2026-09-13 by Task 2.13.2 — **this task's objective was wrong about one word**, and the correction makes it bigger

The Objective above says the word that matters is _one_, and that **"two readouts,
two crosshairs or two tab stops would be the same information at twice the cost,
and a screen reader would meet it twice."**

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §15 reverses the first of those
three and leaves the other two standing. The reasoning is worth reading rather
than the conclusion, because it is the same rule stated from the other side.

### **Two strips, one reading** — decided

**Each plot carries its own readout strip, under its own axis, stating its own
subject.** One crosshair, one tab stop, one read position; **two** strips.

The argument this task was written on assumed the two plots are adjacent. They
are not, at the narrowest arrangement: §9.1 records that Price and Volume are two
`Region` panels, and at one column a placeholder region **and the price panel's
own eight stated facts** sit between them. A single strip under the price chart
puts the answer off screen for anybody pointing at a volume bar, and that is
unavoidable in any DOM order, because the price panel alone is taller than a
phone.

**And two strips is not the duplication this task feared, because they do not say
the same thing.** The objection above — _a screen reader would meet it twice_ —
is exactly right about two strips carrying one sentence, and does not apply to two
strips carrying two subjects. That is this product's existing rule, not a new one:
**a readout belongs to a subject and its sentences name it**
([`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
§7). Two surfaces describing one event in the same words is the defect that
happened three times in one afternoon on the search screen; two surfaces
describing two subjects is the repair.

| Strip  | Under the pointer                                                     | At rest                                    |
| ------ | --------------------------------------------------------------------- | ------------------------------------------ |
| Price  | Unchanged — the instant, four prices with the close emphasised, `BAR` | The invitation, unchanged                  |
| Volume | The same instant and the **exact integer**                            | **The window's peak and when it happened** |

The volume strip's rest state is a decision rather than a mirror, and it is
deliberate: a second copy of the invitation is noise and an empty reserved row is
a hole, while the peak names its own subject, is exact, and is the figure Epic 5
later qualifies as a multiple. It is also the one figure the plot's own single
axis label already states half of.

### The reservation, and the thing it may not become

Unchanged in **mechanism** and now needed twice. §15.4's defect was a
`min-height` token that held at 1440 and nowhere else; the reservation is a
**hidden reading of the last bar in the same grid cell**, measured at the real
width. The volume strip inherits that shape. `--chart-readout-height` stays the
row's **floor**. A second `min-height` token would be re-taking a decision that
has already been paid for once, and the spec must run at **all three viewports**
— the middle one is the instrument.

### The constraint that makes this task bigger than it reads

**One read position now drives marks in two regions**, and the obvious
implementation is the one regression `PRODUCT_SPEC.md` §28's own criterion cannot
see.

Task 2.12.6 put the read position in a sibling so the frame's owner does not
re-render, and `PriceChart.test.tsx` counts **zero** frame recomputations across
forty arrow presses with its own counter verified live in the same test.
`CLAUDE.md` records that undoing it costs **17× the CPU on the pointer path** and
produces **no long task at all**. Lifting it to `SecurityExplorer` would be worse
than that: it would re-render the **518-row universe table** on every pointer
move, on a page already spending 50–66 ms of main thread on a cold load because
of that table.

**The shape that survives is the same one, generalised** (§15.1): the state lives
in a wrapper that renders its `children` through unchanged, so React re-renders
only the context consumers — which are the two reading overlays and **neither
frame owner**. The existing zero-recomputation test is the instrument and needs
**re-pointing at the pair, not replacing**.

This is also not a store, and the trigger for one has not fired.
`FRONTEND-STATE.md` §1's reversal trigger is _the first piece of state two
features must agree about that neither owns_ — this is two components inside one
feature and one route, and a wrapper answers it. Say so when you build it, so the
next reader does not read a context provider as the trigger having fired quietly.

### What is still open, and was deliberately not taken on the canvas

The **crosshair** question in the Work section stands exactly as written: one
vertical rule spanning both plots, or one per plot at the same x. The canvas drew
it per plot because an artboard has to draw something; it did not decide it. The
structural requirement is unchanged — not two marks that can disagree.

Amend **Done when** — the first item replaces the one above it:

- ~~One crosshair, one readout and one tab stop serve both plots~~ → **One
  crosshair, one read position and one tab stop serve both plots, through two
  strips that state two subjects**
- Each strip's sentence names its own subject, and no two of the page's live
  regions describe one event in the same words
- The volume strip's rest state states the window's peak and when it happened
- **Both** strips reserve their height with a hidden reading in the same grid
  cell, and their specs run at all three viewports
- The read position lives in a wrapper that renders `children` through unchanged,
  and the zero-recomputation guard is re-pointed at the pair and still reports
  zero

---

## Amended 2026-09-13 by Task 2.13.3 — the two volume forms exist, and the rest state needs a fact nothing returns yet

### What to call

`market/index.ts` exports the two forms this task's _"volume's words, not its
glyphs"_ bullet asked 2.13.3 to settle, and they were decided in one file so they
cannot drift:

| Need                                       | Call                        | Gives          |
| ------------------------------------------ | --------------------------- | -------------- |
| The strip's figure under the pointer (§5a) | `formatVolumeExact(volume)` | `4,061,234`    |
| The same figure read aloud                 | `spokenVolume(volume)`      | `4.06 million` |
| A summary or an axis label                 | `formatVolume(volume)`      | `4.06M`        |

**`formatVolumeExact` is the readout's**, and it is the one volume string in the
product that rounds nothing. `spokenVolume` holds the same figure to the same
precision as `formatVolume`, which is the property that keeps a sighted reader and
a listener quoting one number.

### The rest state wants the peak **bar**, and only the peak figure exists

§15 decided the volume strip's rest state is _"the window's peak and when it
happened"_. `volumePeak(bars)` returns the figure; **nothing returns the bar it
came from**, so the instant is not available yet. Two ways, and this task picks
one rather than discovering the gap mid-build:

- Find it in the frame's `readings`, which already carry each bar with its slot and
  its pixels — no new arithmetic, and the strip is already holding that array.
- Or add a `volumePeakBar(bars)` to `chart-volume-axis.ts` beside `volumePeak`, if
  the text alternative in 2.13.8 wants the same fact, which it probably does.

Whichever, the instant goes through `formatBarInstant` — the reading's existing
spelling — and not a second one.

### Two facts about the geometry that bear on the reading

- **The picture is per pixel below a pixel per bar; the reading is always per
  bar.** At the default window the volume plot draws one stem per pixel column
  carrying that column's **maximum**, so the column under the pointer is often
  taller than the bar the crosshair snapped to. That is §10.5 and it is correct —
  but it means the strip's figure and the visible column height genuinely disagree
  at 5D and wider, and the timestamp is what makes that honest. The same split
  already exists on the price line at 0.47 px per bar.
- **`peak` is `null` where there are no bars.** The gutter writes nothing and the
  rest state has no figure to state, which is a state this task has to render
  rather than a case that cannot happen: `empty` is a first-class answer and 1D is
  reliably one until Epic 3.

### The wrapper may already exist

§15.1's wrapper is the component that holds the read position and renders
`children` through unchanged. **2.13.4 now builds the frame half of exactly that
component** — one `timeFrame` call handed to both plots — because 2.13.3 split the
frame into `timeFrame`/`priceFrame`/`volumeFrame` and something has to own the
shared one. If 2.13.4 named it, this task adds state to it; if 2.13.4 put the call
in `SecurityExplorer`, moving it is this task's first step and the reason is the
518-row table, not tidiness.

Add to **Done when**:

- The strip's exact figure comes from `formatVolumeExact` and its spoken form from
  `spokenVolume`, with no second spelling of either
- The rest state's peak instant comes from one named source, and `formatBarInstant`
  spells it
- The strip renders correctly where `peak` is `null`
