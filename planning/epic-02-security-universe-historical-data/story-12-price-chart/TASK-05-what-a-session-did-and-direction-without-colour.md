# Task 2.12.5 — What a session actually did, and direction without colour

**Status:** **Complete — 2026-09-12.** The record is [`CHARTING.md`](CHARTING.md) §12.
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.4

## Objective

Render the series in the form Task 2.12.1 chose — the open, high, low and close
a bar already carries, rather than only its close — and make **direction
survive greyscale**.

Split from 2.12.4 on purpose. That task is about a correct series inside a
correct frame; this one is about the marks carrying what an analyst actually
reads, which is a different problem with a different failure mode: a chart that
is right and says less than the data it drew from.

## What the user can see when this lands

**An unusual session becomes visible at a glance.** A day that opened high and
closed at its low looks different from a quiet day with the same close — which
is the whole reason the store keeps four prices per bar and the reason an
analyst expects a candle rather than a line.

And it reads correctly **in greyscale and under a deuteranopia simulation**,
which roughly one man in twelve needs and which this repository has measured
rather than assumed: the positive green and the negative red are 1.04:1 apart in
greyscale, so hue is the entire difference and something else has to carry it.

## Work

- **Implement 2.12.1's series-type decision**, and 2.12.2's non-colour channel
  for direction. If the decision was a candlestick, the body/wick geometry, the
  minimum body height at a price that barely moved, and what happens when the
  bar width falls below a device pixel. If it was a line for V1, then what
  carries high and low — a band, session extremes, or an explicit statement that
  they are not drawn and why.

- **The second channel is a mechanism, not a note.** `Marker` is the precedent
  and so is `PriceChange`: the rule that colour is never the sole encoding is
  held by components rather than by authors remembering. Whatever this chart
  uses — a filled versus hollow body, a sign, a glyph, a border — is part of the
  component, and a consumer cannot render a directional mark without it.

  Note the trap recorded in `CLAUDE.md`: **`Marker` renders nothing visible
  unless its row sets `--marker-color`.** If this chart reaches for it, that
  custom property is the thing to get right, and getting it wrong is silent.

- **Verify by simulation rather than by reasoning**, which is how Task 1.4.4
  verified the palette: read the rendered chart under `grayscale(1)` and under a
  deuteranopia matrix, and record what was read. A claim that the encoding works
  is not the same artefact as a screenshot that shows it working.

- **Density.** A candle per minute over five sessions is ~1,950 marks in a
  region a few hundred pixels wide. Decide what happens as they overlap —
  thinning, aggregating, or switching form — and say it in `CHARTING.md`,
  because Story 2.13's window control will hand this chart every density between
  one session and the store's whole depth.

## Done when

- The chosen series type renders, including the degenerate cases: a bar that
  barely moved, a single-bar series, and a density where marks would overlap
- Direction is conveyed without colour, by a mechanism inside the component
- The result is read under greyscale and a colour-vision simulation, and what
  was read is recorded
- Stories cover a rising session, a falling session, a flat one and a dense one
- `pnpm verify` passes

## Notes

The fence is the window control, again, because density is exactly where the
temptation to add one appears. It is Story 2.13's; what this task owes is a
chart that does not break when 2.13 hands it ten times the bars.

The other fence is anomaly encoding. A session that was _unusual_ is Epic 5's
score, not this chart's judgement — this task makes a session's **shape**
legible and says nothing about whether it was strange.

---

## Amended 2026-09-11 by Task 2.12.1 — the task these decisions changed most

**Read this before the Work section above.**

[`CHARTING.md`](CHARTING.md) §2 chose **a line of closes, not candlesticks**, and
it took the `If it was a line for V1` branch of the Work section's first bullet.
The measurement: the Price region is **923 px at 1440**, the default window is
**1,950 bars**, so a candle is **0.47 px wide** — and 9,750 SVG candle groups was
29,260 DOM nodes and a **296 ms** main-thread task. There is no window in this
story's scope where a candle is legible.

**So the per-bar half of this task is gone, and it did not go nowhere.**

### What moved out

**Per-bar open-against-close is now [Task 2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md)'s
readout**, not a mark on the plot. That is where an analyst reads an individual
bar's four prices — by pointing at it or arrowing to it — and at 0.47 px per bar
it is the only place the reading can honestly happen.

> `CHARTING.md` §2 says _"Task 2.12.5 renders what a session did, with direction
> that survives greyscale — that is where open-against-close lives."_ **That
> sentence over-promises this task** and has been corrected in place: at this
> density, open-against-close lives in 2.12.6's readout. This task renders the
> session's **extent**, not its open-to-close direction per bar.

### What this task is now

Two things, and both are real:

1. **The high–low band.** The bars carry `high` and `low` and the line of closes
   throws them away visually. A band between the session high and the low, behind
   the close line, is **what a session did** at a density where a candle cannot
   be — it works at 0.47 px per bar because it is a filled area rather than
   thousands of marks, so it stays one `<path>` and does not reopen §1's
   element-count constraint.

   Decide it rather than assume it: a band that is too strong buries the line, and
   a series whose high and low hug the close draws a band nobody can see. **"We
   draw no band, and here is why"** is an acceptable outcome — but it has to be
   argued against the alternative, because `CHARTING.md` §5 keeps High and Low as
   _stated facts_ precisely on the grounds that the plot rounds them, and a band
   is the one thing that would put them on the plot honestly.

2. **Direction without colour, which is unchanged and is still the load-bearing
   half.** What changed is _what_ is directional. There is no per-bar body to
   fill or hollow, so the second channel attaches to the **window's** change —
   the current-value reading, the headline, and whatever 2.12.2 settled — rather
   than to 1,950 marks.

   Measured 2026-09-11 by luminance ratio: `--price-positive` against
   `--price-negative` is **1.096:1**, which is indistinguishable without hue.
   (`CLAUDE.md` records 1.04:1 by a greyscale-conversion method; the substance is
   the same and both are load-bearing.) Both inks clear **5:1** against both
   surfaces, so the contrast floor is not the problem — telling the two apart from
   each other is.

### What this does to the Work section above

- The first bullet's candlestick branch — body/wick geometry, minimum body
  height, sub-pixel bar width — **does not apply.** The line branch does.
- **The density bullet is largely discharged by §1 and §2 already.** The line is
  one `<path>` at any point count (26.3 ms cold at 9,750 bars, no long task
  measured), so the thinning/aggregating/switching decision it asks for is not
  forced. What still needs saying in `CHARTING.md` is what the **band** does at
  the densities Story 2.13 will hand it.
- `Marker` and its `--marker-color` trap are **less likely to apply**, because
  there is no per-bar mark to place. If nothing reaches for `Marker`, say so —
  the trap is silent and the note exists so it is not tripped, not so it is used.
- **Stories** still cover a rising, falling, flat and dense series. A flat series
  is now more interesting than it was: it is the case where the band has zero
  height and the line has a zero-height domain, which is
  [Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s divide-by-zero case
  seen from the other end.

### Is this still a task?

**Yes, and it is worth checking rather than assuming.** It is a smaller one than
it was written to be — the band is one decision and one `<path>`, and the
direction channel is mostly 2.12.2's answer being implemented. If it collapses in
practice, the right move is to fold it into
[Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md) rather than to pad it,
and to say so. It is kept separate for now because "the chart is correct" and
"the chart says what the data says" have failed independently before, and
2.12.4 is already the largest task in the story.

---

## Amended 2026-09-11 by Task 2.12.2 — smaller a second time, and the fold question was re-asked rather than inherited

The amendment above ends by asking whether this is still a task and answering
"yes, and it is worth checking rather than assuming". Task 2.12.2 changed both of
its halves, so the question was asked again rather than treated as settled. **The
answer is still yes, and the reasons have changed.**

### The band was drawn, and it is declined at this story's windows

§2's amendment left the high–low band as this task's decision and gave 2.12.2
"what it looks like if it does". Drawing it on the canvas answered the other half
by accident, which is the argument for drawing rather than specifying:

> **At `1m` a bar's high and low sit within a few hundredths of a percent of its
> close, so the envelope is a hairline around the line.** It was rendered at the
> default window, at the measured region width, and it is effectively invisible.

So the Work section's warning — "a series whose high and low hug the close draws
a band nobody can see" — is not a risk to design around. It is the measured case,
at the only timeframe this story serves. **The band does not ship at `1m`**, and
the "we draw no band, and here is why" outcome the amendment above called
acceptable is the one that was argued for and reached.

It earns its space at `1d`, where a session's range is a real distance, and
**Story 2.13's window control is what brings that timeframe**. If it ships then it
is `--price-unchanged-wash`, beneath the directional fill — decided, so 2.13 does
not re-take it.

What this task still owes on the band: **a stated decision in the component**, not
an absence. `CHARTING.md` §5 keeps High and Low as stated facts on the grounds
that the plot rounds them; a chart that silently draws no band and a chart that
decided not to are the same picture and different artefacts.

### The direction channel is decided, and implementing it is the real remaining work

2.12.2 settled it: a dashed `--chart-reference` rule at the **window's opening
close**, the area between the line and that rule filled with
`--price-positive-wash` / `--price-negative-wash` / `--price-unchanged-wash`, and
**the side of the rule the line finishes on is the direction**.

The measurement that forced that ordering, and it is stronger than the one this
task was written against: **the two washes differ by 1.009:1 under
`grayscale(1)`**. The inks they are drawn from differ by 1.096:1; washed back to
a fill they are, for practical purposes, the same colour.

Three consequences, and they are this task's whole content:

1. **The rule and the fill are one mechanism and ship together.** The Work
   section's "the second channel is a mechanism, not a note" now has a concrete
   failure: a component that renders the tint without the reference rule has
   shipped a chart whose direction is carried by 1.009:1. A consumer must not be
   able to get one without the other, and
   [Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md)'s amendment draws the
   boundary from the other side for the same reason.
2. **Three states, not two.** A window that closed where it opened takes the
   neutral wash. This is also the case where
   [Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s zero-height domain
   and a zero-area fill meet, which is the "flat series" story with something
   actually at stake in it.
3. **The wash is dropped when a second series arrives.** One filled area cannot
   serve _n_ series, so the tint is a single-series treatment — stated on the
   canvas as what Epic 8 **displaces**. Encode that as a property of the
   component rather than as a sentence, or Epic 8 discovers it by drawing mud.

### `Marker` is not reached for, and that is now a statement

The amendment above says the `--marker-color` trap is "less likely to apply" and
asks for it to be said either way. **Nothing in this chart reaches for `Marker`.**
The plot's only per-point mark is the crosshair's focused disc, which is
[Task 2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md)'s and is a
`<circle>` with its own stroke rather than a silhouette primitive. The trap does
not fire in this story.

### The ordering question, reopened once and closed for the right reason

2.12.1 declined swapping this task with 2.12.6, on the ground that "the readout
naturally reads the high and the low that the band has already put on the plot,
which mildly favours band first". **That reason has expired** — the band is not
on the plot at this story's windows, so it puts nothing there for the readout to
read.

The decision stands anyway, on the remaining ground alone: **renumbering costs
every reference in this directory**, 2.12.6 and 2.12.7 both declare a dependency
on this task, and the gain is marginal. Recorded so the question is not reopened
a third time as though it had been missed — and recorded honestly, because a
decision resting on a reason that has since become false is worth knowing about.

### Is it still a task? Yes, and here is the line

It is now **the smallest task in the story**, and it is kept separate because its
failure mode is the one 2.12.4's is not: 2.12.4 ships a chart that is _wrong_,
this one ships a chart that is _right and says less than the data it drew from,
in a way that is invisible to everyone who can see colour_. If in practice it
turns out to be one `<path>` and a `<line>`, fold it into 2.12.4 **in that
commit**, say so here, and do not renumber anything.

---

## Amended 2026-09-11 by Task 2.12.3 — the frame the band would need already exists, and the flat case is decided

Three things this task was going to have to reason about are now built and
tested. None of them changes what it decides; all three change what it starts
from.

- **The frame already fits a band, because the price domain is taken over the
  bars' `high` and `low` rather than their closes.** That was decided in 2.12.3
  for three reasons, and the second of them is this task's: if the envelope ever
  ships, it fits inside a frame that already exists rather than rescaling one.
  So the `1d` version this task defers to Story 2.13 does not inherit a domain
  problem — it inherits a domain that was already drawn wide enough.

- **A flat window is decided all the way down now.** 2.12.2 gave it
  `--price-unchanged-wash`; 2.12.3 gave the divide-by-zero underneath it an
  answer, and the two together say what the picture actually is: the domain is
  **±0.5% of the price**, so the line lands across the middle of the plot, the
  reference rule lands on top of it, and **the directional fill has zero area**.
  That is the third state rendering correctly rather than degenerately, and it is
  the story this task owes — worth writing as a story precisely because "the fill
  is not there" and "the fill failed to draw" are the same picture.

- **`directionOf` is in the `market` module now**, alongside the rest of the
  price vocabulary (`market/price-format.ts`). It is the same function; only its
  address moved. This task imports it from `../../market/index.js` like the eight
  components that already do, and does not write a second spelling of which way a
  window went.

**Nothing here makes the fold question any more or less live.** The standing
instruction is unchanged: if this collapses to one `<path>` and a `<line>` in
practice, fold it into [Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md)
in that commit, say so, and renumber nothing.

---

## Amended 2026-09-12 by Task 2.12.4 — the fold option has expired, and the reference rule has a question it did not have

### The fold instruction can no longer be followed, so this is a task

Three amendments above end with the same standing instruction: _if this collapses
to one `<path>` and a `<line>` in practice, fold it into
[Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md) **in that commit**, say
so, and renumber nothing._

**That commit has landed and did not fold it.** 2.12.4 is complete, and it drew
the frame, the scale, the seams and the line while deliberately leaving the
reference rule and the wash alone — its own amendment drew that boundary from the
other side, on the grounds that the pair is inseparable and that drawing the rule
in one task and the fill in another is how a chart ships with a tint and no
geometry under it.

So the conditional is spent rather than declined. **This is a standalone task
because the only commit it could have been folded into is closed**, and that is a
better reason than the ones above it were weighing. The question is not reopened
a fourth time.

### The new question: which close does the reference rule sit at?

2.12.2 settled that the dashed rule sits at **"the window's opening close"**. That
phrase has one meaning while the answer is `loaded` and two while it is
`partial`, and `partial` is the normal case here.

The window that was **asked for** and the window that is **covered** are different
ranges, and `covered.start` is not obliged to equal `requested.start` — a store
part-way through a backfill, a security listed mid-window, or a gap at the open
all separate them. So there may be **no bar at the window's opening instant at
all**, and "the window's opening close" names nothing.

The two candidates, and they disagree visibly:

1. **The first bar we hold.** The rule is always on the line, so the geometry —
   _the side of the rule the line finishes on_ — always reads. It measures the
   change across what is drawn.
2. **The requested window's opening instant.** Faithful to the axis, and when
   nothing is held there the rule floats at a price nobody observed, or has to be
   suppressed.

**Candidate 1 is almost certainly right and it must still be taken deliberately
and stated**, because the second is what "the window's opening close" literally
says and this task is the only place the difference is visible. Whichever is
chosen, the same number has to be what the current-value reading's percentage is
computed from — `series-facts.ts`'s `changePercent` already computes it across
the **held** bars, so candidate 1 is also the one that keeps the plot and the
figure above it agreeing. Two channels disagreeing about which way the window
went is worse than either being wrong alone.

This is the same class of question as §6.2's axis and it has the same shape: the
`loaded` state is the one where both answers coincide, so building against it
alone will not reveal the difference.

### What is already in place

- **The frame fits the fill.** The price domain is taken over the bars' `high`
  and `low`, so a wash between the line and a rule anywhere inside the domain is
  already inside the plot.
- **The plot is one `<path>` plus chrome**, and the ground is the panel's own —
  there is no chart ground, so a wash lands on `--surface-raised` and the
  measured 1.11:1 of `--chart-grid` _where the wash passes under it_ is the
  figure to confirm rather than discover.
- **`--chart-reference` has no consumer in the application yet.** It is read only
  by `components/chart-tokens.stories.module.css`, the specimen surface. It is
  one of exactly three tokens in that position — the other two are 2.12.6's
  `--chart-crosshair` and 2.12.7's `--chart-uncovered` — which is a precise map
  of what this story has left to draw.
- **Nothing reaches for `Marker`**, still, and nothing here should. The
  `--marker-color` trap does not fire in this story.

---

## Done — 2026-09-12

**Status:** Complete. `pnpm verify` and the browser suite pass.

### What was built

Two marks, which the four amendments above had reduced this task to, and both
of them land as one value rather than as two fields:

- **A dashed rule at the price the window opened at** (`--chart-reference`, at
  `2 4` so it is told apart from the seam's `3 3` by more than its orientation).
- **The area between that rule and the close line**, filled with one of
  `--price-positive-wash` / `--price-negative-wash` / `--price-unchanged-wash`.

`chart-geometry.ts` returns them as a single `DirectionalArea` — a `y`, a path
and a direction — so the failure the Work section names ("a component that
renders the tint without the reference rule has shipped a chart whose direction
is carried by 1.009:1") is **unrepresentable** rather than discouraged. The wash
picks its class from a total `Record` over `PriceDirection`, so a fourth
direction is a compile error.

The area path is **the line's own `d` with two segments and a close appended**,
not a second walk over the bars. At the default window that is 1,950 points
already in a string.

### The decisions this task owed, and what each turned out to be

| Question the amendments handed over    | Answer                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Which close the reference rule sits at | **The first _held_ bar, and its `open`** — candidate 1, sharpened. §12.1 below and `CHARTING.md` §12.1                        |
| Whether the extent band ships          | **It does not**, at any window this story serves — and the decision is stated in the component rather than left as an absence |
| Whether `Marker` is reached for        | **It is not**, still. Nothing here is a silhouette                                                                            |
| What the density bullet needs          | A fixture at the real density. §12.4 of `CHARTING.md`                                                                         |

#### The reference price went one turn further than it was asked to

Task 2.12.4's amendment asked _which close_, and named two candidates. Candidate
1 — the first bar we hold — is right and was taken. What the amendment did not
ask is **open or close of that bar**, and that is the half that matters: the
reading above the plot is `(lastClose − firstOpen) / firstOpen`, so the rule has
to be at the **open** or the picture and the figure are a bar apart. Invisible at
`1m` in nearly every window; visible in exactly the one where the first bar
straddles the final close, which is a window that reads as up in one channel and
down in the other.

Held by a test that imports `BarSeriesPanel`'s own `seriesPrices` /
`changePercent` rather than re-deriving the open here, because the invariant
spans two components.

#### Two fixtures were recorded, and one of them is heavy

Neither could be written by hand — this fixture set exists to refuse that — so
both were found in the real store and recorded through the real route.

- **`flat.json`** — HD's 13:00–14:00 ET hour on 2026-09-04, which opened and
  closed at exactly 320.705 after wandering 66 cents. Found with a `psql` query
  over the store (the query is in `bar-series.ts`), because none of the eleven
  existing bodies is flat and the neutral wash is a third of this task's
  subject. It is the _interesting_ flat case: the fill has real area on both
  sides of the rule and the direction is still none. The _degenerate_ one —
  every bar identical, a zero-height domain — does not exist in the store and is
  `FLAT_DOMAIN_FRACTION`'s, tested where it can be constructed honestly.
- **`dense.json`** — 1,950 bars over five sessions, `loaded`, **222 KB**. The
  default window's own density, 0.47 px per bar at the measured region. It is
  now the largest file in `apps/frontend/src/fixtures/` and `CLAUDE.md`'s
  no-ship list names it with its own re-measure command.

### What was read, rather than argued

The acceptance criterion is a simulation, not a claim. Four windows are stories,
and the same four again under `grayscale(1)` and under a Machado deuteranopia
matrix — **in the workshop rather than as a screenshot**, because a screenshot
goes stale the first time a token moves.

Read in Chromium on 2026-09-12 at the 1,019 px region: under greyscale the three
washes are three indistinguishable greys and every window's direction is still
readable; under deuteranopia the positive and negative washes collapse toward one
warm off-white while the neutral stays faintly cool — **the two that carry
meaning are the two that become identical**. The geometry never depended on
either.

### One finding worth more than the feature

The browser test written to catch a wash with no ink **was green against the
break**. Asserting _the area is filled with some colour_ passed with the class
deleted, because **SVG's initial `fill` is black**. So this chart's version of
the `--marker-color` trap fails _loudly_ — a plot flooded with near-black —
rather than silently, and reaching for the recorded trap by analogy produced a
test that tested nothing. The spec now reads three channels and asserts each is
above `0xd0`, and that version was **verified red by restoring the break**.

### What the user can see, and what they still cannot

`/securities/NVDA` now says which way the window went in four channels at once:
the headline's glyph, its sign, its words, and — new today — **the line finishing
above or below a dashed rule on the plot**. On the developer's store that reads
`▼ −0.34%` and a line that finishes below its own opening rule, with the negative
wash between them.

They still cannot read a point off the chart (2.12.6), see the states other than
an answer drawn as states (2.12.7), see volume or change the window (2.13), or
watch a price move — there is still no live data.

### The design canvas

`Price chart.dc.html` was **amended rather than re-read**: §04 had no flat
window drawn (the third state it had decided existed) and named the reference as
"the window's opening close". Both are fixed — a third artboard in both the
as-rendered and the greyscale grids, built from the real HD bars, and the prose
sharpened with its date. The canvas is the source of truth, so a finding that
falsifies it is swept into it rather than recorded only downstream.

---

## For the stakeholders — what this actually did, in plain terms

**Where the product is.** MarketPulse is being built to answer three questions
about the US stock market: what is happening, what is unusual, and what evidence
might explain it. We are still in the foundations — the part where a person can
look up a company and see its real price history. The chart that does that
appeared on screen four days ago. This task is about making it **say more**.

**The problem this task solved.** A price line tells you where a share price
went. It does not tell you, at a glance, whether the period you are looking at
was an up one or a down one — you have to trace the line with your eye from one
end to the other. Every financial product in the world solves this with colour:
green for up, red for down. We have measured that our green and our red are, to
a computer, **almost exactly the same brightness**. Print the screen in black
and white, or show it to one of the roughly one man in twelve with a red-green
colour vision difference, and the two become the same colour. A product that
leans on that colour is a product that says nothing to those readers.

**What we built instead.** A faint dashed line is drawn across the chart at the
price the period **opened** at. The price line then finishes either above it or
below it. That is the answer — up or down — and it is drawn as a _shape_, which
survives being photocopied, printed, or seen by anyone. We tint the space
between the two lines green or red as well, but the tint is now a repetition
rather than the message. We proved this rather than asserted it: the chart is
rendered in the team's component workshop with the colour stripped out entirely,
and with a colour-blindness simulation applied, and in both cases you can still
read which way the market went.

**A decision worth explaining.** There was a real choice about _which_ price the
dashed line sits at. Because our data store is filled in overnight, the chart
very often shows slightly less than the period you asked for — you might ask for
five days and we hold four and a half. So "the opening price" has two possible
meanings: the price at the moment you asked about, or the price of the first
data we actually hold. We chose the first data we hold, for a simple reason: it
is guaranteed to be _on the line_, so the up-or-down reading always works. The
alternative would have floated the line at a price nobody ever traded at, or made
the whole feature vanish exactly when our data is incomplete — which is most
weekday afternoons. We then went one step further and used that bar's _opening_
price specifically, so the picture and the percentage printed above it are
computed from the same number. Two parts of one screen disagreeing about whether
a stock went up is worse than either being wrong on its own.

**Something we chose not to build.** Each data point we store carries four
prices — the open, the high, the low and the close. An obvious feature is to
shade the high-to-low range behind the line so you can see how far the price
swung within each minute. We drew it, measured it, and dropped it: over
one-minute data, the high and low sit within a few hundredths of a percent of
the close, so the shading is a hairline nobody can see. It becomes worth drawing
when the next piece of work lets a user zoom out to daily data, where a day's
range is a real distance. The exact high and low are still printed as text
beneath the chart, where they are precise rather than approximated by a picture.

**An honest note about testing.** We wrote an automated check that the coloured
area actually has colour in it. It passed — and then we deliberately broke the
feature to make sure the check would catch it, and it passed again. The check
was worthless. We found out why, rewrote it properly, broke the feature a second
time, and confirmed it now fails. This is a habit rather than an incident: a test
that has never been seen to fail is a claim, not a safeguard.

**What this unlocks.** The chart is now a complete statement about a period of
trading rather than a drawing of it, and every later piece of the product
inherits the rule it established: **colour is never allowed to be the only thing
carrying a meaning**. The next two pieces of work add the ability to point at a
single minute and read its four prices, and to change the window you are looking
at. After that come volume, then live prices, then the unusual-activity scoring
that the AI investigation feature is built on top of.

---

## Revised 2026-09-12, the same day — the wash splits at the rule

**The section above is the record of what shipped first. This is what was wrong
with it and what replaced it.** Kept as two blocks rather than rewritten, because
the defect is more instructive than the repair.

### What the simulations could not see

The greyscale and deuteranopia readings recorded above were correct and they were
not a review. Looking at the chart **in colour** — which the stakeholder did, and
no test in this repository can — found this:

> A window that dips below its opening price and recovers was painted **green
> throughout**. The whole area took one tint, chosen by where the line
> **finished**.

Hue and position agreed at exactly one point, the last one, and contradicted each
other everywhere the line was under the rule. It is the rule this task exists to
enforce, broken by the mark built to enforce it — and **every simulation passed
against it**, because removing the hue removes the disagreement.

The general form, which is worth more than this chart: **a simulation proves an
encoding survives a transform; it cannot tell you the encoding was answering the
right question.** The instrument that found this was a person looking at it, which
is `VISUAL-LANGUAGE.md`'s fourth test applied by a human being.

### What it is now

**The area is split at the reference rule** — `--price-positive-wash` above,
`--price-negative-wash` below — so the tint is a function of **position**. That is
strictly stronger against the 1.009:1 measurement rather than a change of taste:
what the hue repeats is now exactly what survives the hue being removed, at every
point instead of only at the end.

Four consequences, and the first two are real costs:

- **The neutral state is gone.** A split has no third case. `--price-unchanged-wash`
  has no application consumer and keeps one reserved — the extent band at `1d`.
  [Task 2.12.10](TASK-10-deployed-verify-document-and-adr.md)'s token audit should
  read it as **deferred**, not as a task that did not ship.
- **`DirectionalArea` lost a field.** It carried the window's direction to pick an
  ink and there is no ink to pick. It is a rule's `y` and a path.
- **The point string did not double.** The area is defined **once** in `<defs>` and
  drawn through two `<use>` elements clipped above and below the rule. The obvious
  implementation — two geometrically-split paths clamping the line to the
  reference — would have doubled both the arithmetic and the DOM parse of the one
  thing on this chart that is linear in bar count.
- **The other three channels are untouched.** The headline still states the
  _window's_ direction in a glyph, a sign and words, and the line still finishes
  on one side of the rule.

### The second instrument failure, and it is the same shape as the first

The browser spec from the first pass asserted both fills were pale. **It passed
with one ink used on both sides** — which is precisely the behaviour that was just
revised out. It now asserts the two fills differ from each other, and that version
was verified red by pointing `.washBelow` at the positive wash.

So this task produced the same class of mistake twice: **a test that asserts a
property the broken state also has.** The first was "is it painted" against a
default of black; the second was "are they pale" against one pale ink used twice.
Both were written by reasoning about the failure rather than by performing it.

### Swept the same day

`CHARTING.md` §12.6, `VISUAL-LANGUAGE.md`'s _Direction without colour_ and its
token table, and **the design canvas** — which had drawn ten single-tint washes and
stated the old rule twice in prose. All ten are split and both sentences carry
dated corrections. The canvas is the source of truth, so a finding that falsifies
it is swept into it rather than recorded only downstream.

---

## For the stakeholders — the correction, and why it was a good catch

The report above stands, with one thing changed the same afternoon.

**What we had built.** The shaded area between the price line and the opening
price was a single colour for the whole period — green if the period ended up, red
if it ended down.

**What was wrong with it.** A share price does not move in one direction. On a day
that finished up 5%, the first two mornings might still be _below_ where it opened
— and we were painting those mornings **green**, because the period as a whole
ended up. The colour was telling you about the endpoint while the picture in front
of you was about every moment in between. On the very first chart you look at,
that is the part your eye goes to.

**What it is now.** The shading changes colour at the opening price: green where
the price is above where it started, red where it is below. So the colour agrees
with the picture everywhere, not just at the right-hand edge.

**Why this is the stronger version, not just the prettier one.** The whole point
of this piece of work was that colour must never be the only thing carrying a
meaning. The split actually makes that _more_ true. Colour is now repeating
"above or below the opening price", which is exactly what the shape of the chart
already shows you — so if you remove the colour entirely, nothing was being said
that you cannot still read. Under the old version, the colour was saying something
the shape did not, which is the situation we were trying to avoid.

**What it cost.** There is no longer a "flat" colour. A day that closes exactly
where it opened now shows green where it was up and red where it was down, rather
than a single neutral grey — which is, on reflection, a more useful picture of
such a day than "nothing happened" was.

**The honest note about how this was found.** We tested the original version by
stripping the colour out and by simulating colour blindness, and it passed both —
because removing the colour also removes the disagreement we had introduced. A
simulation can tell you an encoding survives being transformed; it cannot tell you
the encoding was answering the right question. **A person looking at the screen
found this, and that is the check that caught it.** We have written that down,
because it is the kind of thing a team stops doing once the automated tests are
green.

We also got the automated test wrong twice in the same way — each time it asserted
something that was _also_ true of the broken version. Both are now fixed and both
were confirmed by deliberately breaking the feature and watching them fail.
