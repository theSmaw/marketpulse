# Task 7.2.6 — The compare-market (correlation) step

**Status:** Complete — 2026-11-19. **"Derive the window from `asOf`" turned out
to need more than clamping an instant: `baselineWindowEndingAt` takes an
exclusive end and the nightly pass only ever hands it a session boundary, so a
mid-session `asOf` — which is every replayed instant — builds a window ending
on the session `asOf` sits INSIDE, whose later minutes are exactly the future
information invariant 4 forbids. The window is rebuilt from the previous
session's close where that happens, and the unit suite asserts the end is at or
before `asOf` rather than only earlier than the frontier.**
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1, 7.2.4 (for the shared `inapplicable` contract shape)

## Objective

A new on-demand Pearson correlation between the investigated security
and `SPY`, resolved with the Product Owner as this story's reading of
"compare market." Reuses Story 6.5's pure arithmetic only
(`pearsonCorrelation`, `correlationIsSignificant`,
`CORRELATION_MINIMUM_OVERLAP`) and its per-security store reads
(`subjectFor`, `readWindowCloses`, `baselineReturnSeries`,
`seriesIsDiscontinuous`, `baselineWindowEndingAt`) — never its nightly
batch machinery (`selectStrongestCorrelations`,
`accumulateCorrelationInput`, the full-universe sweep), which
structurally excludes every landmark symbol including `SPY` from ever
forming a stored pair. See `STORY.md`'s "Resolved at Gate 1" for the
full reuse record.

## What the user can see when this lands

A row reporting the security's correlation with the broad market — its
**direction** and whether it is statistically **significant**, over a
counted sample of shared five-minute returns — never a raw coefficient
and never an adjective like "strong" or "weak." For `SPY` itself, the
row completes as `inapplicable` (self-correlation is vacuous); for
`QQQ`/`DIA`/`IWM`, a real, computed figure (resolved at Gate 1: `SPY`
only is inapplicable, the other three proxies are genuine measurements).

## Work

- Build `calculate_rolling_correlation` as an `AnalyticalTool<{ symbol,
against }, Output>` — a general pair function, with the `SPY` default
  resolved at the `index.ts` wiring site (`buildInput`), not hard-coded
  inside the tool, so it stays reusable for a later, different pair
  (Epic 10's `get_related_securities`-driven comparisons).
- `Output`: `{ symbol, against, direction, significant, n, lookbackSessions,
feed }` — deliberately **no `r` field on the rendered/wire side**. Keep
  the raw coefficient internal if useful for a unit-test assertion, but
  do not let it reach the wire: printing a coefficient as a figure fires
  `CORRELATION_MINIMUM_OVERLAP`'s own stated reversal trigger, which
  additionally requires a derived precision floor this story does not
  take on.
- Use the `is-the-market-proxy` member of `ToolInapplicability`
  (`packages/shared/src/investigation.ts`), already added by Task 7.2.4
  alongside `no-sector`/`is-benchmark` — the real third `ToolOutcome` arm
  (`{ kind: "inapplicable", because }`), resolved 2026-11-19. Do not
  re-derive the shape; reuse it.
- Reads: resolve the baseline store's covered end → `baselineWindowEndingAt`
  → `subjectFor` for both legs → `readWindowCloses` for both legs →
  **re-run `seriesIsDiscontinuous` on each leg explicitly** (the nightly
  pass inherits this verdict from elsewhere; this on-demand caller must
  take it itself) → `baselineReturnSeries` for both legs →
  `pearsonCorrelation` → `correlationIsSignificant`.
- Derive the window from `context.asOf`, never from the ledger's covered
  end directly, to stay temporally isolated under Epic 13's eventual
  replay — note this is the one input in this tool that needs explicit
  care, since every other tool in this story already reads `asOf` as a
  plain argument.
- Refusal vocabulary: the two existing words (`too-few-overlapping-samples`,
  `zero-variance`) plus whatever this tool needs for "no window exists at
  all" (CI, a cold replica) — fold that into `too-few-overlapping-samples`
  with `n: 0` rather than minting a new word, matching
  `comparableBaseline`'s own established pattern for "no generation
  loaded" sharing a word with "too short."
- Wire into `investigationTools`.

## Done when

1. `calculate_rolling_correlation` is unit-tested against the real
   `pearsonCorrelation`/`correlationIsSignificant`/`baselineReturnSeries`,
   with furnished `ReadonlyMap`s — no database needed for the arithmetic
   itself.
2. A database-backed test (`pnpm test:database`) covers the on-demand
   fetch shape against a real store, including the split-guard re-run.
3. Investigating `SPY` shows this step as `inapplicable`
   (`is-the-market-proxy`); investigating `QQQ`/`DIA`/`IWM` shows a real
   computed figure.
4. No raw coefficient reaches the wire or the screen anywhere in this
   step's output.
5. `a-tool-reads-no-clock` passes — the window is derived from
   `context.asOf`, not a ledger read.
6. `pnpm verify` is green; `pnpm store:bare` shows the correct honest
   refusal (`too-few-overlapping-samples`, `n: 0`) on a zero-bar store.

## What was done — 2026-11-19

### The tool

**`apps/backend/src/tool-rolling-correlation.ts` —
`AnalyticalTool<RollingCorrelationInput, RollingCorrelationReading>`, wired
fifth of five in `investigationTools`, described on the checklist as
`Compare against the broad market`.** It is the only tool in this pipeline
that reads a database.

**`Input` is `{ symbol, against }` — a general PAIR — and `SPY` is resolved at
the wiring site.** `index.ts` carries one `BROAD_MARKET_SYMBOL` constant beside
the tool's own `buildInput`, so _which fund this product means by the market_
has one home and the tool stays reusable for Epic 10's
`get_related_securities`-driven comparisons. It is written out rather than read
positionally off `indexProxyTickers()`, because a positional read would move
the market reference the day somebody reorders `PRODUCT_SPEC.md` §6.

**`Output` carries `{ symbol, against, direction, significant, n,
lookbackSessions, feed }` and no `r` anywhere.** The coefficient never leaves
`run` — the _type_ is what keeps it off the wire, and
`toWireRollingCorrelation` is a second reader of that decision rather than its
home. `direction` is a closed three-word vocabulary
(`positive`/`negative`/`none`), never an adjective: this product has no derived
threshold for _strong_ or _weak_, and printing a coefficient as a figure would
fire `CORRELATION_MINIMUM_OVERLAP`'s own reversal trigger.

**`correlationDirectionOf` is a second classifier and
`one-classifier-for-the-direction-of-a-move` caught the first draft calling it
`directionOf`.** The invariant was right to fire and the repair is not an
exemption:
`price-direction.ts`'s classifier rounds its argument to the two decimals a
_percentage_ is displayed at, and an `|r|` of 0.004 is a real coefficient
rather than a figure that prints `0.00%` — and its third word, `unchanged`, is
a claim about a security over time rather than about a pair. The function is
renamed and the docblock says which side of that line it is on.

### The window, which is this task's one real piece of design

**Two instants, answering different questions.** `tapeCoveredEnd()` answers
_how far back is available_ and is the only frontier
`the-baseline-window-ends-on-a-tape` permits a window to be built from, after
that invariant's own production defect of 2026-10-15; `context.asOf` answers
_how far forward this investigation may look_. The window ends at the
**earlier** of the two, so in production the clamp is inert and this tool reads
exactly the nightly pass's window — two answers over the same sessions, never
two windows.

**And the clamp alone was not enough**, which is the finding in the status line
above. `windowEndingAtOrBefore` rebuilds once from the previous session's close
where the window it first built ends after `end`. Once is enough: at most one
session can contain an instant, and a non-trading instant already resolves to
the last session before it.

### The vocabularies, widened rather than collapsed

- **`TOOL_REFUSALS` gains `CORRELATION_REFUSALS`' own two words verbatim** —
  `too-few-overlapping-samples` and `zero-variance` — with
  `CorrelationRefusalIsAToolRefusal` as the type-level half, exactly as the
  percentile and excess-factor vocabularies already have. They are the only
  pair in that list that are facts about a **pair** rather than about a
  security.
- **"No window exists at all" shares `too-few-overlapping-samples`** at an
  overlap of zero, rather than minting a word —
  `comparableBaseline`'s own precedent, and the task file's own instruction.
  Three distinct conditions reach it: no tape frontier, no bars for a leg, and
  a genuine thin overlap.
- **`TOOL_INAPPLICABILITIES`' `is-the-market-proxy` is reused unchanged** (Task
  7.2.4 minted it). The guard is `symbol === against` rather than a list of
  proxies, which is what keeps Gate 1's other half true for free:
  `QQQ`/`DIA`/`IWM` against `SPY` are real measurements and stay computed.
- **The split guard's two legs get different words** — `split-discontinuity`
  for the subject and `reference-split-discontinuity` for the market — for
  `compare_securities`' own reason, and because a `SPY` break would refuse
  every investigation in the product at once.

### The tests

- **`tool-rolling-correlation.test.ts`, 18 tests, no database.** Every function
  the tool composes is the real one — the real trading calendar through
  `baselineWindowEndingAt`, `sessionAnchors`, `baselineReturnSeries`,
  `seriesIsDiscontinuous`, `pearsonCorrelation`, `correlationIsSignificant` —
  and only the three store reads are furnished. The series are built by walking
  the window's **own** anchors, so a test that disagrees with the grid the tool
  samples on is unrepresentable rather than unlikely.
- **`rolling-correlation.database.test.ts` — the on-demand fetch shape against
  a real store** (Done-when 2): real `sip` rows at real anchors for four
  securities, a real `bar_coverage` row, and the whole chain driven —
  `readCoveredEnd` → `baselineTapeFrontier` → `tapeCounts` → `subjectFor` →
  `readWindowCloses`. It drives the split-guard re-run **on either leg** by
  swapping the same two securities round, and the `n` it asserts is derived
  from the window's own anchor counts rather than spelled (154 = 77 × 2).
- **`security-investigate.spec.ts` 5 → 6 rows**, with the new step's sentence
  asserted by name.

### Gates

- `pnpm verify` — **green, exit 0.** `92 invariants hold.`; `packages/shared`
  34 files / 738 tests, `apps/backend` 82 / 1,491, `apps/frontend` 109 / 2,005,
  `test:process` 3 / 63, `test:scripts` 21 pass / 0 fail. **No `Unhandled
Errors` block anywhere in the run** — checked by a case-insensitive grep over
  the whole log (0 matches), not by reading the exit code.
- `pnpm invariants` — the first run was **red**, on
  `one-classifier-for-the-direction-of-a-move`, which is the check doing its
  job on a defect this task would otherwise have shipped; green after the
  rename. No new check was added, so no new `pnpm break` entry is owed.
- `pnpm test:database` — **NOT run, and that is a gap in this task's evidence
  rather than a judgement.** Docker is not running in this worktree and no
  PostgreSQL server is listening on 5432, so the new suite is unexecuted
  locally and first runs in CI's `database` job. It typechecks and lints under
  the same type-aware pass as the rest of the tree.
- `pnpm e2e security-investigate.spec.ts` — **not run**, same cause: no dev
  pair and no database are reachable here. What the 5 → 6 change rests on is
  that a step completes with a duration whichever arm it takes — the volume
  step has refused on every run since Task 7.2.3 and still draws its row — so
  the count is insensitive to the refusal this step will answer on CI.

### What nothing here can certify

**No gated machine will ever see a coefficient from this tool.** CI's store has
516 securities and zero bars, so no tape has reached a frontier, both window
reads are empty and the answer is `too-few-overlapping-samples` for ever. The
`is-the-market-proxy` arm is the only one a gated machine can reach on its own
terms, because it is decided from the arguments alone.

**No person has seen this step's answer, and nobody has checked a coefficient
against an outside source** — which is Story 6.5's own standing
`docs/GAPS.md` entry arriving at a second surface: the deployed store has been
serving 1,853 measured correlation edges since 2026-11-07 and not one of them
has been verified against a public figure either.

**The two database reads are a named, unmeasured cost on the deployed tier.**
Each is the 538-block window read `return-baseline-store.ts` measured on a
GitHub runner, not in a 0.25 vCPU container — Story 7.2's Gate 1 recorded that
as a condition-owned gap rather than answering it with an unmeasured cache, and
this task adds nothing to that entry but a second reader of it.

## For a stakeholder

Pressing `Investigate` now runs **all five** of the steps this epic was
accepted against, the last of them being _how does this security move with the
broad market_. The row reports a **direction** and whether the relationship is
**statistically significant**, over a counted sample of shared five-minute
returns from the last 60 trading sessions — never a raw coefficient and never
an adjective like "strong". Investigating `SPY` itself completes as _the
question does not arise_, because a fund's correlation with itself is
arithmetic rather than a measurement; `QQQ`, `DIA` and `IWM` get real figures.

On the gated build and on any store without stored history the step completes
by **refusing honestly** — there is not enough shared history to define the
statistic — which is a first-class answer in this product rather than a
failure.
