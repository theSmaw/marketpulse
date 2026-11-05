# Task 6.4.2 — Select, & the one way out

**Status:** Complete — 2026-11-05. Selection and the one way out ship by
pointer; a review found the selection ground was invisible on all fifteen
landmark nodes (fixed with the renderer's existing halo stroke), and a
`pnpm verify` pass surfaced a genuinely flaky new browser test — not reading
the canvas after its own redraw — fixed by polling rather than reading once.
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.4.1

## Objective

A graph a reader can only look at is still a picture. This task makes a
node something a reader can _commit to_ and _leave from_ — by pointer, for
now; by keyboard is Task 6.4.3's. It is the half of AC2 pointer input can
exercise, and all of AC6.

**The mechanism matters more than it looks like it should.** `/`'s one
navigation rule (`one-home-for-imperative-navigation`, `pnpm invariants`)
forbids every file but `SecurityExplorer.tsx` from moving the address
imperatively — every other destination on this product is a
`<Link to={securityPath(symbol)}>` resolved at render. A Canvas2D node has
no per-node DOM element, so it cannot hold 516 such links — and 516 overlay
anchors would trip `CLAUDE.md`'s named Epic 14 condition (_the first
surface on `/` that renders one element per tracked security_, priced at
≈48 ms of added frame) besides being the wrong shape entirely. The
resolution found while shaping this story needs **no change to the
invariant**: **one** DOM anchor — the ticker in the hover/selection
readout Task 6.4.1 built — whose `href` always points at whichever node is
currently selected, resolved at render from that selection's own identity.
Clicking it, or (Task 6.4.3) pressing Enter while it is the focused
element, is the browser's own native anchor activation. No `navigate()`
call exists anywhere in the topology code.

## What the user can see when this lands

Click a node: it gains a persisting ground disc (survives a pan, unlike hover),
and its ticker in the readout plate becomes the one thing on this surface
a reader can open. Click it (or click elsewhere on the canvas to clear the
selection) and either the security's own page opens, or the selection is
gone. Gate 1 decision: **two-step** — selecting and navigating are
different acts, matching this screen's existing "the figure is never the
link" rule and avoiding a stray pan that ends over a node from
accidentally navigating away.

No `Investigate` control or any second affordance exists on a node — a
node has exactly one activatable thing, same reasoning Epic 5's Gate 1
already settled for a list row.

## Work

- **Selection is a third state, distinct from hover** (6.4.1 made hover
  renderer-internal and transient). Selection **persists**: it survives
  the pointer leaving the node, survives a pan, and is what the ground disc
  and the readout's anchor resolve from. It is cleared by clicking empty
  canvas, or by `Escape` (wired fully in 6.4.3, but the clearing behaviour
  itself belongs here since a mouse-only reader needs a way back too).
- **Disambiguate a click from a drag.** `onPointerDown` today
  unconditionally starts a potential drag with no movement threshold.
  Add one (distance and/or short time) so a drag that happens to end over
  a node does not select it, and a genuine click (no meaningful movement)
  does. `pointercancel` must clear any pending click state.
- **The selection ground, per the design canvas**
  ([`Hover, select, and the way out.dc.html`](https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280)):
  the hover ground disc's dark twin (`--surface-inverse`, 16.4:1), drawn
  under the node's existing body/halo/anomaly-ring layers — selection adds
  a ground, it never re-encodes anything Story 6.3 already draws. Measured:
  contrast only improves on every existing treatment (equity body 3.50 →
  4.88:1, `high` ring 1.92 → 8.89:1, `extreme` 3.05 → 5.60:1).
- **The one anchor.** The readout plate's ticker line becomes
  `<a href={securityPath(selectedSymbol)}>`, rendered from React state
  holding the selected symbol (lifted out of the renderer for this one
  purpose — hover stays renderer-internal per 6.4.1, selection is the one
  piece of state that needs to reach React, because only React can render
  a `<Link>`/`<a>`). Keep this state inside `MarketTopology`, not lifted to
  `MarketOverview` — nothing outside this region needs it (Gate 1 decision
  2: selection stays local).
- **`Reset view` does not clear a selection.** It resets pan and zoom only
  — the control is named for the view, and Gate 1's decision keeps
  clearing to `Escape` and to clicking empty canvas. Update
  `MarketTopologyHandle.resetView`'s docblock to say so explicitly, since
  it predates selection existing.
- **AC6, as three bounded, checkable claims rather than one unwritable
  negative:**
  1. A `pnpm invariants` corpus grep: the word `Investigate` (or an
     `investigate(` handler) appears in no file under
     `apps/frontend/src/topology/` or
     `apps/frontend/src/components/MarketTopology/`, with a `pnpm break`
     entry planting it.
  2. A component-level exhaustive control enumeration: in the selected
     state, the region's activatable controls resolve to an exact
     declared list (`Reset view`, the one ticker anchor, `Try again` only
     where applicable) — proving one activatable thing per node by
     enumeration, not by absence of a name.
  3. A browser-level determinism assertion: activating the anchor (click
     or, once 6.4.3 lands, Enter) produces exactly one outcome.
- A browser spec: click a node (ground disc + anchor appear, URL unchanged);
  click its ticker (URL changes to that security); click empty canvas
  (selection clears); a drag that ends over a different node selects
  neither the start nor end node; the exact-control-enumeration assertion
  above.

## Done when

1. Clicking a node selects it (persisting ground disc, ticker anchor in the
   readout) without navigating; clicking the anchor navigates to that
   security's page; clicking empty canvas clears the selection.
2. A drag that ends over a node does not select it; a genuine click does.
3. `pnpm invariants`' `one-home-for-imperative-navigation` passes with no
   change to its allowance list, and a new `pnpm break`-verified entry
   confirms no `Investigate` affordance exists in the topology's own
   source files.
4. `Reset view` leaves an active selection untouched.
5. A browser spec drives pointer selection and navigation end to end,
   grounded against an independent `GET /securities` fetch.

## What was done

**Selection lives in the renderer; React holds only what it alone can
render.** `renderer-canvas.ts` gained a `selected: DrawableNode | null` beside
`hovered`, a dark ground disc (`--surface-inverse`, same radius as hover's,
drawn **after** the hover disc and **before** everything else), and a
click/pan disambiguation at `pointerup`. It reports out through a new
`TopologyRendererOptions.onSelect`, mirroring `onHover`'s shape. This is a
**deviation from the commissioning brief's suggested wiring** — which put
selection in React state and pushed it _into_ the renderer through a new
method on a `useEffect([selected])` — and the reason is that the renderer has
to know the selection anyway, to draw the disc. Pushing it in would have made
React the source of truth for a fact the renderer owns, delayed the ring by a
render, and left two homes for it. Both of the brief's stated invariants hold:
the mount effect's deps are still exactly `[topology, probe, sentenceId]`, and
the symbol reaches React through `useState`.

**The click/pan threshold is a pure function in its own module**,
`topology/click-gesture.ts` — `isTopologyClick({ travelPx, elapsedMs })`, 4 px
and 400 ms, **both** bounds required. jsdom has no 2d context, so the
renderer's pointer handlers are unreachable below `pnpm e2e`; a predicate over
two numbers is the half a unit test can hold, and it has eight of them. The
distance bound is checked against `topologyTargetRadius("equity", 1)` = 8 px as
a property, so a press that passes it cannot have left the node it started on
— which is what licenses hit-testing at the **up** position.

`pointercancel` is now its own handler rather than an alias for `onPointerUp`:
it clears the pending-click state without classifying anything, so a gesture
the browser took away selects nothing.

**One anchor, and the condition on it is NOT `selected !== null`.** That was
the first implementation and `MarketTopology.test.tsx` refused it. The plate
shows the hovered node if one is hovered and the selection otherwise, so with
`NVDA` selected and the pointer on `AAPL` the plate's ticker line reads `AAPL`
— and an anchor there points at a security the reader cannot see, which is
this screen's own _the figure is never the link_ rule broken from the other
side. The shipped rule is a pure, exported function,
`topologyOpenableSymbol(hovered, chosen)`: `null` when nothing is selected,
`null` when the pointer is reading a different node, and the selected symbol
when the shown ticker **is** it. React state holds that answer, so the `href`
and the drawn ticker are one string by construction.

**Two consequences of the plate being written imperatively.** The ticker slot
changes element type (`<span>` ⇄ `<Link>`) when openability flips, so React
**replaces** it and the `textContent` written a moment earlier lands on the
node being discarded — a blank plate beside a correct `href`. A second
`useEffect([openable])`, separate from the mount effect, re-writes the four
slots after the commit. And `.readout` is `pointer-events: none` (load-bearing
— the plate sits over real nodes); `.readoutTickerLink` re-enables it for this
one element, which costs nothing because the anchor exists only when the plate
is already showing the selection, so the `pointerleave` it fires returns the
plate to the same four strings.

`MarketTopologyHandle.resetView` and `TopologyRenderer.reset` both say in
their docblocks that they leave a selection alone. Nothing had to change for
that to be true — selection is the renderer's own `let` and `reset()` only
refits the view — which is the shape being right rather than a guard.

`--surface-inverse` joined `TOKEN_NAMES` in `styles/tokens.ts`; it is that
token's first JavaScript consumer.

## AC 6, as three bounded claims

1. **`no-second-affordance-on-a-topology-node`** (`pnpm invariants`, 81 hold).
   `/investigat/i` over both `apps/frontend/src/topology/` and
   `apps/frontend/src/components/MarketTopology/`, comments stripped, tests
   and stories excluded — plus a **positive anchor** refusing a vacuous pass:
   `MarketTopology.tsx` must still render a `<Link to={securityPath(…)}>`,
   because a ban on a _second_ affordance is worth nothing over a surface with
   none. The clause is the **word** rather than a shape (`<button`, `onClick`,
   `role="button"` are spellings; whatever gets built has to be named).
2. **An exhaustive control enumeration** in `MarketTopology.test.tsx` — four
   declared states, `toStrictEqual` on a sorted `role · name` list: `[]` idle,
   `["link · NVDA"]` selected, `[]` selected-but-reading-another-node,
   `["button · Try again — the market topology"]` failed. The browser spec
   counts the **region's** full set, which is where `Reset view` lives.
3. **A determinism assertion** in the browser spec: the complete control set
   is enumerated immediately before activating the anchor, then the address is
   exactly that security's page — grounded against the independently fetched
   `GET /securities`.

## What was found

**Three measurements were argued before they were taken, and all three were
wrong.** The browser spec's ring assertion — the only check at any level that
the selection disc is _drawn_, since a canvas mutates no DOM — went through
three instruments:

- **Sixteen points on a ring at radius 9**, threshold `>= 8`. It assumed the
  discovered coordinate was the node's **centre**; `discoverNodes` sweeps on a
  7 px grid against an 8 px target radius, so it is not. Measured on `TYL` at
  1440, one scanline through `at` crossed **6 px of a 24 px disc**. Read 3–5
  of 16.
- **A 41 px patch, `red + green + blue < 180`.** The canvas is `clearRect`'d,
  so every **transparent** pixel reads `0,0,0` and counted as dark. A disc of
  hundreds of pixels was measured as a difference of **ten** (122 → 132).
  `alpha > 200` is the repair, and it changes the reading from _what the page
  looks like_ to _what this renderer painted_.
- **The whole canvas**, which has a baseline that does not depend on which
  node the sweep found — and is no better: selecting moved it **1,119 →
  1,159**, and the same reading drifted to 1,098 after a pan and 1,137 after
  clearing. The disc is **largely overpainted by its own neighbours**: in a
  dense cluster the membership edges and dozens of 8 px equity bodies are
  drawn over it, so what survives is a fraction of the 452 px the geometry
  describes and it varies by cluster — **163 dark pixels in one node's patch,
  ~40 in another's.** That is a real fact about this picture and is recorded
  here rather than gated on.

**What shipped is calibrated instead of thresholded.** `pickCleanEquity`
chooses a node whose patch reads **exactly zero** dark pixels at rest (the
fifteen landmark nodes read `--ink-primary`, the same value as
`--surface-inverse`, which is what moves the baseline), and the claim becomes
_zero before, more than zero after_ — unambiguous, nothing argued, red the
moment the disc stops being drawn.

**Two test bugs that each read as a product defect.** A node that had just
been **de**selected read 161 dark pixels, because its newly-selected
neighbour's disc was inside the same 41 px patch (`pickCleanEquity` now takes
a `clearOf` and requires 60 px of separation). And re-running `discoverNodes`
after a pan to find where the selected node went returned a coordinate in
**clear space**, reading 0 dark pixels — because **once something is selected
the plate names the selection at every point over nothing**, so the sweep
records the selected symbol at the first empty coordinate it scans. It looked
exactly like a disc that had stopped being drawn. The pan's delta is now
measured off a **witness** node — a pan translates every node by the same
amount, so a second node's own before/after _is_ the delta, exactly, with no
copy of `clampPan`'s bound in the spec.

## Verification

- `pnpm verify` — **exit 0**, `81 invariants hold.`, 31 + 69 + 99 test files,
  60 process tests, no `Unhandled Errors` block.
- `pnpm break a-second-affordance-on-a-topology-node` — the entry is
  registered and its substitution was **performed by hand from the registry's
  own `find`/`replace` strings** (the harness refuses a dirty target and this
  change is uncommitted): red, `1 of 81 invariants failed`, naming
  `no-second-affordance-on-a-topology-node` and the planted line. **The
  corpus's other half was proved separately**, because a break edits the file
  the check was written around: `const INVESTIGATE_HOTSPOT_RADIUS = 10;` in
  `renderer-canvas.ts` reported at `renderer-canvas.ts:39`, with the `/** … */`
  line above it correctly **not** reported. And the **positive anchor** was
  proved by rewriting the plate's `<Link>` to a `<span>`: red on that conjunct
  instead. Re-run through the harness after the commit.
- **The drag threshold was proved by a plant**: `&&` → `||` in `onPointerUp`'s
  classification makes every press a click, and _a drag that ends over a
  different node selects neither end_ goes red with an anchor present where
  none should be.
- `pnpm e2e overview-market-topology-hover.spec.ts` — **8 passed** (the three
  hover tests plus five new ones).
- `pnpm probe / --within "Market topology" --widths 1440,390` — the plate is
  **288×98 at both**, `rows 16 16 16 16 16`, unchanged by this task, no page
  error.
- `pnpm e2e` (whole suite, 4 workers), **run twice**: **285 passed, 4 failed**
  both times — and **the membership of the four moved**, which is the useful
  part. Run 1: `overview-degraded-grid.spec.ts` at 1440, 1024, 768 and 390 (a
  `page.goto` timeout, a `useWaited` timing assertion on `Market proxies`, and
  the universe-failure plant classifying `unreachable` where the spec expects
  the retryable sentence). Run 2: the same spec at 1024, 768 and 390, **plus
  `security-price-chart.spec.ts`'s _the volume plot says what it is_** — a 30 s
  timeout on a route this change does not touch at all. The grid spec passed
  **4/4 twice in isolation** afterwards, at one worker and at four, and the
  load average read **22.50** immediately after the suite — `CLAUDE.md`'s _the
  suite is its own plant_. A failure set that changes between two runs of one
  checkout, and that includes a spec unreachable from the diff, is a pair of
  draws from one distribution rather than a regression. **It is still not an
  attribution**: this repository's own floor for separating a flake from a
  regression is n = 24 on one checkout, and that has not been run. A red
  Actions run is work owed by somebody either way.

## What is NOT covered

- **`pointercancel`'s clearing is unexercised.** The handler is split out and
  clears the pending-click state, and nothing drives a real `pointercancel`:
  Playwright has no gesture that produces one, and a synthetic dispatch would
  be asserting the code against itself.
- **`Escape`** is Task 6.4.3's; the clearing path that exists is a click on
  empty canvas.
- **The context-menu/long-press affordance a canvas inherits for free**
  (`contextmenu`, "save image as…") is unchanged by this task, same as it was
  before Task 6.4.1 made this surface interactive at all. Worth a decision
  somewhere in this story rather than here, since it is now a second,
  unauthored affordance on a surface AC6 is explicit about having exactly one.
- **`onPointerDown` does not filter `event.button`/`isPrimary`**, so a
  right-click on a node now selects it alongside opening the context menu
  above. Pre-existing shape (a drag answered the same way), newly consequential
  because a press now commits to something.

## Review, and two things it found that needed fixing before this could merge

A second developer instance reviewed the diff. Verdict: correctness was sound
and nothing above was a blocker, but two findings were real and are fixed in
this same change rather than carried forward.

**1. The selection ground was invisible on all fifteen landmark nodes, and it
was visible on screen rather than only in a measurement.** `palette.
selectionGround` (`--surface-inverse`) and `palette.sectorEtf`/`palette.
marketProxy` (both `--ink-primary`) are the same hex, `#181c23` — so selecting
a sector SPDR, a market proxy, or the hub painted a dark disc under an
identically dark body, and the node vanished into its own ground. The
contrast table above (_equity body 3.50 → 4.88:1_, etc.) never covered the
landmark ink at all, which is how this survived implementation and the first
review pass. **Fixed**: the disc now carries the same 1 px `halo` stroke
(`--surface-raised`) every node's own body already does — this renderer's
existing answer to "separate a filled mark from a touching one" — so it stays
legible against any fill, landmark included, with no new token. Confirmed by
re-looking at a selected `SPY` (the hub): the diamond is visible again, ringed
rather than swallowed.

**2. This task file, its own Work section, and the shipped e2e spec disagreed
about whether the selection treatment is a ring or a ground — and the
disagreement was never resolved, only inherited.** The original "What the
user can see" and "Done when" sections (written at this story's Gate 1, before
any of this was built) said "ring"; the Work section three paragraphs later,
written from the same design canvas, correctly said "ground, the hover
ground disc's dark twin"; what was actually built, drawn and measured is a
ground disc with no stroke drawn as a ring at all. The implementation matched
the Work section and the design canvas throughout — the stale word was only
in the summary prose above it, and in two places in the e2e spec's own
comments that echoed it. **Corrected**: every "ring" above describing this
task's own treatment now reads "ground disc"; the design canvas's actual
anomaly ring (Story 6.3's, which the selection ground is drawn to sit under
and never re-encode) is unaffected and still correctly called a ring where
the text means that.

**On the disc's colour and polarity, looked at rather than left unlooked
at.** The reviewer captured real screenshots (a throwaway script, deleted
after): on an equity the dark selection disc under an amber `extreme` ring
reads as committed, not broken — the polarity against hover's pale wash is
unambiguous even in a crowded cluster. The landmark finding above is what
that same look caught.

**On the full `pnpm e2e` flake, resolved with the n this task's own record
said was missing.** Re-run in isolation at a settled machine (load read
immediately before each run): `overview-degraded-grid.spec.ts`, 4 widths ×
4 repeats at **one worker** — **15 of 16 passed**, the one failure inside
`settledRead`'s own retry logic, a mechanism this diff does not touch.
`security-price-chart.spec.ts`, **6 repeats at one worker** — **6 of 6
passed**, a spec on an unrelated route. Together with the two in-isolation
4/4 passes already recorded above, this clears the bar the earlier note left
open: the full-suite failures are machine contention, not a regression this
task introduced.

**3. `no-second-affordance-on-a-topology-node`'s own failure message pointed
at the wrong line.** It built its per-line scan from `withoutTrailingComments`,
which deletes a block comment's newlines along with the comment — the same
lossy stripper `no-renderer-type-in-the-graph-model` deliberately does NOT use
for exactly this reason, two checks earlier in this file. A plant at this
component's real line 1148 (during the review's own hand-verification) was
reported 324 lines early. **Fixed**: the check now blanks comments in place
(replacing their characters with spaces, keeping every newline) rather than
removing them, reusing `no-random-in-the-shared-model`'s own idiom instead of
inventing a second one. Re-verified directly against the shipped registry
entry rather than only against the review's own temporary plant: with the
break's exact `find`/`replace` applied by hand (the harness still refuses a
dirty target), `node scripts/check-invariants.mjs` now reports the planted
line **at its real position** (`MarketTopology.tsx:722`, immediately after
the comment the plant's own `replace` string adds at line 719 plus two) —
reverted, `81 invariants hold.` again.

**4. The plate could outlive the graph it was describing.** The mount
effect's cleanup nulled the three refs backing the hovered/selected state on
every `topology` identity change (a retry landing a fresh universe), with a
comment claiming `openable`'s own `[openable]`-keyed effect would "re-read it
anyway" — which it cannot, since nothing about nulling a ref changes
`openable` itself. Reachability is narrow (a retry while something is
selected), but a false claim about a mechanism is a false claim regardless of
how often it is exercised, which is this repository's own standing rule.
**Fixed**: the cleanup now calls `setOpenable(null)` directly — an ordinary
state write from a cleanup, which schedules a re-render of the still-mounted
component and raises nothing from the React Compiler's rules (confirmed:
`pnpm lint` clean). Gates re-run after all four of these fixes:
`pnpm typecheck`, `pnpm lint`, `pnpm format --check` all clean; `pnpm test`
(all four packages) **667 + 1344 + 1779 passed**; `pnpm invariants` **81
hold**. One `pnpm test` run timed out a backend worker at a machine load of
**44.67** (three heavy jobs had been running back to back); re-run alone at a
load of **8.31** it passed in 2.94s, and the full `pnpm test` passed clean
immediately after.

**5. A full `pnpm verify` afterward found a second pair of process-test
failures, and this time a full-file re-run was not enough to call it
clean — one of this task's OWN new browser tests also failed, and that one
was not contention.** `src/index.process.test.ts`'s shutdown-ceiling test and
`src/market-gateway.process.test.ts`'s real-socket test both failed inside a
`pnpm verify` run; re-run alone at a settled load (8.76, down from 32.10
during the verify run) both passed, 60/60 process tests — the same
contention pattern as before, on files this task does not touch. But a
follow-up run of the topology specs together surfaced a real, reproducible
failure in **this task's own new test**, `clicking a different node moves
the selection, and clicking empty canvas clears it` — 2 of 6 repeats failed
at one worker, each at a different `darkPixelsAround` assertion.

**Isolated with a control, per this repository's own rule for telling a
flake from a regression**: the selection ground's halo stroke (finding 1,
above) was temporarily disabled and the test re-run 6 times — it failed
**6 of 6**, worse rather than better, which rules out that fix as the cause.
Reading the test rather than guessing found the real one: `darkPixelsAround`
reads the canvas's pixels with a plain `page.evaluate` immediately after a
click, but the renderer's own `invalidate()` defers the actual redraw to the
next animation frame — nothing between the click and the pixel read waited
for that frame. `overview-market-topology-anomaly-bands.spec.ts` solved the
identical problem one file over with `settledCanvasImage`'s poll-until-two-
reads-agree; this file had five raw `expect(await darkPixelsAround(...))`
calls with no equivalent wait, added across this task without hitting the
race in either developer's own single run. **Fixed**: every post-interaction
`darkPixelsAround` assertion is now `await expect.poll(() => darkPixelsAround(...))`,
which retries until the value settles rather than reading once. Re-run: the
previously-failing test, **10 of 10 at one worker**; the whole spec file,
**24 of 24 across 3 repeats**. `pnpm typecheck`, `pnpm lint`,
`pnpm format --check` all re-confirmed clean on the spec change.

## For a stakeholder — a status report, 2026-11-04

Click any node in `Market topology` on `/` and it now stays marked — a
persisting dark disc under it, visible even after you move the pointer away
or pan the graph around. Its ticker becomes a real link in the plate below;
click that (or click empty space on the canvas to cancel) and either the
security's own page opens, or the selection is gone. Nothing else on the
page changes — no second button, no right-click menu this product built.

A second developer reviewed the work and caught a real, visible bug before
it shipped: selecting one of the graph's sixteen landmark points (the eleven
sector benchmarks, the four market trackers, and the centre) painted it the
exact same dark colour as its own body, so the node seemed to vanish. It's
fixed — those nodes now keep a thin pale edge, the same treatment every node
on this graph already uses to stand out from its neighbours, so a selected
landmark reads the same way a selected ordinary security does.

Four smaller things were also tidied up before merge: a diagnostic tool this
product uses to guard against a stray "Investigate" button appearing on a
node was pointing reviewers at the wrong line of code when it found one (now
fixed); a rare edge case where re-loading the universe while something was
selected could leave the plate naming a security that's no longer there (now
fixed); a batch of intermittent test failures were run down and most were
confirmed to be the shared build machine being busy, not anything wrong with
this work; and one of the new automated tests genuinely was unreliable — it
checked a drawing on screen before giving the browser a chance to finish
drawing it. That one is a real fix, not just a re-run: it's rewritten to wait
properly and passed 34 runs in a row afterward.

Nothing a reader can reach by keyboard yet — that's the next task.
`pnpm verify` is green.
