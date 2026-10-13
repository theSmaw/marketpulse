# Task 5.2.2 — The Return, Computed & Refused

**Status:** Complete — 2026-10-14 — the refusal has four kinds rather than one, and widening `one-home-for-the-observation-window` turned out to need a **second** invariant widened beside it: `one-home-for-the-live-change` reads any division by a close as the session-close join, and this file divides a minute bar by another minute bar
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](STORY.md)
**Depends on:** 5.2.1

## Objective

**A 5-minute return is two subtractions and one refusal, and the refusal is the
whole substance.** `ERIE` at **2.1%** minute coverage would otherwise produce
_"the 5-minute return"_ between bars **47 minutes** apart, and the measured
ordinary maximum gap is **187 minutes** — a well-formed, correctly-signed,
correctly-coloured figure that is wrong by a factor nobody can see.

## What the user can see when this lands

**Nothing.** Task 5.2.3 pays it off.

## Work

- **A pure function**, `marketBreadth`'s shape: the window and an `asOf` are
  **arguments**, and it reads no clock, no socket and no repository handle.
  That is what makes invariant 4 structural here rather than instructed.
  **Note `relativePerformance` is NOT the pattern to copy** — it is a frontend
  function over a wire frame and takes no `asOf`. Copy `marketBreadth` and
  `buildMarketOverview`.
- **The refusal lives in the SELECTION, not in the arithmetic.** A function
  taking `(earlier, later)` can still be handed the wrong pair by its caller, so
  _pick the endpoints_ and _subtract them_ must not be two separable steps a
  future caller can re-assemble wrongly. The selection owes its own test.
- **Endpoint integrity.** The figure is measured between two bars whose own
  `startsAt` are **exactly** the span apart. If the earlier endpoint is absent
  the figure is **refused** — never substituted with the nearest available bar,
  and never stretched.
- **`observed k of 5` comes from the same pass that produced the figure**, never
  a second count. A numerator and a denominator computed by two passes is Story
  4.4's own defect arriving one surface over.
- **Two different partials, and they are not the same answer.** A window with
  three of five minutes **whose endpoints are exactly five apart** is a
  legitimate figure with gaps in the middle; a window whose earlier endpoint is
  missing is **refused**. The first keeps its digits and adds a count; the
  second has no digits at all.
- **`one-home-for-the-observation-window` will go red on the obvious
  implementation, and the repair is a third conjunct rather than a dodge.**
  `scripts/check-invariants.mjs` matches
  `getTime() - <anything> * MS_PER_MINUTE` across **every shipped source file**
  and requires **exactly one**, in `market-breadth.ts`, naming
  `BREADTH_WINDOW_MINUTES`. An endpoint lookup is that shape.
  - **These are two different quantities and the check cannot tell them
    apart.** ADR 0040's five minutes is an **eligibility cutoff over a
    population** — _is this security's newest observation still about now_.
    This story's five minutes is a **measurement span between two named
    endpoints of one security**, and AC 3 makes it a refusal rather than a
    filter. Different subject, different arity, different failure mode.
  - So: **widen the check to permit exactly one span cutoff, in this module,
    naming a constant that is not `BREADTH_WINDOW_MINUTES`** — and add the
    break. **Write the file Story 5.3 would write** (a percentile lookback) and
    confirm the check passes **wrongly** first.
  - **Do not spell the span to slip the regex.** The check's own comment names
    that as the invisible residue it exists to prevent.
  - **ADR 0040's own reversal trigger has NOT fired** — _the first aggregate on
    this screen whose honest window is not breadth's_, where _this screen_ is
    `/`. This figure is not an aggregate and is not on `/`. Say so in writing.

## Done when

1. The return is a pure function over the window with `asOf` as an argument,
   reading no clock and no handle.
2. **The refusal is in the selection**, with its own test, and a caller cannot
   assemble a stretched pair.
3. Two bars exactly five minutes apart produce a figure; four, six and
   forty-seven minutes apart produce a **refusal**; and the 47-minute case is
   asserted by name.
4. `observed k` is derived from the same pass as the figure, asserted.
5. `one-home-for-the-observation-window` carries its third conjunct, with a
   break performed in **both** directions and the passing transcript kept.
6. ADR 0040's reversal trigger is evaluated **in writing** and the verdict
   recorded.
7. `pnpm verify` green.

## Amended by Task 5.2.1 — 2026-10-13: `read()` can hand you bars that are arbitrarily old, and bounding them is yours

Two properties of the shipped window that the pure function must not assume
away:

- **`read(symbol)` returns a copy, oldest-first, including the 90 s tolerance
  tail.** The window retains `span + ε`, so some of what you are handed is
  **outside** the five minutes by construction. Bound your own
  `asOf − span` rather than trusting the array's extent.
- **Eviction is relative to that security's OWN newest bar, never to now.** A
  security silent for 187 minutes keeps up to seven bars from 187 minutes ago,
  which is correct for memory and is exactly the shape AC 3 refuses. So a full
  window is **not** evidence of a recent one, and `held.length === 7` must never
  stand in for _we have five minutes of history_.

**And ε's stated reason in this story was wrong, which changes what you can
assume.** Task 5.2.1's own brief said a five-minute window could evict the
earlier endpoint between a bar arriving and its revision arriving; with an
inclusive boundary that case **cannot fire** — the endpoint of the five minutes
ending at the newest bar is never evicted. The case that does fire is one minute
later: a reader computing the last **settled** five minutes asks `asOf` the
newest-but-one bar, because a bar is not final for ~30 s, and a strict window has
already dropped that pair's earlier endpoint. ε = 90 s and depth 7 are unchanged;
what changed is the sentence, and a test written against the old one passes on a
strict window too.

---

## What was done — 2026-10-13

<!-- written at completion -->

## What was done — 2026-10-14

`apps/backend/src/five-minute-return.ts` and its 20 tests. A pure function over
the window with `asOf` as an argument, `marketBreadth`'s shape: no clock, no
socket, no handle.

### The refusal has four kinds, not one

`ReturnRefusal` is `"nothing-observed" | "no-earlier-endpoint" | "no-basis"`
beside the measured answer, because **the surface has to tell them apart** and a
single boolean would have forced Task 5.2.4 to re-derive which it was from the
window it no longer has. `nothing-observed` is CI's permanent state;
`no-earlier-endpoint` is AC 3's refusal and the one `ERIE` produces;
`no-basis` is a zero or non-finite earlier close, which is a division this
product refuses to perform rather than a figure it reports as infinite.

### The selection and the subtraction are one pass, deliberately

There is **no `(earlier, later)` entry point a caller could assemble wrongly** —
asserted by a test that reads the module's own exports and fails if one appears.
One reverse walk from the newest bar at or before `asOf` finds the endpoint
exactly `RETURN_SPAN_MINUTES` earlier, counts what it passed on the way, and
stops. `observed` therefore cannot disagree with the figure: they are produced by
the same traversal, which is Story 4.4's numerator/denominator defect made
unrepresentable rather than tested for.

Three tests are the ones worth keeping: it **refuses a pair 47 minutes apart**
by name; it **never counts a bar outside the span, including the window's own
ε tail**; and it **never infers recency from a full window** — a security silent
for 187 minutes holds seven bars and still answers, because the figure is about
two endpoints rather than about freshness, which is AC 6's no-threshold rule
arriving in the arithmetic instead of in the copy.

### The invariant, widened twice — and the second one was not in the plan

**`one-home-for-the-observation-window` gained its third conjunct**: beside the
one eligibility cutoff in `market-breadth.ts`, exactly one **measurement span**
in `five-minute-return.ts`, naming a constant of its own. The failure message
now routes a future author to the right answer rather than only refusing — _if
it is not a freshness window at all but a SPAN between two endpoints of one
security, it belongs beside `fiveMinuteReturn` rather than in a third module._

**And `one-home-for-the-live-change` had to be widened beside it, which nobody
anticipated.** Its clause three refuses any shipped file that **divides by a
close**, because the defect it was written against is an author who has the live
map and the stored closes and writes `(live.close - close.close) / close.close`,
silently losing the same-session branch. This file divides a **minute bar's
close by another minute bar's close**, five minutes apart, on one live tape, and
reads no stored close at all — a different quantity that trips the same pattern.
The exemption is **named and anchored**: `five-minute-return.ts` must still
divide by a close (an exemption nothing uses is a hole nobody is watching) and
must **not** mention `SecurityLastClose`, `readLastCloses`, `closesAsOf` or
`previousClose`, so the day it reaches for the session-close side the exemption
stops covering it.

### The break, in both directions

**Direction 1 — the file Story 5.3 would plausibly write**, which is the one
that matters: a `market-percentile.ts` with its own `PERCENTILE_LOOKBACK_MINUTES
= 60`, a third module with a third window. The widened check caught it:

```
✗ one-home-for-the-observation-window
  The tree holds 2 observation-window cutoffs, expected exactly 1:
    apps/backend/src/market-breadth.ts — getTime() - BREADTH_WINDOW_MINUTES * MS_PER_MINUTE
    apps/backend/src/market-percentile.ts — getTime() - PERCENTILE_LOOKBACK_MINUTES * MS_PER_MINUTE
```

Plant deleted, `58 invariants hold.`

**Direction 2 — the registry entry**, `a-span-spelled-as-the-observation-window`:
the span reaching for `BREADTH_WINDOW_MINUTES`, which is the **tidy-looking**
edit rather than a synthetic one — that constant is already five, already
exported, and already this product's one home for _a window of five minutes_.
`pnpm break` **refuses a dirty target and the target is this task's own new
file**, so it was performed by hand with a checksum either side:

```
4c9408b6abc4273f075f4d32d92b05b19c195c27  apps/backend/src/five-minute-return.ts
substitution landed
  ✗ every-break-can-still-land
  ✗ one-home-for-the-observation-window
2 of 58 invariants failed.
4c9408b6abc4273f075f4d32d92b05b19c195c27  apps/backend/src/five-minute-return.ts
58 invariants hold.
```

Restored byte-identical. The second failure is expected while the break is
applied: the `find` text is what the substitution replaced.

### ADR 0040's reversal trigger — evaluated, and it has NOT fired

The trigger is _the first aggregate on this screen whose honest window is not
breadth's_, where **this screen is `/`**. This figure is **not an aggregate** —
it is one security's two endpoints — and it is **not on `/`**; the story's own
_Out of scope_ excludes that route entirely. What would fire it is Story 5.4
putting a ranked list of these figures on the landing page with a window that is
not breadth's.

### Gates

- `pnpm verify` — **exit 0** at load 3.97, `58 invariants hold.`, **3,032 tests**
  (440 + 1,079 + 1,458 + 55). No `Unhandled Errors` block.
- `pnpm format` was **not** run: `notes.txt` is not in `.prettierignore` and
  `--write .` would reach it. `format:check` plus writes by explicit path.

### What this leaves standing

**Nothing reads this function yet.** It is exercised only by its own tests until
Task 5.2.3 puts the figure on a frame — so the one thing nobody has seen is the
return computed over bars that arrived from a real socket rather than ones a
test wrote.

## For a stakeholder — a status report, 2026-10-14

**Nothing changed on screen; the arithmetic behind the next task now exists.**

A 5-minute return is two subtractions, and the entire substance is knowing when
_not_ to produce one. A security our feed hears from 2% of the time would
otherwise yield "the 5-minute return" measured between bars **47 minutes
apart** — a number that is correctly signed, correctly coloured and wrong by a
factor nobody can see. This refuses instead, and says which of four reasons it
refused for, because a surface that cannot tell _we have heard nothing_ from
_we have heard something but not five minutes ago_ will eventually print one
when it means the other.

Two build-time checks had to be widened to let the work exist, and the second
was a surprise: one of them reads **any** division by a closing price as a
specific defect from an earlier epic, and this calculation divides one minute's
price by another minute's. Both widenings are narrow, named, and anchored so
that they fail if the thing they exempt ever stops being what it claims — and
both were proved by **writing the mistake a future story would plausibly make**
and watching the build refuse it.
