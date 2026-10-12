# Task 4.7.8 — `AppHeader`'s `composes` defect, and the 201 px the 390 argument rests on

**Status:** **Complete — 2026-10-11.** (A duplicate `In progress` status line was removed 2026-10-12 by Task 4.7.11's sweep.)
**Story:** [4.7 The Overview's Degraded Set, & the 390 Question Answered](STORY.md)
**Depends on:** 4.7.2

## Objective

**This story owns the defect because of what it corrupted**, and what it
corrupted is this story's own subject.

## What the user can see when this lands

**A chrome descriptor at the size its stylesheet says**, and at 390 a
measurement that is of the product rather than of a defect.

## Work

### The defect

`AppHeader.module.css`'s `.descriptor` composes `microLabel` and then declares
`font-size: 9px; line-height: 1` — and **loses**, because `composes`
concatenates class names rather than cascading and `type.module.css` lands
later. Verified in the built bundle: it renders at **11px/16px** against
`--font-size-micro: 11px` and `--line-height-micro: 16px`.

**Nothing in this product asserts a font size**, so no test and no screenshot
of the existing states can see it.

### Why it is this story's

That element is the one `AppHeader.module.css`'s own comment calls **"the
longest string in the chrome — 201 px at 1440"**, in the argument that decided
**what wraps at 390** — which is this story's subject. **The repair shrinks it
to roughly 165 px, so the figure and the wrap argument cannot both be carried
forward.**

### The blast radius, which is the widest in the story

**It is not a font-size change, it is a chrome-height change.** `AppHeader`
measures itself and publishes `--sticky-chrome-height`; `base.css`'s
`scroll-padding-top` reads it. So shrinking 11px/16px to 9px/1 moves the
published height, hence the scroll padding, hence **every sticky-edge
measurement in the repository**: `overview-focus-ring.spec.ts` at four widths
in both directions (Story 4.6's +1.20 px clearance), the 0.09–0.14 px
reverse-Tab entry, `search-keyboard.spec.ts`'s 768 stops,
`universe-navigation.spec.ts`'s `stickyChromeClearance()`, and the 94/73 at 390
that the wrap argument rests on.

**Order matters: this must not run AFTER Task 4.7.2's photographs**, or the
photographs are of the defect. If 4.7.2 has already run, its 390 column is
re-taken here.

## Done when

1. `.descriptor` renders at the size its own rule declares, by spelling the
   properties rather than composing them where a value must differ
2. The **201 px re-measured**, and every live site carrying it corrected — with
   the wrap argument re-stated against the new figure or explicitly left
   standing as a dated record
3. Every sticky-edge figure the change moves is re-taken, named, and the ones
   that did not move said to have not moved
4. `pnpm verify` and `pnpm e2e` green, including the focus-ring walk at four
   widths in both directions

---

## Handed here by Task 4.7.9 — 2026-10-12: 104 photographs were taken against the defect, and your own hand-off never reached its sibling

Written here rather than linked.

**1. Your hand-off section is MISSING from Task 4.7.9's file.** That task's
brief asserts it carries one from 4.7.1, 4.7.2, 4.7.3, 4.7.4, 4.7.5, 4.7.6
**and 4.7.8**. It does not: the file has six sections and none of them is
yours. The figures (`.descriptor` 200.59 → 164.13 px; every sticky figure
unmoved, 94/73 at 390 re-taken and identical) reached 4.7.9 through the
**prompt** rather than through the file, so a later reader of that file does
not have them. This is `CLAUDE.md`'s _a hand-off sweeps SIDEWAYS, and a story
close does not reach it_ arriving from the other end — the constraint was
measured, it was written somewhere, and the somewhere was not the sibling's own
file. Write it in when this task closes.

**2. Your `Work` section's ordering clause now names a second thing.** It says
_this must not run AFTER Task 4.7.2's photographs, or the photographs are of
the defect_. There is a second set: **104 photographs at
`.capture/overview-degraded-grid/`**, thirteen states × four widths × colour
and greyscale, produced on 2026-10-12 on a branch off `main` that does **not**
carry your repair. Their masthead descriptor is the pre-repair 11px/16px.

**3. What that does and does not cost.** The grid's **strings** are unaffected
and need no re-take: the masthead is recorded per row and **excluded from both
comparison keys** (its clock mutates every second and its session word is the
wall clock's), and the descriptor is absent at 390 entirely. Only the
**pictures'** chrome is of the defect, and re-taking them is one command:

```
DEGRADED_GRID_PHOTOS=1 pnpm e2e overview-degraded-grid.spec.ts
```

~1.4 minutes, 104 PNGs and four `readings-<width>.json`, into a gitignored
directory. The producer is a **kept spec** rather than a throwaway, which is
the whole reason this is a command rather than a reconstruction.

**4. One figure you may want, measured here.** The sticky **footer**'s own box
is the one quantity on this screen that changes with the state, and nothing in
this task touches it — but if your sweep re-takes Task 4.7.2's five footer
heights, note that the state set is now thirteen rather than seven and the
spec above produces all of them.

## What was done — 2026-10-11

### 1. `.descriptor` renders at the size its own rule declares

The `composes` is gone and the four type declarations are spelled. Read from
the running page in Chromium at four widths, before and after:

|                  | before      | after                               |
| ---------------- | ----------- | ----------------------------------- |
| `font-size`      | `11px`      | **`9px`**                           |
| `line-height`    | `16px`      | **`9px`**                           |
| `letter-spacing` | `0.88px`    | `0.72px` (`0.08em` of a smaller em) |
| `text-transform` | `uppercase` | `uppercase`                         |

The composed rendering was `--font-size-micro` / `--line-height-micro`, which
is exactly the defect: 11px/16px against a rule saying 9px/1. Proven from the
built bundle before the repair, the two rules at equal specificity:

```text
dist/assets/index-DpS_nTo-.css
  offset  4759  ._descriptor_1rxvm_91{color:var(--ink-secondary);margin:0;font-size:9px;line-height:1}
  offset 54259  ._microLabel_1yxhk_57{font-size:var(--font-size-micro);line-height:var(--line-height-micro);letter-spacing:var(--letter-spacing-micro);text-transform:uppercase}
```

**The micro-label _intent_ was kept and only the size changed**, so the
uppercase and the micro tracking are stated in the rule rather than inherited
from it. The drawn string is therefore unchanged —
`MARKET SITUATIONAL AWARENESS` — which is what makes 4.7.2's recorded masthead
rows still correct.

### 2. The 201 px re-measured, and the wrap argument re-stated

| at 1440 / 1024 / 768 | before        | after         |
| -------------------- | ------------- | ------------- |
| `.descriptor`        | **200.59 px** | **164.13 px** |
| `.wordmarks`         | 200.59 × 34   | 164.13 × 27   |
| `.identity`          | **234.59 px** | **198.13 px** |

So the comment's `201` and `235` were **36.5 px wide**, and `AppHeader
.module.css` now carries both the dated original and the re-measure.

**The wrap argument survives, and it was re-measured rather than re-argued.**
The breakpoint was temporarily disabled and the un-wrapped row measured at 390
with the descriptor at its true size: `.identity` 198.13 and `.clockCell` 128,
both `flex-shrink: 0`, against a 342 px content box — **over-subscribed by
24 px before `.nav` gets a pixel**, and `.nav` measured **0 px wide, 0 px of
the first tab visible** (the first tab is 125.06 px). The correct figure makes
the case **stronger** than the one it was argued from: un-wrapped today the
navigation would not read `Market O`, it would not be there at all. The media
query was restored and diffed clean.

### 3. Every sticky-edge figure, re-taken — and NONE of them moved

**The blast radius this task was written against does not exist, and that is
the finding.** The brief, `EPIC.md` and the orchestrator's instruction all
state that shrinking 11px/16px to 9px/1 moves `--sticky-chrome-height` and with
it every sticky-edge measurement in the repository. It does not, for two
structural reasons that happen to cover the whole width range:

- **Above 560 px the masthead is a fixed `height: var(--app-header-height)`**,
  and the identity block's content is 27 px inside a 56 px box either way.
- **At or below 560 px `.descriptor` is `display: none`**, and was before.

Measured at four widths before and after, all identical:

|                          | 1440 | 1024 | 768  | 390      |
| ------------------------ | ---- | ---- | ---- | -------- |
| `<header>` box           | 57   | 57   | 57   | **94**   |
| `--sticky-chrome-height` | 57px | 57px | 57px | **94px** |
| `<footer>` box           | 33   | 33   | 53   | **73**   |
| `--sticky-footer-height` | 33px | 33px | 53px | **73px** |
| `scroll-padding-top`     | 62px | 62px | 62px | **99px** |
| `scroll-padding-bottom`  | 38px | 38px | 58px | **78px** |

So, named rather than implied: **Story 4.6's +1.20 px focus-ring clearance,
the 0.09–0.14 px reverse-Tab entry, `search-keyboard.spec.ts`'s 768 stops,
`universe-navigation.spec.ts`'s `stickyChromeClearance()` and the 94/73 at 390
the wrap argument rests on are UNMOVED.** None was re-stated because none
changed; the 94 and the 73 were re-taken and are the same numbers.

**One figure did move and it is not a sticky one.** `.nav`'s client width at
1024 goes **534 → 539** against a 539 scroll width, so the primary navigation
**stops scrolling at 1024** — the 5 px it was short was the descriptor's
inflation. At 768 it goes 278 → 314 and still scrolls, as designed.

### 4. The check, and the two more defects it found on the way in

`pnpm invariants` gained **`a-compose-never-carries-an-override`**: every
`.module.css` under `apps/frontend/src`, each `composes:` target resolved
transitively, red when a composing rule re-declares a property its target
declares. One overlap is allowed — a class composed from **earlier in the same
file**, where the order is readable and the composing rule does win
(`MarketProxyStrip.sentence`, measured against its own file). Cross-file is
never allowed, because the order is the import graph.

**The first draft was green on the defect it was written for**, which is this
story's fifth. Its brace matcher handed back the preceding block comment as
part of the selector, so `.microLabel` never matched, every composed class
resolved to the empty set, and the check reported **`total clashes: 0`** against
the shipped `.descriptor`. Comments are stripped first now, and the comment in
the check says so.

**Then the forward test `CLAUDE.md` asks for** — the defect the _next_ story
writes, in a file this check had never seen:

```text
# Badge.module.css + .nextStorysLabel { composes: microLabel …; font-size: 10px; }
  ✗ a-compose-never-carries-an-override
      apps/frontend/src/components/Badge/Badge.module.css  .nextStorysLabel composes microLabel and re-declares font-size

# and the legitimate shape, same file, composed from above
54 invariants hold.
```

**It found two more live instances**, both on this story's own screen and both
the same shape as the descriptor. `BreadthLedger.tick` and
`RankedList.ladderTick` each compose `dataCell` from `type.module.css` and then
ask for `--letter-spacing-micro` under it. Measured in the browser: both have
always rendered at **−0.11 px** (`--letter-spacing-tight`, from `dataCell`)
against the **0.88 px** their own rules ask for.

**They are repaired the other way round from the descriptor — the declaration
is deleted rather than honoured — and that is a decision taken by looking.**
The first attempt spelled the data face and kept the micro tracking, which is
what the rule asked for; it was photographed at 1440 beside the shipped version
and the sector ladder then reads **`- 2%`**, the sign tracked away from the
digit it signs. These are figures in the data face, which is the exact case
`dataCell`'s own comment argues the tracking back for, so the **shipped
appearance was right and the line was the mistake**. Deleting it leaves the two
regions pixel-identical — `0` is **6.50 px** and `−2%` **19.48 px** before and
after — and leaves the check green, because there is no longer an overlap.
`CLAUDE.md`'s rule applies in both directions: the cure for a declaration that
cannot win is to spell it **or** to stop writing it.

### 5. The break

`a-compose-carries-an-override` in `scripts/breaks.mjs`, which restores the
compose-plus-override shape on `.descriptor`. **`pnpm break` refuses a dirty
target and this task must not commit**, so the registry's own `find`/`replace`
was applied programmatically out of `breaks.mjs` and reverted from a checksum
copy:

```text
occurrences of find: 1
substitution applied

  ✗ a-compose-never-carries-an-override
      apps/frontend/src/components/AppHeader/AppHeader.module.css  .descriptor composes microLabel and re-declares font-size, line-height
  2 of 54 invariants failed.

# restored
54 invariants hold.
```

An assertion failure with the other 52 checks still running, rather than a
parse error — and `every-break-can-still-land` went red alongside it while the
break was applied, which is that check working.

### 6. The 390 column, re-taken

Appended to `TASK-02`. The masthead at 390 is byte-identical to the row
recorded on 2026-10-10 apart from the wall clock, because the descriptor does
not render there; the 94 px masthead, the 73 px bar and both scroll paddings
were re-measured and are unchanged.

### What falsifies a governing document

1. **This task's own brief, `STORY.md`'s paragraph adding it, and `EPIC.md`'s
   reassessment line all assert a blast radius that is not there.** _"It is not
   a font-size change, it is a chrome-height change"_ is false: no chrome
   height, scroll padding or sticky figure moves at any width. The claim was
   never measured — it is an inference from _`AppHeader` publishes its own
   height_, which is true, and _the descriptor is inside it_, which is also
   true, past a fixed `height` and a `display: none` that make it unreachable
   from either side. Corrected here rather than in the historical records.
2. **`CLAUDE.md`'s `composes:` entry now has a mechanism and does not name
   it.** The entry says the cure is to spell the properties; as of this change
   `pnpm invariants` refuses the shape by name, with a break. **Not edited
   here** — an agent's instruction is not authority over `CLAUDE.md` — and
   handed to Task 4.7.11's sweep.
3. **`docs/GAPS.md`'s entry is discharged**, in place, with the evidence kept
   beneath it and the two further instances recorded.
