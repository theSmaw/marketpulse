# Task 2.13.5 — One reading, two series

**Status:** Complete — 2026-09-13
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

---

## Amended 2026-09-13 by Task 2.13.4 — the wrapper is built and named, and **the shape of the second context is the trap**

The wrapper 2.13.3's amendment said might exist does exist, so this task's first
step is no longer "move the call out of `SecurityExplorer`". Everything below is a
narrowing except the second heading, which is new and is the thing most likely to
undo Task 2.12.6's repair while looking like the repair.

### What exists, and where the state goes

| File                                          | What it holds                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `components/PriceChart/ChartAxis.tsx`         | The wrapper. One `timeFrame` call, `children` rendered through unchanged               |
| `components/PriceChart/chart-axis-context.ts` | The context, `ChartPlotRole`, and `useChartAxis` — which **throws** without a provider |
| `components/PriceChart/use-plot-box.ts`       | The shared measurement, including the axis-rule pixel                                  |
| `components/PriceChart/chart-subject.ts`      | `chartSubject` / `drawsAFrame`, read identically by both plots                         |

`ChartAxis` is rendered around the grid in `SecurityExplorer` and is **already
holding state** — the two plots' measurements. Adding the read position to it is
this task's job and is a handful of lines. The `children`-through-unchanged
property is what makes that safe: `SecurityExplorer` owns the element tree, so a
state change in `ChartAxis` re-renders **no plot** unless that plot consumes a
context that changed.

### **Two contexts, not one value with both in it**

This is the whole of the risk, and it is invisible: a read position added to
`ChartAxisValue` would be handed to every `useChartAxis()` caller, and both frame
owners call it. A pointer move would then re-render `PriceChart` and
`VolumeChart` on every mouse event — rebuilding a 1,950-point path string and a
726-stem silhouette to move one vertical rule. **The page would look perfect**,
and it is the regression `CLAUDE.md` records at **17× the CPU on the pointer
path** with no long task at all, which is to say invisible to `PRODUCT_SPEC.md`
§28's own criterion.

So the read position goes in a **separate context** with its own provider, whose
consumers are the two reading overlays and nothing else. The frame context and
the reading context live in the same component and are two values.

### The zero-recomputation guard is re-pointed but **not yet complete**, and this task finishes it

2.13.4 re-pointed `PriceChart.test.tsx`'s counter at `timeFrame` **and**
`priceFrame`, as §15.1 asked. It does **not** count `volumeFrame`, and the test
renders only the price chart — so today it is blind to exactly the regression
above happening on the volume side.

Two things owed here, and the second is what makes the first mean anything:

- **Count all three frame builders** — `timeFrame`, `priceFrame`, `volumeFrame`.
- **Render the pair**, inside a `ChartAxis`, and take the forty arrow presses
  against it. A guard pointed at a component that is not on screen reports zero
  for the same reason a counter wired to nothing does, and the test already
  verifies its own counter live in the same test; keep that half.

### Three smaller carries

- **The peak bar is now derived in one place already.**
  `chart-alternative.ts`'s `peakClause` finds it with
  `series.bars.find((bar) => bar.volume === peak)` for the volume plot's text
  alternative. If the strip's rest state wants the same fact, that is **two**
  sites deriving one thing, which is when 2.13.3's second option —
  `volumePeakBar(bars)` beside `volumePeak` in `chart-volume-axis.ts` — becomes
  the right one rather than the optional one. Move the alternative onto it in the
  same change.
- **Volume already has a text alternative, and the strip does not replace it.**
  `volumeAlternative(view, symbol)` states the peak, when it happened, the
  coverage and the feed. A readout answers _what is this bar_; that answers _what
  is this picture_. Two sentences, two questions, both naming their subject — do
  not collapse them, and do not let the strip repeat the alternative's words.
- **Everything renders inside a `ChartAxis` now**, tests and stories included,
  because `useChartAxis` throws without one. `PriceChart.test.tsx`,
  `VolumeChart.test.tsx` and `BarSeriesPanel.test.tsx` each carry a small wrapper
  component to copy.

Add to **Done when**:

- The read position lives in a **second context**, and neither frame owner
  consumes it — checked by the guard below rather than asserted
- The zero-recomputation guard counts `timeFrame`, `priceFrame` **and**
  `volumeFrame`, renders **both** plots, still reports zero across forty arrow
  presses, and still verifies its own counter live
- The peak bar is derived once, in one named function, read by both the strip and
  the text alternative

---

## What was built — 2026-09-13

**Status: complete.** Volume joined the reading, and the reading stayed one.

The design was taken on the canvas first, as ADR 0026 requires:
**`Volume reading.dc.html`**, a new file in the `Component library for
MarketPulse` project — six numbered sections, with the specimens drawn from the
same 1,950 stored NVDA minute bars Task 2.13.2 used, reusing that file's
generated path data rather than inventing a second series. It settles the three
things §15 left open and records the candidates each one beat.

The record is [`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) **Part four**
(§§22–29). What follows is what changed and what it cost.

### The five decisions

| Question                       | Answer                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| The crosshair across two plots | **One per plot, at one pixel, from one index.** A spanning rule cannot be drawn — two panels, a heading and a third region between them |
| The mark on the volume plot    | **The price plot's hollow disc, at the bar's own volume** — which below a pixel per bar is _not_ the top of the ink under it            |
| The volume strip at rest       | **The window's peak, exact, and when it happened.** Not a second invitation and not an empty row                                        |
| What a listener gets           | **One more clause in the one sentence** — `Volume 4.06 million.` — and the subject moved to `chart reading`                             |
| Where the read position lives  | **A second context in `ChartAxis`**, whose consumers are the two overlays and neither frame owner                                       |

### What is on screen

`/securities/NVDA`, pointer anywhere on either plot: two crosshairs at one
pixel, two strips naming one minute. The volume strip states the bar's instant
and its **exact grouped integer** — `178,846`, not `179K` — because abbreviation
is for the axis and for summaries. At rest it states `PEAK 2,688,585` and the
minute it happened in, which is the figure the gutter above abbreviates to
`2.69M`.

The keyboard path is unchanged and now drives both: `Tab` onto the price plot,
arrows step bars, and the volume strip follows with nothing having pointed at
it. **No second tab stop**, no fifth live region.

### What it cost, in files

- **`chart-reading-context.ts`** — new. The read position, as an index, with
  `useChartReading` throwing outside a `ChartAxis` for `useChartAxis`'s reason.
- **`ChartAxis.tsx`** — holds it, and **memoises two values separately**. That
  separation is the whole repair and it is invisible on screen.
- **`VolumeReading.tsx` / `.module.css` / `.stories.tsx` / `.test.tsx`** — new.
- **`chart-readout.module.css`** — new, and it is the point of the refactor: one
  home for the strip's shape, its reservation and its figure idiom, so two
  strips are not two copies of one decision. The crosshair, the disc and the
  reading layer moved to `chart-marks.module.css` for the same reason — one read
  position is one mark drawn twice, not two marks styled alike.
- **`chart-geometry.ts`** — `VolumePlot` gained `readings` and `peakBar`.
- **`chart-volume-axis.ts`** — `volumePeakBar`, read by the strip **and** by
  `chart-alternative.ts`'s `peakClause`, which was deriving it separately.
- **`chart-reading.ts`** — the volume clause and the subject.

### Four things that were found rather than reasoned

1. **The price strip's reservation was half of itself, and had shipped that way.**
   `CHARTING.md` §15.4's repair hides the _reading_, so the row is
   `max(reading, whatever is live)` — which is `max(reading, invitation)` at rest
   and `max(reading, reading)` with a reading on screen. A width at which the
   **invitation** is the taller of the two drops the four exact prices by a line
   when a pointer enters the plot: §15.4's own defect from the other direction,
   with §15.4's own table showing it is reachable (the invitation is 40 px at 768
   and at 390). Both strips now hide **both** states. `CHARTING.md` §15.4 carries
   a dated amendment.
2. **The spoken sentence and the price chart's text alternative opened with the
   same four words.** Both began `NVDA price chart:` — two surfaces opening with
   one phrase, which is the defect `CLAUDE.md` records happening three times in
   one afternoon on the search screen, shipped quietly since Task 2.12.6. The
   subject move to `chart reading` was needed for its own reason and repairs this
   one in the same change.
3. **A shipped browser assertion had been green against the wrong element.**
   `security-price-chart.spec.ts`'s _a pointer over the plot reads the bar under
   it_ asked its `readout` helper for **some** clock time, and that helper falls
   back to the first `EDT` in the Price region — which the panel's own live
   sentence satisfies (_holding 390 bars, through 2026-09-04 16:00:00 EDT_). It
   passed whether or not a reading was on screen. Found because the new
   cross-plot test asks for a **specific** minute and could not be made to pass.
   Both now assert against the row the `BAR` label sits in.
4. **The disc at the bar's own volume makes §10.5 visible.** That the picture is
   per pixel and the reading is per bar was a sentence in a document; on the
   default window the disc genuinely sits inside a column three times its height,
   and the strip's instant is what makes that readable rather than wrong. It was
   drawn against a real specimen — the pixel column carries 1,162,113 and the
   snapped bar traded 333,250 — before it was built.

### What is verified, and by what

- `pnpm verify` green. **788 frontend tests**, thirteen of them new — eight in
  `VolumeReading.test.tsx` and five across the geometry and the volume axis.
- **The zero-recomputation guard is finished**, which is what 2.13.4's amendment
  asked for: it counts `timeFrame`, `priceFrame` **and** `volumeFrame`, renders
  **both** plots inside one `ChartAxis`, reports zero across forty arrow presses
  and still verifies its own counter live. **Break performed** — putting the read
  position on `ChartAxisValue` takes it to **120**, which is three builders ×
  forty presses and therefore evidence that both plots were on screen and all
  three were counted.
- **The index-sharing property is asserted, not assumed** —
  `chart-geometry.test.ts` takes it at the dense window where the two arrays
  genuinely could have diverged, and the break was performed by reversing one.
- `pnpm e2e` green, with **six new browser tests**: a pointer over the volume
  plot, the two crosshairs at one pixel, the keyboard path driving both with no
  second stop, and the volume strip's reservation **at all three viewports** —
  because the middle one is the instrument.
- Looked at on the running page at 1440, and the drawing matches the canvas.

### What a user still cannot do

**Change the window.** That is Task 2.13.6, and it is the one remaining thing
between this story and its exit criterion. Nothing here handles a reading whose
series is replaced underneath it — the read position would have to clear or
re-anchor — and that is 2.13.7's, deliberately: it is a state question rather
than an interaction one, and today no control can cause it.

They also still cannot see _how unusual_ a volume is. `Volume 3.8× normal`
belongs on this strip and the baseline that computes it does not exist. Epic 5.

---

## For the stakeholder — what this actually means

**The short version: you can now point at either chart and ask it a question, and
both charts answer at once.**

Open `/securities/NVDA` and move the mouse across the price line. A thin vertical
marker follows your pointer — and it now appears in the **volume chart
underneath at exactly the same moment and exactly the same position**, with a
small ring marking that minute's trading. Under each chart, a line of text tells
you what you are pointing at: the price chart says the minute, the four prices
and how that minute moved; the volume chart says the same minute and exactly how
many shares changed hands in it. Not "179K" — **178,846**. You can also do all of
this with the keyboard, using the arrow keys, without a mouse at all.

**Why this matters to the product rather than being a nice touch.** Last week's
volume chart could show you _where_ trading was heavy. It could not tell you _how
heavy_ — a bar is a height on a picture, and a height is not a number you can
quote. The whole premise of MarketPulse is that a person can check the evidence
behind a claim rather than take it on trust. When the system eventually says
"volume 3.8× normal", the user has to be able to hover over that minute and read
the actual figure. This is that ability. It is also the last piece of the
price-and-volume pair working as a single instrument rather than as two pictures
that happen to be stacked.

**Four decisions worth knowing about, and why they went the way they did.**

_We gave each chart its own line of text, rather than one shared line._ The
obvious design is a single readout stating everything. We drew it and rejected
it, for a reason that is about the actual page rather than about taste: on a
narrow screen the price chart plus the eight figures printed under it is taller
than a phone, so a single readout would put the answer **off the screen** for
somebody pointing at a volume bar. Two lines of text, each sitting directly under
the chart it describes. They deliberately say different things — one is about
prices, the other is about shares — and the only thing they both say is the
minute, which is what makes two answers read as one question.

_When nobody is pointing at it, the volume readout states the busiest minute of
the period._ We could have left it blank, or repeated the price chart's "point at
the chart to read a bar" prompt. A blank row is a hole in the page, and repeating
the prompt would be the same sentence twice — which is a thing this project has
already been burned by. Instead the row does work when it is idle: it names the
heaviest minute in the window and when it happened. That is exactly the figure the
anomaly scoring will later turn into "3.8× normal", so it is the number a user
will most want, and it is there before they ask.

_We made the marker on the volume chart honest about something the picture
rounds._ At the default five-day view there are more minutes than there are
pixels, so the volume chart draws, for each pixel of width, the **busiest** minute
in it. The marker, though, sits at the height of the exact minute you are pointing
at — which means it often sits noticeably below the bar it is inside. That looks
odd for about two seconds and then it is the most useful thing on the chart: it is
the picture admitting what it had to round, and the timestamp beside the figure is
what makes it readable. The alternative — a marker that quietly snapped to the
drawn bar — would have looked tidier while stating a number that disagrees with
the text underneath it.

_We spent real effort making sure that following the pointer is cheap._ There is a
well-known way to build this that works perfectly and is slow: let the page
re-draw both charts every time the mouse moves a pixel. On the busiest view that
means rebuilding a 1,950-point line and a 726-bar silhouette to move one thin
vertical marker, and — this is the awkward part — **nothing would look wrong and
no standard performance alarm would fire**. It simply costs about seventeen times
the processor work on the one interaction a user does constantly, on a page that
also holds a 518-row table. So the position of the marker is deliberately held in
a place that only the two markers listen to, and there is an automated test that
counts the redraws and fails if the number stops being zero. We broke it on
purpose to confirm the test actually catches it.

**Where this leaves the project.** The price and volume charts are now finished as
a pair — they share one timeline, one marker, one keyboard path, and they answer
together. The one thing still missing from this stage is the control that lets a
user change the period they are looking at: today everything shows the last five
trading days and nothing else. That is the next task, and it is the last one
between here and the goal this stage of work was set: _search for a security,
open it, and explore its recent price and volume history_.
