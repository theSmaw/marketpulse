# Task 4.6.7 — The journey, the grid, the sweeps and the close

**Status:** **Complete — 2026-10-09.** Three journey tests, the gated one non-vacuous on a bare store and proved so by two substitution controls; the grid is 9 states × 5 widths with **0** href-≠-handler rows and **0** identical greyscale pairs; the sideways sweep's second pass found **3** missing hand-offs the grep could not see. Two findings are the owner's at Gate 2, and one of them falsifies Task 4.6.1's own note in `tokens.css`.
**Story:** [4.6 Selection From the Overview](STORY.md)
**Depends on:** 4.6.6

## Objective

**The epic's exit criterion in a single interaction, verified — and what the
verification cannot say.**

## What the user can see when this lands

**Nothing.** The story is finished.

## Work

### The journey spec, and its data problem has two ends

AC 5 as written — _land on `/`, reach a mover, open it, read a figure_ —
**cannot pass on CI at either end**: `eligible: 0` so there is no mover, and
zero bars so there is no figure. **This is the exact six-minute round trip
`CLAUDE.md` records at `#314`.**

**Three tests, and one anti-fixture rule.**

**Test 1 — gated, furnished origin, structural destination.** Drive the
overview frame through the **shipped encoder**, satisfying `readMovers`' six
cross-field checks, with **real curated tickers** so the destination is a page
the product has. Activate one row by pointer and a second by keyboard. Assert
the URL and that the destination's identity block **names that symbol** —
identity, not a figure.

**Test 2 — the figure half, skipped loudly.** `test.skip()` **with its reason
printed by name** when the store has no bars, which is
`overview-movers-ranking.spec.ts`' shipped idiom.

**Test 3 — deployed, structural.** `specs-deployed/`: land, activate, assert
the identity block. No figure, per that suite's rule. **And note
`docs/GAPS.md:464`** — `e2e/specs/` and `e2e/specs-deployed/` are two
directories and a grep over one finds neither the other's copy nor the fact
that there is one. **Grep over `e2e/`, never `e2e/specs/`.**

**The anti-fixture rule, which is what makes test 1 worth more than its
fixture:** read the ticker **out of the row the test is about to activate** and
assert the URL contains _that_ string — never the constant the test sent. And
**activate the third row**, asserting the URL is not the first row's symbol:
**a handler that always opens row 0 passes a first-row test**, which is the
position-resolved defect arriving by the front door.

### The grid — the axis is activation, and the two speakers are the href and the handler

Walk the **producers**: every row and figure the page can draw, printing per
row — figure state, is-it-a-link, `href`, computed accessible name, tab-stop
count, `cursor`. **The grid is wrong if any state shows href ≠ handler, or a
non-link with a link's affordance.**

Cover: figure state × activatable over four surfaces (**on CI only `unknown`
occurs, for ever**, so the grid is the only place the other three are seen);
resting / hover / `:focus-visible` / active / held / reduced motion; the
population edges — an uncurated symbol, a pending name, the `Not ranked` group,
the six reserved regions; **four widths plus a deliberately short viewport**;
**both tab directions at every width with the ring box read**; and greyscale,
with the pass's own criterion — **no two states read identically at any
width**.

### The sweeps

**Upward**: `PRODUCT_SPEC.md` §8.1 and §9 — the overview becomes a place you
leave from, which is §8.1's own description finally true.

**Sideways**: the grep **and** the second pass over the epic's own story list.
**That second pass found what the grep could not in both of the last two
stories** — 4.5's missed Stories 4.7 and 4.9 entirely. Record the miss count.

**`docs/GAPS.md`** gains at least: no gated machine has ever clicked a mover;
the sector region renders **no `<ol>` when nothing is ranked**, so every
list-keyboard assertion in it is vacuous on the gate; AC 5's last clause is
unreachable on any gate; the pointer's **moment of entry** is unguarded, with
the measured rates; and **a ninth screen-reader entry** — whether a
client-side route change with an unchanged `document.title` is announced at
all. **That ninth is the inverse of the other eight**: they are unprompted
updates, and this is a change the reader explicitly asked for, which is the one
case where announcing is unambiguously right.

### The close

`STORY.md`; `CLAUDE.md`'s _Current state_; `LIVE-REHEARSAL.md` if the story
needs a person; Gate 2.

## Done when

1. Three journey tests exist, the gated one non-vacuous on CI, with the
   anti-fixture rule applied and the third row activated
2. The grid is produced with the producer walk run and its findings recorded
3. The sideways sweep's miss count is recorded, **including the second pass**
4. `PRODUCT_SPEC.md` carries its dated amendment and the GAPS entries are
   written

## Amended by Task 4.6.5 — 2026-10-09: the hold releases and re-takes on every internal focus move, and the un-pinnable window cannot be reached by a reader's hands

Produced in a browser while taking done-when 4, and **not repaired there**,
because the repair changes hold behaviour Story 4.5.7 settled with
measurements. Carry both into this task's journey pass and raise the second
with the owner at Gate 2 if it still stands.

**`Region` listens for `focusin`/`focusout` on its own box and both bubble.**
So moving focus from the region's section onto a row fires `report(false)` and
then `report(true)`. Two consequences:

1. **Every arrow press inside a ranked region releases the pin and takes it
   again**, which refreshes the pinned order to the last frame drawn. The
   reader's list can therefore re-order under an arrow press, which is the one
   thing the hold exists to prevent.
2. `useOrderHold`'s rule _"the first of the two sources to fire owns the
   pin"_ **does not hold for a move WITHIN the region** — that releases first.

And the un-pinnable state `use-order-hold.ts` documents (_a reader arriving
before the first frame_) **closes the moment focus moves inside the region**,
with `latest.current` populated by then. So a keyboard reader can reach the
**section** while un-pinnable and never a **row**. Task 4.6.5 reached it by
`Tab` and asserted the symbol-keyed stop agrees with where focus went; what it
could not do is reach a row in that window, because entering one ends it.

**A third thing found in passing, and it reads exactly like the recovery not
firing**: `RankedList` draws **no `<ol>` at all** when nothing is ranked, so at
the instant the last real row leaves, the list element is already detached and
`closest("section")` reaches nothing. The `<section>` is therefore captured at
**focus** time rather than at recovery time.

## What was done — 2026-10-09

### The three journey tests, and the anti-fixture rule is what makes test 1 worth its fixture

`e2e/specs/overview-journey.spec.ts` drives a furnished overview frame through
the **shipped encoder** with real curated tickers, activates the **third**
gainer by pointer and the **third** loser by keyboard
(`section → Tab → Tab → ArrowDown ×2 → Enter`, the focused ticker asserted at
each step), and reads both tickers **off the rendered rows** — `a[data-ticker]`,
`nth(2)` and `nth(0)` — never from the frame's literals.

**Proved non-vacuous on CI's store shape**, not argued: `pnpm store:bare`
(`marketpulse_bare: 518 securities, 0 bars.`) then a second pair on alternate
ports against it, leaving the developer's own store untouched:

    ✓ 1 … overview-journey.spec.ts:329:1 › the journey: land on `/`, open the
        THIRD mover row by pointer and another by keyboard … (1.9s)
    - 2 … the figure half of AC 5, which no gated machine can run
    1 skipped
    1 passed (3.9s)

**And two substitution controls on that same bare pair**, each an assertion
failure naming the real defect:

    # nth(2) -> nth(0): a handler that always opens row 0
      - unexpected value "http://localhost:5273/securities/SMCI"
    # ArrowDown ×2 -> ×1: the keyboard leg's third row
      Expected: "KO"   Received: "PFE"

Test 2 **skips with its reason printed**, which `--reporter=json` quotes:

    STATUS skipped
    ANNOTATION {'type': 'skip', 'description': "this store holds no bars for
      NVDA, so the security page has no figure to read — AC 5's last clause is
      unreachable on any gate, and on CI (518 securities, zero bars) it is
      unreachable for ever"}

And a control that the skip is about the **store** rather than a broken
locator: `/securities/NVDA` gives `Open labels: 0`, and
`?sessions=21` gives `1`, reaching `1M OPEN | 220.53 | 1M HIGH | 222.00`.

Test 3 is `e2e/specs-deployed/overview-journey.spec.ts` — structural, per that
suite's rule. **It is UNRUN**: no deployed addresses were available here.

### A defect in the spec idiom itself, and it is latent in a shipped spec

`getByRole("heading", { level: 2, name: "T" })` on `/securities/T` resolved to
**six** of the page's nine `<h2>`s — Playwright's `name` is a case-insensitive
**substring** match, so `Abnormal-move indicators`, `Relative performance` and
`Tracked universe` all matched. `exact: true` is now in both new specs, and `T`
was deliberately kept as the third loser so the clause is load-bearing:

    Error: strict mode violation: getByRole('heading', { name: 'T', level: 2 })
      resolved to 6 elements

`e2e/specs-deployed/security-explorer-journey.spec.ts` has the same latent
shape (`name: "NVDA"`), safe today only because no other `<h2>` contains it.
**Left alone** — it is Task 2.14.9's and currently green.

### The grid: the axis is activation, and both failure criteria are clean

Nine producer states — first paint; refused sections; `observed`; `stored`;
`unknown` everywhere; both mover lists empty; a one-sided market with three
pads; an **uncurated** symbol; names **pending** — × five widths including a
deliberately **short** 1440×680. One row verbatim, furnished at 1440×900:

    surface                          idx fig/drawn                        link href              name  tabidx cursor(row) cursor(tgt) decor
    Movers / Gainers                 2   3NVDANVIDIA Corporation128.00▲up A    /securities/NVDA  NVDA  -1     auto        pointer     none
    Sector performance / Not ranked  0   —UtilitiesXLUNone stored          A    /securities/XLU   XLU   0      auto        pointer     none
    Movers / Losers                  2   3                                -    —                 —     —      auto        —           —  [aria-hidden] [visibility:hidden]
    => 26 rows, 22 destinations, 0 with href ≠ drawn ticker

- **href ≠ handler: 0.** All **25** destinations on the furnished page were
  **activated for real** and the landed path compared to the `href` — 25/25
  agree. Across all nine states, 0 rows where
  `href ≠ /securities/<drawn ticker>`.
- **A non-link with a link's affordance: 0.** `examined=310–407` elements,
  `hovered=24` targets, 5 widths × 3 states, resting and hovered: **0
  offenders** in all fifteen combinations.
- `unknown` is still a destination (`SPYNone stored` → `/securities/SPY`); the
  reserved rows and the held pads carry **no `<a>` at all**; the **uncurated**
  `ZZZZ` is linked and named `ZZZZ`; with names **pending** the accessible name
  is still the bare ticker.

Interaction states, one sample per surface at 1440×900:

    proxy SPY    rest  cursor=pointer decor=none       box=23×16
                 hover cursor=pointer decor=underline
                 focus outline=solid 2px off 2px  ring h=24  reach=4
    gainer NVDA  rest  cursor=pointer inner:none       box=68×18
                 hover cursor=pointer inner:underline  row-bg=rgb(242, 243, 249)
                 focus outline=solid 2px off 2px  ring h=26  reach=4

`18 + 2×(2+2) = 26` and `16 + 8 = 24`, to the pixel. `:active` adds nothing and
displaces nothing. **A ring is drawn only for `:focus-visible`** — after a real
pointer press the same element reads `outline: none`, which is correct.
`prefers-reduced-motion: reduce` changes **nothing** in any reading.
Greyscale: **45 photographs, 0 identical pairs at every width.**

Tab stops, both directions, five widths, identical at all five: **11 reserved,
19 filled** — four masthead links, seven region sections, four proxy links and
four roving-group stops.

### The one real finding, and it falsifies a dated measurement

**A reverse `Shift+Tab` walk puts `Sector performance` and `Market breadth`
rings 0.09–0.14 px behind the masthead**, at two viewport heights
`overview-focus-ring.spec.ts` does not run. Stable to four decimals over two
reproductions:

    1024×800  Tab        stops=14 breaches=0  minTop=88.0000
    1024×800  Shift+Tab  stops=14 breaches=4  minTop=-0.1406
          !! section:Sector performance  top=60.8594  topClr=-0.1406  scrollY=477  pad=62px
    1440×680  Shift+Tab  breaches=4  minTop=-0.0938
    1024×900 / 1440×900 / 768×800 / 390×780  Shift+Tab  breaches=0  minTop=0.0000

`scroll-padding-top` resolves to a whole `62px` and the chrome's bottom to a
whole `57`, but at these **heights** the region's document offset is fractional
(`*.8594`, `*.9063` — `min-height: 82vh` over `minmax(min-content, 1fr)`) while
Chromium quantises `scrollY` to whole pixels, so the box **cannot** land at
`61.0000`.

**This falsifies `tokens.css`'s `--scroll-overshoot` note (Task 4.6.1,
2026-10-08)** — _"every box edge and both chrome edges read whole pixels, so
there is no sub-pixel here for a tolerance to absorb."_ True of its four pairs;
not true in general. **Not repaired**: the spec is 4.6.1's, widening its
`WIDTHS` makes the gate red, and a sub-pixel tolerance weakens the check that
found the original 5 px defect. A `docs/GAPS.md` entry carries it and it is a
Gate 2 question.

### Gates

    49 invariants hold.
    42 components, 42 stories files.
    packages/shared 437 passed · apps/backend 1025 passed ·
    apps/frontend 1392 passed · test:process 41 passed
    grep -ci "unhandled" → 0
    eslint . --max-warnings 0 → clean
    prettier --check → All matched files use Prettier code style!

    pnpm e2e overview-        63 passed, 1 skipped (51.4s)
    pnpm e2e overview-journey  1 passed, 1 skipped (3.6s)
    pnpm e2e (full, run 1)   227 passed, 16 skipped, 2 failed (5.5m), load avg 33.6
    pnpm e2e (full, run 2)   228 passed, 16 skipped, 1 failed (4.1m)

Run 1's two failures each **pass alone** (7.1 s, 1.4 s) — contention on a
machine the runner itself warned about. Run 2's single failure is
`security-gap-fill.spec.ts:165`, the **documented flake** at `docs/GAPS.md`
(_"fails on `main` about one time in eight"_). Neither is a spec this task
touched.

**No break is owed**: no `pnpm invariants` grep was added. The new assertions
are browser assertions, each proved red by substitution — three transcripts
above.

### Seven `docs/GAPS.md` entries

No gated machine has ever clicked a mover; AC 5's last clause is unreachable on
every gate; the sector region draws **no `<ol>` at all** when nothing is
ranked, so every list-keyboard assertion in it is vacuous on the gate; the
pointer's **moment of entry** is unguarded, with the 0.21–0.44/min rates; the
reverse-Tab sub-pixel breach; the 11-and-19 tab-stop reading; and the **ninth**
screen-reader entry — whether a client-side route change with an unchanged
`document.title` is announced at all, which is the **inverse** of the other
eight: a change the reader explicitly asked for, the one case where announcing
is unambiguously right.

## For a stakeholder — a status report, 2026-10-09

The landing page became a place you can leave from. Twenty-four tickers on it
now open their security pages, by mouse and by keyboard, and a sector row takes
you to the ETF that tracks it.

What this task did was prove it rather than build it. Every destination on the
page was activated for real and checked against the address it advertised:
twenty-five out of twenty-five agreed. Nine different states of the page were
photographed at five sizes in greyscale, and no two of the forty-five pictures
read the same. Nothing that is not a link looks like one, anywhere.

Two things are left for the owner to decide rather than for a developer to fix.
A reverse keyboard walk puts two of the seven region outlines a tenth of a
pixel behind the top bar at two window heights — real, reproducible, and the
cure is worse than the symptom, because the obvious fix weakens the check that
caught a five-pixel version of the same defect. And one acceptance criterion
asks for a figure the page does not have a single value for: the number of
keyboard stops is eleven before the data arrives and nineteen after, because
the rows themselves are stops. The figure that never changes is seven.

The honest gap is that **no automated machine has ever clicked a mover**. The
test server holds no price history, so the movers list there is permanently
empty; every automated journey runs against a page we furnished. A person
opening a real mover during a real session is owed, and Story 4.9 has the row
for it.
