# Task 4.1.2 — The canvas: the overview's grid, and the two regions nobody has placed

**Status:** **Complete — 2026-09-25. `Market overview.dc.html` is on the canvas**, with the screen drawn at 1440, 1024, 768 and 390, a second layout for the day Epic 6 lands, and the deferred-region treatment drawn for the first time in this product's life. **Three regions were placed rather than two** — the movers turned out to have no home in §9's sketch either — and the empty-dominant-region problem is solved by an **interim layout with a reversal trigger** rather than by a bigger empty box.
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.1

## Objective

**The design canvas has no Market Overview artefact**, and this is the screen
`PRODUCT_SPEC.md` §9 sketches and §5.6 says has to look like a real funded
product. This task draws it before anything is built, which is the chain this
repository runs on: **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` →
components**.

**The canvas is `727b5b14-fe78-47c1-9d9c-fb84b6ce5280`**, reached with
`get_project`/`list_files` — **never `list_projects`**, which filters to
design-system projects, returns this one as absent, and has been misread as
_the canvas does not exist_ by three separate stories.

## What the user can see when this lands

**Nothing in the product** — and a picture of the screen the next five tasks
build, which is the thing a stakeholder can look at before any of it is real.

## What to draw, and what to reuse rather than reinvent

**Reuse**: the region and panel treatment (`Price region.dc.html`), the
empty-answer vocabulary (`Provenance and the empty answers.dc.html`), the
chrome (`Live in the chrome.dc.html`), and the motion rules
(`The motion vocabulary.dc.html`) — **work in progress LOOPS, a state PERSISTS,
a fact arriving DECAYS**.

**Draw, because it does not exist:**

- **The overview's grid at 1440, 1024, 768 and 390.** §9's sketch is a dominant
  primary area with the topology as the visual centre of gravity, a narrower
  right column, and a lower band. **Four widths, because a grid that restates
  its spans at each breakpoint is this product's one measured layout trap** —
  a `span N` item wider than the explicit grid grows implicit columns rather
  than clamping, and it renders identically in every test below a browser.
- **Where the index/ETF summary and sector performance go**, which Task 1.5.4
  deferred to this epic by name. This is the decision, not a sketch of one.
- **The region-that-belongs-to-a-later-epic state**, which this product has
  shipped for two years and never drawn.

## Work

- The artefact created on the canvas, with the grid at four widths and each
  region in its deferred and its filled state
- `VISUAL-LANGUAGE.md` reconciled with anything new, in that direction
- Any canvas value failing a measured accessibility floor adopted **in intent
  and not in value**, with the measurement recorded beside the token — the
  standing exception, which has fired four times

## Done when

1. The artefact exists and the two unplaced contents have a home in it
2. Four widths, each with its spans stated
3. A stranger looking at it can tell what the screen is for

## Amended by Task 4.1.1 — 2026-09-25: the hardest question on this screen is what an EMPTY dominant region looks like

**Reading the route turned up a design question nothing owned, and it is the
biggest one this screen has.**

Today the topology region — §9's **visual centre of gravity**, the dominant
primary area — is full. It holds Story 1.4's render check: three modules, a
table, a band list, a feed list and an error block. **Task 4.1.4 removes all of
it**, and Epic 6 does not fill it for two more epics.

**So after this story the landing page's largest region is empty**, and
`PRODUCT_SPEC.md` §5.6 is not optional about what that must not look like:

> _It must look like a real, funded product rather than a **scaffold with data
> in it**._

**A deferred region the size of a postcard is a sentence. A deferred region
that is half the screen is a design problem**, and this task is where it gets
solved rather than discovered.

### What that adds to this task

- **Draw the topology region in its deferred state at all four widths**, at
  full size, and answer honestly whether the screen still passes §5.6's four
  tests — would a stranger believe it is a real funded product; does it look
  designed rather than defaulted; is there a moment worth showing somebody.
- **If the answer is no, the layout is the repair.** Options to draw rather
  than argue: the filled regions take the primary area until Epic 6 arrives and
  the topology is deferred in a smaller frame; or the grid changes shape at
  this stage of the epic and changes back. **Either is a decision with a
  reversal trigger, and a region that is simply empty is not.**
- **Draw the breadth region FILLED, not only deferred.** It has named Epic 4
  since Task 1.5.4, and Story 4.4 fills it — so this screen's first real
  content is in a region that already exists rather than in one of the two
  being added.
- **Draw the top of the screen without the summary paragraph.** Task 4.1.3
  removes it; what replaces it — nothing, a heading, or something else — is a
  composition question and belongs here.

> **One sequencing option was considered and rejected**: moving Task 4.1.4
> after Story 4.2 so the gallery survives until something real replaces it.
> **Rejected** — the gallery is in the region Epic 6 fills, so it would survive
> two more epics on the strength of looking busy, and a landing page whose
> centre is a component demo is exactly §5.6's scaffold. **The mitigation is
> design, not ordering**, which is what this amendment makes explicit.

---

## What was done — 2026-09-25

### `Market overview.dc.html`, seven sections

The canvas had 20 artefacts and none of them was this screen. It now has 21.

| §   | Subject                                                              |
| --- | -------------------------------------------------------------------- |
| 01  | The screen as Epic 4 ships it, at 1440, with every span stated       |
| 02  | The same screen once Epic 6 lands, and the trigger between them      |
| 03  | The region that belongs to a later epic — three sizes, one rejected  |
| 04  | 1024, 768 and 390, each restating its tracks                         |
| 05  | The top of the screen, and what replaces the paragraph 4.1.3 removes |
| 06  | What is reused, and the one component added                          |
| 07  | §5.6's four tests, answered — three yes, one **not yet**             |

### Three regions placed, not two

The task was written for two — the index/ETF summary and sector performance,
which Task 1.5.4 deferred to this epic by name. **Drawing the screen found a
third**: §9's sketch has no home for **top gainers and losers** either, and
Epic 4's scope lists them.

> **They could have gone in the unusual-activity region's place**, and that is
> the trap Story 4.5 already names: **unusual is not largest.** A mover list
> standing in for an anomaly feed would teach a reader the wrong thing about
> what this product does, on the screen whose whole job is §1's _what is
> happening_. So the movers get a region of their own and the unusual-activity
> region stays deferred and empty, which is the honest pair.

**Where they went, and why:**

- **The index proxies are a full-width strip at the very top.** Four figures,
  read first, and they are the market's headline — the one thing on this screen
  that answers _what is happening_ before a reader's eye has moved.
- **Sectors and movers take the primary column**, above the lower band, for as
  long as the topology is deferred.
- **Breadth stays where §9 put it** and keeps its place in both layouts.

### The empty dominant region, solved by a layout rather than by a bigger box

This is the question Task 4.1.1 handed here, and the answer drawn beside its
alternative:

**Until the first graph node renders, this epic's own content takes the primary
column and the topology holds a reserved band at the top of it** — the frame,
the tag and one sentence, at a height that reads as _held_ rather than as
_unfinished_. §9's centre of gravity keeps its place in the reading order
without taking half the screen to say nothing.

**The rejected version is on the canvas beside it**, drawn at full height and
labelled: honest, and exactly the scaffold §5.6 forbids.

> **An interim nobody has drawn the exit from is a permanent state with an
> optimistic name**, so §02 draws the end state too: the topology takes the
> column back, sectors and movers drop to the lower band, and **every region
> keeps its name, its order and its landmark**. The trigger is a condition —
> **the first commit that renders a graph node on this route** — and the band
> does not grow in the meantime, because a reserved band that creeps upward is
> how an interim becomes permanent without anybody deciding it.

### The deferred region, drawn for the first time

The deferral **sentence** has been a rule in `VISUAL-LANGUAGE.md` since Task
2.14.7. The deferral **frame** never was, and this product has shipped one
since Epic 2.

Three properties, each a decision rather than a texture:

- **A hatched ground rather than a blank one**, because an empty region and a
  failed region must never look alike — and the failure state is already a
  labelled block with a sentence.
- **A dashed border**, the same distinction in a second channel, since the
  hatch is a fill and a fill is what greyscale and low vision lose first.
- **The epic as a tag rather than as prose**, so the sentence describes the
  product instead of our backlog. A sentence opening _Epic 6 will…_ makes a
  reader's first fact about the screen a fact about us.

### The top of the screen

Task 4.1.3 removes the paragraph that describes the whole screen. **What
replaces it is nothing** — the first thing on the landing page is a fact about
the market, and the route's accessible name is a visually hidden `h1`.

Both alternatives are drawn and rejected on the canvas. **A page title** is
rejected because the Security Explorer earns its heading by having a _subject_
beside it and this screen's subject is the market. **A shorter paragraph** is
rejected because it is the same defect at a smaller size — Epic 2 deleted three
sentences of exactly that kind from the Security Explorer, for exactly that
reason.

### One component added, and it has two uses

**A ranked list**: a label, a signed figure, and a proportional bar **anchored
at zero rather than at the edge**, so every row's length is comparable and
direction is carried by which side of the anchor it grows from — a third
channel beside the sign and the glyph, and the palette's **1.04:1** greyscale
difference is why there are three.

**Sectors and movers are the same component.** Two components that look similar
is an accident; one with two uses is a decision, and it is what stops Story
4.5's re-order treatment having to be designed twice.

### 390 decides three things no other width does

- **The summary is two by two**, not four across and not a horizontal scroller
  — a scroller hides half a four-item set with no affordance saying so.
- **Breadth comes second**, ahead of sectors and movers: at one column, order is
  the only hierarchy left.
- **The status bar is four wrapped lines**, measured on the deployed site at
  390 × 780 on 2026-09-25 rather than assumed — and whether a reader watching
  figures at the top **notices** it change is the one thing on this page a
  drawing cannot answer. It is Task 4.1.7's, with a real phone.

### §5.6, answered three of four

Three yes — a real funded product, designed rather than defaulted, a moment
worth showing. **One not yet**: _does it feel alive_ is undecidable from a
drawing, and this product answered it _not yet_ seven times before settling it
against real moving numbers. It is Story 4.5's, in front of a live session.

> **A canvas that scores its own work four out of four is a canvas nobody
> checked**, which is why the fourth card says so on the artefact rather than
> only here.

### `VISUAL-LANGUAGE.md`, reconciled

A new section — _The landing screen_ — carrying the deferred-region treatment,
the reserved band and its trigger, the ranked list, and the no-heading decision.
The chain ran in the right direction: **canvas → `VISUAL-LANGUAGE.md` →
`tokens.css` → components**, and nothing in `tokens.css` needed to change,
because every value on the artefact is one this product already ships.

### Gates

Documents and one canvas artefact. `pnpm links` green — 452 documents, 1,638
links. No token changed, so no accessibility floor was met with a substitute
value and the standing exception did not fire a fifth time.

## For a stakeholder — a status report, 2026-09-25

### What this was

**A drawing of the landing page, before a line of it is built.**

This is the screen a first-time visitor sees, and our own specification is
blunt about it: the product _must look like a real, funded product rather than
a scaffold with data in it_. That is a requirement, not a preference, because
the whole project is meant to be shown to people.

### The problem this had to solve

Our landing page has room for seven panels. **This phase fills four of them.**
The biggest one — the centre of the screen, where a live map of the market will
eventually go — belongs to a phase that is two phases away.

Drawn literally, that is a landing page with a large empty rectangle in the
middle. Honest, and it looks unfinished.

**The answer is an interim layout**: our own content — sectors, movers, breadth
— takes the centre for now, and the map keeps a slim reserved strip that says
what is coming and roughly how much room it will take. When the map arrives, it
takes the centre back and everything else moves down one shelf.

> **We drew both layouts, side by side.** An interim nobody has drawn the exit
> from tends to become permanent with an optimistic name — so the end state is
> on the page too, with a written condition for when it takes over: _the first
> time the code draws a single node of that map_.

### Three panels found a home, and one of them was a surprise

Two panels had been waiting for this phase to decide where they go — the
market summary and sector performance. Drawing the screen turned up a **third**
with nowhere to live: **biggest gainers and losers**.

The tempting move was to park them in the space reserved for _unusual activity_
— they look similar and that space is empty. **We didn't**, because they mean
different things: _biggest_ is not _unusual_, and teaching a visitor otherwise
on the one screen whose job is explaining what the product does would be a
self-inflicted wound.

### The thing we had shipped for two years and never drawn

Panels that belong to a future phase have existed in this product since the
early days, and the way they look had never been designed — only implemented.
They are now drawn properly: a lightly hatched background rather than a blank
one, so an _empty_ panel never gets mistaken for a _broken_ one, and a dashed
edge so the same distinction survives for a colour-blind reader or a bad
screen.

Small detail, real consequence: **an empty box and a failed box looking alike
is how a product teaches people to ignore its error messages.**

### What we told ourselves we had not solved

The page scores our own four visual tests **three out of four**, and the fourth
— _does it feel alive_ — is marked **not yet**, because it cannot be answered
from a drawing. It needs real prices moving in front of a real person. That is
booked for later in this phase.

A design review that scores itself full marks is a design review nobody did.

### Where this leaves the work

**The next three tasks build what this drawing shows**, and each puts something
visible on the page: two new panels, the removal of the old demo content, and a
screen that finally looks like the product we are describing to people.
