# Task 4.2.8 — The browser spec, the states produced, and what CI cannot assert

**Status:** Not started
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.7

## Objective

**Acceptance criterion 6 names the one assertion CI can actually make**, and
the existing equivalent — `e2e/specs/universe-live-update.spec.ts` — is the
shape to copy. This task writes it, and produces the strip's state grid while
the strip is four cells and the set is cheap.

**It also writes down what a green run does not certify**, because this story
ships figures whose correctness no runner can see.

## What the user can see when this lands

**Nothing new.** A spec, a grid of photographs, and some honest sentences about
what is not covered.

## Work

- **The browser spec**, copying what transfers unchanged from the universe-table
  equivalent: `serveFeed()` with `page.routeWebSocket`, frames built with the
  **shipped encoder** so a protocol change breaks the compiler rather than an
  assertion; asserting a **transition** rather than a figure; capturing an
  untouched sibling's text and asserting it **unchanged** so the spec passes
  against both CI's bare store and a developer's full one; `[data-arrival]`
  counts and `animation-name: /arrival-decays/`; `expectNothingFailedToRender`.
- **Two amendments the existing shape needs**, both found before writing it:
  - **The harness must answer the `subscribe` message**, not just fire a
    snapshot on open. `universe-live-update` gets away with the simpler form
    because `/securities` subscribes to everything; the proxies subscribe to
    four, and the real two-snapshot sequence is what drives `resumes`.
  - **A spec that asserts a figure serves its own answer.** With zero bars there
    is no basis, so `changeFromClose` yields no percentage; if the spec wants to
    assert the change it must also route `/securities` and serve a body with
    `lastCloses`. That is the repair `docs/GAPS.md` already extracted from the
    `security-chart-edge.spec.ts` incident — and it took that spec from 12.6 s
    to 1.2 s.
- **Inherit the harness's deliberate narrowness.** `e2e/support/feed.ts` serves
  the venue and the connection from **one value** so an incoherent pair is
  unrepresentable, because _"a stub that can send any frame can manufacture
  states the server cannot, and those look exactly like findings"_ — Task 3.10.1
  wrote up two such findings and withdrew one. The proxy frame must not be
  sendable for a symbol the subscribe frame did not carry.
- **The state grid, produced rather than imagined**, at 1440/1024/768/390 and
  in greyscale. Greyscale is not decoration: the price palette differs by
  **1.04:1** in greyscale, so if the sign and the glyph are not carrying the
  direction the photograph is the only thing that will say so — and four
  greyscale simulations once passed against a chart that was wrong. **No two
  states may read identically at any width**, compared as strings and not by eye.
- **Two owners-by-condition fire on this story and must be answered or
  re-owned**, not silently inherited: `EPIC.md`'s _"nothing checks that a named
  region says something when its subject is missing"_, owned by **the next
  story that adds a region**; and `docs/GAPS.md` entry 13's sibling, owned by
  **the next story that publishes a state grid**. This task does both.
- **Sweep `e2e/specs-deployed/`.** Two directories, no mechanical link, three
  incidents. A green local run is **no evidence** about that directory, and this
  story adds a locator to the landing route.

## Done when

1. A browser spec asserts a bar landing in a proxy against a store with zero
   bars, and passes on both CI's store and a developer's
2. The spec's own header says which half of the chain it covers — the browser
   half — in the same words the universe-table spec uses
3. The state grid exists, at four widths, in greyscale, with no two states
   reading identically
4. Both owners-by-condition are discharged or explicitly re-owned with their
   condition restated
5. `docs/GAPS.md` carries an entry for every claim this story leaves standing,
   each with a `Re-measure:` line naming a file or a command
6. `grep -rn "Market proxies" e2e/` — over `e2e/`, never `e2e/specs/` — returns
   what it should

## Amended by Task 4.2.5 — 2026-09-26: two `docs/GAPS.md` entries this story now owes

**1. The focus ring is clipped by exactly `--focus-width + --focus-offset` at
both sticky edges, on every route.** Found by a Tab and Shift+Tab walk during
4.2.5's verification, and it is **not** this story's to repair — it is a
`base.css` fact affecting every screen.

`scroll-padding-top` / `-bottom` read the published chrome heights exactly
(57/33 at 1440, 57/53 at 768, **94/73 at 390**) with **no slack**, while
`--focus-width: 2px` and `--focus-offset: 2px` put the ring **4 px outside the
border box**. So any region the browser scrolls flush against an edge has its
ring clipped. Measured: `Sector performance` at 768 landed at `top=56` against
a masthead bottom of 57 — **5 px of ring behind the chrome**; `Movers` at 390
the same; `Market topology` at 390 landed at `bottom=708` against a footer top
of 707.

**The 2026-09-11 repair works** — these were whole-stop occlusions before and
are now a ring edge — **and it is under-provisioned by exactly the ring's own
geometry.** The cure is one line,
`calc(var(--sticky-chrome-height, 0px) + var(--focus-width) + var(--focus-offset))`,
and it belongs beside `CLAUDE.md`'s sticky-edge record with its own
`pnpm break`. `Market proxies` is unaffected at every width, being the first
region in `main`.

`Re-measure:` a Tab and a **Shift+Tab** walk of `/` at 1440/768/390, reading
each focused element's box against `--sticky-chrome-height` and
`--sticky-footer-height`. The reverse walk is the one that finds it; a forward
walk alone does not.

**2. Two more entries for the listening backlog**, owner unchanged — a person
with a screen reader. The strip's figure is spoken as a **bare unlabelled
number** (`SPY. 774.03 up +0.42%`), because the symbol occupies the slot the
security page gives to `LATEST PRICE`; and the **shared basis clause is heard
after the four changes it qualifies**, which is correct visually as a footnote
and is the reverse order aurally. Neither is answerable from a DOM.

## Amended by Task 4.2.6 — 2026-09-26: a third `docs/GAPS.md` entry, and it is shipping today

**`AppHeader`'s descriptor renders at 11px/16px instead of 9px/1, and nothing
can see it.** Found by sweeping all 37 CSS modules for the `composes`-cascade
shape Task 4.2.6 hit in the strip, and **proven from the built bundle rather
than argued**:

```text
apps/frontend/src/components/AppHeader/AppHeader.module.css:91
  .descriptor { composes: microLabel from "../../styles/type.module.css";
                line-height: 1; font-size: 9px; }

dist/assets/index-*.css
  offset  4759  ._descriptor_…{color:…;margin:0;font-size:9px;line-height:1}
  offset 42523  ._microLabel_…{font-size:var(--font-size-micro);line-height:var(--line-height-micro);…}
```

Equal specificity, `microLabel` later in the sheet, so **`microLabel` wins** —
`composes` concatenates class names and does not cascade, so a declaration
under it loses to the composed stylesheet's own.

**Why it matters beyond a font size**: this is the element
`AppHeader.module.css`'s own comment calls _"the longest string in the chrome —
201px at 1440"_, in the argument that decided **what wraps at 390**. That
measurement was taken against an element rendering larger than its stylesheet
says, so the wrap decision rests on a figure whose provenance is now in doubt.

**Nothing asserts a font size anywhere in this product**, and no test, axe run
or screenshot comparison of the existing states can see it — the strip's
version of this defect was invisible for a day for the same reason and only
became visible when a rule that had only ever held digits was given a **word**.

`Re-measure:` build, then read `dist/assets/index-*.css` for `_descriptor_` and
`_microLabel_` and compare their offsets — the later one wins. Or measure
`.descriptor`'s computed `font-size` in a browser against the 9px the source
declares. **Owner: its own task** — it is a chrome change on every route, and
the 201px re-measure travels with it.
