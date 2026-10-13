# Task 5.1.4 — The States, the Fifth Noun, & One Height

**Status:** Not started
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](STORY.md)
**Depends on:** 5.1.3

## Objective

**A region that draws correctly when everything arrived is a region half
built.** This one has three figures that can each be absent in three ways, two
derived lines that fail independently, a bar, a ladder and a two-clause footer
— and it sits in a grid with two charts whose rows are **never tied**, so an
unreserved absence steps the page.

**And the state every gated run renders is not the state anybody designs
against.** On CI the frame **does** arrive, carrying 516 `unknown` entries — so
_nothing has arrived yet_ and _everything arrived with nothing in it_ are
**different facts that must read differently**, which is the defect `/` already
paid for once (Task 4.3.8).

## What the user can see when this lands

**The region is honest in every state** — before the first frame, with one
reference missing, with the security itself unobserved, on a mixed basis, and on
a store with no bars at all — and **it is one height in all of them**, so
filling it never steps the charts above or the regions below.

## Work

- **The seven states**, each with what it draws and what it says:
  1. socket open, **no frame yet** — the real component held invisibly, one
     `useWaited(2000)` floor, and past the floor **`No comparison yet.`**
  2. **no sector figure** — subject and market draw; the sector figure reads
     its own absence; the sector bracket and sector excess are refused
  3. **sector heard, market unheard** (or the reverse) — one excess drawn, one
     refused, which is **why the headline is two labelled lines**
  4. **the security itself unobserved** — the references draw what they have;
     both excesses refused; **no region sentence**, because the references
     arrived and `No comparison yet.` would be false
  5. **mixed basis** — both figures draw, **only the subtraction is refused**,
     with a micro note that the bases differ
  6. **CI's permanent state** — three named rows each stating its own absence,
     both excesses refused, ladder and scale clause hidden, the kind clause
     visible, and **no region sentence**
  7. **no section at all** (a rolled-back image) — as 1 past the floor
- **The fifth noun is `No comparison yet.`** Four already exist on `/` —
  `No prices yet.` / `No count yet.` / `No sector moves yet.` /
  `No moves to rank yet.` — and the four-noun vocabulary is kept deliberately
  **because four nouns is what tells a reader which region went quiet.**
- **One new word total: `Not comparable`**, and it is **per derived figure**
  rather than per region. A refusal is a **stated word, never a dash alone**,
  because `—` already means _unchanged_ in `PriceChange`.
- **One height in every state**, from the fullest state, held by rendering the
  real component invisibly from a `RESERVED_*` constant —
  `SectorPerformanceReservation`'s idiom. **Never a `min-height`**, which is a
  second home for four numbers nothing below `pnpm e2e` can check.
  - **Two boxes, not one**: the held geometry keeps its own unconditional
    `hidden` + `aria-hidden`, and the sentence is a **sibling** in the room.
    That is Task 4.4.6's ten-day defect, where `visibility` was inherited back
    by eleven rows and leaked internal sector slugs into the accessibility tree.
  - The reserved constant carries **non-breaking spaces, never slugs or em
    dashes** — a fully-formed placeholder is what invites a reader to read a
    value that is not there.
- **The `useWaited` trap that is this region's exact shape.** Task 4.3.8: a
  frame that arrives **carrying figures but no section** leaves `waiting ===
false`, so the floor never fires and the panel sits silent for ever. That is
  state 7. Either the section is required on the producer or state 7 owes a
  written sentence — and it owes one.
- **Two reversal triggers to evaluate in writing**, because an unevaluated
  trigger and one that did not fire read identically:
  - **`MARKET-OVERVIEW.md` §1.3** — _two regions where one's figure is read
    against the other's_. The verdict is that it **cannot fire on this route**,
    and the reason is not that no region is read against another: this route
    **never reorders**. It places by span in source order with
    `grid-auto-flow: row` and declares no `grid-template-areas` at any
    breakpoint, so DOM order, heading order and visual row-major order agree at
    all four widths **by construction**. The probe is a confirmation, not an
    investigation.
  - **`MARKET-OVERVIEW.md` §1.4** — _the first reserved region whose filling
    would move a figure or a sentence a reader is reading, rather than another
    reserved panel_. **This is likely to fire here.** On `/` everything that
    moved was hatch or the source note; this region sits in a grid with two
    charts and an identity block. The task owes a **measured before/after at
    all four widths**, and if a figure or a sentence moves, **it is the owner's
    decision rather than a measurement to record.**

## Done when

1. All seven states render, each with its own drawn text, and **state 6 does
   not read as state 1** — asserted by string rather than by eye.
2. The region is **one height in every state at every width**, measured with
   `pnpm probe /securities/NVDA --all` and the figure recorded; no
   `min-height` anywhere.
3. The reserved geometry carries `hidden` + `aria-hidden` **unconditionally and
   on its own element**, with the sentence as a sibling — and the accessibility
   tree contains **no slug and no placeholder value** in any state.
4. State 7 has a written sentence, and the `useWaited` path is exercised by a
   test that produces a frame with figures and no section.
5. Both reversal triggers are **evaluated in writing** with their verdicts, and
   §1.4's before/after measurement is recorded at all four widths. If anything a
   reader reads moved, it is escalated rather than recorded.
6. `pnpm verify` green; `pnpm e2e` green; the probe screenshots looked at, at
   all four widths.

## Amended by Task 5.1.3 — 2026-10-13: eight sentences shipped unapproved, and this task owns whether they are the right words

Task 5.1.3 had to put words on screen for every absence it drew, and only one of
them — `No comparison yet.` — comes from the canvas or `VISUAL-LANGUAGE.md`. The
other eight were chosen by the implementer, are shipped, and are **copy
decisions the owner has not seen**:

| State                                 | Shipped string                                 |
| ------------------------------------- | ---------------------------------------------- |
| Nothing observed anywhere             | `No comparison yet.` (the one that is decided) |
| A reference we hold nothing for       | `Not heard from`                               |
| A price with nothing to measure from  | `No close to measure from`                     |
| The subject has a figure and no move  | `No move for this security yet`                |
| A reference has a figure and no move  | `No move for the reference yet`                |
| Two bases that do not subtract        | `Measured from different closes`               |
| An `index_etf`, which has no sector   | `A broad-market fund has no sector`            |
| A `sector_etf`, comparing with itself | `This security is its sector’s benchmark`      |
| A difference of exactly zero          | `level` (rather than `ahead by 0.00 pts`)      |

They are in `apps/frontend/src/market/relative-performance.ts` as named
constants, so changing one is a one-line edit with the component tests following.
**Three things to weigh rather than re-type**: `Measured from different closes`
is the longest string in the region and the two-line reserve on the derived cells
is sized for it, so a longer replacement re-flows every band under it; `level` is
the only one that is a word where every sibling is a sentence; and none of them
may grow into a second connection word, which `pnpm invariants` refuses by name.

---

## What was done — 2026-10-13

<!-- written at completion -->
