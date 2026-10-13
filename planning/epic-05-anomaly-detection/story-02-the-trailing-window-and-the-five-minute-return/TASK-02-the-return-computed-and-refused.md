# Task 5.2.2 — The Return, Computed & Refused

**Status:** Not started
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
