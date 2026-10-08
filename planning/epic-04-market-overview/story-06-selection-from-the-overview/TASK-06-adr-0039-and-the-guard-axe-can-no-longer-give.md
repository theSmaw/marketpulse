# Task 4.6.6 — ADR 0039, and the guard axe can no longer give

**Status:** Not started
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.5

## Objective

**Close a question declined twice, and replace a mechanism this story
destroys.**

## What the user can see when this lands

**Nothing.** This is a decision written down and a guard put back.

## Work

### ADR 0039 — `Region` is a tab stop unconditionally

**Decided: keep it unconditional, and record it rather than decline it a third
time.** Three declines is how a question stops being decidable.

**The reframing is the valuable part, and it must be in the ADR**: the question
was never _does this region scroll_. It is **can a tab stop appear and
disappear under a reader**, and the answer must be no.

**Why both candidate conditions fail.**

_Conditional on actual overflow_: overflow is a function of **height**, and the
measurement behind the premise — _no region on `/` scrolls at any of the four
widths_ — is **four width/height pairs, not four widths**. `min-height: 82vh`
with `minmax(min-content, 1fr)` rows means a region's share shrinks with the
viewport while its content does not, so a short window is the ordinary case
where one scrolls. `Region.tsx`'s own Task 1.13.4 comment already said it:
_"making it conditional would be a guess re-taken on every window resize."_

_Conditional on content being focusable_ — statically knowable, and **correct
about 2.1.1** — fails on a different axis: **the stop would appear and
disappear under a reader.** Three regions have content whose focusability is a
function of the frame, so the `Sector performance` stop would exist at paint,
**vanish when the first aggregate lands**, and return on a rollback or a
boundary trip. **A reader focused there has focus dropped to `<body>`, on a
timer nobody controls, invisible to everything below `pnpm e2e`.**

**Also record**: `overflow: auto` is load-bearing in **both** grids
(`SecurityExplorer.module.css` and `MarketOverview.module.css` each say so),
so decoupling only `tabIndex` is precisely the 2.1.1 failure. And the
blast radius as **measured**, not as assumed: **`Panel` has exactly one
production consumer** — `Region` — and **`Region` is on two routes**, not five,
with ~20 live claims in documents and specs depending on the current
behaviour.

**Reversal trigger, as a condition:** _the first region on this screen whose
content holds a keyboard stop in **every** state it can be in_ — including no
frame, a refused section, an empty answer and a tripped boundary. Nothing on
this screen is close.

### The guard this story destroys, and the replacement

**`scrollable-region-focusable` does not fire while a scrolling box contains
something focusable** — `Region.tsx` says so, and it is _"why this stood for
five stories."_ **Once rows in three regions are focusable, axe can never
report those regions again**, whatever `scrollable` does. The claim _every
region is reachable by keyboard_ then reads identically whether the mechanism
is there or not: a comment and a line in `docs/GAPS.md`.

**The replacement, which costs no new fixture:** `overview-region-order.spec.ts`
already walks the six sections in DOM order at 768 and 390 — read each
section's `tabIndex` and assert `0`. It runs on CI's bare store and goes red
the moment somebody makes `scrollable` conditional and gets it wrong. **A
sibling assertion for `/securities`' regions**, which is the route with the
long table and the original defect's shape.

**The break** removes `scrollable` from `Region.tsx` and proves it red. Per the
2026-09-26 rule, **write the file the next story would write first** — a
`Region` passing `scrollable={false}` for a reserved region — run the check,
**keep the transcript if it passes**, then fix.

### Boundaries

Not a change to `Panel` or `Region`'s behaviour. Not the journey spec (4.6.7).

## Done when

1. `docs/adr/0039-*.md` records the decision, the two failed conditions, the
   measured blast radius and the condition-shaped reversal trigger
2. A browser assertion holds the tab-stop spine on both routes, with a break
   and a passing-wrongly transcript
3. The `docs/GAPS.md` entry that recorded the open question is discharged with
   a dated note naming the ADR
4. `pnpm verify` and `pnpm e2e` green
