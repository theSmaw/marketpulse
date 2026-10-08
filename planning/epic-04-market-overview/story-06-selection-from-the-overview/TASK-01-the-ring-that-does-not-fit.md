# Task 4.6.1 — The ring that does not fit, and the second site nobody connected

**Status:** Not started
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** —

## Objective

**AC 4 is falsified today, and this task is first because every later task adds
focusable content that would inherit the defect.**

`scroll-padding-top`/`-bottom` read the published chrome heights **exactly**,
while `--focus-width: 2px` + `--focus-offset: 2px` put the ring **4 px outside
the border box**. Measured on `/`: `Sector performance` at 768 landed at
`top=56` against a masthead bottom of **57** — 5 px of ring behind the chrome;
`Movers` at 390 the same; `Market topology` at 390 at `bottom=708` against a
footer top of **707**.

**And the exposure is about to get worse rather than stay the same.** The
recorded defect is 5 px on a _region section_. A **row** is one row-pitch tall
— an order of magnitude shorter — and sits mid-panel, so where a region's top
edge was 1 px short of clear, **a row scrolled flush to a sticky edge can be
fully occluded.**

## What the user can see when this lands

**Focus rings stop hiding behind the chrome**, at every width, in both
directions. Nothing else changes.

## Work

### There are TWO sites, and only one of them is in `docs/GAPS.md`

**Site 1** — `apps/frontend/src/styles/base.css`, two declarations:

```css
scroll-padding-top: calc(var(--sticky-chrome-height, 0px) + var(--focus-reach));
scroll-padding-bottom: calc(
  var(--sticky-footer-height, 0px) + var(--focus-reach)
);
```

**Site 2** — `apps/frontend/src/components/UniverseTable/UniverseTable.tsx`
(~1618), which `docs/GAPS.md` does **not** name:

```ts
const top = target.getBoundingClientRect().top + window.scrollY;
window.scrollTo({ top: top - stickyChromeHeight() });
target.focus({ preventScroll: true });
```

It subtracts the chrome **exactly** and then focuses — the same 4 px clip, **by
a mechanism `scroll-padding` cannot reach**. The entry immediately next door in
`docs/GAPS.md` already records that `window.scrollTo` _"ignores `scroll-padding`
entirely"_, without anyone connecting the two. **`Collapse all` — which Task
2.11.8 calls _the real skip link_ — is in that flow.**

### One home for the ring's reach

A derived token, `--focus-reach: calc(var(--focus-width) + var(--focus-offset))`,
read by both `base.css` declarations **and** by one exported helper the
`jumpToBand` path uses instead of raw `stickyChromeHeight()`. **4 px is not a
cushion chosen for comfort — it is the ring's measured extent**, so it must be
derived from the tokens and never typed.

### The walk, and the reverse one is what finds it

**Four widths — 1440×900, 1024×900, 768×800, 390×780.** 1024 is added
deliberately: the chrome's heights are recorded at 57/33, 57/53 and 94/73, and
**the footer's wrap state at 1024 is not in the record**.

**Forward and reverse.** The mechanism, which belongs in the spec's own
comment: sequential focus navigation scrolls a target to the **nearest** edge.
Walking forward, an off-screen target is below the fold and is brought to the
**bottom** — so a forward walk exercises `scroll-padding-bottom` almost
exclusively. Walking backward it is brought to the **top**, against the
masthead, **which is where the measured 5 px sits.** A forward-only walk is
green against a broken `scroll-padding-bottom` and `Market topology` at 390 is
exactly that case.

**The assertion, with the tolerance read and never typed:**

```
ring = parseFloat(--focus-width) + parseFloat(--focus-offset)   // from :root
clear of the top    ⇔ box.top    - ring >= header.getBoundingClientRect().bottom
clear of the bottom ⇔ box.bottom + ring <= footer.getBoundingClientRect().top
```

**Collect the failures and assert the collection is empty** rather than failing
fast, so one run names every offender. **Keep both existing exemptions** — an
element inside the chrome, and an element taller than the viewport (the browser
does not scroll what it already considers in view); both are measurements, not
let-offs. **Drop the `- 1`** in today's predicate: it exists because the
comparison was against the border box, and with the ring in the arithmetic
there is nothing for it to absorb. If a sub-pixel residue appears, **take the
ceiling from the run** — print `box.top - ring - header.bottom` at every stop
and set the bound from the worst observed value. A plot-gap ceiling written
from argument was 180 and the figure was 190.

### Wait for a settled page before counting

The stop count is **data-dependent** (4.6.5's subject), so a walk taken
mid-paint counts fewer stops. Wait on a condition satisfied in **both** store
shapes — a mover row's link **or** `No moves to rank yet.` — because **CI's
store is 518 securities and zero bars** and the walk must be a correct walk of
_that_ page.

### The checks, and the one that proves the other

- **`pnpm invariants`**: both scroll-padding declarations name `--focus-reach`,
  and the chrome is subtracted from a scroll offset in **exactly one place**.
  The clause a re-implementer cannot avoid is the subtraction itself.
- **`pnpm break`** on each of the two `calc()`s. **Restart the dev server
  first** — `base.css` is Vite-served and this product has a recorded false
  all-clear from exactly that.
- **And write the defect the next author writes.** Their predicate is today's:
  border box against the chrome edge, no ring term. Run it against the
  **un-repaired** stylesheet, **keep the transcript of it passing**, then add
  the ring term, then confirm red, then delete.

## Done when

1. `--focus-reach` exists, both `base.css` declarations and the `jumpToBand`
   path read it, and no file subtracts the chrome from a scroll offset twice
2. A Tab **and** Shift+Tab walk at 1440/1024/768/390 finds no stop whose
   **ring box** crosses either sticky edge, with the exempt stops enumerated by
   name and their measured heights
3. The invariant and both breaks exist, with the passing-wrongly transcript
   recorded
4. `docs/GAPS.md`'s entry is amended with the second site and discharged with a
   dated note rather than deleted
5. `pnpm verify` and `pnpm e2e` green
