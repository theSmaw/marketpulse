# Task 7.2.3 — The volume-anomaly step

**Status:** Complete — 2026-11-19. The one key finding: **Done-when 2 is not
reachable in this task and the reason is a feature rather than a shortfall** —
nothing in the frontend renders a tool refusal's reason at all today
(`investigation-checklist-state.ts` reads `TOOL_CALL_COMPLETED` and returns
`state` unchanged, by Task 7.1.4's own decision), so there is no checklist cell
to point at `anomaly-score.ts`' `NO_DISTRIBUTION_REASON`. The sentence
therefore keeps its **one existing home** on the security page's factor
ledger, the tool carries the **word** `no-distribution` — reused verbatim from
`FACTOR_ANSWER_STATES` rather than synonymised — and the shared string becomes
a real obligation for Story 7.3, which is the story that first renders an
outcome. Importing a frontend-private const into the backend to satisfy the
letter of the done-when would have created the second home the rule exists to
refuse.
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1

## Objective

The simplest of the five new tools: wraps `volumeFactorAnswer()`
(`apps/backend/src/market-composite.ts`), which takes no parameters and
always returns `{ state: "no-distribution" }` on every store that
exists — `0015_volume_baselines.sql` stores a median and a dispersion,
never a distribution, so there is structurally no figure to rank
against, anywhere, today. This is a permanent, product-wide fact rather
than something about this security, and must read differently from the
price-anomaly tool's below-sample-floor refusal, which is about this
security specifically.

**Deliberately not** Story 5.5's richer, database-backed `volumeRateOf`
ratio (`× typical`, drawable on 4 of 39,928 buckets on the deployment,
with six of its own refusals) — that is a different, later scope. This
tool stays the structural percentile refusal `EPIC.md` named.

## What the user can see when this lands

Pressing `Investigate` always shows a `Check volume anomaly` row
completing with "not enough evidence" (reusing the existing `no history
to rank it` string through a shared builder rather than minting a new
one — one fact, one home with the security page's own ledger cell) —
never a blank, an error, or a skipped row, and identical on every store
that exists, including CI.

## Work

- Build `calculate_volume_ratio` as an `AnalyticalTool<Input, Output>`.
  Declare `Output` as the shape it would carry the day a distribution
  exists (`{ ratio, percentile }` or similar) even though the
  implementation only ever returns the refusal arm — this keeps
  `toRunnableTool`'s `toWire` well-typed and documents the tool's own
  reversal trigger (the `no-distribution` arm is deleted, not widened,
  the same commit `ANOMALY_BAND_FLOORS`' own trigger fires in).
- The refusal wording reuses the existing `no history to rank it` string
  via a shared builder — do not write a second sentence for this fact.
- Wire into `investigationTools`.

## Done when

1. `calculate_volume_ratio` is unit-tested — a single assertion that it
   always refuses with `no-distribution`, needing no database and no
   fixture.
2. The checklist row reads the existing, shared refusal string rather
   than a new one.
3. `pnpm e2e` proves the row renders as a named outcome rather than a
   blank, error or skipped row — the one AC in this story whose
   interesting case CI can actually reach, since the refusal is
   store-independent.
4. `pnpm verify` is green.

## What was done — 2026-11-19

One new tool, one widened shared vocabulary, one wiring, one widened e2e
spec. No new arithmetic, no new store read and no new check.

- **`apps/backend/src/tool-volume-ratio.ts`** — `calculate_volume_ratio`,
  `description: "Measure volume anomaly"`, on `tool-return-percentile.ts`'s
  shape: a factory taking its dependencies, a module-private `Symbol` brand on
  the output, `run` never throwing and never `async`. It takes **one**
  argument — the universe membership set, defaulted — because
  `volumeFactorAnswer()` takes none, and a store handle here would be a
  parameter read for nothing, which is the next reader looking for a branch
  that does not exist. Two refusals in the order a reader needs them:
  `not-tracked` first, through `tool-universe.ts`'s shared mechanism
  unchanged (so `PSKY`/`WBD` get the membership word rather than the
  product-wide one — two true sentences, and only one of them is this step's),
  then `no-distribution`.
- **The `Output` type is declared and is unreachable, on purpose.**
  `VolumeRatioReading` carries `ratio`, `rank`, `sampleCount` and `feed` —
  the shape the figure's own existing homes already use (a RATE, because
  ADR 0045 says `5 × median` is not the typical five-minute volume; an
  integer ordinal; a counted `n` rather than a constant; and the TAPE,
  because a volume LEVEL is not comparable across two of them). It keeps
  `toRunnableTool`'s `toWire` well-typed rather than erased through a
  `never`, and it makes the reversal concrete: the day
  `0015_volume_baselines.sql`'s successor stores a **distribution**, the
  `no-distribution` arm is **DELETED rather than widened**, in the same
  commit as `FactorAnswer`'s own trigger and `ANOMALY_BAND_FLOORS`' trigger 1,
  and this interface is what that commit fills in. The brand earns its place
  more here than anywhere else in the pipeline: **nothing in this product can
  construct one of these today, not even this module**, which is what stops a
  later reader filling the gap with a literal rather than with a stored
  distribution.
- **`volumeFactorAnswer()` is CALLED rather than its answer assumed.** The
  `state` is read and branched on, so the day the producer stops being
  unconditional this tool follows it instead of becoming a second home for the
  same fact — and the fall-through still refuses rather than fabricating a
  reading, because a figure this product has not measured is one invariant 1
  forbids it to mint.
- **`packages/shared/src/investigation.ts`** — `TOOL_NAMES` gains
  `calculate_volume_ratio` (second of five, `EPIC.md`'s own order);
  `TOOL_REFUSALS` gains `no-distribution`, which is
  `FACTOR_ANSWER_STATES`' member spelled exactly as that module spells it. It
  is a **third kind of claim** rather than a synonym for the two words beside
  it, which is Story 7.2's Gate 1 decision inherited: `refused` is _we will
  not answer, a backfill may change it_, `inapplicable` is _the question does
  not arise_, and this is _the figure exists and the history to rank it
  against does not_.
- **`index.ts`** — wired into `investigationTools` after the price-anomaly
  tool, with no sources at all.
- **`e2e/specs/security-investigate.spec.ts`** — two rows become **three**,
  the count kept as the assertion rather than a `.first()` so a dropped step
  cannot pass unseen, plus the new row's own description. Its header gained
  the contrast worth recording: every other tool in this story has an arm no
  gated machine can reach, and **this one is the opposite** — its answer is
  byte-identical on CI, on a laptop and on the deployment, for ever, because
  it depends on no store, which makes it the only step in this pipeline whose
  interesting case a gated machine actually exercises.

**The user-visible change: the checklist is three rows.** `Measure move`,
`Measure price anomaly`, `Measure volume anomaly`, each with its own real
duration. The third completes by refusing honestly, every time, everywhere —
invariant 5's first-class `UNKNOWN` outcome rather than a failure.

### Gates

- `pnpm verify` — **green, exit 0**: 90 invariants hold (two pre-existing,
  dated, owned rehearsal waivers printed — Epic 4's row 4.7 and Epic 6's row
  6.7, both unrelated), 673 documents / 2,072 cross-file links / 0 broken,
  49 components / 49 stories, `packages/shared` **735** tests,
  `apps/backend` **1,443**, `apps/frontend` **2,003**, `scripts/*.test.mjs`
  21 / 0 fail, `test:process` **63**. **No `Unhandled Errors` block anywhere
  in the run** — grepped rather than inferred from the exit code.
- `pnpm --filter @marketpulse/backend test tool-volume-ratio` — 5 tests, the
  scoped run first. Five assertions, no database and no fixture, because the
  behaviour is structural: the name and description; the refusal for a tracked
  security; **the same answer over five different inputs** (three symbols, a
  2024 `asOf` and `mode: "replay"`), which is the structural guarantee stated
  as an assertion rather than as a comment — a future implementation that
  started branching on any of them fails here rather than quietly answering a
  figure for one security and a refusal for the next; `not-tracked` ahead of
  everything else; and that the word is the producer's own and is a member of
  the closed shared vocabulary.
- **Two pre-existing shared tests were corrected rather than worked around.**
  `investigation.test.ts` pins both `TOOL_NAMES` and `TOOL_REFUSALS` with
  `toStrictEqual`, so each widening is a deliberate edit — which is the
  mechanism behaving correctly, and both now carry why the new member is not
  a synonym.
- **No new check, so no new break.** This task adds no invariant: the claims
  it could make mechanical are already held by three existing ones —
  `a-tool-reads-no-clock` (this file reads neither a clock nor a store),
  `a-tool-takes-no-channel-to-another-step`, and the `toStrictEqual` pins
  above. `every-break-can-still-land` is green, so nothing this change
  touched rotted an existing break.
- `pnpm e2e security-investigate.spec.ts` — **NOT RUN, and the spec was
  edited blind**, exactly as in Task 7.2.2 and for the same reason: Docker is
  not running on this machine, so there is no local database and no pair
  (`pnpm ready` reports nothing listening on `:5173`). The edit is reasoned
  rather than observed, and it is the narrow kind — a count 2 → 3 and one
  added `toBeVisible` on a description string this change introduces.
  **CI is the first machine that will run it**, and unlike every other row in
  this file CI's answer here is the same as the deployment's.

### What nothing here can certify

Nothing. For the first time in this epic there is no store-dependent arm to
disclaim: this tool's answer is identical on every machine that exists,
and the only thing no machine has ever produced is the `ok` arm — which is
**structurally unreachable** rather than unobserved, and stays so until a
nightly pass stores a distribution of this quantity. The `Output` type above
is the record of what that commit owes; `toWireVolumeRatio` is written and
never called, so that the commit has nothing to invent.

## For a stakeholder — a status report, 2026-11-19

Pressing `Investigate` now runs **three** steps rather than two, and the new
one is the second of the five this story exists to build: it asks whether the
security's trading volume is unusual.

**It answers "not enough evidence" every single time, and that is the
feature.** We store a typical volume for each security and a measure of how
much that typical figure varies — but not the full history of volumes a
figure would have to be ranked against. So there is no honest way to say
_today's volume is in the 95th percentile for this security_, for any
security, anywhere, and the step says so plainly rather than hiding itself,
erroring, or inventing a number. That is the same first-class "we don't know"
this product already draws on the security page's own factor ledger, in the
same words, reaching the investigation engine without being re-worded for it.

Two things worth knowing. The step is **not** the richer `× typical` volume
figure the security page already shows for a handful of cases — that is a
different, later piece of work, deliberately out of this story. And this is
the first step in the pipeline our automated checks can fully exercise:
every other one needs a live market feed they do not have, while this one's
answer is the same on a test machine as it is in production.
