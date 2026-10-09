# Story 4.6 — Selection From the Overview

**Status:** **In progress — 2026-10-08.** Decomposed into seven tasks; four decisions taken at Gate 1 and **five of six acceptance criteria reworded** — two contradicted each other, one is factually false, and one could not pass even after its repair. Shaping verified **two traps that would have shipped**: the reserved sector rows carry slugs and the held mover pads carry non-breaking spaces, so a naive link builds eleven `/securities/<sector-slug>` and ten `/securities/%C2%A0` — the latter in CI's permanent state.
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.5
**Epic scope covered:** security selection from the overview

## Description

**The story that turns four regions of figures into a place you start from.**

Until now this screen answers _what is happening_ and offers no way to act on
the answer. `PRODUCT_SPEC.md` §8.1 calls the overview the **landing screen**
and §4's first job ends with a reader who has found something worth looking at
— and then has to type the symbol into the Security Explorer's search field to
see it.

**Every figure on this screen is about a security or a group of them**, so
every figure is a potential destination: a proxy, a sector, a mover, and — if
Story 4.4 chose an aggregate that names them — the counts.

> **The URL rule is already settled and this story inherits it rather than
> re-deciding it.** `/securities/:symbol` is a real address, a cold link works,
> and the selection lives in the URL (`SEARCH-AND-SELECTION.md`). What is new
> is a screen full of **many** origins for that one destination, and the
> keyboard path through them.

## What the user can see when this story lands

**A landing page you can leave from.** Click a mover and the Security Explorer
opens on it. Click a proxy and the same. Tab through the screen and the reach
is the same as the pointer's, in an order that matches what a reader sees.

**This is the first moment MarketPulse works the way §8.1 describes it** —
start at the market, notice something, go and look at it — and it is the
epic's exit criterion in a single interaction.

**What they still cannot do:** see what a sector opens (there is no sector
page in V1 — this story decides whether a sector row is a destination at all),
or investigate anything (Epic 7+).

## Why it sits here in the sequence

**After the movers, because the movers are the reason to leave**, and after
the ranking decision, because a target that re-orders under a pointer is the
one thing that makes this interaction feel broken rather than alive.

## Acceptance criteria

1. Every security-bearing figure on the overview reaches `/securities/:symbol`,
   by pointer and by keyboard, with one tab stop per region rather than one per
   row where a region is a list
2. The destination is the **existing** route and the existing URL rule — no
   second selection mechanism
3. **A sector row's destination is decided in writing**, including "nothing,
   and it is not a link" if that is the answer; a row that looks clickable and
   is not is worse than a row that does not
4. Focus is never occluded by the sticky chrome at any width — this product has
   two sticky edges and a measured history of exactly this defect
5. A browser spec walks the journey: land on `/`, reach a mover, open it, and
   read a figure on the security page
6. Nothing on this screen announces the navigation; the destination page's own
   heading is the announcement (`FRONTEND-STATE.md` §7's rule)

## Design work

**The hit target and the hover state are the design work here**, and the
canvas has the input idiom (`Universe navigation.dc.html`) for a table row that
opens a security. What it does not have is **a figure that is also a link** —
the proxies and the movers are numbers first and destinations second, and a
number that grows an underline on hover is the wrong answer for a screen whose
figures move on their own.

## Out of scope

Investigation entry points (Epic 7+), the topology's own selection (Epic 6),
and multi-select or comparison (Epic 8).

## Handed here by Story 4.2's close — 2026-09-26: two things the first click will meet

**1. The first thing that makes a proxy activatable must not be a natively
`disabled` control carrying an `aria-describedby`.** A description is read when
a control is **reached**, and a natively `disabled` control is not focusable —
so the sentence is unreachable by any key press. This shipped for two tasks
once; `TextField` renders `aria-disabled` + `readOnly` product-wide because of
it. And the consequence has to be followed: the state stops being inactive, so
WCAG 1.4.11's and 1.4.3's exemptions stop covering its border and its ink.

**2. `Market proxies` is now a HOMONYM, so any region locator on `/securities`
must be scoped.** It is the landing page's region, the universe table's group
heading, and a rail link — the same four securities and the product's existing
word, so it is consistent rather than wrong. But `getByRole("region", { name:
"Market proxies" })` is now ambiguous across routes, and a selection spec is
exactly the shape that will write one.

**3. The strip is content, not controls.** It adds **zero** tab stops today —
the region is already one stop as a `Panel scrollable`, and nothing inside it is
focusable. Whatever you add is the first, so it is also the first chance to get
the sticky-edge focus behaviour wrong: `scroll-padding-top`/`-bottom` exist, and
`docs/GAPS.md` records that they are short by exactly `--focus-width +
--focus-offset`.

## Reassessed 2026-09-27 — your AC 4 is falsified today, and the repair is yours

**AC 4 — _focus is never occluded by the sticky chrome at any width_ — cannot
pass as the tree stands.** `scroll-padding-top` and `-bottom` read the published
chrome heights **exactly**, with no slack, while `--focus-width: 2px` and
`--focus-offset: 2px` put the ring **4 px outside the border box**. Measured on
`/` during Story 4.2's verification: `Sector performance` at 768 landed at
`top=56` against a masthead bottom of 57 — **5 px of ring behind the chrome**;
`Movers` at 390 the same; `Market topology` at 390 clipped by the status bar.

**It is yours for three reasons.** You add the **first focusable content inside
`.regions`** — the proxy strip adds zero tab stops, measured. Your AC 4 is the
acceptance criterion the defect falsifies. And `docs/GAPS.md`'s owner for it is a
condition you meet: _the story that next touches `base.css`'s scroll padding_.

The repair is one line —
`calc(var(--sticky-chrome-height, 0px) + var(--focus-width) + var(--focus-offset))`
— plus a `pnpm break`, plus a **Tab and Shift+Tab** walk at 1440/768/390.
**The reverse walk is the one that finds it**; a forward walk alone does not.

## Handed here by Story 4.3 — 2026-09-27: the keyboard rule for a list that RE-ORDERS, written before you need it

**The sector region re-orders under live data**, and that changes what its keyboard
model may be. This was written down in Task 4.3.6 rather than left for you to
invent, because every clause below is a defect that is invisible until a re-order
happens while somebody's hands are still on the keys. It also lives in
`RankedList.tsx`'s header, but a pointer is what a reader follows when they already
know to look — so it is here in words you can act on.

**1. One tab stop for the region, not eleven.** The region is already one stop as a
`Panel scrollable`. Rows are reached by **arrow keys within the list** when they
become activatable.

**2. A roving `tabIndex` keyed on the SYMBOL, never on the index.** This is the
clause that matters most and it has no symptom until the list moves: with an
index-keyed roving stop, **a re-order moves focus to a different sector while the
reader's hands are still**. They arrow down expecting Industrials and get Energy,
because the row that was third is now fifth and the stop stayed at three.

**3. Activation resolved against identity, never position.** Same defect one step
later: a reader presses Enter on the row they are looking at, the frame lands
between the keydown and the handler, and position-resolved activation opens the
wrong sector. **Every number on screen is right throughout.**

**4. `aria-disabled` rather than `disabled` on anything carrying a description.** A
natively `disabled` control is **not focusable**, so anything `aria-describedby`
hangs off it is **unreachable** — a description is read when a control is
_reached_. This product shipped that defect for two tasks on search's unavailable
states: a correct, attached, visible sentence that no key press could get to.
`TextField` renders `aria-disabled` + `readOnly` product-wide for this reason, and
**the consequence has to be followed**: the state stops being inactive, so WCAG
1.4.11's and 1.4.3's exemptions stop covering its border and its ink.

### What already exists that you should not rebuild

- **The hold is shipped.** With a pointer over the region or focus inside it, the
  order **holds** — `ORDER HELD` in the panel's `meta`, scoped to the **region** via
  `:hover`/`:focus-within`, never to the row (row scoping lets rows move out from
  under an **approaching** pointer). It is unbounded in time and bounded by the
  reader rather than by a timer, and it settles in one 240 ms when they leave.
  **So a reader who has tabbed into the region already has a still list** — your
  activation work happens against a frozen order by construction, which removes
  most of the race above but **not the clause**: focus can leave and return, and
  `tabIndex` survives the gap.
- **`Region` has `onReaderWithin?: (within: boolean) => void`**, four native
  listeners (`pointerenter/leave`, `focusin/out`) combined into one boolean and
  released on unmount, **off unless a caller asks**. If you need to know a reader is
  in a region, this exists.
- **The head slot is open** — `Region`'s `meta?: ReactNode`, mutually exclusive with
  `awaiting` in one expression, with a **100 px × `--line-height-subheading`
  reserve** so nothing moves when a badge replaces the count. That reserve is not
  decoration: the badge drawn at the canvas's `4px 6px` padding came out **26 px
  against `Panel`'s 22 px title line**, and **all eleven rows moved 4 px on pointer
  enter** — found by a browser and by nothing else.

### One state the hold cannot enter, which you may meet

A reader whose pointer is **already resting over the region before the first frame
arrives** enters with nothing to pin, so they get **no hold and no badge** until
their next pointer or focus event. Nothing false is shown — the badge and the gate
are one value — and the alternative was re-pinning from an effect, which the React
Compiler's `set-state-in-effect` rejects. Documented in
`components/SectorPerformance/use-order-hold.ts`.

### And the question you inherit rather than the answer

`Region` passes `scrollable` unconditionally, so every region is a tab stop. Since
Task 4.3.1 that is a **backstop** rather than the default behaviour of a region
that does not fit — measured: **no region on `/` scrolls at any of the four
widths**. Whether it should become conditional is **yours**, because you own the
focus order on this screen. Task 4.3.1 explicitly declined to decide it.

## Handed here by Story 4.4 — 2026-10-07: the focus order you inherit is no longer the one your own file describes

**The DOM was reordered on 2026-10-07, so the keyboard order on this screen
changed.** Your file's keyboard rule is unaffected — it is about a list that
re-orders — but the **page-level** order it sits inside is different, and the
difference is deliberate.

### What changed, and what it costs you

**The source order is now the one-column order**: `breadth, sectors, movers,
topology, unusual, investigations`. No CSS changed; `grid-template-areas` places
the wide layouts, as it already did by name. **Every region's box is identical at
all four widths**, verified box-for-box before and after.

- **At ≤860 the keyboard, the heading order, the swipe order and the visual order
  now all agree.** That mismatch was **shipped and live** — this story's own
  premise that _"there is not one tab stop inside `.regions` at any width"_ was
  false, there are **six**, and `Panel` renders `tabIndex={0}` for each.
- **At ≥861 the keyboard order deliberately does NOT match the visual order.**
  Accepted: in two columns the eye is not performing a sequence, so there is no
  reading order there to disagree with, and the alternative puts the mismatch back
  where sequence **is** the entire hierarchy.

**The reversal trigger is a condition and it is yours to watch**: _the first region
on this screen whose content a reader must traverse in order at a wide width_ — a
numbered sequence, a stepper, a form, or **two regions where one's figure is read
against the other's.** Selection may well be what creates that, so read it before
you add a control.

### And the question Task 4.3.1 declined is still open and still yours

`Region` passes `scrollable` unconditionally, so **every region is a tab stop** —
and the measurement behind that rule does not apply here: **no region on `/` scrolls
at any of the four widths**. So six tab stops exist to satisfy a rule about
scrolling that nothing on this page triggers.

**Making it conditional is not a substitute for anything 4.4 did** — breadth has
content and would still be a stop — and it is a product-wide change to a shared
component, where getting it wrong reintroduces a real WCAG 2.1.1 failure
(`scrollable-region-focusable`) at a viewport nobody tested. **It is yours because
you own the focus order, and it was explicitly declined twice rather than
forgotten.**

### One assertion exists now that did not

`e2e/specs/overview-region-order.spec.ts` asserts DOM order against **geometric**
top-to-bottom order, at **768 and 390**. It will go red if you reorder the regions
or restate the narrow areas list without moving the DOM with it. **It deliberately
does not run at 1440**: an assertion of agreement there would assert the opposite of
the decision above, and one of disagreement would pin a cost rather than a claim.

## Handed here by Story 4.5 — 2026-10-08: two lists, one tab stop, and a target that moves by design

**You are the story that makes these rows clickable, and the surface you
inherit has a property the sector list does not: its membership changes while
a reader looks at it.**

### 1. The region is ONE tab stop and both lists are inside it

`Region` passes `scrollable` unconditionally and `Panel` renders
`tabIndex={scrollable ? 0 : undefined}`, so `Movers` is **one** stop today and
neither `<ol>` is focusable. When you make rows activatable that becomes **two
roving-`tabIndex` groups in one region** — and the rules that fall out:

- **Key the roving index on `symbol`, never on an index.** The order changes
  under the reader ~0.4 times a minute and the membership ~0.3; an index-keyed
  roving focus lands on a different security after a re-order.
- **Arrow keys must not cross from the last gainer to the first loser.** They
  are two lists with two accessible names, not one list with a rule through it.
  `Home`/`End` scope to the list.
- **Do not give either `<ol>` its own scrollport.** A scrollable region that
  cannot be focused is the axe `scrollable-region-focusable` failure this
  product took five stories to surface, and it does not fire while the box
  contains something focusable. **One scrollport per region.**

### 2. The hold is yours to reason about, and it is already most of the answer

`ORDER HELD` is scoped to the **region** via `:hover`/`:focus-within` — never
to a row, because row scoping lets a list move out from under an
**approaching** pointer. **A reader whose pointer is in the region has already
frozen the order**, so the classic moving-target defect is mostly answered
before you start. What is **not** answered is the moment of entry: a pointer
crossing the region boundary toward a row has not yet triggered `pointerenter`
on the row it is aiming at.

**Measured, so you can size it**: 0.21–0.44 membership changes a minute and
0.80/0.45/0.42 total order changes a minute, across three sessions, n=9,360
adjacent-rank gaps. So the window is small — but the consequence of landing on
the wrong security is a navigation, which is the one thing a reader cannot
undo with their eyes.

### 3. A member can be replaced under the hold, and the rule is already decided

**The hold pins ORDER only.** A row the pin has not seen is drawn in its
**ranked position among the rows it outranks** — not swept to the bottom,
which is what `rowsInPinnedOrder` did until Task 4.5.7 and which drew a new #1
gainer at **#5 with `1` printed beside it**. So under a hold the region can
show a name that was not there when the reader's pointer arrived.

**The recorded reversal trigger is yours to watch**: _the first surface that
holds an order whose **membership** a reader must trust across the hold._ A
clickable list may be exactly that, and if you decide it is, the hold pins
membership too — but that choice means the region can name a security that is
**no longer a mover** while its figure keeps updating, which ADR 0029 refuses
on the ground that the licence expires when the producer stops selecting it.

### 4. The row already carries what a link needs

Rank, **ticker**, company name, price, change. The **ticker leads** —
deliberately, because it is this product's identifier everywhere else and
because **you** are about to make these rows navigate by it. The company name
is the one field that is **not** on the frame: the route reads it from
`useSecurities`, and a symbol the lookup does not know is labelled with itself.
**So a link's accessible name must not depend on the name having loaded.**

### 5. What a listener gets today, and the one thing nobody can answer

A row reads `1 HPE Hewlett Packard Enterprise Company 62.09 ▲ up +12.44%`
inside `list, 5 items, item 1` — so **the printed rank is spoken and the
platform announces the position as well**. At two lists that doubles on one
screen. Whether it reads as emphasis or as a stutter is a listener's call and
is on the standing screen-reader item rather than guessed at here.

## Gate 1 — 2026-10-08: decomposed into seven tasks, five acceptance criteria reworded, and four decisions taken

**Six roles shaped this.** What they returned reworded most of the acceptance
criteria, found two traps that would have shipped on a first implementation,
and closed a question that had been declined twice.

### Five of six acceptance criteria could not pass as written

| AC    | What was wrong                                                                                                                                                                                                                                                                                                                 | Reworded to                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Contradicts AC 3** — demands _every_ security-bearing figure be a destination while AC 3 permits a sector row not to be. Also demands it of the **price and the change**, which the Design section forbids. And _"one tab stop per region"_ **cannot hold for `Movers`**, which Story 4.5 requires to have two roving groups | Two halves: the destinations are **exactly the ticker tokens** of the proxy cells, sector rows and mover rows, each a `<Link>` built by `securityPath()` with the bare ticker as its accessible name; **and** the tab-stop count is the same in the reserved and filled states, stated as a figure |
| **3** | First clause fine; _"a row that looks clickable and is not is worse"_ is a judgement nothing can fail                                                                                                                                                                                                                          | Keeps the decision, and adds the behaviour it was buying: **no element carries a hover, cursor or focus treatment implying activation unless it is an `<a>` with an href**                                                                                                                         |
| **4** | **Falsified today**, and unfalsifiable even after the repair — _"at any width"_ is unbounded, and `CLAUDE.md` records that scroll-padding **cannot help a target taller than the viewport**, which a filled `Sector performance` panel at 390 is                                                                               | A **Tab and Shift+Tab** walk at 1440/1024/768/390 against the **focus-ring box**, with the stops taller than the scrollport **enumerated by name with their measured heights**                                                                                                                     |
| **5** | **Cannot pass on CI at either end** — `eligible: 0` so no mover, zero bars so no figure                                                                                                                                                                                                                                        | Asserts the address and the destination's **identity**; the figure half skips with its reason printed                                                                                                                                                                                              |
| **6** | **Second clause is factually false**                                                                                                                                                                                                                                                                                           | A live-region **count**, plus a screen-reader entry recording that the arrival announces nothing                                                                                                                                                                                                   |

**AC 6's falsification, verified rather than taken on report**: `index.html`
holds **one static `<title>MarketPulse</title>`**, `App.tsx` uses React Router
in **declarative mode** with no route announcer, and the destination's `<h1>`
is **`Security Explorer` on both routes** — the security's own symbol is an
`<h2>`. So a listener activating a mover gets **no load event, no title
change, no focus move and no announcement.**

### Two traps that would have shipped

Verified in the code, not predicted:

- **`sector-performance.ts:444` — `symbol: sector`.** The reserved rows carry
  the **slug**, so `securityPath(row.symbol)` builds **`/securities/technology`
  ×11 on every first paint.**
- **`movers.ts:487` — `symbol: NBSP.repeat(slot + 1)`.** The held pads build
  **`/securities/%C2%A0` ×10** — in **CI's permanent state**, most of a
  weekend, and the first minute of every session.

### The question declined twice is closed, and the reframing is why

**It was never _does this region scroll_. It is _can a tab stop appear and
disappear under a reader_, and the answer must be no.** Conditional on actual
overflow fails because overflow is a function of **height** and the
measurement is four width/height pairs. Conditional on content being focusable
— the better condition, and correct about 2.1.1 — **drops focus to `<body>`**:
three regions' content is focusable only when a frame has landed, so the
`Sector performance` stop would exist at paint, vanish when the first
aggregate arrives, and return on a rollback. **ADR 0039 in Task 4.6.6.**

And the blast radius was **smaller than the brief claimed**: `Panel` has
**exactly one** production consumer, and `Region` is on **two** routes, not
five.

**Amended 2026-10-09 by Task 4.6.6 — the premise above is not only
under-measured, it is FALSE, and the falsification is upward.** The handed-down
claim — repeated at line 359 of this file and in Task 4.3.1 — is _no region on
`/` scrolls at any of the four widths_. Re-taken at **thirteen** width/height
pairs on both routes that draw regions: `Unusual activity` scrolls at
**1440×680** by 4 px, at **1440×600** by 19, at **1280×560** by 27 and at
**1024×560** by 27, and `Market topology` joins it at 1440×500, 1280×480 and
1024×560. **The first height at which a region on `/` scrolls is between 681 and
700 at 1440** — an ordinary laptop viewport. The cause is in the stylesheet
rather than in the content: row 1 of `.regions` is a `calc()` **length** derived
from `82vh` with no content floor, while rows 2 and 3 are
`minmax(min-content, 1fr)` and have one. The two regions on row 1 are the two
that scroll. **So the rule the stops exist for does fire on this screen**, which
removes the second of the two reasons the question was ever declined. The
verbatim rows are in [ADR 0039](../../../docs/adr/0039-a-region-is-a-tab-stop-unconditionally.md).

The same re-take found the mirror on the other route: **0 of 8 regions scroll on
`/securities` at any of the thirteen pairs**, including `Tracked universe` at
18,893–31,823 px. The long table makes the **page** scroll, never the region —
which `SEARCH-AND-SELECTION.md` already recorded and which means the route with
the original defect's shape is the one where the rule is least triggered.

### The guard this story destroys

**`scrollable-region-focusable` does not fire while a scrolling box contains
something focusable** — which is why that defect stood five stories. Once rows
in three regions are focusable, **axe can never report those regions again**,
and _every region is reachable by keyboard_ becomes a sentence. Task 4.6.6
replaces it with a `tabIndex` assertion on both routes.

### Three defects that are nobody's fault

- **A focused row can vanish under the hold.** The hold pins **order**; Task
  4.5.7 deliberately let **membership** move beneath it. Together: the `<li>`
  unmounts and focus drops to `<body>`.
- **A keyboard reader can enter `useOrderHold`'s un-pinnable state.** The hook
  documents it for a pointer resting before the first frame; tabbing in during
  the same window is identical, and nothing said so.
- **The hold engages for a keyboard reader and is announced to nobody** — the
  mirror of the eighth screen-reader entry.

### And one thing is better than feared

With a real `<Link to={securityPath(symbol)}>` the destination resolves **at
render, from the row's own identity**. The activation race the 4.3 hand-off
warned about — _a frame lands between the keydown and the handler, the wrong
security opens, and every number on screen is right throughout_ — **is not a
risk to manage. It is unrepresentable.**

### The ring forces the design

`18 + 2 × (2 + 2) = 26` — **the row's padding box, to the pixel.** A row-height
link gives a **34 px ring against a 27 px pitch**, crossing both neighbours and
putting the row's own hairline inside the ring. **So the 18 px line-box target
is a consequence, not a preference.** And **2.5.8 is met by the spacing
exception**, which makes the **27 px row pitch the conformance argument**:
shrink the row below 23 px and every ticker link fails, with nothing mechanical
reporting it.

### The owner's four decisions

| Decision                           | Taken                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A sector row**                   | **The ticker opens its benchmark ETF.** The region's own footer already says _"Each row is the sector's benchmark ETF — capitalisation-weighted, not the average of its members"_, so the subject is declared on screen; scoping the target to the `XLK` cell means the thing pressed and the thing opened are the same four characters. Against: not a link at all, which loses the payoff in the region most likely to produce it; and the label opening a filtered `/securities`, which contradicts the shipped rail decision and fires `SEARCH-AND-SELECTION.md` §3's own trigger |
| **The proxy target**               | **The symbol token, not the whole cell** — consistency with the ranked rows over the designer's recommendation. **The designer's measured objection stands and Task 4.6.3 must answer it**: a 16 px symbol link's ring **overhangs 4 px into the 26 px price row**, and whether that lands in the half-leading or on the glyphs is a measurement that task takes                                                                                                                                                                                                                      |
| **The acceptance criteria**        | **Reworded as above**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **The arrival announcing nothing** | **Raise it, do not build it.** A per-route `document.title` is ~10 lines and is the mechanism screen readers do announce on — but it is product-wide, belongs beside a route-announcer decision, and `/securities`' 518 links have had the same hole for two epics. It becomes the **ninth** screen-reader entry, and it is the **inverse** of the other eight: those are unprompted updates, and this is a change the reader asked for, which is the one case where announcing is unambiguously right                                                                                |

### The seven tasks

| #     | Title                                                            | Visible                                   |
| ----- | ---------------------------------------------------------------- | ----------------------------------------- |
| 4.6.1 | The ring that does not fit, and the second site nobody connected | focus rings stop hiding behind the chrome |
| 4.6.2 | The canvas: the figure is never the link                         | nothing                                   |
| 4.6.3 | A proxy opens its security                                       | **the first four destinations**           |
| 4.6.4 | A ranked row opens its security                                  | **~20 more, both ranked regions**         |
| 4.6.5 | The states where there is nothing to open                        | honest behaviour everywhere               |
| 4.6.6 | ADR 0039, and the guard axe can no longer give                   | nothing                                   |
| 4.6.7 | The journey, the grid, the sweeps and the close                  | nothing                                   |

**Not doing**: re-opening the ≥861 focus-order mismatch — 4.4.7's, and its
trigger **does not fire**, because a mover row and a sector row are each
self-contained destinations and neither is read against the other. Not making
`scrollable` conditional. Not a sector page. Not the topology's selection.

**Decided on unanimous advice**: the target is the **ticker**, never the figure
and never the row; a real `<Link>` built only by `securityPath()`; the region
tab stops stay; arrows clamp rather than wrap and do not cross between lists;
and when a focused row's security leaves, focus moves to the row now at that
rank.
