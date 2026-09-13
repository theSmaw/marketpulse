# Task 2.13.3 — One axis for two plots, volume's arithmetic, and the calendar walk memoised

**Status:** Not started
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
