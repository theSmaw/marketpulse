# Task 4.1.2 — The canvas: the overview's grid, and the two regions nobody has placed

**Status:** Not started
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
