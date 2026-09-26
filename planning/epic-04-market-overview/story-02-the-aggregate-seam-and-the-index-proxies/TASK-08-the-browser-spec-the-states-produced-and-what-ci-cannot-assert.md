# Task 4.2.8 — The browser spec, the states produced, and what CI cannot assert

**Status:** **Complete — 2026-09-26.** Four browser tests, **80 photographs** across 16 states and four widths plus greyscale, four `docs/GAPS.md` entries and two listening-backlog entries. **Entry 13's second half had never been run in this repository**, and running it found **two reachable states missing from a grid published four days earlier** — both shipping. Two owners-by-condition discharged and re-armed.
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

## Amended by Task 4.2.6 — 2026-09-26: a fourth `docs/GAPS.md` entry, and it is not this story's defect

**`security-gap-fill.spec.ts:165` fails on `main` about one time in eight, and
nothing records it.** Measured while establishing that Task 4.2.6 had **not**
regressed it: **14 failures in 120 executions of that test on `main`** (≈12%),
with three consecutive runs on one unchanged checkout giving `48 passed`, then
5, 5 and 3 failures.

The assertion is
`expect(panels.filter((count) => count > 0)).toHaveLength(0)` — **no pending
panel appears while the refill runs** — which is Story 3.9's promise that _a
refill is quiet_, against ADR 0028's measured **160 ms** cover threshold.
**Neither number is a tuning knob and neither should be relaxed to make this
green.**

**The mechanism is a hypothesis, not a measurement**, and is recorded as such:
the failing page's snapshot contains the **full 518-row universe table**,
because `/securities/:symbol` renders the Explorer shell — and `CLAUDE.md`
already records that every cold load of that route spends one main-thread task
of **50–76 ms**, that it is the table rather than the chart, and that it is
**Epic 14's by name**. A 160 ms threshold sitting on top of a documented
50–76 ms task that lands at a variable moment is a plausible source of a ~12%
flake. Nobody has measured where the 160 ms actually goes.

`Re-measure:` `pnpm e2e e2e/specs/security-gap-fill.spec.ts --repeat-each=6`
**four times on one checkout, on a machine below load 4** — and count failures
per execution rather than per run. A single `--repeat-each=6` is worthless
here: at 12% it comes back clean 46% of the time.

**Owner: a condition rather than a story number — the first task that measures
where the security page's refill spends its 160 ms**, which is the same
measurement Epic 14 owes for the cold load and should be taken once for both.

---

## What was done — 2026-09-26

### The spec — `e2e/specs/overview-proxy-live-update.spec.ts`

Four tests, **4 passed (6.6 s)** scoped and green in the full suite. Every
figure it asserts is one **it served**, on its own `overview` frame, so nothing
depends on the store.

**Why `pnpm store:bare` was not needed, established by instrument rather than
argument.** The landing route makes exactly three backend calls —
`GET /health`, `GET /market-data`, and the market-stream socket (plus Vite's
HMR socket, **counted by URL** per Task 3.11.2's lesson). The spec serves two of
the three and asserts nothing that reads `/health`. `/` never touches the store,
so CI's bare shape cannot change a single assertion.

The harness reproduces the gateway's **real** sequence — empty snapshot plus an
unscoped overview on connect, then a scoped snapshot and an overview per
`subscribe` — which the strip needs, because its symbols come from the first
overview frame. Narrowness is inherited and made **mechanical**: one `VENUE`
value feeds `GET /market-data`, the `feed` frame and the overview's `feeds`, and
`push` **throws** for a symbol the page has not subscribed to.

**Two findings about what does not transfer from the universe-table spec.**

- **Its "moves nothing else" assertion fails on the product working
  correctly.** Written as a whole-cell comparison, the test went red because the
  moment SPY moves to 14:02 the three cells still at 14:01 are _behind the
  newest observation_ and each correctly grow `from 14:01`. **The strip's third
  row is a relative exception; the table's `Last` cell is not.** The spec asserts
  the figure row unchanged **and** the exception appearing.
- **The chrome cannot be pinned to `live`.** A bar on a fixed instant is weeks
  old and staleness is 60 s of wall clock, so the cell reads `STALE` — which
  Task 3.10.9's instrument once reported as a defect before working out the
  chrome was right. Producing `live` would put a 60 s threshold under every
  reading, so the word is matched as a **set**, because the claim under test is
  _one home_ rather than which word.

### The grid — 80 photographs, and one pair that is one state

`.capture/proxy-states/`: **16 states × 4 widths, plus greyscale at 1440**, with
`readings.json` carrying the strip text, the note text and the feed-cell text
per state per width. Every row produced through the shipped socket path.

Compared as strings: **one identical pair, and it is documented as one state** —
`overview === undefined` and `figures: []` differ only in how long it is honest
to wait, and `MarketProxyStrip`'s own docblock says _"They are one state on
screen, because what a reader can see is identical."_ Two further states are
identical on the strip **and** the note and told apart by the **chrome** alone
(`all-stored-one-session` against `no-provider-configured`), which is ADR 0029
working rather than failing: the connection and the venue have one home.

No state's strip text differs across widths. Greyscale at 1440 confirms `▲`/`▼`
plus the sign carry direction with no hue.

### Entry 13's second half had never been run, and it found two missing states

Entry 13 asks two things. The first — _was every row reached by producing it_ —
is satisfied by construction here. **The second, walking the producers, had
never been performed in this repository**, and doing it against **Task 4.2.6's
seven-row table, published four days earlier**, found **two reachable states
with no row**:

- an observed figure with **no measurable change** — the strip shows a bare
  price and the source note collapses to `COMPUTED …` alone;
- **two bases disagreeing** — `sharedBasis` correctly drops the clause.

**Both ship today and neither was named.** A grid is incomplete far more
quietly than it is wrong. The verdict is written into entry 13 beside 3.10.9's.

### The two owners-by-condition

**`EPIC.md`'s _a named region says something when its subject is missing_ —
discharged mechanically, and re-armed.** 4.2.5 met it in substance but shipped
no assertion; test 4 produces exactly that state — a socket answered with the
connect snapshot and **no overview frame ever** — and asserts the region says
`No prices yet.` with all seven regions non-empty. The general form re-arms for
**the next route that adds a region with a subject**.

**Entry 13's sibling — discharged by construction, re-owned, and it is what
found the two missing states above.**

### The deployed sweep is an absence rather than a rot

`e2e/specs-deployed/` names **no region on the landing route**, so the rename
had no second copy to miss. But `security-explorer-journey.spec.ts` asserts for
the **other** route that every region is present and says something, and **the
deployed store is the only place the strip's live states occur at all** — on CI
every proxy is `unknown` for ever. Recorded as the **fourth occasion** on the
two-directories entry, with the decision handed to Task 4.2.9.

`Market proxies` is now a **homonym** — this region, the universe table's group
heading, and a rail link. Consistent rather than colliding, but any future
region locator on `/securities` must be scoped.

### Gates

`pnpm verify` exit 0 — **35 invariants hold**, 470 documents / 0 broken links,
shared 345 / backend 973 / frontend 1,225 / process 41, no `Unhandled Errors`.
`pnpm e2e` **170 passed, 15 skipped, 0 failed (2.7 m)**.

**Neither characterised flake fired, and that is not evidence either is fixed** —
at ~12% per execution a clean run is the likelier outcome, which is the entry's
whole point. Nothing was re-run to chase a colour and the 160 ms threshold was
not touched.

## For a stakeholder — a status report, 2026-09-26

### What this was

**Proving the four figures work, and writing down what we still cannot prove.**
A browser test now drives a real price into the page and checks it changes; and
sixteen different states of the strip were photographed at four screen widths,
including in greyscale, to confirm no two of them look the same to a reader.

### What we found

**A catalogue of states we published four days ago was already missing two of
them.** Our own standing rule says a list of states must be checked from _both_
ends — by producing each one, and by walking the code to see which states it can
produce. Only the first half had ever been done, here or anywhere. Doing the
second half found two states that ship today and appear in no list.

The line worth keeping: **a catalogue is incomplete far more quietly than it is
wrong.**

### One test that failed because the product was right

Copying an existing test for the 518-row table onto the new strip made it fail —
and the product was correct. On the big table, a row that has not updated shows
nothing extra. On the four-figure strip, a proxy that has not updated _correctly
gains a line_ saying how old it is. The test was asserting an absence that
should not exist.

### What we wrote down rather than fixed

Four known weaknesses, none of them caused by this work: a focus outline clipped
by a few pixels at the top and bottom of every screen; a text size in the page
header that renders larger than its stylesheet says, which matters because a
layout decision was measured against it; and two browser tests that fail
occasionally for reasons we have now diagnosed rather than guessed. Each has a
named owner and instructions for re-measuring it.

### Where this leaves the work

**One task left** — the decision record, the sweeps and the close.
