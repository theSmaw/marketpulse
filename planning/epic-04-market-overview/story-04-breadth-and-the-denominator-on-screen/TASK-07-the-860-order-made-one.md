# Task 4.4.7 — The ≤860 order, made one

**Status:** **Complete — 2026-10-07. The DOM is the one-column order, no CSS changed, and every region's box is IDENTICAL at all four widths. The check's first draft passed wrongly against a seventh region inserted first in source — it filtered a hard-coded list of names instead of the grid's own children.**
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.5

## Objective

**At `width <= 860px` the grid reorders visually through `grid-template-areas`
while DOM order does not** — so the eye meets `Market breadth` second and the
keyboard meets it fifth.

**This story's own premise about it was FALSE and is corrected.** The amendment
said _"there is not one tab stop inside `.regions` at any width."_ **There are
six**: `Region` passes `scrollable` unconditionally and `Panel` renders
`tabIndex={scrollable ? 0 : undefined}`. Three other documents already said so —
Story 4.6's `STORY.md`, `Panel.tsx`'s docblock, `RankedList.tsx`. **So the mismatch
is shipped and live, and the trigger fired at Task 4.1.3 rather than here.** What
breadth changes is that the stop the eye meets second becomes the first one with a
figure under it.

**Owner's decision at Gate 1: reorder the DOM.** Source order can express exactly
one layout; it should express the one where order **is** the meaning. At ≤860 the
stylesheet's own comment says _order is the only hierarchy left_; at 1440 the grid
is two-dimensional and there is no single visual sequence for the DOM to disagree
with.

## What the user can see when this lands

**At ≤860, nothing visually** — and a keyboard or screen-reader user meets the
regions in the order the screen shows them. **At 1440 and 1024, nothing at all.**

## Work

- **Reorder the JSX to the one-column order** — `breadth, sectors, movers,
topology, unusual, investigations` — and change no CSS.
- **Keep the ≤860 `grid-template-areas` block even though it becomes redundant.**
  Deleting it reintroduces the _every breakpoint that narrows a grid must restate
  its areas_ trap on the next change.
- **Verify nothing positional depends on source order**: there is no `nth-child`,
  `first-child`, `last-child`, `first-of-type` or sibling combinator in
  `MarketOverview.module.css`, `Region.module.css` or `Panel.module.css` — **this
  was checked during shaping and must be re-checked, because it is the whole
  safety argument.**
- **`pnpm probe /` at all four widths, before and after, compared box for box.**
  A grid change renders identically in every test below `pnpm e2e`; the probe is
  the only instrument that can see it.
- **State the cost rather than hiding it.** At ≥861 a keyboard reader now gets
  `breadth → sectors → …` against a column-major visual order. The argument for
  accepting it: in two columns the eye is not performing a sequence, so there is
  no reading order to disagree with. **Record it as a decision with that
  argument**, not as a side effect.
- **An assertion a machine can make**: DOM order against geometric top-to-bottom
  order at 768. Whether the result is _meaningful_ sequence is a listener's
  judgement, but the disagreement itself is checkable and currently is not.
- **`docs/GAPS.md` has no entry for this at all** — no mention of `860`,
  `reorder`, `focus order`, `1.3.2` or `2.4.3` — in a file that carries both
  sticky-focus entries. Add it or discharge it.

## Done when

1. DOM order is the ≤860 order, no CSS changed, and the areas block kept
2. `pnpm probe` at four widths shows every region's box unchanged, before and
   after
3. An assertion compares DOM order against geometric order at 768, with a break
4. The wide-width cost is recorded as a decision with its argument and a reversal
   trigger
5. The story's false premise is corrected in its own file

---

## What was done — 2026-10-07

### The reorder

New JSX order inside `.regions`: `breadth, sectors, movers, topology, unusual,
investigations`. **`MarketOverview.module.css` is byte-identical** — it does not
appear in `git diff`. The redundant ≤860 `grid-template-areas` block is **kept**,
because deleting it reintroduces the _every breakpoint that narrows a grid must
restate its areas_ trap on the next change.

### Nothing moved, box for box

`pnpm probe / --all` before and after, diffed on the sorted box lists:

```
IDENTICAL box-for-box
```

| viewport | breadth           | sectors          | movers            | topology         | unusual           | investigations     |
| -------- | ----------------- | ---------------- | ----------------- | ---------------- | ----------------- | ------------------ |
| 1440     | 342×486 @1074,557 | 1026×486 @24,557 | 1026×486 @24,1067 | 1026×161 @24,372 | 342×161 @1074,372 | 342×486 @1074,1067 |
| 1024     | 357×486 @643,557  | 595×486 @24,557  | 595×486 @24,1067  | 595×161 @24,372  | 357×161 @643,372  | 357×486 @643,1067  |
| 768      | 720×475 @24,372   | 720×486 @24,871  | 720×103 @24,1381  | 720×121 @24,1508 | 720×103 @24,1653  | 720×103 @24,1780   |
| 390      | 342×475 @24,495   | 342×462 @24,994  | 342×121 @24,1480  | 342×139 @24,1625 | 342×139 @24,1788  | 342×121 @24,1951   |

**Read the 768 and 390 rows in the new source order and the `y` values are already
monotonically increasing** — 372 → 871 → 1381 → 1508 → 1653 → 1780 — which is the
fact the new spec asserts.

### The safety argument re-checked rather than trusted

Comments stripped, then grepped for `:nth-child`, `:nth-of-type`, `:first-child`,
`:last-child`, `:first-of-type`, `:last-of-type`, `:only-child`, `:only-of-type`
and sibling combinators:

- `MarketOverview.module.css` — **none**
- `Region.module.css` — **none**
- `Panel.module.css` — **none** (`.reserved .header` is a descendant of its own
  class)

**Widened beyond the three named files**: a sweep across all
`apps/frontend/src/**/*.css` returns 20 positional selectors, **every one scoped
inside another component** and none able to reach a child of `.regions`.

### The check's first draft passed wrongly, and the trap was the corpus

**The defect the next author writes**: a seventh region inserted **first in
source** with no `grid-area` class, so auto-placement draws it **last** at ≤860.
Against a first draft that filtered the page's sections through a hard-coded
`ORDER` array:

```
  ✓  1 › the landing route's regions are drawn in DOM order at 768 (949ms)
  1 passed (1.6s)
```

**Green on a region it could not see** — the _corpus is a hard-coded file list_
trap, in a browser spec. Re-scoped to **the container**, found by its computed
`display: grid` because the class is a module hash, and the same seventh region is
red:

```
    + "Pre-market gaps",
      "Market breadth",
      "Sector performance",
```

**And the comparison is a pairwise descent, not a sort.** `Array.prototype.sort` is
**stable**, so sorting by position and comparing names passes wrongly on any tie —
which is every two-column width.

### Both widths the media query governs, not one

The spec was written at 768 alone, which covers the **rule** — one media query, one
areas list. **390 was added, because this product has already paid for the
difference**: Task 4.3.5's subgrid defect was visible at 390 and at **no other
width**, with `pnpm verify` green and the page correct at the three wider sizes,
because **no assertion at 1440 visits that width**.

```
✓ overview-region-order.spec.ts › … at 768 (764ms)
✓ overview-region-order.spec.ts › … at 390 (439ms)
2 passed
```

### The break reaches the geometric half

`the-narrow-grid-is-re-laid-without-the-dom` swaps the ≤860 areas list's first two
lines — the areas get restated and **the DOM does not follow**, which only a browser
can see:

```
✓ MarketOverview.module.css broken → red → restored byte-identical.
  matched: is not below Market breadth
```

Reproduced by hand to read the runner's output rather than the verdict — **an
assertion failure naming the sequence, not a parse error**:

```
+   "descents": Array [
+     "Sector performance is not below Market breadth",
+   ],
    "sequence": Array [ "Market breadth @ 882", "Sector performance @ 372", … ]
```

### The wide-width cost, recorded as a decision

At ≥861 a keyboard reader's six stops run `breadth → sectors → movers → topology →
unusual → investigations` **across** a grid reading `topology unusual / sectors
breadth / movers investigations`.

**Accepted** because in two columns the eye is not performing a sequence, so there
is no reading order there to disagree with — and the alternative puts the mismatch
back where sequence is the **entire** hierarchy, on the narrower viewport.

Recorded twice: a decision block at the head of `.regions`, and a `docs/GAPS.md`
entry which also says **why no assertion should be written at 1440** — one
asserting agreement would assert the opposite of the decision, one asserting
disagreement would pin a cost rather than a claim.

**Reversal trigger, a condition**: the first region on this screen whose content a
reader must traverse in order **at a wide width** — a numbered sequence, a stepper,
a form, or two regions where one's figure is read against the other's.

### The premise correction, at the site a reader stops at

`TASK-07`'s own file already carried it. What was **still live and false** was
`STORY.md`'s first statement of it — _"there is not one tab stop inside `.regions`
at any width"_, and _"the keyboard … meet it **sixth**"_ when it is **fifth**. A
dated blockquote now sits at that first site, leaving the Story 4.2 review paragraph
standing as the record.

### Gates

```
$ pnpm verify    exit 0, no Unhandled Errors block
42 invariants hold.  ·  40 components, 40 stories files.
487 documents, 1669 cross-file links, 39 anchor links, 0 broken.
shared 408 · backend 1010 · frontend 1322 · process 41
```

The first verify run failed on `eslint --max-warnings 0` —
`no-unnecessary-condition` on an optional chain in the new spec — fixed by hoisting
the heading lookup.

**`pnpm e2e` — two full executions, neither green, and neither failure is this
change:**

- execution 1 (load 5.93/8): `2 failed` — `security-gap-fill:165`,
  `security-window-change:365`
- execution 2 (load 9.66/8): `1 failed` — `security-window-change:292`, **a
  different test**, which is the documented contention signature

**Attributed with mechanisms, not assertions.** The window-change failures are
`Expected: < 1 / Received: 60` — the plot-top shift `docs/GAPS.md` **already owns**
as the developer-store class; the whole spec alone is `11 passed`, and the 346 test
`--repeat-each=4` is `4 passed`.

**And a control run for the gap-fill flake**, which is the cheapest thing available:
`git stash push -- apps/frontend/src/routes/MarketOverview.tsx` — **path-scoped, so
`notes.txt` is untouched** — then `-g "never blanked or covered" --repeat-each=8`:

```
without the change: 2 failed, 6 passed
with the change:    2 failed, 6 passed
```

**Identical with and without.** Per `CLAUDE.md`'s own arithmetic, n=8 separates
nothing on its own — the claim rests on the control being identical **and** on no
mechanism connecting a JSX reorder in `MarketOverview` to a spec rendering
`SecurityExplorer`. **Every landing-route and overview spec passed in both
executions.**

## For a stakeholder — a status report, 2026-10-07

**On a phone and a tablet, the order a keyboard or screen reader meets the regions
in is now the order they are drawn in.** It was not: the layout put market breadth
second while the keyboard reached it fifth, and that mismatch has been shipped since
the landing page was built — this story's own notes said there were no keyboard
stops to disagree, and there are six.

**Nothing moved.** Every region's box is identical at all four screen sizes, before
and after, because the layout names its areas rather than relying on source order.
The change is six blocks of markup reordered and not one line of styling.

**The cost is stated rather than hidden**: on a wide screen the keyboard order now
differs from the visual one. That is accepted, because a two-column grid is not
something a reader reads top to bottom — there is no sequence there to disagree
with — whereas on a phone the order _is_ the entire hierarchy. It is written down
with the condition that would reverse it.

Two things were caught by the discipline rather than by the work. **The new test
passed against a defect it was written to catch**, because it checked a list of
region names instead of the grid's actual children — so a seventh region added in
the wrong place was invisible to it. And it originally ran at one screen width;
this product has already shipped a defect visible only at phone width with
everything else green, so it now runs at both.
