# Task 2.13.3 — One axis for two plots, volume's arithmetic, and the calendar walk memoised

**Status:** Complete — 2026-09-13
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.1, 2.13.2

## Objective

Build everything the volume plot and the window control need that has **no DOM in
it**, as pure functions with tests of their own, in the shape Task 2.12.3
established: `apps/frontend/src/market/` for chart arithmetic, exported through
the module's one API file.

Three pieces, and the third is a repair rather than an addition.

1. **The shared axis as one object** — the story's own scope calls axis alignment
   "a structural property rather than a coincidence", and that is a type, not a
   discipline.
2. **Volume's own arithmetic** — its value domain, its bar geometry, and the
   abbreviation Story 1.4's tabular alignment has to survive.
3. **`timeAxis`'s trading-calendar walk, memoised in `packages/shared`**, which
   pays three callers and is the condition `CHARTING.md` §16.5 named.

## What the user can see when this lands

**Nothing.** Pure functions, one shared-package change and tests. The payoff is
2.13.4, four days of work earlier than the window control. Say "nothing visible"
plainly and name it.

## Work

### One axis, as an object both plots are handed

- **The x-domain comes from `coverage.requested` and never from the bars.**
  `CHARTING.md` §6.2 and §17.5 item 1. This is the defect with the worst shape in
  the whole chart layer: a short answer whose axis came from its own bars rescales
  to fill the frame and **looks complete**, with nothing red and a picture that
  silently disagrees with the coverage sentence printed beneath it. It is already
  held by two tests in `chart-geometry.test.ts`; a second plot deriving its own
  x-domain reintroduces it in a place those tests do not look.
- **So the second plot does not build an axis.** Decide the shape that makes that
  structural — a frame computed once and handed to both plots, or an axis object
  both read — and write down why the alternative (each plot calling `timeAxis`
  with the same arguments) is rejected: two plots that agree **because they were
  given the same numbers** cannot drift; two that agree because they were written
  the same way can.
- **The coverage rule applies per plot and is the item most likely to be got
  wrong** (§17.5 item 4): a mark derived from the window runs the full frame; a
  mark derived from the bars stops at the coverage edge. **Two plots sharing one
  x-domain must stop at the same pixel** — the volume bars, their own baseline and
  the price line above them — and the uncovered ground is drawn **once per plot**,
  not once per region.
- **`11-27` is a half day.** 210 bars, closing 13:00 ET. A window containing it has
  a short session in it and the axis must not draw an empty 13:00–16:00 band and
  call it missing data. The session-ordinal axis already gets this right by
  construction; assert it, because this story's acceptance criterion 3 is about
  exactly that week and the half day is the half of it nobody remembers.

### Volume's arithmetic

- **The value domain.** Volume's floor is **zero and not a padded minimum** — a
  bar chart whose baseline is not zero misstates every ratio a reader takes off it,
  and `priceDomain`'s `PRICE_DOMAIN_PAD` and `FLAT_DOMAIN_FRACTION` exist for a
  line, which is a different problem. Decide what the top of the domain is and what
  happens when every bar in the window is zero, which is a real answer for a thin
  security.
- **The bar geometry**, against 2.13.2's specification at both ends of the density
  range. What this must produce is a geometry that does **not** imply one element
  per bar — §1's constraint is a count, and 2.13.4 is where it is paid.
- **`volume-format.ts`** — thousands, millions and billions, with the precision
  2.13.1 settled, and the abbreviation must not break the tabular alignment
  `base.css` comments on by name ("price, volume, score must occupy the same
  width, or the column jitters"). `price-format.ts` is the precedent for where this
  lives and how it is tested; note bars carry volumes around 10⁶ intraday and
  around 10⁹ daily, which `packages/shared/src/bar.ts` already says in a comment.
- **The spoken form.** `chart-alternative.ts` builds one sentence from the axis
  rather than from pixels; a volume figure read aloud as "4.1M" is not English.
  Decide the spoken form here, beside the written one, so the two cannot drift.

### The calendar walk, memoised — in `packages/shared`

- **The figures, and they are this story's own** (2.12.9's amendment): `timeAxis`
  is **0.202 ms** at five sessions, **0.932 ms** at the `1m` cap, **8.762 ms** at a
  year of `1d` and **23.051 ms** over the whole stored depth — **twice per
  render**, so **46.1 ms of a 50 ms budget** at the widest window before a pixel is
  drawn, and again at every resize tick. The server pays the same walk at
  **20.6 ms** in the cap check on every cache hit (`MARKET-DATA-API.md` §12.4).
  Two independent measurements of one algorithm, 12% apart.
- **Memoise the walk on its window, in `packages/shared`.** It is the repair Task
  2.9.9 argued for once and declined to take alone; the condition it was waiting
  for — a second and a third caller — has arrived.
- **Do not take it in the component.** A `useMemo` in `PriceChart` fixes one caller
  of three, makes the recomputation conditional on a dependency array somebody has
  to keep correct, and leaves the server paying in full.
- **Re-take the figures after, not before.** A repair reported rather than measured
  is the thing §0 of `CHARTING.md` exists to refuse, and 2.12.6's memoisation
  repair was measured after for the same reason (§13.7).
- **Mind what a cache in `packages/shared` must not become.** Three constraints
  already live there: `Date.now()` and a zero-argument `new Date()` are lint errors
  in that package, so the cache has **no clock** and therefore no TTL; the seam in
  invariant 4 means a memo keyed on anything other than its explicit window is a
  temporal-isolation hazard Epic 13 inherits; and the series cache's precedent
  (`FRONTEND-STATE.md` §2) is **bounded twice and with no lifetime of its own** —
  copy that shape and say what the bound is.

## Done when

- Both plots are handed one axis, and the shape makes a second derivation
  unspellable rather than merely discouraged
- A test asserts the half-day session draws no empty afternoon band
- Volume's domain is zero-based, with the all-zero window answered
- `volume-format.ts` exists, is tested, and its abbreviation preserves the tabular
  width — with the spoken form beside the written one
- The calendar walk is memoised **in `packages/shared`**, with no clock and a
  stated bound, and the frontend and the backend both read the memoised path
- The five figures above are **re-taken** after the repair, in the same method and
  recorded beside the old ones
- Everything new is exported through `market/index.ts` where it belongs to the
  frontend, and nothing imports past that barrel
- `pnpm verify` passes, and `pnpm test:database` is untouched by any of this

## Notes

The fence is the DOM. Nothing in this task renders; 2.12.3's precedent is that the
arithmetic is "pure and none of it aware that a DOM exists", and that is what made
the x-domain defect assertable at the unit level at all.

The trap specific to the memoisation is that **a cache makes a correct function
wrong quietly**. The walk is the thing every session count, every tick label and
every coverage measurement is built on; a memo keyed imprecisely returns last
window's axis for this window's request, and the chart that results is plausible
and shifted rather than broken. Test the key, not only the speed-up.

---

## Amended 2026-09-12 by Task 2.13.1 — a fourth piece, and the walk's headline figure is not this product's

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) changed two things here.

### A fourth piece: `time-window.ts`, which currently has no builder

§2.2 named **`apps/frontend/src/market/time-window.ts`** as the one home for the
window list, the control labels, the query spelling and the timeframe mapping —
and no task owns writing it. This one does: it is arithmetic with no DOM in it,
which is this task's whole fence, and 2.13.6's _"the timeframe mapping has one
home"_ is a **check** rather than a build.

- The five windows, their labels and their accessible names (§4's table), once.
- **`sessions ≤ 21 → 1m`, above → `1d`** (§2.1). Exhaustive over a session
  count, not a lookup keyed on the five — an address may carry any count, so
  `?sessions=7` must map, and the mapping is what makes the cap structurally
  unreachable. Assert that property rather than restating it: no session count
  reachable inside the calendar may produce more than 10,000 bars.
- It imports `SeriesWindow` from `../bar-series-query.js` exactly as
  `use-bar-series.ts` does, and is exported through `market/index.ts`.
- **Not in `packages/shared` today** — reversal trigger is the first non-frontend
  caller, almost certainly Epic 11's `setTimeWindow`, at which point it moves
  whole rather than being copied. If `market/`'s lint boundary makes the path
  awkward, the decision that matters is _one home_, not _this path_.

### The 46.1 ms figure is real and this product never reaches it

The bullets above frame the repair as _"46.1 ms of a 50 ms budget at the widest
window"_. **That window is not offered.** "Max" was declined (§1.2), so the
widest window this product can reach is **1Y — 252 sessions — at 17.0 ms per
render**, and §16.5's 672-session figure now describes a window nothing can ask
for. Re-taken 2026-09-12 at the windows actually offered:

| Window   | Sessions | Timeframe | Per call | Per render (×2) |
| -------- | -------: | --------- | -------- | --------------- |
| 1 day    |        1 | `1m`      | 0.058 ms | 0.1 ms          |
| 5 days   |        5 | `1m`      | 0.222 ms | 0.4 ms          |
| 1 month  |       21 | `1m`      | 0.735 ms | 1.5 ms          |
| 3 months |       63 | `1d`      | 2.858 ms | 5.7 ms          |
| 1 year   |      252 | `1d`      | 8.500 ms | **17.0 ms**     |

**The repair is unchanged and still required** — 17.0 ms is a third of the
budget, paid per answer and again per resize tick, and the server pays 20.6 ms of
the same walk on every cache hit — but state the true headline. A later reader
chasing 46 ms will not find it, and a figure nothing reaches is how a document
stops being believed.

**1Y cannot ship before this lands** (§1.2): the memoisation is a precondition of
offering the window, not an optimisation that follows it.

Add to **Done when**:

- `time-window.ts` exists with the five windows, the labels and the mapping, and
  a test asserts **no session count inside the calendar can exceed the cap**
- The re-taken figures are recorded at the windows this product **offers**,
  beside §16.5's, with the method stated for both

---

## Amended 2026-09-13 by Task 2.13.2 — two of this task's open questions are closed, one algorithm is named, and one boundary needs stating

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) Part two settled the instrument,
and three things here move.

### The volume domain is decided: **zero to the window's peak, unpadded**

The Work bullet says _"Decide what the top of the domain is"_. §9.3 decided it,
and the reason is not aesthetic: **§9.2's proportion arithmetic depends on it.**
88 px was taken against _a window whose peak is 3.8× its typical bar draws that
bar at 23 px_, and that is only true if the top of the domain **is** the peak. A
padded top silently changes the ratio the plot was sized for, and it makes Epic
5's baseline rule land somewhere other than where §13.2 says it lands.

The floor stays zero and the bullet's argument for it is unchanged. **The
all-zero window is still this task's to answer** and was not decided on the
canvas — an artboard cannot draw a domain of `[0, 0]`.

### The bar geometry now has a named algorithm, and it has a correctness property

§10 specifies **one `<path>` at every window** — butt-capped stems whose
`stroke-width` is the column width — with three regimes from one rule, _does a
bar have a pixel of its own_:

| Slot     | Column                  | Stems                                             |
| -------- | ----------------------- | ------------------------------------------------- |
| ≥ 2 px   | `slot − 1` (a 1 px gap) | one per bar                                       |
| 1 – 2 px | `slot` (no gap)         | one per bar                                       |
| < 1 px   | 1 px                    | one per pixel, carrying that column's **maximum** |

The third regime is the one that needs a test rather than a reading. Its claim is
that taking each pixel column's maximum **paints the identical picture** the
overlapping stems would paint, because only the tallest in a column can be seen.
That is a property — _the reduced stem set and the full stem set produce the same
rendered silhouette_ — and it is assertable at the unit level as _every pixel
column's height equals the max of the bars falling in it_, which is the form that
catches an off-by-one in the column assignment. A reduction that drops the wrong
bar produces a plausible chart, not a broken one.

Measured on the real series at a 726 px plot (§10.3): 1M goes from 8,190 stems
and a **158 kB** path attribute to 726 stems and **16.8 kB**, and does not grow
again, because the bound is the plot's width.

### The boundary: what belongs in `market/` and what does not

This task's fence is the DOM and that is unchanged, but "no DOM" is not the same
line as "`market/`", and the tree already draws both:

- **`market/`** holds scales, axes and density — `chart-scale.ts`,
  `chart-value-axis.ts`, `chart-time-axis.ts`, `chart-density.ts`. **Volume's
  value domain is a scale and belongs here.**
- **`components/PriceChart/chart-geometry.ts`** holds frame assembly, and it is
  DOM-free too. **The stem geometry, the 1 px gap and the ≥ 2 px threshold belong
  here** — §10.6: they participate in arithmetic that produces a coordinate, and
  `PriceChart.module.css` already records that coordinates come from the geometry
  module because a computed pixel is data rather than design.

That is why **there is no `--chart-volume-gap` token**. One number in a
stylesheet and its threshold in a module is the two-homes trap `CHARTING.md`
§10.3 spent a task closing, and `CLAUDE.md`'s gap list still carries it as a live
hazard.

Add to **Done when**:

- Volume's domain is **zero to the window's peak, unpadded**, with the all-zero
  window answered
- The per-pixel reduction is tested as a **property** — each pixel column's
  height is the maximum of the bars falling in it — and not only as a stem count
- The gap and the threshold live with the geometry, not in `market/` and not as a
  token; `grep -n "chart-volume-gap"` finds nothing

---

# Outcome — 2026-09-13

**Nothing visible.** Five modules of arithmetic, one change in
`packages/shared`, and 47 new tests. The payoff is Task 2.13.4, which now has
one axis, a volume domain, a column geometry and a formatter waiting for it, and
**1Y is now shippable**, which it was not this morning.

What a user still cannot do: see volume, change the window, or watch a price
move. `SecurityExplorer.tsx`'s Volume region still holds the placeholder naming
this story, and the fence held — **no component, no route and no stylesheet was
touched.**

## 1. What was built

| Piece                                                     | Where                                     |
| --------------------------------------------------------- | ----------------------------------------- |
| The five windows, their labels, and the timeframe mapping | `market/time-window.ts`                   |
| Volume's value domain and the one label its gutter writes | `market/chart-volume-axis.ts`             |
| A volume written and spoken                               | `market/volume-format.ts`                 |
| One axis as an object, and the volume column geometry     | `components/PriceChart/chart-geometry.ts` |
| The trading-calendar walk, memoised                       | `packages/shared/src/market-session.ts`   |

Everything in `market/` leaves through `market/index.ts`, and nothing imports
past that barrel.

## 2. One axis, and the shape that makes a second derivation unspellable

`chart-geometry.ts` now has **three functions where it had one**:

```
timeFrame(width, density, subject) -> TimeFrame     // the only thing that takes a window
priceFrame(time, height, bars)     -> PricePlot
volumeFrame(time, height, bars)    -> VolumePlot
```

**Neither plot function is handed a `TimeRange` or a `Timeframe`, so neither can
call `timeAxis` — there is nothing to call it with.** That is the difference the
task asked for, and it is a type rather than a discipline: _two plots that agree
because they were given the same numbers cannot drift; two that agree because
they were written the same way can._

`TimeFrame` carries everything derived from the window — the axis, the x scale,
the seams, the tick labels, the width, the density and **the coverage spans**.
Coverage is on the shared object deliberately: `CHARTING.md` §14's rule is about
_where along the axis_ an answer stops, which is horizontal, so two plots stop at
the same pixel by arithmetic rather than by agreement. The uncovered **ground** is
still drawn once per plot, because it is a statement about a frame and there are
two frames.

`chartFrame(plot, density, subject)` survives as the composition of the two
halves, so `PriceChart` and its tests did not move; `ChartFrame` is now
`TimeFrame & PricePlot`. **Task 2.13.4 replaces that one call with a `timeFrame`
in the wrapper and a plot frame per region**, at which point the composition can
go.

**One decision that was not on the canvas.** `VOLUME-AND-WINDOW.md` §13.1 lists
"the volume baseline" among the marks that stop at the coverage edge, and §9.4
says volume's axis rule _is_ its true zero. Those are the same line, and it is
derived from the window — so **it runs the full frame** like every other mark of
that kind, and there is no second baseline mark to clip. What stops at the
coverage edge is the columns. Recorded here rather than resolved silently.

## 3. The half day, and why the assertion is about an absence

`11-27` closes at 13:00 ET. Three tests hold it, and the one that actually rules
out an empty afternoon band asserts a **missing position** rather than a drawn
one: 14:00 ET on that date is a real instant inside the requested window and
`positionOfInstant` answers `boundary` for it — the same answer it gives a night
or a weekend. A continuous time axis would have given that instant 180 slots of
empty plot and every state test would still have passed.

The rest of the week comes out of the calendar unchanged: five sessions
(`11-23, 11-24, 11-25, 11-27, 11-30`), 390 × 4 + 210 = **1,770 slots**, no tick
labelled `Nov 26`, and Monday's first slot exactly 210 after the half day's.

## 4. Volume's arithmetic

**The domain is zero to the window's peak, unpadded**, in `market/` because a
domain is a scale (§17). The floor is a literal zero — a bar chart whose baseline
is not zero misstates every ratio a reader takes off it — and the top is the peak
because **§9.2's proportion arithmetic depends on it**: 88 px was taken against
_a window whose peak is 3.8× its typical bar draws that bar at 23 px_, and a test
now asserts that figure lands at 23 px rather than trusting it.

**The all-zero window was this task's to answer, and the answer is a ceiling of
one share.** `linearScale` refuses a zero-height domain on purpose, so `[0, 0]`
is not an option; every column is then zero pixels tall, which is the honest
picture of a window in which nothing traded. The **peak label** is kept as a
separate fact from the scale's ceiling, so that window's gutter reads `0` while
its scale tops out at 1 — the pair being right rather than a disagreement.

**The bar geometry is one `<path>` at every window**, three regimes from §10.2's
one rule, and it lives with the geometry rather than in `market/` (§10.6).
`grep -n "chart-volume-gap"` finds nothing.

Two things settled while building it:

- **The pixel a bar belongs to is the pixel its `x` falls into — floored, not
  rounded, and floored from the _rounded_ x the price point above it was drawn
  at.** Flooring is what keeps every 1 px stem's centre inside the plot; taking
  the column from the raw coordinate rather than from the price point's own would
  be one more way two plots on one axis could disagree, at a tenth of a pixel.
- **The per-pixel reduction is tested as a property**, as the amendment asked,
  and in a form that does not recompute the reduction: _(a)_ every bar's pixel
  column has a stem and no bar in it reaches above that stem, and _(b)_ every
  stem's top is the top of some bar in its own column. Together those mean the
  maximum. **Both breaks were performed**: keeping the first bar in a column
  instead of the tallest, and shifting the column assignment by one pixel — each
  takes exactly that test red and leaves the other 41 green.

**`volume-format.ts` holds three forms and the spoken one is decided beside the
written one**, which is the whole reason they share a file: a written form whose
rounding changed without the spoken one following would have a sighted reader and
a listener quoting different figures off one bar.

| Form                | `4,061,234`    | Where                             |
| ------------------- | -------------- | --------------------------------- |
| `formatVolume`      | `4.06M`        | the value scale, any summary      |
| `spokenVolume`      | `4.06 million` | the text alternative              |
| `formatVolumeExact` | `4,061,234`    | the readout, and only there (§5a) |

Three significant digits, which is what keeps `9.81M`, `104M` and `1.04B` within
a character of each other in a right-aligned column — `K`, `M` and `B` are
letters and letters are not tabular, so a constant digit count is the alignment
rule. **Rounding promotes the suffix**: 999,500 is `1.00M` and not `1000K`, which
is a thousandfold error producible by rounding alone and is one of the tests.

## 5. `time-window.ts`, the fourth piece

The five windows, their labels, their accessible names, the `sessions` parameter's
one spelling, and the mapping — `sessions ≤ 21 → 1m`, above → `1d` — exhaustive
over a session count rather than keyed on the five, because an address may carry
any count and Epic 11's `setTimeWindow` will.

**The cap property is asserted rather than restated**, and over the calendar's own
sessions rather than over 390 × n, which would be the test agreeing with the
premise: the worst 21-session window anywhere in 2024–2028 is **8,190** minute
bars, and the whole calendar is fewer sessions than the cap is bars. So no session
count from any source can be refused for size.

`MAX_SERIES_BARS` is **not** copied into the frontend. The cap's one home is
`apps/backend/src/series-request.ts`; the 10,000 appears here only as a figure in a
test, which is a check rather than a second home.

## 6. The calendar walk, memoised — and it is on a date, not a window

The task said _memoise the walk on its window_. It is memoised **on a market
date**, inside `marketSessionOn`, and the reason is an attribution that was
already in the record: `MARKET-DATA-API.md` §12.4 measured `marketSessionOn` at
**28.25 µs** on a trading day against **6.42 µs** on a weekend day and concluded
that _the cost is constructing each session's open and close instants through the
timezone conversion, not walking the days._

Memoising the per-date answer therefore pays **every walker in both
applications** — `marketSessionsBetween`, `lastMarketSessions`,
`previousMarketSession`, `nextMarketSession`, and so `timeAxis`, the chart's text
alternative, the cap check, the backfill, `bars:check` and the freshness
diagnostic — rather than one function's argument list. A window-keyed memo would
have paid two of those.

Four properties, each of which the task named:

- **No clock and therefore no TTL.** What it remembers is a pure function of a
  checked-in table and a market date, neither of which changes while the process
  runs; `Date.now()` is a lint error in that package besides. Editing the
  calendar is a deploy, not an expiry.
- **Keyed on the market date and on nothing else**, which is what keeps it clear
  of invariant 4: a memo keyed on anything ambient would be a temporal-isolation
  hazard Epic 13 inherits, because a replay reading a key it did not state would
  read another clock's answer.
- **Bounded twice.** In entries, by the calendar's own range — every key passes
  `assertWithinMarketCalendar` first, so the key space is _closed_ at
  `MARKET_SESSION_CACHE_DATES` = **1,827** days, derived from
  `MARKET_CALENDAR_RANGE` rather than written beside it. **There is no eviction,
  because there is nothing to evict**: a bound that cannot be reached needs no
  policy, and a policy that cannot run is untested code. And in size per entry,
  at three numbers and a boolean — no bars, no arrays, no `Date`s.
- **It holds epoch milliseconds and rebuilds the instants per call.** A `Date` is
  mutable, and a cached one would hand every caller the same two objects, so a
  single `setUTCFullYear` anywhere in either application could move a trading day
  for every window, axis and coverage measurement built from it, with no error to
  notice. That is the shape of _a cache makes a correct function wrong quietly_,
  and it is the one version of this repair that cannot become it.

**The key is tested, not only the speed-up**, which was the task's own
instruction. The strongest available form: every one of the calendar's 1,827
dates is asked, each answer's own `date` must equal the date asked for, and the
1,255 sessions and 11 early closes are counted — any collapse of the key puts one
date's session under another's and cannot survive that. Plus: a caller mutating a
returned instant cannot affect the next call, and an out-of-range date still
refuses after the memo is warm.

**No timing assertion was added anywhere.** A timing gate in `pnpm test` measures
the runner; the figures below are the record.

### 6.1 The figures, re-taken after rather than before

Frontend runner, 200 iterations after 50 warm-up calls, 2026-09-13. The _before_
column is this task's own re-take of `CHARTING.md` §16.5's figures on this
machine — 0.197 against its 0.202 at five sessions, 8.431 against 8.762 at a year,
22.844 against 23.051 at the depth — which is what makes the ratio a property of
the repair rather than of two laptops.

| Window                          | Sessions | Before, per call | After, per call | **Per render (×2)** |
| ------------------------------- | -------: | ---------------- | --------------- | ------------------- |
| 1 day                           |        1 | 0.050 ms         | 0.019 ms        | 0.0 ms              |
| 5 days — the default            |        5 | 0.197 ms         | 0.026 ms        | 0.1 ms              |
| 1 month                         |       21 | 0.738 ms         | 0.053 ms        | 0.1 ms              |
| 3 months                        |       63 | 2.116 ms         | 0.120 ms        | 0.2 ms              |
| **1 year — the widest offered** |      252 | **8.431 ms**     | **0.423 ms**    | **0.8 ms**          |
| whole depth — not reachable     |      676 | 22.844 ms        | 0.986 ms        | 2.0 ms              |

`lastMarketSessions`, the same runner: **0.167 → 0.007 ms** at five sessions,
**8.451 → 0.335 ms** at 252, **23.148 → 0.911 ms** at 676.

The server's half, in the backend's own runner, same method:

| Cap check over         | Sessions | Before       | Cold, once   | **Warm**     |
| ---------------------- | -------: | ------------ | ------------ | ------------ |
| Five sessions          |        5 | 0.165 ms     | 0.008 ms     | 0.007 ms     |
| One year               |      252 | 7.47 ms      | 0.343 ms     | 0.342 ms     |
| The whole stored depth |      676 | **20.62 ms** | **36.47 ms** | **0.906 ms** |

**17.0 ms per render at 1Y becomes 0.8, and the server's 20.6 ms on every cache
hit becomes 0.9.**

### 6.2 The honest half: the first walk is not cheaper, and one figure got worse

Measured cold, on four years of dates none of which the process had touched — one
`timeAxis` call over a year of `1d`, then the same call again:

| Year | Sessions | Cold      | Warm     |
| ---- | -------: | --------- | -------- |
| 2024 |      251 | 21.505 ms | 0.528 ms |
| 2025 |      249 | 9.456 ms  | 0.436 ms |
| 2026 |      250 | 9.568 ms  | 0.441 ms |
| 2027 |      250 | 9.756 ms  | 0.492 ms |

2024 reads high because the first call anywhere also builds the `Intl` formatters
and the calendar index. **So the first render of a wide window pays roughly what
it always paid, once**, and everything after it — the second call in the same
render, every resize tick, every re-render, every overlapping window — is about
twenty times cheaper. The depth row of the server's table is _worse_ cold for the
same reason. What the repair removed is the **repetition**, which is exactly what
"per answer _and_ per resize tick" and "on every cache hit" meant.

Reducing the cold cost is a different repair in a different module —
`instantFromMarketTime` probes the zone twice per call and reads the result back —
and it is not taken here. **Trigger: the first window whose first paint is
measurably late because of it**, which at 9.5 ms once per process is not this
story.

## 7. What nothing checks, and it is one entry

**That the walk stays memoised.** No test in `pnpm verify` can see it: a timing
gate in `pnpm test` measures the runner, and the memo is invisible to every
behavioural test by design — a correct function that got slower is still correct.
So an author who "simplified" the cache away, or who moved
`assertWithinMarketCalendar` below the lookup, or who started returning the
cached record itself instead of rebuilding its instants, would take 1Y back to
17 ms per render and the server back to 20.6 ms per cache hit with everything
green. Two of those three do have a test — the range refusal and the mutation —
and the cost does not. Added to `CLAUDE.md`'s gap list with its re-measure.

## 8. Verification

`pnpm verify` passes. `pnpm test:database` passes (165 tests, real PostgreSQL) —
it was not touched by any of this, and it is in scope because the memo is in the
module the backend's session walks go through. `pnpm e2e` passes (97 tests), which
is in scope because `chart-geometry.ts` was restructured under the price chart it
measures. New tests: 4 in `packages/shared`, 11 in `time-window.test.ts`, 13 in
`volume-format.test.ts`, 9 in `chart-volume-axis.test.ts`, 10 in
`chart-geometry.test.ts`.

---

## For a stakeholder — what this was, in plain terms

**Short version: today was plumbing, and it bought two things — the chart's
second series now cannot drift out of line with the first, and the product can
afford to offer a one-year view, which yesterday it could not.**

### The arithmetic behind the picture, built before the picture

Tomorrow's task draws traded volume as a row of columns underneath the price
line. Today built everything that has no picture in it: how tall a column is, how
wide it is, how a figure like 4,061,234 shares is shortened to `4.06M` without
becoming misleading, and which five time periods the product will let you choose
between.

Doing it this way round is deliberate. None of this can be checked by looking at
a screen — a column drawn slightly in the wrong place looks exactly like a column
drawn correctly — so it is written as arithmetic and checked against real
recorded market data, and only then handed to something that draws.

### The bit worth understanding: one ruler, not two

Volume only means something if it lines up with the price above it. If the price
line says "this is 10:45" and the volume column below it says "this is 10:46",
the chart is lying in a way nobody would spot.

The obvious way to prevent that is to be careful — to make sure both charts
calculate the timeline the same way. We did something stronger: **the timeline is
calculated once and handed to both charts, and neither chart is given the
ingredients to calculate its own.** It is not that they agree; it is that they
cannot disagree, because there is only one of them. That took a small
restructuring today and removes a class of bug permanently, including the worst
one this chart layer has: a chart that only holds four days of a five-day window
stretching its data to fill the frame, so it looks complete when it isn't.

### The bit worth understanding: the week nobody remembers

The product will offer "5 days", and five days means five _trading_ days. Anyone
can remember to skip weekends. Fewer people remember that the day after
Thanksgiving the US market closes at 1pm instead of 4pm — so a chart covering
that week must not draw three hours of blank afternoon and imply we are missing
data. There is now a test that proves that specific afternoon doesn't exist on
our timeline at all.

### The performance repair, and why it was a blocker rather than a nicety

The product works out which days the market was open by walking a calendar day by
day, converting each one into New York time. That conversion is expensive, and it
was being redone from scratch every single time anything asked a question about
dates — twice for every redraw of the chart, again every time the browser window
was resized, and again on the server for every request.

At the five-day view nobody would notice. At a **one-year** view it cost 17
milliseconds of a 50-millisecond budget before a single pixel was drawn, and the
server paid another 20 milliseconds on every request. That is why offering a
one-year view was blocked on fixing this rather than the other way around.

The fix is to remember each day's answer the first time it is worked out. It
sounds trivial; the care is in where it was put and what it remembers:

- **Put in the shared foundation, not in the chart.** Fixing it in the chart
  would have fixed one of three places that pay the cost, including the server's.
  It is now fixed everywhere at once — the chart, the spoken description for
  screen-reader users, the nightly data loader and the server's size check all
  got faster from one change.
- **It remembers plain numbers, not objects.** Handing out the same shared date
  object to everybody would let any part of the system accidentally move a
  trading day for the entire application, with no error message anywhere. It
  hands out a fresh copy every time instead.
- **It has no expiry, on purpose.** The market calendar is a file we check into
  the code; it does not change while the program is running. An expiry would be
  pretending otherwise.
- **It cannot grow without limit.** Our calendar covers 2024 to 2028, and the
  system refuses to answer questions outside that range — so there are at most
  1,827 days it can ever remember. That is a genuine ceiling rather than a
  guess, which is why there is no need for logic to throw old entries away.

**Result: the one-year view costs 0.8 milliseconds per redraw instead of 17, and
the server's per-request check costs 0.9 instead of 20.6.**

One honest caveat, recorded rather than glossed: the **first** time the product
works out a year's worth of dates it still costs about 9 milliseconds. What was
removed is the _repeating_ of that work, which was the actual problem — it was
being paid over and over, including every time you resized your browser window.

### Where the product stands

Epic 2's finish line is "search for a security, open it, and inspect recent
price and volume data". Price landed yesterday and draws properly. Volume is next
and now has everything it needs. The time-window control — the first control in
this product that changes _what the data says_ rather than how it looks — comes
after that, and the one-year option it can now offer is the one this task
unblocked.
