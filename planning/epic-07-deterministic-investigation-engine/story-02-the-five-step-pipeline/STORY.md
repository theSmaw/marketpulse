# Story 7.2 — The Five-Step Pipeline

**Status:** In progress — 2026-11-18. Decomposed into seven tasks at Gate 1
(7.2.1–7.2.7) after four parallel shaping passes (business-analyst,
technical-analyst, technical-architect, tester) plus one architect
follow-up. See "Resolved at Gate 1" below for every decision taken.
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** 7.1
**Epic scope covered:** The return-percentile, volume-anomaly,
peer-comparison, market-breadth and correlation tools; the full checklist
this epic's own exit criterion names.

## Description

**This story is this epic's exit criterion, verbatim, not an example of
it.** `EPIC.md` names five steps — measure price anomaly, measure volume
anomaly, compare peers, compare market, calculate breadth — and this story
builds the tool behind each one and wires all five into the one
orchestrator Story 7.1 proved. After this story, `Investigate` runs the
exact workflow the epic was accepted against.

**Each tool is a thin, typed wrapper over arithmetic this product already
has**, per `EPIC.md`'s own hand-off table from Epic 5's close — this story
adds orchestration and a tool contract, not new arithmetic, except where
named below:

- **Price anomaly** wraps `returnPercentileOf` (`apps/backend/src/
return-percentile.ts`) — already real, already refuses below its own
  sample-size floor (11 of 511 securities today).
- **Volume anomaly** wraps `volumeFactorAnswer()` — **corrected
  2026-11-18 by Gate 1 shaping: this function lives in
  `apps/backend/src/market-composite.ts`, not
  `packages/shared/src/composite-score.ts`** — which **always** returns
  `{ state: "no-distribution" }` on every store that exists. This tool
  therefore always answers "not enough evidence," by design, every time
  it runs — invariant 5's first-class `UNKNOWN` outcome rather than a
  failure, and this story ships that refusal honestly rather than hiding
  the step or inventing a number for it. Deliberately **not** the richer,
  database-backed `volumeRateOf` ratio Story 5.5 shipped on the security
  page (drawable on 4 of 39,928 buckets, with six of its own refusals) —
  that is a different, later scope; this tool stays the structural
  percentile refusal `EPIC.md` named.
- **Compare peers**, described on screen as **"Compare against sector
  benchmark"** (resolved at Gate 1 — the epic's literal "compare peers"
  wording over-promises an unweighted peer median this product does not
  compute), wraps `excessMoveFactor` (`apps/backend/src/
excess-move-factor.ts`), using `excessMoveReference` (`packages/shared/src/
excess-move.ts`) only to pick the security's own sector benchmark —
  **corrected 2026-11-18: `excessMoveReference` alone is under-named as
  "the comparison"; it only resolves which fund. The comparison itself is
  `excessMoveFactor`.**
- **Compare market** is this story's one new piece of arithmetic: the
  correlation tool (`calculate_rolling_correlation`), computed **on
  demand** between the investigated security and the broad market proxy
  (`SPY`) — distinct from Story 6.5's own nightly, fixed-universe,
  60-session batch correlation, which answers a different question (which
  pairs move together historically) rather than this one (how correlated
  is this specific security with the market, right now). **Confirm at this
  story's own technical shaping whether any part of Story 6.5's pipeline
  is reusable for an on-demand pair, or whether this is wholly new code**
  — `EPIC.md`'s own scope section flagged this as unconfirmed rather than
  assumed, and it is confirmed here rather than in `EPIC.md`.
- **Calculate breadth** wraps `marketBreadth` (`apps/backend/src/
market-breadth.ts`) — already real, already stated with a denominator
  rather than a bare percentage.

**Breadth is a group fact, not a per-security score, and the tool's own
output type says so.** `EPIC.md`'s own hand-off from Epic 5's decomposition
is explicit: breadth is "a stated clause rather than a weighted factor,"
identical for every member of a group. This tool's result type carries no
per-security verdict — a step that calls it is reasoning about the whole
market, and the UI must not render its answer as if it graded the
investigated security specifically.

**The security snapshot from Story 7.1 is not one of the five steps.** It
remains the investigation's own header context (`Investigating NVDA —
$242.18, +0.8%`), established once per investigation rather than re-run as
a numbered step — confirm this placement at this story's own design work
rather than assuming it.

## What the user can see when this story lands

Pressing `Investigate` now runs the full five-step checklist this epic's
own exit criterion describes, each step completing with its real tool's
real answer — including the volume-anomaly step, which completes by
honestly refusing every time, on every store that exists today.

## Acceptance criteria

1. All five tools exist, each implementing Story 7.1's shared analytical-
   tool contract, each wrapping the arithmetic named above rather than
   re-deriving it.
2. The volume-anomaly tool's refusal is rendered as a distinct, named
   outcome in the checklist (not a blank, not an error, not a skipped
   row) — the same `UNKNOWN`-shaped first-class outcome invariant 5
   requires everywhere else in this product.
3. The correlation tool's on-demand calculation is confirmed against the
   real codebase — reusing Story 6.5's own pipeline where it genuinely
   applies, built fresh where it does not — and the decision is recorded
   in this story's own task file rather than left implicit.
4. **Reworded 2026-11-18 at Gate 1** — the orchestrator runs all five
   tools in the order `EPIC.md` names, streaming
   `STEP_STARTED`/`TOOL_CALL_STARTED`/`TOOL_CALL_COMPLETED`/
   `STEP_COMPLETED` for each. No tool reads another tool's output —
   `RunnableTool.run` takes only the investigation's subject symbols and
   its `ToolContext`, so the independence `PRODUCT_SPEC.md` §12 asks for
   ("tool calls run independently where possible") is **structural**
   rather than a property of dispatch order, and execution stays
   **sequential** — see "Resolved at Gate 1" below for why concurrent
   dispatch was considered and rejected.
5. The breadth step's own result renders as a group-level fact, never as
   a verdict on the investigated security, and its own type structurally
   cannot carry a per-security score.
6. The checklist shows all five steps' real tool names, statuses and
   durations, matching `PRODUCT_SPEC.md` §14's own example shape.
7. `PRODUCT_SPEC.md` §28's investigation target is re-measured against
   the full five-step pipeline (not just 7.1's one-step figure) and
   reported.
8. Each tool is independently unit-tested against the real function it
   wraps, with no tool's test depending on another tool's output.

## Resolved at Gate 1 — 2026-11-18

Four parallel shaping passes (business-analyst, technical-analyst,
technical-architect, tester) plus one architect follow-up. Nothing below
is open; this is the record.

- **"Compare market" is the on-demand correlation to `SPY`**, resolved
  with the Product Owner before Gate 1 — not a second invocation of
  peer-comparison against the market proxy. The more useful, distinct
  signal, separate from both the sector-ETF peer comparison and Story
  6.5's own nightly, fixed-universe, 60-session batch correlation.
- **AC3's reuse decision, confirmed at the code level.** Reusable,
  unchanged: `pearsonCorrelation`, `correlationIsSignificant`,
  `CORRELATION_MINIMUM_OVERLAP` (`packages/shared/src/
return-correlation.ts`); `baselineWindowEndingAt`, `sessionAnchors`,
  `baselineReturnSeries`, `seriesIsDiscontinuous`, `subjectFor`,
  `readWindowCloses` (`apps/backend/src/return-baseline.ts` /
  `return-baseline-store.ts` — already per-security reads, not a batch,
  so the on-demand fetch is the same read the nightly pass issues, issued
  twice instead of 516 times). **Not** reusable, and actively wrong for
  this purpose: `selectStrongestCorrelations` (a top-N-per-node cut over
  125,250 candidates — meaningless for one pair) and
  `accumulateCorrelationInput` (Story 6.5's own landmark-exclusion gate —
  `SPY` and the other 14 landmarks never form a stored correlation pair
  **by design**, which is independent confirmation the stored table
  cannot answer this question at all). The tool must re-run the split
  guard itself per leg (`seriesIsDiscontinuous`) — the nightly pass
  inherits that verdict from elsewhere and does not re-run it — and must
  derive its window from `context.asOf`, never from the ledger's covered
  end, to stay temporally isolated under Epic 13's eventual replay.
- **Sequential orchestration, kept — AC4 reworded rather than the
  orchestrator rewritten.** Unanimous across all three technical shaping
  passes. `RunnableTool.run` already makes tool independence structural
  (no channel exists for one tool to read another's output), which is a
  stronger guarantee than concurrent dispatch would be and survives Epic
  10's eventual model-backed provider unchanged. Concurrent dispatch was
  rejected on four costs: it turns `runInvestigation`'s `let investigation`
  - spread accumulation into a lost-update bug (an orchestrator rewrite,
    not a refactor); it deletes most of Story 7.5's stated scope by making
    every step `running` within microseconds, so "a queued step never
    starts" and "which steps never ran" become unreachable; it makes the
    event log's `seq` order non-deterministic run-to-run, weakening 7.1's
    own one-shot `app.inject()` sequence assertions in an epic named for
    determinism; and it buys no visible change (the checklist already
    renders steps in emission order regardless of completion order) against
    a real cost in concurrent database-pool pressure. **A new
    `pnpm invariants` entry should hold the stronger claim**: no tool's
    `run` signature carries a prior step's outcome. Dated amendment to ADR
    0050 rather than a new ADR (nothing in 0050 became false; this extends
    it with an alternative it never had cause to consider when there was
    only one tool).
- **The keepalive ships in this story.** ADR 0050's reversal trigger ("the
  first tool call to complete while a second one is still queued") fires
  literally and unambiguously here — `scripted-agent-provider.ts` mints
  all five `QueuedStep`s before the loop starts, so the condition is met
  on the very first press, on every machine, regardless of how fast the
  tools actually run. `HOSTING.md`'s existing "(Story 7.5 or later)" guess
  is wrong and needs a dated correction either way. Ship a minimal SSE
  keepalive comment line with an **injectable** interval (so a test can
  use a short period rather than waiting 30s) — Task 7.2.1. Confirm
  `investigation-stream.ts`'s hand-rolled parser skips SSE comment lines
  before relying on it; if it doesn't, that's a frontend defect this
  story fixes first.
- **The breadth tool reads one retained, shared aggregate rather than
  recomputing one — a dated amendment to ADR 0038, not a new ADR.**
  `one-producer-of-the-overview-aggregate` forbids a second
  `buildMarketOverview` call site, and ADR 0038's own named trigger ("the
  first consumer of the aggregate that is not a browser") has fired
  exactly as `EPIC.md` anticipated. Resolution: the single producer's
  latest pass moves to a small holder beside `currentMarketState` in
  `index.ts` — **not** inside `market-gateway.ts`, whose own rule is it
  decides _when_ a browser is told something and must not decide _what_
  is true. The gateway's existing `lastBroadcastPass` becomes a read of
  that one holder rather than a second memo of the same fact. The holder
  records **every** pass the producer computes, not only broadcast ones.
  When nothing has been computed yet (CI, a cold deploy's first ~46s, any
  deployment with no browser attached — Task 4.8.11 means the join
  genuinely does not run then), the breadth step completes with its own
  distinct, honest refusal — never a recomputed join, which is exactly
  the call shape Epic 13's eventual replay has to refuse, and never
  conflated with "nothing observed." Two new guards owed in the same
  change: one holder, one writer (a `pnpm break` planting a second write
  beside it), and confirmation that `breadth-is-counted-over-the-equities-
alone`'s corpus reaches a new tool file (widen it if not, with its own
  `pnpm break`).
- **Compare-market is `inapplicable` for `SPY` only.** Self-correlation
  (`r = 1`) is vacuous only when the subject _is_ the market proxy being
  compared against; `QQQ`/`DIA`/`IWM` vs `SPY` is a real, if unsurprising,
  measurement and stays computed. Mint a new member parallel to
  `excess-move.ts`'s existing `is-benchmark` — the obvious shape is
  `is-the-market-proxy`.
- **Compare-market never prints a raw coefficient.** Direction,
  significance (via `correlationIsSignificant`) and the counted overlap
  `n` only — no adjective ("strong"/"weak", which this product has no
  derived threshold for) and no printed `r`. Printing a coefficient as a
  figure fires `CORRELATION_MINIMUM_OVERLAP`'s own stated reversal trigger
  ("the first surface that prints a coefficient as a figure rather than
  drawing it as an edge"), which would additionally require deriving a
  precision floor this story does not need to take on.
- **Market breadth reports the whole tracked universe (501 equities), not
  the subject's own sector.** Reuses the exact `marketBreadth` arithmetic
  already built, with no new code, and matches how `/`'s own `Market
breadth` region already states it. The population is never the subject
  itself — `breadth-is-counted-over-the-equities-alone` already holds
  this, and if the subject is `SPY`, a sector SPDR or another proxy, it is
  correctly absent from the count.
- **The peer-comparison step is described on screen as "Compare against
  sector benchmark"**, not the epic's literal "compare peers" — the
  shipped arithmetic is a comparison against the capitalisation-weighted
  sector SPDR, and "peers" promises an unweighted peer median this product
  does not compute (rejected at Story 5.6's own Gate 1). The epic's exit
  criterion keeps its original wording; this is a dated note that the
  step's own description differs from it, by decision.
- **A thrown tool gets a safety net in this story, not only in Story
  7.5.** Today, a throw aborts `runInvestigation`'s loop with no terminal
  event: the investigation sits in `running` forever, the SSE stream never
  closes, the entry is never evicted (eviction only ever takes the oldest
  **completed** entry), and — the sharp edge — `POST /investigations`'
  second-press idempotency hands back the stuck run, so `Investigate` is
  permanently dead for that symbol until a backend restart. A ~5-line
  `finally` that always writes a terminal event closes the stuck state.
  The honest, reader-facing failure _sentence_ for a thrown tool is still
  Story 7.5's — this only stops the permanent lockout, because this
  story's tools add real new throw paths (a database read, a calendar
  edge) that 7.1's single in-memory lookup never had.
- **The price-anomaly tool distinguishes "no move to rank" from "no
  baseline to rank against."** `STORY.md`'s original draft only named the
  baseline's own refusal vocabulary (`PercentileRefusal`); the numerator
  (the security's current 5-minute return) has its own four refusal kinds
  in `five-minute-return.ts`, and without reusing them an investigation
  step would say the same sentence for a silent security and an
  under-sampled one, which are different facts.
- **Each tool's outcome vocabulary is reused verbatim, never collapsed
  into a single generic `refused`.** `refused` ("we will not answer; a
  backfill or repair may change it"), `inapplicable` ("the question does
  not arise; nothing ever will produce a figure" — peer comparison's
  `is-benchmark`/`no-sector`, correlation's new `is-the-market-proxy`) and
  `no-distribution` (volume's payload-free, product-wide fact) are three
  different claims this product has already decided differ in shape so a
  surface cannot print the wrong one. No tool mints a synonym for a word
  an owning module already exports.
- **The checklist paints all five rows on press, not a 1-then-grow-to-5
  sequence.** The five tools are a fixed, known list — seeded client-side
  at press (no wire-contract change needed; `INVESTIGATION_STARTED`'s
  payload does not need to start carrying the step list). Matches
  `PRODUCT_SPEC.md` §14's own example shape, which shows the whole
  checklist at once with some rows complete and some pending.
- **AC7 is measured on a populated store only, this story.** CI's
  zero-bar store makes four of five tools answer their refusal path
  instantly, which would measure "how fast can we refuse five times," not
  "how fast can we investigate" — named and owned in `docs/GAPS.md` rather
  than silently assumed. The correlation tool's two database reads are a
  real, named risk against the deployed tier's much smaller hardware (its
  own read path's docblock states it was budgeted for a GitHub runner, not
  a 0.25 vCPU container) — recorded as a condition-owned `docs/GAPS.md`
  entry rather than answered by building an unmeasured cache pre-emptively.
- **Untracked securities (`PSKY`, `WBD`) run the full five-row checklist**,
  each tool answering the same `not-tracked` refusal independently,
  decided once before the pipeline runs rather than re-derived per tool —
  the identical shape Story 7.1 already established for the snapshot tool.

## Out of scope

Findings and evidence as real domain objects — every step in this story
completes with a status and a duration, not yet a rendered finding (Story
7.3). Highlighting peer nodes on the topology graph (Story 7.4). Failure
and cancellation of a multi-step investigation (Story 7.5 — a tool that
throws in this story is an unhandled error, not yet a graceful
degradation).
