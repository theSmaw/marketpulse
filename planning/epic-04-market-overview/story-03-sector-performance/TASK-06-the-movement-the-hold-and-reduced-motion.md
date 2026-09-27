# Task 4.3.6 — The order that changes: the movement, the hold, and reduced motion

**Status:** **Complete — 2026-09-27. The whole treatment is ONE CSS declaration and no JavaScript knows a number. The new invariant passed GREEN against a textbook WAAPI FLIP until a fourth clause was added — and the `ORDER HELD` badge, drawn to the canvas's own padding, moved all eleven rows 4 px on pointer enter: the exact thing the hold exists to prevent, caused by the badge announcing it.**
**Story:** [4.3 Sector Performance, & the Benchmark That Is Not an Average](STORY.md)
**Depends on:** 4.3.3, 4.3.5

## Objective

**The decision Story 4.5 used to own, taken on eleven rows.** Task 3.6.3 froze
the 518-row table because _a row that moves while it is being read is a row that
cannot be read_ — and this is the surface that decision pointed at. What makes it
answerable here rather than there is the printed ordinal: **a move is recoverable
without motion, without colour, and without the reader having remembered
anything.**

## What the user can see when this lands

**The list re-orders as the market moves**, each row travelling to its new place
over 240 ms, its rank number changing with it. **And it stops moving while they
are reading it** — with a pointer over the list or focus inside it the positions
hold, the figures and ranks keep updating, and the region says `ORDER HELD`.

## Work

- **The FLIP**: re-order the array, measure, invert, transition to zero.
  **Transform only** — animating `top`, `order` or `grid-row` is per-frame layout
  on the page §28 can least afford it. **Rows keyed by `symbol`**, never by index.
- **One settle for the whole list, from one frame. No stagger** — a stagger
  encodes an order the data does not have, which `Market proxies.dc.html` §05
  refused and the refusal transfers verbatim.
- **A first order is not a re-order.** A row is marked only if it had a previous
  rank **under the same basis** — so the first order a browser draws is drawn
  flat, and the opening bell's wholesale basis change is a **new list** rather
  than eleven simultaneous re-orders. `arrivalKey`'s shipped rule with one word
  changed.
- **The hold**, scoped to the region via `:hover` / `:focus-within` — not to the
  row, because row scoping lets rows move out from under an **approaching**
  pointer. Unbounded in time and bounded by the reader rather than a timer.
  Figures and ranks stay true; the mismatch between printed ranks and vertical
  order **is** the pending re-order. `ORDER HELD` in the panel's `meta`, carrying
  `stateMark`. Settles in one 240 ms when the pointer leaves.
- **A re-order never changes `scrollTop`.**
- **Reduced motion**: the row simply **is** in its new place with its new number.
  Clear the transform **without relying on `transitionend`** — at `0 ms` it may
  not fire, and a row stuck under a transform is the same class of defect as the
  missing `opacity: 0` base, failing in the same direction.
- **The rule 4.6 inherits, written here so it cannot be invented**: one tab stop
  for the region; rows reached by **arrow keys** within the list when they become
  activatable, not by eleven tab stops; a roving `tabIndex` keyed on the
  **symbol**, never the index, or a re-order moves focus to a different sector
  while the reader's hands are still; activation resolved against **identity**,
  never position; and `aria-disabled` rather than `disabled` on anything carrying
  a description.

## Done when

1. A frame that changes the order moves the rows and their ordinals; a frame
   that does not changes nothing and re-renders nothing
2. Two figures that read the same on screen never swap — asserted
3. A pointer over the list holds the order; the figures keep updating; the region
   says so; it settles when the pointer leaves — asserted in a browser, which is
   the only level with a pointer
4. Under `prefers-reduced-motion` the treatment does not run, the new order and
   the new ordinals are correct, and no row is left transformed — asserted
   **paired**, one test with the preference and one without, because an absence
   assertion alone passes against a treatment that never worked
5. DOM order equals visual order in every state, asserted

## Amended by Task 4.3.3 — 2026-09-27: the treatment is drawn and the owner took it — three things you implement rather than decide, and two traps that fail silently

**`The order that changes.dc.html` is the drawing. Read it before writing a line.**
What follows is the part that is a decision rather than a picture.

### 1. The two events are separated in TIME, and it is one token used twice

**`--motion-duration-settle` of stillness, then `--motion-duration-settle` of
travel.** No new token, no new number, no new limb. Taken by the owner on
2026-09-27 against drawing them coincident and against anything louder.

**Why**, on a measurement rather than a worry: `LIVE-DATA.md` §7.4 (**n=445
minutes**, all 518 symbols) bounds the intra-minute first-to-last spread at **p50
243 ms, p95 511, p99 616, max 770**, and the eleven are a subset so their spread is
bounded above by it. Against the mark's **900 ms** decay that is ~650 ms of
**eleven simultaneous discs, however many frames carried them** — and eleven discs
plus a whole-list re-order inside the same quarter-second is the gesture a page
makes when it **reloads**.

**Implement it as the same token twice and not as a delay plus a duration.** Under
`prefers-reduced-motion` both halves must resolve to `0 ms` **together**; a
hard-coded delay leaves an empty pause where the reader who asked for less motion
waits for nothing.

**The printed ordinal commits with the FIGURE, not with the travel.** Nothing on
screen may be stale during the 240 ms pause — that is what makes the lag legible
rather than wrong.

### 2. Two reduced-motion traps, and both are this repository's own shipped defects

- **A zero-duration animation applies no keyframes at all**, which is why the
  mark's `opacity: 0` base is load-bearing. Without it the disc stays on screen
  for ever.
- **A zero-duration transition may not fire `transitionend`.** A treatment that
  clears its transform on that event leaves a row **stuck under a transform** —
  drawn on the canvas as rank 3 sitting 81 px down on rank 6's line **with every
  printed ordinal correct**, which is exactly what makes it survive a review.
  **Clear the transform without relying on `transitionend`.**

Both fail in the same direction: **a reader who asked for less motion gets a worse
page than one who did not.** Assert both in a browser; neither is visible below
`pnpm e2e`.

### 3. The mark's trigger stays `arrivalKey` — and getting this wrong is invisible

**A row can mark without moving, and move without marking.** The second is the
correctness argument: its neighbour's bar arrived and overtook it, and **this row
received nothing**, so marking it would claim data that did not arrive.

**So the disc must keep firing off the observation's own identity, never off a
changed rank.** Firing it off the rank produces a disc in combination C —
moved-and-not-marked — and **nothing below `pnpm e2e` separates the two**, because
both render a disc beside a row that changed position. If you add a check, this is
the one worth having, and it owes a break; prefer a clause the re-implementer
cannot avoid writing.

### 4. The FLIP, as drawn

Measure, commit, invert, release. **Every offset is a multiple of 27 px** (the
26 px row plus its 1 px separator), so the inverse is an integer and no row lands
on a half-pixel. **Transform only** — animating `top`, `order` or `grid-row` is
per-frame layout on the page §28 can least afford it, and re-ordering in CSS while
the DOM stays put hands a screen reader **a different ranking from the one drawn**,
invisible to axe, to jsdom and to a screenshot. **DOM order equals visual order.**
**Rows keyed by `symbol`, never by index**, or React rewrites nodes rather than
moving them and destroys hover, focus and any in-flight decay.

**No stagger.** Refused twice: it encodes an order the data does not have, and it
lengthens the gesture from 240 ms to **640**.

### 5. Reduced motion loses the fact that the order changed, and that is accepted

A reader with the preference gets **the complete order exactly**; what they do not
get is **that it moved**. The owner accepted that rather than repairing it — the
only repair is the fourth mark the drawing refused, which would then exist _only_
for that reader: a treatment nobody reviews, on the rows where least data arrived.
**Do not add it.** If it comes back it is a change to the vocabulary, not to this
component.

### 6. The hold is not a second mode

`ORDER HELD` is `stateMark`'s **third consumer** (_a state PERSISTS_) and the first
use of that limb for something **a reader caused**. The finding from the drawing:
**the ordinary treatment IS the hold with step 4 put back.** One path, one commit —
**the hold gates the movement, not the ranking.** Figures and printed ranks update
underneath it; the disagreement between the ordinals and the list order **is** the
pending re-order. The head slot reserves the wider badge so nothing moves when it
appears. The release is the largest movement this component can make **and the
safest, because the reader caused it**.

### 7. The reversal trigger, and the anti-lever

> **The first sitting in which a person reports the sector region as flashing or
> refreshing rather than as facts arriving.**

**The lever is the disc, not the motion** — the strip cannot lose its disc, because
four barely-changing figures need a _look_, but a ranked list can, because **its
aliveness is its order**. **The anti-lever is named: never slow the motion down.**

## Amended by Task 4.3.5 — 2026-09-27: the region head's slot is yours to open, and the rows are built so you cannot be foreclosed

**Two things 4.3.5 deliberately did NOT build, because they are yours:**

**1. The region head's count slot.** `11 · RANKED` was not built, and the reason is
that **it is the same slot `ORDER HELD` goes in** — and it needs a `Region` /
`Panel` change to exist at all. Opening that slot twice, once for a count and once
for a badge, is two changes to a shared component for one idea. **Open it once,
here**, and reserve the **wider** of the two strings so nothing moves when the
badge replaces the count — `The ranked list.dc.html` §05 state 7 draws it.

**2. The rows are already built not to foreclose you.** Keyed by `symbol`, DOM
order equal to visual order, and the `<ol>`/`<li>` markup the FLIP needs. **The row
pitch is 27 px** — a 26 px row plus its 1 px separator — which is the multiple your
offsets must be, measured rather than assumed. A transform does not change a row's
height, so **the region's 461 px is not yours to move** and 4.3.5's probe figures
stand.

**3. What 4.3.5 shipped that you must not duplicate.** `PriceChange` carries
direction and the list spells **neither the sign nor the glyph**; the arrival mark
composes `arrivalMark` **position only**; and the three absence strings have one
home in `market/sector-performance.ts`. Your two events are a figure changing
(which fires the shipped disc, **keyed on `arrivalKey`, never on a changed rank**)
and a position changing (carried by the movement). Neither needs a new string.

---

## What was done — 2026-09-27

### The treatment is one declaration, and no JavaScript knows a number

```css
.row {
  transition: transform var(--motion-duration-settle)
    var(--motion-ease-standard) var(--motion-duration-settle);
}
```

**Duration and delay are the same token.** That is what makes both halves collapse
to `0 ms` **together** under `prefers-reduced-motion` — a hard-coded delay would
leave the reader who asked for less motion waiting through an empty pause.

The FLIP writes the inverse with `transition: none`, forces **one** reflow for the
whole list, then removes both inline declarations — **so what the browser
transitions is the REMOVAL**, and the element's resting inline state is _no
transform_ before the layout effect returns:

```js
item.style.transition = "none";
item.style.transform = `translateY(${from - to}px)`;
void element.offsetHeight; // one forced reflow for the whole list
item.style.transition = "";
item.style.transform = "";
```

**That is how the `transitionend` trap is avoided rather than handled: there is
nothing left to clear.** Proved at two levels — jsdom (`after.map(i =>
i.style.transform)` is `["","",""]` after a re-order) and the browser
(`getComputedStyle(row).transform === "none"` for all eleven, at rest, in **both**
motion preferences and after the hold's release).

**`offsetTop` rather than `getBoundingClientRect`, on purpose**: a rect includes
the transform, so a second re-order mid-travel would invert the wrong distance.

**Row pitch measured rather than assumed**: rows at `…738, 765, 792, 819…` = **27
px**, last row 26.

### The paired reduced-motion assertion — and what each half alone would miss

- **_the rows travel: at least one is transformed while the list settles_** catches
  **the treatment never ran** — no transform applied, the wrong element measured,
  the FLIP skipped. The absence test passes **trivially** against all of those.
- **_under `prefers-reduced-motion` the treatment does not run…_** catches the
  preference being ignored (WAAPI, a JS timer, a literal delay) **and both shipped
  traps**: a row left transformed (`transformsNow` all `"none"`) with the order and
  ordinals still correct.

**Each would pass against the other's defect. Only together do they mean
anything** — which is done-when 4's own argument and the same shape as _confirm the
check passes wrongly first_.

**Proof that both halves collapse together**: an rAF sampler runs the same re-order
in both preferences. Without the preference it sees transformed rows
(`toBeGreaterThan(1)`); with `emulateMedia({ reducedMotion: "reduce" })` it sees
**0** — which is only possible if **the delay went to zero as well**, since a
240 ms delay holds a row under its full inverse for 240 ms of rAF ticks.

### The break — green against a textbook FLIP

**The defect the next author writes**, put in the tree before the check was
finished: a WAAPI FLIP, `item.animate([...], { duration: 240, delay: 240 })`, which
**reads no media query**.

```
=== THE DEFECT IS IN THE TREE. The check as first written says: ===
38 invariants hold.
=== exit: 0 ===
```

**Green, with a treatment that hands a reduced-motion reader the whole gesture.**
A fourth clause was added; same defect, same command:

```
  ✗ the-settle-is-one-token-twice
    apps/frontend/src/components/RankedList/RankedList.tsx reaches for the Web
    Animations API, which reads no media query. …
1 of 38 invariants failed.
```

**Four defect variants now go red**, each an assertion failure with the other
checks still collecting:

| variant                                  | what it reports                                     |
| ---------------------------------------- | --------------------------------------------------- |
| **A** literal in the delay               | `names --motion-duration-settle 1 times, not twice` |
| **B** separate `transition-delay: 240ms` | same clause, red                                    |
| **C** `setTimeout` before the release    | _a timer before the release_                        |
| **D** WAAPI                              | the clause above                                    |

Registered as `the-settle-becomes-a-delay-plus-a-duration` (variant A), and
`every-break-can-still-land` confirms the `find` matches exactly once.

### The badge that announced the hold moved the list it was holding

**Found by a browser and by nothing else.** Drawn at the canvas's own `4px 6px`
padding, the `ORDER HELD` badge came out **26 px against `Panel`'s 22 px title
line** — so the head grew and **all eleven rows moved 4 px on pointer enter**:
`expect(await firstRow()).toEqual(quiet.row)` reporting `y: 637` against `y: 641`.

**That is the exact thing the hold exists to prevent, caused by the badge
announcing it.** Repaired: the badge is exactly `--line-height-subheading` tall
(measured 100×22 at 1440 **and** 390 through
`pnpm probe --story market-sectorperformance--order-held`) and the slot reserves
100 px. **The rule that generalises: a badge that replaces a count must be measured
against the line it replaces, not drawn to its own padding.**

**And one thing only a person looking could catch**: the `stateMark` disc needed
`align-items: baseline`, not `center`. The shared class's `translateY(-0.25em)` is
written for a baseline row, and centring made it a **superscript dot**. Nothing was
overridden — _a declaration under `composes` does not reliably win_.

### The hold

Scoped to the **region** via `:hover`/`:focus-within`, never to the row — row
scoping lets rows move out from under an **approaching** pointer. Unbounded in time
and bounded by the reader rather than a timer. Figures and ranks stay true
underneath; **the mismatch between the printed ranks and the vertical order IS the
pending re-order**, which is why no fourth mark is needed.

`Region` gained `onReaderWithin?: (within: boolean) => void` — four native
listeners (`pointerenter/leave`, `focusin/out`) combined into one boolean, released
on unmount, **off unless a caller asks** — and `meta?: ReactNode` for the head slot,
mutually exclusive with `awaiting` in one expression. `Panel` gained one prop, a
forwarded `ref`.

**One path, not two modes**: `rowsInPinnedOrder(rows, pinned)` is the file's only
`sort`, **by a pinned position, reading no figure**. The hold **gates the movement,
not the ranking** — which is the drawing's own finding that the ordinary treatment
is the hold with one step put back.

**One state the hold cannot enter, documented rather than hidden**: a reader whose
pointer is **already resting over the region before the first frame arrives** has
nothing to pin, so they get **no hold and no badge** until their next pointer or
focus event. Nothing false is shown — the badge and the gate are one value — and
the alternative was re-pinning from an effect, which the React Compiler's
`set-state-in-effect` rejects.

### Geometry, and an assertion made to mean something

`pnpm probe /` on the final tree: `areaSectors` **1026×461** at 1440, **595×461** at
1024, **720×461** at 768, **342×437** at 390 — **identical to 4.3.5's**, and
`overview-sector-region.spec.ts` is untouched and green.

**`scrollTop` never moves — but the region never scrolls, so that assertion was
worth nothing as written.** It was made to mean something instead: the spec
**scrolls the page 200 px first**, then asserts `window.scrollY` and
`document.body.scrollHeight` are unchanged across the re-order, **plus** the
region's own box and its `scrollTop`.

### The cost of a FLIP over eleven rows — §09's owed figure

Throwaway instrument, run over **20 re-orders**, recorded and deleted. Verbatim:

```
INSTRUMENT {"tasks":[],"frames":1098,"p50":16.699999809265137,"p95":17.59999990463257,"worst":37.5,"over50":0}
```

**Zero long tasks. 1,098 rAF gaps, p50 16.7 ms, p95 17.6, worst 37.5, zero over
§28's 50 ms.** Caveat stated rather than buried: **a dev server** — this suite's
only target — and **a frame gap is a proxy for the task**, not the task.

### Gates

- **`pnpm verify` — exit 0.** `All matched files use Prettier code style!` ·
  `39 components, 39 stories files.` · `479 documents, 1661 cross-file links, 39
anchor links, 0 broken.` · **`38 invariants hold.`** · shared 385, backend 990,
  frontend **1272**, process 41. **No `Unhandled Errors` block, no `stderr`, no
  rejection lines** — grepped rather than inferred.
- **`pnpm e2e` — 177 passed (3.5m), 15 skipped, exit 0.** Scoped:
  `pnpm e2e overview-sector` — **7 passed (8.1s)**, this task's four plus 4.3.5's
  three.
- **A failure reported rather than hidden.** The **previous** full run came back
  `1 failed … security-gap-fill.spec.ts:165`, 176 passed. **Two candidate causes
  and neither was picked**: it is the spec that fails on `main` at ~12% per
  execution, **and** two `pnpm probe` invocations had been run while that suite was
  in flight, against the rule. Re-run clean at 177/177 — **one further draw, not a
  disproof**; n is too small either way.
- `pnpm test:database` not run — no data-layer file touched.
- **`pnpm break` refused a dirty target** (`RankedList.module.css has uncommitted
changes`), so the substitution was performed by hand byte-identically to the
  registered entry. **Run after the commit landed** — see the gate log below.

## For a stakeholder — a status report, 2026-09-27

**The sector list now re-orders as the market moves, and stops when you look at
it.** Each row travels to its new place over a quarter of a second with its rank
number changing alongside; put a pointer over the region or tab into it and the
order **holds** while the figures keep updating, with `ORDER HELD` in the region's
header saying so. Move away and it settles.

The interesting part is the quarter-second of **stillness before** the travel. All
eleven price markers fire within about 243 milliseconds of each other — measured on
a real session — so eleven markers flashing _and_ the whole list re-arranging at
once is the gesture a page makes when it **reloads**. Separating them in time buys
two readable events instead of one flash, and it costs a duration the product
already had, used twice.

Two things were found rather than built. **A new guard passed green against a
perfectly ordinary implementation** — the textbook way to animate a re-order reads
no accessibility preference at all, so a reader who asked for less motion would
have got the whole gesture, and the check said everything was fine until a fourth
clause was added. That is the sixth time in this story's run that a guard has been
green on its own defect.

And **the badge that announces the hold was moving the list it was holding**. Drawn
to its own padding it came out four pixels taller than the line it replaces, so
every row shifted the moment a pointer arrived — the precise thing the feature
exists to prevent. No test could see it; a browser measurement could.
