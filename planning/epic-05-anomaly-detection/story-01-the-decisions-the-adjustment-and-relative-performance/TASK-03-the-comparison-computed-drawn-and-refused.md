# Task 5.1.3 — The Comparison, Computed, Drawn & Refused

**Status:** Not started
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

---

## What was done — 2026-10-13

<!-- written at completion -->
