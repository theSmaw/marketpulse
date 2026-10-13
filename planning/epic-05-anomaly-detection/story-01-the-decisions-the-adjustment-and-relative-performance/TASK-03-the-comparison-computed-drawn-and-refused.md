# Task 5.1.3 — The Comparison, Computed, Drawn & Refused

**Status:** Complete — 2026-10-13 — the region draws, and the task found three things it was not looking for: the widened rung set cannot be a widening of `SECTOR_LADDER_STEPS` (four ways to get it wrong, all of which compile), done-when 6's "`pnpm verify` would fail on a second copy" was a claim with **no mechanism** until this task wrote one, and the rail's width on the canvas was **324 px measured on the wrong screen** — it is a 453 px column with a 419 px content box
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](STORY.md)
**Depends on:** 5.1.2

## Objective

**This is the story's deliverable and the first thing Epic 5 puts on a screen.**
`Relative performance` stops being a placeholder and draws the security against
its sector's benchmark and the broad market, so a reader can tell a
security-specific move from a tide.

**It is indivisible, and that is a finding rather than a preference.** The
arithmetic is three reads and two subtractions; **the basis predicate is the
only substance in it**; and a refusal state is what that predicate returns. A
task that computed excesses and left the basis test for the next one would ship
the exact defect this story exists to avoid.

**And it needs no backend change.** `SecurityExplorer` already receives
`liveFeed: LiveFeedView` from `App`, and that view already carries
`overview: WireMarketOverview | undefined` — four proxies and eleven sector
figures reach this route today and **are read by nothing there**.

## What the user can see when this lands

**On `/securities/:symbol`, the first of this epic's three reserved regions
fills.** Three moves — the security's, its sector benchmark ETF's and the broad
market's — on **one anchored bar track** against a printed ladder, with **two
derived lines above them** saying _behind by 2.2 pts_ or _ahead by 1.4 pts_, and
a footer saying what the references are.

## Work

- **The pure module.** `asOf` and the figures are arguments; it reads no clock,
  no socket and no repository handle — `marketBreadth`'s shape, which is what
  makes invariant 4 structural here. Probably
  `apps/frontend/src/market/relative-performance.ts`.
- **The three figures, from what is already on the page.** The security's own
  move via `changeFromClose(live, lastClose)` → `LiveChange`, or
  `changePercent(lastClose)` on the stored arm. The two references from
  `overview.figures` (the four proxies, required) and `overview.sectors` (the
  eleven, optional). **Read the move through `moveRankingKey(figure)`**, the one
  home for which field a given state's move lives in, rather than reading
  `changePercent` and `sessionChangePercent` directly.
- **The benchmark, from `packages/shared`.** `SECTOR_ETFS[security.sector]` and
  `SECTOR_LABELS[security.sector]`, both already imported by the frontend.
  **Do not write the eleven tickers anywhere** —
  `one-pairing-of-a-sector-and-its-benchmark` scans comment-stripped shipped
  text for two or more of them outside `security.ts`, in any syntactic form
  including bare identifier keys.
- **The basis predicate, with its three traps.** Two moves are comparable iff
  they are the same kind of move measured from the same close:
  - both `observed`: both carry a move **and** `changeBasis` agrees;
  - both `stored`: both carry a move **and** `session` agrees;
  - **one of each: refuse.** Live-against-a-close moves while somebody watches
    it; close-against-previous-close is a session that is over. Same units,
    different claims — the protocol's own docblock says a renderer reaching for
    the wrong one _"would print Friday's move as today's."_
  - **`changeBasis` absent is a VALUE, not a gap** — it is the same-session case
    measured from `previousClose`, a number with no date beside it. So
    `undefined === undefined` is **correct** for two same-session figures, and
    **`?? ""` or `?? "previous close"` would spell disagreement as agreement**,
    which is the case `sharedBasis` exists to prevent.
  - The security's side is `LiveChange { percent, basis: MarketDate | null }`
    rather than a wire figure, so the join is
    `change.basis === null ? figure.changeBasis === undefined : change.basis === figure.changeBasis`.
    **`MarketDate` is a branded string and `changeBasis` is a bare `string`, so
    a naive `===` compiles and is right — and an inverted `null`/`undefined`
    mapping also compiles and is silently wrong on exactly the days the store's
    last session meets the live session.**
- **The geometry: the excess is the GAP, never a fourth bar.** One track
  anchored at zero; the subject draws a bar; the references draw **ticks on that
  same track**; each excess is the **span between the subject's end and a
  reference's tick**, as a thin bracket in `--ink-secondary`. The picture is then
  literally the subtraction. Reuse `apps/frontend/src/market/ranked-bar.ts` —
  `barFraction` and `ladderTicks` are pure and tested — and **do not reuse
  `RankedList`**: not its ordinal, its ranking, its roving arrow group, its
  quiet group or its held-row padding. Three figures read against each other is
  not a ranking, and **ranking three figures answers the wrong question**.
- **The scale**: the sector rungs plus **`±25` and `±50`**, chosen from
  `max(|subject|, |sector|, |market|)`, **raised but never lowered** within a
  session. **If anything clips, the printed figures stay exact and the bracket
  is not drawn** — a bracket between a clipped end and an unclipped tick is a
  _wrong_ length rather than a saturated one.
- **The derived line**: the unit is **`pts`**, never `%` — the difference of two
  percentages is percentage points. It is **achromatic**, `--ink-primary` with
  the sign and the word, and **no price colour at all**: a security down 4.2%
  against a sector down 6.0% is **ahead while falling**, and drawn green it
  would say the stock rose inside a box whose other three figures are red. The
  word is **`behind` / `ahead`**, not `underperforming` / `outperforming` —
  neutral, short, and it survives _ahead while falling_.
- **Two separately labelled lines, never one prose sentence**, because the
  sector half and the market half **fail independently** and prose cannot be
  half-refused without becoming ungrammatical.
- **The footer, two clauses.** The references' kind — and **reuse
  `SECTOR_CLAIM`'s invariant half from `sector-performance.ts` rather than
  writing a second string**; a second copy of that clause is the defect
  `BarSeriesPanel` shipped for two years. **`SPY` needs covering too and is the
  worse case**: one clause covers both — _both references are
  capitalisation-weighted index ETFs, not averages of their members._
- **The ETF routes** (Gate 1 decision 10): on an `index_etf` the sector half
  does not apply and says so; on a `sector_etf` the security **is** its sector's
  benchmark and the region says that. Both are reachable routes today and the
  type forces the branch.

## Done when

1. `Relative performance` draws three moves and two excesses on one anchored
   track, from figures already on the page, with **no new per-security
   derivation in the socket callback** and no backend change.
2. The basis predicate is a **pure function with unit tests covering all four
   outcomes**, including the two traps: `changeBasis` absent on both sides
   agreeing, and the `null`/`undefined` mapping between `LiveChange.basis` and
   `changeBasis`.
3. **One of each basis refuses the subtraction while both figures still draw** —
   each figure is true; only the derived line is refused.
4. The excess is `pts`, achromatic, and worded `behind` / `ahead`; a clipped
   figure draws no bracket and prints exactly.
5. No ticker of the eleven appears in any new file, and
   `one-pairing-of-a-sector-and-its-benchmark` holds.
6. The footer reuses `SECTOR_CLAIM`'s invariant half; `pnpm verify` would fail
   on a second copy.
7. **A browser assertion exists and asserts no figure** — on CI's zero-bar
   store every entry is `unknown`, so a spec can assert the region's name, its
   landmark, its tab stop and its drawn text, and nothing numeric. Drive a
   recorded or produced stream rather than the furnished harness: Task 4.3.8
   found **four overview specs passing against a server with the ranking
   deleted**, each asserting its own fixture.
8. `pnpm verify` green; `pnpm e2e` green on the specs this touches; `pnpm probe
/securities/NVDA --all` run and the screenshots looked at.

## Amended by Task 5.1.2 — 2026-10-13: the widened rung set is this region's OWN ladder and must not touch `SECTOR_LADDER_STEPS`

The canvas page settled the scale as `±1/2/5/10/25/50`, chosen from
`max(|subject|, |sector|, |market|)` and **raised but never lowered within a
session**. Reaching that by adding `25` and `50` to
`packages/shared/src/sector-ladder.ts` is wrong in four separate ways, each of
which compiles:

- **`SECTOR_LADDER_STEPS` is on the wire.** `WireMarketOverview.sectorLadderStep`
  is validated with `isSectorLadderStep`, so widening the array widens what the
  **sectors region on `/`** will accept and ratchet to — a change to a shipped
  region, from a task that is supposed to need no backend change at all.
- **`LARGEST` is `SECTOR_LADDER_STEPS[3]`**, indexed rather than taken off the
  end, deliberately, so the tuple index carries the rung's own type. After a
  widening that constant still reads `10` and still calls itself the largest
  rung, and `fitSectorLadder` would saturate at `10` while the type admits `50`.
- **`sector-ladder.test.ts` asserts `toEqual([1, 2, 5, 10])`** — so the widening
  announces itself as a red test rather than as a design decision, and the
  cheapest way past a red test is to edit it.
- **`barFraction(percent, step)` and `ladderTicks(step)` take
  `SectorLadderStep`**, so reusing them as-is caps this region at ±10 and is the
  silent version of the same defect: a −23% day would draw a bar clipped at 10
  beside a printed figure of −23.00%, which is exactly the disagreement
  `barFraction`'s own docblock says the saturation rule tolerates **because the
  ladder is printed**. Printed `±10%` under a −23% figure is not a saturated bar,
  it is a wrong scale.

So: a **sibling** rung set in `apps/frontend/src/market/`, its own `fit` and its
own session ratchet held **client-side** (the figures are already on the page and
the frame carries no rung for this region), and either a widened numeric
parameter on the two pure functions or a sibling pair beside them — the
orchestrator's recommendation is to widen the parameter type to a union that
includes both sets and leave `SectorLadderStep` as the wire's own narrower type,
because two copies of `ladderTicks` is two answers to _where the gridlines go_.

Note the midpoint-label rule falls out correctly either way: `ladderTicks` labels
the midpoints only when `step / 2` is an integer, so **±50 labels them and ±25
does not** — which is the rule working rather than a case to special-case.

---

## What was done — 2026-10-13

**`Relative performance` draws.** Seven states, three figures on one anchored
track, two separately labelled differences above it, and a refusal that is a
predicate rather than a flag. No backend change, no new request, and no new
per-security derivation anywhere near the socket callback: the two references
are the join the gateway has been sending since Story 4.2 and which this route
received and read by nothing, and the subject's move is `changeFromClose` over
the universe answer the identity block above already holds.

### The files

- `apps/frontend/src/market/relative-performance.ts` — the pure module. `asOf`
  and the figures are arguments; no clock, no socket, no repository handle.
- `apps/frontend/src/market/relative-performance.test.ts` — 30 tests.
- `apps/frontend/src/components/RelativePerformance/` — `.tsx`,
  `.module.css`, `.stories.tsx` (nine stories, one per state plus the clipped
  one), `.test.tsx` (13 tests).
- `apps/frontend/src/market/sector-performance.ts` — `SECTOR_CLAIM` split so
  the weighting clause is one exported constant.
- `apps/frontend/src/market/ranked-bar.ts` — the parameter widened to
  `BarScaleStep`; `SectorLadderStep` untouched, and
  `packages/shared/src/sector-ladder.ts` not touched at all.
- `apps/frontend/src/market/index.ts`, `apps/frontend/src/routes/SecurityExplorer.tsx`,
  `apps/frontend/src/routes/SecurityExplorer.test.tsx`.
- `scripts/check-invariants.mjs`, `scripts/breaks.mjs` — one new invariant and
  its break, plus a widened exemption on an existing check.

### The basis predicate, and why the subject is read as a WIRE figure

The subject is turned into a `WireOverviewFigure` by `subjectFigure` — an
`observed` one from a live minute, a `stored` one from a session close, an
`unknown` one from neither. That is not a convenience: it makes `moveOf` and
`basisOf` the **only** readers of _which field this state's move lives in_ and
_what was it measured from_, so neither question gets a second answer in this
file. The predicate is then `sharedBasis(left, right)` over two `basisOf`
identities, and all four outcomes are asserted:

- both `observed`, basis agrees — comparable, **including both absent**;
- both `observed`, basis disagrees — refused;
- both `stored`, same session — comparable; different session — refused;
- one of each — refused, **even when the two dates read the same**, because the
  kind is in the identity.

**The `null`/`undefined` mapping is one line and it has its own test.**
`change.basis === null ? {} : { changeBasis: change.basis }` — a spread rather
than `?? undefined`, because `exactOptionalPropertyTypes` makes _absent_ and
_present as `undefined`_ different types and only the first is what the wire
means. The test asserts the figure has **no** `changeBasis` property and that
its identity string equals a reference figure's that also omits one.

`?? ""` is not a hazard **inside `basisOf`'s own encoding** — the empty string
cannot collide with a `MarketDate`, so `observed:` and `observed:2026-10-10`
are distinct — and that is why reusing `basisOf` was the right call rather than
a compromise. The hazard the task names is a default **on the comparison**, and
there is none: the comparison is string equality with an explicit
`undefined` guard, so two keyless figures are refused rather than read as a
comparable pair.

### The rung, and the ratchet's storage

`RELATIVE_RUNGS = [1, 2, 5, 10, 25, 50]` is this region's own, declared in the
frontend module. `barFraction` and `ladderTicks` took a widened
`BarScaleStep = SectorLadderStep | 25 | 50`; `SECTOR_LADDER_STEPS`, `LARGEST`
and `sector-ladder.test.ts` are untouched, so nothing on the wire widened and
no existing test went red. `ladderClause` was widened too, which is a reuse
decision worth naming: it is the **one place the rung becomes a sentence**, so
this region's footer reads `bars to ±25%` — the word _bars_ is loose for one
bar and two ticks, and a second sentence would have been a second home for the
scale.

**The ratchet is component state, keyed on the subject's symbol**, adjusted
during render in the `useArrival` pattern (a ref write during render is what
the React Compiler's `refs` rule refuses). It is client-side with a
**page-session lifetime**, which is the simplest thing that cannot lower within
a session. It is keyed on the **symbol** rather than on a market session,
deliberately: this route re-renders rather than re-mounts between securities,
so without a key a quiet name inherits a ±50 rung from the earnings-day mover
the reader looked at a moment ago — and a market-session key would need a
market clock in a browser, which this region has no business holding.

### The footer, and the check that holds it

`SECTOR_CLAIM` was **split** rather than copied:
`CAP_WEIGHTED_CLAUSE = "capitalisation-weighted, not the average of its members"`
is now the exported constant, `SECTOR_CLAIM` interpolates it, and
`REFERENCE_CLAIM` is `Each reference is a benchmark ETF — ${CAP_WEIGHTED_CLAUSE}`
— one clause covering both references, because `SPY` is the worse case.

Done-when 6 asks for a mechanism and there was none, so
**`one-home-for-the-cap-weighting-clause`** was added — the clause may be
written in exactly one source file, anchored on a literal that must be _found_
so a rewording goes red rather than quiet. Its break,
`the-weighting-clause-written-out`, plants the sentence in
`relative-performance.ts` — **the file the next author writes, not the one the
check was written around**, since interpolating a constant out of a neighbour's
exports is exactly the thing that looks like a layering mistake worth tidying.

`pnpm break` **refuses a dirty target and the target is this task's own new
file**, so the break was proved by hand: the substitution applied, the runner
printed `✗ one-home-for-the-cap-weighting-clause` naming both homes with every
other check still collecting, and the file was restored byte-identical
(`57 invariants hold.` before and after). The registry entry is in place for
the first run against a committed tree.

### One existing check needed widening, and it was re-broken

`one-home-for-the-live-change`'s clause two went red on
`RelativePerformance.tsx`: the component names a `Bar` and a
`SecurityLastClose` because its props are the route's, performs no arithmetic
at all, and hands both to `relativePerformance`. That is the exact shape the
check already exempts for `buildMarketOverview` — _a wiring site that hands
both halves to the one producer_ — so the exemption became a **named set** of
two producers rather than one hard-coded name, with the same
`!/function\s+X\b/` guard that stops it swallowing the declaring module.
`pnpm break the-proxies-do-their-own-arithmetic` was re-run afterwards and goes
red on clause two as before.

### What the route stopped saying

`Relative performance` lost its `filledBy` sentence rather than having it
amended — §71.3's judgement for the third time on this screen, and the reason
is this region specifically: it sits in a column of three, so a caption's
height moves `Anomaly history`. Two route tests encoded the old state and were
updated with the reasoning (`Filled by ` 5 → 4, Epic 5's placeholders 3 → 2,
and the region out of the one-sentence-each list).

### Two findings worth passing on

**The route now holds a SECOND reader of _the resolved security and its stored
close_.** `SecurityIdentity` resolves the same row and the same close from the
same `SecuritiesView`, privately; the route now does it too, for this region's
props. Both are four lines of the same two expressions. A resolver on
`use-securities.ts` is the repair; it is a tidy rather than this task's work
and it is recorded in the route beside the derivation, with a condition: the
next surface that needs the resolved row.

**A held row's label must not be the refusal sentence.** The first version put
`withoutSector` on both the invisible sector row and the derived line, which is
one sentence in the DOM twice — invisible on screen, and a Playwright
strict-mode failure in any spec that locates it, which is the cost
`one-home-for-the-empty-explanation` records for the chart's four sentences.
Caught by the component test, in jsdom, before any browser ran.

### The gates

`pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm stories`
(`43 components, 43 stories files.`), `pnpm links`
(`557 documents, 1819 cross-file links, 39 anchor links, 0 broken.`),
`pnpm invariants` (`57 invariants hold.`) and `pnpm test`
(`440`, `1045`, `1456` tests, three packages, no `Unhandled Errors` block) are
all green.

**Not run, and owed:** `pnpm e2e`, `pnpm probe /securities/NVDA --all` and
`pnpm verify`, which take the heavy-job lock and need a running pair. Every
geometry figure in the stylesheet is therefore **declared rather than
measured** — nothing below `pnpm e2e` computes a layout, so _one height in
every state_ is asserted by construction (every band reserves its own room)
and has **not been seen**. Done-when 7's browser assertion is not this task's.

## The orchestrator's half — 2026-10-13

The developer's record above covers done-when 1–6. These are 7, 8 and the
sweep, and one of them is a correction to a document written this morning.

### Done-when 7 — the browser assertion, which asserts no figure

`e2e/specs/security-relative-performance.spec.ts`, three tests, **3 passed
(7.9s)**. The frames are **produced in the spec** with the shipped encoder, so a
protocol change breaks it at the compiler rather than at an assertion — Task
4.3.8's finding, where four overview specs passed against a server with the
ranking deleted, each asserting its own fixture.

What it asserts: the region's three row labels and the two separately-labelled
derived lines; the reference claim; that `Filled by Epic 5` is **gone** from it;
that it is a tab stop (`expectEveryRegionIsATabStop`, `atLeast: 8`); and —

**the one assertion only a browser can make — that the region is the SAME HEIGHT
with both references observed and with nothing observed at all.** That is the
claim the band-by-band reservation exists to keep, and jsdom can no more see it
than it can see a grid. It needed a harness decision worth recording: the
nothing-state is **unreachable on a store that holds bars**, because the subject
draws a stored move and the region is then drawn rather than held. So the spec
empties `lastCloses` out of the real `GET /securities` body for that arm —
`serveTrimmedUniverse`'s shape, not the helper itself, which samples the universe
down and this spec is about one named security. **On CI that changes nothing**,
because the store has zero bars and `lastCloses` is already empty; which is the
point, since both machines then produce the same two states.

### Done-when 8 — the gates

- **`pnpm verify`: exit 0**, `57 invariants hold.` (plus the printed Epic 4
  waiver). Re-run after the spec and the document corrections below.
- **`pnpm e2e`, the specs this touches**: `security-relative-performance` 3
  passed; `security-explorer-shell` + `backend-failure-states` **12 passed**;
  `security-price-chart` + `security-feed-degraded` **21 passed, 15 skipped**
  (the skips are this store's — `test.skip(… "this store holds no bars")` — and
  predate this change).
- **`pnpm probe`** at 1440 and 390 on the route, and on the `Complete` story at
  both widths; the screenshots were looked at.

**One spec needed editing and nothing else would have caught it**:
`security-explorer-shell.spec.ts` asserts `Filled by /` **×5** and
`Filled by Epic 5 — Anomaly Detection` **×3**. Filling a region moves both, and
that is the spec working — a placeholder that survives the thing it was waiting
for is a screen holding a plan while holding the plan's output. Now 4 and 2.

### The sweep — the rail's width was 324 px and was measured on the wrong screen

`pnpm probe /securities/NVDA` resolves the security page's grid at 1440 to
**453 453 453**. The rail is therefore a **453 px** column with a **419 px**
content box — not 324. At 1024 it is **480 480**, at 768 **352 352**, at 390 one
column of **342**; the landing page's narrow column, a different screen with
different regions, is **342** at 1440. **324 was neither of them.**

Corrected the same day in all three places: the canvas page's specimens are
redrawn at 419 with the correction stated on the page, `VISUAL-LANGUAGE.md`'s
live claim carries a dated block-quote, and Task 5.1.2's record — a historical
record, so amended rather than rewritten — carries an
`## Amended by Task 5.1.3` section.

**The structural claim was verified rather than inherited, and it holds.** At
1024 the two columns sit at x 41 and x 537: `Abnormal-move indicators` (y 293)
and `Relative performance` (y 850) are both in column 2, `Anomaly history`
(y 1482) is in column 1, and `Connected securities` and `Relevant filings` sit
between them at y 1203. The lesson is the cheap one: **a width is thirty seconds
of `pnpm probe` and reads identically whether it was measured or inferred** — in
a task whose own brief said the specimens must be drawn at the rail's _real_
width rather than a comfortable one.

### Sideways — one constraint written into a sibling's file

Eight of the nine sentences this region puts on screen are **copy the owner has
not seen**; only `No comparison yet.` comes from the canvas. They are shipped,
they are named constants, and the decision about whether they are the right words
belongs to **Task 5.1.4**, which owns the states and the fifth noun. Written into
that task's own file as a table of the shipped strings with the three things to
weigh — not as a pointer back here, because a pointer is what a reader follows
when they already know to look.

### What this leaves standing

- **No gated machine and no person has seen a relative move.** CI's store is 516
  securities and zero bars, so every comparison there is `No comparison yet.` for
  ever, and the deployed store produces the complete, silent-reference and
  basis-refusal states only **mid-session**. The four-width greyscale photograph
  through the shipped socket path is Story 5.1's close.
- **Every geometry figure in the stylesheet is declared rather than measured.**
  One height holds by construction and is now asserted in a browser **at one
  width**, 1440. The two places to look first are `.line`'s two-line reserve at
  the rail's real 419 px (does `Measured from different closes` wrap to three?)
  and the two bracket lanes inside the 30 px track.
- **`ladderClause` prints `bars to ±25%` for a region with one bar and two
  ticks.** Reused rather than re-written, because its docblock claims to be the
  one place the rung becomes words. If the noun is wrong that is a wording
  decision for 5.1.4, not a mechanism one.

## For a stakeholder — a status report, 2026-10-13

**The security page's `Relative performance` region now holds figures.** Open a
security and it draws three moves — the security's own, its sector's benchmark
fund, and the broad market — on one track anchored at zero, with two plain-English
lines above them saying `behind by 2.20 pts` or `ahead by 3.78 pts`, and a footer
saying what the two references actually are. It is the first thing Epic 5 has put
on a screen, and it needed no change to the backend at all: all three figures were
already arriving at that page and were being read by nothing.

The region **refuses** rather than guesses. If the security's move is measured
from one close and the benchmark's from another — which happens every day between
the overnight backfill and the next opening bell — it says
`Measured from different closes` and draws all three figures without subtracting
them. Each figure is true; only the arithmetic over them is withheld. There are
seven such states and each has its own sentence.

Three findings came out of it. The widened scale this region needs could not be
added to the shared one without quietly changing a shipped region on the landing
page, in four ways that all compile. A rule the task file assumed was enforced —
that the "capitalisation-weighted, not the average of its members" caveat is
written once — **was not enforced by anything**, and now is, with a break proving
it. And the rail width recorded on the design canvas this morning, 324 px, was
measured on the wrong screen; it is 453. All three are corrected rather than
noted.

**What nobody has seen is this region working against a real market.** Every
figure in every test is one we wrote; the machine that gates our releases holds
no price history at all, so the comparison there is permanently
`No comparison yet.`. A person watching the deployed page during a trading
session is owed by this story's close.
