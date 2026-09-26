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
