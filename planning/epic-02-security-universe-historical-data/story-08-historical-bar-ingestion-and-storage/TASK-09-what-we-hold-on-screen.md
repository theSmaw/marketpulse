# Task 2.8.9 — What we hold, on screen

**Status:** Not started
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.8

## Objective

Make this story visible. `/securities` renders 518 rows of curated metadata today (101 until Task 2.8.2 re-curated the universe to the S&P 500); after Task
2.8.8 the database holds roughly ten million bars behind those rows and **nothing on any screen
says so**.

This task puts the store's own statement on the page: for each security, **how much history we
hold and how far back it goes** — read from Task 2.8.4's ledger rather than computed by scanning
bars.

**The scoping call is taken here rather than left to Story 2.14**, and the reason is delivery
rather than architecture: this story is nine tasks with one visible change in it, and deferring
the only demonstration of ten million rows to two stories later is how a run of invisible work
ends with nothing to show. Story 2.14 still owns the epic's provenance and partial-state pass;
this is one column and one sentence.

## What the user can see when this lands

**The first time this product says anything about market data it holds.**

`/securities` gains a coverage column. A row that reads

> `NVDA · NVIDIA Corporation · Semiconductors` — **1y minute · from 3 Sep 2025**

is the first sentence in this application that is about the market rather than about our own
configuration. The summary line above the table gains the aggregate: **how many securities have
history, how many bars in total, and through when.**

This is the demonstration for the whole story, and it is worth showing to a stakeholder in
exactly those terms: _the list you saw two weeks ago is the same list, and now each row knows
what we know about it._

## The contract

`GET /securities` already returns an envelope with per-field-group provenance
(`securities-response.ts`), and the extension is a **coverage record per security** — optional,
because a security with no bars has none and **`undefined` is the honest answer rather than a
zero**.

Four rules from Story 2.4's own decisions carry over unchanged and one is new:

- **The `satisfies` guard is applied at every level**, and it **does not reach into a nested
  object** — Task 2.4.2 found that the hard way and applies it three times. A coverage record is
  a fourth nesting and needs its own.
- **A `["string", "null"]` schema type where a value is genuinely nullable.** Task 2.4.2
  measured that a plain `"string"` turns a genuine `null` into the **empty string** on the wire,
  which is a silent lie rather than a formatting problem.
- **`status` is NOT filtered on this path.** An `untracked` security keeps its history and the
  page shows it — `UNIVERSE.md` §12.2 puts this reader on the do-not-filter side, and a row that
  reads `NO LONGER TRACKED` beside `1y minute · from 3 Sep 2025` is exactly right: we stopped
  tracking it, and what we stored is still what happened.
- **A predicate ships with its first reader**, so `isSecuritiesResponse`'s coverage half is
  written here rather than speculatively.
- **New: the coverage figures come from the ledger, never from the bars.** A page that
  `count(*)`s ten million rows to render a list is the thing the ledger exists to prevent, and
  it would be measured in Story 2.9's response-time work as a mystery.

## What to render, and what not to

**Two facts and no more: the depth of history and where it starts.** Everything else the ledger
holds — the exact bar count, the resume point, the last attempt — is diagnostic and belongs
nowhere near a list of securities.

- **The depth is a duration, not a bar count.** `1y minute` reads; `98,120 bars` does not, and it
  invites arithmetic nobody wants to do in their head. The aggregate line can carry the total,
  because a total is a scale claim rather than a per-row fact.
- **The start is a date, formatted by hand.** Task 2.4.4's rule: `toLocaleTimeString` and its
  relatives change width when a locale changes what they include, which is exactly what
  `tabular-nums` cannot fix. A market date is a `YYYY-MM-DD` on the wire and a fixed-width
  rendering on screen.
- **Nothing is red and nothing is green.** §36 and the design language both: a security with no
  history is not a failure, it is a security we have not backfilled. It gets the same treatment
  `checking` gets in the chrome — a neutral placeholder and a word — rather than an alarm.

**And say what is missing rather than implying completeness.** If Task 2.8.7's report knows a
security has failed sessions, the honest rendering is not a percentage in a table — it is the
absence of the confident sentence. Reserve the diagnostic detail for the report and let the page
say the true simple thing.

## The design, which is an acceptance criterion rather than polish

The standing bar applies: **it must look designed rather than defaulted, and it must never read
as a generic admin panel.** Two specific opportunities here, because a coverage figure is the
first thing on this page with a **magnitude**:

- **A coverage bar is the obvious idea and is probably wrong.** Every row would have a
  near-identical full bar, because the backfill fills every tracked security to the same depth —
  so it encodes nothing, occupies a column, and reads as a progress indicator for something that
  is not in progress. The variation worth showing is the **exceptions**: the security that
  starts later because it listed in 2024, the one with no history at all.
- **What the design should make legible is the outlier**, which means the default row should be
  quiet and the unusual row should not. That is the same argument Task 2.6.7 settled about
  weight and hierarchy rather than ink: standing out is a job for typography, and the one thing
  it is never a job for is a colour below the contrast floor — `--palette-amber` measured
  **1.73:1** at 12px on the page ground, worse than the `--ink-disabled` that caught Task 1.12.4.

Existing components come first: `Marker` owns the silhouettes, `type.module.css` owns
`.microLabel`, and a fourth component holding the marker language by imitation is a cost this
repository has already stated twice.

## Accessibility, which this page has a specific history with

- **The table's one live region already exists** and is a `role="status"` that is **never
  unmounted** — Task 2.4.5 built it after finding that putting `aria-live` on the loading
  paragraph meant the page announced that it had started and never that it had finished. A
  coverage column changes what that sentence should say, and the rule is that it stays one
  sentence written to be **heard**.
- **`Region` takes `tabIndex={0}` on every region** because a scrolling box that cannot be
  reached by keyboard is unreachable content — the `scrollable-region-focusable` defect the CI
  gate found on its first run, which had stood for five stories and which reproduces at a
  viewport 160px shorter. A new column makes the table wider; check it at 1280, 560 and 480.
- **The axe gate is a gate here**, and its baseline for this page is `0 violations / 35 passes /
1 inconclusive (th-has-data-cells)` — the inconclusive being axe declining to judge a
  `scope="rowgroup"` band, not a finding. **Re-take it rather than citing it**, and remember
  `support/axe.ts` waits for finite animations first, because the gate once reported 203
  contrast violations on a correct page by measuring a frame of a 240ms entrance.

## Work

- The coverage record in `packages/shared/src/securities-response.ts`, its schema entry, its
  `satisfies` guard and its half of the predicate
- The repository read: one query against the ledger, joined to the universe, **never a scan of
  `market_bars`**
- The column, the summary aggregate, and the no-history rendering
- Storybook: the states that cannot be reached in a browser without breaking something — a
  security with no history, one with a later start, an untracked security with history — as
  **chosen rows rather than a cartesian product**, which is `AppHeader`'s convention since Task
  1.12.5
- Component tests, and a browser journey in `e2e/specs/` asserting the coverage line renders for
  a known security. **Assert on a role and an accessible name rather than on a bar count**, for
  the reason no test anywhere asserts a real bar count against `minuteBars`
- A deployed assertion **only if it clears `specs-deployed`'s bar** — something no other
  instrument can see. The candidate is that the deployed page's coverage figures come from the
  deployed database rather than from a local one, which is a real claim; a second assertion that
  a number is a number is not
- The axe reading at three viewports, in every state

## Done when

- The deployed `/securities` says how much history each security has, and the figures reconcile
  against the deployed database read directly — Task 2.4.6's method
- A security with no history renders honestly rather than as a zero
- An untracked security shows its stored history, which is the invisible predicate not being
  applied on a read path
- The axe reading is unchanged from Task 2.4.5's baseline at three viewports
- `pnpm verify` is exit 0, `pnpm e2e` passes, and the artefact's move is explained rather than
  noted

## Notes

The temptation is to make this page a data-quality dashboard, because after Task 2.8.7 there is
a lot to report. Resist it: this is the **Security Explorer**'s list, its reader is somebody
choosing a security to look at, and what they need to know is whether there is anything to look
at. The failed sessions, the thin minutes and the outcome histogram are an operator's concern and
they have a command.

The one sentence to get right is the one about a security we hold nothing for, because it is the
sentence a first-time viewer is most likely to see if anything went wrong — and §36's rule is
that it degrades locally and says what it knows, rather than reading as a fault.

---

## Amended 2026-09-08 by Task 2.8.4 — the read this task needs already exists, and one field does not

**`listCoverage()` on `MarketBarsRepository` is the query this task's Work list describes** —
one statement against `bar_coverage` joined to `securities`, ordered by symbol then timeframe,
returning a few hundred rows regardless of how many bars exist. It never touches `market_bars`,
which is the property this page's figures depend on. What is still owed here is the wire
contract, the shape on the page and the render; the repository read is not new work.

Each `BarCoverage` carries `symbol`, `timeframe`, `covered` (a `TimeRange`), `barCount` and
`updatedAt` — so **the depth of history and where it starts** are `covered.end − covered.start`
and `covered.start`, both available without a second query.

**One correction to the body:** it lists _"the exact bar count, the resume point, the last
attempt"_ as diagnostic fields to keep off the page. There is no last-attempt field — Task 2.8.4
refused one outright, because it would be a date that always says today and therefore
permanently silent about staleness, which is the trap `UNIVERSE.md` §11 records. The resume point
is not a field either: it is `covered.end` or `covered.start` depending on the walk's direction,
read off the range rather than stored beside it. So the diagnostic fields to keep off the page
are the **bar count** and `updatedAt`, and the instruction is otherwise unchanged.

**And one property worth using rather than re-deriving:** `updatedAt` moves only when the ledger's
statement actually changed, so it is honestly "when what we hold last changed" rather than "when
the backfill last ran". If this page ever wants to say something about freshness, that is the
field — and it is the reason it is safe to say it.

---

## Amended 2026-09-08 by Task 2.8.6 — two rows per security, and one honest rendering that is now producible

The backfill shipped, so the ledger this task reads has real content and three things about its
shape are now facts rather than expectations.

### 1. `listCoverage()` returns one row per `(security, timeframe)`, so this page has to choose

Measured after a run: **519 ledger rows for 518 securities** — one `1m` row each plus one `1d`
row for the symbol a daily backfill was run against. Once Task 2.8.8 fills both timeframes it is
**1,036 rows for 518 securities**.

The body's worked example reads `1y minute · from 3 Sep 2025`, which implicitly picks the minute
row. **That is the right choice and it should be stated as one**: the minute series is what every
chart in Epics 4, 5 and 12 reads, the daily series is a different depth (2024-01-01) and putting
both on one line makes a row that nobody can scan. The daily depth belongs on the per-security
route Story 2.11 owns, beside the chart that uses it.

So: pick `1m`, say so in the code, and render **nothing rather than a zero** for a security whose
minute row is absent — which is the rule the body already states for a security with no history
at all, applied one level down.

### 2. "How far back" is `covered.start`, and the backwards walk is what makes it meaningful

Task 2.8.6 walks **backwards from the most recent session**, so a partially-filled security has a
covered range whose `end` is recent and whose `start` is however far the run got. That is exactly
the shape this column wants: `covered.start` is _"from"_ and it moves earlier as the store
deepens, while `covered.end` stays pinned to the frontier.

The consequence worth designing for: **during a backfill, and after an interrupted one,
securities legitimately have different depths.** That is not a fault state and must not render as
one — it is the store being partially filled, which §36's rule says degrades locally and says
what it knows.

### 3. The outlier this page should make legible now has a name and a cause

The body predicts that a coverage bar is probably wrong because _"the backfill fills every
tracked security to the same depth"_, and that the variation worth showing is the exception. Two
exceptions are now producible rather than hypothetical, and they are different from the ones the
body guessed at:

- **A security blocked by `CoverageGapError`.** The backfill drops it from the rest of the run
  and it stops extending, so it sits at a shallower depth than the other 517 **permanently**,
  until somebody acts. This is the row the design should make findable.
- **A security with a genuinely shorter history**, because it listed inside the window. The body
  already names this one and it is the benign case.

They render identically from the ledger alone — both are just a later `covered.start` — which is
the argument for the page saying the **true simple thing** (how much we hold) and leaving _why_
to Task 2.8.7's report. Do not try to distinguish them here; the body's instruction to reserve
diagnostic detail for the report is right, and this is the specific case that will tempt somebody
to break it.

**One figure not to render, measured.** The mean is **364.3 bars per security-session** rather
than 390, so a percentage against `minuteBars` reads ~93% for a completely healthy store. That is
a liquidity fact, it is not completeness, and it must not appear on this page as either.
