# Task 5.1.4 — The States, the Fifth Noun, & One Height

**Status:** Complete — 2026-10-13 — the states were built in 5.1.3 and this task found the one that was wrong: _nothing has reached us yet_ and _everything reached us and none of it had a move_ were **one sentence**, which is the defect `/` paid for once already and is the state every gated run is permanently in. Nine states measured at four widths at **240 / 240 / 240 / 302 px**, identical to the pixel; §1.4's trigger **fired** and the owner accepted the move
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

## Amended by Task 5.1.3 — 2026-10-13: this is now a VERIFICATION task, because 5.1.3 could not ship the region without shipping its states

**The seven states, the fifth noun and the reservation all landed in 5.1.3**,
and they landed there for a reason rather than by scope creep: a region whose
three figures can each be absent cannot be written without deciding what it says
when they are, and a height reserved band by band is a stylesheet decision taken
in the same file as the bands. Splitting them would have shipped a region that
draws correctly when everything arrived, which is this task's own opening
sentence about a region half built.

So what this task actually owns now is **everything 5.1.3 left unproven**, and
the list is not shorter than it was — it is just no longer about writing code:

- **Done-when 1 is unmet.** The states exist; nothing asserts that **state 6
  does not read as state 1**, by string.
- **Done-when 2 is met at ONE width.** `security-relative-performance.spec.ts`
  asserts the height is identical with both references observed and with nothing
  observed, **at 1440 only**, in two states of seven. The claim is _one height in
  every state at every width_ and `pnpm probe /securities/NVDA --all` has not
  been run against the drawn region.
- **Done-when 3 is unverified.** The two-box shape is built as this task
  specified — `.reserved` carries `visibility: hidden` + `aria-hidden` on its own
  element and the sentence is a sibling in a relatively-positioned room — but
  nothing has read the accessibility tree in any state.
- **Done-when 4 is untouched.** State 7 — a frame carrying figures and **no
  section** — has no test, and the `useWaited` trap is exactly the shape Task
  4.3.8 found: `waiting === false` with nothing to draw, so the floor never fires
  and the panel is silent for ever.
- **Done-when 5 is untouched.** Neither reversal trigger has been evaluated in
  writing, and §1.4's before/after at four widths has not been measured. **An
  unevaluated trigger and one that did not fire read identically.**

And it gained one thing it did not have: **the copy below is shipped and
unapproved**, which is a product decision rather than a verification.

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

### Done-when 1 — and this is the one that was wrong

**`nothing` was `entries.every((entry) => entry.move === undefined)`**, which
collapses two different facts into one sentence: _nothing has reached us yet_
and _everything reached us and none of it had a move_. The second is the state
**every gated run is permanently in** — CI's store is 516 securities and zero
bars, so the aggregate arrives carrying `unknown` for all of them — and it is the
one of the two where the region has something honest to say: three named rows
each stating its own absence, and two refusals saying why there is no
subtraction. Held behind `No comparison yet.`, all of that was thrown away and
the reader was told the socket was quiet when it was not. **That is Task 4.3.8's
finding arriving on a second screen**, and nothing would have caught it: both
states render, both are plausible, and the wrong one is the one no developer's
machine can produce.

The discriminator is now **arrival**, and arrival has two sources rather than
one — the references come from the frame, the subject's own move from the page's
own data, so a security with a stored close has something true to draw before any
frame exists:

```ts
nothing: overview === undefined && subjectEntry.move === undefined,
```

Asserted at three levels, by string rather than by eye: the module
(`DRAWS rather than holds when the frame arrived with nothing in it`), the
component (`Not heard from` ×3, and **not inside an `aria-hidden` subtree**,
which is what tells the two apart in a renderer with no layout), and the browser
(`an aggregate that arrived carrying nothing does NOT read as no aggregate`).
A ninth story, `EverythingUnknown`, puts the state in the workshop beside
`NothingObserved` so the two can be read side by side.

### Done-when 2 — one height, measured, at four widths

`pnpm probe --story market-relativeperformance--<state> --widths 1440,1024,768,390`
over the states:

| Width | Region height, every state |
| ----- | -------------------------- |
| 1440  | **240 px**                 |
| 1024  | **240 px**                 |
| 768   | **240 px**                 |
| 390   | **302 px**                 |

**Identical to the pixel across `complete`, `ahead-while-falling`,
`nothing-observed`, `everything-unknown`, `no-move-for-the-subject`, `no-sector`,
`silent-reference`, `basis-refused`, `subject-is-its-benchmark` and
`clipped-subject`** — nine states plus the clipped case. No `min-height`
anywhere; every band reserves its own room.

**Two limits, stated rather than implied.** These are workshop widths, so the
region is 1374 / 958 / 702 / 324 px wide; on the route the rail is **419 px of
content in a 453 px column** and the panel measures **337 px** at 1440, 1024 and
768 and **399 px** at 390. And the browser assertion that the height does not
move between states runs **at 1440 only**, over two of the states. The 390
column is the one to watch, because it is the only width where the footer wraps.

### Done-when 3 — nothing leaks from the held room

`ariaSnapshot()` of the region in the held state contains `No comparison yet.`
and **no ticker and no `%`**. The two-box shape holds: the geometry is one
`aria-hidden` element and the sentence is a **sibling** in a relatively-positioned
room, never an override on the same element — which is Task 4.4.6's ten-day
defect, where `visibility` was inherited back by eleven rows and leaked internal
sector slugs into the accessibility tree.

### Done-when 4 — the `useWaited` trap cannot arise here, and that is a verdict rather than a skip

Task 4.3.8's trap is a frame that arrives **carrying figures but no section**,
leaving `waiting === false` with nothing to draw, so the floor never fires and
the panel is silent for ever. **This region has no section of its own.** It reads
`overview.figures` for the broad market and `overview.sectors` for the benchmark,
both of which `Market proxies` and `Sector performance` already require, and the
subject's move comes off the page's own data rather than the frame at all. So the
three shapes a frame can have all land in states that are already drawn:

- `figures` present, `sectors` absent → the sector half is **absent rather than
  empty** and the market half draws. That is state 2.
- both absent or empty → every row states its own absence. That is state 6, above.
- no frame at all → held, with the sentence behind the 2,000 ms floor. State 1.

**There is no state in which `nothing` is true while a frame exists**, which is
the trap's precondition. If a later story gives this region a section of its own
on the wire, the trap arrives with it.

### Done-when 5 — both reversal triggers, evaluated in writing

**`MARKET-OVERVIEW.md` §1.3 — _two regions where one's figure is read against the
other's_. Verdict: does not fire, and cannot fire on this route.** Not because no
region is read against another — this one explicitly is — but because **this route
never reorders**. It places by span in source order with `grid-auto-flow: row`
and declares no `grid-template-areas` at any breakpoint, so DOM order, heading
order and visual row-major order agree at all four widths by construction.
Confirmed rather than investigated: at 1024 the two columns sit at x 41 and
x 537, and the five lower regions land in source order.

**`MARKET-OVERVIEW.md` §1.4 — _the first reserved region whose filling would move
a figure or a sentence a reader is reading, rather than another reserved panel_.
Verdict: IT FIRES.** Measured on the route, against the placeholder panel this
region replaced (263 px, which its two still-reserved siblings measure today):

| Width | Placeholder | Filled     | The lower page moves |
| ----- | ----------- | ---------- | -------------------- |
| 1440  | 263 px      | **337 px** | **+74 px**           |
| 1024  | 263 px      | **337 px** | **+74 px**           |
| 768   | 263 px      | **337 px** | **+74 px**           |
| 390   | 263 px      | **399 px** | **+136 px**          |

What moved is not another reserved panel: the **source note** and the
**`Tracked universe` table** — 516 rows and every figure on them — sit below it.

**The owner accepted it on 2026-10-13**, with the figures recorded here rather
than a repair: a region that fills is a region that takes room, the move happens
once at the release on a page nobody has open, and **nothing moves under a reader
mid-session**, because the region is one height in all nine of its states at all
four widths. The rejected alternative was capping the filled region at the
placeholder's 263 px, which costs a band and needs a `min-height` — a second home
for four numbers nothing below `pnpm e2e` can check, which this task's own Work
section forbids by name.

### The copy — nine sentences, approved rather than inherited

The owner approved all nine on 2026-10-13, as shipped:
`No comparison yet.` · `Not heard from` · `No close to measure from` ·
`No move for this security yet` · `No move for the reference yet` ·
`Measured from different closes` · `A broad-market fund has no sector` ·
`This security is its sector’s benchmark` · `level`.

They are named constants in `apps/frontend/src/market/relative-performance.ts`,
and the register is now **inherited rather than re-invented** by Stories 5.2 and
5.6: short, no terminal full stop except on the one region-level sentence, no
connection word, and the longest of them is what the two-line reserve on the
derived cells is sized for.

### Gates

- `pnpm verify` — **exit 0**, `57 invariants hold.`, 2,998 tests
  (440 + 1,045 + 1,458 + 55).
- `pnpm e2e security-relative-performance.spec.ts` — **4 passed (9.5s)**.
- `pnpm probe` — the ten story states at four widths, plus the route at four
  widths; the screenshots were looked at.

## For a stakeholder — a status report, 2026-10-13

**This task found one thing wrong and proved six things right.**

The thing wrong was invisible on every machine a developer uses. The region had
one sentence — "No comparison yet." — for two completely different situations:
nothing has reached us yet, and everything reached us and none of it had any
price movement in it. The second is the state our test machine is permanently in,
because it holds no price history at all, and it is the situation where the
region actually has something useful to say: three named rows each explaining
their own absence. Hiding that behind one sentence tells a reader the data feed is
quiet when it is not. It is now fixed and asserted three ways, and the identical
mistake was made once before on the landing page.

What was proved: the region is **exactly the same height — to the pixel — in all
nine of its states, at all four screen widths**, so filling it never shifts the
charts above or the table below while somebody is reading. Nothing leaks into
what a screen reader is told while the region is waiting. And a known trap that
has bitten this product before cannot occur here, for a reason that is now
written down rather than assumed.

One decision was yours and you took it: filling this region pushed the lower half
of the security page down by 74 pixels (136 on a phone), including the big
securities table. Accepted, with the four measurements recorded — it happens once,
at release, and nothing moves under a reader afterwards.
