# Task 4.5.3 — Movers drawn

**Status:** **Complete — 2026-10-08.** The region draws, every state is in the workshop, and **466 px at all four widths in all five shipped states** is measured rather than predicted — as is **520** for the sixth row the budget refuses. Two findings: the stylesheet's claim that this task fills the price cell was **unfulfillable** (the row type has no price and no producer exists until 4.5.4), and the FLIP hazard the brief warns about is **real but dormant** — with the padding at the tail, excluding the pads from the array the FLIP is handed changes nothing, and it was proved red only by moving the padding to the head.
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** 4.5.1

## Objective

**Two ranked lists in one region, as peers**, with every state produced in the
workshop before any of it meets a frame.

## What the user can see when this lands

**Nothing on `/`** — the region still says what it is waiting for. The workshop
gains the region and its states. Task 4.5.5 puts it on screen.

## Work

### Two peers, not a demotion — and this is the distinction that matters

The sector quiet group is a **demotion**: no ordinal, regular weight, secondary
ink, below a rule, words where a figure would be. Gainers and losers are **two
peers** — each ranked from 1, each a complete answer, neither subordinate.

**Take the mechanism, not the emphasis.** A second `<h3>`, a `--rule-control`
rule above it, a separate `<ol>`, and `.quietHeadAlone`'s rule about not drawing
a divider that divides nothing. Both lists draw primary ink, medium weight on the
name, a printed ordinal and `PriceChange` at full strength. If the losers list
inherited the receding treatment it would read as _losers are the leftovers_ —
false, and tonally wrong on a market surface where a −9% name is the most
interesting thing on the page. The distinction is safe because in the sector
region the demotion is carried by **the rows**, not by the heading.

**Headings: `GAINERS` and `LOSERS`** (the owner's Gate 1 decision). Micro size,
uppercase, medium weight, secondary ink — **properties spelled, never
`composes: microLabel`.** These are the first strings in this region to contain
**words**, which is exactly the content that makes the `composes` ordering trap
visible: `type.module.css` lands later, so `text-transform: none` under a compose
does not win, and the defect needs content of a kind the rule has never held.
First heading: no rule, no padding-top (`Panel`'s own `--rule-strong` is 32 px
above). Second: `--rule-control` plus `--space-8`, because it separates two
**lists** rather than two rows.

**Not two panels** — `Panel` is the language's one strong statement and nesting
two gives three frames with the region's name competing with two sub-names.
**Not a bare gap** — two unlabelled columns of signed figures is a permutation
waiting to be misread, and in greyscale the heading is the first and strongest of
the three non-colour channels.

### The height budget, which is why the row count is five

Content ceiling is **389 px**, not 486: the chrome above the first row is 2
(borders) + 47 (header) + 16 (`Panel.body` padding-top) + 16 (`Region.content`
margin-top) + 16 (padding-bottom) = **97**. Corroborated from a second region —
`BreadthLedger.module.css`' own head comment records _"378 against a 389 px
ceiling"_.

| element                        | px                      |
| ------------------------------ | ----------------------- |
| chrome                         | 97                      |
| `GAINERS` heading              | 16                      |
| gainers, 5 rows                | 134                     |
| gap (`--space-16` floor)       | 16                      |
| `LOSERS` heading               | 25                      |
| losers, 5 rows                 | 134                     |
| footer claim, two-line reserve | 44                      |
| **total**                      | **466** against **486** |

**Twenty pixels of slack**, absorbed by the flexible gap. **N = 6 is 520 — over
by 34, and it drags `Sector performance` and `Market breadth` with it**, because
rows 2 and 3 share one `fr`. State that in the stylesheet so nobody discovers it
by shipping it.

### The states, and the asymmetric pair is the new hazard

Produce **all** of them in the workshop: both lists full; **asymmetric** (5 and
2); every figure identical; one row; nothing rankable at all (**CI's permanent
state**); the reservation before any frame; `No moves to rank yet.` past
`useWaited`'s 2,000 ms floor; and the region error.

**The sentence is `No moves to rank yet.`** — not `No prices yet.` (the strip's)
and not `No sector moves yet.` (4.3's). Three regions, three nouns, one per
region, which is what tells a reader **which** region went quiet when two do at
once. It names the quantity and the action and claims nothing about whether the
market is flat.

**The reservation is the real component, never a `min-height`** — a `min-height`
is a second home for the row pitch, the headings and the claim, wrong the first
time any of them changes and wrong **silently**. And it is **two boxes, not
one**: the held geometry keeps its own `visibility: hidden` and `aria-hidden`
unconditionally, and the sentence is a **sibling** in the room it holds. The
one-box version was a live defect for ten days and leaked internal slugs into the
accessibility tree, because **`visibility` is inherited by children that never
set it**.

**The asymmetric pair.** At 1440 and 1024 nothing moves — the grid row is
`minmax(min-content, 1fr)` and resolves to 486 whatever the content is. **At 768
and 390 the rows are untied and the region is its content**, so a list going
5 → 2 shrinks it by 81 px and steps the whole lower page — three times the 25 px
Task 4.3.7 spent a task designing out. **Pad each list to N with held rows** —
the same `Row`, `visibility: hidden`, `aria-hidden`, so the pitch comes from
`.row` itself and no arithmetic gets a second home.

**One correctness constraint the developer must be told:** `useSettle` indexes
into `element.children`, so held rows inside the `<ol>` **must be present in the
`rows` array the FLIP is handed**, or every `to` position is read off the wrong
row and rows travel to places they were never in. `RankedList.tsx`'s own comment
at the `ranked`/`quiet` split records the trap.

### Boundaries

Not the producer or the wire (4.5.4). Not the landing page (4.5.5). Not the
denominator's wording (4.5.6) — reserve its 44 px and leave it empty here. Not
the hold at two lists (4.5.7).

## Done when

1. The region draws two headed lists as peers, with the second heading's rule and
   neither list inheriting the quiet group's receding treatment
2. Every state above has a story, including the asymmetric pair and the two-box
   reservation, and the reservation's `innerText` holds the sentence **and
   nothing else** — no label, no slug, no em dash
3. A list going 5 → 2 changes the region's height by **zero** at all four widths,
   measured with `pnpm probe`
4. The FLIP still travels correctly with held rows present, asserted rather than
   reasoned
5. `pnpm verify` green, stories gate satisfied

## What was built

`apps/frontend/src/components/Movers/` — `Movers`, `MoversMeta`,
`MoversReservation`, a stylesheet, eleven tests and eleven stories — over
`apps/frontend/src/market/movers.ts`, which holds the view type, the padding and
the reserved value and **no reader**: the frame grows a movers section in 4.5.4.

Three changes outside it, each the smallest that would do:

- **`MOVERS_PER_SIDE = 5` in `packages/shared/src/sector-ranking.ts`**, beside
  `selectMovers`. In `packages/shared` rather than in the frontend because the
  producer slices to it and the drawing pads to it, and those are **one fact**:
  the frontend cannot be the home of a number the backend has to know, and a
  second literal is exactly the drift this module exists to prevent.
- **`SectorRow.held`**, optional, and `RankedList` drawing a held row with
  `visibility: hidden` and `aria-hidden` on the `<li>` itself — one declaration
  for the whole row, because `visibility` is inherited by children that never
  set it.
- **`.held` and `.row:has(+ .held)` in `RankedList.module.css`.** The second is
  the one that is not obvious: a separator under the last **real** row divides a
  row from a row that is not there, which is `.quietHeadAlone`'s refusal one
  element over, and `transparent` rather than `0` keeps the 1 px in the box so
  the padded list is the same height as a full one to the pixel.

## The heights, measured with `pnpm probe --story market-movers--*`

Inside a `Region`, as the route draws it, 2026-10-08:

| state                       | 1440    | 1024    | 768     | 390     |
| --------------------------- | ------- | ------- | ------- | ------- |
| both ends full (5 and 5)    | **466** | **466** | **466** | **466** |
| a one-sided day (5 and 2)   | **466** | **466** | **466** | **466** |
| one rankable name (1 and 0) | **466** | **466** | **466** | **466** |
| nothing rankable (0 and 0)  | **466** | **466** | **466** | **466** |
| every figure identical      | **466** | **466** | **466** | **466** |
| before the first frame      | **466** | **466** | **466** | **466** |
| **a sixth row each way**    | 520     | 520     | 520     | 520     |

**Done-when 3 is met and the figure is zero**: a list going 5 → 2 changes the
region's height by **0 px at all four widths**, measured rather than asserted.

**The ledger resolved exactly as the budget predicted it would**, element by
element, read off `pnpm probe --all` at 1440 and at 390: `head` 16, the first
list 134, the gap plus `head.headSecond` 41 (16 + 8 + 16 + 1), the second list
134, `claim` 32 with a 12 px margin, and the panel 466. Nothing had to be
adjusted to make it fit, which is what twenty pixels of slack buys.

**`bound` measures 98×16 at both 1440 and 390**, inside a slot reserving the
100 px `SectorPerformance.slot` measured for Task 4.5.7's badge — so the badge
fits the room it already has.

## Finding 1 — the price cell could not be drawn here, and the stylesheet says it was

`RankedList.module.css` and `RankedList.tsx`, both written by Task 4.5.1, say
track 4 is the price's and is _"unfilled until Task 4.5.3 has a price to put in
it"_. **This task could not fill it**: `SectorRow` carries no price, and there
is no producer for one until 4.5.4 puts a movers section on the wire — so
drawing a figure there would have been inventing a number, which is the one
thing invariant 1 forbids outright. The brief for this task never mentions a
price, and its height budget has no row for one, so the two documents disagreed
and the brief was right.

The track is **held and empty**, measured at 80 px at 1440/1024/768 and dropped
at 390, and the obligation is written into `TASK-04`'s file in words that task
can act on.

## Finding 2 — the FLIP hazard is real and dormant, and only a moved pad proves it

The brief's correctness constraint is that held rows **must** be present in the
array handed to the FLIP, because `useSettle` indexes into `element.children`.
It is true in general and **it does not bite today**, which is worth writing
down so the next author does not conclude the opposite from a green run:

- Shipping the obvious defect — `useSettle(ranked.filter((row) => !row.held))`,
  with the list still drawing the pads — left **all eleven tests green**. The
  pads sit at the **tail**, so a real row's index is the same in both arrays and
  the arithmetic is unchanged.
- The same defect with the padding moved to the **head** went red immediately,
  and in the right way: a pad was handed two transforms and the real rows none.

So the padding's **position** is load-bearing, and the refusal is now stated
twice rather than inferred: `withHeldRows` appends, and `useSettle` skips a held
row explicitly rather than relying on its basis being absent.

**The test has teeth.** `offsetTop` is stubbed to a 27 px pitch — jsdom computes
no layout, which is why `RankedList.test.tsx` says in as many words that nothing
at that level can see the travel — and the transform is read with a
`MutationObserver` on the style attribute, whose `oldValue` is the only record
of a value written and removed in one commit. Breaking the arithmetic
(`tops[index]` → `tops[index + 1]`) turns both the padded test and its unpadded
control red with an assertion failure, every other test still collecting.

## What is deliberately not here

The price cell (4.5.4 or 4.5.5), the denominator sentence (4.5.6 — its 44 px is
held and its `<p>` is empty), the hold at two lists (4.5.7), and the landing
page (4.5.5). **No new `pnpm invariants` clause and therefore no break**: this
task added no check.

---

## What was done — 2026-10-08

`apps/frontend/src/components/Movers/` over `apps/frontend/src/market/movers.ts`
— the view type, the padding helper, `RESERVED_MOVERS`, and **no reader**
(4.5.4's). `Movers` renders `h3 GAINERS` → list → `h3 LOSERS` (with
`--rule-control` + `--space-8`) → list → an empty 44 px footer for 4.5.6. Both
lists take `quietGroup="impossible"`, `bar: "none"`, and `aria-labelledby`
pointing at their own `useId`'d heading.

**The reason to spell the heading's properties turned out sharper than the
brief's.** The compose-ordering trap is real, but the element is an **`h3`**, so
`font-weight` has to beat `base.css`'s heading bold — and a weight written under
a `composes` is safe **only while the composed class happens not to set one**.
That is a dependency on another file's absence, which is worse than the ordering
problem it was guarding against.

Three changes outside the directory, each the smallest that would do:
`MOVERS_PER_SIDE = 5` in `packages/shared` beside `selectMovers` (the producer
slices to it and the drawing pads to it — **the frontend cannot be the home of a
number the backend must know**); `SectorRow.held` and `RankedList` hiding a held
`<li>`; and `.row:has(+ .held)`, which is the non-obvious one — **a separator
under the last real row divides a row from a row that is not there**, so it goes
`transparent` rather than `0`, which would cost 1 px of pitch.

### The heights, measured — and the asymmetric claim is zero at every width

`pnpm probe --story market-movers--*`, inside a `Region`:

| state                         | 1440    | 1024    | 768     | 390     |
| ----------------------------- | ------- | ------- | ------- | ------- |
| both ends full (5 and 5)      | **466** | **466** | **466** | **466** |
| **a one-sided day (5 and 2)** | **466** | **466** | **466** | **466** |
| one rankable name (1 and 0)   | 466     | 466     | 466     | 466     |
| nothing rankable (0 and 0)    | 466     | 466     | 466     | 466     |
| every figure identical        | 466     | 466     | 466     | 466     |
| before the first frame        | 466     | 466     | 466     | 466     |
| **a sixth row each way**      | **520** | **520** | **520** | **520** |

**520 confirms the budget's prediction to the pixel.** Element by element:
`head` 16, list 134, gap + second head 41, list 134, claim 32 (+12 margin) — 466. The meta slot measures 98×16 inside its reserved 100 px, so **4.5.7's hold
badge fits the room it already has**. Screenshots looked at, 1440 and 390, in
four states.

### The FLIP hazard is real, and shipping it left every test green

jsdom computes no layout, so the test stubs `offsetTop` to a 27 px pitch and
reads the transform through a `MutationObserver` on the style attribute —
**`oldValue` is the only record of a value written and removed in one commit.**
Padded (3 rows + 2 pads) and unpadded controls both produce
`CCC +54px, AAA −27px, BBB −27px`; no pad travels; nothing is left transformed.
Breaking the arithmetic turns **both** red with an assertion failure, others
still collecting.

**And then the brief's own hazard was shipped deliberately, and did not fire.**
Pads in the list but excluded from the array handed to the FLIP — **all eleven
tests green**, because the pads sit at the **tail** and a real row's index is
unchanged. It went red only when the padding also moved to the **head** (a pad
took two transforms and the real rows none).

**So the padding's position is load-bearing**, which nothing in the brief said
and nothing in the component recorded. `useSettle` now **skips a held row
explicitly** rather than relying on its absent basis — the defect is refused by
construction instead of by where the pads happen to sit.

### Two findings handed on rather than fixed here

**1. The stylesheet's attribution was wrong.** `RankedList`'s 4.5.1 comments say
track 4 is _"unfilled until Task 4.5.3 has a price to put in it"_ — but
`SectorRow` carries no price and **no producer exists until 4.5.4 puts a movers
section on the wire**, so drawing one here would have invented a figure. The
brief never mentioned a price and its budget has no row for one: **the brief was
right and the stylesheet's attribution was not.** The 80 px track is held and
empty and the obligation is written into `TASK-04`.

**2. With both lists empty the region is 466 px of labelled box.** `TOP 5 EACH
WAY`, two headings, and nothing else — **CI's permanent state, and most of a
weekend.** That is `docs/GAPS.md` entry 13 (_a region whose content is
legitimately conditional looks identical to one whose content silently
disappeared_), and **4.5.6's denominator sentence is the only thing in this
story that closes it**, provided the sentence is honest at zero. Whether the
head slot should fall silent there — `SectorPerformanceMeta`'s precedent, where
a count _speaks only in the mixed state_ — is written into `TASK-06` rather than
taken here.

### Gates

```
pnpm verify   41 components, 41 stories files · 0 broken links · 45 invariants
              shared 418 · backend 1010 · frontend 1340 · process 41
              no Unhandled Errors block
pnpm e2e overview-sector-region.spec.ts overview-sector-order.spec.ts   10 passed (9.5s)
```

Those two e2e specs were run because `RankedList` is **shipped on `/`**: `.held`
never matches a sector row, and the specs confirm it. The rest of `pnpm e2e` was
not run — nothing else touches a shipped surface. `pnpm test:database` not run —
no data layer. **No new check was added, so no break is owed.**

The first `verify` exited 1 on `format:check` alone, for a planning file
appended while it was running — a self-inflicted race, formatted and re-run
clean.

## For a stakeholder — a status report, 2026-10-08

**What this was.** Drawing the two ranked lists and every state they can be in,
in the workshop, before any of it meets a live frame.

**What was found.** The hazard the task was written around — that padding a
short list breaks the re-order animation — **was shipped deliberately and every
test stayed green**, because the padding happened to sit at the end of the list
where it does no harm. It only failed when the padding moved to the front. So
the thing that was keeping it correct was an accident of position rather than
anything written down, and the component now refuses the defect outright.

**What was measured.** The region is **466 px in every state**, including the
one-sided day that would otherwise have shrunk it by 81 px and stepped the whole
page below it at two widths. A sixth row each way is 520 — confirming to the
pixel that six does not fit.

**What is handed on.** With no movers at all the region is a labelled empty box,
which is the shape this product has a standing gap entry about; the sentence
that closes it belongs to the next task.
